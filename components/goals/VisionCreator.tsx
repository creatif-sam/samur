'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Vision } from '@/app/protected/goals/page'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
const EMOJIS = ['🔭', '🚀', '🧠', '💪', '🎨', '🌍', '📈', '🧘']

interface VisionCreatorProps {
  onCreated: () => void
  initialData?: Vision | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function VisionCreator({ onCreated, initialData, open, onOpenChange }: VisionCreatorProps) {
  const supabase = createClient()
  
  const [internalOpen, setInternalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newVision, setNewVision] = useState({ 
    title: '', 
    description: '', 
    color: COLORS[0], 
    emoji: EMOJIS[0],
    target_date: ''
  })

  // Sync state if editing
  useEffect(() => {
    if (initialData) {
      setNewVision({
        title: initialData.title || '',
        description: initialData.description || '',
        color: initialData.color || COLORS[0],
        emoji: initialData.emoji || EMOJIS[0],
        target_date: initialData.target_date ? initialData.target_date.split('T')[0] : ''
      })
    }
  }, [initialData])

  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen

  async function handleSaveVision() {
    if (!newVision.title) return
    setIsCreating(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    const payload = {
      title: newVision.title,
      description: newVision.description,
      color: newVision.color,
      emoji: newVision.emoji,
      target_date: newVision.target_date || null,
      owner_id: user?.id
    }

    const { error } = initialData 
      ? await supabase.from('visions').update(payload).eq('id', initialData.id)
      : await supabase.from('visions').insert(payload)

    if (!error) {
      setIsOpen(false)
      if (!initialData) {
        setNewVision({ title: '', description: '', color: COLORS[0], emoji: EMOJIS[0], target_date: '' })
      }
      onCreated()
    }
    setIsCreating(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!initialData && (
        <DialogTrigger asChild>
          <Button variant="outline" className="rounded-full gap-2 border-primary/20 hover:bg-primary/5 active:scale-95 transition-transform">
            <Sparkles className="w-4 h-4 text-primary" /> 
            <span className="text-sm font-semibold">Cast New Vision</span>
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="w-[95vw] max-w-[425px] rounded-2xl overflow-y-auto max-h-[90vh] p-6 gap-0">
        <DialogHeader className="text-left pb-4">
          <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">
            {initialData ? 'Refine the North Star' : 'Define the North Star'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {initialData ? 'Adjust your high-level outcome.' : 'What high-level outcome are you chasing?'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-2">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Vision Title</label>
            <Input 
              placeholder="e.g. Total Financial Freedom" 
              value={newVision.title}
              onChange={(e) => setNewVision({...newVision, title: e.target.value})}
              className="text-base border-0 bg-secondary/50 focus-visible:ring-primary font-bold h-12"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Identity Color</label>
            <div className="flex flex-wrap gap-3 justify-between">
              {COLORS.map(c => (
                <button 
                  key={c} type="button"
                  onClick={() => setNewVision({...newVision, color: c})}
                  className={cn(
                    "w-9 h-9 rounded-full transition-all flex-shrink-0", 
                    newVision.color === c ? "scale-110 ring-4 ring-primary/20 border-2 border-white" : "opacity-60"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Target Date</label>
            <Input 
              type="date"
              value={newVision.target_date}
              onChange={(e) => setNewVision({...newVision, target_date: e.target.value})}
              className="text-base border-0 bg-secondary/50 focus-visible:ring-primary font-bold h-12"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Icon</label>
            <div className="grid grid-cols-4 gap-3">
              {EMOJIS.map(e => (
                <button 
                  key={e} type="button"
                  onClick={() => setNewVision({...newVision, emoji: e})}
                  className={cn(
                    "h-12 rounded-xl bg-secondary flex items-center justify-center text-xl transition-all", 
                    newVision.emoji === e ? "bg-primary text-white shadow-md" : "active:bg-secondary/80 opacity-60"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSaveVision} 
            className="w-full font-bold uppercase tracking-widest h-14 mt-4" 
            disabled={isCreating || !newVision.title}
          >
            {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : initialData ? 'Update Vision' : 'Cast Vision'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}