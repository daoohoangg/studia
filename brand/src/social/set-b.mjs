// Bộ B — "Coal & bạn": 50 bài 1080 × 1350 kiểu nhãn dán (nền màu phẳng, viền mực dày, bóng đổ cứng).
// Nhân vật là bộ 25 tư thế Coal trong frontend/public/coal. Giọng ấm, hài hước, không trách móc, không hứa điểm.
import { C, doc, lockup, mark, icon, esc, coalSrc } from "./common.mjs";

export const SET = { dir: "b-coal", title: "Bộ B — Coal & bạn" };

const BG = [C.cream, C.marker, C.blueTint, C.emberTint, C.successTint, C.plumTint];
const INK = C.text;

const CSS = `
body{background:var(--bg);color:${INK};font-family:'Be Vietnam Pro',sans-serif}
.post{position:absolute;inset:0;padding:72px 76px 64px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:center}
.pill{display:flex;align-items:center;gap:12px;background:#fff;border:4px solid ${INK};border-radius:999px;padding:12px 24px 12px 18px;font-weight:800;font-size:22px;letter-spacing:.06em;text-transform:uppercase;box-shadow:5px 5px 0 ${INK}}
.pill.n{padding:12px 22px;font-family:'Bricolage Grotesque',sans-serif;letter-spacing:0;font-size:24px}
.foot{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:26px}
.foot span{font-weight:700;font-size:22px}
.body{flex:1;min-height:0;display:flex;flex-direction:column;padding-top:44px}
h1{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:84px;line-height:1;letter-spacing:-.03em}
h1.sm{font-size:68px}
.box{background:#fff;border:5px solid ${INK};border-radius:36px;box-shadow:12px 12px 0 ${INK}}
.coal{display:block;object-fit:contain}
.hand{font-family:'Bricolage Grotesque',sans-serif;font-weight:700}
.tag{display:inline-block;background:${INK};color:#fff;border-radius:14px;padding:8px 18px;font-weight:700;font-size:24px}
.say{position:relative;background:#fff;border:5px solid ${INK};border-radius:32px;padding:26px 32px;font-size:32px;font-weight:600;line-height:1.35}

/* Meme */
.meme-top{padding:40px 44px}
.meme-top h1{font-size:76px}
.stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;position:relative}
.stage img{height:100%;max-height:640px}
.caption{align-self:center;background:${INK};color:#fff;border-radius:24px;padding:22px 34px;font-size:34px;font-weight:700;text-align:center;max-width:900px;line-height:1.3}

/* Chat */
.chat{display:flex;flex-direction:column;gap:20px;margin-top:36px}
.fill{flex:1;min-height:0;display:flex;justify-content:center;align-items:flex-end;margin-top:12px}.fill img{height:100%;max-height:520px;width:auto}
.msg{display:flex;gap:18px;align-items:flex-end}
.msg .av{width:120px;height:120px;flex:none;background:#fff;border:4px solid ${INK};border-radius:50%;overflow:hidden;display:grid;place-items:center}
.msg .av{position:relative}.msg .av img{position:absolute;left:50%;top:50%;width:112px;height:112px;transform:translate(-50%,-50%)}
.bub{border:4px solid ${INK};border-radius:30px;padding:24px 32px;font-size:34px;line-height:1.4;font-weight:500;max-width:740px;background:#fff}
.msg.coal .bub{border-bottom-left-radius:6px}
.msg.you{justify-content:flex-end}
.msg.you .bub{background:${INK};color:#fff;border-bottom-right-radius:6px}
.msg.cont .av{visibility:hidden}

/* Chuỗi ngày */
.streak{display:grid;grid-template-columns:.85fr 1.15fr;gap:0;align-items:center;flex:1;min-height:0}
.day{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:340px;line-height:.8;letter-spacing:-.06em}
.day small{display:block;font-size:52px;letter-spacing:-.01em;margin-top:24px}
.streak img{width:118%;max-width:none;margin-left:-6%}
.track{display:flex;gap:14px;margin:6px 0 26px}
.track div{flex:1;border:4px solid ${INK};border-radius:18px;padding:12px 0;text-align:center;font-weight:800;font-size:26px;background:#fff}
.track .on{background:${INK};color:#fff}
.track .past{background:${C.ember};color:${INK}}
.desc h2{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:56px;line-height:1.05;letter-spacing:-.02em}
.desc p{font-size:30px;line-height:1.5;margin-top:16px;font-weight:500}

/* Lưới */
.grid{display:grid;gap:22px;margin-top:36px;flex:1;min-height:0}
.cell{background:#fff;border:4px solid ${INK};border-radius:28px;box-shadow:7px 7px 0 ${INK};display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:8px 10px 18px;position:relative;min-height:0}
.cell img{width:92%;flex:1;min-height:0;object-fit:contain}
.cell b{font-size:27px;font-weight:700;text-align:center;line-height:1.2}
.cell .no{position:absolute;left:14px;top:12px;width:48px;height:48px;border-radius:50%;background:${INK};color:#fff;display:grid;place-items:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:24px}
.ask{text-align:center;font-weight:700;font-size:30px;margin-top:28px}

/* Từ vựng */
.vcard{padding:46px 50px;margin-top:34px}
.vword{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;letter-spacing:-.035em;line-height:.95}
.vipa{font-family:'Literata',serif;font-size:32px;margin-top:14px;color:${C.ink2}}
.vvi{font-size:44px;font-weight:700;margin-top:26px;display:inline-block;background:${C.marker};padding:0 12px;border-radius:8px}
.vex{font-family:'Literata',serif;font-style:italic;font-size:31px;line-height:1.5;margin-top:22px;color:${C.ink2}}
.coalsay{display:flex;align-items:flex-end;gap:10px;margin-top:auto}
.coalsay img{width:420px;flex:none;margin-left:-20px;margin-bottom:-10px}
.coalsay .say{margin-bottom:150px}
.coalsay .say:after{content:"";position:absolute;left:-26px;bottom:34px;width:40px;height:40px;background:#fff;border-left:5px solid ${INK};border-bottom:5px solid ${INK};transform:rotate(45deg) skew(10deg,10deg)}

/* Mẹo */
.points{display:flex;flex-direction:column;gap:20px;margin-top:40px}
.pt{display:flex;gap:22px;align-items:center;background:#fff;border:4px solid ${INK};border-radius:26px;padding:24px 28px;box-shadow:6px 6px 0 ${INK};font-size:34px;font-weight:600;line-height:1.35}
.pt .c{flex:none;width:58px;height:58px;border-radius:50%;background:${C.ember};border:4px solid ${INK};display:grid;place-items:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px}
.tipcoal{position:absolute;right:40px;bottom:120px;width:330px}

/* Truyện 4 khung */
.comic{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:22px;flex:1;min-height:0;margin-top:34px}
.panel{background:#fff;border:5px solid ${INK};border-radius:24px;display:flex;flex-direction:column;overflow:hidden;min-height:0;position:relative}
.panel:nth-child(2n){background:var(--alt)}
.panel img{flex:1;min-height:0;width:100%;object-fit:contain;padding:10px 20px 0}
.panel p{border-top:5px solid ${INK};background:#fff;padding:16px 20px;font-size:25px;font-weight:600;line-height:1.35;min-height:118px;display:flex;align-items:center}
.panel .k{position:absolute;left:14px;top:12px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px}

/* Bình chọn */
.poll{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:44px;flex:1;min-height:0;position:relative}
.opt{display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:26px 20px 34px;min-height:0}
.opt img{width:100%;flex:1;min-height:0;object-fit:contain}
.opt b{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:56px;letter-spacing:-.02em}
.opt .k{width:76px;height:76px;border-radius:50%;background:${INK};color:#fff;display:grid;place-items:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:38px}
.vs{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-8deg);background:${C.ember};border:5px solid ${INK};border-radius:22px;padding:10px 22px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:46px;z-index:2}

/* Thử thách */
.miles{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;margin-top:34px;flex:1;min-height:0}
.miles .cell b{font-family:'Bricolage Grotesque',sans-serif;font-size:40px;font-weight:800}
.miles .cell span{font-size:23px;font-weight:600;color:${C.ink2}}
.hashtag{align-self:center;margin-top:28px;background:${INK};color:#fff;border-radius:999px;padding:18px 40px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:40px}

/* Lời mời */
.cta{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center;flex:1;min-height:0}
.cta img{width:135%;max-width:none;margin-left:-20%}
.cta ul{list-style:none;display:flex;flex-direction:column;gap:18px;margin-top:34px}
.cta li{display:flex;gap:16px;align-items:center;font-size:30px;font-weight:600;line-height:1.3}
.cta li i{flex:none;width:46px;height:46px;border-radius:50%;background:${INK};display:grid;place-items:center}
.go{align-self:flex-start;margin-top:40px;background:${C.ember};border:5px solid ${INK};box-shadow:8px 8px 0 ${INK};border-radius:999px;padding:24px 44px;font-weight:800;font-size:36px;display:flex;gap:14px;align-items:center}
`;

