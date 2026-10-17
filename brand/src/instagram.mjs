// Sinh bộ bài đăng Instagram 1080 × 1350 cho Studia (render bằng Chrome headless).
// Chạy: node brand/src/instagram.mjs        (cần Chrome/Edge, có mạng để tải Google Fonts)
//       node brand/src/instagram.mjs 03     → chỉ render bài 03
// Màu, chữ, biểu tượng giống hệt build.mjs; nội dung lấy từ tính năng thật trên trang chủ.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_IMG = join(ROOT, "instagram");
const OUT_HTML = join(ROOT, "src", "instagram");
for (const d of [OUT_IMG, OUT_HTML]) mkdirSync(d, { recursive: true });

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => { try { execFileSync(p, ["--version"], { stdio: "ignore" }); return true; } catch { return false; } }) ?? "chrome";

// ── Bảng màu & biểu tượng (giống build.mjs) ───────────────────────────────
const C = {
  ink: "#0F1F4D", paper: "#F8F6F2", blue: "#2344C9", ember: "#F2611F",
  hair: "#E5E0D8", muted: "#5E6480", ink2: "#3A4260", tone: "#17275C", blueTint: "#E9EEFD",
};
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
const lockup = (h, ink = C.ink, accent = C.ember) =>
  `<svg viewBox="4 4 186 40" height="${h}" width="${(h * 186) / 40}" aria-hidden="true">${markPaths(ink, accent)}<g transform="translate(60 4)">${wordPaths(ink, accent)}</g></svg>`;
const patternTile = (cell, size, hi, cols, rows) => {
  let s = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const on = r === hi[0] && c === hi[1];
    s += `<g transform="translate(${c * cell + (r % 2 ? cell / 2 : 0)} ${r * cell}) scale(${size / 40}) translate(-4 -4)">${markPaths(C.tone, on ? C.ember : C.tone)}</g>`;
  }
  return s;
};
const check = (col) => `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ── Khung bài đăng ────────────────────────────────────────────────────────
const FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Literata:ital,opsz,wght@0,7..72,300..600;1,7..72,300..600&display=block";
const W = 1080, H = 1350;
const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  body{background:${C.paper};color:${C.ink};font-family:'Be Vietnam Pro',sans-serif;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;position:relative;--line:${C.hair};--sub:${C.ink2};--mut:${C.muted}}
  body.dark{background:${C.ink};color:${C.paper};--line:rgba(248,246,242,.14);--sub:rgba(248,246,242,.72);--mut:rgba(248,246,242,.5)}
  svg{display:block}
  .display{font-family:'Bricolage Grotesque',sans-serif;font-optical-sizing:auto}
  .serif{font-family:'Literata',serif;font-optical-sizing:auto}
  .eyebrow{font-size:17px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--mut)}
  .post{position:absolute;inset:0;padding:88px;display:flex;flex-direction:column}
  .top{display:flex;justify-content:space-between;align-items:center}
  h1{font-family:'Bricolage Grotesque',sans-serif;font-size:96px;line-height:.98;font-weight:600;letter-spacing:-.025em;margin-top:60px}
  .sub{font-family:'Literata',serif;font-size:29px;line-height:1.5;color:var(--sub);margin-top:30px;max-width:840px}
  .vis{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;margin:48px 0}
  .foot{padding-top:30px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}
  .foot .eyebrow{font-size:15px}
`;
const TAG = "Học đúng điều cần học";
const post = ({ n, topic, dark = false, head, sub, vis, foot = TAG, css = "", pre = "" }) =>
  `<!doctype html><html lang="vi"><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}">
<style>${CSS}${css}</style></head><body class="${dark ? "dark" : ""}">${pre}
  <div class="post">
    <div class="top"><span class="eyebrow">${topic}</span><span class="eyebrow">${String(n).padStart(2, "0")} / 06</span></div>
    ${head ? `<h1>${head}</h1>` : ""}${sub ? `<p class="sub">${sub}</p>` : ""}
    <div class="vis">${vis}</div>
    <div class="foot">${lockup(30, dark ? C.paper : C.ink)}<span class="eyebrow">${foot}</span></div>
  </div></body></html>`;

const posts = [];

