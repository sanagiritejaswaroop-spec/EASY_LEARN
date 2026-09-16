import random
from typing import Dict, Any, List
from app.services.pdf_service import pdf_service
from app.services.question_service import question_service

class MockExamService:
    async def generate_mock_exam(
        self,
        file_id: str,
        time_limit_minutes: int = 30
    ) -> Dict[str, Any]:
        doc = pdf_service.get_document(file_id)
        cache_key = f"mock_exam_{time_limit_minutes}"

        if cache_key in doc["cache"]:
            return doc["cache"][cache_key]

        # Fetch questions from question_service
        mcqs_res = await question_service.get_mcq_questions(file_id, count=10)
        shorts_res = await question_service.get_short_questions(file_id, count=6)
        mediums_res = await question_service.get_medium_questions(file_id, count=4)

        exam_questions = []
        q_counter = 1

        # MCQs (1 mark each)
        for m in mcqs_res["questions"]:
            exam_questions.append({
                "id": f"q-{q_counter}",
                "type": "mcq",
                "question": m["question"],
                "options": m["options"],
                "correct_option_id": m["correct_option_id"],
                "model_answer": m["explanation"],
                "marks": 1,
                "topic": m["topic"]
            })
            q_counter += 1

        # 2-Mark Short Questions
        for s in shorts_res["questions"]:
            exam_questions.append({
                "id": f"q-{q_counter}",
                "type": "short",
                "question": s["question"],
                "options": None,
                "correct_option_id": None,
                "model_answer": s["answer"],
                "marks": 2,
                "topic": s["topic"]
            })
            q_counter += 1

        # 5-Mark Medium Questions
        for md in mediums_res["questions"]:
            ans_str = f"Introduction: {md['introduction']}\nKey Points:\n" + "\n".join([f"• {p}" for p in md['main_points']]) + f"\nConclusion: {md['conclusion']}"
            exam_questions.append({
                "id": f"q-{q_counter}",
                "type": "medium",
                "question": md["question"],
                "options": None,
                "correct_option_id": None,
                "model_answer": ans_str,
                "marks": 5,
                "topic": md["topic"]
            })
            q_counter += 1

        total_marks = sum(q["marks"] for q in exam_questions)

        res = {
            "exam_id": f"exam-{doc['file_id']}",
            "title": f"Comprehensive Mock Exam — {doc['filename']}",
            "total_questions": len(exam_questions),
            "total_marks": total_marks,
            "time_limit_minutes": time_limit_minutes,
            "questions": exam_questions
        }

        doc["cache"][cache_key] = res
        return res

mock_exam_service = MockExamService()
