// Sinh bộ nhận diện thương hiệu Studia: logo SVG + ảnh PNG (render bằng Chrome headless).
// Chạy: node brand/src/build.mjs
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_IMG = join(ROOT, "images");
const OUT_LOGO = join(ROOT, "logo");
const OUT_HTML = join(ROOT, "src", "pages");
for (const d of [OUT_IMG, OUT_LOGO, OUT_HTML]) mkdirSync(d, { recursive: true });

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => { try { execFileSync(p, ["--version"], { stdio: "ignore" }); return true; } catch { return false; } }) ?? "chrome";

// ── Bảng màu ─────────────────────────────────────────────────────────────
const C = {
  ink: "#0F1F4D",      // Mực đêm — nền chủ đạo, chữ
  paper: "#F8F6F2",    // Giấy ngà — nền sáng
  blue: "#2344C9",     // Xanh học thuật — tương tác
  ember: "#F2611F",    // Cam bứt phá — điểm nhấn duy nhất
  hair: "#E5E0D8",
  muted: "#5E6480",
  ink2: "#3A4260",
  tone: "#17275C",     // mực tông-trên-tông cho hoạ tiết
};

// ── Biểu tượng & wordmark (nguồn: frontend/src/components/Logo.tsx) ──────
const TOP = "M4 13.5A9.5 9.5 0 0 1 13.5 4H34a2 2 0 0 1 2 2v17H13.5A9.5 9.5 0 0 1 4 13.5z";
const BOT = "M12 25h22.5a9.5 9.5 0 0 1 0 19H14a2 2 0 0 1-2-2z";
const markPaths = (ink, accent) => `<path d="${TOP}" fill="${ink}"/><path d="${BOT}" fill="${accent}"/>`;
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

// viewBox ôm sát hình để kích thước = kích thước nhìn thấy
const mark = (size, ink = C.ink, accent = C.ember) =>
  `<svg viewBox="4 4 40 40" width="${size}" height="${size}" aria-hidden="true">${markPaths(ink, accent)}</svg>`;
const wordmark = (h, ink = C.ink, accent = C.ember) =>
  `<svg viewBox="0 3 129 37" height="${h}" width="${(h * 129) / 37}" aria-hidden="true">${wordPaths(ink, accent)}</svg>`;
const lockup = (h, ink = C.ink, accent = C.ember, inkMark = ink) =>
  `<svg viewBox="4 4 186 40" height="${h}" width="${(h * 186) / 40}" aria-hidden="true">${markPaths(inkMark, accent)}<g transform="translate(60 4)">${wordPaths(ink, accent)}</g></svg>`;

// ── Logo SVG độc lập ──────────────────────────────────────────────────────
const svgFile = (vb, inner, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${bg ? `<rect x="-100%" y="-100%" width="300%" height="300%" fill="${bg}"/>` : ""}${inner}</svg>\n`;
const logos = {
  "studia-mark.svg": svgFile("4 4 40 40", markPaths(C.ink, C.ember)),
  "studia-mark-reversed.svg": svgFile("4 4 40 40", markPaths(C.paper, C.ember)),
  "studia-mark-mono.svg": svgFile("4 4 40 40", markPaths(C.ink, C.ink)),
  "studia-wordmark.svg": svgFile("0 3 129 37", wordPaths(C.ink, C.ember)),
  "studia-wordmark-reversed.svg": svgFile("0 3 129 37", wordPaths(C.paper, C.ember)),
  "studia-lockup.svg": svgFile("4 4 186 40", markPaths(C.ink, C.ember) + `<g transform="translate(60 4)">${wordPaths(C.ink, C.ember)}</g>`),
  "studia-lockup-reversed.svg": svgFile("4 4 186 40", markPaths(C.paper, C.ember) + `<g transform="translate(60 4)">${wordPaths(C.paper, C.ember)}</g>`),
  "studia-lockup-mono.svg": svgFile("4 4 186 40", markPaths(C.ink, C.ink) + `<g transform="translate(60 4)">${wordPaths(C.ink, C.ink)}</g>`),
  "studia-app-icon.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${C.ink}"/><g transform="translate(96 96) scale(6.667)">${markPaths(C.paper, C.ember)}</g></svg>\n`,
};
for (const [name, svg] of Object.entries(logos)) writeFileSync(join(OUT_LOGO, name), svg);

