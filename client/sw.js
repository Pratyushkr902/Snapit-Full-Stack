const CACHE_NAME    = 'snapit-v1'
const STATIC_ASSETS = ['/', '/index.html']

// ── Install: pre-cache shell assets ──────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
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
        )
    )
    self.clients.claim()
})

// ── Fetch: network-first with cache fallback ──────────────────────────────────
self.addEventListener('fetch', (event) => {
    // Let the browser handle non-GET and API requests natively.
    // IMPORTANT: do NOT call event.respondWith() here — returning early
    // without respondWith() is valid and lets the browser handle the request.
    if (event.request.method !== 'GET') return
    if (event.request.url.includes('/api/')) return

    event.respondWith(handleFetch(event.request))
})

async function handleFetch(request) {
    try {
        const networkResponse = await fetch(request)

        // Only cache successful same-origin responses and images from any origin
        if (networkResponse.status === 200) {
            const url        = new URL(request.url)
            const isCacheable = url.origin === self.location.origin
                || request.destination === 'image'

            if (isCacheable) {
                const clone = networkResponse.clone()
                // Fire-and-forget cache write — don't await, avoids blocking response
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
        }

        return networkResponse

    } catch {
        // Network failed — try the cache
        const cached = await caches.match(request)
        if (cached) return cached

        // For page navigations, fall back to the cached app shell
        if (request.mode === 'navigate') {
            const shell = await caches.match('/index.html')
            if (shell) return shell

            // Shell not cached yet (first install) — return a proper offline page
            return new Response(
                `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8"><title>Offline</title></head>
  <body style="font-family:sans-serif;text-align:center;padding:60px">
    <h1>You're offline</h1>
    <p>Please check your connection and try again.</p>
  </body>
</html>`,
                {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/html' }
                }
            )
        }

        // For any other resource (image, script, etc.) — return a 408 stub.
        // This is the fix for "Failed to convert value to 'Response'":
        // event.respondWith() must ALWAYS receive a Response, never undefined.
        return new Response('', {
            status:     408,
            statusText: 'Request Timeout (Offline)'
        })
    }
}

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
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

    event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    if (event.action === 'dismiss') return

    const url = event.action === 'track'
        ? (event.notification.data?.url || '/dashboard/myorders')
        : '/'

    event.waitUntil(clients.openWindow(url))
})