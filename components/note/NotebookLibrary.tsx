import { Search, Book, Grid, List, X, Pin, PinOff, Pencil, Trash2, Users, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { searchPages } from '@/lib/notes/data'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { RecentPagesGrid } from './RecentPagesGrid'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Notebook, Page, Section } from './types'

const LONG_PRESS_MS = 500

type NotebookLibraryProps = {
  notebooks: Notebook[]
  onSelect: (nb: Notebook) => void
  onAdd: () => void
  onDelete: (nb: Notebook) => void
  onRename: (nb: Notebook) => void
  onTogglePin: (nb: Notebook) => void
  onSelectPage: (page: Page, section: Section, notebook: Notebook) => void
  onQuickAdd: () => void
  onLongPressPage: (page: Page, section: Section, notebook: Notebook) => void
  // Notes your partner shared with you (read-only)
  sharedWithMe?: Page[]
  partnerName?: string | null
  onOpenShared?: (page: Page) => void
}

function noteCount(nb: Notebook) {
  return (nb.sections ?? []).reduce((sum, s) => sum + (s.pages?.length ?? 0), 0)
}

export function NotebookLibrary({ notebooks, onSelect, onAdd, onDelete, onRename, onTogglePin, onSelectPage, onQuickAdd, onLongPressPage, sharedWithMe = [], partnerName, onOpenShared }: NotebookLibraryProps) {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionNotebook, setActionNotebook] = useState<Notebook | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const didLongPressRef = useRef(false)

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current)
    }
  }, [])

  const sortedNotebooks = useMemo(
    () =>
      [...notebooks].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, {
          sensitivity: 'base',
        })
      ),
    [notebooks]
  )

  const filtered = useMemo(
    () =>
      sortedNotebooks.filter(n =>
        n.title.toLowerCase().includes(query.toLowerCase())
      ),
    [query, sortedNotebooks]
  )

  // Pinned notebooks first, each group alphabetical
  const orderedFiltered = useMemo(
    () => [...filtered.filter(nb => nb.pinned), ...filtered.filter(nb => !nb.pinned)],
    [filtered]
  )

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function handleNotebookPointerDown(nb: Notebook) {
    didLongPressRef.current = false
    clearLongPressTimer()

    longPressTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true
      setActionNotebook(nb)
    }, LONG_PRESS_MS)
  }

  function handleNotebookPointerUp(nb: Notebook) {
    clearLongPressTimer()
    if (!didLongPressRef.current) {
      onSelect(nb)
    }
  }

  function handleNotebookPointerCancel() {
    clearLongPressTimer()
  }

  function handleRenameFromActions() {
    if (!actionNotebook) return
    onRename(actionNotebook)
    setActionNotebook(null)
  }

  function handleDeleteFromActions() {
    if (!actionNotebook) return
    onDelete(actionNotebook)
    setActionNotebook(null)
  }

  function handlePinFromActions() {
    if (!actionNotebook) return
    onTogglePin(actionNotebook)
    setActionNotebook(null)
  }

  // Full-text search runs on the server, so notes don't all have to be downloaded
  const [searchHits, setSearchHits] = useState<Page[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) { setSearchHits([]); return }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        setSearchHits(await searchPages(createClient(), q))
      } catch {
        setSearchHits([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Where each section lives, to label results and open them
  const sectionIndex = useMemo(() => {
    const map = new Map<string, { section: Section; notebook: Notebook }>()
    notebooks.forEach(notebook => notebook.sections?.forEach(section => map.set(section.id, { section, notebook })))
    return map
  }, [notebooks])

  const searchResults = useMemo(() => {
    return searchHits.map(page => {
      const owner = sectionIndex.get(page.section_id)
      const preview = (page.preview ?? '').trim()
      return { page, owner, matchedText: preview || 'Empty note' }
    })
  }, [searchHits, sectionIndex])

  const pinnedNotes = useMemo(() => {
    const out: { page: Page; section: Section; notebook: Notebook }[] = []
    notebooks.forEach(notebook => notebook.sections?.forEach(section => section.pages?.forEach(page => {
      if (page.pinned) out.push({ page, section, notebook })
    })))
    return out
  }, [notebooks])

  return (
    <>
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl z-20 border-b border-slate-50 dark:border-slate-800">
        <h2 className="text-3xl font-semibold tracking-tight text-[#7719aa] dark:text-[#a78bfa] uppercase mb-4 text-center">Library</h2>

        {/* Global Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search all notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View Toggle */}
        {!searchQuery && (
          <>
            <div className="flex gap-2 mb-4">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`flex-1 gap-2 ${viewMode === 'grid' ? 'bg-[#7719aa] dark:bg-[#7c3aed]' : ''}`}
              >
                <Grid className="w-4 h-4" />
                <span className="text-xs font-semibold">Recent Pages</span>
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`flex-1 gap-2 ${viewMode === 'table' ? 'bg-[#7719aa] dark:bg-[#7c3aed]' : ''}`}
              >
                <List className="w-4 h-4" />
                <span className="text-xs font-semibold">Notebooks</span>
              </Button>
            </div>

            {viewMode === 'table' && (
              <div className="relative">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input placeholder="FILTER..." className="w-full pl-7 h-10 bg-transparent border-0 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold tracking-widest uppercase focus:outline-none dark:text-white" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            )}
          </>
        )}
      </header>
      <main className="flex-grow pb-40 px-2">
        {searchQuery ? (
          // Search Results View
          <div className="px-4 py-4">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              {searching ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…</> : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} found`}
            </p>

            {!searching && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
                <Search className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No matching notes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map(({ page, owner, matchedText }, index) => (
                  <button
                    key={`${page.id}-${index}`}
                    onClick={() => (owner ? onSelectPage(page, owner.section, owner.notebook) : onOpenShared?.(page))}
                    className="w-full bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-800 transition-all text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: owner?.notebook.color || '#94a3b8' }}
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        {owner ? `${owner.notebook.title} / ${owner.section.title}` : <><Users className="w-3 h-3" /> Shared by {partnerName || 'partner'}</>}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
                      {page.title || 'Untitled'}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {matchedText}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <>
          {pinnedNotes.length > 0 && (
            <div className="px-4 pt-4">
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                <Pin className="w-3 h-3" /> Pinned notes
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {pinnedNotes.map(({ page, section, notebook }) => (
                  <button
                    key={page.id}
                    onClick={() => onSelectPage(page, section, notebook)}
                    className="shrink-0 w-40 text-left rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/60 dark:bg-violet-950/20 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{page.title || 'Untitled'}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{page.preview?.trim() || notebook.title}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {sharedWithMe.length > 0 && (
            <div className="px-4 pt-4">
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Shared with you{partnerName ? ` by ${partnerName}` : ''}
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {sharedWithMe.map(page => (
                  <button
                    key={page.id}
                    onClick={() => onOpenShared?.(page)}
                    className="shrink-0 w-40 text-left rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{page.title || 'Untitled'}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{page.preview?.trim() || 'Open to read'}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <RecentPagesGrid
            notebooks={notebooks}
            onSelectPage={onSelectPage}
            onLongPress={onLongPressPage}
          />
          </>
        ) : (
          <>
            <div className="px-4 pt-2 pb-1">
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
                Long press a notebook for actions
              </p>
            </div>

            {orderedFiltered.map(nb => {
              const isPinned = !!nb.pinned

              return (
              <div
                key={nb.id}
                onPointerDown={() => handleNotebookPointerDown(nb)}
                onPointerUp={() => handleNotebookPointerUp(nb)}
                onPointerLeave={handleNotebookPointerCancel}
                onPointerCancel={handleNotebookPointerCancel}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setActionNotebook(nb)
                }}
                className="flex items-center gap-4 px-4 py-5 border-b border-slate-50 dark:border-slate-800 cursor-pointer active:bg-slate-50 dark:active:bg-slate-900 transition-all rounded-xl relative group select-none"
              >
                <div className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full" style={{ backgroundColor: nb.color || '#7719aa' }} />
                <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">{nb.emoji || '📓'}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[15px] text-slate-800 dark:text-slate-100 uppercase truncate flex items-center gap-2">
                    <span className="truncate">{nb.title}</span>
                    {isPinned && (
                      <Pin className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    )}
                  </h3>
                  <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase mt-1 tracking-widest">{nb.sections?.length || 0} sections · {noteCount(nb)} notes</p>
                </div>
              </div>
            )})}
          </>
        )}
      </main>
      <div className="fixed bottom-32 right-6 z-50 flex flex-col gap-3 items-end">
        <Button
          onClick={onQuickAdd}
          title="Quick note"
          className="h-12 w-12 rounded-2xl bg-violet-500 dark:bg-violet-600 shadow-xl active:scale-95 border-none"
        >
          <Pencil className="w-5 h-5 text-white" />
        </Button>
        <Button onClick={onAdd} className="h-12 w-12 rounded-2xl bg-[#7719aa] dark:bg-[#7c3aed] shadow-2xl active:scale-95 border-none"><Book className="w-6 h-6 text-white" /></Button>
      </div>

      <Dialog open={!!actionNotebook} onOpenChange={() => setActionNotebook(null)}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center">
              {actionNotebook?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handlePinFromActions}
            >
              {actionNotebook?.pinned ? (
                <>
                  <PinOff className="w-4 h-4" /> Unpin
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4" /> Pin notebook
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleRenameFromActions}
            >
              <Pencil className="w-4 h-4" /> Rename
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-red-600 hover:text-red-700"
              onClick={handleDeleteFromActions}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}