// ── Khung trang ───────────────────────────────────────────────────────────
const FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Literata:ital,opsz,wght@0,7..72,300..600;1,7..72,300..600&display=block";
const BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:var(--w);height:var(--h);overflow:hidden}
  body{background:${C.paper};color:${C.ink};font-family:'Be Vietnam Pro',sans-serif;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
  .display{font-family:'Bricolage Grotesque',sans-serif;font-optical-sizing:auto}
  .serif{font-family:'Literata',serif;font-optical-sizing:auto}
  .eyebrow{font-size:13px;font-weight:600;letter-spacing:.24em;text-transform:uppercase}
  .muted{color:${C.muted}}
  .hair{height:1px;background:${C.hair}}
  svg{display:block}
`;
const page = (w, h, css, body, bodyClass = "") => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS}"><style>:root{--w:${w}px;--h:${h}px}${BASE_CSS}${css}</style></head>
<body class="${bodyClass}">${body}</body></html>`;

const TOTAL = 10;
const SHEET_CSS = `
  .sheet{position:absolute;inset:0;padding:80px 104px;display:flex;flex-direction:column}
  .top,.foot{display:flex;justify-content:space-between;align-items:center}
  .top .brand{display:flex;gap:14px;align-items:center}
  .foot{padding-top:22px;border-top:1px solid var(--line);font-size:13px;letter-spacing:.06em}
  .main{flex:1;display:flex;min-height:0;padding:56px 0 48px}
  .intro{width:470px;flex:none;display:flex;flex-direction:column;padding-right:56px}
  .intro .no{color:${C.ember};margin-bottom:28px}
  .intro h1{font-size:50px;line-height:1.04;font-weight:600;letter-spacing:-.035em;margin-bottom:28px}
  .intro p{font-size:19px;line-height:1.7;color:${C.ink2}}
  .stage{flex:1;min-width:0;position:relative}
  .dark{--line:rgba(248,246,242,.14);background:${C.ink};color:${C.paper}}
  body:not(.dark){--line:${C.hair}}
  .dark .intro p{color:rgba(248,246,242,.72)}
  .dark .muted{color:rgba(248,246,242,.55)}
`;
const sheet = (n, title, inner, { dark = false, css = "", bare = false } = {}) => {
  const nn = String(n).padStart(2, "0");
  const ink = dark ? C.paper : C.ink;
  return page(1920, 1200, SHEET_CSS + css, `
  <div class="sheet">
    <div class="top">
      <div class="brand">${mark(22, ink, C.ember)}<span class="eyebrow">Studia&nbsp;&nbsp;·&nbsp;&nbsp;Nhận diện thương hiệu</span></div>
      <span class="eyebrow ${dark ? "muted" : "muted"}">${nn} — ${title}</span>
    </div>
    ${bare ? inner : `<div class="main">${inner}</div>`}
    <div class="foot"><span class="muted">Brand Identity Guidelines · Phiên bản 1.0</span><span class="muted">${nn} / ${String(TOTAL).padStart(2, "0")}</span></div>
  </div>`, dark ? "dark" : "");
};
const intro = (n, h1, p) => `<div class="intro"><span class="eyebrow no">${String(n).padStart(2, "0")}</span><h1 class="display">${h1}</h1><p class="serif">${p}</p></div>`;

// ── Ảnh ứng dụng số (render trước để trang 10 dùng lại) ────────────────────
const TAG_VI = "Học đúng điều cần học";
const assets = [];

assets.push({ name: "og-image", w: 1200, h: 630, scale: 1, html: page(1200, 630, `
  body{background:${C.ink};color:${C.paper};position:relative}
  .wm{position:absolute;right:-150px;top:50%;transform:translateY(-50%)}
  .in{position:absolute;inset:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
  h1{font-size:76px;line-height:1.08;font-weight:400;letter-spacing:-.02em}
  h1 em{color:${C.ember};font-style:normal}
  p{font-size:21px;line-height:1.6;color:rgba(248,246,242,.66);margin-top:26px;max-width:600px}
  .row{display:flex;justify-content:space-between;align-items:flex-end}
`, `
  <div class="wm">${mark(560, C.tone, C.tone)}</div>
  <div class="in">
    ${lockup(40, C.paper, C.ember)}
    <div><h1 class="serif">Học đúng điều<br>cần học<em>.</em></h1>
    <p>Lộ trình IELTS cá nhân hoá bởi AI — đọc, nghe, nói, viết, mỗi ngày một bước vững.</p></div>
  </div>`) });

assets.push({ name: "social-avatar", w: 1080, h: 1080, scale: 1, html: page(1080, 1080, `
  body{background:${C.ink};display:grid;place-items:center}`, mark(500, C.paper, C.ember)) });

assets.push({ name: "social-post", w: 1080, h: 1350, scale: 1, html: page(1080, 1350, `
  .in{position:absolute;inset:96px;display:flex;flex-direction:column}
  .eyebrow{color:${C.muted};font-size:20px}
  .band{margin-top:auto;display:flex;align-items:baseline;gap:36px}
  .band b{font-size:250px;font-weight:600;letter-spacing:-.05em;line-height:.9}
  .band .from{color:#C9C3B8}
  .band i{font-style:normal;font-size:90px;color:${C.ember};transform:translateY(-30px)}
  .cap{font-size:44px;line-height:1.35;margin-top:64px;max-width:760px;color:${C.ink2}}
  .cap em{color:${C.ink}}
  .row{margin-top:auto;padding-top:36px;border-top:1px solid ${C.hair};display:flex;justify-content:space-between;align-items:center}
`, `
  <div class="in">
    <span class="eyebrow">IELTS&nbsp;&nbsp;·&nbsp;&nbsp;Lộ trình cá nhân hoá</span>
    <div class="band display"><b class="from">6.5</b><i>→</i><b>7.5</b></div>
    <p class="cap serif">Không học nhiều hơn.<br><em>Học đúng hơn.</em></p>
    <div class="row">${lockup(34)}<span class="eyebrow" style="color:${C.muted};font-size:15px">${TAG_VI}</span></div>
  </div>`) });

const patternTile = (cell, size, hi = [-1, -1], cols = 40, rows = 20, top = C.tone, bot = C.tone) => {
  let s = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const on = r === hi[0] && c === hi[1];
    s += `<g transform="translate(${c * cell + (r % 2 ? cell / 2 : 0)} ${r * cell}) scale(${size / 40}) translate(-4 -4)">${markPaths(top, on ? C.ember : bot)}</g>`;
  }
  return s;
};

