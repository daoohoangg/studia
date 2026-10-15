"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setSent(true); setWait(60);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px" }}>
      <header style={{ width: "100%", maxWidth: 1080, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Logo height={28} href="/login" />
        <Link href="/login" style={{ fontWeight: 600, textDecoration: "none", fontSize: 14.5, color: "var(--brand)" }}>Quay lại đăng nhập</Link>
      </header>
      <main style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <section className="st-card" style={{ width: "100%", maxWidth: 440, padding: 36, display: "flex", flexDirection: "column", gap: 18 }}>
          {!sent ? (
            <form onSubmit={send} className="stack" style={{ gap: 18 }}>
              <div>
                <h1 style={{ font: "700 26px/32px var(--font-display)", letterSpacing: -0.5 }}>Quên mật khẩu?</h1>
                <p className="ink2" style={{ marginTop: 6 }}>Nhập email bạn dùng để đăng ký. Studia sẽ gửi một đường dẫn đặt lại mật khẩu, có hiệu lực trong 1 giờ.</p>
              </div>
              <label className="field"><span className="field-label">Email</span>
                <input className="input" type="email" required autoComplete="email" placeholder="ban@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 14 }}>{error}</p>}
              <button className="st-btn st-btn-primary st-btn-lg st-btn-block" type="submit" disabled={busy}>Gửi đường dẫn</button>
            </form>
          ) : (
            <div className="stack" style={{ gap: 18 }}>
              <div role="status">
                <h1 style={{ font: "700 26px/32px var(--font-display)", letterSpacing: -0.5 }}>Đã gửi đường dẫn</h1>
                <p className="ink2" style={{ marginTop: 6 }}>Nếu <b style={{ color: "var(--ink)" }}>{email}</b> có tài khoản Studia, thư sẽ đến trong vài phút. Nhớ xem cả mục Spam.</p>
              </div>
              <button className="st-btn st-btn-secondary st-btn-block" type="button" disabled={wait > 0 || busy} onClick={() => send()}>
                {wait > 0 ? `Gửi lại sau 0:${String(wait).padStart(2, "0")}` : "Gửi lại"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
