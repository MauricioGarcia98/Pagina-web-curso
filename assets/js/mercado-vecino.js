/* Mercado Vecino: el marketplace del proyecto 2. Todo inventado, pero vivo: la tienda vende mientras trabajas.
 *
 * Fuentes (iguales para el navegador y para el worker de Python, porque salen de la misma semilla y el mismo reloj):
 * - La base operacional (PostgreSQL): clientes, vendedores, productos, pedidos e ítems. Se consulta con psql contra
 *   la réplica de lectura (mercado-vecino-terminal.js la carga en un PostgreSQL real, PGlite).
 * - El CDC: Debezium lee el WAL de la base y publica cada cambio (op c/u/d) en un tópico por tabla de Event Hubs
 *   (protocolo Kafka). La retención es de 24 horas: lo que no consumes a tiempo, se pierde.
 * - PagoYa, la pasarela de pagos: API REST (https://api.pagoya.example), webhooks firmados con HMAC-SHA256 que la
 *   función receptora guarda en el lago tal como llegan (duplicados, desordenados, tardíos y alguno falso), y una
 *   liquidación diaria que no coincide día a día con las ventas.
 *
 * Los problemas son los de una tienda real: el backoffice cancela pedidos sin tocar actualizado_en, el equipo de
 * fraude borra pedidos (DELETE), los clientes piden que se borren sus datos, hay pagos que llegan después de que el
 * pedido venció, contracargos que solo existen en la pasarela y pagos de las 23:00 que se liquidan dos días después.
 *
 * mercadoVecinoFactory se serializa con toString() y se evalúa en el worker de Python: no puede usar nada de afuera.
 */
