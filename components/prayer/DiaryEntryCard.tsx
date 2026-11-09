'use client'

import { BookOpen, Check } from 'lucide-react'
import { diaryPreview, extractPoints } from '@/lib/prayer/points'

function daysAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

interface Props {
  page: { id: string; title: string; content: string | null; created_at: string }
  sectionTitle?: string
  onOpen: () => void
  onToggle: (index: number) => void
}

// A Prayer Diary entry: tap the top to open the note, tick its prayer points below
export default function DiaryEntryCard({ page, sectionTitle, onOpen, onToggle }: Props) {
  const points = extractPoints(page.content ?? '')
  const done = points.filter(p => p.checked).length
  const preview = diaryPreview(page.content ?? '')

  return (
    <div className="rounded-2xl bg-card dark:bg-zinc-900/50 border border-border/50 shadow-sm">
      <button onClick={onOpen} className="w-full text-left p-4 active:scale-[0.99] transition-transform">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{page.title}</p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {sectionTitle && (
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">{sectionTitle}</span>
              )}
              {points.length > 0 && (
                <span className={`text-[10px] font-bold ${done === points.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {done} of {points.length} prayed
                </span>
              )}
            </div>
            {preview && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{preview}</p>}
            <p className="text-[10px] text-muted-foreground mt-1">{daysAgo(page.created_at)}</p>
          </div>
        </div>
      </button>
      {points.length > 0 && (
        <ul className="space-y-0.5 border-t border-border/50 px-3 py-2">
          {points.map((pt, i) => (
            <li key={i}>
              <button
                role="checkbox"
                aria-checked={pt.checked}
                onClick={() => onToggle(i)}
                className="flex w-full items-start gap-2.5 rounded-xl px-1.5 py-1.5 text-left hover:bg-muted/50"
              >
                <span className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border-2 transition ${pt.checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/40'}`}>
                  {pt.checked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className={`text-sm leading-snug ${pt.checked ? 'text-muted-foreground line-through' : ''}`}>{pt.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
