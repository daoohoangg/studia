import Link from "next/link";

/**
 * Logo Studia — hai bong bóng hội thoại xếp lệch thành chữ S + chữ "studia".
 * Màu theo theme qua --logo-ink / --logo-accent (xem DESIGN.md).
 */
const MARK_TOP = "M4 13.5A9.5 9.5 0 0 1 13.5 4H34a2 2 0 0 1 2 2v17H13.5A9.5 9.5 0 0 1 4 13.5z";
const MARK_BOT = "M12 25h22.5a9.5 9.5 0 0 1 0 19H14a2 2 0 0 1-2-2z";

function Wordmark() {
  return (
    <g>
      <g fill="none" stroke="var(--logo-ink)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 19H8a4.5 4.5 0 0 0 0 9h2a4.5 4.5 0 0 1 0 9H3" />
        <g transform="translate(3 0)">
          <path d="M26 8v23a6 6 0 0 0 6 6M21 19h10" />
          <path d="M42 19v12a6 6 0 0 0 12 0V19M54 19v18" />
          <circle cx={72} cy={28} r={9} />
          <path d="M81 6v31" />
          <path d="M93 19v18" />
          <circle cx={114} cy={28} r={9} />
          <path d="M123 19v18" />
        </g>
      </g>
      <circle className="idot" cx={96} cy={8.5} r={4} fill="var(--logo-accent)" />
    </g>
  );
}

export default function Logo({
  variant = "lockup",
  height = 28,
  href,
  className,
}: {
  variant?: "lockup" | "mark" | "wordmark";
  height?: number;
  href?: string;
  className?: string;
}) {
  const mark = (
    <>
      <path className="b-top" d={MARK_TOP} fill="var(--logo-ink)" />
      <path className="b-bot" d={MARK_BOT} fill="var(--logo-accent)" />
    </>
  );
  const [vbW, vbH] = variant === "mark" ? [48, 48] : variant === "wordmark" ? [130, 44] : [190, 48];
  const svg = (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} width={(height * vbW) / vbH} height={height} aria-hidden="true">
      {variant === "mark" && mark}
      {variant === "wordmark" && <Wordmark />}
      {variant === "lockup" && (
        <>
          {mark}
          <g transform="translate(60 4)"><Wordmark /></g>
        </>
      )}
    </svg>
  );
  const cls = `studia-logo${className ? " " + className : ""}`;
  return href ? (
    <Link href={href} className={cls} aria-label="Studia — Trang chủ">{svg}</Link>
  ) : (
    <span className={cls} role="img" aria-label="Studia">{svg}</span>
  );
}