const img = (name, cls = "coal", style = "") => `<img class="${cls}" src="${coalSrc(name)}" alt="" style="${style}">`;

const frame = ({ bg, topic, count, body }) => doc(CSS, `
<div class="post">
  <div class="top"><span class="pill">${mark(28, INK, C.ember)}${topic}</span><span class="pill n">${count}</span></div>
  <div class="body">${body}</div>
  <div class="foot">${lockup(32, INK)}<span>Học cùng Coal mỗi ngày</span></div>
</div>`).replace("<body", `<body style="--bg:${bg}"`);

// ── Mẫu ───────────────────────────────────────────────────────────────────
const T = {
  meme: (d) => `<div class="box meme-top"><h1>${d.top}</h1></div>
    <div class="stage">${img(d.sprite)}</div>
    <div class="caption">${d.bottom}</div>`,
  chat: (d) => {
    let prev = null;
    const msgs = d.msgs.map(([who, text]) => {
      const cont = who === prev; prev = who;
      return who === "coal"
        ? `<div class="msg coal${cont ? " cont" : ""}"><div class="av">${img(d.sprite)}</div><div class="bub">${text}</div></div>`
        : `<div class="msg you"><div class="bub">${text}</div></div>`;
    }).join("");
    return `<h1 class="sm">${d.title}</h1><div class="chat"${d.msgs.length >= 5 ? ' style="margin:auto 0"' : ""}>${msgs}</div>${d.msgs.length < 5 ? `<div class="fill">${img(d.sprite)}</div>` : ""}`;
  },
  streak: (d) => `<div class="streak"><div class="day">${d.day}<small>${d.unit}</small></div>${img(d.sprite)}</div>
    ${d.track ? `<div class="track">${[3, 7, 14, 30].map((m) => `<div class="${m === d.day ? "on" : m < d.day ? "past" : ""}">${m} ngày</div>`).join("")}</div>` : ""}
    <div class="desc"><h2>${d.head}</h2><p>${d.body}</p></div>`,
  grid: (d) => {
    const cols = d.items.length > 4 ? 3 : 2;
    return `<h1 class="sm">${d.head}</h1>
    <div class="grid" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${Math.ceil(d.items.length / cols)},1fr)">
      ${d.items.map(([s, label], k) => `<div class="cell"><span class="no">${k + 1}</span>${img(s)}<b>${label}</b></div>`).join("")}</div>
    <p class="ask">${d.ask}</p>`;
  },
  vocab: (d) => `<div class="box vcard">
      <span class="tag">Từ vựng cùng Coal</span>
      <div class="vword" style="font-size:${Math.min(150, Math.round(1500 / d.word.length))}px;margin-top:26px">${d.word}</div>
      <div class="vipa">${d.ipa} · ${d.pos}</div>
      <div class="vvi">${d.vi}</div>
      <p class="vex">${esc(d.ex)}</p></div>
    <div class="coalsay">${img(d.sprite)}<div class="say">${d.bubble}</div></div>`,
  tip: (d) => `<h1 class="sm" style="max-width:900px">${d.head}</h1>
    <div class="points">${d.points.map((p, k) => `<div class="pt"><span class="c">${k + 1}</span><span>${p}</span></div>`).join("")}</div>
    <div class="fill">${img(d.sprite)}</div>`,
  comic: (d) => `<h1 class="sm">${d.title}</h1>
    <div class="comic" style="--alt:${d.alt}">${d.panels.map(([s, t], k) => `<div class="panel"><span class="k">${k + 1}</span>${img(s)}<p>${t}</p></div>`).join("")}</div>`,
  poll: (d) => `<h1>${d.q}</h1>
    <div class="poll">${[d.a, d.b].map(([s, l], k) => `<div class="box opt"><span class="k">${"AB"[k]}</span>${img(s)}<b>${l}</b></div>`).join("")}<span class="vs">hay</span></div>
    <p class="ask">Bình luận A hoặc B.</p>`,
  challenge: (d) => `<h1 class="sm">${d.head}</h1>
    <div class="miles">${d.items.map(([s, n, t]) => `<div class="cell">${img(s)}<b>${n}</b><span>${t}</span></div>`).join("")}</div>
    <span class="hashtag">#GiuLuaCungCoal</span>`,
  cta: (d) => `<h1 style="font-size:104px;margin-top:40px">${d.head}</h1><div class="cta"><div>
      <ul>${d.items.map((t) => `<li><i>${icon.check("#fff", 26)}</i>${t}</li>`).join("")}</ul>
      <div class="go">${d.btn}${icon.arrow(INK, 34)}</div></div>${img(d.sprite)}</div>`,
};

