import { Search, Book, MoreHorizontal, Grid, List, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RecentPagesGrid } from './RecentPagesGrid'

export function NotebookLibrary({ notebooks, onSelect, onAdd, onDelete, onRename, onSelectPage }: any) {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  
  const filtered = notebooks.filter((n: any) => n.title.toLowerCase().includes(query.toLowerCase()))
  
  // Full-text search across all pages
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase()
    const results: Array<{
      page: any
      section: any
      notebook: any
      matchedText: string
    }> = []

    notebooks.forEach((notebook: any) => {
      notebook.sections?.forEach((section: any) => {
        section.pages?.forEach((page: any) => {
          const titleMatch = page.title?.toLowerCase().includes(query)
          const content = typeof page.content === 'string' 
            ? page.content 
            : JSON.stringify(page.content)
          const plainContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
          const contentMatch = plainContent.toLowerCase().includes(query)

          if (titleMatch || contentMatch) {
            let matchedText = ''
            if (titleMatch) {
              matchedText = page.title
            } else {
              const index = plainContent.toLowerCase().indexOf(query)
              const start = Math.max(0, index - 40)
              const end = Math.min(plainContent.length, index + 80)
              matchedText = '...' + plainContent.substring(start, end) + '...'
            }

            results.push({ page, section, notebook, matchedText })
          }
        })
      })
    })

    return results.slice(0, 15)
  }, [searchQuery, notebooks])
  
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
                <span className="text-xs font-semibold">Recent</span>
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
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </p>
            
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
                <Search className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No matching notes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map(({ page, section, notebook, matchedText }, index) => (
                  <button
                    key={`${page.id}-${index}`}
                    onClick={() => onSelectPage(page, section, notebook)}
                    className="w-full bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-800 transition-all text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: notebook.color || '#7719aa' }}
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {notebook.title} / {section.title}
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
          <RecentPagesGrid 
            notebooks={notebooks} 
            onSelectPage={onSelectPage}
          />
        ) : (
          <>
            {filtered.map((nb: any) => (
              <div key={nb.id} onClick={() => onSelect(nb)} className="flex items-center gap-4 px-4 py-5 border-b border-slate-50 dark:border-slate-800 cursor-pointer active:bg-slate-50 dark:active:bg-slate-900 transition-all rounded-xl relative group">
                <div className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full" style={{ backgroundColor: nb.color || '#7719aa' }} />
                <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">{nb.emoji || '📓'}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[15px] text-slate-800 dark:text-slate-100 uppercase truncate">{nb.title}</h3>
                  <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase mt-1 tracking-widest">{nb.sections?.length || 0} SECTIONS</p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-slate-300"><MoreHorizontal size={20}/></Button></DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-2xl p-2 min-w-[140px] border-none shadow-2xl bg-white dark:bg-slate-900">
                      <DropdownMenuItem onClick={() => onRename(nb)} className="rounded-xl font-semibold text-[11px] uppercase py-3 cursor-pointer">Rename</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(nb)} className="rounded-xl font-semibold text-[11px] uppercase py-3 text-red-500 cursor-pointer">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </>
        )}
      </main>
      <div className="fixed bottom-32 right-6 z-50">
        <Button onClick={onAdd} className="h-12 w-12 rounded-2xl bg-[#7719aa] dark:bg-[#7c3aed] shadow-2xl active:scale-95 border-none"><Book className="w-6 h-6 text-white" /></Button>
      </div>
    </>
  )
}