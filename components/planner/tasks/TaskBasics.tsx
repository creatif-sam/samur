'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Target, ChevronRight } from 'lucide-react'

type Goal = {
  id: string
  title: string
}

export function TaskBasics({
  goalId,
  onGoalChange,
  hideTitle = true,
  text,
  onTextChange,
}: {
  goalId: string | null
  onGoalChange: (v: string | null) => void
  hideTitle?: boolean
  text?: string
  onTextChange?: (v: string) => void
}) {
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>([])

  useEffect(() => {
    async function loadGoals() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const { data } = await supabase
        .from('goals')
        .select('id,title')
        .eq('owner_id', auth.user.id)
        .order('created_at')

      if (data) setGoals(data)
    }

    loadGoals()
  }, [supabase])

  return (
    <div className="space-y-6">
      {/* Title Input (Only if needed) */}
      {!hideTitle && onTextChange && (
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2 block">
            Title
          </label>
          <input
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Event Title"
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      )}

      {/* Goal Link Section - Samsung List Style */}
      <div>
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-3 block">
          Link to Goal
        </label>
        
        <div className="bg-slate-50 rounded-[22px] overflow-hidden border border-slate-100/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="bg-blue-100 p-2 rounded-xl">
              <Target size={18} className="text-blue-600" />
            </div>
            
            <select
              value={goalId ?? ''}
              onChange={(e) => onGoalChange(e.target.value === '' ? null : e.target.value)}
              className="flex-1 bg-transparent border-none text-[15px] font-medium focus:ring-0 cursor-pointer appearance-none outline-none"
            >
              <option value="">No goal linked</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
            
            <ChevronRight size={18} className="text-slate-300" />
          </div>
        </div>
        
        {goalId && (
          <p className="mt-2 px-2 text-[11px] text-blue-500 font-bold italic">
            ✨ This event will count towards your goal progress.
          </p>
        )}
      </div>
    </div>
  )
}