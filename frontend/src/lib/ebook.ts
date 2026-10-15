/** Kiểu dữ liệu & xử lý văn bản cho trình đọc ebook. Chữ in đậm lưu trong `text` dưới dạng `**đậm**`. */

export interface EbookBlock {
  id: string;
  order_index: number;
  page_number: number | null;
  block_type: "heading" | "paragraph" | "list_item" | "table";
  level: number | null;
  text: string;
  is_edited: boolean;
}

export interface EbookNote {
  id: string;
  block_id: string | null;
  quote: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface OutlineItem {
  block_id: string;
  level: number;
  text: string;
  page_number: number | null;
}

const MARK = "**";

/** Tách `text` thành các đoạn thường / đậm xen kẽ. Dấu `**` lẻ cuối cùng (không có cặp) được coi là chữ thường. */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  const parts = text.split(MARK);
  const balanced = parts.length % 2 === 1;
  return parts
    .map((part, i) => ({ text: part, bold: i % 2 === 1 && (balanced || i < parts.length - 1) }))
    .filter((part) => part.text.length > 0);
}

export function plainText(text: string): string {
  return text.split(MARK).join("");
}

/**
 * Đổi vị trí tính theo ký tự hiển thị sang vị trí trong chuỗi nguồn (có dấu `**`).
 * `edge = "start"` đặt vị trí sau các dấu `**` liền trước ký tự, `"end"` đặt trước chúng.
 */
export function plainToSourceIndex(source: string, plainIndex: number, edge: "start" | "end"): number {
  let i = 0;
  let seen = 0;
  while (i < source.length) {
    if (edge === "end" && seen === plainIndex) return i;
    if (source.startsWith(MARK, i)) {
      i += MARK.length;
      continue;
    }
    if (seen === plainIndex) return i;
    i += 1;
    seen += 1;
  }
  return i;
}

function insideBold(source: string, index: number): boolean {
  return (source.slice(0, index).split(MARK).length - 1) % 2 === 1;
}

/** Bật/tắt in đậm cho đoạn [start, end) của chuỗi nguồn, giữ các dấu `**` luôn đi thành cặp. */
export function toggleBold(source: string, start: number, end: number): string {
  if (end <= start) return source;
  const inner = source.slice(start, end);
  const startsBold = insideBold(source, start);
  const endsBold = insideBold(source, end);
  const cleaned = inner.split(MARK).join("");

  let result: string;
  if (startsBold && endsBold && !inner.includes(MARK)) {
    // Toàn bộ vùng chọn đang đậm → bỏ đậm
    result = source.slice(0, start) + MARK + cleaned + MARK + source.slice(end);
  } else {
    result = source.slice(0, start) + (startsBold ? "" : MARK) + cleaned + (endsBold ? "" : MARK) + source.slice(end);
  }
  return result.split(MARK + MARK).join("");
}

/** In đậm theo vùng chọn trên màn hình (vị trí tính theo ký tự hiển thị, bỏ khoảng trắng hai đầu). */
export function toggleBoldByPlainRange(source: string, plainStart: number, plainEnd: number): string {
  const plain = plainText(source);
  while (plainStart < plainEnd && /\s/.test(plain[plainStart])) plainStart += 1;
  while (plainEnd > plainStart && /\s/.test(plain[plainEnd - 1])) plainEnd -= 1;
  return toggleBold(
    source,
    plainToSourceIndex(source, plainStart, "start"),
    plainToSourceIndex(source, plainEnd, "end"),
  );
}

// ─── Tuỳ chỉnh hiển thị (lưu theo trình duyệt) ───────────────

export interface ReaderPrefs {
  fontSize: number;
  fontFamily: keyof typeof READER_FONTS;
  theme: keyof typeof READER_THEMES;
  lineHeight: number;
  width: keyof typeof READER_WIDTHS;
}

export const READER_FONTS = {
  serif: { label: "Có chân (Georgia)", css: "Georgia, 'Times New Roman', serif" },
  sans: { label: "Không chân", css: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" },
  book: { label: "Sách (Palatino)", css: "'Palatino Linotype', Palatino, 'Book Antiqua', serif" },
  readable: { label: "Dễ đọc (Verdana)", css: "Verdana, Tahoma, sans-serif" },
  mono: { label: "Đơn cách", css: "Consolas, 'Courier New', monospace" },
} as const;

export const READER_THEMES = {
  app: { label: "Theo ứng dụng", background: "var(--bg-card)", color: "var(--text-primary)", swatch: "linear-gradient(135deg, #fff 50%, #202020 50%)" },
  white: { label: "Trắng", background: "#ffffff", color: "#1f1f1f", swatch: "#ffffff" },
  sepia: { label: "Giấy cũ", background: "#f4ecd8", color: "#5b4636", swatch: "#f4ecd8" },
  green: { label: "Xanh dịu", background: "#dcebd8", color: "#2d3b2d", swatch: "#dcebd8" },
  gray: { label: "Xám", background: "#3a3a3c", color: "#e6e6e6", swatch: "#3a3a3c" },
  night: { label: "Đêm", background: "#121212", color: "#c9c5bd", swatch: "#121212" },
} as const;

export const READER_WIDTHS = {
  narrow: { label: "Hẹp", css: "560px" },
  medium: { label: "Vừa", css: "720px" },
  wide: { label: "Rộng", css: "940px" },
} as const;

export const DEFAULT_PREFS: ReaderPrefs = { fontSize: 18, fontFamily: "serif", theme: "app", lineHeight: 1.7, width: "medium" };
export const FONT_SIZE_RANGE = { min: 13, max: 32 };

const PREFS_KEY = "studia_reader_prefs";

export function loadPrefs(): ReaderPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    const prefs = { ...DEFAULT_PREFS, ...saved };
    if (!(prefs.fontFamily in READER_FONTS)) prefs.fontFamily = DEFAULT_PREFS.fontFamily;
    if (!(prefs.theme in READER_THEMES)) prefs.theme = DEFAULT_PREFS.theme;
    if (!(prefs.width in READER_WIDTHS)) prefs.width = DEFAULT_PREFS.width;
    prefs.fontSize = Math.min(FONT_SIZE_RANGE.max, Math.max(FONT_SIZE_RANGE.min, Number(prefs.fontSize) || DEFAULT_PREFS.fontSize));
    return prefs;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: ReaderPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch { /* chế độ riêng tư / bị chặn lưu trữ: bỏ qua */ }
}

