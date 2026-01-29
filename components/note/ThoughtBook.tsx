'use client'

import { useState } from 'react'
import { 
  Plus, Search, MoreHorizontal, Trash2, 
  Edit3, ChevronLeft, FileText, ChevronRight, Loader2, AlertTriangle,
  Layers, Pencil
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

  // --- FAST PAGE CREATION ---
  async function handleAddPage() {
    // Generate a temporary ID so we can open the editor instantly
    const tempId = crypto.randomUUID();
    const newPage = { 
      id: tempId, 
      section_id: activeSection.id, 
      title: 'Untitled Page', 
      content: '',
      isOptimistic: true 
    };

    // 1. Open editor immediately
    setEditingPage(newPage);

    // 2. Sync with database in background
    const { data, error } = await supabase.from('pages').insert({ 
      section_id: activeSection.id, 
      title: 'Untitled Page', 
      content: '' 
    }).select().single();
    
    if (!error && data) {
      setEditingPage(data); // Swap temp with real data
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
    <div className="min-h-screen bg-white max-w-2xl mx-auto flex flex-col relative">
      {!activeNotebook ? (
        /* LIBRARY VIEW */
        <>
          <header className="px-6 pt-12 pb-6 sticky top-0 bg-white/90 backdrop-blur-xl z-20 border-b border-slate-50">
            <h2 className="text-4xl font-black tracking-tighter text-[#7719aa] leading-none uppercase mb-6">Library</h2>
            <div className="relative">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                placeholder="FILTER NOTEBOOKS..." 
                className="w-full pl-7 h-10 bg-transparent border-0 border-b border-slate-100 text-[11px] font-bold tracking-widest uppercase focus:outline-none focus:border-[#7719aa]" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </header>
          <main className="flex-grow pb-32">
            {notebooks.filter((n:any) => n.title.toLowerCase().includes(searchQuery.toLowerCase())).map((nb: any) => (
              <NotebookListItem key={nb.id} nb={nb} onClick={() => setActiveNotebook(nb)} onDelete={setNotebookToDelete} onRename={(nb: any) => { setNotebookToRename(nb); setNewTitle(nb.title); }} />
            ))}
          </main>
          <div className="fixed bottom-32 right-8 z-50">
            <Button onClick={() => setShowAddNotebook(true)} className="h-14 w-14 rounded-full bg-[#7719aa] shadow-xl active:scale-90 transition-all border-none">
              <Plus className="w-8 h-8 text-white" />
            </Button>
          </div>
        </>
      ) : (
        /* SECTION / PAGE NAVIGATION */
        <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
          <header className="px-4 py-4 bg-[#7719aa] text-white flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => activeSection ? setActiveSection(null) : setActiveNotebook(null)} className="text-white h-9 w-9 rounded-full">
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-sm font-bold uppercase truncate max-w-[180px]">{activeSection ? activeSection.title : activeNotebook.title}</h2>
            </div>
            <Button onClick={() => activeSection ? handleAddPage() : (setIsAddingSection(true), setNewTitle(''))} className="bg-white text-[#7719aa] font-black text-[10px] uppercase rounded-full px-4 h-9 shadow-lg">
              <Plus className="w-3.5 h-3.5 mr-1" /> {activeSection ? 'Page' : 'Section'}
            </Button>
          </header>
          
          <main className="flex-grow overflow-y-auto">
             {!activeSection ? (
               activeNotebook.sections?.map((s: any) => (
                 <div key={s.id} className="px-6 py-5 border-b border-slate-50 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setActiveSection(s)}>
                       <Layers className="w-5 h-5 text-[#7719aa] opacity-40" />
                       <div className="flex flex-col">
                         <span className="font-bold text-sm text-slate-700 uppercase leading-none">{s.title}</span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{s.pages?.length || 0} Pages</span>
                       </div>
                    </div>
                    {/* VIOLET PENCIL EDIT BUTTON */}
                    <Button variant="ghost" size="icon" onClick={() => { setSectionToRename(s); setNewTitle(s.title); }} className="text-[#7719aa] hover:bg-[#7719aa]/10 rounded-full h-10 w-10">
                       <Pencil className="w-4 h-4" />
                    </Button>
                 </div>
               ))
             ) : (
               activeSection.pages?.map((p: any) => (
                 <div key={p.id} onClick={() => setEditingPage(p)} className="px-6 py-4 border-b border-slate-50 flex items-center gap-4 active:bg-slate-50 cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-300" />
                    <span className="text-sm font-medium text-slate-600">{p.title}</span>
                 </div>
               ))
             )}
          </main>
        </div>
      )}

      {/* RENAME / ADD DIALOG */}
      <Dialog open={!!notebookToRename || !!sectionToRename || isAddingSection} onOpenChange={() => { setNotebookToRename(null); setSectionToRename(null); setIsAddingSection(false); }}>
        <DialogContent className="max-w-[320px] rounded-[32px] border-none p-6 shadow-2xl">
          <div className="flex flex-col items-center space-y-4">
            <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tighter">{isAddingSection ? 'New Section' : 'Rename'}</DialogTitle></DialogHeader>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none text-center font-bold" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()} />
            <div className="flex w-full gap-3">
              <Button variant="ghost" className="flex-1 rounded-2xl" onClick={() => { setNotebookToRename(null); setSectionToRename(null); setIsAddingSection(false); }}>Cancel</Button>
              <Button className="flex-1 rounded-2xl bg-[#7719aa]" onClick={handleSaveTitle} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAddingSection ? 'Add' : 'Update')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={!!notebookToDelete} onOpenChange={() => setNotebookToDelete(null)}>
        <DialogContent className="max-w-[320px] rounded-[32px] border-none p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <DialogTitle className="text-xl font-black uppercase mb-4">Delete Notebook?</DialogTitle>
          <div className="flex w-full gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setNotebookToDelete(null)}>No</Button>
            <Button variant="destructive" className="flex-1" onClick={handleConfirmDelete} disabled={isProcessing}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddNotebookDialog open={showAddNotebook} onOpenChange={setShowAddNotebook} userId={userId} onCreated={handleRefresh} />
    </div>
  )
}

function NotebookListItem({ nb, onClick, onDelete, onRename }: any) {
  return (
    <div onClick={onClick} className="flex items-center gap-4 px-6 py-4 bg-white active:bg-slate-50 border-b border-slate-50 transition-all cursor-pointer relative">
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ backgroundColor: nb.color || '#7719aa' }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-slate-50 border border-slate-100">{nb.emoji || '📓'}</div>
      <div className="flex-1">
        <h3 className="font-bold text-[13px] text-slate-800 uppercase truncate">{nb.title}</h3>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{nb.sections?.length || 0} SECTIONS</p>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-slate-200"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl p-1.5 min-w-[140px] border-none shadow-2xl">
            <DropdownMenuItem onClick={() => onRename(nb)} className="rounded-xl font-bold text-[10px] uppercase gap-2 py-3 cursor-pointer">Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(nb.id)} className="rounded-xl font-bold text-[10px] uppercase gap-2 py-3 text-red-500 cursor-pointer">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}