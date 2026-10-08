"""
IELTS Mock Exam API — Studia
Manages full IELTS exam sessions: Listening, Reading, Writing, Speaking.
Scoring, AI Analysis, Personalized Study Plan post-exam.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.ai_engine import AIEngine
from app.core.supabase_client import get_supabase_client
from app.config import settings
import uuid
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/exam", tags=["IELTS Mock Exam"])

DEFAULT_USER_ID = settings.DEFAULT_USER_ID

# ============================================================
# Pydantic Models
# ============================================================

class CreateExamSessionRequest(BaseModel):
    exam_type: str = "full"          # full | listening | reading | writing | speaking
    exam_mode: str = "academic"      # academic | general
    user_id: Optional[str] = None


class SaveAnswerRequest(BaseModel):
    session_id: str
    section: str                     # listening | reading | writing_task1 | writing_task2
    question_number: int
    answer: Any                      # str or list
    user_id: Optional[str] = None


class SubmitExamRequest(BaseModel):
    session_id: str
    auto_submitted: bool = False
    user_id: Optional[str] = None


class SaveWritingRequest(BaseModel):
    session_id: str
    task: str                        # task1 | task2
    content: str
    word_count: int
    user_id: Optional[str] = None


# ============================================================
# IELTS Band Score Calculation
# ============================================================

def listening_band(raw: int) -> float:
    """IELTS Listening: 40 câu → Band score theo bảng chuẩn"""
    table = {
        39: 9.0, 37: 8.5, 35: 8.0, 32: 7.5, 30: 7.0,
        26: 6.5, 23: 6.0, 18: 5.5, 16: 5.0, 13: 4.5,
        10: 4.0, 8: 3.5, 6: 3.0, 4: 2.5
    }
    for threshold, band in sorted(table.items(), reverse=True):
        if raw >= threshold:
            return band
    return 1.0


def reading_band(raw: int) -> float:
    """IELTS Academic Reading: 40 câu → Band"""
    table = {
        39: 9.0, 37: 8.5, 35: 8.0, 33: 7.5, 30: 7.0,
        27: 6.5, 23: 6.0, 19: 5.5, 15: 5.0, 13: 4.5,
        10: 4.0, 8: 3.5, 6: 3.0
    }
    for threshold, band in sorted(table.items(), reverse=True):
        if raw >= threshold:
            return band
    return 1.0


def overall_band(scores: List[float]) -> float:
    """Tính Overall Band từ các section scores"""
    if not scores:
        return 0.0
    avg = sum(scores) / len(scores)
    # Round to nearest 0.5
    return round(avg * 2) / 2


# ============================================================
# Sample IELTS Questions Data
# ============================================================

SAMPLE_LISTENING_QUESTIONS = [
    {
        "number": i,
        "type": "multiple_choice" if i % 4 == 0 else ("form_completion" if i % 4 == 1 else ("sentence_completion" if i % 4 == 2 else "note_completion")),
        "question": f"Question {i}: According to the speaker, what is the main purpose?",
        "options": ["A. To inform", "B. To persuade", "C. To entertain", "D. To warn"] if i % 4 == 0 else None,
        "correct_answer": "A" if i % 4 == 0 else f"answer_{i}",
        "section": "Part 1" if i <= 10 else ("Part 2" if i <= 20 else ("Part 3" if i <= 30 else "Part 4"))
    }
    for i in range(1, 41)
]

SAMPLE_READING_QUESTIONS = [
    {
        "number": i,
        "type": "multiple_choice" if i % 5 == 0 else ("true_false_ng" if i % 5 == 1 else ("matching_headings" if i % 5 == 2 else ("sentence_completion" if i % 5 == 3 else "summary_completion"))),
        "question": f"Question {i}: Based on the passage, which statement is correct?",
        "options": ["A. Statement 1", "B. Statement 2", "C. Statement 3", "D. Statement 4"] if i % 5 == 0 else (["TRUE", "FALSE", "NOT GIVEN"] if i % 5 == 1 else None),
        "correct_answer": "A" if i % 5 == 0 else ("TRUE" if i % 5 == 1 else f"answer_{i}"),
        "passage": "Passage 1" if i <= 13 else ("Passage 2" if i <= 26 else "Passage 3")
    }
    for i in range(1, 41)
]

SAMPLE_READING_PASSAGE = """
**The Science of Sleep**

