"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

/** Đăng nhập / đăng ký bằng Google qua Supabase Auth (cần bật Google provider trong Supabase). */
export default function GoogleButton({ label = "Tiếp tục với Google", onError }: { label?: string; onError?: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/`, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setBusy(false);
      onError?.(error.message.includes("provider is not enabled")
        ? "Đăng nhập Google chưa được bật. Quản trị viên cần bật Google trong Supabase › Authentication › Providers."
        : error.message);
    }
    // Thành công: trình duyệt chuyển sang Google rồi quay lại trang chính
  };

  return (
    <button type="button" onClick={go} disabled={busy} aria-busy={busy || undefined} className="btn-ghost btn-lg btn-block"
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 12, border: "1.5px solid var(--border-control)", background: "var(--surface)", color: "var(--ink)", fontWeight: 600 }}>
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
        <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
      </svg>
      {busy ? "Đang chuyển tới Google…" : label}
    </button>
  );
}
