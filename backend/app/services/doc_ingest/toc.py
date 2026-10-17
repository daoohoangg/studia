"""
Mục lục (chỉ mục) của sách → các chương có điểm bắt đầu/kết thúc trong dòng khối, để tính tiến độ theo chương.

Thứ tự ưu tiên của nguồn mục lục:
  1. bookmark/outline có sẵn trong PDF (chính xác nhất, có cấp và trang PDF thật);
  2. trang "Contents / Mục lục" của sách: đọc các dòng "Tiêu đề ... số trang" rồi quy số trang in trên sách về số trang PDF;
  3. các khối tiêu đề (cấp 1–2) đã nhận diện được.
"""
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

CONTENTS_TITLE = re.compile(r"^\W*(table of contents|contents|mục lục|muc luc|nội dung)\W*$", re.IGNORECASE)
_LEADERS = re.compile(r"\s*(?:\.{2,}|…+|·{2,}|_{2,}|-{3,})\s*")
# "Tiêu đề 12", chấp nhận tiêu đề có số ("Test 1 10" → "Test 1" ở trang 10): số trang là số ngay trước tiêu đề kế tiếp (chữ cái đầu viết hoa/số La Mã) hoặc cuối chuỗi
_ENTRY = re.compile(r"(?P<title>[^\W\d_][^\n]*?)\s+(?P<page>\d{1,4})(?=\s+[^\W\d_]|\s+\d{1,4}\s*$|\s*$)", re.UNICODE)
MAX_ENTRIES = 300
MAX_CONTENTS_CHARS = 6000


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9à-ỹ]+", " ", (text or "").lower().replace("**", "")).strip()


