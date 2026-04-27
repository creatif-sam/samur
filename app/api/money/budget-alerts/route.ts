import { pushNotificationService } from '@/lib/push-notifications'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MONTHLY_THRESHOLDS = [50, 75, 90, 95] as const

function getCurrentMonthWindow() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    monthLabel: start.toLocaleString(undefined, {
      month: 'long',
      year: 'numeric',
    }),
  }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodStart, periodEnd, monthLabel } = getCurrentMonthWindow()

    const { data: budgetPeriod, error: budgetError } = await supabase
      .from('money_budget_periods')
      .select('id, total_budget')
      .eq('user_id', user.id)
      .eq('scope', 'month')
      .eq('period_start', periodStart)
      .maybeSingle()

    if (budgetError) {
      return NextResponse.json(
        { error: 'Failed to load budget period', details: budgetError.message },
        { status: 500 }
      )
    }

    if (!budgetPeriod || Number(budgetPeriod.total_budget) <= 0) {
      return NextResponse.json({ sent: [], spentPercent: 0 })
    }

    const [{ data: expenses, error: expensesError }, { data: sentAlerts, error: alertsError }] =
      await Promise.all([
        supabase
          .from('money_entries')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .gte('entry_date', periodStart)
          .lt('entry_date', periodEnd),
        supabase
          .from('money_budget_threshold_alerts')
          .select('threshold_percent')
          .eq('user_id', user.id)
          .eq('budget_period_id', budgetPeriod.id),
      ])

    if (expensesError || alertsError) {
      return NextResponse.json(
        {
          error: 'Failed to load monthly spending state',
          details: expensesError?.message || alertsError?.message,
        },
        { status: 500 }
      )
    }

    const spent = (expenses ?? []).reduce(
      (sum, entry) => sum + Number(entry.amount ?? 0),
      0
    )
    const spentPercent = Math.floor((spent / Number(budgetPeriod.total_budget)) * 100)
    const sentThresholds = new Set((sentAlerts ?? []).map(alert => alert.threshold_percent))
    const thresholdsToSend = MONTHLY_THRESHOLDS.filter(
      threshold => spentPercent >= threshold && !sentThresholds.has(threshold)
    )

    if (thresholdsToSend.length === 0) {
      return NextResponse.json({ sent: [], spentPercent })
    }

    const insertedAlerts = thresholdsToSend.map(threshold => ({
      user_id: user.id,
      budget_period_id: budgetPeriod.id,
      threshold_percent: threshold,
    }))

    const { error: insertError } = await supabase
      .from('money_budget_threshold_alerts')
      .insert(insertedAlerts)

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to persist budget alerts', details: insertError.message },
        { status: 500 }
      )
    }

    for (const threshold of thresholdsToSend) {
      await pushNotificationService.sendToUser(
        user.id,
        {
          title: `Monthly Budget Alert: ${threshold}%`,
          body: `You have used ${spentPercent}% of your ${monthLabel} budget.`,
          data: {
            type: 'budget_threshold',
            threshold,
            spent,
            spentPercent,
            totalBudget: Number(budgetPeriod.total_budget),
            periodStart,
          },
          url: '/protected/planner/day',
        },
        'system'
      )
    }

    return NextResponse.json({ sent: thresholdsToSend, spentPercent })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    )
  }
}