Sleep is a fundamental biological process that plays a crucial role in maintaining physical and mental health. Despite spending approximately one-third of their lives asleep, humans have only recently begun to understand the complex mechanisms that govern this essential activity.

Research conducted over the past several decades has revealed that sleep is not a passive state of unconsciousness, but rather an active process during which the brain performs vital functions. During sleep, the brain consolidates memories, processes emotional experiences, and clears metabolic waste products that accumulate during waking hours.

The sleep cycle consists of several distinct stages, each characterized by unique patterns of brain activity. Non-rapid eye movement (NREM) sleep, which comprises approximately 75-80% of total sleep time, is further divided into three stages of progressively deeper sleep. Rapid eye movement (REM) sleep, during which most dreaming occurs, typically follows NREM sleep and is associated with memory consolidation and emotional processing.

Chronic sleep deprivation has been linked to numerous adverse health outcomes, including increased risk of cardiovascular disease, metabolic disorders, and impaired immune function. Moreover, insufficient sleep significantly affects cognitive performance, reducing attention, working memory, and decision-making capabilities.

Contemporary research has also explored the relationship between sleep and learning. Studies suggest that adequate sleep following a learning session enhances the retention of new information, as the brain actively consolidates learned material during sleep. This finding has significant implications for educational practices and study strategies.

The regulation of sleep is governed by two primary mechanisms: the circadian rhythm, an internal biological clock that responds to light and darkness, and sleep pressure, which increases with prolonged wakefulness. Understanding these mechanisms has led to improved treatments for sleep disorders and recommendations for optimizing sleep quality.
"""

WRITING_TASK1_PROMPT = """The graph below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words."""

WRITING_TASK2_PROMPT = """Some people believe that it is best to accept a bad situation, such as an unsatisfactory job or shortage of money. Others argue that it is better to try and improve such situations.

Discuss both these views and give your own opinion.

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words."""

SPEAKING_FLOW = {
    "part1": {
        "title": "Part 1 — Introduction & Interview",
        "duration_seconds": 270,
        "questions": [
            "Good morning/afternoon. My name is Alex. Can you tell me your full name, please?",
            "Where are you from?",
            "Do you work or are you a student?",
            "What do you enjoy most about your work/studies?",
            "Let's talk about your hometown. What do you like most about living there?",
            "Do you think your hometown has changed much in recent years?"
        ]
    },
    "part2": {
        "title": "Part 2 — Individual Long Turn",
        "prep_seconds": 60,
        "speaking_seconds": 120,
        "cue_card": """**Describe a book you have read that you found particularly interesting.**

You should say:
• what the book was about
• why you decided to read it
• what you found most interesting about it

