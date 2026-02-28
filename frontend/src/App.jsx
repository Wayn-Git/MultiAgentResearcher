import React, { useState, useEffect } from "react";

// ─── AGENT CONFIGURATION ─────────────────────────────────────────────────────
const AGENTS = [
  { id: "task", label: "Task Agent", icon: "⬡", desc: "Decomposes query into 3–5 research tasks", model: "llama-3.1-8b-instant", color: "#c8f7a0" },
  { id: "retrieval", label: "Retriever", icon: "◈", desc: "Fetches web sources via Tavily for each task", model: "llama-3.1-8b-instant + Tavily", color: "#a0d4f7" },
  { id: "synthesis", label: "Synthesizer", icon: "◎", desc: "Merges findings into unified summaries", model: "llama-3.1-8b-instant", color: "#f7d6a0" },
  { id: "gap", label: "Gap Detector", icon: "◑", desc: "Identifies missing coverage and weak areas", model: "llama-3.1-8b-instant", color: "#f7a0c8" },
  { id: "report", label: "Report Agent", icon: "▣", desc: "Generates structured final research report", model: "llama-3.1-8b-instant", color: "#c8a0f7" },
];

// ─── STYLES ──────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Mono:ital,wght@0,400;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0c0e0b;
    --surface: #131510;
    --surface2: #1a1d17;
    --border: rgba(200,247,160,0.1);
    --accent: #c8f7a0;
    --accent2: #a0d4f7;
    --accent3: #f7d6a0;
    --text: #e8eee0;
    --text-dim: rgba(232,238,224,0.4);
    --text-mid: rgba(232,238,224,0.65);
    --font-head: 'Cabinet Grotesk', sans-serif;
    --font-mono: 'Instrument Mono', monospace;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.6;
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed; inset: 0; z-index: 9999; pointer-events: none;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
  }

  .shell { display: grid; grid-template-columns: 260px 1fr; grid-template-rows: 56px 1fr; min-height: 100vh; }

  .topbar {
    grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; border-bottom: 1px solid var(--border); background: var(--surface);
    position: sticky; top: 0; z-index: 100;
  }

  .logo { font-family: var(--font-head); font-size: 15px; font-weight: 900; color: var(--accent); display: flex; align-items: center; gap: 8px; }
  .logo-icon { width: 28px; height: 28px; background: var(--accent); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--bg); font-size: 14px; font-weight: 900; }

  .sidebar { border-right: 1px solid var(--border); background: var(--surface); padding: 20px 0; overflow-y: auto; position: sticky; top: 56px; height: calc(100vh - 56px); }
  .sidebar-section { padding: 0 16px 24px; }
  .sidebar-section-label { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--text-dim); padding: 0 8px; margin-bottom: 10px; }

  .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; cursor: pointer; transition: all 0.15s; border-radius: 4px; margin-bottom: 2px; }
  .nav-item:hover { background: var(--surface2); }
  .nav-item.active { background: rgba(200,247,160,0.08); }
  .nav-item-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 1px solid var(--border); flex-shrink: 0; }
  .nav-item.active .nav-item-icon { border-color: var(--accent); color: var(--accent); }

  .pipeline-track { padding: 0 16px; }
  .pipeline-node { display: flex; align-items: flex-start; gap: 10px; padding: 10px 8px; border-radius: 4px; position: relative; }
  .pipeline-node::before { content: ''; position: absolute; left: 21px; top: 36px; width: 1px; height: calc(100% - 10px); background: var(--border); }
  .pipeline-node:last-child::before { display: none; }
  .pipeline-node-dot { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid; flex-shrink: 0; margin-top: 3px; position: relative; z-index: 1; }
  .pipeline-node-dot.active { box-shadow: 0 0 10px currentColor; }
  .pipeline-node-name { font-size: 11px; font-weight: 600; color: var(--text); font-family: var(--font-head); }
  .pipeline-node-desc { font-size: 10px; color: var(--text-dim); margin-top: 1px; }

  .main { overflow-y: auto; background: var(--bg); }
  .query-view, .report-view, .tasks-view, .gap-view, .settings-view { padding: 40px 48px 80px; }

  .query-hero-title { font-family: var(--font-head); font-size: 40px; font-weight: 900; line-height: 1.05; letter-spacing: -0.03em; color: var(--text); max-width: 600px; }
  .query-hero-title span { color: var(--accent); }

  .query-box { background: var(--surface); border: 1px solid var(--border); padding: 24px; margin: 40px 0; }
  .query-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-family: var(--font-mono); font-size: 15px; padding: 14px 16px; outline: none; }
  .query-input:focus { border-color: rgba(200,247,160,0.4); }

  .btn-run { background: var(--accent); color: var(--bg); border: none; cursor: pointer; font-family: var(--font-head); font-size: 13px; font-weight: 800; text-transform: uppercase; padding: 11px 24px; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
  .btn-run:hover { background: #d4ffa8; transform: translateY(-1px); }

  .report-tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
  .report-tab { background: none; border: none; cursor: pointer; font-family: var(--font-mono); font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-dim); padding: 12px 20px; position: relative; }
  .report-tab.active { color: var(--accent); }
  .report-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--accent); }

  .research-card { border: 1px solid var(--border); margin-bottom: 10px; background: var(--surface); cursor: pointer; transition: 0.15s; }
  .research-card.open { border-color: rgba(200,247,160,0.4); }
  .rc-header { display: flex; align-items: center; gap: 14px; padding: 16px 20px; }
  .rc-num { font-size: 10px; color: var(--accent); font-family: var(--font-mono); }
  .rc-title { font-family: var(--font-head); font-size: 13px; font-weight: 700; flex: 1; }
  .rc-body { padding: 4px 20px 20px 62px; animation: fadeIn 0.3s ease both; }

  .finding-pill { font-size: 10px; padding: 3px 9px; border: 1px solid rgba(200,247,160,0.25); color: rgba(200,247,160,0.7); background: rgba(200,247,160,0.04); margin-right: 6px; }

  .stat-row { display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
  .stat-card { border: 1px solid var(--border); padding: 16px 20px; flex: 1; min-width: 140px; background: var(--surface); }
  .stat-val { font-family: var(--font-head); font-size: 32px; font-weight: 900; color: var(--accent); }

  .assess-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .assess-card { border: 1px solid; padding: 20px 24px; }
  .assess-card.str { border-color: rgba(160,247,180,0.25); background: rgba(160,247,180,0.03); }
  .assess-card.lim { border-color: rgba(247,160,160,0.2); background: rgba(247,160,160,0.03); }

  .task-row { display: flex; gap: 16px; align-items: center; padding: 16px 20px; border: 1px solid var(--border); margin-bottom: 8px; background: var(--surface); }
  .priority-bar { width: 3px; height: 24px; border-radius: 2px; }

  .config-group { background: var(--surface); border: 1px solid var(--border); padding: 24px; margin-bottom: 20px; }
  .code-snippet { background: #0a0c09; border: 1px solid var(--border); padding: 16px 20px; font-family: var(--font-mono); font-size: 11px; white-space: pre; margin-top: 8px; }

  .spinner { width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const getPriorityColor = (p) => (p >= 8 ? "#c8f7a0" : p >= 6 ? "#a0d4f7" : "#f7d6a0");
const pad = (n) => String(n).padStart(2, "0");

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("query");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [data, setData] = useState(null);
  const [reportTab, setReportTab] = useState("summary");
  const [openCard, setOpenCard] = useState(null);

  const handleRunPipeline = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setView("query");
    
    // Simulate pipeline step visual
    let step = 0;
    const interval = setInterval(() => {
      setActiveStep(step);
      step++;
      if (step >= AGENTS.length) clearInterval(interval);
    }, 1500);

    try {
      const response = await fetch("http://localhost:8000/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = await response.json();
      setData(result);
      setView("report");
    } catch (err) {
      alert("Pipeline failure: Ensure FastAPI backend is running at localhost:8000");
    } finally {
      setLoading(false);
      setActiveStep(-1);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="logo"><div className="logo-icon">M</div> MultiAgent<span style={{ color: "var(--accent)" }}>Researcher</span></div>
          <div style={{ fontSize: "10px", letterSpacing: "2px", color: "var(--text-dim)" }}>
            {loading ? "PIPELINE_ACTIVE" : "SYSTEM_IDLE"}
          </div>
        </header>

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-section-label">Navigation</div>
            {[
              { id: "query", icon: "▷", label: "New Research" },
              { id: "report", icon: "▣", label: "Final Report", disabled: !data },
              { id: "tasks", icon: "⬡", label: "Task List", disabled: !data },
              { id: "gaps", icon: "◑", label: "Gap Analysis", disabled: !data },
              { id: "settings", icon: "◈", label: "Config & API" },
            ].map((item) => (
              <div 
                key={item.id} 
                className={`nav-item ${view === item.id ? "active" : ""} ${item.disabled ? "opacity-20 pointer-events-none" : ""}`}
                onClick={() => setView(item.id)}
              >
                <div className="nav-item-icon">{item.icon}</div>
                <span className="nav-item-label">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Live Pipeline</div>
            <div className="pipeline-track">
              {AGENTS.map((agent, i) => (
                <div key={agent.id} className="pipeline-node">
                  <div className={`pipeline-node-dot ${activeStep === i ? "active" : ""}`} style={{ borderColor: agent.color, color: agent.color }} />
                  <div className="pipeline-node-info">
                    <div className="pipeline-node-name">{agent.label}</div>
                    <div className="pipeline-node-desc">{agent.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main">
          {view === "query" && (
            <div className="query-view fade-in">
              <h1 className="query-hero-title">Autonomous research, <span>5 agents deep.</span></h1>
              <div className="query-box">
                <input 
                  className="query-input" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="Enter a research topic (e.g., iPhone 16 market trends)..."
                  onKeyDown={(e) => e.key === "Enter" && handleRunPipeline()}
                />
                <button className="btn-run" onClick={handleRunPipeline} style={{ marginTop: "16px" }}>
                  {loading ? <div className="spinner" /> : "▷ Start Research"}
                </button>
              </div>
            </div>
          )}

          {view === "report" && data && (
            <div className="report-view fade-in">
              <h1 style={{ fontFamily: "var(--font-head)", fontSize: "32px", marginBottom: "32px" }}>{query}</h1>
              
              <div className="report-tabs">
                {["summary", "research", "assessment", "gaps", "nextsteps"].map((t) => (
                  <button key={t} className={`report-tab ${reportTab === t ? "active" : ""}`} onClick={() => setReportTab(t)}>
                    {t}
                  </button>
                ))}
              </div>

              {reportTab === "summary" && (
                <div>
                  <div className="stat-row">
                    <div className="stat-card"><div className="stat-val">{data.tasks.length}</div><div className="stat-label">Tasks</div></div>
                    <div className="stat-card"><div className="stat-val">{data.report.overall_assessment.strengths.length}</div><div className="stat-label">Strengths</div></div>
                    <div className="stat-card"><div className="stat-val">{data.report.identified_gaps.length}</div><div className="stat-label">Gaps</div></div>
                  </div>
                  <div style={{ borderLeft: "3px solid var(--accent)", padding: "20px 32px", background: "var(--surface)" }}>
                    <p style={{ lineHeight: 1.8 }}>{data.report.executive_summary}</p>
                  </div>
                </div>
              )}

              {reportTab === "research" && (
                <div>
                  {data.report.research_sections.map((sec, i) => (
                    <div key={i} className={`research-card ${openCard === i ? "open" : ""}`} onClick={() => setOpenCard(openCard === i ? null : i)}>
                      <div className="rc-header">
                        <span className="rc-num">T{pad(i + 1)}</span>
                        <span className="rc-title">{sec.task}</span>
                      </div>
                      {openCard === i && (
                        <div className="rc-body">
                          <p style={{ fontStyle: "italic", marginBottom: "12px" }}>{sec.summary}</p>
                          {sec.key_findings.map((f, j) => <span key={j} className="finding-pill">{f}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {reportTab === "assessment" && (
                <div className="assess-grid">
                  <div className="assess-card str">
                    <div style={{ color: "#a0f7b4", fontSize: "10px", marginBottom: "16px" }}>STRENGTHS</div>
                    {data.report.overall_assessment.strengths.map((s, i) => <div key={i} style={{ marginBottom: "8px" }}>• {s}</div>)}
                  </div>
                  <div className="assess-card lim">
                    <div style={{ color: "#f7a0a0", fontSize: "10px", marginBottom: "16px" }}>LIMITATIONS</div>
                    {data.report.overall_assessment.limitations.map((l, i) => <div key={i} style={{ marginBottom: "8px" }}>• {l}</div>)}
                  </div>
                </div>
              )}
              {/* Add Gaps and NextSteps rendering similarly based on data.report.identified_gaps and recommended_next_steps */}
            </div>
          )}

          {view === "tasks" && data && (
            <div className="tasks-view fade-in">
              {data.tasks.map((task, i) => (
                <div key={i} className="task-row">
                  <div className="priority-bar" style={{ background: getPriorityColor(task.priority) }} />
                  <div style={{ flex: 1 }}>{task.description}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>PRIORITY: {task.priority}</div>
                </div>
              ))}
            </div>
          )}

          {view === "settings" && (
            <div className="settings-view fade-in">
              <div className="config-group">
                <div style={{ fontWeight: 700, marginBottom: "12px" }}>Environment Configuration</div>
                <div className="code-snippet">
                  GROQ_API_KEY=your_key_here{"\n"}
                  TAVILY_SEARCH_API=your_key_here
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}