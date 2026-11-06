"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { API, apiFetch } from "@/lib/api";
import { allDemoResults } from "@/lib/demoResults";
import { buildStats, classify, levelOf, typeLabel, type TypeStat } from "@/lib/examStats";

const MAX_FETCH = 30;
const CLS_COLOR = { strong: "var(--success)", ok: "var(--brand)", weak: "var(--danger)", few: "var(--ink-muted)" } as const;
const CLS_TEXT = { strong: "Thế mạnh", ok: "Trung bình", weak: "Điểm yếu", few: "Chưa đủ câu" } as const;
const fmt = (b: number | null | undefined) => (b == null ? "—" : b.toFixed(1));

function TypeBars({ rows }: { rows: TypeStat[] }) {
  if (!rows.length) return <p className="meta">Chưa có dữ liệu theo dạng bài.</p>;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((r) => {
        const c = classify(r);
        return (
          <div key={r.type}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, marginBottom: 4 }}>
              <span style={{ color: "var(--ink)" }}>{typeLabel(r.type)}</span>
              <span className="meta"><b className="num" style={{ color: CLS_COLOR[c] }}>{r.pct}%</b> · {r.correct}/{r.total} câu · {CLS_TEXT[c]}</span>
            </div>
            <div role="img" aria-label={`${typeLabel(r.type)}: ${r.pct}% đúng`} style={{ height: 8, borderRadius: 4, background: "var(--surface-sunken)", overflow: "hidden" }}>
              <div style={{ width: `${r.pct}%`, height: "100%", background: CLS_COLOR[c], borderRadius: 4 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BandChart({ points }: { points: { label: string; v: number }[] }) {
  if (points.length < 2) return <p className="meta">Cần ít nhất 2 lần thi có điểm để vẽ biểu đồ tiến bộ.</p>;
  const W = 640, H = 180, P = 28;
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v: number) => H - P - (v / 9) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Biểu đồ Overall band qua các lần thi">
      {[3, 5, 7, 9].map((g) => (
        <g key={g}>
          <line x1={P} x2={W - P} y1={y(g)} y2={y(g)} stroke="var(--hairline)" />
          <text x={4} y={y(g) + 4} fontSize="11" fill="var(--ink-muted)">{g}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.v)} r="4" fill="var(--brand)" />
          <text x={x(i)} y={y(p.v) - 10} fontSize="11" textAnchor="middle" fill="var(--ink)">{p.v.toFixed(1)}</text>
        </g>
      ))}
    </svg>
  );
}

