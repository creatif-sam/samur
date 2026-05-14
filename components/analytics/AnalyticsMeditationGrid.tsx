'use client'

import { cn } from '@/lib/utils'

interface Props {
  meditations: { created_at: string }[]
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKS = 4

export default function AnalyticsMeditationGrid({ meditations }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const meditatedDays = new Set(meditations.map(m => m.created_at.slice(0, 10)))

  const totalDays = WEEKS * 7
  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (totalDays - 1 - i))
    const key = d.toISOString().slice(0, 10)
    const isToday = i === totalDays - 1
    return { key, meditated: meditatedDays.has(key), isToday }
  })

  const meditatedCount = days.filter(d => d.meditated).length

  return (
    <div className="px-4 mt-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-black tracking-tight">Meditation Activity</h3>
        <span className="text-xs font-bold text-violet-500">{meditatedCount} / {totalDays} days</span>
      </div>

      <div className="bg-muted/30 rounded-3xl p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="text-center text-[9px] font-bold text-muted-foreground uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Dot grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map(({ key, meditated, isToday }) => (
            <div
              key={key}
              className={cn(
                'aspect-square rounded-lg transition-all',
                meditated
                  ? isToday
                    ? 'bg-violet-500 ring-2 ring-violet-300 dark:ring-violet-700'
                    : 'bg-violet-500/80'
                  : isToday
                    ? 'bg-muted ring-2 ring-violet-400'
                    : 'bg-muted/60'
              )}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-muted/60" />
            <span className="text-[10px] text-muted-foreground font-medium">None</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-violet-500/80" />
            <span className="text-[10px] text-muted-foreground font-medium">Meditated</span>
          </div>
        </div>
      </div>
    </div>
  )
}
