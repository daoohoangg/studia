"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Lỗi không bắt được trong một trang: hiện màn 500 thay vì trắng trang. */
export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="wrap-narrow" style={{ minHeight: "60vh", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ font: "750 96px/1 var(--font-display)", letterSpacing: -4 }} aria-hidden="true">5<span style={{ color: "var(--accent)" }}>0</span>0</div>
      <h1 className="page-title">Studia đang gặp trục trặc</h1>
      <p className="page-sub" style={{ maxWidth: 460 }}>Lỗi nằm ở phía ứng dụng, không phải do bạn. Bài làm và tiến độ đã lưu trước đó vẫn an toàn.</p>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button className="st-btn st-btn-primary" type="button" onClick={reset}>Thử lại</button>
        <Link className="st-btn st-btn-secondary" href="/">Về trang Hôm nay</Link>
      </div>
      {error.digest && <p className="meta">Mã lỗi: {error.digest} · gửi mã này nếu bạn cần hỗ trợ</p>}
    </div>
  );
}
