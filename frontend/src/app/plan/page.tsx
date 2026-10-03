"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Map, ChevronLeft, ChevronRight, Clock, BookOpen, RefreshCw, CheckCircle2 } from "lucide-react";

const API = "http://localhost:8000/api/v1";

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_NAMES = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

const taskIcon = (type: string) => ({ lesson: "📖", quiz: "📝", flashcard_review: "🃏", spaced_repetition: "🔄" }[type] || "📌");

function getStatusColor(status: string) {
  return status === "completed" ? "#10b981" : status === "in_progress" ? "#6366f1" : status === "skipped" ? "#64748b" : "#f59e0b";
}

export default function PlanPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/learning-paths/plans?days=60`);
      if (res.ok) { const d = await res.json(); setPlans(d.plans || []); }
    } catch {}
    setLoading(false);
  };

  const planMap: Record<string, any> = {};
  plans.forEach(p => { planMap[p.plan_date] = p; });

  const today = new Date().toISOString().split("T")[0];

  // Build calendar grid for current month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const selectedPlan = selected ? planMap[selected] : null;

  return (
    <div style={{ display: "flex", gap: "28px", maxWidth: "1020px" }}>
      {/* Calendar */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="badge badge-amber" style={{ marginBottom: "10px" }}>
                <Map size={13} /> Lịch học
              </span>
              <h1 style={{ fontSize: "2rem", fontWeight: "800", fontFamily: "Outfit, sans-serif" }}>
                Kế hoạch học tập
              </h1>
              <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
                Lịch học thích ứng — tự động điều chỉnh theo tiến độ của bạn
              </p>
            </div>
            <a href={`${API}/export/schedule/ical`} target="_blank" className="btn-secondary" title="Đồng bộ lịch học với Google Calendar / Outlook">
              📅 Export iCalendar (.ics)
            </a>
          </div>

        <div className="glass-panel" style={{ padding: "24px" }}>
          {/* Month navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <button className="btn-ghost" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontWeight: "700", fontFamily: "Outfit, sans-serif", fontSize: "1.1rem" }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button className="btn-ghost" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day name row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: "700", color: "var(--text-muted)", padding: "4px" }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="skeleton" style={{ height: 280 }} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
              {calendarCells.map((day, idx) => {
                if (!day) return <div key={idx} />;

                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const plan = planMap[dateStr];
                const isToday = dateStr === today;
                const isSelected = dateStr === selected;
                const hasPlan = !!plan;
                const status = plan?.status;

                return (
                  <div
                    key={idx}
                    className={`calendar-day${isToday ? " today" : ""}${status === "completed" ? " completed" : ""}${hasPlan && status !== "completed" ? " has-tasks" : ""}`}
                    style={{ cursor: hasPlan ? "pointer" : "default", position: "relative", outline: isSelected ? "2px solid var(--accent-indigo)" : "none" }}
                    onClick={() => hasPlan && setSelected(dateStr === selected ? null : dateStr)}
                  >
                    <div style={{
                      fontSize: "0.8rem", fontWeight: isToday ? "800" : "500",
                      color: isToday ? "#818cf8" : "var(--text-secondary)",
                      marginBottom: "4px"
                    }}>{day}</div>

                    {hasPlan && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {status === "completed" && <div style={{ fontSize: "0.65rem", color: "#34d399" }}>✓ Xong</div>}
                        {plan.tasks?.slice(0, 2).map((t: any, ti: number) => (
                          <div key={ti} style={{ fontSize: "0.62rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "2px" }}>
                            {taskIcon(t.type)} <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "50px" }}>{t.topic_name}</span>
                          </div>
                        ))}
                        {plan.tasks?.length > 2 && (
                          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>+{plan.tasks.length - 2} nữa</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div style={{ display: "flex", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
            {[
              { color: "rgba(99,102,241,0.5)", label: "Hôm nay" },
              { color: "#10b981", label: "Hoàn thành" },
              { color: "rgba(245,158,11,0.5)", label: "Có bài học" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: 10, height: 10, borderRadius: "3px", background: l.color }} />
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {[
            { label: "Tổng ngày học", value: plans.length, icon: "📅" },
            { label: "Đã hoàn thành", value: plans.filter(p => p.status === "completed").length, icon: "✅" },
            { label: "Còn lại", value: plans.filter(p => p.status === "pending").length, icon: "⏳" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
              <span style={{ fontSize: "1.8rem" }}>{s.icon}</span>
              <div style={{ fontSize: "1.8rem", fontWeight: "800", fontFamily: "Outfit, sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Day Detail Panel */}
      <div style={{ width: "320px", flexShrink: 0 }}>
        <div className="glass-panel" style={{ padding: "24px", position: "sticky", top: "20px" }}>
          {selectedPlan ? (
            <>
              <h3 style={{ fontWeight: "700", fontSize: "1rem", marginBottom: "4px" }}>
                📅 {selected}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: getStatusColor(selectedPlan.status) }}>
                  {selectedPlan.status === "completed" ? "✓ Hoàn thành" :
                    selectedPlan.status === "in_progress" ? "🔄 Đang học" : "📋 Chưa học"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <Clock size={11} style={{ display: "inline" }} /> {selectedPlan.total_minutes} phút
                </span>
              </div>

              {selectedPlan.adapted_reason && (
                <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", marginBottom: "14px" }}>
                  <p style={{ fontSize: "0.75rem", color: "#fbbf24" }}>
                    🔄 {selectedPlan.adapted_reason}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selectedPlan.tasks?.map((task: any, i: number) => (
                  <div key={i} className="task-item" style={{ padding: "12px" }}>
                    <div className="task-icon" style={{ width: 36, height: 36, fontSize: "1.1rem", background: "rgba(255,255,255,0.04)" }}>
                      {taskIcon(task.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: "600", fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.topic_name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {task.duration_min} phút · {task.status}
                      </div>
                    </div>
                    {task.status === "completed" && <CheckCircle2 size={16} color="#10b981" />}
                  </div>
                ))}
              </div>

              {selected === today && (
                <Link href="/" className="btn-primary" style={{ marginTop: "16px", width: "100%", justifyContent: "center" }}>
                  Học ngay hôm nay
                </Link>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📅</div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Click vào một ngày có lịch học để xem chi tiết
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
