export type Section = "vocab" | "grammar" | "reading" | "listening";

export type PQuestion = {
  section: Section;
  level: 1 | 2 | 3;
  prompt: string;
  options: string[];
  answer: number;
  passage?: { title: string; text: string };
  audio?: string; // văn bản đọc bằng giọng máy cho phần Nghe
};

export const SECTION_LABEL: Record<Section, string> = {
  vocab: "Từ vựng", grammar: "Ngữ pháp", reading: "Đọc hiểu", listening: "Nghe",
};

const WFH = {
  title: "Working from home",
  text: "Since 2020, the number of people working from home has risen sharply. Supporters argue that it saves commuting time and allows employees to organise their day more flexibly. However, some managers worry that remote staff miss out on informal conversations, which are often where new ideas begin.",
};
const CITY = {
  title: "Urban bees",
  text: "Early data suggest that colonies kept in cities produce more honey than those in intensively farmed countryside, partly because urban gardens offer a longer flowering season. Researchers caution, however, that pollution may affect long-term hive health.",
};

export const BANK: PQuestion[] = [
  // Từ vựng
  { section: "vocab", level: 1, prompt: "Chọn từ đúng: The air in big cities is often ______.", options: ["polluted", "pollute", "pollution", "polluting"], answer: 0 },
  { section: "vocab", level: 1, prompt: "“Reduce” có nghĩa gần nhất với:", options: ["increase", "decrease", "continue", "create"], answer: 1 },
  { section: "vocab", level: 2, prompt: "Governments should ______ renewable energy through tax incentives.", options: ["promote", "prevent", "pretend", "postpone"], answer: 0 },
  { section: "vocab", level: 2, prompt: "A ______ is a gradual change in a long-term pattern.", options: ["trend", "trial", "tribe", "trick"], answer: 0 },
  { section: "vocab", level: 3, prompt: "The new policy had a ______ effect on small businesses, forcing many to close.", options: ["detrimental", "negligible", "beneficial", "ambiguous"], answer: 0 },
  { section: "vocab", level: 3, prompt: "“Mitigate” có nghĩa gần nhất với:", options: ["worsen", "alleviate", "ignore", "measure"], answer: 1 },
  // Ngữ pháp
  { section: "grammar", level: 1, prompt: "She ______ to school every day.", options: ["go", "goes", "going", "gone"], answer: 1 },
  { section: "grammar", level: 1, prompt: "I ______ visited Hoi An last summer.", options: ["have", "has", "had", "did"], answer: 3 },
  { section: "grammar", level: 2, prompt: "She ______ in Da Nang since 2019.", options: ["lived", "has lived", "is living", "lives"], answer: 1 },
  { section: "grammar", level: 2, prompt: "If I ______ more time, I would learn another language.", options: ["have", "had", "will have", "would have"], answer: 1 },
  { section: "grammar", level: 3, prompt: "The book, ______ was published in 2010, became a bestseller.", options: ["that", "what", "which", "who"], answer: 2 },
  { section: "grammar", level: 3, prompt: "Not only ______ the exam, but she also won a scholarship.", options: ["she passed", "did she pass", "she did pass", "passed she"], answer: 1 },
  // Đọc hiểu
  { section: "reading", level: 1, prompt: "Theo đoạn văn, số người làm việc tại nhà đã:", options: ["giảm mạnh", "tăng mạnh", "không đổi", "không rõ"], answer: 1, passage: WFH },
  { section: "reading", level: 2, prompt: "Theo đoạn văn, vì sao một số quản lý lo ngại về làm việc tại nhà?", options: ["Nhân viên đi lại nhiều hơn", "Nhân viên ít trò chuyện không chính thức", "Nhân viên làm ít giờ hơn", "Đoạn văn không nói đến"], answer: 1, passage: WFH },
  { section: "reading", level: 2, prompt: "“Flexibly” trong đoạn văn gần nghĩa nhất với:", options: ["in a fixed way", "in an adaptable way", "in a slow way", "in a costly way"], answer: 1, passage: WFH },
  { section: "reading", level: 2, prompt: "Vì sao ong thành phố có thể cho nhiều mật hơn?", options: ["Ít sâu bệnh", "Mùa hoa dài hơn", "Ít ô nhiễm", "Tổ lớn hơn"], answer: 1, passage: CITY },
  { section: "reading", level: 3, prompt: "Câu “City bees are healthier than rural bees” so với đoạn văn là:", options: ["True", "False", "Not given", "Partly true"], answer: 2, passage: CITY },
  { section: "reading", level: 3, prompt: "Thái độ của tác giả về ong đô thị là:", options: ["Hoàn toàn lạc quan", "Thận trọng", "Phản đối", "Thờ ơ"], answer: 1, passage: CITY },
  // Nghe
  { section: "listening", level: 1, prompt: "Số điện thoại người nói đọc là gì?", options: ["0912 345 678", "0912 345 687", "0921 345 678", "0912 354 678"], answer: 0, audio: "My phone number is zero nine one two, three four five, six seven eight." },
  { section: "listening", level: 1, prompt: "Cuộc hẹn diễn ra vào ngày nào?", options: ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm"], answer: 2, audio: "The appointment is on Wednesday at ten thirty in the morning." },
  { section: "listening", level: 2, prompt: "Tên người đặt phòng được đánh vần là gì?", options: ["Nguyen", "Nguyan", "Nguyem", "Ngyuen"], answer: 0, audio: "The booking is under the name Nguyen. That's N, G, U, Y, E, N." },
  { section: "listening", level: 2, prompt: "Phòng hội thảo chứa được bao nhiêu người?", options: ["40", "14", "50", "15"], answer: 0, audio: "The conference room can hold forty people, though fourteen is more comfortable for discussions." },
  { section: "listening", level: 3, prompt: "Tỷ lệ người dùng tăng bao nhiêu phần trăm?", options: ["13%", "30%", "60%", "16%"], answer: 1, audio: "Usage rose by thirty percent last year, compared with just thirteen percent the year before." },
  { section: "listening", level: 3, prompt: "Tại sao chuyến đi bị hoãn?", options: ["Thời tiết xấu", "Thiếu kinh phí", "Giáo viên bị ốm", "Lỗi đặt vé"], answer: 0, audio: "Unfortunately the field trip has been postponed because of the forecast of heavy rain on Friday." },
];

export type Answers = Record<number, number | null>; // null = bỏ qua

export function scoreAnswers(answers: Answers) {
  const per: Record<Section, { right: number; total: number }> = {
    vocab: { right: 0, total: 0 }, grammar: { right: 0, total: 0 },
    reading: { right: 0, total: 0 }, listening: { right: 0, total: 0 },
  };
  let w = 0, wTotal = 0;
  BANK.forEach((q, i) => {
    per[q.section].total++;
    wTotal += q.level;
    if (answers[i] === q.answer) { per[q.section].right++; w += q.level; }
  });
  const pct = wTotal ? w / wTotal : 0;
  const steps: [number, number][] = [[0.2, 4.5], [0.35, 5.0], [0.5, 5.5], [0.65, 6.0], [0.78, 6.5], [0.9, 7.0]];
  const band = (steps.find(([t]) => pct < t)?.[1]) ?? 7.5;
  return { per, pct, band };
}

export type Profile = {
  purpose: string; kind: "Academic" | "General Training"; target: number;
  examDate: string; noExam: boolean; level: string;
  minutes: number; days: string[]; remindAt: string;
  completedAt?: string;
};

export const DEFAULT_PROFILE: Profile = {
  purpose: "Du học", kind: "Academic", target: 7.0, examDate: "", noExam: true, level: "5.5–6.0",
  minutes: 30, days: ["T2", "T3", "T4", "T5", "T6"], remindAt: "20:30",
};

const KEY = "studia-profile";
const RES = "studia-placement";

export function loadProfile(): Profile {
  try { return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEFAULT_PROFILE; }
}
export function saveProfile(p: Profile) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} }
export function loadPlacement(): { band: number; per: ReturnType<typeof scoreAnswers>["per"]; at: string } | null {
  try { return JSON.parse(localStorage.getItem(RES) || "null"); } catch { return null; }
}
export function savePlacement(r: { band: number; per: ReturnType<typeof scoreAnswers>["per"]; at: string }) {
  try { localStorage.setItem(RES, JSON.stringify(r)); } catch {}
}

