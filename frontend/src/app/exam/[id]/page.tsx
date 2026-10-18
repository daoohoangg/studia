"use client";

import { audioUrl as resolveAudioUrl } from "@/lib/assets";
import { Fragment, useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ExamTimer from "@/components/ExamTimer";
import Logo from "@/components/Logo";

import { API, apiFetch } from "@/lib/api";
import { AnswerSaver, createAnswerSaver, postJson } from "@/lib/examSession";
import GroupHeader from "@/components/exam/GroupHeader";
import ServerResult from "@/components/exam/ServerResult";
import { Mic, Square } from "lucide-react";
import ExamNotes from "@/components/exam/ExamNotes";
import { useExamFlags, useExamNotes } from "@/lib/examNotes";
import { SKILL_ORDER, STANDARD_MINUTES, type RoomMode } from "@/lib/examConfig";
import "./room.css";

// ─── Types ──────────────────────────────────────────────────
type Section = "listening" | "reading" | "writing" | "speaking";
type ExamStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED";

interface ExamSession {
  session_id: string;
  exam_type: string;
  sections: Section[];
  section_order: Section[];
  section_durations: Record<string, number>;
  audio_url?: string;
}

interface ExamData {
  session: ExamSession;
  questions: {
    listening: any[];
    reading: any[];
    reading_passage: string;
    writing_task1: string;
    writing_task2: string;
    speaking: any;
  };
}

// ─── Sample Fallback Data ────────────────────────────────────
const DEMO_LISTENING = Array.from({ length: 40 }, (_, i) => ({
  number: i + 1,
  type: i % 4 === 0 ? "multiple_choice" : "note_completion",
  question: `Question ${i + 1}: ${i % 4 === 0
    ? "According to the speaker, what is the main benefit mentioned?"
    : `Complete the note: The appointment is on ___`}`,
  options: i % 4 === 0 ? ["A. To save time", "B. To reduce cost", "C. To improve quality", "D. To increase sales"] : null,
  section: i < 10 ? "Part 1" : i < 20 ? "Part 2" : i < 30 ? "Part 3" : "Part 4",
}));

const DEMO_READING_PASSAGE = `**The Science of Sleep**

Sleep is a fundamental biological process that plays a crucial role in maintaining physical and mental health. Despite spending approximately one-third of their lives asleep, humans have only recently begun to understand the complex mechanisms that govern this essential activity.

Research conducted over the past several decades has revealed that sleep is not a passive state of unconsciousness, but rather an active process during which the brain performs vital functions. During sleep, the brain consolidates memories, processes emotional experiences, and clears metabolic waste products that accumulate during waking hours.

The sleep cycle consists of several distinct stages, each characterized by unique patterns of brain activity. Non-rapid eye movement (NREM) sleep, which comprises approximately 75-80% of total sleep time, is further divided into three stages of progressively deeper sleep. Rapid eye movement (REM) sleep, during which most dreaming occurs, typically follows NREM sleep and is associated with memory consolidation and emotional processing.

Chronic sleep deprivation has been linked to numerous adverse health outcomes, including increased risk of cardiovascular disease, metabolic disorders, and impaired immune function. Moreover, insufficient sleep significantly affects cognitive performance, reducing attention, working memory, and decision-making capabilities.

Contemporary research has also explored the relationship between sleep and learning. Studies suggest that adequate sleep following a learning session enhances the retention of new information, as the brain actively consolidates learned material during sleep. This finding has significant implications for educational practices and study strategies.

The regulation of sleep is governed by two primary mechanisms: the circadian rhythm, an internal biological clock that responds to light and darkness, and sleep pressure, which increases with prolonged wakefulness.`;

const DEMO_READING = Array.from({ length: 40 }, (_, i) => ({
  number: i + 1,
  type: i % 5 === 0 ? "multiple_choice" : i % 5 === 1 ? "true_false_ng" : "sentence_completion",
  question: i % 5 === 0
    ? `Question ${i + 1}: According to the passage, which statement best describes sleep?`
    : i % 5 === 1
    ? `Question ${i + 1}: Sleep is a passive state of unconsciousness.`
    : `Question ${i + 1}: Complete the sentence: Sleep helps the brain ___`,
  options: i % 5 === 0
    ? ["A. A passive resting state", "B. An active brain process", "C. A random neural activity", "D. A form of unconsciousness"]
    : i % 5 === 1
    ? ["TRUE", "FALSE", "NOT GIVEN"]
    : null,
  passage: i < 14 ? "Passage 1" : i < 27 ? "Passage 2" : "Passage 3",
}));

const SPEAKING_FLOW = {
  part1: {
    title: "Part 1 — Introduction & Interview",
    duration: 270,
    questions: [
      "Good morning. My name is Alex. Can you tell me your full name, please?",
      "Where are you from?",
      "Do you work or are you a student at the moment?",
      "What do you enjoy most about your work or studies?",
      "Let's talk about your hometown. What do you like most about living there?",
    ],
  },
  part2: {
    title: "Part 2 — Individual Long Turn",
    prep: 60,
    speaking: 120,
    cue_card: `**Describe a book you have read that you found particularly interesting.**

You should say:
• what the book was about
• why you decided to read it
• what you found most interesting about it

and explain why you would recommend this book to others.`,
  },
  part3: {
    title: "Part 3 — Two-way Discussion",
    duration: 270,
    questions: [
      "Do you think reading habits have changed in recent years?",
      "How important is it for children to develop a love of reading?",
      "Do you think electronic books will eventually replace traditional printed books?",
      "What role do public libraries play in modern society?",
    ],
  },
};

// ─── Main Component Wrapper ──────────────────────────────────
export default function ExamSessionPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}>
        <div>Đang tải phòng thi...</div>
      </div>
    }>
      <ExamSessionContent />
    </Suspense>
  );
}

// ─── Chấm điểm (Listening / Reading) ─────────────────────────
const canon = (s: any): string => {
  const n = String(s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (n === "yes") return "true";
  if (n === "no") return "false";
  if (n === "notgiven") return "not given";
  return n;
};

// Bảng quy đổi số câu đúng (40 câu) sang band, theo thang IELTS Academic
const LISTENING_BANDS: [number, number][] = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5]];
const READING_BANDS: [number, number][] = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5]];
const toBand = (raw: number, table: [number, number][]) => (table.find(([min]) => raw >= min)?.[1] ?? 1);

/** Chấm từng câu; null nếu đề chưa có đáp án. */
function gradeQuestions(questions: any[] | undefined, prefix: string, answers: Record<string, any>): { correct: number; items: any[] } | null {
  if (!questions || questions.length === 0 || !questions.every(q => q.correct_answer)) return null;
  const byNumber: Record<string, any> = {};
  questions.forEach(q => { byNumber[String(q.number)] = q; });
  const items: any[] = [];
  let correct = 0;
  for (const q of questions) {
    const raw = answers[`${prefix}_${q.number}`];
    const given = canon(raw);
    let ok = false;
    let shown: string[] = (q.accepted_answers || [q.correct_answer]).map(String);
    if (given && q.either_order_with) {
      // Hai câu có thể trả lời theo thứ tự bất kỳ, nhưng không được trùng nhau
      const partner = byNumber[String(q.either_order_with)];
      const pair = [canon(q.correct_answer), canon(partner?.correct_answer)];
      const partnerGiven = canon(answers[`${prefix}_${partner?.number}`]);
      const isFirst = Number(q.number) < Number(partner?.number);
      ok = pair.includes(given) && (isFirst || given !== partnerGiven);
    } else if (given) {
      ok = shown.map(canon).includes(given);
    }
    if (q.either_order_with) shown = [String(q.correct_answer)];
    if (ok) correct++;
    items.push({
      number: q.number, type: q.type, section: q.section || q.passage, question: q.question,
      user_answer: raw == null ? "" : String(raw), correct_answers: shown, is_correct: ok,
    });
  }
  return { correct, items };
}

/** Kết quả của phòng thi demo (chấm ngay trên trình duyệt) theo đúng dạng máy chủ trả về, để dùng chung màn kết quả. */
function buildDemoResult(o: {
  sections: Section[]; questions: any; answers: Record<string, any>; task1: string; task2: string;
  mode: RoomMode; title: string; auto: boolean;
}) {
  const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const section_results: Record<string, any> = {};
  const review: Record<string, any[]> = {};
  const bands: number[] = [];
  for (const skill of ["listening", "reading"] as const) {
    const qs: any[] = o.questions?.[skill] || [];
    if (!o.sections.includes(skill) || qs.length === 0) continue;
    const graded = gradeQuestions(qs, skill, o.answers);
    const answered = qs.filter(q => String(o.answers[`${skill}_${q.number}`] ?? "").trim() !== "").length;
    const band = graded ? toBand(graded.correct, skill === "listening" ? LISTENING_BANDS : READING_BANDS) : null;
    if (band != null) bands.push(band);
    section_results[skill] = { raw_score: graded?.correct ?? 0, total: qs.length, band, answered };
    review[skill] = graded?.items || [];
  }
  if (o.sections.includes("writing")) {
    section_results.writing = {
      band: null, scored_by: "none",
      task1: { words: words(o.task1), min_words: 150, scored_by: "none" },
      task2: { words: words(o.task2), min_words: 250, scored_by: "none" },
    };
  }
  if (o.sections.includes("speaking")) section_results.speaking = { band: null, status: "not_scored" };
  return {
    session_id: "demo", title: o.title, status: o.auto ? "AUTO_SUBMITTED" : "SUBMITTED",
    session_mode: o.mode, sections: o.sections,
    overall_band: bands.length ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2 : null,
    section_results, review, by_type: {}, ai_analysis: {}, materials: {},
    submitted_at: new Date().toISOString(),
  };
}

