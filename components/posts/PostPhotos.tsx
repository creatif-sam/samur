'use client'

/* eslint-disable @next/next/no-img-element -- photos come from Supabase storage at their own sizes */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// One photo fills the width; two sit side by side; three are one big and two small; four are a grid
export default function PostPhotos({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!urls.length) return null
  const n = urls.length

  return (
    <>
      <div className={cn('grid gap-1 overflow-hidden rounded-2xl', n === 1 ? 'grid-cols-1' : 'grid-cols-2', n === 3 && 'grid-rows-2')}>
        {urls.map((url, i) => (
          <button
            key={url}
            onClick={() => setOpen(i)}
            aria-label={`Open photo ${i + 1} of ${n}`}
            className={cn(
              'relative block overflow-hidden bg-muted',
              n === 1 ? 'max-h-[420px]' : 'aspect-square',
              n === 3 && i === 0 && 'row-span-2 aspect-auto h-full',
            )}
          >
            <img src={url} alt="" loading="lazy" className={cn('h-full w-full object-cover', n === 1 && 'max-h-[420px]')} />
          </button>
        ))}
      </div>
      {open !== null && <Lightbox urls={urls} start={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function Lightbox({ urls, start, onClose }: { urls: string[]; start: number; onClose: () => void }) {
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
      aria-label="Photo"
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
      <button onClick={onClose} aria-label="Close" className="absolute right-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <X className="h-5 w-5" />
      </button>
      {urls.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); go(-1) }} aria-label="Previous photo" className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={e => { e.stopPropagation(); go(1) }} aria-label="Next photo" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white">
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
