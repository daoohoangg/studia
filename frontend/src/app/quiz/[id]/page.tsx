"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Sparkles, RefreshCw, ArrowRight, Award, Clock } from "lucide-react";

export default function QuizPage({ params }: { params: { id: string } }) {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(3); // 1-4
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  const mockQuestion = {
    id: "q-101",
    question_text: "[Medium] Trong công thức Self-Attention, mục đích của việc chia cho căn bậc hai của d_k (sqrt(d_k)) là gì?",
    difficulty: 3,
    options: [
      { id: "A", text: "Tránh hiện tượng Dot-Product quá lớn dẫn đến Softmax bị bão hòa gradient." },
      { id: "B", text: "Tăng độ phức tạp tính toán để mô hình học chính xác hơn." },
      { id: "C", text: "Giảm kích thước vector embedding xuống một nửa." },
      { id: "D", text: "Chuyển đổi matrix thành số phức." }
    ],
    correct_answer: "A",
    explanation: "Khi d_k lớn, tích vô hướng Q*K^T tăng rất nhanh, đẩy hàm Softmax vào vùng gradient cực nhỏ (vanishing gradient). Chia cho sqrt(d_k) giúp giữ gradient ổn định."
  };

  const handleSubmit = async () => {
    if (!selectedOption) return;
    
    try {
      const res = await fetch("http://localhost:8000/api/v1/quizzes/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: params.id,
          question: mockQuestion,
          user_answer: selectedOption,
          response_time_ms: 4500,
          confidence_rating: confidence,
          current_mastery: 45.0,
          current_stability: 1.2,
          current_difficulty: 4.5
        })
      });
      const data = await res.json();
      setEvalResult(data);
    } catch (e) {
      // Simulation fallback if backend port offline during UI preview
      const isCorrect = selectedOption === "A";
      setEvalResult({
        evaluation: {
          is_correct: isCorrect,
          user_answer: selectedOption,
          correct_answer: "A",
          feedback: isCorrect ? "Chính xác! Bạn đã nắm rất tốt khái niệm này." : "Chưa chính xác.",
          explanation: mockQuestion.explanation
        },
        updated_knowledge_state: {
          mastery_score: isCorrect ? 60.0 : 35.0,
          retention_score: 0.94,
          stability: isCorrect ? 2.4 : 0.48,
          difficulty_rating: 4.0,
          interval_days: isCorrect ? 2.5 : 0.25,
          next_review_at: new Date(Date.now() + (isCorrect ? 2.5 : 0.25) * 86400000).toISOString()
        }
      });
    } finally {
      setIsSubmitted(true);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="badge badge-amber" style={{ marginBottom: "6px" }}>
            VÒNG 2 — EVALUATE
          </span>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "800" }}>Adaptive Quiz Evaluation</h1>
        </div>
        <div className="badge badge-indigo">Độ khó: 3/5 (Medium)</div>
      </div>

      {!isSubmitted ? (
        <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", lineHeight: "1.5" }}>
            {mockQuestion.question_text}
          </h3>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {mockQuestion.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedOption(opt.id)}
                  style={{
                    padding: "16px 20px", borderRadius: "12px",
                    background: isSelected ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.03)",
                    border: isSelected ? "2px solid var(--accent-indigo)" : "1px solid var(--border-subtle)",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "14px",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div
                    style={{
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: isSelected ? "var(--accent-indigo)" : "rgba(255,255,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: "0.85rem"
                    }}
                  >
                    {opt.id}
                  </div>
                  <span style={{ fontSize: "0.95rem", color: "#f8fafc" }}>{opt.text}</span>
                </div>
              );
            })}
          </div>

          {/* Confidence rating slider */}
          <div style={{ paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 600 }}>
              Độ tự tin của bạn với câu trả lời này:
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              {[
                { val: 1, label: "1 - Phỏng đoán" },
                { val: 2, label: "2 - Phân vân" },
                { val: 3, label: "3 - Gần như chắc" },
                { val: 4, label: "4 - Rất tự tin" }
              ].map((c) => (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => setConfidence(c.val)}
                  className={confidence === c.val ? "btn-primary" : "btn-secondary"}
                  style={{ flex: 1, padding: "8px", fontSize: "0.75rem" }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={!selectedOption}
            style={{ width: "100%", justifyContent: "center", padding: "14px", marginTop: "8px" }}
          >
            Nộp Bài & Cập Nhật Knowledge State
          </button>
        </div>
      ) : (
        /* Evaluation Results Card */
        <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {evalResult?.evaluation?.is_correct ? (
              <CheckCircle2 color="#10b981" size={36} />
            ) : (
              <XCircle color="#f43f5e" size={36} />
            )}
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "800" }}>
                {evalResult?.evaluation?.is_correct ? "Trả Lời Chính Xác!" : "Chưa Chính Xác!"}
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                {evalResult?.evaluation?.feedback}
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--accent-cyan)", marginBottom: "6px" }}>Giải Thích Chi Tiết AI:</h4>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              {evalResult?.evaluation?.explanation}
            </p>
          </div>

          {/* FSRS State Update Banner */}
          <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
            <h4 style={{ fontSize: "0.95rem", color: "#818cf8", fontWeight: 700, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <RefreshCw size={16} /> Cập Nhật Trạng Thái Ôn Tập (FSRS Spaced Repetition Engine)
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", textAnchor: "middle" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Mastery Score Mới:</span>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#34d399" }}>
                  {evalResult?.updated_knowledge_state?.mastery_score}%
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Interval Lịch Hẹn:</span>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#38bdf8" }}>
                  +{evalResult?.updated_knowledge_state?.interval_days} ngày
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Độ Ổn Định (Stability):</span>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fbbf24" }}>
                  {evalResult?.updated_knowledge_state?.stability} S
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Link href="/dashboard" className="btn-secondary">
              Quay lại Dashboard
            </Link>
            <Link href="/review" className="btn-primary">
              Xem Lịch Ôn Tập Spaced Repetition <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
