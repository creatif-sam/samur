// public/sw.js
// ─────────────────────────────────────────────────────────────────────────────
// CACHE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_VERSION = 'v5'
const STATIC_CACHE  = `mastery-static-${CACHE_VERSION}`   // hashed JS/CSS chunks
const PAGES_CACHE   = `mastery-pages-${CACHE_VERSION}`    // app-shell HTML pages
const ASSETS_CACHE  = `mastery-assets-${CACHE_VERSION}`   // icons, images, sounds
// Last-seen Supabase reads, used only when offline. Not versioned (data, not code);
// the app deletes it on sign-out. Name must match DATA_CACHE in lib/offline.ts.
const DATA_CACHE    = 'mastery-data'
const ALL_CACHES    = [STATIC_CACHE, PAGES_CACHE, ASSETS_CACHE, DATA_CACHE]

// Size limits so old deploys' chunks and old data don't pile up on the device
const CACHE_LIMITS = {
  [STATIC_CACHE]: 400,
  [PAGES_CACHE]: 80,
  [ASSETS_CACHE]: 200,
  [DATA_CACHE]: 500,
}

// App-shell pages to pre-cache on install.
// Only public/unauthenticated routes — precaching /protected/* pages is fragile
// since a logged-out install would cache a redirect instead of the real page,
// and stale precached HTML can reference chunk hashes a later deploy removes.
const PRECACHE_PAGES = [
  '/',
  '/offline',
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

  // Only intercept GET requests
  if (request.method !== 'GET') return

  // Supabase: reads are network-first with the last copy kept for offline use;
  // public storage files (avatars, images) are cache-first. Everything else
  // (auth token refreshes, realtime) goes straight to the network.
  if (url.hostname.includes('supabase')) {
    if (url.pathname.startsWith('/rest/v1/') || url.pathname === '/auth/v1/user') {
      event.respondWith(networkFirstData(request))
    } else if (url.pathname.startsWith('/storage/v1/object/public/')) {
      event.respondWith(cacheFirst(request, ASSETS_CACHE))
    }
    return
  }

  // Other cross-origin requests are left alone
  if (url.origin !== self.location.origin) return

  // 1. Next.js static chunks — Cache First (immutable hashed URLs)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // 2. Public images / icons / sounds / optimised images — Cache First
  if (
    url.pathname.startsWith('/_next/image') ||
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

/** Store a response and keep the cache within its size limit (oldest entries go first) */
async function putAndTrim(cacheName, key, response) {
  const cache = await caches.open(cacheName)
  await cache.put(key, response)
  const limit = CACHE_LIMITS[cacheName]
  if (!limit) return
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - limit; i++) await cache.delete(keys[i])
}

/** Cache First: serve from cache, fetch & update if missing */
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) putAndTrim(cacheName, request, response.clone())
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

/**
 * Supabase reads: always try the network; keep successful responses and serve
 * the last one only when the network fails. The Accept header is part of the
 * key because .single() and list queries share URLs but return different shapes.
 */
async function networkFirstData(request) {
  const keyUrl = new URL(request.url)
  keyUrl.searchParams.set('__accept', request.headers.get('accept') || '')
  const key = new Request(keyUrl.toString())
  try {
    const response = await fetch(request)
    if (response.status === 200) putAndTrim(DATA_CACHE, key, response.clone())
    return response
  } catch (err) {
    const cache = await caches.open(DATA_CACHE)
    const cached = await cache.match(key)
    if (cached) return cached
    throw err
  }
}

/** Network First: try network, fall back to cache */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) putAndTrim(cacheName, request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    return cached ?? new Response('Offline', { status: 503 })
  }
}

/**
 * The page shown when you open something offline that isn't saved on the device.
 * Fully self-contained (inline styles and script, no app files), so it always
 * renders properly, even right after a deploy removed the old CSS and JS.
 */
