"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BookOpen, Layers, Target, Mic, AudioLines, Network, NotebookPen, Zap, Check,
  Sparkles, CalendarDays, Languages, FileText, Flame, RotateCcw, Flag,
} from "lucide-react";
import Logo from "@/components/Logo";
import AiIcon from "@/components/AiIcon";
import Mascot from "@/components/mascot/Mascot";
import ThemeToggle from "@/components/ThemeToggle";
import Pricing from "./Pricing";
import Numbers from "./Numbers";
import HeroSlides from "./HeroSlides";
import FeatureCta from "./FeatureCta";
import { supabase } from "@/lib/supabase";
import "./landing.css";

type Variant = "up" | "left" | "right" | "zoom";

/** Hiện dần khi cuộn tới (mỗi phần tử một kiểu: lên, trượt trái/phải, phóng ra). */
function Reveal({ children, delay = 0, variant = "up", className = "" }: {
  children: React.ReactNode; delay?: number; variant?: Variant; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const v = variant === "up" ? "" : ` v-${variant}`;
  return <div ref={ref} className={`lp-rv${v}${on ? " in" : ""} ${className}`} style={{ ["--d" as any]: `${delay}ms` }}>{children}</div>;
}

/** Nền minh hoạ vẽ bằng mã, các hình bên trong trôi chậm hơn nội dung khi cuộn (parallax). */
function Stage({ tone, children }: { tone: "brand" | "accent" | "success" | "navy"; children: React.ReactNode }) {
  return (
    <div className={`lp-stage s-${tone}`}>
      <span className="lp-shape c1" data-par="0.12" aria-hidden="true" />
      <span className="lp-shape c2" data-par="-0.1" aria-hidden="true" />
      <span className="lp-shape sq" data-par="0.18" aria-hidden="true" />
      <svg className="lp-shape plus" data-par="-0.14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M12 3v18M3 12h18" /></svg>
      {children}
    </div>
  );
}

function useCycle(n: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => clearInterval(t);
  }, [n, ms]);
  return i;
}

function useCountdown(from: number) {
  const [s, setS] = useState(from);
  useEffect(() => {
    const t = setInterval(() => setS((x) => (x <= 0 ? from : x - 1)), 1000);
    return () => clearInterval(t);
  }, [from]);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Hiệu ứng theo cuộn: thanh tiến độ, hero thu nhỏ dần, parallax, đường nối các bước chạy theo. */
function useScrollFx(rootRef: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bar = root.querySelector<HTMLElement>(".lp-progress");
    const nav = root.querySelector<HTMLElement>(".lp-nav");
    const par = Array.from(root.querySelectorAll<HTMLElement>("[data-par]"));
    const steps = root.querySelector<HTMLElement>(".lp-steps");
    let raf = 0;

    const run = () => {
      raf = 0;
      const vh = window.innerHeight;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - vh;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      if (nav) nav.classList.toggle("scrolled", y > 8);
      if (reduce) return;
      root.style.setProperty("--hp", String(Math.min(1, y / (vh * 0.9))));
      for (const el of par) {
        const host = el.parentElement as HTMLElement;
        const r = host.getBoundingClientRect();
        if (r.bottom < -240 || r.top > vh + 240) continue;
        const off = r.top + r.height / 2 - vh / 2;
        el.style.setProperty("--py", `${(-off * parseFloat(el.dataset.par || "0.1")).toFixed(1)}px`);
      }
      if (steps) {
        const r = steps.getBoundingClientRect();
        const p = (vh * 0.78 - r.top) / Math.max(r.height, 1);
        steps.style.setProperty("--fill", String(Math.max(0, Math.min(1, p))));
      }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(run); };
    run();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef]);
}

const SKILLS = ["Listening", "Reading", "Writing", "Speaking", "Từ vựng học thuật", "Ngữ pháp", "Collocations", "Matching headings", "True / False / Not given", "Task 1 — biểu đồ", "Task 2 — essay", "Speaking Part 2", "Cambridge IELTS 21"];

