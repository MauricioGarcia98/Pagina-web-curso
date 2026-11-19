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
    el.innerHTML = `<div class="card mv-panel"><h4 style="margin-top:0">✉️ Accesos para el equipo de datos</h4>
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
      el.innerHTML = `<div class="card mv-panel"><h4 style="margin-top:0">📡 Las fuentes, ahora mismo</h4>
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
    const r = await window.DBSQL.ejecutar(sql);
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
    el.innerHTML = `<div class="card mv-panel"><h4 style="margin-top:0">🔎 Revisar mi entrega</h4><p class="small muted">Lee el estado real de tus herramientas (Key Vault, lago, Databricks) y lo compara con lo que pasó de verdad en la tienda. No modifica nada.</p><button class="btn btn-primary btn-sm" data-revisar>Revisar ahora</button><ol class="pedalia-chequeos"></ol></div>`;
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

  function montar(root) {
    (root || document).querySelectorAll('[data-mercado]').forEach((el) => {
      if (el.dataset.montado) return; el.dataset.montado = '1';
      const k = el.dataset.mercado;
      if (k === 'accesos') panelAccesos(el); else if (k === 'fuentes') panelFuentes(el); else if (k === 'revisar') panelRevisar(el);
    });
  }
  window.MercadoVecino = { montar, CHEQUEOS };
})();
