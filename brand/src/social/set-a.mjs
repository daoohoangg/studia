// Bộ A — "Học thuật tối giản": 50 bài 1080 × 1350, xen kẽ nền mực đêm / giấy ngà.
// Nội dung: từ vựng, nâng cấp từ, lỗi sai, mẹo, con số đề thi, câu đố, tính năng, trích dẫn, lời mời.
import { C, doc, lockup, icon, esc } from "./common.mjs";

export const SET = { dir: "a-hoc-thuat", title: "Bộ A — Học thuật tối giản" };

// *từ* → tô dạ quang (nền sáng) hoặc gạch chân cam (nền tối)
const hl = (s) => esc(s).replace(/\*(.+?)\*/g, "<mark>$1</mark>");

const CSS = `
body{--bg:${C.paper};--fg:${C.ink};--sub:${C.ink2};--mut:${C.muted};--line:${C.hair};--card:#fff;--cardfg:${C.ink};--cardline:${C.hair};--strong:${C.blue};
  background:var(--bg);color:var(--fg);font-family:'Be Vietnam Pro',sans-serif}
body.dark{--bg:${C.ink};--fg:${C.paper};--sub:rgba(248,246,242,.74);--mut:rgba(248,246,242,.52);--line:rgba(248,246,242,.14);--card:${C.paper};--cardfg:${C.ink};--cardline:${C.hair};--strong:#9DB2FF}
mark{background:${C.marker};color:inherit;padding:0 .12em;border-radius:4px}
body.dark mark{background:none;color:inherit;text-decoration:underline;text-decoration-color:${C.ember};text-decoration-thickness:4px;text-underline-offset:6px}
.eyebrow{font-size:17px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--mut)}
.post{position:absolute;inset:0;padding:88px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:center}
h1{font-family:'Bricolage Grotesque',sans-serif;font-size:88px;line-height:1;font-weight:600;letter-spacing:-.025em;margin-top:56px}
h1.sm{font-size:72px}
.sub{font-family:'Literata',serif;font-size:28px;line-height:1.5;color:var(--sub);margin-top:26px;max-width:860px}
.vis{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;margin:40px 0}
.foot{padding-top:28px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}
.foot .eyebrow{font-size:15px}
.card{background:var(--card);color:var(--cardfg);border:1px solid var(--cardline);border-radius:28px}
body.dark .card{border-color:transparent}
.ember{color:${C.ember}}

/* Từ vựng */
.word{font-family:'Bricolage Grotesque',sans-serif;font-weight:650;letter-spacing:-.035em;line-height:.95}
.ipa{font-family:'Literata',serif;font-size:38px;color:var(--sub);margin-top:22px}
.rule{height:1px;background:var(--line);margin:44px 0}
.vi{font-size:58px;font-weight:600;line-height:1.2}
.ex{font-family:'Literata',serif;font-style:italic;font-size:38px;line-height:1.5;color:var(--sub);margin-top:22px}
.chips{display:flex;gap:14px;flex-wrap:wrap;margin-top:40px}
.chip{border:1.5px solid var(--line);border-radius:999px;padding:14px 28px;font-size:27px;font-weight:500;color:var(--sub)}
.chip b{color:var(--fg);font-weight:600}
.ask{font-size:27px;color:var(--mut);margin-top:auto}

/* Nâng cấp từ */
.lab{font-size:20px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--mut)}
.old{font-family:'Bricolage Grotesque',sans-serif;font-size:96px;font-weight:500;letter-spacing:-.03em;color:var(--mut);text-decoration:line-through;text-decoration-thickness:5px;margin-top:10px}
.new{font-family:'Bricolage Grotesque',sans-serif;font-size:92px;font-weight:650;letter-spacing:-.03em;line-height:1.05;color:var(--strong);margin-top:10px}
.new span{display:block}
.arrowline{margin:34px 0 30px}

/* Lỗi sai */
.row{display:flex;gap:26px;align-items:flex-start;border-radius:24px;padding:34px 38px;margin-top:22px}
.row .tag{flex:none;width:56px;height:56px;border-radius:50%;display:grid;place-items:center}
.row .t{font-family:'Literata',serif;font-size:40px;line-height:1.35}
.row small{display:block;font-family:'Be Vietnam Pro',sans-serif;font-size:19px;font-weight:650;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px}
.bad{background:${C.dangerTint};color:${C.ink}} .bad .tag{background:${C.danger}} .bad small{color:${C.danger}} .bad .t{text-decoration:line-through;text-decoration-color:rgba(192,40,28,.55);text-decoration-thickness:3px}
.good{background:${C.successTint};color:${C.ink}} .good .tag{background:${C.success}} .good small{color:${C.success}}
.why{font-family:'Literata',serif;font-size:29px;line-height:1.55;color:var(--sub);margin-top:40px}

/* Mẹo */
.tips{display:flex;flex-direction:column;gap:0}
.tip{display:flex;gap:34px;padding:28px 0;border-top:1px solid var(--line)}
.tip:last-child{border-bottom:1px solid var(--line)}
.tip .n{font-family:'Bricolage Grotesque',sans-serif;font-size:46px;font-weight:600;color:var(--strong);width:70px;flex:none;line-height:1.1}
.tip b{display:block;font-size:33px;font-weight:650;line-height:1.25}
.tip p{font-size:25px;line-height:1.5;color:var(--sub);margin-top:8px}

/* Con số */
.big{font-family:'Bricolage Grotesque',sans-serif;font-size:330px;font-weight:650;letter-spacing:-.05em;line-height:.85}
.big small{font-size:72px;letter-spacing:-.02em;font-weight:500;margin-left:18px;color:var(--sub)}
.stat-h{font-size:40px;font-weight:600;line-height:1.3;margin-top:38px}
.kv{margin-top:34px}
.kv div{display:flex;justify-content:space-between;gap:30px;padding:20px 0;border-top:1px solid var(--line);font-size:27px}
.kv div:last-child{border-bottom:1px solid var(--line)}
.kv span{color:var(--sub)} .kv b{font-weight:600;text-align:right}

/* Câu đố */
.q{font-family:'Literata',serif;font-size:56px;line-height:1.45}
.blank{display:inline-block;width:190px;height:.8em;border-bottom:5px solid ${C.ember};margin:0 10px}
.opts{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:56px}
.opt{display:flex;align-items:center;gap:22px;padding:26px 28px;border:1.5px solid var(--line);border-radius:22px;font-size:34px;font-weight:550}
.opt .k{flex:none;width:52px;height:52px;border-radius:14px;background:var(--fg);color:var(--bg);display:grid;place-items:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:26px}

/* Trích dẫn */
.quote{font-family:'Literata',serif;font-size:76px;line-height:1.28;letter-spacing:-.01em;font-weight:400}
.quote .qm{font-family:'Bricolage Grotesque',sans-serif;font-size:220px;line-height:.6;color:${C.ember};display:block;height:110px}
.by{margin-top:50px}

/* Lời mời */
.list{margin-top:44px;display:flex;flex-direction:column;gap:22px}
.li{display:flex;gap:22px;align-items:center;font-size:34px;font-weight:500}
.li .c{width:52px;height:52px;border-radius:50%;background:var(--strong);display:grid;place-items:center;flex:none}
.btn{align-self:flex-start;margin-top:56px;background:${C.ember};color:${C.ink};font-size:34px;font-weight:700;border-radius:999px;padding:28px 52px;display:flex;gap:18px;align-items:center}

/* Mô phỏng màn hình */
.ui{padding:40px 44px}
.ui .h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:26px}
.ui .h b{font-size:30px;font-weight:650} .ui .h span{font-size:22px;color:${C.muted}}
.task{display:flex;gap:22px;align-items:center;padding:22px 0;border-top:1px solid ${C.hair};font-size:26px}
.task .bx{width:40px;height:40px;border-radius:12px;border:2.5px solid #80869E;flex:none;display:grid;place-items:center}
.task.done .bx{background:${C.blue};border-color:${C.blue}}
.task.done span{color:${C.muted};text-decoration:line-through}
.task em{margin-left:auto;font-style:normal;font-size:21px;color:${C.muted}}
.bar{height:14px;border-radius:99px;background:${C.blueTint};margin-top:26px;overflow:hidden}.bar i{display:block;height:100%;background:${C.blue};border-radius:99px}
.flow{display:flex;align-items:center;gap:28px}
.file{width:250px;height:320px;border-radius:22px;background:#fff;border:1px solid ${C.hair};position:relative;padding:32px;color:${C.ink};flex:none}
.file:after{content:"";position:absolute;right:0;top:0;width:70px;height:70px;background:${C.blueTint};border-bottom-left-radius:22px}
.file .ln{height:12px;border-radius:6px;background:${C.hair};margin-top:20px}
.file b{display:block;font-size:22px;margin-top:150px;font-weight:650}
.outs{display:flex;flex-direction:column;gap:18px;flex:1}
.out{background:#fff;color:${C.ink};border:1px solid ${C.hair};border-radius:20px;padding:24px 28px;font-size:27px;font-weight:600;display:flex;gap:16px;align-items:center}
.out .d{width:16px;height:16px;border-radius:50%;background:${C.blue};flex:none}
.fsrs{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}
.fsrs div{border:1.5px solid var(--line);border-radius:18px;padding:18px 0;text-align:center;font-size:26px;font-weight:650}
.fsrs div small{display:block;font-size:18px;font-weight:400;color:var(--mut);margin-top:4px}
.fsrs .on{background:${C.ember};border-color:${C.ember};color:${C.ink}} .fsrs .on small{color:${C.ink}}
.exam-top{display:flex;justify-content:space-between;align-items:center;padding-bottom:24px;border-bottom:1px solid ${C.hair}}
.timer{font-family:'Bricolage Grotesque',sans-serif;font-size:44px;font-weight:650;font-variant-numeric:tabular-nums}
.nav{display:grid;grid-template-columns:repeat(10,1fr);gap:10px;margin-top:28px}
.nav i{font-style:normal;height:56px;border-radius:12px;border:1.5px solid ${C.hair};display:grid;place-items:center;font-size:20px;font-weight:600;color:${C.muted}}
.nav i.a{background:${C.blue};border-color:${C.blue};color:#fff} .nav i.f{border-color:${C.ember};color:${C.emberStrong};border-width:3px} .nav i.c{border-color:${C.ink};border-width:3px;color:${C.ink}}
.legend{display:flex;gap:28px;margin-top:22px;font-size:20px;color:${C.muted}} .legend span:before{content:"";display:inline-block;width:16px;height:16px;border-radius:5px;margin-right:8px;vertical-align:-2px;background:var(--c)}
.bub{max-width:80%;padding:24px 30px;border-radius:26px;font-size:28px;line-height:1.45;margin-top:18px}
.bub.me{align-self:flex-end;background:${C.ink};color:${C.paper};border-top-right-radius:6px}
body.dark .bub.me{background:${C.blue}}
.bub.ai{align-self:flex-start;background:var(--card);color:var(--cardfg);border:1px solid var(--cardline);border-top-left-radius:6px}
.bub.ai s{color:${C.danger}} .bub.ai b{color:${C.success}}
.chat{display:flex;flex-direction:column}
.pron{align-self:flex-start;margin-top:18px;display:flex;gap:12px}
.pron span{padding:10px 20px;border-radius:999px;font-size:22px;font-weight:600;border:1.5px solid var(--line);color:var(--sub)}
.crit{display:grid;grid-template-columns:1fr auto;gap:14px 26px;align-items:center;font-size:25px}
.crit .tr{height:14px;border-radius:99px;background:${C.blueTint};overflow:hidden;grid-column:1/-1;margin-top:-6px}.crit .tr i{display:block;height:100%;background:${C.blue}}
.crit b{font-family:'Bricolage Grotesque',sans-serif;font-size:32px}
.overall{display:flex;align-items:center;gap:30px;margin-bottom:30px}
.ring{width:150px;height:150px;border-radius:50%;border:14px solid ${C.blue};display:grid;place-items:center;font-family:'Bricolage Grotesque',sans-serif;font-size:52px;font-weight:700;flex:none}
.fix{margin-top:30px;padding-top:24px;border-top:1px solid ${C.hair};font-family:'Literata',serif;font-size:25px;line-height:1.5}
.fix s{color:${C.danger}} .fix b{color:${C.success};font-weight:600}
.qopts{display:flex;flex-direction:column;gap:14px;margin-top:24px}
.qopts div{border:1.5px solid ${C.hair};border-radius:16px;padding:18px 24px;font-size:25px}
.qopts .sel{border-color:${C.blue};background:${C.blueTint};font-weight:600}
`;

