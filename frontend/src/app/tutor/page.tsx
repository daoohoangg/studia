"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { API, apiFetch } from "@/lib/api";
import Logo from "@/components/Logo";
import { Send, Plus } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: { content_preview: string; similarity: number; section_title?: string }[];
  follow_up_suggestions?: string[];
  timestamp?: string;
};

const SUGGESTIONS = [
  "Phân biệt \"which\" và \"that\" trong mệnh đề quan hệ",
  "Cách mở bài Task 2 dạng Discuss both views",
  "Làm sao để tránh lạc đề trong IELTS Speaking Part 2?",
  "Khi nào dùng thì hiện tại hoàn thành thay vì quá khứ đơn?",
];

function TutorContent() {
  const searchParams = useSearchParams();
  const docId = searchParams.get("doc");
  const topicId = searchParams.get("topic");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(searchParams.get("q") || "");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { const el = bottomRef.current?.parentElement; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [messages]);
  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const res = await apiFetch(`${API}/tutor/sessions`);
      if (res.ok) { const d = await res.json(); setSessions(d.sessions || []); }
    } catch {}
  };

  const loadSession = async (sid: string) => {
    try {
      const res = await apiFetch(`${API}/tutor/sessions/${sid}`);
      if (res.ok) {
        const data = await res.json();
        setSessionId(sid);
        setMessages(data.messages || []);
        setShowSessions(false);
      }
    } catch {}
  };

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: "user", content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await apiFetch(`${API}/tutor/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: msg,
          document_id: docId,
          topic_id: topicId,
          session_id: sessionId
        })
      });
      const data = await res.json();

      const aiMsg: Message = {
        role: "assistant",
        content: data.answer || "Xin lỗi, tôi không thể trả lời câu hỏi này lúc này.",
        sources: data.sources || [],
        follow_up_suggestions: data.follow_up_suggestions || [],
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);
      if (data.session_id && !sessionId) setSessionId(data.session_id);
      fetchSessions();
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Không thể kết nối với trợ lý AI. Vui lòng thử lại sau.",
      }]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const startNew = () => { setMessages([]); setSessionId(null); inputRef.current?.focus(); };
  const dayKey = (d: string) => {
    const t = new Date(d); const now = new Date();
    const diff = Math.floor((new Date(now.toDateString()).getTime() - new Date(t.toDateString()).getTime()) / 86400000);
    return diff <= 0 ? "Hôm nay" : diff < 7 ? "Tuần này" : "Trước đó";
  };
  const grouped: Record<string, any[]> = {};
  sessions.forEach(s => { const k = dayKey(s.updated_at); (grouped[k] ||= []).push(s); });

  return (
    <div className="tutor-shell" style={{ display: "flex", gap: 16, height: "calc(100vh - 104px)", minHeight: 480 }}>
      <aside className="tutor-side" aria-label="Lịch sử trò chuyện" style={{ flex: "0 0 260px", display: "flex", flexDirection: "column", gap: 4, minHeight: 0 }}>
        <button className="st-btn st-btn-primary st-btn-block" type="button" onClick={startNew}><Plus size={18} strokeWidth={2} />Cuộc trò chuyện mới</button>
        <div style={{ overflowY: "auto", minHeight: 0, marginTop: 6 }}>
          {sessions.length === 0 ? (
            <p className="meta" style={{ padding: "12px" }}>Các cuộc trò chuyện của bạn sẽ hiện ở đây.</p>
          ) : ["Hôm nay", "Tuần này", "Trước đó"].filter(k => grouped[k]).map(k => (
            <div key={k}>
              <div className="eyebrow" style={{ color: "var(--ink-muted)", padding: "14px 12px 4px" }}>{k}</div>
              {grouped[k].map(s => (
                <button key={s.id} type="button" className="tutor-sess" aria-current={sessionId === s.id} onClick={() => loadSession(s.id)}>
                  <b>{s.title || "Cuộc trò chuyện"}</b>
                  <span className="meta">{new Date(s.updated_at).toLocaleDateString("vi-VN")}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <section aria-label="Trò chuyện" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", border: "1px solid var(--hairline)", borderRadius: "var(--radius-lg)", background: "var(--surface)", overflow: "hidden" }}>
        <header className="row" style={{ gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--hairline)" }}>
          <span className="tile" style={{ background: "var(--brand-tint)" }} aria-hidden="true"><Logo variant="mark" height={24} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ font: "650 16px/22px var(--font-sans)" }}>Coal · bạn học AI của bạn</h1>
            <div className="meta">{docId ? "Trả lời dựa trên tài liệu bạn chọn, kèm trích dẫn" : "Hỏi đáp tổng quát về tiếng Anh và IELTS"}</div>
          </div>
          {(docId || topicId) && <span className="st-badge st-badge-brand">{topicId ? "Theo chủ đề" : "Theo tài liệu"}</span>}
        </header>

        <div aria-live="polite" style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14, background: "var(--canvas)" }}>
          {messages.length === 0 && (
            <div style={{ margin: "auto", maxWidth: 480, textAlign: "center" }} className="st-enter">
              <h2 className="heading-3">Bạn đang vướng ở đâu?</h2>
              <p className="ink2" style={{ marginTop: 6 }}>{docId ? "Hỏi bất cứ điều gì về tài liệu này — câu trả lời có trích dẫn đoạn gốc." : "Hỏi về ngữ pháp, từ vựng hay cách làm từng dạng bài IELTS."}</p>
              <div className="row-wrap" style={{ justifyContent: "center", gap: 8, marginTop: 18 }}>
                {SUGGESTIONS.map(s => <button key={s} type="button" className="tutor-sugg" onClick={() => sendMessage(s)}>{s}</button>)}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
              <div className={`st-bubble ${msg.role === "user" ? "st-bubble-user" : "st-bubble-ai"}`} style={{ maxWidth: "min(72%, 680px)" }}>
                <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{msg.content}</p>
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="row-wrap" style={{ marginTop: 12, gap: 6 }}>
                    <span className="meta">Nguồn:</span>
                    {msg.sources.map((src, i) => (
                      <span key={i} className="tutor-src" title={src.content_preview}>{src.section_title || `Đoạn ${i + 1}`} · {(src.similarity * 100).toFixed(0)}%</span>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "assistant" && idx === messages.length - 1 && msg.follow_up_suggestions && msg.follow_up_suggestions.length > 0 && !loading && (
                <div className="row-wrap" style={{ gap: 8, paddingLeft: 4 }}>
                  {msg.follow_up_suggestions.slice(0, 3).map((s, i) => <button key={i} type="button" className="tutor-sugg" onClick={() => sendMessage(s)}>{s}</button>)}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="st-bubble st-bubble-ai" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="st-typing" aria-hidden="true"><i /><i /><i /></span>
              <span className="meta">{docId ? "Đang tìm trong sách…" : "Đang soạn câu trả lời…"}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={e => { e.preventDefault(); sendMessage(); }} style={{ padding: "14px 16px", borderTop: "1px solid var(--hairline)", background: "var(--surface)" }}>
          <div className="row" style={{ alignItems: "flex-end", gap: 10 }}>
            <label style={{ flex: 1 }}>
              <span className="st-sr">Câu hỏi của bạn</span>
              <textarea ref={inputRef} className="input" rows={2} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Hỏi về nội dung sách, ngữ pháp, cách làm bài…" style={{ resize: "none", minHeight: 52, height: "auto", paddingTop: 12 }} />
            </label>
            <button className="st-btn st-btn-primary" type="submit" disabled={!input.trim() || loading} aria-label="Gửi" title="Gửi (Enter)" style={{ width: 52, height: 52, padding: 0 }}>
              {loading ? <span className="st-spinner" /> : <Send size={18} strokeWidth={2} />}
            </button>
          </div>
          <p className="meta" style={{ marginTop: 8 }}><span className="kbd">Enter</span> gửi · <span className="kbd">Shift</span>+<span className="kbd">Enter</span> xuống dòng</p>
        </form>
      </section>
    </div>
  );
}

export default function TutorPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: "80vh" }} />}>
      <TutorContent />
    </Suspense>
  );
}
