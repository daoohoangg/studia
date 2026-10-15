"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { API, apiFetch } from "@/lib/api";
import { Send, MessagesSquare, RefreshCw } from "lucide-react";
import Link from "next/link";

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
  const [scenarioError, setScenarioError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bottomRef.current?.parentElement; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetchScenarios();
  }, [docId]);

  const fetchScenarios = async () => {
    setGenerating(true);
    setScenarioError("");
    try {
      const res = await apiFetch(`${API}/scenarios/generate`, {
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
        if (!(data.scenarios || []).length) setScenarioError("Chưa tạo được tình huống nào. Hãy thử lại.");
      } else {
        const d = await res.json().catch(() => ({}));
        setScenarioError(typeof d.detail === "string" ? d.detail : "Không tạo được tình huống.");
      }
    } catch (e) {
      setScenarioError("Không kết nối được máy chủ.");
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
      const res = await apiFetch(`${API}/scenarios/interact`, {
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

      if (!res.ok) throw new Error("interact failed");
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
        content: "Không kết nối được với AI Roleplay Engine."
      }]);
    }
    setLoading(false);
  };

  const turns = messages.filter(m => m.role === "user").length;
  const savedWords = messages.flatMap(m => m.vocabulary_saved || []);
  const errorCount = messages.reduce((n, m) => n + (m.errors_logged || 0), 0);
  const goalDone = messages.some(m => m.is_goal_achieved);

  if (!selectedScenario) {
    return (
      <div className="wrap stagger">
        <header className="page-head">
          <div>
            <h1 className="page-title">Luyện hội thoại</h1>
            <p className="page-sub">Nhập vai một tình huống thật, trả lời bằng tiếng Anh và được sửa lỗi ngay sau mỗi lượt.</p>
          </div>
          <button className="st-btn st-btn-secondary" type="button" onClick={fetchScenarios} disabled={generating}>{generating ? <span className="st-spinner" /> : <RefreshCw size={16} strokeWidth={2} />}Tạo tình huống khác</button>
        </header>

        {generating ? (
          <div className="grid-3">{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 260 }} />)}</div>
        ) : scenarioError && scenarios.length === 0 ? (
          <div role="alert" className="st-card row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ color: "var(--danger)" }}>{scenarioError}</span>
            <button className="st-btn st-btn-primary st-btn-sm" type="button" onClick={fetchScenarios}>Thử lại</button>
          </div>
        ) : (
          <div className="grid-3">
            {scenarios.map((sc, i) => (
              <article key={sc.id} className="st-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span className={`tile ${["tile-accent", "", "tile-success"][i % 3]}`} aria-hidden="true"><MessagesSquare size={20} strokeWidth={1.75} /></span>
                <div>
                  <h2 className="heading-3">{sc.title}</h2>
                  <div className="meta" style={{ marginTop: 2 }}>Bạn: {sc.user_role} · AI: {sc.role}</div>
                </div>
                <p className="ink2" style={{ fontSize: 14.5 }}>{sc.context_description}</p>
                {sc.learning_goals?.length > 0 && (
                  <ul className="stack" style={{ gap: 4, paddingLeft: 18, margin: 0, fontSize: 14, color: "var(--ink-secondary)" }}>
                    {sc.learning_goals.slice(0, 3).map((g, idx) => <li key={idx}>{g}</li>)}
                  </ul>
                )}
                <div className="spacer" style={{ flex: 1 }} />
                <button className="st-btn st-btn-primary st-btn-block" type="button" onClick={() => startRoleplay(sc)}>Bắt đầu nhập vai</button>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="scen-shell" style={{ display: "flex", gap: 16, height: "calc(100vh - 104px)", minHeight: 480 }}>
      <section aria-label="Hội thoại" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", border: "1px solid var(--hairline)", borderRadius: "var(--radius-lg)", background: "var(--surface)", overflow: "hidden" }}>
        <header className="row-wrap" style={{ gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--hairline)" }}>
          <span className="tile tile-accent" aria-hidden="true"><MessagesSquare size={20} strokeWidth={1.75} /></span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <h1 style={{ font: "650 16px/22px var(--font-sans)" }}>{selectedScenario.title}</h1>
            <div className="meta">Bạn: {selectedScenario.user_role} · AI: {selectedScenario.role} · lượt {turns}</div>
          </div>
          <button className="st-btn st-btn-ghost st-btn-sm" type="button" onClick={() => setSelectedScenario(null)}>Đổi tình huống</button>
        </header>

        <div aria-live="polite" style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14, background: "var(--canvas)" }}>
          {messages.map((m, i) => {
            if (m.role === "user") return <div key={i} className="st-bubble st-bubble-user" style={{ maxWidth: "min(72%, 640px)", whiteSpace: "pre-wrap" }}>{m.content}</div>;
            const hasEval = m.score != null || m.feedback;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                {hasEval && (
                  <div className={`scen-fix ${(m.score || 0) >= 8 && !m.errors_logged ? "scen-fix-ok" : ""}`}>
                    <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                      <span className="eyebrow" style={{ color: (m.score || 0) >= 8 ? "var(--success)" : "var(--accent-strong)" }}>Nhận xét lượt vừa rồi</span>
                      {m.score != null && <b className="num" style={{ fontSize: 13 }}>{m.score}/10</b>}
                    </div>
                    {m.feedback && <p style={{ marginTop: 4 }}>{m.feedback}</p>}
                    {((m.vocabulary_saved?.length || 0) > 0 || (m.errors_logged || 0) > 0) && (
                      <div className="row-wrap" style={{ gap: 6, marginTop: 8 }}>
                        {(m.vocabulary_saved?.length || 0) > 0 && <span className="st-badge st-badge-success">Đã lưu: {m.vocabulary_saved!.slice(0, 3).map(v => v.word).join(", ")}</span>}
                        {(m.errors_logged || 0) > 0 && <span className="st-badge st-badge-danger">{m.errors_logged} lỗi được ghi lại</span>}
                      </div>
                    )}
                  </div>
                )}
                <div className="st-bubble st-bubble-ai" style={{ maxWidth: "min(72%, 640px)", whiteSpace: "pre-wrap" }}>{m.content}</div>
              </div>
            );
          })}
          {loading && (
            <div className="st-bubble st-bubble-ai" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="st-typing" aria-hidden="true"><i /><i /><i /></span>
              <span className="meta">{selectedScenario.role} đang trả lời…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={e => { e.preventDefault(); sendRoleplayStep(); }} style={{ padding: "14px 16px", borderTop: "1px solid var(--hairline)" }}>
          <div className="row" style={{ gap: 10 }}>
            <label style={{ flex: 1 }}>
              <span className="st-sr">Câu trả lời</span>
              <input className="input" value={input} onChange={e => setInput(e.target.value)} placeholder={`Trả lời trong vai ${selectedScenario.user_role}…`} />
            </label>
            <button className="st-btn st-btn-primary" type="submit" aria-label="Gửi" disabled={!input.trim() || loading} style={{ width: 48, padding: 0 }}><Send size={18} strokeWidth={2} /></button>
          </div>
        </form>
      </section>

      <aside className="scen-side" aria-label="Bối cảnh và điểm" style={{ flex: "0 1 340px", minWidth: 280, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        <section className="st-card">
          <div className="eyebrow" style={{ color: "var(--ink-muted)" }}>Nhiệm vụ của bạn</div>
          <p style={{ marginTop: 6 }}>{selectedScenario.context_description}</p>
          {selectedScenario.learning_goals?.length > 0 && (
            <>
              <div className="divider" style={{ margin: "14px 0" }} />
              <div className="eyebrow" style={{ color: "var(--ink-muted)", marginBottom: 8 }}>Mục tiêu</div>
              <ul className="stack" style={{ gap: 6, paddingLeft: 18, margin: 0, fontSize: 14.5, color: "var(--ink-secondary)" }}>
                {selectedScenario.learning_goals.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </>
          )}
          {selectedScenario.target_keywords?.length > 0 && (
            <>
              <div className="divider" style={{ margin: "14px 0" }} />
              <div className="eyebrow" style={{ color: "var(--ink-muted)", marginBottom: 8 }}>Từ nên dùng</div>
              <div className="row-wrap" style={{ gap: 6 }}>
                {selectedScenario.target_keywords.map(k => {
                  const used = messages.some(m => m.role === "user" && m.content.toLowerCase().includes(k.toLowerCase()));
                  return <span key={k} className={`st-badge ${used ? "st-badge-success" : ""}`}>{used ? "✓ " : ""}{k}</span>;
                })}
              </div>
            </>
          )}
        </section>
        <section className="st-card" aria-labelledby="sc-h">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 id="sc-h" className="eyebrow" style={{ color: "var(--ink-muted)" }}>Điểm giao tiếp</h2>
            <span className="meta">{goalDone ? "đã đạt mục tiêu" : "tạm tính"}</span>
          </div>
          <div className="num" style={{ font: "700 44px/1 var(--font-display)", letterSpacing: "-1px", marginTop: 8 }}>
            {overallScore ?? <span style={{ color: "var(--ink-muted)" }}>–</span>}<span style={{ fontSize: 20, color: "var(--ink-muted)" }}>/10</span>
          </div>
          <div className="stack" style={{ gap: 8, marginTop: 14, fontSize: 14 }}>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="ink2">Số lượt đã trả lời</span><b className="num">{turns}</b></div>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="ink2">Từ mới đã lưu</span><b className="num">{savedWords.length}</b></div>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="ink2">Lỗi được ghi lại</span><b className="num" style={{ color: errorCount ? "var(--danger)" : undefined }}>{errorCount}</b></div>
          </div>
          {goalDone && <div className="st-badge st-badge-success" style={{ marginTop: 14 }}>Bạn đã hoàn thành mục tiêu tình huống</div>}
          {errorCount > 0 && <Link className="st-btn st-btn-secondary st-btn-sm st-btn-block" href="/feedback" style={{ marginTop: 14 }}>Xem phân tích lỗi</Link>}
        </section>
      </aside>
    </div>
  );
}

export default function ScenariosPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: "80vh" }} />}>
      <ScenariosContent />
    </Suspense>
  );
}
