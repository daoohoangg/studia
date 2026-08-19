from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.ai_engine import AIEngine
from app.services.fsrs_engine import FSRSEngine

router = APIRouter(prefix="/quizzes", tags=["Quizzes & Evaluation"])

class GenerateQuizRequest(BaseModel):
    topic_name: str
    user_mastery: float = 50.0
    question_count: int = 3

class SubmitAnswerRequest(BaseModel):
    topic_id: str = "topic-1"
    question: Dict[str, Any]
    user_answer: str
    response_time_ms: int = 4000
    confidence_rating: int = 3 # 1-4
    current_mastery: float = 50.0
    current_stability: float = 1.0
    current_difficulty: float = 5.0

@router.post("/generate")
async def generate_quiz(req: GenerateQuizRequest):
    """
    Tạo bộ câu hỏi trắc nghiệm thích ứng (Adaptive Quiz) phù hợp trình độ người học.
    """
    questions = AIEngine.generate_adaptive_quiz(
        topic_name=req.topic_name,
        user_mastery=req.user_mastery,
        question_count=req.question_count
    )
    return {
        "topic_name": req.topic_name,
        "questions": questions
    }

@router.post("/submit")
async def submit_answer(req: SubmitAnswerRequest):
    """
    Chấm điểm câu trả lời & Cập nhật Trạng thái Học tập (KnowledgeState & FSRS).
    """
    eval_result = AIEngine.evaluate_quiz_response(
        question=req.question,
        user_answer=req.user_answer,
        response_time_ms=req.response_time_ms
    )
    
    # Cập nhật Spaced Repetition State theo FSRS Engine
    fsrs_result = FSRSEngine.calculate_next_review(
        stability=req.current_stability,
        difficulty_rating=req.current_difficulty,
        mastery_score=req.current_mastery,
        is_correct=eval_result["is_correct"],
        confidence_rating=req.confidence_rating,
        response_time_ms=req.response_time_ms
    )
    
    return {
        "evaluation": eval_result,
        "updated_knowledge_state": fsrs_result
    }
