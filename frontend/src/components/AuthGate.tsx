"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"];
// Trang giới thiệu: ai cũng xem được, người đã đăng nhập không bị chuyển đi.
const OPEN_PATHS = ["/welcome"];

// Bỏ qua đăng nhập khi dev: NEXT_PUBLIC_AUTH_DISABLED=true (đi cùng AUTH_REQUIRED=false ở backend).
// Không có hiệu lực ở bản build production.
const AUTH_DISABLED =
  process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" && process.env.NODE_ENV !== "production";

/** Chặn các trang cần đăng nhập; chuyển về /login khi chưa có phiên Supabase. */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const isOpen = OPEN_PATHS.includes(pathname) || pathname === "/blog" || pathname.startsWith("/blog/");
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isAuthCallback = pathname.startsWith("/auth/callback");

  useEffect(() => {
    if (AUTH_DISABLED) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (AUTH_DISABLED) {
      if (isPublic && !isAuthCallback) router.replace("/home");
      return;
    }
    if (session === undefined || isAuthCallback) return;

    // Nếu URL đang chứa auth code/token (đang xử lý đăng nhập OAuth), hoãn chuyển trang
    const hasAuthParams =
      typeof window !== "undefined" &&
      (window.location.search.includes("code=") || window.location.hash.includes("access_token="));
    if (!session && hasAuthParams) return;

    if (!session && !isPublic && !isOpen) router.replace(pathname === "/" ? "/welcome" : "/login");
    // Người dùng bấm tính năng ở trang giới thiệu khi chưa đăng nhập: đăng nhập xong đưa về đúng màn hình đó
    if (session && (isPublic || pathname === "/")) {
      let next: string | null = null;
      try { next = sessionStorage.getItem("studia-next"); sessionStorage.removeItem("studia-next"); } catch {}
      if (next && next.startsWith("/") && !next.startsWith("//")) { router.replace(next); return; }
    }
    if (session && (isPublic || pathname === "/")) router.replace("/home");
  }, [session, isPublic, isOpen, isAuthCallback, pathname, router]);

  if (AUTH_DISABLED) return <>{children}</>;
  if (isPublic || isOpen) return <>{children}</>;
  if (!session) return null;
  return <>{children}</>;
}
