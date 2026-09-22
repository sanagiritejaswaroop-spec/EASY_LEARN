import re
import os
import json
import time
from typing import Dict, Any, List
from app.services.pdf_service import (
    pdf_service,
    is_valid_educational_topic,
    is_valid_educational_content,
    is_metadata_line,
    sanitize_text,
    CACHE_DIR
)
from app.services.ai_service import ai_service
from app.services.topic_service import topic_service

SUMMARY_EXTRACTION_VERSION = "v2"

class SummaryService:
    async def get_summary(self, file_id: str) -> Dict[str, Any]:
        t_start = time.perf_counter()
        doc = pdf_service.get_document(file_id)
        source_hash = doc.get("source_hash", file_id)
        metadata_dict = doc.get("documentMetadata", {})
        subject_title = doc.get("subject_title", "")
        full_text = doc.get("full_text", "")
        filename = doc.get("filename", "")

        v2_summary_cache_file = os.path.join(CACHE_DIR, f"{source_hash}_v2_summary.json")

        # 1. Check in-memory session cache & persistent disk cache for valid v2 summary
        cached_summary = doc.get("cache", {}).get("summary")
        cache_ver = doc.get("cache", {}).get("summary_extraction_version")

        if cached_summary and cache_ver == SUMMARY_EXTRACTION_VERSION:
            t_total = (time.perf_counter() - t_start) * 1000
            print(f"[CACHE] Summary HIT (v2) — returning cached summary ({t_total:.1f}ms)")
            return cached_summary

        # Check persistent disk cache file
        if os.path.exists(v2_summary_cache_file):
            try:
                with open(v2_summary_cache_file, "r", encoding="utf-8") as f:
                    disk_v2 = json.load(f)
                if disk_v2.get("summary_extraction_version") == SUMMARY_EXTRACTION_VERSION and "summary" in disk_v2:
                    summary_data = disk_v2["summary"]
                    # Quick validation of cached summary concepts
                    valid_concepts = [
                        c for c in summary_data.get("main_concepts", [])
                        if is_valid_educational_topic(c.get("title", ""), full_text=full_text, metadata_dict=metadata_dict, subject_title=subject_title)
                        and is_valid_educational_content(c.get("description", ""), metadata_dict=metadata_dict, subject_title=subject_title)
                    ]
                    if valid_concepts:
                        summary_data["main_concepts"] = valid_concepts
                        doc["cache"]["summary"] = summary_data
                        doc["cache"]["summary_extraction_version"] = SUMMARY_EXTRACTION_VERSION
                        pdf_service.save_disk_cache(source_hash, file_id, doc)
                        
                        t_total = (time.perf_counter() - t_start) * 1000
                        print(f"[CACHE] Summary HIT (disk v2) — loaded in {t_total:.1f}ms")
                        return summary_data
            except Exception as e:
                print(f"[SummaryService] Error reading disk v2 summary cache: {e}")

        print(f"[CACHE] Summary MISS — generating validated v2 summary for file {file_id}")
        t_gen_start = time.perf_counter()

        # 2. Consume Canonical v2 Topics
        topics_res = await topic_service.get_important_topics(file_id)
        canonical_topics = topics_res.get("topics", [])
        
        valid_canonical_topics = [
            t for t in canonical_topics
            if is_valid_educational_topic(t.get("name", ""), full_text=full_text, metadata_dict=metadata_dict, subject_title=subject_title)
        ]

        # 3. Retrieve relevant educational chunks for topics (excluding metadata lines)
        topic_names = [t["name"] for t in valid_canonical_topics]
        query_str = " ".join(topic_names[:6])
        raw_chunks_str = pdf_service.retrieve_relevant_chunks(file_id, query=query_str, max_chars=3500)
        
        # Filter raw chunks line-by-line to strip cover metadata
        clean_lines = [line for line in raw_chunks_str.splitlines() if not is_metadata_line(line, subject_title=subject_title, metadata_dict=metadata_dict)]
        context_text = "\n".join(clean_lines)[:3500]

        excl_parts = [subject_title]
        for k, v in metadata_dict.items():
            if v and isinstance(v, str):
                excl_parts.append(v)
        exclusion_list_str = ", ".join(list(set(excl_parts)))

        topic_names_str = ", ".join(topic_names) if topic_names else "Core Domain Concepts"

        system_prompt = f"""You are EASY-LEARN, an expert AI Study Assistant.
CRITICAL MANDATE:
Generate an Executive Overview and Core Conceptual Pillars based ONLY on valid educational content from the document context.
The canonical topics for this document are: [{topic_names_str}].

Use ONLY educational content for the Executive Overview and Core Conceptual Pillars.
Never include or repeat document metadata from this exclusion list: [{exclusion_list_str}].
DO NOT include college/institution names, degree/branch ('III B.TECH', 'CSE-AI,AIML'), author names ('James Allen'), instructor names ('CH'), textbook titles ('Natural Language Understanding'), edition ('2nd Edition'), publication year ('2003'), course codes, ISBNs, page headers/footers, or URLs.
A topic title alone is not evidence for a description. Return clean educational content only."""

        prompt = f"""
Analyze the following document context sampled from '{filename}' (Subject: '{subject_title}') and provide a structured JSON summary:
1. 'overview': A concise 3-4 sentence academic overview explaining what the PDF teaches (no metadata, no generic filler like 'structured across N modules').
2. 'main_concepts': Array of concept objects corresponding to these canonical topics: [{topic_names_str}].
   Each concept MUST have:
   - 'number': ("01", "02", "03", etc.)
   - 'title': exact topic title from the list
   - 'description': genuine educational passage/explanation from the document explaining the topic (no cover-page metadata!).
3. 'key_takeaways': Array of 4 high-yield educational bullet points.

Document Educational Context:
{context_text}
"""
        
        ai_res = await ai_service.generate_json(prompt, system_prompt=system_prompt)

        # 4. Post-generation Validation & Cleaning
        if ai_res and "overview" in ai_res and "main_concepts" in ai_res:
            overview_candidate = sanitize_text(ai_res.get("overview", ""))
            if not is_valid_educational_content(overview_candidate, metadata_dict=metadata_dict, subject_title=subject_title) or "structured across" in overview_candidate.lower():
                overview_candidate = (
                    f"This document introduces foundational concepts in {subject_title}, focusing on "
                    f"{', '.join(topic_names[:4]) if topic_names else 'core principles'}. "
                    f"It details essential definitions, theoretical principles, and operational mechanisms."
                )

            validated_concepts = []
            for idx, c in enumerate(ai_res.get("main_concepts", [])):
                title = sanitize_text(c.get("title", ""))
                desc = sanitize_text(c.get("description", ""))

                if not is_valid_educational_topic(title, full_text=full_text, metadata_dict=metadata_dict, subject_title=subject_title):
                    continue

                # Validate description
                if not is_valid_educational_content(desc, metadata_dict=metadata_dict, subject_title=subject_title):
                    # Attempt retrieval of a valid educational sentence from RAG chunks
                    chunks = pdf_service.retrieve_relevant_chunks(file_id, query=title, max_chars=1200)
                    sentences = [
                        s.strip() for s in re.split(r'[.!?]', chunks)
                        if len(s.strip()) > 25 and is_valid_educational_content(s.strip(), metadata_dict=metadata_dict, subject_title=subject_title)
                    ]
                    if sentences:
                        desc = sentences[0] + "."
                    else:
                        # Check matching canonical topic detailed_summary / short_explanation
                        matching_top = next((t for t in valid_canonical_topics if t.get("name", "").lower() == title.lower()), None)
                        if matching_top:
                            can_desc = matching_top.get("short_explanation") or matching_top.get("quick_summary", "")
                            if is_valid_educational_content(can_desc, metadata_dict=metadata_dict, subject_title=subject_title):
                                desc = can_desc
                            else:
                                desc = f"{title} represents a core conceptual pillar within {subject_title}."
                        else:
                            desc = f"{title} represents a core conceptual pillar within {subject_title}."

                validated_concepts.append({
                    "number": f"{idx+1:02d}",
                    "title": title,
                    "description": desc
                })

            if len(validated_concepts) >= 2:
                final_res = {
                    "overview": overview_candidate,
                    "main_concepts": validated_concepts,
                    "key_takeaways": [sanitize_text(t) for t in ai_res.get("key_takeaways", []) if is_valid_educational_content(t, metadata_dict=metadata_dict, subject_title=subject_title)][:4] or [
                        f"Core principles and theoretical mechanics of {topic_names[0] if topic_names else subject_title}.",
                        "Functional definitions and systematic framework operations.",
                        "Analytical patterns and domain execution models.",
                        "Key concepts relevant for academic review and assessment."
                    ]
                }

                doc["cache"]["summary"] = final_res
                doc["cache"]["summary_extraction_version"] = SUMMARY_EXTRACTION_VERSION
                
                v2_payload = {
                    "file_id": file_id,
                    "source_hash": source_hash,
                    "summary_extraction_version": SUMMARY_EXTRACTION_VERSION,
                    "summary": final_res,
                    "generated_at": time.time()
                }
                try:
                    with open(v2_summary_cache_file, "w", encoding="utf-8") as f:
                        json.dump(v2_payload, f, indent=2)
                except Exception as e:
                    print(f"[SummaryService] Error writing summary v2 disk cache: {e}")

                pdf_service.save_disk_cache(source_hash, file_id, doc)
                
                t_gen = (time.perf_counter() - t_gen_start) * 1000
                t_total = (time.perf_counter() - t_start) * 1000
                print(f"[PDF TIMING] Summary generation (v2 Gemini): {t_gen:.1f}ms | Total: {t_total:.1f}ms")
                return final_res

        # 5. Deterministic Educational Fallback (Gemini Unavailable / Retry Exhausted)
        print(f"[SummaryService] Using validated educational fallback engine for file {file_id}")
        
        fallback_concepts = []
        for idx, t in enumerate(valid_canonical_topics[:6]):
            t_name = t.get("name", "")
            chunks = pdf_service.retrieve_relevant_chunks(file_id, query=t_name, max_chars=1200)
            sentences = [
                s.strip() for s in re.split(r'[.!?]', chunks)
                if len(s.strip()) > 25 and is_valid_educational_content(s.strip(), metadata_dict=metadata_dict, subject_title=subject_title)
            ]
            desc = sentences[0] + "." if sentences else t.get("short_explanation", f"Core educational concept explaining {t_name.lower()} in {subject_title}.")
            
            fallback_concepts.append({
                "number": f"{idx+1:02d}",
                "title": t_name,
                "description": desc
            })

        fallback_overview = (
            f"This study document introduces foundational concepts in {subject_title}, detailing key mechanisms "
            f"and theoretical principles across {', '.join([c['title'] for c in fallback_concepts[:3]])}."
        )

        res = {
            "overview": fallback_overview,
            "main_concepts": fallback_concepts,
            "key_takeaways": [
                f"Foundational grasp of {fallback_concepts[0]['title'] if fallback_concepts else subject_title} and domain concepts.",
                "Understanding operational mechanics, definitions, and core theoretical principles.",
                "Key structural components and systematic execution workflows.",
                "High-yield topics for exam preparation and conceptual mastery."
            ]
        }

        doc["cache"]["summary"] = res
        doc["cache"]["summary_extraction_version"] = SUMMARY_EXTRACTION_VERSION
        
        v2_payload = {
            "file_id": file_id,
            "source_hash": source_hash,
            "summary_extraction_version": SUMMARY_EXTRACTION_VERSION,
            "summary": res,
            "generated_at": time.time()
        }
        try:
            with open(v2_summary_cache_file, "w", encoding="utf-8") as f:
                json.dump(v2_payload, f, indent=2)
        except Exception as e:
            print(f"[SummaryService] Error writing fallback v2 summary cache: {e}")

        pdf_service.save_disk_cache(source_hash, file_id, doc)

        t_gen = (time.perf_counter() - t_gen_start) * 1000
        t_total = (time.perf_counter() - t_start) * 1000
        print(f"[PDF TIMING] Summary generation (v2 Fallback): {t_gen:.1f}ms | Total: {t_total:.1f}ms")

        return res

summary_service = SummaryService()

