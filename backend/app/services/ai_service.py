import httpx
import json
import re
import math
import asyncio
import os
import time
from collections import Counter
from typing import Dict, Any, List, Optional, Tuple
from app.config import settings

class AIService:
    """Service for generating study material using OpenRouter LLM API or internal smart NLP fallback engine."""

    def __init__(self):
        self.last_error_type: Optional[str] = None
        self.last_status_code: Optional[int] = None
        self.last_provider_calls: int = 0
        self.last_user_message: str = ""

    @property
    def api_key(self) -> str:
        key = os.getenv("OPENROUTER_API_KEY") or settings.OPENROUTER_API_KEY or os.getenv("AI_API_KEY") or ""
        return key.strip()

    def get_api_key(self) -> str:
        return self.api_key

    def get_model_name(self) -> str:
        model = os.getenv("OPENROUTER_MODEL") or settings.OPENROUTER_MODEL or os.getenv("AI_MODEL") or "openrouter/free"
        return model.strip()

    def get_base_url(self) -> str:
        url = os.getenv("OPENROUTER_BASE_URL") or getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        return url.rstrip('/')

    def classify_provider_response(self, status_code: int, response_text: str) -> Tuple[str, bool, str]:
        """
        Classifies OpenRouter / LLM HTTP responses.
        Returns: (error_type, is_retryable, user_facing_message)
        """
        text_lower = response_text.lower() if response_text else ""

        if status_code == 200:
            return "none", False, ""

        if status_code == 429:
            quota_keywords = ["quota", "exceeded", "daily limit", "monthly limit", "credits", "free tier", "insufficient", "out of credits", "resource_exhausted"]
            is_quota = any(kw in text_lower for kw in quota_keywords)
            if is_quota:
                return (
                    "quota_exceeded",
                    False, # NO RETRY
                    "The AI service quota has been reached. Please try again later or check your OpenRouter API settings."
                )
            else:
                return (
                    "rate_limited",
                    True, # Transient rate limit, retryable once
                    "The AI service is temporarily rate limited. Please try again in a moment."
                )

        if status_code in [502, 503, 504]:
            return (
                "service_unavailable",
                True, # Overloaded / transient, retryable once
                "The AI service is temporarily unavailable (503). Please try again in a moment."
            )

        if status_code in [401, 403]:
            return (
                "authentication_or_permission",
                False, # NO RETRY
                "The OpenRouter API key is invalid or unauthorized. Please set OPENROUTER_API_KEY in backend/.env."
            )

        if status_code == 400:
            return (
                "invalid_request",
                False, # NO RETRY
                "Invalid request format sent to AI service."
            )

        return (
            "provider_error",
            False,
            f"AI provider error (HTTP {status_code})."
        )

    async def _post_with_retry(
        self,
        messages: List[Dict[str, str]],
        action_label: str = "OpenRouter API",
        temperature: float = 0.4,
        response_format: Optional[Dict[str, str]] = None,
        timeout_seconds: float = 15.0,
        max_retries: int = 1
    ) -> Tuple[Optional[str], Optional[int], int, Optional[str], str]:
        """
        Helper to POST to OpenRouter Chat Completions API with controlled retry policy.
        Retries ONLY transient errors (rate_limited, service_unavailable, timeout).
        NEVER retries permanent errors (quota_exceeded, authentication_or_permission, invalid_request).
        """
        key = self.api_key
        if not key or key == "YOUR_OPENROUTER_API_KEY" or len(key) < 8:
            print(f"[AIService] {action_label} ABORTED: OPENROUTER_API_KEY is missing or unconfigured (key len: {len(key)})")
            self.last_error_type = "unconfigured_key"
            self.last_status_code = None
            self.last_provider_calls = 0
            self.last_user_message = "The OpenRouter API key is not configured in `backend/.env`. Please set `OPENROUTER_API_KEY`."
            return None, None, 0, "unconfigured_key", self.last_user_message

        model_name = self.get_model_name()
        base_url = self.get_base_url()
        url = f"{base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://easylearn.app",
            "X-Title": "EASY-LEARN"
        }

        payload: Dict[str, Any] = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2048
        }
        if response_format:
            payload["response_format"] = response_format

        backoff_delays = [0.8]
        attempts_made = 0
        last_status = 500
        last_error_type = "provider_error"
        last_user_msg = "An error occurred with the AI service."

        for attempt in range(max_retries + 1):
            attempts_made += 1
            if attempt > 0:
                delay = backoff_delays[min(attempt - 1, len(backoff_delays) - 1)]
                print(f"[AIService] Transient failure on {action_label}. Retrying attempt {attempts_made}/{max_retries + 1} after {delay}s backoff...")
                await asyncio.sleep(delay)

            try:
                async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                    res = await client.post(url, headers=headers, json=payload)
                    last_status = res.status_code

                    if res.status_code == 200:
                        data = res.json()
                        choices = data.get("choices", [])
                        if choices:
                            text_content = choices[0].get("message", {}).get("content", "")
                            print(f"[AI] provider=openrouter model={model_name} attempt={attempts_made} status=200")
                            self.last_error_type = None
                            self.last_status_code = 200
                            self.last_provider_calls = attempts_made
                            self.last_user_message = ""
                            return text_content.strip(), 200, attempts_made, None, ""
                        else:
                            print(f"[AIService] OpenRouter returned 200 but choices array was empty: {data}")

                    error_type, is_retryable, user_msg = self.classify_provider_response(res.status_code, res.text)
                    last_error_type = error_type
                    last_user_msg = user_msg

                    print(f"[AI] provider=openrouter model={model_name} attempt={attempts_made} status={res.status_code} error_type={error_type}")
                    print(f"[AIService] {action_label} HTTP {res.status_code} [{error_type}]: {res.text[:250]}")

                    if not is_retryable:
                        print(f"[AIService] {action_label} non-retryable error ({error_type}). Aborting retries immediately.")
                        break

            except (httpx.TimeoutException, httpx.NetworkError) as net_err:
                last_status = 408
                last_error_type = "timeout"
                last_user_msg = "Network timeout communicating with the AI service."
                print(f"[AI] provider=openrouter model={model_name} attempt={attempts_made} status=408 error_type=timeout")
                print(f"[AIService] {action_label} network exception (attempt {attempts_made}): {repr(net_err)}")
            except Exception as e:
                last_status = 500
                last_error_type = "provider_error"
                last_user_msg = "Unexpected error communicating with AI service."
                print(f"[AIService] {action_label} non-retryable exception: {repr(e)}")
                break

        self.last_error_type = last_error_type
        self.last_status_code = last_status
        self.last_provider_calls = attempts_made
        self.last_user_message = last_user_msg
        return None, last_status, attempts_made, last_error_type, last_user_msg

    async def generate_json(
        self,
        prompt: str,
        system_prompt: str = "You are EASY-LEARN, an expert AI Study Assistant."
    ) -> Optional[Dict[str, Any]]:
        """Call OpenRouter Chat Completions API with provided prompt for JSON response."""
        messages = [
            {"role": "system", "content": system_prompt + "\nRespond strictly in valid JSON format."},
            {"role": "user", "content": prompt}
        ]

        text_res, status, calls, err_type, err_msg = await self._post_with_retry(
            messages=messages,
            action_label=f"OpenRouter JSON API ({self.get_model_name()})",
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        if text_res:
            clean_text = re.sub(r'^```(json)?\s*', '', text_res.strip(), flags=re.IGNORECASE)
            clean_text = re.sub(r'\s*```$', '', clean_text).strip()

            try:
                return json.loads(clean_text, strict=False)
            except Exception as p_err:
                print(f"[AIService] Direct JSON parse failed: {p_err}. Trying regex object match...")

            json_match = re.search(r'\{.*\}', clean_text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(0), strict=False)
                except Exception as r_err:
                    print(f"[AIService] Regex JSON parse failed: {r_err}")

        return None

    async def generate_text(
        self,
        prompt: Optional[str] = None,
        system_prompt: str = "You are EASY-LEARN, an expert AI Assistant.",
        messages: Optional[List[Dict[str, str]]] = None
    ) -> Optional[str]:
        """Call OpenRouter Chat Completions API to generate freeform text response."""
        if not messages:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt or ""}
            ]
        elif system_prompt and not any(m.get("role") == "system" for m in messages):
            messages = [{"role": "system", "content": system_prompt}] + messages

        text_res, status, calls, err_type, err_msg = await self._post_with_retry(
            messages=messages,
            action_label=f"OpenRouter Text API ({self.get_model_name()})",
            temperature=0.4
        )
        return text_res

    # --- Built-in Smart NLP Engine ---
    def is_substantive_sentence(self, sentence: str) -> bool:
        """Filter out cover page metadata, textbook headers, instructor info, and figure captions."""
        s = sentence.strip()
        if len(s) < 25 or len(s) > 350:
            return False

        from app.services.pdf_service import is_metadata_line
        if is_metadata_line(s):
            return False

        noise_patterns = [
            r'text\s*book', r'instructor', r'b\.?\s*tech', r'cse', r'aiml', r'ece', r'eee',
            r'edition', r'publisher', r'isbn', r'copyright', r'rights\s*reserved',
            r'figure\s*\d+', r'table\s*\d+', r'shows\s*a\s*typical\s*view', r'box\s*of\s*figure',
            r'page\s*\d+', r'unit\s*-\s*[ivx0-9]+', r'syllabus', r'dept\s*of', r'department',
            r'author', r'written\s*by', r'lecture\s*notes', r'james\s+allen', r'pearson', r'education'
        ]
        
        for pat in noise_patterns:
            if re.search(pat, s, re.IGNORECASE):
                return False
                
        return True

    def get_sentences(self, text: str) -> List[str]:
        raw_sentences = re.split(r'[.!?]\s+', text)
        return [s.strip() for s in raw_sentences if self.is_substantive_sentence(s)]

    def get_topic_sentences(self, topic: str, text: str) -> List[str]:
        sentences = self.get_sentences(text)
        
        # Stopwords to exclude when extracting topic keywords
        stopwords = {"what", "is", "are", "the", "a", "an", "how", "why", "where", "tell", "me", "about", "explain", "define", "does", "do", "in", "of", "to", "for", "and", "or"}
        
        raw_words = [w.lower() for w in re.sub(r'[^a-zA-Z0-9]', ' ', topic).split()]
        words = [w for w in raw_words if len(w) >= 2 and w not in stopwords]
        
        if not words:
            words = [w for w in raw_words if len(w) >= 2]
            
        if not words:
            return sentences[:3]

        # Check for exact phrase matches first
        phrase = " ".join(words)
        phrase_matched = [s for s in sentences if phrase in s.lower()]
        if len(phrase_matched) >= 1:
            return phrase_matched

        # Score sentences by matching unique word density
        scored_sentences = []
        for s in sentences:
            s_lower = s.lower()
            score = sum(1 for w in words if re.search(rf'\b{re.escape(w)}\b', s_lower))
            if score > 0:
                scored_sentences.append((score, s))

        if scored_sentences:
            scored_sentences.sort(key=lambda x: x[0], reverse=True)
            return [s for score, s in scored_sentences]

        return sentences[:3]

    def synthesize_short_answer(self, topic: str, text: str, idx: int) -> Dict[str, Any]:
        sents = self.get_topic_sentences(topic, text)
        q_types = [
            (f"Define {topic} and explain its core purpose according to the material.", 
             f"{sents[0] if len(sents)>0 else f'{topic} is a key concept in this study material.'} It plays a pivotal role in ensuring system reliability and structured data processing."),
            
            (f"What are the main operational characteristics of {topic}?", 
             f"{sents[1] if len(sents)>1 else sents[0] if len(sents)>0 else f'The operational characteristics of {topic} focus on resource management and control flow.'} This ensures predictable execution and optimal performance."),
            
            (f"How does {topic} contribute to overall system efficiency?", 
             f"{sents[2] if len(sents)>2 else sents[0] if len(sents)>0 else f'{topic} optimizes execution pathways and prevents resource bottlenecks.'} It balances throughput while maintaining strict architectural boundaries."),
            
            (f"What key problem or challenge does {topic} address?", 
             f"{sents[3] if len(sents)>3 else sents[0] if len(sents)>0 else f'{topic} addresses synchronization, state management, and error recovery challenges.'} By enforcing systematic constraints, it mitigates risk of execution failure.")
        ]
        q_text, ans_text = q_types[(idx - 1) % len(q_types)]
        return {
            "id": f"sq-{idx}",
            "question": q_text,
            "answer": ans_text,
            "topic": topic
        }

    def synthesize_medium_answer(self, topic: str, text: str, idx: int) -> Dict[str, Any]:
        sents = self.get_topic_sentences(topic, text)
        intro = f"{sents[0] if len(sents)>0 else f'{topic} is a fundamental module in this document.'} It serves as an essential building block for understanding system architecture and procedural workflows."
        
        main_points = [
            f"Core Mechanism: {sents[1] if len(sents)>1 else 'Executes systematic state transitions and manages execution flow.'}",
            f"Resource Management: {sents[2] if len(sents)>2 else 'Optimizes allocation of system assets while reducing latency overhead.'}",
            f"Integrity & Safety: {sents[3] if len(sents)>3 else 'Enforces data validation and error boundary isolation.'}",
            f"Operational Scope: {sents[4] if len(sents)>4 else 'Provides modular scalability across complex execution environments.'}"
        ]
        
        example = f"In practical application, {topic} is utilized during high-demand workloads where {sents[0] if sents else 'predictable processing'} is required."
        conclusion = f"In summary, {topic} provides structural robustness and computational efficiency essential for exam mastery."

        return {
            "id": f"mq-{idx}",
            "question": f"Explain the structural architecture, working principles, and key features of {topic}.",
            "topic": topic,
            "introduction": intro,
            "main_points": main_points,
            "example": example,
            "conclusion": conclusion
        }

    def synthesize_long_answer(self, topic: str, text: str, idx: int) -> Dict[str, Any]:
        sents = self.get_topic_sentences(topic, text)
        definition = f"{topic} is defined in this material as a primary conceptual framework: {sents[0] if len(sents)>0 else 'an architectural subsystem regulating operational flow.'}"
        detailed_exp = f"{sents[1] if len(sents)>1 else 'The architecture decouples high-level interfaces from low-level execution logic.'} {sents[2] if len(sents)>2 else 'It tracks state transitions dynamically using structured control vectors.'} This provides high throughput and ensures fault tolerance across all processing stages."
        
        steps = [
            "1. Initialization & Verification: Setting up control metadata and allocating memory regions.",
            f"2. Dispatching & Execution: {sents[3] if len(sents)>3 else 'Loading state registers and triggering execution handlers.'}",
            "3. Monitoring & Synchronization: Tracking real-time metrics and handling interrupt signals.",
            "4. Cleanup & Audit: Releasing temporary resources and updating system log states."
        ]
        
        practical_example = f"A real-world implementation of {topic} occurs in production environments where {sents[0] if sents else 'concurrent processing'} maintains system stability under peak loads."
        
        pros_cons = {
            "advantages": [
                f"High efficiency in executing {topic} workflows.",
                "Robust error isolation preventing system crash propagation.",
                "Scalable resource distribution across concurrent modules."
            ],
            "disadvantages": [
                "Additional memory overhead required for control metadata.",
                "Increased complexity in initial setup and synchronization."
            ]
        }
        
        conclusion = f"To conclude, mastering {topic} is crucial for designing reliable systems and answering essay-style university examination questions."

        return {
            "id": f"lq-{idx}",
            "question": f"Provide a comprehensive analysis of {topic}, detailing its definition, architectural mechanism, procedural steps, practical applications, and trade-offs.",
            "topic": topic,
            "definition": definition,
            "detailed_explanation": detailed_exp,
            "steps_or_types": steps,
            "practical_example": practical_example,
            "pros_and_cons": pros_cons,
            "conclusion": conclusion
        }

    def synthesize_mcq(self, topic: str, text: str, idx: int, difficulty: str = "Medium") -> Dict[str, Any]:
        sents = self.get_topic_sentences(topic, text)
        correct_fact = sents[idx % len(sents)] if sents else f"{topic} optimizes system performance."
        if len(correct_fact) > 130:
            correct_fact = correct_fact[:127] + "..."

        q_templates = [
            f"Which statement accurately describes {topic} based on the study text?",
            f"What is the primary function of {topic} in the context of this material?",
            f"In analyzing {topic}, which of the following is highlighted as a core operational feature?",
            f"Which key concept is directly associated with {topic}?"
        ]

        question_str = f"[{topic}] {q_templates[(idx - 1) % len(q_templates)]}"

        opts = [
            ("A", correct_fact),
            ("B", f"{topic} requires complete hardware replacement before any code execution."),
            ("C", f"{topic} operates strictly by bypassing all security checks and memory limits."),
            ("D", f"{topic} causes permanent data deletion upon every system reboot.")
        ]
        shift = idx % 4
        opts = opts[shift:] + opts[:shift]
        correct_id = [o[0] for o in opts if o[1] == correct_fact][0]

        return {
            "id": f"mcq-{idx}",
            "question": question_str,
            "options": [{"id": k, "text": v} for k, v in opts],
            "correct_option_id": correct_id,
            "explanation": f"According to the document: \"{correct_fact}\"",
            "topic": topic,
            "difficulty": difficulty
        }

    def extract_keywords_and_topics(self, text: str, max_topics: int = 6) -> List[Dict[str, Any]]:
        """Smart NLP TF-IDF & frequency topic analyzer for uploaded PDF text."""
        # Stopwords
        stopwords = set([
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "about",
            "against", "between", "into", "through", "during", "before", "after", "above", "below",
            "from", "up", "down", "in", "out", "over", "under", "again", "further", "then", "once",
            "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
            "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
            "too", "very", "s", "t", "can", "will", "just", "don", "should", "now", "using", "used", "is",
            "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
            "this", "that", "these", "those", "system", "data", "figure", "table", "page", "chapter"
        ])

        # Clean text & tokenize words
        clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
        tokens = [w.lower() for w in clean.split() if len(w) > 2 and w.lower() not in stopwords]

        if not tokens:
            tokens = ["concept", "process", "system", "structure", "method", "analysis"]

        word_counts = Counter(tokens)

        # Extract Bigrams/Trigrams for meaningful academic terms
        words = clean.split()
        phrases = []
        for i in range(len(words) - 1):
            w1, w2 = words[i].lower(), words[i+1].lower()
            if w1 not in stopwords and w2 not in stopwords and len(w1) > 2 and len(w2) > 2:
                phrases.append(f"{w1.capitalize()} {w2.capitalize()}")

        phrase_counts = Counter(phrases)
        top_phrases = [p for p, c in phrase_counts.most_common(max_topics * 2)]
        top_single = [w.capitalize() for w, c in word_counts.most_common(max_topics * 2)]

        from app.services.pdf_service import is_metadata_line, is_valid_educational_topic

        def norm_stem(term: str) -> str:
            clean_term = term.lower().strip()
            clean_term = re.sub(r's$', '', clean_term)
            clean_term = re.sub(r'es$', '', clean_term)
            return clean_term

        combined_candidates = []
        for p in top_phrases:
            if is_valid_educational_topic(p, full_text=text):
                p_stem = norm_stem(p)
                if not any(norm_stem(existing) == p_stem for existing in combined_candidates):
                    combined_candidates.append(p)

        for s in top_single:
            if is_valid_educational_topic(s, full_text=text):
                s_stem = norm_stem(s)
                if not any(norm_stem(existing) == s_stem or s_stem in norm_stem(existing) for existing in combined_candidates):
                    combined_candidates.append(s)

        selected_topics = combined_candidates[:max_topics]

        if len(selected_topics) < 3:
            selected_topics.extend(["Fundamental Concepts", "System Architecture", "Performance Analysis"])

        # Calculate importance scores
        topics_data = []
        base_percentage = 95
        for idx, topic in enumerate(selected_topics):
            percentage = max(55, base_percentage - (idx * 6))
            
            # Find context sentences in original text
            escaped = re.escape(topic)
            sentences = [s.strip() for s in re.split(r'[.!?]', text) if len(s.strip()) > 20]
            matching_sentences = [s for s in sentences if re.search(rf'\b{escaped}\b', s, re.IGNORECASE)]
            
            explanation = matching_sentences[0] if matching_sentences else f"Core principle governing {topic.lower()} within the provided material."
            if len(explanation) > 180:
                explanation = explanation[:177] + "..."

            # Build detailed multi-sentence summarized matter
            if len(matching_sentences) >= 2:
                detailed_matter = " ".join(matching_sentences[:4]) + "."
            elif matching_sentences:
                detailed_matter = matching_sentences[0] + f". {topic} represents an essential module within this study guide, providing foundational structure for understanding key domain operations, system behaviors, and analytical frameworks."
            else:
                detailed_matter = f"{topic} is a core academic pillar in this document. It encompasses key theoretical principles, procedural workflows, and architectural patterns required for comprehensive subject mastery and university examination preparation."

            what_know = [
                f"Understanding the core definition and mechanics of {topic}.",
                f"Key algorithms and structural workflow of {topic}.",
                f"Practical applications, edge cases, and performance tradeoffs.",
                f"Comparative analysis with alternative methodologies."
            ]

            key_terms = [
                f"{topic} Architecture",
                f"State Transitions",
                f"Optimization Metric",
                f"System Parameters"
            ]

            topics_data.append({
                "id": f"topic-{idx+1}",
                "name": topic,
                "importance_percentage": percentage,
                "short_explanation": explanation,
                "detailed_summary": detailed_matter,
                "what_you_should_know": what_know,
                "key_terms": key_terms,
                "quick_summary": detailed_matter
            })

        return topics_data

ai_service = AIService()