assets.push({ name: "social-cover", w: 1500, h: 500, scale: 1, html: page(1500, 500, `
  .l{position:absolute;left:0;top:0;bottom:0;width:820px;padding:0 96px;display:flex;flex-direction:column;justify-content:center;gap:34px}
  .l p{font-size:30px;line-height:1.35;color:${C.ink2}}
  .r{position:absolute;right:0;top:0;bottom:0;width:680px;background:${C.ink};overflow:hidden}
`, `
  <div class="l">${lockup(48)}<p class="serif"><i>${TAG_VI}.</i><br><span style="font-size:18px;font-family:'Be Vietnam Pro';letter-spacing:.2em;text-transform:uppercase;color:${C.muted}">IELTS · Học tập thích ứng</span></p></div>
  <div class="r"><svg width="760" height="560" style="margin:-20px 0 0 -20px">${patternTile(96, 44, [3, 4], 9, 7)}</svg></div>`) });

// ── 10 trang hướng dẫn ─────────────────────────────────────────────────────
const sheets = [];

// 01 — Bìa
sheets.push(page(1920, 1200, SHEET_CSS + `
  .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .c .rule{width:44px;height:2px;background:${C.ember};margin:54px 0 40px}
  .c p{font-size:34px;font-style:italic;color:rgba(248,246,242,.86)}
  .c .eyebrow{margin-top:26px;color:rgba(248,246,242,.5)}
  .corner{position:absolute;font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:rgba(248,246,242,.5);font-weight:600}
`, `
  <div class="c">
    ${mark(148, C.paper, C.ember)}
    <div style="height:46px"></div>
    ${wordmark(64, C.paper, C.ember)}
    <div class="rule"></div>
    <p class="serif">${TAG_VI}.</p>
    <span class="eyebrow">IELTS&nbsp;&nbsp;·&nbsp;&nbsp;Học tập thích ứng&nbsp;&nbsp;·&nbsp;&nbsp;Dành cho người Việt</span>
  </div>
  <span class="corner" style="left:104px;top:80px">Brand Identity Guidelines</span>
  <span class="corner" style="right:104px;top:80px">Phiên bản 1.0 — 2026</span>
  <span class="corner" style="left:104px;bottom:80px">Studia</span>
  <span class="corner" style="right:104px;bottom:80px">01 / 10</span>`, "dark"));

