'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Pencil, Trash2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const LONG_PRESS_MS = 500

type PageItem = {
  id: string
  title: string
}

type SectionWithPages = {
  pages?: PageItem[]
}

type PageListProps = {
  section: SectionWithPages
  onSelect: (page: PageItem) => void
  onDeletePage: (page: PageItem) => void
}

export function PageList({ section, onSelect, onDeletePage }: PageListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [actionPage, setActionPage] = useState<PageItem | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const didLongPressRef = useRef(false)

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

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
    if (!didLongPressRef.current) {
      onSelect(page)
    }
  }

  function handlePagePointerCancel() {
    clearLongPressTimer()
  }

  function handleEditFromActions() {
    if (!actionPage) return
    onSelect(actionPage)
    setActionPage(null)
  }

  function handleDeleteFromActions() {
    if (!actionPage) return
    onDeletePage(actionPage)
    setActionPage(null)
  }

  // Filter logic for pages
  const filteredPages = section.pages?.filter((p: PageItem) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <main className="flex-grow overflow-y-auto flex flex-col font-poppins transition-all">
      
      {/* INLINE PAGE SEARCH */}
      <div className="px-6 py-4 sticky top-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md z-10 border-b border-slate-50 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-none text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#7719aa]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* PAGE ITEMS */}
      <div className="px-2 pb-20">
        {filteredPages.length > 0 && (
          <div className="px-4 pt-2 pb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Long press a note for actions
            </p>
          </div>
        )}

        {filteredPages.length > 0 ? (
          filteredPages.map((p: PageItem) => (
            <div 
              key={p.id} 
              onPointerDown={() => handlePagePointerDown(p)}
              onPointerUp={() => handlePagePointerUp(p)}
              onPointerLeave={handlePagePointerCancel}
              onPointerCancel={handlePagePointerCancel}
              onContextMenu={(e) => {
                e.preventDefault()
                setActionPage(p)
              }}
              className="group px-4 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-900 rounded-xl transition-all cursor-pointer select-none"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <FileText className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600" />
                <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 truncate tracking-tight">
                  {p.title}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              {searchQuery ? 'No results found' : 'No pages in this section'}
            </p>
          </div>
        )}
      </div>

      <Dialog open={!!actionPage} onOpenChange={() => setActionPage(null)}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center">
              {actionPage?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleEditFromActions}
            >
              <Pencil className="w-4 h-4" /> Edit note
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-red-600 hover:text-red-700"
              onClick={handleDeleteFromActions}
            >
              <Trash2 className="w-4 h-4" /> Delete note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}