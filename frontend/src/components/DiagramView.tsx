"use client";

import { useMemo } from "react";

type N = { id: string; label: string };
type E = { from: string; to: string; label?: string };

/** Đọc cú pháp Mermaid `graph TD` đơn giản (A["nhãn"] --> B[nhãn]) mà không cần thư viện ngoài. */
export function parseMermaid(code: string): { nodes: N[]; edges: E[] } | null {
  const nodes = new Map<string, N>();
  const edges: E[] = [];
  const nodeRe = /([A-Za-z0-9_]+)\s*(?:\[\s*"?([^\]"]*)"?\s*\]|\(\s*"?([^)"]*)"?\s*\)|\{\s*"?([^}"]*)"?\s*\})?/;
  const touch = (raw: string): string | null => {
    const m = raw.trim().match(nodeRe);
    if (!m) return null;
    const label = m[2] ?? m[3] ?? m[4];
    const prev = nodes.get(m[1]);
    nodes.set(m[1], { id: m[1], label: (label ?? prev?.label ?? m[1]).trim() });
    return m[1];
  };
  for (const line of code.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || /^(graph|flowchart|mindmap|%%)/i.test(t)) continue;
    const parts = t.split(/\s*(--?>|==>|-\.->)\s*(?:\|([^|]*)\|\s*)?/);
    if (parts.length < 3) { touch(t); continue; }
    // parts = [n0, arrow, label, n1, arrow, label, n2...]
    let prev = touch(parts[0]);
    for (let i = 1; i + 2 < parts.length + 1; i += 3) {
      const next = touch(parts[i + 2] ?? "");
      if (prev && next) edges.push({ from: prev, to: next, label: parts[i + 1]?.trim() || undefined });
      prev = next;
    }
  }
  if (nodes.size === 0 || edges.length === 0) return null;
  return { nodes: Array.from(nodes.values()), edges };
}

function wrap(label: string, max = 16): string[] {
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export default function DiagramView({ code }: { code: string }) {
  const g = useMemo(() => parseMermaid(code), [code]);
  if (!g) return <pre className="meta" style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>{code}</pre>;

  // Xếp tầng theo độ sâu (đường dài nhất từ gốc), chống vòng lặp bằng giới hạn số lượt
  const depth: Record<string, number> = {};
  g.nodes.forEach((n) => (depth[n.id] = 0));
  for (let i = 0; i < g.nodes.length; i++) {
    let changed = false;
    g.edges.forEach((e) => {
      if (depth[e.to] < depth[e.from] + 1 && depth[e.from] < g.nodes.length) { depth[e.to] = depth[e.from] + 1; changed = true; }
    });
    if (!changed) break;
  }
  const rows = Math.max(...Object.values(depth)) + 1;
  const byRow: N[][] = Array.from({ length: rows }, () => []);
  g.nodes.forEach((n) => byRow[depth[n.id]].push(n));
  const NW = 160, NH = 56, GX = 28, GY = 56;
  const widest = Math.max(...byRow.map((r) => r.length));
  const W = widest * (NW + GX) + GX;
  const H = rows * (NH + GY) + GY - 16;
  const pos: Record<string, { x: number; y: number }> = {};
  byRow.forEach((row, r) => {
    const total = row.length * (NW + GX) - GX;
    row.forEach((n, i) => { pos[n.id] = { x: (W - total) / 2 + i * (NW + GX), y: GY / 2 + r * (NH + GY) }; });
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sơ đồ ${g.nodes.length} khái niệm`} style={{ width: "100%", height: "auto", display: "block", minWidth: Math.min(W, 520) }}>
      <defs>
        <marker id="dg-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="var(--border-control)" /></marker>
      </defs>
      {g.edges.map((e, i) => {
        const a = pos[e.from], b = pos[e.to];
        if (!a || !b) return null;
        const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y;
        const my = (y1 + y2) / 2;
        return (
          <g key={i}>
            <path d={`M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2 - 2}`} fill="none" stroke="var(--border-control)" strokeWidth={2} markerEnd="url(#dg-ah)" />
            {e.label && <text x={(x1 + x2) / 2} y={my - 4} textAnchor="middle" style={{ font: "500 12px var(--font-sans)", fill: "var(--ink-muted)" }}>{e.label}</text>}
          </g>
        );
      })}
      {g.nodes.map((n) => {
        const p = pos[n.id];
        const lines = wrap(n.label);
        const root = depth[n.id] === 0;
        return (
          <g key={n.id}>
            <rect x={p.x} y={p.y} width={NW} height={NH} rx={14} fill={root ? "var(--navy)" : "var(--brand-tint)"} stroke={root ? "var(--navy)" : "var(--brand)"} strokeWidth={1.5} />
            {lines.map((l, i) => (
              <text key={i} x={p.x + NW / 2} y={p.y + NH / 2 + (i - (lines.length - 1) / 2) * 16 + 5} textAnchor="middle"
                style={{ font: "600 13px var(--font-sans)", fill: root ? "var(--on-navy)" : "var(--ink)" }}>{l}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
