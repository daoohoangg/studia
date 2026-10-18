"use client";

import type { ReactNode } from "react";
import "./mascot.css";

/**
 * Linh vật "Tim" — một trái tim bé xíu đi học cùng bạn.
 * Mỗi tâm trạng có màu, nét mặt và phụ kiện riêng (kiểu sticker, viền trắng).
 */
export type Mood = "hello" | "happy" | "cheer" | "fire" | "love" | "focus" | "worried" | "sleepy" | "sad" | "lost";

export const MOODS: Mood[] = ["hello", "happy", "cheer", "fire", "love", "focus", "worried", "sleepy", "sad", "lost"];

export const MOOD_INFO: Record<Mood, { name: string; color: string; hint: string }> = {
  hello: { name: "Chào bạn", color: "#14b8a6", hint: "Lần đầu gặp, vẫy tay chào" },
  happy: { name: "Vui vẻ", color: "#e0314b", hint: "Hôm nay đã học xong" },
  cheer: { name: "Hoan hô", color: "#f59e0b", hint: "Chạm mốc streak mới" },
  fire: { name: "Cháy hết mình", color: "#f2611f", hint: "Streak từ 7 ngày trở lên" },
  love: { name: "Yêu thương", color: "#f472b6", hint: "Vừa viết nhật ký" },
  focus: { name: "Tập trung", color: "#22a559", hint: "Sẵn sàng cho buổi học" },
  worried: { name: "Lo lắng", color: "#9333ea", hint: "Sắp hết ngày mà chưa học" },
  sleepy: { name: "Buồn ngủ", color: "#3b82f6", hint: "Vắng 1–2 ngày" },
  sad: { name: "Buồn", color: "#6b7fa8", hint: "Vắng 3–6 ngày" },
  lost: { name: "Bơ vơ", color: "#25252b", hint: "Vắng lâu rồi, nhớ bạn lắm" },
};

const INK = "#2a1b2e";
const lighten = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v + (255 - v) * amt);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

const BODY = "M70 118 C26 92 14 58 30 38 C44 22 64 28 70 44 C76 28 96 22 110 38 C126 58 114 92 70 118 Z";

type Pose = { l: string; r: string };
const ARMS: Record<Mood, Pose> = {
  hello: { l: "M26 72 Q12 80 14 94", r: "M114 70 Q128 56 122 40" },
  happy: { l: "M26 70 Q10 74 12 60", r: "M114 70 Q130 74 128 60" },
  cheer: { l: "M26 66 Q10 52 18 34", r: "M114 66 Q130 52 122 34" },
  fire: { l: "M26 72 Q12 82 16 96", r: "M114 72 Q128 82 124 96" },
  love: { l: "M28 76 Q40 92 56 92", r: "M112 76 Q100 92 84 92" },
  focus: { l: "M26 72 Q12 82 16 96", r: "M114 68 Q132 62 126 44" },
  worried: { l: "M28 74 Q44 90 58 80", r: "M112 74 Q96 90 82 80" },
  sleepy: { l: "M26 82 Q14 92 18 104", r: "M114 82 Q126 92 122 104" },
  sad: { l: "M28 80 Q20 96 28 106", r: "M112 80 Q120 96 112 106" },
  lost: { l: "M26 74 Q10 80 14 96", r: "M114 74 Q130 80 126 96" },
};

type EyeKind = "open" | "up" | "happy" | "closed" | "heart" | "wide" | "side";
const EYES: Record<Mood, EyeKind> = {
  hello: "open", happy: "happy", cheer: "wide", fire: "open", love: "heart",
  focus: "open", worried: "wide", sleepy: "closed", sad: "up", lost: "side",
};

