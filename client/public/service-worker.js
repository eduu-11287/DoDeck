const CACHE_NAME = 'daymark-shell-v1';
const API_PATHS = [
  '/check_auth',
  '/download-notes',
  '/health',
  '/init-db',
  '/login',
  '/logout',
  '/notes',
  '/register',
  '/streak',
  '/tasks',
];
const APP_ASSETS = [
  '/manifest.webmanifest',
  '/daymark.svg',
  '/daymark-192.svg',
  '/daymark-512.svg',
];

function isApiPath(pathname) {
  return API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch('/', { cache: 'reload' });
    if (!response.ok) throw new Error(`Unable to precache Daymark shell: ${response.status}`);

    const cache = await caches.open(CACHE_NAME);
    const html = await response.clone().text();
    await cache.put('/', response);
    await cache.addAll(APP_ASSETS);

    const paths = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
      .map((match) => new URL(match[1], self.location.origin))
      .filter((url) => url.origin === self.location.origin)
      .map((url) => url.href);

    await Promise.all(paths.map(async (path) => {
      const asset = await fetch(path, { cache: 'reload' });
      if (!asset.ok) throw new Error(`Unable to precache Daymark asset: ${path}`);
      await cache.put(path, asset);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith('daymark-shell-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== 'GET'
    || url.origin !== self.location.origin
    || isApiPath(url.pathname)
  ) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/', response.clone());
        }
        return response;
      } catch {
        const cachedPage = await caches.match('/', { ignoreVary: true });
        if (cachedPage) return cachedPage;
        return new Response('Daymark is unavailable offline. Reconnect and try again.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })());
    return;
  }

  if (!['script', 'style', 'image', 'font'].includes(request.destination)) return;
  event.respondWith((async () => {
    const cachedAsset = await caches.match(request, { ignoreVary: true });
    if (cachedAsset) return cachedAsset;

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
