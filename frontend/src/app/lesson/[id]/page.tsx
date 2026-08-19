"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Sparkles, Database, CheckCircle, ArrowRight, Play, FileText, ChevronLeft } from "lucide-react";

export default function LessonPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<"lesson" | "rag">("lesson");

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Back button & Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/dashboard" className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
          <ChevronLeft size={16} /> Quay lại Dashboard
        </Link>
        <span className="badge badge-indigo">LOOP 1: LEARN → ADAPTIVE LESSON</span>
      </div>

      {/* Main Grid: Lesson Markdown Content + RAG Context Inspector */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        {/* Lesson View */}
        <div className="glass-panel" style={{ padding: "32px" }}>
          <h1 style={{ fontSize: "2.2rem", fontWeight: "800", marginBottom: "12px" }}>
            Khám Phá: Attention Mechanism
          </h1>
          
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
            <span className="badge badge-indigo">Mức độ: Trung cấp</span>
            <span className="badge badge-emerald">Mastery Hiện Tại: 45%</span>
          </div>

          <div style={{ color: "var(--text-secondary)", lineHeight: "1.7", fontSize: "1rem", display: "flex", flexDirection: "column", gap: "16px" }}>
            <p>
              <strong>Attention Mechanism (Cơ chế chú ý)</strong> là một đột phá quan trọng trong Học Sâu (Deep Learning), cho phép mô hình tập trung vào các thành phần quan trọng nhất của dữ liệu đầu vào thay vì cố nén toàn bộ thông tin thành một vector cố định.
            </p>

            <h3 style={{ color: "#fff", marginTop: "12px" }}>1. Tại sao lại cần Cơ chế Chú ý?</h3>
            <p>
              Trong các mô hình Seq2Seq truyền thống (như RNN/LSTM), thông tin truyền qua chuỗi dài sẽ gặp hiện tượng <em>Bottleneck (Nút thắt cổ chai)</em> khiến mô hình quên các từ ở đầu câu khi câu quá dài.
            </p>

            <h3 style={{ color: "#fff", marginTop: "12px" }}>2. Bộ Ba Vector: Query (Q), Key (K), Value (V)</h3>
            <p>
              Cơ chế Self-Attention thực hiện tính toán độ tương đồng giữa Query (Từ cần tra cứu) và tất cả các Key trong câu để tạo ra điểm chú ý (Attention Weights), sau đó nhân với các vector Value tương ứng:
            </p>

            <div style={{ padding: "16px", background: "rgba(0,0,0,0.4)", borderRadius: "10px", fontFamily: "monospace", color: "var(--accent-cyan)", border: "1px solid var(--border-subtle)" }}>
              Attention(Q, K, V) = softmax( (Q * K^T) / sqrt(d_k) ) * V
            </div>

            <h3 style={{ color: "#fff", marginTop: "12px" }}>3. Key Takeaways</h3>
            <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>Giải quyết triệt để nút thắt cổ chai của RNN/LSTM đối với chuỗi văn bản dài.</li>
              <li>Tính toán song song (Parallelization) cực hiệu quả trên GPU.</li>
              <li>Nền tảng cốt lõi hình thành nên kiến trúc Transformer & các Large Language Models hiện đại.</li>
            </ul>
          </div>

          {/* Action Footer */}
          <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Bạn đã hoàn thành 100% nội dung bài học.
            </span>
            <Link href="/quiz/attention-mechanism" className="btn-primary">
              <Play size={16} /> Chuyển Sang Vòng 2: Adaptive Quiz
            </Link>
          </div>
        </div>

        {/* RAG Context Inspector Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={16} color="var(--accent-cyan)" /> Supabase pgvector RAG
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
              Các đoạn văn bản gốc được truy vấn theo Vector Similarity search (top-k = 3):
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", fontSize: "0.78rem", border: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>Chunk #4 (Độ tương đồng: 94.2%)</span>
                <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>"The attention mechanism allows the model to dynamically weight different input tokens..."</p>
              </div>

              <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", fontSize: "0.78rem", border: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>Chunk #7 (Độ tương đồng: 88.5%)</span>
                <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>"Query, Key, and Value projections are linear transformations applied to embeddings..."</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
