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
  // Daily target in minutes, drawn as one bold green line
  target: number
  // Draw-in animation; turn off for screenshots or reduced motion
  animate?: boolean
}

const GREEN = '#16a34a'

// Round the top of the chart up to a tidy step so labels stay few and readable
function niceAxis(top: number, steps: number[], maxTicks: number) {
  const step = steps.find(s => top / s <= maxTicks) ?? steps[steps.length - 1]
  const yMax = Math.max(Math.ceil(top / step), 2) * step
  return { yMax, ticks: Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step) }
}

export default function PrayerMonthGraph({ days, month, mode, onModeChange, formatMinutes, target, animate = true }: Props) {
  // Only this month's days; future days and days before you started have no value so the line stops there
  const { data, lastCounted, hitDays, countedDays } = useMemo(() => {
    let running = 0
    let hit = 0
    let counted = 0
    let last = 0
    const rows = days
      .filter(d => d.date.getMonth() === month)
      .map(d => {
        const isCounted = d.state === 'prayed' || d.state === 'missed'
        if (isCounted) {
          running += d.totalMinutes
          counted++
          last = d.date.getDate()
          if (d.totalMinutes >= target) hit++
        }
        return {
          day: d.date.getDate(),
          label: d.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
          value: isCounted ? (mode === 'daily' ? d.totalMinutes : running) : null,
        }
      })
    return { data: rows, lastCounted: last, hitDays: hit, countedDays: counted }
  }, [days, month, mode, target])

  const hasData = data.some(d => d.value !== null && d.value > 0)
  const best = data.reduce((m, d) => Math.max(m, d.value ?? 0), 0)
  const runningNow = mode === 'total' ? best : 0
  const paceNow = target * lastCounted
  const lastDay = data.length

  // The target must always fit on the chart, even in a quiet month
  const { yMax, ticks: yTicks } = mode === 'daily'
    ? niceAxis(Math.max(best, target) + 5, [30, 60, 120, 180], 6)
    : niceAxis(Math.max(best, paceNow) * 1.1, [30, 60, 120, 300, 600, 1200], 4)

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
              isAnimationActive={animate}
            />
            {/* The one target line. Running total shows it as a pace line, only up to today. */}
            {mode === 'daily' ? (
              <ReferenceLine
                y={target}
                stroke={GREEN}
                strokeWidth={3}
                ifOverflow="extendDomain"
              />
            ) : lastCounted > 0 ? (
              <ReferenceLine
                segment={[{ x: 1, y: target }, { x: lastCounted, y: paceNow }]}
                stroke={GREEN}
                strokeWidth={3}
                ifOverflow="extendDomain"
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
        {!hasData && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-muted-foreground">No prayer time logged this month yet</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/40 pt-3 text-[11px] font-bold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-5 rounded-full" style={{ backgroundColor: GREEN }} />
          {mode === 'daily' ? `Target ${formatMinutes(target)} a day` : `Pace at ${formatMinutes(target)} a day`}
        </span>
        {countedDays > 0 && mode === 'daily' && (
          <span className="ml-auto font-semibold">Reached on {hitDays} of {countedDays} days{best > 0 ? ` · best ${formatMinutes(best)}` : ''}</span>
        )}
        {countedDays > 0 && mode === 'total' && (
          <span className={clsx('ml-auto font-semibold', runningNow >= paceNow ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')}>
            {runningNow >= paceNow
              ? `${formatMinutes(runningNow - paceNow)} ahead of pace`
              : `${formatMinutes(paceNow - runningNow)} behind pace`}
          </span>
        )}
      </div>
    </div>
  )
}
