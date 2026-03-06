import React, { useState, useEffect, useRef, useCallback, Component } from "react";

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error("[ErrorBoundary]", e, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: "rgba(247,160,160,0.07)", border: "1px solid rgba(247,160,160,0.3)",
          borderRadius: 8, padding: "13px 17px", fontSize: 12, color: "#f7a0a0", margin: "4px 0",
        }}>
          ⚠ Render error: {String(this.state.error.message || this.state.error)}
        </div>
      );
    }
    return this.props.children;
  }
}

const API_BASE = "http://localhost:8000";

// ─── AGENT METADATA ───────────────────────────────────────────────────────────
const AGENTS = {
  task:           { label: "Task Agent",       icon: "⬡", color: "#EBD5AB", desc: "Decomposing query into research tasks" },
  retrieval:      { label: "Retriever",         icon: "◈", color: "#8BAE66", desc: "Fetching web sources via Tavily" },
  synthesis:      { label: "Synthesizer",       icon: "◎", color: "#628141", desc: "Merging findings into unified summaries" },
  critic:         { label: "Critic",            icon: "⟳", color: "#f7c77a", desc: "Critiquing & refining each synthesis" },
  cross_synthesis:{ label: "Cross-Synthesizer", icon: "⬡", color: "#a0d4f7", desc: "Finding emergent cross-task insights" },
  gap:            { label: "Gap Detector",      icon: "◑", color: "#EBD5AB", desc: "Identifying missing coverage & weak areas" },
  report:         { label: "Report Agent",      icon: "▣", color: "#8BAE66", desc: "Generating the final research report" },
  error:          { label: "Error",             icon: "✕", color: "#ff8484", desc: "" },
};

const PIPELINE_ORDER = ["task", "retrieval", "synthesis", "critic", "cross_synthesis", "gap", "report"];