// 01 — Giới thiệu thương hiệu: hoạ tiết, một điểm cam
posts.push({ name: "01-hoc-dung", html: post({
  n: 1, topic: "IELTS&nbsp;&nbsp;·&nbsp;&nbsp;Dành cho người Việt", dark: true,
  pre: `<div class="pat"><svg width="1240" height="900">${patternTile(124, 58, [3, 5], 10, 8)}</svg></div>`,
  vis: `<div class="big serif">Học đúng điều<br>cần học.</div>
        <p class="sub" style="margin-top:36px">Lộ trình IELTS cá nhân hoá bởi AI — đọc, nghe, nói, viết, mỗi ngày một bước vững.</p>`,
  css: `
  .pat{position:absolute;left:-40px;top:-30px;right:0;height:860px;overflow:hidden}
  .pat:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,31,77,0) 40%,${C.ink} 96%)}
  .vis{justify-content:flex-end;margin-bottom:64px}
  .big{font-size:118px;line-height:1.04;letter-spacing:-.02em}`,
}) });

// 02 — Sách của bạn thành lộ trình
const outCard = (k, t, s) => `<div class="oc"><span class="eyebrow">${k}</span><b class="display">${t}</b><span class="s">${s}</span></div>`;
posts.push({ name: "02-sach-thanh-lo-trinh", html: post({
  n: 2, topic: "Tải sách lên&nbsp;&nbsp;·&nbsp;&nbsp;Học ngay",
  head: "Cuốn sách của bạn,<br>thành lộ trình học.",
  sub: "Tải lên PDF — kể cả bản scan. Studia tách bài, dựng sẵn bài học, flashcard và quiz. Trang nào xong là đọc được liền.",
  vis: `<div class="flow">
    <div class="pg">
      <span class="eyebrow" style="font-size:12px">Unit 4</span>
      <div class="pt serif">Urban<br>Environments</div>
      ${[100, 92, 97, 70, 0, 96, 100, 88, 94, 60].map((w) => w ? `<i style="width:${w}%"></i>` : `<em></em>`).join("")}
      <span class="pdf">PDF</span>
    </div>
    <svg class="arrow" viewBox="0 0 80 24" width="96"><path d="M2 12h70M60 3l12 9-12 9" fill="none" stroke="${C.ember}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="outs">
      ${outCard("Bài học", "Ngày 1 · Urban heat", "Bài đọc kèm sơ đồ khái niệm")}
      ${outCard("Flashcard", "mitigate", "giảm nhẹ, làm dịu bớt")}
      ${outCard("Quiz", "Điền chỗ trống", "Trắc nghiệm · viết lại câu")}
    </div>
  </div>`,
  css: `
  .flow{display:flex;align-items:center;gap:30px}
  .pg{position:relative;width:330px;height:440px;flex:none;background:#fff;border:1px solid ${C.hair};border-radius:6px;padding:40px 36px;transform:rotate(-3deg);box-shadow:0 1px 2px rgba(15,31,77,.08),0 30px 50px -24px rgba(15,31,77,.35)}
  .pt{font-size:34px;line-height:1.1;margin:10px 0 26px}
  .pg i{display:block;height:9px;border-radius:5px;background:#E9E5DE;margin-bottom:13px}
  .pg em{display:block;height:14px}
  .pdf{position:absolute;right:-14px;top:30px;background:${C.ink};color:${C.paper};font:700 15px/1 'Be Vietnam Pro';letter-spacing:.12em;padding:10px 14px;border-radius:6px}
  .arrow{flex:none}
  .outs{flex:1;display:flex;flex-direction:column;gap:18px}
  .oc{background:#fff;border:1px solid ${C.hair};border-radius:14px;padding:22px 26px;display:flex;flex-direction:column;gap:6px}
  .oc .eyebrow{font-size:13px;color:${C.blue}}
  .oc b{font-size:31px;font-weight:600;letter-spacing:-.02em}
  .oc .s{font-size:18px;color:${C.muted}}`,
}) });

