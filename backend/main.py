from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1.documents import router as documents_router
from app.api.v1.learning_paths import router as learning_paths_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.flashcards import router as flashcards_router
from app.api.v1.tutor import router as tutor_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Studia Personal Learning Intelligence Platform — RAG + Adaptive FSRS + Gemini AI"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# V1 Routers
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(learning_paths_router, prefix=settings.API_V1_STR)
app.include_router(quizzes_router, prefix=settings.API_V1_STR)
app.include_router(reviews_router, prefix=settings.API_V1_STR)
app.include_router(flashcards_router, prefix=settings.API_V1_STR)
app.include_router(tutor_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": "Studia Personal Learning Intelligence Platform API v2",
        "version": settings.VERSION,
        "llm_provider": settings.LLM_PROVIDER,
        "docs_url": "/docs",
        "features": [
            "PDF Upload + RAG Pipeline",
            "Adaptive Study Plans",
            "Gemini-powered Lessons & Quizzes",
            "FSRS Spaced Repetition",
            "Flashcard Generation",
            "AI Tutor Chat"
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
