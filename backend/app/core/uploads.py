"""
Kiểm tra tệp upload & tiện ích đường dẫn lưu trữ.
"""
import io
import os
import re
from typing import Optional
from urllib.parse import unquote, urlparse

from fastapi import HTTPException

from app.config import settings

DOCUMENTS_BUCKET = "documents"
PDF_MAGIC = b"%PDF-"
ZIP_MAGIC = b"PK\x03\x04"  # DOCX là tệp zip

_UNSAFE_CHARS = re.compile(r"[^A-Za-z0-9._-]+")
_BUCKET_URL_MARKERS = (
    f"/object/public/{DOCUMENTS_BUCKET}/",
    f"/object/sign/{DOCUMENTS_BUCKET}/",
    f"/static/storage/{DOCUMENTS_BUCKET}/",
)


def safe_filename(name: Optional[str], default: str = "document.pdf", max_len: int = 120) -> str:
    """Tên tệp an toàn để ghép vào đường dẫn lưu trữ: chỉ còn [A-Za-z0-9._-], không có thư mục."""
    base = (name or "").replace("\\", "/").split("/")[-1]
    stem, dot, ext = base.rpartition(".")
    if not dot:
        stem, ext = base, ""
    stem = _UNSAFE_CHARS.sub("_", stem).strip("._")
    if not stem:
        return default
    ext = re.sub(r"[^A-Za-z0-9]", "", ext)[:10]
    ext = f".{ext}" if ext else ""
    return stem[: max_len - len(ext)] + ext


def validate_pdf_bytes(pdf_bytes: bytes) -> int:
    """Kiểm tra chữ ký PDF, dung lượng và số trang. Trả về số trang; lỗi → HTTP 400/413."""
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Tệp PDF rỗng")
    if len(pdf_bytes) > settings.MAX_PDF_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Tệp PDF vượt quá {settings.MAX_PDF_MB} MB")
    if not pdf_bytes.startswith(PDF_MAGIC):
        raise HTTPException(status_code=400, detail="Tệp không phải PDF hợp lệ")

    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        if reader.is_encrypted and not reader.decrypt(""):
            raise HTTPException(status_code=400, detail="PDF được bảo vệ bằng mật khẩu, không thể xử lý")
        page_count = len(reader.pages)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Không đọc được cấu trúc tệp PDF")

    if page_count == 0:
        raise HTTPException(status_code=400, detail="PDF không có trang nào")
    if page_count > settings.MAX_PDF_PAGES:
        raise HTTPException(
            status_code=413,
            detail=f"PDF có {page_count} trang, vượt quá giới hạn {settings.MAX_PDF_PAGES} trang",
        )
    return page_count


def validate_docx_bytes(docx_bytes: bytes) -> None:
    """Kiểm tra chữ ký, dung lượng và mở thử tệp DOCX. Lỗi → HTTP 400/413."""
    if not docx_bytes:
        raise HTTPException(status_code=400, detail="Tệp DOCX rỗng")
    if len(docx_bytes) > settings.MAX_PDF_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Tệp vượt quá {settings.MAX_PDF_MB} MB")
    if not docx_bytes.startswith(ZIP_MAGIC):
        raise HTTPException(status_code=400, detail="Tệp không phải DOCX hợp lệ")
    try:
        from docx import Document
        Document(io.BytesIO(docx_bytes))
    except Exception:
        raise HTTPException(status_code=400, detail="Không đọc được tệp DOCX (tệp hỏng hoặc là định dạng .doc cũ)")


def ensure_private_bucket(supabase, name: str) -> None:
    """Tạo bucket riêng tư; bucket đã có thì đảm bảo nó không public."""
    try:
        supabase.storage.create_bucket(name, options={"public": False})
    except Exception:
        try:
            supabase.storage.update_bucket(name, {"public": False})
        except Exception:
            pass


def signed_storage_url(supabase, bucket: str, path: str, expires_in: int) -> Optional[str]:
    """Signed URL ngắn hạn của một object; None nếu không tạo được (tệp không tồn tại...)."""
    try:
        signed = supabase.storage.from_(bucket).create_signed_url(path, expires_in)
        return signed.get("signedURL") or signed.get("signedUrl")
    except Exception:
        return None


def storage_path_from(file_path: Optional[str]) -> Optional[str]:
    """
    Đường dẫn object trong bucket `documents`.
    Bản ghi cũ lưu public URL đầy đủ; bản ghi mới lưu thẳng đường dẫn object.
    """
    if not file_path:
        return None
    if not file_path.startswith(("http://", "https://")):
        return file_path
    path = urlparse(file_path).path
    for marker in _BUCKET_URL_MARKERS:
        idx = path.find(marker)
        if idx >= 0:
            return unquote(path[idx + len(marker):])
    return None
