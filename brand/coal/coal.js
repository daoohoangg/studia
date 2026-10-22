/**
 * Coal — linh vật cục than của Studia, vẽ bằng SVG thuần (không phụ thuộc gì).
 * Dùng được ở trình duyệt (window.Coal) lẫn Node (require). Xem comic.html và build.mjs.
 *
 *   Coal.coal({ mood: "happy", armR: "wave", glasses: true })  -> chuỗi <g> của nhân vật (hệ toạ độ 200x220)
 *   Coal.panel(1..6)                                           -> chuỗi <svg> 1080x1080 của từng khung truyện
 *   Coal.CSS                                                   -> CSS chuyển động (nháy mắt, thở, vẫy tay, đi bộ…)
 */
(function (root) {
  "use strict";

  const INK = "#2b2233";
  const BODY = "#58525f", BODY_HI = "#82798f", BODY_LO = "#3d3846";
  const CREAM = "#fdf9ef";
  const EMBER = "#ff6a2b", EMBER2 = "#ffc247";
  const BRAND = "#2344c9";
  const FONT = "'Be Vietnam Pro','Segoe UI',Arial,sans-serif";

  const f1 = (n) => Math.round(n * 10) / 10;

  /** Bộ sinh số giả ngẫu nhiên cố định: nhân vật luôn có cùng hình dạng giữa các lần vẽ. */
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  /** Khối tròn có viền lởm chởm như vẽ bằng bút sáp. */
  function blob(cx, cy, r, seed, o) {
    o = Object.assign({ n: 34, jag: 0.06, squash: 1 }, o);
    const R = rng(seed), pts = [];
    for (let i = 0; i < o.n; i++) {
      const a = (i / o.n) * Math.PI * 2;
      const rr = r * (1 + (R() - 0.5) * 2 * o.jag + (i % 2 ? 0.03 : -0.025));
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * o.squash]);
    }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let d = `M${f1(mid(pts[o.n - 1], pts[0])[0])} ${f1(mid(pts[o.n - 1], pts[0])[1])}`;
    for (let i = 0; i < o.n; i++) {
      const m = mid(pts[i], pts[(i + 1) % o.n]);
      d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(m[0])} ${f1(m[1])}`;
    }
    return d + "Z";
  }

  /* ---------- Cảm xúc ---------- */
  const MOODS = {
    idle:      { eyes: "open", mouth: "smile", glow: 0.6 },
    happy:     { eyes: "open", mouth: "grin", cheeks: true, glow: 0.85 },
    joy:       { eyes: "joy", mouth: "big", cheeks: true, glow: 1, sparks: true },
    sad:       { eyes: "open", lid: 0.5, tilt: -13, mouth: "frown", tear: true, glow: 0.14 },
    worried:   { eyes: "open", mouth: "wavy", brows: "worried", sweat: true, glow: 0.4 },
    sleepy:    { eyes: "sleep", mouth: "soft", zzz: true, glow: 0.22 },
    surprised: { eyes: "wide", mouth: "o", glow: 0.8 },
    focus:     { eyes: "open", lid: 0.22, tilt: 9, mouth: "smirk", brows: "focus", glow: 0.78 },
    proud:     { eyes: "joy", mouth: "smile", cheeks: true, glow: 0.95, sparks: true },
  };

  /* ---------- Tay: định nghĩa cho tay trái (nhìn từ phía người xem); tay phải lật gương ---------- */
  const ARMS = {
    down:  { d: "M47 122 Q22 138 27 170", h: [27, 170, 100] },
    up:    { d: "M47 112 Q20 88 32 48", h: [32, 48, -102] },
    wave:  { d: "M47 112 Q14 100 22 64", h: [22, 64, -104] },
    hips:  { d: "M47 124 Q20 142 52 158", h: [52, 158, 25] },
    hold:  { d: "M47 126 Q34 156 66 156", h: [66, 156, 0] },
    out:   { d: "M47 118 Q20 112 5 128", h: [5, 128, 160] },
    cheer: { d: "M47 110 Q12 92 24 40", h: [24, 40, -100] },
  };

  function hand(x, y, ang) {
    let s = "";
    for (const a of [-30, 0, 30]) {
      const r = ((ang + a) * Math.PI) / 180;
      s += `M${x} ${y}L${f1(x + Math.cos(r) * 10)} ${f1(y + Math.sin(r) * 10)}`;
    }
    return s;
  }

  const armPath = (name) => {
    const a = ARMS[name] || ARMS.down;
    return a.d + hand(a.h[0], a.h[1], a.h[2]);
  };

  /* ---------- Nhân vật ---------- */
  let uidCounter = 0;

  function coal(opts) {
    const p = Object.assign({
      mood: "idle", armL: "down", armR: "down", look: [0, 0], glasses: false, headphones: false,
      prop: null, glow: null, flip: false, walking: false, uid: null,
    }, opts);
    const m = MOODS[p.mood] || MOODS.idle;
    const uid = p.uid || "c" + ++uidCounter;
    const glow = p.glow == null ? m.glow : p.glow;
    const [lx, ly] = p.look;
    const ex = [80, 120], ey = 98;
    let s = "";

    s += `<defs>
      <clipPath id="${uid}-l"><circle cx="${ex[0]}" cy="${ey}" r="14"/></clipPath>
      <clipPath id="${uid}-r"><circle cx="${ex[1]}" cy="${ey}" r="14"/></clipPath>
      <filter id="${uid}-g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>`;

    // bóng đổ dưới chân
    s += `<ellipse cx="100" cy="206" rx="52" ry="7" fill="${INK}" opacity=".12"/>`;

    // chân (nhóm riêng để animation đi bộ xoay quanh hông)
    s += `<g class="c-legL" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M84 158L82 196Q70 204 63 199"/></g>`;
    s += `<g class="c-legR" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M116 158L118 196Q130 204 137 199"/></g>`;

    // tay sau thân
    const arm = (name, mirror, cls) =>
      `<g class="${cls}" ${mirror ? 'transform="translate(200 0) scale(-1 1)"' : ""} stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${armPath(name)}"/></g>`;
    s += arm(p.armL, false, "c-armL" + (p.armL === "wave" ? " c-wave" : ""));
    s += arm(p.armR, true, "c-armR" + (p.armR === "wave" ? " c-wave" : ""));

    // thân: khối than xù xì
    s += `<g class="c-body">`;
    s += `<path d="${blob(100, 108, 59, 11, { squash: 0.97 })}" fill="${BODY}"/>`;
    s += `<path d="${blob(84, 86, 33, 5, { n: 20, jag: 0.09 })}" fill="${BODY_HI}" opacity=".42"/>`;
    s += `<path d="${blob(122, 146, 28, 9, { n: 18, jag: 0.1 })}" fill="${BODY_LO}" opacity=".5"/>`;
    const R = rng(3);
    for (let i = 0; i < 26; i++) {
      const a = R() * 6.283, r = Math.sqrt(R()) * 52;
      s += `<circle cx="${f1(100 + Math.cos(a) * r)}" cy="${f1(110 + Math.sin(a) * r)}" r="${f1(1 + R() * 2)}" fill="${R() > 0.5 ? BODY_HI : BODY_LO}" opacity=".5"/>`;
    }
    // vài nét "vân than" như viền phấn
    s += `<path d="M62 70l9 5M138 66l-8 6M54 118l10-2M146 120l-9-1M70 152l8-4" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" opacity=".35" fill="none"/>`;

    // lõi than hồng ở bụng: sáng theo tâm trạng
    s += `<g class="c-ember" opacity="${f1(0.18 + glow * 0.82)}">`;
    s += `<ellipse cx="100" cy="158" rx="${f1(12 + glow * 12)}" ry="${f1(6 + glow * 5)}" fill="${EMBER}" filter="url(#${uid}-g)" opacity="${f1(glow)}"/>`;
    s += `<path d="M82 160l8-7 6 8 9-10 7 9 8-6" stroke="${EMBER}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    s += `<path d="M91 153l5 8 9-10" stroke="${EMBER2}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${f1(glow)}"/>`;
    s += `</g>`;
    s += `</g>`;

    // ngọn lửa nhỏ trên đầu khi đang hăng
    if (glow >= 0.7) {
      const k = glow >= 0.95 ? 1.25 : 1;
      s += `<g transform="translate(100 ${p.headphones ? 36 : 52}) scale(${k})"><g class="c-flame"><path d="M-10 4Q-17 -12 -3 -28Q-3 -14 7 -18Q15 -4 9 4Z" fill="${EMBER}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M-3 3Q-6 -6 1 -14Q2 -6 6 -4Q6 1 3 3Z" fill="${EMBER2}"/></g></g>`;
    }

    // má hồng
    if (m.cheeks) {
      s += `<ellipse cx="64" cy="116" rx="9" ry="5.5" fill="${EMBER}" opacity=".55"/><ellipse cx="136" cy="116" rx="9" ry="5.5" fill="${EMBER}" opacity=".55"/>`;
    }

    // mắt
    s += `<g class="c-eyes">`;
    if (m.eyes === "joy") {
      for (const x of ex) s += `<path d="M${x - 12} ${ey + 4}Q${x} ${ey - 12} ${x + 12} ${ey + 4}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round" style="stroke:#fdf9ef"/>`;
    } else if (m.eyes === "sleep") {
      for (const x of ex) s += `<path d="M${x - 12} ${ey}Q${x} ${ey + 9} ${x + 12} ${ey}" stroke="${CREAM}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    } else {
      const wide = m.eyes === "wide";
      ex.forEach((x, i) => {
        s += `<circle cx="${x}" cy="${ey}" r="${wide ? 16 : 14}" fill="#fff" stroke="${INK}" stroke-width="2.2"/>`;
        s += `<circle cx="${f1(x + lx * 4)}" cy="${f1(ey + ly * 3.5)}" r="${wide ? 4.5 : 6.6}" fill="${INK}"/>`;
        s += `<circle cx="${f1(x + lx * 4 - 2)}" cy="${f1(ey + ly * 3.5 - 2.2)}" r="1.8" fill="#fff"/>`;
        if (m.lid) {
          const tilt = (i === 0 ? 1 : -1) * (m.tilt || 0);
          s += `<g clip-path="url(#${uid}-${i ? "r" : "l"})"><g transform="rotate(${tilt} ${x} ${ey})"><rect x="${x - 20}" y="${ey - 20}" width="40" height="${f1(20 + 28 * m.lid - 6)}" fill="${BODY}"/><path d="M${x - 20} ${f1(ey + 28 * m.lid - 6)}H${x + 20}" stroke="${INK}" stroke-width="2.4"/></g></g>`;
        }
      });
    }
    s += `</g>`;

    // lông mày
    if (m.brows === "worried") {
      s += `<path d="M64 84L91 74M109 74L136 84" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" fill="none" style="stroke:#fdf9ef"/>`;
    } else if (m.brows === "focus") {
      s += `<path d="M64 76L91 83M109 83L136 76" stroke="${CREAM}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
    }

    // miệng
    const mc = CREAM;
    const mouth = {
      smile: `<path d="M89 126Q100 137 111 126" stroke="${mc}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
      grin: `<path d="M87 123Q100 142 113 123Z" fill="${INK}" stroke="${mc}" stroke-width="3" stroke-linejoin="round"/>`,
      big: `<path d="M84 121Q100 152 116 121Z" fill="${INK}" stroke="${mc}" stroke-width="3" stroke-linejoin="round"/><path d="M92 137Q100 130 108 137Q100 144 92 137Z" fill="${EMBER}"/>`,
      frown: `<path d="M90 133Q100 122 110 133" stroke="${mc}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
      wavy: `<path d="M86 129q7 -7 14 0t14 0" stroke="${mc}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
      o: `<ellipse cx="100" cy="130" rx="6" ry="${m.eyes === "sleep" ? 5 : 8}" fill="${INK}" stroke="${mc}" stroke-width="2.6"/>`,
      soft: `<path d="M91 128Q100 134 109 128" stroke="${mc}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
      smirk: `<path d="M91 127Q101 132 112 124" stroke="${mc}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
    }[m.mouth];
    s += `<g class="c-mouth">${mouth}</g>`;

    if (m.tear) s += `<path class="c-tear" d="M86 114q-5 8 0 12q5 -4 0 -12z" fill="#8fd3ff" stroke="${INK}" stroke-width="1.8"/>`;
    if (m.sweat) s += `<path class="c-sweat" d="M141 70q-7 11 0 16q7 -5 0 -16z" fill="#8fd3ff" stroke="${INK}" stroke-width="2"/>`;
    if (m.zzz) {
      s += `<g class="c-zzz" font-family="${FONT}" font-weight="700" fill="${INK}"><text x="146" y="62" font-size="22">Z</text><text x="160" y="42" font-size="17">z</text><text x="171" y="26" font-size="13">z</text></g>`;
    }

    // phụ kiện trên mặt
    if (p.glasses) {
      s += `<g fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"><circle cx="80" cy="98" r="19"/><circle cx="120" cy="98" r="19"/><path d="M99 96Q100 93 101 96M61 94L48 90M139 94L152 90"/></g>`;
    }
    if (p.headphones) {
      s += `<g stroke="${INK}" stroke-width="3" stroke-linecap="round"><path d="M43 98Q40 36 100 38Q160 36 157 98" fill="none" stroke-width="6"/><rect x="33" y="88" width="17" height="34" rx="7" fill="#6b8cff"/><rect x="150" y="88" width="17" height="34" rx="7" fill="#6b8cff"/></g>`;
    }

    // vật cầm tay
    if (p.prop === "book") {
      s += `<g transform="rotate(-4 100 160)"><rect x="68" y="138" width="64" height="42" rx="4" fill="${BRAND}" stroke="${INK}" stroke-width="3"/><path d="M100 138V180" stroke="${INK}" stroke-width="2.4"/><text x="84" y="164" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="11" fill="#fff">IELTS</text><rect x="106" y="148" width="20" height="3" rx="1.5" fill="#fff" opacity=".7"/><rect x="106" y="156" width="14" height="3" rx="1.5" fill="#fff" opacity=".7"/></g>`;
    }
    if (p.prop === "pencil") {
      const [hx, hy] = [200 - ARMS[p.armR].h[0], ARMS[p.armR].h[1]];
      s += `<g transform="translate(${hx} ${hy}) rotate(16)" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"><rect x="-5" y="-38" width="10" height="42" fill="${EMBER2}"/><path d="M-5 4L0 17L5 4Z" fill="#f3d9b1"/><path d="M-1.6 13.2L0 17L1.6 13.2Z" fill="${INK}"/><rect x="-5" y="-46" width="10" height="8" fill="#ff9fb3"/><path d="M-5 -38H5" fill="none"/></g>`;
    }
    if (p.prop === "phone") {
      const [hx, hy] = [200 - ARMS[p.armR].h[0], ARMS[p.armR].h[1]];
      s += `<g transform="translate(${hx} ${hy - 4}) rotate(10)"><rect x="-11" y="-30" width="22" height="36" rx="5" fill="#fff" stroke="${INK}" stroke-width="2.6"/><rect x="-7" y="-25" width="14" height="22" rx="2" fill="${BRAND}"/></g>`;
    }

    const cls = ["coal", "c-bob", p.walking ? "walking" : ""].join(" ").trim();
    const flip = p.flip ? ' transform="translate(200 0) scale(-1 1)"' : "";
    return `<g class="${cls}"${flip}>${s}</g>`;
  }

  /* ---------- CSS chuyển động ---------- */
  const CSS = `
.c-bob{animation:c-bob 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
@keyframes c-bob{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-4px) scale(.985,1.015)}}
.c-eyes{animation:c-blink 4.4s infinite;transform-box:fill-box;transform-origin:50% 50%}
@keyframes c-blink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}}
.c-wave{animation:c-wave .9s ease-in-out infinite;transform-origin:47px 112px}
@keyframes c-wave{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(9deg)}}
.c-ember{animation:c-ember 1.7s ease-in-out infinite}
@keyframes c-ember{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25)}}
.c-flame{animation:c-flame .55s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}
@keyframes c-flame{from{transform:scaleY(1) rotate(-3deg)}to{transform:scaleY(1.14) rotate(3deg)}}
.c-zzz text{animation:c-zzz 2.4s ease-in-out infinite}
.c-zzz text:nth-child(2){animation-delay:.5s}.c-zzz text:nth-child(3){animation-delay:1s}
@keyframes c-zzz{0%{opacity:0;transform:translate(0,8px)}30%,70%{opacity:1}100%{opacity:0;transform:translate(6px,-10px)}}
.c-tear{animation:c-tear 2.2s ease-in infinite}
@keyframes c-tear{0%{transform:translateY(-3px);opacity:0}25%{opacity:1}100%{transform:translateY(22px);opacity:0}}
.c-sweat{animation:c-sweat 1.8s ease-in infinite}
@keyframes c-sweat{0%{transform:translateY(-3px);opacity:0}30%{opacity:1}100%{transform:translateY(16px);opacity:0}}
.walking .c-legL{animation:c-step .5s ease-in-out infinite;transform-origin:84px 158px}
.walking .c-legR{animation:c-step .5s ease-in-out infinite reverse;transform-origin:116px 158px}
@keyframes c-step{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(20deg)}}
.walking.c-bob{animation-duration:.5s}
.c-twinkle{animation:c-twinkle 1.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes c-twinkle{0%,100%{transform:scale(.4);opacity:.3}50%{transform:scale(1.1);opacity:1}}
.c-rain line{animation:c-rain .9s linear infinite}
.c-rain line:nth-child(2n){animation-delay:.3s}.c-rain line:nth-child(3n){animation-delay:.6s}
@keyframes c-rain{0%{transform:translateY(-12px);opacity:0}30%{opacity:1}100%{transform:translateY(70px);opacity:0}}
.c-wave-sound path{animation:c-sound 1.6s ease-out infinite}
.c-wave-sound path:nth-child(2){animation-delay:.3s}.c-wave-sound path:nth-child(3){animation-delay:.6s}
@keyframes c-sound{0%{opacity:0}30%{opacity:.9}100%{opacity:0}}
.c-fall{animation:c-fall 3.2s linear infinite}
@keyframes c-fall{0%{transform:translateY(-30px) rotate(0);opacity:0}10%{opacity:1}100%{transform:translateY(520px) rotate(300deg);opacity:1}}
.c-ring{animation:c-ring .5s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
@keyframes c-ring{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@media (prefers-reduced-motion:reduce){.c-bob,.c-eyes,.c-wave,.c-ember,.c-flame,.c-zzz text,.c-tear,.c-sweat,.c-twinkle,.c-rain line,.c-wave-sound path,.c-fall,.c-ring,.walking .c-legL,.walking .c-legR{animation:none!important}.c-zzz text{opacity:1}}
`;

  /* ---------- Thành phần cảnh ---------- */
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  function spark(x, y, r, color, delay) {
    return `<path class="c-twinkle" style="animation-delay:${delay || 0}s" d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${color}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  }

  /** Bóng thoại: tail = [x, y] là điểm đuôi chỉ tới. */
  function bubble(x, y, lines, tail, o) {
    o = Object.assign({ size: 34, fill: "#fff", pad: 26, italic: false }, o);
    const w = Math.max(...lines.map((l) => l.length)) * o.size * 0.54 + o.pad * 2;
    const h = lines.length * o.size * 1.28 + o.pad * 1.3;
    const bx = x - w / 2, by = y - h / 2;
    const cx = Math.min(Math.max(tail[0], bx + 40), bx + w - 40);
    const ty = tail[1] > y ? by + h : by;
    const dir = tail[1] > y ? 1 : -1;
    let s = `<g>`;
    s += `<path d="M${f1(cx - 18)} ${f1(ty - dir * 2)}L${tail[0]} ${tail[1]}L${f1(cx + 18)} ${f1(ty - dir * 2)}Z" fill="${o.fill}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    s += `<rect x="${f1(bx)}" y="${f1(by)}" width="${f1(w)}" height="${f1(h)}" rx="30" fill="${o.fill}" stroke="${INK}" stroke-width="5"/>`;
    s += `<path d="M${f1(cx - 16)} ${f1(ty - dir * 2.5)}L${f1(cx + 16)} ${f1(ty - dir * 2.5)}" stroke="${o.fill}" stroke-width="8"/>`;
    lines.forEach((l, i) => {
      s += `<text x="${x}" y="${f1(by + o.pad * 0.65 + o.size * 1.02 + i * o.size * 1.28)}" text-anchor="middle" font-family="${FONT}" font-weight="${o.italic ? 500 : 700}" ${o.italic ? 'font-style="italic"' : ""} font-size="${o.size}" fill="${INK}">${esc(l)}</text>`;
    });
    return s + `</g>`;
  }

  function caption(text) {
    const w = Math.min(960, text.length * 25 + 70);
    return `<g><rect x="48" y="48" width="${w}" height="76" rx="18" fill="#fff3c4" stroke="${INK}" stroke-width="5"/><text x="${48 + w / 2}" y="98" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="34" fill="${INK}">${esc(text)}</text></g>`;
  }

  function cloud(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-70 20Q-92 20 -90 -2Q-88 -22 -64 -20Q-62 -48 -30 -46Q-8 -70 22 -48Q50 -54 58 -26Q90 -24 88 2Q86 22 62 20Z" fill="#c9d2e6" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>`;
  }

  function floor(y) {
    return `<path d="M60 ${y}Q300 ${y - 8} 540 ${y}T1020 ${y - 2}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  }

  function frame(n, wash, inner) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080" role="img" aria-label="Coal, khung ${n}/6">
<style>${CSS}</style>
<rect width="1080" height="1080" fill="${CREAM}"/>
<rect x="24" y="24" width="1032" height="1032" rx="34" fill="${wash}"/>
${inner}
<rect x="24" y="24" width="1032" height="1032" rx="34" fill="none" stroke="${INK}" stroke-width="8"/>
<text x="1030" y="1040" text-anchor="end" font-family="${FONT}" font-weight="700" font-size="22" fill="${INK}" opacity=".5">${n}/6</text>
</svg>`;
  }

  const hero = (cx, g) => `<g transform="translate(${cx - 290} 322) scale(2.9)">${g}</g>`;
  const at = (x, y, s, g) => `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;

  /* ---------- 6 khung truyện: "Coal và bài nghe chép đầu tiên" ---------- */
  const PANELS = {
    1() {
      let s = floor(900);
      s += `<g transform="translate(760 872)"><g class="c-ring"><rect x="-44" y="-30" width="88" height="34" rx="10" fill="#fff" stroke="${INK}" stroke-width="5"/><rect x="-34" y="-24" width="68" height="22" rx="4" fill="${BRAND}"/></g><g class="c-wave-sound" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"><path d="M-62 -34Q-76 -20 -62 -6"/><path d="M-78 -46Q-100 -20 -78 6"/><path d="M62 -34Q76 -20 62 -6"/><path d="M78 -46Q100 -20 78 6"/></g></g>`;
      s += hero(330, coal({ mood: "sleepy", armL: "down", armR: "down", uid: "p1" }));
      s += bubble(760, 640, ["Tinh! Đến giờ", "học rồi nhé."], [760, 836], { size: 36 });
      s += caption("1 · Sáng nào Coal cũng ngủ nướng…");
      return frame(1, "#e6edfb", s);
    },
    2() {
      let s = floor(900);
      s += spark(880, 330, 26, EMBER2, 0.2) + spark(180, 360, 18, EMBER2, 0.7);
      s += hero(340, coal({ mood: "focus", armL: "hold", armR: "hold", glasses: true, prop: "book", uid: "p2", glow: 0.8 }));
      s += bubble(720, 330, ["Hôm nay có mục tiêu:", "IELTS 7.0!", "Bắt đầu với Nghe chép."], [500, 600], { size: 34 });
      s += caption("2 · …nhưng hôm nay Coal quyết tâm!");
      return frame(2, "#ffefdc", s);
    },
    3() {
      let s = floor(900);
      s += `<g class="c-wave-sound" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"><path d="M705 330Q745 380 705 430"/><path d="M745 300Q805 380 745 460"/><path d="M785 270Q865 380 785 490"/></g>`;
      s += hero(330, coal({ mood: "worried", armL: "up", armR: "hips", headphones: true, uid: "p3", look: [1, -0.4] }));
      s += bubble(790, 190, ["…the library opens at eight", "o'clock and closes at ten…"], [650, 300], { size: 31, italic: true });
      s += `<g font-family="${FONT}" font-weight="800" fill="${INK}"><text x="640" y="640" font-size="86" transform="rotate(-8 640 640)">?</text><text x="740" y="720" font-size="120" transform="rotate(6 740 720)">?</text><text x="860" y="650" font-size="74" transform="rotate(14 860 650)">?</text></g>`;
      s += caption("3 · Nhưng người ta đọc nhanh quá…");
      return frame(3, "#e8eefc", s);
    },
    4() {
      let s = floor(900);
      s += cloud(300, 235, 1.35);
      s += `<g class="c-rain" stroke="#6b8cff" stroke-width="6" stroke-linecap="round"><line x1="220" y1="290" x2="212" y2="312"/><line x1="270" y1="296" x2="262" y2="318"/><line x1="320" y1="290" x2="312" y2="312"/><line x1="370" y1="296" x2="362" y2="318"/><line x1="420" y1="290" x2="412" y2="312"/></g>`;
      s += hero(330, coal({ mood: "sad", armL: "down", armR: "down", headphones: true, uid: "p4", look: [0, 1] }));
      s += `<g transform="translate(770 760) rotate(-5)"><rect x="-150" y="-110" width="300" height="190" rx="22" fill="#fff" stroke="${INK}" stroke-width="6"/><text y="-30" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="30" fill="${INK}">Chính xác</text><text y="50" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="84" fill="#c0281c">45%</text></g>`;
      s += bubble(760, 520, ["Mình nghe", "không kịp…"], [700, 640], { size: 34 });
      s += caption("4 · Điểm thấp. Lửa của Coal le lói.");
      return frame(4, "#dde3f0", s);
    },
    5() {
      let s = floor(900);
      s += `<g transform="translate(790 300)"><rect x="-150" y="-62" width="300" height="124" rx="26" fill="#fff" stroke="${INK}" stroke-width="5"/><text x="0" y="-22" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="24" fill="${INK}" opacity=".7">Tốc độ đọc</text><g font-family="${FONT}" font-weight="800" font-size="32" text-anchor="middle"><rect x="-130" y="-4" width="76" height="46" rx="14" fill="none" stroke="${INK}" stroke-width="3" opacity=".5"/><text x="-92" y="30" fill="${INK}" opacity=".55">0.5×</text><rect x="-44" y="-8" width="92" height="54" rx="16" fill="${EMBER2}" stroke="${INK}" stroke-width="5"/><text x="2" y="30" fill="${INK}">0.75×</text><rect x="58" y="-4" width="72" height="46" rx="14" fill="none" stroke="${INK}" stroke-width="3" opacity=".5"/><text x="94" y="30" fill="${INK}" opacity=".55">1×</text></g></g>`;
      s += hero(330, coal({ mood: "focus", armL: "hips", armR: "up", headphones: true, prop: "pencil", uid: "p5", glow: 0.85 }));
      s += spark(560, 360, 22, EMBER2, 0) + spark(120, 420, 16, EMBER, 0.5) + spark(520, 600, 14, EMBER2, 0.9);
      s += bubble(790, 560, ["Chậm lại một chút!", "Nghe từng cụm."], [640, 690], { size: 33 });
      s += caption("5 · Chậm lại. Nghe từng cụm. Thử lại!");
      return frame(5, "#fff0dc", s);
    },
    6() {
      let s = floor(900);
      const colors = [EMBER, EMBER2, "#6b8cff", "#ff9fb3", "#4ccfa6"];
      for (let i = 0; i < 16; i++) {
        s += `<rect class="c-fall" style="animation-delay:${(i * 0.37).toFixed(2)}s" x="${70 + i * 62}" y="140" width="16" height="26" rx="3" fill="${colors[i % 5]}" stroke="${INK}" stroke-width="2.5"/>`;
      }
      s += `<g transform="translate(270 230)"><path d="M0 -82L58 -52L0 8L-58 -52Z" fill="#bfe9ff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M-58 -52H58M-20 -52L0 -82L20 -52L0 8Z" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/></g>`;
      s += spark(190, 170, 20, "#fff", 0.1) + spark(350, 150, 14, "#fff", 0.6);
      s += `<g transform="translate(820 280) rotate(8)"><circle r="104" fill="${EMBER2}" stroke="${INK}" stroke-width="7"/><circle r="84" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round"/><text y="22" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="62" fill="${INK}">100%</text></g>`;
      s += hero(400, coal({ mood: "joy", armL: "cheer", armR: "cheer", uid: "p6" }));
      s += bubble(790, 600, ["Áp lực + kiên trì", "= kim cương!"], [640, 730], { size: 36 });
      s += caption("6 · 100%! Than cũng thành kim cương.");
      return frame(6, "#fff1c9", s);
    },
  };

  const api = { coal, blob, rng, MOODS, ARMS, CSS, INK, CREAM, panel: (n) => PANELS[n](), panelCount: 6 };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Coal = api;
})(typeof window !== "undefined" ? window : globalThis);
