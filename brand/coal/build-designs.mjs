// Xuất 10 kiểu Coal + bảng tổng hợp thành SVG: node brand/coal/build-designs.mjs
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const D = createRequire(import.meta.url)("./designs.js");
const out = join(here, "designs");
mkdirSync(out, { recursive: true });
D.list.forEach((d, i) => writeFileSync(join(out, `coal-${String(i + 1).padStart(2, "0")}-${d.id}.svg`), D.card(i), "utf8"));
writeFileSync(join(out, "coal-12-phong-cach.svg"), D.sheet(), "utf8");
console.log(`Đã xuất ${D.list.length} kiểu + bảng tổng hợp vào ${out}`);
