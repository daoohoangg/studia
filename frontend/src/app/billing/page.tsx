"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAccount, formatVnd, ORDER_STATUS } from "@/lib/account";
import BuyPacks from "@/components/BuyPacks";

const REASON: Record<string, string> = {
  purchase: "Mua gói", upload: "Tải sách", admin_adjust: "Quản lý điều chỉnh", refund: "Hoàn lượt",
};

export default function BillingPage() {
  const { account, isAdmin, refresh } = useAccount();
  const [orders, setOrders] = useState<any[] | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    refresh();
    apiFetch("/billing/orders").then(async (r) => setOrders(r.ok ? (await r.json()).orders || [] : [])).catch(() => setOrders([]));
    apiFetch("/billing/ledger").then(async (r) => r.ok && setLedger((await r.json()).ledger || [])).catch(() => {});
  }, [refresh]);

  const q = account?.quota;

  if (isAdmin) {
    return (
      <div className="wrap">
        <header className="page-head"><div><h1 className="page-title">Gói &amp; lượt upload</h1>
          <p className="page-sub">Tài khoản quản lý tải sách không giới hạn. Quản lý gói và giá ở mục Quản trị.</p></div>
          <Link className="st-btn st-btn-primary" href="/admin/packs">Mở Gói &amp; cài đặt</Link></header>
      </div>
    );
  }

  return (
    <div className="wrap stagger">
      <header className="page-head">
        <div>
          <h1 className="page-title">Gói &amp; lượt upload</h1>
          <p className="page-sub">Học Thư viện Studia luôn miễn phí. Lượt upload dùng để tải sách của riêng bạn lên.</p>
        </div>
      </header>

      <section className="st-card row-wrap" style={{ gap: 28, padding: "24px 28px" }} aria-label="Số lượt hiện có">
        <div>
          <div className="meta">Lượt còn lại</div>
          <b className="num" style={{ font: "750 48px/1 var(--font-display)", letterSpacing: "-1.5px" }}>{q ? q.remaining : "–"}</b>
        </div>
        <span style={{ width: 1, alignSelf: "stretch", background: "var(--hairline)" }} />
        <div className="stack" style={{ gap: 4, flex: 1, minWidth: 240, fontSize: 14.5 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><span className="ink2">Miễn phí</span><b className="num">{q?.free ?? "–"}</b></div>
          <div className="row" style={{ justifyContent: "space-between" }}><span className="ink2">Đã mua</span><b className="num">{q?.purchased ?? "–"}</b></div>
          {!!q?.adjusted && <div className="row" style={{ justifyContent: "space-between" }}><span className="ink2">Quản lý điều chỉnh</span><b className="num">{q.adjusted > 0 ? `+${q.adjusted}` : q.adjusted}</b></div>}
          <div className="row" style={{ justifyContent: "space-between" }}><span className="ink2">Đã dùng (sách đã tải)</span><b className="num">{q ? `−${q.used}` : "–"}</b></div>
        </div>
        <Link className="st-btn st-btn-secondary" href="/books">Về thư viện</Link>
      </section>

      <section aria-labelledby="pk-h">
        <div className="sec-head"><h2 id="pk-h" className="sec-title">Mua thêm lượt</h2><span className="meta">Thanh toán một lần · không hết hạn</span></div>
        <BuyPacks />
      </section>

      <section aria-labelledby="hs-h">
        <div className="sec-head"><h2 id="hs-h" className="sec-title">Lịch sử thanh toán</h2></div>
        {orders === null ? <div className="skeleton" style={{ height: 120 }} /> : orders.length === 0 ? (
          <p className="meta">Chưa có đơn nào.</p>
        ) : (
          <div className="table-box">
            <table className="table">
              <thead><tr><th scope="col">Mã đơn</th><th scope="col">Gói</th><th scope="col">Số tiền</th><th scope="col">Ngày</th><th scope="col">Trạng thái</th><th scope="col"><span className="st-sr">Hành động</span></th></tr></thead>
              <tbody>
                {orders.map((o) => {
                  const st = ORDER_STATUS[o.status] || { label: o.status, badge: "st-badge" };
                  return (
                    <tr key={o.id}>
                      <td className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>{o.code}</td>
                      <td>+{o.books} sách</td>
                      <td className="num">{formatVnd(o.amount_vnd)}</td>
                      <td>{new Date(o.created_at).toLocaleDateString("vi-VN")}</td>
                      <td><span className={st.badge}>{st.label}</span></td>
                      <td>{o.status === "pending" && <Link className="link" href={`/billing/${o.id}`}>Mở mã QR</Link>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {ledger.length > 0 && (
        <section className="st-card" aria-labelledby="lg-h">
          <div className="sec-head"><h2 id="lg-h" className="sec-title">Sổ lượt upload</h2></div>
          <div>
            {ledger.slice(0, 30).map((r) => (
              <div key={r.id} className="ledger-row">
                <span className="meta">{new Date(r.created_at).toLocaleDateString("vi-VN")}</span>
                <span>{REASON[r.reason] || r.reason}{r.note ? ` · ${r.note}` : ""}</span>
                <b className="num" style={{ textAlign: "right", color: r.delta > 0 ? "var(--success)" : "var(--ink-muted)" }}>{r.delta > 0 ? `+${r.delta}` : `−${Math.abs(r.delta)}`}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="st-card" aria-labelledby="faq-h">
        <h2 id="faq-h" className="heading-3" style={{ marginBottom: 8 }}>Câu hỏi thường gặp</h2>
        <div className="stack" style={{ gap: 12, fontSize: 14.5 }}>
          <div><b style={{ fontWeight: 600 }}>Xoá sách có được hoàn lượt không?</b><p className="ink2">Không. Mỗi lần tải một cuốn sách mới là dùng một lượt. Xử lý lại sách đã tải không tốn lượt.</p></div>
          <div><b style={{ fontWeight: 600 }}>Chuyển khoản rồi mà chưa thấy cộng lượt?</b><p className="ink2">Thường dưới 1 phút. Nếu chuyển sai nội dung hoặc số tiền, đơn chuyển sang quản lý kiểm tra tay.</p></div>
        </div>
      </section>
    </div>
  );
}
