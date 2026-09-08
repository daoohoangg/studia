"""
Learning Paths API v2 — Study Goals + Adaptive Plans + Daily Tasks + Knowledge Graph
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import date, timedelta
from app.services.graph_engine import GraphEngine
from app.services.learning_engine import LearningEngine
from app.services.ai_engine import AIEngine
from app.services.rag_engine import RAGEngine
from app.core.supabase_client import get_supabase_client
from app.config import settings
import uuid

router = APIRouter(prefix="/learning-paths", tags=["Learning Paths & Adaptive Plans"])

DEFAULT_USER_ID = settings.DEFAULT_USER_ID


class SetGoalRequest(BaseModel):
    document_id: str
    goal_description: Optional[str] = "Học hiểu toàn bộ tài liệu"
    daily_minutes: int = 45
    deadline_days: int = 30
    user_id: Optional[str] = None


class GenerateLessonRequest(BaseModel):
    topic_id: str
    topic_name: str
    user_mastery: float = 0.0
    document_id: Optional[str] = None
    user_id: Optional[str] = None


@router.post("/set-goal")
async def set_goal(req: SetGoalRequest):
    """
    User đặt mục tiêu học tập cho một tài liệu.
    → Hệ thống tự động tạo lịch học theo ngày (Study Plan).
    """
    user_id = req.user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    # 1. Kiểm tra document tồn tại và đã processing xong
    doc_resp = supabase.table("documents").select("*").eq("id", req.document_id).execute()
    if not doc_resp.data:
        raise HTTPException(status_code=404, detail="Document không tồn tại")

    doc = doc_resp.data[0]
    if doc.get("processing_status") != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Document chưa xử lý xong (status: {doc.get('processing_status')}). Vui lòng đợi."
        )

    # 2. Lưu study goal
    goal_id = str(uuid.uuid4())
    deadline_date = (date.today() + timedelta(days=req.deadline_days)).isoformat()

    supabase.table("study_goals").insert({
        "id": goal_id,
        "user_id": user_id,
        "document_id": req.document_id,
        "goal_description": req.goal_description,
        "daily_minutes": req.daily_minutes,
        "deadline_days": req.deadline_days,
        "deadline_date": deadline_date,
        "is_active": True
    }).execute()

    # 3. Lấy topics của document (đã được sắp xếp)
    topics_resp = supabase.table("topics").select("*").eq("document_id", req.document_id).execute()
    topics = topics_resp.data or []

    rels_resp = supabase.table("topic_relationships").select("*").execute()
    topic_ids_set = {t["id"] for t in topics}
    rels = [r for r in (rels_resp.data or []) if r["source_topic_id"] in topic_ids_set]

    # 4. Topological sort
    ordered_topics = GraphEngine.build_topological_order(topics, rels)

    # 5. Lấy Knowledge States hiện tại
    ks_resp = supabase.table("knowledge_states") \
        .select("topic_id, mastery_score") \
        .eq("user_id", user_id) \
        .execute()
    knowledge_states = {ks["topic_id"]: ks["mastery_score"] for ks in (ks_resp.data or [])}

    # 6. Generate study plan
    study_goal = {
        "id": goal_id,
        "user_id": user_id,
        "deadline_days": req.deadline_days,
        "daily_minutes": req.daily_minutes
    }
    daily_plans = LearningEngine.generate_study_plan(study_goal, ordered_topics, knowledge_states)

    # 7. Lưu plans vào Supabase (upsert để tránh trùng ngày)
    saved_count = 0
    for plan in daily_plans:
        try:
            supabase.table("daily_learning_plans").upsert(
                plan,
                on_conflict="user_id,plan_date"
            ).execute()
            saved_count += 1
        except Exception as e:
            print(f"Plan save warning: {e}")

    # 8. Tạo Learning Path record
    lp_id = str(uuid.uuid4())
    supabase.table("learning_paths").insert({
        "id": lp_id,
        "user_id": user_id,
        "document_id": req.document_id,
        "title": f"Lộ trình: {doc.get('title', 'Tài liệu')}",
        "description": req.goal_description,
        "estimated_hours": (req.daily_minutes * req.deadline_days) / 60,
        "goal_description": req.goal_description,
        "daily_minutes": req.daily_minutes,
        "deadline_date": deadline_date,
        "total_days": req.deadline_days
    }).execute()

    return {
        "status": "success",
        "goal_id": goal_id,
        "learning_path_id": lp_id,
        "document_title": doc.get("title"),
        "topics_count": len(ordered_topics),
        "plan_days": saved_count,
        "deadline_date": deadline_date,
        "daily_minutes": req.daily_minutes,
        "message": f"Đã tạo lịch học {saved_count} ngày cho '{doc.get('title')}'"
    }


@router.get("/today")
async def get_today_plan(user_id: Optional[str] = None):
    """
    Lấy kế hoạch học tập hôm nay cho user.
    Trả về daily tasks, streak, và knowledge summary.
    """
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    # Lấy knowledge states kèm topic name
    ks_resp = supabase.table("knowledge_states") \
        .select("topic_id, mastery_score, retention_score, next_review_at, topics(name)") \
        .eq("user_id", uid) \
        .order("mastery_score", desc=True) \
        .execute()

    knowledge_states = []
    for ks in (ks_resp.data or []):
        topic_data = ks.get("topics") or {}
        knowledge_states.append({
            "topic_id": ks.get("topic_id"),
            "topic_name": topic_data.get("name", "Unknown") if isinstance(topic_data, dict) else "Unknown",
            "mastery_score": ks.get("mastery_score", 0),
            "retention_score": ks.get("retention_score", 1.0),
            "next_review_at": ks.get("next_review_at", "")
        })

    today_data = LearningEngine.get_today_tasks(uid, supabase, knowledge_states)
    profile = LearningEngine.calculate_knowledge_profile(knowledge_states)

    return {
        **today_data,
        "knowledge_profile": profile
    }


@router.get("/graph")
async def get_knowledge_graph(
    document_id: Optional[str] = None,
    user_id: Optional[str] = None
):
    """
    Lấy Knowledge Graph (Nodes + Edges) từ Supabase.
    Kèm theo Mastery Score của user cho từng topic.
    """
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    # Lấy topics
    topics_query = supabase.table("topics").select("*")
    if document_id:
        topics_query = topics_query.eq("document_id", document_id)
    topics_resp = topics_query.execute()
    topics = topics_resp.data or []

    # Lấy knowledge states
    ks_resp = supabase.table("knowledge_states") \
        .select("topic_id, mastery_score, retention_score") \
        .eq("user_id", uid) \
        .execute()
    ks_map = {ks["topic_id"]: ks for ks in (ks_resp.data or [])}

    # Build nodes
    nodes = [
        {
            "id": t["id"],
            "name": t["name"],
            "difficulty": t.get("difficulty_level", 1),
            "mastery": ks_map.get(t["id"], {}).get("mastery_score", 0),
            "retention": ks_map.get(t["id"], {}).get("retention_score", 1.0),
            "description": t.get("description", ""),
            "document_id": t.get("document_id", "")
        }
        for t in topics
    ]

    # Lấy edges
    if topics:
        topic_ids = [t["id"] for t in topics]
        rels_resp = supabase.table("topic_relationships").select("*").execute()
        topic_set = set(topic_ids)
        edges = [
            {
                "source": r["source_topic_id"],
                "target": r["target_topic_id"],
                "type": r.get("relationship_type", "related"),
                "weight": r.get("weight", 1.0)
            }
            for r in (rels_resp.data or [])
            if r["source_topic_id"] in topic_set and r["target_topic_id"] in topic_set
        ]
    else:
        edges = []

    return {"nodes": nodes, "edges": edges, "total_topics": len(nodes)}


@router.post("/generate-lesson")
async def generate_lesson(req: GenerateLessonRequest):
    """
    Sinh nội dung bài học cá nhân hóa cho một topic.
    Sử dụng RAG từ Supabase và Gemini LLM.
    """
    user_id = req.user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    # RAG: tìm kiếm context liên quan
    rag_chunks = []
    if supabase and req.document_id:
        rag_chunks = RAGEngine.search_relevant_chunks(
            query=req.topic_name,
            supabase_client=supabase,
            document_id=req.document_id,
            top_k=5
        )

    rag_texts = RAGEngine.extract_rag_texts(rag_chunks)

    lesson = AIEngine.generate_lesson(
        topic_name=req.topic_name,
        user_mastery=req.user_mastery,
        rag_context=rag_texts
    )

    # Lưu lesson vào Supabase
    if supabase and lesson:
        try:
            supabase.table("lessons").insert({
                "topic_id": req.topic_id,
                "title": lesson.get("title", f"Bài học: {req.topic_name}"),
                "content_markdown": lesson.get("content_markdown", ""),
                "key_takeaways": lesson.get("key_takeaways", [])
            }).execute()
        except Exception as e:
            print(f"Lesson save warning: {e}")

    return {
        **lesson,
        "topic_id": req.topic_id,
        "user_mastery": req.user_mastery,
        "rag_chunks_used": len(rag_chunks)
    }


@router.get("/plans")
async def get_study_plans(user_id: Optional[str] = None, days: int = 14):
    """Lấy lịch học theo tuần/tháng."""
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    start_date = date.today().isoformat()
    end_date = (date.today() + timedelta(days=days)).isoformat()

    resp = supabase.table("daily_learning_plans") \
        .select("*") \
        .eq("user_id", uid) \
        .gte("plan_date", start_date) \
        .lte("plan_date", end_date) \
        .order("plan_date") \
        .execute()

    return {"plans": resp.data or [], "date_range": {"from": start_date, "to": end_date}}
