"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BANK, SECTION_LABEL, Section, Answers, scoreAnswers, pushServerPlacement, loadProfile, fetchServerProfile, Profile, DEFAULT_PROFILE } from "@/lib/placement";

const ORDER: Section[] = ["vocab", "grammar", "reading", "listening"];

export default function PlacementPage() {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [finished, setFinished] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [played, setPlayed] = useState(false);
  const saved = useRef(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    setProfile(loadProfile());
    fetchServerProfile().then((r) => r.profile && setProfile(r.profile));
  }, []);
  useEffect(() => { setPlayed(false); try { window.speechSynthesis?.cancel(); } catch {} }, [i]);

  const q = BANK[i];
  const result = scoreAnswers(answers);

  useEffect(() => {
    if (finished && !saved.current) {
      saved.current = true;
      pushServerPlacement({ band: result.band, per: result.per, at: new Date().toISOString() });
    }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (n: number) => setAnswers((a) => ({ ...a, [i]: n }));
  const advance = (skip = false) => {
    if (skip) setAnswers((a) => ({ ...a, [i]: null }));
    if (i + 1 >= BANK.length) setFinished(true); else setI(i + 1);
  };
  const play = () => {
    if (!q.audio || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(q.audio);
    u.lang = "en-GB"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
    setPlayed(true);
  };

  if (finished) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    const gap = Math.max(0, profile.target - result.band);
    const pctNow = Math.min(100, (result.band / 9) * 100);
    const pctTarget = Math.min(100, (profile.target / 9) * 100);
    const entries = ORDER.map((s) => [s, result.per[s]] as const);
    const weakest = [...entries].sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total)[0][0];
    return (
      <div className="wrap stagger" style={{ maxWidth: 960, margin: "0 auto", padding: "40px 16px" }}>
        <header>
          <div className="eyebrow" style={{ color: "var(--ink-muted)" }}>Kiểm tra trình độ · {BANK.length} câu · {minutes} phút</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Bạn đang ở khoảng band {result.band.toFixed(1)}</h1>
          <p className="page-sub">{gap > 0 ? `Cách mục tiêu ${profile.target.toFixed(1)} khoảng ${gap.toFixed(1)} band.` : `Bạn đã đạt mục tiêu ${profile.target.toFixed(1)} ở mức ước lượng.`} Lộ trình đã được điều chỉnh theo kết quả này.</p>
        </header>

        <section className="st-card row-wrap" style={{ gap: 32, padding: "28px 32px" }} aria-label="Ước lượng band">
          <div style={{ textAlign: "center", minWidth: 140 }}>
            <div className="st-band-score" style={{ fontSize: 56 }}>{result.band.toFixed(1)}</div>
            <div className="meta">Ước lượng</div>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="label">Hiện tại {result.band.toFixed(1)}</span>
              <span className="label" style={{ color: "var(--accent-strong)" }}>Mục tiêu {profile.target.toFixed(1)}</span>
            </div>
            <div aria-hidden="true" style={{ position: "relative", height: 10, borderRadius: 999, background: "var(--surface-sunken)", marginTop: 10 }}>
              <i style={{ position: "absolute", inset: "0 auto 0 0", width: `${pctNow}%`, borderRadius: "inherit", background: "var(--brand)" }} />
              <b style={{ position: "absolute", top: -6, left: `${pctTarget}%`, width: 3, height: 22, borderRadius: 2, background: "var(--accent)" }} />
            </div>
            <p className="ink2" style={{ marginTop: 14 }}>Điểm yếu nhất là phần {SECTION_LABEL[weakest].toLowerCase()}; Studia sẽ ưu tiên phần này ở tuần đầu.</p>
            <p className="meta" style={{ marginTop: 6 }}>Đây là ước lượng từ {BANK.length} câu, chưa có Writing và Speaking. Làm một đề thi thử đầy đủ để có điểm chính xác hơn.</p>
          </div>
        </section>

        <div className="split">
          <section className="st-card" aria-labelledby="sk-h">
            <div className="sec-head"><h2 id="sk-h" className="sec-title">Theo phần</h2><span className="meta">Số câu đúng</span></div>
            {entries.map(([s, v], n) => {
              const r = v.right / v.total;
              return (
                <div key={s} style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr) 56px", gap: 14, alignItems: "center", padding: "12px 0", borderTop: n ? "1px solid var(--hairline)" : 0 }}>
                  <span>{SECTION_LABEL[s]}</span>
                  <div className="bar"><i style={{ width: `${r * 100}%`, background: r >= 0.8 ? "var(--success)" : r < 0.55 ? "var(--accent-strong)" : "var(--brand)" }} /></div>
                  <b className="num" style={{ textAlign: "right" }}>{v.right}/{v.total}</b>
                </div>
              );
            })}
          </section>
          <section className="navy-block stack" style={{ gap: 14 }}>
            <div className="eyebrow" style={{ opacity: 0.75 }}>Bước tiếp theo</div>
            <h2 style={{ font: "700 22px/28px var(--font-display)", color: "var(--on-navy)" }}>{profile.minutes} phút mỗi ngày</h2>
            <p style={{ fontSize: 14.5, opacity: 0.85 }}>Tải một cuốn sách lên thư viện để Studia dựng lịch học theo từng ngày.</p>
            <Link className="st-btn st-btn-accent st-btn-block" href="/books">Mở thư viện</Link>
            <Link href="/" style={{ color: "var(--on-navy)", fontSize: 14, textAlign: "center" }}>Về trang chính</Link>
          </section>
        </div>
      </div>
    );
  }

  const sectionIdx = ORDER.indexOf(q.section);
  const done = Object.keys(answers).length;
  const picked = answers[i];

  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", flexDirection: "column" }}>
      <header style={{ height: 64, display: "flex", alignItems: "center", gap: 16, padding: "0 24px", background: "var(--surface)", borderBottom: "1px solid var(--hairline)" }}>
        <Link className="icon-btn" href="/onboarding" aria-label="Thoát bài kiểm tra">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </Link>
        <b style={{ font: "650 15px/20px var(--font-sans)" }}>Kiểm tra trình độ</b>
        <ol className="row" style={{ flex: 1, maxWidth: 640, margin: "0 auto", gap: 14, listStyle: "none", padding: 0 }}>
          {ORDER.map((s, n) => (
            <li key={s} aria-current={n === sectionIdx ? "step" : undefined} style={{ display: "flex", alignItems: "center", gap: 8, font: "550 13.5px/1 var(--font-sans)", color: n === sectionIdx ? "var(--ink)" : "var(--ink-muted)" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", font: "650 11.5px/1 var(--font-sans)", background: n < sectionIdx ? "var(--success)" : n === sectionIdx ? "var(--brand)" : "var(--surface-sunken)", color: n <= sectionIdx ? "var(--on-brand)" : "var(--ink-muted)" }}>{n + 1}</span>
              {SECTION_LABEL[s]}
            </li>
          ))}
        </ol>
        <span className="meta num">Câu {i + 1} / {BANK.length}</span>
      </header>
      <div className="st-progress-track" style={{ height: 4, borderRadius: 0 }} aria-hidden="true">
        <div className="st-progress-fill" style={{ width: `${(done / BANK.length) * 100}%`, borderRadius: 0 }} />
      </div>

      <main style={{ flex: 1, display: "flex", justifyContent: "center", padding: "40px 16px" }}>
        <div key={i} className="st-enter" style={{ width: "100%", maxWidth: 1040, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, alignItems: "start" }}>
          {q.passage && (
            <article className="st-card" style={{ padding: 28 }} aria-label="Đoạn đọc">
              <div className="eyebrow" style={{ color: "var(--ink-muted)" }}>Đọc đoạn văn</div>
              <h2 style={{ font: "700 22px/28px var(--font-display)", marginTop: 6 }}>{q.passage.title}</h2>
              <p className="passage" style={{ marginTop: 14, color: "var(--ink-secondary)" }}>{q.passage.text}</p>
            </article>
          )}
          {q.audio && (
            <article className="st-card" style={{ padding: 28 }} aria-label="Đoạn nghe">
              <div className="eyebrow" style={{ color: "var(--ink-muted)" }}>Nghe</div>
              <p className="ink2" style={{ marginTop: 8 }}>Bấm để nghe đoạn ghi âm, bạn có thể nghe lại.</p>
              <button className="st-btn st-btn-secondary" type="button" style={{ marginTop: 16 }} onClick={play}>{played ? "Nghe lại" : "Nghe đoạn ghi âm"}</button>
            </article>
          )}
          <section className="stack" style={{ gap: 18, gridColumn: q.passage || q.audio ? undefined : "1 / -1", maxWidth: q.passage || q.audio ? undefined : 680, margin: q.passage || q.audio ? undefined : "0 auto", width: "100%" }} aria-labelledby="pq">
            <p id="pq" style={{ font: "600 18px/28px var(--font-sans)" }}>{q.prompt}</p>
            <div role="radiogroup" aria-labelledby="pq" className="stack" style={{ gap: 10 }}>
              {q.options.map((o, n) => (
                <button key={n} type="button" role="radio" aria-checked={picked === n}
                  className={`st-option${picked === n ? " st-option-selected" : ""}`} onClick={() => choose(n)}>
                  <span className="st-option-key">{"ABCD"[n]}</span><span className="st-option-text">{o}</span>
                </button>
              ))}
            </div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
              <button className="st-btn st-btn-ghost" type="button" onClick={() => advance(true)}>Tôi không chắc — bỏ qua</button>
              <button className="st-btn st-btn-primary" type="button" disabled={picked == null} onClick={() => advance()}>
                {i + 1 === BANK.length ? "Xem kết quả" : "Câu tiếp theo"}
              </button>
            </div>
            <p className="meta">Không tính giờ, không trừ điểm.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