const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#7c3aed">
<title>Offline · Mastery</title>
<style>
  :root {
    --bg: #faf7ff; --card: #ffffff; --text: #1e1b2e; --muted: #6b6880;
    --brand: #7c3aed; --brand-soft: #ede9fe; --ring: rgba(124, 58, 237, .18); --border: #ece8f5;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0d0b14; --card: #17141f; --text: #f3f0fa; --muted: #a29db3;
      --brand: #a78bfa; --brand-soft: #2a2140; --ring: rgba(167, 139, 250, .2); --border: #2a2536;
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: var(--bg); color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    display: flex; align-items: center; justify-content: center;
    padding: max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
    -webkit-font-smoothing: antialiased; overflow-x: hidden;
  }
  .glow {
    position: fixed; inset: -20% -20% auto -20%; height: 60%; pointer-events: none;
    background: radial-gradient(ellipse at 50% 40%, var(--ring), transparent 65%);
  }
  main { position: relative; width: 100%; max-width: 380px; text-align: center; }
  .orb {
    position: relative; width: 120px; height: 120px; margin: 0 auto 28px;
    display: grid; place-items: center;
  }
  .orb::before, .orb::after {
    content: ""; position: absolute; inset: 0; border-radius: 50%;
    border: 2px solid var(--brand); opacity: 0; animation: ripple 3.2s ease-out infinite;
  }
  .orb::after { animation-delay: 1.6s; }
  .orb-core {
    position: relative; width: 88px; height: 88px; border-radius: 28px;
    background: linear-gradient(145deg, #8b5cf6, #6d28d9);
    display: grid; place-items: center; box-shadow: 0 18px 40px -12px rgba(109, 40, 217, .55);
    animation: float 4s ease-in-out infinite;
  }
  .orb-core svg { width: 42px; height: 42px; color: #fff; }
  @keyframes ripple { 0% { transform: scale(.75); opacity: .5; } 100% { transform: scale(1.5); opacity: 0; } }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  .eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: var(--brand); }
  h1 { font-size: 28px; font-weight: 900; letter-spacing: -.02em; margin-top: 8px; }
  .lead { color: var(--muted); font-size: 15px; line-height: 1.6; margin-top: 10px; }
  .verse {
    margin-top: 24px; padding: 18px 18px 16px; border-radius: 22px; background: var(--card);
    border: 1px solid var(--border); text-align: left; box-shadow: 0 1px 2px rgba(0,0,0,.03);
  }
  .verse p { font-size: 15px; line-height: 1.6; font-style: italic; }
  .verse span { display: block; margin-top: 8px; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--brand); }
  .actions { display: grid; gap: 10px; margin-top: 24px; }
  .btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    height: 52px; border-radius: 18px; font-size: 15px; font-weight: 700; text-decoration: none;
    border: 0; cursor: pointer; font-family: inherit; transition: transform .12s ease, opacity .2s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:active { transform: scale(.97); }
  .btn-primary { background: var(--brand); color: #fff; box-shadow: 0 10px 24px -10px rgba(124, 58, 237, .7); }
  @media (prefers-color-scheme: dark) { .btn-primary { color: #1a1030; } }
  .btn-ghost { background: var(--brand-soft); color: var(--brand); }
  .btn svg { width: 18px; height: 18px; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .status {
    display: inline-flex; align-items: center; gap: 8px; margin-top: 22px;
    font-size: 12px; font-weight: 600; color: var(--muted);
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 0 4px rgba(245, 158, 11, .18); animation: pulse 1.8s ease-in-out infinite; }
  .online .dot { background: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, .2); animation: none; }
  @keyframes pulse { 50% { opacity: .45; } }
  .tip { margin-top: 18px; font-size: 12px; line-height: 1.55; color: var(--muted); }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }
</style>
</head>
<body>
<div class="glow" aria-hidden="true"></div>
<main>
  <div class="orb" aria-hidden="true">
    <div class="orb-core">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h.01"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M5 12.86a10 10 0 0 1 5.17-2.69"/>
        <path d="M19 12.86a10 10 0 0 0-2.01-1.54"/><path d="M2 8.82a15 15 0 0 1 4.18-2.65"/>
        <path d="M22 8.82a15 15 0 0 0-11.29-3.76"/><path d="m2 2 20 20"/>
      </svg>
    </div>
  </div>

  <p class="eyebrow">No connection</p>
  <h1>You&rsquo;re offline</h1>
  <p class="lead">This page hasn&rsquo;t been saved on your device yet. Pages you&rsquo;ve opened before still work, and nothing you&rsquo;ve saved is lost.</p>

  <div class="verse">
    <p id="verse-text">&ldquo;Be still, and know that I am God.&rdquo;</p>
    <span id="verse-ref">Psalm 46:10</span>
  </div>

  <div class="actions">
    <button class="btn btn-primary" id="retry" type="button">
      <svg id="retry-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>
      <span id="retry-label">Try again</span>
    </button>
    <a class="btn btn-ghost" href="/protected">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/></svg>
      Go to Home
    </a>
  </div>

  <div class="status" id="status" role="status" aria-live="polite">
    <span class="dot"></span><span id="status-text">Waiting for a connection&hellip;</span>
  </div>
  <p class="tip">This page reloads by itself as soon as you&rsquo;re back online.</p>
</main>
<script>
  (function () {
    var verses = [
      ['Be still, and know that I am God.', 'Psalm 46:10'],
      ['The LORD is my shepherd; I shall not want.', 'Psalm 23:1'],
      ['I can do all things through Christ which strengtheneth me.', 'Philippians 4:13'],
      ['Come unto me, all ye that labour and are heavy laden, and I will give you rest.', 'Matthew 11:28'],
      ['Trust in the LORD with all thine heart; and lean not unto thine own understanding.', 'Proverbs 3:5'],
      ['They that wait upon the LORD shall renew their strength.', 'Isaiah 40:31'],
      ['Thy word is a lamp unto my feet, and a light unto my path.', 'Psalm 119:105']
    ];
    var v = verses[Math.floor(Math.random() * verses.length)];
    document.getElementById('verse-text').textContent = '“' + v[0] + '”';
    document.getElementById('verse-ref').textContent = v[1];

    var retry = document.getElementById('retry');
    var icon = document.getElementById('retry-icon');
    var label = document.getElementById('retry-label');
    var status = document.getElementById('status');
    var statusText = document.getElementById('status-text');

    function tryAgain() {
      icon.classList.add('spin');
      label.textContent = 'Checking…';
      retry.disabled = true;
      // A real request, so a weak signal doesn't count as online
      fetch('/api/version?ping=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { if (r.ok) location.reload(); else throw 0; })
        .catch(function () {
          setTimeout(function () {
            icon.classList.remove('spin');
            label.textContent = 'Still offline — try again';
            retry.disabled = false;
          }, 600);
        });
    }

    retry.addEventListener('click', tryAgain);
    window.addEventListener('online', function () {
      status.classList.add('online');
      statusText.textContent = 'Back online — reloading…';
      setTimeout(function () { location.reload(); }, 800);
    });
  })();
</script>
</body>
</html>
`

function offlinePage() {
  return new Response(OFFLINE_HTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

/** Network First for HTML pages, falling back to the saved copy, then the offline page */
async function networkFirstWithOfflineFallback(request) {
  const cache = await caches.open(PAGES_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok && !response.redirected) putAndTrim(PAGES_CACHE, request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    return offlinePage()
  }
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
          url: data.url || (data.data && data.data.url) || '/protected',
          notificationId: data.data && data.data.notificationId,
          dateOfArrival: Date.now()
        },
        // Each notification gets its own tag so they stack in the tray; the server
        // reuses a tag only to replace an outdated version of the same notification
        tag: data.tag || ('samur-' + Date.now()),
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

      // CRITICAL: Always show notification, even if app is open.
      // Also update the home-screen app badge with the unread count (Android/Chrome PWA).
      const badgeCount = typeof data.badgeCount === 'number' ? data.badgeCount : undefined;
      event.waitUntil(
        self.registration.showNotification(title, options).then(() => {
          if ('setAppBadge' in self.navigator) {
            return self.navigator.setAppBadge(badgeCount).catch(() => {})
          }
        })
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
  event.notification.close();

  // Clear the home-screen badge when the user taps a notification
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {})
  }

  const urlToOpen = event.notification.data?.url || '/protected';

  // Handle action buttons (if clicked)
  if (event.action === 'close') {
    return;
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