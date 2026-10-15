"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];
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
  const isOpen = OPEN_PATHS.includes(pathname);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (AUTH_DISABLED) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (AUTH_DISABLED) {
      if (isPublic) router.replace("/");
      return;
    }
    if (session === undefined) return;
    if (!session && !isPublic && !isOpen) router.replace(pathname === "/" ? "/welcome" : "/login");
    if (session && isPublic) router.replace("/");
  }, [session, isPublic, isOpen, pathname, router]);

  if (AUTH_DISABLED) return <>{children}</>;
  if (isPublic || isOpen) return <>{children}</>;
  if (!session) return null;
  return <>{children}</>;
}
