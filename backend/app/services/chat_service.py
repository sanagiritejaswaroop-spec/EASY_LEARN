import re
import time
from typing import Dict, Any, List, Optional
from app.services.pdf_service import pdf_service, sanitize_text
from app.services.ai_service import ai_service
from app.services.rag_service import rag_service

class ChatService:
    def classify_intent(self, query: str, history: List[Dict[str, str]], has_doc: bool) -> str:
        """
        Classifies user query into:
        - GENERAL: Normal AI interaction (conversation, greetings, general knowledge, coding, writing, math, jokes, etc.). No PDF retrieval.
        - PDF_SPECIFIC: Questions explicitly asking about the uploaded PDF, specific pages, chapters, or notes.
        - MIXED: Questions combining PDF content with general AI knowledge (e.g. PDF concept + real-world example/code).
        """
        msg_lower = query.lower().strip()

        # Explicit PDF referral patterns
        pdf_patterns = [
            r'\bpage\s*\d+\b', r'\bchapter\s*\d+\b', r'\bunit\s*\d+\b', r'\bsection\s*\d+\b',
            r'\b(my|the|this|uploaded)\s*(pdf|document|file|notes|material|syllabus|paper)\b',
            r'\bfrom\s*(my|the|this|uploaded)\s*(pdf|document|file|notes|material)\b',
            r'\baccording\s*to\s*(my|the|this|uploaded)\s*(pdf|document|file|notes|material)\b',
            r'\bin\s*(my|the|this|uploaded)\s*(pdf|document|file|notes|material)\b',
            r'\bsummarize\s*(my|the|this|uploaded)\s*(pdf|document|file|notes)\b',
            r'\btopics\s*in\s*(my|the|this|uploaded)\s*(pdf|document|file|notes)\b',
            r'\bquestions?\s*from\s*(my|the|this|uploaded)\s*(pdf|document|file|notes)\b',
            r'\bmcqs?\s*from\s*(my|the|this|uploaded)\s*(pdf|document|file|notes)\b',
            r'\bflashcards?\s*from\s*(my|the|this|uploaded)\s*(pdf|document|file|notes)\b',
            r'\bwhat\s*does\s*(the|my|this)\s*(pdf|document|file|notes)\s*say\b',
            r'\bdoes\s*(the|my|this)\s*(pdf|document|file|notes)\s*mention\b',
            r'\bonly\s*from\s*(the|my|this)\s*(pdf|document|file|notes)\b',
        ]

        has_explicit_pdf_ref = any(re.search(pat, msg_lower) for pat in pdf_patterns)

        # Mixed indicator patterns
        mixed_patterns = [
            r'and\s+(then\s+)?(give|provide|show|write)\s+a?\s*(simple\s+)?(example|code|program|sample|analogy)',
            r'according\s*to\s*(my|the)\s*pdf.*and',
            r'from\s*(my|the)\s*pdf.*and',
            r'in\s*(my|the)\s*pdf.*and',
            r'compare\s+.*with\s+(general|standard)',
        ]
        has_mixed_signal = any(re.search(pat, msg_lower) for pat in mixed_patterns)

        # Inspect conversation history for ongoing PDF reference context
        recent_pdf_context = False
        if history:
            recent_user_msgs = [h.get("content", "").lower() for h in history[-3:] if h.get("role") == "user"]
            recent_pdf_context = any(any(re.search(pat, m) for pat in pdf_patterns) for m in recent_user_msgs)

        # Check for follow-up pronouns/references
        pronoun_patterns = [
            r'\b(it|its|this|that|they|them|these|those)\b',
            r'\b(the\s+above\s+concept|this\s+topic|this\s+chapter|second\s+level|the\s+second\s+level)\b',
            r'\b(example|sample|code|demo|illustration|analogy|more\s+details|explain\s+further)\b',
            r'give\s+(me\s+)?an?\s+example',
        ]
        has_pronoun = any(re.search(pat, msg_lower) for pat in pronoun_patterns)

        if has_explicit_pdf_ref and has_mixed_signal:
            return "MIXED"

        if has_explicit_pdf_ref:
            return "PDF_SPECIFIC"

        # If user asks a follow-up after a recent PDF question, carry over PDF context link
        if recent_pdf_context and (has_pronoun or has_mixed_signal) and has_doc:
            return "MIXED"

        # Default classification is GENERAL (Normal AI Assistant)
        return "GENERAL"

    async def process_chat(self, file_id: str, message: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        t_start = time.perf_counter()
        
        # 1. Fetch document if available
        doc = None
        if file_id:
            try:
                doc = pdf_service.get_document(file_id)
            except KeyError:
                doc = None

        # 2. Preserve original message and resolve query intent for context
        original_message = message.strip()
        resolved_query = rag_service.resolve_query_intent(original_message, history or [])

        # 3. Classify query intent using message, history context, and document state
        intent = self.classify_intent(resolved_query, history or [], has_doc=bool(doc))

        # 4. Check for page-specific requests
        page_match = re.search(r'\bpage\s*(\d+)\b', resolved_query, re.IGNORECASE)
        page_num = int(page_match.group(1)) if page_match else None

        # 5. PDF RAG Retrieval Strategy — ONLY execute RAG when PDF context is explicitly required
        t_ret_start = time.perf_counter()
        relevant_chunks = []
        sources = []

        if doc and intent in ["PDF_SPECIFIC", "MIXED"]:
            if page_num and doc.get("page_texts"):
                matching_pages = [p for p in doc["page_texts"] if p["page"] == page_num]
                if matching_pages:
                    text = matching_pages[0]["text"]
                    relevant_chunks = [{
                        "chunk_id": f"c-page-{page_num}",
                        "page": page_num,
                        "section": f"Page {page_num}",
                        "text": text[:1500]
                    }]

            if not relevant_chunks:
                if any(k in resolved_query.lower() for k in ["summarize", "overview", "important topics"]):
                    sampled = rag_service.get_document_chunks_sample(doc["file_id"], count=6)
                    relevant_chunks = sampled
                else:
                    chunks, _, is_found = rag_service.search(
                        file_id=doc["file_id"],
                        query=resolved_query,
                        history=history,
                        top_k=5,
                        min_threshold=0.03
                    )
                    relevant_chunks = chunks

        t_retrieval = (time.perf_counter() - t_ret_start) * 1000

        # Build context blocks and sources ONLY if relevant chunks were retrieved
        formatted_context = ""
        unique_sources = []
        sources_str = ""
        if relevant_chunks:
            context_blocks = []
            for idx, chunk in enumerate(relevant_chunks):
                context_blocks.append(f"--- Context Block {idx+1} [Page {chunk['page']} | Section: {chunk['section']}] ---\n{chunk['text']}")
                sources.append(f"📄 Page {chunk['page']} ({chunk['section']})")
            formatted_context = "\n\n".join(context_blocks)
            unique_sources = sorted(list(set(sources)))
            sources_str = "\n".join([f"• {s}" for s in unique_sources])

        # Check for PDF retrieval failure when user explicitly asked for PDF-only info
        is_pdf_explicit_only = bool(re.search(r'\b(only\s*from\s*(the|my)?\s*pdf|what\s*does\s*(the|my)\s*pdf\s*say|in\s*my\s*pdf|on\s*page\s*\d+)\b', resolved_query, re.IGNORECASE))

        if intent == "PDF_SPECIFIC" and not relevant_chunks and is_pdf_explicit_only:
            filename = doc["filename"] if doc else "uploaded PDF"
            reply_prefix = f"I couldn't locate specific information about '{original_message}' in your uploaded document (**{filename}**).\n\n"
            
            system_instruction = (
                "You are EASY-LEARN, a helpful general-purpose AI assistant.\n"
                "The user asked for information explicitly from their PDF, but the topic was not found in the document.\n"
                "Acknowledge that the topic was not found in the uploaded PDF, then answer the question directly using general AI knowledge."
            )
            prompt = f"""
USER QUESTION:
"{original_message}"

Acknowledge that while this wasn't found in their uploaded PDF, here is the answer using general AI capabilities.
Return JSON:
{{
  "reply": "Clear explanation acknowledging topic was not in PDF, followed by a direct answer to '{original_message}'.",
  "suggested_followups": []
}}
"""
            t_gem_start = time.perf_counter()
            ai_res = await ai_service.generate_json(prompt, system_prompt=system_instruction)
            t_gemini = (time.perf_counter() - t_gem_start) * 1000
            t_total = (time.perf_counter() - t_start) * 1000
            
            print(f"[PERF] feature=chat intent={intent} pdf_cache={'hit' if doc else 'miss'} retrieval={t_retrieval:.1f}ms gemini={t_gemini:.1f}ms total={t_total:.1f}ms gemini_calls=1")

            if ai_res and "reply" in ai_res:
                return {
                    "reply": sanitize_text(reply_prefix + ai_res["reply"]),
                    "sources": [],
                    "suggested_followups": []
                }
            return {
                "reply": f"I couldn't locate specific information about '{original_message}' in your uploaded document (**{filename}**). How else can I help you?",
                "sources": [],
                "suggested_followups": []
            }

        # 6. System Instruction for Gemini (General-Purpose AI Assistant like ChatGPT)
        key_present = bool(ai_service.get_api_key() and ai_service.get_api_key() != 'YOUR_GEMINI_API_KEY')
        print(f"[CHAT TRACE] Intent: {intent} | File ID: {file_id or 'None'} | PDF Retrieval Attempted: {bool(relevant_chunks)} | API Key Loaded: {'YES' if key_present else 'NO'}")

        system_instruction = (
            "You are EASY-LEARN, a general-purpose AI assistant with optional access to uploaded study material.\n\n"
            "Answer the user's actual question directly.\n"
            "Use clear Markdown when it improves readability.\n"
            "Identify natural headings and subheadings based on the answer.\n"
            "Keep simple answers concise.\n"
            "Use bullets and numbered lists when they improve clarity.\n"
            "Use examples when they genuinely help.\n"
            "Do not generate suggested questions unless explicitly requested.\n"
            "Do not add unnecessary meta-commentary.\n"
            "Do not repeat the user's question.\n"
            "Do not force academic or exam formatting unless requested.\n"
            "For complex questions, organize the response into meaningful sections.\n"
            "For programming questions, use properly formatted code blocks.\n"
            "For conversational questions, respond naturally."
        )

        if formatted_context:
            prompt = f"""
DOCUMENT CONTEXT (from uploaded file '{doc["filename"] if doc else "Document"}'):
{formatted_context}

USER QUESTION:
"{original_message}"

Answer the user's question using clean Markdown formatting.
"""
        else:
            prompt = f"""
USER QUESTION:
"{original_message}"

Answer the user's question directly using clean Markdown formatting.
"""

        # Generate single fast response directly using Gemini
        t_gem_start = time.perf_counter()
        text_res = await ai_service.generate_text(prompt, system_prompt=system_instruction)
        t_gemini = (time.perf_counter() - t_gem_start) * 1000
        t_total = (time.perf_counter() - t_start) * 1000

        print(f"[PERF] feature=chat intent={intent} pdf_cache={'hit' if doc else 'miss'} retrieval={t_retrieval:.1f}ms gemini={t_gemini:.1f}ms total={t_total:.1f}ms gemini_calls=1")

        if text_res:
            clean_reply = sanitize_text(text_res)
            uses_pdf = intent in ["PDF_SPECIFIC", "MIXED"] and len(relevant_chunks) > 0
            if uses_pdf and unique_sources and "Sources:" not in clean_reply:
                clean_reply += f"\n\n**Sources:**\n{sources_str}"
                final_sources = unique_sources
            else:
                final_sources = []

            return {
                "reply": clean_reply,
                "sources": final_sources,
                "suggested_followups": []
            }

        # Check specific AI service error status
        err_type = ai_service.last_error_type
        if err_type in ["AI_SERVICE_UNAVAILABLE", "RATE_LIMIT"]:
            return {
                "reply": "The AI service is temporarily busy. Please try again in a moment.",
                "sources": [],
                "suggested_followups": [],
                "success": False,
                "error_type": "AI_SERVICE_UNAVAILABLE"
            }

        if err_type in ["INVALID_API_KEY", "UNCONFIGURED_KEY"] or not key_present:
            return {
                "reply": "The Gemini API key is not configured in `backend/.env`. Please set `AI_API_KEY` in your `.env` file.",
                "sources": [],
                "suggested_followups": [],
                "success": False,
                "error_type": "INVALID_API_KEY"
            }

        # If PDF was requested and chunks exist, provide PDF excerpt as backup
        if intent in ["PDF_SPECIFIC", "MIXED"] and relevant_chunks:
            excerpt = "\n\n• " + "\n• ".join([c["text"][:200] for c in relevant_chunks[:3]])
            reply_text = f"Based on **{doc['filename']}**:\n{excerpt}"
            if unique_sources:
                reply_text += f"\n\n**Sources:**\n{sources_str}"
            return {
                "reply": reply_text,
                "sources": unique_sources,
                "suggested_followups": [],
                "success": True,
                "error_type": None
            }

        return {
            "reply": "Sorry, I couldn't generate a response right now. Please try again in a moment.",
            "sources": [],
            "suggested_followups": [],
            "success": False,
            "error_type": "GENERAL_ERROR"
        }

chat_service = ChatService()