// ── Nội dung ──────────────────────────────────────────────────────────────
const MEME = [
  { top: "Mở sách IELTS lúc 11 giờ đêm", sprite: "sleepy", bottom: "Coal: “5 phút nữa thôi…”" },
  { top: "Nghe Section 4 lần đầu tiên", sprite: "lost", bottom: "Người ta nói tiếng Anh hay đang đọc rap vậy?" },
  { top: "Đoán bừa True / False / Not Given mà đúng cả ba", sprite: "excited", bottom: "Thiên tài hay may mắn? Không quan trọng." },
  { top: "Đọc đề Part 2: “Describe a time when you…”", sprite: "surprised", bottom: "…when I what?" },
  { top: "Đếm lại bài Writing Task 2: 249 từ", sprite: "sad", bottom: "Thiếu đúng một từ." },
  { top: "Lần đầu nói hết 2 phút Part 2 không ngắt", sprite: "cheer", bottom: "Không ai cản được Coal nữa." },
  { top: "Hứa học 5 phút. Hai tiếng sau:", sprite: "focus", bottom: "Coal đang vào guồng, đừng làm phiền." },
  { top: "Thứ Hai đầu tuần, quyết tâm lại từ đầu", sprite: "fireM", bottom: "Lần thứ 12 trong năm. Nhưng lần này khác." },
  { top: "Mở app thấy 120 thẻ đến hạn", sprite: "wet2", bottom: "Ai bảo hôm qua không ôn." },
  { top: "Thi thử cao hơn lần trước 0.5", sprite: "love", bottom: "Coal muốn ôm cả thế giới." },
];
const CHAT = [
  { title: "Coal là ai?", sprite: "hello", msgs: [["coal", "Chào bạn! Mình là Coal, một cục than nhỏ."], ["coal", "Mình muốn thành kim cương. Mà than muốn thành kim cương thì phải chịu ép mỗi ngày."], ["you", "Nghe giống mình học IELTS ghê."], ["coal", "Thì mình học chung đi! Bạn học đều, lửa trên đầu mình cháy to hơn."]] },
  { title: "Coal sửa câu giúp bạn", sprite: "happy", msgs: [["you", "I very like travel."], ["coal", "Gần đúng rồi! Thử: “I really like travelling.”"], ["coal", "“Very” không đứng trước động từ đâu nha."], ["you", "À, thì ra vậy."]] },
  { title: "Hỏi Coal lúc 1 giờ sáng", sprite: "focus", msgs: [["you", "Coal ơi, “affect” với “effect” khác gì?"], ["coal", "“Affect” là động từ: Stress affects sleep."], ["coal", "“Effect” là danh từ: Stress has an effect on sleep."], ["you", "Hiểu rồi. Đi ngủ đây."], ["coal", "Ngủ ngon! Mai ôn lại hai câu này nhé."]] },
  { title: "Khi bạn muốn bỏ cuộc", sprite: "love", msgs: [["you", "Mình học mãi mà chưa thấy tiến bộ."], ["coal", "Mình hiểu. Lửa của mình cũng có hôm le lói."], ["coal", "Hôm nay chỉ một việc nhỏ thôi: 10 thẻ từ vựng. Được không?"], ["you", "10 thẻ thì được."], ["coal", "Thế là lửa vẫn còn."]] },
  { title: "Coal luyện nói cùng bạn", sprite: "excited", msgs: [["you", "The food in Hanoi is very delicious."], ["coal", "Ổn rồi! Tự nhiên hơn: “The food in Hanoi is absolutely delicious.”"], ["coal", "“Delicious” đã là rất ngon, nên đi với “absolutely”, không đi với “very”."], ["you", "Hay quá, ghi lại liền."]] },
  { title: "Coal nhắc bạn", sprite: "fire2", msgs: [["coal", "Hôm nay bạn chưa học phút nào đó…"], ["coal", "Không cần nhiều. 5 phút flashcard thôi."], ["you", "Ok ok, mở app đây."], ["coal", "Lửa cháy rồi! Mai gặp lại nha."]] },
];
const STREAK = [
  { day: 1, unit: "ngày", sprite: "happy", track: true, head: "Đốm lửa đầu tiên", body: "Mọi chuỗi dài đều bắt đầu từ một ngày. Hôm nay chỉ cần làm một nhiệm vụ." },
  { day: 3, unit: "ngày liền", sprite: "fire0", track: true, head: "Than bắt đầu nứt nóng", body: "Ba ngày liền, Coal đỏ rực từ bên trong. Khó nhất là đoạn này, và bạn đã qua." },
  { day: 7, unit: "ngày liền", sprite: "fire2", track: true, head: "Lửa trên đầu bùng lên", body: "Một tuần trọn vẹn. Coal bắt đầu thấy mình hơi ngầu." },
  { day: 14, unit: "ngày liền", sprite: "fire3", track: true, head: "Coal toả sáng", body: "Hai tuần. Bạn bè bắt đầu hỏi bạn đang học app gì." },
  { day: 30, unit: "ngày liền", sprite: "fire4", track: true, head: "Cháy cả người", body: "Một tháng không bỏ ngày nào. Coal không còn là cục than bình thường nữa." },
];
const WET = [
  { day: 1, unit: "ngày vắng", sprite: "wet0", head: "Coal hơi ướt", body: "Không sao, ai cũng có ngày bận. Mai quay lại là lửa cháy tiếp." },
  { day: 3, unit: "ngày vắng", sprite: "wet2", head: "Coal bắt đầu rơm rớm", body: "Lửa vẫn còn, chỉ hơi run. Một bài quiz 5 câu là đủ để Coal cười lại." },
  { day: 7, unit: "ngày vắng", sprite: "wet3", head: "Coal đứng giữa vũng nước", body: "Coal không giận đâu. Coal chỉ đứng đợi bạn thôi." },
  { day: 14, unit: "ngày vắng", sprite: "wet4", head: "Coal ngập nước", body: "Bắt đầu lại chưa bao giờ là muộn. Hôm nay là ngày 1 mới." },
];
const GRID = [
  { head: "Hôm nay bạn là Coal nào?", items: [["hello", "Sẵn sàng"], ["sleepy", "Buồn ngủ"], ["focus", "Tập trung"], ["lost", "Lạc trôi"], ["sad", "Hơi buồn"], ["fireM", "Ngầu"]], ask: "Bình luận số của bạn hôm nay." },
  { head: "Kỹ năng nào biến bạn thành Coal này?", items: [["surprised", "Listening"], ["lost", "Reading"], ["sad", "Writing"], ["wet2", "Speaking"]], ask: "Bình luận kỹ năng làm bạn sợ nhất." },
  { head: "Bạn là kiểu người học IELTS nào?", items: [["sleepy", "Lập kế hoạch rồi để đó"], ["fire4", "Dồn hết vào tuần cuối"], ["fire2", "Đều đặn mỗi ngày"], ["focus", "Chỉ học từ vựng"], ["surprised", "Né Speaking"], ["excited", "Thánh đoán đáp án"]], ask: "Gắn thẻ người bạn giống số 2." },
  { head: "Cảm xúc trong một buổi thi thử", items: [["fireM", "Phút 1"], ["focus", "Phút 20"], ["surprised", "Phút 45"], ["lost", "Phút 55"], ["sad", "Nộp bài"], ["love", "Thấy điểm"]], ask: "Bạn đang ở phút thứ mấy?" },
];
const VOCAB = [
  { word: "procrastinate", ipa: "/prəˈkræs.tɪ.neɪt/", pos: "verb", vi: "trì hoãn, chần chừ", ex: "I tend to procrastinate when a task feels too big.", sprite: "sleepy", bubble: "Từ này Coal hiểu rõ nhất." },
  { word: "resilient", ipa: "/rɪˈzɪl.i.ənt/", pos: "adjective", vi: "kiên cường, mau hồi phục", ex: "Resilient learners keep going after a bad score.", sprite: "fire2", bubble: "Than bị ép thành kim cương. Đó là resilient." },
  { word: "overwhelmed", ipa: "/ˌəʊ.vəˈwelmd/", pos: "adjective", vi: "choáng ngợp, quá tải", ex: "I felt overwhelmed by the number of new words.", sprite: "wet2", bubble: "Cảm giác khi mở 120 thẻ đến hạn." },
  { word: "diligent", ipa: "/ˈdɪl.ɪ.dʒənt/", pos: "adjective", vi: "chăm chỉ, cần mẫn", ex: "She is a diligent student who reviews every day.", sprite: "focus", bubble: "Học đều mỗi ngày là diligent." },
  { word: "milestone", ipa: "/ˈmaɪl.stəʊn/", pos: "noun", vi: "cột mốc", ex: "A 30-day streak is a real milestone.", sprite: "fire1", bubble: "3, 7, 14, 30 ngày là milestone của Coal." },
  { word: "breathtaking", ipa: "/ˈbreθˌteɪ.kɪŋ/", pos: "adjective", vi: "đẹp ngoạn mục", ex: "The view from the mountain was breathtaking.", sprite: "love", bubble: "Dùng thay “very beautiful” khi nói." },
];
const TIP = [
  { head: "3 cách học 15 phút trên xe buýt", sprite: "happy", points: ["Ôn 20 flashcard đến hạn", "Nghe lại một đoạn Listening ở tốc độ 0.75×", "Tự trả lời một câu Part 1 trong đầu"] },
  { head: "Coal luyện Listening thế này", sprite: "focus", points: ["Nghe một lần, không xem lời", "Nghe chép từng cụm ngắn", "So với bản gốc, ghi lại từ nghe sai"] },
  { head: "Đêm trước ngày thi, Coal không…", sprite: "sleepy", points: ["Học từ mới đến 2 giờ sáng", "Làm liền năm đề trong một ngày", "Thức khuya. Ngủ đủ mới là ôn tốt nhất"] },
  { head: "Writing Task 2 không bí ý", sprite: "excited", points: ["Hỏi: ai được lợi, ai chịu thiệt?", "Lấy ví dụ từ đời mình hoặc tin tức", "Chọn 2 ý mạnh nhất, bỏ phần còn lại"] },
  { head: "Speaking không sợ khoảng lặng", sprite: "cheer", points: ["Mở đầu tự nhiên: “That’s an interesting question…”", "Nói chậm và rõ, không cần nhanh", "Quên từ? Mô tả nó bằng từ đơn giản"] },
  { head: "Giữ lửa vào ngày lười nhất", sprite: "fire0", points: ["Đặt mục tiêu nhỏ đến buồn cười: 1 thẻ", "Học vào cùng một giờ mỗi ngày", "Rủ một người bạn cùng giữ chuỗi"] },
];
const COMIC = [
  { title: "Coal và bài nghe chép đầu tiên", alt: C.blueTint, panels: [["sleepy", "Sáng nào Coal cũng ngủ nướng."], ["focus", "Hôm nay Coal quyết tâm nghe chép."], ["surprised", "Người ta đọc nhanh quá!"], ["fire2", "Chậm lại 0.75×, nghe từng cụm. Lửa cháy lại!"]] },
  { title: "Coal viết Task 2", alt: C.marker, panels: [["hello", "Đề: “Cities should ban cars.” Dễ!"], ["lost", "…Viết gì bây giờ?"], ["focus", "5 phút dàn ý: 2 ý, 2 ví dụ."], ["cheer", "263 từ. Nộp bài!"]] },
  { title: "Coal đi thi thử", alt: C.emberTint, panels: [["fireM", "Vào phòng thi thử, tự tin lắm."], ["surprised", "Còn 10 phút, còn 13 câu."], ["sad", "Lần này chưa như ý."], ["fire0", "Xem lại lỗi sai. Lần sau sẽ khác."]] },
  { title: "Coal và bạn thân", alt: C.successTint, panels: [["wet2", "Coal bỏ học 3 ngày."], ["surprised", "Bạn thân gửi ảnh: “Hôm nay tớ học 30 phút nè.”"], ["focus", "Coal mở app ngay."], ["love", "Hai đứa cùng giữ lửa."]] },
];
const POLL = [
  { q: "Bạn học giờ nào?", a: ["hello", "Sáng sớm"], b: ["sleepy", "Đêm khuya"] },
  { q: "Kỹ năng nào khó hơn?", a: ["sad", "Writing"], b: ["surprised", "Speaking"] },
];
const CHALLENGE = [
  { head: "30 ngày giữ lửa cho Coal", items: [["fire0", "3 ngày", "Than nứt nóng"], ["fire2", "7 ngày", "Lửa bùng lên"], ["fire3", "14 ngày", "Toả sáng"], ["fire4", "30 ngày", "Cháy cả người"]] },
];
const CTA = [
  { head: "Coal đang đợi bạn.", sprite: "hello", items: ["Lộ trình học riêng mỗi ngày", "Coal đổi hình theo chuỗi ngày học", "Miễn phí cuốn sách đầu tiên"], btn: "Link ở bio" },
  { head: "Giữ lửa cho Coal từ hôm nay.", sprite: "cheer", items: ["Học 15 phút mỗi ngày là đủ", "Rủ bạn bè cùng giữ chuỗi", "Không cần thẻ ngân hàng"], btn: "Bắt đầu miễn phí" },
];

