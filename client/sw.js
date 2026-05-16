const CACHE_NAME = 'snapit-v1'
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

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 200) {
                    const url = new URL(event.request.url)
                    const isCacheable = url.origin === self.location.origin
                        || event.request.destination === 'image'

                    if (isCacheable) {
                        const clone = response.clone()
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, clone)
                        })
                    }
                }
                return response
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html')
                    }
                    // ✅ Fix: always return a valid Response, never undefined
                    return new Response('', {
                        status: 408,
                        statusText: 'Offline'
                    })
                })
            })
    )
})

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