def toc_from_pdf_bookmarks(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """Bookmark của PDF → [{title, level, page}] (trang đếm từ 1). Rỗng nếu PDF không có bookmark."""
    try:
        import pypdfium2 as pdfium
        from app.services.doc_ingest.pdf_extractor import _PDFIUM_LOCK

        with _PDFIUM_LOCK:
            pdf = pdfium.PdfDocument(pdf_bytes)
            try:
                entries = []
                for item in pdf.get_toc():
                    title = re.sub(r"\s+", " ", (item.title or "")).strip()
                    if not title or item.page_index is None:
                        continue
                    entries.append({"title": title, "level": min(int(item.level) + 1, 3), "page": int(item.page_index) + 1})
                    if len(entries) >= MAX_ENTRIES:
                        break
                return entries
            finally:
                pdf.close()
    except Exception as e:
        logger.info(f"No PDF bookmarks: {e}")
        return []


_GLUE = "\u0001"
_LABEL_NUMBER = re.compile(r"(?<![^\W\d_])([^\W\d_]+) (\d{1,3})(?= |$)", re.UNICODE)


def _glue_numbered_labels(text: str) -> str:
    """
    Nhãn có số thứ tự ("Unit 1 Greetings 3 Unit 2 Travel 5", "Test 1 10 Test 2 32") rất dễ bị nhầm số thứ tự thành số trang.
    Cùng một nhãn lặp lại với số tăng dần 1,2,3… thì các số đó thuộc về tiêu đề: dán nhãn với số bằng ký tự đệm.
    """
    seen: Dict[str, List[Tuple[int, int, int]]] = {}
    for m in _LABEL_NUMBER.finditer(text):
        seen.setdefault(m.group(1).lower(), []).append((m.start(2) - 1, m.start(2), int(m.group(2))))
    glued = set()
    for occurrences in seen.values():
        nums = [n for _, _, n in occurrences]
        for i, (space_at, _, n) in enumerate(occurrences):
            if (i > 0 and n - nums[i - 1] == 1) or (i + 1 < len(nums) and nums[i + 1] - n == 1):
                glued.add(space_at)
    return "".join(_GLUE if i in glued else c for i, c in enumerate(text))


def parse_contents_text(text: str) -> List[Dict[str, Any]]:
    """Văn bản của trang mục lục → [{title, printed_page}] theo thứ tự xuất hiện, số trang tăng dần."""
    cleaned = _glue_numbered_labels(_LEADERS.sub(" ", re.sub(r"\s+", " ", text or "")).strip())
    entries: List[Dict[str, Any]] = []
    last_page = -1
    for match in _ENTRY.finditer(cleaned):
        title = match.group("title").replace(_GLUE, " ").strip(" .:-–—")
        page = int(match.group("page"))
        # tiêu đề bị dính phần số trang của mục trước ("Test 1 10 Test 2 32") được regex tách đúng nhờ lookahead; loại các nhiễu còn lại
        if len(title) < 2 or page < last_page or page > 5000 or title.isdigit():
            continue
        entries.append({"title": title, "printed_page": page})
        last_page = page
    return entries


def _contents_entries(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Tìm khối "Contents" rồi đọc các khối đứng sau nó (cùng trang hoặc 1 trang kế)."""
    for i, block in enumerate(blocks):
        if block.get("block_type") != "heading" or not CONTENTS_TITLE.match(block.get("text") or ""):
            continue
        page = block.get("page_number") or 0
        parts: List[str] = []
        size = 0
        for nxt in blocks[i + 1:i + 60]:
            if (nxt.get("page_number") or 0) > page + 1:
                break
            if nxt.get("block_type") == "heading" and parts and (nxt.get("page_number") or 0) != page:
                break
            parts.append(nxt.get("text") or "")
            size += len(parts[-1])
            if size > MAX_CONTENTS_CHARS:
                break
        entries = parse_contents_text("\n".join(parts))
        if len(entries) >= 3:
            return entries
    return []


def _first_block_for_page(page_index: Dict[int, int], page: int) -> Optional[int]:
    """Chỉ số khối đầu tiên của trang `page`, hoặc của trang gần nhất phía sau nó."""
    if not page_index:
        return None
    for p in range(page, max(page_index) + 1):
        if p in page_index:
            return page_index[p]
    return None


def _page_offset(entries: List[Dict[str, Any]], blocks: List[Dict[str, Any]]) -> int:
    """Chênh lệch (trang PDF − trang in trên sách): bỏ phiếu theo vị trí tìm thấy tiêu đề mục thật sự trong nội dung."""
    heads: Dict[str, List[int]] = {}
    for block in blocks:
        if block.get("block_type") in ("heading", "paragraph") and block.get("page_number"):
            key = _norm(block["text"])[:60]
            if key:
                heads.setdefault(key, []).append(block["page_number"])
    votes: Dict[int, int] = {}
    for entry in entries[1:] if len(entries) > 3 else entries:
        title = _norm(entry["title"])
        if len(title) < 3:
            continue
        printed = entry["printed_page"]
        found = [p for key, pages in heads.items() if key == title or key.startswith(title + " ") for p in pages
                 if 0 <= p - printed <= 30]
        if found:
            offset = min(found) - printed
            votes[offset] = votes.get(offset, 0) + 1
    if votes:
        return max(votes.items(), key=lambda kv: (kv[1], -abs(kv[0])))[0]
    return 0


def build_toc(blocks: List[Dict[str, Any]], bookmarks: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    `blocks`: toàn bộ khối theo thứ tự đọc (id, order_index, page_number, block_type, level, text).
    Trả về {source, entries:[{title, level, page, block_id, order_index, end_order_index}]}.
    """
    if not blocks:
        return {"source": "none", "entries": []}
    page_index: Dict[int, int] = {}
    for i, block in enumerate(blocks):
        page = block.get("page_number")
        if page and page not in page_index:
            page_index[page] = i

    raw: List[Tuple[str, int, Optional[int], Optional[int]]] = []  # title, level, block index, (unused)
    source = "none"

    if bookmarks:
        source = "bookmarks"
        for item in bookmarks:
            idx = _first_block_for_page(page_index, item["page"]) if page_index else None
            if idx is not None:
                raw.append((item["title"], item.get("level", 1), idx, item["page"]))
    if not raw:
        contents = _contents_entries(blocks)
        if contents and page_index:
            source = "contents"
            offset = _page_offset(contents, blocks)
            for entry in contents:
                pdf_page = entry["printed_page"] + offset
                idx = _first_block_for_page(page_index, pdf_page)
                if idx is None:
                    continue
                # nếu trên trang đó có tiêu đề trùng tên mục thì lấy đúng khối ấy
                title = _norm(entry["title"])
                for j in range(idx, min(idx + 40, len(blocks))):
                    b = blocks[j]
                    if b.get("page_number") != blocks[idx].get("page_number"):
                        break
                    if b.get("block_type") == "heading" and _norm(b["text"]).startswith(title):
                        idx = j
                        break
                raw.append((entry["title"], 1, idx, pdf_page))
    if not raw:
        source = "headings"
        for i, block in enumerate(blocks):
            if block.get("block_type") == "heading" and (block.get("level") or 3) <= 2 and len(block.get("text", "")) <= 90:
                raw.append((block["text"], block.get("level") or 1, i, block.get("page_number")))

    # bỏ mục trùng vị trí, đảm bảo tăng dần theo thứ tự đọc
    raw.sort(key=lambda r: r[2])
    entries: List[Dict[str, Any]] = []
    seen_idx = set()
    for title, level, idx, page in raw:
        if idx in seen_idx:
            continue
        seen_idx.add(idx)
        block = blocks[idx]
        entries.append({
            "title": title, "level": level, "page": block.get("page_number") or page,
            "block_id": block["id"], "order_index": block["order_index"],
        })
    end_of_book = blocks[-1]["order_index"] + 1
    for i, entry in enumerate(entries):
        entry["end_order_index"] = entries[i + 1]["order_index"] if i + 1 < len(entries) else end_of_book
    return {"source": source if entries else "none", "entries": entries}


def chapter_progress(entry: Dict[str, Any], current_order_index: Optional[float]) -> float:
    """Phần trăm đã đọc của một chương theo vị trí đang đọc (đọc tuần tự: chương trước vị trí = 100%)."""
    if current_order_index is None:
        return 0.0
    start, end = entry["order_index"], entry["end_order_index"]
    if current_order_index >= end:
        return 100.0
    if current_order_index <= start:
        return 0.0
    return round(100.0 * (current_order_index - start) / max(end - start, 1e-9), 1)


def detect_book_title(blocks: List[Dict[str, Any]], fallback: str = "") -> str:
    """Tên sách từ trang bìa/tiêu đề: tiêu đề lớn nhất trong 3 trang đầu; không có thì dùng `fallback` (tên tệp)."""
    best: Optional[Dict[str, Any]] = None
    for block in blocks[:40]:
        if (block.get("page_number") or 1) > 3:
            break
        if block.get("block_type") != "heading" or CONTENTS_TITLE.match(block.get("text") or ""):
            continue
        text = (block.get("text") or "").strip()
        if not (3 <= len(text) <= 100) or text.count("�") or re.search(r"[^\x00-ɏḀ-ỿ -⁯]", text):
            continue
        if best is None or (block.get("level") or 3) < (best.get("level") or 3):
            best = block
    return (best or {}).get("text", "").replace("**", "").strip() or fallback
