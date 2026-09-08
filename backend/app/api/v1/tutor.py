"""
AI Tutor API — RAG-based Q&A Chat với context từ sách đã upload
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from app.services.ai_engine import AIEngine
from app.services.rag_engine import RAGEngine
from app.core.supabase_client import get_supabase_client
from app.config import settings
import uuid

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])

DEFAULT_USER_ID = settings.DEFAULT_USER_ID


class AskRequest(BaseModel):
    question: str
    document_id: Optional[str] = None
    topic_id: Optional[str] = None
    session_id: Optional[str] = None   # Nếu có → tiếp tục conversation
    user_id: Optional[str] = None


class CreateSessionRequest(BaseModel):
    document_id: Optional[str] = None
    topic_id: Optional[str] = None
    user_id: Optional[str] = None


@router.post("/ask")
async def ask_ai_tutor(req: AskRequest):
    """
    AI Tutor: Trả lời câu hỏi của người dùng dựa trên RAG context từ sách.
    Ghi lại conversation history vào Supabase.
    """
    user_id = req.user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    # 1. Lấy document title nếu có
    document_title = ""
    if supabase and req.document_id:
        doc_resp = supabase.table("documents").select("title").eq("id", req.document_id).execute()
        if doc_resp.data:
            document_title = doc_resp.data[0].get("title", "")

    # 2. RAG: tìm context liên quan từ sách
    rag_chunks = []
    if supabase and req.document_id:
        rag_chunks = RAGEngine.search_relevant_chunks(
            query=req.question,
            supabase_client=supabase,
            document_id=req.document_id,
            top_k=5,
            threshold=0.35
        )

    rag_texts = RAGEngine.extract_rag_texts(rag_chunks)

    # 3. Lấy chat history từ session
    chat_history = []
    session_id = req.session_id
    if supabase and session_id:
        session_resp = supabase.table("ai_chat_sessions") \
            .select("messages") \
            .eq("id", session_id) \
            .execute()
        if session_resp.data:
            chat_history = session_resp.data[0].get("messages", [])

    # 4. Gọi AI Tutor
    ai_response = AIEngine.generate_ai_tutor_response(
        question=req.question,
        rag_context=rag_texts,
        chat_history=chat_history,
        document_title=document_title
    )

    # 5. Cập nhật/tạo session
    now = datetime.now(timezone.utc).isoformat()
    new_messages = chat_history + [
        {"role": "user", "content": req.question, "timestamp": now},
        {
            "role": "assistant",
            "content": ai_response.get("answer", ""),
            "timestamp": now,
            "sources": [
                {"chunk_index": c.get("chunk_index", 0), "similarity": c.get("similarity", 0)}
                for c in rag_chunks[:3]
            ]
        }
    ]

    if supabase:
        try:
            if session_id:
                supabase.table("ai_chat_sessions").update({
                    "messages": new_messages,
                    "updated_at": now
                }).eq("id", session_id).execute()
            else:
                session_id = str(uuid.uuid4())
                supabase.table("ai_chat_sessions").insert({
                    "id": session_id,
                    "user_id": user_id,
                    "document_id": req.document_id,
                    "topic_id": req.topic_id,
                    "messages": new_messages,
                    "title": req.question[:80]
                }).execute()
        except Exception as e:
            print(f"Session save warning: {e}")

    return {
        "session_id": session_id,
        "question": req.question,
        "answer": ai_response.get("answer", ""),
        "confidence": ai_response.get("confidence", 0.5),
        "related_concepts": ai_response.get("related_concepts", []),
        "follow_up_suggestions": ai_response.get("follow_up_suggestions", []),
        "sources": [
            {
                "content_preview": c.get("content", "")[:150] + "...",
                "similarity": c.get("similarity", 0),
                "section_title": c.get("section_title", "")
            }
            for c in rag_chunks[:3]
        ],
        "document_title": document_title
    }


@router.get("/sessions")
async def get_chat_sessions(user_id: Optional[str] = None):
    """Lấy danh sách các phiên chat của user."""
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    resp = supabase.table("ai_chat_sessions") \
        .select("id, title, document_id, topic_id, created_at, updated_at") \
        .eq("user_id", uid) \
        .order("updated_at", desc=True) \
        .limit(20) \
        .execute()

    return {"sessions": resp.data or []}


@router.get("/sessions/{session_id}")
async def get_session_messages(session_id: str):
    """Lấy toàn bộ messages của một session."""
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    resp = supabase.table("ai_chat_sessions").select("*").eq("id", session_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Session không tồn tại")

    return resp.data[0]
