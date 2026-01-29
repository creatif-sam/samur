'use client'

import { useMemo, useState } from 'react'
import { Goal } from '@/lib/types'
import { cn } from '@/lib/utils'

type Scope = 'day' | 'week' | 'month' | 'year'

export function VisionBoard({ goals }: { goals: Goal[] }) {
  const [scope, setScope] = useState<Scope>('month')

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const visionStats = useMemo(() => {
    const stats: Record<string, { title: string; color: string; emoji: string; count: number; totalProgress: number }> = {}

    goals.forEach((g) => {
      if (!g.due_date) return
      const d = new Date(g.due_date)
      d.setHours(0, 0, 0, 0)

      let inScope = false
      if (scope === 'day') inScope = d.getTime() === now.getTime()
      else if (scope === 'week') {
        const start = new Date(now); start.setDate(now.getDate() - now.getDay())
        const end = new Date(start); end.setDate(start.getDate() + 7)
        inScope = d >= start && d < end
      } 
      else if (scope === 'month') inScope = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      else inScope = d.getFullYear() === now.getFullYear()

      if (!inScope) return

      const vId = g.vision_id || 'unlinked'
      if (!stats[vId]) {
        stats[vId] = {
          title: g.visions?.title || 'General',
          color: g.visions?.color || '#94a3b8',
          emoji: g.visions?.emoji || '🎯',
          count: 0,
          totalProgress: 0
        }
      }
      stats[vId].count += 1
      stats[vId].totalProgress += (g.progress || 0)
    })

    return Object.values(stats).map(v => {
      // Determine Status Color
      let statusColor = "#ef4444" // Default Red (0 goals)
      if (v.count > 0) {
        statusColor = v.totalProgress > 0 ? "#22c55e" : "#eab308" // Green if progress > 0, else Yellow
      }

      return { ...v, statusColor }
    }).sort((a, b) => b.count - a.count)
  }, [goals, scope])

  return (
    <div className="w-full space-y-8 py-2">
      <style jsx global>{`
        @keyframes float {
          0% { transform: translate(0px, 0px); }
          50% { transform: translate(0px, -10px); }
          100% { transform: translate(0px, 0px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary italic">Vision/Prophecy Board</h3>
          <p className="text-[9px] text-muted-foreground font-bold uppercase">Health: Red (Empty) • Yellow (Static) • Green (Active)</p>
        </div>

        <div className="flex bg-secondary/50 p-1 rounded-full border border-primary/10">
          {(['week', 'month', 'year'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                "px-4 py-1 text-[9px] font-black uppercase transition-all rounded-full",
                scope === s ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[220px] flex flex-wrap justify-center items-center gap-8 px-4">
        {visionStats.length === 0 ? (
          <div className="text-[10px] font-bold uppercase text-muted-foreground italic animate-pulse">No focus data found</div>
        ) : (
          visionStats.map((v, i) => {
            const size = Math.min(150, 90 + v.count * 12)
            
            return (
              <div
                key={v.title}
                className="animate-float"
                style={{ 
                  width: size, 
                  height: size,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${5 + (i % 3)}s`
                }}
              >
                <div className="relative group w-full h-full flex items-center justify-center transition-transform hover:scale-105">
                  {/* BLOB GLOW */}
                  <div 
                    className="absolute inset-0 opacity-20 blur-2xl group-hover:opacity-40 transition-opacity rounded-full"
                    style={{ backgroundColor: v.statusColor }}
                  />
                  
                  {/* THE CORE */}
                  <div 
                    className="relative z-10 flex flex-col items-center justify-center text-center p-4 rounded-full border backdrop-blur-md bg-background/60 shadow-2xl"
                    style={{ 
                      width: '90%', 
                      height: '90%', 
                      borderColor: `${v.statusColor}60`,
                    }}
                  >
                    <span className="text-xl mb-1">{v.emoji}</span>
                    <span className="text-[9px] font-black uppercase italic tracking-tighter line-clamp-2 px-2">
                      {v.title}
                    </span>
                    <div 
                      className="mt-2 px-2 py-0.5 rounded-full text-[7px] font-black text-white uppercase"
                      style={{ backgroundColor: v.statusColor }}
                    >
                      {v.count} {v.count === 1 ? 'Goal' : 'Goals'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}