importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAn7lwvs2e4x1vkHN3aqpZL1cwF5_LCFrE",
  authDomain: "snapit-da080.firebaseapp.com",
  projectId: "snapit-da080",
  storageBucket: "snapit-da080.firebasestorage.app",
  messagingSenderId: "404894201207",
  appId: "1:404894201207:web:1603b3e3dc46f65f4e9d72",
  measurementId: "G-MHJZV49XNS"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  const title = payload.notification?.title || payload.data?.title || 'Snapit Delivery';
  const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'Your order status has been updated';
  const icon = payload.notification?.icon || payload.data?.icon || '/snapit-icon-192.png';
  const targetUrl = payload.data?.url || (payload.data?.orderId ? `/#/dashboard/order-tracking/${payload.data.orderId}` : '/');

  self.registration.showNotification(title, {
    body,
    icon,
    badge: '/snapit-icon-192.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.orderId ? `snapit_order_${payload.data.orderId}` : undefined,
    data: { url: targetUrl },
    actions: [
      { action: 'track', title: '📍 Track Order' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.action === 'track'
    ? (event.notification.data?.url || '/dashboard/myorders')
    : '/';
  event.waitUntil(clients.openWindow(url));
});
