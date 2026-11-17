/* global __APP_VERSION__ */

const CACHE_PREFIX = 'deepseek-mobile-shell-'
const CACHE_NAME = `${CACHE_PREFIX}${__APP_VERSION__}`
const scopeUrl = new URL('./', self.registration.scope)
const OFFLINE_URL = new URL('offline.html', scopeUrl).href
const APP_SHELL = [
  OFFLINE_URL,
  new URL('manifest.webmanifest', scopeUrl).href,
  new URL('icons/icon-192.png', scopeUrl).href,
  new URL('icons/icon-512.png', scopeUrl).href,
]
const STATIC_DESTINATIONS = new Set(['script', 'style', 'font', 'image', 'manifest'])
const API_PATH_PATTERN = /\/(?:anthropic|models|chat\/completions)(?:\/|$)/i

const precacheAppShell = async () => {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(APP_SHELL)

  const indexResponse = await fetch(scopeUrl.href, { cache: 'reload' })
  if (!indexResponse.ok) {
    throw new Error(`Unable to cache the app shell (${indexResponse.status})`)
  }
  await cache.put(scopeUrl.href, indexResponse.clone())

  const html = await indexResponse.text()
  const assetUrls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => new URL(match[1], scopeUrl))
    .filter((url) => url.origin === scopeUrl.origin)
    .map((url) => url.href)
  await cache.addAll([...new Set(assetUrls)])
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAppShell())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

const canCache = (request, url) =>
  request.method === 'GET' &&
  url.origin === scopeUrl.origin &&
  !request.headers.has('authorization') &&
  !request.headers.has('x-api-key') &&
  !API_PATH_PATTERN.test(url.pathname)

const cacheResponse = async (request, response) => {
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(request, response.clone())
  }
  return response
}

const networkFirstNavigation = async (request) => {
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(scopeUrl.href, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? (await caches.match(scopeUrl.href)) ?? (await caches.match(OFFLINE_URL))
  }
}

const cacheFirstStatic = async (request) => {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }
  return cacheResponse(request, await fetch(request))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (!canCache(request, url)) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (STATIC_DESTINATIONS.has(request.destination)) {
    event.respondWith(cacheFirstStatic(request))
  }
})
