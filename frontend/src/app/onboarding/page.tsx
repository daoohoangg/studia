"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { DEFAULT_PROFILE, Profile, loadProfile, fetchServerProfile, pushServerProfile, weeksUntil } from "@/lib/placement";

const STEPS = ["Mục tiêu", "Ngày thi & trình độ", "Thời gian học", "Lộ trình"];
const PURPOSES = [
  ["Du học", "Đại học, thạc sĩ ở nước ngoài"], ["Chuẩn đầu ra", "Tốt nghiệp, miễn ngoại ngữ"],
  ["Định cư", "Hồ sơ visa, định cư"], ["Công việc", "Thăng tiến, chứng chỉ nghề"],
];
const BANDS = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0];
const LEVELS = [
  ["Mới bắt đầu", "Chưa học IELTS"], ["4.5–5.0", "Đọc hiểu cơ bản"],
  ["5.5–6.0", "Đã làm vài đề"], ["Đã có điểm thật", "Nhập điểm từng kỹ năng"],
];
const MINUTES = [[15, "Nhẹ nhàng"], [30, "Khuyên dùng"], [45, "Tăng tốc"], [60, "Nước rút"]] as const;
const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const pickCls = (on: boolean): React.CSSProperties => ({
  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: 16, textAlign: "left",
  borderRadius: "var(--radius-md)", border: `1.5px solid ${on ? "var(--brand)" : "var(--hairline)"}`,
  background: on ? "var(--brand-tint)" : "var(--surface)", font: "inherit", color: "inherit", cursor: "pointer",
});

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE);
  useEffect(() => {
    setP(loadProfile());
    fetchServerProfile().then((r) => r.profile && setP(r.profile));
  }, []);
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));

  const weeks = weeksUntil(p);
  const q = Math.max(1, Math.round(weeks / 3));
  const phases = [
    ["Tuần 1–" + q, "Nền tảng", "Từ vựng học thuật, dạng câu hỏi Reading, cấu trúc câu Writing Task 2."],
    [`Tuần ${q + 1}–${Math.max(q + 1, weeks - q)}`, "Kỹ năng theo dạng bài", "Luyện riêng các dạng bạn sai nhiều, nói Part 2 mỗi tuần."],
    [`Tuần ${Math.max(q + 2, weeks - q + 1)}–${weeks}`, "Thi thử & nước rút", "Một đề đầy đủ mỗi tuần, ôn lỗi lặp lại."],
  ];

  const [saving, setSaving] = useState(false);
  const finish = async (toPlacement: boolean) => {
    setSaving(true);
    await pushServerProfile({ ...p, completedAt: new Date().toISOString() });
    router.push(toPlacement ? "/placement" : "/");
  };

  const next = () => (step < 4 ? setStep(step + 1) : finish(false));

  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 16px 40px" }}>
      <header style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <Logo height={28} href="/" />
          <Link href="/" style={{ fontSize: 14, fontWeight: 550, color: "var(--ink-muted)", textDecoration: "none" }}>Thiết lập sau</Link>
        </div>
        <ol aria-label="Các bước thiết lập" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8 }}>
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i + 1 === step ? "step" : undefined} style={{ display: "flex", flexDirection: "column", gap: 8, font: "550 13px/18px var(--font-sans)", color: i + 1 === step ? "var(--ink)" : "var(--ink-muted)" }}>
              <i style={{ display: "block", height: 4, borderRadius: 2, background: i + 1 <= step ? "var(--brand)" : "var(--surface-sunken)" }} />{s}
            </li>
          ))}
        </ol>
      </header>

      <main className="st-enter stack" key={step} style={{ width: "100%", maxWidth: 720, flex: 1, gap: 28, paddingTop: 44 }}>
        {step === 1 && (<>
          <div><h1 style={{ font: "700 28px/36px var(--font-display)", letterSpacing: -0.6 }}>Bạn học IELTS để làm gì?</h1>
            <p className="ink2" style={{ marginTop: 6 }}>Studia dùng câu trả lời này để chọn dạng bài và chủ đề ưu tiên.</p></div>
          <div role="radiogroup" aria-label="Mục đích" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {PURPOSES.map(([t, d]) => (
              <button key={t} type="button" role="radio" aria-checked={p.purpose === t} style={pickCls(p.purpose === t)} onClick={() => set({ purpose: t })}>
                <b>{t}</b><span className="meta">{d}</span>
              </button>
            ))}
          </div>
          <div>
            <span className="field-label">Loại bài thi</span>
            <div className="seg" role="radiogroup" aria-label="Loại bài thi" style={{ marginTop: 10 }}>
              {(["Academic", "General Training"] as const).map((k) => (
                <button key={k} className="seg-btn" type="button" role="radio" aria-checked={p.kind === k} aria-pressed={p.kind === k} onClick={() => set({ kind: k })}>{k}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="field-label" id="band-l">Band mục tiêu</span>
            <div className="row-wrap" role="radiogroup" aria-labelledby="band-l" style={{ marginTop: 10 }}>
              {BANDS.map((b) => (
                <button key={b} type="button" role="radio" aria-checked={p.target === b} onClick={() => set({ target: b })}
                  style={{ height: 48, minWidth: 64, padding: "0 14px", borderRadius: "var(--radius-md)", border: `1.5px solid ${p.target === b ? "var(--brand)" : "var(--hairline)"}`, background: p.target === b ? "var(--brand)" : "var(--surface)", color: p.target === b ? "var(--on-brand)" : "var(--ink-secondary)", font: "650 17px/1 var(--font-display)", cursor: "pointer" }}>
                  {b.toFixed(1)}{b === 8 ? "+" : ""}
                </button>
              ))}
            </div>
          </div>
        </>)}

        {step === 2 && (<>
          <div><h1 style={{ font: "700 28px/36px var(--font-display)", letterSpacing: -0.6 }}>Khi nào bạn thi, và đang ở đâu?</h1>
            <p className="ink2" style={{ marginTop: 6 }}>Chưa có lịch thi cũng được — Studia sẽ đặt mốc 12 tuần.</p></div>
          <div className="grid-2" style={{ alignItems: "end" }}>
            <label className="field"><span className="field-label">Ngày thi dự kiến</span>
              <input className="input" type="date" value={p.examDate} disabled={p.noExam} onChange={(e) => set({ examDate: e.target.value })} /></label>
            <label className="row" style={{ gap: 10, height: 48, cursor: "pointer" }}>
              <input type="checkbox" checked={p.noExam} onChange={(e) => set({ noExam: e.target.checked })} />
              <span className="ink2">Tôi chưa đăng ký thi</span>
            </label>
          </div>
          <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--brand-tint)" }}>
            Lộ trình dự kiến <b className="num">{weeks} tuần</b>{weeks >= 8 ? " — đủ để tăng khoảng 0.5–1.0 band nếu học đều mỗi ngày." : " — khá gấp, hãy ưu tiên dạng bài hay sai."}
          </div>
          <div>
            <span className="field-label" id="lv-l">Trình độ hiện tại của bạn</span>
            <div role="radiogroup" aria-labelledby="lv-l" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 10 }}>
              {LEVELS.map(([t, d]) => (
                <button key={t} type="button" role="radio" aria-checked={p.level === t} style={pickCls(p.level === t)} onClick={() => set({ level: t })}>
                  <b>{t === "5.5–6.0" || t === "4.5–5.0" ? `Khoảng ${t}` : t}</b><span className="meta">{d}</span>
                </button>
              ))}
            </div>
            <p className="meta" style={{ marginTop: 10 }}>Không chắc? Chọn gần đúng — bài kiểm tra ở bước cuối sẽ điều chỉnh lại.</p>
          </div>
        </>)}

        {step === 3 && (<>
          <div><h1 style={{ font: "700 28px/36px var(--font-display)", letterSpacing: -0.6 }}>Mỗi ngày bạn dành được bao lâu?</h1>
            <p className="ink2" style={{ marginTop: 6 }}>Đều đặn quan trọng hơn học dồn. Có thể đổi bất cứ lúc nào trong Cài đặt.</p></div>
          <div role="radiogroup" aria-label="Thời gian mỗi ngày" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {MINUTES.map(([m, d]) => (
              <button key={m} type="button" role="radio" aria-checked={p.minutes === m} style={pickCls(p.minutes === m)} onClick={() => set({ minutes: m })}>
                <b>{m}{m === 60 ? "+" : ""} phút</b><span className="meta">{d}</span>
              </button>
            ))}
          </div>
          <div>
            <span className="field-label" id="d-l">Ngày học trong tuần</span>
            <div className="row-wrap" role="group" aria-labelledby="d-l" style={{ marginTop: 10 }}>
              {DAYS.map((d) => {
                const on = p.days.includes(d);
                return (
                  <button key={d} type="button" aria-pressed={on} onClick={() => set({ days: on ? p.days.filter((x) => x !== d) : [...p.days, d] })}
                    style={{ width: 48, height: 48, borderRadius: "50%", border: `1.5px solid ${on ? "var(--navy)" : "var(--hairline)"}`, background: on ? "var(--navy)" : "var(--surface)", color: on ? "var(--on-navy)" : "var(--ink-secondary)", font: "600 14px/1 var(--font-sans)", cursor: "pointer" }}>{d}</button>
                );
              })}
            </div>
          </div>
          <label className="field" style={{ maxWidth: 240 }}><span className="field-label">Nhắc học lúc</span>
            <input className="input" type="time" value={p.remindAt} onChange={(e) => set({ remindAt: e.target.value })} /></label>
        </>)}

        {step === 4 && (<>
          <div><h1 style={{ font: "700 28px/36px var(--font-display)", letterSpacing: -0.6 }}>Lộ trình {weeks} tuần tới band {p.target.toFixed(1)}</h1>
            <p className="ink2" style={{ marginTop: 6 }}>{p.kind} · {p.minutes} phút/ngày · {p.days.length} ngày/tuần{!p.noExam && p.examDate ? ` · thi ngày ${new Date(p.examDate).toLocaleDateString("vi-VN")}` : ""}</p></div>
          <section className="st-card" aria-label="Các giai đoạn">
            {phases.map(([w, t, d], i) => (
              <div key={t} style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr)", gap: 16, padding: "14px 0", borderTop: i ? "1px solid var(--hairline)" : 0 }}>
                <span className="eyebrow" style={{ color: i === 2 ? "var(--accent-strong)" : "var(--brand)" }}>{w}</span>
                <div><b style={{ fontWeight: 600 }}>{t}</b><p className="meta" style={{ marginTop: 2 }}>{d}</p></div>
              </div>
            ))}
          </section>
          <section className="navy-block row-wrap" style={{ justifyContent: "space-between", gap: 16 }}>
            <div style={{ maxWidth: 420 }}>
              <b style={{ font: "650 18px/24px var(--font-display)", color: "var(--on-navy)" }}>Làm bài kiểm tra trình độ?</b>
              <p style={{ marginTop: 4, fontSize: 14.5, opacity: 0.85 }}>24 câu từ vựng, ngữ pháp, đọc và nghe, khoảng 12 phút. Giúp lộ trình bắt đầu đúng chỗ.</p>
            </div>
            <button className="st-btn st-btn-accent" type="button" disabled={saving} onClick={() => finish(true)}>Làm bài kiểm tra</button>
          </section>
        </>)}
      </main>

      <footer style={{ width: "100%", maxWidth: 720, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 28, borderTop: "1px solid var(--hairline)", marginTop: 32 }}>
        <button className="st-btn st-btn-ghost" type="button" disabled={step === 1} onClick={() => setStep(step - 1)}>Quay lại</button>
        <span className="meta num">Bước {step} / 4</span>
        <button className="st-btn st-btn-primary" type="button" disabled={saving} onClick={next}>{step === 4 ? "Bỏ qua kiểm tra, bắt đầu học" : "Tiếp tục"}</button>
      </footer>
    </div>
  );
}
