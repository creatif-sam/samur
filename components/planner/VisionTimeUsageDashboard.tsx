'use client'

import React, { useState, useMemo } from 'react'
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts'
import { Target, Calendar, TrendingUp, BarChart3 } from 'lucide-react'
import { PlannerTask } from './DailyPlanner'

type Period = 'week' | 'month' | 'year'

interface DashboardProps {
  allTasks: PlannerTask[] 
  visionsMap: Record<string, { title: string; emoji: string }>
}

export default function VisionProgressDashboard({ allTasks, visionsMap }: DashboardProps) {
  const [period, setPeriod] = useState<Period>('week')

  function parseMinutes(time: string) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + (m || 0)
  }

  const stats = useMemo(() => {
    const data: Record<string, { hours: number; sessions: number }> = {}
    
    allTasks.forEach(task => {
      if (!task.vision_id || !visionsMap[task.vision_id]) return
      
      const startMins = parseMinutes(task.start)
      let endMins = parseMinutes(task.end)
      
      /** * FIX: MIDNIGHT CROSSING LOGIC 
       * If end time is before start time (e.g., 23:00 to 02:00), 
       * add 1440 minutes (24 hours).
       */
      if (endMins < startMins) {
        endMins += 1440
      }

      const hours = (endMins - startMins) / 60
      const title = visionsMap[task.vision_id].title
      
      if (!data[title]) data[title] = { hours: 0, sessions: 0 }
      data[title].hours += hours
      data[title].sessions += 1
    })

    return Object.entries(data).map(([name, d]) => ({
      name,
      hours: parseFloat(d.hours.toFixed(1)),
      sessions: d.sessions
    }))
  }, [allTasks, period, visionsMap])

  return (
    <div className="w-full bg-muted/30 rounded-3xl p-4 space-y-6">
      
      {/* Period Switcher */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-600 rounded-2xl text-white shadow-lg shadow-violet-900/30">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground tracking-tight">Vision Time</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Time spent per vision</p>
          </div>
        </div>

        <div className="flex bg-muted/60 p-1 rounded-2xl w-fit">
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                period === p 
                ? 'bg-violet-600 text-white shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {period === 'week' ? (
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
              <Tooltip
                cursor={{fill: 'rgba(124,58,237,0.08)'}}
                contentStyle={{borderRadius: '16px', border: 'none', background: '#1e1b4b', color: '#fff', fontSize: 12}}
              />
              <Bar dataKey="hours" fill="#7c3aed" radius={[8, 8, 0, 0]} barSize={32} />
            </BarChart>
          ) : (
            <LineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
              <Tooltip contentStyle={{borderRadius: '16px', border: 'none', background: '#1e1b4b', color: '#fff', fontSize: 12}} />
              <Line type="monotone" dataKey="hours" stroke="#7c3aed" strokeWidth={3} dot={{ r: 5, fill: '#7c3aed' }} activeDot={{ r: 7 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Detail Grid */}
      {stats.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No vision time logged yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {stats.map((item) => (
            <div key={item.name} className="p-4 rounded-2xl bg-muted/40">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xl">{Object.values(visionsMap).find(v => v.title === item.name)?.emoji}</span>
                <p className="text-base font-black text-violet-500">{item.hours}h</p>
              </div>
              <h4 className="text-xs font-bold text-foreground truncate mb-2">{item.name}</h4>
              <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                <div className="bg-violet-500 h-full" style={{ width: `${Math.min((item.hours / 20) * 100, 100)}%` }} />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground mt-1.5">{item.sessions} sessions</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}