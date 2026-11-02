/* Ejercicios autocorregidos de Databricks SQL (tipo "dbsql").
 *
 * Cada intento corre en un metastore propio y vacío (DBSQL.aislado): el setup del ejercicio crea las
 * tablas, después corre el código del alumno y al final la consulta de control (```sql check```). Lo
 * mismo con la solución, y se comparan los dos resultados. Así un MERGE, un RESTORE o un COPY INTO se
 * corrigen por el estado en que dejan las tablas, no por cómo están escritos.
 *
 * modo=pipeline: el código es el de un pipeline (CREATE OR REFRESH STREAMING TABLE / MATERIALIZED VIEW,
 * expectativas, AUTO CDC) y se ejecuta con el mismo motor de pipelines del Databricks de práctica,
 * con destino main.default.
 *
 * ```texto archivos```: archivos para los volúmenes, separados por líneas "--- /Volumes/…/archivo.csv".
 */
(function () {
  'use strict';
  const E = window.Engines; if (!E) return;
  const X = () => window.DBSQL;
  function archivosDe(ex) {
    const out = {}; if (!ex.archivos) return out;
    let ruta = null, buf = [];
    const cerrar = () => { if (ruta) out[ruta] = buf.join('\n') + '\n'; };
    for (const l of ex.archivos.split('\n')) { const m = /^---\s+(\/\S+)\s*$/.exec(l); if (m) { cerrar(); ruta = m[1]; buf = []; } else if (ruta) buf.push(l); }
    cerrar();
    return out;
  }
  const tabla = (r) => ({ columns: r.cols || [], values: r.filas || [] });
  async function pipeline(codigo) {
    const D = window.DBX; if (!D || !D.correrPipeline) throw new Error('El motor de pipelines no está cargado.');
    if (D.asegurarStore) D.asegurarStore({ data: {}, save() {} });
    const W = D.ws(); W.pipelines = W.pipelines || {};
    const id = '__ejercicio';
    W.pipelines[id] = { nombre: 'ejercicio', catalogo: 'main', esquema: 'default', modo: 'triggered', fuente: codigo, updates: [] };
    try {
      const up = await D.correrPipeline(id, {});
      return { up, log: up.eventos.map((e) => `${e.nivel === 'ERROR' ? '✗' : '·'} ${e.msg}`).join('\n') };
    } finally { delete W.pipelines[id]; D.guardar && D.guardar(); }
  }
  async function correr(ex, codigo) {
    const t0 = performance.now();
    return X().aislado(async () => {
      if (ex.setup) {
        const r = await X().ejecutar(ex.setup, { origen: 'Ejercicio' });
        const m = r.find((x) => !x.ok); if (m) throw new Error('El setup del ejercicio falló (avisa del error): ' + m.error);
      }
      let res = [], log = '', fallo = null;
      if (ex.modo === 'pipeline') {
        const p = await pipeline(codigo); log = p.log;
        if (p.up.estado !== 'COMPLETED') fallo = p.up.error || 'El pipeline falló.';
      } else {
        if (!String(codigo || '').replace(/--[^\n]*/g, '').trim()) throw new Error('Escribe tu código SQL.');
        res = await X().ejecutar(codigo, { origen: 'Ejercicio' });
        const m = res.find((x) => !x.ok); if (m) fallo = m.error;
      }
      let check = null;
      let errorCheck = null;
      if (!fallo && ex.check) { const c = await X().ejecutar(ex.check, { origen: 'Ejercicio' }); check = c[c.length - 1]; if (!check.ok) { errorCheck = check.error; check = null; } }
      return { res, log, fallo, check, errorCheck, ms: performance.now() - t0 };
    }, archivosDe(ex));
  }
  const clase = (m) => ((/^\[([A-Z_.]+)\]/.exec(m || '') || [])[1] || m);
  function salida(r) {
    if (r.fallo) return { ok: false, error: (r.log ? r.log + '\n\n' : '') + r.fallo };
    if (r.errorCheck) r.log = [r.log, 'Consulta de control → ' + r.errorCheck].filter(Boolean).join('\n');
    const sets = r.res.filter((x) => x.ok && x.cols && x.cols.length).map(tabla);
    if (r.check) sets.push(tabla(r.check));
    const msgs = r.res.filter((x) => x.ok && x.msg).map((x) => x.msg);
    return { ok: true, results: sets, ms: r.ms, log: [r.log, ...msgs].filter(Boolean).join('\n') };
  }
  const resultadoFinal = (r) => (r.check ? tabla(r.check) : (() => { const u = r.res.filter((x) => x.ok).pop(); return u ? tabla(u) : { columns: [], values: [] }; })());
  const esperado = new Map();
  window.Engines.DBSQL = {
    async run(ex, codigo) {
      try { return salida(await correr(ex, codigo)); } catch (e) { return { ok: false, error: e.message }; }
    },
    async grade(ex, codigo) {
      let r; try { r = await correr(ex, codigo); } catch (e) { return { ok: false, error: e.message }; }
      if (r.fallo) return { ok: false, error: (r.log ? r.log + '\n\n' : '') + r.fallo };
      if (!esperado.has(ex.id)) {
        const s = await correr(ex, ex.solucion);
        if (s.fallo) return { ok: false, error: 'La solución del ejercicio no corre (avisa del error): ' + s.fallo };
        esperado.set(ex.id, s.errorCheck ? { error: clase(s.errorCheck) } : resultadoFinal(s));
      }
      const exp = esperado.get(ex.id);
      // control que tiene que fallar (por ejemplo, una restricción): se compara la clase de error
      if (exp.error) {
        const vacio = { columns: ['resultado'], values: [[r.errorCheck || 'la consulta de control no falló']] };
        if (r.errorCheck && clase(r.errorCheck) === exp.error) return { ok: true, pass: true, msg: `Correcto: la consulta de control falla con [${exp.error}], como se esperaba.`, result: vacio, log: r.log };
        return { ok: true, pass: false, msg: r.errorCheck ? `La consulta de control falló, pero con otro error (${clase(r.errorCheck)}); se esperaba [${exp.error}].` : `La consulta de control tenía que fallar con [${exp.error}] y se ejecutó sin error: la tabla no tiene la regla que pide el ejercicio.`, result: vacio, log: r.log };
      }
      if (r.errorCheck) return { ok: false, error: 'La consulta de control falló: ' + r.errorCheck };
      const res = resultadoFinal(r);
      const cmp = E.compareResults(res, exp, !!ex.ordenado);
      if (!cmp.pass && ex.check) cmp.msg = 'Las tablas no quedaron como se esperaba. ' + cmp.msg.replace('Tu consulta devolvió', 'La consulta de control devolvió');
      return { ok: true, ...cmp, result: res, log: r.log };
    },
  };
})();
