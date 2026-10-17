"""
Đánh giá độ tin cậy của chữ đã tách theo từng trang, để trình đọc biết trang nào cần kèm ảnh trang gốc.

Không có cách nào dựng lại chính xác mọi bố cục PDF (bảng, sơ đồ, nhiều cột, đáp án nối) thành văn bản,
nên thay vì đoán, những trang có dấu hiệu rủi ro được gắn cờ và người đọc luôn xem được trang gốc ngay cạnh chữ.
"""
import re
from collections import defaultdict
from typing import Any, Dict, List

NOISE_CHARS = re.compile(r"[�-~|]|[^\x00-ɏḀ-ỿ -⁯←-⇿∀-⋿]")
SPARSE_CHARS = 120      # ít hơn ngần này ký tự: trang có thể chủ yếu là hình/sơ đồ
NOISE_RATIO = 0.04      # tỉ lệ ký tự nhiễu từ đây trở lên: OCR hỏng
FRAGMENT_RATIO = 0.55   # tỉ lệ khối rất ngắn: bảng, lưới đáp án, nhãn trên sơ đồ
DOTS_RUN = re.compile(r"\.{4,}|_{3,}")


def noise_ratio(text: str) -> float:
    return len(NOISE_CHARS.findall(text)) / max(len(text), 1)


def page_quality(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """[{page, reasons:[noisy|sparse|table|blanks], noise}] cho các trang có dấu hiệu rủi ro, theo số trang."""
    by_page: Dict[int, List[str]] = defaultdict(list)
    for block in blocks:
        if block.get("page_number"):
            by_page[block["page_number"]].append(block.get("text") or "")

    result: List[Dict[str, Any]] = []
    for page in sorted(by_page):
        texts = by_page[page]
        joined = " ".join(texts)
        chars = len(re.sub(r"\s+", "", joined))
        reasons: List[str] = []
        ratio = noise_ratio(joined)
        if ratio >= NOISE_RATIO:
            reasons.append("noisy")
        if chars < SPARSE_CHARS:
            reasons.append("sparse")
        if len(texts) >= 6:
            short = sum(1 for t in texts if len(t) <= 14)
            if short / len(texts) >= FRAGMENT_RATIO:
                reasons.append("table")
        if len(DOTS_RUN.findall(joined)) >= 3:
            reasons.append("blanks")  # chỗ điền từ: bố cục gốc (ô trống, bảng ghi chú) khó dựng lại bằng chữ
        if reasons:
            result.append({"page": page, "reasons": reasons, "noise": round(ratio, 3)})
    return result
