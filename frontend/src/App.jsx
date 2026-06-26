import { useState, useRef, useEffect, useMemo } from 'react'
import { Activity, Database, FileText, TerminalSquare, Plus, Clock, ChevronRight, ChevronDown, CheckCircle2, Loader2, AlertCircle, Search, BookOpen, Layers, Microscope, GitMerge, Puzzle, ScrollText, XCircle, Send, Cpu, Shield, Hash, Paperclip, ArrowUp, Menu, Bot, MessageSquare, PanelRight, Sparkles, Zap, Hexagon, Box, Globe, Terminal, Code2, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Joyride, STATUS } from 'react-joyride'
import { Waves } from './components/ui/wave-background'
import { DEMO_SESSIONS } from './demoSessions'
import Onboarding from './components/Onboarding'


// API URL from environment or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE SIDEBAR STEP
// ─────────────────────────────────────────────────────────────────────────────
function PipelineStep({ step, status }) {
  const isRunning = status === 'RUNNING'
  const isDone = status === 'DONE'
  return (
    <div className="relative py-2 flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-3 z-10">
        <h3 className={`font-sans text-[13px] 
          ${isRunning ? 'text-white font-medium' : isDone ? 'text-[var(--color-dark-text-muted)] font-normal' : 'text-[var(--color-dark-text-muted)] opacity-40 font-normal'}`}>
          {step.replace(/_/g, ' ').charAt(0).toUpperCase() + step.replace(/_/g, ' ').slice(1)}
        </h3>
      </div>
      
      <div className={`text-[12px] font-sans font-medium z-10
        ${isRunning ? 'text-[var(--color-lumina-green)]' : isDone ? 'text-[var(--color-dark-text-muted)]' : 'text-[var(--color-dark-text-muted)] opacity-40'}`}>
        {isRunning ? 'Running' : isDone ? 'Done' : 'Waiting'}
      </div>
    </div>
  )
}
const STEP_META = {
  task:            { icon: <Search size={16} strokeWidth={1.5} />,     label: 'Research Plan' },
  retrieval:       { icon: <Database size={16} strokeWidth={1.5} />,   label: 'Source Retrieval' },
  synthesis:       { icon: <Layers size={16} strokeWidth={1.5} />,     label: 'Synthesis' },
  critic:          { icon: <Activity size={16} strokeWidth={1.5} />,   label: 'Critical Review' },
  cross_synthesis: { icon: <GitMerge size={16} strokeWidth={1.5} />,   label: 'Cross Synthesis' },
  gap:             { icon: <Puzzle size={16} strokeWidth={1.5} />,     label: 'Gap Analysis' },
  report:          { icon: <FileText size={16} strokeWidth={1.5} />,   label: 'Final Report' },
}
function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
function trunc(str, n) {
  if (!str) return ''
  const s = String(str)
  return s.length > n ? s.slice(0, n) + '…' : s
}
function Label({ children }) {
  return <span className="apple-caption-strong uppercase text-[var(--color-ink-muted)]">{children}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP BODY RENDERERS
// ─────────────────────────────────────────────────────────────────────────────

function TaskBody({ data }) {
  const tasks = Array.isArray(data) ? data : []
  if (!tasks.length) return <p className="text-sm font-sans text-[var(--color-ink-muted)]">No tasks generated.</p>
  return (
    <div className="flex flex-col gap-3 font-sans">
      <p className="text-sm text-[var(--color-ink-muted)]"><span className="text-[var(--color-ink)] font-medium">{tasks.length}</span> research sub-tasks queued for the pipeline.</p>
      <div className="flex flex-col gap-2">
        {tasks.map((t, i) => (
          <div key={i} className="flex gap-3 bg-[var(--color-surface-tile2)] border border-[var(--color-hairline)] p-4 rounded-xl">
            <span className="text-[var(--color-ink-muted)] opacity-70 text-[11px] font-mono font-medium shrink-0 mt-0.5">#{String(i + 1).padStart(2, '0')}</span>
            <div className="flex flex-col gap-1 min-w-0">
              {t.query && <span className="text-[var(--color-ink)] text-sm font-medium">{t.query}</span>}
              {t.description && <span className="text-[var(--color-ink-muted)] text-[13px] leading-relaxed">{trunc(t.description, 160)}</span>}
              {!t.query && !t.description && <span className="text-[var(--color-ink-muted)] font-mono text-xs">{trunc(JSON.stringify(t), 160)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RetrievalBody({ data }) {
  const sources = Array.isArray(data) ? data
    : data && typeof data === 'object' ? Object.values(data).flat().filter(Boolean)
    : []
  if (!sources.length) return <p className="text-xs font-mono text-[var(--color-ink-muted)]">No sources retrieved.</p>
  return (
    <div className="flex flex-col gap-3 font-sans">
      <p className="text-xs text-[var(--color-ink-muted)]">Fetched <span className="text-[var(--color-apple-blue)] font-bold">{sources.length}</span> source{sources.length !== 1 ? 's' : ''} from the web.</p>
      <div className="grid grid-cols-1 gap-2">
        {sources.slice(0, 8).map((r, i) => {
          const url     = r.url || r.source || r.link || null
          const title   = r.title || r.name || (url ? getDomain(url) : `Source ${i + 1}`)
          const snippet = r.snippet || r.content || r.summary || r.text || null
          return (
            <div key={i} className="flex flex-col gap-1.5 bg-[var(--color-surface-tile2)] border border-[var(--color-hairline)] p-3 rounded-md hover:border-black/20 transition-colors">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-apple-blue)] shrink-0 mt-1.5 shadow-[0_0_5px_rgba(0,113,227,0.3)]" />
                <span className="text-[var(--color-ink)] text-xs font-semibold leading-snug">{trunc(title, 90)}</span>
              </div>
              {url && (
                <a href={url} target="_blank" rel="noreferrer"
                  className="text-[var(--color-ink-muted)] text-[10px] font-mono ml-3.5 hover:text-[var(--color-apple-blue)] transition-colors truncate block">
                  {getDomain(url)}
                </a>
              )}
              {snippet && (
                <p className="text-[var(--color-ink-muted)] text-[11px] leading-relaxed ml-3.5 border-l-2 border-[var(--color-hairline)] pl-2.5 mt-1">
                  {trunc(snippet, 200)}
                </p>
              )}
            </div>
          )
        })}
        {sources.length > 8 && (
          <p className="text-[10px] font-mono text-[var(--color-ink-muted)] text-center py-2 bg-[var(--color-surface-tile2)] rounded-md">+{sources.length - 8} more sources indexed</p>
        )}
      </div>
    </div>
  )
}

function SynthesisBody({ data }) {
  if (!data) return <p className="text-xs font-mono text-[var(--color-ink-muted)]">Synthesis completed.</p>;
  const isSingle = data.synthesized_summary || data.key_findings || data.summary;
  const results = isSingle ? [data] : Object.values(data);
  if (!results.length) return <p className="text-xs font-mono text-[var(--color-ink-muted)]">Synthesis completed.</p>;

  return (
    <div className="flex flex-col gap-6 font-sans">
      {results.map((res, index) => {
        const summary    = res?.synthesized_summary || res?.summary || res?.analysis || null
        const findings   = res?.key_findings || res?.findings || []
        const concepts   = res?.core_concepts || res?.key_concepts || res?.concepts || []
        const themes     = res?.themes || res?.main_themes || []
        const tags       = concepts.length ? concepts : themes
        const taskName   = isSingle ? 'Global Synthesis' : (res?.task || Object.keys(data)[index] || `Task ${index+1}`);

        if (!summary && !findings.length && !tags.length) return null;

        return (
          <div key={index} className="flex flex-col gap-4">
            <h4 className="font-bold text-[var(--color-ink)] text-sm border-b pb-1 border-[var(--color-hairline)]">{taskName}</h4>
            {summary && (
              <div className="flex flex-col gap-1.5">
                <Label>Summary</Label>
                <p className="text-sm text-[var(--color-ink)] leading-relaxed bg-[var(--color-surface-tile2)] border border-[var(--color-hairline)] p-3 rounded-md">{trunc(summary, 500)}</p>
              </div>
            )}
            {findings.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Key Findings</Label>
                <div className="flex flex-col gap-1.5">
                  {findings.slice(0, 5).map((f, i) => (
                    <div key={i} className="flex gap-2.5 items-start text-xs text-[var(--color-ink)] bg-white border border-[var(--color-hairline)] p-2 rounded-md">
                      <span className="text-[var(--color-apple-blue)] shrink-0 mt-0.5">▸</span>
                      <span className="leading-relaxed">{trunc(typeof f === 'string' ? f : f.finding || JSON.stringify(f), 200)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>{concepts.length ? 'Core Concepts' : 'Themes'}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.slice(0, 10).map((c, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-1 rounded bg-[var(--color-surface-tile2)] border border-[var(--color-hairline)] text-[var(--color-ink-muted)]">
                      {typeof c === 'string' ? c : c.concept || c.theme || JSON.stringify(c)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CriticBody({ data }) {
  if (!data) return <p className="text-xs font-mono text-[var(--color-ink-muted)]">Critical review completed. No major issues identified.</p>;
  
  const isSingle = data.critique_log || data.issues || data.refined_synthesis;
  const tasks = isSingle ? [data] : Object.values(data);
  if (!tasks.length) return <p className="text-xs font-mono text-[var(--color-ink-muted)]">Critical review completed. No major issues identified.</p>;
  
  return (
    <div className="flex flex-col gap-6 font-sans">
      {tasks.map((res, index) => {
        const issues = res?.vague_claims || res?.issues || res?.critique_log || [];
        const taskName = isSingle ? 'Global Critique' : (res?.task || Object.keys(data)[index] || `Task ${index+1}`);
        const overallAssessment = res?.overall_assessment || null;
        
        if (!issues.length && !overallAssessment) return null;
        
        return (
          <div key={index} className="flex flex-col gap-4">
             <h4 className="font-bold text-[var(--color-ink)] text-sm border-b pb-1 border-[var(--color-hairline)]">{taskName}</h4>
             {overallAssessment && (
                <div className="flex flex-col gap-1.5">
                  <Label color="rose">Overall Assessment</Label>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed bg-white border border-[var(--color-hairline)] p-3 rounded-md">{trunc(overallAssessment, 400)}</p>
                </div>
              )}
             {issues.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label color="rose">Issues Identified & Addressed</Label>
                <div className="flex flex-col gap-1.5">
                  {issues.slice(0, 5).map((item, i) => {
                    const text = typeof item === 'string' ? item : item.problem || item.claim || item.issue || item.critique || item.feedback || item.comment || JSON.stringify(item)
                    return (
                      <div key={i} className="flex gap-2.5 items-start text-xs border border-rose-500/20 bg-rose-50 px-3 py-2 rounded-md">
                        <span className="text-rose-500 shrink-0 mt-0.5 font-bold">!</span>
                        <span className="text-[var(--color-ink)] leading-relaxed">{trunc(text, 200)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
             )}
          </div>
        )
      })}
    </div>
  )
}

function CrossSynthesisBody({ data }) {
  const summary    = data?.synthesized_summary || data?.summary || data?.cross_summary || null
  const agreements = data?.agreements || data?.consistent_findings || []
  const conflicts  = data?.conflicts || data?.contradictions || data?.discrepancies || []
  const srcCount   = data?.source_count ?? (Array.isArray(data?.sources) ? data.sources.length : null)
  
  return (
    <div className="flex flex-col gap-4 font-sans">
      {summary && <p className="text-sm text-[var(--color-ink)] leading-relaxed bg-[var(--color-surface-tile2)] border border-[var(--color-hairline)] p-3 rounded-md">{trunc(summary, 400)}</p>}
      {srcCount !== null && <p className="text-xs text-[var(--color-ink-muted)] font-mono">Cross-referenced <span className="text-[var(--color-apple-blue)] font-bold">{srcCount}</span> sources.</p>}
      
      {agreements.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label color="teal">Consistent Findings</Label>
          <div className="flex flex-col gap-1.5">
            {agreements.slice(0, 4).map((a, i) => (
              <div key={i} className="flex gap-2.5 items-start text-xs bg-white border border-[var(--color-hairline)] p-2 rounded-md">
                <span className="text-emerald-500 shrink-0 mt-0.5"><CheckCircle2 size={12}/></span>
                <span className="text-[var(--color-ink)] leading-relaxed">{trunc(typeof a === 'string' ? a : JSON.stringify(a), 180)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {conflicts.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label color="teal">Conflicting Signals</Label>
          <div className="flex flex-col gap-1.5">
            {conflicts.slice(0, 3).map((c, i) => (
              <div key={i} className="flex gap-2.5 items-start text-xs bg-rose-50 border border-rose-500/10 p-2 rounded-md">
                <span className="text-rose-500 shrink-0 mt-0.5"><AlertCircle size={12}/></span>
                <span className="text-[var(--color-ink)] leading-relaxed">{trunc(typeof c === 'string' ? c : JSON.stringify(c), 180)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!summary && !agreements.length && !conflicts.length && (
        <p className="text-xs font-mono text-[var(--color-ink-muted)]">Cross-synthesis completed.</p>
      )}
    </div>
  )
}

function GapBody({ data }) {
  const globalGaps = data?.global_gaps || []
  const queries    = data?.followup_queries || data?.sub_queries || data?.follow_up_queries || []
  const rawText    = typeof data?.raw === 'string' ? data.raw : null
  
  return (
    <div className="flex flex-col gap-4 font-sans">
      {globalGaps.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label color="orange">Knowledge Gaps Found</Label>
          <div className="flex flex-col gap-1.5">
            {globalGaps.slice(0, 6).map((g, i) => {
              const text = typeof g === 'string' ? g : g.gap || g.issue || JSON.stringify(g);
              return (
                <div key={i} className="flex gap-2.5 items-start text-xs bg-white border border-[var(--color-hairline)] p-2 rounded-md">
                  <span className="text-orange-500 shrink-0 mt-0.5">◌</span>
                  <span className="text-[var(--color-ink)] leading-relaxed">{trunc(text, 180)}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs font-mono text-[var(--color-ink-muted)]">No critical knowledge gaps identified.</p>
      )}
      {queries.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label color="orange">Follow-up Queries Queued</Label>
          <div className="flex flex-col gap-1.5">
            {queries.slice(0, 5).map((q, i) => (
              <div key={i} className="flex gap-2.5 items-center text-[11px] bg-orange-50 border border-orange-500/20 px-3 py-2 rounded-md font-mono">
                <Search size={10} className="text-orange-500 shrink-0" />
                <span className="text-[var(--color-ink)] truncate">{trunc(typeof q === 'string' ? q : q.query || JSON.stringify(q), 140)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {rawText && !globalGaps.length && (
        <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed border-l-2 border-orange-500/40 pl-3 py-1">{trunc(rawText, 300)}</p>
      )}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// STEP CARD (FLAT)
// ─────────────────────────────────────────────────────────────────────────────
function StepCard({ step, data, failed }) {
  const [isOpen, setIsOpen] = useState(false)
  const meta = STEP_META[step] || { icon: <Activity size={14} />, color: 'text-[var(--color-ink-muted)]', label: step }

  const bodyMap = {
    task:            <TaskBody data={data} />,
    retrieval:       <RetrievalBody data={data} />,
    synthesis:       <SynthesisBody data={data} />,
    critic:          <CriticBody data={data} />,
    cross_synthesis: <CrossSynthesisBody data={data} />,
    gap:             <GapBody data={data} />,
  }

  return (
    <div className={`rounded-xl overflow-hidden transition-all bg-white border border-[var(--color-hairline)]
      ${failed ? 'border-red-500/20' : ''}`}>
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-6 py-4 transition-colors hover:bg-black/5 text-left 
          ${isOpen ? 'border-b border-[var(--color-hairline)]' : ''}`}
      >
        <span className={`text-[var(--color-apple-blue)]`}>
          {failed ? <XCircle size={18} className="text-red-500" /> : meta.icon}
        </span>
        <span className={`apple-body-strong ${failed ? 'text-red-500' : 'text-[var(--color-ink)]'}`}>{meta.label}</span>
        
        <span className={`ml-auto flex items-center gap-1.5 apple-caption ${failed ? 'text-red-500' : 'text-[var(--color-ink-muted)]'}`}>
          {failed ? 'FAILED' : 'Complete'}
          <span className="ml-1 opacity-60">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden bg-[var(--color-surface-tile2)]"
          >
            <div className="px-6 py-5">
              {failed
                ? <p className="apple-body text-red-500">{typeof data?.message === 'string' ? data.message : `${meta.label} failed — pipeline continued with fallback.`}</p>
                : (bodyMap[step] ?? <p className="apple-body text-[var(--color-ink-muted)]">{meta.label} completed.</p>)
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// INLINE MARKDOWN RENDERER
// ─────────────────────────────────────────────────────────────────────────────
function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="apple-body-strong">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic opacity-80">$1</em>')
    .replace(/`(.+?)`/g, '<code class="apple-caption px-1.5 py-0.5 rounded bg-[var(--color-surface-tile-2)]">$1</code>')
}

function MdLine({ line }) {
  if (/^### (.+)/.test(line)) return (
    <h3 className="apple-lead mt-6 mb-2"
      dangerouslySetInnerHTML={{ __html: renderInline(line.slice(4)) }} />
  )
  if (/^## (.+)/.test(line)) return (
    <h2 className="apple-display-md mt-8 mb-3"
      dangerouslySetInnerHTML={{ __html: renderInline(line.slice(3)) }} />
  )
  if (/^# (.+)/.test(line)) return (
    <h1 className="apple-display-lg mt-8 mb-4"
      dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />
  )
  if (/^---+$/.test(line.trim())) return <hr className="border-[var(--color-surface-tile-3)] my-6" />
  if (/^\s*[-*] (.+)/.test(line)) return (
    <div className="flex gap-3 items-start apple-body ml-2 my-1.5">
      <span className="text-[var(--color-primary-dark)] mt-0.5 shrink-0 text-sm">•</span>
      <span dangerouslySetInnerHTML={{ __html: renderInline(line.replace(/^\s*[-*] /, '')) }} />
    </div>
  )
  if (/^\d+\. (.+)/.test(line)) {
    const m = line.match(/^(\d+)\. (.+)/)
    return (
      <div className="flex gap-3 items-start apple-body ml-2 my-1.5">
        <span className="text-[var(--color-ink-muted)] mt-0.5 shrink-0 min-w-[1.5rem]">{m[1]}.</span>
        <span dangerouslySetInnerHTML={{ __html: renderInline(m[2]) }} />
      </div>
    )
  }
  if (/^> (.+)/.test(line)) return (
    <blockquote className="border-l-4 border-[var(--color-primary-dark)] pl-4 py-2 my-3 apple-body text-[var(--color-ink-muted)] italic"
      dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />
  )
  if (line.trim() === '') return <div className="h-2" />
  return (
    <p className="apple-body my-1.5"
      dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL REPORT CARD
// ─────────────────────────────────────────────────────────────────────────────
function ReportCard({ data, markdown }) {
  const md       = data?.markdown || markdown || null
  const title    = data?.title || data?.json?.title || null
  const sections = data?.sections || data?.json?.sections || []
  const wordCount = data?.word_count || data?.json?.word_count || null
  const lines    = md ? md.split('\n') : []

  const handleDownload = () => {
    if (!md) return;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title ? title.replace(/\s+/g, '_') : 'Research_Report'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-[18px] border border-[var(--color-hairline)] bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-[var(--color-hairline)] bg-[var(--color-surface-tile2)]">
        <div className="text-[var(--color-apple-blue)]">
          <ScrollText size={24} />
        </div>
        <div className="flex flex-col">
          <span className="apple-caption-strong uppercase text-[var(--color-ink-muted)]">Final Research Report</span>
          {title && <span className="apple-body-strong text-[var(--color-ink)]">{title}</span>}
        </div>
        <div className="ml-auto flex items-center gap-3 apple-caption text-[var(--color-ink-muted)]">
          {wordCount && <span className="opacity-60 hidden sm:inline-block border-r border-[var(--color-hairline)] pr-3">~{Number(wordCount).toLocaleString()} words</span>}
          {md && (
            <button 
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-apple-blue)] text-white hover:bg-blue-600 transition-colors shadow-sm"
              title="Download Markdown Report"
            >
              <Download size={14} />
              <span className="font-medium">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {lines.length > 0 ? (
        <div className="px-8 py-6 flex flex-col gap-1 text-[var(--color-ink)]">
          {lines.map((line, i) => <MdLine key={i} line={line} />)}
        </div>
      ) : (
        <div className="px-8 py-6 flex flex-col gap-4 text-[var(--color-ink)]">
          <p className="apple-body text-[var(--color-ink-muted)]">
            Report assembled and saved to the <strong className="text-[var(--color-ink)]">Document Vault</strong>.
          </p>
          {sections.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <Label>Report Sections Generated</Label>
              <div className="flex flex-col gap-1.5 mt-1 bg-[var(--color-surface-tile2)] p-4 rounded-xl border border-[var(--color-hairline)]">
                {sections.map((s, i) => (
                  <div key={i} className="flex gap-3 items-center apple-body text-[var(--color-ink)]">
                    <span className="text-[var(--color-apple-blue)] w-5">{String(i + 1).padStart(2, '0')}.</span>
                    <span>{typeof s === 'string' ? s : s.title || s.heading || JSON.stringify(s)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mt-4 apple-caption text-[var(--color-ink-muted)] bg-[var(--color-surface-tile2)] p-3 rounded-lg border border-[var(--color-hairline)]">
            <Loader2 size={14} className="animate-spin text-[var(--color-apple-blue)]" />
            Loading markdown... or access <code className="text-[var(--color-ink)] px-1.5 py-0.5 rounded bg-black/5">report.md</code> directly.
          </div>
        </div>
      )}
    </div>
  )
}
function ChatMessage({ log, reportMarkdown }) {
  if (log.type === 'user') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end mt-4 mb-2"
      >
        <div className="max-w-[75%] bg-[#2997ff] text-white px-5 py-3 rounded-[20px] rounded-tr-[4px] apple-body leading-relaxed">
          {log.content}
        </div>
      </motion.div>
    )
  }
  if (log.type === 'report' || (log.step === 'report' && (log.data?.markdown || log.data?.report_markdown))) {
    const md = log.data?.markdown || log.data?.report_markdown || reportMarkdown || null
    if (md) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="my-4"
        >
          <ReportCard data={log.data} markdown={md} />
        </motion.div>
      )
    }
  }

  if (log.step) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="my-4"
      >
        <StepCard step={log.step} data={log.data} failed={log.failed || false} />
      </motion.div>
    )
  }
  const isArchived = log.content === 'Session Archived.'
  const isError    = log.content?.startsWith('[ERROR]')
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className={`flex items-center gap-3 py-1 ${isArchived ? 'justify-center my-4' : ''}`}
    >
      {isError ? <AlertCircle size={14} className="text-red-400 shrink-0" />
        : isArchived ? <span className="w-8 h-px bg-[var(--color-surface-tile-3)]" />
        : <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-muted)] shrink-0" />}
      <span className={`apple-caption
        ${isError ? 'text-red-400' 
        : isArchived ? 'text-[var(--color-ink-muted)] tracking-widest uppercase font-bold' 
        : 'text-[var(--color-ink-muted)]'}`}>
        {log.content}
      </span>
      {isArchived && <span className="w-8 h-px bg-[var(--color-surface-tile-3)]" />}
    </motion.div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
function TypingIndicator({ currentStep }) {
  const meta = currentStep ? STEP_META[currentStep] : null
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 py-3 pl-4 pr-5 bg-white/50 border border-[var(--color-hairline)] rounded-2xl shadow-sm mb-4 w-fit"
    >
      <div className="flex gap-1.5 p-2 rounded-full bg-[var(--color-surface-tile2)] border border-[var(--color-hairline)] shadow-inner">
        {[0, 1, 2].map(i => (
          <motion.span key={i} className="w-1.5 h-1.5 rounded-full block bg-[var(--color-apple-blue)]"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
      {meta && (
        <span className="apple-caption-strong text-[var(--color-apple-blue)] uppercase flex items-center gap-2 tracking-wider">
          {meta.icon} {meta.label} <span className="text-[var(--color-ink-muted)]">PROCESSING...</span>
        </span>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function MainDashboard() {
  const [query, setQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(null)
  const [history, setHistory] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [chatMode, setChatMode] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isChatProcessing, setIsChatProcessing] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [pendingResearchQuery, setPendingResearchQuery] = useState(null)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [userName, setUserName] = useState(() => localStorage.getItem('lumina_username') || '')
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('lumina_username'))
  const [runTutorial, setRunTutorial] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  const tutorialSteps = [
    {
      target: '#tutorial-recent',
      content: 'Access your previous research sessions and continue where you left off.',
      skipBeacon: true,
      placement: 'right',
      buttons: ['skip', 'back', 'close', 'primary']
    },
    {
      target: '#tutorial-toggle',
      content: 'Switch between deep autonomous research and interactive chat mode.',
      skipBeacon: true,
      placement: 'bottom',
      buttons: ['skip', 'back', 'close', 'primary']
    },
    {
      target: '#tutorial-suggestions',
      content: 'Not sure where to start? Try one of these specialized agent prompts.',
      skipBeacon: true,
      placement: 'top',
      buttons: ['skip', 'back', 'close', 'primary']
    },
    {
      target: '#tutorial-pipeline',
      content: 'Track the live status of autonomous agents as they crawl, synthesize, and report.',
      skipBeacon: true,
      placement: 'left',
      buttons: ['skip', 'back', 'close', 'primary']
    }
  ]

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTutorial(false);
      localStorage.setItem('lumina_tour_completed', 'true');
    }
  };

  const initialPipeline = { task: 'WAITING', retrieval: 'WAITING', synthesis: 'WAITING', critic: 'WAITING', cross_synthesis: 'WAITING', gap: 'WAITING', report: 'WAITING' }
  const [pipeline, setPipeline] = useState(initialPipeline)
  const [logs, setLogs] = useState([])
  const [activeDocument, setActiveDocument] = useState(null)
  const [documentVault, setDocumentVault] = useState({})
  const logsEndRef = useRef(null)
  const loadFromLocalStorage = () => {
    try {
  const documentVault = useMemo(() => {
    const vault = {}
    logs.forEach(log => {
      if (log.type === 'sys' && log.step && log.data && log.step !== 'complete') {
        vault[`${log.step}.json`] = log.data
        if (log.step === 'report' && (log.data.markdown || log.data.report_markdown)) {
          vault['report.md'] = log.data.markdown || log.data.report_markdown
        }
      }
    })
    return vault
  }, [logs])
      setHistory([...DEMO_SESSIONS, ...stored])
    } catch { setHistory([...DEMO_SESSIONS]) }
  }

  useEffect(() => { loadFromLocalStorage() }, [])
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  useEffect(() => {
    if (activeSession && activeSession.id) {
      localStorage.setItem(`chatHistory_${activeSession.id}`, JSON.stringify(chatHistory))
    }
  }, [chatHistory, activeSession])
  
  useEffect(() => {
    if (showMobileMenu || showRightPanel) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showMobileMenu, showRightPanel])

  const startResearch = async (searchQuery) => {
    setIsProcessing(true)
    setCurrentStep('task')
    setLogs([{ type: 'user', content: searchQuery }])
    
    const tempSession = {
      id: 'running',
      title: searchQuery,
      isDemo: false,
      isRunning: true
    }
    setActiveSession(tempSession)
    setHistory(prev => [tempSession, ...prev.filter(s => s.id !== 'running')])
    
    setActiveDocument(null)
    setDocumentVault({})
    setPipeline(initialPipeline)
    setQuery('')

    try {
      const response = await fetch(`${API_URL}/api/research/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ query: searchQuery }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.status === 'running') {
              setCurrentStep(event.step)
              setPipeline(prev => {
                const updated = { ...prev }
                const keys = Object.keys(updated)
                const idx = keys.indexOf(event.step)
                if (idx > 0) updated[keys[idx - 1]] = 'DONE'
                updated[event.step] = 'RUNNING'
                return updated
              })
            }

            if (event.status === 'done') {
              if (event.step === 'complete') {
                setPipeline(prev => ({ ...prev, report: 'DONE' }))
                setIsProcessing(false)
                setCurrentStep(null)
                setLogs(prev => {
                  const finalLogs = [...prev, { type: 'sys', content: 'Session Archived.' }]
                  try {
                    const newSession = {
                      id: event.data.folder,
                      title: searchQuery,
                      isDemo: false,
                      logs: finalLogs,
                      savedAt: new Date().toISOString(),
                    }
                    const existing = JSON.parse(localStorage.getItem('mai_sessions') || '[]')
                    const updated = [newSession, ...existing].slice(0, 50)
                    localStorage.setItem('mai_sessions', JSON.stringify(updated))
                    setHistory([...DEMO_SESSIONS, ...updated])
                    setActiveSession(newSession)
                  } catch (e) { console.error('localStorage save error:', e) }
                  return finalLogs
                })
              } else {
                setLogs(prev => [...prev, { type: 'sys', step: event.step, data: event.data, failed: false }])
              }
            }

            if (event.status === 'failed') {
              setLogs(prev => [...prev, { type: 'sys', step: event.step, data: event.data, failed: true }])
              if (event.step === 'error') {
                setIsProcessing(false)
                setCurrentStep(null)
              }
            }

          } catch (err) { console.error('SSE parse error:', err) }
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, { type: 'sys', content: `[ERROR] ${err.message}` }])
      setIsProcessing(false)
      setCurrentStep(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (chatMode) {
      if (!chatInput.trim() || isChatProcessing || !activeSession) return
      
      setIsChatProcessing(true)
      const userMessage = chatInput
      setChatHistory(prev => [...prev, { role: 'user', content: userMessage }])
      setChatInput('')
      
      try {
        const payload = {
          message: userMessage,
          folder_id: activeSession.id,
          history: chatHistory
        }
        if (activeSession.isDemo) {
          payload.session_data = activeSession
        }
        const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        
        const data = await response.json()
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }])
      } catch (err) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: `[ERROR] Failed to get response: ${err.message}` }])
      } finally {
        setIsChatProcessing(false)
      }
    } else {
      if (!query.trim() || isProcessing) return

      if (!pendingResearchQuery) {
        setPendingResearchQuery(query)
        return
      }

      const submittedQuery = pendingResearchQuery
      setPendingResearchQuery(null)
      startResearch(submittedQuery)
    }
  }
  const loadHistorySession = (session) => {
    setActiveSession(session)
    setActiveDocument(null)
    setPipeline({ task: 'DONE', retrieval: 'DONE', synthesis: 'DONE', critic: 'DONE', cross_synthesis: 'DONE', gap: 'DONE', report: 'DONE' })
    
    const savedChatHistory = localStorage.getItem(`chatHistory_${session.id}`)
    setChatHistory(savedChatHistory ? JSON.parse(savedChatHistory) : [])
    
    setChatMode(false)
    setChatInput('')
    setDocumentVault({})
    setLogs(session.logs || [])
  }

  const reportMarkdown = documentVault?.['report.md'] ?? null
  return (
    <div className="flex h-dvh w-full bg-[var(--color-dark-bg)] text-[var(--color-dark-text)] font-sans overflow-hidden selection:bg-[var(--color-apple-blue)]/30">
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding onComplete={(name) => {
            setUserName(name);
            localStorage.setItem('lumina_username', name);
            setShowOnboarding(false);
            if (!localStorage.getItem('lumina_tour_completed')) {
              // Only run tutorial on desktop where sidebars are visible
              if (window.innerWidth >= 1024) {
                setRunTutorial(true);
              } else {
                localStorage.setItem('lumina_tour_completed', 'true');
              }
            }
          }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAbout && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAbout(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden border border-[var(--color-hairline)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[var(--color-hairline)] px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-[var(--color-apple-blue)] text-white p-2 rounded-xl">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="text-xl font-bold font-sans text-[var(--color-dark-bg)]">About Lumina</h2>
                </div>
                <button onClick={() => setShowAbout(false)} className="p-2 rounded-full hover:bg-black/5 text-[var(--color-ink-muted)] transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              
              <div className="p-6 md:p-8 font-sans space-y-10 text-[var(--color-ink)]">
                <section className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-[var(--color-hairline)] pb-2 flex items-center gap-2">
                    <Microscope className="text-[var(--color-apple-blue)]" size={18}/>
                    The Project
                  </h3>
                  <p className="leading-relaxed text-sm md:text-base">
                    Lumina is a highly autonomous, multi-agent AI research pipeline. 
                    Instead of simple conversational answers, Lumina orchestrates specialized AI agents to crawl the web, synthesize deep information, critically review its own findings, and assemble comprehensive research reports entirely autonomously. 
                  </p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-[var(--color-hairline)] pb-2 flex items-center gap-2">
                    <Cpu className="text-[var(--color-apple-blue)]" size={18}/>
                    The Architecture & Agents
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[var(--color-surface-tile2)] p-4 rounded-xl border border-[var(--color-hairline)]">
                      <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                        <Search size={16} className="text-blue-500"/> Planner Agent
                      </div>
                      <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                        Breaks down your high-level research prompt into targeted sub-queries, acting as the brain that directs the rest of the pipeline.
                      </p>
                    </div>
                    <div className="bg-[var(--color-surface-tile2)] p-4 rounded-xl border border-[var(--color-hairline)]">
                      <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                        <Database size={16} className="text-purple-500"/> Retrieval Engine
                      </div>
                      <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                        Scours the internet to fetch raw web pages, extract relevant textual content, and filter out noise from actual knowledge.
                      </p>
                    </div>
                    <div className="bg-[var(--color-surface-tile2)] p-4 rounded-xl border border-[var(--color-hairline)]">
                      <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                        <Layers size={16} className="text-amber-500"/> Synthesis Agent
                      </div>
                      <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                        Processes the retrieved data, extracting key findings, summarizing concepts, and weaving together distinct pieces of information.
                      </p>
                    </div>
                    <div className="bg-[var(--color-surface-tile2)] p-4 rounded-xl border border-[var(--color-hairline)]">
                      <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                        <Activity size={16} className="text-rose-500"/> Critic Agent
                      </div>
                      <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                        Evaluates the synthesized text for vague claims, hallucinations, or gaps, actively correcting issues to ensure high factual accuracy.
                      </p>
                    </div>
                    <div className="bg-[var(--color-surface-tile2)] p-4 rounded-xl border border-[var(--color-hairline)] md:col-span-2">
                      <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                        <FileText size={16} className="text-emerald-500"/> Report Compiler
                      </div>
                      <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                        Takes the final, refined cross-synthesis and assembles a beautifully formatted markdown report complete with citations, analysis, and follow-up gaps.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Joyride
        steps={tutorialSteps}
        run={runTutorial}
        continuous
        showProgress
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#000',
            textColor: '#333',
            zIndex: 1000,
            backgroundColor: '#fff',
            overlayColor: 'rgba(0, 0, 0, 0.6)',
          },
          tooltipContainer: {
            textAlign: 'left'
          },
          buttonNext: {
            borderRadius: '999px',
            padding: '8px 16px',
            fontSize: '13px'
          },
          buttonBack: {
            marginRight: '8px',
            color: '#666'
          },
          buttonSkip: {
            backgroundColor: '#f3f4f6',
            color: '#000',
            borderRadius: '999px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500'
          }
        }}
      />

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Mobile Right Panel Overlay */}
      {showRightPanel && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setShowRightPanel(false)}
        />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-20
        w-64 sm:w-64 lg:w-64 flex flex-col h-full shrink-0 
        bg-[var(--color-dark-bg)] border-r border-transparent text-[var(--color-dark-text)]
        transition-transform duration-300 ease-in-out
        ${showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 lg:p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 flex flex-wrap gap-[2px] items-center justify-center">
                {[...Array(9)].map((_, i) => <div key={i} className="w-[5px] h-[5px] bg-white rounded-[1px]" />)}
              </div>
              <h1 className="text-[17px] font-sans font-semibold tracking-tight text-white">Lumina</h1>
            </div>
            <button 
              className="lg:hidden min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setShowMobileMenu(false)}
            >
              <span className="text-[var(--color-dark-text-muted)] text-sm">✕</span>
            </button>
            <button className="hidden lg:flex min-w-[28px] min-h-[28px] items-center justify-center text-[var(--color-dark-text-muted)] hover:text-white transition-colors border border-[var(--color-dark-border)] rounded-md">
              <Activity size={14} />
            </button>
          </div>
          
          <button
            className="w-full py-2 px-3 rounded-lg bg-transparent border border-[var(--color-dark-border)] hover:bg-[var(--color-dark-surface-hover)] transition-colors flex justify-between items-center text-sm font-medium"
            onClick={() => { 
              setActiveSession(null); 
              setActiveDocument(null); 
              setPipeline(initialPipeline); 
              setLogs([]); 
              setChatMode(false); 
              setChatHistory([]); 
              setChatInput('');
              setPendingResearchQuery(null);
              setShowMobileMenu(false);
            }}
          >
            <div className="flex items-center gap-2 text-white">
              <Plus size={14} /> <span>New Chat</span>
            </div>
            <div className="flex items-center gap-1 opacity-50 text-xs font-mono">
              <span>⌘</span><span>N</span>
            </div>
          </button>

          <div className="flex flex-col gap-1 mt-2">
            {[
              { icon: <AlertCircle size={16} />, label: 'Notifications' },
              { icon: <Database size={16} />, label: 'Community' },
              { icon: <Sparkles size={16} />, label: 'About Lumina', onClick: () => setShowAbout(true) },
            ].map((link, i) => (
              <button key={i} onClick={link.onClick} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--color-dark-text)] hover:bg-[var(--color-dark-surface-hover)] transition-colors text-[13px] font-medium">
                <span className="text-[var(--color-dark-text-muted)]">{link.icon}</span>
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 lg:px-5 flex-1 overflow-y-auto" id="tutorial-recent">
          <h2 className="text-[11px] font-sans font-medium text-[var(--color-dark-text-muted)] mb-2 mt-4 px-2">
            Recent
          </h2>
          <div className="flex flex-col gap-1">
            {history.length === 0
              ? <p className="text-xs text-[var(--color-dark-text-muted)] px-2 italic">No sessions yet.</p>
              : history.map(session => (
                <button key={session.id} onClick={() => {
                  loadHistorySession(session);
                  setShowMobileMenu(false);
                }}
                  className={`text-left px-3 py-2 rounded-lg text-[13px] font-sans transition-all flex justify-between items-center group
                    ${activeSession?.id === session.id
                      ? 'bg-[var(--color-dark-surface-hover)] text-white'
                      : 'text-[var(--color-dark-text-muted)] hover:bg-white/5 hover:text-[var(--color-dark-text)]'}`}>
                  <span className="truncate pr-2 flex-1 font-medium">{session.title}</span>
                  {session.isDemo && (
                    <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded border border-[var(--color-dark-border)] text-[var(--color-dark-text-muted)] mr-1">DEMO</span>
                  )}
                </button>
              ))
            }
          </div>
        </div>

        <div className="p-4 lg:p-5 mt-auto">
        </div>
      </aside>

        {/* ── CENTER ── */}
        <main className={`flex-1 flex flex-col relative overflow-hidden bg-white lg:my-3 rounded-none lg:rounded-3xl shadow-xl ring-1 ring-black/5 text-[var(--color-ink)] ${(showMobileMenu || showRightPanel) ? 'lg:flex-1' : ''}`}>
          
          <header className="h-14 flex items-center justify-between px-3 lg:px-6 shrink-0 relative z-30 bg-white/90 backdrop-blur-xl border-b border-[var(--color-hairline)] lg:border-none">
            <div className="flex items-center gap-2">
              <button 
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-black/5 rounded-lg transition-colors -ml-2"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-label="Toggle menu"
              >
              <span className="relative flex flex-col justify-center items-center w-5 h-5">
                <span className={`absolute w-5 h-0.5 bg-[var(--color-ink)] rounded-full transition-all duration-300 ${showMobileMenu ? 'rotate-45' : '-translate-y-1.5'}`}></span>
                <span className={`absolute w-5 h-0.5 bg-[var(--color-ink)] rounded-full transition-all duration-300 ${showMobileMenu ? 'opacity-0' : 'opacity-100'}`}></span>
                <span className={`absolute w-5 h-0.5 bg-[var(--color-ink)] rounded-full transition-all duration-300 ${showMobileMenu ? '-rotate-45' : 'translate-y-1.5'}`}></span>
              </span>
              </button>
              <span className="hidden sm:inline text-sm font-sans font-semibold text-[var(--color-ink)]">
                {activeSession ? activeSession.title : 'Agent Research System'}
              </span>
            </div>
            <button 
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-black/5 rounded-lg transition-colors -mr-2"
              onClick={() => setShowRightPanel(!showRightPanel)}
              aria-label="Toggle document vault"
            >
              <PanelRight size={22} strokeWidth={1.5} className="text-[var(--color-ink)]" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto relative z-10 p-2 sm:p-3 lg:p-4 flex flex-col">
            <div className="flex flex-col min-h-full max-w-4xl mx-auto w-full">
              {logs.length > 0 && (
                <div className="flex flex-col gap-3 pb-10">
                  {chatMode && activeSession ? (
                    <>
                      {chatHistory.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
                          <div className="flex flex-col items-center gap-4 lg:gap-6 text-center max-w-md">
                            <div className="text-[var(--color-ink-muted)]">
                              <MessageSquare size={36} strokeWidth={1} />
                            </div>
                            <div className="flex flex-col gap-2">
                              <p className="text-[var(--color-ink)] font-sans font-bold tracking-widest text-xs lg:text-sm uppercase">Talk Mode</p>
                              <p className="text-[var(--color-ink-muted)] text-xs lg:text-sm leading-relaxed">Ask questions about your research findings.</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        chatHistory.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] lg:max-w-[75%] px-4 py-3 lg:px-5 lg:py-3.5 rounded-2xl text-xs lg:text-sm font-sans font-medium leading-relaxed shadow-lg
                              ${msg.role === 'user' 
                                ? 'bg-emerald-100 text-emerald-900 rounded-tr-sm' 
                                : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'}`}>
                              {msg.content}
                            </div>
                          </div>
                        ))
                      )}
                      {isChatProcessing && (
                        <div className="flex items-center gap-4 py-3 pl-4 pr-5 bg-white/50 border border-[var(--color-hairline)] rounded-2xl shadow-sm mb-4 w-fit mt-4">
                          <div className="flex gap-1.5 p-2 rounded-full bg-[var(--color-surface-tile2)] border border-[var(--color-hairline)] shadow-inner">
                            {[0, 1, 2].map(i => (
                              <motion.span key={i} className="w-1.5 h-1.5 rounded-full block bg-[var(--color-apple-blue)]"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                            ))}
                          </div>
                          <span className="apple-caption-strong text-[var(--color-apple-blue)] tracking-wider">
                            Lumina is thinking...
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {logs.map((l, i) => <ChatMessage key={i} log={l} reportMarkdown={reportMarkdown} />)}
                      {isProcessing && currentStep && <TypingIndicator currentStep={currentStep} />}
                      {reportMarkdown && !chatMode && (
                        <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                           <ReportCard markdown={reportMarkdown} data={{ title: activeSession?.title }} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className={`shrink-0 z-20 flex flex-col items-center px-4 w-full max-w-5xl mx-auto transition-all duration-500
             ${logs.length === 0 && !isProcessing ? 'absolute inset-0 top-14 bg-white overflow-y-auto pt-6 md:pt-12 pb-24' : 'pb-8 pt-4 bg-white/90 backdrop-blur-md'}`}>
             
             <AnimatePresence mode="wait">
               {logs.length === 0 && !isProcessing && (
                  <motion.div
                    key={chatMode ? "talk" : "research"}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.15 }
                      }
                    }}
                    className="mb-8 w-full max-w-4xl px-4 flex flex-col"
                  >
                    {!chatMode ? (
                      <>
                        <motion.h1 variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }} className="text-[32px] font-sans font-bold text-[var(--color-ink)] mb-1 tracking-tight">Hi, {userName || 'Guest'}</motion.h1>
                        <motion.h2 variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }} className="text-[32px] font-sans font-bold text-[var(--color-ink)] mb-4 tracking-tight">What can I help you with?</motion.h2>
                        <motion.p variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }} className="text-[15px] text-[var(--color-ink-muted)]">Choose a prompt below or write your own to start chatting with Lumina.</motion.p>
                      </>
                    ) : (
                      <>
                        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }} className="text-[var(--color-ink-muted)] mb-4 flex justify-center">
                            <MessageSquare size={36} strokeWidth={1} />
                        </motion.div>
                        <motion.h1 variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }} className="text-[32px] font-sans font-bold text-[var(--color-ink)] mb-1 tracking-tight">Talk Mode</motion.h1>
                        <motion.h2 variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }} className="text-[32px] font-sans font-bold text-[var(--color-ink)] mb-4 tracking-tight">Discuss your findings.</motion.h2>
                        <motion.p variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }} className="text-[15px] text-[var(--color-ink-muted)]">Ask questions about your research findings and explore data.</motion.p>
                      </>
                    )}
                  </motion.div>
               )}
             </AnimatePresence>

             <form 
                className={`max-w-4xl w-full bg-[#f4f4f5] rounded-2xl border border-[var(--color-hairline)] shadow-sm flex flex-col relative focus-within:ring-1 focus-within:ring-[var(--color-hairline)] focus-within:bg-white transition-all`} 
                onSubmit={handleSubmit}
             >
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <div id="tutorial-toggle" className="flex bg-[var(--color-surface-tile2)] border border-[var(--color-hairline)] rounded-full p-1">
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!chatMode ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'}`}
                      onClick={() => setChatMode(false)}
                    >
                      Research
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${chatMode ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'}`}
                      onClick={() => setChatMode(true)}
                    >
                      Talk
                    </button>
                  </div>
                </div>

                <textarea 
                  className={`w-full bg-transparent outline-none px-4 pt-2 pb-14 resize-none text-[15px] text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] transition-all ${(!isInputFocused && !query && (!chatMode || !chatInput)) ? 'min-h-[44px]' : 'min-h-[120px]'}`}
                  placeholder={activeSession ? `Ask about ${activeSession.title}...` : 'Ask a question or make a request...'}
                  rows={(!isInputFocused && !query && (!chatMode || !chatInput)) ? 1 : 4}
                  value={chatMode && activeSession ? chatInput : query}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  onChange={e => {
                    if (chatMode && activeSession) setChatInput(e.target.value)
                    else {
                      setQuery(e.target.value)
                      if (pendingResearchQuery) setPendingResearchQuery(null)
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  disabled={isProcessing || isChatProcessing || (!chatMode && activeSession !== null)}
                />
                
                <div className="absolute bottom-3 right-3 flex items-center">
                  <button type="submit"
                    disabled={isProcessing || isChatProcessing || (!chatMode && activeSession !== null) || (chatMode ? !chatInput.trim() : !query.trim())}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30
                      ${(chatMode ? chatInput.trim() : query.trim()) ? 'bg-black text-white shadow-sm hover:scale-105' : 'bg-black/10 text-black/40'}`}>
                    <ArrowUp size={16} strokeWidth={2.5} />
                  </button>
                </div>
             </form>
             
             <AnimatePresence>
               {logs.length === 0 && !isProcessing && !chatMode && (
                  <motion.div 
                    id="tutorial-suggestions"
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.08, delayChildren: 0.3 }
                      }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 w-full max-w-4xl px-4"
                  >
                     {[
                        { icon: <Sparkles size={18} strokeWidth={1.5} />, text: "Deep dive into recent advancements in LLM architectures" },
                        { icon: <Hexagon size={18} strokeWidth={1.5} />, text: "Compare LangChain, AutoGen, and CrewAI frameworks" },
                        { icon: <Terminal size={18} strokeWidth={1.5} />, text: "Analyze the impact of multi-agent RL on robotics" },
                        { icon: <Activity size={18} strokeWidth={1.5} />, text: "Synthesize papers on tool use and API integration" },
                        { icon: <Zap size={18} strokeWidth={1.5} />, text: "Research state-of-the-art in autonomous coding agents" },
                        { icon: <Code2 size={18} strokeWidth={1.5} />, text: "Create a report on memory mechanisms in LLMs" },
                        { icon: <Globe size={18} strokeWidth={1.5} />, text: "Investigate ethical considerations in agent deployment" },
                        { icon: <Cpu size={18} strokeWidth={1.5} />, text: "Summarize the evolution of conversational AI" }
                      ].map((item, idx) => (
                        <motion.button
                          variants={{
                            hidden: { opacity: 0, y: 15 },
                            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                          }}
                          key={idx}
                          onClick={() => {
                            setQuery(item.text);
                            setChatMode(false);
                          }}
                          className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[var(--color-hairline)] hover:shadow-md hover:border-black/20 transition-all text-left group"
                        >
                          <div className="text-[var(--color-ink-muted)] group-hover:text-black transition-colors shrink-0">
                            {item.icon}
                          </div>
                          <span className="text-[13px] font-medium text-[var(--color-ink)] transition-colors">
                            {item.text}
                          </span>
                        </motion.button>
                      ))}
                  </motion.div>
               )}
             </AnimatePresence>
          </div>
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className={`
          fixed lg:relative inset-y-0 right-0 z-50 lg:z-20
          w-64 sm:w-64 lg:w-64 flex flex-col h-full shrink-0 
          bg-[var(--color-dark-bg)] border-l border-transparent text-[var(--color-dark-text)]
          transition-transform duration-300 ease-in-out
          ${showRightPanel ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4 lg:p-5 flex items-center justify-end gap-3 mb-2">
            <button className="text-[var(--color-dark-text-muted)] hover:text-white transition-colors">
              <Database size={16} />
            </button>
            <button className="text-[var(--color-dark-text-muted)] hover:text-white transition-colors">
              <Menu size={16} />
            </button>
            <button 
              className="lg:hidden min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors ml-auto"
              onClick={() => setShowRightPanel(false)}
            >
              <span className="text-[var(--color-dark-text-muted)] text-sm">✕</span>
            </button>
          </div>
          <div className="px-4 lg:px-5 flex-1 overflow-y-auto flex flex-col gap-3">
            
            {/* Pipeline Widget styled as a metric card */}
            <div id="tutorial-pipeline" className="bg-[var(--color-dark-surface)] p-4 rounded-xl border border-[var(--color-dark-border)] group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold text-white">Pipeline</span>
                  <span className="text-[11px] text-[var(--color-dark-text-muted)]">Live Status</span>
                </div>
                {isProcessing && <Activity size={14} className="text-[var(--color-lumina-green)] animate-pulse" />}
              </div>
              <div className="flex flex-col gap-1.5 mt-3">
                {Object.entries(pipeline).map(([key, val]) => (
                  <PipelineStep key={key} step={key} status={val} />
                ))}
              </div>
            </div>

            {/* Document Vault Widget styled as metric cards (one for each doc) */}
            {Object.keys(documentVault).filter(k => documentVault[k] && !['folder','title','has_report','has_refined','has_data','id'].includes(k)).length > 0 && (
              Object.entries(documentVault).map(([key, data]) => {
                if (!data || ['folder','title','has_report','has_refined','has_data','id'].includes(key)) return null
                const displayKey = key === 'final_report' ? 'final_report.json' : key
                return (
                  <button key={key}
                    onClick={() => {
                      setActiveDocument({ name: displayKey, content: data });
                      setShowRightPanel(false);
                    }}
                    className={`bg-[var(--color-dark-surface)] p-4 rounded-xl border group transition-all text-left w-full
                      ${activeDocument?.name === displayKey 
                        ? 'border-[var(--color-lumina-green)]/50 shadow-[0_0_15px_rgba(52,211,153,0.1)]' 
                        : 'border-[var(--color-dark-border)] hover:border-white/20'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        <span className="text-[13px] font-medium text-white truncate">{displayKey}</span>
                        <span className="text-[11px] text-[var(--color-dark-text-muted)]">Source File</span>
                      </div>
                      <div className="w-12 h-6 flex items-center justify-end opacity-50 group-hover:opacity-100 transition-opacity">
                        {/* Mock sparkline path representing the green chart in screenshot */}
                        <svg viewBox="0 0 40 16" className="w-full h-full fill-none stroke-[var(--color-lumina-green)] stroke-[1.5] stroke-linecap-round stroke-linejoin-round">
                          <path d="M0,12 L5,8 L10,10 L15,4 L20,6 L25,2 L30,5 L35,1 L40,3" />
                        </svg>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
          
          <div className="p-4 lg:p-5 flex flex-col gap-1 mt-auto">
          </div>
        </aside>
      </div>
  )
}

export default MainDashboard