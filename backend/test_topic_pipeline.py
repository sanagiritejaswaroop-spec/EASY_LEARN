import os
import sys
import asyncio
import json
import time

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.pdf_service import (
    pdf_service, is_metadata_line, is_valid_educational_topic, extract_document_metadata
)
from app.services.topic_service import topic_service, TOPIC_EXTRACTION_VERSION

def test_metadata_and_validation():
    print("==================================================")
    print("RUNNING UNIT TEST 1: METADATA & TOPIC VALIDATION")
    print("==================================================")

    sample_cover_text = """
    PBR VITS AUTONOMOUS COLLEGE OF ENGINEERING
    DEPARTMENT OF TECH CSE-AI,AIML
    NATURAL LANGUAGE PROCESSING
    TEXT BOOK: James Allen, Natural Language Understanding, 2nd Edition, 2003, Pearson Education
    Course Instructor: CH
    
    1. Introduction to Natural Language Processing
    1.1 Natural Language
    1.2 Language Understanding
    1.3 Generic NLP System
    2. Syntax and Parsing
    2.1 Noun Phrases
    2.2 Verb Phrase
    """

    metadata = extract_document_metadata(sample_cover_text, "NLP-UNIT-I.pdf")
    print(f"[EXTRACTED METADATA]: {json.dumps(metadata, indent=2)}")

    test_cases = [
        ("TECH CSE-AI,AIML", False),
        ("NATURAL LANGUAGE PROCESSING", False),  # Subject title
        ("TEXT BOOK: James Allen", False),
        ("James Allen", False),
        ("Natural Language Understanding", False),  # Textbook title
        ("2nd Edition", False),
        ("2003", False),
        ("Pearson Education", False),
        ("Course Instructor: CH", False),
        ("PBR VITS", False),
        ("Natural Language", True),
        ("Noun Phrases", True),
        ("Language Understanding", True),
        ("Verb Phrase", True),
        ("Syntax and Parsing", True),
        ("Generic NLP System", True)
    ]

    all_passed = True
    for candidate, expected in test_cases:
        actual = is_valid_educational_topic(
            candidate,
            full_text=sample_cover_text,
            metadata_dict=metadata,
            subject_title=metadata.get("subject", "")
        )
        status = "PASSED" if actual == expected else "FAILED"
        if actual != expected:
            all_passed = False
        print(f"Candidate: '{candidate}' | Expected: {expected} | Actual: {actual} -> {status}")

    print(f"\nUNIT TEST 1 RESULT: {'SUCCESS' if all_passed else 'FAILURE'}\n")
    return all_passed

async def test_cache_and_persistence():
    print("==================================================")
    print("RUNNING UNIT TEST 2: CACHE HIT/MISS & PERSISTENCE")
    print("==================================================")

    test_pdf_path = os.path.join(os.path.dirname(__file__), "uploads", "test_sample.pdf")
    
    # Create a dummy PDF if none exists or update test_sample.pdf
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), """
    PBR VITS COLLEGE OF ENGINEERING
    DEPARTMENT OF TECH CSE-AI,AIML
    SUBJECT: NATURAL LANGUAGE PROCESSING
    TEXT BOOK: James Allen, Natural Language Understanding, 2nd Edition, 2003, Pearson Education
    Course Instructor: CH

    Unit I: Introduction to NLP
    1.1 Natural Language
    Natural language refers to the languages humans use for communication, such as English, Telugu, or Hindi. NLP focuses on enabling computers to process human text and spoken words effectively.

    1.2 Language Understanding
    Language understanding involves semantic analysis and context interpretation. It allows systems to extract meaning from syntactic structures and sentence representations.

    1.3 Generic NLP System
    A generic NLP system processes raw text through morphological, syntactic, and semantic phases to interpret linguistic intent.

    2. Syntactic Analysis
    2.1 Noun Phrases
    In each sentence, noun phrases describe entities or subjects performing actions within syntactic structures.

    2.2 Verb Phrase
    A verb phrase asserts actions or states attributed to noun phrases in formal grammar models.
    """)
    doc.save(test_pdf_path)
    doc.close()

    # Step 1: First Upload / Processing
    t1_start = time.perf_counter()
    doc_data = pdf_service.process_pdf(test_pdf_path, "NLP-UNIT-I.pdf")
    file_id = doc_data["file_id"]
    source_hash = doc_data["source_hash"]
    t1_end = (time.perf_counter() - t1_start) * 1000
    print(f"Step 1 Process PDF completed in {t1_end:.1f}ms. File ID: {file_id}")

    # Step 2: Extract Topics (First Call - MISS)
    topics_res_1 = await topic_service.get_important_topics(file_id)
    topic_names_1 = [t["name"] for t in topics_res_1.get("topics", [])]
    print(f"Step 2 (Call 1) Topics Extracted: {topic_names_1}")

    # Step 3: Extract Topics (Second Call - HIT)
    t2_start = time.perf_counter()
    topics_res_2 = await topic_service.get_important_topics(file_id)
    t2_end = (time.perf_counter() - t2_start) * 1000
    topic_names_2 = [t["name"] for t in topics_res_2.get("topics", [])]
    print(f"Step 3 (Call 2 - HIT) Topics loaded in {t2_end:.2f}ms: {topic_names_2}")

    # Verify identical topics
    topics_match = (topic_names_1 == topic_names_2)
    print(f"Topics Match between Call 1 & Call 2: {topics_match}")

    # Verify no metadata in topics
    bad_metadata = ["James Allen", "Pearson", "2nd Edition", "2003", "Course Instructor", "TECH CSE-AI,AIML", "PBR VITS"]
    has_metadata = any(bad in " ".join(topic_names_2) for bad in bad_metadata)
    print(f"Metadata detected in topics: {has_metadata} (Should be False)")

    # Step 4: Simulate Uvicorn Restart (Clear DOCUMENT_STORE in-memory dict)
    from app.services.pdf_service import DOCUMENT_STORE
    DOCUMENT_STORE.clear()
    print("Simulated Uvicorn Restart: DOCUMENT_STORE cleared.")

    # Step 5: Re-fetch Topics after restart (Persistent Disk Cache HIT)
    t3_start = time.perf_counter()
    topics_res_3 = await topic_service.get_important_topics(file_id)
    t3_end = (time.perf_counter() - t3_start) * 1000
    topic_names_3 = [t["name"] for t in topics_res_3.get("topics", [])]
    print(f"Step 5 (Post-Restart Disk HIT) Topics loaded in {t3_end:.2f}ms: {topic_names_3}")

    restart_match = (topic_names_1 == topic_names_3)
    print(f"Topics Match after simulated restart: {restart_match}")

    success = topics_match and (not has_metadata) and restart_match
    print(f"\nUNIT TEST 2 RESULT: {'SUCCESS' if success else 'FAILURE'}\n")
    return success

