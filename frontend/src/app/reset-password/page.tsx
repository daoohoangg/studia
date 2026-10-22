"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mismatch = pw2.length > 0 && pw !== pw2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return;
    setBusy(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) setError(err.message.includes("session") ? "Đường dẫn đã hết hạn. Hãy yêu cầu đường dẫn mới." : err.message);
    else router.replace("/home");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px" }}>
      <header style={{ width: "100%", maxWidth: 1080 }}><Logo height={28} href="/login" /></header>
      <main style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <form onSubmit={submit} className="st-card" style={{ width: "100%", maxWidth: 440, padding: 36, display: "flex", flexDirection: "column", gap: 18 }}>
          <h1 style={{ font: "700 26px/32px var(--font-display)", letterSpacing: -0.5 }}>Đặt mật khẩu mới</h1>
          <label className="field"><span className="field-label">Mật khẩu mới</span>
            <input className="input" type="password" required minLength={8} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <label className="field"><span className="field-label">Nhập lại mật khẩu</span>
            <input className="input" type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)}
              aria-invalid={mismatch || undefined} aria-describedby={mismatch ? "pw2-err" : undefined} style={mismatch ? { borderColor: "var(--danger)" } : undefined} />
            {mismatch && <span id="pw2-err" style={{ fontSize: 13, color: "var(--danger)" }}>Hai mật khẩu chưa khớp.</span>}
          </label>
          {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 14 }}>{error} <Link href="/forgot-password" style={{ color: "var(--brand)" }}>Gửi lại</Link></p>}
          <button className="st-btn st-btn-primary st-btn-lg st-btn-block" type="submit" disabled={busy || mismatch || pw.length < 8}>Lưu và đăng nhập</button>
        </form>
      </main>
    </div>
  );
}
