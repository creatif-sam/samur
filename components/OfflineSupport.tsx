'use client'

import { useEffect, useState } from 'react'
import { CloudOff, Wifi } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cachedUserId, clearOfflineData } from '@/lib/offline'

// Shows when the app is offline (pages then show the last data seen on this
// device) and wipes that saved data on sign-out or when another account signs in.
export default function OfflineSupport() {
  const [offline, setOffline] = useState(false)
  const [backOnline, setBackOnline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    let timer: ReturnType<typeof setTimeout> | undefined
    const goOffline = () => { setOffline(true); setBackOnline(false) }
    const goOnline = () => {
      setOffline(false)
      setBackOnline(true)
      clearTimeout(timer)
      timer = setTimeout(() => setBackOnline(false), 3000)
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        void clearOfflineData()
        return
      }
      const previous = cachedUserId()
      if (session?.user && previous && previous !== session.user.id) void clearOfflineData()
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!offline && !backOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[55] pointer-events-none"
      style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-lg ${
          offline ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-emerald-500 text-white'
        }`}
      >
        {offline ? <CloudOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
        {offline ? 'Offline · showing saved data' : 'Back online'}
      </div>
    </div>
  )
}
