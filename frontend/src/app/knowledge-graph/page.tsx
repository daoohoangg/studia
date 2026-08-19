"use client";

import { useState } from "react";
import Link from "next/link";
import { GitFork, Lock, Unlock, CheckCircle2, ArrowRight, BookOpen, Layers } from "lucide-react";

export default function KnowledgeGraphPage() {
  const [selectedNode, setSelectedNode] = useState<any>({
    id: "topic-3",
    name: "Attention Mechanism",
    difficulty: 4,
    mastery: 45.0,
    prerequisites: ["Đại Số Tuyến Tính", "Xác Suất Thống Kê"],
    status: "unlocked"
  });

  const nodes = [
    { id: "topic-1", name: "Đại Số Tuyến Tính", x: 100, y: 150, mastery: 85, status: "completed" },
    { id: "topic-2", name: "Xác Suất Thống Kê", x: 100, y: 350, mastery: 70, status: "completed" },
    { id: "topic-3", name: "Attention Mechanism", x: 400, y: 250, mastery: 45, status: "unlocked", prereqs: ["Đại Số Tuyến Tính", "Xác Suất Thống Kê"] },
    { id: "topic-4", name: "Self-Attention Math", x: 700, y: 150, mastery: 30, status: "unlocked", prereqs: ["Attention Mechanism"] },
    { id: "topic-5", name: "Transformer Architecture", x: 700, y: 350, mastery: 10, status: "locked", prereqs: ["Self-Attention Math"] }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header */}
      <div>
        <div className="badge badge-indigo" style={{ marginBottom: "8px" }}>
          <GitFork size={14} /> Relational Knowledge Graph (PostgreSQL Schema)
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: "800" }}>Sơ Đồ Tri Thức Cấu Trúc DAG</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Hệ thống quản lý các quan hệ phụ thuộc tiền đề (`prerequisite`) bằng quan hệ Bảng Relational trước khi scale-up sang Neo4j.
        </p>
      </div>

      {/* Main Container: Canvas Graph + Details Drawer */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "24px" }}>
        {/* Interactive Visual Graph Canvas */}
        <div className="glass-panel" style={{ padding: "24px", minHeight: "500px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "16px", left: "20px", display: "flex", gap: "12px", zIndex: 10 }}>
            <span className="badge badge-emerald"><CheckCircle2 size={12} /> Đã Đạt Mastery (&gt;60%)</span>
            <span className="badge badge-indigo"><Unlock size={12} /> Đã Mở Khóa Học</span>
            <span className="badge badge-rose"><Lock size={12} /> Khóa Tiền Đề</span>
          </div>

          <svg width="100%" height="450px" style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "12px" }}>
            {/* Edge Lines */}
            <line x1="180" y1="150" x2="330" y2="230" stroke="rgba(99,102,241,0.5)" strokeWidth="2" strokeDasharray="4" />
            <line x1="180" y1="350" x2="330" y2="270" stroke="rgba(99,102,241,0.5)" strokeWidth="2" strokeDasharray="4" />
            <line x1="470" y1="230" x2="630" y2="160" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <line x1="630" y1="160" x2="630" y2="330" stroke="rgba(244,63,94,0.4)" strokeWidth="2" strokeDasharray="2" />

            {/* Nodes Render */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const nodeBg = node.status === "completed" ? "#10b981" : (node.status === "unlocked" ? "#6366f1" : "#334155");

              return (
                <g key={node.id} onClick={() => setSelectedNode(node)} style={{ cursor: "pointer" }}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 36 : 30}
                    fill={nodeBg}
                    opacity={isSelected ? 1 : 0.85}
                    stroke={isSelected ? "#fff" : "rgba(255,255,255,0.3)"}
                    strokeWidth={isSelected ? 3 : 1}
                  />
                  <text
                    x={node.x}
                    y={node.y + 48}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {node.name}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="11"
                    fontWeight="800"
                  >
                    {node.mastery}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Topic Detail & Prerequisite Inspector */}
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="badge badge-indigo">NÚT CHỦ ĐỀ ĐƯỢC CHỌN</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800" }}>{selectedNode?.name}</h2>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              <span>Mức độ Mastery hiện tại:</span>
              <strong style={{ color: "#fff" }}>{selectedNode?.mastery}%</strong>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${selectedNode?.mastery}%` }}></div>
            </div>
          </div>

          <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--accent-cyan)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={16} /> Kiểm Tra Tiền Đề (Prerequisites Check)
            </h4>
            {selectedNode?.prereqs ? (
              <ul style={{ paddingLeft: "20px", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                {selectedNode.prereqs.map((p: string, i: number) => (
                  <li key={i} style={{ color: "#34d399" }}>Đã Đạt: {p} (Mastery &gt; 60%)</li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Chủ đề này không yêu cầu tiền đề ban đầu.</p>
            )}
          </div>

          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link href={`/lesson/${selectedNode?.id}`} className="btn-primary" style={{ justifyContent: "center" }}>
              <BookOpen size={16} /> Học Bài Luyện Tập Cá Nhân Hóa
            </Link>
            <Link href={`/quiz/${selectedNode?.id}`} className="btn-secondary" style={{ justifyContent: "center" }}>
              <GitFork size={16} /> Kiểm Tra Adaptive Quiz
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
