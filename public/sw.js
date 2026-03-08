// public/sw.js

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

// Install event - cache critical assets
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});

// Background sync for offline support (optional enhancement)
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Placeholder for syncing pending notifications when back online
  console.log('Syncing notifications...');
}