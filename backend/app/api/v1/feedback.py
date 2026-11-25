"""
Feedback API — Feature F: Personalized Learning Feedback
Tổng hợp recurring errors, sinh remedial exercises, cập nhật mastery từ error patterns.
"""
from datetime import datetime, timezone
from typing import Dict, Optional
import logging
import uuid

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.auth import current_user_id, require_owned, require_topic_owned, validate_uuid
from app.core.supabase_client import get_supabase_client
from app.services.ai_engine import AIEngine, require_ai_feature
from app.services.rag_engine import RAGEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["Personalized Feedback"])


class LogErrorRequest(BaseModel):
    topic_id: Optional[str] = None
    error_type: str  # vocabulary, grammar, comprehension, pronunciation, sentence_structure
    error_detail: str
    user_input: Optional[str] = ""
    correct_form: Optional[str] = ""
    context_sentence: Optional[str] = ""
    source: str = "quiz"  # quiz, scenario, flashcard, speech
    user_id: Optional[str] = None


class RemedialRequest(BaseModel):
    topic_id: Optional[str] = None
    topic_name: str
    document_id: Optional[str] = None
    user_id: Optional[str] = None


@router.post("/log-error")
def log_error(req: LogErrorRequest):
    """
    Ghi nhận một lỗi học tập của user.
    Nếu lỗi đã tồn tại (same user + error_detail) → tăng occurrence_count.
    """
    uid = current_user_id()
    topic_id = validate_uuid(req.topic_id, "topic_id", required=False)
    if topic_id:
        require_topic_owned(topic_id, missing_ok=True)
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    try:
        existing = supabase.table("error_logs") \
            .select("id, occurrence_count") \
            .eq("user_id", uid) \
            .eq("error_detail", req.error_detail[:200]) \
            .eq("error_type", req.error_type) \
            .limit(1) \
            .execute()

        if existing.data:
            err_id = existing.data[0]["id"]
            new_count = existing.data[0]["occurrence_count"] + 1
            supabase.table("error_logs").update({
                "occurrence_count": new_count,
                "last_seen_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", err_id).execute()
            return {
                "status": "updated",
                "error_id": err_id,
                "occurrence_count": new_count,
                "message": f"Lỗi '{req.error_detail[:50]}...' đã xảy ra {new_count} lần"
            }
        else:
            err_id = str(uuid.uuid4())
            supabase.table("error_logs").insert({
                "id": err_id,
                "user_id": uid,
                "topic_id": topic_id,
                "error_type": req.error_type,
                "error_detail": req.error_detail[:500],
                "user_input": req.user_input or "",
                "correct_form": req.correct_form or "",
                "context_sentence": req.context_sentence or "",
                "source": req.source,
                "occurrence_count": 1
            }).execute()
            return {
                "status": "created",
                "error_id": err_id,
                "occurrence_count": 1,
                "message": "Đã ghi nhận lỗi học tập"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi ghi error log: {e}")


@router.get("/report")
def get_feedback_report(
    user_id: Optional[str] = None,
    min_occurrences: int = Query(2, ge=1, le=1000),
):
    """
    Tổng hợp báo cáo lỗi tái diễn và đề xuất cải thiện.
    Sử dụng Gemini để phân tích pattern và sinh recommendations.
    """
    uid = current_user_id()
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    try:
        try:
            errors_resp = supabase.rpc("get_recurring_errors", {
                "p_user_id": uid,
                "p_min_occurrences": min_occurrences,
                "p_limit": 30
            }).execute()
            error_logs = errors_resp.data or []
        except Exception:
            errors_resp = supabase.table("error_logs") \
                .select("*") \
                .eq("user_id", uid) \
                .gte("occurrence_count", min_occurrences) \
                .order("occurrence_count", desc=True) \
                .limit(30) \
                .execute()
            error_logs = errors_resp.data or []

        ks_resp = supabase.table("knowledge_states") \
            .select("mastery_score") \
            .eq("user_id", uid) \
            .execute()
        ks_data = ks_resp.data or []
        overall_mastery = sum(k["mastery_score"] for k in ks_data) / len(ks_data) if ks_data else 0

        user_profile = {
            "overall_mastery": overall_mastery,
            "total_topics": len(ks_data)
        }

        analysis = AIEngine.analyze_error_patterns(error_logs, user_profile)

        error_type_stats: Dict[str, int] = {}
        for err in error_logs:
            et = err.get("error_type", "unknown")
            error_type_stats[et] = error_type_stats.get(et, 0) + err.get("occurrence_count", 1)

        return {
            "user_id": uid,
            "total_error_types": len(error_type_stats),
            "total_recurring_errors": len(error_logs),
            "error_type_breakdown": error_type_stats,
            "recent_errors": error_logs[:10],
            "analysis": analysis,
            "min_occurrences_threshold": min_occurrences
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remedial-exercises")
def get_remedial_exercises(req: RemedialRequest):
    """
    Sinh bài tập khắc phục dựa trên recurring errors của user cho một topic.
    """
    require_ai_feature("remedial", "Tạo bài tập khắc phục")
    uid = current_user_id()
    topic_id = validate_uuid(req.topic_id, "topic_id", required=False)
    doc_id = validate_uuid(req.document_id, "document_id", required=False)
    if topic_id:
        require_topic_owned(topic_id, missing_ok=True)
    if doc_id:
        require_owned("documents", doc_id)

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    topic_errors = []
    if topic_id:
        try:
            errors_resp = supabase.table("error_logs") \
                .select("*") \
                .eq("user_id", uid) \
                .eq("topic_id", topic_id) \
                .order("occurrence_count", desc=True) \
                .limit(10) \
                .execute()
            topic_errors = errors_resp.data or []
        except Exception:
            topic_errors = []

    if not topic_errors:
        try:
            all_errors_resp = supabase.table("error_logs") \
                .select("*") \
                .eq("user_id", uid) \
                .order("occurrence_count", desc=True) \
                .limit(5) \
                .execute()
            topic_errors = all_errors_resp.data or []
        except Exception:
            topic_errors = []

    error_type_counts: Dict[str, int] = {}
    for err in topic_errors:
        et = err.get("error_type", "unknown")
        error_type_counts[et] = error_type_counts.get(et, 0) + 1

    error_categories = [
        {"category": et, "count": cnt, "label": et.capitalize()}
        for et, cnt in sorted(error_type_counts.items(), key=lambda x: -x[1])
    ]

    rag_chunks = []
    if doc_id:
        rag_chunks = RAGEngine.search_relevant_chunks(
            query=req.topic_name,
            supabase_client=supabase,
            document_id=doc_id,
            top_k=4
        )
    rag_texts = RAGEngine.extract_rag_texts(rag_chunks)

    exercises = AIEngine.generate_remedial_exercises(
        error_categories=error_categories,
        rag_context=rag_texts,
        topic_name=req.topic_name
    )

    return {
        "topic_id": topic_id,
        "topic_name": req.topic_name,
        "error_summary": error_categories,
        "exercises": exercises,
        "total_exercises": len(exercises),
        "message": f"Đã sinh {len(exercises)} bài tập khắc phục cho {req.topic_name}"
    }


@router.get("/error-logs")
def get_error_logs(
    user_id: Optional[str] = None,
    error_type: Optional[str] = None,
    topic_id: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = Query(30, ge=1, le=200),
):
    """Lấy danh sách error logs của user với filter."""
    uid = current_user_id()
    clean_topic_id = validate_uuid(topic_id, "topic_id", required=False)
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    try:
        query = supabase.table("error_logs") \
            .select("*") \
            .eq("user_id", uid) \
            .order("occurrence_count", desc=True) \
            .limit(limit)

        if error_type:
            query = query.eq("error_type", error_type)
        if clean_topic_id:
            query = query.eq("topic_id", clean_topic_id)
        if source:
            query = query.eq("source", source)

        resp = query.execute()
        return {
            "user_id": uid,
            "error_logs": resp.data or [],
            "count": len(resp.data or [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
