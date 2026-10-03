"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Loader2, Sparkles, Trophy, Target, Award, ArrowLeft } from "lucide-react";

const API = "http://localhost:8000/api/v1";

type Scenario = {
  id: string;
  title: string;
  role: string;
  user_role: string;
  context_description: string;
  learning_goals: string[];
  initial_ai_message: string;
  target_keywords: string[];
};

type RoleplayMessage = {
  role: "user" | "assistant";
  content: string;
  score?: number;
  feedback?: string;
  is_goal_achieved?: boolean;
  vocabulary_saved?: {word: string; meaning_vi: string}[];
  errors_logged?: number;
};

function ScenariosContent() {
  const searchParams = useSearchParams();
  const docId = searchParams.get("doc");

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetchScenarios();
  }, [docId]);

  const fetchScenarios = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/scenarios/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: docId || "default",
          topic_name: "Thực hành Tình huống Thực tế",
          count: 3
        })
      });
      if (res.ok) {
        const data = await res.json();
        setScenarios(data.scenarios || []);
      }
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const startRoleplay = (sc: Scenario) => {
    setSelectedScenario(sc);
    setMessages([
      {
        role: "assistant",
        content: sc.initial_ai_message
      }
    ]);
    setOverallScore(null);
  };

  const sendRoleplayStep = async () => {
    if (!input.trim() || !selectedScenario || loading) return;

    const userText = input.trim();
    setInput("");
    const userMsg: RoleplayMessage = { role: "user", content: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API}/scenarios/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_title: selectedScenario.title,
          ai_role: selectedScenario.role,
          user_role: selectedScenario.user_role,
          user_message: userText,
          chat_history: chatHistory,
          document_id: docId
        })
      });

      const data = await res.json();
      const aiMsg: RoleplayMessage = {
        role: "assistant",
        content: data.ai_response,
        score: data.score,
        feedback: data.feedback,
        is_goal_achieved: data.is_goal_achieved,
        vocabulary_saved: data.vocabulary_saved || [],
        errors_logged: data.errors_logged || 0
      };

      setMessages(prev => [...prev, aiMsg]);
      if (data.score) setOverallScore(data.score);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Không kết nối được với AI Roleplay Engine."
      }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: "1.8rem", fontWeight: 800 }}>
            🎭 Task-Based Language Teaching (TBLT) Scenarios
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Học thông qua nhập vai xử lý tình huống thực tế & nhận phản hồi trực tiếp từ AI
          </p>
        </div>
        {selectedScenario && (
          <button className="btn-secondary" onClick={() => setSelectedScenario(null)}>
            <ArrowLeft size={16} /> Chọn tình huống khác
          </button>
        )}
      </div>

      {!selectedScenario ? (
        /* List Scenarios */
        <div>
          {generating ? (
            <div className="glass-panel" style={{ padding: 40, textAlign: "center" }}>
              <Loader2 size={32} className="spin" style={{ margin: "0 auto 12px auto", color: "var(--accent-indigo)" }} />
              <p>Đang tự động sinh các tình huống thực tế từ tài liệu của bạn...</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
              {scenarios.map(sc => (
                <div key={sc.id} className="glass-panel hover-card" style={{ padding: 24, borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gradient-purple)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                        🎯
                      </div>
                      <div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                          Vai bạn: {sc.user_role}
                        </div>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{sc.title}</h3>
                      </div>
                    </div>

                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
                      {sc.context_description}
                    </p>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>
                        Mục tiêu bài tập:
                      </div>
                      <ul style={{ paddingLeft: 18, margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {sc.learning_goals.map((g, idx) => (
                          <li key={idx}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => startRoleplay(sc)}>
                    <Sparkles size={16} /> Bắt đầu Nhập vai
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Roleplay Chat Area */
        <div style={{ display: "flex", gap: 20, height: "calc(100vh - 180px)" }}>
          {/* Mission sidebar */}
          <div className="glass-panel" style={{ width: 280, flexShrink: 0, padding: 20, borderRadius: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <span className="badge badge-purple" style={{ marginBottom: 8, display: "inline-block" }}>
                {selectedScenario.user_role}
              </span>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{selectedScenario.title}</h3>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <Target size={14} /> Đối tác AI:
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{selectedScenario.role}</div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, flex: 1 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>
                Nhiệm vụ của bạn:
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {selectedScenario.context_description}
              </p>
            </div>

            {overallScore !== null && (
              <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <Trophy size={20} style={{ color: "#10b981", margin: "0 auto 4px auto" }} />
                <div style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 700 }}>ĐIỂM TRUYỀN THÔNG</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981" }}>{overallScore} / 10</div>
              </div>
            )}
          </div>

          {/* Chat main */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-chat-container)", border: "1px solid var(--border-subtle)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: "85%" }}>
                    {m.role === "assistant" && (
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--gradient-purple)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
                        🎭
                      </div>
                    )}
                    <div className={`chat-bubble chat-bubble-${m.role}`}>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.content}</p>
                    </div>
                  </div>

                  {m.role === "assistant" && m.score && (
                    <div style={{ marginLeft: 36, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="badge badge-success">Score: {m.score}/10</span>
                      {m.feedback && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.feedback}</span>}
                      {(m.vocabulary_saved?.length || 0) > 0 && (
                        <span style={{
                          fontSize: "0.7rem", background: "rgba(16,185,129,0.1)",
                          border: "1px solid rgba(16,185,129,0.25)", borderRadius: 6,
                          padding: "2px 8px", color: "#34d399"
                        }}>
                          📚 {m.vocabulary_saved!.length} từ mới lưu: {m.vocabulary_saved!.slice(0, 3).map(v => v.word).join(", ")}
                        </span>
                      )}
                      {(m.errors_logged || 0) > 0 && (
                        <span style={{
                          fontSize: "0.7rem", background: "rgba(251,113,133,0.08)",
                          border: "1px solid rgba(251,113,133,0.2)", borderRadius: 6,
                          padding: "2px 8px", color: "#fb7185"
                        }}>
                          ⚠ {m.errors_logged} lỗi đã ghi nhận
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--gradient-purple)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    🎭
                  </div>
                  <div className="chat-bubble chat-bubble-ai" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Loader2 size={14} className="spin" />
                    <span>Đối tác AI đang suy nghĩ câu trả lời...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: 16, borderTop: "1px solid var(--border-subtle)", background: "var(--bg-chat-input-bar)", display: "flex", gap: 10 }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendRoleplayStep()}
                placeholder={`Nhập câu trả lời của bạn trong vai ${selectedScenario.user_role}...`}
                style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", outline: "none" }}
              />
              <button className="btn-primary" onClick={sendRoleplayStep} disabled={!input.trim() || loading}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScenariosPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: "80vh", borderRadius: 20 }} />}>
      <ScenariosContent />
    </Suspense>
  );
}
