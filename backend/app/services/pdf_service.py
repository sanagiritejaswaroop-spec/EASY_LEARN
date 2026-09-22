import fitz  # PyMuPDF
import re
import os
import uuid
import hashlib
import json
import time
from typing import Dict, Any, List, Optional

# In-memory document session storage
DOCUMENT_STORE: Dict[str, Dict[str, Any]] = {}

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

METADATA_PATTERNS = [
    # College / Institution / Department / Campus / University / School / Accreditation
    r'\b(pbr|vits|autonomous|university|college|institute|campus|engineering|polytechnic|school|academy|accredited|nba|naac|jntu|iit|nit|bits|vignan|gitam|srm|vit)\b',
    r'\b(department|dept|faculty|branch|discipline)\b',
    # Degree / Branch / Year / Semester / Section / Regulations
    r'\b(b\.?tech|m\.?tech|b\.?e\.|m\.?e\.|b\.?sc|m\.?sc|mba|mca|diploma|tech|btech|mtech)\b',
    r'\b(cse|aiml|ece|eee|iot|csd|csm|tech\s+cse-ai,aiml|branch\s*:\s*(it|ai|ce|me)|dept\s*:\s*(it|ai|ce|me))\b',
    r'\b(i|ii|iii|iv|v|vi|vii|viii)\s*(st|nd|rd|th)?\s*(year|b\.?tech|sem|semester)?\b',
    r'\b(semester|sem|sec|section|academic\s*year|regulation|r\d{2}|curriculum|scheme)\b',
    # Author / Instructor / Faculty / Lecturer / Publisher / Copyright / Edition / Years
    r'\b(author|authors|instructor|course\s*instructor|faculty|lecturer|prepared\s*by|written\s*by|compiled\s*by|edited\s*by|prof|professor|dr|mr|mrs|ms|hod|ch)\b',
    r'\b(text\s*book|textbook|reference\s*book|suggested\s*reading)\b',
    r'\b(pearson|mcgraw|hill|wiley|oxford|cambridge|springer|prentice|hall|pub|publication|publisher|edition|\d+(st|nd|rd|th)?\s*edition|copyright|rights\s*reserved)\b',
    r'\b(james|allen|jurafsky|martin|manning|schutze|norvig|russell|tanenbaum|galvin|silberschatz|stallings|hopcroft|ullman|cormen)\b',
    r'\b(19|20)\d{2}\b',  # Publication years e.g., 2003, 2018
    # Exam document noise / Headers / Footers / Identifiers
    r'\b(syllabus|blueprint|question\s*bank|lecture\s*notes|lab\s*manual|study\s*material|model\s*paper|mid\s*exam|end\s*exam|internal|external|mid-\d)\b',
    r'\b(page\s*\d+|max\s*marks|time\s*:\s*[\d\w\s]+|code\s*:\s*\w+|unit\s*-\s*[ivx0-9]+|subject\s*code)\b',
    r'\b(hall\s*ticket|roll\s*no|reg(registration)?\s*no|student\s*id|ht\s*no)\b',
]

