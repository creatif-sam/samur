'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

// Keeps an open app current without manual reloads:
// - a newer deploy is detected (via /api/version) when you come back to the
//   app, every 10 minutes while it's open, and when the connection returns
// - after 15+ minutes in the background, the page reloads for fresh data
// A reload never interrupts typing, an open dialog/editor or a running prayer timer.

const CURRENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID
const CHECK_EVERY_MS = 10 * 60 * 1000
const STALE_AFTER_MS = 15 * 60 * 1000
const RETRY_UNSAFE_MS = 20 * 1000
const UPDATED_FLAG = 'mastery-updated'

function isBusy() {
  const el = document.activeElement as HTMLElement | null
  const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
  // Open dialogs, sheets and full-screen editors (all render as fixed overlays)
  const overlayOpen = !!document.querySelector('[role="dialog"], [role="alertdialog"], .fixed.inset-0')
  let prayerRunning = false
  try { prayerRunning = !!sessionStorage.getItem('prayer_timer') } catch { /* ignore */ }
  return typing || overlayOpen || prayerRunning
}

export default function AppFreshness() {
  useEffect(() => {
    // Confirm after an automatic update
    try {
      if (sessionStorage.getItem(UPDATED_FLAG)) {
        sessionStorage.removeItem(UPDATED_FLAG)
        setTimeout(() => toast.success('Updated to the latest version'), 600) // after the Toaster mounts
      }
    } catch { /* ignore */ }

    let hiddenAt: number | null = document.visibilityState === 'hidden' ? Date.now() : null
    let pendingReason: 'update' | 'stale' | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const reload = (reason: 'update' | 'stale') => {
      if (reason === 'update') {
        try { sessionStorage.setItem(UPDATED_FLAG, '1') } catch { /* ignore */ }
      }
      window.location.reload()
    }

    // Reload now if nothing is in progress, otherwise try again shortly
    const reloadWhenSafe = (reason: 'update' | 'stale') => {
      if (pendingReason !== 'update') pendingReason = reason
      clearTimeout(retryTimer)
      if (document.visibilityState !== 'visible') return // will retry on return
      if (!isBusy()) return reload(pendingReason)
      retryTimer = setTimeout(() => pendingReason && reloadWhenSafe(pendingReason), RETRY_UNSAFE_MS)
    }

    const checkForUpdate = async () => {
      if (!navigator.onLine) return
      navigator.serviceWorker?.getRegistration().then(reg => reg?.update()).catch(() => {})
      if (!CURRENT_BUILD) return
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const { buildId } = await res.json()
        if (buildId && buildId !== CURRENT_BUILD) reloadWhenSafe('update')
      } catch { /* offline or server busy: try next time */ }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }
      const awayFor = hiddenAt ? Date.now() - hiddenAt : 0
      hiddenAt = null
      if (pendingReason) return reloadWhenSafe(pendingReason)
      if (awayFor >= STALE_AFTER_MS && navigator.onLine) return reloadWhenSafe('stale')
      void checkForUpdate()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', checkForUpdate)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void checkForUpdate()
    }, CHECK_EVERY_MS)
    void checkForUpdate()

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', checkForUpdate)
      clearInterval(interval)
      clearTimeout(retryTimer)
    }
  }, [])

  return null
}
