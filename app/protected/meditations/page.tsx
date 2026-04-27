'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FeedSwitch from '@/components/feed/FeedSwitch'
import MeditationComposer from '@/components/meditations/MeditationComposer'
import { Pencil, Copy, LayoutGrid, List } from 'lucide-react'
import MeditationStreakBoard from '@/components/meditations/MeditationStreakBoard'
import PartnerMeditationBoard from '@/components/meditations/PartnerMeditationBoard'

import type { MeditationDB } from '@/lib/types'

type ViewMode = 'list' | 'grid'

export default function MeditationsPage() {
  const [meditations, setMeditations] = useState<MeditationDB[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [accountCreatedAt, setAccountCreatedAt] =
  useState<string | null>(null)


  const [editing, setEditing] = useState<MeditationDB | null>(null)
  const [search, setSearch] = useState('')
  const [visibilityFilter, setVisibilityFilter] =
    useState<'all' | 'private' | 'shared'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  useEffect(() => {
    loadMeditations()
  }, [])

 async function loadMeditations() {
  const supabase = createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return

  setUserId(auth.user.id)

  // Fetch user profile with partner_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at, partner_id')
    .eq('id', auth.user.id)
    .single()

  if (profile?.created_at) {
    setAccountCreatedAt(profile.created_at)
  }

  // Fetch meditations:
  // 1. All meditations where user is the author (private + shared)
  // 2. Only SHARED meditations where partner is the author
  let query = supabase
    .from('meditations')
    .select(`
      id,
      author_id,
      title,
      scripture,
      lesson,
      application,
      prayer,
      visibility,
      period,
      created_at
    `)
    
  // Build the filter: own meditations OR (partner's shared meditations)
  if (profile?.partner_id) {
    query = query.or(`author_id.eq.${auth.user.id},and(author_id.eq.${profile.partner_id},visibility.eq.shared)`)
  } else {
    query = query.eq('author_id', auth.user.id)
  }
    
  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return
  }

  setMeditations(data as MeditationDB[])
}

  const filteredMeditations = useMemo(() => {
    return meditations.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.scripture.toLowerCase().includes(search.toLowerCase())

      const matchesVisibility =
        visibilityFilter === 'all' ||
        m.visibility === visibilityFilter

      return matchesSearch && matchesVisibility
    })
  }, [meditations, search, visibilityFilter])

  const meditationTimeInsights = useMemo(() => {
    if (!userId) return null

    const ownMeditations = meditations.filter((m) => m.author_id === userId)
    if (ownMeditations.length === 0) return null

    const periodCounts = { morning: 0, evening: 0 }
    const slotCounts = {
      Morning: 0,
      Afternoon: 0,
      Evening: 0,
      Night: 0,
    }
    const hourCounts = new Array<number>(24).fill(0)

    ownMeditations.forEach((m) => {
      const date = new Date(m.created_at)
      const hour = date.getHours()

      periodCounts[m.period] += 1
      hourCounts[hour] += 1

      if (hour >= 5 && hour < 12) {
        slotCounts.Morning += 1
      } else if (hour >= 12 && hour < 17) {
        slotCounts.Afternoon += 1
      } else if (hour >= 17 && hour < 22) {
        slotCounts.Evening += 1
      } else {
        slotCounts.Night += 1
      }
    })

    const preferredPeriod =
      periodCounts.morning >= periodCounts.evening ? 'Morning' : 'Evening'
    const preferredPeriodPct = Math.round(
      (Math.max(periodCounts.morning, periodCounts.evening) / ownMeditations.length) * 100
    )

    let bestHour = 0
    for (let hour = 1; hour < 24; hour += 1) {
      if (hourCounts[hour] > hourCounts[bestHour]) {
        bestHour = hour
      }
    }

    const commonTimeLabel = new Date(2000, 0, 1, bestHour, 0).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })

    const dominantSlot =
      Object.entries(slotCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Morning'

    return {
      total: ownMeditations.length,
      preferredPeriod,
      preferredPeriodPct,
      commonTimeLabel,
      dominantSlot,
    }
  }, [meditations, userId])

  function copyMeditation(m: MeditationDB) {
    const text = `
${m.title}

${m.scripture}

${m.lesson}
${m.application}
${m.prayer}
    `.trim()

    navigator.clipboard.writeText(text)
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">
              Meditations
            </h1>
            <p className="text-sm text-muted-foreground">
              Personal reflections and scripture insights
            </p>
          </div>

          <div className="flex items-center gap-2 justify-end flex-shrink-0">
            {/* Mobile */}
            <div className="flex sm:hidden items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  setViewMode(viewMode === 'list' ? 'grid' : 'list')
                }
              >
                {viewMode === 'list' ? (
                  <LayoutGrid className="h-5 w-5" />
                ) : (
                  <List className="h-5 w-5" />
                )}
              </Button>

              <Button
                size="icon"
                variant="outline"
                onClick={() => setEditing({} as MeditationDB)}
              >
                <Pencil className="h-5 w-5" />
              </Button>
            </div>

            {/* Desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <FeedSwitch />

              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  setViewMode(viewMode === 'list' ? 'grid' : 'list')
                }
              >
                {viewMode === 'list' ? (
                  <LayoutGrid className="h-4 w-4" />
                ) : (
                  <List className="h-4 w-4" />
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing({} as MeditationDB)}
              >
                Write meditation
              </Button>
            </div>
          </div>
        </div>

        <div className="flex sm:hidden justify-start">
          <FeedSwitch />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <Input
            placeholder="Search by title or scripture"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 w-full"
          />

          <select
            className="border rounded-md px-3 py-2 text-sm w-full sm:w-auto min-w-[120px]"
            value={visibilityFilter}
            onChange={(e) =>
              setVisibilityFilter(
                e.target.value as 'all' | 'private' | 'shared'
              )
            }
          >
            <option value="all">All</option>
            <option value="private">Private</option>
            <option value="shared">Shared</option>
          </select>
        </div>
      </header>

      {/* Streak */}
      {userId && accountCreatedAt && (
  <div className="rounded-lg border bg-background p-4 w-full overflow-hidden">
    <MeditationStreakBoard
      meditations={meditations}
      ownerId={userId}
      accountCreatedAt={accountCreatedAt}
    />
  </div>
)}

      {meditationTimeInsights && (
        <div className="rounded-lg border bg-background p-4 w-full">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Meditation Rhythm
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md bg-muted/40 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Most common time</p>
              <p className="font-semibold text-violet-700 dark:text-violet-300">
                {meditationTimeInsights.commonTimeLabel}
              </p>
            </div>
            <div className="rounded-md bg-muted/40 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Preferred period</p>
              <p className="font-semibold text-indigo-700 dark:text-indigo-300">
                {meditationTimeInsights.preferredPeriod} ({meditationTimeInsights.preferredPeriodPct}%)
              </p>
            </div>
            <div className="rounded-md bg-muted/40 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Strongest time window</p>
              <p className="font-semibold">
                {meditationTimeInsights.dominantSlot}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Based on {meditationTimeInsights.total} of your saved meditations.
          </p>
        </div>
      )}


      {/* Partner */}
      <div className="w-full overflow-hidden">
        <PartnerMeditationBoard />
      </div>

      {/* Composer */}
      {editing && (
        <MeditationComposer
          meditation={editing.id ? editing : undefined}
          onClose={() => setEditing(null)}
          onCreated={() => {
            setEditing(null)
            loadMeditations()
          }}
        />
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <section className="divide-y border rounded-md w-full overflow-hidden">
          {filteredMeditations.map((m) => (
            <div key={m.id} className="group hover:bg-muted/40 transition w-full">
              <div className="px-4 md:px-5 py-4 space-y-2">
                {(() => {
                  const createdAt = new Date(m.created_at)
                  const createdDate = createdAt.toLocaleDateString()
                  const createdTime = createdAt.toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                  const periodLabel = m.period === 'morning' ? 'Morning' : 'Evening'

                  return (
                    <>
                <div className="flex items-start justify-between gap-3 md:gap-4 w-full">
                  <div className="space-y-1 min-w-0 flex-1">
                    <Link href={`/protected/meditations/${m.id}`}>
                      <h2 className="font-medium group-hover:underline truncate">
                        {m.title}
                      </h2>
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {m.scripture}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    {/* Only show edit button if user is the author */}
                    {userId === m.author_id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(m)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyMeditation(m)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-end gap-3 text-xs text-muted-foreground">
                  <span>{m.visibility}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span>{createdDate}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        m.period === 'morning'
                          ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                          : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {createdTime} • {periodLabel}
                    </span>
                  </div>
                </div>
                    </>
                  )
                })()}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {filteredMeditations.map((m) => (
            (() => {
              const createdAt = new Date(m.created_at)
              const createdDate = createdAt.toLocaleDateString()
              const createdTime = createdAt.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })
              const periodLabel = m.period === 'morning' ? 'Morning' : 'Evening'

              return (
                <div
                  key={m.id}
                  className="rounded-lg border bg-background active:bg-muted/60 transition overflow-hidden"
                >
                  <Link
                    href={`/protected/meditations/${m.id}`}
                    className="block px-4 md:px-5 py-4 md:py-5 space-y-3"
                  >
                    <h2 className="text-base font-medium leading-snug line-clamp-2">
                      {m.title}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {m.scripture}
                    </p>
                  </Link>

                  <div className="border-t" />

                  <div className="flex items-end justify-between gap-3 px-3 md:px-4 py-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs text-muted-foreground truncate">
                        {createdDate}
                      </span>
                      <span
                        className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          m.period === 'morning'
                            ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                            : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {createdTime} • {periodLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                      {/* Only show edit button if user is the author */}
                      {userId === m.author_id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          onClick={() => setEditing(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={() => copyMeditation(m)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })()
          ))}
        </section>
      )}

      {filteredMeditations.length === 0 && (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground w-full">
          No matching meditations found
        </div>
      )}
    </div>
  )
}