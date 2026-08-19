from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from app.services.rag_engine import RAGEngine
from app.services.ai_engine import AIEngine
from app.core.supabase_client import get_supabase_client
import uuid

router = APIRouter(prefix="/documents", tags=["Documents"])

class DocumentCreate(BaseModel):
    title: str
    source_type: str = "text" # pdf, url, youtube, text
    raw_content: str
    user_id: Optional[str] = "11111111-1111-1111-1111-111111111111"

@router.post("/upload")
async def upload_document(doc_in: DocumentCreate, background_tasks: BackgroundTasks):
    """
    Tải lên tài liệu -> Phân tách Text Chunks & Trích xuất Knowledge Graph Topics.
    """
    doc_id = str(uuid.uuid4())
    
    # 1. Chunking văn bản
    chunks = RAGEngine.chunk_text(doc_in.raw_content)
    
    # 2. Extract Topics & Graph
    extracted_data = AIEngine.extract_topics_and_graph(doc_in.raw_content, doc_in.title)
    topics = extracted_data["topics"]
    relationships = extracted_data["relationships"]
    
    # Lưu vào Supabase Cloud nếu client khả dụng
    supabase = get_supabase_client()
    if supabase:
        try:
            # Insert document
            supabase.table("documents").insert({
                "id": doc_id,
                "user_id": doc_in.user_id,
                "title": doc_in.title,
                "source_type": doc_in.source_type,
                "raw_content": doc_in.raw_content,
                "processing_status": "completed"
            }).execute()
        except Exception as e:
            print(f"Supabase sync warning: {e}")

    return {
        "status": "success",
        "document_id": doc_id,
        "title": doc_in.title,
        "total_chunks": len(chunks),
        "extracted_topics": topics,
        "relationships": relationships
    }
