import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { markIntentionalSignOut } from "./api";
import { clearCache, setCacheScope } from "./cache";
import { unregisterDevice } from "./push";
import { supabase } from "./supabase";

type Ctx = { session: Session | null; ready: boolean; email: string; name: string; signOut: () => Promise<void> };

const AuthCtx = createContext<Ctx>({ session: null, ready: false, email: "", name: "", signOut: async () => {} });

/** Giữ phiên Supabase hiện tại. 401 từ API sẽ gọi signOut (lib/api.ts) và màn hình đăng nhập tự hiện lại. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        setCacheScope(data.session?.user?.id ?? null);
        setSession(data.session);
      })
      .catch(() => {})
      .finally(() => { if (alive) setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setCacheScope(s?.user?.id ?? null);
      setSession(s);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const meta = (session?.user?.user_metadata || {}) as Record<string, unknown>;
  const email = session?.user?.email || "";
  const name = (typeof meta.full_name === "string" && meta.full_name) || (typeof meta.name === "string" && meta.name) || email.split("@")[0] || "bạn";

  const signOut = async () => {
    if (!supabase) return;
    markIntentionalSignOut(true);
    try {
      await unregisterDevice(); // trước khi mất phiên: gỡ mã thiết bị để máy dùng chung không nhận thông báo của người trước
      await clearCache();
      setCacheScope(null);
      try {
        await supabase.auth.signOut();
      } catch {
        // Mất mạng vẫn phải xoá phiên trên máy
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      }
    } finally {
      markIntentionalSignOut(false);
    }
  };

  return <AuthCtx.Provider value={{ session, ready, email, name, signOut }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
