"""
Reviews API v2 — Real Supabase data, FSRS-based due queue
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from app.services.fsrs_engine import FSRSEngine
from app.core.supabase_client import get_supabase_client
from app.config import settings

router = APIRouter(prefix="/reviews", tags=["Spaced Repetition Review Queue"])

DEFAULT_USER_ID = settings.DEFAULT_USER_ID


class CompleteReviewRequest(BaseModel):
    topic_id: str
    rating: int = 3  # 1=Again, 2=Hard, 3=Good, 4=Easy
    response_time_ms: int = 5000
    user_id: Optional[str] = None


@router.get("/queue")
async def get_review_queue(user_id: Optional[str] = None):
    """
    Lấy danh sách topics đến hạn ôn tập từ Supabase (FSRS schedule).
    """
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    try:
        now = datetime.now(timezone.utc)
        tomorrow = (now + timedelta(days=1)).isoformat()

        # Lấy knowledge states đến hạn hoặc sắp đến hạn (trong 24h)
        ks_resp = supabase.table("knowledge_states") \
            .select("topic_id, mastery_score, retention_score, stability, next_review_at, topics(name, difficulty_level)") \
            .eq("user_id", uid) \
            .lte("next_review_at", tomorrow) \
            .order("next_review_at") \
            .execute()

        review_items = []
        for ks in (ks_resp.data or []):
            topic_data = ks.get("topics") or {}
            topic_name = topic_data.get("name", "Unknown") if isinstance(topic_data, dict) else "Unknown"
            next_review = ks.get("next_review_at", now.isoformat())

            try:
                review_dt = datetime.fromisoformat(next_review.replace("Z", "+00:00"))
                is_overdue = review_dt <= now
                hours_until = (review_dt - now).total_seconds() / 3600
                urgency = "High" if is_overdue else ("Medium" if hours_until < 6 else "Low")
                scheduled_label = (
                    f"Đã đến hạn ({abs(int(hours_until))} giờ trước)" if is_overdue
                    else f"Còn {int(hours_until)} giờ nữa"
                )
            except Exception:
                urgency = "Medium"
                scheduled_label = "Trong ngày"

            review_items.append({
                "topic_id": ks.get("topic_id"),
                "topic_name": topic_name,
                "mastery_score": round(ks.get("mastery_score", 0), 1),
                "retention_score": round(ks.get("retention_score", 1.0) * 100, 1),
                "stability": round(ks.get("stability", 1.0), 2),
                "next_review_at": next_review,
                "urgency": urgency,
                "scheduled_for": scheduled_label,
                "recommended_action": (
                    "Adaptive Review Quiz" if ks.get("mastery_score", 0) < 60
                    else "Flashcards & Quick Test"
                )
            })

        # Sort: High urgency first
        urgency_order = {"High": 0, "Medium": 1, "Low": 2}
        review_items.sort(key=lambda x: urgency_order.get(x["urgency"], 3))

        return {
            "user_id": uid,
            "total_due": len(review_items),
            "review_items": review_items
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete")
async def complete_review(req: CompleteReviewRequest):
    """
    Đánh dấu review hoàn thành và cập nhật FSRS state.
    """
    uid = req.user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    # Lấy state hiện tại
    ks_resp = supabase.table("knowledge_states") \
        .select("*") \
        .eq("user_id", uid) \
        .eq("topic_id", req.topic_id) \
        .execute()

    if not ks_resp.data:
        raise HTTPException(status_code=404, detail="Knowledge state không tồn tại")

    current = ks_resp.data[0]
    is_correct = req.rating >= 3

    fsrs_result = FSRSEngine.calculate_next_review(
        stability=current.get("stability", 1.0),
        difficulty_rating=current.get("difficulty_rating", 5.0),
        mastery_score=current.get("mastery_score", 0.0),
        is_correct=is_correct,
        confidence_rating=req.rating,
        response_time_ms=req.response_time_ms
    )

    # Update Supabase
    supabase.table("knowledge_states").update({
        "mastery_score": fsrs_result["mastery_score"],
        "confidence_score": fsrs_result["confidence_score"],
        "retention_score": fsrs_result["retention_score"],
        "stability": fsrs_result["stability"],
        "difficulty_rating": fsrs_result["difficulty_rating"],
        "next_review_at": fsrs_result["next_review_at"],
        "last_reviewed_at": "now()"
    }).eq("user_id", uid).eq("topic_id", req.topic_id).execute()

    return {
        "topic_id": req.topic_id,
        "rating": req.rating,
        "updated_state": fsrs_result,
        "next_review_in_days": fsrs_result["interval_days"],
        "message": f"✅ Đã ôn tập! Lịch hẹn tiếp theo: {fsrs_result['interval_days']:.1f} ngày"
    }


@router.get("/stats")
async def get_review_stats(user_id: Optional[str] = None):
    """Thống kê tổng quan về tình trạng học tập của user."""
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    ks_resp = supabase.table("knowledge_states") \
        .select("mastery_score, retention_score") \
        .eq("user_id", uid) \
        .execute()

    states = ks_resp.data or []
    if not states:
        return {"overall_mastery": 0, "avg_retention": 0, "total_topics": 0}

    avg_mastery = sum(s.get("mastery_score", 0) for s in states) / len(states)
    avg_retention = sum(s.get("retention_score", 1.0) for s in states) / len(states)

    return {
        "overall_mastery": round(avg_mastery, 1),
        "avg_retention": round(avg_retention * 100, 1),
        "total_topics": len(states),
        "mastered_topics": sum(1 for s in states if s.get("mastery_score", 0) >= 80),
        "struggling_topics": sum(1 for s in states if s.get("mastery_score", 0) < 40)
    }
