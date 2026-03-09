import { useState, useRef, useEffect } from 'react'
import { Activity, Database, FileText, Settings, Play, TerminalSquare, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function AgentStatusBox({ title, status, description }) {
  const isOptimal = status === 'OPTIMAL' || status === 'Waiting...' || status === 'Idle.'
  return (
    <div className="border border-border p-4 mb-4 flex flex-col gap-2 relative group overflow-hidden bg-black/60 backdrop-blur">
      <div className="flex justify-between items-center text-xs tracking-widest text-gray-400">
        <h3 className="font-bold text-white tracking-[0.2em]">{title}</h3>
        <div className={`w-2 h-2 ${isOptimal ? "bg-white" : "bg-red-500 animate-pulse"} rounded-sm`} />
      </div>
      <p className="text-sm text-gray-400 leading-relaxed font-mono">
        {description}
      </p>

      {/* Glitch Overlay effect */}
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 mix-blend-overlay transition-opacity duration-300 pointer-events-none" />
    </div>
  )
}

function MainDashboard() {
  const [query, setQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [agentStatuses, setAgentStatuses] = useState({
    researcher: { status: 'Idle.', description: 'Ready for synthesis.' },
    analyst: { status: 'Idle.', description: 'Awaiting input data.' },
    writer: { status: 'Idle.', description: 'Idle. Ready for synthesis.' },
  })

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-mono overflow-hidden">

      {/* LEFT SIDEBAR - AGENT HUB */}
      <aside className="w-80 border-r border-border flex flex-col h-full shrink-0">
        <div className="p-6 border-b border-border flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-white/20 bg-white text-black">
              <Activity size={24} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-bold tracking-[0.2em]">AGENT_HUB</h1>
          </div>
          <p className="text-xs tracking-[0.2em] text-gray-500">SYSTEM STATUS: OPTIMAL</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-xs tracking-[0.3em] font-bold text-gray-600 mb-6">ACTIVE_PROCESSES</h2>

          <AgentStatusBox
            title="RESEARCHER"
            status={agentStatuses.researcher.status}
            description={agentStatuses.researcher.description}
          />
          <AgentStatusBox
            title="ANALYST"
            status={agentStatuses.analyst.status}
            description={agentStatuses.analyst.description}
          />
          <AgentStatusBox
            title="WRITER"
            status={agentStatuses.writer.status}
            description={agentStatuses.writer.description}
          />
        </div>

        <div className="p-6 border-t border-border mt-auto">
          <h2 className="text-xs tracking-[0.3em] font-bold text-gray-600 mb-4">UTILITY_TOOLS</h2>
          <div className="flex gap-4">
            <button className="flex-1 py-3 border border-border flex justify-center items-center hover:bg-white hover:text-black transition-colors">
              <Settings size={16} />
            </button>
            <button className="flex-1 py-3 border border-border flex justify-center items-center hover:bg-white hover:text-black transition-colors">
              <Database size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* CENTER - MAIN VIEW */}
      <main className="flex-1 flex flex-col border-r border-border relative">
        <div className="absolute inset-0 bg-dot-matrix opacity-30 pointer-events-none" />

        {/* HEADER */}
        <header className="h-16 border-b border-border flex items-center px-8 shrink-0 relative z-10 bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-4 text-xl tracking-[0.1em] font-bold">
            <Activity className="text-white" size={20} />
            <span>MULTI-AGENT_OS_V1.0</span>
          </div>
          <div className="ml-auto flex gap-6 text-sm">
            <button className="hover:text-white text-gray-400 border-b-2 border-white pb-1 tracking-widest">THREADS</button>
            <button className="hover:text-white text-gray-500 tracking-widest">VAULT</button>
            <button className="hover:text-white text-gray-500 tracking-widest">NODES</button>
          </div>
        </header>

        {/* TERMINAL / LOGS AREA */}
        <div className="flex-1 p-8 overflow-y-auto relative z-10 flex flex-col gap-6">
          <div className="border border-border p-6 bg-black">
            <div className="flex justify-between items-center mb-4 text-xs tracking-widest text-gray-500 border-b border-border pb-4">
              <span className="flex items-center gap-2"><div className="w-2 h-2 bg-white rounded-full"></div>USER_SESSION</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="font-mono text-sm leading-relaxed text-gray-300">
              Welcome to the Multi-Agent Research System.
              <br />
              Awaiting initialization protocol...
            </div>
          </div>
        </div>

        {/* COMMAND PROMPT */}
        <div className="p-6 border-t border-border shrink-0 bg-black z-10">
          <div className="text-xs tracking-widest text-gray-500 mb-2 flex items-center gap-2">
            <span>MENTION:</span>
            <span className="border border-border px-2 py-0.5 r bg-white text-black font-bold">@RESEARCHER</span>
            <span className="border border-border px-2 py-0.5">@ANALYST</span>
          </div>
          <form className="flex border-2 border-white focus-within:ring-2 ring-white/20 transition-all bg-black">
            <div className="p-4 border-r border-border shrink-0 flex items-center justify-center">
              <TerminalSquare size={20} />
            </div>
            <input
              type="text"
              className="flex-1 bg-transparent p-4 outline-none font-mono text-lg placeholder-gray-600"
              placeholder="COMMAND_INPUT_PROMPT..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              className="px-8 bg-white text-black font-bold tracking-widest hover:bg-gray-200 transition-colors"
            >
              EXECUTE
            </button>
          </form>
        </div>
      </main>

      {/* RIGHT SIDEBAR - CONTEXT */}
      <aside className="w-80 flex flex-col h-full shrink-0">
        <div className="p-6 border-b border-border text-lg font-bold flex items-center gap-3 tracking-[0.2em]">
          <Database size={18} />
          SHARED_CONTEXT
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Document Vault */}
          <h2 className="text-xs tracking-[0.3em] font-bold text-gray-600 mb-4">DOCUMENT_VAULT</h2>
          <div className="flex flex-col gap-3">
            <div className="border border-border p-3 flex justify-between items-center text-sm font-mono text-gray-400 hover:text-white hover:border-gray-500 transition-colors cursor-pointer">
              <div className="flex items-center gap-3"><FileText size={16} /><span>tasks.json</span></div>
              <span className="text-xs">--</span>
            </div>
          </div>

          {/* System Visualization */}
          <div className="mt-8 border border-border aspect-square relative flex items-center justify-center p-8 bg-black">
            <div className="w-full h-full rounded-full border border-gray-600 flex items-center justify-center">
              <div className="w-3/4 h-3/4 rounded-full bg-white flex items-center justify-center animate-pulse">
                <div className="w-1/2 h-1/2 rounded-full bg-black"></div>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 text-[10px] tracking-widest text-gray-500">
              SYSTEM_CORE_SYNC
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default MainDashboard