const frame = ({ i, dark, topic, count, body }) => doc(CSS, `
<div class="post">
  <div class="top"><span class="eyebrow">${topic}</span><span class="eyebrow">${count}</span></div>
  ${body}
  <div class="foot">${lockup(30, dark ? C.paper : C.ink)}<span class="eyebrow">Học đúng điều cần học</span></div>
</div>`, dark ? "dark" : "");

// ── Mẫu ───────────────────────────────────────────────────────────────────
const T = {
  vocab: (d) => {
    const fs = Math.min(176, Math.round(1640 / d.word.length));
    return `<div class="vis">
      <div class="word" style="font-size:${fs}px">${d.word}</div>
      <div class="ipa">${d.ipa}&nbsp;&nbsp;·&nbsp;&nbsp;${d.pos}</div>
      <div class="rule"></div>
      <div class="vi">${d.vi}</div>
      <p class="ex">${hl(d.ex)}</p>
      <div class="chips">${d.col.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>
    </div>
    <p class="ask" style="margin-bottom:32px">Đặt một câu với “${d.word}” dưới bình luận nhé.</p>`;
  },
  swap: (d) => `<div class="vis">
      <span class="lab">Thay vì</span>
      <div class="old">${d.from}</div>
      <div class="arrowline">${icon.down(C.ember, 64)}</div>
      <span class="lab">Hãy thử</span>
      <div class="new">${d.to.map((t) => `<span>${t}</span>`).join("")}</div>
      <p class="why" style="margin-top:34px">${d.note}</p>
      <p class="ex" style="margin-top:18px">${hl(d.ex)}</p>
    </div>`,
  mistake: (d) => `<h1 class="sm">${d.title}</h1>
    <div class="vis">
      <div class="row bad"><div class="tag">${icon.cross("#fff", 30)}</div><div><small>Chưa đúng</small><div class="t">${d.wrong}</div></div></div>
      <div class="row good"><div class="tag">${icon.check("#fff", 30)}</div><div><small>Đúng</small><div class="t">${d.right}</div></div></div>
      <p class="why">${d.why}</p>
    </div>`,
  tips: (d) => `<h1 class="sm">${d.title}</h1>
    <div class="vis"><div class="tips">${d.items.map(([b, p], k) => `<div class="tip"><span class="n">${String(k + 1).padStart(2, "0")}</span><div><b>${b}</b><p>${p}</p></div></div>`).join("")}</div></div>`,
  stat: (d) => `<div class="vis">
      <div class="big">${d.num}<small>${d.unit}</small></div>
      <div class="stat-h">${d.head}</div>
      <div class="kv">${d.rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>
      <p class="why" style="margin-top:34px">${d.note}</p>
    </div>`,
  quiz: (d) => `<h1 class="sm">Chọn đáp án đúng.</h1>
    <div class="vis">
      <p class="q">${esc(d.q).replace("___", '<span class="blank"></span>')}</p>
      <div class="opts">${d.opts.map((o, k) => `<div class="opt"><span class="k">${"ABCD"[k]}</span>${o}</div>`).join("")}</div>
      <p class="ask" style="margin-top:44px">Bình luận A, B, C hoặc D. Đáp án ở bình luận ghim.</p>
    </div>`,
  feature: (d) => `<h1 class="sm">${d.head}</h1><p class="sub">${d.sub}</p><div class="vis">${d.mock}</div>`,
  quote: (d) => `<div class="vis"><p class="quote"><span class="qm">“</span>${d.text}</p><span class="eyebrow by">— ${d.by}</span></div>`,
  cta: (d, dark) => `<div class="vis">
      <h1 style="margin-top:0;font-size:96px">${d.head}</h1>
      <p class="sub">${d.sub}</p>
      <div class="list">${d.items.map((t) => `<div class="li"><span class="c">${icon.check(dark ? C.ink : "#fff", 28)}</span>${t}</div>`).join("")}</div>
      <div class="btn">${d.btn}${icon.arrow(C.ink, 34)}</div>
    </div>`,
};

