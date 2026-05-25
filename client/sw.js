const CACHE_NAME = 'snapit-v3' // ✅ Upgraded cache key index namespace structure
const STATIC_ASSETS = ['/', '/index.html']

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS)
        }).then(() => self.skipWaiting())
    )
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        })
    )
    self.clients.claim()
})

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return
    if (event.request.url.includes('/api/')) return
    if (event.request.url.includes('firestore') || event.request.url.includes('firebase')) return
    if (!event.request.url.startsWith('http')) return

    // ✅ FIXED: Explicitly block caching on your core JavaScript compilation chunks to prevent legacy URL loop replays
    if (event.request.url.includes('.js') || event.request.url.includes('assets/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (
                    response &&
                    response.status === 200 &&
                    response.type === 'basic'
                ) {
                    const clone = response.clone()
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone)
                    })
                }
                return response
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html')
                    }
                    return new Response('', { status: 408, statusText: 'Offline' })
                })
            })
    )
})

// --- PUSH NOTIFICATION ENGINES ---
self.addEventListener('push', (event) => {
    const data = event.data
        ? (() => { try { return event.data.json() } catch { return { title: event.data.text() } } })()
        : {}

    const title = data.title || 'Snapit Update'
    const options = {
        body: data.body || 'Your order has been updated',
        icon: '/snapit-icon-192.png',
        badge: '/snapit-icon-192.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/' },
        actions: [
            { action: 'track', title: '📍 Track Order' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    }
    event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    if (event.action === 'dismiss') return
    const url = event.action === 'track'
        ? (event.notification.data.url || '/dashboard/myorders')
        : '/'
    event.waitUntil(clients.openWindow(url))
})