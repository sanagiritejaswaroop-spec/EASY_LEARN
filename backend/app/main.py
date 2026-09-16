from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routes import pdf_routes, study_routes, chat_routes

app = FastAPI(
    title="EASY-LEARN — AI Study Assistant API",
    description="Backend service for PDF parsing, NLP document analysis, and study material generation.",
    version="1.0.0"
)

# CORS setup for Vite frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Router endpoints
app.include_router(pdf_routes.router)
app.include_router(study_routes.router)
app.include_router(chat_routes.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "EASY-LEARN AI Study Assistant API",
        "version": "1.0.0"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred while processing your request. Please try again."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
