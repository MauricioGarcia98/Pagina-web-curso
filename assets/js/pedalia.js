/* Pedalia: la empresa del proyecto integrador. Una red de bicicletas compartidas (ficticia) cuyo sistema
 * exporta archivos todos los días. Los datos son nuevos para cada estudiante: salen de un generador con una
 * semilla propia, así que nadie tiene los mismos números y no están en ninguna otra parte del curso.
 *
 * - Pedalia.generar(dia): los archivos de un día (viajes, mantenimientos) y el maestro de estaciones.
 * - Pedalia.verdad(dia): lo que tiene que dar el proyecto si las reglas del contrato de datos se aplican bien
 *   (para el panel "Revisar mi proyecto").
 * - Comando de terminal `pedalia exportar --dia N`: deja los archivos en ~/pedalia/entrega, como cuando el
 *   equipo de la app te los manda.
 * - Lecciones: <div data-pedalia="entrega"></div> y <div data-pedalia="revisar"></div>.
 */
(function () {
  'use strict';
  const DIAS = ['2026-11-09', '2026-11-10', '2026-11-11'];
  const BARRIOS = ['Puerto Viejo', 'La Loma', 'Centro', 'Los Álamos', 'Villa Sol', 'El Molino'];
  const NOMBRES = ['Plaza Mayor', 'Mercado Central', 'Terminal Norte', 'Rambla Este', 'Parque Lineal', 'Hospital Viejo', 'Universidad', 'Dique Seco',
    'Estación Sur', 'Biblioteca', 'Cerro Bajo', 'Puente Azul', 'Faro', 'Plaza de los Pinos', 'Club Náutico', 'Avenida del Río', 'Molino Rojo', 'Feria Franca',
    'Escuela 12', 'Cancha Grande', 'Polo Tecnológico', 'Costanera', 'Jardín Botánico', 'Barrio Obrero'];
  const N_BICIS = 1500; // flota de una red mediana: ~1.500 bicis y ~4.800 viajes en un día hábil

  // ---------------------------------------------------------------- semilla del estudiante
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  function semilla() {
    const S = almacen();
    if (S) {
      S.data.pedalia = S.data.pedalia || {};
      if (!S.data.pedalia.semilla) { S.data.pedalia.semilla = 1000 + Math.floor(Math.random() * 899000); try { S.save(); } catch (e) { /* sin almacenamiento */ } }
      return S.data.pedalia.semilla;
    }
    return 4242;
  }
  function azar(n) {
    let a = n >>> 0;
    const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return { r, int: (x, y) => x + Math.floor(r() * (y - x + 1)), chance: (p) => r() < p, pick: (l) => l[Math.floor(r() * l.length)], pickW(l, w) { const tot = w.reduce((s, x) => s + x, 0); let u = r() * tot; for (let i = 0; i < l.length; i++) { u -= w[i]; if (u <= 0) return l[i]; } return l[l.length - 1]; } };
  }
  const pad = (n, k = 2) => String(n).padStart(k, '0');
  const fmtTs = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  const fmtLatino = (d) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  const fechaDe = (dia) => { if (/^\d{4}-\d{2}-\d{2}$/.test(String(dia))) return DIAS.includes(String(dia)) ? String(dia) : null; const i = Number(dia); return i >= 1 && i <= DIAS.length ? DIAS[i - 1] : null; };

  // ---------------------------------------------------------------- generador
  function estaciones(s = semilla()) {
    const R = azar(s * 7 + 1);
    return NOMBRES.map((nombre, i) => ({ estacion_id: i + 1, nombre, barrio: BARRIOS[i % BARRIOS.length], capacidad: R.int(12, 30), lat: Number((-34.88 - R.r() * 0.06).toFixed(5)), lon: Number((-56.12 - R.r() * 0.09).toFixed(5)), en_servicio_desde: `2025-${pad(R.int(1, 12))}-${pad(R.int(1, 28))}` }));
  }
  // los viajes "reales" de un día (sin la suciedad de la exportación) y la exportación con sus problemas
  function viajesDelDia(fecha, s = semilla()) {
    const nDia = DIAS.indexOf(fecha) + 1;
    const R = azar(s * 31 + nDia * 977);
    const base = Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10));
    const lluvia = nDia === 2; // el martes llovió: menos viajes
    const n = Math.round((4800 + R.int(-300, 500)) * (lluvia ? 0.72 : 1));
    const horas = Array.from({ length: 18 }, (_, i) => i + 6), pesos = horas.map((h) => (h === 8 || h === 18 ? 10 : h === 7 || h === 9 || h === 17 || h === 19 ? 7 : h >= 12 && h <= 14 ? 5 : h >= 22 ? 1.5 : 3));
    const reales = [];
    for (let i = 0; i < n; i++) {
      const h = R.pickW(horas, pesos);
      const inicio = new Date(base + h * 3600e3 + R.int(0, 59) * 60e3 + R.int(0, 59) * 1e3);
      const largo = R.chance(0.04) ? R.int(60, 140) : Math.round(4 + Math.pow(R.r(), 1.8) * 48);
      const fin = new Date(inicio.getTime() + largo * 60e3 + R.int(0, 59) * 1e3);
      const origen = R.pickW([...Array(24)].map((_, k) => k + 1), [...Array(24)].map((_, k) => (k % 6 === 2 ? 3 : k % 6 === 0 ? 2 : 1)));
      let destino = R.int(1, 24); if (destino === origen) destino = (destino % 24) + 1;
      const tipo = R.chance(0.68) ? 'abono' : 'pase_dia';
      const minutos = (fin - inicio) / 60e3;
      const monto = tipo === 'abono' ? (minutos <= 30 ? 0 : Math.ceil((minutos - 30) / 15) * 150) : 450 + (minutos > 45 ? Math.ceil((minutos - 45) / 15) * 150 : 0);
      const v = { viaje_id: 1000000 + nDia * 100000 + i, bici_id: `B-${pad(R.int(1, N_BICIS), 4)}`, estacion_origen: origen, estacion_destino: destino, inicio, fin, tipo_usuario: tipo, monto };
      // problemas reales de la fuente
      if (R.chance(0.015)) v.problema = 'en_curso'; // la bici no se devolvió antes de exportar
      else if (origen === 13 && R.chance(0.35)) v.problema = 'reloj'; // el reloj de la estación 13 atrasa
      else if (R.chance(0.012)) v.problema = 'fuera'; // la dejaron fuera de una estación
      reales.push(v);
    }
    return { reales, R, nDia };
  }
  function generar(dia, s = semilla()) {
    const fecha = fechaDe(dia); if (!fecha) throw new Error(`Pedalia exporta los días ${DIAS.join(', ')} (o 1, 2, 3).`);
    const { reales, R, nDia } = viajesDelDia(fecha, s);
    const latino = nDia === 3; // el día 3 la app se actualizó y cambió el formato de las fechas (sin avisar)
    const ts = (d) => (latino ? fmtLatino(d) : fmtTs(d));
    const filas = reales.map((v) => {
      let fin = v.fin, destino = v.estacion_destino, monto = v.monto;
      if (v.problema === 'en_curso') return [v.viaje_id, v.bici_id, v.estacion_origen, '', ts(v.inicio), '', v.tipo_usuario, ''];
      if (v.problema === 'reloj') fin = new Date(v.inicio.getTime() - R.int(5, 40) * 60e3);
      if (v.problema === 'fuera') destino = 99;
      return [v.viaje_id, v.bici_id, v.estacion_origen, destino, ts(v.inicio), ts(fin), v.tipo_usuario, monto.toFixed(2)];
    });
    // el sistema reenvía algunas filas (reintentos de la API): duplicados exactos
    const dups = Math.round(filas.length * 0.02);
    for (let i = 0; i < dups; i++) { const k = R.int(0, filas.length - 1); filas.splice(R.int(0, filas.length), 0, filas[k].slice()); }
    const csv = 'viaje_id,bici_id,estacion_origen,estacion_destino,inicio,fin,tipo_usuario,monto\n' + filas.map((f) => f.join(',')).join('\n') + '\n';
    const RM = azar(s * 53 + nDia * 131);
    const tipos = ['pinchazo', 'frenos', 'cadena', 'luces', 'asiento'], costos = { pinchazo: 900, frenos: 2400, cadena: 1800, luces: 700, asiento: 1100 };
    const mant = Array.from({ length: RM.int(110, 170) }, (_, i) => { const t = RM.pick(tipos); return [`OT-${nDia}${pad(i + 1, 4)}`, `B-${pad(RM.int(1, N_BICIS), 4)}`, fecha, t, (costos[t] + RM.int(-100, 300)).toFixed(2)]; });
    return {
      fecha,
      archivos: {
        [`viajes_${fecha}.csv`]: csv,
        [`mantenimientos_${fecha}.csv`]: 'orden_id,bici_id,fecha,tipo,costo\n' + mant.map((f) => f.join(',')).join('\n') + '\n',
      },
      estaciones: estaciones(s).map((e) => JSON.stringify(e)).join('\n') + '\n',
      filas: filas.length, duplicados: dups,
    };
  }

  // ---------------------------------------------------------------- lo que tiene que dar (contrato de datos)
  // silver.viajes: un viaje por viaje_id; sin los que no tienen fin (en curso) ni los que terminan antes de
  // empezar (error de reloj); destino 99 → NULL y fuera_de_estacion = true; fecha = día de inicio.
  function verdad(dia, s = semilla()) {
    const fecha = fechaDe(dia); const { reales } = viajesDelDia(fecha, s); const E = estaciones(s);
    const validos = reales.filter((v) => v.problema !== 'en_curso' && v.problema !== 'reloj');
    const r2 = (x) => Math.round(x * 100) / 100;
    const ingresos = {}; const barrios = {}; const est = {};
    for (const v of validos) {
      const i = (ingresos[v.tipo_usuario] = ingresos[v.tipo_usuario] || { viajes: 0, ingresos: 0 }); i.viajes++; i.ingresos = r2(i.ingresos + v.monto);
      const b = E[v.estacion_origen - 1].barrio; const x = (barrios[b] = barrios[b] || { viajes: 0, viajes_pase_dia: 0 }); x.viajes++; if (v.tipo_usuario === 'pase_dia') x.viajes_pase_dia++;
      const e = (est[v.estacion_origen] = est[v.estacion_origen] || { viajes_salida: 0, minutos: 0 }); e.viajes_salida++; e.minutos += (v.fin - v.inicio) / 60e3;
    }
    for (const e of Object.values(est)) e.minutos_promedio = r2(e.minutos / e.viajes_salida);
    return {
      fecha, filas_archivo: generar(dia, s).filas, unicos: reales.length, en_curso: reales.filter((v) => v.problema === 'en_curso').length,
      error_reloj: reales.filter((v) => v.problema === 'reloj').length, fuera_de_estacion: validos.filter((v) => v.problema === 'fuera').length,
      viajes_validos: validos.length, ingresos_total: r2(validos.reduce((a, v) => a + v.monto, 0)), ingresos, barrios, estaciones: est,
    };
  }

  // ---------------------------------------------------------------- terminal: pedalia exportar
  const Sh = window.Shell;
  if (Sh && Sh.def) {
    const LEEME = `# Entrega de datos de Pedalia

Archivos que exporta el sistema de la app todos los días a las 02:00.

| Archivo | Qué es |
|---|---|
| viajes_AAAA-MM-DD.csv | Un viaje por fila (de la fecha indicada) |
| mantenimientos_AAAA-MM-DD.csv | Órdenes de taller del día |
| estaciones.json | Maestro de estaciones (JSON Lines, una estación por línea) |

## viajes

| Columna | Descripción |
|---|---|
| viaje_id | Identificador del viaje |
| bici_id | Bicicleta (B-0001 … B-1500) |
| estacion_origen / estacion_destino | Id de estación (ver estaciones.json) |
| inicio / fin | Fecha y hora, hora local |
| tipo_usuario | abono (mensual) o pase_dia |
| monto | Lo cobrado por el viaje, en pesos |

## Cosas que ya sabemos

- Si la API falla, el sistema reintenta y **puede repetir filas** (mismo viaje_id).
- Si una bici no se devolvió antes de exportar, el viaje sale **sin fin, sin destino y sin monto**.
- estacion_destino = **99** significa que la bici quedó **fuera de una estación** (el viaje igual se cobra).
- La estación 13 (Faro) tuvo **problemas de reloj**: revisen tiempos raros.

Cualquier duda: equipo-app@pedalia.example
`;
    Sh.def('pedalia', 'Sistema de Pedalia (proyecto integrador): pedalia exportar --dia 1|2|3 · pedalia estado', (a) => {
      const sub = a[0];
      const raiz = Sh.HOME + '/pedalia/entrega';
      const S = almacen(); const P = S ? (S.data.pedalia = S.data.pedalia || {}) : {};
      P.exportados = P.exportados || [];
      if (!sub || sub === 'ayuda' || sub === '--help' || sub === '-h') {
        return Sh.ok(`pedalia — sistema de la app de Pedalia (simulado, para el proyecto integrador)

  pedalia exportar [--dia 1|2|3]   exporta los archivos de un día en ~/pedalia/entrega
                                   (sin --dia: el siguiente día que falta)
  pedalia estado                   qué días se exportaron y tu semilla

Días disponibles: ${DIAS.map((d, i) => `${i + 1} = ${d}`).join(' · ')}`);
      }
      if (sub === 'estado') return Sh.ok(`Semilla: ${semilla()} (tus datos son solo tuyos)\nExportados: ${P.exportados.length ? P.exportados.join(', ') : 'ninguno todavía'}\nCarpeta: ~/pedalia/entrega`);
      if (sub !== 'exportar') return Sh.fail(`pedalia: comando desconocido '${sub}'. Prueba: pedalia ayuda`, 2);
      const i = a.indexOf('--dia');
      const dia = i >= 0 ? a[i + 1] : String(DIAS.findIndex((d) => !P.exportados.includes(d)) + 1 || DIAS.length);
      let g; try { g = generar(dia); } catch (e) { return Sh.fail('pedalia: ' + e.message, 2); }
      Sh.writeFile(`${raiz}/LEEME.md`, LEEME);
      Sh.writeFile(`${raiz}/estaciones.json`, g.estaciones);
      for (const [n, c] of Object.entries(g.archivos)) Sh.writeFile(`${raiz}/${g.fecha}/${n}`, c);
      if (!P.exportados.includes(g.fecha)) P.exportados.push(g.fecha);
      P.exportados.sort(); try { S && S.save(); Sh.Machine.save(); } catch (e) { /* sin almacenamiento */ }
      return Sh.ok(`Exportación del ${g.fecha} lista en ~/pedalia/entrega/${g.fecha}/
  viajes_${g.fecha}.csv          ${g.filas} filas
  mantenimientos_${g.fecha}.csv
  ~/pedalia/entrega/estaciones.json (maestro de estaciones) y LEEME.md

Siguiente paso: subirlos al contenedor landing del lago, por ejemplo:
  az storage blob upload-batch --account-name <tu-cuenta> -d landing/pedalia/${g.fecha} -s ~/pedalia/entrega/${g.fecha}`);
    });
  }

  // ---------------------------------------------------------------- terminal: airflow → la réplica cuando corresponde
  // El comando `airflow` de las lecciones es un mini-Airflow que lee ~/dags. Si el comando habla de un DAG que está
  // en la carpeta del Airflow de práctica (~/airflow/dags, donde lo despliega el CI), o es `airflow connections`
  // con DAGs desplegados, se carga la réplica y se usa esa, aunque no hayas abierto su página.
  if (Sh && Sh.def && Sh.Commands && Sh.Commands.airflow) {
    const mini = Sh.Commands.airflow;
    const quiereReplica = (a) => {
      const dir = Sh.HOME + '/airflow/dags/'; const fs0 = Sh.Machine.fs || {};
      const pys = Object.keys(fs0).filter((k) => k.startsWith(dir) && k.endsWith('.py') && fs0[k].t === 'f');
      if (a[0] === 'connections' && (pys.length || window.AirflowMotor)) return true;
      if (!pys.length) return false;
      const txt = pys.map((k) => fs0[k].c || '').join('\n');
      return a.slice(1).some((x) => /^[\w.-]+$/.test(x) && (txt.includes(`"${x}"`) || txt.includes(`'${x}'`)));
    };
    window.__airflowQuiereReplica = quiereReplica;
    const envoltorio = async (a, ctx) => {
      if (!window.AirflowMotor && quiereReplica(a) && window.__cargarGrupo) {
        try { await window.__cargarGrupo('airflow'); } catch (e) { /* sin red: sigue el mini-Airflow */ }
        const nuevo = Sh.Commands.airflow; if (nuevo !== envoltorio) return nuevo(a, ctx);
      }
      return mini(a, ctx);
    };
    Sh.def('airflow', null, envoltorio);
  }

  // ---------------------------------------------------------------- panel de la lección: la entrega
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function descargar(nombre, texto) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: 'text/plain' })); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  function panelEntrega(el) {
    const s = semilla();
    el.innerHTML = `<div class="card pedalia-panel"><h3 style="margin-top:0;font-size:1.05em">🚲 Tu entrega de datos de Pedalia</h3>
      <p class="small muted">Semilla <b>${s}</b>: tus archivos son solo tuyos (otra persona recibe otros números). Lo más realista es exportarlos desde la terminal con <code>pedalia exportar</code>; si prefieres, puedes descargarlos acá y subirlos desde el portal.</p>
      <div class="pedalia-dias">${DIAS.map((d, i) => `<div><b>Día ${i + 1}</b> · ${d}${i === 2 ? ' <span class="small muted">(trae una sorpresa)</span>' : ''}<br><button class="btn btn-sm" data-bajar="${i + 1}">⬇ viajes y mantenimientos</button></div>`).join('')}</div>
      <p class="small" style="margin-bottom:0"><button class="btn btn-ghost btn-sm" data-bajar="est">⬇ estaciones.json</button></p></div>`;
    el.querySelectorAll('[data-bajar]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.bajar === 'est') return descargar('estaciones.json', estaciones().map((e) => JSON.stringify(e)).join('\n') + '\n');
      const g = generar(b.dataset.bajar); for (const [n, c] of Object.entries(g.archivos)) descargar(n, c);
    }));
  }

  // ---------------------------------------------------------------- panel: revisar mi proyecto
  const cargar = async (g, listo) => { try { if (!listo() && window.__cargarGrupo) await window.__cargarGrupo(g); } catch (e) { /* sin red */ } return listo(); };
  const azS = () => (window.CloudSim && window.CloudSim.az ? window.CloudSim.az() : {});
  function cuentaLago() {
    const st = azS().storage || {};
    return Object.entries(st).find(([, A]) => ['landing', 'bronze', 'silver', 'gold'].every((c) => (A.containers || {})[c])) || null;
  }
  const blobs = (A, c) => Object.keys(((A.containers || {})[c] || {}).blobs || {}).filter((b) => !b.endsWith('/'));
  const casi = (a, b) => Math.abs(Number(a) - Number(b)) < 0.011;
  async function filasDbx(sql) {
    if (!(await cargar('databricks', () => window.DBSQL))) throw new Error('No se pudo cargar Databricks');
    const S = almacen(); await window.DBSQL.init({ Store: S });
    const r = await window.DBSQL.ejecutar(sql, { limite: 1e7 });
    const u = Array.isArray(r) ? r[r.length - 1] : r;
    if (!u || u.error) throw new Error(u && u.error ? String(u.error.message || u.error) : 'sin resultado');
    return u.filas || u.values || [];
  }
  function exportados() { const S = almacen(); return ((S && S.data.pedalia && S.data.pedalia.exportados) || []).slice().sort(); }

  const CHEQUEOS = [
    ['Los datos', 'Exportaste al menos el día 1 con pedalia exportar', async () => exportados().length ? true : 'En la terminal: pedalia exportar --dia 1'],
    ['Contrato', 'docs/contrato.md en pedalia-datos dice qué hacer con repetidos, viajes sin fin, error de reloj y destino 99', async () => {
      const G = window.Shell && window.Shell.github; const rem = G && G.remotos ? G.remotos() : {};
      const [, r] = Object.entries(rem).find(([u]) => /\/pedalia-datos(\.git)?$/i.test(u)) || []; if (!r) return 'Primero sube el repositorio pedalia-datos al GitHub de práctica.';
      // en cualquier rama: el contrato se discute en un pull request antes de llegar a main
      const txt = Object.values(r.branches || {}).map((h) => (((r.commits || {})[h] || {}).snap || {})['docs/contrato.md']).find((x) => typeof x === 'string');
      if (!txt) return 'No encuentro docs/contrato.md en ninguna rama de pedalia-datos (súbelo con git push).';
      const falta = [[/repet|duplic/i, 'qué pasa con las filas repetidas'], [/sin fin|en curso|no termin/i, 'los viajes sin fin (en curso)'], [/reloj|fin\s*<\s*inicio|antes de (empezar|inicio)/i, 'los viajes que terminan antes de empezar (reloj)'], [/\b99\b/, 'el destino 99 (fuera de estación)'], [/control|cierra|cuadra/i, 'la cuenta de control']].filter(([re]) => !re.test(txt)).map((x) => x[1]);
      return !falta.length || `Al contrato le falta: ${falta.join(', ')}.`;
    }],
    ['GitHub', 'El repositorio pedalia-datos existe en el GitHub de práctica', async () => {
      const G = window.Shell && window.Shell.github; const rem = G && G.remotos ? G.remotos() : {};
      return Object.keys(rem).some((u) => /\/pedalia-datos(\.git)?$/i.test(u)) || 'Créalo en el GitHub de práctica (New repository → pedalia-datos), agrégalo como remoto y haz git push.';
    }],
    ['GitHub', 'Tiene el DAG, el SQL y un workflow de Actions en la rama principal', async () => {
      const G = window.Shell && window.Shell.github; const rem = G && G.remotos ? G.remotos() : {};
      const [, r] = Object.entries(rem).find(([u]) => /\/pedalia-datos(\.git)?$/i.test(u)) || []; if (!r) return 'Primero sube el repositorio.';
      const rama = r.meta && r.meta.rama && r.branches[r.meta.rama] ? r.meta.rama : r.branches.main ? 'main' : r.branches.master ? 'master' : Object.keys(r.branches || {})[0];
      const nombres = Object.keys(((r.commits || {})[(r.branches || {})[rama]] || {}).snap || {});
      const tiene = (re) => nombres.some((n) => re.test(String(n)));
      const falta = [[/dags\/pedalia_diario\.py/, 'dags/pedalia_diario.py'], [/sql\//, 'la carpeta sql/'], [/\.github\/workflows\/.+\.ya?ml/, '.github/workflows/ci.yml']].filter(([re]) => !tiene(re)).map((x) => x[1]);
      return !falta.length || `Falta en el repositorio: ${falta.join(', ')}.`;
    }],
    ['GitHub', 'Al menos un pull request fusionado y un workflow en verde', async () => {
      const G = window.Shell && window.Shell.github; const rem = G && G.remotos ? G.remotos() : {};
      const [, r] = Object.entries(rem).find(([u]) => /\/pedalia-datos(\.git)?$/i.test(u)) || []; if (!r) return 'Primero sube el repositorio.';
      const pr = (r.prs || []).some((p) => p.estado === 'fusionado');
      const run = (r.runs || []).some((x) => x.conclusion === 'success');
      return (pr && run) || `${pr ? '' : 'Abre un PR y fusiónalo (Merge pull request). '}${run ? '' : 'El workflow de Actions tiene que terminar en verde.'}`;
    }],
    ['Azure', 'Una cuenta de almacenamiento ADLS Gen2 con los contenedores landing, bronze, silver y gold', async () => {
      const c = cuentaLago(); if (!c) return 'Crea la cuenta (con "Enable hierarchical namespace") y los cuatro contenedores.';
      return c[1].hns ? true : `La cuenta ${c[0]} no tiene el espacio de nombres jerárquico: abfss:// no va a funcionar. Créala de nuevo con "Enable hierarchical namespace" (pestaña Advanced).`;
    }],
    ['Azure', 'Los archivos de Pedalia están en landing', async () => { const c = cuentaLago(); if (!c) return 'Falta la cuenta del lago.'; return blobs(c[1], 'landing').some((b) => /viajes_\d{4}-\d{2}-\d{2}\.csv$/.test(b)) || 'Sube la entrega con az storage blob upload-batch (o Upload en el portal) a landing/pedalia/<fecha>/.'; }],
    ['Azure', 'Permisos: el data factory y el conector de Databricks tienen un rol de datos en la cuenta', async () => {
      const c = cuentaLago(); if (!c) return 'Falta la cuenta del lago.'; const roles = azS().roles || [];
      const tiene = (p) => roles.some((a) => a.principalName === p && /^Storage Blob Data (Contributor|Owner)$/.test(a.roleDefinitionName) && String(a.scope).includes(c[0]));
      const fabs = Object.keys(azS().adf || {}); const f = fabs.find(tiene);
      return (f && tiene('unity-catalog-access-connector')) || `En la cuenta ${c[0]} → Access control (IAM) → Add role assignment → Storage Blob Data Contributor para ${f ? '' : 'el data factory'}${!f && !tiene('unity-catalog-access-connector') ? ' y ' : ''}${tiene('unity-catalog-access-connector') ? '' : 'unity-catalog-access-connector'}.`;
    }],
    ['Data Factory', 'Un pipeline publicado corrió bien y dejó los viajes en bronze', async () => {
      const c = cuentaLago(); if (!c) return 'Falta la cuenta del lago.';
      const runs = Object.values(azS().adf || {}).flatMap((F) => ((F.studio || {}).runs || []).filter((r) => !r.debug));
      const ok = runs.some((r) => r.estado === 'Succeeded');
      const enBronze = blobs(c[1], 'bronze').some((b) => /viajes/.test(b));
      return (ok && enBronze) || `${ok ? '' : 'Publica el pipeline (Publish all) y córrelo (Trigger now o desde Airflow). '}${enBronze ? '' : 'Todavía no hay archivos de viajes en bronze.'}`;
    }],
    ['Lago en Databricks', 'Una ubicación externa (external location) sobre el lago', async () => {
      if (!(await cargar('databricks', () => window.DBSQL))) return 'No se pudo cargar Databricks.';
      await window.DBSQL.init({ Store: almacen() }); const U = window.DBSQL.uc(); return Object.keys(U.extLocs || {}).length ? true : "CREATE EXTERNAL LOCATION lago_pedalia URL 'abfss://bronze@<cuenta>.dfs.core.windows.net/' WITH (STORAGE CREDENTIAL credencial_lago)";
    }],
    ['Silver', 'pedalia.silver.viajes tiene los viajes válidos de cada día (según el contrato)', async () => {
      let f; try { f = await filasDbx('SELECT CAST(fecha AS STRING) AS fecha, COUNT(*) AS n, COUNT(DISTINCT viaje_id) AS u FROM pedalia.silver.viajes GROUP BY fecha ORDER BY fecha'); } catch (e) { return `No se pudo leer pedalia.silver.viajes: ${e.message.split('\n')[0]}`; }
      if (!f.length) return 'La tabla está vacía.';
      const mal = [];
      for (const [fecha, n, u] of f) { const d = fechaDe(String(fecha).slice(0, 10)); if (!d) { mal.push(`hay viajes con fecha ${fecha}, que no es un día de la entrega (¿se leyó mal el formato de las fechas?)`); continue; } const v = verdad(d); if (Number(n) !== Number(u)) mal.push(`${fecha}: hay viajes repetidos (${n} filas, ${u} viaje_id distintos)`); else if (Number(n) !== v.viajes_validos) mal.push(`${fecha}: tienes ${n} viajes y el contrato da ${v.viajes_validos} (el archivo trae ${v.filas_archivo} filas: ${v.filas_archivo - v.unicos} repetidas, ${v.en_curso} en curso y ${v.error_reloj} con error de reloj)`); }
      const faltan = exportados().filter((d) => !f.some(([x]) => String(x).slice(0, 10) === d));
      if (faltan.length) mal.push(`faltan días exportados: ${faltan.join(', ')}`);
      return !mal.length || mal.join(' · ');
    }],
    ['Gold', 'pedalia.gold.ingresos_diarios cuadra con los viajes válidos', async () => {
      let f; try { f = await filasDbx('SELECT CAST(fecha AS STRING), tipo_usuario, viajes, ingresos FROM pedalia.gold.ingresos_diarios'); } catch (e) { return `No se pudo leer pedalia.gold.ingresos_diarios: ${e.message.split('\n')[0]}`; }
      if (!f.length) return 'La tabla está vacía.';
      const mal = [];
      for (const [fecha, tipo, viajes, ing] of f) { const d = fechaDe(String(fecha).slice(0, 10)); if (!d) continue; const v = verdad(d).ingresos[tipo]; if (!v) { mal.push(`${fecha}: tipo_usuario '${tipo}' no existe`); continue; } if (Number(viajes) !== v.viajes || !casi(ing, v.ingresos)) mal.push(`${fecha} ${tipo}: ${viajes} viajes / ${ing} y el contrato da ${v.viajes} / ${v.ingresos}`); }
      return !mal.length || mal.join(' · ');
    }],
    ['Gold', 'Las tablas gold se exportaron como archivos al contenedor gold', async () => { const c = cuentaLago(); if (!c) return 'Falta la cuenta del lago.'; const b = blobs(c[1], 'gold'); return (b.some((x) => /ingresos/.test(x)) && b.some((x) => /barrio/.test(x))) || "Con INSERT OVERWRITE DIRECTORY 'abfss://gold@<cuenta>.dfs.core.windows.net/ingresos_diarios' USING CSV OPTIONS ('header' = 'true') SELECT … (y lo mismo para uso_por_barrio)."; }],
    ['Airflow', 'El DAG pedalia_diario disparó Data Factory, Databricks, Snowflake y BigQuery', async () => {
      if (!(await cargar('airflow', () => window.AirflowMotor))) return 'No se pudo cargar Airflow.';
      const c = window.AirflowMotor.st().cruces || {};
      const falta = [['airflowDataFactory', 'Data Factory'], ['airflowDatabricks', 'Databricks'], ['airflowSnowflake', 'Snowflake'], ['airflowBigQuery', 'BigQuery']].filter(([k]) => !c[k]).map((x) => x[1]);
      return !falta.length || `Todavía no corrió con éxito la tarea de: ${falta.join(', ')}.`;
    }],
    ['Snowflake', 'PEDALIA.FINANZAS.INGRESOS_DIARIOS se cargó desde el lago', async () => {
      if (!(await cargar('snowflake', () => window.SnowflakeMotor))) return 'No se pudo cargar Snowflake.';
      const M = window.SnowflakeMotor; M.conectar(almacen()); await M.init();
      let x; try { x = await M.leer('SELECT CAST(FECHA AS VARCHAR) AS F, SUM(INGRESOS) AS I FROM PEDALIA.FINANZAS.INGRESOS_DIARIOS GROUP BY 1'); } catch (e) { return `No se pudo leer la tabla: ${String(e.message).split('\n')[0]}`; }
      if (!x.values.length) return 'La tabla está vacía: ¿corrió el COPY INTO?';
      const mal = x.values.filter(([f, i]) => { const d = fechaDe(String(f).slice(0, 10)); return d && !casi(i, verdad(d).ingresos_total); }).map(([f, i]) => `${f}: ${i} (esperado ${verdad(fechaDe(String(f).slice(0, 10))).ingresos_total})`);
      return !mal.length || 'No cuadra con gold: ' + mal.join(' · ') + '. ¿Cargaste dos veces el mismo día? COPY INTO saltea archivos ya cargados, salvo FORCE = TRUE.';
    }],
    ['BigQuery', 'pedalia_mkt.uso_por_barrio se cargó desde el lago', async () => {
      if (!(await cargar('bigquery', () => window.BigQueryMotor))) return 'No se pudo cargar BigQuery.';
      const B = window.BigQueryMotor; B.conectar(almacen()); await B.init();
      const rs = await B.ejecutar('SELECT CAST(fecha AS STRING) AS f, SUM(viajes) AS v FROM pedalia_mkt.uso_por_barrio GROUP BY 1', { usuario: 'revision@pedalia.example', sinCache: true, seguir: true });
      const u = rs[rs.length - 1]; if (!u || u.error) return `No se pudo leer la tabla: ${u && u.error ? String(u.error.message).split('\n')[0] : ''}`;
      if (!u.r.values.length) return 'La tabla está vacía.';
      const mal = u.r.values.filter(([f, v]) => { const d = fechaDe(String(f).slice(0, 10)); return d && Number(v) !== verdad(d).viajes_validos; }).map(([f, v]) => `${f}: ${v} viajes (esperado ${verdad(fechaDe(String(f).slice(0, 10))).viajes_validos})`);
      return !mal.length || 'No cuadra: ' + mal.join(' · ') + '. Si cargaste el mismo día dos veces con LOAD DATA INTO, usa LOAD DATA OVERWRITE o borra ese día antes.';
    }],
    ['Power BI', 'El informe importa de Snowflake, BigQuery y Databricks', async () => {
      const c = (almacen() && almacen().data.cruces) || {};
      const falta = [['pbiSnowflake', 'Snowflake'], ['pbiBigQuery', 'BigQuery'], ['pbiDatabricks', 'Databricks']].filter(([k]) => !c[k]).map((x) => x[1]);
      return !falta.length || `En Power BI → Obtener datos, importa también desde: ${falta.join(', ')}.`;
    }],
  ];
  function panelRevisar(el) {
    el.innerHTML = `<div class="card pedalia-panel"><h3 style="margin-top:0;font-size:1.05em">🔎 Revisar mi proyecto</h3><p class="small muted">Lee el estado real de cada herramienta de práctica y lo compara con lo que tiene que dar tu entrega (tus números). No modifica nada.</p><button class="btn btn-primary btn-sm" data-revisar>Revisar ahora</button><ol class="pedalia-chequeos"></ol></div>`;
    const lista = el.querySelector('.pedalia-chequeos');
    el.querySelector('[data-revisar]').addEventListener('click', async (ev) => {
      const b = ev.currentTarget; b.disabled = true; if (window.__discoListo) await window.__discoListo(); b.textContent = 'Revisando…'; lista.innerHTML = '';
      let bien = 0;
      for (const [grupo, texto, prueba] of CHEQUEOS) {
        const li = document.createElement('li'); li.innerHTML = `<span class="spinner"></span> <b>${esc(grupo)}</b> · ${esc(texto)}`; lista.append(li);
        let r; try { r = await prueba(); } catch (e) { r = String(e.message || e); }
        if (r === true) bien++;
        li.className = r === true ? 'ok' : 'falta';
        li.innerHTML = `${r === true ? '✅' : '⬜'} <b>${esc(grupo)}</b> · ${esc(texto)}${r === true ? '' : `<div class="small muted">${esc(r)}</div>`}`;
      }
      b.disabled = false; b.textContent = `Revisar de nuevo (${bien} de ${CHEQUEOS.length})`;
      const S = almacen(); if (S) { S.data.pedalia = S.data.pedalia || {}; S.data.pedalia.revision = { bien, total: CHEQUEOS.length, cuando: Date.now() }; try { S.save(); } catch (e) { /* nada */ } }
    });
  }
  // ---------------------------------------------------------------- el día a día: tickets que llegan con la API viva
  const API = () => window.ApiPedalia; const HORA = 3600000, DIA_MS = 86400000;
  const normTxt = (x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const diaLoc = (ms) => API().diaLocal(ms);
  const viajes = (fecha, t) => API().viajesDelDia(fecha, t);
  const nombreEst = (id) => (API().estaciones().find((e) => e.id === Number(id)) || {}).name || `estación ${id}`;
  const momentos = () => [0, 1, 2, 3, 4, 5, 6].map((h) => API().ahora() - h * HORA);
  function contarPor(lista, f) { const m = {}; for (const v of lista) { const k = f(v); if (k == null) continue; m[k] = (m[k] || 0) + 1; } return m; }
  const ganadores = (m) => { const max = Math.max(...Object.values(m)); return Object.keys(m).filter((k) => m[k] === max); };
  const logApi = () => ((window.ApiPedaliaHost && window.ApiPedaliaHost.datos()) || {}).log || [];
  const TICKETS_PD = [
    { id: 'PD-201', tipo: 'pregunta', de: 'Rocío · Operaciones', cuando: (I) => I + 9 * HORA, titulo: '¿Qué estación tuvo más salidas ayer?',
      texto: (T) => `Mañana reubicamos bicis. ¿Qué estación tuvo más salidas el ${diaLoc(T - DIA_MS)}?`,
      comentarios: ['Rocío: salidas = viajes que empezaron en esa estación ese día, en hora de Ciudad del Río. Los reembolsados también cuentan: la bici salió igual.'],
      respuesta: { tipo: 'texto', ayuda: 'El id o el nombre de la estación', verificar: (v, T) => { const f = diaLoc(T - DIA_MS); const g = ganadores(contarPor(viajes(f), (x) => x.origin_station_id)); if (g.some((id) => normTxt(v) === String(id) || normTxt(v) === normTxt(nombreEst(id)))) return true; return 'No es la que más salidas tuvo. ¿Contaste el día en hora de Ciudad del Río (la v2 da started_at en UTC)?'; } } },
    { id: 'PD-202', tipo: 'pregunta', de: 'Lucía · Finanzas', cuando: (I) => I + 11 * HORA, titulo: '¿Cuánto cobramos ayer?',
      texto: (T) => `Para el cierre: ¿cuánto se cobró, en pesos, por los viajes del ${diaLoc(T - DIA_MS)}?`,
      comentarios: ['Lucía: lo cobrado de verdad. Un viaje reembolsado ya no suma.', 'Plataforma: en la v2 los montos vienen en centavos (amount_cents) y un reembolsado tiene amount_cents = 0.'],
      respuesta: { tipo: 'numero', unidad: '$', verificar: (v, T) => { const f = diaLoc(T - DIA_MS); const tot = (t) => viajes(f, t).reduce((a, x) => a + (x.amount_cents || 0), 0) / 100; const ok = momentos().some((t) => Math.abs(v - tot(t)) < 0.01); if (ok) return true; if (momentos().some((t) => Math.abs(v - tot(t) * 100) < 1)) return 'Está en centavos: divide amount_cents por 100.'; return 'No coincide. Viajes que empezaron ese día (hora local), sumando amount_cents de la v2 (los reembolsados valen 0).'; } } },
    { id: 'PD-203', tipo: 'requerimiento', de: 'Plataforma', cuando: (I) => I + DIA_MS + 10 * HORA, titulo: 'Migrar la extracción a la v2',
      texto: (T, H) => `La v1 está deprecada y se apaga el ${diaLoc(H.bajaV1)} (410 Gone). Migren la extracción a /v2/trips, con paginación por cursor.`,
      criterios: ['Una extracción de /v2/trips que recorra páginas con cursor (respuestas 200)', 'Ningún pedido a /v1 desde que llegó este ticket'],
      check: () => { const L = logApi(); const T = TICKETS_PD.find((k) => k.id === 'PD-203').cuando(API().hitos().deprecacionV1, API().hitos()); const v2 = L.some((x) => /^\/v2\/trips\?.*cursor=/.test(x.ruta) && x.status === 200); const v1 = L.filter((x) => x.ruta.startsWith('/v1') && x.t > T); return (v2 && !v1.length) || `${v2 ? '' : 'No veo en el registro de la API una extracción de /v2/trips con cursor (mira el portal: #/pedalia-dev/registro). '}${v1.length ? `Hubo ${v1.length} pedidos a /v1 después del aviso.` : ''}`; } },
    { id: 'PD-204', tipo: 'incidente', de: 'Rocío · Operaciones', cuando: (I, H) => H.capacidad7 + 9 * HORA, titulo: 'La estación 7 aparece al 140 % de ocupación',
      texto: 'El tablero de ocupación dice que en Hospital Viejo hay más bicis que anclajes. ¿Está mal el tablero o la estación?',
      comentarios: ['Plataforma: /v2/stations tiene ETag. Si lo guardaron una vez y nunca lo refrescaron, tienen el maestro viejo. Miren el changelog.'],
      respuesta: { tipo: 'numero', unidad: 'anclajes', ayuda: '¿Cuántos anclajes tiene hoy la estación 7?', verificar: (v) => (v === (API().estaciones().find((e) => e.id === 7) || {}).capacity) || 'No. Consulta /v2/stations hoy (sin caché vieja) y mira capacity de la estación 7.' } },
    { id: 'PD-205', tipo: 'pregunta', de: 'Lucía · Finanzas', cuando: (I, H) => H.campos + DIA_MS + 9 * HORA, titulo: '¿Cuántos viajes corporativos hubo?',
      texto: (T, H) => `Tenemos que facturar a las empresas. ¿Cuántos viajes corporativos hubo el ${diaLoc(H.campos + HORA)}?`,
      comentarios: ['Lucía: los corporativos se facturan por mes a la empresa, por eso vienen con amount_cents = 0.', 'Plataforma: user_type = "corporate" existe desde la v2.4.0 (está en el changelog).'],
      respuesta: { tipo: 'numero', unidad: 'viajes', verificar: (v, T, H) => { const n = viajes(diaLoc(H.campos + HORA)).filter((x) => x.user_type === 'corporate').length; return v === n || (v === 0 ? '¿Tu validación de user_type los descartó? Desde la v2.4.0 puede valer "corporate".' : 'No coincide. Cuenta user_type = "corporate" en los viajes que empezaron ese día (hora local).'); } } },
    { id: 'PD-206', tipo: 'incidente', de: 'Rocío · Operaciones', cuando: (I, H) => H.estacion25 + DIA_MS + 8 * HORA, titulo: 'Faltan viajes en el tablero de ayer',
      texto: 'El total de viajes de ayer en el tablero es menor que el que muestra la app. No es mucho, pero no cuadra.',
      comentarios: ['Martín (app): ayer abrimos la estación 25, Muelle Norte. ¿La tienen en el maestro?', 'Tú: si silver hace INNER JOIN con estaciones y el maestro no tiene la 25, esos viajes se caen sin error.'],
      respuesta: { tipo: 'numero', unidad: 'viajes', ayuda: '¿Cuántos viajes salieron de la estación 25 ese día?', verificar: (v, T, H) => { const n = viajes(diaLoc(H.estacion25 + HORA)).filter((x) => x.origin_station_id === 25).length; return v === n || 'No coincide. Viajes con origin_station_id = 25 que empezaron el día de la apertura (hora local).'; } } },
    { id: 'PD-207', tipo: 'pregunta', de: 'Tomás · Marketing', cuando: (I) => I + 2 * DIA_MS + 9 * HORA, titulo: '¿Qué barrio usa más el pase diario?',
      texto: (T) => `Vamos a hacer una campaña. ¿Qué barrio tuvo más viajes con pase diario entre el ${diaLoc(T - 3 * DIA_MS)} y el ${diaLoc(T - DIA_MS)}?`,
      comentarios: ['Tomás: el barrio de la estación de salida. Cantidad de viajes con day_pass, no porcentaje.'],
      respuesta: { tipo: 'texto', ayuda: 'El barrio', verificar: (v, T) => { const est = new Map(API().estaciones().map((e) => [e.id, e.neighborhood])); const L = [3, 2, 1].flatMap((k) => viajes(diaLoc(T - k * DIA_MS))).filter((x) => x.user_type === 'day_pass'); const g = ganadores(contarPor(L, (x) => est.get(x.origin_station_id))); return g.some((b) => normTxt(b) === normTxt(v)) || 'No es el que más viajes con pase diario tuvo. Barrio de la estación de origen, tres días completos en hora local.'; } } },
    { id: 'PD-208', tipo: 'requerimiento', de: 'Plataforma', cuando: (I, H) => H.avisoBajaV1, titulo: 'La v1 se apaga en 3 días: que nadie la use',
      texto: (T, H) => `Desde el ${diaLoc(H.bajaV1)} todas las rutas /v1 responden 410. Revisen el registro de la API en el portal: cualquier pedido a /v1 es un proceso que se va a romper.`,
      criterios: ['Ningún pedido a /v1 desde este aviso', 'Al menos una extracción de /v2/trips después del aviso'],
      check: () => { const T = API().hitos().avisoBajaV1; const L = logApi().filter((x) => x.t > T); const v1 = L.filter((x) => x.ruta.startsWith('/v1')).length; const v2 = L.some((x) => x.ruta.startsWith('/v2/trips') && x.status === 200); return (!v1 && v2) || `${v1 ? `Hubo ${v1} pedidos a /v1 después del aviso. ` : ''}${v2 ? '' : 'Todavía no hay una extracción de /v2/trips después del aviso.'}`; } },
  ];
  // la misma cola de tickets se ve en el tablero de la lección y en Jira (proyecto PD), que es donde trabaja el equipo
  const cfgTablero = () => ({
      titulo: 'Tablero del equipo de datos de Pedalia', tickets: TICKETS_PD,
      contexto: () => { window.ApiPedaliaHost.sincronizar(); const H = API().hitos(); return { I: H.deprecacionV1, H, t: API().ahora() }; },
      datos: () => { const S = almacen(); if (!S) return null; S.data.pedalia = S.data.pedalia || {}; return S.data.pedalia; }, guardar: () => { try { almacen().save(); } catch (e) { /* lleno */ } },
      hora: (T) => new Date(T - 3 * HORA).toISOString().replace('T', ' ').slice(0, 16),
    });
  (window.__tableros = window.__tableros || []).push({ clave: 'PD', nombre: 'Pedalia', modulo: 'proyecto-pedalia', cfg: cfgTablero, chequeos: () => (typeof CHEQUEOS !== 'undefined' ? CHEQUEOS : []) });
  function panelTablero(el) {
    const listo = () => window.ApiPedalia && window.ApiPedaliaHost && window.TableroTickets;
    if (!listo()) { el.textContent = 'Cargando…'; setTimeout(() => panelTablero(el), 400); return; }
    window.ApiPedaliaHost.sincronizar();
    window.TableroTickets.panel(el, cfgTablero());
  }

  function montar(root) {
    (root || document).querySelectorAll('[data-pedalia]').forEach((el) => {
      if (el.dataset.montado) return; el.dataset.montado = '1';
      if (el.dataset.pedalia === 'entrega') panelEntrega(el);
      else if (el.dataset.pedalia === 'revisar') panelRevisar(el);
      else if (el.dataset.pedalia === 'tablero') panelTablero(el);
    });
  }

  window.Pedalia = { DIAS, BARRIOS, semilla, estaciones, generar, verdad, montar, CHEQUEOS, TICKETS: TICKETS_PD };
})();
