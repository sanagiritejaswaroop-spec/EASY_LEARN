from typing import Dict, Any, List
from app.services.pdf_service import pdf_service
from app.services.ai_service import ai_service

class TopicService:
    async def get_important_topics(self, file_id: str) -> Dict[str, Any]:
        doc = pdf_service.get_document(file_id)

        if "topics" in doc["cache"]:
            return {"topics": doc["cache"]["topics"]}

        full_text = doc["full_text"]
        context_chunks = pdf_service.retrieve_relevant_chunks(file_id, query="important topics modules chapters key concepts", max_chars=3500)
        
        # Prompt for Gemini
        prompt = f"""
Extract 5 to 7 most important exam topics from this study material.
Return JSON:
{{
  "topics": [
    {{
      "id": "topic-1",
      "name": "Topic Name",
      "importance_percentage": 95,
      "short_explanation": "Short 1-2 sentence overview",
      "detailed_summary": "Comprehensive 3-5 sentence detailed summarized matter explaining this topic thoroughly based on the material.",
      "what_you_should_know": ["Point 1", "Point 2", "Point 3"],
      "key_terms": ["Term 1", "Term 2", "Term 3"],
      "quick_summary": "In-depth summary paragraph of this topic."
    }}
  ]
}}

Material:
{context_chunks}
"""
        ai_res = await ai_service.generate_json(prompt)
        if ai_res and "topics" in ai_res:
            doc["cache"]["topics"] = ai_res["topics"]
            return ai_res

        # NLP Fallback
        topics = ai_service.extract_keywords_and_topics(full_text, max_topics=6)
        doc["cache"]["topics"] = topics
        return {"topics": topics}

topic_service = TopicService()
