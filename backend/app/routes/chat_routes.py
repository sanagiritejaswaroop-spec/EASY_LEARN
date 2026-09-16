from fastapi import APIRouter, HTTPException
from app.services.chat_service import chat_service
from app.models.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api", tags=["chat"])

@router.post("/chat", response_model=ChatResponse)
async def chat_with_easylearn(req: ChatRequest):
    try:
        data = await chat_service.process_chat(req.file_id, req.message, req.history or [])
        return data
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing error: {str(e)}")
