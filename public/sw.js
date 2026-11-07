/* GoatWise service worker.
 *
 * 1. Push notifications: shows them, and opens the right page when tapped.
 * 2. Poor signal: keeps the app's pages and files so it still opens in the
 *    barn, and serves the last copy of a page when the network is down.
 *    Data saved while offline is queued by the app itself (src/lib/offline.ts)
 *    and sent when the connection comes back.
 */
const VERSION = 'goatwise-v1';
const SHELL = ['/dashboard', '/dashboard/chores', '/dashboard/treatments', '/dashboard/restock', '/dashboard/emergency', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => Promise.all(SHELL.map((u) => cache.add(u).catch(() => undefined)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase data is never cached here
  if (url.pathname.startsWith('/api/')) return;

  // Built files never change at the same URL: cache first.
  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
        return res;
      }))
    );
    return;
  }

  // Pages: network first, last good copy when offline.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('/dashboard')))
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'GoatWise', body: event.data && event.data.text() }; }
  const title = data.title || 'GoatWise';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.id || undefined,
      requireInteraction: !!data.urgent,
      data: { link: data.link || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { w.navigate(link); return w.focus(); }
      }
      return self.clients.openWindow(link);
    })
  );
});
