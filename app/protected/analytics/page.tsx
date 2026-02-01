'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import VisionProgressDashboard from '@/components/planner/VisionTimeUsageDashboard'
import { PlannerTask } from '@/components/planner/DailyPlanner'

export default function AnalyticsPage() {
  const supabase = createClient()
  const [allTasks, setAllTasks] = useState<PlannerTask[]>([])
  const [visionsMap, setVisionsMap] = useState<Record<string, any>>({})

  useEffect(() => {
    async function loadData() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user) return

      // Load Visions
      const { data: visions } = await supabase.from('visions').select('id, title, emoji').eq('owner_id', auth.user.id)
      const vMap: Record<string, any> = {}
      visions?.forEach(v => vMap[v.id] = v)
      setVisionsMap(vMap)

      // Load All Historical Tasks
      const { data: history } = await supabase
        .from('planner_days')
        .select('tasks')
        .eq('user_id', auth.user.id)
      
      const flattened = history?.flatMap(d => Array.isArray(d.tasks) ? d.tasks : []) || []
      setAllTasks(flattened)
    }
    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-6 pb-20">
      <header className="max-w-4xl mx-auto flex items-center gap-4 mb-8">
        <Link href="/" className="p-3 bg-white dark:bg-slate-900 rounded-full shadow-sm">
          <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">SamUr Performance Lab</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <VisionProgressDashboard allTasks={allTasks} visionsMap={visionsMap} />
      </main>
    </div>
  )
}