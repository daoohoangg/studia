/** Cấu hình một lượt thi: chế độ, phần thi, thời gian; và gom các đề trong thư viện thành bộ sách. */
import builtinExams from "@/data/builtin_exams.json";

export type Skill = "listening" | "reading" | "writing" | "speaking";
export type RoomMode = "real" | "practice";
export type ExamKind = "academic" | "general";

export const SKILL_ORDER: Skill[] = ["listening", "reading", "writing", "speaking"];
export const SKILL_LABEL: Record<Skill, string> = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" };
export const STANDARD_MINUTES: Record<Skill, number> = { listening: 30, reading: 60, writing: 60, speaking: 15 };
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 240;

export type ExamConfig = {
  mode: RoomMode;
  kind: ExamKind;
  picked: Record<Skill, boolean>;
  minutes: Record<Skill, number>;
  untimed: boolean;
};

export const DEFAULT_CONFIG: ExamConfig = {
  mode: "real",
  kind: "academic",
  picked: { listening: true, reading: true, writing: true, speaking: true },
  minutes: { ...STANDARD_MINUTES },
  untimed: false,
};

export type LibraryTest = {
  key: string;
  title: string;
  series: string;
  order: number;
  source: "builtin" | "mine" | "sample";
  setId?: string;
  demoType?: string;
  sections: Skill[];
  counts: Partial<Record<Skill, number>>;
  hasAudio: boolean;
  createdAt?: string;
};

const STORAGE_KEY = "studia-exam-config-v1";

export function loadConfig(): ExamConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw) return DEFAULT_CONFIG;
    const minutes = { ...STANDARD_MINUTES };
    for (const s of SKILL_ORDER) {
      const m = Number(raw.minutes?.[s]);
      if (m >= MIN_MINUTES && m <= MAX_MINUTES) minutes[s] = Math.round(m);
    }
    return {
      mode: raw.mode === "practice" ? "practice" : "real",
      kind: raw.kind === "general" ? "general" : "academic",
      picked: { ...DEFAULT_CONFIG.picked, ...(raw.picked || {}) },
      minutes,
      untimed: raw.mode === "practice" && !!raw.untimed,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(c: ExamConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch {}
}

/** Các phần được chọn mà đề này thực sự có. */
export function activeSections(c: ExamConfig, test: LibraryTest | null): Skill[] {
  return SKILL_ORDER.filter((s) => c.picked[s] && (!test || test.sections.includes(s)));
}

export function totalMinutes(c: ExamConfig, test: LibraryTest | null): number {
  return activeSections(c, test).reduce((n, s) => n + c.minutes[s], 0);
}

export function isStandardTiming(c: ExamConfig, test: LibraryTest | null): boolean {
  return activeSections(c, test).every((s) => c.minutes[s] === STANDARD_MINUTES[s]);
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} phút`;
  return `${Math.floor(min / 60)} giờ${min % 60 ? ` ${min % 60} phút` : ""}`;
}

/** "Cambridge IELTS 21 - Test 3" → { series: "Cambridge IELTS 21", order: 3 }; không có "Test N" thì cả tên là bộ đề. */
export function splitTitle(title: string): { series: string; order: number } {
  const m = /^(.*?)[\s\-–—:·|,]*\bTest\s*(\d+)\s*$/i.exec(title.trim());
  if (m && m[1].trim()) return { series: m[1].trim(), order: Number(m[2]) };
  return { series: title.trim() || "Đề chưa đặt tên", order: 0 };
}

export type Series = { name: string; tests: LibraryTest[] };

export function groupSeries(tests: LibraryTest[]): Series[] {
  const map = new Map<string, LibraryTest[]>();
  for (const t of tests) map.set(t.series, [...(map.get(t.series) || []), t]);
  return Array.from(map, ([name, list]) => ({
    name,
    tests: list.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "vi", { numeric: true })),
  })).sort((a, b) => a.name.localeCompare(b.name, "vi", { numeric: true }));
}

export function matchesQuery(t: LibraryTest, q: string): boolean {
  const needle = q.trim().toLowerCase();
  return !needle || `${t.title} ${t.series}`.toLowerCase().includes(needle);
}

/**
 * Các bộ Cambridge dựng sẵn đang mở cho học viên. Danh sách duy nhất nằm ở `data/builtin_exams.json`
 * (test backend `test_builtin_exam_data.py` cũng đọc file này); bộ không có trong danh sách bị ẩn khỏi sảnh
 * và bị chặn khi mở thẳng URL, nhưng file dữ liệu vẫn giữ nguyên.
 */
export const BUILTIN_SERIES_NUMBERS: number[] = builtinExams.published_series;

/** demoType dạng "cambridge16_test2" có thuộc bộ đang mở không. */
export function isPublishedBuiltin(demoType: string): boolean {
  const m = /^cambridge(\d+)_test([1-4])$/.exec(demoType);
  return !!m && BUILTIN_SERIES_NUMBERS.includes(Number(m[1]));
}

export const BUILTIN_TESTS: LibraryTest[] = BUILTIN_SERIES_NUMBERS.flatMap((cam) =>
  [1, 2, 3, 4].map((n) => ({
    key: `builtin-cambridge${cam}-${n}`,
    title: `Cambridge IELTS ${cam} - Test ${n}`,
    series: `Cambridge IELTS ${cam}`,
    order: n,
    source: "builtin" as const,
    demoType: `cambridge${cam}_test${n}`,
    sections: [...SKILL_ORDER],
    counts: { listening: 40, reading: 40, writing: 2, speaking: 3 },
    hasAudio: true,
  }))
);

export const SAMPLE_TEST: LibraryTest = {
  key: "sample-studia",
  title: "Đề mẫu Studia",
  series: "Đề mẫu",
  order: 0,
  source: "sample",
  sections: [...SKILL_ORDER],
  counts: {},
  hasAudio: false,
};

export function testFromSet(s: any): LibraryTest {
  const { series, order } = splitTitle(String(s.title || ""));
  const sections = SKILL_ORDER.filter((k) => (s.sections || []).includes(k));
  return {
    key: `set-${s.id}`,
    title: s.title || "Đề chưa đặt tên",
    series, order,
    source: "mine",
    setId: s.id,
    sections: sections.length ? sections : (["listening", "reading"] as Skill[]).filter((k) => (s.stats?.[k] ?? 0) > 0),
    counts: { listening: s.stats?.listening, reading: s.stats?.reading, writing: s.stats?.writing_tasks, speaking: s.stats?.speaking_parts },
    hasAudio: !!s.has_audio,
    createdAt: s.created_at,
  };
}

/** Mô tả số lượng của một phần: "40 câu", "2 task", "3 part". */
export function countLabel(skill: Skill, n?: number): string {
  if (!n) return "";
  return skill === "writing" ? `${n} task` : skill === "speaking" ? `${n} part` : `${n} câu`;
}

/** Tham số đường dẫn cho phòng thi demo (đề dựng sẵn trong ứng dụng, chấm ở trình duyệt). */
export function demoQuery(test: LibraryTest, c: ExamConfig): string {
  const sections = activeSections(c, test);
  const p = new URLSearchParams({
    type: test.demoType || "full",
    sm: c.mode,
    kind: c.kind,
    sections: sections.join(","),
    mins: sections.map((s) => `${s}:${c.minutes[s]}`).join(","),
  });
  if (c.untimed && c.mode === "practice") p.set("untimed", "1");
  return p.toString();
}
