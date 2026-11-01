/* Ejercicios de DAX autocorregidos sobre las bases del curso.
 *
 * El modelo semántico son las tablas del curso (las mismas del laboratorio SQL) con las relaciones que ya
 * declara bases.js (clave foránea → clave primaria), todas de varios a uno y con filtro en una dirección,
 * como las crearía Power BI. El motor es el mismo del Power BI de práctica (powerbi-dax.js).
 *
 * Dos clases de ejercicio:
 *  - consulta: el alumno escribe una consulta DAX (EVALUATE …) y se compara el resultado con la solución;
 *  - medida: el ejercicio trae un bloque ```dax prueba``` (una consulta con [?]); el alumno escribe la
 *    expresión de una medida ("Nombre = expresión" o solo la expresión) y se evalúa en esa consulta.
 */
(function () {
  'use strict';
  const E = window.Engines; if (!E) return;
  let db = null, motorBase = null, metaCache = null, relsCache = null;
  function tipos() {
    if (metaCache) return metaCache;
    metaCache = {};
    for (const [t, T] of Object.entries(E.SQL.tables)) {
      metaCache[t] = T.columns.map((c, i) => {
        const vals = T.rows.slice(0, 300).map((r) => r[i]);
        const tp = window.PBIDatos ? window.PBIDatos.detectarTipo(vals) : 'texto';
        return { n: c, t: tp };
      });
    }
    return metaCache;
  }
  function relaciones() {
    if (relsCache) return relsCache;
    relsCache = [];
    const B = window.Bases, casos = (window.DataGen && window.DataGen.CASOS) || [];
    const visto = new Set();
    for (const c of casos) {
      const b = B && B.infoBase(c.id); if (!b || !b.rels) continue;
      for (const r of b.rels) {
        const [de, cde, a, ca] = r; if (!E.SQL.tables[de] || !E.SQL.tables[a]) continue;
        const k = `${de}|${cde}|${a}|${ca}`; if (visto.has(k)) continue; visto.add(k);
        const activa = !relsCache.some((x) => x.activa && x.de === de && x.a === a);
        relsCache.push({ de, cde, a, ca, activa, direccion: 'unica' });
      }
    }
    return relsCache;
  }
  async function preparar() {
    await E.SQL.init();
    if (!db) db = E.SQL.fresh();
    return db;
  }
  function motor(medidas) {
    const api = { tablas: () => Object.keys(E.SQL.tables), meta: (t) => tipos()[t] || [], rels: relaciones, medidas: () => medidas || [], exec: (s) => { const r = db.exec(s); return r.length ? r[r.length - 1].values : []; }, run: (s, p) => db.run(s, p) };
    return window.PBIDax.crear(api);
  }
  // medidas del modelo que trae el ejercicio: una por línea, "Nombre = expresión"
  const medidasDe = (ex) => (ex.medidas || '').split('\n').map((l) => /^\s*([^=]+?)\s*=\s*(.+)$/.exec(l)).filter(Boolean).map((m) => ({ nombre: m[1].trim().replace(/^\[|\]$/g, ''), expr: m[2].trim(), tabla: '' }));
  function consultaDe(ex, codigo) {
    const t = String(codigo || '').trim();
    if (!ex.prueba) return t;
    // modo medida: "Nombre = expr" o solo "expr"
    // "Nombre = expresión": el nombre no tiene paréntesis ni corchetes; una expresión que empieza con VAR no tiene nombre
    const m = /^VAR\s/i.test(t) ? null : /^([^=\n(\["']+?)\s*=\s*([\s\S]+)$/.exec(t);
    const expr = (m ? m[2] : t).trim();
    if (!expr) throw new Error('Escribe la expresión de la medida.');
    return { expr, consulta: ex.prueba };
  }
  function ejecutar(ex, codigo) {
    const medidas = medidasDe(ex);
    const q = consultaDe(ex, codigo);
    const t0 = performance.now();
    let rs;
    if (typeof q === 'string') rs = motor(medidas).consulta(q);
    else {
      const todas = [...medidas, { nombre: '?', expr: q.expr, tabla: '' }];
      rs = motor(todas).consulta(q.consulta);
    }
    const r = rs[rs.length - 1];
    return { ok: true, results: [{ columns: r.cols, values: r.filas }], ms: performance.now() - t0, sql: r.sql };
  }
  const esperado = new Map();
  window.Engines.DAX = {
    async run(ex, codigo) {
      await preparar();
      try { return ejecutar(ex, codigo); } catch (e) { return { ok: false, error: e.message }; }
    },
    async grade(ex, codigo) {
      await preparar();
      let got; try { got = ejecutar(ex, codigo); } catch (e) { return { ok: false, error: e.message }; }
      if (!esperado.has(ex.id)) { const r = ejecutar(ex, ex.solucion); esperado.set(ex.id, r.results[0]); }
      const exp = esperado.get(ex.id), res = got.results[0];
      return { ok: true, ...E.compareResults(res, exp, !!ex.ordenado), result: res };
    },
    modelo: () => ({ tablas: tipos(), relaciones: relaciones() }),
    registrarMonaco(monaco) {
      if (monaco.languages.getLanguages().some((l) => l.id === 'dax')) return;
      monaco.languages.register({ id: 'dax' });
      monaco.languages.setMonarchTokensProvider('dax', { ignoreCase: true, keywords: ['EVALUATE', 'DEFINE', 'MEASURE', 'VAR', 'RETURN', 'ORDER', 'BY', 'ASC', 'DESC', 'IN', 'NOT'], funciones: window.PBIDax.FUNCIONES, tokenizer: { root: [[/\/\/.*$/, 'comment'], [/--.*$/, 'comment'], [/"([^"]|"")*"/, 'string'], [/'[^']*'/, 'type'], [/\[[^\]]*\]/, 'variable'], [/\d+(\.\d+)?/, 'number'], [/[A-Za-z_][\w.]*(?=\s*\()/, { cases: { '@funciones': 'keyword', '@default': 'identifier' } }], [/[A-Za-z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }]] } });
      monaco.languages.registerCompletionItemProvider('dax', { triggerCharacters: ['[', "'"], provideCompletionItems: (model, pos) => { const w = model.getWordUntilPosition(pos); const range = { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber, startColumn: w.startColumn, endColumn: w.endColumn }; const K = monaco.languages.CompletionItemKind; const s = window.PBIDax.FUNCIONES.map((f) => ({ label: f, kind: K.Function, insertText: f + '(', range })); for (const [t, cols] of Object.entries(tipos())) { s.push({ label: t, kind: K.Class, insertText: t, range }); for (const c of cols) s.push({ label: `${t}[${c.n}]`, kind: K.Field, insertText: `${t}[${c.n}]`, range }); } return { suggestions: s }; } });
    },
  };
})();
