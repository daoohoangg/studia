"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Upload, BookOpen, Clock, CheckCircle2, Loader2, X, FileText, AlertCircle, Plus } from "lucide-react";

const API = "http://localhost:8000/api/v1";

const bookEmojis = ["📘", "📗", "📙", "📕", "📓", "📒", "📔", "📃"];
const statusColors: Record<string, string> = {
  completed: "var(--accent-emerald)",
  processing: "var(--accent-amber)",
  pending: "var(--accent-cyan)",
  failed: "var(--accent-rose)",
};
const statusLabels: Record<string, string> = {
  completed: "Đã xử lý",
  processing: "Đang xử lý...",
  pending: "Chờ xử lý",
  failed: "Lỗi",
};

type UploadMode = "text" | "pdf";

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("text");
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [backgroundNotice, setBackgroundNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBooks();
    const interval = setInterval(fetchBooks, 3000); // poll for processing status
    return () => clearInterval(interval);
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch(`${API}/documents/`);
      if (res.ok) {
        const data = await res.json();
        setBooks(data.documents || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setUploading(true);
    setUploadMsg(null);
    try {
      let res: Response;
      if (uploadMode === "pdf" && pdfFile) {
        const fd = new FormData();
        fd.append("file", pdfFile);
        fd.append("title", title);
        res = await fetch(`${API}/documents/upload-pdf`, { method: "POST", body: fd });
      } else {
        if (!textContent.trim()) { setUploadMsg({ type: "error", text: "Hãy nhập nội dung tài liệu" }); setUploading(false); return; }
        res = await fetch(`${API}/documents/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, source_type: "text", raw_content: textContent })
        });
      }
      const data = await res.json();
      if (res.ok) {
        // Đóng ngay popup modal để người dùng không phải chờ
        setShowUpload(false);
        setBackgroundNotice(`🚀 Đã nhận tệp "${title}"! Toàn bộ tiến trình xử lý PDF, Embeddings và Knowledge Graph đang chạy 100% ngầm ở nền.`);
        setTitle(""); setTextContent(""); setPdfFile(null); setUploadMsg(null);
        fetchBooks();
        setTimeout(() => setBackgroundNotice(null), 6000);
      } else {
        setUploadMsg({ type: "error", text: data.detail || "Upload thất bại" });
      }
    } catch (err) {
      setUploadMsg({ type: "error", text: "Không kết nối được với backend. Hãy chắc chắn server đang chạy." });
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".pdf")) { setPdfFile(file); setUploadMode("pdf"); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span className="badge badge-indigo" style={{ marginBottom: "10px" }}>
            <BookOpen size={13} /> Thư Viện
          </span>
          <h1 style={{ fontSize: "2.2rem", fontWeight: "800", fontFamily: "Outfit, sans-serif" }}>
            Sách của tôi
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>
            Upload sách/tài liệu để Studia phân tích và tạo lộ trình học
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowUpload(true)} style={{ flexShrink: 0 }}>
          <Plus size={18} /> Upload Tài Liệu
        </button>
      </div>

      {/* Background Processing Notification Banner */}
      {backgroundNotice && (
        <div className="glass-panel fade-in-up" style={{
          padding: "16px 20px",
          borderRadius: "14px",
          background: "rgba(99, 102, 241, 0.1)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontWeight: 600
        }}>
          <Loader2 size={18} className="spin" color="var(--accent-indigo)" />
          <span style={{ flex: 1 }}>{backgroundNotice}</span>
          <button onClick={() => setBackgroundNotice(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
      )}
      {showUpload && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "600px", padding: "32px", position: "relative" }}>
            <button onClick={() => { setShowUpload(false); setUploadMsg(null); }}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "8px", fontFamily: "Outfit, sans-serif" }}>
              Upload Tài Liệu Mới
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "24px" }}>
              AI sẽ tự động phân tích, tạo Knowledge Graph và flashcards
            </p>

            {/* Mode Toggle */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {(["text", "pdf"] as UploadMode[]).map(mode => (
                <button key={mode} onClick={() => setUploadMode(mode)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid",
                    borderColor: uploadMode === mode ? "rgba(99,102,241,0.5)" : "var(--border-subtle)",
                    background: uploadMode === mode ? "rgba(99,102,241,0.12)" : "transparent",
                    color: uploadMode === mode ? "#818cf8" : "var(--text-secondary)",
                    cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                  }}>
                  {mode === "text" ? <><FileText size={15} /> Dán Text</> : <><Upload size={15} /> Upload PDF</>}
                </button>
              ))}
            </div>

            <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="label-text">Tên tài liệu / Tiêu đề sách</label>
                <input className="input-field" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Ví dụ: Designing Data-Intensive Applications" required />
              </div>

              {uploadMode === "text" ? (
                <div>
                  <label className="label-text">Nội dung (paste text từ sách)</label>
                  <textarea className="input-field" rows={6} value={textContent}
                    onChange={e => setTextContent(e.target.value)}
                    placeholder="Dán nội dung chương sách, ghi chú, hoặc bài viết vào đây..."
                    style={{ resize: "vertical" }} />
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    {textContent.length} ký tự · ~{Math.ceil(textContent.length / 600)} chunks
                  </p>
                </div>
              ) : (
                <div
                  className={`drop-zone${dragOver ? " drag-over" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
                    onChange={e => { if (e.target.files?.[0]) setPdfFile(e.target.files[0]); }} />
                  {pdfFile ? (
                    <div>
                      <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📄</div>
                      <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>{pdfFile.name}</p>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📁</div>
                      <p style={{ fontWeight: 600, marginBottom: "4px" }}>Kéo thả file PDF vào đây</p>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Hoặc click để chọn file</p>
                    </div>
                  )}
                </div>
              )}

              {uploadMsg && (
                <div style={{
                  padding: "12px 16px", borderRadius: "12px",
                  background: uploadMsg.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)",
                  border: `1px solid ${uploadMsg.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
                  color: uploadMsg.type === "success" ? "#34d399" : "#fb7185",
                  fontSize: "0.875rem",
                }}>
                  {uploadMsg.text}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={uploading} style={{ width: "100%", justifyContent: "center", padding: "13px" }}>
                {uploading ? <><Loader2 size={18} className="spin" /> Đang xử lý...</> : <><Upload size={18} /> Upload & Phân Tích AI</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Books Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 240, borderRadius: 20 }} />)}
        </div>
      ) : books.length === 0 ? (
        <div className="glass-panel" style={{ padding: "64px", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📚</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "8px" }}>Chưa có tài liệu nào</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>Upload tài liệu đầu tiên để bắt đầu hành trình học tập</p>
          <button className="btn-primary" onClick={() => setShowUpload(true)}>
            <Plus size={18} /> Upload ngay
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {books.map((book: any, idx: number) => {
            const statusColor = statusColors[book.processing_status] || "var(--text-muted)";
            const emoji = bookEmojis[idx % bookEmojis.length];
            const isReady = book.processing_status === "completed";

            return (
              <Link key={book.id} href={isReady ? `/books/${book.id}` : "#"} className="book-card"
                style={{ textDecoration: "none", pointerEvents: isReady ? "auto" : "none" }}>
                {/* Cover */}
                <div className="book-cover" style={{
                  background: `linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)`,
                  border: "1px solid rgba(99,102,241,0.2)"
                }}>
                  <span style={{ fontSize: "3rem" }}>{emoji}</span>
                </div>

                {/* Info */}
                <div>
                  <h3 style={{ fontWeight: "700", fontSize: "0.95rem", marginBottom: "8px", lineHeight: 1.3 }}>
                    {book.title}
                  </h3>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    {book.processing_status === "processing" ? (
                      <Loader2 size={13} color={statusColor} className="spin" />
                    ) : book.processing_status === "completed" ? (
                      <CheckCircle2 size={13} color={statusColor} />
                    ) : (
                      <AlertCircle size={13} color={statusColor} />
                    )}
                    <span style={{ fontSize: "0.75rem", color: statusColor, fontWeight: 600 }}>
                      {statusLabels[book.processing_status] || book.processing_status}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {book.topic_count > 0 && (
                      <span className="badge badge-indigo" style={{ fontSize: "0.7rem" }}>
                        {book.topic_count} topics
                      </span>
                    )}
                    <span className="badge badge-cyan" style={{ fontSize: "0.7rem", textTransform: "lowercase" }}>
                      {book.source_type}
                    </span>
                  </div>
                </div>

                {isReady && (
                  <div style={{ marginTop: "auto", fontSize: "0.75rem", color: "var(--accent-indigo)", fontWeight: 600 }}>
                    Xem chi tiết →
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
