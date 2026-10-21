'use client'

import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'

export interface CurrentBook {
  title: string
  author?: string | null
  total_pages: number
  pages_remaining?: number | null
}

// The book you're reading right now, with progress
export default function CurrentBookCard({ book }: { book: CurrentBook | null }) {
  if (!book) {
    return (
      <div className="px-4 mt-5">
        <Link href="/protected/readapp" className="flex items-center gap-3 rounded-3xl border-2 border-dashed border-amber-300/60 dark:border-amber-800/50 px-4 py-4 text-sm font-semibold text-muted-foreground">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <span className="flex-1">No book in progress. Start reading!</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  const pagesRead = book.total_pages - (book.pages_remaining ?? 0)
  const pct = book.total_pages > 0 ? Math.round((pagesRead / book.total_pages) * 100) : 0

  return (
    <div className="px-4 mt-5">
      <Link href="/protected/readapp" className="block rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 relative overflow-hidden">
        <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Currently reading</p>
            <p className="text-sm font-black text-white truncate">{book.title}</p>
            {book.author && <p className="text-[11px] text-white/70 truncate">{book.author}</p>}
            {book.total_pages > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-white/80 shrink-0">{book.pages_remaining ?? 0} pages left</span>
              </div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-white/70 shrink-0" />
        </div>
      </Link>
    </div>
  )
}
