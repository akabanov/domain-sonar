const CACHE_NAME = 'domain-sonar-v5';
const ASSETS = [
    '/css/styles.css',
    '/js/app.js',
    '/tlds.json'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const req = event.request;

    // Network-first for navigations (HTML)
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Cache-first for versioned static assets
    event.respondWith(
        caches.match(req).then(res => res || fetch(req))
    );
});
