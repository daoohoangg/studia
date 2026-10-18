"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import ShareResult from "@/components/exam/ShareResult";
import { postJson } from "@/lib/examSession";
import { readNotes } from "@/lib/examNotes";
import type { CardResult } from "@/lib/shareCard";

export type Explanation = {
  explanation_vi: string; evidence?: string | null; tip_vi?: string; scored_by?: string; correct_answers?: string[];
};
export type Explainer = (skill: string, number: number) => Promise<Explanation>;

const serverExplainer = (sessionId: string): Explainer => async (skill, number) => {
  const res = await postJson(`/exam/sessions/${sessionId}/explain`, { skill, number });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Không tải được giải thích");
  return data as Explanation;
};

const SKILL_LABELS: Record<string, string> = {
  listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking",
};
const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple Choice", multiple_select: "Choose TWO/THREE letters", true_false_ng: "True / False / Not Given",
  yes_no_ng: "Yes / No / Not Given", matching_headings: "Matching Headings", matching_information: "Matching Information",
  matching_features: "Matching Features", sentence_completion: "Sentence Completion",
  summary_completion: "Summary Completion", note_completion: "Note Completion", table_completion: "Table Completion",
  form_completion: "Form Completion", flow_chart_completion: "Flow-chart Completion",
  diagram_labelling: "Diagram Labelling", map_labelling: "Map Labelling", short_answer: "Short Answer",
};

function BandRing({ band }: { band: number | null | undefined }) {
  const C = 465;
  const off = band == null ? C : C * (1 - Math.max(0, Math.min(9, band)) / 9);
  return (
    <div className="st-band" role="img" aria-label={`Overall band ${band == null ? "chưa có" : band.toFixed(1)} trên 9`} style={{ width: 160, height: 160, flexShrink: 0 }}>
      <svg width="160" height="160" viewBox="0 0 160 160" fill="none" aria-hidden="true">
        <circle className="st-band-track" cx="80" cy="80" r="74" strokeWidth="12" />
        <circle className="st-band-arc" cx="80" cy="80" r="74" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} />
      </svg>
      <div className="st-band-center"><div className="st-band-score" style={{ fontSize: 48 }}>{band == null ? "—" : band.toFixed(1)}</div><div className="st-band-label">Overall</div></div>
    </div>
  );
}

function SkillBox({ label, band, note, weak }: { label: string; band: number | null | undefined; note?: string; weak?: boolean }) {
  return (
    <div className="sr-skill" style={weak ? { background: "var(--warning-tint)", borderColor: "transparent" } : undefined}>
      <span className="label">{label}</span>
      <b className="sr-s num">{band == null ? "—" : Number(band).toFixed(1)}</b>
      {note && <span className="meta">{note}</span>}
    </div>
  );
}

const CRITERIA: [string, string][] = [
  ["task_response", "Task Response"], ["coherence_cohesion", "Coherence"],
  ["lexical_resource", "Lexical Resource"], ["grammatical_range_accuracy", "Grammar"],
];

