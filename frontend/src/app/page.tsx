"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import CountUp from "@/components/CountUp";
import { Flame, Target, BookOpen, Layers, ArrowRight } from "lucide-react";

import { API, apiFetch } from "@/lib/api";
import { fetchServerProfile } from "@/lib/placement";

const greetings = () => {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
};

export default function HomePage() {
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchTodayPlan();
  }, []);

  const fetchTodayPlan = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/learning-paths/today`);
      if (res.ok) {
        const d = await res.json();
        setTodayData(d);
        const done = new Set<number>();
        (d.tasks || []).forEach((t: any, i: number) => { if (t.status === "completed") done.add(i); });
        setCompletedTasks(done);
      }
    } catch {
      // Fallback data
      setTodayData({
        has_plan: false,
        streak_days: 0,
        total_minutes: 0,
        tasks: [],
        knowledge_profile: { overall_mastery: 0, total_topics: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (idx: number) => {
    const willDone = !completedTasks.has(idx);
    setCompletedTasks(prev => {
      const next = new Set(prev);
      willDone ? next.add(idx) : next.delete(idx);
      return next;
    });
    const date = todayData?.plan_date;
    if (date && todayData?.has_plan) {
      apiFetch(`${API}/learning-paths/plans/${date}/tasks/${idx}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: willDone ? "completed" : "pending" }),
      }).catch(() => {});
    }
  };

  const tasks = todayData?.tasks || [];
  const [setupInfo, setSetupInfo] = useState<{ goal: boolean; placement: boolean; books: boolean }>({ goal: false, placement: false, books: false });
  useEffect(() => {
    fetchServerProfile().then((r) => setSetupInfo((x) => ({ ...x, goal: Boolean(r.profile?.completedAt), placement: Boolean(r.placement) })));
    apiFetch(`${API}/documents/`).then(async (r) => { if (r.ok) { const d = await r.json(); const l = Array.isArray(d) ? d : d.documents || []; setSetupInfo((x) => ({ ...x, books: l.length > 0 })); } }).catch(() => {});
  }, []);
  const setupSteps = [
    { title: "Đặt mục tiêu band", desc: "Band mong muốn, ngày thi, thời gian học mỗi ngày", done: setupInfo.goal, href: "/onboarding", cta: "Thiết lập" },
    { title: "Kiểm tra trình độ", desc: "24 câu · 12 phút · biết mình đang ở đâu", done: setupInfo.placement, href: "/placement", cta: "Làm ngay" },
    { title: "Thêm cuốn sách đầu tiên", desc: "PDF đề Cambridge, sách từ vựng, giáo trình…", done: setupInfo.books, href: "/books", cta: "Tải sách" },
    { title: "Tạo lịch học", desc: "Studia chia sách thành bài học theo ngày", done: false, href: "/plan", cta: "Mở lịch" },
  ];
  const setupDone = setupSteps.filter((x) => x.done).length;
  const streak = todayData?.streak_days || 0;
  const totalMin = todayData?.total_minutes || 0;
  const profile = todayData?.knowledge_profile || {};
  const doneTasks = completedTasks.size;
  const progressPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  // Lần thi gần nhất + số thẻ đến hạn cho cột phải
  const [lastExam, setLastExam] = useState<any>(null);
  const [dueCards, setDueCards] = useState<number | null>(null);
  useEffect(() => {
    apiFetch(`${API}/exam/sessions?limit=5`).then(async (r) => {
      if (!r.ok) return;
      const list = (await r.json()).sessions || [];
      setLastExam(list.find((s: any) => s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED") || null);
    }).catch(() => {});
    apiFetch(`${API}/flashcards/due?limit=20`).then(async (r) => {
      if (r.ok) setDueCards(((await r.json()).flashcards || []).length);
    }).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="wrap">
        <div className="skeleton" style={{ height: 88 }} />
        <div className="grid-3"><div className="skeleton" style={{ height: 128 }} /><div className="skeleton" style={{ height: 128 }} /><div className="skeleton" style={{ height: 128 }} /></div>
        <div className="split"><div className="skeleton" style={{ height: 320 }} /><div className="skeleton" style={{ height: 320 }} /></div>
      </div>
    );
  }

  const mastery = Number(profile.overall_mastery || 0);
  const topics: any[] = profile.topics || [];
  const weak = [...topics].filter((t) => t.mastery_score < 50).sort((a, b) => a.mastery_score - b.mastery_score).slice(0, 3);
  const nextIdx = tasks.findIndex((_: any, i: number) => !completedTasks.has(i));
  const nextTask = nextIdx >= 0 ? tasks[nextIdx] : null;
  const taskHref = (t: any) => t?.type === "flashcard_review" ? "/flashcards" : t?.type === "quiz" && t?.topic_id ? `/quiz/${t.topic_id}` : t?.topic_id ? `/lesson/${t.topic_id}` : "/plan";
  const taskMeta = (t: any) => (t.type === "lesson" ? "Học bài mới" : t.type === "quiz" ? `Làm ${t.question_count || 5} câu hỏi` : t.type === "flashcard_review" ? `Ôn ${t.card_count || 10} flashcard` : "Ôn tập") + ` · ${t.duration_min} phút` + (t.current_mastery !== undefined ? ` · ${Number(t.current_mastery).toFixed(0)}% thành thạo` : "");
  const barColor = (v: number) => v >= 80 ? "var(--success)" : v >= 50 ? "var(--brand)" : v >= 30 ? "var(--accent-strong)" : "var(--danger)";
  const progressMsg = progressPct === 100 ? "Hoàn thành xuất sắc hôm nay!" : progressPct > 50 ? "Gần xong rồi, cố lên!" : "Tiến độ";
  const band = lastExam?.overall_band != null ? Number(lastExam.overall_band) : null;
  const R = 61, C = 2 * Math.PI * R;

  return (
    <div className="wrap stagger">
      <header className="page-head">
        <div>
          <div className="muted" style={{ fontSize: 15 }}>{greetings()}, bạn</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            {tasks.length > 0 ? <>Hôm nay bạn có <span style={{ color: "var(--brand)" }}>{tasks.length} nhiệm vụ</span></> : <>Sẵn sàng học hôm nay?</>}
          </h1>
          {tasks.length > 0 && <p className="page-sub">{totalMin} phút · {tasks.length} bài tập · {progressPct}% hoàn thành</p>}
        </div>
        <div className="row">
          {streak > 0 && (
            <span className="st-badge st-badge-accent" style={{ height: 32, padding: "0 14px", fontSize: 13.5 }}>
              <Flame size={16} strokeWidth={2} /> {streak} ngày liên tiếp
            </span>
          )}
          {nextTask && (
            <Link className="st-btn st-btn-primary" href={taskHref(nextTask)}>
              Tiếp tục: {nextTask.topic_name.length > 28 ? nextTask.topic_name.slice(0, 28) + "…" : nextTask.topic_name}
              <ArrowRight className="st-btn-arrow" size={18} strokeWidth={2} />
            </Link>
          )}
        </div>
      </header>

      {!todayData?.has_plan && tasks.length === 0 && (
        <section className="st-card" aria-labelledby="setup-h">
          <div className="sec-head"><h2 id="setup-h" className="sec-title">Thiết lập lộ trình</h2><span className="meta num">{setupDone}/4 xong</span></div>
          <div className="st-progress-track" style={{ height: 6, marginBottom: 18 }} aria-hidden="true"><div className="st-progress-fill" style={{ width: `${setupDone * 25}%` }} /></div>
          {setupSteps.map((st, i) => (
            <div key={st.title} style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) auto", gap: 14, alignItems: "center", padding: "16px 0", borderTop: i ? "1px solid var(--hairline)" : 0 }}>
              <span style={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", font: "650 13px/1 var(--font-sans)", border: `2px solid ${st.done ? "var(--success)" : "var(--border-control)"}`, background: st.done ? "var(--success)" : "transparent", color: st.done ? "var(--on-brand)" : "var(--ink-muted)" }}>{st.done ? "✓" : i + 1}</span>
              <div><b style={{ font: "600 15.5px/22px var(--font-sans)", textDecoration: st.done ? "line-through" : undefined, color: st.done ? "var(--ink-muted)" : undefined }}>{st.title}</b><p className="meta">{st.desc}</p></div>
              {!st.done && <Link className={i === setupDone ? "st-btn st-btn-primary st-btn-sm" : "st-btn st-btn-secondary st-btn-sm"} href={st.href}>{st.cta}</Link>}
            </div>
          ))}
        </section>
      )}

      {!todayData?.has_plan && tasks.length === 0 && (
        <section aria-labelledby="try-h">
          <div className="sec-head"><h2 id="try-h" className="sec-title">Hoặc thử ngay, không cần thiết lập</h2></div>
          <div className="grid-3">
            {[
              ["/exam", "Thi thử một kỹ năng", "Reading 60 phút hoặc Listening 30 phút, có chấm điểm band.", "tile"],
              ["/pronunciation", "Luyện nói 5 phút", "Đọc theo câu mẫu Speaking Part 1, xem từ nào phát âm sai.", "tile tile-accent"],
              ["/tutor", "Hỏi trợ lý AI", "Hỏi bất cứ điều gì về ngữ pháp, từ vựng hay cách làm bài.", "tile tile-success"],
            ].map(([href, t, d, cls]) => (
              <Link key={href} href={href} className="st-card st-card-interactive" style={{ display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", color: "inherit" }}>
                <span className={cls} aria-hidden="true"><ArrowRight size={20} strokeWidth={1.75} /></span>
                <b style={{ font: "650 16px/22px var(--font-sans)" }}>{t}</b><span className="meta">{d}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid-3 stat-grid" aria-label="Số liệu hôm nay">
        <div className="st-stat st-stat-accent">
          <div className="st-stat-top"><span className="st-stat-icon"><Flame size={16} strokeWidth={2} /></span>Chuỗi ngày học</div>
          <div className="st-stat-value"><CountUp value={streak} /><small>ngày</small></div>
          <div className="st-stat-hint">{streak > 0 ? "Giữ nhịp, đừng để đứt chuỗi" : "Học hôm nay để bắt đầu chuỗi"}</div>
        </div>
        <div className="st-stat">
          <div className="st-stat-top"><span className="st-stat-icon"><Target size={16} strokeWidth={2} /></span>Thành thạo</div>
          <div className="st-stat-value"><CountUp value={mastery} /><small>%</small></div>
          <div className="st-stat-hint">{profile.total_topics ? `Trên ${profile.total_topics} chủ đề` : "Chưa có dữ liệu"}</div>
        </div>
        <div className="st-stat st-stat-success">
          <div className="st-stat-top"><span className="st-stat-icon"><Layers size={16} strokeWidth={2} /></span>Thẻ đến hạn</div>
          <div className="st-stat-value"><CountUp value={dueCards ?? 0} /></div>
          <div className="st-stat-hint">{dueCards ? <Link href="/flashcards">Ôn ngay</Link> : "Không có thẻ nào cần ôn"}</div>
        </div>
      </section>

      <div className="split">
        {tasks.length > 0 ? (
          <section className="st-card" aria-labelledby="plan-h">
            <div className="sec-head">
              <h2 id="plan-h" className="sec-title">Kế hoạch hôm nay</h2>
              <Link className="link" href="/plan">Xem lịch học</Link>
            </div>
            <div className="st-progress" style={{ marginBottom: 18 }}>
              <div className="st-progress-head"><span>{progressMsg}</span><b>{doneTasks}/{tasks.length} hoàn thành</b></div>
              <div className="st-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={doneTasks} aria-label="Tiến độ hôm nay">
                <div className="st-progress-fill" style={{ width: `${progressPct}%`, background: progressPct === 100 ? "var(--success)" : undefined }} />
              </div>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {tasks.map((task: any, idx: number) => {
                const done = completedTasks.has(idx);
                const TaskIcon = task.type === "flashcard_review" ? Layers : task.type === "quiz" ? Target : BookOpen;
                return (
                  <button type="button" key={idx} className={`st-task${done ? " st-task-done" : ""}`} onClick={() => toggleTask(idx)} aria-pressed={done}>
                    <span className="st-task-check" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </span>
                    <span className="st-task-body">
                      <span className="st-task-title" style={{ display: "block" }}>{task.topic_name}</span>
                      <span className="st-task-meta">{taskMeta(task)}</span>
                    </span>
                    <span className="st-task-icon" aria-hidden="true"><TaskIcon size={20} strokeWidth={1.75} /></span>
                  </button>
                );
              })}
            </div>
            <p className="meta" style={{ marginTop: 14 }}>Bấm vào một nhiệm vụ để đánh dấu xong. Lịch ngày mai tự điều chỉnh theo kết quả hôm nay.</p>
          </section>
        ) : (
          <EmptyState
            title="Chưa có lịch học hôm nay"
            description="Chỉ cần 3 bước để Studia lên lịch học riêng cho bạn mỗi ngày."
            steps={[
              { title: "Thêm tài liệu học", desc: "Upload sách hoặc bài đọc dạng PDF/văn bản", href: "/books" },
              { title: "Đặt mục tiêu", desc: "Chọn hạn hoàn thành và số phút học mỗi ngày", href: "/books" },
              { title: "Bắt đầu bài đầu tiên", desc: "Hệ thống tự xếp bài học, quiz và ôn tập" },
            ]}
            primary={{ label: "Upload tài liệu đầu tiên", href: "/books" }}
            secondary={{ label: "Làm thử một đề IELTS", href: "/exam" }}
          />
        )}

        <div className="stack" style={{ gap: 16 }}>
          <section className="st-card" aria-labelledby="exam-h" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
            <h2 id="exam-h" className="eyebrow">Lần thi thử gần nhất</h2>
            {band !== null ? (
              <>
                <div className="st-band" role="img" aria-label={`Overall band ${band} trên 9`} style={{ width: 132, height: 132 }}>
                  <svg width="132" height="132" viewBox="0 0 132 132" fill="none" aria-hidden="true">
                    <circle className="st-band-track" cx="66" cy="66" r={R} strokeWidth="10" />
                    <circle className="st-band-arc" cx="66" cy="66" r={R} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - band / 9)} />
                  </svg>
                  <div className="st-band-center"><div className="st-band-score">{band.toFixed(1)}</div><div className="st-band-label">Overall</div></div>
                </div>
                <div className="title">{lastExam.title || "Bài thi thử"}</div>
                {lastExam.created_at && <div className="meta">{new Date(lastExam.created_at).toLocaleDateString("vi-VN")}</div>}
                <Link className="st-btn st-btn-secondary st-btn-block" href={`/exam/${lastExam.session_id}`} style={{ marginTop: 6 }}>Xem kết quả chi tiết</Link>
              </>
            ) : (
              <>
                <span className="tile" aria-hidden="true"><Target size={20} strokeWidth={1.75} /></span>
                <p className="ink2">Chưa có bài thi nào. Một đề thử giúp Studia biết band hiện tại của bạn.</p>
                <Link className="st-btn st-btn-secondary st-btn-block" href="/exam">Làm thử 1 đề</Link>
              </>
            )}
          </section>

          {weak.length > 0 && (
            <section className="st-card" aria-labelledby="weak-h">
              <div className="sec-head" style={{ marginBottom: 12 }}>
                <h2 id="weak-h" className="heading-3">Cần củng cố</h2>
                <Link className="link" href="/review">Ôn ngay</Link>
              </div>
              <div className="stack" style={{ gap: 12 }}>
                {weak.map((t) => (
                  <div key={t.topic_id || t.topic_name} className="row">
                    <span className="dot" style={{ background: barColor(t.mastery_score) }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.topic_name}</span>
                    <span className="meta num">{Number(t.mastery_score).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {topics.length > 0 && (
        <section className="st-card" aria-labelledby="topic-h">
          <div className="sec-head">
            <h2 id="topic-h" className="sec-title">Mức thành thạo theo chủ đề</h2>
            <Link className="link" href="/dashboard">Xem tất cả {profile.total_topics} chủ đề</Link>
          </div>
          <div className="stack" style={{ gap: 14 }}>
            {topics.slice(0, 6).map((t: any, i: number) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 200px) 1fr 48px", gap: 16, alignItems: "center" }}>
                <span className="ink2" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.topic_name}</span>
                <div className="bar"><i style={{ width: `${t.mastery_score}%`, background: barColor(t.mastery_score) }} /></div>
                <b className="num" style={{ textAlign: "right", color: barColor(t.mastery_score) }}>{Number(t.mastery_score).toFixed(0)}%</b>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
