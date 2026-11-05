'use client'

import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import clsx from 'clsx'

export type GraphMode = 'daily' | 'total'

interface DayPoint {
  date: Date
  totalMinutes: number
  state: 'before' | 'prayed' | 'missed' | 'future'
}

interface Props {
  days: DayPoint[]
  month: number
  mode: GraphMode
  onModeChange: (m: GraphMode) => void
  formatMinutes: (mins: number) => string
}

export default function PrayerMonthGraph({ days, month, mode, onModeChange, formatMinutes }: Props) {
  // Only this month's days; future days and days before you started have no value so the line stops there
  const data = useMemo(() => {
    let running = 0
    return days
      .filter(d => d.date.getMonth() === month)
      .map(d => {
        const counted = d.state === 'prayed' || d.state === 'missed'
        if (counted) running += d.totalMinutes
        return {
          day: d.date.getDate(),
          label: d.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
          value: counted ? (mode === 'daily' ? d.totalMinutes : running) : null,
        }
      })
  }, [days, month, mode])

  const hasData = data.some(d => d.value !== null && d.value > 0)
  const best = data.reduce((m, d) => Math.max(m, d.value ?? 0), 0)
  // Daily: steps of 30 minutes so the 30m / 60m guides sit on grid lines
  const yMax = mode === 'daily' ? Math.max(90, Math.ceil((best + 5) / 30) * 30) : Math.max(60, Math.ceil((best * 1.1) / 60) * 60)
  const step = mode === 'daily' ? 30 : Math.max(60, Math.ceil(yMax / 4 / 60) * 60)
  const yTicks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step)
  const lastDay = data.length

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {mode === 'daily' ? 'Minutes prayed each day' : 'Minutes prayed so far'}
        </p>
        <div className="flex rounded-full bg-muted/60 p-0.5">
          {(['daily', 'total'] as const).map(m => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={clsx(
                'rounded-full px-2.5 py-1 text-[10px] font-bold transition',
                mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              {m === 'daily' ? 'Daily' : 'Running total'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-56 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="prayerFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="currentColor" strokeOpacity={0.08} />
            <XAxis
              dataKey="day"
              type="number"
              domain={[1, lastDay]}
              ticks={[1, 8, 15, 22, lastDay]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.55 }}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={yTicks}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={46}
              // Short labels so they never clip: 30m, 1h, 90m, 2h
              tickFormatter={(v: number) => (v === 0 ? '0' : v % 60 === 0 ? `${v / 60}h` : `${v}m`)}
              tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
            />
            {mode === 'daily' && (
              <>
                <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.7} />
                <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.7} />
              </>
            )}
            <Tooltip
              cursor={{ stroke: '#8b5cf6', strokeOpacity: 0.3 }}
              contentStyle={{ borderRadius: 12, border: '1px solid rgba(127,127,127,0.2)', fontSize: 12, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
              labelFormatter={(_, p) => (p?.[0]?.payload as { label?: string } | undefined)?.label ?? ''}
              formatter={v => [formatMinutes(Number(v)), mode === 'daily' ? 'Prayed' : 'So far']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              fill="url(#prayerFill)"
              connectNulls={false}
              dot={{ r: 2.5, fill: '#8b5cf6', strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
        {!hasData && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-muted-foreground">No prayer time logged this month yet</p>
          </div>
        )}
      </div>

      {mode === 'daily' && (
        <div className="mt-3 flex items-center gap-4 border-t border-border/40 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-green-500" />60m goal</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" />30m</span>
          {best > 0 && <span className="ml-auto normal-case tracking-normal">Best day {formatMinutes(best)}</span>}
        </div>
      )}
    </div>
  )
}
