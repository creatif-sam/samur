'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// The small round "i" many sites use: tap it for a short explanation, tap elsewhere (or Esc) to close it.
export function InfoTip({
  title,
  children,
  align = 'right',
  label = 'What is this?',
  className,
}: {
  title?: string
  children: ReactNode
  // Which edge of the icon the bubble lines up with
  align?: 'left' | 'right'
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLSpanElement | null>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={root} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        className={cn(
          'grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-90',
          open && 'bg-muted text-foreground',
        )}
      >
        <Info className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </button>
      {open && (
        <div
          id={id}
          role="note"
          className={cn(
            'absolute top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-card-foreground shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {title && <p className="mb-1 text-[13px] font-black">{title}</p>}
          {children}
        </div>
      )}
    </span>
  )
}
