'use client'

import { useMemo, useState } from 'react'
import { Goal } from '@/lib/types'
import { Button } from '@/components/ui/button'

type Scope = 'day' | 'week' | 'month' | 'year'

export function VisionBoard({
  goals,
}: {
  goals: Goal[]
}) {
  const [scope, setScope] = useState<Scope>('month')

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const scopedGoals = useMemo(() => {
    return goals.filter((g) => {
      if (!g.due_date) return false
      const d = new Date(g.due_date)
      d.setHours(0, 0, 0, 0)

      if (scope === 'day') {
        return d.getTime() === now.getTime()
      }

      if (scope === 'week') {
        const start = new Date(now)
        start.setDate(now.getDate() - now.getDay())
        const end = new Date(start)
        end.setDate(start.getDate() + 7)
        return d >= start && d < end
      }

      if (scope === 'month') {
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        )
      }

      return d.getFullYear() === now.getFullYear()
    })
  }, [goals, scope])

  const words = useMemo(() => {
    const map: Record<string, number> = {}

    scopedGoals.forEach((g) => {
      g.title
        .toLowerCase()
        .split(/\s+/)
        .forEach((w) => {
          if (w.length < 3) return
          map[w] = (map[w] ?? 0) + 1
        })
    })

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
  }, [scopedGoals])

  if (words.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No goals for this period
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* SCOPE CONTROLS */}
      <div className="flex gap-2 flex-wrap justify-center">
        {(['day', 'week', 'month', 'year'] as const).map(
          (s) => (
            <Button
              key={s}
              size="sm"
              variant={scope === s ? 'default' : 'outline'}
              onClick={() => setScope(s)}
              className="capitalize"
            >
              {s}
            </Button>
          )
        )}
      </div>

      {/* WORD CLOUD */}
      <div className="relative min-h-[220px] flex flex-wrap justify-center items-center gap-x-4 gap-y-3 px-4">
        {words.map(([word, weight], i) => {
          const size = Math.min(36, 14 + weight * 6)
          const opacity = Math.min(1, 0.45 + weight * 0.15)
          const rotate =
            i % 7 === 0 ? '-rotate-6' : i % 5 === 0 ? 'rotate-6' : ''

          return (
            <span
              key={word}
              className={`font-semibold text-violet-700 transition-all duration-300 ${rotate}`}
              style={{
                fontSize: `${size}px`,
                opacity,
              }}
            >
              {word}
            </span>
          )
        })}
      </div>
    </div>
  )
}
