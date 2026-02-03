'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Toaster, toast } from 'sonner'
import { ThoughtBookHeader } from './ThoughtBookHeader'
import { NotebookLibrary } from './NotebookLibrary'
import { SectionList } from './SectionList'
import { PageList } from './PageList'
import { ThoughtEditor } from './ThoughtEditor'
import { AddNotebookDialog } from './AddNotebookDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react'

export function ThoughtBook({ notebooks, onRefresh, userId }: any) {
  const [activeNotebook, setActiveNotebook] = useState<any | null>(null)
  const [activeSection, setActiveSection] = useState<any | null>(null)
  const [editingPage, setEditingPage] = useState<any | null>(null)
  
  const [showAddNotebook, setShowAddNotebook] = useState(false)
  const [notebookToDelete, setNotebookToDelete] = useState<any | null>(null)
  const [sectionToDelete, setSectionToDelete] = useState<any | null>(null)
  const [pageToDelete, setPageToDelete] = useState<any | null>(null)
  const [itemToRename, setItemToRename] = useState<any | null>(null) 
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const supabase = createClient()

  // --- PERSISTENCE LOGIC (Fixes the Refresh Issue) ---
  useEffect(() => {
    setIsMounted(true)
    const savedNb = localStorage.getItem('active_notebook')
    const savedSect = localStorage.getItem('active_section')
    
    if (savedNb) setActiveNotebook(JSON.parse(savedNb))
    if (savedSect) setActiveSection(JSON.parse(savedSect))
  }, [])

  const handleSelectNotebook = (nb: any) => {
    setActiveNotebook(nb)
    localStorage.setItem('active_notebook', JSON.stringify(nb))
  }

  const handleSelectSection = (sect: any) => {
    setActiveSection(sect)
    localStorage.setItem('active_section', JSON.stringify(sect))
  }

  const handleClearNavigation = () => {
    setActiveSection(null)
    setActiveNotebook(null)
    localStorage.removeItem('active_notebook')
    localStorage.removeItem('active_section')
  }

  const handleRefresh = async () => {
    const result = await onRefresh();
    if (result?.data && activeNotebook) {
      const updated = result.data.find((n: any) => n.id === activeNotebook.id);
      if (updated) {
        setActiveNotebook(updated)
        localStorage.setItem('active_notebook', JSON.stringify(updated))
      }
    }
  };

  // --- LOGIC FUNCTIONS ---
  const handleCreateSection = async () => {
    if (!newTitle.trim()) return
    setIsProcessing(true)
    try {
      const { data, error } = await supabase.from('sections').insert({ 
        notebook_id: activeNotebook.id, title: newTitle 
      }).select().single()
      if (error) throw error
      setActiveNotebook((prev: any) => ({
        ...prev,
        sections: [...(prev.sections || []), { ...data, pages: [] }]
      }))
      toast.success("Section created")
      setIsAddingSection(false); setNewTitle(''); handleRefresh()
    } catch (err: any) { toast.error(err.message) }
    finally { setIsProcessing(false) }
  }

  const handleDeleteSection = async () => {
    if (!sectionToDelete) return
    setIsProcessing(true)
    try {
      const { error } = await supabase.from('sections').delete().eq('id', sectionToDelete.id)
      if (error) throw error
      setActiveNotebook((prev: any) => ({
        ...prev,
        sections: prev.sections.filter((s: any) => s.id !== sectionToDelete.id)
      }))
      toast.success("Section deleted")
      setSectionToDelete(null); handleRefresh()
    } catch (err: any) { toast.error("Failed to delete section") }
    finally { setIsProcessing(false) }
  }

  const handleUpdateItem = async () => {
    if (!newTitle.trim() || !itemToRename) return
    setIsProcessing(true)
    const table = itemToRename.notebook_id ? 'sections' : 'notebooks'
    try {
      const { error } = await supabase.from(table).update({ title: newTitle }).eq('id', itemToRename.id)
      if (error) throw error
      toast.success("Updated successfully")
      setItemToRename(null); setNewTitle(''); onRefresh(); handleRefresh()
    } catch (err: any) { toast.error("Update failed") }
    finally { setIsProcessing(false) }
  }

  const handleDeleteNotebook = async () => {
    if (!notebookToDelete) return
    setIsProcessing(true)
    try {
      const { error } = await supabase.from('notebooks').delete().eq('id', notebookToDelete.id)
      if (error) throw error
      toast.success("Notebook deleted")
      setNotebookToDelete(null); onRefresh()
    } catch (err: any) { toast.error(err.message) }
    finally { setIsProcessing(false) }
  }

  const handleDeletePage = async () => {
    if (!pageToDelete) return
    setIsProcessing(true)
    try {
      const { error } = await supabase.from('pages').delete().eq('id', pageToDelete.id)
      if (error) throw error
      const updatedSect = { ...activeSection, pages: activeSection.pages.filter((p: any) => p.id !== pageToDelete.id) }
      setActiveSection(updatedSect)
      toast.success("Page deleted"); setPageToDelete(null); handleRefresh()
    } catch (err: any) { toast.error("Failed to delete page") }
    finally { setIsProcessing(false) }
  }

  const handleAddPage = async () => {
    if (!activeSection) return
    setIsProcessing(true)
    try {
      const { data: newPage, error } = await supabase.from('pages').insert({ 
        section_id: activeSection.id, title: 'Untitled Page', content: '' 
      }).select().single()
      if (error) throw error
      setEditingPage(newPage); handleRefresh()
    } catch (err) { toast.error("Failed to create page") }
    finally { setIsProcessing(false) }
  }

  if (editingPage) return <ThoughtEditor page={editingPage} onBack={() => setEditingPage(null)} onRefresh={onRefresh} />

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f172a] max-w-2xl mx-auto flex flex-col font-poppins transition-colors duration-500 relative">
      {isMounted && <Toaster position="bottom-center" richColors theme="dark" />}

      <ThoughtBookHeader 
        activeNotebook={activeNotebook} 
        activeSection={activeSection} 
        isProcessing={isProcessing}
        onBack={() => activeSection ? (setActiveSection(null), localStorage.removeItem('active_section')) : handleClearNavigation()}
        onAdd={() => activeSection ? handleAddPage() : (setIsAddingSection(true), setNewTitle(''))}
      />

      {!activeNotebook ? (
        <NotebookLibrary 
          notebooks={notebooks} 
          onSelect={handleSelectNotebook} 
          onAdd={() => setShowAddNotebook(true)} 
          onDelete={setNotebookToDelete}
          onRename={(nb: any) => { setItemToRename(nb); setNewTitle(nb.title); }}
        />
      ) : !activeSection ? (
        <SectionList 
          notebook={activeNotebook} 
          onSelect={handleSelectSection} 
          onDeleteSection={setSectionToDelete}
          onRenameSection={(s: any) => { setItemToRename(s); setNewTitle(s.title); }}
        />
      ) : (
        <PageList 
          section={activeSection} 
          onSelect={setEditingPage} 
          onDeletePage={setPageToDelete} 
        />
      )}

      {/* DIALOGS REMAIN THE SAME AS PREVIOUS TURN */}
      <Dialog open={!!notebookToDelete} onOpenChange={() => setNotebookToDelete(null)}>
        <DialogContent className="max-w-[340px] rounded-[32px] p-8 text-center bg-white dark:bg-slate-950 border-none shadow-2xl">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-500 w-8 h-8" />
          </div>
          <DialogTitle className="text-xl font-semibold dark:text-white">Delete Notebook?</DialogTitle>
          <DialogDescription className="text-slate-500 mt-2">"{notebookToDelete?.title}" will be lost forever.</DialogDescription>
          <DialogFooter className="flex gap-2 mt-6 sm:justify-center">
            <Button variant="ghost" onClick={() => setNotebookToDelete(null)} className="rounded-full flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteNotebook} disabled={isProcessing} className="rounded-full flex-1">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sectionToDelete} onOpenChange={() => setSectionToDelete(null)}>
        <DialogContent className="max-w-[340px] rounded-[32px] p-8 text-center bg-white dark:bg-slate-950 border-none shadow-2xl">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="text-red-500 w-8 h-8" />
          </div>
          <DialogTitle className="text-xl font-semibold dark:text-white">Delete Section?</DialogTitle>
          <DialogDescription className="text-slate-500 mt-2 text-xs">All content inside will be removed.</DialogDescription>
          <div className="flex gap-2 mt-6">
            <Button variant="ghost" onClick={() => setSectionToDelete(null)} className="rounded-full flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSection} disabled={isProcessing} className="rounded-full flex-1">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pageToDelete} onOpenChange={() => setPageToDelete(null)}>
        <DialogContent className="max-w-[340px] rounded-[32px] p-8 text-center bg-white dark:bg-slate-950 border-none shadow-2xl">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="text-red-500 w-8 h-8" />
          </div>
          <DialogTitle className="text-xl font-semibold dark:text-white">Delete Page?</DialogTitle>
          <DialogDescription className="text-slate-500 mt-2">Permanently remove this note?</DialogDescription>
          <DialogFooter className="flex gap-2 mt-6">
            <Button variant="ghost" onClick={() => setPageToDelete(null)} className="rounded-full flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePage} disabled={isProcessing} className="rounded-full flex-1">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!itemToRename} onOpenChange={() => setItemToRename(null)}>
        <DialogContent className="max-w-[340px] rounded-[32px] bg-white dark:bg-slate-950 p-8 border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-semibold uppercase text-center dark:text-white tracking-tight">Rename</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center space-y-6 pt-2">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none text-center font-medium dark:text-white" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleUpdateItem()} />
            <Button className="w-full rounded-full h-11 bg-[#7719aa] dark:bg-[#7c3aed]" onClick={handleUpdateItem} disabled={isProcessing}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingSection} onOpenChange={setIsAddingSection}>
        <DialogContent className="max-w-[340px] rounded-[32px] bg-white dark:bg-slate-950 p-8 border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-semibold uppercase text-center dark:text-white tracking-tight">New Section</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center space-y-6 pt-2">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none text-center font-medium dark:text-white" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleCreateSection()} />
            <Button className="w-full rounded-full h-11 bg-[#7719aa] dark:bg-[#7c3aed]" onClick={handleCreateSection} disabled={isProcessing}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddNotebookDialog open={showAddNotebook} onOpenChange={setShowAddNotebook} userId={userId} onCreated={handleRefresh} />
    </div>
  )
}