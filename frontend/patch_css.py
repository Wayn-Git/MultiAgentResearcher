import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_css = """// ─── AGENT METADATA ────────────────────────────────────────────────────────
const AGENTS = {
  task: { label: "Task Agent", icon: "⬡", color: "#6366f1", desc: "Decomposing query into research tasks" },
  retrieval: { label: "Retriever", icon: "◈", color: "#06b6d4", desc: "Fetching web sources via Tavily" },
  synthesis: { label: "Synthesizer", icon: "◎", color: "#8b5cf6", desc: "Merging findings into unified summaries" },
  gap: { label: "Gap Detector", icon: "◑", color: "#ec4899", desc: "Identifying missing coverage & weak areas" },
  report: { label: "Report Agent", icon: "▣", color: "#f59e0b", desc: "Generating the final research report" },
  error: { label: "Error", icon: "✕", color: "#ef4444", desc: "" },
};
const PIPELINE_ORDER = ["task", "retrieval", "synthesis", "gap", "report"];

const pad = (n) => String(n).padStart(2, "0");
const priorityColor = (p) => {
  const n = typeof p === "string" ? (p === "high" ? 9 : p === "low" ? 3 : 5) : Number(p);
  return n >= 8 ? "#ec4899" : n >= 6 ? "#f59e0b" : n >= 4 ? "#06b6d4" : "#6366f1";
};

// ──────────────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #030303;
    --surface: #0a0a0a;
    --surface2: #121212;
    --surface3: #1a1a1a;
    --border: rgba(255,255,255,0.06);
    --border-hi: rgba(255,255,255,0.12);
    --accent:  #6366f1;
    --accent-hover: #818cf8;
    --accent2: #ec4899;
    --accent3: #06b6d4;
    --text:    #f3f4f6;
    --text-mid:rgba(255,255,255,0.6);
    --text-dim:rgba(255,255,255,0.3);
    --font: 'Plus Jakarta Sans', sans-serif;
    --mono: 'JetBrains Mono', monospace;
    --r: 20px;
    --r-sm: 12px;
    --shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
  }
  html, body, #root { height:100%; }
  body { background:var(--bg); color:var(--text); font-family:var(--font); font-size:15px; line-height:1.6; overflow:hidden; }
  ::-webkit-scrollbar { width:6px; height:6px; }
  ::-webkit-scrollbar-thumb { background:var(--surface3); border-radius:6px; }

  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.3);} 50%{box-shadow:0 0 0 8px rgba(99,102,241,0);} }

  /* ── Layout ── */
  .shell { display: flex; flex-direction: column; align-items: center; width: 100vw; height: 100vh; overflow: hidden; position: relative; }
  .topbar { width: 100%; height: 80px; display:flex; align-items:center; justify-content:space-between; padding:0 40px; background: transparent; position: absolute; top: 0; left: 0; z-index: 100; pointer-events: none; }
  .topbar::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,3,3,0.8) 0%, transparent 100%); pointer-events: none; }
  .topbar > * { pointer-events: auto; position: relative; z-index: 1; }
  
  .chat-area { flex:1; width: 100%; display:flex; flex-direction:column; overflow:hidden; background: radial-gradient(circle at 50% -10%, rgba(99,102,241,0.06), var(--bg) 60%); position: relative; padding-top: 80px; }

  /* ── Topbar ── */
  .logo { display:flex; align-items:center; gap:16px; font-weight:800; font-size:20px; letter-spacing: -0.5px; }
  .logo-badge { width:36px; height:36px; background:linear-gradient(135deg, var(--accent), var(--accent2)); border-radius:12px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:18px; flex-shrink:0; box-shadow: 0 4px 20px rgba(99,102,241,0.4); }
  .logo span { background: linear-gradient(90deg, var(--accent), var(--accent3)); -webkit-background-clip: text; color: transparent; }
  
  .top-right { display: flex; align-items: center; gap: 16px; }
  .status-pill { font-size:12px; font-weight:700; font-family:var(--mono); padding:8px 20px; border-radius:30px; border:1px solid rgba(255,255,255,0.05); color:var(--text-mid); background: rgba(255,255,255,0.02); backdrop-filter: blur(10px); transition:all .4s; }
  .status-pill.live { border-color:var(--accent); color:var(--accent); background: rgba(99,102,241,0.05); animation:pulseGlow 2s infinite; }
  
  .btn-history { background: rgba(255,255,255,0.02); border: 1px solid var(--border); color: var(--text-mid); padding: 8px 20px; border-radius: 30px; font-family: var(--font); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 8px; backdrop-filter: blur(10px); }
  .btn-history:hover { color: #fff; background: rgba(255,255,255,0.05); border-color: var(--border-hi); transform: translateY(-1px); }

  /* ── Sidebar (Drawer) ── */
  .sidebar-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 1000; opacity: 0; pointer-events: none; transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
  .sidebar-backdrop.open { opacity: 1; pointer-events: auto; }
  .sidebar { position: fixed; top: 0; bottom: 0; right: 0; width: 400px; background: rgba(10, 10, 10, 0.85); backdrop-filter: blur(40px) saturate(150%); border-left: 1px solid var(--border); z-index: 1001; transform: translateX(100%); transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; box-shadow: -20px 0 60px rgba(0,0,0,0.5); }
  .sidebar.open { transform: translateX(0); }
  
  .sb-head { padding:40px 32px 24px; display: flex; flex-direction: column; gap: 24px; border-bottom: 1px solid var(--border); }
  .sb-header-row { display: flex; align-items: center; justify-content: space-between; }
  .sb-title { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
  .btn-close { background: rgba(255,255,255,0.05); border: none; width: 36px; height: 36px; border-radius: 50%; color: var(--text-mid); font-size: 16px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
  .btn-close:hover { color: #fff; background: var(--surface3); }
  
  .btn-new { width:100%; padding:16px; border:1px solid rgba(99,102,241,0.3); background:rgba(99,102,241,0.05); color:var(--accent-hover); font-family:var(--font); font-weight:700; font-size:15px; cursor:pointer; border-radius:var(--r); display:flex; align-items:center; justify-content:center; gap:10px; transition:all .3s cubic-bezier(0.16, 1, 0.3, 1); }
  .btn-new:hover { border-color:var(--accent); background:rgba(99,102,241,0.1); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.15); }
  .sb-label { font-size:12px; font-weight: 700; letter-spacing:1px; text-transform:uppercase; color:var(--text-dim); margin:24px 32px 12px; }
  .session-list { flex:1; overflow-y:auto; padding:0 24px 32px; display: flex; flex-direction: column; gap: 8px; }
  .sess { display:flex; align-items:center; gap:16px; padding:16px 20px; border-radius:var(--r); cursor:pointer; transition:all .3s cubic-bezier(0.16,1,0.3,1); border:1px solid var(--border); background: rgba(255,255,255,0.02); }
  .sess:hover { background:rgba(255,255,255,0.04); border-color: var(--border-hi); transform: translateX(-4px); }
  .sess.active { background:var(--surface2); border-color:var(--accent); box-shadow: inset 4px 0 0 var(--accent), 0 8px 24px rgba(0,0,0,0.3); }
  .sess-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; box-shadow: 0 0 12px currentColor; }
  .sess-title { font-size:15px; font-weight: 500; color:var(--text-mid); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; transition: color 0.2s;}
  .sess.active .sess-title { color:#fff; font-weight: 600; }
  .sess-tick { font-size:14px; color:var(--accent); flex-shrink:0; font-weight: 800; }
  
  .pipe-live-inline { position: absolute; bottom: calc(100% + 24px); left: 50%; transform: translateX(-50%); display: flex; gap: 8px; background: rgba(10, 10, 10, 0.6); padding: 8px; border-radius: 40px; border: 1px solid var(--border); backdrop-filter: blur(20px); box-shadow: 0 10px 40px rgba(0,0,0,0.4); flex-wrap: wrap; justify-content: center; width: max-content; z-index: -1; animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
  .pipe-inline-item { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 600; font-family: var(--font); padding: 8px 16px; border-radius: 30px; transition: all 0.4s cubic-bezier(0.16,1,0.3,1); background: transparent; }
  .pipe-inline-item.active { background: rgba(255,255,255,0.05); }
  .pipe-inline-ic { font-size: 16px; font-family: var(--mono); }

  /* ── Chat ── */
  .msgs { flex:1; overflow-y:auto; padding:20px 0 200px; scroll-behavior: smooth; }
  .msgs-inner { max-width:900px; margin:0 auto; padding:0 32px; display:flex; flex-direction:column; gap:40px; }

  /* User bubble */
  .msg-user { display:flex; justify-content:flex-end; }
  .user-bub { background: var(--surface2); border:1px solid var(--border-hi); color: #fff; padding:18px 28px; border-radius:24px 24px 6px 24px; max-width:80%; font-size:16px; font-weight: 500; box-shadow: var(--shadow); line-height: 1.6; letter-spacing: -0.2px; }

  /* Agent row */
  .msg-agent { display:flex; flex-direction:column; background: transparent; border: none; padding: 0; }
  .ag-head { display:flex; align-items:center; gap:16px; margin-bottom:20px; }
  .ag-ic { width:44px; height:44px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; border:1px solid; background:var(--surface2); box-shadow: 0 8px 20px rgba(0,0,0,0.2); }
  .ag-name { font-size:16px; font-weight:800; letter-spacing: -0.2px; color: #fff; }
  .ag-sub  { font-size:13px; color:var(--text-mid); font-weight: 500; margin-top: 4px;}
  .ag-body { margin-left:60px; }

  /* Thinking */
  .thinking { background:var(--surface2); border:1px solid var(--border); border-radius:var(--r); padding:16px 24px; display:flex; align-items:center; gap:16px; width: max-content; box-shadow: var(--shadow); }
  .dots { display:flex; gap:6px; }
  .d { width:6px; height:6px; border-radius:50%; background: currentColor; animation:blink 1.4s infinite ease-in-out both; }
  .d:nth-child(2){animation-delay:.2s;} .d:nth-child(3){animation-delay:.4s;}
  @keyframes blink { 0%,80%,100%{opacity:.2;transform:scale(.8);} 40%{opacity:1;transform:scale(1.2); box-shadow: 0 0 10px currentColor;} }

  /* ─── Cards Common ─── */
  .c-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r); overflow:hidden; transition:all .3s ease; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
  .c-card:hover { border-color:var(--border-hi); box-shadow: var(--shadow); transform: translateY(-2px); }

  /* ─── Task Cards ─── */
  .tasks-wrap { display:flex; flex-direction:column; gap:12px; }
  .task-c { padding:20px 24px; display:flex; gap:16px; align-items:flex-start; }
  .t-num { font-family:var(--mono); font-size:13px; font-weight: 700; color:var(--accent); min-width:30px; margin-top:2px; }
  .t-desc { font-size:15px; font-weight: 500; flex:1; line-height:1.6; color: #fff; }
  .t-badge { font-size:11px; font-weight: 700; font-family:var(--font); padding:4px 12px; border-radius:20px; flex-shrink:0; text-transform: uppercase; letter-spacing: 1px;}

  /* ─── Retrieval Sources ─── */
  .retrieval-wrap { display:flex; flex-direction:column; gap:20px; }
  .task-block-head { padding:20px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:16px; cursor:pointer; }
  .task-block-head:hover { background:var(--surface2); }
  .tb-num { font-family:var(--mono); font-size:13px; font-weight: 700; color:var(--accent3); }
  .tb-title { font-size:16px; font-weight:700; flex:1; color: #fff; letter-spacing: -0.2px; }
  .tb-count { font-size:12px; font-weight: 600; color:var(--accent3); background: rgba(6, 182, 212, 0.1); padding: 4px 12px; border-radius: 20px;}
  .tb-chev { font-size:12px; color:var(--text-mid); transition:transform .3s; }
  .tb-chev.open { transform:rotate(90deg); }
  .sources-list { display:grid; grid-template-columns: 1fr; gap:1px; background: var(--border); }
  .source-item { padding:24px; background: var(--surface); }
  .source-item:hover { background: var(--surface2); }
  .source-header { display:flex; align-items:flex-start; gap:12px; margin-bottom:12px; }
  .source-icon { font-size:16px; color:var(--accent3); flex-shrink:0; }
  .source-title { font-size:16px; font-weight:700; color:#fff; line-height:1.4; }
  .source-org { font-size:11px; font-weight:600; font-family:var(--mono); color:var(--accent3); margin-top:6px; padding: 4px 10px; border-radius: 6px; background: rgba(6, 182, 212, 0.1); display: inline-block;}
  .source-summary { font-size:15px; color:var(--text-mid); line-height:1.8; margin-bottom:20px; padding-left: 28px;}
  .kp-label { font-size:11px; font-weight: 700; text-transform:uppercase; letter-spacing:2px; color:var(--accent3); margin-bottom:12px; padding-left: 28px;}
  .kp-list { display:flex; flex-direction:column; gap:10px; padding-left: 28px;}
  .kp-item { display:flex; gap:12px; font-size:14px; font-weight: 500; color:#fff; line-height:1.6; }
  .kp-bullet { color:var(--accent3); flex-shrink:0; margin-top:4px; font-size:12px; }

  /* ─── Synthesis ─── */
  .synth-wrap { display:flex; flex-direction:column; gap:20px; }
  .sc-head { display:flex; align-items:center; gap:16px; padding:20px 24px; cursor:pointer; }
  .sc-head:hover { background:var(--surface2); }
  .sc-num { font-family:var(--mono); font-size:13px; font-weight: 700; color:var(--accent); }
  .sc-task { font-size:16px; font-weight:700; flex:1; line-height:1.4; color: #fff; letter-spacing: -0.2px;}
  .sc-chev { font-size:12px; color:var(--text-mid); transition:transform .3s; }
  .synth-card.open .sc-chev { transform:rotate(90deg); }
  .sc-body { border-top:1px solid var(--border); background: var(--surface); }
  .sc-summary-block { padding:24px 24px 0; }
  .sc-summary-label { font-size:11px; font-weight: 700; text-transform:uppercase; letter-spacing:2px; color:var(--accent); margin-bottom:12px; }
  .sc-summary-text { font-size:16px; font-weight: 500; color:#fff; line-height:1.8; margin-bottom:24px; }
  .sc-section { padding:0 24px 24px; }
  .sc-divider { border:none; border-top:1px solid var(--border); margin:0 24px 20px; }
  .tags-row { display:flex; flex-wrap:wrap; gap:10px; }
  .tag { font-size:13px; font-weight: 600; padding:6px 16px; border-radius:20px; border:1px solid transparent; transition: all 0.2s; }
  .tag.g { border-color:rgba(99, 102, 241, 0.3); color:var(--accent); background:rgba(99, 102, 241, 0.08); }
  .tag.w { border-color:rgba(236, 72, 153, 0.3); color:var(--accent2); background:rgba(236, 72, 153, 0.08); }

  /* ─── Gap Analysis ─── */
  .gap-section { padding:24px 32px; border-bottom:1px solid var(--border); }
  .gap-section:last-child { border-bottom:none; }
  .gap-title { font-size:13px; font-weight: 800; text-transform:uppercase; letter-spacing:2px; color:var(--accent2); margin-bottom:20px; display: flex; align-items: center; }
  .gap-title::before { content: ''; display: inline-block; width: 8px; height: 8px; background: var(--accent2); border-radius: 50%; margin-right: 12px; box-shadow: 0 0 12px var(--accent2); }
  .gap-item { display:flex; gap:16px; margin-bottom:16px; font-size:15px; font-weight: 500; color:#fff; line-height:1.6; }
  .gap-dot { flex-shrink:0; margin-top:8px; width:6px; height:6px; border-radius:50%; box-shadow: 0 0 8px currentColor; }
  .cov-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:20px; }
  .cov-cell { background:var(--surface2); border-radius:var(--r-sm); padding:20px 24px; border:1px solid var(--border); transition: transform 0.2s; }
  .cov-cell:hover { transform: translateY(-4px); border-color: var(--border-hi); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
  .cov-label { font-size:11px; font-weight: 700; text-transform:uppercase; letter-spacing:1.5px; color:var(--text-mid); margin-bottom:8px; }
  .cov-text { font-size:15px; font-weight: 600; color:#fff; line-height:1.6; }
  .suggested-grid { display:flex; flex-direction:column; gap:12px; }
  .sug-item { display:flex; gap:20px; align-items:flex-start; padding:20px 24px; background:var(--surface2); border-radius:var(--r-sm); border:1px solid var(--border); transition: all 0.2s; }
  .sug-item:hover { border-color: var(--accent2); background: rgba(236, 72, 153, 0.05); }

  /* ─── Final Report ─── */
  .report-card { border:1px solid var(--border-hi); background: #080808; box-shadow: 0 20px 80px rgba(0,0,0,0.6); }
  .report-banner { padding:40px 48px; border-bottom:1px solid var(--border); background:linear-gradient(135deg, rgba(245, 158, 11, 0.1), transparent); position: relative; overflow: hidden; }
  .report-banner::before { content: ''; position: absolute; inset: 0; background: url('https://www.transparenttextures.com/patterns/cubes.png') repeat; opacity: 0.1; }
  .report-title { font-size:32px; font-weight:800; margin-bottom:20px; background: linear-gradient(90deg, #f59e0b, #fbbf24); -webkit-background-clip: text; color: transparent; letter-spacing: -1px; position: relative; z-index: 1;}
  .exec-summary { font-size:17px; font-weight: 500; color:#fff; line-height:1.8; border-left:4px solid #f59e0b; padding:20px 32px; background:rgba(245, 158, 11, 0.05); border-radius:0 var(--r) var(--r) 0; position: relative; z-index: 1; }
  
  .stats-row { display:flex; gap:20px; flex-wrap:wrap; padding:32px 48px; border-bottom:1px solid var(--border); background: rgba(0,0,0,0.2); }
  .stat-box { background:var(--surface2); border:1px solid var(--border); border-radius:var(--r-sm); padding:24px; flex:1; min-width:160px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
  .stat-val { font-size:40px; font-weight:800; font-family:var(--mono); color:#f59e0b; line-height: 1; text-shadow: 0 4px 20px rgba(245, 158, 11, 0.3); }
  .stat-lab { font-size:12px; font-weight: 700; text-transform:uppercase; letter-spacing:2px; color:var(--text-mid); margin-top:12px; }

  .research-block { padding:40px 48px; border-bottom:1px solid var(--border); transition: background 0.3s;}
  .research-block:hover { background: rgba(255, 255, 255, 0.02); }
  .research-block:last-of-type { border-bottom:none; }
  .rb-header { display:flex; gap:20px; align-items:flex-start; margin-bottom:24px; }
  .rb-num { font-family:var(--mono); font-size:15px; font-weight: 700; color:#f59e0b; flex-shrink:0; margin-top:2px; background: rgba(245, 158, 11, 0.1); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px;}
  .rb-task { font-size:20px; font-weight:800; line-height:1.3; color: #fff; letter-spacing: -0.5px; }
  .rb-summary { font-size:16px; font-weight: 500; color:var(--text-mid); line-height:1.8; margin-bottom:32px; padding-left: 56px; }
  .rb-findings { display:flex; flex-direction:column; gap:16px; padding-left: 56px; }
  .finding-card { background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:var(--r-sm); padding:24px; border-left:4px solid; transition: all 0.2s; }
  .finding-card:hover { transform: translateY(-4px); border-color: var(--border-hi); box-shadow: var(--shadow); background: var(--surface2); }
  .finding-text { font-size:16px; font-weight:600; margin-bottom:12px; line-height:1.6; color: #fff; }
  .finding-support { font-size:14px; color:var(--text-mid); line-height:1.6; font-style:italic; }

  .assess-section { padding:40px 48px; border-bottom:1px solid var(--border); background: rgba(0,0,0,0.1); }
  .assess-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .assess-col { background:var(--surface2); border-radius:var(--r); padding:32px; border:1px solid var(--border); }
  .assess-heading { font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:2px; margin-bottom:24px; display:flex; align-items:center; gap:12px; color: #f59e0b; }
  .assess-item { display:flex; gap:16px; font-size:15px; font-weight: 500; color:#fff; line-height:1.6; margin-bottom:16px; }
  .assess-bullet { flex-shrink:0; margin-top:6px; font-size:12px; color: #f59e0b; }

  .gaps-section { padding:40px 48px; border-bottom:1px solid var(--border); }
  .ns-section { padding:40px 48px; background: linear-gradient(0deg, rgba(245, 158, 11, 0.03) 0%, transparent 100%); }
  .section-heading { font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:2px; margin-bottom:24px; display:flex; align-items:center; gap:12px; color: #f59e0b; }
  .ns-entry { display:flex; gap:20px; align-items:flex-start; padding:24px; background:var(--surface2); border:1px solid var(--border); border-radius:var(--r-sm); margin-bottom:16px; border-left:4px solid; transition: all 0.3s; }
  .ns-entry:hover { transform: translateY(-4px); border-color: #f59e0b; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
  .ns-text { font-size:16px; font-weight: 600; color:#fff; line-height:1.6; }

  /* Error */
  .err-card { background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); border-radius:var(--r-sm); padding:20px 24px; font-size:15px; font-weight: 600; color:#fca5a5; box-shadow: 0 4px 20px rgba(239, 68, 68, 0.15); }

  /* ── Input Bar (Floating) ── */
  .input-wrap { position: absolute; bottom: 0; left: 0; right: 0; padding: 0 40px 40px; pointer-events: none; display: flex; flex-direction: column; align-items: center; z-index: 100;}
  .input-inner { width: 100%; max-width: 900px; position: relative; pointer-events: auto; }
  .input-bar { background:rgba(15, 15, 15, 0.8); backdrop-filter: blur(32px) saturate(150%); border:1px solid var(--border-hi); padding:10px 10px 10px 28px; border-radius:40px; display:flex; gap:16px; box-shadow: 0 24px 80px rgba(0,0,0,0.8), inset 0 2px 10px rgba(255,255,255,0.05); transition:all .4s cubic-bezier(0.16, 1, 0.3, 1); align-items: center; }
  .input-bar:focus-within { border-color:rgba(99,102,241,0.5); box-shadow: 0 24px 80px rgba(0,0,0,0.9), 0 0 0 4px rgba(99,102,241,0.1); transform: translateY(-2px); }
  
  .chat-inp { flex:1; background:transparent; border:none; color:#fff; font-family:var(--font); font-size:17px; font-weight: 500; padding:12px 0; outline:none; }
  .chat-inp::placeholder { color:var(--text-dim); }
  .chat-inp:disabled { opacity:.5; cursor:not-allowed; }
  
  .btn-send { background:var(--text); color:#000; border:none; cursor:pointer; border-radius:30px; padding:0 36px; height: 56px; font-family:var(--font); font-size:16px; font-weight:800; letter-spacing: 0.5px; display:flex; align-items:center; gap:12px; transition:all .3s cubic-bezier(0.16, 1, 0.3, 1); white-space:nowrap; }
  .btn-send:hover:not(:disabled) { background: #fff; transform:scale(1.04); box-shadow: 0 10px 30px rgba(255,255,255,0.2); }
  .btn-send:active:not(:disabled) { transform:scale(0.98); }
  .btn-send:disabled { opacity:.5; cursor:not-allowed; transform:none; box-shadow: none; background: var(--surface3); color: var(--text-mid); }

  /* ── Empty state ── */
  .empty { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; text-align:center; padding:80px 40px; }
  .empty-icon { font-size:80px; margin-bottom:32px; filter: drop-shadow(0 0 40px rgba(99,102,241,0.4)); animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .empty-ttl { font-size:36px; font-weight:800; margin-bottom:16px; color: #fff; letter-spacing: -1px; animation: slideUp 0.8s 0.1s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
  .empty-desc { font-size:17px; font-weight: 500; color:var(--text-mid); max-width:540px; line-height:1.7; animation: slideUp 0.8s 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
  .suggestions { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; margin-top:40px; animation: slideUp 0.8s 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
  .sug-pill { font-size:14px; font-weight: 600; padding:12px 24px; border:1px solid var(--border); border-radius:30px; color:var(--text-mid); cursor:pointer; transition:all .3s cubic-bezier(0.16, 1, 0.3, 1); background:rgba(255,255,255,0.02); backdrop-filter: blur(10px); }
  .sug-pill:hover { border-color:var(--accent); color: #fff; background: rgba(99,102,241,0.1); transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
  
  .spinner { width:16px; height:16px; border:2px solid rgba(0,0,0,.2); border-top-color:#000; border-radius:50%; animation:spin .6s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg);} }
`
"""

content = re.sub(r'// ─── AGENT METADATA ────────────────────────────────────────────────────────.*?@keyframes spin \{ to\{transform:rotate\(360deg\);\} \}\n`', new_css, content, flags=re.DOTALL)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched.")
