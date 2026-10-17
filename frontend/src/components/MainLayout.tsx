"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, BarChart3, BookOpen, CalendarDays, Layers, Mic,
  PenLine, Target, FlaskConical, LogOut, PanelLeftClose, PanelLeftOpen, type LucideIcon,
  LayoutGrid, Users, CreditCard, Package, Library, Sparkles, Zap, Settings,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import SelectionContextMenu from "@/components/SelectionContextMenu";
import AuthGate from "@/components/AuthGate";
import TutorPopup from "@/components/TutorPopup";
import NavProgress from "@/components/NavProgress";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { useAccount, clearAccount, useDisplayName } from "@/lib/account";

// Công cụ nội bộ chỉ hiện khi bật cờ này (mặc định ẩn với người dùng).
const SHOW_DEV_TOOLS = process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === "true";
const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";

type NavItem = { href: string; label: string; icon: LucideIcon; also?: string[] };

// Mỗi mục gộp 2 màn hình liên quan; chuyển qua lại bằng thanh tab trong trang (SectionTabs).
const navGroups: NavItem[][] = [
  [
    { href: "/", label: "Hôm nay", icon: Home },
    { href: "/dashboard", label: "Tiến độ", icon: BarChart3, also: ["/knowledge-map"] },
    { href: "/books", label: "Thư viện sách", icon: BookOpen },
    { href: "/plan", label: "Lịch học", icon: CalendarDays },
  ],
  [
    { href: "/practice", label: "Ôn luyện", icon: Zap, also: ["/review"] },
    { href: "/flashcards", label: "Thẻ & từ vựng", icon: Layers, also: ["/vocabulary"] },
  ],
  [
    { href: "/scenarios", label: "Luyện nói", icon: Mic, also: ["/pronunciation"] },
    { href: "/feedback", label: "Lỗi sai", icon: PenLine, also: ["/mistakes"] },
    { href: "/exam", label: "Thi thử IELTS", icon: Target },
    ...(SHOW_DEV_TOOLS ? [{ href: "/config-test", label: "Công cụ kiểm thử", icon: FlaskConical }] : []),
  ],
];

const mobileTabs: NavItem[] = [
  { href: "/", label: "Hôm nay", icon: Home },
  { href: "/flashcards", label: "Thẻ", icon: Layers, also: ["/vocabulary"] },
  { href: "/practice", label: "Ôn luyện", icon: Zap, also: ["/review"] },
  { href: "/scenarios", label: "Luyện nói", icon: Mic, also: ["/pronunciation"] },
  { href: "/exam", label: "Thi thử", icon: Target },
];

const adminGroup: NavItem[] = [
  { href: "/admin", label: "Tổng quan hệ thống", icon: LayoutGrid },
  { href: "/admin/users", label: "Tài khoản", icon: Users },
  { href: "/admin/orders", label: "Thanh toán", icon: CreditCard },
  { href: "/admin/packs", label: "Gói & cài đặt", icon: Package },
  { href: "/admin/library", label: "Thư viện chung", icon: Library },
];

