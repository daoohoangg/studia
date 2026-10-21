"""Cấu hình hệ thống: phần công khai cho frontend và phần chỉnh sửa dành cho quản lý."""
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from app.config import settings
from app.services import mailer, sysconfig

public_router = APIRouter(prefix="/config", tags=["Config public"])
admin_router = APIRouter(prefix="/admin", tags=["Admin config"])


@public_router.get("/public")
def public_config(response: Response):
    """Công khai, chỉ đọc: tính năng đang bật, banner, nội dung luyện tập, giới hạn upload."""
    response.headers["Cache-Control"] = "public, max-age=15"
    return sysconfig.public_config()


# ---------------------------------------------------------------- tính năng & giới hạn
def _config_state() -> dict:
    flags = sysconfig.feature_flags()
    return {
        "features": [{"id": k, "label": v[0], "description": v[1], "enabled": flags[k]} for k, v in sysconfig.FEATURES.items()],
        "limits": sysconfig.limits_state(),
        "reminders": {
            "enabled": sysconfig.reminders_enabled(),
            "env_enabled": settings.REMINDERS_ENABLED,
            "smtp_configured": mailer.smtp_configured(),
        },
        "ai": {
            "provider": settings.LLM_PROVIDER,
            "model": settings.GEMINI_PRO_MODEL,
            "gemini_configured": bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here"),
        },
    }


@admin_router.get("/config")
def get_config():
    return _config_state()


class ConfigRequest(BaseModel):
    features: Optional[Dict[str, bool]] = None
    limits: Optional[Dict[str, Optional[int]]] = None  # null = quay về giá trị trong .env
    reminders_enabled: Optional[bool] = None


@admin_router.put("/config")
def put_config(req: ConfigRequest):
    if req.features is not None:
        unknown = [k for k in req.features if k not in sysconfig.FEATURES]
        if unknown:
            raise HTTPException(status_code=400, detail=f"Tính năng không tồn tại: {', '.join(unknown)}")
        flags = sysconfig.feature_flags()
        flags.update(req.features)
        sysconfig.save("feature_flags", flags)
    if req.limits is not None:
        stored = dict(sysconfig._raw("limits") or {})
        for name, v in req.limits.items():
            if name not in sysconfig.LIMITS:
                raise HTTPException(status_code=400, detail=f"Giới hạn không tồn tại: {name}")
            if v is None:
                stored.pop(name, None)
                continue
            lo, hi = sysconfig.LIMITS[name]
            if not lo <= v <= hi:
                raise HTTPException(status_code=400, detail=f"{name} phải từ {lo} đến {hi}")
            stored[name] = v
        sysconfig.save("limits", stored)
    if req.reminders_enabled is not None:
        sysconfig.save("reminders_enabled", req.reminders_enabled)
    return _config_state()


# ---------------------------------------------------------------- nội dung & thông báo
class Announcement(BaseModel):
    enabled: bool = False
    text: str = ""
    level: str = "info"


class ContentRequest(BaseModel):
    announcement: Optional[Announcement] = None
    # Danh sách đầy đủ để thay thế; null (khoá có mặt nhưng giá trị null) = quay về bộ có sẵn trong app
    dictation_segments: Optional[Any] = None
    pronunciation_sentences: Optional[Any] = None


def _content_state() -> dict:
    return {
        "announcement": sysconfig.announcement(),
        "dictation_segments": sysconfig.custom_list("dictation_segments"),
        "pronunciation_sentences": sysconfig.custom_list("pronunciation_sentences"),
    }


@admin_router.get("/content")
def get_content():
    return _content_state()


@admin_router.put("/content")
def put_content(req: ContentRequest):
    sent = req.model_fields_set
    if req.announcement is not None:
        a = req.announcement
        text = " ".join(a.text.split())
        if len(text) > sysconfig.ANNOUNCEMENT_MAX:
            raise HTTPException(status_code=400, detail=f"Thông báo tối đa {sysconfig.ANNOUNCEMENT_MAX} ký tự")
        if a.level not in sysconfig.ANNOUNCEMENT_LEVELS:
            raise HTTPException(status_code=400, detail="Mức thông báo phải là info hoặc warning")
        if a.enabled and not text:
            raise HTTPException(status_code=400, detail="Nhập nội dung thông báo trước khi bật")
        sysconfig.save("announcement", {"enabled": a.enabled, "text": text, "level": a.level})
    for key, cleaner in (("dictation_segments", sysconfig.clean_dictation), ("pronunciation_sentences", sysconfig.clean_pronunciation)):
        if key not in sent:
            continue
        value = getattr(req, key)
        if value is None:
            sysconfig.save(key, [])  # cột value là JSONB NOT NULL: danh sách rỗng nghĩa là "dùng bộ có sẵn"
            continue
        try:
            sysconfig.save(key, cleaner(value))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    return _content_state()
