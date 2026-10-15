import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap-narrow" style={{ minHeight: "60vh", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ font: "750 96px/1 var(--font-display)", letterSpacing: -4 }} aria-hidden="true">4<span style={{ color: "var(--accent)" }}>0</span>4</div>
      <div className="st-card" aria-hidden="true" style={{ maxWidth: 380, textAlign: "left", padding: "14px 18px" }}>
        <div className="row" style={{ gap: 10 }}><b style={{ font: "700 20px/26px var(--font-display)" }}>missing</b><span className="st-badge">adjective</span></div>
        <div className="meta" style={{ fontFamily: "var(--font-reading)" }}>/ˈmɪsɪŋ/</div>
        <div style={{ marginTop: 6 }}>không có ở chỗ mong đợi; bị thất lạc</div>
      </div>
      <h1 className="page-title">Trang này không có trong giáo trình</h1>
      <p className="page-sub" style={{ maxWidth: 440 }}>Đường dẫn có thể đã cũ, hoặc tài liệu đã bị xoá khỏi thư viện.</p>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <Link className="st-btn st-btn-primary" href="/">Về trang Hôm nay</Link>
        <Link className="st-btn st-btn-secondary" href="/books">Mở thư viện</Link>
      </div>
    </div>
  );
}
