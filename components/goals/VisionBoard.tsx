'use client'

import { useMemo, useState } from 'react'
import { Goal } from '@/lib/types'
import { cn } from '@/lib/utils'

// 1. Define the joined type so the build passes
type EnhancedGoal = Goal & {
  visions?: { title: string; color: string; emoji: string } | null
}

type Scope = 'day' | 'week' | 'month' | 'year'

export function VisionBoard({ goals }: { goals: EnhancedGoal[] }) {
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

      // Use vision_id to group, but pull display data from the visions join
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
      // 2. Health-based color logic
      let statusColor = "#ef4444" // RED: Vision exists but has 0 goals in this scope
      if (v.count > 0) {
        // YELLOW: Has goals but 0% progress | GREEN: Has progress
        statusColor = v.totalProgress > 0 ? "#22c55e" : "#eab308"
      }

      return { ...v, statusColor }
    }).sort((a, b) => b.count - a.count)
  }, [goals, scope])

  return (
    <div className="w-full space-y-8 py-2">
      {/* 3. Floating Animation CSS */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      {/* Header with Health Legend */}
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary italic">Strategic Gravity</h3>
          <div className="flex gap-3">
            <span className="text-[8px] font-bold text-red-500 uppercase">● Empty</span>
            <span className="text-[8px] font-bold text-yellow-500 uppercase">● Stagnant</span>
            <span className="text-[8px] font-bold text-green-500 uppercase">● Active</span>
          </div>
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

      {/* 4. The Floating Blobs */}
      <div className="relative min-h-[240px] flex flex-wrap justify-center items-center gap-10 px-4">
        {visionStats.length === 0 ? (
          <div className="text-[10px] font-bold uppercase text-muted-foreground italic tracking-widest animate-pulse">
            Establishing focal points...
          </div>
        ) : (
          visionStats.map((v, i) => {
            const size = Math.min(160, 100 + v.count * 10)
            
            return (
              <div
                key={v.title}
                className="animate-float"
                style={{ 
                  width: size, 
                  height: size,
                  animationDelay: `${i * 0.7}s`, // Staggered start
                  animationDuration: `${5 + (i % 4)}s` // Variation in speed
                }}
              >
                <div className="relative group w-full h-full flex items-center justify-center transition-transform hover:scale-110 duration-500">
                  {/* Glowing Aura based on Health */}
                  <div 
                    className="absolute inset-0 opacity-20 blur-3xl group-hover:opacity-50 transition-opacity rounded-full"
                    style={{ backgroundColor: v.statusColor }}
                  />
                  
                  {/* Glassmorphism Blob */}
                  <div 
                    className="relative z-10 flex flex-col items-center justify-center text-center p-5 rounded-full border shadow-2xl backdrop-blur-xl bg-background/40"
                    style={{ 
                      width: '95%', 
                      height: '95%', 
                      borderColor: `${v.statusColor}40`,
                    }}
                  >
                    <span className="text-2xl mb-1 group-hover:scale-125 transition-transform">{v.emoji}</span>
                    <h4 className="text-[10px] font-black uppercase italic tracking-tighter leading-none mb-2">
                      {v.title}
                    </h4>
                    <div 
                      className="px-2 py-0.5 rounded-full text-[7px] font-black text-white uppercase tracking-tighter"
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