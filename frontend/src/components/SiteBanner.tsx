"use client";

import { useEffect, useState } from "react";
import { useSiteConfig } from "@/lib/siteConfig";

const KEY = "studia-banner-dismissed";

/** Thông báo toàn hệ thống do quản lý đặt. Học sinh tắt được; đổi nội dung thì hiện lại. */
export default function SiteBanner() {
  const { announcement } = useSiteConfig();
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    try { setDismissed(localStorage.getItem(KEY)); } catch {}
  }, []);

  if (!announcement || !announcement.text || dismissed === announcement.text) return null;
  const warn = announcement.level === "warning";
  return (
    <div role={warn ? "alert" : "status"} className="wrap" style={{ paddingBottom: 0 }}>
      <div className="row" style={{ gap: 12, padding: "12px 16px", borderRadius: "var(--radius-md)", background: warn ? "var(--warning-tint)" : "var(--brand-tint)", color: "var(--ink)" }}>
        <span style={{ flex: 1 }}>
          <b style={{ fontWeight: 600, color: warn ? "var(--warning)" : "var(--brand)" }}>{warn ? "Lưu ý: " : "Thông báo: "}</b>
          {announcement.text}
        </span>
        <button type="button" className="st-btn st-btn-ghost st-btn-sm" aria-label="Ẩn thông báo"
          onClick={() => { setDismissed(announcement.text); try { localStorage.setItem(KEY, announcement.text); } catch {} }}>Đóng</button>
      </div>
    </div>
  );
}
