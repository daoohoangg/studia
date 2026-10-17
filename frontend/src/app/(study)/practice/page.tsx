"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import { API, apiFetch } from "@/lib/api";

type Card = { id: string; front: string; back: string; topic_id?: string };
type Opt = { id: string; text: string };
type Q = { question_text: string; options: Opt[]; correct: string; explanation?: string; topic_name: string };
type Item = { kind: "card"; card: Card } | { kind: "q"; q: Q };

const LETTERS = "ABCDEFGH";
const norm = (s: string) => s.trim().toLowerCase();

function toQuestion(raw: any, topic_name: string): Q | null {
  const opts: Opt[] = (raw.options || []).map((o: any, i: number) =>
    typeof o === "string" ? { id: LETTERS[i], text: o } : { id: o.id || LETTERS[i], text: o.text });
  const ans = String(raw.correct_answer || "");
  if (opts.length < 2 || !ans) return null;
  const hit = opts.find((o) => norm(o.id) === norm(ans) || norm(o.text) === norm(ans));
  return hit ? { question_text: raw.question_text, options: opts, correct: hit.id, explanation: raw.explanation, topic_name } : null;
}

export default function PracticePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);

  useEffect(() => {
    (async () => {
      const cards: Card[] = [];
      const qs: Q[] = [];
      const notes: string[] = [];
      try {
        const r = await apiFetch(`${API}/flashcards/due?limit=6`);
        if (r.ok) ((await r.json()).flashcards || []).forEach((c: any) => cards.push({ id: c.id || c.flashcard_id, front: c.front, back: c.back, topic_id: c.topic_id }));
      } catch {}
      try {
        const w = await apiFetch(`${API}/quizzes/weak-topics`);
        const topic = w.ok ? ((await w.json()).weak_topics || [])[0] : null;
        if (topic) {
          const g = await apiFetch(`${API}/quizzes/generate-multi`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic_id: topic.topic_id, topic_name: topic.topic_name, user_mastery: topic.mastery_score || 30, question_count: 6, exercise_types: ["multiple_choice", "true_false"] }),
          });
          if (g.ok) ((await g.json()).questions || []).forEach((q: any) => { const x = toQuestion(q, topic.topic_name); if (x) qs.push(x); });
          else notes.push("AI chưa tạo được câu hỏi lúc này, buổi luyện chỉ có thẻ ôn.");
        }
      } catch {}
      // Xen kẽ thẻ và câu hỏi
      const mixed: Item[] = [];
      for (let k = 0; k < Math.max(cards.length, qs.length); k++) {
        if (cards[k]) mixed.push({ kind: "card", card: cards[k] });
        if (qs[k]) mixed.push({ kind: "q", q: qs[k] });
      }
      setItems(mixed);
      setNote(notes.join(" "));
      setLoading(false);
    })();
  }, []);

  const cur = items[i];
  const finished = !loading && items.length > 0 && i >= items.length;
  const next = () => { setI((x) => x + 1); setFlipped(false); setPicked(null); };

  const rate = async (rating: number) => {
    if (cur?.kind === "card") {
      apiFetch(`${API}/flashcards/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcard_id: cur.card.id, rating, response_time_ms: 5000 }),
      }).catch(() => {});
      setAnswered((n) => n + 1);
      if (rating >= 3) setCorrect((n) => n + 1);
    }
    next();
  };

  const choose = (id: string) => {
    if (picked || cur?.kind !== "q") return;
    setPicked(id);
    setAnswered((n) => n + 1);
    if (id === cur.q.correct) setCorrect((n) => n + 1);
  };

  const segs = useMemo(() => items.map((it, n) => ({ kind: it.kind, state: n < i ? "d" : n === i ? "cur" : "" })), [items, i]);

  if (loading) return <div className="wrap"><div className="skeleton" style={{ height: 360 }} /></div>;
  if (items.length === 0) {
    return (
      <div className="wrap">
        <EmptyState title="Chưa có gì để luyện lúc này"
          description="Cần có flashcard đến hạn hoặc chủ đề đang yếu. Học một bài trong sách để Studia có dữ liệu."
          primary={{ label: "Mở thư viện", href: "/books" }} secondary={{ label: "Về trang chính", href: "/" }} />
      </div>
    );
  }
  if (finished) {
    return (
      <div className="wrap-narrow st-enter" style={{ textAlign: "center", paddingTop: 48 }}>
        <div className="eyebrow" style={{ color: "var(--ink-muted)" }}>Xong buổi luyện</div>
        <h1 className="page-title" style={{ marginTop: 6 }}>{correct}/{answered} câu nhớ tốt</h1>
        <p className="page-sub">Xen kẽ thẻ và câu hỏi giúp nhớ lâu hơn học từng khối riêng.</p>
        <div className="row" style={{ gap: 8, justifyContent: "center", marginTop: 20 }}>
          <Link className="st-btn st-btn-primary" href="/">Về trang chính</Link>
          <button className="st-btn st-btn-secondary" type="button" onClick={() => location.reload()}>Luyện thêm</button>
        </div>
      </div>
    );
  }

  const segColor = (k: string, st: string) =>
    st === "d" || st === "cur" ? (k === "card" ? "var(--brand)" : "var(--accent)") :
      `color-mix(in srgb, ${k === "card" ? "var(--brand)" : "var(--accent)"} 30%, var(--surface-sunken))`;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--canvas)" }}>
      <header style={{ height: 64, display: "flex", alignItems: "center", gap: 16, padding: "0 24px", background: "var(--surface)", borderBottom: "1px solid var(--hairline)" }}>
        <Link className="icon-btn" href="/" aria-label="Thoát buổi luyện">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </Link>
        <b style={{ font: "650 15px/20px var(--font-sans)", whiteSpace: "nowrap" }}>Luyện nhanh</b>
        <div role="progressbar" aria-label="Tiến độ buổi luyện" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={i} style={{ display: "flex", gap: 4, flex: 1 }}>
          {segs.map((s, n) => <i key={n} style={{ flex: 1, height: 8, borderRadius: 4, background: segColor(s.kind, s.state), outline: s.state === "cur" ? "2px solid var(--ink)" : undefined, outlineOffset: 2 }} />)}
        </div>
        <span className="meta num" style={{ whiteSpace: "nowrap" }}>{i + 1} / {items.length}</span>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, padding: "32px 16px" }}>
        {note && <p role="status" className="meta" style={{ textAlign: "center" }}>{note}</p>}
        {cur.kind === "card" ? (
          <div key={i} className="st-enter stack" style={{ width: "100%", maxWidth: 680, margin: "0 auto", gap: 16 }}>
            <span className="st-badge st-badge-brand" style={{ alignSelf: "flex-start" }}>Flashcard · đến hạn</span>
            <button type="button" onClick={() => setFlipped(true)} aria-label={flipped ? "Mặt sau thẻ" : `Thẻ: ${cur.card.front}. Bấm để lật`}
              className="st-card" style={{ padding: "48px 32px", textAlign: "center", cursor: flipped ? "default" : "pointer", font: "inherit", color: "inherit" }}>
              <div style={{ font: "700 40px/1.15 var(--font-display)", letterSpacing: -1 }}>{cur.card.front}</div>
              {flipped ? (
                <div style={{ marginTop: 24, borderTop: "1px solid var(--hairline)", paddingTop: 20, fontSize: 18, fontWeight: 600, whiteSpace: "pre-line" }}>{cur.card.back}</div>
              ) : <p className="meta" style={{ marginTop: 16 }}>Bấm để lật thẻ</p>}
            </button>
            {flipped && (
              <div className="st-rate" role="group" aria-label="Bạn nhớ từ này thế nào?">
                <button type="button" className="st-rate-btn st-rate-again" onClick={() => rate(1)}><span className="st-rate-label">Quên</span></button>
                <button type="button" className="st-rate-btn st-rate-hard" onClick={() => rate(2)}><span className="st-rate-label">Khó</span></button>
                <button type="button" className="st-rate-btn st-rate-good" onClick={() => rate(3)}><span className="st-rate-label">Được</span></button>
                <button type="button" className="st-rate-btn st-rate-easy" onClick={() => rate(4)}><span className="st-rate-label">Dễ</span></button>
              </div>
            )}
          </div>
        ) : (
          <div key={i} className="st-enter stack" style={{ width: "100%", maxWidth: 680, margin: "0 auto", gap: 16 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="st-badge st-badge-accent">Câu hỏi</span><span className="meta">{cur.q.topic_name}</span>
            </div>
            <div className="st-card" style={{ padding: 28 }}><p style={{ font: "600 19px/30px var(--font-sans)" }}>{cur.q.question_text}</p></div>
            <div role="radiogroup" aria-label="Đáp án" className="stack" style={{ gap: 10 }}>
              {cur.q.options.map((o) => {
                const isRight = picked && o.id === cur.q.correct;
                const isWrong = picked === o.id && o.id !== cur.q.correct;
                const cls = ["st-option", isRight && "st-option-correct", isWrong && "st-option-wrong", picked && !isRight && !isWrong && "st-option-dimmed"].filter(Boolean).join(" ");
                return (
                  <button key={o.id} className={cls} type="button" role="radio" aria-checked={picked === o.id} disabled={!!picked} onClick={() => choose(o.id)}>
                    <span className="st-option-key">{o.id}</span><span className="st-option-text">{o.text}</span>
                  </button>
                );
              })}
            </div>
            {picked && (
              <>
                <div role="status" style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: picked === cur.q.correct ? "var(--success-tint)" : "var(--danger-tint)" }}>
                  <b style={{ color: picked === cur.q.correct ? "var(--success)" : "var(--danger)" }}>{picked === cur.q.correct ? "Đúng." : "Chưa đúng."}</b>{" "}
                  {cur.q.explanation}
                </div>
                <button className="st-btn st-btn-primary" type="button" style={{ alignSelf: "flex-end" }} onClick={next}>Tiếp</button>
              </>
            )}
          </div>
        )}
        <p className="meta" style={{ textAlign: "center" }}>Xen kẽ thẻ và câu hỏi giúp nhớ lâu hơn học từng khối riêng.</p>
      </main>
    </div>
  );
}
