"""
Documents API v2 — Upload PDF/Text, Real Supabase Storage
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from app.services.rag_engine import RAGEngine
from app.services.ai_engine import AIEngine
from app.core.supabase_client import get_supabase_client
from app.config import settings
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])

DEFAULT_USER_ID = settings.DEFAULT_USER_ID


class DocumentTextCreate(BaseModel):
    title: str
    source_type: str = "text"
    raw_content: str
    user_id: Optional[str] = None


async def _process_document_background(
    doc_id: str,
    user_id: str,
    title: str,
    raw_content: str,
    supabase
):
    """
    Background task: Chunk → Embed → Save to Supabase
    Sau đó extract Topics và Knowledge Graph.
    """
    try:
        # 1. Cập nhật status = processing
        supabase.table("documents").update(
            {"processing_status": "processing"}
        ).eq("id", doc_id).execute()

        # 2. Chunking
        chunks = RAGEngine.chunk_text(raw_content)
        logger.info(f"[{doc_id}] Created {len(chunks)} chunks")

        # 3. Embed và lưu chunks vào Supabase (batch)
        chunk_records = []
        for i, chunk_text in enumerate(chunks):
            embedding = RAGEngine.generate_embedding(chunk_text)
            chunk_records.append({
                "document_id": doc_id,
                "chunk_index": i,
                "content": chunk_text,
                "embedding": embedding,
                "metadata": {"chunk_index": i, "total_chunks": len(chunks)}
            })

        # Insert chunks in batches of 20
        batch_size = 20
        for i in range(0, len(chunk_records), batch_size):
            batch = chunk_records[i:i + batch_size]
            supabase.table("document_chunks").insert(batch).execute()
            logger.info(f"[{doc_id}] Inserted chunks batch {i//batch_size + 1}")

        # 4. Extract Topics + Knowledge Graph via AI
        extracted = AIEngine.extract_topics_and_graph(raw_content, title)
        topics = extracted.get("topics", [])
        relationships = extracted.get("relationships", [])

        logger.info(f"[{doc_id}] Extracted {len(topics)} topics")

        # 5. Lưu topics vào Supabase
        topic_ids = []
        for topic_data in topics:
            topic_id = str(uuid.uuid4())
            # Ensure unique slug by appending doc_id suffix
            slug = topic_data.get("slug", "")[:50]
            unique_slug = f"{slug}-{doc_id[:8]}"

            topic_record = {
                "id": topic_id,
                "document_id": doc_id,
                "name": topic_data.get("name", ""),
                "slug": unique_slug,
                "description": topic_data.get("description", ""),
                "difficulty_level": topic_data.get("difficulty_level", 1)
            }
            supabase.table("topics").insert(topic_record).execute()
            topic_ids.append(topic_id)

        # 6. Lưu relationships
        for rel in relationships:
            src_idx = rel.get("source_index", 0)
            tgt_idx = rel.get("target_index", 1)
            if src_idx < len(topic_ids) and tgt_idx < len(topic_ids):
                try:
                    supabase.table("topic_relationships").insert({
                        "source_topic_id": topic_ids[src_idx],
                        "target_topic_id": topic_ids[tgt_idx],
                        "relationship_type": rel.get("relationship_type", "prerequisite"),
                        "weight": rel.get("weight", 1.0)
                    }).execute()
                except Exception:
                    pass  # Ignore duplicate relationships

        # 7. Khởi tạo Knowledge States & Sinh Flashcards cho từng topic
        for topic_id, topic_data in zip(topic_ids, topics):
            try:
                supabase.table("knowledge_states").insert({
                    "user_id": user_id,
                    "topic_id": topic_id,
                    "mastery_score": 0.0,
                    "confidence_score": 0.5,
                    "retention_score": 1.0,
                    "stability": 1.0,
                    "difficulty_rating": 5.0
                }).execute()
            except Exception:
                pass  # Ignore if already exists

            # Sinh Flashcards tự động cho topic
            try:
                topic_chunks = [c.get("content", "") for c in chunk_records if topic_data.get("name", "").lower() in c.get("content", "").lower()]
                if not topic_chunks:
                    topic_chunks = [c.get("content", "") for c in chunk_records[:6]]

                fc_list = AIEngine.generate_flashcards(
                    topic_name=topic_data.get("name", ""),
                    rag_context=topic_chunks[:5],
                    count=4
                )
                for card in fc_list:
                    card_id = str(uuid.uuid4())
                    supabase.table("flashcards").insert({
                        "id": card_id,
                        "topic_id": topic_id,
                        "document_id": doc_id,
                        "front": card.get("front", ""),
                        "back": card.get("back", ""),
                        "source_chunk": card.get("source_chunk", "")[:500],
                        "card_type": card.get("card_type", "concept")
                    }).execute()

                    supabase.table("flashcard_states").insert({
                        "user_id": user_id,
                        "flashcard_id": card_id,
                        "stability": 1.0,
                        "difficulty_rating": 5.0,
                        "mastery_score": 0.0,
                        "next_review_at": datetime.now(timezone.utc).isoformat()
                    }).execute()
            except Exception as fc_err:
                logger.warning(f"Flashcard auto-gen warning: {fc_err}")

        # 8. Cập nhật status = completed
        supabase.table("documents").update(
            {"processing_status": "completed"}
        ).eq("id", doc_id).execute()

        logger.info(f"[{doc_id}] Document processing COMPLETED. {len(chunks)} chunks, {len(topics)} topics")

    except Exception as e:
        logger.error(f"[{doc_id}] Processing FAILED: {e}")
        try:
            supabase.table("documents").update(
                {"processing_status": "failed"}
            ).eq("id", doc_id).execute()
        except Exception:
            pass


@router.post("/upload")
async def upload_document_text(
    doc_in: DocumentTextCreate,
    background_tasks: BackgroundTasks
):
    """
    Upload tài liệu dạng text → Chunk + Embed + Extract Knowledge Graph.
    Processing chạy background, trả về ngay document_id.
    """
    user_id = doc_in.user_id or DEFAULT_USER_ID
    doc_id = str(uuid.uuid4())

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    # Insert document record
    supabase.table("documents").insert({
        "id": doc_id,
        "user_id": user_id,
        "title": doc_in.title,
        "source_type": doc_in.source_type,
        "raw_content": doc_in.raw_content,
        "processing_status": "pending"
    }).execute()

    # Queue background processing
    background_tasks.add_task(
        _process_document_background,
        doc_id=doc_id,
        user_id=user_id,
        title=doc_in.title,
        raw_content=doc_in.raw_content,
        supabase=supabase
    )

    return {
        "status": "processing",
        "document_id": doc_id,
        "title": doc_in.title,
        "message": "Tài liệu đang được xử lý. Kiểm tra lại sau vài giây.",
        "estimated_seconds": max(5, len(doc_in.raw_content) // 500)
    }


async def _process_pdf_background(
    doc_id: str,
    user_id: str,
    title: str,
    filename: str,
    pdf_bytes: bytes,
    supabase
):
    """
    Background Task hoàn toàn cho tệp PDF:
    1. Parse text từ PDF in-memory
    2. Upload file PDF lên Supabase Storage
    3. Cập nhật Storage URL
    4. Gọi _process_document_background bóc tách Chunks, Embeddings, Graph & Flashcards
    """
    try:
        # 1. Parse text in-memory
        raw_text = ""
        try:
            from pypdf import PdfReader
            import io
            reader = PdfReader(io.BytesIO(pdf_bytes))
            for page in reader.pages:
                raw_text += page.extract_text() or ""
            raw_text = raw_text.strip()
        except Exception as parse_err:
            logger.error(f"[{doc_id}] PDF parse background error: {parse_err}")

        if not raw_text or len(raw_text) < 50:
            raw_text = f"Tài liệu {title}. Nội dung đang được cập nhật."

        # 2. Upload file PDF thuần lên Supabase Storage bucket 'documents'
        storage_path = f"{user_id}/{doc_id}/{filename}"
        file_url = storage_path
        try:
            try:
                supabase.storage.create_bucket("documents", options={"public": True})
            except Exception:
                pass

            supabase.storage.from_("documents").upload(
                path=storage_path,
                file=pdf_bytes,
                file_options={"content-type": "application/pdf", "x-upsert": "true"}
            )
            file_url = supabase.storage.from_("documents").get_public_url(storage_path)
            logger.info(f"[{doc_id}] PDF uploaded to Supabase Storage: {file_url}")
        except Exception as storage_err:
            logger.warning(f"[{doc_id}] Supabase storage upload warning: {storage_err}")

        # Update file_path in DB
        try:
            supabase.table("documents").update({"file_path": file_url}).eq("id", doc_id).execute()
        except Exception:
            pass

        # 3. Tiến hành Chunking, Embeddings, Knowledge Graph & Flashcards
        await _process_document_background(
            doc_id=doc_id,
            user_id=user_id,
            title=title,
            raw_content=raw_text,
            supabase=supabase
        )

    except Exception as e:
        logger.error(f"[{doc_id}] PDF Background Processing FAILED: {e}")
        try:
            supabase.table("documents").update({"processing_status": "failed"}).eq("id", doc_id).execute()
        except Exception:
            pass


@router.post("/upload-pdf")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    user_id: str = Form(DEFAULT_USER_ID)
):
    """
    Upload file PDF — Trả về TỨC THÌ (< 20ms).
    Toàn bộ PDF Parsing, Storage Upload, Embeddings và Knowledge Graph đều chạy NỀN 100%.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận tệp .pdf")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Tệp PDF rỗng")

    doc_id = str(uuid.uuid4())
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    # 1. Ghi ngay bản ghi Metadata vào DB (processing_status = 'pending')
    supabase.table("documents").insert({
        "id": doc_id,
        "user_id": user_id,
        "title": title,
        "source_type": "pdf",
        "file_path": f"{user_id}/{doc_id}/{file.filename}",
        "raw_content": None,
        "processing_status": "pending"
    }).execute()

    # 2. Đẩy TOÀN BỘ xử lý nặng vào Background Task
    background_tasks.add_task(
        _process_pdf_background,
        doc_id=doc_id,
        user_id=user_id,
        title=title,
        filename=file.filename,
        pdf_bytes=pdf_bytes,
        supabase=supabase
    )

    return {
        "status": "pending",
        "document_id": doc_id,
        "title": title,
        "filename": file.filename,
        "message": "Upload thành công! Toàn bộ tiến trình xử lý PDF, Vector Embedding & Knowledge Graph đang chạy 100% ngầm ở nền."
    }


