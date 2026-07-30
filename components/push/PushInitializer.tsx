'use client'

import { useEffect } from 'react'

// Reload once when a new service worker takes control, so a page that's
// already loaded (e.g. a home-screen launch) never keeps running old JS
// against chunk URLs a later deploy has removed from the server.
function reloadOnceOnControllerChange() {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}

// A stale cached shell can still reference hashed chunk files that a
// subsequent deploy has removed from the server. When that happens the
// browser throws a ChunkLoadError — reload once to pick up the fresh shell
// instead of leaving the user stuck on a broken page.
function reloadOnceOnChunkError() {
  const RELOAD_FLAG = 'samur-chunk-reload'
  window.addEventListener('error', (event) => {
    const isChunkError =
      event?.error?.name === 'ChunkLoadError' ||
      /Loading chunk|Failed to load chunk/i.test(event?.message || '')
    if (!isChunkError) return
    if (sessionStorage.getItem(RELOAD_FLAG)) return
    sessionStorage.setItem(RELOAD_FLAG, '1')
    window.location.reload()
  })
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason
    const isChunkError =
      reason?.name === 'ChunkLoadError' ||
      /Loading chunk|Failed to load chunk/i.test(reason?.message || '')
    if (!isChunkError) return
    if (sessionStorage.getItem(RELOAD_FLAG)) return
    sessionStorage.setItem(RELOAD_FLAG, '1')
    window.location.reload()
  })
}

export function PushInitializer() {
  useEffect(() => {
    reloadOnceOnChunkError()

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      reloadOnceOnControllerChange()

      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        })
        .then((reg) => {
          console.log('SamUr Service Worker registered', reg.scope)
          // For iOS, we need to explicitly update the service worker
          reg.update().catch(err => console.log('SW update check:', err))
        })
        .catch((err) => console.error('Service Worker failed', err));
    }
  }, []);

  return null; // This component doesn't render anything
}