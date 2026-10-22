"use client";

import { useEffect, useMemo, useState } from "react";
import Mascot from "@/components/mascot/Mascot";
import { API, apiFetch } from "@/lib/api";
import "./writing.css";

type Task = "task1" | "task2";
type Issue = { type: string; text: string; suggestion: string; explanation_vi: string };
type SentenceResult = { index: number; original: string; corrected: string; changed: boolean; issues: Issue[] };
type Criterion = { name: string; band: number; comment_vi: string; strengths: string[]; improvements: string[] };
type Result = {
  task: Task; words: number; min_words: number; under_length: boolean; overall: number;
  criteria: Record<"task" | "coherence" | "lexical" | "grammar", Criterion>;
  summary_vi: string; priorities_vi: string[]; sentences: SentenceResult[]; issue_count: number;
};

const TASKS: { id: Task; label: string; min: number; hint: string; sample: string }[] = [
  {
    id: "task1", label: "Task 1", min: 150, hint: "Mô tả biểu đồ, bảng, quy trình hoặc bản đồ (Academic) / viết thư (General)",
    sample: "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "task2", label: "Task 2", min: 250, hint: "Viết bài luận nêu quan điểm, thảo luận hoặc giải pháp",
    sample: "Some people believe that studying abroad is the best way to gain a good education, while others think students should stay in their own country. Discuss both views and give your own opinion.",
  },
];

const ISSUE_LABEL: Record<string, string> = { grammar: "Ngữ pháp", vocabulary: "Từ vựng", spelling: "Chính tả", punctuation: "Dấu câu", style: "Diễn đạt" };
const CRIT_ORDER = ["task", "coherence", "lexical", "grammar"] as const;
const CRIT_VI: Record<string, string> = { task: "Hoàn thành yêu cầu đề", coherence: "Mạch lạc và liên kết", lexical: "Vốn từ", grammar: "Ngữ pháp" };

const countWords = (t: string) => (t.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
const bandColor = (b: number) => (b >= 7 ? "var(--success)" : b >= 5.5 ? "var(--brand)" : b >= 4.5 ? "var(--accent-strong)" : "var(--danger)");

/** Tách câu gốc thành các đoạn, bôi đậm phần lỗi mà AI chỉ ra (chỉ lần xuất hiện đầu, không chồng lấn). */
function segments(original: string, issues: Issue[]): { text: string; issue?: Issue }[] {
  const spans: { start: number; end: number; issue: Issue }[] = [];
  for (const iss of issues) {
    if (!iss.text) continue;
    const start = original.indexOf(iss.text);
    if (start < 0) continue;
    const end = start + iss.text.length;
    if (spans.some((s) => start < s.end && end > s.start)) continue;
    spans.push({ start, end, issue: iss });
  }
  spans.sort((a, b) => a.start - b.start);
  const out: { text: string; issue?: Issue }[] = [];
  let pos = 0;
  for (const s of spans) {
    if (s.start > pos) out.push({ text: original.slice(pos, s.start) });
    out.push({ text: original.slice(s.start, s.end), issue: s.issue });
    pos = s.end;
  }
  if (pos < original.length) out.push({ text: original.slice(pos) });
  return out.length ? out : [{ text: original }];
}

function BandRing({ band }: { band: number }) {
  const R = 54, C = 2 * Math.PI * R;
  return (
    <div className="st-band wr-ring" role="img" aria-label={`Overall band ${band} trên 9`}>
      <svg width="140" height="140" viewBox="0 0 140 140" fill="none" aria-hidden="true">
        <circle className="st-band-track" cx="70" cy="70" r={R} strokeWidth="11" />
        <circle className="st-band-arc" cx="70" cy="70" r={R} strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - band / 9)} />
      </svg>
      <div className="st-band-center"><div className="st-band-score">{band.toFixed(1)}</div><div className="st-band-label">Overall</div></div>
    </div>
  );
}