// ── Chú thích ─────────────────────────────────────────────────────────────
const HT = "#Studia #Coal #GiuLuaCungCoal #HocTiengAnh #IELTS";
const TAGS = {
  meme: `${HT} #MemeHocTap #IELTSMeme #SinhVien`, chat: `${HT} #TuHocIELTS #HocCungAI`, streak: `${HT} #ThuThach30Ngay #HocMoiNgay`,
  wet: `${HT} #HocMoiNgay #DongLucHocTap`, grid: `${HT} #IELTSMeme #SinhVien`, vocab: `${HT} #TuVungTiengAnh #IELTSVocabulary`,
  tip: `${HT} #MeoIELTS #TuHocIELTS`, comic: `${HT} #TruyenTranh #IELTSMeme`, poll: `${HT} #SinhVien #HocTiengAnh`,
  challenge: `${HT} #ThuThach30Ngay #StudyWithMe`, cta: `${HT} #AppHocIELTS #LoTrinhIELTS`,
};
const strip = (s) => s.replace(/<[^>]+>/g, "");
const caption = (type, d) => {
  switch (type) {
    case "meme": return `${d.top}\n${d.bottom}\n\nGắn thẻ người bạn cũng từng như Coal.`;
    case "chat": return `${d.title}\n\n${d.msgs.map(([w, t]) => `${w === "coal" ? "Coal" : "Bạn"}: ${strip(t)}`).join("\n")}\n\nHỏi Coal bất cứ lúc nào trong Studia — link ở bio.`;
    case "streak": return `Ngày ${d.day}: ${d.head.toLowerCase()}.\n\n${d.body}\n\nTrong Studia, Coal đổi hình ở các mốc 3, 7, 14 và 30 ngày học liên tiếp. Bạn đang ở mốc nào? Khoe ảnh Coal của bạn trong story và gắn thẻ tụi mình nhé.`;
    case "wet": return `Vắng ${d.day} ngày: ${d.head.toLowerCase()}.\n\n${d.body}\n\nCoal không trách đâu — chỉ cần một nhiệm vụ nhỏ là lửa cháy lại.`;
    case "grid": return `${d.head}\n\n${d.items.map(([, l], k) => `${k + 1}. ${l}`).join("\n")}\n\n${d.ask}`;
    case "vocab": return `Từ vựng cùng Coal: **${d.word}** ${d.ipa} (${d.pos}) — ${d.vi}.\n\n${d.ex}\n\nCoal: “${d.bubble}”\n\nĐặt một câu với “${d.word}” dưới bình luận nhé.`;
    case "tip": return `${d.head}\n\n${d.points.map((p, k) => `${k + 1}. ${p}`).join("\n")}\n\nLưu lại cho ngày mai.`;
    case "comic": return `${d.title}\n\n${d.panels.map(([, t], k) => `${k + 1}. ${t}`).join("\n")}\n\nBạn giống Coal ở khung nào?`;
    case "poll": return `${d.q}\nA. ${d.a[1]}  ·  B. ${d.b[1]}\n\nBình luận A hoặc B.`;
    case "challenge": return `Thử thách 30 ngày giữ lửa cho Coal bắt đầu!\n\n${d.items.map(([, n, t]) => `• ${n}: ${t}`).join("\n")}\n\nCách tham gia: học mỗi ngày trên Studia, đăng ảnh Coal của bạn lên story kèm #GiuLuaCungCoal và gắn thẻ tụi mình. Mỗi tuần tụi mình chọn 10 bạn tặng thêm 1 lượt sách.`;
    case "cta": return `${d.head}\n\n${d.items.map((t) => `• ${t}`).join("\n")}\n\nLink ở bio.`;
  }
};

