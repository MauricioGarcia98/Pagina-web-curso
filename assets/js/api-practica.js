/* API de práctica de Tienda Andina: https://api.tiendaandina.dev/v1
 *
 * Una API REST simulada que corre dentro del sitio (no sale a internet) y se comporta como una real:
 * - paginación por número de página (/productos) y por cursor (/pedidos),
 * - autenticación con token Bearer (POST /token) que vence,
 * - límite de pedidos: más de 10 por segundo → 429 Too Many Requests con Retry-After,
 * - un endpoint inestable que falla 2 de cada 3 veces (503) para practicar reintentos,
 * - errores 400, 401, 404 y 405 con cuerpo JSON, como las APIs de verdad.
 *
 * La misma fuente se usa en la página (curl en la terminal) y en el worker de Python (requests):
 * apiTiendaFactory se serializa con toString() y se evalúa dentro del worker. Por eso no puede
 * usar nada de afuera de la función.
 */
(function () {
  'use strict';
  function apiTiendaFactory(g) {
    const BASE = 'https://api.tiendaandina.dev';
    const SECRETO = { cliente_id: 'academia', secreto: 's3cr3t0-de-practica' };
    const LIMITE_POR_SEGUNDO = 10;
    const USOS_TOKEN = 25;

    // ---------------------------------------------------------------- datos (deterministas)
    function mulberry32(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    const rnd = mulberry32(20241031);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const CATALOGO = [
      ['Mouse Óptico', 'accesorios', 12990], ['Teclado Mecánico', 'accesorios', 54990], ['Auriculares Pulse', 'audio', 45990],
      ['Parlante Bluetooth Eco', 'audio', 39990], ['Monitor 24" Nitido', 'monitores', 189990], ['Monitor 27" Nitido Pro', 'monitores', 289990],
      ['Notebook Andes 14', 'computadoras', 749990], ['Notebook Andes 16 Pro', 'computadoras', 1199990], ['Tablet Cumbre 10', 'tablets', 329990],
      ['Celular Cóndor S', 'celulares', 459990], ['Celular Cóndor Max', 'celulares', 799990], ['Cargador USB-C 65W', 'accesorios', 24990],
      ['Cable USB-C 2 m', 'accesorios', 6990], ['Webcam Full HD', 'accesorios', 34990], ['Micrófono Podcast', 'audio', 69990],
      ['Disco SSD 1 TB', 'almacenamiento', 89990], ['Pendrive 128 GB', 'almacenamiento', 14990], ['Router WiFi 6', 'redes', 99990],
      ['Smartwatch Ritmo', 'wearables', 149990], ['Auriculares Pulse Pro', 'audio', 119990], ['Silla Gamer Puma', 'muebles', 259990],
      ['Escritorio Regulable', 'muebles', 399990], ['Impresora Tinta Color', 'impresoras', 129990], ['Hub USB 7 puertos', 'accesorios', 19990],
      ['Lámpara LED Escritorio', 'hogar', 22990],
    ];
    const PROVEEDORES = [['Sonora', 'Chile'], ['Teclar', 'Argentina'], ['VisionPlus', 'México'], ['Andes Tech', 'Perú'], ['DataHogar', 'Colombia']];
    const productos = CATALOGO.map(([nombre, categoria, precio], i) => {
      const pr = PROVEEDORES[i % PROVEEDORES.length];
      return { id: i + 1, nombre, categoria, precio, moneda: 'CLP', en_stock: rnd() > 0.15, stock: Math.floor(rnd() * 80), proveedor: { nombre: pr[0], pais: pr[1] }, actualizado: '2024-10-' + String(1 + Math.floor(rnd() * 28)).padStart(2, '0') + 'T09:00:00Z' };
    });
    const ESTADOS = ['pagado', 'pagado', 'pagado', 'enviado', 'entregado', 'entregado', 'cancelado', 'devuelto'];
    const NOMBRES = ['ana', 'luis', 'eva', 'tomas', 'camila', 'diego', 'sofia', 'martin', 'lucia', 'pedro', 'valentina', 'jorge'];
    const pedidos = [];
    for (let i = 1; i <= 137; i++) {
      const p = pick(productos), cant = 1 + Math.floor(rnd() * 3);
      const dia = 1 + Math.floor(((i - 1) / 137) * 31), hora = Math.floor(rnd() * 24), min = Math.floor(rnd() * 60);
      const n = pick(NOMBRES);
      // como en la vida real: algunos emails llegan con mayúsculas o espacios
      const email = rnd() < 0.12 ? ' ' + n.toUpperCase() + '@CORREO.COM ' : n + '@correo.com';
      pedidos.push({ id: 5000 + i, creado: `2024-10-${String(dia).padStart(2, '0')}T${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`, cliente_email: email, producto_id: p.id, cantidad: cant, monto: p.precio * cant, moneda: 'CLP', estado: pick(ESTADOS) });
    }
    // pedido duplicado por un reintento del sistema de origen (pasa en las APIs reales)
    pedidos.splice(60, 0, { ...pedidos[59] });

    // ---------------------------------------------------------------- estado
    const st = { reloj: 0, ventana: null, cuenta: 0, tokens: {}, inestable: 0, total: 0 };
    const ahora = () => Date.now() / 1000 + st.reloj;
    const json = (status, body, headers = {}) => ({ status, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
    const ERR = (status, mensaje, extra = {}) => json(status, { error: mensaje, codigo: status, ...extra });

    function limitar() {
      const seg = Math.floor(ahora());
      if (st.ventana !== seg) { st.ventana = seg; st.cuenta = 0; }
      st.cuenta++;
      if (st.cuenta > LIMITE_POR_SEGUNDO) return ERR(429, 'demasiados pedidos: máximo 10 por segundo', { reintentar_en: 1 });
      return null;
    }
    function autenticar(headers) {
      const h = Object.fromEntries(Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
      const m = /^Bearer\s+(\S+)$/i.exec(h.authorization || '');
      if (!m) return ERR(401, 'falta el token: envía la cabecera Authorization: Bearer <token> (se obtiene con POST /v1/token)');
      const t = st.tokens[m[1]];
      if (!t) return ERR(401, 'token inválido');
      if (t.usos >= USOS_TOKEN || ahora() > t.vence) return ERR(401, 'token expirado: pide uno nuevo con POST /v1/token');
      t.usos++;
      return null;
    }
    function paginar(lista, q, defecto = 10) {
      const page = q.page === undefined ? 1 : Number(q.page), per = q.per_page === undefined ? defecto : Number(q.per_page);
      if (!Number.isInteger(page) || page < 1) return { error: ERR(400, 'page debe ser un entero mayor o igual a 1') };
      if (!Number.isInteger(per) || per < 1 || per > 50) return { error: ERR(400, 'per_page debe estar entre 1 y 50') };
      const total_pages = Math.max(1, Math.ceil(lista.length / per));
      return { body: { page, per_page: per, total: lista.length, total_pages, datos: lista.slice((page - 1) * per, page * per), siguiente: page < total_pages ? page + 1 : null } };
    }

    // ---------------------------------------------------------------- rutas
    function request(method, url, headers, body) {
      method = String(method || 'GET').toUpperCase();
      st.total++;
      let u;
      try { u = new URL(url); } catch (e) { return ERR(400, 'URL inválida: ' + url); }
      if (u.host !== 'api.tiendaandina.dev') return null;
      const q = Object.fromEntries(u.searchParams.entries());
      const ruta = u.pathname.replace(/\/+$/, '') || '/';
      const lim = limitar(); if (lim) return { ...lim, headers: { ...lim.headers, 'retry-after': '1' } };
      if (ruta === '/' || ruta === '/v1') return json(200, { api: 'Tienda Andina (práctica)', version: 'v1', docs: BASE + '/v1/docs', rutas: ['/v1/estado', '/v1/productos', '/v1/productos/{id}', 'POST /v1/token', '/v1/pedidos', '/v1/tipo-cambio', '/v1/inestable'] });
      if (ruta === '/v1/docs') return json(200, {
        autenticacion: 'POST /v1/token con JSON {"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"} → access_token. Envíalo en la cabecera Authorization: Bearer <token>. Vence a los 60 segundos o después de 25 pedidos.',
        paginacion: '/v1/productos usa ?page=N&per_page=M (máx. 50) y devuelve "siguiente". /v1/pedidos usa cursor: ?limit=M&cursor=X y devuelve "siguiente_cursor" (null en la última página).',
        limites: 'Máximo 10 pedidos por segundo. Si te pasas: 429 con la cabecera Retry-After (segundos a esperar).',
        inestable: '/v1/inestable falla con 503 dos de cada tres veces: sirve para practicar reintentos.',
      });
      if (ruta === '/v1/estado') return method === 'GET' ? json(200, { estado: 'ok', version: '1.4.2', hora: new Date(ahora() * 1000).toISOString().replace(/\.\d+Z$/, 'Z') }) : ERR(405, 'método no permitido');
      if (ruta === '/v1/productos') {
        if (method !== 'GET') return ERR(405, 'método no permitido: usa GET');
        let lista = productos;
        if (q.categoria) lista = lista.filter((p) => p.categoria === q.categoria);
        const r = paginar(lista, q);
        return r.error || json(200, r.body);
      }
      let m = /^\/v1\/productos\/([^/]+)$/.exec(ruta);
      if (m) {
        if (method !== 'GET') return ERR(405, 'método no permitido: usa GET');
        const p = productos.find((x) => String(x.id) === m[1]);
        return p ? json(200, p) : ERR(404, 'producto no encontrado', { id: m[1] });
      }
      if (ruta === '/v1/token') {
        if (method !== 'POST') return ERR(405, 'método no permitido: el token se pide con POST');
        let b = body;
        if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = Object.fromEntries(new URLSearchParams(b)); } }
        if (!b || b.cliente_id !== SECRETO.cliente_id || b.secreto !== SECRETO.secreto) return ERR(401, 'credenciales inválidas');
        const tok = 'tk_' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
        st.tokens[tok] = { usos: 0, vence: ahora() + 60 };
        return json(200, { access_token: tok, token_type: 'Bearer', expires_in: 60, usos_maximos: USOS_TOKEN });
      }
      if (ruta === '/v1/pedidos') {
        if (method !== 'GET') return ERR(405, 'método no permitido: usa GET');
        const au = autenticar(headers); if (au) return au;
        let lista = pedidos;
        if (q.desde) { if (!/^\d{4}-\d{2}-\d{2}$/.test(q.desde)) return ERR(400, 'desde debe tener el formato AAAA-MM-DD'); lista = lista.filter((p) => p.creado.slice(0, 10) >= q.desde); }
        if (q.estado) lista = lista.filter((p) => p.estado === q.estado);
        const limit = q.limit === undefined ? 50 : Number(q.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 50) return ERR(400, 'limit debe estar entre 1 y 50');
        let ini = 0;
        if (q.cursor) { try { ini = Number(atob(q.cursor).split(':')[1]); } catch (e) { return ERR(400, 'cursor inválido'); } if (!Number.isInteger(ini) || ini < 0) return ERR(400, 'cursor inválido'); }
        const datos = lista.slice(ini, ini + limit), fin = ini + limit;
        return json(200, { datos, cantidad: datos.length, siguiente_cursor: fin < lista.length ? btoa('pos:' + fin) : null });
      }
      if (ruta === '/v1/tipo-cambio') {
        const mon = (q.moneda || 'USD').toUpperCase(), f = q.fecha || '2024-10-01';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return ERR(400, 'fecha debe tener el formato AAAA-MM-DD');
        const base = { USD: 950, EUR: 1030, ARS: 0.98, PEN: 252, COP: 0.22, MXN: 48.5 }[mon];
        if (!base) return ERR(404, 'moneda no soportada', { monedas: ['USD', 'EUR', 'ARS', 'PEN', 'COP', 'MXN'] });
        const d = Number(f.slice(8, 10)) || 1, valor = Math.round(base * (1 + Math.sin(d / 3) * 0.02) * 100) / 100;
        return json(200, { fecha: f, base: 'CLP', moneda: mon, valor });
      }
      if (ruta === '/v1/inestable') {
        st.inestable++;
        if (st.inestable % 3 !== 0) return ERR(503, 'servicio no disponible, intenta de nuevo', { intento: st.inestable });
        return json(200, { ok: true, mensaje: 'por fin respondí', intento: st.inestable });
      }
      return ERR(404, 'ruta no encontrada: ' + ruta);
    }
    const API = {
      BASE, SECRETO,
      esDeLaApi: (url) => /^https?:\/\/api\.tiendaandina\.dev(\/|$|\?)/.test(String(url)),
      request(method, url, headers, body) {
        const h = headers && typeof headers.toJs === 'function' ? headers.toJs({ dict_converter: Object.fromEntries }) : headers;
        return request(method, url, h || {}, body);
      },
      // lo llama time.sleep() del Python del curso: el reloj de la API avanza aunque el navegador no espere de verdad
      avanzar(seg) { st.reloj += Math.max(0, Number(seg) || 0); },
      reiniciar() { st.ventana = null; st.cuenta = 0; st.tokens = {}; st.inestable = 0; },
      productos, pedidos,
    };
    g.ApiTienda = API;
    return API;
  }
  const g = typeof window !== 'undefined' ? window : self;
  apiTiendaFactory(g);
  g.API_TIENDA_SRC = apiTiendaFactory.toString();
})();
