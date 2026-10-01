'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ThoughtBookHeader } from './ThoughtBookHeader'
import { NotebookLibrary } from './NotebookLibrary'
import { SectionList } from './SectionList'
import { PageList } from './PageList'
import { ThoughtEditor } from './ThoughtEditor'
import { AddNotebookDialog } from './AddNotebookDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, FolderInput, ChevronRight, X } from 'lucide-react'
import { MAX_PINNED_NOTEBOOKS, type Notebook, type Page, type PagePatch, type Section } from './types'

const ACTIVE_NOTEBOOK_KEY = 'active_notebook_id'
const ACTIVE_SECTION_KEY = 'active_section_id'
// Pins used to live only in this browser; they are moved to the database once
const LEGACY_PINNED_KEY = 'pinned_notebook_ids'
const UNDO_WINDOW_MS = 5000

type ThoughtBookProps = {
  notebooks: Notebook[]
  onRefresh: () => Promise<void>
  onPagePatched: (patch: PagePatch) => void
  userId: string | null
}

type DeletableTable = 'notebooks' | 'sections' | 'pages'

function storageGet(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
function storageSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch { /* storage unavailable */ }
}

export function ThoughtBook({ notebooks, onRefresh, onPagePatched, userId }: ThoughtBookProps) {
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [navigationSource, setNavigationSource] = useState<'recent' | 'normal'>('normal')
  // Items deleted but still inside the undo window
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  const [showAddNotebook, setShowAddNotebook] = useState(false)
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null)
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null)
  const [itemToRename, setItemToRename] = useState<Notebook | Section | null>(null)
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // --- Recent page long-press action state ---
  const [recentPageAction, setRecentPageAction] = useState<{ page: Page; section: Section; notebook: Notebook } | null>(null)
  const [moveStep, setMoveStep] = useState<'pick-notebook' | 'pick-section' | null>(null)
  const [moveTargetNotebook, setMoveTargetNotebook] = useState<Notebook | null>(null)

  const [supabase] = useState(createClient)
  const legacyPinsMigrated = useRef(false)

  // Restore where the user was after a reload
  useEffect(() => {
    setActiveNotebookId(storageGet(ACTIVE_NOTEBOOK_KEY))
    setActiveSectionId(storageGet(ACTIVE_SECTION_KEY))
    // Old keys stored whole objects that went stale
    storageSet('active_notebook', null)
    storageSet('active_section', null)
  }, [])

  // Hide anything waiting to be deleted
  const visibleNotebooks = useMemo(
    () => notebooks
      .filter(nb => !hiddenIds.has(nb.id))
      .map(nb => ({
        ...nb,
        sections: (nb.sections ?? [])
          .filter(s => !hiddenIds.has(s.id))
          .map(s => ({ ...s, pages: (s.pages ?? []).filter(p => !hiddenIds.has(p.id)) })),
      })),
    [notebooks, hiddenIds]
  )

  const activeNotebook = visibleNotebooks.find(nb => nb.id === activeNotebookId) ?? null
  const activeSection = activeNotebook?.sections.find(s => s.id === activeSectionId) ?? null

  // Move pins saved in this browser to the account, once
  useEffect(() => {
    if (legacyPinsMigrated.current || notebooks.length === 0) return
    legacyPinsMigrated.current = true
    const raw = storageGet(LEGACY_PINNED_KEY)
    if (!raw) return
    let ids: string[] = []
    try { ids = JSON.parse(raw) } catch { storageSet(LEGACY_PINNED_KEY, null); return }
    const known = new Set(notebooks.map(nb => nb.id))
    ids = ids.filter(id => known.has(id)).slice(0, MAX_PINNED_NOTEBOOKS)
    if (ids.length === 0 || notebooks.some(nb => nb.pinned)) {
      storageSet(LEGACY_PINNED_KEY, null)
      return
    }
    void (async () => {
      const { error } = await supabase.from('notebooks').update({ pinned: true }).in('id', ids)
      if (error) return // keep the old pins until the database supports them
      storageSet(LEGACY_PINNED_KEY, null)
      await onRefresh()
    })()
  }, [notebooks, supabase, onRefresh])

  const handleSelectNotebook = (nb: Notebook) => {
    setActiveNotebookId(nb.id)
    storageSet(ACTIVE_NOTEBOOK_KEY, nb.id)
  }

  const handleSelectSection = (sect: Section) => {
    setActiveSectionId(sect.id)
    storageSet(ACTIVE_SECTION_KEY, sect.id)
  }

  const handleLeaveSection = () => {
    setActiveSectionId(null)
    storageSet(ACTIVE_SECTION_KEY, null)
  }

  const handleClearNavigation = () => {
    handleLeaveSection()
    setActiveNotebookId(null)
    storageSet(ACTIVE_NOTEBOOK_KEY, null)
  }

  const hide = (id: string) => setHiddenIds(prev => new Set(prev).add(id))
  const unhide = (id: string) => setHiddenIds(prev => {
    const next = new Set(prev)
    next.delete(id)
    return next
  })

  // Hide the item now and only delete it once the undo window has passed
  const deleteWithUndo = (table: DeletableTable, id: string, label: string) => {
    hide(id)
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) toast.error(`Failed to delete ${label.toLowerCase()}`)
      else await onRefresh()
      unhide(id)
    }, UNDO_WINDOW_MS)
    toast(`${label} deleted`, {
      duration: UNDO_WINDOW_MS,
      action: {
        label: 'Undo',
        onClick: () => {
          window.clearTimeout(timer)
          unhide(id)
        },
      },
    })
  }

  // --- LOGIC FUNCTIONS ---
  const handleCreateSection = async () => {
    if (!newTitle.trim() || !activeNotebook) return
    setIsProcessing(true)
    try {
      const { error } = await supabase.from('sections').insert({
        notebook_id: activeNotebook.id, title: newTitle.trim()
      })
      if (error) throw error
      await onRefresh()
      toast.success("Section created")
      setIsAddingSection(false); setNewTitle('')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to create section') }
    finally { setIsProcessing(false) }
  }

  const handleUpdateItem = async () => {
    if (!newTitle.trim() || !itemToRename) return
    setIsProcessing(true)
    const table = 'notebook_id' in itemToRename ? 'sections' : 'notebooks'
    try {
      const { error } = await supabase.from(table).update({ title: newTitle.trim() }).eq('id', itemToRename.id)
      if (error) throw error
      await onRefresh()
      toast.success("Updated successfully")
      setItemToRename(null); setNewTitle('')
    } catch { toast.error("Update failed") }
    finally { setIsProcessing(false) }
  }

  const handleDeleteNotebook = () => {
    if (!notebookToDelete) return
    deleteWithUndo('notebooks', notebookToDelete.id, 'Notebook')
    setNotebookToDelete(null)
  }

  const handleDeleteSection = () => {
    if (!sectionToDelete) return
    deleteWithUndo('sections', sectionToDelete.id, 'Section')
    setSectionToDelete(null)
  }

  const handleDeleteRecentPage = () => {
    if (!recentPageAction) return
    deleteWithUndo('pages', recentPageAction.page.id, 'Note')
    setRecentPageAction(null)
  }

  const handleTogglePin = async (nb: Notebook) => {
    const pinnedCount = notebooks.filter(n => n.pinned).length
    if (!nb.pinned && pinnedCount >= MAX_PINNED_NOTEBOOKS) {
      toast.error(`You can pin up to ${MAX_PINNED_NOTEBOOKS} notebooks`)
      return
    }
    const { error } = await supabase.from('notebooks').update({ pinned: !nb.pinned }).eq('id', nb.id)
    if (error) { toast.error('Failed to update pin'); return }
    await onRefresh()
  }

  const handleMovePageToSection = async (targetSection: Section) => {
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
    if (isProcessing || !userId) return
    setIsProcessing(true)
    try {
      // Find or create "General" notebook
      let generalNotebook = notebooks.find(nb => nb.title.toLowerCase() === 'general')

      if (!generalNotebook) {
        const { data: newNb, error: nbError } = await supabase
          .from('notebooks')
          .insert({ user_id: userId, title: 'General', emoji: '📝', color: '#7719aa' })
          .select().single()
        if (nbError) throw nbError
        generalNotebook = { ...newNb, sections: [] } as Notebook
      }

      // Find or create "Notes" section
      let notesSection = generalNotebook.sections?.find(s => s.title.toLowerCase() === 'notes')

      if (!notesSection) {
        const { data: newSect, error: sectError } = await supabase
          .from('sections')
          .insert({ notebook_id: generalNotebook.id, title: 'Notes' })
          .select().single()
        if (sectError) throw sectError
        notesSection = { ...newSect, pages: [] } as Section
      }

      // Create blank page
      const { data: newPage, error: pageError } = await supabase
        .from('pages')
        .insert({ section_id: notesSection.id, title: '', content: '' })
        .select().single()
      if (pageError) throw pageError

      handleSelectNotebook(generalNotebook)
      handleSelectSection(notesSection)
      setNavigationSource('recent')
      setEditingPage(newPage as Page)
      await onRefresh()
    } catch {
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
        section_id: activeSection.id, title: '', content: ''
      }).select().single()
      if (error) throw error
      setNavigationSource('normal')
      setEditingPage(newPage as Page)
      await onRefresh()
    } catch {
      toast.error("Failed to create page")
    }
    finally { setIsProcessing(false) }
  }

  if (editingPage) {
    const closeEditor = () => {
      if (navigationSource === 'recent') {
        handleClearNavigation()
        setNavigationSource('normal')
      }
      setEditingPage(null)
    }

    const handleEditorBack = async ({ isEmpty }: { isEmpty: boolean }) => {
      const pageId = editingPage.id
      closeEditor()
      // Don't leave blank "Untitled" pages behind
      if (isEmpty) {
        hide(pageId)
        const { error } = await supabase.from('pages').delete().eq('id', pageId)
        if (!error) await onRefresh()
        unhide(pageId)
      }
    }

    const handleEditorDeletePage = () => {
      deleteWithUndo('pages', editingPage.id, 'Page')
      closeEditor()
    }

    return <ThoughtEditor
      key={editingPage.id}
      page={editingPage}
      onBack={handleEditorBack}
      onSaved={onPagePatched}
      onDeletePage={handleEditorDeletePage}
    />
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f172a] max-w-2xl mx-auto flex flex-col font-poppins transition-colors duration-500 relative">
      <ThoughtBookHeader
        activeNotebook={activeNotebook}
        activeSection={activeSection}
        isProcessing={isProcessing}
        onBack={() => activeSection ? handleLeaveSection() : handleClearNavigation()}
        onAdd={() => activeSection ? handleAddPage() : (setIsAddingSection(true), setNewTitle(''))}
      />

      {!activeNotebook ? (
        <NotebookLibrary
          notebooks={visibleNotebooks}
          onSelect={handleSelectNotebook}
          onAdd={() => setShowAddNotebook(true)}
          onQuickAdd={handleQuickAddNote}
          onDelete={setNotebookToDelete}
          onRename={(nb) => { setItemToRename(nb); setNewTitle(nb.title); }}
          onTogglePin={handleTogglePin}
          onSelectPage={(page, section, notebook) => {
            // Navigate directly to the page editor from recent view
            handleSelectNotebook(notebook)
            handleSelectSection(section)
            setEditingPage(page)
            setNavigationSource('recent') // Track that this was opened from recent view
          }}
          onLongPressPage={(page, section, notebook) => {
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
          onRenameSection={(s) => { setItemToRename(s); setNewTitle(s.title); }}
        />
      ) : (
        <PageList
          section={activeSection}
          onSelect={(page) => { setNavigationSource('normal'); setEditingPage(page) }}
          onDeletePage={(page) => deleteWithUndo('pages', page.id, 'Note')}
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
              {visibleNotebooks.map(nb => (
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
              {(moveTargetNotebook.sections ?? []).map(sec => (
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

      <Dialog open={!!notebookToDelete} onOpenChange={() => setNotebookToDelete(null)}>
        <DialogContent className="max-w-[340px] rounded-[32px] p-8 text-center bg-white dark:bg-slate-950 border-none shadow-2xl">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-500 w-8 h-8" />
          </div>
          <DialogTitle className="text-xl font-semibold dark:text-white">Delete Notebook?</DialogTitle>
          <DialogDescription className="text-slate-500 mt-2">&quot;{notebookToDelete?.title}&quot; and everything in it will be deleted. You can undo for a few seconds.</DialogDescription>
          <DialogFooter className="flex gap-2 mt-6 sm:justify-center">
            <Button variant="ghost" onClick={() => setNotebookToDelete(null)} className="rounded-full flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteNotebook} className="rounded-full flex-1">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sectionToDelete} onOpenChange={() => setSectionToDelete(null)}>
        <DialogContent className="max-w-[340px] rounded-[32px] p-8 text-center bg-white dark:bg-slate-950 border-none shadow-2xl">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="text-red-500 w-8 h-8" />
          </div>
          <DialogTitle className="text-xl font-semibold dark:text-white">Delete Section?</DialogTitle>
          <DialogDescription className="text-slate-500 mt-2 text-xs">All pages inside will be deleted. You can undo for a few seconds.</DialogDescription>
          <div className="flex gap-2 mt-6">
            <Button variant="ghost" onClick={() => setSectionToDelete(null)} className="rounded-full flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSection} className="rounded-full flex-1">Delete</Button>
          </div>
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

      <AddNotebookDialog open={showAddNotebook} onOpenChange={setShowAddNotebook} userId={userId} onCreated={onRefresh} />
    </div>
  )
}
