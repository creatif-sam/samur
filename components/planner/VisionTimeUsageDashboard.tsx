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
  allTasks: PlannerTask[] // Fetch a larger dataset for this
  visionsMap: Record<string, { title: string; emoji: string }>
}

export default function VisionProgressDashboard({ allTasks, visionsMap }: DashboardProps) {
  const [period, setPeriod] = useState<Period>('week')

  const stats = useMemo(() => {
    const data: Record<string, { hours: number; sessions: number }> = {}
    
    // Filter and aggregate logic based on 'period'
    // (In a real app, you'd pass pre-filtered data from the parent)
    allTasks.forEach(task => {
      if (!task.vision_id || !visionsMap[task.vision_id]) return
      
      const hours = (parseMinutes(task.end) - parseMinutes(task.start)) / 60
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

  function parseMinutes(time: string) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + (m || 0)
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-[32px] p-4 md:p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
      
      {/* Header & Period Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Progress Lab</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Vision Growth Analysis</p>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                period === p 
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {period === 'week' ? (
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="hours" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={period === 'week' ? 40 : 20} />
            </BarChart>
          ) : (
            <LineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
              <Tooltip contentStyle={{borderRadius: '20px', border: 'none'}} />
              <Line type="monotone" dataKey="hours" stroke="#2563eb" strokeWidth={4} dot={{ r: 6, fill: '#2563eb' }} activeDot={{ r: 8 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((item) => (
          <div key={item.name} className="p-5 border border-slate-50 dark:border-slate-800 rounded-[24px] bg-slate-50/30 dark:bg-slate-800/20">
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl">{Object.values(visionsMap).find(v => v.title === item.name)?.emoji}</span>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Time</p>
                <p className="text-lg font-black text-blue-600">{item.hours}h</p>
              </div>
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 truncate">{item.name}</h4>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
               <div className="bg-blue-600 h-full" style={{ width: `${Math.min((item.hours / 20) * 100, 100)}%` }} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{item.sessions} sessions this {period}</p>
          </div>
        ))}
      </div>
    </div>
  )
}