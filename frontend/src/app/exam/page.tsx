"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { API, apiFetch } from "@/lib/api";
import { Check, Clock, BookOpen } from "lucide-react";

type ExamType = "full" | "cambridge21_test1" | "cambridge21_test2" | "cambridge21_test3" | "cambridge21_test4" | "listening" | "reading" | "writing" | "speaking";
type ExamMode = "academic" | "general";

const EXAM_CONFIGS = {
  full: {
    label: "Full Mock Test",
    desc: "Listening + Reading + Writing + Speaking",
    duration: "2 giờ 45 phút",
    sections: [
      { name: "Listening", time: "30 phút", questions: "40 câu" },
      { name: "Reading",   time: "60 phút", questions: "40 câu" },
      { name: "Writing",   time: "60 phút", questions: "2 Tasks" },
      { name: "Speaking",  time: "15 phút", questions: "3 Parts" },
    ],
    color: "var(--brand)",
    bg: "var(--secondary)",
  },
  cambridge21_test1: {
    label: "Cambridge 21 - Test 1",
    desc: "Đề thi chuẩn từ Cambridge IELTS 21 (Audio + Đề thật)",
    duration: "2 giờ 45 phút",
    sections: [
      { name: "Listening", time: "30 phút", questions: "40 câu" },
      { name: "Reading",   time: "60 phút", questions: "40 câu" },
      { name: "Writing",   time: "60 phút", questions: "2 Tasks" },
      { name: "Speaking",  time: "15 phút", questions: "3 Parts" },
    ],
    color: "var(--danger)",
    bg: "var(--secondary)",
  },
  cambridge21_test2: {
    label: "Cambridge 21 - Test 2",
    desc: "Đề thi chuẩn từ Cambridge IELTS 21 (Audio + Đề thật)",
    duration: "2 giờ 45 phút",
    sections: [
      { name: "Listening", time: "30 phút", questions: "40 câu" },
      { name: "Reading",   time: "60 phút", questions: "40 câu" },
      { name: "Writing",   time: "60 phút", questions: "2 Tasks" },
      { name: "Speaking",  time: "15 phút", questions: "3 Parts" },
    ],
    color: "var(--danger)",
    bg: "var(--secondary)",
  },
  cambridge21_test3: {
    label: "Cambridge 21 - Test 3",
    desc: "Đề thi chuẩn từ Cambridge IELTS 21 (Audio + Đề thật)",
    duration: "2 giờ 45 phút",
    sections: [
      { name: "Listening", time: "30 phút", questions: "40 câu" },
      { name: "Reading",   time: "60 phút", questions: "40 câu" },
      { name: "Writing",   time: "60 phút", questions: "2 Tasks" },
      { name: "Speaking",  time: "15 phút", questions: "3 Parts" },
    ],
    color: "var(--danger)",
    bg: "var(--secondary)",
  },
  cambridge21_test4: {
    label: "Cambridge 21 - Test 4",
    desc: "Đề thi chuẩn từ Cambridge IELTS 21 (Audio + Đề thật)",
    duration: "2 giờ 45 phút",
    sections: [
      { name: "Listening", time: "30 phút", questions: "40 câu" },
      { name: "Reading",   time: "60 phút", questions: "40 câu" },
      { name: "Writing",   time: "60 phút", questions: "2 Tasks" },
      { name: "Speaking",  time: "15 phút", questions: "3 Parts" },
    ],
    color: "var(--danger)",
    bg: "var(--secondary)",
  },
  listening: {
    label: "Listening Only",
    desc: "Section luyện tập Listening riêng lẻ",
    duration: "30 phút",
    sections: [{ name: "Listening", time: "30 phút", questions: "40 câu" }],
    color: "var(--brand)",
    bg: "var(--secondary)",
  },
  reading: {
    label: "Reading Only",
    desc: "Section luyện tập Reading riêng lẻ",
    duration: "60 phút",
    sections: [{ name: "Reading", time: "60 phút", questions: "40 câu" }],
    color: "var(--success)",
    bg: "var(--secondary)",
  },
  writing: {
    label: "Writing Only",
    desc: "Task 1 + Task 2 riêng lẻ",
    duration: "60 phút",
    sections: [{ name: "Writing", time: "60 phút", questions: "2 Tasks" }],
    color: "var(--warning)",
    bg: "var(--secondary)",
  },
  speaking: {
    label: "Speaking Only",
    desc: "Phỏng vấn Speaking với AI Examiner",
    duration: "15 phút",
    sections: [{ name: "Speaking", time: "15 phút", questions: "3 Parts" }],
    color: "var(--brand)",
    bg: "var(--secondary)",
  },
};

