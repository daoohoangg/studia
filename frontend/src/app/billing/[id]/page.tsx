"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Check, Clock } from "lucide-react";
import { usePolling } from "@/lib/usePolling";
import { apiFetch } from "@/lib/api";
import { formatVnd, refreshAccount, ORDER_STATUS } from "@/lib/account";

function useCountdown(until?: string) {
  const [left, setLeft] = useState<number>(0);
  useEffect(() => {
    if (!until) return;
    const end = new Date(until).getTime();
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [until]);
  return left;
}

function CopyBtn({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="st-btn st-btn-ghost st-btn-sm" onClick={() => {
      navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); });
    }}>{done ? "Đã chép" : "Sao chép"}</button>
  );
}

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch(`/billing/orders/${id}`);
    if (!res.ok) { setError("Không tìm thấy đơn này."); return; }
    const d = await res.json();
    setOrder(d.order);
    if (d.order?.status === "paid") refreshAccount();
  }, [id]);

  useEffect(() => { load(); }, [load]);
  // Chờ tiền về: hỏi lại mỗi 4 giây (webhook ngân hàng cập nhật đơn phía máy chủ)
  usePolling(load, 5000, order?.status === "pending");

  const left = useCountdown(order?.expires_at);
  useEffect(() => { if (order?.status === "pending" && left === 0 && order.expires_at) load(); }, [left, order, load]);

  const cancel = async () => {
    if (!window.confirm("Huỷ đơn này? Nếu bạn đã chuyển tiền, đừng huỷ — hãy chờ thêm hoặc báo quản lý.")) return;
    setBusy(true);
    await apiFetch(`/billing/orders/${id}/cancel`, { method: "POST" });
    setBusy(false);
    load();
  };

  const recreate = async () => {
    if (!order?.pack_id) return router.push("/billing");
    setBusy(true);
    const res = await apiFetch("/billing/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack_id: order.pack_id }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) router.push(`/billing/${d.order.id}`);
    else setError(typeof d.detail === "string" ? d.detail : "Không tạo được mã mới");
  };

  if (error) return <div className="wrap"><div role="alert" className="st-card">{error} <Link className="link" href="/billing">Về trang gói</Link></div></div>;
  if (!order) return <div className="wrap"><div className="skeleton" style={{ height: 420 }} /></div>;

  const pay = order.payment;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const st = ORDER_STATUS[order.status] || { label: order.status, badge: "st-badge" };

  return (
    <div className="wrap" style={{ maxWidth: 960 }}>
      <header>
        <Link className="crumb" href="/billing"><ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />Gói &amp; lượt upload</Link>
        <h1 className="page-title">Thanh toán gói +{order.books} sách</h1>
        <p className="page-sub">Đơn {order.code} · tạo lúc {new Date(order.created_at).toLocaleString("vi-VN")}</p>
      </header>

      {order.status === "pending" && pay?.gateway ? (
        <div className="st-card stack" style={{ gap: 18, maxWidth: 560 }}>
          <div className="kv-row"><span className="k">Gói</span><span className="v">+{order.books} sách</span><span /></div>
          <div className="kv-row"><span className="k">Số tiền</span><span className="v">{formatVnd(order.amount_vnd)}</span><span /></div>
          <div className="kv-row"><span className="k">Mã đơn</span><span className="pay-code">{order.code}</span><CopyBtn value={order.code} /></div>
          <p className="meta">Bạn sẽ được chuyển sang trang thanh toán của SePay để quét mã QR bằng app ngân hàng. Lượt upload được cộng tự động ngay khi thanh toán xong.</p>
          <form action={pay.gateway.action_url} method="POST">
            {Object.entries(pay.gateway.fields as Record<string, string>).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <button type="submit" className="st-btn st-btn-primary st-btn-block">Thanh toán bằng mã QR</button>
          </form>
          <div role="status" aria-live="polite" className="row" style={{ gap: 12, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--brand-tint)", fontSize: 14 }}>
            <span className="st-spinner" aria-hidden="true" />
            <span>Đang chờ thanh toán. Quay lại trang này sau khi trả tiền, trạng thái tự cập nhật. Mã hết hạn sau <b className="num">{mm}:{ss}</b>.</span>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button className="st-btn st-btn-ghost" type="button" onClick={cancel} disabled={busy}>Huỷ đơn</button>
            <button className="st-btn st-btn-secondary" type="button" onClick={load}>Kiểm tra lại</button>
          </div>
        </div>
      ) : order.status === "pending" && pay ? (
        <div className="st-card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32, alignItems: "start" }}>
          <div className="stack" style={{ alignItems: "center", gap: 12 }}>
            <div className="qr-box">
              {pay.qr_url ? <img src={pay.qr_url} alt={`Mã VietQR chuyển ${formatVnd(order.amount_vnd)} cho đơn ${order.code}`} /> : <span className="meta">Không tạo được mã QR</span>}
            </div>
            <span className="meta">Quét bằng app ngân hàng bất kỳ</span>
            <div className={`st-timer${left < 120 ? " st-timer-warn" : ""}`} role="timer" aria-label={`Mã hết hạn sau ${mm} phút ${ss} giây`}>
              <Clock size={16} strokeWidth={1.75} aria-hidden="true" />{mm}:{ss}
            </div>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div role="status" aria-live="polite" className="row" style={{ gap: 12, padding: "14px 16px", borderRadius: "var(--radius-md)", background: "var(--brand-tint)", color: "var(--ink)" }}>
              <span className="st-spinner" aria-hidden="true" />
              <span><b style={{ fontWeight: 600 }}>Đang chờ tiền về…</b> Trang tự cập nhật khi ngân hàng báo có, thường dưới 1 phút.</span>
            </div>
            <div>
              <div className="kv-row"><span className="k">Ngân hàng</span><span className="v">{pay.bank_id}</span><span /></div>
              <div className="kv-row"><span className="k">Số tài khoản</span><span className="v">{pay.account_no}</span><CopyBtn value={pay.account_no} /></div>
              {pay.account_name && <div className="kv-row"><span className="k">Chủ tài khoản</span><span className="v">{pay.account_name}</span><span /></div>}
              <div className="kv-row"><span className="k">Số tiền</span><span className="v">{formatVnd(order.amount_vnd)}</span><CopyBtn value={String(order.amount_vnd)} /></div>
              <div className="kv-row"><span className="k">Nội dung</span><span className="pay-code">{order.code}</span><CopyBtn value={order.code} /></div>
            </div>
            <p style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--warning-tint)", color: "var(--ink)", fontSize: 14 }}>
              Ghi <b>đúng nội dung {order.code}</b> và <b>đúng số tiền</b> để lượt được cộng tự động. Chuyển sai, đơn sẽ chờ quản lý kiểm tra tay.
            </p>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <button className="st-btn st-btn-ghost" type="button" onClick={cancel} disabled={busy}>Huỷ đơn</button>
              <button className="st-btn st-btn-secondary" type="button" onClick={load}>Kiểm tra lại</button>
            </div>
          </div>
        </div>
      ) : order.status === "paid" ? (
        <section className="st-card st-enter stack" role="status" style={{ alignItems: "center", textAlign: "center", gap: 16, padding: "48px 32px" }}>
          <span className="tile tile-success" style={{ width: 64, height: 64, borderRadius: "50%" }} aria-hidden="true"><Check size={30} strokeWidth={2.5} /></span>
          <div>
            <h2 style={{ font: "700 28px/34px var(--font-display)", letterSpacing: "-0.5px" }}>Đã nhận thanh toán</h2>
            <p className="ink2" style={{ marginTop: 6 }}>+{order.books} lượt upload đã được cộng.{order.quota ? <> Bạn còn <b style={{ color: "var(--ink)" }}>{order.quota.remaining} lượt</b>.</> : null}</p>
          </div>
          <div className="row" style={{ gap: 8 }}><Link className="st-btn st-btn-secondary" href="/billing">Xem lịch sử</Link><Link className="st-btn st-btn-primary" href="/books">Tải sách lên ngay</Link></div>
        </section>
      ) : (
        <section className="st-card st-enter stack" role="status" style={{ alignItems: "center", textAlign: "center", gap: 16, padding: "48px 32px" }}>
          <span className={st.badge}>{st.label}</span>
          <div>
            <h2 style={{ font: "700 26px/32px var(--font-display)", letterSpacing: "-0.5px" }}>
              {order.status === "review" ? "Đơn đang chờ quản lý kiểm tra" : order.status === "expired" ? "Mã thanh toán đã hết hạn" : "Đơn đã đóng"}
            </h2>
            <p className="ink2" style={{ marginTop: 6, maxWidth: 480 }}>
              {order.status === "review"
                ? "Tiền đã về nhưng chưa khớp (ví dụ thiếu tiền). Quản lý sẽ đối chiếu và xử lý trong ngày."
                : order.status === "expired"
                  ? "Nếu bạn đã chuyển tiền, đừng lo — giao dịch vẫn được ghi nhận và lượt sẽ được cộng khi tiền về đúng nội dung."
                  : order.note || "Đơn này không còn hiệu lực."}
            </p>
          </div>
          {order.status !== "review" && <button className="st-btn st-btn-primary" type="button" onClick={recreate} disabled={busy}>Tạo mã mới</button>}
        </section>
      )}
    </div>
  );
}
