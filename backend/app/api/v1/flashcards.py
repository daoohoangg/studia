"""
Flashcards API — Generate, Review (FSRS), Due Queue
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.ai_engine import AIEngine
from app.services.rag_engine import RAGEngine
from app.services.fsrs_engine import FSRSEngine
from app.core.supabase_client import get_supabase_client
from app.config import settings
import uuid

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])

DEFAULT_USER_ID = settings.DEFAULT_USER_ID


class GenerateFlashcardsRequest(BaseModel):
    topic_id: str
    topic_name: str
    document_id: Optional[str] = None
    count: int = 10
    user_id: Optional[str] = None


class ReviewFlashcardRequest(BaseModel):
    flashcard_id: str
    rating: int  # 1=Again, 2=Hard, 3=Good, 4=Easy
    response_time_ms: int = 5000
    user_id: Optional[str] = None


@router.post("/generate")
async def generate_flashcards(req: GenerateFlashcardsRequest):
    """
    Sinh flashcards cho topic từ RAG context (content trong sách).
    Lưu vào Supabase với topic_id.
    """
    user_id = req.user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    # 1. RAG: lấy context liên quan
    rag_chunks = []
    if req.document_id:
        rag_chunks = RAGEngine.search_relevant_chunks(
            query=req.topic_name,
            supabase_client=supabase,
            document_id=req.document_id,
            top_k=6
        )

    rag_texts = RAGEngine.extract_rag_texts(rag_chunks)

    # 2. Sinh flashcards qua Gemini
    flashcard_data = AIEngine.generate_flashcards(
        topic_name=req.topic_name,
        rag_context=rag_texts,
        count=req.count
    )

    # 3. Lưu vào Supabase
    saved_cards = []
    for card in flashcard_data:
        card_id = str(uuid.uuid4())
        try:
            supabase.table("flashcards").insert({
                "id": card_id,
                "topic_id": req.topic_id,
                "document_id": req.document_id,
                "front": card.get("front", ""),
                "back": card.get("back", ""),
                "source_chunk": card.get("source_chunk", "")[:500],
                "card_type": card.get("card_type", "concept")
            }).execute()

            # Khởi tạo FSRS state cho user
            supabase.table("flashcard_states").insert({
                "user_id": user_id,
                "flashcard_id": card_id,
                "stability": 1.0,
                "difficulty_rating": 5.0,
                "mastery_score": 0.0,
                "next_review_at": "now()"
            }).execute()

            saved_cards.append({**card, "id": card_id})
        except Exception as e:
            print(f"Flashcard save warning: {e}")

    return {
        "topic_id": req.topic_id,
        "topic_name": req.topic_name,
        "generated_count": len(saved_cards),
        "flashcards": saved_cards,
        "rag_chunks_used": len(rag_chunks)
    }


@router.get("/due")
async def get_due_flashcards(
    user_id: Optional[str] = None,
    limit: int = 20,
    topic_id: Optional[str] = None
):
    """
    Lấy danh sách flashcards đến hạn ôn tập (FSRS schedule).
    """
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    try:
        # Dùng RPC function get_due_flashcards nếu có
        resp = supabase.rpc("get_due_flashcards", {
            "p_user_id": uid,
            "p_limit": limit
        }).execute()

        cards = resp.data or []

        if topic_id:
            cards = [c for c in cards if c.get("topic_id") == topic_id]

        return {
            "user_id": uid,
            "due_count": len(cards),
            "flashcards": cards
        }
    except Exception:
        # Fallback: query trực tiếp
        try:
            fs_resp = supabase.table("flashcard_states") \
                .select("flashcard_id, stability, difficulty_rating, mastery_score, next_review_at, review_count") \
                .eq("user_id", uid) \
                .lte("next_review_at", "now()") \
                .order("next_review_at") \
                .limit(limit) \
                .execute()

            card_ids = [fs["flashcard_id"] for fs in (fs_resp.data or [])]
            fs_map = {fs["flashcard_id"]: fs for fs in (fs_resp.data or [])}

            cards = []
            if card_ids:
                fc_resp = supabase.table("flashcards").select("*").in_("id", card_ids).execute()
                for fc in (fc_resp.data or []):
                    state = fs_map.get(fc["id"], {})
                    cards.append({**fc, **state})

            return {"user_id": uid, "due_count": len(cards), "flashcards": cards}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/review")
async def review_flashcard(req: ReviewFlashcardRequest):
    """
    Submit kết quả review một flashcard.
    Cập nhật FSRS state (stability, difficulty, next_review_at).
    """
    uid = req.user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    # Lấy FSRS state hiện tại
    state_resp = supabase.table("flashcard_states") \
        .select("*") \
        .eq("user_id", uid) \
        .eq("flashcard_id", req.flashcard_id) \
        .execute()

    if not state_resp.data:
        # Tạo mới nếu chưa có
        current_state = {"stability": 1.0, "difficulty_rating": 5.0, "mastery_score": 0.0, "review_count": 0}
    else:
        current_state = state_resp.data[0]

    # Tính FSRS
    is_correct = req.rating >= 3  # Good hoặc Easy = correct
    fsrs_result = FSRSEngine.calculate_next_review(
        stability=current_state.get("stability", 1.0),
        difficulty_rating=current_state.get("difficulty_rating", 5.0),
        mastery_score=current_state.get("mastery_score", 0.0),
        is_correct=is_correct,
        confidence_rating=req.rating,
        response_time_ms=req.response_time_ms
    )

    # Cập nhật FSRS state
    try:
        supabase.table("flashcard_states").upsert({
            "user_id": uid,
            "flashcard_id": req.flashcard_id,
            "stability": fsrs_result["stability"],
            "difficulty_rating": fsrs_result["difficulty_rating"],
            "mastery_score": fsrs_result["mastery_score"],
            "retention_score": fsrs_result["retention_score"],
            "next_review_at": fsrs_result["next_review_at"],
            "review_count": current_state.get("review_count", 0) + 1,
            "last_rating": req.rating,
            "updated_at": "now()"
        }, on_conflict="user_id,flashcard_id").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật FSRS state: {e}")

    rating_labels = {1: "Again 😓", 2: "Hard 😕", 3: "Good 😊", 4: "Easy 😄"}

    return {
        "flashcard_id": req.flashcard_id,
        "rating": req.rating,
        "rating_label": rating_labels.get(req.rating, "Good"),
        "is_correct": is_correct,
        "updated_state": fsrs_result,
        "message": f"Ôn tập tiếp theo: {fsrs_result['interval_days']:.1f} ngày"
    }


@router.get("/topic/{topic_id}")
async def get_topic_flashcards(topic_id: str, user_id: Optional[str] = None):
    """Lấy tất cả flashcards của một topic."""
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    fc_resp = supabase.table("flashcards").select("*").eq("topic_id", topic_id).execute()
    flashcards = fc_resp.data or []

    # Attach FSRS state
    if flashcards:
        card_ids = [fc["id"] for fc in flashcards]
        fs_resp = supabase.table("flashcard_states") \
            .select("*") \
            .eq("user_id", uid) \
            .in_("flashcard_id", card_ids) \
            .execute()
        fs_map = {fs["flashcard_id"]: fs for fs in (fs_resp.data or [])}

        for fc in flashcards:
            state = fs_map.get(fc["id"], {})
            fc["mastery_score"] = state.get("mastery_score", 0.0)
            fc["next_review_at"] = state.get("next_review_at", None)
            fc["review_count"] = state.get("review_count", 0)

    return {"topic_id": topic_id, "total": len(flashcards), "flashcards": flashcards}