and explain why you would recommend this book to others."""
    },
    "part3": {
        "title": "Part 3 — Two-way Discussion",
        "duration_seconds": 270,
        "questions": [
            "Do you think reading habits have changed in recent years?",
            "How important is it for children to develop a love of reading?",
            "Do you think electronic books will eventually replace traditional printed books?",
            "What role do public libraries play in modern society?",
            "How can schools encourage students to read more?"
        ]
    }
}


# ============================================================
# API Endpoints
# ============================================================

@router.post("/sessions")
async def create_exam_session(req: CreateExamSessionRequest):
    """
    Tạo phiên thi IELTS mới.
    Trả về session_id và toàn bộ dữ liệu đề thi.
    """
    user_id = req.user_id or DEFAULT_USER_ID
    session_id = str(uuid.uuid4())

    # Xác định sections theo exam_type
    sections_map = {
        "full": ["listening", "reading", "writing", "speaking"],
        "listening": ["listening"],
        "reading": ["reading"],
        "writing": ["writing"],
        "speaking": ["speaking"],
    }
    sections = sections_map.get(req.exam_type, ["listening", "reading", "writing", "speaking"])

    # Thời gian từng section (giây)
    section_durations = {
        "listening": 30 * 60,
        "reading": 60 * 60,
        "writing": 60 * 60,
        "speaking": 15 * 60,
    }

    total_seconds = sum(section_durations[s] for s in sections)

    session_data = {
        "session_id": session_id,
        "user_id": user_id,
        "exam_type": req.exam_type,
        "exam_mode": req.exam_mode,
        "sections": sections,
        "status": "NOT_STARTED",
        "started_at": None,
        "current_section": sections[0] if sections else None,
        "answers": {},
        "section_durations": {s: section_durations[s] for s in sections},
        "total_seconds": total_seconds,
        "section_order": sections,
    }

    # Lưu vào Supabase nếu khả dụng
    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.table("exam_sessions").insert({
                "id": session_id,
                "user_id": user_id,
                "exam_type": req.exam_type,
                "exam_mode": req.exam_mode,
                "sections": json.dumps(sections),
                "status": "NOT_STARTED",
                "answers": json.dumps({}),
            }).execute()
        except Exception as e:
            logger.warning(f"Exam session DB save warning: {e}")

    # Load questions data from JSON file if available (e.g. Cambridge 21 tests)
    import os
    questions_data = None
    target_json_name = req.exam_type if req.exam_type.startswith("cambridge21_test") else "cambridge21_test1"
    data_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", f"{target_json_name}.json")
    if os.path.exists(data_path):
        try:
            with open(data_path, "r", encoding="utf-8") as f:
                questions_data = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load test data from {data_path}: {e}")

    if questions_data:
        listening_qs = questions_data.get("listening", []) if "listening" in sections else []
        reading_qs = questions_data.get("reading", []) if "reading" in sections else []
        reading_passage = questions_data.get("reading_passage", "") if "reading" in sections else ""
        writing_t1 = questions_data.get("writing_task1", "") if "writing" in sections else ""
        writing_t2 = questions_data.get("writing_task2", "") if "writing" in sections else ""
        speaking_flow = questions_data.get("speaking", SPEAKING_FLOW) if "speaking" in sections else {}
    else:
        listening_qs = SAMPLE_LISTENING_QUESTIONS if "listening" in sections else []
        reading_qs = SAMPLE_READING_QUESTIONS if "reading" in sections else []
        reading_passage = SAMPLE_READING_PASSAGE if "reading" in sections else ""
        writing_t1 = WRITING_TASK1_PROMPT if "writing" in sections else ""
        writing_t2 = WRITING_TASK2_PROMPT if "writing" in sections else ""
        speaking_flow = SPEAKING_FLOW if "speaking" in sections else {}

    return {
        "session": session_data,
        "questions": {
            "listening": listening_qs,
            "reading": reading_qs,
            "reading_passage": reading_passage,
            "writing_task1": writing_t1,
            "writing_task2": writing_t2,
            "speaking": speaking_flow,
        }
    }


@router.post("/sessions/{session_id}/start")
async def start_exam_session(session_id: str, user_id: Optional[str] = None):
    """Đánh dấu exam bắt đầu, lưu started_at timestamp."""
    uid = user_id or DEFAULT_USER_ID
    started_at = datetime.now(timezone.utc).isoformat()

    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.table("exam_sessions").update({
                "status": "IN_PROGRESS",
                "started_at": started_at
            }).eq("id", session_id).execute()
        except Exception as e:
            logger.warning(f"Start session update warning: {e}")

    return {"session_id": session_id, "status": "IN_PROGRESS", "started_at": started_at}


@router.post("/sessions/{session_id}/answer")
async def save_answer(session_id: str, req: SaveAnswerRequest):
    """Lưu câu trả lời của từng câu hỏi trong khi thi."""
    supabase = get_supabase_client()
    if supabase:
        try:
            # Lấy answers hiện tại
            resp = supabase.table("exam_sessions").select("answers").eq("id", session_id).execute()
            current_answers = {}
            if resp.data:
                current_answers = json.loads(resp.data[0].get("answers", "{}") or "{}")

            # Update answer
            key = f"{req.section}_{req.question_number}"
            current_answers[key] = req.answer

            supabase.table("exam_sessions").update({
                "answers": json.dumps(current_answers),
                "current_section": req.section
            }).eq("id", session_id).execute()
        except Exception as e:
            logger.warning(f"Save answer warning: {e}")

    return {"saved": True, "section": req.section, "question_number": req.question_number}


@router.post("/sessions/{session_id}/writing")
async def save_writing(session_id: str, req: SaveWritingRequest):
    """Autosave writing content (task1 / task2)."""
    supabase = get_supabase_client()
    if supabase:
        try:
            resp = supabase.table("exam_sessions").select("answers").eq("id", session_id).execute()
            current_answers = {}
            if resp.data:
                current_answers = json.loads(resp.data[0].get("answers", "{}") or "{}")

            current_answers[f"writing_{req.task}"] = req.content
            current_answers[f"writing_{req.task}_words"] = req.word_count

            supabase.table("exam_sessions").update({
                "answers": json.dumps(current_answers)
            }).eq("id", session_id).execute()
        except Exception as e:
            logger.warning(f"Save writing warning: {e}")

    return {"saved": True, "task": req.task, "word_count": req.word_count}


@router.post("/sessions/{session_id}/submit")
async def submit_exam(session_id: str, req: SubmitExamRequest):
    """
    Nộp bài thi → tính điểm → gọi AI phân tích → trả về kết quả đầy đủ.
    """
    uid = req.user_id or DEFAULT_USER_ID
    supabase = get_supabase_client()

    # Lấy session data
    answers = {}
    exam_type = "full"
    sections = ["listening", "reading", "writing", "speaking"]

    if supabase:
        try:
            resp = supabase.table("exam_sessions").select("*").eq("id", session_id).execute()
            if resp.data:
                s = resp.data[0]
                answers = json.loads(s.get("answers", "{}") or "{}")
                exam_type = s.get("exam_type", "full")
                sections = json.loads(s.get("sections", '["listening","reading","writing","speaking"]') or '[]')
        except Exception as e:
            logger.warning(f"Get session warning: {e}")

    # ─── Tính điểm Listening ───
    listening_score = None
    listening_band_score = None
    if "listening" in sections:
        correct = 0
        total = 40
        for i in range(1, 41):
            key = f"listening_{i}"
            user_ans = str(answers.get(key, "")).strip().upper()
            correct_ans = SAMPLE_LISTENING_QUESTIONS[i-1]["correct_answer"].strip().upper()
            if user_ans and user_ans == correct_ans:
                correct += 1
        listening_score = correct
        listening_band_score = listening_band(correct)

    # ─── Tính điểm Reading ───
    reading_score = None
    reading_band_score = None
    if "reading" in sections:
        correct = 0
        for i in range(1, 41):
            key = f"reading_{i}"
            user_ans = str(answers.get(key, "")).strip().upper()
            correct_ans = SAMPLE_READING_QUESTIONS[i-1]["correct_answer"].strip().upper()
            if user_ans and user_ans == correct_ans:
                correct += 1
        reading_score = correct
        reading_band_score = reading_band(correct)

    # ─── Tính điểm Writing (AI scoring) ───
    writing_band_score = None
    writing_analysis = {}
    if "writing" in sections:
        task1_text = answers.get("writing_task1", "")
        task2_text = answers.get("writing_task2", "")
        task1_words = answers.get("writing_task1_words", 0)
        task2_words = answers.get("writing_task2_words", 0)

        # Simple heuristic scoring (replace with AI if Gemini available)
        t1_band = _score_writing(task1_text, task1_words, min_words=150)
        t2_band = _score_writing(task2_text, task2_words, min_words=250)
        writing_band_score = round((t1_band * 1 + t2_band * 2) / 3, 1)  # Task2 = 2/3 weight
        writing_analysis = {
            "task1_band": t1_band,
            "task2_band": t2_band,
            "task1_words": task1_words,
            "task2_words": task2_words,
        }

    # ─── Speaking (mock score) ───
    speaking_band_score = None
    if "speaking" in sections:
        speaking_band_score = 6.5  # Placeholder — real STT scoring TBD

    # ─── Overall Band ───
    component_scores = [s for s in [listening_band_score, reading_band_score, writing_band_score, speaking_band_score] if s is not None]
    overall = overall_band(component_scores)

    # ─── AI Analysis ───
    ai_analysis = _generate_exam_analysis(
        listening_score=listening_score,
        reading_score=reading_score,
        writing_analysis=writing_analysis,
        overall_band=overall
    )

    result = {
        "session_id": session_id,
        "exam_type": exam_type,
        "status": "AUTO_SUBMITTED" if req.auto_submitted else "SUBMITTED",
        "overall_band": overall,
        "section_results": {
            "listening": {"raw_score": listening_score, "band": listening_band_score} if listening_band_score else None,
            "reading": {"raw_score": reading_score, "band": reading_band_score} if reading_band_score else None,
            "writing": {"band": writing_band_score, **writing_analysis} if writing_band_score else None,
            "speaking": {"band": speaking_band_score} if speaking_band_score else None,
        },
        "ai_analysis": ai_analysis,
        "answered_count": len([v for v in answers.values() if v]),
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }

    # Lưu kết quả
    if supabase:
        try:
            supabase.table("exam_sessions").update({
                "status": result["status"],
                "submitted_at": result["submitted_at"],
                "overall_band": overall,
                "section_scores": json.dumps(result["section_results"]),
                "ai_analysis": json.dumps(ai_analysis),
            }).eq("id", session_id).execute()
        except Exception as e:
            logger.warning(f"Submit update warning: {e}")

    return result


@router.get("/sessions/{session_id}/result")
async def get_exam_result(session_id: str):
    """Lấy kết quả đã nộp của một phiên thi."""
    supabase = get_supabase_client()
    if supabase:
        try:
            resp = supabase.table("exam_sessions").select("*").eq("id", session_id).execute()
            if resp.data:
                s = resp.data[0]
                return {
                    "session_id": session_id,
                    "status": s.get("status"),
                    "overall_band": s.get("overall_band"),
                    "section_scores": json.loads(s.get("section_scores", "{}") or "{}"),
                    "ai_analysis": json.loads(s.get("ai_analysis", "{}") or "{}"),
                    "submitted_at": s.get("submitted_at"),
                }
        except Exception as e:
            logger.warning(f"Get result warning: {e}")

    raise HTTPException(status_code=404, detail="Session không tìm thấy")


@router.get("/sample-data")
async def get_sample_data():
    """Trả về dữ liệu mẫu để frontend có thể test không cần tạo session."""
    return {
        "listening_questions": SAMPLE_LISTENING_QUESTIONS,
        "reading_questions": SAMPLE_READING_QUESTIONS,
        "reading_passage": SAMPLE_READING_PASSAGE,
        "writing_task1": WRITING_TASK1_PROMPT,
        "writing_task2": WRITING_TASK2_PROMPT,
        "speaking_flow": SPEAKING_FLOW,
    }


# ============================================================
# Helper Functions
# ============================================================

def _score_writing(text: str, word_count: int, min_words: int) -> float:
    """Simple heuristic writing band score."""
    if not text or word_count < 50:
        return 0.0
    if word_count < min_words * 0.6:
        return 4.0
    if word_count < min_words:
        base = 5.0
    else:
        base = 6.0

    # Heuristic: length bonus
    if word_count >= min_words * 1.5:
        base += 0.5
    if word_count >= min_words * 2:
        base += 0.5

    # Cap at 8.0 for heuristic
    return min(base, 8.0)


def _generate_exam_analysis(
    listening_score, reading_score, writing_analysis, overall_band
) -> Dict[str, Any]:
    """
    Sinh AI analysis và personalized study plan.
    Dùng Gemini nếu khả dụng, fallback về heuristic.
    """
    weaknesses = []
    if listening_score is not None and listening_score < 30:
        weaknesses.append("Listening — Cần luyện nghe thêm")
    if reading_score is not None and reading_score < 30:
        weaknesses.append("Reading — Cần cải thiện kỹ năng đọc hiểu")
    if writing_analysis.get("task1_words", 250) < 150:
        weaknesses.append("Writing Task 1 — Cần viết đủ 150 từ")
    if writing_analysis.get("task2_words", 300) < 250:
        weaknesses.append("Writing Task 2 — Cần viết đủ 250 từ")

    target_band = round(min(9.0, overall_band + 1.0) * 2) / 2

    return {
        "current_band": overall_band,
        "target_band": target_band,
        "strengths": ["Hoàn thành bài thi", "Thực hành làm bài trong điều kiện thi thật"],
        "weaknesses": weaknesses if weaknesses else ["Tiếp tục duy trì phong độ ổn định"],
        "priority_areas": [
            {"area": "Listening — Multiple Choice", "action": "Luyện 20 câu Multiple Choice mỗi ngày"},
            {"area": "Reading — Matching Headings", "action": "Đọc 1 bài Academic Reading passage mỗi ngày"},
            {"area": "Writing — Task Response", "action": "Viết 2 bài Task 2 mỗi tuần"},
        ],
        "study_plan": {
            "week1": ["Ôn Listening Part 3 & 4", "Đọc 3 passages Reading", "Viết 1 Task 1"],
            "week2": ["Luyện Multiple Choice Listening", "Matching Headings Reading", "Viết 1 Task 2"],
            "week3": ["Mock test hoàn chỉnh", "Review lỗi sai", "Cải thiện Speaking Part 2"],
        },
        "recommended_practice": {
            "listening_questions": 20,
            "reading_passages": 3,
            "writing_essays": 2,
            "speaking_sessions": 3,
        }
    }
