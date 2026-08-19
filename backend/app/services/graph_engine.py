from typing import List, Dict, Any, Set
from collections import defaultdict, deque

class GraphEngine:
    """
    Knowledge Graph Engine xử lý các quan hệ phụ thuộc (Prerequisite DAG) giữa các Topic.
    Giúp tạo Lộ trình học tập (Learning Path) cá nhân hóa chuẩn xác.
    """

    @staticmethod
    def build_topological_order(topics: List[Dict[str, Any]], relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sắp xếp các chủ đề theo thứ tự học tiền đề (Topological Sort).
        """
        topic_map = {t["id"]: t for t in topics}
        in_degree = defaultdict(int)
        adj_list = defaultdict(list)

        # Xây dựng đồ thị hướng
        for rel in relationships:
            if rel.get("relationship_type") == "prerequisite":
                src = rel["source_topic_id"] # Tiền đề
                tgt = rel["target_topic_id"] # Chủ đề phụ thuộc
                if src in topic_map and tgt in topic_map:
                    adj_list[src].append(tgt)
                    in_degree[tgt] += 1

        # Queue chứa các node không có tiền đề
        queue = deque([t_id for t_id in topic_map if in_degree[t_id] == 0])
        ordered_topics = []

        while queue:
            curr_id = queue.popleft()
            if curr_id in topic_map:
                ordered_topics.append(topic_map[curr_id])

            for neighbor in adj_list[curr_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # Nếu có chu trình hoặc node chưa duyệt hết, thêm nốt các node còn lại
        visited_ids = {t["id"] for t in ordered_topics}
        for t_id, topic in topic_map.items():
            if t_id not in visited_ids:
                ordered_topics.append(topic)

        return ordered_topics

    @staticmethod
    def check_prerequisites(
        target_topic_id: str,
        relationships: List[Dict[str, Any]],
        knowledge_states: Dict[str, float], # topic_id -> mastery_score
        mastery_threshold: float = 60.0
    ) -> Dict[str, Any]:
        """
        Kiểm tra xem người dùng đã đạt đủ Mastery ở các chủ đề tiền đề hay chưa.
        """
        prereqs = []
        missing_prereqs = []

        for rel in relationships:
            if rel.get("target_topic_id") == target_topic_id and rel.get("relationship_type") == "prerequisite":
                src_id = rel["source_topic_id"]
                prereqs.append(src_id)
                user_mastery = knowledge_states.get(src_id, 0.0)
                if user_mastery < mastery_threshold:
                    missing_prereqs.append({
                        "topic_id": src_id,
                        "current_mastery": user_mastery,
                        "required_mastery": mastery_threshold
                    })

        is_unlocked = len(missing_prereqs) == 0

        return {
            "target_topic_id": target_topic_id,
            "is_unlocked": is_unlocked,
            "total_prerequisites": len(prereqs),
            "missing_prerequisites": missing_prereqs
        }
