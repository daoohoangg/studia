import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import "./blog.css";

/** Khung chung của blog: thanh trên, nội dung, chân trang. Trang công khai, không cần đăng nhập. */
export default function BlogShell({ current, children }: { current?: "blog"; children: React.ReactNode }) {
  return (
    <div className="bl">
      <header className="bl-nav">
        <div className="bl-nav-in">
          <Logo height={28} href="/welcome" />
          <nav className="bl-links" aria-label="Điều hướng">
            <Link href="/welcome">Giới thiệu</Link>
            <Link href="/blog" aria-current={current === "blog" ? "page" : undefined}>Blog của Coal</Link>
          </nav>
          <div className="bl-cta">
            <div style={{ width: 44 }}><ThemeToggle compact /></div>
            <Link className="bl-btn bl-btn-ghost" href="/login">Đăng nhập</Link>
            <Link className="bl-btn bl-btn-primary" href="/signup">Học thử miễn phí</Link>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="bl-foot">
        <Logo height={24} href="/welcome" />
        <span>© {new Date().getFullYear()} Studia · Luyện IELTS cho người Việt, học cùng Coal</span>
      </footer>
    </div>
  );
}
