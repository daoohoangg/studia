"""
Speech & Shadowing Engine — Studia v2
Triển khai Kỹ thuật Shadowing (Nghe & Bắt chước theo Audio)
Sử dụng Thuật toán Levenshtein Distance & Word-level Matching để chấm điểm phát âm / ngắt nghỉ.
"""
from typing import Dict, List, Any, Optional
import re
import math
import logging

logger = logging.getLogger(__name__)


def levenshtein_distance(seq1: List[str], seq2: List[str]) -> int:
    """Tính khoảng cách Levenshtein giữa 2 danh sách từ (words)."""
    m, n = len(seq1), len(seq2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if seq1[i - 1] == seq2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],       # Deletion
                    dp[i][j - 1],       # Insertion
                    dp[i - 1][j - 1]    # Substitution
                )

    return dp[m][n]


def normalize_text(text: str) -> str:
    """Chuẩn hóa văn bản: viết thường, bỏ dấu câu thừa."""
    text = text.lower()
    text = re.sub(r'[^\w\s\u00C0-\u024F\u1EA0-\u1EF9]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


class SpeechEngine:
    """
    Engine phục vụ Kỹ thuật Shadowing & Luyện âm thanh:
    - synthesize_shadowing_guide: Chia nhỏ câu, tạo nhịp ngắt và mốc thời gian theo tốc độ (0.8x, 1.0x, 1.2x)
    - evaluate_shadowing_attempt: Chấm điểm độ chính xác ghi âm qua Levenshtein Distance
    """

    @staticmethod
    def synthesize_shadowing_guide(text: str, speed: float = 1.0) -> Dict[str, Any]:
        """
        Phân tích văn bản gốc và sinh dữ liệu hướng dẫn Shadowing.
        Chia nhỏ thành các cụm từ (chunks) kèm theo nhịp dừng gợi ý.
        """
        if not text:
            return {"chunks": [], "total_words": 0, "estimated_duration_sec": 0}

        cleaned = text.strip()
        # Tách câu theo dấu ngắt câu hoặc dấu phẩy
        raw_chunks = re.split(r'([.,;!?\n]+)', cleaned)

        chunks = []
        words_count = 0

        current_chunk = ""
        for item in raw_chunks:
            if not item:
                continue
            if item in '.,;!?\n':
                current_chunk += item
                if current_chunk.strip():
                    w_list = normalize_text(current_chunk).split()
                    words_count += len(w_list)
                    chunks.append({
                        "text": current_chunk.strip(),
                        "word_count": len(w_list),
                        "pause_after_ms": 600 if item in '.!?' else 300
                    })
                current_chunk = ""
            else:
                current_chunk += item

        if current_chunk.strip():
            w_list = normalize_text(current_chunk).split()
            words_count += len(w_list)
            chunks.append({
                "text": current_chunk.strip(),
                "word_count": len(w_list),
                "pause_after_ms": 500
            })

        # Báo cáo tốc độ đọc (từ/phút chuẩn ~ 140 wpm ở 1.0x)
        base_wpm = 140 * speed
        estimated_sec = round((words_count / base_wpm) * 60, 1) if base_wpm > 0 else 0

        return {
            "original_text": text,
            "speed": speed,
            "total_words": words_count,
            "estimated_duration_sec": estimated_sec,
            "chunks": chunks,
            "available_speeds": [0.8, 1.0, 1.2]
        }

    @staticmethod
    def evaluate_shadowing_attempt(
        reference_text: str,
        user_spoken_text: str,
        audio_duration_sec: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        So sánh văn bản chuẩn (reference_text) với kết quả Speech-to-Text thu âm của học viên (user_spoken_text).
        Sử dụng Levenshtein Distance trên danh sách từ.
        """
        ref_words = normalize_text(reference_text).split()
        user_words = normalize_text(user_spoken_text).split()

        if not ref_words:
            return {
                "score": 0.0,
                "accuracy_percent": 0.0,
                "feedback": "Văn bản mẫu rỗng.",
                "word_details": []
            }

        if not user_words:
            return {
                "score": 0.0,
                "accuracy_percent": 0.0,
                "feedback": "Chưa nhận diện được giọng nói. Hãy thử thu âm lại rõ ràng hơn.",
                "word_details": [{"word": w, "status": "missing"} for w in ref_words]
            }

        distance = levenshtein_distance(ref_words, user_words)
        max_len = max(len(ref_words), len(user_words))
        similarity = max(0.0, (1.0 - (distance / max_len))) * 100.0
        accuracy_pct = round(similarity, 1)

        # Phân tích chi tiết từng từ
        word_details = []
        user_idx = 0
        correct_count = 0

        for r_word in ref_words:
            if user_idx < len(user_words) and user_words[user_idx] == r_word:
                word_details.append({"word": r_word, "status": "correct"})
                correct_count += 1
                user_idx += 1
            elif r_word in user_words[user_idx:user_idx + 3]:
                # Người dùng nói thừa từ trước đó
                found_offset = user_words[user_idx:user_idx + 3].index(r_word)
                for _ in range(found_offset):
                    word_details.append({"word": user_words[user_idx], "status": "extra"})
                    user_idx += 1
                word_details.append({"word": r_word, "status": "correct"})
                correct_count += 1
                user_idx += 1
            else:
                word_details.append({"word": r_word, "status": "missing"})

        # Đánh giá nhịp độ đọc nếu có audio_duration_sec
        pace_eval = "Chuẩn"
        if audio_duration_sec and audio_duration_sec > 0:
            actual_wpm = (len(user_words) / audio_duration_sec) * 60
            if actual_wpm < 90:
                pace_eval = "Hơi chậm — Hãy tăng tốc độ phản xạ"
            elif actual_wpm > 190:
                pace_eval = "Khá nhanh — Cần chú ý ngắt nghỉ chính xác"

        # Đưa ra nhận xét tiếng Việt chi tiết
        if accuracy_pct >= 90:
            feedback = "🌟 Xuất sắc! Phát âm và nhịp điệu Shadowing rất chuẩn xác."
        elif accuracy_pct >= 75:
            feedback = "👍 Tốt! Bạn đã bắt chước đúng phần lớn các từ chính. Hãy chú ý ngắt nghỉ đúng chỗ."
        elif accuracy_pct >= 50:
            feedback = "🟡 Khá! Một số từ bị phát âm thiếu hoặc bỏ qua. Hãy nghe lại audio mẫu ở tốc độ 0.8x."
        else:
            feedback = "🔴 Cần luyện tập thêm! Hãy ngắt nhỏ câu và phát âm chậm rãi từng từ."

        return {
            "score": round(accuracy_pct / 10, 1),
            "accuracy_percent": accuracy_pct,
            "correct_words": correct_count,
            "total_ref_words": len(ref_words),
            "total_user_words": len(user_words),
            "levenshtein_distance": distance,
            "pace_evaluation": pace_eval,
            "feedback": feedback,
            "word_details": word_details
        }
