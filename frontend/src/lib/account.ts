"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export type Quota = {
  unlimited: boolean;
  free: number;
  purchased: number;
  adjusted: number;
  used: number;
  remaining: number;
};

export type Account = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "student" | "admin";
  status: "active" | "locked";
  quota: Quota;
};

let cache: Account | null = null;
let inflight: Promise<Account | null> | null = null;
const listeners = new Set<(a: Account | null) => void>();

function emit(a: Account | null) {
  cache = a;
  listeners.forEach((l) => l(a));
}

/** Tải lại tài khoản hiện tại (vai trò + lượt upload). Gọi sau khi upload, thanh toán... */
export function refreshAccount(): Promise<Account | null> {
  if (inflight) return inflight;
  inflight = apiFetch("/account/me")
    .then(async (res) => (res.ok ? ((await res.json()) as Account) : null))
    .catch(() => null)
    .then((a) => {
      emit(a);
      inflight = null;
      return a;
    });
  return inflight;
}

export function clearAccount() {
  emit(null);
}

// Đăng nhập / đăng xuất / đổi phiên → tải lại vai trò và lượt
let authBound = false;
function bindAuth() {
  if (authBound || typeof window === "undefined") return;
  authBound = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") emit(null);
    else if (event === "SIGNED_IN" || event === "USER_UPDATED") refreshAccount();
  });
}

/** Tài khoản hiện tại; `loading` true cho tới lần tải đầu tiên. */
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(cache);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    bindAuth();
    const l = (a: Account | null) => { setAccount(a); setLoading(false); };
    listeners.add(l);
    if (!cache) refreshAccount().finally(() => setLoading(false));
    return () => { listeners.delete(l); };
  }, []);
  return { account, loading, isAdmin: account?.role === "admin", refresh: refreshAccount };
}

export const formatVnd = (n: number | null | undefined) =>
  `${Number(n || 0).toLocaleString("vi-VN")} đ`;

export const ORDER_STATUS: Record<string, { label: string; badge: string }> = {
  pending: { label: "Chờ thanh toán", badge: "st-badge st-badge-brand" },
  paid: { label: "Đã thanh toán", badge: "st-badge st-badge-success" },
  review: { label: "Cần kiểm tra", badge: "st-badge st-badge-warning" },
  expired: { label: "Hết hạn", badge: "st-badge" },
  cancelled: { label: "Đã huỷ", badge: "st-badge" },
  rejected: { label: "Bị từ chối", badge: "st-badge st-badge-danger" },
};