export function weeksUntil(p: Profile): number {
  if (p.noExam || !p.examDate) return 12;
  const d = Math.ceil((new Date(p.examDate).getTime() - Date.now()) / (7 * 86400000));
  return Math.min(52, Math.max(2, d));
}

// ---- Đồng bộ với backend (/profile). localStorage chỉ là bản nháp tại máy. ----
import { apiFetch } from "@/lib/api";

export type PlacementResult = { band: number; per: ReturnType<typeof scoreAnswers>["per"]; at: string };

/** Lấy hồ sơ + kết quả mới nhất từ máy chủ; lỗi mạng thì dùng bản ở localStorage. */
export async function fetchServerProfile(): Promise<{ profile: Profile | null; placement: PlacementResult | null }> {
  try {
    const res = await apiFetch("/profile");
    if (res.ok) {
      const d = await res.json();
      if (d.profile) saveProfile({ ...DEFAULT_PROFILE, ...d.profile });
      if (d.placement) savePlacement(d.placement);
      return { profile: d.profile ? { ...DEFAULT_PROFILE, ...d.profile } : null, placement: d.placement || null };
    }
  } catch {}
  const local = loadProfile();
  return { profile: local.completedAt ? local : null, placement: loadPlacement() };
}

export async function pushServerProfile(p: Profile): Promise<boolean> {
  saveProfile(p);
  try {
    const res = await apiFetch("/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
    });
    return res.ok;
  } catch { return false; }
}

export async function pushServerPlacement(r: PlacementResult): Promise<boolean> {
  savePlacement(r);
  try {
    const res = await apiFetch("/profile/placement", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ band: r.band, per: r.per }),
    });
    return res.ok;
  } catch { return false; }
}
