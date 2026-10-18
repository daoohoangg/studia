"use client";

import { useEffect, useRef, useState } from "react";
import type { ExamNote } from "@/lib/examNotes";

/** Sổ ghi chú nổi của phòng luyện tập: mở bằng nút ở góc trái hoặc từ menu “Ghi chú” khi bôi đen chữ. */
export default function ExamNotes({ notes, onAdd, onRemove, open, onOpenChange, quote, onQuoteUsed }: {
  notes: ExamNote[]; onAdd: (text: string, quote?: string) => void; onRemove: (id: string) => void;
  open: boolean; onOpenChange: (v: boolean) => void; quote: string; onQuoteUsed: () => void;
}) {
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (open) setTimeout(() => area.current?.focus(), 80); }, [open, quote]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const save = () => {
    if (!text.trim() && !quote) return;
    onAdd(text, quote || undefined);
    setText("");
    onQuoteUsed();
  };

  return (
    <>
      <button type="button" className="exam-notes-fab" onClick={() => onOpenChange(!open)} aria-expanded={open}>
        Ghi chú{notes.length ? ` (${notes.length})` : ""}
      </button>
      {open && (
        <aside className="exam-notes" role="complementary" aria-label="Sổ ghi chú">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 className="heading-3" style={{ fontSize: 16 }}>Sổ ghi chú</h3>
            <button type="button" className="st-btn st-btn-ghost st-btn-sm" onClick={() => onOpenChange(false)}>Đóng</button>
          </div>
          {quote && (
            <blockquote className="exam-notes-quote">
              {quote}
              <button type="button" onClick={onQuoteUsed} aria-label="Bỏ trích dẫn">×</button>
            </blockquote>
          )}
          <textarea ref={area} className="input" rows={3} value={text} maxLength={1000} placeholder="Ghi chú cho bản thân: từ khoá, câu cần xem lại, mẹo…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }}
            style={{ height: "auto", padding: 12, lineHeight: 1.5, resize: "vertical" }} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="meta">Ctrl + Enter để lưu</span>
            <button type="button" className="st-btn st-btn-primary st-btn-sm" onClick={save} disabled={!text.trim() && !quote}>Lưu ghi chú</button>
          </div>
          <ul className="exam-notes-list">
            {notes.map((n) => (
              <li key={n.id}>
                {n.quote && <q>{n.quote}</q>}
                {n.text && <p>{n.text}</p>}
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="meta">{new Date(n.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                  <button type="button" className="st-btn st-btn-ghost st-btn-sm" onClick={() => onRemove(n.id)}>Xoá</button>
                </div>
              </li>
            ))}
            {notes.length === 0 && <li className="meta" style={{ border: 0 }}>Chưa có ghi chú. Ghi chú được giữ trên máy bạn và hiện lại ở phần xem kết quả.</li>}
          </ul>
        </aside>
      )}
    </>
  );
}
