from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.graph_engine import GraphEngine
from app.services.ai_engine import AIEngine
from app.services.rag_engine import RAGEngine

router = APIRouter(prefix="/learning-paths", tags=["Learning Paths & Graph"])

class GenerateLessonRequest(BaseModel):
    topic_name: str
    user_mastery: float = 0.0
    document_content: Optional[str] = ""

@router.get("/graph")
async def get_knowledge_graph(document_id: Optional[str] = None):
    """
    Lấy sơ đồ Knowledge Graph dạng Nodes & Edges để hiển thị Visual Graph trên UI.
    """
    mock_nodes = [
        {"id": "topic-1", "name": "Đại Số Tuyến Tính", "difficulty": 1, "mastery": 85.0},
        {"id": "topic-2", "name": "Xác Suất Thống Kê", "difficulty": 2, "mastery": 70.0},
        {"id": "topic-3", "name": "Attention Mechanism", "difficulty": 4, "mastery": 45.0},
        {"id": "topic-4", "name": "Self-Attention", "difficulty": 4, "mastery": 30.0},
        {"id": "topic-5", "name": "Transformer Architecture", "difficulty": 5, "mastery": 10.0}
    ]
    
    mock_edges = [
        {"source": "topic-1", "target": "topic-3", "type": "prerequisite"},
        {"source": "topic-2", "target": "topic-3", "type": "prerequisite"},
        {"source": "topic-3", "target": "topic-4", "type": "contains"},
        {"source": "topic-4", "target": "topic-5", "type": "prerequisite"}
    ]

    return {
        "nodes": mock_nodes,
        "edges": mock_edges
    }

@router.post("/generate-lesson")
async def generate_lesson(req: GenerateLessonRequest):
    """
    Sinh nội dung bài học cá nhân hóa dựa trên Mastery & Context RAG.
    """
    chunks = RAGEngine.chunk_text(req.document_content) if req.document_content else []
    rag_context = [c for c in chunks[:3]]
    
    lesson = AIEngine.generate_lesson(
        topic_name=req.topic_name,
        user_mastery=req.user_mastery,
        rag_context=rag_context
    )
    return lesson
