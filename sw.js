const SHELL_CACHE = 'lingdong-pwa-shell-v3'
const MODEL_CACHE = 'lingdong-pwa-models-v1'
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '')
const appPath = (path) => `${BASE_PATH}${path}`
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/lingdong.svg'].map(appPath)
const MANAGED_CACHES = new Set([SHELL_CACHE, MODEL_CACHE])

function isModelAsset(url) {
  return url.pathname.includes('/mediapipe/')
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => !MANAGED_CACHES.has(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  // Never cache live device frames, IMU state, relay responses, or cloud data.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/video/')) return
  if (isModelAsset(url)) {
    event.respondWith(caches.open(MODEL_CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) await cache.put(request, response.clone())
      return response
    }))
    return
  }
  event.respondWith(fetch(request).then((response) => {
    if (response.ok && (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.destination === 'document')) {
      const copy = response.clone()
      caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
    }
    return response
  }).catch(() => caches.match(request).then((cached) => cached || caches.match(appPath('/index.html'))))
})
