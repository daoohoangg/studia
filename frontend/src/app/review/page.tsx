"use client";

import Link from "next/link";
import { RefreshCw, Play, Flame, Award, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function ReviewQueuePage() {
  const reviewItems = [
    {
      topic_id: "topic-3",
      topic_name: "Attention Mechanism",
      mastery_score: 45.0,
      retention_score: 62.0,
      urgency: "High",
      scheduled_for: "Đã đến hạn (2 giờ trước)",
      recommended_action: "Adaptive Review Quiz"
    },
    {
      topic_id: "topic-4",
      topic_name: "Self-Attention Vector Math",
      mastery_score: 70.0,
      retention_score: 78.0,
      urgency: "Medium",
      scheduled_for: "Trong ngày (5 giờ tới)",
      recommended_action: "Quick Review Test"
    },
    {
      topic_id: "topic-1",
      topic_name: "Đại Số Tuyến Tính",
      mastery_score: 85.0,
      retention_score: 95.0,
      urgency: "Low",
      scheduled_for: "Còn 4 ngày nữa",
      recommended_action: "Lịch hẹn bảo vệ kiến thức"
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="badge badge-emerald" style={{ marginBottom: "8px" }}>
            <RefreshCw size={14} /> VÒNG 3 — RETAIN (FSRS ENGINE)
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: "800" }}>Hàng Đợi Ôn Tập Ghi Nhớ Dài Hạn</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Thuật toán FSRS tính toán thời điểm sắp quên để gợi ý bài kiểm tra tối ưu nhất.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: "12px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <ShieldCheck size={28} color="#10b981" />
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>CHỈ SỐ GIỮ LẠI BÌNH QUÂN</div>
            <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#34d399" }}>91.8%</div>
          </div>
        </div>
      </div>

      {/* Review Queue Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {reviewItems.map((item, idx) => {
          const isUrgent = item.urgency === "High";
          const badgeClass = isUrgent ? "badge-rose" : (item.urgency === "Medium" ? "badge-amber" : "badge-emerald");
          const progressColor = isUrgent ? "var(--accent-rose)" : (item.urgency === "Medium" ? "var(--accent-amber)" : "var(--accent-emerald)");

          return (
            <div key={idx} className="glass-panel" style={{ padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>{item.topic_name}</h3>
                  <span className={`badge ${badgeClass}`}>{item.scheduled_for}</span>
                </div>

                <div style={{ display: "flex", gap: "24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  <span>Điểm Mastery: <strong>{item.mastery_score}%</strong></span>
                  <span>Tỷ lệ nhớ hiện tại: <strong>{item.retention_score}%</strong></span>
                </div>

                <div style={{ maxWidth: "400px" }} className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${item.retention_score}%`, background: progressColor }}></div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <Link href={`/quiz/${item.topic_id}`} className="btn-primary">
                  <Play size={16} /> Làm Review Quiz Ngay
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
