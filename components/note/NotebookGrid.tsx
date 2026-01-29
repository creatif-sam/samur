'use client'

import { Plus, Search, MoreVertical, Notebook, Pin, PinOff, Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NotebookGrid({ pinned, others, search, setSearch, onPin, onSelect, onAdd, onDelete, onRename }: any) {
  return (
    <div className="flex flex-col h-full bg-white max-w-2xl mx-auto min-h-screen animate-in fade-in duration-300">
      {/* Search Header - Compact */}
      <header className="px-4 pt-4 pb-2 sticky top-0 bg-white z-20 border-b border-slate-100/50">
        <div className="flex items-center gap-2 bg-slate-100/50 rounded-lg px-3 py-1.5 border border-transparent focus-within:border-[#7719aa]/20 transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            placeholder="Search notebooks" 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 py-1" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <main className="flex-grow pb-24">
        {/* Pinned Section */}
        {pinned.length > 0 && (
          <div className="pt-2">
            {pinned.map((nb: any) => (
              <NotebookRow key={nb.id} nb={nb} isPinned={true} onPin={onPin} onClick={() => onSelect(nb)} onDelete={onDelete} onRename={onRename} />
            ))}
          </div>
        )}

        {/* Regular Section */}
        <div className="pt-1">
          {others.map((nb: any) => (
            <NotebookRow key={nb.id} nb={nb} isPinned={false} onPin={onPin} onClick={() => onSelect(nb)} onDelete={onDelete} onRename={onRename} />
          ))}
        </div>
      </main>

      {/* Floating Add Button - Exactly like your screenshot */}
      <div className="fixed bottom-6 right-4 z-30">
        <Button 
          onClick={onAdd}
          className="rounded-full bg-white hover:bg-slate-50 text-slate-600 shadow-xl border border-slate-200 h-12 px-6 flex items-center gap-2 group transition-all"
        >
          <Plus className="w-5 h-5 text-[#7719aa]" />
          <span className="text-sm font-semibold text-slate-600 uppercase tracking-tight">Add Notebook</span>
        </Button>
      </div>
    </div>
  )
}

function NotebookRow({ nb, isPinned, onPin, onClick, onDelete, onRename }: any) {
  const dateLabel = new Date(nb.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div 
      onClick={onClick}
      className="group flex items-center gap-4 px-5 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer border-b border-slate-50/80"
    >
      {/* OneNote Style Notebook Icon */}
      <div className="shrink-0 relative">
        <div 
          className="w-7 h-9 rounded-[3px] shadow-sm flex flex-col justify-center items-center relative overflow-hidden"
          style={{ backgroundColor: nb.color || '#7719aa' }}
        >
          {/* Notebook Binding lines */}
          <div className="absolute left-1 top-1 bottom-1 w-[2px] bg-white/20 rounded-full" />
          <div className="w-2 h-2 bg-white/10 rounded-full blur-[1px]" />
        </div>
      </div>

      {/* Label & Date */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-medium text-slate-800 tracking-tight truncate">
          {nb.title}
        </h3>
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
          {nb.sections?.length || 0} Sections • {dateLabel}
        </p>
      </div>

      {/* Utility */}
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 rounded-full">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl p-1 shadow-2xl border-none min-w-[140px]">
            <DropdownMenuItem onClick={(e) => onPin(e, nb.id)} className="rounded-lg font-bold text-[11px] uppercase gap-2 py-2.5">
              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              {isPinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(nb)} className="rounded-lg font-bold text-[11px] uppercase gap-2 py-2.5">
              <Edit3 className="w-3.5 h-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(nb.id)} className="rounded-lg font-bold text-[11px] uppercase gap-2 py-2.5 text-red-500">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}