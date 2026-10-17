"use client";

import { useEffect, useRef, useState } from "react";
import CountUp from "@/components/CountUp";

const ITEMS: { n: number; unit?: string; label: string; tone: "accent" | "light" | "brand" | "mint" }[] = [
  { n: 4, label: "kỹ năng thi thử: Listening, Reading, Writing, Speaking", tone: "accent" },
  { n: 24, unit: "câu", label: "trong bài test trình độ, làm hết khoảng 12 phút", tone: "light" },
  { n: 5, unit: "bước", label: "tự động xử lý mỗi cuốn sách bạn tải lên", tone: "brand" },
  { n: 1, unit: "cuốn", label: "sách miễn phí để dùng thử, mua thêm khi cần", tone: "mint" },
];

/** Số đếm lên khi cuộn tới. */
function Big({ n, unit, go }: { n: number; unit?: string; go: boolean }) {
  return (
    <div className="lp-bignum">
      <b>{go ? <CountUp value={n} duration={1300} /> : 0}</b>
      {unit && <small>{unit}</small>}
    </div>
  );
}

/** Dải số liệu: số rất lớn trên nền navy. */
export default function Numbers() {
  const ref = useRef<HTMLUListElement>(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setGo(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setGo(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp-numbers">
      <ul className="lp-ngrid" ref={ref}>
        {ITEMS.map((it, i) => (
          <li key={i} className="lp-ncard" data-tone={it.tone} aria-label={`${it.n} ${it.unit || ""} ${it.label}`}>
            <Big n={it.n} unit={it.unit} go={go} />
            <p>{it.label}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