(function () {
  'use strict';
  function mercadoVecinoFactory(g) {
    const ZONA_H = -3, SEG = 1000, MIN = 60000, HORA = 3600000, DIA = 86400000;
    const DIAS_HISTORIA = 3, DIAS_VIVOS = 31, RETENCION_KAFKA = DIA;
    const cfg = { semilla: 4242, inicio: Date.UTC(2026, 10, 19, 12), desfase: 0 };
    const ahora = () => Date.now() + cfg.desfase;

    // ---------------------------------------------------------------- azar determinista
    function h32() { let h = 2166136261; for (const a of arguments) { const s = String(a); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= 0x9e3779b9; h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); } return (h ^ (h >>> 15)) >>> 0; }
    function azar(seed) {
      let a = seed >>> 0;
      const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      return { r, int: (x, y) => x + Math.floor(r() * (y - x + 1)), chance: (p) => r() < p, pick: (l) => l[Math.floor(r() * l.length)], pickW(l, w) { const tot = w.reduce((s, x) => s + x, 0); let u = r() * tot; for (let i = 0; i < l.length; i++) { u -= w[i]; if (u <= 0) return l[i]; } return l[l.length - 1]; } };
    }
    const hex = (tag, n) => { let o = '', k = 0; while (o.length < n) o += h32(cfg.semilla, tag, k++).toString(16).padStart(8, '0'); return o.slice(0, n); };
    const pad = (n, k = 2) => String(n).padStart(k, '0');
    const local = (ms) => new Date(ms + ZONA_H * HORA);
    const diaLocal = (ms) => { const d = local(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
    const horaLocal = (ms) => local(ms).getUTCHours();
    const inicioDiaLocal = (ms) => { const d = local(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ZONA_H * HORA; };
    const msDeDia = (fecha) => Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10)) - ZONA_H * HORA;
    const sumarDias = (fecha, n) => diaLocal(msDeDia(fecha) + n * DIA + HORA);
    const tsSql = (ms) => new Date(ms).toISOString().replace('T', ' ').replace('Z', '');
    const pesos = (cent) => (cent / 100).toFixed(2);

    // ---------------------------------------------------------------- SHA-256 y HMAC (para firmar los webhooks)
    const K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    function utf8(s) { const out = []; for (const ch of String(s)) { let c = ch.codePointAt(0); if (c < 0x80) out.push(c); else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); } return out; }
    function sha256(bytes) {
      const l = bytes.length, m = bytes.slice(); m.push(0x80); while (m.length % 64 !== 56) m.push(0);
      const bits = l * 8; for (let i = 7; i >= 0; i--) m.push(i >= 4 ? 0 : (bits >>> (i * 8)) & 255);
      let [a0, b0, c0, d0, e0, f0, g0, h0] = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
      const w = new Array(64); const rr = (x, n) => (x >>> n) | (x << (32 - n));
      for (let i = 0; i < m.length; i += 64) {
        for (let j = 0; j < 16; j++) w[j] = (m[i + j * 4] << 24) | (m[i + j * 4 + 1] << 16) | (m[i + j * 4 + 2] << 8) | m[i + j * 4 + 3];
        for (let j = 16; j < 64; j++) { const s0 = rr(w[j - 15], 7) ^ rr(w[j - 15], 18) ^ (w[j - 15] >>> 3), s1 = rr(w[j - 2], 17) ^ rr(w[j - 2], 19) ^ (w[j - 2] >>> 10); w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0; }
        let a = a0, b = b0, c = c0, d = d0, e = e0, f = f0, gg = g0, h = h0;
        for (let j = 0; j < 64; j++) { const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & gg), t1 = (h + S1 + ch + K256[j] + w[j]) | 0, S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0; h = gg; gg = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
        a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0; e0 = (e0 + e) | 0; f0 = (f0 + f) | 0; g0 = (g0 + gg) | 0; h0 = (h0 + h) | 0;
      }
      const out = []; for (const x of [a0, b0, c0, d0, e0, f0, g0, h0]) out.push((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255);
      return out;
    }
    function hmacHex(clave, msg) {
      let k = utf8(clave); if (k.length > 64) k = sha256(k); while (k.length < 64) k.push(0);
      const ip = k.map((x) => x ^ 0x36), op = k.map((x) => x ^ 0x5c);
      return sha256(op.concat(sha256(ip.concat(utf8(msg))))).map((x) => x.toString(16).padStart(2, '0')).join('');
    }

    // ---------------------------------------------------------------- accesos (propios de cada estudiante)
    function claves(t = ahora()) {
      const b64 = (tag) => { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; let o = ''; for (let i = 0; i < 43; i++) o += A[h32(cfg.semilla, tag, i) % 64]; return o + '='; };
      return {
        pg: { host: 'mv-prod-replica.postgres.database.azure.com', puerto: 5432, base: 'mercado', usuario: 'lector_datos', clave: 'Lx' + hex('pg', 12) + '!7' },
        eh: { broker: 'mv-eventos.servicebus.windows.net:9093', cs: `Endpoint=sb://mv-eventos.servicebus.windows.net/;SharedAccessKeyName=lector-lago;SharedAccessKey=${b64('eh')}` },
        pagoya: 'sk_test_' + hex('sk', 24),
        webhook: t >= hitos().rotacion ? 'whsec_' + hex('wh2', 32) : 'whsec_' + hex('wh', 32),
        webhookAnterior: t >= hitos().rotacion && t < hitos().rotacion + DIA ? 'whsec_' + hex('wh', 32) : null,
      };
    }

    // ---------------------------------------------------------------- catálogo de la tienda
    const BARRIOS = ['Puerto Viejo', 'La Loma', 'Centro', 'Los Álamos', 'Villa Sol', 'El Molino'];
    const VENDEDORES = [
      ['Almacén Doña Rosa', 'almacen', [['Yerba 1 kg', 420], ['Aceite de girasol 1,5 l', 380], ['Arroz 1 kg', 160], ['Fideos 500 g', 95], ['Café molido 250 g', 520]]],
      ['Verdulería El Trébol', 'verduleria', [['Bolsón de verduras', 690], ['Tomates 1 kg', 210], ['Paltas x3', 360], ['Frutillas 500 g', 290], ['Manzanas 1 kg', 180]]],
      ['Panadería La Espiga', 'panaderia', [['Pan de masa madre', 310], ['Medialunas x6', 270], ['Torta de ricota', 980], ['Bizcochos 500 g', 340], ['Prepizzas x2', 230]]],
      ['Carnicería Don Tito', 'carniceria', [['Asado 1 kg', 1150], ['Milanesas 1 kg', 980], ['Chorizos x6', 640], ['Pollo entero', 720], ['Carne picada 1 kg', 890]]],
      ['Quesos del Valle', 'lacteos', [['Queso colonia 500 g', 760], ['Dulce de leche 1 kg', 430], ['Yogur natural 1 l', 190], ['Manteca 200 g', 210], ['Ricota 500 g', 260]]],
      ['Ferretería Tornillo', 'ferreteria', [['Juego de destornilladores', 1450], ['Cinta métrica 5 m', 390], ['Lamparita LED x4', 640], ['Pegamento epoxi', 280], ['Candado 50 mm', 590]]],
      ['Librería Papel y Tinta', 'libreria', [['Cuaderno A4', 240], ['Lapiceras x10', 310], ['Mochila escolar', 2350], ['Agenda 2027', 690], ['Resma A4', 520]]],
      ['Mascotas Felices', 'mascotas', [['Alimento perro 3 kg', 1290], ['Alimento gato 1,5 kg', 980], ['Arena sanitaria 4 kg', 420], ['Collar regulable', 350], ['Juguete mordedor', 290]]],
      ['Vivero Las Hortensias', 'vivero', [['Maceta con aromáticas', 480], ['Tierra fértil 20 l', 390], ['Rosal en maceta', 890], ['Semillas de huerta x5', 260], ['Regadera 5 l', 540]]],
      ['Dulces Abuela Nely', 'dulces', [['Alfajores x6', 420], ['Mermelada casera', 330], ['Pastafrola', 760], ['Bombones x12', 690], ['Budín de limón', 450]]],
      ['Bazar La Esquina', 'bazar', [['Juego de vasos x6', 870], ['Sartén 24 cm', 1690], ['Termo 1 l', 1990], ['Repasadores x3', 380], ['Tabla de picar', 450]]],
      ['Café Molienda', 'cafe', [['Café en grano 1 kg', 1890], ['Cafetera italiana', 1590], ['Taza de cerámica', 390], ['Filtros x100', 220], ['Té en hebras 200 g', 410]]],
    ];
    const NOMBRES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Facundo', 'Gabriela', 'Hernán', 'Inés', 'Joaquín', 'Lucía', 'Martín', 'Natalia', 'Óscar', 'Paula', 'Ramiro', 'Sofía', 'Tomás', 'Valeria', 'Ximena', 'Agustina', 'Federico', 'Micaela', 'Santiago', 'Camila', 'Rodrigo', 'Florencia', 'Matías'];
    const APELLIDOS = ['Acosta', 'Benítez', 'Cabrera', 'Domínguez', 'Escobar', 'Fernández', 'Giménez', 'Herrera', 'Ibarra', 'Juárez', 'López', 'Medina', 'Núñez', 'Olivera', 'Pereyra', 'Quiroga', 'Ríos', 'Silva', 'Torres', 'Urquiza', 'Vega', 'Zárate', 'Molina', 'Castro', 'Rosales', 'Sosa'];
    const sinTilde = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    const T0 = () => inicioDiaLocal(cfg.inicio) - DIAS_HISTORIA * DIA; // desde acá la tienda usa PagoYa
    // lo que va a pasar en la empresa mientras trabajas (propio de cada estudiante, desde el día en que empezaste)
    function hitos() {
      const i = inicioDiaLocal(cfg.inicio);
      return { cupones: i + DIA + 10 * HORA, rotacion: i + 2 * DIA + 15 * HORA, reinicioCdc: i + 3 * DIA + 4 * HORA + 10 * MIN };
    }
    const HORIZONTE = () => inicioDiaLocal(cfg.inicio) + DIAS_VIVOS * DIA;
    const ANONIMO = { nombre: '(eliminado)', email: null, telefono: null };

    // ---------------------------------------------------------------- el mundo: todo lo que pasa, de una vez
    let cache = null;
    function mundo() {
      const clave = cfg.semilla + ':' + T0();
      if (cache && cache.clave === clave) return cache;
      const s = cfg.semilla, t0 = T0(), fin = HORIZONTE();
      const ini = { vendedores: [], productos: [], clientes: [], pedidos: [], items_pedido: [] };
      const Rc = azar(h32(s, 'catalogo'));
      const precios = [];
      VENDEDORES.forEach(([nombre, rubro, prods], vi) => {
        ini.vendedores.push({ id: vi + 1, nombre, rubro, barrio: BARRIOS[vi % BARRIOS.length], comision_pct: [8, 10, 12][vi % 3], creado_en: t0 - Rc.int(90, 400) * DIA });
        prods.forEach(([pn, base], pi) => { const id = vi * 5 + pi + 1; const precio = Math.round(base * (0.9 + Rc.r() * 0.25) / 5) * 5 * 100; precios[id] = precio; ini.productos.push({ id, vendedor_id: vi + 1, nombre: pn, precio, activo: true, actualizado_en: t0 - Rc.int(1, 60) * DIA }); });
      });
      const NP = ini.productos.length;
      const nuevoCliente = (id, R, creado) => {
        const n = R.pick(NOMBRES), a = R.pick(APELLIDOS);
        return { id, nombre: `${n} ${a}`, email: `${sinTilde(n)}.${sinTilde(a)}${id}@correo.example`, telefono: `09${R.int(1, 9)} ${R.int(100, 999)} ${R.int(100, 999)}`, barrio: R.pick(BARRIOS), creado_en: creado, actualizado_en: creado };
      };
      const N_CLI0 = 700, N_PED0 = 1200;
      for (let i = 1; i <= N_CLI0; i++) ini.clientes.push(nuevoCliente(i, azar(h32(s, 'cli0', i)), t0 - (400 - Math.floor(i * 390 / N_CLI0)) * DIA - i * 997));
      let itemId = 0;
      const armarItems = (R, pedidoId) => {
        const k = R.pickW([1, 2, 3, 4], [45, 30, 17, 8]); const usados = new Set(); const its = [];
        for (let j = 0; j < k; j++) { let p = R.int(1, NP); while (usados.has(p)) p = (p % NP) + 1; usados.add(p); its.push({ id: ++itemId, pedido_id: pedidoId, producto_id: p, cantidad: R.pickW([1, 2, 3], [70, 22, 8]), precio_unitario: precios[p] }); }
        return its;
      };
      const totales = (its, cupon) => {
        const sub = its.reduce((a, x) => a + x.cantidad * x.precio_unitario, 0); const env = sub >= 250000 ? 0 : 19000;
        if (cupon === undefined) return { subtotal: sub, envio: env, total: sub + env };
        const desc = cupon === 'VECINO10' ? Math.min(Math.round(sub * 0.10), 40000) : cupon === 'BIENVENIDA15' ? Math.min(Math.round(sub * 0.15), 60000) : cupon === 'ENVIOGRATIS' ? env : 0;
        return { subtotal: sub, envio: env, descuento: desc, cupon: cupon || null, total: sub + env - desc };
      };
      const H = hitos();
      // pedidos viejos (antes de PagoYa: se cobraban con CobroSur)
      for (let i = 1; i <= N_PED0; i++) {
        const R = azar(h32(s, 'ped0', i)); const c = t0 - 60 * DIA + Math.floor(i * (59 * DIA) / N_PED0) + R.int(0, 3000) * SEG;
        const its = armarItems(R, i); const tt = totales(its); const canc = R.chance(0.1);
        ini.pedidos.push({ id: i, cliente_id: R.int(1, N_CLI0), estado: canc ? 'cancelado' : 'entregado', ...tt, proveedor_pago: 'cobrosur', pago_ref: canc ? null : 'cs-' + (900000 + i * 7), creado_en: c, actualizado_en: c + (canc ? 30 * MIN : R.int(30, 90) * HORA) });
        ini.items_pedido.push(...its);
      }

      // intenciones de cambio (se ordenan por tiempo después)
      const I = []; let txN = 8000;
      const intento = (ts, tabla, op, id, datos, tx) => I.push({ ts, tabla, op, id, datos, tx: tx || ++txN });
      // PagoYa
      const pagos = new Map(); const eventosPY = []; const cobros = []; let nPago = 0, nEv = 0, nRe = 0, nDp = 0;
      const idPY = (pref, n) => `${pref}_${h32(s, pref, n).toString(36).padStart(7, '0')}${n.toString(36).padStart(4, '0')}`;
      const evento = (ts, tipo, objeto) => { const e = { id: idPY('evt', ++nEv), tipo, ts, objeto: JSON.parse(JSON.stringify(objeto)) }; eventosPY.push(e); return e; };
      const pagoNuevo = (ts, pedidoId, monto, R) => { const p = { id: idPY('py', ++nPago), objeto: 'pago', monto, moneda: 'CRP', estado: 'pendiente', metodo: R.chance(0.8) ? 'tarjeta' : 'billetera', creado: Math.floor(ts / 1000), aprobado_en: null, metadatos: { pedido_id: String(pedidoId) } }; pagos.set(p.id, p); evento(ts, 'pago.creado', p); return p; };
      const aprobar = (p, ts) => { p.estado = 'aprobado'; p.aprobado_en = Math.floor(ts / 1000); evento(ts, 'pago.aprobado', p); };
      const reembolsar = (p, ts, motivo, c) => { const r = { id: idPY('re', ++nRe), objeto: 'reembolso', pago: p.id, monto: p.monto, motivo, creado: Math.floor(ts / 1000) }; evento(ts, 'reembolso.creado', r); c.reembolso = ts; };
      const disputar = (p, ts, motivo, perdida, cierre, c) => {
        const d = { id: idPY('dp', ++nDp), objeto: 'disputa', pago: p.id, monto: p.monto, motivo, estado: 'abierta', creado: Math.floor(ts / 1000), cerrada_en: null };
        evento(ts, 'disputa.abierta', d); c.disputa = ts;
        d.estado = perdida ? 'perdida' : 'ganada'; d.cerrada_en = Math.floor(cierre / 1000); evento(cierre, 'disputa.cerrada', d); c.cierre = cierre; c.perdida = perdida;
      };

      const clientesVivos = ini.clientes.map((c) => c.id); const anonimos = new Set(); let maxCli = N_CLI0, pedidoId = N_PED0;
      const PESOS_HORA = [1, 0.6, 0.4, 0.3, 0.3, 0.5, 1.5, 3, 5, 8, 10, 10, 9, 8, 7, 7, 8, 9, 11, 13, 13, 11, 7, 4];
      const nHoras = Math.ceil((fin - t0) / HORA);
      for (let hIdx = 0; hIdx < nHoras; hIdx++) {
        const th = t0 + hIdx * HORA; const R = azar(h32(s, 'h', hIdx)); const hl = horaLocal(th);
        // 09:00: cambian algunos precios
        if (hl === 9) for (let p = 1; p <= NP; p++) if (R.chance(0.06)) { precios[p] = Math.max(500, Math.round(precios[p] * (0.92 + R.r() * 0.22) / 500) * 500); intento(th + p * 3 * SEG, 'productos', 'u', p, { precio: precios[p], actualizado_en: th + p * 3 * SEG }); }
        // derecho al olvido: algún cliente pide que se borren sus datos
        if (R.chance(0.07)) { const ts = th + R.int(60, 3500) * SEG; let id = R.int(1, maxCli), k = 0; while (anonimos.has(id) && k < 60) { id = R.int(1, maxCli); k++; } if (!anonimos.has(id)) { anonimos.add(id); intento(ts, 'clientes', 'u', id, { ...ANONIMO, actualizado_en: ts }); } }
        const n = Math.round(PESOS_HORA[hl] * (0.7 + R.r() * 0.6) * 0.62);
        const tiempos = Array.from({ length: n }, () => th + R.int(5, 3595) * SEG + R.int(0, 999)).sort((a, b) => a - b);
        for (const c of tiempos) {
          const id = ++pedidoId; const tx = ++txN;
          let cid;
          if (R.chance(0.2)) { cid = ++maxCli; const tc = c - R.int(2, 9) * MIN; intento(tc, 'clientes', 'c', cid, nuevoCliente(cid, azar(h32(s, 'cli', cid)), tc)); clientesVivos.push(cid); }
          else { do { cid = R.pick(clientesVivos); } while (anonimos.has(cid)); if (R.chance(0.02)) { const tt = c - R.int(1, 30) * MIN; intento(tt, 'clientes', 'u', cid, { telefono: `09${R.int(1, 9)} ${R.int(100, 999)} ${R.int(100, 999)}`, actualizado_en: tt }); } }
          const its = armarItems(R, id);
          const cupon = c >= H.cupones ? (R.chance(0.22) ? (cid > N_CLI0 && R.chance(0.5) ? 'BIENVENIDA15' : R.pick(['VECINO10', 'VECINO10', 'ENVIOGRATIS'])) : null) : undefined;
          let tt = totales(its, cupon);
          intento(c, 'pedidos', 'c', id, { id, cliente_id: cid, estado: 'creado', ...tt, proveedor_pago: 'pagoya', pago_ref: null, creado_en: c, actualizado_en: c }, tx);
          for (const it of its) intento(c, 'items_pedido', 'c', it.id, it, tx);
          if (R.chance(0.12)) {
            // abandonado: el job de vencimiento lo cancela a los 30 minutos
            const tv = c + 30 * MIN + R.int(0, 50) * SEG; intento(tv, 'pedidos', 'u', id, { estado: 'cancelado', actualizado_en: tv });
            if (R.chance(0.12)) { // ...pero el cliente pagó tarde
              const p = pagoNuevo(c + R.int(31, 44) * MIN, id, tt.total, R); const ta = p.creado * 1000 + R.int(5, 20) * SEG; aprobar(p, ta);
              const cb = { pago: p.id, pedido: id, aprobado: ta, monto: p.monto, cancelado: tv }; cobros.push(cb);
              if (R.chance(0.6)) reembolsar(p, ta + R.int(20, 50) * HORA, 'pedido_vencido', cb);
            }
            continue;
          }
          let tPago = c + R.int(2, 12) * MIN;
          if (its.length >= 2 && R.chance(0.06)) { // sacó un producto antes de pagar
            const tq = c + R.int(60, 230) * SEG; const sacado = its.pop(); tt = totales(its, cupon);
            intento(tq, 'items_pedido', 'd', sacado.id, null); intento(tq, 'pedidos', 'u', id, { ...tt, actualizado_en: tq });
            tPago = c + R.int(5, 12) * MIN;
          }
          let p = pagoNuevo(tPago, id, tt.total, R);
          if (R.chance(0.08)) { const tr = tPago + R.int(3, 10) * SEG; p.estado = 'rechazado'; p.motivo_rechazo = R.pick(['fondos_insuficientes', 'tarjeta_vencida', 'rechazo_banco']); evento(tr, 'pago.rechazado', p); p = pagoNuevo(tr + R.int(60, 180) * SEG, id, tt.total, R); }
          const ta = p.creado * 1000 + R.int(3, 10) * SEG; aprobar(p, ta);
          const tdb = ta + R.int(2, 15) * SEG; intento(tdb, 'pedidos', 'u', id, { estado: 'pagado', pago_ref: p.id, actualizado_en: tdb });
          const cb = { pago: p.id, pedido: id, aprobado: ta, monto: p.monto }; cobros.push(cb);
          const r2 = R.r();
          if (r2 < 0.008) { // fraude: el equipo de riesgo borra el pedido; después llega el contracargo
            const tb = ta + R.int(3, 9) * HORA; for (const it of its) intento(tb, 'items_pedido', 'd', it.id, null); intento(tb, 'pedidos', 'd', id, null); cb.borrado = tb;
            const td = ta + R.int(48, 96) * HORA; disputar(p, td, 'fraude', true, td + R.int(72, 144) * HORA, cb);
          } else if (r2 < 0.033) { // el backoffice cancela a pedido del cliente (y no actualiza actualizado_en)
            const tcan = ta + R.int(60, 600) * MIN; intento(tcan, 'pedidos', 'u', id, { estado: 'cancelado' }); cb.cancelado = tcan;
            reembolsar(p, tcan + R.int(30, 180) * MIN, 'pedido_cancelado', cb);
          } else {
            const te = ta + R.int(5, 30) * HORA; intento(te, 'pedidos', 'u', id, { estado: 'enviado', actualizado_en: te });
            const tent = te + R.int(20, 70) * HORA; intento(tent, 'pedidos', 'u', id, { estado: 'entregado', actualizado_en: tent });
            if (R.chance(0.015)) { const td = tent + R.int(24, 96) * HORA; disputar(p, td, R.pick(['no_recibido', 'no_coincide']), R.chance(0.5), td + R.int(96, 192) * HORA, cb); }
          }
        }
      }

      // ordenar y reproducir: imágenes antes/después, LSN y transacciones
      I.sort((a, b) => a.ts - b.ts || a.tx - b.tx);
      const est = {}; for (const t of Object.keys(ini)) est[t] = new Map(ini[t].map((r) => [r.id, r]));
      const cambios = []; let lsn = 0x5A00_0000;
      let reiniciado = false; const tx0 = 900000;
      for (const x of I) {
        if (!reiniciado && x.ts > H.reinicioCdc) { // alguien borró los offsets del conector: snapshot completo otra vez (op r)
          reiniciado = true; lsn += 512; let k = 0;
          for (const tb of ['vendedores', 'productos', 'clientes', 'pedidos', 'items_pedido']) for (const r of [...est[tb].values()].sort((a, b) => a.id - b.id)) cambios.push({ i: cambios.length, lsn, ts: H.reinicioCdc + Math.floor(k++ / 40) * 100, tx: tx0, tabla: tb, op: 'r', id: r.id, antes: null, despues: r, snapshot: true });
        }
        const M = est[x.tabla]; const antes = M.get(x.id) || null;
        let despues = null;
        if (x.op === 'c') despues = { ...x.datos };
        else if (x.op === 'u') { if (!antes) continue; despues = { ...antes, ...x.datos }; }
        if (x.op === 'd') { if (!antes) continue; M.delete(x.id); } else M.set(x.id, despues);
        lsn += 96 + (h32(s, 'lsn', cambios.length) % 160);
        cambios.push({ i: cambios.length, lsn, ts: x.ts, tx: x.tx, tabla: x.tabla, op: x.op, id: x.id, antes, despues });
      }
      eventosPY.sort((a, b) => a.ts - b.ts);
      const porTabla = {}; for (const t of Object.keys(ini)) porTabla[t] = [];
      for (const c of cambios) porTabla[c.tabla].push(c);
      cache = { clave, ini, cambios, porTabla, eventosPY, pagos, cobros, n0: N_PED0 };
      return cache;
    }

    // ---------------------------------------------------------------- la base en un momento dado
    function estadoEn(t) {
      const M = mundo(); const est = {};
      for (const [tb, filas] of Object.entries(M.ini)) est[tb] = new Map(filas.map((r) => [r.id, r]));
      let lsn = 0;
      for (const c of M.cambios) { if (c.ts > t) break; if (c.op === 'd') est[c.tabla].delete(c.id); else est[c.tabla].set(c.id, c.despues); lsn = c.lsn; }
      return { est, lsn };
    }
    function estadoEnLsn(L) {
      const M = mundo(); let t = -Infinity;
      for (const c of M.cambios) { if (c.lsn > L) break; t = c.ts; }
      return { ...estadoEn(t === -Infinity ? T0() - 1 : t), ts: t };
    }
    const COLUMNAS = {
      vendedores: ['id', 'nombre', 'rubro', 'barrio', 'comision_pct', 'creado_en'],
      productos: ['id', 'vendedor_id', 'nombre', 'precio', 'activo', 'actualizado_en'],
      clientes: ['id', 'nombre', 'email', 'telefono', 'barrio', 'creado_en', 'actualizado_en'],
      pedidos: ['id', 'cliente_id', 'estado', 'subtotal', 'envio', 'total', 'proveedor_pago', 'pago_ref', 'creado_en', 'actualizado_en'],
      items_pedido: ['id', 'pedido_id', 'producto_id', 'cantidad', 'precio_unitario'],
    };
    const DINERO = new Set(['precio', 'subtotal', 'envio', 'descuento', 'total', 'precio_unitario']);
    const FECHAS = new Set(['creado_en', 'actualizado_en']);
    // fila como la guarda PostgreSQL: dinero en pesos con 2 decimales, fechas UTC sin zona
    const COLS_CUPON = ['descuento', 'cupon'];
    function columnasEn(tabla, t) { return tabla === 'pedidos' && t >= hitos().cupones ? [...COLUMNAS.pedidos, 'descuento', 'cupon'] : COLUMNAS[tabla]; }
    const conDefecto = (tabla, r, t) => (tabla === 'pedidos' && t >= hitos().cupones && r.descuento === undefined ? { ...r, descuento: 0, cupon: null } : r);
    function filaSql(tabla, r0, t = ahora()) { const r = conDefecto(tabla, r0, t); const o = {}; for (const c of columnasEn(tabla, t)) { const v = r[c]; o[c] = v == null ? null : DINERO.has(c) ? pesos(v) : FECHAS.has(c) ? tsSql(v) : v; } return o; }

    // ---------------------------------------------------------------- CDC: Debezium → Event Hubs (Kafka)
    const TEMA = (t) => `mv_prod.public.${t}`;
    const TABLAS_CDC = ['clientes', 'productos', 'pedidos', 'items_pedido', 'vendedores'];
    const IDENT_COMPLETA = new Set(['clientes', 'pedidos']); // REPLICA IDENTITY FULL: el "before" viene completo
    function valorDebezium(tabla, r0, t) { if (!r0) return null; const r = conDefecto(tabla, r0, t); const o = {}; for (const c of columnasEn(tabla, t)) { const v = r[c]; o[c] = v == null ? null : DINERO.has(c) ? pesos(v) : FECHAS.has(c) ? v * 1000 : v; } return o; }
    function mensaje(c, offset) {
      const antes = c.op === 'c' || c.op === 'r' ? null : IDENT_COMPLETA.has(c.tabla) ? valorDebezium(c.tabla, c.antes, c.ts) : c.op === 'd' ? { id: c.id } : null;
      const ts = c.ts + 180 + (h32(cfg.semilla, 'k', c.i) % 700);
      const valor = { before: antes, after: c.op === 'd' ? null : valorDebezium(c.tabla, c.despues, c.ts), source: { version: '2.7.3.Final', connector: 'postgresql', name: 'mv_prod', ts_ms: c.ts, snapshot: c.snapshot ? 'true' : 'false', db: 'mercado', sequence: null, schema: 'public', table: c.tabla, txId: c.tx, lsn: c.lsn, xmin: null }, op: c.op, ts_ms: ts, transaction: null };
      return { offset, ts, clave: JSON.stringify({ id: c.id }), valor: JSON.stringify(valor), tema: TEMA(c.tabla), particion: 0 };
    }
    // el conector hizo su snapshot inicial (op r) cuando se creó, hace días: esos offsets ya vencieron
    function baseOffset(tabla) { return mundo().ini[tabla].length; }
    function kafkaTemas(t = ahora()) {
      const M = mundo();
      return TABLAS_CDC.map((tb) => {
        const L = M.porTabla[tb]; const base = baseOffset(tb);
        let alto = 0; while (alto < L.length && L[alto].ts + 900 <= t) alto++;
        let bajo = 0; while (bajo < alto && L[bajo].ts + 900 < t - RETENCION_KAFKA) bajo++;
        return { tema: TEMA(tb), tabla: tb, particiones: 1, bajo: base + bajo, alto: base + alto };
      });
    }
    function kafkaLeer(tema, desde, hasta, t = ahora()) {
      const tb = String(tema).replace(/^mv_prod\.public\./, ''); const L = mundo().porTabla[tb]; if (!L) return null;
      const info = kafkaTemas(t).find((x) => x.tabla === tb); const base = baseOffset(tb);
      const d = Math.max(desde, info.bajo), h = Math.min(hasta == null ? info.alto : hasta, info.alto);
      const out = []; for (let o = d; o < h; o++) out.push(mensaje(L[o - base], o));
      return { info, mensajes: out, perdidos: desde < info.bajo ? info.bajo - desde : 0 };
    }
    function offsetPorTiempo(tema, ms, t = ahora()) {
      const tb = String(tema).replace(/^mv_prod\.public\./, ''); const L = mundo().porTabla[tb]; if (!L) return null;
      const info = kafkaTemas(t).find((x) => x.tabla === tb); const base = baseOffset(tb);
      for (let o = info.bajo; o < info.alto; o++) if (L[o - base].ts + 180 >= ms) return o;
      return info.alto;
    }

    // ---------------------------------------------------------------- PagoYa: objetos, eventos y liquidaciones
    const COMISION = (m) => Math.round(m * 0.039) + 500, CARGO_DISPUTA = 15000;
    function eventoPublico(e) { return { id: e.id, objeto: 'evento', tipo: e.tipo, creado: Math.floor(e.ts / 1000), version_api: '2026-07-01', datos: { objeto: e.objeto } }; }
    function eventosHasta(t) { const L = mundo().eventosPY; let n = 0; while (n < L.length && L[n].ts <= t) n++; return L.slice(0, n); }
    function pagoEn(id, t) { let ult = null; for (const e of eventosHasta(t)) { if (e.objeto.objeto === 'pago' && e.objeto.id === id) ult = e.objeto; } if (!ult) return null; const p = { ...ult }; for (const e of eventosHasta(t)) { if (e.objeto.pago === id) { if (e.tipo === 'reembolso.creado') { p.estado = 'reembolsado'; p.monto_reembolsado = e.objeto.monto; } if (e.tipo === 'disputa.abierta') p.disputa = e.objeto.id; if (e.tipo === 'disputa.cerrada' && e.objeto.estado === 'perdida') p.estado = 'contracargo'; } } return p; }
    const fechaLiqCobro = (ta) => sumarDias(diaLocal(ta), horaLocal(ta) >= 23 ? 2 : 1);
    function lineasLiquidacion(fecha) {
      const M = mundo(); const out = [];
      for (const cb of M.cobros) {
        const com = COMISION(cb.monto);
        if (fechaLiqCobro(cb.aprobado) === fecha) out.push({ tipo: 'cobro', pago: cb.pago, pedido: cb.pedido, bruto: cb.monto, comision: com, neto: cb.monto - com, ts: cb.aprobado });
        if (cb.reembolso && sumarDias(diaLocal(cb.reembolso), 1) === fecha) out.push({ tipo: 'reembolso', pago: cb.pago, pedido: cb.pedido, bruto: -cb.monto, comision: 0, neto: -cb.monto, ts: cb.reembolso });
        if (cb.perdida && sumarDias(diaLocal(cb.cierre), 1) === fecha) out.push({ tipo: 'contracargo', pago: cb.pago, pedido: cb.pedido, bruto: -cb.monto, comision: CARGO_DISPUTA, neto: -cb.monto - CARGO_DISPUTA, ts: cb.cierre });
      }
      return out.sort((a, b) => a.ts - b.ts);
    }
    const liquidacionDisponible = (fecha, t = ahora()) => fecha >= diaLocal(T0() + DIA) && t >= msDeDia(fecha) + 6 * HORA;
    function reporteCsv(fecha) {
      return 'fecha_liquidacion,tipo,pago_id,pedido_id,bruto,comision,neto,moneda\n' + lineasLiquidacion(fecha).map((l) => [fecha, l.tipo, l.pago, l.pedido, pesos(l.bruto), pesos(l.comision), pesos(l.neto), 'CRP'].join(',')).join('\n') + '\n';
    }
    function liquidaciones(t = ahora()) {
      const out = []; for (let f = diaLocal(T0() + DIA); liquidacionDisponible(f, t); f = sumarDias(f, 1)) { const L = lineasLiquidacion(f); out.push({ objeto: 'liquidacion', fecha: f, estado: 'pagada', lineas: L.length, neto: L.reduce((a, l) => a + l.neto, 0), moneda: 'CRP', reporte: `/v1/liquidaciones/${f}/reporte.csv` }); }
      return out.reverse();
    }

    // ---------------------------------------------------------------- webhooks: lo que llega a la función receptora
    const TIPOS_WEBHOOK = ['pago.creado', 'pago.aprobado', 'pago.rechazado', 'reembolso.creado', 'disputa.abierta', 'disputa.cerrada'];
    function caida(dia) { // cada día la función receptora se cae un rato (reinicio, despliegue, cuota)
      const b = msDeDia(dia); const h = h32(cfg.semilla, 'caida', dia);
      return { desde: b + (2 * HORA) + (h % (20 * HORA)), hasta: b + (2 * HORA) + (h % (20 * HORA)) + (20 + (h >>> 8) % 25) * MIN };
    }
    const enCaida = (ms) => { const c = caida(diaLocal(ms)); return ms >= c.desde && ms < c.hasta; };
    function firmar(t, cuerpo, secreto) { return `t=${t},v1=${hmacHex(secreto, `${t}.${cuerpo}`)}`; }
    function entregaDe(idSemilla, ms, cuerpo, firma, endpoint) {
      return { entrega_id: 'whd_' + h32(cfg.semilla, 'whd', idSemilla).toString(16).padStart(8, '0') + h32(cfg.semilla, 'whd2', idSemilla).toString(16).padStart(8, '0'), recibido: ms, endpoint, headers: { 'content-type': 'application/json; charset=utf-8', 'pagoya-signature': firma, 'user-agent': 'PagoYa/1.0 (+https://pagoya.example/docs/webhooks)' }, cuerpo };
    }
    /** Entregas recibidas en (desde, hasta] por un endpoint creado en `alta`, para los tipos pedidos. */
    function entregas(alta, desde, hasta, tipos) {
      const firmaEn = (t, cuerpo) => { const C = claves(t * 1000); return C.webhookAnterior ? `t=${t},v1=${hmacHex(C.webhook, `${t}.${cuerpo}`)},v1=${hmacHex(C.webhookAnterior, `${t}.${cuerpo}`)}` : firmar(t, cuerpo, C.webhook); };
      const endpoint = 'we_' + hex('we', 14); const tiposSet = new Set(tipos && tipos.length ? tipos : TIPOS_WEBHOOK);
      const out = [];
      for (const e of mundo().eventosPY) {
        if (e.ts < alta || e.ts > hasta) continue; if (e.ts < desde - 12 * HORA) continue; if (!tiposSet.has(e.tipo)) continue;
        const R = azar(h32(cfg.semilla, 'wh', e.id)); const cuerpo = JSON.stringify(eventoPublico(e));
        let at = e.ts + R.int(800, 4000); if (R.chance(0.02)) at += R.int(10, 90) * SEG; // algunos salen tarde (cola de reintentos de PagoYa)
        const reintentos = [MIN, 5 * MIN, 30 * MIN, 2 * HORA, 5 * HORA, 10 * HORA]; let k = 0; const base = at;
        while (enCaida(at) && k < reintentos.length) at = base + reintentos[k++];
        const t = Math.floor(at / 1000);
        const lista = [[at + R.int(30, 600), firmaEn(t, cuerpo), 0]];
        if (R.chance(0.03)) { const at2 = at + R.int(5, 50) * MIN; lista.push([at2 + R.int(30, 600), firmaEn(Math.floor(at2 / 1000), cuerpo), 1]); } // la función tardó en responder 2xx: PagoYa reintenta
        for (const [ms, firma, n] of lista) if (ms > desde && ms <= hasta) out.push(entregaDe(e.id + ':' + n, ms, cuerpo, firma, endpoint));
      }
      // tráfico que no es de PagoYa: alguien prueba el endpoint con eventos inventados, y repeticiones viejas
      const h0 = Math.max(Math.floor((Math.max(desde, alta) - T0()) / HORA), 0), h1 = Math.floor((hasta - T0()) / HORA);
      for (let h = h0; h <= h1; h++) {
        const R = azar(h32(cfg.semilla, 'falso', h)); const th = T0() + h * HORA;
        if (R.chance(0.09)) {
          const ms = th + R.int(10, 3590) * SEG; if (ms > desde && ms <= hasta && ms >= alta) {
            const falso = { id: 'evt_' + h32(cfg.semilla, 'fx', h).toString(36) + 'zz', objeto: 'evento', tipo: 'pago.aprobado', creado: Math.floor(ms / 1000) - 2, version_api: '2026-07-01', datos: { objeto: { id: 'py_' + h32(cfg.semilla, 'fp', h).toString(36), objeto: 'pago', monto: R.int(50, 900) * 10000, moneda: 'CRP', estado: 'aprobado', metodo: 'tarjeta', creado: Math.floor(ms / 1000) - 9, aprobado_en: Math.floor(ms / 1000) - 2, metadatos: { pedido_id: String(R.int(1300, 3000)) } } } };
            const cuerpo = JSON.stringify(falso); const t = Math.floor(ms / 1000);
            out.push(entregaDe('falso:' + h, ms, cuerpo, firmar(t, cuerpo, 'whsec_' + hex('otro', 32)), endpoint));
          }
        }
        if (R.chance(0.03)) { // repetición: alguien reenvía una entrega vieja tal cual (firma válida, pero de hace días)
          const ms = th + R.int(10, 3590) * SEG; const viejos = mundo().eventosPY.filter((e) => e.ts < ms - 26 * HORA && e.ts >= alta && tiposSet.has(e.tipo));
          if (viejos.length && ms > desde && ms <= hasta) { const e = viejos[R.int(Math.max(0, viejos.length - 200), viejos.length - 1)]; const cuerpo = JSON.stringify(eventoPublico(e)); const t = Math.floor((e.ts + 2000) / 1000); out.push(entregaDe('rep:' + h, ms, cuerpo, firmaEn(t, cuerpo), endpoint)); }
        }
      }
      return out.sort((a, b) => a.recibido - b.recibido);
    }

    // ---------------------------------------------------------------- lo que tiene que dar (para la revisión)
    function categoriaEn(cb, t) {
      if (cb.perdida && cb.cierre <= t) return 'contracargo';
      if (cb.disputa && cb.disputa <= t && !(cb.cierre <= t)) return 'en_disputa';
      if (cb.reembolso && cb.reembolso <= t) return 'reembolsado';
      if (cb.borrado && cb.borrado <= t) return 'pago_sin_pedido';
      if (cb.cancelado && cb.cancelado <= t) return 'cobrado_y_cancelado';
      return 'ok';
    }
    /** Conciliación esperada: un registro por pago aprobado en días ya cerrados (hora de Ciudad del Río). */
    function conciliacion(t = ahora()) {
      const hoy = diaLocal(t); const out = [];
      for (const cb of mundo().cobros) {
        if (cb.aprobado > t) continue; const f = diaLocal(cb.aprobado); if (f >= hoy) continue;
        const fl = fechaLiqCobro(cb.aprobado);
        out.push({ pago_id: cb.pago, pedido_id: cb.pedido, fecha: f, monto: cb.monto / 100, categoria: categoriaEn(cb, t), liquidado_el: liquidacionDisponible(fl, t) ? fl : null, cb });
      }
      return out;
    }

    // ---------------------------------------------------------------- la API REST de PagoYa
    const st = { ventanas: {}, n: 0 };
    function res(status, cuerpo, headers = {}) {
      const id = 'req_' + h32(cfg.semilla, 'req', ++st.n, ahora()).toString(36);
      const json = typeof cuerpo !== 'string';
      return { status, headers: { 'content-type': json ? 'application/json' : 'text/csv; charset=utf-8', 'request-id': id, 'pagoya-version': '2026-07-01', ...headers }, body: json ? JSON.stringify(cuerpo, null, 2) : cuerpo };
    }
    const ERR = (status, tipo, mensaje, extra = {}) => res(status, { error: { tipo, mensaje, ...extra } });
    function request(method, url, headers) {
      const t = ahora(); const H = {}; for (const [k, v] of Object.entries(headers || {})) H[k.toLowerCase()] = String(v);
      const u = new URL(url); const ruta = u.pathname.replace(/\/+$/, '') || '/'; const q = Object.fromEntries(u.searchParams.entries());
      if (ruta === '/' || ruta === '/v1') return res(200, { nombre: 'PagoYa API', version: '2026-07-01', documentacion: 'Mira la lección "Fuentes y accesos" del proyecto Mercado Vecino' });
      let clave = null; const au = H.authorization || '';
      if (/^Bearer\s+/i.test(au)) clave = au.replace(/^Bearer\s+/i, '').trim();
      else if (/^Basic\s+/i.test(au)) { try { clave = atob(au.replace(/^Basic\s+/i, '')).split(':')[0]; } catch (e) { clave = null; } }
      if (!clave) return ERR(401, 'autenticacion', 'Falta la clave secreta. Envíala como Authorization: Bearer sk_test_… (o curl -u sk_test_…:).');
      if (clave !== claves().pagoya) return ERR(401, 'autenticacion', `Clave inválida: ${clave.slice(0, 12)}… Revisa que sea la clave secreta (sk_test_), no la pública.`);
      const v = Math.floor(t / MIN); st.ventanas = { [v]: (st.ventanas[v] || 0) + 1 };
      if (st.ventanas[v] > 100) { const r = ERR(429, 'limite', 'Demasiados pedidos: el límite es 100 por minuto.'); r.headers['retry-after'] = String(60 - Math.floor((t % MIN) / 1000)); return r; }
      if (h32(cfg.semilla, 'falla', st.n) % 100 === 0) return ERR(503, 'api', 'Servicio no disponible momentáneamente. Reintenta con espera exponencial.');
      if (method !== 'GET') return ERR(405, 'pedido_invalido', 'Esta clave es de solo lectura (rol: lector_datos). Solo GET.');
      let m;
      if (ruta === '/v1/eventos') {
        const lim = Math.min(100, Math.max(1, Number(q.limite || 10) || 10));
        let L = eventosHasta(t).filter((e) => e.ts >= t - 30 * DIA);
        if (q.tipo) { const tipos = q.tipo.split(','); L = L.filter((e) => tipos.some((x) => (x.endsWith('.*') ? e.tipo.startsWith(x.slice(0, -1)) : e.tipo === x))); }
        if (q.creado_desde) L = L.filter((e) => e.ts >= Number(q.creado_desde) * 1000);
        if (q.creado_hasta) L = L.filter((e) => e.ts <= Number(q.creado_hasta) * 1000);
        L = L.slice().reverse(); // los más nuevos primero
        if (q.despues_de) { const i = L.findIndex((e) => e.id === q.despues_de); if (i < 0) return ERR(400, 'pedido_invalido', `No existe el evento ${q.despues_de} (o tiene más de 30 días).`); L = L.slice(i + 1); }
        if (q.antes_de) { const i = L.findIndex((e) => e.id === q.antes_de); if (i < 0) return ERR(400, 'pedido_invalido', `No existe el evento ${q.antes_de}.`); L = L.slice(Math.max(0, i - lim), i); return res(200, { objeto: 'lista', url: '/v1/eventos', hay_mas: i - lim > 0, datos: L.map(eventoPublico) }); }
        const pag = L.slice(0, lim); const sig = new URL(url); sig.searchParams.set('despues_de', pag.length ? pag[pag.length - 1].id : ''); sig.searchParams.delete('antes_de');
        return res(200, { objeto: 'lista', url: '/v1/eventos', hay_mas: L.length > lim, url_siguiente: L.length > lim ? sig.toString() : null, datos: pag.map(eventoPublico) });
      }
      if ((m = /^\/v1\/eventos\/(evt_\w+)$/.exec(ruta))) { const e = eventosHasta(t).find((x) => x.id === m[1]); return e ? res(200, eventoPublico(e)) : ERR(404, 'pedido_invalido', `No existe el evento ${m[1]}.`); }
      if (ruta === '/v1/pagos') {
        const lim = Math.min(100, Math.max(1, Number(q.limite || 10) || 10));
        let L = [...mundo().pagos.values()].filter((p) => p.creado * 1000 <= t);
        if (q.pedido_id) L = L.filter((p) => p.metadatos.pedido_id === String(q.pedido_id));
        L = L.reverse(); if (q.despues_de) { const i = L.findIndex((p) => p.id === q.despues_de); L = i < 0 ? [] : L.slice(i + 1); }
        return res(200, { objeto: 'lista', url: '/v1/pagos', hay_mas: L.length > lim, datos: L.slice(0, lim).map((p) => pagoEn(p.id, t)) });
      }
      if ((m = /^\/v1\/pagos\/(py_\w+)$/.exec(ruta))) { const p = pagoEn(m[1], t); return p ? res(200, p) : ERR(404, 'pedido_invalido', `No existe el pago ${m[1]}.`); }
      if (ruta === '/v1/disputas') {
        const L = eventosHasta(t).filter((e) => e.tipo.startsWith('disputa.')); const ult = new Map(); for (const e of L) ult.set(e.objeto.id, e.objeto);
        let D = [...ult.values()].reverse(); if (q.estado) D = D.filter((d) => d.estado === q.estado);
        return res(200, { objeto: 'lista', url: '/v1/disputas', hay_mas: false, datos: D });
      }
      if (ruta === '/v1/liquidaciones') return res(200, { objeto: 'lista', url: '/v1/liquidaciones', hay_mas: false, datos: liquidaciones(t) });
      if ((m = /^\/v1\/liquidaciones\/(\d{4}-\d{2}-\d{2})\/lineas$/.exec(ruta))) {
        if (!liquidacionDisponible(m[1], t)) return ERR(404, 'pedido_invalido', `No hay liquidación para ${m[1]} (todavía). Se publican a las 06:00 hora de Ciudad del Río.`);
        return res(200, { objeto: 'lista', url: ruta, hay_mas: false, url_siguiente: null, datos: lineasLiquidacion(m[1]).map((l) => ({ fecha_liquidacion: m[1], tipo: l.tipo, pago_id: l.pago, pedido_id: String(l.pedido), bruto: l.bruto, comision: l.comision, neto: l.neto, moneda: 'CRP' })) });
      }
      if ((m = /^\/v1\/liquidaciones\/(\d{4}-\d{2}-\d{2})(\/reporte\.csv)?$/.exec(ruta))) {
        if (!liquidacionDisponible(m[1], t)) return ERR(404, 'pedido_invalido', `No hay liquidación para ${m[1]} (todavía). Las liquidaciones se publican a las 06:00 hora de Ciudad del Río del día de pago.`);
        if (m[2]) return res(200, reporteCsv(m[1]), { 'content-disposition': `attachment; filename="liquidacion_${m[1]}.csv"` });
        return res(200, liquidaciones(t).find((x) => x.fecha === m[1]));
      }
      return ERR(404, 'pedido_invalido', `No existe la ruta ${ruta}.`);
    }

    const API = {
      HOST: 'api.pagoya.example',
      esDeLaApi: (url) => /^https?:\/\/api\.pagoya\.example(\/|$|\?)/.test(String(url)),
      configurar(c) { const antes = cfg.semilla + ':' + cfg.inicio; Object.assign(cfg, c || {}); if (antes !== cfg.semilla + ':' + cfg.inicio) cache = null; },
      config: () => cfg,
      request(method, url, headers) { const h = headers && typeof headers.toJs === 'function' ? headers.toJs({ dict_converter: Object.fromEntries }) : headers; return request(method, url, h || {}); },
      avanzar(seg) { cfg.desfase += Math.max(0, Number(seg) || 0) * 1000; },
    };
    const MUNDO = {
      cfg, ahora, claves, hitos, columnasEn, mundo, estadoEn, estadoEnLsn, COLUMNAS, filaSql, valorDebezium, TABLAS_CDC, TEMA, kafkaTemas, kafkaLeer, offsetPorTiempo,
      eventosHasta, eventoPublico, pagoEn, lineasLiquidacion, liquidaciones, liquidacionDisponible, reporteCsv, entregas, TIPOS_WEBHOOK, caida,
      conciliacion, categoriaEn, fechaLiqCobro, hmacHex, firmar, diaLocal, inicioDiaLocal, msDeDia, sumarDias, T0, RETENCION_KAFKA, ANONIMO, tsSql, pesos, API,
    };
    g.PagoYa = API;
    g.MercadoVecinoMundo = MUNDO;
    return MUNDO;
  }

  const g = typeof window !== 'undefined' ? window : self;
  mercadoVecinoFactory(g);
  g.MERCADO_VECINO_SRC = mercadoVecinoFactory.toString();

  // ---------------------------------------------------------------- en la página: semilla, inicio y estado guardado
  if (typeof window === 'undefined') return;
  const MV = window.MercadoVecinoMundo;
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  function datos() {
    const S = almacen(); if (!S) return null;
    S.data.mercado = S.data.mercado || {};
    const D = S.data.mercado;
    if (!D.semilla) D.semilla = 1000 + Math.floor(Math.random() * 899000);
    if (!D.inicio) D.inicio = Date.now();
    D.grupos = D.grupos || {};
    return D;
  }
  function sincronizar() { const D = datos(); if (!D) return false; MV.API.configurar({ semilla: D.semilla, inicio: D.inicio }); return true; }
  window.MercadoVecinoHost = {
    datos, sincronizar,
    guardar() { try { almacen().save(); } catch (e) { /* lleno */ } },
    configParaWorker() { sincronizar(); const c = MV.cfg; return { semilla: c.semilla, inicio: c.inicio }; },
  };
  const intento = setInterval(() => { if (sincronizar()) clearInterval(intento); }, 300);
})();
