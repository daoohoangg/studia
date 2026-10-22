"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Check, Pencil, Plus } from "lucide-react";
import MomentsPanel from "./MomentsPanel";
import {
  type DayDetail, type PlanTask, type ReminderStatus, type Skill, type Slot, SKILLS,
  WEEKDAYS_LONG, createSlot, deleteSlot, fmtMinutes, fromMin, pad, parse, prettyDate, sendTestReminder,
  setTaskStatus, toMin, todayIso, updateSlot, weekdayIdx,
} from "@/lib/schedule";

const STATUS_LABEL: Record<string, string> = { pending: "Chưa học", in_progress: "Đang học", completed: "Hoàn thành", skipped: "Bỏ qua" };

type Draft = { id?: string; title: string; skill: Skill; start: string; end: string; note: string; remind: boolean };

function newDraft(start: string, minutes = 60, title = "", skill: Skill = "other"): Draft {
  const s = toMin(start);
  return { title, skill, start, end: fromMin(Math.min(s + minutes, 23 * 60 + 59)), note: "", remind: true };
}

/** Chọn giờ theo 24 giờ (không phụ thuộc định dạng AM/PM của trình duyệt), phút cách 5. */
function TimeSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(":").map(Number);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  if (!minutes.includes(m)) minutes.push(m);
  minutes.sort((x, y) => x - y);
  return (
    <fieldset className="field se-time">
      <legend className="field-label">{label}</legend>
      <span className="se-hm">
        <select className="input num" aria-label={`${label} (giờ)`} value={h} onChange={(e) => onChange(`${pad(Number(e.target.value))}:${pad(m)}`)}>
          {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{pad(i)}</option>)}
        </select>
        <b aria-hidden="true">:</b>
        <select className="input num" aria-label={`${label} (phút)`} value={m} onChange={(e) => onChange(`${pad(h)}:${pad(Number(e.target.value))}`)}>
          {minutes.map((x) => <option key={x} value={x}>{pad(x)}</option>)}
        </select>
      </span>
    </fieldset>
  );
}

function SlotEditor({ draft, day, onCancel, onSaved, onDeleted, leadMinutes }: {
  draft: Draft; day: string; onCancel: () => void; onSaved: () => void; onDeleted: () => void; leadMinutes: number;
}) {
  const [d, setD] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = useRef<HTMLInputElement>(null);
  useEffect(() => { title.current?.focus(); }, []);

  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const valid = d.title.trim().length > 0 && toMin(d.end) > toMin(d.start);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) { setError(toMin(d.end) <= toMin(d.start) ? "Giờ kết thúc phải sau giờ bắt đầu." : "Hãy đặt tên cho khung giờ."); return; }
    setBusy(true); setError("");
    try {
      const body = { day, start: d.start, end: d.end, title: d.title.trim(), note: d.note, skill: d.skill, remind: d.remind };
      if (d.id) await updateSlot(d.id, body); else await createSlot(body);
      onSaved();
    } catch (err: any) {
      setError(err.message || "Không lưu được");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!d.id || !confirm("Xoá khung giờ này cùng ghi chú của nó?")) return;
    setBusy(true);
    try { await deleteSlot(d.id); onDeleted(); } catch (err: any) { setError(err.message); setBusy(false); }
  };

  return (
    <form className="se" onSubmit={save} aria-label={d.id ? "Sửa khung giờ học" : "Thêm khung giờ học"} onClick={(e) => e.stopPropagation()}>
      <div className="se-row">
        <label className="field se-title"><span className="field-label">Học gì trong khung giờ này</span>
          <input ref={title} className="input" value={d.title} maxLength={120} placeholder="VD: Reading Passage 2 · matching headings" onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className="field"><span className="field-label">Kỹ năng</span>
          <select className="input" value={d.skill} onChange={(e) => set({ skill: e.target.value as Skill })}>
            {SKILLS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <TimeSelect label="Từ" value={d.start} onChange={(v) => set({ start: v })} />
        <TimeSelect label="Đến" value={d.end} onChange={(v) => set({ end: v })} />
      </div>
      <label className="field"><span className="field-label">Ghi chú chi tiết</span>
        <textarea className="input se-note" rows={4} value={d.note} maxLength={4000}
          placeholder="Mục tiêu của giờ này, tài liệu/trang cần làm, từ mới gặp, chỗ còn vướng…"
          onChange={(e) => set({ note: e.target.value })} />
        <span className="meta num" style={{ textAlign: "right" }}>{d.note.length}/4000</span>
      </label>
      <div className="se-foot">
        <label className="se-remind">
          <button type="button" className="sw" role="switch" aria-checked={d.remind} aria-label="Nhắc qua email" onClick={() => set({ remind: !d.remind })} />
          <span>Gửi email nhắc trước <b>{leadMinutes} phút</b></span>
        </label>
        <div className="row-wrap" style={{ gap: 6 }}>
          {d.id && <button type="button" className="st-btn st-btn-ghost st-btn-sm" style={{ color: "var(--danger)" }} onClick={remove} disabled={busy}>Xoá</button>}
          <button type="button" className="st-btn st-btn-ghost st-btn-sm" onClick={onCancel} disabled={busy}>Huỷ</button>
          <button type="submit" className="st-btn st-btn-primary st-btn-sm" disabled={busy || !valid} aria-busy={busy || undefined}>{busy ? "Đang lưu…" : "Lưu"}</button>
        </div>
      </div>
      {error && <p role="alert" className="pm-error">{error}</p>}
    </form>
  );
}

