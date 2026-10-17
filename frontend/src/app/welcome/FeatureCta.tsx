"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const NEXT_KEY = "studia-next";

/** Nút dẫn tới màn hình của tính năng. Chưa đăng nhập thì chuyển sang đăng nhập, xong sẽ quay lại đúng màn hình này. */
export default function FeatureCta({ href, label, loggedIn }: { href: string; label: string; loggedIn: boolean }) {
  const router = useRouter();
  const go = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) { router.push(href); return; }
    try { sessionStorage.setItem(NEXT_KEY, href); } catch {}
    router.push("/login");
  };
  return (
    <div className="lp-feat-cta">
      <button type="button" className="lp-btn lp-btn-primary" onClick={go}>
        {loggedIn ? label : <><Lock size={18} aria-hidden="true" />Đăng nhập để dùng</>}
        {loggedIn && <ArrowRight size={18} aria-hidden="true" />}
      </button>
      {!loggedIn && <span>Bạn sẽ về lại <b>{label.replace(/^Mở /, "")}</b> ngay sau khi đăng nhập.</span>}
    </div>
  );
}
