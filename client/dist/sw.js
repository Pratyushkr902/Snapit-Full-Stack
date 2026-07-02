const CACHE_NAME = 'snapit-v3'
const IMAGE_CACHE = 'snapit-images-v2'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== IMAGE_CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = e.request.url
  if (e.request.method !== 'GET') return
  if (!url.startsWith('http')) return
  if (url.includes('/api/')) return
  if (url.includes('onrender.com')) return
  if (url.includes('socket.io')) return

  // Cache R2 images with cache-first strategy
  if (url.includes('r2.dev') || url.includes('pub-af292132196c4b93bf56272675b82149')) {
    e.respondWith(
      caches.open(IMAGE_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached
          return fetch(e.request).then(response => {
            if (response.ok) cache.put(e.request, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  // Same-origin static assets - network first, fallback to cache
  if (url.includes(self.location.origin)) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    )
    return
  }
})

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(self.registration.showNotification(data.title || 'Snapit', {
    body: data.body || 'Your order has been updated',
    icon: '/snapit-icon-192.png',
  }))
})
