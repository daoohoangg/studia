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

if __name__ == "__main__":
    unittest.main()
