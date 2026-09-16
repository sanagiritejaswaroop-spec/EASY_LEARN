import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.config import settings
from app.services.pdf_service import pdf_service
from app.models.schemas import UploadResponse

router = APIRouter(prefix="/api", tags=["pdf"])

@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    # File validation
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Please upload a valid PDF file (.pdf)."
        )

    # Read content & check file size
    contents = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB} MB."
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty. Please select a valid PDF containing study text."
        )

    temp_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    try:
        with open(temp_path, "wb") as f:
            f.write(contents)

        doc_data = pdf_service.process_pdf(temp_path, file.filename)
        
        if doc_data["total_words"] < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="We couldn't extract readable text from this PDF. It may be scanned or image-only."
            )

        preview = doc_data["full_text"][:300] + "..." if len(doc_data["full_text"]) > 300 else doc_data["full_text"]

        return UploadResponse(
            file_id=doc_data["file_id"],
            filename=doc_data["filename"],
            file_size_bytes=doc_data["file_size_bytes"],
            file_size_formatted=doc_data["file_size_formatted"],
            total_pages=doc_data["total_pages"],
            total_words=doc_data["total_words"],
            estimated_chapters=doc_data["estimated_chapters"],
            status="Complete",
            extracted_text_preview=preview
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Something went wrong while processing your document: {str(e)}"
        )
