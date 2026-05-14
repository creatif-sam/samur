'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BudgetEditModal from './BudgetEditModal'
import { cn } from '@/lib/utils'
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

      {/* ── SCOPE TOGGLE ──────────────────────────── */}
      <div className="flex gap-1 bg-muted/50 rounded-2xl p-1">
        {(['week', 'month'] as const).map(s => (
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
            {s === 'week' ? t.money.week : t.money.month}
          </button>
        ))}
      </div>

      {/* ── MONTH / YEAR SELECTORS ─────────────────── */}
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
              const y = now.getFullYear() - i
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
        </div>
      )}

      {/* ── HERO BUDGET CARD ──────────────────────── */}
      <div className={cn(
        'relative overflow-hidden rounded-3xl p-5 shadow-xl',
        percent > 50
          ? 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-900/30'
          : percent > 20
          ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-900/30'
          : totalBudget
          ? 'bg-gradient-to-br from-red-600 to-rose-700 shadow-red-900/30'
          : 'bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-900 shadow-violet-900/30'
      )}>
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/5" />
        <div className="absolute right-14 -top-8 w-28 h-28 rounded-full bg-white/5" />

        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-4">
          {scope === 'week'
            ? t.money.week
            : `${new Date(year, month).toLocaleString(undefined, { month: 'long' })} ${year}`
          } · Budget
        </p>

        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-0.5">{t.money.remaining}</p>
              <p className="text-5xl font-black text-white leading-none">{remaining}</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t.money.budget}</p>
                <p className="text-xl font-black text-white">{totalBudget ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t.money.spent}</p>
                <p className="text-xl font-black text-white">{spentTotal}</p>
              </div>
            </div>
          </div>

          {/* Circular progress ring */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
              <circle
                cx="40" cy="40" r="32" fill="none" stroke="white" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - percent / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-black text-white leading-none">{percent}%</p>
              <p className="text-[9px] font-bold text-white/50 uppercase">Left</p>
            </div>
          </div>
        </div>

        {/* Allocation note */}
        {totalBudget && totalBudget > 0 && (
          <div className="mt-3 pt-3 border-t border-white/15 relative z-10">
            {unallocated < 0 ? (
              <p className="text-xs text-white/70 font-medium">⚠️ {Math.abs(unallocated)} over-allocated across categories</p>
            ) : unallocated > 0 ? (
              <p className="text-xs text-white/60 font-medium">{unallocated} still unallocated</p>
            ) : (
              <p className="text-xs text-white/60 font-medium">✓ Fully allocated</p>
            )}
          </div>
        )}
      </div>

      {/* ── SET TOTAL BUDGET ──────────────────────── */}
      <button
        onClick={() => {
          setBudgetModalTitle(t.money.setTotalBudget)
          setBudgetTarget('total')
          setTotalInput(totalBudget?.toString() ?? '')
          setBudgetModalOpen(true)
        }}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-violet-500/40 text-violet-500 text-sm font-bold hover:bg-violet-500/5 transition-all"
      >
        {totalBudget ? `✏️ ${t.money.setTotalBudget}` : `+ ${t.money.setTotalBudget}`}
      </button>

      {/* ── CATEGORY CARDS ────────────────────────── */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-black tracking-tight px-1">Categories</h3>
          {categories.map(c => {
            const ratio    = c.budget > 0 ? c.spent / c.budget : 0
            const barColor = ratio >= 1 ? 'bg-red-500' : ratio >= 0.8 ? 'bg-amber-400' : 'bg-emerald-500'
            const overBudget = ratio >= 1
            const nearLimit  = ratio >= 0.8 && ratio < 1

            return (
              <div key={c.id} className="bg-muted/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-xl flex-shrink-0">
                      {c.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {c.spent} / {c.budget > 0 ? c.budget : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {overBudget && (
                      <span className="text-[10px] font-bold text-red-500">{t.money.overBudget}</span>
                    )}
                    {nearLimit && (
                      <span className="text-[10px] font-bold text-amber-500">{t.money.nearLimit}</span>
                    )}
                    <button
                      onClick={() => {
                        setBudgetModalTitle(`${t.money.setBudget} ${c.name}`)
                        setBudgetTarget(c.id)
                        setCategoryInput(c.budget.toString())
                        setBudgetModalOpen(true)
                      }}
                      className="text-[11px] font-bold text-violet-500 hover:text-violet-400 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10"
                    >
                      {c.budget > 0 ? 'Edit' : 'Set'}
                    </button>
                  </div>
                </div>

                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${Math.min(100, ratio * 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL ─────────────────────────────────── */}
      <BudgetEditModal
        open={budgetModalOpen}
        title={budgetModalTitle}
        amount={budgetTarget === 'total' ? totalInput : categoryInput}
        onChange={v =>
          budgetTarget === 'total' ? setTotalInput(v) : setCategoryInput(v)
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
