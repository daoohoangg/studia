from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1.documents import router as documents_router
from app.api.v1.learning_paths import router as learning_paths_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.reviews import router as reviews_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Cấu hình CORS để làm việc mượt mà với Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn các router API V1
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(learning_paths_router, prefix=settings.API_V1_STR)
app.include_router(quizzes_router, prefix=settings.API_V1_STR)
app.include_router(reviews_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": "Studia Personal Learning Intelligence Platform API",
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "Supabase Cloud"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
