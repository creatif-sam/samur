'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import { BellRing, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { HelpTip } from '@/components/ui/help-tip'
import { cleanTimes, loadReminders, MAX_REMINDERS, saveReminders } from '@/lib/prayer/requests'

// Daily prayer times: a notification at each one, in your own time zone
export default function PrayerReminders({ userId }: { userId: string }) {
  const { tr } = useTranslation()
  const [times, setTimes] = useState<string[]>([])
  const [ready, setReady] = useState<boolean | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('06:00')

  useEffect(() => {
    let live = true
    loadReminders(createClient(), userId).then(r => { if (live) { setTimes(r.times); setReady(r.ready) } })
    return () => { live = false }
  }, [userId])

  async function change(next: string[]) {
    const before = times
    const clean = cleanTimes(next)
    setTimes(clean)
    try {
      await saveReminders(createClient(), userId, clean)
    } catch {
      setTimes(before)
      toast.error(tr('Couldn\'t save your prayer times'))
    }
  }

  if (ready === null) return null

  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <BellRing className="h-4 w-4 text-violet-600" />
        <p className="text-sm font-semibold">{tr('Prayer times')}</p>
        <HelpTip topic="prayer.reminders" align="left" className="-my-1" />
      </div>
      {!ready ? (
        <p className="mt-2 text-xs text-muted-foreground">{tr('Prayer times need a quick database update first: run the prayer migration in Supabase.')}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {times.length === 0 && !adding && <p className="text-xs text-muted-foreground">{tr('No reminder yet. Add the times you want to pray each day.')}</p>}
            {times.map(t => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-100 py-1 pl-3 pr-1 text-sm font-bold tabular-nums text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                {t}
                <button onClick={() => change(times.filter(x => x !== t))} aria-label={tr('Remove {text}', { text: t })} className="grid h-6 w-6 place-items-center rounded-full hover:bg-violet-200 dark:hover:bg-violet-500/25">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {adding ? (
              <form onSubmit={e => { e.preventDefault(); void change([...times, draft]); setAdding(false) }} className="flex items-center gap-1.5">
                <input type="time" value={draft} onChange={e => setDraft(e.target.value)} aria-label={tr('Prayer time')}
                  className="rounded-xl border bg-muted/30 px-2 py-1 text-[16px] tabular-nums" />
                <button type="submit" className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">{tr('Add')}</button>
                <button type="button" onClick={() => setAdding(false)} className="px-1 text-xs font-semibold text-muted-foreground">{tr('Cancel')}</button>
              </form>
            ) : times.length < MAX_REMINDERS && (
              <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-violet-300 px-3 py-1 text-xs font-bold text-violet-600 dark:border-violet-700 dark:text-violet-400">
                <Plus className="h-3.5 w-3.5" /> {tr('Add a time')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
