"use client";

import { useState, useEffect } from "react";
import EmptyState from "@/components/EmptyState";

import { API, apiFetch } from "@/lib/api";
import { Volume2, Search, Trash2 } from "lucide-react";
import Link from "next/link";

const SOURCE_LABELS: Record<string, string> = {
  lesson: "Bài học",
  scenario: "Roleplay",
  quiz: "Quiz",
  manual: "Tự thêm",
};

const TYPE_COLORS: Record<string, string> = {
  noun: "var(--brand)",
  verb: "var(--success)",
  adjective: "var(--accent-strong)",
  adverb: "var(--brand)",
  phrase: "var(--plum)",
};

export default function VocabularyPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [filterSource]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterSource) params.set("source", filterSource);

      const [vocabRes, statsRes] = await Promise.all([
        apiFetch(`${API}/vocabulary/list?${params}`),
        apiFetch(`${API}/vocabulary/stats`)
      ]);

      if (vocabRes.ok) {
        const data = await vocabRes.json();
        setItems(data.vocabulary_items || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await apiFetch(`${API}/vocabulary/${id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const playTTS = (word: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US"; u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  const filtered = items.filter(i =>
    !search || i.word.toLowerCase().includes(search.toLowerCase()) || i.meaning_vi?.includes(search)
  );

  return (
    <div className="wrap stagger">
      <header className="page-head">
        <div>
          <h1 className="page-title">Từ vựng của tôi</h1>
          <p className="page-sub">Từ bạn gặp trong bài học, hội thoại và quiz được gom về đây, kèm ví dụ để ôn lại.</p>
        </div>
        <Link className="st-btn st-btn-primary" href="/flashcards">Ôn bằng flashcard</Link>
      </header>

      {stats && (
        <section className="grid-4" aria-label="Thống kê từ vựng">
          {[
            { label: "Tổng số từ", value: stats.total_words ?? 0 },
            { label: "Mức nhớ trung bình", value: `${Number(stats.avg_mastery || 0).toFixed(0)}%` },
            { label: "Đã thành thạo", value: stats.mastered_count ?? 0, color: "var(--success)" },
            { label: "Đang học", value: stats.learning_count ?? 0, color: "var(--brand)" },
          ].map(s => (
            <div key={s.label} className="st-stat">
              <span className="meta">{s.label}</span>
              <span className="st-stat-value num" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </section>
      )}

      <div className="row-wrap" style={{ justifyContent: "space-between", gap: 12 }}>
        <div className="row-wrap" role="group" aria-label="Lọc theo nguồn" style={{ gap: 6 }}>
          {[["", "Tất cả"], ...Object.entries(SOURCE_LABELS)].map(([k, label]) => (
            <button key={k || "all"} type="button" className="st-chip" aria-pressed={filterSource === k} onClick={() => setFilterSource(k)}>{label}</button>
          ))}
        </div>
        <label className="field" style={{ position: "relative", width: "min(320px, 100%)" }}>
          <span className="st-sr">Tìm từ vựng</span>
          <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)" }} />
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm từ hoặc nghĩa…" style={{ paddingLeft: 36 }} />
        </label>
      </div>

      {loading ? (
        <div className="grid-2">{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 112 }} />)}</div>
      ) : filtered.length === 0 ? (
        items.length > 0 ? (
          <div className="st-card" style={{ textAlign: "center" }}>
            <p className="ink2">Không có từ nào khớp với “{search}”.</p>
            <button className="st-btn st-btn-ghost st-btn-sm" type="button" style={{ marginTop: 8 }} onClick={() => setSearch("")}>Xoá tìm kiếm</button>
          </div>
        ) : (
          <EmptyState
            title="Chưa có từ vựng nào"
            description="Từ vựng được lưu từ bài học và hội thoại, mỗi từ có ví dụ và có thể thành flashcard."
            steps={[
              { title: "Học một bài học", desc: "Lưu từ mới ở cột bên phải bài học", href: "/books" },
              { title: "Luyện một tình huống hội thoại", desc: "Từ mới trong hội thoại tự được lưu", href: "/scenarios" },
            ]}
            primary={{ label: "Bắt đầu học", href: "/books" }}
          />
        )
      ) : (
        <div className="grid-2">
          {filtered.map(item => {
            const open = expandedId === item.id;
            const color = TYPE_COLORS[item.word_type] || "var(--brand)";
            const ipa = item.ipa || item.pronunciation;
            const mastery = item.mastery_score ?? item.mastery;
            const ex = Array.isArray(item.example_sentences) ? item.example_sentences : [];
            return (
              <article key={item.id} className="st-card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="row-wrap" style={{ gap: 8 }}>
                      <b style={{ font: "700 20px/26px var(--font-display)", letterSpacing: "-0.3px" }}>{item.word}</b>
                      {item.word_type && <span className="st-badge" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>{item.word_type}</span>}
                    </div>
                    {ipa && <div className="meta" style={{ fontFamily: "var(--font-reading)" }}>{ipa}</div>}
                  </div>
                  <div className="row" style={{ gap: 2 }}>
                    <button className="icon-btn" type="button" aria-label={`Nghe phát âm ${item.word}`} onClick={() => playTTS(item.word)}><Volume2 size={18} strokeWidth={1.75} /></button>
                    <button className="icon-btn" type="button" aria-label={`Xoá ${item.word}`} disabled={deleting === item.id} onClick={() => handleDelete(item.id)}>
                      {deleting === item.id ? <span className="st-spinner" /> : <Trash2 size={17} strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>
                <div className="ink2" style={{ fontWeight: 600, color: "var(--ink)" }}>{item.meaning_vi}</div>
                {ex[0]?.en && <p className="passage-sm" style={{ color: "var(--ink-secondary)", fontStyle: "italic" }}>“{ex[0].en}”</p>}
                {mastery != null && (
                  <div className="row" style={{ gap: 10 }}>
                    <div className="bar" style={{ flex: 1 }}><i style={{ width: `${Math.min(100, Number(mastery))}%`, background: Number(mastery) >= 80 ? "var(--success)" : undefined }} /></div>
                    <span className="meta num">{Number(mastery).toFixed(0)}%</span>
                  </div>
                )}
                <div className="row" style={{ justifyContent: "space-between", marginTop: 2 }}>
                  <span className="meta">{SOURCE_LABELS[item.source] || item.source}{item.flashcard_id ? " · đã có flashcard" : ""}</span>
                  <button className="link" type="button" aria-expanded={open} onClick={() => setExpandedId(open ? null : item.id)} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit", fontSize: 13.5 }}>{open ? "Thu gọn" : "Chi tiết"}</button>
                </div>
                {open && (
                  <div className="st-enter stack" style={{ gap: 8, paddingTop: 10, borderTop: "1px solid var(--hairline)" }}>
                    {item.source_sentence && <p className="meta" style={{ fontStyle: "italic" }}>Gặp trong: “{item.source_sentence}”</p>}
                    {ex.slice(0, 2).map((e: any, i: number) => (
                      <div key={i} style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", background: "var(--surface-sunken)" }}>
                        <div style={{ fontSize: 14 }}>{e.en}</div>
                        <div className="meta" style={{ marginTop: 2 }}>{e.vi}</div>
                      </div>
                    ))}
                    {Array.isArray(item.collocations) && item.collocations.length > 0 && (
                      <div className="row-wrap" style={{ gap: 6 }}>{item.collocations.slice(0, 4).map((c: string) => <span key={c} className="st-badge">{c}</span>)}</div>
                    )}
                    <span className="meta">Đã thêm {new Date(item.created_at).toLocaleDateString("vi-VN")}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
