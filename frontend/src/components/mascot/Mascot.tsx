"use client";

import "./mascot.css";

/**
 * Coal — cục than nhỏ muốn thành kim cương, người bạn AI học cùng bạn.
 * Dùng bộ minh hoạ 25 tư thế trong /public/coal (nguồn: brand/coal/sprites). Component chọn đúng tư thế theo:
 *   mood  cảm xúc hiện tại
 *   fire  0–4  streak càng dài lửa càng lớn (3, 7, 14, 30 ngày)
 *   wet   0–4  bỏ học càng lâu càng ướt (1–2, 3–6, 7–13, 14+ ngày); ướt thì lửa tắt
 * Ảnh tĩnh nên chuyển động làm bằng CSS (nhún, nảy, rung, phát sáng), xem mascot.css.
 */
export type Mood = "hello" | "happy" | "cheer" | "fire" | "love" | "focus" | "worried" | "sleepy" | "sad" | "lost";
export type Level = 0 | 1 | 2 | 3 | 4;

export const MOODS: Mood[] = ["hello", "happy", "cheer", "fire", "love", "focus", "worried", "sleepy", "sad", "lost"];

export const MOOD_INFO: Record<Mood, { name: string; color: string; hint: string }> = {
  hello: { name: "Chào bạn", color: "#2344c9", hint: "Lần đầu gặp, vẫy tay chào" },
  happy: { name: "Vui vẻ", color: "#0d7a5f", hint: "Hôm nay đã học xong" },
  cheer: { name: "Hoan hô", color: "#a15c00", hint: "Chạm mốc streak mới" },
  fire: { name: "Cháy hết mình", color: "#f2611f", hint: "Streak dài, lửa càng lớn" },
  love: { name: "Yêu thương", color: "#c2410c", hint: "Vừa viết nhật ký" },
  focus: { name: "Tập trung", color: "#2344c9", hint: "Sẵn sàng cho buổi học" },
  worried: { name: "Lo lắng", color: "#9b2c6f", hint: "Sắp hết ngày mà chưa học" },
  sleepy: { name: "Buồn ngủ", color: "#5e6480", hint: "Vắng 1–2 ngày" },
  sad: { name: "Buồn", color: "#5e6480", hint: "Vắng vài ngày, ướt cả người" },
  lost: { name: "Bơ vơ", color: "#3a4260", hint: "Vắng lâu, ướt sũng" },
};

/** Tên các tư thế, trùng tên tệp /public/coal/<tên>.webp. */
export const SPRITES = [
  "hello", "happy", "cheer", "love", "focus", "surprised", "sleepy", "sad", "lost", "fireM", "smile", "excited",
  "fire0", "fire1", "fire2", "fire3", "fire4", "wet0", "wet1", "wet2", "wet3", "wet4", "happy-alt", "love-alt", "cheer-alt",
] as const;
export type Sprite = (typeof SPRITES)[number];

/** Tư thế mặc định của từng cảm xúc khi chưa cháy, chưa ướt. */
const BASE: Record<Mood, Sprite> = {
  hello: "hello", happy: "happy", cheer: "cheer", fire: "fireM", love: "love",
  focus: "focus", worried: "surprised", sleepy: "sleepy", sad: "sad", lost: "lost",
};

/** Tư thế theo mức cháy: 1 = than nứt nóng đỏ, 2 = lửa bốc trên đầu, 3 = quầng sáng và lửa nhỏ quanh người, 4 = cháy cả người. */
const FIRE: Record<1 | 2 | 3 | 4, Sprite> = { 1: "fire0", 2: "fire2", 3: "fire3", 4: "fire4" };

/**
 * Chọn tư thế. Thứ tự ưu tiên: ướt (lửa đã tắt) > cháy > cảm xúc.
 *  - ướt mức 1: người ươn ướt (mức 1 mà đang buồn ngủ thì có thêm "z"); 2: khóc; 3: đứng trong vũng nước; 4: ngập nước, mưa
 *  - hoan hô khi đang có lửa (chạm mốc streak): Coal hoá thành ngọn lửa tinh nghịch nháy mắt
 */
export function spriteFor(mood: Mood, wet: Level = 0, fire: Level = 0): Sprite {
  if (wet > 0) return wet === 1 ? (mood === "sleepy" ? "wet1" : "wet0") : (`wet${wet}` as Sprite);
  if (fire > 0) return mood === "cheer" ? "fire1" : FIRE[fire as 1 | 2 | 3 | 4];
  return BASE[mood];
}

/** Khung chung của mọi tư thế (đáy thẳng hàng nên đổi tư thế không bị nhảy). */
const W = 221, H = 216;

type Props = {
  mood: Mood;
  size?: number;
  still?: boolean;
  label?: string;
  className?: string;
  wet?: Level;
  fire?: Level;
  /** Đang trả lời: Coal nhún nhẹ liên tục như đang nói. */
  talking?: boolean;
  /** Ép dùng một tư thế cụ thể (ví dụ "smile", "excited"), bỏ qua mood/wet/fire. */
  sprite?: Sprite;
};

export default function Mascot({ mood, size = 120, still = false, label, className = "", wet = 0, fire, talking = false, sprite }: Props) {
  const wetL = wet;
  const fireL: Level = wetL > 0 ? 0 : (fire ?? 0);
  const name: Sprite = sprite ?? spriteFor(mood, wetL, fireL);
  const cls = [
    "mc", `mc-${mood}`, `mc-s-${name}`, still ? "mc-still" : "", wetL ? `mc-wet${wetL}` : "", fireL ? `mc-fire${fireL}` : "",
    talking ? "mc-talking" : "", className,
  ].filter(Boolean).join(" ");
  const state = wetL ? `, ướt mức ${wetL}` : fireL ? `, cháy mức ${fireL}` : "";
  const height = Math.round((size * H) / W);

  return (
    <span className={cls} style={{ width: size, height }} role="img" aria-label={label ?? `Coal: ${MOOD_INFO[mood].name}${state}`}>
      {/* key theo tư thế: mỗi lần đổi tư thế, ảnh mới "bật" ra thay vì đổi đột ngột */}
      <img key={name} className="mc-img" src={`/coal/${name}.webp`} alt="" width={size} height={height} draggable={false} decoding="async" />
    </span>
  );
}

export { Mascot as Coal };

/** Mức cháy theo số ngày streak: 0–2 ngày bình thường, 3, 7, 14, 30 ngày là các mốc lửa lớn dần. */
export function fireLevel(streak: number): Level {
  return streak >= 30 ? 4 : streak >= 14 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0;
}

/** Mức ướt theo số ngày đã bỏ học (0 = vẫn học đều). 1–2 ngày: ướt nhẹ; 3–6: ướt rõ; 7–13: ướt sũng, đứng trong vũng nước; 14+: ngập nước. */
export function wetLevel(daysSince: number | null | undefined, hadActivity = true): Level {
  if (daysSince == null) return hadActivity ? 4 : 0;
  return daysSince >= 14 ? 4 : daysSince >= 7 ? 3 : daysSince >= 3 ? 2 : daysSince >= 1 ? 1 : 0;
}