def extract_document_metadata(full_text: str, filename: str) -> Dict[str, Any]:
    """
    Extract structured document metadata from PDF cover page & headers.
    Distinguishes institution, degree, textbook, author, instructor, etc.
    """
    first_two_pages = "\n".join(full_text.splitlines()[:120])
    
    metadata = {
        "institution": None,
        "department": None,
        "degree": None,
        "year": None,
        "subject": None,
        "course_code": None,
        "textbook": None,
        "author": None,
        "publisher": None,
        "edition": None,
        "instructor": None
    }

    # 1. Instructor
    inst_match = re.search(r'(?:course\s*instructor|instructor|prepared\s*by|faculty)\s*:\s*([^\n,;]+)', first_two_pages, re.IGNORECASE)
    if inst_match:
        metadata["instructor"] = inst_match.group(1).strip()

    # 2. Textbook & Author & Publisher & Edition
    tb_match = re.search(r'(?:text\s*book|textbook)\s*:\s*([^\n]+)', first_two_pages, re.IGNORECASE)
    if tb_match:
        tb_line = tb_match.group(1).strip()
        
        author_m = re.search(r'\b(James\s+Allen|Jurafsky|Martin|Manning|Schutze|Norvig|Russell|Tanenbaum)\b', tb_line, re.IGNORECASE)
        if author_m:
            metadata["author"] = author_m.group(1).strip()

        pub_m = re.search(r'\b(Pearson|McGraw\s*Hill|Wiley|Oxford|Cambridge|Springer|Prentice\s*Hall)\b', tb_line, re.IGNORECASE)
        if pub_m:
            metadata["publisher"] = pub_m.group(1).strip()

        ed_m = re.search(r'\b(\d+(?:st|nd|rd|th)?\s*Edition)\b', tb_line, re.IGNORECASE)
        if ed_m:
            metadata["edition"] = ed_m.group(1).strip()

        yr_m = re.search(r'\b((?:19|20)\d{2})\b', tb_line)
        if yr_m:
            metadata["year"] = yr_m.group(1).strip()

        # Extract title part of textbook line
        title_part = re.sub(r'^(?:James\s+Allen|Jurafsky|Martin|Manning|Schutze|Norvig|Russell|Tanenbaum)[,\s]*', '', tb_line, flags=re.IGNORECASE)
        title_part = re.sub(r'[\s,]*\d+(?:st|nd|rd|th)?\s*Edition.*$', '', title_part, flags=re.IGNORECASE).strip()
        if title_part:
            metadata["textbook"] = title_part

    # 3. Department / Branch / Degree
    dept_match = re.search(r'\b((?:TECH\s+)?CSE[-A-Z0-9,]*|AIML|AI|DS|ECE|EEE|ME|CIVIL)\b', first_two_pages, re.IGNORECASE)
    if dept_match:
        metadata["department"] = dept_match.group(1).strip()

    deg_match = re.search(r'\b((?:I|II|III|IV)\s*B\.?TECH)\b', first_two_pages, re.IGNORECASE)
    if deg_match:
        metadata["degree"] = deg_match.group(1).strip()

    # 4. Institution
    inst_org = re.search(r'\b(PBR\s+VITS|JNTU|IIT|NIT|BITS|University|College|Institute)\b', first_two_pages, re.IGNORECASE)
    if inst_org:
        metadata["institution"] = inst_org.group(1).strip()

    # 5. Subject title
    subj_match = re.search(r'^(NATURAL\s+LANGUAGE\s+PROCESSING|[A-Z\s]{4,40})$', first_two_pages, re.MULTILINE)
    if subj_match and len(subj_match.group(1).strip()) > 4:
        cand_subj = subj_match.group(1).strip().title()
        inst_val = metadata.get("institution", "")
        if inst_val and inst_val.lower() in cand_subj.lower():
            clean_fn = re.sub(r'\.pdf$', '', filename, flags=re.IGNORECASE)
            clean_fn = re.sub(r'[_\-]+', ' ', clean_fn).strip().title()
            metadata["subject"] = clean_fn
        else:
            metadata["subject"] = cand_subj
    else:
        clean_fn = re.sub(r'\.pdf$', '', filename, flags=re.IGNORECASE)
        clean_fn = re.sub(r'[_\-]+', ' ', clean_fn).strip().title()
        metadata["subject"] = clean_fn

    return metadata

def is_metadata_line(line: str, subject_title: str = "", metadata_dict: Optional[Dict[str, Any]] = None) -> bool:
    s = line.strip()
    if not s or len(s) < 3:
        return True
    if len(s) > 150:
        return False  # Educational sentences and paragraphs are >150 chars, NOT single metadata header lines

    s_lower = s.lower()

    if subject_title and s_lower == subject_title.strip().lower():
        return True

    # Match metadata patterns
    for pat in METADATA_PATTERNS:
        if re.search(pat, s, re.IGNORECASE):
            return True

    # Check explicit extracted metadata values
    if metadata_dict:
        # Check author, instructor, institution, degree, edition, department
        explicit_keys = ["author", "instructor", "institution", "degree", "edition", "department", "publisher"]
        for k in explicit_keys:
            val = metadata_dict.get(k)
            if val and isinstance(val, str) and len(val) >= 3:
                val_lower = val.lower().strip()
                if val_lower == s_lower or (len(val_lower) > 4 and val_lower in s_lower):
                    return True

    # Exclude URLs, emails, phone numbers, pure numbers, code fields
    if re.search(r'(@|http|www\.|\.com|\.edu|\.in|\b\d{10}\b|\bhall\s*ticket\b|\broll\s*no\b|\bcode\b:\s*\w+)', s, re.IGNORECASE):
        return True

    return False

