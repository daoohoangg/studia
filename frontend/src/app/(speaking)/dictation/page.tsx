"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_STORE, EXAM_MAX_PLAYS, LEVELS, SEGMENTS, SPEEDS,
  chunksOf, compare, dayKey, estimateSeconds, listVoices, loadStore, maskText, missedWords, play, recordResult, saveStore,
  speechSupported, splitIntoSegments, stopSpeech, watchVoices, wordCount,
  type Compared, type Level, type Segment, type Settings, type Store,
} from "@/lib/dictation";
import { useSiteConfig } from "@/lib/siteConfig";

type Mode = Level | "mine";
type Item = { id: string; topic: string; text: string };
type Result = { cmp: Compared; gaveUp: boolean };

const MODES: { id: Mode; label: string }[] = [
  { id: "easy", label: "Cơ bản" }, { id: "mid", label: "Trung bình" }, { id: "hard", label: "Nâng cao" }, { id: "mine", label: "Của bạn" },
];

export default function DictationPage() {
  const [store, setStore] = useState<Store>(EMPTY_STORE);
  const [mode, setMode] = useState<Mode>("easy");
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [playing, setPlaying] = useState<string | null>(null); // "all" | "c<i>" | "w"
  const [round, setRound] = useState(0);
  const [plays, setPlays] = useState(0);
  const [hint, setHint] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(true);
  const [draft, setDraft] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const S = store.settings;
  const site = useSiteConfig();
  // Quản lý có thể thay cả ngân hàng đoạn nghe; chưa đặt thì dùng bộ có sẵn trong app
  const bank: Segment[] = site.dictation_segments?.length ? site.dictation_segments : SEGMENTS;

  useEffect(() => {
    const s = loadStore();
    setStore(s); setDraft(s.custom);
    setSupported(speechSupported());
    setVoices(listVoices());
    const off = watchVoices(() => setVoices(listVoices()));
    return () => { off(); stopSpeech(); };
  }, []);

  const list: Item[] = useMemo(() => {
    if (mode === "mine") return splitIntoSegments(store.custom).map((text, i) => ({ id: `c${i}`, topic: `Đoạn ${i + 1}`, text }));
    return bank.filter((s) => s.level === mode);
  }, [mode, store.custom, bank]);
  const seg: Item | undefined = list[Math.min(idx, list.length - 1)];
  const chunks = useMemo(() => (seg ? chunksOf(seg.text) : []), [seg]);

  useEffect(() => {
    stopSpeech();
    setAnswer(""); setResult(null); setPlays(0); setHint(false); setPlaying(null); setRound(0);
  }, [mode, seg?.id]);

  const update = (patch: Partial<Settings>) => setStore((s) => {
    const n = { ...s, settings: { ...s.settings, ...patch } };
    saveStore(n);
    return n;
  });

  const exam = S.examMode && !result;
  const outOfPlays = exam && plays >= EXAM_MAX_PLAYS;

  const playAll = () => {
    if (!seg) return;
    if (playing === "all") { stopSpeech(); setPlaying(null); return; }
    if (outOfPlays) return;
    setPlaying("all"); setRound(0); setPlays((p) => p + 1);
    play({
      text: seg.text, rate: S.rate, voiceURI: S.voiceURI, times: exam ? 1 : S.times, gapMs: S.gapSec * 1000,
      onRound: setRound, onEnd: () => setPlaying(null),
    });
    if (!result) taRef.current?.focus();
  };

  const playPart = (key: string, text: string, rate = S.rate) => {
    if (playing === key) { stopSpeech(); setPlaying(null); return; }
    setPlaying(key);
    play({ text, rate, voiceURI: S.voiceURI, times: 1, onEnd: () => setPlaying(null) });
    if (!result) taRef.current?.focus();
  };

  const check = (gaveUp = false) => {
    if (!seg || (!gaveUp && !answer.trim())) return;
    stopSpeech(); setPlaying(null);
    const cmp = compare(seg.text, gaveUp ? "" : answer);
    setResult({ cmp, gaveUp });
    if (!gaveUp) {
      const next = recordResult(store, seg.id.startsWith("c") ? null : seg.id, cmp.score, missedWords(cmp));
      setStore(next); saveStore(next);
    }
  };

  const retry = () => { stopSpeech(); setAnswer(""); setResult(null); setPlays(0); setHint(false); setPlaying(null); taRef.current?.focus(); };
  const next = () => { if (list.length) setIdx((i) => (Math.min(i, list.length - 1) + 1) % list.length); };
  const stepSpeed = (d: number) => {
    const i = SPEEDS.indexOf(S.rate as (typeof SPEEDS)[number]);
    update({ rate: SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, (i < 0 ? 2 : i) + d))] });
  };

  // Phím tắt dùng bản mới nhất của các hàm ở trên
  const act = useRef({ playAll, check, next, stepSpeed, hasResult: false });
  act.current = { playAll, check, next, stepSpeed, hasResult: !!result };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = act.current;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); a.hasResult ? a.next() : a.check(); }
      else if (e.altKey && e.code === "KeyP") { e.preventDefault(); a.playAll(); }
      else if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); a.stepSpeed(-1); }
      else if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); a.stepSpeed(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const typed = wordCount(answer);
  const total = seg ? wordCount(seg.text) : 0;
  const secs = seg ? Math.round(estimateSeconds(seg.text, S.rate)) : 0;
  const today = store.days[dayKey()];
  const week = useMemo(() => {
    let n = 0, sum = 0;
    for (let d = 0; d < 7; d++) {
      const t = new Date(); t.setDate(t.getDate() - d);
      const x = store.days[dayKey(t)];
      if (x) { n += x.n; sum += x.sum; }
    }
    return { n, avg: n ? Math.round(sum / n) : 0 };
  }, [store.days]);
  const weak = useMemo(() => Object.entries(store.weak).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 14), [store.weak]);
  const missed = result ? missedWords(result.cmp) : [];

  const sayWord = (w: string) => playPart("w", w, 0.8);

  return (
    <div className="wrap stagger">
      <header className="page-head">
        <div>
          <h1 className="page-title">Nghe chép chính tả</h1>
          <p className="page-sub">Nghe từng đoạn ngắn 10–15 giây, gõ lại những gì nghe được, rồi xem chính xác từ nào bạn nghe sót hoặc viết sai.</p>
        </div>
      </header>

      {!supported && (
        <div className="st-card" role="alert" style={{ padding: 16, marginBottom: 16, borderColor: "var(--warning)" }}>
          <b>Trình duyệt chưa hỗ trợ giọng đọc.</b> <span className="ink2">Hãy dùng Chrome, Edge hoặc Safari để nghe chép chính tả.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, alignItems: "start" }}>
        <aside className="st-card" style={{ padding: 12 }} aria-label="Chọn đoạn nghe">
          <div className="seg row-wrap" role="radiogroup" aria-label="Cấp độ" style={{ margin: 2 }}>
            {MODES.map((m) => (
              <button key={m.id} type="button" className="seg-btn" role="radio" aria-checked={mode === m.id}
                title={LEVELS.find((l) => l.id === m.id)?.hint}
                onClick={() => { setMode(m.id); setIdx(0); }}>{m.label}</button>
            ))}
          </div>

          {mode === "mine" && (
            <div style={{ padding: "12px 6px 4px" }}>
              <label className="st-field-label" htmlFor="dc-draft">Dán văn bản tiếng Anh của bạn</label>
              <textarea id="dc-draft" className="input" rows={6} value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder="Dán bài đọc, audioscript hoặc đoạn văn bất kỳ. Studia tự cắt thành các đoạn 10–15 giây." style={{ width: "100%", marginTop: 6 }} />
              <button type="button" className="st-btn st-btn-secondary st-btn-sm" style={{ marginTop: 8 }}
                onClick={() => { const n = { ...store, custom: draft }; setStore(n); saveStore(n); setIdx(0); }}>Tách thành các đoạn</button>
              {store.custom && <p className="meta" style={{ marginTop: 8 }}>{list.length} đoạn</p>}
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            {list.map((s, i) => {
              const d = store.done[s.id];
              const on = seg?.id === s.id;
              return (
                <button key={s.id} type="button" aria-current={on} onClick={() => setIdx(i)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "11px 14px", border: 0, borderRadius: "var(--radius-sm)", background: on ? "var(--brand-tint)" : "transparent", color: "var(--ink)", font: "550 14.5px/21px var(--font-sans)", cursor: "pointer" }}>
                  <span>{s.topic}<span className="meta" style={{ marginLeft: 8 }}>~{Math.round(estimateSeconds(s.text, 1))}s</span></span>
                  {d && <span className={`st-badge ${d.best >= 80 ? "st-badge-success" : "st-badge-warning"}`}>{d.best}%</span>}
                </button>
              );
            })}
            {mode === "mine" && !list.length && <p className="meta" style={{ padding: "10px 14px" }}>Chưa có đoạn nào. Dán văn bản rồi bấm tách.</p>}
          </div>
        </aside>

        <div className="stack" style={{ gap: 16 }}>
          {!seg ? (
            <section className="st-card" style={{ padding: 32 }}><p className="ink2">Chọn một đoạn ở bên trái, hoặc dán văn bản của bạn ở mục “Của bạn”.</p></section>
          ) : (
            <>
              <section className="st-card" style={{ padding: 28 }} aria-labelledby="dc-listen">
                <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <span id="dc-listen" className="eyebrow" style={{ color: "var(--ink-muted)" }}>
                    {seg.topic} · Đoạn {Math.min(idx, list.length - 1) + 1}/{list.length}
                  </span>
                  <span className="meta">{total} từ · khoảng {secs} giây ở tốc độ {S.rate}×</span>
                </div>

                <div className="row-wrap" style={{ gap: 24, marginTop: 18, alignItems: "center" }}>
                  <button type="button" onClick={playAll} disabled={!supported || outOfPlays}
                    aria-label={playing === "all" ? "Dừng" : "Nghe đoạn"} aria-pressed={playing === "all"}
                    style={{ width: 88, height: 88, borderRadius: "50%", border: 0, display: "grid", placeItems: "center", cursor: "pointer", background: "var(--brand)", color: "var(--on-brand)", boxShadow: "0 0 0 8px var(--brand-tint)", opacity: outOfPlays ? 0.5 : 1 }}>
                    {playing === "all" ? (
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
                    )}
                  </button>
                  <div style={{ flex: 1, minWidth: 220 }} role="status" aria-live="polite">
                    <b style={{ font: "650 18px/24px var(--font-sans)" }}>
                      {playing === "all" ? `Đang đọc${!exam && S.times > 1 ? ` · lần ${round}/${S.times}` : ""}…` : plays ? "Nghe lại" : "Bấm để nghe"}
                    </b>
                    <p className="meta">
                      {exam ? `Chế độ thi: còn ${Math.max(0, EXAM_MAX_PLAYS - plays)}/${EXAM_MAX_PLAYS} lượt nghe` : plays ? `Đã nghe ${plays} lượt` : "Nghe xong gõ lại ngay, không cần chờ hết đoạn."}
                    </p>
                  </div>
                </div>

                <div className="row-wrap" style={{ gap: 16, marginTop: 22, alignItems: "end" }}>
                  <div>
                    <div className="st-field-label" id="dc-speed" style={{ marginBottom: 6 }}>Tốc độ đọc</div>
                    <div className="seg" role="radiogroup" aria-labelledby="dc-speed">
                      {SPEEDS.map((r) => (
                        <button key={r} className="seg-btn" type="button" role="radio" aria-checked={S.rate === r} aria-pressed={S.rate === r} onClick={() => update({ rate: r })}>{r}×</button>
                      ))}
                    </div>
                  </div>
                  <label className="st-field" style={{ minWidth: 0 }}>
                    <span className="st-field-label">Tự lặp lại</span>
                    <select className="input" style={{ height: 40 }} value={S.times} disabled={S.examMode} onChange={(e) => update({ times: Number(e.target.value) })}>
                      <option value={1}>1 lần</option><option value={2}>2 lần</option><option value={3}>3 lần</option>
                    </select>
                  </label>
                  <label className="st-field" style={{ minWidth: 0 }}>
                    <span className="st-field-label">Nghỉ giữa các lần</span>
                    <select className="input" style={{ height: 40 }} value={S.gapSec} disabled={S.times === 1 || S.examMode} onChange={(e) => update({ gapSec: Number(e.target.value) })}>
                      <option value={2}>2 giây</option><option value={3}>3 giây</option><option value={5}>5 giây</option><option value={8}>8 giây</option>
                    </select>
                  </label>
                  <label className="st-field" style={{ minWidth: 0 }}>
                    <span className="st-field-label">Giọng đọc</span>
                    <select className="input" style={{ height: 40, maxWidth: 220 }} value={S.voiceURI} onChange={(e) => update({ voiceURI: e.target.value })}>
                      <option value="">Tự động (Anh-Anh)</option>
                      {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name.replace(/^(Microsoft|Google)\s+/, "")} ({v.lang})</option>)}
                    </select>
                  </label>
                </div>

                <div className="row-wrap" style={{ gap: 8, marginTop: 18, alignItems: "center" }}>
                  <span className="st-field-label">Nghe từng cụm</span>
                  {chunks.map((c, i) => (
                    <button key={i} type="button" className="st-btn st-btn-ghost st-btn-sm" aria-pressed={playing === `c${i}`}
                      disabled={!supported || exam} onClick={() => playPart(`c${i}`, c)}>
                      {playing === `c${i}` ? "Dừng" : `Cụm ${i + 1}`}
                    </button>
                  ))}
                  {exam && <span className="meta">Tắt trong chế độ thi</span>}
                </div>

                <label className="row" style={{ gap: 8, marginTop: 16, cursor: "pointer", width: "fit-content" }}>
                  <input type="checkbox" checked={S.examMode} onChange={(e) => update({ examMode: e.target.checked })} />
                  <span className="ink2" style={{ fontSize: 14 }}>Chế độ thi: chỉ được nghe {EXAM_MAX_PLAYS} lượt, không nghe từng cụm, không gợi ý</span>
                </label>
              </section>

              <section className="st-card" style={{ padding: 28 }} aria-labelledby="dc-type">
                <div className="sec-head">
                  <h2 id="dc-type" className="sec-title">Gõ lại những gì bạn nghe</h2>
                  <span className="meta" aria-live="polite">{typed} / {total} từ</span>
                </div>
                <textarea ref={taRef} className="input" rows={5} value={answer} disabled={!!result}
                  onChange={(e) => setAnswer(e.target.value)}
                  spellCheck={false} autoCorrect="off" autoCapitalize="off" autoComplete="off" lang="en"
                  aria-label="Nhập lại đoạn vừa nghe"
                  placeholder="Gõ vào đây. Không cần viết hoa hay dấu câu, Studia bỏ qua hai thứ đó khi chấm."
                  style={{ width: "100%", height: "auto", padding: 14, font: "500 19px/1.7 var(--font-reading)", resize: "vertical" }} />
                {hint && !result && (
                  <p style={{ font: "500 17px/1.8 var(--font-reading)", letterSpacing: 1, marginTop: 12, color: "var(--ink-secondary)" }} aria-label="Gợi ý chữ cái đầu">{maskText(seg.text)}</p>
                )}
                {!result ? (
                  <div className="row-wrap" style={{ gap: 8, marginTop: 16, alignItems: "center" }}>
                    <button className="st-btn st-btn-primary" type="button" disabled={!answer.trim()} onClick={() => check()}>Chấm bài</button>
                    <button className="st-btn st-btn-secondary" type="button" disabled={exam} onClick={() => setHint((h) => !h)} aria-pressed={hint}>{hint ? "Ẩn gợi ý" : "Gợi ý chữ cái đầu"}</button>
                    <button className="st-btn st-btn-ghost" type="button" onClick={() => check(true)}>Xem đáp án</button>
                    <span className="meta" style={{ marginLeft: "auto" }}>Ctrl+Enter chấm · Alt+P nghe · Alt+↑/↓ tốc độ</span>
                  </div>
                ) : null}
              </section>

              {result && (
                <section className="st-card st-enter" aria-labelledby="dc-res">
                  <div className="sec-head">
                    <h2 id="dc-res" className="sec-title">{result.gaveUp ? "Đáp án" : "Kết quả"}</h2>
                    {!result.gaveUp && (
                      <span className={`st-badge ${result.cmp.score >= 80 ? "st-badge-success" : result.cmp.score >= 50 ? "st-badge-warning" : "st-badge-danger"}`}>Chính xác {result.cmp.score}%</span>
                    )}
                  </div>

                  {result.gaveUp ? (
                    <p style={{ font: "500 22px/1.9 var(--font-reading)" }}>{seg.text}</p>
                  ) : (
                    <>
                      <p style={{ font: "500 21px/2 var(--font-reading)" }}>
                        {result.cmp.cells.map((c, i) => <Fragment key={i}><Cell c={c} />{" "}</Fragment>)}
                      </p>
                      <div className="row-wrap" style={{ gap: 16, marginTop: 8, fontSize: 13.5 }}>
                        <span><b>{result.cmp.counts.ok}</b> đúng</span>
                        <span style={{ textDecoration: "underline wavy var(--warning)", textUnderlineOffset: 4 }}><b>{result.cmp.counts.typo}</b> sai chính tả</span>
                        <span style={{ color: "var(--danger)" }}><s>sai</s> → <b>đúng</b>: {result.cmp.counts.wrong} nghe nhầm</span>
                        <span style={{ color: "var(--danger)", borderBottom: "2px dashed var(--danger)" }}>{result.cmp.counts.missing} bỏ sót</span>
                        <span style={{ color: "var(--accent-strong)", textDecoration: "line-through dotted" }}>{result.cmp.counts.extra} thừa</span>
                      </div>
                      <p className="ink2" style={{ marginTop: 12 }}>{tip(result.cmp)}</p>
                      <div className="divider" style={{ margin: "16px 0" }} />
                      <p className="meta" style={{ marginBottom: 4 }}>Câu gốc</p>
                      <p style={{ font: "500 17px/1.8 var(--font-reading)" }}>{seg.text}</p>
                    </>
                  )}

                  <div className="row-wrap" style={{ gap: 8, marginTop: 16, alignItems: "center" }}>
                    <span className="st-field-label">Nghe lại:</span>
                    <button type="button" className="st-btn st-btn-secondary st-btn-sm" onClick={() => playPart("all", seg.text, 0.75)} aria-pressed={playing === "all"}>
                      {playing === "all" ? "Dừng" : "Cả đoạn (chậm 0.75×)"}
                    </button>
                    {chunks.map((c, i) => (
                      <button key={i} type="button" className="st-btn st-btn-ghost st-btn-sm" title={c} onClick={() => playPart(`c${i}`, c, 0.75)}>
                        {playing === `c${i}` ? "Dừng" : `Cụm ${i + 1}`}
                      </button>
                    ))}
                  </div>

                  {!result.gaveUp && missed.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <p className="st-field-label" style={{ marginBottom: 8 }}>Từ cần ôn (bấm để nghe) — đã lưu vào danh sách “hay nghe sai”</p>
                      <div className="row-wrap" style={{ gap: 8 }}>
                        {missed.map((w) => <button key={w} type="button" className="st-badge st-badge-danger" style={{ cursor: "pointer", border: 0 }} onClick={() => sayWord(w)}>{w}</button>)}
                      </div>
                    </div>
                  )}

                  <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                    <button className="st-btn st-btn-secondary" type="button" onClick={retry}>Làm lại đoạn này</button>
                    <button className="st-btn st-btn-primary" type="button" onClick={next}>Đoạn tiếp theo</button>
                  </div>
                </section>
              )}
            </>
          )}

          <section className="st-card" style={{ padding: 24 }} aria-labelledby="dc-stat">
            <div className="sec-head">
              <h2 id="dc-stat" className="sec-title">Tiến độ của bạn</h2>
            </div>
            <div className="row-wrap" style={{ gap: 28 }}>
              <Stat label="Hôm nay" value={today ? `${today.n} lượt` : "0 lượt"} sub={today ? `trung bình ${Math.round(today.sum / today.n)}%` : "chưa luyện"} />
              <Stat label="7 ngày qua" value={`${week.n} lượt`} sub={week.n ? `trung bình ${week.avg}%` : "—"} />
              <Stat label="Đã hoàn thành" value={`${bank.filter((s) => store.done[s.id]).length}/${bank.length}`} sub="đoạn có sẵn" />
            </div>
            <div className="divider" style={{ margin: "16px 0" }} />
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <p className="st-field-label">Từ bạn hay nghe sai</p>
              {weak.length > 0 && (
                <button className="st-btn st-btn-ghost st-btn-sm" type="button" onClick={() => { const n = { ...store, weak: {} }; setStore(n); saveStore(n); }}>Xoá danh sách</button>
              )}
            </div>
            {weak.length ? (
              <div className="row-wrap" style={{ gap: 8, marginTop: 10 }}>
                {weak.map(([w, n]) => (
                  <button key={w} type="button" className="st-badge" style={{ cursor: "pointer", border: 0 }} onClick={() => sayWord(w)} title="Bấm để nghe">{w} ×{n}</button>
                ))}
              </div>
            ) : <p className="meta" style={{ marginTop: 8 }}>Chưa có. Sau mỗi lần chấm, những từ bạn nghe sót hoặc viết sai sẽ được ghi lại ở đây để ôn.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="meta">{label}</div>
      <div style={{ font: "700 24px/32px var(--font-display)" }}>{value}</div>
      <div className="meta">{sub}</div>
    </div>
  );
}

