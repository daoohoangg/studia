"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Upload, Sparkles, BookOpen, CheckCircle, RefreshCw, Flame, Award, 
  Brain, FileText, ArrowRight, Play, AlertCircle, CheckCircle2 
} from "lucide-react";

export default function Dashboard() {
  const [docTitle, setDocTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !rawText) return;
    
    setIsUploading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: docTitle,
          source_type: "text",
          raw_content: rawText
        })
      });
      const data = await res.json();
      setUploadResult(data);
    } catch (err) {
      console.log("Using simulated upload response");
      setUploadResult({
        status: "success",
        title: docTitle,
        total_chunks: Math.ceil(rawText.length / 300),
        extracted_topics: [
          { name: "Khái Niệm Cốt Lõi", difficulty_level: 1 },
          { name: "Nguyên Lý Hoạt Động", difficulty_level: 2 },
          { name: "Ứng Dụng Thực Tế", difficulty_level: 3 }
        ]
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Top Banner Stats */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "800" }}>Dashboard Trạng Thái Học Tập</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Theo dõi 3 Vòng lặp Learn → Evaluate → Retain cá nhân hóa của bạn.
          </p>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          <div className="glass-panel" style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <Flame color="#f59e0b" size={24} />
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>STREAK HỌC TẬP</div>
              <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fbbf24" }}>7 Ngày Trống</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <Award color="#10b981" size={24} />
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>TỶ LỆ GHI NHỚ (FSRS)</div>
              <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#34d399" }}>92.4%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload (Loop 1) & Review Queue (Loop 3) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
        {/* Loop 1 Upload Section */}
        <div className="glass-panel" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div className="badge badge-indigo">VÒNG 1: LEARN</div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "700" }}>Tải Lên Tài Liệu & Phân Tích AI</h2>
          </div>

          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                Tên tài liệu / Chủ đề học:
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Ví dụ: Kiến Trúc Transformer & Attention Mechanism..."
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)",
                  color: "#fff", outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                Nội dung tài liệu (Text / Article / Notes):
              </label>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Dán nội dung tài liệu học tập của bạn vào đây..."
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)",
                  color: "#fff", outline: "none", resize: "vertical"
                }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isUploading}>
              {isUploading ? <Sparkles className="spin" size={18} /> : <Upload size={18} />}
              {isUploading ? "AI Đang Bóc Tách Knowledge Graph..." : "Tải Lên & Tạo Knowledge Graph"}
            </button>
          </form>

          {/* Upload Results Preview */}
          {uploadResult && (
            <div style={{ marginTop: "20px", padding: "16px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontWeight: 700, marginBottom: "8px" }}>
                <CheckCircle2 size={18} /> Đã Bóc Tách Thành Công {uploadResult.extracted_topics?.length} Chủ Đề!
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "10px" }}>
                Số lượng Text Chunks tạo vector embedding pgvector: <strong>{uploadResult.total_chunks} chunks</strong>
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {uploadResult.extracted_topics?.map((t: any, i: number) => (
                  <span key={i} className="badge badge-indigo">
                    {t.name} (Độ khó {t.difficulty_level})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loop 3 Spaced Repetition Due Queue */}
        <div className="glass-panel" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="badge badge-emerald">VÒNG 3: RETAIN</div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700" }}>Lịch Ôn Tập Hôn Nay</h2>
            </div>
            <RefreshCw size={18} color="var(--accent-emerald)" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: "700", color: "#fff" }}>Attention Mechanism</span>
                <span className="badge badge-rose">Cần Ôn Ngay</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                <span>Mastery: 45%</span>
                <span>Dự đoán giữ lại (FSRS): 62%</span>
              </div>
              <div className="progress-bar-bg" style={{ marginBottom: "12px" }}>
                <div className="progress-bar-fill" style={{ width: "45%", background: "var(--accent-rose)" }}></div>
              </div>
              <Link href="/quiz/attention-mechanism" className="btn-secondary" style={{ width: "100%", justifyContent: "center", padding: "8px" }}>
                <Play size={14} /> Làm Adaptive Review Quiz
              </Link>
            </div>

            <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: "700", color: "#fff" }}>Self-Attention Vector Math</span>
                <span className="badge badge-amber">Ôn Trong Ngày</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                <span>Mastery: 70%</span>
                <span>Dự đoán giữ lại (FSRS): 78%</span>
              </div>
              <div className="progress-bar-bg" style={{ marginBottom: "12px" }}>
                <div className="progress-bar-fill" style={{ width: "70%", background: "var(--accent-amber)" }}></div>
              </div>
              <Link href="/quiz/self-attention" className="btn-secondary" style={{ width: "100%", justifyContent: "center", padding: "8px" }}>
                <Play size={14} /> Làm Adaptive Review Quiz
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