def sanitize_text(text: str) -> str:
    """
    Remove accidental UI/text artifacts (e.g., 'svg', 'svgCore', raw HTML tags, '###' markdown headers).
    """
    if not text or not isinstance(text, str):
        return ""
    
    # Remove HTML / SVG tags
    s = re.sub(r'<svg[^>]*>.*?</svg>', '', text, flags=re.DOTALL | re.IGNORECASE)
    s = re.sub(r'<[^>]+>', '', s)
    # Remove svgCore or raw 'svg' token standalone
    s = re.sub(r'\b(svgCore|svg)\b', '', s, flags=re.IGNORECASE)
    # Normalize excessive hashtags or markdown block symbols if unwanted
    s = re.sub(r'^\s*#{1,6}\s*', '', s)
    s = re.sub(r'\s{2,}', ' ', s).strip()
    return s

def is_valid_educational_content(text: str, metadata_dict: Optional[Dict[str, Any]] = None, subject_title: str = "") -> bool:
    """
    Validates whether a paragraph or description contains genuine educational content.
    Rejects text that consists primarily of document cover metadata, textbook citation headers,
    author names, institutional info, instructor info, or document layout noise.
    """
    if not text or not isinstance(text, str):
        return False

    s = sanitize_text(text).strip()
    if len(s) < 15:
        return False

    s_lower = s.lower()

    # Rejection pattern matching for strong metadata lines / citations
    strong_metadata_patterns = [
        r'\b(tech\s+cse-ai,aiml|cse-ai|aiml|b\.?tech|m\.?tech)\b',
        r'\b(james\s+allen|jurafsky|martin|manning|schutze|norvig|russell|tanenbaum)\b',
        r'\b(pearson|mcgraw|hill|wiley|oxford|cambridge|springer|prentice\s+hall)\b',
        r'\b(course\s*instructor|instructor\s*:\s*\w+|prepared\s*by|written\s*by|compiled\s*by)\b',
        r'\b(text\s*book|textbook|reference\s*book|suggested\s*reading)\b',
        r'\b(\d+(?:st|nd|rd|th)?\s*edition|copyright|all\s*rights\s*reserved|isbn)\b',
        r'\b(hall\s*ticket|roll\s*no|reg(?:istration)?\s*no|ht\s*no|code\s*:\s*\w+)\b',
        r'\b(page\s*\d+|max\s*marks|time\s*:\s*[\d\w\s]+)\b'
    ]

    for pat in strong_metadata_patterns:
        if re.search(pat, s_lower, re.IGNORECASE):
            return False

    # Check against explicit document metadata fields
    if metadata_dict:
        author = metadata_dict.get("author")
        if author and len(author) >= 3 and re.search(rf'\b{re.escape(author)}\b', s, re.IGNORECASE):
            return False
        instructor = metadata_dict.get("instructor")
        if instructor and len(instructor) >= 2:
            if re.search(rf'\b(instructor|faculty|prepared|written)\s*:\s*{re.escape(instructor)}\b', s, re.IGNORECASE):
                return False
            if len(instructor) >= 4 and re.search(rf'\b{re.escape(instructor)}\b', s, re.IGNORECASE):
                return False
        publisher = metadata_dict.get("publisher")
        if publisher and len(publisher) >= 3 and re.search(rf'\b{re.escape(publisher)}\b', s, re.IGNORECASE):
            return False
        textbook = metadata_dict.get("textbook")
        if textbook and len(textbook) >= 4 and textbook.lower() == s_lower:
            return False
        dept = metadata_dict.get("department")
        if dept and len(dept) >= 4 and re.search(rf'\b{re.escape(dept)}\b', s, re.IGNORECASE):
            return False

    # Check line ratio: if > 30% of non-empty lines are metadata lines
    lines = [l.strip() for l in s.splitlines() if l.strip()]
    if lines:
        meta_line_count = sum(1 for l in lines if is_metadata_line(l, subject_title=subject_title, metadata_dict=metadata_dict))
        if meta_line_count / len(lines) > 0.3:
            return False

    # Must contain alphabetic content with meaningful educational words
    words = [w for w in re.sub(r'[^a-zA-Z]', ' ', s).split() if len(w) >= 3]
    if len(words) < 3:
        return False

    return True

