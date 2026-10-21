'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Pencil, Trash2, Search, X, Pin, PinOff, FolderInput, Users, MoreVertical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { searchPages } from '@/lib/notes/data'
import { pageSortTime, type Page as PageItem, type Section } from './types'

const LONG_PRESS_MS = 500
const SORT_KEY = 'notes-page-sort'

type SortMode = 'edited' | 'created' | 'title'
const SORT_LABELS: Record<SortMode, string> = { edited: 'Recently edited', created: 'Recently created', title: 'A–Z' }

type PageListProps = {
  section: Section
  onSelect: (page: PageItem) => void
  onDeletePage: (page: PageItem) => void
  onTogglePin: (page: PageItem) => void
  onMovePage: (page: PageItem) => void
}

function formatWhen(page: PageItem) {
  const d = new Date(page.updated_at ?? page.created_at)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

export function PageList({ section, onSelect, onDeletePage, onTogglePin, onMovePage }: PageListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [textMatches, setTextMatches] = useState<Set<string> | null>(null)
  const [searching, setSearching] = useState(false)
  const [sort, setSort] = useState<SortMode>('edited')
  const [actionPage, setActionPage] = useState<PageItem | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const didLongPressRef = useRef(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SORT_KEY) as SortMode | null
      if (saved && saved in SORT_LABELS) setSort(saved)
    } catch { /* storage unavailable */ }
    return () => {
      if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current)
    }
  }, [])

  // Search inside note text too (on the server, so full notes aren't downloaded)
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) { setTextMatches(null); return }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const hits = await searchPages(createClient(), q, section.id)
        setTextMatches(new Set(hits.map(h => h.id)))
      } catch {
        setTextMatches(null)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, section.id])

  function chooseSort(next: SortMode) {
    setSort(next)
    try { localStorage.setItem(SORT_KEY, next) } catch { /* storage unavailable */ }
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function handlePagePointerDown(page: PageItem) {
    didLongPressRef.current = false
    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true
      setActionPage(page)
    }, LONG_PRESS_MS)
  }

  function handlePagePointerUp(page: PageItem) {
    clearLongPressTimer()
    if (!didLongPressRef.current) onSelect(page)
  }

  function act(fn: (page: PageItem) => void) {
    if (!actionPage) return
    const page = actionPage
    setActionPage(null)
    fn(page)
  }

  // Pinned first, then the chosen order; the search matches title, preview or (server) full text
  const filteredPages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const pages = [...(section.pages ?? [])].filter(p => {
      if (!q) return true
      const local = (p.title || 'Untitled').toLowerCase().includes(q) || (p.preview ?? '').toLowerCase().includes(q)
      return local || !!textMatches?.has(p.id)
    })
    const byMode = (a: PageItem, b: PageItem) =>
      sort === 'title'
        ? (a.title || 'Untitled').localeCompare(b.title || 'Untitled', undefined, { sensitivity: 'base' })
        : sort === 'created'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : pageSortTime(b) - pageSortTime(a)
    return pages.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || byMode(a, b))
  }, [section.pages, searchQuery, textMatches, sort])

  return (
    <main className="flex-grow overflow-y-auto flex flex-col font-poppins transition-all">
      {/* SEARCH + SORT */}
      <div className="px-6 py-4 sticky top-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md z-10 border-b border-slate-50 dark:border-slate-800 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search titles and text…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-9 h-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-none text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#7719aa]"
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400" />
          ) : searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            {filteredPages.length} note{filteredPages.length !== 1 ? 's' : ''}
          </p>
          <select
            value={sort}
            onChange={e => chooseSort(e.target.value as SortMode)}
            aria-label="Sort notes"
            className="bg-transparent text-[11px] font-semibold text-slate-500 dark:text-slate-400 focus:outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map(m => <option key={m} value={m}>{SORT_LABELS[m]}</option>)}
          </select>
        </div>
      </div>

      {/* PAGE ITEMS */}
      <div className="px-2 pb-20">
        {filteredPages.length > 0 ? (
          filteredPages.map(p => (
            <div
              key={p.id}
              onPointerDown={() => handlePagePointerDown(p)}
              onPointerUp={() => handlePagePointerUp(p)}
              onPointerLeave={clearLongPressTimer}
              onPointerCancel={clearLongPressTimer}
              onContextMenu={(e) => { e.preventDefault(); setActionPage(p) }}
              className="group px-4 py-3.5 border-b border-slate-50 dark:border-slate-800 flex items-start gap-3 active:bg-slate-50 dark:active:bg-slate-900 rounded-xl transition-all cursor-pointer select-none"
            >
              <FileText className="w-4 h-4 mt-0.5 shrink-0 text-slate-300 dark:text-slate-600" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {p.pinned && <Pin className="w-3 h-3 text-[#7719aa] dark:text-[#a78bfa] shrink-0" />}
                  <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200 truncate tracking-tight">
                    {p.title || 'Untitled'}
                  </span>
                  {p.shared && <Users className="w-3 h-3 text-slate-400 shrink-0" aria-label="Shared with partner" />}
                </div>
                {p.preview?.trim() && (
                  <p className="text-[12px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-snug mt-0.5">{p.preview}</p>
                )}
                <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">{formatWhen(p)}</p>
              </div>
              <button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setActionPage(p) }}
                aria-label="Note actions"
                className="p-1.5 -mr-1 rounded-full text-slate-300 hover:text-slate-500 dark:text-slate-600"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="py-20 text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              {searchQuery ? (searching ? 'Searching…' : 'No results found') : 'No pages in this section'}
            </p>
          </div>
        )}
      </div>

      <Dialog open={!!actionPage} onOpenChange={() => setActionPage(null)}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center truncate">{actionPage?.title || 'Untitled'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => act(onSelect)}>
              <Pencil className="w-4 h-4" /> Open note
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => act(onTogglePin)}>
              {actionPage?.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              {actionPage?.pinned ? 'Unpin' : 'Pin to top'}
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => act(onMovePage)}>
              <FolderInput className="w-4 h-4" /> Move to…
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 text-red-600 hover:text-red-700" onClick={() => act(onDeletePage)}>
              <Trash2 className="w-4 h-4" /> Delete note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
