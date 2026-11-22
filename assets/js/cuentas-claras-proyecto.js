/* Cuentas Claras: revisión automática y tablero del equipo.
 * Lecciones: <div data-cc="revisar"></div>, <div data-cc="tablero"></div>.
 */
(function () {
  'use strict';
  const CC = window.CuentasClarasMundo, Host = window.CuentasClarasHost;
  if (!CC || !Host) return;
  const HORA = 3600000, DIA = 86400000;
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const lista = (xs, n = 4) => xs.slice(0, n).join(', ') + (xs.length > n ? ` y ${xs.length - n} más` : '');
  const ahora = () => CC.ahora(); const hoy = () => CC.diaLocal(ahora());
  const mesPasado = (t = ahora()) => CC.mesesAntes(CC.mesDe(t), 1);
  const ultimosMeses = (n) => Array.from({ length: n }, (_, k) => CC.mesesAntes(CC.mesDe(ahora()), n - k));

  // ---------------------------------------------------------------- la verdad
  function uso(fin) {
    const m = new Map(); const porU = new Map(CC.usuarios().map((u) => [u.user_id, u.billing_customer_id]));
    for (let k = 0; k < 30; k++) for (const e of CC.usoDelDia(CC.sumarDias(fin, -k))) { const c = porU.get(e.distinct_id); if (!c) continue; const x = m.get(c) || { activos: new Set(), facturas: 0 }; if (e.event === 'login') x.activos.add(e.distinct_id); if (e.event === 'factura_emitida' || e.event === 'invoice_created') x.facturas++; m.set(c, x); }
    return m;
  }
  const cacheUso = new Map();
  const usoCache = (fin) => { if (!cacheUso.has(fin)) cacheUso.set(fin, uso(fin)); return cacheUso.get(fin); };
  function clientes360(fin) {
    const E = CC.estadoSubsEn(ahora()); const U = usoCache(fin); const out = [];
    for (const c of CC.mundo().cuentas) { const st = E.get(c.cliente); const mrr = CC.mrrDe(st); if (mrr <= 0) continue; const u = U.get(c.cliente) || { activos: new Set(), facturas: 0 }; const activos = u.activos.size; out.push({ c, cliente: c.cliente, crm: c.crm, plan: st.plan, mrr, activos, facturas: u.facturas, health: Math.round(50 * activos / Math.max(1, CC.usuariosDe(c, ahora())) + 50 * Math.min(1, u.facturas / 60)) }); }
    return out;
  }
  const finVentanas = () => [CC.sumarDias(hoy(), -1), CC.sumarDias(hoy(), -2)];

  // ---------------------------------------------------------------- revisión
  const cargar = async (gr, listo) => { try { if (!listo() && window.__cargarGrupo) await window.__cargarGrupo(gr); } catch (e) { /* sin red */ } return listo(); };
  async function tabla(nombre) { try { if (!(await cargar('databricks', () => window.DBSQL))) throw new Error('No se pudo cargar Databricks'); await window.DBSQL.init({ Store: almacen() }); const r = await window.DBSQL.ejecutar(`SELECT * FROM ${nombre}`, { limite: 1e7 }); const u = Array.isArray(r) ? r[r.length - 1] : r; if (!u || u.error) throw new Error(u && u.error ? String(u.error.message || u.error) : 'sin resultado'); return { cols: (u.cols || []).map((c) => String(c).toLowerCase()), filas: u.filas || [] }; } catch (e) { return { error: e.message.split('\n')[0] }; } }
  const colDe = (T, ...n) => { for (const x of n) { const i = T.cols.indexOf(x); if (i >= 0) return i; } return -1; };
  const casi = (a, b, tol = 0.011) => Math.abs(Number(a) - Number(b)) <= tol;
  async function chequeoKV() { const kv = (window.CloudSim && window.CloudSim.az && window.CloudSim.az().kv) || {}; const C = CC.claves(); const vals = Object.values(kv).flatMap((V) => Object.values(V.secrets || {}).map((x) => (typeof x === 'string' ? x : x && x.value))); const faltan = [['CRM', C.crm], ['Cobrable', C.cobrable], ['Medidor', C.medidor]].filter(([, v]) => !vals.includes(v)).map((x) => x[0]); return !faltan.length || `Faltan en el Key Vault: ${faltan.join(', ')}.`; }
  async function chequeoMrr() {
    const T = await tabla('cc.gold.mrr_mensual'); if (T.error) return `No se pudo leer cc.gold.mrr_mensual: ${T.error}`;
    const ix = { c: colDe(T, 'cliente_id'), m: colDe(T, 'mes'), v: colDe(T, 'mrr'), mov: colDe(T, 'movimiento') }; if (Object.values(ix).some((i) => i < 0)) return 'La tabla necesita cliente_id, mes, mrr y movimiento.';
    const tuyo = new Map(T.filas.map((f) => [`${f[ix.c]}|${String(f[ix.m]).slice(0, 7)}`, f])); const mal = { falta: [], mrr: [], mov: [] }; let anual = 0, trial = 0, desc = 0;
    for (const mes of ultimosMeses(6)) for (const x of CC.movimientos(mes)) {
      const f = tuyo.get(`${x.cliente}|${mes}`); if (!f) { if (x.mrr > 0 || x.movimiento === 'churn') mal.falta.push(`${x.cliente} ${mes}`); continue; }
      if (!casi(f[ix.v], x.mrr)) { mal.mrr.push(`${x.cliente} ${mes} (${f[ix.v]} vs ${x.mrr})`); const st = CC.estadoSubsEn(CC.finDeMes(mes)).get(x.cliente) || {}; if (st.intervalo === 'anual' && casi(f[ix.v], x.mrr * 12)) anual++; if (st.descuento && casi(f[ix.v], x.mrr / (1 - st.descuento / 100))) desc++; }
      else if (String(f[ix.mov]) !== x.movimiento) { mal.mov.push(`${x.cliente} ${mes} (${f[ix.mov]} vs ${x.movimiento})`); if (x.movimiento === 'reactivacion' && String(f[ix.mov]) === 'nuevo') trial++; }
    }
    const m = [];
    if (mal.falta.length) m.push(`faltan ${mal.falta.length} filas (${lista(mal.falta, 3)})`);
    if (mal.mrr.length) m.push(`${mal.mrr.length} con otro MRR (${lista(mal.mrr, 3)})${anual ? ' — los planes anuales se cobran por año: el MRR es el precio anual / 12' : ''}${desc ? ' — el descuento del cupón baja el MRR mientras está vigente' : ''}`);
    if (mal.mov.length) m.push(`${mal.mov.length} con otro movimiento (${lista(mal.mov, 3)})${trial ? ' — un cliente que vuelve después de una baja es reactivación, no nuevo' : ''}`);
    return !m.length || m.join(' · ');
  }
  async function chequeo360() {
    const T = await tabla('cc.gold.cliente_360'); if (T.error) return `No se pudo leer cc.gold.cliente_360: ${T.error}`;
    const ix = { c: colDe(T, 'billing_customer_id'), crm: colDe(T, 'crm_company_id'), mrr: colDe(T, 'mrr_actual'), a: colDe(T, 'usuarios_activos_30d'), f: colDe(T, 'facturas_30d'), h: colDe(T, 'health_score') };
    const falta = Object.entries(ix).filter(([, i]) => i < 0).map(([k]) => ({ c: 'billing_customer_id', crm: 'crm_company_id', mrr: 'mrr_actual', a: 'usuarios_activos_30d', f: 'facturas_30d', h: 'health_score' }[k])); if (falta.length) return `Faltan columnas: ${falta.join(', ')}.`;
    const tuyo = new Map(T.filas.map((f) => [String(f[ix.c]), f])); const [f1, f2] = finVentanas(); const V1 = clientes360(f1), V2 = new Map(clientes360(f2).map((x) => [x.cliente, x]));
    const mal = { falta: [], crm: [], mrr: [], uso: [], h: [] }; let dup = 0, renombre = 0;
    for (const x of V1) {
      const f = tuyo.get(x.cliente); if (!f) { mal.falta.push(x.cliente); continue; }
      if (String(f[ix.crm]) !== x.crm) { mal.crm.push(x.cliente); if (x.c.crmDup && String(f[ix.crm]) === x.c.crmDup) dup++; }
      if (!casi(f[ix.mrr], x.mrr)) mal.mrr.push(x.cliente);
      const y = V2.get(x.cliente) || x; const okUso = (Number(f[ix.a]) === x.activos && Number(f[ix.f]) === x.facturas) || (Number(f[ix.a]) === y.activos && Number(f[ix.f]) === y.facturas);
      if (!okUso) { mal.uso.push(x.cliente); if (Number(f[ix.f]) < x.facturas && Number(f[ix.f]) < y.facturas) renombre++; }
      else if (Math.abs(Number(f[ix.h]) - x.health) > 1 && Math.abs(Number(f[ix.h]) - y.health) > 1) mal.h.push(x.cliente);
    }
    const sobran = [...tuyo.keys()].filter((c) => !V1.some((x) => x.cliente === c));
    const m = [];
    if (mal.falta.length) m.push(`faltan ${mal.falta.length} clientes que hoy pagan (${lista(mal.falta, 3)})`);
    if (sobran.length) m.push(`sobran ${sobran.length} (${lista(sobran, 3)}): ¿clientes en prueba gratis o dados de baja? (MRR 0)`);
    if (mal.crm.length) m.push(`${mal.crm.length} con otra empresa del CRM${dup ? ` — ${dup} apuntan al registro duplicado (lead, creado después, nombre en mayúsculas), no al principal` : ' — no todos los clientes de Cobrable tienen metadata.crm_company_id: el resto se une por dominio (normalizado: sin www, en minúsculas)'}`);
    if (mal.mrr.length) m.push(`${mal.mrr.length} con otro mrr_actual`);
    if (mal.uso.length) m.push(`${mal.uso.length} con otros usuarios activos o facturas${renombre ? ' — desde la versión 5.0 de la app móvil el evento se llama invoice_created' : ' — ventana de los últimos 30 días cerrados; usuarios activos = los que hicieron login'}`);
    if (mal.h.length) m.push(`${mal.h.length} con otro health_score (la fórmula está en Fuentes y accesos)`);
    return !m.length || m.join(' · ');
  }
  async function chequeoReverse() {
    Host.sincronizar(); const props = CC.cfg.crm || {}; const [f1, f2] = finVentanas(); const V1 = clientes360(f1); const V2 = new Map(clientes360(f2).map((x) => [x.cliente, x]));
    const sin = [], malH = [], malM = []; let enDup = 0;
    for (const x of V1) { const p = props[x.crm] || {}; if (x.c.crmDup && props[x.c.crmDup] && props[x.c.crmDup].health_score != null) enDup++; if (p.health_score == null) { sin.push(x.crm); continue; } const y = V2.get(x.cliente) || x; if (Math.abs(Number(p.health_score) - x.health) > 1 && Math.abs(Number(p.health_score) - y.health) > 1) malH.push(x.crm); if (!casi(p.mrr_actual, x.mrr)) malM.push(x.crm); }
    const m = [];
    if (sin.length) m.push(`${sin.length} empresas del CRM (de clientes que pagan) sin health_score (${lista(sin, 3)})${enDup ? ` — ${enDup} los escribiste en el registro duplicado` : ''}`);
    if (malH.length) m.push(`${malH.length} con otro health_score que el de cliente_360`);
    if (malM.length) m.push(`${malM.length} con otro mrr_actual (o sin mrr_actual)`);
    return !m.length || m.join(' · ');
  }
  const CHEQUEOS = [['Seguridad', 'Las tres credenciales en un Key Vault', chequeoKV], ['MRR', 'cc.gold.mrr_mensual: MRR y movimiento por cliente, últimos 6 meses cerrados', chequeoMrr], ['Cliente 360', 'cc.gold.cliente_360: CRM + facturación + uso, por cliente que paga', chequeo360]];

  // ---------------------------------------------------------------- tablero
  const totalMrr = (mes) => Math.round([...CC.mrrMes(mes).values()].reduce((a, b) => a + b, 0) * 100) / 100;
  const TICKETS = [
    { id: 'CC-101', tipo: 'requerimiento', de: 'Andrea Molina · CFO', cuando: (I) => I, titulo: 'MRR mensual por movimiento', texto: 'Para el directorio necesito el MRR de cada mes y de dónde viene el cambio: clientes nuevos, expansión, contracción, bajas y reactivaciones. Por cliente, para poder auditarlo.', criterios: ['cc.gold.mrr_mensual: cliente_id, mes, mrr, movimiento (últimos 6 meses cerrados)'], check: chequeoMrr },
    { id: 'CC-102', tipo: 'requerimiento', de: 'Customer Success', cuando: (I) => I, titulo: 'Una vista 360 de cada cliente', texto: 'Hoy miramos tres sistemas para saber cómo está un cliente. Queremos una tabla con todo: empresa del CRM, plan y MRR, uso del producto y un health score.', criterios: ['cc.gold.cliente_360 con todos los clientes que hoy pagan'], check: chequeo360 },
    { id: 'CC-103', tipo: 'requerimiento', de: 'Seguridad', cuando: (I) => I, titulo: 'Credenciales en el Key Vault', texto: 'El token del CRM, la clave de Cobrable y el secreto de Medidor, al Key Vault.', criterios: ['Las tres en un Key Vault'], check: chequeoKV },
    { id: 'CC-104', tipo: 'pregunta', de: 'Andrea Molina · CFO', cuando: (I) => I + 10 * HORA, titulo: '¿Cuál fue el MRR del mes pasado?', texto: (T) => `¿Cuál fue el MRR total al cierre de ${mesPasado(T)}? En dólares, con dos decimales.`, comentarios: ['Andrea: MRR = ingresos recurrentes mensuales normalizados: los anuales divididos por 12, con los descuentos vigentes, sin las pruebas gratis. Morosos (past_due) cuentan hasta que se dan de baja.'],
      respuesta: { tipo: 'numero', unidad: 'USD', verificar: (v, T) => { const x = totalMrr(mesPasado(T)); return Math.abs(v - x) <= 1 || 'No coincide. Estado de cada suscripción al cierre del mes (hora local), precio mensual normalizado × asientos × (1 − descuento).'; } } },
    { id: 'CC-105', tipo: 'pregunta', de: 'Andrea Molina · CFO', cuando: (I) => I + DIA + 9 * HORA, titulo: '¿Cuánto MRR perdimos por bajas?', texto: (T) => `¿Qué porcentaje del MRR de inicio de ${mesPasado(T)} se perdió por bajas (churn) en ese mes? Con un decimal.`, comentarios: ['Andrea: solo las bajas completas, no las contracciones. Sobre el MRR al cierre del mes anterior.'],
      respuesta: { tipo: 'numero', unidad: '%', verificar: (v, T) => { const mes = mesPasado(T); const base = totalMrr(CC.mesesAntes(mes, 1)); const perd = CC.movimientos(mes).filter((x) => x.movimiento === 'churn').reduce((a, x) => a + x.mrr_anterior, 0); const r = Math.round(perd / base * 1000) / 10; return Math.abs(v - r) <= 0.15 || 'No coincide. MRR anterior de los clientes con movimiento churn ese mes, sobre el MRR total al cierre del mes anterior.'; } } },
    { id: 'CC-106', tipo: 'incidente', de: 'Customer Success', cuando: (I, H) => H.renombre + DIA + 3 * HORA, titulo: 'El uso del producto cayó 40 % desde ayer', texto: 'Los health scores bajaron de golpe y varios clientes aparecen "en riesgo". Hablamos con dos y usan el producto como siempre.', comentarios: ['Mobile (Slack): ayer salió la 5.0 de la app de Android. Renombramos eventos al nuevo plan de tracking, está en el changelog interno.'], criterios: ['cliente_360 con las facturas de la app móvil contadas (con el nombre viejo y el nuevo)', 'Postmortem: qué alerta te hubiera avisado (por ejemplo, caída de volumen de un evento)'], check: async () => { const r = await chequeo360(); return r === true || !/invoice_created|facturas/.test(r) || r; } },
    { id: 'CC-107', tipo: 'incidente', de: 'Ventas', cuando: (I, H) => H.fusion + 2 * HORA, titulo: 'Fusionamos las empresas duplicadas del CRM', texto: 'Limpiamos el CRM: los duplicados quedaron fusionados en la empresa principal (el duplicado queda archivado). Avisamos por las dudas.', comentarios: ['Tú: ¿y los ids que teníamos guardados de los duplicados?', 'Ventas: quedan archivados con mergedInto apuntando al principal.'], criterios: ['El reverse ETL escribe solo en empresas principales (ninguna archivada)', 'cliente_360 apunta a la empresa principal'], check: async () => { const r = await chequeoReverse(); if (r !== true) return r; return chequeo360(); } },
    { id: 'CC-108', tipo: 'requerimiento', de: 'Ventas', cuando: (I) => I + DIA + 10 * HORA, titulo: 'Queremos el health score en el CRM', texto: 'Vivimos en el CRM. Escriban health_score, mrr_actual y plan_actual en la empresa de cada cliente que paga, todos los días.', comentarios: ['Plataforma: la API del CRM permite 100 pedidos cada 10 segundos. Respeten el 429.'], criterios: ['health_score y mrr_actual en la empresa principal de cada cliente que paga (iguales a cliente_360)'], check: chequeoReverse },
    { id: 'CC-109', tipo: 'pregunta', de: 'Customer Success', cuando: (I) => I + 2 * DIA + 10 * HORA, titulo: '¿Quién paga y no usa?', texto: 'Vamos a llamar a los clientes en riesgo: ¿cuántos clientes que hoy pagan no emitieron ninguna factura en los últimos 30 días cerrados?', comentarios: ['CS: facturas emitidas desde cualquier plataforma (web y app).'], respuesta: { tipo: 'numero', unidad: 'clientes', verificar: (v) => { const [f1, f2] = finVentanas(); const n1 = clientes360(f1).filter((x) => x.facturas === 0).length; const n2 = clientes360(f2).filter((x) => x.facturas === 0).length; return v === n1 || v === n2 || 'No coincide. ¿Contaste también invoice_created (la app móvil 5.0)?'; } } },
    { id: 'CC-110', tipo: 'pregunta', de: 'Andrea Molina · CFO', cuando: (I) => I + 2 * DIA + 14 * HORA, titulo: '¿Qué vendedor tiene más MRR?', texto: 'Para las comisiones: ¿qué vendedor tiene hoy más MRR en su cartera? (el dueño de la empresa en el CRM)', comentarios: ['Andrea: la empresa principal, no los duplicados.'], respuesta: { tipo: 'texto', ayuda: 'El nombre del vendedor', verificar: (v) => { const m = {}; for (const x of clientes360(finVentanas()[0])) m[x.c.vendedor] = (m[x.c.vendedor] || 0) + x.mrr; const max = Math.max(...Object.values(m)); return Object.keys(m).filter((k) => m[k] === max).some((k) => { const n = CC.VENDEDORES.find((x) => x.id === k).nombre; return norm(n) === norm(v) || norm(v) === k; }) || 'No es el de más MRR. Dueño (hubspot_owner_id) de la empresa principal × MRR actual.'; } } },
    { id: 'CC-111', tipo: 'pregunta', de: 'Producto', cuando: (I, H) => H.precioPro + DIA + 9 * HORA, titulo: '¿Cuántos entraron con el precio nuevo?', texto: (T, H) => `Desde que subimos el plan Pro a 89 USD (${CC.diaLocal(H.precioPro)}), ¿cuántas suscripciones pasaron a Pro (altas o cambios de plan) con el precio nuevo hasta ayer inclusive?`, respuesta: { tipo: 'numero', unidad: 'suscripciones', verificar: (v, T, H) => { const fin = CC.msDeDia(CC.diaLocal(T)); const n = new Set(CC.mundo().eventos.filter((e) => e.ts >= H.precioPro && e.ts < fin && e.datos.plan === 'pro' && e.datos.precio === 89 && (!e.previo || e.previo.plan)).map((e) => e.sub)).size; return v === n || 'No coincide. Eventos de alta o de cambio a Pro (previous_attributes con plan) con precio 89 en ese período.'; } } },
    { id: 'CC-112', tipo: 'requerimiento', de: 'Andrea Molina · CFO', cuando: (I) => I + 2 * DIA + 9 * HORA, titulo: 'El MRR en Power BI', texto: 'El directorio quiere ver la evolución del MRR por movimiento en Power BI.', criterios: ['cc.gold.mrr_mensual correcta (CC-101)', 'Un informe de Power BI que la importe desde Databricks'], check: async () => { const r = await chequeoMrr(); if (r !== true) return r; const c = (almacen() && almacen().data.cruces) || {}; return c.pbiDatabricks ? true : 'Falta el informe (Power BI → Obtener datos → Azure Databricks → cc.gold.mrr_mensual).'; } },
  ];
  // la misma cola de tickets se ve en el tablero de la lección y en Jira (proyecto CC), que es donde trabaja el equipo
  const cfgTablero = () => ({ titulo: 'Tablero del equipo de datos de Cuentas Claras', tickets: TICKETS, contexto: () => { Host.sincronizar(); return { I: CC.inicioDiaLocal(CC.cfg.inicio), H: CC.hitos(), t: ahora() }; }, datos: () => Host.datos(), guardar: () => Host.guardar(), hora: (T) => new Date(T - 3 * HORA).toISOString().replace('T', ' ').slice(0, 16) });
  (window.__tableros = window.__tableros || []).push({ clave: 'CC', nombre: 'Cuentas Claras', modulo: 'proyecto-cuentas-claras', cfg: cfgTablero, chequeos: () => (typeof CHEQUEOS !== 'undefined' ? CHEQUEOS : []) });
  function panelTablero(el) { if (!window.TableroTickets) { setTimeout(() => panelTablero(el), 300); return; } window.TableroTickets.panel(el, cfgTablero()); }
  function panelRevisar(el) {
    el.innerHTML = `<div class="card mv-panel"><h3 style="margin-top:0;font-size:1.05em">🔎 Revisar mi entrega</h3><p class="small muted">Compara tus tablas con la facturación, el CRM y el uso real.</p><button class="btn btn-primary btn-sm" data-revisar>Revisar ahora</button><ol class="pedalia-chequeos"></ol></div>`;
    const ol = el.querySelector('ol');
    el.querySelector('[data-revisar]').addEventListener('click', async (ev) => { const b = ev.currentTarget; b.disabled = true; b.textContent = 'Revisando…'; ol.innerHTML = ''; Host.sincronizar(); let bien = 0; for (const [gr, txt, f] of CHEQUEOS) { const li = document.createElement('li'); ol.append(li); let r; try { r = await f(); } catch (e) { r = String(e.message || e); } if (r === true) bien++; li.className = r === true ? 'ok' : 'falta'; li.innerHTML = `${r === true ? '✅' : '⬜'} <b>${esc(gr)}</b> · ${esc(txt)}${r === true ? '' : `<div class="small muted">${esc(r)}</div>`}`; } b.disabled = false; b.textContent = `Revisar de nuevo (${bien} de ${CHEQUEOS.length})`; });
  }
  function montar(root) { (root || document).querySelectorAll('[data-cc]').forEach((el) => { if (el.dataset.montado) return; el.dataset.montado = '1'; if (el.dataset.cc === 'revisar') panelRevisar(el); else if (el.dataset.cc === 'tablero') panelTablero(el); }); }
  if (window.Shell && window.Shell.def) window.Shell.def('cuentas', 'Cuentas Claras (proyecto 5): cuentas accesos', (a) => { Host.sincronizar(); const C = CC.claves(); if (a[0] !== 'accesos') return window.Shell.ok('cuentas accesos   credenciales del CRM, de Cobrable y de Medidor'); return window.Shell.ok(`Contacto CRM   https://api.contactocrm.example   Authorization: Bearer ${C.crm}\n               (app privada con permisos de lectura y de escritura de empresas)\nCobrable       https://api.cobrable.example      Authorization: Bearer ${C.cobrable}   (solo lectura)\nMedidor        https://api.medidor.example       HTTP Basic: usuario = ${C.medidor}, contraseña vacía`); });
  window.CuentasClarasProyecto = { montar, CHEQUEOS, TICKETS, verdad: { clientes360, totalMrr, uso, finVentanas } };
})();
