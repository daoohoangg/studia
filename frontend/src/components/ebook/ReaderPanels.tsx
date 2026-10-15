"use client";

import { useEffect, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import {
  DEFAULT_PREFS, EbookHighlight, EbookNote, FONT_SIZE_RANGE, HIGHLIGHT_COLORS, HIGHLIGHT_SWATCH, OutlineItem,
  READER_FONTS, READER_THEMES, READER_WIDTHS, ReaderPrefs, SearchHit, plainText,
} from "@/lib/ebook";

export function DrawerHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="reader-drawer-header">
      <span>{title}</span>
      <button className="reader-link" onClick={onClose}>Đóng</button>
    </div>
  );
}

// ─── Mục lục ─────────────────────────────────────────────────

export function TocPanel({ outline, onJump, onClose }: {
  outline: OutlineItem[]; onJump: (blockId: string) => void; onClose: () => void;
}) {
  return (
    <aside className="reader-drawer left">
      <DrawerHeader title="Mục lục" onClose={onClose} />
      {outline.length === 0 && (
        <p className="reader-muted">Tài liệu này chưa có tiêu đề nào. Trong chế độ chỉnh sửa, bạn có thể đổi một đoạn thành tiêu đề.</p>
      )}
      {outline.map((item) => (
        <button key={item.block_id} className="reader-toc-item"
          style={{ paddingLeft: `${(item.level - 1) * 14 + 8}px`, fontWeight: item.level === 1 ? 700 : 500 }}
          onClick={() => onJump(item.block_id)}>
          <span>{plainText(item.text)}</span>
          {item.page_number && <span className="reader-muted">{item.page_number}</span>}
        </button>
      ))}
    </aside>
  );
}

// ─── Hiển thị ────────────────────────────────────────────────

export function SettingsPanel({ prefs, onChange, onClose }: {
  prefs: ReaderPrefs; onChange: (changes: Partial<ReaderPrefs>) => void; onClose: () => void;
}) {
  return (
    <aside className="reader-drawer right">
      <DrawerHeader title="Hiển thị" onClose={onClose} />
      <label className="reader-label">Cỡ chữ: {prefs.fontSize}px</label>
      <input type="range" min={FONT_SIZE_RANGE.min} max={FONT_SIZE_RANGE.max} value={prefs.fontSize}
        onChange={(e) => onChange({ fontSize: Number(e.target.value) })} style={{ width: "100%" }} />

      <label className="reader-label">Phông chữ</label>
      <div className="reader-options">
        {(Object.keys(READER_FONTS) as (keyof typeof READER_FONTS)[]).map((key) => (
          <button key={key} className={`reader-option ${prefs.fontFamily === key ? "active" : ""}`}
            style={{ fontFamily: READER_FONTS[key].css }} onClick={() => onChange({ fontFamily: key })}>
            {READER_FONTS[key].label}
          </button>
        ))}
      </div>

      <label className="reader-label">Màu nền</label>
      <div className="reader-swatches">
        {(Object.keys(READER_THEMES) as (keyof typeof READER_THEMES)[]).map((key) => (
          <button key={key} className={`reader-swatch ${prefs.theme === key ? "active" : ""}`} title={READER_THEMES[key].label}
            aria-label={`Màu nền ${READER_THEMES[key].label}`} style={{ background: READER_THEMES[key].swatch }}
            onClick={() => onChange({ theme: key })} />
        ))}
      </div>
      <div className="reader-muted" style={{ marginTop: 6 }}>{READER_THEMES[prefs.theme].label}</div>

      <label className="reader-label">Giãn dòng: {prefs.lineHeight.toFixed(1)}</label>
      <input type="range" min={1.3} max={2.2} step={0.1} value={prefs.lineHeight}
        onChange={(e) => onChange({ lineHeight: Number(e.target.value) })} style={{ width: "100%" }} />

      <label className="reader-label">Độ rộng trang</label>
      <div className="reader-options row">
        {(Object.keys(READER_WIDTHS) as (keyof typeof READER_WIDTHS)[]).map((key) => (
          <button key={key} className={`reader-option ${prefs.width === key ? "active" : ""}`} onClick={() => onChange({ width: key })}>
            {READER_WIDTHS[key].label}
          </button>
        ))}
      </div>

      <button className="reader-option" style={{ marginTop: 20 }} onClick={() => onChange(DEFAULT_PREFS)}>Đặt lại mặc định</button>
    </aside>
  );
}

// ─── Tìm trong sách ──────────────────────────────────────────

