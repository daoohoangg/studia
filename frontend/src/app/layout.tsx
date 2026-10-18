import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./studia-ui.css";
import "./vibrant.css";
import MainLayout from "@/components/MainLayout";

export const metadata: Metadata = {
  title: "Studia | Luyện thi IELTS",
  description: "Luyện thi IELTS mỗi ngày: thi thử, ôn từ vựng đúng lúc và luyện hội thoại với trợ lý AI.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1022" },
  ],
};

// Đặt theme trước khi trang hiển thị để không bị nháy sáng/tối.
const themeScript = `(function(){try{var t=localStorage.getItem('studia-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t);var q=JSON.parse(localStorage.getItem('studia-prefs')||'{}');document.documentElement.setAttribute('data-font',q.font||'md');document.documentElement.setAttribute('data-motion',q.reduceMotion?'reduce':'auto')}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
