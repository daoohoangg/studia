"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SKILL_ORDER, SKILL_LABEL, countLabel, groupSeries, matchesQuery, type LibraryTest } from "@/lib/examConfig";

export type TestStat = { best: number | null; attempts: number };
type Filter = "all" | "builtin" | "mine";

/** Thư viện đề: tìm kiếm, lọc nguồn, gom theo bộ đề (Cambridge IELTS 21, ...), mỗi đề là một thẻ chọn được. */
export default function TestLibrary({ tests, selectedKey, onSelect, stats, loading }: {
  tests: LibraryTest[]; selectedKey: string | null; onSelect: (t: LibraryTest) => void;
  stats: Record<string, TestStat>; loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => tests.filter((t) =>
    matchesQuery(t, query) && (filter === "all" || (filter === "mine" ? t.source === "mine" : t.source !== "mine"))), [tests, query, filter]);
  const series = useMemo(() => groupSeries(shown), [shown]);
  const mineCount = tests.filter((t) => t.source === "mine").length;

  return (
    <section className="st-card" aria-labelledby="lib-h">
      <div className="sec-head">
        <h2 id="lib-h" className="sec-title">Thư viện đề</h2>
        <span className="meta">{tests.length} đề · {groupSeries(tests).length} bộ</span>
      </div>

      <div className="el-tools">
        <div className="el-search">
          <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm đề, ví dụ: Cambridge 21 Test 2" aria-label="Tìm đề" />
        </div>
        <div className="seg" role="radiogroup" aria-label="Nguồn đề">
          {([["all", "Tất cả"], ["builtin", "Có sẵn"], ["mine", `Của bạn${mineCount ? ` (${mineCount})` : ""}`]] as [Filter, string][]).map(([k, label]) => (
            <button key={k} className="seg-btn" type="button" role="radio" aria-checked={filter === k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
      </div>

      {loading && tests.length === 0 && <div className="skeleton" style={{ height: 120, marginTop: 16 }} />}

      {series.map((s) => (
        <div key={s.name} role="radiogroup" aria-label={s.name}>
          <div className="el-series-head">
            <h3 className="el-series-name">{s.name}</h3>
            <span className="meta">{s.tests.length} đề</span>
          </div>
          <div className="el-grid">
            {s.tests.map((t) => {
              const stat = stats[t.title];
              const label = t.order > 0 ? `Test ${t.order}` : t.title;
              return (
                <button key={t.key} type="button" role="radio" aria-checked={selectedKey === t.key} className="el-card" onClick={() => onSelect(t)}>
                  <span className="el-card-top">
                    <span>
                      <span className="el-card-title" style={{ display: "block" }}>{label}</span>
                      {t.order > 0 && <span className="el-card-sub">{t.series}</span>}
                    </span>
                    {stat?.best != null
                      ? <span className="st-badge st-badge-success" title={`Đã thi ${stat.attempts} lần`}>Band {stat.best.toFixed(1)}</span>
                      : stat?.attempts ? <span className="st-badge">Đã thi</span> : null}
                  </span>
                  <span className="el-chips" aria-label="Các phần có trong đề">
                    {SKILL_ORDER.map((k) => (
                      <span key={k} className={`el-chip ${t.sections.includes(k) ? "" : "el-chip-off"}`}>
                        {SKILL_LABEL[k].slice(0, 1)}{t.counts[k] ? ` · ${countLabel(k, t.counts[k])}` : ""}
                      </span>
                    ))}
                    {t.hasAudio && <span className="el-chip">Có audio</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!loading && series.length === 0 && (
        <p className="el-empty">
          {query ? `Không có đề nào khớp “${query}”.` : filter === "mine"
            ? <>Bạn chưa có đề riêng. Mở một cuốn sách đề trong <Link className="link" href="/books">Thư viện</Link> rồi chọn “Dựng đề thi”.</>
            : "Chưa có đề nào."}
        </p>
      )}
    </section>
  );
}
