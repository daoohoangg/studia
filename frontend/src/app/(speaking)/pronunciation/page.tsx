"use client";

import { useEffect, useRef, useState } from "react";
import { API, apiFetch } from "@/lib/api";
import { useSiteConfig } from "@/lib/siteConfig";
import { DEFAULT_SENTENCES } from "@/lib/pronunciationBank";

type Word = { word: string; status: "correct" | "missing" | "extra" };
type Result = { accuracy_percent: number; feedback: string; word_details: Word[]; pace_evaluation?: string };

const SPEEDS = [0.8, 1, 1.2];

type Phase = "idle" | "rec" | "busy" | "done";

export default function PronunciationPage() {
  const site = useSiteConfig();
  // Quản lý có thể thay bộ câu luyện; chưa đặt thì dùng bộ có sẵn
  const SENTENCES = site.pronunciation_sentences?.length ? site.pronunciation_sentences : DEFAULT_SENTENCES;
  const [idx, setIdx] = useState(0);
  const [speed, setSpeed] = useState(0.8);
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);
  const [chunks, setChunks] = useState<string[]>([]);
  const recRef = useRef<any>(null);
  const startRef = useRef(0);
  const textRef = useRef("");
  const sentence = SENTENCES[Math.min(idx, SENTENCES.length - 1)];

  useEffect(() => {
    const w = window as any;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => { try { recRef.current?.abort(); window.speechSynthesis?.cancel(); } catch {} };
  }, []);

  useEffect(() => {
    setResult(null); setHeard(""); setPhase("idle"); setError("");
    apiFetch(`${API}/speech/guide`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sentence.text, speed }),
    }).then((r) => (r.ok ? r.json() : null)).then((d) => setChunks(d?.chunks?.map((c: any) => c.text) || [])).catch(() => setChunks([]));
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = speed;
    window.speechSynthesis.speak(u);
  };

  const evaluate = async (spoken: string, seconds: number) => {
    setPhase("busy");
    try {
      const res = await apiFetch(`${API}/speech/evaluate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_text: sentence.text, user_spoken_text: spoken, audio_duration_sec: seconds }),
      });
      if (!res.ok) throw new Error();
      setResult(await res.json());
      setPhase("done");
    } catch {
      setError("Không chấm được bài nói, hãy thử lại.");
      setPhase("idle");
    }
  };

  const toggle = () => {
    if (phase === "rec") { recRef.current?.stop(); return; }
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    setError(""); setResult(null);
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    textRef.current = "";
    rec.onresult = (e: any) => {
      textRef.current = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      setHeard(textRef.current);
    };
    rec.onerror = () => { setError("Không nghe được giọng nói. Kiểm tra quyền micro của trình duyệt."); setPhase("idle"); };
    rec.onend = () => {
      const seconds = (Date.now() - startRef.current) / 1000;
      setPhase((p) => {
        if (p !== "rec") return p;
        evaluate(textRef.current, seconds);
        return "busy";
      });
    };
    recRef.current = rec;
    startRef.current = Date.now();
    rec.start();
    setPhase("rec");
  };

  const groups = Array.from(new Set(SENTENCES.map((s) => s.group)));

  return (
    <div className="wrap stagger">
      <header className="page-head">
        <div>
          <h1 className="page-title">Luyện phát âm</h1>
          <p className="page-sub">Nghe câu mẫu theo từng cụm, nói lại và xem từ nào bị đọc sai hoặc nuốt mất.</p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, alignItems: "start" }}>
        <aside className="st-card" style={{ padding: 12 }} aria-label="Chọn câu luyện">
          {groups.map((g) => (
            <div key={g}>
              <div className="eyebrow" style={{ color: "var(--ink-muted)", padding: "10px 14px 4px" }}>{g}</div>
              {SENTENCES.map((s, i) => s.group === g && (
                <button key={i} type="button" aria-current={i === idx} onClick={() => setIdx(i)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", border: 0, borderRadius: "var(--radius-sm)", background: i === idx ? "var(--brand-tint)" : "transparent", color: "var(--ink)", font: "550 14.5px/21px var(--font-reading)", cursor: "pointer" }}>
                  {s.text}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="stack" style={{ gap: 16 }}>
          <section className="st-card" style={{ padding: 32 }} aria-labelledby="tg-h">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <span id="tg-h" className="eyebrow" style={{ color: "var(--ink-muted)" }}>Câu mẫu</span>
              <div className="seg" role="radiogroup" aria-label="Tốc độ">
                {SPEEDS.map((s) => (
                  <button key={s} className="seg-btn" type="button" role="radio" aria-checked={s === speed} aria-pressed={s === speed} onClick={() => setSpeed(s)}>{s}×</button>
                ))}
              </div>
            </div>
            <p style={{ font: "500 30px/1.6 var(--font-reading)", letterSpacing: -0.2, marginTop: 18 }}>{sentence.text}</p>
            <div className="row-wrap" style={{ marginTop: 24, gap: 8 }}>
              <button className="st-btn st-btn-secondary" type="button" onClick={() => speak(sentence.text)}>Nghe cả câu</button>
              {chunks.length > 1 && (
                <button className="st-btn st-btn-ghost" type="button" onClick={() => speak(chunks.join("... "))}>Nghe từng cụm</button>
              )}
            </div>
            {chunks.length > 1 && <p className="meta" style={{ marginTop: 12 }}>Cụm: {chunks.join("  /  ")}</p>}
          </section>

          <section className="st-card row-wrap" style={{ gap: 28, padding: "28px 32px" }} aria-label="Ghi âm">
            <button type="button" onClick={toggle} disabled={!supported || phase === "busy"} aria-pressed={phase === "rec"}
              aria-label={phase === "rec" ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
              style={{ width: 88, height: 88, borderRadius: "50%", border: 0, display: "grid", placeItems: "center", cursor: "pointer", background: phase === "rec" ? "var(--danger)" : "var(--accent)", color: "var(--on-accent)", boxShadow: `0 0 0 8px ${phase === "rec" ? "var(--danger-tint)" : "var(--accent-tint)"}` }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></svg>
            </button>
            <div style={{ flex: 1, minWidth: 240 }} role="status">
              {!supported ? (
                <><b>Trình duyệt chưa hỗ trợ nhận dạng giọng nói</b><p className="meta">Hãy dùng Chrome hoặc Edge để luyện phát âm.</p></>
              ) : phase === "rec" ? (
                <><b style={{ font: "650 18px/24px var(--font-sans)" }}>Đang nghe…</b><p className="meta">Bấm lần nữa khi nói xong</p></>
              ) : phase === "busy" ? (
                <><b style={{ font: "650 18px/24px var(--font-sans)" }}>Đang chấm…</b></>
              ) : (
                <><b style={{ font: "650 18px/24px var(--font-sans)" }}>{phase === "done" ? "Bấm micro để ghi lại" : "Bấm để ghi âm"}</b><p className="meta">Đọc cả câu một lần. Studia nghe và so với câu mẫu.</p></>
              )}
              {error && <p role="alert" style={{ color: "var(--danger)", marginTop: 6 }}>{error}</p>}
            </div>
          </section>

          {result && (
            <section className="st-card st-enter" aria-labelledby="rs-h">
              <div className="sec-head">
                <h2 id="rs-h" className="sec-title">Kết quả</h2>
                <div className="row" style={{ gap: 8 }}>
                  <span className={`st-badge ${result.accuracy_percent >= 80 ? "st-badge-success" : "st-badge-warning"}`}>Chính xác {Math.round(result.accuracy_percent)}%</span>
                  {result.pace_evaluation && <span className="st-badge">{result.pace_evaluation}</span>}
                </div>
              </div>
              <p style={{ font: "500 22px/1.9 var(--font-reading)" }}>
                {result.word_details.map((w, i) => (
                  <span key={i} style={{
                    marginRight: 6,
                    color: w.status === "missing" ? "var(--danger)" : w.status === "extra" ? "var(--accent-strong)" : "var(--ink)",
                    textDecoration: w.status === "missing" ? "line-through" : undefined,
                    borderBottom: w.status === "extra" ? "2px dotted var(--accent-strong)" : undefined,
                  }}>{w.word}</span>
                ))}
              </p>
              <div className="row-wrap" style={{ gap: 16, marginTop: 10, fontSize: 13.5 }}>
                <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: "var(--ink)" }} />Đúng</span>
                <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: "var(--accent-strong)" }} />Nói thừa</span>
                <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: "var(--danger)" }} />Bỏ sót</span>
              </div>
              <div className="divider" style={{ margin: "16px 0" }} />
              <p className="ink2">{result.feedback}</p>
              {heard && <p className="meta" style={{ marginTop: 8 }}>Studia nghe được: “{heard}”</p>}
              <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                <button className="st-btn st-btn-primary" type="button" onClick={() => setIdx((idx + 1) % SENTENCES.length)}>Câu tiếp theo</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
