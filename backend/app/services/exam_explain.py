"""
Giải thích từng câu Listening/Reading sau khi nộp bài: vì sao đáp án đúng, bằng chứng nằm ở đâu trong bài đọc/audioscript.

Có AI (Gemini) thì để AI viết, nhưng câu bằng chứng phải là nguyên văn trích từ nguồn (không thì thay bằng câu
tìm theo luật). Không có AI hoặc AI lỗi → giải thích theo luật, vẫn chỉ ra câu bằng chứng và mẹo theo dạng câu hỏi.
"""
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.services.exam_builder.answer_key import normalize_answer
from app.services.exam_builder.schema import iter_groups

logger = logging.getLogger(__name__)

TYPE_TIPS = {
    "multiple_choice": "Gạch chân từ khoá của câu hỏi rồi tìm đoạn paraphrase trong bài; loại từng phương án sai thay vì chọn theo cảm giác.",
    "multiple_select": "Mỗi lựa chọn đúng phải có bằng chứng riêng trong bài; đừng chọn hai ý cùng một đoạn chỉ vì cùng chủ đề.",
    "true_false_ng": "FALSE là bài nói ngược lại; NOT GIVEN là bài không nhắc tới. Đừng dùng kiến thức bên ngoài để quyết định.",
    "yes_no_ng": "YES/NO là ý kiến của tác giả; NOT GIVEN là bài không cho biết quan điểm đó. Phân biệt ý kiến với sự kiện.",
    "matching_headings": "Đọc câu đầu và câu cuối mỗi đoạn để nắm ý chính, đừng chọn heading chỉ vì một từ trùng với bài.",
    "matching_information": "Tìm thông tin cụ thể trong từng đoạn; một đoạn có thể được dùng nhiều lần nếu đề không cấm.",
    "matching_features": "Gạch tên người/đối tượng trong bài rồi dò xem họ nói gì, đối chiếu từng đặc điểm.",
    "sentence_completion": "Đáp án thường lấy nguyên văn từ bài, đúng ngữ pháp với câu cần điền và đúng giới hạn số từ.",
    "summary_completion": "Xác định đoạn bài được tóm tắt, dự đoán loại từ cần điền (danh từ/động từ…) rồi dò trong bài.",
    "note_completion": "Nghe từ khoá quanh chỗ trống; chú ý chính tả và giới hạn số từ vì sai chính tả bị tính sai.",
    "table_completion": "Đọc tiêu đề cột/hàng trước khi nghe để biết loại thông tin cần bắt.",
    "form_completion": "Chú ý chữ cái đánh vần, số điện thoại, ngày tháng; người nói thường tự sửa lại thông tin.",
    "flow_chart_completion": "Các bước đi theo thứ tự thời gian; tìm từ chỉ trình tự (first, then, after that).",
    "diagram_labelling": "Đối chiếu nhãn với mô tả vị trí/chức năng trong bài.",
    "map_labelling": "Theo dõi từ chỉ hướng và vị trí (opposite, next to, on the left) và định vị theo lộ trình người nói đi.",
    "short_answer": "Trả lời đúng loại thông tin mà từ để hỏi yêu cầu (who/when/how many) và lấy từ nguyên văn.",
}
DEFAULT_TIP = "Đọc kỹ yêu cầu về số từ và đối chiếu đáp án với đúng đoạn có bằng chứng."

_STOP = {
    "the", "a", "an", "of", "to", "in", "on", "at", "for", "and", "or", "is", "are", "was", "were", "be", "that",
    "this", "it", "with", "as", "by", "from", "which", "what", "who", "when", "how", "do", "does", "did", "has",
    "have", "had", "not", "but", "their", "they", "he", "she", "his", "her", "its", "than", "more", "most",
}
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")


def _tokens(text: str) -> List[str]:
    return [t for t in re.findall(r"[a-z0-9']+", (text or "").lower()) if t not in _STOP and len(t) > 1]


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", (text or "").lower())).strip()


def _sentences(text: str) -> List[str]:
    cleaned = re.sub(r"[*_#>]+", "", text or "")
    return [s.strip() for s in _SENT_SPLIT.split(cleaned) if len(s.strip()) > 20]


def _find_question(content: Dict[str, Any], skill: str, number: int) -> Optional[Tuple[str, Dict[str, Any], Dict[str, Any]]]:
    for label, group in iter_groups(content, skill):
        for q in group.get("questions", []):
            if q.get("number") == number:
                return label, group, q
    return None


def _source_text(content: Dict[str, Any], skill: str, label: str) -> str:
    if skill == "reading":
        for passage in ((content.get("sections") or {}).get("reading") or {}).get("passages", []):
            if f"Passage {passage.get('index')}" == label:
                return str(passage.get("body_markdown") or "")
        return ""
    part = label.replace("Part", "").strip()
    scripts = (content.get("materials") or {}).get("audioscripts", [])
    chosen = [str(s.get("text") or "") for s in scripts if str(s.get("part")) == part]
    return "\n".join(chosen) if chosen else "\n".join(str(s.get("text") or "") for s in scripts)


def _option_text(group: Dict[str, Any], question: Dict[str, Any], key: str) -> str:
    options = question.get("options") or group.get("shared_options") or []
    for option in options:
        if str(option.get("key", "")).strip().upper() == key.strip().upper():
            return str(option.get("text") or "")
    return ""


