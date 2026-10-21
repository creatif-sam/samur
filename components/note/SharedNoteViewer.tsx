'use client'

import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { ChevronLeft, Loader2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchPage } from '@/lib/notes/data'
import type { Page } from './types'

// Read-only view of a note your partner shared. Rendering through the editor
// (not innerHTML) keeps only known, safe content.
export function SharedNoteViewer({ page, partnerName, onClose }: { page: Page; partnerName: string; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(page.content ?? null)
  const [loading, setLoading] = useState(page.content === undefined)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer', class: 'text-[#7719aa] underline' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-xl max-w-full h-auto my-3' } }),
    ],
    content: content ?? '',
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: 'prose dark:prose-invert max-w-none text-[16px] leading-[1.65] text-slate-700 dark:text-slate-300' } },
  })

  useEffect(() => {
    if (page.content !== undefined) return
    fetchPage(createClient(), page.id)
      .then(full => setContent(full?.content ?? ''))
      .catch(() => setContent(''))
      .finally(() => setLoading(false))
  }, [page.id])

  useEffect(() => {
    if (editor && content !== null) editor.commands.setContent(content)
  }, [editor, content])

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-[#0f172a] flex flex-col">
      <header className="flex items-center gap-2 px-3 h-14 bg-[#7719aa] dark:bg-[#581c87] text-white shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <button onClick={onClose} className="flex items-center text-[11px] font-medium uppercase tracking-widest px-2 py-1 rounded-lg hover:bg-white/10">
          <ChevronLeft className="w-5 h-5 mr-0.5" /> Back
        </button>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-80">
          <Users className="w-3.5 h-3.5" /> Shared by {partnerName}
        </span>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#7719aa] dark:text-[#a78bfa]">{page.title || 'Untitled'}</h1>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-2 mb-6">
          {new Date(page.updated_at ?? page.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })} · read only
        </p>
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-violet-500" /> : <EditorContent editor={editor} />}
      </main>
    </div>
  )
}
