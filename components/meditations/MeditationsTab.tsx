'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, BookOpen, Plus } from 'lucide-react'
import Link from 'next/link'
import MeditationComposer from '@/components/meditations/MeditationComposer'
import MeditationStreakBoard from '@/components/meditations/MeditationStreakBoard'
import type { MeditationDB } from '@/lib/types'

export default function MeditationsTab() {
  const [meditations, setMeditations] = useState<MeditationDB[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setLoading(false); return }
    setUserId(auth.user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at, partner_id')
      .eq('id', auth.user.id)
      .single()

    if (profile?.created_at) setAccountCreatedAt(profile.created_at)

    let query = supabase
      .from('meditations')
      .select('id, author_id, title, scripture, lesson, application, prayer, visibility, period, created_at')

    if (profile?.partner_id) {
      query = query.or(`author_id.eq.${auth.user.id},and(author_id.eq.${profile.partner_id},visibility.eq.shared)`)
    } else {
      query = query.eq('author_id', auth.user.id)
    }

    const { data } = await query.order('created_at', { ascending: false }).limit(20)
    setMeditations(data ?? [])
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  }

  const myMeditations = meditations.filter(m => m.author_id === userId)

  return (
    <div className="space-y-5 pb-10">

      {/* Streak board */}
      {userId && accountCreatedAt && myMeditations.length > 0 && (
        <MeditationStreakBoard
          meditations={myMeditations}
          ownerId={userId}
          accountCreatedAt={accountCreatedAt}
        />
      )}

      {/* New Meditation button */}
      <button
        onClick={() => setShowComposer(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition"
      >
        <Plus className="w-4 h-4" /> New Meditation
      </button>

      {/* Recent list */}
      {meditations.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No meditations yet. Write your first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meditations.map(m => (
            <div key={m.id} className="bg-background rounded-2xl border shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug truncate">{m.title}</p>
                  {m.scripture && <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.scripture}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.visibility === 'shared' && (
                    <span className="text-[10px] font-semibold text-violet-500 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">shared</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
              {m.lesson && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.lesson}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Link
        href="/protected/meditations"
        className="block text-center text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline"
      >
        See all meditations
      </Link>

      {showComposer && (
        <MeditationComposer onClose={() => setShowComposer(false)} onCreated={() => { setShowComposer(false); load() }} />
      )}
    </div>
  )
}
