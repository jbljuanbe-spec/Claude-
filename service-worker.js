// Service worker de Kotoba: hace la app instalable y utilizable sin conexión.
// Estrategia: red primero (para tener siempre lo último), con caché como
// respaldo cuando no hay conexión. El resto de recursos se va cacheando
// solo según se navega (runtime caching).
//
// La primera visita NUNCA está controlada por el service worker (así
// funciona la especificación), así que sin un precaché explícito el
// "cascarón" de la app (HTML/CSS/JS) no quedaría disponible offline hasta
// la segunda visita. Para que funcione desde el primer "Instalar", se
// precachea aquí. Sube CACHE al publicar cambios en estos archivos.
const CACHE = 'kotoba-v2';
const CASCARON = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/almacen.js',
  'js/api.js',
  'js/app.js',
  'js/ciudades.js',
  'js/curriculum.js',
  'js/kana.js',
  'js/lecciones.js',
  'js/lottie.js',
  'js/mapa-japon.js',
  'js/mapa-render.js',
  'js/motor.js',
  'js/perfil.js',
  'js/review.js',
  'js/shadowing.js',
  'js/tts.js',
  'js/viaje.js',
  'js/vocabulario.js',
  'js/voz.js',
  'vendor/lottie_light.min.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', event => {
  // Cachea cada archivo por separado: si uno falla, no tira abajo el resto
  // (a diferencia de cache.addAll, que aborta todo si un solo recurso falla).
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(CASCARON.map(ruta => c.add(ruta))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(claves =>
      Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fuentes de Google, etc: red normal

  event.respondWith(
    fetch(req).then(res => {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
      return res;
    }).catch(async () => {
      const cacheado = await caches.match(req);
      if (cacheado) return cacheado;
      if (req.mode === 'navigate') {
        const raiz = await caches.match('index.html');
        if (raiz) return raiz;
      }
      throw new Error('sin-conexion-y-sin-cache');
    })
  );
});
