"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePlus, Sparkles, CheckCircle2, Loader2, Layers, BookOpen, Plus } from "lucide-react";

const API = "http://localhost:8000/api/v1";

interface CreatedCardSummary {
  id: string;
  front: string;
  back: string;
  topic_name: string;
  card_type: string;
}

export default function FlashcardNewPage() {
  const router = useRouter();

  const [deckName, setDeckName] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [cardType, setCardType] = useState("concept");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [createdSessionCards, setCreatedSessionCards] = useState<CreatedCardSummary[]>([]);

  const submitCard = async (redirectAfter: boolean) => {
    if (!front.trim() || !back.trim()) {
      setMsg({ type: "error", text: "Vui lòng nhập đầy đủ cả Mặt trước và Mặt sau của thẻ." });
      return;
    }

    setLoading(true);
    setMsg(null);

    const finalDeck = deckName.trim() || "Bộ thẻ tùy chỉnh";

    try {
      const res = await fetch(`${API}/flashcards/custom-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: front.trim(),
          back: back.trim(),
          topic_name: finalDeck,
          card_type: cardType,
          source_chunk: "Tự tạo bởi người dùng"
        })
      });

      const data = await res.json();

      if (res.ok && data.flashcard) {
        const newCard: CreatedCardSummary = {
          id: data.flashcard.id,
          front: data.flashcard.front,
          back: data.flashcard.back,
          topic_name: data.flashcard.topic_name || finalDeck,
          card_type: data.flashcard.card_type || cardType
        };

        setCreatedSessionCards(prev => [newCard, ...prev]);
        setFront("");
        setBack("");
        setMsg({ type: "success", text: `🚀 Đã lưu thẻ thành công vào bộ "${newCard.topic_name}"!` });

        if (redirectAfter) {
          setTimeout(() => {
            router.push("/flashcards");
          }, 800);
        }
      } else {
        setMsg({ type: "error", text: data.detail || "Không thể tạo thẻ flashcard. Vui lòng thử lại." });
      }
    } catch {
      setMsg({ type: "error", text: "Không thể kết nối đến máy chủ Backend (FastAPI)." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "840px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header / Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/flashcards" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <ArrowLeft size={18} />
          Quay lại Ôn tập Flashcards
        </Link>
        <span className="badge badge-indigo">
          🃏 FSRS Spaced Repetition Ready
        </span>
      </div>

      {/* Main Form Panel */}
      <div className="glass-panel fade-in-up" style={{ padding: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{
            width: "42px", height: "42px", borderRadius: "14px",
            background: "var(--gradient-main)", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(99, 102, 241, 0.3)"
          }}>
            <FilePlus size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "800", fontFamily: "Outfit, sans-serif" }}>
              Tự Tạo Thẻ Flashcard Mới
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Tạo thẻ thủ công với đầy đủ thông tin để đưa thẳng vào thuật toán giãn cách FSRS
            </p>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "24px 0" }} />

        <form onSubmit={(e) => { e.preventDefault(); submitCard(false); }} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Deck Name */}
          <div>
            <label className="label-text" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={16} color="var(--accent-indigo)" />
              Bộ Thẻ / Chủ Đề (Deck Name)
            </label>
            <input
              type="text"
              className="input-field"
              value={deckName}
              onChange={e => setDeckName(e.target.value)}
              placeholder="Ví dụ: Từ vựng IELTS Band 8, Lập trình Python, Khái niệm AI..."
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              Nếu để trống, hệ thống sẽ tự đặt tên bộ thẻ là &quot;Bộ thẻ tùy chỉnh&quot;.
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Card Type */}
            <div>
              <label className="label-text" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <BookOpen size={16} color="var(--accent-purple)" />
                Loại Thẻ (Card Type)
              </label>
              <select
                className="input-field"
                value={cardType}
                onChange={e => setCardType(e.target.value)}
              >
                <option value="concept">Khái niệm (Concept)</option>
                <option value="definition">Định nghĩa từ vựng (Definition)</option>
                <option value="question">Câu hỏi &amp; Đáp án (Question)</option>
                <option value="fill_blank">Điền vào chỗ trống (Fill in Blank)</option>
              </select>
            </div>

            {/* Source indication */}
            <div>
              <label className="label-text" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={16} color="var(--accent-cyan)" />
                Nguồn Dữ Liệu (Source)
              </label>
              <input
                type="text"
                className="input-field"
                value="Tự tạo bởi người dùng (Manual User Card)"
                disabled
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </div>
          </div>

          {/* Front */}
          <div>
            <label className="label-text" style={{ fontWeight: 600 }}>
              Mặt Trước (Front / Câu hỏi / Từ vựng) <span style={{ color: "#f43f5e" }}>*</span>
            </label>
            <input
              type="text"
              className="input-field"
              value={front}
              onChange={e => setFront(e.target.value)}
              placeholder="Ví dụ: Resilient (adj) hoặc 'Thuật toán FSRS là gì?'"
              required
            />
          </div>

          {/* Back */}
          <div>
            <label className="label-text" style={{ fontWeight: 600 }}>
              Mặt Sau (Back / Giải nghĩa / Đáp án / Ví dụ) <span style={{ color: "#f43f5e" }}>*</span>
            </label>
            <textarea
              className="input-field"
              rows={5}
              value={back}
              onChange={e => setBack(e.target.value)}
              placeholder="Ví dụ: Kiên cường, khả năng phục hồi nhanh sau khó khăn. Example: He is a resilient person who learns from failure."
              style={{ resize: "vertical" }}
              required
            />
          </div>

          {/* Message banner */}
          {msg && (
            <div style={{
              padding: "14px 18px", borderRadius: "14px",
              background: msg.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)",
              border: `1px solid ${msg.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
              color: msg.type === "success" ? "#34d399" : "#fb7185",
              fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px"
            }}>
              {msg.type === "success" && <CheckCircle2 size={18} />}
              {msg.text}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading}
              onClick={() => submitCard(true)}
              style={{ flex: 1, justifyContent: "center", padding: "12px 20px" }}
            >
              {loading ? <Loader2 size={18} className="spin" /> : "Lưu & Quay lại Ôn tập"}
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ flex: 1, justifyContent: "center", padding: "12px 20px" }}
            >
              {loading ? (
                <><Loader2 size={18} className="spin" /> Đang tạo...</>
              ) : (
                <><Plus size={18} /> Lưu &amp; Tạo Tiếp Thẻ Khác</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Session Created Cards List */}
      {createdSessionCards.length > 0 && (
        <div className="glass-panel fade-in-up" style={{ padding: "28px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} color="#34d399" />
            Các thẻ vừa tạo trong phiên làm việc này ({createdSessionCards.length})
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {createdSessionCards.map((c, idx) => (
              <div
                key={c.id || idx}
                style={{
                  padding: "14px 18px", borderRadius: "12px",
                  background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    {c.front}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {c.back}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="badge badge-purple" style={{ fontSize: "0.72rem" }}>
                    {c.topic_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
