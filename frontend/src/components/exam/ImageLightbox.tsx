"use client";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";

export type LbZoom = "fit" | 100 | 150 | 200;

interface Props {
  open: boolean;
  src: string;
  alt: string;
  /** Câu mô tả đề, nhắc người học đang xem hình của đề nào */
  caption: string;
  zoom: LbZoom;
  onZoom: (z: LbZoom) => void;
  onClose: () => void;
  /** Phần tử đã mở lớp xem hình, nhận lại focus khi đóng */
  returnFocusRef: MutableRefObject<HTMLElement | null>;
  /** Điện thoại: chỉ 3 mức (không có 200%) */
  narrow: boolean;
}

/**
 * Lớp xem hình (portal vào body, nằm dưới header nên đồng hồ thi vẫn thấy).
 * CSS: class room-lb* ở room.css (ngoài .room-root vì portal).
 * Không đổi route/history; đồng hồ và ô viết nằm ngoài cây này nên không bị gỡ/gắn lại.
 */
export default function ImageLightbox({ open, src, alt, caption, zoom, onZoom, onClose, returnFocusRef, narrow }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pointerRef = useRef<string>("mouse");
  const [nat, setNat] = useState(0);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);

  const levels: LbZoom[] = narrow ? ["fit", 100, 150] : ["fit", 100, 150, 200];
  const cur: LbZoom = narrow && zoom === 200 ? 150 : zoom;
  const shownSrc = tries > 0 ? `${src}${src.includes("?") ? "&" : "?"}lr=${tries}` : src;

  // Mở: focus vào vùng cuộn; đóng: trả focus về nút đã mở
  useEffect(() => {
    if (!open) return;
    const opener = returnFocusRef.current;
    const dlg = dialogRef.current;
    setFailed(false);
    stageRef.current?.focus({ preventScroll: true });
    return () => {
      // Chỉ trả focus khi nó còn ở trong lớp xem hình hoặc đã rơi về body; nếu người dùng đã chuyển
      // focus sang chỗ khác (nút "Nộp bài" ở header, hộp xác nhận) thì không giật lại.
      const a = document.activeElement;
      if (!a || a === document.body || (dlg && dlg.contains(a))) opener?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Ảnh có thể đã sẵn trong cache trước khi gắn onLoad
  useEffect(() => {
    if (!open) return;
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setNat(el.naturalWidth);
  }, [open, shownSrc]);

  if (!open || typeof document === "undefined") return null;

  const step = (d: number) => {
    const i = levels.indexOf(cur);
    const next = levels[Math.min(levels.length - 1, Math.max(0, i + d))];
    if (next !== cur) onZoom(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (e.key === "Tab") {
      const root = dialogRef.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]'))
        .filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || active === root || !root.contains(active))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !root.contains(active))) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "+" || e.key === "=") { e.preventDefault(); step(1); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); step(-1); }
    else if (e.key === "0") { e.preventDefault(); onZoom("fit"); }
    else if (e.key === "1") { e.preventDefault(); onZoom(100); }
  };

  const px = cur !== "fit" && nat > 0;
  const imgStyle = px ? { width: Math.round((nat * (cur as number)) / 100) } : undefined;
  const labelOf = (z: LbZoom) => (z === "fit" ? "Vừa khung" : `${z}%`);

  return createPortal(
    <div
      ref={dialogRef}
      className="room-lb"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lb-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <h2 id="lb-title" className="room-lb-title">Hình đề Task 1</h2>
      <p className="room-lb-cap" title={caption}>{caption}</p>
      <p id="lb-hint" className="room-lb-hint">Kéo để xem các phần khác. Bấm Vừa khung để xem toàn bộ hình.</p>
      <div
        ref={stageRef}
        className="room-lb-stage"
        tabIndex={0}
        role="region"
        aria-label="Hình đề Writing Task 1. Dùng phím mũi tên để cuộn."
        aria-describedby="lb-hint"
        onPointerDown={(e) => { pointerRef.current = e.pointerType; }}
        onClick={(e) => { if (e.target === e.currentTarget && pointerRef.current === "mouse") onClose(); }}
      >
        {failed ? (
          <div className="room-lb-fail" role="alert">
            <span>Không tải được hình đề. Kiểm tra mạng rồi bấm Tải lại. Đồng hồ vẫn chạy.</span>
            <button type="button" className="st-btn st-btn-secondary st-btn-sm" onClick={() => { setFailed(false); setTries((n) => n + 1); }}>Tải lại hình</button>
          </div>
        ) : (
          <div className="room-lb-paper" data-mode={px ? "px" : "fit"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={shownSrc}
              alt={alt}
              style={imgStyle}
              data-zoom={String(cur)}
              onLoad={(e) => setNat(e.currentTarget.naturalWidth)}
              onError={() => setFailed(true)}
              onClick={() => { if (pointerRef.current === "mouse") onZoom(cur === "fit" ? 100 : "fit"); }}
            />
          </div>
        )}
      </div>
      <div className="room-lb-bar">
        <div className="room-lb-group" role="group" aria-label="Mức phóng">
          {levels.map((z) => (
            <button
              key={String(z)}
              type="button"
              className={`st-btn st-btn-secondary st-btn-sm room-lb-z${z === cur ? " is-active" : ""}${z === 200 ? " room-lb-z200" : ""}`}
              aria-pressed={z === cur}
              onClick={() => onZoom(z)}
            >
              {labelOf(z)}
            </button>
          ))}
        </div>
        <button type="button" className="st-btn st-btn-primary st-btn-sm room-lb-close" title="Đóng (Esc)" onClick={onClose}>Đóng</button>
      </div>
    </div>,
    document.body
  );
}
