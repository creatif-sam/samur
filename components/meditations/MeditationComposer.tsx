'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion' // Added for the Glide effect
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
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#7c3aed] dark:text-[#a78bfa] underline font-semibold cursor-pointer',
        },
      }),
      Placeholder.configure({ placeholder: 'What is the Holy Spirit revealing to you?' }),
    ],
    content: meditation?.lesson || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none min-h-[160px] md:min-h-[200px] p-4 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 w-full font-poppins',
      },
    },
  })

  useEffect(() => {
    if (meditation && editor) {
      setTitle(meditation.title); setScripture(meditation.scripture);
      setApplication(meditation.application); setPrayer(meditation.prayer);
      setVisibility(meditation.visibility); editor.commands.setContent(meditation.lesson);
    }
  }, [meditation, editor])

  const setBibleLink = () => {
    const previousUrl = editor?.getAttributes('link').href
    const url = window.prompt('Enter Bible Reference:', previousUrl)
    if (!url) return
    const finalUrl = url.includes('http') ? url : `https://www.biblegateway.com/passage/?search=${encodeURIComponent(url)}&version=NIV`
    editor?.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run()
  }

  async function saveMeditation() {
    const lessonContent = editor?.getHTML() || ''
    
    // Validate all required fields
    if (!title.trim()) return toast.error("Title is required ✍️")
    if (!scripture.trim()) return toast.error("Scripture reference is required 📖")
    if (!lessonContent.trim() || lessonContent === '<p></p>') return toast.error("Revelation/Lesson is required 💡")
    if (!application.trim()) return toast.error("Application is required 🚶")
    if (!prayer.trim()) return toast.error("Prayer is required 🙏")
    
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const period = new Date().getHours() < 12 ? 'morning' : 'evening'

    try {
      const payload = { author_id: user?.id, title, scripture, lesson: lessonContent, application, prayer, visibility, period }
      const { data, error } = meditation?.id 
        ? await supabase.from('meditations').update(payload).eq('id', meditation.id).select().single()
        : await supabase.from('meditations').insert(payload).select().single()
      if (error) throw error
      
      toast.success("Journal synced! 🤍")

      // Notify partner if meditation is shared
      if (visibility === 'shared' && user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('partner_id, full_name')
          .eq('id', user.id)
          .single()

        if (profile?.partner_id) {
          // Send notification to partner via API
          fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId: profile.partner_id,
              title: 'Partner Meditation',
              body: `${profile.full_name || 'Your partner'} completed their meditation! 🙏`,
              url: '/protected/meditations'
            })
          }).catch(err => console.error('Failed to send partner notification:', err))
        }
      }

      onCreated?.(); onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally { setSaving(false) }
  }

  if (!editor) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-sm p-0 md:p-4 font-poppins overflow-y-auto">
      
      {/* Background Overlay to close on PC */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose} 
        className="absolute inset-0 -z-10" 
      />

      {/* THE GLIDING CARD */}
      <motion.div
        initial={{ y: "100%", opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }} // This is the "Glide" logic
        className="w-full max-w-full h-[94vh] md:h-auto md:max-h-[85vh] md:max-w-3xl border-none shadow-2xl md:rounded-[32px] rounded-t-[40px] bg-white dark:bg-[#0f172a] flex flex-col overflow-hidden"
      >
        
        {/* Header */}
        <div className="bg-[#7c3aed] p-5 md:p-6 text-white flex justify-between items-center shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight leading-none uppercase">Daily Bread</h2>
            <p className="text-[10px] uppercase font-semibold tracking-widest opacity-80 mt-2">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-2.5 rounded-full hover:bg-white/20 transition-all active:scale-90">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-8 pb-28 md:pb-32">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-2">
               <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Focus</label>
               <Input placeholder="Title..." value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 h-12 font-semibold text-slate-900 dark:text-white w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Scripture</label>
              <Input placeholder="e.g. Matthew 6:33" value={scripture} onChange={(e) => setScripture(e.target.value)} className="rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 h-12 text-slate-900 dark:text-white w-full" />
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Revelation</label>
             <div className="border-2 border-violet-50 dark:border-slate-800 rounded-[28px] overflow-hidden bg-white dark:bg-slate-900 w-full">
                <div className="flex items-center gap-1 p-3 border-b border-violet-50 dark:border-slate-800 bg-violet-50/20 dark:bg-slate-800/50 sticky top-0 z-10">
                  <RichButton icon={<Bold size={18}/>} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
                  <RichButton icon={<Italic size={18}/>} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
                  <RichButton icon={<ListOrdered size={18}/>} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
                  <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-2" />
                  <RichButton icon={<BookOpen size={18}/>} onClick={setBibleLink} active={editor.isActive('link')} />
                </div>
                <EditorContent editor={editor} />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Application</label>
              <Textarea placeholder="Walk this out..." value={application} onChange={(e) => setApplication(e.target.value)} className="rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white min-h-[110px] w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Prayer</label>
              <Textarea placeholder="Seal in prayer..." value={prayer} onChange={(e) => setPrayer(e.target.value)} className="rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white min-h-[110px] w-full" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md p-4 md:p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 md:gap-4 shrink-0 w-full">
          <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
            <SelectTrigger className="w-full sm:w-[130px] rounded-xl border-slate-200 dark:border-slate-700 font-semibold text-xs h-12 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[110] rounded-2xl shadow-xl border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <SelectItem value="private">🔒 Private</SelectItem>
              <SelectItem value="shared">❤️ Shared</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={saveMeditation} 
            disabled={saving}
            className="w-full sm:flex-1 md:flex-none rounded-full bg-[#7c3aed] px-10 h-12 font-semibold text-md shadow-lg shadow-violet-200 dark:shadow-none active:scale-95 transition-all"
          >
            {saving ? <Loader2 className="animate-spin h-5 w-5"/> : 'Amen'}
          </Button>
        </div>

      </motion.div>
    </div>
  )
}

function RichButton({ icon, onClick, active }: any) {
  return (
    <button type="button" onClick={onClick} className={`p-2.5 rounded-xl transition-all ${active ? 'bg-white dark:bg-slate-700 text-[#7c3aed] dark:text-violet-300 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
      {icon}
    </button>
  )
}