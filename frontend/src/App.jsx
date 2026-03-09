import { useState, useRef, useEffect } from 'react'
import { Activity, Database, FileText, Settings, TerminalSquare, Plus, Clock, ChevronRight, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function PipelineStep({ step, status }) {
  const isRunning = status === 'RUNNING'
  const isDone = status === 'DONE'
  const isOptimal = isRunning || isDone

  return (
    <div className={`border p-3 mb-2 flex items-center justify-between relative group overflow-hidden transition-colors ${isRunning ? 'border-white bg-white/10' : 'border-border bg-black/60'} backdrop-blur`}>
      <h3 className={`font-bold tracking-[0.2em] text-[10px] ${isOptimal ? 'text-white' : 'text-gray-500'}`}>{step.replace('_', ' ').toUpperCase()}</h3>
      <div className={`text-[10px] tracking-widest font-bold ${isRunning ? "text-white animate-pulse" : isDone ? "text-gray-400" : "text-gray-600"}`}>
        [{status}]
      </div>

      {/* Glitch Overlay effect */}
      {isRunning && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 mix-blend-overlay transition-opacity duration-300 pointer-events-none" />}
    </div>
  )
}

function CollapsibleNode({ label, data, depth = 0, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (data === null || data === undefined) return null;

  const isObject = typeof data === 'object' && data !== null;
  const isArray = Array.isArray(data);
  const isEmpty = isObject && Object.keys(data).length === 0;

  if (!isObject) {
    return (
      <div className={`flex gap-2 items-start ${depth > 0 ? 'ml-4' : ''}`}>
        {label && <span className="font-bold tracking-widest text-[10px] text-white/50 uppercase mt-0.5 shrink-0">{label}:</span>}
        <span className="text-gray-300 text-sm leading-relaxed">{String(data)}</span>
      </div>
    );
  }

  if (isEmpty) return null;

  return (
    <div className={`flex flex-col ${depth > 0 ? 'ml-4 border-l border-white/10 pl-3 mt-1' : 'mt-2'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 group hover:text-white transition-colors text-left"
      >
        {isOpen ? <ChevronDown size={12} className="text-white/50 group-hover:text-white" /> : <ChevronRight size={12} className="text-white/50 group-hover:text-white" />}
        <span className="font-bold tracking-widest text-[10px] text-white/70 uppercase">
          {label || (isArray ? "LIST" : "DATA")} {isArray && <span className="opacity-50 lowercase ml-1">({data.length} items)</span>}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-2 flex flex-col gap-2"
          >
            {isArray ? (
              <div className="flex flex-col gap-2">
                {data.map((item, index) => (
                  <CollapsibleNode key={index} data={item} depth={depth + 1} defaultOpen={typeof item !== 'object'} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(data).map(([key, value]) => {
                  if (key === 'folder' || key === 'title') return null;
                  return (
                    <CollapsibleNode
                      key={key}
                      label={key.replace(/_/g, ' ').toUpperCase()}
                      data={value}
                      depth={depth + 1}
                      defaultOpen={typeof value !== 'object'}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FriendlySummary({ data, step }) {
  if (!data) return null;

  let title = "Process Summary";
  let bullets = [];

  if (step === 'task' && Array.isArray(data)) {
    title = "Research Plan Generated";
    data.slice(0, 4).forEach(t => {
      if (t.description) bullets.push(t.description);
    });
  } else if (step === 'retrieval') {
    title = "Sources Extracted";
    if (Array.isArray(data)) {
      data.slice(0, 3).forEach(r => {
        if (r.url) bullets.push(r.url);
        else if (r.source) bullets.push(r.source);
      });
      if (data.length > 3) bullets.push(`...and ${data.length - 3} additional sources.`);
    } else if (typeof data === 'object') {
      bullets.push(`Successfully fetched cross-reference data across ${Object.keys(data).length} sub-queries.`);
    }
  } else if (step === 'synthesis' || step === 'critic') {
    title = "Analysis Core Patterns";
    if (data.synthesized_summary) bullets.push(data.synthesized_summary);
    else if (data.summary) bullets.push(data.summary);

    if (data.core_concepts && Array.isArray(data.core_concepts)) {
      bullets.push(`Identified subjects: ${data.core_concepts.slice(0, 3).join(', ')}`);
    }
  } else if (step === 'gap') {
    title = "Gap Detection Routine";
    if (data.raw && typeof data.raw === 'string') {
      bullets.push("Identified missing context areas. Sub-routines aligned to fulfill knowledge branches.");
    } else if (data.global_gaps) {
      bullets.push("Identified global knowledge gaps in the current synthesis.");
    }
  } else if (step === 'report') {
    title = "Final Report Assembled";
    bullets.push("Comprehensive markdown document generated and cached in the document vault.");
  }

  if (bullets.length === 0) {
    title = "Operation Successful";
    bullets.push(`The ${step?.toUpperCase() || 'core'} module completed its operational checks and aggregated output logic.`);
  }

  return (
    <div className="flex flex-col gap-3 mb-2 relative z-10">
      <h4 className="text-[10px] tracking-widest text-emerald-400 font-bold uppercase border-b border-emerald-500/20 pb-2 mb-1">{title}</h4>
      <div className="flex flex-col gap-2 text-sm text-gray-300">
        {bullets.map((txt, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span className="text-emerald-500/50 mt-1 shrink-0">⚬</span>
            <span className="leading-relaxed text-[13px]">{txt.length > 180 ? txt.slice(0, 180) + '...' : txt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MainDashboard() {
  const [query, setQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [history, setHistory] = useState([])
  const [activeSession, setActiveSession] = useState(null)

  const initialPipeline = {
    task: 'WAITING', retrieval: 'WAITING', synthesis: 'WAITING',
    critic: 'WAITING', cross_synthesis: 'WAITING', gap: 'WAITING', report: 'WAITING'
  }
  const [pipeline, setPipeline] = useState(initialPipeline)

  const [logs, setLogs] = useState([])
  const [activeDocument, setActiveDocument] = useState(null) // { name, content }
  const [documentVault, setDocumentVault] = useState({}) // { "tasks.json": {...}, "report.md": "..." }

  const logsEndRef = useRef(null)

  const refreshHistory = () => {
    fetch('http://localhost:8000/api/history')
      .then(res => res.json())
      .then(data => setHistory(data.sessions || []))
      .catch(console.error)
  }

  useEffect(() => {
    refreshHistory()
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim() || isProcessing) return

    setIsProcessing(true)
    setLogs([{ type: 'user', content: query }])
    setActiveSession(null)
    setActiveDocument(null)
    setDocumentVault({})
    setPipeline(initialPipeline)

    const submittedQuery = query
    setQuery('')

    try {
      const response = await fetch('http://localhost:8000/api/research/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ query: submittedQuery }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.status === 'running') {
                setPipeline(prev => {
                  const updated = { ...prev }
                  // Mark previous as done
                  const keys = Object.keys(updated)
                  const currentIndex = keys.indexOf(data.step)
                  if (currentIndex > 0) updated[keys[currentIndex - 1]] = 'DONE'
                  updated[data.step] = 'RUNNING'
                  return updated
                })
                setLogs(prev => [...prev, { type: 'sys', content: `[${data.step.toUpperCase()}] Initialized protocol.` }])
              }

              if (data.status === 'done') {
                setLogs(prev => [...prev, {
                  type: 'sys',
                  step: data.step,
                  content: `[${data.step.toUpperCase()}] Completed successfully.`,
                  data: data.data
                }])

                if (data.step === 'complete') {
                  setPipeline(prev => ({ ...prev, report: 'DONE' }))
                  setIsProcessing(false)
                  refreshHistory()

                  // Fetch full data for the newly created session vault
                  fetch(`http://localhost:8000/api/history/${data.data.folder}`)
                    .then(res => res.json())
                    .then(folderData => {
                      setDocumentVault(folderData)
                      if (folderData.final_report) {
                        // also trigger markdown fetch
                        fetch(`http://localhost:8000/api/history/${data.data.folder}/report.md`)
                          .then(res => res.json())
                          .then(mdData => {
                            setDocumentVault(prev => ({ ...prev, "report.md": mdData.markdown }))
                          })
                      }
                    })
                    .catch(console.error)

                  setLogs(prev => [...prev, { type: 'sys', content: `Session Archived.` }])
                }
              }
            } catch (e) {
              console.error("Parse error on chunk:", e)
            }
          }
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, { type: 'sys', content: `[ERROR] Connection failed: ${err.message}` }])
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-mono overflow-hidden">

      {/* LEFT SIDEBAR - HISTORY */}
      <aside className="w-72 border-r border-border flex flex-col h-full shrink-0 bg-black/50">
        <div className="p-4 border-b border-border flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 border border-white/20 bg-white text-black">
              <Activity size={20} strokeWidth={2} />
            </div>
            <h1 className="text-lg font-bold tracking-[0.2em]">AGENT_OS</h1>
          </div>
          <button
            className="mt-2 w-full py-2 border border-border flex justify-center items-center gap-2 hover:bg-white hover:text-black transition-colors font-bold tracking-widest text-xs"
            onClick={() => {
              setActiveSession(null);
              setDocumentVault({});
              setActiveDocument(null);
              setPipeline(initialPipeline);
            }}
          >
            <Plus size={14} /> NEW_SESSION
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-[10px] tracking-[0.3em] font-bold text-gray-600 mb-4 flex items-center gap-2">
            <Clock size={12} /> PAST_THREADS
          </h2>

          <div className="flex flex-col gap-1.5">
            {history.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No previous sessions found.</p>
            ) : (
              history.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    setActiveSession(session)
                    setActiveDocument(null)
                    setPipeline({ task: 'DONE', retrieval: 'DONE', synthesis: 'DONE', critic: 'DONE', cross_synthesis: 'DONE', gap: 'DONE', report: 'DONE' }) // show visually completed
                    if (session.id) {
                      setLogs([]) // Clear logs briefly
                      // fetch full JSON data for this session to populate Vault
                      fetch(`http://localhost:8000/api/history/${session.id}`)
                        .then(res => res.json())
                        .then(folderData => {
                          setDocumentVault(folderData)

                          // Reconstruct historical logs so they are visible immediately
                          const reconstructedLogs = [{ type: 'user', content: folderData.title || session.title }]
                          const steps = ['tasks', 'retrieval', 'synthesis', 'critique', 'refined_synthesis', 'cross_synthesis', 'gaps', 'final_report']
                          const stepNames = ['task', 'retrieval', 'synthesis', 'critic', 'critic', 'cross_synthesis', 'gap', 'report']
                          steps.forEach((step, idx) => {
                            if (folderData[step]) {
                              reconstructedLogs.push({
                                type: 'sys',
                                step: stepNames[idx],
                                content: `[${stepNames[idx].toUpperCase()}] Completed successfully.`,
                                data: folderData[step]
                              })
                            }
                          })
                          reconstructedLogs.push({ type: 'sys', content: `Session Archived.` })
                          setLogs(reconstructedLogs)

                          // also fetch the text markdown text to place in vault
                          if (folderData.final_report) {
                            fetch(`http://localhost:8000/api/history/${session.id}/report.md`)
                              .then(res => res.json())
                              .then(mdData => {
                                setDocumentVault(prev => ({ ...prev, "report.md": mdData.markdown }))
                              })
                          }
                        }).catch(console.error)
                    }
                  }}
                  className={`text-left p-2 border text-[11px] font-mono transition-colors flex justify-between items-center group
                    ${activeSession?.id === session.id
                      ? 'border-white bg-white/10 text-white'
                      : 'border-border text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
                >
                  <span className="truncate pr-2">{session.title}</span>
                  <ChevronRight size={12} className={`transition-opacity ${activeSession?.id === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* CENTER - MAIN VIEW */}
      <main className="flex-1 flex flex-col border-r border-border relative">
        <div className="absolute inset-0 bg-dot-matrix opacity-30 pointer-events-none" />

        {/* HEADER */}
        <header className="h-14 border-b border-border flex items-center px-6 shrink-0 relative z-10 bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-sm tracking-[0.1em] font-bold text-gray-300">
            {activeSession ? (
              <span>{activeSession.title.toUpperCase()}</span>
            ) : (
              <span>SYSTEM_TERMINAL</span>
            )}
          </div>
        </header>

        {/* TERMINAL / LOGS AREA */}
        <div className="flex-1 p-6 overflow-y-auto relative z-10 flex flex-col gap-4">
          {activeDocument ? (
            <div className="border border-border p-6 bg-black relative flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-6 text-[10px] tracking-widest text-gray-500 border-b border-border pb-3">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-white rounded-full"></div>{activeDocument.name.toUpperCase()}</span>
                <button className="hover:text-white transition-colors" onClick={() => setActiveDocument(null)}>CLOSE [X]</button>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 pointer-events-auto">
                {activeDocument.name.endsWith('.md') ? (
                  <div className="prose prose-invert prose-p:font-mono prose-headings:font-bold prose-headings:tracking-widest max-w-none prose-sm">
                    {typeof activeDocument.content === 'string' ? activeDocument.content.split('\n').map((line, i) => (
                      <p key={i} className="mb-2 leading-relaxed text-gray-300 font-mono text-sm">{line}</p>
                    )) : "Invalid format."}
                  </div>
                ) : (
                  <pre className="text-gray-300 font-mono text-xs whitespace-pre-wrap break-words leading-relaxed">
                    {typeof activeDocument.content === 'object'
                      ? JSON.stringify(activeDocument.content, null, 2)
                      : activeDocument.content || "Empty."}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <>
              {logs.length === 0 && !isProcessing ? (
                <div className="border border-border p-5 bg-black">
                  <div className="flex justify-between items-center mb-3 text-[10px] tracking-widest text-gray-500 border-b border-border pb-3">
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-white rounded-full"></div>INPUT_READY</span>
                  </div>
                  <div className="font-mono text-xs leading-relaxed text-gray-400">
                    MAI_OS v1.0 Kernel ready.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 font-mono text-xs pb-4">
                  {logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex flex-col gap-2 p-3 border ${log.type === 'user' ? 'border-white bg-white/5 text-white' : 'border-border bg-black text-gray-300'}`}
                    >
                      <div className="flex gap-3">
                        <span className="shrink-0 font-bold opacity-50 tracking-widest text-[10px] mt-0.5">
                          {log.type === 'user' ? 'USER:' : 'SYS:'}
                        </span>
                        <span className="leading-relaxed">{log.content}</span>
                      </div>

                      {log.data && typeof log.data === 'object' && !log.data.folder && (
                        <div className="mt-2 text-gray-400 font-sans p-2">
                          <div className="border border-border/50 bg-black/40 p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
                            <FriendlySummary data={log.data} step={log.step} />
                            <div className="mt-3 pt-3 border-t border-white/5 opacity-80 hover:opacity-100 transition-opacity relative z-10">
                              <CollapsibleNode label="DEVELOPER LOGS" data={log.data} depth={0} defaultOpen={false} />
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </>
          )}
        </div>

        {/* COMMAND PROMPT */}
        <div className="p-4 border-t border-border shrink-0 bg-black z-10">
          <form
            className="flex border-2 border-white focus-within:ring-2 ring-white/20 transition-all bg-black"
            onSubmit={handleSubmit}
          >
            <div className="p-4 border-r border-border shrink-0 flex items-center justify-center">
              <TerminalSquare size={20} className={isProcessing ? "animate-pulse" : ""} />
            </div>
            <input
              type="text"
              className="flex-1 bg-transparent p-4 outline-none font-mono text-sm placeholder-gray-600 disabled:opacity-50"
              placeholder={activeSession ? "Start a New Session to prompt MAI_OS..." : "PROMPT_INPUT..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isProcessing || activeSession !== null}
            />
            <button
              type="submit"
              disabled={isProcessing || activeSession !== null || !query.trim()}
              className="px-8 bg-white text-black font-bold tracking-widest hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:bg-gray-600 focus:outline-none"
            >
              EXECUTE
            </button>
          </form>
        </div>
      </main>

      {/* RIGHT SIDEBAR - CONTEXT & PROCESSES */}
      <aside className="w-72 flex flex-col h-full shrink-0 bg-black/30 border-l border-border">
        <div className="p-4 border-b border-border text-xs font-bold flex items-center gap-2 tracking-[0.2em] text-gray-400">
          <Database size={14} />
          SYSTEM_CONTEXT
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-8">

          {/* Active Agents / Pipeline Status */}
          <div>
            <h2 className="text-[10px] tracking-[0.3em] font-bold text-gray-600 mb-4 flex justify-between items-center">
              PIPELINE_STATUS
              {isProcessing && <span className="text-white animate-pulse">RUNNING</span>}
            </h2>
            <div className="flex flex-col gap-0 border border-border bg-black">
              {Object.entries(pipeline).map(([key, value]) => (
                <PipelineStep key={key} step={key} status={value} />
              ))}
            </div>
          </div>

          {/* Document Vault */}
          <div>
            <h2 className="text-[10px] tracking-[0.3em] font-bold text-gray-600 mb-3">DOCUMENT_VAULT</h2>
            <div className="flex flex-col gap-1.5 font-mono text-[11px]">
              {Object.keys(documentVault).length > 0 ? (
                Object.entries(documentVault).map(([key, data]) => {
                  if (!data || key === 'folder' || key === 'title' || key === 'has_report' || key === 'has_refined' || key === 'has_data' || key === 'id') return null; // skip metadata

                  const isMd = key === 'report.md' || key === "final_report.json";
                  const icon = isMd ? <FileText size={12} /> : <Database size={12} />;
                  const displayKey = key === "final_report" ? "final_report.json" : key;

                  return (
                    <button
                      key={key}
                      onClick={() => setActiveDocument({ name: displayKey, content: data })}
                      className={`p-2 border flex items-center gap-2 transition-colors w-full text-left
                          ${activeDocument?.name === displayKey
                          ? 'border-white bg-white/10 text-white'
                          : 'border-border text-gray-400 hover:text-white hover:border-gray-500'}`}
                    >
                      {icon}<span className="truncate">{displayKey}</span>
                    </button>
                  )
                })
              ) : (
                <div className="p-3 border border-border border-dashed text-gray-600 flex justify-center italic text-[10px]">
                  No files generated yet
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
