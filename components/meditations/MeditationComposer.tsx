'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Bold, Italic, ListOrdered, BookOpen, X, Loader2 } from 'lucide-react'

// Tiptap Imports
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'

export default function MeditationComposer({ meditation, onClose, onCreated }: any) {
  const [title, setTitle] = useState('')
  const [scripture, setScripture] = useState('')
  const [application, setApplication] = useState('')
  const [prayer, setPrayer] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private')
  const [autoPost, setAutoPost] = useState(true)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#7c3aed] underline font-bold cursor-pointer',
        },
      }),
      Placeholder.configure({ 
        placeholder: 'What is the Holy Spirit revealing to you?' 
      }),
    ],
    content: meditation?.lesson || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[140px] p-4 bg-white/50',
      },
    },
  })

  useEffect(() => {
    if (meditation && editor) {
      setTitle(meditation.title)
      setScripture(meditation.scripture)
      setApplication(meditation.application)
      setPrayer(meditation.prayer)
      setVisibility(meditation.visibility)
      editor.commands.setContent(meditation.lesson)
    }
  }, [meditation, editor])

  const setBibleLink = () => {
    const previousUrl = editor?.getAttributes('link').href
    const url = window.prompt('Enter Bible Reference:', previousUrl)
    if (url === null) return
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    const finalUrl = url.includes('http') 
      ? url 
      : `https://www.biblegateway.com/passage/?search=${encodeURIComponent(url)}&version=NIV`
    editor?.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run()
  }

  async function saveMeditation() {
    const lessonContent = editor?.getHTML() || ''
    if (!title || !scripture || !lessonContent) {
      toast.error("Title, Scripture, and Revelation are required.")
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setSaving(false)
    const period = new Date().getHours() < 12 ? 'morning' : 'evening'

    try {
      const payload = { author_id: user.id, title, scripture, lesson: lessonContent, application, prayer, visibility, period }
      const { data, error } = meditation?.id 
        ? await supabase.from('meditations').update(payload).eq('id', meditation.id).select().single()
        : await supabase.from('meditations').insert(payload).select().single()
      if (error) throw error
      if (autoPost && data) {
        let partnerId = null
        if (visibility === 'shared') {
          const { data: p } = await supabase.from('profiles').select('partner_id').eq('id', user.id).single()
          partnerId = p?.partner_id
        }
        await supabase.from('posts').insert({
          author_id: user.id, partner_id: partnerId, visibility, meditation_id: data.id,
          content: `🧘 Meditated on: "${title}"`,
        })
      }
      toast.success("Journal synced! 🤍")
      onCreated?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally { setSaving(false) }
  }

  if (!editor) return null

  return (
    <div className="fixed inset-0 z-[100] md:flex md:items-center md:justify-center bg-black/40 backdrop-blur-sm">
      <Card className="w-full h-full md:h-auto md:max-w-2xl border-none shadow-2xl md:rounded-[40px] rounded-none bg-white flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500">
        
        {/* Fixed Header */}
        <div className="bg-[#7c3aed] p-5 md:p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none">Daily Bread</h2>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-70 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-2 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 pb-40">
          <Input 
            placeholder="Focus of the Revelation..." 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 font-bold px-4"
          />

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Scripture</label>
            <Textarea 
              placeholder="e.g., Matthew 6:33" 
              value={scripture} 
              onChange={(e) => setScripture(e.target.value)}
              className="rounded-2xl border-slate-100 bg-slate-50/50 min-h-[60px] px-4 py-3 italic text-sm"
            />
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Revelation</label>
             <div className="border-2 border-violet-50 rounded-[24px] overflow-hidden bg-white">
                <div className="flex items-center gap-1 p-2 border-b border-violet-50 bg-violet-50/20 sticky top-0 z-10">
                  <RichButton icon={<Bold size={16}/>} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
                  <RichButton icon={<Italic size={16}/>} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
                  <RichButton icon={<ListOrdered size={16}/>} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
                  <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                  <RichButton icon={<BookOpen size={16}/>} onClick={setBibleLink} active={editor.isActive('link')} />
                </div>
                <EditorContent editor={editor} />
             </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Textarea placeholder="Application" value={application} onChange={(e) => setApplication(e.target.value)} className="rounded-2xl border-slate-100 bg-slate-50/50 min-h-[80px]" />
            <Textarea placeholder="Prayer" value={prayer} onChange={(e) => setPrayer(e.target.value)} className="rounded-2xl border-slate-100 bg-slate-50/50 min-h-[80px]" />
          </div>
        </div>

        {/* Footer - Optimization: Removed overflow-hidden from footer container */}
        <div className="bg-white p-5 md:p-6 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0 pb-safe">
          <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
            <SelectTrigger className="w-[130px] rounded-xl border-slate-200 font-bold text-xs h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            {/* Optimization: Ensure the list is on top of everything */}
            <SelectContent className="z-[110] rounded-2xl shadow-xl border-slate-100">
              <SelectItem value="private" className="font-medium">🔒 Private</SelectItem>
              <SelectItem value="shared" className="font-medium">❤️ Shared</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={saveMeditation} 
            disabled={saving}
            className="flex-1 md:flex-none rounded-full bg-[#7c3aed] px-6 h-12 font-black text-md shadow-lg shadow-violet-200 active:scale-95"
          >
            {saving ? <Loader2 className="animate-spin h-5 w-5"/> : 'Save Meditation'}
          </Button>
        </div>

      </Card>
    </div>
  )
}

function RichButton({ icon, onClick, active }: any) {
  return (
    <button type="button" onClick={onClick} className={`p-2 rounded-xl ${active ? 'bg-white text-[#7c3aed] shadow-sm' : 'text-slate-400'}`}>
      {icon}
    </button>
  )
}