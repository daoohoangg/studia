"use client";

import Link from "next/link";
import { useAccount } from "@/lib/account";

/** Chỉ hiện nội dung cho quản lý. Backend vẫn tự kiểm tra quyền ở mọi API /admin. */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { account, loading, isAdmin } = useAccount();
  if (loading && !account) return <div className="wrap"><div className="skeleton" style={{ height: 320 }} /></div>;
  if (!isAdmin) {
    return (
      <div className="wrap">
        <div className="st-card" style={{ textAlign: "center", padding: 40 }}>
          <h1 className="heading-2">Trang dành cho quản lý</h1>
          <p className="ink2" style={{ marginTop: 6 }}>Tài khoản của bạn không có quyền truy cập khu vực quản trị.</p>
          <Link className="st-btn st-btn-primary" href="/" style={{ marginTop: 16 }}>Về trang Hôm nay</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export const fmtDateTime = (v?: string | null) => (v ? new Date(v).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—");
export const initials = (name?: string | null, email?: string | null) => {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};
