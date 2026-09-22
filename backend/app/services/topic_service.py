import os
import json
import time
import re
from typing import Dict, Any, List, Optional
from app.services.pdf_service import pdf_service, is_valid_educational_topic, is_metadata_line, CACHE_DIR
from app.services.ai_service import ai_service

TOPIC_EXTRACTION_VERSION = "v2"

class TopicService:
    async def get_important_topics(self, file_id: str) -> Dict[str, Any]:
        t_start = time.perf_counter()
        doc = pdf_service.get_document(file_id)
        source_hash = doc.get("source_hash", file_id)
        metadata_dict = doc.get("documentMetadata", {})
        subject_title = doc.get("subject_title", "")
        full_text = doc.get("full_text", "")

        v2_cache_file = os.path.join(CACHE_DIR, f"{source_hash}_v2_topics.json")

        # 1. Check in-memory session cache & persistent disk cache for valid v2 topics
        cached_topics = doc.get("cache", {}).get("topics")
        cache_ver = doc.get("cache", {}).get("topic_extraction_version")

        if cached_topics and cache_ver == TOPIC_EXTRACTION_VERSION:
            valid_cached = [
                t for t in cached_topics
                if is_valid_educational_topic(t.get("name", ""), full_text=full_text, metadata_dict=metadata_dict, subject_title=subject_title)
            ]
            if len(valid_cached) >= 3:
                t_total = (time.perf_counter() - t_start) * 1000
                print(f"[TOPIC CACHE]")
                print(f"HIT")
                print(f"Source hash: {source_hash}")
                print(f"Version: {TOPIC_EXTRACTION_VERSION}")
                print(f"Gemini calls: 0")
                print(f"PDF extraction: skipped")
                print(f"Total time: {t_total:.1f}ms")
                return {"topics": valid_cached}

        # Check persistent disk cache file
        if os.path.exists(v2_cache_file):
            try:
                with open(v2_cache_file, "r", encoding="utf-8") as f:
                    disk_v2 = json.load(f)
                if disk_v2.get("topic_extraction_version") == TOPIC_EXTRACTION_VERSION and "topics" in disk_v2:
                    valid_disk = [
                        t for t in disk_v2["topics"]
                        if is_valid_educational_topic(t.get("name", ""), full_text=full_text, metadata_dict=metadata_dict, subject_title=subject_title)
                    ]
                    if len(valid_disk) >= 3:
                        doc["cache"]["topics"] = valid_disk
                        doc["cache"]["topic_extraction_version"] = TOPIC_EXTRACTION_VERSION
                        pdf_service.save_disk_cache(source_hash, file_id, doc)
                        
                        t_total = (time.perf_counter() - t_start) * 1000
                        print(f"[TOPIC CACHE]")
                        print(f"HIT (disk)")
                        print(f"Source hash: {source_hash}")
                        print(f"Version: {TOPIC_EXTRACTION_VERSION}")
                        print(f"Gemini calls: 0")
                        print(f"PDF extraction: skipped")
                        print(f"Total time: {t_total:.1f}ms")
                        return {"topics": valid_disk}
            except Exception as e:
                print(f"[TopicService] Warning reading disk cache: {e}")

        print(f"[TOPIC CACHE] MISS — generating validated topics for file {file_id}")
        
        excl_parts = [subject_title]
        for k, v in metadata_dict.items():
            if v and isinstance(v, str):
                excl_parts.append(v)
        exclusion_list_str = ", ".join(list(set(excl_parts)))

        context_chunks = pdf_service.retrieve_relevant_chunks(file_id, query="important topics modules chapters key concepts", max_chars=3500)

        # 2. System Prompt & Gemini Generation with Strict Metadata Exclusions
        system_prompt = f"""You are EASY-LEARN, an expert AI Study Assistant.
CRITICAL MANDATE:
Extract ONLY genuine educational concepts taught in the syllabus text.
EXCLUDE ALL document metadata from this exclusion list: [{exclusion_list_str}].
DO NOT include college/institution names, degree/branch ('III B.TECH', 'CSE-AI,AIML'), author names ('James Allen'), instructor names ('CH'), textbook titles ('Natural Language Understanding'), edition ('2nd Edition'), or publication year ('2003') as study topics."""

        prompt = f"""
Extract 5 to 7 most important exam topics from this study material.
EXCLUDE document metadata ({exclusion_list_str}).

Return valid JSON:
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
        t_gem_start = time.perf_counter()
        ai_res = await ai_service.generate_json(prompt, system_prompt=system_prompt)
        t_gem = (time.perf_counter() - t_gem_start) * 1000

        t_val_start = time.perf_counter()
        clean_ai_topics: List[Dict[str, Any]] = []
        if ai_res and "topics" in ai_res and isinstance(ai_res["topics"], list):
            for t in ai_res["topics"]:
                name = t.get("name", "")
                if is_valid_educational_topic(name, full_text=full_text, metadata_dict=metadata_dict, subject_title=subject_title):
                    clean_ai_topics.append(t)
        t_val = (time.perf_counter() - t_val_start) * 1000

        if len(clean_ai_topics) >= 3:
            doc["cache"]["topics"] = clean_ai_topics
            doc["cache"]["topic_extraction_version"] = TOPIC_EXTRACTION_VERSION
            
            t_write_start = time.perf_counter()
            v2_payload = {
                "file_id": file_id,
                "source_hash": source_hash,
                "topic_extraction_version": TOPIC_EXTRACTION_VERSION,
                "documentMetadata": metadata_dict,
                "topics": clean_ai_topics,
                "generated_at": time.time()
            }
            try:
                with open(v2_cache_file, "w", encoding="utf-8") as f:
                    json.dump(v2_payload, f, indent=2)
            except Exception as e:
                print(f"[TopicService] Error saving v2 cache to disk: {e}")

            pdf_service.save_disk_cache(source_hash, file_id, doc)
            t_write = (time.perf_counter() - t_write_start) * 1000
            t_total = (time.perf_counter() - t_start) * 1000

            print(f"[TOPIC TIMING]")
            print(f"Gemini API: {t_gem:.1f} ms")
            print(f"Validation: {t_val:.1f} ms")
            print(f"Cache write: {t_write:.1f} ms")
            print(f"Total: {t_total:.1f} ms")

            return {"topics": clean_ai_topics}

        # 3. Controlled Fallback: Structural Extraction
        print(f"[TOPIC EXTRACTION] Gemini unavailable after controlled retry. Using validated structural fallback.")
        t_fall_start = time.perf_counter()

        headings = doc.get("headings", [])
        concepts = doc.get("concepts", [])
        
        fallback_candidates = []
        for h in headings + concepts:
            clean_h = re.sub(r'^(?:chapter|module|unit|section|\d+\.|\d+\.\d+|\d+)\s*', '', h, flags=re.IGNORECASE).strip()
            if is_valid_educational_topic(clean_h, full_text=full_text, metadata_dict=metadata_dict, subject_title=subject_title):
                stem = re.sub(r's$', '', clean_h.lower())
                if not any(re.sub(r's$', '', existing.lower()) == stem for existing in fallback_candidates):
                    fallback_candidates.append(clean_h)

        if not fallback_candidates:
            nlp_candidates = ai_service.extract_keywords_and_topics(full_text, max_topics=8)
            for t in nlp_candidates:
                t_name = t.get("name", "")
                if is_valid_educational_topic(t_name, full_text=full_text, metadata_dict=metadata_dict, subject_title=subject_title):
                    fallback_candidates.append(t_name)

        if not fallback_candidates:
            print("[TOPIC VALIDATION] Candidate result rejected: insufficient valid educational topics")
            return {"topics": []}

        clean_fallback_topics = []
        base_percentage = 95
        for idx, top_name in enumerate(fallback_candidates[:6]):
            pct = max(55, base_percentage - (idx * 7))
            
            chunks = pdf_service.retrieve_relevant_chunks(file_id, query=top_name, max_chars=1200)
            sentences = [s.strip() for s in re.split(r'[.!?]', chunks) if len(s.strip()) > 25 and not is_metadata_line(s)]
            
            short_exp = sentences[0] if sentences else f"Core principle governing {top_name.lower()} within this material."
            if len(short_exp) > 180:
                short_exp = short_exp[:177] + "..."

            detailed_matter = " ".join(sentences[:3]) + "." if len(sentences) >= 2 else f"{short_exp} {top_name} provides foundational structure for understanding domain operations, system behaviors, and analytical frameworks."

            clean_fallback_topics.append({
                "id": f"topic-{idx+1}",
                "name": top_name,
                "importance_percentage": pct,
                "short_explanation": short_exp,
                "detailed_summary": detailed_matter,
                "what_you_should_know": [
                    f"Understanding the core definition and mechanics of {top_name}.",
                    f"Key algorithms and structural workflow of {top_name}.",
                    f"Practical applications and performance tradeoffs."
                ],
                "key_terms": [
                    f"{top_name} Architecture",
                    "State Transitions",
                    "System Parameters"
                ],
                "quick_summary": detailed_matter
            })

        t_fall = (time.perf_counter() - t_fall_start) * 1000

        doc["cache"]["topics"] = clean_fallback_topics
        doc["cache"]["topic_extraction_version"] = TOPIC_EXTRACTION_VERSION

        t_write_start = time.perf_counter()
        v2_payload = {
            "file_id": file_id,
            "source_hash": source_hash,
            "topic_extraction_version": TOPIC_EXTRACTION_VERSION,
            "documentMetadata": metadata_dict,
            "topics": clean_fallback_topics,
            "generated_at": time.time()
        }
        try:
            with open(v2_cache_file, "w", encoding="utf-8") as f:
                json.dump(v2_payload, f, indent=2)
        except Exception as e:
            print(f"[TopicService] Error saving fallback v2 cache to disk: {e}")

        pdf_service.save_disk_cache(source_hash, file_id, doc)
        t_write = (time.perf_counter() - t_write_start) * 1000

        t_total = (time.perf_counter() - t_start) * 1000

        print(f"[TOPIC TIMING]")
        print(f"Gemini API: {t_gem:.1f} ms")
        print(f"Structural fallback: {t_fall:.1f} ms")
        print(f"Cache write: {t_write:.1f} ms")
        print(f"Total: {t_total:.1f} ms")

        return {"topics": clean_fallback_topics}

topic_service = TopicService()
