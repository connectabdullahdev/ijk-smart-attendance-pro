// ============================================================
// FILE: sw.js
// PURPOSE: PWA Service Worker – caches app shell for offline
//          use (Feature #4 – Low Connectivity Mode).
//          Firebase Firestore handles its own offline persistence
//          separately via enableIndexedDbPersistence().
// ============================================================

const CACHE_NAME   = 'ijk-attend-v1.2';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/modules/ui-helpers.js',
  '/modules/anti-cheat.js',
  '/modules/device-fingerprint.js',
  '/modules/auto-logout.js',
  '/modules/teacher.js',
  '/modules/admin.js',
  '/modules/manage-teachers.js',
  '/modules/manage-slots.js',
  '/modules/manage-locations.js',
  '/modules/announcements.js',
  '/modules/leave-requests.js',
  '/modules/timetable.js',
  '/modules/subadmin.js',
  '/modules/reports.js',
  // External CDN assets cached on first load
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
];

// ── INSTALL: Cache all shell assets ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      // Cache what we can; don't fail install if CDN is unavailable
      return Promise.allSettled(
        SHELL_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: Remove old caches ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Cache-first for shell, network-first for API ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept Firebase / Firestore / Auth calls
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken') ||
    url.hostname.includes('worldtimeapi')
  ) {
    return; // Let Firebase handle its own requests
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache – fetch from network and cache the response
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      }).catch(() => {
        // Offline fallback for HTML navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ── BACKGROUND SYNC (optional, for future use) ───────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    console.log('[SW] Background sync triggered for attendance');
    // Firestore SDK handles this automatically via persistence
  }
});
