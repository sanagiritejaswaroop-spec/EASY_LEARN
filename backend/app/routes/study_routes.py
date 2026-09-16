from fastapi import APIRouter, HTTPException, Query
from app.services.summary_service import summary_service
from app.services.topic_service import topic_service
from app.services.question_service import question_service
from app.services.flashcard_service import flashcard_service
from app.services.mock_exam_service import mock_exam_service
from app.models.schemas import (
    SummaryResponse, TopicsResponse, MCQResponse,
    ShortQuestionsResponse, MediumQuestionsResponse,
    LongQuestionsResponse, FlashcardResponse, MockExamResponse
)

router = APIRouter(prefix="/api", tags=["study"])

@router.get("/summary/{file_id}", response_model=SummaryResponse)
async def get_summary(file_id: str):
    try:
        data = await summary_service.get_summary(file_id)
        return data
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")

@router.get("/topics/{file_id}", response_model=TopicsResponse)
async def get_topics(file_id: str):
    try:
        data = await topic_service.get_important_topics(file_id)
        return data
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract topics: {str(e)}")

@router.get("/questions/mcq/{file_id}", response_model=MCQResponse)
async def get_mcq(
    file_id: str,
    count: int = Query(10, ge=5, le=30),
    difficulty: str = Query("Medium"),
    topic: str = Query("All")
):
    try:
        data = await question_service.get_mcq_questions(file_id, count, difficulty, topic)
        return data
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/questions/short/{file_id}", response_model=ShortQuestionsResponse)
async def get_short_questions(file_id: str, count: int = Query(8, ge=2, le=20)):
    try:
        data = await question_service.get_short_questions(file_id, count)
        return data
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/questions/medium/{file_id}", response_model=MediumQuestionsResponse)
async def get_medium_questions(file_id: str, count: int = Query(5, ge=1, le=15)):
    try:
        data = await question_service.get_medium_questions(file_id, count)
        return data
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/questions/long/{file_id}", response_model=LongQuestionsResponse)
async def get_long_questions(file_id: str, count: int = Query(3, ge=1, le=10)):
    try:
        data = await question_service.get_long_questions(file_id, count)
        return data
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/flashcards/{file_id}", response_model=FlashcardResponse)
async def get_flashcards(file_id: str, count: int = Query(12, ge=4, le=30)):
    try:
        data = await flashcard_service.get_flashcards(file_id, count)
        return data
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/mock-exam/{file_id}", response_model=MockExamResponse)
async def get_mock_exam(file_id: str, time_limit_minutes: int = Query(30, ge=10, le=120)):
    try:
        data = await mock_exam_service.generate_mock_exam(file_id, time_limit_minutes)
        return data
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
