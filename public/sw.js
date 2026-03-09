// ÇakmakKoçluk Service Worker — Merkezi Push Bildirim Motoru

// ─── PUSH (sunucudan gelen OS bildirimi) ───────────────────────────────────
self.addEventListener('push', function (event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = {}; }

  const options = {
    body: data.message || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.link || '/' },
    vibrate: [200, 100, 200],
    tag: data.id || 'push-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Aç' },
      { action: 'dismiss', title: 'Kapat' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ÇakmakKoçluk', options)
  );
});

// ─── MESSAGE (sekme açıkken ana thread'den gelen bildirim) ─────────────────
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const d = event.data;
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

// ─── NOTIFICATION CLICK — uygulamayı ilgili sayfaya yönlendir ─────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
          return client.focus().then(function (c) {
            if (c.navigate) c.navigate(targetUrl);
            return c;
          });
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ─── INSTALL — anında aktif et ─────────────────────────────────────────────
self.addEventListener('install', function () {
  self.skipWaiting();
});

// ─── ACTIVATE — tüm istemcileri yakala ────────────────────────────────────
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});
