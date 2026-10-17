"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, X } from "lucide-react";
import { type Moment, addMoment, deleteMoment, editMoment, fmtMinutes, shrinkImage } from "@/lib/schedule";

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
}

function Dialog({ label, onClose, children, wide }: { label: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEscape(onClose);
  return (
    <div className="pm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pm-dialog" data-wide={wide || undefined} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

/** Mở camera của thiết bị, chụp một khung hình. Không có quyền hoặc không có camera thì báo rõ để chọn ảnh từ máy. */
function CameraDialog({ onShot, onClose, onPickFile }: { onShot: (b: Blob) => void; onClose: () => void; onPickFile: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    let dead = false;
    setReady(false);
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) { setError("Trình duyệt này không mở được camera."); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1600 } }, audio: false })
      .then((s) => {
        if (dead) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current?.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
      })
      .catch((e) => setError(e?.name === "NotAllowedError" ? "Bạn chưa cho phép dùng camera. Cấp quyền trong trình duyệt hoặc chọn ảnh từ máy." : "Không mở được camera trên thiết bị này."));
    return () => { dead = true; };
  }, [facing]);

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const shoot = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => b && onShot(b), "image/jpeg", 0.9);
  };

  return (
    <Dialog label="Chụp ảnh khoảnh khắc học" onClose={onClose} wide>
      <div className="pm-head"><h3 className="heading-3">Chụp khoảnh khắc học</h3><button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={20} /></button></div>
      {error ? (
        <div className="pm-err" role="alert">
          <p>{error}</p>
          <button type="button" className="st-btn st-btn-secondary" onClick={onPickFile}>Chọn ảnh từ máy</button>
        </div>
      ) : (
        <>
          <div className="pm-cam"><video ref={video} playsInline muted onLoadedMetadata={() => setReady(true)} /></div>
          <div className="pm-actions">
            <button type="button" className="st-btn st-btn-ghost" onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}>Đổi camera</button>
            <button type="button" className="pm-shutter" onClick={shoot} disabled={!ready} aria-label="Chụp" />
            <button type="button" className="st-btn st-btn-ghost" onClick={onPickFile}>Chọn ảnh</button>
          </div>
        </>
      )}
    </Dialog>
  );
}

function Composer({ blob, busy, error, onSave, onClose, onRetake }: {
  blob: Blob; busy: boolean; error: string; onSave: (caption: string) => void; onClose: () => void; onRetake: () => void;
}) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  useEffect(() => { const u = URL.createObjectURL(blob); setUrl(u); return () => URL.revokeObjectURL(u); }, [blob]);
  return (
    <Dialog label="Lưu khoảnh khắc học" onClose={onClose}>
      <div className="pm-head"><h3 className="heading-3">Lưu khoảnh khắc</h3><button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={20} /></button></div>
      {url && <img className="pm-preview" src={url} alt="Ảnh vừa chọn" />}
      <label className="field" style={{ marginTop: 14 }}>
        <span className="field-label">Ghi chú ngắn (không bắt buộc)</span>
        <input className="input" value={caption} maxLength={500} placeholder="VD: Xong Passage 2, sai 3 câu matching headings" onChange={(e) => setCaption(e.target.value)} />
      </label>
      {error && <p role="alert" className="pm-error">{error}</p>}
      <div className="pm-actions end">
        <button type="button" className="st-btn st-btn-ghost" onClick={onRetake} disabled={busy}>Chọn lại</button>
        <button type="button" className="st-btn st-btn-primary" onClick={() => onSave(caption)} disabled={busy} aria-busy={busy || undefined}>{busy ? "Đang lưu…" : "Lưu khoảnh khắc"}</button>
      </div>
    </Dialog>
  );
}

