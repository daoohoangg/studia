"use client";

import { useEffect, useRef, useState } from "react";

interface ExamTimerProps {
  initialSeconds: number;
  onExpire: () => void;
  paused?: boolean;
}

/**
 * Đồng hồ đếm ngược của một phần thi.
 * - Tính theo thời điểm kết thúc tuyệt đối (Date.now) nên không lệch khi tab bị bóp nhịp hay máy khoá màn hình.
 * - onExpire giữ trong ref: component cha render lại (kể cả truyền hàm inline) không khởi động lại bộ đếm.
 * - initialSeconds chỉ đọc lúc gắn; sang phần thi mới thì đổi `key` để tạo đồng hồ mới.
 */
export default function ExamTimer({ initialSeconds, onExpire, paused = false }: ExamTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const leftMsRef = useRef(Math.max(0, initialSeconds) * 1000); // thời gian còn lại, cập nhật mỗi nhịp và khi dừng
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (paused || expiredRef.current) return;
    const endsAt = Date.now() + leftMsRef.current;
    const tick = () => {
      const leftMs = Math.max(0, endsAt - Date.now());
      leftMsRef.current = leftMs;
      setSeconds(Math.ceil(leftMs / 1000)); // cùng giá trị thì React bỏ qua render
      if (leftMs <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(id);
        onExpireRef.current();
      }
    };
    const id = setInterval(tick, 250);
    // Quay lại tab/mở khoá màn hình: cập nhật ngay, không chờ nhịp kế tiếp
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      leftMsRef.current = Math.max(0, endsAt - Date.now());
    };
  }, [paused]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const timerClass =
    seconds > 10 * 60 ? "exam-timer" :
    seconds > 5 * 60  ? "exam-timer warning" :
    seconds > 60      ? "exam-timer danger" :
    "exam-timer critical";

  return <span className={timerClass}>{formatted}</span>;
}
