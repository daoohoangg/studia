"use client";

import { useEffect, useRef, useState } from "react";

import { BlockRevision, EbookBlock, plainText, toggleBold } from "@/lib/ebook";

interface BlockEditorProps {
  block: EbookBlock;
  onSave: (changes: Partial<EbookBlock>) => void;
  onCancel: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onInsertAfter: () => void;
  onSplit: (text: string, offset: number) => void;
  onMergePrevious: (text: string) => void;
  loadRevisions: () => Promise<BlockRevision[]>;
  onRestoreRevision: (revisionId: string) => void;
}

export default function BlockEditor({
  block, onSave, onCancel, onRestore, onDelete, onInsertAfter, onSplit, onMergePrevious, loadRevisions,
  onRestoreRevision,
}: BlockEditorProps) {
  const [text, setText] = useState(block.text);
  const [kind, setKind] = useState(block.block_type === "heading" ? `heading-${block.level || 2}` : block.block_type);
  const [revisions, setRevisions] = useState<BlockRevision[] | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.focus();
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight + 4}px`;
  }, [text]);

  const applyBold = () => {
    const area = areaRef.current;
    if (!area || area.selectionStart === area.selectionEnd) return;
    setText(toggleBold(text, area.selectionStart, area.selectionEnd));
  };

  const save = () => {
    const [type, level] = kind.split("-");
    onSave({ text, block_type: type as EbookBlock["block_type"], ...(level ? { level: Number(level) } : {}) });
  };

  const split = () => {
    const area = areaRef.current;
    if (!area) return;
    const offset = area.selectionStart;
    if (offset <= 0 || offset >= text.length || !plainText(text.slice(0, offset)).trim() || !plainText(text.slice(offset)).trim()) {
      window.alert("Đặt con trỏ vào giữa đoạn, nơi bạn muốn tách làm hai.");
      return;
    }
    onSplit(text, offset);
  };

  const toggleHistory = async () => {
    if (revisions) { setRevisions(null); return; }
    setRevisions(await loadRevisions());
  };

  const isTable = block.block_type === "table";

  return (
    <div className="reader-editor" id={`blk-${block.id}`}>
      <div className="reader-editor-bar">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Loại khối">
          <option value="paragraph">Đoạn văn</option>
          <option value="heading-1">Tiêu đề 1</option>
          <option value="heading-2">Tiêu đề 2</option>
          <option value="heading-3">Tiêu đề 3</option>
          <option value="list_item">Mục danh sách</option>
          {isTable && <option value="table">Bảng</option>}
        </select>
        <button onClick={applyBold} title="Bôi đen chữ trong ô rồi bấm để in đậm / bỏ in đậm (Ctrl+B)" style={{ fontWeight: 800 }}>B</button>
        {!isTable && <button onClick={split} title="Tách đoạn tại vị trí con trỏ">Tách tại con trỏ</button>}
        {!isTable && <button onClick={() => onMergePrevious(text)} title="Gộp đoạn này vào đoạn phía trên">Gộp vào đoạn trên</button>}
        <span className="reader-muted">
          Chữ đậm hiển thị dạng **chữ**{isTable ? " · Bảng: mỗi hàng một dòng, các ô cách nhau bằng “ | ”" : ""}
        </span>
      </div>
      <textarea ref={areaRef} className="reader-textarea" value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
          if (e.key === "Escape") onCancel();
          if (e.key.toLowerCase() === "b" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); applyBold(); }
        }} />
      <div className="reader-note-actions" style={{ marginTop: 8 }}>
        <button className="reader-primary" style={{ marginTop: 0 }} onClick={save}>Lưu (Ctrl+Enter)</button>
        <button className="reader-link" onClick={onCancel}>Huỷ</button>
        <button className="reader-link" onClick={onInsertAfter}>Thêm đoạn bên dưới</button>
        <button className="reader-link" onClick={toggleHistory}>{revisions ? "Ẩn lịch sử" : "Lịch sử sửa"}</button>
        {block.is_edited && <button className="reader-link" onClick={onRestore}>Khôi phục bản gốc</button>}
        <button className="reader-link danger" onClick={onDelete}>Xoá đoạn</button>
      </div>

      {revisions && (
        <div className="reader-revisions">
          {revisions.length === 0 && <span className="reader-muted">Đoạn này chưa có bản cũ nào.</span>}
          {revisions.map((revision) => (
            <div key={revision.id} className="reader-revision">
              <div className="reader-muted">{new Date(revision.created_at).toLocaleString("vi-VN")}</div>
              <div className="reader-revision-text">{plainText(revision.text).slice(0, 220) || "(trống)"}</div>
              <button className="reader-link" onClick={() => onRestoreRevision(revision.id)}>Khôi phục bản này</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
