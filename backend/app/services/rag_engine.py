"""
RAG Engine — Studia v2
- Chunking văn bản thông minh (sentence-aware)
- Gemini text-embedding-004 (768 dims) thực sự
- pgvector semantic search qua Supabase RPC
"""
from typing import List, Dict, Any, Optional
import hashlib
import math
import random
import re
import logging

logger = logging.getLogger(__name__)


def _get_gemini_embedding_model():
    """Lazy-load Gemini embedding client."""
    try:
        import google.generativeai as genai
        from app.config import settings
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
            return None, None
        genai.configure(api_key=settings.GEMINI_API_KEY)
        return genai, settings.GEMINI_EMBEDDING_MODEL
    except Exception as e:
        logger.warning(f"Gemini embedding init failed: {e}")
        return None, None


class RAGEngine:
    """
    RAG Engine phục vụ:
    1. Chunking: Phân tách văn bản thành chunks nhỏ (sentence-aware)
    2. Embedding: Tạo vector embedding bằng Gemini text-embedding-004
    3. Search: Tìm kiếm ngữ cảnh liên quan qua pgvector trên Supabase
    """

    @staticmethod
    def chunk_text(
        text: str,
        chunk_size: int = 600,
        overlap: int = 80
    ) -> List[str]:
        """
        Chia văn bản thành chunks nhỏ với sentence boundary awareness.
        Ưu tiên không cắt giữa câu.
        """
        clean_text = re.sub(r'\s+', ' ', text).strip()
        if not clean_text:
            return []

        # Tách thành câu (sentence splitting)
        sentences = re.split(r'(?<=[.!?])\s+', clean_text)

        chunks = []
        current_chunk = ""
        current_len = 0

        for sentence in sentences:
            sentence_len = len(sentence)

            if current_len + sentence_len + 1 > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                # Overlap: giữ lại phần cuối của chunk trước
                overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                current_chunk = overlap_text + " " + sentence
                current_len = len(current_chunk)
            else:
                current_chunk = (current_chunk + " " + sentence).strip() if current_chunk else sentence
                current_len = len(current_chunk)

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return [c for c in chunks if len(c) > 50]  # Filter chunks quá ngắn

    @staticmethod
    def chunk_blocks(
        blocks: List[Dict[str, Any]],
        chunk_size: int = 600,
        overlap: int = 80,
        min_chars: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Chunk theo khối nội dung của ebook (đã sắp theo thứ tự đọc).

        - Tiêu đề luôn mở một chunk mới (không bị cắt ngang giữa hai mục).
        - Các đoạn liền nhau được gộp tới ~chunk_size ký tự; đoạn dài hơn thì cắt theo câu.
        - Không chồng lấn giữa các khối: sửa một khối chỉ làm đổi chunk chứa khối đó
          → lập chỉ mục lại tăng dần chỉ phải embedding vài chunk.
        - Mỗi chunk mang vết nguồn: block_ids, trang, đường dẫn tiêu đề, content_hash.
        """
        chunks: List[Dict[str, Any]] = []
        heading_path: List[tuple] = []  # (level, text)
        current: Dict[str, Any] = {}

        def flush() -> None:
            nonlocal current
            text = current.get("text", "").strip()
            if text:
                pages = [p for p in current["pages"] if p is not None]
                chunks.append({
                    "content": text,
                    "block_ids": list(dict.fromkeys(current["block_ids"])),
                    "page_start": min(pages) if pages else None,
                    "page_end": max(pages) if pages else None,
                    "heading_path": current["heading_path"],
                })
            current = {}

        def add(text: str, block: Dict[str, Any], body: bool = True) -> None:
            nonlocal current
            if not current:
                current = {"text": "", "block_ids": [], "pages": [], "has_body": False, "heading_path": []}
            current["heading_path"] = [t for _, t in heading_path]
            current["has_body"] = current["has_body"] or body
            joined = current["text"] + "\n" + text if current["text"] else text
            current["text"] = joined.strip()
            current["block_ids"].append(block.get("id"))
            current["pages"].append(block.get("page_number"))

        for block in blocks:
            text = (block.get("text") or "").replace("**", "").strip()
            if not text:
                continue
            if block.get("block_type") == "heading":
                if current.get("has_body"):
                    flush()  # tiêu đề đứng liền nhau thì nằm chung một chunk với đoạn đầu của mục
                level = block.get("level") or 1
                while heading_path and heading_path[-1][0] >= level:
                    heading_path.pop()
                heading_path.append((level, text))
                add(text, block, body=False)
                continue
            if len(text) > chunk_size:
                flush()
                for piece in RAGEngine.chunk_text(text, chunk_size=chunk_size, overlap=overlap):
                    add(piece, block)
                    flush()
                continue
            if current and len(current["text"]) + 1 + len(text) > chunk_size:
                flush()
            add(text, block)
        flush()

        if len(chunks) > 1:
            chunks = [c for c in chunks if len(c["content"]) >= min_chars] or chunks
        for index, chunk in enumerate(chunks):
            chunk["chunk_index"] = index
            chunk["content_hash"] = hashlib.sha1(chunk["content"].encode("utf-8")).hexdigest()
        return chunks

    @staticmethod
    def generate_embedding(text: str, vector_dim: int = 768) -> List[float]:
        """
        Tạo vector embedding:
        1. Thử Gemini text-embedding-004 (768 dims)
        2. Fallback: deterministic pseudo-embedding (cho dev/testing)
        """
        genai, model_name = _get_gemini_embedding_model()

        if genai and model_name:
            try:
                result = genai.embed_content(
                    model=model_name,
                    content=text,
                    task_type="retrieval_document"
                )
                embedding = result["embedding"]
                return [round(x, 6) for x in embedding]
            except Exception as e:
                # Log once concisely to prevent log flooding when API key is suspended/invalid
                logger.debug(f"Gemini embedding failed, using pseudo-embedding fallback: {e}")

        # --- Fallback: deterministic pseudo-embedding ---
        return RAGEngine._pseudo_embedding(text, vector_dim)

    @staticmethod
    def generate_embeddings(texts: List[str], batch_size: int = 100, max_workers: int = 4) -> List[List[float]]:
        """
        Embedding cho nhiều đoạn: gửi theo lô (mỗi lô một lời gọi Gemini), các lô chạy song song.
        Lô nào lỗi thì rơi về pseudo-embedding cho riêng lô đó.
        """
        if not texts:
            return []
        genai, model_name = _get_gemini_embedding_model()

        def embed_batch(batch: List[str]) -> List[List[float]]:
            if genai and model_name:
                try:
                    result = genai.embed_content(model=model_name, content=batch, task_type="retrieval_document")
                    vectors = result["embedding"]
                    if len(vectors) == len(batch):
                        return [[round(x, 6) for x in vector] for vector in vectors]
                except Exception as e:
                    logger.debug(f"Gemini batch embedding failed, using pseudo-embedding fallback: {e}")
            return [RAGEngine._pseudo_embedding(text) for text in batch]

        batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]
        if len(batches) == 1:
            return embed_batch(batches[0])
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            return [vector for vectors in pool.map(embed_batch, batches) for vector in vectors]

    @staticmethod
    def generate_query_embedding(query: str) -> List[float]:
        """
        Tạo embedding cho query (search query — task_type khác với document).
        """
        genai, model_name = _get_gemini_embedding_model()

        if genai and model_name:
            try:
                result = genai.embed_content(
                    model=model_name,
                    content=query,
                    task_type="retrieval_query"
                )
                return [round(x, 6) for x in result["embedding"]]
            except Exception as e:
                logger.debug(f"Gemini query embedding failed: {e}")

        return RAGEngine._pseudo_embedding(query, 768)

    @staticmethod
    def _pseudo_embedding(text: str, dim: int = 768) -> List[float]:
        """Deterministic pseudo-embedding cho dev/testing."""
        seed = sum(ord(c) for c in text[:100])
        random.seed(seed)
        vec = [random.uniform(-1.0, 1.0) for _ in range(dim)]
        norm = math.sqrt(sum(x * x for x in vec))
        return [round(x / norm, 6) for x in vec] if norm > 0 else vec

    @staticmethod
    def search_relevant_chunks(
        query: str,
        supabase_client,
        document_id: Optional[str] = None,
        top_k: int = 5,
        threshold: float = 0.4
    ) -> List[Dict[str, Any]]:
        """
        Tìm kiếm chunks liên quan nhất qua Supabase pgvector.
        Ưu tiên dùng RPC function match_document_chunks_by_doc nếu có document_id.
        """
        query_embedding = RAGEngine.generate_query_embedding(query)

        if not supabase_client:
            logger.warning("No Supabase client — returning empty RAG context")
            return []

        try:
            if document_id:
                # Search trong document cụ thể
                response = supabase_client.rpc(
                    "match_document_chunks_by_doc",
                    {
                        "query_embedding": query_embedding,
                        "target_document_id": document_id,
                        "match_threshold": threshold,
                        "match_count": top_k
                    }
                ).execute()
            else:
                # Search toàn bộ vector store
                response = supabase_client.rpc(
                    "match_document_chunks",
                    {
                        "query_embedding": query_embedding,
                        "match_threshold": threshold,
                        "match_count": top_k
                    }
                ).execute()

            if response.data:
                return [
                    {
                        "content": chunk.get("content", ""),
                        "chunk_index": chunk.get("chunk_index", 0),
                        "similarity": round(chunk.get("similarity", 0), 4),
                        "section_title": chunk.get("section_title", ""),
                        "document_id": chunk.get("document_id", "")
                    }
                    for chunk in response.data
                ]
            return []

        except Exception as e:
            logger.error(f"pgvector search failed: {e}")
            return []

    @staticmethod
    def search_relevant_chunks_local(
        query: str,
        chunks: List[Dict[str, Any]],
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Local cosine similarity search (dùng khi không có Supabase).
        """
        query_vec = RAGEngine.generate_query_embedding(query)
        scored = []

        for chunk in chunks:
            chunk_vec = chunk.get("embedding") or RAGEngine._pseudo_embedding(chunk.get("content", ""))
            dot = sum(a * b for a, b in zip(query_vec, chunk_vec))
            scored.append({
                "content": chunk.get("content", ""),
                "chunk_index": chunk.get("chunk_index", 0),
                "similarity": round(dot, 4)
            })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]

    @staticmethod
    def extract_rag_texts(chunks: List[Dict[str, Any]]) -> List[str]:
        """Lấy danh sách text content từ chunks để đưa vào LLM prompt."""
        return [c.get("content", "") for c in chunks if c.get("content")]
