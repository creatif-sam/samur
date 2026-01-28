'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

type Mode = 'expense' | 'income'
type Scope = 'week' | 'month' | 'year'

type CategoryTotal = {
  id: string
  name: string
  icon: string
  total: number
  percent: number
  color: string
}

const COLORS = [
  '#facc15',
  '#60a5fa',
  '#fb7185',
  '#34d399',
  '#a78bfa',
  '#fb923c',
  '#22c55e',
]

export default function MoneyCharts() {
  const supabase = createClient()
  const now = new Date()

  const [mode, setMode] = useState<Mode>('expense')
  const [scope, setScope] = useState<Scope>('month')
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [weekOffset, setWeekOffset] = useState(0)
  const weekLabel = formatWeekRange(now, weekOffset)

  const [entries, setEntries] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [mode, scope, month, year, weekOffset])

  async function fetchData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    let start: Date
    let end: Date

    if (scope === 'week') {
      const base = new Date(now)
      base.setDate(now.getDate() - now.getDay() + weekOffset * 7)
      start = new Date(base)
      end = new Date(base)
      end.setDate(base.getDate() + 7)
    } else if (scope === 'month') {
      start = new Date(year, month, 1)
      end = new Date(year, month + 1, 1)
    } else {
      start = new Date(year, 0, 1)
      end = new Date(year + 1, 0, 1)
    }

    const { data } = await supabase
      .from('money_entries')
      .select('amount, type, money_categories(id, name, icon)')
      .eq('user_id', user.id)
      .eq('type', mode)
      .gte('entry_date', start.toISOString())
      .lt('entry_date', end.toISOString())

    setEntries(data ?? [])
  }

  const categories = useMemo<CategoryTotal[]>(() => {
    const map: Record<string, CategoryTotal> = {}

    entries.forEach(e => {
      const c = e.money_categories
      if (!c) return

      if (!map[c.id]) {
        map[c.id] = {
          id: c.id,
          name: c.name,
          icon: c.icon,
          total: 0,
          percent: 0,
          color: COLORS[Object.keys(map).length % COLORS.length],
        }
      }

      map[c.id].total += e.amount
    })

    const total = Object.values(map).reduce(
      (a, b) => a + b.total,
      0
    )

    return Object.values(map)
      .map(c => ({
        ...c,
        percent:
          total === 0
            ? 0
            : Number(((c.total / total) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.total - a.total)
  }, [entries])

  const totalAmount = categories.reduce(
    (a, b) => a + b.total,
    0
  )

function formatWeekRange(baseDate: Date, offset: number) {
  const start = new Date(baseDate)
  start.setDate(baseDate.getDate() - baseDate.getDay() + offset * 7)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const startLabel = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const endLabel = end.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return `${startLabel} to ${endLabel}`
}


  return (
    <div className="space-y-4 pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-2 font-semibold">
        {mode === 'expense' ? (
          <ArrowDownCircle className="text-red-500" />
        ) : (
          <ArrowUpCircle className="text-green-500" />
        )}
        {mode === 'expense' ? 'Expenses' : 'Income'}
      </div>

      {/* MODE TOGGLE */}
      <div className="flex gap-2 rounded-xl bg-muted p-1">
        <Button
          variant="ghost"
          onClick={() => setMode('expense')}
          className={`flex-1 rounded-lg ${
            mode === 'expense'
              ? 'bg-violet-600 text-white shadow'
              : 'text-muted-foreground'
          }`}
        >
          Expenses
        </Button>
        <Button
          variant="ghost"
          onClick={() => setMode('income')}
          className={`flex-1 rounded-lg ${
            mode === 'income'
              ? 'bg-violet-600 text-white shadow'
              : 'text-muted-foreground'
          }`}
        >
          Income
        </Button>
      </div>

      {/* SCOPE TOGGLE */}
      <div className="flex gap-2 rounded-xl bg-muted p-1">
        {(['week', 'month', 'year'] as const).map(s => (
          <Button
            key={s}
            variant="ghost"
            onClick={() => setScope(s)}
            className={`flex-1 rounded-lg capitalize ${
              scope === s
                ? 'bg-black text-white'
                : 'text-muted-foreground'
            }`}
          >
            {s}
          </Button>
        ))}
      </div>

      {/* DATE CONTROLS */}
      {scope === 'week' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setWeekOffset(weekOffset - 1)}

            
          >

            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeekOffset(0)}
          >
            This week
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeekOffset(weekOffset + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {scope === 'week' && (
  <div className="text-center text-sm text-muted-foreground">
    {weekLabel}
  </div>
)}


      {scope === 'month' && (
        <div className="flex gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="flex-1 border rounded-lg px-2 py-1"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(0, i).toLocaleString(undefined, {
                  month: 'long',
                })}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="flex-1 border rounded-lg px-2 py-1"
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = now.getFullYear() - i
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            })}
          </select>
        </div>
      )}

      {scope === 'year' && (
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="w-full border rounded-lg px-2 py-1"
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const y = now.getFullYear() - i
            return (
              <option key={y} value={y}>
                {y}
              </option>
            )
          })}
        </select>
      )}

      {/* DONUT */}
      <div className="h-56">
        {categories.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                dataKey="total"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {categories.map(c => (
                  <Cell key={c.id} fill={c.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* TOTAL */}
      <div className="text-center">
        <div className="text-xs text-muted-foreground">
          Total {mode}
        </div>
        <div className="text-2xl font-semibold">
          {totalAmount.toFixed(2)} MAD
        </div>
      </div>

      {/* CATEGORY LIST */}
      <div className="space-y-3">
        {categories.map(c => (
          <div key={c.id} className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ background: c.color }}
                >
                  {c.icon}
                </div>
                <div className="text-sm">
                  {c.name}{' '}
                  <span className="text-muted-foreground">
                    {c.percent}%
                  </span>
                </div>
              </div>
              <div className="text-sm font-medium">
                {c.total.toFixed(2)} MAD
              </div>
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${c.percent}%`,
                  background: '#facc15',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
