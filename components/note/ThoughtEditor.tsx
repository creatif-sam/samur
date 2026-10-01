'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  ChevronLeft, Trash2, Calendar, Clock,
  Bold, Italic, List, ListOrdered, Plus,
  CheckSquare, Underline as UnderlineIcon, Strikethrough, Share2,
  Highlighter, X, Copy, Undo2, Redo2, Heading2, Quote
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PLACEHOLDER_TITLES, type Page, type PagePatch } from './types'

const HIGHLIGHT_COLORS = [
  { label: 'Yellow',  value: '#fef08a' },
  { label: 'Green',   value: '#bbf7d0' },
  { label: 'Sky',     value: '#bae6fd' },
  { label: 'Pink',    value: '#fbcfe8' },
  { label: 'Purple',  value: '#e9d5ff' },
  { label: 'Orange',  value: '#fed7aa' },
]

const SAVE_DELAY_MS = 800

type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: 'Saved',
  unsaved: 'Editing…',
  saving: 'Saving…',
  error: 'Not saved',
}

type ThoughtEditorProps = {
  page: Pick<Page, 'id' | 'title' | 'content' | 'created_at'>
  /** Called after the page is saved; `isEmpty` is true when the page has no title and no content. */
  onBack: (opts: { isEmpty: boolean }) => void
  onSaved: (patch: PagePatch) => void
  /** Omit to hide the delete button. */
  onDeletePage?: () => void
}

