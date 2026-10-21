/**
 * Nghe chép chính tả: ngân hàng đoạn nghe, tách cụm, chấm so sánh từng từ, phát âm bằng giọng đọc của trình duyệt
 * và lưu tiến độ ở trình duyệt. Phần logic thuần (không đụng DOM) để kiểm thử độc lập.
 */

export type Level = "easy" | "mid" | "hard";
export type Segment = { id: string; level: Level; topic: string; text: string };

export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "easy", label: "Cơ bản", hint: "Câu ngắn, từ quen thuộc (IELTS 4.5–5.5)" },
  { id: "mid", label: "Trung bình", hint: "Câu ghép, số liệu, từ học thuật vừa (IELTS 5.5–6.5)" },
  { id: "hard", label: "Nâng cao", hint: "Câu dài, từ trừu tượng, nhiều mệnh đề (IELTS 7+)" },
];

/** Mỗi đoạn dài khoảng 25–32 từ, tức 10–15 giây ở tốc độ thường. */
export const SEGMENTS: Segment[] = [
  { id: "e1", level: "easy", topic: "Thư viện", text: "Good morning, everyone. The library opens at eight o'clock and closes at ten at night, so you have plenty of time to study. Please remember to bring your student card." },
  { id: "e2", level: "easy", topic: "Chỉ đường", text: "To get to the station, go straight along this road for about five minutes, then turn left at the traffic lights. The station is next to a small bookshop." },
  { id: "e3", level: "easy", topic: "Thói quen", text: "I usually wake up at half past six, have a quick breakfast, and then take the bus to work. The journey takes around forty minutes if there is no traffic." },
  { id: "e4", level: "easy", topic: "Đặt bàn", text: "I'd like to book a table for four people this Saturday evening at seven thirty, please. We would prefer a table near the window, if that is possible." },
  { id: "e5", level: "easy", topic: "Thời tiết", text: "Tomorrow will start cloudy in the north, but the sun should come out by midday. Temperatures will reach twenty degrees, although it may rain again in the evening." },
  { id: "e6", level: "easy", topic: "Sở thích", text: "My favourite hobby is cooking. At weekends I try new recipes with my sister, and we often invite our neighbours to taste the food we have made." },
  { id: "e7", level: "easy", topic: "Phòng gym", text: "The gym membership costs thirty pounds a month, and that includes the swimming pool and all the group classes. You can cancel at any time with two weeks' notice." },
  { id: "m1", level: "mid", topic: "Ký túc xá", text: "Most students in the first year live in the halls of residence, which are about ten minutes' walk from the main campus, but rooms are limited, so you should apply early." },
  { id: "m2", level: "mid", topic: "Môi trường", text: "Over the last fifty years, the average temperature of the ocean surface has risen steadily, which has caused coral reefs in many tropical regions to lose their colour and die." },
  { id: "m3", level: "mid", topic: "Công việc", text: "Our company has recently introduced flexible working hours, so employees can choose to start between seven and ten in the morning, as long as they complete eight hours." },
  { id: "m4", level: "mid", topic: "Chuyến tham quan", text: "This morning we will visit the old harbour, where fishermen have been selling their catch for over three centuries, and after lunch there will be time to explore the market." },
  { id: "m5", level: "mid", topic: "Khảo sát", text: "The survey found that nearly sixty percent of respondents preferred studying in small groups rather than listening to lectures, although many admitted that they were easily distracted." },
  { id: "m6", level: "mid", topic: "Công nghệ", text: "Because more people are shopping online, delivery companies are investing heavily in electric vans, which are quieter and cheaper to run than traditional diesel vehicles." },
  { id: "m7", level: "mid", topic: "Sức khỏe", text: "Doctors recommend that adults get at least seven hours of sleep each night, since a lack of rest can affect memory, mood, and even the body's ability to fight infections." },
  { id: "m8", level: "mid", topic: "Bài tập lớn", text: "Your assignment should be about two thousand words long and must be submitted online before noon on Friday, otherwise you will lose ten percent of your final mark." },
  { id: "h1", level: "hard", topic: "Lịch sử", text: "Contrary to popular belief, the early settlers did not abandon the region because of the harsh winters, but rather because the soil, once fertile, had gradually become exhausted." },
  { id: "h2", level: "hard", topic: "Kinh tế", text: "Economists argue that the sharp rise in housing prices is largely attributable to a shortage of new homes, rather than to speculation by investors, as many commentators have claimed." },
  { id: "h3", level: "hard", topic: "Khoa học", text: "Although the experiment was originally designed to measure the effect of light on plant growth, the researchers unexpectedly discovered that temperature played a far more significant role." },
  { id: "h4", level: "hard", topic: "Đô thị", text: "Urban planners are increasingly convinced that cities should prioritise pedestrians and cyclists, since reducing car traffic not only improves air quality but also strengthens local businesses." },
  { id: "h5", level: "hard", topic: "Bảo tàng", text: "The museum's newest exhibition, which explores how ordinary people experienced the industrial revolution, draws on letters, photographs, and diaries that had remained undiscovered in a private collection until last year." },
  { id: "h6", level: "hard", topic: "Tâm lý học", text: "Psychologists have found that people who write down their goals are considerably more likely to achieve them, provided that they also review their progress regularly and adjust their plans." },
];

