'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BudgetEditModal from './BudgetEditModal'
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
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())

  const [totalBudget, setTotalBudget] = useState<number | null>(null)
  const [totalInput, setTotalInput] = useState('')



const [budgetModalOpen, setBudgetModalOpen] = useState(false)
const [budgetModalTitle, setBudgetModalTitle] = useState('')
const [budgetTarget, setBudgetTarget] =
  useState<'total' | string | null>(null)


  const [categories, setCategories] = useState<CategoryBudget[]>([])
  
  const [categoryInput, setCategoryInput] = useState('')

  const periodStart =
    scope === 'month'
      ? new Date(year, month, 1)
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - now.getDay()
        )

  const periodEnd =
    scope === 'month'
      ? new Date(year, month + 1, 1)
      : new Date(periodStart.getTime() + 7 * 86400000)

  useEffect(() => {
    loadBudgets()
    loadSpending()
  }, [scope, month, year])

  async function loadBudgets() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: total } = await supabase
      .from('money_budgets')
      .select('amount')
      .eq('user_id', user.id)
      .eq('scope', scope)
      .eq('period_start', periodStart.toISOString().slice(0, 10))
      .single()

    setTotalBudget(total?.amount ?? null)

  const { data: cats } = await supabase
  .from('money_category_budgets')
  .select(
    'amount, category_id, money_categories!inner(id, name, icon)'
  )

      .eq('user_id', user.id)
      .eq('scope', scope)
      .eq('period_start', periodStart.toISOString().slice(0, 10))

    setCategories(
  (cats ?? []).map(c => {
    const cat = Array.isArray(c.money_categories)
      ? c.money_categories[0]
      : c.money_categories

    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      budget: c.amount,
      spent: 0,
    }
  })
)
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

    data?.forEach(e => {
      if (e.category_id) {
        totals[e.category_id] =
          (totals[e.category_id] ?? 0) + e.amount
      }
    })

    setCategories(prev =>
      prev.map(c => ({
        ...c,
        spent: totals[c.id] ?? 0,
      }))
    )
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
    setTotalInput('')
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


    
    setCategoryInput('')
  }

  const spentTotal = categories.reduce(
    (a, b) => a + b.spent,
    0
  )

  const remaining =
    totalBudget !== null
      ? Math.max(0, totalBudget - spentTotal)
      : 0

  const percent =
    totalBudget && totalBudget > 0
      ? Math.round((remaining / totalBudget) * 100)
      : 100

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

      {/* MONTH YEAR */}
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

      {/* DONUT */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { value: percent },
                { value: 100 - percent },
              ]}
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

      {/* TOTAL */}
      <div className="text-center space-y-1">
        <div className="text-sm">
          Remaining {percent}%
        </div>
        <div className="text-xs text-muted-foreground">
          Budget {totalBudget ?? 0} | Spent {spentTotal}
        </div>
      </div>

   <Button
  variant="outline"
  onClick={() => {
    setBudgetModalTitle('Set total budget')
    setBudgetTarget('total')
    setTotalInput(totalBudget?.toString() ?? '')
    setBudgetModalOpen(true)
  }}
>
  Set total budget
</Button>


      {/* CATEGORY ROWS */}
      <div className="space-y-3">
        {categories.map(c => {
          const ratio =
            c.budget > 0 ? c.spent / c.budget : 0

          const barColor =
            ratio >= 1
              ? 'bg-red-500'
              : ratio >= 0.8
              ? 'bg-yellow-400'
              : 'bg-green-500'

          return (
            <div key={c.id} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <span>{c.icon}</span>
                  <span className="text-sm">{c.name}</span>
                </div>

               <Button
  size="sm"
  variant="outline"
  onClick={() => {
    setBudgetModalTitle(`Set ${c.name} budget`)
    setBudgetTarget(c.id)
    setCategoryInput(c.budget.toString())
    setBudgetModalOpen(true)
  }}
>
  Set
</Button>

              </div>

              <div className="flex justify-between text-xs">
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

              <div className="h-2 bg-muted rounded-full">
                <div
                  className={`h-full ${barColor}`}
                  style={{
                    width: `${Math.min(
                      100,
                      ratio * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>


        {/* BUDGET MODAL */}
        <BudgetEditModal
  open={budgetModalOpen}
  title={budgetModalTitle}
  amount={
    budgetTarget === 'total'
      ? totalInput
      : categoryInput
  }
  onChange={v =>
    budgetTarget === 'total'
      ? setTotalInput(v)
      : setCategoryInput(v)
  }
  onSave={async () => {
    if (budgetTarget === 'total') {
      await saveTotalBudget()
    } else if (budgetTarget) {
      await saveCategoryBudget(budgetTarget)
    }
    setBudgetModalOpen(false)
  }}
  onClose={() => setBudgetModalOpen(false)}
/>


    </div>
  )
}
