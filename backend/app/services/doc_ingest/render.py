"""Dựng ảnh trang PDF (cho OCR và để người dùng đối chiếu bản gốc)."""
import io
from typing import Optional

import pypdfium2 as pdfium

from app.services.doc_ingest.pdf_extractor import _PDFIUM_LOCK

PDF_POINTS_PER_INCH = 72.0


def render_page_png(pdf_bytes: bytes, page_number: int, scale: float = 1.5, max_side: int = 2400) -> Optional[bytes]:
    """
    Ảnh PNG của một trang (đếm từ 1). Trả về None nếu số trang nằm ngoài tài liệu.
    `scale` 1.0 = 72 DPI; cạnh dài nhất bị giới hạn bởi `max_side` để tránh ảnh quá lớn.
    """
    with _PDFIUM_LOCK:
        pdf = pdfium.PdfDocument(pdf_bytes)
        try:
            if page_number < 1 or page_number > len(pdf):
                return None
            page = pdf[page_number - 1]
            try:
                width, height = page.get_size()
                longest = max(width, height) * scale
                if longest > max_side:
                    scale *= max_side / longest
                image = page.render(scale=scale).to_pil().convert("RGB")
            finally:
                page.close()
        finally:
            pdf.close()
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=False)
    return buffer.getvalue()


def dpi_to_scale(dpi: int) -> float:
    return dpi / PDF_POINTS_PER_INCH
