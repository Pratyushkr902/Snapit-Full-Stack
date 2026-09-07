importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');
importScripts('/sw.js');

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

// Service Worker In-Memory Deduplication Cache (prevents duplicate notification spawns within 5s)
const recentNotifs = new Map();

// ── Native W3C Push Handler (Guarantees iOS Safari & WebKit Display) ─────────
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    try {
      payload = { body: event.data.text() };
    } catch (_) {}
  }

  const title =
    payload.notification?.title ||
    payload.data?.title ||
    payload.title ||
    'Snapit Delivery';

  const body =
    payload.notification?.body ||
    payload.data?.body ||
    payload.data?.message ||
    payload.body ||
    'Your order status has been updated';

  // Deduplication check: suppress duplicate pushes received within 5 seconds
  const dedupKey = `${title}__${body}`.trim();
  const now = Date.now();
  if (recentNotifs.has(dedupKey) && (now - recentNotifs.get(dedupKey) < 5000)) {
    console.log('[firebase-messaging-sw.js] 🔇 Duplicate push suppressed:', dedupKey);
    return;
  }
  recentNotifs.set(dedupKey, now);

  // Clean stale keys
  if (recentNotifs.size > 50) {
    for (const [k, time] of recentNotifs.entries()) {
      if (now - time > 15000) recentNotifs.delete(k);
    }
  }

  const origin = self.location.origin || 'https://snapit.pages.dev';
  let icon = payload.notification?.icon || payload.data?.icon || `${origin}/snapit-icon-192.png`;
  if (typeof icon === 'string' && !icon.startsWith('http://') && !icon.startsWith('https://')) {
    icon = `${origin}${icon.startsWith('/') ? '' : '/'}${icon}`;
  }
  const badge = `${origin}/snapit-icon-192.png`;
  const targetUrl = payload.data?.url || (payload.data?.orderId ? `/#/dashboard/order-tracking/${payload.data.orderId}` : '/');

  const tag = payload.data?.orderId 
    ? `snapit_order_${payload.data.orderId}` 
    : (payload.notification?.tag || payload.data?.type || 'snapit_promo');

  const options = {
    body,
    icon,
    badge,
    data: { url: targetUrl },
    tag,
    renotify: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.warn('[firebase-messaging-sw.js] showNotification note:', err?.message);
    })
  );
});

// Fallback for Firebase SDK background handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
