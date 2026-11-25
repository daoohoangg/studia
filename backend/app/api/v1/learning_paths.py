"""
Learning Paths API v2 — Study Goals + Adaptive Plans + Daily Tasks + Knowledge Graph
"""
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import logging
import threading
import uuid

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.auth import current_user_id, require_owned, require_topic_owned
from app.core.supabase_client import get_supabase_client
from app.services.ai_engine import AIEngine
from app.services.graph_engine import GraphEngine
from app.services.learning_engine import LearningEngine
from app.services.rag_engine import RAGEngine
from app.services.schedule import can_mark_done, local_today

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/learning-paths", tags=["Learning Paths & Adaptive Plans"])

_plan_locks: Dict[tuple, threading.Lock] = {}
_plan_locks_guard = threading.Lock()


class SetGoalRequest(BaseModel):
    document_id: str
    goal_description: Optional[str] = Field("Học hiểu toàn bộ tài liệu", max_length=300)
    daily_minutes: int = Field(45, ge=5, le=480)
    deadline_days: int = Field(30, ge=1, le=365)
    user_id: Optional[str] = None


class GenerateLessonRequest(BaseModel):
    topic_id: str
    topic_name: str
    user_mastery: float = 0.0
    document_id: Optional[str] = None
    user_id: Optional[str] = None


@router.post("/set-goal")
def set_goal(req: SetGoalRequest):
    """
    User đặt mục tiêu học tập cho một tài liệu.
    → Hệ thống tự động tạo lịch học theo ngày (Study Plan).
    """
    user_id = current_user_id()
    require_owned("documents", req.document_id)
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
    deadline_date = (local_today() + timedelta(days=req.deadline_days)).isoformat()

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
            logger.warning(f"Plan save warning: {e}")

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


def _extract_topic_name(ks: Dict[str, Any], default: str = "Unknown") -> str:
    topic_data = ks.get("topics") or {}
    if isinstance(topic_data, dict):
        return topic_data.get("name", default)
    if isinstance(topic_data, list) and topic_data and isinstance(topic_data[0], dict):
        return topic_data[0].get("name", default)
    return default


