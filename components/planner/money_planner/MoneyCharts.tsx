'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

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

type MoneyChartEntry = {
  id: string
  title: string
  amount: number
  entry_date: string
  money_categories:
    | {
        id: string
        name: string
        icon: string
      }
    | {
        id: string
        name: string
        icon: string
      }[]
    | null
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
  const initialDate = new Date()

  const [mode, setMode] = useState<Mode>('expense')
  const [scope, setScope] = useState<Scope>('month')
  const [month, setMonth] = useState(initialDate.getMonth())
  const [year, setYear] = useState(initialDate.getFullYear())
  const [weekOffset, setWeekOffset] = useState(0)
  const weekLabel = formatWeekRange(new Date(), weekOffset)
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryTotal | null>(null)

  const [entries, setEntries] = useState<MoneyChartEntry[]>([])

  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    let start: Date
    let end: Date

    if (scope === 'week') {
      const currentDate = new Date()
      const base = new Date(currentDate)
      base.setDate(
        currentDate.getDate() - currentDate.getDay() + weekOffset * 7
      )
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
      .select('id, title, amount, entry_date, money_categories(id, name, icon)')
      .eq('user_id', user.id)
      .eq('type', mode)
      .gte('entry_date', start.toISOString())
      .lt('entry_date', end.toISOString())

    setEntries((data ?? []) as MoneyChartEntry[])
  }, [mode, month, scope, supabase, weekOffset, year])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const categories = useMemo<CategoryTotal[]>(() => {
    const map: Record<string, CategoryTotal> = {}

    entries.forEach(e => {
      const c = Array.isArray(e.money_categories)
        ? e.money_categories[0]
        : e.money_categories
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

  const selectedCategoryCosts = useMemo(() => {
    if (!selectedCategory) return []

    return entries
      .filter(entry => {
        const category = Array.isArray(entry.money_categories)
          ? entry.money_categories[0]
          : entry.money_categories

        return category?.id === selectedCategory.id
      })
      .sort(
        (a, b) =>
          new Date(b.entry_date).getTime() -
          new Date(a.entry_date).getTime()
      )
  }, [entries, selectedCategory])

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

      {/* â”€â”€ MODE TOGGLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex gap-1 bg-muted/50 rounded-2xl p-1">
        <button
          onClick={() => setMode('expense')}
          className={cn(
            'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
            mode === 'expense'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          ðŸ“‰ Expenses
        </button>
        <button
          onClick={() => setMode('income')}
          className={cn(
            'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
            mode === 'income'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          ðŸ“ˆ Income
        </button>
      </div>

      {/* â”€â”€ SCOPE TOGGLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex gap-1 bg-muted/50 rounded-2xl p-1">
        {(['week', 'month', 'year'] as const).map(s => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all',
              scope === s
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* â”€â”€ WEEK NAV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {scope === 'week' && (
        <div className="space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="flex-1 py-2 bg-muted/40 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              â† Prev
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="flex-1 py-2 bg-muted/40 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              This Week
            </button>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="flex-1 py-2 bg-muted/40 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              Next â†’
            </button>
          </div>
          <p className="text-center text-[10px] font-medium text-muted-foreground">{weekLabel}</p>
        </div>
      )}

      {/* â”€â”€ MONTH SELECTOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {scope === 'month' && (
        <div className="flex gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="flex-1 bg-muted/40 border-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(0, i).toLocaleString(undefined, { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="w-24 bg-muted/40 border-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground"
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = initialDate.getFullYear() - i
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
        </div>
      )}

      {/* â”€â”€ YEAR SELECTOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {scope === 'year' && (
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="w-full bg-muted/40 border-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground"
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const y = initialDate.getFullYear() - i
            return <option key={y} value={y}>{y}</option>
          })}
        </select>
      )}

      {/* â”€â”€ DONUT CHART CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {mode === 'expense' ? 'Expense' : 'Income'} Distribution
          </p>
          <p className="text-lg font-black">{totalAmount.toFixed(2)}</p>
        </div>

        <div className="h-48">
          {categories.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <div className="text-3xl">{mode === 'expense' ? 'ðŸ“‰' : 'ðŸ“ˆ'}</div>
              <p className="text-xs font-medium text-muted-foreground">No data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="total"
                  innerRadius={55}
                  outerRadius={80}
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
      </div>

      {/* â”€â”€ CATEGORY CARDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-black tracking-tight px-1">Categories</h3>
          {categories.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c)}
              className="w-full bg-muted/30 rounded-2xl p-4 text-left transition-all hover:bg-muted/50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `${c.color}30` }}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-none">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{c.percent}% of total</p>
                  </div>
                </div>
                <p className="text-sm font-black">{c.total.toFixed(2)}</p>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${c.percent}%`, background: c.color }}
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* â”€â”€ CATEGORY DETAIL MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {selectedCategory && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-4"
          onClick={() => setSelectedCategory(null)}
        >
          <div
            className="bg-background w-full max-w-md rounded-3xl p-5 space-y-4 mb-20 max-h-[75vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${selectedCategory.color}30` }}
                >
                  {selectedCategory.icon}
                </div>
                <div>
                  <p className="font-black text-base">{selectedCategory.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {mode === 'expense' ? 'Expenses' : 'Income'} Â· {selectedCategory.total.toFixed(2)} total
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="p-2 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {selectedCategoryCosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No entries found.</p>
            ) : (
              <div className="space-y-2">
                {selectedCategoryCosts.map(item => (
                  <div
                    key={item.id}
                    className="bg-muted/30 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(item.entry_date).toLocaleDateString(undefined, {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </p>
                    </div>
                    <p className="text-sm font-black flex-shrink-0">{item.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
