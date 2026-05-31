'use client'

import { Folder, FileText, ChevronLeft, Plus, ChevronRight, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function getPreview(content: string) {
  if (!content) return ''
  return content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().slice(0, 80)
}

function relativeDate(dateStr: string) {
  const d = new Date(dateStr)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold uppercase italic truncate">{p.title || 'Untitled'}</span>
                  {getPreview(p.content) && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                      {getPreview(p.content)}
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                    {relativeDate(p.updated_at ?? p.created_at)}
                  </span>
                </div>
              </div>
              <MoreVertical className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}