/** Một từ trong kết quả; mỗi loại lỗi có kiểu gạch khác nhau để không phụ thuộc vào màu. */
function Cell({ c }: { c: Compared["cells"][number] }) {
  const gap = { marginRight: 4 } as const;
  switch (c.kind) {
    case "ok":
      return <span style={gap}>{c.ref}</span>;
    case "typo":
      return (
        <span style={{ ...gap, textDecoration: "underline wavy var(--warning)", textUnderlineOffset: 5 }} title={`Bạn gõ “${c.got}”, đúng là “${c.ref}”`}>
          <s style={{ color: "var(--ink-muted)" }}>{c.got}</s>{" "}{c.ref}
        </span>
      );
    case "wrong":
      return (
        <span style={{ ...gap, color: "var(--danger)" }} title={`Bạn gõ “${c.got}”, đúng là “${c.ref}”`}>
          <s style={{ opacity: 0.7 }}>{c.got}</s>{" "}<b>{c.ref}</b>
        </span>
      );
    case "missing":
      return <span style={{ ...gap, color: "var(--danger)", borderBottom: "2px dashed var(--danger)" }} title="Bạn đã bỏ sót từ này">{c.ref}</span>;
    default:
      return <span style={{ ...gap, color: "var(--accent-strong)", textDecoration: "line-through dotted" }} title="Từ thừa, không có trong đoạn nghe">{c.got}</span>;
  }
}

/** Lời khuyên theo kiểu lỗi chiếm nhiều nhất. */
function tip(c: Compared): string {
  const { ok, typo, wrong, missing, extra } = c.counts;
  if (c.score >= 95) return "Gần như hoàn hảo. Thử tăng tốc độ lên hoặc chuyển sang cấp độ cao hơn.";
  const worst = Math.max(typo, wrong, missing, extra);
  if (worst === 0) return "";
  if (worst === missing) return "Bạn hay bỏ sót từ, thường là từ nối hoặc từ ngắn như a, the, of. Thử nghe từng cụm và đừng bỏ qua những từ yếu.";
  if (worst === wrong) return "Nhiều từ bị nghe nhầm thành từ khác. Bấm nghe lại từng cụm ở tốc độ 0.75× và chú ý âm cuối, âm nối.";
  if (worst === typo) return `Bạn nghe đúng nhưng viết sai chính tả ${typo} từ. Xem lại các từ gạch lượn sóng ở trên.`;
  return ok ? "Bạn gõ thêm một số từ không có trong đoạn. Chỉ gõ đúng những gì nghe được." : "";
}
