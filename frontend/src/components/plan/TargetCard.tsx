"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import type { Profile, PlacementResult } from "@/lib/placement";
import { WEEKDAYS_SHORT, daysBetween, fmtMinutes, parse, todayIso } from "@/lib/schedule";

const R = 44;
const C = 2 * Math.PI * R;

/** Mục tiêu của học viên: band mong muốn, band hiện tại, ngày thi còn lại và nhịp học mỗi tuần. */
export default function TargetCard({ profile, placement, last7Minutes, loading }: {
  profile: Profile | null; placement: PlacementResult | null; last7Minutes: number; loading: boolean;
}) {
  if (loading) return <div className="skeleton tg-skel" aria-hidden="true" />;

  if (!profile) {
    return (
      <section id="muc-tieu" className="tg tg-empty st-card" aria-labelledby="tg-h">
        <span className="tile" aria-hidden="true"><Target size={20} strokeWidth={1.75} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="tg-h" className="heading-3">Chưa có mục tiêu học</h2>
          <p className="ink2">Đặt band mong muốn, ngày thi và số phút học mỗi ngày để Studia chia lịch cho bạn.</p>
        </div>
        <Link className="st-btn st-btn-primary" href="/onboarding">Đặt mục tiêu</Link>
      </section>
    );
  }

  const today = todayIso();
  const hasExam = !profile.noExam && !!profile.examDate;
  const daysLeft = hasExam ? daysBetween(today, profile.examDate) : null;
  const current = placement?.band ?? null;
  const gap = current != null ? Math.max(0, Math.round((profile.target - current) * 2) / 2) : null;
  const progress = current != null ? Math.min(1, Math.max(0, current / profile.target)) : 0;
  const perWeek = profile.minutes * Math.max(1, profile.days.length);
  const weekPct = Math.min(1, last7Minutes / perWeek);
  const examLabel = hasExam ? parse(profile.examDate).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <section id="muc-tieu" className="tg st-card-navy" aria-labelledby="tg-h">
      <div className="tg-main">
        <div className="tg-top">
          <span className="eyebrow tg-eyebrow">Mục tiêu của bạn</span>
          <Link className="tg-edit" href="/onboarding">Chỉnh mục tiêu</Link>
        </div>
        <h2 id="tg-h" className="tg-title">IELTS <b>{profile.target.toFixed(1)}</b></h2>
        <p className="tg-sub">
          {[profile.purpose, profile.kind === "Academic" ? "Academic" : "General Training", profile.level && `trình độ ban đầu ${profile.level}`].filter(Boolean).join(" · ")}
        </p>

        <div className="tg-facts">
          <div className="tg-fact">
            <span>Hiện tại</span>
            {current != null ? <b className="num">{current.toFixed(1)}</b> : <Link href="/placement" className="tg-link">Làm test trình độ</Link>}
          </div>
          <div className="tg-fact">
            <span>Còn thiếu</span>
            <b className="num">{gap != null ? (gap > 0 ? `+${gap.toFixed(1)}` : "Đạt rồi") : "–"}</b>
          </div>
          <div className="tg-fact">
            <span>{hasExam ? "Đến ngày thi" : "Ngày thi"}</span>
            {hasExam && daysLeft != null
              ? <b className="num" title={examLabel}>{daysLeft >= 0 ? `${daysLeft} ngày` : "Đã qua"}</b>
              : <Link href="/onboarding" className="tg-link">Chưa chọn</Link>}
          </div>
        </div>

        <div className="tg-week">
          <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
            <span>7 ngày qua: <b className="num">{fmtMinutes(last7Minutes)}</b> / {fmtMinutes(perWeek)}</span>
            <span className="tg-pct num">{Math.round(weekPct * 100)}%</span>
          </div>
          <div className="tg-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(weekPct * 100)} aria-label="Tiến độ học 7 ngày qua so với mục tiêu tuần">
            <i style={{ width: `${weekPct * 100}%` }} />
          </div>
          <div className="tg-days" aria-label="Các ngày học trong tuần">
            {WEEKDAYS_SHORT.map((d) => <span key={d} data-on={profile.days.includes(d) || undefined}>{d}</span>)}
            <em>{profile.minutes} phút/ngày{profile.remindAt ? ` · nhắc lúc ${profile.remindAt}` : ""}</em>
          </div>
        </div>
      </div>

      <div className="tg-ring" role="img" aria-label={current != null ? `Band hiện tại ${current.toFixed(1)} trên mục tiêu ${profile.target.toFixed(1)}` : `Mục tiêu band ${profile.target.toFixed(1)}`}>
        <svg viewBox="0 0 108 108" width="100%" height="100%">
          <circle cx="54" cy="54" r={R} className="tr" strokeWidth="9" fill="none" />
          <circle cx="54" cy="54" r={R} className="ar" strokeWidth="9" fill="none" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 54 54)" />
        </svg>
        <div><b className="num">{current != null ? current.toFixed(1) : "?"}</b><span>→ {profile.target.toFixed(1)}</span></div>
      </div>
    </section>
  );
}
