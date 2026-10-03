"""
Scenario & TBLT Engine — Studia v2
Triển khai Task-Based Language Teaching (TBLT) & AI Roleplay
Tự động sinh các Nhiệm vụ Tình huống Thực tế dựa trên RAG context và điều hành tương tác vai (Roleplay Chat).
"""
from typing import Dict, List, Any, Optional
import json
import logging
import uuid
from datetime import datetime, timezone
from app.services.ai_engine import _call_gemini, _get_gemini_client

logger = logging.getLogger(__name__)


class ScenarioEngine:
    """
    Scenario Engine điều phối các tình huống học tập giao tiếp & ứng dụng thực tế (TBLT):
    - generate_scenarios: Sinh 3 kịch bản tình huống thực tế từ tài liệu
    - interact_scenario_step: Tương tác nhập vai với AI Tutor & chấm điểm từng lượt hội thoại
    """

    @staticmethod
    def generate_scenarios(
        document_title: str,
        topic_name: str,
        rag_context: List[str],
        count: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Sinh các kịch bản tình huống thực tế (Task-Based Scenarios) từ RAG context.
        Ví dụ: Phỏng vấn công việc, Đàm phán đối tác, Giải thích giải pháp kỹ thuật với khách hàng.
        """
        context_str = "\n\n---\n\n".join(rag_context) if rag_context else ""

        prompt = f"""You are an expert educator creating Task-Based Language Teaching (TBLT) real-world scenarios.

Document Title: "{document_title}"
Topic: "{topic_name}"
Number of scenarios: {count}

Reference material from the textbook:
{context_str[:3000]}

Generate realistic roleplay scenarios where the learner must apply the textbook concepts to solve a practical problem.
Return ONLY valid JSON:
{{
  "scenarios": [
    {{
      "id": "scenario-uuid",
      "title": "Scenario Title in Vietnamese (e.g. Phỏng vấn vị trí Chuyên viên AI)",
      "role": "Role of the AI (e.g. Trưởng phòng Kỹ thuật / Khách hàng)",
      "user_role": "Role of the Learner (e.g. Ứng viên / Chuyên viên tư vấn)",
      "context_description": "Detailed background story and mission in Vietnamese (2-3 sentences)",
      "learning_goals": ["Goal 1", "Goal 2"],
      "initial_ai_message": "Opening greeting and first question from the AI role in Vietnamese",
      "target_keywords": ["keyword1", "keyword2"]
    }}
  ]
}}

Requirements:
- All text in Vietnamese (tiếng Việt)
- Scenarios must directly utilize concepts from the reference material
- initial_ai_message must be natural, realistic, and prompt the learner to respond using textbook concepts"""

        result = _call_gemini(prompt, expect_json=True)

        if result and "scenarios" in result and len(result["scenarios"]) > 0:
            for s in result["scenarios"]:
                if not s.get("id"):
                    s["id"] = str(uuid.uuid4())
            return result["scenarios"]

        # Fallback heuristic scenario
        return [
            {
                "id": str(uuid.uuid4()),
                "title": f"Tình huống Thực tế: Thuyết trình về {topic_name}",
                "role": "Giám đốc Kỹ thuật",
                "user_role": "Chuyên gia Giải pháp",
                "context_description": f"Bạn đang tham gia buổi bảo vệ giải pháp kỹ thuật. Hãy giải thích khái niệm {topic_name} và tính ứng dụng của nó cho Giám đốc Kỹ thuật.",
                "learning_goals": [
                    f"Hiểu và trình bày rõ bản chất của {topic_name}",
                    "Sử dụng thuật ngữ chuyên môn chính xác"
                ],
                "initial_ai_message": f"Chào bạn! Hãy trình bày tóm tắt cho tôi về {topic_name} và lý do tại sao hệ thống của chúng ta nên áp dụng nó?",
                "target_keywords": [topic_name.lower(), "ứng dụng", "nguyên lý"]
            }
        ]

    @staticmethod
    def interact_scenario_step(
        scenario_title: str,
        ai_role: str,
        user_role: str,
        user_message: str,
        chat_history: List[Dict[str, str]],
        rag_context: List[str]
    ) -> Dict[str, Any]:
        """
        Xử lý lượt nhập vai của người dùng:
        1. AI đánh giá câu trả lời (độ chính xác thuật ngữ, tính thuyết phục 1-10)
        2. AI sinh phản hồi nối tiếp trong vai nhân vật (AI Role)
        """
        context_str = "\n\n---\n\n".join(rag_context) if rag_context else ""

        history_str = ""
        for msg in chat_history[-6:]:
            r = "User" if msg.get("role") == "user" else ai_role
            history_str += f"{r}: {msg.get('content', '')}\n"

        prompt = f"""You are participating in a Task-Based Language Teaching (TBLT) Roleplay scenario.

Scenario: "{scenario_title}"
Your Character Role: "{ai_role}"
Learner's Role: "{user_role}"

Reference material:
{context_str[:2500]}

Conversation History:
{history_str}

Learner's latest response: "{user_message}"

Task:
1. Evaluate the learner's response on accuracy of textbook concepts (1-10) and practical communication effectiveness.
2. Formulate your in-character response to advance the conversation.

Return ONLY valid JSON:
{{
  "ai_response": "Your next response in character ({ai_role}) in Vietnamese",
  "score": 8.5,
  "feedback": "Short constructive feedback on their answer in Vietnamese",
  "concepts_used": ["concept A", "concept B"],
  "is_goal_achieved": false,
  "next_suggestion": "Suggested direction for their next answer"
}}

Requirements:
- Stay in character as {ai_role}
- Provide helpful feedback on whether they correctly applied concepts from reference material
- Set is_goal_achieved to true if they completed the mission satisfactorily"""

        result = _call_gemini(prompt, expect_json=True)

        if result and "ai_response" in result:
            return result

        # Fallback
        return {
            "ai_response": f"Tôi đã lắng nghe ý kiến của bạn. Về điểm '{user_message[:50]}...', bạn có thể phân tích sâu hơn dựa trên tài liệu được không?",
            "score": 7.0,
            "feedback": "Câu trả lời khá tốt nhưng cần sử dụng thêm các thuật ngữ chuyên môn từ bài học.",
            "concepts_used": [],
            "is_goal_achieved": False,
            "next_suggestion": "Hãy bổ sung thêm ví dụ cụ thể để tăng tính thuyết phục."
        }
