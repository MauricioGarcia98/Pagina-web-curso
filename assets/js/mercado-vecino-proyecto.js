/* Mercado Vecino: paneles del proyecto (accesos, estado de las fuentes) y la revisión automática.
 *
 * Lecciones: <div data-mercado="accesos"></div>, <div data-mercado="fuentes"></div>, <div data-mercado="revisar"></div>.
 * La revisión lee las tablas que armaste en el Databricks de práctica y las compara con lo que tiene que dar:
 *  - mercado.silver.pedidos: el estado de la base en el último cambio que aplicaste (_lsn), ni antes ni después.
 *  - mercado.silver.clientes: con el derecho al olvido aplicado.
 *  - mercado.silver.pagoya_eventos: un evento por id, sin los falsos ni las repeticiones.
 *  - mercado.gold.conciliacion: un registro por pago aprobado en días cerrados, con su categoría y su liquidación.
 */
(function () {
  'use strict';
  const MV = window.MercadoVecinoMundo, Host = window.MercadoVecinoHost;
  if (!MV || !Host) return;
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const HORA = 3600000;

  // ---------------------------------------------------------------- panel: el correo de accesos
  function panelAccesos(el) {
    Host.sincronizar(); const C = MV.claves();
    const fila = (k, v, secreto) => `<tr><td class="small muted" style="white-space:nowrap">${esc(k)}</td><td><code class="mv-valor" data-secreto="${secreto ? 1 : 0}">${esc(secreto ? '••••••••••••' : v)}</code> <button class="btn btn-ghost btn-sm" data-copiar="${esc(v)}" title="Copiar">⧉</button>${secreto ? ` <button class="btn btn-ghost btn-sm" data-ver="${esc(v)}">ver</button>` : ''}</td></tr>`;
    el.innerHTML = `<div class="card mv-panel"><h3 style="margin-top:0;font-size:1.05em">✉️ Accesos para el equipo de datos</h3>
      <p class="small muted">De: plataforma@mercadovecino.example · Credenciales de prueba, generadas solo para ti (otra persona tiene otras). En un trabajo real esto no se pega en el código: va al Key Vault. También las ves en la terminal con <code>mercado accesos</code>.</p>
      <table class="tabla-mini"><tbody>
        <tr><th colspan="2">Base operacional · réplica de solo lectura (PostgreSQL 16)</th></tr>
        ${fila('host', C.pg.host)}${fila('puerto / base', `${C.pg.puerto} / ${C.pg.base}`)}${fila('usuario', C.pg.usuario)}${fila('clave', C.pg.clave, true)}
        <tr><th colspan="2">CDC · Debezium → Event Hubs (protocolo Kafka)</th></tr>
        ${fila('broker', C.eh.broker)}${fila('usuario SASL', '$ConnectionString')}${fila('clave (cadena de conexión)', C.eh.cs, true)}
        <tr><th colspan="2">PagoYa · pasarela de pagos (modo prueba)</th></tr>
        ${fila('API', 'https://api.pagoya.example/v1')}${fila('clave secreta', C.pagoya, true)}${fila('secreto de firma de webhooks', C.webhook, true)}
      </tbody></table></div>`;
    el.querySelectorAll('[data-copiar]').forEach((b) => b.addEventListener('click', () => { try { navigator.clipboard.writeText(b.dataset.copiar); b.textContent = '✓'; setTimeout(() => { b.textContent = '⧉'; }, 1200); } catch (e) { /* sin portapapeles */ } }));
    el.querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => { const c = b.parentElement.querySelector('.mv-valor'); const ver = c.dataset.secreto === '1'; c.textContent = ver ? b.dataset.ver : '••••••••••••'; c.dataset.secreto = ver ? '0' : '1'; b.textContent = ver ? 'ocultar' : 'ver'; }));
  }

  // ---------------------------------------------------------------- panel: cómo están las fuentes ahora
  function panelFuentes(el) {
    const pintar = () => {
      Host.sincronizar(); const t = MV.ahora(); const { est } = MV.estadoEn(t);
      const D = Host.datos() || {}; const W = D.webhook;
      const temas = MV.kafkaTemas(t); const liq = MV.liquidaciones(t)[0];
      const hoy = MV.diaLocal(t); const pedHoy = [...est.pedidos.values()].filter((p) => MV.diaLocal(p.creado_en) === hoy).length;
      const grupos = Object.entries(D.grupos || {});
      el.innerHTML = `<div class="card mv-panel"><h3 style="margin-top:0;font-size:1.05em">📡 Las fuentes, ahora mismo</h3>
        <p class="small muted">Hora de la tienda: <b>${esc(MV.tsSql(t - 3 * HORA).slice(0, 16))}</b> (Ciudad del Río, UTC-3) · se actualiza sola cada 30 segundos.</p>
        <div class="mv-grilla">
          <div><b>🐘 Base</b><br><span class="small">${est.pedidos.size} pedidos (${pedHoy} hoy) · ${est.clientes.size} clientes</span></div>
          <div><b>🔁 CDC</b><br><span class="small">${temas.filter((x) => x.alto > x.bajo).map((x) => `${esc(x.tabla)}: offsets ${x.bajo}–${x.alto - 1}`).join('<br>') || 'sin mensajes en las últimas 24 h'}</span>${grupos.length ? `<br><span class="small muted">Tus grupos: ${grupos.map(([g, o]) => `${esc(g)} (${Object.entries(o).map(([tp, off]) => `${esc(tp.replace('mv_prod.public.', ''))}@${off}`).join(', ')})`).join(' · ')}</span>` : ''}</div>
          <div><b>💳 PagoYa</b><br><span class="small">Última liquidación: ${liq ? `${esc(liq.fecha)} (${liq.lineas} líneas, neto ${MV.pesos(liq.neto)})` : 'ninguna todavía'}<br>Webhooks del equipo de datos: ${W ? `${W.pausado ? 'pausado' : 'activo'} → ${esc(W.cuenta)}/${esc(W.contenedor)}/${esc(W.prefijo)} · ${W.recibidas || 0} entregas${W.error ? ` · <span style="color:var(--danger,#c00)">${esc(W.error)}</span>` : ''}` : 'sin configurar (<code>pagoya webhooks configurar</code>)'}</span></div>
        </div></div>`;
    };
    pintar();
    const iv = setInterval(() => { if (!document.body.contains(el)) return clearInterval(iv); pintar(); }, 30000);
  }

  // ---------------------------------------------------------------- revisión automática
  const cargar = async (g, listo) => { try { if (!listo() && window.__cargarGrupo) await window.__cargarGrupo(g); } catch (e) { /* sin red */ } return listo(); };
  async function consulta(sql) {
    if (!(await cargar('databricks', () => window.DBSQL))) throw new Error('No se pudo cargar Databricks');
    await window.DBSQL.init({ Store: almacen() });
    const r = await window.DBSQL.ejecutar(sql, { limite: 1e7 });
    const u = Array.isArray(r) ? r[r.length - 1] : r;
    if (!u || u.error) throw new Error(u && u.error ? String(u.error.message || u.error) : 'sin resultado');
    return { cols: (u.cols || u.columns || []).map((c) => String(c).toLowerCase()), filas: u.filas || u.values || [] };
  }
  async function tabla(nombre) { try { return await consulta(`SELECT * FROM ${nombre}`); } catch (e) { return { error: e.message.split('\n')[0] }; } }
  const colDe = (T, ...nombres) => { for (const n of nombres) { const i = T.cols.indexOf(n); if (i >= 0) return i; } return -1; };
  const num = (x) => (x == null || x === '' ? null : Number(x));
  const fechaTxt = (x) => (x == null ? null : String(x).slice(0, 10));
  const lista = (xs, n = 5) => xs.slice(0, n).join(', ') + (xs.length > n ? ` y ${xs.length - n} más` : '');

  const CHEQUEOS = [
    ['Seguridad', 'Las credenciales están en un Key Vault (no en el código)', async () => {
      const kv = (window.CloudSim && window.CloudSim.az && window.CloudSim.az().kv) || {}; const C = MV.claves();
      const valores = [C.pg.clave, C.eh.cs, C.pagoya, C.webhook];
      const mejor = Object.entries(kv).map(([n, V]) => [n, valores.filter((v) => Object.values(V.secrets || {}).some((s) => (typeof s === 'string' ? s : s && s.value) === v)).length]).sort((a, b) => b[1] - a[1])[0];
      return (mejor && mejor[1] >= 3) || `Crea un Key Vault en el portal de Azure y guarda como secretos al menos tres de las cuatro credenciales (clave de la base, cadena de conexión del Event Hubs, clave de PagoYa, secreto de firma).${mejor ? ` En ${mejor[0]} hay ${mejor[1]}.` : ''}`;
    }],
    ['PagoYa', 'El endpoint de webhooks del equipo de datos escribe en el lago', async () => {
      const D = Host.datos(); const W = D && D.webhook; if (!W) return 'En la terminal: pagoya webhooks configurar --cuenta <tu cuenta del lago>';
      if (window.MercadoVecinoTerminal) window.MercadoVecinoTerminal.sincronizarWebhooks();
      if (W.error) return W.error;
      const A = (window.CloudSim.az().storage || {})[W.cuenta]; const C = A && A.containers[W.contenedor];
      const n = C ? Object.keys(C.blobs || {}).filter((b) => b.startsWith(W.prefijo + '/')).length : 0;
      return n > 0 || 'Todavía no llegó ninguna entrega. Los webhooks llegan cuando pasa algo en la tienda: espera unos minutos y vuelve a revisar.';
    }],
    ['Base + CDC', 'mercado.silver.pedidos refleja la base en el último cambio que aplicaste', async () => {
      const T = await tabla('mercado.silver.pedidos'); if (T.error) return `No se pudo leer mercado.silver.pedidos: ${T.error}`;
      const iId = colDe(T, 'pedido_id', 'id'), iEst = colDe(T, 'estado'), iTot = colDe(T, 'total'), iL = colDe(T, '_lsn');
      if (iId < 0 || iEst < 0 || iTot < 0) return `Faltan columnas: la tabla necesita pedido_id, estado, total y _lsn (tiene ${T.cols.join(', ')}).`;
      if (iL < 0) return 'Falta la columna _lsn: guarda en cada fila el source.lsn del último cambio aplicado (0 si vino del snapshot). Así se sabe hasta dónde llegaste.';
      if (!T.filas.length) return 'La tabla está vacía.';
      const L = Math.max(...T.filas.map((f) => num(f[iL]) || 0));
      if (!L) return 'Ninguna fila tiene _lsn: cargaste el snapshot pero todavía no aplicaste el CDC.';
      const ids = T.filas.map((f) => num(f[iId])); if (new Set(ids).size !== ids.length) return `Hay pedidos repetidos (${ids.length} filas, ${new Set(ids).size} pedidos). Un MERGE por pedido_id deja uno por pedido; si aplicas varios cambios del mismo pedido juntos, quédate con el de mayor lsn.`;
      const { est } = MV.estadoEnLsn(L); const V = est.pedidos;
      const tuyo = new Map(T.filas.map((f) => [num(f[iId]), f]));
      const faltan = [...V.keys()].filter((id) => !tuyo.has(id)), sobran = [...tuyo.keys()].filter((id) => !V.has(id));
      const estadoMal = [], totalMal = []; const W = MV.mundo();
      for (const [id, f] of tuyo) { const v = V.get(id); if (!v) continue; if (String(f[iEst]) !== v.estado) estadoMal.push(id); if (Math.abs(num(f[iTot]) - v.total / 100) > 0.005) totalMal.push(id); }
      if (!faltan.length && !sobran.length && !estadoMal.length && !totalMal.length) return true;
      const borrados = new Set(W.cambios.filter((c) => c.tabla === 'pedidos' && c.op === 'd' && c.lsn <= L).map((c) => c.id));
      const sinFecha = new Set(W.cambios.filter((c) => c.tabla === 'pedidos' && c.op === 'u' && c.lsn <= L && c.despues.estado === 'cancelado' && c.antes.actualizado_en === c.despues.actualizado_en).map((c) => c.id));
      const D = Host.datos(); const msgs = [`Comparado con la base en el lsn ${L}:`];
      if (faltan.length) msgs.push(`faltan ${faltan.length} pedidos (${lista(faltan)})${faltan.every((id) => id <= W.n0) ? ' — son de antes de PagoYa: ¿el snapshot filtró por proveedor_pago o por fecha?' : ''}`);
      if (sobran.length) msgs.push(`sobran ${sobran.length} (${lista(sobran)})${sobran.some((id) => borrados.has(id)) ? ` — ${sobran.filter((id) => borrados.has(id)).length} se borraron en la base (op = 'd'): un borrado físico solo aparece en el CDC, aplícalo con WHEN MATCHED AND op = 'd' THEN DELETE` : ''}`);
      if (estadoMal.length) { const bo = estadoMal.filter((id) => sinFecha.has(id)); msgs.push(`${estadoMal.length} con otro estado (${lista(estadoMal)})${bo.length ? ` — ${bo.length} son cancelaciones del backoffice: ese cambio NO actualiza actualizado_en, así que una carga incremental por actualizado_en no lo ve; el CDC sí` : ''}`); }
      if (totalMal.length) msgs.push(`${totalMal.length} con otro total (${lista(totalMal)}) — ¿aplicaste los cambios en orden de lsn? (el cliente sacó un producto antes de pagar)`);
      if (D && D.perdioCdc) msgs.push(`ojo: en algún momento tu grupo de consumo se quedó atrás y la retención de 24 h borró ${D.perdioCdc} mensajes. Con un hueco así hay que volver a hacer el snapshot y retomar desde ahí`);
      return msgs.join(' · ');
    }],
    ['Base + CDC', 'mercado.silver.clientes aplica el derecho al olvido', async () => {
      const T = await tabla('mercado.silver.clientes'); if (T.error) return `No se pudo leer mercado.silver.clientes: ${T.error}`;
      const iId = colDe(T, 'cliente_id', 'id'), iMail = colDe(T, 'email'), iL = colDe(T, '_lsn');
      if (iId < 0 || iMail < 0 || iL < 0) return `La tabla necesita cliente_id, email y _lsn (tiene ${T.cols.join(', ')}).`;
      const L = Math.max(0, ...T.filas.map((f) => num(f[iL]) || 0)); if (!L) return 'Ninguna fila tiene _lsn: aplica el CDC de mv_prod.public.clientes.';
      const V = MV.estadoEnLsn(L).est.clientes; const tuyo = new Map(T.filas.map((f) => [num(f[iId]), f]));
      const conMail = [...V.values()].filter((c) => c.email == null && tuyo.has(c.id) && tuyo.get(c.id)[iMail] != null).map((c) => c.id);
      const faltan = [...V.keys()].filter((id) => !tuyo.has(id));
      if (conMail.length) return `${conMail.length} clientes pidieron que se borren sus datos y en tu tabla siguen con email (${lista(conMail)}). En la base quedan como nombre '(eliminado)' y email NULL: el UPDATE tiene que llegar a silver (y a cualquier copia).`;
      if (faltan.length) return `Faltan ${faltan.length} clientes que existen en la base en el lsn ${L} (${lista(faltan)}).`;
      return true;
    }],
    ['PagoYa', 'mercado.silver.pagoya_eventos: un registro por evento, sin falsos ni repetidos', async () => {
      const T = await tabla('mercado.silver.pagoya_eventos'); if (T.error) return `No se pudo leer mercado.silver.pagoya_eventos: ${T.error}`;
      const iId = colDe(T, 'evento_id', 'id'), iTipo = colDe(T, 'tipo'); if (iId < 0 || iTipo < 0) return `La tabla necesita evento_id y tipo (tiene ${T.cols.join(', ')}).`;
      const ids = T.filas.map((f) => String(f[iId])); const unicos = new Set(ids);
      if (unicos.size !== ids.length) return `Hay eventos repetidos: ${ids.length} filas y ${unicos.size} evento_id distintos. PagoYa entrega "al menos una vez": deduplica por evento_id.`;
      const t = MV.ahora(); const reales = new Map(MV.eventosHasta(t).map((e) => [e.id, e]));
      const falsos = [...unicos].filter((id) => !reales.has(id));
      if (falsos.length) return `${falsos.length} eventos no existen en PagoYa (${lista(falsos, 3)}): llegaron al endpoint con una firma que no valida. Verifica PagoYa-Signature con HMAC-SHA256 sobre "t.cuerpo" antes de usar una entrega.`;
      const TIPOS = ['pago.aprobado', 'reembolso.creado', 'disputa.abierta', 'disputa.cerrada'];
      const hoy0 = MV.msDeDia(MV.diaLocal(t));
      const esperados = MV.eventosHasta(t).filter((e) => TIPOS.includes(e.tipo) && e.ts < hoy0);
      const faltan = esperados.filter((e) => !unicos.has(e.id));
      if (faltan.length) { const D = Host.datos(); const alta = D && D.webhook && D.webhook.alta; const antes = alta ? faltan.filter((e) => e.ts < alta).length : 0; return `Faltan ${faltan.length} de ${esperados.length} eventos (${TIPOS.join(', ')}) de los días cerrados${antes ? ` — ${antes} son de antes de que existiera tu endpoint: tráelos con la API (GET /v1/eventos, paginando con despues_de)` : ''}.`; }
      return true;
    }],
    ['Conciliación', 'mercado.gold.conciliacion: cada pago aprobado de los días cerrados, con su categoría y su liquidación', async () => {
      const T = await tabla('mercado.gold.conciliacion'); if (T.error) return `No se pudo leer mercado.gold.conciliacion: ${T.error}`;
      const ix = { pago: colDe(T, 'pago_id'), pedido: colDe(T, 'pedido_id'), fecha: colDe(T, 'fecha'), monto: colDe(T, 'monto'), cat: colDe(T, 'categoria'), liq: colDe(T, 'liquidado_el') };
      const falta = Object.entries(ix).filter(([, i]) => i < 0).map(([k]) => ({ pago: 'pago_id', pedido: 'pedido_id', fecha: 'fecha', monto: 'monto', cat: 'categoria', liq: 'liquidado_el' }[k]));
      if (falta.length) return `Faltan columnas: ${falta.join(', ')}.`;
      const t = MV.ahora(); const V = MV.conciliacion(t); const porPago = new Map(V.map((x) => [x.pago_id, x]));
      const tuyo = new Map(T.filas.map((f) => [String(f[ix.pago]), f]));
      if (tuyo.size !== T.filas.length) return 'Hay pago_id repetidos: la conciliación tiene un registro por pago aprobado.';
      // se acepta lo que era cierto en las últimas 6 horas (la conciliación se recalcula y la realidad sigue cambiando)
      const momentos = [0, 1, 2, 3, 4, 5, 6].map((h) => t - h * HORA);
      const ok = (x, cat) => momentos.some((m) => MV.categoriaEn(x.cb, m) === cat);
      const liqOk = (x, v) => { const fl = MV.fechaLiqCobro(x.cb.aprobado); return momentos.some((m) => (MV.liquidacionDisponible(fl, m) ? fl : null) === v); };
      const faltan = V.filter((x) => !tuyo.has(x.pago_id)).map((x) => x.pago_id);
      const sobran = [...tuyo.keys()].filter((id) => !porPago.has(id));
      const mal = { cat: [], fecha: [], monto: [], liq: [] }; let centavos = 0, utc = 0;
      for (const [id, f] of tuyo) {
        const x = porPago.get(id); if (!x) continue;
        if (!ok(x, String(f[ix.cat]))) mal.cat.push(`${id} (tienes ${f[ix.cat]}, es ${x.categoria})`);
        if (fechaTxt(f[ix.fecha]) !== x.fecha) { mal.fecha.push(id); if (fechaTxt(f[ix.fecha]) === new Date(x.cb.aprobado).toISOString().slice(0, 10)) utc++; }
        if (Math.abs(num(f[ix.monto]) - x.monto) > 0.005) { mal.monto.push(id); if (Math.abs(num(f[ix.monto]) - x.monto * 100) < 0.5) centavos++; }
        if (!liqOk(x, fechaTxt(f[ix.liq]))) mal.liq.push(`${id} (tienes ${fechaTxt(f[ix.liq]) || 'NULL'}, es ${x.liquidado_el || 'NULL'})`);
      }
      const m = [];
      if (faltan.length) m.push(`faltan ${faltan.length} pagos (${lista(faltan, 3)})`);
      if (sobran.length) m.push(`sobran ${sobran.length} (${lista(sobran, 3)}): ¿pagos rechazados, del día de hoy (todavía no cerrado) o eventos falsos?`);
      if (mal.fecha.length) m.push(`${mal.fecha.length} con otra fecha${utc ? ` — ${utc} usan la fecha en UTC: los días de la tienda son en hora de Ciudad del Río (UTC-3)` : ''}`);
      if (mal.monto.length) m.push(`${mal.monto.length} con otro monto${centavos ? ` — ${centavos} están en centavos: PagoYa manda centavos, la base y la conciliación van en pesos` : ''}`);
      if (mal.cat.length) m.push(`${mal.cat.length} con otra categoría: ${lista(mal.cat, 3)}`);
      if (mal.liq.length) m.push(`${mal.liq.length} con otra liquidado_el: ${lista(mal.liq, 3)}`);
      return !m.length || m.join(' · ');
    }],
  ];

  function panelRevisar(el) {
    el.innerHTML = `<div class="card mv-panel"><h3 style="margin-top:0;font-size:1.05em">🔎 Revisar mi entrega</h3><p class="small muted">Lee el estado real de tus herramientas (Key Vault, lago, Databricks) y lo compara con lo que pasó de verdad en la tienda. No modifica nada.</p><button class="btn btn-primary btn-sm" data-revisar>Revisar ahora</button><ol class="pedalia-chequeos"></ol></div>`;
    const ol = el.querySelector('ol');
    el.querySelector('[data-revisar]').addEventListener('click', async (ev) => {
      const b = ev.currentTarget; b.disabled = true; b.textContent = 'Revisando…'; ol.innerHTML = ''; Host.sincronizar();
      let bien = 0;
      for (const [grupo, texto, prueba] of CHEQUEOS) {
        const li = document.createElement('li'); li.innerHTML = `<span class="spinner"></span> <b>${esc(grupo)}</b> · ${esc(texto)}`; ol.append(li);
        let r; try { r = await prueba(); } catch (e) { r = String(e.message || e); }
        if (r === true) bien++;
        li.className = r === true ? 'ok' : 'falta';
        li.innerHTML = `${r === true ? '✅' : '⬜'} <b>${esc(grupo)}</b> · ${esc(texto)}${r === true ? '' : `<div class="small muted">${esc(r)}</div>`}`;
      }
      b.disabled = false; b.textContent = `Revisar de nuevo (${bien} de ${CHEQUEOS.length})`;
      const D = Host.datos(); if (D) { D.revision = { bien, total: CHEQUEOS.length, cuando: Date.now() }; Host.guardar(); }
    });
  }

  // ================================================================== el día a día: tickets, incidentes y preguntas
  const DIA = 86400000, MIN = 60000;
  const norm = (x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const casi = (a, b, tol = 0.011) => Math.abs(Number(a) - Number(b)) <= tol;
  const diaAnterior = (ms) => MV.sumarDias(MV.diaLocal(ms), -1);
  // ---- la verdad de las preguntas de negocio
  function pedidosCreadosEl(fecha) { return MV.mundo().cambios.filter((c) => c.tabla === 'pedidos' && c.op === 'c' && MV.diaLocal(c.ts) === fecha).map((c) => c.despues); }
  function pctSinPagar(fecha) {
    const ped = pedidosCreadosEl(fecha); const cobrados = new Set(MV.mundo().cobros.filter((c) => c.aprobado <= MV.ahora()).map((c) => c.pedido));
    const est = MV.estadoEn(MV.ahora()).est.pedidos; const vivos = ped.filter((p) => est.has(p.id));
    const r1 = (x) => Math.round(x * 1000) / 10;
    return { real: r1((ped.length - ped.filter((p) => cobrados.has(p.id)).length) / ped.length), realVivos: r1((vivos.length - vivos.filter((p) => cobrados.has(p.id)).length) / vivos.length), soloBase: Math.round((vivos.filter((p) => !est.get(p.id).pago_ref).length / vivos.length) * 1000) / 10, n: ped.length };
  }
  function tasaPorRubro(fechas) {
    const { est } = MV.estadoEn(MV.ahora()); const W = MV.mundo();
    const rubroDeProducto = new Map(W.ini.productos.map((p) => [p.id, W.ini.vendedores.find((v) => v.id === p.vendedor_id).rubro]));
    const itemsPorPedido = new Map(); for (const it of est.items_pedido.values()) { if (!itemsPorPedido.has(it.pedido_id)) itemsPorPedido.set(it.pedido_id, new Set()); itemsPorPedido.get(it.pedido_id).add(rubroDeProducto.get(it.producto_id)); }
    const t = {};
    for (const f of fechas) for (const p0 of pedidosCreadosEl(f)) { const p = est.pedidos.get(p0.id); if (!p) continue; for (const r of itemsPorPedido.get(p.id) || []) { const x = (t[r] = t[r] || { n: 0, c: 0 }); x.n++; if (p.estado === 'cancelado') x.c++; } }
    const tasas = Object.entries(t).map(([r, x]) => [r, x.c / x.n]); const max = Math.max(...tasas.map((x) => x[1]));
    return { tasas, ganadores: tasas.filter((x) => Math.abs(x[1] - max) < 1e-9).map((x) => x[0]) };
  }
  function descuentoDel(fecha) {
    const { est } = MV.estadoEn(MV.ahora());
    const ps = pedidosCreadosEl(fecha).map((p) => est.pedidos.get(p.id)).filter((p) => p && p.cupon && p.estado !== 'cancelado');
    return { total: ps.reduce((a, p) => a + p.descuento, 0) / 100, pedidos: ps.length };
  }
  const snapshotsCdc = () => MV.mundo().cambios.filter((c) => c.op === 'r' && c.tabla === 'pedidos').length;
  function conciliacionDiariaVerdad() { return MV.liquidaciones().map((l) => { const L = MV.lineasLiquidacion(l.fecha); const sum = (f, tipo) => L.filter((x) => !tipo || x.tipo === tipo).reduce((a, x) => a + x[f], 0) / 100; return { fecha: l.fecha, cobros: sum('bruto', 'cobro'), reembolsos: sum('bruto', 'reembolso'), contracargos: sum('bruto', 'contracargo'), comisiones: sum('comision'), neto: sum('neto') }; }); }
  const chequeo = (texto) => CHEQUEOS.find((c) => c[1].startsWith(texto))[2];
  async function repoMercado() {
    const G = window.Shell && window.Shell.github; const rem = G && G.remotos ? G.remotos() : {};
    const [, r] = Object.entries(rem).find(([u]) => /\/mercado-datos(\.git)?$/i.test(u)) || []; return r || null;
  }

  // ---- los tickets (aparecen con los días, como en un trabajo)
  const TICKETS = [
    { id: 'MV-101', tipo: 'requerimiento', de: 'Valentina Ruiz · Finanzas', cuando: (I) => I, titulo: 'Conciliación diaria con PagoYa',
      texto: 'Lo del correo: una tabla con cada pago aprobado, su pedido, la categoría y si ya se liquidó. La especificación está en "La entrega".',
      criterios: ['mercado.silver.pedidos al día (snapshot + CDC)', 'mercado.silver.pagoya_eventos sin falsos ni repetidos', 'mercado.gold.conciliacion con las categorías acordadas'],
      check: async () => { for (const k of ['mercado.silver.pedidos', 'mercado.silver.pagoya_eventos', 'mercado.gold.conciliacion']) { const r = await chequeo(k)(); if (r !== true) return r; } return true; } },
    { id: 'MV-102', tipo: 'requerimiento', de: 'Legales', cuando: (I) => I, titulo: 'Derecho al olvido en las copias de datos',
      texto: 'Cuando un cliente pide que borremos sus datos, la app lo anonimiza. Necesitamos que pase lo mismo en todas las copias del equipo de datos, en el mismo día.',
      criterios: ['mercado.silver.clientes sin email para los clientes anonimizados'], check: () => chequeo('mercado.silver.clientes')() },
    { id: 'MV-103', tipo: 'requerimiento', de: 'Seguridad', cuando: (I) => I, titulo: 'Credenciales fuera del código',
      texto: 'Auditoría de rutina: ninguna credencial en scripts, notebooks ni repositorios. Todo en Key Vault.', criterios: ['Las credenciales del correo de accesos guardadas en un Key Vault'], check: () => chequeo('Las credenciales')() },
    { id: 'MV-104', tipo: 'pregunta', de: 'Martín Paz · Dirección', cuando: (I) => I + 9 * 60 * MIN, titulo: '¿Cuántos pedidos se nos caen sin pagar?',
      texto: (T) => `Para la reunión de directorio: ¿qué porcentaje de los pedidos creados el ${diaAnterior(T)} (hora de la tienda) nunca se pagó? Con un decimal.`,
      comentarios: ['Martín: "nunca se pagó" es que la plata no entró, no lo que diga la app.'],
      respuesta: { tipo: 'numero', unidad: '%', verificar: (v, T) => { const x = pctSinPagar(diaAnterior(T)); if (casi(v, x.real, 0.15) || casi(v, x.realVivos, 0.15)) return true; if (casi(v, x.soloBase, 0.15)) return 'Ese número sale de la base (pago_ref vacío). Hay pedidos que PagoYa cobró y la app nunca marcó como pagados: la plata sí entró.'; return 'No coincide. Cuenta los pedidos creados ese día (hora de Ciudad del Río, la base guarda UTC) y fíjate cuáles tienen un pago aprobado en PagoYa.'; } } },
    { id: 'MV-105', tipo: 'pregunta', de: 'Rocío Medina · Operaciones', cuando: (I) => I + 11 * 60 * MIN, titulo: '¿Qué rubro cancela más?',
      texto: (T) => { const d = MV.diaLocal(T); return `Quiero hablar con los comercios que más cancelan. ¿Qué rubro tuvo la mayor tasa de cancelación en los pedidos creados entre el ${MV.sumarDias(d, -3)} y el ${MV.sumarDias(d, -1)}?`; },
      comentarios: ['Tú: ¿cuento los que vencieron sin pagar?', 'Rocío: sí, todos los cancelados. Y si un pedido tiene productos de dos comercios, cuenta para los dos rubros.', 'Tú: ¿tasa sobre qué?', 'Rocío: cancelados sobre pedidos de ese rubro.'],
      respuesta: { tipo: 'texto', ayuda: 'El rubro, tal como está en la tabla vendedores', verificar: (v, T) => { const d = MV.diaLocal(T); const x = tasaPorRubro([-3, -2, -1].map((k) => MV.sumarDias(d, k))); if (x.ganadores.some((g) => norm(g) === norm(v))) return true; return x.tasas.some(([r]) => norm(r) === norm(v)) ? 'Ese rubro existe, pero no es el de mayor tasa. ¿Usaste la hora de la tienda para los días y contaste cada pedido en todos sus rubros?' : 'No es un rubro de la tabla vendedores.'; } } },
    { id: 'MV-106', tipo: 'requerimiento', de: 'Valentina Ruiz · Finanzas', cuando: (I) => I + DIA + 8 * 60 * MIN, titulo: 'Resumen diario que cuadre con el banco (y en Power BI)',
      texto: 'Gracias por la conciliación. Ahora necesito, por cada liquidación, cuánto fue de cobros, reembolsos, contracargos y comisiones, y el neto. Ese neto tiene que ser exactamente lo que entró al banco. Y lo quiero ver en Power BI, no en una consulta.',
      criterios: ['mercado.gold.conciliacion_diaria: fecha_liquidacion, cobros, reembolsos, contracargos, comisiones, neto (en pesos, un registro por liquidación publicada)', 'Un informe de Power BI que importe la tabla desde Databricks'],
      check: async () => {
        const T = await tabla('mercado.gold.conciliacion_diaria'); if (T.error) return `No se pudo leer mercado.gold.conciliacion_diaria: ${T.error}`;
        const ix = Object.fromEntries(['fecha_liquidacion', 'cobros', 'reembolsos', 'contracargos', 'comisiones', 'neto'].map((k) => [k, colDe(T, k)])); const falta = Object.entries(ix).filter(([, i]) => i < 0).map(([k]) => k); if (falta.length) return `Faltan columnas: ${falta.join(', ')}.`;
        const V = conciliacionDiariaVerdad(); const tuyo = new Map(T.filas.map((f) => [fechaTxt(f[ix.fecha_liquidacion]), f])); const mal = [];
        for (const v of V) { const f = tuyo.get(v.fecha); if (!f) { mal.push(`falta ${v.fecha}`); continue; } for (const k of ['cobros', 'reembolsos', 'contracargos', 'comisiones', 'neto']) if (!casi(Math.abs(num(f[ix[k]])), Math.abs(v[k]))) mal.push(`${v.fecha} ${k}: ${f[ix[k]]} (el reporte da ${v[k].toFixed(2)})`); }
        const sobran = [...tuyo.keys()].filter((f) => !V.some((v) => v.fecha === f)); if (sobran.length) mal.push(`sobran fechas sin liquidación publicada: ${lista(sobran, 3)}`);
        if (mal.length) return mal.slice(0, 6).join(' · ') + (mal.some((m) => /neto/.test(m)) ? ' — el neto sale del reporte de liquidación, no de las ventas del día.' : '');
        const c = (almacen() && almacen().data.cruces) || {}; return c.pbiDatabricks ? true : 'La tabla cuadra. Falta el informe: en Power BI → Obtener datos → Azure Databricks → mercado.gold.conciliacion_diaria → Cargar.';
      } },
    { id: 'MV-114', tipo: 'requerimiento', de: 'Valentina Ruiz · Finanzas', cuando: (I) => I + DIA + 8 * 60 * MIN + MIN, titulo: 'Que las liquidaciones lleguen solas todos los días',
      texto: 'Hoy alguien baja el reporte a mano. Plataforma pide que lo haga Data Factory (es lo que usamos para las ingestas): todos los días a las 07:00, después de que PagoYa publica a las 06:00.',
      comentarios: ['Plataforma: la API tiene GET /v1/liquidaciones/{fecha}/lineas en JSON, es lo que lee el conector REST. La clave va como cabecera Authorization: Bearer … (guárdenla así en el Key Vault).'],
      criterios: ['Un pipeline publicado de Data Factory que copie las líneas de una liquidación desde la API de PagoYa al lago (corrida exitosa, no debug)', 'Un trigger diario'],
      check: async () => {
        const adf = (window.CloudSim && window.CloudSim.az().adf) || {}; let ok = false, trig = false;
        for (const F of Object.values(adf)) { const S = F.studio || {}; const restPagoya = Object.entries(S.datasets || {}).filter(([, d]) => d.type === 'RestResource' && /pagoya/.test(((S.linked || {})[d.linked] || {}).url || '')).map(([n]) => n);
          if (!restPagoya.length) continue;
          const pipes = Object.entries(S.pipelines || {}).filter(([, P]) => JSON.stringify(P.activities || []).match(new RegExp(restPagoya.map((n) => `"${n}"`).join('|')))).map(([n]) => n);
          if ((S.runs || []).some((r) => !r.debug && r.estado === 'Succeeded' && pipes.includes(r.pipeline))) ok = true;
          if (Object.values(S.triggers || {}).some((t) => pipes.some((p) => JSON.stringify(t).includes(p)))) trig = true; }
        return (ok && trig) || `${ok ? '' : 'No hay una corrida publicada y exitosa de un pipeline que copie desde un dataset REST de PagoYa (linked service REST, Anonymous + cabecera Authorization desde Key Vault). '}${trig ? '' : 'Falta el trigger diario (Add trigger → New → Schedule, 07:00).'}`;
      } },
    { id: 'MV-107', tipo: 'incidente', de: 'Rocío Medina · Operaciones', cuando: (I, H) => H.cupones + 22 * 60 * MIN, titulo: 'Los totales no cuadran con el detalle desde ayer',
      texto: 'Algunos pedidos tienen un total menor que la suma de sus ítems más el envío. ¿Está mal la base o está mal lo de ustedes?',
      comentarios: ['Martín (app): ayer a las 10 lanzamos cupones de descuento. Agregamos dos columnas a pedidos: descuento y cupon. ¿No les avisamos? Perdón.', 'Plataforma: Debezium manda las columnas nuevas solo desde el cambio de esquema. Los mensajes viejos no las tienen.'],
      criterios: ['mercado.silver.pedidos con las columnas descuento y cupon, iguales a la base', 'Un postmortem corto en tus notas: qué pasó, cómo te enteraste, qué cambias para enterarte antes'],
      check: async () => {
        const T = await tabla('mercado.silver.pedidos'); if (T.error) return T.error; const iId = colDe(T, 'pedido_id', 'id'), iD = colDe(T, 'descuento'), iC = colDe(T, 'cupon'), iL = colDe(T, '_lsn');
        if (iD < 0 || iC < 0) return 'La tabla todavía no tiene las columnas descuento y cupon (ALTER TABLE … ADD COLUMNS, y el MERGE tiene que llenarlas).';
        const L = Math.max(...T.filas.map((f) => num(f[iL]) || 0)); const V = MV.estadoEnLsn(L).est.pedidos; const mal = [];
        for (const f of T.filas) { const v = V.get(num(f[iId])); if (!v || !v.cupon) continue; if (String(f[iC] ?? '') !== v.cupon || !casi(num(f[iD]), v.descuento / 100)) mal.push(f[iId]); }
        const conCupon = [...V.values()].filter((v) => v.cupon).length;
        if (!conCupon) return 'Todavía no aplicaste cambios posteriores al lanzamiento de los cupones: consume el CDC.';
        return !mal.length || `${mal.length} pedidos con cupón tienen otro descuento o cupon (${lista(mal)}).`;
      } },
    { id: 'MV-108', tipo: 'pregunta', de: 'Lucas Ferreyra · Marketing', cuando: (I, H) => H.cupones + 23 * 60 * MIN, titulo: '¿Cuánto nos costaron los cupones el primer día?',
      texto: (T, H) => `¿Cuánto descuento dimos en total con cupones en los pedidos creados el ${MV.diaLocal(H.cupones)}? En pesos.`,
      comentarios: ['Lucas: solo los pedidos que no se cancelaron, los cancelados no nos costaron nada.'],
      respuesta: { tipo: 'numero', unidad: '$', verificar: (v, T, H) => { const x = descuentoDel(MV.diaLocal(H.cupones)); return casi(v, x.total, 0.02) || `No coincide (sobre ${x.pedidos} pedidos con cupón no cancelados, si no me equivoco). ¿Excluiste los cancelados y usaste la hora de la tienda?`; } } },
    { id: 'MV-112', tipo: 'requerimiento', de: 'Carla Núñez · Líder de datos', cuando: (I) => I + DIA + 14 * 60 * MIN, titulo: 'El código va al repositorio, con revisión',
      texto: 'Si mañana te enfermas, otro tiene que poder correr y entender todo. Repo mercado-datos en GitHub, con el SQL, los scripts y un workflow que al menos valide la sintaxis. Nada de secretos en el repo.',
      criterios: ['Repositorio mercado-datos en el GitHub de práctica', 'Al menos un pull request fusionado y un workflow en verde'],
      check: async () => { const r = await repoMercado(); if (!r) return 'Crea el repositorio mercado-datos en el GitHub de práctica, agrégalo como remoto y haz push.'; const pr = (r.prs || []).some((p) => p.estado === 'fusionado'); const run = (r.runs || []).some((x) => x.conclusion === 'success'); const C = MV.claves(); const snap = JSON.stringify(Object.values(r.commits || {}).map((c) => c.snap || {})); const fuga = [C.pagoya, C.pg.clave, C.webhook].some((v) => snap.includes(v)); if (fuga) return 'Hay una credencial dentro del repositorio. Sácala, rótala (en un trabajo real ya se considera filtrada) y léela del Key Vault o de variables.'; return (pr && run) || `${pr ? '' : 'Abre un PR y fusiónalo. '}${run ? '' : 'El workflow tiene que terminar en verde.'}`; } },
    { id: 'MV-109', tipo: 'requerimiento', de: 'Plataforma', cuando: (I) => I + 2 * DIA + 9 * 60 * MIN, titulo: 'Automatizar: que corra solo cada hora',
      texto: 'Que nadie tenga que correr nada a mano. Un DAG en Airflow que cada hora consuma el CDC y actualice silver y gold en Databricks. Si se atrasa más de 12 horas, perdemos datos (retención de 24 h).',
      criterios: ['Un DAG con "mercado" en el dag_id, programado cada hora', 'Que dispare un job de Databricks (DatabricksRunNowOperator)', 'Al menos una corrida exitosa'],
      check: async () => {
        if (!(await cargar('airflow', () => window.AirflowMotor))) return 'No se pudo cargar Airflow.'; const AM = window.AirflowMotor; try { await AM.parsear(); } catch (e) { /* nada */ }
        const ds = (AM.bolsa().dags || []).filter((d) => /mercado/i.test(d.id)); if (!ds.length) return 'No hay ningún DAG con "mercado" en el dag_id en ~/airflow/dags.';
        const d = ds.find((x) => /@hourly|^0 \* \* \* \*$|^\d{1,2} \* \* \* \*$/.test(String((x.sched || {}).txt || '').trim())) ; if (!d) return `El DAG ${ds[0].id} no está programado cada hora (schedule="@hourly").`;
        if (!JSON.stringify(d.tasks || []).includes('Databricks')) return `El DAG ${d.id} no tiene una tarea que dispare Databricks.`;
        return (AM.runs(d.id) || []).some((r) => r.state === 'success') || !!(AM.st().pruebasOk || {})[d.id] || `El DAG ${d.id} todavía no tiene una corrida exitosa (dispáralo en la interfaz o prueba con airflow dags test ${d.id}).`;
      } },
    { id: 'MV-110', tipo: 'incidente', de: 'Seguridad', cuando: (I, H) => H.rotacion + 10 * MIN, titulo: 'PagoYa rotó el secreto de firma de los webhooks',
      texto: 'PagoYa nos avisó que rotó el secreto de firma (rotación anual). Durante 24 horas cada entrega viene firmada con los dos secretos (dos valores v1 en la cabecera). Después, solo con el nuevo. El nuevo está en el correo de accesos (mercado accesos).',
      criterios: ['El secreto nuevo en el Key Vault y el viejo ya no', 'Tu verificación acepta cualquiera de los v1 de la cabecera (no solo el último)'],
      check: async () => { const kv = (window.CloudSim && window.CloudSim.az().kv) || {}; const vals = Object.values(kv).flatMap((V) => Object.values(V.secrets || {}).map((x) => (typeof x === 'string' ? x : x && x.value))); const nuevo = MV.claves().webhook; const viejo = 'whsec_' + (MV.claves(MV.hitos().rotacion - 1).webhook.slice(6)); if (!vals.includes(nuevo)) return 'El secreto nuevo no está en ningún Key Vault (az keyvault secret set con el mismo nombre crea una versión nueva).'; if (vals.includes(viejo)) return 'El secreto viejo sigue guardado: actualiza el secreto (nueva versión) en lugar de crear otro.'; return true; } },
    { id: 'MV-111', tipo: 'incidente', de: 'Plataforma', cuando: (I, H) => H.reinicioCdc + 290 * MIN, titulo: 'Debezium se reinició y volvió a publicar todo',
      texto: 'A las 04:10 alguien reinició el conector sin sus offsets y Debezium hizo un snapshot completo: miles de mensajes op = "r" en todos los tópicos. ¿Nos duplicó algo? ¿Lo procesamos bien?',
      criterios: ['mercado.silver.pedidos correcto y al día después del reinicio (sin duplicados)', 'Saber cuántos mensajes de snapshot llegaron al tópico de pedidos (pregunta MV-115)'],
      check: async () => { const r = await chequeo('mercado.silver.pedidos')(); if (r !== true) return r; const T = await tabla('mercado.silver.pedidos'); const L = Math.max(...T.filas.map((f) => num(f[colDe(T, '_lsn')]) || 0)); const lr = (MV.mundo().cambios.find((c) => c.op === 'r') || {}).lsn; return L >= lr || 'Tu tabla todavía no incluye cambios posteriores al reinicio: consume el CDC (ojo: si tu MERGE solo entiende c, u y d, ¿qué hace con r?).'; } },
    { id: 'MV-115', tipo: 'pregunta', de: 'Plataforma', cuando: (I, H) => H.reinicioCdc + 291 * MIN, titulo: '¿Cuántos mensajes de snapshot llegaron a pedidos?',
      texto: '¿Cuántos mensajes con op = "r" publicó Debezium en mv_prod.public.pedidos con el reinicio? Lo necesitamos para el informe del incidente.',
      comentarios: ['Plataforma: ojo que la retención es de 24 horas.'],
      respuesta: { tipo: 'numero', unidad: 'mensajes', verificar: (v) => (Number(v) === snapshotsCdc()) || 'No coincide. Un snapshot publica una fila por cada registro que había en la tabla en ese momento.' } },
    { id: 'MV-113', tipo: 'requerimiento', de: 'Valentina Ruiz · Finanzas', cuando: (I) => I + 2 * DIA + 14 * 60 * MIN, titulo: 'Finanzas trabaja en Snowflake',
      texto: 'Nuestro contador y el estudio de auditoría consultan todo en Snowflake. Necesitamos el resumen diario ahí, en MERCADO.FINANZAS.CONCILIACION_DIARIA, actualizado cada día.',
      criterios: ['MERCADO.FINANZAS.CONCILIACION_DIARIA en Snowflake, cargada desde el lago, con el mismo neto que el reporte de cada liquidación'],
      check: async () => {
        if (!(await cargar('snowflake', () => window.SnowflakeMotor))) return 'No se pudo cargar Snowflake.'; const SM = window.SnowflakeMotor; SM.conectar(almacen()); await SM.init();
        let x; try { x = await SM.leer('SELECT CAST(FECHA_LIQUIDACION AS VARCHAR) AS F, NETO FROM MERCADO.FINANZAS.CONCILIACION_DIARIA'); } catch (e) { return `No se pudo leer la tabla: ${String(e.message).split('\n')[0]}`; }
        if (!x.values.length) return 'La tabla está vacía.'; const V = new Map(conciliacionDiariaVerdad().map((v) => [v.fecha, v.neto]));
        const mal = x.values.filter(([f, n]) => !V.has(String(f).slice(0, 10)) || !casi(n, V.get(String(f).slice(0, 10)))).map(([f, n]) => `${String(f).slice(0, 10)}: ${n}`);
        const faltan = [...V.keys()].filter((f) => !x.values.some(([g]) => String(g).slice(0, 10) === f));
        return (!mal.length && !faltan.length) || `${mal.length ? 'No cuadra: ' + lista(mal, 3) + '. ¿Cargaste dos veces el mismo archivo con FORCE? ' : ''}${faltan.length ? 'Faltan: ' + lista(faltan, 3) : ''}`;
      } },
  ];
  // la misma cola de tickets se ve en el tablero de la lección y en Jira (proyecto MV), que es donde trabaja el equipo
  const cfgTablero = () => ({
      titulo: 'Tablero del equipo de datos', tickets: TICKETS,
      contexto: () => { Host.sincronizar(); return { I: MV.inicioDiaLocal(MV.cfg.inicio), H: MV.hitos(), t: MV.ahora() }; },
      datos: () => Host.datos(), guardar: () => Host.guardar(), hora: (T) => MV.tsSql(T - 3 * 3600000).slice(0, 16),
    });
  (window.__tableros = window.__tableros || []).push({ clave: 'MV', nombre: 'Mercado Vecino', modulo: 'proyecto-mercado-vecino', cfg: cfgTablero, chequeos: () => (typeof CHEQUEOS !== 'undefined' ? CHEQUEOS : []) });
  function panelTablero(el) {
    window.TableroTickets.panel(el, cfgTablero());
  }


  function montar(root) {
    (root || document).querySelectorAll('[data-mercado]').forEach((el) => {
      if (el.dataset.montado) return; el.dataset.montado = '1';
      const k = el.dataset.mercado;
      if (k === 'accesos') panelAccesos(el); else if (k === 'fuentes') panelFuentes(el); else if (k === 'revisar') panelRevisar(el); else if (k === 'tablero') panelTablero(el);
    });
  }
  window.MercadoVecino = { montar, CHEQUEOS, TICKETS, verdad: { pctSinPagar, tasaPorRubro, descuentoDel, snapshotsCdc, conciliacionDiariaVerdad } };
})();
