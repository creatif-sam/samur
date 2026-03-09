'use client'

import { useEffect } from 'react'

export function PushInitializer() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
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