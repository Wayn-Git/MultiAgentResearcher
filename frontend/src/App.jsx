import React, { useState, useEffect, useRef, useCallback, Component } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VercelV0Chat } from "./components/ui/v0-ai-chat";
import { Waves } from "./components/ui/wave-background";
import "./styles/chat.css";
import "./index.css";

// ─── MOTION VARIANTS ──────────────────────────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const cardItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const scaleOnHover = {
  whileHover: { scale: 1.02, transition: { duration: 0.2 } },
  whileTap: { scale: 0.98 },
};

const expandCollapse = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error("[ErrorBoundary]", e, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="err-card">
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
  task: { label: "Task Agent", icon: "⬡", color: "#F7B731", desc: "Decomposing query into research tasks" },
  retrieval: { label: "Retriever", icon: "◈", color: "#8B5CF6", desc: "Fetching web sources via Tavily" },
  synthesis: { label: "Synthesizer", icon: "◎", color: "#34D399", desc: "Merging findings into unified summaries" },
  critic: { label: "Critic", icon: "⟳", color: "#FB923C", desc: "Critiquing & refining each synthesis" },
  cross_synthesis: { label: "Cross-Synthesizer", icon: "⬡", color: "#67E8F9", desc: "Finding emergent cross-task insights" },
  gap: { label: "Gap Detector", icon: "◑", color: "#F472B6", desc: "Identifying missing coverage & weak areas" },
  report: { label: "Report Agent", icon: "▣", color: "#FBBF24", desc: "Generating the final research report" },
  error: { label: "Error", icon: "✕", color: "#F87171", desc: "" },
};

const PIPELINE_ORDER = ["task", "retrieval", "synthesis", "critic", "cross_synthesis", "gap", "report"];

const pad = (n) => String(n).padStart(2, "0");
const priorityColor = (p) => {
  const n = typeof p === "string" ? (p === "high" ? 9 : p === "low" ? 3 : 5) : Number(p);
  return n >= 8 ? "#FB923C" : n >= 6 ? "#34D399" : n >= 4 ? "#8B5CF6" : "#67E8F9";
};

