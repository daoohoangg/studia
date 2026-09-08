"""
RAG Engine — Studia v2
- Chunking văn bản thông minh (sentence-aware)
- Gemini text-embedding-004 (768 dims) thực sự
- pgvector semantic search qua Supabase RPC
"""
from typing import List, Dict, Any, Optional
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
                logger.warning(f"Gemini embedding failed, using fallback: {e}")

        # --- Fallback: deterministic pseudo-embedding ---
        return RAGEngine._pseudo_embedding(text, vector_dim)

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
                logger.warning(f"Gemini query embedding failed: {e}")

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
