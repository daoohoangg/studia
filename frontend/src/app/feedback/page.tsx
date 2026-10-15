"use client";

import { useState, useEffect } from "react";
import EmptyState from "@/components/EmptyState";

import { API, apiFetch } from "@/lib/api";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

const ERROR_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  vocabulary: { label: "Từ vựng", color: "var(--brand)" },
  grammar: { label: "Ngữ pháp", color: "var(--accent-strong)" },
  comprehension: { label: "Hiểu bài", color: "var(--plum)" },
  pronunciation: { label: "Phát âm", color: "var(--brand)" },
  sentence_structure: { label: "Cấu trúc câu", color: "var(--success)" },
};

export default function FeedbackPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [generatingExercises, setGeneratingExercises] = useState(false);
  const [remedialData, setRemedialData] = useState<any>(null);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/feedback/report?min_occurrences=1`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleGenerateRemedial = async () => {
    if (!report?.recent_errors?.length) return;
    setGeneratingExercises(true);
    try {
      const res = await apiFetch(`${API}/feedback/remedial-exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: report.recent_errors[0]?.topic_id || "default",
          topic_name: "Ôn tập từ lỗi hay gặp",
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRemedialData(data);
      }
    } catch { /* ignore */ }
    setGeneratingExercises(false);
  };

  const [catFilter, setCatFilter] = useState<string>("all");
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  if (loading) return (
    <div className="wrap">
      <div className="skeleton" style={{ height: 64 }} />
      <div className="grid-3">{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 110 }} />)}</div>
      <div className="skeleton" style={{ height: 320 }} />
    </div>
  );

  const analysis = report?.analysis;
  const categories: any[] = analysis?.error_categories || [];
  const recent: any[] = report?.recent_errors || [];
  const maxCount = Math.max(1, ...categories.map((c: any) => c.count || 0));
  const topCat = categories.slice().sort((a, b) => (b.count || 0) - (a.count || 0))[0];
  const shownErrors = recent
    .filter(e => catFilter === "all" || e.error_type === catFilter)
    .sort((a, b) => (b.occurrence_count || 0) - (a.occurrence_count || 0))
    .slice(0, 8);
  const recs: any[] = analysis?.recommendations || [];
  const hasData = !!report?.total_recurring_errors || recent.length > 0;

  return (
    <div className="wrap stagger">
      <header className="page-head">
        <div>
          <h1 className="page-title">Phân tích lỗi</h1>
          <p className="page-sub">Gom lỗi từ quiz, thi thử và hội thoại để biết chính xác bạn cần luyện gì.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="icon-btn" type="button" aria-label="Làm mới" onClick={fetchReport}><RefreshCw size={18} strokeWidth={1.75} /></button>
          <button className="st-btn st-btn-primary" type="button" onClick={handleGenerateRemedial} disabled={generatingExercises || !hasData}>
            {generatingExercises ? <><span className="st-spinner" />Đang tạo bài tập…</> : "Tạo bài tập khắc phục"}
          </button>
        </div>
      </header>

      {!hasData ? (
        <EmptyState
          title="Chưa có lỗi nào được ghi nhận"
          description="Lỗi xuất hiện khi bạn làm quiz, thi thử hoặc luyện hội thoại. Lỗi lặp lại sẽ được gom lại ở đây để tạo bài tập khắc phục."
          primary={{ label: "Làm một đề IELTS", href: "/exam" }}
          secondary={{ label: "Luyện hội thoại", href: "/scenarios" }}
        />
      ) : (
        <>
          <section className="grid-3" aria-label="Tổng quan">
            <div className="st-stat"><span className="meta">Lỗi lặp lại</span><span className="st-stat-value num" style={{ color: "var(--accent-strong)" }}>{report?.total_recurring_errors || 0}</span><span className="st-stat-hint">Sai từ 2 lần trở lên</span></div>
            <div className="st-stat"><span className="meta">Nhóm lỗi</span><span className="st-stat-value num">{report?.total_error_types || categories.length}</span><span className="st-stat-hint">{topCat ? `${(ERROR_TYPE_CONFIG[topCat.category]?.label || topCat.label)} chiếm nhiều nhất` : "—"}</span></div>
            <div className="st-stat"><span className="meta">Gợi ý cải thiện</span><span className="st-stat-value num" style={{ color: "var(--success)" }}>{recs.length}</span><span className="st-stat-hint">Ưu tiên theo mức ảnh hưởng</span></div>
          </section>

          {analysis?.summary && (
            <section className="st-card" style={{ borderLeft: "3px solid var(--brand)" }}>
              <div className="eyebrow" style={{ color: "var(--brand)" }}>Nhận xét chung</div>
              <p className="ink2" style={{ marginTop: 6 }}>{analysis.summary}</p>
            </section>
          )}

          <div className="split">
            <div className="stack" style={{ gap: 16 }}>
              {categories.length > 0 && (
                <section className="st-card" aria-labelledby="c-h">
                  <div className="sec-head"><h2 id="c-h" className="sec-title">Phân loại lỗi</h2><span className="meta">Bấm để lọc</span></div>
                  <div className="stack" style={{ gap: 6 }}>
                    {categories.map((cat: any) => {
                      const cfg = ERROR_TYPE_CONFIG[cat.category] || { label: cat.label, color: "var(--brand)" };
                      const on = catFilter === cat.category;
                      return (
                        <button key={cat.category} type="button" className="fb-cat" aria-pressed={on} onClick={() => setCatFilter(on ? "all" : cat.category)}>
                          <span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: cfg.color }} />{cfg.label}</span>
                          <span className="bar"><i style={{ width: `${((cat.count || 0) / maxCount) * 100}%`, background: cfg.color }} /></span>
                          <b className="num" style={{ textAlign: "right" }}>{cat.count} lần</b>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="st-card" aria-labelledby="r-h">
                <div className="sec-head">
                  <h2 id="r-h" className="sec-title">Lỗi hay lặp lại</h2>
                  {catFilter !== "all" && <button className="st-chip" type="button" aria-pressed onClick={() => setCatFilter("all")}>{ERROR_TYPE_CONFIG[catFilter]?.label || catFilter} ✕</button>}
                </div>
                {shownErrors.length === 0 ? <p className="meta">Chưa có lỗi chi tiết cho nhóm này.</p> : (
                  <div>
                    {shownErrors.map((err, i) => {
                      const cfg = ERROR_TYPE_CONFIG[err.error_type] || { label: err.error_type, color: "var(--brand)" };
                      return (
                        <div key={i} className="fb-err">
                          <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                            <span className="st-badge" style={{ background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`, color: cfg.color }}>{cfg.label}</span>
                            <span className="meta num">{err.occurrence_count || 1} lần{err.source ? ` · ${err.source}` : ""}</span>
                          </div>
                          {err.user_input && (
                            <p className="passage-sm" style={{ marginTop: 8 }}><s>{err.user_input}</s>{err.correct_form && <> → <ins>{err.correct_form}</ins></>}</p>
                          )}
                          {err.error_detail && <p className="meta" style={{ marginTop: 4 }}>{err.error_detail}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="stack" style={{ gap: 16 }}>
              {recs.length > 0 && (
                <section className="st-card" aria-labelledby="g-h">
                  <h2 id="g-h" className="heading-3" style={{ marginBottom: 14 }}>Nên làm gì tiếp</h2>
                  <ol className="stack" style={{ gap: 14, listStyle: "none", padding: 0, margin: 0 }}>
                    {recs.map((rec: any, i: number) => (
                      <li key={i} className="fb-rec">
                        <b className="fb-n" style={rec.priority === "high" ? { background: "var(--accent)", color: "var(--on-accent)" } : undefined}>{i + 1}</b>
                        <div><div style={{ fontWeight: 600 }}>{rec.title}</div>{rec.description && <p className="meta" style={{ marginTop: 2 }}>{rec.description}</p>}</div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {remedialData?.exercises?.length > 0 ? (
                <section className="st-card" aria-labelledby="ex-h">
                  <div className="sec-head"><h2 id="ex-h" className="heading-3" style={{ margin: 0 }}>Bài tập khắc phục</h2><span className="meta num">{remedialData.exercises.length} câu</span></div>
                  <div className="stack" style={{ gap: 12 }}>
                    {remedialData.exercises.map((ex: any, i: number) => (
                      <div key={i} style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface-sunken)" }}>
                        <div className="row-wrap" style={{ gap: 6, marginBottom: 8 }}>
                          {ex.exercise_type && <span className="st-badge st-badge-brand">{ex.exercise_type}</span>}
                          {ex.target_error && <span className="st-badge st-badge-warning">{ex.target_error}</span>}
                        </div>
                        <p className="passage-sm" style={{ color: "var(--ink)" }}>{ex.question_text}</p>
                        {revealed[i] ? (
                          <div className="st-enter" style={{ marginTop: 8 }}>
                            {ex.correct_answer && <div style={{ color: "var(--success)", fontWeight: 600 }}>{ex.correct_answer}</div>}
                            {ex.explanation && <p className="meta" style={{ marginTop: 4 }}>{ex.explanation}</p>}
                          </div>
                        ) : (
                          <button className="st-btn st-btn-ghost st-btn-sm" type="button" style={{ marginTop: 8, paddingLeft: 0 }} onClick={() => setRevealed(r => ({ ...r, [i]: true }))}>Xem đáp án</button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="navy-block" aria-labelledby="ex-h">
                  <div className="eyebrow" style={{ color: "var(--on-navy)", opacity: 0.75 }}>Bài tập khắc phục</div>
                  <h2 id="ex-h" className="heading-3" style={{ color: "var(--on-navy)", marginTop: 6 }}>Luyện đúng những lỗi bạn hay mắc</h2>
                  <p style={{ marginTop: 8, color: "var(--on-navy)", opacity: 0.85, fontSize: 14.5 }}>AI tạo một bộ câu hỏi ngắn nhắm vào các lỗi lặp lại ở trên.</p>
                  <div className="row-wrap" style={{ marginTop: 14, gap: 8 }}>
                    <button className="st-btn st-btn-accent" type="button" onClick={handleGenerateRemedial} disabled={generatingExercises}>{generatingExercises ? <span className="st-spinner" /> : null}Tạo bài tập</button>
                    <Link className="st-btn st-btn-ghost" href="/vocabulary" style={{ color: "var(--on-navy)" }}>Xem từ vựng</Link>
                  </div>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
