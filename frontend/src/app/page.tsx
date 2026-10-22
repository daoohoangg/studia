"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Trang Hôm nay nằm ở /home. "/" chỉ là cửa vào: AuthGate đưa người đã đăng nhập sang /home
// và khách sang /welcome; khi tắt đăng nhập (dev) thì chuyển thẳng.
export default function Root() {
  const router = useRouter();
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") router.replace("/home");
  }, [router]);
  return null;
}
