// Water Monitor Service Worker
// Cache Policy: Cache the App Shell ONLY, NEVER database responses.

// CACHE_NAME is replaced with a unique timestamp on every build by Vite
const CACHE_NAME = 'water-monitor-shell-__BUILD_VERSION__';

// Static App Shell assets to precache
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
];

// Install: precache the core app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS).catch((err) => {
        console.warn('[SW] App shell precache notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: intercept static assets and navigations; NEVER cache database or auth or push responses
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Rule 1: Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Rule 2: NEVER cache database, auth, websocket, or external telemetry/push responses
  // - Firebase Realtime Database (firebaseio.com, firebasedatabase.app)
  // - Firebase Auth (identitytoolkit.googleapis.com, securetoken.googleapis.com)
  // - Ntfy push notifications (ntfy.sh, etc.)
  // - WebSocket handshakes (ws:, wss:)
  // - REST database endpoints (*.json)
  const isDatabaseOrAuthOrPush =
    url.protocol === 'ws:' ||
    url.protocol === 'wss:' ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebasedatabase.app') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken') ||
    url.hostname.includes('ntfy.sh') ||
    url.pathname.endsWith('.json') ||
    url.searchParams.has('ns') ||
    url.searchParams.has('auth');

  if (isDatabaseOrAuthOrPush) {
    // Pass straight through to network; NEVER touch the cache
    return;
  }

  // Navigation requests and index.html: ALWAYS fetch from network first with offline fallback
  const isIndexHtml =
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname === '/' ||
    url.pathname.endsWith('/');

  if (isIndexHtml) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback to cached index.html or root
          const cached =
            (await caches.match('./index.html')) ||
            (await caches.match('./')) ||
            (await caches.match(request));
          if (cached) return cached;
          return new Response(
            '<!DOCTYPE html><html><body><h1>Offline</h1><p>Water Monitor is currently offline. Please reconnect to the internet.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Same-origin App Shell static assets (JS, CSS, SVGs, Fonts, Images)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached asset immediately; revalidate in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {/* ignore network errors during revalidation */});
          return cachedResponse;
        }

        // Fetch from network and cache successful response
        return fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
