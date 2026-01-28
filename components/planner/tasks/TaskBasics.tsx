'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ChevronRight } from 'lucide-react'

type Vision = {
  id: string
  title: string
}

export function TaskBasics({
  visionId, // Changed from goalId
  onVisionChange, // Changed from onGoalChange
  hideTitle = true,
  text,
  onTextChange,
}: {
  visionId: string | null
  onVisionChange: (v: string | null) => void
  hideTitle?: boolean
  text?: string
  onTextChange?: (v: string) => void
}) {
  const supabase = createClient()
  const [visions, setVisions] = useState<Vision[]>([])

  useEffect(() => {
    async function loadVisions() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      // Now fetching from 'visions' table
      const { data } = await supabase
        .from('visions')
        .select('id, title')
        .eq('user_id', auth.user.id) // Ensure column name matches your DB (user_id or owner_id)
        .order('created_at')

      if (data) setVisions(data)
    }

    loadVisions()
  }, [supabase])

  return (
    <div className="space-y-6">
      {/* Title Input */}
      {!hideTitle && onTextChange && (
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 block">
            Title
          </label>
          <input
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="What are you doing?"
            className="w-full bg-slate-50 border-none rounded-[22px] p-5 text-[16px] focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300"
          />
        </div>
      )}

      {/* Vision Link Section */}
      <div>
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3 block">
          Link to Vision
        </label>
        
        <div className="bg-slate-50 rounded-[22px] overflow-hidden border border-slate-100/50 hover:bg-slate-100/50 transition-colors">
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="bg-indigo-100 p-2.5 rounded-xl">
              <Sparkles size={18} className="text-indigo-600" />
            </div>
            
            <div className="relative flex-1">
              <select
                value={visionId ?? ''}
                onChange={(e) => onVisionChange(e.target.value === '' ? null : e.target.value)}
                className="w-full bg-transparent border-none text-[16px] font-semibold focus:ring-0 cursor-pointer appearance-none outline-none pr-8"
              >
                <option value="">No vision linked</option>
                {visions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
              {/* Custom arrow to replace native one for cleaner UI */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight size={18} className="text-slate-300" />
              </div>
            </div>
          </div>
        </div>
        
        {visionId && (
          <p className="mt-3 px-3 text-[12px] text-indigo-500 font-medium italic flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <span className="w-1 h-1 bg-indigo-500 rounded-full" />
            This aligns with your long-term vision.
          </p>
        )}
      </div>
    </div>
  )
}