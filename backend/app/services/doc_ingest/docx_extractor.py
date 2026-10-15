"""DOCX → khối. Dùng style có sẵn của Word (Heading N, List …) nên không phải đoán cấu trúc."""
import io
import re
from typing import Any, Dict, List

_HEADING_STYLE = re.compile(r"^(?:heading|tiêu đề|tieu de)\s*(\d)", re.IGNORECASE)


def _paragraph_text(paragraph) -> str:
    """Nối các run, bọc đoạn in đậm bằng **…** (gộp các run đậm liền nhau)."""
    parts: List[List[Any]] = []  # [bold, text]
    for run in paragraph.runs:
        if not run.text:
            continue
        bold = bool(run.bold)
        if parts and parts[-1][0] == bold:
            parts[-1][1] += run.text
        else:
            parts.append([bold, run.text])
    if not parts:
        return paragraph.text.strip()

    out = []
    for bold, text in parts:
        core = text.strip()
        if bold and core:
            lead = text[: len(text) - len(text.lstrip())]
            trail = text[len(text.rstrip()):]
            out.append(f"{lead}**{core}**{trail}")
        else:
            out.append(text)
    return re.sub(r"[ \t]+", " ", "".join(out)).strip()


def _is_list_paragraph(paragraph) -> bool:
    style = (paragraph.style.name or "").lower() if paragraph.style is not None else ""
    if "list" in style:
        return True
    ppr = paragraph._p.pPr
    return ppr is not None and ppr.numPr is not None


def extract_docx_blocks(docx_bytes: bytes) -> List[Dict[str, Any]]:
    from docx import Document
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    document = Document(io.BytesIO(docx_bytes))
    blocks: List[Dict[str, Any]] = []

    for child in document.element.body.iterchildren():
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            paragraph = Paragraph(child, document)
            style = (paragraph.style.name or "") if paragraph.style is not None else ""
            heading = _HEADING_STYLE.match(style)
            is_title = style.lower() in ("title", "subtitle")
            text = paragraph.text.strip() if (heading or is_title) else _paragraph_text(paragraph)
            if not text:
                continue
            if heading or is_title:
                level = min(int(heading.group(1)), 3) if heading else (1 if style.lower() == "title" else 2)
                blocks.append({"block_type": "heading", "level": level, "text": text, "page_number": None})
            elif _is_list_paragraph(paragraph):
                blocks.append({"block_type": "list_item", "level": None, "text": text, "page_number": None})
            else:
                blocks.append({"block_type": "paragraph", "level": None, "text": text, "page_number": None})
        elif tag == "tbl":
            rows = []
            for row in Table(child, document).rows:
                cells, seen = [], set()
                for cell in row.cells:  # ô gộp lặp lại cùng một đối tượng
                    if id(cell._tc) in seen:
                        continue
                    seen.add(id(cell._tc))
                    cells.append(" ".join(cell.text.split()))
                if any(cells):
                    rows.append(" | ".join(cells))
            if rows:
                blocks.append({"block_type": "table", "level": None, "text": "\n".join(rows), "page_number": None})
    return blocks
