const CACHE_NAME = 'my-pwa-cache-v1';
const urlsToCache = [
  '/',
  'index.html',
  'icon-72.png',
  'icon-192.png'
];

// 安装Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('已打开缓存');
        return cache.addAll(urlsToCache);
      })
  );
});

// 获取请求并返回缓存内容
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果找到缓存则返回，否则从网络获取
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// 激活Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

});