@router.get("/{document_id}/status")
async def get_document_status(document_id: str):
    """Kiểm tra trạng thái xử lý document."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    resp = supabase.table("documents").select("id, title, source_type, file_path, processing_status, created_at").eq("id", document_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Document không tồn tại")

    doc = resp.data[0]

    # Đếm chunks và topics đã xử lý
    chunk_count = 0
    topic_count = 0
    if doc["processing_status"] in ("processing", "completed"):
        chunk_resp = supabase.table("document_chunks").select("id", count="exact").eq("document_id", document_id).execute()
        chunk_count = chunk_resp.count or 0
        topic_resp = supabase.table("topics").select("id", count="exact").eq("document_id", document_id).execute()
        topic_count = topic_resp.count or 0

    return {
        **doc,
        "chunk_count": chunk_count,
        "topic_count": topic_count
    }


@router.get("/{document_id}/topics")
async def get_document_topics(document_id: str):
    """Lấy danh sách topics đã extract từ document."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    topics_resp = supabase.table("topics").select("*").eq("document_id", document_id).execute()
    rels_resp = supabase.table("topic_relationships") \
        .select("*") \
        .execute()

    topic_ids = {t["id"] for t in (topics_resp.data or [])}
    rels = [
        r for r in (rels_resp.data or [])
        if r["source_topic_id"] in topic_ids and r["target_topic_id"] in topic_ids
    ]

    return {
        "document_id": document_id,
        "topics": topics_resp.data or [],
        "relationships": rels
    }