/** Phiên đăng nhập hiện tại (để đổi nút Đăng nhập thành tên người dùng). */
function useSessionUser() {
  const [user, setUser] = useState<{ name: string } | null | undefined>(undefined);
  useEffect(() => {
    const pick = (u: { user_metadata?: Record<string, unknown> } | null | undefined) => {
      if (!u) { setUser(null); return; }
      const m = u.user_metadata || {};
      const n = String(m.full_name || m.name || m.display_name || "").trim();
      setUser({ name: n && !n.includes("@") ? n : "Tài khoản" });
    };
    supabase.auth.getSession().then(({ data }) => pick(data.session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => pick(s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);
  return user;
}

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  useScrollFx(root);
  const user = useSessionUser();
  const loggedIn = !!user;

  const pipe = useCycle(7, 1100);
  const clock = useCountdown(41 * 60 + 30);
  const examQ = useCycle(3, 2600);

  const pipeSteps = ["Tải lên", "Đọc từng trang", "Tách chương, tách bài", "Lập chỉ mục cho AI", "Tạo bài học, flashcard"];

  return (
    <div className="lp" ref={root}>
      <div className="lp-progress" aria-hidden="true" />

      {/* ───── Nav ───── */}
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Logo height={30} href="/welcome" />
          <nav className="lp-links" aria-label="Các mục trên trang">
            <a href="#thu-vien">Thư viện</a>
            <a href="#ghi-nho">Ghi nhớ</a>
            <a href="#thi-thu">Thi thử</a>
            <a href="#ai">Studia AI</a>
            <a href="#coal">Coal</a>
            <a href="#goi">Gói</a>
            <Link href="/blog">Blog</Link>
          </nav>
          <div className="lp-nav-cta">
            <div style={{ width: 44 }}><ThemeToggle compact /></div>
            {user ? (
              <>
                <Link className="lp-btn lp-btn-ghost lp-btn-sm lp-user" href="/settings" title="Mở cài đặt và trang cá nhân" aria-label={`${user.name}, mở cài đặt tài khoản`}>
                  <span className="lp-av" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
                  <span className="lp-uname">{user.name}</span>
                </Link>
                <Link className="lp-btn lp-btn-primary lp-btn-sm" href="/">Vào học</Link>
              </>
            ) : (
              <>
                <Link className="lp-btn lp-btn-ghost lp-btn-sm" href="/login">Đăng nhập</Link>
                <Link className="lp-btn lp-btn-primary lp-btn-sm" href="/signup">Học thử miễn phí</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ───── Hero ───── */}
      <section className="lp-hero">
        <span className="lp-blob b1" aria-hidden="true" /><span className="lp-blob b2" aria-hidden="true" />
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow"><Sparkles size={15} aria-hidden="true" />IELTS cho người Việt</span>
            <h1 className="lp-h1">
              Tải sách IELTS lên, <span className="lp-hl lp-brand">Studia</span> lo phần còn lại.
            </h1>
            <p className="lp-sub">
              Studia tự chia bài, làm flashcard, ra quiz và dựng đề thi thử từ chính cuốn sách của bạn.
              Mỗi ngày bạn chỉ cần mở app và làm vài nhiệm vụ nhỏ.
            </p>
            <div className="lp-cta">
              <Link className="lp-btn lp-btn-accent lp-btn-lg" href={loggedIn ? "/" : "/signup"}>{loggedIn ? "Vào học ngay" : "Học thử miễn phí"} <ArrowRight size={20} aria-hidden="true" /></Link>
              <a className="lp-btn lp-btn-ghost lp-btn-lg" href="#thu-vien">Xem Studia làm được gì</a>
            </div>
            <div className="lp-trust">
              <span><Check size={18} aria-hidden="true" />Miễn phí 1 cuốn sách</span>
              <span><Check size={18} aria-hidden="true" />Không cần thẻ ngân hàng</span>
              <span><Check size={18} aria-hidden="true" />Học được cả trên điện thoại</span>
            </div>
          </div>

          <div className="lp-hero-visual">
            <div className="lp-chip c1"><span className="lp-tag hot"><Flame size={14} aria-hidden="true" /></span><div>Chuỗi 12 ngày<small>Giữ lửa nhé!</small></div></div>
            <div className="lp-chip c2"><span className="lp-tag ok">+0.5</span><div>Band Reading<small>so với tuần trước</small></div></div>
            <div className="lp-chip c3"><span className="lp-tag warn">Sắp quên</span><div>Matching headings<small>Ôn trong hôm nay</small></div></div>
            <Stage tone="brand">
              <HeroSlides />
            </Stage>
          </div>
        </div>
      </section>

      {/* ───── Chạy chữ ───── */}
      <div className="lp-marquee" aria-hidden="true">
        <div className="lp-track">
          {[...SKILLS, ...SKILLS].map((s, i) => <span key={i} className="lp-pill"><i />{s}</span>)}
        </div>
      </div>

      {/* ───── Số liệu ───── */}
      <section className="lp-section" style={{ paddingBottom: 0 }}>
        <div className="lp-wrap">
          <Reveal variant="zoom"><Numbers /></Reveal>
        </div>
      </section>

      {/* ───── Thư viện ───── */}
      <section className="lp-section" id="thu-vien">
        <div className="lp-wrap lp-feat">
          <Reveal variant="left">
            <span className="lp-eyebrow"><FileText size={15} aria-hidden="true" />Thư viện sách</span>
            <h2 className="lp-h2">Tải PDF lên là <span className="lp-hl">đọc được ngay</span>, không cần chờ.</h2>
            <p className="lp-lead">Studia đọc từng trang (cả bản scan), tách bài rồi dựng sẵn bài học, flashcard và quiz từ chính cuốn sách của bạn. Trang nào xong là mở đọc được liền.</p>
            <ul className="lp-list">
              <li><span><b>Đọc được cả bản scan.</b> Trang ảnh được nhận dạng chữ, sai chỗ nào thì sửa luôn trong trình đọc.</span></li>
              <li><span><b>Không phải chờ cả cuốn.</b> Phần nào xử lý xong là đọc được, phần còn lại hiện dần.</span></li>
              <li><span><b>Ghi chú, tô màu, hỏi AI</b> ngay trên đoạn bạn đang đọc.</span></li>
            </ul>
            <FeatureCta href="/books" label="Mở Thư viện sách" loggedIn={loggedIn} />
          </Reveal>
          <Reveal variant="right" delay={120}>
            <Stage tone="brand">
              <div className="lp-card lp-float">
                <div className="lp-pdf">
                  <div className="lp-sheet" aria-hidden="true">
                    <span className="lp-tag" style={{ marginBottom: 6 }}>Cambridge IELTS 21.pdf</span>
                    {[90, 100, 78, 96, 60, 100, 84, 70].map((w, i) => <div key={i} className="ln" style={{ width: `${w}%` }} />)}
                    <span className="lp-scan" />
                  </div>
                  <div className="lp-arrow" aria-hidden="true"><ArrowRight size={30} /></div>
                  <div>
                    {pipeSteps.map((s, i) => {
                      const state = pipe > i + 1 ? "done" : pipe === i + 1 ? "run" : "";
                      return <div key={s} className={`lp-step ${state}`}><i><Check size={13} strokeWidth={3.4} aria-hidden="true" /></i>{s}</div>;
                    })}
                  </div>
                </div>
              </div>
            </Stage>
          </Reveal>
        </div>
      </section>

      {/* ───── Học & quiz ───── */}
      <section className="lp-section lp-alt">
        <div className="lp-wrap lp-feat rev">
          <Reveal variant="right">
            <span className="lp-eyebrow"><BookOpen size={15} aria-hidden="true" />Bài học & quiz</span>
            <h2 className="lp-h2">Bài học vừa sức, <span className="lp-hl">nhìn sơ đồ là hiểu</span>.</h2>
            <p className="lp-lead">Studia xếp các chủ đề theo thứ tự nên học, soạn bài đúng trình độ của bạn, rồi ra quiz đủ kiểu: trắc nghiệm, điền chỗ trống, viết lại câu.</p>
            <ul className="lp-list">
              <li><span><b>Bài đọc kèm sơ đồ khái niệm,</b> đỡ phải học thuộc máy móc.</span></li>
              <li><span><b>Quiz nhiều dạng.</b> Câu tự luận ngắn có AI chấm và giải thích.</span></li>
              <li><span><b>Luyện nhanh 15 phút:</b> xen kẽ thẻ và câu hỏi để nhớ lâu hơn.</span></li>
            </ul>
            <FeatureCta href="/practice" label="Mở Ôn luyện" loggedIn={loggedIn} />
          </Reveal>
          <Reveal variant="left" delay={120}>
            <Stage tone="accent">
              <div className="lp-card lp-map lp-float">
                <svg viewBox="0 0 520 300" role="img" aria-label="Sơ đồ khái niệm minh hoạ" style={{ width: "100%", height: "auto" }}>
                  <g fill="none" stroke="var(--border-control)" strokeWidth="2">
                    <path className="edge" d="M110 150 C 170 150, 170 70, 240 70" /><path className="edge" d="M110 150 C 170 150, 170 230, 240 230" />
                    <path className="edge" d="M300 70 C 360 70, 360 150, 420 150" /><path className="edge" d="M300 230 C 360 230, 360 150, 420 150" />
                  </g>
                  {[[70, 150, 42, "var(--navy)", "Thì hiện tại", "var(--on-navy)"], [270, 70, 36, "var(--brand-tint)", "Mệnh đề QH", "var(--ink)"], [270, 230, 36, "var(--accent-tint)", "Paraphrase", "var(--ink)"], [460, 150, 42, "var(--success-tint)", "Câu phức", "var(--ink)"]].map(([x, y, r, f, t, c], i) => (
                    <g key={i}>
                      <circle className="n" cx={x as number} cy={y as number} r={r as number} fill={f as string} stroke="var(--brand)" strokeWidth="2" style={{ animationDelay: `${i * 0.5}s` }} />
                      <text x={x as number} y={(y as number) + 4} textAnchor="middle" style={{ font: "650 12px var(--font-sans)", fill: c as string }}>{t}</text>
                    </g>
                  ))}
                </svg>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <span className="lp-tag ok">Đã vững</span><span className="lp-tag">Đang học</span><span className="lp-tag hot">Cần ôn thêm</span>
                </div>
              </div>
            </Stage>
          </Reveal>
        </div>
      </section>

      {/* ───── Ghi nhớ ───── */}
      <section className="lp-section" id="ghi-nho">
        <div className="lp-wrap lp-feat">
          <Reveal variant="left">
            <span className="lp-eyebrow"><Layers size={15} aria-hidden="true" />Flashcard & ôn tập</span>
            <h2 className="lp-h2">Ôn <span className="lp-hl">đúng lúc sắp quên</span>, đỡ tốn thời gian.</h2>
            <p className="lp-lead">Studia tính xem bạn sắp quên thẻ nào, chủ đề nào rồi nhắc đúng lúc đó. Cái gì thuộc rồi thì thôi, không bắt ôn lại.</p>
            <ul className="lp-list">
              <li><span><b>Thẻ tự tạo từ sách,</b> hoặc bôi đen một từ khi đọc để lưu nhanh.</span></li>
              <li><span><b>Chấm 4 mức:</b> Quên, Khó, Được, Dễ. Lịch ôn tự chỉnh theo bạn.</span></li>
              <li><span><b>Mỗi ngày một danh sách nhiệm vụ</b> vừa sức với thời gian bạn có.</span></li>
            </ul>
            <FeatureCta href="/flashcards" label="Mở Thẻ & từ vựng" loggedIn={loggedIn} />
          </Reveal>
          <Reveal variant="right" delay={120}>
            <Stage tone="success">
              <div className="lp-card lp-float">
                <div className="lp-flip">
                  <div className="lp-flip-in">
                    <div className="lp-face">
                      <span className="lp-tag" style={{ marginBottom: 12 }}>Environment · Flashcard</span>
                      <div style={{ font: "750 clamp(38px, 4vw, 52px)/1.1 var(--font-display)", letterSpacing: -1.2 }}>mitigate</div>
                      <div style={{ color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-reading)", fontSize: 18 }}>/ˈmɪt.ɪ.ɡeɪt/</div>
                    </div>
                    <div className="lp-face back">
                      <div style={{ fontSize: 26, fontWeight: 650 }}>giảm nhẹ, làm dịu bớt</div>
                      <p style={{ marginTop: 10, opacity: 0.85, fontFamily: "var(--font-reading)", fontSize: 18 }}>Planting trees can help mitigate urban heat.</p>
                    </div>
                  </div>
                </div>
                <div className="lp-rate" aria-hidden="true">
                  <span className="a">Quên<small>&lt; 1 ph</small></span><span className="h">Khó<small>6 ph</small></span><span className="g">Được<small>2 ngày</small></span><span className="e">Dễ<small>5 ngày</small></span>
                </div>
              </div>
            </Stage>
          </Reveal>
        </div>
      </section>

      {/* ───── Thi thử ───── */}
      <section className="lp-section lp-alt" id="thi-thu">
        <div className="lp-wrap lp-feat rev">
          <Reveal variant="right">
            <span className="lp-eyebrow"><Target size={15} aria-hidden="true" />Phòng thi ảo</span>
            <h2 className="lp-h2">Thi thử như thi thật, <span className="lp-hl">xong có band luôn</span>.</h2>
            <p className="lp-lead">Đồng hồ đếm ngược, chia đôi màn hình bài đọc và câu hỏi, có bảng số câu và cờ đánh dấu câu khó. Mất mạng giữa chừng cũng không mất bài.</p>
            <ul className="lp-list">
              <li><span><b>Đủ 4 kỹ năng:</b> Listening có audio, Writing đếm từ, Speaking ghi âm.</span></li>
              <li><span><b>Dựng đề từ chính cuốn sách của bạn,</b> hoặc dùng bộ Cambridge mẫu.</span></li>
              <li><span><b>Xem lại từng câu,</b> band từng kỹ năng và những lỗi hay lặp lại.</span></li>
            </ul>
            <FeatureCta href="/exam" label="Mở Thi thử IELTS" loggedIn={loggedIn} />
          </Reveal>
          <Reveal variant="left" delay={120}>
            <Stage tone="navy">
              <div className="lp-exam lp-float" aria-hidden="true">
                <div className="lp-exam-top">
                  <Logo variant="mark" height={24} />
                  <div><div style={{ font: "650 12px/16px var(--font-sans)", letterSpacing: ".6px", textTransform: "uppercase", color: "var(--ink-muted)" }}>Cambridge 21 · Test 3</div><b style={{ fontSize: 16 }}>Reading · Passage 1</b></div>
                  <span className="lp-timer">{clock}</span>
                </div>
                <div className="lp-exam-body">
                  <div>
                    <b style={{ fontFamily: "var(--font-display)", fontSize: 21 }}>The history of glass</b>
                    <p style={{ marginTop: 10, fontFamily: "var(--font-reading)", fontSize: 16.5, lineHeight: "26px", color: "var(--ink-secondary)" }}>
                      From our earliest origins, humans have been making use of glass. Historians have discovered that a type of natural glass —
                      <mark style={{ background: "var(--marker)", color: "var(--ink)", padding: "0 2px", borderRadius: 3 }}> obsidian </mark>
                      — formed in places such as the mouth of a volcano.
                    </p>
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 16.5 }}>Obsidian was formed by heat from volcanic eruptions.</p>
                    {["True", "False", "Not given"].map((o, i) => (
                      <div key={o} className={`lp-opt${examQ === i ? " pick" : ""}`}><b>{"TFN"[i]}</b>{o}</div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, color: "var(--accent-strong)", fontSize: 15, fontWeight: 600 }}><Flag size={16} />Đánh dấu xem lại</div>
                  </div>
                </div>
                <div className="lp-qnav">
                  {Array.from({ length: 13 }, (_, i) => <i key={i} className={i < 4 ? "d" : i === 4 ? "c" : ""}>{i + 1}</i>)}
                </div>
              </div>
            </Stage>
          </Reveal>
        </div>
      </section>

      {/* ───── AI ───── */}
      <section className="lp-section" id="ai">
        <div className="lp-wrap lp-feat">
          <Reveal variant="left">
            <span className="lp-eyebrow"><Mic size={15} aria-hidden="true" />Studia AI</span>
            <h2 className="lp-h2">Hỏi gì cũng được, <span className="lp-hl">nói sai cũng không sao</span>.</h2>
            <p className="lp-lead">Studia AI trả lời dựa trên chính cuốn sách của bạn và chỉ ra trang đã dùng. Muốn luyện nói thì cứ nói, AI sẽ chỉ ra từ nào chưa chuẩn.</p>
            <ul className="lp-list">
              <li><span><b>Hỏi đáp có trích trang,</b> không nói bừa ngoài tài liệu.</span></li>
              <li><span><b>Hội thoại theo tình huống,</b> sửa ngữ pháp ngay trong lúc chat.</span></li>
              <li><span><b>Luyện phát âm theo cụm,</b> chọn tốc độ 0.8×, 1× hoặc 1.2×.</span></li>
            </ul>
            <FeatureCta href="/tutor" label="Mở Studia AI" loggedIn={loggedIn} />
          </Reveal>
          <Reveal variant="right" delay={120}>
            <Stage tone="accent">
              <div className="lp-card lp-float" style={{ display: "grid", gap: 18 }}>
                <div className="lp-ai-badge"><span><AiIcon size={26} /></span>Studia AI</div>
                <div className="lp-chat" aria-hidden="true">
                  <div className="lp-msg u">It was very beautiful and crowded.</div>
                  <div className="lp-msg a">Thử <mark>breathtaking</mark> thay cho “very beautiful” nhé. “Crowded” nói là <mark>packed with tourists</mark> nghe tự nhiên hơn.</div>
                  <div className="lp-msg u">It was breathtaking, especially at sunrise.</div>
                  <div className="lp-msg a">Chuẩn rồi! Câu này nghe như band 7.</div>
                </div>
                <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }} aria-hidden="true">
                    <div className="lp-wave">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ animationDelay: `${(i % 8) * 0.12}s` }} />)}</div>
                    <div className="lp-words">I grew up in a small <span className="s">coastal</span> town in <span className="m">central</span> Vietnam.</div>
                  </div>
                </div>
              </div>
            </Stage>
          </Reveal>
        </div>
      </section>

      {/* ───── Lưới chức năng ───── */}
      <section className="lp-section lp-alt">
        <div className="lp-wrap">
          <Reveal>
            <span className="lp-eyebrow"><Zap size={15} aria-hidden="true" />Còn gì nữa</span>
            <h2 className="lp-h2" style={{ maxWidth: 760 }}>Một nơi cho <span className="lp-hl">cả hành trình IELTS</span>.</h2>
          </Reveal>
          <div className="lp-grid">
            {([
              [CalendarDays, "Lịch học & streak", "Đặt band mục tiêu và ngày thi, ghi chú theo từng giờ, chụp lại khoảnh khắc học mỗi ngày, giữ streak và nhận email nhắc trước 10 phút."],
              [Network, "Bản đồ kiến thức", "Nhìn một cái là biết chủ đề nào đã vững, chủ đề nào còn yếu và nên học gì trước."],
              [NotebookPen, "Sổ lỗi sai", "Lỗi từ quiz, hội thoại và phát âm gom về một chỗ, để bạn luyện đúng chỗ hay sai."],
              [Languages, "Từ vựng của bạn", "Gặp từ lạ khi đọc thì lưu luôn, kèm ví dụ và phiên âm, rồi đẩy thẳng vào flashcard."],
              [AudioLines, "Luyện phát âm", "Nghe mẫu theo cụm, nói lại, xem từ nào đọc khác hoặc bị nuốt mất."],
              [RotateCcw, "Test trình độ", "24 câu, khoảng 12 phút, để lộ trình bắt đầu đúng chỗ. Không thích thì bỏ qua."],
            ] as [typeof Zap, string, string][]).map(([Icon, t, d], i) => (
              <Reveal key={t} delay={(i % 3) * 100} variant={i % 2 ? "zoom" : "up"}>
                <div className="lp-mini"><span className="ic"><Icon size={26} strokeWidth={1.75} aria-hidden="true" /></span><h3>{t}</h3><p>{d}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Các bước ───── */}
      <section className="lp-section">
        <div className="lp-wrap">
          <Reveal>
            <span className="lp-eyebrow">Bắt đầu</span>
            <h2 className="lp-h2">Chỉ cần <span className="lp-hl">3 bước</span> là học được rồi.</h2>
          </Reveal>
          <div className="lp-steps">
            {[
              ["Đặt mục tiêu", "Chọn band mong muốn, ngày thi và số phút học mỗi ngày. Mất khoảng 3 phút."],
              ["Làm bài test trình độ", "24 câu từ vựng, ngữ pháp, đọc và nghe để biết bạn đang đứng ở đâu."],
              ["Tải sách lên và học", "Thêm cuốn PDF đầu tiên, Studia dựng bài học, flashcard và lịch cho từng ngày."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 130}><div className="lp-stepcard"><h3>{t}</h3><p>{d}</p></div></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Coal ───── */}
      <section className="lp-section" id="coal">
        <div className="lp-wrap">
          <Reveal>
            <span className="lp-eyebrow">Người bạn AI</span>
            <h2 className="lp-h2">Gặp Coal, <span className="lp-hl">cục than muốn thành kim cương</span>.</h2>
            <p className="lp-lead">Coal học cùng bạn mỗi ngày: trả lời câu hỏi, nhắc giờ học và đổi dáng theo streak của bạn. Bạn học đều thì Coal bốc lửa, bạn vắng lâu thì Coal ướt, nhưng không bao giờ trách bạn.</p>
          </Reveal>
          <Reveal delay={80}>
            <div className="lp-coal-row" role="group" aria-label="Coal cháy dần khi streak dài">
              {([[0, "1–2 ngày"], [1, "3 ngày"], [2, "7 ngày"], [3, "14 ngày"], [4, "30 ngày"]] as const).map(([f, label]) => (
                <figure key={f}><Mascot mood={f >= 2 ? "fire" : "happy"} fire={f} size={150} label={`Coal, streak ${label}`} /><figcaption><b>{label}</b>{f === 4 ? "cháy cả người" : f === 0 ? "ngọn lửa nhỏ" : f === 3 ? "đống lửa quanh người" : "lửa lớn dần"}</figcaption></figure>
              ))}
            </div>
            <div className="lp-coal-row" role="group" aria-label="Coal ướt dần khi bỏ học lâu">
              {([[1, "1–2 ngày", "sleepy"], [2, "3–6 ngày", "sad"], [3, "7–13 ngày", "lost"], [4, "14 ngày", "lost"]] as const).map(([w, label, mood]) => (
                <figure key={w}><Mascot mood={mood} wet={w} size={150} label={`Coal, vắng ${label}`} /><figcaption><b>Vắng {label}</b>{w === 1 ? "ướt nhẹ" : w === 2 ? "ướt cả người" : w === 3 ? "ướt sũng, run" : "ngập nước"}</figcaption></figure>
              ))}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="lp-cta" style={{ marginTop: 28 }}>
              <Link className="lp-btn lp-btn-primary lp-btn-lg" href="/blog/coal-la-ai">Đọc câu chuyện của Coal <ArrowRight size={20} aria-hidden="true" /></Link>
              <Link className="lp-btn lp-btn-ghost lp-btn-lg" href="/blog">Xem blog học tập</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───── Gói ───── */}
      <section className="lp-section lp-alt" id="goi">
        <div className="lp-wrap" style={{ textAlign: "center" }}>
          <Reveal>
            <span className="lp-eyebrow">Gói & lượt upload</span>
            <h2 className="lp-h2">Bắt đầu miễn phí, <span className="lp-hl">cần thêm thì mua thêm</span>.</h2>
            <p className="lp-lead" style={{ margin: "20px auto 0" }}>Mỗi lượt tương ứng một cuốn sách tải lên. Chọn gói bên dưới, thanh toán bằng chuyển khoản VietQR, lượt được cộng tự động khi tiền về.</p>
          </Reveal>
          <Pricing />
        </div>
      </section>

      {/* ───── CTA cuối ───── */}
      <section style={{ padding: "96px 0 24px" }}>
        <Reveal variant="zoom">
          <div className="lp-final">
            <span className="lp-blob b1" aria-hidden="true" /><span className="lp-blob b2" aria-hidden="true" />
            <div style={{ position: "relative" }}>
              <h2>Ngày học đầu tiên của bạn đang chờ.</h2>
              <p>Tạo tài khoản, chọn band mục tiêu, tải cuốn sách đầu tiên. Ba phút là xong.</p>
              <div className="lp-cta" style={{ justifyContent: "center" }}>
                <Link className="lp-btn lp-btn-accent lp-btn-lg" href={loggedIn ? "/" : "/signup"}>{loggedIn ? "Vào học ngay" : "Học thử miễn phí"} <ArrowRight size={20} aria-hidden="true" /></Link>
                {!loggedIn && <Link className="lp-btn lp-btn-lg" href="/login" style={{ color: "var(--on-navy)", borderColor: "color-mix(in srgb, var(--on-navy) 40%, transparent)" }}>Mình đã có tài khoản</Link>}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="lp-wrap lp-foot">
        <Logo height={26} href="/welcome" />
        <span>© {new Date().getFullYear()} Studia · Luyện IELTS cho người Việt · <Link href="/blog" style={{ textDecoration: "underline" }}>Blog của Coal</Link></span>
      </footer>
    </div>
  );
}
