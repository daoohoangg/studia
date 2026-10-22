"use client";

import Mascot from "@/components/mascot/Mascot";
import { pickMood } from "@/lib/mascot";
import { WEEKDAYS_SHORT, type Streak, parse, weekdayIdx } from "@/lib/schedule";

/** Chuỗi ngày học liên tiếp, 7 ngày gần nhất và mốc kế tiếp. */
export default function StreakCard({ streak, loading }: { streak: Streak | null; loading: boolean }) {
  if (loading || !streak) return <div className="skeleton sk-card" aria-hidden="true" />;

  const { current, longest, at_risk, today_done, next_milestone, to_next_milestone, total_days } = streak;
  const msg = at_risk
    ? "Hôm nay chưa học. Xong một nhiệm vụ hoặc lưu một khoảnh khắc để giữ chuỗi."
    : today_done
      ? "Hôm nay bạn đã giữ được chuỗi."
      : "Bắt đầu chuỗi mới ngay hôm nay.";
  const pct = next_milestone ? Math.min(100, Math.round(((next_milestone - to_next_milestone) / next_milestone) * 100)) : 100;

  return (
    <section className="sk st-card" aria-labelledby="sk-h" data-state={at_risk ? "risk" : today_done ? "ok" : "idle"}>
      <div className="sk-head">
        <Mascot {...(({ mood, wet, fire }) => ({ mood, wet, fire }))(pickMood(streak))} size={84} />
        <div>
          <h2 id="sk-h" className="sk-num num"><b>{current}</b> <span>ngày liên tiếp</span></h2>
          <p className="sk-msg">{msg}</p>
        </div>
      </div>

      <ol className="sk-week" aria-label="7 ngày gần nhất">
        {streak.week.map((d, i) => (
          <li key={d.date} data-on={d.active || undefined} data-today={i === streak.week.length - 1 || undefined}>
            <i title={`${d.date}${d.minutes ? ` · ${d.minutes} phút` : ""}`} aria-label={`${d.date}: ${d.active ? "đã học" : "chưa học"}`}>{d.active ? "✓" : ""}</i>
            <span>{WEEKDAYS_SHORT[weekdayIdx(d.date)]}</span>
          </li>
        ))}
      </ol>

      <div className="sk-foot">
        <div><b className="num">{longest}</b><span>Kỷ lục</span></div>
        <div><b className="num">{total_days}</b><span>Tổng ngày học</span></div>
        <div className="sk-ms">
          <span>{next_milestone ? `Còn ${to_next_milestone} ngày tới mốc ${next_milestone}` : "Bạn đã vượt mọi mốc"}</span>
          <div className="tg-bar sk-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        </div>
      </div>
    </section>
  );
}
