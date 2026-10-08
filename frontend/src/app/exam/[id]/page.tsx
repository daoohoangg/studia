"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Volume2, Mic, MicOff, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, EyeOff, Send, AlertTriangle } from "lucide-react";
import ExamTimer from "@/components/ExamTimer";
import cambridge21Test1 from "@/data/cambridge21_test1.json";
import cambridge21Test2 from "@/data/cambridge21_test2.json";
import cambridge21Test3 from "@/data/cambridge21_test3.json";
import cambridge21Test4 from "@/data/cambridge21_test4.json";

const API = "http://localhost:8000/api/v1";

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
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#e2e8f0" }}>
        <div>Đang tải phòng thi...</div>
      </div>
    }>
      <ExamSessionContent />
    </Suspense>
  );
}

function ExamSessionContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const isDemoMode = sessionId === "demo";
  const demoType = searchParams.get("type") || "full";

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

  // ─── Load Exam Data ──────────────────────────────────────────
  useEffect(() => {
    const loadExam = async () => {
      if (isDemoMode) {
        // Build demo session
        const isCam21 = demoType.startsWith("cambridge21");
        const demoSections = (demoType === "full" || isCam21)
          ? ["listening", "reading", "writing", "speaking"]
          : [demoType];

        let srcData: any;
        if (demoType === "cambridge21_test1") srcData = cambridge21Test1;
        else if (demoType === "cambridge21_test2") srcData = cambridge21Test2;
        else if (demoType === "cambridge21_test3") srcData = cambridge21Test3;
        else if (demoType === "cambridge21_test4") srcData = cambridge21Test4;
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
              listening: 1800, reading: 3600, writing: 3600, speaking: 900
            },
            audio_url: isCam21 ? srcData.listening_audio : undefined
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
        const res = await fetch(`${API}/exam/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exam_type: "full" }),
        });
        if (res.ok) {
          const data = await res.json();
          setExamData(data);
          setCurrentSection(data.session.section_order[0]);
        }
      } catch {
        // Use demo data on error
        setExamData({
          session: {
            session_id: sessionId,
            exam_type: "full",
            sections: ["listening", "reading", "writing", "speaking"],
            section_order: ["listening", "reading", "writing", "speaking"],
            section_durations: { listening: 1800, reading: 3600, writing: 3600, speaking: 900 },
          },
          questions: {
            listening: DEMO_LISTENING,
            reading: DEMO_READING,
            reading_passage: DEMO_READING_PASSAGE,
            writing_task1: "Summarise the graph information. Write at least 150 words.",
            writing_task2: "Write about the given topic. Write at least 250 words.",
            speaking: SPEAKING_FLOW,
          },
        });
        setCurrentSection("listening");
      } finally {
        setLoading(false);
        document.body.classList.add("exam-mode");
      }
    };
    loadExam();
    return () => { document.body.classList.remove("exam-mode"); };
  }, [sessionId, isDemoMode, demoType]);

  // Autosave writing
  useEffect(() => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      // Could POST to backend for real autosave
    }, 3000);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
  }, [writingTask1, writingTask2]);

  const handleAutoSubmit = useCallback(() => {
    setStatus("AUTO_SUBMITTED");
    handleSubmitExam(true);
  }, []);

  const handleSubmitExam = async (auto = false) => {
    setSubmitLoading(true);
    const allAnswers = {
      ...answers,
      writing_task1: writingTask1,
      writing_task1_words: writingTask1.split(/\s+/).filter(Boolean).length,
      writing_task2: writingTask2,
      writing_task2_words: writingTask2.split(/\s+/).filter(Boolean).length,
    };

    try {
      const res = await fetch(`${API}/exam/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, auto_submitted: auto, answers: allAnswers }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        // Demo result
        setResult(generateDemoResult(allAnswers, sections));
      }
    } catch {
      setResult(generateDemoResult(allAnswers, sections));
    } finally {
      setSubmitLoading(false);
      setShowSubmitModal(false);
      setStatus(auto ? "AUTO_SUBMITTED" : "SUBMITTED");
      document.body.classList.remove("exam-mode");
    }
  };

  const generateDemoResult = (ans: Record<string, any>, secs: string[]) => {
    const lisRaw = Math.floor(Math.random() * 15) + 20;
    const readRaw = Math.floor(Math.random() * 15) + 22;
    const lisBand = lisRaw >= 35 ? 8.0 : lisRaw >= 30 ? 7.0 : lisRaw >= 23 ? 6.0 : 5.0;
    const readBand = readRaw >= 35 ? 8.0 : readRaw >= 30 ? 7.0 : readRaw >= 23 ? 6.0 : 5.0;
    const writBand = 6.5;
    const speakBand = 6.5;
    const scores = secs.map(s => s === "listening" ? lisBand : s === "reading" ? readBand : s === "writing" ? writBand : speakBand);
    const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 2) / 2;
    return {
      overall_band: overall,
      section_results: {
        listening: secs.includes("listening") ? { raw_score: lisRaw, band: lisBand } : null,
        reading: secs.includes("reading") ? { raw_score: readRaw, band: readBand } : null,
        writing: secs.includes("writing") ? { band: writBand, task1_band: 6.5, task2_band: 6.5 } : null,
        speaking: secs.includes("speaking") ? { band: speakBand } : null,
      },
      ai_analysis: {
        current_band: overall,
        target_band: Math.min(9.0, overall + 1.0),
        strengths: ["Hoàn thành bài thi đúng thời gian", "Trả lời đầy đủ các câu hỏi"],
        weaknesses: ["Listening Part 3 — cần luyện nghe thêm", "Reading — Matching Headings cần cải thiện"],
        priority_areas: [
          { area: "Listening — Multiple Choice", action: "Luyện 20 câu mỗi ngày" },
          { area: "Reading — Matching Headings", action: "Đọc 1 passage mỗi ngày" },
          { area: "Writing — Task Response", action: "Viết 2 bài Task 2 mỗi tuần" },
        ],
        study_plan: {
          week1: ["Ôn Listening Part 3 & 4", "Đọc 3 passages Reading", "Viết 1 Task 1"],
          week2: ["Luyện Multiple Choice", "Matching Headings", "Viết 1 Task 2"],
          week3: ["Full Mock Test", "Review lỗi sai", "Speaking Part 2"],
        },
      },
      answered_count: Object.keys(ans).filter(k => ans[k]).length,
    };
  };

  const setAnswer = (section: Section, num: number, val: any) => {
    setAnswers(prev => ({ ...prev, [`${section}_${num}`]: val }));
  };

  const getAnswer = (section: Section, num: number) => answers[`${section}_${num}`];

  const answeredCount = (section: Section, total: number) =>
    Array.from({ length: total }, (_, i) => i + 1).filter(n => answers[`${section}_${n}`]).length;

  const nextSection = () => {
    const idx = sections.indexOf(currentSection);
    if (idx < sections.length - 1) {
      setSectionDone(prev => [...prev, currentSection]);
      setCurrentSection(sections[idx + 1]);
      setCurrentQuestion(1);
    } else {
      setShowSubmitModal(true);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px", color: "#e2e8f0" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #334155", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p style={{ fontSize: "0.9rem", color: "#64748b" }}>Đang tải phòng thi IELTS...</p>
    </div>
  );

  // ─── Result Screen ───────────────────────────────────────────
  if (result) return <ResultScreen result={result} sections={sections} onRetry={() => router.push("/exam")} />;

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

  const totalQs: Record<Section, number> = {
    listening: 40, reading: 40, writing: 2, speaking: 3
  };

  return (
    <div style={{ background: "#f5f5f0", minHeight: "100vh" }}>
      {/* ─── Exam Header ─────────────────────────────────────── */}
      <div className="exam-header">
        <span className="exam-header-brand">IELTS Mock Test</span>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: "4px" }}>
          {sections.map(sec => (
            <div key={sec} style={{
              padding: "5px 12px",
              borderRadius: "8px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: sec === currentSection ? "#1e40af" : (sectionDone.includes(sec) ? "#065f46" : "transparent"),
              color: sec === currentSection ? "#fff" : (sectionDone.includes(sec) ? "#34d399" : "#64748b"),
              border: `1px solid ${sec === currentSection ? "#3b82f6" : "transparent"}`,
              letterSpacing: "0.05em",
              textTransform: "capitalize",
              cursor: "default",
            }}>
              {sectionDone.includes(sec) && "✓ "}{sectionLabel[sec]}
            </div>
          ))}
        </div>

        {/* Timer + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <ExamTimer
            key={currentSection}
            initialSeconds={sectionDuration}
            onExpire={() => {
              if (sections.indexOf(currentSection) < sections.length - 1) {
                nextSection();
              } else {
                handleAutoSubmit();
              }
            }}
          />
          <button
            onClick={() => setShowSubmitModal(true)}
            style={{
              padding: "7px 16px", borderRadius: "8px",
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
              color: "#f87171", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            Nộp Bài
          </button>
        </div>
      </div>

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
                  background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)",
                  color: "#34d399", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                  whiteSpace: "nowrap", flexShrink: 0
                }}
              >
                {sections.indexOf(currentSection) < sections.length - 1 ? "Phần tiếp →" : "Nộp Bài"}
              </button>
              {Array.from({ length: 40 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={`exam-nav-btn ${getAnswer(currentSection, n) ? "answered" : ""} ${currentQuestion === n ? "current" : ""}`}
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
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
                  color: "#94a3b8", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px", flexShrink: 0,
                  transition: "all 0.15s ease"
                }}
              >
                <ChevronDown size={14} /> Ẩn Navigator
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
              <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
                Task 1: {writingTask1.split(/\s+/).filter(Boolean).length} từ | Task 2: {writingTask2.split(/\s+/).filter(Boolean).length} từ
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => nextSection()}
                  style={{
                    padding: "6px 14px", borderRadius: "8px",
                    background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)",
                    color: "#34d399", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer"
                  }}
                >
                  {sections.indexOf(currentSection) < sections.length - 1 ? "Phần tiếp →" : "Nộp Bài"}
                </button>
                <button
                  onClick={() => setShowNav(false)}
                  title="Ẩn thanh Navigation"
                  style={{
                    padding: "6px 12px", borderRadius: "8px",
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
                    color: "#94a3b8", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "4px"
                  }}
                >
                  <ChevronDown size={14} /> Ẩn Navigator
                </button>
              </div>
            </div>
          )}

          {currentSection === "speaking" && (
            <div className="exam-navigator" style={{ justifyContent: "center", gap: "16px" }}>
              {["part1", "part2", "part3"].map((p, i) => (
                <div key={p} style={{
                  padding: "4px 12px", borderRadius: "8px", fontSize: "0.72rem", fontWeight: 700,
                  background: speakingPart === p ? "rgba(99,102,241,0.3)" : "transparent",
                  border: `1px solid ${speakingPart === p ? "rgba(99,102,241,0.6)" : "#374151"}`,
                  color: speakingPart === p ? "#a5b4fc" : "#64748b",
                }}>
                  Part {i + 1}
                </div>
              ))}
              <button
                onClick={() => nextSection()}
                style={{
                  padding: "6px 14px", borderRadius: "8px", marginLeft: "16px",
                  background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)",
                  color: "#34d399", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer"
                }}
              >
                {sections.indexOf(currentSection) < sections.length - 1 ? "Phần tiếp →" : "Nộp Bài"}
              </button>
              <button
                onClick={() => setShowNav(false)}
                title="Ẩn thanh Navigation"
                style={{
                  padding: "6px 12px", borderRadius: "8px", marginLeft: "auto",
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
                  color: "#94a3b8", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px"
                }}
              >
                <ChevronDown size={14} /> Ẩn Navigator
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
            background: "#1a1a2e",
            border: "1.5px solid #3b82f6",
            color: "#60a5fa",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            transition: "all 0.2s ease"
          }}
        >
          <ChevronUp size={14} /> Hiện Question Navigator ({answeredCount(currentSection, totalQs[currentSection] || 40)}/{totalQs[currentSection] || 40})
        </button>
      )}

      {/* ─── Submit Modal ─────────────────────────────────────── */}
      {showSubmitModal && (
        <div className="exam-modal-overlay">
          <div className="exam-modal">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <AlertTriangle size={22} color="#f59e0b" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>
                Nộp Bài Thi?
              </h3>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginBottom: "24px", lineHeight: 1.6 }}>
              Bạn có chắc muốn nộp bài thi không? Hành động này không thể hoàn tác.
            </p>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "28px" }}>
              {sections.includes("listening") && (
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#6366f1" }}>
                    {answeredCount("listening", 40)}/40
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Listening</div>
                </div>
              )}
              {sections.includes("reading") && (
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#6366f1" }}>
                    {answeredCount("reading", 40)}/40
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Reading</div>
                </div>
              )}
              {sections.includes("writing") && (
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "14px", borderRadius: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#6366f1" }}>
                    {(writingTask1 ? 1 : 0) + (writingTask2 ? 1 : 0)}/2
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Writing Tasks</div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                style={{
                  flex: 1, padding: "13px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#94a3b8", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem"
                }}
              >Tiếp tục làm bài</button>
              <button
                onClick={() => handleSubmitExam(false)}
                disabled={submitLoading}
                style={{
                  flex: 1, padding: "13px", borderRadius: "12px",
                  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                  border: "none", color: "#fff", cursor: "pointer",
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
        <span style={{ fontSize: "0.95rem", color: "#1f2937", lineHeight: 1.7, fontWeight: 600 }}>
          {qText}
        </span>
      );
    }

    const hasBlank = qText.includes("___") || qText.includes("...");
    if (hasBlank) {
      const segments = qText.split(/(?:___|\.{3,})/);
      return (
        <span style={{ fontSize: "0.95rem", color: "#1f2937", lineHeight: 1.8, fontWeight: 500 }}>
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
        <span style={{ fontSize: "0.95rem", color: "#1f2937", lineHeight: 1.7, fontWeight: 500 }}>
          {qText}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2563eb", background: "#dbeafe", padding: "2px 8px", borderRadius: "4px" }}>
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
                    background: p === currentPart ? "#1e40af" : "#f1f5f9",
                    color: p === currentPart ? "#fff" : "#64748b",
                    boxShadow: p === currentPart ? "0 2px 8px rgba(30,64,175,0.3)" : "none"
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
                border: "1px solid #cbd5e1", background: "#fff",
                color: "#475569", fontSize: "0.72rem", fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: "4px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}
            >
              <ChevronLeft size={14} /> Ẩn khung trái
            </button>
          </div>

          {/* Audio Player Card */}
          <div className="audio-player-exam">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.08em" }}>
                IELTS LISTENING — {currentPart}
              </span>
              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Computer-Delivered</span>
            </div>

            {/* Waveform Visual */}
            <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "40px", marginBottom: "14px" }}>
              {Array.from({ length: 45 }, (_, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: "2px",
                  height: `${16 + Math.sin(i * 0.5) * 16 + (i % 3) * 5}px`,
                  background: audioPlaying ? "#3b82f6" : "#475569",
                  transition: "background 0.3s, height 0.3s",
                  opacity: (i / 45) < audioProgress ? 1 : 0.35,
                }} />
              ))}
            </div>

            {/* Progress Bar */}
            <div style={{ height: 6, background: "#334155", borderRadius: "9999px", marginBottom: "14px", cursor: "pointer" }}>
              <div style={{ width: `${audioProgress * 100}%`, height: "100%", background: "#3b82f6", borderRadius: "9999px", transition: "width 0.1s" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                onClick={onToggleAudio}
                style={{
                  padding: "10px 22px", borderRadius: "10px",
                  background: audioPlaying ? "#dc2626" : "#1d4ed8",
                  border: "none", color: "#fff", cursor: "pointer",
                  fontWeight: 700, fontSize: "0.85rem",
                  display: "flex", alignItems: "center", gap: "8px",
                  boxShadow: audioPlaying ? "0 4px 14px rgba(220,38,38,0.4)" : "0 4px 14px rgba(29,78,216,0.4)"
                }}
              >
                {audioPlaying ? "⏸ Tạm Dừng Audio" : "▶ Phát Audio Đề Thi"}
              </button>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                Phần nghe phát 1 lần
              </span>
            </div>
          </div>

          {/* Exam Guide */}
          <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              💡 Hướng dẫn làm bài Listening
            </div>
            <ul style={{ paddingLeft: "16px", margin: 0, fontSize: "0.8rem", color: "#64748b", lineHeight: 1.6 }}>
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
                flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1",
                background: "#fff", color: "#334155", cursor: currentQ > 1 ? "pointer" : "not-allowed",
                fontWeight: 600, fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                opacity: currentQ <= 1 ? 0.4 : 1
              }}
            >
              <ChevronLeft size={14} /> Câu trước
            </button>
            <button
              onClick={() => onNavigate(Math.min(40, currentQ + 1))}
              disabled={currentQ >= 40}
              style={{
                flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1",
                background: "#fff", color: "#334155", cursor: currentQ < 40 ? "pointer" : "not-allowed",
                fontWeight: 600, fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                opacity: currentQ >= 40 ? 0.4 : 1
              }}
            >
              Câu sau <ChevronRight size={14} />
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
                  border: "1.5px solid #2563eb", background: "#eff6ff",
                  color: "#1d4ed8", fontSize: "0.75rem", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                  transition: "all 0.15s ease", boxShadow: "0 2px 8px rgba(37,99,235,0.15)",
                  marginRight: "6px"
                }}
              >
                <ChevronRight size={14} /> Hiện Audio & Trình phát (Bên trái)
              </button>
            )}
            {parts.map(p => (
              <button
                key={p}
                onClick={() => scrollToPart(p)}
                style={{
                  padding: "6px 14px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700,
                  border: `1.5px solid ${p === currentPart ? "#2563eb" : "#cbd5e1"}`,
                  background: p === currentPart ? "#dbeafe" : "#fff",
                  color: p === currentPart ? "#1e40af" : "#475569",
                  cursor: "pointer", transition: "all 0.15s ease"
                }}
              >
                {p} (Q{partRange[p][0]}-{partRange[p][1]})
              </button>
            ))}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
            Đang chọn: <span style={{ color: "#1e40af", fontWeight: 800 }}>Câu {currentQ} / 40</span>
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
                  background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 12px rgba(30,58,138,0.2)"
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>
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
                {partQuestions.map((item: any) => {
                  const isCurrent = currentQ === item.number;
                  const hasAnswer = Boolean(answers[`listening_${item.number}`]);

                  return (
                    <div
                      key={item.number}
                      id={`listening-q-${item.number}`}
                      onClick={() => onNavigate(item.number)}
                      style={{
                        background: "#fff",
                        border: `2px solid ${isCurrent ? "#2563eb" : (hasAnswer ? "#93c5fd" : "#e2e8f0")}`,
                        borderRadius: "14px",
                        padding: "18px 22px",
                        transition: "all 0.2s ease",
                        boxShadow: isCurrent ? "0 4px 16px rgba(37,99,235,0.15)" : "0 1px 3px rgba(0,0,0,0.04)"
                      }}
                    >
                      {/* Question Badge Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: isCurrent ? "#2563eb" : (hasAnswer ? "#1e40af" : "#f1f5f9"),
                            color: isCurrent || hasAnswer ? "#fff" : "#475569",
                            fontSize: "0.8rem", fontWeight: 800,
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            {item.number}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {item.type === "multiple_choice" ? "Multiple Choice" : "Fill in the blank"}
                          </span>
                        </div>
                        {hasAnswer && (
                          <span style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 700, background: "#dcfce7", padding: "2px 8px", borderRadius: "99px" }}>
                            ✓ Đã trả lời
                          </span>
                        )}
                      </div>

                      {/* Question Body & Fill-in Inputs */}
                      {renderQuestionText(item)}

                      {/* Multiple Choice Options */}
                      {item.type === "multiple_choice" && item.options && (
                        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {item.options.map((opt: string, optIdx: number) => {
                            const key = opt[0];
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
                                <span>{opt.substring(3)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
  const [fontFamily, setFontFamily] = useState("Plus Jakarta Sans");
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

  // Resolve passage text
  let currentPassageText = passage || "";
  if (readingPassages) {
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
        <span style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily, color: "#1f2937", lineHeight: 1.7, fontWeight: 600 }}>
          {qText}
        </span>
      );
    }

    const hasBlank = qText.includes("___") || qText.includes("...");
    if (hasBlank) {
      const segments = qText.split(/(?:___|\.{3,})/);
      return (
        <span style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily, color: "#1f2937", lineHeight: 1.8, fontWeight: 500 }}>
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
        <span style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily, color: "#1f2937", lineHeight: 1.7, fontWeight: 500 }}>
          {qText}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2563eb", background: "#dbeafe", padding: "2px 8px", borderRadius: "4px" }}>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", marginBottom: "16px", border: "1px solid #e2e8f0", flexWrap: "wrap", gap: "8px" }}>
            {/* Passage Selector Buttons */}
            <div style={{ display: "flex", gap: "6px" }}>
              {passageList.map(p => (
                <button
                  key={p}
                  onClick={() => scrollToPassage(p)}
                  style={{
                    padding: "5px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700,
                    border: `1.5px solid ${p === currentPassageName ? "#2563eb" : "#cbd5e1"}`,
                    background: p === currentPassageName ? "#1e40af" : "#fff",
                    color: p === currentPassageName ? "#fff" : "#475569",
                    cursor: "pointer", transition: "all 0.15s ease",
                    boxShadow: p === currentPassageName ? "0 2px 8px rgba(30,64,175,0.3)" : "none"
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
                  style={{ width: 26, height: 26, borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 800, fontSize: "0.75rem", color: "#334155" }}
                >A-</button>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e40af", minWidth: "28px", textAlign: "center" }}>{fontSize}px</span>
                <button
                  onClick={() => setFontSize(s => Math.min(24, s + 1))}
                  title="Tăng cỡ chữ"
                  style={{ width: 26, height: 26, borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 800, fontSize: "0.75rem", color: "#334155" }}
                >A+</button>
              </div>

              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.75rem", fontWeight: 600, color: "#334155", background: "#fff", outline: "none" }}
              >
                <option value="Plus Jakarta Sans">Sans-Serif</option>
                <option value="Georgia">Georgia (Serif)</option>
                <option value="Outfit">Outfit (Mod)</option>
                <option value="Times New Roman">Times New Roman</option>
              </select>

              <button
                onClick={() => setLeftCollapsed(true)}
                title="Ẩn khung bài đọc bên trái"
                style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <ChevronLeft size={14} /> Ẩn bài đọc
              </button>
            </div>
          </div>

          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#2563eb", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
            IELTS Academic Reading — {currentPassageName.toUpperCase()}
          </div>

          {/* Render passage text formatted with font size & family */}
          <div style={{ fontFamily: fontFamily, fontSize: `${fontSize}px`, lineHeight: 1.8, color: "#1f2937" }}>
            {currentPassageText.split("\n\n").map((para: string, i: number) => (
              <p key={i} style={{
                marginBottom: "16px",
                fontWeight: para.startsWith("**") || para.startsWith("#") ? 700 : 400,
                color: para.startsWith("**") || para.startsWith("#") ? "#111827" : "#374151"
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
                  border: "1.5px solid #2563eb", background: "#eff6ff",
                  color: "#1d4ed8", fontSize: "0.75rem", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                  transition: "all 0.15s ease", boxShadow: "0 2px 8px rgba(37,99,235,0.15)",
                  marginRight: "6px"
                }}
              >
                <ChevronRight size={14} /> Hiện khung bài đọc (Bên trái)
              </button>
            )}
            {passageList.map(p => (
              <button
                key={p}
                onClick={() => scrollToPassage(p)}
                style={{
                  padding: "6px 14px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700,
                  border: `1.5px solid ${p === currentPassageName ? "#2563eb" : "#cbd5e1"}`,
                  background: p === currentPassageName ? "#dbeafe" : "#fff",
                  color: p === currentPassageName ? "#1e40af" : "#475569",
                  cursor: "pointer", transition: "all 0.15s ease"
                }}
              >
                {p} (Q{passageRange[p][0]}-{passageRange[p][1]})
              </button>
            ))}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
            Đang chọn: <span style={{ color: "#1e40af", fontWeight: 800 }}>Câu {currentQ} / 40</span>
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
                  background: "linear-gradient(135deg, #065f46 0%, #059669 100%)",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 12px rgba(5,150,105,0.2)"
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>
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
                {passageQuestions.map((item: any) => {
                  const isCurrent = currentQ === item.number;
                  const hasAnswer = Boolean(answers[`reading_${item.number}`]);

                  return (
                    <div
                      key={item.number}
                      id={`reading-q-${item.number}`}
                      onClick={() => onNavigate(item.number)}
                      style={{
                        background: "#fff",
                        border: `2px solid ${isCurrent ? "#2563eb" : (hasAnswer ? "#93c5fd" : "#e2e8f0")}`,
                        borderRadius: "14px",
                        padding: "18px 22px",
                        transition: "all 0.2s ease",
                        boxShadow: isCurrent ? "0 4px 16px rgba(37,99,235,0.15)" : "0 1px 3px rgba(0,0,0,0.04)"
                      }}
                    >
                      {/* Question Badge Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: isCurrent ? "#2563eb" : (hasAnswer ? "#059669" : "#f1f5f9"),
                            color: isCurrent || hasAnswer ? "#fff" : "#475569",
                            fontSize: "0.8rem", fontWeight: 800,
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            {item.number}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {item.type === "multiple_choice" ? "Multiple Choice" : (item.type === "true_false_ng" ? "True / False / Not Given" : "Fill in the blank")}
                          </span>
                        </div>
                        {hasAnswer && (
                          <span style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 700, background: "#dcfce7", padding: "2px 8px", borderRadius: "99px" }}>
                            ✓ Đã trả lời
                          </span>
                        )}
                      </div>

                      {/* Question Body & Fill-in Inputs */}
                      {renderQuestionText(item)}

                      {/* Multiple Choice Options */}
                      {item.type === "multiple_choice" && item.options && (
                        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {item.options.map((opt: string, optIdx: number) => {
                            const key = opt[0];
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
                                <span>{opt.substring(3)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* True / False / Not Given Options */}
                      {item.type === "true_false_ng" && (
                        <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          {["TRUE", "FALSE", "NOT GIVEN"].map((opt: string) => {
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
function WritingSection({ task1Prompt, task2Prompt, task1Text, task2Text, onTask1Change, onTask2Change, activeTab, onTabChange }: any) {
  const isTask1 = activeTab === "task1";
  const prompt = isTask1 ? task1Prompt : task2Prompt;
  const text = isTask1 ? task1Text : task2Text;
  const onChange = isTask1 ? onTask1Change : onTask2Change;
  const minWords = isTask1 ? 150 : 250;
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
                borderColor: activeTab === t ? "#1d4ed8" : "#e5e7eb",
                background: activeTab === t ? "#dbeafe" : "#fff",
                color: activeTab === t ? "#1e40af" : "#6b7280",
                cursor: "pointer", fontWeight: 700, fontSize: "0.8rem"
              }}>
                {t === "task1" ? "Task 1" : "Task 2"}
              </button>
            ))}
          </div>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
            {isTask1 ? "Task 1 — Summarise the graph" : "Task 2 — Essay"}
          </div>
        </div>
        {prompt.split("\n\n").map((para: string, i: number) => (
          <p key={i} style={{ marginBottom: "12px", fontSize: "0.88rem", color: "#374151", lineHeight: 1.7 }}>
            {para}
          </p>
        ))}
        <div style={{ marginTop: "20px", padding: "12px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "0.72rem", color: "#166534", fontWeight: 700 }}>
            ✏️ Yêu cầu tối thiểu: {minWords} từ
          </div>
        </div>
      </div>

      {/* Right — Editor */}
      <div className="exam-editor-pane">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {isTask1 ? "Task 1" : "Task 2"} — Bài viết
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontSize: "0.78rem", fontWeight: 700,
              color: wordStatus === "ok" ? "#16a34a" : wordStatus === "warning" ? "#d97706" : "#dc2626"
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
          <div style={{ height: 4, background: "#e5e7eb", borderRadius: "9999px", overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, (wordCount / (minWords * 1.5)) * 100)}%`,
              height: "100%", borderRadius: "9999px",
              background: wordStatus === "ok" ? "#16a34a" : wordStatus === "warning" ? "#d97706" : "#dc2626",
              transition: "width 0.3s ease"
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
            <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>0</span>
            <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>{minWords} (min)</span>
            <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>{Math.round(minWords * 1.5)}</span>
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
        <div className="speaking-examiner-avatar">🎓</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#1f2937", fontFamily: "Outfit, sans-serif" }}>Alex — IELTS Examiner</div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{partData?.title || "Speaking"}</div>
        </div>
      </div>

      {/* Question Bubble */}
      <div className="speaking-question-bubble" style={{ maxWidth: "640px" }}>
        {phase === "prep" ? (
          <>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#1d4ed8", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              📋 Cue Card — 1 phút chuẩn bị
            </div>
            {currentQ.split("\n").map((line: string, i: number) => (
              <p key={i} style={{ marginBottom: "6px", fontWeight: line.startsWith("•") ? 400 : line.startsWith("**") ? 700 : 400 }}>
                {line.replace(/\*\*/g, "")}
              </p>
            ))}
          </>
        ) : phase === "done" ? (
          <p style={{ color: "#16a34a", fontWeight: 700 }}>✅ Bài Speaking đã hoàn thành. Cảm ơn bạn.</p>
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
          <p style={{ fontSize: "0.82rem", color: "#6b7280" }}>Chuẩn bị trong 1 phút</p>
          <button
            onClick={() => onPhaseChange("speaking")}
            style={{
              padding: "12px 28px", borderRadius: "12px",
              background: "linear-gradient(135deg, #dc2626, #b91c1c)",
              border: "none", color: "#fff", cursor: "pointer",
              fontWeight: 700, fontSize: "0.9rem",
              display: "flex", alignItems: "center", gap: "8px"
            }}
          >
            <Mic size={16} /> Bắt Đầu Nói (2 phút)
          </button>
        </div>
      )}

      {phase === "question" && (
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={onRecord}
            className={isRecording ? "mic-recording" : ""}
            style={!isRecording ? {
              width: 72, height: 72, borderRadius: "50%",
              background: "#6b7280", border: "none", color: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
            } : {}}
          >
            {isRecording ? <MicOff size={28} color="#fff" /> : <Mic size={28} color="#fff" />}
          </button>
          <div>
            <div style={{ fontSize: "0.85rem", color: "#1f2937", fontWeight: 600 }}>
              {isRecording ? "🔴 Đang ghi âm..." : "Nhấn để bắt đầu trả lời"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "2px" }}>
              Trả lời xong → nhấn Câu tiếp theo
            </div>
          </div>
          <button
            onClick={onNextQ}
            style={{
              padding: "10px 20px", borderRadius: "10px", marginLeft: "16px",
              background: "#1d4ed8", border: "none", color: "#fff",
              cursor: "pointer", fontWeight: 700, fontSize: "0.82rem",
              display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            Câu tiếp <ChevronRight size={14} />
          </button>
        </div>
      )}

      {phase === "speaking" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div className="mic-recording" onClick={onRecord}>
            <Mic size={28} color="#fff" />
          </div>
          <div style={{ fontWeight: 700, color: "#dc2626", fontSize: "0.9rem" }}>🔴 Đang ghi âm — 2 phút</div>
          <button
            onClick={() => { onPhaseChange("question"); onNextQ(); }}
            style={{
              padding: "10px 24px", borderRadius: "10px",
              background: "#1d4ed8", border: "none", color: "#fff",
              cursor: "pointer", fontWeight: 700, fontSize: "0.85rem"
            }}
          >
            Hoàn thành Part 2 →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Result Screen ───────────────────────────────────────────
function ResultScreen({ result, sections, onRetry }: any) {
  const overall = result?.overall_band || 0;
  const sr = result?.section_results || {};
  const analysis = result?.ai_analysis || {};

  const sectionLabel: Record<string, string> = {
    listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking"
  };
  const sectionColor: Record<string, string> = {
    listening: "#0891b2", reading: "#059669", writing: "#d97706", speaking: "#7c3aed"
  };

  const getBandColor = (band: number) =>
    band >= 7.5 ? "#16a34a" : band >= 6.5 ? "#2563eb" : band >= 5.5 ? "#d97706" : "#dc2626";

  return (
    <div className="exam-result" style={{ background: "#f5f5f0", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        padding: "40px", textAlign: "center", marginBottom: "0"
      }}>
        <div style={{ fontSize: "0.7rem", color: "#6366f1", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
          IELTS MOCK TEST RESULT
        </div>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#fff", fontFamily: "Outfit, sans-serif", marginBottom: "32px" }}>
          Kết Quả Bài Thi
        </h1>

        {/* Overall Band */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px", gap: "24px", alignItems: "center" }}>
          <div style={{ textAlign: "right", color: "#94a3b8" }}>
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Time Used</div>
            <div style={{ fontSize: "1.2rem", color: "#fff", fontWeight: 600 }}>2:45:00</div>
          </div>
          <div className="band-circle" style={{ width: 120, height: 120, borderRadius: "50%", background: "#4f46e5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "4px solid rgba(255,255,255,0.2)" }}>
            <div className="band-circle-score" style={{ fontSize: "2.8rem", color: "#fff", fontWeight: 800, lineHeight: 1 }}>{overall}</div>
            <div className="band-circle-label" style={{ color: "#a5b4fc", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>Overall</div>
          </div>
          <div style={{ textAlign: "left", color: "#94a3b8" }}>
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Accuracy</div>
            <div style={{ fontSize: "1.2rem", color: "#34d399", fontWeight: 600 }}>{Math.round((result?.answered_count || 0) / 80 * 100)}%</div>
          </div>
        </div>

        {/* Section scores */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${sections.length}, 1fr)`, gap: "16px", maxWidth: "700px", margin: "0 auto" }}>
          {sections.map((sec: string) => {
            const secResult = sr[sec];
            if (!secResult) return null;
            return (
              <div key={sec} style={{
                background: "rgba(255,255,255,0.06)",
                borderRadius: "16px", padding: "16px 12px", textAlign: "center",
                border: "1px solid rgba(255,255,255,0.1)"
              }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", fontFamily: "Outfit, sans-serif" }}>
                  {secResult.band}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginTop: "4px" }}>
                  {sectionLabel[sec]}
                </div>
                {secResult.raw_score !== undefined && (
                  <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                    {secResult.raw_score}/40
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Analysis */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          {/* Strengths */}
          <div style={{ background: "#fff", borderRadius: "20px", padding: "24px", border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "14px", color: "#16a34a", display: "flex", alignItems: "center", gap: "8px" }}>
              ✅ Điểm mạnh
            </h3>
            {(analysis.strengths || []).map((s: string, i: number) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.85rem", color: "#374151" }}>
                {s}
              </div>
            ))}
          </div>

          {/* Weaknesses */}
          <div style={{ background: "#fff", borderRadius: "20px", padding: "24px", border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "14px", color: "#dc2626", display: "flex", alignItems: "center", gap: "8px" }}>
              ⚠️ Điểm yếu
            </h3>
            {(analysis.weaknesses || []).map((s: string, i: number) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.85rem", color: "#374151" }}>
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Target & Priority */}
        <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontWeight: 800, fontSize: "1.1rem", fontFamily: "Outfit, sans-serif" }}>
              🎯 Kế Hoạch Cải Thiện Cá Nhân
            </h3>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#6b7280" }}>{analysis.current_band}</div>
                <div style={{ fontSize: "0.65rem", color: "#9ca3af" }}>Hiện tại</div>
              </div>
              <div style={{ color: "#9ca3af", fontSize: "1.2rem" }}>→</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1d4ed8" }}>{analysis.target_band}</div>
                <div style={{ fontSize: "0.65rem", color: "#9ca3af" }}>Mục tiêu</div>
              </div>
            </div>
          </div>

          {(analysis.priority_areas || []).map((area: any, i: number) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: "14px",
              padding: "14px 0", borderTop: i > 0 ? "1px solid #f3f4f6" : "none"
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "8px",
                background: i === 0 ? "#fef2f2" : i === 1 ? "#fffbeb" : "#f0fdf4",
                color: i === 0 ? "#dc2626" : i === 1 ? "#d97706" : "#16a34a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "0.75rem", flexShrink: 0
              }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1f2937" }}>{area.area}</div>
                <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "2px" }}>{area.action}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Plan */}
        {analysis.study_plan && (
          <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", border: "1px solid #e5e7eb", marginBottom: "32px" }}>
            <h3 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "16px", fontFamily: "Outfit, sans-serif" }}>
              📅 Lộ Trình 3 Tuần
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {Object.entries(analysis.study_plan).map(([week, tasks]: [string, any], i) => (
                <div key={week} style={{ background: "#f8fafc", borderRadius: "14px", padding: "16px" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#374151", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Tuần {i + 1}
                  </div>
                  {(tasks as string[]).map((t, j) => (
                    <div key={j} style={{ fontSize: "0.78rem", color: "#6b7280", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                      • {t}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={onRetry}
            style={{
              padding: "14px 32px", borderRadius: "14px",
              background: "linear-gradient(135deg, #1e40af, #7c3aed)",
              border: "none", color: "#fff", cursor: "pointer",
              fontWeight: 800, fontSize: "1rem", fontFamily: "Outfit, sans-serif"
            }}
          >
            🎯 Thi Lại
          </button>
          <a
            href="/"
            style={{
              padding: "14px 32px", borderRadius: "14px",
              background: "#fff", border: "1.5px solid #e5e7eb",
              color: "#374151", textDecoration: "none",
              fontWeight: 700, fontSize: "0.95rem",
              display: "inline-flex", alignItems: "center"
            }}
          >
            ← Về Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
