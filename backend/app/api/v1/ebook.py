"""
Ebook API — đọc & chỉnh sửa nội dung tài liệu theo từng khối, highlight, sổ ghi chú (notebook),
vị trí đang đọc, tìm kiếm trong sách, lập chỉ mục AI lại sau khi sửa, xuất Markdown.

Các endpoint khai báo `def` (đồng bộ) để FastAPI chạy trong threadpool: lời gọi DB không chặn event loop.
"""
import logging
import re
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from app.core.auth import current_user_id, require_owned
from app.core.supabase_client import get_supabase_client
from app.core.uploads import DOCUMENTS_BUCKET, safe_filename, storage_path_from
from app.services.doc_ingest.quality import page_quality
from app.services.doc_ingest.toc import build_toc, chapter_progress, detect_book_title, toc_from_pdf_bookmarks
from app.services.document_pipeline import ensure_blocks, index_status, load_all_blocks, reindex_document

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Ebook"])

BLOCK_TYPES = ("heading", "paragraph", "list_item", "table")
HIGHLIGHT_COLORS = ("yellow", "green", "cyan", "pink", "purple")
BLOCK_FIELDS = "id, order_index, page_number, block_type, level, text, is_edited"
MAX_PAGE_SIZE = 500
MAX_REVISIONS = 30
SEARCH_LIMIT = 50

_rebuild_locks: Dict[str, threading.Lock] = {}
_rebuild_locks_guard = threading.Lock()
_reindex_locks: Dict[str, threading.Lock] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db():
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")
    return supabase


def _get_block(supabase, document_id: str, block_id: str) -> Dict[str, Any]:
    rows = supabase.table("document_blocks").select("*") \
        .eq("id", block_id).eq("document_id", document_id).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy khối nội dung")
    return rows[0]


def _public(block: Dict[str, Any]) -> Dict[str, Any]:
    return {key: block.get(key) for key in
            ("id", "order_index", "page_number", "block_type", "level", "text", "is_edited")}


def _save_revision(supabase, block: Dict[str, Any]) -> None:
    """Lưu trạng thái hiện tại của khối trước khi sửa; chỉ giữ MAX_REVISIONS bản gần nhất."""
    try:
        supabase.table("document_block_revisions").insert({
            "id": str(uuid.uuid4()),
            "block_id": block["id"],
            "text": block.get("text") or "",
            "block_type": block.get("block_type"),
            "level": block.get("level"),
            "created_at": _now(),
        }).execute()
        old = supabase.table("document_block_revisions").select("id") \
            .eq("block_id", block["id"]).order("created_at", desc=True).limit(MAX_REVISIONS + 20).execute().data or []
        extra = [r["id"] for r in old[MAX_REVISIONS:]]
        if extra:
            supabase.table("document_block_revisions").delete().in_("id", extra).execute()
    except Exception as e:  # lịch sử là phụ: không làm hỏng việc lưu chính
        logger.warning(f"Could not save block revision: {e}")


