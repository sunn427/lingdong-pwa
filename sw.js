const CACHE = 'lingdong-pwa-shell-v2'
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '')
const appPath = (path) => `${BASE_PATH}${path}`
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/lingdong.svg'].map(appPath)

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  // Never cache live device frames, IMU state, relay responses, or cloud data.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/video/')) return
  event.respondWith(fetch(request).then((response) => {
    if (response.ok && (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.destination === 'document')) {
      const copy = response.clone()
      caches.open(CACHE).then((cache) => cache.put(request, copy))
    }
    return response
  }).catch(() => caches.match(request).then((cached) => cached || caches.match(appPath('/index.html'))))
})
