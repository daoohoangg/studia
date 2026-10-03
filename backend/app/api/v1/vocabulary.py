"""
Vocabulary API — Feature C: Contextual Vocabulary Learning
Quản lý từ vựng ngữ cảnh: trích xuất từ bài học, sinh vocabulary card chi tiết,
lưu vào FSRS flashcard, theo dõi mastery từ vựng của user.
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
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vocabulary", tags=["Vocabulary Learning"])

DEFAULT_USER_ID = settings.DEFAULT_USER_ID


class ExtractVocabularyRequest(BaseModel):
    lesson_content: str
    topic_id: Optional[str] = None
    document_id: Optional[str] = None
    vocabulary_highlights: Optional[List[Dict[str, Any]]] = []  # Từ lesson_with_vocabulary
    user_id: Optional[str] = None


class VocabularyCardRequest(BaseModel):
    word: str
    source_sentence: str
    document_id: Optional[str] = None
    topic_id: Optional[str] = None
    user_id: Optional[str] = None


class SaveVocabularyRequest(BaseModel):
    word: str
    meaning_vi: str
    source_sentence: Optional[str] = ""
    example_sentences: Optional[List[Dict[str, str]]] = []
    collocations: Optional[List[str]] = []
    pronunciation: Optional[str] = ""
    word_type: Optional[str] = "noun"
    topic_id: Optional[str] = None
    document_id: Optional[str] = None
    source: Optional[str] = "lesson"
    create_flashcard: bool = True
    user_id: Optional[str] = None


class ReviewVocabularyRequest(BaseModel):
    vocabulary_id: str
    rating: int  # 1=Again, 2=Hard, 3=Good, 4=Easy
    user_id: Optional[str] = None


@router.post("/extract")
async def extract_vocabulary_from_lesson(req: ExtractVocabularyRequest):
    """
    Trích xuất và lưu danh sách từ vựng từ nội dung bài học.
    Nhận vocabulary_highlights từ generate_lesson_with_vocabulary,
    hoặc tự trích xuất từ lesson_content nếu không có.
    """
    user_id = req.user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    vocab_to_save = req.vocabulary_highlights or []

    # Nếu không có highlights từ AI, tự extract từ RAG context
    if not vocab_to_save and req.document_id and req.topic_id:
        rag_chunks = RAGEngine.search_relevant_chunks(
            query=req.lesson_content[:200],
            supabase_client=supabase,
            document_id=req.document_id,
            top_k=3
        )
        rag_texts = RAGEngine.extract_rag_texts(rag_chunks)
        # Sinh lesson với vocabulary để có highlights
        lesson_data = AIEngine.generate_lesson_with_vocabulary(
            topic_name="Từ vựng bài học",
            user_mastery=0,
            rag_context=rag_texts
        )
        vocab_to_save = lesson_data.get("vocabulary_highlights", [])

    saved = []
    for item in vocab_to_save:
        word = item.get("word", "").strip()
        meaning_vi = item.get("meaning_vi", "").strip()
        if not word or not meaning_vi:
            continue

        vocab_id = str(uuid.uuid4())
        try:
            supabase.table("vocabulary_items").insert({
                "id": vocab_id,
                "user_id": user_id,
                "document_id": req.document_id,
                "topic_id": req.topic_id,
                "word": word,
                "meaning_vi": meaning_vi,
                "source_sentence": item.get("source_sentence", ""),
                "word_type": item.get("word_type", "noun"),
                "source": "lesson"
            }).execute()
            saved.append({"id": vocab_id, "word": word, "meaning_vi": meaning_vi})
        except Exception as e:
            logger.warning(f"Vocabulary save warning for '{word}': {e}")

    return {
        "status": "success",
        "saved_count": len(saved),
        "vocabulary_items": saved,
        "message": f"Đã lưu {len(saved)} từ vựng từ bài học"
    }


@router.post("/card")
async def get_vocabulary_card(req: VocabularyCardRequest):
    """
    Sinh Vocabulary Card chi tiết cho một từ vựng.
    Trả về meaning_vi, examples, collocations, pronunciation.
    """
    user_id = req.user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    # Lấy RAG context nếu có document_id
    rag_chunks = []
    if supabase and req.document_id:
        rag_chunks = RAGEngine.search_relevant_chunks(
            query=req.word + " " + req.source_sentence,
            supabase_client=supabase,
            document_id=req.document_id,
            top_k=3
        )
    rag_texts = RAGEngine.extract_rag_texts(rag_chunks)

    # Sinh vocabulary card via Gemini
    card_data = AIEngine.generate_vocabulary_card(
        word=req.word,
        source_sentence=req.source_sentence,
        rag_context=rag_texts
    )

    return {
        **card_data,
        "topic_id": req.topic_id,
        "document_id": req.document_id,
        "rag_chunks_used": len(rag_chunks)
    }


@router.post("/save")
async def save_vocabulary_item(req: SaveVocabularyRequest):
    """
    Lưu một vocabulary item vào database.
    Tùy chọn tạo flashcard FSRS tương ứng.
    """
    user_id = req.user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    vocab_id = str(uuid.uuid4())
    flashcard_id = None

    # Tạo flashcard nếu yêu cầu
    if req.create_flashcard:
        topic_id = req.topic_id
        if not topic_id:
            # Tạo topic "Vocabulary" nếu chưa có
            topic_id = str(uuid.uuid4())
            try:
                supabase.table("topics").insert({
                    "id": topic_id,
                    "name": "Từ vựng tự học",
                    "slug": f"vocab-{topic_id[:8]}",
                    "description": "Từ vựng tự tích lũy trong quá trình học",
                    "difficulty_level": 2
                }).execute()
            except Exception:
                pass

        flashcard_id = str(uuid.uuid4())
        # Front: từ vựng | Back: nghĩa + ví dụ
        back_content = f"**{req.meaning_vi}**"
        if req.example_sentences:
            ex = req.example_sentences[0]
            back_content += f"\n\n📌 Ví dụ: {ex.get('en', '')}\n→ {ex.get('vi', '')}"
        if req.collocations:
            back_content += f"\n\n🔗 Cụm từ: {', '.join(req.collocations[:3])}"

        try:
            supabase.table("flashcards").insert({
                "id": flashcard_id,
                "topic_id": topic_id,
                "document_id": req.document_id,
                "front": f"🔤 {req.word}" + (f"\n\n_{req.source_sentence}_" if req.source_sentence else ""),
                "back": back_content,
                "source_chunk": req.source_sentence or "",
                "card_type": "definition"
            }).execute()

            # Khởi tạo FSRS state
            supabase.table("flashcard_states").insert({
                "user_id": user_id,
                "flashcard_id": flashcard_id,
                "stability": 1.0,
                "difficulty_rating": 5.0,
                "mastery_score": 0.0,
                "next_review_at": "now()"
            }).execute()
        except Exception as e:
            logger.warning(f"Flashcard creation failed for '{req.word}': {e}")
            flashcard_id = None

    # Lưu vocabulary item
    try:
        supabase.table("vocabulary_items").insert({
            "id": vocab_id,
            "user_id": user_id,
            "document_id": req.document_id,
            "topic_id": req.topic_id,
            "word": req.word,
            "meaning_vi": req.meaning_vi,
            "source_sentence": req.source_sentence or "",
            "example_sentences": req.example_sentences or [],
            "collocations": req.collocations or [],
            "pronunciation": req.pronunciation or "",
            "word_type": req.word_type or "noun",
            "flashcard_id": flashcard_id,
            "source": req.source or "lesson"
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lưu vocabulary: {e}")

    return {
        "status": "success",
        "vocabulary_id": vocab_id,
        "flashcard_id": flashcard_id,
        "word": req.word,
        "message": f"Đã lưu từ vựng '{req.word}'" + (" và tạo flashcard FSRS" if flashcard_id else "")
    }


@router.get("/list")
async def get_vocabulary_list(
    user_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    document_id: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    Lấy danh sách từ vựng đã học của user.
    Hỗ trợ filter theo topic, document, source.
    """
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    try:
        query = supabase.table("vocabulary_items") \
            .select("*") \
            .eq("user_id", uid) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1)

        if topic_id:
            query = query.eq("topic_id", topic_id)
        if document_id:
            query = query.eq("document_id", document_id)
        if source:
            query = query.eq("source", source)

        resp = query.execute()
        items = resp.data or []

        # Lấy vocab stats
        try:
            stats_resp = supabase.rpc("get_vocabulary_stats", {"p_user_id": uid}).execute()
            stats = stats_resp.data[0] if stats_resp.data else {"total_words": 0, "avg_mastery": 0}
        except Exception:
            stats = {"total_words": len(items), "avg_mastery": 0}

        return {
            "user_id": uid,
            "vocabulary_items": items,
            "count": len(items),
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_vocabulary_stats(user_id: Optional[str] = None):
    """Thống kê từ vựng của user: tổng số, mastery trung bình, phân bổ theo nguồn."""
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    try:
        # Tổng count
        total_resp = supabase.table("vocabulary_items") \
            .select("id, source, mastery_score") \
            .eq("user_id", uid) \
            .execute()
        items = total_resp.data or []

        total = len(items)
        by_source = {}
        total_mastery = 0
        for item in items:
            src = item.get("source", "lesson")
            by_source[src] = by_source.get(src, 0) + 1
            total_mastery += item.get("mastery_score", 0)

        avg_mastery = total_mastery / total if total > 0 else 0

        return {
            "user_id": uid,
            "total_words": total,
            "avg_mastery": round(avg_mastery, 1),
            "by_source": by_source,
            "mastered_count": sum(1 for i in items if i.get("mastery_score", 0) >= 80),
            "learning_count": sum(1 for i in items if i.get("mastery_score", 0) < 80)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{vocabulary_id}")
async def delete_vocabulary_item(vocabulary_id: str, user_id: Optional[str] = None):
    """Xóa một vocabulary item của user."""
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    try:
        supabase.table("vocabulary_items") \
            .delete() \
            .eq("id", vocabulary_id) \
            .eq("user_id", uid) \
            .execute()
        return {"status": "success", "message": "Đã xóa từ vựng"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
