"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Loader2, BookOpen, Lightbulb, ChevronDown } from "lucide-react";

const API = "http://localhost:8000/api/v1";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: { content_preview: string; similarity: number; section_title?: string }[];
  follow_up_suggestions?: string[];
  timestamp?: string;
};

const SUGGESTIONS = [
  "B-Tree là gì và tại sao lại phù hợp với database?",
  "Giải thích cơ chế Attention trong Transformer",
  "So sánh SQL và NoSQL database",
  "Kafka Consumer Group hoạt động như thế nào?",
];

function TutorContent() {
  const searchParams = useSearchParams();
  const docId = searchParams.get("doc");
  const topicId = searchParams.get("topic");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API}/tutor/sessions`);
      if (res.ok) { const d = await res.json(); setSessions(d.sessions || []); }
    } catch {}
  };

  const loadSession = async (sid: string) => {
    try {
      const res = await fetch(`${API}/tutor/sessions/${sid}`);
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
      const res = await fetch(`${API}/tutor/ask`, {
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
        content: "⚠️ Không kết nối được với AI. Hãy kiểm tra backend server đang chạy.",
      }]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ display: "flex", gap: "24px", height: "calc(100vh - 100px)", maxWidth: "1000px" }}>
      {/* Sessions Sidebar */}
      <div style={{ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
        <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }}
          onClick={() => { setMessages([]); setSessionId(null); }}>
          + Chat mới
        </button>

        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 4px" }}>
          Lịch sử chat
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto" }}>
          {sessions.length === 0 ? (
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0 4px" }}>Chưa có cuộc hội thoại nào</p>
          ) : sessions.map(s => (
            <button key={s.id} onClick={() => loadSession(s.id)} style={{
              background: sessionId === s.id ? "var(--bg-chat-session-active)" : "var(--bg-card)",
              border: `1px solid ${sessionId === s.id ? "var(--border-chat-session-active)" : "var(--border-subtle)"}`,
              borderRadius: "10px", padding: "10px 12px", cursor: "pointer", textAlign: "left",
              color: "var(--text-secondary)", fontSize: "0.78rem", transition: "all 0.15s ease"
            }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.title || "Cuộc hội thoại"}
              </div>
              <div style={{ fontSize: "0.68rem" }}>
                {new Date(s.updated_at).toLocaleDateString("vi-VN")}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0", minWidth: 0 }}>
        {/* Header */}
        <div className="glass-panel" style={{ padding: "16px 20px", borderRadius: "16px 16px 0 0", borderBottom: "none", marginBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "10px", background: "var(--gradient-cyan)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ fontSize: "1.2rem" }}>🤖</span>
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>Studia AI Tutor</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {docId ? "Trả lời dựa trên sách đã upload · Gemini + RAG" : "Hỏi đáp tổng quát"}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "20px",
          background: "var(--bg-chat-container)", border: "1px solid var(--border-subtle)",
          display: "flex", flexDirection: "column", gap: "16px",
          transition: "background 0.3s ease"
        }}>
          {messages.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", padding: "40px 0" }}>
              <div style={{ fontSize: "3.5rem" }}>🤖</div>
              <div style={{ textAlign: "center" }}>
                <h3 style={{ fontWeight: "700", marginBottom: "8px", fontFamily: "Outfit, sans-serif" }}>
                  Xin chào! Tôi là AI Tutor
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", maxWidth: "360px" }}>
                  {docId ? "Hỏi tôi bất kỳ điều gì về cuốn sách bạn đã upload." : "Hỏi tôi về bất kỳ khái niệm học thuật nào."}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "380px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  <Lightbulb size={12} style={{ display: "inline", marginRight: 4 }} /> Gợi ý câu hỏi
                </div>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{
                    background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                    borderRadius: "10px", padding: "10px 14px", cursor: "pointer", textAlign: "left",
                    color: "var(--text-secondary)", fontSize: "0.82rem", transition: "all 0.15s ease"
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.08)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              gap: "6px"
            }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", maxWidth: "85%" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "8px", background: "var(--gradient-cyan)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>🤖</div>
                )}
                <div className={`chat-bubble chat-bubble-${msg.role}`}>
                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{msg.content}</p>
                </div>
              </div>

              {/* Sources */}
              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div style={{ marginLeft: "36px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Nguồn:</span>
                  {msg.sources.map((src, i) => (
                    <span key={i} className="chat-source-tag">
                      <BookOpen size={9} /> {src.section_title || `Đoạn ${i + 1}`} ({(src.similarity * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              )}

              {/* Follow-up suggestions */}
              {msg.role === "assistant" && msg.follow_up_suggestions && msg.follow_up_suggestions.length > 0 && (
                <div style={{ marginLeft: "36px", display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                  {msg.follow_up_suggestions.slice(0, 2).map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)} style={{
                      background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)",
                      borderRadius: "8px", padding: "5px 10px", cursor: "pointer",
                      color: "var(--accent-indigo)", fontSize: "0.72rem", transition: "all 0.15s ease",
                      fontWeight: 600
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 28, height: 28, borderRadius: "8px", background: "var(--gradient-cyan)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>🤖</div>
              <div className="chat-bubble chat-bubble-ai" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Loader2 size={14} className="spin" />
                <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Đang tìm kiếm trong sách...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ border: "1px solid var(--border-subtle)", borderTop: "none", borderRadius: "0 0 16px 16px", background: "var(--bg-chat-input-bar)", padding: "16px", transition: "background 0.3s ease" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Hỏi AI Tutor về nội dung sách... (Enter để gửi)"
              rows={2}
              style={{
                flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                borderRadius: "12px", color: "var(--text-primary)", padding: "12px 16px", resize: "none",
                fontFamily: "Plus Jakarta Sans, Inter, sans-serif", fontSize: "0.9rem", outline: "none"
              }}
            />
            <button className="btn-primary" onClick={() => sendMessage()} disabled={!input.trim() || loading}
              style={{ padding: "12px 16px", flexShrink: 0 }}>
              {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "8px" }}>
            Enter = gửi · Shift+Enter = xuống dòng · AI trả lời dựa trên RAG từ sách bạn đã upload
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TutorPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: "80vh", borderRadius: 20 }} />}>
      <TutorContent />
    </Suspense>
  );
}
