"""
AI Engine — Studia v2
Tích hợp thực sự với Gemini API (google-generativeai) để:
  - Trích xuất Topics và Knowledge Graph từ tài liệu
  - Sinh bài học (Lesson) cá nhân hóa theo RAG context
  - Tạo câu hỏi Quiz thích ứng (Adaptive Quiz)
  - Sinh Flashcards từ content
  - AI Tutor: trả lời câu hỏi từ nội dung sách
"""
from typing import List, Dict, Any, Optional
import json
import re
import logging

logger = logging.getLogger(__name__)

def _get_gemini_client():
    """Lazy-load Gemini client để tránh lỗi khi không có key."""
    try:
        import google.generativeai as genai
        from app.config import settings
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
            return None
        genai.configure(api_key=settings.GEMINI_API_KEY)
        return genai.GenerativeModel(settings.GEMINI_PRO_MODEL)
    except Exception as e:
        logger.warning(f"Gemini client init failed: {e}")
        return None


def _call_gemini(prompt: str, expect_json: bool = True) -> Any:
    """
    Gọi Gemini API với prompt, trả về JSON object hoặc text.
    Fallback về None nếu không có key hoặc lỗi.
    """
    model = _get_gemini_client()
    if not model:
        return None

    try:
        from google.generativeai.types import GenerationConfig
        config = GenerationConfig(
            temperature=0.3,
            response_mime_type="application/json" if expect_json else "text/plain",
        )
        response = model.generate_content(prompt, generation_config=config)
        text = response.text.strip()

        if expect_json:
            # Clean markdown code fences nếu có
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
            return json.loads(text)
        return text
    except Exception as e:
        logger.error(f"Gemini call failed: {e}")
        return None


