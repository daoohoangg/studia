"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { renderResultCard, type CardResult } from "@/lib/shareCard";
import { addMoment, todayIso } from "@/lib/schedule";
import "./share.css";

/** Hộp thoại chụp ảnh kết quả: xem trước, lưu vào “Khoảnh khắc học” của hôm nay (tiến độ hàng ngày), tải xuống hoặc chia sẻ. */
export default function ShareResult({ card, onClose }: { card: CardResult; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState(() => {
    const bands = card.skills.filter((s) => s.band != null).map((s) => `${s.label[0]} ${s.band!.toFixed(1)}`).join(" · ");
    return `${card.title}${card.overall != null ? ` · Overall ${card.overall.toFixed(1)}` : ""}${bands ? ` (${bands})` : ""}`.slice(0, 500);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let dead = false;
    let objectUrl = "";
    renderResultCard({ ...card, footer: card.footer || window.location.host })
      .then((b) => {
        if (dead) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b); setUrl(objectUrl);
      })
      .catch((e) => !dead && setError(e?.message || "Không tạo được ảnh kết quả"));
    return () => { dead = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [card]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const saveToProgress = async () => {
    if (!blob) return;
    setBusy(true); setError("");
    try {
      await addMoment(todayIso(), blob, caption.trim());
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || "Không lưu được ảnh");
    }
    setBusy(false);
  };

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `studia-ket-qua-${todayIso()}.png`;
    a.click();
  };

  const file = blob ? new File([blob], "studia-ket-qua.png", { type: "image/png" }) : null;
  const canShare = !!file && typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [file] });
  const share = async () => {
    if (!file) return;
    try { await navigator.share({ files: [file], title: card.title, text: caption }); } catch { /* người dùng huỷ */ }
  };

  // Portal ra body: nội dung trang nằm trong ngữ cảnh xếp chồng thấp hơn thanh bên
  return createPortal(
    <div className="sh-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sh-dialog" role="dialog" aria-modal="true" aria-label="Chụp ảnh kết quả">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 className="heading-3">Ảnh kết quả</h3>
          <button type="button" className="st-btn st-btn-ghost st-btn-sm" onClick={onClose}>Đóng</button>
        </div>
        <div className="sh-body">
          <div className="sh-preview">
            {url ? <img src={url} alt={`Ảnh kết quả ${card.title}`} /> : error ? <p role="alert" className="meta">{error}</p> : <div className="skeleton" style={{ width: "100%", aspectRatio: "4 / 5" }} />}
          </div>
          <div className="stack" style={{ gap: 12 }}>
            <label className="field">
              <span className="field-label">Ghi chú đi kèm ảnh</span>
              <textarea className="input" rows={3} maxLength={500} value={caption} onChange={(e) => setCaption(e.target.value)} style={{ height: "auto", padding: 12, lineHeight: 1.5 }} />
            </label>
            {saved ? (
              <div role="status" className="sh-ok">
                Đã thêm vào tiến độ hôm nay. <Link className="link" href="/plan">Mở lịch học</Link>
              </div>
            ) : (
              <button type="button" className="st-btn st-btn-primary" onClick={saveToProgress} disabled={!blob || busy} aria-busy={busy || undefined}>
                {busy ? "Đang lưu…" : "Thêm vào tiến độ hôm nay"}
              </button>
            )}
            <div className="row-wrap" style={{ gap: 8 }}>
              <button type="button" className="st-btn st-btn-secondary" onClick={download} disabled={!blob}>Tải ảnh xuống</button>
              {canShare && <button type="button" className="st-btn st-btn-secondary" onClick={share}>Chia sẻ</button>}
            </div>
            {error && url && <p role="alert" className="meta" style={{ color: "var(--danger)" }}>{error}</p>}
            <p className="meta">Ảnh nằm trong mục “Khoảnh khắc học” của ngày hôm nay và được tính vào chuỗi ngày học.</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
