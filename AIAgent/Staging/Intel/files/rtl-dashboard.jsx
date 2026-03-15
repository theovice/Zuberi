import { useState } from "react";

const PHASES = [
  {
    name: "Phase 1: Basic Setup",
    status: "complete",
    items: [
      { name: "OpenClaw installed", status: "complete" },
      { name: "Ollama serving qwen3:14b-fast", status: "complete" },
      { name: "Zuberi identity configured", status: "complete" },
      { name: "Dashboard webchat functional", status: "complete" },
      { name: "Workspace docs established", status: "complete" },
    ],
  },
  {
    name: "Phase 2: Networking",
    status: "complete",
    items: [
      { name: "EDUP WiFi adapter on CEG", status: "complete" },
      { name: "CEG on Tailscale", status: "complete" },
      { name: "KILO ↔ CEG confirmed", status: "complete" },
      { name: "SSH alias configured", status: "complete" },
    ],
  },
  {
    name: "Phase 3: Service Deployment",
    status: "complete",
    items: [
      { name: "SearXNG end-to-end", status: "complete" },
      { name: "CXDB end-to-end", status: "complete" },
      { name: "n8n wired", status: "complete" },
      { name: "Veritas-Kanban deployed", status: "complete" },
      { name: "Usage Tracker (CEG:3002)", status: "complete" },
    ],
  },
  {
    name: "Phase 3B: Autonomous Capabilities",
    status: "complete",
    items: [
      { name: "Model router skill (RTL-020)", status: "complete" },
      { name: "Context optimization (RTL-021/022)", status: "complete" },
      { name: "MEMORY.md cleanup (RTL-005)", status: "complete" },
      { name: "Ccode auth on CEG (RTL-012)", status: "complete" },
      { name: "HTTP dispatch :3003 (RTL-025)", status: "complete" },
      { name: "Usage meter UI (RTL-024)", status: "complete" },
      { name: "ZuberiChat render bug (RTL-026)", status: "complete" },
      { name: "ZuberiChat UI fixes (RTL-028)", status: "complete" },
      { name: "ZuberiChat sidebar + model selector (RTL-032)", status: "complete" },
      { name: "AgenticMail + email skill (RTL-016b)", status: "complete" },
      { name: "Vision skill", status: "future" },
    ],
  },
  {
    name: "Phase 4: Mission Launch",
    status: "active",
    items: [
      { name: "Local version poller (RTL-034)", status: "pending", note: "Designed — ready to build" },
      { name: "Hugging Face integration (RTL-033)", status: "pending", note: "Research complete" },
      { name: "First n8n workflow (RTL-002)", status: "future", note: "James testing independently" },
      { name: "MISSION-AEGIS strategy (RTL-014)", status: "future" },
      { name: "Revenue stream research", status: "future" },
      { name: "First revenue task", status: "future" },
    ],
  },
];

const CAPABILITIES = [
  { id: "C1", name: "Conversation", status: "complete" },
  { id: "C2", name: "Identity", status: "complete" },
  { id: "C3", name: "Long-term memory", status: "complete" },
  { id: "C4", name: "Web search", status: "complete" },
  { id: "C9", name: "Database access", status: "complete" },
  { id: "C10", name: "Task tracking", status: "complete" },
  { id: "C11", name: "Model selection", status: "complete" },
  { id: "C16", name: "Email", status: "complete" },
  { id: "C18", name: "Sub-agent dispatch", status: "complete" },
  { id: "C19", name: "Usage monitoring", status: "complete" },
  { id: "C7", name: "Workflow automation", status: "pending", note: "Wired, no workflows yet" },
  { id: "C6", name: "Code execution", status: "pending", note: "Gateway only" },
  { id: "C12", name: "Vision/OCR", status: "pending", note: "Model pulled, skill needed" },
  { id: "C5", name: "Package install", status: "blocked" },
  { id: "C8", name: "Spreadsheet gen", status: "blocked" },
  { id: "C13", name: "Diagrams", status: "blocked" },
  { id: "C14", name: "Browser automation", status: "blocked" },
  { id: "C15", name: "PDF/DOCX gen", status: "blocked" },
  { id: "C17", name: "External APIs", status: "blocked" },
];

const STATUS_CONFIG = {
  complete: { icon: "✅", label: "Complete", color: "#40916c", bg: "rgba(64,145,108,0.12)", border: "rgba(64,145,108,0.3)" },
  active: { icon: "🔄", label: "Active", color: "#48cae4", bg: "rgba(72,202,228,0.12)", border: "rgba(72,202,228,0.3)" },
  pending: { icon: "⬜", label: "Pending", color: "#f0a500", bg: "rgba(240,165,0,0.12)", border: "rgba(240,165,0,0.3)" },
  blocked: { icon: "⛔", label: "Blocked", color: "#e74c3c", bg: "rgba(231,76,60,0.12)", border: "rgba(231,76,60,0.3)" },
  future: { icon: "🔮", label: "Future", color: "#666", bg: "rgba(100,100,100,0.08)", border: "rgba(100,100,100,0.2)" },
};

