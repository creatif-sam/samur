'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BudgetEditModal from './BudgetEditModal'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/contexts/TranslationContext'
import { checkMonthlyBudgetAlerts } from '@/lib/money/checkMonthlyBudgetAlerts'
import { toast } from 'sonner'

type Scope = 'week' | 'month'

type MoneyCategory = {
  id: string
  name: string
  icon: string
}

type CategoryBudget = {
  id: string
  name: string
  icon: string
  budget: number
  spent: number
}

export default function MoneyBudget() {
  const supabase = createClient()
  const { t } = useTranslation()
  const now = new Date()

  const [scope, setScope] = useState<Scope>('month')
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())

  const [budgetId, setBudgetId] = useState<string | null>(null)
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
  const periodStartKey = periodStart.toISOString().slice(0, 10)
  const periodEndKey = periodEnd.toISOString().slice(0, 10)

  const loadBudgetState = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: budget, error: budgetError }, { data: baseCategories, error: categoriesError }] = await Promise.all([
      supabase
        .from('money_budget_periods')
        .select('id, total_budget')
        .eq('user_id', user.id)
        .eq('scope', scope)
        .eq('period_start', periodStartKey)
        .maybeSingle(),
      supabase
        .from('money_categories')
        .select('id, name, icon')
        .eq('user_id', user.id)
        .order('name'),
    ])

    if (budgetError) {
      toast.error('Failed to load budget', {
        description: budgetError.message,
      })
      return
    }

    if (categoriesError) {
      toast.error('Failed to load categories', {
        description: categoriesError.message,
      })
      return
    }

    setBudgetId(budget?.id ?? null)
    setTotalBudget(budget?.total_budget ?? null)

    const safeCategories = (baseCategories ?? []) as MoneyCategory[]

    if (!budget?.id) {
      setCategories(
        safeCategories.map(category => ({
          ...category,
          budget: 0,
          spent: 0,
        }))
      )
      return
    }

    const { data: allocations, error: allocationsError } = await supabase
      .from('money_budget_allocations')
      .select('amount, category_id')
      .eq('user_id', user.id)
      .eq('budget_period_id', budget.id)

    if (allocationsError) {
      toast.error('Failed to load sub-budgets', {
        description: allocationsError.message,
      })
      return
    }

    const allocationMap = new Map(
      (allocations ?? []).map(allocation => [
        allocation.category_id,
        allocation.amount,
      ])
    )

    setCategories(
      safeCategories.map(category => ({
        ...category,
        budget: allocationMap.get(category.id) ?? 0,
        spent: 0,
      }))
    )
  }, [periodStartKey, scope, supabase])

  const loadSpending = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('money_entries')
      .select('amount, category_id')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('entry_date', periodStartKey)
      .lt('entry_date', periodEndKey)

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
  }, [periodEndKey, periodStartKey, supabase])

  const loadData = useCallback(async () => {
    await loadBudgetState()
    await loadSpending()
  }, [loadBudgetState, loadSpending])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function saveTotalBudget() {
    if (totalInput === '') return

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      scope,
      period_start: periodStartKey,
      period_end: periodEndKey,
      total_budget: Number(totalInput),
    }

    const query = budgetId
      ? supabase
          .from('money_budget_periods')
          .update(payload)
          .eq('id', budgetId)
          .eq('user_id', user.id)
          .select('id, total_budget')
          .single()
      : supabase
          .from('money_budget_periods')
          .insert(payload)
          .select('id, total_budget')
          .single()

    const { data, error } = await query

    if (error) {
      toast.error('Failed to save budget', {
        description: error.message,
      })
      return
    }

    setBudgetId(data.id)
    setTotalBudget(data.total_budget)
    setTotalInput('')
    await checkMonthlyBudgetAlerts()
  }

  async function saveCategoryBudget(categoryId: string) {
    if (categoryInput === '') return

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    let nextBudgetId = budgetId

    if (!nextBudgetId) {
      const { data: createdBudget, error: createdBudgetError } = await supabase
        .from('money_budget_periods')
        .insert({
          user_id: user.id,
          scope,
          period_start: periodStartKey,
          period_end: periodEndKey,
          total_budget: totalBudget ?? 0,
        })
        .select('id')
        .single()

      if (createdBudgetError) {
        toast.error('Failed to create budget period', {
          description: createdBudgetError.message,
        })
        return
      }

      nextBudgetId = createdBudget.id
      setBudgetId(createdBudget.id)
    }

    const amount = Number(categoryInput)

    const query =
      amount <= 0
        ? supabase
            .from('money_budget_allocations')
            .delete()
            .eq('user_id', user.id)
            .eq('budget_period_id', nextBudgetId)
            .eq('category_id', categoryId)
        : supabase.from('money_budget_allocations').upsert(
            {
              user_id: user.id,
              budget_period_id: nextBudgetId,
              category_id: categoryId,
              amount,
            },
            {
              onConflict: 'budget_period_id,category_id',
            }
          )

    const { error } = await query

    if (error) {
      toast.error('Failed to save sub-budget', {
        description: error.message,
      })
      return
    }

    setCategories(prev =>
      prev.map(c =>
        c.id === categoryId
          ? { ...c, budget: amount > 0 ? amount : 0 }
          : c
      )
    )

    setCategoryInput('')
  }

  const spentTotal = categories.reduce(
    (a, b) => a + b.spent,
    0
  )
  const allocatedTotal = categories.reduce(
    (sum, category) => sum + category.budget,
    0
  )

  const remaining =
    totalBudget !== null
      ? Math.max(0, totalBudget - spentTotal)
      : 0
  const unallocated =
    totalBudget !== null ? totalBudget - allocatedTotal : 0

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
            {s === 'week' ? t.money.week : t.money.month}
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
      <div className="text-center space-y-2">
        <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
          {remaining}
        </div>
        <div className="text-sm text-muted-foreground">
          {t.money.remaining} ({percent}%)
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">{t.money.budget}</div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">{totalBudget ?? 0}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">{t.money.spent}</div>
            <div className="text-lg font-semibold text-red-600 dark:text-red-400">{spentTotal}</div>
          </div>
        </div>
        {totalBudget && totalBudget > 0 && (
          <>
            <div className="text-xs text-muted-foreground mt-2">
              {Math.round((spentTotal / totalBudget) * 100)}% of budget used
            </div>
            <div className="text-xs text-muted-foreground">
              {allocatedTotal} allocated to sub-budgets
            </div>
            <div className={`text-xs ${unallocated < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {unallocated < 0
                ? `${Math.abs(unallocated)} over-allocated across categories`
                : `${unallocated} still unallocated`}
            </div>
          </>
        )}
      </div>

      <Button
        variant="outline"
        onClick={() => {
          setBudgetModalTitle(t.money.setTotalBudget)
          setBudgetTarget('total')
          setTotalInput(totalBudget?.toString() ?? '')
          setBudgetModalOpen(true)
        }}
      >
        {t.money.setTotalBudget}
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
                    setBudgetModalTitle(`${t.money.setBudget} ${c.name}`)
                    setBudgetTarget(c.id)
                    setCategoryInput(c.budget.toString())
                    setBudgetModalOpen(true)
                  }}
                >
                  {t.money.setBudget}
                </Button>

              </div>

              <div className="flex justify-between text-xs">
                <span>
                  {c.spent} / {c.budget}
                </span>
                {ratio >= 1 && (
                  <span className="text-red-600">
                    {t.money.overBudget}
                  </span>
                )}
                {ratio >= 0.8 && ratio < 1 && (
                  <span className="text-yellow-600">
                    {t.money.nearLimit}
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
