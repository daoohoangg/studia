import type { Metadata } from "next";
import "./globals.css";
import MainLayout from "@/components/MainLayout";

export const metadata: Metadata = {
  title: "Studia | AI Learning Intelligence Platform",
  description: "Biến sách và tài liệu thành hành trình học cá nhân hóa với RAG, FSRS và Gemini AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="light">
      <body>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}