// 03 — Ôn tập ngắt quãng
const btn = (t, d, on) => `<div class="b${on ? " on" : ""}"><b>${t}</b><span>${d}</span></div>`;
posts.push({ name: "03-nhac-dung-luc", html: post({
  n: 3, topic: "Flashcard&nbsp;&nbsp;·&nbsp;&nbsp;Ôn tập ngắt quãng", dark: true,
  head: "Nhắc đúng lúc<br>bạn sắp quên.",
  sub: "Studia tính xem thẻ nào sắp rơi khỏi trí nhớ và gọi bạn ôn đúng lúc đó. Thuộc rồi thì thôi.",
  vis: `<div class="card">
      <span class="eyebrow" style="color:${C.muted};font-size:14px">Từ vựng&nbsp;&nbsp;·&nbsp;&nbsp;Unit 4</span>
      <div class="w display">mitigate</div>
      <div class="ipa">/ˈmɪt.ɪ.ɡeɪt/&nbsp;&nbsp;·&nbsp;&nbsp;verb</div>
      <div class="m">giảm nhẹ, làm dịu bớt</div>
      <div class="ex serif"><i>Planting trees can help mitigate urban heat.</i></div>
    </div>
    <div class="btns">${btn("Quên", "1 phút")}${btn("Khó", "10 phút")}${btn("Được", "1 ngày", true)}${btn("Dễ", "4 ngày")}</div>`,
  css: `
  .card{background:${C.paper};color:${C.ink};border-radius:28px;padding:44px 52px}
  .w{font-size:104px;font-weight:600;letter-spacing:-.03em;line-height:1;margin-top:18px}
  .ipa{font-size:26px;color:${C.muted};margin-top:12px}
  .m{font-size:32px;font-weight:500;margin-top:28px;padding-top:26px;border-top:1px solid ${C.hair}}
  .ex{font-size:24px;color:${C.ink2};margin-top:12px}
  .btns{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:22px}
  .b{border:1.5px solid rgba(248,246,242,.22);border-radius:16px;padding:18px 0;text-align:center;display:flex;flex-direction:column;gap:4px}
  .b b{font-size:24px;font-weight:600}
  .b span{font-size:16px;color:rgba(248,246,242,.55)}
  .b.on{background:${C.ember};border-color:${C.ember};color:${C.ink}}
  .b.on span{color:rgba(15,31,77,.7)}`,
}) });

