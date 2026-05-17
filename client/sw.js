// ── Version: bump this on every new build to bust stale caches ───────────────
const CACHE_NAME    = 'snapit-v2'

// Only cache the app shell — never hashed JS/CSS bundles (browser HTTP cache
// handles those). One 404 in addAll() kills the entire SW install, so we keep
// this list minimal and safe.
const STATIC_ASSETS = ['/index.html']

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            // Promise.allSettled so a single 404 never aborts the whole install
            Promise.allSettled(
                STATIC_ASSETS.map((url) =>
                    cache.add(url).catch((err) =>
                        console.warn(`SW: failed to cache ${url}:`, err)
                    )
                )
            )
        ).then(() => self.skipWaiting())
    )
})

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    )
})

// ── Fetch: network-first, cache fallback ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
    // Let the browser handle non-GET and API requests natively.
    // Returning without calling event.respondWith() is valid here.
    if (event.request.method !== 'GET') return
    if (event.request.url.includes('/api/')) return

    // Do NOT intercept hashed build assets (Vite/Webpack bundles).
    // Stale SW caching of these causes the 404 on index-XXXX.js.
    const url = new URL(event.request.url)
    const isHashedAsset = /\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname)
    if (isHashedAsset) return

    event.respondWith(handleFetch(event.request))
})

async function handleFetch(request) {
    try {
        const networkResponse = await fetch(request)

        if (networkResponse.status === 200) {
            const url         = new URL(request.url)
            const isCacheable = url.origin === self.location.origin
                || request.destination === 'image'

            if (isCacheable) {
                const clone = networkResponse.clone()
                // Fire-and-forget — don't await, avoids blocking the response
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
        }

        return networkResponse

    } catch {
        // Network failed — try cache first
        const cached = await caches.match(request)
        if (cached) return cached

        // For page navigations fall back to the cached app shell
        if (request.mode === 'navigate') {
            const shell = await caches.match('/index.html')
            if (shell) return shell

            // Shell not cached yet (very first install) — return a proper page
            return new Response(
                `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8"><title>Offline - Snapit</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 60px; background: #f9f9f9; }
    h1   { color: #333; }
    p    { color: #666; }
  </style>
  </head>
  <body>
    <h1>You're offline</h1>
    <p>Please check your connection and try again.</p>
  </body>
</html>`,
                {
                    status:     503,
                    statusText: 'Service Unavailable',
                    headers:    { 'Content-Type': 'text/html' }
                }
            )
        }

        // Any other resource (image, font, etc.) — always return a valid Response.
        // This is the direct fix for "Failed to convert value to 'Response'".
        return new Response('', {
            status:     408,
            statusText: 'Request Timeout (Offline)'
        })
    }
}

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
    // Guard: if no notification permission or registration, bail safely
    if (!self.registration?.showNotification) {
        console.warn('SW: push received but notifications not available')
        return
    }

    let data = {}
    if (event.data) {
        try        { data = event.data.json() }
        catch      { data = { title: event.data.text() } }
    }

    const title   = data.title || 'Snapit Update'
    const options = {
        body:    data.body  || 'Your order has been updated',
        icon:    '/snapit-icon-192.png',
        badge:   '/snapit-icon-192.png',
        vibrate: [200, 100, 200],
        data:    { url: data.url || '/' },
        actions: [
            { action: 'track',   title: '📍 Track Order' },
            { action: 'dismiss', title: 'Dismiss'        }
        ]
    }

    event.waitUntil(
        self.registration.showNotification(title, options).catch((err) => {
            console.error('SW: showNotification failed:', err)
        })
    )
})

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    if (event.action === 'dismiss') return

    const url = event.action === 'track'
        ? (event.notification.data?.url || '/dashboard/myorders')
        : '/'

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Focus existing open tab instead of opening a new one
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus()
                }
            }
            return clients.openWindow(url)
        })
    )
})