def find_evidence(source: str, query_texts: List[str], answers: List[str]) -> Optional[str]:
    """Câu trong nguồn khớp nhất với câu hỏi + đáp án (đáp án nằm trong câu được cộng điểm cao)."""
    sentences = _sentences(source)
    if not sentences:
        return None
    wanted = set()
    for text in query_texts:
        wanted.update(_tokens(text))
    answer_norms = [_norm(a) for a in answers if len(_norm(a)) > 1]
    best, best_score = None, 0.0
    for sentence in sentences:
        tokens = set(_tokens(sentence))
        score = float(len(wanted & tokens))
        padded = f" {_norm(sentence)} "
        if any(f" {a} " in padded for a in answer_norms):
            score += 4.0
        if score > best_score:
            best, best_score = sentence, score
    return best if best_score >= 2.0 else None


def _rule_explanation(qtype: str, question_text: str, correct: List[str], correct_text: str, user: str,
                      user_text: str, is_correct: bool, evidence: Optional[str]) -> str:
    shown = " / ".join(correct) if correct else "(chưa có đáp án)"
    lead = f"Đáp án đúng là {shown}" + (f" ({correct_text})" if correct_text else "") + "."
    parts = [lead]
    if qtype in ("true_false_ng", "yes_no_ng"):
        verdict = (correct[0] if correct else "").upper()
        if verdict in ("NOT GIVEN",):
            parts.append("Bài không nêu thông tin này nên không thể kết luận đúng hay sai." if not evidence else
                         f"Đoạn gần nhất là: “{evidence}” nhưng nó không xác nhận cũng không phủ nhận ý của câu hỏi.")
        elif evidence:
            relation = "xác nhận" if verdict in ("TRUE", "YES") else "mâu thuẫn với"
            parts.append(f"Câu trong bài: “{evidence}” {relation} nội dung câu hỏi.")
    elif evidence:
        parts.append(f"Bằng chứng trong bài: “{evidence}”.")
    else:
        parts.append("Không tìm được câu bằng chứng rõ ràng trong nguồn; hãy dò lại đoạn có từ khoá của câu hỏi.")
    if not is_correct:
        if user:
            parts.append(f"Bạn đã chọn/điền “{user}”" + (f" ({user_text})" if user_text else "") +
                         ", không khớp với bằng chứng ở trên.")
        else:
            parts.append("Bạn đã bỏ trống câu này; hãy luôn điền một đáp án vì không bị trừ điểm khi sai.")
    return " ".join(parts)


def explain_question(content: Dict[str, Any], key: Dict[str, Any], answers: Dict[str, Any], skill: str,
                     number: int, llm: Any = None) -> Optional[Dict[str, Any]]:
    found = _find_question(content, skill, number)
    if not found:
        return None
    label, group, question = found
    qtype = group.get("type") or "short_answer"
    entry = (key.get(skill) or {}).get(str(number)) or {}
    correct = [str(a) for a in entry.get("accept", [])]
    user = str(answers.get(f"{skill}_{number}", "") or "").strip()
    is_correct = bool(user) and any(normalize_answer(user) == normalize_answer(a) for a in correct)

    option_keys = [a for a in correct if re.fullmatch(r"[A-Ia-i]|[ivx]+", a.strip())]
    correct_text = "; ".join(t for t in (_option_text(group, question, a) for a in option_keys) if t)
    user_text = _option_text(group, question, user) if re.fullmatch(r"[A-Ia-i]|[ivx]+", user.strip()) else ""

    source = _source_text(content, skill, label)
    queries = [question.get("question", ""), correct_text, group.get("context_title") or ""]
    evidence = find_evidence(source, queries, [*correct, correct_text] if correct_text else correct)
    tip = TYPE_TIPS.get(qtype, DEFAULT_TIP)
    explanation = _rule_explanation(qtype, question.get("question", ""), correct, correct_text, user, user_text,
                                    is_correct, evidence)
    scored_by = "rule"

    if llm is not None and source:
        prompt = (
            "You are an IELTS tutor. Explain in Vietnamese (2-4 sentences, concrete) why the correct answer is right "
            "and, if the student's answer is wrong, why it is wrong. Quote ONE sentence copied EXACTLY from the SOURCE as "
            "evidence. Reply JSON only: {\"explanation_vi\": str, \"evidence\": str, \"tip_vi\": str}.\n\n"
            f"Question type: {qtype}\nQuestion {number}: {question.get('question', '')}\n"
            f"Options: {question.get('options') or group.get('shared_options') or 'n/a'}\n"
            f"Correct answer(s): {correct}\nStudent answer: {user or '(blank)'}\n\nSOURCE:\n{source[:7000]}"
        )
        try:
            result = llm.generate_json(prompt)
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Explanation AI failed for {skill} {number}: {e}")
            result = None
        if isinstance(result, dict) and str(result.get("explanation_vi") or "").strip():
            quoted = str(result.get("evidence") or "").strip()
            if quoted and _norm(quoted) in _norm(source):
                evidence = quoted
            explanation = str(result["explanation_vi"]).strip()
            tip = str(result.get("tip_vi") or "").strip() or tip
            scored_by = "ai"

    return {
        "number": number, "skill": skill, "type": qtype, "section": label,
        "question": question.get("question", ""),
        "user_answer": user, "correct_answers": correct, "is_correct": is_correct,
        "evidence": evidence, "explanation_vi": explanation, "tip_vi": tip, "scored_by": scored_by,
    }
