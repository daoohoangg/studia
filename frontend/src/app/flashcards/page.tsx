"use client";

import { useState, useEffect } from "react";
import { RotateCcw, ChevronLeft, ChevronRight, CheckCircle2, Loader2, Sparkles, Download, Volume2, Mic, Plus, X, FilePlus } from "lucide-react";

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

  // Speech & Shadowing State
  const [speaking, setSpeaking] = useState(false);
  const [shadowingGuide, setShadowingGuide] = useState<any>(null);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [userSpeechInput, setUserSpeechInput] = useState("");

  // Custom Flashcard Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customDeckName, setCustomDeckName] = useState("");
  const [customFront, setCustomFront] = useState("");
  const [customBack, setCustomBack] = useState("");
  const [customCardType, setCustomCardType] = useState("concept");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    setEvalResult(null);

    setTimeout(() => {
      if (currentIdx + 1 >= cards.length) {
        setSessionDone(true);
      } else {
        setCurrentIdx(i => i + 1);
      }
    }, 150);
  };

  const playTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.lang = "vi-VN";
      setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleShadowingGuide = async () => {
    const card = cards[currentIdx];
    if (!card) return;
    try {
      const res = await fetch(`${API}/speech/guide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: card.back || card.front, speed: 1.0 })
      });
      if (res.ok) {
        const data = await res.json();
        setShadowingGuide(data);
      }
    } catch {}
  };

  const evaluateSpeech = async () => {
    const card = cards[currentIdx];
    if (!card || !userSpeechInput.trim()) return;

    try {
      const res = await fetch(`${API}/speech/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_text: card.back || card.front,
          user_spoken_text: userSpeechInput
        })
      });
      if (res.ok) {
        const data = await res.json();
        setEvalResult(data);
      }
    } catch {}
  };

  const handleCreateCustomFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFront.trim() || !customBack.trim()) return;

    setCreating(true);
    setCreateMsg(null);
    try {
      const res = await fetch(`${API}/flashcards/custom-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: customFront,
          back: customBack,
          topic_name: customDeckName.trim() || "Bộ thẻ tùy chỉnh",
          card_type: customCardType,
          source_chunk: "Tự tạo bởi người dùng"
        })
      });
      const data = await res.json();
      if (res.ok && data.flashcard) {
        setCards(prev => [...prev, data.flashcard]);
        setCustomFront("");
        setCustomBack("");
        setCreateMsg({ type: "success", text: `🚀 Đã tạo thẻ thành công cho bộ "${data.flashcard.topic_name}"!` });
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateMsg(null);
        }, 1500);
      } else {
        setCreateMsg({ type: "error", text: data.detail || "Không thể tạo thẻ. Vui lòng thử lại." });
      }
    } catch {
      setCreateMsg({ type: "error", text: "Lỗi kết nối tới server backend." });
    } finally {
      setCreating(false);
    }
  };

  const exportAnki = async () => {
    const card = cards[currentIdx];
    const topicId = card?.topic_id || "all";
    window.open(`${API}/export/flashcards/anki/${topicId}`, "_blank");
  };

  const resetSession = () => {
    setCurrentIdx(0); setFlipped(false); setDoneCount(0);
    setSessionDone(false); setResults([]); setEvalResult(null);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Tự Tạo Thẻ Flashcard
          </button>
          {cards.length > 0 && (
            <button className="btn-secondary" onClick={exportAnki} title="Xuất thẻ ra tệp Anki CSV/TSV">
              <Download size={16} /> Export Anki (.apkg)
            </button>
          )}
        </div>
      </div>

      {/* Custom Flashcard Creation Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div className="glass-panel fade-in-up" style={{ width: "100%", maxWidth: "560px", padding: "32px", position: "relative" }}>
            <button onClick={() => { setShowCreateModal(false); setCreateMsg(null); }}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "6px", fontFamily: "Outfit, sans-serif", display: "flex", alignItems: "center", gap: "8px" }}>
              <FilePlus size={22} color="var(--accent-indigo)" />
              Tự Tạo Thẻ Flashcard Mới
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "20px" }}>
              Tự nhập từ vựng, định nghĩa hoặc câu hỏi riêng của bạn để đưa vào thuật toán ôn tập FSRS
            </p>

            <form onSubmit={handleCreateCustomFlashcard} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="label-text">Tên Bộ thẻ / Chủ đề (Deck Name)</label>
                <input
                  className="input-field"
                  value={customDeckName}
                  onChange={e => setCustomDeckName(e.target.value)}
                  placeholder="Ví dụ: Từ vựng IELTS Band 8, Lập trình Python, Từ vựng Tiếng Anh..."
                />
              </div>

              <div>
                <label className="label-text">Mặt trước (Front / Câu hỏi / Từ vựng)</label>
                <input
                  className="input-field"
                  value={customFront}
                  onChange={e => setCustomFront(e.target.value)}
                  placeholder="Ví dụ: Resilient (adj) hoặc 'Khái niệm RAG là gì?'"
                  required
                />
              </div>

              <div>
                <label className="label-text">Mặt sau (Back / Giải nghĩa / Đáp án / Ví dụ)</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={customBack}
                  onChange={e => setCustomBack(e.target.value)}
                  placeholder="Ví dụ: Kiên cường, có khả năng phục hồi nhanh. Example: She is a resilient person."
                  style={{ resize: "vertical" }}
                  required
                />
              </div>

              <div>
                <label className="label-text">Loại thẻ (Card Type)</label>
                <select
                  className="input-field"
                  value={customCardType}
                  onChange={e => setCustomCardType(e.target.value)}
                >
                  <option value="concept">Khái niệm (Concept)</option>
                  <option value="definition">Định nghĩa từ vựng (Definition)</option>
                  <option value="question">Câu hỏi & Đáp án (Question)</option>
                  <option value="fill_blank">Điền vào chỗ trống (Fill in Blank)</option>
                </select>
              </div>

              {createMsg && (
                <div style={{
                  padding: "12px 16px", borderRadius: "12px",
                  background: createMsg.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)",
                  border: `1px solid ${createMsg.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
                  color: createMsg.type === "success" ? "#34d399" : "#fb7185",
                  fontSize: "0.875rem",
                }}>
                  {createMsg.text}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn-secondary" onClick={() => { setShowCreateModal(false); setCreateMsg(null); }} style={{ flex: 1, justifyContent: "center" }}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={creating} style={{ flex: 2, justifyContent: "center" }}>
                  {creating ? <><Loader2 size={18} className="spin" /> Đang tạo...</> : <><Plus size={18} /> Lưu Thẻ Flashcard</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <button
                  onClick={(e) => { e.stopPropagation(); playTTS(card.front); }}
                  style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", cursor: "pointer", color: "var(--accent-indigo)" }}
                >
                  <Volume2 size={20} />
                </button>
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
                <button
                  onClick={(e) => { e.stopPropagation(); playTTS(card.back); }}
                  style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", cursor: "pointer", color: "var(--accent-emerald)" }}
                >
                  <Volume2 size={20} />
                </button>
                <p style={{ textAlign: "center", fontSize: "1.05rem", lineHeight: "1.65", color: "var(--text-primary)" }}>
                  {card.back}
                </p>
              </div>
            </div>
          </div>

          {/* Speech Shadowing Widget */}
          {flipped && (
            <div className="glass-panel" style={{ padding: "16px", borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-indigo)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Mic size={14} /> Kỹ thuật Speech Shadowing (Luyện đọc)
                </span>
                <button className="btn-ghost" onClick={handleShadowingGuide} style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
                  Tạo hướng dẫn đọc
                </button>
              </div>

              {shadowingGuide && (
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 10 }}>
                  Tốc độ chuẩn: {shadowingGuide.speed}x | Tổng từ: {shadowingGuide.total_words} từ ({shadowingGuide.estimated_duration_sec}s)
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={userSpeechInput}
                  onChange={e => setUserSpeechInput(e.target.value)}
                  placeholder="Thực hành đọc lại hoặc nhập transcript giọng đọc..."
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", fontSize: "0.82rem", color: "var(--text-primary)" }}
                />
                <button className="btn-primary" onClick={evaluateSpeech} style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
                  Chấm điểm STT
                </button>
              </div>

              {evalResult && (
                <div style={{ marginTop: 10, background: "rgba(99,102,241,0.08)", padding: 10, borderRadius: 8, fontSize: "0.82rem" }}>
                  <div style={{ fontWeight: 700, color: "var(--accent-indigo)" }}>
                    Chính xác: {evalResult.accuracy_percent}% ({evalResult.score}/10)
                  </div>
                  <div>{evalResult.feedback}</div>
                </div>
              )}
            </div>
          )}

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