function StatusBadge({ status, small }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: small ? 3 : 5,
        padding: small ? "1px 6px" : "2px 8px",
        borderRadius: 4,
        fontSize: small ? 11 : 12,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: small ? 10 : 12 }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function ProgressBar({ items }) {
  const total = items.length;
  const complete = items.filter((i) => i.status === "complete").length;
  const pct = Math.round((complete / total) * 100);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 3,
            background: pct === 100 ? "#40916c" : "linear-gradient(90deg, #48cae4, #40916c)",
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: pct === 100 ? "#40916c" : "#888",
          minWidth: 36,
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

function PhaseCard({ phase, expanded, onToggle }) {
  const cfg = STATUS_CONFIG[phase.status];

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${cfg.border}`,
        borderRadius: 6,
        marginBottom: 8,
        overflow: "hidden",
      }}
    >
      <div
        onClick={onToggle}
        style={{
          padding: "10px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, color: "#aaa", transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e0e0e0" }}>{phase.name}</span>
          <StatusBadge status={phase.status} small />
        </div>
        <ProgressBar items={phase.items} />
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 10px 38px" }}>
          {phase.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 0",
                borderTop: i === 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <span style={{ fontSize: 12 }}>{STATUS_CONFIG[item.status].icon}</span>
              <span
                style={{
                  fontSize: 13,
                  color: item.status === "complete" ? "#6a9" : item.status === "future" ? "#666" : "#ccc",
                  textDecoration: item.status === "complete" ? "line-through" : "none",
                  opacity: item.status === "complete" ? 0.7 : 1,
                }}
              >
                {item.name}
              </span>
              {item.note && (
                <span style={{ fontSize: 11, color: STATUS_CONFIG[item.status].color, opacity: 0.7 }}>
                  — {item.note}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryBar() {
  const allItems = PHASES.flatMap((p) => p.items);
  const counts = {};
  Object.keys(STATUS_CONFIG).forEach((s) => {
    counts[s] = allItems.filter((i) => i.status === s).length;
  });
  const total = allItems.length;

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
      {Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([status, count]) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <div
              key={status}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 6,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
              }}
            >
              <span style={{ fontSize: 14 }}>{cfg.icon}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: cfg.color, fontFamily: "'JetBrains Mono', monospace" }}>
                {count}
              </span>
              <span style={{ fontSize: 11, color: cfg.color, opacity: 0.8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {cfg.label}
              </span>
            </div>
          );
        })}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 6,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          marginLeft: "auto",
        }}
      >
        <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Total</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace" }}>
          {total}
        </span>
      </div>
    </div>
  );
}

function CapabilityGrid() {
  const sorted = [...CAPABILITIES].sort((a, b) => {
    const order = { complete: 0, active: 1, pending: 2, blocked: 3, future: 4 };
    return order[a.status] - order[b.status];
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 6 }}>
      {sorted.map((cap) => {
        const cfg = STATUS_CONFIG[cap.status];
        return (
          <div
            key={cap.id}
            style={{
              padding: "8px 10px",
              borderRadius: 4,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 12 }}>{cfg.icon}</span>
            <div>
              <div style={{ fontSize: 12, color: cfg.color, fontWeight: 500 }}>{cap.name}</div>
              {cap.note && <div style={{ fontSize: 10, color: cfg.color, opacity: 0.6 }}>{cap.note}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RTLDashboard() {
  const [expanded, setExpanded] = useState({ 3: true });
  const [tab, setTab] = useState("phases");

  const toggle = (i) => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div
      style={{
        background: "#0d1117",
        color: "#e0e0e0",
        minHeight: "100vh",
        padding: "24px 20px",
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e0e0e0", margin: 0 }}>
              🔧 Zuberi RTL
            </h1>
            <span style={{ fontSize: 12, color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>v0.9.0</span>
          </div>
          <p style={{ fontSize: 12, color: "#666", margin: 0 }}>
            Roadmap to Launch — Wahwearro Holdings LLC
          </p>
        </div>

        <SummaryBar />

        <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {["phases", "capabilities"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "none",
                border: "none",
                padding: "8px 16px",
                color: tab === t ? "#48cae4" : "#666",
                fontSize: 13,
                fontWeight: tab === t ? 600 : 400,
                cursor: "pointer",
                borderBottom: tab === t ? "2px solid #48cae4" : "2px solid transparent",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "phases" && (
          <div>
            {PHASES.map((phase, i) => (
              <PhaseCard key={i} phase={phase} expanded={!!expanded[i]} onToggle={() => toggle(i)} />
            ))}
          </div>
        )}

        {tab === "capabilities" && <CapabilityGrid />}

        <div style={{ marginTop: 20, padding: "10px 12px", background: "rgba(72,202,228,0.08)", border: "1px solid rgba(72,202,228,0.2)", borderRadius: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#48cae4", marginBottom: 4 }}>⬜ Next Up — P1</div>
          <div style={{ fontSize: 13, color: "#ccc" }}>
            RTL-034: Local version poller — amber dot in titlebar + sidebar version indicator, polling version.json in repo. Designed and ready to build.
          </div>
        </div>

        <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(240,165,0,0.08)", border: "1px solid rgba(240,165,0,0.2)", borderRadius: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#f0a500", marginBottom: 4 }}>🔮 Phase 4 Queued</div>
          <div style={{ fontSize: 13, color: "#ccc" }}>
            RTL-033: Hugging Face integration (research complete). RTL-002: n8n workflows (James testing). RTL-014: MISSION-AEGIS strategy.
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#444" }}>
          Updated 2026-03-06 · Session 12 · Architect 12
        </div>
      </div>
    </div>
  );
}
