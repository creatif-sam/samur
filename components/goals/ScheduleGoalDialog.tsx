'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toLocalDateKey } from '@/lib/dates'
import { addTaskToDay } from '@/lib/planner/addTask'
import { formatMinutes } from '@/lib/planner/tasks'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Goal } from '@/lib/types'

const DURATIONS = [30, 60, 90, 120]

// Book time in the planner for a goal; the task is linked to the goal's vision
export default function ScheduleGoalDialog({ goal, open, onOpenChange }: {
  goal: Pick<Goal, 'title' | 'vision_id'>
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const now = new Date()
  const [day, setDay] = useState(toLocalDateKey(now))
  const [start, setStart] = useState(formatMinutes(Math.min((now.getHours() + 1) * 60, 22 * 60)))
  const [duration, setDuration] = useState(60)
  const [saving, setSaving] = useState(false)

  async function save() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [h, m] = start.split(':').map(Number)
    setSaving(true)
    try {
      await addTaskToDay(supabase, user.id, day, {
        id: crypto.randomUUID(),
        text: goal.title,
        start,
        end: formatMinutes(h * 60 + m + duration),
        completed: false,
        vision_id: goal.vision_id ?? undefined,
        visibility: 'private',
        owner_id: user.id,
      })
      onOpenChange(false)
      toast.success('Time booked in your planner', {
        action: { label: 'Open planner', onClick: () => router.push('/protected/planner') },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add it to your planner")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-black">Schedule time</DialogTitle>
          <DialogDescription className="truncate">{goal.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Day</span>
              <input type="date" value={day} onChange={e => e.target.value && setDay(e.target.value)} className="w-full rounded-xl border bg-background px-2 py-2 text-sm" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start</span>
              <input type="time" value={start} onChange={e => e.target.value && setStart(e.target.value)} className="w-full rounded-xl border bg-background px-2 py-2 text-sm" />
            </label>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">How long</span>
            <div className="flex gap-1.5">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold ${duration === d ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  {d < 60 ? `${d}m` : `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}` : ''}`}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-2xl bg-violet-600 text-white py-3 text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add to planner
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