// 04 — Thi thử như thi thật
const opt = (t, on) => `<span class="o${on ? " on" : ""}">${t}</span>`;
const qs = Array.from({ length: 13 }, (_, i) => {
  const n = i + 1, cls = n <= 4 ? "d" : n === 5 ? "cur" : "";
  return `<span class="${cls}">${n}${n === 7 ? `<i></i>` : ""}</span>`;
}).join("");
posts.push({ name: "04-thi-thu", html: post({
  n: 4, topic: "Thi thử&nbsp;&nbsp;·&nbsp;&nbsp;Chấm band",
  head: "Thi thử<br>như thi thật.",
  sub: "Đếm ngược, chia đôi màn hình, cắm cờ câu khó. Mất mạng giữa chừng cũng không mất bài.",
  vis: `<div class="win">
    <div class="bar"><span class="t">Reading&nbsp;&nbsp;·&nbsp;&nbsp;Passage 1</span><span class="clk display">52:14</span><span class="sb">Nộp bài</span></div>
    <div class="split">
      <div class="pa serif">
        <h3>The making of obsidian</h3>
        <p>Obsidian is a natural volcanic glass. It forms when lava rich in silica cools so quickly that crystals have no time to grow.</p>
        <p>Because it fractures into razor-sharp edges, early communities shaped it into blades and arrowheads.</p>
      </div>
      <div class="qq">
        <span class="eyebrow" style="font-size:12px;color:${C.muted}">Questions 1–5&nbsp;&nbsp;·&nbsp;&nbsp;True / False / Not given</span>
        <div class="q"><p><b>4</b>Obsidian was formed by heat from volcanic eruptions.</p><div>${opt("TRUE", true)}${opt("FALSE")}${opt("NOT GIVEN")}</div></div>
        <div class="q"><p><b>5</b>Obsidian blades were traded over long distances.</p><div>${opt("TRUE")}${opt("FALSE")}${opt("NOT GIVEN")}</div></div>
      </div>
    </div>
    <div class="nav">${qs}</div>
  </div>`,
  css: `
  .win{background:#fff;border:1px solid ${C.hair};border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgba(15,31,77,.06),0 34px 60px -30px rgba(15,31,77,.35)}
  .bar{display:flex;align-items:center;justify-content:space-between;padding:18px 26px;border-bottom:1px solid ${C.hair}}
  .bar .t{font-size:17px;font-weight:600}
  .clk{font-size:30px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
  .sb{background:${C.blue};color:#fff;font-size:16px;font-weight:600;padding:10px 20px;border-radius:999px}
  .split{display:grid;grid-template-columns:1fr 1fr}
  .pa{padding:26px 28px;border-right:1px solid ${C.hair};background:#FCFBF9}
  .pa h3{font-size:23px;font-weight:600;margin-bottom:12px}
  .pa p{font-size:17px;line-height:1.65;color:${C.ink2};margin-bottom:12px}
  .qq{padding:26px 28px;display:flex;flex-direction:column;gap:22px}
  .q p{font-size:17px;line-height:1.5;display:flex;gap:12px}
  .q p b{flex:none;width:28px;height:28px;border-radius:8px;background:${C.paper};display:grid;place-items:center;font-size:14px}
  .q div{display:flex;gap:8px;margin:12px 0 0 40px}
  .o{font-size:12.5px;font-weight:600;letter-spacing:.04em;padding:8px 12px;border-radius:999px;border:1px solid ${C.hair};color:${C.muted}}
  .o.on{background:${C.blueTint};border-color:${C.blue};color:${C.blue}}
  .nav{display:flex;gap:9px;padding:16px 26px;border-top:1px solid ${C.hair}}
  .nav span{position:relative;width:46px;height:40px;border-radius:9px;border:1px solid ${C.hair};display:grid;place-items:center;font-size:15px;font-weight:600;color:${C.muted}}
  .nav .d{background:${C.ink};border-color:${C.ink};color:${C.paper}}
  .nav .cur{border:2px solid ${C.blue};color:${C.blue}}
  .nav i{position:absolute;top:-5px;right:-5px;width:14px;height:14px;border-radius:50%;background:${C.ember};border:2px solid #fff}`,
}) });

// 05 — Luyện nói cùng AI (bong bóng thoại theo hình biểu tượng)
const say = (who, text, cls) => `<div class="msg ${cls}"><span class="who">${who}</span><div class="bub">${text}</div></div>`;
posts.push({ name: "05-luyen-noi", html: post({
  n: 5, topic: "Luyện nói&nbsp;&nbsp;·&nbsp;&nbsp;AI sửa ngay", dark: true,
  head: "Nói sai<br>cũng không sao.",
  sub: "Cứ nói. Studia AI nghe, chỉ ra chỗ chưa chuẩn và gợi ý cách nói hay hơn.",
  vis: `<div class="chat">
    ${say("Bạn&nbsp;&nbsp;·&nbsp;&nbsp;ghi âm 0:04", "It was very beautiful and crowded.", "me")}
    ${say("Studia AI", `Thử <b>“breathtaking”</b> thay cho “very beautiful” nhé — tự nhiên hơn nhiều.`, "ai")}
    ${say("Bạn&nbsp;&nbsp;·&nbsp;&nbsp;ghi âm 0:05", "It was breathtaking, especially at sunrise.", "me up")}
    ${say("Studia AI", "Chuẩn rồi! Câu này nghe như band 7.", "ai")}
  </div>`,
  css: `
  .chat{display:flex;flex-direction:column;gap:20px}
  .msg{display:flex;flex-direction:column;gap:8px;max-width:76%}
  .who{font-size:14px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:rgba(248,246,242,.5)}
  .bub{font-size:27px;line-height:1.4;padding:20px 30px}
  .ai{align-self:flex-start}
  .ai .bub{background:${C.paper};color:${C.ink};border-radius:36px 8px 0 36px}
  .ai .bub b{font-weight:600}
  .me{align-self:flex-end;align-items:flex-end}
  .me .bub{background:${C.tone};color:${C.paper};border-radius:0 36px 36px 8px;font-family:'Literata',serif;font-style:italic}
  .me.up .bub{background:${C.ember};color:${C.ink}}`,
}) });