const pad = (n) => String(n).padStart(2, "0");
const priorityColor = (p) => {
  const n = typeof p === "string" ? (p === "high" ? 9 : p === "low" ? 3 : 5) : Number(p);
  return n >= 8 ? "#EBD5AB" : n >= 6 ? "#8BAE66" : n >= 4 ? "#628141" : "#EBD5AB";
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #141913;
    --surface: #1B211A;
    --surface2: rgba(98, 129, 65, 0.15);
    --surface3: #628141;
    --border: rgba(235, 213, 171, 0.1);
    --border-hi: rgba(235, 213, 171, 0.25);
    --accent:  #EBD5AB;
    --accent2: #8BAE66;
    --accent3: #628141;
    --text:    #EBD5AB;
    --text-mid:rgba(235, 213, 171, 0.75);
    --text-dim:rgba(235, 213, 171, 0.45);
    --font: 'Outfit', sans-serif;
    --mono: 'JetBrains Mono', monospace;
    --r: 14px;
    --r-sm: 8px;
    --shadow: 0 8px 24px rgba(0,0,0,0.3);
    --critic: #f7c77a;
    --cross: #a0d4f7;
  }
  html, body, #root { height:100%; }
  body { background:var(--bg); color:var(--text); font-family:var(--font); font-size:15px; line-height:1.6; overflow:hidden; }
  ::-webkit-scrollbar { width:6px; height:6px; }
  ::-webkit-scrollbar-thumb { background:var(--accent3); border-radius:6px; }

  @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 rgba(235,213,171,0.3);} 50%{box-shadow:0 0 0 6px rgba(235,213,171,0);} }
  @keyframes blink { 0%,100%{opacity:.3;transform:scale(.8);} 50%{opacity:1;transform:scale(1.2); box-shadow: 0 0 10px var(--accent);} }
  @keyframes spin { to{transform:rotate(360deg);} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
  @keyframes shimmer { 0%{left:-100%;} 100%{left:200%;} }
  @keyframes scoreReveal { from{width:0} to{width:var(--w)} }

  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }

  /* ── Layout ── */
  .shell { display:flex; flex-direction:column; align-items:center; width:100vw; height:100vh; overflow:hidden; position:relative; }
  .topbar { width:100%; height:76px; display:flex; align-items:center; justify-content:space-between; padding:0 40px; background:rgba(20,25,19,0.7); backdrop-filter:blur(24px); z-index:100; border-bottom:1px solid rgba(235,213,171,0.05); position:absolute; top:0; left:0; pointer-events:none; }
  .topbar > * { pointer-events:auto; }
  .chat-area { flex:1; width:100%; display:flex; flex-direction:column; overflow:hidden; background:radial-gradient(circle at top, rgba(98,129,65,0.15) 0%, var(--bg) 100%); position:relative; padding-top:76px; }

  /* ── Topbar ── */
  .logo { display:flex; align-items:center; gap:12px; font-weight:800; font-size:18px; letter-spacing:0.5px; }
  .logo-badge { width:32px; height:32px; background:linear-gradient(135deg,var(--accent),var(--accent2)); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#1B211A; font-weight:900; font-size:16px; flex-shrink:0; box-shadow:var(--shadow); }
  .logo span { color:var(--accent); }
  .top-right { display:flex; align-items:center; gap:16px; }
  .status-pill { font-size:12px; font-weight:600; font-family:var(--mono); padding:8px 18px; border-radius:30px; border:1px solid var(--accent3); color:var(--accent2); background:rgba(98,129,65,0.1); transition:all .4s; }
  .status-pill.live { border-color:var(--accent); color:var(--accent); background:rgba(235,213,171,0.1); animation:pulseGlow 2s infinite; }
  .btn-history { background:rgba(235,213,171,0.05); border:1px solid rgba(235,213,171,0.2); color:var(--accent); padding:8px 20px; border-radius:30px; font-family:var(--font); font-size:14px; font-weight:600; cursor:pointer; transition:all 0.3s; display:flex; align-items:center; gap:8px; backdrop-filter:blur(10px); }
  .btn-history:hover { border-color:var(--accent); background:rgba(235,213,171,0.15); transform:translateY(-1px); box-shadow:0 4px 12px rgba(235,213,171,0.1); }

  /* ── Sidebar ── */
  .sidebar-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(8px); z-index:1000; opacity:0; pointer-events:none; transition:opacity 0.4s cubic-bezier(0.16,1,0.3,1); }
  .sidebar-backdrop.open { opacity:1; pointer-events:auto; }
  .sidebar { position:fixed; top:0; bottom:0; left:0; width:340px; background:rgba(27,33,26,0.95); backdrop-filter:blur(20px); border-right:1px solid var(--border-hi); z-index:1001; transform:translateX(-100%); transition:transform 0.5s cubic-bezier(0.16,1,0.3,1); display:flex; flex-direction:column; box-shadow:20px 0 40px rgba(0,0,0,0.5); }
  .sidebar.open { transform:translateX(0); }
  .sb-head { padding:32px 24px 20px; display:flex; flex-direction:column; gap:20px; }
  .sb-header-row { display:flex; align-items:center; justify-content:space-between; }
  .sb-title { font-size:18px; font-weight:800; color:var(--accent); }
  .btn-close { background:rgba(255,255,255,0.05); border:none; width:32px; height:32px; border-radius:50%; color:var(--text-mid); font-size:14px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; }
  .btn-close:hover { color:var(--bg); background:var(--accent); transform:rotate(90deg); }
  .btn-new { width:100%; padding:14px; border:1px dashed var(--accent3); background:rgba(98,129,65,0.05); color:var(--accent); font-family:var(--font); font-weight:700; font-size:15px; cursor:pointer; border-radius:var(--r); display:flex; align-items:center; justify-content:center; gap:10px; transition:all .3s; }
  .btn-new:hover { border-color:var(--accent); background:rgba(235,213,171,0.1); transform:translateY(-2px); }
  .sb-label { font-size:12px; font-weight:800; letter-spacing:2.5px; text-transform:uppercase; color:var(--accent2); margin-bottom:12px; padding:0 24px; opacity:0.8; }
  .session-list { flex:1; overflow-y:auto; padding:0 16px 24px; }
  .sess { display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:var(--r); cursor:pointer; margin-bottom:8px; transition:all .2s; border:1px solid transparent; background:rgba(0,0,0,0.15); }
  .sess:hover { background:var(--surface2); transform:translateX(6px); border-color:rgba(139,174,102,0.2); }
  .sess.active { background:rgba(235,213,171,0.08); border-color:var(--accent3); box-shadow:inset 4px 0 0 var(--accent); }
  .sess-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; box-shadow:0 0 8px currentColor; }
  .sess-title { font-size:15px; font-weight:500; color:var(--text-mid); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
  .sess.active .sess-title { color:var(--accent); font-weight:700; }
  .sess-tick { font-size:14px; color:var(--accent); flex-shrink:0; font-weight:800; }

  /* ── Pipeline inline ── */
  .pipe-live-inline { position:absolute; bottom:calc(100% + 12px); left:50%; transform:translateX(-50%); display:flex; gap:12px; background:rgba(20,25,19,0.9); padding:8px 20px; border-radius:30px; border:1px solid var(--border-hi); backdrop-filter:blur(10px); box-shadow:0 8px 24px rgba(0,0,0,0.3); flex-wrap:wrap; justify-content:center; width:max-content; max-width:100%; z-index:-1; animation:slideUp 0.4s cubic-bezier(0.16,1,0.3,1); }
  .pipe-inline-item { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; font-family:var(--mono); transition:color 0.3s; }

  /* ── Chat ── */
  .msgs { flex:1; overflow-y:auto; padding:40px 0 160px; scroll-behavior:smooth; }
  .msgs-inner { max-width:960px; margin:0 auto; padding:0 24px; display:flex; flex-direction:column; gap:32px; }
  .msg-user { display:flex; justify-content:flex-end; margin-bottom:20px; }
  .user-bub { background:linear-gradient(135deg,var(--accent3),var(--surface)); border:1px solid var(--accent2); color:var(--accent); padding:16px 24px; border-radius:24px 24px 4px 24px; max-width:75%; font-size:16px; font-weight:500; box-shadow:var(--shadow); }
  .msg-agent { display:flex; flex-direction:column; background:rgba(27,33,26,0.4); border:1px solid var(--border); border-radius:var(--r); padding:20px; box-shadow:0 4px 24px rgba(0,0,0,0.1); backdrop-filter:blur(10px); }
  .ag-head { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
  .ag-ic { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; border:1px solid var(--accent3); background:var(--bg); box-shadow:0 2px 8px rgba(0,0,0,0.2); }
  .ag-name { font-size:15px; font-weight:700; letter-spacing:0.5px; }
  .ag-sub { font-size:12px; color:var(--accent2); font-family:var(--mono); margin-top:2px; }
  .ag-body { margin-left:50px; }
  .thinking { background:var(--surface2); border:1px solid var(--accent3); border-radius:var(--r); padding:16px 20px; display:flex; align-items:center; gap:14px; width:max-content; }
  .dots { display:flex; gap:6px; }
  .d { width:6px; height:6px; border-radius:50%; background:var(--accent); animation:blink 1.2s infinite ease-in-out; }
  .d:nth-child(2){animation-delay:.2s;} .d:nth-child(3){animation-delay:.4s;}

  /* ── Shared ── */
  .sec-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:var(--accent2); margin-bottom:10px; }
  .kp-list { display:flex; flex-direction:column; gap:8px; }
  .kp-item { display:flex; gap:12px; font-size:14px; color:var(--text-mid); line-height:1.6; }
  .kp-bullet { flex-shrink:0; margin-top:2px; font-size:12px; }
  .tags-row { display:flex; flex-wrap:wrap; gap:8px; }
  .tag { font-size:12px; padding:6px 14px; border-radius:20px; border:1px solid var(--accent3); color:var(--accent); background:rgba(98,129,65,0.1); }
  .tag.w { border-color:#d4a0a0; color:#ffb3b3; background:rgba(212,160,160,0.1); }
  .tag.blue { border-color:rgba(160,212,247,0.4); color:#a0d4f7; background:rgba(160,212,247,0.08); }
  .divider { border:none; border-top:1px solid var(--border); margin:0 20px 18px; }

  /* ── Task Cards ── */
  .tasks-wrap { display:flex; flex-direction:column; gap:12px; }
  .task-c { background:var(--bg); border:1px solid var(--border); border-radius:var(--r); padding:16px 20px; display:flex; gap:14px; align-items:flex-start; transition:all .2s; }
  .task-c:hover { border-color:var(--accent2); transform:translateX(5px); box-shadow:var(--shadow); }
  .t-num { font-family:var(--mono); font-size:12px; font-weight:600; color:var(--accent); min-width:30px; margin-top:2px; }
  .t-desc { font-size:15px; flex:1; line-height:1.6; }
  .t-badge { font-size:11px; font-weight:600; font-family:var(--mono); padding:4px 12px; border-radius:20px; flex-shrink:0; text-transform:uppercase; letter-spacing:1px; }

  /* ── Retrieval ── */
  .retrieval-wrap { display:flex; flex-direction:column; gap:16px; }
  .task-block { background:var(--bg); border:1px solid var(--border); border-radius:var(--r); overflow:hidden; }
  .task-block-head { padding:16px 20px; border-bottom:1px solid transparent; display:flex; align-items:center; gap:12px; cursor:pointer; transition:background .2s; }
  .task-block-head:hover { background:var(--surface2); }
  .task-block-head.open { background:var(--surface2); border-bottom-color:var(--accent3); }
  .tb-num { font-family:var(--mono); font-size:12px; font-weight:600; color:var(--accent); }
  .tb-title { font-size:15px; font-weight:600; flex:1; }
  .tb-count { font-size:11px; color:var(--accent2); font-family:var(--mono); background:rgba(139,174,102,0.1); padding:4px 10px; border-radius:12px; }
  .tb-chev { font-size:12px; color:var(--accent); transition:transform .3s; }
  .tb-chev.open { transform:rotate(90deg); }
  .sources-list { display:flex; flex-direction:column; background:rgba(0,0,0,0.2); }
  .source-item { padding:20px; border-top:1px solid var(--border); }
  .source-title { font-size:15px; font-weight:600; color:var(--accent); }
  .source-org { font-size:11px; font-family:var(--mono); color:var(--accent2); background:rgba(139,174,102,0.1); padding:2px 8px; border-radius:4px; display:inline-block; margin-top:4px; }
  .source-summary { font-size:14px; color:var(--text-mid); line-height:1.8; margin:10px 0 14px 24px; }

  /* ── Synthesis ── */
  .synth-wrap { display:flex; flex-direction:column; gap:16px; }
  .synth-card { background:var(--bg); border:1px solid var(--border); border-radius:var(--r); overflow:hidden; transition:all 0.3s; }
  .synth-card:hover { border-color:var(--accent3); }
  .sc-head { display:flex; align-items:center; gap:12px; padding:18px 20px; cursor:pointer; transition:background .2s; }
  .sc-head:hover { background:var(--surface2); }
  .synth-card.open .sc-head { background:var(--surface2); border-bottom:1px solid var(--accent3); }
  .sc-num { font-family:var(--mono); font-size:12px; font-weight:600; color:var(--accent); }
  .sc-task { font-size:15px; font-weight:600; flex:1; line-height:1.4; }
  .sc-chev { font-size:12px; color:var(--accent); transition:transform .3s; }
  .synth-card.open .sc-chev { transform:rotate(90deg); }
  .sc-body { border-top:1px solid var(--border); background:rgba(0,0,0,0.1); }
  .sc-section { padding:16px 20px; }

  /* ── Critic ── */
  .critic-wrap { display:flex; flex-direction:column; gap:16px; }
  .critic-summary-bar { display:flex; align-items:center; gap:16px; padding:16px 20px; background:rgba(247,199,122,0.06); border:1px solid rgba(247,199,122,0.2); border-radius:var(--r); margin-bottom:4px; }
  .critic-avg { font-family:var(--mono); font-size:28px; font-weight:800; color:var(--critic); }
  .critic-avg-label { font-size:11px; color:rgba(247,199,122,0.6); text-transform:uppercase; letter-spacing:1.5px; }
  .critic-task-card { background:var(--bg); border:1px solid rgba(247,199,122,0.15); border-radius:var(--r); overflow:hidden; transition:all 0.3s; }
  .critic-task-card:hover { border-color:rgba(247,199,122,0.35); }
  .critic-head { display:flex; align-items:center; gap:12px; padding:16px 20px; cursor:pointer; transition:background .2s; }
  .critic-head:hover { background:rgba(247,199,122,0.04); }
  .critic-task-card.open .critic-head { background:rgba(247,199,122,0.06); border-bottom:1px solid rgba(247,199,122,0.2); }
  .critic-chev { font-size:12px; color:var(--critic); transition:transform .3s; }
  .critic-task-card.open .critic-chev { transform:rotate(90deg); }
  .score-bar-wrap { flex:1; }
  .score-bar-track { height:6px; background:rgba(255,255,255,0.07); border-radius:6px; overflow:hidden; margin-top:6px; }
  .score-bar-fill { height:100%; border-radius:6px; transition:width 1s cubic-bezier(0.16,1,0.3,1); }
  .critic-body { padding:20px; }
  .critique-item { display:flex; gap:12px; padding:12px 16px; background:rgba(247,199,122,0.04); border:1px solid rgba(247,199,122,0.12); border-radius:var(--r-sm); margin-bottom:8px; }
  .critique-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:6px; }
  .critique-problem { font-size:13px; color:rgba(247,199,122,0.9); line-height:1.6; }
  .critique-fix { font-size:12px; color:var(--text-dim); margin-top:4px; font-style:italic; line-height:1.5; }
  .refined-badge { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-family:var(--mono); padding:4px 12px; border-radius:20px; background:rgba(160,247,180,0.1); border:1px solid rgba(160,247,180,0.3); color:#a0f7b4; }

  /* ── Cross Synthesis ── */
  .cross-wrap { display:flex; flex-direction:column; gap:16px; }
  .central-arg { padding:24px; background:linear-gradient(135deg, rgba(160,212,247,0.1), rgba(27,33,26,0.8)); border:1px solid rgba(160,212,247,0.3); border-radius:var(--r); position:relative; overflow:hidden; }
  .central-arg::before { content:''; position:absolute; top:0; left:-100%; width:60%; height:100%; background:linear-gradient(90deg,transparent,rgba(160,212,247,0.05),transparent); animation:shimmer 6s infinite linear; }
  .central-arg-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:rgba(160,212,247,0.7); margin-bottom:10px; }
  .central-arg-text { font-size:16px; font-weight:500; color:var(--text); line-height:1.75; }
  .cross-section { background:var(--bg); border:1px solid var(--border); border-radius:var(--r); overflow:hidden; }
  .cross-section-head { padding:16px 20px; border-bottom:1px solid var(--border); background:rgba(160,212,247,0.04); display:flex; align-items:center; gap:10px; }
  .cross-section-label { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#a0d4f7; flex:1; }
  .cross-section-count { font-size:11px; font-family:var(--mono); color:rgba(160,212,247,0.5); }
  .cross-insight { padding:18px 20px; border-top:1px solid var(--border); }
  .cross-insight:first-child { border-top:none; }
  .cross-insight-text { font-size:15px; font-weight:600; color:var(--text); line-height:1.5; margin-bottom:8px; }
  .cross-insight-mechanism { font-size:13px; color:var(--text-mid); line-height:1.6; margin-bottom:6px; }
  .cross-insight-implication { font-size:12px; color:#a0d4f7; line-height:1.5; }
  .cross-insight-sources { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
  .cross-source-pill { font-size:11px; font-family:var(--mono); padding:3px 10px; border-radius:20px; background:rgba(160,212,247,0.08); border:1px solid rgba(160,212,247,0.2); color:rgba(160,212,247,0.8); }
  .contradiction-item { padding:18px 20px; border-top:1px solid var(--border); }
  .contradiction-vs { display:flex; gap:14px; margin-bottom:10px; }
  .contra-side { flex:1; padding:10px 14px; border-radius:var(--r-sm); font-size:13px; line-height:1.5; }
  .contra-a { background:rgba(160,212,247,0.06); border:1px solid rgba(160,212,247,0.15); color:rgba(160,212,247,0.9); }
  .contra-b { background:rgba(247,199,122,0.06); border:1px solid rgba(247,199,122,0.15); color:rgba(247,199,122,0.9); }
  .contra-resolution { font-size:13px; color:var(--text-mid); line-height:1.5; }
  .causal-chain { padding:16px 20px; border-top:1px solid var(--border); }
  .causal-text { font-size:14px; color:var(--text); line-height:1.6; font-family:var(--mono); font-size:13px; }
  .consensus-item { padding:14px 20px; border-top:1px solid var(--border); font-size:14px; color:var(--text); line-height:1.6; display:flex; gap:12px; }

  /* ── Gap Analysis ── */
  .gap-card { background:linear-gradient(180deg,var(--bg) 0%, rgba(27,33,26,1) 100%); border:1px solid var(--accent3); border-radius:var(--r); overflow:hidden; box-shadow:var(--shadow); }
  .gap-section { padding:20px 24px; border-bottom:1px solid var(--border); }
  .gap-section:last-child { border-bottom:none; }
  .gap-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:var(--accent); margin-bottom:16px; display:flex; align-items:center; gap:8px; }
  .gap-title::before { content:''; display:inline-block; width:6px; height:6px; background:var(--accent); border-radius:50%; box-shadow:0 0 8px var(--accent); }
  .gap-item { display:flex; gap:12px; margin-bottom:12px; font-size:15px; color:var(--text); line-height:1.6; }
  .gap-dot { flex-shrink:0; margin-top:8px; width:6px; height:6px; border-radius:50%; box-shadow:0 0 5px currentColor; }
  .cov-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; }
  .cov-cell { background:var(--surface2); border-radius:var(--r); padding:16px 20px; border:1px solid var(--accent3); }
  .cov-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:var(--accent2); margin-bottom:8px; }
  .cov-text { font-size:14px; color:var(--text); line-height:1.6; }
  .sug-item { display:flex; gap:16px; align-items:flex-start; padding:14px 16px; background:var(--surface2); border-radius:var(--r); border:1px solid var(--border-hi); margin-bottom:8px; }
  .prio-badge { font-size:11px; font-family:var(--mono); padding:3px 9px; border-radius:20px; flex-shrink:0; }

  /* ── Report ── */
  .report-card { background:var(--bg); border:1px solid var(--accent2); border-radius:var(--r); overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.5); }
  .report-banner { padding:28px 32px; border-bottom:1px solid var(--border); background:linear-gradient(135deg,rgba(98,129,65,0.2),rgba(27,33,26,0.8)); position:relative; overflow:hidden; }
  .report-banner::before { content:''; position:absolute; top:0; left:-100%; width:50%; height:100%; background:linear-gradient(90deg,transparent,rgba(235,213,171,0.05),transparent); animation:shimmer 8s infinite linear; }
  .report-title { font-size:24px; font-weight:800; margin-bottom:16px; color:var(--accent); letter-spacing:-0.5px; }
  .exec-summary { font-size:16px; color:var(--text); line-height:1.8; border-left:4px solid var(--accent); padding:16px 24px; background:rgba(235,213,171,0.05); border-radius:0 var(--r) var(--r) 0; }
  .stats-row { display:flex; gap:16px; flex-wrap:wrap; padding:20px 32px; border-bottom:1px solid var(--border); background:rgba(0,0,0,0.2); }
  .stat-box { background:var(--surface2); border:1px solid var(--accent3); border-radius:var(--r); padding:16px 20px; flex:1; min-width:110px; text-align:center; transition:transform 0.2s; }
  .stat-box:hover { transform:translateY(-4px); border-color:var(--accent); }
  .stat-val { font-size:28px; font-weight:800; font-family:var(--mono); color:var(--accent); }
  .stat-lab { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:var(--accent2); margin-top:4px; }
  .research-block { padding:32px; border-bottom:1px solid var(--border); transition:background 0.3s; }
  .research-block:hover { background:rgba(235,213,171,0.02); }
  .rb-header { display:flex; gap:16px; align-items:flex-start; margin-bottom:20px; }
  .rb-num { font-family:var(--mono); font-size:13px; font-weight:700; color:var(--accent); background:rgba(235,213,171,0.1); width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:8px; flex-shrink:0; }
  .rb-task { font-size:18px; font-weight:700; color:var(--accent); }
  .rb-summary { font-size:15px; color:var(--text); line-height:1.8; margin-bottom:24px; padding-left:48px; }
  .rb-findings { display:flex; flex-direction:column; gap:14px; padding-left:48px; }
  .finding-card { background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:var(--r); padding:18px 22px; border-left:4px solid; transition:all 0.2s; }
  .finding-card:hover { transform:translateX(4px); box-shadow:var(--shadow); background:var(--surface2); }
  .finding-text { font-size:15px; font-weight:600; margin-bottom:10px; line-height:1.5; }
  .finding-support { font-size:14px; color:var(--accent2); line-height:1.6; margin-bottom:10px; font-style:italic; }
  .assess-section { padding:32px; border-bottom:1px solid var(--border); background:rgba(0,0,0,0.1); }
  .assess-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .assess-col { background:var(--surface2); border-radius:var(--r); padding:24px; border:1px solid var(--accent3); }
  .assess-heading { font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:2px; margin-bottom:18px; display:flex; align-items:center; gap:10px; }
  .assess-item { display:flex; gap:12px; font-size:15px; color:var(--text); line-height:1.6; margin-bottom:12px; }
  .assess-bullet { flex-shrink:0; margin-top:5px; font-size:10px; }
  .gaps-section { padding:32px; border-bottom:1px solid var(--border); }
  .ns-section { padding:32px; }
  .section-heading { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
  .gap-entry { display:flex; gap:16px; align-items:flex-start; padding:16px 20px; background:var(--surface2); border:1px solid var(--accent3); border-radius:var(--r); margin-bottom:12px; border-left:4px solid; }
  .ns-entry { display:flex; gap:16px; align-items:flex-start; padding:20px 24px; background:var(--surface); border:1px solid var(--border-hi); border-radius:var(--r); margin-bottom:12px; border-left:4px solid; transition:all 0.3s; }
  .ns-entry:hover { transform:translateY(-3px); border-color:var(--accent); }
  .ns-text { font-size:16px; font-weight:600; color:var(--text); line-height:1.6; }
  .err-card { background:rgba(255,107,107,.1); border:1px solid rgba(255,107,107,.4); border-radius:var(--r); padding:16px 20px; font-size:14px; font-weight:500; color:#ffb3b3; }

  /* ── Input Bar ── */
  .input-wrap { position:absolute; bottom:0; left:0; right:0; padding:0 40px 40px; pointer-events:none; display:flex; flex-direction:column; align-items:center; z-index:100; }
  .input-inner { width:100%; max-width:960px; position:relative; pointer-events:auto; }
  .input-bar { background:rgba(27,33,26,0.85); backdrop-filter:blur(24px); border:2px solid var(--border-hi); padding:10px 10px 10px 24px; border-radius:40px; display:flex; gap:14px; box-shadow:0 20px 60px rgba(0,0,0,0.6),inset 0 2px 10px rgba(235,213,171,0.05); transition:all .3s; align-items:center; }
  .input-bar:focus-within { border-color:var(--accent); box-shadow:0 20px 60px rgba(0,0,0,0.7),0 0 0 6px rgba(235,213,171,0.1); transform:translateY(-2px); }
  .chat-inp { flex:1; background:transparent; border:none; color:var(--text); font-family:var(--font); font-size:18px; font-weight:500; padding:12px 0; outline:none; }
  .chat-inp::placeholder { color:var(--text-dim); font-weight:400; }
  .chat-inp:disabled { opacity:.5; cursor:not-allowed; }
  .btn-send { background:linear-gradient(135deg,var(--accent),var(--accent2)); color:#1B211A; border:none; cursor:pointer; border-radius:30px; padding:0 32px; height:52px; font-family:var(--font); font-size:16px; font-weight:800; display:flex; align-items:center; gap:10px; transition:all .3s; white-space:nowrap; }
  .btn-send:hover:not(:disabled) { transform:scale(1.03); box-shadow:0 10px 30px rgba(235,213,171,0.4); }
  .btn-send:disabled { opacity:.5; cursor:not-allowed; transform:none; background:var(--surface2); color:var(--text-dim); border:2px solid var(--border); }

  /* ── Empty ── */
  .empty { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; text-align:center; padding:60px 40px; }
  .empty-icon { font-size:72px; margin-bottom:24px; opacity:.8; animation:slideUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards; }
  .empty-ttl { font-size:32px; font-weight:800; margin-bottom:16px; color:var(--accent); letter-spacing:-0.5px; animation:slideUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
  .empty-desc { font-size:16px; color:var(--text-mid); max-width:480px; line-height:1.75; animation:slideUp 0.8s 0.2s cubic-bezier(0.16,1,0.3,1) both; }
  .suggestions { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; margin-top:36px; animation:slideUp 0.8s 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  .sug-pill { font-size:14px; padding:10px 20px; border:1px solid var(--accent3); border-radius:30px; color:var(--accent); cursor:pointer; transition:all .3s; background:rgba(0,0,0,0.2); }
  .sug-pill:hover { border-color:var(--accent); background:rgba(235,213,171,0.1); transform:translateY(-3px); }
  .spinner { width:15px; height:15px; border:2px solid rgba(11,13,15,.3); border-top-color:#0b0d0f; border-radius:50%; animation:spin .6s linear infinite; }
`;

// ─── Shared helpers ───────────────────────────────────────────────────────────
function AgentHeader({ agentKey, subtitle }) {
  const ag = AGENTS[agentKey] || AGENTS.task;
  return (
    <div className="ag-head">
      <div className="ag-ic" style={{ borderColor: ag.color + "40" }}>
        <span style={{ color: ag.color }}>{ag.icon}</span>
      </div>
      <div>
        <div className="ag-name" style={{ color: ag.color }}>{ag.label}</div>
        <div className="ag-sub">{subtitle || ag.desc}</div>
      </div>
    </div>
  );
}

function SectionH({ icon, text, color }) {
  return (
    <div className="section-heading" style={{ color }}>
      <span>{icon}</span> {text}
    </div>
  );
}

// ─── THINKING BUBBLE ──────────────────────────────────────────────────────────
function ThinkingBubble({ agent }) {
  const ag = AGENTS[agent] || AGENTS.task;
  return (
    <div className="msg-agent fade-in">
      <AgentHeader agentKey={agent} />
      <div className="ag-body">
        <div className="thinking">
          <div className="dots">
            {[0, 1, 2].map(i => <div key={i} className="d" style={{ background: ag.color }} />)}
          </div>
          <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
            {ag.desc}…
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── TASKS ────────────────────────────────────────────────────────────────────
function TasksMsg({ tasks }) {
  if (!tasks?.length) return null;
  return (
    <div className="msg-agent fade-in">
      <AgentHeader agentKey="task" subtitle={`${tasks.length} research tasks generated`} />
      <div className="ag-body">
        <div className="tasks-wrap">
          {tasks.map((t, i) => (
            <div key={i} className="task-c">
              <div className="t-num">T{pad(i + 1)}</div>
              <div className="t-desc">{t.description}</div>
              <div className="t-badge" style={{
                background: priorityColor(t.priority) + "18",
                border: `1px solid ${priorityColor(t.priority)}40`,
                color: priorityColor(t.priority),
              }}>P{t.priority}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RETRIEVAL ────────────────────────────────────────────────────────────────
function RetrievalMsg({ retrieval }) {
  const [open, setOpen] = useState({});
  if (!retrieval) return null;
  const entries = Object.entries(retrieval);
  if (!entries.length) return null;
  const totalSources = entries.reduce((a, [, s]) => a + (Array.isArray(s) ? s.length : 0), 0);

  return (
    <div className="msg-agent fade-in">
      <AgentHeader agentKey="retrieval" subtitle={`${totalSources} sources across ${entries.length} tasks`} />
      <div className="ag-body">
        <div className="retrieval-wrap">
          {entries.map(([task, sources], i) => (
            <div key={i} className="task-block">
              <div className={`task-block-head ${open[i] ? "open" : ""}`} onClick={() => setOpen(p => ({ ...p, [i]: !p[i] }))}>
                <span className="tb-num">T{pad(i + 1)}</span>
                <span className="tb-title">{task}</span>
                <span className="tb-count">{Array.isArray(sources) ? sources.length : 0} sources</span>
                <span className={`tb-chev ${open[i] ? "open" : ""}`}>▶</span>
              </div>
              {open[i] && Array.isArray(sources) && (
                <div className="sources-list">
                  {sources.map((src, j) => (
                    <div key={j} className="source-item">
                      <div className="source-title">{src.title || src.source}</div>
                      {src.title && src.source && <div className="source-org">{src.source}</div>}
                      {src.summary && <div className="source-summary">{src.summary}</div>}
                      {src.key_points?.length > 0 && (
                        <>
                          <div className="sec-label" style={{ paddingLeft: 0, marginTop: 8 }}>Key Points</div>
                          <div className="kp-list">
                            {src.key_points.map((kp, k) => (
                              <div key={k} className="kp-item">
                                <span className="kp-bullet" style={{ color: "var(--accent2)" }}>▸</span>
                                <span>{kp}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SYNTHESIS ────────────────────────────────────────────────────────────────
function SynthesisMsg({ synthesis, isRefined = false }) {
  const [open, setOpen] = useState({});
  if (!synthesis) return null;

  const entries = Object.entries(synthesis).map(([task, data]) => {
    let d = data;
    if (d?.error === "parse_failed" && d.raw) { try { d = JSON.parse(d.raw); } catch { d = { synthesized_summary: d.raw }; } }
    return { task, data: d };
  });

  const agKey = isRefined ? "critic" : "synthesis";
  const subtitle = isRefined
    ? `${entries.length} syntheses refined after critique`
    : `${entries.length} topics synthesized`;

  return (
    <div className="msg-agent fade-in">
      <AgentHeader agentKey={agKey} subtitle={subtitle} />
      <div className="ag-body">
        <div className="synth-wrap">
          {entries.map(({ task, data }, i) => (
            <div key={i} className={`synth-card ${open[i] ? "open" : ""}`}>
              <div className="sc-head" onClick={() => setOpen(p => ({ ...p, [i]: !p[i] }))}>
                <span className="sc-num">{isRefined ? "R" : "S"}{pad(i + 1)}</span>
                <span className="sc-task">{task}</span>
                {isRefined && data?.critique_addressed && (
                  <span className="refined-badge">✓ Refined</span>
                )}
                <span className="sc-chev">▶</span>
              </div>
              {open[i] && data && (
                <div className="sc-body">
                  {data.synthesized_summary && (
                    <div className="sc-section">
                      <div className="sec-label">Synthesized Summary</div>
                      <div style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.8 }}>{data.synthesized_summary}</div>
                      {data.critique_addressed && (
                        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(160,247,180,0.7)", fontStyle: "italic" }}>
                          Improved: {data.critique_addressed}
                        </div>
                      )}
                    </div>
                  )}
                  {data.confidence_level && (
                    <div className="sc-section" style={{ paddingTop: 0 }}>
                      <span style={{
                        fontSize: 10, fontFamily: "var(--mono)", padding: "2px 9px", borderRadius: 20,
                        background: data.confidence_level === "high" ? "#a0f7b418" : data.confidence_level === "medium" ? "#f7d6a018" : "#f7a0a018",
                        color: data.confidence_level === "high" ? "#a0f7b4" : data.confidence_level === "medium" ? "#f7d6a0" : "#f7a0a0",
                        border: "1px solid currentColor",
                      }}>{data.confidence_level} confidence</span>
                    </div>
                  )}
                  {data.causal_mechanisms?.length > 0 && (
                    <>
                      <hr className="divider" />
                      <div className="sc-section">
                        <div className="sec-label">Causal Mechanisms</div>
                        <div className="kp-list">
                          {data.causal_mechanisms.map((m, j) => (
                            <div key={j} className="kp-item">
                              <span className="kp-bullet" style={{ color: "#a0d4f7" }}>⟶</span>
                              <span>{m}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {data.strongly_supported_points?.length > 0 && (
                    <>
                      <hr className="divider" />
                      <div className="sc-section">
                        <div className="sec-label">Well-Supported Findings</div>
                        <div className="kp-list">
                          {data.strongly_supported_points.map((p, j) => (
                            <div key={j} className="kp-item">
                              <span className="kp-bullet" style={{ color: "#c8f7a0" }}>✓</span>
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {data.key_statistics_and_data?.length > 0 && (
                    <>
                      <hr className="divider" />
                      <div className="sc-section">
                        <div className="sec-label">Key Statistics</div>
                        <div className="kp-list">
                          {data.key_statistics_and_data.map((s, j) => (
                            <div key={j} className="kp-item">
                              <span className="kp-bullet" style={{ color: "#a0d4f7" }}>📊</span>
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {data.conflicting_or_debated_points?.length > 0 && (
                    <>
                      <hr className="divider" />
                      <div className="sc-section">
                        <div className="sec-label">Conflicting Points</div>
                        <div className="kp-list">
                          {data.conflicting_or_debated_points.map((c, j) => (
                            <div key={j} className="kp-item">
                              <span className="kp-bullet" style={{ color: "#f7d6a0" }}>⚡</span>
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {data.weak_or_missing_areas?.length > 0 && (
                    <>
                      <hr className="divider" />
                      <div className="sc-section">
                        <div className="sec-label">Missing Areas</div>
                        <div className="tags-row">
                          {data.weak_or_missing_areas.map((w, j) => <span key={j} className="tag w">{w}</span>)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CRITIC ───────────────────────────────────────────────────────────────────
function CriticMsg({ criticData }) {
  const [open, setOpen] = useState({});

  // criticData can be:
  //   { refined_synthesis, critique_log }   — from SSE
  //   { critique_log, refined_synthesis }   — same
  const log = criticData?.critique_log || criticData;
  const entries = log && typeof log === "object" && !Array.isArray(log)
    ? Object.entries(log).filter(([, v]) => v && !v.error)
    : [];

  const scores = entries
    .map(([, c]) => c?.overall_quality_score)
    .filter(s => typeof s === "number");
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;

  const scoreColor = (s) => {
    if (s >= 8) return "#a0f7b4";
    if (s >= 6) return "#f7d6a0";
    return "#f7a0a0";
  };

  if (!entries.length) {
    return (
      <div className="msg-agent fade-in">
        <AgentHeader agentKey="critic" subtitle="Critique complete — all syntheses refined" />
        <div className="ag-body">
          <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>
            Critique log not available for this session.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-agent fade-in">
      <AgentHeader agentKey="critic" subtitle={`${entries.length} syntheses critiqued & refined`} />
      <div className="ag-body">
        <div className="critic-wrap">
          {avg && (
            <div className="critic-summary-bar">
              <div>
                <div className="critic-avg" style={{ color: scoreColor(parseFloat(avg)) }}>{avg}</div>
                <div className="critic-avg-label">avg quality pre-refinement</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "rgba(247,199,122,0.7)", lineHeight: 1.5 }}>
                  All syntheses with quality below 9/10 were refined. The report uses the improved versions.
                </div>
              </div>
            </div>
          )}

          {entries.map(([task, critique], i) => {
            const score = critique?.overall_quality_score;
            const sc = scoreColor(score);
            const pct = score ? `${(score / 10) * 100}%` : "0%";
            const isOpen = open[i];

            return (
              <div key={i} className={`critic-task-card ${isOpen ? "open" : ""}`}>
                <div className="critic-head" onClick={() => setOpen(p => ({ ...p, [i]: !p[i] }))}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--critic)", minWidth: 30 }}>C{pad(i + 1)}</span>
                  <div className="score-bar-wrap">
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{task.slice(0, 80)}{task.length > 80 ? "…" : ""}</div>
                    <div className="score-bar-track">
                      <div className="score-bar-fill" style={{ width: pct, background: `linear-gradient(90deg, ${sc}80, ${sc})` }} />
                    </div>
                  </div>
                  {score != null && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 800, color: sc, minWidth: 36, textAlign: "right" }}>{score}</span>
                  )}
                  <span className="critic-chev">▶</span>
                </div>

                {isOpen && (
                  <div className="critic-body">
                    {critique.overall_assessment && (
                      <div style={{ fontSize: 14, color: "var(--text-mid)", lineHeight: 1.7, marginBottom: 16, padding: "12px 16px", background: "rgba(247,199,122,0.04)", borderRadius: "var(--r-sm)", border: "1px solid rgba(247,199,122,0.1)" }}>
                        {critique.overall_assessment}
                      </div>
                    )}

                    {critique.vague_claims?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div className="sec-label" style={{ color: "var(--critic)" }}>Vague Claims Flagged</div>
                        {critique.vague_claims.slice(0, 3).map((c, j) => (
                          <div key={j} className="critique-item">
                            <div className="critique-dot" style={{ background: "#f7c77a" }} />
                            <div>
                              <div className="critique-problem">"{c.claim}"</div>
                              {c.fix && <div className="critique-fix">Fix: {c.fix}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {critique.missing_mechanisms?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div className="sec-label" style={{ color: "#a0d4f7" }}>Missing Mechanisms</div>
                        {critique.missing_mechanisms.slice(0, 3).map((m, j) => (
                          <div key={j} className="critique-item">
                            <div className="critique-dot" style={{ background: "#a0d4f7" }} />
                            <div>
                              <div className="critique-problem">{m.what_is_stated}</div>
                              <div className="critique-fix">{m.what_is_missing}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {critique.priority_fixes?.length > 0 && (
                      <div>
                        <div className="sec-label" style={{ color: "#a0f7b4" }}>Priority Fixes Applied</div>
                        {critique.priority_fixes.map((f, j) => (
                          <div key={j} className="kp-item" style={{ marginBottom: 6 }}>
                            <span className="kp-bullet" style={{ color: "#a0f7b4" }}>→</span>
                            <span style={{ fontSize: 13, color: "var(--text-mid)" }}>{f}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── CROSS SYNTHESIS ──────────────────────────────────────────────────────────
function CrossSynthesisMsg({ crossData }) {
  if (!crossData || crossData.error) return null;

  return (
    <div className="msg-agent fade-in">
      <AgentHeader agentKey="cross_synthesis" subtitle="Emergent insights from cross-task analysis" />
      <div className="ag-body">
        <div className="cross-wrap">

          {/* Central Argument */}
          {crossData.central_argument && (
            <div className="central-arg">
              <div className="central-arg-label">Central Argument</div>
              <div className="central-arg-text">{crossData.central_argument}</div>
            </div>
          )}

          {/* Emergent Insights */}
          {crossData.emergent_insights?.length > 0 && (
            <div className="cross-section">
              <div className="cross-section-head">
                <span className="cross-section-label">Emergent Insights</span>
                <span className="cross-section-count">{crossData.emergent_insights.length} cross-task findings</span>
              </div>
              {crossData.emergent_insights.map((ins, i) => (
                <div key={i} className="cross-insight">
                  <div className="cross-insight-text">{ins.insight}</div>
                  {ins.mechanism && <div className="cross-insight-mechanism">↳ {ins.mechanism}</div>}
                  {ins.implication && <div className="cross-insight-implication">💡 {ins.implication}</div>}
                  {ins.draws_from?.length > 0 && (
                    <div className="cross-insight-sources">
                      {ins.draws_from.map((t, j) => (
                        <span key={j} className="cross-source-pill">{t.slice(0, 50)}{t.length > 50 ? "…" : ""}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Contradictions */}
          {crossData.cross_task_contradictions?.length > 0 && (
            <div className="cross-section">
              <div className="cross-section-head">
                <span className="cross-section-label">Cross-Task Contradictions</span>
                <span className="cross-section-count">{crossData.cross_task_contradictions.length}</span>
              </div>
              {crossData.cross_task_contradictions.map((c, i) => (
                <div key={i} className="contradiction-item">
                  <div className="contradiction-vs">
                    <div className="contra-side contra-a">{c.finding_a}</div>
                    <div style={{ alignSelf: "center", color: "var(--text-dim)", fontSize: 18, flexShrink: 0 }}>⟷</div>
                    <div className="contra-side contra-b">{c.finding_b}</div>
                  </div>
                  {c.resolution && <div className="contra-resolution">Resolution: {c.resolution}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Causal Chains */}
          {crossData.causal_chains?.length > 0 && (
            <div className="cross-section">
              <div className="cross-section-head">
                <span className="cross-section-label">Causal Chains</span>
                <span className="cross-section-count">{crossData.causal_chains.length}</span>
              </div>
              {crossData.causal_chains.map((ch, i) => (
                <div key={i} className="causal-chain">
                  <div className="causal-text">{ch.chain}</div>
                  {ch.confidence && (
                    <span style={{ fontSize: 10, fontFamily: "var(--mono)", marginTop: 6, display: "inline-block", padding: "2px 8px", borderRadius: 20, background: "rgba(160,212,247,0.08)", border: "1px solid rgba(160,212,247,0.2)", color: "#a0d4f7" }}>
                      {ch.confidence} confidence
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Strongest Consensus */}
          {crossData.strongest_consensus?.length > 0 && (
            <div className="cross-section">
              <div className="cross-section-head">
                <span className="cross-section-label">Strongest Consensus</span>
              </div>
              {crossData.strongest_consensus.map((c, i) => (
                <div key={i} className="consensus-item">
                  <span style={{ color: "#a0f7b4", flexShrink: 0, fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>{c}</span>
                </div>
              ))}
            </div>
          )}

          {/* What evidence does NOT establish */}
          {crossData.what_the_evidence_does_not_establish?.length > 0 && (
            <div className="cross-section">
              <div className="cross-section-head">
                <span className="cross-section-label" style={{ color: "rgba(247,160,160,0.8)" }}>What Evidence Does NOT Show</span>
              </div>
              {crossData.what_the_evidence_does_not_establish.map((w, i) => (
                <div key={i} className="consensus-item">
                  <span style={{ color: "#f7a0a0", flexShrink: 0 }}>✕</span>
                  <span style={{ fontSize: 14, color: "var(--text-mid)", lineHeight: 1.6 }}>{w}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── GAP ANALYSIS ─────────────────────────────────────────────────────────────
function GapMsg({ gaps }) {
  if (!gaps) return null;
  return (
    <div className="msg-agent fade-in">
      <AgentHeader agentKey="gap" subtitle="Coverage analysis & gaps identified" />
      <div className="ag-body">
        <div className="gap-card">
          {gaps.global_gaps?.length > 0 && (
            <div className="gap-section">
              <div className="gap-title">Global Gaps</div>
              {gaps.global_gaps.map((g, i) => {
                const isObj = typeof g === "object" && g !== null;
                const text = isObj ? g.gap : g;
                const why = isObj ? g.why_it_matters : null;
                const score = isObj ? g.importance_score : null;
                return (
                  <div key={i} className="sug-item">
                    {score && <div className="prio-badge" style={{ background: priorityColor(score) + "18", color: priorityColor(score), border: `1px solid ${priorityColor(score)}40` }}>I{score}</div>}
                    <div>
                      <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>{text}</div>
                      {why && <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", marginTop: 4 }}>Why it matters: {why}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {gaps.cross_task_weaknesses?.length > 0 && (
            <div className="gap-section">
              <div className="gap-title">Cross-Task Weaknesses</div>
              {gaps.cross_task_weaknesses.map((w, i) => (
                <div key={i} className="gap-item"><div className="gap-dot" style={{ background: "#f7d6a0" }} /><span>{w}</span></div>
              ))}
            </div>
          )}
          {gaps.low_confidence_areas?.length > 0 && (
            <div className="gap-section">
              <div className="gap-title">Low-Confidence Areas</div>
              {gaps.low_confidence_areas.map((a, i) => (
                <div key={i} className="gap-item"><div className="gap-dot" style={{ background: "#a0d4f7" }} /><span>{a}</span></div>
              ))}
            </div>
          )}
          {gaps.coverage_assessment && (
            <div className="gap-section">
              <div className="gap-title">Coverage Assessment
                {gaps.coverage_assessment.overall_quality_score != null && (
                  <span style={{ marginLeft: 10, fontFamily: "var(--mono)", fontSize: 11, color: priorityColor(gaps.coverage_assessment.overall_quality_score) }}>
                    Quality: {gaps.coverage_assessment.overall_quality_score}/10
                  </span>
                )}
              </div>
              <div className="cov-grid">
                {["breadth", "depth", "balance"].map(k => gaps.coverage_assessment[k] ? (
                  <div key={k} className="cov-cell">
                    <div className="cov-label">{k}</div>
                    <div className="cov-text">{gaps.coverage_assessment[k]}</div>
                  </div>
                ) : null)}
              </div>
            </div>
          )}
          {gaps.suggested_new_tasks?.length > 0 && (
            <div className="gap-section">
              <div className="gap-title">Suggested Follow-Up Tasks</div>
              {gaps.suggested_new_tasks.map((t, i) => (
                <div key={i} className="sug-item">
                  <div className="prio-badge" style={{ background: priorityColor(t.priority) + "20", color: priorityColor(t.priority), border: `1px solid ${priorityColor(t.priority)}40` }}>P{t.priority}</div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.6 }}>{t.description}</div>
                    {t.addresses_gap && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 3 }}>Addresses: {t.addresses_gap}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MARKDOWN RENDERER ───────────────────────────────────────────────────────
function renderInline(text) {
  // Bold **text** and *italic*
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    if (m[2]) parts.push(<strong key={k++} style={{ color: "var(--accent)", fontWeight: 700 }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={k++} style={{ color: "var(--text-mid)", fontStyle: "italic" }}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={k++} style={{ fontFamily: "var(--mono)", fontSize: "0.9em", background: "rgba(235,213,171,0.1)", padding: "1px 6px", borderRadius: 4, color: "var(--accent2)" }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
}

function MarkdownReport({ markdown }) {
  if (!markdown) return null;

  const lines = markdown.split("\n");
  const elements = [];
  let i = 0, key = 0;
  let inBulletGroup = false;
  let bulletBuffer = [];

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    elements.push(
      <ul key={key++} style={{ margin: "0 0 24px 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {bulletBuffer.map((b, idx) => (
          <li key={idx} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 18px", background: "rgba(235,213,171,0.03)", border: "1px solid rgba(235,213,171,0.08)", borderRadius: 10, borderLeft: "3px solid rgba(139,174,102,0.5)" }}>
            <span style={{ color: "var(--accent2)", flexShrink: 0, marginTop: 2, fontSize: 12 }}>▸</span>
            <span style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text)" }}>{renderInline(b)}</span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
    inBulletGroup = false;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // H1
    if (/^# /.test(trimmed)) {
      flushBullets();
      const text = trimmed.slice(2);
      elements.push(
        <div key={key++} style={{ marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid rgba(235,213,171,0.12)" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--accent)", letterSpacing: "-0.5px", lineHeight: 1.2, margin: 0 }}>{text}</h1>
          <div style={{ height: 3, width: 60, background: "linear-gradient(90deg,var(--accent),transparent)", marginTop: 12, borderRadius: 4 }} />
        </div>
      );
      i++; continue;
    }

    // H2
    if (/^## /.test(trimmed)) {
      flushBullets();
      const text = trimmed.slice(3);
      const sectionIcons = {
        "Executive Summary": "◎", "Key Findings": "◆", "Detailed Analysis": "◈",
        "Contradictions": "⟷", "What the Evidence": "✕", "Confidence": "◑",
        "Research Gaps": "◑", "Recommended": "▷", "Limitations": "✕",
        "Assessment": "◈",
      };
      const icon = Object.entries(sectionIcons).find(([k]) => text.includes(k))?.[1] || "▸";
      elements.push(
        <div key={key++} style={{ marginTop: 36, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 18, color: "var(--accent2)" }}>{icon}</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)", margin: 0, letterSpacing: "0.2px" }}>{text}</h2>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg,var(--accent3),transparent)", marginLeft: 30 }} />
        </div>
      );
      i++; continue;
    }

    // H3
    if (/^### /.test(trimmed)) {
      flushBullets();
      const text = trimmed.slice(4);
      elements.push(
        <h3 key={key++} style={{ fontSize: 16, fontWeight: 700, color: "var(--accent2)", margin: "24px 0 12px", paddingLeft: 14, borderLeft: "3px solid var(--accent3)" }}>
          {text}
        </h3>
      );
      i++; continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      flushBullets();
      elements.push(<hr key={key++} style={{ border: "none", borderTop: "1px solid rgba(235,213,171,0.1)", margin: "28px 0" }} />);
      i++; continue;
    }

    // Bullet points: * or -
    if (/^[*\-] /.test(trimmed)) {
      const text = trimmed.slice(2);
      bulletBuffer.push(text);
      inBulletGroup = true;
      i++; continue;
    }

    // Numbered list: 1. 2. etc
    if (/^\d+\. /.test(trimmed)) {
      flushBullets();
      const text = trimmed.replace(/^\d+\.\s*/, "");
      const num = trimmed.match(/^(\d+)/)[1];
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 18px", marginBottom: 10, background: "rgba(139,174,102,0.06)", border: "1px solid rgba(139,174,102,0.15)", borderRadius: 10 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 800, color: "var(--accent)", minWidth: 28, height: 28, background: "rgba(235,213,171,0.1)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, flexShrink: 0 }}>{num}</span>
          <span style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text)" }}>{renderInline(text)}</span>
        </div>
      );
      i++; continue;
    }

    // Empty line
    if (!trimmed) {
      flushBullets();
      i++; continue;
    }

    // Regular paragraph
    flushBullets();
    elements.push(
      <p key={key++} style={{ fontSize: 15, lineHeight: 1.85, color: "var(--text)", margin: "0 0 16px", letterSpacing: "0.1px" }}>
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }
  flushBullets();

  return <div style={{ padding: "36px 40px", maxWidth: "100%" }}>{elements}</div>;
}

// ─── REPORT ───────────────────────────────────────────────────────────────────
function ReportMsg({ report, tasks, markdown }) {
  const [showRaw, setShowRaw] = useState(false);

  // Extract title from markdown for the banner
  const mdTitle = markdown?.match(/^# (.+)/m)?.[1] || "Research Report";

  // Count stats from markdown sections
  const countSection = (md, heading) => {
    if (!md) return null;
    const re = new RegExp(`## ${heading}[\\s\\S]*?(?=## |$)`, "i");
    const section = md.match(re)?.[0] || "";
    const bullets = section.match(/^[*\-] .+/gm) || [];
    return bullets.length || null;
  };

  // If we have markdown (new pipeline), render it properly
  if (markdown && !report?.research_sections) {
    const keyFindings = countSection(markdown, "Key Findings");
    const gaps = countSection(markdown, "Research Gaps");
    const nextSteps = countSection(markdown, "Recommended");
    const confidenceMatch = markdown.match(/confidence.*?(\d+).*?out of.*?10/i);
    const confidence = confidenceMatch?.[1];

    return (
      <div className="msg-agent fade-in">
        <AgentHeader agentKey="report" subtitle="Publication-quality research report" />
        <div className="ag-body">
          <div className="report-card">

            {/* Banner */}
            <div className="report-banner">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "var(--accent2)", marginBottom: 8 }}>
                    Research Report
                  </div>
                  <div className="report-title" style={{ margin: 0 }}>{mdTitle}</div>
                </div>
                <button
                  onClick={() => setShowRaw(s => !s)}
                  style={{ background: "rgba(235,213,171,0.07)", border: "1px solid rgba(235,213,171,0.2)", color: "var(--text-mid)", padding: "6px 14px", borderRadius: 20, fontFamily: "var(--mono)", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                  {showRaw ? "Styled ▣" : "Raw ≡"}
                </button>
              </div>
            </div>

            {/* Stats strip */}
            {(keyFindings || gaps || nextSteps || confidence) && (
              <div style={{ display: "flex", gap: 1, borderBottom: "1px solid rgba(235,213,171,0.08)", background: "rgba(0,0,0,0.2)" }}>
                {[
                  { v: tasks?.length,  l: "Tasks",       c: "var(--accent)" },
                  { v: keyFindings,    l: "Key Findings", c: "#8BAE66" },
                  { v: gaps,           l: "Gaps",         c: "#f7a0c8" },
                  { v: nextSteps,      l: "Next Steps",   c: "#c8f7a0" },
                  { v: confidence ? `${confidence}/10` : null, l: "Confidence", c: "var(--critic)" },
                ].filter(s => s.v != null).map(({ v, l, c }) => (
                  <div key={l} style={{ flex: 1, padding: "18px 0", textAlign: "center", borderRight: "1px solid rgba(235,213,171,0.06)" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", color: c }}>{v}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "rgba(235,213,171,0.45)", marginTop: 4 }}>{l}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            {showRaw ? (
              <pre style={{ padding: "32px 40px", fontSize: 13, fontFamily: "var(--mono)", lineHeight: 1.7, color: "var(--text-mid)", whiteSpace: "pre-wrap", overflowX: "auto" }}>
                {markdown}
              </pre>
            ) : (
              <MarkdownReport markdown={markdown} />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;
  const normFindings = (arr) => arr ? arr.map(f => typeof f === "string" ? { finding: f } : f) : [];

  return (
    <div className="msg-agent fade-in">
      <AgentHeader agentKey="report" subtitle="Complete analysis across all research dimensions" />
      <div className="ag-body">
        <div className="report-card">
          <div className="report-banner">
            <div className="report-title">Research Report</div>
            {report.executive_summary && <div className="exec-summary">{report.executive_summary}</div>}
          </div>

          <div className="stats-row">
            {[
              { v: tasks?.length, l: "Tasks" },
              { v: report.research_sections?.length, l: "Sections" },
              { v: report.overall_assessment?.strengths?.length, l: "Strengths" },
              { v: report.overall_assessment?.limitations?.length, l: "Limits" },
              { v: report.identified_gaps?.length, l: "Gaps" },
              { v: report.recommended_next_steps?.length, l: "Next Steps" },
            ].map(({ v, l }) => (
              <div key={l} className="stat-box">
                <div className="stat-val">{v ?? "—"}</div>
                <div className="stat-lab">{l}</div>
              </div>
            ))}
          </div>

          {report.research_sections?.map((sec, i) => {
            const findings = normFindings(sec.key_findings);
            return (
              <div key={i} className="research-block">
                <div className="rb-header">
                  <span className="rb-num">R{pad(i + 1)}</span>
                  <div style={{ flex: 1 }}>
                    <div className="rb-task">{sec.task}</div>
                    {sec.confidence && (
                      <span style={{ fontSize: 10, fontFamily: "var(--mono)", padding: "2px 9px", borderRadius: 20, display: "inline-block", marginTop: 5,
                        background: sec.confidence === "high" ? "#a0f7b418" : "#f7d6a018",
                        color: sec.confidence === "high" ? "#a0f7b4" : "#f7d6a0",
                        border: "1px solid currentColor" }}>{sec.confidence} confidence</span>
                    )}
                  </div>
                </div>
                {sec.summary && <div className="rb-summary">{sec.summary}</div>}
                {findings.length > 0 && (
                  <div className="rb-findings">
                    {findings.map((f, j) => {
                      const pc = priorityColor(f.priority ?? 5);
                      return (
                        <div key={j} className="finding-card" style={{ borderLeftColor: pc }}>
                          <div className="finding-text">{f.finding || String(f)}</div>
                          {f.evidence && <div className="finding-support">📌 {f.evidence}</div>}
                          {f.implication && (
                            <div style={{ fontSize: 12, color: "var(--text-mid)", marginTop: 6, borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                              💡 {f.implication}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {report.overall_assessment && (
            <div className="assess-section">
              <SectionH icon="◈" text="Overall Assessment" color="#a0d4f7" />
              {report.overall_assessment.key_themes?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="sec-label">Key Themes</div>
                  <div className="tags-row">
                    {report.overall_assessment.key_themes.map((t, i) => (
                      <span key={i} className="tag blue">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="assess-grid">
                <div className="assess-col">
                  <div className="assess-heading" style={{ color: "#a0f7b4" }}>✓ Strengths</div>
                  {report.overall_assessment.strengths?.map((s, i) => (
                    <div key={i} className="assess-item"><span className="assess-bullet" style={{ color: "#a0f7b4" }}>●</span><span>{s}</span></div>
                  ))}
                </div>
                <div className="assess-col">
                  <div className="assess-heading" style={{ color: "#f7a0a0" }}>✕ Limitations</div>
                  {report.overall_assessment.limitations?.map((l, i) => (
                    <div key={i} className="assess-item"><span className="assess-bullet" style={{ color: "#f7a0a0" }}>●</span><span>{l}</span></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {report.identified_gaps?.length > 0 && (
            <div className="gaps-section">
              <SectionH icon="◑" text="Research Gaps" color="#f7a0c8" />
              {report.identified_gaps.map((g, i) => {
                const isObj = typeof g === "object" && g !== null;
                const pc = isObj && g.priority ? priorityColor(g.priority) : "#f7a0c8";
                return (
                  <div key={i} className="gap-entry" style={{ borderLeftColor: pc + "60" }}>
                    {isObj?.priority && <div className="prio-badge" style={{ background: pc + "18", color: pc, border: `1px solid ${pc}40` }}>P{g.priority}</div>}
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>{isObj ? (g.description || g.gap) : g}</div>
                      {isObj && g.why_it_matters && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, fontStyle: "italic" }}>{g.why_it_matters}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {report.recommended_next_steps?.length > 0 && (
            <div className="ns-section">
              <SectionH icon="▷" text="Recommended Next Steps" color="#c8f7a0" />
              {report.recommended_next_steps.map((step, i) => {
                const isObj = typeof step === "object" && step !== null;
                const prio = isObj ? step.priority : i + 1;
                const pc = priorityColor(prio);
                return (
                  <div key={i} className="ns-entry" style={{ borderLeftColor: pc }}>
                    <div className="prio-badge" style={{ background: pc + "18", color: pc, border: `1px solid ${pc}40` }}>#{prio}</div>
                    <div>
                      <div className="ns-text">{isObj ? step.description : step}</div>
                      {isObj?.rationale && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>🎯 {step.rationale}</div>}
                      {isObj?.expected_insight && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}>🔓 {step.expected_insight}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SUGGESTIONS ─────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "Quantum computing breakthroughs 2024",
  "Impact of AI on job markets",
  "CRISPR gene editing applications",
  "Climate change mitigation strategies",
];

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [pipeSteps, setPipeSteps] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/history`)
      .then(r => r.json())
      .then(d => { if (d.sessions) setSessions(d.sessions.filter(s => s.has_data)); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSession = useCallback(async (session) => {
    setActiveSession(session.id);
    setMessages([]);
    setPipeSteps([]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/history/${session.id}`);
      const data = await res.json();
      if (res.ok) {
        const msgs = [{ type: "user", text: session.title }];
        if (data.tasks?.length)          msgs.push({ type: "tasks",          data: data.tasks });
        if (data.retrieval)              msgs.push({ type: "retrieval",      data: data.retrieval });
        if (data.synthesis)              msgs.push({ type: "synthesis",      data: data.synthesis });
        if (data.critique)               msgs.push({ type: "critic",         data: { critique_log: data.critique, refined_synthesis: data.refined_synthesis } });
        if (data.cross_synthesis)        msgs.push({ type: "cross_synthesis",data: data.cross_synthesis });
        if (data.gaps)                   msgs.push({ type: "gaps",           data: data.gaps });
        if (data.report)                 msgs.push({ type: "report",         data: data.report?.json || data.report, markdown: data.report?.report_markdown, tasks: data.tasks });
        setMessages(msgs);
      } else {
        setMessages([{ type: "error", text: data.detail || "Failed to load session." }]);
      }
    } catch {
      setMessages([{ type: "error", text: "Could not connect to backend." }]);
    } finally { setLoading(false); }
  }, []);

  const startResearch = useCallback(async () => {
    const q = query.trim();
    if (!q || loading) return;
    setQuery("");
    setActiveSession(null);
    setLoading(true);
    setPipeSteps([]);
    setMessages([{ type: "user", text: q }]);

    try {
      const response = await fetch(`${API_BASE}/api/research/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (!response.ok) {
        const err = await response.json();
        setMessages(prev => [...prev, { type: "error", text: err.detail || "Research failed." }]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const { step, status, data } = JSON.parse(line.slice(6));

            setPipeSteps(prev => {
              const idx = prev.findIndex(s => s.step === step);
              if (idx >= 0) { const u = [...prev]; u[idx] = { step, status }; return u; }
              return [...prev, { step, status }];
            });

            if (status === "running") {
              setMessages(prev => [...prev, { type: "thinking", agent: step, thinking: step }]);

            } else if (status === "done") {
              setMessages(prev => {
                const cleaned = prev.filter(m => m.thinking !== step);

                if (step === "task")            return [...cleaned, { type: "tasks",          data }];
                if (step === "retrieval")       return [...cleaned, { type: "retrieval",      data }];
                if (step === "synthesis")       return [...cleaned, { type: "synthesis",      data }];
                if (step === "critic")          return [...cleaned, { type: "critic",         data }];
                if (step === "cross_synthesis") return [...cleaned, { type: "cross_synthesis",data }];
                if (step === "gap")             return [...cleaned, { type: "gaps",           data }];
                if (step === "report") {
                  const tm = cleaned.find(m => m.type === "tasks");
                  return [...cleaned, {
                    type: "report",
                    data: data?.json,
                    markdown: data?.markdown,
                    tasks: tm?.data,
                  }];
                }
                if (step === "complete" && data) {
                  setActiveSession(data.folder);
                  fetch(`${API_BASE}/api/history`).then(r => r.json()).then(d => {
                    if (d.sessions) setSessions(d.sessions.filter(s => s.has_data));
                  }).catch(() => { });
                }
                return cleaned;
              });

            } else if (status === "failed") {
              setMessages(prev => [
                ...prev.filter(m => m.thinking !== step),
                { type: "error", text: data?.message || `${step} failed.` },
              ]);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setMessages(prev => [...prev, { type: "error", text: "Could not reach backend. Make sure FastAPI is running on port 8000." }]);
    } finally { setLoading(false); }
  }, [query, loading]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); startResearch(); }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">

        {/* TOP BAR */}
        <header className="topbar">
          <div className="logo">
            <div className="logo-badge">M</div>
            MultiAgent<span>Researcher</span>
          </div>
          <div className="top-right">
            <button className="btn-history" onClick={() => setShowSidebar(true)}>
              <span>☰</span> Research Log
            </button>
            <div className={`status-pill ${loading ? "live" : ""}`}>
              {loading ? "● PIPELINE ACTIVE" : "○ READY"}
            </div>
          </div>
        </header>

        {/* SIDEBAR */}
        <div className={`sidebar-backdrop ${showSidebar ? "open" : ""}`} onClick={() => setShowSidebar(false)} />
        <aside className={`sidebar ${showSidebar ? "open" : ""}`}>
          <div className="sb-head">
            <div className="sb-header-row">
              <div className="sb-title">Research Log</div>
              <button className="btn-close" onClick={() => setShowSidebar(false)}>✕</button>
            </div>
            <button className="btn-new" onClick={() => {
              setActiveSession(null); setMessages([]); setPipeSteps([]);
              setShowSidebar(false);
              setTimeout(() => inputRef.current?.focus(), 300);
            }}>＋ New Research</button>
          </div>
          {sessions.length > 0 && (
            <>
              <div className="sb-label">History</div>
              <div className="session-list">
                {sessions.map(s => (
                  <div key={s.id} className={`sess ${activeSession === s.id ? "active" : ""}`}
                    onClick={() => { loadSession(s); setShowSidebar(false); }}>
                    <div className="sess-dot" style={{ background: s.has_report ? "var(--accent)" : "var(--accent2)" }} />
                    <div className="sess-title" title={s.title}>{s.title}</div>
                    {s.has_refined && <span style={{ fontSize: 10, color: "var(--critic)", fontFamily: "var(--mono)" }}>↑</span>}
                    {s.has_report && <span className="sess-tick">✓</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* CHAT AREA */}
        <main className="chat-area fade-in">
          {messages.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🔬</div>
              <div className="empty-ttl">Research anything deeply</div>
              <div className="empty-desc">
                7 specialized AI agents collaborate in real time — fetching sources, synthesizing findings, critiquing quality, finding emergent insights, detecting gaps, and generating a complete report.
              </div>
              <div className="suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="sug-pill" onClick={() => { setQuery(s); inputRef.current?.focus(); }}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="msgs">
              <div className="msgs-inner">
                {messages.map((msg, i) => {
                  if (msg.type === "user")
                    return <div key={i} className="msg-user fade-in"><div className="user-bub">{msg.text}</div></div>;
                  if (msg.type === "thinking")
                    return <ErrorBoundary key={i}><ThinkingBubble agent={msg.agent} /></ErrorBoundary>;
                  if (msg.type === "tasks")
                    return <ErrorBoundary key={i}><TasksMsg tasks={msg.data} /></ErrorBoundary>;
                  if (msg.type === "retrieval")
                    return <ErrorBoundary key={i}><RetrievalMsg retrieval={msg.data} /></ErrorBoundary>;
                  if (msg.type === "synthesis")
                    return <ErrorBoundary key={i}><SynthesisMsg synthesis={msg.data} /></ErrorBoundary>;
                  if (msg.type === "critic")
                    return <ErrorBoundary key={i}><CriticMsg criticData={msg.data} /></ErrorBoundary>;
                  if (msg.type === "cross_synthesis")
                    return <ErrorBoundary key={i}><CrossSynthesisMsg crossData={msg.data} /></ErrorBoundary>;
                  if (msg.type === "gaps")
                    return <ErrorBoundary key={i}><GapMsg gaps={msg.data} /></ErrorBoundary>;
                  if (msg.type === "report")
                    return <ErrorBoundary key={i}><ReportMsg report={msg.data} markdown={msg.markdown} tasks={msg.tasks} /></ErrorBoundary>;
                  if (msg.type === "error")
                    return (
                      <div key={i} className="msg-agent fade-in">
                        <div className="ag-body"><div className="err-card">⚠ {msg.text}</div></div>
                      </div>
                    );
                  return null;
                })}
                <div ref={bottomRef} />
              </div>
            </div>
          )}

          {/* Input */}
          <div className="input-wrap">
            <div className="input-inner">
              {loading && pipeSteps.length > 0 && (
                <div className="pipe-live-inline">
                  {PIPELINE_ORDER.map(key => {
                    const step = pipeSteps.find(s => s.step === key);
                    const ag = AGENTS[key];
                    const status = step?.status ?? "pending";
                    const c = status !== "pending" ? ag.color : "var(--text-dim)";
                    return (
                      <div key={key} className="pipe-inline-item" style={{ color: c, opacity: status === "pending" ? 0.35 : 1 }}>
                        <span>{status === "running" ? "⟳" : status === "done" ? "✓" : "○"}</span>
                        <span>{ag.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="input-bar">
                <input
                  ref={inputRef}
                  className="chat-inp"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask a deep research question…"
                  disabled={loading}
                  autoFocus
                />
                <button className="btn-send" onClick={startResearch} disabled={loading || !query.trim()}>
                  {loading ? <div className="spinner" /> : "▷ Research"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}