// ── Mô phỏng màn hình cho bài tính năng ───────────────────────────────────
const M = {
  plan: `<div class="card ui"><div class="h"><b>Kế hoạch hôm nay</b><span>3 nhiệm vụ · 38 phút</span></div>
    <div class="task done"><span class="bx">${icon.check("#fff", 24)}</span><span>Ôn 20 flashcard đến hạn</span><em>8 phút</em></div>
    <div class="task done"><span class="bx">${icon.check("#fff", 24)}</span><span>Reading · Matching headings</span><em>20 phút</em></div>
    <div class="task"><span class="bx"></span><span>Nghe chép Section 2</span><em>10 phút</em></div>
    <div class="bar"><i style="width:66%"></i></div></div>`,
  book: `<div class="flow"><div class="file"><div class="ln"></div><div class="ln" style="width:70%"></div><div class="ln" style="width:85%"></div><b>Tai-lieu-cua-ban.pdf</b></div>
    ${icon.arrow(C.ember, 56)}
    <div class="outs"><div class="out"><span class="d"></span>Bài học chia theo ngày</div><div class="out"><span class="d"></span>Flashcard từ chính cuốn sách</div><div class="out"><span class="d"></span>Quiz: trắc nghiệm, điền từ</div><div class="out"><span class="d"></span>Sơ đồ khái niệm</div></div></div>`,
  cards: `<div class="card ui"><div class="h"><b style="font-family:'Bricolage Grotesque';font-size:64px;letter-spacing:-.03em">resilient</b><span>Thẻ 7 / 24</span></div>
    <div style="font-size:30px;font-weight:600">kiên cường, mau phục hồi</div>
    <p style="font-family:'Literata';font-style:italic;font-size:25px;color:${C.ink2};margin-top:12px">Resilient learners keep going after a bad score.</p></div>
    <div class="fsrs"><div>Quên<small>1 phút</small></div><div>Khó<small>10 phút</small></div><div class="on">Được<small>2 ngày</small></div><div>Dễ<small>5 ngày</small></div></div>`,
  exam: `<div class="card ui"><div class="exam-top"><b style="font-size:26px">Reading · Passage 2</b><span class="timer">18:42</span></div>
    <div class="nav">${Array.from({ length: 40 }, (_, k) => `<i class="${k < 17 ? "a" : k === 17 ? "c" : ""}${k === 9 || k === 14 ? " f" : ""}">${k + 1}</i>`).join("").replace(/class="a f"/g, 'class="f"')}</div>
    <div class="legend"><span style="--c:${C.blue}">Đã làm</span><span style="--c:${C.ember}">Cắm cờ</span><span style="--c:${C.hair}">Chưa làm</span></div></div>`,
  speak: `<div class="chat"><div class="bub me">The view from the mountain was very beautiful.</div>
    <div class="bub ai">Tự nhiên hơn: <s>very beautiful</s> → <b>breathtaking</b>.<br>“The view was breathtaking.”</div>
    <div class="pron"><span>Tốc độ 0.8×</span><span>1×</span><span>1.2×</span></div></div>`,
  writing: `<div class="card ui"><div class="overall"><div class="ring">6.5</div><div><b style="font-size:30px">Band ước tính</b><p style="font-size:22px;color:${C.muted};margin-top:6px">Writing Task 2 · 271 từ</p></div></div>
    <div class="crit"><span>Task Response</span><b>6.5</b><div class="tr"><i style="width:72%"></i></div><span>Coherence &amp; Cohesion</span><b>6.0</b><div class="tr"><i style="width:66%"></i></div><span>Lexical Resource</span><b>6.5</b><div class="tr"><i style="width:72%"></i></div><span>Grammatical Range &amp; Accuracy</span><b>6.0</b><div class="tr"><i style="width:66%"></i></div></div>
    <div class="fix"><s>People is</s> → <b>People are</b> increasingly dependent on cars.</div></div>`,
  placement: `<div class="card ui"><div class="h"><b>Câu 9 / 24</b><span>còn 07:31</span></div><div class="bar" style="margin:0 0 30px"><i style="width:37%"></i></div>
    <p style="font-family:'Literata';font-size:30px;line-height:1.5">The report was so ___ that nobody could disagree with it.</p>
    <div class="qopts"><div>convinced</div><div class="sel">compelling</div><div>compelled</div><div>convincingly</div></div></div>`,
};

