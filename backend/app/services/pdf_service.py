import fitz  # PyMuPDF
import re
import os
import uuid
from typing import Dict, Any, List

# In-memory document session storage
DOCUMENT_STORE: Dict[str, Dict[str, Any]] = {}

class PDFService:
    @staticmethod
    def process_pdf(file_path: str, original_filename: str) -> Dict[str, Any]:
        """Extract text from PDF using PyMuPDF and calculate document statistics."""
        if not os.path.exists(file_path):
            raise FileNotFoundError("Uploaded file not found on server.")

        doc = fitz.open(file_path)
        total_pages = len(doc)
        
        full_text = ""
        page_texts: List[Dict[str, Any]] = []
        headings: List[str] = []

        for page_num in range(total_pages):
            page = doc.load_page(page_num)
            text = page.get_text("text") or ""
            # Clean control characters
            cleaned_page_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
            full_text += cleaned_page_text + "\n"
            
            # Simple heading extraction heuristics based on capitalized lines
            lines = [l.strip() for l in cleaned_page_text.splitlines() if l.strip()]
            for l in lines:
                if len(l) < 60 and (l.isupper() or re.match(r'^(Chapter|Module|Unit|Section|\d+\.|\d+\.\d+)\s+[A-Z]', l, re.IGNORECASE)):
                    if l not in headings:
                        headings.append(l)

            page_texts.append({
                "page": page_num + 1,
                "text": cleaned_page_text
            })

        doc.close()

        # Sanitize full text
        clean_text = re.sub(r'\n{3,}', '\n\n', full_text).strip()
        words = clean_text.split()
        total_words = len(words)
        
        file_size_bytes = os.path.getsize(file_path)
        file_size_formatted = f"{file_size_bytes / (1024 * 1024):.1f} MB" if file_size_bytes >= 1024 * 1024 else f"{file_size_bytes / 1024:.1f} KB"
        
        estimated_chapters = max(1, len(headings) if len(headings) > 0 else max(1, total_pages // 6))

        file_id = str(uuid.uuid4())[:8]

        session_data = {
            "file_id": file_id,
            "filename": original_filename,
            "file_path": file_path,
            "file_size_bytes": file_size_bytes,
            "file_size_formatted": file_size_formatted,
            "total_pages": total_pages,
            "total_words": total_words,
            "estimated_chapters": estimated_chapters,
            "headings": headings,
            "full_text": clean_text,
            "page_texts": page_texts,
            "cache": {}  # For storing generated AI summaries/questions
        }

        DOCUMENT_STORE[file_id] = session_data

        # Automatically build RAG Vector Store & Chunk Index
        from app.services.rag_service import rag_service
        rag_service.build_index(file_id, page_texts)

        return session_data

    @staticmethod
    def get_document(file_id: str) -> Dict[str, Any]:
        doc = DOCUMENT_STORE.get(file_id)
        if not doc:
            raise KeyError(f"Document with ID {file_id} not found in session memory.")
        return doc

    @staticmethod
    def retrieve_relevant_chunks(file_id: str, query: str = "", max_chars: int = 3500) -> str:
        """RAG Document Chunk Retrieval: divides PDF into paragraphs and selects the most relevant context."""
        doc = DOCUMENT_STORE.get(file_id)
        if not doc:
            return ""
        full_text = doc["full_text"]
        if len(full_text) <= max_chars:
            return full_text

        paragraphs = [p.strip() for p in re.split(r'\n{2,}', full_text) if len(p.strip()) > 30]
        if not paragraphs:
            return full_text[:max_chars]

        if not query:
            num_p = len(paragraphs)
            selected = []
            current_len = 0
            indices = [0, num_p // 4, num_p // 2, (3 * num_p) // 4, num_p - 1]
            for idx in sorted(set(indices)):
                if idx < num_p:
                    p = paragraphs[idx]
                    if current_len + len(p) <= max_chars:
                        selected.append(p)
                        current_len += len(p)
            return "\n\n".join(selected) if selected else full_text[:max_chars]

        words = [w.lower() for w in re.sub(r'[^a-zA-Z0-9]', ' ', query).split() if len(w) > 3]
        if not words:
            return paragraphs[0][:max_chars]

        scored_paragraphs = []
        for p in paragraphs:
            p_lower = p.lower()
            score = sum(p_lower.count(w) for w in words)
            scored_paragraphs.append((score, p))

        scored_paragraphs.sort(key=lambda x: x[0], reverse=True)
        selected = []
        current_len = 0
        for score, p in scored_paragraphs:
            if current_len + len(p) <= max_chars:
                selected.append(p)
                current_len += len(p)
            if current_len >= max_chars:
                break

        return "\n\n".join(selected) if selected else full_text[:max_chars]

pdf_service = PDFService()
