from typing import Dict, Any, List
from app.services.pdf_service import pdf_service
from app.services.ai_service import ai_service
from app.services.topic_service import topic_service

class FlashcardService:
    async def get_flashcards(self, file_id: str, count: int = 12) -> Dict[str, Any]:
        doc = pdf_service.get_document(file_id)
        cache_key = f"flashcards_{count}"

        if cache_key in doc["cache"]:
            return doc["cache"][cache_key]

        topics_data = await topic_service.get_important_topics(file_id)
        topics = topics_data["topics"]
        context_chunks = pdf_service.retrieve_relevant_chunks(file_id, query="flashcards definitions key terms key concepts", max_chars=3500)

        prompt = f"""
Generate {count} high-yield study flashcards based on this material.
Return JSON:
{{
  "flashcards": [
    {{
      "id": "card-1",
      "front": "Clear question or key term",
      "back": "Concise answer or concept definition",
      "topic": "Topic Name",
      "difficulty": "Easy"
    }}
  ]
}}
Text Excerpt: {context_chunks}
"""
        ai_res = await ai_service.generate_json(prompt)
        if ai_res and "flashcards" in ai_res:
            res = {"flashcards": ai_res["flashcards"][:count]}
            doc["cache"][cache_key] = res
            return res

        # Fallback NLP flashcards
        cards = []
        card_id = 1
        for t in topics:
            back_desc = t.get('detailed_summary') or t.get('short_explanation') or ""
            if not ai_service.is_substantive_sentence(back_desc):
                back_desc = f"{t['name']} is a core academic subject in this study guide, providing foundational principles, procedural workflows, and structural analysis."
            
            cards.append({
                "id": f"card-{card_id}",
                "front": f"What is {t['name']}?",
                "back": back_desc,
                "topic": t['name'],
                "difficulty": "Easy"
            })
            card_id += 1
            cards.append({
                "id": f"card-{card_id}",
                "front": f"Key concepts & terms for {t['name']}",
                "back": f"Key terminology includes: {', '.join(t.get('key_terms', []))}.",
                "topic": t['name'],
                "difficulty": "Medium"
            })
            card_id += 1

        if len(cards) < count:
            extra = [
                ("What is throughput?", "The rate at which a system processes requests or completes work over a given time interval."),
                ("Define Latency", "The time delay between requesting an action and receiving the first response."),
                ("What is a Context Switch?", "The process of saving state of a process/thread so that it can be restored and resume execution later."),
                ("Define Deadlock", "A state where a set of processes are blocked because each process is holding a resource and waiting for another.")
            ]
            for q, a in extra:
                if len(cards) >= count:
                    break
                cards.append({
                    "id": f"card-{card_id}",
                    "front": q,
                    "back": a,
                    "topic": "Core Fundamentals",
                    "difficulty": "Medium"
                })
                card_id += 1

        res = {"flashcards": cards[:count]}
        doc["cache"][cache_key] = res
        return res

flashcard_service = FlashcardService()
