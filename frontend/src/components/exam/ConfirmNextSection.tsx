"use client";
import { useEffect, useRef } from "react";

interface Props {
  /** Tên phần đang làm, ví dụ "Reading" */
  label: string;
  /** Mô tả tình trạng bài (chưa gồm câu cảnh báo cuối) */
  summary: string;
  onStay: () => void;
  onConfirm: () => void;
}

/** Hộp xác nhận "Phần tiếp": chuyển phần không quay lại được. Esc hoặc chạm nền = ở lại. */
export default function ConfirmNextSection({ label, summary, onStay, onConfirm }: Props) {
  // Nút đã mở hộp: lấy lúc render đầu (trước khi autoFocus chuyển focus sang "Làm tiếp")
  const openerRef = useRef<HTMLElement | null>(typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onStay(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openerRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="exam-modal-overlay" onClick={onStay}>
      <div className="exam-modal" role="alertdialog" aria-modal="true"
        aria-labelledby="confirm-next-title" aria-describedby="confirm-next-desc"
        onClick={(e) => e.stopPropagation()}>
        <h3 id="confirm-next-title" style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: 12 }}>
          Kết thúc phần {label}?
        </h3>
        <p id="confirm-next-desc" style={{ color: "var(--ink-muted)", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: 24 }}>
          {summary} Sau khi chuyển sẽ không quay lại phần này được.
        </p>
        <div className="room-modal-actions" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button type="button" className="st-btn st-btn-primary st-btn-lg st-btn-block" onClick={onStay} autoFocus>Làm tiếp</button>
          <button type="button" className="st-btn st-btn-secondary st-btn-lg st-btn-block" onClick={onConfirm}>Kết thúc phần</button>
        </div>
      </div>
    </div>
  );
}
