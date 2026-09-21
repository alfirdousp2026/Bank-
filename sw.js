// غيّر رقم النسخة لما تحدّث الملفات عشان الموبايل ياخد التحديث
const V = 'recon-v2';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function notify() {
  self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ type: 'update' })));
}

// الكاش أولًا (يشتغل بدون نت) + تحديث في الخلفية + إشعار لو الصفحة اتغيّرت
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== self.location.origin || u.searchParams.has('chk')) return;
  e.respondWith((async () => {
    const cache = await caches.open(V);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(async (res) => {
      if (res && res.ok) {
        const isPage = /(\/|index\.html)$/.test(new URL(req.url).pathname);
        if (hit && isPage) {
          try { const [a, b] = await Promise.all([hit.clone().text(), res.clone().text()]); if (a !== b) notify(); } catch (_) {}
        }
        await cache.put(req, res.clone());
      }
      return res;
    }).catch(() => null);
    e.waitUntil(net);
    return hit || (await net) || (await cache.match('./index.html'));
  })());
});
