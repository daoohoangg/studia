"""
Speech & Shadowing API — TTS guide generation & STT Levenshtein accuracy evaluation
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.speech_engine import SpeechEngine

router = APIRouter(prefix="/speech", tags=["Speech & Shadowing"])


class GuideRequest(BaseModel):
    text: str
    speed: float = 1.0


class EvaluateRequest(BaseModel):
    reference_text: str
    user_spoken_text: str
    audio_duration_sec: Optional[float] = None


@router.post("/guide")
async def get_shadowing_guide(req: GuideRequest):
    """
    Tạo dữ liệu hướng dẫn Shadowing (tách cụm từ, mốc ngắt nghỉ, tốc độ 0.8x/1.0x/1.2x).
    """
    if not req.text:
        raise HTTPException(status_code=400, detail="Văn bản mẫu không được để trống")

    return SpeechEngine.synthesize_shadowing_guide(req.text, req.speed)


@router.post("/evaluate")
async def evaluate_speech_accuracy(req: EvaluateRequest):
    """
    Chấm điểm độ chính xác phát âm & ngắt nghỉ của học viên (Levenshtein Distance).
    """
    if not req.reference_text:
        raise HTTPException(status_code=400, detail="Thiếu văn bản gốc reference_text")

    return SpeechEngine.evaluate_shadowing_attempt(
        reference_text=req.reference_text,
        user_spoken_text=req.user_spoken_text,
        audio_duration_sec=req.audio_duration_sec
    )
