/** Tổng hợp thống kê từ các kết quả thi thử đã nộp (server + demo lưu trong trình duyệt). */

export const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple Choice", multiple_select: "Choose TWO/THREE letters", true_false_ng: "True / False / Not Given",
  yes_no_ng: "Yes / No / Not Given", matching_headings: "Matching Headings", matching_information: "Matching Information",
  matching_features: "Matching Features", sentence_completion: "Sentence Completion",
  summary_completion: "Summary Completion", note_completion: "Note Completion", table_completion: "Table Completion",
  form_completion: "Form Completion", flow_chart_completion: "Flow-chart Completion",
  diagram_labelling: "Diagram Labelling", map_labelling: "Map Labelling", short_answer: "Short Answer",
};
export const typeLabel = (t: string) => TYPE_LABELS[t] || t.replace(/_/g, " ");

export type Skill = "listening" | "reading";
export interface TypeStat { type: string; correct: number; total: number; blank: number; pct: number }
export interface AttemptRow {
  key: string; title: string; date: string; mode?: string; overall: number | null;
  listening: number | null; reading: number | null; writing: number | null; speaking: number | null;
  listeningPct: number | null; readingPct: number | null;
}
export interface ExamStats {
  attempts: AttemptRow[];            // cũ → mới
  bySkill: Record<Skill, { correct: number; total: number; pct: number; types: TypeStat[] }>;
  allTypes: TypeStat[];              // gộp mọi kỹ năng, yếu → mạnh
  skillBands: Record<"listening" | "reading" | "writing" | "speaking", number | null>; // trung bình
  latestOverall: number | null; bestOverall: number | null; avgOverall: number | null;
  trend: number | null;              // 3 lần gần nhất so với các lần trước
  totalAnswered: number; totalCorrect: number;
}

const MIN_SAMPLE = 5; // cần tối thiểu ngần ấy câu mới kết luận mạnh/yếu

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const half = (x: number) => Math.round(x * 2) / 2;

export function buildStats(results: any[]): ExamStats {
  const done = results
    .filter((r) => r && (r.status === "SUBMITTED" || r.status === "AUTO_SUBMITTED"))
    .sort((a, b) => String(a.submitted_at || "").localeCompare(String(b.submitted_at || "")));

  const acc: Record<Skill, Record<string, TypeStat>> = { listening: {}, reading: {} };
  const attempts: AttemptRow[] = [];
  const bands: Record<string, number[]> = { listening: [], reading: [], writing: [], speaking: [], overall: [] };

  done.forEach((r, i) => {
    const sr = r.section_results || {};
    const pctOf = (s: Skill) => {
      const x = sr[s];
      return x && x.total ? Math.round(((x.raw_score ?? 0) / x.total) * 100) : null;
    };
    const band = (s: string) => (typeof sr[s]?.band === "number" ? (sr[s].band as number) : null);
    for (const s of ["listening", "reading", "writing", "speaking"]) { const b = band(s); if (b != null) bands[s].push(b); }
    if (typeof r.overall_band === "number") bands.overall.push(r.overall_band);

    for (const skill of ["listening", "reading"] as Skill[]) {
      for (const it of r.review?.[skill] || []) {
        if (!it.type) continue;
        const s = (acc[skill][it.type] ||= { type: it.type, correct: 0, total: 0, blank: 0, pct: 0 });
        s.total += 1;
        if (it.is_correct) s.correct += 1;
        if (!String(it.user_answer ?? "").trim()) s.blank += 1;
      }
    }
    attempts.push({
      key: String(r.session_id || "") + i, title: r.title || "Phiên thi", date: r.submitted_at || "", mode: r.session_mode,
      overall: typeof r.overall_band === "number" ? r.overall_band : null,
      listening: band("listening"), reading: band("reading"), writing: band("writing"), speaking: band("speaking"),
      listeningPct: pctOf("listening"), readingPct: pctOf("reading"),
    });
  });

  const finish = (m: Record<string, TypeStat>) => Object.values(m).map((s) => ({ ...s, pct: s.total ? Math.round((s.correct / s.total) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total);
  const sum = (m: Record<string, TypeStat>, k: "correct" | "total") => Object.values(m).reduce((a, s) => a + s[k], 0);

  const mk = (skill: Skill) => {
    const types = finish(acc[skill]);
    const correct = sum(acc[skill], "correct"), total = sum(acc[skill], "total");
    return { correct, total, pct: total ? Math.round((correct / total) * 100) : 0, types };
  };

  // Gộp theo dạng bài, bất kể kỹ năng
  const merged: Record<string, TypeStat> = {};
  for (const skill of ["listening", "reading"] as Skill[]) {
    for (const s of Object.values(acc[skill])) {
      const m = (merged[s.type] ||= { type: s.type, correct: 0, total: 0, blank: 0, pct: 0 });
      m.correct += s.correct; m.total += s.total; m.blank += s.blank;
    }
  }

  const overall = bands.overall;
  const recent = overall.slice(-3), before = overall.slice(0, -3);
  const trend = recent.length && before.length ? half(avg(recent)!) - half(avg(before)!) : null;
  const a = (k: string) => { const v = avg(bands[k]); return v == null ? null : half(v); };

  return {
    attempts, bySkill: { listening: mk("listening"), reading: mk("reading") }, allTypes: finish(merged),
    skillBands: { listening: a("listening"), reading: a("reading"), writing: a("writing"), speaking: a("speaking") },
    latestOverall: overall.length ? overall[overall.length - 1] : null,
    bestOverall: overall.length ? Math.max(...overall) : null,
    avgOverall: a("overall"),
    trend: trend == null ? null : Math.round(trend * 2) / 2,
    totalAnswered: sum(merged, "total"), totalCorrect: sum(merged, "correct"),
  };
}

/** Phân loại dạng bài: mạnh ≥ 75%, yếu < 55%, còn lại trung bình; cần đủ mẫu mới kết luận. */
export function classify(s: TypeStat): "strong" | "ok" | "weak" | "few" {
  if (s.total < MIN_SAMPLE) return "few";
  return s.pct >= 75 ? "strong" : s.pct < 55 ? "weak" : "ok";
}

export function levelOf(band: number | null) {
  if (band == null) return { label: "Chưa đủ dữ liệu", note: "Hãy hoàn thành ít nhất một đề Listening hoặc Reading để có đánh giá." };
  if (band >= 8) return { label: "Rất tốt (Very good)", note: "Gần như thành thạo, chỉ còn lỗi nhỏ về bẫy và độ chính xác." };
  if (band >= 7) return { label: "Tốt (Good)", note: "Đạt yêu cầu của hầu hết chương trình đại học và du học." };
  if (band >= 6) return { label: "Khá (Competent)", note: "Xử lý được phần lớn bài thi; cần cải thiện các dạng bài còn yếu." };
  if (band >= 5) return { label: "Trung bình (Modest)", note: "Hiểu ý chính nhưng còn sai nhiều ở chi tiết và dạng bài khó." };
  return { label: "Cơ bản (Limited)", note: "Nên củng cố từ vựng, ngữ pháp và làm quen từng dạng bài trước khi thi cả đề." };
}