/** Mục đang active: khớp đúng "/" hoặc tiền tố của các route con (vd /books/123). */
function isActivePath(pathname: string, href: string) {
  if (href === "/" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

const isItemActive = (pathname: string, item: NavItem) =>
  isActivePath(pathname, item.href) || (item.also || []).some((a) => isActivePath(pathname, a));

// Trang không có khung điều hướng
const BARE_PATHS = ["/welcome", "/login", "/signup", "/forgot-password", "/reset-password", "/onboarding", "/placement"];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  // Đang trỏ chuột vào thanh đã thu gọn → mở rộng tạm thời (đè lên nội dung, không đẩy nội dung).
  const [hover, setHover] = useState(false);
  const ignoreHover = useRef(false);
  // Chưa đọc xong trạng thái đã lưu thì tắt hiệu ứng, để sidebar không "co lại" mỗi lần tải trang.
  const [settled, setSettled] = useState(false);
  const pathname = usePathname();
  const { account, isAdmin } = useAccount();
  const displayName = useDisplayName(account);
  const groups = isAdmin ? [adminGroup, ...navGroups] : navGroups;
  const expanded = !collapsed || hover;
  const peek = collapsed && hover;

  useEffect(() => {
    try {
      const savedState = localStorage.getItem("studia_sidebar_collapsed");
      if (savedState !== null) setCollapsed(savedState === "true");
    } catch {}
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const toggleSidebar = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    // Vừa bấm thu gọn khi chuột còn nằm trên thanh: thu gọn thật, chỉ mở lại khi chuột rời đi rồi quay lại.
    if (nextState) { ignoreHover.current = true; setHover(false); }
    try { localStorage.setItem("studia_sidebar_collapsed", String(nextState)); } catch {}
  };

  if (BARE_PATHS.includes(pathname)) {
    return <AuthGate>{children}</AuthGate>;
  }

  const cls = (...parts: (string | false)[]) => parts.filter(Boolean).join(" ");

  return (
    <AuthGate>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Menu ngữ cảnh khi bôi đen chữ */}
        <SelectionContextMenu />
        <NavProgress />
        {!pathname.startsWith("/tutor") && !/^\/exam\/[^/]+/.test(pathname) && <TutorPopup />}

        {/* Sidebar (desktop/tablet) */}
        <aside
          className={cls("app-sidebar", !expanded && "collapsed", peek && "peek", !settled && "no-anim")}
          aria-label="Điều hướng chính"
          onMouseEnter={() => { if (collapsed && !ignoreHover.current) setHover(true); }}
          onMouseLeave={() => { ignoreHover.current = false; setHover(false); }}
          onFocus={() => { if (collapsed) setHover(true); }}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(false); }}
        >
          <div className="sidebar-head">
            <Logo variant={expanded ? "lockup" : "mark"} height={expanded ? 28 : 32} href="/welcome" />
          </div>

          <nav className="sidebar-nav">
            {groups.map((group, gi) => (
              <div key={gi} className="nav-group">
                {group.map((item) => {
                  const active = isItemActive(pathname, item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cls("nav-item", active && "active")}
                      aria-current={active ? "page" : undefined}
                      title={!expanded ? item.label : undefined}
                    >
                      {active && <span className="nav-indicator" />}
                      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="sidebar-foot">
            {account && !isAdmin && (
              <Link href="/billing" className={cls("nav-item", isActivePath(pathname, "/billing") && "active")}
                aria-current={isActivePath(pathname, "/billing") ? "page" : undefined} title={!expanded ? "Gói & lượt upload" : undefined}>
                {isActivePath(pathname, "/billing") && <span className="nav-indicator" />}
                <Sparkles size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="nav-label">Gói &amp; lượt upload</span>
                {expanded && <span className="meta num" style={{ marginLeft: "auto", position: "relative", zIndex: 1 }}>{account.quota.remaining} lượt</span>}
              </Link>
            )}
            {account && (
              <div className="sidebar-user" title={displayName}>
                <span className="sidebar-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
                <span className="nav-label sidebar-user-text">
                  <b>{displayName}</b>
                  <span className="meta">{isAdmin ? "Quản lý" : "Học sinh"}</span>
                </span>
              </div>
            )}
            <Link href="/settings" className={cls("nav-item", isActivePath(pathname, "/settings") && "active")}
              aria-current={isActivePath(pathname, "/settings") ? "page" : undefined} title={!expanded ? "Cài đặt" : undefined}>
              {isActivePath(pathname, "/settings") && <span className="nav-indicator" />}
              <Settings size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className="nav-label">Cài đặt</span>
            </Link>
            <ThemeToggle compact={!expanded} />
            {!AUTH_DISABLED && (
              <button
                type="button"
                onClick={() => { clearAccount(); supabase.auth.signOut(); }}
                title="Đăng xuất"
                className="nav-item nav-button"
              >
                <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="nav-label">Đăng xuất</span>
              </button>
            )}
            {/* Nút thu gọn nằm cuối thanh */}
            <button
              type="button"
              className="nav-item nav-button nav-collapse"
              onClick={toggleSidebar}
              title={collapsed ? "Ghim mở thanh điều hướng" : "Thu gọn thanh điều hướng"}
              aria-label={collapsed ? "Ghim mở thanh điều hướng" : "Thu gọn thanh điều hướng"}
            >
              {collapsed ? <PanelLeftOpen size={20} strokeWidth={1.75} aria-hidden="true" /> : <PanelLeftClose size={20} strokeWidth={1.75} aria-hidden="true" />}
              <span className="nav-label">{collapsed ? "Ghim mở rộng" : "Thu gọn"}</span>
            </button>
          </div>
        </aside>

        {/* Thanh trên cùng (mobile) */}
        <header className="mobile-topbar">
          <Logo height={26} href="/welcome" />
          <div style={{ width: 44 }}><ThemeToggle compact /></div>
        </header>

        {/* Nội dung chính */}
        <main className={cls("app-main", collapsed && "collapsed", !settled && "no-anim")}>
          {children}
        </main>

        {/* Thanh tab dưới (mobile) */}
        <nav className="mobile-tabbar" aria-label="Điều hướng nhanh">
          {mobileTabs.map((t) => {
            const active = isItemActive(pathname, t);
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href} className={cls("mobile-tab", active && "active")} aria-current={active ? "page" : undefined}>
                {active && <span className="tab-indicator" />}
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
