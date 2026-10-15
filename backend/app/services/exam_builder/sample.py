"""Đề mẫu có sẵn (để thử phòng thi khi chưa có sách đề): nội dung + đáp án theo ExamSet v1."""
from typing import Any, Dict, Tuple

from app.services.exam_builder.schema import empty_content

SAMPLE_PASSAGE = """**The Science of Sleep**

Sleep is a fundamental biological process that plays a crucial role in maintaining physical and mental health. Despite spending approximately one-third of their lives asleep, humans have only recently begun to understand the complex mechanisms that govern this essential activity.

Research conducted over the past several decades has revealed that sleep is not a passive state of unconsciousness, but rather an active process during which the brain performs vital functions. During sleep, the brain consolidates memories, processes emotional experiences, and clears metabolic waste products that accumulate during waking hours.

The sleep cycle consists of several distinct stages, each characterized by unique patterns of brain activity. Non-rapid eye movement (NREM) sleep, which comprises approximately 75-80% of total sleep time, is further divided into three stages of progressively deeper sleep. Rapid eye movement (REM) sleep, during which most dreaming occurs, typically follows NREM sleep and is associated with memory consolidation and emotional processing.

Chronic sleep deprivation has been linked to numerous adverse health outcomes, including increased risk of cardiovascular disease, metabolic disorders, and impaired immune function. Moreover, insufficient sleep significantly affects cognitive performance, reducing attention, working memory, and decision-making capabilities.

Contemporary research has also explored the relationship between sleep and learning. Studies suggest that adequate sleep following a learning session enhances the retention of new information, as the brain actively consolidates learned material during sleep. This finding has significant implications for educational practices and study strategies.

The regulation of sleep is governed by two primary mechanisms: the circadian rhythm, an internal biological clock that responds to light and darkness, and sleep pressure, which increases with prolonged wakefulness."""

WRITING_TASK1 = """The table below shows the percentage of first-year students at one university who regularly used three study resources in 2015 and 2025.

| Study resource     | 2015 | 2025 |
|--------------------|------|------|
| Printed textbooks  | 82%  | 41%  |
| Online videos      | 35%  | 78%  |
| Mobile study apps  | 12%  | 64%  |

Summarise the information by selecting and reporting the main features, and make comparisons where relevant."""

WRITING_TASK2 = """Some people think that learners make faster progress when they study alone with digital tools. Others believe that a teacher and classmates are essential for learning well.

Discuss both these views and give your own opinion.

Give reasons for your answer and include any relevant examples from your own knowledge or experience."""

SPEAKING = {
    "part1": {"questions": [
        "Can you tell me your full name, please?", "Where are you from?", "Do you work or are you a student?",
        "What do you enjoy most about your work or studies?",
        "What do you like most about living in your hometown?"]},
    "part2": {"topic": "Describe a book you have read that you found particularly interesting.",
              "points": ["what the book was about", "why you decided to read it",
                         "what you found most interesting about it"],
              "closing": "and explain why you would recommend this book to others.",
              "cue_card": "**Describe a book you have read that you found particularly interesting.**\n\n"
                          "You should say:\n• what the book was about\n• why you decided to read it\n"
                          "• what you found most interesting about it\n\n"
                          "and explain why you would recommend this book to others."},
    "part3": {"questions": [
        "Do you think reading habits have changed in recent years?",
        "How important is it for children to develop a love of reading?",
        "Do you think electronic books will eventually replace printed books?",
        "What role do public libraries play in modern society?"]},
}


def _listening_groups() -> Tuple[list, Dict[str, Any]]:
    parts, key = [], {}
    kinds = ["note_completion", "form_completion", "sentence_completion", "multiple_choice"]
    for part in range(1, 5):
        numbers = range((part - 1) * 10 + 1, part * 10 + 1)
        groups = []
        for kind in kinds[:1] if part % 2 else kinds[3:]:
            questions = []
            for n in numbers:
                if kind == "multiple_choice":
                    questions.append({"number": n, "question": f"According to the speaker, what is point {n} about?",
                                      "options": [{"key": k, "text": t} for k, t in
                                                  zip("ABCD", ("To inform", "To persuade", "To entertain", "To warn"))]})
                    key[str(n)] = {"raw": "A", "accept": ["A"]}
                else:
                    questions.append({"number": n, "question": f"Complete the note {n}: The appointment is on ___",
                                      "options": None})
                    key[str(n)] = {"raw": f"answer {n}", "accept": [f"answer {n}"]}
            groups.append({
                "instruction": ("Choose the correct letter, A, B, C or D." if kind == "multiple_choice"
                                else "Complete the notes below. Write ONE WORD ONLY for each answer."),
                "type": kind, "word_limit": None if kind == "multiple_choice" else 1, "allow_number": False,
                "context_title": None, "options_title": None, "shared_options": None, "image_url": None,
                "range": [numbers[0], numbers[-1]], "questions": questions, "source": "sample",
            })
        parts.append({"part": part, "groups": groups})
    return parts, key


def _reading_groups() -> Tuple[list, Dict[str, Any]]:
    passages, key = [], {}
    ranges = [(1, 13), (14, 26), (27, 40)]
    for index, (first, last) in enumerate(ranges, start=1):
        questions_tf, questions_fill = [], []
        for n in range(first, last + 1):
            if n % 2:
                questions_tf.append({"number": n, "question": f"Statement {n}: Sleep is a passive state of unconsciousness.",
                                     "options": None})
                key[str(n)] = {"raw": "FALSE", "accept": ["FALSE"]}
            else:
                questions_fill.append({"number": n, "question": f"Complete the sentence {n}: Sleep helps the brain ___",
                                       "options": None})
                key[str(n)] = {"raw": "consolidate", "accept": ["consolidate", "consolidate memories"]}
        groups = []
        if questions_tf:
            groups.append({"instruction": "Do the following statements agree with the information given in the passage? "
                                          "Write TRUE, FALSE or NOT GIVEN.",
                           "type": "true_false_ng", "word_limit": None, "allow_number": False, "context_title": None,
                           "options_title": None, "shared_options": None, "image_url": None,
                           "range": [questions_tf[0]["number"], questions_tf[-1]["number"]],
                           "questions": questions_tf, "source": "sample"})
        if questions_fill:
            groups.append({"instruction": "Complete the sentences below. Write ONE WORD ONLY.",
                           "type": "sentence_completion", "word_limit": 1, "allow_number": False, "context_title": None,
                           "options_title": None, "shared_options": None, "image_url": None,
                           "range": [questions_fill[0]["number"], questions_fill[-1]["number"]],
                           "questions": questions_fill, "source": "sample"})
        passages.append({"index": index, "title": "The Science of Sleep" if index == 1 else f"Passage {index}",
                         "body_markdown": SAMPLE_PASSAGE, "source_block_ids": [], "groups": groups})
    return passages, key


def sample_exam() -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """(content, answer_key) của đề mẫu: 40 câu Listening + 40 câu Reading + Writing + Speaking."""
    content = empty_content("Đề mẫu IELTS (luyện thử phòng thi)")
    parts, listening_key = _listening_groups()
    passages, reading_key = _reading_groups()
    content["sections"] = {
        "listening": {"audio_url": None, "parts": parts},
        "reading": {"passages": passages},
        "writing": {"task1": {"prompt": WRITING_TASK1, "min_words": 150, "image_url": None},
                    "task2": {"prompt": WRITING_TASK2, "min_words": 250, "image_url": None}},
        "speaking": SPEAKING,
    }
    return content, {"listening": listening_key, "reading": reading_key}
