"""
Exam Builder — dựng bộ đề (đề nháp + đáp án + báo lỗi) từ khối nội dung của một cuốn sách đề.

    drafts = build_exam_drafts(blocks)            # chỉ dùng luật, lặp lại được
    drafts = build_exam_drafts(blocks, llm=...)   # nhóm khó được mô hình trích lại có kiểm chứng

Mỗi đề nháp còn phải được người dùng duyệt (xem màn hình duyệt đề) trước khi publish.
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.services.exam_builder.answer_key import build_answer_entries, parse_numbered_answers
from app.services.exam_builder.extractor import (
    GeminiJsonLLM, JsonLLM, block_text, extract_passage, extract_speaking, extract_writing_task, group_needs_help,
    parse_group, refine_group,
)
from app.services.exam_builder.schema import empty_content, question_numbers
from app.services.exam_builder.segmenter import (
    Block, TestSegments, segment_blocks, split_question_groups,
)
from app.services.exam_builder.validator import validate_exam


@dataclass
class ExamDraft:
    test_number: int
    title: str
    content: Dict[str, Any]
    answer_key: Dict[str, Any]
    validation: Dict[str, Any]
    segments: Dict[str, Any] = field(default_factory=dict)


def _material(blocks: List[Block]) -> Dict[str, Any]:
    return {
        "text": "\n\n".join((b.get("text") or "").strip() for b in blocks if block_text(b)),
        "source_block_ids": [b.get("id") for b in blocks if b.get("id")],
    }


def _pages(blocks: List[Block]) -> Optional[List[int]]:
    pages = [b["page_number"] for b in blocks if b.get("page_number")]
    return [min(pages), max(pages)] if pages else None


def _groups(blocks: List[Block], llm: Optional[JsonLLM], llm_mode: str):
    pre, segments = split_question_groups(blocks)
    groups = []
    for segment in segments:
        group = parse_group(segment.start, segment.end, segment.blocks)
        group["pages"] = _pages(segment.blocks)
        if llm is not None and (llm_mode == "always" or group_needs_help(group)):
            body = "\n".join(block_text(b) for b in segment.blocks)
            group = refine_group(llm, group, body)
        if group["source"] == "heuristic" and group_needs_help(group):
            group["needs_review"] = True
        groups.append(group)
    return pre, groups


def build_test_draft(seg: TestSegments, llm: Optional[JsonLLM] = None, llm_mode: str = "when_needed",
                     title: Optional[str] = None) -> ExamDraft:
    content = empty_content(title or f"Test {seg.number}")
    sections = content["sections"]

    if seg.listening:
        parts = []
        for part_no in sorted(seg.listening):
            _pre, groups = _groups(seg.listening[part_no], llm, llm_mode)
            parts.append({"part": part_no, "groups": groups})
        sections["listening"] = {"audio_url": None, "parts": parts}

    if seg.reading:
        passages = []
        for index in sorted(seg.reading):
            pre, groups = _groups(seg.reading[index], llm, llm_mode)
            passages.append({"index": index, **extract_passage(pre), "pages": _pages(pre), "groups": groups})
        sections["reading"] = {"passages": passages}

    if seg.writing:
        sections["writing"] = {f"task{n}": {**extract_writing_task(seg.writing[n]), "pages": _pages(seg.writing[n])}
                               for n in sorted(seg.writing)}

    if seg.speaking:
        sections["speaking"] = extract_speaking(seg.speaking)

    content["materials"] = {
        "audioscripts": [{"part": part, **_material(blocks)} for part, blocks in sorted(seg.audioscripts.items())],
        "sample_answers": [{"task": task, **_material(blocks)} for task, blocks in sorted(seg.samples.items())],
    }

    answer_key: Dict[str, Any] = {}
    for skill in ("listening", "reading"):
        blocks = seg.answers.get(skill)
        if skill in sections and blocks:
            text = "\n".join(block_text(b) for b in blocks)
            raw = parse_numbered_answers(text, sorted(set(question_numbers(content, skill))))
            answer_key[skill] = build_answer_entries(raw)

    validation = validate_exam(content, answer_key)
    return ExamDraft(seg.number, content["title"], content, answer_key, validation, seg.summary())


def build_exam_drafts(blocks: List[Block], llm: Optional[JsonLLM] = None,
                      llm_mode: str = "when_needed") -> List[ExamDraft]:
    """Một sách có thể chứa nhiều Test → nhiều đề nháp, theo thứ tự số Test."""
    tests = segment_blocks(blocks)
    return [build_test_draft(tests[number], llm, llm_mode) for number in sorted(tests)
            if _has_questions(tests[number])]


def _has_questions(seg: TestSegments) -> bool:
    return bool(seg.listening or seg.reading or seg.writing or seg.speaking)


__all__ = [
    "ExamDraft", "GeminiJsonLLM", "JsonLLM", "build_exam_drafts", "build_test_draft", "segment_blocks",
    "validate_exam",
]
