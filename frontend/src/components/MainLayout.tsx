"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Home, BarChart3, BookOpen, CalendarDays, Layers, RotateCcw, Languages, MessageCircle, Mic,
  PenLine, Target, FlaskConical, LogOut, PanelLeftClose, PanelLeftOpen, type LucideIcon,
  LayoutGrid, Users, CreditCard, Package, Library, Sparkles, Network, AudioLines, Zap, NotebookPen, Settings,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import SelectionContextMenu from "@/components/SelectionContextMenu";
import AuthGate from "@/components/AuthGate";
import TutorPopup from "@/components/TutorPopup";
import NavProgress from "@/components/NavProgress";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { useAccount, clearAccount } from "@/lib/account";

// Công cụ nội bộ chỉ hiện khi bật cờ này (mặc định ẩn với người dùng).
const SHOW_DEV_TOOLS = process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === "true";
const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";

type NavItem = { href: string; label: string; icon: LucideIcon; also?: string[] };

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Chính",
    items: [
      { href: "/", label: "Hôm nay", icon: Home },
      { href: "/dashboard", label: "Tiến độ", icon: BarChart3, also: ["/knowledge-map"] },
      { href: "/books", label: "Thư viện sách", icon: BookOpen },
      { href: "/plan", label: "Lịch học", icon: CalendarDays },
    ],
  },
  {
    label: "Học tập",
    items: [
      { href: "/practice", label: "Luyện nhanh", icon: Zap },
      { href: "/flashcards", label: "Flashcards", icon: Layers },
      { href: "/review", label: "Ôn tập", icon: RotateCcw },
      { href: "/vocabulary", label: "Từ vựng", icon: Languages },
    ],
  },
  {
    label: "Luyện tập",
    items: [
      { href: "/scenarios", label: "Luyện hội thoại", icon: Mic },
      { href: "/pronunciation", label: "Luyện phát âm", icon: AudioLines },
      { href: "/feedback", label: "Phân tích lỗi", icon: PenLine },
      { href: "/mistakes", label: "Sổ lỗi sai", icon: NotebookPen },
      { href: "/exam", label: "Thi thử IELTS", icon: Target },
      ...(SHOW_DEV_TOOLS ? [{ href: "/config-test", label: "Công cụ kiểm thử", icon: FlaskConical }] : []),
    ],
  },
];

const mobileTabs: NavItem[] = [
  { href: "/", label: "Hôm nay", icon: Home },
  { href: "/flashcards", label: "Thẻ", icon: Layers },
  { href: "/review", label: "Ôn tập", icon: RotateCcw },
  { href: "/practice", label: "Luyện nhanh", icon: Zap },
  { href: "/exam", label: "Thi thử", icon: Target },
];

const adminSection: { label: string; items: NavItem[] } = {
  label: "Quản trị",
  items: [
    { href: "/admin", label: "Tổng quan hệ thống", icon: LayoutGrid },
    { href: "/admin/users", label: "Tài khoản", icon: Users },
    { href: "/admin/orders", label: "Thanh toán", icon: CreditCard },
    { href: "/admin/packs", label: "Gói & cài đặt", icon: Package },
    { href: "/admin/library", label: "Thư viện chung", icon: Library },
  ],
};

