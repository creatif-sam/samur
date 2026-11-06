'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const EDGE = 16        // never closer than this to a screen edge
const GAP = 8          // space between the icon and the bubble
const NAV_SAFE = 84    // the fixed bottom bar plus breathing room

// The small round "i": closed until you tap it. Tap elsewhere, scroll or press Esc to close.
// The bubble is drawn in a portal, so cards with overflow-hidden can't clip it, and it stays
// inside the screen (flipping above the icon when there is no room below).
export function InfoTip({
  title,
  children,
  align = 'right',
  label = 'What is this?',
  tone = 'default',
  className,
}: {
  title?: string
  children: ReactNode
  // Which edge of the icon the bubble prefers to line up with
  align?: 'left' | 'right'
  label?: string
  // 'onDark' for icons that sit on a violet or other dark background
  tone?: 'default' | 'onDark'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const button = useRef<HTMLButtonElement | null>(null)
  const bubble = useRef<HTMLDivElement | null>(null)
  const id = useId()

  const close = useCallback(() => { setOpen(false); setPos(null) }, [])

  // Place the bubble once it has been measured
  useLayoutEffect(() => {
    if (!open || !button.current || !bubble.current) return
    const r = button.current.getBoundingClientRect()
    const w = bubble.current.offsetWidth
    const h = bubble.current.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    const preferred = align === 'right' ? r.right - w : r.left
    const left = Math.min(Math.max(preferred, EDGE), Math.max(EDGE, vw - w - EDGE))
    const below = r.bottom + GAP
    const roomBelow = vh - NAV_SAFE - below
    const above = r.top - GAP - h
    const top = h <= roomBelow || above < EDGE ? below : above
    setPos({ left, top })
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (button.current?.contains(t) || bubble.current?.contains(t)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); button.current?.focus() }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    // A bubble anchored to a moving page would drift away from its icon, so close it instead
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <button
        ref={button}
        type="button"
        // The icon often sits beside tappable things (cards, long-press areas): keep taps to itself
        onPointerDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation()
          if (open) close()
          else setOpen(true)
        }}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        className={cn(
          'grid h-7 w-7 place-items-center rounded-full transition active:scale-90',
          tone === 'onDark'
            ? 'text-white/80 hover:bg-white/15 hover:text-white'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          open && (tone === 'onDark' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'),
        )}
      >
        <Info className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={bubble}
          id={id}
          role="note"
          style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
          className="fixed z-[70] w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-card-foreground shadow-xl"
        >
          {title && <p className="mb-1 text-[13px] font-black">{title}</p>}
          {children}
        </div>,
        document.body,
      )}
    </span>
  )
}
