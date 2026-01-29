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

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Please enter a notebook name")
      return
    }
    
    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('notebooks')
        .insert({
          title: title.trim(),
          emoji: selectedEmoji,
          color: selectedColor,
          user_id: userId
        })

      if (error) {
        toast.error(`Failed to create: ${error.message}`)
      } else {
        toast.success(`"${title}" created`)
        setTitle('')
        await onCreated()
        onOpenChange(false)
      }
    } catch (err) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-xl border border-[#EDEBE9] bg-white p-6 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <BookPlus className="w-5 h-5 text-[#7719AA]" />
            <DialogTitle className="text-xl font-semibold text-[#323130]">
              Create Notebook
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-[#605E5C]">
            Set up a new binder for your notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* TITLE INPUT */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#323130]">Name</Label>
            <Input 
              placeholder="e.g. Work Projects" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 border-[#EDEBE9] focus-visible:ring-[#7719AA] rounded-md transition-all"
            />
          </div>

          {/* EMOJI SELECTOR */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#323130]">Cover Icon</Label>
            <div className="grid grid-cols-6 gap-2 bg-[#FAF9F8] p-3 rounded-lg border border-[#EDEBE9]">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setSelectedEmoji(e)}
                  className={`text-xl aspect-square flex items-center justify-center rounded-md transition-all hover:bg-white hover:shadow-sm ${
                    selectedEmoji === e 
                    ? 'bg-white shadow-md scale-110 ring-1 ring-[#7719AA]' 
                    : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* COLOR SELECTOR */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#323130]">Section Color</Label>
            <div className="flex justify-between p-1">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-125 ${
                    selectedColor === c.value 
                    ? 'border-white ring-2 ring-[#7719AA] scale-110' 
                    : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-[#605E5C] hover:bg-[#F3F2F1]"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={loading}
            className="bg-[#7719AA] hover:bg-[#5F1488] text-white px-8"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}