export default function ExamStatsPage() {
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let server: any[] = [];
      try {
        const res = await apiFetch(`${API}/exam/sessions?limit=40`);
        if (!res.ok) throw new Error();
        const rows = ((await res.json()).sessions || [])
          .filter((s: any) => s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED").slice(0, MAX_FETCH);
        const got = await Promise.all(rows.map((s: any) =>
          apiFetch(`${API}/exam/sessions/${s.session_id}/result`).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
        server = got.filter(Boolean);
      } catch { if (alive) setError(true); }
      if (alive) setResults([...server, ...allDemoResults()]);
    })();
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => (results ? buildStats(results) : null), [results]);

  const scored = stats ? [stats.skillBands.listening, stats.skillBands.reading].filter((b): b is number => b != null) : [];
  const levelBand = scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 2) / 2 : null;
  const level = levelOf(stats?.avgOverall ?? levelBand);
  const weak = stats?.allTypes.filter((s) => classify(s) === "weak").slice(0, 4) || [];
  const strong = [...(stats?.allTypes || [])].reverse().filter((s) => classify(s) === "strong").slice(0, 4);
  const overallPct = stats && stats.totalAnswered ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : null;
  const blankTotal = stats?.allTypes.reduce((a, s) => a + s.blank, 0) || 0;

  return (
    <div className="wrap stagger">
      <header className="page-head">
        <div>
          <h1 className="page-title">Thống kê thi thử</h1>
          <p className="page-sub">Tổng hợp mọi lần bạn đã nộp bài: trình độ ước lượng, độ chính xác, thế mạnh và điểm yếu theo từng dạng bài.</p>
        </div>
        <Link className="st-btn st-btn-secondary st-btn-sm" href="/exam">Về trang thi thử</Link>
      </header>

      {!stats ? (
        <div className="grid-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div>
      ) : stats.attempts.length === 0 ? (
        <section className="st-card">
          <p style={{ color: "var(--ink)" }}>Bạn chưa nộp bài thi thử nào{error ? " (không tải được lịch sử từ máy chủ)" : ""}.</p>
          <p className="meta">Làm một đề Listening hoặc Reading rồi nộp bài, thống kê sẽ xuất hiện ở đây.</p>
          <Link className="st-btn st-btn-primary st-btn-sm" href="/exam" style={{ marginTop: 12, display: "inline-flex" }}>Chọn đề để thi</Link>
        </section>
      ) : (
        <>
          <section className="grid-4" aria-label="Số liệu chính">
            <div className="st-stat"><div className="st-stat-top">Số lần đã thi</div><div className="st-stat-value">{stats.attempts.length}</div><div className="st-stat-hint">{stats.totalAnswered} câu Listening + Reading</div></div>
            <div className="st-stat"><div className="st-stat-top">Band gần nhất</div><div className="st-stat-value">{fmt(stats.latestOverall)}</div>
              <div className="st-stat-hint">{stats.trend == null ? `Tốt nhất ${fmt(stats.bestOverall)}` : `${stats.trend > 0 ? "▲ +" : stats.trend < 0 ? "▼ " : "= "}${stats.trend.toFixed(1)} so với các lần trước`}</div></div>
            <div className="st-stat st-stat-success"><div className="st-stat-top">Độ chính xác</div><div className="st-stat-value">{overallPct ?? "—"}<small>{overallPct != null ? "%" : ""}</small></div><div className="st-stat-hint">{stats.totalCorrect}/{stats.totalAnswered} câu đúng</div></div>
            <div className="st-stat st-stat-accent"><div className="st-stat-top">Câu bỏ trống</div><div className="st-stat-value">{blankTotal}</div><div className="st-stat-hint">{blankTotal ? "Nên đoán thay vì để trống — không bị trừ điểm" : "Bạn luôn trả lời đủ"}</div></div>
          </section>

          <section className="st-card" aria-labelledby="lv-h">
            <div className="sec-head"><h2 id="lv-h" className="sec-title">Đánh giá trình độ</h2></div>
            <p style={{ color: "var(--ink)", fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>
              Band ước lượng {fmt(stats.avgOverall ?? levelBand)} — {level.label}
            </p>
            <p className="meta" style={{ marginBottom: 14 }}>{level.note} Tính từ trung bình điểm các lần thi đã nộp; chỉ mang tính tham khảo.</p>
            <div className="grid-4">
              {(["listening", "reading", "writing", "speaking"] as const).map((k) => (
                <div key={k} className="sr-skill"><span className="label" style={{ textTransform: "capitalize" }}>{k}</span><b className="sr-s num">{fmt(stats.skillBands[k])}</b>
                  <span className="meta">{k === "speaking" ? "Chưa chấm tự động" : "Trung bình các lần"}</span></div>
              ))}
            </div>
          </section>

          <section className="st-card" aria-labelledby="tr-h">
            <div className="sec-head"><h2 id="tr-h" className="sec-title">Tiến bộ qua các lần thi</h2></div>
            <BandChart points={stats.attempts.filter((a) => a.overall != null).map((a) => ({ label: a.title, v: a.overall as number }))} />
          </section>

          <section className="grid-2" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <div className="st-card">
              <div className="sec-head"><h2 className="sec-title">Thế mạnh</h2></div>
              {strong.length ? <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>{strong.map((s) => <li key={s.type}>{typeLabel(s.type)} — <b className="num">{s.pct}%</b> <span className="meta">({s.correct}/{s.total})</span></li>)}</ul>
                : <p className="meta">Chưa có dạng bài nào đạt ≥ 75% với tối thiểu 5 câu.</p>}
            </div>
            <div className="st-card">
              <div className="sec-head"><h2 className="sec-title">Điểm yếu cần luyện</h2></div>
              {weak.length ? <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>{weak.map((s) => <li key={s.type}>{typeLabel(s.type)} — <b className="num" style={{ color: "var(--danger)" }}>{s.pct}%</b> <span className="meta">({s.correct}/{s.total}){s.blank ? `, bỏ trống ${s.blank}` : ""}</span></li>)}</ul>
                : <p className="meta">Chưa có dạng bài nào dưới 55% với tối thiểu 5 câu.</p>}
            </div>
          </section>

          {(["listening", "reading"] as const).map((k) => stats.bySkill[k].total > 0 && (
            <section key={k} className="st-card" aria-label={`Theo dạng bài ${k}`}>
              <div className="sec-head">
                <h2 className="sec-title" style={{ textTransform: "capitalize" }}>{k} theo dạng bài</h2>
                <span className="meta">Đúng {stats.bySkill[k].correct}/{stats.bySkill[k].total} ({stats.bySkill[k].pct}%)</span>
              </div>
              <TypeBars rows={stats.bySkill[k].types} />
            </section>
          ))}

          <section className="st-card" aria-labelledby="hs-h">
            <div className="sec-head"><h2 id="hs-h" className="sec-title">Các lần đã làm</h2></div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr className="meta" style={{ textAlign: "left" }}>
                  <th style={{ padding: "6px 8px" }}>Đề</th><th>Ngày</th><th>L</th><th>R</th><th>W</th><th>Overall</th>
                </tr></thead>
                <tbody>
                  {[...stats.attempts].reverse().map((a) => (
                    <tr key={a.key} style={{ borderTop: "1px solid var(--hairline)" }}>
                      <td style={{ padding: "8px" }}>{a.title}{a.mode === "practice" ? " · luyện tập" : ""}</td>
                      <td>{a.date ? new Date(a.date).toLocaleDateString("vi-VN") : "—"}</td>
                      <td className="num">{fmt(a.listening)}{a.listeningPct != null ? ` (${a.listeningPct}%)` : ""}</td>
                      <td className="num">{fmt(a.reading)}{a.readingPct != null ? ` (${a.readingPct}%)` : ""}</td>
                      <td className="num">{fmt(a.writing)}</td>
                      <td className="num"><b>{fmt(a.overall)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
