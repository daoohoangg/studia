"use client";

import { apiFetch } from "@/lib/api";

export type Skill = "listening" | "reading" | "writing" | "speaking" | "vocab" | "grammar" | "review" | "other";

export const SKILLS: { id: Skill; label: string }[] = [
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
  { id: "writing", label: "Writing" },
  { id: "speaking", label: "Speaking" },
  { id: "vocab", label: "Từ vựng" },
  { id: "grammar", label: "Ngữ pháp" },
  { id: "review", label: "Ôn tập" },
  { id: "other", label: "Khác" },
];

export type DayStat = {
  tasks_total: number; tasks_done: number; plan_status: string | null;
  minutes: number; minutes_planned: number;
  slots: number; slots_done: number; moments: number; attempts: number;
  active: boolean; labels: string[];
};

export type Slot = {
  id: string; day: string; start: string; end: string; title: string; note: string;
  skill: Skill; status: "planned" | "done" | "skipped"; remind: boolean; minutes: number;
};

export type Moment = {
  id: string; day: string; caption: string; url: string | null; created_at: string;
  meta: { tasks_done?: number; tasks_total?: number; minutes?: number; slots_done?: number; streak?: number };
};

export type PlanTask = { type?: string; topic_name: string; duration_min: number; status: string };
export type DayDetail = {
  date: string;
  plan: { plan_date: string; tasks: PlanTask[]; total_minutes: number; status: string; adapted_reason?: string } | null;
  slots: Slot[]; moments: Moment[]; stats: Partial<DayStat>;
};

export type Streak = {
  current: number; days_since_active?: number | null; longest: number; today_done: boolean; at_risk: boolean; total_days: number;
  next_milestone: number | null; to_next_milestone: number;
  week: { date: string; active: boolean; minutes: number }[]; today: string;
};

export type ReminderStatus = { enabled: boolean; smtp_configured: boolean; lead_minutes: number; email: string | null };

// ---- ngày giờ (chuỗi YYYY-MM-DD theo giờ máy người dùng) ----
export const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const todayIso = () => iso(new Date());
export const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const addMonths = (s: string, n: number) => { const d = parse(s); d.setDate(1); d.setMonth(d.getMonth() + n); return iso(d); };
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
/** Thứ Hai = 0 … Chủ nhật = 6 */
export const weekdayIdx = (s: string) => (parse(s).getDay() + 6) % 7;
export const WEEKDAYS_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
export const WEEKDAYS_LONG = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"];
export const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
export const prettyDate = (s: string) => { const d = parse(s); return `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`; };
export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const fromMin = (n: number) => `${pad(Math.floor(n / 60) % 24)}:${pad(n % 60)}`;
export const fmtMinutes = (n: number) => (n >= 60 ? `${Math.floor(n / 60)} giờ${n % 60 ? ` ${n % 60} phút` : ""}` : `${n} phút`);

/** Mức tô đậm của ô lịch theo số phút đã học. */
export const heat = (minutes: number, active: boolean) => (!active ? 0 : minutes <= 0 ? 1 : minutes <= 20 ? 1 : minutes <= 45 ? 2 : minutes <= 90 ? 3 : 4);

// ---- gọi API ----
async function json<T>(res: Response, fallback: string): Promise<T> {
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof d.detail === "string" ? d.detail : fallback);
  return d as T;
}

export async function fetchSummary(start: string, end: string) {
  const r = await apiFetch(`/schedule/summary?start=${start}&end=${end}`, { cache: "no-store" });
  return (await json<{ days: Record<string, DayStat>; today: string }>(r, "Không tải được lịch")).days;
}
export async function fetchDay(day: string) {
  return json<DayDetail>(await apiFetch(`/schedule/day/${day}`, { cache: "no-store" }), "Không tải được ngày này");
}
export async function fetchStreak() {
  return json<Streak>(await apiFetch("/schedule/streak", { cache: "no-store" }), "Không tải được streak");
}
export async function fetchReminderStatus() {
  return json<ReminderStatus>(await apiFetch("/schedule/reminders/status", { cache: "no-store" }), "Không tải được trạng thái nhắc");
}
export async function sendTestReminder() {
  return json<{ sent: boolean; to: string }>(await apiFetch("/schedule/reminders/test", { method: "POST" }), "Không gửi được email thử");
}

export type SlotInput = { day: string; start: string; end: string; title: string; note: string; skill: Skill; remind: boolean };

export async function createSlot(body: SlotInput) {
  const r = await apiFetch("/schedule/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await json<{ slot: Slot }>(r, "Không lưu được khung giờ")).slot;
}
export async function updateSlot(id: string, body: Partial<SlotInput> & { status?: Slot["status"] }) {
  const r = await apiFetch(`/schedule/slots/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await json<{ slot: Slot }>(r, "Không lưu được khung giờ")).slot;
}
export async function deleteSlot(id: string) {
  await json(await apiFetch(`/schedule/slots/${id}`, { method: "DELETE" }), "Không xoá được khung giờ");
}
export async function setTaskStatus(day: string, idx: number, status: string) {
  const r = await apiFetch(`/learning-paths/plans/${day}/tasks/${idx}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  return json<{ tasks: PlanTask[]; status: string }>(r, "Không cập nhật được nhiệm vụ");
}
export async function addMoment(day: string, blob: Blob, caption: string) {
  const fd = new FormData();
  fd.append("day", day);
  fd.append("caption", caption);
  fd.append("file", blob, "moment.jpg");
  const r = await apiFetch("/schedule/moments", { method: "POST", body: fd });
  return (await json<{ moment: Moment }>(r, "Không lưu được ảnh")).moment;
}
export async function editMoment(id: string, caption: string) {
  const r = await apiFetch(`/schedule/moments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption }) });
  return (await json<{ moment: Moment }>(r, "Không lưu được chú thích")).moment;
}
export async function deleteMoment(id: string) {
  await json(await apiFetch(`/schedule/moments/${id}`, { method: "DELETE" }), "Không xoá được ảnh");
}

/** Thu nhỏ ảnh (cạnh dài tối đa `max` px) rồi xuất JPEG; trình duyệt không hỗ trợ thì trả nguyên tệp. */
export async function shrinkImage(file: Blob, max = 1600, quality = 0.85): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    return out || file;
  } catch {
    return file;
  }
}
