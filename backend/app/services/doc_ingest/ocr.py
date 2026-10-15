"""
OCR cho trang PDF không có lớp văn bản (bản scan).

Nhà cung cấp mặc định là Gemini Vision (đã cấu hình sẵn cho dự án). Giao diện `OcrProvider` đơn giản
để thay bằng OCR chạy offline sau này mà không đổi pipeline.
"""
import logging
import time
from typing import Optional, Protocol

from app.config import settings

logger = logging.getLogger(__name__)

OCR_PROMPT = (
    "Transcribe ALL the text on this document page exactly as printed, in reading order. "
    "Output Markdown only: use '#', '##', '###' for headings, '-' for bullet points, and pipe tables for tables. "
    "Do not add commentary, do not describe pictures, do not translate, and do not invent missing text. "
    "If the page has no readable text, output nothing."
)


class OcrProvider(Protocol):
    def read(self, png_bytes: bytes) -> str:
        """Văn bản (Markdown) của một ảnh trang."""


class GeminiVisionOcr:
    def __init__(self, api_key: str, model_name: str, retries: int = 2):
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(model_name)
        self._retries = retries

    def read(self, png_bytes: bytes) -> str:
        last_error: Optional[Exception] = None
        for attempt in range(self._retries + 1):
            try:
                response = self._model.generate_content(
                    [OCR_PROMPT, {"mime_type": "image/png", "data": png_bytes}],
                    generation_config={"temperature": 0.0},
                )
                text = (response.text or "").strip()
                # Gemini đôi khi bọc kết quả trong hàng rào mã
                if text.startswith("```"):
                    text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                return text
            except Exception as e:
                last_error = e
                if attempt < self._retries:
                    time.sleep(1.5 * (attempt + 1))
        raise RuntimeError(f"OCR failed after {self._retries + 1} attempts: {last_error}")


def get_ocr_provider() -> Optional[OcrProvider]:
    """Nhà cung cấp OCR đang khả dụng, hoặc None nếu chưa cấu hình (khi đó PDF scan bị từ chối rõ ràng)."""
    key = settings.GEMINI_API_KEY
    if not key or key == "your_gemini_api_key_here":
        return None
    try:
        return GeminiVisionOcr(key, settings.GEMINI_PRO_MODEL)
    except Exception as e:
        logger.warning(f"Gemini OCR unavailable: {e}")
        return None
