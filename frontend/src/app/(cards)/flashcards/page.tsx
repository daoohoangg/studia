"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";

import { API, apiFetch } from "@/lib/api";
import { loadPrefs } from "@/lib/prefs";
import { Volume2, Plus, Check, Mic, ChevronLeft, ChevronRight } from "lucide-react";

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

  useEffect(() => { fetchDue(); }, []);

  const fetchDue = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/flashcards/due?limit=20`);
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
      await apiFetch(`${API}/flashcards/review`, {
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
      const res = await apiFetch(`${API}/speech/guide`, {
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
      const res = await apiFetch(`${API}/speech/evaluate`, {
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

  const ratingCounts = [1, 2, 3, 4].map(r => ({ rating: r, count: results.filter(x => x.rating === r).length }));
  const RATE_UI = [
    { value: 1, label: "Quên", cls: "st-rate-again" },
    { value: 2, label: "Khó", cls: "st-rate-hard" },
    { value: 3, label: "Được", cls: "st-rate-good" },
    { value: 4, label: "Dễ", cls: "st-rate-easy" },
  ];
  const say = (text: string, lang: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const pr = loadPrefs();
    u.lang = lang.startsWith("en") ? pr.voice : lang; u.rate = lang.startsWith("en") ? pr.rate * 0.9 : 0.9;
    window.speechSynthesis.speak(u);
  };

  // Phím tắt: Space lật thẻ, 1–4 đánh giá
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (sessionDone || !cards[currentIdx]) return;
      if (e.key === " ") { e.preventDefault(); setFlipped(f => !f); }
      else if (flipped && !submitting && ["1", "2", "3", "4"].includes(e.key)) handleRate(Number(e.key));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (loading) return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <div className="skeleton" style={{ height: 64 }} />
      <div className="skeleton" style={{ height: 340, borderRadius: "var(--radius-xl)" }} />
    </div>
  );

  const backLines = String(card?.back || "").split("\n");

  return (
    <div className="wrap stagger" style={{ maxWidth: 820 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">Ôn flashcard</h1>
          <p className="page-sub">{cards.length > 0 ? `${cards.length} thẻ đến hạn hôm nay · khoảng ${Math.max(1, Math.round(cards.length / 3))} phút` : "Không có thẻ nào cần ôn"}</p>
        </div>
        <div className="row">
          {cards.length > 0 && <button className="st-btn st-btn-ghost st-btn-sm" type="button" onClick={exportAnki} title="Xuất thẻ ra tệp Anki">Xuất Anki</button>}
          <Link className="st-btn st-btn-secondary st-btn-sm" href="/flashcards/new"><Plus size={16} strokeWidth={2} /> Tạo thẻ</Link>
        </div>
      </header>

      {sessionDone && (
        <section className="st-card st-enter" style={{ padding: "40px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span className="tile tile-success pop-in" style={{ width: 56, height: 56, borderRadius: 28 }} aria-hidden="true"><Check size={28} strokeWidth={2.4} /></span>
          <h2 className="heading-2">Xong phiên ôn hôm nay</h2>
          <p className="ink2">Bạn đã ôn {doneCount} thẻ. Studia sẽ nhắc lại từng thẻ đúng lúc bạn sắp quên.</p>
          <div className="row-wrap" style={{ justifyContent: "center", margin: "8px 0" }}>
            {RATE_UI.map(r => {
              const cnt = ratingCounts.find(x => x.rating === r.value)?.count || 0;
              return cnt > 0 ? <span key={r.value} className={`st-badge ${r.value === 1 ? "st-badge-danger" : r.value === 2 ? "st-badge-accent" : r.value === 3 ? "st-badge-brand" : "st-badge-success"}`}>{r.label}: {cnt}</span> : null;
            })}
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="st-btn st-btn-secondary" href="/">Về trang chính</Link>
            <button className="st-btn st-btn-primary" type="button" onClick={resetSession}>Ôn tiếp</button>
          </div>
        </section>
      )}

      {!sessionDone && cards.length === 0 && (
        <EmptyState
          title="Hôm nay bạn không còn thẻ nào cần ôn"
          description="Thẻ mới sẽ xuất hiện khi đến hạn. Trong lúc chờ, bạn có thể thêm thẻ để lịch ôn có nội dung."
          steps={[
            { title: "Tự tạo một thẻ", desc: "Từ, cụm từ hoặc câu bạn muốn nhớ", href: "/flashcards/new" },
            { title: "Lưu từ vựng khi đọc", desc: "Bôi đen một từ trong bài học để lưu thành thẻ", href: "/vocabulary" },
            { title: "Luyện hội thoại", desc: "Roleplay tự lưu từ mới vào kho từ vựng", href: "/scenarios" },
          ]}
          primary={{ label: "Tạo thẻ mới", href: "/flashcards/new" }}
        />
      )}

      {!sessionDone && cards.length > 0 && card && (
        <>
          <div>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <span className="meta num">Thẻ {currentIdx + 1}/{cards.length}</span>
              <span className="meta num">{doneCount} đã ôn · thành thạo {(card.mastery_score || 0).toFixed(0)}%</span>
            </div>
            <div className="st-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={cards.length} aria-valuenow={doneCount} aria-label="Tiến độ phiên ôn">
              <div className="st-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className={`st-flash${flipped ? " st-flash-flipped" : ""}`} role="button" tabIndex={0} aria-pressed={flipped}
            aria-label={flipped ? "Mặt sau thẻ" : `Thẻ: ${card.front}. Bấm để lật`}
            onClick={handleFlip} onKeyDown={(e) => { if (e.key === "Enter") handleFlip(); }}
            style={{ maxWidth: 640, height: 340, margin: "0 auto" }}>
            <div className="st-flash-inner">
              <div className="st-flash-face">
                {card.topic_name && <span className="st-flash-tag"><span className="st-badge st-badge-brand">{card.topic_name}</span></span>}
                <div className="st-flash-word" style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>{card.front}</div>
                <div className="st-flash-ipa">
                  <button type="button" className="st-flash-say" aria-label="Nghe phát âm" onClick={(e) => { e.stopPropagation(); say(card.front, "en-GB"); }}><Volume2 size={16} strokeWidth={1.75} /></button>
                </div>
                <div className="st-flash-hint">Nhấn <kbd>Space</kbd> để lật</div>
              </div>
              <div className="st-flash-face st-flash-back">
                <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
                  <span className="st-flash-pos">Mặt sau</span>
                  <button type="button" className="st-flash-say" aria-label="Nghe mặt sau" onClick={(e) => { e.stopPropagation(); say(card.back, "vi-VN"); }}><Volume2 size={16} strokeWidth={1.75} /></button>
                </div>
                <div className="st-flash-meaning">{backLines[0]}</div>
                {backLines.slice(1).filter(Boolean).length > 0 && <div className="st-flash-example">{backLines.slice(1).filter(Boolean).join(" ")}</div>}
              </div>
            </div>
          </div>

          {flipped ? (
            <div className="st-enter stack" style={{ gap: 8 }}>
              <p className="meta" style={{ textAlign: "center" }}>Bạn nhớ từ này thế nào?</p>
              <div className="st-rate" role="group" aria-label="Bạn nhớ từ này thế nào?" style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
                {RATE_UI.map(r => (
                  <button key={r.value} type="button" className={`st-rate-btn ${r.cls}`} onClick={() => handleRate(r.value)} disabled={submitting}>
                    <span className="st-rate-label">{r.label}</span>
                    <span className="st-rate-key">{r.value}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="meta" style={{ textAlign: "center" }}>Tự nhớ nghĩa trước, rồi lật thẻ để kiểm tra. Đánh giá thật lòng giúp lịch ôn chính xác hơn.</p>
          )}

          {flipped && (
            <section className="st-card" aria-labelledby="sp-h">
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                <div className="row" style={{ gap: 12 }}>
                  <span className="tile" aria-hidden="true"><Mic size={20} strokeWidth={1.75} /></span>
                  <div><h2 id="sp-h" className="title" style={{ fontSize: 16 }}>Luyện đọc theo mẫu</h2><p className="meta">Đọc to mặt sau rồi dán lời bạn đọc để chấm.</p></div>
                </div>
                <button className="st-btn st-btn-ghost st-btn-sm" type="button" onClick={handleShadowingGuide}>Hướng dẫn nhịp đọc</button>
              </div>
              {shadowingGuide && <p className="meta" style={{ marginTop: 10 }}>Tốc độ {shadowingGuide.speed}x · {shadowingGuide.total_words} từ · khoảng {shadowingGuide.estimated_duration_sec} giây</p>}
              <div className="row" style={{ marginTop: 12 }}>
                <label style={{ flex: 1 }}><span className="st-sr">Lời bạn đọc</span>
                  <input className="input" value={userSpeechInput} onChange={(e) => setUserSpeechInput(e.target.value)} placeholder="Nhập hoặc dán lời bạn vừa đọc…" />
                </label>
                <button className="st-btn st-btn-secondary" type="button" onClick={evaluateSpeech} disabled={!userSpeechInput.trim()}>Chấm điểm</button>
              </div>
              {evalResult && (
                <div className="st-enter" style={{ marginTop: 12, padding: "12px 14px", borderRadius: "var(--radius-sm)", background: "var(--brand-tint)" }}>
                  <b className="num" style={{ color: "var(--brand)" }}>Chính xác {evalResult.accuracy_percent}% · {evalResult.score}/10</b>
                  <p className="ink2" style={{ marginTop: 4 }}>{evalResult.feedback}</p>
                </div>
              )}
            </section>
          )}

          <div className="row" style={{ justifyContent: "space-between" }}>
            <button className="st-btn st-btn-ghost st-btn-sm" type="button" onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setFlipped(false); }} disabled={currentIdx === 0}><ChevronLeft size={16} strokeWidth={2} /> Thẻ trước</button>
            <button className="st-btn st-btn-ghost st-btn-sm" type="button" onClick={() => { setCurrentIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }} disabled={currentIdx === cards.length - 1}>Bỏ qua thẻ này <ChevronRight size={16} strokeWidth={2} /></button>
          </div>
        </>
      )}
    </div>
  );
}
