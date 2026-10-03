"""
Export & Integration API — Anki Flashcards CSV Export & iCalendar (.ics) Study Plan Export
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from typing import Optional, List
from app.services.export_engine import ExportEngine
from app.core.supabase_client import get_supabase_client
from app.config import settings

router = APIRouter(prefix="/export", tags=["Export & Integration"])
DEFAULT_USER_ID = settings.DEFAULT_USER_ID


@router.get("/flashcards/anki/{topic_id}")
async def export_flashcards_anki(topic_id: str):
    """
    Xuất tất cả Flashcards của một topic ra tệp Anki CSV/TSV (.apkg importable).
    """
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    resp = supabase.table("flashcards").select("*").eq("topic_id", topic_id).execute()
    cards = resp.data or []

    if not cards:
        raise HTTPException(status_code=404, detail="Không có flashcards nào cho topic này")

    csv_content = ExportEngine.export_flashcards_anki_csv(cards)

    return Response(
        content=csv_content,
        media_type="text/tab-separated-values",
        headers={"Content-Disposition": f"attachment; filename=flashcards_topic_{topic_id[:8]}.tsv"}
    )


@router.get("/flashcards/json/{topic_id}")
async def export_flashcards_json(topic_id: str):
    """Xuất Flashcards dạng JSON."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    resp = supabase.table("flashcards").select("*").eq("topic_id", topic_id).execute()
    cards = resp.data or []

    return {"topic_id": topic_id, "count": len(cards), "flashcards": cards}


@router.get("/schedule/ical")
async def export_schedule_ical(user_id: Optional[str] = None):
    """
    Xuất Lịch học Thích ứng ra tệp iCalendar (.ics) để đồng bộ Google Calendar / Outlook.
    """
    uid = user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    resp = supabase.table("daily_learning_plans") \
        .select("*") \
        .eq("user_id", uid) \
        .order("plan_date") \
        .execute()

    plans = resp.data or []
    ical_content = ExportEngine.export_schedule_ical(plans, "Lịch Học Studia Adaptive")

    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=studia_study_schedule.ics"}
    )
