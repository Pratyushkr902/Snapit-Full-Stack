const CACHE_NAME = 'snapit-v2'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = e.request.url

  // Skip everything except GET requests to same origin static assets
  if (e.request.method !== 'GET') return
  if (!url.startsWith('http')) return
  if (url.includes('/api/')) return
  if (url.includes('onrender.com')) return
  if (url.includes('socket.io')) return
  if (url.includes('firestore') || url.includes('firebase')) return

  // Only cache same-origin static assets
  if (!url.includes(self.location.origin)) return

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
