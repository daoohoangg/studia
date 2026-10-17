"use client";

import { Camera, Clock, Flame, CalendarCheck } from "lucide-react";
import { type DayStat, type Streak, MONTHS, WEEKDAYS_SHORT, fmtMinutes, heat, iso, parse, todayIso, weekdayIdx } from "@/lib/schedule";

const pad2 = (n: number) => String(n).padStart(2, "0");

export default function YearView({ year, stats, streak, loading, onPickDay, onPickMonth }: {
  year: number; stats: Record<string, DayStat>; streak: Streak | null; loading: boolean;
  onPickDay: (day: string) => void; onPickMonth: (month: number) => void;
}) {
  const today = todayIso();
  const entries = Object.entries(stats).filter(([k]) => k.startsWith(`${year}-`));
  const activeDays = entries.filter(([, s]) => s.active).length;
  const minutes = entries.reduce((a, [, s]) => a + s.minutes, 0);
  const moments = entries.reduce((a, [, s]) => a + s.moments, 0);

  return (
    <div className="yv" aria-busy={loading || undefined}>
      <div className="yv-sum">
        <div><span className="tile tile-sm" aria-hidden="true"><CalendarCheck size={16} /></span><b className="num">{activeDays}</b><span>ngày đã học</span></div>
        <div><span className="tile tile-sm" aria-hidden="true"><Clock size={16} /></span><b className="num">{fmtMinutes(minutes)}</b><span>tổng thời gian</span></div>
        <div><span className="tile tile-sm" aria-hidden="true"><Flame size={16} /></span><b className="num">{streak?.longest ?? 0}</b><span>chuỗi dài nhất</span></div>
        <div><span className="tile tile-sm" aria-hidden="true"><Camera size={16} /></span><b className="num">{moments}</b><span>khoảnh khắc</span></div>
      </div>

      <div className="yv-grid">
        {MONTHS.map((name, m) => {
          const first = iso(new Date(year, m, 1));
          const lead = weekdayIdx(first);
          const count = new Date(year, m + 1, 0).getDate();
          const inMonth = entries.filter(([k]) => k.startsWith(`${year}-${pad2(m + 1)}-`));
          const mDays = inMonth.filter(([, s]) => s.active).length;
          const mMin = inMonth.reduce((a, [, s]) => a + s.minutes, 0);
          return (
            <section key={name} className="yv-month" aria-label={`${name}, ${year}`}>
              <button type="button" className="yv-title" onClick={() => onPickMonth(m)}>
                <b>{name}</b>
                <span className="meta">{mDays > 0 ? `${mDays} ngày · ${fmtMinutes(mMin)}` : "Chưa có buổi học"}</span>
              </button>
              <div className="yv-days" role="grid">
                {WEEKDAYS_SHORT.map((d) => <i key={d} className="yv-wd" aria-hidden="true">{d.slice(-1) === "N" ? "CN" : d[1]}</i>)}
                {Array.from({ length: lead }, (_, i) => <i key={`b${i}`} aria-hidden="true" />)}
                {Array.from({ length: count }, (_, i) => {
                  const day = `${year}-${pad2(m + 1)}-${pad2(i + 1)}`;
                  const s = stats[day];
                  const missed = !!s && day < today && !s.active && (s.tasks_total > 0 || s.slots > 0);
                  return (
                    <button key={day} type="button" role="gridcell" className="yv-d" data-heat={heat(s?.minutes || 0, !!s?.active)}
                      data-today={day === today || undefined} data-missed={missed || undefined} data-photo={(s?.moments || 0) > 0 || undefined}
                      title={`${i + 1}/${m + 1}/${year}${s ? ` · ${s.minutes} phút` : ""}${s?.moments ? ` · ${s.moments} ảnh` : ""}`}
                      aria-label={`${parse(day).getDate()} ${name}${s?.active ? `, đã học ${s.minutes} phút` : ""}`}
                      onClick={() => onPickDay(day)} />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mv-legend meta" aria-hidden="true">
        <span className="row" style={{ gap: 6 }}>Ít<i className="lg" data-heat="1" /><i className="lg" data-heat="2" /><i className="lg" data-heat="3" /><i className="lg" data-heat="4" />Nhiều</span>
        <span className="row" style={{ gap: 6 }}><i className="lg miss" />Có lịch nhưng bỏ lỡ</span>
        <span className="row" style={{ gap: 6 }}><i className="lg photo" />Có ảnh khoảnh khắc</span>
      </div>
    </div>
  );
}
