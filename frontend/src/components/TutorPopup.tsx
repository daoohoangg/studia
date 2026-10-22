"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Send, X, Maximize2 } from "lucide-react";
import Mascot from "@/components/mascot/Mascot";
import { API, apiFetch } from "@/lib/api";
import { pickMood, type Pick } from "@/lib/mascot";
import { fetchStreak } from "@/lib/schedule";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Phân biệt \"which\" và \"that\" trong mệnh đề quan hệ",
  "Cách mở bài Task 2 dạng Discuss both views",
  "Khi nào dùng hiện tại hoàn thành thay vì quá khứ đơn?",
];

/** Ngữ cảnh sách/chủ đề lấy từ URL hiện tại để câu trả lời bám đúng tài liệu. */
function contextFromUrl(pathname: string): { doc?: string; topic?: string } {
  const q = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const book = pathname.match(/^\/books\/([^/]+)/);
  const lesson = pathname.match(/^\/(?:lesson|quiz)\/([^/]+)/);
  return {
    doc: q.get("doc") || (book ? book[1] : undefined),
    topic: q.get("topic") || (lesson ? lesson[1] : undefined),
  };
}

export default function TutorPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Coal đổi dáng theo streak của bạn (cháy khi học đều, ướt khi bỏ học lâu)
  const [coal, setCoal] = useState<Pick | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 120); }, [open]);
  useEffect(() => {
    if (!open || coal) return;
    fetchStreak().then((s) => setCoal(pickMood(s))).catch(() => setCoal(pickMood(null)));
  }, [open, coal]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const ctx = contextFromUrl(pathname);
      const res = await apiFetch(`${API}/tutor/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: msg, document_id: ctx.doc ?? null, topic_id: ctx.topic ?? null, session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setMessages((m) => [...m, { role: "assistant", content: data.answer || "Xin lỗi, tôi chưa trả lời được câu này." }]);
      if (data.session_id && !sessionId) setSessionId(data.session_id);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Không kết nối được với trợ lý AI. Hãy thử lại sau." }]);
    }
    setLoading(false);
  };

  const hasCtx = Boolean(contextFromUrl(pathname).doc || contextFromUrl(pathname).topic);

  return (
    <>
      {open && (
        <section className="tp-panel" role="dialog" aria-label="Coal, bạn học AI" aria-modal="false">
          <header className="tp-head">
            <span className="tp-avatar" aria-hidden="true" style={{ background: "transparent", overflow: "visible" }}><Mascot mood={coal?.mood ?? "hello"} wet={coal?.wet} fire={coal?.fire} size={40} still={!loading} talking={loading} label="" /></span>
            <div style={{ minWidth: 0 }}>
              <b style={{ font: "650 15px/20px var(--font-sans)" }}>Coal · bạn học AI</b>
              <div className="meta">{hasCtx ? "Đang bám theo sách/bài bạn mở" : "Hỏi về ngữ pháp, từ vựng, cách làm bài"}</div>
            </div>
            <span style={{ flex: 1 }} />
            <button className="icon-btn" type="button" title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới" onClick={() => { setMessages([]); setSessionId(null); }}><Plus size={18} strokeWidth={1.75} /></button>
            <Link className="icon-btn" href="/tutor" title="Mở toàn trang" aria-label="Mở toàn trang" onClick={() => setOpen(false)}><Maximize2 size={16} strokeWidth={1.75} /></Link>
            <button className="icon-btn" type="button" title="Đóng" aria-label="Đóng trợ lý" onClick={() => setOpen(false)}><X size={18} strokeWidth={1.75} /></button>
          </header>

          <div className="tp-list" ref={listRef} aria-live="polite">
            {messages.length === 0 ? (
              <div className="stack" style={{ gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "center" }}><Mascot mood={coal?.mood ?? "hello"} wet={coal?.wet} fire={coal?.fire} size={104} /></div>
                <p className="ink2" style={{ fontSize: 14.5 }}>{coal?.line ?? "Hi, mình là Coal, cục than nhỏ muốn thành kim cương."} Bạn đang vướng chỗ nào?</p>
                {SUGGESTIONS.map((s) => <button key={s} type="button" className="tp-sugg" onClick={() => send(s)}>{s}</button>)}
              </div>
            ) : messages.map((m, i) => (
              <div key={i} className={`tp-msg ${m.role === "user" ? "u" : "a"}`}>{m.content}</div>
            ))}
            {loading && <div className="tp-msg a"><span className="st-typing"><i /><i /><i /></span></div>}
          </div>

          <form className="tp-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea ref={inputRef} rows={1} value={input} placeholder="Hỏi Coal bất cứ điều gì…" aria-label="Câu hỏi cho trợ lý"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className="st-btn st-btn-primary st-btn-sm" type="submit" disabled={loading || !input.trim()} aria-label="Gửi"><Send size={16} strokeWidth={2} /></button>
          </form>
        </section>
      )}

      <button type="button" className={`tp-fab${open ? " open" : ""}`} aria-label={open ? "Đóng Coal" : "Hỏi Coal, bạn học AI"} aria-expanded={open}
        onClick={() => setOpen((o) => !o)}>
        {open ? <X size={24} strokeWidth={2.2} /> : <Mascot mood={coal?.mood ?? "hello"} wet={coal?.wet} fire={coal?.fire} size={64} still label="" />}
        {!open && <span className="tp-fab-ping" aria-hidden="true" />}
      </button>
    </>
  );
}
