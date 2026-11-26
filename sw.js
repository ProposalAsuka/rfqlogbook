/* Service worker — Proposal Logbook. Naikkan VERSION setiap rilis agar cache lama dibuang. */
var VERSION = 'logbook-v14-2.';
var SHELL = [
  './', 'index.html', 'offline.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png',
  'libs/xlsx.full.min.js', 'libs/html2canvas.min.js', 'libs/jspdf.umd.min.js'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(SHELL); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('message', function(e){ if(e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;                       /* panggilan API (POST) tidak pernah di-cache */
  var url = new URL(req.url);
  if(url.origin !== location.origin) return;             /* hanya file milik sendiri */

  /* Halaman: jaringan dulu (selalu versi terbaru), cadangan cache, lalu halaman offline */
  if(req.mode === 'navigate' || url.pathname.slice(-1) === '/' || /\.html$/.test(url.pathname)){
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(function(res){
        var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put('index.html', copy); });
        return res;
      }).catch(function(){
        return caches.match('index.html').then(function(r){ return r || caches.match('offline.html'); });
      })
    );
    return;
  }

  /* Aset statis (ikon, library, manifest): cache dulu */
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        if(res && res.ok){ var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(req, copy); }); }
        return res;
      });
    })
  );
});