// 02 — Ý niệm
sheets.push(sheet(2, "Ý niệm", `
  ${intro(2, "Một cuộc đối thoại dẫn tới tiến bộ.", "Studia giúp người Việt luyện IELTS theo lộ trình riêng: AI lắng nghe từng câu trả lời, nhận ra chỗ còn hổng và chỉ đưa ra điều thực sự cần học tiếp theo.")}
  <div class="stage" style="display:flex;gap:96px;align-items:center">
    <div style="flex:none;width:520px;height:520px;display:grid;place-items:center;background:#fff;border:1px solid ${C.hair};border-radius:4px">${mark(300)}</div>
    <ol class="ideas">
      <li><span class="eyebrow">I</span><div><h3 class="display">Bong bóng trên — Ngôn ngữ</h3><p>Bài đọc, câu hỏi, lời giảng: tất cả những gì người học tiếp nhận. Màu mực — vững, tĩnh, học thuật.</p></div></li>
      <li><span class="eyebrow">II</span><div><h3 class="display">Bong bóng dưới — Tiến bộ</h3><p>Câu trả lời của chính người học và band điểm đi lên. Màu cam — ấm, có hướng, chỉ xuất hiện như một điểm sáng.</p></div></li>
      <li><span class="eyebrow">III</span><div><h3 class="display">So le thành chữ S — Studia</h3><p>Hai lượt lời lệch nhau như một cuộc hội thoại thật: hỏi, đáp, điều chỉnh. Học là đối thoại hai chiều, không phải đọc một chiều.</p></div></li>
    </ol>
  </div>`, { css: `
  .ideas{list-style:none;flex:1}
  .ideas li{display:grid;grid-template-columns:56px 1fr;padding:30px 0;border-top:1px solid ${C.hair}}
  .ideas li:last-child{border-bottom:1px solid ${C.hair}}
  .ideas .eyebrow{color:${C.ember};padding-top:8px}
  .ideas h3{font-size:26px;font-weight:600;letter-spacing:-.02em;margin-bottom:10px}
  .ideas p{font-size:17px;line-height:1.65;color:${C.ink2}}` }));

// 03 — Cấu trúc
const grid = Array.from({ length: 49 }, (_, i) =>
  `<path d="M${i} 0V48M0 ${i}H48" stroke="${i % 4 === 0 ? "#DCD6CC" : "#EEEAE3"}" stroke-width="${i % 4 === 0 ? 1 : 0.75}" vector-effect="non-scaling-stroke"/>`).join("");
const guide = (d, col = C.blue) => `<path d="${d}" stroke="${col}" stroke-width="1" vector-effect="non-scaling-stroke" fill="none"/>`;
const lbl = (x, y, t, anchor = "middle", col = C.blue) => `<text x="${x}" y="${y}" font-size="1.05" font-family="Be Vietnam Pro" font-weight="600" fill="${col}" text-anchor="${anchor}">${t}</text>`;
sheets.push(sheet(3, "Cấu trúc", `
  ${intro(3, "Hình học tiết chế, đếm được bằng đơn vị.", "Biểu tượng dựng trên lưới 48 đơn vị (u). Mọi đường cong là một nửa hình tròn bán kính 9.5u, mọi khoảng cách là bội số rõ ràng — để logo vẫn sắc nét ở 16px lẫn trên biển hiệu.")}
  <div class="stage" style="display:flex;gap:80px;align-items:center">
    <svg viewBox="-1 -1 50 50" width="720" height="720" style="flex:none">
      ${grid}
      <path d="${TOP}" fill="${C.ink}" fill-opacity=".07" stroke="${C.ink}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
      <path d="${BOT}" fill="${C.ember}" fill-opacity=".1" stroke="${C.ember}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
      <circle cx="13.5" cy="13.5" r="9.5" fill="none" stroke="${C.blue}" stroke-dasharray="4 4" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <circle cx="34.5" cy="34.5" r="9.5" fill="none" stroke="${C.blue}" stroke-dasharray="4 4" stroke-width="1" vector-effect="non-scaling-stroke"/>
      ${guide("M13.5 13.5H4")}<circle cx="13.5" cy="13.5" r=".35" fill="${C.blue}"/>${lbl(8.75, 12.6, "9.5u")}
      ${guide("M34.5 34.5H44")}<circle cx="34.5" cy="34.5" r=".35" fill="${C.blue}"/>${lbl(39.25, 36.6, "9.5u")}
      ${guide("M41 23H46.5M41 25H46.5")}${lbl(46.8, 24.4, "2u", "start")}
      ${guide("M4 46V47.6M12 46V47.6M4 46.8H12")}${lbl(8, 45.6, "8u")}
      ${guide("M36 1.2V2.8M44 1.2V2.8M36 2H44")}${lbl(40, 1.0, "8u")}
      ${guide("M1.6 4H3M1.6 23H3M2.3 4V23")}${lbl(1.2, 14, "19u", "end")}
    </svg>
    <div class="specs">
      <dl>
        <div><dt class="eyebrow">Lưới</dt><dd>48 × 48u, hình nằm trong 40 × 40u</dd></div>
        <div><dt class="eyebrow">Bán kính</dt><dd>9.5u — đúng nửa chiều cao bong bóng</dd></div>
        <div><dt class="eyebrow">Khe hở</dt><dd>2u giữa hai lượt lời</dd></div>
        <div><dt class="eyebrow">Độ lệch</dt><dd>8u — đủ để đọc thành chữ S</dd></div>
        <div><dt class="eyebrow">Góc phụ</dt><dd>2u — mũi bong bóng, mềm nhưng dứt khoát</dd></div>
      </dl>
      <div class="clear">
        <div class="box">${lockup(60)}</div>
        <p><b>Vùng an toàn</b> = chiều cao một bong bóng. Kích thước tối thiểu: lockup 96px, biểu tượng 16px.</p>
      </div>
    </div>
  </div>`, { css: `
  .specs{flex:1}
  dl div{display:grid;grid-template-columns:150px 1fr;padding:18px 0;border-top:1px solid ${C.hair};font-size:18px}
  dt{color:${C.muted};padding-top:4px}
  .clear{margin-top:48px}
  .box{display:inline-block;padding:28px;outline:1px dashed ${C.blue};outline-offset:0;background:repeating-linear-gradient(45deg,rgba(35,68,201,.05) 0 6px,transparent 6px 12px)}
  .box svg{background:${C.paper};box-shadow:0 0 0 0 ${C.paper}}
  .clear p{margin-top:20px;font-size:16px;line-height:1.6;color:${C.ink2};max-width:520px}` }));

