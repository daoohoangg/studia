import unittest
from datetime import datetime, timezone
from app.services.fsrs_engine import FSRSEngine
from app.services.graph_engine import GraphEngine

class TestCoreEngines(unittest.TestCase):

    def test_fsrs_engine_correct_response(self):
        """
        Kiểm tra FSRS Engine khi người dùng trả lời ĐÚNG với tự tin cao.
        """
        result = FSRSEngine.calculate_next_review(
            stability=1.0,
            difficulty_rating=5.0,
            mastery_score=50.0,
            is_correct=True,
            confidence_rating=4,
            response_time_ms=2000
        )
        
        self.assertGreater(result["mastery_score"], 50.0)
        self.assertGreater(result["stability"], 1.0)
        self.assertGreater(result["interval_days"], 0.1)
        self.assertIn("next_review_at", result)

    def test_fsrs_engine_incorrect_response(self):
        """
        Kiểm tra FSRS Engine khi người dùng trả lời SAI -> Giảm stability & mastery.
        """
        result = FSRSEngine.calculate_next_review(
            stability=2.0,
            difficulty_rating=5.0,
            mastery_score=50.0,
            is_correct=False,
            confidence_rating=1,
            response_time_ms=8000
        )
        
        self.assertLess(result["mastery_score"], 50.0)
        self.assertLess(result["stability"], 2.0)

    def test_graph_topological_sort(self):
        """
        Kiểm tra thứ tự học trước (Topological sort) của Knowledge Graph DAG.
        """
        topics = [
            {"id": "t1", "name": "Đại Số"},
            {"id": "t2", "name": "Attention"},
            {"id": "t3", "name": "Transformer"}
        ]
        relationships = [
            {"source_topic_id": "t1", "target_topic_id": "t2", "relationship_type": "prerequisite"},
            {"source_topic_id": "t2", "target_topic_id": "t3", "relationship_type": "prerequisite"}
        ]
        
        ordered = GraphEngine.build_topological_order(topics, relationships)
        ordered_ids = [t["id"] for t in ordered]
        
        self.assertEqual(ordered_ids, ["t1", "t2", "t3"])

    def test_prerequisite_check_unlocked(self):
        """
        Kiểm tra điều kiện mở khóa bài học khi đã đạt Mastery > 60%.
        """
        relationships = [
            {"source_topic_id": "t1", "target_topic_id": "t2", "relationship_type": "prerequisite"}
        ]
        user_states = {"t1": 75.0} # Mastery 75% > 60%
        
        check = GraphEngine.check_prerequisites("t2", relationships, user_states, mastery_threshold=60.0)
        self.assertTrue(check["is_unlocked"])
        self.assertEqual(len(check["missing_prerequisites"]), 0)

    def test_fsrs_difficulty_bounds_retention_and_utc(self):
        from app.services.fsrs_engine import FSRSEngine
        naive = datetime(2026, 10, 1, 12, 0, 0)
        wrong = FSRSEngine.calculate_next_review(
            stability=2.0, difficulty_rating=5.0, mastery_score=50.0,
            is_correct=False, confidence_rating=3, last_reviewed_at=naive,
        )
        self.assertGreater(wrong["difficulty_rating"], 5.0)
        self.assertTrue(wrong["next_review_at"].endswith("+00:00"))

        right = FSRSEngine.calculate_next_review(
            stability=10000.0, difficulty_rating=1.0, mastery_score=80.0,
            is_correct=True, confidence_rating=4, response_time_ms=1000,
        )
        self.assertEqual(right["retention_score"], 1.0)
        self.assertLessEqual(right["stability"], 3650.0)

    def test_learning_engine_multi_topic_and_adapt_plan_dates(self):
        from datetime import date, timedelta
        from app.services.learning_engine import LearningEngine
        from app.services.schedule import local_today

        topics = [{"id": f"t{i}", "name": f"Topic {i}", "difficulty_level": 1} for i in range(6)]
        plans = LearningEngine.generate_study_plan({"deadline_days": 10, "daily_minutes": 120}, topics, {})
        scheduled_ids = {task["topic_id"] for day in plans for task in day["tasks"] if task["type"] == "lesson"}
        self.assertEqual(scheduled_ids, {f"t{i}" for i in range(6)})

        today = local_today()
        current = [
            {"plan_date": today.isoformat(), "tasks": [{"topic_id": "t0"}]},
            {"plan_date": (today + timedelta(days=1)).isoformat(), "tasks": [{"topic_id": "t1"}]},
        ]
        adapted = LearningEngine.adapt_plan(
            "u1",
            [{"topic_id": "t0", "topic_name": "Topic 0", "score_pct": 30},
             {"topic_id": "t1", "topic_name": "Topic 1", "score_pct": 40}],
            current,
        )
        today_entries = [p for p in adapted if p["plan_date"] == today.isoformat()]
        self.assertEqual(len(today_entries), 1)
        self.assertEqual(today_entries[0]["tasks"], [{"topic_id": "t0"}])

    def test_ai_gating_validation_and_async_wrappers(self):
        import asyncio
        from unittest.mock import MagicMock, patch
        from app.config import settings
        from app.services import ai_engine
        from app.services.rag_engine import RAGEngine

        # feature=None works when key is set; explicit disabled feature is blocked
        fake_model = MagicMock()
        fake_model.generate_content.return_value = MagicMock(text='{"ok": true}')
        with patch.object(ai_engine, "_get_gemini_client", return_value=fake_model), \
                patch.object(settings, "AI_ENABLED_FEATURES", "tutor,lookup,writing,speaking"):
            self.assertEqual(ai_engine._call_gemini("hi", feature=None), {"ok": True})
            self.assertIsNone(ai_engine._call_gemini("hi", feature="lessons"))
            self.assertEqual(ai_engine._call_gemini("hi", feature="tutor"), {"ok": True})

        # _quick_translate_vi respects lookup gate
        with patch.object(settings, "AI_ENABLED_FEATURES", "tutor"):
            self.assertEqual(ai_engine._quick_translate_vi("hello"), "")

        # generate_vocabulary_card handles non-string meaning_vi safely
        with patch("app.services.ai_engine._call_gemini", return_value={"meaning_vi": ["bad"]}), \
                patch("app.services.ai_engine._quick_translate_vi", return_value="xin chào"):
            card = ai_engine.AIEngine.generate_vocabulary_card("hello", "", [])
            self.assertEqual(card["meaning_vi"], "xin chào")

        # Async wrapper works in event loop
        with patch("app.services.ai_engine._call_gemini", return_value={"answer": "ok", "confidence": 0.9}):
            res = asyncio.run(ai_engine.AIEngine.agenerate_ai_tutor_response("q?", []))
            self.assertEqual(res["answer"], "ok")

        # _pseudo_embedding is deterministic without mutating global random state
        v1 = RAGEngine._pseudo_embedding("sample text")
        v2 = RAGEngine._pseudo_embedding("sample text")
        self.assertEqual(v1, v2)

    def test_export_and_mailer_security(self):
        from unittest.mock import patch
        from app.config import settings
        from app.services.export_engine import ExportEngine
        from app.services import mailer

        csv_out = ExportEngine.export_flashcards_anki_csv([
            {"front": "=CMD|'/C calc'!A0", "back": "<script>alert(1)</script>\nLine2", "card_type": "+tag", "source_chunk": "@src"}
        ])
        self.assertIn("'=CMD", csv_out)
        self.assertIn("&lt;script&gt;", csv_out)
        self.assertIn("<br>Line2", csv_out)
        self.assertIn("'+tag", csv_out)
        self.assertIn("'@src", csv_out)

        ics_out = ExportEngine.export_schedule_ical(
            [{"plan_date": "2026-10-03", "tasks": [{"title": "Study\r\nBEGIN:VEVENT\r\nSUMMARY:Hacked"}]}],
            title="Plan\r\nX-EVIL:1",
        )
        self.assertEqual([line for line in ics_out.splitlines() if line == "BEGIN:VEVENT"], ["BEGIN:VEVENT"])
        self.assertNotIn("\r\nSUMMARY:Hacked", ics_out)
        self.assertNotIn("\r\nX-EVIL:1", ics_out)

        with patch.object(settings, "SMTP_HOST", "smtp.example.com"), \
                patch.object(settings, "SMTP_USER", "user"), \
                patch.object(settings, "SMTP_PASSWORD", "pass"), \
                patch.object(settings, "SMTP_SECURITY", "none"):
            ok, reason = mailer.send_email("a@example.com", "sub", "<p>hi</p>", "hi")
            self.assertFalse(ok)
            self.assertEqual(reason, "cleartext_auth_rejected")


if __name__ == "__main__":
    unittest.main()