def is_valid_educational_topic(candidate: str, full_text: str = "", metadata_dict: Optional[Dict[str, Any]] = None, subject_title: str = "") -> bool:
    """
    Semantic Educational Topic Validation.
    A candidate is valid ONLY if it represents a concept/topic a student would study.
    Rejects document ownership, author names, institution info, textbook titles, etc.
    """
    if not candidate or not isinstance(candidate, str):
        return False

    cand = sanitize_text(candidate).strip()
    # Clean leading section numbers e.g. "1.1 Natural Language" -> "Natural Language"
    cand = re.sub(r'^(?:chapter|module|unit|section|\d+\.|\d+\.\d+|\d+)\s*', '', cand, flags=re.IGNORECASE).strip()

    if len(cand) < 3 or len(cand) > 75:
        return False

    cand_lower = cand.lower()

    # Reject if matches metadata rules
    if is_metadata_line(cand, subject_title=subject_title, metadata_dict=metadata_dict):
        return False

    # Explicit rejection patterns
    reject_patterns = [
        r'\b(james\s+allen|pearson|education|edition|course\s*instructor|instructor|tech\s+cse|b\.?tech|cse|aiml|pbr|vits|jntu)\b',
        r'^\d+$', r'^\d+(st|nd|rd|th)$', r'^(chapter|unit|module|section|\d+\.|\d+\.\d+)$',
        r'\b(copyright|all\s*rights\s*reserved|publisher|publication|isbn|page\s*\d+)\b'
    ]
    for pat in reject_patterns:
        if re.search(pat, cand, re.IGNORECASE):
            return False

    if subject_title and (cand_lower == subject_title.lower() or (subject_title.lower() in cand_lower and len(cand_lower) <= len(subject_title.lower()) + 4)):
        return False

    if metadata_dict:
        tb = metadata_dict.get("textbook", "")
        if tb and cand_lower == tb.lower():
            return False
        author = metadata_dict.get("author", "")
        if author and (cand_lower == author.lower() or author.lower() in cand_lower):
            return False
        instructor = metadata_dict.get("instructor", "")
        if instructor and (cand_lower == instructor.lower() or f"instructor: {instructor}".lower() in cand_lower):
            return False

    # Positive signal check: must contain at least 1 alphabetic word with >=3 characters
    alpha_words = [w for w in re.sub(r'[^a-zA-Z]', ' ', cand).split() if len(w) >= 3]
    if not alpha_words:
        return False

    non_topics = {"unit", "chapter", "module", "section", "book", "text", "page", "note", "notes", "paper", "exam", "test", "quiz", "code", "dept"}
    if len(alpha_words) == 1 and alpha_words[0].lower() in non_topics:
        return False

    return True

