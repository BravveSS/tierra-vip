/* ============================================================================
   TIERRA — Service Worker: resiliencia offline
   La costa (Mazunte, Puerto Ángel) tiene cobertura móvil inestable — si la
   señal se cae a media navegación, el sitio sigue funcionando desde caché.

   Estrategia: NETWORK FIRST con fallback a caché.
   - Siempre intenta la red (nunca sirve contenido viejo si hay señal).
   - Cachea en segundo plano cada respuesta buena del mismo origen.
   - Sin red: responde desde caché; si es una navegación sin caché, cae al home.
   - NO cachea: videos .mp4 (pesados), funciones de Netlify (IA), ni
     peticiones que no sean GET del mismo origen (CDN, fonts, analytics
     los maneja el navegador con su caché normal).
   ========================================================================== */
'use strict';

var CACHE = 'tierra-v1';

/* Precache mínimo: lo justo para que una visita repetida sin señal
   tenga página, estilos y logo. Rutas RELATIVAS al scope del SW, así
   funciona igual en github.io/tierra-vip/ y en tierra.vip (raíz). */
var CORE = [
  './',
  'assets/styles.min.css?v=15',
  'assets/pages.css?v=11',
  'assets/img/brand/tierra-logo.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // addAll atómico fallaría todo si una ruta falla; se cachean una a una
      return Promise.all(CORE.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== location.origin) return;          // CDNs y fonts: caché nativa
  if (url.pathname.slice(-4) === '.mp4') return;       // videos: no llenar el caché
  if (url.pathname.indexOf('/.netlify/') !== -1) return; // backend IA: siempre red

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var clone = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, clone); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        // navegación sin caché → home cacheado antes que pantalla en blanco
        if (req.mode === 'navigate') return caches.match('./');
        return Response.error();
      });
    })
  );
});
