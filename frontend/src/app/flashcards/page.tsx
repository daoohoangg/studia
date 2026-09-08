"use client";

import { useState, useEffect } from "react";
import { RotateCcw, ChevronLeft, ChevronRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";

const API = "http://localhost:8000/api/v1";

const RATINGS = [
  { value: 1, label: "Again", sub: "Sai / Quên", cls: "fsrs-again" },
  { value: 2, label: "Hard",  sub: "Khó",        cls: "fsrs-hard"  },
  { value: 3, label: "Good",  sub: "Nhớ được",   cls: "fsrs-good"  },
  { value: 4, label: "Easy",  sub: "Dễ dàng",    cls: "fsrs-easy"  },
];

export default function FlashcardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [results, setResults] = useState<{ rating: number; front: string }[]>([]);

  useEffect(() => { fetchDue(); }, []);

  const fetchDue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/flashcards/due?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setCards(data.flashcards || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleFlip = () => setFlipped(f => !f);

  const handleRate = async (rating: number) => {
    const card = cards[currentIdx];
    if (!card) return;

    setSubmitting(true);
    setResults(r => [...r, { rating, front: card.front }]);

    try {
      await fetch(`${API}/flashcards/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcard_id: card.flashcard_id || card.id, rating })
      });
    } catch { /* ignore */ }

    setDoneCount(d => d + 1);
    setFlipped(false);
    setSubmitting(false);

    setTimeout(() => {
      if (currentIdx + 1 >= cards.length) {
        setSessionDone(true);
      } else {
        setCurrentIdx(i => i + 1);
      }
    }, 150);
  };

  const resetSession = () => {
    setCurrentIdx(0); setFlipped(false); setDoneCount(0);
    setSessionDone(false); setResults([]);
    fetchDue();
  };

  const card = cards[currentIdx];
  const progress = cards.length > 0 ? (doneCount / cards.length) * 100 : 0;

  const ratingCounts = [1, 2, 3, 4].map(r => ({
    rating: r, count: results.filter(x => x.rating === r).length
  }));

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "700px", margin: "0 auto" }}>
      <div className="skeleton" style={{ height: 60, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 360, borderRadius: 24 }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "700px", margin: "0 auto" }}>
      {/* Header */}
      <div>
        <span className="badge badge-purple" style={{ marginBottom: "10px" }}>
          🃏 Flashcards — FSRS Spaced Repetition
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: "800", fontFamily: "Outfit, sans-serif" }}>
          Ôn Tập Flashcard
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
          {cards.length > 0 ? `${cards.length} thẻ đến hạn ôn tập hôm nay` : "Không có thẻ nào cần ôn tập"}
        </p>
      </div>

      {/* Session Done */}
      {sessionDone && (
        <div className="glass-panel fade-in-up" style={{ padding: "48px 40px", textAlign: "center" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🎉</div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "800", marginBottom: "8px", fontFamily: "Outfit, sans-serif" }}>
            Hoàn thành phiên ôn tập!
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            Bạn đã ôn {doneCount} thẻ trong phiên này
          </p>

          {/* Result breakdown */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "28px" }}>
            {RATINGS.map(r => {
              const cnt = ratingCounts.find(x => x.rating === r.value)?.count || 0;
              return cnt > 0 ? (
                <div key={r.value} className={`fsrs-btn ${r.cls}`} style={{ flex: "none", padding: "12px 18px" }}>
                  <span style={{ fontSize: "1.2rem", fontWeight: "800" }}>{cnt}</span>
                  <span style={{ fontSize: "0.75rem" }}>{r.label}</span>
                </div>
              ) : null;
            })}
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button className="btn-primary" onClick={resetSession}>
              <RotateCcw size={16} /> Ôn tiếp
            </button>
            <a href="/" className="btn-secondary">Về trang chính</a>
          </div>
        </div>
      )}

      {/* No Cards */}
      {!sessionDone && cards.length === 0 && (
        <div className="glass-panel" style={{ padding: "64px", textAlign: "center" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>✅</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "8px" }}>Tuyệt vời!</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            Không có thẻ nào cần ôn tập hôm nay. Hãy quay lại sau!
          </p>
          <a href="/books" className="btn-secondary">
            <Sparkles size={16} /> Tạo flashcard mới từ sách
          </a>
        </div>
      )}

      {/* Active Session */}
      {!sessionDone && cards.length > 0 && card && (
        <>
          {/* Progress */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              <span>{currentIdx + 1} / {cards.length}</span>
              <span>{doneCount} hoàn thành</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Flip Card */}
          <div
            className={`flip-card-container${flipped ? " flipped" : ""}`}
            style={{ height: "340px" }}
            onClick={!flipped ? handleFlip : undefined}
          >
            <div className="flip-card-inner">
              {/* Front */}
              <div className="flip-card-front">
                <div style={{ position: "absolute", top: "20px", left: "20px" }}>
                  <span className="badge badge-indigo">Front</span>
                </div>
                <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: "16px", marginTop: "24px" }}>
                  Click để xem đáp án
                </p>
                <p style={{
                  textAlign: "center", fontWeight: "700", fontSize: "1.35rem",
                  lineHeight: "1.5", color: "var(--text-primary)", fontFamily: "Outfit, sans-serif"
                }}>
                  {card.front}
                </p>
              </div>

              {/* Back */}
              <div className="flip-card-back">
                <div style={{ position: "absolute", top: "20px", left: "20px" }}>
                  <span className="badge badge-emerald">Back</span>
                </div>
                <p style={{ textAlign: "center", fontSize: "1.05rem", lineHeight: "1.65", color: "var(--text-primary)" }}>
                  {card.back}
                </p>
              </div>
            </div>
          </div>

          {/* Hint when not flipped */}
          {!flipped && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              👆 Click thẻ để xem đáp án
            </div>
          )}

          {/* FSRS Rating Buttons */}
          {flipped && (
            <div className="glass-panel fade-in-up" style={{ padding: "20px" }}>
              <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "14px", fontWeight: 600 }}>
                Bạn nhớ tốt đến đâu?
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                {RATINGS.map(r => (
                  <button
                    key={r.value}
                    className={`fsrs-btn ${r.cls}`}
                    onClick={() => handleRate(r.value)}
                    disabled={submitting}
                  >
                    <span style={{ fontSize: "1.1rem", fontWeight: "800" }}>{r.label}</span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>{r.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button className="btn-ghost" onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setFlipped(false); }}
              disabled={currentIdx === 0}>
              <ChevronLeft size={16} /> Trước
            </button>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Mastery: {(card.mastery_score || 0).toFixed(0)}%
            </span>
            <button className="btn-ghost" onClick={() => { setCurrentIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
              disabled={currentIdx === cards.length - 1}>
              Sau <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
