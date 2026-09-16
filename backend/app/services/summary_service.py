import re
from typing import Dict, Any, List
from app.services.pdf_service import pdf_service
from app.services.ai_service import ai_service

class SummaryService:
    async def get_summary(self, file_id: str) -> Dict[str, Any]:
        doc = pdf_service.get_document(file_id)
        
        # Check cache first
        if "summary" in doc["cache"]:
            return doc["cache"]["summary"]

        full_text = doc["full_text"]
        filename = doc["filename"]
        
        # Step 12: Hierarchical Document-Wide Summarization across all PDF pages
        from app.services.rag_service import rag_service
        sampled_chunks = rag_service.get_document_chunks_sample(file_id, count=8)
        if sampled_chunks:
            context_text = "\n\n".join([f"[Page {c['page']} | Section: {c['section']}]\n{c['text']}" for c in sampled_chunks])
        else:
            context_text = full_text[:4000]

        # Prompt for Gemini
        prompt = f"""
Analyze the following document excerpt sampled across all sections of '{filename}' and provide a structured JSON document summary:
1. 'overview': A comprehensive 3-4 sentence academic overview spanning the whole document.
2. 'main_concepts': Array of 4-6 concept objects with 'number' ("01", "02", etc.), 'title', and 'description'.
3. 'key_takeaways': Array of 4 high-yield exam bullet points.

Multi-Page Excerpt:
{context_text}
"""
        
        ai_res = await ai_service.generate_json(prompt)
        if ai_res and "overview" in ai_res and "main_concepts" in ai_res:
            doc["cache"]["summary"] = ai_res
            return ai_res

        # NLP Fallback Engine
        topics = ai_service.extract_keywords_and_topics(full_text, max_topics=4)
        
        sentences = [s.strip() for s in re.split(r'[.!?]', full_text) if len(s.strip()) > 30]
        overview_text = (
            f"This study document ('{filename}') presents a comprehensive exploration of key domain concepts, "
            f"structured across {doc['estimated_chapters']} major modules. The material emphasizes theoretical foundations, "
            f"practical implementation patterns, and system design trade-offs. Key focus areas include "
            f"{', '.join([t['name'] for t in topics[:3]])}."
        )

        main_concepts = []
        for idx, t in enumerate(topics):
            main_concepts.append({
                "number": f"{idx+1:02d}",
                "title": t["name"],
                "description": t["short_explanation"]
            })

        takeaways = [
            f"Comprehensive grasp of {topics[0]['name'] if topics else 'core principles'} and its primary state mechanisms.",
            "Understanding performance tradeoffs, throughput metrics, and resource allocation constraints.",
            "Architectural modularity and error resilience strategies presented throughout the material.",
            "Exam-critical definitions, algorithms, and comparative evaluation criteria."
        ]

        res = {
            "overview": overview_text,
            "main_concepts": main_concepts,
            "key_takeaways": takeaways
        }

        doc["cache"]["summary"] = res
        return res

summary_service = SummaryService()
