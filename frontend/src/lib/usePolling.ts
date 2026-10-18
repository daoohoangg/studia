import { useEffect, useRef } from "react";

/**
 * Gọi `fn` định kỳ chỉ khi `enabled` và tab đang hiển thị; quay lại tab thì gọi ngay một lần.
 * Thay cho setInterval trần để tab nền / tác vụ đã xong không tiếp tục gửi yêu cầu lên backend.
 */
export function usePolling(fn: () => void | Promise<void>, ms: number, enabled = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!t) t = setInterval(() => { void ref.current(); }, ms); };
    const stop = () => { if (t) { clearInterval(t); t = null; } };
    const onVis = () => { if (document.hidden) stop(); else { void ref.current(); start(); } };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [ms, enabled]);
}
