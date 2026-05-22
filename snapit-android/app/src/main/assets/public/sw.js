const CACHE_NAME = 'snapit-v1'

self.addEventListener('install', e => { self.skipWaiting() })
self.addEventListener('activate', e => { self.clients.claim() })

self.addEventListener('fetch', e => {
  // Only handle GET requests, skip non-HTTP requests
  if (e.request.method !== 'GET') return
  if (!e.request.url.startsWith('http')) return
  if (e.request.url.includes('/api/')) return
  
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(self.registration.showNotification(data.title || 'Snapit', {
    body: data.body || 'Your order has been updated',
    icon: '/snapit-icon-192.png',
  }))
})
