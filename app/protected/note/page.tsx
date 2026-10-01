'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThoughtBook } from '@/components/note/ThoughtBook'
import type { Notebook, PagePatch } from '@/components/note/types'

export default function NotePage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      setLoading(false)
      return
    }
    setUserId(user.id)
    const { data } = await supabase
      .from('notebooks')
      .select(`*, sections (*, pages (*))`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setNotebooks((data as Notebook[]) ?? [])
    setLoading(false)
  }, [])

  // Apply a saved page edit locally instead of refetching every notebook
  const patchPage = useCallback((patch: PagePatch) => {
    setNotebooks(prev => prev.map(nb => ({
      ...nb,
      sections: nb.sections.map(s => ({
        ...s,
        pages: s.pages.map(p => (p.id === patch.id ? { ...p, ...patch } : p)),
      })),
    })))
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  return (
    <div className="pb-20">
      <ThoughtBook notebooks={notebooks} onRefresh={loadData} onPagePatched={patchPage} userId={userId} />
    </div>
  )
}
