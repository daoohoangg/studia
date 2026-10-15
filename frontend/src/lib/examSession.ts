/** Phiên thi phía trình duyệt: lưu từng câu trả lời lên server (gộp theo câu, thử lại khi lỗi). */
import { API, apiFetch } from "@/lib/api";

const JSON_HEADERS = { "Content-Type": "application/json" };
const ANSWER_DEBOUNCE_MS = 400;
const WRITING_DEBOUNCE_MS = 2500;

export interface AnswerSaver {
  save(section: "listening" | "reading", number: number, value: any): void;
  saveWriting(task: "task1" | "task2", content: string): void;
  /** Gửi ngay mọi thay đổi còn chờ; resolve khi xong (kể cả khi một số lần gửi thất bại). */
  flush(): Promise<void>;
  /** Số lần gửi thất bại chưa được gửi lại thành công. */
  failures(): number;
  dispose(): void;
}

export function createAnswerSaver(sessionId: string, onStatus?: (failures: number) => void): AnswerSaver {
  const base = `${API}/exam/sessions/${sessionId}`;
  const pending = new Map<string, { path: string; body: any }>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const lastSent = new Map<string, string>();
  const failed = new Set<string>();

  const send = async (key: string): Promise<void> => {
    const item = pending.get(key);
    if (!item) return;
    pending.delete(key);
    const fingerprint = JSON.stringify(item.body);
    if (lastSent.get(key) === fingerprint && !failed.has(key)) return;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const res = await apiFetch(`${base}${item.path}`, {
          method: "POST", headers: JSON_HEADERS, body: JSON.stringify(item.body),
        });
        if (res.ok) {
          lastSent.set(key, fingerprint);
          failed.delete(key);
          onStatus?.(failed.size);
          return;
        }
        if (res.status === 409 || res.status === 404) break; // phiên đã nộp / không tồn tại: không thử lại
      } catch { /* mạng lỗi: thử lại */ }
    }
    failed.add(key);
    pending.set(key, item); // giữ lại để lần flush sau gửi lại
    onStatus?.(failed.size);
  };

  const schedule = (key: string, path: string, body: any, delay: number) => {
    pending.set(key, { path, body });
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(key, setTimeout(() => { timers.delete(key); void send(key); }, delay));
  };

  return {
    save(section, number, value) {
      schedule(`${section}_${number}`, "/answer", { section, question_number: number, answer: value ?? "" },
        ANSWER_DEBOUNCE_MS);
    },
    saveWriting(task, content) {
      schedule(`writing_${task}`, "/writing", { task, content }, WRITING_DEBOUNCE_MS);
    },
    async flush() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      await Promise.all(Array.from(pending.keys()).map((key) => send(key)));
    },
    failures: () => failed.size,
    dispose() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    },
  };
}

export async function postJson(path: string, body?: any): Promise<Response> {
  return apiFetch(`${API}${path}`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body ?? {}) });
}
