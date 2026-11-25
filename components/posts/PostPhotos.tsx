'use client'

import { useTranslation } from '@/contexts/TranslationContext'
/* eslint-disable @next/next/no-img-element -- photos come from Supabase storage at their own sizes */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Heart, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DOUBLE_TAP_MS = 260

// Photos run edge to edge in a swipeable strip with dots and a counter.
// Tap opens the photo full screen; double tap likes the post with a heart burst.
export default function PostPhotos({ urls, onDoubleTap }: { urls: string[]; onDoubleTap?: () => void }) {
  const { tr } = useTranslation()
  const [open, setOpen] = useState<number | null>(null)
  const [index, setIndex] = useState(0)
  const [burst, setBurst] = useState(0)
  const strip = useRef<HTMLDivElement | null>(null)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (tapTimer.current) clearTimeout(tapTimer.current) }, [])
  if (!urls.length) return null
  const n = urls.length

  const tap = (i: number) => {
    if (tapTimer.current) {
      // Second tap in time: like, and show the heart
      clearTimeout(tapTimer.current)
      tapTimer.current = null
      setBurst(b => b + 1)
      onDoubleTap?.()
      return
    }
    tapTimer.current = setTimeout(() => { tapTimer.current = null; setOpen(i) }, DOUBLE_TAP_MS)
  }
  const goTo = (i: number) => strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: 'smooth' })

  return (
    <>
      <div className="relative select-none bg-muted">
        <div
          ref={strip}
          onScroll={e => setIndex(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {urls.map((url, i) => (
            <button
              key={url}
              onClick={() => tap(i)}
              aria-label={tr('Open photo {value} of {n}', { value: i + 1, n })}
              className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden"
            >
              <img src={url} alt="" loading={i === 0 ? 'eager' : 'lazy'} draggable={false} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        {/* Heart burst on double tap */}
        <AnimatePresence>
          {burst > 0 && (
            <motion.div
              key={burst}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.15, 1], opacity: [0, 1, 1] }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              onAnimationComplete={() => setTimeout(() => setBurst(0), 250)}
              className="pointer-events-none absolute inset-0 grid place-items-center"
            >
              <Heart className="h-24 w-24 fill-white text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {n > 1 && (
          <>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
              {index + 1}/{n}
            </span>
            {index > 0 && (
              <button onClick={() => goTo(index - 1)} aria-label={tr('Previous photo')} className="absolute left-2 top-1/2 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-black shadow sm:grid">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {index < n - 1 && (
              <button onClick={() => goTo(index + 1)} aria-label={tr('Next photo')} className="absolute right-2 top-1/2 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-black shadow sm:grid">
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
      {n > 1 && (
        <div className="flex justify-center gap-1 pt-2.5" aria-hidden>
          {urls.map((url, i) => (
            <span key={url} className={cn('h-1.5 w-1.5 rounded-full transition-colors', i === index ? 'bg-violet-600 dark:bg-violet-400' : 'bg-muted-foreground/30')} />
          ))}
        </div>
      )}
      {open !== null && <Lightbox urls={urls} start={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function Lightbox({ urls, start, onClose }: { urls: string[]; start: number; onClose: () => void }) {
  const { tr } = useTranslation()
  const [i, setI] = useState(start)
  const [touchX, setTouchX] = useState<number | null>(null)
  const go = (d: number) => setI(x => (x + d + urls.length) % urls.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div
      role="dialog"
      aria-label={tr('Photo')}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
      onClick={onClose}
      onTouchStart={e => setTouchX(e.touches[0].clientX)}
      onTouchEnd={e => {
        if (touchX === null) return
        const dx = e.changedTouches[0].clientX - touchX
        if (Math.abs(dx) > 50 && urls.length > 1) go(dx < 0 ? 1 : -1)
        setTouchX(null)
      }}
    >
      <img src={urls[i]} alt="" className="max-h-full max-w-full object-contain" onClick={e => e.stopPropagation()} />
      <button onClick={onClose} aria-label={tr('Close')} className="absolute right-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <X className="h-5 w-5" />
      </button>
      {urls.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); go(-1) }} aria-label={tr('Previous photo')} className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={e => { e.stopPropagation(); go(1) }} aria-label={tr('Next photo')} className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white">
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="absolute inset-x-0 text-center text-xs font-semibold text-white/70" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            {i + 1} / {urls.length}
          </p>
        </>
      )}
    </div>,
    document.body,
  )
}
