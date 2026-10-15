"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { API, apiFetch } from "@/lib/api";
import AdminGuard from "@/components/AdminGuard";

function SharedLibrary() {
  const [docs, setDocs] = useState<any[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch("/admin/library?scope=shared");
    if (r.ok) setDocs((await r.json()).documents || []);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  const setVis = async (d: any, visibility: string) => {
    setBusy(d.id); setMsg(null);
    const r = await apiFetch(`/admin/documents/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visibility }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    setMsg(r.ok ? { ok: true, text: visibility === "shared" ? `"${d.title}" đã hiện cho học sinh.` : visibility === "private" ? `Đã đưa "${d.title}" ra khỏi thư viện chung.` : `Đã ẩn "${d.title}".` }
      : { ok: false, text: typeof j.detail === "string" ? j.detail : "Không đổi được" });
    load();
  };

  const remove = async (d: any) => {
    if (!window.confirm(`Xoá hẳn "${d.title}"? Học sinh đang học sách này sẽ mất bài học và ghi chú liên quan.`)) return;
    const r = await apiFetch(`${API}/documents/${d.id}`, { method: "DELETE" });
    setMsg(r.ok ? { ok: true, text: "Đã xoá sách." } : { ok: false, text: "Không xoá được sách." });
    load();
  };

  const st = (s: string) => s === "completed" ? <span className="st-badge st-badge-success">Sẵn sàng</span>
    : s === "failed" ? <span className="st-badge st-badge-danger">Lỗi xử lý</span> : <span className="st-badge st-badge-brand">Đang xử lý</span>;

  return (
    <div className="wrap stagger">
      <header className="page-head">
        <div><h1 className="page-title">Thư viện chung</h1><p className="page-sub">Sách ở đây hiện cho mọi học sinh, kể cả tài khoản miễn phí, và không tính vào lượt upload.</p></div>
        <Link className="st-btn st-btn-primary" href="/books">Tải sách vào thư viện chung</Link>
      </header>
      {msg && <div role={msg.ok ? "status" : "alert"} style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: msg.ok ? "var(--success-tint)" : "var(--danger-tint)", color: msg.ok ? "var(--success)" : "var(--danger)" }}>{msg.text}</div>}

      {!docs ? <div className="skeleton" style={{ height: 300 }} /> : docs.length === 0 ? (
        <div className="st-card" style={{ textAlign: "center", padding: 32 }}>
          <p className="ink2">Chưa có sách nào trong thư viện chung. Vào Thư viện sách → Tải sách lên và bật “Đưa vào Thư viện Studia”, hoặc đưa sách của một học sinh vào từ trang chi tiết tài khoản.</p>
        </div>
      ) : (
        <div className="table-box">
          <table className="table">
            <thead><tr><th scope="col">Sách</th><th scope="col">Xử lý</th><th scope="col">Người đọc</th><th scope="col">Hiện cho học sinh</th><th scope="col"><span className="st-sr">Hành động</span></th></tr></thead>
            <tbody>
              {docs.map((d) => {
                const on = d.visibility === "shared";
                const ready = d.processing_status === "completed";
                return (
                  <tr key={d.id}>
                    <td><b style={{ color: "var(--ink)", fontWeight: 600 }}>{d.title}</b><div className="meta">{(d.source_type || "").toUpperCase()} · thêm {new Date(d.created_at).toLocaleDateString("vi-VN")}</div></td>
                    <td>{st(d.processing_status)}</td>
                    <td className="num">{d.readers}</td>
                    <td><button type="button" className="sw" role="switch" aria-checked={on} aria-label={`Hiện ${d.title} cho học sinh`}
                      disabled={busy === d.id || (!on && !ready)} title={!on && !ready ? "Chờ xử lý xong mới bật hiện được" : undefined}
                      onClick={() => setVis(d, on ? "shared_draft" : "shared")} /></td>
                    <td>
                      <div className="row" style={{ gap: 4 }}>
                        <Link className="link" href={ready ? `/books/${d.id}` : `/books/${d.id}/read`}>Mở</Link>
                        <button className="st-btn st-btn-ghost st-btn-sm" type="button" disabled={busy === d.id} onClick={() => setVis(d, "private")}>Gỡ khỏi thư viện</button>
                        <button className="icon-btn" type="button" aria-label={`Xoá ${d.title}`} onClick={() => remove(d)}><Trash2 size={17} strokeWidth={1.75} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="meta">Sách đang xử lý chỉ bật hiện được khi đã sẵn sàng. Tắt hiện không xoá tiến độ của học sinh đã học sách đó.</p>
    </div>
  );
}

export default function AdminLibraryPage() {
  return <AdminGuard><SharedLibrary /></AdminGuard>;
}
