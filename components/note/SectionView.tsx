'use client'

import { Folder, FileText, ChevronLeft, Plus, Edit2, ChevronRight, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SectionView({ notebook, activeSection, onBack, onAdd, onSelectSection, onSelectPage, onRename }: any) {
  return (
    <div className="flex flex-col h-full bg-background animate-in slide-in-from-right duration-300 overflow-hidden">
      <header className="px-4 py-4 bg-[#7719aa] text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10 h-9 w-9">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
              {activeSection ? notebook.title : 'Notebook'}
            </span>
            <h2 className="text-sm font-black uppercase italic tracking-tight truncate max-w-[150px]">
              {activeSection ? activeSection.title : notebook.title}
            </h2>
          </div>
        </div>
        <Button onClick={onAdd} size="sm" className="bg-white text-[#7719aa] font-black text-[10px] uppercase rounded-xl h-8">
          <Plus className="w-3.5 h-3.5 mr-1" /> {activeSection ? 'Page' : 'Section'}
        </Button>
      </header>

      <div className="flex-grow overflow-y-auto px-4 py-6 space-y-2">
        {!activeSection ? (
          notebook.sections?.map((s: any) => (
            <button 
              key={s.id} 
              onClick={() => onSelectSection(s)} 
              className="w-full flex items-center justify-between p-4 bg-secondary/30 rounded-2xl hover:bg-secondary/50 active:scale-[0.99] transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                   <Folder className="w-5 h-5 text-[#7719aa]" />
                </div>
                <div>
                  <span className="text-sm font-bold uppercase tracking-tight italic block">{s.title}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{s.pages?.length || 0} Pages</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))
        ) : (
          activeSection.pages?.map((p: any) => (
            <div
              key={p.id}
              onClick={() => onSelectPage(p)}
              className="flex items-center justify-between p-4 bg-white border rounded-2xl shadow-sm active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold uppercase italic truncate">{p.title}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                    Sync: {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}