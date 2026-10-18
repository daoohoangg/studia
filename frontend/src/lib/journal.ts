"use client";

import { useCallback, useEffect, useState } from "react";
import type { Mood } from "@/components/mascot/Mascot";
import { addDays, todayIso } from "@/lib/schedule";

/** Nhật ký học tập: mỗi ngày một mục, lưu trên máy người dùng. */
export type Feeling = 1 | 2 | 3 | 4 | 5;
export type JournalEntry = { day: string; feeling: Feeling; tags: string[]; text: string; updatedAt: number };

export const FEELINGS: { value: Feeling; mood: Mood; label: string }[] = [
  { value: 1, mood: "sad", label: "Nản" },
  { value: 2, mood: "sleepy", label: "Mệt" },
  { value: 3, mood: "focus", label: "Bình thường" },
  { value: 4, mood: "happy", label: "Vui" },
  { value: 5, mood: "cheer", label: "Tuyệt vời" },
];

export const TAGS = ["Tập trung", "Dễ phân tâm", "Học được nhiều", "Khó hiểu", "Tự hào", "Căng thẳng", "Thư giãn", "Cần ôn lại"];

const KEY = "studia-journal:v1";

function readAll(): Record<string, JournalEntry> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, JournalEntry>) : {};
  } catch {
    return {};
  }
}

export function useJournal() {
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({});
  const [ready, setReady] = useState(false);
  useEffect(() => { setEntries(readAll()); setReady(true); }, []);

  const save = useCallback((entry: Omit<JournalEntry, "updatedAt">) => {
    const next = { ...readAll(), [entry.day]: { ...entry, text: entry.text.trim(), updatedAt: Date.now() } };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setEntries(next);
  }, []);
  const remove = useCallback((day: string) => {
    const next = readAll();
    delete next[day];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setEntries(next);
  }, []);
  return { entries, ready, save, remove };
}

/** 7 ngày gần nhất (cũ → mới) kèm cảm xúc đã ghi, nếu có. */
export function lastSevenDays(entries: Record<string, JournalEntry>) {
  const t = todayIso();
  return Array.from({ length: 7 }, (_, i) => { const day = addDays(t, i - 6); return { day, entry: entries[day] as JournalEntry | undefined }; });
}
