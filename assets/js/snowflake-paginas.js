/* Snowsight de práctica: las páginas de monitoreo, costos, tableros, Marketplace, notebooks y Streamlit.
 * Siguen la documentación pública de Snowflake (Copy History, Task History y Task Graphs, Cost Management,
 * Dashboards, Marketplace, Snowflake Notebooks y Streamlit in Snowflake). El SQL corre en SnowflakeMotor y el
 * Python de los notebooks y de Streamlit en Pyodide, con una `session` de Snowpark mínima que manda cada
 * session.sql(...) al mismo motor. No usa código, logos ni íconos de Snowflake. */
(function () {
  'use strict';
  const P = {};
  const fechaHora = (t) => (t ? new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—');
  const dur = (ms) => (ms == null ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
  const usd = (cr) => `USD ${(cr * 3).toFixed(2)}`;
  const id = () => Math.random().toString(36).slice(2, 9);
  const guardar = (C) => { try { C.Store.saveSoon ? C.Store.saveSoon() : C.Store.save(); } catch (e) { /* sin almacenamiento */ } };
  function tablaRes(C, r, max = 200) {
    const { esc } = C;
    if (!r) return '';
    if (r.error) return `<div class="sf-error">${esc(r.error.message || r.error)}</div>`;
    if (!r.columns) return `<p class="sf-dim">${esc(r.estado || 'Statement executed successfully.')}</p>`;
    return `<div class="sf-res-w"><table class="sf-tabla sf-res"><thead><tr>${r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.values.slice(0, max).map((f) => `<tr>${f.map((v) => `<td>${v == null ? '<i class="sf-dim">NULL</i>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="sf-dim sf-chico">${r.values.length} row${r.values.length === 1 ? '' : 's'}${r.values.length > max ? ` (se muestran ${max})` : ''}</p>`;
  }
  async function correr(C, sql) { const rs = await C.M().ejecutar(sql, { seguir: false }); const u = rs[rs.length - 1]; return u ? (u.error ? { error: u.error } : u.r) : null; }

  // ------------------------------------------------------------------ gráficos (SVG, para dashboards y Streamlit)
  function grafico(C, r, tipo, alto = 220) {
    const { esc } = C;
    if (!r || r.error || !r.columns) return tablaRes(C, r);
    if (tipo === 'kpi') { const v = r.values[0] ? r.values[0][r.values[0].length - 1] : null; return `<div class="sf-kpi-g"><b>${esc(v == null ? '—' : typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : v)}</b><small>${esc(r.columns[r.columns.length - 1])}</small></div>`; }
    if (tipo === 'tabla' || r.columns.length < 2) return tablaRes(C, r, 50);
    const filas = r.values.slice(0, 60); const ys = filas.map((f) => Number(f[1]) || 0); const max = Math.max(1, ...ys), min = Math.min(0, ...ys);
    const W = 640, H = alto, L = 50, B = 36, ancho = (W - L - 10) / Math.max(1, filas.length);
    const Y = (v) => H - B - ((v - min) / (max - min || 1)) * (H - B - 12);
    const etq = (t) => esc(String(t).slice(0, 10));
    const ejes = `<line x1="${L}" y1="${H - B}" x2="${W - 5}" y2="${H - B}" stroke="currentColor" opacity=".3"/><text x="${L - 6}" y="${Y(max) + 4}" text-anchor="end" font-size="10" fill="currentColor">${Math.round(max).toLocaleString('en-US')}</text><text x="${L - 6}" y="${H - B}" text-anchor="end" font-size="10" fill="currentColor">${Math.round(min)}</text>`;
    const cada = Math.ceil(filas.length / 12);
    const xs = filas.map((f, i) => (i % cada ? '' : `<text x="${L + i * ancho + ancho / 2}" y="${H - B + 14}" text-anchor="middle" font-size="10" fill="currentColor">${etq(f[0])}</text>`)).join('');
    const cuerpo = tipo === 'lineas'
      ? `<polyline fill="none" stroke="#29b5e8" stroke-width="2.5" points="${filas.map((f, i) => `${L + i * ancho + ancho / 2},${Y(ys[i])}`).join(' ')}"/>${filas.map((f, i) => `<circle cx="${L + i * ancho + ancho / 2}" cy="${Y(ys[i])}" r="2.5" fill="#29b5e8"><title>${etq(f[0])}: ${ys[i]}</title></circle>`).join('')}`
      : filas.map((f, i) => `<rect x="${L + i * ancho + ancho * 0.15}" y="${Math.min(Y(ys[i]), Y(0))}" width="${ancho * 0.7}" height="${Math.abs(Y(0) - Y(ys[i]))}" fill="#29b5e8" rx="2"><title>${etq(f[0])}: ${ys[i]}</title></rect>`).join('');
    return `<svg class="sf-graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(r.columns[1])} por ${esc(r.columns[0])}">${ejes}${cuerpo}${xs}</svg>`;
  }

  // ------------------------------------------------------------------ Copy History
  P.copy = (C) => {
    const { esc, marco, main, href, ruta, M } = C; const s = M().st(); const f = ruta[1] || 'todas';
    const lista = s.copias.filter((c) => f === 'todas' || (f === 'fallidas' ? c.estado !== 'Loaded' : c.estado === 'Loaded'));
    const porTabla = {}; for (const c of s.copias) { const t = (porTabla[c.tabla] = porTabla[c.tabla] || { ok: 0, mal: 0, filas: 0, ultima: 0 }); if (c.estado === 'Loaded') { t.ok++; t.filas += c.cargadas || 0; } else t.mal++; t.ultima = Math.max(t.ultima, c.cuando); }
    main.innerHTML = marco(`<div class="sf-pag"><h1>Copy History</h1><p class="sf-dim">Cada archivo que entró (o no) a una tabla con <code>COPY INTO</code>: cuántas filas, desde qué stage y el primer error si falló. Snowflake recuerda los archivos cargados durante 64 días: si repites el COPY, los salta (LOAD_SKIPPED) salvo que uses <code>FORCE = TRUE</code>.</p>
      ${Object.keys(porTabla).length ? `<h2>Por tabla</h2><table class="sf-tabla"><thead><tr><th>Table</th><th class="sf-der">Files loaded</th><th class="sf-der">Files failed</th><th class="sf-der">Rows loaded</th><th>Last load</th></tr></thead><tbody>${Object.entries(porTabla).map(([t, x]) => `<tr><td><code>${esc(t)}</code></td><td class="sf-der">${x.ok}</td><td class="sf-der">${x.mal ? `<b class="sf-rojo">${x.mal}</b>` : 0}</td><td class="sf-der">${x.filas.toLocaleString('en-US')}</td><td>${fechaHora(x.ultima)}</td></tr>`).join('')}</tbody></table>` : ''}
      ${Object.keys(s.pipes).length ? `<h2>Pipes (Snowpipe)</h2><table class="sf-tabla"><thead><tr><th>Pipe</th><th>Definition</th><th>Auto ingest</th><th>State</th><th class="sf-der">Rows loaded</th><th>Last ingested</th></tr></thead><tbody>${Object.values(s.pipes).map((x) => `<tr><td><b>${esc(x.nombre)}</b></td><td><code class="sf-chico">${esc(x.copy.slice(0, 80))}</code></td><td>${x.auto ? 'TRUE' : 'FALSE'}</td><td>${esc(x.estado)}</td><td class="sf-der">${x.cargados}</td><td>${fechaHora(x.ultima)}</td></tr>`).join('')}</tbody></table>` : ''}
      <h2>Archivos</h2><div class="sf-filtros">${[['todas', 'All'], ['ok', 'Loaded'], ['fallidas', 'Failed']].map(([k, t]) => `<a class="sf-chip${f === k ? ' on' : ''}" href="${href('copy/' + k)}">${t}</a>`).join('')}</div>
      ${lista.length ? `<table class="sf-tabla"><thead><tr><th>Status</th><th>File</th><th>Stage</th><th>Table</th><th class="sf-der">Rows parsed</th><th class="sf-der">Rows loaded</th><th class="sf-der">Size</th><th>First error</th><th>Loaded</th></tr></thead><tbody>${lista.map((c) => `<tr><td>${c.estado === 'Loaded' ? '<span class="sf-ok">● Loaded</span>' : '<span class="sf-rojo">● Load failed</span>'}</td><td><code>${esc(c.archivo)}</code>${c.pipe ? `<div class="sf-chico sf-dim">pipe ${esc(c.pipe)}</div>` : ''}</td><td>@${esc(c.stage)}</td><td>${esc(c.tabla.split('.').pop())}</td><td class="sf-der">${c.leidas}</td><td class="sf-der">${c.cargadas}</td><td class="sf-der">${(c.tamano / 1024).toFixed(1)} KB</td><td class="sf-chico">${esc(c.error || '')}</td><td>${fechaHora(c.cuando)}</td></tr>`).join('')}</tbody></table>` : `<div class="sf-vacio"><p>Todavía no cargaste archivos con COPY INTO.</p><p class="sf-dim">Crea un stage, sube un CSV (Databases → tu stage → + Files) y ejecuta <code>COPY INTO mi_tabla FROM @mi_stage FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);</code></p></div>`}
      <h2>Lo mismo con SQL</h2><pre class="sf-pre">SELECT file_name, status, row_count, first_error_message, last_load_time
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME =&gt; 'MI_TABLA',
  START_TIME =&gt; DATEADD(hours, -24, CURRENT_TIMESTAMP())))
ORDER BY last_load_time DESC;</pre><button class="sf-btn" id="sfAbrirSql">Abrir en una worksheet</button></div>`, 'copy');
    main.querySelector('#sfAbrirSql').onclick = () => C.nuevaHoja("SELECT file_name, status, row_count, first_error_message, last_load_time\nFROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(TABLE_NAME => 'MI_TABLA', START_TIME => DATEADD(hours, -24, CURRENT_TIMESTAMP())))\nORDER BY last_load_time DESC;\n");
  };

  // ------------------------------------------------------------------ Task History (Task Graphs y Task Runs)
  P.tareas = (C) => {
    const { esc, marco, main, href, ruta, M } = C; const s = M().st(); const tab = ruta[1] === 'runs' ? 'runs' : ruta[1] === 'dinamicas' ? 'dinamicas' : 'graphs';
    const T = Object.entries(s.tasks);
    const raices = T.filter(([, t]) => !t.after.length);
    const arbol = (k, nivel) => { const t = s.tasks[k]; const hijos = T.filter(([, h]) => h.after.includes(k)); const ult = s.taskHist.find((h) => h.nombre === t.nombre && h.db === t.db); const prox = M().proxima(t);
      return `<div class="sf-nodo" style="margin-left:${nivel * 28}px"><div class="sf-nodo-c"><b>${nivel ? '↳ ' : ''}${esc(t.nombre)}</b> <span class="sf-chip ${t.estado === 'started' ? 'on' : ''}">${t.estado}</span> <span class="sf-dim">${esc(t.db)}.${esc(t.esquema)} · ${t.wh ? esc(t.wh) : 'serverless'} · ${t.schedule ? esc(t.schedule) : t.after.length ? 'after ' + t.after.map((x) => esc(x.split('.').pop())).join(', ') : 'manual'}</span>
        <div class="sf-chico">${ult ? `Última: <span class="${ult.estado === 'FAILED' ? 'sf-rojo' : ult.estado === 'SUCCEEDED' ? 'sf-ok' : 'sf-dim'}">${ult.estado}</span> ${fechaHora(ult.inicio)}` : 'Nunca corrió'}${prox ? ` · Próxima: ${fechaHora(prox)}` : ''}${t.cuando ? ` · WHEN ${esc(t.cuando)}` : ''}</div>
        <div class="sf-acciones-c">${t.estado === 'started' ? `<button class="sf-btn sf-chico-b" data-t="${esc(k)}" data-a="SUSPEND">Suspend</button>` : `<button class="sf-btn sf-chico-b" data-t="${esc(k)}" data-a="RESUME">Resume</button>`}${!t.after.length ? `<button class="sf-btn sf-chico-b" data-t="${esc(k)}" data-a="EXECUTE">Execute</button>` : ''}<button class="sf-btn sf-chico-b" data-t="${esc(k)}" data-a="VER">SQL</button></div></div></div>${hijos.map(([hk]) => arbol(hk, nivel + 1)).join('')}`; };
    main.innerHTML = marco(`<div class="sf-pag"><div class="sf-cab"><h1>Task History</h1><span class="sf-sp"></span><button class="sf-btn sf-pri" id="sfNuevaT">${C.ic('mas')} Task</button></div>
      <p class="sf-dim">Una <b>TASK</b> ejecuta SQL a horario (<code>SCHEDULE = '5 MINUTE'</code> o <code>'USING CRON 0 6 * * * America/Lima'</code>) o después de otra (<code>AFTER</code>), formando un <b>task graph</b>. Se crea <b>suspendida</b>: hasta que no haces <code>ALTER TASK … RESUME</code> no corre. Su dueño necesita el privilegio <code>EXECUTE TASK</code> en la cuenta. Con <code>WHEN SYSTEM$STREAM_HAS_DATA('mi_stream')</code> solo corre si hay cambios nuevos: el patrón clásico de CDC dentro de Snowflake.</p>
      <div class="sf-filtros"><a class="sf-chip${tab === 'graphs' ? ' on' : ''}" href="${href('tareas')}">Task Graphs</a><a class="sf-chip${tab === 'runs' ? ' on' : ''}" href="${href('tareas/runs')}">Task Runs</a><a class="sf-chip${tab === 'dinamicas' ? ' on' : ''}" href="${href('tareas/dinamicas')}">Dynamic Tables</a></div>
      ${tab === 'dinamicas' ? `<p class="sf-dim">Una <b>dynamic table</b> se define con una consulta y un atraso máximo (<code>TARGET_LAG = '1 hour'</code>): Snowflake la refresca sola cuando sus datos quedan más viejos que eso. No admite INSERT ni UPDATE: se cambian las tablas de origen.</p>${Object.keys(s.dinamicas).length ? `<table class="sf-tabla"><thead><tr><th>Name</th><th>Target lag</th><th>Warehouse</th><th>State</th><th>Last refresh</th></tr></thead><tbody>${Object.values(s.dinamicas).map((x) => `<tr><td><b>${esc(x.nombre)}</b><div class="sf-chico sf-dim">${esc(x.db)}.${esc(x.esquema)}</div></td><td>${esc(x.lagTxt)}</td><td>${esc(x.wh)}</td><td>${x.estado}</td><td>${fechaHora(x.ultima)}</td></tr>`).join('')}</tbody></table>` : '<div class="sf-vacio"><p>Todavía no hay dynamic tables.</p></div>'}${s.dynHist.length ? `<h2>Refresh history</h2><table class="sf-tabla"><thead><tr><th>Status</th><th>Table</th><th>Trigger</th><th>Started</th><th class="sf-der">Duration</th><th>Error</th></tr></thead><tbody>${s.dynHist.slice(0, 60).map((h) => `<tr><td><span class="${h.estado === 'FAILED' ? 'sf-rojo' : 'sf-ok'}">● ${h.estado}</span></td><td>${esc(h.nombre)}</td><td>${esc(h.motivo)}</td><td>${fechaHora(h.inicio)}</td><td class="sf-der">${dur(h.fin - h.inicio)}</td><td class="sf-chico">${esc(h.error || '')}</td></tr>`).join('')}</tbody></table>` : ''}` : tab === 'graphs' ? (raices.length ? raices.map(([k]) => arbol(k, 0)).join('') : `<div class="sf-vacio"><p>Todavía no hay tareas.</p></div>`)
        : (s.taskHist.length ? `<table class="sf-tabla"><thead><tr><th>Status</th><th>Task</th><th>Triggered by</th><th>Scheduled</th><th>Started</th><th class="sf-der">Duration</th><th>Error</th><th>Query ID</th></tr></thead><tbody>${s.taskHist.map((h) => `<tr><td><span class="${h.estado === 'FAILED' ? 'sf-rojo' : h.estado === 'SUCCEEDED' ? 'sf-ok' : 'sf-dim'}">● ${h.estado}</span></td><td><b>${esc(h.nombre)}</b><div class="sf-chico sf-dim">${esc(h.db)}.${esc(h.esquema)}</div></td><td>${esc(h.disparo)}</td><td>${fechaHora(h.programada)}</td><td>${fechaHora(h.inicio)}</td><td class="sf-der">${dur(h.fin - h.inicio)}</td><td class="sf-chico">${esc(h.error || '')}</td><td><code class="sf-chico">${esc(h.id)}</code></td></tr>`).join('')}</tbody></table>` : `<div class="sf-vacio"><p>Ninguna tarea corrió todavía.</p></div>`)}
      <h2>Ejemplo completo: CDC con un stream y una tarea</h2><pre class="sf-pre">-- 1. los cambios de la tabla de pedidos, desde la última vez que se leyeron
CREATE OR REPLACE STREAM pedidos_cambios ON TABLE pedidos;
-- 2. una tabla destino
CREATE OR REPLACE TABLE pedidos_auditoria (pedido_id INT, estado VARCHAR, accion VARCHAR, cuando TIMESTAMP);
-- 3. la tarea: cada 5 minutos, solo si hay cambios, los copia (y al leerlos, el stream se vacía)
CREATE OR REPLACE TASK t_auditar WAREHOUSE = COMPUTE_WH SCHEDULE = '5 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('pedidos_cambios')
AS INSERT INTO pedidos_auditoria
   SELECT pedido_id, estado, METADATA$ACTION, CURRENT_TIMESTAMP() FROM pedidos_cambios;
-- 4. el dueño necesita EXECUTE TASK, y la tarea se activa con RESUME
USE ROLE ACCOUNTADMIN; GRANT EXECUTE TASK ON ACCOUNT TO ROLE SYSADMIN; USE ROLE SYSADMIN;
ALTER TASK t_auditar RESUME;
-- 5. prueba: un cambio y una corrida manual
UPDATE pedidos SET estado = 'entregado' WHERE pedido_id = 10;
EXECUTE TASK t_auditar;
SELECT * FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY()) ORDER BY query_start_time DESC;</pre><button class="sf-btn" id="sfEjemploT">Abrir el ejemplo en una worksheet</button>
      <div class="sf-modal" id="sfModal" hidden></div></div>`, 'tareas');
    main.querySelector('#sfEjemploT').onclick = () => C.nuevaHoja(main.querySelector('.sf-pre').textContent.replace(/&gt;/g, '>') + '\n');
    main.querySelectorAll('[data-a]').forEach((b) => { b.onclick = async () => {
      const t = s.tasks[b.dataset.t]; if (!t) return; const nom = `${t.db}.${t.esquema}.${t.nombre}`;
      if (b.dataset.a === 'VER') return C.nuevaHoja(`-- ${nom}\nDESCRIBE TASK ${nom};\n\n-- el cuerpo de la tarea:\n${t.sql};\n`);
      const r = await correr(C, b.dataset.a === 'EXECUTE' ? `EXECUTE TASK ${nom}` : `ALTER TASK ${nom} ${b.dataset.a}`);
      C.toast(r && r.error ? String(r.error.message).split('\n').slice(0, 2).join(' ') : b.dataset.a === 'EXECUTE' ? 'Tarea ejecutada: mira Task Runs' : 'Listo'); C.dibujar();
    }; });
    main.querySelector('#sfNuevaT').onclick = () => {
      const m = main.querySelector('#sfModal'); const ctx = s.ctx;
      m.innerHTML = `<div class="sf-modal-c sf-form"><div class="sf-cab"><h2>New Task</h2><span class="sf-sp"></span><button class="sf-icono" data-cerrar>✕</button></div>
        <label>Name<input id="tN" value="T_RESUMEN_DIARIO"></label><label>Warehouse<select id="tW"><option value="">Serverless (lo administra Snowflake)</option>${Object.keys(s.warehouses).map((w) => `<option ${w === ctx.wh ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select></label>
        <label>Schedule<select id="tS"><option value="'5 MINUTE'">Every 5 minutes</option><option value="'60 MINUTE'">Every hour</option><option value="'USING CRON 0 6 * * * America/Argentina/Buenos_Aires'" selected>Daily at 06:00 (Buenos Aires)</option><option value="'USING CRON 0 7 * * 1-5 America/Lima'">Weekdays at 07:00 (Lima)</option></select></label>
        <label>SQL<textarea id="tQ" rows="5">CREATE OR REPLACE TABLE resumen_diario AS
SELECT fecha_pedido, canal, COUNT(*) AS pedidos FROM pedidos GROUP BY 1, 2</textarea></label>
        <p class="sf-dim">Se crea en ${esc(ctx.db)}.${esc(ctx.esquema)}, suspendida. Equivale a: <code id="tSql"></code></p><div class="sf-acciones"><button class="sf-btn" data-cerrar>Cancel</button><button class="sf-btn sf-pri" id="tOk">Create Task</button></div></div>`;
      m.hidden = false;
      const sqlDe = () => `CREATE OR REPLACE TASK ${m.querySelector('#tN').value.trim() || 'NUEVA_TAREA'}${m.querySelector('#tW').value ? ` WAREHOUSE = ${m.querySelector('#tW').value}` : ''} SCHEDULE = ${m.querySelector('#tS').value} AS ${m.querySelector('#tQ').value.trim()}`;
      const upd = () => { m.querySelector('#tSql').textContent = sqlDe(); }; m.querySelectorAll('input,select,textarea').forEach((x) => { x.oninput = upd; }); upd();
      m.querySelectorAll('[data-cerrar]').forEach((x) => { x.onclick = () => { m.hidden = true; }; });
      m.querySelector('#tOk').onclick = async () => { const r = await correr(C, sqlDe()); if (r && r.error) { C.toast(String(r.error.message).split('\n')[0]); return; } m.hidden = true; C.toast('Tarea creada (suspendida): usa Resume para activarla'); C.dibujar(); };
    };
  };

  // ------------------------------------------------------------------ Cost Management
  P.costos = (C) => {
    const { esc, marco, main, M } = C; const s = M().st(); M().tick();
    const CR = M().CREDITOS_HORA;
    const enCurso = Object.values(s.warehouses).filter((w) => w.estado === 'STARTED').map((w) => [w.nombre, (CR[w.tamano] || 1) * Math.max(60, (Date.now() - w.desde) / 1000) / 3600]);
    const dias = []; for (let i = 13; i >= 0; i--) dias.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
    const hoy = dias[dias.length - 1];
    const porDia = dias.map((d) => { const x = { ...(s.consumo[d] || {}) }; if (d === hoy) for (const [w, cr] of enCurso) x[w] = (x[w] || 0) + cr; return [d, x]; });
    const quienes = [...new Set(porDia.flatMap(([, x]) => Object.keys(x)))];
    const total = porDia.reduce((a, [, x]) => a + Object.values(x).reduce((b, v) => b + v, 0), 0);
    const maxD = Math.max(0.001, ...porDia.map(([, x]) => Object.values(x).reduce((b, v) => b + v, 0)));
    const COL = ['#29b5e8', '#7254f3', '#11a683', '#f59e0b', '#ef4444', '#64748b'];
    const W = 640, H = 220, L = 46, ancho = (W - L - 10) / dias.length;
    const barras = porDia.map(([d, x], i) => { let y = H - 30; return quienes.map((w, j) => { const v = x[w] || 0; const h = (v / maxD) * (H - 50); y -= h; return v ? `<rect x="${L + i * ancho + 3}" y="${y}" width="${ancho - 6}" height="${h}" fill="${COL[j % COL.length]}"><title>${d} · ${w}: ${v.toFixed(4)} créditos</title></rect>` : ''; }).join('') + (i % 2 ? '' : `<text x="${L + i * ancho + ancho / 2}" y="${H - 14}" font-size="10" text-anchor="middle" fill="currentColor">${d.slice(5)}</text>`); }).join('');
    const porWh = quienes.map((w) => [w, porDia.reduce((a, [, x]) => a + (x[w] || 0), 0)]).sort((a, b) => b[1] - a[1]);
    const consultas = s.historial.filter((h) => h.wh && h.estado === 'Succeeded').slice(0, 200);
    const caras = consultas.slice().sort((a, b) => (b.ms * (CR[b.tamano] || 1)) - (a.ms * (CR[a.tamano] || 1))).slice(0, 5);
    main.innerHTML = marco(`<div class="sf-pag"><h1>Cost Management</h1>
      <p class="sf-dim">Snowflake cobra <b>créditos</b> por el cómputo (los warehouses, por segundo mientras están encendidos, mínimo 60 s; y los servicios serverless como las tareas sin warehouse) y aparte el almacenamiento por TB al mes. Acá ves el consumo de tu cuenta de práctica día a día. En una empresa, esta página es la que mira el responsable de la plataforma cada semana.</p>
      <div class="sf-kpis"><div><small>Últimos 14 días</small><b>${total.toFixed(3)} créditos</b><small>≈ ${usd(total)} (a USD 3 por crédito)</small></div><div><small>Warehouses encendidos ahora</small><b>${enCurso.length}</b><small>${enCurso.map(([w]) => esc(w)).join(', ') || 'ninguno: no cobran'}</small></div><div><small>Resource monitors</small><b>${Object.values(s.warehouses).filter((w) => w.monitor).length ? 'Activos' : 'Ninguno'}</b><small>topes de créditos con aviso y suspensión</small></div></div>
      <h2>Consumo diario por warehouse</h2><svg class="sf-graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Créditos por día">${barras}<line x1="${L}" y1="${H - 30}" x2="${W - 5}" y2="${H - 30}" stroke="currentColor" opacity=".3"/><text x="${L - 6}" y="24" font-size="10" text-anchor="end" fill="currentColor">${maxD.toFixed(3)}</text></svg>
      <div class="sf-leyenda">${quienes.map((w, j) => `<span><i style="background:${COL[j % COL.length]}"></i>${esc(w)}</span>`).join('') || '<span class="sf-dim">Todavía no hay consumo: ejecuta consultas en una worksheet.</span>'}</div>
      ${porWh.length ? `<h2>Por warehouse</h2><table class="sf-tabla sf-chica"><thead><tr><th>Warehouse</th><th class="sf-der">Credits</th><th class="sf-der">≈ USD</th></tr></thead><tbody>${porWh.map(([w, v]) => `<tr><td>${esc(w)}</td><td class="sf-der">${v.toFixed(4)}</td><td class="sf-der">${(v * 3).toFixed(2)}</td></tr>`).join('')}</tbody></table>` : ''}
      ${caras.length ? `<h2>Las consultas que más costaron</h2><table class="sf-tabla"><thead><tr><th>SQL</th><th>Warehouse</th><th class="sf-der">Duration</th><th class="sf-der">Credits (aprox.)</th></tr></thead><tbody>${caras.map((h) => `<tr><td><code class="sf-chico">${esc(h.sql.slice(0, 90))}</code></td><td>${esc(h.wh)}</td><td class="sf-der">${dur(h.ms)}</td><td class="sf-der">${((CR[h.tamano] || 1) * h.ms / 36e5).toFixed(5)}</td></tr>`).join('')}</tbody></table><p class="sf-dim sf-chico">Una consulta no cobra por sí sola: cobra el tiempo que el warehouse estuvo encendido. Pero las consultas largas son las que lo mantienen prendido.</p>` : ''}
      <h2>Cómo bajar la factura</h2><ul class="sf-lista"><li><b>AUTO_SUSPEND corto</b> (60 s) en los warehouses de análisis: lo que más se paga es el tiempo ocioso.</li><li><b>Un warehouse por tipo de carga</b> (cargas, transformaciones, BI): así sabes quién gasta y no se pisan.</li><li><b>Tamaño justo</b>: duplicar el tamaño duplica el costo por hora; solo conviene si la consulta tarda menos de la mitad.</li><li><b>Resource monitors</b> con aviso al 80 % y suspensión al 100 %: <code>CREATE RESOURCE MONITOR tope_mensual WITH CREDIT_QUOTA = 100 TRIGGERS ON 80 PERCENT DO NOTIFY ON 100 PERCENT DO SUSPEND;</code> y <code>ALTER WAREHOUSE COMPUTE_WH SET RESOURCE_MONITOR = tope_mensual;</code></li></ul>
      <h2>Lo mismo con SQL</h2><pre class="sf-pre">SELECT warehouse_name, DATE_TRUNC('day', start_time) AS dia, SUM(credits_used) AS creditos
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE start_time &gt;= DATEADD(day, -14, CURRENT_DATE())
GROUP BY 1, 2 ORDER BY 2, 1;</pre><button class="sf-btn" id="sfAbrirC">Abrir en una worksheet</button></div>`, 'costos');
    main.querySelector('#sfAbrirC').onclick = () => C.nuevaHoja("SELECT warehouse_name, DATE_TRUNC('day', start_time) AS dia, SUM(credits_used) AS creditos\nFROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY\nWHERE start_time >= DATEADD(day, -14, CURRENT_DATE())\nGROUP BY 1, 2 ORDER BY 2, 1;\n");
  };

  // ------------------------------------------------------------------ Dashboards
  P.dashboards = (C) => {
    const { esc, marco, main, href, ruta, M } = C; const s = M().st();
    const tb = ruta[1] && s.tableros.find((x) => x.id === ruta[1]);
    if (!tb) {
      main.innerHTML = marco(`<div class="sf-pag"><div class="sf-cab"><h1>Dashboards</h1><span class="sf-sp"></span><button class="sf-btn sf-pri" id="sfNuevoD">${C.ic('mas')} Dashboard</button></div>
        <p class="sf-dim">Un dashboard junta <b>tiles</b>: cada uno es una consulta SQL con su gráfico (barras, líneas, número o tabla). Corre sobre un warehouse cada vez que lo actualizas, así que también consume créditos.</p>
        ${s.tableros.length ? `<table class="sf-tabla"><thead><tr><th>Title</th><th class="sf-der">Tiles</th><th>Created</th><th></th></tr></thead><tbody>${s.tableros.map((t) => `<tr><td><a href="${href('dashboards/' + t.id)}"><b>${esc(t.nombre)}</b></a></td><td class="sf-der">${t.tiles.length}</td><td>${fechaHora(t.creado)}</td><td><button class="sf-icono" data-borrar="${t.id}" title="Delete">${C.ic('basura')}</button></td></tr>`).join('')}</tbody></table>` : '<div class="sf-vacio"><p>Todavía no hay dashboards.</p></div>'}</div>`, 'dashboards');
      main.querySelector('#sfNuevoD').onclick = () => { const t = { id: id(), nombre: 'Ventas de la tienda', creado: Date.now(), tiles: [{ id: id(), titulo: 'Pedidos totales', tipo: 'kpi', sql: 'SELECT COUNT(*) AS pedidos FROM tienda_andina.public.pedidos' }, { id: id(), titulo: 'Ventas por canal', tipo: 'barras', sql: "SELECT p.canal, ROUND(SUM(d.cantidad * d.precio_unitario), 0) AS ventas\nFROM tienda_andina.public.pedidos p JOIN tienda_andina.public.detalle_pedidos d ON d.pedido_id = p.pedido_id\nGROUP BY 1 ORDER BY 2 DESC" }, { id: id(), titulo: 'Pedidos por mes (2024)', tipo: 'lineas', sql: "SELECT SUBSTR(fecha_pedido, 1, 7) AS mes, COUNT(*) AS pedidos FROM tienda_andina.public.pedidos WHERE fecha_pedido >= '2024-01-01' GROUP BY 1 ORDER BY 1" }] }; s.tableros.push(t); guardar(C); location.hash = href('dashboards/' + t.id); };
      main.querySelectorAll('[data-borrar]').forEach((b) => { b.onclick = () => { if (!confirm('¿Eliminar el dashboard?')) return; s.tableros = s.tableros.filter((x) => x.id !== b.dataset.borrar); guardar(C); C.dibujar(); }; });
      return;
    }
    main.innerHTML = marco(`<div class="sf-pag"><div class="sf-cab"><a class="sf-btn" href="${href('dashboards')}">${C.ic('volver')}</a><input class="sf-titulo-in" id="sfDN" value="${esc(tb.nombre)}" aria-label="Dashboard title"><span class="sf-sp"></span><span class="sf-dim sf-chico">${esc(s.ctx.wh || 'sin warehouse')}</span><button class="sf-btn" id="sfRef">↻ Refresh</button><button class="sf-btn sf-pri" id="sfTile">${C.ic('mas')} New tile</button></div>
      <div class="sf-tiles">${tb.tiles.map((t) => `<section class="sf-tile${t.tipo === 'kpi' ? ' sf-tile-kpi' : ''}" data-tile="${t.id}"><div class="sf-tile-cab"><b>${esc(t.titulo)}</b><span class="sf-sp"></span><button class="sf-icono" data-editar="${t.id}" title="Edit tile">✎</button><button class="sf-icono" data-quitar="${t.id}" title="Remove tile">✕</button></div><div class="sf-tile-c" data-c="${t.id}"><span class="sf-dim">Ejecutando…</span></div></section>`).join('') || '<div class="sf-vacio"><p>Agrega un tile.</p></div>'}</div>
      <div class="sf-modal" id="sfModal" hidden></div></div>`, 'dashboards');
    const pintar = async () => { for (const t of tb.tiles) { const el = main.querySelector(`[data-c="${t.id}"]`); if (!el) continue; el.innerHTML = '<span class="sf-dim">Ejecutando…</span>'; const r = await correr(C, t.sql); el.innerHTML = grafico(C, r, t.tipo); } };
    pintar();
    main.querySelector('#sfDN').onchange = (e) => { tb.nombre = e.target.value.trim() || tb.nombre; guardar(C); };
    main.querySelector('#sfRef').onclick = pintar;
    const editar = (t) => {
      const m = main.querySelector('#sfModal'); const nuevo = !t; t = t || { id: id(), titulo: 'Nuevo tile', tipo: 'barras', sql: 'SELECT canal, COUNT(*) AS pedidos FROM tienda_andina.public.pedidos GROUP BY 1 ORDER BY 2 DESC' };
      m.innerHTML = `<div class="sf-modal-c sf-form" style="width:min(760px,100%)"><div class="sf-cab"><h2>${nuevo ? 'New tile' : 'Edit tile'}</h2><span class="sf-sp"></span><button class="sf-icono" data-cerrar>✕</button></div>
        <label>Title<input id="dT" value="${esc(t.titulo)}"></label><label>Chart<select id="dK">${[['barras', 'Bar'], ['lineas', 'Line'], ['kpi', 'Scorecard'], ['tabla', 'Table']].map(([v, n]) => `<option value="${v}" ${t.tipo === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>SQL<textarea id="dQ" rows="6" spellcheck="false">${esc(t.sql)}</textarea></label><p class="sf-dim sf-chico">Barras y líneas usan la primera columna como eje X y la segunda como valor. Scorecard muestra el último valor de la primera fila.</p>
        <div id="dPrev"></div><div class="sf-acciones"><button class="sf-btn" id="dProbar">▶ Run</button><button class="sf-btn" data-cerrar>Cancel</button><button class="sf-btn sf-pri" id="dOk">Save</button></div></div>`;
      m.hidden = false; m.querySelectorAll('[data-cerrar]').forEach((x) => { x.onclick = () => { m.hidden = true; }; });
      m.querySelector('#dProbar').onclick = async () => { m.querySelector('#dPrev').innerHTML = grafico(C, await correr(C, m.querySelector('#dQ').value), m.querySelector('#dK').value); };
      m.querySelector('#dOk').onclick = () => { t.titulo = m.querySelector('#dT').value.trim() || t.titulo; t.tipo = m.querySelector('#dK').value; t.sql = m.querySelector('#dQ').value; if (nuevo) tb.tiles.push(t); guardar(C); m.hidden = true; C.dibujar(); };
    };
    main.querySelector('#sfTile').onclick = () => editar(null);
    main.querySelectorAll('[data-editar]').forEach((b) => { b.onclick = () => editar(tb.tiles.find((x) => x.id === b.dataset.editar)); });
    main.querySelectorAll('[data-quitar]').forEach((b) => { b.onclick = () => { tb.tiles = tb.tiles.filter((x) => x.id !== b.dataset.quitar); guardar(C); C.dibujar(); }; });
  };

  // ------------------------------------------------------------------ Marketplace
  P.marketplace = (C) => {
    const { esc, marco, main, href, ruta, M } = C; const s = M().st(); const L = M().LISTADOS;
    const uno = ruta[1] && L.find((x) => x.id === ruta[1]);
    if (!uno) {
      main.innerHTML = marco(`<div class="sf-pag"><h1>Marketplace</h1><p class="sf-dim">Datos de otras organizaciones que se comparten <b>sin copiarlos</b> (Secure Data Sharing): al hacer <b>Get</b>, aparecen en tu cuenta como una base de datos de solo lectura y siempre actualizada. Tú pagas solo el warehouse con que los consultas. Los listados de la práctica son ficticios, con datos generados.</p>
        <div class="sf-cards">${L.map((x) => `<a class="sf-card" href="${href('marketplace/' + x.id)}"><span class="sf-chip">${esc(x.categoria)}</span><h3>${esc(x.titulo)}</h3><p class="sf-dim sf-chico">${esc(x.proveedor)}</p><p>${esc(x.desc)}</p><b class="${s.compartidas[x.base] ? 'sf-ok' : ''}">${s.compartidas[x.base] ? '✓ Obtenido' : 'Free'}</b></a>`).join('')}</div></div>`, 'marketplace');
      return;
    }
    const ya = !!s.compartidas[uno.base];
    main.innerHTML = marco(`<div class="sf-pag"><a class="sf-btn" href="${href('marketplace')}">${C.ic('volver')} Marketplace</a><div class="sf-cab" style="margin-top:12px"><div><h1>${esc(uno.titulo)}</h1><p class="sf-dim">${esc(uno.proveedor)} · ${esc(uno.categoria)} · Free</p></div><span class="sf-sp"></span>${ya ? `<button class="sf-btn sf-pri" id="sfAbrirM">Open</button>` : `<button class="sf-btn sf-pri" id="sfGet">Get</button>`}</div>
      <p>${esc(uno.desc)}</p><h2>Qué trae</h2><ul class="sf-lista">${uno.tablas.map((t) => `<li><code>${esc(uno.base)}.PUBLIC.${esc(t)}</code></li>`).join('')}</ul>
      <h2>Cómo se usa</h2><ul class="sf-lista"><li>Al hacer Get se crea la base <code>${esc(uno.base)}</code> (imported database). Es <b>de solo lectura</b>: un INSERT o un CREATE TABLE ahí da error de permisos.</li><li>Para dársela a otros roles: <code>GRANT IMPORTED PRIVILEGES ON DATABASE ${esc(uno.base)} TO ROLE ANALISTA;</code></li><li>Si necesitas transformar los datos, créalos en tu base: <code>CREATE TABLE mi_base.public.x AS SELECT … FROM ${esc(uno.base)}.PUBLIC.…</code></li></ul>
      <div id="sfMRes"></div></div>`, 'marketplace');
    const ejemplo = uno.id === 'clima' ? `SELECT c.ciudad, c.fecha, c.temp_max, c.lluvia_mm\nFROM ${uno.base}.PUBLIC.CLIMA_DIARIO c\nWHERE c.ciudad = 'Lima'\nORDER BY c.fecha\nLIMIT 30;` : uno.id === 'feriados' ? `-- ¿cuántos pedidos hubo en feriados, por país?\nSELECT f.pais, f.nombre, f.fecha, COUNT(p.pedido_id) AS pedidos\nFROM ${uno.base}.PUBLIC.FERIADOS f\nLEFT JOIN tienda_andina.public.clientes c ON c.pais = f.pais\nLEFT JOIN tienda_andina.public.pedidos p ON p.cliente_id = c.cliente_id AND p.fecha_pedido = CAST(f.fecha AS VARCHAR)\nWHERE f.fecha BETWEEN '2024-01-01' AND '2024-12-31'\nGROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 20;` : `SELECT moneda, MIN(fecha) AS desde, MAX(fecha) AS hasta, ROUND(AVG(valor_usd), 6) AS promedio\nFROM ${uno.base}.PUBLIC.TIPOS_CAMBIO GROUP BY 1 ORDER BY 1;`;
    const abrir = () => C.nuevaHoja(`USE WAREHOUSE ${s.ctx.wh || 'COMPUTE_WH'};\n\n${ejemplo}\n`);
    if (ya) main.querySelector('#sfAbrirM').onclick = abrir;
    else main.querySelector('#sfGet').onclick = async (e) => { e.target.disabled = true; e.target.textContent = 'Getting…'; try { const db = await M().obtenerListado(uno.id); C.toast(`Listo: la base ${db} ya está en tu cuenta (Databases)`); C.dibujar(); } catch (err) { C.toast(err.message); e.target.disabled = false; e.target.textContent = 'Get'; } };
  };

  // ------------------------------------------------------------------ Python con una session de Snowpark mínima
  // Corre el código en Pyodide. Cada session.sql("…") que no tiene resultado todavía se anota; después se ejecutan
  // esas consultas en el motor y se vuelve a correr el código con los resultados (hasta 4 pasadas).
  const PRELUDIO = String.raw`
import sys as _sys, types as _types, json as _json, ast as _ast, io as _io, contextlib as _cl
import pandas as pd
_CACHE = _json.loads(_ENTRADA['cache']); _PEDIDAS = []; _ELS = []; _VALS = _json.loads(_ENTRADA['vals'])
class Row(dict):
    def __getattr__(self, k):
        try: return self[k]
        except KeyError: raise AttributeError(k)
class DataFrame:
    def __init__(self, q): self.q = q
    def _r(self):
        if self.q in _CACHE: return _CACHE[self.q]
        if self.q not in _PEDIDAS: _PEDIDAS.append(self.q)
        return {"columns": [], "values": []}
    def to_pandas(self):
        r = self._r()
        if r.get("error"): raise Exception(r["error"])
        return pd.DataFrame(r["values"], columns=r["columns"])
    def collect(self): r = self._r(); return [Row(zip(r["columns"], v)) for v in r["values"]]
    def count(self): return len(self._r()["values"])
    def show(self, n=10): print(self.to_pandas().head(n).to_string(index=False))
    def limit(self, n): return DataFrame(f"SELECT * FROM ({self.q}) LIMIT {int(n)}")
class Session:
    def sql(self, q): return DataFrame(str(q).strip().rstrip(";"))
    def table(self, n): return DataFrame(f"SELECT * FROM {n}")
session = Session()
def get_active_session(): return session
for _n in ["snowflake", "snowflake.snowpark", "snowflake.snowpark.context"]:
    _sys.modules[_n] = _types.ModuleType(_n)
_sys.modules["snowflake.snowpark.context"].get_active_session = get_active_session
_sys.modules["snowflake.snowpark"].Session = Session
def _df_json(x):
    x = x if isinstance(x.index, pd.RangeIndex) else x.reset_index(drop=all(n is None for n in x.index.names))
    return {"columns": [str(c) for c in x.columns], "values": [[None if (isinstance(v, float) and v != v) else (v.item() if hasattr(v, "item") else str(v) if not isinstance(v, (int, float, str, bool, type(None))) else v) for v in fila] for fila in x.head(500).itertuples(index=False)]}
class _St(_types.ModuleType):
    def __init__(self): super().__init__("streamlit"); self.sidebar = self
    def _e(self, **k): _ELS.append(k)
    def set_page_config(self, *a, **k): pass
    def title(self, t): self._e(t="title", v=str(t))
    def header(self, t): self._e(t="header", v=str(t))
    def subheader(self, t): self._e(t="subheader", v=str(t))
    def markdown(self, t, **k): self._e(t="markdown", v=str(t))
    def caption(self, t): self._e(t="caption", v=str(t))
    def divider(self): self._e(t="divider")
    def info(self, t): self._e(t="info", v=str(t))
    def success(self, t): self._e(t="success", v=str(t))
    def warning(self, t): self._e(t="warning", v=str(t))
    def error(self, t): self._e(t="error", v=str(t))
    def write(self, *a):
        for x in a:
            if isinstance(x, pd.DataFrame): self._e(t="df", **_df_json(x))
            else: self._e(t="markdown", v=str(x))
    def dataframe(self, x, **k): self._e(t="df", **_df_json(x if isinstance(x, pd.DataFrame) else pd.DataFrame(x)))
    table = dataframe
    def metric(self, label, value, delta=None, **k): self._e(t="metric", label=str(label), v=str(value), delta=None if delta is None else str(delta))
    def _chart(self, tipo, data, x=None, y=None):
        d = data if isinstance(data, pd.DataFrame) else pd.DataFrame(data)
        if x is None: d = d.reset_index(); x = d.columns[0]
        if y is None: y = [c for c in d.columns if c != x][0]
        self._e(t="chart", tipo=tipo, x=str(x), y=str(y), **_df_json(d[[x, y]]))
    def bar_chart(self, data, x=None, y=None, **k): self._chart("barras", data, x, y)
    def line_chart(self, data, x=None, y=None, **k): self._chart("lineas", data, x, y)
    def _w(self, tipo, label, defecto, **k):
        v = _VALS.get(label, defecto); self._e(t="widget", tipo=tipo, label=str(label), v=v, **k); return v
    def selectbox(self, label, options, index=0, **k): o = [x.item() if hasattr(x, "item") else x for x in list(options)]; return self._w("select", label, o[index] if o else None, options=o)
    def radio(self, label, options, index=0, **k): o = list(options); return self._w("select", label, o[index] if o else None, options=o)
    def slider(self, label, min_value=0, max_value=100, value=None, step=1, **k): return self._w("slider", label, value if value is not None else min_value, min=min_value, max=max_value, step=step)
    def number_input(self, label, min_value=None, max_value=None, value=0, **k): return self._w("number", label, value, min=min_value, max=max_value)
    def text_input(self, label, value="", **k): return self._w("text", label, value)
    def checkbox(self, label, value=False, **k): return self._w("checkbox", label, value)
    def button(self, label, **k): self._e(t="widget", tipo="button", label=str(label), v=False); return bool(_VALS.pop("__boton__", None) == label)
    def columns(self, n, **k): return [self] * (n if isinstance(n, int) else len(n))
    def expander(self, *a, **k): return _cl.nullcontext(self)
    def container(self, **k): return _cl.nullcontext(self)
_sys.modules["streamlit"] = _St()
def _correr(codigo):
    salida = _io.StringIO(); err = None
    with _cl.redirect_stdout(salida):
        try:
            arbol = _ast.parse(codigo); ult = arbol.body[-1] if arbol.body and isinstance(arbol.body[-1], _ast.Expr) and _ENTRADA['mostrar'] else None
            g = globals()
            if ult is not None:
                exec(compile(_ast.Module(body=arbol.body[:-1], type_ignores=[]), "<celda>", "exec"), g)
                v = eval(compile(_ast.Expression(body=ult.value), "<celda>", "eval"), g)
                if isinstance(v, pd.DataFrame): _ELS.append({"t": "df", **_df_json(v)})
                elif isinstance(v, DataFrame): _ELS.append({"t": "df", **_df_json(v.to_pandas())})
                elif v is not None: print(repr(v))
            else: exec(compile(arbol, "<celda>", "exec"), g)
        except Exception as e: err = f"{type(e).__name__}: {e}"
    return salida.getvalue(), err
`;
  async function correrPython(C, codigo, { vals = {}, previas = {}, mostrar = true } = {}) {
    const PY = window.Engines && window.Engines.PY; if (!PY) return { error: 'Python no está disponible' };
    const cache = {};
    for (const [q, r] of Object.entries(previas)) cache[q] = r;
    let ultimo = null;
    for (let pasada = 0; pasada < 4; pasada++) {
      const entrada = JSON.stringify({ cache: JSON.stringify(cache), vals: JSON.stringify(vals), mostrar });
      const prog = `import json as _jj\n_ENTRADA = _jj.loads(${JSON.stringify(entrada)})\n${PRELUDIO}\n_salida, _err = _correr(${JSON.stringify(codigo)})\nprint("\\n__SF__" + _json.dumps({"salida": _salida, "error": _err, "pedidas": _PEDIDAS, "els": _ELS}, default=str))`;
      const r = await PY.run('python', prog);
      const texto = String(r.out || r.stdout || r.output || '') + (r.error ? '\n' + r.error : '');
      const i = texto.lastIndexOf('__SF__'); if (i < 0) return { error: (r.error || texto || 'Error al ejecutar Python').slice(-1500) };
      ultimo = JSON.parse(texto.slice(i + 6));
      if (!ultimo.pedidas.length || pasada === 3) break;
      for (const q of ultimo.pedidas) { const res = await correr(C, q); cache[q] = res && res.error ? { error: String(res.error.message).split('\n').slice(0, 2).join(' '), columns: [], values: [] } : res && res.columns ? { columns: res.columns, values: res.values } : { columns: ['status'], values: [[(res && res.estado) || 'ok']] }; }
    }
    return ultimo;
  }
  function pintarEls(C, els) {
    const { esc } = C;
    return els.map((e, i) => {
      if (e.t === 'title') return `<h1 class="st-h1">${esc(e.v)}</h1>`; if (e.t === 'header') return `<h2 class="st-h2">${esc(e.v)}</h2>`; if (e.t === 'subheader') return `<h3 class="st-h3">${esc(e.v)}</h3>`;
      if (e.t === 'markdown') return `<div class="st-md">${md(esc(e.v))}</div>`; if (e.t === 'caption') return `<p class="st-cap">${esc(e.v)}</p>`; if (e.t === 'divider') return '<hr>';
      if (['info', 'success', 'warning', 'error'].includes(e.t)) return `<div class="st-al st-${e.t}">${esc(e.v)}</div>`;
      if (e.t === 'metric') return `<div class="st-metric"><small>${esc(e.label)}</small><b>${esc(e.v)}</b>${e.delta ? `<span class="${String(e.delta).startsWith('-') ? 'sf-rojo' : 'sf-ok'}">${String(e.delta).startsWith('-') ? '▼' : '▲'} ${esc(String(e.delta).replace(/^[-+]/, ''))}</span>` : ''}</div>`;
      if (e.t === 'df') return tablaRes(C, { columns: e.columns, values: e.values }, 100);
      if (e.t === 'chart') return grafico(C, { columns: e.columns, values: e.values }, e.tipo);
      if (e.t === 'widget') {
        const l = `<label class="st-w-l" for="stw${i}">${esc(e.label)}</label>`;
        if (e.tipo === 'select') return `<div class="st-w">${l}<select id="stw${i}" data-w="${esc(e.label)}">${(e.options || []).map((o) => `<option ${String(o) === String(e.v) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
        if (e.tipo === 'slider') return `<div class="st-w">${l}<input id="stw${i}" type="range" data-w="${esc(e.label)}" data-num min="${e.min}" max="${e.max}" step="${e.step || 1}" value="${e.v}"><output>${esc(e.v)}</output></div>`;
        if (e.tipo === 'number') return `<div class="st-w">${l}<input id="stw${i}" type="number" data-w="${esc(e.label)}" data-num value="${e.v}"></div>`;
        if (e.tipo === 'text') return `<div class="st-w">${l}<input id="stw${i}" data-w="${esc(e.label)}" value="${esc(e.v)}"></div>`;
        if (e.tipo === 'checkbox') return `<div class="st-w"><label><input type="checkbox" data-w="${esc(e.label)}" data-bool ${e.v ? 'checked' : ''}> ${esc(e.label)}</label></div>`;
        if (e.tipo === 'button') return `<div class="st-w"><button class="sf-btn" data-boton="${esc(e.label)}">${esc(e.label)}</button></div>`;
      }
      return '';
    }).join('');
  }
  // Markdown mínimo: títulos, negrita, cursiva, código y listas
  function md(t) {
    return t.split('\n').map((l) => { let x = l.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>'); const h = /^(#{1,3})\s+(.*)$/.exec(x); if (h) return `<h${h[1].length + 1}>${h[2]}</h${h[1].length + 1}>`; if (/^\s*[-*]\s+/.test(x)) return `<li>${x.replace(/^\s*[-*]\s+/, '')}</li>`; return x ? `<p>${x}</p>` : ''; }).join('');
  }

  // ------------------------------------------------------------------ Notebooks
  P.notebooks = (C) => {
    const { esc, marco, main, href, ruta, M } = C; const s = M().st();
    const nb = ruta[1] && s.cuadernos.find((x) => x.id === ruta[1]);
    if (!nb) {
      main.innerHTML = marco(`<div class="sf-pag"><div class="sf-cab"><h1>Notebooks</h1><span class="sf-sp"></span><button class="sf-btn sf-pri" id="sfNuevoN">${C.ic('mas')} Notebook</button></div>
        <p class="sf-dim">Un <b>Snowflake Notebook</b> mezcla celdas de <b>SQL</b>, <b>Python</b> y <b>Markdown</b> sobre un warehouse. En Python se usa <code>session = get_active_session()</code> y <code>session.sql("…").to_pandas()</code> (Snowpark); el resultado de una celda SQL se puede usar en Python por su nombre (<code>cell1.to_pandas()</code>). Aquí el Python corre en tu navegador con Pyodide.</p>
        ${s.cuadernos.length ? `<table class="sf-tabla"><thead><tr><th>Name</th><th class="sf-der">Cells</th><th>Location</th><th>Updated</th><th></th></tr></thead><tbody>${s.cuadernos.map((n) => `<tr><td><a href="${href('notebooks/' + n.id)}"><b>${esc(n.nombre)}</b></a></td><td class="sf-der">${n.celdas.length}</td><td>${esc(n.db)}.${esc(n.esquema)}</td><td>${fechaHora(n.act)}</td><td><button class="sf-icono" data-borrar="${n.id}" title="Delete">${C.ic('basura')}</button></td></tr>`).join('')}</tbody></table>` : '<div class="sf-vacio"><p>Todavía no hay notebooks.</p></div>'}</div>`, 'notebooks');
      main.querySelector('#sfNuevoN').onclick = () => {
        const n = { id: id(), nombre: 'Análisis de ventas', db: s.ctx.db, esquema: s.ctx.esquema, act: Date.now(), celdas: [
          { id: id(), nombre: 'cell1', tipo: 'markdown', codigo: '# Ventas por canal\nPrimero el SQL, después el análisis en **pandas**.' },
          { id: id(), nombre: 'cell2', tipo: 'sql', codigo: 'SELECT p.canal, COUNT(DISTINCT p.pedido_id) AS pedidos,\n       ROUND(SUM(d.cantidad * d.precio_unitario), 2) AS ventas\nFROM tienda_andina.public.pedidos p\nJOIN tienda_andina.public.detalle_pedidos d ON d.pedido_id = p.pedido_id\nGROUP BY 1 ORDER BY 3 DESC;' },
          { id: id(), nombre: 'cell3', tipo: 'python', codigo: 'from snowflake.snowpark.context import get_active_session\nsession = get_active_session()\n\ndf = cell2.to_pandas()\ndf["TICKET_PROMEDIO"] = (df["VENTAS"] / df["PEDIDOS"]).round(2)\ndf.sort_values("TICKET_PROMEDIO", ascending=False)' },
          { id: id(), nombre: 'cell4', tipo: 'python', codigo: 'meses = session.sql("SELECT SUBSTR(fecha_pedido, 1, 7) AS mes, COUNT(*) AS pedidos FROM tienda_andina.public.pedidos GROUP BY 1 ORDER BY 1").to_pandas()\nprint("Meses con datos:", len(meses))\nprint("Mes con más pedidos:", meses.loc[meses["PEDIDOS"].idxmax(), "MES"])' },
        ] };
        s.cuadernos.push(n); guardar(C); location.hash = href('notebooks/' + n.id);
      };
      main.querySelectorAll('[data-borrar]').forEach((b) => { b.onclick = () => { if (!confirm('¿Eliminar el notebook?')) return; s.cuadernos = s.cuadernos.filter((x) => x.id !== b.dataset.borrar); guardar(C); C.dibujar(); }; });
      return;
    }
    nb.res = nb.res || {};
    const celdaHtml = (c) => `<section class="sf-celda" data-celda="${c.id}"><div class="sf-celda-cab"><b class="sf-celda-n">${esc(c.nombre)}</b><select data-tipo="${c.id}" aria-label="Cell type">${['sql', 'python', 'markdown'].map((t) => `<option value="${t}" ${c.tipo === t ? 'selected' : ''}>${t === 'sql' ? 'SQL' : t === 'python' ? 'Python' : 'Markdown'}</option>`).join('')}</select><span class="sf-sp"></span><button class="sf-icono" data-run="${c.id}" title="Run cell (Ctrl+Enter)">${C.ic('play')}</button><button class="sf-icono" data-del="${c.id}" title="Delete cell">✕</button></div><textarea class="sf-celda-c" data-codigo="${c.id}" rows="${Math.max(2, c.codigo.split('\n').length)}" spellcheck="false" aria-label="Code of ${esc(c.nombre)}">${esc(c.codigo)}</textarea><div class="sf-celda-out" data-out="${c.id}"></div></section>`;
    main.innerHTML = marco(`<div class="sf-pag"><div class="sf-cab"><a class="sf-btn" href="${href('notebooks')}">${C.ic('volver')}</a><input class="sf-titulo-in" id="sfNN" value="${esc(nb.nombre)}" aria-label="Notebook name"><span class="sf-sp"></span><span class="sf-dim sf-chico">${esc(nb.db)}.${esc(nb.esquema)} · ${esc(s.ctx.wh || 'sin warehouse')}</span><button class="sf-btn sf-pri" id="sfRunAll">▶ Run all</button></div>
      <div id="sfCeldas">${nb.celdas.map(celdaHtml).join('')}</div>
      <div class="sf-acciones"><button class="sf-btn" data-nueva="sql">+ SQL</button><button class="sf-btn" data-nueva="python">+ Python</button><button class="sf-btn" data-nueva="markdown">+ Markdown</button></div></div>`, 'notebooks');
    const out = (c) => main.querySelector(`[data-out="${c.id}"]`);
    const sqlDe = (c) => c.codigo.trim().replace(/;\s*$/, '');
    async function run(c) {
      const o = out(c); if (!o) return;
      if (c.tipo === 'markdown') { o.innerHTML = `<div class="st-md">${md(esc(c.codigo))}</div>`; return; }
      o.innerHTML = '<span class="sf-dim">Ejecutando…</span>';
      if (c.tipo === 'sql') { const r = await correr(C, `USE SCHEMA ${nb.db}.${nb.esquema};\n${c.codigo}`); nb.res[c.nombre] = r && r.columns ? { columns: r.columns, values: r.values } : null; o.innerHTML = tablaRes(C, r); return; }
      o.innerHTML = '<span class="sf-dim">Ejecutando Python (la primera vez carga Pyodide y pandas, puede tardar)…</span>';
      // las celdas SQL anteriores quedan disponibles por su nombre: cell2.to_pandas()
      const previas = {}; let pre = '';
      for (const x of nb.celdas) { if (x.id === c.id) break; if (x.tipo === 'sql' && nb.res[x.nombre]) { previas[sqlDe(x)] = nb.res[x.nombre]; pre += `${x.nombre} = DataFrame(${JSON.stringify(sqlDe(x))})\n`; } }
      const pyAntes = nb.celdas.slice(0, nb.celdas.indexOf(c)).filter((x) => x.tipo === 'python').map((x) => x.codigo).join('\n');
      const r = await correrPython(C, `${pre}${pyAntes ? `import contextlib as __c, io as __i\nwith __c.redirect_stdout(__i.StringIO()):\n${pyAntes.split('\n').map((l) => '    ' + l).join('\n')}\n` : ''}${c.codigo}`, { previas });
      o.innerHTML = r.error && !r.els ? `<div class="sf-error">${esc(r.error)}</div>` : `${r.salida ? `<pre class="sf-pre">${esc(r.salida)}</pre>` : ''}${pintarEls(C, r.els || [])}${r.error ? `<div class="sf-error">${esc(r.error)}</div>` : ''}`;
    }
    nb.celdas.forEach((c) => { if (c.tipo === 'markdown') run(c); else if (nb.res[c.nombre]) out(c).innerHTML = tablaRes(C, nb.res[c.nombre]); });
    main.querySelector('#sfNN').onchange = (e) => { nb.nombre = e.target.value.trim() || nb.nombre; nb.act = Date.now(); guardar(C); };
    main.querySelector('#sfRunAll').onclick = async () => { for (const c of nb.celdas) await run(c); };
    main.querySelectorAll('[data-codigo]').forEach((t) => { t.oninput = () => { const c = nb.celdas.find((x) => x.id === t.dataset.codigo); c.codigo = t.value; nb.act = Date.now(); t.rows = Math.max(2, t.value.split('\n').length); guardar(C); }; t.onkeydown = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(nb.celdas.find((x) => x.id === t.dataset.codigo)); } }; });
    main.querySelectorAll('[data-run]').forEach((b) => { b.onclick = () => run(nb.celdas.find((x) => x.id === b.dataset.run)); });
    main.querySelectorAll('[data-tipo]').forEach((sel) => { sel.onchange = () => { nb.celdas.find((x) => x.id === sel.dataset.tipo).tipo = sel.value; guardar(C); }; });
    main.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { nb.celdas = nb.celdas.filter((x) => x.id !== b.dataset.del); guardar(C); C.dibujar(); }; });
    main.querySelectorAll('[data-nueva]').forEach((b) => { b.onclick = () => { const n = nb.celdas.reduce((m2, x) => Math.max(m2, Number(String(x.nombre).replace('cell', '')) || 0), 0) + 1; nb.celdas.push({ id: id(), nombre: `cell${n}`, tipo: b.dataset.nueva, codigo: b.dataset.nueva === 'sql' ? 'SELECT 1;' : b.dataset.nueva === 'python' ? 'print("hola")' : '## Notas' }); guardar(C); C.dibujar(); }; });
  };

  // ------------------------------------------------------------------ Streamlit in Snowflake
  P.streamlit = (C) => {
    const { esc, marco, main, href, ruta, M } = C; const s = M().st();
    const app = ruta[1] && s.apps.find((x) => x.id === ruta[1]);
    if (!app) {
      main.innerHTML = marco(`<div class="sf-pag"><div class="sf-cab"><h1>Streamlit</h1><span class="sf-sp"></span><button class="sf-btn sf-pri" id="sfNuevaA">${C.ic('mas')} Streamlit App</button></div>
        <p class="sf-dim"><b>Streamlit in Snowflake</b> publica aplicaciones de datos hechas en Python dentro de la cuenta: corren con los permisos de Snowflake y leen los datos con <code>get_active_session()</code>, sin sacarlos a otro servidor. Cada vez que alguien cambia un control (un filtro, un slider), la app se vuelve a ejecutar de arriba abajo. Aquí corre en tu navegador con Pyodide y los elementos más usados de Streamlit.</p>
        ${s.apps.length ? `<table class="sf-tabla"><thead><tr><th>Name</th><th>Location</th><th>Warehouse</th><th>Updated</th><th></th></tr></thead><tbody>${s.apps.map((a) => `<tr><td><a href="${href('streamlit/' + a.id)}"><b>${esc(a.nombre)}</b></a></td><td>${esc(a.db)}.${esc(a.esquema)}</td><td>${esc(a.wh)}</td><td>${fechaHora(a.act)}</td><td><button class="sf-icono" data-borrar="${a.id}" title="Delete">${C.ic('basura')}</button></td></tr>`).join('')}</tbody></table>` : '<div class="sf-vacio"><p>Todavía no hay apps.</p></div>'}</div>`, 'streamlit');
      main.querySelector('#sfNuevaA').onclick = () => { const a = { id: id(), nombre: 'VENTAS_POR_CANAL', db: s.ctx.db, esquema: s.ctx.esquema, wh: s.ctx.wh || 'COMPUTE_WH', act: Date.now(), codigo: `import streamlit as st
from snowflake.snowpark.context import get_active_session

st.title("Ventas de la tienda")
st.caption("Elige un canal y un año: la app vuelve a consultar Snowflake.")
session = get_active_session()

canales = session.sql("SELECT DISTINCT canal FROM tienda_andina.public.pedidos ORDER BY 1").to_pandas()
canal = st.selectbox("Canal", canales["CANAL"])
anio = st.slider("Año", 2022, 2024, 2024)

df = session.sql(f"""
    SELECT SUBSTR(p.fecha_pedido, 1, 7) AS mes, ROUND(SUM(d.cantidad * d.precio_unitario), 0) AS ventas
    FROM tienda_andina.public.pedidos p
    JOIN tienda_andina.public.detalle_pedidos d ON d.pedido_id = p.pedido_id
    WHERE p.canal = '{canal}' AND p.fecha_pedido LIKE '{anio}%'
    GROUP BY 1 ORDER BY 1
""").to_pandas()

col1, col2 = st.columns(2)
col1.metric("Ventas del año", f"{df['VENTAS'].sum():,.0f}")
col2.metric("Mejor mes", df.loc[df['VENTAS'].idxmax(), 'MES'] if len(df) else "-")
st.bar_chart(df, x="MES", y="VENTAS")
st.dataframe(df)
` }; s.apps.push(a); guardar(C); location.hash = href('streamlit/' + a.id); };
      main.querySelectorAll('[data-borrar]').forEach((b) => { b.onclick = () => { if (!confirm('¿Eliminar la app?')) return; s.apps = s.apps.filter((x) => x.id !== b.dataset.borrar); guardar(C); C.dibujar(); }; });
      return;
    }
    const vals = {};
    main.innerHTML = marco(`<div class="sf-pag sf-st"><div class="sf-cab"><a class="sf-btn" href="${href('streamlit')}">${C.ic('volver')}</a><b>${esc(app.nombre)}</b><span class="sf-dim sf-chico">${esc(app.db)}.${esc(app.esquema)} · ${esc(app.wh)}</span><span class="sf-sp"></span><button class="sf-btn" id="sfEdit">Edit</button><button class="sf-btn sf-pri" id="sfRunA">▶ Run</button></div>
      <div class="sf-st-g"><div class="sf-st-ed" id="sfStEd" hidden><textarea id="sfStC" spellcheck="false" aria-label="App code">${esc(app.codigo)}</textarea></div><div class="sf-st-app" id="sfStApp"><span class="sf-dim">Ejecutando la app (la primera vez carga Pyodide y pandas)…</span></div></div></div>`, 'streamlit');
    const appEl = main.querySelector('#sfStApp');
    async function render() {
      appEl.innerHTML = appEl.innerHTML || '<span class="sf-dim">Ejecutando…</span>';
      const r = await correrPython(C, app.codigo, { vals, mostrar: false });
      appEl.innerHTML = r.error && !r.els ? `<div class="sf-error">${esc(r.error)}</div>` : `${pintarEls(C, r.els || [])}${r.error ? `<div class="sf-error">${esc(r.error)}</div>` : ''}${r.salida ? `<pre class="sf-pre">${esc(r.salida)}</pre>` : ''}`;
      appEl.querySelectorAll('[data-w]').forEach((w) => { w.onchange = () => { vals[w.dataset.w] = w.dataset.num != null ? Number(w.value) : w.dataset.bool != null ? w.checked : w.value; render(); }; if (w.type === 'range') w.oninput = () => { w.nextElementSibling.textContent = w.value; }; });
      appEl.querySelectorAll('[data-boton]').forEach((b) => { b.onclick = () => { vals.__boton__ = b.dataset.boton; render(); }; });
    }
    render();
    main.querySelector('#sfEdit').onclick = () => { const ed = main.querySelector('#sfStEd'); ed.hidden = !ed.hidden; };
    main.querySelector('#sfStC').oninput = (e) => { app.codigo = e.target.value; app.act = Date.now(); guardar(C); };
    main.querySelector('#sfRunA').onclick = render;
  };

  window.SnowflakePaginas = P;
})();
