const CACHE_NAME = 'snapit-v6'
const IMAGE_CACHE = 'snapit-images-v3'

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
  if (url.includes('railway.app')) return
  if (url.includes('onrender.com')) return
  if (url.includes('socket.io')) return

  // Cache R2 images with cache-first strategy
  if (url.includes('r2.dev') || url.includes('pub-af292132196c4b93bf56272675b82149')) {
    e.respondWith(
      caches.open(IMAGE_CACHE).then(async cache => {
        const cached = await cache.match(e.request)
        if (cached) return cached
        try {
          const response = await fetch(e.request)
          if (response && response.ok) cache.put(e.request, response.clone())
          return response
        } catch (err) {
          return cached || new Response('', { status: 408, statusText: 'Request timed out' })
        }
      })
    )
    return
  }

  // Same-origin static assets - network first, fallback to cache, NEVER return undefined
  if (url.includes(self.location.origin)) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response && response.status === 200 && e.request.url.includes('/assets/')) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(e.request)
          if (cached) return cached
          if (e.request.mode === 'navigate') {
            const indexHtml = await caches.match('/index.html')
            if (indexHtml) return indexHtml
          }
          return new Response('Network error occurred. Please refresh.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          })
        })
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
