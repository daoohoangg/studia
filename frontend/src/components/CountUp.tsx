"use client";

import { useEffect, useState } from "react";

/** Số đếm lên mượt khi xuất hiện (tắt khi người dùng bật giảm chuyển động). */
export default function CountUp({ value, decimals = 0, duration = 900 }: { value: number; decimals?: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !Number.isFinite(value)) { setShown(value); return; }
    let raf = 0; let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const k = Math.min(1, (t - start) / duration);
      setShown(value * (1 - Math.pow(1 - k, 4)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="tabular">{shown.toFixed(decimals)}</span>;
}