class AIEngine:
    """
    AI Engine điều phối tất cả tác vụ AI của Studia:
    - extract_topics_and_graph: Phân tích tài liệu → Topics + Knowledge Graph
    - generate_lesson: Sinh bài học cá nhân hóa
    - generate_adaptive_quiz: Sinh câu hỏi trắc nghiệm adaptive
    - generate_flashcards: Sinh flashcard front/back
    - generate_ai_tutor_response: AI Tutor trả lời từ RAG context
    """

    @staticmethod
    def extract_topics_and_graph(content: str, title: str) -> Dict[str, Any]:
        """
        Phân tích tài liệu đầu vào → trích xuất Topics (nodes) và Relationships (edges).
        Nếu Gemini khả dụng → gọi LLM thực.
        Fallback → heuristic-based extraction.
        """
        # Giới hạn content để tránh token overflow
        content_preview = content[:4000]

        prompt = f"""You are an expert educator analyzing a learning document.
Document Title: "{title}"

Document Content (preview):
{content_preview}

Extract the main TOPICS and their relationships for a Knowledge Graph.

Return ONLY valid JSON (no markdown, no extra text):
{{
  "topics": [
    {{
      "name": "Topic Name",
      "slug": "topic-slug-lowercase-hyphen",
      "description": "Clear description in Vietnamese (1-2 sentences)",
      "difficulty_level": 1
    }}
  ],
  "relationships": [
    {{
      "source_index": 0,
      "target_index": 1,
      "relationship_type": "prerequisite",
      "weight": 1.0
    }}
  ]
}}

Rules:
- Extract 4-8 main topics that cover the document's core content
- difficulty_level: 1=Basic, 2=Beginner, 3=Intermediate, 4=Advanced, 5=Expert
- relationship_type: "prerequisite" (must learn first) | "related" | "contains"
- slug: lowercase, hyphens only, no Vietnamese diacritics
- descriptions MUST be in Vietnamese
- source_index is the prerequisite of target_index"""

        result = _call_gemini(prompt, expect_json=True)

        if result and "topics" in result and len(result["topics"]) > 0:
            return result

        # --- Fallback: heuristic extraction ---
        logger.info("Using heuristic topic extraction (no LLM)")
        return AIEngine._heuristic_extract_topics(content, title)

    @staticmethod
    def _heuristic_extract_topics(content: str, title: str) -> Dict[str, Any]:
        """Fallback: trích xuất topic đơn giản từ headings và keywords."""
        import re
        # Tìm headings markdown
        headings = re.findall(r'^#{1,3}\s+(.+)$', content, re.MULTILINE)
        # Tìm từ khóa viết hoa
        keywords = list(set(re.findall(r'\b[A-Z][a-zA-Z]{3,}\b', content)))[:8]

        candidates = headings[:6] if headings else keywords[:6]
        if not candidates:
            candidates = ["Khái niệm cơ bản", "Nguyên lý hoạt động", "Ứng dụng thực tế"]

        topics = []
        for idx, name in enumerate(candidates[:6]):
            slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
            topics.append({
                "name": name.strip(),
                "slug": slug or f"topic-{idx+1}",
                "description": f"Chủ đề học tập về {name} được trích xuất từ tài liệu '{title}'.",
                "difficulty_level": min(5, (idx // 2) + 1)
            })

        relationships = []
        for i in range(len(topics) - 1):
            relationships.append({
                "source_index": i,
                "target_index": i + 1,
                "relationship_type": "prerequisite",
                "weight": 1.0
            })

        return {"topics": topics, "relationships": relationships}

    @staticmethod
    def generate_lesson(
        topic_name: str,
        user_mastery: float,
        rag_context: List[str],
        language: str = "vi"
    ) -> Dict[str, Any]:
        """
        Sinh nội dung bài học cá nhân hóa dựa trên:
        - Điểm Mastery hiện tại (điều chỉnh độ sâu)
        - RAG context (nội dung từ sách thực tế)
        """
        depth_label = (
            "cơ bản, dễ hiểu với nhiều ví dụ minh họa" if user_mastery < 40
            else ("trung cấp, kết hợp lý thuyết và thực hành" if user_mastery < 70
                  else "nâng cao, chuyên sâu với phân tích kỹ thuật")
        )

        context_str = "\n\n---\n\n".join(rag_context) if rag_context else ""

        prompt = f"""You are an expert Vietnamese educator creating a personalized lesson.

Topic: "{topic_name}"
Student's current mastery level: {user_mastery:.0f}% (0=beginner, 100=expert)
Required depth: {depth_label}

Reference content from the textbook:
{context_str[:3000]}

Create a comprehensive lesson in MARKDOWN format. Return ONLY valid JSON:
{{
  "title": "Lesson title in Vietnamese",
  "content_markdown": "Full lesson in Markdown (Vietnamese), using ## headings, bullet points, **bold**, code blocks if relevant. Min 400 words.",
  "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"]
}}

Requirements:
- Language: Vietnamese (tiếng Việt)
- Base the lesson on the reference content provided
- Adapt complexity to the student's mastery level
- Include: introduction, core concepts, examples, summary
- key_takeaways: 3-5 bullet points, concise"""

        result = _call_gemini(prompt, expect_json=True)

        if result and "content_markdown" in result:
            return result

        # Fallback
        return AIEngine._fallback_lesson(topic_name, user_mastery, context_str)

    @staticmethod
    def _fallback_lesson(topic_name: str, user_mastery: float, context_str: str) -> Dict[str, Any]:
        depth = "Cơ bản" if user_mastery < 40 else ("Trung cấp" if user_mastery < 70 else "Nâng cao")
        return {
            "title": f"Bài học: {topic_name}",
            "content_markdown": f"""# {topic_name}

> **Mức độ**: {depth} | **Mastery hiện tại**: {user_mastery:.0f}%

## Giới Thiệu
{topic_name} là một chủ đề quan trọng trong tài liệu bạn đang học.

## Nội Dung Chính

{context_str[:500] if context_str else "Hãy đọc kỹ tài liệu để nắm nội dung chính."}

## Tóm Tắt
- Hiểu rõ định nghĩa và bản chất của {topic_name}
- Nắm vững các ứng dụng thực tế
- Chuẩn bị cho Quiz đánh giá năng lực
""",
            "key_takeaways": [
                f"Hiểu khái niệm cốt lõi của {topic_name}",
                "Kết nối kiến thức với chủ đề liên quan",
                "Thực hành qua Quiz và Flashcard"
            ]
        }

    @staticmethod
    def generate_adaptive_quiz(
        topic_name: str,
        user_mastery: float,
        rag_context: List[str],
        question_count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Sinh câu hỏi trắc nghiệm thích ứng từ RAG context.
        Độ khó được điều chỉnh theo mastery của người dùng.
        """
        difficulty_label = (
            "easy (basic definitions and facts)" if user_mastery < 40
            else ("medium (application and understanding)" if user_mastery < 70
                  else "hard (analysis, synthesis, and evaluation)")
        )

        context_str = "\n\n---\n\n".join(rag_context) if rag_context else ""

        prompt = f"""You are an expert educator creating quiz questions.

Topic: "{topic_name}"
Student mastery: {user_mastery:.0f}% → Generate {difficulty_label} questions
Number of questions: {question_count}

Reference content from the textbook:
{context_str[:3000]}

Generate questions STRICTLY based on the provided content. Return ONLY valid JSON:
{{
  "questions": [
    {{
      "question_text": "Question text in Vietnamese",
      "question_type": "multiple_choice",
      "options": [
        {{"id": "A", "text": "Option A"}},
        {{"id": "B", "text": "Option B"}},
        {{"id": "C", "text": "Option C"}},
        {{"id": "D", "text": "Option D"}}
      ],
      "correct_answer": "A",
      "explanation": "Explanation why A is correct (Vietnamese)",
      "difficulty": 2
    }}
  ]
}}

Requirements:
- All text in Vietnamese
- Questions must be directly derived from the reference content
- correct_answer must be one of: A, B, C, D
- difficulty: 1-5 scale
- Do NOT create questions about topics not in the reference content"""

        result = _call_gemini(prompt, expect_json=True)

        if result and "questions" in result and len(result["questions"]) > 0:
            return result["questions"]

        # Fallback
        return AIEngine._fallback_quiz(topic_name, user_mastery, question_count)

    @staticmethod
    def _fallback_quiz(topic_name: str, user_mastery: float, count: int) -> List[Dict]:
        difficulty = 1 if user_mastery < 40 else (3 if user_mastery < 70 else 5)
        return [
            {
                "question_text": f"Khái niệm nào mô tả đúng nhất về {topic_name}?",
                "question_type": "multiple_choice",
                "options": [
                    {"id": "A", "text": f"Là nguyên lý cốt lõi của {topic_name}"},
                    {"id": "B", "text": "Là một khái niệm không liên quan"},
                    {"id": "C", "text": "Chỉ áp dụng trong lý thuyết"},
                    {"id": "D", "text": "Không có ứng dụng thực tế"}
                ],
                "correct_answer": "A",
                "explanation": f"Đáp án A đúng vì nó mô tả đúng bản chất của {topic_name}.",
                "difficulty": difficulty
            }
            for _ in range(count)
        ]

    @staticmethod
    def generate_flashcards(
        topic_name: str,
        rag_context: List[str],
        count: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Sinh flashcard front/back từ RAG context.
        Bao gồm nhiều loại: định nghĩa, so sánh, ứng dụng.
        """
        context_str = "\n\n---\n\n".join(rag_context) if rag_context else ""

        prompt = f"""You are creating Anki-style flashcards for studying.

Topic: "{topic_name}"
Generate {count} flashcards.

Reference content:
{context_str[:3000]}

Return ONLY valid JSON:
{{
  "flashcards": [
    {{
      "front": "Question or concept prompt (Vietnamese)",
      "back": "Answer or explanation (Vietnamese, concise but complete)",
      "card_type": "concept",
      "source_chunk": "Exact quote from reference content that this card is based on"
    }}
  ]
}}

card_type options: "concept" | "definition" | "question" | "fill_blank"
Requirements:
- Vietnamese language
- Mix different card types for better learning
- front: short, clear prompt (question or fill-in-the-blank)
- back: concise but informative answer
- Cards must be directly based on the reference content
- Vary the difficulty across cards"""

        result = _call_gemini(prompt, expect_json=True)

        if result and "flashcards" in result and len(result["flashcards"]) > 0:
            return result["flashcards"]

        # Fallback
        return [
            {
                "front": f"Định nghĩa của {topic_name} là gì?",
                "back": f"{topic_name} là một khái niệm quan trọng trong lĩnh vực này. Hãy đọc lại tài liệu để nắm rõ hơn.",
                "card_type": "definition",
                "source_chunk": context_str[:200] if context_str else ""
            }
        ]

    @staticmethod
    def generate_ai_tutor_response(
        question: str,
        rag_context: List[str],
        chat_history: List[Dict[str, str]] = None,
        document_title: str = ""
    ) -> Dict[str, Any]:
        """
        AI Tutor: trả lời câu hỏi của người dùng dựa trên RAG context từ sách.
        """
        context_str = "\n\n---\n\n".join(rag_context) if rag_context else ""

        # Build conversation history
        history_str = ""
        if chat_history:
            for msg in chat_history[-6:]:  # Lấy 6 tin nhắn gần nhất
                role = "User" if msg.get("role") == "user" else "Assistant"
                history_str += f"{role}: {msg.get('content', '')}\n"

        prompt = f"""You are Studia AI Tutor — a helpful, knowledgeable learning assistant.
You answer questions based STRICTLY on the provided reference material.

{"Document: " + document_title if document_title else ""}

Reference material from the textbook:
{context_str[:3500] if context_str else "No specific context available."}

{"Previous conversation:\n" + history_str if history_str else ""}

Student's question: {question}

Instructions:
- Answer in Vietnamese (tiếng Việt)
- Base your answer on the reference material provided
- If the question is outside the reference material scope, say so honestly
- Be conversational, encouraging, and clear
- Use examples when helpful
- Keep response focused (200-400 words)

Return ONLY valid JSON:
{{
  "answer": "Your complete answer in Vietnamese",
  "confidence": 0.9,
  "related_concepts": ["concept1", "concept2"],
  "follow_up_suggestions": ["Follow-up question 1?", "Follow-up question 2?"]
}}"""

        result = _call_gemini(prompt, expect_json=True)

        if result and "answer" in result:
            return result

        # Fallback
        return {
            "answer": f"Tôi đang xử lý câu hỏi của bạn về '{question}'. Dựa trên tài liệu bạn đã upload, đây là những gì tôi tìm thấy:\n\n{context_str[:300] if context_str else 'Hãy đảm bảo bạn đã upload tài liệu để AI có thể trả lời chính xác hơn.'}",
            "confidence": 0.5,
            "related_concepts": [],
            "follow_up_suggestions": []
        }

    @staticmethod
    def evaluate_quiz_response(
        question: Dict[str, Any],
        user_answer: str,
        response_time_ms: int
    ) -> Dict[str, Any]:
        """Đánh giá câu trả lời và trả về phản hồi chi tiết."""
        correct_answer = question.get("correct_answer", "A")
        is_correct = (user_answer.strip().upper() == correct_answer.strip().upper())

        feedback = (
            "✅ Chính xác! Bạn đã nắm rất tốt khái niệm này."
            if is_correct
            else f"❌ Chưa đúng. Đáp án đúng là **{correct_answer}**. Hãy đọc kỹ phần giải thích bên dưới."
        )

        return {
            "is_correct": is_correct,
            "user_answer": user_answer,
            "correct_answer": correct_answer,
            "feedback": feedback,
            "explanation": question.get("explanation", ""),
            "response_time_ms": response_time_ms
        }

    @staticmethod
    def analyze_weak_topics(
        quiz_results: List[Dict[str, Any]],
        topic_name: str
    ) -> Dict[str, Any]:
        """
        Phân tích kết quả quiz để tìm weak concepts.
        Trả về danh sách các khái niệm cần ôn tập thêm.
        """
        total = len(quiz_results)
        correct = sum(1 for r in quiz_results if r.get("is_correct", False))
        score_pct = (correct / total * 100) if total > 0 else 0

        wrong_answers = [r for r in quiz_results if not r.get("is_correct", False)]
        needs_review = score_pct < 70

        return {
            "topic_name": topic_name,
            "score_percentage": round(score_pct, 1),
            "correct_count": correct,
            "total_count": total,
            "needs_review": needs_review,
            "wrong_answer_count": len(wrong_answers),
            "recommendation": (
                "🔴 Cần ôn tập ngay — Hệ thống sẽ tự động thêm ngày ôn tập vào lịch học"
                if score_pct < 50
                else ("🟡 Cần luyện tập thêm — Làm flashcard để củng cố"
                      if score_pct < 70
                      else "✅ Tốt! Tiếp tục với chủ đề tiếp theo")
            )
        }
