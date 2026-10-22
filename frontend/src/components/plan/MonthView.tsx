"use client";

import { Camera, Flame } from "lucide-react";
import Mascot, { type Mood } from "@/components/mascot/Mascot";
import { type DayStat, MONTHS, WEEKDAYS_SHORT, addDays, heat, iso, parse, todayIso, weekdayIdx } from "@/lib/schedule";

/** Các ngày hiển thị của lưới tháng (bắt đầu từ thứ Hai, đủ tuần đầu và tuần cuối). */
export function monthGrid(anchor: string): { start: string; end: string; days: string[]; month: number } {
  const d = parse(anchor);
  const first = iso(new Date(d.getFullYear(), d.getMonth(), 1));
  const last = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const start = addDays(first, -weekdayIdx(first));
  const end = addDays(last, 6 - weekdayIdx(last));
  const days: string[] = [];
  for (let c = start; c <= end; c = addDays(c, 1)) days.push(c);
  return { start, end, days, month: d.getMonth() };
}

export default function MonthView({ anchor, stats, loading, onSelect, onOpen }: {
  anchor: string; stats: Record<string, DayStat>; loading: boolean;
  onSelect: (day: string) => void; onOpen: (day: string) => void;
}) {
  const today = todayIso();
  const { days, month } = monthGrid(anchor);
  const year = parse(anchor).getFullYear();

  return (
    <div className="mv" aria-busy={loading || undefined}>
      <div className="mv-head" aria-hidden="true">{WEEKDAYS_SHORT.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="mv-grid" role="grid" aria-label={`${MONTHS[month]}, ${year}`}>
        {days.map((day) => {
          const s = stats[day];
          const out = parse(day).getMonth() !== month;
          const past = day < today;
          const isSel = day === anchor;
          const full = !!s && s.tasks_total > 0 && s.tasks_done >= s.tasks_total;
          const missed = !!s && past && !s.active && (s.tasks_total > 0 || s.slots > 0);
          const level = heat(s?.minutes || 0, !!s?.active);
          // Trang trí góc ô: ảnh người dùng lưu hôm đó; không có ảnh thì Coal mini theo trạng thái ngày
          const planned = !!s && (s.tasks_total > 0 || s.slots > 0);
          const mood: Mood | null = full ? "cheer" : s?.active ? "happy" : missed ? "sad" : day === today ? "focus" : !past && planned ? "hello" : null;
          return (
            <button key={day} type="button" role="gridcell" className="mv-cell"
              data-out={out || undefined} data-today={day === today || undefined} data-sel={isSel || undefined}
              data-heat={level} data-missed={missed || undefined} data-full={full || undefined}
              aria-pressed={isSel} aria-current={day === today ? "date" : undefined}
              aria-label={`${parse(day).getDate()} ${MONTHS[parse(day).getMonth()]}${s ? `, ${s.tasks_done}/${s.tasks_total} nhiệm vụ, ${s.slots} khung giờ, ${s.minutes} phút` : ""}`}
              onClick={() => onSelect(day)} onDoubleClick={() => onOpen(day)}>
              <span className="mv-top">
                <span className="mv-n num">{parse(day).getDate()}</span>
                {s?.active && <Flame size={14} strokeWidth={2.4} className="mv-flame" aria-hidden="true" />}
              </span>
              <span className="mv-chips">
                {s?.labels?.slice(0, 2).map((l, i) => <i key={i} className="mv-chip">{l}</i>)}
              </span>
              {s?.cover
                ? <img className="mv-deco mv-photo" src={s.cover} alt="" loading="lazy" draggable={false} />
                : mood && <span className="mv-deco" aria-hidden="true"><Mascot mood={mood} size={34} still label="" /></span>}
              <span className="mv-foot">
                {s && s.minutes > 0 && <span className="num">{s.minutes}&prime;</span>}
                {s && s.slots > 0 && <span className="mv-badge" title="Khung giờ">{s.slots} giờ</span>}
                {s && s.moments > 0 && <span className="mv-badge" title="Khoảnh khắc"><Camera size={11} aria-hidden="true" />{s.moments}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mv-legend meta" aria-hidden="true">
        <span className="row" style={{ gap: 6 }}>Ít<i className="lg" data-heat="1" /><i className="lg" data-heat="2" /><i className="lg" data-heat="3" /><i className="lg" data-heat="4" />Nhiều</span>
        <span className="row" style={{ gap: 6 }}><Flame size={13} className="mv-flame" />Ngày có học</span>
        <span className="row" style={{ gap: 6 }}><i className="lg miss" />Bỏ lỡ</span>
        <span className="meta">Bấm một ngày để xem nhanh, bấm đúp để mở chi tiết.</span>
      </div>
    </div>
  );
}
