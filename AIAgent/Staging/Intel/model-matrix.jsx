import { useState } from "react";

const models = [
  {
    name: "gpt-oss:20b",
    maker: "OpenAI",
    arch: "MoE",
    params: "20B (3.6B active)",
    vram: 14,
    vramLabel: "14 GB",
    speed24: 140,
    speed48: 140,
    context: "8K default",
    toolUse: "Good",
    toolScore: 3,
    quality: 55,
    tier: "12-16 GB",
    notes: "Your current model. MoE with MXFP4 quantization. Fast on 16GB+, CPU spillover on 12GB. Decent tool calling, strong reasoning for its active param count.",
    highlighted: true
  },
  {
    name: "gpt-oss:120b",
    maker: "OpenAI",
    arch: "MoE",
    params: "120B (5.1B active)",
    vram: 70,
    vramLabel: "70 GB",
    speed24: 0,
    speed48: 25,
    context: "8K default",
    toolUse: "Good",
    toolScore: 3,
    quality: 75,
    tier: "80 GB+",
    notes: "The big sibling. Needs enterprise GPU (H100) or heavy multi-GPU. Not realistic for home builds. Included for reference.",
    highlighted: false
  },
  {
    name: "qwen3:14b",
    maker: "Alibaba",
    arch: "Dense",
    params: "14B",
    vram: 12,
    vramLabel: "9-12 GB",
    speed24: 62,
    speed48: 62,
    context: "32K native",
    toolUse: "Strong",
    toolScore: 4,
    quality: 50,
    tier: "12-16 GB",
    notes: "Community favorite for 12GB GPUs. Best instruction-following in its class. Thinking mode for reasoning. 100% GPU on 16GB+ cards. Great fast-model candidate.",
    highlighted: false
  },
  {
    name: "qwen3:32b",
    maker: "Alibaba",
    arch: "Dense",
    params: "32B",
    vram: 23,
    vramLabel: "20-24 GB",
    speed24: 45,
    speed48: 64,
    context: "32K native",
    toolUse: "Very Strong",
    toolScore: 4,
    quality: 65,
    tier: "24 GB",
    notes: "Sweet spot for 24GB GPUs. Reliable tool calling, strong reasoning. Fits 100% on a single 3090/4090. Good balance of speed and capability.",
    highlighted: false
  },
  {
    name: "qwen2.5:72b-instruct",
    maker: "Alibaba",
    arch: "Dense",
    params: "72B",
    vram: 43,
    vramLabel: "40-48 GB",
    speed24: 0,
    speed48: 16,
    context: "32K native",
    toolUse: "Excellent",
    toolScore: 5,
    quality: 78,
    tier: "48 GB",
    notes: "The proven OpenClaw champion. Hegghammer gist: 16 t/s on 2×3090 with NVLink. Best local tool-use model tested. Q3 quant fits 48GB. Closest to Claude for agent work.",
    highlighted: true
  },
  {
    name: "qwen3-coder:32b",
    maker: "Alibaba",
    arch: "MoE",
    params: "30.5B (3.3B active)",
    vram: 20,
    vramLabel: "18-22 GB",
    speed24: 50,
    speed48: 50,
    context: "128K native",
    toolUse: "Very Strong",
    toolScore: 4,
    quality: 63,
    tier: "24 GB",
    notes: "Code-specialized MoE. Huge context window (128K). Great for dev assistant tasks. Low active params = fast inference. Community recommends as primary with glm-4.7 backup.",
    highlighted: false
  },
  {
    name: "deepseek-r1:32b",
    maker: "DeepSeek",
    arch: "Dense",
    params: "32B",
    vram: 23,
    vramLabel: "20-24 GB",
    speed24: 38,
    speed48: 64,
    context: "64K native",
    toolUse: "Good",
    toolScore: 3,
    quality: 68,
    tier: "24 GB",
    notes: "Strong reasoning model with chain-of-thought. Better at complex analysis than tool calling. 64K context. Good for research-heavy tasks.",
    highlighted: false
  },
  {
    name: "deepseek-v3.2:32b",
    maker: "DeepSeek",
    arch: "MoE",
    params: "32B distilled",
    vram: 20,
    vramLabel: "18-22 GB",
    speed24: 38,
    speed48: 38,
    context: "64K native",
    toolUse: "Good",
    toolScore: 3,
    quality: 70,
    tier: "24 GB",
    notes: "Distilled from 671B. Outperforms GPT-4 on some benchmarks. MIT license. Strong reasoning at low cost. 30-38 t/s on RTX 4090.",
    highlighted: false
  },
  {
    name: "llama4-scout",
    maker: "Meta",
    arch: "MoE",
    params: "109B (17B active)",
    vram: 35,
    vramLabel: "24-48 GB",
    speed24: 20,
    speed48: 30,
    context: "10M native",
    toolUse: "Good",
    toolScore: 3,
    quality: 62,
    tier: "24-48 GB",
    notes: "MoE with 16 experts. 10M context (industry-leading). Multimodal (text + vision). Int4 quant fits 24GB. GPT-4 class quality for its active params. Newer architecture.",
    highlighted: false
  },
  {
    name: "llama3.3:70b",
    maker: "Meta",
    arch: "Dense",
    params: "70B",
    vram: 45,
    vramLabel: "40-48 GB",
    speed24: 0,
    speed48: 12,
    context: "128K native",
    toolUse: "Good",
    toolScore: 3,
    quality: 72,
    tier: "48 GB",
    notes: "Solid all-rounder at 70B. 128K context. Well-supported ecosystem. Slightly behind Qwen 72B for OpenClaw tool use. ~8 t/s on single 3090, ~12 on dual.",
    highlighted: false
  },
  {
    name: "mistral-small:24b",
    maker: "Mistral",
    arch: "Dense",
    params: "24B",
    vram: 16,
    vramLabel: "14-18 GB",
    speed24: 93,
    speed48: 93,
    context: "32K native",
    toolUse: "Good",
    toolScore: 3,
    quality: 58,
    tier: "16-24 GB",
    notes: "Fast inference (93 t/s on 5090). Good language quality. Fits on 24GB easily. Weaker at complex agent chains than Qwen equivalents. Good fast-model option.",
    highlighted: false
  },
  {
    name: "glm-4.7-flash",
    maker: "Zhipu AI",
    arch: "Dense",
    params: "~26B",
    vram: 25,
    vramLabel: "22-28 GB",
    speed24: 0,
    speed48: 40,
    context: "128K native",
    toolUse: "Strong",
    toolScore: 4,
    quality: 64,
    tier: "24-32 GB",
    notes: "Community sleeper hit for OpenClaw. Multiple users report excellent tool use. Needs ~25GB so tight on single 24GB card (Q4 helps). Recommended as backup to qwen3-coder.",
    highlighted: false
  }
];

