/* Réplica de la interfaz de Apache Airflow 3 (práctica). Estructura y textos según la UI de Airflow 3.x
 * (Home, Dags, Assets, Browse, Admin), dibujada desde cero: no usa código ni íconos oficiales de Airflow.
 * Los datos salen de AirflowMotor (assets/js/airflow-motor.js), que analiza ~/airflow/dags de la terminal
 * del curso y ejecuta los DAGs con el mini-Airflow de Python. */
(function () {
  'use strict';
  const A = () => window.AirflowMotor;
  const ic = (n, c, t) => window.AFIcono(n, c, t);
  let main = null, Store = null, toast = (m) => console.log(m);
  let ruta = [], query = new URLSearchParams();
  let term = null, termAbierta = false, pendiente = null;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const enc = encodeURIComponent;
  const href = (p, q) => '#/airflow' + (p ? '/' + p : '') + (q ? '?' + new URLSearchParams(q).toString() : '');

  // ------------------------------------------------------------------ formato
  const pad = (n) => String(n).padStart(2, '0');
  function fecha(iso, corta) {
    if (!iso) return '';
    const d = new Date(iso);
    const s = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    return corta ? s : `${s}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  }
  function duracion(a, b) {
    if (!a) return '';
    const ms = Math.max(0, (b ? new Date(b) : new Date()) - new Date(a));
    const s = Math.round(ms / 1000);
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  }
  const segs = (a, b) => a ? Math.max(0, ((b ? new Date(b) : new Date()) - new Date(a)) / 1000) : 0;
  const ESTADOS = ['success', 'failed', 'running', 'queued', 'scheduled', 'skipped', 'upstream_failed', 'up_for_retry', 'deferred', 'removed', 'restarting', 'up_for_reschedule'];
  const badge = (s) => `<span class="af-badge af-s-${esc(s || 'none')}">${ic(s === 'success' ? 'circle-check' : s === 'failed' ? 'circle-x' : s === 'running' ? 'refresh-cw' : s === 'queued' || s === 'scheduled' ? 'clock' : 'circle-alert', 'af-bi', 12)}${esc(s || 'no status')}</span>`;
  const punto = (s) => `<span class="af-pt af-s-${esc(s || 'none')}" title="${esc(s || 'no status')}"></span>`;
  const tipoRun = (t) => ({ manual: ['play', 'Manual'], scheduled: ['calendar', 'Scheduled'], asset_triggered: ['database', 'Asset Triggered'], backfill: ['history', 'Backfill'] }[t] || ['play', t]);
  function hlPy(code) {
    const kw = /\b(def|class|return|import|from|as|with|if|elif|else|for|in|while|try|except|finally|raise|lambda|None|True|False|and|or|not|is|pass|yield|global|async|await)\b/g;
    return code.split('\n').map((l) => {
      let out = ''; let i = 0; const s = l;
      const m = s.match(/^(.*?)(#.*)$/);
      let cuerpo = s, com = '';
      if (m && (m[1].split('"').length % 2 === 1) && (m[1].split("'").length % 2 === 1)) { cuerpo = m[1]; com = m[2]; }
      out = esc(cuerpo).replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, '\u0001$1\u0002').split(/(\u0001.*?\u0002)/).map((p) => p.startsWith('\u0001') ? `<span class="af-hs">${p.slice(1, -1)}</span>` : p.replace(kw, '<span class="af-hk">$1</span>').replace(/(@[\w.]+)/g, '<span class="af-hd">$1</span>')).join('');
      i++;
      return out + (com ? `<span class="af-hc">${esc(com)}</span>` : '');
    });
  }
  function codigo(src, marcar) {
    const lineas = hlPy(src || '');
    return `<div class="af-code"><table>${lineas.map((l, i) => `<tr class="${marcar === i + 1 ? 'af-lmark' : ''}"><td class="af-ln">${i + 1}</td><td><pre>${l || ' '}</pre></td></tr>`).join('')}</table></div>`;
  }

  // ------------------------------------------------------------------ marco
  const NAV = [
    { id: 'home', t: 'Home', i: 'house', h: '' },
    { id: 'dags', t: 'Dags', i: 'workflow', h: 'dags' },
    { id: 'assets', t: 'Assets', i: 'database', h: 'assets' },
    { id: 'browse', t: 'Browse', i: 'globe', menu: [['dag_runs', 'Dag Runs'], ['task_instances', 'Task Instances'], ['events', 'Audit Log'], ['xcoms', 'XComs']] },
    { id: 'admin', t: 'Admin', i: 'settings', menu: [['variables', 'Variables'], ['pools', 'Pools'], ['providers', 'Providers'], ['plugins', 'Plugins'], ['connections', 'Connections'], ['config', 'Config']] },
  ];
  function seccionActual() {
    const r = ruta[0] || '';
    if (!r) return 'home';
    if (r === 'dags' || r === 'import_errors') return 'dags';
    if (r === 'assets') return 'assets';
    if (['dag_runs', 'task_instances', 'events', 'xcoms'].includes(r)) return 'browse';
    if (['variables', 'pools', 'providers', 'plugins', 'connections', 'config'].includes(r)) return 'admin';
    return '';
  }
  function temaClase() { const t = A().st().ajustes.tema; return t === 'dark' ? 'af-oscuro' : t === 'light' ? 'af-claro' : ''; }
  function marco() {
    let g = main.querySelector('#afp');
    if (g) { g.className = 'afp ' + temaClase(); return g; }
    main.innerHTML = `<div class="afp ${temaClase()}" id="afp">
      <nav class="af-nav" aria-label="Navegación de Airflow">
        <a class="af-logo" href="#/airflow" title="Airflow (práctica)">${ic('wind', '', 26)}</a>
        <div class="af-nav-items" id="afNavItems"></div>
        <div class="af-nav-abajo">
          <button class="af-nav-i" id="afTermB" title="Terminal de práctica (la misma máquina del curso)">${ic('square-terminal', '', 20)}<span>Terminal</span></button>
          <button class="af-nav-i" data-menu="docs">${ic('book-open', '', 20)}<span>Docs</span></button>
          <button class="af-nav-i" data-menu="user">${ic('user', '', 20)}<span>User</span></button>
        </div>
      </nav>
      <div class="af-cont"><div class="af-pag" id="afPag"></div>
        <section class="af-term" id="afTerm" hidden><div class="af-term-h"><b>${ic('square-terminal')} Terminal</b><span class="af-dim">la misma máquina del curso: tus DAGs están en ~/airflow/dags</span><span class="af-sp"></span><button class="af-ib" id="afTermX" title="Cerrar">${ic('x')}</button></div><div class="af-term-b" id="afTermBody"></div></section>
      </div>
      <div class="af-pop" id="afPop" hidden></div>
    </div>`;
    g = main.querySelector('#afp');
    g.querySelector('#afTermB').addEventListener('click', () => alternarTerminal());
    g.querySelector('#afTermX').addEventListener('click', () => alternarTerminal(false));
    g.querySelectorAll('.af-nav-abajo [data-menu]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); abrirMenu(b.dataset.menu, b); }));
    document.addEventListener('click', (e) => { const p = document.getElementById('afPop'); if (p && !p.hidden && !p.contains(e.target)) p.hidden = true; });
    if (termAbierta) montarTerminal(false);
    return g;
  }
  function pintarNav() {
    const sec = seccionActual();
    const cont = main.querySelector('#afNavItems');
    cont.innerHTML = NAV.map((n) => n.menu ? `<button class="af-nav-i ${sec === n.id ? 'sel' : ''}" data-menu="${n.id}">${ic(n.i, '', 20)}<span>${n.t}</span></button>` : `<a class="af-nav-i ${sec === n.id ? 'sel' : ''}" href="${href(n.h)}">${ic(n.i, '', 20)}<span>${n.t}</span></a>`).join('');
    cont.querySelectorAll('[data-menu]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); abrirMenu(b.dataset.menu, b); }));
  }
  function abrirMenu(id, btn) {
    const p = main.querySelector('#afPop');
    const r = btn.getBoundingClientRect(); const base = main.querySelector('#afp').getBoundingClientRect();
    let items;
    if (id === 'docs') items = [['https://airflow.apache.org/docs/apache-airflow/stable/index.html', 'Documentation', 'external-link'], ['https://github.com/apache/airflow', 'GitHub Repo', 'external-link'], ['https://airflow.apache.org/docs/apache-airflow/stable/stable-rest-api-ref.html', 'REST API Reference', 'external-link'], ['#/leccion/interfaces-airflow-por-dentro', 'Lección: Airflow por dentro', 'book-open']].map(([h, t, i]) => `<a href="${h}" ${h.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${ic(i, '', 14)} ${t}</a>`).join('') + `<div class="af-pop-pie">Version: ${A().VERSION} (práctica)<br>Git Version: .release:simulada</div>`;
    else if (id === 'user') {
      const t = A().st().ajustes.tema;
      items = `<div class="af-pop-t">admin</div><button data-acc="tema">${ic(t === 'dark' ? 'sun' : 'moon', '', 14)} ${t === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</button><button data-acc="tz">${ic('clock', '', 14)} Timezone: UTC</button><button data-acc="reset">${ic('rotate-ccw', '', 14)} Reiniciar la práctica</button><button data-acc="ej">${ic('file-code', '', 14)} Restaurar los DAGs de ejemplo</button><button data-acc="out">${ic('log-out', '', 14)} Logout</button>`;
    } else items = NAV.find((n) => n.id === id).menu.map(([h, t]) => `<a href="${href(h)}">${t}</a>`).join('');
    p.innerHTML = `<div class="af-pop-m">${id === 'browse' || id === 'admin' ? `<div class="af-pop-t">${id === 'browse' ? 'Browse' : 'Admin'}</div>` : ''}${items}</div>`;
    p.style.left = (r.right - base.left + 6) + 'px';
    p.style.top = Math.max(8, Math.min(r.top - base.top, base.height - 300)) + 'px';
    p.hidden = false;
    p.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { p.hidden = true; }));
    p.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', () => {
      p.hidden = true;
      const acc = b.dataset.acc;
      if (acc === 'tema') { const s = A().st(); const oscuro = s.ajustes.tema === 'dark' || (s.ajustes.tema === 'auto' && document.documentElement.dataset.theme === 'dark'); s.ajustes.tema = oscuro ? 'light' : 'dark'; A().guardar(); render(); }
      if (acc === 'tz') toast('La práctica muestra todas las fechas en UTC, como Airflow por defecto (default_ui_timezone = UTC)');
      if (acc === 'out') toast('En la práctica no hay inicio de sesión: estás como admin (Simple auth manager)');
      if (acc === 'reset' && confirm('¿Borrar corridas, eventos, variables y conexiones de la práctica? Tus archivos de DAG se conservan.')) { A().reiniciar(); render(); }
      if (acc === 'ej' && confirm('¿Volver a escribir los 5 DAGs de ejemplo en ~/airflow/dags? Se pisan los cambios que les hiciste.')) { A().restaurarEjemplos(); A().parsear(true).then(render); }
    }));
  }

  // ------------------------------------------------------------------ terminal integrada
  function alternarTerminal(v) {
    termAbierta = v === undefined ? !termAbierta : v;
    const t = main.querySelector('#afTerm'); if (!t) return;
    t.hidden = !termAbierta;
    document.body.classList.toggle('af-term-on', termAbierta);
    if (termAbierta) montarTerminal(true);
  }
  function montarTerminal(foco) {
    const b = main.querySelector('#afTermBody'); const t = main.querySelector('#afTerm');
    if (!b) return;
    t.hidden = !termAbierta;
    if (!b.firstChild) {
      const Sh = window.Shell;
      term = Sh.createTerminal(b, { compact: true, welcome: `${Sh.col.b('Terminal de práctica')} — tus DAGs están en ${Sh.col.info('~/airflow/dags')}. Prueba: ${Sh.col.info('airflow dags list')} o ${Sh.col.info('nano ~/airflow/dags/conciliacion_pagos.py')}`, onCommand: () => { if (document.getElementById('afp')) A().parsear().then(() => refrescar()).catch(() => refrescar()); } });
    }
    if (foco && term && term.focus) setTimeout(() => term.focus(), 30);
  }

  // ------------------------------------------------------------------ utilidades de UI
  function modal(titulo, cuerpo, botones, o = {}) {
    cerrarModal();
    const m = document.createElement('div'); m.className = 'af-modal-fondo'; m.id = 'afModal';
    m.innerHTML = `<div class="af-modal ${o.ancho ? 'af-modal-ancho' : ''}" role="dialog" aria-label="${esc(titulo)}"><div class="af-modal-h"><h2>${titulo}</h2><button class="af-ib" data-x title="Cerrar">${ic('x')}</button></div><div class="af-modal-b">${cuerpo}</div>${botones ? `<div class="af-modal-f">${botones}</div>` : ''}</div>`;
    main.querySelector('#afp').appendChild(m);
    m.querySelector('[data-x]').addEventListener('click', cerrarModal);
    m.addEventListener('click', (e) => { if (e.target === m) cerrarModal(); });
    return m;
  }
  function cerrarModal() { const m = document.getElementById('afModal'); if (m) m.remove(); if (pendiente) { const f = pendiente; pendiente = null; f(); } }
  const interruptor = (on, attrs = '') => `<button class="af-sw ${on ? 'on' : ''}" role="switch" aria-checked="${on}" ${attrs}><span></span></button>`;
  function tabs(lista, actual, base) { return `<div class="af-tabs" role="tablist">${lista.map(([id, t, i]) => `<a role="tab" class="${actual === id ? 'sel' : ''}" href="${base(id)}">${i ? ic(i, '', 14) : ''}${t}</a>`).join('')}</div>`; }
  function tabla(cols, filas, vacio) {
    if (!filas.length) return `<div class="af-vacio">${vacio || 'No hay datos'}</div>`;
    return `<div class="af-tabla-w"><table class="af-tabla"><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function copiarTexto(t) { try { navigator.clipboard.writeText(t); toast('Copiado'); } catch (e) { /* sin portapapeles */ } }

  // ------------------------------------------------------------------ datos derivados
  function todasLasRuns() {
    const s = A().st(); const out = [];
    for (const [id, rs] of Object.entries(s.runs)) for (const r of rs) out.push(Object.assign({ dag_id: id }, r));
    return out.sort((a, b) => new Date(b.creado) - new Date(a.creado));
  }
  function estadoDag(id) { const r = A().runs(id)[0]; return r ? r.state : null; }

  // ------------------------------------------------------------------ Home
  function home(p) {
    const b = A().bolsa(); const s = A().st();
    const runs = todasLasRuns();
    const desde = Date.now() - 24 * 3600e3;
    const recientes = runs.filter((r) => new Date(r.creado) > desde);
    const tis = recientes.flatMap((r) => Object.values(r.tis).map((t) => t.state).filter(Boolean));
    const nErr = Object.keys(b.errores || {}).length;
    const fallidos = b.dags.filter((d) => estadoDag(d.id) === 'failed').length;
    const corriendo = b.dags.filter((d) => A().runs(d.id).some((r) => r.state === 'running')).length;
    const activos = b.dags.filter((d) => !s.pausados[d.id]).length;
    const cuenta = (lista) => { const c = {}; lista.forEach((x) => { c[x] = (c[x] || 0) + 1; }); return c; };
    const barra = (c, total) => total ? `<div class="af-hbar">${Object.entries(c).map(([k, v]) => `<span class="af-s-${k}" style="width:${(v / total) * 100}%" title="${k}: ${v}"></span>`).join('')}</div><div class="af-hleg">${Object.entries(c).map(([k, v]) => `<span>${punto(k)} ${k} <b>${v}</b></span>`).join('')}</div>` : '<div class="af-dim">Sin actividad en las últimas 24 horas</div>';
    const cr = cuenta(recientes.map((r) => r.state)); const ct = cuenta(tis);
    const usados = runs.filter((r) => r.state === 'running').length;
    p.innerHTML = `<div class="af-home">
      <h1 class="af-h1">Welcome</h1>
      <div class="af-stats">
        <a class="af-stat ${fallidos ? 'af-stat-r' : ''}" href="${href('dags', { last_dag_run_state: 'failed' })}"><b>${fallidos}</b><span>${ic('circle-x', '', 14)} Failed Dags</span></a>
        <button class="af-stat ${nErr ? 'af-stat-n' : ''}" id="afImpErr"><b>${nErr}</b><span>${ic('triangle-alert', '', 14)} Dag Import Errors</span></button>
        <a class="af-stat ${corriendo ? 'af-stat-v' : ''}" href="${href('dags', { last_dag_run_state: 'running' })}"><b>${corriendo}</b><span>${ic('refresh-cw', '', 14)} Running Dags</span></a>
        <a class="af-stat af-stat-a" href="${href('dags', { paused: 'false' })}"><b>${activos}</b><span>${ic('circle-play', '', 14)} Active Dags</span></a>
      </div>
      <div class="af-home-g">
        <div>
          <section class="af-card"><h3>${ic('heart-pulse', '', 16)} Health</h3>
            <div class="af-health">${[['MetaDatabase', 'database'], ['Scheduler', 'calendar'], ['Triggerer', 'timer'], ['Dag Processor', 'file-code']].map(([n, i]) => `<div><span class="af-ok">${ic(i, '', 14)}</span><b>${n}</b><span class="af-badge af-s-success">healthy</span>${n !== 'MetaDatabase' ? `<span class="af-dim">Latest heartbeat: ${fecha(new Date().toISOString())}</span>` : ''}</div>`).join('')}</div>
            <p class="af-dim af-nota">En la práctica no hay procesos reales: el "scheduler" y el "dag processor" corren en tu navegador. Último análisis de la carpeta de DAGs: ${b.en ? fecha(b.en) : 'pendiente'}.</p>
          </section>
          <section class="af-card"><h3>${ic('layers', '', 16)} Pool Slots</h3><div class="af-hbar"><span class="af-s-running" style="width:${Math.min(100, usados / 1.28)}%"></span><span class="af-s-none" style="width:${100 - Math.min(100, usados / 1.28)}%"></span></div><div class="af-hleg"><span>${punto('running')} running <b>${usados}</b></span><span>${punto('none')} open <b>${128 - usados}</b></span><span class="af-dim">default_pool · 128 slots</span></div></section>
          <section class="af-card"><div class="af-card-h"><h3>${ic('history', '', 16)} History</h3><span class="af-dim">Last 24 hours</span></div>
            <h4>${recientes.length} Dag Runs</h4>${barra(cr, recientes.length)}
            <h4>${tis.length} Task Instances</h4>${barra(ct, tis.length)}
          </section>
        </div>
        <section class="af-card af-assetev"><div class="af-card-h"><h3>${ic('database', '', 16)} Asset Events</h3><span class="af-dim">Newest first</span></div>
          ${s.assetEv.length ? s.assetEv.slice(0, 12).map((e) => `<div class="af-aev"><a href="${href('assets/' + enc(e.uri))}"><b>${esc(e.uri)}</b></a><span class="af-dim">${fecha(e.cuando)}</span>${e.dag ? `<span class="af-dim">Source: <a href="${href('dags/' + enc(e.dag) + '/runs/' + enc(e.run) + '/tasks/' + enc(e.task || ''))}">${esc(e.dag)}.${esc(e.task || '')}</a></span>` : `<span class="af-dim">Source: ${esc(e.origen)}</span>`}</div>`).join('') : '<div class="af-vacio">No asset events found</div>'}
        </section>
      </div>
    </div>`;
    p.querySelector('#afImpErr').addEventListener('click', erroresImportacion);
  }
  function erroresImportacion() {
    const e = A().bolsa().errores || {};
    const ks = Object.keys(e);
    modal(`${ic('triangle-alert')} Dag Import Errors (${ks.length})`, ks.length ? ks.map((k) => `<details class="af-imp" open><summary><b>${esc(k.replace(A().DAGS + '/', ''))}</b> <span class="af-dim">${esc(k)}</span></summary><pre class="af-tb">${esc(e[k])}</pre></details>`).join('') + `<p class="af-dim">Un archivo con error no aparece en la lista de Dags. Corrígelo en la terminal (por ejemplo <code>nano ${esc(ks[0])}</code>) y el dag processor lo vuelve a analizar.</p>` : '<div class="af-vacio">No import errors</div>', '', { ancho: true });
  }

  // ------------------------------------------------------------------ lista de Dags
  function listaDags(p) {
    const b = A().bolsa(); const s = A().st();
    const q = (query.get('q') || '').toLowerCase();
    const est = query.get('last_dag_run_state') || '';
    const pausa = query.get('paused') || 'all';
    const tag = query.get('tags') || '';
    const vista = query.get('vista') || 'tabla';
    let dags = b.dags.filter((d) => (!q || d.id.toLowerCase().includes(q)) && (!est || estadoDag(d.id) === est) && (pausa === 'all' || String(!!s.pausados[d.id]) === pausa) && (!tag || d.tags.includes(tag)));
    if (query.get('fav') === '1') dags = dags.filter((d) => s.favoritos.includes(d.id));
    const tags = [...new Set(b.dags.flatMap((d) => d.tags))].sort();
    const nErr = Object.keys(b.errores || {}).length;
    const qf = (k, v) => { const o = Object.fromEntries(query); if (v) o[k] = v; else delete o[k]; return href('dags', o); };
    const ultimos = (id) => A().runs(id).slice(0, 14).reverse();
    const mini = (id) => { const rs = ultimos(id); const mx = Math.max(1, ...rs.map((r) => segs(r.inicio, r.fin))); return `<span class="af-mini">${rs.map((r) => `<a href="${href('dags/' + enc(id) + '/runs/' + enc(r.run_id))}" class="af-s-${r.state}" style="height:${6 + 18 * segs(r.inicio, r.fin) / mx}px" title="${esc(r.run_id)} · ${r.state}"></a>`).join('')}</span>`; };
    const fila = (d) => {
      const r = A().runs(d.id)[0]; const sig = A().siguiente(d);
      return [interruptor(!s.pausados[d.id], `data-pausa="${esc(d.id)}" title="${s.pausados[d.id] ? 'Unpause' : 'Pause'} Dag"`),
        `<a class="af-dagn" href="${href('dags/' + enc(d.id))}">${esc(d.id)}</a>${d.desc ? `<div class="af-dim af-desc">${esc(d.desc)}</div>` : ''}`,
        `<span class="af-sched">${ic(d.sched.t === 'assets' ? 'database' : 'calendar', '', 12)} ${esc(A().textoHorario(d))}</span>`,
        sig && !s.pausados[d.id] ? fecha(sig.toISOString()) : '',
        r ? `<a href="${href('dags/' + enc(d.id) + '/runs/' + enc(r.run_id))}" class="af-lr">${punto(r.state)} ${fecha(r.logical)}</a>` : '',
        mini(d.id),
        d.tags.map((t) => `<a class="af-tag" href="${qf('tags', t)}">${esc(t)}</a>`).join(''),
        `<span class="af-acc"><button class="af-ib" data-trig="${esc(d.id)}" title="Trigger Dag">${ic('play')}</button><button class="af-ib" data-fav="${esc(d.id)}" title="Favorite">${ic('star', s.favoritos.includes(d.id) ? 'af-fav' : '')}</button><button class="af-ib" data-del="${esc(d.id)}" title="Delete Dag">${ic('trash-2')}</button></span>`];
    };
    p.innerHTML = `<div class="af-dags">
      <div class="af-titulo"><h1 class="af-h1">${b.dags.length} Dags</h1><span class="af-sp"></span>${nErr ? `<button class="af-btn af-btn-err" id="afImpErr">${ic('triangle-alert', '', 14)} ${nErr} Dag Import Error${nErr > 1 ? 's' : ''}</button>` : ''}<button class="af-btn" id="afReparse" title="Volver a analizar ~/airflow/dags">${ic('refresh-cw', '', 14)} Reparse</button></div>
      <div class="af-buscar">${ic('search', '', 16)}<input id="afQ" type="search" placeholder="Search Dags" value="${esc(query.get('q') || '')}" aria-label="Search Dags"></div>
      <div class="af-filtros">
        <span class="af-seg">${[['', 'All'], ['failed', 'Failed'], ['running', 'Running'], ['success', 'Success']].map(([v, t]) => `<a class="${est === v ? 'sel' : ''}" href="${qf('last_dag_run_state', v)}">${v ? punto(v) : ''}${t}</a>`).join('')}</span>
        <span class="af-seg">${[['all', 'All'], ['false', 'Active'], ['true', 'Paused']].map(([v, t]) => `<a class="${pausa === v ? 'sel' : ''}" href="${qf('paused', v === 'all' ? '' : v)}">${t}</a>`).join('')}</span>
        <a class="af-btn af-btn-s ${query.get('fav') === '1' ? 'sel' : ''}" href="${qf('fav', query.get('fav') === '1' ? '' : '1')}">${ic('star', '', 14)} Favorites</a>
        <select id="afTag" class="af-sel" aria-label="Filter by tag"><option value="">All tags</option>${tags.map((t) => `<option ${t === tag ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
        <span class="af-sp"></span>
        <span class="af-seg"><a class="${vista === 'tarjetas' ? 'sel' : ''}" href="${qf('vista', 'tarjetas')}" title="Card view">${ic('layout-grid', '', 14)}</a><a class="${vista === 'tabla' ? 'sel' : ''}" href="${qf('vista', '')}" title="Table view">${ic('list', '', 14)}</a></span>
      </div>
      ${!b.en ? `<div class="af-cargando">${ic('refresh-cw', 'af-gira', 16)} Analizando ~/airflow/dags… La primera vez se carga Python en el navegador y puede tardar unos segundos.</div>` : ''}
      ${vista === 'tarjetas' ? `<div class="af-tarjetas">${dags.map((d) => { const f = fila(d); return `<div class="af-card af-dcard"><div class="af-dcard-h">${f[1]}<span class="af-sp"></span>${f[0]}</div><div class="af-dcard-g"><div><span class="af-dim">Schedule</span>${f[2]}</div><div><span class="af-dim">Latest Run</span>${f[4] || '—'}</div><div><span class="af-dim">Next Run</span>${f[3] || '—'}</div><div>${f[5]}</div></div><div class="af-dcard-p">${f[6]}<span class="af-sp"></span>${f[7]}</div></div>`; }).join('')}</div>`
        : tabla(['', 'Dag', 'Schedule', 'Next Dag Run', 'Latest Dag Run', '', 'Tags', ''], dags.map(fila), b.en ? 'No Dags found' : '')}
    </div>`;
    const qi = p.querySelector('#afQ');
    qi.addEventListener('input', () => { clearTimeout(qi._t); qi._t = setTimeout(() => { const o = Object.fromEntries(query); if (qi.value) o.q = qi.value; else delete o.q; history.replaceState(null, '', href('dags', o)); query = new URLSearchParams(o); listaDags(p); const n = p.querySelector('#afQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); });
    p.querySelector('#afTag').addEventListener('change', (e) => { location.hash = qf('tags', e.target.value); });
    const ie = p.querySelector('#afImpErr'); if (ie) ie.addEventListener('click', erroresImportacion);
    p.querySelector('#afReparse').addEventListener('click', () => { A().parsear(true).then(() => { toast('La carpeta de DAGs se volvió a analizar'); render(); }).catch((e) => toast(e.message)); });
    accionesDag(p);
  }
  function accionesDag(p) {
    p.querySelectorAll('[data-pausa]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); const id = b.dataset.pausa; A().pausar(id, !A().st().pausados[id]); render(); }));
    p.querySelectorAll('[data-trig]').forEach((b) => b.addEventListener('click', () => window.AirflowUI.trigger(b.dataset.trig)));
    p.querySelectorAll('[data-fav]').forEach((b) => b.addEventListener('click', () => { const s = A().st(); const id = b.dataset.fav; const i = s.favoritos.indexOf(id); if (i >= 0) s.favoritos.splice(i, 1); else s.favoritos.push(id); A().guardar(); render(); }));
    p.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.del;
      modal(`Delete Dag`, `<p>¿Borrar <b>${esc(id)}</b>? Se borran sus corridas, instancias de tareas y XComs de la base de metadatos.</p><p class="af-dim">El archivo sigue en la carpeta de DAGs, así que el Dag vuelve a aparecer en el próximo análisis (pausado y sin historia). Para que desaparezca de verdad, borra el archivo: <code>rm ${esc((A().dag(id) || {}).file || '')}</code></p>`, `<button class="af-btn" data-x2>Cancel</button><button class="af-btn af-btn-rojo" id="afDelOk">${ic('trash-2', '', 14)} Delete</button>`);
      const m = document.getElementById('afModal'); m.querySelector('[data-x2]').addEventListener('click', cerrarModal);
      m.querySelector('#afDelOk').addEventListener('click', () => { A().borrarDag(id); cerrarModal(); toast(`Dag ${id} borrado de los metadatos`); location.hash = href('dags'); A().parsear(true).then(render); });
    }));
  }

  // ------------------------------------------------------------------ página de un DAG (cabecera + grilla/grafo + pestañas)
  function cabeceraDag(d) {
    const s = A().st(); const r = A().runs(d.id)[0]; const sig = A().siguiente(d);
    return `<div class="af-dh">
      <div class="af-dh-t">${ic('workflow', 'af-dh-i', 22)}<h1>${esc(d.id)}</h1>${interruptor(!s.pausados[d.id], `data-pausa="${esc(d.id)}" title="${s.pausados[d.id] ? 'Unpause' : 'Pause'} Dag"`)}
        <span class="af-sp"></span>
        <button class="af-ib" data-fav="${esc(d.id)}" title="Favorite">${ic('star', s.favoritos.includes(d.id) ? 'af-fav' : '')}</button>
        <button class="af-btn" id="afReparseDag" title="Reparse Dag">${ic('refresh-cw', '', 14)} Reparse Dag</button>
        <button class="af-btn" data-del="${esc(d.id)}">${ic('trash-2', '', 14)} Delete</button>
        <button class="af-btn af-btn-p" data-trig="${esc(d.id)}">${ic('play', '', 14)} Trigger</button>
      </div>
      <div class="af-dh-s">
        <div><span>Schedule</span><b class="af-sched">${ic(d.sched.t === 'assets' ? 'database' : 'calendar', '', 12)} ${esc(A().textoHorario(d))}</b></div>
        <div><span>Latest Run</span><b>${r ? `<a href="${href('dags/' + enc(d.id) + '/runs/' + enc(r.run_id))}">${punto(r.state)} ${fecha(r.logical)}</a>` : '—'}</b></div>
        <div><span>Next Run</span><b>${sig && !s.pausados[d.id] ? fecha(sig.toISOString()) : d.sched.t === 'assets' ? `${(s.colaAssets[d.id] || []).length} of ${d.sched.assets.length} assets updated` : '—'}</b></div>
        <div><span>Owner</span><b>${d.owners.map(esc).join(', ')}</b></div>
        <div><span>Tags</span><b>${d.tags.map((t) => `<a class="af-tag" href="${href('dags', { tags: t })}">${esc(t)}</a>`).join('') || '—'}</b></div>
      </div>
    </div>`;
  }
  function migas(d, run, tarea) {
    const parts = [`<a href="${href('dags')}">Dags</a>`, `<a href="${href('dags/' + enc(d.id))}">${esc(d.id)}</a>`];
    if (run) parts.push(`<a href="${href('dags/' + enc(d.id) + '/runs/' + enc(run.run_id))}">${ic(tipoRun(run.tipo)[0], '', 12)} ${esc(run.run_id)}</a>`);
    if (tarea) parts.push(`<span>${esc(tarea)}</span>`);
    return `<nav class="af-migas" aria-label="Breadcrumb">${parts.join(`<span class="af-dim">/</span>`)}</nav>`;
  }

  function grilla(d, selRun, selTask) {
    const rs = A().runs(d.id).slice(0, Number(query.get('limit') || 10)).reverse();
    const mx = Math.max(1, ...rs.map((r) => segs(r.inicio, r.fin)));
    const grupos = {}; d.tasks.forEach((t) => { if (t.grupo) grupos[t.grupo] = (grupos[t.grupo] || []).concat(t); });
    const cerrados = new Set((query.get('cerrados') || '').split(',').filter(Boolean));
    const filas = []; const vistos = new Set();
    for (const t of d.tasks) {
      if (t.grupo && !vistos.has(t.grupo)) {
        vistos.add(t.grupo);
        filas.push({ grupo: t.grupo, tareas: grupos[t.grupo] });
      }
      if (!t.grupo || !cerrados.has(t.grupo)) filas.push({ t });
    }
    const estadoGrupo = (r, ts) => { const es = ts.map((t) => (r.tis[t.id] || {}).state); for (const k of ['failed', 'upstream_failed', 'up_for_retry', 'running', 'queued', 'scheduled', 'success', 'skipped']) if (es.includes(k)) return k; return null; };
    const qs = (extra) => { const o = Object.fromEntries(query); Object.assign(o, extra); for (const k of Object.keys(o)) if (!o[k]) delete o[k]; return o; };
    return `<div class="af-grid">
      <div class="af-grid-h"><div class="af-grid-n"><span class="af-dim">${rs.length} runs</span></div>
        <div class="af-grid-cols">${rs.map((r) => `<a class="af-gbar ${selRun && selRun.run_id === r.run_id ? 'sel' : ''}" href="${href('dags/' + enc(d.id) + '/runs/' + enc(r.run_id))}" title="${esc(r.run_id)}&#10;State: ${r.state}&#10;Duration: ${duracion(r.inicio, r.fin)}"><span class="af-s-${r.state}" style="height:${8 + 52 * segs(r.inicio, r.fin) / mx}px"></span>${r.tipo !== 'scheduled' ? `<i>${ic(tipoRun(r.tipo)[0], '', 9)}</i>` : ''}</a>`).join('')}</div></div>
      ${filas.map((f) => f.grupo ? `<div class="af-grid-r af-grid-g"><div class="af-grid-n"><a href="${href('dags/' + enc(d.id), qs({ cerrados: [...(cerrados.has(f.grupo) ? [...cerrados].filter((x) => x !== f.grupo) : [...cerrados, f.grupo])].join(',') }))}">${ic(cerrados.has(f.grupo) ? 'chevron-right' : 'chevron-down', '', 12)} ${esc(f.grupo)}</a></div><div class="af-grid-cols">${rs.map((r) => `<span class="af-gcell af-gcell-g af-s-${estadoGrupo(r, f.tareas) || 'none'}"></span>`).join('')}</div></div>`
        : `<div class="af-grid-r ${selTask === f.t.id ? 'sel' : ''}"><div class="af-grid-n ${f.t.grupo ? 'af-ind' : ''}"><a href="${href('dags/' + enc(d.id) + '/tasks/' + enc(f.t.id))}" title="${esc(f.t.op)}">${esc(f.t.grupo ? f.t.id.slice(f.t.grupo.length + 1) : f.t.id)}</a>${f.t.mapeada ? '<span class="af-dim"> [ ]</span>' : ''}</div><div class="af-grid-cols">${rs.map((r) => { const ti = r.tis[f.t.id] || {}; return `<a class="af-gcell af-s-${ti.state || 'none'} ${selRun && selRun.run_id === r.run_id && selTask === f.t.id ? 'sel' : ''}" href="${href('dags/' + enc(d.id) + '/runs/' + enc(r.run_id) + '/tasks/' + enc(f.t.id))}" title="${esc(f.t.id)}&#10;State: ${ti.state || 'no status'}${ti.try > 1 ? '&#10;Try: ' + ti.try : ''}"></a>`; }).join('')}</div></div>`).join('')}
      ${!rs.length ? '<div class="af-vacio af-vacio-s">Todavía no hay corridas. Pulsa <b>Trigger</b>.</div>' : ''}
    </div>`;
  }

  function layout(d) {
    const nivel = {}; const ord = d.tasks.map((t) => t.id);
    for (const t of d.tasks) nivel[t.id] = Math.max(0, ...t.up.map((u) => (nivel[u] ?? -1) + 1));
    const cols = {}; for (const id of ord) (cols[nivel[id]] = cols[nivel[id]] || []).push(id);
    const W = 190, H = 54, GX = 70, GY = 26;
    const pos = {}; const maxFilas = Math.max(...Object.values(cols).map((c) => c.length));
    for (const [n, ids] of Object.entries(cols)) ids.forEach((id, i) => { pos[id] = { x: 20 + n * (W + GX), y: 30 + (i + (maxFilas - ids.length) / 2) * (H + GY), w: W, h: H }; });
    return { pos, W, H, ancho: 40 + Object.keys(cols).length * (W + GX) - GX, alto: 60 + maxFilas * (H + GY) - GY };
  }
  function grafo(d, selRun, selTask) {
    const run = selRun || A().runs(d.id)[0];
    const L = layout(d); const { pos } = L;
    const conAssets = query.get('deps') === 'all';
    const extra = []; let ancho = L.ancho, alto = L.alto;
    if (conAssets) {
      let y = 30;
      if (d.sched.t === 'assets') { d.sched.assets.forEach((a) => { extra.push({ id: 'in:' + a, x: -250, y, w: 200, h: 40, label: a, a: true, to: d.tasks.filter((t) => !t.up.length).map((t) => t.id) }); y += 60; }); }
      const outs = d.tasks.flatMap((t) => t.outlets.map((a) => [t.id, a]));
      y = 30; outs.forEach(([tid, a]) => { extra.push({ id: 'out:' + a, x: L.ancho + 50, y, w: 200, h: 40, label: a, a: true, from: tid }); y += 60; });
      if (extra.length) ancho += 280; alto = Math.max(alto, y + 40);
    }
    const dx = conAssets && d.sched.t === 'assets' ? 270 : 0;
    const P = (id) => { const p = pos[id]; return { x: p.x + dx, y: p.y, w: p.w, h: p.h }; };
    const arista = (a, b) => { const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2, mx = (x1 + x2) / 2; return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 6},${y2}" marker-end="url(#afFlecha)"/>`; };
    const edges = []; for (const t of d.tasks) for (const u of t.up) edges.push(arista(P(u), P(t.id)));
    for (const e of extra) { const box = { x: e.x + dx, y: e.y, w: e.w, h: e.h }; if (e.to) e.to.forEach((t) => edges.push(`<g class="af-ea">${arista(box, P(t))}</g>`)); if (e.from) edges.push(`<g class="af-ea">${arista(P(e.from), box)}</g>`); }
    const grupos = {}; for (const t of d.tasks) if (t.grupo) { const p = P(t.id); const g = grupos[t.grupo] || (grupos[t.grupo] = { x1: 1e9, y1: 1e9, x2: -1e9, y2: -1e9 }); g.x1 = Math.min(g.x1, p.x); g.y1 = Math.min(g.y1, p.y); g.x2 = Math.max(g.x2, p.x + p.w); g.y2 = Math.max(g.y2, p.y + p.h); }
    const zoom = Number(query.get('zoom') || 1);
    const qs = (extraQ) => { const o = Object.fromEntries(query); Object.assign(o, extraQ); for (const k of Object.keys(o)) if (!o[k]) delete o[k]; return o; };
    const base = run ? 'dags/' + enc(d.id) + '/runs/' + enc(run.run_id) + '/tasks/' : 'dags/' + enc(d.id) + '/tasks/';
    return `<div class="af-graph">
      <div class="af-graph-bar"><span class="af-seg"><a class="${conAssets ? '' : 'sel'}" href="${href(ruta.join('/'), qs({ deps: '' }))}">Only tasks</a><a class="${conAssets ? 'sel' : ''}" href="${href(ruta.join('/'), qs({ deps: 'all' }))}">Tasks and assets</a></span><span class="af-sp"></span>
        <a class="af-ib" href="${href(ruta.join('/'), qs({ zoom: String(Math.min(1.6, zoom + 0.2).toFixed(1)) }))}" title="Zoom in">${ic('plus')}</a><a class="af-ib" href="${href(ruta.join('/'), qs({ zoom: String(Math.max(0.4, zoom - 0.2).toFixed(1)) }))}" title="Zoom out">−</a><a class="af-ib" href="${href(ruta.join('/'), qs({ zoom: '' }))}" title="Fit view">${ic('maximize-2')}</a></div>
      <div class="af-graph-c"><div style="width:${(ancho + dx + 40) * zoom}px;height:${(alto + 20) * zoom}px"><div style="transform:scale(${zoom});transform-origin:0 0;width:${ancho + dx + 40}px;height:${alto + 20}px;position:relative">
        <svg class="af-edges" width="${ancho + dx + 40}" height="${alto + 20}"><defs><marker id="afFlecha" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>
          ${Object.entries(grupos).map(([g, b]) => `<rect class="af-ggrp" x="${b.x1 - 12}" y="${b.y1 - 24}" width="${b.x2 - b.x1 + 24}" height="${b.y2 - b.y1 + 36}" rx="8"/><text class="af-ggrp-t" x="${b.x1 - 4}" y="${b.y1 - 9}">${esc(g)}</text>`).join('')}
          ${edges.join('')}</svg>
        ${d.tasks.map((t) => { const p = P(t.id); const ti = run ? (run.tis[t.id] || {}) : {}; return `<a class="af-node af-nb-${ti.state || 'none'} ${selTask === t.id ? 'sel' : ''}" style="left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px" href="${href(base + enc(t.id))}" title="${esc(t.id)}"><b>${esc(t.grupo ? t.id.slice(t.grupo.length + 1) : t.id)}${t.mapeada ? ' [ ]' : ''}</b><span>${esc(t.op)}</span>${ti.state ? `<em>${punto(ti.state)} ${ti.state}</em>` : ''}</a>`; }).join('')}
        ${extra.map((e) => `<a class="af-node af-node-a" style="left:${e.x + dx}px;top:${e.y}px;width:${e.w}px;height:${e.h}px" href="${href('assets/' + enc(e.label))}">${ic('database', '', 14)}<b>${esc(e.label)}</b></a>`).join('')}
      </div></div></div>
    </div>`;
  }

  function paginaDag(p) {
    const id = decodeURIComponent(ruta[1]);
    const d = A().dag(id);
    if (!d) { p.innerHTML = A().bolsa().en ? `<div class="af-vacio">${ic('circle-alert', '', 20)}<h3>Dag ${esc(id)} not found</h3><p>No está en el DagBag: ¿el archivo se borró o tiene un error de importación?</p><a class="af-btn" href="${href('dags')}">Volver a Dags</a></div>` : `<div class="af-cargando">${ic('refresh-cw', 'af-gira', 16)} Analizando ~/airflow/dags…</div>`; return; }
    let run = null, tarea = null;
    if (ruta[2] === 'runs' && ruta[3]) run = A().buscarRun(id, decodeURIComponent(ruta[3]));
    if (ruta[2] === 'runs' && ruta[4] === 'tasks' && ruta[5]) tarea = decodeURIComponent(ruta[5]);
    if (ruta[2] === 'tasks' && ruta[3]) tarea = decodeURIComponent(ruta[3]);
    const vista = query.get('vista') || 'grid';
    const qs = (extra) => { const o = Object.fromEntries(query); Object.assign(o, extra); for (const k of Object.keys(o)) if (!o[k]) delete o[k]; return o; };
    p.innerHTML = `${migas(d, run, tarea)}${cabeceraDag(d)}
      <div class="af-split">
        <div class="af-izq"><div class="af-izq-bar"><span class="af-seg"><a class="${vista === 'grid' ? 'sel' : ''}" href="${href(ruta.join('/'), qs({ vista: '' }))}">${ic('layout-grid', '', 14)} Grid</a><a class="${vista === 'graph' ? 'sel' : ''}" href="${href(ruta.join('/'), qs({ vista: 'graph' }))}">${ic('network', '', 14)} Graph</a></span><span class="af-sp"></span>
          <select class="af-sel" id="afLimit" aria-label="Number of runs">${[5, 10, 25].map((n) => `<option value="${n}" ${String(n) === (query.get('limit') || '10') ? 'selected' : ''}>${n} runs</option>`).join('')}</select></div>
          ${vista === 'graph' ? grafo(d, run, tarea) : grilla(d, run, tarea)}</div>
        <div class="af-der af-scroll" id="afDer"></div>
      </div>`;
    const der = p.querySelector('#afDer');
    const P = window.AirflowUI.paginas;
    if (run && tarea) P.instancia(der, d, run, tarea);
    else if (ruta[2] === 'runs' && ruta[3] && !run) der.innerHTML = `<div class="af-vacio">La corrida ${esc(decodeURIComponent(ruta[3]))} no existe.</div>`;
    else if (run) P.corrida(der, d, run);
    else if (tarea) P.tarea(der, d, tarea);
    else P.dagTabs(der, d);
    p.querySelector('#afLimit').addEventListener('change', (e) => { location.hash = href(ruta.join('/'), qs({ limit: e.target.value === '10' ? '' : e.target.value })); });
    const rp = p.querySelector('#afReparseDag'); if (rp) rp.addEventListener('click', () => A().parsear(true).then(() => { toast('Dag reparseado'); render(); }));
    accionesDag(p);
  }

  // ------------------------------------------------------------------ render y enrutado
  function render(sub) {
    if (!main) return;
    if (Array.isArray(sub)) ruta = sub;
    const h = location.hash.split('?');
    query = new URLSearchParams(h[1] || '');
    if (!Array.isArray(sub)) ruta = h[0].replace(/^#\/airflow\/?/, '').split('/').filter(Boolean);
    const g = marco(); pintarNav();
    document.body.classList.add('af-abierto');
    const p = g.querySelector('#afPag');
    const scroll = guardarScroll(p);
    const P = window.AirflowUI.paginas;
    const r0 = ruta[0] || '';
    try {
      if (!r0) home(p);
      else if (r0 === 'dags' && ruta[1]) paginaDag(p);
      else if (r0 === 'dags') listaDags(p);
      else if (P[r0]) P[r0](p, ruta.slice(1));
      else p.innerHTML = `<div class="af-vacio"><h3>404</h3><p>Page not found</p><a class="af-btn" href="${href('')}">Back to Home</a></div>`;
    } catch (e) {
      console.error(e);
      p.innerHTML = `<div class="af-vacio">${ic('triangle-alert', '', 20)}<h3>Error en la práctica</h3><pre class="af-tb">${esc(e.stack || e.message)}</pre></div>`;
    }
    restaurarScroll(p, scroll);
    const s = A().st();
    if (!s.cache || !s.cache.en) A().parsear().catch((e) => toast('No se pudo analizar la carpeta de DAGs: ' + e.message));
    else A().parsear().catch(() => { /* error ya mostrado */ });
  }
  function guardarScroll(p) { const o = { pag: p.scrollTop }; p.querySelectorAll('.af-scroll[id], .af-graph-c, .af-log-b').forEach((e, i) => { o[(e.id || e.className) + i] = [e.scrollTop, e.scrollLeft]; }); return o; }
  function restaurarScroll(p, o) { p.scrollTop = o.pag || 0; p.querySelectorAll('.af-scroll[id], .af-graph-c, .af-log-b').forEach((e, i) => { const v = o[(e.id || e.className) + i]; if (v) { e.scrollTop = v[0]; e.scrollLeft = v[1]; } }); }
  let tRefresco = null;
  function refrescar() {
    if (!document.getElementById('afp')) return;
    clearTimeout(tRefresco);
    tRefresco = setTimeout(() => {
      if (document.getElementById('afModal')) { pendiente = () => refrescar(); return; }
      const a = document.activeElement;
      if (a && a.closest && a.closest('#afPag') && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
      if (a && a.closest && a.closest('#afTerm')) { render(); if (term && term.focus) term.focus(); return; }
      render();
    }, 90);
  }
  A && window.AirflowMotor && window.AirflowMotor.oyentes.add(() => refrescar());

  function vista(m, ctx, sub) {
    main = m; Store = ctx.Store; toast = ctx.toast || toast;
    if (window.Shell && window.Shell.Machine && !window.Shell.Machine.ready) window.Shell.Machine.load();
    A().sembrar();
    if (!m.querySelector('#afp')) m.innerHTML = '';
    render(sub);
  }
  window.addEventListener('hashchange', () => { if (!/^#\/airflow/.test(location.hash)) { document.body.classList.remove('af-abierto', 'af-term-on'); } });

  window.AirflowUI = {
    vista, render, paginas: {}, trigger: () => {},
    _: { A, ic, esc, enc, href, fecha, duracion, segs, badge, punto, tipoRun, codigo, modal, cerrarModal, interruptor, tabs, tabla, copiarTexto, todasLasRuns, query: () => query, ruta: () => ruta, toast: (m) => toast(m), erroresImportacion, ESTADOS, alternarTerminal },
  };
})();
