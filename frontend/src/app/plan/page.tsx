"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import { API, apiFetch } from "@/lib/api";
import { ChevronLeft, ChevronRight, Download, Plus, Check, CalendarDays } from "lucide-react";

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_NAMES = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];


const STATUS_LABEL: Record<string, string> = {
  pending: "Chưa học", in_progress: "Đang học", completed: "Hoàn thành", skipped: "Bỏ qua",
};

function getStatusColor(status: string) {
  return status === "completed" ? "var(--success)" : status === "in_progress" ? "var(--brand)" : status === "skipped" ? "var(--ink-muted)" : "var(--accent-strong)";
}

export default function PlanPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [goals, setGoals] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ document_id: "", daily_minutes: 45, deadline_days: 30 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { fetchPlans(); fetchGoals(); fetchDocs(); }, []);

  const fetchGoals = async () => {
    try {
      const res = await apiFetch(`${API}/learning-paths/goals`);
      if (res.ok) setGoals((await res.json()).goals || []);
    } catch {}
  };

  const fetchDocs = async () => {
    try {
      const res = await apiFetch(`${API}/documents/`);
      if (res.ok) {
        const d = (await res.json()).documents || [];
        const ready = d.filter((x: any) => x.processing_status === "completed");
        setDocs(ready);
        setForm(f => ({ ...f, document_id: f.document_id || ready[0]?.id || "" }));
      }
    } catch {}
  };

  const createGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.document_id) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiFetch(`${API}/learning-paths/set-goal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, goal_description: "Học hiểu toàn bộ tài liệu" }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ ok: true, text: d.message || "Đã tạo lịch học" });
        setShowForm(false);
        await Promise.all([fetchPlans(), fetchGoals()]);
      } else {
        setMsg({ ok: false, text: typeof d.detail === "string" ? d.detail : "Không tạo được lịch học" });
      }
    } catch {
      setMsg({ ok: false, text: "Không kết nối được máy chủ" });
    }
    setSaving(false);
  };

  const removeGoal = async (id: string) => {
    if (!confirm("Huỷ mục tiêu này? Các ngày học chưa hoàn thành sẽ bị xoá.")) return;
    const res = await apiFetch(`${API}/learning-paths/goals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSelected(null);
      await Promise.all([fetchPlans(), fetchGoals()]);
    } else {
      setMsg({ ok: false, text: "Không huỷ được mục tiêu" });
    }
  };

  const setTaskStatus = async (date: string, idx: number, status: string) => {
    const res = await apiFetch(`${API}/learning-paths/plans/${date}/tasks/${idx}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const d = await res.json();
      setPlans(ps => ps.map(p => p.plan_date === date ? { ...p, tasks: d.tasks, status: d.status } : p));
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/learning-paths/plans?days=60`);
      if (res.ok) { const d = await res.json(); setPlans(d.plans || []); }
    } catch {}
    setLoading(false);
  };

  const planMap: Record<string, any> = {};
  plans.forEach(p => { planMap[p.plan_date] = p; });

  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  // Lịch bắt đầu từ thứ Hai
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const activeDate = selected ?? (planMap[today] ? today : null);
  const selectedPlan = activeDate ? planMap[activeDate] : null;
  const weekday = (iso: string) => ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][new Date(iso + "T00:00:00").getDay()];
  const prettyDate = (iso: string) => { const [, m, d] = iso.split("-"); return `${Number(d)} tháng ${Number(m)}`; };
  const doneCount = plans.filter(p => p.status === "completed").length;
  const leftCount = plans.filter(p => p.status !== "completed").length;

  return (
    <div className="wrap stagger">
      <header className="page-head">
        <div>
          <h1 className="page-title">Lịch học</h1>
          <p className="page-sub">Tự điều chỉnh theo tiến độ: bỏ lỡ một ngày, bài sẽ được dời sang ngày gần nhất.</p>
        </div>
        <div className="row-wrap">
          <a className="st-btn st-btn-ghost" href={`${API}/export/schedule/ical`} target="_blank" rel="noreferrer" title="Đồng bộ với Google Calendar / Outlook">
            <Download size={18} strokeWidth={1.75} /> Thêm vào lịch (.ics)
          </a>
          <button className="st-btn st-btn-primary" type="button" onClick={() => { setShowForm(v => !v); setMsg(null); }} aria-expanded={showForm}>
            {showForm ? "Đóng" : <><Plus size={18} strokeWidth={2} /> Tạo lịch học</>}
          </button>
        </div>
      </header>

      {msg && (
        <div role="status" className="st-enter" style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: msg.ok ? "var(--success-tint)" : "var(--danger-tint)", color: msg.ok ? "var(--success)" : "var(--danger)", fontWeight: 550 }}>{msg.text}</div>
      )}

      {showForm && (
        <form className="st-card st-enter" onSubmit={createGoal} aria-label="Tạo lịch học">
          {docs.length === 0 ? (
            <p className="ink2">Chưa có tài liệu nào xử lý xong. <Link href="/books">Thêm tài liệu</Link> trước nhé.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) repeat(2, minmax(0, 1fr)) auto", gap: 12, alignItems: "end" }}>
              <label className="field"><span className="field-label">Tài liệu</span>
                <select className="input" value={form.document_id} onChange={e => setForm({ ...form, document_id: e.target.value })}>
                  {docs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </label>
              <label className="field"><span className="field-label">Phút mỗi ngày</span>
                <input className="input num" type="number" min={10} max={240} value={form.daily_minutes} onChange={e => setForm({ ...form, daily_minutes: Math.max(10, Number(e.target.value) || 45) })} />
              </label>
              <label className="field"><span className="field-label">Xong trong (ngày)</span>
                <input className="input num" type="number" min={3} max={365} value={form.deadline_days} onChange={e => setForm({ ...form, deadline_days: Math.max(3, Number(e.target.value) || 30) })} />
              </label>
              <button className="st-btn st-btn-primary" type="submit" disabled={saving} aria-busy={saving || undefined}>{saving ? "Đang tạo…" : "Tạo lịch"}</button>
            </div>
          )}
        </form>
      )}

      <div className="split" style={{ gridTemplateColumns: "minmax(0, 1.8fr) minmax(300px, 1fr)" }}>
        <section className="st-card" aria-labelledby="m-h">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
            <button className="icon-btn" type="button" aria-label="Tháng trước" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}><ChevronLeft size={20} strokeWidth={2} /></button>
            <h2 id="m-h" className="heading-3">{MONTH_NAMES[month]}, {year}</h2>
            <button className="icon-btn" type="button" aria-label="Tháng sau" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}><ChevronRight size={20} strokeWidth={2} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => <span key={d} className="eyebrow" style={{ textAlign: "center", padding: "4px 0" }}>{d}</span>)}
            {loading ? (
              <div className="skeleton" style={{ gridColumn: "1 / -1", height: 420 }} />
            ) : calendarCells.map((day, idx) => {
              if (!day) return <span key={idx} />;
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
              const plan = planMap[dateStr];
              const isToday = dateStr === today;
              const isSel = dateStr === activeDate;
              const done = plan?.status === "completed";
              const skipped = plan && !done && dateStr < today;
              return (
                <button key={idx} type="button" disabled={!plan} onClick={() => setSelected(dateStr)}
                  aria-label={`${day} ${MONTH_NAMES[month]}${plan ? `, ${plan.tasks?.length || 0} bài` : ""}`} aria-pressed={isSel}
                  style={{
                    minHeight: 88, padding: 8, borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: 4, textAlign: "left", font: "inherit", color: "inherit",
                    border: isToday ? "2px solid var(--brand)" : "1px solid var(--hairline)",
                    background: done ? "var(--success-tint)" : "var(--surface)",
                    boxShadow: isSel ? "var(--focus-ring)" : "none",
                    cursor: plan ? "pointer" : "default", opacity: plan || isToday ? 1 : 0.75,
                    transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
                  }}>
                  <span className="num" style={{ font: "600 13px/18px var(--font-sans)", color: isToday ? "var(--brand)" : "var(--ink-secondary)" }}>{day}</span>
                  {plan?.tasks?.slice(0, 2).map((t: any, ti: number) => (
                    <span key={ti} style={{ font: "550 11.5px/16px var(--font-sans)", padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      background: done ? "var(--surface)" : skipped ? "var(--warning-tint)" : "var(--brand-tint)", color: done ? "var(--success)" : skipped ? "var(--warning)" : "var(--brand)" }}>{t.topic_name}</span>
                  ))}
                  {plan?.tasks?.length > 2 && <span className="meta" style={{ fontSize: 11 }}>+{plan.tasks.length - 2} bài</span>}
                </button>
              );
            })}
          </div>
          <div className="row-wrap meta" style={{ marginTop: 14, gap: 16 }}>
            <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: "var(--brand)" }} />Hôm nay</span>
            <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: "var(--success)" }} />Hoàn thành</span>
            <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: "var(--warning)" }} />Chưa xong</span>
            <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: "var(--brand-tint)", boxShadow: "0 0 0 1px var(--brand)" }} />Có bài học</span>
          </div>
        </section>

        <div className="stack" style={{ gap: 16 }}>
          <section className="st-card" aria-labelledby="d-h" style={{ position: "sticky", top: 20 }}>
            {selectedPlan && activeDate ? (
              <>
                <div className="eyebrow">{activeDate === today ? "Hôm nay · " : ""}{weekday(activeDate)}</div>
                <h2 id="d-h" className="sec-title" style={{ marginTop: 2 }}>{prettyDate(activeDate)} · {selectedPlan.tasks?.length || 0} bài · {selectedPlan.total_minutes} phút</h2>
                {selectedPlan.adapted_reason && (
                  <p className="meta" style={{ marginTop: 10, padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "var(--warning-tint)", color: "var(--warning)" }}>{selectedPlan.adapted_reason}</p>
                )}
                <div className="stack" style={{ gap: 10, marginTop: 14 }}>
                  {selectedPlan.tasks?.map((task: any, i: number) => {
                    const done = task.status === "completed";
                    return (
                      <div key={i} className="lrow" style={{ padding: 12, background: done ? "var(--success-tint)" : "var(--surface)", borderColor: done ? "transparent" : undefined }}>
                        <span className={`tile tile-sm${done ? " tile-success" : ""}`} style={!done ? { background: "var(--surface-sunken)", color: "var(--ink-muted)" } : { background: "var(--surface)" }} aria-hidden="true">
                          {done ? <Check size={14} strokeWidth={3} /> : <span className="num" style={{ font: "650 12px/1 var(--font-sans)" }}>{i + 1}</span>}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="lrow-title" style={{ display: "block", fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.topic_name}</span>
                          <span className="meta">{task.duration_min} phút · {STATUS_LABEL[task.status] || task.status}</span>
                        </span>
                        {done ? (
                          <button className="st-btn st-btn-ghost st-btn-sm" type="button" onClick={() => setTaskStatus(activeDate, i, "pending")}>Hoàn tác</button>
                        ) : (
                          <span className="row" style={{ gap: 4 }}>
                            {task.status !== "skipped" && <button className="st-btn st-btn-ghost st-btn-sm" type="button" onClick={() => setTaskStatus(activeDate, i, "skipped")}>Bỏ qua</button>}
                            <button className="st-btn st-btn-secondary st-btn-sm" type="button" onClick={() => setTaskStatus(activeDate, i, "completed")}>Xong</button>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {activeDate === today && <Link className="st-btn st-btn-primary st-btn-block" href="/" style={{ marginTop: 16 }}>Học ngay hôm nay</Link>}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <span className="tile" style={{ margin: "0 auto 10px" }} aria-hidden="true"><CalendarDays size={20} strokeWidth={1.75} /></span>
                <p className="ink2">{plans.length ? "Chọn một ngày có lịch để xem chi tiết." : "Chưa có lịch học. Tạo lịch từ một tài liệu để bắt đầu."}</p>
              </div>
            )}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }} aria-label="Tổng kết">
            <div className="st-stat" style={{ minWidth: 0, padding: 14 }}><div className="st-stat-top">Tổng ngày</div><div className="st-stat-value" style={{ fontSize: 28, lineHeight: "32px" }}>{plans.length}</div></div>
            <div className="st-stat" style={{ minWidth: 0, padding: 14 }}><div className="st-stat-top">Đã xong</div><div className="st-stat-value" style={{ fontSize: 28, lineHeight: "32px", color: "var(--success)" }}>{doneCount}</div></div>
            <div className="st-stat" style={{ minWidth: 0, padding: 14 }}><div className="st-stat-top">Còn lại</div><div className="st-stat-value" style={{ fontSize: 28, lineHeight: "32px" }}>{leftCount}</div></div>
          </section>

          <section className="st-card" aria-labelledby="g-h">
            <h2 id="g-h" className="heading-3" style={{ marginBottom: 12 }}>Mục tiêu đang theo</h2>
            {goals.length === 0 ? <p className="meta">Chưa có mục tiêu nào. Bấm “Tạo lịch học” để bắt đầu.</p> : (
              <div className="stack" style={{ gap: 8 }}>
                {goals.map(g => (
                  <div key={g.id} className="lrow" style={{ padding: "10px 12px" }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="lrow-title" style={{ display: "block", fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.document_title}</span>
                      <span className="meta">{g.daily_minutes} phút/ngày · hạn {g.deadline_date}</span>
                    </span>
                    <button className="st-btn st-btn-ghost st-btn-sm" type="button" style={{ color: "var(--danger)" }} onClick={() => removeGoal(g.id)}>Huỷ</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
