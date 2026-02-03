'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, Search, MoreHorizontal, Trash2, 
  Edit3, ChevronLeft, FileText, ChevronRight, Loader2, AlertTriangle,
  Layers, Pencil, Book
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

import { ThoughtEditor } from './ThoughtEditor'
import { AddNotebookDialog } from './AddNotebookDialog'

export function ThoughtBook({ notebooks, onRefresh, userId }: any) {
  const [activeNotebook, setActiveNotebook] = useState<any | null>(null)
  const [activeSection, setActiveSection] = useState<any | null>(null)
  const [editingPage, setEditingPage] = useState<any | null>(null)
  
  const [showAddNotebook, setShowAddNotebook] = useState(false)
  const [notebookToDelete, setNotebookToDelete] = useState<string | null>(null)
  const [notebookToRename, setNotebookToRename] = useState<any | null>(null)
  
  const [sectionToRename, setSectionToRename] = useState<any | null>(null)
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()

  const handleRefresh = async () => {
    const { data } = await onRefresh();
    if (activeNotebook && data) {
      const updated = data.find((n: any) => n.id === activeNotebook.id);
      if (updated) setActiveNotebook(updated);
    }
  };

  async function handleAddPage() {
    const tempId = crypto.randomUUID();
    const newPage = { 
      id: tempId, 
      section_id: activeSection.id, 
      title: 'Untitled Page', 
      content: '',
      isOptimistic: true 
    };

    setEditingPage(newPage);

    const { data, error } = await supabase.from('pages').insert({ 
      section_id: activeSection.id, 
      title: 'Untitled Page', 
      content: '' 
    }).select().single();
    
    if (!error && data) {
      setEditingPage(data);
      handleRefresh();
    } else {
      toast.error("Failed to sync page");
      setEditingPage(null);
    }
  }

  async function handleSaveTitle() {
    if (!newTitle.trim()) return
    setIsProcessing(true)
    try {
      if (isAddingSection) {
        const { error } = await supabase.from('sections').insert({ 
          notebook_id: activeNotebook.id, 
          title: newTitle 
        })
        if (!error) toast.success(`Section "${newTitle}" added`)
      } else {
        const table = notebookToRename ? 'notebooks' : 'sections'
        const id = notebookToRename ? notebookToRename.id : sectionToRename.id
        const { error } = await supabase.from(table).update({ title: newTitle }).eq('id', id)
        if (!error) toast.success('Updated')
      }
      await handleRefresh()
      setNotebookToRename(null); setSectionToRename(null); setIsAddingSection(false); setNewTitle('');
    } finally { setIsProcessing(false) }
  }

  async function handleConfirmDelete() {
    if (!notebookToDelete) return
    setIsProcessing(true)
    const { error } = await supabase.from('notebooks').delete().eq('id', notebookToDelete)
    if (!error) { await handleRefresh(); setNotebookToDelete(null); toast.success('Deleted'); }
    setIsProcessing(false)
  }

  if (editingPage) return <ThoughtEditor page={editingPage} onBack={() => setEditingPage(null)} onRefresh={onRefresh} />

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f172a] max-w-2xl mx-auto flex flex-col relative transition-colors duration-500 font-poppins">
      {!activeNotebook ? (
        <>
          <header className="px-6 pt-12 pb-6 sticky top-0 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl z-20 border-b border-slate-50 dark:border-slate-800 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-[#7719aa] dark:text-[#a78bfa] leading-none uppercase mb-6">Library</h2>
            <div className="relative">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                placeholder="FILTER NOTEBOOKS..." 
                className="w-full pl-7 h-10 bg-transparent border-0 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold tracking-widest uppercase focus:outline-none focus:border-[#7719aa] dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </header>
          <main className="flex-grow pb-40">
            {notebooks.filter((n:any) => n.title.toLowerCase().includes(searchQuery.toLowerCase())).map((nb: any) => (
              <NotebookListItem key={nb.id} nb={nb} onClick={() => setActiveNotebook(nb)} onDelete={setNotebookToDelete} onRename={(nb: any) => { setNotebookToRename(nb); setNewTitle(nb.title); }} />
            ))}
          </main>
          {/* SMALLER BOOK ICON BUTTON */}
          <div className="fixed bottom-32 right-6 z-50">
            <Button onClick={() => setShowAddNotebook(true)} className="h-12 w-12 rounded-2xl bg-[#7719aa] dark:bg-[#7c3aed] shadow-2xl active:scale-95 transition-all border-none flex items-center justify-center">
              <Book className="w-6 h-6 text-white" />
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
          <header className="px-4 py-4 bg-[#7719aa] dark:bg-[#7c3aed] text-white flex items-center justify-between sticky top-0 z-20 shadow-md">
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
              <Button variant="ghost" size="icon" onClick={() => activeSection ? setActiveSection(null) : setActiveNotebook(null)} className="text-white h-10 w-10 shrink-0 rounded-full hover:bg-white/10">
                <ChevronLeft className="w-7 h-7" />
              </Button>
              {/* FIXED OVERFLOW: Added truncate to title */}
              <h2 className="text-sm font-semibold uppercase truncate tracking-wide">
                {activeSection ? activeSection.title : activeNotebook.title}
              </h2>
            </div>
            <Button onClick={() => activeSection ? handleAddPage() : (setIsAddingSection(true), setNewTitle(''))} className="bg-white text-[#7719aa] dark:text-[#7c3aed] font-semibold text-[10px] uppercase rounded-full px-4 h-9 shadow-sm shrink-0 active:scale-95 transition-all">
              <Plus className="w-3.5 h-3.5 mr-1" /> {activeSection ? 'Page' : 'Section'}
            </Button>
          </header>
          
          <main className="flex-grow overflow-y-auto bg-slate-50/20 dark:bg-transparent">
             {!activeSection ? (
               activeNotebook.sections?.map((s: any) => (
                 <div key={s.id} className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between group active:bg-slate-50 dark:active:bg-slate-900 transition-colors">
                    <div className="flex items-center gap-5 flex-1 min-w-0 cursor-pointer" onClick={() => setActiveSection(s)}>
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-[#7719aa] dark:text-[#a78bfa]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-[14px] text-slate-800 dark:text-slate-100 uppercase leading-none tracking-tight truncate">{s.title}</span>
                          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase mt-1 tracking-widest">{s.pages?.length || 0} Pages</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { setSectionToRename(s); setNewTitle(s.title); }} className="text-[#7719aa] dark:text-[#a78bfa] h-10 w-10 shrink-0 rounded-full active:bg-[#7719aa]/10">
                        <Pencil className="w-4 h-4" />
                    </Button>
                 </div>
               ))
             ) : (
               activeSection.pages?.map((p: any) => (
                 <div key={p.id} onClick={() => setEditingPage(p)} className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center gap-4 active:bg-slate-50 dark:active:bg-slate-900 cursor-pointer group min-w-0">
                    <FileText className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 truncate">{p.title}</span>
                 </div>
               ))
             )}
          </main>
        </div>
      )}

      {/* RENAME / ADD DIALOG */}
      <Dialog open={!!notebookToRename || !!sectionToRename || isAddingSection} onOpenChange={() => { setNotebookToRename(null); setSectionToRename(null); setIsAddingSection(false); }}>
        <DialogContent className="max-w-[90vw] md:max-w-[340px] rounded-[32px] border-none p-8 shadow-2xl bg-white dark:bg-slate-950 font-poppins">
          <div className="flex flex-col items-center space-y-6">
            <DialogHeader><DialogTitle className="text-xl font-semibold uppercase tracking-tight text-slate-900 dark:text-white">{isAddingSection ? 'New Section' : 'Rename'}</DialogTitle></DialogHeader>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none text-center font-semibold text-md dark:text-white" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()} />
            <div className="flex w-full gap-3">
              <Button variant="ghost" className="flex-1 rounded-full h-11 text-slate-500 dark:text-slate-400 font-medium" onClick={() => { setNotebookToRename(null); setSectionToRename(null); setIsAddingSection(false); }}>Cancel</Button>
              <Button className="flex-1 rounded-full h-11 bg-[#7719aa] dark:bg-[#7c3aed] font-semibold" onClick={handleSaveTitle} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAddingSection ? 'Create' : 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddNotebookDialog open={showAddNotebook} onOpenChange={setShowAddNotebook} userId={userId} onCreated={handleRefresh} />
    </div>
  )
}

function NotebookListItem({ nb, onClick, onDelete, onRename }: any) {
  return (
    <div onClick={onClick} className="flex items-center gap-4 px-6 py-5 bg-white dark:bg-transparent active:bg-slate-50 dark:active:bg-slate-900 border-b border-slate-50 dark:border-slate-800 transition-all cursor-pointer relative group min-w-0">
      <div className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full" style={{ backgroundColor: nb.color || '#7719aa' }} />
      <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">{nb.emoji || '📓'}</div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[14px] text-slate-800 dark:text-slate-100 uppercase truncate tracking-tight">{nb.title}</h3>
        <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase mt-1 tracking-widest">{nb.sections?.length || 0} SECTIONS</p>
      </div>
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 dark:text-slate-600 hover:text-[#7719aa]"><MoreHorizontal className="w-5 h-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[140px] border-none shadow-2xl bg-white dark:bg-slate-900 font-poppins">
            <DropdownMenuItem onClick={() => onRename(nb)} className="rounded-xl font-semibold text-[11px] uppercase py-3 cursor-pointer dark:text-slate-200">Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(nb.id)} className="rounded-xl font-semibold text-[11px] uppercase py-3 text-red-500 cursor-pointer">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}