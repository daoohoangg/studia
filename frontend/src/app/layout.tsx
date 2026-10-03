import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Brain, LayoutDashboard, BookOpen, RefreshCw, MessageSquare, CreditCard, GitFork, Map, Sparkles, FlaskConical, BookMarked, AlertTriangle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Studia | AI Learning Intelligence Platform",
  description: "Biến sách và tài liệu thành hành trình học cá nhân hóa với RAG, FSRS và Gemini AI.",
};

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
      { href: "/config-test", icon: FlaskConical, label: "Test Config Matrix" },
    ]
  }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="light">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* Sidebar */}
          <aside style={{
            width: "240px",
            background: "var(--bg-sidebar)",
            borderRight: "1px solid var(--border-subtle)",
            padding: "20px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            position: "fixed",
            height: "100vh",
            zIndex: 50,
            overflowY: "auto",
            transition: "background 0.3s ease, border-color 0.3s ease"
          }}>
            {/* Logo */}
            <Link href="/" style={{ textDecoration: "none", marginBottom: "20px", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 14px" }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "12px",
                  background: "var(--gradient-main)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 20px rgba(99,102,241,0.4)",
                  flexShrink: 0,
                }}>
                  <Brain size={22} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--text-primary)", fontFamily: "Outfit, sans-serif", lineHeight: 1 }}>
                    Studia
                  </div>
                  <div style={{ fontSize: "0.62rem", color: "var(--accent-cyan)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    AI Learning
                  </div>
                </div>
              </div>
            </Link>

            {/* Nav Sections */}
            {navSections.map((section) => (
              <div key={section.label}>
                <div className="nav-section-label">{section.label}</div>
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href} className="nav-item">
                    <item.icon size={17} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}

            {/* Theme Toggle & Supabase Status Footer */}
            <div style={{ marginTop: "auto", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <ThemeToggle />

              <div style={{
                padding: "12px", borderRadius: "12px",
                background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 700 }}>Supabase Connected</span>
                </div>
                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>PostgreSQL + pgvector + Gemini</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main style={{ marginLeft: "240px", flex: 1, padding: "32px 40px", minHeight: "100vh" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
