// Sinh hai bộ ảnh mạng xã hội 1080 × 1350 cho Studia + CAPTIONS.md + trang xem nhanh.
// Chạy: node brand/src/social.mjs            → cả hai bộ
//       node brand/src/social.mjs a          → chỉ bộ A (hoặc b)
//       node brand/src/social.mjs a 07 12    → chỉ render ảnh số 07 và 12 của bộ A
// Cần Chrome/Edge và mạng (tải Google Fonts).
import { writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BRAND, renderAll } from "./social/common.mjs";
import * as A from "./social/set-a.mjs";
import * as B from "./social/set-b.mjs";

const [which, ...only] = process.argv.slice(2);
const sets = { a: A, b: B };
const OUT = join(BRAND, "social");

for (const [key, mod] of Object.entries(sets)) {
  if (which && which !== key) continue;
  const outDir = join(OUT, mod.SET.dir);
  const jobs = only.length ? mod.posts.filter((p) => only.includes(p.file.slice(0, 2))) : mod.posts;
  console.log(`\n${mod.SET.title}: ${jobs.length} ảnh`);
  await renderAll(jobs, { outDir, htmlDir: join(BRAND, "src", "social", "pages", mod.SET.dir) });

  const md = [`# Studia — ${mod.SET.title}`, "",
    `${mod.posts.length} ảnh 1080 × 1350 (tỉ lệ 4:5). Số thứ tự là thứ tự đăng gợi ý: các định dạng đã được xen kẽ để lưới trang cá nhân không lặp.`,
    "Sinh lại: `node brand/src/social.mjs " + key + "` (hoặc thêm số ảnh, ví dụ `node brand/src/social.mjs " + key + " 07`).", "",
    "Quy tắc chung: không hứa điểm số, không dùng logo IELTS hay bìa sách Cambridge, trả lời bình luận trong 24 giờ.", ""];
  for (const p of mod.posts) md.push("---", "", `## ${p.file.slice(0, 2)} — ${p.label}  ·  \`${p.file}\``, "", p.caption, "", p.tags, "");
  writeFileSync(join(outDir, "CAPTIONS.md"), md.join("\n"));
}

// Trang xem nhanh cả hai bộ
const gallery = Object.values(sets).map((mod) => {
  const dir = join(OUT, mod.SET.dir);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")).sort() : [];
  return `<h2>${mod.SET.title} <small>${files.length} ảnh · <a href="${mod.SET.dir}/CAPTIONS.md">chú thích</a></small></h2>
<div class="grid">${files.map((f) => `<a href="${mod.SET.dir}/${f}" title="${f}"><img loading="lazy" src="${mod.SET.dir}/${f}" alt="${f}"></a>`).join("")}</div>`;
}).join("");
writeFileSync(join(OUT, "index.html"), `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Studia — ảnh mạng xã hội</title><style>
body{margin:0;padding:32px 16px 64px;background:#f8f6f2;color:#0f1f4d;font:15px/1.5 system-ui,sans-serif}
@media (prefers-color-scheme:dark){body{background:#0b1022;color:#edf0f8}a{color:#9db2ff}}
h1{max-width:1100px;margin:0 auto 8px;font-size:28px}h2{max-width:1100px;margin:40px auto 16px;font-size:20px}h2 small{font-weight:400;opacity:.7}
.grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.grid img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}
</style></head><body><h1>Studia — ảnh mạng xã hội</h1><p style="max-width:1100px;margin:0 auto">Lưới 3 cột giống trang cá nhân Instagram. Kế hoạch: <code>docs/marketing/KE_HOACH_MARKETING.md</code>.</p>${gallery}</body></html>`);
console.log("\nXong:", OUT);