class PDFService:
    @staticmethod
    def get_file_hash(file_path: str) -> str:
        """Compute SHA-256 hash of file content for persistent caching."""
        sha = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                sha.update(chunk)
        return sha.hexdigest()

    @staticmethod
    def save_disk_cache(source_hash: str, file_id: str, session_data: Dict[str, Any]):
        """Save document session and cache data to persistent disk storage."""
        try:
            cache_file = os.path.join(CACHE_DIR, f"{file_id}.json")
            hash_file = os.path.join(CACHE_DIR, f"{source_hash}_session.json")
            
            serializable = {
                "file_id": session_data.get("file_id"),
                "source_hash": source_hash,
                "filename": session_data.get("filename"),
                "subject_title": session_data.get("subject_title"),
                "file_path": session_data.get("file_path"),
                "file_size_bytes": session_data.get("file_size_bytes"),
                "file_size_formatted": session_data.get("file_size_formatted"),
                "total_pages": session_data.get("total_pages"),
                "total_words": session_data.get("total_words"),
                "estimated_chapters": session_data.get("estimated_chapters"),
                "documentMetadata": session_data.get("documentMetadata", {}),
                "headings": session_data.get("headings", []),
                "concepts": session_data.get("concepts", []),
                "full_text": session_data.get("full_text", ""),
                "page_texts": session_data.get("page_texts", []),
                "cache": session_data.get("cache", {})
            }

            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(serializable, f, indent=2)

            with open(hash_file, "w", encoding="utf-8") as f:
                json.dump(serializable, f, indent=2)

        except Exception as e:
            print(f"[PDFService] Error saving disk cache: {e}")

    @staticmethod
    def load_disk_cache(file_id_or_hash: str) -> Optional[Dict[str, Any]]:
        """Load document session data from persistent disk storage."""
        try:
            cache_file = os.path.join(CACHE_DIR, f"{file_id_or_hash}.json")
            if os.path.exists(cache_file):
                with open(cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)

            hash_file = os.path.join(CACHE_DIR, f"{file_id_or_hash}_session.json")
            if os.path.exists(hash_file):
                with open(hash_file, "r", encoding="utf-8") as f:
                    return json.load(f)

        except Exception as e:
            print(f"[PDFService] Error loading disk cache for {file_id_or_hash}: {e}")
        return None

    @staticmethod
    def process_pdf(file_path: str, original_filename: str) -> Dict[str, Any]:
        """Extract text from PDF using PyMuPDF and calculate document statistics."""
        t_start = time.perf_counter()

        if not os.path.exists(file_path):
            raise FileNotFoundError("Uploaded file not found on server.")

        source_hash = PDFService.get_file_hash(file_path)

        existing_cached = PDFService.load_disk_cache(source_hash)
        if existing_cached and existing_cached.get("cache", {}).get("topic_extraction_version") == "v2":
            file_id = existing_cached["file_id"]
            DOCUMENT_STORE[file_id] = existing_cached
            
            from app.services.rag_service import rag_service
            if file_id not in rag_service.indexes:
                rag_service.build_index(file_id, existing_cached.get("page_texts", []))

            t_total = (time.perf_counter() - t_start) * 1000
            print(f"[CACHE] Topics v2 HIT — loaded from persistent disk cache in {t_total:.1f}ms")
            print(f"[PDF TIMING] Cache HIT total: {t_total:.1f}ms")
            return existing_cached

        print(f"[CACHE] Topics v2 MISS — processing PDF '{original_filename}'")
        
        t_ext_start = time.perf_counter()
        doc = fitz.open(file_path)
        total_pages = len(doc)
        
        full_text = ""
        page_texts: List[Dict[str, Any]] = []
        raw_headings: List[str] = []

        for page_num in range(total_pages):
            page = doc.load_page(page_num)
            text = page.get_text("text") or ""
            cleaned_page_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
            full_text += cleaned_page_text + "\n"
            
            lines = [l.strip() for l in cleaned_page_text.splitlines() if l.strip()]

            for l in lines:
                is_numbered_heading = bool(re.match(r'^(?:chapter|module|unit|section|\d+\.|\d+\.\d+|\d+)\s+([a-zA-Z].*)', l, re.IGNORECASE))
                if is_numbered_heading:
                    clean_l = re.sub(r'^(?:chapter|module|unit|section|\d+\.|\d+\.\d+|\d+)\s*', '', l, flags=re.IGNORECASE).strip()
                    if len(clean_l) >= 4 and clean_l not in raw_headings:
                        raw_headings.append(clean_l)

            page_texts.append({
                "page": page_num + 1,
                "text": cleaned_page_text
            })

        doc.close()
        t_ext = (time.perf_counter() - t_ext_start) * 1000

        t_meta_start = time.perf_counter()
        doc_metadata = extract_document_metadata(full_text, original_filename)
        detected_subject = doc_metadata.get("subject") or original_filename.replace(".pdf", "").title()
        t_meta = (time.perf_counter() - t_meta_start) * 1000

        clean_text = re.sub(r'\n{3,}', '\n\n', full_text).strip()
        words = clean_text.split()
        total_words = len(words)
        
        file_size_bytes = os.path.getsize(file_path)
        file_size_formatted = f"{file_size_bytes / (1024 * 1024):.1f} MB" if file_size_bytes >= 1024 * 1024 else f"{file_size_bytes / 1024:.1f} KB"
        
        clean_headings = []
        for h in raw_headings:
            clean_h = re.sub(r'^(?:chapter|module|unit|section|\d+\.|\d+\.\d+|\d+)\s*', '', h, flags=re.IGNORECASE).strip()
            if is_valid_educational_topic(clean_h, full_text=clean_text, metadata_dict=doc_metadata, subject_title=detected_subject):
                stem = re.sub(r's$', '', clean_h.lower())
                if not any(re.sub(r's$', '', existing.lower()) == stem for existing in clean_headings):
                    clean_headings.append(clean_h)

        estimated_chapters = max(1, len(clean_headings) if len(clean_headings) > 0 else max(1, total_pages // 6))

        file_id = str(uuid.uuid4())[:8]

        session_data = {
            "file_id": file_id,
            "source_hash": source_hash,
            "filename": original_filename,
            "subject_title": detected_subject,
            "file_path": file_path,
            "file_size_bytes": file_size_bytes,
            "file_size_formatted": file_size_formatted,
            "total_pages": total_pages,
            "total_words": total_words,
            "estimated_chapters": estimated_chapters,
            "documentMetadata": doc_metadata,
            "headings": clean_headings,
            "full_text": clean_text,
            "page_texts": page_texts,
            "cache": {}
        }

        from app.services.rag_service import rag_service
        rag_service.build_index(file_id, page_texts)

        extracted_concepts: List[str] = []
        for h in clean_headings:
            if h not in extracted_concepts:
                extracted_concepts.append(h)

        if file_id in rag_service.indexes:
            idx_data = rag_service.indexes[file_id]
            vectorizer = idx_data.get("vectorizer")
            matrix = idx_data.get("matrix")
            if vectorizer and matrix is not None:
                try:
                    feature_names = vectorizer.get_feature_names_out()
                    mean_scores = matrix.mean(axis=0).A1
                    top_indices = mean_scores.argsort()[::-1]
                    for idx in top_indices:
                        feat = str(feature_names[idx]).title()
                        feat_clean = re.sub(r'^(?:chapter|module|unit|section|\d+\.|\d+\.\d+|\d+)\s*', '', feat, flags=re.IGNORECASE).strip()
                        if is_valid_educational_topic(feat_clean, full_text=clean_text, metadata_dict=doc_metadata, subject_title=detected_subject):
                            if feat_clean not in extracted_concepts:
                                extracted_concepts.append(feat_clean)
                        if len(extracted_concepts) >= 12:
                            break
                except Exception:
                    pass

        final_concepts: List[str] = []
        for c in extracted_concepts:
            c_clean = re.sub(r'^(?:chapter|module|unit|section|\d+\.|\d+\.\d+|\d+)\s*', '', c, flags=re.IGNORECASE).strip()
            if is_valid_educational_topic(c_clean, full_text=clean_text, metadata_dict=doc_metadata, subject_title=detected_subject):
                stem = re.sub(r's$', '', c_clean.lower())
                if not any(re.sub(r's$', '', existing.lower()) == stem for existing in final_concepts):
                    final_concepts.append(c_clean)
            if len(final_concepts) >= 10:
                break

        session_data["concepts"] = final_concepts
        DOCUMENT_STORE[file_id] = session_data

        t_write_start = time.perf_counter()
        PDFService.save_disk_cache(source_hash, file_id, session_data)
        t_write = (time.perf_counter() - t_write_start) * 1000

        t_total = (time.perf_counter() - t_start) * 1000

        print(f"[PDF TIMING]")
        print(f"Extraction: {t_ext:.1f} ms")
        print(f"Metadata detection: {t_meta:.1f} ms")
        print(f"Cache write: {t_write:.1f} ms")
        print(f"Total: {t_total:.1f} ms")

        return session_data

    @staticmethod
    def get_document(file_id: str) -> Dict[str, Any]:
        doc = DOCUMENT_STORE.get(file_id)
        if not doc:
            cached = PDFService.load_disk_cache(file_id)
            if cached:
                DOCUMENT_STORE[file_id] = cached
                from app.services.rag_service import rag_service
                if file_id not in rag_service.indexes:
                    rag_service.build_index(file_id, cached.get("page_texts", []))
                return cached
            raise KeyError(f"Document with ID {file_id} not found in session memory or disk cache.")
        return doc

    @staticmethod
    def retrieve_relevant_chunks(file_id: str, query: str = "", max_chars: int = 3500) -> str:
        """RAG Document Chunk Retrieval: divides PDF into paragraphs and selects the most relevant context."""
        doc = PDFService.get_document(file_id)
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
