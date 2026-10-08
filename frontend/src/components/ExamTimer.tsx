"use client";

import { useEffect, useRef, useState } from "react";

interface ExamTimerProps {
  initialSeconds: number;
  onExpire: () => void;
  paused?: boolean;
}

export default function ExamTimer({ initialSeconds, onExpire, paused = false }: ExamTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpire();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [paused, onExpire]);

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
