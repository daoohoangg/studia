"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import CountUp from "@/components/CountUp";
import { Flame, Target, BookOpen, Layers, ArrowRight, Volume2, NotebookPen, CalendarClock, Clock, ListChecks } from "lucide-react";
import { useAccount, useDisplayName } from "@/lib/account";
import Mascot, { MOODS } from "@/components/mascot/Mascot";
import JournalForm from "@/components/journal/JournalForm";
import { pickMood } from "@/lib/mascot";
import { POSTS } from "@/lib/blog";
import { quoteOfDay, wordOfDay } from "@/lib/daily";
import { daysBetween, fetchStreak, todayIso, type Streak } from "@/lib/schedule";
import { FEELINGS, useJournal } from "@/lib/journal";
import "./home.css";

import { API, apiFetch } from "@/lib/api";
import { fetchServerProfile } from "@/lib/placement";

const greetings = () => {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
};

export default function HomePage() {
  const { account } = useAccount();
  const displayName = useDisplayName(account);
  const firstName = displayName === "Tài khoản" ? "bạn" : displayName.trim().split(/\s+/).slice(-1)[0];
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
  const [examDate, setExamDate] = useState<string | null>(null);
  const [setupInfo, setSetupInfo] = useState<{ goal: boolean; placement: boolean; books: boolean }>({ goal: false, placement: false, books: false });
  useEffect(() => {
    fetchServerProfile().then((r) => {
      setSetupInfo((x) => ({ ...x, goal: Boolean(r.profile?.completedAt), placement: Boolean(r.placement) }));
      setExamDate(r.profile && !r.profile.noExam && r.profile.examDate ? r.profile.examDate : null);
    });
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

  const [streakInfo, setStreakInfo] = useState<Streak | null>(null);
  useEffect(() => { fetchStreak().then(setStreakInfo).catch(() => {}); }, []);
  const journal = useJournal();
  const today = todayIso();
  const todayEntry = journal.entries[today];
  const [justSaved, setJustSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const quote = quoteOfDay();
  const word = wordOfDay();
  const speak = (w: string) => {
    try { const u = new SpeechSynthesisUtterance(w); u.lang = "en-GB"; u.rate = 0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch {}
  };
  // ?mood=sad|fire|... trong URL để xem thử từng biểu cảm của linh vật
  const preview = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mood") : null;
  const base = pickMood(streakInfo);
  const readPost = POSTS[Math.floor(Date.now() / 86400000) % POSTS.length];
  // ?mood=sad&wet=3 hoặc ?mood=fire&fire=4 để xem thử từng trạng thái của Coal
  const qp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const lvl = (k: string, d: 0 | 1 | 2 | 3 | 4): 0 | 1 | 2 | 3 | 4 => { const v = Number(qp?.get(k)); return v >= 0 && v <= 4 && qp?.has(k) ? (Math.round(v) as 0 | 1 | 2 | 3 | 4) : d; };
  const mascot = justSaved ? { mood: "love" as const, line: "Cảm ơn bạn đã kể cho mình nghe. Nghỉ ngơi thật tốt nhé!", wet: 0 as const, fire: 0 as const }
    : preview && (MOODS as string[]).includes(preview) ? { mood: preview as typeof MOODS[number], line: base.line, wet: lvl("wet", 0), fire: lvl("fire", preview === "fire" ? 3 : 0) } : base;

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
  const examLeft = examDate ? daysBetween(todayIso(), examDate) : null;

  return (
    <div className="wrap stagger">
      <header className="hm-hero">
        <i className="hm-orb a" /><i className="hm-orb b" /><i className="hm-orb c" />
        <div>
          <div className="hm-hello">{greetings()}, {firstName}</div>
          <h1 className="hm-title">
            {tasks.length > 0 ? <>Hôm nay bạn có <em>{tasks.length} nhiệm vụ</em></> : <>Sẵn sàng <em>chinh phục IELTS</em> hôm nay?</>}
          </h1>
          <p className="hm-sub">{tasks.length > 0 ? `${totalMin} phút · ${tasks.length} bài tập · ${progressPct}% hoàn thành` : "Dùng menu bên trái để chọn kỹ năng, hoặc thi thử để biết band hiện tại."}</p>
          <p className="hm-say" role="status">{mascot.line}</p>
          <div className="hm-actions">
            {nextTask ? (
              <Link className="hm-cta" href={taskHref(nextTask)}>
                Tiếp tục: {nextTask.topic_name.length > 26 ? nextTask.topic_name.slice(0, 26) + "…" : nextTask.topic_name}
                <ArrowRight className="st-btn-arrow" size={18} strokeWidth={2.2} />
              </Link>
            ) : (
              <Link className="hm-cta" href="/exam">Thi thử ngay <ArrowRight className="st-btn-arrow" size={18} strokeWidth={2.2} /></Link>
            )}
            <Link className="hm-ghost" href="/plan">Xem lịch học</Link>
          </div>
        </div>
        <div className="hm-side">
          <div className="hm-mascot">
            <Mascot mood={mascot.mood} wet={mascot.wet} fire={mascot.fire} size={148} />
            <div className="hm-chips">
              <Link className="hm-chip" href="/dashboard" aria-label={`Chuỗi ${streak} ngày liên tiếp, xem tiến độ`}>
                <b><span className="hm-flame"><Flame size={20} strokeWidth={2.2} /></span> {streak}</b><span>ngày liên tiếp</span>
              </Link>
              <Link className="hm-chip" href="/plan#muc-tieu" aria-label={examLeft === null ? "Đặt ngày thi trong trang mục tiêu" : `Còn ${examLeft} ngày đến kỳ thi, xem mục tiêu`}>
                <b><CalendarClock size={19} strokeWidth={2.2} /> {examLeft === null ? "—" : examLeft < 0 ? 0 : examLeft}</b>
                <span>{examLeft === null ? "đặt ngày thi" : examLeft < 0 ? "kỳ thi đã qua" : examLeft === 0 ? "thi hôm nay" : "ngày đến kỳ thi"}</span>
              </Link>
            </div>
          </div>
          {tasks.length > 0 && (
            <div className="hm-ring" role="img" aria-label={`${progressPct}% hoàn thành hôm nay`}>
              <svg viewBox="0 0 112 112" fill="none" aria-hidden="true">
                <circle className="t" cx="56" cy="56" r="48" strokeWidth="9" />
                <circle className="v" cx="56" cy="56" r="48" strokeWidth="9" strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 * (1 - progressPct / 100)} />
              </svg>
              <div><b>{progressPct}%</b><small>hôm nay</small></div>
            </div>
          )}
        </div>
      </header>

      <div className="hm-trio">
        <section className="hm-quote" aria-labelledby="quote-h">
          <h2 id="quote-h" className="eyebrow">Câu nói hôm nay</h2>
          <blockquote lang="en">“{quote.en}”</blockquote>
          <p className="vi">{quote.vi}</p>
          <cite>{quote.by}</cite>
        </section>

        <section className="hm-word st-card" aria-labelledby="word-h">
          <div className="sec-head" style={{ marginBottom: 8 }}>
            <h2 id="word-h" className="eyebrow">Từ vựng hôm nay</h2>
            <button type="button" className="hm-speak" onClick={() => speak(word.word)} aria-label={`Nghe phát âm ${word.word}`}><Volume2 size={18} strokeWidth={2} /></button>
          </div>
          <div className="hm-word-h"><b lang="en">{word.word}</b><span>{word.pos}</span><i>{word.ipa}</i></div>
          <p className="hm-word-vi">{word.vi}</p>
          <p className="hm-word-ex" lang="en">“{word.example}”</p>
          <p className="meta">{word.exampleVi}</p>
        </section>

        <section className="st-card" aria-labelledby="rd-h">
          <div className="sec-head" style={{ marginBottom: 8 }}>
            <h2 id="rd-h" className="eyebrow">Coal gợi ý đọc</h2>
            <Link className="link" href="/blog">Xem blog</Link>
          </div>
          <Link href={`/blog/${readPost.slug}`} style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none", color: "inherit" }}>
            <Mascot mood={readPost.coal.mood} fire={readPost.coal.fire} wet={readPost.coal.wet} size={76} still label="" />
            <span>
              <b style={{ display: "block", font: "650 16px/22px var(--font-sans)" }}>{readPost.title}</b>
              <span className="meta">{readPost.tag} · {readPost.readMin} phút đọc</span>
            </span>
          </Link>
        </section>
      </div>

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

      <section className="hm-stats" aria-label="Số liệu hôm nay">
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
        <div className="st-stat">
          <div className="st-stat-top"><span className="st-stat-icon"><Clock size={16} strokeWidth={2} /></span>Thời lượng hôm nay</div>
          <div className="st-stat-value"><CountUp value={totalMin} /><small>phút</small></div>
          <div className="st-stat-hint">{tasks.length ? "Theo kế hoạch hôm nay" : "Chưa có kế hoạch"}</div>
        </div>
        <div className="st-stat st-stat-success">
          <div className="st-stat-top"><span className="st-stat-icon"><ListChecks size={16} strokeWidth={2} /></span>Nhiệm vụ xong</div>
          <div className="st-stat-value"><CountUp value={doneTasks} /><small>/{tasks.length}</small></div>
          <div className="st-stat-hint">{tasks.length ? `${progressPct}% hoàn thành` : "Chưa có nhiệm vụ"}</div>
        </div>
      </section>

      <div className="hm-split">
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

        <div className="hm-col">
          <section className="st-card" aria-labelledby="exam-h" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 10 }}>
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

      <div className={`hm-split${topics.length > 0 ? "" : " one"}`}>
<section className="st-card" aria-labelledby="jn-h">
          <div className="sec-head" style={{ marginBottom: 10 }}>
            <h2 id="jn-h" className="sec-title"><NotebookPen size={18} strokeWidth={2} style={{ verticalAlign: -3, marginRight: 8 }} />Nhật ký hôm nay</h2>
            <Link className="link" href="/journal">Xem tất cả</Link>
          </div>
          {!journal.ready ? <div className="skeleton" style={{ height: 120 }} /> : todayEntry && !editing ? (
            <div className="hm-jdone">
              <Mascot mood={FEELINGS[(todayEntry?.feeling ?? 3) - 1].mood} size={72} />
              <div>
                <b>Hôm nay bạn thấy {(FEELINGS[(todayEntry?.feeling ?? 3) - 1].label).toLowerCase()}</b>
                {todayEntry?.text && <p className="meta" style={{ marginTop: 4 }}>{todayEntry.text.length > 110 ? todayEntry.text.slice(0, 110) + "…" : todayEntry.text}</p>}
                <button type="button" className="link" onClick={() => { setEditing(true); setJustSaved(false); }} style={{ marginTop: 6 }}>Sửa nhật ký</button>
              </div>
            </div>
          ) : (
            <JournalForm day={today} entry={todayEntry} onSave={(e) => { journal.save(e); setEditing(false); setJustSaved(true); }} />
          )}
        </section>
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
    </div>
  );
}
