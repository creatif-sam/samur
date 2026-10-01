'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react'
import { formatWeekRange, parseDateKey, toLocalDateKey, weekStart, yearOptions } from '@/lib/money/dates'
import { useMoneyFormat } from '@/lib/money/useMoneyFormat'
import { useTranslation } from '@/contexts/TranslationContext'

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

// Bucket for entries without a category so they still count in the totals
const UNCATEGORIZED_ID = '__uncategorized__'

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
  const { t } = useTranslation()
  const { format } = useMoneyFormat()
  const initialDate = new Date()

  const [mode, setMode] = useState<Mode>('expense')
  const [scope, setScope] = useState<Scope>('month')
  const [month, setMonth] = useState(initialDate.getMonth())
  const [year, setYear] = useState(initialDate.getFullYear())
  const [weekOffset, setWeekOffset] = useState(0)
  const weekLabel = formatWeekRange(weekOffset, t.money.weekRange)
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
      start = weekStart(weekOffset)
      end = weekStart(weekOffset + 1)
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
      .gte('entry_date', toLocalDateKey(start))
      .lt('entry_date', toLocalDateKey(end))

    setEntries((data ?? []) as MoneyChartEntry[])
  }, [mode, month, scope, supabase, weekOffset, year])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const categories = useMemo<CategoryTotal[]>(() => {
    const map: Record<string, CategoryTotal> = {}

    entries.forEach(e => {
      const c =
        (Array.isArray(e.money_categories)
          ? e.money_categories[0]
          : e.money_categories) ?? {
          id: UNCATEGORIZED_ID,
          name: t.money.uncategorized,
          icon: '💰',
        }

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
  }, [entries, t])

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

        return (category?.id ?? UNCATEGORIZED_ID) === selectedCategory.id
      })
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
  }, [entries, selectedCategory])

  return (
    <div className="space-y-4 pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-2 font-semibold">
        {mode === 'expense' ? (
          <ArrowDownCircle className="text-red-500" />
        ) : (
          <ArrowUpCircle className="text-green-500" />
        )}
        {mode === 'expense' ? t.money.expenses : t.money.income}
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
          {t.money.expenses}
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
          {t.money.income}
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
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground'
            }`}
          >
            {s === 'week' ? t.money.week : s === 'month' ? t.money.month : t.money.year}
          </Button>
        ))}
      </div>

      {/* DATE CONTROLS */}
      {scope === 'week' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="flex-1"
          >
            {t.previous}
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeekOffset(0)}
            className="flex-1"
          >
            {t.planner.thisWeek}
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="flex-1"
          >
            {t.next}
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
            {yearOptions().map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {scope === 'year' && (
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="w-full border rounded-lg px-2 py-1"
        >
          {yearOptions().map(y => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      )}

      {/* DONUT */}
      <div className="h-56">
        {categories.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            {t.money.noData}
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
          {t.money.total} · {mode === 'expense' ? t.money.expenses : t.money.income}
        </div>
        <div className="text-2xl font-semibold">
          {format(totalAmount)}
        </div>
      </div>

      {/* CATEGORY LIST */}
      <div className="space-y-3">
        {categories.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCategory(c)}
            className="w-full space-y-1 rounded-lg p-2 text-left transition-colors hover:bg-muted/40"
          >
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
                {format(c.total)}
              </div>
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${c.percent}%`,
                  background: c.color,
                }}
              />
            </div>
          </button>
        ))}
      </div>

      {selectedCategory && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-background w-[92%] max-w-md rounded-2xl p-4 space-y-4 mb-24 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className="absolute right-3 top-3 text-muted-foreground"
            >
              <X size={18} />
            </button>

            <div className="pr-8">
              <div className="text-sm text-muted-foreground">
                {mode === 'expense' ? t.money.expensesInCategory : t.money.incomeInCategory}
              </div>
              <div className="text-base font-semibold flex items-center gap-2">
                <span>{selectedCategory.icon}</span>
                <span>{selectedCategory.name}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t.money.categoryTotal.replace('{amount}', format(selectedCategory.total))}
              </div>
            </div>

            {selectedCategoryCosts.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {t.money.noEntriesInCategory}
              </div>
            ) : (
              <div className="space-y-2">
                {selectedCategoryCosts.map(item => (
                  <div
                    key={item.id}
                    className="rounded-lg border p-3 flex justify-between items-start gap-2"
                  >
                    <div>
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {parseDateKey(item.entry_date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      {format(item.amount)}
                    </div>
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