// ── Thứ tự đăng ───────────────────────────────────────────────────────────
const ORDER = [
  ["chat", 0], ["meme", 0], ["streak", 0], ["vocab", 0], ["meme", 1], ["grid", 0], ["comic", 0], ["tip", 0], ["meme", 2], ["streak", 1],
  ["chat", 1], ["meme", 3], ["wet", 0], ["vocab", 1], ["poll", 0], ["comic", 1], ["meme", 4], ["streak", 2], ["tip", 1], ["grid", 1],
  ["chat", 2], ["meme", 5], ["vocab", 2], ["wet", 1], ["challenge", 0], ["comic", 2], ["meme", 6], ["tip", 2], ["chat", 3], ["streak", 3],
  ["vocab", 3], ["grid", 2], ["meme", 7], ["wet", 2], ["tip", 3], ["chat", 4], ["poll", 1], ["meme", 8], ["vocab", 4], ["comic", 3],
  ["streak", 4], ["tip", 4], ["grid", 3], ["meme", 9], ["wet", 3], ["vocab", 5], ["chat", 5], ["tip", 5], ["cta", 0], ["cta", 1],
];
const DATA = { meme: MEME, chat: CHAT, streak: STREAK, wet: WET, grid: GRID, vocab: VOCAB, tip: TIP, comic: COMIC, poll: POLL, challenge: CHALLENGE, cta: CTA };
const NAME = { meme: "Coal & bạn", chat: "Trò chuyện", streak: "Chuỗi lửa", wet: "Coal đợi bạn", grid: "Bạn là Coal nào", vocab: "Từ vựng", tip: "Mẹo của Coal", comic: "Truyện Coal", poll: "Bình chọn", challenge: "Thử thách", cta: "Studia" };
const SLUG = { meme: "meme", chat: "tro-chuyen", streak: "chuoi-lua", wet: "coal-uot", grid: "luoi-cam-xuc", vocab: "tu-vung", tip: "meo", comic: "truyen", poll: "binh-chon", challenge: "thu-thach", cta: "loi-moi" };

export const posts = ORDER.map(([type, k], idx) => {
  const d = DATA[type][k];
  const i = idx + 1;
  const bg = BG[idx % BG.length];
  const tpl = type === "wet" ? "streak" : type;
  const count = `#${String(i).padStart(2, "0")}`;
  const file = `${String(i).padStart(2, "0")}-${SLUG[type]}-${String(k + 1).padStart(2, "0")}.png`;
  return { file, type, label: `${NAME[type]} ${String(k + 1).padStart(2, "0")} / ${String(DATA[type].length).padStart(2, "0")}`, caption: caption(type, d), tags: TAGS[type], html: frame({ bg, topic: NAME[type], count, body: T[tpl](d) }) };
});
