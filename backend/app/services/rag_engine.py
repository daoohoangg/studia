from typing import List, Dict, Any
import math
import random
import re

class RAGEngine:
    """
    RAG Engine phục vụ phân tách tài liệu (Chunking) và truy vấn ngữ cảnh theo Vector Search (pgvector).
    """

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        Chia văn bản thành các chunk nhỏ hơn để phục vụ Vector Search.
        """
        clean_text = re.sub(r'\s+', ' ', text).strip()
        if not clean_text:
            return []

        chunks = []
        start = 0
        text_length = len(clean_text)

        while start < text_length:
            end = start + chunk_size
            chunk = clean_text[start:end]
            chunks.append(chunk)
            start = end - overlap
            if start >= text_length - overlap:
                break

        return chunks

    @staticmethod
    def generate_embedding(text: str, vector_dim: int = 1536) -> List[float]:
        """
        Tạo vector embedding 1536 chiều cho pgvector (Sử dụng OpenAI/Gemini hoặc Pseudo-deterministic vector).
        """
        # Giả lập deterministic embedding bằng hash chuỗi chữ
        seed = sum(ord(c) for c in text[:100])
        random.seed(seed)
        vec = [random.uniform(-1.0, 1.0) for _ in range(vector_dim)]
        # Chuẩn hóa vector đơn vị (L2 norm = 1)
        norm = math.sqrt(sum(x*x for x in vec))
        return [round(x / norm, 6) for x in vec]

    @staticmethod
    def search_relevant_chunks(
        query: str,
        chunks: List[Dict[str, Any]],
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Tìm kiếm các đoạn văn bản có độ tương đồng ngữ cảnh cao nhất với query.
        """
        query_vec = RAGEngine.generate_embedding(query)
        scored_chunks = []

        for chunk in chunks:
            chunk_vec = chunk.get("embedding") or RAGEngine.generate_embedding(chunk.get("content", ""))
            # Tính Cosine Similarity
            dot_product = sum(a * b for a, b in zip(query_vec, chunk_vec))
            scored_chunks.append({
                "content": chunk.get("content", ""),
                "chunk_index": chunk.get("chunk_index", 0),
                "similarity": round(dot_product, 4)
            })

        # Sắp xếp giảm dần theo similarity
        scored_chunks.sort(key=lambda x: x["similarity"], reverse=True)
        return scored_chunks[:top_k]