const INSTRUCTIONS = [
  "Bài thi sẽ bắt đầu ngay sau khi bạn bấm Start Test.",
  "Không thể thoát ra Dashboard trong khi đang thi.",
  "Đồng hồ đếm ngược sẽ bắt đầu ngay lập tức.",
  "Bài sẽ tự động nộp khi hết thời gian.",
  "Không có đáp án hay gợi ý trong khi thi.",
  "Bạn có thể điều hướng qua lại giữa các câu bằng Question Navigator.",
];

function sessionLabel(t?: string) {
  if (!t) return "Phiên thi";
  const m = /^cambridge21_test(\d)$/.exec(t);
  if (m) return `Cambridge 21 - Test ${m[1]}`;
  const names: Record<string, string> = {
    full: "Full Mock Test", listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking",
  };
  return names[t] || "Phiên thi";
}

export default function ExamLobbyPage() {
  const router = useRouter();
  const [examType, setExamType] = useState<ExamType>("full");
  const [examMode, setExamMode] = useState<ExamMode>("academic");
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  // Đề dựng từ sách của người dùng (đã publish) + lịch sử thi
  const [sets, setSets] = useState<any[]>([]);
  const [setId, setSetId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`${API}/exam-sets?status=published`).then(async (res) => {
      if (res.ok) setSets((await res.json()).exam_sets || []);
    }).catch(() => {});
    apiFetch(`${API}/exam/sessions?limit=5`).then(async (res) => {
      if (res.ok) setHistory((await res.json()).sessions || []);
    }).catch(() => {});
  }, []);

  const config = EXAM_CONFIGS[examType];
  const skillTypes: ExamType[] = ["full", "listening", "reading", "writing", "speaking"];

  const handleStartTest = async () => {
    if (!checked) return;
    setLoading(true);
    setStartError(null);

    if (setId) {
      try {
        const res = await apiFetch(`${API}/exam/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exam_set_id: setId,
            exam_type: skillTypes.includes(examType) ? examType : "full",
            exam_mode: examMode,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Không tạo được phiên thi");
        router.push(`/exam/${data.session.session_id}`);
        return;
      } catch (e: any) {
        setStartError(e?.message || "Không tạo được phiên thi");
        setLoading(false);
        return;
      }
    }

    if (examType.startsWith("cambridge21")) {
      router.push(`/exam/demo?type=${examType}`);
      return;
    }

    try {
      const res = await apiFetch(`${API}/exam/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_type: examType, exam_mode: examMode }),
      });
      if (res.ok) {
        const data = await res.json();
        const sessionId = data.session?.session_id;
        if (sessionId) {
          router.push(`/exam/${sessionId}`);
        }
      } else {
        // Fallback: demo mode without backend
        router.push(`/exam/demo?type=${examType}&mode=${examMode}`);
      }
    } catch {
      // Demo mode fallback
      router.push(`/exam/demo?type=${examType}&mode=${examMode}`);
    } finally {
      setLoading(false);
    }
  };

  const inProgress = history.find(h => h.status === "IN_PROGRESS");
  const bandFor = (t: string) => {
    const h = history.find(x => x.exam_type === t && (x.status === "SUBMITTED" || x.status === "AUTO_SUBMITTED"));
    return h ? h.overall_band : undefined;
  };
  const selectedSet = sets.find(s => s.id === setId);
  const fullTests: ExamType[] = ["cambridge21_test1", "cambridge21_test2", "cambridge21_test3", "cambridge21_test4", "full"];
  const pick = (t: ExamType) => { setExamType(t); setSetId(null); };
  const totalMinutes = config.sections.reduce((n, s) => n + (parseInt(s.time) || 0), 0);
  const hhmm = `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, "0")}:00`;
  const RULES = [
    "Đồng hồ chạy ngay khi bạn bấm Bắt đầu và không tạm dừng được.",
    "Phần nghe chỉ phát một lần — hãy đeo tai nghe.",
    "Hết giờ, bài được nộp tự động. Bạn có thể chuyển câu bằng thanh điều hướng phía dưới.",
    "Không có gợi ý, từ điển hay đáp án cho tới khi nộp bài.",
  ];
  const testSound = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance("This is a sound check. If you can hear this clearly, you are ready.");
    u.lang = "en-GB"; window.speechSynthesis.speak(u);
  };

  return (
    <div className="wrap stagger">
      <header className="page-head">
        <div>
          <span className="st-badge st-badge-success" style={{ marginBottom: 10 }}>Mô phỏng IELTS trên máy tính</span>
          <h1 className="page-title">Thi thử IELTS</h1>
          <p className="page-sub">Như phòng thi thật: không gợi ý, không tra từ, không xem đáp án cho tới khi nộp bài.</p>
        </div>
      </header>

      {inProgress && (
        <div role="status" className="row-wrap" style={{ gap: 14, padding: "14px 18px", borderRadius: "var(--radius-md)", background: "var(--warning-tint)" }}>
          <span className="tile tile-sm tile-warning" aria-hidden="true"><Clock size={18} strokeWidth={1.75} /></span>
          <span style={{ flex: 1, color: "var(--ink)" }}><b style={{ fontWeight: 600 }}>Bạn còn một bài đang làm dở:</b> {inProgress.title || sessionLabel(inProgress.exam_type)}</span>
          <Link className="st-btn st-btn-secondary st-btn-sm" href={`/exam/${inProgress.session_id}`}>Làm tiếp</Link>
        </div>
      )}

      <div className="split" style={{ gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, 1fr)" }}>
        <div className="stack" style={{ gap: 16 }}>
          <section className="st-card" aria-labelledby="t-h">
            <div className="sec-head">
              <h2 id="t-h" className="sec-title">Chọn đề</h2>
              <div className="seg" role="radiogroup" aria-label="Loại bài thi">
                {(["academic", "general"] as ExamMode[]).map(m => (
                  <button key={m} className="seg-btn" type="button" role="radio" aria-checked={examMode === m} aria-pressed={examMode === m} onClick={() => setExamMode(m)}>{m === "academic" ? "Academic" : "General Training"}</button>
                ))}
              </div>
            </div>

            <div className="eyebrow" style={{ color: "var(--ink-muted)", marginBottom: 8 }}>Đề đầy đủ · 2 giờ 45 phút</div>
            <div role="radiogroup" aria-label="Đề đầy đủ" className="lobby-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              {fullTests.map(t => {
                const band = bandFor(t);
                return (
                  <button key={t} className="lobby-test" type="button" role="radio" aria-checked={!setId && examType === t} onClick={() => pick(t)}>
                    <b>{t === "full" ? "Đề tổng hợp" : EXAM_CONFIGS[t].label.replace(" - ", " · ")}</b>
                    {band != null ? <span className="st-badge st-badge-success">Đã thi · {Number(band).toFixed(1)}</span> : <span className="meta">{t === "full" ? "Câu hỏi sinh tự động" : "Chưa thi · có audio"}</span>}
                  </button>
                );
              })}
            </div>

            <div className="eyebrow" style={{ color: "var(--ink-muted)", margin: "18px 0 8px" }}>Luyện từng kỹ năng</div>
            <div role="radiogroup" aria-label="Luyện từng kỹ năng" className="lobby-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
              {(["listening", "reading", "writing", "speaking"] as ExamType[]).map(t => {
                const s = EXAM_CONFIGS[t].sections[0];
                return (
                  <button key={t} className="lobby-test" type="button" role="radio" aria-checked={!setId && examType === t} onClick={() => pick(t)}>
                    <b>{s.name}</b><span className="meta">{s.time} · {s.questions.replace("Tasks", "task").replace("Parts", "part")}</span>
                  </button>
                );
              })}
            </div>

            <div className="eyebrow" style={{ color: "var(--ink-muted)", margin: "18px 0 8px" }}>Đề dựng từ sách của bạn</div>
            {sets.length === 0 ? (
              <p className="meta">Chưa có đề nào. Mở một cuốn sách đề trong <Link className="link" href="/books">Thư viện</Link> rồi chọn “Dựng đề thi” để tạo bộ đề kèm đáp án.</p>
            ) : (
              <div role="radiogroup" aria-label="Đề từ sách" className="stack" style={{ gap: 8 }}>
                {sets.map(s => (
                  <button key={s.id} className="lobby-test lobby-set" type="button" role="radio" aria-checked={setId === s.id} onClick={() => { setSetId(s.id); if (!skillTypes.includes(examType)) setExamType("full"); }}>
                    <span className="tile tile-sm" aria-hidden="true"><BookOpen size={18} strokeWidth={1.75} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: "block" }}>{s.title}</b>
                      <span className="meta">Listening {s.stats?.listening ?? 0} câu · Reading {s.stats?.reading ?? 0} câu{s.has_audio ? " · có audio" : " · chưa có audio"}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="st-card" aria-labelledby="rule-h">
            <h2 id="rule-h" className="heading-3">Trước khi bắt đầu</h2>
            <ol className="ink2" style={{ margin: "12px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              {RULES.map(r => <li key={r}>{r}</li>)}
            </ol>
            <label className="row" style={{ marginTop: 16, padding: 14, borderRadius: "var(--radius-md)", background: checked ? "var(--brand-tint)" : "var(--surface-sunken)", cursor: "pointer", transition: "background-color var(--dur-fast)" }}>
              <span className={`check ${checked ? "check-on" : ""}`} aria-hidden="true">{checked && <Check size={14} strokeWidth={3} />}</span>
              <input type="checkbox" className="st-sr" checked={checked} onChange={e => setChecked(e.target.checked)} />
              <span style={{ color: "var(--ink)" }}>Tôi đã đọc và đồng ý với quy định phòng thi</span>
            </label>
          </section>

          {history.length > 0 && (
            <section className="st-card" aria-labelledby="h-h">
              <div className="sec-head"><h2 id="h-h" className="sec-title">Lịch sử thi gần đây</h2><Link className="link" href="/dashboard">Xem tiến độ</Link></div>
              <div>
                {history.slice(0, 6).map(h => {
                  const done = h.status === "SUBMITTED" || h.status === "AUTO_SUBMITTED";
                  return (
                    <Link key={h.session_id} href={`/exam/${h.session_id}`} className="row lobby-hist">
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 600, fontSize: 14.5 }}>{h.title || sessionLabel(h.exam_type)}</span>
                        {h.created_at && <span className="meta">{new Date(h.created_at).toLocaleDateString("vi-VN")}</span>}
                      </span>
                      {done ? <b className="num">Band {h.overall_band != null ? Number(h.overall_band).toFixed(1) : "—"}</b> : <span className="st-badge st-badge-warning">{h.status === "IN_PROGRESS" ? "Đang làm" : "Chưa bắt đầu"}</span>}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="navy-block" aria-labelledby="sum-h" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 24, alignSelf: "start" }}>
          <div className="eyebrow" style={{ color: "var(--on-navy)", opacity: 0.75 }}>{examMode === "academic" ? "Academic" : "General Training"} · {config.sections.length > 1 ? "Đề đầy đủ" : "Một kỹ năng"}</div>
          <h2 id="sum-h" style={{ font: "700 26px/32px var(--font-display)", letterSpacing: "-0.4px", color: "var(--on-navy)" }}>{selectedSet ? selectedSet.title : config.label.replace(" - ", " · ")}</h2>
          <div className="stack" style={{ gap: 8 }}>
            {config.sections.map(s => (
              <div key={s.name} className="lobby-secrow"><b style={{ fontWeight: 600 }}>{s.name}</b><span className="num" style={{ opacity: 0.85 }}>{s.time} · {s.questions}</span></div>
            ))}
          </div>
          <div className="row" style={{ justifyContent: "space-between", paddingTop: 6 }}><span style={{ opacity: 0.85 }}>Tổng thời gian</span><b className="num" style={{ font: "700 20px/1 var(--font-display)" }}>{hhmm}</b></div>
          {startError && <div role="alert" style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "var(--danger-tint)", color: "var(--danger)", fontSize: 14 }}>{startError}</div>}
          <button className="st-btn st-btn-accent st-btn-lg st-btn-block" type="button" onClick={handleStartTest} disabled={!checked || loading}>
            {loading ? <><span className="st-spinner" />Đang chuẩn bị đề…</> : "Bắt đầu thi"}
          </button>
          {!checked && <p style={{ fontSize: 13, opacity: 0.8, textAlign: "center" }}>Đánh dấu đồng ý quy định phòng thi để bắt đầu.</p>}
          <p style={{ fontSize: 13, opacity: 0.8, textAlign: "center" }}>Kiểm tra loa trước: <button type="button" onClick={testSound} style={{ background: "none", border: 0, padding: 0, color: "var(--on-navy)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>phát âm thanh thử</button></p>
        </aside>
      </div>
    </div>
  );
}
