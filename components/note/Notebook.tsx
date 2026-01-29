'use client'

import { useState, useMemo } from 'react'
import { Plus, Folder, ChevronRight, MoreVertical, Loader2, Book, FileText, ChevronLeft, Search, Pin, PinOff, Edit2, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { ThoughtEditor } from './ThoughtEditor'
import { AddNotebookDialog } from './AddNotebookDialog'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"

type Page = { id: string; title: string; content: any; updated_at: string }
type Section = { id: string; title: string; pages: Page[] }
type Notebook = { id: string; title: string; emoji: string; color: string; sections: Section[] }

interface ThoughtBookProps {
  notebooks: Notebook[]
  onRefresh: () => Promise<void>
  userId: string
}

export function ThoughtBook({ notebooks, onRefresh, userId }: ThoughtBookProps) {
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null)
  const [activeSection, setActiveSection] = useState<Section | null>(null)
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [showAddNotebook, setShowAddNotebook] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // New States for Search, Pinning, and Renaming
  const [searchQuery, setSearchQuery] = useState('')
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [renamingSection, setRenamingSection] = useState<Section | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const { pinnedNotebooks, otherNotebooks } = useMemo(() => {
    const filtered = notebooks.filter(nb => 
      nb.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const sorted = [...filtered].sort((a, b) => a.title.localeCompare(b.title))
    return {
      pinnedNotebooks: sorted.filter(nb => pinnedIds.includes(nb.id)),
      otherNotebooks: sorted.filter(nb => !pinnedIds.includes(nb.id))
    }
  }, [notebooks, searchQuery, pinnedIds])

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setPinnedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // --- ACTIONS ---

  async function handleRenameSubmit() {
    if (!renamingSection || !editTitle.trim()) return
    const supabase = createClient()
    const { error } = await supabase
      .from('sections')
      .update({ title: editTitle })
      .eq('id', renamingSection.id)

    if (!error) {
      await onRefresh()
      toast.success('Section renamed')
      setRenamingSection(null)
    } else {
      toast.error('Failed to rename section')
    }
  }

  async function handleDeleteSection() {
    if (!renamingSection) return
    const confirmDelete = window.confirm("Are you sure? This will delete all pages in this section.")
    if (!confirmDelete) return

    const supabase = createClient()
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', renamingSection.id)

    if (!error) {
      await onRefresh()
      toast.success('Section deleted')
      setRenamingSection(null)
    }
  }

  async function handleAddLevel() {
    if (isCreating) return
    setIsCreating(true)
    const supabase = createClient()

    if (activeSection) {
      const { data, error } = await supabase
        .from('pages')
        .insert({
          section_id: activeSection.id,
          title: 'Untitled Page',
          content: ''
        })
        .select()
        .single()

      if (!error && data) {
        await onRefresh()
        toast.success('Page added')
        setEditingPage(data)
      }
    } else if (activeNotebook) {
      const { error } = await supabase
        .from('sections')
        .insert({
          notebook_id: activeNotebook.id,
          title: 'New Section'
        })

      if (!error) {
        await onRefresh()
        toast.success('New section created')
      }
    }
    setIsCreating(false)
  }

  // --- RENDERING ---

  if (editingPage) {
    return (
      <ThoughtEditor 
        page={editingPage} 
        onBack={() => setEditingPage(null)} 
        onRefresh={onRefresh} 
      />
    )
  }

  if (!activeNotebook) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Notebook Library</h2>
            <p className="text-xs text-muted-foreground">Select a notebook to begin</p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-8 h-8 text-xs" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => setShowAddNotebook(true)}
              size="sm"
              className="rounded-full gap-2 px-4 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" /> New Notebook
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {pinnedNotebooks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Pin className="w-3 h-3 fill-current" /> Pinned
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotebooks.map((nb) => (
                  <NotebookCard key={nb.id} nb={nb} isPinned={true} onPin={togglePin} onClick={() => setActiveNotebook(nb)} />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {pinnedNotebooks.length > 0 && (
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Library</h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
              {otherNotebooks.map((nb) => (
                <NotebookCard key={nb.id} nb={nb} isPinned={false} onPin={togglePin} onClick={() => setActiveNotebook(nb)} />
              ))}
            </div>
          </div>
        </div>

        <AddNotebookDialog 
          open={showAddNotebook} 
          onOpenChange={setShowAddNotebook} 
          userId={userId} 
          onCreated={onRefresh} 
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background animate-in slide-in-from-right-4 duration-300">
      <header className="py-4 border-b flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => activeSection ? setActiveSection(null) : setActiveNotebook(null)}
            className="h-8 w-8 rounded-md"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeNotebook.emoji}</span>
            <h2 className="text-lg font-bold tracking-tight truncate max-w-[200px]">
              {activeSection ? activeSection.title : activeNotebook.title}
            </h2>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddLevel}
          disabled={isCreating}
          className="h-8 text-xs font-medium rounded-md gap-2"
        >
          {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add {activeSection ? 'Page' : 'Section'}
        </Button>
      </header>

      <div className="flex-grow overflow-y-auto py-4 space-y-1">
        {!activeSection ? (
          activeNotebook.sections?.map((s) => (
            <div key={s.id} className="group relative flex items-center">
              <button 
                onClick={() => setActiveSection(s)} 
                className="w-full flex items-center justify-between p-3 px-4 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-4 h-4 text-primary/70" />
                  <span className="text-sm font-medium">{s.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono mr-6">{s.pages?.length || 0}</span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingSection(s);
                  setEditTitle(s.title);
                }}
                className="absolute right-10 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>
          ))
        ) : (
          activeSection.pages?.map((p) => (
            <div
              key={p.id}
              onClick={() => setEditingPage(p)}
              className="flex items-center justify-between p-3 px-4 rounded-lg bg-card border border-transparent hover:border-border hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">{p.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    Last sync: {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
        
        {((!activeSection && activeNotebook.sections?.length === 0) || (activeSection && activeSection.pages?.length === 0)) && (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3 opacity-40">
            <Book className="w-8 h-8" />
            <p className="text-sm font-medium italic">This space is currently blank</p>
          </div>
        )}
      </div>

      {/* RENAME & SETTINGS DIALOG */}
      <Dialog open={!!renamingSection} onOpenChange={() => setRenamingSection(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Section Settings</DialogTitle>
            <DialogDescription>
              Rename your section or delete it entirely.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
              <Input 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-between sm:justify-between items-center w-full">
            <Button variant="destructive" size="sm" onClick={handleDeleteSection} className="gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRenamingSection(null)}>Cancel</Button>
              <Button size="sm" onClick={handleRenameSubmit}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NotebookCard({ nb, isPinned, onPin, onClick }: { nb: Notebook, isPinned: boolean, onPin: any, onClick: any }) {
  return (
    <Card
      onClick={onClick}
      className="relative hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group border-muted bg-card/50"
    >
      <CardContent className="p-6 flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white/20"
          style={{ backgroundColor: nb.color + '20' }}
        >
          {nb.emoji}
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="font-semibold text-sm truncate pr-4">{nb.title}</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            {nb.sections?.length || 0} Sections
          </p>
        </div>
        <button 
          onClick={(e) => onPin(e, nb.id)}
          className={`p-1.5 rounded-md transition-all ${isPinned ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-muted'}`}
        >
          {isPinned ? <PinOff className="w-3.5 h-3.5 fill-current" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
      </CardContent>
    </Card>
  )
}