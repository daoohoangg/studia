from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/reviews", tags=["Spaced Repetition Review Queue"])

@router.get("/queue")
async def get_review_queue(user_id: Optional[str] = "00000000-0000-0000-0000-000000000001"):
    """
    Lấy danh sách các chủ đề đến hạn ôn tập dựa trên thuật toán dự đoán đường cong quên (FSRS).
    """
    now = datetime.now(timezone.utc)
    
    mock_queue = [
        {
            "topic_id": "topic-3",
            "topic_name": "Attention Mechanism",
            "mastery_score": 45.0,
            "retention_score": 0.62, # Cần ôn ngay
            "scheduled_for": (now - timedelta(hours=2)).isoformat(),
            "urgency": "High",
            "recommended_action": "Adaptive Review Quiz"
        },
        {
            "topic_id": "topic-4",
            "topic_name": "Self-Attention",
            "mastery_score": 30.0,
            "retention_score": 0.78,
            "scheduled_for": (now + timedelta(hours=5)).isoformat(),
            "urgency": "Medium",
            "recommended_action": "Flashcards & Quick Test"
        }
    ]
    
    return {
        "user_id": user_id,
        "total_due": len(mock_queue),
        "review_items": mock_queue
    }
