"""
Export & Integration Engine — Studia v2
Tích hợp xuất dữ liệu Flashcard sang định dạng Anki CSV / JSON và xuất Lịch học sang iCalendar (.ics).
"""
from typing import Dict, List, Any, Optional
import csv
import html
import io
import json
import re

_FORMULA_PREFIX_RE = re.compile(r"^\s*[=+\-@\t\r]")
_ICAL_CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _csv_safe(value: Any) -> str:
    """Neutralize spreadsheet formula injection and escape HTML for safe Anki TSV export."""
    text = str(value or "")
    if _FORMULA_PREFIX_RE.match(text):
        text = "'" + text
    return text


def _ical_escape(value: Any) -> str:
    """Escape text per RFC 5545 and strip control chars/newlines to prevent VEVENT injection."""
    text = _ICAL_CTRL_RE.sub("", str(value or ""))
    text = text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
    text = text.replace("\r\n", "\\n").replace("\r", "\\n").replace("\n", "\\n")
    return text


class ExportEngine:
    """
    Engine hỗ trợ xuất dữ liệu (Phase 5 Enterprise Integration):
    - export_flashcards_anki_csv: Trích xuất danh sách Flashcard thành tệp CSV tương thích Anki (.apkg/CSV import)
    - export_flashcards_json: Trích xuất JSON thuần
    - export_schedule_ical: Trích xuất lịch học thành file iCalendar (.ics) cho Google Calendar / Outlook
    """

    @staticmethod
    def export_flashcards_anki_csv(flashcards: List[Dict[str, Any]]) -> str:
        """
        Tạo nội dung CSV chuẩn Anki Import:
        Column 1: Front
        Column 2: Back
        Column 3: Tags / Topic
        Column 4: Source Chunk
        """
        output = io.StringIO()
        writer = csv.writer(output, delimiter='\t', quoting=csv.QUOTE_MINIMAL)

        # Header cho Anki
        writer.writerow(["# separator:tab"])
        writer.writerow(["# html:true"])
        writer.writerow(["# tags column:3"])

        for card in flashcards:
            front = _csv_safe(html.escape(str(card.get("front") or ""), quote=True)).replace("\n", "<br>")
            back = _csv_safe(html.escape(str(card.get("back") or ""), quote=True)).replace("\n", "<br>")
            tags_raw = re.sub(r"\s+", "_", str(card.get("card_type") or "studia_card").strip())
            tags = _csv_safe(html.escape(tags_raw, quote=True))
            source = _csv_safe(html.escape(str(card.get("source_chunk") or "")[:200], quote=True)).replace("\n", " ")

            writer.writerow([front, back, tags, source])

        return output.getvalue()

    @staticmethod
    def export_flashcards_json(flashcards: List[Dict[str, Any]]) -> str:
        """Xuất Flashcards ra định dạng JSON formatted."""
        return json.dumps(flashcards, ensure_ascii=False, indent=2)

    @staticmethod
    def export_schedule_ical(plans: List[Dict[str, Any]], title: str = "Studia Adaptive Study Plan") -> str:
        """
        Xuất kế hoạch học tập thành định dạng iCalendar (.ics).
        """
        ics_lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Studia Intelligence//Adaptive Learning Platform//VN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            f"X-WR-CALNAME:{_ical_escape(title)}"
        ]

        for idx, plan in enumerate(plans):
            date_str = str(plan.get("plan_date") or "")
            digits = re.sub(r"[^0-9]", "", date_str)[:8]
            clean_date = digits if len(digits) == 8 else "20261003"
            tasks = plan.get("tasks", []) or []
            task_desc = "\\n".join([
                f"- {_ical_escape(t.get('title') or t.get('topic_name') or 'Nhiệm vụ')}"
                for t in tasks if isinstance(t, dict)
            ])

            ics_lines.extend([
                "BEGIN:VEVENT",
                f"UID:studia-plan-{idx}-{clean_date}@studia.app",
                f"DTSTAMP:{clean_date}T080000Z",
                f"DTSTART;VALUE=DATE:{clean_date}",
                f"SUMMARY:📚 Studia: Lịch học Ngày {idx+1}",
                f"DESCRIPTION:Nhiệm vụ học tập hôm nay:\\n{task_desc}",
                "STATUS:CONFIRMED",
                "END:VEVENT"
            ])

        ics_lines.append("END:VCALENDAR")
        return "\r\n".join(ics_lines)
