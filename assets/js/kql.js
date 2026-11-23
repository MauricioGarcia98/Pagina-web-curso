/* KQL (Kusto Query Language) de práctica, compartido por el Eventhouse de Fabric y Log Analytics de Azure.
 * Traduce lo que más se usa de KQL a SQL de SQLite y lo ejecuta con sql.js sobre tablas en memoria:
 *   where, take/limit, project, project-away, extend, summarize … by (con bin y arg_max), order/sort by, top,
 *   count, distinct y render; funciones ago(), now(), datetime_diff(), strcat(), iff(), has, contains, startswith,
 *   between, in, isempty/isnotempty, tostring/toint/todouble.
 * No es el lenguaje completo: cuando algo no está, el error lo dice y propone lo que sí funciona.
 * Las fechas se guardan como texto ISO en UTC (2026-11-22T13:05:00), como las muestra Log Analytics.
 */
(function () {
  'use strict';
  const UNIDADES = { s: 'seconds', m: 'minutes', h: 'hours', d: 'days' };
  const SEG = { second: 1, minute: 60, hour: 3600, day: 86400 };
  function expr(x) {
    return String(x)
      .replace(/\bnow\(\)/g, "strftime('%Y-%m-%dT%H:%M:%S','now')")
      .replace(/\bago\(\s*(\d+)\s*([smhd])\s*\)/g, (m, n, u) => `strftime('%Y-%m-%dT%H:%M:%S','now','-${n} ${UNIDADES[u]}')`)
      .replace(/\bdatetime\(\s*"?([\d-]+(?:[T ][\d:]+)?)"?\s*\)/g, (m, d) => `'${d.replace(' ', 'T')}'`)
      .replace(/"([^"]*)"/g, "'$1'")
      .replace(/\bdatetime_diff\(\s*'(second|minute|hour|day)'\s*,\s*([^,()]+)\s*,\s*([^,()]+)\s*\)/g, (m, u, a, b) => `CAST((strftime('%s', ${a}) - strftime('%s', ${b})) / ${SEG[u]} AS INTEGER)`)
      .replace(/\bstrcat\(([^()]*)\)/g, (m, args) => `(${partirComas(args).join(' || ')})`)
      .replace(/(\w+)\s+!has\s+('[^']*')/gi, (m, a, b) => `NOT ((' ' || lower(${a}) || ' ') LIKE '%' || lower(${b}) || '%')`)
      .replace(/(\w+)\s+has\s+('[^']*')/gi, (m, a, b) => `(' ' || lower(${a}) || ' ') LIKE '%' || lower(${b}) || '%'`)
      .replace(/(\w+)\s+!contains\s+('[^']*')/gi, (m, a, b) => `NOT (lower(${a}) LIKE '%' || lower(${b}) || '%')`)
      .replace(/(\w+)\s+contains\s+('[^']*')/gi, (m, a, b) => `lower(${a}) LIKE '%' || lower(${b}) || '%'`)
      .replace(/(\w+)\s+startswith\s+('[^']*')/gi, (m, a, b) => `lower(${a}) LIKE lower(${b}) || '%'`)
      .replace(/(\w+)\s+endswith\s+('[^']*')/gi, (m, a, b) => `lower(${a}) LIKE '%' || lower(${b})`)
      .replace(/(\w+)\s+!in\s*\(/gi, '$1 NOT IN (').replace(/(\w+)\s+in~\s*\(/gi, '$1 IN (')
      .replace(/(\w+)\s+between\s*\(\s*([^.]+?)\s*\.\.\s*([^)]+?)\s*\)/gi, '($1 BETWEEN $2 AND $3)')
      .replace(/\biff\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, '(CASE WHEN $1 THEN $2 ELSE $3 END)')
      .replace(/\b(toint|tolong)\(([^()]*)\)/g, 'CAST($2 AS INTEGER)').replace(/\b(todouble|toreal)\(([^()]*)\)/g, 'CAST($2 AS REAL)').replace(/\btostring\(([^()]*)\)/g, 'CAST($1 AS TEXT)')
      .replace(/=~/g, ' LIKE ').replace(/==/g, '=').replace(/\bstrlen\(/g, 'length(').replace(/\btolower\(/g, 'lower(').replace(/\btoupper\(/g, 'upper(')
      .replace(/\bisnotempty\(([^)]+)\)/g, "($1 IS NOT NULL AND $1 <> '')").replace(/\bisempty\(([^)]+)\)/g, "($1 IS NULL OR $1 = '')")
      .replace(/\bisnotnull\(([^)]+)\)/g, '($1 IS NOT NULL)').replace(/\bisnull\(([^)]+)\)/g, '($1 IS NULL)')
      .replace(/\bnot\(/g, 'NOT (').replace(/\btrue\b/g, '1').replace(/\bfalse\b/g, '0');
  }
  function bin(col, paso) {
    const m = /^(\d+)([smhd])$/.exec(paso.trim()); if (!m) throw new Error(`bin(): intervalo inválido "${paso}". Usa 30s, 5m, 1h o 1d.`);
    const n = Number(m[1]), u = m[2];
    if (u === 'd') return `strftime('%Y-%m-%dT00:00:00', ${col})`;
    if (u === 'h') return n === 1 ? `strftime('%Y-%m-%dT%H:00:00', ${col})` : `strftime('%Y-%m-%dT', ${col}) || printf('%02d', (CAST(strftime('%H', ${col}) AS INT) / ${n}) * ${n}) || ':00:00'`;
    if (u === 'm') return `strftime('%Y-%m-%dT%H:', ${col}) || printf('%02d', (CAST(strftime('%M', ${col}) AS INT) / ${n}) * ${n}) || ':00'`;
    return `strftime('%Y-%m-%dT%H:%M:', ${col}) || printf('%02d', (CAST(strftime('%S', ${col}) AS INT) / ${n}) * ${n})`;
  }
  function partirComas(t) { const out = []; let p = 0, cur = '', q = null; for (const ch of t) { if (q) { cur += ch; if (ch === q) q = null; continue; } if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; } if (ch === '(') p++; if (ch === ')') p--; if (ch === ',' && !p) { out.push(cur.trim()); cur = ''; continue; } cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
  function agg(a) {
    const m = /^(?:(\w+)\s*=\s*)?(\w+)\((.*)\)$/.exec(a.trim()); if (!m) throw new Error(`summarize: no entiendo "${a}". Usa count(), sum(x), avg(x), min(x), max(x), dcount(x), countif(cond) o arg_max(x, *).`);
    const [, alias, fn, arg] = m; const f = fn.toLowerCase();
    const sql = f === 'count' ? 'COUNT(*)' : f === 'dcount' ? `COUNT(DISTINCT ${expr(arg)})` : f === 'countif' ? `SUM(CASE WHEN ${expr(arg)} THEN 1 ELSE 0 END)` : f === 'sumif' ? (() => { const [x, cond] = partirComas(arg); return `SUM(CASE WHEN ${expr(cond)} THEN ${expr(x)} ELSE 0 END)`; })() : ['sum', 'avg', 'min', 'max'].includes(f) ? `${f.toUpperCase()}(${expr(arg)})` : null;
    if (!sql) throw new Error(`summarize: la función ${fn}() no está en la práctica (usa count, sum, avg, min, max, dcount, countif, sumif o arg_max).`);
    return `${sql} AS "${alias || (f === 'count' ? 'count_' : `${f}_${String(arg).replace(/\W+/g, '_')}`)}"`;
  }
  // devuelve { sql, render, away }: away son columnas que se quitan del resultado (project-away y la auxiliar de arg_max)
  function aSql(kql, tablas) {
    const etapas = kql.split('\n').map((l) => l.replace(/\/\/(?=(?:[^"]*"[^"]*")*[^"]*$).*$/, '')).join(' ').split(/\|(?=(?:[^"']*["'][^"']*["'])*[^"']*$)/).map((x) => x.trim()).filter(Boolean);
    const t0 = etapas.shift(); if (!t0 || !/^[A-Za-z_]\w*$/.test(t0)) throw new Error(`Syntax error: la consulta tiene que empezar con el nombre de una tabla (por ejemplo: ${tablas[0] || 'MiTabla'} | take 10).`);
    const real = tablas.find((x) => x.toLowerCase() === t0.toLowerCase());
    if (!real) throw new Error(`'${t0}': failed to resolve table or column expression named '${t0}'. Tablas: ${tablas.join(', ') || '(ninguna)'}.`);
    let sql = `SELECT * FROM "${real}"`; let render = null; const away = [];
    for (const e of etapas) {
      const m = /^(\w+(?:-\w+)?)\s*([\s\S]*)$/.exec(e); if (!m) throw new Error(`Syntax error cerca de "${e.slice(0, 30)}".`);
      const op = m[1].toLowerCase(); const r = m[2].trim();
      if (op === 'where') sql = `SELECT * FROM (${sql}) WHERE ${expr(r)}`;
      else if (op === 'take' || op === 'limit') sql = `SELECT * FROM (${sql}) LIMIT ${parseInt(r, 10) || 10}`;
      else if (op === 'project') sql = `SELECT ${partirComas(r).map((x) => { const q = /^(\w+)\s*=\s*([\s\S]+)$/.exec(x); return q ? `${expr(q[2])} AS "${q[1]}"` : expr(x); }).join(', ')} FROM (${sql})`;
      else if (op === 'project-away') away.push(...partirComas(r));
      else if (op === 'extend') sql = `SELECT *, ${partirComas(r).map((x) => { const q = /^(\w+)\s*=\s*([\s\S]+)$/.exec(x); if (!q) throw new Error(`extend: falta el nombre de la columna (extend nueva = …) en "${x}"`); return `${expr(q[2])} AS "${q[1]}"`; }).join(', ')} FROM (${sql})`;
      else if (op === 'summarize') {
        const [aggs, by] = r.split(/\bby\b/i); const grupos = by ? partirComas(by).map((g) => { const b = /^(?:(\w+)\s*=\s*)?bin\(\s*(\w+)\s*,\s*([^)]+)\)$/.exec(g); if (b) return [bin(b[2], b[3]), b[1] || b[2]]; const q = /^(\w+)\s*=\s*([\s\S]+)$/.exec(g); return q ? [expr(q[2]), q[1]] : [expr(g), g]; }) : [];
        const am = /^arg_max\(\s*(\w+)\s*,\s*\*\s*\)$/i.exec(aggs.trim());
        if (am) { // la fila completa con el máximo de cada grupo (en SQLite, las columnas sueltas salen de la fila del MAX)
          sql = `SELECT *, MAX(${am[1]}) AS "__max" FROM (${sql})${grupos.length ? ` GROUP BY ${grupos.map(([x]) => x).join(', ')}` : ''}`; away.push('__max');
        } else {
          const sel = [...grupos.map(([x, a]) => `${x} AS "${a}"`), ...partirComas(aggs).filter(Boolean).map(agg)];
          sql = `SELECT ${sel.join(', ')} FROM (${sql})${grupos.length ? ` GROUP BY ${grupos.map(([x]) => x).join(', ')}` : ''}`;
        }
      } else if (op === 'order' || op === 'sort') sql = `SELECT * FROM (${sql}) ORDER BY ${partirComas(r.replace(/^by\s+/i, '')).map((x) => (/\b(asc|desc)$/i.test(x) ? x : `${x} desc`)).join(', ')}`;
      else if (op === 'top') { const q = /^(\d+)\s+by\s+(.+)$/i.exec(r); if (!q) throw new Error('top: usa "top 10 by columna desc"'); sql = `SELECT * FROM (${sql}) ORDER BY ${/\b(asc|desc)$/i.test(q[2]) ? q[2] : q[2] + ' desc'} LIMIT ${q[1]}`; }
      else if (op === 'count') sql = `SELECT COUNT(*) AS "Count" FROM (${sql})`;
      else if (op === 'distinct') sql = `SELECT DISTINCT ${r === '*' ? '*' : partirComas(r).join(', ')} FROM (${sql})`;
      else if (op === 'render') render = r.split(/\s+/)[0].toLowerCase();
      else throw new Error(`Syntax error: el operador '${op}' no está en la práctica. Usa where, project, project-away, extend, summarize, order by, top, take, count, distinct o render.`);
    }
    return { sql, render, away };
  }
  // tablas: { Nombre: { cols: [{ n, t }], filas: [[…]] } } · devuelve { columns, values, sql, render, ms }
  async function ejecutar(tablas, kql) {
    const { sql, render, away } = aSql(kql, Object.keys(tablas));
    const SQL = window.Engines.SQL; if (!SQL._SQL) await SQL.init();
    const db = new SQL._SQL.Database();
    try {
      for (const [n, t] of Object.entries(tablas)) {
        db.run(`CREATE TABLE "${n}" (${t.cols.map((x) => `"${x.n}"`).join(', ')})`);
        if (t.filas.length) { const st = db.prepare(`INSERT INTO "${n}" VALUES (${t.cols.map(() => '?').join(',')})`); db.run('BEGIN'); for (const f of t.filas) st.run(f.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v == null ? null : typeof v === 'object' ? JSON.stringify(v) : v))); db.run('COMMIT'); st.free(); }
      }
      const t0 = performance.now(); const r = db.exec(sql); const ms = Math.round(performance.now() - t0);
      let res = r[r.length - 1] || { columns: [], values: [] };
      if (away.length) { const keep = res.columns.map((c, j) => (away.includes(c) ? -1 : j)).filter((j) => j >= 0); res = { columns: keep.map((j) => res.columns[j]), values: res.values.map((f) => keep.map((j) => f[j])) }; }
      // los bool se muestran true/false (SQLite los guarda como 1/0)
      const bools = new Set(Object.values(tablas).flatMap((t) => t.cols.filter((x) => /bool/i.test(x.t || '')).map((x) => x.n)));
      res.columns.forEach((col, j) => { if (bools.has(col)) res.values.forEach((f) => { if (f[j] === 1 || f[j] === 0) f[j] = f[j] ? 'true' : 'false'; }); });
      return { columns: res.columns, values: res.values, sql, render, ms };
    } finally { db.close(); }
  }
  // gráfico SVG para render: timechart/linechart (una serie por categoría), columnchart/barchart y piechart
  function grafico(res, tipo, esc, clase = 'kql-graf') {
    const filas = res.values.slice(0, 200); const ys = filas.map((f) => Number(f[f.length - 1]) || 0); const max = Math.max(1, ...ys);
    const W = 640, H = 200, L = 40, B = 30, an = (W - L - 10) / Math.max(1, filas.length); const Y = (v) => H - B - (v / max) * (H - B - 10);
    const COL = ['#0f7b6c', '#1b6ac9', '#c239b3', '#d83b01', '#8a3ffc', '#c19c00'];
    const fmt = (v) => String(Math.round(v * 100) / 100);
    if (tipo === 'piechart') { let a0 = 0; const tot = ys.reduce((a, b) => a + b, 0) || 1; return `<svg class="${clase}" viewBox="0 0 ${W} ${H}">${filas.slice(0, 12).map((f, i) => { const a1 = a0 + (ys[i] / tot) * Math.PI * 2; const p = (a) => `${100 + 80 * Math.cos(a)},${100 + 80 * Math.sin(a)}`; const d = a1 - a0 >= Math.PI * 2 - 1e-6 ? 'M20,100 a80,80 0 1,0 160,0 a80,80 0 1,0 -160,0' : `M100,100 L${p(a0)} A80,80 0 ${a1 - a0 > Math.PI ? 1 : 0},1 ${p(a1)} Z`; a0 = a1; return `<path d="${d}" fill="${COL[i % 6]}"/><text x="210" y="${30 + i * 18}" font-size="12" fill="currentColor"><tspan fill="${COL[i % 6]}">■</tspan> ${esc(f[0])}: ${fmt(ys[i])}</text>`; }).join('')}</svg>`; }
    const eje = `<line x1="${L}" y1="${H - B}" x2="${W}" y2="${H - B}" stroke="currentColor" opacity=".3"/><text x="${L - 4}" y="${Y(max) + 4}" font-size="10" text-anchor="end" fill="currentColor">${fmt(max)}</text>`;
    if (tipo === 'timechart' || tipo === 'linechart' || tipo === 'areachart') {
      const cols = res.columns; const it = cols.findIndex((n, k) => filas.some((f) => /^\d{4}-\d\d-\d\dT/.test(String(f[k]))));
      const ix = it >= 0 ? it : 0; const iy = cols.length - 1; const is = cols.findIndex((n, k) => k !== ix && k !== iy);
      const xs = [...new Set(filas.map((f) => String(f[ix])))].sort(); const px = (x) => L + (xs.length > 1 ? (xs.indexOf(String(x)) / (xs.length - 1)) * (W - L - 20) : (W - L) / 2);
      const series = {}; for (const f of filas) { const k = is >= 0 ? String(f[is]) : cols[iy]; (series[k] = series[k] || []).push(f); }
      const nombres = Object.keys(series).slice(0, 6);
      return `<svg class="${clase}" viewBox="0 0 ${W} ${H + 18}">${eje}${nombres.map((n, k) => `<polyline fill="none" stroke="${COL[k]}" stroke-width="2.2" points="${series[n].sort((a, b) => String(a[ix]).localeCompare(String(b[ix]))).map((f) => `${px(f[ix])},${Y(Number(f[iy]) || 0)}`).join(' ')}"/>${series[n].map((f) => `<circle cx="${px(f[ix])}" cy="${Y(Number(f[iy]) || 0)}" r="3" fill="${COL[k]}"><title>${esc(n)} · ${esc(f[ix])}: ${fmt(Number(f[iy]) || 0)}</title></circle>`).join('')}`).join('')}${xs.map((x, k) => (k % Math.ceil(xs.length / 8) ? '' : `<text x="${px(x)}" y="${H - 12}" font-size="10" text-anchor="middle" fill="currentColor">${esc(x.slice(11, 16) || x.slice(0, 10))}</text>`)).join('')}${nombres.map((n, k) => `<text x="${L + k * 100}" y="${H + 12}" font-size="11" fill="currentColor"><tspan fill="${COL[k]}">■</tspan> ${esc(n)}</text>`).join('')}</svg>`;
    }
    return `<svg class="${clase}" viewBox="0 0 ${W} ${H}">${eje}${filas.map((f, i) => `<rect x="${L + i * an + an * 0.15}" y="${Y(ys[i])}" width="${an * 0.7}" height="${H - B - Y(ys[i])}" fill="#0f7b6c"><title>${esc(f[0])}: ${fmt(ys[i])}</title></rect>`).join('')}${filas.map((f, i) => (i % Math.ceil(filas.length / 8) ? '' : `<text x="${L + i * an + an / 2}" y="${H - 12}" font-size="10" text-anchor="middle" fill="currentColor">${esc(String(f[0]).slice(11, 16) || String(f[0]).slice(0, 10))}</text>`)).join('')}</svg>`;
  }
  window.KQL = { aSql, ejecutar, grafico, expr };
})();
