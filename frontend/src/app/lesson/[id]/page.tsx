"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Loader2, Play, ChevronLeft, Database, MessageSquare, BookMarked, ChevronDown, ChevronUp, Volume2, Plus, Check } from "lucide-react";

const API = "http://localhost:8000/api/v1";

type VocabItem = {
  word: string;
  meaning_vi: string;
  source_sentence?: string;
  word_type?: string;
};

type LessonData = {
  title: string;
  content_markdown: string;
  key_takeaways: string[];
  vocabulary_highlights?: VocabItem[];
  new_concepts_count?: number;
  user_mastery?: number;
  proficiency_level?: string;
  rag_chunks_used?: number;
  vocabulary_auto_saved?: number;
};

function LessonContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const topicId = params.id as string;
  const docId = searchParams.get("doc");
  const profLevel = searchParams.get("level") || "intermediate";

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ragChunks, setRagChunks] = useState(0);

  // Vocabulary panel state
  const [vocabOpen, setVocabOpen] = useState(true);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [savingWord, setSavingWord] = useState<string | null>(null);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [wordCardData, setWordCardData] = useState<Record<string, any>>({});
  const [loadingCard, setLoadingCard] = useState<string | null>(null);

  useEffect(() => {
    if (topicId) generateLesson();
  }, [topicId]);

  const generateLesson = async () => {
    setLoading(true);
    try {
      let topicName = "Chủ đề";
      let mastery = 0;

      if (docId) {
        const topicsRes = await fetch(`${API}/documents/${docId}/topics`);
        if (topicsRes.ok) {
          const data = await topicsRes.json();
          const topic = data.topics?.find((t: any) => t.id === topicId);
          if (topic) topicName = topic.name;
        }
      }

      // Feature A: Use generate-lesson-v2 (i+1 with vocab highlights)
      const res = await fetch(`${API}/learning-paths/generate-lesson-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: topicId,
          topic_name: topicName,
          user_mastery: mastery,
          document_id: docId,
          proficiency_level: profLevel,
          auto_save_vocabulary: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLesson(data);
        setRagChunks(data.rag_chunks_used || 0);
        // Mark auto-saved words
        if (data.vocabulary_highlights) {
          const autoSaved = new Set<string>(
            (data.vocabulary_highlights || []).map((v: VocabItem) => v.word)
          );
          setSavedWords(autoSaved);
        }
      }
    } catch {
      setLesson({
        title: "Bài học",
        content_markdown: "# Bài học\n\nĐang tải nội dung...",
        key_takeaways: [],
        vocabulary_highlights: []
      });
    }
    setLoading(false);
  };

  const handleSaveVocab = async (item: VocabItem) => {
    if (savedWords.has(item.word)) return;
    setSavingWord(item.word);
    try {
      const res = await fetch(`${API}/vocabulary/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: item.word,
          meaning_vi: item.meaning_vi,
          source_sentence: item.source_sentence || "",
          word_type: item.word_type || "noun",
          topic_id: topicId,
          document_id: docId,
          source: "lesson",
          create_flashcard: true
        })
      });
      if (res.ok) {
        setSavedWords(prev => new Set(prev).add(item.word));
      }
    } catch { /* ignore */ }
    setSavingWord(null);
  };

  const handleExpandWord = async (word: string, sourceSentence: string) => {
    if (expandedWord === word) {
      setExpandedWord(null);
      return;
    }
    setExpandedWord(word);
    if (wordCardData[word]) return;

    setLoadingCard(word);
    try {
      const res = await fetch(`${API}/vocabulary/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          source_sentence: sourceSentence || "",
          document_id: docId,
          topic_id: topicId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setWordCardData(prev => ({ ...prev, [word]: data }));
      }
    } catch { /* ignore */ }
    setLoadingCard(null);
  };

  const playTTS = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US"; u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  // Simple markdown renderer
  const renderMarkdown = (md: string) => {
    if (!md) return null;
    return md.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return <h1 key={i} style={{ fontSize: "1.6rem", fontWeight: 800, margin: "24px 0 12px", fontFamily: "Outfit" }}>{line.slice(2)}</h1>;
      if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: "1.2rem", fontWeight: 700, margin: "20px 0 8px", color: "#c7d2fe" }}>{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: "1rem", fontWeight: 700, margin: "16px 0 6px" }}>{line.slice(4)}</h3>;
      if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 4, marginLeft: 20 }}>{line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}</li>;
      if (line.startsWith("> ")) return <blockquote key={i} style={{ borderLeft: "3px solid rgba(99,102,241,0.5)", paddingLeft: 16, color: "var(--text-muted)", fontStyle: "italic", margin: "12px 0" }}>{line.slice(2)}</blockquote>;
      if (line.startsWith("```")) return null;
      if (line.trim() === "---" || line.trim() === "") return <br key={i} />;
      const boldLine = line
        .replace(/\*\*(.*?)\*\*/g, (_, m) => `<strong>${m}</strong>`)
        .replace(/`(.*?)`/g, (_, m) => `<code style="background:rgba(99,102,241,0.12);color:#a5b4fc;padding:2px 6px;border-radius:4px;font-size:0.85em">${m}</code>`)
        .replace(/\*(nghĩa:.*?)\*/g, (_, m) => `<em style="color:#34d399;font-size:0.88em;background:rgba(16,185,129,0.08);padding:1px 6px;border-radius:4px">${m}</em>`);
      return <p key={i} style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: boldLine }} />;
    });
  };

  if (loading) return (
    <div style={{ maxWidth: "980px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="skeleton" style={{ height: 60, borderRadius: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        <div className="skeleton" style={{ height: 500, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
      </div>
    </div>
  );

  const vocabHighlights = lesson?.vocabulary_highlights || [];

  return (
    <div style={{ maxWidth: "980px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Back + badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href={docId ? `/books/${docId}` : "/books"} className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
          <ChevronLeft size={16} /> Quay lại
        </Link>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="badge badge-indigo"><BookOpen size={12} /> i+1 Adaptive Lesson</span>
          {lesson?.new_concepts_count !== undefined && (
            <span className="badge badge-emerald">🔤 {lesson.new_concepts_count} khái niệm mới</span>
          )}
          {ragChunks > 0 && <span className="badge badge-cyan">RAG: {ragChunks} chunks</span>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        {/* Lesson Content */}
        <div className="glass-panel" style={{ padding: "32px" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "800", fontFamily: "Outfit, sans-serif", marginBottom: "12px" }}>
            {lesson?.title}
          </h1>
          <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
            <span className="badge badge-indigo">Mastery: {lesson?.user_mastery?.toFixed(0) || 0}%</span>
            {lesson?.proficiency_level && (
              <span className="badge badge-purple">Trình độ: {lesson.proficiency_level}</span>
            )}
          </div>

          <div className="prose-dark">
            {renderMarkdown(lesson?.content_markdown || "")}
          </div>

          {(lesson?.key_takeaways?.length || 0) > 0 && (
            <div style={{ marginTop: "28px", padding: "20px", borderRadius: "14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <h3 style={{ fontWeight: "700", marginBottom: "12px", color: "#34d399", fontSize: "0.9rem" }}>
                ✅ Key Takeaways
              </h3>
              {lesson!.key_takeaways.map((t: string, i: number) => (
                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ color: "#10b981", flexShrink: 0 }}>→</span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{t}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link href={`/quiz/${topicId}`} className="btn-primary">
              <Play size={16} /> Làm Quiz
            </Link>
            <Link href={`/quiz/${topicId}?mode=multi${docId ? `&doc=${docId}` : ""}`} className="btn-secondary">
              📝 Quiz Đa dạng (Fill-blank, Recall)
            </Link>
            <Link href={`/tutor?topic=${topicId}${docId ? `&doc=${docId}` : ""}`} className="btn-secondary">
              <MessageSquare size={16} /> Hỏi AI Tutor
            </Link>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Vocabulary Highlights Panel */}
          {vocabHighlights.length > 0 && (
            <div className="glass-panel" style={{ padding: "20px" }}>
              <button
                onClick={() => setVocabOpen(v => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", padding: 0 }}
              >
                <h3 style={{ fontSize: "0.9rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                  <BookMarked size={15} color="var(--accent-indigo)" />
                  Từ vựng bài học ({vocabHighlights.length})
                </h3>
                {vocabOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {vocabOpen && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {vocabHighlights.map((item, idx) => {
                    const isSaved = savedWords.has(item.word);
                    const isSaving = savingWord === item.word;
                    const isExpanded = expandedWord === item.word;
                    const cardData = wordCardData[item.word];
                    const isLoadingThisCard = loadingCard === item.word;

                    return (
                      <div key={idx} style={{
                        borderRadius: "10px",
                        border: "1px solid var(--border-subtle)",
                        overflow: "hidden",
                        background: isSaved ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)"
                      }}>
                        {/* Word header row */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px" }}>
                          <button
                            onClick={() => handleExpandWord(item.word, item.source_sentence || "")}
                            style={{ flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{item.word}</span>
                              {item.word_type && (
                                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", background: "rgba(99,102,241,0.1)", padding: "1px 5px", borderRadius: 4 }}>
                                  {item.word_type}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#34d399", marginTop: 2 }}>{item.meaning_vi}</div>
                          </button>

                          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                            <button
                              onClick={() => playTTS(item.word)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-indigo)", padding: "2px" }}
                              title="Nghe phát âm"
                            >
                              <Volume2 size={14} />
                            </button>
                            <button
                              onClick={() => handleSaveVocab(item)}
                              disabled={isSaved || isSaving}
                              style={{
                                background: isSaved ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.1)",
                                border: "none", cursor: isSaved ? "default" : "pointer",
                                color: isSaved ? "#34d399" : "var(--accent-indigo)",
                                borderRadius: 6, padding: "3px 6px",
                                fontSize: "0.7rem", fontWeight: 600,
                                display: "flex", alignItems: "center", gap: 3
                              }}
                              title={isSaved ? "Đã lưu" : "Lưu vào Flashcard"}
                            >
                              {isSaving ? <Loader2 size={11} className="spin" /> : isSaved ? <Check size={11} /> : <Plus size={11} />}
                              {isSaved ? "Đã lưu" : "Flashcard"}
                            </button>
                          </div>
                        </div>

                        {/* Expanded card detail */}
                        {isExpanded && (
                          <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px", background: "rgba(0,0,0,0.15)" }}>
                            {isLoadingThisCard ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                <Loader2 size={12} className="spin" /> Đang tải chi tiết...
                              </div>
                            ) : cardData ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.78rem" }}>
                                {cardData.pronunciation && (
                                  <div style={{ color: "var(--text-muted)" }}>📢 {cardData.pronunciation}</div>
                                )}
                                {item.source_sentence && (
                                  <div style={{ color: "var(--text-secondary)", fontStyle: "italic", borderLeft: "2px solid rgba(99,102,241,0.3)", paddingLeft: 8 }}>
                                    "{item.source_sentence}"
                                  </div>
                                )}
                                {cardData.example_sentences?.slice(0, 2).map((ex: any, ei: number) => (
                                  <div key={ei} style={{ background: "rgba(99,102,241,0.06)", borderRadius: 6, padding: "6px 8px" }}>
                                    <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{ex.en}</div>
                                    <div style={{ color: "#34d399", marginTop: 2 }}>→ {ex.vi}</div>
                                  </div>
                                ))}
                                {cardData.collocations?.length > 0 && (
                                  <div>
                                    <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>Cụm từ: </span>
                                    <span style={{ color: "var(--text-secondary)" }}>{cardData.collocations.slice(0, 3).join(" · ")}</span>
                                  </div>
                                )}
                                {cardData.usage_note && (
                                  <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>💡 {cardData.usage_note}</div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                {item.source_sentence && <em>"{item.source_sentence}"</em>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {lesson?.vocabulary_auto_saved !== undefined && lesson.vocabulary_auto_saved > 0 && (
                    <div style={{ fontSize: "0.72rem", color: "#34d399", textAlign: "center", paddingTop: 4 }}>
                      ✅ {lesson.vocabulary_auto_saved} từ đã tự động lưu vào Flashcard
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* RAG Inspector */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={15} color="var(--accent-cyan)" />
              Nguồn RAG (pgvector)
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
              Bài học sinh từ nội dung sách thực tế qua Gemini embedding + pgvector
            </p>
            <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)" }}>
              <div style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 600 }}>
                {ragChunks > 0 ? `✓ ${ragChunks} text chunks được sử dụng` : "⚠ Dùng Gemini general knowledge"}
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "12px" }}>Tiếp theo</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link href={`/quiz/${topicId}`} style={{ padding: "12px", borderRadius: "10px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", textDecoration: "none", color: "#818cf8", fontSize: "0.82rem", fontWeight: 600 }}>
                📝 Làm Quiz để kiểm tra
              </Link>
              <Link href={`/flashcards`} style={{ padding: "12px", borderRadius: "10px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", textDecoration: "none", color: "#a78bfa", fontSize: "0.82rem", fontWeight: 600 }}>
                🃏 Ôn Flashcard đã lưu
              </Link>
              <Link href={`/scenarios${docId ? `?doc=${docId}` : ""}`} style={{ padding: "12px", borderRadius: "10px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", textDecoration: "none", color: "#34d399", fontSize: "0.82rem", fontWeight: 600 }}>
                🎭 Thực hành Roleplay TBLT
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: "80vh", borderRadius: 20, maxWidth: 980 }} />}>
      <LessonContent />
    </Suspense>
  );
}
