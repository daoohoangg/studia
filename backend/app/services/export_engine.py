"""
Export & Integration Engine — Studia v2
Tích hợp xuất dữ liệu Flashcard sang định dạng Anki CSV / JSON và xuất Lịch học sang iCalendar (.ics).
"""
from typing import Dict, List, Any, Optional
import csv
import io
import json

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
            front = card.get("front", "").replace("\n", "<br>")
            back = card.get("back", "").replace("\n", "<br>")
            tags = card.get("card_type", "studia_card")
            source = card.get("source_chunk", "")[:200].replace("\n", " ")

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
            f"X-WR-CALNAME:{title}"
        ]

        for idx, plan in enumerate(plans):
            date_str = plan.get("plan_date", "")
            # Định dạng date YYYYMMDD
            clean_date = date_str.replace("-", "") if date_str else "20261003"
            tasks = plan.get("tasks", [])
            task_desc = "\\n".join([f"- {t.get('title', 'Nhiệm vụ')}" for t in tasks])

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
