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

  // Initialize Tiptap Editor
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
        placeholder: 'What is the Holy Spirit revealing to you? (Use the Bible icon to link verses)' 
      }),
    ],
    content: meditation?.lesson || '',
    immediatelyRender: false, // ✅ Fixes SSR / Hydration Error
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[160px] max-h-[300px] overflow-y-auto p-4 rounded-2xl bg-white/50 border border-slate-100',
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
    const url = window.prompt('Enter Bible Gateway URL or Reference:', previousUrl)

    if (url === null) return
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // If they just typed a verse (e.g. John 3:16), we wrap it in a search URL
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
      const payload = {
        author_id: user.id,
        title,
        scripture,
        lesson: lessonContent,
        application,
        prayer,
        visibility,
        period,
      }

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
          author_id: user.id,
          partner_id: partnerId,
          visibility,
          meditation_id: data.id,
          content: `🧘 ${user.email?.split('@')[0]} just finished a ${period} meditation: "${title}"`,
        })
      }

      toast.success("Journal synced to Heaven! 🤍")
      onCreated?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!editor) return <div className="p-20 text-center"><Loader2 className="animate-spin inline mr-2"/> Warming up the sanctuary...</div>

  return (
    <Card className="border-none shadow-2xl rounded-[40px] bg-white/95 backdrop-blur-2xl max-w-2xl mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <CardContent className="p-0">
        {/* Header Section */}
        <div className="bg-[#7c3aed] p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight leading-none">Daily Bread</h2>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-70 mt-2">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <Input 
            placeholder="Focus of the Revelation..." 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-[20px] border-slate-100 bg-slate-50/50 h-14 text-lg font-bold px-6 focus:ring-violet-200"
          />

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">The Word (Scripture)</label>
            <Textarea 
              placeholder="e.g., Matthew 6:33" 
              value={scripture} 
              onChange={(e) => setScripture(e.target.value)}
              className="rounded-[20px] border-slate-100 bg-slate-50/50 min-h-[60px] px-6 py-4 italic"
            />
          </div>

          {/* RICH TEXT EDITOR BOX */}
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Revelation & Lesson</label>
             <div className="border-2 border-violet-50 rounded-[30px] overflow-hidden shadow-inner bg-white">
                <div className="flex items-center gap-1 p-3 border-b border-violet-50 bg-violet-50/20">
                  <RichButton icon={<Bold size={18}/>} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
                  <RichButton icon={<Italic size={18}/>} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
                  <RichButton icon={<ListOrdered size={18}/>} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
                  <div className="w-[1px] h-4 bg-slate-200 mx-2" />
                  <RichButton icon={<BookOpen size={18}/>} onClick={setBibleLink} active={editor.isActive('link')} />
                </div>
                <EditorContent editor={editor} />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Life Application</label>
              <Textarea placeholder="How will you walk this out?" value={application} onChange={(e) => setApplication(e.target.value)} className="rounded-[20px] border-slate-100 bg-slate-50/50" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Prayer</label>
              <Textarea placeholder="Seal it in prayer..." value={prayer} onChange={(e) => setPrayer(e.target.value)} className="rounded-[20px] border-slate-100 bg-slate-50/50" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
              <SelectTrigger className="w-36 rounded-2xl border-slate-200 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="private">🔒 Private</SelectItem>
                <SelectItem value="shared">❤️ Shared</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-4">
              <Button 
                onClick={saveMeditation} 
                disabled={saving}
                className="rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] px-10 py-6 font-black text-lg shadow-xl shadow-violet-200 transition-all hover:scale-105 active:scale-95"
              >
                {saving ? <Loader2 className="animate-spin"/> : 'Sync Meditation'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RichButton({ icon, onClick, active }: any) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`p-2.5 rounded-xl transition-all ${active ? 'bg-white text-[#7c3aed] shadow-md scale-110' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
    >
      {icon}
    </button>
  )
}