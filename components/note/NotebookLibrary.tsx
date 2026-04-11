import { Search, Book, MoreHorizontal, Grid, List } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RecentPagesGrid } from './RecentPagesGrid'

export function NotebookLibrary({ notebooks, onSelect, onAdd, onDelete, onRename, onSelectPage }: any) {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const filtered = notebooks.filter((n: any) => n.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <>
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl z-20 border-b border-slate-50 dark:border-slate-800">
        <h2 className="text-3xl font-semibold tracking-tight text-[#7719aa] dark:text-[#a78bfa] uppercase mb-6 text-center">Library</h2>
        
        {/* View Toggle */}
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
      </header>
      <main className="flex-grow pb-40 px-2">
        {viewMode === 'grid' ? (
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