def _mark_edited(supabase, document_id: str, block_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
    changes = {**changes, "updated_at": _now()}
    supabase.table("document_blocks").update(changes).eq("id", block_id).eq("document_id", document_id).execute()
    return _public(_get_block(supabase, document_id, block_id))


# ============================================================
# Đọc
# ============================================================

@router.get("/{document_id}/blocks")
def list_blocks(
    document_id: str,
    after: float = Query(-1, description="order_index của khối cuối đã tải"),
    limit: int = Query(300, ge=1, le=MAX_PAGE_SIZE),
):
    """Nội dung sách theo trang cuộn: trả các khối có order_index > after."""
    require_owned("documents", document_id)
    supabase = _db()

    def fetch():
        return supabase.table("document_blocks").select(BLOCK_FIELDS) \
            .eq("document_id", document_id).gt("order_index", after) \
            .order("order_index").limit(limit + 1).execute().data or []

    rows = fetch()
    if not rows and after < 0:
        # Tài liệu cũ chưa có khối: dựng một lần (khoá theo tài liệu để hai request không dựng trùng)
        with _rebuild_locks_guard:
            lock = _rebuild_locks.setdefault(document_id, threading.Lock())
        with lock:
            rows = fetch()
            if not rows:
                doc = supabase.table("documents").select("id, file_path, raw_content, processing_status") \
                    .eq("id", document_id).execute().data[0]
                if doc.get("processing_status") in ("completed", "failed") and ensure_blocks(supabase, doc):
                    rows = fetch()

    has_more = len(rows) > limit
    rows = rows[:limit]
    return {
        "document_id": document_id,
        "blocks": [_public(r) for r in rows],
        "has_more": has_more,
        "next_after": rows[-1]["order_index"] if rows else after,
    }


@router.get("/{document_id}/outline")
def get_outline(document_id: str):
    """Mục lục: các khối tiêu đề theo thứ tự."""
    require_owned("documents", document_id)
    rows = _db().table("document_blocks").select("id, order_index, page_number, level, text") \
        .eq("document_id", document_id).eq("block_type", "heading") \
        .order("order_index").limit(1000).execute().data or []
    return {"document_id": document_id, "outline": [
        {"block_id": r["id"], "order_index": r["order_index"], "page_number": r.get("page_number"),
         "level": r.get("level") or 1, "text": r["text"]} for r in rows
    ]}


_BOOKMARK_CACHE: Dict[str, List[Dict[str, Any]]] = {}
_TOC_CACHE: Dict[str, Any] = {}
TOC_CACHE_SECONDS = 15


def _pdf_bookmarks(supabase, document_id: str, file_path: Optional[str]) -> List[Dict[str, Any]]:
    """Bookmark có sẵn trong PDF gốc (tải tệp một lần rồi nhớ kết quả)."""
    if document_id in _BOOKMARK_CACHE:
        return _BOOKMARK_CACHE[document_id]
    path = storage_path_from(file_path)
    marks: List[Dict[str, Any]] = []
    if path and path.lower().endswith(".pdf"):
        try:
            marks = toc_from_pdf_bookmarks(supabase.storage.from_(DOCUMENTS_BUCKET).download(path))
        except Exception as e:
            logger.info(f"[{document_id}] Cannot read PDF bookmarks: {e}")
            return []  # không nhớ lỗi tạm thời
    _BOOKMARK_CACHE[document_id] = marks
    return marks


@router.get("/{document_id}/toc")
def get_toc(document_id: str):
    """
    Mục lục của chính cuốn sách (bookmark PDF → trang Contents → tiêu đề đã nhận diện) kèm tiến độ đọc từng chương.
    Mỗi mục có `percent` (0–100) tính theo vị trí đang đọc; `overall_percent` là tiến độ cả sách.
    """
    require_owned("documents", document_id)
    supabase = _db()
    uid = current_user_id()
    cached = _TOC_CACHE.get(document_id)
    if cached and time.time() - cached[0] < TOC_CACHE_SECONDS:
        base = cached[1]
    else:
        blocks = load_all_blocks(supabase, document_id)
        doc = (supabase.table("documents").select("title, file_path").eq("id", document_id).execute().data or [{}])[0]
        toc = build_toc(blocks, _pdf_bookmarks(supabase, document_id, doc.get("file_path")))
        base = {
            "title": detect_book_title(blocks, fallback=re.sub(r"\.(pdf|docx)$", "", doc.get("title") or "", flags=re.I)),
            "source": toc["source"],
            "entries": toc["entries"],
            "block_count": len(blocks),
            "last_order_index": blocks[-1]["order_index"] if blocks else 0,
            "first_order_index": blocks[0]["order_index"] if blocks else 0,
        }
        _TOC_CACHE[document_id] = (time.time(), base)

    rows = supabase.table("reading_progress").select("block_id, percent") \
        .eq("document_id", document_id).eq("user_id", uid).limit(1).execute().data or []
    current_order: Optional[float] = None
    percent = 0.0
    if rows:
        percent = float(rows[0].get("percent") or 0)
        block = supabase.table("document_blocks").select("order_index") \
            .eq("id", rows[0].get("block_id")).eq("document_id", document_id).execute().data if rows[0].get("block_id") else None
        current_order = block[0]["order_index"] if block else None

    entries = [{**e, "percent": chapter_progress(e, current_order)} for e in base["entries"]]
    done = sum(1 for e in entries if e["percent"] >= 99.9)
    current = next((e for e in entries if 0 < e["percent"] < 99.9), None)
    return {
        "document_id": document_id,
        "title": base["title"],
        "source": base["source"],
        "entries": entries,
        "chapters_done": done,
        "current_block_id": rows[0].get("block_id") if rows else None,
        "current_chapter": current["block_id"] if current else None,
        "overall_percent": percent,
    }


@router.get("/{document_id}/page-quality")
def get_page_quality(document_id: str):
    """
    Các trang nên đối chiếu với ảnh trang gốc vì chữ tách ra có thể thiếu hoặc sai: chữ nhiễu (OCR hỏng),
    trang gần như không có chữ (hình, sơ đồ), trang toàn mục ngắn/số (bảng biểu, lưới câu hỏi).
    """
    require_owned("documents", document_id)
    blocks = load_all_blocks(_db(), document_id)
    return {"document_id": document_id, "pages": page_quality(blocks)}


@router.get("/{document_id}/search")
def search_in_book(document_id: str, q: str = Query(..., min_length=2, max_length=100)):
    """Tìm chữ trong nội dung sách (không phân biệt hoa thường). Kết quả theo thứ tự đọc."""
    require_owned("documents", document_id)
    needle = q.strip()
    if len(needle) < 2:
        raise HTTPException(status_code=422, detail="Từ khoá quá ngắn")
    escaped = needle.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    rows = _db().table("document_blocks").select("id, order_index, page_number, block_type, text") \
        .eq("document_id", document_id).ilike("text", f"%{escaped}%") \
        .order("order_index").limit(SEARCH_LIMIT).execute().data or []

    results = []
    for row in rows:
        plain = (row.get("text") or "").replace("**", "")
        position = plain.lower().find(needle.lower())
        if position < 0:
            continue  # khớp trúng dấu ** ngăn cách: bỏ
        start, end = max(0, position - 60), min(len(plain), position + len(needle) + 60)
        results.append({
            "block_id": row["id"],
            "page_number": row.get("page_number"),
            "block_type": row.get("block_type"),
            "snippet": ("…" if start > 0 else "") + plain[start:end] + ("…" if end < len(plain) else ""),
            "match_start": position - start + (1 if start > 0 else 0),
            "match_length": len(needle),
        })
    return {"document_id": document_id, "query": needle, "results": results, "limited": len(rows) >= SEARCH_LIMIT}


# ============================================================
# Chỉnh sửa
# ============================================================

class BlockUpdate(BaseModel):
    text: Optional[str] = Field(None, max_length=20000)
    block_type: Optional[str] = None
    level: Optional[int] = Field(None, ge=1, le=3)


class BlockCreate(BaseModel):
    after_block_id: Optional[str] = None  # None = chèn lên đầu sách
    text: str = Field("", max_length=20000)
    block_type: str = "paragraph"
    level: Optional[int] = Field(None, ge=1, le=3)


class BlockSplit(BaseModel):
    offset: int = Field(..., ge=1)  # vị trí cắt trong chuỗi nguồn của khối


def _check_type(block_type: Optional[str]) -> None:
    if block_type is not None and block_type not in BLOCK_TYPES:
        raise HTTPException(status_code=422, detail=f"block_type phải thuộc {BLOCK_TYPES}")


def _order_between(supabase, document_id: str, start: Optional[float]) -> float:
    """order_index nằm ngay sau `start` (None = đầu sách), giữa nó và khối kế tiếp."""
    following_query = supabase.table("document_blocks").select("order_index").eq("document_id", document_id)
    if start is not None:
        following_query = following_query.gt("order_index", start)
    following = following_query.order("order_index").limit(1).execute().data
    if start is None:
        return (float(following[0]["order_index"]) - 1.0) if following else 1.0
    if following:
        return (start + float(following[0]["order_index"])) / 2
    return start + 1.0


@router.patch("/{document_id}/blocks/{block_id}")
def update_block(document_id: str, block_id: str, body: BlockUpdate):
    """Sửa nội dung / loại khối. Bản gốc (`original_text`) và các bản trước đều được giữ."""
    require_owned("documents", document_id, write=True)
    _check_type(body.block_type)
    supabase = _db()
    block = _get_block(supabase, document_id, block_id)

    changes: Dict[str, Any] = {}
    if body.text is not None and body.text != block.get("text"):
        changes["text"] = body.text
    if body.block_type is not None and body.block_type != block.get("block_type"):
        changes["block_type"] = body.block_type
    block_type = changes.get("block_type", block.get("block_type"))
    level = (body.level or block.get("level") or 2) if block_type == "heading" else None
    if level != block.get("level"):
        changes["level"] = level
    if not changes:
        return _public(block)

    _save_revision(supabase, block)
    changes["is_edited"] = True
    return _mark_edited(supabase, document_id, block_id, changes)


@router.post("/{document_id}/blocks")
def create_block(document_id: str, body: BlockCreate):
    """Chèn một khối mới ngay sau `after_block_id`."""
    require_owned("documents", document_id, write=True)
    _check_type(body.block_type)
    supabase = _db()

    start: Optional[float] = None
    page_number = None
    if body.after_block_id:
        previous = _get_block(supabase, document_id, body.after_block_id)
        start = float(previous["order_index"])
        page_number = previous.get("page_number")

    now = _now()
    row = {
        "id": str(uuid.uuid4()),
        "document_id": document_id,
        "order_index": _order_between(supabase, document_id, start),
        "page_number": page_number,
        "block_type": body.block_type,
        "level": (body.level or 2) if body.block_type == "heading" else None,
        "text": body.text,
        "original_text": None,  # khối do người dùng thêm, không có bản gốc
        "is_edited": True,
        "created_at": now,
        "updated_at": now,
    }
    supabase.table("document_blocks").insert(row).execute()
    return _public(row)


@router.post("/{document_id}/blocks/{block_id}/split")
def split_block(document_id: str, block_id: str, body: BlockSplit):
    """Tách một khối làm hai tại `offset` (vị trí trong chuỗi nguồn). Giữ chữ đậm cân đôi `**`."""
    require_owned("documents", document_id, write=True)
    supabase = _db()
    block = _get_block(supabase, document_id, block_id)
    if block.get("block_type") == "table":
        raise HTTPException(status_code=409, detail="Không tách được bảng")
    text = block.get("text") or ""
    if body.offset >= len(text):
        raise HTTPException(status_code=422, detail="Vị trí tách nằm ngoài nội dung")

    left, right = text[:body.offset], text[body.offset:]
    if left.count("**") % 2 == 1:  # đang ở trong vùng đậm: đóng bên trái, mở lại bên phải
        left, right = left + "**", "**" + right
    left, right = left.strip(), right.strip()
    right = re.sub(r"^[*]{2}\s+", "**", right)   # "** chữ" -> "**chữ" (khoảng trắng không nằm trong vùng đậm)
    left = re.sub(r"\s+[*]{2}$", "**", left)
    if not left.replace("**", "").strip() or not right.replace("**", "").strip():
        raise HTTPException(status_code=422, detail="Không thể tách ra một phần rỗng")

    _save_revision(supabase, block)
    now = _now()
    new_block = {
        "id": str(uuid.uuid4()),
        "document_id": document_id,
        "order_index": _order_between(supabase, document_id, float(block["order_index"])),
        "page_number": block.get("page_number"),
        "block_type": "list_item" if block.get("block_type") == "list_item" else "paragraph",
        "level": None,
        "text": right,
        "original_text": None,
        "is_edited": True,
        "created_at": now,
        "updated_at": now,
    }
    supabase.table("document_blocks").insert(new_block).execute()
    updated = _mark_edited(supabase, document_id, block_id, {"text": left, "is_edited": True})
    return {"block": updated, "new_block": _public(new_block)}


@router.post("/{document_id}/blocks/{block_id}/merge-previous")
def merge_with_previous(document_id: str, block_id: str):
    """Gộp khối này vào khối đứng ngay trước nó (khối này bị xoá)."""
    require_owned("documents", document_id, write=True)
    supabase = _db()
    block = _get_block(supabase, document_id, block_id)
    previous_rows = supabase.table("document_blocks").select("*").eq("document_id", document_id) \
        .lt("order_index", block["order_index"]).order("order_index", desc=True).limit(1).execute().data
    if not previous_rows:
        raise HTTPException(status_code=409, detail="Đây là đoạn đầu tiên của sách")
    previous = previous_rows[0]
    if "table" in (block.get("block_type"), previous.get("block_type")):
        raise HTTPException(status_code=409, detail="Không gộp được với bảng")

    merged_text = f"{previous.get('text', '').rstrip()} {block.get('text', '').lstrip()}".strip()
    _save_revision(supabase, previous)
    merged = _mark_edited(supabase, document_id, previous["id"], {"text": merged_text, "is_edited": True})
    _delete_block_rows(supabase, document_id, block_id)
    return {"block": merged, "removed_id": block_id}


def _delete_block_rows(supabase, document_id: str, block_id: str) -> None:
    supabase.table("document_blocks").delete().eq("id", block_id).eq("document_id", document_id).execute()
    # Dọn các dòng phụ thuộc (trên Postgres đã có ON DELETE CASCADE; LocalStore thì không)
    for table in ("document_highlights", "document_block_revisions"):
        try:
            supabase.table(table).delete().eq("block_id", block_id).execute()
        except Exception:
            pass


@router.delete("/{document_id}/blocks/{block_id}")
def delete_block(document_id: str, block_id: str):
    require_owned("documents", document_id, write=True)
    supabase = _db()
    _get_block(supabase, document_id, block_id)
    _delete_block_rows(supabase, document_id, block_id)
    return {"deleted": True, "id": block_id}


@router.post("/{document_id}/blocks/{block_id}/restore")
def restore_block(document_id: str, block_id: str):
    """Trả nội dung khối về bản gốc lúc tách từ tệp."""
    require_owned("documents", document_id, write=True)
    supabase = _db()
    block = _get_block(supabase, document_id, block_id)
    if block.get("original_text") is None:
        raise HTTPException(status_code=409, detail="Khối này do bạn thêm, không có bản gốc để khôi phục")
    _save_revision(supabase, block)
    return _mark_edited(supabase, document_id, block_id, {"text": block["original_text"], "is_edited": False})


@router.get("/{document_id}/blocks/{block_id}/revisions")
def list_revisions(document_id: str, block_id: str):
    require_owned("documents", document_id)
    supabase = _db()
    _get_block(supabase, document_id, block_id)
    rows = supabase.table("document_block_revisions").select("id, text, block_type, level, created_at") \
        .eq("block_id", block_id).order("created_at", desc=True).limit(MAX_REVISIONS).execute().data or []
    return {"block_id": block_id, "revisions": rows}


@router.post("/{document_id}/blocks/{block_id}/revisions/{revision_id}/restore")
def restore_revision(document_id: str, block_id: str, revision_id: str):
    require_owned("documents", document_id, write=True)
    supabase = _db()
    block = _get_block(supabase, document_id, block_id)
    rows = supabase.table("document_block_revisions").select("*") \
        .eq("id", revision_id).eq("block_id", block_id).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên bản")
    revision = rows[0]
    _save_revision(supabase, block)
    return _mark_edited(supabase, document_id, block_id, {
        "text": revision["text"], "block_type": revision.get("block_type") or block["block_type"],
        "level": revision.get("level"), "is_edited": True,
    })


# ============================================================
# Highlight (lưu lâu dài, nhiều màu)
# ============================================================

class HighlightCreate(BaseModel):
    block_id: str
    start: int = Field(..., ge=0)   # vị trí trong chữ hiển thị của khối (đã bỏ dấu **)
    end: int = Field(..., ge=1)
    color: str = "yellow"
    quote: str = Field("", max_length=2000)  # chữ được tô, để định vị lại khi khối bị sửa


class HighlightUpdate(BaseModel):
    color: str


HIGHLIGHT_FIELDS = ("id", "block_id", "start_offset", "end_offset", "color", "quote", "created_at")


def _highlight_public(row: Dict[str, Any]) -> Dict[str, Any]:
    return {key: row.get(key) for key in HIGHLIGHT_FIELDS}


@router.get("/{document_id}/highlights")
def list_highlights(document_id: str):
    require_owned("documents", document_id)
    rows = _db().table("document_highlights").select("*") \
        .eq("document_id", document_id).eq("user_id", current_user_id()) \
        .order("created_at").limit(5000).execute().data or []
    return {"document_id": document_id, "highlights": [_highlight_public(r) for r in rows]}


@router.post("/{document_id}/highlights")
def create_highlight(document_id: str, body: HighlightCreate):
    require_owned("documents", document_id)
    if body.color not in HIGHLIGHT_COLORS:
        raise HTTPException(status_code=422, detail=f"color phải thuộc {HIGHLIGHT_COLORS}")
    if body.end <= body.start:
        raise HTTPException(status_code=422, detail="Vùng tô không hợp lệ")
    supabase = _db()
    block = _get_block(supabase, document_id, body.block_id)
    if body.end > len((block.get("text") or "").replace("**", "")):
        raise HTTPException(status_code=422, detail="Vùng tô vượt quá nội dung khối")

    row = {
        "id": str(uuid.uuid4()),
        "user_id": current_user_id(),
        "document_id": document_id,
        "block_id": body.block_id,
        "start_offset": body.start,
        "end_offset": body.end,
        "color": body.color,
        "quote": body.quote,
        "created_at": _now(),
    }
    supabase.table("document_highlights").insert(row).execute()
    return _highlight_public(row)


def _get_highlight(supabase, document_id: str, highlight_id: str) -> Dict[str, Any]:
    rows = supabase.table("document_highlights").select("*").eq("id", highlight_id) \
        .eq("document_id", document_id).eq("user_id", current_user_id()).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy highlight")
    return rows[0]


@router.patch("/{document_id}/highlights/{highlight_id}")
def update_highlight(document_id: str, highlight_id: str, body: HighlightUpdate):
    require_owned("documents", document_id)
    if body.color not in HIGHLIGHT_COLORS:
        raise HTTPException(status_code=422, detail=f"color phải thuộc {HIGHLIGHT_COLORS}")
    supabase = _db()
    row = _get_highlight(supabase, document_id, highlight_id)
    supabase.table("document_highlights").update({"color": body.color}) \
        .eq("id", highlight_id).eq("document_id", document_id).execute()
    return _highlight_public({**row, "color": body.color})


@router.delete("/{document_id}/highlights/{highlight_id}")
def delete_highlight(document_id: str, highlight_id: str):
    require_owned("documents", document_id)
    supabase = _db()
    _get_highlight(supabase, document_id, highlight_id)
    supabase.table("document_highlights").delete().eq("id", highlight_id).eq("document_id", document_id).execute()
    return {"deleted": True, "id": highlight_id}


# ============================================================
# Vị trí đang đọc
# ============================================================

class ProgressUpdate(BaseModel):
    block_id: str
    percent: float = Field(0, ge=0, le=100)


@router.get("/{document_id}/progress")
def get_progress(document_id: str):
    require_owned("documents", document_id)
    rows = _db().table("reading_progress").select("block_id, percent, updated_at") \
        .eq("document_id", document_id).eq("user_id", current_user_id()).limit(1).execute().data or []
    if not rows:
        return {"document_id": document_id, "block_id": None, "percent": 0, "updated_at": None}
    return {"document_id": document_id, **rows[0]}


@router.put("/{document_id}/progress")
def save_progress(document_id: str, body: ProgressUpdate):
    require_owned("documents", document_id)
    supabase = _db()
    _get_block(supabase, document_id, body.block_id)
    row = {
        "user_id": current_user_id(),
        "document_id": document_id,
        "block_id": body.block_id,
        "percent": round(body.percent, 1),
        "updated_at": _now(),
    }
    supabase.table("reading_progress").upsert(row, on_conflict="user_id,document_id").execute()
    return {"document_id": document_id, "block_id": body.block_id, "percent": row["percent"],
            "updated_at": row["updated_at"]}


# ============================================================
# Chỉ mục AI sau khi sửa nội dung
# ============================================================

@router.get("/{document_id}/index-status")
def get_index_status(document_id: str):
    """`stale` = nội dung đã sửa so với chỉ mục AI (Tutor/tìm kiếm ngữ nghĩa) đang dùng."""
    require_owned("documents", document_id)
    return {"document_id": document_id, **index_status(_db(), document_id)}


@router.post("/{document_id}/reindex")
def reindex(document_id: str):
    """Lập chỉ mục AI lại cho phần đã sửa (chỉ embedding các chunk có nội dung mới)."""
    require_owned("documents", document_id, write=True)
    lock = _reindex_locks.setdefault(document_id, threading.Lock())
    if not lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Đang cập nhật chỉ mục cho sách này")
    try:
        return {"document_id": document_id, **reindex_document(_db(), document_id)}
    finally:
        lock.release()


# ============================================================
# Xuất file
# ============================================================

def blocks_to_markdown(blocks: List[Dict[str, Any]]) -> str:
    out: List[str] = []
    list_marker = re.compile(r"^(?:[-•●▪◦–*]|\d{1,3}[.)])\s")
    for block in blocks:
        text = (block.get("text") or "").strip()
        if not text:
            continue
        kind = block.get("block_type")
        if kind == "heading":
            out.append(f"{'#' * min(max(block.get('level') or 1, 1), 3)} {text}")
        elif kind == "list_item":
            out.append(text if list_marker.match(text) else f"- {text}")
        elif kind == "table":
            rows = [[cell.strip() for cell in row.split(" | ")] for row in text.split("\n")]
            width = max(len(r) for r in rows)
            rows = [r + [""] * (width - len(r)) for r in rows]
            lines = ["| " + " | ".join(rows[0]) + " |", "| " + " | ".join(["---"] * width) + " |"]
            lines += ["| " + " | ".join(r) + " |" for r in rows[1:]]
            out.append("\n".join(lines))
        else:
            out.append(text)
    # Mục danh sách liền nhau không cần dòng trống giữa chúng
    result = ""
    for i, part in enumerate(out):
        if i:
            both_list = list_marker.match(part) and list_marker.match(out[i - 1]) \
                and not part.startswith("#") and not out[i - 1].startswith("#")
            result += "\n" if both_list else "\n\n"
        result += part
    return result + "\n"


@router.get("/{document_id}/export")
def export_document(document_id: str, format: str = Query("md")):
    """Xuất nội dung (bản đã sửa) ra Markdown."""
    require_owned("documents", document_id)
    if format != "md":
        raise HTTPException(status_code=422, detail="Hiện chỉ hỗ trợ format=md")
    supabase = _db()
    doc = supabase.table("documents").select("title").eq("id", document_id).execute().data[0]
    markdown = blocks_to_markdown(load_all_blocks(supabase, document_id))
    title = (doc.get("title") or "document").strip()
    body = f"# {title}\n\n{markdown}"
    filename = safe_filename(title, default="document") + ".md"
    return PlainTextResponse(body, media_type="text/markdown; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ============================================================
# Notebook — ghi chú của người dùng cho từng cuốn sách
# ============================================================

class NoteCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=20000)
    quote: Optional[str] = Field(None, max_length=2000)   # đoạn trích được bôi đen (nếu có)
    block_id: Optional[str] = None                         # khối chứa đoạn trích, để nhảy về đúng chỗ


class NoteUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=20000)


