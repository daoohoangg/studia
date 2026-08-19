"use client";

import Link from "next/link";
import { Brain, ArrowRight, Upload, CheckCircle2, ShieldCheck, Zap, RefreshCw, BarChart2 } from "lucide-react";

export default function Home() {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      {/* Hero Header */}
      <div style={{ textAlign: "center", padding: "60px 0 40px 0" }}>
        <span className="badge badge-indigo" style={{ marginBottom: "16px" }}>
          <Zap size={14} /> Personal Learning Intelligence Platform
        </span>
        <h1 style={{ fontSize: "3.2rem", fontWeight: "800", marginBottom: "20px", lineHeight: "1.15" }}>
          Không chỉ đơn giản là Chatbot. <br />
          <span className="text-gradient">Quản lý Trạng Thái Học Tập Dài Hạn với AI</span>
        </h1>
        <p style={{ fontSize: "1.15rem", color: "var(--text-secondary)", maxWidth: "750px", margin: "0 auto 32px auto", lineHeight: "1.6" }}>
          Studia xây dựng Vòng Lặp Học Tập Cá Nhân Hóa (Learn → Evaluate → Retain) tích hợp thuật toán Spaced Repetition (FSRS), Relational Knowledge Graph trên Supabase và Adaptive Quiz.
        </p>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <Link href="/dashboard" className="btn-primary" style={{ padding: "14px 28px", fontSize: "1rem" }}>
            Khám Phá Dashboard 3 Loops <ArrowRight size={18} />
          </Link>
          <Link href="/knowledge-graph" className="btn-secondary" style={{ padding: "14px 28px", fontSize: "1rem" }}>
            Xem Visual Knowledge Graph
          </Link>
        </div>
      </div>

      {/* 3 Core Loops Showcase Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginTop: "40px" }}>
        {/* Loop 1: Learn */}
        <div className="glass-panel" style={{ padding: "28px" }}>
          <div className="badge badge-indigo" style={{ marginBottom: "16px" }}>VÒNG 1 — LEARN</div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "12px" }}>
            Upload → AI Analysis → Path
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>
            Trích xuất văn bản PDF/URL/YouTube thành Knowledge Graph, kiểm tra môn học tiền đề (DAG Prerequisite) và tự động tạo bài học phù hợp.
          </p>
        </div>

        {/* Loop 2: Evaluate */}
        <div className="glass-panel" style={{ padding: "28px" }}>
          <div className="badge badge-amber" style={{ marginBottom: "16px" }}>VÒNG 2 — EVALUATE</div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "12px" }}>
            Quiz → Semantic Evaluation
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>
            Hệ thống sinh câu hỏi thích ứng (Adaptive Quiz) P(correct | user, topic, difficulty) và chấm điểm thời gian thực.
          </p>
        </div>

        {/* Loop 3: Retain */}
        <div className="glass-panel" style={{ padding: "28px" }}>
          <div className="badge badge-emerald" style={{ marginBottom: "16px" }}>VÒNG 3 — RETAIN</div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "12px" }}>
            FSRS Spaced Repetition Engine
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>
            Dự đoán đường cong quên (Forgetting Curve), tự động lên lịch hẹn ôn tập chính xác đến từng ngày để đảm bảo tỷ lệ ghi nhớ 90%+.
          </p>
        </div>
      </div>
    </div>
  );
}
