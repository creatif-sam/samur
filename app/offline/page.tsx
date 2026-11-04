'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Home, RotateCw, WifiOff } from 'lucide-react'

// Matches the offline page the service worker serves (public/sw.js, OFFLINE_HTML)
export default function OfflinePage() {
  const [checking, setChecking] = useState(false)
  const [stillOffline, setStillOffline] = useState(false)

  useEffect(() => {
    const back = () => setTimeout(() => window.location.reload(), 800)
    window.addEventListener('online', back)
    return () => window.removeEventListener('online', back)
  }, [])

  async function tryAgain() {
    setChecking(true)
    try {
      const res = await fetch(`/api/version?ping=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) { window.location.reload(); return }
      throw new Error('offline')
    } catch {
      setStillOffline(true)
      setChecking(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-10 bg-background text-center">
      <main className="w-full max-w-[380px]">
        <div className="mx-auto mb-7 w-[88px] h-[88px] rounded-[28px] bg-gradient-to-br from-violet-500 to-violet-700 grid place-items-center shadow-[0_18px_40px_-12px_rgba(109,40,217,.55)]">
          <WifiOff className="w-10 h-10 text-white" />
        </div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-violet-600 dark:text-violet-400">No connection</p>
        <h1 className="text-[28px] font-black tracking-tight mt-2">You&rsquo;re offline</h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed mt-2.5">
          This page hasn&rsquo;t been saved on your device yet. Pages you&rsquo;ve opened before still work, and nothing you&rsquo;ve saved is lost.
        </p>

        <div className="mt-6 rounded-[22px] bg-card border border-border p-[18px] text-left">
          <p className="text-[15px] italic leading-relaxed">&ldquo;Be still, and know that I am God.&rdquo;</p>
          <span className="block mt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">Psalm 46:10</span>
        </div>

        <div className="grid gap-2.5 mt-6">
          <button
            onClick={tryAgain}
            disabled={checking}
            className="h-[52px] rounded-[18px] bg-violet-600 dark:bg-violet-400 text-white dark:text-violet-950 font-bold flex items-center justify-center gap-2 active:scale-[.97] transition"
          >
            <RotateCw className={`w-[18px] h-[18px] ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : stillOffline ? 'Still offline — try again' : 'Try again'}
          </button>
          <Link
            href="/protected"
            className="h-[52px] rounded-[18px] bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold flex items-center justify-center gap-2 active:scale-[.97] transition"
          >
            <Home className="w-[18px] h-[18px]" /> Go to Home
          </Link>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">This page reloads by itself as soon as you&rsquo;re back online.</p>
      </main>
    </div>
  )
}
