/* Red Analítica: estado de las fuentes, revisión automática y tablero del equipo.
 * Lecciones: <div data-red="fuentes"></div>, <div data-red="revisar"></div>, <div data-red="tablero"></div>.
 */
(function () {
  'use strict';
  const RA = window.RedAnalitica, Host = window.RedAnaliticaHost;
  if (!RA || !Host) return;
  const HORA = 3600000, DIA = 86400000, MIN = 60000;
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const num = (x) => (x == null || x === '' ? null : Number(String(x).replace(',', '.')));
  const lista = (xs, n = 4) => xs.slice(0, n).join(', ') + (xs.length > n ? ` y ${xs.length - n} más` : '');
  const labDe = (x) => { const n = norm(x); return Object.keys(RA.LABS).find((k) => n === k || n.includes(k)) || null; };
  const TOL = { GLU: 0.6, HB: 0.06, COL: 0.6, CRE: 0.02, TSH: 0.011 };

  // ---------------------------------------------------------------- panel: el servidor ahora
  function panelFuentes(el) {
    const pintar = () => {
      Host.sincronizar(); const S = RA.servidor(); const t = RA.ahora(); const hoy = RA.diaLocal(t); const ayer = RA.sumarDias(hoy, -1);
      el.innerHTML = `<div class="card mv-panel"><h4 style="margin-top:0">🧪 El servidor SFTP, ahora</h4>
        <p class="small muted">Hora de la red: <b>${esc(new Date(t - 3 * HORA).toISOString().slice(0, 16).replace('T', ' '))}</b> (UTC-3). Archivos de ayer (${esc(ayer)}):</p>
        <div class="mv-grilla">${Object.entries(RA.LABS).map(([k, L]) => { const f = S.filter((x) => x.e.lab === k && x.e.fecha === ayer); return `<div><b>${esc(L.nombre)}</b><br><span class="small">${f.length ? f.map((x) => `${esc(x.ruta.split('/').pop())} · llegó ${esc(new Date(x.mtime - 3 * HORA).toISOString().slice(11, 16))}`).join('<br>') : '<span style="color:var(--danger,#b91c1c)">todavía no llegó</span>'}</span></div>`; }).join('')}</div>
        <p class="small muted" style="margin-bottom:0">${S.length} archivos en el servidor (se borran a los 7 días).</p></div>`;
    };
    pintar(); const iv = setInterval(() => { if (!document.body.contains(el)) return clearInterval(iv); pintar(); }, 60000);
  }

  // ---------------------------------------------------------------- revisión
  const cargar = async (g, listo) => { try { if (!listo() && window.__cargarGrupo) await window.__cargarGrupo(g); } catch (e) { /* sin red */ } return listo(); };
  async function tabla(nombre) {
    try {
      if (!(await cargar('databricks', () => window.DBSQL))) throw new Error('No se pudo cargar Databricks');
      await window.DBSQL.init({ Store: almacen() }); const r = await window.DBSQL.ejecutar(`SELECT * FROM ${nombre}`); const u = Array.isArray(r) ? r[r.length - 1] : r;
      if (!u || u.error) throw new Error(u && u.error ? String(u.error.message || u.error) : 'sin resultado');
      return { cols: (u.cols || []).map((c) => String(c).toLowerCase()), filas: u.filas || [] };
    } catch (e) { return { error: e.message.split('\n')[0] }; }
  }
  const colDe = (T, ...n) => { for (const x of n) { const i = T.cols.indexOf(x); if (i >= 0) return i; } return -1; };
  const clave = (lab, m, e) => `${lab}|${m}|${e}`;
  const olvidoActivo = () => RA.ahora() >= RA.hitos().olvido;
  function esperado() {
    const t = RA.ahora(); const t0 = RA.inicioDiaLocal(t); const W = RA.mundo(); const fuera = olvidoActivo() ? W.olvidado : null;
    const ahoraM = new Map(RA.vigentes(t).filter((x) => x.p !== fuera).map((x) => [clave(x.lab, x.muestra, x.estudio), x]));
    const antes = RA.vigentes(t0).filter((x) => x.p !== fuera); const v1 = new Map(RA.vigentes(t - 6 * HORA).map((x) => [clave(x.lab, x.muestra, x.estudio), x]));
    return { ahoraM, antes, v1, fuera };
  }
  async function revisarSilver() {
    const T = await tabla('red.silver.resultados'); if (T.error) return { msg: `No se pudo leer red.silver.resultados: ${T.error}` };
    const ix = { lab: colDe(T, 'laboratorio'), m: colDe(T, 'id_muestra', 'muestra'), e: colDe(T, 'estudio'), v: colDe(T, 'resultado'), f: colDe(T, 'fecha_toma'), p: colDe(T, 'paciente_id') };
    const falta = Object.entries(ix).filter(([, i]) => i < 0).map(([k]) => ({ lab: 'laboratorio', m: 'id_muestra', e: 'estudio', v: 'resultado', f: 'fecha_toma', p: 'paciente_id' }[k]));
    if (falta.length) return { msg: `Faltan columnas: ${falta.join(', ')} (tiene ${T.cols.join(', ')}).` };
    return { T, ix };
  }
  async function chequeoSilver() {
    const r = await revisarSilver(); if (r.msg) return r.msg; const { T, ix } = r; const { ahoraM, antes, v1, fuera } = esperado();
    const tuyo = new Map(); const dup = []; const raros = [];
    for (const f of T.filas) { const lab = labDe(f[ix.lab]); const k = clave(lab, String(f[ix.m]), String(f[ix.e]).toUpperCase()); if (!lab) { raros.push(String(f[ix.lab])); continue; } if (tuyo.has(k)) dup.push(k); tuyo.set(k, f); }
    const m = [];
    if (raros.length) m.push(`filas con un laboratorio que no existe (${lista([...new Set(raros)], 3)}): ¿se coló el total del final del archivo de Costa?`);
    if (dup.length) m.push(`${dup.length} resultados repetidos (${lista(dup, 3)}): Cerro a veces repite filas, y los reenvíos (_v2) reemplazan al archivo anterior`);
    const faltan = antes.filter((x) => !tuyo.has(clave(x.lab, x.muestra, x.estudio)));
    if (faltan.length) { const porLab = {}; for (const x of faltan) porLab[x.lab] = (porLab[x.lab] || 0) + 1; m.push(`faltan ${faltan.length} resultados de archivos ya entregados (${Object.entries(porLab).map(([l, n]) => `${l}: ${n}`).join(', ')})`); }
    const sobran = [...tuyo.keys()].filter((k) => !ahoraM.has(k));
    if (sobran.length) m.push(`sobran ${sobran.length} resultados que no corresponden (${lista(sobran, 3)})${fuera && sobran.some((k) => RA.mundo().resultados.some((x) => x.p === fuera && clave(x.lab, x.muestra, x.estudio) === k)) ? ' — algunos son de la persona que pidió el borrado de sus datos' : ''}`);
    const malV = {}, malF = {}; let sur18 = 0, hbx10 = 0, serial = 0, utc = 0;
    for (const [k, f] of tuyo) {
      const x = ahoraM.get(k); if (!x) continue; const v = num(f[ix.v]); const viejo = v1.get(k);
      const okV = Math.abs(v - x.valor) <= TOL[x.estudio] || (viejo && Math.abs(v - viejo.valor) <= TOL[x.estudio]);
      if (!okV) { (malV[x.lab] = malV[x.lab] || []).push(k); if (x.lab === 'sur' && x.estudio === 'GLU' && Math.abs(v * 18.016 - x.valor) < 1) sur18++; if (x.estudio === 'HB' && Math.abs(v / 10 - x.valor) < 0.06) hbx10++; }
      const ft = String(f[ix.f] ?? '').slice(0, 10);
      if (ft !== x.fecha) { (malF[x.lab] = malF[x.lab] || []).push(k); if (/^\d{4,5}(\.|$)/.test(String(f[ix.f])) || /^(1899|1900)/.test(ft)) serial++; if (x.lab === 'cerro' && ft === RA.sumarDias(x.fecha, 1)) utc++; }
    }
    if (Object.keys(malV).length) m.push(`resultados con otro valor: ${Object.entries(malV).map(([l, ks]) => `${l} ${ks.length}`).join(', ')}${sur18 || hbx10 ? ' — el Sur informa en unidades internacionales (mmol/L, g/L, µmol/L): hay que convertir a la unidad canónica' : ''}`);
    if (Object.keys(malF).length) m.push(`fecha_toma distinta: ${Object.entries(malF).map(([l, ks]) => `${l} ${ks.length}`).join(', ')}${serial ? ' — Costa manda la fecha como número de serie de Excel (días desde 1899-12-30)' : ''}${utc ? ' — Cerro manda la hora en UTC: una urgencia de las 22:00 en Ciudad del Río es del día anterior' : ''}`);
    return !m.length || m.join(' · ');
  }
  async function chequeoSeudonimos() {
    const r = await revisarSilver(); if (r.msg) return r.msg; const { T, ix } = r; const W = RA.mundo();
    const docs = new Set(W.pacientes.map((p) => String(p.doc))); const nombres = W.pacientes.map((p) => [norm(p.nombre), norm(p.apellido)]);
    let pii = null;
    for (const f of T.filas) for (const c of f) { if (c == null || typeof c === 'number' && !Number.isInteger(c)) continue; const s = String(c); const dig = s.replace(/\D/g, ''); if (dig.length >= 7 && docs.has(dig)) { pii = 'un número de documento'; break; } const n = norm(s); if (n.length > 6 && nombres.some(([a, b]) => n.includes(a) && n.includes(b))) { pii = 'un nombre'; break; } }
    if (pii) return `La tabla tiene ${pii} de paciente. En silver no puede quedar nada que identifique a una persona: reemplázalo por paciente_id (un seudónimo).`;
    const real = new Map(W.resultados.map((x) => [clave(x.lab, x.muestra, x.estudio), x.p.doc]));
    const porDoc = new Map(), porId = new Map();
    for (const f of T.filas) { const d = real.get(clave(labDe(f[ix.lab]), String(f[ix.m]), String(f[ix.e]).toUpperCase())); if (d == null) continue; const id = String(f[ix.p]); (porDoc.get(d) || porDoc.set(d, new Set()).get(d)).add(id); (porId.get(id) || porId.set(id, new Set()).get(id)).add(d); }
    const partidos = [...porDoc.values()].filter((s) => s.size > 1).length; const mezclados = [...porId.values()].filter((s) => s.size > 1).length;
    if (partidos) return `${partidos} pacientes tienen más de un paciente_id: el mismo documento llega con formatos distintos (41.234.567, 41234567, CI 41234567). Normaliza a solo dígitos antes de calcular el seudónimo.`;
    if (mezclados) return `${mezclados} paciente_id corresponden a más de una persona: el seudónimo tiene que salir del documento normalizado (por ejemplo sha2 de una sal + el documento).`;
    return true;
  }
  async function chequeoKV() {
    const kv = (window.CloudSim && window.CloudSim.az && window.CloudSim.az().kv) || {};
    const vals = Object.values(kv).map((V) => Object.values(V.secrets || {}).map((x) => (typeof x === 'string' ? x : x && x.value)));
    const ok = vals.some((v) => v.some((x) => /BEGIN OPENSSH PRIVATE KEY/.test(x || '')) && v.length >= 2);
    return ok || 'Guarda en un Key Vault la clave privada SSH (el contenido del archivo) y la sal del seudónimo, como secretos del mismo vault.';
  }
  async function chequeoGold() {
    const T = await tabla('red.gold.resultados_diarios'); if (T.error) return `No se pudo leer red.gold.resultados_diarios: ${T.error}`;
    const ix = { f: colDe(T, 'fecha_toma', 'fecha'), l: colDe(T, 'laboratorio'), e: colDe(T, 'estudio'), n: colDe(T, 'resultados'), x: colDe(T, 'fuera_de_rango') };
    if (Object.values(ix).some((i) => i < 0)) return 'La tabla necesita fecha_toma, laboratorio, estudio, resultados y fuera_de_rango.';
    const { ahoraM } = esperado(); const ag = new Map();
    for (const x of ahoraM.values()) { const k = `${x.fecha}|${x.lab}|${x.estudio}`; const a = ag.get(k) || { n: 0, f: 0 }; a.n++; if (RA.fueraDeRango(x)) a.f++; ag.set(k, a); }
    const mal = [];
    for (const f of T.filas) { const k = `${String(f[ix.f]).slice(0, 10)}|${labDe(f[ix.l])}|${String(f[ix.e]).toUpperCase()}`; const a = ag.get(k); if (!a) continue; if (Number(f[ix.n]) !== a.n || Number(f[ix.x]) !== a.f) mal.push(`${k} (${f[ix.n]}/${f[ix.x]}, esperado ${a.n}/${a.f})`); }
    if (!T.filas.length) return 'La tabla está vacía.';
    if (mal.length) return `No cuadra: ${lista(mal, 3)}. fuera_de_rango usa los rangos canónicos de la documentación.`;
    const c = (almacen() && almacen().data.cruces) || {}; return c.pbiDatabricks ? true : 'La tabla cuadra. Falta el informe en Power BI (Obtener datos → Azure Databricks → red.gold.resultados_diarios).';
  }
  const CHEQUEOS = [
    ['Seguridad', 'La clave SSH y la sal están en un Key Vault', chequeoKV],
    ['SFTP', 'Te conectaste al servidor y bajaste archivos', async () => { const D = Host.datos() || {}; return (D.descargas > 0) || 'Todavía no bajaste nada del servidor SFTP (red accesos, red alta-clave, sftp).'; }],
    ['Datos', 'red.silver.resultados unifica los 5 laboratorios (códigos, unidades, fechas, sin repetidos)', chequeoSilver],
    ['Privacidad', 'red.silver.resultados no identifica a nadie y paciente_id es consistente entre laboratorios', chequeoSeudonimos],
  ];

  // ---------------------------------------------------------------- tablero
  const fechas = (T, n) => Array.from({ length: n }, (_, k) => RA.sumarDias(RA.diaLocal(T), -(n - k)));
  const vig = () => RA.vigentes(RA.ahora());
  const pacientesGlu = (fs) => new Set(vig().filter((x) => x.estudio === 'GLU' && fs.includes(x.fecha) && x.valor >= 126).map((x) => x.p.doc)).size;
  const TICKETS = [
    { id: 'RA-101', tipo: 'requerimiento', de: 'Dra. Silvia Prado · Dirección médica', cuando: (I) => I, titulo: 'Un solo lugar con los resultados de los 5 laboratorios',
      texto: 'Cada laboratorio manda lo suyo y nadie puede ver a un paciente completo. Necesitamos una tabla única, con códigos y unidades iguales para todos. La especificación está en "La entrega".',
      criterios: ['red.silver.resultados con todos los resultados de los archivos ya entregados', 'Estudios en código canónico y resultados en la unidad canónica', 'Sin repetidos; los reenvíos reemplazan al archivo anterior'], check: chequeoSilver },
    { id: 'RA-102', tipo: 'requerimiento', de: 'Delegado de protección de datos', cuando: (I) => I, titulo: 'Seudonimizar a los pacientes',
      texto: 'Son datos de salud: el equipo de datos no puede trabajar con nombres ni documentos. Cada paciente tiene que tener un identificador estable que no permita volver a la persona sin una clave que guarda seguridad.',
      criterios: ['Ninguna columna de silver con nombre, documento o fecha de nacimiento', 'paciente_id igual para la misma persona en todos los laboratorios'], check: chequeoSeudonimos },
    { id: 'RA-103', tipo: 'requerimiento', de: 'Seguridad', cuando: (I) => I, titulo: 'Clave SSH y sal en el Key Vault', texto: 'La clave privada SSH y la sal del seudónimo no pueden vivir en una laptop ni en un repositorio.', criterios: ['Ambas en un Key Vault'], check: chequeoKV },
    { id: 'RA-104', tipo: 'pregunta', de: 'Dra. Silvia Prado · Dirección médica', cuando: (I) => I + 10 * HORA, titulo: '¿Cuántos pacientes con glucosa alta?',
      texto: (T) => { const f = fechas(T, 3); return `Para el programa de diabetes: ¿cuántos pacientes distintos tuvieron glucosa en ayunas de 126 mg/dL o más en muestras tomadas entre el ${f[0]} y el ${f[2]}?`; },
      comentarios: ['Dra. Prado: pacientes, no análisis. Si alguien se hizo dos análisis, o fue a dos laboratorios, cuenta una vez.', 'Tú: ¿días en hora de Ciudad del Río?', 'Dra. Prado: sí, el día de la toma de la muestra.'],
      respuesta: { tipo: 'numero', unidad: 'pacientes', verificar: (v, T) => { const f = fechas(T, 3); const n = pacientesGlu(f); if (v === n) return true; const filas = vig().filter((x) => x.estudio === 'GLU' && f.includes(x.fecha) && x.valor >= 126); if (v === filas.length) return 'Contaste análisis, no pacientes.'; const sinSur = new Set(filas.filter((x) => x.lab !== 'sur').map((x) => x.p.doc)).size; if (v === sinSur) return 'Te faltan los del Sur: su glucosa viene en mmol/L (126 mg/dL ≈ 7,0 mmol/L).'; return 'No coincide. Pacientes distintos (el documento llega con formatos distintos según el laboratorio), glucosa en mg/dL, día de toma en hora local.'; } } },
    { id: 'RA-105', tipo: 'incidente', de: 'Laboratorio Centro', cuando: (I, H) => H.formatoCentro + DIA + 9 * HORA, titulo: 'Centro: "ayer migramos de sistema"',
      texto: '¿Les llegan bien nuestros archivos? El fin de semana migramos el sistema del laboratorio. Debería ser igual que antes.',
      comentarios: ['Tú (después de mirar el archivo): no es igual. Cambió la codificación, el formato de fecha y hay una columna nueva en el medio.'],
      criterios: ['Los resultados de Centro de los días después de la migración están en silver, con valores y fechas correctos', 'Un postmortem: cómo te diste cuenta y qué validación pondrías para enterarte el mismo día'],
      check: async () => { const r = await chequeoSilver(); if (r === true) return true; return /centro/.test(r) ? r : (await (async () => { const S = await revisarSilver(); if (S.msg) return S.msg; const n = S.T.filas.filter((f) => labDe(f[S.ix.lab]) === 'centro' && String(f[S.ix.f]).slice(0, 10) >= RA.diaLocal(RA.hitos().formatoCentro)).length; return n ? true : 'No hay resultados de Centro posteriores a la migración en silver.'; })()); } },
    { id: 'RA-106', tipo: 'incidente', de: 'Laboratorio Sur', cuando: (I, H) => H.correccionSur + 30 * MIN, titulo: 'Sur reenvió un archivo corregido',
      texto: (T, H) => `Encontramos un error de calibración en un equipo: subimos sur_resultados_${RA.diaLocal(H.correccionSur - DIA)}_v2.jsonl con los valores corregidos. Reemplaza al anterior.`,
      criterios: ['Los resultados de ese día en silver son los del _v2 (sin repetidos)'],
      check: async () => { const S = await revisarSilver(); if (S.msg) return S.msg; const H = RA.hitos(); const e = RA.mundo().entregas.find((x) => x.lab === 'sur' && x.version === 2); const corr = e.filas.filter((x) => x.corregido); const tuyo = new Map(S.T.filas.map((f) => [clave(labDe(f[S.ix.lab]), String(f[S.ix.m]), String(f[S.ix.e]).toUpperCase()), f])); const mal = corr.filter((x) => { const f = tuyo.get(clave('sur', x.muestra, x.estudio)); return !f || Math.abs(num(f[S.ix.v]) - x.valor) > TOL[x.estudio]; }); void H; return !mal.length || `${mal.length} de los ${corr.length} resultados corregidos siguen con el valor viejo (o faltan): ${lista(mal.map((x) => x.muestra + ' ' + x.estudio), 3)}.`; } },
    { id: 'RA-107', tipo: 'incidente', de: 'Guardia de datos', cuando: (I, H) => H.faltaCerro + DIA + 14 * HORA, titulo: 'Falta un archivo',
      texto: (T) => `El tablero de hoy está incompleto. ¿Qué laboratorios no entregaron todavía el archivo del ${RA.sumarDias(RA.diaLocal(T), -1)}?`,
      comentarios: ['Tip: el servidor SFTP es la fuente de verdad de qué llegó y cuándo (ls -l).'],
      respuesta: { tipo: 'texto', ayuda: 'Laboratorios separados por coma', verificar: (v, T) => { const f = RA.sumarDias(RA.diaLocal(T), -1); const falt = Object.keys(RA.LABS).filter((L) => !RA.mundo().entregas.some((e) => e.lab === L && e.fecha === f && e.llega <= T)); const dados = String(v).split(/[,;y]+/).map(labDe).filter(Boolean); return (falt.length === new Set(dados).size && falt.every((L) => dados.includes(L))) || 'No coincide con lo que hay en el servidor a esa hora.'; } } },
    { id: 'RA-108', tipo: 'requerimiento', de: 'Delegado de protección de datos', cuando: (I, H) => H.olvido, titulo: 'Derecho al olvido de un paciente',
      texto: () => `La persona con documento ${RA.mundo().olvidado.doc} pidió que se eliminen sus datos. Tienen 72 horas. Ojo: la atendieron en más de un laboratorio y cada uno escribe el documento a su manera.`,
      criterios: ['Ningún resultado de esa persona en red.silver.resultados (ni en gold)', 'Los archivos del SFTP no los controlamos nosotros: anota en tu postmortem qué copias tuyas tuviste que limpiar (bronze, descargas)'],
      check: async () => { const S = await revisarSilver(); if (S.msg) return S.msg; const W = RA.mundo(); const suyos = new Set(W.resultados.filter((x) => x.p === W.olvidado).map((x) => clave(x.lab, x.muestra, x.estudio))); const quedan = S.T.filas.filter((f) => suyos.has(clave(labDe(f[S.ix.lab]), String(f[S.ix.m]), String(f[S.ix.e]).toUpperCase()))).length; return !quedan || `Quedan ${quedan} resultados de esa persona en silver.`; } },
    { id: 'RA-109', tipo: 'pregunta', de: 'Comité de calidad', cuando: (I) => I + DIA + 10 * HORA, titulo: '¿Qué estudio sale más veces fuera de rango?',
      texto: (T) => { const f = fechas(T, 3); return `¿Qué estudio tuvo el mayor porcentaje de resultados fuera del rango de referencia entre el ${f[0]} y el ${f[2]}?`; },
      comentarios: ['Calidad: usen los rangos canónicos de la documentación, no los de cada laboratorio.'],
      respuesta: { tipo: 'texto', ayuda: 'El código del estudio (GLU, HB, COL, CRE, TSH)', verificar: (v, T) => { const f = fechas(T, 3); const L = vig().filter((x) => f.includes(x.fecha)); const pct = Object.keys(RA.ESTUDIOS).map((e) => { const xs = L.filter((x) => x.estudio === e); return [e, xs.filter(RA.fueraDeRango).length / (xs.length || 1)]; }); const max = Math.max(...pct.map((x) => x[1])); const g = pct.filter((x) => Math.abs(x[1] - max) < 1e-9).map((x) => x[0]); return g.includes(String(v).trim().toUpperCase()) || g.some((e) => norm(RA.ESTUDIOS[e].nombre) === norm(v)) || 'No es el de mayor porcentaje. ¿Convertiste las unidades del Sur antes de comparar con los rangos?'; } } },
    { id: 'RA-110', tipo: 'requerimiento', de: 'Plataforma', cuando: (I) => I + DIA + 15 * HORA, titulo: 'Ingesta diaria automática',
      texto: 'Que cada mañana, cuando ya llegaron los archivos, se carguen solos. Un DAG en Airflow que dispare el job de Databricks.',
      criterios: ['Un DAG con "red" en el dag_id, programado una vez por día', 'Que dispare un job de Databricks', 'Una corrida exitosa (o airflow dags test en verde)'],
      check: async () => { if (!(await cargar('airflow', () => window.AirflowMotor))) return 'No se pudo cargar Airflow.'; const AM = window.AirflowMotor; try { await AM.parsear(); } catch (e) { /* nada */ } const d = (AM.bolsa().dags || []).find((x) => /red/i.test(x.id)); if (!d) return 'No hay ningún DAG con "red" en el dag_id en ~/airflow/dags.'; if (!/@daily|^\d{1,2} \d{1,2} \* \* \*$/.test(String((d.sched || {}).txt || '').trim())) return `El DAG ${d.id} no está programado una vez por día.`; if (!JSON.stringify(d.tasks || []).includes('Databricks')) return `El DAG ${d.id} no dispara Databricks.`; return (AM.runs(d.id) || []).some((r) => r.state === 'success') || !!(AM.st().pruebasOk || {})[d.id] || `El DAG ${d.id} todavía no tiene una corrida exitosa.`; } },
    { id: 'RA-111', tipo: 'requerimiento', de: 'Dra. Silvia Prado · Dirección médica', cuando: (I) => I + 2 * DIA + 9 * HORA, titulo: 'Tablero de actividad por laboratorio',
      texto: 'Quiero ver por día, laboratorio y estudio cuántos resultados hubo y cuántos fuera de rango. En Power BI.',
      criterios: ['red.gold.resultados_diarios: fecha_toma, laboratorio, estudio, resultados, fuera_de_rango', 'Un informe de Power BI que la importe desde Databricks'], check: chequeoGold },
    { id: 'RA-112', tipo: 'pregunta', de: 'Gerencia de operaciones', cuando: (I) => I + 2 * DIA + 15 * HORA, titulo: '¿Quién entrega más tarde?',
      texto: (T) => `Vamos a renegociar los horarios. Mirando los archivos de los últimos 5 días (hasta el ${RA.sumarDias(RA.diaLocal(T), -1)}), ¿qué laboratorio entrega más tarde en promedio?`,
      comentarios: ['Operaciones: la hora en que el archivo apareció en el servidor. Sin contar reenvíos.'],
      respuesta: { tipo: 'texto', ayuda: 'El laboratorio', verificar: (v, T) => { const fs = fechas(T, 5); const prom = Object.keys(RA.LABS).map((L) => { const es = RA.mundo().entregas.filter((e) => e.lab === L && e.version === 1 && fs.includes(e.fecha) && e.llega <= T); return [L, es.reduce((a, e) => a + (e.llega - RA.msDeDia(e.fecha) - DIA), 0) / (es.length || 1)]; }); const max = Math.max(...prom.map((x) => x[1])); return prom.filter((x) => x[1] === max).some((x) => x[0] === labDe(v)) || 'No es el que entrega más tarde en promedio. Mira la hora de cada archivo con ls -l en el SFTP.'; } } },
  ];
  function panelTablero(el) {
    if (!window.TableroTickets) { setTimeout(() => panelTablero(el), 300); return; }
    window.TableroTickets.panel(el, { titulo: 'Tablero del equipo de datos de Red Analítica', tickets: TICKETS,
      contexto: () => { Host.sincronizar(); return { I: RA.inicioDiaLocal(RA.cfg.inicio), H: RA.hitos(), t: RA.ahora() }; },
      datos: () => Host.datos(), guardar: () => Host.guardar(), hora: (T) => new Date(T - 3 * HORA).toISOString().replace('T', ' ').slice(0, 16) });
  }
  function panelRevisar(el) {
    el.innerHTML = `<div class="card mv-panel"><h4 style="margin-top:0">🔎 Revisar mi entrega</h4><p class="small muted">Lee tus herramientas (Key Vault, Databricks) y las compara con lo que mandaron de verdad los laboratorios.</p><button class="btn btn-primary btn-sm" data-revisar>Revisar ahora</button><ol class="pedalia-chequeos"></ol></div>`;
    const ol = el.querySelector('ol');
    el.querySelector('[data-revisar]').addEventListener('click', async (ev) => {
      const b = ev.currentTarget; b.disabled = true; b.textContent = 'Revisando…'; ol.innerHTML = ''; Host.sincronizar(); let bien = 0;
      for (const [g, txt, f] of CHEQUEOS) { const li = document.createElement('li'); li.innerHTML = `<span class="spinner"></span> <b>${esc(g)}</b> · ${esc(txt)}`; ol.append(li); let r; try { r = await f(); } catch (e) { r = String(e.message || e); } if (r === true) bien++; li.className = r === true ? 'ok' : 'falta'; li.innerHTML = `${r === true ? '✅' : '⬜'} <b>${esc(g)}</b> · ${esc(txt)}${r === true ? '' : `<div class="small muted">${esc(r)}</div>`}`; }
      b.disabled = false; b.textContent = `Revisar de nuevo (${bien} de ${CHEQUEOS.length})`;
    });
  }
  function montar(root) {
    (root || document).querySelectorAll('[data-red]').forEach((el) => { if (el.dataset.montado) return; el.dataset.montado = '1'; const k = el.dataset.red; if (k === 'fuentes') panelFuentes(el); else if (k === 'revisar') panelRevisar(el); else if (k === 'tablero') panelTablero(el); });
  }
  window.RedAnaliticaProyecto = { montar, CHEQUEOS, TICKETS };
})();
