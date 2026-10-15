"""
Tách tài liệu (PDF / DOCX / text) thành các khối nội dung có cấu trúc cho trình đọc ebook.

Mỗi khối: {"block_type": heading|paragraph|list_item|table, "level": int|None, "text": str, "page_number": int|None}
`text` dùng `**đậm**` cho chữ in đậm; bảng lưu mỗi hàng một dòng, các ô cách nhau bằng " | ".
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.services.doc_ingest.docx_extractor import extract_docx_blocks
from app.services.doc_ingest.pdf_extractor import extract_pdf_blocks, pdf_has_text_layer
from app.services.doc_ingest.text_blocks import blocks_from_text

Block = Dict[str, Any]


@dataclass
class IngestResult:
    blocks: List[Block] = field(default_factory=list)
    page_count: int = 0
    empty_pages: int = 0  # trang không có lớp văn bản (PDF scan)
    ocr_pages: int = 0    # trong số đó, số trang đã đọc được bằng OCR


def extract_blocks(file_bytes: bytes, kind: str, ocr: Optional[Any] = None) -> IngestResult:
    if kind == "pdf":
        blocks, page_count, empty_pages, ocr_pages = extract_pdf_blocks(file_bytes, ocr=ocr)
        return IngestResult(blocks, page_count, empty_pages, ocr_pages)
    if kind == "docx":
        return IngestResult(extract_docx_blocks(file_bytes))
    raise ValueError(f"Unsupported document kind: {kind}")


def blocks_to_text(blocks: List[Block]) -> str:
    """Văn bản thuần (bỏ dấu in đậm) để chunk/embedding và trích chủ đề."""
    return "\n\n".join(b["text"].replace("**", "") for b in blocks if b.get("text"))


__all__ = [
    "Block", "IngestResult", "extract_blocks", "blocks_to_text", "blocks_from_text",
    "extract_pdf_blocks", "extract_docx_blocks", "pdf_has_text_layer",
]
