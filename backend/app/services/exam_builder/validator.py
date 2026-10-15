"""Kiểm tra đề nháp: lỗi (chặn publish) và cảnh báo (nên xem lại)."""
import re
from typing import Any, Dict, List, Optional

from app.services.exam_builder.schema import iter_groups, question_numbers

IMAGE_NEEDED_TYPES = {"map_labelling", "diagram_labelling", "flow_chart_completion"}
IMAGE_WORDS = re.compile(r"\b(graph|chart|diagram|map|picture|illustration|illustrates|process|plan)\b", re.IGNORECASE)
EXPECTED_QUESTIONS = 40
MIN_PASSAGE_WORDS = 300


def _issue(severity: str, code: str, message: str, section: Optional[str] = None,
           question: Optional[int] = None, block_id: Optional[str] = None) -> Dict[str, Any]:
    item: Dict[str, Any] = {"severity": severity, "code": code, "message": message}
    if section:
        item["section"] = section
    if question is not None:
        item["question"] = question
    if block_id:
        item["block_id"] = block_id
    return item


def _key_covers(entry: Optional[Dict[str, Any]]) -> bool:
    return bool(entry and entry.get("accept"))


def validate_exam(content: Dict[str, Any], answer_key: Dict[str, Any], has_audio: bool = False) -> Dict[str, Any]:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []
    sections = content.get("sections") or {}
    stats: Dict[str, int] = {}

    for skill in ("listening", "reading"):
        if skill not in sections:
            continue
        numbers = question_numbers(content, skill)
        stats[skill] = len(numbers)
        if not numbers:
            errors.append(_issue("error", "NO_QUESTIONS", f"Phần {skill} không có câu hỏi nào.", skill))
            continue

        seen = set()
        for n in numbers:
            if n in seen:
                errors.append(_issue("error", "DUPLICATE_NUMBER", f"Câu {n} xuất hiện nhiều lần.", skill, n))
            seen.add(n)
        expected = set(range(1, max(numbers) + 1))
        for n in sorted(expected - seen):
            errors.append(_issue("error", "MISSING_NUMBER", f"Thiếu câu số {n}.", skill, n))
        if len(seen) != EXPECTED_QUESTIONS:
            warnings.append(_issue("warning", "QUESTION_COUNT",
                                   f"Phần {skill} có {len(seen)} câu (đề IELTS chuẩn có {EXPECTED_QUESTIONS}).", skill))

        key = answer_key.get(skill) or {}
        for label, group in iter_groups(content, skill):
            gtype = group.get("type")
            shared = group.get("shared_options") or []
            for q in group.get("questions", []):
                n = q["number"]
                if not (q.get("question") or "").strip() and gtype != "multiple_select":
                    errors.append(_issue("error", "EMPTY_QUESTION", f"Câu {n} không có nội dung.", skill, n))
                options = q.get("options") or shared
                entry = key.get(str(n))
                if not _key_covers(entry):
                    errors.append(_issue("error", "MISSING_KEY", f"Câu {n} chưa có đáp án.", skill, n))
                if gtype in ("multiple_choice", "multiple_select"):
                    if len(options or []) < 2:
                        errors.append(_issue("error", "MCQ_OPTIONS",
                                             f"Câu {n} là trắc nghiệm nhưng có dưới 2 lựa chọn.", skill, n))
                elif gtype in ("matching_headings", "matching_information", "matching_features"):
                    if len(options or []) < 2:
                        errors.append(_issue("error", "MATCHING_OPTIONS",
                                             f"Câu {n} thuộc dạng nối nhưng không có danh sách lựa chọn.", skill, n))
                if entry and options and gtype in ("multiple_choice", "multiple_select", "matching_headings",
                                                   "matching_information", "matching_features"):
                    keys = {o["key"].casefold() for o in options}
                    if not any(a.strip().casefold() in keys for a in entry.get("accept", [])):
                        errors.append(_issue(
                            "error", "KEY_NOT_IN_OPTIONS",
                            f"Đáp án câu {n} ({', '.join(entry.get('accept', []))}) không nằm trong các lựa chọn.",
                            skill, n))
            if gtype in IMAGE_NEEDED_TYPES and not group.get("image_url"):
                warnings.append(_issue("warning", "IMAGE_MISSING",
                                       f"Nhóm câu {group.get('range', ['?'])[0]}–{group.get('range', ['?', '?'])[1]} "
                                       f"({gtype}) cần hình nhưng chưa có.", skill, group.get("range", [None])[0]))
            if gtype not in ("multiple_choice", "multiple_select", "true_false_ng", "yes_no_ng") \
                    and not group.get("word_limit") and gtype not in ("matching_headings", "matching_information",
                                                                      "matching_features", "map_labelling"):
                warnings.append(_issue("warning", "NO_WORD_LIMIT",
                                       f"Nhóm câu {group.get('range', ['?'])[0]} chưa xác định giới hạn số từ.",
                                       skill, group.get("range", [None])[0]))
            if group.get("source") == "heuristic" and group.get("needs_review"):
                warnings.append(_issue("warning", "LOW_CONFIDENCE",
                                       f"Nhóm câu {group.get('range', ['?'])[0]} được tách bằng luật, nên xem lại.",
                                       skill, group.get("range", [None])[0]))

        orphans = sorted(int(n) for n in key if int(n) not in seen)
        for n in orphans:
            warnings.append(_issue("warning", "ORPHAN_KEY", f"Có đáp án cho câu {n} nhưng không có câu hỏi.", skill, n))

    if "listening" in sections and not (has_audio or (sections["listening"] or {}).get("audio_url")):
        warnings.append(_issue("warning", "LISTENING_AUDIO_MISSING",
                               "Chưa tải file audio cho phần Listening.", "listening"))

    reading = sections.get("reading") or {}
    stats["passages"] = len(reading.get("passages", []))
    for passage in reading.get("passages", []):
        body = passage.get("body_markdown", "")
        words = len(body.split())
        if not body.strip():
            errors.append(_issue("error", "PASSAGE_EMPTY", f"Bài đọc {passage.get('index')} không có nội dung.",
                                 "reading"))
        elif words < MIN_PASSAGE_WORDS:
            warnings.append(_issue("warning", "PASSAGE_SHORT",
                                   f"Bài đọc {passage.get('index')} chỉ có {words} từ — có thể bị cắt dở.", "reading"))

    writing = sections.get("writing")
    if writing is not None:
        tasks = [t for t in ("task1", "task2") if (writing.get(t) or {}).get("prompt", "").strip()]
        stats["writing_tasks"] = len(tasks)
        for task in ("task1", "task2"):
            if task not in tasks:
                errors.append(_issue("error", "WRITING_TASK_MISSING",
                                     f"Thiếu đề Writing {task.replace('task', 'Task ')}.", "writing"))
        t1 = writing.get("task1") or {}
        if t1.get("prompt") and IMAGE_WORDS.search(t1["prompt"]) and not t1.get("image_url"):
            warnings.append(_issue("warning", "WRITING_IMAGE_MISSING",
                                   "Đề Writing Task 1 nhắc tới biểu đồ/hình nhưng chưa có hình.", "writing"))

    speaking = sections.get("speaking")
    if speaking is not None:
        stats["speaking_parts"] = len(speaking)
        for part in ("part1", "part2", "part3"):
            data = speaking.get(part) or {}
            if part == "part2":
                if not (data.get("cue_card") or "").strip():
                    errors.append(_issue("error", "SPEAKING_PART_EMPTY", "Speaking Part 2 chưa có cue card.", "speaking"))
            elif not data.get("questions"):
                errors.append(_issue("error", "SPEAKING_PART_EMPTY",
                                     f"Speaking {part.replace('part', 'Part ')} chưa có câu hỏi.", "speaking"))

    return {"errors": errors, "warnings": warnings, "stats": stats, "ok": not errors}
