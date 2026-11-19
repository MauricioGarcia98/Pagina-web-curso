/* Cuentas Claras: el proyecto 5. Un software de facturación para pymes (SaaS B2B, inventado) con tres sistemas que
 * no se hablan entre sí:
 * - Contacto CRM (https://api.contactocrm.example): empresas, negocios y vendedores. Paginación con cursor, archivados,
 *   empresas duplicadas, y un PATCH para escribir propiedades (reverse ETL), con límite de 100 pedidos cada 10 s.
 * - Cobrable (https://api.cobrable.example): clientes, suscripciones y el log de eventos de suscripción (altas,
 *   cambios de plan, de asientos, descuentos, pruebas gratis, morosidad y bajas). De ahí sale el MRR.
 * - Medidor (https://api.medidor.example): exportación de eventos de uso del producto, por día, con identidad anónima
 *   antes del login ($identify une el id anónimo con el usuario) y el maestro de usuarios por cuenta.
 * Cambios sin aviso: suba de precio del plan Pro para clientes nuevos, el equipo de ventas fusiona empresas duplicadas
 * en el CRM (cambian los ids), y la app móvil renombra el evento factura_emitida → invoice_created.
 *
 * cuentasClarasFactory se serializa con toString() y se evalúa en el worker de Python (para requests).
 */