@router.get("/")
async def list_documents(user_id: Optional[str] = None):
    """Lấy danh sách documents của user."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    uid = user_id or DEFAULT_USER_ID
    try:
        resp = supabase.table("documents") \
            .select("id, title, source_type, file_path, processing_status, created_at") \
            .eq("user_id", uid) \
            .order("created_at", desc=True) \
            .execute()

        documents = getattr(resp, "data", []) or []
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        documents = []

    # Thêm topic count cho mỗi document
    for doc in documents:
        try:
            tc = supabase.table("topics").select("id", count="exact").eq("document_id", doc["id"]).execute()
            doc["topic_count"] = getattr(tc, "count", 0) or 0
        except Exception:
            doc["topic_count"] = 0

    return {"documents": documents, "total": len(documents)}


class SearchChunksRequest(BaseModel):
    query: str
    top_k: int = 5


@router.get("/{document_id}/chunks")
async def get_document_chunks(document_id: str, limit: int = 20):
    """
    Lấy danh sách các đoạn văn bản (chunks) 600 ký tự kèm metadata đã tách của tài liệu.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    resp = supabase.table("document_chunks") \
        .select("id, chunk_index, content, metadata") \
        .eq("document_id", document_id) \
        .order("chunk_index") \
        .limit(limit) \
        .execute()

    chunks = resp.data or []
    return {
        "document_id": document_id,
        "total_returned": len(chunks),
        "chunks": chunks
    }


@router.post("/{document_id}/search")
async def search_document_vector(document_id: str, req: SearchChunksRequest):
    """
    Thử nghiệm Semantic Vector Search trên tài liệu qua Supabase RPC match_document_chunks_by_doc (Cosine Distance).
    """
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")

    if not req.query:
        raise HTTPException(status_code=400, detail="Thiếu từ khóa tìm kiếm query")

    results = RAGEngine.search_relevant_chunks(
        query=req.query,
        supabase_client=supabase,
        document_id=document_id,
        top_k=req.top_k
    )

    return {
        "document_id": document_id,
        "query": req.query,
        "top_k": req.top_k,
        "matches": results
    }

