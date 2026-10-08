"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  LayoutDashboard,
  BookOpen,
  RefreshCw,
  MessageSquare,
  CreditCard,
  GitFork,
  Map,
  Sparkles,
  FlaskConical,
  BookMarked,
  AlertTriangle,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import SelectionContextMenu from "@/components/SelectionContextMenu";

const navSections = [
  {
    label: "Core",
    items: [
      { href: "/", icon: LayoutDashboard, label: "Hôm nay" },
      { href: "/books", icon: BookOpen, label: "Thư viện sách" },
      { href: "/plan", icon: Map, label: "Lịch học" },
    ]
  },
  {
    label: "Học tập",
    items: [
      { href: "/flashcards", icon: CreditCard, label: "Flashcards" },
      { href: "/review", icon: RefreshCw, label: "Ôn tập (FSRS)" },
      { href: "/knowledge-graph", icon: GitFork, label: "Knowledge Graph" },
      { href: "/vocabulary", icon: BookMarked, label: "Từ vựng" },
    ]
  },
  {
    label: "AI & Testing",
    items: [
      { href: "/tutor", icon: MessageSquare, label: "AI Tutor" },
      { href: "/scenarios", icon: Sparkles, label: "Roleplay TBLT" },
      { href: "/feedback", icon: AlertTriangle, label: "Phân tích lỗi" },
      { href: "/exam", icon: GraduationCap, label: "IELTS Mock Test" },
      { href: "/config-test", icon: FlaskConical, label: "Test Config Matrix" },
    ]
  }
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem("studia_sidebar_collapsed");
    if (savedState !== null) {
      setCollapsed(savedState === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem("studia_sidebar_collapsed", String(nextState));
  };

  const sidebarWidth = collapsed ? "68px" : "240px";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Global Text Selection & Context Menu Provider */}
      <SelectionContextMenu />

      {/* Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-subtle)",
          padding: collapsed ? "16px 8px" : "20px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          zIndex: 50,
          overflowY: "auto",
          overflowX: "hidden",
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, border-color 0.3s ease",
          boxShadow: collapsed ? "0 4px 20px rgba(0,0,0,0.15)" : "none"
        }}
      >
        {/* Top Header: Logo & Collapse Toggle Button */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          marginBottom: "16px",
          padding: collapsed ? "4px 0" : "4px 6px"
        }}>
          {!collapsed ? (
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "var(--gradient-main)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 16px rgba(99,102,241,0.4)",
                flexShrink: 0,
              }}>
                <Brain size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)", fontFamily: "Outfit, sans-serif", lineHeight: 1 }}>
                  Studia
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--accent-cyan)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  AI Learning
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/" title="Studia AI Learning" style={{ textDecoration: "none" }}>
              <div style={{
                width: "38px", height: "38px", borderRadius: "10px",
                background: "var(--gradient-main)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 16px rgba(99,102,241,0.4)",
                flexShrink: 0,
              }}>
                <Brain size={22} color="#fff" />
              </div>
            </Link>
          )}

          {/* Toggle Button */}
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Mở rộng thanh điều hướng" : "Ẩn thanh điều hướng"}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              flexShrink: 0,
              marginTop: collapsed ? "8px" : "0"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)";
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border-subtle)";
            }}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>

        {/* Navigation Sections */}
        {navSections.map((section) => (
          <div key={section.label} style={{ marginBottom: collapsed ? "8px" : "4px" }}>
            {!collapsed ? (
              <div className="nav-section-label">{section.label}</div>
            ) : (
              <div style={{
                height: "1px",
                background: "var(--border-subtle)",
                margin: "8px 6px"
              }} />
            )}

            {section.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              if (collapsed) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    style={{
                      width: "42px",
                      height: "42px",
                      margin: "3px auto",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isActive ? "#818cf8" : "var(--text-secondary)",
                      background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                      border: isActive ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
                      transition: "all 0.2s ease",
                      textDecoration: "none"
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }
                    }}
                  >
                    <Icon size={19} />
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? "active" : ""}`}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Theme Toggle & Supabase Status Footer */}
        <div style={{ marginTop: "auto", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <ThemeToggle compact={collapsed} />

          {!collapsed ? (
            <div style={{
              padding: "10px 12px", borderRadius: "12px",
              background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 700 }}>Supabase Connected</span>
              </div>
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>PostgreSQL + pgvector + Gemini</p>
            </div>
          ) : (
            <div
              title="Supabase Connected (PostgreSQL + pgvector + Gemini)"
              style={{
                width: "42px", height: "32px", margin: "0 auto", borderRadius: "10px",
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        style={{
          marginLeft: sidebarWidth,
          flex: 1,
          padding: "32px 40px",
          minHeight: "100vh",
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      >
        {children}
      </main>
    </div>
  );
}

