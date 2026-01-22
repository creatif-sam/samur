'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FeedSwitch from '@/components/feed/FeedSwitch'
import MeditationComposer from '@/components/meditations/MeditationComposer'
import { Pencil, Copy, LayoutGrid, List } from 'lucide-react'

import type { Meditation } from '@/components/meditations/MeditationComposer'

interface MeditationWithMeta extends Meditation {
  id: string
  created_at: string
}

type ViewMode = 'list' | 'grid'

export default function MeditationsPage() {
  const [meditations, setMeditations] = useState<MeditationWithMeta[]>([])
  const [showComposer, setShowComposer] = useState(false)
  const [editing, setEditing] = useState<MeditationWithMeta | null>(null)
  const [search, setSearch] = useState('')
  const [visibilityFilter, setVisibilityFilter] =
    useState<'all' | 'private' | 'shared'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  useEffect(() => {
    loadMeditations()
  }, [])

  async function loadMeditations() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('meditations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setMeditations((data as MeditationWithMeta[]) ?? [])
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

  function copyMeditation(m: Meditation) {
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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      {/* Header */}
<header className="space-y-4">
  {/* Top row */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div className="space-y-1">
      <h1 className="text-xl font-semibold tracking-tight">
        Meditations
      </h1>
      <p className="text-sm text-muted-foreground">
        Personal reflections and scripture insights
      </p>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 justify-end">
      {/* Mobile actions */}
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
          onClick={() => setShowComposer(true)}
        >
          <Pencil className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop actions */}
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
          onClick={() => setShowComposer(true)}
        >
          Write meditation
        </Button>
      </div>
    </div>
  </div>

  {/* Feed switch row (mobile first) */}
  <div className="flex justify-between sm:justify-start">
    <FeedSwitch />
  </div>

  {/* Search + filter */}
  <div className="flex flex-col sm:flex-row gap-2">
    <Input
      placeholder="Search by title or scripture"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <select
      className="border rounded-md px-3 py-2 text-sm"
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

      {/* LIST VIEW */}
      {viewMode === 'list' ? (
        <section className="divide-y border rounded-md">
          {filteredMeditations.map((m) => (
            <div
              key={m.id}
              className="group hover:bg-muted/40 transition"
            >
              <div className="px-5 py-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Link href={`/protected/meditations/${m.id}`}>
                      <h2 className="font-medium group-hover:underline">
                        {m.title}
                      </h2>
                    </Link>

                    <p className="text-sm text-muted-foreground">
                      {m.scripture}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault()
                        setEditing(m)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyMeditation(m)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{m.visibility}</span>
                  <span>
                    {new Date(m.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        /* GRID VIEW */
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredMeditations.map((m) => (
            <div
              key={m.id}
              className="border rounded-md p-4 hover:bg-muted/40 transition"
            >
              <div className="space-y-2">
                <Link href={`/protected/meditations/${m.id}`}>
                  <h2 className="font-medium hover:underline">
                    {m.title}
                  </h2>
                </Link>

                <p className="text-sm text-muted-foreground line-clamp-3">
                  {m.scripture}
                </p>

                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{m.visibility}</span>
                  <span>
                    {new Date(m.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(m)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyMeditation(m)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {filteredMeditations.length === 0 && (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          No matching meditations found
        </div>
      )}
    </div>
  )
}