export default function WritingPage() {
  const [task, setTask] = useState<Task>("task2");
  const [prompt, setPrompt] = useState("");
  const [essay, setEssay] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [onlyIssues, setOnlyIssues] = useState(false);

  // Giữ bản nháp khi tải lại trang
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem("studia_writing_draft") || "null");
      if (d) { setTask(d.task === "task1" ? "task1" : "task2"); setPrompt(d.prompt || ""); setEssay(d.essay || ""); }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("studia_writing_draft", JSON.stringify({ task, prompt, essay })); } catch {}
  }, [task, prompt, essay]);

  const cfg = TASKS.find((t) => t.id === task)!;
  const words = useMemo(() => countWords(essay), [essay]);
  const enough = words >= 30;

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const res = await apiFetch(`${API}/writing/grade`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, prompt, essay }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Không chấm được bài, thử lại sau");
      setResult(data);
      setTimeout(() => document.getElementById("wr-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e: any) {
      setError(e.message || "Không chấm được bài, thử lại sau");
    }
    setBusy(false);
  };

  const shown = result ? result.sentences.filter((s) => !onlyIssues || s.changed) : [];

  return (
    <div className="wrap stagger wr">
      <header className="page-head">
        <div>
          <h1 className="page-title">Chấm Writing</h1>
          <p className="page-sub">Dán bài viết của bạn. Coal chấm theo 4 tiêu chí của IELTS và sửa lỗi từng câu.</p>
        </div>
      </header>

      <section className="st-card wr-form" aria-label="Bài viết của bạn">
        <div className="seg" role="tablist" aria-label="Loại bài">
          {TASKS.map((t) => (
            <button key={t.id} type="button" role="tab" className="seg-btn" aria-selected={task === t.id} onClick={() => setTask(t.id)}>{t.label}</button>
          ))}
        </div>
        <p className="meta">{cfg.hint}. Tối thiểu {cfg.min} từ.</p>

        <label className="wr-label" htmlFor="wr-prompt">
          Đề bài
          <button type="button" className="link" onClick={() => setPrompt(cfg.sample)}>Dùng đề mẫu</button>
        </label>
        <textarea id="wr-prompt" className="wr-area" rows={3} value={prompt} maxLength={2000} placeholder="Dán đề bài vào đây để chấm đúng yêu cầu (không bắt buộc)" onChange={(e) => setPrompt(e.target.value)} />

        <label className="wr-label" htmlFor="wr-essay">Bài viết</label>
        <textarea id="wr-essay" className="wr-area wr-essay" rows={14} value={essay} placeholder="Viết hoặc dán bài của bạn bằng tiếng Anh…" onChange={(e) => setEssay(e.target.value)} spellCheck={false} />

        <div className="wr-bar">
          <span className="wr-count num" data-short={words < cfg.min || undefined}>
            {words} / {cfg.min} từ{words > 0 && words < cfg.min ? " · chưa đủ độ dài" : ""}
          </span>
          <button type="button" className="st-btn st-btn-primary" onClick={submit} disabled={busy || !enough}>
            {busy ? "Coal đang chấm…" : "Chấm bài"}
          </button>
        </div>
        {!enough && essay.trim() && <p className="meta">Cần ít nhất 30 từ để chấm.</p>}
        {error && <div role="alert" className="gp-msg">{error}</div>}
      </section>

      {busy && (
        <section className="st-card wr-wait" aria-live="polite">
          <Mascot mood="focus" size={96} talking label="" />
          <div><b>Coal đang đọc bài của bạn</b><p className="meta">Chấm 4 tiêu chí và soát từng câu, khoảng 10–30 giây.</p></div>
        </section>
      )}

      {result && !busy && (
        <div id="wr-result" className="wr-result">
          <section className="st-card wr-top">
            <BandRing band={result.overall} />
            <div className="wr-top-text">
              <div className="eyebrow">Kết quả · {TASKS.find((t) => t.id === result.task)?.label} · {result.words} từ</div>
              <p className="wr-summary">{result.summary_vi}</p>
              {result.under_length && <p className="wr-warn">Bài ngắn hơn {result.min_words} từ nên điểm tiêu chí đầu bị trừ.</p>}
              {result.priorities_vi.length > 0 && (
                <>
                  <h2 className="heading-3" style={{ marginTop: 12 }}>Nên sửa trước</h2>
                  <ol className="wr-prio">{result.priorities_vi.map((p, i) => <li key={i}>{p}</li>)}</ol>
                </>
              )}
            </div>
          </section>

          <section className="wr-crit" aria-label="Điểm 4 tiêu chí">
            {CRIT_ORDER.map((k) => {
              const c = result.criteria[k];
              return (
                <article key={k} className="st-card wr-c">
                  <div className="wr-c-head">
                    <div><b>{c.name}</b><span className="meta">{CRIT_VI[k]}</span></div>
                    <span className="wr-c-band num" style={{ color: bandColor(c.band) }}>{c.band.toFixed(1)}</span>
                  </div>
                  <div className="bar" aria-hidden="true"><i style={{ width: `${(c.band / 9) * 100}%`, background: bandColor(c.band) }} /></div>
                  <p className="wr-c-note">{c.comment_vi}</p>
                  {c.strengths.length > 0 && <ul className="wr-list ok">{c.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>}
                  {c.improvements.length > 0 && <ul className="wr-list todo">{c.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>}
                </article>
              );
            })}
          </section>

          <section className="st-card" aria-labelledby="wr-sent-h">
            <div className="sec-head">
              <h2 id="wr-sent-h" className="sec-title">Sửa lỗi từng câu</h2>
              <label className="wr-toggle">
                <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
                Chỉ hiện câu cần sửa ({result.sentences.filter((s) => s.changed).length}/{result.sentences.length})
              </label>
            </div>
            {shown.length === 0 ? (
              <p className="meta">Không có câu nào cần sửa. Tốt lắm!</p>
            ) : (
              <ol className="wr-sents">
                {shown.map((s) => (
                  <li key={s.index} className="wr-s" data-changed={s.changed || undefined}>
                    <span className="wr-s-n num">{s.index + 1}</span>
                    <div className="wr-s-body">
                      <p className="wr-orig" lang="en">
                        {segments(s.original, s.issues).map((seg, i) => seg.issue
                          ? <mark key={i} className="wr-mark" data-type={seg.issue.type} title={ISSUE_LABEL[seg.issue.type] || seg.issue.type}>{seg.text}</mark>
                          : <span key={i}>{seg.text}</span>)}
                      </p>
                      {s.corrected !== s.original && <p className="wr-fix" lang="en"><span className="wr-tag">Gợi ý</span>{s.corrected}</p>}
                      {s.issues.length > 0 && (
                        <ul className="wr-issues">
                          {s.issues.map((iss, i) => (
                            <li key={i}>
                              <span className="wr-tag" data-type={iss.type}>{ISSUE_LABEL[iss.type] || iss.type}</span>
                              {iss.text && iss.suggestion && <span lang="en"><s>{iss.text}</s> → <b>{iss.suggestion}</b></span>}
                              {iss.explanation_vi && <span className="meta"> {iss.explanation_vi}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