export function ThoughtEditor({ page, onBack, onSaved, onDeletePage }: ThoughtEditorProps) {
  const [title, setTitle] = useState(page.title)
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [shareText, setShareText] = useState('')
  const [supabase] = useState(createClient)
  const editorAreaRef = useRef<HTMLDivElement>(null)

  // Latest values typed vs. last values confirmed by the database
  const latestRef = useRef({ title: page.title, content: page.content ?? '' })
  const savedRef = useRef({ ...latestRef.current })
  const saveTimerRef = useRef<number | null>(null)
  // Saves run one after another so an older save can never land after a newer one
  const saveChainRef = useRef<Promise<void>>(Promise.resolve())
  const deletedRef = useRef(false)
  // Keep the latest callback without making the save function change identity
  const onSavedRef = useRef(onSaved)
  useEffect(() => { onSavedRef.current = onSaved }, [onSaved])

  const isDirty = () =>
    latestRef.current.title !== savedRef.current.title ||
    latestRef.current.content !== savedRef.current.content

  const flushSave = useCallback((): Promise<void> => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    saveChainRef.current = saveChainRef.current.then(async () => {
      if (deletedRef.current || !isDirty()) return
      const snapshot = { ...latestRef.current }
      setStatus('saving')
      const updated_at = new Date().toISOString()
      const { error } = await supabase
        .from('pages')
        .update({ title: snapshot.title, content: snapshot.content, updated_at })
        .eq('id', page.id)
      if (error) {
        setStatus('error')
        return
      }
      savedRef.current = snapshot
      onSavedRef.current({ id: page.id, title: snapshot.title, content: snapshot.content, updated_at })
      setStatus(isDirty() ? 'unsaved' : 'saved')
    })
    return saveChainRef.current
  }, [page.id, supabase])

  const scheduleSave = useCallback(() => {
    setStatus('unsaved')
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => { void flushSave() }, SAVE_DELAY_MS)
  }, [flushSave])

  // --- TIPTAP CONFIGURATION ---
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'text-[#7719aa] dark:text-[#a78bfa] underline underline-offset-2 cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: page.content || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none max-w-none min-h-[500px] text-[16px] leading-[1.65] font-medium text-slate-700 dark:text-slate-300',
      },
    },
    onUpdate: ({ editor }) => {
      latestRef.current.content = editor.getHTML()
      scheduleSave()
    },
  })

  // Save straight away when the app is backgrounded or closed, and when leaving the editor
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flushSave() }
    const onPageHide = () => { void flushSave() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      void flushSave()
    }
  }, [flushSave])

  // --- SCROLL EDITOR INTO VIEW ON MOUNT ---
  useEffect(() => {
    if (editor && editorAreaRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        editorAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        editor.commands.focus('end') // Focus cursor at end of content
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [editor])

  function handleTitleChange(value: string) {
    setTitle(value)
    latestRef.current.title = value
    scheduleSave()
  }

  async function handleBack() {
    await flushSave()
    const isEmpty =
      PLACEHOLDER_TITLES.includes(latestRef.current.title.trim().toLowerCase()) &&
      (editor?.isEmpty ?? !latestRef.current.content)
    onBack({ isEmpty })
  }

  function handleDelete() {
    deletedRef.current = true
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    setShowDeleteConfirm(false)
    onDeletePage?.()
  }

  function htmlToPlainText(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent ?? div.innerText ?? ''
  }

  function shareAsText() {
    setShareText(htmlToPlainText(editor?.getHTML() ?? ''))
    setShowShareModal(true)
  }

  if (!editor) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] bg-white dark:bg-[#0f172a] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden font-poppins transition-colors duration-500"
      style={{ height: '100dvh' }}
    >

      {/* MOBILE HEADER - VIOLET THEME */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#7719aa] dark:bg-[#581c87] text-white shrink-0 shadow-lg">
        <Button variant="ghost" size="sm" onClick={handleBack} className="text-white font-medium uppercase text-[11px] tracking-widest hover:bg-white/10">
          <ChevronLeft className="w-5 h-5 mr-0.5" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <span className={cn('text-[9px] font-bold uppercase tracking-widest', status === 'error' ? 'text-red-200' : 'opacity-60')}>
            {STATUS_LABEL[status]}
          </span>
          {onDeletePage && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-white/60 hover:text-red-300 hover:bg-white/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-white hover:bg-white/10"
            onClick={shareAsText}
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={handleBack} className="h-8 px-4 bg-white text-[#7719aa] font-bold uppercase text-[10px] rounded-full shadow-sm active:scale-95">
            Done
          </Button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto bg-white dark:bg-[#0f172a] flex flex-col">
        {/* TITLE AREA */}
        <div className="px-6 py-8 space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Title"
            className="w-full text-2xl font-semibold tracking-tight bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-[#7719aa] dark:text-[#a78bfa] placeholder:text-slate-300 dark:placeholder:text-slate-700"
          />
          <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(page.created_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(page.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* WRITING AREA */}
        <div
          ref={editorAreaRef}
          className="flex-grow px-6 pb-20 cursor-text"
          onClick={() => editor.commands.focus()}
        >
          <EditorContent editor={editor} />
        </div>
      </main>

      {/* COLOR PICKER ROW — slides in when highlight button is tapped */}
      {showColorPicker && (
        <div className="flex items-center justify-around px-4 py-2 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-700 shrink-0">
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.value}
              onMouseDown={e => {
                e.preventDefault()
                editor.chain().focus().setHighlight({ color: c.value }).run()
                setShowColorPicker(false)
              }}
              className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-700 shadow-md active:scale-90 transition-transform"
              style={{ backgroundColor: c.value }}
              aria-label={c.label}
            />
          ))}
          {/* Remove highlight */}
          <button
            onMouseDown={e => {
              e.preventDefault()
              editor.chain().focus().unsetHighlight().run()
              setShowColorPicker(false)
            }}
            className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-400 active:scale-90 transition-transform"
            aria-label="Remove highlight"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* KEYBOARD TOOLBAR — sits right above the virtual keyboard, scrolls sideways on narrow screens */}
      <div className="flex items-center overflow-x-auto bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-700 shrink-0 [scrollbar-width:none]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ToolbarBtn label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={<Undo2 size={20} />} />
        <ToolbarBtn label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={<Redo2 size={20} />} />
        <ToolbarBtn label="New line" onClick={() => editor.chain().focus().insertContent('<p></p>').run()} icon={<Plus size={20} />} />
        <ToolbarBtn label="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={<Heading2 size={20} />} />
        <ToolbarBtn label="Checklist" onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} icon={<CheckSquare size={20} />} />
        <ToolbarBtn label="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={<List size={20} />} />
        <ToolbarBtn label="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={<ListOrdered size={20} />} />
        <ToolbarBtn label="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={<Quote size={20} />} />
        <ToolbarBtn label="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={<Strikethrough size={20} />} />
        <ToolbarBtn label="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={<Bold size={20} strokeWidth={2.5} />} />
        <ToolbarBtn label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={<Italic size={20} />} />
        <ToolbarBtn label="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon={<UnderlineIcon size={20} />} />
        <ToolbarBtn
          label="Highlight"
          onClick={() => setShowColorPicker(v => !v)}
          active={showColorPicker || editor.isActive('highlight')}
          icon={<Highlighter size={20} />}
        />
      </div>

      {/* DELETE CONFIRM SHEET */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full bg-white dark:bg-zinc-900 rounded-t-3xl overflow-hidden shadow-2xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
            </div>
            <div className="px-5 pt-3 pb-8 space-y-4">
              <h3 className="font-bold text-base text-center text-foreground">Delete this page?</h3>
              <p className="text-sm text-center text-muted-foreground">&quot;{title || 'Untitled'}&quot; will be deleted. You can undo for a few seconds.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-12 rounded-2xl border border-border bg-muted text-sm font-semibold text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="absolute inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full bg-white dark:bg-zinc-900 rounded-t-3xl overflow-hidden shadow-2xl">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
            </div>
            <div className="px-5 pt-3 pb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-base text-foreground">{title || 'Untitled'}</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <pre className="text-sm whitespace-pre-wrap bg-slate-50 dark:bg-zinc-800 rounded-2xl p-4 max-h-44 overflow-y-auto text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                {shareText || '(empty note)'}
              </pre>
            </div>
            <div className="flex gap-3 px-5 pb-8">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(`${title}\n\n${shareText}`)
                  toast.success('Copied to clipboard')
                  setShowShareModal(false)
                }}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl border border-border bg-muted text-sm font-semibold text-foreground"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({ title, text: `${title}\n\n${shareText}` })
                      setShowShareModal(false)
                    } catch { /* dismissed */ }
                  } else {
                    await navigator.clipboard.writeText(`${title}\n\n${shareText}`)
                    toast.success('Copied to clipboard')
                    setShowShareModal(false)
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-[#7719aa] hover:bg-[#6a1799] text-white text-sm font-semibold"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type ToolbarBtnProps = {
  label: string
  onClick: () => void
  icon: React.ReactNode
  active?: boolean
  disabled?: boolean
}

function ToolbarBtn({ label, onClick, active = false, icon, disabled }: ToolbarBtnProps) {
  return (
    <button
      aria-label={label}
      title={label}
      onMouseDown={e => { e.preventDefault(); if (!disabled) onClick() }}
      disabled={disabled}
      className={cn(
        'flex-1 min-w-11 shrink-0 flex items-center justify-center h-12 transition-colors',
        disabled
          ? 'text-gray-300 dark:text-zinc-600'
          : active
            ? 'text-[#7719aa] dark:text-[#a78bfa] bg-violet-50 dark:bg-violet-950/30'
            : 'text-gray-500 dark:text-zinc-400'
      )}
    >
      {icon}
    </button>
  )
}