function Eyes({ kind }: { kind: EyeKind }) {
  const xs = [56, 84];
  if (kind === "happy") return <g fill="none" stroke={INK} strokeWidth="4.4" strokeLinecap="round">{xs.map((x) => <path key={x} d={`M${x - 9} 66 Q${x} 52 ${x + 9} 66`} />)}</g>;
  if (kind === "closed") return <g fill="none" stroke={INK} strokeWidth="4.4" strokeLinecap="round">{xs.map((x) => <path key={x} d={`M${x - 9} 63 Q${x} 72 ${x + 9} 63`} />)}</g>;
  if (kind === "heart")
    return <g fill="#e11d48">{xs.map((x) => <path key={x} transform={`translate(${x - 10} 52) scale(.84)`} d="M12 21 C-4 10 2 -1 12 6 C22 -1 28 10 12 21 Z" />)}</g>;
  const r = kind === "wide" ? 12.5 : 11;
  const pr = kind === "wide" ? 5 : kind === "up" ? 6.4 : 6.6;
  const dx = kind === "side" ? 3.2 : 0;
  const dy = kind === "up" ? -3.4 : kind === "side" ? -1 : 1;
  return (
    <g className="mc-eyes">
      {xs.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="64" rx={r} ry={r + 1.2} fill="#fff" />
          <circle cx={x + dx} cy={64 + dy} r={pr} fill={INK} />
          <circle cx={x + dx - 2.2} cy={64 + dy - 2.4} r="2.1" fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Brows({ mood }: { mood: Mood }) {
  const p = { fill: "none", stroke: INK, strokeWidth: 3.6, strokeLinecap: "round" as const };
  if (mood === "focus") return <g {...p}><path d="M44 48 L66 54" /><path d="M96 48 L74 54" /></g>;
  if (mood === "worried") return <g {...p}><path d="M44 54 L64 46" /><path d="M96 54 L76 46" /></g>;
  if (mood === "sad") return <g {...p}><path d="M44 50 L64 44" /><path d="M96 50 L76 44" /></g>;
  if (mood === "lost") return <g {...p}><path d="M44 46 Q56 42 66 46" /><path d="M76 44 L98 52" /></g>;
  return null;
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case "hello": return <path d="M60 82 Q70 94 80 82" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
    case "happy": case "fire":
      return <g><path d="M58 80 Q70 100 82 80 Z" fill={INK} /><path d="M63 89 Q70 85 77 89 Q70 96 63 89 Z" fill="#ff7a8a" /></g>;
    case "cheer": return <g><path d="M56 78 Q70 106 84 78 Z" fill={INK} /><path d="M62 92 Q70 86 78 92 Q70 101 62 92 Z" fill="#ff7a8a" /></g>;
    case "love": return <path d="M62 83 Q70 90 78 83" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
    case "focus": return <path d="M59 82 Q70 90 81 82" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
    case "worried": return <path d="M58 88 q4 -5 8 0 t8 0 t8 0" fill="none" stroke={INK} strokeWidth="3.8" strokeLinecap="round" />;
    case "sleepy": return <ellipse cx="70" cy="86" rx="5" ry="6" fill={INK} />;
    case "sad": return <path d="M60 90 Q70 78 80 90" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
    case "lost": return <path d="M62 86 L78 86" fill="none" stroke={lighten("#25252b", .6)} strokeWidth="4" strokeLinecap="round" />;
  }
}

const Star = ({ x, y, s = 1, c = "#ffd23f" }: { x: number; y: number; s?: number; c?: string }) => (
  <path className="mc-twinkle" transform={`translate(${x} ${y}) scale(${s})`} d="M0 -9 Q1.5 -1.5 9 0 Q1.5 1.5 0 9 Q-1.5 1.5 -9 0 Q-1.5 -1.5 0 -9 Z" fill={c} stroke="#fff" strokeWidth="2.4" paintOrder="stroke" />
);

const Heart = ({ x, y, s = 1, c = "#f43f5e", cls = "mc-float" }: { x: number; y: number; s?: number; c?: string; cls?: string }) => (
  <g className={cls}><path transform={`translate(${x} ${y}) scale(${s})`} d="M0 6 C-12 -2 -7 -12 0 -6 C7 -12 12 -2 0 6 Z" fill={c} stroke="#fff" strokeWidth="2.6" paintOrder="stroke" strokeLinejoin="round" /></g>
);

function Extras({ mood, color }: { mood: Mood; color: string }) {
  switch (mood) {
    case "hello": return <><Star x={22} y={22} s={.9} c="#fde047" /><Star x={120} y={96} s={.6} c="#fde047" /></>;
    case "happy": return <><Star x={116} y={20} /><Star x={26} y={30} s={.65} /><Star x={124} y={52} s={.5} /></>;
    case "cheer":
      return <>
        <path className="mc-pulse" d="M22 12 L22 30" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" />
        <circle className="mc-pulse" cx="22" cy="42" r="4.4" fill="#f59e0b" />
        <Star x={118} y={22} s={.9} /><Star x={124} y={64} s={.55} />
      </>;
    case "fire": return <><Star x={118} y={24} s={.6} c="#fff" /></>;
    case "love": return <><Heart x={22} y={34} s={1.1} /><Heart x={118} y={24} s={.8} c="#fb7185" /><Heart x={124} y={64} s={.6} c="#f43f5e" /></>;
    case "focus": return <g stroke="#e11d48" strokeWidth="4" strokeLinecap="round" fill="none"><path className="mc-pulse" d="M16 38 l8 -8 l-3 -1" /><path className="mc-pulse" d="M22 46 l-6 8" /></g>;
    case "worried": return <path className="mc-drip" d="M110 36 C104 46 102 52 108 56 C114 58 116 50 110 36 Z" fill="#7dd3fc" stroke="#fff" strokeWidth="2.4" paintOrder="stroke" />;
    case "sleepy":
      return <g fontFamily="var(--font-display), system-ui" fontWeight="800" fill={color} stroke="#fff" strokeWidth="3" paintOrder="stroke">
        <text className="mc-z" x="104" y="34" fontSize="20">z</text><text className="mc-z mc-z2" x="118" y="20" fontSize="14">z</text>
      </g>;
    case "sad": return <g fill="#7dd3fc" stroke="#fff" strokeWidth="2.4" paintOrder="stroke">
      <path className="mc-drip" d="M46 78 C41 88 41 93 46 95 C51 93 51 88 46 78 Z" /><path className="mc-drip mc-drip2" d="M94 78 C89 88 89 93 94 95 C99 93 99 88 94 78 Z" />
    </g>;
    case "lost": return <text className="mc-float" x="108" y="28" fontSize="30" fontWeight="800" fill={color} stroke="#fff" strokeWidth="4" paintOrder="stroke" fontFamily="var(--font-display), system-ui">?</text>;
  }
}

function Flame() {
  return (
    <g className="mc-flame">
      <path d="M70 6 C84 30 124 44 118 86 C112 128 28 128 22 86 C18 56 50 44 56 18 C60 28 66 28 70 6 Z" fill="#f2611f" stroke="#fff" strokeWidth="9" strokeLinejoin="round" paintOrder="stroke" />
      <path d="M70 34 C80 52 104 62 100 88 C96 116 44 116 40 88 C38 68 62 60 70 34 Z" fill="#ffb02e" />
    </g>
  );
}

export default function Mascot({ mood, size = 120, still = false, label, className = "" }: { mood: Mood; size?: number; still?: boolean; label?: string; className?: string }) {
  const color = MOOD_INFO[mood].color;
  const arms = ARMS[mood];
  const squash = mood === "sleepy" || mood === "sad";
  const body = mood === "fire" ? "#ffcf3f" : color;
  const parts = (outline: boolean): ReactNode => {
    const limb = (d: string) => outline
      ? <path d={d} fill="none" stroke="#fff" strokeWidth={22} strokeLinecap="round" />
      : <path d={d} fill="none" stroke={body} strokeWidth={11} strokeLinecap="round" />;
    return (
      <>
        {limb("M58 112 L56 130")}{limb("M82 112 L84 130")}
        {limb(arms.l)}{limb(arms.r)}
        {outline ? <path d={BODY} fill="#fff" stroke="#fff" strokeWidth="11" strokeLinejoin="round" /> : <path d={BODY} fill={body} />}
      </>
    );
  };
  return (
    <svg className={`mc mc-${mood}${still ? " mc-still" : ""} ${className}`} width={size} height={size * 1.07} viewBox="0 0 140 150" role="img" aria-label={label || `Linh vật Tim: ${MOOD_INFO[mood].name}`}>
      <g className="mc-all">
        {mood === "fire" && <Flame />}
        <g className="mc-body" transform={squash ? "translate(0 8) scale(1 .92)" : undefined}>
          {parts(true)}{parts(false)}
          <path d="M36 44 Q40 34 52 34" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="5" strokeLinecap="round" />
          {(mood === "love" || mood === "hello") && <g fill="#fb7185" fillOpacity=".5"><ellipse cx="42" cy="80" rx="7" ry="4.5" /><ellipse cx="98" cy="80" rx="7" ry="4.5" /></g>}
          <Brows mood={mood} />
          <Eyes kind={EYES[mood]} />
          <Mouth mood={mood} />
        </g>
        <Extras mood={mood} color={mood === "sleepy" ? "#3b82f6" : color} />
      </g>
    </svg>
  );
}
