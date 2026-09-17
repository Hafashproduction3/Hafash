importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBBh-aekSYcl0_3mHXtodGe3z9Ek-qCE2k",
  authDomain: "hafash-pk.firebaseapp.com",
  projectId: "hafash-pk",
  storageBucket: "hafash-pk.firebasestorage.app",
  messagingSenderId: "609016296952",
  appId: "1:609016296952:web:0c28e65443e34d785ed20d",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Hafash Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'Aapke liye naya update hai',
    icon: '/hafash-logo.png',
    badge: '/hafash-logo.png',
    data: { url: payload.data?.link || '/notifications' },
    vibrate: [200, 100, 200],
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/notifications';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(fullUrl);
    })
  );
});