// 04 — Biến thể logo
const tile = (bg, inner, label, border = false) =>
  `<figure><div class="t" style="background:${bg};${border ? `border:1px solid ${C.hair}` : ""}">${inner}</div><figcaption><span class="eyebrow">${label[0]}</span><span>${label[1]}</span></figcaption></figure>`;
sheets.push(sheet(4, "Biến thể logo", `
  ${intro(4, "Bốn cách xuất hiện, một giọng nói.", "Ưu tiên lockup ngang trên nền giấy ngà hoặc mực đêm. Bản đơn sắc dùng khi in một màu hoặc đặt trên ảnh; biểu tượng đứng riêng khi chỗ hẹp hoặc đã có tên Studia gần đó.")}
  <div class="stage tiles">
    ${tile("#fff", lockup(88), ["Chính", "Nền sáng — giấy ngà, trắng"], true)}
    ${tile(C.ink, lockup(88, C.paper, C.ember), ["Đảo màu", "Nền tối — mực đêm"])}
    ${tile(C.blue, lockup(88, C.paper, C.paper), ["Đơn sắc", "Trên màu thương hiệu hoặc ảnh"])}
    ${tile(C.ember, `<div style="display:flex;gap:56px;align-items:center">${mark(150, C.ink, C.paper)}${mark(64, C.ink, C.paper)}${mark(28, C.ink, C.paper)}</div>`, ["Biểu tượng", "Khi chỗ hẹp — avatar, favicon, tem"])}
  </div>`, { css: `
  .tiles{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:40px 32px}
  figure{display:flex;flex-direction:column;min-height:0}
  .t{flex:1;display:grid;place-items:center;border-radius:4px}
  figcaption{display:flex;gap:18px;align-items:baseline;padding-top:16px;font-size:15px;color:${C.ink2}}
  figcaption .eyebrow{color:${C.ink};min-width:110px}` }));