function SlotCard({ slot, onEdit, onToggle, readOnly }: { slot: Slot; onEdit: () => void; onToggle: () => void; readOnly?: boolean }) {
  const done = slot.status === "done";
  return (
    <article className="sc" data-skill={slot.skill} data-done={done || undefined} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="sc-check" role="checkbox" aria-checked={done} aria-label={done ? "Bỏ đánh dấu đã học" : "Đánh dấu đã học"} onClick={onToggle} disabled={readOnly}>
        {done && <Check size={14} strokeWidth={3.2} />}
      </button>
      <div className="sc-body">
        <div className="sc-title">{slot.title}</div>
        <div className="sc-meta num">
          {slot.start} – {slot.end} · {fmtMinutes(slot.minutes)}
          <span className="sc-skill">{SKILLS.find((s) => s.id === slot.skill)?.label}</span>
          <span className="sc-bell" title={slot.remind ? "Có email nhắc trước giờ học" : "Không nhắc"}>{slot.remind ? <Bell size={13} /> : <BellOff size={13} />}</span>
        </div>
        {slot.note && <p className="sc-note">{slot.note}</p>}
      </div>
      {!readOnly && <button type="button" className="icon-btn sc-edit" onClick={onEdit} aria-label={`Sửa khung giờ ${slot.title}`}><Pencil size={16} /></button>}
    </article>
  );
}

function ReminderBox({ status, onTest }: { status: ReminderStatus | null; onTest: () => Promise<string> }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!status) return null;
  const test = async () => {
    setBusy(true); setMsg(null);
    try { setMsg({ ok: true, text: await onTest() }); } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };
  return (
    <section className="rb st-card" aria-labelledby="rb-h">
      <h2 id="rb-h" className="heading-3">Nhắc giờ học qua email</h2>
      <p className="ink2" style={{ fontSize: 14.5 }}>
        Mỗi khung giờ bật chuông sẽ có email nhắc trước <b>{status.lead_minutes} phút</b>
        {status.email ? <> gửi tới <b>{status.email}</b>.</> : ". Tài khoản của bạn chưa có email."}
      </p>
      {!status.smtp_configured && <p className="rb-warn">Máy chủ chưa cấu hình gửi email nên chưa có thư nào được gửi. Quản lý cần điền SMTP trong cấu hình backend.</p>}
      <div className="row-wrap" style={{ gap: 8 }}>
        <button type="button" className="st-btn st-btn-secondary st-btn-sm" onClick={test} disabled={busy || !status.smtp_configured || !status.email} aria-busy={busy || undefined}>{busy ? "Đang gửi…" : "Gửi email thử"}</button>
        {msg && <span role="status" className="meta" style={{ color: msg.ok ? "var(--success)" : "var(--danger)" }}>{msg.text}</span>}
      </div>
    </section>
  );
}

