"use client";

import ProcessingPipeline from "@/components/ProcessingPipeline";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";

import { API, apiFetch } from "@/lib/api";
import { ChevronLeft, ArrowRight, Check, Layers, MessageCircle, Target } from "lucide-react";

const difficultyColor = (d: number) =>
  d <= 1 ? "var(--success)" : d <= 2 ? "var(--brand)" : d <= 3 ? "var(--brand)" : d <= 4 ? "var(--accent-strong)" : "var(--danger)";

export default function BookDetailPage() {
  const params = useParams();
  const bookId = params.id as string;
  const [book, setBook] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingGoal, setSettingGoal] = useState(false);
  const [goalData, setGoalData] = useState({ goal_description: "Học hiểu toàn bộ nội dung sách", daily_minutes: 45, deadline_days: 30 });
  const [goalResult, setGoalResult] = useState<any>(null);
  const [goalLoading, setGoalLoading] = useState(false);

  useEffect(() => {
    if (bookId) fetchBookData();
  }, [bookId]);

  const fetchBookData = async () => {
    try {
      const [statusRes, topicsRes] = await Promise.all([
        apiFetch(`${API}/documents/${bookId}/status`),
        apiFetch(`${API}/documents/${bookId}/topics`)
      ]);
      if (statusRes.ok) setBook(await statusRes.json());
      if (topicsRes.ok) {
        const data = await topicsRes.json();
        setTopics(data.topics || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Tệp gốc nằm trong bucket riêng tư: xin signed URL ngắn hạn rồi mới mở
  const openOriginalPdf = async () => {
    const tab = window.open("", "_blank");
    try {
      const res = await apiFetch(`${API}/documents/${bookId}/file-url`);
      if (!res.ok) throw new Error(String(res.status));
      const { url } = await res.json();
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (e) {
      tab?.close();
      console.error(e);
      alert("Không mở được tệp gốc.");
    }
  };

  const handleSetGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalLoading(true);
    try {
      const res = await apiFetch(`${API}/learning-paths/set-goal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: bookId, ...goalData })
      });
      const data = await res.json();
      if (res.ok) {
        setGoalResult(data);
        setSettingGoal(false);
      }
    } catch { /* ignore */ }
    setGoalLoading(false);
  };

  if (loading) return (
    <div className="wrap">
      <div className="skeleton" style={{ height: 120 }} />
      <div className="split"><div className="skeleton" style={{ height: 360 }} /><div className="skeleton" style={{ height: 360 }} /></div>
    </div>
  );

  if (!book) return (
    <div className="wrap-narrow">
      <EmptyState title="Không tìm thấy tài liệu này" description="Tài liệu có thể đã bị xoá hoặc đường dẫn không đúng." primary={{ label: "Về thư viện", href: "/books" }} />
    </div>
  );

  const ready = book.processing_status === "completed";
  const days = Number(goalData.deadline_days) || 0;
  const perTopic = topics.length ? Math.max(1, Math.floor(days / topics.length)) : 0;

  return (
    <div className="wrap stagger">
      <header>
        <Link className="crumb" href="/books"><ChevronLeft size={16} strokeWidth={2} />Thư viện sách</Link>
        <div className="page-head">
          <div style={{ maxWidth: 640 }}>
            <div className="row-wrap" style={{ marginBottom: 10 }}>
              <span className={ready ? "st-badge st-badge-success" : "st-badge st-badge-brand"}>{ready ? "Sẵn sàng" : "Đang xử lý"}</span>
              <span className="st-badge">{book.topic_count ?? topics.length} chủ đề</span>
            </div>
            <h1 className="page-title">{book.title}</h1>
          </div>
          <div className="row-wrap">
            {book.file_path && <button className="st-btn st-btn-ghost" type="button" onClick={openOriginalPdf}>Mở tệp gốc</button>}
            <Link className="st-btn st-btn-secondary" href={`/books/${bookId}/exam-builder`}>Dựng đề thi</Link>
            <Link className="st-btn st-btn-primary" href={`/books/${bookId}/read`}>Đọc sách <ArrowRight className="st-btn-arrow" size={18} strokeWidth={2} /></Link>
          </div>
        </div>
      </header>

      {goalResult && (
        <div role="status" className="st-enter" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: "var(--radius-md)", background: "var(--success-tint)", flexWrap: "wrap" }}>
          <span className="tile tile-sm tile-success" aria-hidden="true" style={{ background: "var(--surface)" }}><Check size={16} strokeWidth={2.4} /></span>
          <span style={{ flex: 1, color: "var(--ink)" }}><b style={{ fontWeight: 600 }}>Đã tạo lịch học.</b> {goalResult.plan_days} ngày học · hạn chót {goalResult.deadline_date}</span>
          <Link className="st-btn st-btn-primary st-btn-sm" href="/">Học bài hôm nay</Link>
          <Link className="st-btn st-btn-ghost st-btn-sm" href="/plan">Xem lịch</Link>
        </div>
      )}

      <div className="split">
        <section aria-labelledby="tp-h">
          <div className="sec-head"><h2 id="tp-h" className="sec-title">Chủ đề trong sách</h2><span className="meta">Học theo thứ tự gợi ý</span></div>
          {topics.length === 0 ? (
            book.processing_status === "processing" || book.processing_status === "pending" || book.processing_status === "failed" ? (
              <ProcessingPipeline bookId={bookId} initial={book} onDone={fetchBookData} onRetry={async () => { await apiFetch(`${API}/documents/${bookId}/reprocess`, { method: "POST" }); fetchBookData(); }} />
            ) : (
              <EmptyState compact title="Chưa tách được chủ đề nào" description="Tài liệu có thể quá ngắn hoặc là bản scan ảnh. Hãy thử bản có chữ chọn được." primary={{ label: "Về thư viện", href: "/books" }} />
            )
          ) : (
            <div className="st-card" style={{ padding: 0, overflow: "hidden" }}>
              {topics.map((topic: any, idx: number) => (
                <div key={topic.id} style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) auto", gap: 14, alignItems: "center", padding: "14px 16px", borderTop: idx ? "1px solid var(--hairline)" : "none" }}>
                  <span className="tile tile-sm" style={{ background: "var(--surface-sunken)", color: "var(--ink-muted)" }} aria-hidden="true"><span className="num" style={{ font: "650 12px/1 var(--font-sans)" }}>{idx + 1}</span></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="lrow-title">{topic.name}</div>
                    <div className="meta row" style={{ gap: 8, marginTop: 2 }}>
                      <span>Độ khó</span>
                      <span style={{ display: "inline-flex", gap: 3 }} aria-label={`${topic.difficulty_level} trên 5`}>
                        {[1, 2, 3, 4, 5].map((n) => <i key={n} style={{ width: 6, height: 14, borderRadius: 2, background: n <= topic.difficulty_level ? difficultyColor(topic.difficulty_level) : "var(--hairline)" }} />)}
                      </span>
                    </div>
                    {topic.description && <p className="meta" style={{ marginTop: 4, color: "var(--ink-secondary)" }}>{topic.description}</p>}
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <Link className="st-btn st-btn-ghost st-btn-sm" href={`/tutor?topic=${topic.id}&doc=${bookId}`}>Hỏi AI</Link>
                    <Link className="st-btn st-btn-secondary st-btn-sm" href={`/lesson/${topic.id}?doc=${bookId}`}>Học</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="stack" style={{ gap: 16 }}>
          {!goalResult && ready && (
            <section className="st-card" aria-labelledby="goal-h">
              <h2 id="goal-h" className="heading-3">Lên lịch học từ sách này</h2>
              <p className="meta" style={{ marginTop: 4 }}>Studia chia chủ đề vào từng ngày theo thời gian bạn có.</p>
              <form onSubmit={handleSetGoal} className="stack" style={{ gap: 14, marginTop: 16 }}>
                <label className="field"><span className="field-label">Mục tiêu của bạn</span>
                  <input className="input" value={goalData.goal_description} onChange={(e) => setGoalData((p) => ({ ...p, goal_description: e.target.value }))} placeholder="Ví dụ: Đạt IELTS 6.5 trong 3 tháng" />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <label className="field"><span className="field-label">Phút mỗi ngày</span>
                    <input className="input num" type="number" min={15} max={180} value={goalData.daily_minutes} onChange={(e) => setGoalData((p) => ({ ...p, daily_minutes: parseInt(e.target.value) || 0 }))} />
                  </label>
                  <label className="field"><span className="field-label">Xong trong (ngày)</span>
                    <input className="input num" type="number" min={7} max={90} value={goalData.deadline_days} onChange={(e) => setGoalData((p) => ({ ...p, deadline_days: parseInt(e.target.value) || 0 }))} />
                  </label>
                </div>
                {topics.length > 0 && days > 0 && (
                  <p className="meta" style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "var(--surface-sunken)" }}>
                    Ước tính: {topics.length} chủ đề · khoảng {perTopic} ngày mỗi chủ đề · {goalData.daily_minutes} phút/ngày.
                  </p>
                )}
                <button type="submit" className="st-btn st-btn-primary st-btn-block" disabled={goalLoading} aria-busy={goalLoading || undefined}>
                  {goalLoading ? <><span className="st-spinner" /> Đang tạo lịch…</> : "Tạo lịch học"}
                </button>
              </form>
            </section>
          )}

          <section className="st-card" aria-labelledby="qa-h">
            <h2 id="qa-h" className="heading-3" style={{ marginBottom: 12 }}>Học thêm từ sách</h2>
            <div className="stack" style={{ gap: 8 }}>
              <Link className="lrow" href={`/flashcards?doc=${bookId}`}><span className="tile tile-sm" aria-hidden="true"><Layers size={16} strokeWidth={1.75} /></span><span style={{ flex: 1 }}><span className="lrow-title" style={{ display: "block", fontSize: 14.5 }}>Ôn flashcard</span><span className="meta">Tạo tự động từ sách</span></span></Link>
              <Link className="lrow" href={`/tutor?doc=${bookId}`}><span className="tile tile-sm" aria-hidden="true"><MessageCircle size={16} strokeWidth={1.75} /></span><span style={{ flex: 1 }}><span className="lrow-title" style={{ display: "block", fontSize: 14.5 }}>Hỏi trợ lý AI về sách</span><span className="meta">Trả lời kèm trích dẫn</span></span></Link>
              <Link className="lrow" href={`/books/${bookId}/exam-builder`}><span className="tile tile-sm" aria-hidden="true"><Target size={16} strokeWidth={1.75} /></span><span style={{ flex: 1 }}><span className="lrow-title" style={{ display: "block", fontSize: 14.5 }}>Dựng đề thi từ sách</span><span className="meta">Listening, Reading, Writing, Speaking</span></span></Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