// 05 — Màu sắc
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const cmyk = (h) => {
  const [r, g, b] = hexRgb(h).map((v) => v / 255), k = 1 - Math.max(r, g, b);
  return k === 1 ? [0, 0, 0, 100] : [r, g, b].map((v) => Math.round(((1 - v - k) / (1 - k)) * 100)).concat(Math.round(k * 100));
};
const colors = [
  { hex: C.ink, vi: "Mực đêm", en: "Midnight Ink", pct: 60, role: "Nền chủ đạo, chữ, biểu tượng", fg: C.paper },
  { hex: C.paper, vi: "Giấy ngà", en: "Ivory Paper", pct: 28, role: "Nền sáng, không gian thở", fg: C.ink, border: true },
  { hex: C.blue, vi: "Xanh học thuật", en: "Scholar Blue", pct: 8, role: "Liên kết, nút, trạng thái tương tác", fg: C.paper },
  { hex: C.ember, vi: "Cam bứt phá", en: "Ember", pct: 4, role: "Một điểm nhấn mỗi bố cục — tiến bộ", fg: C.ink },
];
sheets.push(sheet(5, "Màu sắc", `
  ${intro(5, "Nhiều mực, ít cam.", "Sự sang trọng đến từ tiết chế. Mực đêm và giấy ngà gánh gần như toàn bộ bố cục; xanh học thuật cho tương tác; cam bứt phá chỉ xuất hiện một lần — đúng nơi người học tiến bộ.")}
  <div class="stage" style="display:flex;flex-direction:column">
    <div class="bar">${colors.map((c) => `<span style="flex:${c.pct};background:${c.hex}"></span>`).join("")}</div>
    <div class="bar-l">${colors.map((c) => `<span style="flex:${c.pct}">${c.pct}%</span>`).join("")}</div>
    <div class="sw">${colors.map((c) => `
      <div class="c">
        <div class="chip" style="background:${c.hex};color:${c.fg};${c.border ? `border:1px solid ${C.hair}` : ""}"><span class="display">${c.vi}</span><span class="serif"><i>${c.en}</i></span></div>
        <dl><div><dt>HEX</dt><dd>${c.hex}</dd></div><div><dt>RGB</dt><dd>${hexRgb(c.hex).join(" · ")}</dd></div><div><dt>CMYK</dt><dd>${cmyk(c.hex).join(" · ")}</dd></div></dl>
        <p>${c.role}</p>
      </div>`).join("")}
    </div>
  </div>`, { css: `
  .bar{display:flex;height:14px;border-radius:2px;overflow:hidden;border:1px solid ${C.hair}}
  .bar-l{display:flex;font-size:13px;color:${C.muted};padding-top:10px;letter-spacing:.04em}
  .sw{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:28px;margin-top:44px}
  .c{display:flex;flex-direction:column}
  .chip{flex:1;border-radius:4px;padding:28px;display:flex;flex-direction:column;justify-content:flex-end;gap:6px}
  .chip .display{font-size:32px;font-weight:600;letter-spacing:-.02em}
  .chip .serif{font-size:19px;opacity:.8}
  dl{margin-top:22px;font-size:15px}
  dl div{display:flex;justify-content:space-between;padding:9px 0;border-top:1px solid ${C.hair}}
  dt{color:${C.muted};letter-spacing:.12em;font-size:12px;font-weight:600;padding-top:2px}
  dd{font-variant-numeric:tabular-nums}
  .c p{margin-top:14px;font-size:15px;line-height:1.55;color:${C.ink2}}` }));

// 06 — Chữ
sheets.push(sheet(6, "Kiểu chữ", `
  ${intro(6, "Ba giọng, mỗi giọng một việc.", "Bricolage Grotesque cho tiêu đề và con số band — tự tin, hiện đại. Be Vietnam Pro cho giao diện — sinh ra cho tiếng Việt. Literata cho bài đọc — chậm rãi, đậm chất học thuật.")}
  <div class="stage type">
    <div class="col"><span class="eyebrow muted">Display</span><div class="aa display" style="font-weight:600;letter-spacing:-.05em">Aa</div><h4 class="display">Bricolage Grotesque</h4><div class="s display" style="font-size:72px;font-weight:600;letter-spacing:-.04em;line-height:1">Band 8.0</div><div class="gl display">ABCDEFGHIJKLM<br>0123456789 →</div><p>Tiêu đề · Con số lớn · Từ vựng trên thẻ</p></div>
    <div class="col"><span class="eyebrow muted">Giao diện</span><div class="aa" style="font-weight:500;letter-spacing:-.04em">Aa</div><h4>Be Vietnam Pro</h4><div class="s" style="font-size:26px;line-height:1.45;font-weight:400">Ôn 20 từ mới hôm nay —<br>ă â đ ê ô ơ ư, đủ dấu, rõ nét.</div><div class="gl">Ăắ Ââ Đđ Êế Ôố Ơớ Ưứ<br>ạ ả ã ầ ẩ ẫ ệ ỗ ợ ự</div><p>Điều hướng · Nút · Nội dung giao diện</p></div>
    <div class="col"><span class="eyebrow muted">Bài đọc</span><div class="aa serif" style="font-weight:400;font-style:italic;letter-spacing:-.03em">Aa</div><h4 class="serif">Literata</h4><div class="s serif" style="font-size:24px;line-height:1.6"><i>Reading a little every day builds more than vocabulary; it builds attention.</i></div><div class="gl serif"><i>abcdefghijklmnopq<br>/ˈriːdɪŋ/ · 0123456789</i></div><p>Bài đọc IELTS · Câu ví dụ · Phiên âm</p></div>
  </div>`, { css: `
  .type{display:grid;grid-template-columns:repeat(3,1fr);gap:0}
  .col{padding:0 44px;border-left:1px solid ${C.hair};display:flex;flex-direction:column}
  .col:first-child{padding-left:0;border-left:0}
  .aa{font-size:240px;line-height:1;height:260px;margin:28px 0 8px;display:flex;align-items:flex-end}
  .gl{font-size:22px;line-height:1.7;letter-spacing:.06em;color:${C.muted};margin-bottom:28px;word-break:break-all}
  h4{font-size:24px;font-weight:600;margin-bottom:40px;padding-bottom:22px;border-bottom:1px solid ${C.hair}}
  .s{flex:1}
  .col p{font-size:15px;color:${C.muted}}` }));

