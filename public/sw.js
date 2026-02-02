// public/sw.js

self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const title = data.title || "SamUr🤍 Update";
      const options = {
        // This 'body' is what shows the "Preview" of the post text
        body: data.body || "You have a new update in SamUr.",
        icon: '/icons/icon-192x192.png', // Main app icon
        badge: '/icons/badge-96x96.png', // Small white icon for status bar
        vibrate: [100, 50, 100],
        timestamp: Date.now(),
        data: {
          // This ensures clicking the bell alert takes you to the right place
          url: data.url || '/protected/posts',
        },
        // 'tag' prevents multiple alerts from stacking up awkwardly
        tag: 'samur-notification-sync',
        renotify: true
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (err) {
      console.error("Error parsing push data:", err);
    }
  }
});

// Handle the Click Event
self.addEventListener('notificationclick', function (event) {
  const targetUrl = event.notification.data.url;
  
  event.notification.close(); // Close the notification drawer

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. If the app is already open, focus it and navigate
      for (let client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. If app is closed, open a new window to the posts place
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});