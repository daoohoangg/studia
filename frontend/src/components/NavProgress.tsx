"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thanh tiến trình mảnh trên đầu trang: chạy ngay khi bấm một liên kết nội bộ và hoàn tất khi trang mới hiện,
 * để người dùng thấy phản hồi tức thì ngay cả khi trang đích còn đang tải.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  const stop = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      stop();
      setVisible(true);
      setWidth(12);
      timer.current = setInterval(() => setWidth((w) => (w < 85 ? w + (90 - w) * 0.12 : w)), 180);
    };
    document.addEventListener("click", onClick, true);
    return () => { document.removeEventListener("click", onClick, true); stop(); };
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    stop();
    setWidth(100);
    hideTimer.current = setTimeout(() => { setVisible(false); setWidth(0); }, 260);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [pathname]);

  return (
    <div aria-hidden="true" style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 100, pointerEvents: "none",
      opacity: visible ? 1 : 0, transition: "opacity .2s",
    }}>
      <div style={{
        height: "100%", width: `${width}%`, background: "linear-gradient(90deg, var(--brand), var(--accent))",
        borderRadius: "0 3px 3px 0", transition: "width .2s ease-out", boxShadow: "0 0 8px color-mix(in srgb, var(--brand) 50%, transparent)",
      }} />
    </div>
  );
}
