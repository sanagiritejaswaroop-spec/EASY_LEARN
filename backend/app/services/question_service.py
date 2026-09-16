import random
import re
from typing import Dict, Any, List, Optional
from app.services.pdf_service import pdf_service
from app.services.ai_service import ai_service
from app.services.topic_service import topic_service

class QuestionService:

    # --- MCQ Generation ---
    async def get_mcq_questions(
        self,
        file_id: str,
        count: int = 10,
        difficulty: str = "Medium",
        selected_topic: str = "All"
    ) -> Dict[str, Any]:
        doc = pdf_service.get_document(file_id)
        cache_key = f"mcq_{count}_{difficulty}_{selected_topic}"

        if cache_key in doc["cache"]:
            return doc["cache"][cache_key]

        topics_data = await topic_service.get_important_topics(file_id)
        topics = [t["name"] for t in topics_data["topics"]]
        context_chunks = pdf_service.retrieve_relevant_chunks(file_id, query=selected_topic if selected_topic != "All" else "mcq exam practice questions", max_chars=3500)

        # Try Gemini
        prompt = f"""
Generate {count} multiple choice questions (MCQs) for exam practice based on the study text.
Difficulty: {difficulty}
Filter Topic: {selected_topic}

Return JSON:
{{
  "questions": [
    {{
      "id": "mcq-1",
      "question": "Clear question text?",
      "options": [
        {{"id": "A", "text": "Option A"}},
        {{"id": "B", "text": "Option B"}},
        {{"id": "C", "text": "Option C"}},
        {{"id": "D", "text": "Option D"}}
      ],
      "correct_option_id": "B",
      "explanation": "Why B is correct.",
      "topic": "Topic Name",
      "difficulty": "{difficulty}"
    }}
  ]
}}
Study Text Excerpt:
{context_chunks}
"""
        ai_res = await ai_service.generate_json(prompt)
        if ai_res and "questions" in ai_res and len(ai_res["questions"]) > 0:
            res = {"questions": ai_res["questions"][:count], "total_questions": len(ai_res["questions"][:count])}
            doc["cache"][cache_key] = res
            return res

        # Dynamic NLP Question & Answer Synthesizer
        mcq_items = []
        for i in range(count):
            t_name = topics[i % len(topics)] if topics else "Core Concepts"
            mcq_items.append(ai_service.synthesize_mcq(t_name, doc["full_text"], i + 1, difficulty))

        res = {"questions": mcq_items, "total_questions": len(mcq_items)}
        doc["cache"][cache_key] = res
        return res

    # --- 2-Mark Questions ---
    async def get_short_questions(self, file_id: str, count: int = 8) -> Dict[str, Any]:
        doc = pdf_service.get_document(file_id)
        cache_key = f"short_{count}"
        if cache_key in doc["cache"]:
            return doc["cache"][cache_key]

        topics_data = await topic_service.get_important_topics(file_id)
        topics = [t["name"] for t in topics_data["topics"]]
        context_chunks = pdf_service.retrieve_relevant_chunks(file_id, query="definitions core concepts short questions", max_chars=3500)

        prompt = f"""
Generate {count} exam-oriented 2-mark short questions with concise, unique 1-2 sentence answers from this text.
Do NOT return identical template answers.
Return JSON:
{{
  "questions": [
    {{
      "id": "sq-1",
      "question": "What is ...?",
      "answer": "Concise answer text.",
      "topic": "Topic Name"
    }}
  ]
}}
Text: {context_chunks}
"""
        ai_res = await ai_service.generate_json(prompt)
        if ai_res and "questions" in ai_res:
            res = {"questions": ai_res["questions"][:count]}
            doc["cache"][cache_key] = res
            return res

        # Dynamic Synthesizer
        items = []
        for idx in range(count):
            t = topics[idx % len(topics)] if topics else "Core Concept"
            items.append(ai_service.synthesize_short_answer(t, doc["full_text"], idx + 1))

        res = {"questions": items}
        doc["cache"][cache_key] = res
        return res

    # --- 5-Mark Questions ---
    async def get_medium_questions(self, file_id: str, count: int = 5) -> Dict[str, Any]:
        doc = pdf_service.get_document(file_id)
        cache_key = f"medium_{count}"
        if cache_key in doc["cache"]:
            return doc["cache"][cache_key]

        topics_data = await topic_service.get_important_topics(file_id)
        topics = [t["name"] for t in topics_data["topics"]]
        context_chunks = pdf_service.retrieve_relevant_chunks(file_id, query="architecture working principles main mechanisms", max_chars=3500)

        prompt = f"""
Generate {count} exam-oriented 5-mark structured questions based on the text.
Each answer MUST contain unique details: introduction, main_points (4 items), example, conclusion.
Return JSON format.
Text: {context_chunks}
"""
        ai_res = await ai_service.generate_json(prompt)
        if ai_res and "questions" in ai_res:
            res = {"questions": ai_res["questions"][:count]}
            doc["cache"][cache_key] = res
            return res

        # Dynamic Synthesizer
        items = []
        for idx in range(count):
            t = topics[idx % len(topics)] if topics else "System Architecture"
            items.append(ai_service.synthesize_medium_answer(t, doc["full_text"], idx + 1))

        res = {"questions": items}
        doc["cache"][cache_key] = res
        return res

    # --- 10-Mark Questions ---
    async def get_long_questions(self, file_id: str, count: int = 3) -> Dict[str, Any]:
        doc = pdf_service.get_document(file_id)
        cache_key = f"long_{count}"
        if cache_key in doc["cache"]:
            return doc["cache"][cache_key]

        topics_data = await topic_service.get_important_topics(file_id)
        topics = [t["name"] for t in topics_data["topics"]]
        context_chunks = pdf_service.retrieve_relevant_chunks(file_id, query="in-depth analysis detailed architecture steps pros cons", max_chars=3500)

        prompt = f"""
Generate {count} comprehensive 10-mark long-answer exam questions tailored to the text.
Include: definition, detailed_explanation, steps_or_types, practical_example, pros_and_cons, conclusion.
Return JSON format.
Text: {context_chunks}
"""
        ai_res = await ai_service.generate_json(prompt)
        if ai_res and "questions" in ai_res:
            res = {"questions": ai_res["questions"][:count]}
            doc["cache"][cache_key] = res
            return res

        # Dynamic Synthesizer
        items = []
        for idx in range(count):
            t = topics[idx % len(topics)] if topics else "System Framework"
            items.append(ai_service.synthesize_long_answer(t, doc["full_text"], idx + 1))

        res = {"questions": items}
        doc["cache"][cache_key] = res
        return res

question_service = QuestionService()