from app.services.pdf_service import is_valid_educational_content
from app.services.summary_service import summary_service, SUMMARY_EXTRACTION_VERSION
from app.services.chat_service import chat_service

async def test_summary_and_content_validation():
    print("==================================================")
    print("RUNNING UNIT TEST 3: SUMMARY & METADATA ISOLATION")
    print("==================================================")

    test_pdf_path = os.path.join(os.path.dirname(__file__), "uploads", "test_sample.pdf")
    doc_data = pdf_service.process_pdf(test_pdf_path, "NLP-UNIT-I.pdf")
    file_id = doc_data["file_id"]

    # Test 3A: Content Validation Function
    cover_metadata_junk = "TECH CSE-AI,AIML NATURAL LANGUAGE PROCESSING TEXT BOOK: James Allen, Natural Language Understanding, 2nd Edition, 2003, Pearson Education Course Instructor: CH"
    valid_edu_text = "Natural language refers to the languages humans use for communication, such as English, Telugu, or Hindi. NLP focuses on enabling computers to process human text."

    junk_res = is_valid_educational_content(cover_metadata_junk, metadata_dict=doc_data["documentMetadata"], subject_title="Natural Language Processing")
    valid_res = is_valid_educational_content(valid_edu_text, metadata_dict=doc_data["documentMetadata"], subject_title="Natural Language Processing")

    print(f"Content Validation (Junk Metadata): {junk_res} (Should be False)")
    print(f"Content Validation (Valid Educational): {valid_res} (Should be True)")

    val_success = (junk_res == False) and (valid_res == True)

    # Test 3B: Summary Generation (Call 1 - MISS or FALLBACK)
    t_sum1_start = time.perf_counter()
    summary_1 = await summary_service.get_summary(file_id)
    t_sum1_end = (time.perf_counter() - t_sum1_start) * 1000
    print(f"Summary Call 1 completed in {t_sum1_end:.1f}ms")

    overview_1 = summary_1.get("overview", "")
    concepts_1 = summary_1.get("main_concepts", [])

    print(f"Overview 1: '{overview_1}'")
    for c in concepts_1:
        print(f"  Concept {c.get('number')}: '{c.get('title')}' -> '{c.get('description')}'")

    bad_metadata = ["James Allen", "Pearson", "2nd Edition", "2003", "Course Instructor: CH", "TECH CSE-AI,AIML", "PBR VITS"]
    
    metadata_in_overview = any(bad in overview_1 for bad in bad_metadata)
    metadata_in_concepts = any(any(bad in c.get("description", "") or bad in c.get("title", "") for bad in bad_metadata) for c in concepts_1)

    print(f"Metadata in Summary Overview: {metadata_in_overview} (Should be False)")
    print(f"Metadata in Concept Descriptions: {metadata_in_concepts} (Should be False)")

    # Test 3C: Summary Cache HIT (Call 2)
    t_sum2_start = time.perf_counter()
    summary_2 = await summary_service.get_summary(file_id)
    t_sum2_end = (time.perf_counter() - t_sum2_start) * 1000
    print(f"Summary Call 2 (Cache HIT v2) completed in {t_sum2_end:.2f}ms")

    summary_hit_success = (t_sum2_end < 100) and (summary_1.get("main_concepts") == summary_2.get("main_concepts"))

    # Test 3D: General Chat Test ('hi')
    chat_res = await chat_service.process_chat(file_id, "hi", [])
    reply = chat_res.get("reply", "")
    has_svg = "svg" in reply.lower()
    print(f"Chat Response for 'hi': '{reply[:100]}...' | Contains 'svg': {has_svg} (Should be False)")

    chat_success = len(reply) > 0 and not has_svg

    test_3_pass = val_success and (not metadata_in_overview) and (not metadata_in_concepts) and summary_hit_success and chat_success
    print(f"\nUNIT TEST 3 RESULT: {'SUCCESS' if test_3_pass else 'FAILURE'}\n")
    return test_3_pass

if __name__ == "__main__":
    r1 = test_metadata_and_validation()
    r2 = asyncio.run(test_cache_and_persistence())
    r3 = asyncio.run(test_summary_and_content_validation())
    if r1 and r2 and r3:
        print("==================================================")
        print("ALL AUTOMATED TESTS PASSED SUCCESSFULLY!")
        print("==================================================")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED.")
        sys.exit(1)

