import re
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class RAGService:
    """Enterprise RAG Service: Intelligent Chunking, TF-IDF Vector Store, Hybrid Retrieval, & Query Resolution."""

    def __init__(self):
        # Store vector indexes per document file_id: { file_id: { "vectorizer": ..., "matrix": ..., "chunks": [...] } }
        self.indexes: Dict[str, Dict[str, Any]] = {}

    def build_index(self, file_id: str, page_texts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Step 1 & 2: Intelligent Chunking with Section Tracking and Metadata Preservation.
        Chunk size: 500-800 characters with 150-character overlap.
        """
        chunks: List[Dict[str, Any]] = []
        chunk_counter = 1
        current_section = "General Overview"

        for p_info in page_texts:
            page_num = p_info["page"]
            raw_text = p_info["text"]

            lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
            paragraph_buf = ""

            for line in lines:
                # Section heading detection heuristic
                if len(line) < 70 and (line.isupper() or re.match(r'^(Chapter|Module|Unit|Section|\d+\.|\d+\.\d+)\s+[A-Z]', line, re.IGNORECASE)):
                    current_section = line

                # Accumulate line into paragraph
                paragraph_buf += line + " "

                if len(paragraph_buf) >= 600:
                    chunks.append({
                        "chunk_id": f"c-{page_num}-{chunk_counter}",
                        "page": page_num,
                        "section": current_section,
                        "text": paragraph_buf.strip()
                    })
                    chunk_counter += 1
                    # Keep overlap of 150 chars
                    paragraph_buf = paragraph_buf[-150:]

            if paragraph_buf.strip():
                chunks.append({
                    "chunk_id": f"c-{page_num}-{chunk_counter}",
                    "page": page_num,
                    "section": current_section,
                    "text": paragraph_buf.strip()
                })
                chunk_counter += 1

        if not chunks:
            chunks = [{
                "chunk_id": "c-1-1",
                "page": 1,
                "section": "General Notes",
                "text": "No text content available."
            }]

        # Step 3: Embeddings Vector Store (TF-IDF N-gram Matrix)
        chunk_texts = [c["text"] for c in chunks]
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            stop_words='english'
        )
        try:
            tfidf_matrix = vectorizer.fit_transform(chunk_texts)
        except Exception:
            # Fallback for short texts
            vectorizer = TfidfVectorizer(ngram_range=(1, 1), stop_words=None)
            tfidf_matrix = vectorizer.fit_transform(chunk_texts)

        self.indexes[file_id] = {
            "vectorizer": vectorizer,
            "matrix": tfidf_matrix,
            "chunks": chunks
        }

        print(f"[RAGService] Successfully indexed {len(chunks)} chunks for document {file_id}.")
        return chunks

    def resolve_query_intent(self, query: str, history: List[Dict[str, str]]) -> str:
        """
        Step 5: Query Intent Understanding & Conversation Context Resolution.
        Resolves pronouns ('it', 'its', 'this', 'that', 'they') using recent conversation history.
        """
        query_clean = query.strip()
        pronoun_pattern = r'\b(it|its|this|that|they|them|these|those)\b'

        if re.search(pronoun_pattern, query_clean, re.IGNORECASE) and history:
            # Look back for recent user queries to extract subject
            recent_user_msgs = [h["content"] for h in reversed(history) if h.get("role") == "user"]
            for prev_msg in recent_user_msgs[:2]:
                # Extract potential topic words from previous question
                clean_prev = re.sub(r'\b(what|is|are|the|a|an|how|why|where|explain|define|tell|me|about)\b', '', prev_msg, flags=re.IGNORECASE)
                words = [w.strip() for w in clean_prev.split() if len(w.strip()) >= 3]
                if words:
                    subject = " ".join(words[:3])
                    resolved_query = re.sub(pronoun_pattern, subject, query_clean, flags=re.IGNORECASE)
                    print(f"[RAGService] Resolved pronoun query: '{query_clean}' -> '{resolved_query}'")
                    return resolved_query

        return query_clean

    def search(self, file_id: str, query: str, history: Optional[List[Dict[str, str]]] = None, top_k: int = 5, min_threshold: float = 0.05) -> Tuple[List[Dict[str, Any]], str, bool]:
        """
        Step 3, 4, 15: Hybrid Vector Semantic + Lexical Search with Relevance Threshold.
        Returns: (relevant_chunks, resolved_query, is_found)
        """
        if file_id not in self.indexes:
            return [], query, False

        index_data = self.indexes[file_id]
        vectorizer: TfidfVectorizer = index_data["vectorizer"]
        tfidf_matrix = index_data["matrix"]
        chunks: List[Dict[str, Any]] = index_data["chunks"]

        # Step 5: Query resolution
        resolved_query = self.resolve_query_intent(query, history or [])

        # Step 3: Semantic Similarity Vector Search
        try:
            query_vec = vectorizer.transform([resolved_query])
            cosine_sims = cosine_similarity(query_vec, tfidf_matrix).flatten()
        except Exception:
            cosine_sims = np.zeros(len(chunks))

        # Step 4: Hybrid Search (Semantic + Exact/Stem Technical Keyword Match Boosting)
        stopwords = {
            "what", "is", "are", "the", "a", "an", "how", "why", "where", "explain", "define",
            "tell", "me", "about", "from", "my", "notes", "pdf", "types", "different", "does",
            "do", "did", "like", "can", "could", "would", "should", "give", "show", "what's",
            "which", "who", "whom", "whose", "when"
        }
        raw_keywords = [w.lower() for w in re.sub(r'[^a-zA-Z0-9]', ' ', resolved_query).split()]
        keywords = [w for w in raw_keywords if len(w) >= 2 and w not in stopwords]

        hybrid_scores = []
        for idx, chunk in enumerate(chunks):
            sem_score = float(cosine_sims[idx])
            c_text_lower = chunk["text"].lower()

            # Stem-aware Lexical keyword score
            key_matches = 0
            for kw in keywords:
                # Stem prefix match (e.g., evaluate -> evaluates, centroid -> centroids)
                stem = kw[:5] if len(kw) >= 6 else (kw[:4] if len(kw) >= 5 else kw)
                if re.search(rf'\b{re.escape(stem)}', c_text_lower):
                    key_matches += 1

            lex_score = (key_matches / len(keywords)) if keywords else 0.0

            # Exact keyword match ratio
            exact_matches = sum(1 for kw in keywords if re.search(rf'\b{re.escape(kw)}\b', c_text_lower))
            exact_ratio = (exact_matches / len(keywords)) if keywords else 0.0

            # Combined hybrid score
            score = (0.4 * sem_score) + (0.4 * lex_score) + (0.2 * exact_ratio)
            hybrid_scores.append((score, chunk))

        # Sort by hybrid score
        hybrid_scores.sort(key=lambda x: x[0], reverse=True)

        # Step 15: Check Similarity Threshold
        max_score = hybrid_scores[0][0] if hybrid_scores else 0.0
        if max_score < min_threshold:
            print(f"[RAGService] Query '{resolved_query}' max score {max_score:.4f} below threshold {min_threshold}.")
            return [], resolved_query, False

        top_chunks = [chunk for score, chunk in hybrid_scores[:top_k] if score > 0]
        return top_chunks, resolved_query, True

    def get_document_chunks_sample(self, file_id: str, count: int = 10) -> List[Dict[str, Any]]:
        """Step 10, 12, 13: Retrieve distributed chunks across the entire PDF for full summarization/MCQ generation."""
        if file_id not in self.indexes:
            return []
        chunks = self.indexes[file_id]["chunks"]
        if len(chunks) <= count:
            return chunks

        # Select evenly spaced chunks across whole PDF
        indices = np.linspace(0, len(chunks) - 1, count, dtype=int)
        return [chunks[i] for i in indices]

rag_service = RAGService()
