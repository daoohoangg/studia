"""
Quizzes API v3 — RAG-based generation, multi-type exercises, AI open grading, error tracking
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import logging
import uuid

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.auth import current_user_id, require_owned, require_quiz_owned, require_topic_owned
from app.core.supabase_client import get_supabase_client
from app.services.ai_engine import AIEngine, require_ai_feature
from app.services.fsrs_engine import FSRSEngine
from app.services.rag_engine import RAGEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quizzes", tags=["Quizzes & Evaluation"])

VALID_QUESTION_TYPES = {"multiple_choice", "true_false", "short_answer"}
VALID_EXERCISE_TYPES = {"multiple_choice", "true_false", "fill_blank", "sentence_construction", "recall"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clamp_question_type(q: Dict[str, Any]) -> str:
    q_type = q.get("question_type", "multiple_choice")
    if q_type in VALID_QUESTION_TYPES:
        return q_type
    ex_type = q.get("exercise_type", "")
    if ex_type == "true_false":
        return "true_false"
    if q.get("options"):
        return "multiple_choice"
    return "short_answer"


def _clamp_exercise_type(q: Dict[str, Any]) -> str:
    ex_type = q.get("exercise_type", "multiple_choice")
    return ex_type if ex_type in VALID_EXERCISE_TYPES else "multiple_choice"


def _clamp_difficulty(val: Any) -> int:
    try:
        return min(5, max(1, int(val)))
    except (TypeError, ValueError):
        return 2


class GenerateQuizRequest(BaseModel):
    topic_id: str
    topic_name: str
    user_mastery: float = 50.0
    document_id: Optional[str] = None
    question_count: int = Field(5, ge=1, le=20)
    user_id: Optional[str] = None


class SubmitQuizRequest(BaseModel):
    quiz_id: str
    topic_id: str
    topic_name: str
    answers: List[Dict[str, Any]]  # [{question_id, user_answer, response_time_ms, confidence_rating}]
    user_id: Optional[str] = None


class SubmitAnswerRequest(BaseModel):
    topic_id: str = "topic-1"
    question: Dict[str, Any]
    user_answer: str
    response_time_ms: int = 4000
    confidence_rating: int = 3
    current_mastery: float = 50.0
    current_stability: float = 1.0
    current_difficulty: float = 5.0
    user_id: Optional[str] = None


@router.post("/generate")
def generate_quiz(req: GenerateQuizRequest):
    """
    Tạo quiz adaptive từ RAG context.
    Sinh câu hỏi từ nội dung thực tế trong sách (không bịa).
    """
    require_ai_feature("quizzes", "Tạo quiz")
    current_user_id()
    require_topic_owned(req.topic_id, missing_ok=True)
    if req.document_id:
        require_owned("documents", req.document_id)
    supabase = get_supabase_client()

    rag_chunks = []
    if supabase and req.document_id:
        rag_chunks = RAGEngine.search_relevant_chunks(
            query=req.topic_name,
            supabase_client=supabase,
            document_id=req.document_id,
            top_k=5
        )
    rag_texts = RAGEngine.extract_rag_texts(rag_chunks)

    questions = AIEngine.generate_adaptive_quiz(
        topic_name=req.topic_name,
        user_mastery=req.user_mastery,
        rag_context=rag_texts,
        question_count=req.question_count
    )

    if not questions or all(q.get("is_fallback") for q in questions):
        raise HTTPException(
            status_code=503,
            detail="AI chưa tạo được câu hỏi từ nội dung sách (dịch vụ AI không khả dụng). Vui lòng thử lại sau."
        )

    quiz_id = str(uuid.uuid4())
    if supabase:
        try:
            supabase.table("quizzes").insert({
                "id": quiz_id,
                "topic_id": req.topic_id,
                "title": f"Quiz: {req.topic_name}",
                "quiz_type": "adaptive"
            }).execute()

            for q in questions:
                q_id = str(uuid.uuid4())
                q["id"] = q_id
                supabase.table("questions").insert({
                    "id": q_id,
                    "quiz_id": quiz_id,
                    "question_text": q.get("question_text", ""),
                    "question_type": _clamp_question_type(q),
                    "options": q.get("options", []),
                    "correct_answer": q.get("correct_answer", "A"),
                    "explanation": q.get("explanation", ""),
                    "difficulty": _clamp_difficulty(q.get("difficulty", 2))
                }).execute()
        except Exception as e:
            logger.warning(f"Quiz save warning: {e}")

    return {
        "quiz_id": quiz_id,
        "topic_id": req.topic_id,
        "topic_name": req.topic_name,
        "user_mastery": req.user_mastery,
        "rag_chunks_used": len(rag_chunks),
        "questions": questions
    }


@router.post("/submit")
def submit_answer(req: SubmitAnswerRequest):
    """
    Chấm điểm câu trả lời đơn lẻ & Cập nhật Knowledge State + FSRS.
    """
    user_id = current_user_id()
    require_topic_owned(req.topic_id, missing_ok=True)
    supabase = get_supabase_client()

    eval_result = AIEngine.evaluate_quiz_response(
        question=req.question,
        user_answer=req.user_answer,
        response_time_ms=req.response_time_ms
    )

    fsrs_result = FSRSEngine.calculate_next_review(
        stability=req.current_stability,
        difficulty_rating=req.current_difficulty,
        mastery_score=req.current_mastery,
        is_correct=eval_result["is_correct"],
        confidence_rating=req.confidence_rating,
        response_time_ms=req.response_time_ms
    )

    if supabase:
        try:
            existing_rows = supabase.table("knowledge_states") \
                .select("attempt_count, correct_count") \
                .eq("user_id", user_id).eq("topic_id", req.topic_id).limit(1).execute().data or []
            prev_attempts = int((existing_rows[0].get("attempt_count") or 0)) if existing_rows else 0
            prev_correct = int((existing_rows[0].get("correct_count") or 0)) if existing_rows else 0
            supabase.table("knowledge_states").upsert({
                "user_id": user_id,
                "topic_id": req.topic_id,
                "mastery_score": fsrs_result["mastery_score"],
                "confidence_score": fsrs_result["confidence_score"],
                "retention_score": fsrs_result["retention_score"],
                "stability": fsrs_result["stability"],
                "difficulty_rating": fsrs_result["difficulty_rating"],
                "next_review_at": fsrs_result["next_review_at"],
                "last_reviewed_at": _now_iso(),
                "attempt_count": prev_attempts + 1,
                "correct_count": prev_correct + (1 if eval_result["is_correct"] else 0),
            }, on_conflict="user_id,topic_id").execute()
        except Exception as e:
            logger.warning(f"KS update warning: {e}")

    return {
        "evaluation": eval_result,
        "updated_knowledge_state": fsrs_result
    }


@router.post("/submit-full")
def submit_full_quiz(req: SubmitQuizRequest):
    """
    Submit toàn bộ quiz → phân tích điểm → cập nhật knowledge state → trigger adaptive plan.
    """
    user_id = current_user_id()
    require_topic_owned(req.topic_id, missing_ok=True)
    if req.quiz_id:
        require_quiz_owned(req.quiz_id, missing_ok=True)
    supabase = get_supabase_client()

    question_map = {}
    if supabase:
        q_resp = supabase.table("questions").select("*").eq("quiz_id", req.quiz_id).execute()
        question_map = {q["id"]: q for q in (q_resp.data or [])}

    results = []
    correct_count = 0
    for ans in req.answers:
        q_id = ans.get("question_id", "")
        question = question_map.get(q_id, ans.get("question", {}))
        user_answer = ans.get("user_answer", "")
        response_time_ms = ans.get("response_time_ms", 5000)
        confidence_rating = ans.get("confidence_rating", 3)

        eval_result = AIEngine.evaluate_quiz_response(
            question=question,
            user_answer=user_answer,
            response_time_ms=response_time_ms
        )
        results.append({**eval_result, "question_id": q_id})

        if eval_result["is_correct"]:
            correct_count += 1

        if supabase and q_id:
            try:
                supabase.table("question_attempts").insert({
                    "user_id": user_id,
                    "question_id": q_id,
                    "topic_id": req.topic_id,
                    "user_answer": user_answer,
                    "is_correct": eval_result["is_correct"],
                    "response_time_ms": response_time_ms,
                    "confidence_rating": confidence_rating
                }).execute()
            except Exception:
                pass

    total = len(req.answers) or 1
    score_pct = (correct_count / total) * 100

    analysis = AIEngine.analyze_weak_topics(results, req.topic_name)

    if supabase:
        try:
            ks_resp = supabase.table("knowledge_states") \
                .select("*").eq("user_id", user_id).eq("topic_id", req.topic_id).execute()

            current = ks_resp.data[0] if ks_resp.data else {
                "stability": 1.0, "difficulty_rating": 5.0, "mastery_score": 0.0,
                "attempt_count": 0, "correct_count": 0,
            }

            avg_rating = 4 if score_pct >= 80 else (3 if score_pct >= 60 else (2 if score_pct >= 40 else 1))
            fsrs = FSRSEngine.calculate_next_review(
                stability=current.get("stability", 1.0),
                difficulty_rating=current.get("difficulty_rating", 5.0),
                mastery_score=current.get("mastery_score", 0.0),
                is_correct=score_pct >= 60,
                confidence_rating=avg_rating
            )

            supabase.table("knowledge_states").upsert({
                "user_id": user_id,
                "topic_id": req.topic_id,
                "mastery_score": fsrs["mastery_score"],
                "confidence_score": fsrs["confidence_score"],
                "retention_score": fsrs["retention_score"],
                "stability": fsrs["stability"],
                "difficulty_rating": fsrs["difficulty_rating"],
                "next_review_at": fsrs["next_review_at"],
                "last_reviewed_at": _now_iso(),
                "attempt_count": int(current.get("attempt_count") or 0) + total,
                "correct_count": int(current.get("correct_count") or 0) + correct_count,
            }, on_conflict="user_id,topic_id").execute()

        except Exception as e:
            logger.warning(f"KS full update warning: {e}")

    return {
        "quiz_id": req.quiz_id,
        "topic_id": req.topic_id,
        "topic_name": req.topic_name,
        "score_percentage": round(score_pct, 1),
        "correct_count": correct_count,
        "total_count": total,
        "results": results,
        "analysis": analysis,
        "plan_adapted": analysis.get("needs_review", False),
        "message": analysis.get("recommendation", "")
    }


@router.get("/weak-topics")
def get_weak_topics(user_id: Optional[str] = None):
    """Phân tích và trả về danh sách weak topics của user."""
    uid = current_user_id()
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    ks_resp = supabase.table("knowledge_states") \
        .select("topic_id, mastery_score, retention_score, topics(name)") \
        .eq("user_id", uid) \
        .lt("mastery_score", 60) \
        .order("mastery_score") \
        .execute()

    weak_topics = []
    for ks in (ks_resp.data or []):
        topic_data = ks.get("topics") or {}
        weak_topics.append({
            "topic_id": ks.get("topic_id"),
            "topic_name": topic_data.get("name", "Unknown") if isinstance(topic_data, dict) else "Unknown",
            "mastery_score": ks.get("mastery_score", 0),
            "retention_score": ks.get("retention_score", 1.0),
            "status": "🔴 Cần ôn ngay" if ks.get("mastery_score", 0) < 40 else "🟡 Cần luyện thêm"
        })

    return {"user_id": uid, "weak_topics": weak_topics, "count": len(weak_topics)}


class GenerateMultiTypeQuizRequest(BaseModel):
    topic_id: str
    topic_name: str
    user_mastery: float = 50.0
    document_id: Optional[str] = None
    question_count: int = Field(5, ge=1, le=20)
    exercise_types: Optional[List[str]] = None
    user_id: Optional[str] = None


class GradeOpenAnswerRequest(BaseModel):
    question_text: str
    grading_rubric: Optional[str] = ""
    user_answer: str
    topic_id: str
    topic_name: str
    document_id: Optional[str] = None
    user_id: Optional[str] = None


@router.post("/generate-multi")
def generate_multi_type_quiz(req: GenerateMultiTypeQuizRequest):
    """
    Feature B: Sinh quiz đa dạng loại câu hỏi (fill_blank, recall, sentence_construction, multiple_choice).
    Tự động chọn exercise_types dựa trên mastery nếu không chỉ định.
    """
    require_ai_feature("quizzes", "Tạo quiz")
    current_user_id()
    require_topic_owned(req.topic_id, missing_ok=True)
    if req.document_id:
        require_owned("documents", req.document_id)
    supabase = get_supabase_client()

    rag_chunks = []
    if supabase and req.document_id:
        rag_chunks = RAGEngine.search_relevant_chunks(
            query=req.topic_name,
            supabase_client=supabase,
            document_id=req.document_id,
            top_k=5
        )
    rag_texts = RAGEngine.extract_rag_texts(rag_chunks)

    questions = AIEngine.generate_multi_type_quiz(
        topic_name=req.topic_name,
        user_mastery=req.user_mastery,
        rag_context=rag_texts,
        question_count=req.question_count,
        exercise_types=req.exercise_types
    )

    if not questions or all(q.get("is_fallback") for q in questions):
        raise HTTPException(
            status_code=503,
            detail="AI chưa tạo được câu hỏi từ nội dung sách (dịch vụ AI không khả dụng). Vui lòng thử lại sau."
        )

    quiz_id = str(uuid.uuid4())
    if supabase:
        try:
            supabase.table("quizzes").insert({
                "id": quiz_id,
                "topic_id": req.topic_id,
                "title": f"Multi-Type Quiz: {req.topic_name}",
                "quiz_type": "adaptive"
            }).execute()

            for q in questions:
                q_id = str(uuid.uuid4())
                q["id"] = q_id
                try:
                    supabase.table("questions").insert({
                        "id": q_id,
                        "quiz_id": quiz_id,
                        "question_text": q.get("question_text", ""),
                        "question_type": _clamp_question_type(q),
                        "options": q.get("options", []),
                        "correct_answer": q.get("correct_answer", ""),
                        "explanation": q.get("explanation", ""),
                        "difficulty": _clamp_difficulty(q.get("difficulty", 2)),
                        "exercise_type": _clamp_exercise_type(q),
                    }).execute()
                except Exception as qe:
                    logger.warning(f"Question save warning: {qe}")
        except Exception as e:
            logger.warning(f"Multi quiz save warning: {e}")

    exercise_type_summary = list(set(q.get("exercise_type", "multiple_choice") for q in questions))

    return {
        "quiz_id": quiz_id,
        "topic_id": req.topic_id,
        "topic_name": req.topic_name,
        "user_mastery": req.user_mastery,
        "rag_chunks_used": len(rag_chunks),
        "exercise_types_used": exercise_type_summary,
        "questions": questions
    }


@router.post("/grade-open")
def grade_open_answer(req: GradeOpenAnswerRequest):
    """
    Feature B: Gemini chấm điểm câu trả lời mở (recall, sentence_construction).
    Tự động ghi nhận lỗi vào error_logs.
    """
    user_id = current_user_id()
    require_topic_owned(req.topic_id, missing_ok=True)
    if req.document_id:
        require_owned("documents", req.document_id)
    supabase = get_supabase_client()

    rag_chunks = []
    if supabase and req.document_id:
        rag_chunks = RAGEngine.search_relevant_chunks(
            query=req.topic_name + " " + req.question_text[:100],
            supabase_client=supabase,
            document_id=req.document_id,
            top_k=3
        )
    rag_texts = RAGEngine.extract_rag_texts(rag_chunks)

    grading = AIEngine.grade_open_answer(
        question_text=req.question_text,
        grading_rubric=req.grading_rubric or "",
        user_answer=req.user_answer,
        rag_context=rag_texts,
        topic_name=req.topic_name
    )

    errors_detected = grading.get("errors_detected", [])
    if supabase and errors_detected:
        now_iso = _now_iso()
        for err in errors_detected:
            try:
                existing = supabase.table("error_logs") \
                    .select("id, occurrence_count") \
                    .eq("user_id", user_id) \
                    .eq("error_detail", err.get("error_detail", "")[:200]) \
                    .limit(1).execute()

                if existing.data:
                    supabase.table("error_logs").update({
                        "occurrence_count": existing.data[0]["occurrence_count"] + 1,
                        "last_seen_at": now_iso
                    }).eq("id", existing.data[0]["id"]).execute()
                else:
                    supabase.table("error_logs").insert({
                        "user_id": user_id,
                        "topic_id": req.topic_id,
                        "error_type": err.get("error_type", "comprehension"),
                        "error_detail": err.get("error_detail", "")[:500],
                        "user_input": err.get("user_input", ""),
                        "correct_form": err.get("correct_form", ""),
                        "context_sentence": req.question_text[:300],
                        "source": "quiz"
                    }).execute()
            except Exception as le:
                logger.warning(f"Error log save failed: {le}")

    return {
        "topic_id": req.topic_id,
        "question_text": req.question_text,
        "user_answer": req.user_answer,
        "grading": grading,
        "errors_logged": len(errors_detected)
    }


@router.get("/recurring-mistakes")
def get_recurring_mistakes(
    user_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    min_occurrences: int = Query(2, ge=1, le=1000),
    limit: int = Query(20, ge=1, le=100),
):
    """Lấy danh sách lỗi tái diễn từ question_attempts và error_logs."""
    uid = current_user_id()
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    try:
        query = supabase.table("error_logs") \
            .select("*") \
            .eq("user_id", uid) \
            .gte("occurrence_count", min_occurrences) \
            .order("occurrence_count", desc=True) \
            .limit(limit)

        if topic_id:
            query = query.eq("topic_id", topic_id)

        resp = query.execute()

        errors = resp.data or []
        by_type: Dict[str, List] = {}
        for err in errors:
            et = err.get("error_type", "unknown")
            by_type.setdefault(et, []).append(err)

        return {
            "user_id": uid,
            "total_recurring": len(errors),
            "by_type": {
                et: {"count": len(items), "items": items[:5]}
                for et, items in by_type.items()
            },
            "top_errors": errors[:10]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