// 06 — Lộ trình mỗi ngày + kêu gọi
const task = (done, t, m) => `<div class="tk${done ? " done" : ""}"><span class="cb">${done ? check(C.paper) : ""}</span><div><b>${t}</b><span>${m}</span></div></div>`;
posts.push({ name: "06-moi-ngay", html: post({
  n: 6, topic: "Lộ trình&nbsp;&nbsp;·&nbsp;&nbsp;Tự điều chỉnh",
  head: "Mỗi ngày<br>một bước vững.",
  sub: "Nhiệm vụ vừa sức với thời gian bạn có. Lịch ngày mai tự điều chỉnh theo kết quả hôm nay.",
  foot: "Bắt đầu miễn phí",
  vis: `<div class="plan">
    <div class="hd"><div><b class="display">Hôm nay</b><span>3 nhiệm vụ&nbsp;&nbsp;·&nbsp;&nbsp;38 phút</span></div><span class="goal">Mục tiêu: IELTS 6.5 trong 3 tháng</span></div>
    <div class="pr"><i></i></div>
    ${task(true, "Ôn 10 flashcard", "Từ vựng Unit 4&nbsp;&nbsp;·&nbsp;&nbsp;8 phút")}
    ${task(false, "Đọc: Urban heat islands", "Bài học&nbsp;&nbsp;·&nbsp;&nbsp;15 phút")}
    ${task(false, "Làm 5 câu hỏi", "Quiz&nbsp;&nbsp;·&nbsp;&nbsp;15 phút")}
  </div>
  <div class="perks"><span>${check(C.blue)}Miễn phí 1 cuốn sách</span><span>${check(C.blue)}Không cần thẻ ngân hàng</span><span>${check(C.blue)}Học cả trên điện thoại</span></div>`,
  css: `
  .plan{background:#fff;border:1px solid ${C.hair};border-radius:22px;padding:32px 34px 14px;box-shadow:0 1px 2px rgba(15,31,77,.06),0 34px 60px -30px rgba(15,31,77,.3)}
  .hd{display:flex;justify-content:space-between;align-items:flex-start}
  .hd b{display:block;font-size:40px;font-weight:600;letter-spacing:-.03em}
  .hd span{font-size:18px;color:${C.muted}}
  .goal{background:${C.blueTint};color:${C.blue}!important;font-weight:600;font-size:16px!important;padding:10px 16px;border-radius:999px}
  .pr{height:8px;border-radius:4px;background:${C.paper};margin:22px 0 10px;overflow:hidden}
  .pr i{display:block;height:100%;width:21%;background:${C.ember};border-radius:4px}
  .tk{display:flex;gap:20px;align-items:center;padding:20px 0;border-top:1px solid ${C.hair}}
  .tk:nth-of-type(3){border-top:0}
  .cb{flex:none;width:38px;height:38px;border-radius:50%;border:2px solid #80869E;display:grid;place-items:center}
  .done .cb{background:${C.ink};border-color:${C.ink}}
  .tk b{display:block;font-size:24px;font-weight:600}
  .done b{color:${C.muted};text-decoration:line-through;text-decoration-color:${C.hair}}
  .tk span{font-size:17px;color:${C.muted}}
  .perks{display:flex;justify-content:space-between;margin-top:28px;font-size:18px;font-weight:500;color:${C.ink2}}
  .perks span{display:flex;align-items:center;gap:8px}`,
}) });

// ── Render ────────────────────────────────────────────────────────────────
const profile = join(tmpdir(), "studia-ig-chrome");
const only = process.argv[2];
for (const p of posts) {
  const f = join(OUT_HTML, `${p.name}.html`);
  writeFileSync(f, p.html);
  if (only && !p.name.startsWith(only)) continue;
  const out = join(OUT_IMG, `${p.name}.png`);
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${profile}`, "--force-device-scale-factor=1", `--window-size=${W},${H}`,
    "--virtual-time-budget=20000", `--screenshot=${out}`, pathToFileURL(f).href,
  ], { stdio: "ignore" });
  console.log("✓", out.replace(ROOT, "brand"));
}
rmSync(profile, { recursive: true, force: true });