/* ---------- Tách văn bản ---------- */

/** Tốc độ đọc trung bình của giọng TTS ở 1× (từ/giây), dùng để ước lượng thời lượng. */
const WORDS_PER_SEC = 2.6;
const MAX_SEG_WORDS = 36; // ≈ 14 giây
const MIN_SEG_WORDS = 22; // ≈ 8,5 giây

export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
export const estimateSeconds = (text: string, rate: number) => wordCount(text) / (WORDS_PER_SEC * rate);

/** Tách thành câu, giữ dấu câu cuối. */
function sentencesOf(text: string): string[] {
  return (text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]*["')\]]*/g) || []).map((s) => s.trim()).filter(Boolean);
}

/** Tách thành cụm nghe (kết thúc ở dấu phẩy, chấm phẩy, hai chấm hoặc dấu kết câu); gộp cụm quá ngắn (<3 từ) vào cụm kề. */
export function chunksOf(text: string): string[] {
  const raw = (text.replace(/\s+/g, " ").trim().match(/[^,;:.!?]+[,;:.!?]*/g) || []).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  let carry = "";
  for (const piece of raw) {
    const joined = carry ? `${carry} ${piece}` : piece;
    if (wordCount(joined) < 3) { carry = joined; continue; }
    out.push(joined);
    carry = "";
  }
  if (carry) {
    if (out.length) out[out.length - 1] += ` ${carry}`;
    else out.push(carry);
  }
  return out;
}

/** Cắt văn bản dán vào thành các đoạn nghe 10–15 giây: gom câu cho tới ~36 từ, câu quá dài thì cắt ở dấu phẩy. */
export function splitIntoSegments(text: string): string[] {
  const units: string[] = [];
  for (const s of sentencesOf(text)) {
    if (wordCount(s) <= MAX_SEG_WORDS) { units.push(s); continue; }
    let buf = "";
    for (const c of chunksOf(s)) {
      if (buf && wordCount(`${buf} ${c}`) > MAX_SEG_WORDS) { units.push(buf); buf = c; }
      else buf = buf ? `${buf} ${c}` : c;
    }
    if (buf) units.push(buf);
  }
  const out: string[] = [];
  let cur = "";
  for (const u of units) {
    const joined = cur ? wordCount(`${cur} ${u}`) : 0;
    // đoạn đang gom còn quá ngắn (<15 từ) thì cho vượt nhẹ trần để không tạo đoạn chỉ vài giây
    if (cur && joined > MAX_SEG_WORDS && !(wordCount(cur) < 15 && joined <= 42)) { out.push(cur); cur = u; }
    else cur = cur ? `${cur} ${u}` : u;
    if (wordCount(cur) >= MIN_SEG_WORDS && wordCount(cur) <= MAX_SEG_WORDS && /[.!?]["')\]]*$/.test(cur)) { out.push(cur); cur = ""; }
  }
  if (cur) {
    // phần dư quá ngắn thì nối vào đoạn trước nếu còn vừa
    if (out.length && wordCount(cur) < 8 && wordCount(`${out[out.length - 1]} ${cur}`) <= MAX_SEG_WORDS + 6) out[out.length - 1] += ` ${cur}`;
    else out.push(cur);
  }
  return out;
}

/** Gợi ý chữ cái đầu: "Good morning," → "G___ m______,". */
export function maskText(text: string): string {
  return text.replace(/([A-Za-z])([A-Za-z']*)/g, (_m, a: string, b: string) => a + b.replace(/[A-Za-z]/g, "_"));
}

/* ---------- Chấm ---------- */

const NUM_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const TENS: Record<string, string> = { "30": "thirty", "40": "forty", "50": "fifty", "60": "sixty", "70": "seventy", "80": "eighty", "90": "ninety", "100": "hundred" };

function normToken(w: string): string {
  if (/^\d+$/.test(w)) {
    const n = Number(w);
    if (n <= 20) return NUM_WORDS[n];
    if (TENS[w]) return TENS[w];
  }
  return w;
}

/** Hạ chữ thường, bỏ dấu câu, đổi số 0–20 và các chục thành chữ; dấu nháy trong từ (I'd, students') được giữ. */
export function tokenize(s: string): string[] {
  return s.toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter(Boolean)
    .map(normToken);
}

function lev(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Gõ gần đúng (sai 1 ký tự; 2 ký tự với từ ≥5 ký tự có cùng chữ cái đầu): coi là lỗi chính tả chứ không phải nghe sai. */
export function isNear(ref: string, got: string): boolean {
  const len = Math.max(ref.length, got.length);
  if (ref === got || len < 4) return false;
  const d = lev(ref, got);
  return d <= 1 || (len >= 5 && d <= 2 && ref[0] === got[0]);
}

export type CellKind = "ok" | "typo" | "wrong" | "missing" | "extra";
export type Cell = { kind: CellKind; ref?: string; got?: string };
export type Compared = {
  cells: Cell[];
  score: number; // 0–100; lỗi chính tả tính nửa điểm
  counts: Record<CellKind, number>;
  total: number;
};

export function compare(reference: string, answer: string): Compared {
  const R = tokenize(reference);
  const U = tokenize(answer);
  const n = R.length, m = U.length;
  const L = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0) as number[]);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    L[i][j] = R[i] === U[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  }
  const cells: Cell[] = [];
  const flushGap = (refGap: string[], userGap: string[]) => {
    let j = 0;
    for (const r of refGap) {
      const k = userGap.findIndex((u, idx) => idx >= j && isNear(r, u));
      if (k >= 0) {
        for (let x = j; x < k; x++) cells.push({ kind: "extra", got: userGap[x] });
        cells.push({ kind: "typo", ref: r, got: userGap[k] });
        j = k + 1;
      } else if (j < userGap.length) {
        cells.push({ kind: "wrong", ref: r, got: userGap[j++] });
      } else {
        cells.push({ kind: "missing", ref: r });
      }
    }
    for (; j < userGap.length; j++) cells.push({ kind: "extra", got: userGap[j] });
  };
  let i = 0, j = 0, rg: string[] = [], ug: string[] = [];
  while (i < n || j < m) {
    if (i < n && j < m && R[i] === U[j]) {
      flushGap(rg, ug); rg = []; ug = [];
      cells.push({ kind: "ok", ref: R[i], got: U[j] });
      i++; j++;
    } else if (j >= m || (i < n && L[i + 1][j] >= L[i][j + 1])) rg.push(R[i++]);
    else ug.push(U[j++]);
  }
  flushGap(rg, ug);
  const counts: Record<CellKind, number> = { ok: 0, typo: 0, wrong: 0, missing: 0, extra: 0 };
  for (const c of cells) counts[c.kind]++;
  const score = n ? Math.max(0, Math.round(((counts.ok + 0.5 * counts.typo - 0.25 * counts.extra) / n) * 100)) : 0;
  return { cells, score: Math.min(100, score), counts, total: n };
}

/** Từ cần ôn: những từ nghe sai, thiếu hoặc viết sai chính tả. */
export const missedWords = (c: Compared) =>
  Array.from(new Set(c.cells.filter((x) => x.kind !== "ok" && x.kind !== "extra" && x.ref).map((x) => x.ref as string)));

/* ---------- Phát âm (giọng đọc của trình duyệt) ---------- */

let token = 0;

export const speechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  return window.speechSynthesis.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang));
}

/** Danh sách giọng nạp bất đồng bộ trên Chrome; gọi lại khi có thay đổi. */
export function watchVoices(cb: () => void): () => void {
  if (!speechSupported()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", cb);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", cb);
}

export type PlayOpts = {
  text: string;
  rate: number;
  voiceURI?: string;
  times?: number;      // số lần lặp
  gapMs?: number;      // nghỉ giữa các lần lặp
  onRound?: (round: number) => void;
  onEnd?: (completed: boolean) => void;
};

export function stopSpeech() {
  token++;
  if (speechSupported()) try { window.speechSynthesis.cancel(); } catch {}
}

/** Đọc `text` rồi lặp lại `times` lần. Gọi hàm trả về (hoặc stopSpeech) để dừng; lần phát mới tự ngắt lần cũ. */
export function play(o: PlayOpts): () => void {
  if (!speechSupported()) { o.onEnd?.(false); return () => {}; }
  const synth = window.speechSynthesis;
  const mine = ++token;
  synth.cancel();
  const voice = o.voiceURI ? synth.getVoices().find((v) => v.voiceURI === o.voiceURI) : undefined;
  const times = Math.max(1, o.times || 1);
  let round = 0;
  const once = () => {
    if (mine !== token) return;
    round++;
    o.onRound?.(round);
    const u = new SpeechSynthesisUtterance(o.text);
    u.lang = voice?.lang || "en-GB";
    if (voice) u.voice = voice;
    u.rate = o.rate;
    u.onend = () => {
      if (mine !== token) return;
      if (round < times) setTimeout(once, o.gapMs ?? 1500);
      else o.onEnd?.(true);
    };
    u.onerror = (e) => {
      if (mine !== token || e.error === "interrupted" || e.error === "canceled") return;
      o.onEnd?.(false);
    };
    synth.speak(u);
  };
  setTimeout(once, 60); // Chrome bỏ qua speak() gọi ngay sau cancel()
  return () => { if (mine === token) stopSpeech(); };
}

/* ---------- Lưu tiến độ ---------- */

export type Settings = { rate: number; voiceURI: string; times: number; gapSec: number; examMode: boolean };
export type Store = {
  settings: Settings;
  done: Record<string, { best: number; attempts: number; last: number }>;
  weak: Record<string, number>;
  days: Record<string, { n: number; sum: number }>;
  custom: string;
};

export const SPEEDS = [0.5, 0.75, 1, 1.25] as const;
export const EXAM_MAX_PLAYS = 2;

const KEY = "studia-dictation-v1";
export const EMPTY_STORE: Store = {
  settings: { rate: 1, voiceURI: "", times: 1, gapSec: 3, examMode: false },
  done: {}, weak: {}, days: {}, custom: "",
};

export function loadStore(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ...EMPTY_STORE, ...s, settings: { ...EMPTY_STORE.settings, ...(s.settings || {}) } };
  } catch { return EMPTY_STORE; }
}

export function saveStore(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Ghi kết quả một lượt chấm: điểm tốt nhất của đoạn, thống kê theo ngày và bộ đếm từ hay nghe sai. */
export function recordResult(store: Store, segId: string | null, score: number, missed: string[]): Store {
  const next: Store = { ...store, done: { ...store.done }, weak: { ...store.weak }, days: { ...store.days } };
  if (segId) {
    const prev = next.done[segId];
    next.done[segId] = { best: Math.max(prev?.best ?? 0, score), attempts: (prev?.attempts ?? 0) + 1, last: score };
  }
  const k = dayKey();
  const d = next.days[k] || { n: 0, sum: 0 };
  next.days[k] = { n: d.n + 1, sum: d.sum + score };
  for (const w of missed) next.weak[w] = (next.weak[w] || 0) + 1;
  return next;
}
