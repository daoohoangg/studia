"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SectionTab = { href: string; label: string; hint?: string };

/**
 * Thanh chọn phần cho các màn hình gộp (vd. Luyện nói = Hội thoại | Phát âm).
 * Mỗi tab là một route thật nên chuyển tab được prefetch, giữ nguyên đường dẫn cũ và dùng được nút Back.
 * Chỉ hiện ở đúng đường dẫn của tab; trang con (vd. /flashcards/new) tự quản giao diện.
 */
export default function SectionTabs({ title, tabs }: { title: string; tabs: SectionTab[] }) {
  const pathname = usePathname();
  if (!tabs.some((t) => t.href === pathname)) return null;
  return (
    <div className="wrap section-tabs" style={{ marginBottom: 20 }}>
      <div className="seg" role="tablist" aria-label={title}>
        {tabs.map((t) => {
          const active = t.href === pathname;
          return (
            <Link
              key={t.href}
              href={t.href}
              role="tab"
              aria-selected={active}
              title={t.hint}
              className="seg-btn"
              style={{ textDecoration: "none" }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