export default function ServerResult({ result, onRetry, explain, sessionKey }: {
  result: any; onRetry: () => void; explain?: Explainer; sessionKey?: string;
}) {
  const sections = result.section_results || {};
  const explainer = useMemo<Explainer>(() => explain || serverExplainer(result.session_id), [explain, result.session_id]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [exps, setExps] = useState<Record<string, { loading?: boolean; error?: string; data?: Explanation }>>({});
  const [sharing, setSharing] = useState(false);
  const notes = useMemo(() => (typeof window === "undefined" ? [] : readNotes(sessionKey || result.session_id || "")), [sessionKey, result.session_id]);
  const practice = result.session_mode === "practice";

  const toggleExplain = async (skill: string, number: number) => {
    const id = `${skill}_${number}`;
    const nowOpen = !open[id];
    setOpen((o) => ({ ...o, [id]: nowOpen }));
    if (!nowOpen || exps[id]?.data || exps[id]?.loading) return;
    setExps((e) => ({ ...e, [id]: { loading: true } }));
    try {
      const data = await explainer(skill, number);
      setExps((e) => ({ ...e, [id]: { data } }));
    } catch (err: any) {
      setExps((e) => ({ ...e, [id]: { error: err?.message || "Không tải được giải thích" } }));
    }
  };
  const skills = ["listening", "reading"].filter((s) => sections[s]);
  const [reviewSkill, setReviewSkill] = useState<string>(skills.find(s => result.review?.[s]?.length) || skills[0] || "listening");
  const [onlyWrong, setOnlyWrong] = useState(true);
  const allReview: any[] = result.review?.[reviewSkill] || [];
  const review = allReview.filter((i: any) => !onlyWrong || !i.is_correct);
  const analysis = result.ai_analysis || {};
  const writing = sections.writing;
  const materials = result.materials || {};
  const [wTask, setWTask] = useState<"task1" | "task2">("task2");

  const bands: { key: string; band: number | null | undefined }[] = [
    ...skills.map(s => ({ key: s, band: sections[s].band })),
    ...(writing ? [{ key: "writing", band: writing.band }] : []),
  ];
  const scored = bands.filter(b => b.band != null);
  const weakest = scored.length > 1 ? scored.reduce((a, b) => (Number(b.band) < Number(a.band) ? b : a)) : null;
  const strongest = scored.length > 1 ? scored.reduce((a, b) => (Number(b.band) > Number(a.band) ? b : a)) : null;
  const typeRows: any[] = [...(analysis.weak_types || [])];
  const task = writing?.[wTask] || {};
  const date = result.submitted_at || result.updated_at || result.created_at;
  const card: CardResult = {
    title: result.title || "IELTS Mock Test",
    overall: result.overall_band != null ? Number(result.overall_band) : null,
    skills: [
      ...skills.map((s) => ({ label: SKILL_LABELS[s], band: sections[s].band ?? null, note: `${sections[s].raw_score}/${sections[s].total}` })),
      ...(writing ? [{ label: "Writing", band: writing.band ?? null }] : []),
    ],
    date: new Date(date || Date.now()).toLocaleDateString("vi-VN"),
    modeLabel: practice ? "Luyện tập" : "Thi thật",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", padding: "32px 16px 48px" }}>
      <div className="wrap stagger" style={{ maxWidth: 1040 }}>
        <header className="page-head">
          <div>
            <div className="eyebrow" style={{ color: result.status === "AUTO_SUBMITTED" ? "var(--warning)" : "var(--ink-muted)" }}>
              {result.status === "AUTO_SUBMITTED" ? "Bài đã tự nộp khi hết giờ" : "Kết quả bài thi"}{date ? ` · ${new Date(date).toLocaleDateString("vi-VN")}` : ""}
            </div>
            <h1 className="page-title" style={{ marginTop: 4 }}>{result.title || "IELTS Mock Test"}</h1>
            {result.session_mode && <span className={practice ? "st-badge st-badge-accent" : "st-badge st-badge-brand"} style={{ marginTop: 8 }}>{practice ? "Phòng luyện tập" : "Mô phỏng thi thật"}</span>}
          </div>
          <div className="row-wrap" style={{ gap: 8 }}>
            <button className="st-btn st-btn-secondary" type="button" onClick={() => setSharing(true)}>Chụp ảnh kết quả</button>
            <Link className="st-btn st-btn-secondary" href="/feedback">Xem phân tích lỗi</Link>
            <button className="st-btn st-btn-primary" type="button" onClick={onRetry}>Làm đề khác</button>
          </div>
        </header>

        <section className="st-card row-wrap" style={{ gap: 32, alignItems: "center", padding: "28px 32px" }} aria-label="Điểm tổng">
          <BandRing band={result.overall_band} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 className="heading-2">
              {result.overall_band == null ? "Chưa quy ra band tổng cho phần đã chọn." : strongest && weakest && strongest.key !== weakest.key
                ? `${SKILL_LABELS[strongest.key]} là điểm mạnh, ${SKILL_LABELS[weakest.key]} cần luyện thêm.`
                : `Overall band ${Number(result.overall_band).toFixed(1)}.`}
            </h2>
            <p className="ink2" style={{ marginTop: 6, maxWidth: 560 }}>
              {analysis.summary_vi || analysis.summary || "Overall chỉ tính các phần đã được chấm. Xem bảng bên dưới để biết bạn mất điểm ở dạng câu hỏi nào."}
            </p>
          </div>
        </section>

        <section className="grid-4" aria-label="Điểm từng kỹ năng">
          {skills.map(s => (
            <SkillBox key={s} label={SKILL_LABELS[s]} band={sections[s].band} note={sections[s].band == null ? `${sections[s].answered ?? 0}/${sections[s].total} câu đã trả lời` : `${sections[s].raw_score}/${sections[s].total} câu đúng`} weak={weakest?.key === s} />
          ))}
          {writing && <SkillBox label="Writing" band={writing.band} weak={weakest?.key === "writing"}
            note={writing.scored_by === "ai" ? "Chấm bằng AI · 2 task" : writing.band == null ? "Chưa chấm tự động" : "Ước lượng theo độ dài"} />}
          {sections.speaking && <SkillBox label="Speaking" band={null} note="Chưa chấm tự động" />}
        </section>

        {(typeRows.length > 0 || writing) && (
          <div className="split">
            {typeRows.length > 0 && (
              <section className="st-card" aria-labelledby="qt-h">
                <div className="sec-head"><h2 id="qt-h" className="sec-title">Theo dạng câu hỏi</h2><span className="meta">Listening + Reading</span></div>
                <div>
                  {typeRows.map((w: any) => {
                    const pct = w.total ? Math.round((w.correct / w.total) * 100) : 0;
                    const color = pct >= 80 ? "var(--success)" : pct >= 60 ? undefined : pct >= 50 ? "var(--accent-strong)" : "var(--danger)";
                    return (
                      <div key={w.type} className="sr-qt">
                        <div style={{ minWidth: 0 }}>
                          <div>{w.label || TYPE_LABELS[w.type] || w.type}</div>
                          {w.advice && <p className="meta" style={{ marginTop: 2 }}>{w.advice}</p>}
                        </div>
                        <div className="bar"><i style={{ width: `${pct}%`, background: color }} /></div>
                        <b className="num" style={{ textAlign: "right" }}>{w.correct}/{w.total}</b>
                      </div>
                    );
                  })}
                </div>
                {analysis.strengths?.length > 0 && <p className="meta" style={{ marginTop: 12, color: "var(--success)" }}>Điểm mạnh: {analysis.strengths.join(" · ")}</p>}
              </section>
            )}
            {writing && (
              <section className="st-card" aria-labelledby="w-h">
                <div className="sec-head" style={{ marginBottom: 12 }}>
                  <h2 id="w-h" className="heading-3" style={{ margin: 0 }}>Writing · nhận xét</h2>
                  <div className="seg" role="tablist" aria-label="Task">
                    {(["task1", "task2"] as const).map(k => <button key={k} className="seg-btn" type="button" role="tab" aria-selected={wTask === k} onClick={() => setWTask(k)}>{k === "task1" ? "Task 1" : "Task 2"}</button>)}
                  </div>
                </div>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="meta num">{task.words ?? 0} từ · tối thiểu {task.min_words ?? (wTask === "task1" ? 150 : 250)}</span>
                  {task.band !== undefined && task.scored_by !== "none" && <span className="st-badge st-badge-brand">Band {Number(task.band).toFixed(1)}</span>}
                </div>
                {task.criteria ? (
                  <div className="stack" style={{ gap: 10, fontSize: 14.5 }}>
                    {CRITERIA.map(([k, label]) => {
                      const v = task.criteria[k];
                      const low = typeof v === "number" && task.band != null && v < Number(task.band);
                      return <div key={k} className="row" style={{ justifyContent: "space-between" }}><b style={{ fontWeight: 600 }}>{label}</b><b className="num" style={{ color: low ? "var(--warning)" : undefined }}>{v ?? "—"}</b></div>;
                    })}
                  </div>
                ) : <p className="meta">Task này chưa được chấm chi tiết theo tiêu chí.</p>}
                {task.feedback_vi && <p className="ink2" style={{ marginTop: 14, fontSize: 14.5 }}>{task.feedback_vi}</p>}
              </section>
            )}
          </div>
        )}

        {skills.length > 0 && (
          <section aria-labelledby="rv-h">
            <div className="sec-head">
              <h2 id="rv-h" className="sec-title">Xem lại từng câu</h2>
              <div className="row-wrap" style={{ gap: 10 }}>
                {skills.length > 1 && (
                  <div className="seg" role="tablist" aria-label="Kỹ năng">
                    {skills.map(s => <button key={s} className="seg-btn" type="button" role="tab" aria-selected={s === reviewSkill} onClick={() => setReviewSkill(s)}>{SKILL_LABELS[s]}</button>)}
                  </div>
                )}
                <label className="row" style={{ gap: 8, cursor: "pointer" }}>
                  <span className={`check ${onlyWrong ? "check-on" : ""}`} aria-hidden="true">{onlyWrong && <Check size={14} strokeWidth={3} />}</span>
                  <input type="checkbox" className="st-sr" checked={onlyWrong} onChange={e => setOnlyWrong(e.target.checked)} />
                  <span className="label">Chỉ câu sai</span>
                </label>
              </div>
            </div>
            <div className="table-box">
              <table className="table">
                <thead><tr><th scope="col">Câu</th><th scope="col">Dạng</th><th scope="col">Bạn trả lời</th><th scope="col">Đáp án</th><th scope="col">Kết quả</th><th scope="col"><span className="st-sr">Giải thích</span></th></tr></thead>
                <tbody>
                  {review.map((item: any) => {
                    const id = `${reviewSkill}_${item.number}`;
                    const ex = exps[id];
                    return (
                      <Fragment key={item.number}>
                        <tr className={`ex-row ${item.is_correct ? "" : "row-wrong"}`}>
                          <td className="num">{item.number}</td>
                          <td title={item.question}>{TYPE_LABELS[item.type] || item.type}</td>
                          <td>{String(item.user_answer || "") || <i className="muted">(bỏ trống)</i>}</td>
                          <td style={{ color: "var(--ink)", fontWeight: 600 }}>{(item.correct_answers || []).join(" / ")}</td>
                          <td style={{ fontWeight: 650, color: item.is_correct ? "var(--success)" : "var(--danger)" }}>{item.is_correct ? "✓ Đúng" : "✕ Sai"}</td>
                          <td style={{ textAlign: "right" }}>
                            <button type="button" className="ex-btn" aria-expanded={!!open[id]} onClick={() => toggleExplain(reviewSkill, item.number)}>
                              {open[id] ? "Ẩn giải thích" : "Giải thích"}
                            </button>
                          </td>
                        </tr>
                        {open[id] && (
                          <tr>
                            <td colSpan={6} style={{ paddingTop: 0 }}>
                              <div className="ex-panel" role="region" aria-label={`Giải thích câu ${item.number}`}>
                                {item.question && <span className="meta">Câu {item.number}: {item.question}</span>}
                                {ex?.loading && <span className="meta">Đang soạn giải thích…</span>}
                                {ex?.error && <span role="alert" style={{ color: "var(--danger)", fontSize: 14 }}>{ex.error}</span>}
                                {ex?.data && (
                                  <>
                                    <p>{ex.data.explanation_vi}</p>
                                    {ex.data.evidence && <blockquote>{ex.data.evidence}</blockquote>}
                                    {ex.data.tip_vi && <p className="ex-tip"><b style={{ fontWeight: 600 }}>Mẹo làm dạng này:</b> {ex.data.tip_vi}</p>}
                                    <span className="meta">{ex.data.scored_by === "ai" ? "Giải thích do AI viết, câu bằng chứng đã được đối chiếu với bài." : "Giải thích tự động theo đáp án và nội dung bài."}</span>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {review.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink-muted)", padding: 20 }}>{onlyWrong && allReview.length ? "Không có câu sai nào ở phần này." : "Không có câu nào để hiển thị."}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {notes.length > 0 && (
          <section className="st-card" aria-labelledby="nt-h">
            <h2 id="nt-h" className="sec-title" style={{ marginBottom: 8 }}>Ghi chú của bạn trong lúc làm bài</h2>
            {notes.map((n) => (
              <div key={n.id} className="sr-det">
                {n.quote && <p className="meta" style={{ fontStyle: "italic" }}>“{n.quote}”</p>}
                {n.text && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{n.text}</p>}
              </div>
            ))}
          </section>
        )}

        {(materials.audioscripts?.length > 0 || materials.sample_answers?.length > 0) && (
          <section className="st-card" aria-labelledby="m-h">
            <h2 id="m-h" className="sec-title" style={{ marginBottom: 8 }}>Học liệu của đề</h2>
            {materials.audioscripts?.map((m: any) => (
              <details key={`a${m.part}`} className="sr-det">
                <summary>Audioscript · Part {m.part || "?"}</summary>
                <p className="passage-sm" style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
              </details>
            ))}
            {materials.sample_answers?.map((m: any) => (
              <details key={`s${m.task}`} className="sr-det">
                <summary>Bài mẫu · Writing Task {m.task || "?"}</summary>
                <p className="passage-sm" style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
              </details>
            ))}
          </section>
        )}
      </div>
      {sharing && <ShareResult card={card} onClose={() => setSharing(false)} />}
    </div>
  );
}
