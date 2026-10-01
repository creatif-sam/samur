'use client'

import { useState } from 'react'
import { Layers, MoreHorizontal, Trash2, Search, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Notebook, Section } from './types'

type SectionListProps = {
  notebook: Notebook
  onSelect: (section: Section) => void
  onDeleteSection: (section: Section) => void
  onRenameSection: (section: Section) => void
}

export function SectionList({ notebook, onSelect, onDeleteSection, onRenameSection }: SectionListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSections = notebook.sections?.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <main className="flex-grow overflow-y-auto flex flex-col font-poppins">
      <div className="px-6 py-4 sticky top-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md z-10 border-b border-slate-50 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search sections..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-none text-[13px] font-medium text-slate-700 dark:text-slate-200"
          />
        </div>
      </div>

      <div className="px-2 pb-20">
        {filteredSections.map(s => (
          <div key={s.id} className="px-4 py-5 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-900 rounded-xl transition-all">
            <div onClick={() => onSelect(s)} className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-[#7719aa] dark:text-[#a78bfa]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-[14px] text-slate-800 dark:text-slate-100 uppercase truncate leading-none">
                  {s.title}
                </span>
                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase mt-1.5 tracking-widest">
                  {s.pages?.length || 0} Pages
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-200">
                  <MoreHorizontal size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[150px] shadow-2xl bg-white dark:bg-slate-900 border-none font-poppins">
                <DropdownMenuItem 
                  onClick={() => onRenameSection(s)} 
                  className="rounded-xl font-semibold text-[11px] uppercase py-3 cursor-pointer"
                >
                  <Pencil size={14} className="mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDeleteSection(s)} 
                  className="rounded-xl font-semibold text-[11px] uppercase py-3 text-red-500 cursor-pointer"
                >
                  <Trash2 size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </main>
  )
}