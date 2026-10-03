from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1.documents import router as documents_router
from app.api.v1.learning_paths import router as learning_paths_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.flashcards import router as flashcards_router
from app.api.v1.tutor import router as tutor_router
from app.api.v1.speech import router as speech_router
from app.api.v1.scenarios import router as scenarios_router
from app.api.v1.export import router as export_router
from app.api.v1.dual_coding import router as dual_coding_router
from app.api.v1.vocabulary import router as vocabulary_router
from app.api.v1.feedback import router as feedback_router
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Studia Personal Learning Intelligence Platform — RAG + Adaptive FSRS + Gemini AI + Speech Shadowing + TBLT Scenarios"
)

# CORS configuration supporting localhost frontend development
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_msg = str(exc)
    logger.error(f"Unhandled exception on {request.url}: {error_msg}\n{traceback.format_exc()}")
    
    origin = request.headers.get("origin") or "*"
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": error_msg},
        headers=headers
    )


# V1 Routers
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(learning_paths_router, prefix=settings.API_V1_STR)
app.include_router(quizzes_router, prefix=settings.API_V1_STR)
app.include_router(reviews_router, prefix=settings.API_V1_STR)
app.include_router(flashcards_router, prefix=settings.API_V1_STR)
app.include_router(tutor_router, prefix=settings.API_V1_STR)
app.include_router(speech_router, prefix=settings.API_V1_STR)
app.include_router(scenarios_router, prefix=settings.API_V1_STR)
app.include_router(export_router, prefix=settings.API_V1_STR)
app.include_router(dual_coding_router, prefix=settings.API_V1_STR)
# V3 — Learnova Language Learning Features
app.include_router(vocabulary_router, prefix=settings.API_V1_STR)
app.include_router(feedback_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": "Studia Personal Learning Intelligence Platform API v3 (Learnova)",
        "version": settings.VERSION,
        "llm_provider": settings.LLM_PROVIDER,
        "docs_url": "/docs",
        "features": [
            "PDF Upload + RAG Pipeline",
            "Adaptive Study Plans (Interleaved Scheduler)",
            "Gemini-powered Lessons with i+1 Vocabulary Highlights",
            "FSRS Spaced Repetition",
            "Flashcard Generation + Anki Export",
            "Multi-Type Quiz (MC, Fill-Blank, Recall, Sentence Construction)",
            "AI Open-Answer Grading",
            "Contextual Vocabulary Learning (word cards, collocations, examples)",
            "AI Tutor Chat",
            "Speech Audio Shadowing (0.8x-1.2x & Levenshtein STT)",
            "Task-Based Roleplay Scenarios (TBLT) + Auto Vocab Save",
            "Personalized Error Tracking & Remedial Exercises",
            "Dual Coding Diagram Generation"
        ]
    }

@app.get("/health")
async def health_check():
    from app.core.supabase_client import get_supabase_client
    supabase = get_supabase_client()
    db_status = "connected" if supabase else "disconnected"
    
    gemini_status = "configured" if (
        settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here"
    ) else "not configured"

    return {
        "status": "healthy",
        "database": f"Supabase Cloud ({db_status})",
        "llm": f"Gemini ({gemini_status})",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
