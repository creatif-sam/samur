'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, BookPlus } from 'lucide-react'

const COLORS = [
  { name: 'OneNote Purple', value: '#7719AA' },
  { name: 'Business Blue', value: '#0078D4' },
  { name: 'Success Green', value: '#107C10' },
  { name: 'Warning Orange', value: '#D83B01' },
  { name: 'Soft Gray', value: '#605E5C' },
  { name: 'Deep Black', value: '#201F1E' }
]

const EMOJIS = ['📓', '💡', '🔥', '🧠', '🚀', '🎨', '📅', '🏗️', '🌿', '💎', '🍿', '🎯']

export function AddNotebookDialog({ 
  open, 
  onOpenChange, 
  userId, 
  onCreated 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void, 
  userId: string,
  onCreated: () => Promise<void> 
}) {
  const [title, setTitle] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📓')
  const [selectedColor, setSelectedColor] = useState('#7719AA')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Please enter a notebook name")
      return
    }
    
    setLoading(true)

    try {
      // 1. SAVE TO DATABASE
      const { error: saveError } = await supabase
        .from('notebooks')
        .insert({
          title: title.trim(),
          emoji: selectedEmoji,
          color: selectedColor,
          user_id: userId
        })

      if (saveError) throw saveError

      // 2. REFRESH UI (Sequential Sync)
      // We await the refresh from the parent before proceeding
      try {
        await onCreated() 
      } catch (refreshErr) {
        // Silently log refresh errors so user still gets success message
        console.warn("UI sync pending...")
      }

      // 3. FINAL SUCCESS & CLEANUP
      toast.success(`"${title}" created! 🤍`)
      setTitle('')
      onOpenChange(false)

    } catch (err: any) {
      console.error("❌ Creation Error:", err.message)
      toast.error(err.message || "Failed to create notebook")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] w-[95vw] rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-6 shadow-2xl animate-in zoom-in-95 duration-300">
        
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/20">
              <BookPlus className="w-5 h-5 text-[#7719AA] dark:text-[#a78bfa]" />
            </div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              New Notebook
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Create a new space for your revelations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* TITLE INPUT */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Notebook Name</Label>
            <Input 
              placeholder="e.g. Sermon Notes" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="h-12 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus-visible:ring-[#7719AA] rounded-2xl font-bold text-slate-900 dark:text-white"
            />
          </div>

          {/* EMOJI SELECTOR */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Cover Icon</Label>
            <div className="grid grid-cols-6 gap-2 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setSelectedEmoji(e)}
                  className={`text-xl aspect-square flex items-center justify-center rounded-xl transition-all ${
                    selectedEmoji === e 
                    ? 'bg-white dark:bg-slate-800 shadow-md scale-110 ring-2 ring-[#7719AA]' 
                    : 'opacity-40 hover:opacity-100 hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* COLOR SELECTOR */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Accent Color</Label>
            <div className="flex justify-between px-2 py-1">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  className={`w-8 h-8 rounded-full border-4 transition-all hover:scale-125 ${
                    selectedColor === c.value 
                    ? 'border-white dark:border-slate-900 ring-2 ring-[#7719AA] scale-110' 
                    : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-2xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-900 h-12"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={loading}
            className="flex-1 bg-[#7719AA] hover:bg-[#5F1488] text-white rounded-2xl font-bold h-12 shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}