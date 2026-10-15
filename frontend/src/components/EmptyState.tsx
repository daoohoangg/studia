import Link from "next/link";

type Action = { label: string; href?: string; onClick?: () => void };

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Các bước gợi ý để người dùng biết bắt đầu từ đâu (đánh số 1, 2, 3). */
  steps?: { title: string; desc?: string; href?: string }[];
  primary?: Action;
  secondary?: Action;
  /** Nhỏ gọn hơn, dùng bên trong một thẻ khác. */
  compact?: boolean;
}

function ActionButton({ action, kind }: { action: Action; kind: "btn-primary" | "btn-secondary" }) {
  if (action.href) {
    return <Link href={action.href} className={kind}>{action.label}</Link>;
  }
  return <button type="button" className={kind} onClick={action.onClick}>{action.label}</button>;
}

export default function EmptyState({ title, description, steps, primary, secondary, compact }: EmptyStateProps) {
  return (
    <div
      className={compact ? undefined : "glass-panel fade-in-up"}
      style={{ padding: compact ? "24px 16px" : "48px 32px", textAlign: "center" }}
    >
      {!compact && (
        <svg width="96" height="72" viewBox="0 0 96 72" fill="none" aria-hidden="true" style={{ display: "block", margin: "0 auto 16px" }}>
          <path d="M8 20A16 16 0 0 1 24 4h38a4 4 0 0 1 4 4v28H24A16 16 0 0 1 8 20z" style={{ fill: "var(--brand-tint)" }} />
          <path d="M30 40h44a14 14 0 0 1 0 28H34a4 4 0 0 1-4-4z" style={{ fill: "var(--accent-tint)" }} />
          <path d="M22 20h30" style={{ stroke: "var(--brand)" }} strokeWidth="3" strokeLinecap="round" strokeDasharray="2 7" />
          <path d="M44 54h28" style={{ stroke: "var(--accent-strong)" }} strokeWidth="3" strokeLinecap="round" strokeDasharray="2 7" />
        </svg>
      )}
      <h2 style={{ fontSize: compact ? "1.05rem" : "1.4rem", marginBottom: 8 }}>{title}</h2>
      {description && (
        <p style={{
          color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto",
          marginBottom: steps || primary ? 24 : 0, lineHeight: 1.6,
          fontSize: compact ? "0.875rem" : "1rem",
        }}>
          {description}
        </p>
      )}

      {steps && steps.length > 0 && (
        <ol style={{
          listStyle: "none", display: "grid", gap: 10, maxWidth: 440, margin: "0 auto 24px",
          textAlign: "left", counterReset: "step",
        }}>
          {steps.map((s, i) => {
            const body = (
              <>
                <span style={{
                  width: 24, height: 24, flexShrink: 0, borderRadius: "var(--radius-full)",
                  background: "var(--brand-tint)", color: "var(--brand)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700,
                }}>
                  {i + 1}
                </span>
                <span>
                  <span style={{ display: "block", fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>{s.title}</span>
                  {s.desc && (
                    <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{s.desc}</span>
                  )}
                </span>
              </>
            );
            const style: React.CSSProperties = {
              display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px",
              borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)", textDecoration: "none", color: "inherit",
              transition: "border-color var(--dur-fast), transform var(--dur-fast) var(--ease-out)",
            };
            return (
              <li key={i}>
                {s.href ? <Link href={s.href} style={style}>{body}</Link> : <div style={style}>{body}</div>}
              </li>
            );
          })}
        </ol>
      )}

      {(primary || secondary) && (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {primary && <ActionButton action={primary} kind="btn-primary" />}
          {secondary && <ActionButton action={secondary} kind="btn-secondary" />}
        </div>
      )}
    </div>
  );
}