function Lightbox({ moment, onClose, onChanged }: { moment: Moment; onClose: () => void; onChanged: () => void }) {
  const [caption, setCaption] = useState(moment.caption);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const m = moment.meta || {};
  const saveCaption = async () => {
    if (caption === moment.caption) return;
    try { await editMoment(moment.id, caption); onChanged(); } catch (e: any) { setError(e.message); }
  };
  const remove = async () => {
    if (!confirm("Xoá khoảnh khắc này? Ảnh sẽ bị xoá vĩnh viễn.")) return;
    setBusy(true);
    try { await deleteMoment(moment.id); onChanged(); onClose(); } catch (e: any) { setError(e.message); setBusy(false); }
  };
  return (
    <Dialog label="Khoảnh khắc học" onClose={onClose} wide>
      <div className="pm-head">
        <h3 className="heading-3">{new Date(moment.created_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" })}</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={20} /></button>
      </div>
      {moment.url ? <img className="pm-preview" src={moment.url} alt={moment.caption || "Khoảnh khắc học"} /> : <p className="ink2">Không tải được ảnh.</p>}
      <div className="pm-meta">
        {m.tasks_total ? <span className="st-badge st-badge-brand">{m.tasks_done}/{m.tasks_total} nhiệm vụ</span> : null}
        {m.minutes ? <span className="st-badge st-badge-success">{fmtMinutes(m.minutes)} đã học</span> : null}
        {m.streak ? <span className="st-badge st-badge-accent">Chuỗi {m.streak} ngày</span> : null}
      </div>
      <label className="field" style={{ marginTop: 12 }}>
        <span className="field-label">Ghi chú</span>
        <input className="input" value={caption} maxLength={500} onChange={(e) => setCaption(e.target.value)} onBlur={saveCaption} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} placeholder="Thêm ghi chú cho ảnh này" />
      </label>
      {error && <p role="alert" className="pm-error">{error}</p>}
      <div className="pm-actions end">
        <button type="button" className="st-btn st-btn-ghost" style={{ color: "var(--danger)" }} onClick={remove} disabled={busy}><Trash2 size={16} /> Xoá ảnh</button>
      </div>
    </Dialog>
  );
}

/** Ảnh khoảnh khắc học của một ngày: chụp bằng camera hoặc chọn từ máy, kèm tiến độ tại thời điểm lưu. */
export default function MomentsPanel({ day, moments, canAdd, onChanged }: {
  day: string; moments: Moment[]; canAdd: boolean; onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Moment | null>(null);

  const pick = useCallback(async (f: File | Blob) => {
    setError("");
    setCamera(false);
    setBlob(await shrinkImage(f));
  }, []);

  const save = async (caption: string) => {
    if (!blob) return;
    setBusy(true); setError("");
    try {
      await addMoment(day, blob, caption);
      setBlob(null);
      onChanged();
    } catch (e: any) {
      setError(e.message || "Không lưu được ảnh");
    }
    setBusy(false);
  };

  // Ảnh đang mở phải theo bản mới nhất sau khi sửa ghi chú
  const current = open ? moments.find((m) => m.id === open.id) || null : null;

  return (
    <section className="pm st-card" aria-labelledby="pm-h">
      <div className="pm-bar">
        <div>
          <h2 id="pm-h" className="heading-3">Khoảnh khắc học</h2>
          <p className="meta">Chụp lại góc học, bài vừa làm hoặc tiến độ của bạn trong ngày.</p>
        </div>
        {canAdd && (
          <div className="row-wrap" style={{ gap: 6 }}>
            <button type="button" className="st-btn st-btn-primary st-btn-sm" onClick={() => setCamera(true)}><Camera size={16} /> Chụp ảnh</button>
            <button type="button" className="st-btn st-btn-secondary st-btn-sm" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Tải ảnh</button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pick(f); }} />
      </div>

      {moments.length === 0 ? (
        <div className="pm-empty">
          <span className="tile" aria-hidden="true"><Camera size={20} strokeWidth={1.75} /></span>
          <p className="ink2">{canAdd ? "Chưa có khoảnh khắc nào trong ngày này. Một tấm ảnh cũng tính là đã học và giữ chuỗi của bạn." : "Không có khoảnh khắc nào được lưu trong ngày này."}</p>
        </div>
      ) : (
        <ul className="pm-grid">
          {moments.map((m) => (
            <li key={m.id}>
              <button type="button" className="pm-thumb" onClick={() => setOpen(m)} aria-label={m.caption || "Mở ảnh khoảnh khắc"}>
                {m.url ? <img src={m.url} alt="" loading="lazy" /> : <span className="meta">Không có ảnh</span>}
                <span className="pm-cap">{m.caption || new Date(m.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {camera && <CameraDialog onShot={pick} onClose={() => setCamera(false)} onPickFile={() => { setCamera(false); fileRef.current?.click(); }} />}
      {blob && <Composer blob={blob} busy={busy} error={error} onSave={save} onClose={() => !busy && setBlob(null)} onRetake={() => { setBlob(null); setCamera(true); }} />}
      {current && <Lightbox moment={current} onClose={() => setOpen(null)} onChanged={onChanged} />}
    </section>
  );
}
