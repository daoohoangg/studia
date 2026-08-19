import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Brain, LayoutDashboard, GitFork, RefreshCw, BookOpen, Database, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Studia | Personal Learning Intelligence Platform",
  description: "Personal Learning Intelligence Platform xoay quanh 3 vòng lặp: Learn -> Evaluate -> Retain với Supabase & FSRS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* Sidebar Navigation */}
          <aside
            style={{
              width: "260px",
              background: "rgba(10, 14, 26, 0.95)",
              borderRight: "1px solid var(--border-subtle)",
              padding: "24px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "32px",
              position: "fixed",
              height: "100vh",
              zIndex: 50,
            }}
          >
            {/* Logo Brand */}
            <Link href="/" style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: "var(--gradient-main)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
                  }}
                >
                  <Brain size={24} color="#fff" />
                </div>
                <div>
                  <h1 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#fff", lineHeight: 1 }}>
                    Studia
                  </h1>
                  <span style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
                    INTEL PLATFORM
                  </span>
                </div>
              </div>
            </Link>

            {/* Menu Items */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link href="/dashboard" className="nav-item">
                <LayoutDashboard size={18} />
                <span>Dashboard 3 Loops</span>
              </Link>
              <Link href="/knowledge-graph" className="nav-item">
                <GitFork size={18} />
                <span>Knowledge Graph</span>
              </Link>
              <Link href="/review" className="nav-item">
                <RefreshCw size={18} />
                <span>Spaced Repetition</span>
              </Link>
              <Link href="/lesson/sample-topic" className="nav-item">
                <BookOpen size={18} />
                <span>AI Lessons & RAG</span>
              </Link>
            </nav>

            {/* Supabase Status Footer */}
            <div style={{ marginTop: "auto", padding: "12px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <Database size={14} color="#10b981" />
                <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", fontWeight: 600 }}>Supabase Cloud DB</span>
              </div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                PostgreSQL + pgvector ACTIVE
              </p>
            </div>
          </aside>

          {/* Main Content Area */}
          <main style={{ marginLeft: "260px", flex: 1, padding: "32px 40px" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
