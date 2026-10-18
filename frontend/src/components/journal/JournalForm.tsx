"use client";

import { useEffect, useState } from "react";
import Mascot from "@/components/mascot/Mascot";
import { FEELINGS, TAGS, type Feeling, type JournalEntry } from "@/lib/journal";
import "./journal.css";

/** Chọn cảm xúc bằng sticker linh vật, gắn thẻ và viết vài dòng cảm nhận cho một ngày học. */
export default function JournalForm({ day, entry, onSave, onDelete }: {
  day: string; entry?: JournalEntry; onSave: (e: Omit<JournalEntry, "updatedAt">) => void; onDelete?: () => void;
}) {
  const [feeling, setFeeling] = useState<Feeling | null>(entry?.feeling ?? null);
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [text, setText] = useState(entry?.text ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => { setFeeling(entry?.feeling ?? null); setTags(entry?.tags ?? []); setText(entry?.text ?? ""); setSaved(false); }, [day, entry?.updatedAt]);

  const toggleTag = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const submit = () => {
    if (!feeling) return;
    onSave({ day, feeling, tags, text });
    setSaved(true);
  };

  return (
    <div className="jf">
      <div className="jf-label" id={`jf-feel-${day}`}>Hôm nay bạn thấy thế nào?</div>
      <div className="jf-feel" role="radiogroup" aria-labelledby={`jf-feel-${day}`}>
        {FEELINGS.map((f) => (
          <button key={f.value} type="button" role="radio" aria-checked={feeling === f.value} className="jf-opt" data-on={feeling === f.value || undefined}
            onClick={() => { setFeeling(f.value); setSaved(false); }}>
            <Mascot mood={f.mood} size={feeling === f.value ? 64 : 52} still={feeling !== f.value} label="" />
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      <div className="jf-label">Buổi học có gì đáng nhớ?</div>
      <div className="jf-tags">
        {TAGS.map((t) => (
          <button key={t} type="button" className="jf-tag" aria-pressed={tags.includes(t)} onClick={() => { toggleTag(t); setSaved(false); }}>{t}</button>
        ))}
      </div>

      <label className="jf-label" htmlFor={`jf-text-${day}`}>Vài dòng cho chính mình</label>
      <textarea id={`jf-text-${day}`} className="jf-text" rows={4} maxLength={1000} value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }}
        placeholder="Hôm nay mình học được gì? Điều gì khó? Mai mình sẽ thử…" />

      <div className="jf-foot">
        <span className="jf-hint" role="status">{saved ? "Đã lưu vào nhật ký. Tim rất vui!" : `${text.length}/1000`}</span>
        {entry && onDelete && <button type="button" className="st-btn st-btn-ghost st-btn-sm" onClick={onDelete}>Xoá mục này</button>}
        <button type="button" className="st-btn st-btn-primary" disabled={!feeling} onClick={submit}>{entry ? "Cập nhật" : "Lưu nhật ký"}</button>
      </div>
    </div>
  );
}
