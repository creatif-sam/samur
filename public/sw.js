// public/sw.js
// ─────────────────────────────────────────────────────────────────────────────
// CACHE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_VERSION = 'v4'
const STATIC_CACHE  = `mastery-static-${CACHE_VERSION}`   // hashed JS/CSS chunks
const PAGES_CACHE   = `mastery-pages-${CACHE_VERSION}`    // app-shell HTML pages
const ASSETS_CACHE  = `mastery-assets-${CACHE_VERSION}`   // icons, images, sounds
const ALL_CACHES    = [STATIC_CACHE, PAGES_CACHE, ASSETS_CACHE]

// App-shell pages to pre-cache on install
const PRECACHE_PAGES = [
  '/',
  '/offline',
  '/protected/posts',
  '/protected/goals',
  '/protected/planner',
  '/protected/note',
  '/protected/meditations',
  '/protected/profile',
]

// Static public assets to pre-cache
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icon-192-v2.png',
  '/icon-512-v2.png',
]

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL — pre-cache shell assets
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(PAGES_CACHE).then(cache =>
        Promise.allSettled(PRECACHE_PAGES.map(url => cache.add(url)))
      ),
      caches.open(ASSETS_CACHE).then(cache =>
        Promise.allSettled(PRECACHE_ASSETS.map(url => cache.add(url)))
      ),
    ]).then(() => self.skipWaiting())
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE — delete old caches, claim clients
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith('mastery-') && !ALL_CACHES.includes(key))
            .map(key => caches.delete(key))
        )
      )
      .then(() => clients.claim())
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// FETCH — routing strategies
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only intercept same-origin and GET requests
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // 1. Next.js static chunks — Cache First (immutable hashed URLs)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // 2. Public images / icons / sounds — Cache First
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/sounds/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|mp3|wav)$/)
  ) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE))
    return
  }

  // 3. API routes — Network Only (auth-sensitive, never cache)
  if (url.pathname.startsWith('/api/')) {
    return // let the browser handle it normally
  }

  // 4. Supabase / external — Network Only
  if (url.hostname.includes('supabase.co')) {
    return
  }

  // 5. HTML navigation — Network First, fall back to cache, then /offline
  if (request.headers.get('accept')?.includes('text/html') || url.pathname === '/') {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }

  // 6. Everything else (_next/data, fonts, etc.) — Network First with cache backup
  event.respondWith(networkFirst(request, PAGES_CACHE))
})

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Cache First: serve from cache, fetch & update if missing */
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

/** Network First: try network, fall back to cache */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    return cached ?? new Response('Offline', { status: 503 })
  }
}

/** Network First for HTML pages with /offline fallback */
async function networkFirstWithOfflineFallback(request) {
  const cache = await caches.open(PAGES_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    const offline = await cache.match('/offline')
    return offline ?? new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND SYNC — retry pending journal saves when back online
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-journal') {
    event.waitUntil(flushPendingJournals())
  }
})

async function flushPendingJournals() {
  // Reads queued entries from IndexedDB and replays them.
  // Entries are queued by the app when a save fails due to being offline.
  const DB_NAME    = 'mastery-offline'
  const STORE_NAME = 'pending-journals'

  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE_NAME, { autoIncrement: true })
    req.onsuccess = (e) => {
      const db   = e.target.result
      const tx   = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const all  = store.getAll()

      all.onsuccess = async () => {
        const entries = all.result
        for (const entry of entries) {
          try {
            await fetch('/api/journal-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(entry),
            })
          } catch {
            // Still offline — leave in queue
            return resolve()
          }
        }
        store.clear()
        resolve()
      }
    }
    req.onerror = () => resolve()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Push event listener - handles incoming push notifications
self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const title = data.title || "SamUr🤍 Update";
      const options = {
        body: data.body || "You have a new update in SamUr.",
        icon: '/icon-192-v2.png', // Main app icon (larger for visibility)
        badge: '/icon-192-v2.png', // Badge icon for notification tray
        image: data.image, // Optional large image
        vibrate: [200, 100, 200, 100, 200], // Stronger vibration pattern
        timestamp: Date.now(),
        requireInteraction: false, // Don't force user interaction, auto-dismiss
        silent: false, // Always make sound
        data: {
          url: data.url || '/protected/posts',
          dateOfArrival: Date.now(),
          primaryKey: 1
        },
        // Tag allows replacing old notifications instead of stacking
        tag: data.tag || 'samur-notification',
        renotify: true, // Vibrate/sound even if replacing same tag
        // Actions for Android expandable notifications
        actions: data.actions || [
          {
            action: 'open',
            title: 'Open',
            icon: '/icon-192-v2.png'
          },
          {
            action: 'close',
            title: 'Close',
            icon: '/icon-192-v2.png'
          }
        ],
        // Additional options for better visibility
        dir: 'auto',
        lang: 'en-US'
      };

      // CRITICAL: Always show notification, even if app is open
      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (err) {
      console.error("Error parsing push data:", err);
      // Fallback notification if parsing fails
      event.waitUntil(
        self.registration.showNotification('SamUr Update', {
          body: 'You have a new notification',
          icon: '/icon-192-v2.png',
          badge: '/icon-192-v2.png',
          tag: 'samur-fallback'
        })
      );
    }
  }
});

// Handle notification click - opens app to correct location
self.addEventListener('notificationclick', function (event) {
  event.notification.close(); // Close the notification

  const urlToOpen = event.notification.data?.url || '/protected/posts';

  // Handle action buttons (if clicked)
  if (event.action === 'close') {
    return; // Just close, don't open app
  }

  // Open or focus app window
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((windowClients) => {
      // Check if there's already a window open
      for (let client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // Navigate existing window and focus it
          return client.navigate(urlToOpen).then(client => client.focus());
        }
      }
      // No window open, create new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});