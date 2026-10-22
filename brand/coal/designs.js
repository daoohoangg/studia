/**
 * Coal — 12 phong cách hoạt hình cho linh vật của Studia.
 * Nét đơn giản, mảng phẳng (không gradient, theo DESIGN.md), có tay chân. Màu lấy từ token của web:
 * ink #0e1630 · brand #2344c9 · navy #0f1f4d · accent #f2611f · marker #ffe27a · canvas #f8f6f2.
 *
 *   CoalDesigns.list     -> [{ id, name, note, bg, draw }]
 *   CoalDesigns.card(i)  -> <svg> 400x470 của một kiểu
 *   CoalDesigns.sheet()  -> <svg> tổng hợp 12 kiểu (4 cột x 3 hàng)
 */
(function (root) {
  "use strict";
  const INK = "#0e1630", BRAND = "#2344c9", NAVY = "#0f1f4d", ACC = "#f2611f", MARK = "#ffe27a", CANVAS = "#f8f6f2";
  const PINK = "#ff9fb3", GOLD = "#ffc247";
  const FONT_UI = "'Be Vietnam Pro','Segoe UI',Arial,sans-serif";
  const FONT_DISPLAY = "'Bricolage Grotesque','Be Vietnam Pro','Segoe UI',Arial,sans-serif";

  /* ---------- Thân: khối than đơn giản (8 đỉnh, góc bo tròn) ---------- */
  const OUT = [[48, 58], [98, 42], [150, 52], [162, 100], [152, 148], [100, 160], [52, 146], [40, 100]];
  const TOPF = [OUT[0], OUT[1], OUT[2], [132, 74], [70, 76]];
  const SHADEF = [OUT[3], OUT[4], OUT[5], [118, 132], [138, 104]];
  const P = (a) => a.map((q) => q.join(",")).join(" ");
  const mx = (x) => 202 - x;

  /* Tay: điểm vai (s), điểm cong (c), bàn tay (e) cho tay trái; tay phải lật gương qua x=101 */
  const POSES = {
    down: { s: [44, 112], c: [26, 130], e: [32, 156] },
    wave: { s: [44, 110], c: [20, 96], e: [26, 64] },
    up: { s: [44, 108], c: [22, 84], e: [34, 50] },
    cheer: { s: [44, 106], c: [16, 84], e: [26, 40] },
    hip: { s: [44, 114], c: [22, 128], e: [48, 142] },
    hold: { s: [46, 118], c: [40, 160], e: [67, 164] },
    ear: { s: [44, 112], c: [22, 108], e: [38, 90] },
    mic: { s: [46, 118], c: [52, 146], e: [84, 136] },
  };

  const star = (x, y, r, c) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${c}"/>`;
  const flame = (x, y, s, line) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 4C-12 -2 -12 -16 0 -28C0 -16 12 -14 12 -4C12 1 7 4 0 4Z" fill="${ACC}" ${line ? `stroke="${line}" stroke-width="3" stroke-linejoin="round"` : ""}/><path d="M0 2C-5 -1 -5 -8 0 -13C3 -8 6 -6 4 -1C3 1 2 2 0 2Z" fill="${GOLD}"/></g>`;

  function arm(side, pose, o) {
    const p = POSES[pose], m = side === "R", X = (x) => (m ? mx(x) : x);
    const d = `M${X(p.s[0])} ${p.s[1]}Q${X(p.c[0])} ${p.c[1]} ${X(p.e[0])} ${p.e[1]}`;
    const hx = X(p.e[0]), hy = p.e[1];
    let s = "";
    if (o.line) s += `<path d="${d}" stroke="${o.line}" stroke-width="${o.limbW + o.lw * 2}" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${d}" stroke="${o.limb}" stroke-width="${o.limbW}" fill="none" stroke-linecap="round"/>`;
    if (o.line) s += `<circle cx="${hx}" cy="${hy}" r="${o.handR + o.lw * 0.7}" fill="${o.line}"/>`;
    s += `<circle cx="${hx}" cy="${hy}" r="${o.handR}" fill="${o.hand}"/>`;
    return pose === "wave" || pose === "cheer" ? `<g class="d-wave" style="transform-origin:${X(p.s[0])}px ${p.s[1]}px">${s}</g>` : s;
  }

  function eyes(o) {
    const ink = o.eyeInk || INK;
    const glint = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`;
    switch (o.eye) {
      case "big":
        return `<g class="d-eyes"><circle cx="86" cy="100" r="10" fill="#fff" ${o.line ? `stroke="${o.line}" stroke-width="2.6"` : ""}/><circle cx="116" cy="100" r="10" fill="#fff" ${o.line ? `stroke="${o.line}" stroke-width="2.6"` : ""}/><circle cx="88" cy="101.5" r="5.4" fill="${ink}"/><circle cx="118" cy="101.5" r="5.4" fill="${ink}"/>${glint(89.8, 99.4, 1.8)}${glint(119.8, 99.4, 1.8)}</g>`;
      case "happy":
        return `<g class="d-eyes"><path d="M75 104Q86 90 97 104M105 104Q116 90 127 104" stroke="${ink}" stroke-width="4.2" fill="none" stroke-linecap="round"/></g>`;
      case "sleep":
        return `<g class="d-eyes"><path d="M76 99Q86 109 96 99M106 99Q116 109 126 99" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
      case "shades":
        return `<rect x="72" y="90" width="29" height="19" rx="8" fill="${INK}"/><rect x="101" y="90" width="29" height="19" rx="8" fill="${INK}"/><path d="M100 96H102" stroke="${INK}" stroke-width="3"/><path d="M78 95L86 95M107 95L115 95" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".7"/>`;
      default:
        return `<g class="d-eyes"><circle cx="86" cy="100" r="6.8" fill="${ink}"/><circle cx="116" cy="100" r="6.8" fill="${ink}"/>${glint(88, 97.6, 2.2)}${glint(118, 97.6, 2.2)}</g>`;
    }
  }

  function mouth(o) {
    const c = o.mouthInk || INK;
    switch (o.mouth) {
      case "open": return `<path d="M91 115Q101 136 111 115Z" fill="${c}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M95 124Q101 120 107 124Q101 130 95 124Z" fill="${ACC}"/>`;
      case "grin": return `<path d="M87 114Q101 136 115 114Z" fill="${c}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M91 114H111" stroke="#fff" stroke-width="3.4"/>`;
      case "o": return `<ellipse cx="101" cy="121" rx="5" ry="6.2" fill="${c}"/>`;
      case "cat": return `<path d="M92 117Q96.5 124 101 117Q105.5 124 110 117" stroke="${c}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      case "smirk": return `<path d="M92 120Q103 126 113 116" stroke="${c}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
      default: return `<path d="M92 117Q101 126 110 117" stroke="${c}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
    }
  }

  /** Một nhân vật hoàn chỉnh: bóng, chân, thân, tay, mặt và phụ kiện. */
  function fig(o) {
    o = Object.assign({
      main: "#7d7790", top: "#9a94ab", shade: "#625c72", line: null, lw: 3.6, limb: null, limbW: 6.8, hand: "#fff", handR: 7.4,
      shoe: INK, eye: "dot", mouth: "smile", cheek: PINK, cheekOp: 0.85, arms: ["down", "down"], under: "", over: "", flame: 1,
      chibi: false, hardShadow: null, shadowOp: 0.12,
    }, o);
    const limb = o.limb || o.main;
    const line = o.line, lw = o.lw;
    const legEnd = o.chibi ? 168 : 174;
    let s = `<ellipse cx="101" cy="186" rx="50" ry="6" fill="${INK}" opacity="${o.shadowOp}"/>`;

    // chân + giày
    for (const x of [86, 116]) {
      const d = `M${x} 156V${legEnd}`;
      if (line) s += `<path d="${d}" stroke="${line}" stroke-width="${o.limbW + lw * 2}" stroke-linecap="round"/>`;
      s += `<path d="${d}" stroke="${limb}" stroke-width="${o.limbW}" stroke-linecap="round"/>`;
    }
    for (const x of [82, 120]) {
      s += `<ellipse cx="${x}" cy="${legEnd + 5}" rx="12" ry="6.8" fill="${o.shoe}" ${line ? `stroke="${line}" stroke-width="${lw}"` : ""}/>`;
    }

    // phần thân trên (co giãn nhẹ khi chibi)
    let up = "";
    if (o.hardShadow) up += `<polygon points="${P(OUT)}" transform="translate(7 8)" fill="${o.hardShadow}" stroke="${o.hardShadow}" stroke-width="12" stroke-linejoin="round"/>`;
    if (line) up += `<polygon points="${P(OUT)}" fill="${line}" stroke="${line}" stroke-width="${12 + lw * 2}" stroke-linejoin="round"/>`;
    up += `<polygon points="${P(OUT)}" fill="${o.main}" stroke="${o.main}" stroke-width="12" stroke-linejoin="round"/>`;
    up += `<polygon points="${P(TOPF)}" fill="${o.top}" stroke="${o.top}" stroke-width="8" stroke-linejoin="round"/>`;
    up += `<polygon points="${P(SHADEF)}" fill="${o.shade}" stroke="${o.shade}" stroke-width="8" stroke-linejoin="round"/>`;
    up += `<path d="M62 62L88 54" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>`;
    up += o.under;
    up += arm("L", o.arms[0], { ...o, limb }) + arm("R", o.arms[1], { ...o, limb });
    up += eyes(o);
    up += `<ellipse cx="74" cy="115" rx="8" ry="5" fill="${o.cheek}" opacity="${o.cheekOp}"/><ellipse cx="128" cy="115" rx="8" ry="5" fill="${o.cheek}" opacity="${o.cheekOp}"/>`;
    up += mouth(o);
    if (o.flame) up += flame(106, 48, o.flame, line && lw < 5 ? line : null);
    up += o.over;
    s += o.chibi ? `<g transform="translate(101 160) scale(1.13) translate(-101 -160)">${up}</g>` : up;
    return `<g class="d-bob">${s}</g>`;
  }

  /* ---------- Phụ kiện ---------- */
  const headphones = (c) => `<g fill="none" stroke="${c}" stroke-linecap="round"><path d="M47 96Q42 36 101 38Q160 36 155 96" stroke-width="6.5"/></g><rect x="35" y="86" width="15" height="30" rx="7" fill="${c}"/><rect x="152" y="86" width="15" height="30" rx="7" fill="${c}"/>`;
  const glasses = `<g fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"><circle cx="86" cy="100" r="15"/><circle cx="116" cy="100" r="15"/><path d="M99 97Q101 94 103 97M71 96L60 92M131 96L142 92"/></g>`;
  const book = `<g transform="rotate(-3 101 150)"><rect x="62" y="128" width="78" height="44" rx="5" fill="${BRAND}" stroke="${INK}" stroke-width="3"/><path d="M101 128V172" stroke="${INK}" stroke-width="2.6"/><text x="81" y="155" text-anchor="middle" font-family="${FONT_UI}" font-weight="800" font-size="12" fill="#fff">IELTS</text><rect x="108" y="140" width="22" height="3.4" rx="1.7" fill="#fff" opacity=".75"/><rect x="108" y="148" width="15" height="3.4" rx="1.7" fill="#fff" opacity=".75"/></g>`;
  const pencil = `<g transform="translate(168 50) rotate(16)" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"><rect x="-5" y="-40" width="10" height="42" fill="${MARK}"/><path d="M-5 2L0 15L5 2Z" fill="#f3d9b1"/><path d="M-1.6 11.2L0 15L1.6 11.2Z" fill="${INK}"/><rect x="-5" y="-48" width="10" height="8" fill="${PINK}"/></g>`;
  const mic = `<g><path d="M168 50L174 30" stroke="${INK}" stroke-width="5.4" stroke-linecap="round"/><circle cx="177" cy="21" r="10" fill="#e4e0ee" stroke="${INK}" stroke-width="3"/><path d="M169 24Q177 32 185 24" stroke="${ACC}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
  const flashcard = `<g transform="translate(170 30) rotate(9)"><rect x="-27" y="-19" width="54" height="38" rx="6" fill="#fff" stroke="${INK}" stroke-width="3"/><text y="6" text-anchor="middle" font-family="${FONT_DISPLAY}" font-weight="800" font-size="19" fill="${BRAND}">abc</text><rect x="-14" y="10" width="28" height="3.6" rx="1.8" fill="${MARK}"/></g>`;
  const mortarboard = `<g transform="rotate(-4 101 44)"><path d="M76 46V62Q101 72 126 62V46Z" fill="${NAVY}"/><path d="M101 24L152 40L101 56L50 40Z" fill="${NAVY}" stroke="${NAVY}" stroke-width="4" stroke-linejoin="round"/><path d="M101 36L136 40" stroke="#fff" stroke-width="2" opacity=".25"/><path d="M148 42L152 66" stroke="${ACC}" stroke-width="3" stroke-linecap="round"/><circle cx="152" cy="68" r="4.4" fill="${ACC}"/></g>`;
  const nightcap = `<path d="M50 64Q60 24 122 26Q166 32 172 90Q146 52 50 64Z" fill="${BRAND}"/><path d="M52 66Q104 54 150 62" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/><circle cx="172" cy="92" r="8.5" fill="#fff"/>`;
  const note = (x, y, c) => `<g fill="${c}" stroke="${c}"><circle cx="${x}" cy="${y}" r="5" stroke="none"/><path d="M${x + 4.4} ${y}V${y - 24}l11 4" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;

  /* ---------- 12 kiểu ---------- */
  const styles = [
    // 1 · Viền mực cổ điển
    () => fig({ line: INK, lw: 4, main: "#6b6578", top: "#8b8599", shade: "#544e61", shoe: ACC, eye: "big", mouth: "open", arms: ["down", "wave"], flame: 1, hand: "#fff" }),
    // 2 · Phẳng không viền
    () => fig({ main: "#8a8499", top: "#a7a1b6", shade: "#6f6980", limb: "#6f6980", hand: "#a7a1b6", shoe: "#4a4558", eye: "dot", mouth: "smile", arms: ["hip", "hip"], flame: 0.95 }),
    // 3 · Xanh Studia (tai nghe nghe chép)
    () => fig({ main: "#46528a", top: "#5f6cab", shade: "#353f6e", limb: "#46528a", hand: "#fff", shoe: BRAND, eye: "dot", eyeInk: "#fff", mouthInk: "#fff", mouth: "smile", cheek: "#ffb3c8", arms: ["ear", "down"], flame: 0, over: headphones(ACC) }),
    // 4 · Tia lửa cam (streak)
    () => fig({ main: "#6b6578", top: "#8b8599", shade: "#544e61", limb: "#544e61", hand: ACC, shoe: ACC, eye: "happy", mouth: "grin", cheek: "#ff9a5c", arms: ["cheer", "cheer"], flame: 0, over: flame(101, 52, 1.75) + star(40, 30, 8, GOLD) + star(166, 24, 6, ACC) }),
    // 5 · Mọt sách
    () => fig({ line: INK, lw: 3.2, main: "#7d7790", top: "#9a94ab", shade: "#625c72", shoe: BRAND, eye: "dot", mouth: "smile", arms: ["hold", "hold"], flame: 0.9, under: book, over: glasses }),
    // 6 · Nét vẽ tay (sĩ tử, bút chì)
    () => `<g filter="url(#d6w)"><defs><filter id="d6w" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.6"/></filter></defs>${fig({ line: INK, lw: 3.4, main: "#7d7790", top: "#9a94ab", shade: "#625c72", shoe: "#fff", eye: "big", mouth: "smile", arms: ["down", "up"], flame: 0, under: pencil, over: mortarboard })}</g>`,
    // 7 · Luyện nói (micro)
    () => fig({ main: "#7d7790", top: "#9a94ab", shade: "#625c72", limb: "#625c72", hand: "#fff", shoe: "#2a2540", eye: "big", mouth: "open", arms: ["hip", "up"], flame: 0.9, under: mic, over: note(24, 62, ACC) + note(14, 104, BRAND) }),
    // 8 · Thẻ từ vựng
    () => fig({ line: INK, lw: 3.6, main: "#8a8499", top: "#a7a1b6", shade: "#6f6980", shoe: ACC, eye: "dot", mouth: "smile", arms: ["down", "up"], flame: 1, under: flashcard }),
    // 9 · Cú đêm (ngủ gật)
    () => fig({ main: "#6a6483", top: "#8680a2", shade: "#544f6c", limb: "#544f6c", hand: "#c9c3e0", shoe: "#3d3858", eye: "sleep", eyeInk: "#fdf9ef", mouthInk: "#fdf9ef", mouth: "o", cheek: "#ff9fb3", cheekOp: 0.6, arms: ["down", "down"], flame: 0, shadowOp: 0.35, over: nightcap + `<g font-family="${FONT_DISPLAY}" font-weight="800" fill="#fdf9ef"><text x="150" y="66" font-size="24">Z</text><text x="166" y="44" font-size="18">z</text><text x="178" y="28" font-size="13">z</text></g>` + `<path d="M26 40a14 14 0 1 0 14 18a11 11 0 1 1 -14 -18Z" fill="${MARK}"/>` }),
    // 10 · Ngầu kiểu pop-art
    () => fig({ line: INK, lw: 3.8, hardShadow: BRAND, main: "#6b6578", top: "#8b8599", shade: "#544e61", shoe: ACC, eye: "shades", mouth: "smirk", arms: ["hip", "hip"], flame: 1, hand: MARK }),
    // 11 · Nhãn dán
    () => `<g filter="url(#d11s)"><defs><filter id="d11s" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="3" dy="5" stdDeviation="0" flood-color="${INK}" flood-opacity=".22"/></filter></defs>${fig({ line: "#fff", lw: 9, main: "#6b6578", top: "#8b8599", shade: "#544e61", shoe: ACC, eye: "big", mouth: "grin", arms: ["down", "wave"], flame: 1, shadowOp: 0 })}</g>${star(176, 36, 9, MARK)}${star(26, 70, 6, ACC)}`,
    // 12 · Chibi mini
    () => fig({ chibi: true, main: "#9b95ad", top: "#b4aec4", shade: "#807a94", limb: "#807a94", limbW: 6, hand: "#fff", handR: 7, shoe: PINK, eye: "big", mouth: "cat", cheek: PINK, cheekOp: 0.95, arms: ["wave", "wave"], flame: 0.8 }),
  ];

  const list = [
    { id: "classic", name: "Viền mực cổ điển", note: "Nét mực dày, găng tay trắng, vẫy chào", bg: "#f1eee8", draw: styles[0] },
    { id: "flat", name: "Phẳng không viền", note: "Mảng màu phẳng, chống nạnh, dễ làm icon", bg: "#e9eefd", draw: styles[1] },
    { id: "studia", name: "Xanh Studia", note: "Tông xanh brand, tai nghe cam: nghe chép", bg: "#dce5ff", draw: styles[2] },
    { id: "streak", name: "Tia lửa cam", note: "Ngọn lửa lớn, hai tay giơ cao: giữ streak", bg: "#ffede3", draw: styles[3] },
    { id: "reader", name: "Mọt sách", note: "Kính tròn, sách IELTS, nét mực mảnh", bg: "#fff3d6", draw: styles[4] },
    { id: "sketch", name: "Nét vẽ tay", note: "Mép run nhẹ, mũ cử nhân, cầm bút chì", bg: "#e1f4ec", draw: styles[5] },
    { id: "speaking", name: "Luyện nói", note: "Cầm micro, há miệng hát, nốt nhạc", bg: "#f9e3f0", draw: styles[6] },
    { id: "cards", name: "Thẻ từ vựng", note: "Giơ thẻ abc, viền mực, giày cam", bg: "#fde8e6", draw: styles[7] },
    { id: "night", name: "Cú đêm", note: "Mũ ngủ, trăng và Zzz: nhắc nghỉ ngơi", bg: NAVY, draw: styles[8], dark: true },
    { id: "pop", name: "Ngầu kiểu pop-art", note: "Kính râm, đổ bóng đặc màu brand", bg: "#fff0a8", draw: styles[9] },
    { id: "sticker", name: "Nhãn dán", note: "Viền trắng dày, bóng đặc, vẫy tay", bg: "#e4f1f7", draw: styles[10] },
    { id: "chibi", name: "Chibi mini", note: "Đầu to thân nhỏ, hai tay vẫy, miệng mèo", bg: "#e9f5e1", draw: styles[11] },
  ];

  const CSS = `.d-bob{animation:d-bob 2.8s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
@keyframes d-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.d-eyes{animation:d-blink 4.6s infinite;transform-box:fill-box;transform-origin:50% 50%}
@keyframes d-blink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
.d-wave{animation:d-wave .9s ease-in-out infinite}
@keyframes d-wave{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(8deg)}}
@media (prefers-reduced-motion:reduce){.d-bob,.d-eyes,.d-wave{animation:none!important}}`;

  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  /** Nội dung một thẻ (không có thẻ <svg> ngoài) để ghép vào bảng tổng hợp. */
  function cardBody(i) {
    const d = list[i];
    const ink = d.dark ? "#f8f6f2" : INK;
    return `<rect width="400" height="470" rx="28" fill="${d.bg}"/>
<g transform="translate(40 14) scale(1.6)">${d.draw()}</g>
<g transform="translate(24 392)"><rect width="46" height="30" rx="15" fill="${d.dark ? "#f8f6f2" : NAVY}"/><text x="23" y="21" text-anchor="middle" font-family="${FONT_UI}" font-weight="800" font-size="16" fill="${d.dark ? NAVY : "#f8f6f2"}">${String(i + 1).padStart(2, "0")}</text>
<text x="60" y="23" font-family="${FONT_DISPLAY}" font-weight="800" font-size="26" fill="${ink}" letter-spacing="-.4">${esc(d.name)}</text>
<text x="0" y="56" font-family="${FONT_UI}" font-weight="400" font-size="16" fill="${ink}" opacity=".74">${esc(d.note)}</text></g>`;
  }

  const card = (i) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 470" width="400" height="470" role="img" aria-label="Coal, kiểu ${i + 1}: ${esc(list[i].name)}"><style>${CSS}</style>${cardBody(i)}</svg>`;

  function sheet() {
    const W = 1768, H = 1668;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Coal, 12 phong cách"><style>${CSS}</style><rect width="${W}" height="${H}" fill="${CANVAS}"/>
<text x="48" y="80" font-family="${FONT_DISPLAY}" font-weight="800" font-size="54" fill="${INK}" letter-spacing="-1.5">Coal · 12 phong cách</text>
<text x="48" y="118" font-family="${FONT_UI}" font-weight="400" font-size="22" fill="${INK}" opacity=".66">Linh vật của Studia: nét đơn giản, có tay chân, đúng bảng màu của web</text>`;
    list.forEach((_, i) => { s += `<g transform="translate(${48 + (i % 4) * 424} ${156 + Math.floor(i / 4) * 494})">${cardBody(i)}</g>`; });
    return s + `</svg>`;
  }

  const api = { list, card, sheet, CSS, cardBody, fig };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CoalDesigns = api;
})(typeof window !== "undefined" ? window : globalThis);
