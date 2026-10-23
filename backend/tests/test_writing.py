"""Chấm Writing: tách câu, chuẩn hoá phản hồi AI, tính điểm tổng và endpoint /writing/grade."""
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import settings
from app.services import writing_grader as wg
from main import app

API = "/api/v1"
ESSAY = ("Some people believe that technology make life easier. Others disagree with this view! "
         "In my opinion, both sides have a point. Firstly, machines save time. However, they also create new problems "
         "for workers who lose their jobs.")


def ai_reply(bands=(6.5, 6.0, 6.0, 5.5), with_sentences=True):
    return {
        "criteria": {k: {"band": b, "comment_vi": f"nhận xét {k}", "strengths": ["tốt"], "improvements": ["cần sửa"]}
                     for k, b in zip(wg.CRITERIA, bands)},
        "summary_vi": "Tổng kết", "priorities_vi": ["a", "b"],
        "sentences": [{"index": 0, "corrected": "Some people believe that technology makes life easier.",
                       "issues": [{"type": "grammar", "text": "technology make", "suggestion": "technology makes",
                                   "explanation_vi": "Chủ ngữ số ít"}]}] if with_sentences else [],
    }


class SplitAndBand(unittest.TestCase):
    def test_split_sentences(self):
        s = wg.split_sentences(ESSAY)
        self.assertEqual(len(s), 5)
        self.assertTrue(s[1].endswith("view!"))

    def test_round_band_like_ielts(self):
        self.assertEqual(wg.round_band(6.25), 6.5)
        self.assertEqual(wg.round_band(6.125), 6.0)
        self.assertEqual(wg.round_band(6.75), 7.0)
        self.assertEqual(wg.round_band(11), 9.0)

    def test_normalise_aligns_sentences_and_computes_overall(self):
        sents = wg.split_sentences(ESSAY)
        r = wg.normalise(ai_reply(), sents, "task2", wg.count_words(ESSAY))
        self.assertEqual(r["overall"], 6.0)           # (6.5+6+6+5.5)/4 = 6.0
        self.assertEqual(len(r["sentences"]), len(sents))
        self.assertTrue(r["sentences"][0]["changed"])
        self.assertFalse(r["sentences"][1]["changed"])  # AI không trả mục này -> giữ nguyên câu gốc
        self.assertEqual(r["sentences"][1]["corrected"], sents[1])
        self.assertTrue(r["under_length"])
        self.assertEqual(r["criteria"]["task"]["name"], "Task Response")

    def test_highlight_text_must_exist_in_sentence(self):
        sents = wg.split_sentences(ESSAY)
        raw = ai_reply()
        raw["sentences"][0]["issues"][0]["text"] = "not in the sentence"
        r = wg.normalise(raw, sents, "task2", 40)
        self.assertEqual(r["sentences"][0]["issues"][0]["text"], "")

    def test_bad_ai_shape_is_rejected(self):
        self.assertIsNone(wg.normalise({"criteria": {"task": {"band": 6}}}, ["x"], "task1", 10))
        self.assertIsNone(wg.normalise({}, ["x"], "task1", 10))


class WritingApi(unittest.TestCase):
    def setUp(self):
        p = patch.object(settings, "AUTH_REQUIRED", False)
        p.start()
        self.addCleanup(p.stop)
        self.client = TestClient(app)

    def post(self, **kw):
        body = {"task": "task2", "prompt": "Technology makes life easier. Discuss.", "essay": ESSAY}
        body.update(kw)
        return self.client.post(f"{API}/writing/grade", json=body)

    def test_grade_ok(self):
        with patch("app.services.writing_grader._call_gemini", return_value=ai_reply()):
            r = self.post()
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["overall"], 6.0)
        self.assertEqual(len(r.json()["criteria"]), 4)

    def test_validation(self):
        self.assertEqual(self.post(task="task9").status_code, 422)
        self.assertEqual(self.post(essay="Too short.").status_code, 422)
        self.assertEqual(self.post(essay="word " * 800).status_code, 422)

    def test_ai_unavailable_returns_503(self):
        with patch("app.services.writing_grader._call_gemini", return_value=None):
            self.assertEqual(self.post().status_code, 503)


class IeltsRounding(unittest.TestCase):
    """Làm tròn IELTS (không dùng round() chẵn của Python): 6.25 -> 6.5, 5.25 -> 5.5."""

    def test_round_ielts_boundaries(self):
        from app.services.exam_grading import round_ielts
        for value, expected in [(6.25, 6.5), (6.24, 6.0), (6.75, 7.0), (6.74, 6.5), (5.25, 5.5),
                                (8.9, 9.0), (6.0, 6.0), (0.0, 0.0)]:
            self.assertEqual(round_ielts(value), expected, value)

    def test_grade_writing_uses_ielts_rounding(self):
        from app.services import exam_grading as g

        class FakeLLM:
            def __init__(self, bands): self.bands = bands
            def generate_json(self, prompt): return dict(zip(g.CRITERIA, self.bands))

        text = " ".join(["word"] * 300)
        r = g.grade_writing(2, "p", text, 250, FakeLLM([6.25, 6.25, 5.25, 5.25]))
        self.assertEqual(r["criteria"]["task_response"], 6.5)
        self.assertEqual(r["criteria"]["lexical_resource"], 5.5)
        self.assertEqual(r["band"], 6.0)  # (6.5+6.5+5.5+5.5)/4 = 6.0
        r = g.grade_writing(2, "p", text, 250, FakeLLM([6, 6, 6, 7.5]))
        self.assertEqual(r["band"], 6.5)  # 6.375 -> 6.5
        r = g.grade_writing(2, "p", text, 250, FakeLLM([-3, 12, 9, 9]))
        self.assertEqual(r["criteria"]["task_response"], 0.0)
        self.assertEqual(r["criteria"]["coherence_cohesion"], 9.0)

    def test_combine_writing_rounds_ielts(self):
        from app.services.exam_grading import combine_writing
        # (5.5 + 2*6.5)/3 = 6.1667 -> 6.0 ; (6 + 2*6.5)/3 = 6.333 -> 6.5 ; (5.5+2*5.5)=5.5
        self.assertEqual(combine_writing({"band": 5.5, "scored_by": "ai"}, {"band": 6.5, "scored_by": "ai"}), 6.0)
        self.assertEqual(combine_writing({"band": 6.0, "scored_by": "ai"}, {"band": 6.5, "scored_by": "ai"}), 6.5)
        self.assertEqual(combine_writing({"band": 7.0, "scored_by": "ai"}, {"band": 7.5, "scored_by": "ai"}), 7.5)

    def test_writing_grader_band_clamp_and_round(self):
        self.assertEqual(wg._band(6.25), 6.5)
        self.assertEqual(wg._band(-1), 0.0)
        self.assertEqual(wg._band("x"), 0.0)


if __name__ == "__main__":
    unittest.main()