NOTE_FIELDS = ("id", "document_id", "block_id", "quote", "content", "created_at", "updated_at")


def _note_public(note: Dict[str, Any]) -> Dict[str, Any]:
    return {key: note.get(key) for key in NOTE_FIELDS}


def _get_note(supabase, document_id: str, note_id: str) -> Dict[str, Any]:
    rows = supabase.table("document_notes").select("*").eq("id", note_id) \
        .eq("document_id", document_id).eq("user_id", current_user_id()).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy ghi chú")
    return rows[0]


@router.get("/{document_id}/notes")
def list_notes(document_id: str):
    require_owned("documents", document_id)
    rows: List[Dict[str, Any]] = _db().table("document_notes").select("*") \
        .eq("document_id", document_id).eq("user_id", current_user_id()) \
        .order("created_at", desc=True).limit(1000).execute().data or []
    return {"document_id": document_id, "notes": [_note_public(r) for r in rows]}


@router.post("/{document_id}/notes")
def create_note(document_id: str, body: NoteCreate):
    require_owned("documents", document_id)
    supabase = _db()
    if body.block_id:
        _get_block(supabase, document_id, body.block_id)
    now = _now()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": current_user_id(),
        "document_id": document_id,
        "block_id": body.block_id,
        "quote": body.quote,
        "content": body.content.strip(),
        "created_at": now,
        "updated_at": now,
    }
    supabase.table("document_notes").insert(row).execute()
    return _note_public(row)


@router.patch("/{document_id}/notes/{note_id}")
def update_note(document_id: str, note_id: str, body: NoteUpdate):
    require_owned("documents", document_id)
    supabase = _db()
    note = _get_note(supabase, document_id, note_id)
    changes = {"content": body.content.strip(), "updated_at": _now()}
    supabase.table("document_notes").update(changes).eq("id", note_id).eq("document_id", document_id).execute()
    return _note_public({**note, **changes})


@router.delete("/{document_id}/notes/{note_id}")
def delete_note(document_id: str, note_id: str):
    require_owned("documents", document_id)
    supabase = _db()
    _get_note(supabase, document_id, note_id)
    supabase.table("document_notes").delete().eq("id", note_id).eq("document_id", document_id).execute()
    return {"deleted": True, "id": note_id}