// 07 — Hoạ tiết
sheets.push(sheet(7, "Hoạ tiết", `
  ${intro(7, "Giữa đám đông, một điểm sáng.", "Hoạ tiết lặp lại biểu tượng theo nhịp so le, cùng tông mực trầm để lùi về phía sau. Mỗi bố cục chỉ có đúng một bong bóng cam — tiến bộ của riêng một người học.")}
  <div class="stage" style="background:${C.ink};border-radius:4px;overflow:hidden">
    <svg width="1300" height="900" style="margin:-24px 0 0 -24px">${patternTile(112, 52, [4, 7], 13, 9)}</svg>
  </div>`));

// 08 — Biểu tượng ứng dụng
const icon = (s, r = 0.22) => `<div class="ic" style="width:${s}px;height:${s}px;border-radius:${s * r}px">${mark(s * 0.625, C.paper, C.ember)}</div>`;
sheets.push(sheet(8, "Biểu tượng ứng dụng", `
  ${intro(8, "Nhận ra ngay, kể cả ở 16 pixel.", "Biểu tượng nằm trên nền mực đêm, chiếm 62.5% khung. Cùng một bản vẽ cho iOS, Android, PWA và favicon — không thêm chi tiết, không bóng đổ.")}
  <div class="stage" style="display:flex;flex-direction:column;justify-content:center;gap:110px">
    <div style="display:flex;align-items:flex-end;gap:56px">
      <div class="hero">${icon(360)}</div>
      ${[180, 96, 48, 32, 16].map((s) => `<div class="sz">${icon(s, s <= 32 ? 0.2 : 0.22)}<span>${s}px</span></div>`).join("")}
    </div>
    <div class="browser">
      <div class="tabs"><div class="tab on">${icon(16, 0.2)}<span>Studia — Luyện IELTS</span><b>×</b></div><div class="tab"><span style="width:16px;height:16px;border-radius:4px;background:#D9D4CB;display:block"></span><span>Tab khác</span></div></div>
      <div class="url"><span>studia</span></div>
    </div>
  </div>`, { css: `
  .ic{background:${C.ink};display:grid;place-items:center;flex:none}
  .hero .ic{box-shadow:0 30px 60px -20px rgba(15,31,77,.35)}
  .sz{display:flex;flex-direction:column;align-items:center;gap:16px}
  .sz span{font-size:13px;color:${C.muted};letter-spacing:.06em}
  .browser{border:1px solid ${C.hair};border-radius:10px;overflow:hidden;background:#EFECE6;max-width:1000px}
  .tabs{display:flex;gap:4px;padding:10px 12px 0}
  .tab{display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px 10px 0 0;font-size:14px;color:${C.muted};width:280px}
  .tab.on{background:#fff;color:${C.ink}}
  .tab b{margin-left:auto;font-weight:400;color:${C.muted}}
  .url{background:#fff;padding:12px 18px;border-top:1px solid #fff}
  .url span{display:block;background:#F4F2EE;border-radius:999px;padding:9px 18px;font-size:14px;color:${C.muted};width:520px}` }));

