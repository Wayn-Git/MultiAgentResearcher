import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Bot, Sparkles } from 'lucide-react';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  const nextStep = () => setStep(s => s + 1);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50 -z-10" />
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} transition={{ duration: 0.4, ease: "easeOut" }} className="max-w-md w-full flex flex-col items-center text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight text-black">Welcome to Lumina</h1>
            <p className="text-base sm:text-lg text-[var(--color-ink-muted)] mb-12">Your autonomous multi-agent research assistant.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) nextStep(); }} className="w-full">
              <input 
                autoFocus
                type="text" 
                placeholder="What should I call you?" 
                className="w-full text-center text-2xl sm:text-3xl font-medium text-black placeholder:text-gray-300 border-b-2 border-gray-100 focus:border-black outline-none pb-4 transition-colors mb-12 bg-transparent"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <button disabled={!name.trim()} type="submit" className="bg-black text-white px-10 py-4 rounded-full font-semibold hover:scale-105 transition-all disabled:opacity-30 disabled:hover:scale-100 text-lg shadow-lg">
                Continue
              </button>
            </form>
          </motion.div>
        )}
         {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50, scale: 0.95 }} transition={{ duration: 0.4, ease: "easeOut" }} className="max-w-md w-full text-center flex flex-col items-center">
             <div className="w-16 h-16 border border-black/10 rounded-full flex items-center justify-center mb-8 shadow-sm">
                <span className="font-mono text-xl tracking-widest text-black/40">01</span>
             </div>
             <h2 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight text-black">Deep Research</h2>
             <p className="text-base sm:text-lg text-[var(--color-ink-muted)] mb-12 leading-relaxed">Lumina deploys specialized AI agents to crawl the web, synthesize complex data, and compile comprehensive reports for you.</p>
             <button onClick={nextStep} className="bg-black text-white px-10 py-3.5 rounded-full font-semibold hover:scale-105 hover:bg-black/90 transition-all shadow-md text-base sm:text-lg">
                Next
             </button>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4, ease: "easeOut" }} className="max-w-md w-full text-center flex flex-col items-center">
             <div className="w-16 h-16 border border-black/10 rounded-full flex items-center justify-center mb-8 shadow-sm">
                <span className="font-mono text-xl tracking-widest text-black/40">02</span>
             </div>
             <h2 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight text-black">Interactive Talk Mode</h2>
             <p className="text-base sm:text-lg text-[var(--color-ink-muted)] mb-12 leading-relaxed">Once your research is complete, switch to Talk Mode to ask questions, explore findings, and brainstorm directly with Lumina.</p>
             <button onClick={() => onComplete(name.trim())} className="bg-black text-white px-10 py-3.5 rounded-full font-semibold hover:scale-105 hover:bg-black/90 transition-all shadow-md text-base sm:text-lg">
                Get Started
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
