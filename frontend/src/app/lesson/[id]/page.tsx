"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Loader2, Play, ChevronLeft, Database, MessageSquare } from "lucide-react";

const API = "http://localhost:8000/api/v1";

function LessonContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const topicId = params.id as string;
  const docId = searchParams.get("doc");

  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ragChunks, setRagChunks] = useState(0);

  useEffect(() => {
    if (topicId) generateLesson();
  }, [topicId]);

  const generateLesson = async () => {
    setLoading(true);
    try {
      // Lấy topic info trước
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

      // Generate lesson via API
      const res = await fetch(`${API}/learning-paths/generate-lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: topicId,
          topic_name: topicName,
          user_mastery: mastery,
          document_id: docId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLesson(data);
        setRagChunks(data.rag_chunks_used || 0);
      }
    } catch (e) {
      setLesson({
        title: "Bài học",
        content_markdown: "# Bài học\n\nĐang tải nội dung...",
        key_takeaways: [],
        user_mastery: 0
      });
    }
    setLoading(false);
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
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, (_, m) => `<strong>${m}</strong>`).replace(/`(.*?)`/g, (_, m) => `<code style="background:rgba(99,102,241,0.12);color:#a5b4fc;padding:2px 6px;border-radius:4px;font-size:0.85em">${m}</code>`);
      return <p key={i} style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: boldLine }} />;
    });
  };

  if (loading) return (
    <div style={{ maxWidth: "900px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="skeleton" style={{ height: 60, borderRadius: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        <div className="skeleton" style={{ height: 500, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: "900px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Back */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href={docId ? `/books/${docId}` : "/books"} className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
          <ChevronLeft size={16} /> Quay lại
        </Link>
        <span className="badge badge-indigo">
          <BookOpen size={12} /> AI-Generated Lesson · RAG
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        {/* Lesson Content */}
        <div className="glass-panel" style={{ padding: "32px" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "800", fontFamily: "Outfit, sans-serif", marginBottom: "12px" }}>
            {lesson?.title}
          </h1>
          <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
            <span className="badge badge-indigo">Mastery: {lesson?.user_mastery?.toFixed(0) || 0}%</span>
            {ragChunks > 0 && <span className="badge badge-cyan">RAG: {ragChunks} chunks</span>}
          </div>

          <div className="prose-dark">
            {renderMarkdown(lesson?.content_markdown || "")}
          </div>

          {lesson?.key_takeaways?.length > 0 && (
            <div style={{ marginTop: "28px", padding: "20px", borderRadius: "14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <h3 style={{ fontWeight: "700", marginBottom: "12px", color: "#34d399", fontSize: "0.9rem" }}>
                ✅ Key Takeaways
              </h3>
              {lesson.key_takeaways.map((t: string, i: number) => (
                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ color: "#10b981", flexShrink: 0 }}>→</span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{t}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "12px" }}>
            <Link href={`/quiz/${topicId}`} className="btn-primary">
              <Play size={16} /> Làm Quiz
            </Link>
            <Link href={`/tutor?topic=${topicId}${docId ? `&doc=${docId}` : ""}`} className="btn-secondary">
              <MessageSquare size={16} /> Hỏi AI Tutor
            </Link>
          </div>
        </div>

        {/* RAG Inspector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={15} color="var(--accent-cyan)" />
              Nguồn RAG (pgvector)
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
              Bài học được sinh từ nội dung sách thực tế qua Gemini text-embedding-004 + pgvector search
            </p>
            <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)" }}>
              <div style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 600 }}>
                {ragChunks > 0 ? `✓ ${ragChunks} text chunks được sử dụng` : "⚠ Dùng Gemini general knowledge"}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "12px" }}>Tiếp theo</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link href={`/quiz/${topicId}`} style={{ padding: "12px", borderRadius: "10px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", textDecoration: "none", color: "#818cf8", fontSize: "0.82rem", fontWeight: 600 }}>
                📝 Làm Quiz để kiểm tra
              </Link>
              <Link href={`/flashcards?topic=${topicId}`} style={{ padding: "12px", borderRadius: "10px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", textDecoration: "none", color: "#a78bfa", fontSize: "0.82rem", fontWeight: 600 }}>
                🃏 Tạo Flashcard từ bài học
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
    <Suspense fallback={<div className="skeleton" style={{ height: "80vh", borderRadius: 20, maxWidth: 900 }} />}>
      <LessonContent />
    </Suspense>
  );
}
