"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { API, apiFetch } from "@/lib/api";

/** Lộ trình theo sách: tạo mục tiêu từ một tài liệu (sinh lịch từng ngày) và huỷ mục tiêu cũ. */
export default function GoalsPanel({ onChanged }: { onChanged: () => void }) {
  const [goals, setGoals] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ document_id: "", daily_minutes: 45, deadline_days: 30 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadGoals = async () => {
    try {
      const res = await apiFetch(`${API}/learning-paths/goals`, { cache: "no-store" });
      if (res.ok) setGoals((await res.json()).goals || []);
    } catch {}
  };

  useEffect(() => {
    loadGoals();
    (async () => {
      try {
        const res = await apiFetch(`${API}/documents/`);
        if (res.ok) {
          const ready = ((await res.json()).documents || []).filter((x: any) => x.processing_status === "completed");
          setDocs(ready);
          setForm((f) => ({ ...f, document_id: f.document_id || ready[0]?.id || "" }));
        }
      } catch {}
    })();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.document_id) return;
    setSaving(true); setMsg(null);
    try {
      const res = await apiFetch(`${API}/learning-paths/set-goal`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, goal_description: "Học hiểu toàn bộ tài liệu" }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ ok: true, text: d.message || "Đã tạo lịch học" });
        setShow(false);
        await loadGoals();
        onChanged();
      } else {
        setMsg({ ok: false, text: typeof d.detail === "string" ? d.detail : "Không tạo được lịch học" });
      }
    } catch {
      setMsg({ ok: false, text: "Không kết nối được máy chủ" });
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Huỷ mục tiêu này? Các ngày học chưa hoàn thành sẽ bị xoá.")) return;
    const res = await apiFetch(`${API}/learning-paths/goals/${id}`, { method: "DELETE" });
    if (res.ok) { await loadGoals(); onChanged(); } else setMsg({ ok: false, text: "Không huỷ được mục tiêu" });
  };

  return (
    <section className="st-card gp" aria-labelledby="gp-h">
      <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 id="gp-h" className="heading-3">Lộ trình theo sách</h2>
          <p className="meta">Studia chia một cuốn sách thành nhiệm vụ mỗi ngày và tự dời lịch khi bạn bỏ lỡ.</p>
        </div>
        <button className="st-btn st-btn-secondary st-btn-sm" type="button" onClick={() => { setShow((v) => !v); setMsg(null); }} aria-expanded={show}>
          {show ? "Đóng" : <><Plus size={16} /> Tạo lộ trình</>}
        </button>
      </div>

      {msg && <div role="status" className="gp-msg" data-ok={msg.ok || undefined}>{msg.text}</div>}

      {show && (
        <form className="gp-form st-enter" onSubmit={create} aria-label="Tạo lộ trình học">
          {docs.length === 0 ? (
            <p className="ink2">Chưa có tài liệu nào xử lý xong. <Link href="/books">Thêm tài liệu</Link> trước nhé.</p>
          ) : (
            <>
              <label className="field"><span className="field-label">Tài liệu</span>
                <select className="input" value={form.document_id} onChange={(e) => setForm({ ...form, document_id: e.target.value })}>
                  {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </label>
              <label className="field"><span className="field-label">Phút mỗi ngày</span>
                <input className="input num" type="number" min={10} max={240} value={form.daily_minutes} onChange={(e) => setForm({ ...form, daily_minutes: Math.max(10, Number(e.target.value) || 45) })} />
              </label>
              <label className="field"><span className="field-label">Xong trong (ngày)</span>
                <input className="input num" type="number" min={3} max={365} value={form.deadline_days} onChange={(e) => setForm({ ...form, deadline_days: Math.max(3, Number(e.target.value) || 30) })} />
              </label>
              <button className="st-btn st-btn-primary" type="submit" disabled={saving} aria-busy={saving || undefined}>{saving ? "Đang tạo…" : "Tạo lịch"}</button>
            </>
          )}
        </form>
      )}

      {goals.length === 0 ? (
        <p className="meta" style={{ marginTop: 12 }}>Chưa có lộ trình nào. Bấm “Tạo lộ trình” để bắt đầu.</p>
      ) : (
        <div className="stack" style={{ gap: 8, marginTop: 14 }}>
          {goals.map((g) => (
            <div key={g.id} className="lrow" style={{ padding: "10px 12px" }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="lrow-title" style={{ display: "block", fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.document_title}</span>
                <span className="meta">{g.daily_minutes} phút/ngày · hạn {g.deadline_date}</span>
              </span>
              <button className="st-btn st-btn-ghost st-btn-sm" type="button" style={{ color: "var(--danger)" }} onClick={() => remove(g.id)}>Huỷ</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