// 09 — Ấn phẩm
sheets.push(sheet(9, "Ấn phẩm", `
  ${intro(9, "Trên giấy, cũng tĩnh lặng như trên màn hình.", "Danh thiếp hai mặt và bìa sách điện tử trong Studia Reader. Khoảng trống rộng, một đường kẻ mảnh, một điểm cam — đủ để nhận ra mà không cần nói nhiều.")}
  <div class="stage pr">
    <div class="cards">
      <div class="card front">${mark(76, C.paper, C.ember)}</div>
      <div class="card back">
        ${lockup(26)}
        <div><div class="nm display">Họ và Tên</div><div class="rl serif"><i>Chức danh</i></div></div>
        <div class="ct"><span>email@studia.vn</span><span>+84 000 000 000</span></div>
      </div>
    </div>
    <div class="book">
      <div class="bk">
        <span class="eyebrow" style="color:rgba(248,246,242,.55)">Studia Reader</span>
        <div><div class="serif bt">Academic<br>Reading</div><div class="rule"></div><div class="bs">Tập 01 · Band 6.5 → 7.5</div></div>
        <svg width="380" height="230" style="margin:0 -46px -46px">${patternTile(76, 34, [1, 3], 6, 4)}</svg>
      </div>
    </div>
  </div>`, { css: `
  .pr{display:flex;gap:72px;align-items:center;justify-content:center;background:#ECE8E1;border-radius:4px}
  .cards{display:flex;flex-direction:column;gap:44px}
  .card{width:525px;height:300px;border-radius:6px;box-shadow:0 1px 2px rgba(15,31,77,.08),0 24px 48px -16px rgba(15,31,77,.28)}
  .front{background:${C.ink};display:grid;place-items:center}
  .back{background:${C.paper};padding:38px 42px;display:flex;flex-direction:column;justify-content:space-between}
  .nm{font-size:26px;font-weight:600;letter-spacing:-.02em}
  .rl{font-size:16px;color:${C.muted};margin-top:4px}
  .ct{display:flex;justify-content:space-between;font-size:13px;color:${C.ink2};padding-top:14px;border-top:1px solid ${C.hair}}
  .bk{width:420px;height:630px;background:${C.ink};color:${C.paper};border-radius:3px 8px 8px 3px;padding:46px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;box-shadow:inset 6px 0 0 rgba(0,0,0,.18),0 1px 2px rgba(15,31,77,.1),0 30px 60px -18px rgba(15,31,77,.4)}
  .bt{font-size:52px;line-height:1.08;letter-spacing:-.01em}
  .bk .rule{width:36px;height:2px;background:${C.ember};margin:28px 0 18px}
  .bs{font-size:14px;color:rgba(248,246,242,.65);letter-spacing:.04em}` }));

// 10 — Ứng dụng số (dùng ảnh đã render)
sheets.push(sheet(10, "Ứng dụng số", `
  ${intro(10, "Một hệ thống, mọi điểm chạm.", "Ảnh chia sẻ liên kết, bài đăng mạng xã hội, ảnh đại diện và ảnh bìa — cùng nhịp chữ, cùng bảng màu, cùng một điểm cam.")}
  <div class="stage dg">
    <div class="og"><img src="../../images/og-image.png"><span>Ảnh chia sẻ · 1200 × 630</span></div>
    <div class="po"><img src="../../images/social-post.png"><span>Bài đăng · 1080 × 1350</span></div>
    <div class="cv"><img src="../../images/social-cover.png"><span>Ảnh bìa · 1500 × 500</span></div>
    <div class="av"><img src="../../images/social-avatar.png"><span>Ảnh đại diện · 1080</span></div>
  </div>`, { css: `
  .dg{display:grid;grid-template-columns:1fr 340px;grid-template-rows:auto auto;gap:36px 36px;align-content:center}
  .dg img{display:block;width:100%;border-radius:4px;box-shadow:0 1px 2px rgba(15,31,77,.08),0 18px 40px -18px rgba(15,31,77,.3)}
  .dg span{display:block;font-size:13px;color:${C.muted};margin-top:12px;letter-spacing:.04em}
  .og{grid-column:1;grid-row:1}
  .po{grid-column:2;grid-row:1}
  .cv{grid-column:1;grid-row:2}
  .av{grid-column:2;grid-row:2;display:flex;flex-direction:column;align-items:flex-start}
  .av img{width:150px;border-radius:50%}` }));

// ── Render ────────────────────────────────────────────────────────────────
const profile = join(tmpdir(), "studia-brand-chrome");
function render(file, out, w, h, scale) {
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${profile}`, `--force-device-scale-factor=${scale}`, `--window-size=${w},${h}`,
    "--virtual-time-budget=20000", "--allow-file-access-from-files", `--screenshot=${out}`, pathToFileURL(file).href,
  ], { stdio: "ignore" });
  console.log("✓", out.replace(ROOT, "brand"));
}

const only = process.argv[2]; // node build.mjs 05 → chỉ render trang 05
for (const a of assets) {
  const f = join(OUT_HTML, `${a.name}.html`);
  writeFileSync(f, a.html);
  if (!only) render(f, join(OUT_IMG, `${a.name}.png`), a.w, a.h, a.scale);
}
const names = ["bia", "y-niem", "cau-truc", "bien-the-logo", "mau-sac", "kieu-chu", "hoa-tiet", "bieu-tuong-ung-dung", "an-pham", "ung-dung-so"];
sheets.forEach((html, i) => {
  const nn = String(i + 1).padStart(2, "0"), base = `${nn}-${names[i]}`, f = join(OUT_HTML, `${base}.html`);
  writeFileSync(f, html);
  if (!only || only === nn) render(f, join(OUT_IMG, `${base}.png`), 1920, 1200, 2);
});
rmSync(profile, { recursive: true, force: true });