export function SearchPanel({ base, onJump, onClose }: {
  base: string; onJump: (blockId: string) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [limited, setLimited] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setHits(null); return; }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await apiFetch(`${base}/search?q=${encodeURIComponent(term)}`);
        if (res.ok && id === requestId.current) {
          const data = await res.json();
          setHits(data.results || []);
          setLimited(!!data.limited);
        }
      } finally {
        if (id === requestId.current) setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, base]);

  return (
    <aside className="reader-drawer right">
      <DrawerHeader title="Tìm trong sách" onClose={onClose} />
      <input className="reader-input" autoFocus placeholder="Nhập từ hoặc cụm từ (từ 2 ký tự)..." value={query}
        onChange={(e) => setQuery(e.target.value)} />
      {busy && <p className="reader-muted" style={{ marginTop: 10 }}>Đang tìm...</p>}
      {hits && !busy && hits.length === 0 && <p className="reader-muted" style={{ marginTop: 10 }}>Không có kết quả.</p>}
      {hits && hits.length > 0 && (
        <p className="reader-muted" style={{ margin: "10px 0" }}>
          {limited ? `Hiển thị ${hits.length} kết quả đầu tiên` : `${hits.length} kết quả`}
        </p>
      )}
      {(hits || []).map((hit) => (
        <button key={`${hit.block_id}-${hit.match_start}`} className="reader-hit" onClick={() => onJump(hit.block_id)}>
          <span className="reader-muted">{hit.page_number ? `Trang ${hit.page_number}` : "—"}</span>
          <span>
            {hit.snippet.slice(0, hit.match_start)}
            <mark className="studia-hl-yellow">{hit.snippet.slice(hit.match_start, hit.match_start + hit.match_length)}</mark>
            {hit.snippet.slice(hit.match_start + hit.match_length)}
          </span>
        </button>
      ))}
    </aside>
  );
}

// ─── Sổ ghi chú + Highlight ──────────────────────────────────

export interface NoteDraft { quote: string | null; blockId: string | null; content: string }

export function NotesPanel({
  notes, highlights, highlightText, draft, onDraftChange, onSaveNote, onUpdateNote, onDeleteNote, onJump,
  onChangeHighlightColor, onDeleteHighlight, onClose, tab, onTab,
}: {
  notes: EbookNote[];
  highlights: EbookHighlight[];
  highlightText: (highlight: EbookHighlight) => string;
  draft: NoteDraft;
  onDraftChange: (draft: NoteDraft) => void;
  onSaveNote: () => void;
  onUpdateNote: (noteId: string, content: string) => Promise<boolean>;
  onDeleteNote: (noteId: string) => void;
  onJump: (blockId: string | null) => void;
  onChangeHighlightColor: (highlightId: string, color: string) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onClose: () => void;
  tab: "notes" | "highlights";
  onTab: (tab: "notes" | "highlights") => void;
}) {
  return (
    <aside className="reader-drawer right">
      <DrawerHeader title="Sổ tay" onClose={onClose} />
      <div className="reader-tabs">
        <button className={tab === "notes" ? "active" : ""} onClick={() => onTab("notes")}>Ghi chú ({notes.length})</button>
        <button className={tab === "highlights" ? "active" : ""} onClick={() => onTab("highlights")}>Highlight ({highlights.length})</button>
      </div>

      {tab === "notes" && (
        <>
          {draft.quote && (
            <blockquote className="reader-quote">
              {draft.quote}
              <button className="reader-link" onClick={() => onDraftChange({ ...draft, quote: null, blockId: null })}>Bỏ trích dẫn</button>
            </blockquote>
          )}
          <textarea className="reader-textarea" rows={4} placeholder="Viết ghi chú cho cuốn sách này..."
            value={draft.content} autoFocus={!!draft.quote}
            onChange={(e) => onDraftChange({ ...draft, content: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSaveNote(); }} />
          <button className="reader-primary" disabled={!draft.content.trim()} onClick={onSaveNote}>Lưu ghi chú</button>
          <p className="reader-muted" style={{ margin: "8px 0 16px" }}>
            Mẹo: bôi đen một đoạn trong sách rồi chọn “Ghi chú” để ghi kèm trích dẫn.
          </p>
          {notes.length === 0 && <p className="reader-muted">Chưa có ghi chú nào.</p>}
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onJump={() => onJump(note.block_id)}
              onSave={(content) => onUpdateNote(note.id, content)} onDelete={() => onDeleteNote(note.id)} />
          ))}
        </>
      )}

      {tab === "highlights" && (
        <>
          {highlights.length === 0 && (
            <p className="reader-muted">Chưa có highlight nào. Bôi đen chữ trong sách rồi chọn “Highlight” và một màu.</p>
          )}
          {highlights.map((highlight) => (
            <div key={highlight.id} className="reader-note">
              <blockquote className="reader-quote" style={{ borderLeftColor: HIGHLIGHT_SWATCH[highlight.color]?.bg }}>
                {highlightText(highlight) || "(đoạn đã bị sửa hoặc xoá)"}
              </blockquote>
              <div className="reader-note-actions">
                <button className="reader-link" onClick={() => onJump(highlight.block_id)}>Đến đoạn</button>
                {HIGHLIGHT_COLORS.map((color) => (
                  <button key={color} aria-label={`Đổi sang màu ${HIGHLIGHT_SWATCH[color].label}`} title={HIGHLIGHT_SWATCH[color].label}
                    className="reader-dot" style={{ background: HIGHLIGHT_SWATCH[color].bg,
                      outline: highlight.color === color ? "2px solid var(--primary)" : "none" }}
                    onClick={() => onChangeHighlightColor(highlight.id, color)} />
                ))}
                <button className="reader-link danger" style={{ marginLeft: "auto" }} onClick={() => onDeleteHighlight(highlight.id)}>Xoá</button>
              </div>
            </div>
          ))}
        </>
      )}
    </aside>
  );
}

