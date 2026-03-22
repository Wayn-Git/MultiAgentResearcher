import { useState, useRef, useEffect } from 'react'
import { Activity, Database, FileText, TerminalSquare, Plus, Clock, ChevronRight, ChevronDown, CheckCircle2, Loader2, AlertCircle, Search, BookOpen, Layers, Microscope, GitMerge, Puzzle, ScrollText, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEMO_SESSIONS } from './demoSessions'

// API URL from environment or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE SIDEBAR STEP
// ─────────────────────────────────────────────────────────────────────────────
function PipelineStep({ step, status }) {
  const isRunning = status === 'RUNNING'
  const isDone = status === 'DONE'
  return (
    <div className={`relative p-3 mb-2 min-h-[48px] flex items-center justify-between rounded-md border backdrop-blur-sm transition-all duration-500 overflow-hidden
      ${isRunning ? 'border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
      : isDone ? 'border-zinc-700/50 bg-zinc-800/20' 
      : 'border-zinc-800/30 bg-zinc-900/10'}`}>
      
      <h3 className={`font-mono font-bold tracking-[0.2em] text-[10px] z-10 
        ${isRunning ? 'text-cyan-300' : isDone ? 'text-zinc-300' : 'text-zinc-600'}`}>
        {step.replace(/_/g, ' ').toUpperCase()}
      </h3>
      
      <div className={`text-[9px] tracking-widest font-mono font-bold z-10 px-2 py-0.5 rounded-full
        ${isRunning ? 'text-cyan-200 bg-cyan-500/20 animate-pulse' 
        : isDone ? 'text-zinc-400 bg-zinc-700/30' 
        : 'text-zinc-600 bg-zinc-800/30'}`}>
        {status}
      </div>
      
      {isRunning && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP METADATA (Refined Palette)
// ─────────────────────────────────────────────────────────────────────────────
const STEP_META = {
  task:            { icon: <Search size={14} />,     color: 'text-cyan-400',    bg: 'bg-cyan-950/20',    border: 'border-cyan-500/30',    label: 'Research Plan' },
  retrieval:       { icon: <BookOpen size={14} />,   color: 'text-indigo-400',  bg: 'bg-indigo-950/20',  border: 'border-indigo-500/30',  label: 'Source Retrieval' },
  synthesis:       { icon: <Layers size={14} />,     color: 'text-amber-400',   bg: 'bg-amber-950/20',   border: 'border-amber-500/30',   label: 'Synthesis' },
  critic:          { icon: <Microscope size={14} />, color: 'text-rose-400',    bg: 'bg-rose-950/20',    border: 'border-rose-500/30',    label: 'Critical Review' },
  cross_synthesis: { icon: <GitMerge size={14} />,   color: 'text-teal-400',    bg: 'bg-teal-950/20',    border: 'border-teal-500/30',   label: 'Cross Synthesis' },
  gap:             { icon: <Puzzle size={14} />,     color: 'text-orange-400',  bg: 'bg-orange-950/20',  border: 'border-orange-500/30',  label: 'Gap Analysis' },
  report:          { icon: <ScrollText size={14} />, color: 'text-emerald-400', bg: 'bg-emerald-950/20', border: 'border-emerald-500/30', label: 'Final Report' },
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
function trunc(str, n) {
  if (!str) return ''
  const s = String(str)
  return s.length > n ? s.slice(0, n) + '…' : s
}
function Label({ children, color = 'default' }) {
  const map = { default: 'text-zinc-500', rose: 'text-rose-500/80', teal: 'text-teal-500/80', orange: 'text-orange-500/80', sky: 'text-cyan-500/80' }
  return <span className={`text-[10px] font-mono tracking-widest uppercase font-bold ${map[color] || map.default}`}>{children}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP BODY RENDERERS
// ─────────────────────────────────────────────────────────────────────────────

function TaskBody({ data }) {
  const tasks = Array.isArray(data) ? data : []
  if (!tasks.length) return <p className="text-xs font-mono text-zinc-500">No tasks generated.</p>
  return (
    <div className="flex flex-col gap-3 font-sans">
      <p className="text-xs text-zinc-400"><span className="text-cyan-300 font-bold">{tasks.length}</span> research sub-tasks queued for the pipeline.</p>
      <div className="flex flex-col gap-2">
        {tasks.map((t, i) => (
          <div key={i} className="flex gap-3 bg-cyan-950/30 border border-cyan-500/15 p-3 rounded-md">
            <span className="text-cyan-500/70 text-[10px] font-mono font-bold shrink-0 mt-0.5">#{String(i + 1).padStart(2, '0')}</span>
            <div className="flex flex-col gap-1 min-w-0">
              {t.query && <span className="text-zinc-200 text-xs font-semibold">{t.query}</span>}
              {t.description && <span className="text-zinc-400 text-[11px] leading-relaxed">{trunc(t.description, 160)}</span>}
              {!t.query && !t.description && <span className="text-zinc-500 font-mono text-[10px]">{trunc(JSON.stringify(t), 160)}</span>}
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
  if (!sources.length) return <p className="text-xs font-mono text-zinc-500">No sources retrieved.</p>
  return (
    <div className="flex flex-col gap-3 font-sans">
      <p className="text-xs text-zinc-400">Fetched <span className="text-indigo-300 font-bold">{sources.length}</span> source{sources.length !== 1 ? 's' : ''} from the web.</p>
      <div className="grid grid-cols-1 gap-2">
        {sources.slice(0, 8).map((r, i) => {
          const url     = r.url || r.source || r.link || null
          const title   = r.title || r.name || (url ? getDomain(url) : `Source ${i + 1}`)
          const snippet = r.snippet || r.content || r.summary || r.text || null
          return (
            <div key={i} className="flex flex-col gap-1.5 bg-indigo-950/20 border border-indigo-500/15 p-3 rounded-md hover:border-indigo-500/30 transition-colors">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/80 shrink-0 mt-1.5 shadow-[0_0_5px_rgba(129,140,248,0.5)]" />
                <span className="text-zinc-200 text-xs font-semibold leading-snug">{trunc(title, 90)}</span>
              </div>
              {url && (
                <a href={url} target="_blank" rel="noreferrer"
                  className="text-indigo-400/70 text-[10px] font-mono ml-3.5 hover:text-indigo-300 transition-colors truncate block">
                  {getDomain(url)}
                </a>
              )}
              {snippet && (
                <p className="text-zinc-400 text-[11px] leading-relaxed ml-3.5 border-l-2 border-indigo-500/20 pl-2.5 mt-1">
                  {trunc(snippet, 200)}
                </p>
              )}
            </div>
          )
        })}
        {sources.length > 8 && (
          <p className="text-[10px] font-mono text-zinc-500 text-center py-2 bg-indigo-950/10 rounded-md">+{sources.length - 8} more sources indexed</p>
        )}
      </div>
    </div>
  )
}

function SynthesisBody({ data }) {
  const summary    = data?.synthesized_summary || data?.summary || data?.analysis || null
  const findings   = data?.key_findings || data?.findings || []
  const concepts   = data?.core_concepts || data?.key_concepts || data?.concepts || []
  const themes     = data?.themes || data?.main_themes || []
  const confidence = data?.confidence_score ?? data?.confidence ?? null
  const tags = concepts.length ? concepts : themes
  
  return (
    <div className="flex flex-col gap-4 font-sans">
      {summary && (
        <div className="flex flex-col gap-1.5">
          <Label>Summary</Label>
          <p className="text-sm text-zinc-300 leading-relaxed bg-amber-950/10 p-3 rounded-md border border-amber-500/10">{trunc(summary, 500)}</p>
        </div>
      )}
      {findings.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Key Findings</Label>
          <div className="flex flex-col gap-1.5">
            {findings.slice(0, 5).map((f, i) => (
              <div key={i} className="flex gap-2.5 items-start text-xs text-zinc-300 bg-zinc-900/50 p-2 rounded-md">
                <span className="text-amber-500 shrink-0 mt-0.5">▸</span>
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
              <span key={i} className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                {typeof c === 'string' ? c : c.concept || c.theme || JSON.stringify(c)}
              </span>
            ))}
          </div>
        </div>
      )}
      {confidence !== null && (
        <div className="flex items-center gap-3 mt-1 bg-zinc-900/50 p-2 rounded-md">
          <Label>Confidence</Label>
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 transition-all shadow-[0_0_10px_rgba(251,191,36,0.5)]" style={{ width: `${Math.round(Number(confidence) * 100)}%` }} />
          </div>
          <span className="text-xs text-amber-400 font-mono font-bold">{Math.round(Number(confidence) * 100)}%</span>
        </div>
      )}
      {!summary && !findings.length && !tags.length && (
        <p className="text-xs font-mono text-zinc-500">Synthesis completed.</p>
      )}
    </div>
  )
}

function CriticBody({ data }) {
  const refined      = data?.refined_synthesis || data?.refined || (data && !data.critique_log ? data : null)
  const critiqueRaw  = data?.critique_log || data?.critique || []
  const issues       = Array.isArray(critiqueRaw) ? critiqueRaw : typeof critiqueRaw === 'object' ? Object.values(critiqueRaw).flat() : []
  const summary  = refined?.synthesized_summary || refined?.summary || refined?.analysis || null
  const findings = refined?.key_findings || refined?.findings || []
  const concepts = refined?.core_concepts || refined?.key_concepts || []

  return (
    <div className="flex flex-col gap-4 font-sans">
      {issues.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label color="rose">Issues Identified & Addressed</Label>
          <div className="flex flex-col gap-1.5">
            {issues.slice(0, 5).map((item, i) => {
              const text = typeof item === 'string' ? item : item.issue || item.critique || item.feedback || item.comment || JSON.stringify(item)
              return (
                <div key={i} className="flex gap-2.5 items-start text-xs border border-rose-500/20 bg-rose-950/30 px-3 py-2 rounded-md">
                  <span className="text-rose-400 shrink-0 mt-0.5 font-bold">!</span>
                  <span className="text-zinc-300 leading-relaxed">{trunc(text, 200)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {summary && (
        <div className="flex flex-col gap-1.5">
          <Label color="rose">Refined Summary</Label>
          <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/50 p-3 rounded-md">{trunc(summary, 400)}</p>
        </div>
      )}
      {findings.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label color="rose">Refined Findings</Label>
          <div className="flex flex-col gap-1 mt-0.5">
            {findings.slice(0, 4).map((f, i) => (
              <div key={i} className="flex gap-2.5 items-start text-xs text-zinc-300">
                <span className="text-rose-500 shrink-0 mt-0.5">▸</span>
                <span className="leading-relaxed">{trunc(typeof f === 'string' ? f : f.finding || JSON.stringify(f), 200)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {concepts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {concepts.slice(0, 8).map((c, i) => (
            <span key={i} className="text-[10px] font-mono px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
              {typeof c === 'string' ? c : c.concept || JSON.stringify(c)}
            </span>
          ))}
        </div>
      )}
      {!issues.length && !summary && !findings.length && (
        <p className="text-xs font-mono text-zinc-500">Critical review completed. No major issues identified.</p>
      )}
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
      {summary && <p className="text-sm text-zinc-300 leading-relaxed bg-teal-950/20 p-3 rounded-md border border-teal-500/10">{trunc(summary, 400)}</p>}
      {srcCount !== null && <p className="text-xs text-zinc-400 font-mono">Cross-referenced <span className="text-teal-300 font-bold">{srcCount}</span> sources.</p>}
      
      {agreements.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label color="teal">Consistent Findings</Label>
          <div className="flex flex-col gap-1.5">
            {agreements.slice(0, 4).map((a, i) => (
              <div key={i} className="flex gap-2.5 items-start text-xs bg-zinc-900/50 p-2 rounded-md">
                <span className="text-teal-400 shrink-0 mt-0.5"><CheckCircle2 size={12}/></span>
                <span className="text-zinc-300 leading-relaxed">{trunc(typeof a === 'string' ? a : JSON.stringify(a), 180)}</span>
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
              <div key={i} className="flex gap-2.5 items-start text-xs bg-rose-950/10 border border-rose-500/10 p-2 rounded-md">
                <span className="text-rose-400 shrink-0 mt-0.5"><AlertCircle size={12}/></span>
                <span className="text-zinc-300 leading-relaxed">{trunc(typeof c === 'string' ? c : JSON.stringify(c), 180)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!summary && !agreements.length && !conflicts.length && (
        <p className="text-xs font-mono text-zinc-500">Cross-synthesis completed.</p>
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
            {globalGaps.slice(0, 6).map((g, i) => (
              <div key={i} className="flex gap-2.5 items-start text-xs bg-zinc-900/50 p-2 rounded-md">
                <span className="text-orange-500 shrink-0 mt-0.5">◌</span>
                <span className="text-zinc-300 leading-relaxed">{trunc(typeof g === 'string' ? g : JSON.stringify(g), 180)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs font-mono text-zinc-500">No critical knowledge gaps identified.</p>
      )}
      {queries.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label color="orange">Follow-up Queries Queued</Label>
          <div className="flex flex-col gap-1.5">
            {queries.slice(0, 5).map((q, i) => (
              <div key={i} className="flex gap-2.5 items-center text-[11px] bg-orange-950/20 border border-orange-500/20 px-3 py-2 rounded-md font-mono">
                <Search size={10} className="text-orange-400 shrink-0" />
                <span className="text-orange-200/90 truncate">{trunc(typeof q === 'string' ? q : q.query || JSON.stringify(q), 140)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {rawText && !globalGaps.length && (
        <p className="text-xs text-zinc-400 leading-relaxed border-l-2 border-orange-500/40 pl-3 py-1">{trunc(rawText, 300)}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLAPSIBLE STEP CARD
// ─────────────────────────────────────────────────────────────────────────────
function StepCard({ step, data, failed }) {
  const [isOpen, setIsOpen] = useState(false)
  const meta = STEP_META[step] || { icon: <Activity size={14} />, color: 'text-zinc-400', bg: 'bg-zinc-900', border: 'border-zinc-700', label: step }

  const bodyMap = {
    task:            <TaskBody data={data} />,
    retrieval:       <RetrievalBody data={data} />,
    synthesis:       <SynthesisBody data={data} />,
    critic:          <CriticBody data={data} />,
    cross_synthesis: <CrossSynthesisBody data={data} />,
    gap:             <GapBody data={data} />,
  }

  return (
    <div className={`rounded-lg border shadow-sm overflow-hidden backdrop-blur-sm transition-all
      ${failed ? 'border-red-500/40 bg-red-950/20' : meta.border + ' ' + meta.bg}`}>
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/5 text-left 
          ${isOpen ? 'border-b ' + (failed ? 'border-red-500/20 bg-black/20' : meta.border + ' bg-black/20') : ''}`}
      >
        <span className={`p-1.5 rounded-md bg-white/5 border border-white/5 ${failed ? 'text-red-400' : meta.color}`}>
          {failed ? <XCircle size={14} /> : meta.icon}
        </span>
        <span className={`text-xs font-mono font-bold tracking-widest uppercase ${failed ? 'text-red-400' : meta.color}`}>{meta.label}</span>
        
        <span className={`ml-auto flex items-center gap-1.5 text-[10px] font-mono tracking-widest px-2 py-1 rounded-full bg-white/5 
          ${failed ? 'text-red-400' : meta.color} opacity-80`}>
          {failed ? <><XCircle size={10} /> FAILED</> : <><CheckCircle2 size={10} /> DONE</>}
          <span className="ml-1 opacity-60">{isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden bg-black/20"
          >
            <div className="px-5 py-4">
              {failed
                ? <p className="text-xs font-mono text-red-400">{typeof data?.message === 'string' ? data.message : `${meta.label} failed — pipeline continued with fallback.`}</p>
                : (bodyMap[step] ?? <p className="text-xs font-mono text-zinc-500">{meta.label} completed.</p>)
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
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-100 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-zinc-300 italic">$1</em>')
    .replace(/`(.+?)`/g, '<code class="text-[11px] bg-emerald-950/50 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-mono text-emerald-300">$1</code>')
}

function MdLine({ line }) {
  if (/^### (.+)/.test(line)) return (
    <h3 className="text-sm font-bold text-zinc-100 mt-6 mb-2 tracking-wide"
      dangerouslySetInnerHTML={{ __html: renderInline(line.slice(4)) }} />
  )
  if (/^## (.+)/.test(line)) return (
    <h2 className="text-base font-bold text-emerald-400 mt-8 mb-3 tracking-wide border-b border-emerald-500/20 pb-2"
      dangerouslySetInnerHTML={{ __html: renderInline(line.slice(3)) }} />
  )
  if (/^# (.+)/.test(line)) return (
    <h1 className="text-xl font-bold text-white mt-8 mb-4 tracking-wider"
      dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />
  )
  if (/^---+$/.test(line.trim())) return <hr className="border-zinc-800 my-6" />
  if (/^\s*[-*] (.+)/.test(line)) return (
    <div className="flex gap-3 items-start text-sm text-zinc-300 leading-relaxed ml-2 my-1.5">
      <span className="text-emerald-500 mt-1.5 shrink-0 text-[8px]">◆</span>
      <span dangerouslySetInnerHTML={{ __html: renderInline(line.replace(/^\s*[-*] /, '')) }} />
    </div>
  )
  if (/^\d+\. (.+)/.test(line)) {
    const m = line.match(/^(\d+)\. (.+)/)
    return (
      <div className="flex gap-3 items-start text-sm text-zinc-300 leading-relaxed ml-2 my-1.5">
        <span className="text-emerald-400 font-mono text-xs mt-0.5 shrink-0 min-w-[1.5rem]">{m[1]}.</span>
        <span dangerouslySetInnerHTML={{ __html: renderInline(m[2]) }} />
      </div>
    )
  }
  if (/^> (.+)/.test(line)) return (
    <blockquote className="border-l-4 border-emerald-500/40 bg-emerald-950/10 pl-4 py-2 my-3 rounded-r-md text-sm text-zinc-400 italic"
      dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />
  )
  if (line.trim() === '') return <div className="h-2" />
  return (
    <p className="text-sm text-zinc-300 leading-relaxed my-1.5 font-sans"
      dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL REPORT CARD
// ─────────────────────────────────────────────────────────────────────────────
function ReportCard({ data, markdown }) {
  const md       = data?.markdown || markdown || null
  const lines    = typeof md === 'string' ? md.split('\n') : []
  const title    = data?.title || data?.json?.title || null
  const sections = data?.sections || data?.json?.sections || []
  const wordCount = data?.word_count || data?.json?.word_count || null

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-zinc-950/80 shadow-[0_0_30px_rgba(16,185,129,0.05)] overflow-hidden backdrop-blur-md relative">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-50" />
      
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 to-transparent">
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
          <ScrollText size={18} className="text-emerald-400" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-emerald-500/80">Final Research Report</span>
          {title && <span className="text-zinc-100 text-base font-semibold leading-snug font-sans">{title}</span>}
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono tracking-widest text-emerald-400">
          <CheckCircle2 size={12} />
          <span>COMPLETE</span>
          {wordCount && <span className="opacity-60 ml-2 border-l border-emerald-500/30 pl-2">~{Number(wordCount).toLocaleString()} WORDS</span>}
        </div>
      </div>

      {/* Content */}
      {lines.length > 0 ? (
        <div className="px-8 py-6 flex flex-col gap-1 font-sans">
          {lines.map((line, i) => <MdLine key={i} line={line} />)}
        </div>
      ) : (
        <div className="px-8 py-6 flex flex-col gap-4 font-sans">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Report assembled and saved to the <span className="text-emerald-400 font-semibold px-1 py-0.5 bg-emerald-500/10 rounded">Document Vault</span>.
          </p>
          {sections.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <Label color="emerald">Report Sections Generated</Label>
              <div className="flex flex-col gap-1.5 mt-1 bg-black/20 p-4 rounded-lg border border-white/5">
                {sections.map((s, i) => (
                  <div key={i} className="flex gap-3 items-center text-xs text-zinc-400">
                    <span className="text-emerald-500 font-mono text-xs w-5 font-bold">{String(i + 1).padStart(2, '0')}.</span>
                    <span className="font-medium">{typeof s === 'string' ? s : s.title || s.heading || JSON.stringify(s)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mt-4 text-xs font-mono text-zinc-500 bg-zinc-900/50 p-3 rounded-md border border-zinc-800">
            <Loader2 size={12} className="animate-spin text-emerald-500" />
            Loading markdown... or access <code className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/20">report.md</code> directly.
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT MESSAGE
// ─────────────────────────────────────────────────────────────────────────────
function ChatMessage({ log, reportMarkdown }) {
  if (log.type === 'user') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end mt-4 mb-2"
      >
        <div className="max-w-[75%] bg-zinc-100 text-zinc-900 px-5 py-3.5 rounded-2xl rounded-tr-sm text-sm font-sans font-medium leading-relaxed shadow-lg">
          {log.content}
        </div>
      </motion.div>
    )
  }

  if (log.step === 'report') {
    const md = log.data?.markdown || reportMarkdown || null
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

  if (log.step) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
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
        : isArchived ? <span className="w-8 h-px bg-zinc-700" />
        : <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />}
      <span className={`text-xs font-mono leading-relaxed
        ${isError ? 'text-red-400 bg-red-950/30 px-3 py-1.5 rounded border border-red-500/20' 
        : isArchived ? 'text-zinc-500 tracking-[0.2em] text-[10px] uppercase font-bold' 
        : 'text-zinc-500'}`}>
        {log.content}
      </span>
      {isArchived && <span className="w-8 h-px bg-zinc-700" />}
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
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="flex items-center gap-4 py-3 pl-2"
    >
      <div className="flex gap-1.5 p-2 rounded-full bg-zinc-900 border border-zinc-800">
        {[0, 1, 2].map(i => (
          <motion.span key={i} className={`w-1.5 h-1.5 rounded-full block ${meta ? meta.color.replace('text-', 'bg-') : 'bg-zinc-500'}`}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
      {meta && (
        <span className={`text-[11px] font-mono font-bold tracking-[0.2em] ${meta.color} opacity-80 uppercase flex items-center gap-2`}>
          {meta.icon} {meta.label} <span className="text-zinc-500">PROCESSING...</span>
        </span>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
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

  const initialPipeline = { task: 'WAITING', retrieval: 'WAITING', synthesis: 'WAITING', critic: 'WAITING', cross_synthesis: 'WAITING', gap: 'WAITING', report: 'WAITING' }
  const [pipeline, setPipeline] = useState(initialPipeline)
  const [logs, setLogs] = useState([])
  const [activeDocument, setActiveDocument] = useState(null)
  const [documentVault, setDocumentVault] = useState({})
  const logsEndRef = useRef(null)

  const loadFromLocalStorage = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('mai_sessions') || '[]')
      setHistory([...DEMO_SESSIONS, ...stored])
    } catch { setHistory([...DEMO_SESSIONS]) }
  }

  useEffect(() => { loadFromLocalStorage() }, [])
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])
  
  useEffect(() => {
    if (showMobileMenu || showRightPanel) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showMobileMenu, showRightPanel])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (chatMode) {
      if (!chatInput.trim() || isChatProcessing || !activeSession) return
      
      setIsChatProcessing(true)
      const userMessage = chatInput
      setChatHistory(prev => [...prev, { role: 'user', content: userMessage }])
      setChatInput('')
      
      try {
        const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            folder_id: activeSession.id,
            history: chatHistory
          }),
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

      setIsProcessing(true)
      setCurrentStep('task')
      setLogs([{ type: 'user', content: query }])
      setActiveSession(null)
      setActiveDocument(null)
      setDocumentVault({})
      setPipeline(initialPipeline)
      const submittedQuery = query
      setQuery('')

      try {
        const response = await fetch(`${API_URL}/api/research/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
          body: JSON.stringify({ query: submittedQuery }),
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
                        id: `session_${Date.now()}`,
                        title: submittedQuery,
                        isDemo: false,
                        logs: finalLogs,
                        savedAt: new Date().toISOString(),
                      }
                      const existing = JSON.parse(localStorage.getItem('mai_sessions') || '[]')
                      const updated = [newSession, ...existing].slice(0, 50)
                      localStorage.setItem('mai_sessions', JSON.stringify(updated))
                      setHistory([...DEMO_SESSIONS, ...updated])
                    } catch (e) { console.error('localStorage save error:', e) }
                    return finalLogs
                  })
                } else {
                  setLogs(prev => [...prev, { type: 'sys', step: event.step, data: event.data, failed: false }])
                }
              }

              if (event.status === 'failed') {
                setLogs(prev => [...prev, { type: 'sys', step: event.step, data: event.data, failed: true }])
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
  }

  const loadHistorySession = (session) => {
    setActiveSession(session)
    setActiveDocument(null)
    setPipeline({ task: 'DONE', retrieval: 'DONE', synthesis: 'DONE', critic: 'DONE', cross_synthesis: 'DONE', gap: 'DONE', report: 'DONE' })
    setChatHistory([])
    setChatMode(false)
    setChatInput('')
    setDocumentVault({})
    setLogs(session.logs || [])
  }

  const reportMarkdown = documentVault?.['report.md'] ?? null

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-300 font-sans overflow-hidden selection:bg-cyan-500/30">

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Mobile Right Panel Overlay */}
      {showRightPanel && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setShowRightPanel(false)}
        />
      )}

        {/* ── LEFT SIDEBAR ── */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-20
          w-72 sm:w-80 border-r border-zinc-800 flex flex-col h-full shrink-0 
          bg-zinc-950/98 backdrop-blur-xl
          transition-transform duration-300 ease-in-out
          ${showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-3 lg:p-5 border-b border-zinc-800 flex flex-col gap-3 lg:gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-white text-zinc-950 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  <Activity size={20} strokeWidth={2.5} />
                </div>
                <h1 className="text-sm lg:text-lg font-mono font-bold tracking-[0.2em] text-white">AXON</h1>
              </div>
              <button 
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-zinc-800 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
                aria-label="Close menu"
              >
                <span className="text-zinc-400 text-lg">✕</span>
              </button>
            </div>
            <button
              className="w-full py-2.5 lg:py-2.5 rounded border border-zinc-700 flex justify-center items-center gap-2 hover:bg-white hover:text-zinc-950 transition-all font-mono font-bold tracking-widest text-xs"
              onClick={() => { 
                setActiveSession(null); 
                setActiveDocument(null); 
                setPipeline(initialPipeline); 
                setLogs([]); 
                setChatMode(false); 
                setChatHistory([]); 
                setChatInput('');
                setShowMobileMenu(false);
              }}
            >
              <Plus size={14} /> NEW SESSION
            </button>
          </div>
          <div className="p-3 lg:p-5 flex-1 overflow-y-auto">
            <h2 className="text-[9px] lg:text-[10px] font-mono tracking-[0.3em] font-bold text-zinc-500 mb-3 lg:mb-4 flex items-center gap-2">
              <Clock size={12} className="shrink-0" /> 
              <span className="hidden sm:inline">PAST THREADS</span>
            </h2>
            <div className="flex flex-col gap-2">
              {history.length === 0
                ? <p className="text-xs text-zinc-600 italic">No sessions yet.</p>
                : history.map(session => (
                  <button key={session.id} onClick={() => {
                    loadHistorySession(session);
                    setShowMobileMenu(false);
                  }}
                    className={`text-left px-3 py-3 lg:py-2.5 rounded-md border text-[10px] lg:text-[11px] font-mono transition-all flex justify-between items-center group
                      ${activeSession?.id === session.id
                        ? session.isDemo
                          ? 'border-teal-500/50 bg-teal-950/30 text-teal-50'
                          : 'border-cyan-500/50 bg-cyan-950/30 text-cyan-50'
                        : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}>
                    <span className="truncate pr-2 flex-1">{session.title}</span>
                    {session.isDemo && (
                      <span className="shrink-0 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/20 mr-1">DEMO</span>
                    )}
                    <ChevronRight size={12} className={`shrink-0 transition-opacity ${activeSession?.id === session.id ? 'opacity-100 text-cyan-400' : 'opacity-0 group-hover:opacity-50'}`} />
                  </button>
                ))
              }
            </div>
          </div>
        </aside>

        {/* ── CENTER ── */}
        <main className={`flex-1 flex flex-col border-r border-zinc-800 relative overflow-hidden bg-zinc-950 ${(showMobileMenu || showRightPanel) ? 'lg:flex-1' : ''}`}>
          {/* Tech Grid Background */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
               style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950 pointer-events-none" />

          <header className="h-14 border-b border-zinc-800/80 flex items-center justify-between px-3 lg:px-6 shrink-0 relative z-10 bg-zinc-950/60 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <button 
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-zinc-800 rounded-lg transition-colors -ml-2"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-label="Toggle menu"
              >
                <span className="flex flex-col gap-1">
                  <span className="block w-5 h-0.5 bg-zinc-400"></span>
                  <span className="block w-5 h-0.5 bg-zinc-400"></span>
                  <span className="block w-5 h-0.5 bg-zinc-400"></span>
                </span>
              </button>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="hidden sm:inline text-[11px] font-mono tracking-[0.15em] font-bold text-zinc-400">
                {activeSession ? activeSession.title.toUpperCase() : 'SYSTEM_TERMINAL'}
              </span>
            </div>
            <button 
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-zinc-800 rounded-lg transition-colors -mr-2"
              onClick={() => setShowRightPanel(!showRightPanel)}
              aria-label="Toggle document vault"
            >
              <Database size={20} className="text-zinc-400" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto relative z-10 p-2 sm:p-3 lg:p-4">
            {activeDocument ? (
              <div className="h-full max-w-5xl mx-auto flex flex-col">
                <div className="border border-zinc-800 rounded-xl bg-zinc-950/90 shadow-2xl flex-1 flex flex-col overflow-hidden backdrop-blur-sm">
                  <div className="flex justify-between items-center px-5 py-3.5 border-b border-zinc-800 text-[10px] font-mono tracking-widest text-zinc-400 shrink-0 bg-zinc-900/50">
                    <span className="flex items-center gap-2">
                      <FileText size={12} className="text-zinc-500" />
                      {activeDocument.name.toUpperCase()}
                    </span>
                    <button className="hover:text-white hover:bg-zinc-800 px-2 py-1 rounded transition-colors flex items-center gap-1" onClick={() => setActiveDocument(null)}>
                      CLOSE <XCircle size={12}/>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    {activeDocument.name.endsWith('.md') ? (
                      <div className="flex flex-col gap-1 max-w-4xl mx-auto">
                        {typeof activeDocument.content === 'string'
                          ? activeDocument.content.split('\n').map((line, i) => <MdLine key={i} line={line} />)
                          : <p className="text-zinc-500 text-sm">Invalid format.</p>}
                      </div>
                    ) : (
                      <pre className="text-emerald-400/80 font-mono text-[11px] whitespace-pre-wrap break-words leading-relaxed max-w-4xl mx-auto">
                        {typeof activeDocument.content === 'object'
                          ? JSON.stringify(activeDocument.content, null, 2)
                          : String(activeDocument.content || 'Empty.')}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-full max-w-4xl mx-auto w-full">
                {logs.length === 0 && !isProcessing ? (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="flex flex-col items-center gap-6 text-center max-w-md">
                      <div className="w-16 h-16 rounded-2xl border border-zinc-800 flex items-center justify-center bg-zinc-900/50 shadow-inner">
                        <TerminalSquare size={28} className="text-zinc-500" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-white font-mono font-bold tracking-[0.2em] text-xs lg:text-sm">SYSTEM READY</p>
                        <p className="text-zinc-500 text-xs lg:text-sm leading-relaxed">Enter a research objective to deploy the multi-agent synthesis pipeline.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 lg:gap-2 text-[9px] lg:text-[10px] font-mono text-zinc-600 tracking-widest text-left w-full p-3 lg:p-4 rounded-lg border border-zinc-800/50 bg-zinc-950/50">
                        {Object.values(STEP_META).map(m => (
                          <span key={m.label} className={`flex items-center gap-1 lg:gap-2 ${m.color} opacity-50`}>
                            {m.icon} {m.label.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 pb-10">
                    {chatMode && activeSession ? (
                      <>
                        {chatHistory.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
                            <div className="flex flex-col items-center gap-4 lg:gap-6 text-center max-w-md">
                              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl border border-emerald-800 flex items-center justify-center bg-emerald-900/30 shadow-inner">
                                <Microscope size={22} className="text-emerald-400" />
                              </div>
                              <div className="flex flex-col gap-2">
                                <p className="text-emerald-300 font-mono font-bold tracking-[0.2em] text-xs lg:text-sm">TALK MODE</p>
                                <p className="text-zinc-400 text-xs lg:text-sm leading-relaxed">Ask questions about your research findings.</p>
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
                          <div className="flex items-center gap-3 lg:gap-4 py-2 lg:py-3 pl-2">
                            <div className="flex gap-1.5 p-1.5 lg:p-2 rounded-full bg-zinc-900 border border-zinc-800">
                              {[0, 1, 2].map(i => (
                                <span key={i} className="w-1 lg:w-1.5 h-1 lg:h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                              ))}
                            </div>
                            <span className="text-[10px] lg:text-[11px] font-mono font-bold text-emerald-400">Thinking...</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {logs.map((log, i) => (
                          <ChatMessage key={i} log={log} reportMarkdown={reportMarkdown} />
                        ))}
                        {isProcessing && <TypingIndicator currentStep={currentStep} />}
                      </>
                    )}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Input Area */}
          <div className="p-3 lg:p-5 border-t border-zinc-800/80 shrink-0 bg-zinc-950/80 backdrop-blur-xl z-20">
            {/* Mode Toggle */}
            <div className="flex items-center gap-3 mb-3 lg:mb-4">
              <span className="text-xs font-mono text-zinc-500 shrink-0">Mode:</span>
              <div className="relative flex rounded-lg border border-zinc-700 bg-zinc-900/50 p-1 overflow-hidden min-h-[36px]">
                <motion.div
                  className={`absolute top-1 bottom-1 rounded-md shadow-lg ${chatMode ? 'bg-emerald-500/30 border border-emerald-500/50' : 'bg-cyan-500/30 border border-cyan-500/50'} pointer-events-none`}
                  layoutId="modeIndicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ width: 'calc(50% - 6px)', left: chatMode ? 'calc(50% + 2px)' : '4px' }}
                />
                <button
                  className={`relative z-10 px-4 py-1.5 rounded-md text-[11px] font-mono font-bold tracking-wider transition-colors min-w-[80px] text-center
                    ${!chatMode ? 'text-cyan-300' : 'text-zinc-500'}`}
                  onClick={() => setChatMode(false)}
                >
                  Research
                </button>
                <button
                  className={`relative z-10 px-4 py-1.5 rounded-md text-[11px] font-mono font-bold tracking-wider transition-colors min-w-[80px] text-center
                    ${chatMode ? 'text-emerald-300' : 'text-zinc-500'}`}
                  onClick={() => setChatMode(true)}
                >
                  Talk
                </button>
              </div>
            </div>

            {/* Input Form */}
            <AnimatePresence mode="wait">
              <motion.form 
                key={chatMode ? 'chat-form' : 'research-form'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`flex rounded-lg border shadow-lg max-w-4xl mx-auto overflow-hidden
                  ${chatMode 
                    ? 'border-emerald-500/30 bg-zinc-900/50 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10' 
                    : 'border-zinc-700 bg-zinc-900/50 focus-within:border-cyan-500/50 focus-within:ring-4 focus-within:ring-cyan-500/10'}
                  focus-within:bg-zinc-900 transition-all`} 
                onSubmit={handleSubmit}
              >
                <div className="pl-3 lg:pl-5 pr-2 lg:pr-3 flex items-center justify-center">
                  {(chatMode && isChatProcessing) || (!chatMode && isProcessing)
                    ? <Loader2 size={16} className={`animate-spin ${chatMode ? 'text-emerald-500' : 'text-cyan-500'}`} />
                    : chatMode
                      ? <Microscope size={16} className="text-emerald-400" />
                      : <Search size={16} className="text-zinc-500" />}
                </div>
                {chatMode && activeSession ? (
                  <>
                    <input type="text"
                      className="flex-1 bg-transparent py-3 lg:py-4 px-2 outline-none font-sans text-sm text-zinc-100 placeholder-zinc-600 disabled:opacity-40"
                      placeholder={`Ask about ${activeSession.title}...`}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      disabled={isChatProcessing || !activeSession}
                      autoComplete="off"
                    />
                    <button type="submit"
                      disabled={isChatProcessing || !activeSession || !chatInput.trim()}
                      className="px-4 sm:px-6 lg:px-8 min-h-[44px] bg-emerald-100 text-emerald-950 font-mono font-bold tracking-widest text-xs hover:bg-emerald-200 transition-colors disabled:opacity-30 disabled:bg-emerald-800 disabled:text-emerald-500">
                      ASK
                    </button>
                  </>
                ) : chatMode ? (
                  <>
                    <input type="text"
                      className="flex-1 bg-transparent py-3 lg:py-4 px-2 outline-none font-sans text-sm text-zinc-100 placeholder-zinc-600 disabled:opacity-40"
                      placeholder="Select a session from sidebar..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      disabled={true}
                    />
                    <button type="submit"
                      disabled={true}
                      className="px-4 sm:px-6 lg:px-8 min-h-[44px] bg-zinc-800 text-zinc-500 font-mono font-bold tracking-widest text-xs disabled:opacity-30">
                      ASK
                    </button>
                  </>
                ) : (
                  <>
                    <input type="text"
                      className="flex-1 bg-transparent py-3 lg:py-4 px-2 outline-none font-sans text-sm text-zinc-100 placeholder-zinc-600 disabled:opacity-40"
                      placeholder={activeSession ? 'Start New Session…' : 'Enter research topic...'}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      disabled={isProcessing || activeSession !== null}
                    />
                    <button type="submit"
                      disabled={isProcessing || activeSession !== null || !query.trim()}
                      className="px-4 sm:px-6 lg:px-8 min-h-[44px] bg-zinc-100 text-zinc-950 font-mono font-bold tracking-widest text-xs hover:bg-white transition-colors disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500">
                      EXECUTE
                    </button>
                  </>
                )}
              </motion.form>
            </AnimatePresence>
          </div>
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className={`
          fixed lg:relative inset-y-0 right-0 z-50 lg:z-20
          w-80 sm:w-96 border-l border-zinc-800 flex flex-col h-full shrink-0 
          bg-zinc-950/98 backdrop-blur-xl
          transition-transform duration-300 ease-in-out
          ${showRightPanel ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-3 lg:p-5 border-b border-zinc-800 flex items-center justify-between">
            <div className="text-[9px] lg:text-[10px] font-mono font-bold flex items-center gap-2 tracking-[0.2em] text-zinc-500">
              <Database size={12} /> SYSTEM_CONTEXT
            </div>
            <button 
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-zinc-800 rounded-lg transition-colors"
              onClick={() => setShowRightPanel(false)}
              aria-label="Close document vault"
            >
              <span className="text-zinc-400 text-lg">✕</span>
            </button>
          </div>
          <div className="p-3 lg:p-5 flex-1 overflow-y-auto flex flex-col gap-6 lg:gap-8">
            
            {/* Pipeline Widget */}
            <div className="bg-zinc-900/30 p-3 lg:p-4 rounded-xl border border-zinc-800/50">
              <h2 className="text-[9px] lg:text-[10px] font-mono tracking-[0.3em] font-bold text-zinc-500 mb-3 lg:mb-4 flex justify-between items-center">
                PIPELINE STATUS
                {isProcessing && <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded text-[8px] lg:text-[9px] animate-pulse">LIVE</span>}
              </h2>
              <div className="flex flex-col gap-1.5">
                {Object.entries(pipeline).map(([key, val]) => (
                  <PipelineStep key={key} step={key} status={val} />
                ))}
              </div>
            </div>

            {/* Vault Widget */}
            <div>
              <h2 className="text-[9px] lg:text-[10px] font-mono tracking-[0.3em] font-bold text-zinc-500 mb-3 lg:mb-4 px-1">DOCUMENT VAULT</h2>
              <div className="flex flex-col gap-2 font-mono text-[11px]">
                {Object.keys(documentVault).length > 0 ? (
                  Object.entries(documentVault).map(([key, data]) => {
                    if (!data || ['folder','title','has_report','has_refined','has_data','id'].includes(key)) return null
                    const displayKey = key === 'final_report' ? 'final_report.json' : key
                    const isMd = displayKey.endsWith('.md') || displayKey.endsWith('.json')
                    return (
                      <button key={key}
                        onClick={() => {
                          setActiveDocument({ name: displayKey, content: data });
                          setShowRightPanel(false);
                        }}
                        className={`p-3 lg:p-3 rounded-md border flex items-center gap-2 lg:gap-3 transition-all w-full text-left group min-h-[48px]
                          ${activeDocument?.name === displayKey
                            ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                            : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
                        <div className={`p-1 rounded ${activeDocument?.name === displayKey ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'}`}>
                          {isMd ? <FileText size={10} /> : <Database size={10} />}
                        </div>
                        <span className="truncate text-[10px] lg:text-xs">{displayKey}</span>
                      </button>
                    )
                  })
                ) : (
                  <div className="p-4 lg:p-6 rounded-lg border border-dashed border-zinc-800 text-zinc-600 text-center text-[10px] lg:text-xs flex flex-col items-center gap-2">
                    <Database size={14} className="opacity-50" />
                    No files indexed
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
  )
}

export default MainDashboard