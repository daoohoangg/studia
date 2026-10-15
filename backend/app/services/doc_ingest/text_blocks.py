"""Văn bản thuần → khối: tách theo dòng trống; dòng đầu ngắn kiểu Markdown '#' thành tiêu đề."""
import re
from typing import Any, Dict, List

_LIST_MARKER = re.compile(r"^(?:[-•●▪◦*–]|\d{1,3}[.)]|[A-Za-z][.)])\s+")
_MD_HEADING = re.compile(r"^(#{1,3})\s+(.*)$")


def blocks_from_text(text: str) -> List[Dict[str, Any]]:
    blocks: List[Dict[str, Any]] = []
    for raw in re.split(r"\n\s*\n", (text or "").replace("\r\n", "\n")):
        lines = [line.strip() for line in raw.split("\n") if line.strip()]
        if not lines:
            continue
        heading = _MD_HEADING.match(lines[0]) if len(lines) == 1 else None
        if heading:
            blocks.append({"block_type": "heading", "level": len(heading.group(1)),
                           "text": heading.group(2).strip(), "page_number": None})
        elif all(_LIST_MARKER.match(line) for line in lines):
            blocks += [{"block_type": "list_item", "level": None, "text": line, "page_number": None}
                       for line in lines]
        else:
            blocks.append({"block_type": "paragraph", "level": None, "text": " ".join(lines), "page_number": None})
    return blocks