function NoteCard({ note, onJump, onSave, onDelete }: {
  note: EbookNote; onJump: () => void; onSave: (content: string) => Promise<boolean>; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);

  return (
    <div className="reader-note">
      {note.quote && <blockquote className="reader-quote">{note.quote}</blockquote>}
      {editing ? (
        <textarea className="reader-textarea" rows={3} value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} />
      ) : (
        <p className="reader-note-content">{note.content}</p>
      )}
      <div className="reader-note-actions">
        {editing ? (
          <>
            <button className="reader-link" disabled={!draft.trim()}
              onClick={async () => { if (await onSave(draft.trim())) setEditing(false); }}>Lưu</button>
            <button className="reader-link" onClick={() => { setDraft(note.content); setEditing(false); }}>Huỷ</button>
          </>
        ) : (
          <>
            {note.block_id && <button className="reader-link" onClick={onJump}>Đến đoạn</button>}
            <button className="reader-link" onClick={() => setEditing(true)}>Sửa</button>
            <button className="reader-link danger" onClick={onDelete}>Xoá</button>
          </>
        )}
        <span className="reader-muted" style={{ marginLeft: "auto" }}>
          {new Date(note.updated_at || note.created_at).toLocaleDateString("vi-VN")}
        </span>
      </div>
    </div>
  );
}

// ─── Ảnh trang gốc (PDF) ─────────────────────────────────────

export function PageImagePane({ base, page, maxPage, onPage, onClose }: {
  base: string; page: number; maxPage: number; onPage: (page: number) => void; onClose: () => void;
}) {
  const cache = useRef<Map<number, string>>(new Map());
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    const cached = cache.current.get(page);
    if (cached) { setUrl(cached); return; }
    setUrl(null);
    (async () => {
      try {
        const res = await apiFetch(`${base}/pages/${page}/image?scale=1.6`);
        if (!res.ok) throw new Error(String(res.status));
        const objectUrl = URL.createObjectURL(await res.blob());
        cache.current.set(page, objectUrl);
        if (!cancelled) setUrl(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [base, page]);

  useEffect(() => () => { cache.current.forEach((u) => URL.revokeObjectURL(u)); cache.current.clear(); }, []);

  return (
    <aside className="reader-pane">
      <div className="reader-drawer-header">
        <span>Trang gốc</span>
        <button className="reader-link" onClick={onClose}>Đóng</button>
      </div>
      <div className="reader-pane-nav">
        <button className="reader-tool" disabled={page <= 1} onClick={() => onPage(page - 1)}>←</button>
        <span>Trang {page}{maxPage ? ` / ${maxPage}` : ""}</span>
        <button className="reader-tool" disabled={maxPage > 0 && page >= maxPage} onClick={() => onPage(page + 1)}>→</button>
      </div>
      {error && <p className="reader-muted">Không tải được ảnh trang này (tài liệu không có tệp PDF gốc hoặc trang không tồn tại).</p>}
      {!error && !url && <p className="reader-muted">Đang tải ảnh trang...</p>}
      {url && <img src={url} alt={`Trang ${page} của tệp gốc`} style={{ width: "100%", borderRadius: 6, border: "1px solid var(--border-subtle)" }} />}
    </aside>
  );
}
