import re
import uuid
import random
import math
from typing import Dict, Any, List, Optional
from app.services.pdf_service import pdf_service, is_valid_educational_topic, is_metadata_line
from app.services.ai_service import ai_service
from app.models.schemas import (
    ExamMissionResponse, ExamMissionDay, CheckpointQuestion, MCQOption
)

class ExamMissionService:
    """Intelligent Document-Aware & Time-Aware Exam Mission Planner Service."""

    async def generate_exam_mission(
        self, file_id: str, days_remaining: int = 5, exam_date: Optional[str] = None
    ) -> Dict[str, Any]:
        doc = pdf_service.get_document(file_id)
        source_hash = doc.get("source_hash", file_id)
        metadata_dict = doc.get("documentMetadata", {})
        filename = doc.get("filename", "Study Syllabus")
        subject_name = doc.get("subject_title") or filename.replace(".pdf", "").replace("_", " ").replace("-", " ").title()

        days = max(1, min(30, days_remaining))
        cache_key = f"exam_mission_{days}"

        if cache_key in doc["cache"]:
            print(f"[CACHE] Exam Mission HIT for {days} days")
            return doc["cache"][cache_key]

        is_exam_eve = (days == 1)

        # 1. ALWAYS consume validated v2 topics from topic_service
        from app.services.topic_service import topic_service
        v2_topics_data = await topic_service.get_important_topics(file_id)
        raw_v2_list = v2_topics_data.get("topics", [])
        
        extracted_topics = [
            t["name"] for t in raw_v2_list
            if is_valid_educational_topic(t.get("name", ""), full_text=doc.get("full_text", ""), metadata_dict=metadata_dict, subject_title=subject_name)
        ]

        if not extracted_topics:
            extracted_topics = ["Foundational Principles", "Core System Architecture", "Data Processing & Workflows", "Applications & Analysis", "Review & Synthesis"]

        total_topics_count = len(extracted_topics)

        # System Prompt for Gemini with Metadata Exclusions
        system_prompt = f"""You are EASY-LEARN Exam Mission Architect.
CRITICAL MANDATE:
Generate a day-by-day exam mission plan for the subject '{subject_name}'.
Allocate ONLY these validated syllabus topics: [{', '.join(extracted_topics)}].
DO NOT include document metadata (college, degree, branch, textbook, author, instructor) inside 'topics'."""

        ai_prompt = f"""
Analyze the syllabus document '{subject_name}' with total {doc.get('total_pages', 10)} pages and {doc.get('total_words', 1000)} words.
Build a personalized {days}-day exam mission plan.
The user has {days} days remaining before their exam.

VALIDATED SYLLABUS TOPICS:
{', '.join(extracted_topics)}

GUIDELINES:
1. Divide the topics intelligently across {days} days.
2. Day 1 should focus on Foundations/Basics.
3. Intermediate days focus on Core & Advanced Concepts.
4. Penultimate days focus on Practice & Application.
5. Final day must focus on Revision, Weak Topics, & Mock Test.
6. For each day generate 3 checkpoint MCQ questions based strictly on that day's topics.

Return valid JSON:
{{
  "days": [
    {{
      "day_number": 1,
      "title": "Foundation & Fundamentals",
      "goal": "Build fundamental understanding of core concepts.",
      "topics": ["Topic 1", "Topic 2"],
      "estimated_time": "2h 30m",
      "difficulty": "Beginner",
      "activities": ["Learn Core Concepts", "Active Recall", "Understand Definitions"],
      "checkpoint_title": "Day 1 Understanding Check",
      "checkpoint_questions": [
        {{
          "id": "q1",
          "question": "What is the primary definition of Topic 1?",
          "options": [
            {{"id": "a", "text": "Option A"}},
            {{"id": "b", "text": "Option B"}},
            {{"id": "c", "text": "Option C"}},
            {{"id": "d", "text": "Option D"}}
          ],
          "correct_option_id": "a",
          "explanation": "Explanation for correct answer.",
          "topic": "Topic 1"
        }}
      ]
    }}
  ]
}}
"""
        ai_result = await ai_service.generate_json(ai_prompt, system_prompt=system_prompt)

        if ai_result and "days" in ai_result and len(ai_result["days"]) > 0:
            parsed_days = ai_result["days"]
            for d in parsed_days:
                if "topics" in d:
                    d["topics"] = [
                        t for t in d["topics"]
                        if is_valid_educational_topic(t, full_text=doc.get("full_text", ""), metadata_dict=metadata_dict, subject_title=subject_name)
                    ]
                if "checkpoint_questions" not in d or not d["checkpoint_questions"]:
                    day_topics = d.get("topics", ["Core Concepts"])
                    d["checkpoint_questions"] = [
                        {
                            "id": f"cp-{d.get('day_number', 1)}-{q_idx+1}",
                            "question": f"Which statement best characterizes {top_name}?",
                            "options": [
                                {"id": "a", "text": f"{top_name} forms a fundamental component of {subject_name}."},
                                {"id": "b", "text": f"It is unrelated to {subject_name} principles."},
                                {"id": "c", "text": "It applies only to administrative operations."},
                                {"id": "d", "text": "It was deprecated in modern implementations."}
                            ],
                            "correct_option_id": "a",
                            "explanation": f"{top_name} is a key concept in this syllabus.",
                            "topic": top_name
                        }
                        for q_idx, top_name in enumerate(day_topics[:3])
                    ]

            mission_id = str(uuid.uuid4())[:8]
            result_data = {
                "mission_id": mission_id,
                "subject": subject_name,
                "days_remaining": days,
                "exam_date": exam_date,
                "total_topics": total_topics_count,
                "total_estimated_time": f"{days * 2.5:.1f}h",
                "is_exam_eve": is_exam_eve,
                "days": parsed_days
            }
            doc["cache"][cache_key] = result_data
            pdf_service.save_disk_cache(source_hash, file_id, doc)
            return result_data

        # Fallback Mission Generator using validated v2 topics
        result_days = []
        topics_per_day = max(1, math.ceil(len(extracted_topics) / days))

        for d in range(1, days + 1):
            start_idx = (d - 1) * topics_per_day
            end_idx = min(len(extracted_topics), start_idx + topics_per_day)
            day_topics = extracted_topics[start_idx:end_idx] if start_idx < len(extracted_topics) else [extracted_topics[-1]]

            if d == 1:
                title = "Foundations & Core Principles" if not is_exam_eve else "EXAM EVE: Rapid Core Review"
                goal = "Establish clear conceptual understanding of fundamental principles."
                diff = "Beginner"
            elif d == days:
                title = "Final Revision & Mock Simulation"
                goal = "Consolidate active recall knowledge and complete exam-style practice."
                diff = "Advanced"
            elif d == days - 1:
                title = "Advanced Applications & Problem Solving"
                goal = "Master complex topics and practice high-yield exam questions."
                diff = "Advanced"
            else:
                title = f"Deep Dive: Module {d}"
                goal = "Build intermediate mastery and analyze topic interconnections."
                diff = "Intermediate"

            checkpoint_qs = []
            for q_idx, top_name in enumerate(day_topics[:3]):
                chunk_text = pdf_service.retrieve_relevant_chunks(file_id, query=top_name, max_chars=800)
                sentences = [s.strip() for s in re.split(r'[.!?]', chunk_text) if len(s.strip()) > 25 and not is_metadata_line(s)]
                fact = sentences[0] if sentences else f"{top_name} represents a fundamental component of {subject_name}."

                q_obj = {
                    "id": f"cp-{d}-{q_idx+1}",
                    "question": f"Which statement best characterizes {top_name}?",
                    "options": [
                        {"id": "a", "text": fact[:90]},
                        {"id": "b", "text": f"It is unrelated to {subject_name} fundamentals."},
                        {"id": "c", "text": f"It only applies to external non-academic contexts."},
                        {"id": "d", "text": f"It was deprecated in modern implementations."}
                    ],
                    "correct_option_id": "a",
                    "explanation": f"Based on the study material, {fact[:120]}.",
                    "topic": top_name
                }
                checkpoint_qs.append(q_obj)

            result_days.append({
                "day_number": d,
                "title": title,
                "goal": goal,
                "topics": day_topics,
                "estimated_time": f"{min(4, max(1.5, len(day_topics) * 0.8)):.1f}h",
                "difficulty": diff,
                "activities": ["Read Key Sections", "Active Recall Synthesis", "Checkpoint Verification"],
                "checkpoint_title": f"Day {d} Checkpoint • Prove Your Understanding",
                "checkpoint_questions": checkpoint_qs,
                "is_completed": False,
                "score": None
            })

        total_hours = sum(float(re.sub(r'[^0-9.]', '', d["estimated_time"]) or 2) for d in result_days)
        mission_id = str(uuid.uuid4())[:8]

        mission_data = {
            "mission_id": mission_id,
            "subject": subject_name,
            "days_remaining": days,
            "exam_date": exam_date,
            "total_topics": total_topics_count,
            "total_estimated_time": f"{total_hours:.1f}h",
            "is_exam_eve": is_exam_eve,
            "days": result_days
        }

        doc["cache"][cache_key] = mission_data
        pdf_service.save_disk_cache(source_hash, file_id, doc)
        return mission_data

    async def adapt_exam_mission(
        self, file_id: str, current_days: List[Dict[str, Any]], weak_topic: str, failed_day_number: int
    ) -> List[Dict[str, Any]]:
        """Adapt remaining mission days by shifting/reinforcing weak topics into subsequent days."""
        updated_days = [dict(d) for d in current_days]
        target_day_idx = failed_day_number if failed_day_number < len(updated_days) else len(updated_days) - 1

        if target_day_idx < len(updated_days):
            target_day = updated_days[target_day_idx]
            reinforcement_title = f"{weak_topic} (Reinforcement)"
            if reinforcement_title not in target_day["topics"] and weak_topic not in target_day["topics"]:
                target_day["topics"].insert(0, reinforcement_title)
                target_day["title"] += " + Weak Concept Reinforcement"
                target_day["goal"] += f" Extra focus allocated to master {weak_topic}."

        return updated_days

exam_mission_service = ExamMissionService()
