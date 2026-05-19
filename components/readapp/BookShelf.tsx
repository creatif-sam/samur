'use client'

import { JSX, useState } from 'react'
import {
  ChevronDown,
  BookOpen,
  BookMarked,
  CheckCircle,
  Lightbulb,
  Cross,
  Brain,
  Hammer,
  ScrollText,
  Sparkles,
  Crown,
  Timer,
  Layers,
} from 'lucide-react'
import ReadingCard from './ReadingCard'

type ReadingStatus = 'to_read' | 'reading' | 'done' | 'applied'
type ReadingCategory =
  | 'faith'
  | 'self_development'
  | 'skill'
  | 'philosophy'
  | 'psychology'
  | 'leadership'
  | 'productivity'
  | 'miscellaneous'

interface Reading {
  id: string
  title: string
  author?: string
  status: ReadingStatus
  category: ReadingCategory
  total_pages: number
  pages_remaining: number
}

interface BookShelfProps {
  category: ReadingCategory
  books: Reading[]
  onLogged: () => void
}

const categoryMeta: Record<
  ReadingCategory,
  {
    label: string
    icon: JSX.Element
    color: string
    bg: string
    border: string
    spineColor: string
    ring: string
  }
> = {
  faith: {
    label: 'Faith',
    icon: <Cross className="w-4 h-4" />,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800/40',
    spineColor: '#8b5cf6',
    ring: '#8b5cf6',
  },
  self_development: {
    label: 'Self Development',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    spineColor: '#10b981',
    ring: '#10b981',
  },
  skill: {
    label: 'Skill',
    icon: <Hammer className="w-4 h-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800/40',
    spineColor: '#3b82f6',
    ring: '#3b82f6',
  },
  philosophy: {
    label: 'Philosophy',
    icon: <ScrollText className="w-4 h-4" />,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/40',
    spineColor: '#f59e0b',
    ring: '#f59e0b',
  },
  psychology: {
    label: 'Psychology',
    icon: <Brain className="w-4 h-4" />,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    border: 'border-teal-200 dark:border-teal-800/40',
    spineColor: '#14b8a6',
    ring: '#14b8a6',
  },
  leadership: {
    label: 'Leadership',
    icon: <Crown className="w-4 h-4" />,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800/40',
    spineColor: '#a855f7',
    ring: '#a855f7',
  },
  productivity: {
    label: 'Productivity',
    icon: <Timer className="w-4 h-4" />,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800/40',
    spineColor: '#f97316',
    ring: '#f97316',
  },
  miscellaneous: {
    label: 'Miscellaneous',
    icon: <Layers className="w-4 h-4" />,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    border: 'border-gray-200 dark:border-gray-800/40',
    spineColor: '#6b7280',
    ring: '#6b7280',
  },
}

const statusMeta: Record<ReadingStatus, { label: string; icon: JSX.Element; color: string }> = {
  to_read: { label: 'To Read', icon: <BookOpen className="w-3 h-3" />, color: 'text-blue-500' },
  reading: { label: 'Reading', icon: <BookMarked className="w-3 h-3" />, color: 'text-orange-500' },
  done: { label: 'Done', icon: <CheckCircle className="w-3 h-3" />, color: 'text-green-500' },
  applied: { label: 'Applied', icon: <Lightbulb className="w-3 h-3" />, color: 'text-yellow-500' },
}

function ProgressRing({
  percentage,
  color,
  size = 48,
}: {
  percentage: number
  color: string
  size?: number
}): JSX.Element {
  const r = (size - 8) / 2
  const circumference = 2 * Math.PI * r
  const clampedPct = Math.min(100, Math.max(0, percentage))
  const strokeDash = (clampedPct / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          className="text-muted-foreground/15"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      {/* Percentage label in center */}
      <span
        className="absolute text-[9px] font-black leading-none"
        style={{ color }}
      >
        {clampedPct}%
      </span>
    </div>
  )
}

function BookMiniCard({
  book,
  categoryColor,
  spineColor,
  ringColor,
  onLogged,
}: {
  book: Reading
  categoryColor: string
  spineColor: string
  ringColor: string
  onLogged: () => void
}): JSX.Element {
  const [expanded, setExpanded] = useState(false)

  const pagesRead = book.total_pages > 0 ? book.total_pages - book.pages_remaining : 0
  const percentage =
    book.status === 'done' || book.status === 'applied'
      ? 100
      : book.total_pages > 0
      ? Math.round((pagesRead / book.total_pages) * 100)
      : 0

  const statusInfo = statusMeta[book.status]

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300">
      {/* Mini card header row */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
      >
        {/* Colored spine bar */}
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ background: spineColor }}
        />

        {/* Progress ring */}
        <ProgressRing percentage={percentage} color={ringColor} size={48} />

        {/* Book info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-sm text-foreground leading-tight truncate">
            {book.title}
          </h4>
          {book.author && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{book.author}</p>
          )}
          <div className={`flex items-center gap-1 mt-1.5 ${statusInfo.color}`}>
            {statusInfo.icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Right: pages info + chevron */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground">
            {pagesRead}/{book.total_pages}
          </span>
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">pages</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 mt-1 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Expanded: full ReadingCard */}
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <ReadingCard reading={book} onLogged={onLogged} />
        </div>
      )}
    </div>
  )
}

export default function BookShelf({ category, books, onLogged }: BookShelfProps): JSX.Element {
  const [open, setOpen] = useState(false)

  const meta = categoryMeta[category]
  const totalBooks = books.length
  const doneBooks = books.filter(b => b.status === 'done' || b.status === 'applied').length
  const readingBooks = books.filter(b => b.status === 'reading').length

  // Average completion percentage across all books
  const avgPct = Math.round(
    books.reduce((acc, b) => {
      if (b.status === 'done' || b.status === 'applied') return acc + 100
      if (b.total_pages === 0) return acc
      return acc + Math.round(((b.total_pages - b.pages_remaining) / b.total_pages) * 100)
    }, 0) / Math.max(1, totalBooks)
  )

  return (
    <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${meta.border}`}>
      {/* Shelf header / toggle button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors hover:opacity-90 ${meta.bg}`}
      >
        {/* Category icon */}
        <div
          className={`p-2.5 rounded-2xl ${meta.bg} ${meta.color} border ${meta.border} shadow-sm flex-shrink-0`}
        >
          {meta.icon}
        </div>

        {/* Shelf info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className={`font-black text-base uppercase tracking-tight ${meta.color}`}>
              {meta.label}
            </h3>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {totalBooks} {totalBooks === 1 ? 'book' : 'books'}
            </span>
            {doneBooks > 0 && (
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">
                {doneBooks} done
              </span>
            )}
            {readingBooks > 0 && (
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                {readingBooks} reading
              </span>
            )}
          </div>
        </div>

        {/* Right side: avg progress + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <ProgressRing percentage={avgPct} color={meta.spineColor} size={44} />
          <ChevronDown
            className={`w-5 h-5 ${meta.color} transition-transform duration-300 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Shelf divider (the "wood" of the shelf) */}
      {open && (
        <div
          className="h-1.5 w-full"
          style={{
            background: `linear-gradient(90deg, ${meta.spineColor}40, ${meta.spineColor}20, ${meta.spineColor}40)`,
          }}
        />
      )}

      {/* Books inside the shelf */}
      {open && (
        <div className="p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 bg-background/60">
          {books.map(book => (
            <BookMiniCard
              key={book.id}
              book={book}
              categoryColor={meta.color}
              spineColor={meta.spineColor}
              ringColor={meta.ring}
              onLogged={onLogged}
            />
          ))}
        </div>
      )}
    </div>
  )
}
