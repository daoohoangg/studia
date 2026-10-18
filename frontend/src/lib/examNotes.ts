"use client";

import { useCallback, useEffect, useState } from "react";

/** Ghi chú và cờ đánh dấu của một lượt thi, lưu trên máy người dùng (theo mã phiên) để xem lại sau khi nộp bài. */
export type ExamNote = { id: string; text: string; quote?: string; at: number };

const notesKey = (k: string) => `studia-exam-notes:${k}`;
const flagsKey = (k: string) => `studia-exam-flags:${k}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export const readNotes = (sessionKey: string): ExamNote[] => read<ExamNote[]>(notesKey(sessionKey), []);

export function useExamNotes(sessionKey: string) {
  const [notes, setNotes] = useState<ExamNote[]>([]);
  useEffect(() => { setNotes(readNotes(sessionKey)); }, [sessionKey]);

  const commit = useCallback((next: ExamNote[]) => { setNotes(next); write(notesKey(sessionKey), next); }, [sessionKey]);
  const add = useCallback((text: string, quote?: string) => {
    const body = text.trim();
    if (!body && !quote) return;
    commit([{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: body, quote, at: Date.now() }, ...readNotes(sessionKey)]);
  }, [commit, sessionKey]);
  const remove = useCallback((id: string) => commit(readNotes(sessionKey).filter((n) => n.id !== id)), [commit, sessionKey]);
  return { notes, add, remove };
}

export function useExamFlags(sessionKey: string) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  useEffect(() => { setFlags(read<Record<string, boolean>>(flagsKey(sessionKey), {})); }, [sessionKey]);
  const toggle = useCallback((id: string) => {
    setFlags((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) delete next[id];
      write(flagsKey(sessionKey), next);
      return next;
    });
  }, [sessionKey]);
  return { flags, toggle };
}
