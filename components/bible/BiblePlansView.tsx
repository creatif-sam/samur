'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BookOpen, Check, ChevronRight, Loader2, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toLocalDateKey } from '@/lib/dates'
import {
  READING_PLANS, dayReading, formatReading, getPlan, planStatus,
  type PlanChapter, type PlanEnrollment,
} from '@/lib/bible/plans'

interface Props {
  userId: string | null
  translation: string
  openPassage: (book: string, chapter: number) => void
  markChaptersRead: (chapters: PlanChapter[]) => void
}

export function BiblePlansView({ userId, translation, openPassage, markChaptersRead }: Props) {
  const supabase = createClient()
  const today = toLocalDateKey(new Date())
  const [enrollments, setEnrollments] = useState<PlanEnrollment[]>([])
  const [partnerPlans, setPartnerPlans] = useState<PlanEnrollment[]>([])
  const [partnerName, setPartnerName] = useState('Partner')
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const [{ data, error }, { data: profile }] = await Promise.all([
        supabase.from('bible_plans').select('*').eq('user_id', userId),
        supabase.from('profiles').select('partner_id').eq('id', userId).maybeSingle(),
      ])
      if (error) { setUnavailable(true); setLoading(false); return }
      setEnrollments((data ?? []) as PlanEnrollment[])
      if (profile?.partner_id) {
        const [{ data: pPlans }, { data: pProfile }] = await Promise.all([
          supabase.from('bible_plans').select('*').eq('user_id', profile.partner_id),
          supabase.from('profiles').select('name').eq('id', profile.partner_id).maybeSingle(),
        ])
        setPartnerPlans((pPlans ?? []) as PlanEnrollment[])
        if (pProfile?.name) setPartnerName(pProfile.name)
      }
      setLoading(false)
    })()
  }, [userId])

  async function startPlan(planKey: string) {
    if (!userId) return
    setBusy(planKey)
    const { data, error } = await supabase
      .from('bible_plans')
      .upsert({ user_id: userId, plan_key: planKey, start_date: today, completed_days: [] }, { onConflict: 'user_id,plan_key' })
      .select()
      .single()
    setBusy(null)
    if (error) { toast.error(error.message || "Couldn't start the plan"); return }
    setEnrollments(prev => [...prev.filter(e => e.plan_key !== planKey), data as PlanEnrollment])
    toast.success(`Started ${getPlan(planKey)?.title} 📖`)
  }

  async function leavePlan(enrollment: PlanEnrollment) {
    if (!window.confirm(`Stop "${getPlan(enrollment.plan_key)?.title}"? Your progress in it will be removed.`)) return
    const { error } = await supabase.from('bible_plans').delete().eq('id', enrollment.id)
    if (error) { toast.error(error.message || "Couldn't stop the plan"); return }
    setEnrollments(prev => prev.filter(e => e.id !== enrollment.id))
  }

  async function completeDay(enrollment: PlanEnrollment, day: number, chapters: PlanChapter[]) {
    setBusy(enrollment.id)
    const completed = Array.from(new Set([...enrollment.completed_days, day])).sort((a, b) => a - b)
    const { error } = await supabase.from('bible_plans').update({ completed_days: completed }).eq('id', enrollment.id)
    setBusy(null)
    if (error) { toast.error(error.message || "Couldn't save your progress"); return }
    setEnrollments(prev => prev.map(e => (e.id === enrollment.id ? { ...e, completed_days: completed } : e)))
    markChaptersRead(chapters)
    toast.success(`Day ${day} done ✅`)
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
  if (unavailable) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">Reading plans need the latest database update. Run the reading plans migration in Supabase.</p>
  }

  const active = enrollments.map(e => ({ e, plan: getPlan(e.plan_key) })).filter(x => x.plan)
  const available = READING_PLANS.filter(p => !enrollments.some(e => e.plan_key === p.key))

  return (
    <div className="px-4 pt-4 pb-10 space-y-6">
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Your plans</h2>
          {active.map(({ e, plan }) => {
            const status = planStatus(plan!, e, today)
            const day = status.nextDay
            const chapters = day ? dayReading(plan!, day) : []
            const partner = partnerPlans.find(p => p.plan_key === e.plan_key)
            const partnerStatus = partner ? planStatus(plan!, partner, today) : null
            return (
              <div key={e.id} className="rounded-3xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black leading-tight">{plan!.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {status.finished ? 'Completed 🎉' : `Day ${day} of ${plan!.days}`}
                      {status.behind > 0 && ` · ${status.behind} day${status.behind > 1 ? 's' : ''} behind`}
                      {status.caughtUpToday && ' · ahead of schedule'}
                    </p>
                  </div>
                  <button onClick={() => leavePlan(e)} aria-label="Stop plan" className="p-1.5 rounded-full text-muted-foreground hover:bg-muted">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${status.percent}%` }} />
                </div>

                {!status.finished && (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                        {status.behind > 0 ? 'Next reading' : "Today's reading"}
                      </p>
                      <p className="text-sm font-semibold">{formatReading(chapters, translation)}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {chapters.map(c => (
                          <button
                            key={`${c.book}-${c.chapter}`}
                            onClick={() => openPassage(c.book, c.chapter)}
                            className="flex items-center gap-1 rounded-xl bg-muted px-2.5 py-1.5 text-xs font-semibold active:scale-95"
                          >
                            <BookOpen className="w-3 h-3" /> {c.book === chapters[0].book ? '' : `${c.book} `}{c.chapter}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => completeDay(e, day!, chapters)}
                      disabled={busy === e.id}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-violet-600 text-white py-2.5 text-sm font-bold disabled:opacity-60 active:scale-[0.98]"
                    >
                      {busy === e.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Mark day {day} done
                    </button>
                  </>
                )}

                {partnerStatus && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {partnerName}: {partnerStatus.finished ? 'finished' : `day ${partnerStatus.nextDay} · ${partnerStatus.percent}%`}
                  </p>
                )}
              </div>
            )
          })}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          {active.length > 0 ? 'More plans' : 'Start a reading plan'}
        </h2>
        {available.map(plan => {
          const partnerOn = partnerPlans.some(p => p.plan_key === plan.key)
          return (
            <button
              key={plan.key}
              onClick={() => startPlan(plan.key)}
              disabled={busy === plan.key}
              className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left active:bg-muted/60 disabled:opacity-60"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm">{plan.title}</p>
                <p className="text-[11px] text-muted-foreground">{plan.description}</p>
                {partnerOn && <p className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold mt-0.5">{partnerName} is reading this, join them</p>}
              </div>
              {busy === plan.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
          )
        })}
      </section>
    </div>
  )
}
