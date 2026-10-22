// Xuất 6 khung truyện thành SVG: node brand/coal/build.mjs  (PNG: xem README.md)
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const Coal = createRequire(import.meta.url)("./coal.js");
const out = join(here, "panels");
mkdirSync(out, { recursive: true });
for (let n = 1; n <= Coal.panelCount; n++) {
  writeFileSync(join(out, `coal-${String(n).padStart(2, "0")}.svg`), Coal.panel(n), "utf8");
}
console.log(`Đã xuất ${Coal.panelCount} khung vào ${out}`);
