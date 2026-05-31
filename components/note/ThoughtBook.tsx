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
import { Loader2, AlertTriangle, Trash2, FolderInput, ChevronRight, X } from 'lucide-react'

export function ThoughtBook({ notebooks, onRefresh, userId }: any) {
  const [activeNotebook, setActiveNotebook] = useState<any | null>(null)
  const [activeSection, setActiveSection] = useState<any | null>(null)
  const [editingPage, setEditingPage] = useState<any | null>(null)
  const [navigationSource, setNavigationSource] = useState<'recent' | 'normal'>('normal')
  
  const [showAddNotebook, setShowAddNotebook] = useState(false)
  const [notebookToDelete, setNotebookToDelete] = useState<any | null>(null)
  const [sectionToDelete, setSectionToDelete] = useState<any | null>(null)
  const [pageToDelete, setPageToDelete] = useState<any | null>(null)
  const [itemToRename, setItemToRename] = useState<any | null>(null) 
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // --- Recent page long-press action state ---
  const [recentPageAction, setRecentPageAction] = useState<{ page: any; section: any; notebook: any } | null>(null)
  const [moveStep, setMoveStep] = useState<'pick-notebook' | 'pick-section' | null>(null)
  const [moveTargetNotebook, setMoveTargetNotebook] = useState<any | null>(null)

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

  const handleDeleteRecentPage = async () => {
    if (!recentPageAction) return
    setIsProcessing(true)
    try {
      const { error } = await supabase.from('pages').delete().eq('id', recentPageAction.page.id)
      if (error) throw error
      toast.success('Note deleted')
      setRecentPageAction(null)
      await onRefresh()
    } catch {
      toast.error('Failed to delete note')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMovePageToSection = async (targetSection: any) => {
    if (!recentPageAction) return
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('pages')
        .update({ section_id: targetSection.id })
        .eq('id', recentPageAction.page.id)
      if (error) throw error
      toast.success(`Moved to "${moveTargetNotebook?.title} › ${targetSection.title}"`)
      setRecentPageAction(null)
      setMoveStep(null)
      setMoveTargetNotebook(null)
      await onRefresh()
    } catch {
      toast.error('Failed to move note')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleQuickAddNote = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      // Find or create "General" notebook
      let generalNotebook = notebooks.find((nb: any) => nb.title.toLowerCase() === 'general')

      if (!generalNotebook) {
        const { data: newNb, error: nbError } = await supabase
          .from('notebooks')
          .insert({ user_id: userId, title: 'General', emoji: '📝', color: '#7719aa' })
          .select().single()
        if (nbError) throw nbError
        generalNotebook = { ...newNb, sections: [] }
      }

      // Find or create "Notes" section
      let notesSection = generalNotebook.sections?.find((s: any) => s.title.toLowerCase() === 'notes')

      if (!notesSection) {
        const { data: newSect, error: sectError } = await supabase
          .from('sections')
          .insert({ notebook_id: generalNotebook.id, title: 'Notes' })
          .select().single()
        if (sectError) throw sectError
        notesSection = { ...newSect, pages: [] }
      }

      // Create blank page
      const { data: newPage, error: pageError } = await supabase
        .from('pages')
        .insert({ section_id: notesSection.id, title: 'Untitled', content: '' })
        .select().single()
      if (pageError) throw pageError

      handleSelectNotebook(generalNotebook)
      handleSelectSection(notesSection)
      setNavigationSource('recent')
      setTimeout(() => setEditingPage(newPage), 100)
      await onRefresh()
      toast.success('Note created in General')
    } catch (err: any) {
      toast.error('Failed to create note')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAddPage = async () => {
    if (!activeSection) return
    setIsProcessing(true)
    try {
      const { data: newPage, error } = await supabase.from('pages').insert({ 
        section_id: activeSection.id, title: 'Untitled Page', content: '' 
      }).select().single()
      if (error) throw error
      
      // Immediately update activeSection to show the new page
      const updatedSection = {
        ...activeSection,
        pages: [...(activeSection.pages || []), newPage]
      }
      setActiveSection(updatedSection)
      localStorage.setItem('active_section', JSON.stringify(updatedSection))
      
      toast.success('Page created!')
      // Open the editor after a brief moment to let the UI update
      setTimeout(() => setEditingPage(newPage), 100)
      handleRefresh()
    } catch (err) { 
      toast.error("Failed to create page") 
    }
    finally { setIsProcessing(false) }
  }

  if (editingPage) {
    const goBack = () => {
      if (navigationSource === 'recent') {
        handleClearNavigation()
        setEditingPage(null)
        setNavigationSource('normal')
      } else {
        setEditingPage(null)
      }
    }

    const handleEditorDeletePage = async () => {
      const { error } = await supabase.from('pages').delete().eq('id', editingPage.id)
      if (error) { toast.error('Failed to delete page'); return }
      toast.success('Page deleted')
      if (activeSection) {
        setActiveSection((prev: any) => prev
          ? { ...prev, pages: prev.pages.filter((p: any) => p.id !== editingPage.id) }
          : prev
        )
      }
      await onRefresh()
      goBack()
    }

    return <ThoughtEditor
      page={editingPage}
      onBack={goBack}
      onRefresh={onRefresh}
      onDeletePage={handleEditorDeletePage}
    />
  }

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
          onQuickAdd={handleQuickAddNote}
          onDelete={setNotebookToDelete}
          onRename={(nb: any) => { setItemToRename(nb); setNewTitle(nb.title); }}
          onSelectPage={(page: any, section: any, notebook: any) => {
            // Navigate directly to the page editor from recent view
            handleSelectNotebook(notebook)
            handleSelectSection(section)
            setEditingPage(page)
            setNavigationSource('recent') // Track that this was opened from recent view
          }}
          onLongPressPage={(page: any, section: any, notebook: any) => {
            setRecentPageAction({ page, section, notebook })
            setMoveStep(null)
            setMoveTargetNotebook(null)
          }}
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

      {/* ── Recent page long-press action sheet ── */}
      {recentPageAction && !moveStep && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setRecentPageAction(null)}>
          <div className="w-full max-w-lg bg-white dark:bg-zinc-950 rounded-t-[32px] border-t border-border p-5 pb-10 space-y-3 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center truncate px-4">
              {recentPageAction.page.title || 'Untitled'}
            </p>
            <button
              onClick={() => setMoveStep('pick-notebook')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <FolderInput className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-white flex-1">Move to notebook…</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={handleDeleteRecentPage}
              disabled={isProcessing}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-red-500" />
              </div>
              <span className="font-semibold text-sm text-red-500 flex-1">Delete note</span>
            </button>
            <button onClick={() => setRecentPageAction(null)} className="w-full py-3 rounded-2xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Move: pick notebook ── */}
      {recentPageAction && moveStep === 'pick-notebook' && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setMoveStep(null); setRecentPageAction(null) }}>
          <div className="w-full max-w-lg bg-white dark:bg-zinc-950 rounded-t-[32px] border-t border-border p-5 pb-10 space-y-2 animate-in slide-in-from-bottom duration-300 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-1 shrink-0" />
            <div className="flex items-center gap-2 px-1 shrink-0">
              <button onClick={() => setMoveStep(null)} className="p-1 rounded-full hover:bg-muted transition">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Choose notebook</p>
            </div>
            <div className="overflow-y-auto flex-1 space-y-1 pt-1">
              {notebooks.map((nb: any) => (
                <button
                  key={nb.id}
                  onClick={() => { setMoveTargetNotebook(nb); setMoveStep('pick-section') }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors text-left"
                >
                  <span className="text-xl">{nb.emoji || '📓'}</span>
                  <span className="flex-1 font-semibold text-sm text-slate-800 dark:text-white truncate">{nb.title}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Move: pick section ── */}
      {recentPageAction && moveStep === 'pick-section' && moveTargetNotebook && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setMoveStep(null); setRecentPageAction(null) }}>
          <div className="w-full max-w-lg bg-white dark:bg-zinc-950 rounded-t-[32px] border-t border-border p-5 pb-10 space-y-2 animate-in slide-in-from-bottom duration-300 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-1 shrink-0" />
            <div className="flex items-center gap-2 px-1 shrink-0">
              <button onClick={() => setMoveStep('pick-notebook')} className="p-1 rounded-full hover:bg-muted transition">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                {moveTargetNotebook.emoji} {moveTargetNotebook.title} — pick section
              </p>
            </div>
            <div className="overflow-y-auto flex-1 space-y-1 pt-1">
              {(moveTargetNotebook.sections ?? []).length === 0 && (
                <p className="text-sm text-center text-slate-400 py-8">No sections in this notebook.</p>
              )}
              {(moveTargetNotebook.sections ?? []).map((sec: any) => (
                <button
                  key={sec.id}
                  onClick={() => handleMovePageToSection(sec)}
                  disabled={isProcessing}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                  <span className="flex-1 font-semibold text-sm text-slate-800 dark:text-white truncate">{sec.title}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
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