/** Chi tiết một ngày: dòng thời gian theo giờ (ghi chú từng khung giờ), nhiệm vụ của lộ trình và khoảnh khắc học. */
export default function DayView({ day, detail, loading, reminder, defaultStart, onChanged }: {
  day: string; detail: DayDetail | null; loading: boolean; reminder: ReminderStatus | null; defaultStart: string; onChanged: () => void;
}) {
  const today = todayIso();
  const isToday = day === today;
  // Ngày đã qua chỉ để xem lại (ảnh, ghi chú, kết quả), không thêm hay sửa lịch.
  const readOnly = day < today;
  const [editing, setEditing] = useState<{ hour: number; draft: Draft } | null>(null);
  const [tick, setTick] = useState(0);
  const nowRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setEditing(null); }, [day]);
  useEffect(() => { if (!isToday) return; const t = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(t); }, [isToday]);

  const slots = detail?.slots || [];
  const lead = reminder?.lead_minutes ?? 10;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  void tick;

  const [from, to] = useMemo(() => {
    let a = 5, b = 23;
    for (const s of slots) { a = Math.min(a, Math.floor(toMin(s.start) / 60)); b = Math.max(b, Math.floor(toMin(s.start) / 60)); }
    if (editing) { a = Math.min(a, editing.hour); b = Math.max(b, editing.hour); }
    return [a, b];
  }, [slots, editing]);

  useEffect(() => {
    if (isToday && !loading) nowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [isToday, loading, day]);

  const byHour = (h: number) => slots.filter((s) => Math.floor(toMin(s.start) / 60) === h);
  const open = (hour: number, draft: Draft) => setEditing({ hour, draft });
  const done = () => { setEditing(null); onChanged(); };

  const tasks: PlanTask[] = detail?.plan?.tasks || [];
  const stats = detail?.stats || {};
  const d = parse(day);

  const setTask = async (i: number, status: string) => { try { await setTaskStatus(day, i, status); onChanged(); } catch {} };
  const toggleSlot = async (s: Slot) => { try { await updateSlot(s.id, { status: s.status === "done" ? "planned" : "done" }); onChanged(); } catch {} };
  const planTask = (t: PlanTask) => {
    const last = slots.length ? Math.max(...slots.map((s) => toMin(s.end))) : 0;
    const base = toMin(defaultStart);
    const start = fromMin(Math.min(Math.max(base, Math.ceil(last / 30) * 30), 22 * 60));
    const sk: Skill = t.type === "quiz" ? "review" : t.type === "flashcard_review" || t.type === "spaced_repetition" ? "vocab" : "other";
    open(Math.floor(toMin(start) / 60), newDraft(start, t.duration_min || 30, t.topic_name, sk));
  };

  return (
    <div className="dv" aria-busy={loading || undefined}>
      <div className="dv-main">
        <header className="dv-head">
          <div>
            <div className="eyebrow">{isToday ? "Hôm nay · " : ""}{WEEKDAYS_LONG[weekdayIdx(day)]}</div>
            <h2 className="sec-title" style={{ marginTop: 2 }}>{prettyDate(day)}</h2>
          </div>
          {readOnly
            ? <span className="meta">Ngày đã qua · chỉ xem</span>
            : <button type="button" className="st-btn st-btn-primary st-btn-sm" onClick={() => open(Math.floor(toMin(defaultStart) / 60), newDraft(defaultStart))}><Plus size={16} /> Thêm khung giờ</button>}
        </header>

        <div className="dv-tiles" aria-label="Tóm tắt ngày">
          <div><span>Đã học</span><b className="num">{fmtMinutes(stats.minutes || 0)}</b></div>
          <div><span>Nhiệm vụ</span><b className="num">{stats.tasks_done || 0}/{stats.tasks_total || 0}</b></div>
          <div><span>Khung giờ</span><b className="num">{stats.slots_done || 0}/{stats.slots || 0}</b></div>
          <div data-on={stats.active || undefined}><span>Streak</span><b>{stats.active ? "Đã giữ" : "Chưa"}</b></div>
        </div>

        <div className="tl" role="list" aria-label="Dòng thời gian trong ngày">
          {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((h) => {
            const here = byHour(h);
            const isNow = isToday && Math.floor(nowMin / 60) === h;
            const editHere = editing?.hour === h;
            return (
              <div key={h} className="hr" role="listitem" data-now={isNow || undefined}>
                <div className="hr-t num">{pad(h)}:00</div>
                <div className="hr-body" onClick={() => !readOnly && !editing && open(h, newDraft(`${pad(h)}:00`))}>
                  {isNow && <div ref={nowRef} className="hr-now" style={{ top: `${(nowMin % 60) / 60 * 100}%` }} aria-label={`Bây giờ là ${pad(Math.floor(nowMin / 60))}:${pad(nowMin % 60)}`}><i /></div>}
                  {here.map((s) =>
                    editHere && editing?.draft.id === s.id ? null : (
                      <SlotCard key={s.id} slot={s} readOnly={readOnly}
                        onEdit={() => open(h, { id: s.id, title: s.title, skill: s.skill, start: s.start, end: s.end, note: s.note, remind: s.remind })}
                        onToggle={() => toggleSlot(s)} />
                    ))}
                  {editHere && <SlotEditor key={editing!.draft.id || "new"} draft={editing!.draft} day={day} leadMinutes={lead} onCancel={() => setEditing(null)} onSaved={done} onDeleted={done} />}
                  {!readOnly && !here.length && !editHere && <span className="hr-add"><Plus size={14} /> Thêm ghi chú cho giờ này</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="dv-side">
        <section className="st-card" aria-labelledby="dt-h">
          <h2 id="dt-h" className="heading-3">Nhiệm vụ của lộ trình</h2>
          {detail?.plan?.adapted_reason && <p className="meta" style={{ marginTop: 8, padding: "8px 10px", borderRadius: "var(--radius-sm)", background: "var(--warning-tint)", color: "var(--warning)" }}>{detail.plan.adapted_reason}</p>}
          {tasks.length === 0 ? (
            <p className="meta" style={{ marginTop: 8 }}>Ngày này chưa có nhiệm vụ từ lộ trình. Bạn vẫn có thể tự thêm khung giờ ở bên trái.</p>
          ) : (
            <ul className="dt-list">
              {tasks.map((t, i) => {
                const ok = t.status === "completed";
                return (
                  <li key={i} data-done={ok || undefined}>
                    <button type="button" className="sc-check" role="checkbox" aria-checked={ok} aria-label={ok ? "Hoàn tác" : "Đánh dấu xong"} onClick={() => setTask(i, ok ? "pending" : "completed")}>
                      {ok && <Check size={14} strokeWidth={3.2} />}
                    </button>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="dt-name">{t.topic_name}</div>
                      <div className="meta">{t.duration_min} phút · {STATUS_LABEL[t.status] || t.status}</div>
                    </div>
                    {!ok && !readOnly && (
                      <span className="row" style={{ gap: 2 }}>
                        <button type="button" className="st-btn st-btn-ghost st-btn-sm" onClick={() => planTask(t)}>Xếp giờ</button>
                        {t.status !== "skipped" && <button type="button" className="st-btn st-btn-ghost st-btn-sm" onClick={() => setTask(i, "skipped")}>Bỏ qua</button>}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <MomentsPanel day={day} moments={detail?.moments || []} canAdd={day <= today} onChanged={onChanged} />
        <ReminderBox status={reminder} onTest={async () => `Đã gửi thư thử tới ${(await sendTestReminder()).to}`} />
      </aside>
    </div>
  );
}
