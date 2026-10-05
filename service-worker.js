const CACHE_NAME = 'kdassist-v1.15.3';
const urlsToCache = [
  './',
  './index.html',
  './treasuremaps/',
  './menu/kdassisticon.png',
  './menu/uploadicon.png',
  './menu/uploadpreviewericon.png',
  './assets/assetsicon.png',
  './assets/assetsicon-tab.png',
  './assets/shieldicon.png',
  './bkbenchmark/benchmark.html',
  './icons/map2a.png',
  './maps.csv',
  './icons/menubackground.png'
];

function shouldUseNetworkFirst(request, acceptHeader) {
  if (request.method !== 'GET') return false;

  const destination = request.destination || '';
  if (destination === 'document' || destination === 'script' || destination === 'style' || destination === 'worker') {
    return true;
  }

  if (acceptHeader.includes('text/html') || acceptHeader.includes('text/css') || acceptHeader.includes('javascript')) {
    return true;
  }


  const path = request.url.split('?')[0];
  return path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.mjs') || path.endsWith('.json');
}

function buildNetworkFirstRequest(request) {
  try {
    return new Request(request, { cache: 'no-store' });
  } catch (error) {
    return request;
  }
}


self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});


self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});


self.addEventListener('fetch', event => {

  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  const accept = event.request.headers.get('accept') || '';
  if (shouldUseNetworkFirst(event.request, accept)) {
    event.respondWith(
      fetch(buildNetworkFirstRequest(event.request)).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {

      if (cachedResponse) {
        return cachedResponse;
      }


      return fetch(event.request).then(response => {

        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
