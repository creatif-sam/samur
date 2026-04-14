'use client'

import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { 
  ChevronLeft, Trash2, Calendar, Clock, 
  Bold, Italic, List, ListOrdered, Heading2, Plus, 
  CheckSquare, Underline as UnderlineIcon, Type
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function ThoughtEditor({ page, onBack, onRefresh }: any) {
  const [title, setTitle] = useState(page.title)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()
  const editorAreaRef = useRef<HTMLDivElement>(null)

  // --- TIPTAP CONFIGURATION ---
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: page.content || '',
    immediatelyRender: false, 
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none max-w-none min-h-[500px] text-[16px] leading-[2.25rem] font-medium text-slate-700 dark:text-slate-300',
      },
    },
    onUpdate: ({ editor }) => {
      // Trigger save whenever the editor content changes
      handleAutoSave(title, editor.getHTML())
    },
  })

  // --- DEBOUNCED AUTO-SAVE FOR TITLE ---
  useEffect(() => {
    const timer = setTimeout(() => {
      // We check if editor exists and handle title-only changes here
      if (editor) handleAutoSave(title, editor.getHTML())
    }, 1500)
    return () => clearTimeout(timer)
  }, [title, editor]) // REMOVED 'content' reference to fix ReferenceError

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

  async function handleAutoSave(currentTitle: string, currentContent: string) {
    // Prevent saving if nothing actually changed from the original DB record
    if (currentContent === page.content && currentTitle === page.title) return
    
    setIsSaving(true)
    const { error } = await supabase
      .from('pages')
      .update({ 
        title: currentTitle, 
        content: currentContent
      })
      .eq('id', page.id)

    if (!error) {
      // Update the page object immediately for instant UI feedback
      page.content = currentContent
      page.title = currentTitle
      await onRefresh()
    }
    setIsSaving(false)
  }

  if (!editor) return null

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-[#0f172a] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden font-poppins transition-colors duration-500">
      
      {/* MOBILE HEADER - VIOLET THEME */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#7719aa] dark:bg-[#581c87] text-white shrink-0 shadow-lg">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white font-medium uppercase text-[11px] tracking-widest hover:bg-white/10">
          <ChevronLeft className="w-5 h-5 mr-0.5" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
            {isSaving ? "Syncing..." : "Cloud Synced"}
          </span>
          <Button size="sm" onClick={onBack} className="h-8 px-4 bg-white text-[#7719aa] font-bold uppercase text-[10px] rounded-full shadow-sm active:scale-95">
            Done
          </Button>
        </div>
      </header>

      {/* RICH TEXT TOOLBAR */}
      <div className="flex items-center gap-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {/* Add new item button */}
        <ToolbarButton 
          onClick={() => editor.chain().focus().insertContent('<p></p>').run()} 
          active={false} 
          icon={<Plus size={16}/>} 
        />
        
        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
        
        {/* List types */}
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleTaskList().run()} 
          active={editor.isActive('taskList')} 
          icon={<CheckSquare size={16}/>} 
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          active={editor.isActive('bulletList')} 
          icon={<List size={16}/>} 
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()} 
          active={editor.isActive('orderedList')} 
          icon={<ListOrdered size={16}/>} 
        />
        
        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
        
        {/* Text style */}
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
          active={editor.isActive('heading')} 
          icon={<Type size={16}/>} 
        />
        
        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
        
        {/* Text formatting */}
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          active={editor.isActive('bold')} 
          icon={<Bold size={16}/>} 
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          active={editor.isActive('italic')} 
          icon={<Italic size={16}/>} 
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleUnderline().run()} 
          active={editor.isActive('underline')} 
          icon={<UnderlineIcon size={16}/>} 
        />
      </div>

      <main className="flex-grow overflow-y-auto bg-white dark:bg-[#0f172a] flex flex-col">
        {/* TITLE AREA */}
        <div className="px-6 py-8 space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full text-2xl font-medium uppercase tracking-tight bg-transparent border-none focus:ring-0 p-0 text-[#7719aa] dark:text-[#a78bfa] placeholder:text-slate-200 dark:placeholder:text-slate-900"
          />
          <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(page.created_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* RULED PAPER WRITING AREA - OPTIMIZED FOR DARK SCREEN */}
        <div 
          ref={editorAreaRef}
          className="flex-grow px-6 pb-20 cursor-text"
          onClick={() => editor.commands.focus()}
          style={{
            backgroundImage: `linear-gradient(to bottom, transparent 35px, var(--ruled-line) 35px, var(--ruled-line) 36px, transparent 36px)`,
            backgroundSize: '100% 36px',
            backgroundAttachment: 'local',
            // @ts-ignore
            '--ruled-line': 'rgba(100, 116, 139, 0.15)' // Subtle slate lines
          } as any}
        >
          <EditorContent editor={editor} />
        </div>
      </main>

      <footer className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full", isSaving ? "bg-amber-500 animate-pulse" : "bg-green-500")} />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            {isSaving ? "Saving Meditation" : "Encrypted & Saved"}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></Button>
      </footer>
    </div>
  )
}

function ToolbarButton({ onClick, active, icon }: any) {
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onClick} 
      className={cn(
        "h-8 w-8 transition-all rounded-lg",
        active ? "bg-[#7719aa]/10 text-[#7719aa] dark:bg-[#a78bfa]/20 dark:text-[#a78bfa]" : "text-slate-400 dark:text-slate-600"
      )}
    >
      {icon}
    </Button>
  )
}