// ─── Highlight lưu lâu dài ───────────────────────────────────

export const HIGHLIGHT_COLORS = ["yellow", "green", "cyan", "pink", "purple"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export const HIGHLIGHT_SWATCH: Record<HighlightColor, { bg: string; label: string }> = {
  yellow: { bg: "#fef08a", label: "Vàng" },
  green: { bg: "#bbf7d0", label: "Xanh lá" },
  cyan: { bg: "#bae6fd", label: "Xanh dương" },
  pink: { bg: "#fbcfe8", label: "Hồng" },
  purple: { bg: "#e9d5ff", label: "Tím" },
};

export interface EbookHighlight {
  id: string;
  block_id: string;
  start_offset: number;
  end_offset: number;
  color: HighlightColor;
  quote: string | null;
  created_at: string;
}

export interface SearchHit {
  block_id: string;
  page_number: number | null;
  block_type: string;
  snippet: string;
  match_start: number;
  match_length: number;
}

export interface BlockRevision {
  id: string;
  text: string;
  block_type: string | null;
  level: number | null;
  created_at: string;
}

export interface ResolvedHighlight {
  id: string;
  start: number;
  end: number;
  color: HighlightColor;
}

/**
 * Vị trí highlight trong chữ hiển thị hiện tại của khối. Khối đã bị sửa thì tìm lại đoạn đã tô theo
 * `quote` (lần xuất hiện gần vị trí cũ nhất); không tìm thấy → null (highlight "mồ côi", không vẽ).
 */
export function resolveHighlight(plain: string, h: EbookHighlight): ResolvedHighlight | null {
  const { start_offset: start, end_offset: end, quote } = h;
  if (end <= plain.length && (!quote || plain.slice(start, end) === quote)) {
    return { id: h.id, start, end, color: h.color };
  }
  if (!quote) return null;
  let best = -1;
  let from = 0;
  for (;;) {
    const at = plain.indexOf(quote, from);
    if (at < 0) break;
    if (best < 0 || Math.abs(at - start) < Math.abs(best - start)) best = at;
    from = at + 1;
  }
  return best < 0 ? null : { id: h.id, start: best, end: best + quote.length, color: h.color };
}

export interface Segment {
  text: string;
  bold: boolean;
  color: HighlightColor | null;
  highlightId: string | null;
}

/** Chia chữ của khối thành các đoạn theo ranh giới in đậm và highlight (highlight sau đè highlight trước). */
export function buildSegments(source: string, highlights: ResolvedHighlight[]): Segment[] {
  const plain = plainText(source);
  if (!plain) return [];

  const boldRanges: [number, number][] = [];
  let position = 0;
  for (const part of splitBold(source)) {
    if (part.bold) boldRanges.push([position, position + part.text.length]);
    position += part.text.length;
  }

  const clamp = (n: number) => Math.min(plain.length, Math.max(0, n));
  const cuts = new Set<number>([0, plain.length]);
  boldRanges.forEach(([a, b]) => { cuts.add(a); cuts.add(b); });
  highlights.forEach((h) => { cuts.add(clamp(h.start)); cuts.add(clamp(h.end)); });
  const points = Array.from(cuts).sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [from, to] = [points[i], points[i + 1]];
    if (to <= from) continue;
    const bold = boldRanges.some(([a, b]) => from >= a && to <= b);
    let covering: ResolvedHighlight | null = null;
    for (const h of highlights) if (h.start <= from && h.end >= to) covering = h;
    const color = covering ? covering.color : null;
    const highlightId = covering ? covering.id : null;
    const last = segments[segments.length - 1];
    if (last && last.bold === bold && last.color === color && last.highlightId === highlightId) {
      last.text += plain.slice(from, to);
    } else {
      segments.push({ text: plain.slice(from, to), bold, color, highlightId });
    }
  }
  return segments;
}
