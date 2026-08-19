from typing import List, Dict, Any
import json
import re

class AIEngine:
    """
    AI Engine chịu trách nhiệm sinh bài học (Lesson), tạo câu hỏi trắc nghiệm (Adaptive Quiz)
    và đánh giá bài làm của người học theo ngữ cảnh RAG & Knowledge State.
    """

    @staticmethod
    def extract_topics_and_graph(content: str, title: str) -> Dict[str, Any]:
        """
        AI Phân tích tài liệu đầu vào -> Trích xuất danh sách Topics và sơ đồ phụ thuộc Knowledge Graph.
        """
        # Trích xuất đoạn văn bản để tìm chủ đề chính
        keywords = list(set(re.findall(r'\b[A-Z][a-z]{3,}\b|\b[a-z]{5,}\b', content)))[:12]
        
        if not keywords:
            keywords = ["Khái niệm cơ bản", "Nguyên lý hoạt động", "Ứng dụng thực tế", "Kỹ thuật nâng cao"]
            
        topics = []
        for idx, kw in enumerate(keywords[:6]):
            topics.append({
                "name": kw.capitalize(),
                "slug": kw.lower().replace(" ", "-"),
                "description": f"Chủ đề học tập về {kw} được trích xuất từ tài liệu {title}.",
                "difficulty_level": min(5, (idx // 2) + 1)
            })

        # Tạo mối quan hệ DAG giả định giữa các chủ đề
        relationships = []
        for i in range(len(topics) - 1):
            relationships.append({
                "source_index": i,      # Tiền đề
                "target_index": i + 1,  # Phụ thuộc
                "relationship_type": "prerequisite",
                "weight": 1.0
            })
            
        return {
            "topics": topics,
            "relationships": relationships
        }

    @staticmethod
    def generate_lesson(
        topic_name: str,
        user_mastery: float,
        rag_context: List[str]
    ) -> Dict[str, Any]:
        """
        Sinh nội dung bài học cá nhân hóa dựa trên điểm Mastery hiện tại và ngữ cảnh RAG.
        """
        context_str = "\n---\n".join(rag_context) if rag_context else "Dữ liệu kiến thức tổng quan."
        
        # Tùy chỉnh mức độ sâu bài học theo mastery
        depth_label = "Cơ bản & Dễ hiểu" if user_mastery < 40 else ("Trung cấp & Thực hành" if user_mastery < 70 else "Nâng cao & Chuyên sâu")
        
        markdown_content = f"""# Bài Học: {topic_name}
> **Mức độ bài học**: {depth_label} | **Điểm Mastery của bạn**: {user_mastery}%

---

## 1. Giới Thiệu Cốt Lõi
{topic_name} là một trong những khái niệm quan trọng nhất. Dựa trên tài liệu bạn cung cấp:
{context_str[:300]}...

## 2. Kiến Thức Trọng Tâm
- **Nguyên lý 1**: Nắm vững định nghĩa và các trường hợp sử dụng chính của {topic_name}.
- **Nguyên lý 2**: Phân tích mối quan hệ giữa các thành phần liên quan.
- **Thực hành**: Cách ứng dụng thực tế để giải quyết bài toán thực tiễn.

## 3. Tóm Tắt Ghi Nhớ (Key Takeaways)
1. {topic_name} giúp tối ưu hóa tiến trình học tập cá nhân.
2. Hiểu rõ tiền đề trước khi chuyển sang chủ đề tiếp theo.
3. Thường xuyên kiểm tra lại thông qua **Adaptive Quiz** và **Spaced Repetition**.
"""
        return {
            "title": f"Khám phá {topic_name}",
            "content_markdown": markdown_content,
            "key_takeaways": [
                f"Hiểu định nghĩa cốt lõi của {topic_name}",
                f"Nắm vững các ứng dụng thực tế của {topic_name}",
                "Chuẩn bị cho bài đánh giá năng lực Adaptive Quiz"
            ]
        }

    @staticmethod
    def generate_adaptive_quiz(
        topic_name: str,
        user_mastery: float,
        question_count: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Sinh câu hỏi kiểm tra thích ứng dựa trên mô hình người học:
        - mastery < 40% -> Easy (Cơ bản)
        - 40% - 70% -> Medium (Trung bình)
        - > 70% -> Hard (Nâng cao)
        """
        if user_mastery < 40:
            target_difficulty = 1
            diff_text = "Easy"
        elif user_mastery < 70:
            target_difficulty = 3
            diff_text = "Medium"
        else:
            target_difficulty = 5
            diff_text = "Hard"

        questions = []
        for i in range(question_count):
            questions.append({
                "question_text": f"[{diff_text}] Câu hỏi {i+1}: Khái niệm nào mô tả đúng nhất bản chất của {topic_name}?",
                "question_type": "multiple_choice",
                "difficulty": target_difficulty,
                "options": [
                    {"id": "A", "text": f"Là nguyên lý cơ bản của {topic_name} giúp quản lý trạng thái học tập."},
                    {"id": "B", "text": f"Là một thuật toán hoàn toàn độc lập không liên quan đến dữ liệu."},
                    {"id": "C", "text": "Là một khái niệm chỉ dùng trong lý thuyết không có ứng dụng."},
                    {"id": "D", "text": "Tất cả các đáp án trên đều sai."}
                ],
                "correct_answer": "A",
                "explanation": f"Đáp án A đúng vì {topic_name} tập trung vào việc quản lý và tối ưu hóa kiến thức người học."
            })

        return questions

    @staticmethod
    def evaluate_quiz_response(
        question: Dict[str, Any],
        user_answer: str,
        response_time_ms: int
    ) -> Dict[str, Any]:
        """
        Đánh giá câu trả lời của người học, cung cấp phản hồi chi tiết.
        """
        correct_answer = question.get("correct_answer", "A")
        is_correct = (user_answer.strip().upper() == correct_answer.strip().upper())
        
        feedback = "Chính xác! Bạn đã nắm rất tốt khái niệm này." if is_correct else f"Chưa chính xác. Đáp án đúng là {correct_answer}. Hãy đọc kỹ phần giải thích bên dưới."

        return {
            "is_correct": is_correct,
            "user_answer": user_answer,
            "correct_answer": correct_answer,
            "feedback": feedback,
            "explanation": question.get("explanation", ""),
            "response_time_ms": response_time_ms
        }