// ── Nội dung ──────────────────────────────────────────────────────────────
const V = [
  { word: "substantial", ipa: "/səbˈstæn.ʃəl/", pos: "adjective", vi: "đáng kể, lớn", ex: "There has been a *substantial* increase in online learning.", col: ["a substantial amount", "substantial evidence"], topic: "Education" },
  { word: "prevalent", ipa: "/ˈprev.əl.ənt/", pos: "adjective", vi: "phổ biến, thịnh hành", ex: "Remote work has become *prevalent* among young professionals.", col: ["prevalent among", "increasingly prevalent"], topic: "Work" },
  { word: "exacerbate", ipa: "/ɪɡˈzæs.ə.beɪt/", pos: "verb", vi: "làm trầm trọng thêm", ex: "Traffic jams *exacerbate* air pollution in big cities.", col: ["exacerbate the problem", "further exacerbate"], topic: "Environment" },
  { word: "feasible", ipa: "/ˈfiː.zə.bəl/", pos: "adjective", vi: "khả thi", ex: "A four-day work week may not be *feasible* for every company.", col: ["economically feasible", "a feasible solution"], topic: "Work" },
  { word: "detrimental", ipa: "/ˌdet.rɪˈmen.təl/", pos: "adjective", vi: "có hại, gây tổn hại", ex: "Too much screen time can be *detrimental* to sleep.", col: ["detrimental to", "a detrimental effect"], topic: "Health" },
  { word: "inevitable", ipa: "/ɪˈnev.ɪ.tə.bəl/", pos: "adjective", vi: "không thể tránh khỏi", ex: "Some mistakes are *inevitable* when you learn a language.", col: ["an inevitable consequence", "almost inevitable"], topic: "Education" },
  { word: "compelling", ipa: "/kəmˈpel.ɪŋ/", pos: "adjective", vi: "thuyết phục, cuốn hút", ex: "She made a *compelling* argument for free public transport.", col: ["compelling evidence", "a compelling reason"], topic: "Society" },
  { word: "curb", ipa: "/kɜːb/", pos: "verb", vi: "kiềm chế, hạn chế", ex: "The city introduced new rules to *curb* plastic waste.", col: ["curb emissions", "curb spending"], topic: "Environment" },
  { word: "sustainable", ipa: "/səˈsteɪ.nə.bəl/", pos: "adjective", vi: "bền vững", ex: "Cycling is a *sustainable* way to commute.", col: ["sustainable development", "environmentally sustainable"], topic: "Environment" },
  { word: "unprecedented", ipa: "/ʌnˈpres.ɪ.den.tɪd/", pos: "adjective", vi: "chưa từng có", ex: "The city saw *unprecedented* growth in tourism last year.", col: ["on an unprecedented scale", "unprecedented levels"], topic: "Society" },
];
const S = [
  { from: "very good", to: ["outstanding", "remarkable"], note: "Khi muốn khen mạnh hơn “very good”. Một lần mỗi bài là đủ, dùng nhiều sẽ thành gượng.", ex: "The service at the hotel was *outstanding*." },
  { from: "a lot of", to: ["a substantial number of", "a great deal of"], note: "“A substantial number of” đi với danh từ đếm được; “a great deal of” đi với danh từ không đếm được.", ex: "*A substantial number of* students now study online." },
  { from: "bad", to: ["detrimental", "harmful"], note: "Trong Writing Task 2, “bad for health” nghe như văn nói. Đổi sang một tính từ chính xác hơn.", ex: "Fast food can be *detrimental* to children’s health." },
  { from: "important", to: ["crucial", "vital"], note: "“Crucial” nhấn vào tính quyết định; “vital” nhấn vào sự thiết yếu, không thể thiếu.", ex: "Sleep is *crucial* for long-term memory." },
  { from: "I think", to: ["I would argue that", "It seems to me that"], note: "Hợp với Writing Task 2 và Speaking Part 3, khi bạn đưa ra quan điểm có lập luận.", ex: "*I would argue that* public transport should be free." },
  { from: "nowadays", to: ["in recent years", "these days"], note: "Câu mở đầu bằng “Nowadays” rất phổ biến. Đổi cách mở để bài viết bớt rập khuôn.", ex: "*In recent years*, remote work has become far more common." },
];
const MI = [
  { title: "Không có “very like”.", wrong: "I very like reading books.", right: "I really like reading books.", why: "“Very” không bổ nghĩa cho động từ. Dùng “really” trước động từ, hoặc “very much” ở cuối câu: I like reading books very much." },
  { title: "Although… but…: chọn một thôi.", wrong: "Although it was raining, but we went out.", right: "Although it was raining, we went out.", why: "Tiếng Việt nói “tuy… nhưng…”, tiếng Anh chỉ cần một liên từ. Đã có “although” thì bỏ “but”." },
  { title: "“Discuss” không cần “about”.", wrong: "We discussed about the problem.", right: "We discussed the problem.", why: "“Discuss” có tân ngữ theo sau luôn. Danh từ thì khác: “a discussion about the problem”." },
  { title: "“Information” không có “s”.", wrong: "I need some informations.", right: "I need some information.", why: "Information, advice, equipment, knowledge là danh từ không đếm được. Muốn đếm, dùng “a piece of information”." },
  { title: "“People” là số nhiều.", wrong: "People is worried about pollution.", right: "People are worried about pollution.", why: "“People” đã là số nhiều nên đi với are, have, were. Số ít là “a person”." },
  { title: "Làm bài tập là “do”.", wrong: "I make my homework every evening.", right: "I do my homework every evening.", why: "“Do” đi với việc, nhiệm vụ: do homework, do research. “Make” đi với thứ được tạo ra: make a decision, make a mistake." },
];
const TI = [
  { topic: "Mẹo Reading", title: "Matching headings: đừng đọc cả đoạn.", items: [["Đọc danh sách heading trước", "Gạch từ khoá của mỗi heading, để ý những heading na ná nhau."], ["Đọc câu đầu và câu cuối đoạn", "Ý chính thường nằm ở đây. Chỉ đọc kỹ phần giữa khi còn phân vân."], ["Làm đoạn dễ trước", "Loại dần heading đã dùng, đoạn khó sẽ còn ít lựa chọn."], ["So ý, đừng so chữ", "Heading lặp đúng một từ trong đoạn chưa chắc là đáp án."]] },
  { topic: "Mẹo Listening", title: "Thắng từ trước khi audio chạy.", items: [["Đọc trước câu hỏi", "Đoán loại từ cần điền: số, tên riêng, danh từ hay động từ."], ["Chờ từ đồng nghĩa", "Đề hiếm khi đọc lại đúng chữ trong câu hỏi."], ["Cẩn thận khi người nói đổi ý", "“Actually, no…”: đáp án là thông tin sau cùng."], ["Soát chính tả, số ít/số nhiều", "Viết sai chính tả là mất điểm, kể cả khi nghe đúng."]] },
  { topic: "Mẹo Writing Task 1", title: "Có overview là có khung bài.", items: [["Viết lại đề bằng từ của bạn", "Không chép nguyên câu đề vào mở bài."], ["Overview: 2 điểm nổi bật", "Xu hướng chính, cao nhất/thấp nhất. Không đưa số liệu chi tiết."], ["Chia số liệu thành 2 nhóm", "Mỗi đoạn thân bài một nhóm, luôn có so sánh."], ["Không nêu ý kiến", "Task 1 chỉ mô tả, không giải thích nguyên nhân."]] },
  { topic: "Mẹo Writing Task 2", title: "Bốn đoạn là đủ.", items: [["Mở bài: 2 câu", "Viết lại đề, rồi trả lời thẳng câu hỏi bằng quan điểm của bạn."], ["Thân bài 1: một ý chính", "Câu chủ đề, giải thích, rồi một ví dụ cụ thể."], ["Thân bài 2: ý thứ hai", "Cùng cấu trúc. Hai ý chắc hơn bốn ý mỏng."], ["Kết bài: nhắc lại quan điểm", "Không thêm ý mới, 2 câu là đủ."]] },
  { topic: "Mẹo Speaking Part 2", title: "1 phút chuẩn bị, dùng thế nào?", items: [["Ghi từ khoá, đừng viết câu", "4–5 từ khoá theo các gợi ý trên thẻ."], ["Chọn chuyện có thật", "Chuyện thật dễ kể chi tiết hơn chuyện bịa."], ["Để dành sức cho ý cuối", "Gợi ý “why / how you felt” là chỗ nói dài nhất."], ["Nói đến khi được nhắc dừng", "Phần nói kéo dài tối đa 2 phút, cứ tiếp tục."]] },
  { topic: "Mẹo từ vựng", title: "Học từ mới mà không quên.", items: [["Học theo cụm", "“Curb emissions” dễ dùng hơn “curb” đứng một mình."], ["Đặt câu về đời mình", "Câu gắn với trải nghiệm thật nhớ lâu hơn câu mẫu."], ["Ôn đúng lúc sắp quên", "Ôn hôm nay, vài ngày sau, rồi giãn dần khoảng cách."], ["Tự dùng trong bài nói, bài viết", "Từ chỉ thật sự là của bạn khi bạn tự dùng được."]] },
];
const N = [
  { topic: "Con số đề thi · Reading", num: "60", unit: "phút", head: "40 câu hỏi, 3 bài đọc, dài dần và khó dần.", rows: [["Số câu", "40"], ["Số bài đọc", "3"], ["Gợi ý chia thời gian", "~20 phút / bài"]], note: "Không có thời gian riêng để chép đáp án. Ghi thẳng vào phiếu trả lời khi làm." },
  { topic: "Con số đề thi · Listening", num: "4", unit: "phần", head: "40 câu hỏi, audio khoảng 30 phút, chỉ nghe một lần.", rows: [["Số câu", "40"], ["Số lần nghe", "1"], ["Thi trên giấy", "+10 phút chép đáp án"], ["Thi trên máy", "+2 phút soát lại"]], note: "Phần 4 là một bài giảng không ngắt quãng. Hãy luyện nghe dài, không chỉ đoạn ngắn." },
  { topic: "Con số đề thi · Writing", num: "60", unit: "phút", head: "Hai bài viết, Task 2 chiếm số điểm gấp đôi Task 1.", rows: [["Task 1", "≥ 150 từ · ~20 phút"], ["Task 2", "≥ 250 từ · ~40 phút"]], note: "Làm Task 2 trước nếu bạn hay bị thiếu giờ: bài nặng điểm hơn nên cần nhiều thời gian hơn." },
  { topic: "Con số đề thi · Speaking", num: "11–14", unit: "phút", head: "Ba phần, nói trực tiếp với giám khảo.", rows: [["Part 1 · Câu hỏi quen thuộc", "4–5 phút"], ["Part 2 · Nói theo thẻ", "3–4 phút"], ["Part 3 · Thảo luận", "4–5 phút"]], note: "Part 2 có 1 phút chuẩn bị và giấy bút để ghi chú." },
  { topic: "Con số đề thi · Chấm Writing", num: "4", unit: "tiêu chí", head: "Mỗi tiêu chí chiếm 25% điểm Writing.", rows: [["Task Achievement / Response", "25%"], ["Coherence & Cohesion", "25%"], ["Lexical Resource", "25%"], ["Grammatical Range & Accuracy", "25%"]], note: "Studia chấm bài Writing theo đúng 4 tiêu chí này và sửa lỗi từng câu." },
];
const Q = [
  { q: "The government should take steps to ___ air pollution.", opts: ["curb", "decline", "rise", "grow"], ans: "A", why: "“curb” = kiềm chế, hạn chế. “decline/rise/grow” là nội động từ, không đi với tân ngữ." },
  { q: "There has been a ___ increase in the number of tourists.", opts: ["substance", "substantial", "substantially", "substantiate"], ans: "B", why: "Trước danh từ “increase” cần tính từ: substantial." },
  { q: "Although the test was difficult, ___ most students passed.", opts: ["but", "however", "(không điền)", "so"], ans: "C", why: "Đã có “although” thì không thêm “but” hay “however”." },
  { q: "Could you give me some ___ about the course?", opts: ["informations", "information", "an information", "the informations"], ans: "B", why: "“Information” không đếm được, không có dạng số nhiều." },
  { q: "The number of cars ___ risen sharply since 2010.", opts: ["have", "has", "are", "is"], ans: "B", why: "Chủ ngữ là “the number” (số ít) nên dùng “has”. Khác với “A number of cars have…”." },
];
const F = [
  { head: "Biết hôm nay học gì.", sub: "Đặt band mục tiêu, ngày thi và số phút mỗi ngày. Studia soạn nhiệm vụ vừa sức, ngày mai tự chỉnh theo kết quả hôm nay.", mock: M.plan },
  { head: "Sách của bạn thành bài học.", sub: "Tải lên PDF, kể cả bản scan. Trang nào xử lý xong là học được ngay, không phải chờ cả cuốn.", mock: M.book },
  { head: "Ôn đúng lúc sắp quên.", sub: "Bấm Quên, Khó, Được hoặc Dễ. Lịch ôn tự giãn ra với thẻ bạn đã thuộc.", mock: M.cards },
  { head: "Thi thử như thi thật.", sub: "Đồng hồ đếm ngược, bảng số câu, cắm cờ câu khó. Mất mạng giữa chừng cũng không mất bài.", mock: M.exam },
  { head: "Nói sai cũng không sao.", sub: "AI nghe từng câu, gợi ý cách nói tự nhiên hơn và sửa ngữ pháp ngay trong lúc trò chuyện.", mock: M.speak },
  { head: "Writing chấm theo 4 tiêu chí.", sub: "Nộp bài là có band ước tính cho từng tiêu chí và câu nào cần sửa, sửa thế nào.", mock: M.writing },
  { head: "12 phút để biết mình ở đâu.", sub: "Bài kiểm tra trình độ 24 câu. Làm xong là có lộ trình học riêng cho bạn.", mock: M.placement },
];
const QT = [
  { text: "Không cần học bốn tiếng mỗi ngày. Cần biết hôm nay học gì.", by: "Studia" },
  { text: "Một từ bạn dùng được đáng giá hơn mười từ bạn chỉ nhận ra.", by: "Studia" },
  { text: "Hai mươi phút mỗi ngày đi xa hơn ba tiếng rồi bỏ cả tuần.", by: "Studia" },
];
const CTA = [
  { head: "Bắt đầu với cuốn sách bạn đang có.", sub: "Studia biến tài liệu của bạn thành lộ trình học từng ngày.", items: ["Miễn phí 1 cuốn sách", "Không cần thẻ ngân hàng", "Học trên máy tính và điện thoại"], btn: "Link ở bio" },
  { head: "Bạn đang ở band nào?", sub: "Làm bài kiểm tra trình độ 24 câu trong 12 phút, nhận lộ trình học ngay sau đó.", items: ["24 câu · 12 phút", "Lộ trình theo band mục tiêu", "Miễn phí"], btn: "Làm bài kiểm tra" },
];

