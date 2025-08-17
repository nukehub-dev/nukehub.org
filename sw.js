const CACHE_NAME = 'nukehub-cache-v2';
const urlsToCache = [
  // Core files
  '/',
  '/index.html',
  '/404.html',

  // Stylesheets
  '/css/style.css',
  '/css/nukehub.min.css',

  // JavaScript
  '/js/main.min.js',
  '/js/jquery-3.7.1.min.js',

  // Assets
  '/assets/images/nukehub.svg',
  '/assets/images/nukehub-brand.svg',

  // Community Pages
  '/community/events.html',
  '/community/people.html',

  // Manual Pages
  '/manual/about.html',
  '/manual/acknowledgment.html',
  '/manual/code_of_conduct.html',
  '/manual/privacy.html',
  '/manual/support.html',
  '/manual/terms.html',

  // Project Pages
  '/projects/nrms.html',
  '/projects/nuke-analytics.html',
  '/projects/nuke-lab.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
