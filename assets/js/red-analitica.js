/* Red Analítica: el proyecto 3. Una red de 5 laboratorios clínicos (inventados) que dejan sus resultados todos los
 * días en un servidor SFTP, cada uno con su formato, su codificación, sus códigos y sus unidades. Datos de salud: hay
 * que seudonimizar a los pacientes y respetar el derecho al olvido.
 *
 * Todo sale de una semilla propia del estudiante y del reloj real:
 * - Norte: CSV UTF-8 limpio (el de referencia).
 * - Centro: CSV en Latin-1 con ";" y coma decimal, fechas dd/mm/aaaa, códigos propios. A mitad del proyecto migran
 *   de sistema sin avisar: pasan a UTF-8, fechas ISO y una columna nueva en el medio.
 * - Sur: JSON por líneas con el paciente anidado y unidades internacionales (mmol/L, g/L, µmol/L).
 * - Costa: un CSV exportado de Excel a mano: BOM, título arriba, fechas como número de serie de Excel y un total abajo.
 * - Cerro: TSV con CRLF, fechas en UTC, filas repetidas y entregas tarde. Un día no entrega.
 * Los archivos con Latin-1 guardan los bytes no ASCII como \uDC80–\uDCFF (como surrogateescape de Python): se ven como
 * "�" hasta que alguien los decodifica bien (iconv -f LATIN1, o encoding => 'ISO-8859-1' en Databricks).
 */
