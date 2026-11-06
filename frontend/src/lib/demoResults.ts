/** Lưu kết quả các lần thi ở phòng thi demo (không có phiên trên máy chủ) vào trình duyệt, để xem lại trong Lịch sử làm bài. */
const KEY = "studia_demo_results_v1";
const MAX = 20;

export interface SavedDemoResult { id: string; saved_at: string; result: any }

function readAll(): SavedDemoResult[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export function saveDemoResult(result: any): string | null {
  try {
    const id = `d${Date.now().toString(36)}`;
    const list = [{ id, saved_at: new Date().toISOString(), result }, ...readAll()].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(list));
    return id;
  } catch { return null; }
}

export function allDemoResults(): any[] {
  return readAll().map((r) => r.result).filter(Boolean);
}

export function getDemoResult(id: string): any | null {
  return readAll().find((r) => r.id === id)?.result ?? null;
}

/** Dạng giống một dòng lịch sử từ máy chủ, kèm `href` để mở lại kết quả. */
export function demoHistoryRows(): any[] {
  return readAll().map((r) => ({
    session_id: `demo-${r.id}`,
    href: `/exam/demo?result=${r.id}`,
    title: r.result?.title,
    status: r.result?.status || "SUBMITTED",
    session_mode: r.result?.session_mode,
    sections: r.result?.sections,
    overall_band: r.result?.overall_band ?? null,
    created_at: r.saved_at,
  }));
}
