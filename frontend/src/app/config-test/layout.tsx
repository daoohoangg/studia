import { notFound } from "next/navigation";

// Trang kiểm thử nội bộ: chỉ truy cập được khi bật NEXT_PUBLIC_SHOW_DEV_TOOLS=true.
export default function ConfigTestLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS !== "true") notFound();
  return <>{children}</>;
}