/** Giải thích cho phòng thi demo: không có AI hay nguồn bài, chỉ đối chiếu đáp án của bạn với đáp án đúng. */
function demoExplanation(result: any, skill: string, number: number) {
  const item = (result.review?.[skill] || []).find((i: any) => i.number === number);
  if (!item) throw new Error("Không tìm thấy câu này");
  const correct = (item.correct_answers || []).join(" / ");
  const mine = String(item.user_answer || "").trim();
  return {
    explanation_vi: `Đáp án đúng là ${correct}.` + (item.is_correct ? " Bạn đã trả lời đúng."
      : mine ? ` Bạn đã chọn/điền “${mine}”, không khớp với đáp án.` : " Bạn đã bỏ trống câu này."),
    evidence: null,
    tip_vi: "Gạch chân từ khoá của câu hỏi, tìm đoạn paraphrase trong bài rồi đối chiếu với đáp án; chú ý giới hạn số từ và chính tả.",
    scored_by: "rule",
  };
}

function ExamSessionContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const isDemoMode = sessionId === "demo";
  const demoType = searchParams.get("type") || "full";
  // Cấu hình của phòng thi demo nằm trên URL; phiên thật lấy từ máy chủ khi tải
  const demoMode: RoomMode = searchParams.get("sm") === "practice" ? "practice" : "real";
  const demoSectionsParam = searchParams.get("sections");
  const demoMinsParam = searchParams.get("mins");
  const demoUntimed = searchParams.get("untimed") === "1";
  const demoStamp = useRef(Date.now());

  const [examData, setExamData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<Section>("listening");
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [writingTask1, setWritingTask1] = useState("");
  const [writingTask2, setWritingTask2] = useState("");
  const [writingTab, setWritingTab] = useState<"task1" | "task2">("task1");
  const [status, setStatus] = useState<ExamStatus>("IN_PROGRESS");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sectionDone, setSectionDone] = useState<string[]>([]);
  const [showNav, setShowNav] = useState(true);
  const [roomMode, setRoomMode] = useState<RoomMode>(isDemoMode ? demoMode : "real");
  const [untimed, setUntimed] = useState(isDemoMode && demoMode === "practice" && demoUntimed);
  const sessionKey = isDemoMode ? `demo-${demoType}-${demoStamp.current}` : sessionId;
  const { notes, add: addNote, remove: removeNote } = useExamNotes(sessionKey);
  const { flags, toggle: toggleFlag } = useExamFlags(sessionKey);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteQuote, setNoteQuote] = useState("");
  const [hintDismissed, setHintDismissed] = useState(false);

  // Speaking state
  const [speakingPart, setSpeakingPart] = useState<"part1" | "part2" | "part3">("part1");
  const [speakingQIdx, setSpeakingQIdx] = useState(0);
  const [speakingPhase, setSpeakingPhase] = useState<"question" | "prep" | "speaking" | "done">("question");
  const [speakingTimer, setSpeakingTimer] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  // Audio state (Listening)
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const autosaveRef = useRef<NodeJS.Timeout | null>(null);
  const sections = examData?.session?.section_order || [];

  // Phiên thi thật (chấm điểm ở server): không phải chế độ demo
  const [loadError, setLoadError] = useState<string | null>(null);
  const [remainingOverride, setRemainingOverride] = useState<number | null>(null);
  const [saveFailures, setSaveFailures] = useState(0);
  const saveFailuresRef = useRef(0);
  saveFailuresRef.current = saveFailures;
  const saverRef = useRef<AnswerSaver | null>(null);

  // ─── Load Exam Data ──────────────────────────────────────────
  useEffect(() => {
    const loadExam = async () => {
      if (isDemoMode) {
        // Build demo session
        const isCam21 = demoType.startsWith("cambridge21");
        const picked = (demoSectionsParam || "").split(",").filter((x) => (SKILL_ORDER as string[]).includes(x));
        const demoSections = picked.length
          ? SKILL_ORDER.filter((x) => picked.includes(x))
          : (demoType === "full" || isCam21)
            ? ["listening", "reading", "writing", "speaking"]
            : [demoType];
        const customMinutes: Record<string, number> = {};
        (demoMinsParam || "").split(",").forEach((pair) => {
          const [k, v] = pair.split(":");
          const m = Number(v);
          if ((SKILL_ORDER as string[]).includes(k) && m >= 1 && m <= 240) customMinutes[k] = Math.round(m);
        });
        const minutesOf = (k: "listening" | "reading" | "writing" | "speaking") => (customMinutes[k] ?? STANDARD_MINUTES[k]) * 60;

        let srcData: any;
        // Bộ đề Cambridge nạp theo yêu cầu: không đưa ~250KB JSON vào bundle của mọi người dùng
        const camMatch = /^cambridge21_test([1-4])$/.exec(demoType);
        if (camMatch) srcData = (await import(`@/data/cambridge21_test${camMatch[1]}.json`)).default;
        else {
          srcData = {
            listening: DEMO_LISTENING,
            reading: DEMO_READING,
            reading_passage: DEMO_READING_PASSAGE,
            writing_task1: "The graph below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
            writing_task2: "Some people believe that it is best to accept a bad situation, such as an unsatisfactory job or shortage of money. Others argue that it is better to try and improve such situations.\n\nDiscuss both these views and give your own opinion.\n\nWrite at least 250 words.",
            speaking: SPEAKING_FLOW,
          };
        }

        setExamData({
          session: {
            session_id: "demo",
            exam_type: demoType,
            sections: demoSections as Section[],
            section_order: demoSections as Section[],
            section_durations: {
              listening: minutesOf("listening"), reading: minutesOf("reading"), writing: minutesOf("writing"), speaking: minutesOf("speaking"),
            },
            audio_url: isCam21 ? resolveAudioUrl(srcData.listening_audio) : undefined
          },
          questions: srcData as any,
        });
        setCurrentSection(demoSections[0] as Section);
        setLoading(false);
        // Apply exam mode to body
        document.body.classList.add("exam-mode");
        return;
      }

      try {
        const res = await apiFetch(`${API}/exam/sessions/${sessionId}`);
        if (res.status === 404) {
          setLoadError("Không tìm thấy phiên thi này. Hãy quay lại danh sách đề để bắt đầu một phiên mới.");
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (data.result) {  // phiên đã nộp: hiện luôn kết quả
          setResult({ ...data.result, server: true });
          setStatus(data.session.status);
          return;
        }
        const session = data.session;
        if (session.status === "NOT_STARTED") {
          const started = await postJson(`/exam/sessions/${sessionId}/start`);
          if (started.ok) {
            const info = await started.json();
            session.status = info.status;
            session.current_section = info.current_section;
            session.remaining_seconds = info.remaining_seconds ?? null;
          }
        }
        setExamData({ session, questions: data.questions });
        setRoomMode(session.session_mode === "practice" ? "practice" : "real");
        setUntimed(!!session.untimed);
        const saved = data.answers || {};
        setAnswers(saved);
        setWritingTask1(saved.writing_task1 || "");
        setWritingTask2(saved.writing_task2 || "");
        const order: Section[] = session.section_order;
        const current: Section = order.includes(session.current_section) ? session.current_section : order[0];
        setCurrentSection(current);
        setSectionDone(order.slice(0, order.indexOf(current)));
        if (typeof session.remaining_seconds === "number") setRemainingOverride(session.remaining_seconds);
        saverRef.current = createAnswerSaver(sessionId, setSaveFailures);
        postJson(`/exam/sessions/${sessionId}/section`, { section: current }).catch(() => {});
      } catch {
        setLoadError("Không tải được phiên thi. Kiểm tra kết nối rồi thử lại.");
      } finally {
        setLoading(false);
        document.body.classList.add("exam-mode");
      }
    };
    loadExam();
    return () => {
      document.body.classList.remove("exam-mode");
      saverRef.current?.dispose();
    };
  }, [sessionId, isDemoMode, demoType]);

  // Menu bôi đen chữ đọc chế độ phòng thi từ body: thi thật chỉ cho tô sáng, luyện tập có thêm từ điển/ghi chú
  useEffect(() => {
    if (result) return;
    document.body.dataset.examMode = roomMode;
    return () => { delete document.body.dataset.examMode; };
  }, [roomMode, result]);

  useEffect(() => {
    if (roomMode !== "practice") return;
    const onNote = (e: Event) => {
      setNoteQuote(String((e as CustomEvent).detail?.text || "").slice(0, 400));
      setNotesOpen(true);
    };
    window.addEventListener("studia:exam-note", onNote);
    return () => window.removeEventListener("studia:exam-note", onNote);
  }, [roomMode]);

  // Autosave writing
  useEffect(() => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      if (isDemoMode || !saverRef.current) return;
      if (writingTask1) saverRef.current.saveWriting("task1", writingTask1);
      if (writingTask2) saverRef.current.saveWriting("task2", writingTask2);
    }, 3000);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
  }, [writingTask1, writingTask2]);

  const submitRef = useRef<(auto?: boolean) => void>(() => {});
  const handleAutoSubmit = useCallback(() => {
    setStatus("AUTO_SUBMITTED");
    submitRef.current(true);
  }, []);

  const handleSubmitExam = async (auto = false) => {
    setSubmitLoading(true);
    if (!isDemoMode) {
      try {
        const saver = saverRef.current;
        if (saver) {
          if (writingTask1) saver.saveWriting("task1", writingTask1);
          if (writingTask2) saver.saveWriting("task2", writingTask2);
          await saver.flush();
        }
        const res = await postJson(`/exam/sessions/${sessionId}/submit`, { auto_submitted: auto });
        if (!res.ok) throw new Error(String(res.status));
        setResult({ ...(await res.json()), server: true });
        setStatus(auto ? "AUTO_SUBMITTED" : "SUBMITTED");
        document.body.classList.remove("exam-mode");
      } catch {
        window.alert("Không nộp được bài (lỗi mạng hoặc máy chủ). Các câu trả lời đã nhập vẫn được giữ — hãy thử nộp lại.");
      }
      setSubmitLoading(false);
      setShowSubmitModal(false);
      return;
    }
    const camTitle = /^cambridge21_test(\d)$/.exec(demoType);
    setResult({
      ...buildDemoResult({
        sections: sections as Section[], questions: examData?.questions, answers, task1: writingTask1, task2: writingTask2,
        mode: roomMode, title: camTitle ? `Cambridge IELTS 21 - Test ${camTitle[1]}` : "Đề mẫu Studia", auto,
      }),
      server: true, demo: true,
    });
    setSubmitLoading(false);
    setShowSubmitModal(false);
    setStatus(auto ? "AUTO_SUBMITTED" : "SUBMITTED");
    document.body.classList.remove("exam-mode");
  };
  submitRef.current = handleSubmitExam;

  const setAnswer = (section: Section, num: number, val: any) => {
    setAnswers(prev => ({ ...prev, [`${section}_${num}`]: val }));
    if (!isDemoMode && (section === "listening" || section === "reading")) {
      saverRef.current?.save(section, num, val);
    }
  };

  const getAnswer = (section: Section, num: number) => answers[`${section}_${num}`];

  const answeredCount = (section: Section, total: number) =>
    Array.from({ length: total }, (_, i) => i + 1).filter(n => answers[`${section}_${n}`]).length;

  const [breakTo, setBreakTo] = useState<Section | null>(null);
  const [breakLeft, setBreakLeft] = useState(45);
  const nextSection = () => {
    const idx = sections.indexOf(currentSection);
    if (idx < sections.length - 1) {
      setSectionDone(prev => [...prev, currentSection]);
      setBreakTo(sections[idx + 1]);
      setBreakLeft(45);
    } else {
      setShowSubmitModal(true);
    }
  };
  const startSection = () => {
    const idx = sections.indexOf(currentSection);
    if (idx < sections.length - 1) {
      setBreakTo(null);
      setCurrentSection(sections[idx + 1]);
      setCurrentQuestion(1);
      setRemainingOverride(null);
      if (!isDemoMode) postJson(`/exam/sessions/${sessionId}/section`, { section: sections[idx + 1] }).catch(() => {});
    } else {
      setShowSubmitModal(true);
    }
  };

  // Hết giờ phần cuối: hiện hộp thoại tổng kết trước khi vào kết quả
  const [timeUp, setTimeUp] = useState(false);
  const [timeUpAck, setTimeUpAck] = useState(false);
  // Mạng: báo mất kết nối / đã kết nối lại
  const [online, setOnline] = useState(true);
  const [backOnline, setBackOnline] = useState<number | null>(null);
  useEffect(() => {
    setOnline(navigator.onLine);
    let t: ReturnType<typeof setTimeout> | undefined;
    const off = () => setOnline(false);
    const on = () => {
      setOnline(true);
      setBackOnline(saveFailuresRef.current);
      t = setTimeout(() => setBackOnline(null), 5000);
    };
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => { window.removeEventListener("offline", off); window.removeEventListener("online", on); if (t) clearTimeout(t); };
  }, []);

  const startSectionRef = useRef(startSection);
  startSectionRef.current = startSection;
  useEffect(() => {
    if (!breakTo) return;
    if (breakLeft <= 0) { startSectionRef.current(); return; }
    const t = setTimeout(() => setBreakLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [breakTo, breakLeft]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px", color: "var(--ink)" }}>
      <div style={{ width: 40, height: 40, border: "3px solid var(--hairline)", borderTopColor: "var(--brand)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p style={{ fontSize: "0.9rem", color: "var(--ink-muted)" }}>Đang tải phòng thi IELTS...</p>
    </div>
  );

  // ─── Hết giờ ─────────────────────────────────────────────────
  if (timeUp && !timeUpAck) {
    const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
    const w1 = words(writingTask1), w2 = words(writingTask2);
    const last = sections[sections.length - 1];
    return (
      <div style={{ minHeight: "100vh", background: "color-mix(in srgb, var(--navy) 55%, var(--canvas))", display: "grid", placeItems: "center", padding: 24 }}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="tu-h" aria-describedby="tu-d" className="st-enter"
          style={{ width: "100%", maxWidth: 480, background: "var(--surface)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)", padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center" }}>
          <span className="tile tile-warning" style={{ width: 56, height: 56 }} aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          </span>
          <div>
            <h2 id="tu-h" style={{ font: "700 24px/30px var(--font-display)", letterSpacing: -0.4 }}>Hết giờ phần {last === "listening" ? "Listening" : last === "reading" ? "Reading" : last === "writing" ? "Writing" : "Speaking"}</h2>
            <p id="tu-d" className="ink2" style={{ marginTop: 6 }}>Bài làm đã được lưu và nộp tự động — bạn không mất chữ nào.</p>
          </div>
          {sections.includes("writing") && (
            <div style={{ width: "100%", padding: "4px 16px", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", textAlign: "left" }}>
              <div className="row" style={{ justifyContent: "space-between", padding: "10px 0" }}><span>Task 1</span><b className="num" style={{ color: w1 >= 150 ? "var(--success)" : "var(--warning)" }}>{w1} / 150 từ</b></div>
              <div className="row" style={{ justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--hairline)" }}><span>Task 2</span><b className="num" style={{ color: w2 >= 250 ? "var(--success)" : "var(--warning)" }}>{w2} / 250 từ</b></div>
            </div>
          )}
          {sections.includes("writing") && w2 < 250 && <p className="meta">Task 2 dưới 250 từ thường bị trừ điểm Task Response.</p>}
          <button className="st-btn st-btn-primary" style={{ width: "100%" }} type="button" disabled={!result} onClick={() => setTimeUpAck(true)}>
            {result ? "Xem kết quả" : "Đang chấm bài…"}
          </button>
        </section>
      </div>
    );
  }

  // ─── Result Screen ───────────────────────────────────────────
  if (result) {
    return <ServerResult result={result} onRetry={() => router.push("/exam")} sessionKey={sessionKey}
      explain={result.demo ? async (skill, number) => demoExplanation(result, skill, number) : undefined} />;
  }

  if (loadError) return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px", padding: "24px", textAlign: "center" }}>
      <p style={{ fontSize: "1rem", color: "var(--ink)", maxWidth: 420 }}>{loadError}</p>
      <button onClick={() => router.push("/exam")} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: "var(--brand)", color: "var(--on-brand)", fontWeight: 700, cursor: "pointer" }}>
        Về danh sách đề
      </button>
    </div>
  );

  if (!examData) return null;

  const { questions } = examData;
  const audioUrl = (examData.session as any).audio_url;
  const sectionDuration = examData.session.section_durations[currentSection] || 1800;
  const sectionLabel: Record<Section, string> = {
    listening: "Listening",
    reading: "Reading",
    writing: "Writing",
    speaking: "Speaking"
  };

  const breakInfo: Record<Section, { time: string; tips: [string, string][] }> = {
    listening: { time: "30 phút · 4 phần · 40 câu", tips: [["Đọc trước câu hỏi", "Bạn có vài giây trước mỗi phần để lướt câu hỏi."], ["Ghi đáp án ngay", "Bài nghe chỉ phát một lần."], ["Chú ý chính tả", "Sai chính tả bị tính sai."]] },
    reading: { time: "60 phút · 3 bài đọc · 40 câu", tips: [["Chia giờ", "Khoảng 20 phút mỗi bài đọc. Bài 3 thường khó nhất."], ["Bôi đậm khi đọc", "Chọn chữ trong bài để tô — tiện khi dò lại."], ["Đánh dấu câu khó", "Bấm cờ để quay lại trước khi nộp."]] },
    writing: { time: "60 phút · 2 bài viết", tips: [["Task 2 chiếm điểm nhiều hơn", "Dành khoảng 40 phút cho Task 2."], ["Đủ số từ", "Task 1 từ 150 từ, Task 2 từ 250 từ."], ["Dành 3 phút soát lỗi", "Kiểm tra chính tả và mạo từ."]] },
    speaking: { time: "11–14 phút · 3 phần", tips: [["Nói tự nhiên", "Không cần từ quá khó, cần trôi chảy."], ["Mở rộng câu trả lời", "Thêm lý do và ví dụ."], ["Kiểm tra micro", "Cho phép trình duyệt dùng micro."]] },
  };
  if (breakTo) {
    const order = sections;
    const info = breakInfo[breakTo];
    return (
      <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", flexDirection: "column" }}>
        <header className="exam-header"><span className="exam-header-brand row" style={{ gap: 10 }}><Logo variant="mark" height={22} />IELTS Mock Test · Chuyển phần</span></header>
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div className="st-enter" style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center" }}>
            <ol aria-label="Các phần thi" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: `repeat(${order.length}, minmax(0, 1fr))`, gap: 8, width: "100%", textAlign: "left" }}>
              {order.map((sec) => {
                const state = sectionDone.includes(sec) ? "done" : sec === breakTo ? "next" : "todo";
                return (
                  <li key={sec} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "14px 16px", borderRadius: "var(--radius-md)", border: state === "next" ? "2px solid var(--brand)" : "1px solid var(--hairline)", background: state === "done" ? "var(--success-tint)" : "var(--surface)" }}>
                    <span className="meta" style={{ color: state === "done" ? "var(--success)" : state === "next" ? "var(--brand)" : undefined }}>{state === "done" ? "✓ Đã nộp" : state === "next" ? "Tiếp theo" : "Sau đó"}</span>
                    <b style={{ font: "650 15px/20px var(--font-sans)" }}>{sectionLabel[sec]}</b>
                  </li>
                );
              })}
            </ol>
            <div>
              <div className="eyebrow" style={{ color: "var(--ink-muted)" }}>Phần {sectionDone.length + 1} / {order.length}</div>
              <h1 style={{ font: "700 40px/48px var(--font-display)", letterSpacing: -1, marginTop: 6 }}>{sectionLabel[breakTo]}</h1>
              <p className="ink2" style={{ marginTop: 6 }}>{info.time}.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, width: "100%", textAlign: "left" }}>
              {info.tips.map(([t, d]) => (
                <div key={t} className="st-card" style={{ padding: 16 }}><b style={{ fontWeight: 600 }}>{t}</b><p className="meta" style={{ marginTop: 4 }}>{d}</p></div>
              ))}
            </div>
            <div className="stack" style={{ alignItems: "center", gap: 14 }}>
              <div role="timer" aria-label={`Tự bắt đầu sau ${breakLeft} giây`} style={{ font: "700 64px/1 var(--font-display)", letterSpacing: -2, fontVariantNumeric: "tabular-nums" }}>0:{String(Math.max(0, breakLeft)).padStart(2, "0")}</div>
              <p className="meta">Phần {sectionLabel[breakTo]} tự bắt đầu khi hết giờ nghỉ</p>
              <button className="st-btn st-btn-primary st-btn-lg" type="button" onClick={startSection}>Bắt đầu {sectionLabel[breakTo]} ngay</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const totalQs: Record<Section, number> = {
    listening: questions.listening?.length || 40, reading: questions.reading?.length || 40, writing: 2, speaking: 3
  };
  const navNumbers = (sec: "listening" | "reading") => {
    const list: any[] = questions[sec] || [];
    return list.length ? list.map((q) => q.number as number) : Array.from({ length: 40 }, (_, i) => i + 1);
  };

  return (
    <div style={{ background: "var(--canvas)", minHeight: "100vh" }}>
      {/* ─── Exam Header ─────────────────────────────────────── */}
      <div className="exam-header">
        <span className="exam-header-brand row" style={{ gap: 10 }}><Logo variant="mark" height={22} />IELTS Mock Test<span className="room-mode" data-mode={roomMode}>{roomMode === "practice" ? "Luyện tập" : "Thi thật"}</span></span>

        {/* Section tabs */}
        <div className="row" style={{ gap: 6 }} aria-label="Các phần thi">
          {sections.map(sec => {
            const done = sectionDone.includes(sec);
            return (
              <span key={sec} className="part-pill" aria-current={sec === currentSection ? "true" : undefined}
                style={done && sec !== currentSection ? { background: "var(--success-tint)", borderColor: "transparent", color: "var(--success)" } : undefined}>
                {done && sec !== currentSection ? "✓ " : ""}{sectionLabel[sec]}
              </span>
            );
          })}
        </div>

        {/* Timer + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {untimed ? (
            <span className="room-untimed">Không giới hạn giờ</span>
          ) : (
            <ExamTimer
              key={currentSection}
              initialSeconds={remainingOverride ?? sectionDuration}
              onExpire={() => {
                if (sections.indexOf(currentSection) < sections.length - 1) {
                  nextSection();
                } else {
                  setTimeUp(true);
                  handleAutoSubmit();
                }
              }}
            />
          )}
          <button className="st-btn st-btn-primary st-btn-sm" type="button" onClick={() => setShowSubmitModal(true)}>
            Nộp bài
          </button>
        </div>
      </div>

      {(!online || saveFailures > 0) && (
        <div role="alert" style={{ background: "var(--warning-tint)", color: "var(--ink)", padding: "10px 20px", fontSize: "0.88rem", display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid var(--hairline)" }}>
          <span style={{ flex: 1 }}>
            <b style={{ fontWeight: 600 }}>{online ? "Chưa lưu được một số câu." : "Mất kết nối mạng."}</b>{" "}
            {saveFailures > 0 ? `${saveFailures} câu trả lời chờ lưu. ` : ""}
            Bạn cứ làm tiếp — câu trả lời được giữ trên máy và tự gửi khi có mạng. Đồng hồ vẫn chạy.
          </span>
        </div>
      )}
      {backOnline !== null && (
        <div role="status" style={{ position: "fixed", left: "50%", bottom: 84, transform: "translateX(-50%)", zIndex: 80, display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 999, background: "var(--navy)", color: "var(--on-navy)", font: "550 14px/1 var(--font-sans)", boxShadow: "var(--shadow-lg)" }}>
          ✓ Đã kết nối lại{backOnline > 0 ? ` · ${backOnline} câu trả lời đang được lưu` : ""}
        </div>
      )}

      {roomMode === "practice" && !hintDismissed && (
        <div className="practice-hint" role="note">
          <span><b style={{ fontWeight: 600 }}>Phòng luyện tập:</b> bôi đen chữ trong bài để tra từ điển, tô sáng, thêm flashcard hoặc ghi chú. Nút “Ghi chú” ở góc trái mở sổ tay.</span>
          <button type="button" onClick={() => setHintDismissed(true)}>Đã hiểu</button>
        </div>
      )}

      {/* ─── Section Content ─────────────────────────────────── */}
      <div className="exam-content" style={{ paddingBottom: showNav ? "60px" : "0px" }}>
        {currentSection === "listening" && (
          <ListeningSection
            questions={questions.listening}
            currentQ={currentQuestion}
            answers={answers}
            onAnswer={setAnswer}
            onNavigate={setCurrentQuestion}
            audioPlaying={audioPlaying}
            audioProgress={audioProgress}
            onToggleAudio={() => setAudioPlaying(p => !p)}
            onUpdateProgress={setAudioProgress}
            audioUrl={audioUrl}
            showNav={showNav}
          />
        )}
        {currentSection === "reading" && (
          <ReadingSection
            passage={questions.reading_passage}
            readingPassages={(questions as any).reading_passages}
            questions={questions.reading}
            currentQ={currentQuestion}
            answers={answers}
            onAnswer={setAnswer}
            onNavigate={setCurrentQuestion}
            showNav={showNav}
          />
        )}
        {currentSection === "writing" && (
          <WritingSection
            task1Prompt={questions.writing_task1}
            task2Prompt={questions.writing_task2}
            task1Image={(questions as any).writing_task1_image}
            task1MinWords={(questions as any).writing_task1_min_words}
            task2MinWords={(questions as any).writing_task2_min_words}
            task1Text={writingTask1}
            task2Text={writingTask2}
            onTask1Change={setWritingTask1}
            onTask2Change={setWritingTask2}
            activeTab={writingTab}
            onTabChange={setWritingTab}
          />
        )}
        {currentSection === "speaking" && (
          <SpeakingSection
            flow={questions.speaking || SPEAKING_FLOW}
            part={speakingPart}
            qIdx={speakingQIdx}
            phase={speakingPhase}
            timer={speakingTimer}
            isRecording={isRecording}
            onNextQ={() => {
              const partFlow = questions.speaking?.[speakingPart] || SPEAKING_FLOW[speakingPart as keyof typeof SPEAKING_FLOW];
              const qs = (partFlow as any).questions || [];
              if (speakingQIdx < qs.length - 1) {
                setSpeakingQIdx(i => i + 1);
              } else {
                if (speakingPart === "part1") { setSpeakingPart("part2"); setSpeakingQIdx(0); setSpeakingPhase("prep"); }
                else if (speakingPart === "part2") { setSpeakingPart("part3"); setSpeakingQIdx(0); setSpeakingPhase("question"); }
                else setSpeakingPhase("done");
              }
            }}
            onRecord={() => setIsRecording(r => !r)}
            onPhaseChange={setSpeakingPhase}
          />
        )}
      </div>

      {/* ─── Question Navigator (Listening/Reading/Writing/Speaking) ──────────── */}
      {showNav ? (
        <>
          {(currentSection === "listening" || currentSection === "reading") && (
            <div className="exam-navigator">
              <button
                onClick={() => nextSection()}
                style={{
                  padding: "6px 14px", borderRadius: "8px", marginRight: "8px",
                  background: "var(--success-tint)", border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)",
                  color: "var(--success)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                  whiteSpace: "nowrap", flexShrink: 0
                }}
              >
                {sections.indexOf(currentSection) < sections.length - 1 ? "Phần tiếp" : "Nộp Bài"}
              </button>
              <button
                type="button"
                className="exam-flag-btn"
                style={{ marginRight: "8px" }}
                aria-pressed={!!flags[`${currentSection}_${currentQuestion}`]}
                onClick={() => toggleFlag(`${currentSection}_${currentQuestion}`)}
                title="Đánh dấu câu này để quay lại xem trước khi nộp"
              >
                {flags[`${currentSection}_${currentQuestion}`] ? `Bỏ đánh dấu câu ${currentQuestion}` : `Đánh dấu câu ${currentQuestion}`}
              </button>
              {navNumbers(currentSection).map(n => (
                <button
                  key={n}
                  className={`exam-nav-btn ${getAnswer(currentSection, n) ? "answered" : ""} ${currentQuestion === n ? "current" : ""} ${flags[`${currentSection}_${n}`] ? "flagged" : ""}`}
                  onClick={() => setCurrentQuestion(n)}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setShowNav(false)}
                title="Ẩn thanh Navigation"
                style={{
                  padding: "6px 12px", borderRadius: "8px", marginLeft: "auto",
                  background: "var(--surface-sunken)", border: "1px solid var(--border-control)",
                  color: "var(--ink-muted)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px", flexShrink: 0,
                  transition: "all 0.15s ease"
                }}
              >
                 Ẩn Navigator
              </button>
            </div>
          )}

          {currentSection === "writing" && (
            <div className="exam-navigator" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setWritingTab("task1")}
                  className={`exam-nav-btn ${writingTab === "task1" ? "current" : ""} ${writingTask1 ? "answered" : ""}`}
                  style={{ width: "auto", padding: "0 12px", borderRadius: "8px" }}
                >Task 1</button>
                <button
                  onClick={() => setWritingTab("task2")}
                  className={`exam-nav-btn ${writingTab === "task2" ? "current" : ""} ${writingTask2 ? "answered" : ""}`}
                  style={{ width: "auto", padding: "0 12px", borderRadius: "8px" }}
                >Task 2</button>
              </div>
              <div style={{ color: "var(--ink-muted)", fontSize: "0.75rem" }}>
                Task 1: {writingTask1.split(/\s+/).filter(Boolean).length} từ | Task 2: {writingTask2.split(/\s+/).filter(Boolean).length} từ
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => nextSection()}
                  style={{
                    padding: "6px 14px", borderRadius: "8px",
                    background: "var(--success-tint)", border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)",
                    color: "var(--success)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer"
                  }}
                >
                  {sections.indexOf(currentSection) < sections.length - 1 ? "Phần tiếp" : "Nộp Bài"}
                </button>
                <button
                  onClick={() => setShowNav(false)}
                  title="Ẩn thanh Navigation"
                  style={{
                    padding: "6px 12px", borderRadius: "8px",
                    background: "var(--surface-sunken)", border: "1px solid var(--border-control)",
                    color: "var(--ink-muted)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "4px"
                  }}
                >
                   Ẩn Navigator
                </button>
              </div>
            </div>
          )}

          {currentSection === "speaking" && (
            <div className="exam-navigator" style={{ justifyContent: "center", gap: "16px" }}>
              {["part1", "part2", "part3"].map((p, i) => (
                <div key={p} style={{
                  padding: "4px 12px", borderRadius: "8px", fontSize: "0.72rem", fontWeight: 700,
                  background: speakingPart === p ? "var(--brand-tint)" : "transparent",
                  border: `1px solid ${speakingPart === p ? "var(--brand)" : "var(--ink-secondary)"}`,
                  color: speakingPart === p ? "var(--brand)" : "var(--ink-muted)",
                }}>
                  Part {i + 1}
                </div>
              ))}
              <button
                onClick={() => nextSection()}
                style={{
                  padding: "6px 14px", borderRadius: "8px", marginLeft: "16px",
                  background: "var(--success-tint)", border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)",
                  color: "var(--success)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer"
                }}
              >
                {sections.indexOf(currentSection) < sections.length - 1 ? "Phần tiếp" : "Nộp Bài"}
              </button>
              <button
                onClick={() => setShowNav(false)}
                title="Ẩn thanh Navigation"
                style={{
                  padding: "6px 12px", borderRadius: "8px", marginLeft: "auto",
                  background: "var(--surface-sunken)", border: "1px solid var(--border-control)",
                  color: "var(--ink-muted)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px"
                }}
              >
                 Ẩn Navigator
              </button>
            </div>
          )}
        </>
      ) : (
        <button
          onClick={() => setShowNav(true)}
          title="Hiện thanh Question Navigator"
          style={{
            position: "fixed",
            bottom: "16px",
            right: "24px",
            zIndex: 9999,
            padding: "8px 18px",
            borderRadius: "99px",
            background: "var(--surface)",
            border: "1.5px solid var(--brand)",
            color: "var(--brand)",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "var(--shadow-2)",
            transition: "all 0.2s ease"
          }}
        >
           Hiện Question Navigator ({answeredCount(currentSection, totalQs[currentSection] || 40)}/{totalQs[currentSection] || 40})
        </button>
      )}

      {roomMode === "practice" && (
        <ExamNotes notes={notes} onAdd={addNote} onRemove={removeNote} open={notesOpen} onOpenChange={setNotesOpen}
          quote={noteQuote} onQuoteUsed={() => setNoteQuote("")} />
      )}

      {/* ─── Submit Modal ─────────────────────────────────────── */}
      {showSubmitModal && (
        <div className="exam-modal-overlay">
          <div className="exam-modal">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                Nộp bài thi?
              </h3>
            </div>
            <p style={{ color: "var(--ink-muted)", fontSize: "0.88rem", marginBottom: "24px", lineHeight: 1.6 }}>
              Bạn có chắc muốn nộp bài thi không? Hành động này không thể hoàn tác.
              {Object.keys(flags).length > 0 && ` Bạn còn ${Object.keys(flags).length} câu đang được đánh dấu để xem lại.`}
            </p>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "28px" }}>
              {sections.includes("listening") && (
                <div style={{ background: "var(--surface-sunken)", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--brand)" }}>
                    {answeredCount("listening", totalQs.listening)}/{totalQs.listening}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>Listening</div>
                </div>
              )}
              {sections.includes("reading") && (
                <div style={{ background: "var(--surface-sunken)", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--brand)" }}>
                    {answeredCount("reading", totalQs.reading)}/{totalQs.reading}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>Reading</div>
                </div>
              )}
              {sections.includes("writing") && (
                <div style={{ background: "var(--surface-sunken)", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--brand)" }}>
                    {(writingTask1 ? 1 : 0) + (writingTask2 ? 1 : 0)}/2
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>Writing Tasks</div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                style={{
                  flex: 1, padding: "13px", borderRadius: "12px",
                  background: "var(--surface-sunken)", border: "1px solid var(--hairline)",
                  color: "var(--ink-muted)", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem"
                }}
              >Tiếp tục làm bài</button>
              <button
                onClick={() => handleSubmitExam(false)}
                disabled={submitLoading}
                style={{
                  flex: 1, padding: "13px", borderRadius: "12px",
                  background: "var(--danger)",
                  border: "none", color: "var(--on-brand)", cursor: "pointer",
                  fontWeight: 700, fontSize: "0.88rem",
                  opacity: submitLoading ? 0.7 : 1
                }}
              >
                {submitLoading ? "Đang nộp..." : "Nộp Bài Thi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Listening Section ───────────────────────────────────────
function ListeningSection({ questions, currentQ, answers, onAnswer, onNavigate, audioPlaying, audioProgress, onToggleAudio, onUpdateProgress, audioUrl, showNav }: any) {
  const [splitPercent, setSplitPercent] = useState(38);
  const [isDragging, setIsDragging] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioPlaying) audioRef.current?.play().catch((e) => console.error("Audio play error", e));
    else audioRef.current?.pause();
  }, [audioPlaying]);

  // Resizable drag handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      let newPercent = (offsetX / rect.width) * 100;
      if (newPercent < 20) newPercent = 20;
      if (newPercent > 70) newPercent = 70;
      setSplitPercent(newPercent);
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Scroll to current question
  useEffect(() => {
    if (currentQ) {
      const el = document.getElementById(`listening-q-${currentQ}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentQ]);

  const activeQ = questions[currentQ - 1];
  const currentPart = activeQ?.section || "Part 1";
  const parts = ["Part 1", "Part 2", "Part 3", "Part 4"];
  const partRange: Record<string, [number, number]> = {
    "Part 1": [1, 10], "Part 2": [11, 20], "Part 3": [21, 30], "Part 4": [31, 40]
  };

  const scrollToPart = (pName: string) => {
    const range = partRange[pName];
    if (range) {
      onNavigate(range[0]);
      const el = document.getElementById(`part-header-${pName.replace(/\s+/g, '-').toLowerCase()}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Helper to render question text with inline fill-in-the-blank input
  const renderQuestionText = (item: any) => {
    const qText = item.question || "";
    const isCompletion = item.type !== "multiple_choice";

    if (!isCompletion) {
      return (
        <span style={{ fontSize: "0.95rem", color: "var(--ink-secondary)", lineHeight: 1.7, fontWeight: 600 }}>
          {qText}
        </span>
      );
    }

    const hasBlank = qText.includes("___") || qText.includes("...");
    if (hasBlank) {
      const segments = qText.split(/(?:___|\.{3,})/);
      return (
        <span style={{ fontSize: "0.95rem", color: "var(--ink-secondary)", lineHeight: 1.8, fontWeight: 500 }}>
          {segments.map((segment: string, sIdx: number) => (
            <span key={sIdx}>
              {segment}
              {sIdx < segments.length - 1 && (
                <input
                  type="text"
                  className="exam-inline-fill-input"
                  value={answers[`listening_${item.number}`] || ""}
                  onChange={(e) => onAnswer("listening", item.number, e.target.value)}
                  onFocus={() => onNavigate(item.number)}
                  placeholder={`(${item.number}) ...`}
                />
              )}
            </span>
          ))}
        </span>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <span style={{ fontSize: "0.95rem", color: "var(--ink-secondary)", lineHeight: 1.7, fontWeight: 500 }}>
          {qText}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--brand)", background: "var(--brand-tint)", padding: "2px 8px", borderRadius: "4px" }}>
            Cầu {item.number}
          </span>
          <input
            type="text"
            className="exam-inline-fill-input"
            value={answers[`listening_${item.number}`] || ""}
            onChange={(e) => onAnswer("listening", item.number, e.target.value)}
            onFocus={() => onNavigate(item.number)}
            placeholder="Điền câu trả lời..."
            style={{ width: "240px", maxWidth: "100%" }}
          />
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="exam-listening-layout" style={{ userSelect: isDragging ? "none" : "auto", height: showNav ? "calc(100vh - 54px - 60px)" : "calc(100vh - 54px)" }}>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration && onUpdateProgress) {
              onUpdateProgress(el.currentTime / el.duration);
            }
          }}
          onEnded={() => onToggleAudio()}
        />
      )}

      {/* ─── Left Pane: Audio & Controls ─── */}
      {!leftCollapsed && (
        <div className="exam-audio-pane" style={{ width: `${splitPercent}%` }}>
          {/* Part Quick Indicator & Collapse Button */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {parts.map(p => (
                <button
                  key={p}
                  onClick={() => scrollToPart(p)}
                  style={{
                    padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700,
                    border: "none", cursor: "pointer", transition: "all 0.15s ease",
                    background: p === currentPart ? "var(--brand-hover)" : "var(--surface-sunken)",
                    color: p === currentPart ? "var(--on-brand)" : "var(--ink-muted)",
                    boxShadow: "none"
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setLeftCollapsed(true)}
              title="Ẩn khung Audio bên trái"
              style={{
                padding: "5px 10px", borderRadius: "6px",
                border: "1px solid var(--border-control)", background: "var(--surface)",
                color: "var(--ink-muted)", fontSize: "0.72rem", fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: "4px",
                boxShadow: "var(--shadow-sm, none)"
              }}
            >
               Ẩn khung trái
            </button>
          </div>

          {/* Audio Player Card */}
          <div className="audio-player-exam">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 700, letterSpacing: "0.08em" }}>
                IELTS LISTENING — {currentPart}
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--ink-muted)" }}>Computer-Delivered</span>
            </div>

            {/* Waveform Visual */}
            <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "40px", marginBottom: "14px" }}>
              {Array.from({ length: 45 }, (_, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: "2px",
                  height: `${16 + Math.sin(i * 0.5) * 16 + (i % 3) * 5}px`,
                  background: audioPlaying ? "var(--brand)" : "var(--ink-muted)",
                  transition: "background 0.3s, height 0.3s",
                  opacity: (i / 45) < audioProgress ? 1 : 0.35,
                }} />
              ))}
            </div>

            {/* Progress Bar */}
            <div style={{ height: 6, background: "var(--surface-sunken)", borderRadius: "9999px", marginBottom: "14px", cursor: "pointer" }}>
              <div style={{ width: `${audioProgress * 100}%`, height: "100%", background: "var(--brand)", borderRadius: "9999px", transition: "width 0.1s" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                onClick={onToggleAudio}
                style={{
                  padding: "10px 22px", borderRadius: "10px",
                  background: audioPlaying ? "var(--danger)" : "var(--brand)",
                  border: "none", color: "var(--on-brand)", cursor: "pointer",
                  fontWeight: 700, fontSize: "0.85rem",
                  display: "flex", alignItems: "center", gap: "8px",
                  boxShadow: "none"
                }}
              >
                {audioPlaying ? "Tạm Dừng Audio" : "Phát Audio Đề Thi"}
              </button>
              <span style={{ fontSize: "0.7rem", color: "var(--ink-muted)" }}>
                Phần nghe phát 1 lần
              </span>
            </div>
          </div>

          {/* Exam Guide */}
          <div style={{ background: "var(--surface-sunken)", borderRadius: "12px", padding: "16px", border: "1px solid var(--hairline)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Hướng dẫn làm bài Listening
            </div>
            <ul style={{ paddingLeft: "16px", margin: 0, fontSize: "0.8rem", color: "var(--ink-muted)", lineHeight: 1.6 }}>
              <li>Điền đáp án trực tiếp vào ô chỗ trống ở danh sách đề thi bên phải.</li>
              <li>Có thể di chuyển thanh kéo ngăn cách giữa 2 khung để mở rộng đề thi.</li>
              <li>Sử dụng thanh chuyển Part nhanh để xem 40 câu hỏi.</li>
            </ul>
          </div>

          {/* Prev / Next controls */}
          <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
            <button
              onClick={() => onNavigate(Math.max(1, currentQ - 1))}
              disabled={currentQ <= 1}
              style={{
                flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-control)",
                background: "var(--surface)", color: "var(--ink-secondary)", cursor: currentQ > 1 ? "pointer" : "not-allowed",
                fontWeight: 600, fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                opacity: currentQ <= 1 ? 0.4 : 1
              }}
            >
               Câu trước
            </button>
            <button
              onClick={() => onNavigate(Math.min(40, currentQ + 1))}
              disabled={currentQ >= 40}
              style={{
                flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-control)",
                background: "var(--surface)", color: "var(--ink-secondary)", cursor: currentQ < 40 ? "pointer" : "not-allowed",
                fontWeight: 600, fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                opacity: currentQ >= 40 ? 0.4 : 1
              }}
            >
              Câu sau 
            </button>
          </div>
        </div>
      )}

      {/* ─── Resizable Splitter Handle ─── */}
      {!leftCollapsed && (
        <div
          className={`exam-splitter-handle ${isDragging ? "dragging" : ""}`}
          onMouseDown={handleMouseDown}
          title="Kéo thả để điều chỉnh độ rộng giữa audio và đề thi"
        />
      )}

      {/* ─── Right Pane: Full 40 Questions List ─── */}
      <div className="exam-questions-pane" style={{ width: leftCollapsed ? "100%" : "auto" }}>
        {/* Sticky Part Switcher Header */}
        <div className="exam-part-header">
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {leftCollapsed && (
              <button
                onClick={() => setLeftCollapsed(false)}
                title="Hiện lại khung Audio bên trái"
                style={{
                  padding: "6px 14px", borderRadius: "8px",
                  border: "1.5px solid var(--brand)", background: "var(--brand-tint)",
                  color: "var(--brand)", fontSize: "0.75rem", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                  transition: "all 0.15s ease", 
                  marginRight: "6px"
                }}
              >
                 Hiện Audio & Trình phát (Bên trái)
              </button>
            )}
            {parts.map(p => (
              <button
                key={p}
                onClick={() => scrollToPart(p)}
                style={{
                  padding: "6px 14px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700,
                  border: `1.5px solid ${p === currentPart ? "var(--brand)" : "var(--border-control)"}`,
                  background: p === currentPart ? "var(--brand-tint)" : "var(--surface)",
                  color: p === currentPart ? "var(--brand-hover)" : "var(--ink-muted)",
                  cursor: "pointer", transition: "all 0.15s ease"
                }}
              >
                {p} (Q{partRange[p][0]}-{partRange[p][1]})
              </button>
            ))}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>
            Đang chọn: <span style={{ color: "var(--brand-hover)", fontWeight: 700 }}>Câu {currentQ} / 40</span>
          </div>
        </div>

        {/* Render all 4 Parts and Questions 1-40 */}
        {parts.map((pName) => {
          const [startQ, endQ] = partRange[pName];
          const partQuestions = questions.filter(
            (q: any) => q.number >= startQ && q.number <= endQ
          );
          if (partQuestions.length === 0) return null;

          return (
            <div key={pName} style={{ marginBottom: "32px" }}>
              {/* Part Header */}
              <div
                id={"part-header-" + pName.toLowerCase().replace(/\s+/g, "-")}
                style={{
                  background: "var(--navy)",
                  color: "var(--on-navy)",
                  padding: "12px 20px",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "none"
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                    IELTS LISTENING — {pName.toUpperCase()}
                  </h3>
                  <div style={{ fontSize: "0.75rem", opacity: 0.85, marginTop: "2px" }}>
                    Questions {startQ} - {endQ}
                  </div>
                </div>
                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: "6px" }}>
                  {endQ - startQ + 1} Questions
                </div>
              </div>

              {/* Questions List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {partQuestions.map((item: any, itemIdx: number) => {
                  const isCurrent = currentQ === item.number;
                  const hasAnswer = Boolean(answers[`listening_${item.number}`]);

                  return (
                    <Fragment key={item.number}>
                    <GroupHeader item={item} prev={partQuestions[itemIdx - 1]} />
                    <div
                      id={`listening-q-${item.number}`}
                      onClick={() => onNavigate(item.number)}
                      style={{
                        background: "var(--surface)",
                        border: `2px solid ${isCurrent ? "var(--brand)" : (hasAnswer ? "var(--brand)" : "var(--hairline)")}`,
                        borderRadius: "12px",
                        padding: "18px 22px",
                        transition: "all 0.2s ease",
                        boxShadow: "none"
                      }}
                    >
                      {/* Question Badge Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: isCurrent ? "var(--brand)" : (hasAnswer ? "var(--brand-hover)" : "var(--surface-sunken)"),
                            color: isCurrent || hasAnswer ? "var(--on-brand)" : "var(--ink-muted)",
                            fontSize: "0.8rem", fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            {item.number}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--ink-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {item.type === "multiple_choice" ? "Multiple Choice" : "Fill in the blank"}
                          </span>
                        </div>
                        {hasAnswer && (
                          <span style={{ fontSize: "0.7rem", color: "var(--success)", fontWeight: 700, background: "var(--success-tint)", padding: "2px 8px", borderRadius: "99px" }}>
                            Đã trả lời
                          </span>
                        )}
                      </div>

                      {/* Question Body & Fill-in Inputs */}
                      {renderQuestionText(item)}

                      {/* Multiple Choice Options */}
                      {item.type === "multiple_choice" && item.options && (
                        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {item.options.map((opt: string, optIdx: number) => {
                            const key = item.option_keys?.[optIdx] ?? opt[0];
                            const isSelected = answers[`listening_${item.number}`] === key;
                            return (
                              <button
                                key={optIdx}
                                className={`exam-option ${isSelected ? "selected" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAnswer("listening", item.number, key);
                                  onNavigate(item.number);
                                }}
                              >
                                <span className="exam-option-key">{key}</span>
                                <span>{String(opt).replace(/^[A-Za-z0-9]+\.\s+/, "")}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reading Section ─────────────────────────────────────────
function ReadingSection({ passage, readingPassages, questions, currentQ, answers, onAnswer, onNavigate, showNav }: any) {
  const [splitPercent, setSplitPercent] = useState(48);
  const [isDragging, setIsDragging] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [fontFamily, setFontFamily] = useState("Inter");
  const [activePassageTab, setActivePassageTab] = useState<"Passage 1" | "Passage 2" | "Passage 3" | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active Passage calculation
  const activeQ = questions[currentQ - 1];
  const autoPassageName = activeQ?.passage || (currentQ <= 13 ? "Passage 1" : currentQ <= 26 ? "Passage 2" : "Passage 3");
  const currentPassageName = activePassageTab || autoPassageName;

  const passageList = ["Passage 1", "Passage 2", "Passage 3"];
  const passageRange: Record<string, [number, number]> = {
    "Passage 1": [1, 13], "Passage 2": [14, 26], "Passage 3": [27, 40]
  };

  // Resolve passage text (server gửi mảng [{index,title,body_markdown}], demo cũ gửi {passage1,...})
  let currentPassageText = passage || "";
  if (Array.isArray(readingPassages)) {
    const byIndex = Number(currentPassageName.replace(/\D/g, ""));
    const found = readingPassages.find((p: any) => Number(p.index) === byIndex);
    if (found) currentPassageText = (found.title ? `**${found.title}**\n\n` : "") + found.body_markdown;
  } else if (readingPassages) {
    if (currentPassageName === "Passage 1" && readingPassages.passage1) currentPassageText = readingPassages.passage1;
    else if (currentPassageName === "Passage 2" && readingPassages.passage2) currentPassageText = readingPassages.passage2;
    else if (currentPassageName === "Passage 3" && readingPassages.passage3) currentPassageText = readingPassages.passage3;
  }

  // Resizable drag handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      let newPercent = (offsetX / rect.width) * 100;
      if (newPercent < 20) newPercent = 20;
      if (newPercent > 75) newPercent = 75;
      setSplitPercent(newPercent);
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Scroll to current question
  useEffect(() => {
    if (currentQ) {
      // Auto-update passage tab to match question
      const autoP = currentQ <= 13 ? "Passage 1" : currentQ <= 26 ? "Passage 2" : "Passage 3";
      setActivePassageTab(autoP);

      const el = document.getElementById(`reading-q-${currentQ}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentQ]);

  const scrollToPassage = (pName: string) => {
    setActivePassageTab(pName as any);
    const range = passageRange[pName];
    if (range) {
      onNavigate(range[0]);
      const el = document.getElementById(`passage-header-${pName.replace(/\s+/g, '-').toLowerCase()}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Helper to render question text with inline fill-in input
  const renderQuestionText = (item: any) => {
    const qText = item.question || "";
    const isCompletion = item.type === "sentence_completion" || item.type === "summary_completion" || item.type === "note_completion";

    if (!isCompletion) {
      return (
        <span style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily, color: "var(--ink-secondary)", lineHeight: 1.7, fontWeight: 600 }}>
          {qText}
        </span>
      );
    }

    const hasBlank = qText.includes("___") || qText.includes("...");
    if (hasBlank) {
      const segments = qText.split(/(?:___|\.{3,})/);
      return (
        <span style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily, color: "var(--ink-secondary)", lineHeight: 1.8, fontWeight: 500 }}>
          {segments.map((segment: string, sIdx: number) => (
            <span key={sIdx}>
              {segment}
              {sIdx < segments.length - 1 && (
                <input
                  type="text"
                  className="exam-inline-fill-input"
                  value={answers[`reading_${item.number}`] || ""}
                  onChange={(e) => onAnswer("reading", item.number, e.target.value)}
                  onFocus={() => onNavigate(item.number)}
                  placeholder={`(${item.number}) ...`}
                  style={{ fontSize: `${fontSize * 0.95}px` }}
                />
              )}
            </span>
          ))}
        </span>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <span style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily, color: "var(--ink-secondary)", lineHeight: 1.7, fontWeight: 500 }}>
          {qText}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--brand)", background: "var(--brand-tint)", padding: "2px 8px", borderRadius: "4px" }}>
            Câu {item.number}
          </span>
          <input
            type="text"
            className="exam-inline-fill-input"
            value={answers[`reading_${item.number}`] || ""}
            onChange={(e) => onAnswer("reading", item.number, e.target.value)}
            onFocus={() => onNavigate(item.number)}
            placeholder="Điền câu trả lời..."
            style={{ width: "240px", maxWidth: "100%", fontSize: `${fontSize * 0.95}px` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="exam-reading-layout" style={{ userSelect: isDragging ? "none" : "auto", height: showNav ? "calc(100vh - 54px - 60px)" : "calc(100vh - 54px)" }}>
      {/* ─── Left Pane: Reading Passage ─── */}
      {!leftCollapsed && (
        <div className="exam-passage-pane" style={{ width: `${splitPercent}%` }}>
          {/* Passage Switcher Tabs & Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-sunken)", padding: "10px 14px", borderRadius: "10px", marginBottom: "16px", border: "1px solid var(--hairline)", flexWrap: "wrap", gap: "8px" }}>
            {/* Passage Selector Buttons */}
            <div style={{ display: "flex", gap: "6px" }}>
              {passageList.map(p => (
                <button
                  key={p}
                  onClick={() => scrollToPassage(p)}
                  style={{
                    padding: "5px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700,
                    border: `1.5px solid ${p === currentPassageName ? "var(--brand)" : "var(--border-control)"}`,
                    background: p === currentPassageName ? "var(--brand-hover)" : "var(--surface)",
                    color: p === currentPassageName ? "var(--on-brand)" : "var(--ink-muted)",
                    cursor: "pointer", transition: "all 0.15s ease",
                    boxShadow: "none"
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Font Size & Family Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  onClick={() => setFontSize(s => Math.max(12, s - 1))}
                  title="Giảm cỡ chữ"
                  style={{ width: 26, height: 26, borderRadius: "6px", border: "1px solid var(--border-control)", background: "var(--surface)", cursor: "pointer", fontWeight: 700, fontSize: "0.75rem", color: "var(--ink-secondary)" }}
                >A-</button>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--brand-hover)", minWidth: "28px", textAlign: "center" }}>{fontSize}px</span>
                <button
                  onClick={() => setFontSize(s => Math.min(24, s + 1))}
                  title="Tăng cỡ chữ"
                  style={{ width: 26, height: 26, borderRadius: "6px", border: "1px solid var(--border-control)", background: "var(--surface)", cursor: "pointer", fontWeight: 700, fontSize: "0.75rem", color: "var(--ink-secondary)" }}
                >A+</button>
              </div>

              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border-control)", fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-secondary)", background: "var(--surface)", outline: "none" }}
              >
                <option value="Inter">Sans-Serif</option>
                <option value="Georgia">Georgia (Serif)</option>
                <option value="Times New Roman">Times New Roman</option>
              </select>

              <button
                onClick={() => setLeftCollapsed(true)}
                title="Ẩn khung bài đọc bên trái"
                style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border-control)", background: "var(--surface)", color: "var(--ink-muted)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                 Ẩn bài đọc
              </button>
            </div>
          </div>

          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--brand)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
            IELTS Academic Reading — {currentPassageName.toUpperCase()}
          </div>

          {/* Render passage text formatted with font size & family */}
          <div style={{ fontFamily: fontFamily, fontSize: `${fontSize}px`, lineHeight: 1.8, color: "var(--ink-secondary)" }}>
            {currentPassageText.split("\n\n").map((para: string, i: number) => (
              <p key={i} style={{
                marginBottom: "16px",
                fontWeight: para.startsWith("**") || para.startsWith("#") ? 700 : 400,
                color: para.startsWith("**") || para.startsWith("#") ? "var(--ink)" : "var(--ink-secondary)"
              }}>
                {para.replace(/[\*#]/g, "")}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ─── Resizable Splitter Handle ─── */}
      {!leftCollapsed && (
        <div
          className={`exam-splitter-handle ${isDragging ? "dragging" : ""}`}
          onMouseDown={handleMouseDown}
          title="Kéo thả để điều chỉnh độ rộng giữa bài đọc và câu hỏi"
        />
      )}

      {/* ─── Right Pane: Full 40 Questions List ─── */}
      <div className="exam-questions-pane" style={{ width: leftCollapsed ? "100%" : "auto" }}>
        {/* Sticky Passage Switcher Header */}
        <div className="exam-part-header">
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {leftCollapsed && (
              <button
                onClick={() => setLeftCollapsed(false)}
                title="Hiện lại khung bài đọc bên trái"
                style={{
                  padding: "6px 14px", borderRadius: "8px",
                  border: "1.5px solid var(--brand)", background: "var(--brand-tint)",
                  color: "var(--brand)", fontSize: "0.75rem", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                  transition: "all 0.15s ease", 
                  marginRight: "6px"
                }}
              >
                 Hiện khung bài đọc (Bên trái)
              </button>
            )}
            {passageList.map(p => (
              <button
                key={p}
                onClick={() => scrollToPassage(p)}
                style={{
                  padding: "6px 14px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700,
                  border: `1.5px solid ${p === currentPassageName ? "var(--brand)" : "var(--border-control)"}`,
                  background: p === currentPassageName ? "var(--brand-tint)" : "var(--surface)",
                  color: p === currentPassageName ? "var(--brand-hover)" : "var(--ink-muted)",
                  cursor: "pointer", transition: "all 0.15s ease"
                }}
              >
                {p} (Q{passageRange[p][0]}-{passageRange[p][1]})
              </button>
            ))}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 600 }}>
            Đang chọn: <span style={{ color: "var(--brand-hover)", fontWeight: 700 }}>Câu {currentQ} / 40</span>
          </div>
        </div>

        {/* Render all 3 Passages and Questions 1-40 */}
        {passageList.map((pName) => {
          const [startQ, endQ] = passageRange[pName];
          const passageQuestions = questions.filter(
            (q: any) => q.number >= startQ && q.number <= endQ
          );
          if (passageQuestions.length === 0) return null;

          return (
            <div key={pName} style={{ marginBottom: "32px" }}>
              {/* Passage Header Banner */}
              <div
                id={"passage-header-" + pName.toLowerCase().replace(/\s+/g, "-")}
                style={{
                  background: "var(--navy)",
                  color: "var(--on-navy)",
                  padding: "12px 20px",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "none"
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                    IELTS READING — {pName.toUpperCase()}
                  </h3>
                  <div style={{ fontSize: "0.75rem", opacity: 0.85, marginTop: "2px" }}>
                    Questions {startQ} - {endQ}
                  </div>
                </div>
                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "6px" }}>
                  {endQ - startQ + 1} Questions
                </div>
              </div>

              {/* Questions List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {passageQuestions.map((item: any, itemIdx: number) => {
                  const isCurrent = currentQ === item.number;
                  const hasAnswer = Boolean(answers[`reading_${item.number}`]);

                  return (
                    <Fragment key={item.number}>
                    <GroupHeader item={item} prev={passageQuestions[itemIdx - 1]} />
                    <div
                      id={`reading-q-${item.number}`}
                      onClick={() => onNavigate(item.number)}
                      style={{
                        background: "var(--surface)",
                        border: `2px solid ${isCurrent ? "var(--brand)" : (hasAnswer ? "var(--brand)" : "var(--hairline)")}`,
                        borderRadius: "12px",
                        padding: "18px 22px",
                        transition: "all 0.2s ease",
                        boxShadow: "none"
                      }}
                    >
                      {/* Question Badge Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: isCurrent ? "var(--brand)" : (hasAnswer ? "var(--success)" : "var(--surface-sunken)"),
                            color: isCurrent || hasAnswer ? "var(--on-brand)" : "var(--ink-muted)",
                            fontSize: "0.8rem", fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            {item.number}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--ink-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {item.type === "multiple_choice" ? "Multiple Choice" : (item.type === "true_false_ng" ? "True / False / Not Given" : "Fill in the blank")}
                          </span>
                        </div>
                        {hasAnswer && (
                          <span style={{ fontSize: "0.7rem", color: "var(--success)", fontWeight: 700, background: "var(--success-tint)", padding: "2px 8px", borderRadius: "99px" }}>
                            Đã trả lời
                          </span>
                        )}
                      </div>

                      {/* Question Body & Fill-in Inputs */}
                      {renderQuestionText(item)}

                      {/* Multiple Choice Options */}
                      {item.type === "multiple_choice" && item.options && (
                        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {item.options.map((opt: string, optIdx: number) => {
                            const key = item.option_keys?.[optIdx] ?? opt[0];
                            const isSelected = answers[`reading_${item.number}`] === key;
                            return (
                              <button
                                key={optIdx}
                                className={`exam-option ${isSelected ? "selected" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAnswer("reading", item.number, key);
                                  onNavigate(item.number);
                                }}
                              >
                                <span className="exam-option-key">{key}</span>
                                <span>{String(opt).replace(/^[A-Za-z0-9]+\.\s+/, "")}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* True / False / Not Given Options */}
                      {item.type === "true_false_ng" && (
                        <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          {(Array.isArray(item.options) && item.options.length ? item.options : ["TRUE", "FALSE", "NOT GIVEN"]).map((opt: string) => {
                            const isSelected = answers[`reading_${item.number}`] === opt;
                            return (
                              <button
                                key={opt}
                                className={`exam-option ${isSelected ? "selected" : ""}`}
                                style={{ flex: 1, minWidth: "100px", justifyContent: "center", padding: "10px 14px", marginBottom: 0 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAnswer("reading", item.number, opt);
                                  onNavigate(item.number);
                                }}
                              >
                                <span className="exam-option-key" style={{ width: "auto", padding: "0 8px", borderRadius: "6px" }}>{opt[0]}</span>
                                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Writing Section ─────────────────────────────────────────
function WritingSection({ task1Prompt, task2Prompt, task1Text, task2Text, onTask1Change, onTask2Change, activeTab, onTabChange, task1Image, task1MinWords, task2MinWords }: any) {
  const isTask1 = activeTab === "task1";
  const prompt = isTask1 ? task1Prompt : task2Prompt;
  const text = isTask1 ? task1Text : task2Text;
  const onChange = isTask1 ? onTask1Change : onTask2Change;
  const minWords = isTask1 ? (task1MinWords || 150) : (task2MinWords || 250);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const wordStatus = wordCount < minWords * 0.6 ? "danger" : wordCount < minWords ? "warning" : "ok";

  return (
    <div className="exam-writing-layout">
      {/* Left — Prompt */}
      <div className="exam-prompt-pane">
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            {["task1", "task2"].map(t => (
              <button key={t} onClick={() => onTabChange(t)} style={{
                padding: "6px 14px", borderRadius: "8px", border: "1.5px solid",
                borderColor: activeTab === t ? "var(--brand)" : "var(--hairline)",
                background: activeTab === t ? "var(--brand-tint)" : "var(--surface)",
                color: activeTab === t ? "var(--brand-hover)" : "var(--ink-muted)",
                cursor: "pointer", fontWeight: 700, fontSize: "0.8rem"
              }}>
                {t === "task1" ? "Task 1" : "Task 2"}
              </button>
            ))}
          </div>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
            {isTask1 ? "Task 1 — Summarise the graph" : "Task 2 — Essay"}
          </div>
        </div>
        {isTask1 && task1Image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={task1Image} alt="Hình của đề Writing Task 1" style={{ maxWidth: "100%", borderRadius: "10px", marginBottom: "14px", border: "1px solid var(--hairline)" }} />
        )}
        {prompt.split("\n\n").map((para: string, i: number) => (
          <p key={i} style={{ marginBottom: "12px", fontSize: "0.88rem", color: "var(--ink-secondary)", lineHeight: 1.7 }}>
            {para}
          </p>
        ))}
        <div style={{ marginTop: "20px", padding: "12px", borderRadius: "10px", background: "var(--success-tint)", border: "1px solid var(--success)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--success)", fontWeight: 700 }}>
            Yêu cầu tối thiểu: {minWords} từ
          </div>
        </div>
      </div>

      {/* Right — Editor */}
      <div className="exam-editor-pane">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {isTask1 ? "Task 1" : "Task 2"} — Bài viết
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontSize: "0.78rem", fontWeight: 700,
              color: wordStatus === "ok" ? "var(--success)" : wordStatus === "warning" ? "var(--warning)" : "var(--danger)"
            }}>
              {wordCount} từ {wordCount < minWords && `(cần thêm ${minWords - wordCount})`}
            </span>
          </div>
        </div>

        <textarea
          className="exam-writing-editor"
          value={text}
          onChange={e => onChange(e.target.value)}
          placeholder={`Viết ${isTask1 ? "Task 1" : "Task 2"} ở đây. Không có autocomplete, không có gợi ý AI. Bắt đầu viết...`}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />

        {/* Word count bar */}
        <div style={{ marginTop: "8px" }}>
          <div style={{ height: 4, background: "var(--hairline)", borderRadius: "9999px", overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, (wordCount / (minWords * 1.5)) * 100)}%`,
              height: "100%", borderRadius: "9999px",
              background: wordStatus === "ok" ? "var(--success)" : wordStatus === "warning" ? "var(--warning)" : "var(--danger)",
              transition: "width 0.3s ease"
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
            <span style={{ fontSize: "0.65rem", color: "var(--ink-muted)" }}>0</span>
            <span style={{ fontSize: "0.65rem", color: "var(--ink-muted)" }}>{minWords} (min)</span>
            <span style={{ fontSize: "0.65rem", color: "var(--ink-muted)" }}>{Math.round(minWords * 1.5)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Speaking Section ────────────────────────────────────────
function SpeakingSection({ flow, part, qIdx, phase, timer, isRecording, onNextQ, onRecord, onPhaseChange }: any) {
  const partData = flow[part];
  const currentQ = partData?.questions?.[qIdx] || partData?.cue_card || "";

  return (
    <div className="exam-speaking-layout">
      {/* Examiner */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink-secondary)", fontFamily: "inherit" }}>Alex — IELTS Examiner</div>
          <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>{partData?.title || "Speaking"}</div>
        </div>
      </div>

      {/* Question Bubble */}
      <div className="speaking-question-bubble" style={{ maxWidth: "640px" }}>
        {phase === "prep" ? (
          <>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--brand)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Cue Card — 1 phút chuẩn bị
            </div>
            {currentQ.split("\n").map((line: string, i: number) => (
              <p key={i} style={{ marginBottom: "6px", fontWeight: line.startsWith("•") ? 400 : line.startsWith("**") ? 700 : 400 }}>
                {line.replace(/\*\*/g, "")}
              </p>
            ))}
          </>
        ) : phase === "done" ? (
          <p style={{ color: "var(--success)", fontWeight: 700 }}>Bài Speaking đã hoàn thành. Cảm ơn bạn.</p>
        ) : (
          <p style={{ fontSize: "1rem", lineHeight: 1.65 }}>{currentQ}</p>
        )}
      </div>

      {/* Timer + Controls */}
      {phase === "prep" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div className="speaking-timer-ring" style={{ animation: "spin 60s linear" }}>
            1:00
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--ink-muted)" }}>Chuẩn bị trong 1 phút</p>
          <button
            onClick={() => onPhaseChange("speaking")}
            style={{
              padding: "12px 28px", borderRadius: "12px",
              background: "var(--danger)",
              border: "none", color: "var(--on-brand)", cursor: "pointer",
              fontWeight: 700, fontSize: "0.9rem",
              display: "flex", alignItems: "center", gap: "8px"
            }}
          >
             Bắt Đầu Nói (2 phút)
          </button>
        </div>
      )}

      {phase === "question" && (
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button aria-label="Ghi âm"
            onClick={onRecord}
            className={isRecording ? "mic-recording" : ""}
            style={!isRecording ? {
              width: 72, height: 72, borderRadius: "50%",
              background: "var(--ink-muted)", border: "none", color: "var(--on-brand)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
            } : {}}
          >{isRecording ? <Square size={24} strokeWidth={2} fill="currentColor" /> : <Mic size={28} strokeWidth={1.75} />}</button>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--ink-secondary)", fontWeight: 600 }}>
              {isRecording ? "Đang ghi âm..." : "Nhấn để bắt đầu trả lời"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", marginTop: "2px" }}>
              Trả lời xong, nhấn Câu tiếp theo
            </div>
          </div>
          <button
            onClick={onNextQ}
            style={{
              padding: "10px 20px", borderRadius: "10px", marginLeft: "16px",
              background: "var(--brand)", border: "none", color: "var(--on-brand)",
              cursor: "pointer", fontWeight: 700, fontSize: "0.82rem",
              display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            Câu tiếp 
          </button>
        </div>
      )}

      {phase === "speaking" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div className="mic-recording" onClick={onRecord}>
          </div>
          <div style={{ fontWeight: 700, color: "var(--danger)", fontSize: "0.9rem" }}>Đang ghi âm — 2 phút</div>
          <button
            onClick={() => { onPhaseChange("question"); onNextQ(); }}
            style={{
              padding: "10px 24px", borderRadius: "10px",
              background: "var(--brand)", border: "none", color: "var(--on-brand)",
              cursor: "pointer", fontWeight: 700, fontSize: "0.85rem"
            }}
          >
            Hoàn thành Part 2
          </button>
        </div>
      )}
    </div>
  );
}
