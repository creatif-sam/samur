'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThoughtBook } from '@/components/note/ThoughtBook'

export default function NotePage() {
  const [notebooks, setNotebooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  async function loadData() {
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
    setNotebooks(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  return (
    <div className="pb-20">
      <ThoughtBook notebooks={notebooks} onRefresh={loadData} userId={userId} />
    </div>
  )
}