// ─── Shared helpers ───────────────────────────────────────────────────────────
function AgentHeader({ agentKey, subtitle }) {
  const ag = AGENTS[agentKey] || AGENTS.task;
  return (
    <div className="ag-head">
      <motion.div className="ag-ic" style={{ borderColor: ag.color + "30" }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}>
        <span style={{ color: ag.color }}>{ag.icon}</span>
      </motion.div>
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
    <motion.div className="msg-agent" {...fadeUp}>
      <AgentHeader agentKey={agent} />
      <div className="ag-body">
        <div className="thinking">
          <div className="dots">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="d" style={{ background: ag.color }}
                animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--mono)" }}>
            {ag.desc}…
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── TASKS ────────────────────────────────────────────────────────────────────
function TasksMsg({ tasks }) {
  if (!tasks?.length) return null;
  return (
    <motion.div className="msg-agent" {...fadeUp}>
      <AgentHeader agentKey="task" subtitle={`${tasks.length} research tasks generated`} />
      <div className="ag-body">
        <motion.div className="tasks-wrap" variants={stagger} initial="initial" animate="animate">
          {tasks.map((t, i) => (
            <motion.div key={i} className="task-c" variants={cardItem}
              whileHover={{ x: 5, transition: { duration: 0.2 } }}>
              <div className="t-num">T{pad(i + 1)}</div>
              <div className="t-desc">{t.description}</div>
              <div className="t-badge" style={{
                background: priorityColor(t.priority) + "18",
                border: `1px solid ${priorityColor(t.priority)}40`,
                color: priorityColor(t.priority),
              }}>P{t.priority}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
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
    <motion.div className="msg-agent" {...fadeUp}>
      <AgentHeader agentKey="retrieval" subtitle={`${totalSources} sources across ${entries.length} tasks`} />
      <div className="ag-body">
        <motion.div className="retrieval-wrap" variants={stagger} initial="initial" animate="animate">
          {entries.map(([task, sources], i) => (
            <motion.div key={i} className="task-block" variants={cardItem}>
              <div className={`task-block-head ${open[i] ? "open" : ""}`} onClick={() => setOpen(p => ({ ...p, [i]: !p[i] }))}>
                <span className="tb-num">T{pad(i + 1)}</span>
                <span className="tb-title">{task}</span>
                <span className="tb-count">{Array.isArray(sources) ? sources.length : 0} sources</span>
                <motion.span className="tb-chev" animate={{ rotate: open[i] ? 90 : 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}>▶</motion.span>
              </div>
              <AnimatePresence>
                {open[i] && Array.isArray(sources) && (
                  <motion.div {...expandCollapse} style={{ overflow: "hidden" }}>
                    <div className="sources-list">
                      {sources.map((src, j) => (
                        <motion.div key={j} className="source-item"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          transition={{ delay: j * 0.05 }}>
                          <div className="source-title">{src.title || src.source}</div>
                          {src.title && src.source && <div className="source-org">{src.source}</div>}
                          {src.summary && <div className="source-summary">{src.summary}</div>}
                          {src.key_points?.length > 0 && (
                            <>
                              <div className="sec-label" style={{ paddingLeft: 0, marginTop: 8 }}>Key Points</div>
                              <div className="kp-list">
                                {src.key_points.map((kp, k) => (
                                  <div key={k} className="kp-item">
                                    <span className="kp-bullet" style={{ color: "var(--accent)" }}>▸</span>
                                    <span>{kp}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
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
    <motion.div className="msg-agent" {...fadeUp}>
      <AgentHeader agentKey={agKey} subtitle={subtitle} />
      <div className="ag-body">
        <motion.div className="synth-wrap" variants={stagger} initial="initial" animate="animate">
          {entries.map(({ task, data }, i) => (
            <motion.div key={i} className={`synth-card ${open[i] ? "open" : ""}`} variants={cardItem}>
              <div className="sc-head" onClick={() => setOpen(p => ({ ...p, [i]: !p[i] }))}>
                <span className="sc-num">{isRefined ? "R" : "S"}{pad(i + 1)}</span>
                <span className="sc-task">{task}</span>
                {isRefined && data?.critique_addressed && <span className="refined-badge">✓ Refined</span>}
                <motion.span className="sc-chev" animate={{ rotate: open[i] ? 90 : 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}>▶</motion.span>
              </div>
              <AnimatePresence>
                {open[i] && data && (
                  <motion.div {...expandCollapse} style={{ overflow: "hidden" }}>
                    <div className="sc-body">
                      {data.synthesized_summary && (
                        <div className="sc-section">
                          <div className="sec-label">Synthesized Summary</div>
                          <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.75 }}>{data.synthesized_summary}</div>
                          {data.critique_addressed && (
                            <div style={{ marginTop: 10, fontSize: 12, color: "var(--green)", fontStyle: "italic" }}>
                              Improved: {data.critique_addressed}
                            </div>
                          )}
                        </div>
                      )}
                      {data.confidence_level && (
                        <div className="sc-section" style={{ paddingTop: 0 }}>
                          <span style={{
                            fontSize: 10, fontFamily: "var(--mono)", padding: "3px 10px", borderRadius: 100, fontWeight: 600,
                            background: data.confidence_level === "high" ? "var(--green-soft)" : data.confidence_level === "medium" ? "var(--orange-soft)" : "var(--red-soft)",
                            color: data.confidence_level === "high" ? "var(--green)" : data.confidence_level === "medium" ? "var(--orange)" : "var(--red)",
                            border: "1px solid currentColor",
                          }}>{data.confidence_level} confidence</span>
                        </div>
                      )}
                      {data.causal_mechanisms?.length > 0 && (
                        <><hr className="divider" /><div className="sc-section">
                          <div className="sec-label">Causal Mechanisms</div>
                          <div className="kp-list">{data.causal_mechanisms.map((m, j) => (
                            <div key={j} className="kp-item"><span className="kp-bullet" style={{ color: "var(--teal)" }}>⟶</span><span>{m}</span></div>
                          ))}</div>
                        </div></>
                      )}
                      {data.strongly_supported_points?.length > 0 && (
                        <><hr className="divider" /><div className="sc-section">
                          <div className="sec-label">Well-Supported Findings</div>
                          <div className="kp-list">{data.strongly_supported_points.map((p, j) => (
                            <div key={j} className="kp-item"><span className="kp-bullet" style={{ color: "var(--green)" }}>✓</span><span>{p}</span></div>
                          ))}</div>
                        </div></>
                      )}
                      {data.key_statistics_and_data?.length > 0 && (
                        <><hr className="divider" /><div className="sc-section">
                          <div className="sec-label">Key Statistics</div>
                          <div className="kp-list">{data.key_statistics_and_data.map((s, j) => (
                            <div key={j} className="kp-item"><span className="kp-bullet" style={{ color: "var(--accent)" }}>📊</span><span>{s}</span></div>
                          ))}</div>
                        </div></>
                      )}
                      {data.conflicting_or_debated_points?.length > 0 && (
                        <><hr className="divider" /><div className="sc-section">
                          <div className="sec-label">Conflicting Points</div>
                          <div className="kp-list">{data.conflicting_or_debated_points.map((c, j) => (
                            <div key={j} className="kp-item"><span className="kp-bullet" style={{ color: "var(--orange)" }}>⚡</span><span>{c}</span></div>
                          ))}</div>
                        </div></>
                      )}
                      {data.weak_or_missing_areas?.length > 0 && (
                        <><hr className="divider" /><div className="sc-section">
                          <div className="sec-label">Missing Areas</div>
                          <div className="tags-row">{data.weak_or_missing_areas.map((w, j) => <span key={j} className="tag w">{w}</span>)}</div>
                        </div></>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── CRITIC ───────────────────────────────────────────────────────────────────
function CriticMsg({ criticData }) {
  const [open, setOpen] = useState({});
  const log = criticData?.critique_log || criticData;
  const entries = log && typeof log === "object" && !Array.isArray(log)
    ? Object.entries(log).filter(([, v]) => v && !v.error)
    : [];

  const scores = entries.map(([, c]) => c?.overall_quality_score).filter(s => typeof s === "number");
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
  const scoreColor = (s) => s >= 8 ? "var(--green)" : s >= 6 ? "var(--orange)" : "var(--red)";

  if (!entries.length) {
    return (
      <motion.div className="msg-agent" {...fadeUp}>
        <AgentHeader agentKey="critic" subtitle="Critique complete — all syntheses refined" />
        <div className="ag-body">
          <div style={{ fontSize: 13, color: "var(--text-tertiary)", fontStyle: "italic" }}>
            Critique log not available for this session.
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="msg-agent" {...fadeUp}>
      <AgentHeader agentKey="critic" subtitle={`${entries.length} syntheses critiqued & refined`} />
      <div className="ag-body">
        <motion.div className="critic-wrap" variants={stagger} initial="initial" animate="animate">
          {avg && (
            <motion.div className="critic-summary-bar" variants={cardItem}>
              <div>
                <div className="critic-avg" style={{ color: scoreColor(parseFloat(avg)) }}>{avg}</div>
                <div className="critic-avg-label">avg quality pre-refinement</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                  All syntheses with quality below 9/10 were refined. The report uses the improved versions.
                </div>
              </div>
            </motion.div>
          )}
          {entries.map(([task, critique], i) => {
            const score = critique?.overall_quality_score;
            const sc = scoreColor(score);
            const pct = score ? `${(score / 10) * 100}%` : "0%";
            return (
              <motion.div key={i} className={`critic-task-card ${open[i] ? "open" : ""}`} variants={cardItem}>
                <div className="critic-head" onClick={() => setOpen(p => ({ ...p, [i]: !p[i] }))}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--orange)", minWidth: 30 }}>C{pad(i + 1)}</span>
                  <div className="score-bar-wrap">
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{task.slice(0, 80)}{task.length > 80 ? "…" : ""}</div>
                    <div className="score-bar-track">
                      <motion.div className="score-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: pct }}
                        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: i * 0.1 }}
                        style={{ background: `linear-gradient(90deg, ${sc}80, ${sc})` }} />
                    </div>
                  </div>
                  {score != null && <span style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 800, color: sc, minWidth: 36, textAlign: "right" }}>{score}</span>}
                  <motion.span className="critic-chev" animate={{ rotate: open[i] ? 90 : 0 }}
                    transition={{ duration: 0.25 }}>▶</motion.span>
                </div>
                <AnimatePresence>
                  {open[i] && (
                    <motion.div {...expandCollapse} style={{ overflow: "hidden" }}>
                      <div className="critic-body">
                        {critique.overall_assessment && (
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16, padding: "12px 14px", background: "var(--orange-soft)", borderRadius: "var(--r-xs)", border: "1px solid rgba(255,159,10,0.1)" }}>
                            {critique.overall_assessment}
                          </div>
                        )}
                        {critique.vague_claims?.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div className="sec-label" style={{ color: "var(--orange)" }}>Vague Claims Flagged</div>
                            {critique.vague_claims.slice(0, 3).map((c, j) => (
                              <div key={j} className="critique-item">
                                <div className="critique-dot" style={{ background: "var(--orange)" }} />
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
                            <div className="sec-label" style={{ color: "var(--teal)" }}>Missing Mechanisms</div>
                            {critique.missing_mechanisms.slice(0, 3).map((m, j) => (
                              <div key={j} className="critique-item">
                                <div className="critique-dot" style={{ background: "var(--teal)" }} />
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
                            <div className="sec-label" style={{ color: "var(--green)" }}>Priority Fixes Applied</div>
                            {critique.priority_fixes.map((f, j) => (
                              <div key={j} className="kp-item" style={{ marginBottom: 6 }}>
                                <span className="kp-bullet" style={{ color: "var(--green)" }}>→</span>
                                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{f}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── CROSS SYNTHESIS ──────────────────────────────────────────────────────────
function CrossSynthesisMsg({ crossData }) {
  if (!crossData || crossData.error) return null;
  return (
    <motion.div className="msg-agent" {...fadeUp}>
      <AgentHeader agentKey="cross_synthesis" subtitle="Emergent insights from cross-task analysis" />
      <div className="ag-body">
        <motion.div className="cross-wrap" variants={stagger} initial="initial" animate="animate">
          {crossData.central_argument && (
            <motion.div className="central-arg" variants={cardItem}>
              <div className="central-arg-label">Central Argument</div>
              <div className="central-arg-text">{crossData.central_argument}</div>
            </motion.div>
          )}
          {crossData.emergent_insights?.length > 0 && (
            <motion.div className="cross-section" variants={cardItem}>
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
                      {ins.draws_from.map((t, j) => <span key={j} className="cross-source-pill">{t.slice(0, 50)}{t.length > 50 ? "…" : ""}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
          {crossData.cross_task_contradictions?.length > 0 && (
            <motion.div className="cross-section" variants={cardItem}>
              <div className="cross-section-head">
                <span className="cross-section-label">Cross-Task Contradictions</span>
                <span className="cross-section-count">{crossData.cross_task_contradictions.length}</span>
              </div>
              {crossData.cross_task_contradictions.map((c, i) => (
                <div key={i} className="contradiction-item">
                  <div className="contradiction-vs">
                    <div className="contra-side contra-a">{c.finding_a}</div>
                    <div style={{ alignSelf: "center", color: "var(--text-tertiary)", fontSize: 18, flexShrink: 0 }}>⟷</div>
                    <div className="contra-side contra-b">{c.finding_b}</div>
                  </div>
                  {c.resolution && <div className="contra-resolution">Resolution: {c.resolution}</div>}
                </div>
              ))}
            </motion.div>
          )}
          {crossData.causal_chains?.length > 0 && (
            <motion.div className="cross-section" variants={cardItem}>
              <div className="cross-section-head">
                <span className="cross-section-label">Causal Chains</span>
                <span className="cross-section-count">{crossData.causal_chains.length}</span>
              </div>
              {crossData.causal_chains.map((ch, i) => (
                <div key={i} className="causal-chain">
                  <div className="causal-text">{ch.chain}</div>
                  {ch.confidence && (
                    <span style={{ fontSize: 10, fontFamily: "var(--mono)", marginTop: 6, display: "inline-block", padding: "2px 8px", borderRadius: 100, background: "var(--accent-soft)", border: "1px solid rgba(0,122,255,0.15)", color: "var(--accent)" }}>
                      {ch.confidence} confidence
                    </span>
                  )}
                </div>
              ))}
            </motion.div>
          )}
          {crossData.strongest_consensus?.length > 0 && (
            <motion.div className="cross-section" variants={cardItem}>
              <div className="cross-section-head"><span className="cross-section-label">Strongest Consensus</span></div>
              {crossData.strongest_consensus.map((c, i) => (
                <div key={i} className="consensus-item">
                  <span style={{ color: "var(--green)", flexShrink: 0, fontSize: 14 }}>✓</span>
                  <span>{c}</span>
                </div>
              ))}
            </motion.div>
          )}
          {crossData.what_the_evidence_does_not_establish?.length > 0 && (
            <motion.div className="cross-section" variants={cardItem}>
              <div className="cross-section-head">
                <span className="cross-section-label" style={{ color: "var(--red)" }}>What Evidence Does NOT Show</span>
              </div>
              {crossData.what_the_evidence_does_not_establish.map((w, i) => (
                <div key={i} className="consensus-item">
                  <span style={{ color: "var(--red)", flexShrink: 0 }}>✕</span>
                  <span style={{ color: "var(--text-secondary)" }}>{w}</span>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── GAP ANALYSIS ─────────────────────────────────────────────────────────────
function GapMsg({ gaps }) {
  if (!gaps) return null;
  return (
    <motion.div className="msg-agent" {...fadeUp}>
      <AgentHeader agentKey="gap" subtitle="Coverage analysis & gaps identified" />
      <div className="ag-body">
        <motion.div className="gap-card" variants={stagger} initial="initial" animate="animate">
          {gaps.global_gaps?.length > 0 && (
            <motion.div className="gap-section" variants={cardItem}>
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
                      {why && <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic", marginTop: 4 }}>Why it matters: {why}</div>}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
          {gaps.cross_task_weaknesses?.length > 0 && (
            <motion.div className="gap-section" variants={cardItem}>
              <div className="gap-title">Cross-Task Weaknesses</div>
              {gaps.cross_task_weaknesses.map((w, i) => (
                <div key={i} className="gap-item"><div className="gap-dot" style={{ background: "var(--orange)" }} /><span>{w}</span></div>
              ))}
            </motion.div>
          )}
          {gaps.low_confidence_areas?.length > 0 && (
            <motion.div className="gap-section" variants={cardItem}>
              <div className="gap-title">Low-Confidence Areas</div>
              {gaps.low_confidence_areas.map((a, i) => (
                <div key={i} className="gap-item"><div className="gap-dot" style={{ background: "var(--teal)" }} /><span>{a}</span></div>
              ))}
            </motion.div>
          )}
          {gaps.coverage_assessment && (
            <motion.div className="gap-section" variants={cardItem}>
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
            </motion.div>
          )}
          {gaps.suggested_new_tasks?.length > 0 && (
            <motion.div className="gap-section" variants={cardItem}>
              <div className="gap-title">Suggested Follow-Up Tasks</div>
              {gaps.suggested_new_tasks.map((t, i) => (
                <div key={i} className="sug-item">
                  <div className="prio-badge" style={{ background: priorityColor(t.priority) + "20", color: priorityColor(t.priority), border: `1px solid ${priorityColor(t.priority)}40` }}>P{t.priority}</div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{t.description}</div>
                    {t.addresses_gap && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 3 }}>Addresses: {t.addresses_gap}</div>}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── MARKDOWN RENDERER ───────────────────────────────────────────────────────
function renderInline(text) {
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    if (m[2]) parts.push(<strong key={k++} style={{ color: "var(--text)", fontWeight: 700 }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={k++} style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={k++} style={{ fontFamily: "var(--mono)", fontSize: "0.9em", background: "var(--surface2)", padding: "1px 6px", borderRadius: 4, color: "var(--accent)" }}>{m[4]}</code>);
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
  let bulletBuffer = [];

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    elements.push(
      <ul key={key++} style={{ margin: "0 0 20px 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {bulletBuffer.map((b, idx) => (
          <li key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 16px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, borderLeft: "3px solid var(--accent)" }}>
            <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2, fontSize: 11 }}>▸</span>
            <span style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>{renderInline(b)}</span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (/^# /.test(trimmed)) {
      flushBullets();
      elements.push(
        <div key={key++} style={{ marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid var(--separator)" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", lineHeight: 1.2, margin: 0 }}>{trimmed.slice(2)}</h1>
          <div style={{ height: 3, width: 48, background: "var(--accent)", marginTop: 10, borderRadius: 4 }} />
        </div>
      );
      i++; continue;
    }
    if (/^## /.test(trimmed)) {
      flushBullets();
      const text = trimmed.slice(3);
      const icons = { "Executive": "◎", "Key Findings": "◆", "Detailed": "◈", "Contradictions": "⟷", "Evidence": "✕", "Confidence": "◑", "Research Gaps": "◑", "Recommended": "▷", "Limitations": "✕", "Assessment": "◈" };
      const icon = Object.entries(icons).find(([k]) => text.includes(k))?.[1] || "▸";
      elements.push(
        <div key={key++} style={{ marginTop: 32, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, color: "var(--accent)" }}>{icon}</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.2px" }}>{text}</h2>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg,var(--border-hi),transparent)", marginLeft: 26, marginTop: 8 }} />
        </div>
      );
      i++; continue;
    }
    if (/^### /.test(trimmed)) {
      flushBullets();
      elements.push(<h3 key={key++} style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", margin: "20px 0 10px", paddingLeft: 12, borderLeft: "2px solid var(--accent)" }}>{trimmed.slice(4)}</h3>);
      i++; continue;
    }
    if (/^---+$/.test(trimmed)) { flushBullets(); elements.push(<hr key={key++} style={{ border: "none", borderTop: "1px solid var(--separator)", margin: "24px 0" }} />); i++; continue; }
    if (/^[*\-] /.test(trimmed)) { bulletBuffer.push(trimmed.slice(2)); i++; continue; }
    if (/^\d+\. /.test(trimmed)) {
      flushBullets();
      const text = trimmed.replace(/^\d+\.\s*/, "");
      const num = trimmed.match(/^(\d+)/)[1];
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", marginBottom: 8, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: "var(--accent)", minWidth: 26, height: 26, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, flexShrink: 0 }}>{num}</span>
          <span style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>{renderInline(text)}</span>
        </div>
      );
      i++; continue;
    }
    if (!trimmed) { flushBullets(); i++; continue; }
    flushBullets();
    elements.push(<p key={key++} style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", margin: "0 0 14px", letterSpacing: "0.01em" }}>{renderInline(trimmed)}</p>);
    i++;
  }
  flushBullets();
  return <div style={{ padding: "32px 36px", maxWidth: "100%" }}>{elements}</div>;
}

// ─── REPORT ───────────────────────────────────────────────────────────────────
function ReportMsg({ report, tasks, markdown }) {
  const [showRaw, setShowRaw] = useState(false);
  const mdTitle = markdown?.match(/^# (.+)/m)?.[1] || "Research Report";

  const countSection = (md, heading) => {
    if (!md) return null;
    const re = new RegExp(`## ${heading}[\\s\\S]*?(?=## |$)`, "i");
    const section = md.match(re)?.[0] || "";
    return (section.match(/^[*\-] .+/gm) || []).length || null;
  };

  if (markdown && !report?.research_sections) {
    const keyFindings = countSection(markdown, "Key Findings");
    const gaps = countSection(markdown, "Research Gaps");
    const nextSteps = countSection(markdown, "Recommended");
    const confidenceMatch = markdown.match(/confidence.*?(\d+).*?out of.*?10/i);
    const confidence = confidenceMatch?.[1];

    return (
      <motion.div className="msg-agent" {...fadeUp}>
        <AgentHeader agentKey="report" subtitle="Publication-quality research report" />
        <div className="ag-body">
          <motion.div className="report-card" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}>
            <div className="report-banner">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 8 }}>Research Report</div>
                  <div className="report-title" style={{ margin: 0 }}>{mdTitle}</div>
                </div>
                <motion.button onClick={() => setShowRaw(s => !s)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  style={{ background: "var(--surface2)", border: "1px solid var(--border-hi)", color: "var(--text-secondary)", padding: "6px 14px", borderRadius: 100, fontFamily: "var(--mono)", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                  {showRaw ? "Styled ▣" : "Raw ≡"}
                </motion.button>
              </div>
            </div>
            {(keyFindings || gaps || nextSteps || confidence) && (
              <div className="stats-row">
                {[
                  { v: tasks?.length, l: "Tasks", c: "var(--accent)" },
                  { v: keyFindings, l: "Key Findings", c: "var(--green)" },
                  { v: gaps, l: "Gaps", c: "var(--pink)" },
                  { v: nextSteps, l: "Next Steps", c: "var(--green)" },
                  { v: confidence ? `${confidence}/10` : null, l: "Confidence", c: "var(--orange)" },
                ].filter(s => s.v != null).map(({ v, l, c }) => (
                  <motion.div key={l} className="stat-box" whileHover={{ y: -2 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)", color: c }}>{v}</div>
                    <div className="stat-lab">{l}</div>
                  </motion.div>
                ))}
              </div>
            )}
            {showRaw ? (
              <pre style={{ padding: "28px 36px", fontSize: 13, fontFamily: "var(--mono)", lineHeight: 1.7, color: "var(--text-secondary)", whiteSpace: "pre-wrap", overflowX: "auto" }}>{markdown}</pre>
            ) : (
              <MarkdownReport markdown={markdown} />
            )}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (!report) return null;
  const normFindings = (arr) => arr ? arr.map(f => typeof f === "string" ? { finding: f } : f) : [];

  return (
    <motion.div className="msg-agent" {...fadeUp}>
      <AgentHeader agentKey="report" subtitle="Complete analysis across all research dimensions" />
      <div className="ag-body">
        <div className="report-card">
          <div className="report-banner">
            <div className="report-title">Research Report</div>
            {report.executive_summary && <div className="exec-summary">{report.executive_summary}</div>}
          </div>
          <div className="stats-row">
            {[
              { v: tasks?.length, l: "Tasks" }, { v: report.research_sections?.length, l: "Sections" },
              { v: report.overall_assessment?.strengths?.length, l: "Strengths" }, { v: report.overall_assessment?.limitations?.length, l: "Limits" },
              { v: report.identified_gaps?.length, l: "Gaps" }, { v: report.recommended_next_steps?.length, l: "Next Steps" },
            ].map(({ v, l }) => (
              <div key={l} className="stat-box"><div className="stat-val">{v ?? "—"}</div><div className="stat-lab">{l}</div></div>
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
                      <span style={{
                        fontSize: 10, fontFamily: "var(--mono)", padding: "2px 9px", borderRadius: 100, display: "inline-block", marginTop: 5,
                        background: sec.confidence === "high" ? "var(--green-soft)" : "var(--orange-soft)",
                        color: sec.confidence === "high" ? "var(--green)" : "var(--orange)",
                        border: "1px solid currentColor"
                      }}>{sec.confidence} confidence</span>
                    )}
                  </div>
                </div>
                {sec.summary && <div className="rb-summary">{sec.summary}</div>}
                {findings.length > 0 && (
                  <div className="rb-findings">
                    {findings.map((f, j) => {
                      const pc = priorityColor(f.priority ?? 5);
                      return (
                        <motion.div key={j} className="finding-card" style={{ borderLeftColor: pc }}
                          whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                          <div className="finding-text">{f.finding || String(f)}</div>
                          {f.evidence && <div className="finding-support">📌 {f.evidence}</div>}
                          {f.implication && (
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, borderTop: "1px solid var(--separator)", paddingTop: 6 }}>💡 {f.implication}</div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {report.overall_assessment && (
            <div className="assess-section">
              <SectionH icon="◈" text="Overall Assessment" color="var(--accent)" />
              {report.overall_assessment.key_themes?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="sec-label">Key Themes</div>
                  <div className="tags-row">{report.overall_assessment.key_themes.map((t, i) => <span key={i} className="tag blue">{t}</span>)}</div>
                </div>
              )}
              <div className="assess-grid">
                <div className="assess-col">
                  <div className="assess-heading" style={{ color: "var(--green)" }}>✓ Strengths</div>
                  {report.overall_assessment.strengths?.map((s, i) => (
                    <div key={i} className="assess-item"><span className="assess-bullet" style={{ color: "var(--green)" }}>●</span><span>{s}</span></div>
                  ))}
                </div>
                <div className="assess-col">
                  <div className="assess-heading" style={{ color: "var(--red)" }}>✕ Limitations</div>
                  {report.overall_assessment.limitations?.map((l, i) => (
                    <div key={i} className="assess-item"><span className="assess-bullet" style={{ color: "var(--red)" }}>●</span><span>{l}</span></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {report.identified_gaps?.length > 0 && (
            <div className="gaps-section">
              <SectionH icon="◑" text="Research Gaps" color="var(--pink)" />
              {report.identified_gaps.map((g, i) => {
                const isObj = typeof g === "object" && g !== null;
                const pc = isObj && g.priority ? priorityColor(g.priority) : "var(--pink)";
                return (
                  <div key={i} className="gap-entry" style={{ borderLeftColor: pc + "60" }}>
                    {isObj?.priority && <div className="prio-badge" style={{ background: pc + "18", color: pc, border: `1px solid ${pc}40` }}>P{g.priority}</div>}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{isObj ? (g.description || g.gap) : g}</div>
                      {isObj && g.why_it_matters && <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4, fontStyle: "italic" }}>{g.why_it_matters}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {report.recommended_next_steps?.length > 0 && (
            <div className="ns-section">
              <SectionH icon="▷" text="Recommended Next Steps" color="var(--green)" />
              {report.recommended_next_steps.map((step, i) => {
                const isObj = typeof step === "object" && step !== null;
                const prio = isObj ? step.priority : i + 1;
                const pc = priorityColor(prio);
                return (
                  <motion.div key={i} className="ns-entry" style={{ borderLeftColor: pc }}
                    whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                    <div className="prio-badge" style={{ background: pc + "18", color: pc, border: `1px solid ${pc}40` }}>#{prio}</div>
                    <div>
                      <div className="ns-text">{isObj ? step.description : step}</div>
                      {isObj?.rationale && <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>🎯 {step.rationale}</div>}
                      {isObj?.expected_insight && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}>🔓 {step.expected_insight}</div>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
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
        if (data.tasks?.length) msgs.push({ type: "tasks", data: data.tasks });
        if (data.retrieval) msgs.push({ type: "retrieval", data: data.retrieval });
        if (data.synthesis) msgs.push({ type: "synthesis", data: data.synthesis });
        if (data.critique) msgs.push({ type: "critic", data: { critique_log: data.critique, refined_synthesis: data.refined_synthesis } });
        if (data.cross_synthesis) msgs.push({ type: "cross_synthesis", data: data.cross_synthesis });
        if (data.gaps) msgs.push({ type: "gaps", data: data.gaps });
        if (data.report) msgs.push({ type: "report", data: data.report?.json || data.report, markdown: data.report?.report_markdown, tasks: data.tasks });
        setMessages(msgs);
      } else {
        setMessages([{ type: "error", text: data.detail || "Failed to load session." }]);
      }
    } catch {
      setMessages([{ type: "error", text: "Could not connect to backend." }]);
    } finally { setLoading(false); }
  }, []);

  const startResearch = useCallback(async (directQuery) => {
    const q = (directQuery || query).trim();
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
                if (step === "task") return [...cleaned, { type: "tasks", data }];
                if (step === "retrieval") return [...cleaned, { type: "retrieval", data }];
                if (step === "synthesis") return [...cleaned, { type: "synthesis", data }];
                if (step === "critic") return [...cleaned, { type: "critic", data }];
                if (step === "cross_synthesis") return [...cleaned, { type: "cross_synthesis", data }];
                if (step === "gap") return [...cleaned, { type: "gaps", data }];
                if (step === "report") {
                  const tm = cleaned.find(m => m.type === "tasks");
                  return [...cleaned, { type: "report", data: data?.json, markdown: data?.markdown, tasks: tm?.data }];
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
      <div className="fixed inset-0 z-0 bg-[#030303]">
        <Waves strokeColor="rgba(255,255,255,0.1)" backgroundColor="#030303" pointerSize={0.5} />
      </div>
      <div className="app-shell" style={{ position: "relative", zIndex: 1 }}>
        {/* TOP BAR */}
        <header className="topbar">
          <div className="topbar-logo">
            <motion.div className="topbar-logo-badge" whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}>M</motion.div>
            MultiAgent<span className="topbar-logo-text">Researcher</span>
          </div>
          <div className="topbar-right">
            <motion.button className="topbar-btn" onClick={() => setShowSidebar(true)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <span>☰</span> Research Log
            </motion.button>
            <motion.div className={`status-pill ${loading ? "live" : ""}`}
              animate={loading ? { scale: [1, 1.02, 1] } : {}}
              transition={loading ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}>
              {loading ? "● PIPELINE ACTIVE" : "○ READY"}
            </motion.div>
          </div>
        </header>

        {/* SIDEBAR */}
        <div className={`sidebar-backdrop ${showSidebar ? "open" : ""}`} onClick={() => setShowSidebar(false)} />
        <aside className={`sidebar ${showSidebar ? "open" : ""}`}>
          <div className="sb-head">
            <div className="sb-header-row">
              <div className="sb-title">Research Log</div>
              <motion.button className="btn-close" onClick={() => setShowSidebar(false)}
                whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}>✕</motion.button>
            </div>
            <motion.button className="btn-new" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActiveSession(null); setMessages([]); setPipeSteps([]);
                setShowSidebar(false);
                setTimeout(() => inputRef.current?.focus(), 300);
              }}>＋ New Research</motion.button>
          </div>
          {sessions.length > 0 && (
            <>
              <div className="sb-label">History</div>
              <div className="session-list">
                {sessions.map(s => (
                  <motion.div key={s.id} className={`sess ${activeSession === s.id ? "active" : ""}`}
                    onClick={() => { loadSession(s); setShowSidebar(false); }}
                    whileHover={{ x: 6 }} transition={{ duration: 0.2 }}>
                    <div className="sess-dot" style={{ background: s.has_report ? "var(--accent)" : "var(--text-tertiary)" }} />
                    <div className="sess-title" title={s.title}>{s.title}</div>
                    {s.has_refined && <span style={{ fontSize: 10, color: "var(--orange)", fontFamily: "var(--mono)" }}>↑</span>}
                    {s.has_report && <span className="sess-tick">✓</span>}
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* CHAT AREA */}
        <main className="chat-area">
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              <motion.div className="hero-wrap" key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}>
                <VercelV0Chat onSubmit={startResearch} isHero={true} />
              </motion.div>
            ) : (
              <div className="msgs-wrap" key="msgs">
                <div className="msgs-inner">
                  {messages.map((msg, i) => {
                    if (msg.type === "user")
                      return (
                        <motion.div key={i} className="msg-user"
                          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}>
                          <div className="user-bub">{msg.text}</div>
                        </motion.div>
                      );
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
                        <motion.div key={i} className="msg-agent" {...fadeUp}>
                          <div className="ag-body"><div className="err-card">⚠ {msg.text}</div></div>
                        </motion.div>
                      );
                    return null;
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div className="input-wrap">
            <div className="input-inner">
              <AnimatePresence>
                {loading && pipeSteps.length > 0 && (
                  <motion.div className="pipe-live-inline"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.3 }}>
                    {PIPELINE_ORDER.map(key => {
                      const step = pipeSteps.find(s => s.step === key);
                      const ag = AGENTS[key];
                      const status = step?.status ?? "pending";
                      const c = status !== "pending" ? ag.color : "var(--text-quaternary)";
                      return (
                        <motion.div key={key} className="pipe-inline-item"
                          style={{ color: c, opacity: status === "pending" ? 0.35 : 1 }}
                          animate={{ opacity: status === "pending" ? 0.35 : 1 }}
                          transition={{ duration: 0.3 }}>
                          <motion.span
                            animate={status === "running" ? { rotate: 360 } : {}}
                            transition={status === "running" ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}>
                            {status === "running" ? "⟳" : status === "done" ? "✓" : "○"}
                          </motion.span>
                          <span>{ag.label}</span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
              <div style={{ pointerEvents: loading ? "none" : "auto", opacity: loading ? 0.5 : 1, width: "100%" }}>
                {messages.length > 0 && (
                  <VercelV0Chat onSubmit={startResearch} isHero={false} />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}