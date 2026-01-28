'use client'

import { useState } from 'react'
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
import { Sparkles, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
const EMOJIS = ['🔭', '🚀', '🧠', '💪', '🎨', '🌍', '📈', '🧘']

export function VisionCreator({ onCreated }: { onCreated: () => void }) {
  const supabase = createClient()
  
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newVision, setNewVision] = useState({ 
  title: '', 
  description: '', 
  color: COLORS[0], 
  emoji: EMOJIS[0],
  target_date: '' // Add this
})


  async function handleCreateVision() {
    if (!newVision.title) return
    setIsCreating(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase.from('visions').insert({
      title: newVision.title,
      description: newVision.description,
      color: newVision.color,
      emoji: newVision.emoji,
      target_date: newVision.target_date,
      owner_id: user?.id
    })

    if (!error) {
      setIsOpen(false)
      setNewVision({ title: '', description: '', color: COLORS[0], emoji: EMOJIS[0], target_date: '' })
      onCreated() // This refreshes the parent page
    }
    setIsCreating(false)
  }



  // Inside your VisionCreator.tsx state

// Add this Input inside the DialogContent scroll area



  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full gap-2 border-primary/20 hover:bg-primary/5">
          <Sparkles className="w-4 h-4 text-primary" /> Cast New Vision
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Define the North Star</DialogTitle>
          <DialogDescription>What high-level outcome are you chasing?</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Vision Title</label>
            <Input 
              placeholder="e.g. Total Financial Freedom" 
              value={newVision.title}
              onChange={(e) => setNewVision({...newVision, title: e.target.value})}
              className="border-0 bg-secondary/50 focus-visible:ring-primary font-bold"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Identity & Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button 
                  key={c} 
                  type="button"
                  onClick={() => setNewVision({...newVision, color: c})}
                  className={cn(
                    "w-6 h-6 rounded-full transition-transform", 
                    newVision.color === c ? "scale-125 ring-2 ring-offset-2 ring-primary" : "opacity-40 hover:opacity-100"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>


<div className="space-y-2">
  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Target Completion Date</label>
  <Input 
    type="date"
    value={newVision.target_date}
    onChange={(e) => setNewVision({...newVision, target_date: e.target.value})}
    className="border-0 bg-secondary/50 focus-visible:ring-primary font-bold"
  />
</div>

            <div className="flex gap-2 pt-2">
              {EMOJIS.map(e => (
                <button 
                  key={e} 
                  type="button"
                  onClick={() => setNewVision({...newVision, emoji: e})}
                  className={cn(
                    "p-2 rounded-lg bg-secondary text-lg transition-all", 
                    newVision.emoji === e ? "bg-primary text-white scale-110 shadow-lg" : "hover:bg-secondary/80 opacity-60"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleCreateVision} 
            className="w-full font-bold uppercase tracking-widest py-6" 
            disabled={isCreating || !newVision.title}
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cast Vision'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}