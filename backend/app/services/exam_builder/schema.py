"""
ExamSet v1 — định dạng lưu đề thi (không chứa đáp án) và bộ chuyển sang dữ liệu cho phòng thi.

content = {
  "schema_version": 1, "family": "ielts", "mode": "academic", "title": "Test 1",
  "sections": {
     "listening": {"audio_url": None, "parts": [{"part": 1, "groups": [group, ...]}, ...]},
     "reading":   {"passages": [{"index", "title", "body_markdown", "source_block_ids", "groups": [...]}, ...]},
     "writing":   {"task1": {"prompt", "min_words", "image_url"}, "task2": {...}},
     "speaking":  {"part1": {"questions"}, "part2": {"cue_card", ...}, "part3": {"questions"}},
  },
  "materials": {"audioscripts": [...], "sample_answers": [...]}   # chỉ xem lại sau khi thi
}
group = {"instruction", "type", "word_limit", "allow_number", "context_title", "options_title",
         "shared_options": [{"key","text"}]|None, "image_url", "range": [a, b], "questions": [...], ...}
question = {"number", "question", "options": [{"key","text"}]|None}
"""
import copy
from typing import Any, Dict, Iterator, List, Optional, Tuple

SCHEMA_VERSION = 1

# Giao diện phòng thi hiện chỉ biết 3 kiểu hiển thị: chọn đáp án, T/F/NG và điền chữ
ROOM_TYPE = {
    "multiple_choice": "multiple_choice",
    "multiple_select": "multiple_choice",
    "matching_headings": "multiple_choice",
    "matching_information": "multiple_choice",
    "matching_features": "multiple_choice",
    "true_false_ng": "true_false_ng",
    "yes_no_ng": "true_false_ng",
}
TFNG_OPTIONS = {"true_false_ng": ["TRUE", "FALSE", "NOT GIVEN"], "yes_no_ng": ["YES", "NO", "NOT GIVEN"]}


def empty_content(title: str, family: str = "ielts", mode: str = "academic") -> Dict[str, Any]:
    return {"schema_version": SCHEMA_VERSION, "family": family, "mode": mode, "title": title,
            "sections": {}, "materials": {"audioscripts": [], "sample_answers": []}}


def iter_groups(content: Dict[str, Any], skill: str) -> Iterator[Tuple[str, Dict[str, Any]]]:
    """(nhãn phần, nhóm) theo thứ tự đề: "Part 2" / "Passage 1"."""
    section = (content.get("sections") or {}).get(skill) or {}
    if skill == "listening":
        for part in section.get("parts", []):
            for group in part.get("groups", []):
                yield f"Part {part.get('part')}", group
    elif skill == "reading":
        for passage in section.get("passages", []):
            for group in passage.get("groups", []):
                yield f"Passage {passage.get('index')}", group


def question_numbers(content: Dict[str, Any], skill: str) -> List[int]:
    return [q["number"] for _label, group in iter_groups(content, skill) for q in group.get("questions", [])]


def _option_strings(options: Optional[List[Dict[str, str]]]) -> Optional[List[str]]:
    if not options:
        return None
    return [f"{o['key']}. {o['text']}" for o in options]


def _room_items(content: Dict[str, Any], skill: str) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for label, group in iter_groups(content, skill):
        gtype = group.get("type", "short_answer")
        shared = group.get("shared_options")
        for q in group.get("questions", []):
            options = q.get("options") or shared
            keys: Optional[List[str]]
            if gtype in TFNG_OPTIONS:
                option_strings: Optional[List[str]] = TFNG_OPTIONS[gtype]
                keys = TFNG_OPTIONS[gtype]
            else:
                option_strings = _option_strings(options)
                keys = [o["key"] for o in options] if options else None
            room_type = ROOM_TYPE.get(gtype)
            if room_type is None:
                room_type = "note_completion" if skill == "listening" else "sentence_completion"
            item = {
                "number": q["number"],
                "type": room_type,
                "original_type": gtype,
                "question": q.get("question", ""),
                "options": option_strings,
                "option_keys": keys,
                "group_instruction": group.get("instruction", ""),
                "group_title": group.get("context_title"),
                "options_title": group.get("options_title"),
                "word_limit": group.get("word_limit"),
                "allow_number": group.get("allow_number", False),
                "image_url": group.get("image_url"),
                "choose_count": group.get("choose_count"),
            }
            if skill == "listening":
                item["section"] = label
            else:
                item["passage"] = label
            items.append(item)
    return sorted(items, key=lambda i: i["number"])


def to_exam_room_payload(content: Dict[str, Any], audio_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Dữ liệu gửi cho phòng thi. KHÔNG bao giờ chứa đáp án hay học liệu (audioscript, bài viết mẫu).
    Giữ các khoá phòng thi hiện đang đọc và bổ sung khoá mới (reading_passages, option_keys…).
    """
    sections = content.get("sections") or {}
    reading = sections.get("reading") or {}
    writing = sections.get("writing") or {}
    speaking = sections.get("speaking") or {}

    passages = [{"index": p.get("index"), "title": p.get("title", ""), "body_markdown": p.get("body_markdown", "")}
                for p in reading.get("passages", [])]
    joined = "\n\n".join(f"**{p['title']}**\n\n{p['body_markdown']}" if p["title"] else p["body_markdown"]
                         for p in passages)

    payload: Dict[str, Any] = {
        "listening": _room_items(content, "listening"),
        "reading": _room_items(content, "reading"),
        "reading_passage": joined,
        "reading_passages": passages,
        "writing_task1": (writing.get("task1") or {}).get("prompt", ""),
        "writing_task1_image": (writing.get("task1") or {}).get("image_url"),
        "writing_task1_min_words": (writing.get("task1") or {}).get("min_words") or 150,
        "writing_task2": (writing.get("task2") or {}).get("prompt", ""),
        "writing_task2_min_words": (writing.get("task2") or {}).get("min_words") or 250,
        "speaking": _room_speaking(speaking),
        "listening_audio": audio_url or (sections.get("listening") or {}).get("audio_url"),
    }
    return payload


def _room_speaking(speaking: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    if "part1" in speaking:
        out["part1"] = {"title": "Part 1 — Introduction & Interview", "duration": 270, "duration_seconds": 270,
                        "questions": speaking["part1"].get("questions", [])}
    if "part2" in speaking:
        out["part2"] = {"title": "Part 2 — Individual Long Turn", "prep": 60, "prep_seconds": 60,
                        "speaking": 120, "speaking_seconds": 120, "cue_card": speaking["part2"].get("cue_card", "")}
    if "part3" in speaking:
        out["part3"] = {"title": "Part 3 — Two-way Discussion", "duration": 270, "duration_seconds": 270,
                        "questions": speaking["part3"].get("questions", [])}
    return out


def strip_answers(content: Dict[str, Any]) -> Dict[str, Any]:
    """Bản sao nội dung đề không có học liệu (audioscript/bài mẫu) — an toàn để đưa cho thí sinh."""
    clean = copy.deepcopy(content)
    clean.pop("materials", None)
    return clean
