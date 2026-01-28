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
import { Input } from '@/components/ui/input'

type Scope = 'week' | 'month'

type CategoryBudget = {
  id: string
  name: string
  icon: string
  budget: number
  spent: number
}

export default function MoneyBudget() {
  const supabase = createClient()
  const now = new Date()

  const [scope, setScope] = useState<Scope>('month')
  const [totalBudget, setTotalBudget] = useState<number | null>(null)
  const [spentTotal, setSpentTotal] = useState(0)
  const [editTotal, setEditTotal] = useState(false)
  const [totalInput, setTotalInput] = useState('')

  const [categories, setCategories] = useState<CategoryBudget[]>([])
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [categoryInput, setCategoryInput] = useState('')

  const periodStart =
    scope === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - now.getDay()
        )

  const periodEnd =
    scope === 'month'
      ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
      : new Date(periodStart.getTime() + 7 * 86400000)

  useEffect(() => {
    loadTotalBudget()
    loadCategoryBudgets()
    loadSpending()
  }, [scope])

  async function loadTotalBudget() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('money_budgets')
      .select('amount')
      .eq('user_id', user.id)
      .eq('scope', scope)
      .eq('period_start', periodStart.toISOString().slice(0, 10))
      .single()

    setTotalBudget(data?.amount ?? null)
  }

  async function loadSpending() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('money_entries')
      .select('amount, category_id')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('entry_date', periodStart.toISOString())
      .lt('entry_date', periodEnd.toISOString())

    const totals: Record<string, number> = {}
    let total = 0

    data?.forEach(e => {
      total += e.amount
      if (e.category_id) {
        totals[e.category_id] =
          (totals[e.category_id] ?? 0) + e.amount
      }
    })

    setSpentTotal(total)

    setCategories(prev =>
      prev.map(c => ({
        ...c,
        spent: totals[c.id] ?? 0,
      }))
    )
  }

  async function loadCategoryBudgets() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('money_category_budgets')
      .select(
        'amount, category_id, money_categories(id, name, icon)'
      )
      .eq('user_id', user.id)
      .eq('scope', scope)
      .eq('period_start', periodStart.toISOString().slice(0, 10))

    const rows =
      data?.map(d => ({
        id: d.money_categories.id,
        name: d.money_categories.name,
        icon: d.money_categories.icon,
        budget: d.amount,
        spent: 0,
      })) ?? []

    setCategories(rows)
  }

  async function saveTotalBudget() {
    if (!totalInput) return

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('money_budgets').upsert({
      user_id: user.id,
      scope,
      period_start: periodStart.toISOString().slice(0, 10),
      amount: Number(totalInput),
    })

    setTotalBudget(Number(totalInput))
    setEditTotal(false)
  }

  async function saveCategoryBudget(categoryId: string) {
    if (!categoryInput) return

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('money_category_budgets').upsert({
      user_id: user.id,
      category_id: categoryId,
      scope,
      period_start: periodStart.toISOString().slice(0, 10),
      amount: Number(categoryInput),
    })

    setCategories(prev =>
      prev.map(c =>
        c.id === categoryId
          ? { ...c, budget: Number(categoryInput) }
          : c
      )
    )

    setEditingCategory(null)
    setCategoryInput('')
  }

  const remaining = totalBudget
    ? Math.max(0, totalBudget - spentTotal)
    : 0

  const percent =
    totalBudget && totalBudget > 0
      ? Math.max(0, (remaining / totalBudget) * 100)
      : 100

  const donutData = [
    { value: percent },
    { value: 100 - percent },
  ]

  return (
    <div className="space-y-4 pb-24">
      {/* SCOPE */}
      <div className="flex gap-2 rounded-xl bg-muted p-1">
        {(['week', 'month'] as const).map(s => (
          <Button
            key={s}
            variant="ghost"
            onClick={() => setScope(s)}
            className={`flex-1 ${
              scope === s
                ? 'bg-black text-white'
                : 'text-muted-foreground'
            }`}
          >
            {s}
          </Button>
        ))}
      </div>

      {/* DONUT */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              innerRadius={70}
              outerRadius={90}
              startAngle={90}
              endAngle={-270}
            >
              <Cell fill="#facc15" />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* TOTAL BUDGET */}
      <div className="text-center space-y-1">
        <div className="text-sm">
          Remaining {Math.round(percent)}%
        </div>
        <div className="text-xs text-muted-foreground">
          Budget {totalBudget ?? 0} | Spent {spentTotal}
        </div>
      </div>

      {editTotal ? (
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Set total budget"
            value={totalInput}
            onChange={e => setTotalInput(e.target.value)}
          />
          <Button onClick={saveTotalBudget}>Save</Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setEditTotal(true)}
        >
          Set total budget
        </Button>
      )}

      {/* CATEGORY BUDGETS */}
      <div className="space-y-3">
        {categories.map(c => {
          const ratio =
            c.budget > 0 ? c.spent / c.budget : 0

          const color =
            ratio >= 1
              ? 'bg-red-500'
              : ratio >= 0.8
              ? 'bg-yellow-400'
              : 'bg-green-500'

          return (
            <div key={c.id} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>{c.icon}</span>
                  <span className="text-sm">{c.name}</span>
                </div>

                {editingCategory === c.id ? (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      className="w-20"
                      value={categoryInput}
                      onChange={e =>
                        setCategoryInput(e.target.value)
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        saveCategoryBudget(c.id)
                      }
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingCategory(c.id)
                      setCategoryInput(c.budget.toString())
                    }}
                  >
                    Set
                  </Button>
                )}
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {c.spent} / {c.budget}
                </span>
                {ratio >= 1 && (
                  <span className="text-red-600">
                    Over budget
                  </span>
                )}
                {ratio >= 0.8 && ratio < 1 && (
                  <span className="text-yellow-600">
                    Near limit
                  </span>
                )}
              </div>

              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${color}`}
                  style={{
                    width: `${Math.min(100, ratio * 100)}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
