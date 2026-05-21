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
                // ✅ BULLETPROOF STATUS CAPTURE: Stops non-200 stream clones from generating TypeExceptions
                if (response && response.status === 200) {
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
                    return new Response('', { status: 408, statusText: 'Offline' })
                })
            })
    )
})

// Keep your existing push notifications listener hooks intact down here...
self.addEventListener('push', (event) => { /* ... */ });
self.addEventListener('notificationclick', (event) => { /* ... */ });