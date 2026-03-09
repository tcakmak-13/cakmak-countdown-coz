// ÇakmakKoçluk Service Worker — PWA + Push Notification Engine
const CACHE_NAME = 'cakmak-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// ─── INSTALL — Cache static assets ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently fail if assets can't be cached
      });
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE — Clean old caches and claim clients ────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ─── FETCH — Network-first with cache fallback ────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests, chrome-extension, and OAuth routes
  if (
    event.request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.pathname.startsWith('/~oauth') ||
    url.pathname.includes('supabase')
  ) {
    return;
  }

  // For navigation requests, always try network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/') || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // For other requests, network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.ok && url.origin === self.location.origin) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// ─── PUSH (Server-sent OS notification) ───────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = {};
  }

  const options = {
    body: data.message || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: { url: data.link || '/' },
    vibrate: [200, 100, 200],
    tag: data.id || 'push-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Aç' },
      { action: 'dismiss', title: 'Kapat' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ÇakmakKoçluk', options)
  );
});

// ─── MESSAGE (From main thread when tab is open) ──────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const d = event.data;
    self.registration.showNotification(d.title || 'ÇakmakKoçluk', {
      body: d.message || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      data: { url: d.link || '/' },
      vibrate: [200, 100, 200],
      tag: d.id || 'msg-' + Date.now(),
      renotify: true
    });
  }
  
  // Handle skip waiting message from app
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── NOTIFICATION CLICK — Navigate to relevant page ─────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
          return client.focus().then((c) => {
            if (c.navigate) c.navigate(targetUrl);
            return c;
          });
        }
      }
      // Open new window
      return clients.openWindow(targetUrl);
    })
  );
});
