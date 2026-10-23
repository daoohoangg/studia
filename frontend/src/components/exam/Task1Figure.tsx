"use client";
import { useEffect, useRef } from "react";

export type FigState = "loading" | "ready" | "error";

interface Props {
  src: string;
  alt: string;
  state: FigState;
  onState: (s: FigState) => void;
  onRetry: () => void;
  /** Mở lớp xem hình; truyền nút đã mở để trả focus khi đóng */
  onOpen: (opener: HTMLElement | null) => void;
}

/** Hình đề Writing Task 1 trong khung đề: khung giấy trắng, trạng thái tải/lỗi, nút "Phóng to hình". */
export default function Task1Figure({ src, alt, state, onState, onRetry, onOpen }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Ảnh có thể đã tải xong (từ cache) trước khi React gắn onLoad
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete) onState(el.naturalWidth > 0 ? "ready" : "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const ready = state === "ready";
  return (
    <figure className="exam-fig" data-state={state}>
      <div className="exam-fig-paper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={(e) => onState(e.currentTarget.naturalWidth > 0 ? "ready" : "error")}
          onError={() => onState("error")}
          onClick={() => { if (ready) onOpen(btnRef.current); }}
        />
      </div>
      {state === "loading" && (
        <div className="exam-fig-msg" role="status">Đang tải hình đề…</div>
      )}
      {state === "error" && (
        <div className="exam-fig-msg" role="alert">
          <span>Không tải được hình đề. Kiểm tra mạng rồi bấm Tải lại. Đồng hồ vẫn chạy.</span>
          <button type="button" className="st-btn st-btn-secondary st-btn-sm" onClick={onRetry}>Tải lại hình</button>
        </div>
      )}
      <button
        ref={btnRef}
        type="button"
        className="st-btn st-btn-secondary st-btn-sm exam-fig-zoom"
        aria-haspopup="dialog"
        disabled={!ready}
        aria-disabled={!ready}
        onClick={(e) => onOpen(e.currentTarget)}
      >
        Phóng to hình
      </button>
    </figure>
  );
}
