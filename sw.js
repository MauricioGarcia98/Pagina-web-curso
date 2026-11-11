/* Service worker de la Academia de Datos: permite seguir estudiando sin conexión.
 *
 * - La página (index.html) se pide siempre a la red y, si no hay conexión, se sirve la última copia guardada.
 * - Los archivos propios con ?v=<hash> no cambian nunca bajo la misma dirección: se sirven desde la caché y,
 *   al guardar una versión nueva, se borra la vieja del mismo archivo.
 * - El resto de los archivos propios (datos, páginas de lecciones) se sirven desde la caché y se actualizan
 *   en segundo plano.
 * - Las bibliotecas de las CDN (versiones fijas: Pyodide, sql.js, DuckDB, Monaco, fuentes) se guardan la primera
 *   vez que se usan. Nada más sale a internet desde aquí: ni cuentas ni anuncios pasan por la caché.
 */
const APP = 'academia-app-v1';
const CDN = 'academia-cdn-v2';
const CDNS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com'];
const BASE = new URL('./', self.location).href;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(APP);
    // la página y todo lo que carga al abrir (las direcciones con su ?v= salen de la propia página)
    const r = await fetch(BASE + 'index.html', { cache: 'no-cache' });
    if (!r.ok) return;
    const html = await r.clone().text();
    await c.put(BASE + 'index.html', r);
    const propios = [...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map((m) => BASE + m[1]);
    await Promise.all([...new Set(propios)].map((u) => guardar(c, u).catch(() => {})));
  })().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('academia-') && ![APP, CDN].includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

// guarda una dirección propia; si lleva ?v=, borra las otras versiones del mismo archivo
async function guardar(c, url, res) {
  res = res || (await fetch(url));
  if (!res.ok) return res;
  const u = new URL(url);
  if (u.searchParams.has('v')) {
    for (const k of await c.keys()) { const ku = new URL(k.url); if (ku.pathname === u.pathname && ku.search !== u.search) await c.delete(k); }
  }
  await c.put(url, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const propio = u.origin === self.location.origin && req.url.startsWith(BASE);

  if (propio && (req.mode === 'navigate' || u.pathname.endsWith('/index.html') || req.url === BASE)) {
    // la página: primero la red (así cada publicación se ve al instante), si no hay, la copia
    e.respondWith((async () => {
      const c = await caches.open(APP);
      try {
        const r = await fetch(req, { cache: 'no-cache' });
        const esIndex = u.href.split(/[?#]/)[0] === BASE || u.pathname.endsWith('/index.html');
        if (r.ok) await c.put(esIndex ? BASE + 'index.html' : u.href.split(/[?#]/)[0], r.clone());
        return r;
      } catch (err) {
        const esIndex = u.href.split(/[?#]/)[0] === BASE || u.pathname.endsWith('/index.html');
        const copia = await c.match(esIndex ? BASE + 'index.html' : u.href.split(/[?#]/)[0]);
        if (copia) return copia;
        return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión</title><body style="font:16px system-ui;max-width:560px;margin:15vh auto;padding:0 16px"><h1>Sin conexión</h1><p>Esta página no está guardada en el dispositivo. <a href="${BASE}">Abre el curso</a>: las lecciones que ya visitaste (o que guardaste desde Mis datos) funcionan sin internet.</p></body>`, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  if (propio) {
    if (u.pathname.endsWith('/sw.js')) return;
    e.respondWith((async () => {
      const c = await caches.open(APP);
      const hit = await c.match(req);
      if (u.searchParams.has('v')) {
        if (hit) return hit;
        try { return await guardar(c, req.url); } catch (err) { return Response.error(); }
      }
      // sin versión: la copia al instante y se actualiza por detrás
      const red = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
      if (hit) { e.waitUntil(red); return hit; }
      return (await red) || Response.error();
    })());
    return;
  }

  if (CDNS.includes(u.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(CDN);
      const hit = await c.match(req);
      if (hit) return hit;
      // se pide siempre con CORS (las CDN lo permiten): una respuesta así sirve tanto a un <script> común como
      // a un fetch con CORS. Una respuesta opaca guardada rompería a los pedidos con CORS de la misma dirección.
      try {
        const r = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
        if (!r.ok) return fetch(req); // 404 u otro error: que el navegador lo maneje como siempre
        c.put(req.url, r.clone()).catch(() => {});
        return r;
      } catch (err) {
        try { return await fetch(req); } catch (e2) { return Response.error(); }
      }
    })());
  }
});

// "Guardar todo el curso": la página manda la lista de direcciones y recibe el avance
self.addEventListener('message', (e) => {
  const d = e.data || {};
  const puerto = e.ports && e.ports[0];
  if (d.tipo === 'guardar') {
    e.waitUntil((async () => {
      const c = await caches.open(APP);
      let hechos = 0, fallos = 0;
      for (const url of d.urls || []) {
        const abs = new URL(url, BASE).href;
        try { if (!(await c.match(abs))) await guardar(c, abs); } catch (err) { fallos++; }
        hechos++;
        if (puerto && (hechos % 5 === 0 || hechos === d.urls.length)) puerto.postMessage({ hechos, total: d.urls.length, fallos });
      }
      if (puerto) puerto.postMessage({ hechos, total: (d.urls || []).length, fallos, fin: true });
    })());
  } else if (d.tipo === 'estado') {
    e.waitUntil((async () => {
      let n = 0;
      for (const k of [APP, CDN]) n += (await (await caches.open(k)).keys()).length;
      if (puerto) puerto.postMessage({ archivos: n });
    })());
  } else if (d.tipo === 'borrar') {
    e.waitUntil((async () => {
      for (const k of await caches.keys()) if (k.startsWith('academia-')) await caches.delete(k);
      if (puerto) puerto.postMessage({ ok: true });
    })());
  }
});
