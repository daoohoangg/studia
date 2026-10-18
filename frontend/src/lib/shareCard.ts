"use client";

/** Vẽ ảnh kết quả bài thi (PNG, 1080×1350) để lưu vào tiến độ hàng ngày hoặc chia sẻ. Không cần thư viện chụp màn hình. */

export type CardResult = {
  title: string;
  overall: number | null;
  skills: { label: string; band: number | null; note?: string }[];
  date: string;       // đã định dạng
  modeLabel: string;  // "Thi thật" | "Luyện tập"
  footer?: string;
};

const W = 1080;
const H = 1350;

function cssVar(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/\s*\S*$/, "") + "…";
    return cut;
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderResultCard(r: CardResult): Promise<Blob> {
  try { await document.fonts?.ready; } catch {}
  const navy = cssVar("--navy", "#0f1f4d");
  const accent = cssVar("--accent", "#f2611f");
  const onNavy = cssVar("--on-navy", "#ffffff");
  const body = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const display = cssVar("--font-display", body);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, navy);
  bg.addColorStop(1, "#1d3a9a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.beginPath(); ctx.arc(W - 120, 160, 360, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = onNavy;
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 44px ${display}`;
  ctx.fillText("Studia", 80, 120);
  ctx.globalAlpha = 0.7;
  ctx.font = `500 28px ${body}`;
  ctx.fillText("Kết quả thi thử IELTS", 80, 164);
  ctx.globalAlpha = 1;

  ctx.font = `700 56px ${display}`;
  const titleLines = wrap(ctx, r.title, W - 160, 2);
  titleLines.forEach((line, i) => ctx.fillText(line, 80, 270 + i * 68));

  // Vòng band
  const cx = W / 2, cy = 700, radius = 230;
  ctx.lineWidth = 34;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
  if (r.overall != null) {
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(9, r.overall)) / 9);
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.fillStyle = onNavy;
  ctx.font = `800 190px ${display}`;
  ctx.fillText(r.overall == null ? "—" : r.overall.toFixed(1), cx, cy + 62);
  ctx.globalAlpha = 0.75;
  ctx.font = `600 32px ${body}`;
  ctx.fillText("OVERALL BAND", cx, cy + 128);
  ctx.globalAlpha = 1;

  // Điểm từng kỹ năng
  const skills = r.skills.slice(0, 4);
  if (skills.length) {
    const gap = 20;
    const cardW = (W - 160 - gap * (skills.length - 1)) / skills.length;
    skills.forEach((s, i) => {
      const x = 80 + i * (cardW + gap), y = 1010;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      roundRect(ctx, x, y, cardW, 170, 24);
      ctx.fill();
      ctx.fillStyle = onNavy;
      ctx.textAlign = "center";
      ctx.globalAlpha = 0.75;
      ctx.font = `600 26px ${body}`;
      ctx.fillText(s.label, x + cardW / 2, y + 50);
      ctx.globalAlpha = 1;
      ctx.font = `750 64px ${display}`;
      ctx.fillText(s.band == null ? "—" : s.band.toFixed(1), x + cardW / 2, y + 120);
      if (s.note) {
        ctx.globalAlpha = 0.65;
        ctx.font = `500 21px ${body}`;
        ctx.fillText(s.note, x + cardW / 2, y + 152);
        ctx.globalAlpha = 1;
      }
    });
  }

  ctx.textAlign = "left";
  ctx.fillStyle = onNavy;
  ctx.globalAlpha = 0.8;
  ctx.font = `500 28px ${body}`;
  ctx.fillText(`${r.date}  ·  ${r.modeLabel}`, 80, H - 70);
  ctx.textAlign = "right";
  ctx.fillText(r.footer || "studia.app", W - 80, H - 70);
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không tạo được ảnh"))), "image/png"));
}