(function () {
  'use strict';
  function cuentasClarasFactory(g) {
    const SEG = 1000, MIN = 60000, HORA = 3600000, DIA = 86400000, ZONA_H = -3;
    const cfg = { semilla: 4242, inicio: Date.UTC(2026, 10, 19, 12), desfase: 0, crm: {} };
    const ahora = () => Date.now() + cfg.desfase;
    function h32() { let h = 2166136261; for (const a of arguments) { const s = String(a); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= 0x9e3779b9; h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); } return (h ^ (h >>> 15)) >>> 0; }
    function azar(seed) { let a = seed >>> 0; const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; return { r, int: (x, y) => x + Math.floor(r() * (y - x + 1)), chance: (p) => r() < p, pick: (l) => l[Math.floor(r() * l.length)] }; }
    const pad = (n, k = 2) => String(n).padStart(k, '0');
    const local = (ms) => new Date(ms + ZONA_H * HORA);
    const diaLocal = (ms) => { const d = local(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
    const inicioDiaLocal = (ms) => { const d = local(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ZONA_H * HORA; };
    const msDeDia = (f) => Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) - ZONA_H * HORA;
    const sumarDias = (f, n) => diaLocal(msDeDia(f) + n * DIA + HORA);
    const mesDe = (ms) => diaLocal(ms).slice(0, 7);
    const finDeMes = (mes) => { const [y, m] = mes.split('-').map(Number); return Date.UTC(y, m, 1) - ZONA_H * HORA - 1; }; // último ms del mes, hora local
    const mesesAntes = (mes, n) => { const [y, m] = mes.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 - n, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };
    const hex = (tag, n) => { let o = ''; let k = 0; while (o.length < n) o += h32(cfg.semilla, tag, k++).toString(16).padStart(8, '0'); return o.slice(0, n); };

    const I = () => inicioDiaLocal(cfg.inicio);
    function hitos() { const i = I(); return { precioPro: i + DIA, renombre: i + DIA + 6 * HORA, fusion: i + 2 * DIA + 11 * HORA }; }
    const claves = () => ({ crm: 'pat-na1-' + hex('crm', 8) + '-' + hex('crm2', 4) + '-' + hex('crm3', 12), cobrable: 'ck_live_' + hex('cob', 24), medidor: 'mx_' + hex('med', 28) });
    const PLANES = { basico: { nombre: 'Básico', mensual: 29 }, pro: { nombre: 'Pro', mensual: 79 }, empresa: { nombre: 'Empresa', mensual: 39, porAsiento: true } };
    const precioPro = (t) => (t >= hitos().precioPro ? 89 : 79);
    const RUBROS = ['Comercio', 'Servicios profesionales', 'Gastronomía', 'Construcción', 'Salud', 'Educación', 'Transporte', 'Tecnología'];
    const NOMBRES = ['Andina', 'Del Sur', 'Rivera', 'Costa Azul', 'La Esquina', 'Norte Grande', 'Puerto', 'El Faro', 'Las Palmas', 'Monte Verde', 'San Telmo', 'Río Claro', 'Los Pinos', 'Altamira', 'Bella Vista', 'Tres Cruces', 'Villa Nueva', 'La Ribera', 'Mirador', 'Santa Rosa'];
    const TIPOS = ['Distribuidora', 'Estudio', 'Ferretería', 'Clínica', 'Consultora', 'Panadería', 'Transportes', 'Inmobiliaria', 'Academia', 'Taller', 'Farmacia', 'Constructora'];
    const VENDEDORES = [{ id: '101', nombre: 'Laura Benítez' }, { id: '102', nombre: 'Marcos Ríos' }, { id: '103', nombre: 'Paula Sosa' }, { id: '104', nombre: 'Diego Ferrer' }, { id: '105', nombre: 'Inés Valdés' }];

    // ---------------------------------------------------------------- el mundo
    let cache = null;
    function mundo() {
      const clave = cfg.semilla + ':' + I(); if (cache && cache.clave === clave) return cache;
      const s = cfg.semilla; const R = azar(h32(s, 'cc')); const H = hitos();
      const T0 = I() - 540 * DIA; const FIN = I() + 30 * DIA;
      const cuentas = []; const eventos = []; let nEv = 0; const evento = (ts, tipo, sub, datos, previo) => { eventos.push({ id: 'evt_' + h32(s, 'e', ++nEv).toString(36) + nEv.toString(36), ts, tipo, sub: sub.id, cliente: sub.cliente, datos: { ...datos }, previo: previo || null }); };
      const N = 420;
      for (let i = 0; i < N; i++) {
        const alta = T0 + Math.floor(Math.pow(R.r(), 0.8) * (FIN - T0 - 20 * DIA));
        const nombre = `${R.pick(TIPOS)} ${R.pick(NOMBRES)}`; const dom = `${nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '')}${i}.com.example`;
        const c = { i, nombre, dominio: dom, rubro: R.pick(RUBROS), alta, vendedor: R.pick(VENDEDORES).id, cliente: 'cus_' + h32(s, 'cus', i).toString(36).padStart(7, '0'), crm: String(1000000 + h32(s, 'crm', i) % 8000000), cuentaProducto: 'acc_' + h32(s, 'acc', i).toString(36), usuarios: R.int(1, 12), dupCrm: R.chance(0.06), conCrmId: R.chance(0.8) };
        cuentas.push(c);
        // la suscripción y su historia
        const sub = { id: 'sub_' + h32(s, 'sub', i).toString(36).padStart(8, '0'), cliente: c.cliente };
        const plan = R.r() < 0.35 ? 'basico' : R.r() < 0.75 ? 'pro' : 'empresa'; const anual = R.chance(0.25);
        let pendDesc = null;
        let st = { plan, intervalo: anual ? 'anual' : 'mensual', asientos: plan === 'empresa' ? R.int(3, 25) : 1, estado: R.chance(0.6) ? 'trialing' : 'active', precio: plan === 'pro' ? precioPro(alta) : PLANES[plan].mensual, descuento: 0 };
        let t = alta; evento(t, 'customer.subscription.created', sub, st);
        const cambia = (ts, cambios) => { const previo = {}; for (const k of Object.keys(cambios)) previo[k] = st[k]; st = { ...st, ...cambios }; evento(ts, cambios.estado === 'canceled' ? 'customer.subscription.deleted' : 'customer.subscription.updated', sub, st, previo); };
        if (st.estado === 'trialing') { t += 14 * DIA; if (t > FIN) continue; if (R.chance(0.3)) { cambia(t, { estado: 'canceled' }); c.bajaEnPrueba = true; continue; } cambia(t, { estado: 'active' }); }
        if (R.chance(0.2)) { const td = t + R.int(1, 3) * HORA; cambia(td, { descuento: 20 }); t = td; pendDesc = td + 90 * DIA; }
        let vivo = true;
        while (vivo) {
          t += R.int(20, 120) * DIA;
          if (pendDesc && pendDesc <= Math.min(t, FIN)) { cambia(pendDesc, { descuento: 0 }); pendDesc = null; }
          if (t > FIN) break;
          const x = R.r();
          if (x < 0.1) { cambia(t, { estado: 'past_due' }); t += R.int(3, 15) * DIA; if (t > FIN) break; if (R.chance(0.6)) cambia(t, { estado: 'active' }); else { cambia(t, { estado: 'canceled' }); vivo = false; c.baja = t; if (R.chance(0.25)) { t += R.int(30, 150) * DIA; if (t < FIN) { cambia(t, { estado: 'active', plan: 'basico', precio: 29, asientos: 1, intervalo: 'mensual' }); vivo = true; c.reactivada = t; } } } }
          else if (x < 0.28 && st.plan === 'basico') cambia(t, { plan: 'pro', precio: precioPro(t) });
          else if (x < 0.36 && st.plan === 'pro') cambia(t, { plan: 'basico', precio: 29 });
          else if (x < 0.5 && st.plan === 'empresa') cambia(t, { asientos: Math.max(2, st.asientos + R.int(-4, 6)) });
          else if (x < 0.57) { cambia(t, { estado: 'canceled' }); vivo = false; c.baja = t; }
        }
      }
      eventos.sort((a, b) => a.ts - b.ts || 0);
      // la fusión de duplicados del CRM: el registro duplicado queda archivado y "fusionado en" el principal
      for (const c of cuentas) if (c.dupCrm) c.crmDup = String(9000000 + h32(s, 'dup', c.i) % 900000);
      cache = { clave, cuentas, eventos, T0 };
      return cache;
    }
    const mrrDe = (st) => (!st || !['active', 'past_due'].includes(st.estado) ? 0 : Math.round(((st.intervalo === 'anual' ? st.precio * 10 / 12 : st.precio) * st.asientos * (1 - st.descuento / 100)) * 100) / 100);
    function estadoSubsEn(t) { const m = new Map(); for (const e of mundo().eventos) { if (e.ts > t) break; m.set(e.cliente, e.datos); } return m; }
    /** MRR por cliente al cierre de un mes (hora local). */
    function mrrMes(mes) { const E = estadoSubsEn(finDeMes(mes)); const out = new Map(); for (const [c, st] of E) out.set(c, mrrDe(st)); return out; }
    function movimientos(mes) {
      const prev = mrrMes(mesesAntes(mes, 1)), act = mrrMes(mes); const out = [];
      const tuvo = (c) => { for (const e of mundo().eventos) { if (e.ts > finDeMes(mesesAntes(mes, 1))) break; if (e.cliente === c && mrrDe(e.datos) > 0) return true; } return false; };
      for (const c of new Set([...prev.keys(), ...act.keys()])) {
        const a = prev.get(c) || 0, b = act.get(c) || 0; let mov = null;
        if (a === 0 && b > 0) mov = tuvo(c) ? 'reactivacion' : 'nuevo'; else if (a > 0 && b === 0) mov = 'churn'; else if (b > a) mov = 'expansion'; else if (b < a) mov = 'contraccion';
        out.push({ cliente: c, mes, mrr: b, mrr_anterior: a, movimiento: mov || (b > 0 ? 'sin_cambio' : null) });
      }
      return out.filter((x) => x.movimiento);
    }

    // ---------------------------------------------------------------- CRM: empresas, negocios y vendedores
    function crmEmpresas(t) {
      const H = hitos(); const W = mundo(); const out = []; const props = cfg.crm || {};
      for (const c of W.cuentas) {
        if (c.alta > t) continue;
        const base = { id: c.crm, properties: { name: c.nombre, domain: c.i % 7 === 0 ? 'www.' + c.dominio : c.i % 11 === 0 ? c.dominio.toUpperCase() : c.dominio, industry: c.rubro, hubspot_owner_id: c.vendedor, lifecyclestage: 'customer', createdate: new Date(c.alta).toISOString(), hs_lastmodifieddate: new Date(Math.max(c.alta, c.baja || 0)).toISOString(), ...(props[c.crm] || {}) }, archived: false };
        out.push(base);
        if (c.crmDup) { const fusionado = t >= H.fusion; out.push({ id: c.crmDup, properties: { name: c.nombre.toUpperCase(), domain: c.dominio, industry: c.rubro, hubspot_owner_id: VENDEDORES[(Number(c.vendedor) - 100) % 5].id, lifecyclestage: 'lead', createdate: new Date(c.alta + 3 * DIA).toISOString(), hs_lastmodifieddate: new Date(fusionado ? H.fusion : c.alta + 3 * DIA).toISOString(), ...(props[c.crmDup] || {}) }, archived: fusionado, ...(fusionado ? { mergedInto: c.crm } : {}) }); }
      }
      return out;
    }
    // ---------------------------------------------------------------- Medidor: usuarios y eventos de uso
    function usuarios() { const out = []; for (const c of mundo().cuentas) for (let k = 0; k < c.usuarios; k++) out.push({ user_id: `u_${c.i}_${k}`, account_id: c.cuentaProducto, billing_customer_id: c.cliente, email: `usuario${k}@${c.dominio}`, creado: new Date(c.alta + k * DIA).toISOString() }); return out; }
    const cacheUso = new Map();
    function usoDelDia(fecha) {
      const k = cfg.semilla + ':' + fecha; if (cacheUso.has(k)) return cacheUso.get(k);
      const base = msDeDia(fecha); const H = hitos(); const E = estadoSubsEn(base + 12 * HORA); const out = []; const W = mundo();
      for (const c of W.cuentas) {
        const st = E.get(c.cliente); if (!st || !['active', 'past_due', 'trialing'].includes(st.estado)) continue;
        const R = azar(h32(cfg.semilla, 'uso', fecha, c.i)); const actividad = (h32(cfg.semilla, 'act', c.i) % 100) / 100; // algunas cuentas casi no usan
        for (let u = 0; u < c.usuarios; u++) {
          if (c.alta + u * DIA > base + 12 * HORA) continue; // ese usuario todavía no existía
          if (!R.chance(0.15 + actividad * 0.7)) continue;
          const uid = `u_${c.i}_${u}`; const anon = 'anon_' + h32(cfg.semilla, uid, fecha).toString(36); const movil = R.chance(0.35); let t = base + R.int(8 * 60, 19 * 60) * MIN;
          out.push({ event: 'pagina_vista', distinct_id: anon, time: t, properties: { pagina: '/ingresar', plataforma: movil ? 'android' : 'web' } });
          t += R.int(10, 60) * SEG; out.push({ event: '$identify', distinct_id: uid, time: t, properties: { $anon_distinct_id: anon } });
          out.push({ event: 'login', distinct_id: uid, time: t + 1000, properties: { plataforma: movil ? 'android' : 'web' } });
          const n = R.int(0, Math.round(1 + actividad * 8));
          for (let j = 0; j < n; j++) { t += R.int(2, 40) * MIN; const nuevo = movil && t >= H.renombre; out.push({ event: nuevo ? 'invoice_created' : 'factura_emitida', distinct_id: uid, time: t, properties: { plataforma: movil ? 'android' : 'web', monto: R.int(500, 90000), app_version: movil ? (nuevo ? '5.0.0' : '4.12.3') : 'web' } }); }
          if (R.chance(0.05)) out.push({ event: 'usuario_invitado', distinct_id: uid, time: t + MIN, properties: {} });
        }
      }
      out.sort((a, b) => a.time - b.time); cacheUso.set(k, out); if (cacheUso.size > 40) cacheUso.delete(cacheUso.keys().next().value);
      return out;
    }

    // ---------------------------------------------------------------- las APIs
    const st = { ventanas: {}, n: 0, cambios: [] };
    function res(status, cuerpo, h = {}) { const json = typeof cuerpo !== 'string'; return { status, headers: { 'content-type': json ? 'application/json' : 'application/x-ndjson', 'x-request-id': 'rq_' + h32(cfg.semilla, ++st.n, ahora()).toString(36), ...h }, body: json ? JSON.stringify(cuerpo, null, 2) : cuerpo }; }
    const ERR = (s, m, h) => res(s, { status: 'error', message: m }, h);
    function limitar(clave, max, ventana, t) { const v = Math.floor(t / ventana); st.ventanas[clave] = st.ventanas[clave] && st.ventanas[clave].v === v ? st.ventanas[clave] : { v, n: 0 }; return ++st.ventanas[clave].n > max; }
    function request(method, url, headers, body) {
      const t = ahora(); const H = {}; for (const [k, v] of Object.entries(headers || {})) H[k.toLowerCase()] = String(v);
      const u = new URL(url); const ruta = u.pathname.replace(/\/+$/, ''); const q = Object.fromEntries(u.searchParams.entries()); const C = claves();
      const token = (H.authorization || '').replace(/^Bearer\s+/i, '');
      // ---------------- CRM
      if (u.hostname === 'api.contactocrm.example') {
        if (token !== C.crm) return ERR(401, 'Authentication credentials not found. This API supports OAuth 2.0 and private app access tokens (Authorization: Bearer pat-…).');
        if (limitar('crm', 100, 10 * SEG, t)) return res(429, { status: 'error', message: 'You have reached your ten_secondly_rolling limit.', errorType: 'RATE_LIMIT', policyName: 'TEN_SECONDLY_ROLLING' }, { 'retry-after': '10' });
        let m;
        if (ruta === '/crm/v3/objects/companies' && method === 'GET') {
          const arch = q.archived === 'true'; const lim = Math.min(100, Number(q.limit || 10) || 10); const L = crmEmpresas(t).filter((x) => x.archived === arch).sort((a, b) => Number(a.id) - Number(b.id));
          const i = q.after ? L.findIndex((x) => Number(x.id) > Number(q.after)) : 0; const pag = i < 0 ? [] : L.slice(i, i + lim);
          const pedidas = q.properties ? q.properties.split(',') : ['name', 'domain', 'createdate', 'hs_lastmodifieddate'];
          return res(200, { results: pag.map((x) => ({ id: x.id, properties: Object.fromEntries(pedidas.map((k) => [k, x.properties[k] ?? null])), createdAt: x.properties.createdate, updatedAt: x.properties.hs_lastmodifieddate, archived: x.archived, ...(x.mergedInto ? { mergedInto: x.mergedInto } : {}) })), ...(i >= 0 && i + lim < L.length ? { paging: { next: { after: pag[pag.length - 1].id, link: `https://api.contactocrm.example/crm/v3/objects/companies?after=${pag[pag.length - 1].id}&limit=${lim}` } } } : {}) });
        }
        if ((m = /^\/crm\/v3\/objects\/companies\/(\d+)$/.exec(ruta))) {
          const L = crmEmpresas(t); const x = L.find((y) => y.id === m[1]);
          if (!x) return ERR(404, `Object not found. objectId are usually numeric. (${m[1]})`);
          if (method === 'GET') return res(200, { id: x.id, properties: x.properties, archived: x.archived, ...(x.mergedInto ? { mergedInto: x.mergedInto } : {}) });
          if (method === 'PATCH') {
            if (x.archived) return ERR(409, `Cannot update archived object ${x.id}${x.mergedInto ? ` (merged into ${x.mergedInto})` : ''}.`);
            let b; try { b = JSON.parse(body || '{}'); } catch (e) { return ERR(400, 'Invalid JSON.'); }
            const p = b.properties || {}; const validas = ['health_score', 'mrr_actual', 'plan_actual'];
            const malas = Object.keys(p).filter((k) => !validas.includes(k)); if (malas.length) return ERR(400, `Property values were not valid: ${malas.map((k) => `"${k}" does not exist`).join(', ')}. Propiedades personalizadas creadas para el equipo de datos: ${validas.join(', ')}.`);
            cfg.crm[x.id] = { ...(cfg.crm[x.id] || {}), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) }; st.cambios.push({ id: x.id, props: p, t });
            return res(200, { id: x.id, properties: { ...x.properties, ...cfg.crm[x.id] }, updatedAt: new Date(t).toISOString() });
          }
        }
        if (ruta === '/crm/v3/owners') return res(200, { results: VENDEDORES.map((v) => ({ id: v.id, firstName: v.nombre.split(' ')[0], lastName: v.nombre.split(' ')[1], email: v.nombre.toLowerCase().replace(' ', '.') + '@cuentasclaras.example' })) });
        return ERR(404, `No existe ${ruta}.`);
      }
      // ---------------- Cobrable
      if (u.hostname === 'api.cobrable.example') {
        if (token !== C.cobrable) return ERR(401, 'Invalid API Key provided.');
        if (method !== 'GET') return ERR(405, 'Clave de solo lectura.');
        const lim = Math.min(100, Number(q.limit || 10) || 10);
        const lista = (L, url0) => { let i = 0; if (q.starting_after) { i = L.findIndex((x) => x.id === q.starting_after) + 1; if (i <= 0) return ERR(400, `No such object: ${q.starting_after}`); } const pag = L.slice(i, i + lim); return res(200, { object: 'list', url: url0, has_more: i + lim < L.length, data: pag }); };
        const W = mundo();
        if (ruta === '/v1/customers') return lista(W.cuentas.filter((c) => c.alta <= t).sort((a, b) => b.alta - a.alta).map((c) => ({ id: c.cliente, object: 'customer', name: c.nombre, email: `admin@${c.dominio}`, created: Math.floor(c.alta / 1000), metadata: c.conCrmId ? { crm_company_id: c.crm } : {} })), '/v1/customers');
        if (ruta === '/v1/events') { let L = W.eventos.filter((e) => e.ts <= t); if (q['created[gte]']) L = L.filter((e) => e.ts >= Number(q['created[gte]']) * 1000); L = L.slice().reverse(); return lista(L.map((e) => ({ id: e.id, object: 'event', type: e.tipo, created: Math.floor(e.ts / 1000), data: { object: { id: e.sub, object: 'subscription', customer: e.cliente, status: e.datos.estado, plan: { id: `${e.datos.plan}_${e.datos.intervalo}`, interval: e.datos.intervalo === 'anual' ? 'year' : 'month', amount: Math.round((e.datos.intervalo === 'anual' ? e.datos.precio * 10 : e.datos.precio) * 100), currency: 'usd', nickname: PLANES[e.datos.plan].nombre }, quantity: e.datos.asientos, discount: e.datos.descuento ? { coupon: { id: 'BIENVENIDA20', percent_off: e.datos.descuento } } : null }, previous_attributes: e.previo } })), '/v1/events'); }
        if (ruta === '/v1/subscriptions') { const E = estadoSubsEn(t); return lista([...E.entries()].map(([c, x]) => ({ id: 'sub_' + c.slice(4), object: 'subscription', customer: c, status: x.estado, plan: { id: `${x.plan}_${x.intervalo}`, interval: x.intervalo === 'anual' ? 'year' : 'month', amount: Math.round((x.intervalo === 'anual' ? x.precio * 10 : x.precio) * 100), currency: 'usd' }, quantity: x.asientos, discount: x.descuento ? { coupon: { percent_off: x.descuento } } : null })), '/v1/subscriptions'); }
        return ERR(404, `Unrecognized request URL (GET: ${ruta}).`);
      }
      // ---------------- Medidor
      if (u.hostname === 'api.medidor.example') {
        const basic = (H.authorization || '').replace(/^Basic\s+/i, ''); let usuario = ''; try { usuario = atob(basic).split(':')[0]; } catch (e) { /* nada */ }
        if (usuario !== C.medidor) return ERR(401, 'Unauthorized: use HTTP Basic con el secreto del proyecto como usuario (y contraseña vacía).');
        if (ruta === '/api/2.0/export') {
          const d = q.from_date, h = q.to_date; if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '') || !/^\d{4}-\d{2}-\d{2}$/.test(h || '')) return ERR(400, 'from_date y to_date (AAAA-MM-DD) son obligatorios.');
          if (h < d) return ERR(400, 'to_date es anterior a from_date.'); if ((msDeDia(h) - msDeDia(d)) / DIA > 6) return ERR(400, 'El rango máximo de una exportación es de 7 días.');
          if (h >= diaLocal(t)) return ERR(400, 'Solo se exportan días completos (hasta ayer).');
          const out = []; for (let f = d; f <= h; f = sumarDias(f, 1)) out.push(...usoDelDia(f));
          return res(200, out.map((e) => JSON.stringify(e)).join('\n') + (out.length ? '\n' : ''));
        }
        if (ruta === '/api/2.0/users') return res(200, { results: usuarios().filter((x) => Date.parse(x.creado) <= t) });
        return ERR(404, `No existe ${ruta}.`);
      }
      return null;
    }
    const API = { esDeLaApi: (url) => /^https?:\/\/api\.(contactocrm|cobrable|medidor)\.example(\/|$|\?)/.test(String(url)), configurar(c) { const a = cfg.semilla + ':' + cfg.inicio; Object.assign(cfg, c || {}); if (a !== cfg.semilla + ':' + cfg.inicio) { cache = null; cacheUso.clear(); } }, request(m, url, h, b) { const hh = h && typeof h.toJs === 'function' ? h.toJs({ dict_converter: Object.fromEntries }) : h; return request(m, url, hh || {}, b); }, avanzar(s) { cfg.desfase += Math.max(0, Number(s) || 0) * 1000; }, tomarCambios() { const c = st.cambios; st.cambios = []; return c; } };
    const usuariosDe = (c, t) => { let n = 0; for (let k = 0; k < c.usuarios; k++) if (c.alta + k * DIA <= t) n++; return n; };
    const MUNDO = { cfg, ahora, hitos, usuariosDe, claves, mundo, estadoSubsEn, mrrDe, mrrMes, movimientos, crmEmpresas, usuarios, usoDelDia, mesDe, finDeMes, mesesAntes, diaLocal, inicioDiaLocal, msDeDia, sumarDias, VENDEDORES, PLANES, API };
    g.CuentasClarasApi = API; g.CuentasClarasMundo = MUNDO; return MUNDO;
  }
  const g = typeof window !== 'undefined' ? window : self;
  cuentasClarasFactory(g);
  g.CUENTAS_CLARAS_SRC = cuentasClarasFactory.toString();
  if (typeof window === 'undefined') return;

  const CC = window.CuentasClarasMundo;
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  function datos() { const S = almacen(); if (!S) return null; S.data.cuentas = S.data.cuentas || {}; const D = S.data.cuentas; if (!D.semilla) D.semilla = 1000 + Math.floor(Math.random() * 899000); if (!D.inicio) D.inicio = Date.now(); D.crm = D.crm || {}; return D; }
  function sincronizar() { const D = datos(); if (!D) return false; CC.API.configurar({ semilla: D.semilla, inicio: D.inicio, crm: D.crm }); return true; }
  function guardar() { try { almacen().save(); } catch (e) { /* lleno */ } }
  window.CuentasClarasHost = {
    datos, sincronizar, guardar,
    configParaWorker() { sincronizar(); return { semilla: CC.cfg.semilla, inicio: CC.cfg.inicio, crm: JSON.parse(JSON.stringify(CC.cfg.crm || {})) }; },
    // lo que el worker de Python escribió en el CRM (PATCH): se incorpora al estado guardado
    incorporar(cambios) { const D = datos(); if (!D || !Array.isArray(cambios)) return; for (const c of cambios) D.crm[c.id] = { ...(D.crm[c.id] || {}), ...Object.fromEntries(Object.entries(c.props || {}).map(([k, v]) => [k, String(v)])) }; sincronizar(); guardar(); },
  };
  // los PATCH que se hacen desde la página (curl) quedan en cfg.crm, que es el mismo objeto que D.crm
  const intento = setInterval(() => { if (sincronizar()) clearInterval(intento); }, 300);
  setInterval(() => { const c = CC.API.tomarCambios(); if (c.length) guardar(); }, 2000);
})();