// ── Thứ tự đăng (xen kẽ định dạng) ────────────────────────────────────────
const HT = {
  vocab: "#Studia #IELTSVocabulary #TuVungIELTS #HocTiengAnh #IELTSVietnam",
  swap: "#Studia #IELTSSpeaking #IELTSWriting #TuVungIELTS #HocTiengAnh",
  mistake: "#Studia #LoiSaiTiengAnh #NguPhapTiengAnh #IELTS #HocTiengAnh",
  tips: "#Studia #MeoIELTS #TuHocIELTS #LuyenThiIELTS #IELTSVietnam",
  stat: "#Studia #IELTS #CauTrucDeIELTS #LuyenThiIELTS #TuHocIELTS",
  quiz: "#Studia #IELTSQuiz #NguPhapTiengAnh #HocTiengAnh #IELTS",
  feature: "#Studia #AppHocIELTS #TuHocIELTS #LoTrinhIELTS #IELTSVietnam",
  quote: "#Studia #DongLucHocTap #TuHocIELTS #HocTiengAnhMoiNgay",
  cta: "#Studia #IELTS #TuHocIELTS #LoTrinhIELTS #HocTiengAnh",
};
const caption = (type, d) => {
  switch (type) {
    case "vocab": return `Từ vựng band 7+ chủ đề ${d.topic}: **${d.word}** ${d.ipa} (${d.pos}) — ${d.vi}.\n\n${d.ex.replace(/\*/g, "")}\n\nHay đi với: ${d.col.join(", ")}.\n\nĐặt một câu với “${d.word}” dưới bình luận, tụi mình sửa giúp. Muốn ôn từ này đúng lúc sắp quên? Lưu thành flashcard trong Studia — link ở bio.`;
    case "swap": return `Thay vì “${d.from}”, thử: ${d.to.map((t) => `“${t}”`).join(" hoặc ")}.\n\n${d.note}\n\nVí dụ: ${d.ex.replace(/\*/g, "")}\n\nLưu bài để dùng trong buổi luyện nói tới nhé.`;
    case "mistake": return `${d.title}\n\nChưa đúng: ${d.wrong}\nĐúng: ${d.right}\n\n${d.why}\n\nBạn từng mắc lỗi này chưa? Thả “1” nếu có.`;
    case "tips": return `${d.title}\n\n${d.items.map(([b, p], k) => `${k + 1}. ${b} — ${p}`).join("\n")}\n\nLưu lại và gửi cho người bạn đang ôn ${d.topic.replace("Mẹo ", "")}.`;
    case "stat": return `${d.topic.replace("Con số đề thi · ", "")}: ${d.num} ${d.unit}. ${d.head}\n\n${d.rows.map(([k, v]) => `• ${k}: ${v}`).join("\n")}\n\n${d.note}`;
    case "quiz": return `Điền vào chỗ trống:\n\n${d.q}\nA. ${d.opts[0]}  B. ${d.opts[1]}  C. ${d.opts[2]}  D. ${d.opts[3]}\n\nBình luận đáp án của bạn. (Ghim bình luận sau 24 giờ: Đáp án ${d.ans} — ${d.why})`;
    case "feature": return `${d.head}\n\n${d.sub}\n\nBắt đầu miễn phí với cuốn sách đầu tiên — link ở bio.`;
    case "quote": return `${d.text}\n\nHôm nay bạn học bao nhiêu phút? Kể tụi mình nghe.`;
    case "cta": return `${d.head}\n\n${d.sub}\n\n${d.items.map((t) => `• ${t}`).join("\n")}\n\nLink ở bio.`;
  }
};