@router.get("/today")
def get_today_plan(user_id: Optional[str] = None):
    """
    Lấy kế hoạch học tập hôm nay cho user.
    Trả về daily tasks, streak, và knowledge summary.
    """
    uid = current_user_id()
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    try:
        ks_resp = supabase.table("knowledge_states") \
            .select("topic_id, mastery_score, retention_score, next_review_at, topics(name)") \
            .eq("user_id", uid) \
            .order("mastery_score", desc=True) \
            .execute()

        raw_data = getattr(ks_resp, "data", []) or []
        knowledge_states = [
            {
                "topic_id": ks.get("topic_id"),
                "topic_name": _extract_topic_name(ks),
                "mastery_score": ks.get("mastery_score", 0),
                "retention_score": ks.get("retention_score", 1.0),
                "next_review_at": ks.get("next_review_at", "")
            }
            for ks in raw_data
        ]

        today_data = LearningEngine.get_today_tasks(uid, supabase, knowledge_states)
        profile = LearningEngine.calculate_knowledge_profile(knowledge_states)

        return {
            **today_data,
            "knowledge_profile": profile
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_today_plan: {e}")
        raise HTTPException(status_code=500, detail="Không thể tải kế hoạch học hôm nay")


@router.get("/graph")
def get_knowledge_graph(
    document_id: Optional[str] = None,
    user_id: Optional[str] = None
):
    """
    Lấy Knowledge Graph (Nodes + Edges) từ Supabase.
    Kèm theo Mastery Score của user cho từng topic.
    """
    uid = current_user_id()
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    if document_id:
        require_owned("documents", document_id)
        topics = supabase.table("topics").select("*").eq("document_id", document_id).execute().data or []
    else:
        own_docs = supabase.table("documents").select("id").eq("user_id", uid).execute().data or []
        shared_docs = supabase.table("documents").select("id").eq("visibility", "shared").execute().data or []
        accessible_doc_ids = list({d["id"] for d in own_docs + shared_docs if d.get("id")})
        topics = []
        for i in range(0, len(accessible_doc_ids), 100):
            batch = accessible_doc_ids[i:i + 100]
            topics.extend(supabase.table("topics").select("*").in_("document_id", batch).execute().data or [])

    # Lấy knowledge states
    ks_resp = supabase.table("knowledge_states") \
        .select("topic_id, mastery_score, retention_score") \
        .eq("user_id", uid) \
        .execute()
    ks_map = {ks["topic_id"]: ks for ks in (ks_resp.data or [])}

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

    if topics:
        topic_ids = [t["id"] for t in topics]
        topic_set = set(topic_ids)
        rels_resp = supabase.table("topic_relationships").select("*").execute()
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
def generate_lesson(req: GenerateLessonRequest):
    """
    Sinh nội dung bài học cá nhân hóa cho một topic.
    Sử dụng RAG từ Supabase và Gemini LLM.
    """
    current_user_id()
    require_topic_owned(req.topic_id, missing_ok=True)
    if req.document_id:
        require_owned("documents", req.document_id)
    supabase = get_supabase_client()

    # 1. Kiểm tra cache trong bảng lessons trước
    if supabase:
        try:
            cached_resp = supabase.table("lessons").select("*").eq("topic_id", req.topic_id).order("created_at", desc=True).limit(1).execute()
            if cached_resp.data:
                cached = cached_resp.data[0]
                return {
                    "title": cached.get("title") or f"Bài học: {req.topic_name}",
                    "content_markdown": cached.get("content_markdown") or "",
                    "key_takeaways": cached.get("key_takeaways") or [],
                    "topic_id": req.topic_id,
                    "user_mastery": req.user_mastery,
                    "rag_chunks_used": 5
                }
        except Exception as e:
            logger.warning(f"Cached lesson lookup warning: {e}")

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

    # Lưu lesson vào Supabase (trích nguyên văn từ sách thì không lưu như bài học)
    if supabase and lesson and lesson.get("source") != "book":
        try:
            supabase.table("lessons").insert({
                "topic_id": req.topic_id,
                "title": lesson.get("title", f"Bài học: {req.topic_name}"),
                "content_markdown": lesson.get("content_markdown", ""),
                "key_takeaways": lesson.get("key_takeaways", [])
            }).execute()
        except Exception as e:
            logger.warning(f"Lesson save warning: {e}")

    return {
        **lesson,
        "topic_id": req.topic_id,
        "user_mastery": req.user_mastery,
        "rag_chunks_used": len(rag_chunks)
    }


@router.get("/plans")
def get_study_plans(user_id: Optional[str] = None, days: int = Query(14, ge=1, le=365)):
    """Lấy lịch học theo tuần/tháng."""
    uid = current_user_id()
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    start_date = local_today().isoformat()
    end_date = (local_today() + timedelta(days=days)).isoformat()

    resp = supabase.table("daily_learning_plans") \
        .select("*") \
        .eq("user_id", uid) \
        .gte("plan_date", start_date) \
        .lte("plan_date", end_date) \
        .order("plan_date") \
        .execute()

    return {"plans": resp.data or [], "date_range": {"from": start_date, "to": end_date}}


class GenerateLessonV2Request(BaseModel):
    topic_id: str
    topic_name: str
    user_mastery: float = 0.0
    document_id: Optional[str] = None
    proficiency_level: Optional[str] = "intermediate"
    auto_save_vocabulary: bool = True
    user_id: Optional[str] = None


@router.post("/generate-lesson-v2")
def generate_lesson_v2(req: GenerateLessonV2Request):
    """
    Feature A: Sinh bài học i+1 với Vocabulary Highlights.
    Tự động phân tích từ vựng khó và giải thích bằng tiếng Việt inline.
    Tùy chọn auto-save vocabulary vào vocabulary_items table.
    """
    user_id = current_user_id()
    require_topic_owned(req.topic_id, missing_ok=True)
    if req.document_id:
        require_owned("documents", req.document_id)
    supabase = get_supabase_client()

    # 1. Kiểm tra cache trong bảng lessons trước
    if supabase:
        try:
            cached_resp = supabase.table("lessons").select("*").eq("topic_id", req.topic_id).order("created_at", desc=True).limit(1).execute()
            if cached_resp.data:
                cached = cached_resp.data[0]
                return {
                    "title": cached.get("title") or f"Bài học: {req.topic_name}",
                    "content_markdown": cached.get("content_markdown") or "",
                    "key_takeaways": cached.get("key_takeaways") or [],
                    "topic_id": req.topic_id,
                    "user_mastery": req.user_mastery,
                    "proficiency_level": req.proficiency_level or "intermediate",
                    "rag_chunks_used": 5,
                    "vocabulary_highlights": [],
                    "vocabulary_auto_saved": 0
                }
        except Exception as e:
            logger.warning(f"Cached lesson lookup warning: {e}")

    rag_chunks = []
    if supabase and req.document_id:
        rag_chunks = RAGEngine.search_relevant_chunks(
            query=req.topic_name,
            supabase_client=supabase,
            document_id=req.document_id,
            top_k=5
        )
    rag_texts = RAGEngine.extract_rag_texts(rag_chunks)

    lesson = AIEngine.generate_lesson_with_vocabulary(
        topic_name=req.topic_name,
        user_mastery=req.user_mastery,
        rag_context=rag_texts,
        proficiency_level=req.proficiency_level or "intermediate"
    )

    if supabase and lesson and lesson.get("source") != "book":
        try:
            supabase.table("lessons").insert({
                "topic_id": req.topic_id,
                "title": lesson.get("title", f"Bài học: {req.topic_name}"),
                "content_markdown": lesson.get("content_markdown", ""),
                "key_takeaways": lesson.get("key_takeaways", [])
            }).execute()
        except Exception as e:
            logger.warning(f"Lesson save warning: {e}")

    vocab_saved = []
    if req.auto_save_vocabulary and supabase:
        vocab_highlights = lesson.get("vocabulary_highlights", [])
        for item in vocab_highlights:
            word = item.get("word", "").strip()
            meaning_vi = item.get("meaning_vi", "").strip()
            if not word or not meaning_vi:
                continue
            try:
                supabase.table("vocabulary_items").insert({
                    "user_id": user_id,
                    "document_id": req.document_id,
                    "topic_id": req.topic_id,
                    "word": word,
                    "meaning_vi": meaning_vi,
                    "source_sentence": item.get("source_sentence", ""),
                    "word_type": item.get("word_type", "noun"),
                    "source": "lesson"
                }).execute()
                vocab_saved.append({"word": word, "meaning_vi": meaning_vi})
            except Exception:
                pass

    return {
        **lesson,
        "topic_id": req.topic_id,
        "user_mastery": req.user_mastery,
        "proficiency_level": req.proficiency_level,
        "rag_chunks_used": len(rag_chunks),
        "vocabulary_auto_saved": len(vocab_saved)
    }


@router.get("/today-interleaved")
def get_today_interleaved(user_id: Optional[str] = None):
    """
    Feature D: Lấy tasks hôm nay với Interleaved Adaptive Scheduling.
    Gộp due flashcards + lesson + quiz + scenario vào một session thống nhất.
    Ưu tiên: due flashcards → weak topic lesson → quiz → scenario.
    """
    uid = current_user_id()
    supabase = get_supabase_client()

    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    try:
        today = local_today().isoformat()
        now_iso = datetime.now(timezone.utc).isoformat()
        interleaved_tasks = []

        # 1. Lấy daily plan tasks (lesson, quiz, spaced_repetition)
        plan_resp = supabase.table("daily_learning_plans") \
            .select("*") \
            .eq("user_id", uid) \
            .eq("plan_date", today) \
            .execute()

        plan_tasks = []
        plan_id = None
        plan_status = "pending"
        if plan_resp.data:
            plan = plan_resp.data[0]
            plan_tasks = plan.get("tasks", [])
            plan_id = plan.get("id")
            plan_status = plan.get("status", "pending")

        # 2. Lấy due flashcards count
        due_flashcard_count = 0
        try:
            fc_resp = supabase.rpc("get_due_flashcards", {
                "p_user_id": uid,
                "p_limit": 30
            }).execute()
            due_flashcard_count = len(fc_resp.data or [])
        except Exception:
            fs_resp = supabase.table("flashcard_states") \
                .select("flashcard_id") \
                .eq("user_id", uid) \
                .lte("next_review_at", now_iso) \
                .execute()
            due_flashcard_count = len(fs_resp.data or [])

        # 3. Lấy weak topics (mastery < 50)
        ks_resp = supabase.table("knowledge_states") \
            .select("topic_id, mastery_score, topics(name)") \
            .eq("user_id", uid) \
            .lt("mastery_score", 50) \
            .order("mastery_score") \
            .limit(3) \
            .execute()
        weak_topics = [
            {"topic_id": ks["topic_id"], "topic_name": _extract_topic_name(ks, "Topic"), "mastery": ks["mastery_score"]}
            for ks in (ks_resp.data or [])
        ]

        # 4. Build interleaved task list
        if due_flashcard_count > 0:
            interleaved_tasks.append({
                "type": "flashcard_review",
                "icon": "🃏",
                "label": "Ôn Flashcard đến hạn",
                "duration_min": min(15, due_flashcard_count),
                "status": "pending",
                "card_count": due_flashcard_count,
                "priority": "high",
                "href": "/flashcards"
            })

        lesson_tasks = [t for t in plan_tasks if t.get("type") == "lesson"]
        quiz_tasks = [t for t in plan_tasks if t.get("type") == "quiz"]

        for wt in weak_topics[:1]:
            interleaved_tasks.append({
                "type": "lesson",
                "icon": "🔴",
                "label": f"Ôn tập yếu: {wt['topic_name']}",
                "topic_id": wt["topic_id"],
                "topic_name": wt["topic_name"],
                "duration_min": 20,
                "status": "pending",
                "priority": "high",
                "current_mastery": wt["mastery"],
                "is_remedial": True
            })

        interleaved_tasks.extend(lesson_tasks)
        interleaved_tasks.extend(quiz_tasks)

        spaced_tasks = [t for t in plan_tasks if t.get("type") == "spaced_repetition"]
        if spaced_tasks:
            first_spaced = spaced_tasks[0]
            interleaved_tasks.append({
                "type": "scenario",
                "icon": "🎭",
                "label": f"Tình huống thực tế: {first_spaced.get('topic_name', 'Roleplay')}",
                "topic_id": first_spaced.get("topic_id"),
                "topic_name": first_spaced.get("topic_name"),
                "duration_min": 20,
                "status": "pending",
                "priority": "medium",
                "href": "/scenarios"
            })
        else:
            interleaved_tasks.extend(spaced_tasks)

        total_minutes = sum(t.get("duration_min", 15) for t in interleaved_tasks)

        from app.services.schedule import streak_days
        streak = streak_days(supabase, uid)

        ks_all_resp = supabase.table("knowledge_states") \
            .select("topic_id, mastery_score, retention_score, next_review_at, topics(name)") \
            .eq("user_id", uid) \
            .order("mastery_score", desc=True) \
            .execute()

        knowledge_states = [
            {
                "topic_id": ks.get("topic_id"),
                "topic_name": _extract_topic_name(ks),
                "mastery_score": ks.get("mastery_score", 0),
                "retention_score": ks.get("retention_score", 1.0),
                "next_review_at": ks.get("next_review_at", "")
            }
            for ks in (ks_all_resp.data or [])
        ]

        profile = LearningEngine.calculate_knowledge_profile(knowledge_states)

        return {
            "plan_date": today,
            "plan_id": plan_id,
            "plan_status": plan_status,
            "interleaved_tasks": interleaved_tasks,
            "total_minutes": total_minutes,
            "task_count": len(interleaved_tasks),
            "due_flashcard_count": due_flashcard_count,
            "weak_topic_count": len(weak_topics),
            "streak_days": streak,
            "has_plan": bool(plan_id),
            "knowledge_profile": profile
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_today_interleaved: {e}")
        raise HTTPException(status_code=500, detail="Không thể tải lộ trình học hôm nay")


# ===== Quản lý lịch học: mục tiêu, trạng thái nhiệm vụ =====

class TaskStatusRequest(BaseModel):
    status: str  # pending | in_progress | completed | skipped


def _plan_status(tasks: List[Dict[str, Any]]) -> str:
    states = [t.get("status", "pending") for t in tasks]
    if states and all(s in ("completed", "skipped") for s in states):
        return "completed" if any(s == "completed" for s in states) else "skipped"
    if any(s in ("completed", "in_progress", "skipped") for s in states):
        return "in_progress"
    return "pending"


@router.patch("/plans/{plan_date}/tasks/{task_index}")
def update_task_status(plan_date: str, task_index: int, req: TaskStatusRequest):
    """Đánh dấu một nhiệm vụ trong lịch học (và tự cập nhật trạng thái cả ngày)."""
    if req.status not in ("pending", "in_progress", "completed", "skipped"):
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")
    try:
        day = date.fromisoformat(plan_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Ngày không hợp lệ, cần dạng YYYY-MM-DD")
    uid = current_user_id()
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    key = (uid, plan_date)
    with _plan_locks_guard:
        lock = _plan_locks.setdefault(key, threading.Lock())
    with lock:
        resp = supabase.table("daily_learning_plans").select("*") \
            .eq("user_id", uid).eq("plan_date", plan_date).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Không có lịch học cho ngày này")
        plan = resp.data[0]
        tasks = list(plan.get("tasks") or [])
        if task_index < 0 or task_index >= len(tasks):
            raise HTTPException(status_code=404, detail="Không có nhiệm vụ này")

        if req.status == "completed" and tasks[task_index].get("status") != "completed" and not can_mark_done(day):
            raise HTTPException(status_code=422, detail="Chỉ đánh dấu hoàn thành nhiệm vụ của hôm nay hoặc hôm qua")
        tasks[task_index] = {**tasks[task_index], "status": req.status}
        new_status = _plan_status(tasks)
        supabase.table("daily_learning_plans").update({"tasks": tasks, "status": new_status}) \
            .eq("user_id", uid).eq("plan_date", plan_date).execute()
    return {"plan_date": plan_date, "tasks": tasks, "status": new_status}


@router.get("/goals")
def list_goals():
    """Danh sách mục tiêu học đang hoạt động kèm tên tài liệu."""
    uid = current_user_id()
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")
    goals = supabase.table("study_goals").select("*").eq("user_id", uid).execute().data or []
    goals = [g for g in goals if g.get("is_active", True)]
    titles: Dict[str, str] = {}
    doc_ids = list({g.get("document_id") for g in goals if g.get("document_id")})
    if doc_ids:
        for i in range(0, len(doc_ids), 100):
            for d in (supabase.table("documents").select("id, title").in_("id", doc_ids[i:i + 100]).execute().data or []):
                titles[d["id"]] = d.get("title") or "Tài liệu"
    for g in goals:
        g["document_title"] = titles.get(g.get("document_id"), "Tài liệu")
    goals.sort(key=lambda g: g.get("created_at") or "", reverse=True)
    return {"goals": goals}


@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: str):
    """Huỷ mục tiêu và xoá các ngày học chưa hoàn thành của mục tiêu đó."""
    uid = current_user_id()
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")
    goal = supabase.table("study_goals").select("id").eq("id", goal_id).eq("user_id", uid).execute().data
    if not goal:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục tiêu")

    plans = supabase.table("daily_learning_plans").select("plan_date,status") \
        .eq("user_id", uid).eq("study_goal_id", goal_id).execute().data or []
    removed = 0
    for p in plans:
        if p.get("status") != "completed":
            supabase.table("daily_learning_plans").delete() \
                .eq("user_id", uid).eq("plan_date", p["plan_date"]).execute()
            removed += 1
    supabase.table("study_goals").update({"is_active": False}).eq("id", goal_id).eq("user_id", uid).execute()
    return {"status": "success", "removed_days": removed}
