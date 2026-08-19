from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Tuple
import math

class FSRSEngine:
    """
    Spaced Repetition Engine dựa trên giải thuật FSRS (Free Spaced Repetition Scheduler).
    Quản lý Trạng Thái Học Tập Cá Nhân Hóa (KnowledgeState) của Studia.
    """
    
    DEFAULT_RETENTION_TARGET = 0.90  # Mục tiêu giữ lại 90% kiến thức
    
    @staticmethod
    def calculate_next_review(
        stability: float,
        difficulty_rating: float,
        mastery_score: float,
        is_correct: bool,
        confidence_rating: int = 3, # 1=Again, 2=Hard, 3=Good, 4=Easy
        response_time_ms: int = 5000,
        last_reviewed_at: datetime = None
    ) -> Dict[str, Any]:
        """
        Tính toán ngày ôn tập tiếp theo và cập nhật tham số Stability (S), Difficulty (D), Mastery.
        """
        if last_reviewed_at is None:
            last_reviewed_at = datetime.now(timezone.utc)
            
        # 1. Cập nhật Difficulty (D)
        # Rating: 1=Again (rất khó/sai), 2=Hard, 3=Good, 4=Easy (rất dễ)
        d_delta = (3 - confidence_rating) * 0.5
        new_difficulty = max(1.0, min(10.0, difficulty_rating + d_delta))
        
        # 2. Cập nhật Stability (S)
        if is_correct:
            # Nếu trả lời đúng -> Tăng Stability theo độ khó và confidence
            bonus = 1.2 if confidence_rating >= 4 else (1.0 if confidence_rating == 3 else 0.8)
            time_factor = min(1.5, max(0.5, 5000.0 / max(1000, response_time_ms)))
            new_stability = stability * (1.0 + (11.0 - new_difficulty) * 0.1 * bonus * time_factor)
        else:
            # Nếu trả lời sai -> Stability sụt giảm (Forgetting Event)
            new_stability = max(0.1, stability * 0.4)
            
        # 3. Tính khoảng thời gian ôn tập tối ưu (Interval in days)
        # Formula: I = S * ( (1 / Target_Retention) - 1 )
        interval_days = new_stability * ((1.0 / FSRSEngine.DEFAULT_RETENTION_TARGET) - 1.0)
        # Giới hạn tối thiểu 0.25 ngày (6 giờ) và tối đa 365 ngày
        interval_days = max(0.25, min(365.0, interval_days))
        
        next_review_at = last_reviewed_at + timedelta(days=interval_days)
        
        # 4. Cập nhật Mastery Score (0 - 100)
        mastery_delta = 15.0 if (is_correct and confidence_rating >= 3) else (5.0 if is_correct else -10.0)
        new_mastery = max(0.0, min(100.0, mastery_score + mastery_delta))
        
        # 5. Retention score tại thời điểm hiện tại
        retention_score = math.exp(-1.0 / max(0.1, new_stability))
        
        return {
            "mastery_score": round(new_mastery, 2),
            "confidence_score": round(confidence_rating / 4.0, 2),
            "retention_score": round(retention_score, 4),
            "stability": round(new_stability, 4),
            "difficulty_rating": round(new_difficulty, 2),
            "next_review_at": next_review_at.isoformat(),
            "interval_days": round(interval_days, 2)
        }
