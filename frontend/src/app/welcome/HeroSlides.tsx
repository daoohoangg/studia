"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Flame } from "lucide-react";

const TITLES = ["Hôm nay", "Lịch học", "Flashcard", "Thi thử"];
const TASKS: [string, string][] = [
  ["Ôn 24 thẻ sắp quên", "8 phút · Flashcard"],
  ["Reading: Urban bees", "20 phút · 13 câu"],
  ["Nói thử Part 2: Describe a place", "10 phút · cùng Studia AI"],
];
const BANDS: [string, number][] = [["Listening", 7.0], ["Reading", 6.5], ["Writing", 6.0], ["Speaking", 6.5]];
const WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
// 5 tuần x 7 ngày: mức tô theo số phút đã học (0 = nghỉ)
const HEAT = [0, 2, 3, 1, 3, 2, 0, 1, 3, 3, 2, 4, 2, 0, 2, 4, 3, 3, 4, 2, 1, 3, 4, 4, 3, 4, 3, 0, 4, 4, 3, 4, 4, 2, 0];

/** Khung minh hoạ ở màn đầu: tự chuyển giữa các màn hình chính của Studia. */
export default function HeroSlides() {
  const [i, setI] = useState(0);
  const [ticks, setTicks] = useState(0);
  const hold = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => { if (!hold.current && !document.hidden) setI((x) => (x + 1) % TITLES.length); }, 5200);
    return () => clearInterval(id);
  }, [i]);

  // Slide đầu: lần lượt tích xong từng nhiệm vụ mỗi lần quay lại
  useEffect(() => {
    if (i !== 0) return;
    setTicks(0);
    const t = [setTimeout(() => setTicks(1), 900), setTimeout(() => setTicks(2), 1800), setTimeout(() => setTicks(3), 2700)];
    return () => t.forEach(clearTimeout);
  }, [i]);

  const cls = (n: number) => `lp-slide${i === n ? " on" : n < i ? " prev" : ""}`;

  return (
    <div className="lp-hero-win" onMouseEnter={() => (hold.current = true)} onMouseLeave={() => (hold.current = false)}>
      <div className="lp-win-bar">
        <i /><i /><i />
        <span className="lp-win-title" aria-live="polite">{TITLES[i]}</span>
      </div>
      <div className="lp-win-body">
        <div className="lp-sdots" role="tablist" aria-label="Chọn màn hình minh hoạ">
          {TITLES.map((t, n) => (
            <button key={t} type="button" role="tab" aria-selected={i === n} aria-label={t} onClick={() => setI(n)} />
          ))}
        </div>
        <div className="lp-slides">
          {/* 1 — hôm nay */}
          <div className={cls(0)} aria-hidden={i !== 0}>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <div className="lp-ring" role="img" aria-label="Band 6.5 trên 9">
                <svg width="100%" height="100%" viewBox="0 0 96 96" fill="none"><circle className="tr" cx="48" cy="48" r="42" strokeWidth="9" /><circle className="ar" cx="48" cy="48" r="42" strokeWidth="9" /></svg>
                <b>6.5</b>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="lp-s-kick">Hôm nay</div>
                <div className="lp-s-big">3 nhiệm vụ · 38 phút</div>
                <div className="lp-s-sub">Mục tiêu: IELTS 6.5 trong 3 tháng</div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              {TASKS.map(([t, m], k) => (
                <div key={t} className={`lp-task${ticks > k ? " on" : ""}`}>
                  <span className="ck"><Check size={15} strokeWidth={3.4} aria-hidden="true" /></span>
                  <div style={{ minWidth: 0 }}><b>{t}</b><span>{m}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* 2 — lịch học và streak */}
          <div className={cls(1)} aria-hidden={i !== 1}>
            <div className="lp-s-top">
              <div>
                <div className="lp-s-kick">Lịch học tháng 10</div>
                <div className="lp-s-big">Chuỗi <span className="lp-s-flame"><Flame size={22} strokeWidth={2.4} aria-hidden="true" />12</span> ngày</div>
                <div className="lp-s-sub">Nhắc qua email trước giờ học 10 phút</div>
              </div>
              <span className="lp-tag hot">Kỷ lục 19</span>
            </div>
            <div className="lp-cal" aria-hidden="true">
              {WEEK.map((d) => <em key={d}>{d}</em>)}
              {HEAT.map((h, k) => <i key={k} data-h={h} data-today={k === 24 || undefined} />)}
            </div>
            <div className="lp-slot">
              <b>19:00</b>
              <div><span>Reading Passage 2 · matching headings</span><small>Làm 13 câu, bấm giờ 20 phút. Ghi lại câu sai.</small></div>
            </div>
          </div>

          {/* 3 — flashcard */}
          <div className={cls(2)} aria-hidden={i !== 2}>
            <div className="lp-s-top"><div className="lp-s-kick">Environment · Flashcard</div><span className="lp-tag warn">Sắp quên</span></div>
            <div className="lp-fcard">
              <div className="w">mitigate</div>
              <div className="ph">/ˈmɪt.ɪ.ɡeɪt/</div>
              <div className="m">giảm nhẹ, làm dịu bớt</div>
              <p>Planting trees can help mitigate urban heat.</p>
            </div>
            <div className="lp-rate" aria-hidden="true">
              <span className="a">Quên<small>&lt; 1 ph</small></span><span className="h">Khó<small>6 ph</small></span><span className="g">Được<small>2 ngày</small></span><span className="e">Dễ<small>5 ngày</small></span>
            </div>
          </div>

          {/* 4 — thi thử */}
          <div className={cls(3)} aria-hidden={i !== 3}>
            <div className="lp-s-top">
              <div>
                <div className="lp-s-kick">Cambridge 21 · Test 3</div>
                <div className="lp-s-big">Overall band 6.5</div>
                <div className="lp-s-sub">+0.5 so với lần thi thử trước</div>
              </div>
              <span className="lp-tag ok">+0.5</span>
            </div>
            <div className="lp-bands">
              {BANDS.map(([k, v], n) => (
                <div key={k}>
                  <span>{k}</span>
                  <div className="bar"><i style={{ ["--w" as any]: `${(v / 9) * 100}%`, transitionDelay: `${n * 120}ms` }} /></div>
                  <b className="num">{v.toFixed(1)}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
