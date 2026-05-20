'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

const PHRASES = [
  'Setting your spirit…',
  'Loading your journey…',
  'Preparing your space…',
  'Igniting your vision…',
]

export default function SplashLoader() {
  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIndex(i => (i + 1) % PHRASES.length)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-violet-950 via-[#1e0b4b] to-indigo-950">

      {/* ── BACKGROUND ORBS ─────────────────────── */}
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-violet-600/30 blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full bg-indigo-600/25 blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -40, 0], opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-purple-500/20 blur-[80px] pointer-events-none"
      />

      {/* ── PULSING RINGS ───────────────────────── */}
      {[0, 0.6, 1.2].map((delay, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 2.2], opacity: [0.35, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut', delay }}
          className="absolute w-40 h-40 rounded-full border border-violet-400/40 pointer-events-none"
        />
      ))}

      {/* ── FLOATING DOTS ───────────────────────── */}
      {[
        { x: -120, y: -80, delay: 0 },
        { x: 130, y: -60, delay: 0.4 },
        { x: -100, y: 110, delay: 0.8 },
        { x: 110, y: 90, delay: 1.2 },
        { x: 0, y: -140, delay: 0.6 },
        { x: 0, y: 140, delay: 1.0 },
      ].map(({ x, y, delay }, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.5, 1, 0.5], x, y }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay }}
          className="absolute w-1.5 h-1.5 rounded-full bg-violet-300/70 pointer-events-none"
        />
      ))}

      {/* ── LOGO ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.75, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center gap-3"
      >
        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-[0_0_40px_rgba(167,139,250,0.4)]"
        >
          <Sparkles className="w-8 h-8 text-violet-300" />
        </motion.div>

        {/* Wordmark */}
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, letterSpacing: '0.3em' }}
            animate={{ opacity: 1, letterSpacing: '-0.02em' }}
            transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
            className="text-5xl font-black text-white tracking-tighter"
          >
            MASTERY<span className="text-violet-400">.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-violet-300/70 text-xs font-semibold tracking-[0.25em] uppercase mt-1"
          >
            Grow · Reflect · Thrive
          </motion.p>
        </div>
      </motion.div>

      {/* ── ANIMATED PHRASE ─────────────────────── */}
      <div className="absolute bottom-36 h-5 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={phraseIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="text-violet-300/50 text-xs font-medium tracking-wide"
          >
            {PHRASES[phraseIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ── LOADING BAR ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0.6 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="absolute bottom-24 w-44 h-[2px] bg-white/10 rounded-full overflow-hidden"
      >
        <motion.div
          animate={{ x: ['-110%', '110%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-1/2 h-full rounded-full bg-gradient-to-r from-transparent via-violet-400 to-transparent"
        />
      </motion.div>

    </div>
  )
}