const QualityBar = ({ value, label }) => {
  const getColor = (v) => {
    if (v >= 75) return "#10b981";
    if (v >= 60) return "#f59e0b";
    if (v >= 45) return "#f97316";
    return "#ef4444";
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: getColor(value), borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 11, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{value}%</span>
    </div>
  );
};

const ToolDots = ({ score }) => {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: i <= score ? "#10b981" : "#1e293b",
          border: i <= score ? "none" : "1px solid #334155"
        }} />
      ))}
    </div>
  );
};

const SpeedDisplay = ({ val }) => {
  if (val === 0) return <span style={{ color: "#475569", fontSize: 12 }}>—</span>;
  const color = val >= 60 ? "#10b981" : val >= 30 ? "#f59e0b" : "#f97316";
  return <span style={{ color, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{val}</span>;
};

export default function ModelMatrix() {
  const [sortKey, setSortKey] = useState("quality");
  const [sortDir, setSortDir] = useState(-1);
  const [expandedRow, setExpandedRow] = useState(null);
  const [vramFilter, setVramFilter] = useState("all");

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(-1); }
  };

  const filtered = vramFilter === "all" ? models :
    vramFilter === "24" ? models.filter(m => m.vram <= 24) :
    vramFilter === "48" ? models.filter(m => m.vram <= 48) :
    models.filter(m => m.vram <= 16);

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === "number") return (av - bv) * sortDir;
    return String(av).localeCompare(String(bv)) * sortDir;
  });

  const SortHead = ({ label, field, width }) => (
    <th onClick={() => toggleSort(field)} style={{
      padding: "10px 12px", textAlign: "left", cursor: "pointer", userSelect: "none",
      fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
      color: sortKey === field ? "#e2e8f0" : "#64748b", width,
      borderBottom: "2px solid #1e293b", whiteSpace: "nowrap",
      background: sortKey === field ? "#0f172a" : "transparent"
    }}>
      {label} {sortKey === field ? (sortDir === 1 ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      background: "#0a0f1a", color: "#e2e8f0", minHeight: "100vh", padding: "24px 16px"
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #10b981, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            ZUBERI HOME — MODEL MATRIX
          </h1>
          <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0" }}>
            12 models ranked for local OpenClaw agent work. Click headers to sort. Click rows to expand.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[["all", "All Models"], ["16", "≤16GB VRAM"], ["24", "≤24GB VRAM"], ["48", "≤48GB VRAM"]].map(([val, label]) => (
            <button key={val} onClick={() => setVramFilter(val)} style={{
              padding: "6px 14px", borderRadius: 6, border: "1px solid",
              borderColor: vramFilter === val ? "#10b981" : "#1e293b",
              background: vramFilter === val ? "#10b98118" : "#0f172a",
              color: vramFilter === val ? "#10b981" : "#64748b",
              fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit"
            }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #1e293b" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0f172a" }}>
                <SortHead label="Model" field="name" width="160px" />
                <SortHead label="Params" field="params" width="120px" />
                <SortHead label="VRAM" field="vram" width="80px" />
                <SortHead label="t/s (24GB)" field="speed24" width="80px" />
                <SortHead label="t/s (48GB)" field="speed48" width="80px" />
                <SortHead label="Context" field="context" width="80px" />
                <SortHead label="Tool Use" field="toolScore" width="90px" />
                <SortHead label="≈ Claude" field="quality" width="110px" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr key={m.name} onClick={() => setExpandedRow(expandedRow === i ? null : i)} style={{ cursor: "pointer" }}>
                  <td style={{
                    padding: "10px 12px", borderBottom: "1px solid #1e293b",
                    background: expandedRow === i ? "#0f172a" : "transparent"
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{
                        fontWeight: 600, fontSize: 13,
                        color: m.highlighted ? "#10b981" : "#e2e8f0"
                      }}>
                        {m.name}
                      </span>
                      <span style={{ fontSize: 10, color: "#475569" }}>{m.maker} · {m.arch}</span>
                    </div>
                    {expandedRow === i && (
                      <div style={{
                        marginTop: 8, padding: "8px 10px", background: "#1e293b",
                        borderRadius: 6, fontSize: 11, lineHeight: 1.5, color: "#94a3b8"
                      }}>
                        {m.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b", fontSize: 12, color: "#94a3b8" }}>
                    {m.params}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: m.vram <= 16 ? "#10b981" : m.vram <= 24 ? "#f59e0b" : m.vram <= 48 ? "#f97316" : "#ef4444"
                    }}>
                      {m.vramLabel}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b" }}>
                    <SpeedDisplay val={m.speed24} />
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b" }}>
                    <SpeedDisplay val={m.speed48} />
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b", fontSize: 12, color: "#94a3b8" }}>
                    {m.context}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b" }}>
                    <ToolDots score={m.toolScore} />
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b" }}>
                    <QualityBar value={m.quality} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{
          marginTop: 16, padding: "12px 16px", background: "#0f172a",
          borderRadius: 8, border: "1px solid #1e293b", fontSize: 11, color: "#64748b", lineHeight: 1.6
        }}>
          <strong style={{ color: "#94a3b8" }}>Legend:</strong> t/s = tokens/second (100% GPU, estimated). ≈ Claude = approximate capability relative to Claude Opus for agent/tool-use work.
          VRAM = minimum for 100% GPU at default context. <span style={{ color: "#10b981" }}>Green models</span> = current or top recommended.
          Speeds are estimates from community benchmarks — your results will vary based on quantization, context length, and background load. Click any row to see notes.
        </div>
      </div>
    </div>
  );
}
