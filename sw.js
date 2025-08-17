const CACHE_NAME = 'nukehub-cache-v2';
const urlsToCache = [
  // Core files
  '/',
  '/index.html',
  '/404.html',

  // Fonts
  '/css/fonts/NukeHub.eot',
  '/css/fonts/NukeHub.svg',
  '/css/fonts/NukeHub.ttf',
  '/css/fonts/NukeHub.woff',

  // Stylesheets
  '/css/style.css',
  '/css/nukehub.min.css',
  '/css/swiper-bundle.min.css',

  // JavaScript
  '/js/main.min.js',
  '/js/jquery-3.7.1.min.js',
  '/js/fullcalendar-6.1.10.min.js',
  '/js/index.var.js',
  '/js/jquery.contextMenu.min.js',
  '/js/jquery.ui.position.min.js',
  '/js/moment.min.js',
  '/js/particles.min.js',
  '/js/popper.min.js',
  '/js/scrollreveal.min.js',
  '/js/swiper-bundle.min.js',
  '/js/tooltip.min.js',

  // Assets
  '/assets/images/nukehub.svg',
  '/assets/images/nukehub-brand.svg',

  // Community Pages
  '/events.html',
  '/people.html',

  // Manual Pages
  '/about.html',
  '/acknowledgment.html',
  '/code-of-conduct.html',
  '/privacy-policy.html',
  '/support.html',
  '/terms-of-service.html',

  // Project Pages
  '/nrms.html',
  '/nuke-analytics.html',
  '/nuke-lab.html'
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
