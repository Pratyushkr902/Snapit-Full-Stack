const CACHE_NAME = 'snapit-v6'
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
    let payload = {}
    try {
        payload = event.data ? event.data.json() : {}
    } catch {
        try { payload = { body: event.data.text() } } catch {}
    }

    const title =
        payload.notification?.title ||
        payload.data?.title ||
        payload.title ||
        'Snapit Delivery'

    const body =
        payload.notification?.body ||
        payload.data?.body ||
        payload.data?.message ||
        payload.body ||
        'Your order status has been updated'

    const targetUrl =
        payload.data?.url ||
        (payload.data?.orderId ? `/#/dashboard/order-tracking/${payload.data.orderId}` : '/')

    const options = {
        body,
        icon: payload.notification?.icon || payload.data?.icon || '/snapit-icon-192.png',
        badge: '/snapit-icon-192.png',
        vibrate: [200, 100, 200],
        tag: payload.data?.orderId ? `snapit_order_${payload.data.orderId}` : undefined,
        data: { url: targetUrl },
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