/** Mục đang active: khớp đúng "/" hoặc tiền tố của các route con (vd /books/123). */
function isActivePath(pathname: string, href: string) {
  if (href === "/" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  // Chưa đọc xong trạng thái đã lưu thì tắt hiệu ứng, để sidebar không "co lại" mỗi lần tải trang.
  const [settled, setSettled] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { account, isAdmin } = useAccount();
  const sections = isAdmin ? [adminSection, ...navSections] : navSections;

  useEffect(() => {
    const savedState = localStorage.getItem("studia_sidebar_collapsed");
    if (savedState !== null) setCollapsed(savedState === "true");
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const toggleSidebar = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem("studia_sidebar_collapsed", String(nextState));
  };

  if (pathname === "/welcome" || pathname === "/login" || pathname === "/signup" || pathname === "/practice" || pathname === "/forgot-password" || pathname === "/reset-password" || pathname === "/onboarding" || pathname === "/placement") {
    return <AuthGate>{children}</AuthGate>;
  }

  const indicatorTransition = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 40 };

  return (
    <AuthGate>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Menu ngữ cảnh khi bôi đen chữ */}
        <SelectionContextMenu />
        <NavProgress />
        {!pathname.startsWith("/tutor") && !/^\/exam\/[^/]+/.test(pathname) && <TutorPopup />}

        {/* Sidebar (desktop/tablet) */}
        <aside className={`app-sidebar${collapsed ? " collapsed" : ""}${settled ? "" : " no-anim"}`} aria-label="Điều hướng chính">
          <div className="sidebar-head">
            <Logo variant={collapsed ? "mark" : "lockup"} height={collapsed ? 32 : 28} href="/welcome" />
            <button
              type="button"
              className="icon-btn"
              onClick={toggleSidebar}
              title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
              aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
            >
              {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.75} /> : <PanelLeftClose size={18} strokeWidth={1.75} />}
            </button>
          </div>

          <nav>
            {sections.map((section) => (
              <div key={section.label}>
                <div className="nav-section-label" aria-hidden={collapsed || undefined}>{section.label}</div>
                {section.items.map((item) => {
                  const active = isActivePath(pathname, item.href) || (item.also || []).some((a) => isActivePath(pathname, a));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-item${active ? " active" : ""}`}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      style={{ marginBottom: 2 }}
                    >
                      {active && (
                        <motion.span layoutId="nav-indicator" className="nav-indicator" transition={indicatorTransition} />
                      )}
                      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", flexDirection: "column", gap: 2, borderTop: "1px solid var(--hairline)" }}>
            {account && !isAdmin && (
              <Link href="/billing" className={`nav-item${isActivePath(pathname, "/billing") ? " active" : ""}`}
                aria-current={isActivePath(pathname, "/billing") ? "page" : undefined} title={collapsed ? "Gói & lượt upload" : undefined}>
                <Sparkles size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="nav-label">Gói &amp; lượt upload</span>
                {!collapsed && <span className="meta num" style={{ marginLeft: "auto" }}>{account.quota.remaining} lượt</span>}
              </Link>
            )}
            {account && !collapsed && (
              <div className="meta" style={{ padding: "6px 12px 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={account.email || undefined}>
                {isAdmin ? "Quản lý" : "Học sinh"}{account.email ? ` · ${account.email}` : ""}
              </div>
            )}
            <Link href="/settings" className={`nav-item${isActivePath(pathname, "/settings") ? " active" : ""}`}
              aria-current={isActivePath(pathname, "/settings") ? "page" : undefined} title={collapsed ? "Cài đặt" : undefined}>
              <Settings size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className="nav-label">Cài đặt</span>
            </Link>
            <ThemeToggle compact={collapsed} />
            {!AUTH_DISABLED && (
              <button
                type="button"
                onClick={() => { clearAccount(); supabase.auth.signOut(); }}
                title="Đăng xuất"
                className="nav-item"
                style={{ background: "none", border: "none", cursor: "pointer", width: "100%" }}
              >
                <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="nav-label">Đăng xuất</span>
              </button>
            )}
          </div>
        </aside>

        {/* Thanh trên cùng (mobile) */}
        <header className="mobile-topbar">
          <Logo height={26} href="/welcome" />
          <div style={{ width: 44 }}><ThemeToggle compact /></div>
        </header>

        {/* Nội dung chính */}
        <main className={`app-main${collapsed ? " collapsed" : ""}${settled ? "" : " no-anim"}`}>
          <motion.div
            key={pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
          >
            {children}
          </motion.div>
        </main>

        {/* Thanh tab dưới (mobile) */}
        <nav className="mobile-tabbar" aria-label="Điều hướng nhanh">
          {mobileTabs.map((t) => {
            const active = isActivePath(pathname, t.href);
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href} className={`mobile-tab${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
                {active && <motion.span layoutId="tab-indicator" className="tab-indicator" transition={indicatorTransition} />}
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </AuthGate>
  );
}
