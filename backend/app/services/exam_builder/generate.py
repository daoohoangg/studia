"""
Sinh bài kiểm tra từ tài liệu học (không phải sách đề): một chương → bài đọc + câu hỏi có đáp án.

Mọi câu hỏi do AI sinh đều phải được kiểm chứng với nguyên văn: câu bằng chứng (evidence) phải nằm trong văn bản
và đáp án điền từ phải xuất hiện trong văn bản; câu không đạt bị loại — không bao giờ lấp chỗ trống bằng câu hỏi bịa.
"""
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.services.exam_builder.extractor import JsonLLM
from app.services.exam_builder.schema import empty_content

logger = logging.getLogger(__name__)

MAX_SOURCE_CHARS = 15000
MIN_SOURCE_CHARS = 400
MIN_QUESTIONS = 3
ALLOWED_TYPES = ("multiple_choice", "true_false_ng", "sentence_completion")

GENERATE_PROMPT = """You are an IELTS-style test writer. Write {count} comprehension questions about the text below.

Mix these types: multiple_choice (4 options A-D, exactly one correct), true_false_ng (answer TRUE, FALSE or NOT GIVEN),
sentence_completion (a sentence from the text with ONE gap written as ___; answer is 1-3 words copied from the text).

Return ONLY JSON:
{{"questions": [
  {{"type": "multiple_choice", "question": "...", "options": ["...", "...", "...", "..."], "answer": "B",
    "evidence": "one sentence copied EXACTLY from the text that proves the answer", "explanation_vi": "giải thích ngắn"}},
  {{"type": "true_false_ng", "question": "statement", "options": null, "answer": "NOT GIVEN",
    "evidence": "closest sentence copied exactly from the text (or empty for NOT GIVEN)", "explanation_vi": "..."}},
  {{"type": "sentence_completion", "question": "sentence with ___", "options": null, "answer": "word",
    "evidence": "the sentence copied exactly from the text", "explanation_vi": "..."}}
]}}

Rules: use only information in the text; do not invent facts; keep questions in English; do not repeat questions.

Text:
\"\"\"
{text}
\"\"\"
"""


class GenerationError(Exception):
    """Không sinh được bài kiểm tra đáng tin cậy (thông điệp hiển thị cho người dùng)."""


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[“”\"'’‘]", "'", text.replace("**", ""))).strip().lower()


def _grounded(evidence: str, source_norm: str) -> bool:
    ev = _normalize(evidence).rstrip(".")
    return len(ev) >= 12 and ev in source_norm


def _validate_question(raw: Dict[str, Any], source_norm: str) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    qtype = raw.get("type")
    question = str(raw.get("question") or "").strip()
    answer = str(raw.get("answer") or "").strip()
    if qtype not in ALLOWED_TYPES or len(question) < 8 or not answer:
        return None

    if qtype == "multiple_choice":
        options = raw.get("options")
        if not isinstance(options, list) or not 3 <= len(options) <= 5:
            return None
        texts = [str(o).strip() for o in options]
        letter = answer.upper()[:1]
        if len(set(t.lower() for t in texts)) != len(texts) or not all(texts) or letter not in "ABCDE"[:len(texts)]:
            return None
        if not _grounded(str(raw.get("evidence") or ""), source_norm):
            return None
        return {"type": qtype, "question": question, "answer": letter,
                "options": [{"key": "ABCDE"[i], "text": t} for i, t in enumerate(texts)]}

    if qtype == "true_false_ng":
        value = answer.upper().replace("_", " ")
        if value not in ("TRUE", "FALSE", "NOT GIVEN"):
            return None
        if value != "NOT GIVEN" and not _grounded(str(raw.get("evidence") or ""), source_norm):
            return None
        return {"type": qtype, "question": question, "answer": value, "options": None}

    # sentence_completion
    words = answer.split()
    if "___" not in question or question.count("___") != 1 or not 1 <= len(words) <= 3:
        return None
    if _normalize(answer) not in source_norm:
        return None
    return {"type": qtype, "question": question, "answer": answer, "options": None}


def build_practice_exam(title: str, text: str, count: int, llm: Optional[JsonLLM]) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """Trả về (content, answer_key, báo cáo). Ném GenerationError khi không có AI hoặc kết quả không đạt."""
    text = (text or "").strip()
    if len(text) < MIN_SOURCE_CHARS:
        raise GenerationError("Đoạn văn quá ngắn để tạo câu hỏi (cần ít nhất vài đoạn văn).")
    if llm is None:
        raise GenerationError("Cần cấu hình GEMINI_API_KEY hợp lệ để AI tạo câu hỏi.")
    count = max(MIN_QUESTIONS, min(int(count), 20))

    source = text[:MAX_SOURCE_CHARS]
    try:
        result = llm.generate_json(GENERATE_PROMPT.format(count=count + 3, text=source))
    except Exception as e:
        logger.warning(f"Practice exam generation failed: {e}")
        result = None
    items = result.get("questions") if isinstance(result, dict) else None
    if not isinstance(items, list):
        raise GenerationError("AI không trả về câu hỏi hợp lệ. Hãy thử lại sau.")

    source_norm = _normalize(source)
    valid: List[Dict[str, Any]] = []
    seen = set()
    for raw in items:
        question = _validate_question(raw, source_norm)
        if not question or question["question"].lower() in seen:
            continue
        seen.add(question["question"].lower())
        valid.append(question)
        if len(valid) >= count:
            break
    if len(valid) < MIN_QUESTIONS:
        raise GenerationError(f"AI chỉ tạo được {len(valid)} câu hỏi đạt kiểm chứng với nội dung "
                              f"(cần tối thiểu {MIN_QUESTIONS}). Hãy chọn đoạn dài hơn hoặc thử lại.")

    # Gom theo dạng, đánh số liên tục
    order = {"multiple_choice": 0, "true_false_ng": 1, "sentence_completion": 2}
    valid.sort(key=lambda q: order[q["type"]])
    groups: Dict[str, Dict[str, Any]] = {}
    key: Dict[str, Any] = {}
    instructions = {
        "multiple_choice": "Choose the correct letter, A, B, C or D.",
        "true_false_ng": "Do the following statements agree with the information in the text? "
                         "Write TRUE, FALSE or NOT GIVEN.",
        "sentence_completion": "Complete the sentences below. Write NO MORE THAN THREE WORDS from the text.",
    }
    for number, q in enumerate(valid, start=1):
        group = groups.setdefault(q["type"], {
            "instruction": instructions[q["type"]], "type": q["type"],
            "word_limit": 3 if q["type"] == "sentence_completion" else None, "allow_number": False,
            "context_title": None, "options_title": None, "shared_options": None, "image_url": None,
            "range": [number, number], "questions": [], "source": "ai",
        })
        group["questions"].append({"number": number, "question": q["question"], "options": q["options"]})
        group["range"][1] = number
        key[str(number)] = {"raw": q["answer"], "accept": [q["answer"]]}

    content = empty_content(title, family="generic")
    content["sections"] = {"reading": {"passages": [{
        "index": 1, "title": title, "body_markdown": text[:20000], "source_block_ids": [],
        "groups": list(groups.values()),
    }]}}
    report = {"requested": count, "generated": len(valid), "candidates": len(items)}
    return content, {"reading": key}, report
