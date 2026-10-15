"use client";

import { EbookBlock, ResolvedHighlight, buildSegments } from "@/lib/ebook";

const LIST_MARKER = /^(?:[-•●▪◦–]|\d{1,3}[.)]|[A-Za-z][.)])\s/;

export function Segments({ text, highlights }: { text: string; highlights: ResolvedHighlight[] }) {
  return (
    <>
      {buildSegments(text, highlights).map((segment, i) => {
        let node: React.ReactNode = segment.text;
        if (segment.bold) node = <strong>{node}</strong>;
        if (segment.color) {
          node = <mark className={`studia-hl-${segment.color}`} data-hid={segment.highlightId ?? undefined}>{node}</mark>;
        }
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

interface BlockViewProps {
  block: EbookBlock;
  highlights: ResolvedHighlight[];
  editable: boolean;
  hasNote: boolean;
  onEdit: () => void;
  onOpenNotes: () => void;
}

export default function BlockView({ block, highlights, editable, hasNote, onEdit, onOpenNotes }: BlockViewProps) {
  // data-ebook-block: SelectionContextMenu dựa vào đây để biết vùng bôi đen thuộc khối nào
  const textProps = { "data-ebook-block": block.id };
  let body: React.ReactNode;

  if (block.block_type === "heading") {
    const Tag = (block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4") as "h2";
    body = <Tag {...textProps}><Segments text={block.text} highlights={highlights} /></Tag>;
  } else if (block.block_type === "table") {
    body = (
      <table>
        <tbody>
          {block.text.split("\n").map((row, r) => (
            <tr key={r}>{row.split(" | ").map((cell, c) => <td key={c}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    );
  } else if (block.block_type === "list_item") {
    // Văn bản từ PDF đã có ký hiệu đầu dòng; từ DOCX thì chưa → thêm bên ngoài vùng chữ để không lệch vị trí bôi đen
    body = (
      <p>
        {!LIST_MARKER.test(block.text) && <span aria-hidden="true" style={{ userSelect: "none" }}>•&nbsp;</span>}
        <span {...textProps}><Segments text={block.text} highlights={highlights} /></span>
      </p>
    );
  } else {
    body = (
      <p {...textProps}>
        {block.text ? <Segments text={block.text} highlights={highlights} /> : <em style={{ opacity: 0.5 }}>(đoạn trống)</em>}
      </p>
    );
  }

  return (
    <div
      id={`blk-${block.id}`}
      data-page={block.page_number ?? undefined}
      className={`reader-block ${block.block_type === "list_item" ? "list" : ""} ${editable ? "editable" : ""}`}
      onClick={editable ? onEdit : undefined}
    >
      {body}
      {hasNote && (
        <button className="reader-marker" title="Đoạn này có ghi chú" aria-label="Mở sổ ghi chú"
          onClick={(e) => { e.stopPropagation(); onOpenNotes(); }} />
      )}
      {block.is_edited && <span className="reader-marker edited" title="Đã chỉnh sửa" />}
    </div>
  );
}