(function () {
  'use strict';
  const MIN = 60000, HORA = 3600000, DIA = 86400000, ZONA_H = -3;
  const cfg = { semilla: 4242, inicio: Date.UTC(2026, 10, 19, 12) };
  const ahora = () => Date.now();

  function h32() { let h = 2166136261; for (const a of arguments) { const s = String(a); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= 0x9e3779b9; h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); } return (h ^ (h >>> 15)) >>> 0; }
  function azar(seed) {
    let a = seed >>> 0;
    const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const normal = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    return { r, normal, int: (x, y) => x + Math.floor(r() * (y - x + 1)), chance: (p) => r() < p, pick: (l) => l[Math.floor(r() * l.length)] };
  }
  const pad = (n, k = 2) => String(n).padStart(k, '0');
  const local = (ms) => new Date(ms + ZONA_H * HORA);
  const diaLocal = (ms) => { const d = local(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const inicioDiaLocal = (ms) => { const d = local(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ZONA_H * HORA; };
  const msDeDia = (f) => Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) - ZONA_H * HORA;
  const sumarDias = (f, n) => diaLocal(msDeDia(f) + n * DIA + HORA);
  const latin1 = (s) => String(s).replace(/[\u0080-ÿ]/g, (c) => String.fromCharCode(0xDC00 + c.charCodeAt(0)));
  const fmtLoc = (ms, f) => { const d = local(ms); const Y = d.getUTCFullYear(), M = pad(d.getUTCMonth() + 1), D = pad(d.getUTCDate()), h = pad(d.getUTCHours()), m = pad(d.getUTCMinutes()); return f.replace('YYYY', Y).replace('MM', M).replace('DD', D).replace('hh', h).replace('mm', m); };

  // ---------------------------------------------------------------- catálogo
  const ESTUDIOS = {
    GLU: { nombre: 'Glucosa en ayunas', unidad: 'mg/dL', min: 70, max: 100, dec: 0 },
    HB: { nombre: 'Hemoglobina', unidad: 'g/dL', min: 12, max: 17.5, dec: 1 },
    COL: { nombre: 'Colesterol total', unidad: 'mg/dL', min: 0, max: 200, dec: 0 },
    CRE: { nombre: 'Creatinina', unidad: 'mg/dL', min: 0.6, max: 1.3, dec: 2 },
    TSH: { nombre: 'Tirotropina (TSH)', unidad: 'mUI/L', min: 0.4, max: 4.0, dec: 2 },
  };
  const LABS = {
    norte: { nombre: 'Laboratorio Norte', llegada: [1, 10, 15], codigos: { GLU: 'GLU', HB: 'HB', COL: 'COL', CRE: 'CRE', TSH: 'TSH' } },
    centro: { nombre: 'Laboratorio Centro', llegada: [2, 30, 30], codigos: { GLU: '1001', HB: '1002', COL: '1003', CRE: '1004', TSH: '1005' } },
    sur: { nombre: 'Laboratorio Sur', llegada: [3, 0, 120], codigos: { GLU: 'glucose', HB: 'hemoglobin', COL: 'cholesterol', CRE: 'creatinine', TSH: 'tsh' } },
    costa: { nombre: 'Laboratorio Costa', llegada: [6, 45, 20], codigos: { GLU: 'Glucosa en ayunas', HB: 'Hemoglobina', COL: 'Colesterol total', CRE: 'Creatinina', TSH: 'TSH' } },
    cerro: { nombre: 'Laboratorio Cerro', llegada: [5, 0, 30], codigos: { GLU: 'GLUC', HB: 'HGB', COL: 'CHOL', CRE: 'CREA', TSH: 'TSH' } },
  };
  // unidades del Sur (internacionales) → factor para pasar a la unidad canónica
  const SUR = { GLU: ['mmol/L', 18.016], HB: ['g/L', 0.1], COL: ['mmol/L', 38.67], CRE: ['µmol/L', 1 / 88.4], TSH: ['mIU/L', 1] };
  const NOMBRES_F = ['Ana', 'Carla', 'Elena', 'Gabriela', 'Inés', 'Lucía', 'Natalia', 'Paula', 'Sofía', 'Valeria', 'Agustina', 'Micaela', 'Camila', 'Florencia', 'Rocío', 'Julieta'];
  const NOMBRES_M = ['Bruno', 'Diego', 'Facundo', 'Hernán', 'Joaquín', 'Martín', 'Óscar', 'Ramiro', 'Tomás', 'Federico', 'Santiago', 'Rodrigo', 'Matías', 'Andrés', 'Iván', 'Germán'];
  const APELLIDOS = ['Acosta', 'Benítez', 'Cabrera', 'Domínguez', 'Escobar', 'Fernández', 'Giménez', 'Herrera', 'Ibáñez', 'Juárez', 'López', 'Medina', 'Núñez', 'Olivera', 'Peña', 'Quiroga', 'Ríos', 'Silva', 'Torres', 'Urquiza', 'Vega', 'Zárate', 'Muñoz', 'Castro', 'Rosales', 'Sosa'];

  const T0 = () => inicioDiaLocal(cfg.inicio) - 3 * DIA;
  const HORIZONTE = () => inicioDiaLocal(cfg.inicio) + 30 * DIA;
  function hitos() {
    const i = inicioDiaLocal(cfg.inicio);
    return { formatoCentro: i + DIA, correccionSur: i + DIA + 14 * HORA, faltaCerro: i + 2 * DIA, olvido: i + 2 * DIA + 10 * HORA };
  }
  const claves = () => ({ host: 'sftp.redanalitica.example', puerto: 2222, usuario: 'equipo_datos', huella: 'SHA256:' + [...Array(43)].map((_, k) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[h32(cfg.semilla, 'hk', k) % 64]).join('') });

  // ---------------------------------------------------------------- el mundo
  let cache = null;
  function mundo() {
    const clave = cfg.semilla + ':' + T0(); if (cache && cache.clave === clave) return cache;
    const s = cfg.semilla; const Rp = azar(h32(s, 'pacientes'));
    const pacientes = [];
    for (let i = 0; i < 1600; i++) {
      const sexo = Rp.chance(0.53) ? 'F' : 'M'; const nom = Rp.pick(sexo === 'F' ? NOMBRES_F : NOMBRES_M); const ape = Rp.pick(APELLIDOS);
      const doc = 10000000 + Math.floor(Rp.r() * 45000000);
      const nac = `${Rp.int(1940, 2008)}-${pad(Rp.int(1, 12))}-${pad(Rp.int(1, 28))}`;
      pacientes.push({ i, doc, nombre: nom, apellido: ape, sexo, nac, diabetes: Rp.chance(0.12), hipo: Rp.chance(0.06), labs: Rp.chance(0.18) ? [Rp.pick(Object.keys(LABS)), Rp.pick(Object.keys(LABS))] : [Rp.pick(Object.keys(LABS))] });
    }
    const porLab = {}; for (const L of Object.keys(LABS)) porLab[L] = pacientes.filter((p) => p.labs.includes(L));
    const H = hitos(); const dias = []; for (let f = diaLocal(T0()); msDeDia(f) < HORIZONTE(); f = sumarDias(f, 1)) dias.push(f);
    const resultados = []; const entregas = []; let nMuestra = 0;
    for (const f of dias) {
      const finde = [0, 6].includes(new Date(msDeDia(f) + 12 * HORA).getUTCDay());
      for (const [L, info] of Object.entries(LABS)) {
        const R = azar(h32(s, 'dia', f, L)); const n = Math.round((finde ? 18 : 42) * (0.8 + R.r() * 0.4));
        const filas = [];
        for (let k = 0; k < n; k++) {
          const p = R.pick(porLab[L]); const urg = L === 'cerro' && R.chance(0.15);
          const toma = msDeDia(f) + (urg ? R.int(20 * 60, 23 * 60 + 50) : R.int(7 * 60, 11 * 60 + 30)) * MIN;
          const muestra = `${{ norte: 'N', centro: 'C', sur: 'S', costa: 'K', cerro: 'R' }[L]}-${100000 + (++nMuestra)}`;
          const tests = ['GLU', 'HB', 'COL', 'CRE', 'TSH'].filter((t, j) => (j === 0 ? R.chance(0.8) : R.chance(0.45)));
          if (!tests.length) tests.push('HB');
          for (const t of tests) {
            const E = ESTUDIOS[t]; let v;
            if (t === 'GLU') v = p.diabetes ? 140 + R.normal() * 30 : 88 + R.normal() * 9;
            else if (t === 'HB') v = (p.sexo === 'F' ? 13.2 : 14.8) + R.normal() * 1.3;
            else if (t === 'COL') v = 190 + R.normal() * 35;
            else if (t === 'CRE') v = (p.sexo === 'F' ? 0.8 : 1.0) + R.normal() * 0.18;
            else v = p.hipo ? 7 + R.r() * 4 : Math.max(0.3, 2 + R.normal() * 0.9);
            v = Math.max(t === 'CRE' ? 0.3 : t === 'TSH' ? 0.05 : 1, v);
            const canon = Number(v.toFixed(E.dec));
            filas.push({ lab: L, muestra, estudio: t, valor: canon, toma, fecha: diaLocal(toma), p });
          }
        }
        // llegada del archivo (día siguiente)
        const [hh, mm, var_] = info.llegada; let llega = msDeDia(f) + DIA + (hh * 60 + mm + R.int(0, var_)) * MIN;
        if (L === 'costa' && R.chance(0.25)) llega = msDeDia(f) + DIA + R.int(9 * 60, 11 * 60) * MIN;
        if (L === 'cerro' && R.chance(0.4)) llega = msDeDia(f) + DIA + R.int(10 * 60, 13 * 60) * MIN;
        if (L === 'cerro' && f === diaLocal(H.faltaCerro + HORA)) llega = msDeDia(f) + 2 * DIA + 15 * HORA + R.int(0, 20) * MIN; // el día que Cerro no entregó
        const formatoNuevo = L === 'centro' && msDeDia(f) >= H.formatoCentro;
        entregas.push({ lab: L, fecha: f, llega, filas, version: 1, formatoNuevo, nombre: nombreArchivo(L, f, 1) });
        resultados.push(...filas);
        // la corrección del Sur: reenvía el archivo completo del día anterior con algunos valores corregidos
        if (L === 'sur' && f === diaLocal(H.correccionSur - DIA)) {
          const R2 = azar(h32(s, 'corr', f)); const corr = filas.map((x) => ({ ...x }));
          const idx = new Set(); while (idx.size < Math.min(5, corr.length)) idx.add(R2.int(0, corr.length - 1));
          for (const k of idx) { const E = ESTUDIOS[corr[k].estudio]; corr[k].valor = Number((corr[k].valor * (R2.chance(0.5) ? 1.12 : 0.88)).toFixed(E.dec)); corr[k].corregido = true; }
          entregas.push({ lab: L, fecha: f, llega: H.correccionSur, filas: corr, version: 2, nombre: nombreArchivo(L, f, 2) });
        }
      }
    }
    // la persona del derecho al olvido: atendida en dos laboratorios antes del aviso
    const candidatos = pacientes.filter((p) => new Set(resultados.filter((r) => r.p === p && r.toma < H.olvido - DIA).map((r) => r.lab)).size >= 2);
    const olvidado = candidatos.length ? candidatos[h32(s, 'olvido') % candidatos.length] : pacientes[0];
    cache = { clave, pacientes, entregas, resultados, olvidado };
    return cache;
  }
  function nombreArchivo(L, f, v) {
    const [Y, M, D] = f.split('-');
    return { norte: `resultados_${Y}${M}${D}.csv`, centro: `CENTRO_${D}-${M}-${Y}.csv`, sur: `sur_resultados_${f}${v > 1 ? '_v' + v : ''}.jsonl`, costa: `Reporte Costa ${D}${M}${Y}.csv`, cerro: `cerro_${Y}${M}${D}.tsv` }[L];
  }

  // ---------------------------------------------------------------- los archivos, como los manda cada laboratorio
  const docNorte = (d) => String(d).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  function contenido(e) {
    const F = e.filas; const L = e.lab; const C = LABS[L].codigos;
    if (L === 'norte') return 'muestra_id,fecha_toma,documento,paciente,fecha_nacimiento,sexo,codigo,estudio,resultado,unidad\n' + F.map((x) => [x.muestra, fmtLoc(x.toma, 'YYYY-MM-DD hh:mm'), docNorte(x.p.doc), `"${x.p.nombre} ${x.p.apellido}"`, x.p.nac, x.p.sexo, C[x.estudio], ESTUDIOS[x.estudio].nombre, x.valor, ESTUDIOS[x.estudio].unidad].join(',')).join('\n') + '\n';
    if (L === 'centro') {
      const U = { GLU: 'mg/dl', HB: 'g/dl', COL: 'mg/dl', CRE: 'mg/dl', TSH: 'µUI/ml' };
      const dec = (v) => String(v).replace('.', ',');
      if (e.formatoNuevo) return 'Nro Muestra;Fecha;Documento;Apellido y Nombre;F. Nac.;Sexo;Cod. Prestacion;Prestacion;Metodo;Resultado;Unidad\n' + F.map((x) => [x.muestra, fmtLoc(x.toma, 'YYYY-MM-DD hh:mm'), x.p.doc, `${x.p.apellido.toUpperCase()}, ${x.p.nombre}`, x.p.nac, x.p.sexo, C[x.estudio], ESTUDIOS[x.estudio].nombre, x.estudio === 'TSH' ? 'Quimioluminiscencia' : 'Espectrofotometría', dec(x.valor), U[x.estudio]].join(';')).join('\n') + '\n';
      return latin1('Nro Muestra;Fecha;Documento;Apellido y Nombre;F. Nac.;Sexo;Cod. Prestacion;Prestacion;Resultado;Unidad\n' + F.map((x) => [x.muestra, fmtLoc(x.toma, 'DD/MM/YYYY hh:mm'), x.p.doc, `${x.p.apellido.toUpperCase()}, ${x.p.nombre}`, x.p.nac.split('-').reverse().join('/'), x.p.sexo, C[x.estudio], ESTUDIOS[x.estudio].nombre, dec(x.valor), U[x.estudio]].join(';')).join('\n') + '\n');
    }
    if (L === 'sur') return F.map((x) => { const [u, f] = SUR[x.estudio]; const dec = x.estudio === 'CRE' || x.estudio === 'HB' ? 0 : 2; return JSON.stringify({ sample: x.muestra, taken_at: fmtLoc(x.toma, 'YYYY-MM-DDThh:mm:00') + '-03:00', patient: { doc: x.p.doc, name: `${x.p.nombre} ${x.p.apellido}`, birth: x.p.nac, sex: x.p.sexo }, test: C[x.estudio], value: Number((x.valor / f).toFixed(dec)), unit: u }); }).join('\n') + '\n';
    if (L === 'costa') {
      const serial = (ms) => (((ms + ZONA_H * HORA) - Date.UTC(1899, 11, 30)) / DIA).toFixed(4);
      return '﻿Reporte de resultados - Laboratorio Costa\nGenerado: ' + fmtLoc(e.llega, 'DD/MM/YYYY hh:mm') + '\n\nMuestra,Fecha toma,CI,Nombre,Nacimiento,Sexo,Estudio,Valor,Unidad\n' + F.map((x) => [x.muestra, serial(x.toma), `CI ${x.p.doc}`, `"${x.p.apellido}, ${x.p.nombre}"`, x.p.nac.split('-').reverse().join('/'), x.p.sexo === 'F' ? 'Femenino' : 'Masculino', C[x.estudio], x.valor, ESTUDIOS[x.estudio].unidad].join(',')).join('\n') + `\n\nTotal de registros,${F.length}\n`;
    }
    // cerro: TSV, CRLF, UTC, filas repetidas
    const R = azar(h32(cfg.semilla, 'dup', e.fecha)); const filas = [];
    for (const x of F) { const linea = [x.muestra, new Date(x.toma).toISOString().slice(0, 19) + 'Z', x.p.doc, `${x.p.nombre} ${x.p.apellido}`, x.p.nac, x.p.sexo, C[x.estudio], x.valor, ESTUDIOS[x.estudio].unidad].join('\t'); filas.push(linea); if (R.chance(0.03)) filas.push(linea); }
    return 'ID\tFECHA_UTC\tDOC\tNOMBRE\tNAC\tSEXO\tCOD\tVALOR\tUNID\r\n' + filas.join('\r\n') + '\r\n';
  }

  // ---------------------------------------------------------------- el servidor SFTP
  const RETENCION = 7 * DIA;
  function servidor(t = ahora()) {
    const out = [];
    for (const e of mundo().entregas) if (e.llega <= t && e.llega > t - RETENCION) out.push({ ruta: `/entrantes/${e.lab}/${e.nombre}`, mtime: e.llega, e });
    return out;
  }
  const leer = (e) => contenido(e);

  // ---------------------------------------------------------------- la verdad
  /** Resultados vigentes (la última versión entregada de cada archivo) de los archivos ya entregados en t. */
  function vigentes(t = ahora()) {
    const ult = new Map();
    for (const e of mundo().entregas) { if (e.llega > t) continue; const k = e.lab + '|' + e.fecha; if (!ult.has(k) || ult.get(k).version < e.version) ult.set(k, e); }
    return [...ult.values()].flatMap((e) => e.filas);
  }
  const fueraDeRango = (x) => { const E = ESTUDIOS[x.estudio]; return x.valor < E.min || x.valor > E.max; };

  const API = { cfg, configurar(c) { const a = cfg.semilla + ':' + cfg.inicio; Object.assign(cfg, c || {}); if (a !== cfg.semilla + ':' + cfg.inicio) cache = null; }, ahora, hitos, claves, mundo, servidor, leer, vigentes, fueraDeRango, ESTUDIOS, LABS, SUR, diaLocal, inicioDiaLocal, msDeDia, sumarDias, nombreArchivo, T0 };
  window.RedAnalitica = API;

  // ---------------------------------------------------------------- en la página
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  function datos() {
    const S = almacen(); if (!S) return null;
    S.data.red = S.data.red || {}; const D = S.data.red;
    if (!D.semilla) D.semilla = 1000 + Math.floor(Math.random() * 899000);
    if (!D.inicio) D.inicio = Date.now();
    return D;
  }
  function sincronizar() { const D = datos(); if (!D) return false; API.configurar({ semilla: D.semilla, inicio: D.inicio }); return true; }
  window.RedAnaliticaHost = { datos, sincronizar, guardar() { try { almacen().save(); } catch (e) { /* lleno */ } } };
  const intento = setInterval(() => { if (sincronizar()) clearInterval(intento); }, 300);
})();
