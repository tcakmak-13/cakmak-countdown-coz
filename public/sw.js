// ÇakmakKoçluk Service Worker - Push Notifications & PWA

// Push event from server (requires VAPID keys)
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = {}; }
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'ÇakmakKoçluk', {
      body: data.message || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: data.link || '/' },
      vibrate: [200, 100, 200],
      tag: data.id || 'push-' + Date.now(),
      renotify: true,
    })
  );
});

// Message from main thread (for realtime notifications)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    var d = event.data;
    self.registration.showNotification(d.title || 'ÇakmakKoçluk', {
      body: d.message || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: d.link || '/' },
      vibrate: [200, 100, 200],
      tag: d.id || 'msg-' + Date.now(),
      renotify: true,
    });
  }
});

// Notification click - open app and navigate
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Try to focus existing window
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
          return client.focus().then(function(c) {
            if (c.navigate) c.navigate(url);
            return c;
          });
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});

// Install - activate immediately
self.addEventListener('install', function() {
  self.skipWaiting();
});

// Activate - claim all clients
self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});
