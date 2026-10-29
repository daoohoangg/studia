// Phần dùng chung cho hai bộ ảnh mạng xã hội: màu, logo, font, render bằng Chrome headless.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFile, execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

export const BRAND = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const REPO = join(BRAND, "..");
export const W = 1080, H = 1350;

export const C = {
  ink: "#0F1F4D", paper: "#F8F6F2", blue: "#2344C9", ember: "#F2611F", emberStrong: "#C2410C",
  hair: "#E5E0D8", muted: "#5E6480", ink2: "#3A4260", tone: "#17275C", blueTint: "#E9EEFD",
  text: "#0E1630", cream: "#FDF9EF", marker: "#FFE27A", emberTint: "#FFEDE3",
  success: "#0D7A5F", successTint: "#E1F4EC", danger: "#C0281C", dangerTint: "#FDE8E6",
  plum: "#9B2C6F", plumTint: "#F8E6F0",
};

export const FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Literata:ital,opsz,wght@0,7..72,300..600;1,7..72,300..600&display=block";

// Biểu tượng & wordmark (nguồn: frontend/src/components/Logo.tsx)
const TOP = "M4 13.5A9.5 9.5 0 0 1 13.5 4H34a2 2 0 0 1 2 2v17H13.5A9.5 9.5 0 0 1 4 13.5z";
const BOT = "M12 25h22.5a9.5 9.5 0 0 1 0 19H14a2 2 0 0 1-2-2z";
export const markPaths = (ink, accent) => `<path d="${TOP}" fill="${ink}"/><path d="${BOT}" fill="${accent}"/>`;
const wordPaths = (ink, accent) => `
  <g fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15 19H8a4.5 4.5 0 0 0 0 9h2a4.5 4.5 0 0 1 0 9H3"/>
    <g transform="translate(3 0)">
      <path d="M26 8v23a6 6 0 0 0 6 6M21 19h10"/><path d="M42 19v12a6 6 0 0 0 12 0V19M54 19v18"/>
      <circle cx="72" cy="28" r="9"/><path d="M81 6v31"/><path d="M93 19v18"/>
      <circle cx="114" cy="28" r="9"/><path d="M123 19v18"/>
    </g>
  </g>
  <circle cx="96" cy="8.5" r="4" fill="${accent}"/>`;
export const lockup = (h, ink = C.ink, accent = C.ember) =>
  `<svg viewBox="4 4 186 40" height="${h}" width="${(h * 186) / 40}" aria-hidden="true">${markPaths(ink, accent)}<g transform="translate(60 4)">${wordPaths(ink, accent)}</g></svg>`;
export const mark = (size, ink = C.ink, accent = C.ember) =>
  `<svg viewBox="4 4 40 40" width="${size}" height="${size}" aria-hidden="true">${markPaths(ink, accent)}</svg>`;

export const icon = {
  check: (col, s = 26) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cross: (col, s = 26) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/></svg>`,
  arrow: (col, s = 40) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  down: (col, s = 40) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="M12 4v15M6 13l6 6 6-6" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

// Ảnh Coal (WebP trong suốt 663 × 648) trong frontend/public/coal
export const coalSrc = (name) => pathToFileURL(join(REPO, "frontend", "public", "coal", `${name}.webp`)).href;

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const doc = (css, body, bodyClass = "") => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS}"><style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;position:relative}
svg{display:block}
.display{font-family:'Bricolage Grotesque',sans-serif;font-optical-sizing:auto}
.serif{font-family:'Literata',serif;font-optical-sizing:auto}
${css}</style></head><body class="${bodyClass}">${body}</body></html>`;

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => { try { execFileSync(p, ["--version"], { stdio: "ignore" }); return true; } catch { return false; } }) ?? "chrome";

// jobs: [{ file: "01-ten.png", html }]; chạy song song nhiều tiến trình Chrome.
export async function renderAll(jobs, { outDir, htmlDir, parallel = 6 }) {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(htmlDir, { recursive: true });
  const queue = [...jobs];
  const worker = async (k) => {
    const profile = join(tmpdir(), `studia-social-chrome-${k}`);
    while (queue.length) {
      const job = queue.shift();
      const f = join(htmlDir, job.file.replace(/\.png$/, ".html"));
      writeFileSync(f, job.html);
      const out = join(outDir, job.file);
      await new Promise((res) => execFile(CHROME, [
        "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
        "--allow-file-access-from-files", `--user-data-dir=${profile}`, "--force-device-scale-factor=1",
        `--window-size=${W},${H}`, "--virtual-time-budget=15000", `--screenshot=${out}`, pathToFileURL(f).href,
      ], { timeout: 90000 }, (err) => { console.log(err ? "✗" : "✓", job.file, err ? err.message : ""); res(); }));
    }
    rmSync(profile, { recursive: true, force: true });
  };
  await Promise.all(Array.from({ length: Math.min(parallel, jobs.length) }, (_, k) => worker(k)));
}
