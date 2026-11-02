/* Databricks de práctica — datos: Catalog Explorer (Unity Catalog), editor SQL, consultas guardadas,
 * historial de consultas, subida de archivos a tablas Delta y visualizaciones de resultados.
 * Usa el motor de Databricks SQL de dbsql.js.
 */
(function () {
  'use strict';
  const D = (window.DBX = window.DBX || {});
  const { esc, ic } = D;
  const SQLX = () => window.DBSQL;

  // ------------------------------------------------------------------ visualizaciones (SVG)
  const COLORES = ['#2272B4', '#FFAB00', '#00A972', '#FF3621', '#8BCAE7', '#AB4057', '#99DDB4', '#FCA4A1', '#919191', '#BF7080'];
  D.Viz = {
    svg(v, r) {
      const ix = r.cols.indexOf(v.x), iys = (v.ys || []).map((y) => r.cols.indexOf(y)).filter((i) => i >= 0);
      if (v.tipo === 'counter') { const i = iys[0] ?? 0; const val = r.filas.length ? r.filas[0][i] : null; return `<div class="dbx-counter"><b>${val == null ? '—' : typeof val === 'number' ? val.toLocaleString('es') : esc(val)}</b><span>${esc(v.nombre || r.cols[i] || '')}</span></div>`; }
      if (ix < 0 || !iys.length) return '<p class="dbx-dim">Elige la columna del eje X y al menos una columna Y.</p>';
      // agrupa por X con la agregación elegida
      const grupos = new Map();
      for (const f of r.filas) { const k = f[ix] == null ? 'null' : String(f[ix]); if (!grupos.has(k)) grupos.set(k, iys.map(() => [])); iys.forEach((iy, j) => grupos.get(k)[j].push(Number(f[iy]) || 0)); }
      const ag = (a) => (v.agg === 'count' ? a.length : v.agg === 'avg' ? a.reduce((x, y) => x + y, 0) / (a.length || 1) : v.agg === 'max' ? Math.max(...a) : v.agg === 'min' ? Math.min(...a) : a.reduce((x, y) => x + y, 0));
      let puntos = [...grupos].map(([k, arr]) => ({ k, vals: arr.map(ag) }));
      if (v.orden === 'y') puntos.sort((a, b) => b.vals[0] - a.vals[0]); else if (v.tipo !== 'scatter') puntos.sort((a, b) => (isNaN(a.k) || isNaN(b.k) ? a.k.localeCompare(b.k) : a.k - b.k));
      puntos = puntos.slice(0, 60);
      const W = 760, H = 300, L = 56, B = 50, T = 14, R = 16;
      if (v.tipo === 'pie') {
        const tot = puntos.reduce((a, p) => a + Math.max(0, p.vals[0]), 0) || 1; let ang = -Math.PI / 2;
        const cx = 160, cy = 150, rr = 120;
        const arcos = puntos.map((p, i) => { const a = (Math.max(0, p.vals[0]) / tot) * Math.PI * 2; const x1 = cx + rr * Math.cos(ang), y1 = cy + rr * Math.sin(ang); ang += a; const x2 = cx + rr * Math.cos(ang), y2 = cy + rr * Math.sin(ang); return `<path d="M${cx},${cy} L${x1},${y1} A${rr},${rr} 0 ${a > Math.PI ? 1 : 0} 1 ${x2},${y2} Z" fill="${COLORES[i % COLORES.length]}"><title>${esc(p.k)}: ${p.vals[0]}</title></path>`; }).join('');
        const ley = puntos.slice(0, 14).map((p, i) => `<g transform="translate(320,${24 + i * 19})"><rect width="11" height="11" fill="${COLORES[i % COLORES.length]}"/><text x="17" y="10">${esc(p.k)} (${Math.round((p.vals[0] / tot) * 1000) / 10}%)</text></g>`).join('');
        return `<svg class="dbx-viz" viewBox="0 0 ${W} ${H}">${arcos}${ley}</svg>`;
      }
      const max = Math.max(0, ...puntos.flatMap((p) => p.vals)), min = Math.min(0, ...puntos.flatMap((p) => p.vals));
      const esc0 = (y) => T + (H - T - B) * (1 - (y - min) / ((max - min) || 1));
      const ancho = (W - L - R) / Math.max(1, puntos.length);
      const ejes = [0, 0.25, 0.5, 0.75, 1].map((f) => { const y = min + (max - min) * f; return `<line x1="${L}" x2="${W - R}" y1="${esc0(y)}" y2="${esc0(y)}" class="g"/><text x="${L - 6}" y="${esc0(y) + 4}" text-anchor="end">${Math.abs(y) >= 1e6 ? (y / 1e6).toFixed(1) + 'M' : Math.abs(y) >= 1e3 ? (y / 1e3).toFixed(1) + 'k' : Math.round(y * 100) / 100}</text>`; }).join('');
      const etiq = puntos.map((p, i) => (puntos.length <= 24 || i % Math.ceil(puntos.length / 24) === 0 ? `<text x="${L + ancho * i + ancho / 2}" y="${H - B + 16}" text-anchor="end" transform="rotate(-30 ${L + ancho * i + ancho / 2} ${H - B + 16})">${esc(String(p.k).slice(0, 14))}</text>` : '')).join('');
      let marcas = '';
      if (v.tipo === 'bar') { const bw = (ancho * 0.8) / iys.length; marcas = puntos.map((p, i) => p.vals.map((y, j) => `<rect x="${L + ancho * i + ancho * 0.1 + bw * j}" y="${Math.min(esc0(y), esc0(0))}" width="${Math.max(1, bw - 1)}" height="${Math.abs(esc0(0) - esc0(y))}" fill="${COLORES[j % COLORES.length]}"><title>${esc(p.k)}: ${y}</title></rect>`).join('')).join(''); }
      else if (v.tipo === 'scatter') marcas = puntos.map((p, i) => p.vals.map((y, j) => `<circle cx="${L + ancho * i + ancho / 2}" cy="${esc0(y)}" r="4" fill="${COLORES[j % COLORES.length]}"><title>${esc(p.k)}: ${y}</title></circle>`).join('')).join('');
      else marcas = iys.map((_, j) => { const pts = puntos.map((p, i) => `${L + ancho * i + ancho / 2},${esc0(p.vals[j])}`); return (v.tipo === 'area' ? `<polygon points="${L + ancho / 2},${esc0(0)} ${pts.join(' ')} ${L + ancho * (puntos.length - 1) + ancho / 2},${esc0(0)}" fill="${COLORES[j % COLORES.length]}" opacity=".25"/>` : '') + `<polyline points="${pts.join(' ')}" fill="none" stroke="${COLORES[j % COLORES.length]}" stroke-width="2"/>`; }).join('');
      const ley = iys.length > 1 ? iys.map((iy, j) => `<g transform="translate(${L + j * 140},${H - 8})"><rect width="10" height="10" y="-9" fill="${COLORES[j % COLORES.length]}"/><text x="14">${esc(r.cols[iy])}</text></g>`).join('') : '';
      return `<svg class="dbx-viz" viewBox="0 0 ${W} ${H}">${ejes}<line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" class="e"/>${marcas}${etiq}${ley}</svg>`;
    },
    editor(r, prev, alGuardar) {
      const v = prev ? { ...prev } : { tipo: 'bar', x: r.cols[0], ys: [r.cols.find((c, i) => typeof (r.filas[0] || [])[i] === 'number') || r.cols[1] || r.cols[0]], agg: 'sum', nombre: '' };
      const dlg = D.dialogo({ titulo: prev ? 'Edit visualization' : 'New visualization', ok: 'Save', ancho: 980, cuerpo: `<div class="dbx-viz-ed"><div class="dbx-viz-form">
        <label class="dbx-campo"><span>Visualization type</span><select id="vTipo">${[['bar', 'Bar'], ['line', 'Line'], ['area', 'Area'], ['pie', 'Pie'], ['scatter', 'Scatter'], ['counter', 'Counter']].map(([k, n]) => `<option value="${k}" ${v.tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="dbx-campo"><span>X column</span><select id="vX">${r.cols.map((c) => `<option ${v.x === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
        <label class="dbx-campo"><span>Y columns</span><select id="vY" multiple size="4">${r.cols.map((c) => `<option ${(v.ys || []).includes(c) ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
        <label class="dbx-campo"><span>Aggregation</span><select id="vAgg">${[['sum', 'Sum'], ['avg', 'Average'], ['count', 'Count'], ['max', 'Max'], ['min', 'Min']].map(([k, n]) => `<option value="${k}" ${v.agg === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="dbx-campo"><span>Sort</span><select id="vOrd"><option value="x">By X</option><option value="y" ${v.orden === 'y' ? 'selected' : ''}>By Y (descending)</option></select></label>
        <label class="dbx-campo"><span>Name</span><input id="vNom" value="${esc(v.nombre || '')}" placeholder="Visualization"></label>
        </div><div class="dbx-viz-prev" id="vPrev"></div></div>`, alOk: () => { alGuardar(leer()); } });
      const leer = () => ({ tipo: dlg.querySelector('#vTipo').value, x: dlg.querySelector('#vX').value, ys: [...dlg.querySelector('#vY').selectedOptions].map((o) => o.value), agg: dlg.querySelector('#vAgg').value, orden: dlg.querySelector('#vOrd').value, nombre: dlg.querySelector('#vNom').value.trim() || ({ bar: 'Bar', line: 'Line', area: 'Area', pie: 'Pie', scatter: 'Scatter', counter: 'Counter' }[dlg.querySelector('#vTipo').value]) });
      const prevw = () => { dlg.querySelector('#vPrev').innerHTML = D.Viz.svg(leer(), r); };
      dlg.querySelectorAll('select, input').forEach((x) => x.addEventListener('input', prevw));
      prevw();
    },
  };

  // ------------------------------------------------------------------ Catalog Explorer
  function arbolHtml(abierto) {
    const A = SQLX().arbol();
    return A.map((c) => `<details class="cx-n" ${abierto[0] === c.nombre ? 'open' : ''}><summary data-r="${D.ruta(c.nombre)}">${ic(c.soloLectura ? 'library' : 'database')} ${esc(c.nombre)}</summary>${c.schemas.filter((s) => !s.sistema).map((s) => `<details class="cx-n s" ${abierto[0] === c.nombre && abierto[1] === s.nombre ? 'open' : ''}><summary data-r="${D.ruta(c.nombre, s.nombre)}">${ic('symbol-namespace')} ${esc(s.nombre)}</summary>${s.tablas.map((t) => `<a class="cx-h ${abierto[2] === t.nombre && abierto[1] === s.nombre ? 'on' : ''}" href="#/databricks/catalogo/${D.ruta(c.nombre, s.nombre, t.nombre)}">${ic(t.tipo === 'VIEW' ? 'eye' : 'table')} ${esc(t.nombre)}</a>`).join('')}${(s.volumenes || []).map((v) => `<a class="cx-h" href="#/databricks/volumen/${D.ruta(c.nombre, s.nombre, v.nombre)}">${ic('folder-library')} ${esc(v.nombre)}</a>`).join('')}${!s.tablas.length && !(s.volumenes || []).length ? '<span class="cx-h vacio">Sin tablas</span>' : ''}</details>`).join('')}</details>`).join('');
  }
  function marcoCatalogo(cont, abierto, cuerpo) {
    cont.innerHTML = `<div class="cx-lay"><aside class="cx-lado"><div class="cx-lado-cab"><b>Catalog</b><button class="dbx-ib" data-x="refrescar" title="Refresh">${ic('refresh')}</button><button class="dbx-ib" data-x="nuevo" title="Add data / create">${ic('add')}</button></div><input class="cx-filtro" placeholder="Type to search..." id="cxF"><div class="cx-arbol" id="cxA">${arbolHtml(abierto)}</div></aside><section class="cx-cuerpo">${cuerpo}</section></div>`;
    cont.querySelector('#cxA').addEventListener('click', (e) => { const s = e.target.closest('summary[data-r]'); if (s) { setTimeout(() => D.ir('catalogo/' + s.dataset.r), 0); } });
    cont.querySelector('#cxF').addEventListener('input', (e) => { const q = e.target.value.toLowerCase(); cont.querySelectorAll('#cxA .cx-h').forEach((a) => { a.hidden = q && !a.textContent.toLowerCase().includes(q); }); if (q) cont.querySelectorAll('#cxA details').forEach((d) => { d.open = true; }); });
    cont.querySelector('.cx-lado-cab').onclick = (e) => { const b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'refrescar') { cont.querySelector('#cxA').innerHTML = arbolHtml(abierto); } else D.menu(b, [{ ic: 'database', txt: 'Create a catalog', fn: () => crearObjeto('catalog') }, { ic: 'symbol-namespace', txt: 'Create a schema', fn: () => crearObjeto('schema', abierto[0]) }, { ic: 'folder-library', txt: 'Create a volume', fn: () => crearObjeto('volume', abierto[0], abierto[1]) }, '-', { ic: 'cloud-upload', txt: 'Add data (upload file)', fn: () => D.ir('ingesta') }]); };
  }
  const ejecutarDdl = async (sql) => { const r = await SQLX().ejecutar(sql, { origen: 'Catalog Explorer' }); const u = r[r.length - 1]; if (!u.ok) throw new Error(u.error); return u; };
  function crearObjeto(tipo, cat, sch) {
    const cats = SQLX().arbol().filter((c) => !c.soloLectura);
    const opcCat = (sel) => cats.map((c) => `<option ${c.nombre === sel ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('');
    const titulo = { catalog: 'Create a new catalog', schema: 'Create a new schema', volume: 'Create a new volume' }[tipo];
    D.dialogo({ titulo, cuerpo: `${tipo !== 'catalog' ? `<label class="dbx-campo"><span>Catalog</span><select id="oCat">${opcCat(cats.some((c) => c.nombre === cat) ? cat : 'main')}</select></label>` : ''}${tipo === 'volume' ? `<label class="dbx-campo"><span>Schema</span><input id="oSch" value="${esc(sch && cats.some((c) => c.nombre === cat) ? sch : 'default')}"></label>` : ''}<label class="dbx-campo"><span>${tipo === 'catalog' ? 'Catalog name' : tipo === 'schema' ? 'Schema name' : 'Volume name'}</span><input id="oNom" placeholder="${tipo === 'catalog' ? 'dev' : tipo === 'schema' ? 'bronze' : 'raw'}"></label>${tipo === 'catalog' ? '<label class="dbx-campo"><span>Type</span><select disabled><option>Standard</option></select></label>' : ''}${tipo === 'volume' ? '<label class="dbx-campo"><span>Volume type</span><select id="oTipo"><option value="">Managed volume</option><option value="EXTERNAL ">External volume</option></select></label>' : ''}<label class="dbx-campo"><span>Comment (optional)</span><input id="oCom"></label><p class="dbx-dim">Equivale a ejecutar <code id="oSql"></code></p>`, alAbrir: (dlg) => {
      const sql = () => { const n = dlg.querySelector('#oNom').value.trim() || '<nombre>'; const com = dlg.querySelector('#oCom').value.trim(); const c = dlg.querySelector('#oCat') ? dlg.querySelector('#oCat').value : ''; return tipo === 'catalog' ? `CREATE CATALOG ${n}${com ? ` COMMENT '${com}'` : ''}` : tipo === 'schema' ? `CREATE SCHEMA ${c}.${n}${com ? ` COMMENT '${com}'` : ''}` : `CREATE ${dlg.querySelector('#oTipo').value}VOLUME ${c}.${dlg.querySelector('#oSch').value.trim()}.${n}${com ? ` COMMENT '${com}'` : ''}`; };
      const pinta = () => { dlg.querySelector('#oSql').textContent = sql(); }; dlg.querySelectorAll('input, select').forEach((x) => x.addEventListener('input', pinta)); pinta(); dlg._sql = sql;
    }, alOk: async (dlg) => {
      const n = dlg.querySelector('#oNom').value.trim();
      if (!/^[A-Za-z_][\w]*$/.test(n)) throw new Error('El nombre solo puede tener letras, números y guiones bajos, y no empezar con un número.');
      await ejecutarDdl(dlg._sql());
      D.toast(`${tipo[0].toUpperCase() + tipo.slice(1)} creado`);
      const c = dlg.querySelector('#oCat') ? dlg.querySelector('#oCat').value : n;
      D.ir(tipo === 'volume' ? 'volumen/' + D.ruta(c, dlg.querySelector('#oSch').value.trim(), n) : 'catalogo/' + (tipo === 'catalog' ? D.ruta(n) : D.ruta(c, n)));
    } });
  }
  D.registrar('catalogo', async (cont, p) => {
    if (p[0] === 'nuevo') { marcoCatalogo(cont, [], ''); return crearObjeto('catalog'); }
    const A = SQLX().arbol();
    if (!p.length) {
      marcoCatalogo(cont, [], `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Catalog Explorer</h1><div class="dbx-acciones"><button class="dbx-btn" onclick="location.hash='#/databricks/ingesta'">${ic('cloud-upload')} Add data</button><button class="dbx-btn primario" id="cxNuevoCat">Create catalog</button></div></div><p class="dbx-dim">Unity Catalog organiza los datos en tres niveles: <b>catálogo → esquema → tabla, vista o volumen</b>. Se nombran <code>catálogo.esquema.tabla</code>.</p><table class="dbx-tabla"><thead><tr><th>Name</th><th>Type</th><th>Owner</th><th>Comment</th></tr></thead><tbody>${A.map((c) => `<tr><td><a href="#/databricks/catalogo/${D.ruta(c.nombre)}">${ic(c.soloLectura ? 'library' : 'database')} ${esc(c.nombre)}</a></td><td>${c.soloLectura ? (c.nombre === 'system' ? 'System catalog' : 'Shared (read only)') : 'Standard catalog'}</td><td>${esc(c.owner || '')}</td><td>${esc(c.comment || '')}</td></tr>`).join('')}</tbody></table></div>`);
      cont.querySelector('#cxNuevoCat').onclick = () => crearObjeto('catalog');
      return;
    }
    const C = A.find((x) => x.nombre === p[0]);
    if (!C) return marcoCatalogo(cont, [], `<div class="dbx-pag"><div class="dbx-err">El catálogo ${esc(p[0])} no existe.</div></div>`);
    if (p.length === 1) {
      marcoCatalogo(cont, p, `<div class="dbx-pag"><div class="dbx-migas"><a href="#/databricks/catalogo">Catalog</a></div><div class="dbx-pag-cab"><h1>${ic('database')} ${esc(C.nombre)}</h1><div class="dbx-acciones">${C.soloLectura ? '<span class="dbx-chip">Read only</span>' : `<button class="dbx-btn" id="cxPerm">Permissions</button><button class="dbx-btn primario" id="cxNuevoEsq">Create schema</button>`}</div></div><p class="dbx-dim">${esc(C.comment || '')}</p><table class="dbx-tabla"><thead><tr><th>Schema</th><th>Tables</th><th>Comment</th></tr></thead><tbody>${C.schemas.filter((s) => !s.sistema).map((s) => `<tr><td><a href="#/databricks/catalogo/${D.ruta(C.nombre, s.nombre)}">${ic('symbol-namespace')} ${esc(s.nombre)}</a></td><td>${s.tablas.length}</td><td>${esc(s.comment || '')}</td></tr>`).join('')}</tbody></table>${!C.soloLectura && C.nombre !== 'main' ? '<div class="dbx-peligro-zona"><button class="dbx-btn peligro" id="cxBorrarCat">Delete catalog</button></div>' : ''}</div>`);
      const b1 = cont.querySelector('#cxNuevoEsq'); if (b1) b1.onclick = () => crearObjeto('schema', C.nombre);
      const b2 = cont.querySelector('#cxPerm'); if (b2) b2.onclick = () => dialogoPermisos('CATALOG', C.nombre);
      const b3 = cont.querySelector('#cxBorrarCat'); if (b3) b3.onclick = async () => { if (!confirm(`¿Borrar el catálogo ${C.nombre} y todo su contenido (DROP CATALOG … CASCADE)?`)) return; try { await ejecutarDdl(`DROP CATALOG ${C.nombre} CASCADE`); D.ir('catalogo'); } catch (e) { D.toast(e.message); } };
      return;
    }
    const S = C.schemas.find((x) => x.nombre === p[1]);
    if (!S) return marcoCatalogo(cont, p, `<div class="dbx-pag"><div class="dbx-err">El esquema ${esc(p[0])}.${esc(p[1])} no existe.</div></div>`);
    if (p.length === 2) {
      marcoCatalogo(cont, p, `<div class="dbx-pag"><div class="dbx-migas"><a href="#/databricks/catalogo">Catalog</a><span>/</span><a href="#/databricks/catalogo/${D.ruta(C.nombre)}">${esc(C.nombre)}</a></div><div class="dbx-pag-cab"><h1>${ic('symbol-namespace')} ${esc(C.nombre)}.${esc(S.nombre)}</h1><div class="dbx-acciones">${C.soloLectura ? '<span class="dbx-chip">Read only</span>' : `<button class="dbx-btn" id="cxPermS">Permissions</button><button class="dbx-btn" id="cxVol">Create volume</button><button class="dbx-btn primario" onclick="location.hash='#/databricks/ingesta'">Create table</button>`}</div></div><table class="dbx-tabla"><thead><tr><th>Name</th><th>Type</th><th>Owner</th><th>Created</th></tr></thead><tbody>${S.tablas.map((t) => `<tr><td><a href="#/databricks/catalogo/${D.ruta(C.nombre, S.nombre, t.nombre)}">${ic(t.tipo === 'VIEW' ? 'eye' : 'table')} ${esc(t.nombre)}</a></td><td>${t.tipo === 'VIEW' ? 'View' : 'Table (Managed)'}</td><td>${esc(t.owner || (C.soloLectura ? 'System user' : D.USUARIO))}</td><td>${t.creado ? esc(t.creado) : ''}</td></tr>`).join('')}${(S.volumenes || []).map((v) => `<tr><td><a href="#/databricks/volumen/${D.ruta(C.nombre, S.nombre, v.nombre)}">${ic('folder-library')} ${esc(v.nombre)}</a></td><td>Volume (${esc((v.tipo || 'MANAGED').toLowerCase())})</td><td>${esc(v.owner || '')}</td><td>${esc(v.creado || '')}</td></tr>`).join('')}</tbody></table>${!S.tablas.length && !(S.volumenes || []).length ? `<div class="dbx-vacio">${ic('table')}<p>Este esquema no tiene tablas. Crea una con SQL (<code>CREATE TABLE ${esc(C.nombre)}.${esc(S.nombre)}.mi_tabla …</code>), desde un notebook con <code>saveAsTable</code> o subiendo un archivo.</p></div>` : ''}</div>`);
      const v1 = cont.querySelector('#cxVol'); if (v1) v1.onclick = () => crearObjeto('volume', C.nombre, S.nombre);
      const v2 = cont.querySelector('#cxPermS'); if (v2) v2.onclick = () => dialogoPermisos('SCHEMA', `${C.nombre}.${S.nombre}`);
      return;
    }
    // tabla
    let info;
    try { info = await SQLX().infoTabla(`${p[0]}.${p[1]}.${p[2]}`); } catch (e) { return marcoCatalogo(cont, p, `<div class="dbx-pag"><div class="dbx-err">${esc(e.message)}</div></div>`); }
    D.reciente('tabla', p.join('.'), 'catalogo/' + D.ruta(...p));
    const pest = p[3] || 'overview';
    const full = p.slice(0, 3).join('.');
    const esVista = info.meta && info.meta.tipo === 'VIEW';
    marcoCatalogo(cont, p, `<div class="dbx-pag"><div class="dbx-migas"><a href="#/databricks/catalogo">Catalog</a><span>/</span><a href="#/databricks/catalogo/${D.ruta(p[0])}">${esc(p[0])}</a><span>/</span><a href="#/databricks/catalogo/${D.ruta(p[0], p[1])}">${esc(p[1])}</a></div>
      <div class="dbx-pag-cab"><h1>${ic(esVista ? 'eye' : 'table')} ${esc(p[2])}</h1><div class="dbx-acciones"><button class="dbx-btn" id="cxConsultar">${ic('code')} Query</button>${info.solo ? '<span class="dbx-chip">Read only</span>' : `<button class="dbx-btn" id="cxNb">${ic('notebook')} Open in a notebook</button><button class="dbx-ib" id="cxMas">${ic('ellipsis')}</button>`}</div></div>
      <div class="cx-meta"><span>${esVista ? 'View' : 'Managed table'} · Delta</span><span>Owner: ${esc((info.meta && info.meta.owner) || (info.solo ? 'System user' : D.USUARIO))}</span><span>${info.filas.toLocaleString('es')} filas</span>${info.meta && info.meta.modificado ? `<span>Modificada: ${esc(info.meta.modificado)}</span>` : ''}</div>
      ${info.meta && info.meta.comment ? `<p class="cx-com">${esc(info.meta.comment)}</p>` : ''}
      <div class="dbx-pest">${[['overview', 'Overview'], ['muestra', 'Sample Data'], ['detalles', 'Details'], ['permisos', 'Permissions'], ...(esVista || info.solo ? [] : [['historial', 'History']]), ['linaje', 'Lineage']].map(([k, n]) => `<a class="${pest === k ? 'on' : ''}" href="#/databricks/catalogo/${D.ruta(...p.slice(0, 3), k)}">${n}</a>`).join('')}</div>
      <div id="cxPest"></div></div>`);
    const caja = cont.querySelector('#cxPest');
    if (pest === 'overview') caja.innerHTML = `<table class="dbx-tabla"><thead><tr><th>Column</th><th>Type</th><th>Nullable</th><th>Comment</th></tr></thead><tbody>${info.cols.map((c) => `<tr><td><b>${esc(c.n)}</b></td><td>${D.tipoIcono(c.t)} ${esc(c.t)}</td><td>${c.notNull ? 'No' : 'Yes'}</td><td>${esc(c.comment || '')}</td></tr>`).join('')}</tbody></table>${esVista ? `<h3>View definition</h3><pre class="dbx-code">${esc(info.meta.definicion || '')}</pre>` : ''}${info.meta && Object.keys(info.meta.checks || {}).length ? `<h3>Constraints</h3><ul>${Object.entries(info.meta.checks).map(([n, e]) => `<li><code>${esc(n)}</code>: CHECK (${esc(e)})</li>`).join('')}</ul>` : ''}`;
    if (pest === 'muestra') { caja.innerHTML = '<div class="nb-tabla"></div>'; D.resultado(caja.firstElementChild, { cols: info.muestra.cols, filas: info.muestra.filas, tipos: info.cols.map((c) => c.t), total: info.filas }); }
    if (pest === 'detalles') { const r = await SQLX().ejecutar(`DESCRIBE DETAIL ${full}`, { origen: 'Catalog Explorer' }); const u = r[0]; caja.innerHTML = u.ok ? `<table class="dbx-tabla kv"><tbody>${u.cols.map((c, i) => `<tr><th>${esc(c)}</th><td>${D.celdaValor(u.filas[0][i])}</td></tr>`).join('')}</tbody></table><h3>CREATE TABLE</h3><pre class="dbx-code">${esc(info.ddl)}</pre>` : `<div class="dbx-err">${esc(u.error)}</div>`; }
    if (pest === 'permisos') { caja.innerHTML = `<div class="dbx-acciones" style="margin:8px 0">${info.solo ? '' : '<button class="dbx-btn primario" id="cxGrant">Grant</button>'}</div><table class="dbx-tabla"><thead><tr><th>Principal</th><th>Privilege</th><th>Object</th></tr></thead><tbody><tr><td>${ic('person')} ${esc((info.meta && info.meta.owner) || 'System user')}</td><td>OWNER</td><td>${esc(full)}</td></tr>${info.grants.map((g) => `<tr><td>${ic('organization')} ${esc(g.principal)}</td><td>${esc(g.priv)}</td><td>${esc(full)}</td></tr>`).join('')}</tbody></table><p class="dbx-dim">Para leer una tabla, un usuario necesita <b>USE CATALOG</b> en el catálogo, <b>USE SCHEMA</b> en el esquema y <b>SELECT</b> en la tabla.</p>`; const g = caja.querySelector('#cxGrant'); if (g) g.onclick = () => dialogoPermisos('TABLE', full); }
    if (pest === 'historial') { const r = await SQLX().ejecutar(`DESCRIBE HISTORY ${full}`, { origen: 'Catalog Explorer' }); const u = r[0]; caja.innerHTML = u.ok ? `<p class="dbx-dim">Cada escritura crea una versión. Puedes leer una versión anterior con <code>SELECT * FROM ${esc(full)} VERSION AS OF 0</code> o volver a ella con <code>RESTORE TABLE ${esc(full)} TO VERSION AS OF 0</code>.</p><div class="nb-tabla"></div>` : `<div class="dbx-err">${esc(u.error)}</div>`; if (u.ok) D.resultado(caja.querySelector('.nb-tabla'), u); }
    if (pest === 'linaje') {
      const l = info.linaje; const yo = full;
      const arriba = [...new Set(l.filter((x) => x.a === yo).map((x) => x.de))], abajo = [...new Set(l.filter((x) => x.de === yo).map((x) => x.a))];
      const nodo = (n, cls = '') => `<a class="cx-lin-n ${cls}" href="#/databricks/catalogo/${D.ruta(...n.split('.'))}">${ic('table')} ${esc(n)}</a>`;
      caja.innerHTML = arriba.length || abajo.length ? `<div class="cx-lin"><div class="cx-lin-col">${arriba.map((n) => nodo(n)).join('') || '<span class="dbx-dim">Sin orígenes</span>'}</div><div class="cx-lin-fl">→</div><div class="cx-lin-col">${nodo(yo, 'yo')}</div><div class="cx-lin-fl">→</div><div class="cx-lin-col">${abajo.map((n) => nodo(n)).join('') || '<span class="dbx-dim">Nadie la usa todavía</span>'}</div></div><p class="dbx-dim">Unity Catalog registra el linaje cuando una consulta lee unas tablas y escribe otra (CREATE TABLE AS SELECT, INSERT … SELECT, MERGE).</p>` : `<div class="dbx-vacio">${ic('type-hierarchy')}<p>Todavía no hay linaje: aparece cuando creas una tabla a partir de otra (por ejemplo <code>CREATE TABLE main.default.resumen AS SELECT … FROM ${esc(yo)}</code>).</p></div>`;
    }
    cont.querySelector('#cxConsultar').onclick = () => { D.sqlInicial = `SELECT * FROM ${full} LIMIT 100;`; D.ir('sql/nueva'); };
    const nbB = cont.querySelector('#cxNb'); if (nbB) nbB.onclick = () => { const W = D.ws(); const n = D.nombreLibre(D.HOME, `Explorar ${p[2]}`); W.items[D.HOME + '/' + n] = { tipo: 'notebook', lang: 'python', celdas: [{ id: D.nid(), src: `df = spark.table("${full}")\ndisplay(df)` }, { id: D.nid(), src: `%sql\nDESCRIBE HISTORY ${full}` }], creado: D.ahora(), modificado: D.ahora(), compute: 'serverless' }; D.alCli(D.HOME + '/' + n, 'NOTEBOOK'); D.guardar(); D.ir('notebook/' + D.ruta(D.HOME + '/' + n)); };
    const mas = cont.querySelector('#cxMas'); if (mas) mas.onclick = () => D.menu(mas, [{ ic: 'edit', txt: 'Edit comment', fn: () => { const c = prompt('Comentario de la tabla:', (info.meta && info.meta.comment) || ''); if (c != null) ejecutarDdl(`COMMENT ON TABLE ${full} IS '${c.replace(/'/g, "\\'")}'`).then(() => D.ir('catalogo/' + D.ruta(...p))).catch((e) => D.toast(e.message)); } }, { ic: 'trash', txt: esVista ? 'Drop view' : 'Drop table', peligro: true, fn: async () => { if (!confirm(`¿Borrar ${full}? Podrás recuperarla durante 7 días con UNDROP TABLE.`)) return; try { await ejecutarDdl(`DROP ${esVista ? 'VIEW' : 'TABLE'} ${full}`); D.toast(esVista ? 'Vista borrada' : 'Tabla borrada (UNDROP TABLE la recupera)'); D.ir('catalogo/' + D.ruta(p[0], p[1])); } catch (e) { D.toast(e.message); } } }], 'der');
  });
  function dialogoPermisos(tipo, obj) {
    const privs = { CATALOG: ['USE CATALOG', 'USE SCHEMA', 'SELECT', 'MODIFY', 'CREATE SCHEMA', 'CREATE TABLE', 'BROWSE', 'ALL PRIVILEGES'], SCHEMA: ['USE SCHEMA', 'SELECT', 'MODIFY', 'CREATE TABLE', 'CREATE VOLUME', 'ALL PRIVILEGES'], TABLE: ['SELECT', 'MODIFY', 'ALL PRIVILEGES'] }[tipo];
    D.dialogo({ titulo: `Grant on ${obj}`, ok: 'Confirm', cuerpo: `<label class="dbx-campo"><span>Principals</span><input id="gP" list="gPl" placeholder="analistas, ana@empresa.com…"><datalist id="gPl"><option value="account users"><option value="analistas"><option value="ingenieros-datos"><option value="data-scientists"></datalist></label><div class="dbx-campo"><span>Privileges</span><div class="dbx-checks">${privs.map((p) => `<label><input type="checkbox" value="${p}"> ${p}</label>`).join('')}</div></div><p class="dbx-dim">Equivale a <code>GRANT … ON ${tipo} ${esc(obj)} TO \`…\`</code></p>`, alOk: async (dlg) => {
      const quien = dlg.querySelector('#gP').value.trim(); const ps = [...dlg.querySelectorAll('.dbx-checks input:checked')].map((x) => x.value);
      if (!quien) throw new Error('Indica a quién (usuario, grupo o service principal).'); if (!ps.length) throw new Error('Elige al menos un privilegio.');
      await ejecutarDdl(`GRANT ${ps.join(', ')} ON ${tipo} ${obj} TO \`${quien}\``); D.toast('Permisos actualizados'); setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 0);
    } });
  }
  // volúmenes: archivos de /Volumes/<catálogo>/<esquema>/<volumen> (los mismos de `databricks fs`)
  D.registrar('volumen', (cont, p) => {
    const raiz = `/Volumes/${p[0]}/${p[1]}/${p[2]}`;
    const sub = p[3] ? '/' + p[3] : '';
    const dir = raiz + sub;
    const F = D.cli().files || {};
    const hijos = new Map();
    for (const k of Object.keys(F)) if (k.startsWith(dir + '/')) { const resto = k.slice(dir.length + 1); hijos.set(resto.split('/')[0], resto.includes('/') ? null : F[k].length); }
    marcoCatalogo(cont, p, `<div class="dbx-pag"><div class="dbx-migas"><a href="#/databricks/catalogo">Catalog</a><span>/</span><a href="#/databricks/catalogo/${D.ruta(p[0])}">${esc(p[0])}</a><span>/</span><a href="#/databricks/catalogo/${D.ruta(p[0], p[1])}">${esc(p[1])}</a></div>
      <div class="dbx-pag-cab"><h1>${ic('folder-library')} ${esc(p[2])}${sub ? ' / ' + esc(p[3]) : ''}</h1><div class="dbx-acciones"><label class="dbx-btn primario">${ic('cloud-upload')} Upload to this volume<input type="file" id="vSubir" multiple hidden accept=".csv,.json,.txt,.tsv,.jsonl,.md,.yml,.yaml"></label></div></div>
      <p class="dbx-dim">Ruta: <code>${esc(dir)}</code>. Léelo con <code>SELECT * FROM read_files('${esc(dir)}/archivo.csv', format =&gt; 'csv', header =&gt; true)</code>, con <code>COPY INTO</code> o desde la terminal con <code>databricks fs ls dbfs:${esc(dir)}</code>.</p>
      ${hijos.size ? `<table class="dbx-tabla"><thead><tr><th>Name</th><th>Size</th><th></th></tr></thead><tbody>${[...hijos].map(([n, s]) => `<tr data-n="${esc(n)}"><td>${s == null ? `<a href="#/databricks/volumen/${D.ruta(p[0], p[1], p[2], (p[3] ? p[3] + '/' : '') + n)}">${ic('folder')} ${esc(n)}</a>` : `${ic('file')} ${esc(n)}`}</td><td>${s == null ? '' : s.toLocaleString('es') + ' B'}</td><td class="der">${s == null ? '' : `<button class="dbx-btn chico" data-v="ver">Preview</button> <button class="dbx-btn chico" data-v="sql">Create table</button> <button class="dbx-ib" data-v="borrar" title="Delete">${ic('trash')}</button>`}</td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('folder-library')}<p>El volumen está vacío. Sube un CSV o un JSON, o cópialo desde la terminal: <code>databricks fs cp ventas.csv dbfs:${esc(dir)}/</code></p></div>`}
      <div id="vPrev"></div></div>`);
    cont.querySelector('#vSubir').onchange = async (e) => { for (const f of e.target.files) { if (f.size > 3e6) { D.toast(`${f.name}: en la práctica el límite es 3 MB`); continue; } F[dir + '/' + f.name] = await f.text(); } D.cli().files = F; D.cliGuardar(); D.toast('Archivos subidos'); D.ir('volumen/' + D.ruta(...p)); };
    cont.querySelector('.cx-cuerpo').addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return; const n = b.closest('tr').dataset.n; const ruta = dir + '/' + n;
      if (b.dataset.v === 'ver') cont.querySelector('#vPrev').innerHTML = `<h3>${esc(n)}</h3><pre class="dbx-code">${esc(String(F[ruta]).slice(0, 4000))}</pre>`;
      if (b.dataset.v === 'borrar' && confirm(`¿Borrar ${ruta}?`)) { delete F[ruta]; D.cliGuardar(); D.ir('volumen/' + D.ruta(...p)); }
      if (b.dataset.v === 'sql') { const fmt = /\.json/i.test(n) ? 'json' : 'csv'; D.sqlInicial = `-- Crea una tabla Delta a partir del archivo del volumen\nCREATE OR REPLACE TABLE ${p[0]}.${p[1]}.${n.replace(/\.\w+$/, '').replace(/\W+/g, '_').toLowerCase()} AS\nSELECT * EXCEPT (_rescued_data)\nFROM read_files('${ruta}', format => '${fmt}'${fmt === 'csv' ? ', header => true' : ''});`; D.ir('sql/nueva'); }
    });
  });

  // ------------------------------------------------------------------ editor SQL
  const sqlState = () => { const W = D.ws(); W.sql = W.sql || { pestanas: [], activa: null }; return W.sql; };
  D.registrar('sql', (cont, p) => {
    const S = sqlState(), W = D.ws();
    if (p[0] === 'nueva') {
      const t = { id: D.nid(), nombre: 'New Query ' + new Date().toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }), sql: D.sqlInicial || '-- Escribe tu consulta y pulsa Ctrl+Enter (o Run)\nSELECT * FROM samples.tienda.clientes LIMIT 10;', warehouse: 'Serverless Starter Warehouse' };
      D.sqlInicial = null; S.pestanas.push(t); S.activa = t.id; D.guardar(); location.replace('#/databricks/sql'); return;
    }
    if (p[0] && W.items[p[0]] && W.items[p[0]].tipo === 'query') {
      const q = W.items[p[0]]; let t = S.pestanas.find((x) => x.ruta === p[0]);
      if (!t) { t = { id: D.nid(), nombre: p[0].split('/').pop(), sql: q.sql, ruta: p[0], warehouse: 'Serverless Starter Warehouse' }; S.pestanas.push(t); }
      S.activa = t.id; D.reciente('query', t.nombre, 'sql/' + D.ruta(p[0]));
    }
    if (!S.pestanas.length) { S.pestanas.push({ id: D.nid(), nombre: 'New Query', sql: '-- Escribe tu consulta y pulsa Ctrl+Enter\nSELECT canal, COUNT(*) AS pedidos\nFROM samples.tienda.pedidos\nGROUP BY canal;', warehouse: 'Serverless Starter Warehouse' }); }
    if (!S.pestanas.some((x) => x.id === S.activa)) S.activa = S.pestanas[0].id;
    const tab = () => S.pestanas.find((x) => x.id === S.activa);
    let ed = null;
    cont.innerHTML = `<div class="sqx">
      <aside class="sqx-lado"><div class="sqx-lado-cab"><b>Schema browser</b><button class="dbx-ib" id="sqxRef" title="Refresh">${ic('refresh')}</button></div><input class="cx-filtro" id="sqxF" placeholder="Filter data objects"><div class="sqx-arbol" id="sqxA"></div></aside>
      <section class="sqx-centro">
        <div class="sqx-pest" id="sqxPest"></div>
        <div class="sqx-barra"><button class="dbx-btn primario" id="sqxRun">${ic('play')} Run <span class="dbx-dim2">(1000)</span></button><button class="dbx-btn" id="sqxSel" title="Run selected text">Run selected</button><button class="dbx-btn" id="sqxFmt" title="Format query">${ic('symbol-structure')} Format</button><span class="sqx-sp"></span><span class="sqx-ctx" id="sqxCtx"></span><button class="dbx-compute" id="sqxWh">${D.estadoPunto('RUNNING')}<span>Serverless Starter Warehouse</span><span class="dbx-dim2">Serverless · 2X-Small</span></button><button class="dbx-btn" id="sqxGuardar">${ic('save')} Save</button></div>
        <div class="sqx-params" id="sqxPar" hidden></div>
        <div class="sqx-ed"><textarea id="sqxTxt"></textarea></div>
        <div class="sqx-res" id="sqxRes"><div class="dbx-vacio chico">${ic('table')}<p>Ejecuta una consulta para ver los resultados aquí.</p></div></div>
      </section></div>`;
    const $ = (s) => cont.querySelector(s);
    const pintarPest = () => { $('#sqxPest').innerHTML = S.pestanas.map((t) => `<button class="${t.id === S.activa ? 'on' : ''}" data-t="${t.id}">${ic('file-code')} <span>${esc(t.nombre)}</span><i class="codicon codicon-close" data-cerrar="${t.id}"></i></button>`).join('') + `<button class="sqx-mas" data-t="nueva" title="New query">${ic('add')}</button>`; };
    const ctx = () => { const U = SQLX().uc(); $('#sqxCtx').innerHTML = `${ic('database')} ${esc(U.cur.catalog)}.${esc(U.cur.schema)}`; };
    // navegador de esquemas
    const pintarArbol = () => {
      const A = SQLX().arbol();
      $('#sqxA').innerHTML = A.map((c) => `<details><summary>${ic(c.soloLectura ? 'library' : 'database')} ${esc(c.nombre)}</summary>${c.schemas.filter((s) => !s.sistema).map((s) => `<details><summary>${ic('symbol-namespace')} ${esc(s.nombre)}</summary>${s.tablas.map((t) => `<details class="t" data-full="${esc(c.nombre + '.' + s.nombre + '.' + t.nombre)}"><summary><span>${ic(t.tipo === 'VIEW' ? 'eye' : 'table')} ${esc(t.nombre)}</span><button class="dbx-ib" data-ins="${esc(c.nombre + '.' + s.nombre + '.' + t.nombre)}" title="Insert into editor">${ic('arrow-right')}</button></summary><div class="cols">…</div></details>`).join('')}</details>`).join('')}</details>`).join('');
    };
    $('#sqxA').addEventListener('toggle', async (e) => {
      const d = e.target; if (!d.classList || !d.classList.contains('t') || !d.open) return;
      const box = d.querySelector('.cols'); if (box.dataset.ok) return;
      try { const info = await SQLX().infoTabla(d.dataset.full); box.innerHTML = info.cols.map((c) => `<div class="col" data-ins="${esc(c.n)}">${D.tipoIcono(c.t)} ${esc(c.n)} <small>${esc(c.t)}</small></div>`).join(''); box.dataset.ok = 1; } catch (er) { box.textContent = er.message; }
    }, true);
    $('#sqxA').addEventListener('click', (e) => { const b = e.target.closest('[data-ins]'); if (!b || !ed) return; e.preventDefault(); ed.replaceSelection(b.dataset.ins); ed.focus(); });
    $('#sqxF').addEventListener('input', (e) => { const q = e.target.value.toLowerCase(); cont.querySelectorAll('#sqxA details.t').forEach((d) => { d.hidden = q && !d.dataset.full.includes(q); }); if (q) cont.querySelectorAll('#sqxA details:not(.t)').forEach((d) => { d.open = true; }); });
    $('#sqxRef').onclick = pintarArbol;
    // pestañas
    $('#sqxPest').addEventListener('click', (e) => {
      const x = e.target.closest('[data-cerrar]');
      if (x) { e.stopPropagation(); const i = S.pestanas.findIndex((t) => t.id === x.dataset.cerrar); S.pestanas.splice(i, 1); if (S.activa === x.dataset.cerrar) S.activa = (S.pestanas[Math.max(0, i - 1)] || {}).id; D.guardar(); return D.ir('sql'); }
      const b = e.target.closest('[data-t]'); if (!b) return;
      if (b.dataset.t === 'nueva') return D.ir('sql/nueva');
      guardarTxt(); S.activa = b.dataset.t; D.guardar(); cargar();
    });
    $('#sqxPest').addEventListener('dblclick', (e) => { const b = e.target.closest('[data-t]'); if (!b || b.dataset.t === 'nueva') return; const t = S.pestanas.find((x) => x.id === b.dataset.t); const n = prompt('Nombre de la consulta:', t.nombre); if (n) { t.nombre = n.trim(); D.guardar(); pintarPest(); } });
    const guardarTxt = () => { if (ed) { tab().sql = ed.getValue(); D.guardar(); } };
    // parámetros :nombre
    const params = () => { const t = tab(); const nombres = [...new Set([...(ed ? ed.getValue() : t.sql).matchAll(/(?:^|[^:\w']):([A-Za-z_]\w*)/g)].map((m) => m[1]))]; t.params = t.params || {}; const box = $('#sqxPar'); box.hidden = !nombres.length; box.innerHTML = nombres.map((n) => `<label class="nb-w"><span>${esc(n)}</span><input data-par="${esc(n)}" value="${esc(t.params[n] ?? '')}"></label>`).join(''); box.querySelectorAll('[data-par]').forEach((i) => { i.oninput = () => { t.params[i.dataset.par] = i.value; D.guardar(); }; }); };
    function cargar() {
      pintarPest(); ctx();
      if (ed) { ed.toTextArea(); ed = null; }
      const ta = $('#sqxTxt'); ta.value = tab().sql;
      if (window.CodeMirror) {
        const tablas = {}; for (const c of SQLX().arbol()) for (const s of c.schemas) for (const t of s.tablas) tablas[`${c.nombre}.${s.nombre}.${t.nombre}`] = (t.cols || []).map((x) => x.n);
        ed = window.CodeMirror.fromTextArea(ta, { mode: 'text/x-sparksql', lineNumbers: true, matchBrackets: true, autoCloseBrackets: true, indentUnit: 2, extraKeys: { 'Ctrl-Enter': () => correr(), 'Cmd-Enter': () => correr(), 'Shift-Enter': () => correr(), 'Ctrl-Space': 'autocomplete', 'Ctrl-/': 'toggleComment' }, hintOptions: { tables: tablas, completeSingle: false } });
        ed.on('change', () => { clearTimeout(ed._t); ed._t = setTimeout(() => { guardarTxt(); params(); }, 300); });
        ed.on('inputRead', (cm, ch) => { if (/[\w.]/.test(ch.text[0]) && cm.showHint && window.CodeMirror.hint && window.CodeMirror.hint.sql) cm.showHint({ hint: window.CodeMirror.hint.sql, completeSingle: false }); });
        D.alSalir(() => { if (ed) { guardarTxt(); ed.toTextArea(); ed = null; } });
      }
      params();
      if (tab().ultimo) mostrar(tab().ultimo);
      else $('#sqxRes').innerHTML = `<div class="dbx-vacio chico">${ic('table')}<p>Ejecuta una consulta para ver los resultados aquí.</p></div>`;
    }
    async function correr(soloSel = false) {
      const t = tab(); guardarTxt();
      let sql = soloSel && ed && ed.somethingSelected() ? ed.getSelection() : (ed ? ed.getValue() : t.sql);
      sql = D.sustituirParams(sql, t.params || {});
      $('#sqxRes').innerHTML = `<div class="nb-corriendo"><span class="dbx-gira"></span> Running…</div>`;
      $('#sqxRun').disabled = true;
      const t0 = performance.now();
      const res = await SQLX().ejecutar(sql, { origen: 'Databricks SQL Editor', limite: 1000 });
      $('#sqxRun').disabled = false;
      const u = res[res.length - 1];
      t.ultimo = { ...u, filas: (u.filas || []).slice(0, 1000), n: res.length, ms: Math.round(performance.now() - t0) };
      D.guardar(); mostrar(t.ultimo); ctx();
      if (res.some((x) => x.ok && /^(CREATE|DROP|ALTER|INSERT|MERGE|COPY|UNDROP|RESTORE)/i.test(x.texto || ''))) pintarArbol();
    }
    function mostrar(u) {
      const box = $('#sqxRes');
      if (!u.ok) { box.innerHTML = `<div class="nb-error sqx-err"><pre>${esc(u.error)}</pre><div class="nb-error-ayuda">${u.texto ? 'En la sentencia: <code>' + esc(String(u.texto).slice(0, 140)) + '</code>' : ''}</div></div>`; return; }
      if (!u.cols || !u.cols.length) { box.innerHTML = `<div class="sqx-ok">${ic('check')} ${esc(u.msg || 'OK')} <span class="dbx-dim">· ${u.n || 1} sentencia(s) · ${u.ms} ms</span></div>`; return; }
      box.innerHTML = `<div class="sqx-meta">${u.filas.length.toLocaleString('es')} filas · ${u.ms} ms${u.n > 1 ? ` · resultado de la última de ${u.n} sentencias` : ''}${u.truncado ? ` · limitado a 1000 de ${u.truncado}` : ''}</div><div class="nb-tabla"></div>`;
      const t = tab(); D.resultado(box.querySelector('.nb-tabla'), u, { vizs: (t.vizs = t.vizs || []), alCambiar: () => D.guardar() });
    }
    $('#sqxRun').onclick = () => correr(false);
    $('#sqxSel').onclick = () => correr(true);
    $('#sqxFmt').onclick = () => { if (!ed) return; const KW = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'JOIN', 'UNION ALL', 'UNION', 'WITH', 'QUALIFY']; let s = ed.getValue().replace(/\s+/g, ' ').trim(); for (const k of KW) s = s.replace(new RegExp(`\\s+${k.replace(' ', '\\s+')}\\b`, 'gi'), '\n' + k); ed.setValue(s.replace(/,\s*(?![^(]*\))/g, ',\n  ')); };
    $('#sqxWh').onclick = (e) => { const C = D.cli(); const whs = Object.entries(C.warehouses || { '1a2b3c4d5e6f7a8b': { name: 'Serverless Starter Warehouse', size: '2X-Small', state: 'RUNNING' } }); D.menu(e.currentTarget, [...whs.map(([, w]) => ({ ic: 'server', txt: `${w.name} (${w.size || ''})`, fn: () => { tab().warehouse = w.name; e.currentTarget.querySelector('span:nth-child(2)').textContent = w.name; D.guardar(); } })), '-', { ic: 'add', txt: 'Create SQL warehouse', fn: () => D.ir('warehouses/nuevo') }], 'der'); };
    $('#sqxGuardar').onclick = () => {
      const t = tab(); guardarTxt();
      D.dialogo({ titulo: 'Save query', ok: 'Save', cuerpo: `<label class="dbx-campo"><span>Name</span><input id="qN" value="${esc(t.nombre)}"></label><label class="dbx-campo"><span>Location</span><input id="qD" value="${esc(t.ruta ? t.ruta.replace(/\/[^/]+$/, '') : D.HOME)}"></label>`, alOk: (dlg) => {
        const n = dlg.querySelector('#qN').value.trim(), dir = dlg.querySelector('#qD').value.trim();
        if (!n) throw new Error('Ponle un nombre.'); if (!W.items[dir] || W.items[dir].tipo !== 'folder') throw new Error('La carpeta no existe.');
        const ruta = dir + '/' + n; if (t.ruta && t.ruta !== ruta) delete W.items[t.ruta];
        W.items[ruta] = { tipo: 'query', sql: t.sql, creado: (W.items[ruta] || {}).creado || D.ahora(), modificado: D.ahora(), params: t.params };
        t.ruta = ruta; t.nombre = n; D.alCli(ruta, 'FILE'); D.guardar(); pintarPest(); D.toast('Consulta guardada');
      } });
    };
    pintarArbol(); cargar();
  });
  D.registrar('consultas', (cont) => {
    const W = D.ws(); const l = Object.entries(W.items).filter(([, it]) => it.tipo === 'query');
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Queries</h1><div class="dbx-acciones"><button class="dbx-btn primario" onclick="location.hash='#/databricks/sql/nueva'">Create query</button></div></div>${l.length ? `<table class="dbx-tabla"><thead><tr><th>Name</th><th>Location</th><th>Modified</th></tr></thead><tbody>${l.map(([p, it]) => `<tr><td><a href="#/databricks/sql/${D.ruta(p)}">${ic('file-code')} ${esc(p.split('/').pop())}</a></td><td>${esc(p.replace(/\/[^/]+$/, ''))}</td><td>${D.hora(it.modificado)}</td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('file-code')}<p>No guardaste consultas. En el editor SQL usa <b>Save</b>.</p></div>`}</div>`;
  });
  D.registrar('historial', (cont) => {
    const U = SQLX().uc(); const H = [...U.historial].reverse();
    let filtro = 'todos';
    const pintar = () => {
      const l = H.filter((h) => filtro === 'todos' || (filtro === 'ok' ? h.estado === 'FINISHED' : h.estado === 'FAILED'));
      cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Query History</h1></div><div class="dbx-filtros"><button class="${filtro === 'todos' ? 'on' : ''}" data-f="todos">All</button><button class="${filtro === 'ok' ? 'on' : ''}" data-f="ok">Finished</button><button class="${filtro === 'mal' ? 'on' : ''}" data-f="mal">Failed</button><span class="dbx-dim">También se consulta con SQL: <code>SELECT * FROM system.query.history</code></span></div>${l.length ? `<table class="dbx-tabla qh"><thead><tr><th></th><th>Query</th><th>Started at</th><th>Duration</th><th>Rows</th><th>Source</th></tr></thead><tbody>${l.slice(0, 300).map((h) => `<tr title="${esc(h.error || '')}"><td>${h.estado === 'FINISHED' ? `<span class="dbx-ok">${ic('pass-filled')}</span>` : `<span class="dbx-mal">${ic('error')}</span>`}</td><td><code>${esc(h.texto.slice(0, 120))}</code></td><td>${esc(h.inicio)}</td><td>${h.ms} ms</td><td>${h.filas ?? ''}</td><td>${esc(h.origen || '')}</td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('history')}<p>Sin consultas.</p></div>`}</div>`;
      cont.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { filtro = b.dataset.f; pintar(); }; });
    };
    pintar();
  });

  // ------------------------------------------------------------------ Data Ingestion: subir un archivo a una tabla
  D.registrar('ingesta', (cont) => {
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Add data</h1></div>
      <div class="dbx-tarjetas">
        <label class="dbx-tarj">${ic('cloud-upload')}<b>Create or modify table</b><span>Sube un CSV, TSV o JSON y crea una tabla Delta</span><input type="file" id="ingF" hidden accept=".csv,.tsv,.json,.jsonl,.txt"></label>
        <a class="dbx-tarj" href="#/databricks/catalogo">${ic('folder-library')}<b>Upload files to a volume</b><span>Guarda archivos en /Volumes para leerlos con read_files o COPY INTO</span></a>
        <a class="dbx-tarj" href="#/databricks/pipelines/nuevo">${ic('combine')}<b>Lakeflow pipeline</b><span>Carga incremental con tablas de streaming y expectativas</span></a>
        <a class="dbx-tarj" href="#/datos">${ic('database')}<b>Datos del curso</b><span>Genera un dataset de práctica y bájalo como CSV</span></a>
      </div><div id="ingPrev"></div></div>`;
    cont.querySelector('#ingF').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 5e6) return D.toast('En la práctica el límite es 5 MB');
      const txt = await f.text();
      let cols, filas;
      if (/\.jsonl?$/i.test(f.name)) { const objs = txt.trim().startsWith('[') ? JSON.parse(txt) : txt.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)); cols = [...new Set(objs.flatMap((o) => Object.keys(o)))]; filas = objs.map((o) => cols.map((c) => (o[c] == null ? null : typeof o[c] === 'object' ? JSON.stringify(o[c]) : o[c]))); }
      else { const l = SQLX().parseCsv(txt, /\.tsv$/i.test(f.name) ? '\t' : txt.split('\n')[0].includes(';') && !txt.split('\n')[0].includes(',') ? ';' : ','); cols = l.shift().map((c, i) => (c.trim() || `_c${i}`).replace(/[ ,;{}()\n\t=]+/g, '_')); filas = l.map((r) => cols.map((_, i) => { const v = r[i]; if (v === undefined || v === '') return null; return /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v; })); }
      const cats = SQLX().arbol().filter((c) => !c.soloLectura);
      const nom = f.name.replace(/\.\w+$/, '').toLowerCase().replace(/\W+/g, '_');
      const box = cont.querySelector('#ingPrev');
      box.innerHTML = `<h2>${ic('table')} Create table from ${esc(f.name)}</h2><div class="ing-form"><label class="dbx-campo"><span>Catalog</span><select id="iC">${cats.map((c) => `<option>${esc(c.nombre)}</option>`).join('')}</select></label><label class="dbx-campo"><span>Schema</span><select id="iS"></select></label><label class="dbx-campo"><span>Table name</span><input id="iT" value="${esc(nom)}"></label><button class="dbx-btn primario" id="iCrear">Create table</button></div><p class="dbx-dim">${filas.length.toLocaleString('es')} filas · ${cols.length} columnas · los tipos se infieren de los datos (como <i>inferSchema</i>).</p><div class="nb-tabla"></div>`;
      const pintaS = () => { const c = cats.find((x) => x.nombre === box.querySelector('#iC').value); box.querySelector('#iS').innerHTML = c.schemas.filter((s) => !s.sistema).map((s) => `<option>${esc(s.nombre)}</option>`).join(''); };
      box.querySelector('#iC').onchange = pintaS; pintaS();
      D.resultado(box.querySelector('.nb-tabla'), { cols, filas: filas.slice(0, 50), total: filas.length });
      box.querySelector('#iCrear').onclick = async () => {
        const full = `${box.querySelector('#iC').value}.${box.querySelector('#iS').value}.${box.querySelector('#iT').value.trim()}`;
        if (!/^\w+\.\w+\.[A-Za-z_]\w*$/.test(full)) return D.toast('Nombre de tabla inválido');
        try { await SQLX().registrarDesdeDatos(full, cols, filas, 'error', 'CREATE TABLE'); D.toast('Tabla creada: ' + full); D.ir('catalogo/' + D.ruta(...full.split('.'))); } catch (er) { D.toast(er.message); }
      };
    };
  });
})();
