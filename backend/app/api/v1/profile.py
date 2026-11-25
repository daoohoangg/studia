"""
Hồ sơ học tập (onboarding) và kết quả kiểm tra trình độ.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.auth import current_user_id, forget_owned
from app.core.supabase_client import get_supabase_client
from app.core.uploads import DOCUMENTS_BUCKET, storage_path_from

router = APIRouter(prefix="/profile", tags=["Profile"])
logger = logging.getLogger("studia.profile")

# Bảng gắn với người dùng qua cột user_id (xuất dữ liệu và xoá tài khoản dùng chung danh sách này).
USER_TABLES = (
    "user_profiles", "placement_results", "vocabulary_items", "error_logs", "knowledge_states",
    "flashcard_states", "question_attempts", "review_schedules", "study_goals", "daily_learning_plans",
    "learning_paths", "ai_chat_sessions", "exam_sessions", "exam_sets", "document_notes",
    "document_highlights", "reading_progress", "study_slots", "study_moments", "reminder_log",
    "friend_profiles", "moment_reactions", "push_tokens", "documents",
)
EXPORT_TABLES = ("user_profiles", "placement_results", "vocabulary_items", "error_logs",
                 "knowledge_states", "flashcard_states", "study_goals", "study_slots", "exam_sessions")

SECTIONS = ("vocab", "grammar", "reading", "listening")


def _db():
    db = get_supabase_client()
    if not db:
        raise HTTPException(status_code=503, detail="Cơ sở dữ liệu không khả dụng")
    return db


class ProfileIn(BaseModel):
    purpose: str = Field(default="", max_length=60)
    kind: str = Field(default="Academic", pattern="^(Academic|General Training)$")
    target: float = Field(default=7.0, ge=4.0, le=9.0)
    examDate: str = Field(default="", max_length=10)
    noExam: bool = True
    level: str = Field(default="", max_length=40)
    minutes: int = Field(default=30, ge=5, le=240)
    days: List[str] = Field(default_factory=list, max_length=7)
    remindAt: str = Field(default="20:30", max_length=5)
    completedAt: Optional[str] = None


class SectionScore(BaseModel):
    right: int = Field(ge=0, le=100)
    total: int = Field(ge=1, le=100)


class PlacementIn(BaseModel):
    band: float = Field(ge=0, le=9)
    per: Dict[str, SectionScore]


@router.get("")
def get_profile():
    uid = current_user_id()
    db = _db()
    prof = db.table("user_profiles").select("*").eq("user_id", uid).limit(1).execute().data or []
    plc = (db.table("placement_results").select("*").eq("user_id", uid)
           .order("created_at", desc=True).limit(1).execute().data or [])
    return {
        "profile": prof[0]["data"] if prof else None,
        "placement": ({"band": float(plc[0]["band"]), "per": plc[0].get("per_section") or {},
                       "at": plc[0].get("created_at")} if plc else None),
    }


@router.put("")
def save_profile(body: ProfileIn):
    uid = current_user_id()
    db = _db()
    data = body.model_dump()
    now = datetime.now(timezone.utc).isoformat()
    exists = db.table("user_profiles").select("user_id").eq("user_id", uid).limit(1).execute().data
    if exists:
        db.table("user_profiles").update({"data": data, "updated_at": now}).eq("user_id", uid).execute()
    else:
        db.table("user_profiles").insert({"user_id": uid, "data": data, "updated_at": now}).execute()
    return {"profile": data}


@router.post("/placement")
def save_placement(body: PlacementIn):
    uid = current_user_id()
    unknown = [k for k in body.per if k not in SECTIONS]
    if unknown:
        raise HTTPException(status_code=422, detail=f"Phần không hợp lệ: {', '.join(unknown)}")
    for k, v in body.per.items():
        if v.right > v.total:
            raise HTTPException(status_code=422, detail=f"Số câu đúng vượt tổng ở phần {k}")
    row = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "band": round(body.band * 2) / 2,  # band IELTS làm tròn 0.5
        "per_section": {k: v.model_dump() for k, v in body.per.items()},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _db().table("placement_results").insert(row).execute()
    return {"placement": {"band": row["band"], "per": row["per_section"], "at": row["created_at"]}}


@router.get("/export")
def export_my_data():
    """Toàn bộ dữ liệu học của tôi (từ vựng, lỗi sai, kết quả thi...) dạng JSON."""
    uid = current_user_id()
    db = _db()
    out: dict = {"exported_at": datetime.now(timezone.utc).isoformat(), "user_id": uid}
    for table in EXPORT_TABLES:
        try:
            out[table] = db.table(table).select("*").eq("user_id", uid).execute().data or []
        except Exception as e:
            logger.debug(f"export skip {table}: {e}")
            out[table] = []
    return out


class DeleteAccountIn(BaseModel):
    confirm_email: str


def _collect_media_paths(value, prefix: str, out: List[str]) -> None:
    if isinstance(value, str) and value.startswith(prefix):
        out.append(value[len(prefix):])
    elif isinstance(value, dict):
        for v in value.values():
            _collect_media_paths(v, prefix, out)
    elif isinstance(value, list):
        for v in value:
            _collect_media_paths(v, prefix, out)


def _remove_storage_objects(db, bucket: str, paths: List[str]) -> None:
    clean = [p for p in paths if p]
    for i in range(0, len(clean), 100):
        try:
            db.storage.from_(bucket).remove(clean[i:i + 100])
        except Exception as e:
            logger.warning(f"remove storage objects from {bucket} failed: {e}")


def _cleanup_user_storage(db, uid: str) -> List[str]:
    """Thu thập và xoá tệp thuộc user khỏi các bucket trước khi xoá bản ghi DB."""
    doc_ids: List[str] = []
    try:
        docs = db.table("documents").select("id, file_path").eq("user_id", uid).execute().data or []
        doc_ids = [str(d["id"]) for d in docs if d.get("id")]
        doc_paths = [p for p in (storage_path_from(d.get("file_path")) for d in docs) if p]
        _remove_storage_objects(db, DOCUMENTS_BUCKET, doc_paths)
    except Exception as e:
        logger.warning(f"cleanup documents storage failed: {e}")

    try:
        moments = db.table("study_moments").select("path").eq("user_id", uid).execute().data or []
        _remove_storage_objects(db, "moments", [m.get("path") for m in moments if m.get("path")])
    except Exception as e:
        logger.warning(f"cleanup moments storage failed: {e}")

    try:
        sets = db.table("exam_sets").select("listening_audio_path, content").eq("user_id", uid).execute().data or []
        audio_paths = [s["listening_audio_path"] for s in sets if s.get("listening_audio_path")]
        _remove_storage_objects(db, "exam-audio", audio_paths)
        media_paths: List[str] = []
        for s in sets:
            _collect_media_paths(s.get("content"), "media://", media_paths)
        _remove_storage_objects(db, "exam-media", media_paths)
    except Exception as e:
        logger.warning(f"cleanup exam storage failed: {e}")

    return doc_ids


@router.post("/delete-account")
def delete_account(body: DeleteAccountIn):
    """Xoá vĩnh viễn dữ liệu và tài khoản của chính mình. Quản lý không tự xoá được."""
    from app.core.accounts import current_account, invalidate

    uid = current_user_id()
    acc = current_account()
    if acc.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Tài khoản quản lý không xoá được ở đây")
    email = (acc.get("email") or "").strip().lower()
    if not email or body.confirm_email.strip().lower() != email:
        raise HTTPException(status_code=400, detail="Email xác nhận không khớp")

    db = _db()
    doc_ids = _cleanup_user_storage(db, uid)

    for col in ("requester_id", "addressee_id"):
        try:
            db.table("friendships").delete().eq(col, uid).execute()
        except Exception as e:
            logger.warning(f"delete friendships.{col} failed: {e}")

    for table in USER_TABLES:
        try:
            db.table(table).delete().eq("user_id", uid).execute()
        except Exception as e:
            logger.warning(f"delete {table} failed: {e}")
    for table, col in (("learning_profiles", "id"), ("credit_ledger", "user_id"), ("payment_orders", "user_id")):
        try:
            db.table(table).delete().eq(col, uid).execute()
        except Exception as e:
            logger.debug(f"delete {table} failed: {e}")
    try:
        db.table("user_accounts").delete().eq("id", uid).execute()
    except Exception as e:
        logger.warning(f"delete user_accounts failed: {e}")

    for did in doc_ids:
        forget_owned("documents", did)

    auth_deleted = False
    real = getattr(db, "real_client", None)
    if real is not None:
        try:
            real.auth.admin.delete_user(uid)
            auth_deleted = True
        except Exception as e:
            logger.warning(f"auth delete failed: {e}")
    invalidate(uid)
    return {"deleted": True, "auth_deleted": auth_deleted}
