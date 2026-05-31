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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Eye, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Vision } from '@/app/protected/goals/page'

const COLORS = [
  '#7c3aed', '#2563eb', '#0891b2', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#64748b',
]
const EMOJIS = ['🔭', '🚀', '🧠', '💪', '🎨', '🌍', '📈', '🧘', '✝️', '🙏', '👑', '🌱']

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
    target_date: '',
  })

  useEffect(() => {
    if (initialData) {
      setNewVision({
        title: initialData.title || '',
        description: initialData.description || '',
        color: initialData.color || COLORS[0],
        emoji: initialData.emoji || EMOJIS[0],
        target_date: initialData.target_date ? initialData.target_date.split('T')[0] : '',
      })
    }
  }, [initialData])

  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen

  async function handleSaveVision() {
    if (!newVision.title.trim()) return
    setIsCreating(true)

    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      title: newVision.title.trim(),
      description: newVision.description.trim(),
      color: newVision.color,
      emoji: newVision.emoji,
      target_date: newVision.target_date || null,
      owner_id: user?.id,
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

  const isEditing = Boolean(initialData)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button
            variant="default"
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white active:scale-95 transition-transform font-bold"
          >
            <Eye className="w-4 h-4" />
            Cast New Vision
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="w-[95vw] max-w-[460px] p-0 overflow-hidden rounded-3xl gap-0">
        {/* Hero header */}
        <div
          className="relative px-6 pt-7 pb-6 text-white overflow-hidden"
          style={{ backgroundColor: newVision.color }}
        >
          <div className="absolute -top-6 -right-6 text-[100px] opacity-10 select-none leading-none">
            {newVision.emoji}
          </div>
          <DialogHeader className="text-left relative">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
              {isEditing ? 'Refine the North Star' : 'Define the North Star'}
            </p>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-white leading-tight">
              {newVision.title || (isEditing ? 'Edit Vision' : 'New Vision')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isEditing ? 'Update your vision details' : 'Create a new long-term vision'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 space-y-5 max-h-[65svh] overflow-y-auto">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Vision Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Financial Freedom"
              value={newVision.title}
              onChange={e => setNewVision({ ...newVision, title: e.target.value })}
              className="bg-muted/50 border-0 focus-visible:ring-primary font-bold h-11"
            />
          </div>

          {/* Target Date */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Target Date
            </Label>
            <Input
              type="date"
              value={newVision.target_date}
              onChange={e => setNewVision({ ...newVision, target_date: e.target.value })}
              className="bg-muted/50 border-0 focus-visible:ring-primary font-bold h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Description
            </Label>
            <Textarea
              placeholder="Describe what this vision means to you and what it looks like achieved..."
              value={newVision.description}
              onChange={e => setNewVision({ ...newVision, description: e.target.value })}
              className="bg-muted/50 border-0 focus-visible:ring-primary resize-none min-h-[80px] text-sm"
            />
          </div>

          {/* Color */}
          <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Identity Color
            </Label>
            <div className="flex gap-2.5 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewVision({ ...newVision, color: c })}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all flex-shrink-0',
                    newVision.color === c
                      ? 'scale-110 ring-4 ring-offset-2 ring-current border-2 border-white'
                      : 'opacity-50 hover:opacity-80'
                  )}
                  style={{ backgroundColor: c, color: c }}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Icon
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setNewVision({ ...newVision, emoji: e })}
                  className={cn(
                    'h-10 rounded-xl flex items-center justify-center text-xl transition-all',
                    newVision.emoji === e
                      ? 'text-white shadow-md scale-105'
                      : 'bg-muted opacity-50 hover:opacity-80'
                  )}
                  style={newVision.emoji === e ? { backgroundColor: newVision.color } : undefined}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 pb-6 pt-2">
          <Button
            onClick={handleSaveVision}
            disabled={isCreating || !newVision.title.trim()}
            className="w-full h-13 font-black uppercase tracking-widest text-sm"
            style={{ backgroundColor: newVision.color, color: '#fff' }}
          >
            {isCreating
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : isEditing ? '👁 Update Vision' : '👁 Cast This Vision'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
