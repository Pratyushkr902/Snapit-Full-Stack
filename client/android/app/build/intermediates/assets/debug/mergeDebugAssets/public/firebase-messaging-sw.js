importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyAn7lwvs2e4x1vkHN3aqpZL1cwF5_LCFrE",
  authDomain: "snapit-da080.firebaseapp.com",
  projectId: "snapit-da080",
  storageBucket: "snapit-da080.firebasestorage.app",
  messagingSenderId: "404894201207",
  appId: "1:404894201207:web:1603b3e3dc46f65f4e9d72"
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload)
  const { title, body } = payload.notification || {}
  self.registration.showNotification(title || 'Snapit', {
    body: body || 'You have a new notification',
    icon: '/snapit-icon-192.png',
    badge: '/snapit-icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [
      { action: 'open', title: '📍 Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow('/rider-panel'))
  }
})