const ORDER = [
  ["vocab", 0], ["mistake", 0], ["feature", 0], ["tips", 0], ["vocab", 1], ["quiz", 0], ["swap", 0], ["stat", 0], ["quote", 0], ["feature", 1],
  ["vocab", 2], ["mistake", 1], ["quiz", 1], ["tips", 1], ["swap", 1], ["vocab", 3], ["feature", 2], ["stat", 1], ["mistake", 2], ["cta", 1],
  ["vocab", 4], ["tips", 2], ["quiz", 2], ["swap", 2], ["feature", 3], ["stat", 2], ["mistake", 3], ["vocab", 5], ["quote", 1], ["tips", 3],
  ["quiz", 3], ["feature", 4], ["swap", 3], ["vocab", 6], ["stat", 3], ["mistake", 4], ["tips", 4], ["feature", 5], ["vocab", 7], ["quiz", 4],
  ["swap", 4], ["stat", 4], ["mistake", 5], ["vocab", 8], ["feature", 6], ["tips", 5], ["swap", 5], ["quote", 2], ["vocab", 9], ["cta", 0],
];
const DATA = { vocab: V, swap: S, mistake: MI, tips: TI, stat: N, quiz: Q, feature: F, quote: QT, cta: CTA };
const NAME = { vocab: "Từ vựng band 7+", swap: "Nói như band 7", mistake: "Lỗi người Việt hay mắc", tips: null, stat: null, quiz: "Câu đố", feature: "Tính năng Studia", quote: "Câu nói hôm nay", cta: "Bắt đầu cùng Studia" };
const SLUG = { vocab: "tu-vung", swap: "nang-cap-tu", mistake: "loi-sai", tips: "meo", stat: "con-so", quiz: "cau-do", feature: "tinh-nang", quote: "trich-dan", cta: "loi-moi" };

export const posts = ORDER.map(([type, k], idx) => {
  const d = DATA[type][k];
  const i = idx + 1, dark = idx % 2 === 0;
  const topic = type === "vocab" ? `${NAME.vocab} · ${d.topic}` : NAME[type] ?? d.topic;
  const count = `${String(k + 1).padStart(2, "0")} / ${String(DATA[type].length).padStart(2, "0")}`;
  const body = type === "cta" ? T.cta(d, dark) : T[type](d);
  const file = `${String(i).padStart(2, "0")}-${SLUG[type]}-${String(k + 1).padStart(2, "0")}.png`;
  return { file, type, label: `${topic} ${count}`, caption: caption(type, d), tags: HT[type], html: frame({ i, dark, topic, count, body }) };
});
