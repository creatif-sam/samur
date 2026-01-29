'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Save, Trash2, Calendar, Clock, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ThoughtEditorProps {
  page: any
  onBack: () => void
  onRefresh: () => Promise<void>
}

export function ThoughtEditor({ page, onBack, onRefresh }: ThoughtEditorProps) {
  const [title, setTitle] = useState(page.title)
  const [content, setContent] = useState(page.content || "")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Auto-save on unmount or simply handle the save-and-exit
  async function handleSave() {
    if (isSaving || saveSuccess) return
    setIsSaving(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('pages')
      .update({ 
        title, 
        content,
        updated_at: new Date().toISOString() 
      })
      .eq('id', page.id)

    if (error) {
      console.error("Error saving page:", error)
      setIsSaving(false)
    } else {
      setSaveSuccess(true)
      await onRefresh()
      setTimeout(() => onBack(), 500)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
      {/* MOBILE-OPTIMIZED HEADER */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#7719aa] text-white shrink-0 shadow-sm">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack} 
          className="text-white hover:bg-white/10 font-bold uppercase text-[11px] tracking-tight"
        >
          <ChevronLeft className="w-5 h-5 mr-0.5" /> Back
        </Button>
        
        <Button 
          size="sm" 
          onClick={handleSave}
          disabled={isSaving || saveSuccess}
          className={cn(
            "h-9 px-4 font-black uppercase italic text-[11px] border-none rounded-full transition-all shadow-md",
            saveSuccess ? "bg-green-500 text-white" : "bg-white text-[#7719aa]"
          )}
        >
          {saveSuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            isSaving ? '...' : 'Done'
          )}
        </Button>
      </header>

      {/* THE CANVAS */}
      <main className="flex-grow overflow-y-auto relative flex flex-col">
        {/* Title Area - Reduced padding for Mobile */}
        <div className="px-5 py-6 space-y-2 border-b border-dashed bg-white">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full text-3xl font-black uppercase italic tracking-tighter bg-transparent border-none focus:ring-0 p-0 placeholder:text-slate-200 text-[#7719aa]"
          />
          
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(page.created_at).toLocaleDateString()}
            </span>
            <span className="opacity-30">|</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(page.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* RULED PAPER WRITING AREA (No vertical lines) */}
        <div 
          className="flex-grow px-5 py-4"
          style={{
            backgroundImage: `linear-gradient(#f1f1f1 1px, transparent 1px)`,
            backgroundSize: '100% 2.25rem', // Aligns with leading-loose
            backgroundAttachment: 'local'
          }}
        >
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            className="w-full min-h-full text-[16px] md:text-base font-medium leading-[2.25rem] border-none focus-visible:ring-0 bg-transparent resize-none p-0 outline-none text-slate-800 placeholder:text-slate-300"
            style={{ minHeight: 'calc(100vh - 250px)' }}
          />
        </div>
      </main>

      {/* MINIMAL MOBILE FOOTER */}
      <footer className="px-5 py-3 bg-slate-50 border-t flex justify-between items-center shrink-0">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">
          {isSaving ? "Syncing..." : "Saved to Cloud"}
        </span>
        
        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500 h-8 w-8 transition-colors">
          <Trash2 className="w-4 h-4" />
        </Button>
      </footer>
    </div>
  )
}