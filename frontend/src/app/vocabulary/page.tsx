"use client";

import { useState, useEffect } from "react";
import { BookMarked, Loader2, Volume2, Trash2, BookOpen, RefreshCw, Search } from "lucide-react";

const API = "http://localhost:8000/api/v1";

const SOURCE_LABELS: Record<string, string> = {
  lesson: "Bài học",
  scenario: "Roleplay",
  quiz: "Quiz",
  manual: "Tự thêm",
};

const TYPE_COLORS: Record<string, string> = {
  noun: "#818cf8",
  verb: "#34d399",
  adjective: "#fbbf24",
  adverb: "#38bdf8",
  phrase: "#f472b6",
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
        fetch(`${API}/vocabulary/list?${params}`),
        fetch(`${API}/vocabulary/stats`)
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
      await fetch(`${API}/vocabulary/${id}`, { method: "DELETE" });
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
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <span className="badge badge-indigo" style={{ marginBottom: 10 }}>
          🔤 Feature C — Contextual Vocabulary Learning
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>
          Từ Vựng Của Tôi
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
          Từ vựng tích lũy từ bài học, roleplay và quiz — mỗi từ có thể lưu thành Flashcard FSRS
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Tổng từ", value: stats.total_words, color: "#818cf8" },
            { label: "Mastery TB", value: `${stats.avg_mastery?.toFixed(0)}%`, color: "#34d399" },
            { label: "Đã thành thạo", value: stats.mastered_count, color: "#fbbf24" },
            { label: "Đang học", value: stats.learning_count, color: "#38bdf8" },
          ].map((s, i) => (
            <div key={i} className="glass-panel" style={{ padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="input-field"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm từ vựng..."
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          className="input-field"
          style={{ width: 160 }}
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
        >
          <option value="">Tất cả nguồn</option>
          <option value="lesson">Bài học</option>
          <option value="scenario">Roleplay</option>
          <option value="quiz">Quiz</option>
          <option value="manual">Tự thêm</option>
        </select>
        <button className="btn-secondary" onClick={fetchData}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {/* Vocabulary Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: 48, textAlign: "center" }}>
          <BookMarked size={40} style={{ margin: "0 auto 12px", color: "var(--text-muted)" }} />
          <h3>Chưa có từ vựng nào</h3>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
            Học một bài học hoặc tham gia Roleplay để tự động tích lũy từ vựng
          </p>
          <a href="/books" className="btn-primary" style={{ display: "inline-flex", marginTop: 16 }}>
            <BookOpen size={16} /> Bắt đầu học
          </a>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {filtered.map(item => (
            <div
              key={item.id}
              className="glass-panel hover-card"
              style={{ padding: "16px 18px", borderRadius: 14, cursor: "pointer" }}
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              {/* Word row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>{item.word}</span>
                  {item.word_type && (
                    <span style={{
                      fontSize: "0.62rem", fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                      background: `${TYPE_COLORS[item.word_type] || "#6366f1"}22`,
                      color: TYPE_COLORS[item.word_type] || "#818cf8"
                    }}>
                      {item.word_type}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{
                    fontSize: "0.62rem", padding: "1px 6px", borderRadius: 4,
                    background: "rgba(255,255,255,0.06)", color: "var(--text-muted)"
                  }}>
                    {SOURCE_LABELS[item.source] || item.source}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); playTTS(item.word); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-indigo)", padding: 2 }}
                  >
                    <Volume2 size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                    disabled={deleting === item.id}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}
                  >
                    {deleting === item.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: "0.82rem", color: "#34d399", fontWeight: 600 }}>{item.meaning_vi}</div>

              {/* Expanded */}
              {expandedId === item.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
                  {item.source_sentence && (
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontStyle: "italic", marginBottom: 8 }}>
                      📖 "{item.source_sentence}"
                    </div>
                  )}
                  {Array.isArray(item.example_sentences) && item.example_sentences.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {item.example_sentences.slice(0, 2).map((ex: any, i: number) => (
                        <div key={i} style={{ background: "rgba(99,102,241,0.06)", borderRadius: 6, padding: "6px 8px" }}>
                          <div style={{ fontSize: "0.76rem", color: "var(--text-primary)" }}>{ex.en}</div>
                          <div style={{ fontSize: "0.74rem", color: "#34d399", marginTop: 2 }}>→ {ex.vi}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {Array.isArray(item.collocations) && item.collocations.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: "0.73rem", color: "var(--text-secondary)" }}>
                      🔗 {item.collocations.slice(0, 3).join(" · ")}
                    </div>
                  )}
                  <div style={{ marginTop: 8, fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    Đã thêm: {new Date(item.created_at).toLocaleDateString("vi-VN")}
                    {item.flashcard_id && " · ✓ Đã tạo Flashcard FSRS"}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
