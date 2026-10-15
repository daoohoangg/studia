"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatVnd, ORDER_STATUS } from "@/lib/account";
import AdminGuard, { fmtDateTime } from "@/components/AdminGuard";

function Overview() {
  const [s, setS] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    apiFetch("/admin/stats").then(async (r) => r.ok && setS(await r.json()));
    apiFetch("/admin/orders?page=1").then(async (r) => r.ok && setOrders(((await r.json()).orders || []).slice(0, 6)));
  }, []);
  if (!s) return <div className="wrap"><div className="grid-4">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 110 }} />)}</div></div>;
  const max = Math.max(1, ...s.revenue_by_day.map((d: any) => d.amount_vnd));
  const setupMissing = !s.bank_configured || !s.webhook_configured;
  return (
    <div className="wrap stagger">
      <header className="page-head">
        <div><span className="st-badge st-badge-solid" style={{ marginBottom: 8 }}>Quản lý</span><h1 className="page-title">Tổng quan hệ thống</h1><p className="page-sub">Số liệu 30 ngày gần nhất.</p></div>
        {s.orders_review > 0 && <Link className="st-btn st-btn-primary" href="/admin/orders">{s.orders_review} mục cần kiểm tra</Link>}
      </header>

      {setupMissing && (
        <div role="status" className="row-wrap" style={{ gap: 12, padding: "14px 18px", borderRadius: "var(--radius-md)", background: "var(--warning-tint)" }}>
          <span style={{ flex: 1, color: "var(--ink)" }}>
            <b style={{ fontWeight: 600 }}>Thanh toán chưa sẵn sàng:</b>{" "}
            {!s.bank_configured && "chưa nhập tài khoản nhận tiền. "}{!s.webhook_configured && "chưa đặt SEPAY_API_KEY hoặc SEPAY_WEBHOOK_SECRET trong backend/.env."}
          </span>
          <Link className="st-btn st-btn-secondary st-btn-sm" href="/admin/packs">Cấu hình</Link>
        </div>
      )}

      <section className="grid-4" aria-label="Chỉ số">
        <div className="st-stat"><span className="meta">Tài khoản</span><span className="st-stat-value num">{s.users_total.toLocaleString("vi-VN")}</span><span className="st-stat-hint">+{s.users_new_30d} trong 30 ngày · {s.admins} quản lý</span></div>
        <div className="st-stat"><span className="meta">Đã từng mua lượt</span><span className="st-stat-value num">{s.paying_users}</span><span className="st-stat-hint">{s.users_total ? ((s.paying_users / s.users_total) * 100).toFixed(1) : 0}% tài khoản</span></div>
        <div className="st-stat"><span className="meta">Doanh thu 30 ngày</span><span className="st-stat-value num" style={{ fontSize: 28 }}>{formatVnd(s.revenue_30d)}</span><span className="st-stat-hint">{s.paid_orders_30d} đơn · {s.auto_matched_30d} tự động</span></div>
        <div className="st-stat"><span className="meta">Sách đang xử lý</span><span className="st-stat-value num" style={{ color: s.docs_processing ? "var(--warning)" : undefined }}>{s.docs_processing}</span><span className="st-stat-hint">{s.docs_failed} lỗi</span></div>
      </section>

      <div className="split">
        <section className="st-card" aria-labelledby="rv-h">
          <div className="sec-head"><h2 id="rv-h" className="sec-title">Doanh thu 14 ngày</h2><span className="meta">VNĐ / ngày</span></div>
          <div className="rev-bars" role="img" aria-label={`Doanh thu 14 ngày, cao nhất ${formatVnd(max)}`}>
            {s.revenue_by_day.map((d: any) => (
              <i key={d.date} title={`${new Date(d.date).toLocaleDateString("vi-VN")}: ${formatVnd(d.amount_vnd)}`}
                data-max={d.amount_vnd === max && max > 1 ? "" : undefined} style={{ height: `${(d.amount_vnd / max) * 100}%` }} />
            ))}
          </div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <span className="meta">{new Date(s.revenue_by_day[0].date).toLocaleDateString("vi-VN")}</span>
            <span className="meta">{new Date(s.revenue_by_day[13].date).toLocaleDateString("vi-VN")}</span>
          </div>
        </section>
        <section className="st-card" aria-labelledby="hl-h">
          <h2 id="hl-h" className="heading-3" style={{ marginBottom: 8 }}>Tình trạng thanh toán</h2>
          <div className="stack" style={{ gap: 10, fontSize: 14.5 }}>
            <div className="row"><span className="dot" style={{ background: s.webhook_configured ? "var(--success)" : "var(--danger)" }} /><span style={{ flex: 1 }}>Webhook ngân hàng</span><span className="meta">{s.last_webhook_at ? `lần cuối ${fmtDateTime(s.last_webhook_at)}` : "chưa nhận giao dịch nào"}</span></div>
            <div className="row"><span className="dot" style={{ background: s.bank_configured ? "var(--success)" : "var(--danger)" }} /><span style={{ flex: 1 }}>Tài khoản nhận tiền</span><span className="meta">{s.bank_configured ? "đã cấu hình" : "chưa cấu hình"}</span></div>
            <div className="row"><span className="dot" style={{ background: s.orders_review ? "var(--warning)" : "var(--success)" }} /><span style={{ flex: 1 }}>Cần kiểm tra</span><Link className="link" href="/admin/orders">{s.orders_review}</Link></div>
            <div className="row"><span className="dot" style={{ background: "var(--brand)" }} /><span style={{ flex: 1 }}>Đơn đang chờ thanh toán</span><span className="meta num">{s.orders_pending}</span></div>
          </div>
        </section>
      </div>

      <section aria-labelledby="ro-h">
        <div className="sec-head"><h2 id="ro-h" className="sec-title">Đơn gần đây</h2><Link className="link" href="/admin/orders">Tất cả đơn</Link></div>
        {orders.length === 0 ? <p className="meta">Chưa có đơn nào.</p> : (
          <div className="table-box">
            <table className="table">
              <thead><tr><th scope="col">Mã</th><th scope="col">Học sinh</th><th scope="col">Gói</th><th scope="col">Số tiền</th><th scope="col">Trạng thái</th><th scope="col">Tạo lúc</th></tr></thead>
              <tbody>
                {orders.map((o) => {
                  const st = ORDER_STATUS[o.status] || { label: o.status, badge: "st-badge" };
                  return (
                    <tr key={o.id}>
                      <td className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>{o.code}</td>
                      <td><Link className="link" href={`/admin/users/${o.user_id}`} style={{ fontWeight: 500 }}>{o.user_name || o.user_email || "—"}</Link></td>
                      <td>+{o.books} sách</td><td className="num">{formatVnd(o.amount_vnd)}</td>
                      <td><span className={st.badge}>{st.label}{o.status === "paid" && o.paid_method === "webhook" ? " · tự động" : ""}</span></td>
                      <td>{fmtDateTime(o.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminPage() {
  return <AdminGuard><Overview /></AdminGuard>;
}
