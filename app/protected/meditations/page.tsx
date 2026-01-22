'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FeedSwitch from '@/components/feed/FeedSwitch'
import MeditationComposer from '@/components/meditations/MeditationComposer'
import { Pencil, Copy, LayoutGrid, List } from 'lucide-react'

interface Meditation {
  id: string
  title: string
  scripture: string
  lesson?: string
  application?: string
  prayer?: string
  visibility: 'private' | 'shared'
  created_at: string
}

type ViewMode = 'list' | 'grid'

export default function MeditationsPage() {
  const [meditations, setMeditations] = useState<Meditation[]>([])
  const [showComposer, setShowComposer] = useState(false)
  const [editing, setEditing] = useState<Meditation | null>(null)
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

    setMeditations(data ?? [])
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

${m.lesson ?? ''}
${m.application ?? ''}
${m.prayer ?? ''}
    `.trim()

    navigator.clipboard.writeText(text)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              Meditations
            </h1>
            <p className="text-sm text-muted-foreground">
              Personal reflections and scripture insights
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        <div className="flex gap-2">
          <Input
            placeholder="Search by title or scripture"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="border rounded-md px-3 text-sm"
            value={visibilityFilter}
            onChange={(e) =>
              setVisibilityFilter(
                e.target.value as 'all' | 'private' | 'shared',
              )
            }
          >
            <option value="all">All</option>
            <option value="private">Private</option>
            <option value="shared">Shared</option>
          </select>
        </div>
      </header>

      {(showComposer || editing) && (
        <MeditationComposer
          meditation={editing ?? undefined}
          onClose={() => {
            setShowComposer(false)
            setEditing(null)
          }}
          onCreated={() => {
            setShowComposer(false)
            setEditing(null)
            loadMeditations()
          }}
        />
      )}

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
