"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Kiểm tra nếu có lỗi trả về từ OAuth (query params hoặc hash)
    const err = searchParams?.get("error_description") || searchParams?.get("error");
    if (err) {
      router.replace(`/login?error=${encodeURIComponent(err)}`);
      return;
    }

    async function handleAuth() {
      try {
        const code = searchParams?.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Lỗi xác thực code:", error);
            if (active) setErrorMsg(error.message);
            setTimeout(() => {
              if (active) router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            }, 1800);
            return;
          }
        }

        // Lấy session hiện tại
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (active) router.replace("/");
          return;
        }

        // Lắng nghe sự kiện đăng nhập nếu phiên đang xử lý
        const { data: sub } = supabase.auth.onAuthStateChange((event, currentSession) => {
          if (currentSession && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
            if (active) router.replace("/");
          }
        });

        // Hạn thời gian chờ an toàn (tối đa 4 giây)
        const timeout = setTimeout(async () => {
          if (!active) return;
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            router.replace("/");
          } else {
            router.replace("/login");
          }
        }, 4000);

        return () => {
          sub.subscription.unsubscribe();
          clearTimeout(timeout);
        };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Đã xảy ra lỗi khi đăng nhập";
        if (active) setErrorMsg(message);
        setTimeout(() => {
          if (active) router.replace(`/login?error=${encodeURIComponent(message)}`);
        }, 1800);
      }
    }

    handleAuth();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <div className="login-shell" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <div
        className="login-card fade-in-up"
        style={{ textAlign: "center", maxWidth: 420, width: "100%", margin: "0 auto", padding: "40px 32px" }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo height={32} />
        </div>
        {errorMsg ? (
          <div style={{ color: "var(--danger)", fontSize: "0.95rem" }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Đăng nhập không thành công</p>
            <p style={{ fontSize: "0.85rem", opacity: 0.9, lineHeight: 1.5 }}>{errorMsg}</p>
            <p style={{ marginTop: 16, fontSize: "0.85rem", opacity: 0.75 }}>Đang quay lại trang đăng nhập…</p>
          </div>
        ) : (
          <div>
            <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto 18px", borderWidth: 3 }} />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 8 }}>Đang hoàn tất đăng nhập</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Đang xác thực thông tin tài khoản Google của bạn…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="login-shell" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
          <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
