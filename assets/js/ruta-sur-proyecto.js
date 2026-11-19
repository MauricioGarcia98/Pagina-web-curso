/* Ruta Sur: estado del stream, revisión automática y tablero del equipo.
 * Lecciones: <div data-ruta="fuentes"></div>, <div data-ruta="revisar"></div>, <div data-ruta="tablero"></div>.
 */
(function () {
  'use strict';
  const RS = window.RutaSurMundo, Host = window.RutaSurHost;
  if (!RS || !Host) return;
  const HORA = 3600000, DIA = 86400000, MIN = 60000;
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (x) => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const lista = (xs, n = 4) => xs.slice(0, n).join(', ') + (xs.length > n ? ` y ${xs.length - n} más` : '');
  const ahora = () => RS.ahora();
  const hoy = () => RS.diaLocal(ahora());
  const diasCerrados = () => { const out = []; for (let f = RS.diaLocal(RS.T0()); f < hoy(); f = RS.sumarDias(f, 1)) out.push(f); return out; };

  // ---------------------------------------------------------------- la verdad
  function eventosDe(f, t = ahora()) { const m = new Map(); for (const x of RS.dia(f).eventos) { if (x.ing > t) continue; const y = m.get(x.id); if (!y || x.ing < y.ing) m.set(x.id, x); } return [...m.values()]; }
  function entregas(f, t = ahora()) {
    const evs = eventosDe(f, t).filter((x) => x.tipo === 'entrega_completada' || x.tipo === 'entrega_fallida'); const porP = new Map(evs.map((x) => [x.pedido_id, x]));
    return RS.dia(f).pedidos.map((p) => { const e = porP.get(p.pedido_id); const estado = e ? (e.tipo === 'entrega_completada' ? 'completada' : 'fallida') : 'sin_evento'; return { ...p, estado, ts: e ? e.ts : null, a_tiempo: estado === 'completada' && e.ts >= p.ventana_inicio && e.ts <= p.ventana_fin }; });
  }
  const pct = (xs) => Math.round((xs.filter((x) => x.a_tiempo).length / (xs.length || 1)) * 1000) / 10;
  const kmDe = (v, f) => { const L = eventosDe(f).filter((x) => x.vehiculo === v).sort((a, b) => a.ts - b.ts); let s = 0; for (let i = 1; i < L.length; i++) s += RS.km([L[i - 1].lat, L[i - 1].lon], [L[i].lat, L[i].lon]); return s; };

  // ---------------------------------------------------------------- panel: el stream ahora
  function panelFuentes(el) {
    const pintar = () => {
      Host.sincronizar(); const T = RS.temas()[0]; const D = Host.datos() || {}; const g = Object.entries(D.grupos || {});
      el.innerHTML = `<div class="card mv-panel"><h4 style="margin-top:0">🚚 La telemetría, ahora</h4>
        <p class="small muted">Hora: <b>${esc(new Date(ahora() - 3 * HORA).toISOString().slice(0, 16).replace('T', ' '))}</b> (UTC-3) · tópico <code>${RS.TEMA}</code> · retención 3 días.</p>
        <div class="mv-grilla">${T.rangos.map((r) => `<div><b>Partición ${r.p}</b><br><span class="small">offsets ${r.bajo}–${r.alto - 1}${g.length ? '<br>' + g.map(([k, o]) => { const off = o[`${RS.TEMA}:${r.p}`]; return off == null ? '' : `grupo ${esc(k)}: ${off} (atraso ${r.alto - off})`; }).filter(Boolean).join('<br>') : ''}</span></div>`).join('')}</div></div>`;
    };
    pintar(); const iv = setInterval(() => { if (!document.body.contains(el)) return clearInterval(iv); pintar(); }, 60000);
  }

  // ---------------------------------------------------------------- revisión
  const cargar = async (gr, listo) => { try { if (!listo() && window.__cargarGrupo) await window.__cargarGrupo(gr); } catch (e) { /* sin red */ } return listo(); };
  async function tabla(nombre) {
    try { if (!(await cargar('databricks', () => window.DBSQL))) throw new Error('No se pudo cargar Databricks'); await window.DBSQL.init({ Store: almacen() }); const r = await window.DBSQL.ejecutar(`SELECT * FROM ${nombre}`, { limite: 1e7 }); const u = Array.isArray(r) ? r[r.length - 1] : r; if (!u || u.error) throw new Error(u && u.error ? String(u.error.message || u.error) : 'sin resultado'); return { cols: (u.cols || []).map((c) => String(c).toLowerCase()), filas: u.filas || [] }; } catch (e) { return { error: e.message.split('\n')[0] }; }
  }
  const colDe = (T, ...n) => { for (const x of n) { const i = T.cols.indexOf(x); if (i >= 0) return i; } return -1; };
  const fecha10 = (x) => String(x ?? '').slice(0, 10);
  const msDe = (x) => { if (x == null) return null; if (typeof x === 'number') return x > 1e12 ? x : x * 1000; const s = String(x).replace(' ', 'T'); return Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z'); };
  async function chequeoSilver() {
    const T = await tabla('ruta.silver.telemetria'); if (T.error) return `No se pudo leer ruta.silver.telemetria: ${T.error}`;
    const ix = { id: colDe(T, 'event_id'), v: colDe(T, 'vehiculo'), tipo: colDe(T, 'tipo', 'evento'), ts: colDe(T, 'ts_evento'), vel: colDe(T, 'velocidad_kmh') };
    const falta = Object.entries(ix).filter(([, i]) => i < 0).map(([k]) => ({ id: 'event_id', v: 'vehiculo', tipo: 'tipo', ts: 'ts_evento', vel: 'velocidad_kmh' }[k])); if (falta.length) return `Faltan columnas: ${falta.join(', ')}.`;
    const ids = T.filas.map((f) => String(f[ix.id])); const unicos = new Set(ids); if (unicos.size !== ids.length) return `Hay eventos repetidos: ${ids.length} filas y ${unicos.size} event_id distintos. Event Hubs entrega "al menos una vez": deduplica por event_id.`;
    const t0 = RS.inicioDiaLocal(ahora()); const m = []; const tuyo = new Map(T.filas.map((f) => [String(f[ix.id]), f]));
    let faltan = 0, velMal = 0, velMalFw2 = 0, tsMal = 0, nulos = 0; const H = RS.hitos();
    for (const f of diasCerrados().slice(-3)) for (const x of eventosDe(f, t0)) {
      if (x.ing < t0 - 3 * DIA) continue; // ya no estaban en Kafka cuando empezaste: no se exigen
      const r = tuyo.get(x.id); if (!r) { faltan++; continue; }
      if (x.velocidad_kmh != null) { const v = r[ix.vel]; if (v == null) nulos++; else if (Math.abs(Number(v) - x.velocidad_kmh) > 0.6) { velMal++; if (x.fw2) velMalFw2++; } }
      const ms = msDe(r[ix.ts]); if (!(Math.abs(ms - x.ts) < 2000 || (x.desvio && Math.abs(ms - x.ts - x.desvio) < 2000))) tsMal++;
    }
    if (faltan) m.push(`faltan ${faltan} eventos de los últimos días cerrados que ya estaban en el tópico${(Host.datos() || {}).perdidos ? ' (tu grupo de consumo perdió mensajes por la retención de 3 días)' : ''}`);
    if (nulos) m.push(`${nulos} eventos con velocidad_kmh vacía — desde la actualización de firmware, la mitad de la flota manda speed_mps (m/s) en lugar de velocidad_kmh`);
    if (velMal) m.push(`${velMal} velocidades distintas${velMalFw2 ? ' — speed_mps está en metros por segundo: × 3,6 para km/h' : ''}`);
    if (tsMal) m.push(`${tsMal} eventos con otra hora — el firmware 2 manda ts en milisegundos desde 1970 (no ts_dispositivo en texto)`);
    void H;
    return !m.length || m.join(' · ');
  }
  async function chequeoEntregas() {
    const T = await tabla('ruta.gold.entregas'); if (T.error) return `No se pudo leer ruta.gold.entregas: ${T.error}`;
    const ix = { p: colDe(T, 'pedido_id'), f: colDe(T, 'fecha'), e: colDe(T, 'estado'), a: colDe(T, 'a_tiempo') };
    if (Object.values(ix).some((i) => i < 0)) return 'La tabla necesita pedido_id, fecha, estado y a_tiempo (y además vehiculo, ventana_inicio, ventana_fin, ts_entrega).';
    const tuyo = new Map(T.filas.map((f) => [String(f[ix.p]), f])); if (tuyo.size !== T.filas.length) return 'Hay pedido_id repetidos.';
    // los últimos 3 días cerrados, pero solo los que estaban completos en Kafka cuando empezaste el proyecto
    const desde = RS.diaLocal(RS.cfg.inicio - 2 * DIA);
    const dias = diasCerrados().filter((f) => f >= RS.sumarDias(hoy(), -3) && f >= desde); const m = []; let faltan = 0, estadoMal = 0, tiempoMal = 0, urgentes = 0, v13 = 0;
    const H = RS.hitos(); const fReloj = RS.diaLocal(H.reloj + HORA);
    for (const f of dias) {
      const V = entregas(f), V6 = entregas(f, ahora() - 6 * HORA); const v6 = new Map(V6.map((x) => [x.pedido_id, x]));
      for (const x of V) {
        const r = tuyo.get(x.pedido_id); if (!r) { faltan++; if (x.urgente) urgentes++; continue; }
        const e = String(r[ix.e]); const a = r[ix.a] === true || r[ix.a] === 1 || String(r[ix.a]).toLowerCase() === 'true';
        const ok6 = v6.get(x.pedido_id);
        if (e !== x.estado && !(ok6 && e === ok6.estado)) estadoMal++;
        else if (a !== x.a_tiempo && !(ok6 && a === ok6.a_tiempo)) { tiempoMal++; if (x.vehiculo === 'V13' && f === fReloj) v13++; }
      }
    }
    if (faltan) m.push(`faltan ${faltan} pedidos del plan${urgentes ? ` (${urgentes} urgentes: se agregan al plan durante el día; si bajaste el plan a la mañana no están)` : ''}`);
    if (estadoMal) m.push(`${estadoMal} pedidos con otro estado — los eventos que llegan tarde (zonas sin señal, apagones) cambian el resultado de días ya calculados: vuelve a procesar`);
    if (tiempoMal) m.push(`${tiempoMal} con otro a_tiempo${v13 ? ` — ${v13} son de V13 el ${fReloj}: su reloj estaba adelantado` : ' — a tiempo = completada dentro de la ventana prometida (comparando horas en la misma zona horaria)'}`);
    return !m.length || m.join(' · ');
  }
  async function chequeoKV() { const kv = (window.CloudSim && window.CloudSim.az && window.CloudSim.az().kv) || {}; const C = RS.claves(); const vals = Object.values(kv).flatMap((V) => Object.values(V.secrets || {}).map((x) => (typeof x === 'string' ? x : x && x.value))); return (vals.includes(C.eh.cs) && vals.includes(C.api)) || 'Guarda en un Key Vault la cadena de conexión del Event Hubs y la API key del TMS.'; }
  async function chequeoSla() {
    const T = await tabla('ruta.gold.sla_diario'); if (T.error) return `No se pudo leer ruta.gold.sla_diario: ${T.error}`;
    const ix = { f: colDe(T, 'fecha'), z: colDe(T, 'zona'), n: colDe(T, 'pedidos'), a: colDe(T, 'a_tiempo'), x: colDe(T, 'fallidas') }; if (Object.values(ix).some((i) => i < 0)) return 'La tabla necesita fecha, zona, pedidos, a_tiempo y fallidas.';
    const mal = [];
    const desde = RS.diaLocal(RS.cfg.inicio - 2 * DIA);
    for (const f of T.filas) { const fe = fecha10(f[ix.f]); if (!diasCerrados().includes(fe) || fe < desde) continue; const V = entregas(fe).filter((x) => norm(x.zona) === norm(f[ix.z])); if (!V.length) continue; const n = V.length, a = V.filter((x) => x.a_tiempo).length, x2 = V.filter((x) => x.estado === 'fallida').length; if (Number(f[ix.n]) !== n || Number(f[ix.a]) !== a || Number(f[ix.x]) !== x2) mal.push(`${fe} ${f[ix.z]} (${f[ix.n]}/${f[ix.a]}/${f[ix.x]}, esperado ${n}/${a}/${x2})`); }
    if (!T.filas.length) return 'La tabla está vacía.'; if (mal.length) return `No cuadra: ${lista(mal, 3)}.`;
    const c = (almacen() && almacen().data.cruces) || {}; return c.pbiDatabricks ? true : 'La tabla cuadra. Falta el informe de Power BI (Obtener datos → Azure Databricks → ruta.gold.sla_diario).';
  }
  const CHEQUEOS = [
    ['Seguridad', 'Credenciales del Event Hubs y del TMS en un Key Vault', chequeoKV],
    ['Streaming', 'ruta.silver.telemetria: un registro por evento, con el esquema normalizado', chequeoSilver],
    ['SLA', 'ruta.gold.entregas: cada pedido del plan con su estado y si llegó a tiempo', chequeoEntregas],
  ];

  // ---------------------------------------------------------------- tablero
  // el último día con reparto antes de T (los domingos no se reparte)
  const ayer = (T, n = 1) => { let f = RS.diaLocal(T), k = 0; while (k < n) { f = RS.sumarDias(f, -1); if (RS.dia(f).pedidos.length) k++; } return f; };
  const vehiculoKm = () => RS.VEHICULOS[(RS.cfg.semilla % 7) + 11];
  const TICKETS = [
    { id: 'RS-101', tipo: 'requerimiento', de: 'Operaciones', cuando: (I) => I, titulo: 'La telemetría de la flota en una tabla confiable', texto: 'Hoy la telemetría solo se ve en vivo en el mapa del proveedor. Necesitamos guardarla: un registro por evento, sin repetidos y con un formato único.', criterios: ['ruta.silver.telemetria: event_id, vehiculo, tipo, ts_evento, lat, lon, velocidad_kmh, pedido_id'], check: chequeoSilver },
    { id: 'RS-102', tipo: 'requerimiento', de: 'Lucía Paz · Dirección comercial', cuando: (I) => I, titulo: '¿Cumplimos lo que prometemos?', texto: 'Les prometemos a los clientes una ventana de 3 horas. Quiero saber, pedido por pedido, si llegamos a tiempo.', criterios: ['ruta.gold.entregas con todos los pedidos del plan de los días cerrados: estado y a_tiempo'], comentarios: ['Lucía: a tiempo es entregado (completado) dentro de la ventana. Si falló o no hay evento, no está a tiempo.'], check: chequeoEntregas },
    { id: 'RS-103', tipo: 'requerimiento', de: 'Seguridad', cuando: (I) => I, titulo: 'Credenciales en el Key Vault', texto: 'La cadena de conexión del Event Hubs y la API key del TMS no van en notebooks ni en repositorios.', criterios: ['Ambas en un Key Vault'], check: chequeoKV },
    { id: 'RS-104', tipo: 'pregunta', de: 'Lucía Paz · Dirección comercial', cuando: (I) => I + 10 * HORA, titulo: '¿Qué porcentaje llegó a tiempo ayer?',
      texto: (T) => `Para la reunión con el cliente más grande: ¿qué porcentaje de los pedidos del ${ayer(T)} (el último día con reparto) se entregaron dentro de la ventana prometida? Con un decimal.`,
      comentarios: ['Lucía: sobre todos los pedidos del plan de ese día, también los urgentes que se agregaron a la mañana.'],
      respuesta: { tipo: 'numero', unidad: '%', verificar: (v, T) => { const E = entregas(ayer(T)); const r = pct(E); if (Math.abs(v - r) <= 0.15) return true; if (Math.abs(v - pct(E.filter((x) => !x.urgente))) <= 0.15) return 'Te faltan los urgentes: se agregan al plan durante el día (vuelve a pedir el plan al TMS).'; if (Math.abs(v - pct(E.filter((x) => x.estado === 'completada'))) <= 0.15) return 'Calculaste sobre las entregas completadas; es sobre todos los pedidos del plan.'; return 'No coincide. Pedidos del plan de ese día (hora local), completados dentro de [ventana_inicio, ventana_fin].'; } } },
    { id: 'RS-105', tipo: 'pregunta', de: 'Supervisión de flota', cuando: (I) => I + 2 * DIA + 9 * HORA, titulo: '¿Dónde fallan más las entregas?',
      texto: (T) => `¿Qué zona tuvo más entregas fallidas el ${ayer(T, 2)} y el ${ayer(T)} (los dos días juntos)?`,
      respuesta: { tipo: 'texto', ayuda: 'La zona', verificar: (v, T) => { const c = {}; for (const k of [2, 1]) for (const x of entregas(ayer(T, k))) if (x.estado === 'fallida') c[x.zona] = (c[x.zona] || 0) + 1; const max = Math.max(...Object.values(c)); return Object.keys(c).filter((z) => c[z] === max).some((z) => norm(z) === norm(v)) || 'No es la de más fallidas. Cuenta eventos entrega_fallida (sin repetidos) por la zona del pedido, en hora local.'; } } },
    { id: 'RS-106', tipo: 'incidente', de: 'Supervisión de flota', cuando: (I, H) => H.firmware + 3 * HORA, titulo: 'La mitad de la flota aparece parada',
      texto: 'Desde esta mañana el tablero muestra velocidad 0 (o vacía) para V01 a V10, aunque están circulando. ¿Qué pasó?',
      comentarios: ['Proveedor de GPS: anoche actualizamos el firmware de 10 equipos a la versión 2.0. Está en las notas de la versión que mandamos hace un mes.', 'Tú: …¿qué notas?'],
      criterios: ['silver.telemetria con la velocidad y la hora correctas para los equipos con firmware 2.0', 'Un postmortem: qué validación te hubiera avisado antes que la supervisora'],
      check: async () => { const r = await chequeoSilver(); return r === true || !/firmware|speed_mps|milisegundos/.test(r) || r; } },
    { id: 'RS-107', tipo: 'pregunta', de: 'Supervisión de flota', cuando: (I, H) => H.reloj + DIA + 9 * HORA, titulo: 'V13 entrega en el futuro',
      texto: (T, H) => `Ayer (${RS.diaLocal(H.reloj + HORA)}) V13 aparece entregando pedidos antes de que pasen las cosas. ¿Cuántas horas está adelantado su reloj?`,
      comentarios: ['Tip: compara la hora del dispositivo con la hora en que Event Hubs recibió cada mensaje.'],
      respuesta: { tipo: 'numero', unidad: 'horas', verificar: (v) => Math.abs(v - 2) < 0.1 || 'No. Mira la diferencia entre ts_dispositivo y el timestamp de Kafka para V13 ese día (en los otros vehículos es de segundos).' } },
    { id: 'RS-108', tipo: 'incidente', de: 'Lucía Paz · Dirección comercial', cuando: (I, H) => H.apagon + DIA + 9 * HORA, titulo: 'El SLA de ayer cambió esta mañana',
      texto: 'Anoche el tablero decía que V07 no entregó nada después de las 13:00. Hoy dice otra cosa. ¿Cuál es el número verdadero y por qué cambió?',
      comentarios: ['Flota: V07 se quedó sin datos móviles a las 13:00. El equipo guardó todo y lo mandó cuando volvió al depósito, hoy a las 07:30.'],
      criterios: ['ruta.gold.entregas de V07 de ese día con el resultado real (vuelve a procesar con los eventos tardíos)', 'En el postmortem: cuánto tiempo esperas eventos tardíos antes de cerrar un día (tu "watermark") y qué haces con lo que llega después'],
      check: async () => { const T = await tabla('ruta.gold.entregas'); if (T.error) return T.error; const ip = colDe(T, 'pedido_id'), ie = colDe(T, 'estado'); const f = RS.diaLocal(RS.hitos().apagon + HORA); const V = entregas(f).filter((x) => x.vehiculo === 'V07'); const tuyo = new Map(T.filas.map((r) => [String(r[ip]), String(r[ie])])); const mal = V.filter((x) => tuyo.get(x.pedido_id) !== x.estado); return !mal.length || `${mal.length} pedidos de V07 del ${f} siguen con un estado viejo (${lista(mal.map((x) => x.pedido_id + ' ' + (tuyo.get(x.pedido_id) || 'falta')), 3)}).`; } },
    { id: 'RS-109', tipo: 'pregunta', de: 'Mantenimiento', cuando: (I) => I + DIA + 11 * HORA, titulo: '¿Cuántos km hizo la camioneta?',
      texto: (T) => `Para el plan de mantenimiento: ¿cuántos kilómetros recorrió ${vehiculoKm()} el ${ayer(T)}? Sin decimales.`,
      comentarios: ['Mantenimiento: sumen la distancia en línea recta (haversine) entre posiciones consecutivas de todos sus eventos, ordenados por la hora del evento. Sin repetidos.'],
      respuesta: { tipo: 'numero', unidad: 'km', verificar: (v, T) => { const k = kmDe(vehiculoKm(), ayer(T)); return Math.abs(v - k) <= Math.max(1, k * 0.02) || `No coincide (±2 %). ¿Ordenaste por la hora del evento y no por la de llegada? Los eventos que llegan juntos después de una zona sin señal vienen desordenados.`; } } },
    { id: 'RS-110', tipo: 'requerimiento', de: 'Operaciones', cuando: (I) => I + DIA + 15 * HORA, titulo: 'Que el tablero se actualice solo',
      texto: 'No podemos esperar al día siguiente: queremos el SLA del día actualizado cada 15 minutos. Usen una tabla de streaming sobre Kafka, que cada actualización lea solo lo nuevo.',
      criterios: ['Una STREAMING TABLE en el catálogo ruta que lea de read_kafka', 'Que se haya actualizado (REFRESH) al menos una vez después de crearla'],
      check: async () => { if (!(await cargar('databricks', () => window.DBSQL))) return 'No se pudo cargar Databricks.'; await window.DBSQL.init({ Store: almacen() }); const U = window.DBSQL.uc(); const C = (U.catalogs || {}).ruta; if (!C) return 'No existe el catálogo ruta.'; const ts = Object.values(C.schemas || {}).flatMap((S) => Object.entries(S.tables || {})).filter(([, t]) => t.tipo === 'STREAMING_TABLE' && t.st && t.st.deKafka); if (!ts.length) return 'No hay ninguna tabla de streaming sobre read_kafka (CREATE OR REFRESH STREAMING TABLE … AS SELECT … FROM STREAM read_kafka(…)).'; return ts.some(([, t]) => (t.st.refrescos || []).length >= 2) || 'La tabla de streaming existe pero todavía no la actualizaste: REFRESH STREAMING TABLE … (solo lee los mensajes nuevos desde el checkpoint).'; } },
    { id: 'RS-111', tipo: 'requerimiento', de: 'Lucía Paz · Dirección comercial', cuando: (I) => I + 2 * DIA + 9 * HORA, titulo: 'Tablero de SLA por zona',
      texto: 'Por día y zona: pedidos, cuántos a tiempo y cuántos fallidos. En Power BI.', criterios: ['ruta.gold.sla_diario: fecha, zona, pedidos, a_tiempo, fallidas', 'Informe de Power BI desde Databricks'], check: chequeoSla },
    { id: 'RS-112', tipo: 'pregunta', de: 'Plataforma', cuando: (I) => I + 2 * DIA + 14 * HORA, titulo: '¿Cuánto llega tarde?',
      texto: (T) => `Para definir cuánto esperar antes de cerrar un día: ¿cuántos eventos del ${ayer(T)} llegaron a Event Hubs más de 15 minutos después de la hora que reporta el dispositivo?`,
      comentarios: ['Plataforma: sin contar repetidos (de cada event_id, la primera vez que llegó).'],
      respuesta: { tipo: 'numero', unidad: 'eventos', verificar: (v, T) => { const n = eventosDe(ayer(T)).filter((x) => x.ing - (x.ts + x.desvio) > 15 * MIN).length; return v === n || 'No coincide. Diferencia entre el timestamp de Kafka y la hora del dispositivo (ts_dispositivo, o ts en el firmware 2), mayor a 15 minutos, una vez por event_id.'; } } },
  ];
  function panelTablero(el) {
    if (!window.TableroTickets) { setTimeout(() => panelTablero(el), 300); return; }
    window.TableroTickets.panel(el, { titulo: 'Tablero del equipo de datos de Ruta Sur', tickets: TICKETS, contexto: () => { Host.sincronizar(); return { I: RS.inicioDiaLocal(RS.cfg.inicio), H: RS.hitos(), t: ahora() }; }, datos: () => Host.datos(), guardar: () => Host.guardar(), hora: (T) => new Date(T - 3 * HORA).toISOString().replace('T', ' ').slice(0, 16) });
  }
  function panelRevisar(el) {
    el.innerHTML = `<div class="card mv-panel"><h4 style="margin-top:0">🔎 Revisar mi entrega</h4><p class="small muted">Compara tus tablas con lo que pasó de verdad en la calle (y con lo que ya llegó al stream).</p><button class="btn btn-primary btn-sm" data-revisar>Revisar ahora</button><ol class="pedalia-chequeos"></ol></div>`;
    const ol = el.querySelector('ol');
    el.querySelector('[data-revisar]').addEventListener('click', async (ev) => { const b = ev.currentTarget; b.disabled = true; b.textContent = 'Revisando…'; ol.innerHTML = ''; Host.sincronizar(); let bien = 0; for (const [gr, txt, f] of CHEQUEOS) { const li = document.createElement('li'); ol.append(li); let r; try { r = await f(); } catch (e) { r = String(e.message || e); } if (r === true) bien++; li.className = r === true ? 'ok' : 'falta'; li.innerHTML = `${r === true ? '✅' : '⬜'} <b>${esc(gr)}</b> · ${esc(txt)}${r === true ? '' : `<div class="small muted">${esc(r)}</div>`}`; } b.disabled = false; b.textContent = `Revisar de nuevo (${bien} de ${CHEQUEOS.length})`; });
  }
  function montar(root) { (root || document).querySelectorAll('[data-ruta]').forEach((el) => { if (el.dataset.montado) return; el.dataset.montado = '1'; const k = el.dataset.ruta; if (k === 'fuentes') panelFuentes(el); else if (k === 'revisar') panelRevisar(el); else if (k === 'tablero') panelTablero(el); }); }
  window.RutaSurProyecto = { montar, CHEQUEOS, TICKETS, verdad: { entregas, eventosDe, pct, kmDe, vehiculoKm } };
})();
