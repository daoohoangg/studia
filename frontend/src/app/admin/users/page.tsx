"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatVnd } from "@/lib/account";
import AdminGuard, { initials } from "@/components/AdminGuard";

type Filter = "" | "student" | "admin" | "paying" | "locked";
const FILTERS: [Filter, string][] = [["", "Tất cả"], ["student", "Học sinh"], ["admin", "Quản lý"], ["paying", "Đã mua lượt"], ["locked", "Bị khoá"]];

function Users() {
  const [filter, setFilter] = useState<Filter>("");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);

  useEffect(() => { const t = setTimeout(() => { setDebounced(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ q: debounced, page: String(page) });
    if (filter === "student" || filter === "admin") p.set("role", filter);
    if (filter === "locked") p.set("status", "locked");
    if (filter === "paying") p.set("paying", "true");
    const res = await apiFetch(`/admin/users?${p}`);
    if (res.ok) setData(await res.json());
  }, [debounced, page, filter]);
  useEffect(() => { load(); }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="wrap stagger">
      <header className="page-head"><div><h1 className="page-title">Tài khoản</h1><p className="page-sub">{data ? `${data.total.toLocaleString("vi-VN")} tài khoản khớp bộ lọc` : "Đang tải…"}</p></div></header>
      <div className="row-wrap" style={{ justifyContent: "space-between", gap: 12 }}>
        <div className="row-wrap" role="group" aria-label="Lọc" style={{ gap: 6 }}>
          {FILTERS.map(([k, label]) => (
            <button key={k || "all"} className="st-chip" type="button" aria-pressed={filter === k} onClick={() => { setFilter(k); setPage(1); }}>{label}</button>
          ))}
        </div>
        <label className="input-icon" style={{ width: "min(320px, 100%)" }}>
          <span className="st-sr">Tìm tài khoản</span>
          <Search className="ico" size={18} strokeWidth={1.75} aria-hidden="true" />
          <input className="input" type="search" placeholder="Tên hoặc email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {!data ? <div className="skeleton" style={{ height: 320 }} /> : data.users.length === 0 ? (
        <div className="st-card" style={{ textAlign: "center" }}><p className="ink2">Không có tài khoản nào khớp.</p></div>
      ) : (
        <div className="table-box">
          <table className="table">
            <thead><tr><th scope="col">Người dùng</th><th scope="col">Vai trò</th><th scope="col">Lượt còn</th><th scope="col">Sách đã tải</th><th scope="col">Đã chi</th><th scope="col">Tham gia</th><th scope="col">Trạng thái</th><th scope="col"><span className="st-sr">Hành động</span></th></tr></thead>
            <tbody>
              {data.users.map((u: any) => (
                <tr key={u.id} style={u.status === "locked" ? { opacity: 0.65 } : undefined}>
                  <td><div className="who"><span className="av" data-admin={u.role === "admin" ? "" : undefined} aria-hidden="true">{initials(u.full_name, u.email)}</span><div style={{ minWidth: 0 }}><b>{u.full_name || u.email || "(chưa có email)"}</b><span className="meta">{u.full_name ? u.email : u.id.slice(0, 8)}</span></div></div></td>
                  <td><span className={u.role === "admin" ? "st-badge st-badge-solid" : "st-badge"}>{u.role === "admin" ? "Quản lý" : "Học sinh"}</span></td>
                  <td className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>{u.remaining === null ? "Không giới hạn" : u.remaining}</td>
                  <td className="num">{u.uploads}</td>
                  <td className="num">{formatVnd(u.spent_vnd)}</td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "—"}</td>
                  <td><span className={u.status === "locked" ? "st-badge st-badge-danger" : "st-badge st-badge-success"}>{u.status === "locked" ? "Bị khoá" : "Hoạt động"}</span></td>
                  <td><Link className="link" href={`/admin/users/${u.id}`}>Chi tiết</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && pages > 1 && (
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="meta num">Trang {page} / {pages}</span>
          <div className="row" style={{ gap: 6 }}>
            <button className="st-btn st-btn-secondary st-btn-sm" type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button>
            <button className="st-btn st-btn-secondary st-btn-sm" type="button" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Sau</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return <AdminGuard><Users /></AdminGuard>;
}
