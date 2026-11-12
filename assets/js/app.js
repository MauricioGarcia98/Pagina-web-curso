/* Academia de Datos — aplicación principal (router, vistas, ejercicios, laboratorios). */
(function () {
  'use strict';

  const C = window.COURSE;
  const { SQL, PY, DBT, CLI } = window.Engines;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  // ---------------------------------------------------------------- índices
  const LESSONS = [];
  const LESSON_BY_ID = new Map();
  const MODULE_BY_ID = new Map();
  for (const m of C.modulos) {
    MODULE_BY_ID.set(m.id, m);
    for (const l of m.lecciones) { l.modulo = m; LESSONS.push(l); LESSON_BY_ID.set(l.id, l); }
  }
  const ALL_EX = LESSONS.flatMap((l) => l.ejercicios.map((e) => ({ ...e, leccion: l })));
  // las preguntas de examen del índice solo traen el id de su lección: el título sale de la lección
  for (const x of C.examenes || []) for (const p of x.preguntas) { const l = p.leccion && LESSON_BY_ID.get(p.leccion.id); if (l && !p.leccion.titulo) p.leccion.titulo = l.titulo; }

  // ---------------------------------------------------------------- contenido por módulo (carga diferida)
  // El índice trae títulos y la lista de ejercicios; el texto de las lecciones y los ejercicios completos
  // llegan en assets/content/<módulo>.js la primera vez que se abre una lección de ese módulo.
  const EX_POR_ID = new Map(ALL_EX.map((e) => [e.id, e]));
  const modCargas = new Map();
  const cargarScript = (src) => new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { s.remove(); mal(new Error('No se pudo descargar ' + src)); }; document.head.append(s); });
  window.__contenido = (mid, datos) => {
    const m = MODULE_BY_ID.get(mid); if (!m) return;
    for (const l of m.lecciones) { const d = datos[l.id]; if (!d) continue; l.html = d.html; l.ejercicios = d.ejercicios; for (const e of d.ejercicios) { const x = EX_POR_ID.get(e.id); if (x) Object.assign(x, e); } }
    m.cargado = true;
  };
  function cargarModulo(mid) {
    const m = MODULE_BY_ID.get(mid); if (!m || m.cargado) return Promise.resolve();
    if (!modCargas.has(mid)) modCargas.set(mid, cargarScript(`assets/content/${mid}.js?v=${m.v || C.generado}`).catch((e) => { modCargas.delete(mid); throw e; }));
    return modCargas.get(mid);
  }
  const cargarModulos = (ids) => Promise.all([...new Set(ids)].map(cargarModulo));
  // ---------------------------------------------------------------- herramientas de práctica (carga diferida)
  // Cada herramienta pesa cientos de KB: su código se descarga recién al entrar a ella.
  const V_APP = C.vJs || C.generado;
  const GRUPOS = {
    powerbi: ['powerbi-iconos', 'powerbi-visuales', 'powerbi', 'powerbi-informe', 'powerbi-ia', 'powerbi-servicio'],
    databricks: ['databricks', 'databricks-datos', 'databricks-computo', 'databricks-analitica', 'databricks-ml'],
    azure: ['@databricks', 'azure-portal', 'azure-extra', 'adf-studio'],
    github: ['octicons', 'github-actions', 'github', 'github-colab'],
    fabric: ['@databricks', 'fabric', 'fabric-editores'],
    airflow: ['airflow-iconos', 'airflow-motor', 'airflow', 'airflow-paginas', 'terminal-airflow'],
    snowflake: ['snowflake-motor', 'snowflake'],
    bigquery: ['bigquery-motor', 'bigquery'],
    jupyter: ['jupyter-kernel', 'jupyter'],
  };
  const grupoCargas = {};
  function cargarGrupo(g) {
    if (!grupoCargas[g]) grupoCargas[g] = GRUPOS[g].reduce((p, n) => p.then(() => (n[0] === '@' ? cargarGrupo(n.slice(1)) : cargarScript(`assets/js/${n}.js?v=${V_APP}`))), Promise.resolve()).then(() => { grupoCargas[g].listo = true; }, (e) => { delete grupoCargas[g]; throw e; });
    return grupoCargas[g];
  }
  window.__cargarGrupo = cargarGrupo;
  // enlace "Reportar un error": abre un issue de GitHub (o un correo) ya escrito; si no hay nada configurado, no aparece
  const enlaceReporte = (titulo, cuerpo) => { const u = window.Sitio && window.Sitio.urlReporte({ titulo, cuerpo }); return u ? `<a class="badge badge-link" href="${esc(u)}" target="_blank" rel="noopener" title="¿Viste un error o algo que no se entiende? Avísanos">⚑ Reportar un error</a>` : ''; };
  window.__almacen = () => Store; // para que una réplica use a otra sin haber pasado por su página
  // lo que se descarga con "Guardar todo el curso" (Mis datos): el contenido de cada módulo, el buscador,
  // las herramientas de práctica y los datos de ejemplo
  window.__urlsCurso = () => [
    ...C.modulos.map((m) => `assets/content/${m.id}.js?v=${m.v || C.generado}`),
    `assets/content/_buscar.js?v=${C.vBuscar || C.generado}`,
    ...[...new Set(Object.values(GRUPOS).flat().filter((n) => n[0] !== '@'))].map((n) => `assets/js/${n}.js?v=${V_APP}`),
    ...['glosario', 'examenes', 'examenes_cert'].map((n) => `assets/content/_${n}.js?v=${(C.vExtras || {})[n] || C.generado}`),
    `assets/js/pysrc.js?v=${V_APP}`,
  ];
  // ---------------------------------------------------------------- glosario completo y preguntas de examen (carga diferida)
  // El índice trae lo justo para listar y buscar; el detalle llega en assets/content/_glosario.js, _examenes.js y
  // _examenes_cert.js y se vuelca sobre los mismos objetos, así el resto del código no nota la diferencia.
  const extraCargas = {};
  function cargarExtra(n) {
    if (!extraCargas[n]) extraCargas[n] = cargarScript(`assets/content/_${n}.js?v=${(C.vExtras || {})[n] || C.generado}`).then(() => { extraCargas[n].listo = true; }, (e) => { delete extraCargas[n]; throw e; });
    return extraCargas[n];
  }
  window.__glosario = (lista) => { const porT = new Map(C.glosario.map((g) => [g.termino, g])); for (const g of lista) { const x = porT.get(g.termino); if (x) Object.assign(x, g); } if (window.__glosarioListo) window.__glosarioListo(); };
  window.__examenes = (lista) => { for (const e of lista) { const x = (C.examenes || []).find((y) => y.id === e.id); if (!x) continue; const porId = new Map(x.preguntas.map((p) => [p.id, p])); for (const p of e.preguntas) { const y = porId.get(p.id); if (y) Object.assign(y, p); } } };
  // qué archivos extra necesita una ruta antes de dibujarse
  function extrasDe(r) {
    if (r.name === 'glosario' || r.name === 'repaso') return ['glosario'];
    if (r.name === 'simulacro') return ['examenes_cert'];
    if (r.name === 'examen') { const x = (C.examenes || []).find((e) => e.id === r.examen); return [r.examen === 'final' || (x && x.id === x.modulo) ? 'examenes' : 'examenes_cert']; }
    return [];
  }
  window.__cargarTodo = () => Promise.all([cargarModulos(C.modulos.map((m) => m.id)), ...['glosario', 'examenes', 'examenes_cert'].map(cargarExtra)]); // para las pruebas automáticas
  // muestra "cargando", descarga lo que haga falta y recién ahí dibuja (si el alumno no se fue a otra página)
  function conContenido(ids, dibujar) {
    const pend = [...new Set(ids)].filter((id) => MODULE_BY_ID.get(id) && !MODULE_BY_ID.get(id).cargado);
    if (!pend.length) return dibujar();
    const donde = location.hash;
    main.innerHTML = '<div class="cargando-contenido"><span class="spinner"></span> Cargando la lección…</div>';
    cargarModulos(pend).then(() => { if (location.hash === donde) dibujar(); }, () => { if (location.hash === donde) { main.innerHTML = '<div class="card" style="margin:24px"><h2>No se pudo cargar el contenido</h2><p>Revisa tu conexión a internet y vuelve a intentar.</p><button class="btn" id="reintentarC">Reintentar</button></div>'; main.querySelector('#reintentarC').onclick = () => conContenido(ids, dibujar); } });
  }

  // ---------------------------------------------------------------- progreso
  const claveDia = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  const META_SEMANAL = 4; // días de estudio por semana que se proponen como meta
  // racha: días seguidos con actividad (si hoy todavía no estudiaste, la racha de ayer sigue viva hasta la medianoche)
  function racha() {
    const d = Store.data.dias || {}; const hoy = new Date(); const dia = (n) => { const x = new Date(hoy); x.setDate(hoy.getDate() - n); return claveDia(x); };
    let n = 0, i = d[dia(0)] ? 0 : 1; while (d[dia(i)]) { n++; i++; }
    const lunes = (hoy.getDay() + 6) % 7; // 0 = lunes
    const semana = Array.from({ length: 7 }, (_, k) => ({ hecho: !!d[dia(lunes - k)], hoy: k === lunes, futuro: k > lunes }));
    let mejor = 0, corr = 0, prev = null;
    for (const k of Object.keys(d).sort()) { const f = new Date(k + 'T12:00:00'); corr = prev && Math.round((f - prev) / 86400000) === 1 ? corr + 1 : 1; mejor = Math.max(mejor, corr); prev = f; }
    return { dias: n, hoy: !!d[dia(0)], semana, estaSemana: semana.filter((x) => x.hecho).length, mejor: Math.max(mejor, n), total: Object.keys(d).length };
  }
  function bloqueRacha() {
    const r = racha(); const L = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const msg = r.hoy ? (r.dias > 1 ? `¡${r.dias} días seguidos!` : 'Hoy ya estudiaste.') : r.dias ? `Llevas ${r.dias} día${r.dias === 1 ? '' : 's'} seguido${r.dias === 1 ? '' : 's'}: resuelve un ejercicio hoy para no cortar la racha.` : 'Resuelve un ejercicio hoy para empezar una racha.';
    return `<section class="racha card" aria-label="Tu racha de estudio"><div class="racha-n"><span aria-hidden="true">🔥</span><b>${r.dias}</b><small>día${r.dias === 1 ? '' : 's'}</small></div>
      <div class="racha-t"><div class="racha-msg">${msg}</div><div class="racha-sem" role="img" aria-label="Esta semana estudiaste ${r.estaSemana} de 7 días">${r.semana.map((x, i) => `<span class="${x.hecho ? 'ok' : ''} ${x.hoy ? 'hoy' : ''} ${x.futuro ? 'fut' : ''}">${L[i]}</span>`).join('')}</div>
      <div class="small muted">Meta de la semana: ${Math.min(r.estaSemana, META_SEMANAL)} de ${META_SEMANAL} días${r.estaSemana >= META_SEMANAL ? ' · ✓ cumplida' : ''}${r.mejor > r.dias ? ` · tu mejor racha: ${r.mejor} días` : ''}</div></div></section>`;
  }
  const KEY = 'academia-datos-v1';
  const Store = {
    data: { ex: {}, lessons: {}, code: {}, theme: null, visited: {}, auto: {} },
    load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) this.data = Object.assign(this.data, d); } catch (e) { /* sin almacenamiento */ } },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* sin almacenamiento */ } },
    exDone(id) { return !!this.data.ex[id]; },
    setExDone(id) { if (!this.data.ex[id]) { this.data.ex[id] = Date.now(); this.marcarDia(); this.save(); updateProgressPill(); } },
    // un día cuenta para la racha si en él se resolvió al menos un ejercicio o se completó una lección
    marcarDia() { const k = claveDia(new Date()); const d = (this.data.dias = this.data.dias || {}); d[k] = (d[k] || 0) + 1; },
    lessonDone(l) {
      if (this.data.lessons[l.id]) return true;
      return l.ejercicios.length > 0 && l.ejercicios.every((e) => this.exDone(e.id));
    },
    setLessonDone(id, v = true) { if (v) { if (!this.data.lessons[id]) this.marcarDia(); this.data.lessons[id] = Date.now(); } else delete this.data.lessons[id]; this.save(); updateProgressPill(); },
    code(id) { return this.data.code[id]; },
    setCode(id, v) { this.data.code[id] = v; this.saveSoon(); },
    saveSoon() { clearTimeout(this._t); this._t = setTimeout(() => this.save(), 400); }
  };
  Store.load();

  function moduleProgress(m) {
    const total = m.lecciones.length;
    const done = m.lecciones.filter((l) => Store.lessonDone(l)).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  function totalProgress() {
    const done = LESSONS.filter((l) => Store.lessonDone(l)).length;
    return { done, total: LESSONS.length, pct: LESSONS.length ? Math.round((done / LESSONS.length) * 100) : 0 };
  }
  function updateProgressPill() {
    const pct = totalProgress().pct;
    $('#progressPct').textContent = pct + '%';
    const ring = $('#progressRing'); if (ring) ring.style.setProperty('--p', pct);
  }

  // ---------------------------------------------------------------- tema
  const esOscuro = () => document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!Store.data.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  function applyTheme() {
    const t = Store.data.theme;
    if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
    // el botón dice a qué tema te lleva, con texto (no solo un ícono que hay que adivinar)
    const dark = esOscuro(), ico = $('#themeIco'), lbl = $('#themeLbl'), btn = $('#themeBtn');
    if (ico) ico.textContent = dark ? '☀️' : '🌙';
    if (lbl) lbl.textContent = dark ? 'Claro' : 'Oscuro';
    if (btn) btn.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  }
  $('#themeBtn').addEventListener('click', () => {
    Store.data.theme = esOscuro() ? 'light' : 'dark'; Store.save(); applyTheme();
  });
  applyTheme();

  // ---------------------------------------------------------------- utilidades UI
  function toast(msg, ms = 2200) {
    const t = h(`<div class="toast" role="status">${esc(msg)}</div>`);
    document.body.appendChild(t); setTimeout(() => t.remove(), ms);
  }
  function openModal(html) { $('#modalBody').innerHTML = ''; $('#modalBody').append(typeof html === 'string' ? h(`<div>${html}</div>`) : html); $('#modal').hidden = false; }
  function closeModal() { $('#modal').hidden = true; }
  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  const levelClass = (n) => 'b-' + (n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  const TYPE_LABEL = { sql: 'SQL', python: 'Python', pyspark: 'PySpark', airflow: 'Airflow', dbt: 'dbt', quiz: 'Test', cli: 'Terminal', abierto: 'Respuesta libre', dax: 'DAX', dbsql: 'Databricks SQL' };

  PY.listeners.add((s) => {
    const el = $('#pyStatus');
    if (s === 'loading') { el.hidden = false; el.className = 'py-status'; el.innerHTML = '<span class="spinner"></span> Cargando Python…'; }
    else if (s === 'ready') { el.hidden = false; el.className = 'py-status ready'; el.textContent = '🐍 Python listo'; }
    else el.hidden = true;
  });

  // ---------------------------------------------------------------- editor
  function cmMode(lang) {
    return { sql: 'text/x-sqlite', dbt: 'text/x-sqlite', jinja: 'text/x-sqlite', python: 'python', pyspark: 'python', airflow: 'python', bash: 'shell', shell: 'shell', yaml: 'yaml' }[lang] || 'text/plain';
  }
  let hintTables = null;
  function sqlHintTables() {
    if (hintTables) return hintTables;
    if (!SQL.tables) return {};
    hintTables = {};
    for (const [k, t] of Object.entries(SQL.tables)) hintTables[k] = t.columns;
    for (const v of ['stg_clientes', 'stg_productos', 'stg_pedidos', 'stg_detalle_pedidos', 'stg_pagos']) hintTables[v] = [];
    return hintTables;
  }

  // Monaco (el editor de VS Code) con CodeMirror como respaldo mientras carga o si falla.
  const MONACO_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs';
  const Monaco = {
    promise: null, ready: false,
    load() {
      if (this.promise) return this.promise;
      this.promise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = MONACO_BASE + '/loader.js';
        s.onerror = () => reject(new Error('monaco'));
        s.onload = () => {
          const req = window.require;
          window.MonacoEnvironment = {
            globalAPI: true,
            getWorkerUrl: () => `data:text/javascript;charset=utf-8,${encodeURIComponent(`self.MonacoEnvironment={baseUrl:'${MONACO_BASE.replace(/\/vs$/, '')}/'};importScripts('${MONACO_BASE}/base/worker/workerMain.js');`)}`,
          };
          req.config({ paths: { vs: MONACO_BASE } });
          req(['vs/editor/editor.main'], (api) => {
            // según el orden de carga, el cargador AMD puede no dejar la variable global: se usa el módulo recibido
            if (!(window.monaco && window.monaco.languages) && api && api.languages) window.monaco = api;
            if (!(window.monaco && window.monaco.languages)) { reject(new Error('monaco')); return; }
            setupMonaco(window.monaco);
            this.ready = true;
            resolve(window.monaco);
          }, reject);
        };
        document.head.appendChild(s);
      });
      this.promise.catch(() => {});
      return this.promise;
    },
  };
  function setupMonaco(monaco) {
    if (window.Engines && window.Engines.DAX) window.Engines.DAX.registrarMonaco(monaco);
    monaco.editor.defineTheme('academia', {
      base: 'vs-dark', inherit: true,
      rules: [
        { token: 'keyword', foreground: 'C4A7FF', fontStyle: 'bold' }, { token: 'string', foreground: '7EE0A1' }, { token: 'number', foreground: 'F5B971' },
        { token: 'comment', foreground: '6C7389', fontStyle: 'italic' }, { token: 'predefined', foreground: '8CB8FF' }, { token: 'operator', foreground: 'B4B9CB' },
      ],
      colors: { 'editor.background': '#12151d', 'editor.lineHighlightBackground': '#1b1f2b', 'editorLineNumber.foreground': '#4b5266', 'editorLineNumber.activeForeground': '#b4b9cb', 'editor.selectionBackground': '#3a3f7a', 'editorCursor.foreground': '#a5a1ff', 'editorIndentGuide.background1': '#232838' },
    });
    const kw = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'WITH', 'AS', 'ON', 'AND', 'OR', 'NOT', 'IN', 'IS NULL', 'IS NOT NULL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'COALESCE', 'OVER', 'PARTITION BY', 'ROW_NUMBER()', 'RANK()', 'DENSE_RANK()', 'LAG', 'LEAD', 'LIMIT', 'UNION ALL', 'strftime', 'julianday', 'date', 'CAST', 'BETWEEN', 'LIKE', 'EXISTS'];
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems(model, pos) {
        const w = model.getWordUntilPosition(pos);
        const range = { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber, startColumn: w.startColumn, endColumn: w.endColumn };
        const t = sqlHintTables();
        const sugg = [];
        for (const [name, cols] of Object.entries(t)) {
          sugg.push({ label: name, kind: monaco.languages.CompletionItemKind.Class, insertText: name, detail: 'tabla', range });
          for (const c of cols) sugg.push({ label: c, kind: monaco.languages.CompletionItemKind.Field, insertText: c, detail: name, range });
        }
        for (const k of kw) sugg.push({ label: k, kind: monaco.languages.CompletionItemKind.Keyword, insertText: k, range });
        const seen = new Set();
        return { suggestions: sugg.filter((x) => (seen.has(x.label + x.detail) ? false : seen.add(x.label + x.detail))) };
      },
    });
    const pyWords = ['print', 'def', 'return', 'import', 'from', 'class', 'for', 'while', 'if', 'elif', 'else', 'try', 'except', 'finally', 'with', 'lambda', 'yield', 'len', 'range', 'enumerate', 'zip', 'sorted', 'dict', 'list', 'set', 'tuple', 'True', 'False', 'None',
      'spark', 'F.col', 'F.sum', 'F.count', 'F.avg', 'F.round', 'F.when', 'F.lit', 'F.year', 'F.month', 'Window.partitionBy', 'withColumn', 'select', 'filter', 'groupBy', 'agg', 'join', 'orderBy', 'show()', 'alias', 'createOrReplaceTempView', 'spark.table', 'spark.sql', 'DAG', 'PythonOperator', 'BashOperator', 'EmptyOperator', 'task_id', 'python_callable'];
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems(model, pos) {
        const w = model.getWordUntilPosition(pos);
        const range = { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber, startColumn: w.startColumn, endColumn: w.endColumn };
        const words = new Set([...pyWords, ...(model.getValue().match(/[A-Za-z_]\w{2,}/g) || [])]);
        return { suggestions: [...words].map((x) => ({ label: x, kind: monaco.languages.CompletionItemKind.Text, insertText: x, range })) };
      },
    });
  }
  function monacoLang(lang) { return { dax: 'dax', sql: 'sql', dbt: 'sql', jinja: 'sql', python: 'python', pyspark: 'python', airflow: 'python', bash: 'shell', shell: 'shell', yaml: 'yaml', json: 'json' }[lang] || 'plaintext'; }

  function mountMonaco(wrap, { lang, value, onRun, onCheck, onChange, tall }) {
    const monaco = window.monaco;
    wrap.classList.add('monaco-host');
    const ed = monaco.editor.create(wrap, {
      value, language: monacoLang(lang), theme: 'academia', automaticLayout: true, minimap: { enabled: false },
      fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 14, lineHeight: 22, tabSize: 4, insertSpaces: true,
      scrollBeyondLastLine: false, renderLineHighlight: 'line', roundedSelection: true, padding: { top: 10, bottom: 10 },
      scrollbar: { alwaysConsumeMouseWheel: false, verticalScrollbarSize: 10, horizontalScrollbarSize: 10 }, wordBasedSuggestions: 'currentDocument',
      quickSuggestions: { other: true, comments: false, strings: false }, fixedOverflowWidgets: true, bracketPairColorization: { enabled: true }, guides: { indentation: true },
      stickyScroll: { enabled: false }, overviewRulerLanes: 0, lineNumbersMinChars: 3,
    });
    const minH = tall ? 320 : 130, maxH = tall ? 720 : 520;
    const fit = () => { const hgt = Math.min(maxH, Math.max(minH, ed.getContentHeight())); wrap.style.height = hgt + 'px'; ed.layout(); };
    ed.onDidContentSizeChange(fit); fit();
    // addAction (no addCommand): addCommand registra el atajo de forma global y, con varios editores
    // en la página, Ctrl+Enter ejecutaba siempre el último editor creado. addAction lo ata a ESTE editor.
    ed.addAction({ id: 'academia.run', label: 'Ejecutar', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter], run: () => { onRun && onRun(); } });
    ed.addAction({ id: 'academia.check', label: 'Comprobar', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter], run: () => { onCheck && onCheck(); } });
    ed.onDidChangeModelContent(() => onChange && onChange(ed.getValue()));
    return ed;
  }

  function createEditor(parent, opts = {}) {
    const { lang = 'sql', value = '', onRun, onCheck, onChange, tall = false } = opts;
    const wrap = h(`<div class="editor-host ${tall ? 'editor-tall' : ''}"></div>`);
    parent.appendChild(wrap);
    const api = { impl: null, touched: false, kind: null };
    const useMonaco = () => {
      wrap.innerHTML = '';
      const cur = api.impl ? api.getValue() : value;
      const ed = mountMonaco(wrap, { lang, value: cur, onRun, onCheck, onChange: (v) => { api.touched = true; onChange && onChange(v); }, tall });
      api.kind = 'monaco'; api.monaco = ed; api.cm = null;
      api.impl = { getValue: () => ed.getValue(), setValue: (v) => ed.setValue(v), focus: () => ed.focus(), refresh: () => ed.layout() };
    };
    const useCm = () => {
      if (!window.CodeMirror) {
        const ta = h('<textarea class="fallback-editor" spellcheck="false"></textarea>');
        ta.value = value; wrap.appendChild(ta);
        ta.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); (e.shiftKey ? onCheck : onRun)?.(); }
          if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 4; }
        });
        ta.addEventListener('input', () => { api.touched = true; onChange?.(ta.value); });
        api.impl = { getValue: () => ta.value, setValue: (v) => { ta.value = v; }, focus: () => ta.focus(), refresh() {} };
        return;
      }
      const cm = window.CodeMirror(wrap, {
        value, mode: cmMode(lang), lineNumbers: true, matchBrackets: true, autoCloseBrackets: true,
        indentUnit: 4, tabSize: 4, indentWithTabs: false, lineWrapping: false, viewportMargin: Infinity,
        extraKeys: {
          'Ctrl-Enter': () => onRun?.(), 'Cmd-Enter': () => onRun?.(),
          'Shift-Ctrl-Enter': () => onCheck?.(), 'Shift-Cmd-Enter': () => onCheck?.(),
          'Ctrl-Space': (ed) => { if (lang === 'sql' || lang === 'dbt') ed.showHint({ hint: window.CodeMirror.hint.sql, tables: sqlHintTables(), completeSingle: false }); },
          'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment',
          Tab: (ed) => { if (ed.somethingSelected()) ed.indentSelection('add'); else ed.replaceSelection('    ', 'end'); },
          'Shift-Tab': (ed) => ed.indentSelection('subtract')
        }
      });
      cm.on('change', () => { api.touched = true; onChange?.(cm.getValue()); });
      cm.on('focus', () => { api.touched = true; });
      setTimeout(() => cm.refresh(), 0);
      api.kind = 'cm'; api.cm = cm;
      api.impl = { getValue: () => cm.getValue(), setValue: (v) => cm.setValue(v), focus: () => cm.focus(), refresh: () => cm.refresh() };
    };
    if (Store.data.editor !== 'simple' && Monaco.ready) useMonaco();
    else {
      useCm();
      if (Store.data.editor !== 'simple') Monaco.load().then(() => { if (!api.touched && wrap.isConnected) useMonaco(); }).catch(() => {});
    }
    api.getValue = () => api.impl.getValue();
    api.setValue = (v) => api.impl.setValue(v);
    api.focus = () => api.impl.focus();
    api.refresh = () => api.impl.refresh();
    return api;
  }

  // ---------------------------------------------------------------- salidas
  const fmtCell = (v) => {
    if (v === null || v === undefined) return '<td class="null">NULL</td>';
    if (typeof v === 'number') return `<td class="num">${Number.isInteger(v) ? v : Math.round(v * 10000) / 10000}</td>`;
    if (v instanceof Uint8Array) return '<td class="null">[blob]</td>';
    return `<td title="${esc(v)}">${esc(v)}</td>`;
  };
  function tableHtml(res, max = 200) {
    const rows = res.values.slice(0, max);
    const numCol = res.columns.map((_, j) => { const v = rows.find((r) => r[j] !== null && r[j] !== undefined); return v && typeof v[j] === 'number'; });
    return `<div class="result-table-wrap"><table class="result"><thead><tr><th class="rn">#</th>${res.columns.map((c, j) => `<th class="${numCol[j] ? 'num' : ''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr><td class="rn">${i + 1}</td>${r.map(fmtCell).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function renderSqlOutput(out, r) {
    out.innerHTML = '';
    if (!r.ok) { out.append(h(`<pre class="console"><span class="err">${esc(r.error)}</span></pre>`)); return; }
    const sets = r.results || [];
    if (!sets.length) {
      out.append(h(`<div class="out-meta">✔ Ejecutado en ${r.ms.toFixed(0)} ms${r.changes ? ` · ${r.changes} fila(s) modificada(s)` : ''} · sin filas para mostrar</div>`));
      return;
    }
    const shown = sets.slice(-3);
    for (const res of shown) {
      const n = res.values.length;
      const block = h('<div></div>');
      block.append(h(`<div class="out-meta"><span>${n} fila${n === 1 ? '' : 's'}${n > 200 ? ' (mostrando 200)' : ''}</span><span>· ${res.columns.length} columnas</span><span>· ${r.ms.toFixed(0)} ms</span><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-csv>⬇ CSV</button></div>`));
      block.insertAdjacentHTML('beforeend', tableHtml(res));
      $('[data-csv]', block).addEventListener('click', () => downloadCsv(res));
      out.append(block);
    }
    if (sets.length > 3) out.prepend(h(`<div class="out-meta">Se ejecutaron ${sets.length} consultas; se muestran las 3 últimas.</div>`));
  }
  function downloadCsv(res) {
    const q = (v) => (v === null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = [res.columns.map(q).join(','), ...res.values.map((r) => r.map(q).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'resultado.csv'; a.click(); URL.revokeObjectURL(a.href);
  }
  function renderConsole(out, r) {
    out.innerHTML = '';
    const pre = h('<pre class="console"></pre>');
    if (r.stdout) pre.append(document.createTextNode(r.stdout));
    if (r.error) pre.append(h(`<span class="err">${esc((r.stdout ? '\n' : '') + r.error)}</span>`));
    if (!r.stdout && !r.error) pre.append(h('<span class="muted">(El código se ejecutó sin imprimir nada. Usa print(...) para ver resultados.)</span>'));
    out.append(pre);
  }
  function loadingInto(out, msg) { out.innerHTML = `<div class="out-meta"><span class="spinner"></span> ${esc(msg)}</div>`; }

  async function ensureSql(out) {
    if (SQL._bytes) return true;
    loadingInto(out, 'Cargando la base de datos SQLite con más de 500.000 filas (solo la primera vez)…');
    try { await SQL.init(); return true; } catch (e) { out.innerHTML = `<pre class="console"><span class="err">${esc(e.message)}</span></pre>`; return false; }
  }
  const pyLoadingMsg = () => (PY.status === 'ready' ? 'Ejecutando…' : 'Cargando Python en tu navegador (≈10 MB, solo la primera vez; puede tardar 10-30 s)…');

  function pyMode(code, fallback = 'python') {
    if (/\bpyspark\b|\bspark\.\w+|SparkSession|\bsc\.parallelize/.test(code)) return 'pyspark';
    if (/\bfrom airflow\b|\bimport airflow\b/.test(code)) return 'airflow';
    return fallback;
  }

  // ---------------------------------------------------------------- bloques de código en lecciones
  const RUNNABLE = new Set(['sql', 'python', 'pyspark', 'dbt']);
  function enhanceCode(root) {
    for (const pre of $$('pre[data-lang]', root)) {
      if (pre.closest('.ex-extra')) { highlight(pre); continue; }
      const lang = pre.dataset.lang;
      const code = pre.textContent;
      highlight(pre);
      const box = h('<div class="code-block"></div>');
      pre.replaceWith(box); box.append(pre);
      const tools = h(`<div class="code-tools"><span class="lang">${esc(lang === 'text' ? '' : lang)}</span><button type="button" data-copy title="Copiar">Copiar</button></div>`);
      if (RUNNABLE.has(lang) && !pre.hasAttribute('data-norun')) tools.append(h('<button type="button" data-run title="Ejecutar este ejemplo">▶ Probar</button>'));
      if ((lang === 'bash' || lang === 'shell') && !pre.hasAttribute('data-norun') && termRunnable(code)) {
        const b = h('<button type="button" title="Ejecutar en la terminal de práctica">⌨ En la terminal</button>');
        b.addEventListener('click', () => Dock.runScript(code));
        tools.append(b);
      }
      // un bloque que empieza con el nombre de su archivo (# compose.yaml, -- models/x.sql, // main.bicep)
      // se puede crear en la terminal con un clic, en la carpeta donde estás parado
      const arch = archivoDeBloque(lang, code);
      if (arch && window.Shell) {
        const b = h(`<button type="button" title="Crea ${esc(arch)} en la carpeta actual de la terminal">💾 Crear en la terminal</button>`);
        b.addEventListener('click', () => crearArchivoDeBloque(arch, code));
        tools.append(b);
      }
      box.append(tools);
      $('[data-copy]', tools).addEventListener('click', () => { navigator.clipboard?.writeText(code); toast('Copiado al portapapeles'); });
      $('[data-run]', tools)?.addEventListener('click', () => turnIntoRunner(box, lang, code));
    }
  }
  // pistas progresivas: cada clic muestra una pista más
  function mostrarPista(ex, showExtra, btn) {
    const todas = ex.pistas || [ex.pista];
    const n = Math.min(Number(btn.dataset.vistas || 0) + 1, todas.length);
    btn.dataset.vistas = n;
    showExtra(todas.length > 1 ? `Pistas (${n} de ${todas.length})` : 'Pista', todas.slice(0, n).map((p, i) => (todas.length > 1 ? `<div class="pista-n"><b>Pista ${i + 1}</b>${p}</div>` : p)).join(''));
    if (todas.length > 1) btn.innerHTML = n < todas.length ? `💡 Otra pista <span class="muted">${n + 1}/${todas.length}</span>` : '💡 Pistas';
  }

  // ---------------------------------------------------------------- la misma consulta en varios motores
  const NOMBRE_MOTOR = { sqlite: 'SQLite', postgres: 'PostgreSQL', mysql: 'MySQL', sqlserver: 'SQL Server', bigquery: 'BigQuery', databricks: 'Databricks SQL', snowflake: 'Snowflake', oracle: 'Oracle' };
  function enhanceMotores(root) {
    for (const box of $$('.motores[data-spec]', root)) {
      const spec = JSON.parse(box.dataset.spec); box.removeAttribute('data-spec');
      const pref = Store.data.code['motor-preferido'];
      const inicial = spec.variantes.find((v) => v.m === pref) ? pref : spec.variantes[0].m;
      box.innerHTML = `<div class="motores-cab">${spec.titulo ? `<b>${esc(spec.titulo)}</b>` : '<b>La misma consulta en cada motor</b>'}<div class="motores-tabs">${spec.variantes.map((v) => `<button data-m="${v.m}">${esc(NOMBRE_MOTOR[v.m])}</button>`).join('')}</div></div>
        ${spec.variantes.map((v) => `<div class="motores-var" data-v="${v.m}" hidden><pre data-sql><code>${esc(v.code)}</code></pre><div class="motores-tools"><button type="button" data-copiar>Copiar</button>${v.norun ? `<span class="small muted">${v.m === 'sqlite' || v.m === 'postgres' || v.m === 'mysql' || v.m === 'sqlserver' ? 'Este ejemplo no se ejecuta en el navegador' : 'Para ver la sintaxis: este motor no corre en el navegador'}</span>` : `<button type="button" data-ejecutar>▶ Probar en ${esc(NOMBRE_MOTOR[v.m])}</button>${v.m === 'mysql' || v.m === 'sqlserver' ? '<span class="small muted">modo compatible</span>' : ''}`}</div><div class="output" data-out></div></div>`).join('')}`;
      if (window.hljs) $$('pre[data-sql] code', box).forEach((c) => { try { c.innerHTML = window.hljs.highlight(c.textContent, { language: 'sql', ignoreIllegals: true }).value; } catch (e) { /* sin resaltado */ } });
      const mostrar = (m) => { $$('.motores-tabs button', box).forEach((b) => b.classList.toggle('active', b.dataset.m === m)); $$('.motores-var', box).forEach((d) => { d.hidden = d.dataset.v !== m; }); };
      $('.motores-tabs', box).addEventListener('click', (e) => {
        const b = e.target.closest('[data-m]'); if (!b) return;
        Store.setCode('motor-preferido', b.dataset.m);
        // todos los bloques de la página cambian juntos al motor elegido
        $$('.motores', root).forEach((otro) => { if (otro.querySelector(`.motores-tabs [data-m="${b.dataset.m}"]`)) otro.querySelector(`.motores-tabs [data-m="${b.dataset.m}"]`).dispatchEvent(new CustomEvent('elegir')); });
        mostrar(b.dataset.m);
      });
      $$('.motores-tabs button', box).forEach((b) => b.addEventListener('elegir', () => mostrar(b.dataset.m)));
      for (const d of $$('.motores-var', box)) {
        const v = spec.variantes.find((x) => x.m === d.dataset.v);
        $('[data-copiar]', d).addEventListener('click', () => { navigator.clipboard?.writeText(v.code); toast('Copiado al portapapeles'); });
        const run = $('[data-ejecutar]', d);
        if (run) run.addEventListener('click', async () => {
          const out = $('[data-out]', d);
          if (!(await ensureSql(out))) return;
          loadingInto(out, v.m === 'postgres' && window.SqlMotores.PG.estado !== 'listo' ? 'Cargando PostgreSQL (unos 6 MB, solo la primera vez)…' : v.m === 'duckdb' && window.SqlMotores.DUCK.estado !== 'listo' ? 'Cargando DuckDB (unos 10 MB, solo la primera vez)…' : 'Ejecutando…');
          try { const r = await window.SqlMotores.ejecutar(v.m, v.code, (msg) => loadingInto(out, msg)); renderSqlOutput(out, r); if (r.avisos && r.avisos.length) out.prepend(h(`<div class="motor-aviso">⚠️ ${r.avisos.map(esc).join('<br>⚠️ ')}</div>`)); }
          catch (e) { out.innerHTML = `<pre class="console"><span class="err">${esc(e.message)}</span></pre>`; }
        });
      }
      mostrar(inicial);
    }
  }
  // highlight.js no trae HCL en su paquete común: una definición chica para los bloques de Terraform
  function registrarHcl(hljs) {
    if (hljs.getLanguage('hcl')) return;
    hljs.registerLanguage('hcl', () => ({
      name: 'HCL',
      aliases: ['terraform', 'tf', 'tfvars'],
      keywords: { keyword: 'resource data variable output locals module provider terraform backend required_providers lifecycle dynamic content moved import run assert variables for in if', literal: 'true false null', built_in: 'var local module data each count path self' },
      contains: [
        hljs.HASH_COMMENT_MODE, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE,
        { className: 'string', begin: '"', end: '"', contains: [hljs.BACKSLASH_ESCAPE, { className: 'subst', begin: /\$\{/, end: /\}/ }] },
        { className: 'string', begin: /<<-?\s*(\w+)/, end: /^\s*\w+\s*$/ },
        { className: 'number', begin: /\b\d+(\.\d+)?\b/ },
        { className: 'attr', begin: /^\s*[\w-]+(?=\s*=[^=])/ },
        { className: 'title', begin: /\b[a-z]+_[a-z0-9_]+(?=\s*\()/ },
      ],
    }));
  }
  function highlight(pre) {
    const code = $('code', pre);
    if (!window.hljs || !code) return;
    registrarHcl(window.hljs);
    const lang = { pyspark: 'python', airflow: 'python', dbt: 'sql', jinja: 'sql', shell: 'bash', powershell: 'powershell', toml: 'ini' }[pre.dataset.lang] || pre.dataset.lang;
    if (!window.hljs.getLanguage(lang)) return;
    code.innerHTML = window.hljs.highlight(code.textContent, { language: lang, ignoreIllegals: true }).value;
  }
  function turnIntoRunner(box, lang, code) {
    const runner = h('<div class="inline-runner"></div>');
    box.replaceWith(runner);
    const ed = createEditor(runner, { lang, value: code, onRun: () => run() });
    const bar = h('<div class="runner-bar"><button class="btn btn-primary btn-sm" data-run>▶ Ejecutar <span class="kbd">Ctrl+↵</span></button><button class="btn btn-ghost btn-sm" data-reset>↺ Original</button></div>');
    const out = h('<div class="output"></div>');
    runner.append(bar, out);
    $('[data-run]', bar).addEventListener('click', () => run());
    $('[data-reset]', bar).addEventListener('click', () => ed.setValue(code));
    async function run() {
      const src = ed.getValue();
      if (lang === 'sql') {
        if (!(await ensureSql(out))) return;
        renderSqlOutput(out, SQL.exec(src, SQL.playground()));
      } else if (lang === 'dbt') {
        if (!(await ensureSql(out))) return;
        loadingInto(out, pyLoadingMsg());
        const r = await DBT.run({}, src);
        renderSqlOutput(out, r);
        if (r.compiled) out.append(compiledBlock(r.compiled));
      } else {
        loadingInto(out, pyLoadingMsg());
        renderConsole(out, await PY.run(pyMode(src, lang === 'pyspark' ? 'pyspark' : 'python'), src));
      }
    }
    run();
  }
  function scriptLines(code) {
    const out = [];
    let cur = '';
    for (const raw of code.split('\n')) {
      const l = raw.replace(/\s+#\s.*$/, '');
      if (!cur && (/^\s*#/.test(l) || !l.trim())) continue;
      if (/\\\s*$/.test(l)) { cur += l.replace(/\\\s*$/, ' '); continue; }
      out.push((cur + l).trim()); cur = '';
    }
    if (cur.trim()) out.push(cur.trim());
    // un for, while, if o heredoc de varias líneas se ejecuta como una sola unidad, como en bash
    if (!window.Shell || !window.Shell.faltaCerrar) return out;
    const unidas = []; let acc = null;
    for (const l of out) {
      acc = acc === null ? l : acc + '\n' + l;
      if (!window.Shell.faltaCerrar(acc)) { unidas.push(acc); acc = null; }
    }
    if (acc !== null) unidas.push(acc);
    return unidas;
  }
  function archivoDeBloque(lang, code) {
    if (!/^(yaml|yml|python|hcl|terraform|sql|dbt|bicep|dockerfile|toml|ini|sh|json|csv|text)$/.test(lang)) return null;
    const m = code.split('\n')[0].match(/^\s*(?:#|\/\/|--)\s*((?:[\w.~-]+\/)*[\w.-]+\.(?:ya?ml|py|sql|tf|tftest\.hcl|hcl|bicep|json|toml|cfg|txt|csv|sh|md)|(?:[\w.-]+\/)*(?:Dockerfile|Makefile|\.env|\.gitignore))\b/);
    return m ? m[1] : null;
  }
  function crearArchivoDeBloque(arch, code) {
    const Sh = window.Shell; if (!Sh.Machine.ready) Sh.Machine.load();
    const cwd = Sh.Machine.cwd;
    const sugerido = arch.startsWith('~') || arch.startsWith('/') ? arch : (cwd === Sh.HOME ? '~' : Sh.display(cwd)) + '/' + arch;
    const destino = prompt(`¿Dónde creo el archivo?\nPor defecto va en la carpeta donde está parada la terminal (${Sh.display(cwd)}). Puedes cambiar la ruta.`, sugerido);
    if (!destino) return;
    const p = Sh.norm(destino.trim());
    if (Sh.exists(p) && !confirm(`${Sh.display(p)} ya existe. ¿Lo reemplazo?`)) return;
    const carpeta = p.slice(0, p.lastIndexOf('/'));
    if (carpeta) Sh.mkdirp(carpeta);
    Sh.writeFile(p, code.replace(/\n?$/, '\n')); Sh.Machine.save();
    toast(`💾 Creado ${Sh.display(p)}`);
    Dock.open(); if (Dock.term && Dock.term.print) Dock.term.print(Sh.col.dim(`# archivo creado: ${Sh.display(p)} (${code.split('\n').length} líneas). Míralo con: cat ${Sh.display(p)}`));
  }
  function termRunnable(code) {
    if (!window.Shell) return false;
    const ls = scriptLines(code);
    return ls.length > 0 && ls.length <= 12 && ls.every((l) => { const w = l.replace(/^\$\s*/, '').split(/\s+/)[0]; return /^\w+=/.test(w) || /^(for|while|until|if|case|function)$/.test(w) || /^\w+\(\)/.test(w) || !!window.Shell.Commands[w]; });
  }

  // ---------------------------------------------------------------- terminal acoplada (abajo)
  const Dock = {
    term: null,
    el: null,
    open() {
      if (!this.el) {
        this.el = h('<div class="term-dock" id="termDock"><div class="dock-head"><b>⌨ Terminal</b><span class="small muted">misma máquina que el laboratorio</span><span class="spacer"></span><a class="btn btn-ghost btn-sm" href="#/lab/terminal">Abrir laboratorio</a><button class="btn btn-ghost btn-sm" data-close>✕</button></div><div class="dock-body"></div></div>');
        document.body.appendChild(this.el);
        $('[data-close]', this.el).addEventListener('click', () => this.close());
        this.term = window.Shell.createTerminal($('.dock-body', this.el), { compact: true });
      }
      this.el.hidden = false; document.body.classList.add('dock-open');
      setTimeout(() => this.term.focus(), 50);
    },
    close() { if (this.el) this.el.hidden = true; document.body.classList.remove('dock-open'); },
    toggle() { if (this.el && !this.el.hidden) this.close(); else this.open(); },
    async runScript(code) {
      this.open();
      for (const l of scriptLines(code)) await this.term.run(l.replace(/^\$\s*/, ''));
    },
  };

  function openFileEditor(path, content, save) {
    const box = h(`<div><div class="row" style="margin-bottom:10px"><b style="font-family:var(--mono)">${esc(window.Shell.display(path))}</b><span class="spacer"></span><button class="btn btn-primary btn-sm" data-save>💾 Guardar <span class="kbd">Ctrl+S</span></button></div><div class="file-ed"></div></div>`);
    openModal(box);
    const ext = path.split('.').pop();
    const lang = { py: 'python', sql: 'sql', yml: 'yaml', yaml: 'yaml', sh: 'bash', json: 'json' }[ext] || 'text';
    const ed = createEditor($('.file-ed', box), { lang, value: content, tall: true });
    const doSave = () => { save(ed.getValue()); toast('Guardado ' + window.Shell.display(path)); };
    $('[data-save]', box).addEventListener('click', () => { doSave(); closeModal(); });
    box.addEventListener('keydown', (e) => { if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doSave(); } });
    setTimeout(() => ed.focus(), 100);
  }
  if (window.Shell) window.Shell.openEditor = openFileEditor;

  // ---------------------------------------------------------------- "code ." : un VS Code dentro de la página
  // Explorador de la carpeta, pestañas, el editor Monaco (el mismo de VS Code), barra de estado con la rama
  // de Git y una terminal integrada abajo, todo sobre el mismo disco de la terminal del curso.
  const LANG_EXT = { py: 'python', sql: 'sql', yml: 'yaml', yaml: 'yaml', sh: 'bash', json: 'json', md: 'text', toml: 'text', txt: 'text', csv: 'text', tf: 'text', cfg: 'text', ini: 'text' };
  const ICONO_EXT = { py: '🐍', sql: '🗄️', yml: '⚙️', yaml: '⚙️', md: 'Ⓜ', json: '{}', csv: '📊', sh: '$_', toml: '⚙️', tf: '🏗️', txt: '📄', log: '📜', parquet: '📦', ipynb: '📓', gitignore: '◆', bashrc: '$_', env: '🔑' };
  const OCULTAS = /(^|\/)(\.git|\.venv|node_modules|__pycache__|target|\.pytest_cache)(\/|$)/;
  // ---------------------------------------------------------------- ajustes de "code" (settings.json real)
  // Como VS Code: los ajustes viven en ~/.config/Code/User/settings.json. La pantalla de Configuración
  // escribe en ese archivo, y si lo editas a mano y guardas, se aplica.
  const VS_TEMAS = {
    'Dark Modern': { base: 'vs-dark', w: { bg: '#1f1f1f', side: '#181818', act: '#181818', title: '#181818', tabbar: '#181818', tab: '#181818', tabon: '#1f1f1f', text: '#cccccc', dim: '#9d9d9d', status: '#181818', stext: '#cccccc', border: '#2b2b2b', hover: '#2a2d2e', sel: '#37373d', accent: '#0078d4', input: '#313131' }, e: { bg: '#1f1f1f', kw: 'c586c0', str: 'ce9178', com: '6a9955', num: 'b5cea8', fn: 'dcdcaa' } },
    'Dark+ (clásico)': { base: 'vs-dark', w: { bg: '#1e1e1e', side: '#252526', act: '#333333', title: '#323233', tabbar: '#252526', tab: '#2d2d2d', tabon: '#1e1e1e', text: '#cccccc', dim: '#969696', status: '#007acc', stext: '#ffffff', border: '#2b2b2b', hover: '#2a2d2e', sel: '#37373d', accent: '#007acc', input: '#3c3c3c' }, e: { bg: '#1e1e1e', kw: '569cd6', str: 'ce9178', com: '6a9955', num: 'b5cea8', fn: 'dcdcaa' } },
    'Light Modern': { base: 'vs', w: { bg: '#ffffff', side: '#f8f8f8', act: '#f8f8f8', title: '#f8f8f8', tabbar: '#f8f8f8', tab: '#f8f8f8', tabon: '#ffffff', text: '#3b3b3b', dim: '#6e6e6e', status: '#f8f8f8', stext: '#3b3b3b', border: '#e5e5e5', hover: '#f2f2f2', sel: '#e4e6f1', accent: '#005fb8', input: '#ffffff' }, e: { bg: '#ffffff', kw: 'af00db', str: 'a31515', com: '008000', num: '098658', fn: '795e26' } },
    Monokai: { base: 'vs-dark', w: { bg: '#272822', side: '#1e1f1c', act: '#272822', title: '#1e1f1c', tabbar: '#1e1f1c', tab: '#34352f', tabon: '#272822', text: '#f8f8f2', dim: '#a59f85', status: '#414339', stext: '#ffffff', border: '#1e1f1c', hover: '#3e3d32', sel: '#414339', accent: '#f92672', input: '#414339' }, e: { bg: '#272822', kw: 'f92672', str: 'e6db74', com: '88846f', num: 'ae81ff', fn: 'a6e22e' } },
    Dracula: { base: 'vs-dark', w: { bg: '#282a36', side: '#21222c', act: '#343746', title: '#21222c', tabbar: '#191a21', tab: '#21222c', tabon: '#282a36', text: '#f8f8f2', dim: '#6272a4', status: '#191a21', stext: '#f8f8f2', border: '#191a21', hover: '#44475a', sel: '#44475a', accent: '#bd93f9', input: '#21222c' }, e: { bg: '#282a36', kw: 'ff79c6', str: 'f1fa8c', com: '6272a4', num: 'bd93f9', fn: '50fa7b' } },
    'GitHub Dark': { base: 'vs-dark', w: { bg: '#0d1117', side: '#010409', act: '#0d1117', title: '#010409', tabbar: '#010409', tab: '#010409', tabon: '#0d1117', text: '#e6edf3', dim: '#7d8590', status: '#0d1117', stext: '#7d8590', border: '#30363d', hover: '#161b22', sel: '#1f6feb33', accent: '#f78166', input: '#0d1117' }, e: { bg: '#0d1117', kw: 'ff7b72', str: 'a5d6ff', com: '8b949e', num: '79c0ff', fn: 'd2a8ff' } },
    'One Dark Pro': { base: 'vs-dark', w: { bg: '#282c34', side: '#21252b', act: '#282c34', title: '#21252b', tabbar: '#21252b', tab: '#21252b', tabon: '#282c34', text: '#abb2bf', dim: '#7f848e', status: '#21252b', stext: '#9da5b4', border: '#181a1f', hover: '#2c313a', sel: '#2c313a', accent: '#528bff', input: '#1d1f23' }, e: { bg: '#282c34', kw: 'c678dd', str: '98c379', com: '7f848e', num: 'd19a66', fn: '61afef' } },
    'Solarized Light': { base: 'vs', w: { bg: '#fdf6e3', side: '#eee8d5', act: '#ddd6c1', title: '#eee8d5', tabbar: '#d9d2c2', tab: '#d3cbb7', tabon: '#fdf6e3', text: '#586e75', dim: '#93a1a1', status: '#eee8d5', stext: '#586e75', border: '#ddd6c1', hover: '#dfca8844', sel: '#dfca88', accent: '#b58900', input: '#ddd6c1' }, e: { bg: '#fdf6e3', kw: '859900', str: '2aa198', com: '93a1a1', num: 'd33682', fn: '268bd2' } },
  };
  const VS_DEF = {
    'workbench.colorTheme': 'Dark Modern', 'workbench.iconTheme': 'vs-seti', 'editor.fontSize': 14, 'editor.fontFamily': "'JetBrains Mono', Consolas, monospace",
    'editor.tabSize': 4, 'editor.wordWrap': 'off', 'editor.minimap.enabled': true, 'editor.lineNumbers': 'on', 'editor.cursorStyle': 'line',
    'editor.cursorBlinking': 'blink', 'editor.renderWhitespace': 'selection', 'editor.fontLigatures': false, 'editor.stickyScroll.enabled': true,
    'files.autoSave': 'off', 'terminal.integrated.fontSize': 13, 'extensiones': ['ms-python.python'],
  };
  const VS_RUTA = () => window.Shell.HOME + '/.config/Code/User/settings.json';
  function vsAjustes() {
    const Sh = window.Shell; let x = {};
    try { x = JSON.parse((Sh.readFile(VS_RUTA()) || '{}').replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1')); } catch (e) { x = { __error: e.message }; }
    return Object.assign({}, VS_DEF, x);
  }
  function vsGuardarAjustes(a) {
    const Sh = window.Shell, limpio = {};
    for (const [k, v] of Object.entries(a)) if (k !== '__error' && JSON.stringify(v) !== JSON.stringify(VS_DEF[k])) limpio[k] = v;
    Sh.mkdirp(VS_RUTA().slice(0, VS_RUTA().lastIndexOf('/')));
    Sh.writeFile(VS_RUTA(), JSON.stringify(limpio, null, 4) + '\n'); Sh.Machine.save();
  }
  // temas oficiales de VS Code (vscode-real.js) primero, después los del curso que no existen en el repo
  const temasDisponibles = () => { const R = (window.VSReal || {}).TEMAS || {}; return [...Object.keys(R), ...Object.keys(VS_TEMAS).filter((k) => !R[k] && k !== 'Dark+ (clásico)')]; };
  let vsTemasListos = false;
  function vsDefinirTemas() {
    if (vsTemasListos || !window.monaco) return;
    for (const [n, t] of Object.entries(VS_TEMAS)) {
      window.monaco.editor.defineTheme('vs-' + n.replace(/\W+/g, '-'), { base: t.base, inherit: true,
        rules: [{ token: 'keyword', foreground: t.e.kw }, { token: 'string', foreground: t.e.str }, { token: 'comment', foreground: t.e.com, fontStyle: 'italic' }, { token: 'number', foreground: t.e.num }, { token: 'type', foreground: t.e.fn }, { token: 'identifier', foreground: t.base === 'vs' ? '001080' : t.w.text.slice(1) }],
        colors: { 'editor.background': t.e.bg, 'editor.lineHighlightBackground': t.w.hover, 'editorLineNumber.foreground': t.w.dim, 'editorGutter.background': t.e.bg, 'minimap.background': t.e.bg } });
    }
    vsTemasListos = true;
  }
  const VS_EXT = [
    ['ms-python.python', 'Python', 'Microsoft', 'IntelliSense, ejecutar y depurar Python. Aquí: el botón ▷ y F5 para .py.', '🐍'],
    ['ms-python.vscode-pylance', 'Pylance', 'Microsoft', 'Autocompletado y chequeo de tipos rápido para Python.', '⚡'],
    ['innoverio.vscode-dbt-power-user', 'dbt Power User', 'AltimateAI', 'Ejecutar modelos, ver el linaje y el SQL compilado de dbt. Aquí: ▷ en un modelo corre dbt run --select.', '🔧'],
    ['eamodio.gitlens', 'GitLens', 'GitKraken', 'Quién cambió cada línea y cuándo. Aquí: muestra el último commit del archivo en la barra de estado.', '🔍'],
    ['pkief.material-icon-theme', 'Material Icon Theme', 'Philipp Kief', 'Íconos de archivos y carpetas al estilo Material. Aquí: cambia los íconos del explorador.', '🎨'],
    ['mechatroner.rainbow-csv', 'Rainbow CSV', 'mechatroner', 'Colorea cada columna de los CSV para leerlos sin abrir Excel.', '🌈'],
    ['ms-azuretools.vscode-docker', 'Docker', 'Microsoft', 'Ver contenedores e imágenes, y ayuda para Dockerfile y Compose.', '🐳'],
    ['hashicorp.terraform', 'HashiCorp Terraform', 'HashiCorp', 'Resaltado, autocompletado y formato de archivos .tf.', '🏗️'],
    ['redhat.vscode-yaml', 'YAML', 'Red Hat', 'Validación de YAML (dbt, GitHub Actions, Compose).', '📄'],
    ['ms-toolsai.jupyter', 'Jupyter', 'Microsoft', 'Notebooks .ipynb dentro del editor.', '📓'],
  ];
  const MATERIAL = { py: '🟦', sql: '🟪', yml: '🟥', yaml: '🟥', md: '🟦', json: '🟨', csv: '🟩', sh: '🟫', toml: '⬛', txt: '⬜', log: '⬜' };

  // Diagnóstico de Python con el intérprete real (Pyodide), solo si ya está cargado (no descarga nada al
  // escribir): errores de sintaxis de ast.parse, nombres sin definir e imports sin usar, como Pylance/pyflakes.
  const diagCache = new Map();
  const PY_DIAG = `import ast, json, builtins
out = []
try:
    t = ast.parse(SRC)
except SyntaxError as e:
    out.append([e.lineno or 1, e.offset or 1, 'error', e.msg, 'SyntaxError'])
else:
    defs = set(dir(builtins)) | {'__name__', '__file__', 'spark', 'dbutils', 'display', 'displayHTML', 'sc', 'sqlContext'}
    imports = {}
    star = False
    for n in ast.walk(t):
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)): defs.add(n.name)
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            a = n.args
            for x in a.args + a.kwonlyargs + list(getattr(a, 'posonlyargs', [])): defs.add(x.arg)
            if a.vararg: defs.add(a.vararg.arg)
            if a.kwarg: defs.add(a.kwarg.arg)
        if isinstance(n, ast.Name) and isinstance(n.ctx, (ast.Store, ast.Del)): defs.add(n.id)
        if isinstance(n, (ast.Import, ast.ImportFrom)):
            for al in n.names:
                if al.name == '*': star = True; continue
                nm = (al.asname or al.name).split('.')[0]
                defs.add(nm); imports.setdefault(nm, (n.lineno, n.col_offset))
        if isinstance(n, ast.ExceptHandler) and n.name: defs.add(n.name)
        if isinstance(n, (ast.Global, ast.Nonlocal)): defs.update(n.names)
        if getattr(ast, 'MatchAs', None) and isinstance(n, ast.MatchAs) and n.name: defs.add(n.name)
    usados = set()
    for n in ast.walk(t):
        if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load):
            usados.add(n.id)
            if n.id not in defs and not star: out.append([n.lineno, n.col_offset + 1, 'error', '"%s" is not defined' % n.id, 'Pylance(reportUndefinedVariable)'])
    if '__all__' not in defs:
        for nm, (l, c) in imports.items():
            if nm not in usados: out.append([l, c + 1, 'warning', 'Import "%s" is not accessed' % nm, 'Pylance(reportUnusedImport)'])
print(json.dumps(out))`;
  async function diagPython(src) {
    const PY = window.Engines && window.Engines.PY;
    if (!PY || PY.status !== 'ready') return null;
    if (diagCache.has(src)) return diagCache.get(src);
    try {
      const r = await PY.run('python', `SRC = ${JSON.stringify(src)}\n${PY_DIAG}`);
      const linea = String(r.stdout || '').trim().split('\n').pop();
      const res = JSON.parse(linea).map(([l, c, sev, msg, fuente]) => ({ linea: l, col: c, sev, msg, fuente }));
      diagCache.set(src, res); if (diagCache.size > 50) diagCache.delete(diagCache.keys().next().value);
      return res;
    } catch (e) { return null; }
  }

  // Depurador de Python de VS Code: el programa corre una vez en Pyodide con sys.settrace y se guarda cada
  // paso (línea, pila de llamadas, variables locales y globales, salida). Los botones Continuar, Paso a paso
  // por procedimientos, por instrucciones y Salir recorren esa grabación como lo haría debugpy.
  const PY_TRAZA = `import sys, json, io, contextlib, traceback, types
pasos = []
salida = io.StringIO()
MAX = 2500
def rep(v):
    try:
        r = repr(v)
    except Exception:
        r = '<sin repr>'
    return r if len(r) < 160 else r[:157] + '...'
def snap(d, glob):
    out = {}
    for k, v in list(d.items())[:60]:
        if k.startswith('__'): continue
        if glob and (isinstance(v, types.ModuleType) or isinstance(v, type) or callable(v)): continue
        out[k] = [rep(v), type(v).__name__, len(v) if isinstance(v, (list, dict, tuple, set, str)) else None]
    return out
class _Limite(Exception): pass
def tracer(frame, event, arg):
    if frame.f_code.co_filename != '<app>':
        return None
    if len(pasos) >= MAX:
        raise _Limite('Se alcanzó el límite de pasos de la depuración')
    if event in ('line', 'exception', 'return', 'call'):
        pila = []
        f = frame
        while f is not None and f.f_code.co_filename == '<app>':
            pila.append([f.f_code.co_name, f.f_lineno])
            f = f.f_back
        exc = None
        if event == 'exception':
            exc = arg[0].__name__ + ': ' + str(arg[1])
        pasos.append({'l': frame.f_lineno, 'e': event, 'pila': pila,
                      'loc': snap(frame.f_locals, False) if frame.f_code.co_name != '<module>' else {},
                      'glob': snap(frame.f_globals, True), 'out': len(salida.getvalue()), 'exc': exc,
                      'ret': rep(arg) if event == 'return' else None})
    return tracer
error = None
try:
    codigo = compile(SRC, '<app>', 'exec')
except SyntaxError as e:
    error = 'SyntaxError: ' + str(e.msg) + ' (línea ' + str(e.lineno) + ')'
    codigo = None
if codigo is not None:
    g = {'__name__': '__main__'}
    with contextlib.redirect_stdout(salida):
        sys.settrace(tracer)
        try:
            exec(codigo, g)
        except _Limite as e:
            error = str(e)
        except Exception as e:
            error = ''.join(traceback.format_exception_only(type(e), e)).strip()
        finally:
            sys.settrace(None)
print('\\u0001TRAZA' + json.dumps({'pasos': pasos, 'salida': salida.getvalue(), 'error': error}))`;
  async function trazarPython(src) {
    const PY = window.Engines && window.Engines.PY; if (!PY) throw new Error('Python no está disponible.');
    const r = await PY.run('python', `SRC = ${JSON.stringify(src)}\n${PY_TRAZA}`);
    const txt = String(r.stdout || ''); const i = txt.lastIndexOf('\u0001TRAZA');
    if (i < 0) throw new Error(r.error || 'No se pudo depurar el programa.');
    return JSON.parse(txt.slice(i + 6));
  }

  function abrirCode(raiz, archivo) {
    const Sh = window.Shell;
    if (document.getElementById('vscode')) document.getElementById('vscode').remove();
    const nombreRaiz = raiz === Sh.HOME ? '~' : raiz.split('/').pop();
    const abiertos = [], sucios = new Map();
    let actual = null, ed = null, term = null, vistaLat = 'explorador', lateralOculto = false;
    const abiertas = new Set();
    const BIENVENIDA = '\u0000bienvenida', AJUSTES = '\u0000ajustes', DIFF = '\u0000diff:';
    const esArchivo = (k) => !!k && !String(k).startsWith('\u0000');
    let temaReal = null, problemas = [], diagT = null, tlAbierto = true, diffOrig = null, dbg = null, bpDecos = [], dbgDecos = [], vigilar = [], bpTimer = null, ptab = 'terminal', esqAbierto = true, dividido = false, ed2 = null, diffEd = null, diffModelos = null, zenOn = false, acorde = 0, escPrev = 0;
    const terms = []; let tActiva = 0; const salida = [];
    let AJ = vsAjustes(), autoGuardado = null;
    const icono = (nombre) => {
      const it = AJ['workbench.iconTheme'];
      if (it === 'ninguno') return '';
      if (it === 'vs-seti' && window.VSReal) { const x = window.VSReal.iconoSeti(nombre, typeof box !== 'undefined' && box.classList.contains('vs-claro')); if (x) return x; }
      if (it === 'vs-minimal') return '<i class="codicon codicon-file" aria-hidden="true"></i>';
      const e = nombre.includes('.') ? nombre.split('.').pop() : nombre.replace(/^\./, '');
      return it === 'material' ? (MATERIAL[e] || '▫️') : (ICONO_EXT[e] || '📄');
    };
    const CLAVES_TEMA = ['bg', 'side', 'act', 'title', 'tabbar', 'tab', 'tabon', 'text', 'dim', 'status', 'stext', 'border', 'hover', 'sel', 'accent', 'input', 'actfg', 'actdim', 'actborde', 'tabfg', 'tabdim', 'tabtop', 'titlefg', 'sidefg', 'panel', 'term', 'termfg', 'boton', 'botonfg', 'badge', 'gitM', 'gitU', 'gitD', 'gitC'];
    function ponerTemaMonaco() {
      if (!window.monaco) return;
      if (temaReal) { const id = 'vsr-' + temaReal.nombre.replace(/\W+/g, '-'); window.monaco.editor.defineTheme(id, temaReal.monaco); window.monaco.editor.setTheme(id); return; }
      vsDefinirTemas(); const n = AJ['workbench.colorTheme']; window.monaco.editor.setTheme('vs-' + (VS_TEMAS[n] ? n : n === 'Dark+' ? 'Dark+ (clásico)' : 'Dark Modern').replace(/\W+/g, '-'));
    }
    function aplicar() {
      AJ = vsAjustes();
      let nom = AJ['workbench.colorTheme']; if (nom === 'Dark+ (clásico)') nom = 'Dark+';
      const t = VS_TEMAS[nom] || VS_TEMAS[nom === 'Dark+' ? 'Dark+ (clásico)' : ''] || (/light|quiet|solarized light/i.test(nom) ? VS_TEMAS['Light Modern'] : VS_TEMAS['Dark Modern']);
      if (!temaReal || temaReal.nombre !== nom) { temaReal = null; for (const k of CLAVES_TEMA) box.style.removeProperty('--vs-' + k); for (const [k, v] of Object.entries(t.w)) box.style.setProperty('--vs-' + k, v); box.classList.toggle('vs-claro', t.base === 'vs'); box.classList.remove('vs-hc'); }
      if (window.VSReal && window.VSReal.TEMAS[nom] && (!temaReal || temaReal.nombre !== nom)) window.VSReal.cargarTema(nom).then((r) => {
        if (!box.isConnected || !r) return; let ahora = vsAjustes()['workbench.colorTheme']; if (ahora === 'Dark+ (clásico)') ahora = 'Dark+'; if (ahora !== nom) return;
        temaReal = r; for (const k of CLAVES_TEMA) box.style.removeProperty('--vs-' + k); for (const [k, v] of Object.entries(r.w)) box.style.setProperty('--vs-' + k, v);
        box.classList.toggle('vs-claro', r.base === 'vs'); box.classList.toggle('vs-hc', r.base === 'hc-black'); ponerTemaMonaco(); pintarLateral(); pintarTabs();
      }).catch(() => {});
      if (AJ['workbench.iconTheme'] === 'vs-seti' && window.VSReal && !window.VSReal.setiListo()) window.VSReal.cargarSeti().then(() => { if (box.isConnected) { pintarLateral(); pintarTabs(); } }).catch(() => {});
      box.style.setProperty('--vs-term-font', AJ['terminal.integrated.fontSize'] + 'px');
      ponerTemaMonaco();
      if (ed && ed.monaco) ed.monaco.updateOptions(opcionesEditor());
      if (ed && ed.cm) { ed.cm.getWrapperElement().style.fontSize = AJ['editor.fontSize'] + 'px'; ed.cm.refresh(); }
      if (AJ.__error) toast('settings.json tiene un error de JSON: ' + AJ.__error);
    }
    const opcionesEditor = () => ({ fontSize: Number(AJ['editor.fontSize']) || 14, fontFamily: AJ['editor.fontFamily'], tabSize: Number(AJ['editor.tabSize']) || 4, wordWrap: AJ['editor.wordWrap'], minimap: { enabled: !!AJ['editor.minimap.enabled'], renderCharacters: false }, lineNumbers: AJ['editor.lineNumbers'], cursorStyle: AJ['editor.cursorStyle'], cursorBlinking: AJ['editor.cursorBlinking'], renderWhitespace: AJ['editor.renderWhitespace'], fontLigatures: !!AJ['editor.fontLigatures'], stickyScroll: { enabled: !!AJ['editor.stickyScroll.enabled'] } });
    const extOn = (id) => (AJ.extensiones || []).includes(id);
    const ci = (n) => `<i class="codicon codicon-${n}" aria-hidden="true"></i>`;
    const box = h(`<div class="vscode" id="vscode" role="dialog" aria-label="Editor de código">
      <div class="vs-titulo"><span class="vs-logo">${ci('vscode')}</span><div class="vs-menu"><span>Archivo</span><span>Editar</span><span>Ver</span><span data-run-menu>Ejecutar</span><span data-term-menu>Terminal</span></div><button class="vs-buscar-tit" data-quick>${ci('search')} ${esc(nombreRaiz)}</button><span class="spacer"></span><span class="vs-layout"><button data-toggle-lat title="Alternar barra lateral principal (Ctrl+B)">${ci('layout-sidebar-left')}</button><button data-toggle-term title="Alternar panel (Ctrl+J)">${ci('layout-panel')}</button><button title="Barra lateral secundaria">${ci('layout-sidebar-right')}</button></span><span class="vs-ventana"><span>${ci('chrome-minimize')}</span><span>${ci('chrome-maximize')}</span><button class="vs-x" data-cerrar title="Cerrar (vuelve a la terminal)">${ci('chrome-close')}</button></span></div>
      <div class="vs-cuerpo">
        <nav class="vs-actividad"><button data-vista="explorador" title="Explorador (Ctrl+Shift+E)">${ci('files')}</button><button data-vista="buscar" title="Buscar (Ctrl+Shift+F)">${ci('search')}</button><button data-vista="git" title="Control de código fuente (Ctrl+Shift+G)">${ci('source-control')}<b class="vs-badge" hidden></b></button><button data-vista="ejecutar" title="Ejecutar y depurar (Ctrl+Shift+D)">${ci('debug-alt')}</button><button data-vista="ext" title="Extensiones (Ctrl+Shift+X)">${ci('extensions')}</button><span class="spacer"></span><button title="Cuentas">${ci('account')}</button><button data-ajustes title="Administrar: Configuración (Ctrl+,)">${ci('settings-gear')}</button></nav>
        <aside class="vs-lateral"></aside>
        <section class="vs-centro"><div class="vs-tabs"></div><div class="vs-migas"></div><div class="vs-editor"></div><div class="vs-panel" hidden><div class="vs-panel-cab"><span class="vs-ptab" data-ptab="problemas">PROBLEMAS <b class="vs-ptab-n" data-prob-n hidden></b></span><span class="vs-ptab" data-ptab="salida">SALIDA</span><span class="vs-ptab" data-ptab="depuracion">CONSOLA DE DEPURACIÓN</span><span class="vs-ptab on" data-ptab="terminal">TERMINAL</span><span class="spacer"></span><span class="vs-term-lista"></span><button data-term-nuevo title="Nueva terminal (Ctrl+Shift+ñ)">${ci('add')}</button><button data-term-borrar title="Eliminar la terminal">${ci('trash')}</button><button data-panel-max title="Maximizar el tamaño del panel">${ci('chevron-up')}</button><button data-panel-x title="Ocultar el panel">${ci('close')}</button></div><div class="vs-panel-cuerpo"></div><div class="vs-panel-prob" hidden></div><div class="vs-panel-salida" hidden></div><div class="vs-panel-dbg" hidden></div></div></section>
      </div>
      <div class="vs-estado"><span data-rama></span><span class="vs-remoto">${ci('remote')}</span><span data-errores>${ci('error')} 0 ${ci('warning')} 0</span><span class="spacer"></span><span data-pos></span><span data-esp></span><span>UTF-8</span><span>LF</span><span data-lang></span><span data-py></span><span data-gitlens></span><button data-toggle-term title="Terminal (Ctrl+\`)">${ci('terminal')}</button><span>${ci('bell')}</span></div>
    </div>`);
    document.body.appendChild(box); document.body.classList.add('vscode-abierto');
    const latEl = $('.vs-lateral', box), tabsEl = $('.vs-tabs', box), edEl = $('.vs-editor', box), migasEl = $('.vs-migas', box);
    const rel = (p) => p.slice(raiz.length + 1);
    const ext = (p) => (p.includes('.') ? p.split('.').pop() : '');
    const repoDe = () => { for (let p = raiz; p; p = p === '/' ? '' : (p.slice(0, p.lastIndexOf('/')) || '/')) if (Sh.Machine.git[p]) return p; return null; };
    const dbtRaiz = (p) => { for (let d = p.slice(0, p.lastIndexOf('/')); d && d.length >= Sh.HOME.length; d = d.slice(0, d.lastIndexOf('/'))) if (Sh.exists(d + '/dbt_project.yml')) return d; return null; };
    const archivos = () => Object.keys(Sh.Machine.fs).filter((k) => k.startsWith(raiz + '/') && !OCULTAS.test(rel(k)) && !Sh.isDir(k)).sort();

    // ¿con qué se ejecuta este archivo? (lo mismo que haría la extensión de VS Code)
    function comandoPara(k) {
      const e = ext(k), r = Sh.display(k);
      const dbt = e === 'sql' ? dbtRaiz(k) : null;
      if (dbt && k.includes('/models/')) return { cmd: `cd ${Sh.display(dbt)} && dbt run --select ${k.split('/').pop().replace(/\.sql$/, '')}`, titulo: 'Ejecutar el modelo de dbt' };
      if (e === 'py') {
        // un DAG de Airflow: "ejecutarlo" con python solo comprueba que se importa; lo útil es correr sus tareas
        const txt = Sh.readFile(k) || '';
        const id = (/dag_id\s*=\s*["']([\w.-]+)["']/.exec(txt) || /\bDAG\(\s*["']([\w.-]+)["']/.exec(txt) || [])[1] || (/@dag\b/.test(txt) ? (/@dag[\s\S]*?\ndef\s+(\w+)/.exec(txt) || [])[1] : null);
        if (id && /\/dags\//.test(k)) return { cmd: `airflow dags test ${id} 2024-01-01`, titulo: `Probar el DAG ${id} (airflow dags test)` };
        return { cmd: `python ${r}`, titulo: 'Ejecutar archivo de Python' };
      }
      if (e === 'sh') return { cmd: `bash ${r}`, titulo: 'Ejecutar script de bash' };
      if (e === 'sql') return { cmd: `sqlite3 tienda.db < ${r}`, titulo: 'Ejecutar consulta (SQLite del curso)' };
      return null;
    }
    // ---------------------------------------------------------------- barra lateral
    function pintarLateral() {
      $$('[data-vista]', box).forEach((b) => b.classList.toggle('on', b.dataset.vista === vistaLat && !lateralOculto));
      latEl.hidden = lateralOculto;
      if (vistaLat === 'explorador') return pintarArbol();
      if (vistaLat === 'buscar') { latEl.innerHTML = `<div class="vs-lat-cab"><span>BUSCAR</span></div><div class="vs-busq"><input data-q placeholder="Buscar en los archivos" value="${esc(latEl.dataset.q || '')}"><div class="vs-res"></div></div>`; const inp = $('[data-q]', latEl); inp.addEventListener('input', () => { latEl.dataset.q = inp.value; buscarEnArchivos(inp.value); }); buscarEnArchivos(inp.value); setTimeout(() => inp.focus(), 20); return; }
      if (vistaLat === 'git') return pintarGit();
      if (vistaLat === 'ext') {
        latEl.innerHTML = `<div class="vs-lat-cab"><span>EXTENSIONES</span></div><div class="vs-lat-sub">INSTALADAS</div>${VS_EXT.filter((x) => extOn(x[0])).map(extHtml).join('') || '<p class="small" style="opacity:.7;padding:0 14px">Ninguna</p>'}<div class="vs-lat-sub">RECOMENDADAS PARA DATOS</div>${VS_EXT.filter((x) => !extOn(x[0])).map(extHtml).join('')}`;
        return;
      }
      return pintarDepurar();
    }
    const extHtml = ([id, n, autor, desc, ic]) => `<div class="vs-ext"><span class="vs-ext-ic">${ic}</span><div class="vs-ext-txt"><b>${esc(n)}</b><small>${esc(desc)}</small><span class="vs-ext-autor">${esc(autor)}</span></div><button class="vs-ext-btn ${extOn(id) ? 'on' : ''}" data-ext="${esc(id)}">${extOn(id) ? 'Desinstalar' : 'Instalar'}</button></div>`;
    function pintarAjustes() {
      const sel = (k, ops) => `<select data-aj="${k}">${ops.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option ${String(AJ[k]) === String(v) ? 'selected' : ''} value="${esc(v)}">${esc(l)}</option>`; }).join('')}</select>`;
      const fila = (k, titulo, desc, control) => `<div class="vs-aj"><div class="vs-aj-k">${esc(titulo)} <span>${esc(k)}</span></div><div class="vs-aj-d">${esc(desc)}</div>${control}</div>`;
      const num = (k, min, max) => `<input type="number" data-aj="${k}" min="${min}" max="${max}" value="${esc(AJ[k])}">`;
      const chk = (k) => `<label class="vs-aj-chk"><input type="checkbox" data-aj="${k}" ${AJ[k] ? 'checked' : ''}> Activado</label>`;
      edEl.innerHTML = `<div class="vs-ajustes"><div class="vs-aj-cab"><input class="vs-aj-buscar" placeholder="Buscar configuración" data-aj-buscar><button class="vs-btn-link" data-abrir-json>{ } Abrir settings.json</button></div><div class="vs-aj-tabs"><span class="on">Usuario</span></div>
        <h2>Apariencia</h2>${fila('workbench.colorTheme', 'Tema de color', 'Los colores del editor y de toda la ventana.', sel('workbench.colorTheme', temasDisponibles()))}${fila('workbench.iconTheme', 'Tema de íconos de archivos', 'Los íconos del explorador y de las pestañas.', sel('workbench.iconTheme', [['vs-seti', 'Seti (Visual Studio Code)'], ['vs-minimal', 'Minimal (Visual Studio Code)'], ['emojis', 'Íconos del curso'], ['material', 'Material (requiere Material Icon Theme)'], ['ninguno', 'Ninguno']]))}
        <h2>Editor</h2>${fila('editor.fontSize', 'Tamaño de fuente', 'En píxeles.', num('editor.fontSize', 8, 32))}${fila('editor.fontFamily', 'Familia de fuente', 'Fuentes separadas por comas, como en CSS.', sel('editor.fontFamily', [["'JetBrains Mono', Consolas, monospace", 'JetBrains Mono'], ["Consolas, 'Courier New', monospace", 'Consolas'], ["'Fira Code', monospace", 'Fira Code'], ["'Courier New', monospace", 'Courier New'], ['monospace', 'Monoespaciada del sistema']]))}${fila('editor.tabSize', 'Tamaño de tabulación', 'Cuántos espacios equivale una tabulación (en Python se usan 4).', num('editor.tabSize', 1, 8))}${fila('editor.wordWrap', 'Ajuste de línea', 'Si las líneas largas se cortan para entrar en la pantalla.', sel('editor.wordWrap', [['off', 'off (no)'], ['on', 'on (sí)'], ['bounded', 'bounded']]))}${fila('editor.minimap.enabled', 'Minimapa', 'La vista en miniatura del archivo, a la derecha.', chk('editor.minimap.enabled'))}${fila('editor.lineNumbers', 'Números de línea', '', sel('editor.lineNumbers', [['on', 'on'], ['off', 'off'], ['relative', 'relative (como en vim)']]))}${fila('editor.cursorStyle', 'Estilo del cursor', '', sel('editor.cursorStyle', ['line', 'block', 'underline', 'line-thin', 'block-outline']))}${fila('editor.cursorBlinking', 'Parpadeo del cursor', '', sel('editor.cursorBlinking', ['blink', 'smooth', 'phase', 'expand', 'solid']))}${fila('editor.renderWhitespace', 'Mostrar espacios en blanco', 'Útil en Python y YAML, donde la sangría importa.', sel('editor.renderWhitespace', ['none', 'selection', 'boundary', 'all']))}${fila('editor.fontLigatures', 'Ligaduras de fuente', 'Une símbolos como != o => en un solo glifo (si la fuente lo permite).', chk('editor.fontLigatures'))}${fila('editor.stickyScroll.enabled', 'Desplazamiento fijo', 'Deja fijo arriba el def o la clase en la que estás.', chk('editor.stickyScroll.enabled'))}
        <h2>Archivos</h2>${fila('files.autoSave', 'Guardado automático', 'afterDelay guarda solo un segundo después de dejar de escribir.', sel('files.autoSave', [['off', 'off'], ['afterDelay', 'afterDelay']]))}
        <h2>Terminal</h2>${fila('terminal.integrated.fontSize', 'Tamaño de fuente de la terminal', '', num('terminal.integrated.fontSize', 9, 24))}
        <p class="vs-aj-d" style="margin-top:20px">Todo se guarda en <code>~/.config/Code/User/settings.json</code>, igual que en VS Code: puedes verlo con <code>cat</code> en la terminal o editarlo a mano.</p></div>`;
      const b = $('[data-aj-buscar]', edEl);
      b.addEventListener('input', () => { const q = b.value.toLowerCase(); $$('.vs-aj', edEl).forEach((x) => { x.hidden = q && !x.textContent.toLowerCase().includes(q); }); });
      edEl.addEventListener('change', (e) => {
        const el = e.target.closest('[data-aj]'); if (!el) return;
        const k = el.dataset.aj, v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
        const a = vsAjustes(); delete a.__error; a[k] = v; vsGuardarAjustes(a); aplicar(); pintarLateral();
      });
    }
    function pintarArbol() {
      const rutas = Object.keys(Sh.Machine.fs).filter((k) => k.startsWith(raiz + '/') && !OCULTAS.test(rel(k))).sort();
      const hijos = (dir) => rutas.filter((k) => k.slice(0, k.lastIndexOf('/')) === dir).sort((a, b) => (Sh.isDir(b) - Sh.isDir(a)) || a.localeCompare(b));
      const cambios = estadoGit();
      const nodo = (dir, nivel) => hijos(dir).map((k) => {
        const n = k.split('/').pop();
        if (Sh.isDir(k)) { const ab = abiertas.has(k); return `<div class="vs-n vs-dir" data-dir="${esc(k)}" style="padding-left:${8 + nivel * 12}px"><span class="vs-chev">${ab ? '⌄' : '›'}</span>${esc(n)}</div>${ab ? nodo(k, nivel + 1) : ''}`; }
        const g = cambios[k];
        return `<div class="vs-n vs-arch ${k === actual ? 'on' : ''} ${g ? 'git-' + g : ''}" data-f="${esc(k)}" style="padding-left:${22 + nivel * 12}px"><span class="vs-ic vs-ic-${ext(n) || 'txt'}">${icono(n)}</span><span class="vs-nom">${esc(n)}</span>${sucios.has(k) ? '<b class="vs-punto">●</b>' : g ? `<span class="vs-git">${g}</span>` : ''}</div>`;
      }).join('');
      latEl.innerHTML = `<div class="vs-lat-cab"><span>EXPLORADOR</span><span class="spacer"></span><button title="Archivo nuevo..." data-nuevo>${ci('new-file')}</button><button title="Carpeta nueva..." data-nueva-carpeta>${ci('new-folder')}</button><button title="Actualizar el explorador" data-refrescar>${ci('refresh')}</button><button title="Contraer carpetas en el explorador" data-contraer>${ci('collapse-all')}</button></div><div class="vs-n vs-raiz">${ci('chevron-down')} ${esc(nombreRaiz.toUpperCase())}</div>${nodo(raiz, 0) || '<div class="vs-n muted small" style="padding-left:20px">(carpeta vacía)</div>'}`;
      latEl.insertAdjacentHTML('beforeend', esquemaHtml() + timelineHtml());
    }
    function buscarEnArchivos(q) {
      const res = $('.vs-res', latEl); if (!res) return;
      if (!q || q.length < 2) { res.innerHTML = '<p class="small" style="opacity:.7;padding:0 12px">Escribe al menos 2 letras.</p>'; return; }
      const out = []; let n = 0;
      for (const k of archivos()) {
        const txt = Sh.readFile(k) || ''; if (txt.length > 300000) continue;
        const hits = txt.split('\n').map((l, i) => [l, i]).filter(([l]) => l.toLowerCase().includes(q.toLowerCase())).slice(0, 20);
        if (!hits.length) continue;
        n += hits.length;
        out.push(`<div class="vs-res-arch">${icono(k.split('/').pop())} ${esc(k.split('/').pop())} <span class="vs-res-n">${hits.length}</span><span class="vs-res-ruta">${esc(rel(k).split('/').slice(0, -1).join('/'))}</span></div>` + hits.map(([l, i]) => { const j = l.toLowerCase().indexOf(q.toLowerCase()); return `<div class="vs-res-l" data-f="${esc(k)}" data-linea="${i + 1}">${esc(l.slice(Math.max(0, j - 20), j)).trimStart()}<mark>${esc(l.slice(j, j + q.length))}</mark>${esc(l.slice(j + q.length, j + q.length + 40))}</div>`; }).join(''));
      }
      res.innerHTML = out.length ? `<p class="small" style="opacity:.7;padding:0 12px">${n} resultado(s) en ${out.length} archivo(s)</p>` + out.join('') : '<p class="small" style="opacity:.7;padding:0 12px">Sin resultados.</p>';
    }
    // ---------------------------------------------------------------- control de código fuente (git)
    function estadoGit() {
      const r = repoDe(); if (!r) return {};
      const g = Sh.Machine.git[r], head = g.branches[g.branch], C = Object.assign({}, ...Object.values(Sh.Machine.git.__remotos || {}).map((x) => x.commits), g.commits);
      const hs = head && C[head] ? C[head].snap : {}, work = Sh.gitInt.snapshot(r), out = {};
      for (const k of new Set([...Object.keys(hs), ...Object.keys(work)])) {
        if (Sh.gitInt.ignored(r, k) || hs[k] === work[k]) continue;
        out[r + '/' + k] = (g.merge && g.merge.conflictos.includes(k)) ? 'C' : hs[k] === undefined ? 'U' : work[k] === undefined ? 'D' : 'M';
      }
      const badge = $('.vs-badge', box), n = Object.keys(out).length; badge.hidden = !n; badge.textContent = n;
      return out;
    }
    function pintarGit() {
      const r = repoDe();
      if (!r) { latEl.innerHTML = `<div class="vs-lat-cab"><span>CONTROL DE CÓDIGO FUENTE</span></div><div class="vs-run-info"><p class="small">Esta carpeta no es un repositorio de Git.</p><button class="vs-btn-azul" data-git-init>Inicializar repositorio</button><p class="small" style="margin-top:10px">Es lo mismo que escribir <code>git init</code> en la terminal.</p></div>`; return; }
      const g = Sh.Machine.git[r], cambios = estadoGit();
      const nombres = { M: 'modificado', U: 'nuevo', D: 'eliminado', C: 'en conflicto' };
      latEl.innerHTML = `<div class="vs-lat-cab"><span>CONTROL DE CÓDIGO FUENTE</span><span class="spacer"></span><button title="Traer cambios (git pull)" data-git-cmd="git pull">↓</button><button title="Subir (git push)" data-git-cmd="git push">↑</button></div>
        <div class="vs-git-box"><textarea data-msg rows="2" placeholder="Mensaje (Ctrl+Enter para hacer commit en '${esc(g.branch)}')"></textarea><button class="vs-btn-azul" data-commit>✓ Commit</button></div>
        <div class="vs-lat-sub">CAMBIOS <span class="vs-res-n">${Object.keys(cambios).length}</span></div>
        ${Object.entries(cambios).map(([k, t]) => `<div class="vs-n vs-arch git-${t}" data-diff="${esc(k)}" style="padding-left:16px" title="${nombres[t]}"><span class="vs-ic">${icono(k.split('/').pop())}</span><span class="vs-nom">${esc(k.split('/').pop())}</span><span class="vs-res-ruta">${esc(k.slice(r.length + 1).split('/').slice(0, -1).join('/'))}</span><span class="vs-git">${t}</span></div>`).join('') || '<p class="small" style="opacity:.7;padding:0 14px">No hay cambios. El árbol de trabajo está limpio.</p>'}
        <p class="small" style="opacity:.7;padding:8px 14px">Cada botón ejecuta el comando de Git equivalente en la terminal integrada, para que veas qué hace.</p>`;
      const msg = $('[data-msg]', latEl);
      msg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); hacerCommit(); } });
    }
    async function hacerCommit() {
      const msg = ($('[data-msg]', latEl) || {}).value || '';
      if (!msg.trim()) { toast('Escribe un mensaje de commit: qué cambiaste y por qué.'); return; }
      await correrEnTerminal(`cd ${Sh.display(repoDe())} && git add -A && git commit -m "${msg.replace(/"/g, '\\"')}"`);
      pintarLateral();
    }
    // ---------------------------------------------------------------- pestañas, migas y editor
    function pintarTabs() {
      tabsEl.innerHTML = abiertos.map((k) => k.startsWith(DIFF) ? `<div class="vs-tab ${actual === k ? 'on' : ''}" data-tab="${esc(k)}"><span><span class="vs-ic">${ci('diff')}</span>${esc(k.slice(DIFF.length).split('/').pop())} (árbol de trabajo)</span><button data-cerrar-tab="${esc(k)}">${ci('close')}</button></div>` : k === BIENVENIDA || k === AJUSTES
        ? `<div class="vs-tab ${actual === k ? 'on' : ''}" data-tab="${k}"><span>${k === AJUSTES ? '⚙ Configuración' : '⟨⟩ Bienvenida'}</span><button data-cerrar-tab="${k}">${ci('close')}</button></div>`
        : `<div class="vs-tab ${k === actual ? 'on' : ''}" data-tab="${esc(k)}"><span><span class="vs-ic">${icono(k.split('/').pop())}</span>${esc(k.split('/').pop())}</span><button data-cerrar-tab="${esc(k)}" title="Cerrar">${sucios.has(k) ? '●' : ci('close')}</button></div>`).join('')
        + (esArchivo(actual) && comandoPara(actual) ? `<span class="spacer"></span><button class="vs-run" data-run title="${esc(comandoPara(actual).titulo)} (F5)">${ci('play')}</button>` : '') + (esArchivo(actual) ? `${comandoPara(actual) ? '' : '<span class="spacer"></span>'}<button class="vs-run vs-dividir" data-dividir title="Dividir editor (Ctrl+\\)">${ci('split-horizontal')}</button>` : '');
      migasEl.innerHTML = esArchivo(actual) ? rel(actual).split('/').map(esc).join(' <span>›</span> ') : '';
    }
    function pintarEstado() {
      const r = repoDe(), g = r && Sh.Machine.git[r];
      $('[data-rama]', box).innerHTML = ci('git-branch') + ' ' + esc(g ? `${g.branch}${g.merge ? ' (fusionando)' : ''}${g.rebase ? ' (rebase)' : ''}` : 'sin repositorio') + (g ? ' ' + ci('sync') : '');
      const e = esArchivo(actual) ? ext(actual) : '';
      $('[data-lang]', box).textContent = esArchivo(actual) ? ({ py: 'Python', sql: 'SQL', yml: 'YAML', yaml: 'YAML', sh: 'Shell Script', json: 'JSON', md: 'Markdown', toml: 'TOML', csv: 'CSV' }[e] || 'Texto sin formato') : '';
      $('[data-esp]', box).textContent = esArchivo(actual) ? 'Espacios: 4' : '';
      $('[data-py]', box).textContent = e === 'py' ? `🐍 3.12${Sh.Machine.env && Sh.Machine.env.VIRTUAL_ENV ? " ('.venv')" : ''}` : '';
      // GitLens: el último commit que tocó este archivo
      let gl = '';
      if (extOn('eamodio.gitlens') && r && esArchivo(actual)) {
        const C = Object.assign({}, ...Object.values(Sh.Machine.git.__remotos || {}).map((x) => x.commits), g.commits), relp = actual.slice(r.length + 1);
        for (let hsh = g.branches[g.branch]; hsh && C[hsh]; hsh = C[hsh].parent) { const c = C[hsh], ps = c.parent && C[c.parent] ? C[c.parent].snap : {}; if (c.snap[relp] !== ps[relp]) { gl = `👤 ${c.author}, ${new Date(c.date).toLocaleDateString('es')} · ${c.msg.slice(0, 40)}`; break; } }
        if (!gl) gl = '👤 sin commits todavía';
      }
      $('[data-gitlens]', box).textContent = gl;
      if (!esArchivo(actual)) $('[data-pos]', box).textContent = '';
    }
    function bienvenida() {
      edEl.innerHTML = `<div class="vs-bienv"><h1>Code <span>· editor del curso</span></h1><div class="vs-bienv-grid"><div><h3>Empezar</h3><p><a data-nuevo>📄 Archivo nuevo…</a></p><p><a data-quick>📂 Abrir archivo… <kbd>Ctrl+P</kbd></a></p><p><a data-toggle-term>⌨ Abrir la terminal <kbd>Ctrl+\`</kbd></a></p></div>
        <div><h3>Ejecutar tu código</h3><p>Abre un archivo y presiona <b>▷</b> (arriba a la derecha) o <kbd>F5</kbd>. Se guarda y se ejecuta en la terminal de abajo:</p><ul><li><code>.py</code> → <code>python archivo.py</code></li><li><code>.sh</code> → <code>bash archivo.sh</code></li><li><code>.sql</code> → <code>sqlite3 tienda.db &lt; archivo.sql</code></li><li>modelo de dbt → <code>dbt run --select modelo</code></li></ul></div>
        <div><h3>Atajos</h3><ul class="vs-atajos"><li><kbd>Ctrl+S</kbd> guardar</li><li><kbd>Ctrl+P</kbd> abrir un archivo por nombre</li><li><kbd>Ctrl+Shift+P</kbd> paleta de comandos</li><li><kbd>Ctrl+B</kbd> mostrar/ocultar la barra lateral</li><li><kbd>Ctrl+\`</kbd> terminal</li><li><kbd>F5</kbd> ejecutar</li><li><kbd>Ctrl+/</kbd> comentar líneas</li><li><kbd>Alt+↑/↓</kbd> mover una línea</li><li>Clic derecho en un archivo: renombrar, eliminar, copiar ruta</li></ul></div></div></div>`;
    }
    function abrir(k, linea) {
      if (esArchivo(actual) && ed && sucios.has(actual)) sucios.set(actual, ed.getValue());
      if (!abiertos.includes(k)) abiertos.push(k);
      actual = k; cerrarDiff(); if (ed2) { ed2.dispose(); ed2 = null; } edEl.classList.remove('vs-mitad');
      if (k === BIENVENIDA) { ed = null; bienvenida(); pintarLateral(); pintarTabs(); pintarEstado(); return; }
      if (k === AJUSTES) { ed = null; pintarAjustes(); pintarLateral(); pintarTabs(); pintarEstado(); diagnosticar(); return; }
      if (k.startsWith(DIFF)) { ed = null; abrirDiff(k.slice(DIFF.length)); pintarLateral(); pintarTabs(); pintarEstado(); diagnosticar(); return; }
      for (let d = k.slice(0, k.lastIndexOf('/')); d.length > raiz.length; d = d.slice(0, d.lastIndexOf('/'))) abiertas.add(d);
      edEl.innerHTML = '';
      const valor = sucios.has(k) ? sucios.get(k) : (Sh.readFile(k) ?? '');
      const api = ed = createEditor(edEl, { lang: LANG_EXT[ext(k)] || 'text', value: valor, tall: true, onRun: () => ejecutar(), onChange: (v) => { clearTimeout(diagT); diagT = setTimeout(diagnosticar, 350);  const disco = Sh.readFile(k) ?? ''; if (v !== disco) sucios.set(k, v); else sucios.delete(k); pintarTabs(); if (vistaLat === 'explorador') pintarArbol(); if (AJ['files.autoSave'] === 'afterDelay') { clearTimeout(autoGuardado); autoGuardado = setTimeout(() => { if (sucios.has(k)) guardar(k); }, 1000); } } });
      // Monaco puede llegar un poco después que el editor simple: se configura cuando está
      const configurar = (n = 0) => {
        if (ed !== api) return;
        if (api.monaco) {
          ponerTemaMonaco();
          api.monaco.updateOptions(opcionesEditor());
          const pos = () => { const p = api.monaco.getPosition(); $('[data-pos]', box).textContent = p ? `Lín. ${p.lineNumber}, col. ${p.column}` : ''; };
          api.monaco.onDidChangeCursorPosition(pos); pos();
          if (linea) { api.monaco.revealLineInCenter(linea); api.monaco.setPosition({ lineNumber: linea, column: 1 }); }
          api.monaco.focus(); diagnosticar(); if (dividido) dividir(true);
        } else if (n < 40) setTimeout(() => configurar(n + 1), 150);
        else if (api.cm && linea) { api.cm.setCursor(linea - 1, 0); api.cm.focus(); }
      };
      configurar();
      pintarLateral(); pintarTabs(); pintarEstado(); setTimeout(diagnosticar, 60);
    }
    function guardar(k = actual) {
      if (!esArchivo(k)) return;
      const v = k === actual && ed ? ed.getValue() : sucios.get(k);
      if (v === undefined) return;
      historialLocal(k, Sh.readFile(k)); Sh.writeFile(k, v); Sh.Machine.save(); sucios.delete(k); historialLocal(k, v);
      if (k === VS_RUTA()) { aplicar(); toast('Configuración aplicada'); }
      pintarTabs(); pintarLateral();
    }
    function guardarTodo() { [...sucios.keys()].forEach((k) => guardar(k)); toast('Todo guardado'); }
    function cerrarTab(k) {
      if (sucios.has(k) && !confirm(`${k.split('/').pop()} tiene cambios sin guardar. ¿Cerrar igual y perderlos?`)) return;
      sucios.delete(k); abiertos.splice(abiertos.indexOf(k), 1);
      if (actual === k) { actual = null; ed = null; if (abiertos.length) abrir(abiertos[abiertos.length - 1]); else { edEl.innerHTML = '<div class="vs-vacio">⟨⟩</div>'; pintarTabs(); pintarEstado(); pintarLateral(); } }
      else pintarTabs();
    }
    // ---------------------------------------------------------------- terminal y ejecución
    function togglePanel(forzar) {
      const panel = $('.vs-panel', box);
      const mostrar = forzar !== undefined ? forzar : panel.hidden;
      panel.hidden = !mostrar;
      if (mostrar && !terms.length) nuevaTerminal();
      if (mostrar && term && ptab === 'terminal') setTimeout(() => term.focus(), 30);
    }
    function nuevaTerminal() {
      const cont = $('.vs-panel-cuerpo', box), el = document.createElement('div'); el.className = 'vs-term-inst'; cont.appendChild(el);
      Sh.Machine.cwd = raiz;
      const t = Sh.createTerminal(el, { compact: true, continuarSesion: true, welcome: false, onCommand: () => { pintarLateral(); pintarEstado(); if (esArchivo(actual) && !sucios.has(actual) && ed && ed.getValue() !== (Sh.readFile(actual) ?? '')) { const k = actual; actual = null; abrir(k); } } });
      terms.push({ t, el, n: 'bash' }); activarTerm(terms.length - 1); mostrarPtab('terminal');
    }
    function activarTerm(i) { tActiva = i; terms.forEach((x, j) => { x.el.hidden = j !== i; }); term = terms[i] ? terms[i].t : null; pintarTermLista(); if (term) setTimeout(() => term.focus(), 30); }
    function borrarTerm() { const x = terms[tActiva]; if (!x) return; x.el.remove(); terms.splice(tActiva, 1); if (!terms.length) { term = null; togglePanel(false); pintarTermLista(); return; } activarTerm(Math.max(0, tActiva - 1)); }
    function pintarTermLista() { const l = $('.vs-term-lista', box); if (!l) return; l.innerHTML = terms.length > 1 ? `<select data-term-sel>${terms.map((x, j) => `<option value="${j}" ${j === tActiva ? 'selected' : ''}>${j + 1}: ${x.n}</option>`).join('')}</select>` : `<span class="small" style="opacity:.75">${ci('terminal')} bash</span>`; }
    function mostrarPtab(cual) {
      ptab = cual;
      $$('.vs-ptab', box).forEach((x) => x.classList.toggle('on', x.dataset.ptab === cual));
      $('.vs-panel-cuerpo', box).hidden = cual !== 'terminal'; $('.vs-panel-prob', box).hidden = cual !== 'problemas'; $('.vs-panel-salida', box).hidden = cual !== 'salida'; $('.vs-panel-dbg', box).hidden = cual !== 'depuracion'; if (cual === 'depuracion') pintarConsolaDbg();
      ['[data-term-nuevo]', '[data-term-borrar]', '.vs-term-lista'].forEach((s2) => { const el = $(s2, box); if (el) el.style.display = cual === 'terminal' ? '' : 'none'; });
      if (cual === 'problemas') pintarProblemas();
      if (cual === 'salida') $('.vs-panel-salida', box).innerHTML = `<pre>${esc(salida.join('\n') || 'Aquí aparece la salida de las tareas que ejecuta el editor (ejecutar, git, tests).')}</pre>`;
    }
    // ---------------------------------------------------------------- Problemas (diagnósticos) y Esquema
    const LANG_DIAG = { py: 'python', json: 'json', yml: 'yaml', yaml: 'yaml', sql: 'sql', md: 'markdown', sh: 'shell' };
    function diagnosticar() {
      if (!window.VSReal) return;
      problemas = esArchivo(actual) && ed ? window.VSReal.diagnosticos(ed.getValue(), LANG_DIAG[ext(actual)] || '').map((x) => ({ ...x, archivo: actual })) : [];
      aplicarProblemas();
      // Python real (Pyodide): si ya está cargado, el análisis con ast reemplaza al heurístico
      if (esArchivo(actual) && ed && ext(actual) === 'py') {
        const src = ed.getValue(), arch = actual;
        diagPython(src).then((res) => { if (!res || arch !== actual || !ed || ed.getValue() !== src) return; problemas = res.map((x) => ({ ...x, archivo: arch })); aplicarProblemas(); });
      }
    }
    function aplicarProblemas() {
      const nE = problemas.filter((x) => x.sev === 'error').length, nW = problemas.length - nE;
      const el = $('[data-errores]', box); if (el) el.innerHTML = `${ci('error')} ${nE} ${ci('warning')} ${nW}`;
      const pn = $('[data-prob-n]', box); if (pn) { pn.hidden = !problemas.length; pn.textContent = problemas.length; }
      if (ed && ed.monaco && window.monaco) { const m = ed.monaco.getModel(); window.monaco.editor.setModelMarkers(m, 'academia', problemas.filter((x) => x.linea <= m.getLineCount()).map((x) => ({ startLineNumber: x.linea, startColumn: x.col, endLineNumber: x.linea, endColumn: Math.max(x.col + 1, m.getLineMaxColumn(x.linea)), message: x.msg, severity: x.sev === 'error' ? 8 : 4, source: x.fuente }))); }
      if (ptab === 'problemas') pintarProblemas();
      const esq = $('.vs-esquema', latEl); if (esq) esq.outerHTML = esquemaHtml();
      const tl = $('.vs-timeline', latEl); if (tl) tl.outerHTML = timelineHtml();
    }
    function pintarProblemas() {
      const el = $('.vs-panel-prob', box); if (!el) return;
      el.innerHTML = problemas.length ? `<div class="vs-prob-arch">${icono(problemas[0].archivo.split('/').pop())} ${esc(problemas[0].archivo.split('/').pop())} <span class="vs-res-ruta">${esc(rel(problemas[0].archivo).split('/').slice(0, -1).join('/'))}</span><span class="vs-res-n">${problemas.length}</span></div>${problemas.map((x) => `<div class="vs-prob" data-ir-linea="${x.linea}" data-ir-col="${x.col}">${ci(x.sev === 'error' ? 'error' : 'warning')} <span>${esc(x.msg)}</span> <span class="vs-prob-f">${esc(x.fuente)} [Ln ${x.linea}, Col ${x.col}]</span></div>`).join('')}` : '<p class="small" style="opacity:.7;padding:6px 12px">No se han detectado problemas en el área de trabajo.</p>';
    }
    // ---------------------------------------------------------------- Timeline: historial local (cada guardado) y commits de git del archivo
    function historialLocal(k, v) {
      if (v == null) return;
      try { const H = JSON.parse(localStorage.getItem('vs-historial') || '{}'); const l = H[k] = H[k] || []; if (l.length && l[l.length - 1].v === v) return; l.push({ t: Date.now(), v }); if (l.length > 15) l.splice(0, l.length - 15); const claves = Object.keys(H); if (claves.length > 60) delete H[claves[0]]; localStorage.setItem('vs-historial', JSON.stringify(H)); } catch (e) { /* sin almacenamiento */ }
    }
    function entradasTimeline(k) {
      const out = [];
      try { (JSON.parse(localStorage.getItem('vs-historial') || '{}')[k] || []).forEach((x, i) => out.push({ id: 'l' + i, t: x.t, tipo: 'local', titulo: 'Archivo guardado', det: 'Historial local', v: x.v })); } catch (e) { /* sin almacenamiento */ }
      const r = repoDe(), g = r && Sh.Machine.git[r];
      if (g && k.startsWith(r + '/')) {
        const relp = k.slice(r.length + 1), C = Object.assign({}, ...Object.values(Sh.Machine.git.__remotos || {}).map((x) => x.commits), g.commits);
        let h = g.branches[g.branch], n = 0;
        while (h && C[h] && n < 200) { const c = C[h], pa = c.parent && C[c.parent]; const antes = pa ? pa.snap[relp] : undefined; if (c.snap[relp] !== antes) out.push({ id: 'g' + h, t: Date.parse(c.date) || 0, tipo: 'git', titulo: c.msg, det: `${c.author || 'alumno'} · ${h.slice(0, 7)}`, v: c.snap[relp] ?? '' }); h = c.parent; n++; }
      }
      return out.sort((a, b) => b.t - a.t);
    }
    const haceCuanto = (t) => { const s0 = (Date.now() - t) / 1000; return s0 < 60 ? 'ahora' : s0 < 3600 ? `hace ${Math.floor(s0 / 60)} min` : s0 < 86400 ? `hace ${Math.floor(s0 / 3600)} h` : s0 < 86400 * 30 ? `hace ${Math.floor(s0 / 86400)} d` : new Date(t).toLocaleDateString('es'); };
    function timelineHtml() {
      const k = esArchivo(actual) ? actual : actual && String(actual).startsWith(DIFF) ? String(actual).slice(DIFF.length) : null;
      const es = k ? entradasTimeline(k) : [];
      return `<div class="vs-timeline"><div class="vs-lat-sub vs-esq-t" data-tl-toggle><span class="vs-chev">${tlAbierto ? '⌄' : '›'}</span> LÍNEA DE TIEMPO${k ? ` <span class="vs-tl-arch">${esc(k.split('/').pop())}</span>` : ''}</div>${tlAbierto ? (es.length ? es.map((x) => `<div class="vs-n vs-tl-i" data-tl="${esc(x.id)}" title="${esc(x.titulo)}\n${esc(x.det)}"><span class="codicon codicon-${x.tipo === 'git' ? 'git-commit' : 'history'}"></span><span class="vs-nom">${esc(x.titulo)}</span><span class="vs-tl-t">${esc(haceCuanto(x.t))}</span></div>`).join('') : `<div class="vs-dim vs-tl-vacio">${k ? 'Sin historial todavía: guarda (Ctrl+S) o haz un commit.' : 'Abre un archivo para ver su historial.'}</div>`) : ''}</div>`;
    }
    function esquemaHtml() {
      if (!window.VSReal) return '';
      const items = esArchivo(actual) && ed ? window.VSReal.esquema(ed.getValue(), LANG_DIAG[ext(actual)] || '') : [];
      return `<div class="vs-esquema"><div class="vs-lat-sub vs-esq-t" data-esq-toggle><span class="vs-chev">${esqAbierto ? '⌄' : '›'}</span> ESQUEMA</div>${esqAbierto ? (items.length ? items.map((x) => `<div class="vs-n vs-esq-i" data-ir-linea="${x.linea}" style="padding-left:${18 + x.nivel * 12}px">${ci(x.tipo)} <span class="vs-nom">${esc(x.nombre)}</span></div>`).join('') : `<p class="small" style="opacity:.7;padding:0 18px">${esArchivo(actual) ? 'El editor activo no tiene símbolos (funciones, clases, títulos…).' : 'Abre un archivo para ver su esquema.'}</p>`) : ''}</div>`;
    }
    function irALinea(l, c = 1) { if (ed && ed.monaco) { ed.monaco.revealLineInCenter(l); ed.monaco.setPosition({ lineNumber: l, column: c }); ed.monaco.focus(); } else if (ed && ed.cm) { ed.cm.setCursor(l - 1, c - 1); ed.cm.focus(); } }
    // ---------------------------------------------------------------- vista de cambios (diff) y editor dividido
    function cerrarDiff() { if (diffEd) { diffEd.dispose(); diffEd = null; } if (diffModelos) { diffModelos.forEach((m) => m.dispose()); diffModelos = null; } }
    function abrirDiff(k) {
      const r = repoDe(), g = r && Sh.Machine.git[r];
      const C = g ? Object.assign({}, ...Object.values(Sh.Machine.git.__remotos || {}).map((x) => x.commits), g.commits) : {};
      const head = g && g.branches[g.branch], relp = r ? k.slice(r.length + 1) : k;
      const orig = diffOrig && diffOrig.k === k ? diffOrig.v : head && C[head] ? (C[head].snap[relp] ?? '') : '', mod = Sh.readFile(k) ?? '';
      edEl.innerHTML = '';
      if (window.monaco) {
        const lng = monacoLang(LANG_EXT[ext(k)] || 'text');
        diffModelos = [window.monaco.editor.createModel(orig, lng), window.monaco.editor.createModel(mod, lng)];
        diffEd = window.monaco.editor.createDiffEditor(edEl, { ...opcionesEditor(), automaticLayout: true, readOnly: true, originalEditable: false, renderSideBySide: edEl.clientWidth > 700 });
        diffEd.setModel({ original: diffModelos[0], modified: diffModelos[1] }); ponerTemaMonaco();
        return;
      }
      const a = orig.split('\n'), b = mod.split('\n');
      edEl.innerHTML = `<pre class="vs-diff-txt">${b.map((l, i) => (a[i] === l ? `  ${esc(l)}` : `${a[i] !== undefined ? `<span class="vs-diff-menos">- ${esc(a[i])}</span>\n` : ''}<span class="vs-diff-mas">+ ${esc(l)}</span>`)).join('\n')}${a.slice(b.length).map((l) => `\n<span class="vs-diff-menos">- ${esc(l)}</span>`).join('')}</pre>`;
      Monaco.load().then(() => { if (actual === DIFF + k && box.isConnected) abrirDiff(k); }).catch(() => {});
    }
    function dividir(on = !dividido) {
      dividido = on; if (ed2) { ed2.dispose(); ed2 = null; } const prev = $('.vs-editor2', box); if (prev) prev.remove();
      edEl.classList.toggle('vs-mitad', on && !!(ed && ed.monaco));
      if (!on) return;
      if (!ed || !ed.monaco) { dividido = false; toast('Abre un archivo (y espera a que cargue el editor) para dividirlo.'); return; }
      const d = document.createElement('div'); d.className = 'vs-editor2'; edEl.appendChild(d);
      ed2 = window.monaco.editor.create(d, { ...opcionesEditor(), model: ed.monaco.getModel(), automaticLayout: true });
    }
    function zen(on = !zenOn) { zenOn = on; box.classList.toggle('vs-zen', on); if (on) toast('Modo zen: pulsa Esc dos veces para salir'); }
    function elegirTema() { selector('Seleccionar tema de color', temasDisponibles().map((n) => ({ label: n, desc: (window.VSReal && window.VSReal.TEMAS[n] ? 'tema de VS Code' : 'tema del curso') + (n === AJ['workbench.colorTheme'] ? ' · actual' : '') })), (x) => { const a = vsAjustes(); delete a.__error; a['workbench.colorTheme'] = x.label; vsGuardarAjustes(a); aplicar(); }); }
    function elegirIconos() { selector('Seleccionar tema de íconos de archivo', [['vs-seti', 'Seti (Visual Studio Code)'], ['vs-minimal', 'Minimal (Visual Studio Code)'], ['emojis', 'Íconos del curso'], ['material', 'Material Icon Theme'], ['ninguno', 'Ninguno']].map(([v, l]) => ({ label: l, desc: v === AJ['workbench.iconTheme'] ? 'actual' : '', v })), (x) => { const a = vsAjustes(); delete a.__error; a['workbench.iconTheme'] = x.v; vsGuardarAjustes(a); aplicar(); pintarLateral(); pintarTabs(); }); }
    async function correrEnTerminal(cmd) { togglePanel(true); mostrarPtab('terminal'); salida.push(`[${new Date().toLocaleTimeString('es')}] > ${cmd}`); await term.run(cmd); pintarLateral(); pintarEstado(); }
    // ---------------------------------------------------------------- Ejecutar y depurar (Python)
    const bpsDe = (k) => { const B = vsBps(); return new Set(B[k] || []); };
    function vsBps() { try { return JSON.parse(localStorage.getItem('vs-breakpoints') || '{}'); } catch (e) { return {}; } }
    function guardarBps(k, set) { const B = vsBps(); if (set.size) B[k] = [...set].sort((a, b) => a - b); else delete B[k]; try { localStorage.setItem('vs-breakpoints', JSON.stringify(B)); } catch (e) { /* sin almacenamiento */ } }
    function alternarBp(l) { if (!esArchivo(actual)) return; const set = bpsDe(actual); set.has(l) ? set.delete(l) : set.add(l); guardarBps(actual, set); pintarBps(); if (vistaLat === 'ejecutar') pintarLateral(); }
    function pintarBps() {
      if (!ed || !ed.monaco || !window.monaco || !esArchivo(actual)) return;
      const set = bpsDe(actual); const m = ed.monaco;
      bpDecos = m.deltaDecorations(bpDecos, [...set].map((l) => ({ range: new window.monaco.Range(l, 1, l, 1), options: { glyphMarginClassName: 'vs-bp', glyphMarginHoverMessage: { value: 'Punto de interrupción' }, stickiness: 1 } })));
      const p = dbg && dbg.archivo === actual && dbg.i != null ? dbg.pasos[dbg.i] : null;
      dbgDecos = m.deltaDecorations(dbgDecos, p ? [{ range: new window.monaco.Range(p.l, 1, p.l, 1), options: { isWholeLine: true, className: p.e === 'exception' ? 'vs-dbg-linea-exc' : 'vs-dbg-linea', glyphMarginClassName: 'vs-dbg-flecha' } }] : []);
      if (p) m.revealLineInCenterIfOutsideViewport(p.l);
    }
    function prepararGutter() {
      if (!ed || !ed.monaco || !window.monaco || ed.monaco.__bp) return;
      const m = ed.monaco; m.__bp = true; m.updateOptions({ glyphMargin: true });
      m.onMouseDown((e) => { const T = window.monaco.editor.MouseTargetType; if (e.target && (e.target.type === T.GUTTER_GLYPH_MARGIN || e.target.type === T.GUTTER_LINE_DECORATIONS) && e.target.position) alternarBp(e.target.position.lineNumber); });
      pintarBps();
    }
    async function depurar() {
      if (!esArchivo(actual) || ext(actual) !== 'py') { toast('El depurador de esta práctica funciona con archivos .py. Para otros archivos usa Ctrl+F5 (ejecutar sin depurar).'); return; }
      guardar(actual);
      const archivo = actual, src = Sh.readFile(archivo) || '';
      dbg = { archivo, pasos: [], i: null, cargando: true, salida: '', error: null }; pintarDbgUI(); togglePanel(true); mostrarPtab('depuracion');
      let tr; try { tr = await trazarPython(src); } catch (e) { dbg = null; pintarDbgUI(); toast(e.message); return; }
      if (!dbg || dbg.archivo !== archivo) return;
      dbg = { archivo, pasos: tr.pasos, salidaTotal: tr.salida, error: tr.error, i: -1, cargando: false };
      dbg.iExc = tr.error ? (() => { for (let k = dbg.pasos.length - 1; k >= 0; k--) if (dbg.pasos[k].e === 'exception') return k; return null; })() : null;
      pasoDbg('continuar');
    }
    function pasoDbg(modo) {
      if (!dbg || dbg.cargando) return;
      const P = dbg.pasos, bps = bpsDe(dbg.archivo); const cur = dbg.i >= 0 ? P[dbg.i] : null; const d = cur ? cur.pila.length : 0;
      let j = -1;
      for (let k = dbg.i + 1; k < P.length; k++) {
        const x = P[k]; if (x.e !== 'line') { if (dbg.iExc === k) { j = k; break; } continue; }
        if (modo === 'continuar' && bps.has(x.l)) { j = k; break; }
        if (modo === 'dentro') { j = k; break; }
        if (modo === 'sobre' && x.pila.length <= d) { j = k; break; }
        if (modo === 'salir' && x.pila.length < d) { j = k; break; }
      }
      if (j < 0 && dbg.iExc != null && dbg.iExc > dbg.i) j = dbg.iExc;
      if (j < 0) { terminarDbg(true); return; }
      dbg.i = j; dbg.salida = (dbg.salidaTotal || '').slice(0, P[j].out);
      if (actual !== dbg.archivo) abrir(dbg.archivo);
      pintarDbgUI();
    }
    function terminarDbg(natural) {
      if (!dbg) return;
      const fin = natural ? { salida: dbg.salidaTotal || '', error: dbg.error } : null; const archivo = dbg.archivo;
      dbg = null; pintarDbgUI();
      if (fin) { dbgFinal = { archivo, ...fin }; pintarConsolaDbg(); } else dbgFinal = null;
    }
    let dbgFinal = null;
    function pintarConsolaDbg() {
      const el = $('.vs-panel-dbg', box); if (!el) return;
      if (dbg && dbg.cargando) { el.innerHTML = '<pre class="vs-dbg-con">Iniciando el depurador (Python en el navegador)…</pre>'; return; }
      const out = dbg ? dbg.salida : dbgFinal ? dbgFinal.salida : '';
      const p = dbg && dbg.i >= 0 ? dbg.pasos[dbg.i] : null;
      const err = p && p.e === 'exception' ? p.exc : !dbg && dbgFinal ? dbgFinal.error : null;
      el.innerHTML = `<pre class="vs-dbg-con">${esc(out)}${err ? `<span class="vs-dbg-err">${esc(err)}</span>\n` : ''}${!dbg && dbgFinal ? `<span class="vs-dbg-dim">El programa terminó${dbgFinal.error ? ' con un error' : ''}.</span>` : ''}</pre><div class="vs-dbg-eval"><span>›</span><input data-dbg-eval placeholder="${dbg ? 'Escribe el nombre de una variable para ver su valor' : 'Inicia la depuración (F5) para inspeccionar variables'}"></div>`;
      const inp = $('[data-dbg-eval]', el); inp.addEventListener('keydown', (e) => { if (e.key !== 'Enter' || !dbg || !p) return; const n = inp.value.trim(); const v = (p.loc[n] || p.glob[n]); const pre = $('.vs-dbg-con', el); pre.insertAdjacentHTML('beforeend', `<span class="vs-dbg-dim">› ${esc(n)}</span>\n${v ? esc(v[0]) : `<span class="vs-dbg-err">NameError: name '${esc(n)}' is not defined</span>`}\n`); inp.value = ''; });
    }
    function pintarDbgUI() {
      box.classList.toggle('vs-depurando', !!dbg);
      let tb = $('.vs-dbg-barra', box);
      if (dbg && !tb) { tb = h(`<div class="vs-dbg-barra"><span class="vs-dbg-asa">⠿</span><button data-dbg="continuar" title="Continuar (F5)">${ci('debug-continue')}</button><button data-dbg="sobre" title="Depurar paso a paso por procedimientos (F10)">${ci('debug-step-over')}</button><button data-dbg="dentro" title="Depurar paso a paso por instrucciones (F11)">${ci('debug-step-into')}</button><button data-dbg="salir" title="Salir de la depuración (Mayús+F11)">${ci('debug-step-out')}</button><button data-dbg="reiniciar" title="Reiniciar (Ctrl+Mayús+F5)">${ci('debug-restart')}</button><button data-dbg="detener" title="Detener (Mayús+F5)">${ci('debug-stop')}</button></div>`); box.append(tb); tb.addEventListener('click', (e) => { const b = e.target.closest('[data-dbg]'); if (!b) return; const a = b.dataset.dbg; if (a === 'detener') terminarDbg(); else if (a === 'reiniciar') depurar(); else pasoDbg(a); }); }
      if (!dbg && tb) tb.remove();
      if (tb) tb.classList.toggle('cargando', !!(dbg && dbg.cargando));
      pintarBps(); if (vistaLat === 'ejecutar') pintarLateral(); if (ptab === 'depuracion') pintarConsolaDbg();
    }
    function pintarDepurar() {
      const bpLista = Object.entries(vsBps()).flatMap(([k, ls]) => ls.map((l) => [k, l]));
      const p = dbg && dbg.i >= 0 ? dbg.pasos[dbg.i] : null;
      const vars = (o) => Object.entries(o || {}).map(([k, [v, t, n]]) => `<div class="vs-var" title="${esc(t)}"><span class="vs-var-n">${esc(k)}</span>: <span class="vs-var-v vs-var-${/^(int|float|bool)$/.test(t) ? 'num' : t === 'str' ? 'str' : 'obj'}">${esc(v)}</span>${n != null && t !== 'str' ? ` <small>(${n})</small>` : ''}</div>`).join('') || '<div class="vs-dim vs-var">sin variables</div>';
      const seccion = (id, titulo, cuerpo, extra = '') => `<details class="vs-dbg-sec" open><summary>${titulo}${extra}</summary>${cuerpo}</details>`;
      if (!dbg) {
        latEl.innerHTML = `<div class="vs-lat-cab"><span>EJECUTAR Y DEPURAR</span></div><div class="vs-run-info">${esArchivo(actual) && ext(actual) === 'py' ? `<button class="vs-btn-azul" data-dbg-ini>Ejecutar y depurar</button><p class="small">Pon puntos de interrupción con clic a la izquierda del número de línea (o F9) y pulsa F5. Ctrl+F5 ejecuta sin depurar.</p>` : esArchivo(actual) && comandoPara(actual) ? `<button class="vs-btn-azul" data-run>▷ ${esc(comandoPara(actual).titulo)}</button><p class="small">Se guarda el archivo y se ejecuta en la terminal integrada.</p>` : '<p class="small">Abre un archivo .py para depurarlo, o un archivo que se pueda ejecutar.</p>'}${dbgFinal ? `<p class="small">Última sesión: ${dbgFinal.error ? `terminó con <b>${esc(dbgFinal.error.split(':')[0])}</b>` : 'terminó bien'}. Mira la CONSOLA DE DEPURACIÓN.</p>` : ''}</div>${seccion('bp', 'PUNTOS DE INTERRUPCIÓN', bpLista.map(([k, l]) => `<div class="vs-var vs-bp-item" data-ir-bp="${esc(k)}|${l}"><span class="vs-bp-dot"></span>${esc(k.split('/').pop())} <small>${l}</small></div>`).join('') || '<div class="vs-dim vs-var">Ninguno</div>')}`;
      } else if (dbg.cargando) latEl.innerHTML = '<div class="vs-lat-cab"><span>EJECUTAR Y DEPURAR</span></div><p class="small" style="padding:0 14px">Iniciando Python…</p>';
      else {
        latEl.innerHTML = `<div class="vs-lat-cab"><span>EJECUTAR Y DEPURAR</span></div>${p && p.e === 'exception' ? `<div class="vs-dbg-excbox">Se produjo una excepción: <b>${esc(p.exc)}</b></div>` : ''}${seccion('vars', 'VARIABLES', `${p && p.pila.length > 1 ? `<div class="vs-var-g">Locals</div>${vars(p.loc)}` : ''}<div class="vs-var-g">${p && p.pila.length > 1 ? 'Globals' : 'Locals'}</div>${vars(p && p.glob)}`)}${seccion('watch', 'INSPECCIÓN', vigilar.map((n, i) => { const v = p && (p.loc[n] || p.glob[n]); return `<div class="vs-var"><span class="vs-var-n">${esc(n)}</span>: <span class="vs-var-v">${v ? esc(v[0]) : '<i>no disponible</i>'}</span> <button class="vs-mini" data-quitar-watch="${i}">✕</button></div>`; }).join('') + '<input class="vs-watch-in" data-watch placeholder="+ Agregar expresión (nombre de variable)">')}${seccion('pila', 'PILA DE LLAMADAS', p ? p.pila.map(([fn, l], i) => `<div class="vs-var ${i === 0 ? 'on' : ''}">${ci('debug-stackframe')} <span class="vs-var-n">${esc(fn === '<module>' ? '<module>' : fn)}</span> <small>${esc(dbg.archivo.split('/').pop())} ${l}</small></div>`).join('') : '')}${seccion('bp', 'PUNTOS DE INTERRUPCIÓN', bpLista.map(([k, l]) => `<div class="vs-var vs-bp-item" data-ir-bp="${esc(k)}|${l}"><span class="vs-bp-dot"></span>${esc(k.split('/').pop())} <small>${l}</small></div>`).join('') || '<div class="vs-dim vs-var">Ninguno</div>')}`;
      }
      const ini = $('[data-dbg-ini]', latEl); if (ini) ini.onclick = () => depurar();
      const run = $('[data-run]', latEl); if (run) run.onclick = () => ejecutar();
      const w = $('[data-watch]', latEl); if (w) w.onkeydown = (e) => { if (e.key === 'Enter' && w.value.trim()) { vigilar.push(w.value.trim()); pintarLateral(); } };
      $$('[data-quitar-watch]', latEl).forEach((b) => { b.onclick = () => { vigilar.splice(Number(b.dataset.quitarWatch), 1); pintarLateral(); }; });
      $$('[data-ir-bp]', latEl).forEach((b) => { b.onclick = () => { const [k, l] = b.dataset.irBp.split('|'); if (actual !== k) abrir(k); setTimeout(() => irALinea(Number(l)), 200); }; });
    }
    if (!bpTimer) bpTimer = setInterval(() => { if (!box.isConnected) { clearInterval(bpTimer); bpTimer = null; return; } prepararGutter(); }, 500);
    async function ejecutar() {
      if (!esArchivo(actual)) { toast('Abre un archivo para ejecutarlo.'); return; }
      const c = comandoPara(actual);
      if (!c) { toast(`Los archivos .${ext(actual)} no se ejecutan: son datos o configuración.`); return; }
      guardar(actual);
      await correrEnTerminal(c.cmd);
    }
    // ---------------------------------------------------------------- abrir rápido (Ctrl+P) y paleta (Ctrl+Shift+P)
    function selector(placeholder, items, alElegir) {
      const prev = $('.vs-quick', box); if (prev) prev.remove();
      const q = h(`<div class="vs-quick"><input placeholder="${esc(placeholder)}"><div class="vs-quick-lista"></div></div>`);
      box.appendChild(q);
      const inp = $('input', q), lista = $('.vs-quick-lista', q); let sel = 0, vis = [];
      const pintar = () => { const t = inp.value.toLowerCase(); vis = items.filter((x) => (x.label + ' ' + (x.desc || '')).toLowerCase().includes(t)).slice(0, 14); sel = Math.min(sel, Math.max(0, vis.length - 1)); lista.innerHTML = vis.map((x, i) => `<div class="vs-quick-item ${i === sel ? 'on' : ''}" data-i="${i}"><span>${x.icono || ''} ${esc(x.label)}</span><span class="vs-quick-desc">${esc(x.desc || '')}</span></div>`).join('') || '<div class="vs-quick-item">Sin resultados</div>'; };
      inp.addEventListener('input', () => { sel = 0; pintar(); });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, vis.length - 1); pintar(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); pintar(); }
        if (e.key === 'Enter' && vis[sel]) { e.preventDefault(); q.remove(); alElegir(vis[sel]); }
        if (e.key === 'Escape') q.remove();
      });
      lista.addEventListener('mousedown', (e) => { const it = e.target.closest('[data-i]'); if (it) { e.preventDefault(); q.remove(); alElegir(vis[Number(it.dataset.i)]); } });
      inp.addEventListener('blur', () => setTimeout(() => q.remove(), 150));
      pintar(); setTimeout(() => inp.focus(), 10);
    }
    const abrirRapido = () => selector('Busca un archivo por nombre…', archivos().map((k) => ({ label: k.split('/').pop(), desc: rel(k).split('/').slice(0, -1).join('/'), icono: ICONO_EXT[ext(k)] || '📄', k })), (x) => abrir(x.k));
    const COMANDOS = [
      ['Depurar: iniciar la depuración', 'F5', () => depurar()],
      ['Ejecutar: ejecutar sin depurar', 'Ctrl+F5', () => ejecutar()],
      ['Depurar: alternar punto de interrupción', 'F9', () => { if (ed && ed.monaco) alternarBp(ed.monaco.getPosition().lineNumber); }],
      ['Archivo: guardar', 'Ctrl+S', () => { guardar(); toast('Guardado'); }],
      ['Archivo: guardar todo', '', () => guardarTodo()],
      ['Archivo: nuevo archivo…', '', () => nuevo(false)],
      ['Archivo: nueva carpeta…', '', () => nuevo(true)],
      ['Ver: mostrar/ocultar la terminal', 'Ctrl+`', () => togglePanel()],
      ['Ver: mostrar/ocultar la barra lateral', 'Ctrl+B', () => { lateralOculto = !lateralOculto; pintarLateral(); }],
      ['Ver: explorador', 'Ctrl+Shift+E', () => { vistaLat = 'explorador'; lateralOculto = false; pintarLateral(); }],
      ['Ver: buscar en los archivos', 'Ctrl+Shift+F', () => { vistaLat = 'buscar'; lateralOculto = false; pintarLateral(); }],
      ['Git: control de código fuente', 'Ctrl+Shift+G', () => { vistaLat = 'git'; lateralOculto = false; pintarLateral(); }],
      ['Git: pull', '', () => correrEnTerminal('git pull')],
      ['Git: push', '', () => correrEnTerminal('git push')],
      ['Git: ver el historial (log)', '', () => correrEnTerminal('git log --oneline --all')],
      ['Python: ejecutar ruff (revisar el estilo)', '', () => correrEnTerminal(`ruff check ${esArchivo(actual) ? Sh.display(actual) : '.'}`)],
      ['Python: ejecutar los tests (pytest)', '', () => correrEnTerminal('pytest')],
      ['Ayuda: bienvenida', '', () => abrir(BIENVENIDA)],
      ['Preferencias: abrir la configuración', 'Ctrl+,', () => abrir(AJUSTES)],
      ['Preferencias: abrir la configuración de usuario (JSON)', '', () => { if (!Sh.exists(VS_RUTA())) vsGuardarAjustes(vsAjustes()); abrir(VS_RUTA()); }],
      ['Preferencias: tema de color', 'Ctrl+K Ctrl+T', () => elegirTema()],
      ['Preferencias: tema de íconos de archivo', '', () => elegirIconos()],
      ['Ver: alternar el modo zen', 'Ctrl+K Z', () => zen()],
      ['Ver: dividir el editor', 'Ctrl+\\', () => dividir()],
      ['Ver: mostrar/ocultar el panel', 'Ctrl+J', () => togglePanel()],
      ['Ver: problemas', 'Ctrl+Shift+M', () => { togglePanel(true); mostrarPtab('problemas'); }],
      ['Ver: salida', '', () => { togglePanel(true); mostrarPtab('salida'); }],
      ['Terminal: crear una terminal nueva', 'Ctrl+Shift+ñ', () => { togglePanel(true); nuevaTerminal(); }],
      ['Git: abrir los cambios del archivo actual', '', () => { if (esArchivo(actual)) abrir(DIFF + actual); else toast('Abre un archivo de un repositorio.'); }],
      ['Ver: extensiones', 'Ctrl+Shift+X', () => { vistaLat = 'ext'; lateralOculto = false; pintarLateral(); }],
      ['Editor: cerrar el editor actual', '', () => actual && cerrarTab(actual)],
    ];
    const paleta = () => selector('> Escribe un comando', COMANDOS.map(([l, d, f]) => ({ label: l, desc: d, f })), (x) => x.f());
    function nuevo(carpeta, base = raiz) {
      const n = prompt(carpeta ? 'Nombre de la carpeta nueva (puede incluir subcarpetas, ej. src/utils):' : 'Nombre del archivo nuevo (ej. pipelines/limpieza.py):');
      if (!n || !n.trim()) return;
      const p = Sh.norm(base + '/' + n.trim().replace(/^\/+/, ''));
      if (carpeta) { Sh.mkdirp(p); abiertas.add(p); Sh.Machine.save(); pintarLateral(); return; }
      if (!Sh.exists(p)) { Sh.mkdirp(p.slice(0, p.lastIndexOf('/'))); Sh.writeFile(p, ''); Sh.Machine.save(); }
      abrir(p);
    }
    // ---------------------------------------------------------------- menú contextual del explorador
    function menuContextual(x, y, k) {
      const prev = $('.vs-ctx', box); if (prev) prev.remove();
      const esDir = Sh.isDir(k);
      const m = h(`<div class="vs-ctx" style="left:${x}px;top:${y}px">${esDir ? '<div data-c="nuevo">Archivo nuevo aquí…</div><div data-c="carpeta">Carpeta nueva aquí…</div><hr>' : '<div data-c="abrir">Abrir</div>' + (comandoPara(k) ? '<div data-c="run">▷ Ejecutar</div>' : '') + '<hr>'}<div data-c="term">Abrir en la terminal integrada</div><div data-c="ruta">Copiar ruta</div><hr><div data-c="renombrar">Renombrar…</div><div data-c="eliminar">Eliminar</div></div>`);
      box.appendChild(m);
      const cerrarM = () => m.remove();
      setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!m.contains(e.target)) { cerrarM(); document.removeEventListener('mousedown', f); } }), 0);
      m.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-c]')?.dataset.c; if (!c) return; cerrarM();
        if (c === 'abrir') abrir(k);
        if (c === 'run') { abrir(k); setTimeout(ejecutar, 50); }
        if (c === 'nuevo') nuevo(false, k);
        if (c === 'carpeta') nuevo(true, k);
        if (c === 'term') correrEnTerminal(`cd ${Sh.display(esDir ? k : k.slice(0, k.lastIndexOf('/')))}`);
        if (c === 'ruta') { try { await navigator.clipboard.writeText(Sh.display(k)); toast('Ruta copiada: ' + Sh.display(k)); } catch (err) { prompt('Ruta:', Sh.display(k)); } }
        if (c === 'renombrar') {
          const n = prompt('Nuevo nombre:', k.split('/').pop()); if (!n || !n.trim() || n.includes('/')) return;
          const destino = k.slice(0, k.lastIndexOf('/')) + '/' + n.trim();
          if (Sh.exists(destino)) { toast('Ya existe un archivo con ese nombre.'); return; }
          for (const p of Object.keys(Sh.Machine.fs)) if (p === k || p.startsWith(k + '/')) { Sh.Machine.fs[destino + p.slice(k.length)] = Sh.Machine.fs[p]; delete Sh.Machine.fs[p]; }
          const i = abiertos.indexOf(k); if (i >= 0) abiertos[i] = destino; if (actual === k) actual = destino;
          Sh.Machine.save(); pintarLateral(); pintarTabs();
        }
        if (c === 'eliminar') {
          if (!confirm(`¿Eliminar ${esDir ? 'la carpeta' : 'el archivo'} ${Sh.display(k)}? (como rm${esDir ? ' -r' : ''}: no hay papelera)`)) return;
          for (const p of Object.keys(Sh.Machine.fs)) if (p === k || p.startsWith(k + '/')) delete Sh.Machine.fs[p];
          if (abiertos.includes(k)) { sucios.delete(k); cerrarTab(k); }
          Sh.Machine.save(); pintarLateral();
        }
      });
    }
    // ---------------------------------------------------------------- cerrar y atajos
    function cerrar() {
      if (sucios.size && !confirm(`Hay ${sucios.size} archivo(s) sin guardar. ¿Cerrar igual?`)) return;
      cerrarDiff(); if (ed2) ed2.dispose(); box.remove(); document.body.classList.remove('vscode-abierto'); document.removeEventListener('keydown', teclas, true);
      if (window.monaco) window.monaco.editor.setTheme('academia');
      document.dispatchEvent(new CustomEvent('term-config'));
    }
    function teclas(e) {
      if (!box.isConnected) return;
      const c = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (acorde && Date.now() - acorde < 1500 && !['control', 'meta', 'shift'].includes(k)) { acorde = 0; if (k === 'z' && !c) { e.preventDefault(); e.stopPropagation(); zen(); return; } if (c && k === 't') { e.preventDefault(); e.stopPropagation(); elegirTema(); return; } }
      if (c && k === 'k' && !e.shiftKey) { acorde = Date.now(); return; }
      if (e.key === 'Escape' && zenOn) { if (escPrev && Date.now() - escPrev < 700) { zen(false); escPrev = 0; } else escPrev = Date.now(); }
      if (c && k === 'j') { e.preventDefault(); togglePanel(); return; }
      if (c && e.key === '\\') { e.preventDefault(); dividir(); return; }
      if (c && e.shiftKey && k === 'm') { e.preventDefault(); togglePanel(true); mostrarPtab('problemas'); return; }
      if (c && e.shiftKey && (k === 'ñ' || e.code === 'Backquote')) { e.preventDefault(); togglePanel(true); nuevaTerminal(); return; }
      if (c && k === 's') { e.preventDefault(); if (e.altKey) guardarTodo(); else { guardar(); toast('Guardado ' + (esArchivo(actual) ? Sh.display(actual) : '')); } }
      else if (c && (e.key === '`' || k === 'ñ' || e.code === 'Backquote')) { e.preventDefault(); togglePanel(); }
      else if (e.key === 'F5' && e.shiftKey && c) { e.preventDefault(); if (dbg) depurar(); }
      else if (e.key === 'F5' && e.shiftKey) { e.preventDefault(); if (dbg) terminarDbg(); }
      else if (e.key === 'F5' && c) { e.preventDefault(); ejecutar(); }
      else if (e.key === 'F5') { e.preventDefault(); if (dbg) pasoDbg('continuar'); else if (esArchivo(actual) && ext(actual) === 'py') depurar(); else ejecutar(); }
      else if (e.key === 'F9') { e.preventDefault(); if (ed && ed.monaco) alternarBp(ed.monaco.getPosition().lineNumber); }
      else if (e.key === 'F10' && dbg) { e.preventDefault(); pasoDbg('sobre'); }
      else if (e.key === 'F11' && dbg) { e.preventDefault(); pasoDbg(e.shiftKey ? 'salir' : 'dentro'); }
      else if (c && e.key === ',') { e.preventDefault(); abrir(AJUSTES); }
      else if (c && e.shiftKey && k === 'x') { e.preventDefault(); vistaLat = 'ext'; lateralOculto = false; pintarLateral(); }
      else if (c && e.shiftKey && k === 'p') { e.preventDefault(); paleta(); }
      else if (c && !e.shiftKey && k === 'p') { e.preventDefault(); abrirRapido(); }
      else if (c && !e.shiftKey && k === 'b') { e.preventDefault(); lateralOculto = !lateralOculto; pintarLateral(); }
      else if (c && e.shiftKey && k === 'e') { e.preventDefault(); vistaLat = 'explorador'; lateralOculto = false; pintarLateral(); }
      else if (c && e.shiftKey && k === 'f') { e.preventDefault(); vistaLat = 'buscar'; lateralOculto = false; pintarLateral(); }
      else if (c && e.shiftKey && k === 'g') { e.preventDefault(); vistaLat = 'git'; lateralOculto = false; pintarLateral(); }
    }
    document.addEventListener('keydown', teclas, true);
    box.addEventListener('change', (e) => { const sl = e.target.closest('[data-term-sel]'); if (sl) activarTerm(Number(sl.value)); });
    box.addEventListener('contextmenu', (e) => { const it = e.target.closest('[data-f], [data-dir]'); if (!it) return; e.preventDefault(); menuContextual(e.clientX, e.clientY, it.dataset.f || it.dataset.dir); });
    box.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-cerrar]')) return cerrar();
      if (t.closest('[data-ajustes]')) return abrir(AJUSTES);
      if (t.closest('[data-abrir-json]')) { if (!Sh.exists(VS_RUTA())) vsGuardarAjustes(vsAjustes()); return abrir(VS_RUTA()); }
      const ex = t.closest('[data-ext]'); if (ex) { const a = vsAjustes(); delete a.__error; const l = new Set(a.extensiones || []); if (l.has(ex.dataset.ext)) l.delete(ex.dataset.ext); else { l.add(ex.dataset.ext); toast('Extensión instalada'); if (ex.dataset.ext === 'pkief.material-icon-theme') a['workbench.iconTheme'] = 'material'; } if (!l.has('pkief.material-icon-theme') && a['workbench.iconTheme'] === 'material') a['workbench.iconTheme'] = 'emojis'; a.extensiones = [...l]; vsGuardarAjustes(a); aplicar(); pintarLateral(); pintarEstado(); return; }
      const ct = t.closest('[data-cerrar-tab]'); if (ct) { e.stopPropagation(); return cerrarTab(ct.dataset.cerrarTab); }
      const df = t.closest('[data-diff]'); if (df) { diffOrig = null; return abrir(DIFF + df.dataset.diff); }
      const il = t.closest('[data-ir-linea]'); if (il) { if (!ed && il.closest('.vs-panel-prob') && problemas[0]) abrir(problemas[0].archivo); return irALinea(Number(il.dataset.irLinea), Number(il.dataset.irCol || 1)); }
      if (t.closest('[data-tl-toggle]')) { tlAbierto = !tlAbierto; const tl = $('.vs-timeline', latEl); if (tl) tl.outerHTML = timelineHtml(); return; }
      const tli = t.closest('[data-tl]'); if (tli) { const k = esArchivo(actual) ? actual : String(actual).slice(DIFF.length); const x = entradasTimeline(k).find((y) => y.id === tli.dataset.tl); if (x) { diffOrig = { k, v: x.v }; if (actual === DIFF + k) abrirDiff(k); else abrir(DIFF + k); toast(`Comparando "${x.titulo}" (${haceCuanto(x.t)}) ↔ el archivo actual`); } return; }
      if (t.closest('[data-esq-toggle]')) { esqAbierto = !esqAbierto; const esq = $('.vs-esquema', latEl); if (esq) esq.outerHTML = esquemaHtml(); return; }
      const pt = t.closest('[data-ptab]'); if (pt) return mostrarPtab(pt.dataset.ptab);
      if (t.closest('[data-term-nuevo]')) return nuevaTerminal();
      if (t.closest('[data-term-borrar]')) return borrarTerm();
      if (t.closest('[data-panel-max]')) { box.classList.toggle('vs-panel-max'); return; }
      if (t.closest('[data-dividir]')) return dividir();
      if (t.closest('[data-run]') || t.closest('[data-run-menu]')) return ejecutar();
      if (t.closest('[data-term-menu]') || t.closest('[data-toggle-term]')) return togglePanel();
      if (t.closest('[data-toggle-lat]')) { lateralOculto = !lateralOculto; return pintarLateral(); }
      if (t.closest('[data-quick]')) return abrirRapido();
      const v = t.closest('[data-vista]'); if (v) { if (vistaLat === v.dataset.vista && !lateralOculto) lateralOculto = true; else { vistaLat = v.dataset.vista; lateralOculto = false; } return pintarLateral(); }
      const tab = t.closest('[data-tab]'); if (tab) return abrir(tab.dataset.tab);
      const f = t.closest('[data-f]'); if (f) return abrir(f.dataset.f, f.dataset.linea ? Number(f.dataset.linea) : undefined);
      const d = t.closest('[data-dir]'); if (d) { abiertas.has(d.dataset.dir) ? abiertas.delete(d.dataset.dir) : abiertas.add(d.dataset.dir); return pintarArbol(); }
      if (t.closest('[data-refrescar]')) return pintarLateral();
      if (t.closest('[data-contraer]')) { abiertas.clear(); return pintarArbol(); }
      if (t.closest('[data-panel-x]')) return togglePanel(false);
      if (t.closest('[data-git-init]')) return correrEnTerminal(`cd ${Sh.display(raiz)} && git init`);
      const gc = t.closest('[data-git-cmd]'); if (gc) return correrEnTerminal(`cd ${Sh.display(repoDe())} && ${gc.dataset.gitCmd}`);
      if (t.closest('[data-commit]')) return hacerCommit();
      if (t.closest('[data-nuevo]')) return nuevo(false);
      if (t.closest('[data-nueva-carpeta]')) return nuevo(true);
    });
    aplicar(); pintarLateral(); pintarEstado();
    if (archivo) abrir(archivo); else abrir(BIENVENIDA);
  }
  if (window.Shell) window.Shell.abrirCode = abrirCode;

  function compiledBlock(sql) {
    const d = h('<details class="compiled"><summary>Ver SQL compilado (lo que dbt envía a la base)</summary><pre data-lang="sql"><code></code></pre></details>');
    $('code', d).textContent = sql; highlight($('pre', d));
    return d;
  }

  // ---------------------------------------------------------------- ejercicios
  function mountExercise(slot, ex, num) {
    const done = Store.exDone(ex.id);
    const card = h(`<section class="exercise ${done ? 'passed' : ''}" id="${esc(ex.id)}">
      <div class="ex-head"><span class="badge b-type">${TYPE_LABEL[ex.type] || ex.type}</span><h4>Ejercicio ${num}${ex.titulo ? ' · ' + esc(ex.titulo) : ''}</h4>${ex.dificultad ? `<span class="badge ${levelClass(ex.dificultad)}"${ex.dificultadLeccion ? ' title="Dificultad: el nivel de la lección"' : ''}>${esc(ex.dificultad)}</span>` : ''}<span class="status">${done ? '✓ Resuelto' : 'Pendiente'}</span></div>
      <div class="ex-body"><div class="ex-prompt prose">${ex.enunciado}</div></div>
    </section>`);
    slot.replaceWith(card);
    enhanceCode($('.ex-prompt', card));
    const markPassed = () => {
      card.classList.add('passed'); $('.status', card).textContent = '✓ Resuelto';
      const was = Store.exDone(ex.id);
      Store.setExDone(ex.id);
      if (!was) { refreshSidebarState(); maybeLessonComplete(ex); }
    };
    const fb = h('<div class="ex-feedback" hidden></div>');
    const feedback = (kind, msg) => { fb.hidden = false; fb.className = 'ex-feedback ' + kind; fb.textContent = msg; };
    const extra = h('<div class="ex-extra" hidden></div>');
    const showExtra = (title, html) => {
      extra.hidden = false;
      extra.innerHTML = `<h5>${esc(title)}</h5>${html}`;
      enhanceCode(extra);
    };

    if (ex.type === 'quiz') return mountQuiz(card, ex, markPassed, fb, feedback);
    if (ex.type === 'cli') return mountCli(card, ex, markPassed, fb, feedback, extra, showExtra);
    if (ex.type === 'abierto') return mountOpen(card, ex, markPassed, extra, showExtra);

    const lang = ex.type === 'sql' || ex.type === 'dbsql' ? 'sql' : ex.type === 'dbt' ? 'dbt' : ex.type === 'dax' ? 'dax' : 'python';
    const starter = ex.inicial ?? (ex.type === 'dbsql' ? (ex.modo === 'pipeline' ? '-- Código del pipeline (destino: main.default)\nCREATE OR REFRESH STREAMING TABLE …\n' : '-- Databricks SQL (catálogo main, esquema default)\n') : ex.type === 'sql' ? '-- Escribe tu consulta aquí\n' : ex.type === 'dbt' ? '-- Escribe tu modelo dbt aquí\n' : ex.type === 'dax' ? (ex.prueba ? 'Medida = ' : '// Escribe tu consulta DAX\nEVALUATE\n    ') : '# Escribe tu código aquí\n');
    if (ex.type === 'dbsql' && (ex.setup || ex.check)) card.append(h(`<details class="dax-prueba"><summary>${ex.modo === 'pipeline' ? 'Cómo se corrige: se ejecuta tu pipeline (destino <code>main.default</code>) y después la consulta de control' : 'Cómo se corrige: se corre en un catálogo limpio con estas tablas; después de tu código se ejecuta la consulta de control'}</summary>${ex.setup ? `<p class="small muted">Tablas que ya existen (setup):</p><pre data-lang="sql"><code>${esc(ex.setup)}</code></pre>` : ''}${ex.archivos ? `<p class="small muted">Archivos en el volumen:</p><pre data-lang="texto"><code>${esc(ex.archivos)}</code></pre>` : ''}${ex.check ? `<p class="small muted">Consulta de control (tu resultado se compara con el de la solución):</p><pre data-lang="sql"><code>${esc(ex.check)}</code></pre>` : ''}</details>`));
    if (ex.type === 'dax' && ex.prueba) card.append(h(`<details class="dax-prueba"><summary>Tu medida se llama <code>[?]</code> y se evalúa con esta consulta DAX (como un objeto visual)</summary><pre data-lang="dax"><code>${esc(ex.prueba)}</code></pre>${ex.medidas ? `<p class="small muted">Medidas que ya existen en el modelo:</p><pre data-lang="dax"><code>${esc(ex.medidas)}</code></pre>` : ''}</details>`));
    const edBox = h('<div class="ex-editor"></div>');
    card.append(edBox);
    const ed = createEditor(edBox, { lang, value: Store.code(ex.id) ?? starter, onRun: () => run(), onCheck: () => check(), onChange: (v) => Store.setCode(ex.id, v) });
    card.__editor = ed;
    const tools = h(`<div class="ex-tools">
      <button class="btn btn-primary btn-sm" data-act="run">▶ Ejecutar <span class="kbd">Ctrl+↵</span></button>
      <button class="btn btn-ok btn-sm" data-act="check">✓ Comprobar</button>
      ${ex.pista ? `<button class="btn btn-sm" data-act="hint">💡 Pista${(ex.pistas || []).length > 1 ? ` <span class="muted">1/${ex.pistas.length}</span>` : ''}</button>` : ''}
      <button class="btn btn-sm" data-act="sol">👁 Solución</button>
      ${ex.type === 'sql' || ex.type === 'dbt' || ex.type === 'dax' ? '<button class="btn btn-ghost btn-sm" data-act="schema">📋 Tablas</button>' : ''}${ex.type === 'dax' ? '<a class="btn btn-ghost btn-sm" href="#/powerbi" title="El Power BI de práctica: importa las mismas tablas y prueba la medida en un objeto visual">📊 Power BI</a>' : ''}${ex.type === 'dbsql' ? `<a class="btn btn-ghost btn-sm" href="#/databricks/${ex.modo === 'pipeline' ? 'pipelines' : 'sql'}" title="Prueba lo mismo en el Databricks de práctica (con tu propio catálogo)">🧱 Databricks</a>` : ''}
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" data-act="reset" title="Volver al código inicial">↺ Reiniciar</button>
    </div>`);
    const out = h('<div class="output"></div>');
    card.append(tools, fb, out, extra);
    tools.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'run') run();
      if (a === 'check') check();
      if (a === 'hint') mostrarPista(ex, showExtra, e.target.closest('[data-act]'));
      if (a === 'sol') showSolution();
      if (a === 'reset') { ed.setValue(starter); fb.hidden = true; out.innerHTML = ''; }
      if (a === 'schema') showSchemaModal();
    });
    function showSolution() {
      showExtra('Solución propuesta', `<pre data-lang="${lang === 'dbt' ? 'sql' : lang}"><code>${esc(ex.solucion)}</code></pre>${ex.explicacion || ''}<button class="btn btn-sm" data-copysol>Copiar al editor</button>`);
      $('[data-copysol]', extra).addEventListener('click', () => ed.setValue(ex.solucion));
    }
    const busy = (v) => $$('button', tools).forEach((b) => { if (b.dataset.act === 'run' || b.dataset.act === 'check') b.disabled = v; });

    async function run() {
      const code = ed.getValue();
      busy(true);
      try {
        if (ex.type === 'sql') {
          if (!(await ensureSql(out))) return;
          const db = SQL.fresh();
          if (ex.setup) db.exec(ex.setup);
          renderSqlOutput(out, SQL.exec(code, db)); db.close();
        } else if (ex.type === 'dax') {
          if (!(await ensureSql(out))) return;
          renderSqlOutput(out, await window.Engines.DAX.run(ex, code));
        } else if (ex.type === 'dbsql') {
          if (!(await ensureSql(out))) return;
          loadingInto(out, ex.modo === 'pipeline' ? 'Ejecutando el pipeline…' : 'Ejecutando en Databricks SQL…');
          const r = await window.Engines.DBSQL.run(ex, code);
          renderSqlOutput(out, r);
          if (r.ok && r.log) out.prepend(h(`<pre class="console small">${esc(r.log)}</pre>`));
        } else if (ex.type === 'dbt') {
          if (!(await ensureSql(out))) return;
          loadingInto(out, pyLoadingMsg());
          const r = await DBT.run(ex, code);
          renderSqlOutput(out, r);
          if (r.compiled) out.append(compiledBlock(r.compiled));
        } else {
          loadingInto(out, pyLoadingMsg());
          renderConsole(out, await PY.run(ex.type, code));
        }
      } finally { busy(false); }
    }
    async function check() {
      const code = ed.getValue();
      busy(true);
      try {
        if (ex.type === 'sql') {
          if (!(await ensureSql(out))) return;
          const r = SQL.grade(ex, code);
          if (!r.ok) { feedback('bad', '✗ Error: ' + r.error); out.innerHTML = ''; return; }
          renderSqlOutput(out, { ok: true, results: [r.result], ms: 0 });
          if (r.pass) { feedback('ok', '✓ ' + r.msg); markPassed(); } else feedback('bad', '✗ ' + r.msg);
        } else if (ex.type === 'dbsql') {
          if (!(await ensureSql(out))) return;
          loadingInto(out, 'Comprobando…');
          const r = await window.Engines.DBSQL.grade(ex, code);
          if (!r.ok) { feedback('bad', '✗ Error: ' + r.error.split('\n').pop()); renderSqlOutput(out, r); return; }
          renderSqlOutput(out, { ok: true, results: [r.result], ms: 0 });
          if (r.log) out.prepend(h(`<pre class="console small">${esc(r.log)}</pre>`));
          if (r.pass) { feedback('ok', '✓ ' + r.msg); markPassed(); } else feedback('bad', '✗ ' + r.msg);
        } else if (ex.type === 'dax') {
          if (!(await ensureSql(out))) return;
          const r = await window.Engines.DAX.grade(ex, code);
          if (!r.ok) { feedback('bad', '✗ Error: ' + r.error); out.innerHTML = ''; return; }
          renderSqlOutput(out, { ok: true, results: [r.result], ms: 0 });
          if (r.pass) { feedback('ok', '✓ ' + r.msg); markPassed(); } else feedback('bad', '✗ ' + r.msg);
        } else if (ex.type === 'dbt') {
          if (!(await ensureSql(out))) return;
          loadingInto(out, pyLoadingMsg());
          const r = await DBT.grade(ex, code);
          if (!r.ok) { feedback('bad', '✗ Error: ' + r.error); out.innerHTML = ''; if (r.compiled) out.append(compiledBlock(r.compiled)); return; }
          renderSqlOutput(out, { ok: true, results: [r.result], ms: 0 });
          out.append(compiledBlock(r.compiled));
          if (r.pass) { feedback('ok', '✓ ' + r.msg); markPassed(); } else feedback('bad', '✗ ' + r.msg);
        } else {
          loadingInto(out, PY.status === 'ready' ? 'Comprobando…' : pyLoadingMsg());
          const r = await PY.grade(ex.type, ex, code);
          renderConsole(out, r);
          if (!r.ok) { feedback('bad', '✗ Tu código lanzó un error (míralo abajo).'); return; }
          if (r.pass) { feedback('ok', '✓ ' + r.msg); markPassed(); } else feedback('bad', '✗ ' + r.msg);
        }
      } finally { busy(false); }
    }
  }

  function mountQuiz(card, ex, markPassed, fb, feedback) {
    const body = $('.ex-body', card);
    const name = 'q-' + ex.id;
    const opts = h(`<div class="quiz-opts">${ex.opciones.map((o, i) => `<label class="quiz-opt"><input type="radio" name="${esc(name)}" value="${i}"><span>${o.text}</span></label>`).join('')}</div>`);
    body.append(opts);
    const tools = h('<div class="ex-tools"><button class="btn btn-ok btn-sm" data-check>✓ Comprobar</button></div>');
    const extra = h('<div class="ex-extra" hidden></div>');
    card.append(tools, fb, extra);
    if (Store.exDone(ex.id)) {
      const i = ex.opciones.findIndex((o) => o.ok);
      $$('input', opts)[i].checked = true; $$('.quiz-opt', opts)[i].classList.add('right');
    }
    $('[data-check]', tools).addEventListener('click', () => {
      const sel = $('input:checked', opts);
      $$('.quiz-opt', opts).forEach((l) => l.classList.remove('right', 'wrong'));
      if (!sel) { feedback('info', 'Elige una opción.'); return; }
      const i = Number(sel.value);
      if (ex.opciones[i].ok) {
        sel.closest('.quiz-opt').classList.add('right');
        feedback('ok', '✓ ¡Correcto!'); markPassed();
        if (ex.explicacion) { extra.hidden = false; extra.innerHTML = '<h5>Por qué</h5>' + ex.explicacion; enhanceCode(extra); }
      } else {
        sel.closest('.quiz-opt').classList.add('wrong');
        feedback('bad', '✗ No es esa. Vuelve a leer la sección e inténtalo otra vez.');
      }
    });
  }

  function mountCli(card, ex, markPassed, fb, feedback, extra, showExtra) {
    const box = h('<div class="ex-term"></div>');
    const tools = h(`<div class="ex-tools">${ex.pista ? `<button class="btn btn-sm" data-act="hint">💡 Pista${(ex.pistas || []).length > 1 ? ` <span class="muted">1/${ex.pistas.length}</span>` : ''}</button>` : ''}<button class="btn btn-sm" data-act="sol">👁 Solución</button><button class="btn btn-sm btn-ghost" data-act="reset" title="Limpia la pantalla, vuelve a la carpeta de inicio y repite la preparación del ejercicio. Tus archivos no se borran.">↺ Reiniciar terminal</button><span class="spacer"></span><span class="small muted">Terminal compartida con el <a href="#/lab/terminal">laboratorio</a> · ↑ historial · Tab autocompleta</span></div>`);
    card.append(box, tools, fb, extra);
    const tool = (ex.respuesta[0].replace(/^todos:\s*/, '').match(/^[\w-]+/) || [''])[0];
    const termOpts = {
      compact: true, autoLogin: true,
      welcome: `\u0001t-dim\u0002Escribe el comando que pide el ejercicio y presiona Enter. Puedes explorar con otros comandos (ls, cat, help…).\u0003`,
      onCommand: (line, r, mode) => {
        if (mode) return;
        Store.setCode(ex.id, line);
        const g = CLI.grade(ex, line);
        if (g.pass) {
          feedback('ok', '✓ ' + g.msg + (r.code && ex.error ? ' Este error era el esperado: léelo antes de seguir.' : r.code ? ' (El comando es correcto; la terminal simulada no pudo ejecutarlo completo, mira la salida esperada abajo.)' : ''));
          markPassed();
          if (ex.salida && r.code) showExtra('Salida esperada', `<pre data-lang="text"><code>${esc(ex.salida)}</code></pre>${ex.explicacion || ''}`);
          else if (ex.explicacion) showExtra('Explicación', ex.explicacion);
        } else if (!tool || line.trim().replace(/^\$\s*/, '').startsWith(tool)) feedback('bad', '✗ ' + g.msg);
        else feedback('info', 'Ese comando no es el que pide el ejercicio, pero puedes seguir explorando la terminal.');
      },
    };
    const term = window.Shell.createTerminal(box, termOpts);
    const last = Store.code(ex.id);
    if (last) term.input.value = last;
    // preparación silenciosa (por ejemplo, crear el bucket que el ejercicio da por existente)
    // se ejecuta al enfocar la terminal por primera vez, en cola para no mezclarse con otras preparaciones
    let prepared = null;
    const prep = () => {
      if (!prepared) prepared = CLI.setupQueue = (CLI.setupQueue || Promise.resolve()).then(async () => { for (const l of ex.setup.split('\n').filter((x) => x.trim())) await window.Shell.runLine(l, { autoLogin: true }); }).catch(() => {});
      return prepared;
    };
    if (ex.setup) { term.input.addEventListener('focus', prep, { once: true }); termOpts.beforeRun = prep; }
    tools.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'hint') mostrarPista(ex, showExtra, e.target.closest('[data-act]'));
      if (a === 'reset') {
        // sesión limpia para este ejercicio: pantalla vacía, carpeta de inicio, sin entorno virtual y la preparación otra vez
        const Sh = window.Shell;
        Sh.Machine.cwd = Sh.HOME; delete Sh.Machine.env.VIRTUAL_ENV; Sh.Machine.save();
        const outEl = term.el.querySelector('.term-out'); if (outEl) outEl.innerHTML = '';
        term.print(termOpts.welcome); term.input.value = ''; term.refreshPrompt();
        prepared = null; if (ex.setup) prep();
        document.dispatchEvent(new CustomEvent('term-config'));
        fb.hidden = true; term.focus();
      }
      if (a === 'sol') {
        const sol = ex.solucion || ex.respuesta[0].replace(/\\/g, '');
        showExtra('Solución', `<pre data-lang="bash"><code>${esc(sol)}</code></pre>${ex.explicacion || ''}<button class="btn btn-sm" data-type>⌨ Escribirla en la terminal</button>`);
        $('[data-type]', extra).addEventListener('click', () => { term.type(sol); });
      }
    });
  }

  // Rúbrica de autoevaluación para las respuestas libres: antes de marcar "Lo hice", la persona compara su
  // respuesta con criterios concretos. Si el ejercicio no trae rúbrica, se arma una a partir de los temas
  // de la respuesta modelo (las líneas "Tema: …") y se completa con criterios generales.
  function rubricaDe(ex) {
    if (ex.rubrica) return String(ex.rubrica).split('\n').map((x) => x.trim()).filter(Boolean);
    const temas = (ex.solucion || '').split('\n').map((l) => (/^\s*(?:[-*\d.)]+\s*)?([A-ZÁÉÍÓÚÑ][^:.]{2,38}):\s+\S/.exec(l) || [])[1]).filter(Boolean);
    const r = temas.slice(0, 7).map((t) => `Cubre ${t.toLowerCase()}`);
    r.push('Justifica las decisiones (dice por qué, no solo qué)');
    if (r.length < 4) r.push('Nombra herramientas, tablas o números concretos', 'Menciona al menos un riesgo o una alternativa');
    return r;
  }
  function mountOpen(card, ex, markPassed, extra, showExtra) {
    const box = h('<div class="open-answer"><textarea spellcheck="false" placeholder="Escribe tu respuesta o tu código aquí…"></textarea></div>');
    const ta = $('textarea', box);
    ta.value = Store.code(ex.id) || ex.inicial || '';
    ta.addEventListener('input', () => Store.setCode(ex.id, ta.value));
    const rub = rubricaDe(ex);
    const tools = h(`<div class="ex-tools">${ex.pista ? `<button class="btn btn-sm" data-act="hint">💡 Pista${(ex.pistas || []).length > 1 ? ` <span class="muted">1/${ex.pistas.length}</span>` : ''}</button>` : ''}<button class="btn btn-sm" data-act="rub">📋 Revisar con la rúbrica</button><button class="btn btn-sm" data-act="sol">👁 Ver respuesta modelo</button><span class="spacer"></span><button class="btn btn-ok btn-sm" data-act="done">✓ Lo hice</button></div>`);
    const rubBox = h(`<div class="rubrica" hidden><h5>¿Tu respuesta cumple con esto?</h5><p class="small muted" style="margin:0 0 6px">Marca solo lo que tu respuesta realmente tiene. Lo que falte, agrégalo antes de seguir: así se entrena lo que se evalúa en una entrevista.</p>${rub.map((r, i) => `<label class="auto-item"><input type="checkbox" data-r="${i}"><span>${esc(r)}</span></label>`).join('')}<div class="small" data-rcuenta></div></div>`);
    card.append(box, rubBox, tools, extra);
    const marcas = () => $$('[data-r]', rubBox).filter((c) => c.checked).length;
    const pintarCuenta = () => {
      const n = marcas(), min = Math.ceil(rub.length * 0.7);
      $('[data-rcuenta]', rubBox).innerHTML = n >= min ? `<span class="ok-mark">✓</span> ${n} de ${rub.length}: ¡bien! Ya puedes marcarlo como hecho.` : `${n} de ${rub.length}. Para darlo por hecho, apunta a cumplir al menos ${min}.`;
    };
    rubBox.addEventListener('change', pintarCuenta); pintarCuenta();
    tools.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'hint') mostrarPista(ex, showExtra, e.target.closest('[data-act]'));
      if (a === 'rub') { rubBox.hidden = !rubBox.hidden; if (!rubBox.hidden) rubBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      if (a === 'sol') showExtra('Respuesta modelo', (ex.solucion ? `<pre data-lang="${esc(ex.lang || 'text')}"><code>${esc(ex.solucion)}</code></pre>` : '') + (ex.explicacion || ''));
      if (a === 'done') {
        if (!ta.value.trim()) { toast('Primero escribe tu respuesta: es la única forma de que se te quede.'); ta.focus(); return; }
        if (marcas() < Math.ceil(rub.length * 0.7)) { rubBox.hidden = false; rubBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); toast('Antes, revisa tu respuesta con la rúbrica.'); return; }
        markPassed(); toast('¡Bien! Marcado como hecho.');
      }
    });
  }

  let repaintLessonBar = () => {};
  function maybeLessonComplete(ex) {
    repaintLessonBar();
    const l = LESSONS.find((x) => x.ejercicios.some((e) => e.id === ex.id));
    if (l && l.ejercicios.every((e) => Store.exDone(e.id))) toast('🎉 ¡Completaste todos los ejercicios de esta lección!', 3200);
  }

  async function showSchemaModal() {
    const box = h('<div><h2 style="margin-top:0">Tablas disponibles</h2><div class="loading-block">Cargando…</div></div>');
    openModal(box);
    if (!SQL._bytes) await SQL.init();
    $('.loading-block', box).remove();
    for (const [name, t] of Object.entries(SQL.tables)) {
      box.append(h(`<div style="margin:10px 0"><b style="font-family:var(--mono)">${esc(name)}</b> <span class="muted small">(${t.rows.length.toLocaleString('es')} filas) — ${esc(window.DataGen.TABLE_INFO[name] || '')}</span><div class="cols-list">${t.columns.map((c) => `<span>${esc(c)}</span>`).join('')}</div></div>`));
    }
    box.append(h('<p class="muted small">Vistas para dbt: stg_clientes, stg_productos, stg_pedidos, stg_detalle_pedidos (incluye la columna importe), stg_pagos.</p>'));
  }

  // ---------------------------------------------------------------- etapas de la ruta
  // Los módulos se agrupan en etapas para que quien empieza de cero sepa qué viene primero y qué es opcional.
  const ETAPAS = [
    { id: 'e0', titulo: 'Etapa 0 · Antes de empezar', desc: 'Si nunca programaste: tu computadora por dentro, leer errores, la matemática justa, inglés técnico, cómo estudiar y qué es una API.', mods: ['cero'] },
    { id: 'e1', titulo: 'Etapa 1 · Empieza aquí', desc: 'Qué es un dato, qué hace un ingeniero de datos, la terminal y Git. Si no sabes nada, arranca por acá.', mods: ['fundamentos'] },
    { id: 'e2', titulo: 'Etapa 2 · SQL, el idioma de los datos', desc: 'Preguntarle cosas a una base de datos, de lo más simple a lo más avanzado, analizar datos, diseñar tablas y llevar los números a un tablero de Power BI.', mods: ['sql', 'analisis', 'modelado', 'powerbi'] },
    { id: 'e3', titulo: 'Etapa 3 · Programar y procesar mucho', desc: 'Python para automatizar, Spark para cuando los datos no entran en una sola computadora, y el método para resolver cualquier problema nuevo en Python, SQL y PySpark.', mods: ['python', 'spark', 'pyspark', 'logica'] },
    { id: 'e4', titulo: 'Etapa 4 · Transformar y orquestar', desc: 'dbt para organizar las transformaciones en SQL y Airflow para que todo corra solo, en orden y a horario.', mods: ['dbt', 'airflow'] },
    { id: 'e5', titulo: 'Etapa 5 · La nube y las plataformas', desc: 'Dónde corre todo en las empresas: Azure, AWS, Google Cloud, Databricks y Genie.', mods: ['azure', 'aws', 'gcp', 'databricks', 'genie', 'interfaces'] },
    { id: 'e6', titulo: 'Etapa 6 · Diseñar, automatizar y tu computadora', desc: 'Cómo se diseña una plataforma de datos, cómo se crea la infraestructura con código y cómo armar tu entorno en tu propia computadora.', mods: ['arquitectura', 'terraform', 'local'] },
    { id: 'e7', titulo: '💼 Trabajo real · Casos de negocio y operación', desc: 'Aquí dejas de ser estudiante y resuelves pedidos como en una empresa: casos de negocio con SQL (puedes hacerlos apenas termines la etapa 2), pipelines de punta a punta, incidentes de guardia y laboratorios en la nube.', mods: ['casos', 'pipelines', 'incidentes', 'laboratorios'] },
    { id: 'e8', titulo: '💼 Trabajo real · Tu portafolio y tu primer empleo', desc: 'Proyectos para mostrar, el proyecto final y cómo prepararte para las entrevistas.', mods: ['portafolio', 'proyecto'] },
    { id: 'e9', titulo: 'Opcional · Certificaciones', desc: 'Preparación para las certificaciones de Databricks, Azure, AWS y Google Cloud. Mejor después de la etapa 5.', mods: ['cert-databricks', 'cert-azure', 'cert-aws', 'cert-gcp'] },
  ];
  function etapasConModulos() {
    const usados = new Set();
    const out = ETAPAS.map((e) => ({ ...e, modulos: e.mods.map((id) => C.modulos.find((m) => m.id === id)).filter(Boolean) }));
    out.forEach((e) => e.modulos.forEach((m) => usados.add(m.id)));
    const resto = C.modulos.filter((m) => !usados.has(m.id));
    if (resto.length) out.push({ id: 'otros', titulo: 'Más módulos', desc: '', modulos: resto });
    return out.filter((e) => e.modulos.length);
  }

  // ritmo: lectura (duración de cada lección) + unos 3 minutos por ejercicio, a 1 hora por día
  const MIN_POR_EJERCICIO = 3;
  function horasEtapa(e) {
    const min = e.modulos.reduce((s, m) => s + m.lecciones.reduce((t, l) => t + l.duracion + l.ejercicios.length * MIN_POR_EJERCICIO, 0), 0);
    return Math.round(min / 60);
  }
  const semanas = (horas) => Math.max(1, Math.round(horas / 7));

  // ---------------------------------------------------------------- prueba de diagnóstico
  // Cuatro bloques en el orden de la ruta. Se recomienda empezar en la etapa del primer bloque que no se aprueba.
  const DIAG = [
    { etapa: 'e1', nombre: 'Terminal, archivos y Git', minimo: 2, preguntas: [
      { q: 'En una terminal, ¿qué hace el comando <code>cd datos</code>?', o: ['Borra la carpeta <code>datos</code>', 'Entra a la carpeta <code>datos</code>', 'Crea un archivo llamado <code>datos</code>', 'Muestra el contenido de <code>datos</code>'], ok: 1 },
      { q: '¿Qué es un archivo CSV?', o: ['Un programa que se ejecuta con doble clic', 'Una base de datos con contraseña', 'Un archivo de texto con una fila por línea y los valores separados por comas', 'Una imagen comprimida'], ok: 2 },
      { q: 'En Git, ¿para qué sirve un <i>commit</i>?', o: ['Para guardar una "foto" de los cambios con un mensaje que explica qué cambió', 'Para borrar el historial', 'Para instalar programas', 'Para enviar un correo al equipo'], ok: 0 },
    ] },
    { etapa: 'e2', nombre: 'SQL', minimo: 3, preguntas: [
      { q: '¿Qué devuelve <code>SELECT nombre FROM clientes WHERE pais = \'Chile\'</code>?', o: ['Todas las columnas de todos los clientes', 'Cuántos clientes hay en Chile', 'Los nombres de los clientes cuyo país es Chile', 'Un error: falta <code>ORDER BY</code>'], ok: 2 },
      { q: 'Quieres la cantidad de pedidos de cada canal. ¿Qué consulta usas?', o: ['<code>SELECT canal, COUNT(*) FROM pedidos GROUP BY canal</code>', '<code>SELECT COUNT(canal) FROM pedidos</code>', '<code>SELECT canal FROM pedidos ORDER BY canal</code>', '<code>SELECT DISTINCT canal FROM pedidos</code>'], ok: 0 },
      { q: 'Algunos clientes no tienen teléfono (está en <code>NULL</code>). ¿Qué pasa con <code>WHERE telefono = NULL</code>?', o: ['Devuelve los clientes sin teléfono', 'No devuelve ninguna fila: hay que escribir <code>IS NULL</code>', 'Devuelve todos los clientes', 'Da un error de sintaxis'], ok: 1 },
      { q: '<code>clientes LEFT JOIN pedidos</code> devuelve…', o: ['Solo los clientes que tienen pedidos', 'Solo los pedidos sin cliente', 'Todos los clientes, tengan o no pedidos', 'Una fila por cliente, sin repetir'], ok: 2 },
    ] },
    { etapa: 'e3', nombre: 'Python', minimo: 2, preguntas: [
      { q: '¿Qué resultado da <code>[x * 2 for x in [1, 2, 3] if x > 1]</code>?', o: ['<code>[2, 4, 6]</code>', '<code>[4, 6]</code>', '<code>[1, 2, 3]</code>', '<code>[2, 3]</code>'], ok: 1 },
      { q: '¿Qué pasa al ejecutar <code>int("12.5")</code>?', o: ['Devuelve <code>12</code>', 'Devuelve <code>13</code>', 'Devuelve <code>12.5</code>', 'Lanza un <code>ValueError</code>'], ok: 3 },
      { q: 'Con <code>d = {"a": 1}</code>, ¿qué devuelve <code>d.get("b", 0)</code>?', o: ['<code>0</code>', '<code>1</code>', '<code>None</code>', 'Lanza un <code>KeyError</code>'], ok: 0 },
    ] },
    { etapa: 'e4', nombre: 'Spark, dbt y Airflow', minimo: 2, preguntas: [
      { q: 'En Spark, escribes <code>df2 = df.filter(df.monto > 100)</code> y nada más. ¿Qué pasó?', o: ['Se filtraron todas las filas en el clúster', 'Nada todavía: es una transformación y se ejecuta cuando pidas un resultado (una acción)', 'Se borraron las filas con monto menor a 100', 'Se guardó una tabla nueva'], ok: 1 },
      { q: 'En un modelo de dbt, ¿para qué sirve <code>{{ ref(\'stg_pedidos\') }}</code>?', o: ['Para leer un archivo CSV', 'Para crear un usuario en la base', 'Para nombrar otro modelo: dbt pone el nombre real de la tabla y sabe que debe construirlo antes', 'Para ejecutar un test'], ok: 2 },
      { q: 'En Airflow, ¿qué es un DAG?', o: ['Un tipo de base de datos', 'Un conjunto de tareas con sus dependencias, que se ejecutan en orden y según un horario', 'Un archivo de configuración de Spark', 'Un tablero de métricas'], ok: 1 },
    ] },
  ];
  function viewDiagnostico() {
    const resp = {};
    const total = DIAG.reduce((s, b) => s + b.preguntas.length, 0);
    let n = 0;
    main.innerHTML = `<div class="container prose">
      <div class="crumbs not-prose"><a href="#/">Inicio</a><span>/</span><a href="#/ruta">Ruta</a><span>/</span><span>Diagnóstico</span></div>
      <h1>🧭 ¿Por dónde empiezo?</h1>
      <p>Si ya sabes algo de SQL, Python o de las herramientas de datos, esta prueba de <b>${total} preguntas</b> (unos 5 minutos) te dice en qué etapa conviene empezar. Si no sabes la respuesta, elige <b>"No lo sé"</b>: adivinar solo hace que el resultado te mande a un lugar donde te vas a trabar.</p>
      ${Store.data.diagnostico ? `<div class="callout"><b>Ya hiciste el diagnóstico</b> el ${new Date(Store.data.diagnostico.fecha).toLocaleDateString('es')}: te recomendó empezar en <b>${esc((ETAPAS.find((e) => e.id === Store.data.diagnostico.etapa) || {}).titulo || '')}</b>. Puedes repetirlo cuando quieras.</div>` : ''}
      <form id="diag" class="not-prose">${DIAG.map((b, bi) => `<h2 class="etapa-title">Bloque ${bi + 1} · ${esc(b.nombre)}</h2>` + b.preguntas.map((p, pi) => { n++; const k = `${bi}-${pi}`; return `<div class="card" style="padding:14px 18px;margin:10px 0"><p style="margin:0 0 6px"><b>${n}.</b> ${p.q}</p><div class="quiz-opts">${[...p.o, 'No lo sé'].map((o, oi) => `<label class="quiz-opt"><input type="radio" name="d${k}" value="${oi}"><span>${o}</span></label>`).join('')}</div></div>`; }).join('')).join('')}
      <p><button class="btn btn-primary btn-lg" type="submit">Ver mi resultado →</button></p></form>
      <div id="diagRes"></div>
    </div>`;
    $('#diag').addEventListener('change', (e) => { if (e.target.name) resp[e.target.name.slice(1)] = Number(e.target.value); });
    $('#diag').addEventListener('submit', (e) => {
      e.preventDefault();
      const faltan = total - Object.keys(resp).length;
      if (faltan) { toast(`Te ${faltan === 1 ? 'falta 1 pregunta' : `faltan ${faltan} preguntas`} (puedes elegir "No lo sé")`); return; }
      const puntajes = DIAG.map((b, bi) => b.preguntas.filter((p, pi) => resp[`${bi}-${pi}`] === p.ok).length);
      // se marca cada opción para que se vea qué estuvo bien
      DIAG.forEach((b, bi) => b.preguntas.forEach((p, pi) => $$(`input[name="d${bi}-${pi}"]`).forEach((inp) => {
        const lab = inp.closest('.quiz-opt'); const v = Number(inp.value);
        if (v === p.ok) lab.classList.add('right'); else if (inp.checked) lab.classList.add('wrong');
        inp.disabled = true;
      })));
      const fallo = DIAG.findIndex((b, bi) => puntajes[bi] < b.minimo);
      const etapaId = fallo === -1 ? 'e5' : DIAG[fallo].etapa;
      Store.data.diagnostico = { fecha: Date.now(), etapa: etapaId, puntajes };
      Store.save();
      const etapa = etapasConModulos().find((x) => x.id === etapaId);
      const primerMod = etapa.modulos[0];
      const primeraLec = primerMod.lecciones.find((l) => !Store.lessonDone(l)) || primerMod.lecciones[0];
      const saltadas = etapasConModulos().filter((x) => ETAPAS.findIndex((y) => y.id === x.id) < ETAPAS.findIndex((y) => y.id === etapaId));
      $('#diagRes').innerHTML = `<h2>Tu resultado</h2>
        <table><thead><tr><th>Bloque</th><th>Correctas</th><th>Para aprobar</th><th></th></tr></thead><tbody>${DIAG.map((b, bi) => `<tr><td>${esc(b.nombre)}</td><td>${puntajes[bi]} de ${b.preguntas.length}</td><td>${b.minimo}</td><td>${puntajes[bi] >= b.minimo ? '✅' : '📚'}</td></tr>`).join('')}</tbody></table>
        <div class="callout"><p style="margin-top:0"><b>Te recomendamos empezar en: ${esc(etapa.titulo)}</b></p><p>${esc(etapa.desc)}</p>
        <p class="not-prose"><a class="btn btn-primary btn-largo" href="#/l/${primeraLec.id}">Empezar: ${esc(primeraLec.titulo)} →</a> <a class="btn" href="#/ruta">Ver la ruta</a></p></div>
        ${saltadas.length ? `<p>Las etapas anteriores las puedes saltear. Si quieres confirmarlo, rinde el <b>examen de cada módulo</b> sin hacer las lecciones: si lo apruebas, ese módulo ya lo dominas.</p><ul>${saltadas.map((x) => `<li>${esc(x.titulo)}: ${x.modulos.map((m) => `<a href="#/m/${m.id}">${m.icono} ${esc(m.titulo)}</a>`).join(', ')}</li>`).join('')}</ul>` : '<p>Empieza por el principio: el curso está pensado justamente para eso, y cada palabra nueva se explica cuando aparece.</p>'}`;
      $('#diagRes').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ---------------------------------------------------------------- sidebar
  // etapa en la que está quien estudia: la de la primera lección sin terminar (o la que recomendó el diagnóstico)
  function etapaDeModulo(id) { return etapasConModulos().find((e) => e.modulos.some((m) => m.id === id)); }
  // retomar: la última lección que abriste si no la terminaste; si la terminaste, la próxima sin terminar después de ella
  function siguienteLeccion() {
    const vis = Object.entries(Store.data.visited || {}).filter(([id]) => LESSON_BY_ID.has(id)).sort((a, b) => b[1] - a[1]);
    if (vis.length) {
      const ult = LESSON_BY_ID.get(vis[0][0]);
      if (!Store.lessonDone(ult)) return ult;
      const sig = LESSONS.slice(LESSONS.indexOf(ult) + 1).find((l) => !Store.lessonDone(l));
      if (sig) return sig;
    }
    return LESSONS.find((l) => !Store.lessonDone(l)) || LESSONS[0];
  }
  function etapaActual() {
    const empezo = totalProgress().done > 0 || Object.keys(Store.data.ex).length > 0;
    if (!empezo && Store.data.diagnostico) { const e = etapasConModulos().find((x) => x.id === Store.data.diagnostico.etapa); if (e) return e; }
    return etapaDeModulo(siguienteLeccion().modulo.id) || etapasConModulos()[0];
  }
  function progresoEtapa(e) {
    const ls = e.modulos.flatMap((m) => m.lecciones);
    const done = ls.filter((l) => Store.lessonDone(l)).length;
    return { done, total: ls.length, pct: ls.length ? Math.round((done / ls.length) * 100) : 0 };
  }
  // "Etapa 2 · SQL, el idioma de los datos" → { num: '2', nombre: 'SQL, el idioma de los datos' }
  function partesEtapa(e) {
    const m = /^Etapa\s+(\d+)\s*·\s*(.*)$/.exec(e.titulo);
    if (m) return { num: m[1], nombre: m[2] };
    const o = /^(.*?)\s*·\s*(.*)$/.exec(e.titulo);
    return o ? { num: '★', nombre: o[2] + (o[1] ? ' (' + o[1].toLowerCase() + ')' : '') } : { num: '•', nombre: e.titulo };
  }

  // ---------------------------------------------------------------- sidebar
  // Como en la documentación de MDN o Docusaurus: las etapas se pliegan y solo queda abierta la tuya,
  // así el menú no es una lista eterna de 27 módulos.
  const LABS_MENU = [
    ['#/databricks', '🧱', 'Databricks', 'databricks', 'apps'],
    ['#/azure', '☁️', 'Portal de Azure', 'azure', 'apps'],
    ['#/github', '🐙', 'GitHub', 'github', 'apps'],
    ['#/fabric', '🟩', 'Microsoft Fabric', 'fabric', 'apps'],
    ['#/airflow', '🌀', 'Airflow', 'airflow', 'apps'],
    ['#/snowflake', '❄️', 'Snowflake', 'snowflake', 'apps'],
    ['#/bigquery', '🔎', 'BigQuery', 'bigquery', 'apps'],
    ['#/jupyter', '📓', 'JupyterLab', 'jupyter', 'apps'],
    ['#/powerbi', '📊', 'Power BI Desktop', 'powerbi', 'apps'],
    ['#/vscode', '🟦', 'VS Code', 'vscode', 'apps'],
    ['#/lab/terminal', '⌨️', 'Terminal', 'lab-terminal', 'apps'],
    ['#/lab/sql', '🧪', 'SQL', 'lab-sql'],
    ['#/lab/python', '🐍', 'Python', 'lab-python'], ['#/lab/pyspark', '⚡', 'PySpark', 'lab-pyspark'],
    ['#/lab/dbt', '🔧', 'dbt', 'lab-dbt'], ['#/lab/airflow', '🌬️', 'Airflow', 'lab-airflow'],
    ['#/modelado', '📐', 'Modelado de datos', 'modelado'], ['#/generador', '🏭', 'Generador de datos', 'generador'],
    ['#/trabajo', '💼', 'Tu primer trabajo (simulación)', 'trabajo'],
  ];
  function renderSidebar(route) {
    const sb = $('#sidebar');
    const cur = route.lesson ? route.lesson.modulo.id : route.module ? route.module.id : null;
    const fueraDelCurso = LABS_MENU.some((x) => x[3] === route.name) || ['herramientas', 'notas', 'datos', 'glosario', 'repaso', 'examenes', 'examen', 'certificaciones', 'simulacro', 'claves', 'plan', 'progreso', 'revisar-repo', 'trabajo'].includes(route.name);
    const etapaAbierta = cur ? etapaDeModulo(cur) : fueraDelCurso ? null : etapaActual();
    const link = (href, ico, text, active, meta = '') => `<a class="side-link ${active ? 'active' : ''}" href="${href}"><span class="ico">${ico}</span><span>${text}</span>${meta ? `<span class="meta">${meta}</span>` : ''}</a>`;
    let html = link('#/', '🏠', 'Inicio', route.name === 'home');
    html += link('#/ruta', '🧭', 'Ruta de aprendizaje', route.name === 'ruta');
    html += link('#/diagnostico', '🎯', '¿Por dónde empiezo?', route.name === 'diagnostico');
    html += '<div class="side-section">El curso, por etapas</div>';
    for (const etapa of etapasConModulos()) {
      const pe = progresoEtapa(etapa), pt = partesEtapa(etapa);
      const abierta = etapaAbierta && etapa.id === etapaAbierta.id;
      const hecha = pe.total && pe.done === pe.total;
      html += `<details class="side-stage ${hecha ? 'hecha' : ''}" data-etapa="${etapa.id}" ${abierta ? 'open' : ''}>
        <summary title="${esc(etapa.desc)}"><span class="st-num">${hecha ? '✓' : esc(pt.num)}</span><span class="st-name">${esc(pt.nombre)}</span><span class="meta">${pe.done}/${pe.total}</span><span class="chev">▶</span></summary>`;
      for (const m of etapa.modulos) {
        const p = moduleProgress(m);
        const open = m.id === cur;
        html += `<div class="side-module ${open ? 'open' : ''}" data-mod="${m.id}">
          <button class="side-link ${open && route.name === 'module' ? 'active' : ''}" data-toggle="${m.id}"><span class="ico">${m.icono}</span><span>${esc(m.titulo)}</span><span class="meta">${p.done}/${p.total}</span><span class="chev">▶</span></button>
          <div class="side-lessons">`;
        let lastLevel = null;
        for (const l of m.lecciones) {
          if (l.nivel !== lastLevel) { html += `<div class="side-level">${esc(l.nivel)}</div>`; lastLevel = l.nivel; }
          const d = Store.lessonDone(l);
          html += `<a href="#/l/${l.id}" data-lesson="${l.id}" class="${route.lesson === l ? 'active' : ''} ${d ? 'done' : ''}"><span class="dot">${d ? '✓' : '○'}</span><span>${esc(l.titulo)}</span></a>`;
        }
        html += '</div></div>';
      }
      html += '</details>';
    }
    const enLab = LABS_MENU.some((x) => x[3] === route.name) || route.name === 'herramientas';
    html += `<details class="side-stage side-extra" ${enLab ? 'open' : ''}><summary><span class="st-num">🧰</span><span class="st-name">Herramientas de práctica</span><span class="chev">▶</span></summary>${link('#/herramientas', '🧰', 'Todas las herramientas', route.name === 'herramientas')}<div class="side-sub">Réplicas de las reales</div>${LABS_MENU.filter((x) => x[4] === 'apps').map((x) => link(x[0], x[1], x[2], route.name === x[3])).join('')}<div class="side-sub">Laboratorios y simulaciones</div>${LABS_MENU.filter((x) => x[4] !== 'apps').map((x) => link(x[0], x[1], x[2], route.name === x[3])).join('')}</details>`;
    const RECURSOS = ['notas', 'datos', 'glosario', 'repaso', 'examenes', 'examen', 'certificaciones', 'simulacro', 'claves', 'plan', 'progreso', 'mis-datos', 'cuenta', 'revisar-repo'];
    html += `<details class="side-stage side-extra" ${RECURSOS.includes(route.name) ? 'open' : ''}><summary><span class="st-num">📚</span><span class="st-name">Recursos y repaso</span><span class="chev">▶</span></summary>`;
    html += link('#/notas', '📝', 'Mis notas', route.name === 'notas', window.Notas ? String(window.Notas.contar()) : '');
    html += link('#/datos', '🗃️', 'Bases de datos', route.name === 'datos');
    html += link('#/glosario', '📖', 'Glosario', route.name === 'glosario');
    html += link('#/repaso', '🃏', 'Tarjetas de repaso', route.name === 'repaso');
    html += link('#/examenes', '📝', 'Exámenes y certificado', route.name === 'examenes' || route.name === 'examen');
    if ((C.certificaciones || []).length) html += link('#/certificaciones', '🏅', 'Certificaciones', route.name === 'certificaciones' || route.name === 'simulacro' || route.name === 'claves' || route.name === 'plan');
    html += link('#/revisar-repo', '🔎', 'Revisar mi proyecto en GitHub', route.name === 'revisar-repo');
    html += link('#/progreso', '📈', 'Mi progreso', route.name === 'progreso');
    html += link('#/mis-datos', '🗂️', 'Mis datos', route.name === 'mis-datos');
    if (window.Sitio && window.Sitio.hayCuentas()) html += link('#/cuenta', '☁️', 'Mi cuenta', route.name === 'cuenta');
    html += '</details>';
    html += '<div class="nav-legal"><a href="#/privacidad">Privacidad</a><span>·</span><a href="#/terminos">Términos de uso</a></div>';
    sb.innerHTML = html;
    $$('[data-toggle]', sb).forEach((b) => b.addEventListener('click', () => {
      const mod = b.closest('.side-module');
      if (!mod.classList.contains('open')) location.hash = '#/m/' + b.dataset.toggle;
      else mod.classList.remove('open');
    }));
    const act = $('.side-lessons a.active', sb) || $('.side-link.active', sb);
    if (act && act.offsetParent) act.scrollIntoView({ block: 'center' });
  }
  function refreshSidebarState() {
    for (const a of $$('#sidebar [data-lesson]')) {
      const l = LESSON_BY_ID.get(a.dataset.lesson);
      const d = Store.lessonDone(l);
      a.classList.toggle('done', d); $('.dot', a).textContent = d ? '✓' : '○';
    }
    for (const m of C.modulos) {
      const el = $(`#sidebar [data-mod="${m.id}"] .meta`);
      if (el) { const p = moduleProgress(m); el.textContent = `${p.done}/${p.total}`; }
    }
    for (const e of etapasConModulos()) {
      const el = $(`#sidebar [data-etapa="${e.id}"] > summary .meta`);
      if (el) { const p = progresoEtapa(e); el.textContent = `${p.done}/${p.total}`; }
    }
    if (typeof repintarIndice === 'function') repintarIndice();
  }

  // ---------------------------------------------------------------- vistas
  const main = $('#main');
  const totalEx = ALL_EX.length;

  // aviso en la portada: tarjetas vencidas o, si avanzaste y hace una semana que no repasas, el repaso semanal
  function avisoRepaso(tp) {
    const c = Object.values(Store.data.cards || {}), hoy = c.filter((t) => t.due <= Date.now()).length;
    const dias = Store.data.ultimoRepaso ? Math.floor((Date.now() - Store.data.ultimoRepaso) / 86400000) : null;
    if (c.length && hoy) return `<div class="callout"><b>🃏 Tienes ${hoy} ${hoy === 1 ? 'tarjeta' : 'tarjetas'} para repasar hoy.</b> Son unos minutos y es lo que hace que lo aprendido no se olvide. <a href="#/repaso">Repasar ahora →</a></div>`;
    if (tp.done >= 3 && (dias === null || dias >= 7)) return `<div class="callout"><b>🗓 Repaso semanal.</b> ${dias === null ? 'Todavía no usaste las tarjetas de repaso.' : `Hace ${dias} días que no repasas.`} Diez minutos de tarjetas fijan lo que aprendiste esta semana. <a href="#/repaso">Empezar el repaso →</a></div>`;
    return '';
  }
  // Herramientas de práctica: las réplicas de las aplicaciones reales, los laboratorios y las simulaciones.
  // modulos: dónde se usa cada una (para mostrarla en el módulo y en sus lecciones).
  const HERRAMIENTAS = [
    { id: 'databricks', g: 'apps', href: '#/databricks', ico: '🧱', nombre: 'Databricks', real: 'Databricks (workspace en Azure, AWS o GCP)', desc: 'El workspace completo: notebooks con SQL y PySpark reales, Unity Catalog, editor SQL, compute, jobs y pipelines declarativos.', puedes: ['Notebooks con %sql y Python (Spark en tu navegador), display() y dbutils', 'Tablas Delta con historial, MERGE, time travel, COPY INTO y QUALIFY', 'Jobs con tareas, dependencias y reparación; pipelines con expectativas y AUTO CDC', 'Exportar todo como Asset Bundle (databricks.yml) para desplegarlo en un workspace real'], modulos: ['databricks', 'genie', 'interfaces', 'cert-databricks', 'portafolio', 'laboratorios', 'spark', 'pyspark'], rutas: ['databricks'] },
    { id: 'azure', g: 'apps', href: '#/azure', ico: '☁️', nombre: 'Portal de Azure', real: 'portal.azure.com', desc: 'Suscripción de práctica con grupos de recursos, asistentes de creación, Storage, Key Vault, Databricks, Data Factory, costos y Cloud Shell.', puedes: ['Crear recursos con el asistente (Basics → Review + create) y ver el despliegue', 'Contenedores y blobs, secretos con RBAC, bloqueos, etiquetas y registro de actividad', 'Data Factory Studio: Copy, Notebook, Get Metadata, Lookup, ForEach, If, expresiones y exportación a ARM template', 'Cloud Shell con la CLI az conectada al mismo estado'], modulos: ['azure', 'interfaces', 'cert-azure', 'terraform', 'portafolio', 'laboratorios', 'arquitectura'], rutas: ['azure'] },
    { id: 'github', g: 'apps', href: '#/github', ico: '🐙', nombre: 'GitHub', real: 'github.com', desc: 'Repositorios, issues, pull requests con revisión, GitHub Actions que corre de verdad, protección de ramas, secretos y Pages, conectado a la terminal: lo que subes con git push aparece al instante.', puedes: ['Código, commits, blame, ramas y editar archivos en el navegador', 'Pull requests: Files changed, comentarios por línea, revisiones de compañeros, merge/squash/rebase y conflictos', 'Actions: workflows YAML que corren pytest y ruff en un runner, checks que bloquean el merge', 'Protección de main, secretos enmascarados, Pages y gh pr / gh issue / gh run en la terminal'], modulos: ['fundamentos', 'local', 'dbt', 'terraform', 'airflow', 'portafolio', 'proyecto', 'pipelines', 'interfaces'], rutas: ['github'] },
    { id: 'fabric', g: 'apps', href: '#/fabric', ico: '🟩', nombre: 'Microsoft Fabric', real: 'app.fabric.microsoft.com', desc: 'Workspaces con lakehouse (Files, Tables, Load to Tables, atajos), SQL analytics endpoint de solo lectura, warehouse con T-SQL, notebooks con PySpark, pipelines, modelo semántico, Monitor e integración con Git.', puedes: ['Subir archivos a Files y convertirlos en tablas Delta con Load to Tables', 'Consultar con el SQL analytics endpoint y escribir en un warehouse con nombres de tres partes', 'Transformar con un notebook de PySpark y orquestar con un pipeline', 'Conectar el workspace a un repositorio del GitHub de práctica y hacer commit'], modulos: ['azure', 'cert-azure', 'interfaces', 'arquitectura'], rutas: ['fabric'] },
    { id: 'airflow', g: 'apps', href: '#/airflow', ico: '🌀', nombre: 'Airflow', real: 'la interfaz web de Apache Airflow 3', desc: 'La interfaz de Airflow 3 con tus DAGs de verdad: los lee de ~/airflow/dags en la terminal, los analiza con Python y los ejecuta. Grid, Graph, logs por intento, Trigger con parámetros, backfill, assets, variables y conexiones.', puedes: ['Despausar y disparar DAGs, ver la Grid y el Graph en vivo', 'Leer el log de una tarea que falla, arreglar el archivo en la terminal y hacer Clear', 'Programar por datos: un DAG que actualiza un asset dispara otro', 'Variables, Connections, Pools, backfill y el comando airflow en la terminal'], modulos: ['airflow', 'pipelines', 'proyecto', 'interfaces', 'local'], rutas: ['airflow'] },
    { id: 'snowflake', g: 'apps', href: '#/snowflake', ico: '❄️', nombre: 'Snowflake', real: 'Snowsight (app.snowflake.com)', desc: 'Hojas de SQL con el dialecto de Snowflake sobre la base del curso, warehouses virtuales que cobran créditos, bases y esquemas, stages con COPY INTO, Time Travel, UNDROP, clones, roles y Query History.', puedes: ['Ejecutar SQL con contexto de rol, warehouse, base y esquema (Ctrl+Enter)', 'Crear warehouses, ver cuándo se suspenden y cuántos créditos gastaste', 'Subir archivos a un stage y cargarlos con COPY INTO sin duplicar', 'Recuperar datos con Time Travel (BEFORE/AT) y tablas con UNDROP; dar permisos con roles'], modulos: ['sql', 'arquitectura', 'interfaces', 'modelado'], rutas: ['snowflake'] },
    { id: 'bigquery', g: 'apps', href: '#/bigquery', ico: '🔎', nombre: 'BigQuery', real: 'la consola de BigQuery en Google Cloud', desc: 'El editor de BigQuery con su validador: te dice cuántos bytes va a procesar la consulta antes de ejecutarla, que es lo que se cobra. Datasets y tablas, particiones y clustering, caché de resultados, cargas desde archivo, historial de jobs y una página de costos.', puedes: ['Ver cómo cambian los bytes al nombrar columnas, filtrar por la partición o usar SELECT *', 'Crear tablas con PARTITION BY, CLUSTER BY y require_partition_filter', 'Cargar un CSV a una tabla y explorar su esquema, detalles y vista previa (gratis)', 'Encontrar tus consultas más caras y proyectar su costo a tamaño de empresa'], modulos: ['gcp', 'cert-gcp', 'sql', 'interfaces', 'arquitectura'], rutas: ['bigquery'] },
    { id: 'jupyter', g: 'apps', href: '#/jupyter', ico: '📓', nombre: 'JupyterLab', real: 'JupyterLab 4 (el entorno de notebooks del Proyecto Jupyter)', desc: 'Notebooks de Python que se ejecutan de verdad en tu navegador: celdas de código y Markdown, tablas de pandas, gráficos de matplotlib, magics como %timeit y !ls, explorador de archivos con los datos del curso en CSV y los mismos atajos de teclado.', puedes: ['Analizar los CSV del curso con pandas y graficar con matplotlib', 'Usar el modo comando (A, B, D D, M, Y) y el modo edición como en el real', 'Reiniciar el kernel, ejecutar todo y entender por qué importa el orden de las celdas', 'Descargar tus notebooks en formato .ipynb y abrirlos en un JupyterLab real'], modulos: ['python', 'analisis', 'interfaces', 'portafolio', 'local'], rutas: ['jupyter'] },
    { id: 'powerbi', g: 'apps', href: '#/powerbi', ico: '📊', nombre: 'Power BI Desktop', real: 'Power BI Desktop', desc: 'Importa CSV, Excel o las bases del curso, transforma con Power Query, modela relaciones, escribe DAX y arma el informe.', puedes: ['Power Query con pasos aplicados y M', 'Modelo con relaciones, medidas y columnas calculadas (motor DAX con contexto de filtro)', '23 objetos visuales, mapa, seguridad por filas (RLS) y grupos de cálculo', 'Exportar el modelo en TMDL (carpeta de proyecto .pbip) para Power BI Desktop'], modulos: ['powerbi', 'interfaces', 'analisis', 'casos'], rutas: ['powerbi'] },
    { id: 'vscode', g: 'apps', href: '#/vscode', ico: '🟦', nombre: 'VS Code', real: 'Visual Studio Code', desc: 'El editor con temas e íconos del repositorio oficial, terminal integrada, Git, problemas, esquema, editor dividido y diff.', puedes: ['Abrir carpetas del disco de práctica (o code . desde la terminal)', 'Editar con Monaco, el mismo editor de VS Code, y ejecutar Python o SQL', 'Control de código fuente, extensiones y ajustes'], modulos: ['local', 'python', 'dbt', 'airflow', 'fundamentos', 'proyecto'], rutas: ['vscode'] },
    { id: 'terminal', g: 'apps', href: '#/lab/terminal', ico: '⌨️', nombre: 'Terminal', real: 'bash en Linux/macOS', desc: 'Una terminal con disco propio: bash, git, docker, vim y las CLIs de Azure, AWS, Google Cloud, Databricks y Terraform.', puedes: ['Misiones guiadas de cero a experto', 'git con ramas, conflictos y un remoto de práctica', 'az, aws, gcloud, databricks y terraform con estado compartido con los portales'], modulos: ['cero', 'fundamentos', 'local', 'azure', 'aws', 'gcp', 'terraform', 'incidentes'], rutas: ['lab-terminal'] },
    { id: 'notas', g: 'apps', href: '#/notas', ico: '📝', nombre: 'Notas', real: 'Notion / Obsidian', desc: 'Tus apuntes en Markdown con enlaces entre notas, una nota por lección y búsqueda.', puedes: ['Una nota por lección, enlazada desde cada lección', 'Markdown con vista previa, enlaces [[entre notas]] y etiquetas', 'Exportar todo como archivos .md'], modulos: [], rutas: ['notas'] },
    { id: 'lab-sql', g: 'labs', href: '#/lab/sql', ico: '🧪', nombre: 'SQL', desc: 'SQLite, PostgreSQL, DuckDB, MySQL y SQL Server sobre las 13 empresas del curso.', modulos: ['sql', 'casos', 'analisis', 'modelado'], rutas: ['lab-sql'] },
    { id: 'lab-python', g: 'labs', href: '#/lab/python', ico: '🐍', nombre: 'Python', desc: 'Python 3 real (Pyodide) con pandas.', modulos: ['python'], rutas: ['lab-python'] },
    { id: 'lab-pyspark', g: 'labs', href: '#/lab/pyspark', ico: '⚡', nombre: 'PySpark', desc: 'La API de DataFrames de Spark con las tablas del curso.', modulos: ['spark', 'pyspark'], rutas: ['lab-pyspark'] },
    { id: 'lab-dbt', g: 'labs', href: '#/lab/dbt', ico: '🔧', nombre: 'dbt', desc: 'Modelos, ref() y Jinja compilado a SQL.', modulos: ['dbt'], rutas: ['lab-dbt'] },
    { id: 'lab-airflow', g: 'labs', href: '#/lab/airflow', ico: '🌬️', nombre: 'Airflow', desc: 'DAGs, operadores y dependencias.', modulos: ['airflow'], rutas: ['lab-airflow'] },
    { id: 'modelado', g: 'sim', href: '#/modelado', ico: '📐', nombre: 'Modelado de datos', desc: 'Del requerimiento al modelo, la validación y el DDL.', modulos: ['modelado', 'arquitectura'], rutas: ['modelado'] },
    { id: 'generador', g: 'sim', href: '#/generador', ico: '🏭', nombre: 'Generador de datos', desc: 'Datasets realistas (y sucios) para tus proyectos, en CSV, JSON o SQL.', modulos: ['portafolio', 'proyecto'], rutas: ['generador'] },
    { id: 'trabajo', g: 'sim', href: '#/trabajo', ico: '💼', nombre: 'Tu primer trabajo', desc: 'Una semana simulada: tickets, PR con revisión y una guardia.', modulos: ['proyecto', 'incidentes'], rutas: ['trabajo'] },
    { id: 'revisar-repo', g: 'sim', href: '#/revisar-repo', ico: '🔎', nombre: 'Revisar mi proyecto', desc: 'Tu repositorio de GitHub evaluado como en una entrevista.', modulos: ['proyecto', 'portafolio'], rutas: ['revisar-repo'] },
  ];
  const GRUPOS_H = { apps: ['Réplicas de las herramientas del trabajo', 'Se ven y se usan como las reales, pero corren en tu navegador: no necesitas cuenta, tarjeta ni instalar nada.'], labs: ['Laboratorios de código', 'Misiones guiadas de cero a experto, o práctica libre.'], sim: ['Diseño y simulaciones', 'Para pensar como en el trabajo: modelar, generar datos y resolver tickets.'] };
  // herramientas que una lección usa: las que enlaza en su texto y las de su módulo
  const herrLeccionCache = new Map();
  function herramientasDe(l) {
    if (herrLeccionCache.has(l.id)) return herrLeccionCache.get(l.id);
    const r = HERRAMIENTAS.filter((x) => x.g === 'apps' && ((l.enlaces || []).some((u) => u.startsWith(x.href)) || (x.modulos.includes(l.modulo.id) && x.id !== 'notas' && (x.id !== 'terminal' || l.ejercicios.some((e) => e.type === 'cli')))));
    herrLeccionCache.set(l.id, r); return r;
  }
  function viewHerramientas() {
    const usos = (x) => LESSONS.filter((l) => (l.enlaces || []).some((u) => u.startsWith(x.href))).length;
    const card = (x) => {
      const mods = x.modulos.map((id) => MODULE_BY_ID.get(id)).filter(Boolean);
      const n = usos(x);
      return `<article class="herr-card herr-${x.g}">
        <a class="hc-cab" href="${x.href}"><span class="hc-ico">${x.ico}</span><span><b>${esc(x.nombre)}</b>${x.real ? `<small>Réplica de ${esc(x.real)}</small>` : ''}</span></a>
        <p>${esc(x.desc)}</p>
        ${x.puedes ? `<ul class="hc-puedes">${x.puedes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${mods.length || n ? `<div class="hc-usos">${mods.length ? `<span class="small muted">Se usa en:</span> ${mods.slice(0, 5).map((m) => `<a class="chip" href="#/m/${m.id}">${m.icono} ${esc(m.titulo.split(':')[0])}</a>`).join('')}` : ''}${n ? ` <span class="small muted">· ${n} ${n === 1 ? 'lección la enlaza' : 'lecciones la enlazan'}</span>` : ''}</div>` : ''}
        <a class="btn btn-primary btn-sm hc-abrir" href="${x.href}">Abrir ${esc(x.nombre)} →</a>
      </article>`;
    };
    main.innerHTML = `<div class="container herramientas">
      <div class="crumbs"><a href="#/">Inicio</a><span>/</span><span>Herramientas de práctica</span></div>
      <h1>🧰 Herramientas de práctica</h1>
      <p class="lead muted">Todo lo que usa un ingeniero de datos, para practicar sin cuentas ni costos. Lo que hagas queda guardado <b>en este navegador</b> y cada herramienta tiene un botón para empezar de cero. Las lecciones te mandan a la herramienta justa en el momento justo.</p>
      ${Object.entries(GRUPOS_H).map(([g, [t, d]]) => `<section class="home-sec"><div class="sec-cab"><h2>${esc(t)}</h2></div><p class="muted sec-sub">${esc(d)}</p><div class="herr-grid ${g === 'apps' ? '' : 'herr-grid-chica'}">${HERRAMIENTAS.filter((x) => x.g === g).map(card).join('')}</div></section>`).join('')}
      <div class="callout"><p style="margin:0"><b>¿Y las herramientas de verdad?</b> Cuando quieras pasar a las reales, el módulo <a href="#/m/local">Desde tu computadora</a> te guía para instalar VS Code, Python y Git, y <a href="#/m/laboratorios">Laboratorios guiados en la nube</a> para usar Azure, AWS, Google Cloud y Databricks con cuentas gratuitas, cuidando el costo.</p></div>
    </div>`;
  }
  // Portada: una sola acción principal, "continúa donde quedaste" y la ruta en etapas plegables.
  // Ideas tomadas de plataformas educativas: botón de retomar en un clic (Coursera, Codecademy, Alison),
  // camino por etapas con tu posición marcada (Duolingo, roadmap.sh) y revelar el detalle solo cuando
  // se pide (divulgación progresiva), para no mostrar 27 módulos de golpe.
  function viewHome() {
    const tp = totalProgress();
    const nextLesson = siguienteLeccion();
    const started = tp.done > 0 || Object.keys(Store.data.ex).length > 0;
    const actual = etapaActual();
    const nm = nextLesson.modulo, pm = moduleProgress(nm);
    const continuar = started ? `<section class="continuar card">
        <div class="ct-ico" style="background:color-mix(in srgb, ${nm.color} 18%, var(--surface))">${nm.icono}</div>
        <div class="ct-txt"><div class="ct-k">Continúa donde quedaste</div><div class="ct-t">${esc(nextLesson.titulo)}</div>
          <div class="ct-m">${esc(nm.titulo)} · lección ${nm.lecciones.indexOf(nextLesson) + 1} de ${nm.lecciones.length}</div>
          <div class="bar"><i style="width:${pm.pct}%;background:${nm.color}"></i></div></div>
        <div class="ct-acc"><a class="btn btn-primary btn-lg" href="#/l/${nextLesson.id}">Continuar →</a><span class="small muted">Llevas ${tp.done} de ${tp.total} lecciones (${tp.pct}%)</span></div>
      </section>${bloqueRacha()}` : '';
    let paso = 0;
    const etapas = etapasConModulos().map((e) => {
      const pe = progresoEtapa(e), pt = partesEtapa(e), es = actual && e.id === actual.id, hecha = pe.total && pe.done === pe.total;
      const hr = horasEtapa(e);
      const mods = e.modulos.map((m) => {
        const p = moduleProgress(m); paso++;
        return `<a class="mod-row" href="#/m/${m.id}"><span class="mr-ico" style="background:color-mix(in srgb, ${m.color} 16%, var(--surface))">${m.icono}</span>
          <span class="mr-txt"><b>${esc(m.titulo)}</b><small>${esc(m.descripcion)}</small></span>
          <span class="mr-meta"><span>${m.lecciones.length} lecciones</span><span class="bar"><i style="width:${p.pct}%;background:${m.color}"></i></span></span></a>`;
      }).join('');
      return `<li class="camino-paso ${es ? 'actual' : ''} ${hecha ? 'hecha' : ''}"><details ${es ? 'open' : ''}>
        <summary><span class="cp-nodo">${hecha ? '✓' : esc(pt.num)}</span><span class="cp-txt"><b>${esc(pt.nombre)}</b>${es ? ' <span class="badge b-type">Estás aquí</span>' : ''}<small>${esc(e.desc)}</small></span>
          <span class="cp-meta"><span>${e.modulos.length} ${e.modulos.length === 1 ? 'módulo' : 'módulos'} · ~${hr} h</span><span class="bar"><i style="width:${pe.pct}%"></i></span></span><span class="chev">▶</span></summary>
        <div class="cp-mods">${mods}</div></details></li>`;
    }).join('');
    main.innerHTML = `<div class="container home">
      <section class="hero hero-compacto">
        <span class="badge b-type">Gratis · En español · Desde cero</span>
        <h1>De no saber nada a <span class="grad">ingeniero/a de datos</span>.</h1>
        <p class="lead">Aprende el oficio que mueve los datos de una empresa —desde una compra en una app hasta el tablero de la gerencia— practicando <b>aquí mismo, en tu navegador</b>, sin instalar nada. Cada palabra nueva se explica cuando aparece.</p>
        ${started ? '' : `<div class="row">
          <a class="btn btn-primary btn-lg" href="#/l/${nextLesson.id}">Empezar desde cero →</a>
          <a class="btn btn-lg" href="#/diagnostico">🎯 Ya sé algo: ¿por dónde empiezo?</a>
        </div>`}
        <p class="hero-cifras">${C.modulos.length} módulos · ${LESSONS.length} lecciones · ${totalEx.toLocaleString('es')} ejercicios corregidos al instante · +500.000 filas de 13 empresas ficticias</p>
      </section>
      ${continuar}
      ${avisoRepaso(tp)}
      <section class="home-sec">
        <div class="sec-cab"><h2>Tu camino, en ${etapasConModulos().length} etapas</h2><a class="small" href="#/ruta">Ver la ruta con tiempos y objetivos →</a></div>
        <p class="muted sec-sub">Cada etapa se apoya en la anterior. Abre una etapa para ver sus módulos; la tuya ya está abierta.</p>
        <ol class="camino">${etapas}</ol>
      </section>
      <section class="home-sec">
        <div class="sec-cab"><h2>Las herramientas del trabajo, en tu navegador</h2><a class="small" href="#/herramientas">Ver todas las herramientas →</a></div>
        <p class="muted sec-sub">Réplicas de Databricks, el portal de Azure, Power BI, VS Code y la terminal para practicar sin cuentas ni costos. Si rompes algo, un botón lo deja como nuevo.</p>
        <div class="herr-home">${HERRAMIENTAS.filter((x) => x.g === 'apps' && x.id !== 'notas').map((x) => `<a class="herr-tile" href="${x.href}"><span class="ht-ico">${x.ico}</span><b>${esc(x.nombre)}</b><small>${esc(x.desc)}</small></a>`).join('')}</div>
        <div class="labs-grid labs-grid-chica">${HERRAMIENTAS.filter((x) => x.g !== 'apps').map((x) => `<a class="lab-tile" href="${x.href}"><span class="lt-ico">${x.ico}</span><b>${esc(x.nombre)}</b><small>${esc(x.desc)}</small></a>`).join('')}</div>
      </section>
      <section class="home-sec">
        <div class="sec-cab"><h2>Cómo se aprende aquí</h2></div>
        <ol class="pasos-como">
          <li><b>Lee</b><span>Explicaciones simples con analogías, diagramas y un caso real de una empresa.</span></li>
          <li><b>Prueba</b><span>Cada ejemplo tiene <b>▶ Probar</b>: lo ejecutas y ves qué pasa con los datos.</span></li>
          <li><b>Resuelve</b><span>Ejercicios corregidos al instante, con pistas y la solución explicada.</span></li>
          <li><b>Repasa</b><span>Tarjetas de repaso espaciado, exámenes por módulo y un certificado final.</span></li>
        </ol>
      </section>
      <details class="home-mas card">
        <summary>¿Por qué estas herramientas y en este orden?</summary>
        <div class="prose"><p>Un <b>ingeniero de datos</b> construye “tuberías” (pipelines) que llevan los datos desde donde nacen (apps, ventas, sensores) hasta donde se usan (reportes, modelos de IA). <b>SQL</b> es el idioma universal de los datos; <b>Python</b> automatiza todo; <b>Spark/PySpark</b> procesa volúmenes enormes repartiendo el trabajo entre muchas máquinas; <b>Databricks</b> es la plataforma donde corre Spark en la nube; <b>dbt</b> organiza las transformaciones SQL como un proyecto de software; <b>Airflow</b> programa y coordina cuándo se ejecuta cada paso; y las tres grandes nubes (<b>Azure</b>, <b>AWS</b> y <b>Google Cloud</b>) ponen el almacenamiento, el cómputo y los servicios de datos, que se controlan desde la terminal con sus CLIs (<code>az</code>, <code>aws</code>, <code>gcloud</code>, <code>bq</code>, <code>databricks</code>).</p><p>Los conceptos se repiten en todas las nubes con otros nombres: un lago de archivos (ADLS, S3, Cloud Storage), un catálogo de tablas, SQL sin servidores (Athena, BigQuery), Spark administrado (Databricks, Glue/EMR, Dataproc), streaming (Event Hubs, Kinesis, Pub/Sub) y Airflow administrado. Aprenderlos una vez te sirve para las tres.</p></div>
      </details>
    </div>`;
  }

  function viewRuta() {
    main.innerHTML = `<div class="container prose">
      <h1>🧭 Ruta de aprendizaje</h1>
      ${(() => { const E = etapasConModulos(), hs = (ids) => E.filter((e) => ids.includes(e.id)).reduce((s, e) => s + horasEtapa(e), 0); const h14 = hs(['e1', 'e2', 'e3', 'e4']), h18 = hs(['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8']);
        return `<p>Este es el camino recomendado si empiezas de cero, organizado en etapas. Cada paso se apoya en el anterior. Dedicando <b>1 hora al día</b>, las etapas 1 a 4 llevan unas <b>${semanas(h14)} semanas</b> (unos ${Math.round(semanas(h14) / 4.3)} meses) y las etapas 1 a 8, unas <b>${semanas(h18)} semanas</b>. Las cuentas suman el tiempo de lectura de cada lección y unos ${MIN_POR_EJERCICIO} minutos por ejercicio: tómalas como una guía, no como una meta. No hay prisa: lo importante es <b>practicar</b>.</p>`; })()}
      <div class="callout"><p style="margin-top:0"><b>¿Ya sabes algo de SQL, Python o Spark?</b> ${Store.data.diagnostico ? `Tu diagnóstico recomendó empezar en <b>${esc((ETAPAS.find((e) => e.id === Store.data.diagnostico.etapa) || {}).titulo || '')}</b>.` : 'Haz la prueba de diagnóstico: 13 preguntas, unos 5 minutos, y te dice en qué etapa conviene empezar.'}</p><p class="not-prose"><a class="btn btn-sm" href="#/diagnostico">${Store.data.diagnostico ? 'Repetir el diagnóstico' : 'Hacer el diagnóstico →'}</a></p></div>
      <div class="callout"><p style="margin-top:0"><b>Repaso semanal.</b> Una vez por semana, dedica 10 minutos a las <a href="#/repaso">tarjetas de repaso</a> y vuelve a resolver, sin mirar, dos ejercicios de la semana anterior. Lo que no se repasa se olvida en pocas semanas; con repasos cortos y espaciados queda.</p></div>
      <div class="path not-prose">${C.modulos.map((m, i) => `${i ? '<span class="arr">→</span>' : ''}<a href="#/m/${m.id}">${m.icono} ${esc(m.titulo)}</a>`).join('')}</div>
      ${(() => { let i = 0; return etapasConModulos().map((e) => { const hr = horasEtapa(e); return `<h2 class="etapa-title">${esc(e.titulo)}</h2>${e.desc ? `<p><i>${esc(e.desc)}</i></p>` : ''}<p class="muted small">⏱ Unas ${hr} horas de lectura y práctica: <b>${semanas(hr)} ${semanas(hr) === 1 ? 'semana' : 'semanas'}</b> a 1 hora por día.${Store.data.diagnostico && Store.data.diagnostico.etapa === e.id ? ' · 📍 <b>Tu diagnóstico recomienda empezar aquí</b>' : ''}</p>` + e.modulos.map((m) => {
        const p = moduleProgress(m); i++;
        const levels = [...new Set(m.lecciones.map((l) => l.nivel))];
        return `<h3>Paso ${i}: ${m.icono} ${esc(m.titulo)} <span class="badge">${p.done}/${p.total}</span></h3>
        <p>${esc(m.descripcion)}</p>
        ${m.objetivos ? `<p><b>Al terminar podrás:</b></p><ul>${m.objetivos.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
        <p class="muted small">Niveles: ${levels.map(esc).join(' → ')} · ${m.lecciones.reduce((s, l) => s + l.duracion, 0)} min aprox.</p>
        <p><a class="btn btn-sm" href="#/m/${m.id}">Ver lecciones →</a></p>`;
      }).join(''); }).join(''); })()}
      <h2>Consejos para no abandonar</h2>
      <ul><li>Escribe el código tú mismo, no lo copies: la memoria muscular importa.</li><li>Si un ejercicio te frustra, pide una pista, descansa 5 minutos y vuelve.</li><li>Repasa: vuelve a resolver ejercicios viejos sin mirar la solución.</li><li>Usa los laboratorios para experimentar libremente: no puedes romper nada.</li><li>Cuando termines, arma un proyecto propio y súbelo a GitHub para tu portafolio.</li></ul>
    </div>`;
  }

  function viewModule(m) {
    const p = moduleProgress(m);
    let lastLevel = null, html = '';
    m.lecciones.forEach((l, i) => {
      if (l.nivel !== lastLevel) { html += `<h3 style="margin:26px 0 10px"><span class="badge ${levelClass(l.nivel)}">${esc(l.nivel)}</span></h3>`; lastLevel = l.nivel; }
      const d = Store.lessonDone(l);
      html += `<a class="card lesson-row ${d ? 'done' : ''}" href="#/l/${l.id}"><span class="num">${d ? '✓' : i + 1}</span><span class="t"><b>${esc(l.titulo)}</b><small>${esc(l.resumen || '')}</small></span><span class="small muted">${l.ejercicios.length ? l.ejercicios.length + ' ej. · ' : ''}${l.duracion} min</span></a>`;
    });
    const first = m.lecciones.find((l) => !Store.lessonDone(l)) || m.lecciones[0];
    main.innerHTML = `<div class="container">
      <div class="crumbs"><a href="#/">Inicio</a><span>/</span><span>${esc(m.titulo)}</span></div>
      <div class="module-head"><span class="mc-ico">${m.icono}</span><div><h1 style="margin:0">${esc(m.titulo)}</h1><div class="muted">${m.lecciones.length} lecciones · ${p.pct}% completado</div></div></div>
      <div class="prose"><p>${esc(m.descripcion)}</p>${m.intro || ''}</div>
      ${(() => { const hs = HERRAMIENTAS.filter((x) => x.modulos.includes(m.id) && x.g === 'apps' && x.id !== 'notas'); return hs.length ? `<div class="mod-herr"><span class="small muted">🧰 En este módulo practicas con:</span> ${hs.map((x) => `<a class="chip chip-herr" href="${x.href}">${x.ico} ${esc(x.nombre)}</a>`).join('')}</div>` : ''; })()}
      <div class="bar" style="margin:10px 0 6px"><i style="width:${p.pct}%;background:${m.color}"></i></div>
      ${first ? `<p><a class="btn btn-primary btn-largo" href="#/l/${first.id}">${p.done ? 'Continuar' : 'Empezar'}: ${esc(first.titulo)} →</a></p>` : '<p class="muted">Contenido en preparación.</p>'}
      <div class="lesson-list">${html}</div>
      ${examenModulo(m)}
    </div>`;
  }
  function examenModulo(m) {
    return (C.examenes || []).filter((e) => e.modulo === m.id).map((x) => {
      const n = (Store.data.exams || {})[x.id];
      const est = !n ? 'Comprueba lo que aprendiste' : n.best >= 70 ? `✓ Aprobado · mejor nota ${n.best}%` : `Mejor nota ${n.best}% · se aprueba con 70%`;
      return `<a class="card lesson-row examen-row ${n && n.best >= 70 ? 'done' : ''}" href="#/examen/${x.id}"><span class="num">${x.titulo ? '🏅' : '📝'}</span><span class="t"><b>${x.titulo ? 'Examen de práctica: ' + esc(x.titulo) : 'Examen del módulo'}</b><small>${x.preguntas.length} preguntas · ${est}</small></span><span class="small muted">Rendir →</span></a>`;
    }).join('');
  }

  // objetivos de aprendizaje y prerrequisitos al inicio de la lección
  function lessonIntro(l) {
    if (!l.objetivos.length && !l.prerrequisitos.length) return '';
    const pre = l.prerrequisitos.map((id) => LESSONS.find((x) => x.id === id)).filter(Boolean);
    return `<div class="lesson-intro">
      ${l.objetivos.length ? `<div><div class="li-title">🎯 Al terminar esta lección vas a poder</div><ul>${l.objetivos.map((o) => `<li>${o}</li>`).join('')}</ul></div>` : ''}
      ${pre.length ? `<div class="li-pre"><div class="li-title">📚 Antes conviene haber hecho</div><ul>${pre.map((p) => `<li><a href="#/l/${p.id}">${esc(p.titulo)}</a>${Store.lessonDone(p) ? ' <span class="ok-mark">✓</span>' : ''}</li>`).join('')}</ul></div>` : ''}
    </div>`;
  }

  // ---------------------------------------------------------------- glosario en línea
  // La primera vez que aparece un término del glosario en una lección, queda subrayado: al pasar el mouse
  // (o tocarlo en el celular) muestra la explicación simple. Así nadie tiene que saber la palabra de antes.
  const GL_EXCLUIR = new Set(['dato', 'tabla', 'fila', 'columna', 'lista', 'clase', 'tarea', 'nube', 'región', 'rol', 'secreto',
    'estado', 'plan', 'módulo', 'rama', 'imagen', 'output', 'entidad', 'vista', 'índice', 'función', 'bucle', 'alias', 'métrica', 'consola', 'editor']);
  let glRegex = null, glPorForma = null;
  function prepararGlosarioEnLinea() {
    if (glRegex) return;
    glPorForma = new Map();
    const formas = [];
    for (const g of C.glosario || []) {
      for (const parte of g.termino.split(' / ')) {
        const f = parte.replace(/\s*\(.*?\)\s*/g, '').trim();
        if (f.length < 2 || GL_EXCLUIR.has(f.toLowerCase())) continue;
        if (!glPorForma.has(f.toLowerCase())) { glPorForma.set(f.toLowerCase(), g); formas.push(f); }
      }
    }
    formas.sort((a, b) => b.length - a.length);
    const escR = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // las siglas cortas (SQL, ETL, DAG) solo en mayúsculas; el resto sin distinguir mayúsculas
    const largas = formas.filter((f) => f.length > 4 || /[a-záéíóúñ]/.test(f)).map(escR);
    const siglas = formas.filter((f) => f.length <= 4 && !/[a-záéíóúñ]/.test(f)).map(escR);
    glRegex = { largas: largas.length ? new RegExp(`(^|[^\\p{L}\\p{N}_])(${largas.join('|')})(?![\\p{L}\\p{N}_])`, 'iu') : null,
                siglas: siglas.length ? new RegExp(`(^|[^\\p{L}\\p{N}_])(${siglas.join('|')})(?![\\p{L}\\p{N}_])`, 'u') : null };
  }
  function glosarioEnLinea(root) {
    if (!(C.glosario || []).length) return;
    prepararGlosarioEnLinea();
    const vistos = new Set();
    const SALTAR = 'pre, code, a, h1, h2, h3, h4, .callout-title, figure, .recorrido, .motores, .lesson-intro, .ex, .exercise, .autoeval, button, .gl, .tab-bar';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (!n.nodeValue.trim() || n.parentElement.closest(SALTAR)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodos = [];
    while (walker.nextNode()) nodos.push(walker.currentNode);
    let marcados = 0;
    for (const nodo of nodos) {
      if (marcados >= 25) break;
      let texto = nodo.nodeValue, frag = null, pos = 0, guard = 0;
      while (guard++ < 20) {
        const resto = texto.slice(pos);
        const cand = [glRegex.largas, glRegex.siglas].filter(Boolean).map((re) => re.exec(resto)).filter(Boolean)
          .sort((a, b) => a.index - b.index);
        const m = cand.find((x) => { const g = glPorForma.get(x[2].toLowerCase()); return g && !vistos.has(g.termino); });
        if (!m) break;
        const g = glPorForma.get(m[2].toLowerCase());
        vistos.add(g.termino); marcados++;
        frag = frag || document.createDocumentFragment();
        const ini = pos + m.index + m[1].length;
        frag.append(texto.slice(pos, ini));
        const span = document.createElement('span');
        span.className = 'gl'; span.tabIndex = 0; span.dataset.term = g.termino; span.textContent = m[2];
        frag.append(span);
        pos = ini + m[2].length;
        if (marcados >= 25) break;
      }
      if (frag) { frag.append(texto.slice(pos)); nodo.replaceWith(frag); }
    }
    let pop = null;
    const cerrar = () => { if (pop) { pop.remove(); pop = null; } };
    const abrir = (el) => {
      cerrar();
      const g = (C.glosario || []).find((x) => x.termino === el.dataset.term); if (!g) return;
      pop = document.createElement('div');
      pop.className = 'gl-pop';
      pop.innerHTML = `<div class="gl-pop-t">📖 ${esc(g.termino)}</div>${g.nino || g.que}<a href="#/glosario?q=${encodeURIComponent(g.termino)}">Ver la ficha completa en el glosario →</a>`;
      document.body.append(pop);
      const r = el.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 24);
      pop.style.width = w + 'px';
      pop.style.left = Math.max(12, Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - w - 12)) + 'px';
      pop.style.top = (r.bottom + window.scrollY + 6) + 'px';
      pop.addEventListener('mouseleave', cerrar);
    };
    for (const el of root.querySelectorAll('.gl')) {
      el.addEventListener('mouseenter', () => abrir(el));
      el.addEventListener('focus', () => abrir(el));
      el.addEventListener('click', (e) => { e.stopPropagation(); pop && pop.dataset.t === el.dataset.term ? cerrar() : (abrir(el), pop && (pop.dataset.t = el.dataset.term)); });
      el.addEventListener('mouseleave', (e) => { if (!pop || !pop.contains(e.relatedTarget)) setTimeout(() => { if (pop && !pop.matches(':hover') && !el.matches(':hover')) cerrar(); }, 150); });
    }
    document.addEventListener('click', (e) => { if (pop && !pop.contains(e.target)) cerrar(); });
    window.addEventListener('hashchange', cerrar, { once: true });
  }

  // ---------------------------------------------------------------- índice de la lección
  // Como MDN, Stripe Docs o Docusaurus: a la derecha, las secciones de la lección (la actual resaltada)
  // y los ejercicios como casilleros numerados (verde = resuelto), estilo "checkpoints" de Codecademy
  // o DataCamp. En pantallas angostas el mismo índice queda plegado arriba. Una barra fina bajo la
  // cabecera muestra cuánto de la lección llevas leído.
  let repintarIndice = null;
  const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'seccion';
  function montarIndice(l, body) {
    const usados = new Set();
    const secs = $$(':scope > h2', body).concat($$('#resumenFinal > h2, #autoEval > h2', body)).map((h2) => {
      if (!h2.id) { let id = slug(h2.textContent), k = 2; while (usados.has(id) || document.getElementById(id)) id = slug(h2.textContent) + '-' + k++; h2.id = id; }
      usados.add(h2.id);
      return { el: h2, id: h2.id, t: h2.textContent.replace(/^[^\p{L}\p{N}¿¡]+/u, '').trim() };
    });
    const ejs = $$('.exercise', body);
    const cuerpo = () => `${secs.length ? `<ol class="ind-secs">${secs.map((x) => `<li><a href="#${x.id}" data-sec="${x.id}">${esc(x.t)}</a></li>`).join('')}</ol>` : ''}
      ${ejs.length ? `<div class="indice-t ind-ej-t">Ejercicios <span class="muted" data-ej-cuenta></span></div><div class="ind-ejs">${ejs.map((e, i) => `<a href="#${esc(e.id)}" data-ej="${esc(e.id)}" title="${esc($('.ex-head h4', e)?.textContent || 'Ejercicio ' + (i + 1))}">${i + 1}</a>`).join('')}</div>` : ''}
      <div class="ind-acc"><a class="small" href="#/notas?leccion=${l.id}">📝 Mis notas de esta lección</a></div>`;
    const hosts = [$('#indiceLateral .indice-cuerpo'), $('#indiceMovil .indice-cuerpo')].filter(Boolean);
    if (!secs.length && !ejs.length) { $('#indiceLateral')?.remove(); $('#indiceMovil')?.remove(); $('.leccion-layout')?.classList.add('sin-indice'); return; }
    hosts.forEach((hst) => { hst.innerHTML = cuerpo(); });
    // los enlaces del índice usan el ancla (#id), que en este sitio cambiaría la ruta: se desplaza a mano
    $$('.indice a[data-sec], .indice a[data-ej]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const dest = document.getElementById(a.dataset.sec || a.dataset.ej);
      if (dest) dest.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      const mov = $('#indiceMovil'); if (mov && a.closest('#indiceMovil')) mov.open = false;
    }));
    repintarIndice = () => {
      let n = 0;
      for (const e of ejs) { const ok = Store.exDone(e.id); if (ok) n++; $$(`.indice [data-ej="${CSS.escape(e.id)}"]`).forEach((a) => a.classList.toggle('ok', ok)); }
      $$('[data-ej-cuenta]').forEach((x) => { x.textContent = `${n}/${ejs.length}`; });
    };
    repintarIndice();
    // sección actual: la última cuyo título ya pasó por arriba de la pantalla
    const barra = $('#lecturaPct');
    const alDesplazar = () => {
      if (!body.isConnected) { window.removeEventListener('scroll', alDesplazar); return; }
      const tope = 120;
      let act = secs.length ? secs[0].id : null;
      for (const x of secs) if (x.el.getBoundingClientRect().top - tope <= 0) act = x.id;
      $$('.indice [data-sec]').forEach((a) => a.classList.toggle('activa', a.dataset.sec === act));
      let ejAct = null;
      for (const e of ejs) { const r = e.getBoundingClientRect(); if (r.top < window.innerHeight * 0.5 && r.bottom > 80) ejAct = e.id; }
      $$('.indice [data-ej]').forEach((a) => a.classList.toggle('activa', a.dataset.ej === ejAct));
      if (barra) {
        const r = body.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
        barra.style.width = Math.max(0, Math.min(100, total > 0 ? (-r.top / total) * 100 : 100)) + '%';
      }
    };
    window.addEventListener('scroll', alDesplazar, { passive: true });
    alDesplazar();
  }

  // Resumen al final de las lecciones largas que no traen uno propio: qué secciones recorriste (con
  // enlaces para volver), qué deberías poder hacer ahora y cuánta práctica te queda.
  function resumenFinal(l, body, next) {
    const h2s = $$(':scope > h2', body);
    if (l.html.length < 14000 || h2s.length < 3) return;
    if (h2s.some((x) => /resumen|para llevar|repaso final|qu[eé] aprendiste|cierre/i.test(x.textContent))) return;
    const usados = new Set();
    for (const x of h2s) { if (!x.id) { let id = slug(x.textContent), k = 2; while (usados.has(id) || document.getElementById(id)) id = slug(x.textContent) + '-' + k++; x.id = id; } usados.add(x.id); }
    const secs = h2s.filter((x) => !/^\W*ejercicios\b/i.test(x.textContent.trim()));
    const ejs = l.ejercicios.filter((e) => e.type !== 'abierto'), hechos = ejs.filter((e) => Store.exDone(e.id)).length;
    const sec = h(`<section class="resumen-final" id="resumenFinal"><h2>🧭 Resumen de la lección</h2>
      <div class="rf-grid">
        <div><h3>Lo que recorriste</h3><ol>${secs.map((x) => `<li><a href="#${x.id}" data-rf="${x.id}">${esc(x.textContent.replace(/^[^\p{L}\p{N}¿¡]+/u, '').trim())}</a></li>`).join('')}</ol></div>
        ${(l.objetivos || []).length ? `<div><h3>Ahora deberías poder</h3><ul class="rf-obj">${l.objetivos.map((o) => `<li>${o}</li>`).join('')}</ul></div>` : ''}
      </div>
      <p class="rf-pie">${ejs.length ? (hechos === ejs.length ? `✅ Resolviste los ${ejs.length} ejercicios.` : `✍️ Resolviste <b>${hechos} de ${ejs.length}</b> ejercicios: <a href="#${esc((ejs.find((e) => !Store.exDone(e.id)) || ejs[0]).id)}" data-rf-ej>ir al primero pendiente</a>.`) : ''} ${next ? `Sigue con <a href="#/l/${next.id}">${esc(next.titulo)}</a>.` : ''}</p>
    </section>`);
    sec.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href').startsWith('#/')) return; e.preventDefault(); const el = document.getElementById(a.getAttribute('href').slice(1)); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const ae = $('#autoEval', body);
    if (ae) body.insertBefore(sec, ae); else body.append(sec);
  }

  function viewLesson(l) {
    const m = l.modulo;
    const idx = LESSONS.indexOf(l);
    const prev = LESSONS[idx - 1], next = LESSONS[idx + 1];
    Store.data.visited[l.id] = Date.now(); Store.saveSoon();
    const nLec = m.lecciones.indexOf(l) + 1, pmod = moduleProgress(m);
    main.innerHTML = `<div class="lectura-barra" aria-hidden="true"><i id="lecturaPct"></i></div>
    <div class="leccion-layout">
    <div class="leccion-col">
      <div class="crumbs"><a href="#/">Inicio</a><span>/</span><a href="#/m/${m.id}">${m.icono} ${esc(m.titulo)}</a><span>/</span><span>Lección ${nLec} de ${m.lecciones.length}</span></div>
      <div class="mod-progreso" title="Avance del módulo ${esc(m.titulo)}"><span class="bar"><i style="width:${pmod.pct}%;background:${m.color}"></i></span><span class="small muted">${pmod.done} de ${pmod.total} lecciones del módulo</span></div>
      <details class="indice indice-movil" id="indiceMovil"><summary>📑 En esta lección</summary><div class="indice-cuerpo"></div></details>
      <article class="prose" id="lessonBody">
        <h1>${esc(l.titulo)}</h1>
        <div class="lesson-meta"><span class="badge ${levelClass(l.nivel)}">${esc(l.nivel)}</span><span class="badge">⏱ ${l.duracion} min</span>${l.ejercicios.length ? `<span class="badge">✍️ ${l.ejercicios.length} ejercicio${l.ejercicios.length > 1 ? 's' : ''}</span>` : ''}<a class="badge badge-link" href="#/notas?leccion=${l.id}" title="Abrir o crear tus apuntes de esta lección">📝 Mis notas</a>${herramientasDe(l).slice(0, 3).map((x) => `<a class="badge badge-link badge-herr" href="${x.href}" title="Practica esta lección en ${esc(x.nombre)} (réplica en tu navegador)">${x.ico} ${esc(x.nombre)}</a>`).join('')}<a class="badge badge-link" href="leccion/${l.id}.html" target="_blank" rel="noopener" title="Página de esta lección para compartir: se ve bien en redes y en buscadores">🔗 Compartir</a>${enlaceReporte(l.titulo, `**Lección:** ${l.titulo}\n**Dirección:** ${location.href}`)}</div>
        ${lessonIntro(l)}
        ${l.html}
        ${l.autoevaluacion.length ? `<section class="autoeval" id="autoEval"><h2>✅ Autoevaluación</h2><p class="muted">Marca solo lo que puedas hacer <b>sin mirar la lección</b>. Si dudas en algo, vuelve a esa parte: esto es lo que se pregunta en una entrevista o se usa el primer día de trabajo.</p>${l.autoevaluacion.map((q, i) => `<label class="auto-item"><input type="checkbox" data-auto="${i}"><span>${q}</span></label>`).join('')}<div class="small muted" id="autoCount"></div></section>` : ''}
      </article>
      <div class="card lesson-done-bar" id="doneBar"></div>
      <nav class="lesson-nav">
        ${prev ? `<a href="#/l/${prev.id}"><small>← Anterior</small>${esc(prev.titulo)}</a>` : '<span></span>'}
        ${next ? `<a class="next" href="#/l/${next.id}"><small>Siguiente →</small>${esc(next.titulo)}</a>` : '<a class="next" href="#/progreso"><small>¡Fin!</small>Ver mi progreso</a>'}
      </nav>
    </div>
    <aside class="indice indice-lateral" id="indiceLateral" aria-label="En esta lección"><div class="indice-t">En esta lección</div><div class="indice-cuerpo"></div></aside>
    </div>`;
    const body = $('#lessonBody');
    glosarioEnLinea(body);
    enhanceCode(body);
    enhanceMotores(body);
    if (window.Diagramas) window.Diagramas.dibujar(body);
    if (window.Recorrido) window.Recorrido.montar(body);
    // cada lección con ejercicios de terminal empieza como una terminal recién abierta: en ~ y sin entorno
    // virtual (los archivos y el historial se conservan). Así un ejercicio de Azure no hereda la carpeta
    // ni el .venv de la lección de dbt.
    const Sh = window.Shell;
    if (Sh && l.ejercicios.some((e) => e.type === 'cli')) {
      if (!Sh.Machine.ready) Sh.Machine.load();
      if (Sh.Machine.ultimaLeccion !== l.id) {
        Sh.Machine.ultimaLeccion = l.id;
        Sh.Machine.cwd = Sh.HOME;
        delete Sh.Machine.env.VIRTUAL_ENV;
        Sh.Machine.save();
        document.dispatchEvent(new CustomEvent('term-config'));   // refresca el prompt de las terminales abiertas
      }
    }
    $$('.exercise-slot', body).forEach((slot) => {
      const k = Number(slot.dataset.ex);
      mountExercise(slot, l.ejercicios[k], k + 1);
    });
    resumenFinal(l, body, next);
    montarIndice(l, body);
    const ae = $('#autoEval');
    if (ae) {
      const marks = (Store.data.auto = Store.data.auto || {})[l.id] = Store.data.auto[l.id] || [];
      const count = () => { const n = marks.length; $('#autoCount', ae).textContent = n === l.autoevaluacion.length ? '🎉 ¡Dominas todos los objetivos de esta lección!' : `${n} de ${l.autoevaluacion.length}`; };
      $$('[data-auto]', ae).forEach((cb) => {
        const i = Number(cb.dataset.auto); cb.checked = marks.includes(i);
        cb.addEventListener('change', () => { const k = marks.indexOf(i); if (cb.checked && k < 0) marks.push(i); if (!cb.checked && k >= 0) marks.splice(k, 1); Store.saveSoon(); count(); });
      });
      count();
    }
    const bar = $('#doneBar');
    const paint = () => {
      const d = Store.lessonDone(l);
      const pend = l.ejercicios.filter((e) => !Store.exDone(e.id)).length;
      bar.innerHTML = d
        ? `<span style="font-size:22px">🎉</span><div><b>Lección completada.</b><div class="small muted">¡Bien hecho! Sigue con la próxima.</div></div><span class="spacer"></span>${next ? `<a class="btn btn-primary" href="#/l/${next.id}">Siguiente lección →</a>` : ''}`
        : `<span style="font-size:22px">📌</span><div><b>¿Terminaste?</b><div class="small muted">${pend ? `Te quedan ${pend} ejercicio(s) por resolver. También puedes marcarla manualmente.` : 'Marca la lección como completada.'}</div></div><span class="spacer"></span><button class="btn btn-ok" data-mark>✓ Marcar como completada</button>`;
      $('[data-mark]', bar)?.addEventListener('click', () => { Store.setLessonDone(l.id); refreshSidebarState(); paint(); });
    };
    paint();
    repaintLessonBar = paint;
  }

  // ---------------------------------------------------------------- laboratorios
  const SQL_SAMPLES = [
    ['Primeros pasos', 'SELECT * FROM clientes LIMIT 10;'],
    ['Ventas por año', "SELECT strftime('%Y', p.fecha_pedido) AS anio,\n       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas\nFROM pedidos p\nJOIN detalle_pedidos d ON d.pedido_id = p.pedido_id\nWHERE p.estado <> 'cancelado'\nGROUP BY anio\nORDER BY anio;"],
    ['Top 10 productos', 'SELECT pr.nombre, SUM(d.cantidad) AS unidades\nFROM detalle_pedidos d\nJOIN productos pr ON pr.producto_id = d.producto_id\nGROUP BY pr.nombre\nORDER BY unidades DESC\nLIMIT 10;'],
    ['Ranking con ventanas', 'SELECT pais, ciudad, COUNT(*) AS clientes,\n       RANK() OVER (PARTITION BY pais ORDER BY COUNT(*) DESC) AS puesto\nFROM clientes\nGROUP BY pais, ciudad\nORDER BY pais, puesto;'],
    ['Jerarquía (CTE recursiva)', "WITH RECURSIVE org AS (\n  SELECT empleado_id, nombre, cargo, jefe_id, 0 AS nivel\n  FROM empleados WHERE jefe_id IS NULL\n  UNION ALL\n  SELECT e.empleado_id, e.nombre, e.cargo, e.jefe_id, org.nivel + 1\n  FROM empleados e JOIN org ON e.jefe_id = org.empleado_id\n)\nSELECT substr('            ', 1, nivel * 3) || nombre AS arbol, cargo, nivel\nFROM org ORDER BY nivel, nombre LIMIT 40;"],
    ['Ver el plan de ejecución', "EXPLAIN QUERY PLAN\nSELECT * FROM pedidos WHERE cliente_id = 42;"],
    ['Listar tablas', "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY type, name;"]
  ];
  const PY_SAMPLES = [
    ['Hola mundo', 'nombre = "Ada"\nprint(f"Hola, {nombre}! Bienvenida a Python 🐍")\n\nfor i in range(1, 4):\n    print("Vuelta", i)'],
    ['Listas y diccionarios', 'ventas = [120.5, 99.9, 310.0, 45.25]\nprint("Total:", sum(ventas))\nprint("Promedio:", round(sum(ventas) / len(ventas), 2))\n\ncliente = {"nombre": "Lucía", "pais": "Chile", "compras": 7}\nfor clave, valor in cliente.items():\n    print(clave, "->", valor)'],
    ['Funciones', 'def precio_final(precio, descuento=0.0, iva=0.21):\n    """Aplica descuento y luego IVA."""\n    return round(precio * (1 - descuento) * (1 + iva), 2)\n\nprint(precio_final(100))\nprint(precio_final(100, descuento=0.1))'],
    ['Leer CSV desde texto', 'import csv, io\n\ntexto = """producto,unidades,precio\nMouse,3,25.5\nTeclado,1,49.9\nMonitor,2,210\n"""\nfilas = list(csv.DictReader(io.StringIO(texto)))\ntotal = sum(int(f["unidades"]) * float(f["precio"]) for f in filas)\nprint(f"Facturación: {total:.2f}")'],
    ['Clases', 'class CuentaBancaria:\n    def __init__(self, titular, saldo=0):\n        self.titular = titular\n        self.saldo = saldo\n\n    def depositar(self, monto):\n        if monto <= 0:\n            raise ValueError("El monto debe ser positivo")\n        self.saldo += monto\n\n    def __repr__(self):\n        return f"CuentaBancaria({self.titular!r}, saldo={self.saldo})"\n\nc = CuentaBancaria("Mateo")\nc.depositar(500)\nprint(c)']
  ];
  const SPARK_SAMPLES = [
    ['Explorar una tabla', 'from pyspark.sql import SparkSession\nfrom pyspark.sql import functions as F\n\nspark = SparkSession.builder.appName("lab").getOrCreate()\n\npedidos = spark.table("pedidos")\npedidos.printSchema()\npedidos.show(5)\nprint("Filas:", pedidos.count())'],
    ['Agrupar y agregar', 'from pyspark.sql import functions as F\n\ndet = spark.table("detalle_pedidos")\nprod = spark.table("productos")\n\n(det.join(prod, "producto_id")\n    .withColumn("importe", F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento")))\n    .groupBy("marca")\n    .agg(F.round(F.sum("importe"), 2).alias("ventas"), F.countDistinct("pedido_id").alias("pedidos"))\n    .orderBy(F.desc("ventas"))\n    .show(10))'],
    ['Funciones de ventana', 'from pyspark.sql import functions as F\nfrom pyspark.sql.window import Window\n\nw = Window.partitionBy("cliente_id").orderBy("fecha_pedido")\n(spark.table("pedidos")\n    .withColumn("n_compra", F.row_number().over(w))\n    .withColumn("compra_anterior", F.lag("fecha_pedido").over(w))\n    .filter(F.col("cliente_id") == 7)\n    .select("cliente_id", "pedido_id", "fecha_pedido", "n_compra", "compra_anterior")\n    .show())'],
    ['Spark SQL', 'spark.table("clientes").createOrReplaceTempView("cli")\n\nspark.sql("""\n    SELECT pais, segmento, COUNT(*) AS n\n    FROM cli\n    GROUP BY pais, segmento\n    ORDER BY n DESC\n""").show(8)'],
    ['Crear un DataFrame', 'from pyspark.sql import functions as F\n\ndatos = [("Ana", "Ventas", 3200), ("Luis", "Datos", 4100), ("Eva", "Datos", 3900), ("Leo", "Ventas", 2800)]\ndf = spark.createDataFrame(datos, ["nombre", "area", "salario"])\n\ndf.groupBy("area").agg(F.avg("salario").alias("promedio"), F.max("salario").alias("maximo")).show()']
  ];

  // panel "¿Qué hace tu código?" + chuleta de ejemplos (en la práctica libre, un clic carga el ejemplo y lo ejecuta)
  function montarExplicacion(host, lab, ed, run) {
    const E = window.ExplicaCodigo; if (!E || !host) return null;
    const p = E.panel(lab); host.append(p.el);
    const ch = h('<details class="card exp-chuleta-card"><summary>📘 Chuleta: ejemplos para aprender</summary></details>');
    ch.append(E.chuleta(lab, (cod) => { ed.setValue(cod); run(); }, { reemplaza: true }));
    host.append(ch);
    return p;
  }
  const AIRFLOW_SAMPLES = () => ((window.ExplicaCodigo && window.ExplicaCodigo.CHULETAS.airflow) || []).flatMap((s) => s.ej).filter(([c]) => /DAG|@dag/.test(c)).map(([c, d]) => [d.charAt(0).toUpperCase() + d.slice(1), c]);

  // ---------------------------------------------------------------- medidor de costo (laboratorio SQL)
  // Estima cuántos bytes leería la consulta en un warehouse columnar (se paga por las columnas que lees de
  // cada tabla) y cuánto costaría en BigQuery a demanda si las tablas tuvieran tamaño de producción.
  // Precio y mínimos de la página oficial de BigQuery: 6,25 US$ por TiB, mínimo 10 MB por tabla referenciada.
  const BQ_USD_TIB = 6.25, ESCALA_PROD = 10000, MB = 1048576;
  const fmtBytes = (b) => fmtBytesPunto(b).replace('.', ',');
  const fmtBytesPunto = (b) => (b >= 1099511627776 ? (b / 1099511627776).toFixed(2) + ' TiB' : b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : b >= MB ? (b / MB).toFixed(1) + ' MB' : b >= 1024 ? (b / 1024).toFixed(0) + ' KB' : Math.round(b) + ' B');
  const tamCols = new Map();
  function estimarLectura(sql) {
    const T = SQL.tables; if (!T) return null;
    const limpio = sql.replace(/--[^\n]*/g, ' ').replace(/'[^']*'/g, "''");
    const tablas = [...new Set([...limpio.matchAll(/\b(?:from|join)\s+([a-z_]\w*)/gi)].map((m) => m[1].toLowerCase()).filter((n) => T[n]))];
    if (!tablas.length) return null;
    const tokens = new Set(limpio.toLowerCase().match(/[a-z_][a-z0-9_]*/g) || []);
    const estrella = /select\s+(?:distinct\s+)?\*|\w\.\*/i.test(limpio);
    let bytes = 0, todas = 0, prod = 0;
    for (const n of tablas) {
      const t = T[n];
      if (!tamCols.has(n)) { const m = t.rows.slice(0, 300); tamCols.set(n, t.columns.map((c, i) => m.reduce((x, r) => x + (r[i] == null ? 1 : typeof r[i] === 'number' ? 8 : String(r[i]).length + 2), 0) / Math.max(1, m.length))); }
      const tam = tamCols.get(n);
      const usadas = estrella ? tam.map((_, i) => i) : t.columns.map((c, i) => (tokens.has(c.toLowerCase()) ? i : -1)).filter((i) => i >= 0);
      const b = t.rows.length * usadas.reduce((x, i) => x + tam[i], 0);
      bytes += b; todas += t.rows.length * tam.reduce((x, y) => x + y, 0);
      prod += Math.max(10 * MB, b * ESCALA_PROD);
    }
    prod = Math.max(10 * MB, prod);
    return { bytes, todas, prod, usd: (prod / 1099511627776) * BQ_USD_TIB, tablas, estrella, where: /\bwhere\b/i.test(limpio), limit: /\blimit\b/i.test(limpio) };
  }
  function costoHtml(sql) {
    const e = estimarLectura(sql); if (!e) return '';
    const consejos = [];
    if (e.estrella) consejos.push('<b>Evita <code>SELECT *</code></b>: en un warehouse columnar pagas por cada columna que lees, la uses o no.');
    if (e.estrella && e.limit) consejos.push('<b><code>LIMIT</code> no abarata</b> en BigQuery: igual se leen las columnas completas. Para mirar datos gratis, usa la vista previa de la tabla.');
    if (!e.where) consejos.push('Sin <code>WHERE</code> se lee la tabla entera. En producción las tablas grandes se <b>particionan por fecha</b>: filtrar por esa columna lee solo los días que pides.');
    return `<details class="costo"><summary>💸 Esta consulta leería <b>${fmtBytes(e.bytes)}</b>${e.bytes < e.todas * 0.98 ? ` (de ${fmtBytes(e.todas)} si leyera todas las columnas)` : ''} · en producción ≈ <b>${fmtBytes(e.prod)}</b> → <b>US$ ${(e.usd < 0.01 ? e.usd.toFixed(4) : e.usd.toFixed(2)).replace('.', ',')}</b> por ejecución</summary>
      <div class="small"><p style="margin:6px 0">Cómo se calcula: tamaño promedio de cada columna que usa la consulta × filas de ${e.tablas.map((t) => `<code>${esc(t)}</code>`).join(', ')}. "En producción" supone tablas ${ESCALA_PROD.toLocaleString('es')} veces más grandes y el precio a demanda de BigQuery (US$ ${BQ_USD_TIB} por TiB, mínimo 10 MB por tabla). Si este tablero la ejecuta cada 5 minutos, son unas ${(12 * 24 * 30).toLocaleString('es')} ejecuciones al mes: <b>US$ ${(e.usd * 8640).toFixed(2).replace('.', ',')}</b>.</p>${consejos.length ? `<ul style="margin:4px 0 2px">${consejos.map((c) => `<li>${c}</li>`).join('')}</ul>` : '<p style="margin:4px 0">✓ Lee solo las columnas que necesita y filtra: buena práctica.</p>'}</div></details>`;
  }

  function viewLabSql() {
    const SM = window.SqlMotores;
    const MOT = SM.MOTORES;
    let motor = Store.data.code['lab-sql-motor'] || 'sqlite';
    if (!MOT[motor]) motor = 'sqlite';
    const clave = (m) => (m === 'sqlite' ? 'lab-sql' : 'lab-sql-' + m);
    const ejemplos = (m) => (m === 'sqlite' ? SQL_SAMPLES : SM.EJEMPLOS[m]);
    main.innerHTML = `<div class="container wide">
      <h1 style="margin:0 0 4px">🧪 Laboratorio SQL</h1>
      <p class="muted" style="margin:0 0 12px">Elige el motor y practica su dialecto con el dataset completo de la tienda. Experimenta sin miedo: si rompes algo, presiona “Reiniciar base”. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> ejecuta · <kbd>Ctrl</kbd>+<kbd>Espacio</kbd> autocompleta.</p>
      <div class="motor-tabs" role="tablist">${Object.entries(MOT).map(([k, m]) => `<button role="tab" data-motor="${k}"><span>${m.icono}</span> ${esc(m.nombre)}${m.real ? '' : ' <small>compatible</small>'}</button>`).join('')}<span class="spacer"></span><button class="btn btn-ghost btn-sm" id="comparar">📋 Diferencias entre motores</button></div>
      <div class="motor-info" id="motorInfo"></div>
      <div class="lab">
        <aside class="card lab-side"><h4>Bases de datos</h4><div id="schema"><div class="muted small">Cargando…</div></div></aside>
        <div class="lab-main"><div class="card">
          <div class="ex-tools" style="border-top:0"><span class="samples"><select id="samples"></select></span><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="resetDb" title="Deshace los cambios que hiciste a las tablas (INSERT, UPDATE, DELETE, CREATE)">↺ Reiniciar base</button><button class="btn btn-ghost btn-sm" id="cero" title="Base original y el primer ejemplo en el editor">↺ Empezar de cero</button></div>
          <div id="ed"></div>
          <div class="ex-tools"><button class="btn btn-primary" id="run">▶ Ejecutar <span class="kbd">Ctrl+↵</span></button><span class="small muted">Se ejecutan todas las sentencias; se muestran los resultados de las últimas 3.</span></div>
          <div class="output" id="out"></div>
        </div><div id="expHost"></div></div>
      </div>
    </div>`;
    const out = $('#out');
    const ed = createEditor($('#ed'), { lang: 'sql', value: Store.data.code[clave(motor)] ?? ejemplos(motor)[0][1], tall: true, onRun: () => run(), onChange: (v) => Store.setCode(clave(motor), v) });
    const expl = montarExplicacion($('#expHost'), 'sql', ed, () => run());
    const pintarMotor = () => {
      $$('.motor-tabs [data-motor]').forEach((b) => b.classList.toggle('active', b.dataset.motor === motor));
      const m = MOT[motor];
      $('#motorInfo').innerHTML = `<span class="badge ${m.real ? 'b-real' : 'b-compat'}">${m.real ? 'motor real' : 'modo compatible'}</span> <b>${esc(m.version)}</b> · ${esc(m.desc)}`;
      $('#samples').innerHTML = `<option value="">📂 Ejemplos de ${esc(m.nombre)}…</option>` + ejemplos(motor).map((x, i) => `<option value="${i}">${esc(x[0])}</option>`).join('');
    };
    const run = async () => {
      if (!(await ensureSql(out))) return;
      if (motor === 'postgres' && SM.PG.estado !== 'listo') loadingInto(out, 'Preparando PostgreSQL…');
      if (motor === 'duckdb' && SM.DUCK.estado !== 'listo') loadingInto(out, 'Preparando DuckDB…');
      let r;
      try { r = await SM.ejecutar(motor, ed.getValue(), (msg) => loadingInto(out, msg)); } catch (e) {
        out.innerHTML = `<pre class="console"><span class="err">${esc(motor === 'postgres' || motor === 'duckdb' ? `No se pudo cargar ${motor === 'duckdb' ? 'DuckDB' : 'PostgreSQL (PGlite)'} desde cdn.jsdelivr.net: ${e.message}\nRevisa tu conexión o prueba con otro motor.` : e.message)}</span></pre>`; return;
      }
      renderSqlOutput(out, r);
      if (r.ok !== false) { const c = costoHtml(ed.getValue()); if (c) out.append(h(c)); }
      if (expl) expl.actualizar(ed.getValue(), r, { pasos: motor === 'sqlite' });
      if (r.avisos && r.avisos.length) out.prepend(h(`<div class="motor-aviso">⚠️ ${r.avisos.map(esc).join('<br>⚠️ ')}</div>`));
      if (r.traducido) out.append(h(`<details class="motor-trad"><summary>Ver cómo se tradujo a SQLite</summary><pre data-lang="sql"><code>${esc(r.traducido)}</code></pre></details>`));
    };
    $('#run').addEventListener('click', run);
    $('#samples').addEventListener('change', (e) => { if (e.target.value !== '') { ed.setValue(ejemplos(motor)[e.target.value][1]); run(); } });
    $('#resetDb').addEventListener('click', async () => {
      if (motor === 'postgres' || motor === 'duckdb') { const E = motor === 'duckdb' ? SM.DUCK : SM.PG; if (E.estado !== 'listo') return; await E.reiniciar((msg) => loadingInto(out, msg)); out.innerHTML = ''; toast(`${SM.MOTORES[motor].nombre} reiniciado a su estado original`); return; }
      SQL.resetPlayground(); toast('Base de datos reiniciada a su estado original');
    });
    $('#cero').addEventListener('click', async () => {
      if (!confirm('¿Empezar de cero? La base vuelve a su estado original y el editor al primer ejemplo (tu consulta actual se reemplaza).')) return;
      if (motor === 'postgres' && SM.PG.estado === 'listo') await SM.PG.reiniciar((msg) => loadingInto(out, msg)); else if (motor === 'duckdb' && SM.DUCK.estado === 'listo') await SM.DUCK.reiniciar((msg) => loadingInto(out, msg)); else SQL.resetPlayground();
      ed.setValue(ejemplos(motor)[0][1]); out.innerHTML = ''; if (expl) expl.actualizar('', null); toast('Todo limpio: base original y editor nuevo');
    });
    $$('.motor-tabs [data-motor]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.motor === motor) return;
      Store.setCode(clave(motor), ed.getValue());
      motor = b.dataset.motor; Store.setCode('lab-sql-motor', motor);
      ed.setValue(Store.data.code[clave(motor)] ?? ejemplos(motor)[0][1]);
      pintarMotor(); out.innerHTML = '';
      if (motor !== 'postgres' || SM.PG.estado === 'listo') run();
      else out.innerHTML = '<div class="out-meta">PostgreSQL se descarga la primera vez que ejecutas (unos 6 MB). Presiona ▶ Ejecutar.</div>';
    }));
    $('#comparar').addEventListener('click', () => {
      openModal(`<h2 style="margin-top:0">La misma idea en cada motor</h2><div class="result-table-wrap motor-comp-wrap"><table class="result motor-comp"><thead><tr><th>Qué quieres</th><th>SQLite</th><th>PostgreSQL</th><th>MySQL</th><th>SQL Server</th></tr></thead><tbody>${SM.COMPARATIVA.map((f) => `<tr><td><b>${esc(f[0])}</b></td>${f.slice(1).map((c) => `<td><code>${esc(c)}</code></td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="small muted">También cambian los tipos: PostgreSQL y SQL Server dividen enteros como enteros (7 / 2 = 3), MySQL devuelve decimales (3.5000). PostgreSQL y SQL Server exigen que toda columna no agregada del SELECT esté en el GROUP BY; MySQL 8 también, salvo que agrupes por la clave primaria.</p>`);
    });
    pintarMotor();
    ensureSql(out).then((ok) => {
      if (!ok) return;
      // panel de bases: cada empresa se despliega en sus tablas y cada tabla en sus columnas
      const sc = $('#schema'); sc.innerHTML = '';
      const B = window.Bases;
      const abierta = Store.data.code['lab-sql-base'] || 'tienda';
      for (const c of window.DataGen.CASOS || []) {
        const b = B.infoBase(c.id); if (!b) continue;
        const tablas = b.orden.filter((n) => SQL.tables[n]);
        const filas = tablas.reduce((x, n) => x + SQL.tables[n].rows.length, 0);
        const db = h(`<div class="schema-db ${c.id === abierta ? 'open' : ''}"><button class="db-head"><span class="chev">▸</span><span>${c.icono}</span><b>${esc(c.nombre)}</b><span class="cnt">${tablas.length}</span></button>
          <div class="db-body"><div class="db-links"><a href="#/datos/${c.id}">🗺️ Modelo y por qué</a></div>${tablas.map((name) => { const cols = B.columnasTabla(b, name); return `<div class="schema-table"><button><span>▸</span>${esc(name)}<span class="cnt">${SQL.tables[name].rows.length.toLocaleString('es')}</span></button><div class="schema-cols">${cols.map((x) => `<div data-col="${esc(x.n)}" title="${esc(x.t)}${x.fk ? ' → ' + esc(x.fk) : ''}">${x.pk ? '🔑 ' : x.fk ? '🔗 ' : ''}${esc(x.n)} <span class="muted">${esc(x.t)}</span></div>`).join('')}<div data-q="${esc(name)}" style="color:var(--brand);cursor:pointer">▶ ver 10 filas</div></div></div>`; }).join('')}</div></div>`);
        $('.db-head', db).addEventListener('click', () => { db.classList.toggle('open'); if (db.classList.contains('open')) Store.setCode('lab-sql-base', c.id); });
        $$('.schema-table > button', db).forEach((bt) => bt.addEventListener('click', () => bt.parentElement.classList.toggle('open')));
        db.addEventListener('click', (e) => {
          const col = e.target.closest('[data-col]'); if (col) { if (ed.cm) ed.cm.replaceSelection(col.dataset.col); else if (ed.monaco) ed.monaco.trigger('kbd', 'type', { text: col.dataset.col }); ed.focus(); }
          const q = e.target.closest('[data-q]'); if (q) { ed.setValue(motor === 'sqlserver' ? `SELECT TOP 10 *\nFROM ${q.dataset.q};` : `SELECT *\nFROM ${q.dataset.q}\nLIMIT 10;`); run(); }
        });
        sc.append(db);
      }
      if (motor !== 'postgres') run();
      else out.innerHTML = '<div class="out-meta">PostgreSQL se descarga la primera vez que ejecutas (unos 6 MB). Presiona ▶ Ejecutar.</div>';
    });
  }

  function viewLabPython(kind) {
    const isSpark = kind === 'pyspark', isAf = kind === 'airflow';
    const samples = isSpark ? SPARK_SAMPLES : isAf ? AIRFLOW_SAMPLES() : PY_SAMPLES;
    const key = 'lab-' + kind;
    main.innerHTML = `<div class="container wide">
      <h1 style="margin:0 0 4px">${isSpark ? '⚡ Laboratorio PySpark' : isAf ? '🌬️ Laboratorio Airflow' : '🐍 Laboratorio Python'}</h1>
      <p class="muted" style="margin:0 0 16px">${isSpark
        ? 'Practica la API de PySpark con <b>mini-Spark</b>, un simulador que corre en tu navegador. La variable <code>spark</code> ya existe y las tablas del dataset están disponibles con <code>spark.table("pedidos")</code>. Para producción usarás Spark real (Databricks), pero la sintaxis es la misma.'
        : isAf ? 'Escribe DAGs con la misma API de Airflow (<code>from airflow.sdk import DAG</code>, operadores, <code>&gt;&gt;</code>, TaskFlow) y ejecútalos con <code>dag.test()</code>: verás en la consola cada tarea, en orden.'
          : 'Python 3 real (Pyodide) ejecutándose en tu navegador. Usa <code>print()</code> para ver resultados.'} <b>Cada ejecución arranca de cero</b>: no quedan variables de la vez anterior, como al correr un script nuevo.</p>
      <div class="lab">
        <aside class="card lab-side"><h4>Ejemplos</h4>${samples.map((s, i) => `<div class="schema-table"><button data-s="${i}">▸ ${esc(s[0])}</button></div>`).join('')}
        ${isSpark ? `<h4 style="margin-top:16px">Tablas</h4>${['clientes', 'productos', 'categorias', 'pedidos', 'detalle_pedidos', 'pagos', 'empleados', 'departamentos', 'eventos_web'].map((t) => `<div class="small" style="font-family:var(--mono);padding:2px 6px">${t}</div>`).join('')}` : ''}</aside>
        <div class="lab-main"><div class="card">
          <div id="ed"></div>
          <div class="ex-tools"><button class="btn btn-primary" id="run">▶ Ejecutar <span class="kbd">Ctrl+↵</span></button><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="clear">Limpiar salida</button><button class="btn btn-ghost btn-sm" id="cero" title="El editor vuelve al primer ejemplo y se limpia la salida">↺ Empezar de cero</button></div>
          <div class="output" id="out"></div>
        </div><div id="expHost"></div></div>
      </div>
    </div>`;
    const out = $('#out');
    const ed = createEditor($('#ed'), { lang: 'python', value: Store.data.code[key] ?? samples[0][1], tall: true, onRun: () => run(), onChange: (v) => Store.setCode(key, v) });
    const labExp = isSpark ? 'pyspark' : isAf ? 'airflow' : 'python';
    const expl = montarExplicacion($('#expHost'), labExp, ed, () => run());
    const run = async () => { loadingInto(out, pyLoadingMsg()); const code = ed.getValue(); const r = await PY.run(isSpark ? 'pyspark' : pyMode(code), code); renderConsole(out, r); if (expl) expl.actualizar(code, r); };
    $('#run').addEventListener('click', run);
    $('#clear').addEventListener('click', () => { out.innerHTML = ''; });
    $('#cero').addEventListener('click', () => { if (!confirm('¿Empezar de cero? Tu código actual se reemplaza por el primer ejemplo.')) return; ed.setValue(samples[0][1]); out.innerHTML = ''; if (expl) expl.actualizar('', null); toast('Editor limpio'); });
    $$('[data-s]').forEach((b) => b.addEventListener('click', () => { ed.setValue(samples[b.dataset.s][1]); run(); }));
  }

  // ---------------------------------------------------------------- laboratorio de terminal con misiones
  const MISIONES = [
    { g: 'Linux', t: 'Explora: entra a la carpeta datos y lista su contenido con detalle', h: 'cd datos  →  ls -l', check: (M) => M.history.some((x, i) => /^cd\s+(~\/)?datos\/?$/.test(x.trim()) && M.history.slice(i + 1).some((y) => /^ls\b/.test(y.trim()))) },
    { g: 'Linux', t: 'Guarda en ~/errores.txt solo las líneas con ERROR de logs/pipeline.log', h: 'grep ERROR logs/pipeline.log > errores.txt', check: (M) => { const c = M.fs['/home/alumno/errores.txt']; return c && c.c.trim().split('\n').length >= 2 && c.c.split('\n').filter(Boolean).every((l) => l.includes('ERROR')); } },
    { g: 'Linux', t: 'Crea la estructura proyecto/{datos,src,tests} con un solo comando', h: 'mkdir -p proyecto/datos proyecto/src proyecto/tests', check: (M) => ['datos', 'src', 'tests'].every((d) => M.fs['/home/alumno/proyecto/' + d]) },
    { g: 'Python', t: 'Ejecuta scripts/resumen_ventas.py (desde ~) y verifica que creó datos/resumen_canales.csv', h: 'python scripts/resumen_ventas.py  →  cat datos/resumen_canales.csv', check: (M) => !!M.fs['/home/alumno/datos/resumen_canales.csv'] },
    { g: 'Git', t: 'Inicializa un repo en ~/proyecto, crea un README.md y haz tu primer commit', h: 'cd ~/proyecto && git init && echo "# Proyecto" > README.md && git add . && git commit -m "Primer commit"', check: (M) => Object.entries(M.git).some(([k, g]) => k.endsWith('/proyecto') && Object.keys(g.commits).length > 0) },
    { g: 'Git', t: 'Crea la rama feature/limpieza y haz un commit en ella', h: 'git switch -c feature/limpieza  →  edita algo  →  git add . && git commit -m "..."', check: (M) => Object.values(M.git).some((g) => g.branches['feature/limpieza'] && g.branches['feature/limpieza'] !== g.branches.main) },
    { g: 'SQL', t: 'Abre sqlite3 y cuenta los pedidos de 2024 (SELECT COUNT(*) …;)', h: "sqlite3  →  SELECT COUNT(*) FROM pedidos WHERE fecha_pedido >= '2024-01-01';", check: (M) => M.history.some((x) => /^sqlite3/.test(x)) },
    { g: 'dbt', t: 'Entra a ~/tienda_dbt y ejecuta dbt build (modelos + tests)', h: 'cd ~/tienda_dbt && dbt build', check: (M) => M.history.some((x) => /dbt\s+build/.test(x)) },
    { g: 'Airflow', t: 'Lista los DAGs y prueba etl_ventas para el 2024-12-31', h: 'airflow dags list  →  airflow dags test etl_ventas 2024-12-31', check: (M) => M.history.some((x) => /airflow\s+dags\s+test\s+etl_ventas/.test(x)) },
    { g: 'Azure', t: 'Inicia sesión, crea rg-lab en eastus2, una cuenta ADLS Gen2 y el contenedor bronze', h: 'az login → az group create -n rg-lab -l eastus2 → az storage account create -n stlab<numeros> -g rg-lab --sku Standard_LRS --hns true → az storage container create -n bronze --account-name … --auth-mode login', check: (M) => { const a = M.cloud.az; return a && a.groups['rg-lab'] && Object.values(a.storage).some((x) => x.rg === 'rg-lab' && x.hns && x.containers.bronze); } },
    { g: 'Azure', t: 'Sube datos/clientes.csv al contenedor bronze de tu cuenta', h: 'az storage blob upload --account-name … -c bronze -n clientes/clientes.csv -f datos/clientes.csv --auth-mode login', check: (M) => { const a = M.cloud.az; return a && Object.values(a.storage).some((x) => x.containers.bronze && Object.keys(x.containers.bronze.blobs).length); } },
    { g: 'AWS', t: 'Configura AWS, crea un bucket y sube la carpeta datos/ con --recursive', h: 'aws configure → aws s3 mb s3://mi-lake-<algo> → aws s3 cp datos s3://mi-lake-<algo>/crudo/ --recursive', check: (M) => { const a = M.cloud.aws; return a && Object.values(a.buckets).some((b) => Object.keys(b.objects).length >= 2); } },
    { g: 'AWS', t: 'Cataloga tu bucket con un crawler de Glue y consulta con Athena', h: 'aws glue create-database … → create-crawler … → start-crawler … → aws athena start-query-execution --query-string "…" --result-configuration OutputLocation=s3://…', check: (M) => { const a = M.cloud.aws; return a && Object.values(a.glueDbs).some((d) => Object.keys(d.tables).length) && Object.keys(a.athena || {}).length; } },
    { g: 'GCP', t: 'Inicia sesión en gcloud, fija el proyecto academia-datos-dev y crea un bucket', h: 'gcloud auth login → gcloud config set project academia-datos-dev → gcloud storage buckets create gs://…', check: (M) => { const g = M.cloud.gcp; return g && g.project === 'academia-datos-dev' && Object.keys(g.buckets).length; } },
    { g: 'GCP', t: 'Crea el dataset tienda en BigQuery y ejecuta una consulta con GoogleSQL', h: "bq mk --dataset tienda → bq query --use_legacy_sql=false 'SELECT …'", check: (M) => { const g = M.cloud.gcp; return g && g.datasets.tienda && M.history.some((x) => /bq\s+query.*--use_legacy_sql=false/.test(x)); } },
    { g: 'Tu compu', t: 'Crea un proyecto de Python con uv y agrégale pandas y duckdb', h: 'uv init etl → cd etl → uv add pandas duckdb → cat pyproject.toml', check: (M) => Object.entries(M.fs).some(([k, v]) => k.endsWith('/pyproject.toml') && v.c && /pandas/.test(v.c) && /duckdb/.test(v.c)) },
    { g: 'Tu compu', t: 'Genera una clave SSH ed25519 y conéctate a GitHub', h: 'ssh-keygen -t ed25519 -C "tu@email" → gh auth login → gh ssh-key add ~/.ssh/id_ed25519.pub → ssh -T git@github.com', check: (M) => !!M.cloud.githubSsh && M.history.some((x) => /ssh\s+-T\s+git@github\.com/.test(x)) },
    { g: 'Docker', t: 'Levanta PostgreSQL en Docker (con contraseña y puerto 5432) y crea una tabla con psql', h: 'docker run -d --name pg -e POSTGRES_PASSWORD=secreto -p 5432:5432 postgres:16 → psql -U postgres -c "CREATE TABLE t (x int)"', check: (M) => { const d = M.cloud.docker; return d && Object.values(d.containers).some((c) => /postgres/.test(c.imagen) && c.estado === 'running') && M.history.some((x) => /psql.*create table/i.test(x) || /docker exec.*psql/.test(x)); } },
    { g: 'Docker', t: 'Con Docker Compose y un volumen: crea datos, haz docker compose down y up, y comprueba que siguen ahí', h: 'escribe compose.yaml con postgres y volumes → docker compose up -d → psql … CREATE/INSERT → docker compose down → docker compose up -d → psql … SELECT', check: (M) => M.history.some((x) => /docker compose down(?!.*-v)/.test(x)) && Object.keys((M.cloud.docker || {}).volumes || {}).length > 0 && M.history.filter((x) => /docker compose up/.test(x)).length >= 2 },
    { g: 'DuckDB', t: 'Con DuckDB, consulta datos/clientes.csv sin cargarlo y exporta un resumen a Parquet', h: "duckdb -c \"COPY (SELECT pais, COUNT(*) n FROM 'datos/clientes.csv' GROUP BY pais) TO 'por_pais.parquet' (FORMAT parquet)\"", check: (M) => Object.keys(M.fs).some((k) => k.endsWith('.parquet')) },
    { g: 'Terraform', t: 'Crea un bucket de S3 con Terraform (init, plan, apply) y después destrúyelo', h: 'aws configure → code main.tf (provider "aws" + resource "aws_s3_bucket") → terraform init → terraform plan → terraform apply → terraform destroy', check: (M) => M.history.some((x) => /terraform\s+apply/.test(x)) && M.history.some((x) => /terraform\s+destroy/.test(x)) },
    { g: 'Databricks', t: 'Autentícate, crea un bundle, valídalo, despliégalo en dev y ejecuta su job', h: 'databricks auth login --host https://adb-…azuredatabricks.net → databricks bundle init → cd mi_proyecto → databricks bundle validate → databricks bundle deploy -t dev → databricks bundle run -t dev mi_proyecto_job', check: (M) => M.cloud.dbx && M.cloud.dbx.bundle && Object.keys(M.cloud.dbx.bundle).length && M.history.some((x) => /bundle\s+run/.test(x)) },
  ];
  // en el modo libre, una pestaña para volver a las misiones (las dos vistas comparten el mismo encabezado)
  function tabsLabLibre(lab) {
    const h1 = $('.container h1', main); if (!h1) return;
    const n = ((window.MISIONES || {})[lab] || []).length;
    const top = h(`<div class="mis-top"></div>`);
    h1.replaceWith(top); top.append(h1); h1.style.margin = '0';
    top.append(h(`<div class="mis-modos" role="tablist"><button role="tab" data-mis>🎯 Misiones <small>${n}</small></button><button class="on" role="tab" aria-selected="true">🧪 Práctica libre</button></div>`));
    $('[data-mis]', top).addEventListener('click', () => { location.hash = '#/lab/' + lab; });
  }
  function viewLabDbtLibre() {
    main.innerHTML = `<div class="container wide">
      <h1 style="margin:0 0 4px">🔧 Laboratorio dbt</h1>
      <p class="muted" style="margin:0 0 16px">Escribe un modelo de dbt con <code>{{ source('tienda', 'tabla') }}</code>, <code>{{ ref('stg_pedidos') }}</code> y Jinja: se compila y se ejecuta sobre la base de la tienda. Abajo ves el SQL compilado. Para el proyecto completo con <code>dbt build</code>, usa el <a href="#/lab/terminal?modo=libre">laboratorio de terminal</a> (<code>cd ~/tienda_dbt</code>).</p>
      <div class="card"><div id="ed"></div>
        <div class="ex-tools"><button class="btn btn-primary" id="run">▶ Compilar y ejecutar <span class="kbd">Ctrl+↵</span></button><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="cero">↺ Empezar de cero</button></div>
        <div class="output" id="out"></div></div>
      <div id="expHost"></div>
    </div>`;
    const out = $('#out');
    const DBT_INICIAL = "-- un modelo de staging\nselect\n    pedido_id,\n    cliente_id,\n    lower(canal) as canal\nfrom {{ source('tienda', 'pedidos') }}\nwhere estado = 'entregado'\nlimit 20";
    const ed = createEditor($('#ed'), { lang: 'sql', value: Store.data.code['lab-dbt'] ?? DBT_INICIAL, tall: true, onRun: () => run(), onChange: (v) => Store.setCode('lab-dbt', v) });
    const expl = montarExplicacion($('#expHost'), 'dbt', ed, () => run());
    const run = async () => { if (!(await ensureSql(out))) return; loadingInto(out, pyLoadingMsg()); const code = ed.getValue(); const r = await window.Engines.DBT.run({}, code); renderSqlOutput(out, r); if (r.compiled) out.append(compiledBlock(r.compiled)); if (expl) expl.actualizar(code, r); };
    $('#run').addEventListener('click', run);
    $('#cero').addEventListener('click', () => { if (!confirm('¿Empezar de cero? Tu modelo actual se reemplaza por el ejemplo inicial.')) return; ed.setValue(DBT_INICIAL); out.innerHTML = ''; if (expl) expl.actualizar('', null); toast('Editor limpio'); });
  }
  // VS Code de práctica como herramienta propia: elige una carpeta del disco de práctica y se abre el editor
  function viewVSCode() {
    const Sh = window.Shell;
    if (!Sh) { main.innerHTML = '<div class="container prose"><p>La terminal de práctica no está cargada.</p></div>'; return; }
    if (!Sh.Machine.ready) Sh.Machine.load();
    const hijos = (d) => (Sh.children ? Sh.children(d) : []).filter((n) => !n.startsWith('.') && Sh.isDir(d + '/' + n));
    const carpetas = hijos(Sh.HOME).map((n) => ({ n, ruta: Sh.HOME + '/' + n, cuantos: (Sh.children ? Sh.children(Sh.HOME + '/' + n) : []).filter((x) => !x.startsWith('.')).length }));
    const recientes = (() => { try { return JSON.parse(localStorage.getItem('vs-recientes') || '[]'); } catch (e) { return []; } })().filter((r) => Sh.isDir(r));
    main.innerHTML = `<div class="container vs-lanzador">
      <div class="crumbs"><a href="#/">Inicio</a><span>/</span><a href="#/herramientas">Herramientas</a><span>/</span><span>VS Code</span></div>
      <div class="vsl-cab"><span class="vsl-logo">🟦</span><div><h1>Visual Studio Code</h1><p class="muted">Réplica de VS Code con los temas e íconos del repositorio oficial (microsoft/vscode, licencia MIT) y el mismo editor (Monaco). Trabaja sobre el disco de la <a href="#/lab/terminal">terminal de práctica</a>: lo que guardas aquí lo ves con <code>cat</code> y <code>git status</code>.</p></div></div>
      <div class="vsl-grid">
        <section class="card"><h2>Inicio</h2>
          <button class="btn btn-primary" data-abrir="${esc(Sh.HOME)}">📂 Abrir la carpeta personal (~)</button>
          <p class="small muted">También desde la terminal: <code>code .</code> abre la carpeta actual y <code>code archivo.py</code> un archivo.</p>
          ${recientes.length ? `<h3>Recientes</h3><ul class="vsl-lista">${recientes.slice(0, 6).map((r) => `<li><a href="#/vscode" data-abrir="${esc(r)}">${esc(r.split('/').pop() || '~')}</a> <span class="small muted">${esc(Sh.display(r))}</span></li>`).join('')}</ul>` : ''}
        </section>
        <section class="card"><h2>Carpetas en ~</h2>${carpetas.length ? `<ul class="vsl-lista">${carpetas.map((c) => `<li><a href="#/vscode" data-abrir="${esc(c.ruta)}">📁 ${esc(c.n)}</a> <span class="small muted">${c.cuantos} elemento${c.cuantos === 1 ? '' : 's'}</span></li>`).join('')}</ul>` : '<p class="muted">Todavía no hay carpetas. Crea una en la terminal con <code>mkdir proyecto</code> o abre la carpeta personal.</p>'}</section>
        <section class="card"><h2>Para practicar</h2><ul class="vsl-lista">
          <li><a href="#/m/local">Desde tu computadora</a>: el entorno local paso a paso (VS Code, Python, Git).</li>
          <li><a href="#/l/fundamentos-git">Git</a>: commits, ramas y el panel de control de código fuente.</li>
          <li><a href="#/m/dbt">dbt</a>: proyectos con modelos y tests para abrir en el editor.</li></ul></section>
      </div>
    </div>`;
    $('.vs-lanzador', main).addEventListener('click', (e) => {
      const a = e.target.closest('[data-abrir]'); if (!a) return; e.preventDefault();
      const r = a.dataset.abrir;
      try { const lst = [r, ...JSON.parse(localStorage.getItem('vs-recientes') || '[]').filter((x) => x !== r)].slice(0, 8); localStorage.setItem('vs-recientes', JSON.stringify(lst)); } catch (err) { /* sin almacenamiento */ }
      abrirCode(r, null);
    });
  }

  function viewLabTerminal() {
    main.innerHTML = `<div class="container wide">
      <h1 style="margin:0 0 4px">⌨️ Laboratorio de terminal</h1>
      <p class="muted" style="margin:0 0 16px">Una máquina Linux simulada que <b>recuerda todo lo que haces</b>. Ejecuta <b>Python</b>, <b>SQLite</b>, <b>DuckDB</b>, <b>dbt</b> y <b>Airflow</b> de verdad, y simula con estado <b>git</b>, <b>Docker</b> y <b>Docker Compose</b> (con <code>psql</code> sobre los contenedores de Postgres), <b>Terraform</b>, <b>uv</b>, <b>Azure</b> (az), <b>AWS</b> (aws), <b>Google Cloud</b> (gcloud, gsutil, bq) y <b>Databricks</b>. Usa <code>code archivo</code> para editar archivos con el editor.</p>
      <div class="lab lab-term">
        <div class="lab-main"><div id="termHost"></div><div id="expHost"></div></div>
        <aside class="card lab-side missions">
          <div class="exp-tabs" role="tablist"><button class="on" data-tab="chuleta">📘 Chuleta</button><button data-tab="retos">🎯 Retos</button></div>
          <div data-panel="chuleta" id="chuletaHost"></div>
          <div data-panel="retos" hidden><p class="small muted" style="margin-top:0">Retos rápidos: se marcan solos cuando la máquina queda como se pide.</p><div id="mis"></div></div>
          <h4 style="margin-top:16px">Atajos</h4><div class="small muted">↑/↓ historial · Tab autocompletar · Ctrl+R buscar en el historial · Ctrl+L limpiar · Ctrl+C cancelar</div>
          <div style="margin-top:14px" class="row"><button class="btn btn-sm" id="resetM">↺ Reiniciar máquina</button></div>
        </aside>
      </div>
    </div>`;
    const exp = window.ExplicaCmd ? window.ExplicaCmd.panel() : null;
    const term = window.Shell.createTerminal($('#termHost'), { onCommand: (l, r, modo) => { paint(); if (exp) exp.actualizar(l, r, modo); } });
    if (exp) { $('#expHost').append(exp.el); $('#chuletaHost').append(window.ExplicaCmd.chuleta((c) => term.type(c))); }
    $('.exp-tabs', main).addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; $$('.exp-tabs button', main).forEach((x) => x.classList.toggle('on', x === b)); $$('[data-panel]', main).forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab; }); });
    term.el.classList.add('term-big');
    const paint = () => {
      const M = window.Shell.Machine;
      let last = null;
      $('#mis').innerHTML = MISIONES.map((m, i) => {
        let done = false; try { done = !!m.check(M); } catch (e) { done = false; }
        const head = m.g !== last ? `<div class="mis-g">${esc(m.g)}</div>` : '';
        last = m.g;
        return `${head}<details class="mis ${done ? 'done' : ''}"><summary><span class="dot">${done ? '✓' : i + 1}</span>${esc(m.t)}</summary><div class="small"><code>${esc(m.h)}</code></div></details>`;
      }).join('');
    };
    paint();
    $('#resetM').addEventListener('click', () => { if (confirm('¿Reiniciar la máquina? Se borran tus archivos, repos y recursos de nube simulados.')) { window.Shell.Machine.reset(); route(); } });
    setTimeout(() => term.focus(), 50);
  }

  // ---------------------------------------------------------------- datos
  // abre una consulta en el laboratorio SQL (motor SQLite)
  function abrirEnLab(q) { Store.setCode('lab-sql-motor', 'sqlite'); Store.setCode('lab-sql', q); location.hash = '#/lab/sql'; }
  const CURIOSOS_TIENDA = `<ul><li>Las ventas tienen <b>estacionalidad</b>: suben en noviembre-diciembre y en julio.</li><li>Más de 500 clientes (≈27%) <b>nunca compraron</b>: útiles para practicar LEFT JOIN y anti-joins.</li><li>Las ventas <b>crecen</b> año a año (2022 → 2024) y los pedidos se numeran en orden cronológico.</li><li>Algunos productos venden muchísimo más que otros (distribución de “cola larga”).</li><li><code>clientes_crudo</code> tiene duplicados con mayúsculas y espacios: perfecta para limpiar datos.</li><li><code>logins</code> tiene rachas de días consecutivos (el clásico problema “gaps &amp; islands”).</li><li><code>tipos_cambio</code> no tiene fines de semana: ideal para practicar “último valor conocido”.</li><li>Las fechas se guardan como texto ISO (<code>'2024-03-15'</code>), como es habitual en SQLite.</li></ul>`;

  function viewDatos(id) {
    const B = window.Bases;
    if (id && B.infoBase(id)) return viewBase(id);
    const casos = window.DataGen.CASOS || [];
    main.innerHTML = `<div class="container">
      <h1 style="margin-bottom:4px">🗃️ Las bases de datos del curso</h1>
      <p class="muted" style="margin-top:0;max-width:820px">Trece empresas ficticias, cada una con su base de datos: más de 500.000 filas en 97 tablas. Todas se consultan desde los ejercicios, el laboratorio SQL (SQLite, PostgreSQL, MySQL y SQL Server) y PySpark. Entra a cada una para ver <b>cómo está modelada y por qué</b>, qué representa cada fila y su versión dimensional para análisis.</p>
      <div class="bases-grid" id="basesGrid">${casos.map((c) => { const b = B.infoBase(c.id); return `<a class="card base-card" href="#/datos/${c.id}"><div class="base-ico">${c.icono}</div><div><h3>${esc(c.nombre)}</h3><div class="small muted">${esc(c.rubro)} · ${b ? b.orden.length : 0} tablas<span data-filas="${c.id}"></span></div><p class="small">${esc(c.resumen)}</p></div></a>`; }).join('')}</div>
      <div class="card" style="margin-top:20px;padding:16px 20px"><b>¿Cómo leer los diagramas?</b> <span class="small muted">🔑 clave primaria · 🔗 clave foránea · la “pata de gallo” marca el lado <i>muchos</i> de la relación y las dos barras el lado <i>uno</i>. Una línea punteada es una relación opcional o lógica. Pasa el mouse por una tabla para resaltar sus relaciones.</span></div>
    </div>`;
    SQL.init().then(() => {
      for (const c of casos) { const b = B.infoBase(c.id); const span = $(`[data-filas="${c.id}"]`); if (b && span) span.textContent = ' · ' + b.orden.reduce((s, n) => s + ((SQL.tables[n] || {}).rows || []).length, 0).toLocaleString('es') + ' filas'; }
    }).catch(() => {});
  }

  function viewBase(id) {
    const B = window.Bases, b = B.infoBase(id);
    const caso = LESSONS.find((l) => l.modulo.id === 'casos' && new RegExp(b.nombre.split(' ')[0], 'i').test(l.titulo));
    main.innerHTML = `<div class="container base-page">
      <div class="breadcrumb small"><a href="#/datos">Bases de datos</a> / ${esc(b.nombre)}</div>
      <h1 style="margin:4px 0">${b.icono} ${esc(b.nombre)} <span class="muted" style="font-size:.55em;font-weight:500">${esc(b.rubro)}</span></h1>
      <p class="muted" style="margin-top:0;max-width:820px">${esc(b.resumen)}</p>
      <div class="base-acciones"><button class="btn btn-primary" id="abrirLab">🧪 Abrir en el laboratorio SQL</button>${caso ? `<a class="btn" href="#/l/${caso.id}">💼 Caso de negocio</a>` : ''}<a class="btn btn-ghost" href="#/modelado">📐 Practicar modelado</a></div>
      <nav class="base-tabs" role="tablist"><button data-tab="modelo" class="active">🗺️ Modelo</button><button data-tab="tablas">📋 Tablas</button><button data-tab="porque">💡 Por qué así</button><button data-tab="estrella">⭐ Para análisis</button><button data-tab="consultas">▶ Consultas</button></nav>
      <section data-panel="modelo"><p class="small muted">Las tablas de la izquierda son las “maestras”; a la derecha, las que dependen de ellas. Pasa el mouse por una tabla para ver sus relaciones; haz clic para ver sus datos.</p><div class="er-wrap" id="er"><div class="loading-block"><span class="spinner"></span> Cargando…</div></div></section>
      <section data-panel="tablas" hidden><div id="tablasBase"></div></section>
      <section data-panel="porque" hidden><div class="prose">${b.porQue.map(([t, x]) => `<div class="card porque"><h3>${esc(t)}</h3><p>${x}</p></div>`).join('')}${id === 'tienda' ? `<h3>Datos curiosos para tus análisis</h3>${CURIOSOS_TIENDA}` : ''}</div></section>
      <section data-panel="estrella" hidden><div class="prose"><p>La base de arriba está pensada para <b>operar</b> el negocio (muchas escrituras pequeñas, sin datos repetidos). Para <b>analizar</b> conviene otra forma: un <b>modelo estrella</b>, con tablas de <i>hechos</i> (lo que pasa y se mide) rodeadas de <i>dimensiones</i> (por qué filtrar y agrupar).</p><p>${b.estrella.notas}</p></div><div class="er-wrap" id="erEstrella"></div>
        <div class="table-wrap"><table><thead><tr><th>Tabla de hechos</th><th>Grano (una fila es…)</th></tr></thead><tbody>${b.estrella.hechos.map((f) => `<tr><td><code>${esc(f.nombre)}</code></td><td>${esc(f.grano)}</td></tr>`).join('')}</tbody></table></div></section>
      <section data-panel="consultas" hidden><div class="consultas">${b.preguntas.map(([t, q], i) => `<div class="card"><h3>${esc(t)}</h3><pre data-lang="sql"><code>${esc(q)}</code></pre><button class="btn btn-sm" data-q="${i}">🧪 Abrir en el laboratorio</button></div>`).join('')}</div></section>
    </div>`;
    const tabs = $$('.base-tabs [data-tab]');
    const mostrar = (t) => { tabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === t)); $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== t; }); if (t === 'estrella' && !$('#erEstrella svg')) B.dibujarEstrella($('#erEstrella'), id); };
    tabs.forEach((x) => x.addEventListener('click', () => mostrar(x.dataset.tab)));
    $('#abrirLab').addEventListener('click', () => abrirEnLab(`-- ${b.nombre}: ${b.orden.join(', ')}\nSELECT *\nFROM ${b.orden[0]}\nLIMIT 10;`));
    $$('[data-q]').forEach((x) => x.addEventListener('click', () => abrirEnLab(b.preguntas[x.dataset.q][1])));
    if (window.hljs) $$('.consultas pre code').forEach((c) => { try { window.hljs.highlightElement(c); } catch (e) { /* sin resaltado */ } });
    SQL.init().then(() => {
      B.dibujarBase($('#er'), id, { onTabla: (t) => { mostrar('tablas'); const c = $(`#tb-${t}`); if (c) { c.open = true; c.scrollIntoView({ behavior: 'smooth', block: 'start' }); } } });
      $('#tablasBase').innerHTML = b.orden.filter((n) => SQL.tables[n]).map((n) => {
        const t = SQL.tables[n], cols = B.columnasTabla(b, n);
        return `<details class="card base-tabla" id="tb-${n}"><summary><b>${esc(n)}</b> <span class="small muted">${t.rows.length.toLocaleString('es')} filas · una fila = ${esc(b.tablas[n].grano)}</span></summary>
          <p class="small muted">${esc(window.DataGen.TABLE_INFO[n] || '')}</p>
          <div class="table-wrap"><table class="cols-tabla"><thead><tr><th>Columna</th><th>Tipo</th><th>Clave</th></tr></thead><tbody>${cols.map((c) => `<tr><td><code>${esc(c.n)}</code></td><td class="small">${esc(c.t)}</td><td class="small">${c.pk ? '🔑 primaria' : ''}${c.fk ? `🔗 → <code>${esc(c.fk)}</code>` : ''}</td></tr>`).join('')}</tbody></table></div>
          <div class="small muted" style="margin:8px 0 4px">Primeras 8 filas</div>${tableHtml({ columns: t.columns, values: t.rows.slice(0, 8) })}</details>`;
      }).join('');
    }).catch((e) => { $('#er').innerHTML = `<p>${esc(e.message)}</p>`; });
  }

  function viewGlosario(filter = '') {
    const G = C.glosario;
    const areas = [...new Set(G.map((g) => g.area))];
    const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const letra = (t) => { const c = norm(t)[0].toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; };
    const exacto = G.find((g) => norm(g.termino) === norm(filter) || (g.alias || []).some((a) => norm(a) === norm(filter)));
    main.innerHTML = `<div class="container">
      <h1 style="margin-bottom:4px">📖 Glosario</h1>
      <p class="muted" style="margin-top:0">${G.length} términos de ingeniería de datos explicados paso a paso: primero <b>como si tuvieras 8 años</b>, con una comparación de la vida diaria, y después la definición precisa, un ejemplo, para qué sirve y los errores típicos. Toca un término para abrirlo.</p>
      <input id="gq" type="search" placeholder="Buscar: join, Parquet, idempotencia, Terraform, churn…" class="gloss-search">
      <div class="gloss-filter" id="gtags"><button class="chip active" data-t="">Todas las áreas</button>${areas.map((t) => `<button class="chip" data-t="${esc(t)}">${esc(t)} <span class="muted">${G.filter((g) => g.area === t).length}</span></button>`).join('')}</div>
      <div class="gloss-az" id="gaz"></div>
      <div id="glist"></div>
    </div>`;
    let tag = '';
    const abiertos = new Set(exacto ? [exacto.termino] : []);
    // el cuerpo de cada ficha (definición, ejemplo, enlaces) se arma recién al abrirla: son 351 fichas
    const cuerpo = (g) => {
      const sec = (ico, tit, html, cls = '') => (html ? `<section class="gloss-sec ${cls}"><h4>${ico} ${tit}</h4>${html}</section>` : '');
      const ver = (g.ver || []).map((v) => `<a class="chip" href="#/glosario?q=${encodeURIComponent(v)}">${esc(v)}</a>`).join('');
      const lec = (g.lecciones || []).map((l) => `<a href="#/l/${l.id}">${esc(l.titulo)}</a>`).join('');
      return `${sec('👶', 'Explicado como a un niño', g.nino, 'nino')}
          ${sec('📘', 'Qué es, con precisión', g.que)}
          ${sec('🧪', 'Un ejemplo', g.ejemplo)}
          ${sec('🎯', 'Para qué sirve', g.para)}
          ${sec('⚠️', 'Cuidado con', g.cuidado, 'cuidado')}
          ${ver ? `<section class="gloss-sec"><h4>🔗 Términos relacionados</h4><div class="gloss-chips">${ver}</div></section>` : ''}
          ${lec ? `<section class="gloss-sec"><h4>📚 Lo ves en estas lecciones</h4><div class="gloss-lec">${lec}</div></section>` : ''}`;
    };
    const porTermino = new Map(G.map((g) => [g.termino, g]));
    const tarjeta = (g) => {
      const resumen = (g.nino || g.que || '').replace(/<[^>]+>/g, '').split(/(?<=[.!?])\s/)[0];
      const abierta = abiertos.has(g.termino);
      return `<details class="gloss-card" id="g-${encodeURIComponent(g.termino)}" ${abierta ? 'open' : ''}>
        <summary><span class="gloss-term">${esc(g.termino)}</span><span class="badge tag">${esc(g.area)}</span>${(g.alias || []).length ? `<span class="gloss-alias">también: ${g.alias.map(esc).join(', ')}</span>` : ''}<span class="gloss-res">${resumen}</span></summary>
        <div class="gloss-body">${abierta ? cuerpo(g) : ''}</div></details>`;
    };
    const paint = () => {
      const q = norm($('#gq').value.trim());
      const items = G.filter((g) => (!tag || g.area === tag) && (!q || norm(g.termino + ' ' + (g.alias || []).join(' ') + ' ' + g.texto).includes(q)))
        .sort((a, b) => {
          // lo que coincide en el nombre va primero
          const pa = q && norm(a.termino + ' ' + (a.alias || []).join(' ')).includes(q) ? 0 : 1, pb = q && norm(b.termino + ' ' + (b.alias || []).join(' ')).includes(q) ? 0 : 1;
          return pa - pb || a.termino.localeCompare(b.termino, 'es');
        });
      const letras = [...new Set(items.map((g) => letra(g.termino)))];
      $('#gaz').innerHTML = q ? `<span class="muted small">${items.length} resultado(s)</span>` : letras.map((l) => `<a href="#" data-l="${l}">${l}</a>`).join('');
      let actual = null;
      $('#glist').innerHTML = items.map((g) => {
        const l = letra(g.termino);
        const cab = !q && l !== actual ? `<h3 class="gloss-letra" id="letra-${l}">${l}</h3>` : '';
        actual = l;
        return cab + tarjeta(g);
      }).join('') || '<div class="card muted" style="padding:16px">Sin resultados. Prueba con otra palabra.</div>';
      const llenar = (d) => { const b = d.querySelector('.gloss-body'); if (d.open && b && !b.firstElementChild) { const g = porTermino.get(decodeURIComponent(d.id.slice(2))); if (g) b.innerHTML = cuerpo(g); } };
      const colorear = (d) => { llenar(d); if (d.open && !d.dataset.hl) { d.dataset.hl = '1'; $$('pre', d).forEach((pre) => { try { highlight(pre); } catch (e) { /* sin resaltado */ } }); } };
      for (const d of $$('#glist details')) { colorear(d); d.addEventListener('toggle', () => { const t = decodeURIComponent(d.id.slice(2)); if (d.open) abiertos.add(t); else abiertos.delete(t); colorear(d); }); }
    };
    $('#gq').value = exacto ? '' : filter;
    $('#gq').addEventListener('input', paint);
    $('#gaz').addEventListener('click', (e) => { const a = e.target.closest('[data-l]'); if (!a) return; e.preventDefault(); document.getElementById('letra-' + a.dataset.l)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('#gtags').addEventListener('click', (e) => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      tag = b.dataset.t; $$('#gtags .chip').forEach((c) => c.classList.toggle('active', c === b)); paint();
    });
    paint();
    if (exacto) setTimeout(() => document.getElementById('g-' + encodeURIComponent(exacto.termino))?.scrollIntoView({ block: 'start' }), 50);
  }

  function resumenPractica() {
    const N = Store.data.exams || {}, c = Store.data.cards || {};
    const glos = new Set(C.glosario.map((g) => g.termino));
    const vistas = Object.entries(c).filter(([k]) => glos.has(k)).map(([, v]) => v), dominadas = vistas.filter((t) => t.b >= 4).length, hoy = vistas.filter((t) => t.due <= Date.now()).length;
    const propios = (C.examenes || []).filter((x) => x.id === x.modulo);
    const aprob = propios.filter((x) => N[x.id] && N[x.id].best >= 70).length;
    return `<h2 class="section-title">Repaso y exámenes</h2>
      <div class="grid grid-3">
        <a class="card module-card" href="#/repaso"><h3>🃏 Tarjetas de repaso</h3><div class="small muted">${vistas.length}/${C.glosario.length} términos vistos · ${dominadas} dominados · ${hoy} para repasar hoy</div><div class="bar" style="margin-top:8px"><i style="width:${Math.round((dominadas / C.glosario.length) * 100)}%;background:var(--brand)"></i></div></a>
        <a class="card module-card" href="#/examenes"><h3>📝 Exámenes de módulo</h3><div class="small muted">${aprob}/${propios.length} aprobados</div><div class="bar" style="margin-top:8px"><i style="width:${Math.round((aprob / Math.max(1, propios.length)) * 100)}%;background:var(--ok)"></i></div></a>
        <a class="card module-card" href="#/examenes"><h3>🎓 Examen final</h3><div class="small muted">${N.final ? `Mejor nota ${N.final.best}% · ${N.final.best >= 75 ? 'certificado disponible' : 'se aprueba con 75%'}` : 'Sin rendir'}</div></a>
      </div>`;
  }

  // ejercicios resueltos por dificultad (los que no la declaran toman el nivel de su lección)
  function resumenDificultad() {
    const NIV = ['Básico', 'Intermedio', 'Avanzado', 'Experto'];
    const filas = NIV.map((n) => { const e = ALL_EX.filter((x) => (x.dificultad || 'Básico') === n); return { n, total: e.length, done: e.filter((x) => Store.exDone(x.id)).length }; }).filter((f) => f.total);
    return `<h2 class="section-title">Ejercicios por dificultad</h2>
      <div class="grid grid-4">${filas.map((f) => `<div class="card" style="padding:14px 16px"><span class="badge ${levelClass(f.n)}">${esc(f.n)}</span><div style="margin-top:8px"><b>${f.done}/${f.total}</b> <span class="small muted">resueltos</span></div><div class="bar" style="margin-top:8px"><i style="width:${Math.round((100 * f.done) / f.total)}%"></i></div></div>`).join('')}</div>`;
  }

  // laboratorios y herramientas de práctica: misiones, Power BI y la simulación de trabajo
  function resumenLabs() {
    const M = window.MISIONES || {}, est = Store.data.misiones || {};
    const ico = Object.fromEntries(LABS_MENU.map((x) => [x[3], x]));
    const tarjeta = (href, titulo, detalle, pct) => `<a class="card module-card" href="${href}"><h3>${titulo}</h3><div class="small muted">${detalle}</div>${pct == null ? '' : `<div class="bar" style="margin-top:8px"><i style="width:${pct}%"></i></div>`}</a>`;
    const labs = Object.entries(M).map(([k, lista]) => {
      const hechas = lista.filter((m) => est[m.id] && est[m.id].hecha).length;
      const x = ico['lab-' + k] || ['#/lab/' + k, '🧪', k];
      return tarjeta(x[0], `${x[1]} ${esc(x[2])}`, `${hechas}/${lista.length} misiones`, Math.round((100 * hechas) / Math.max(1, lista.length)));
    });
    const pb = Store.data.powerbi;
    if (pb && pb.tablas) {
      const vis = (pb.paginas || []).reduce((a, p) => a + (p.visuales || []).length, 0);
      labs.push(tarjeta('#/powerbi', '📊 Power BI (práctica)', `${Object.keys(pb.tablas).length} tablas · ${(pb.rels || []).length} relaciones · ${(pb.medidas || []).length} medidas · ${vis} objetos visuales${pb.publicado ? ' · publicado' : ''}`, null));
    } else labs.push(tarjeta('#/powerbi', '📊 Power BI (práctica)', 'Todavía no armaste un informe', null));
    const W = Store.data.dbxWs, U = Store.data.dbxUC;
    if (W || U) {
      const nbs = W ? Object.values(W.items || {}).filter((it) => it.tipo === 'notebook').length : 0;
      const tablas = U ? Object.values(U.catalogs || {}).reduce((acc, c) => acc + Object.values(c.schemas || {}).reduce((x, sch) => x + Object.keys(sch.tables || {}).length, 0), 0) : 0;
      const cs = window.CloudSim ? window.CloudSim.dbx() : { jobs: {} };
      labs.push(tarjeta('#/databricks', '🧱 Databricks (práctica)', `${nbs} notebooks · ${tablas} tablas en Unity Catalog · ${Object.keys(cs.jobs || {}).length} jobs · ${(U && U.historial ? U.historial.length : 0)} consultas`, null));
    } else labs.push(tarjeta('#/databricks', '🧱 Databricks (práctica)', 'Todavía no abriste el workspace', null));
    const azs = window.CloudSim && window.Shell && window.Shell.Machine && window.Shell.Machine.cloud && window.Shell.Machine.cloud.az;
    if (azs) { const n = ['storage', 'kv', 'dbw', 'adf', 'eh'].reduce((acc, k) => acc + Object.keys(azs[k] || {}).length, 0); labs.push(tarjeta('#/azure', '☁️ Portal de Azure (práctica)', `${Object.keys(azs.groups || {}).length} grupos de recursos · ${n} recursos · ${(azs.roles || []).length} roles asignados`, null)); }
    else labs.push(tarjeta('#/azure', '☁️ Portal de Azure (práctica)', 'Todavía no creaste recursos', null));
    const tb = Store.data.trabajo;
    const etapas = tb ? Math.min(4, tb.paso || 0) : 0;
    labs.push(tarjeta('#/trabajo', '💼 Tu primer trabajo', etapas >= 4 ? 'Semana completa ✓' : `${etapas}/4 etapas de la semana`, etapas * 25));
    if (window.RetosHerramientas) for (const x of window.RetosHerramientas.resumen()) labs.push(tarjeta(x.id === 'adf' ? '#/azure/servicio/adf' : '#/' + x.id, `🎯 ${esc(x.titulo)}`, `${x.hechos}/${x.total} retos resueltos`, Math.round((100 * x.hechos) / Math.max(1, x.total))));
    return `<h2 class="section-title">Laboratorios y herramientas</h2><div class="grid grid-3">${labs.join('')}</div>`;
  }

  function viewProgreso() {
    const tp = totalProgress();
    const exDone = ALL_EX.filter((e) => Store.exDone(e.id)).length;
    main.innerHTML = `<div class="container">
      <h1>📈 Mi progreso</h1>
      ${bloqueRacha()}
      <div class="stats"><div class="stat"><b>${tp.pct}%</b><span>del curso</span></div><div class="stat"><b>${tp.done}/${tp.total}</b><span>lecciones</span></div><div class="stat"><b>${exDone}/${ALL_EX.length}</b><span>ejercicios</span></div></div>
      <div class="grid" style="margin-top:20px">${C.modulos.map((m) => {
        const p = moduleProgress(m);
        const e = m.lecciones.flatMap((l) => l.ejercicios);
        const ed = e.filter((x) => Store.exDone(x.id)).length;
        return `<a class="card module-card" href="#/m/${m.id}" style="flex-direction:row;align-items:center;gap:16px"><span class="mc-ico">${m.icono}</span><div style="flex:1"><h3>${esc(m.titulo)}</h3><div class="small muted">${p.done}/${p.total} lecciones · ${ed}/${e.length} ejercicios</div><div class="bar" style="margin-top:8px"><i style="width:${p.pct}%;background:${m.color}"></i></div></div><b>${p.pct}%</b></a>`;
      }).join('')}</div>
      ${resumenDificultad()}
      ${resumenLabs()}
      ${resumenPractica()}
      <h2 class="section-title">Tus datos</h2>
      <p class="muted">Tu progreso se guarda solo en este navegador. En <b>Mis datos</b> ves qué hay guardado, puedes reiniciar una parte sin tocar el resto y descargar o restaurar una copia completa.</p>
      <div class="row"><a class="btn" href="#/mis-datos">🗂️ Abrir Mis datos</a></div>
    </div>`;
  }

  // ---------------------------------------------------------------- atajos de teclado por vista
  let teclasVista = null;
  function setTeclas(fn) {
    if (teclasVista) document.removeEventListener('keydown', teclasVista);
    teclasVista = fn;
    if (fn) document.addEventListener('keydown', fn);
  }
  const barajar = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const DIA = 86400000;

  // ---------------------------------------------------------------- tarjetas de repaso
  // Repaso espaciado con 5 cajas (sistema Leitner): si la sabes, la tarjeta sube de caja y vuelve más tarde;
  // si no, vuelve a la caja 1 y se repite en esta misma sesión.
  const INTERVALO_CAJA = [0, 1, 2, 4, 8, 16]; // días hasta el próximo repaso, por caja (1..5)
  const POR_SESION = 20, NUEVAS_POR_SESION = 10;
  const tarjetas = () => (Store.data.cards = Store.data.cards || {});

  // tapa el término y sus alias dentro de la explicación, para adivinarlo sin pistas
  function taparTermino(html, g) {
    const formas = [...g.termino.split(' / '), ...(g.alias || [])]
      .map((x) => x.replace(/\s*\(.*?\)\s*/g, '').trim()).filter((x) => x.length >= 3)
      .sort((a, b) => b.length - a.length)
      .map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!formas.length) return html;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}_])(${formas.join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
    return html.replace(/(<[^>]+>)|([^<]+)/g, (m, tag, txt) => tag || txt.replace(re, (_, pre) => `${pre}<span class="tapado">?????</span>`));
  }

  function viewRepaso() {
    const G = C.glosario;
    const areas = [...new Set(G.map((g) => g.area))];
    let modo = Store.data.repasoModo || 'adivinar', area = '';
    main.innerHTML = `<div class="container">
      <h1 style="margin-bottom:4px">🃏 Tarjetas de repaso</h1>
      <p class="muted" style="margin-top:0">Los ${G.length} términos del glosario en tarjetas. Usan <b>repaso espaciado</b>: lo que ya sabes vuelve cada vez más espaciado y lo que te cuesta vuelve pronto. Unos minutos por día alcanzan.</p>
      <div class="stats" id="rstats"></div>
      <div class="rep-opciones">
        <div class="seg" id="rmodo">
          <button data-m="adivinar">¿Qué término es?</button>
          <button data-m="explicar">Explica el término</button>
        </div>
        <p class="small muted" id="rmodoTxt"></p>
        <div class="gloss-filter" id="rareas"><button class="chip active" data-a="">Todas las áreas</button>${areas.map((a) => `<button class="chip" data-a="${esc(a)}">${esc(a)}</button>`).join('')}</div>
        <div class="row"><button class="btn btn-primary btn-lg" id="rstart"></button><span class="small muted" id="rinfo"></span></div>
      </div>
      <h2 class="section-title">❓ Preguntas de tus lecciones</h2>
      <p class="muted" style="margin-top:0">Las preguntas de opción múltiple de las lecciones que ya abriste, con el mismo repaso espaciado. Así lo que estudiaste hace semanas vuelve justo antes de olvidarlo.</p>
      <div class="stats" id="qstats"></div>
      <div class="row"><button class="btn btn-lg" id="qstart"></button><span class="small muted" id="qinfo"></span></div>
    </div>`;
    // preguntas de las lecciones visitadas: la clave lleva el prefijo "q:" para no mezclarse con el glosario
    const visitadas = Store.data.visited || {};
    const preguntas = ALL_EX.filter((e) => e.type === 'quiz' && visitadas[e.id.replace(/-ej\d+$/, '')]);
    const claveQ = (e) => 'q:' + e.id;
    const LETRA = 'ABCDEFGH';
    const CFG_PREG = {
      clave: claveQ,
      volver: { href: '#/repaso', texto: 'Tarjetas de repaso' },
      frente: (e) => { const l = LESSON_BY_ID.get(e.id.replace(/-ej\d+$/, '')); return `<p class="small muted" style="margin:0 0 6px">${l ? esc(l.titulo.split(' - ')[0]) : ''}</p><div class="prose rep-enun">${e.enunciado}</div><ol class="rep-opts" type="A">${e.opciones.map((o) => `<li>${o.text}</li>`).join('')}</ol><p class="rep-preg">Piensa la respuesta antes de dar vuelta la tarjeta.</p>`; },
      dorso: (e) => { const i = e.opciones.findIndex((o) => o.ok); return `<div class="rep-def"><h4>✓ Respuesta ${LETRA[i]}</h4><p>${e.opciones[i].text}</p>${e.explicacion ? `<h4>Por qué</h4>${e.explicacion}` : ''}<p class="small"><a href="#/l/${e.id.replace(/-ej\d+$/, '')}">Volver a la lección ↗</a></p></div>`; },
    };
    const pintarPreg = () => {
      const c = tarjetas(), ahora = Date.now();
      const vistas = preguntas.filter((e) => c[claveQ(e)]);
      const pend = vistas.filter((e) => c[claveQ(e)].due <= ahora).length, nuevas = preguntas.length - vistas.length;
      const dom = vistas.filter((e) => c[claveQ(e)].b >= 4).length;
      const nLec = Object.keys(visitadas).filter((id) => LESSON_BY_ID.has(id)).length;
      $('#qstats').innerHTML = `<div class="stat"><b>${pend}</b><span>para repasar hoy</span></div><div class="stat"><b>${nuevas}</b><span>sin ver todavía</span></div><div class="stat"><b>${dom}</b><span>dominadas</span></div><div class="stat"><b>${preguntas.length}</b><span>preguntas de ${nLec} ${nLec === 1 ? 'lección abierta' : 'lecciones abiertas'}</span></div>`;
      const n = Math.min(POR_SESION, pend + Math.min(nuevas, NUEVAS_POR_SESION));
      $('#qstart').disabled = !preguntas.length;
      $('#qstart').textContent = !preguntas.length ? 'Abre alguna lección para sumar preguntas' : n ? `Repasar ${n} preguntas →` : 'Practicar igual →';
      $('#qinfo').textContent = preguntas.length && !n ? '¡Al día! Puedes practicar con preguntas al azar.' : '';
    };
    $('#qstart').addEventListener('click', () => {
      const c = tarjetas(), ahora = Date.now();
      const pend = preguntas.filter((e) => c[claveQ(e)] && c[claveQ(e)].due <= ahora).sort((a, b) => c[claveQ(a)].due - c[claveQ(b)].due);
      const nuevas = barajar(preguntas.filter((e) => !c[claveQ(e)])).slice(0, NUEVAS_POR_SESION);
      let mazo = [...pend, ...nuevas].slice(0, POR_SESION);
      if (!mazo.length) mazo = barajar(preguntas).slice(0, POR_SESION);
      sesionRepaso(barajar(mazo), 'explicar', CFG_PREG);
    });
    pintarPreg();
    const deArea = () => G.filter((g) => !area || g.area === area);
    const pintarInicio = () => {
      const c = tarjetas(), ahora = Date.now(), lista = deArea();
      const vistas = lista.filter((g) => c[g.termino]);
      const dominadas = vistas.filter((g) => c[g.termino].b >= 4).length;
      const pendientes = vistas.filter((g) => c[g.termino].due <= ahora).length;
      const nuevas = lista.length - vistas.length;
      $('#rstats').innerHTML = `<div class="stat"><b>${pendientes}</b><span>para repasar hoy</span></div><div class="stat"><b>${nuevas}</b><span>sin ver todavía</span></div><div class="stat"><b>${vistas.length - dominadas}</b><span>aprendiendo</span></div><div class="stat"><b>${dominadas}</b><span>dominadas</span></div>`;
      $$('#rmodo button').forEach((b) => b.classList.toggle('active', b.dataset.m === modo));
      $('#rmodoTxt').textContent = modo === 'adivinar' ? 'Ves la explicación para niños con el nombre tapado y tienes que decir de qué término se trata.' : 'Ves el nombre del término y tienes que explicarlo con tus palabras antes de dar vuelta la tarjeta.';
      const n = Math.min(POR_SESION, pendientes + Math.min(nuevas, NUEVAS_POR_SESION));
      $('#rstart').textContent = n ? `Empezar: ${n} tarjetas →` : 'Practicar igual →';
      $('#rinfo').textContent = n ? '' : '¡Al día! No hay tarjetas pendientes en esta área. Puedes practicar con tarjetas al azar.';
    };
    $('#rmodo').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b) return; modo = b.dataset.m; Store.data.repasoModo = modo; Store.save(); pintarInicio(); });
    $('#rareas').addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; area = b.dataset.a; $$('#rareas .chip').forEach((x) => x.classList.toggle('active', x === b)); pintarInicio(); });
    $('#rstart').addEventListener('click', () => {
      const c = tarjetas(), ahora = Date.now(), lista = deArea();
      const pend = lista.filter((g) => c[g.termino] && c[g.termino].due <= ahora).sort((a, b) => c[a.termino].due - c[b.termino].due);
      const nuevas = barajar(lista.filter((g) => !c[g.termino])).slice(0, NUEVAS_POR_SESION);
      let mazo = [...pend, ...nuevas].slice(0, POR_SESION);
      if (!mazo.length) mazo = barajar(lista).slice(0, POR_SESION);
      sesionRepaso(barajar(mazo), modo);
    });
    pintarInicio();
  }

  // cfg permite reutilizar la sesión con otros mazos (por ejemplo, las tarjetas de una certificación)
  const CFG_GLOSARIO = {
    clave: (g) => g.termino,
    volver: { href: '#/repaso', texto: 'Tarjetas de repaso' },
    frente: (g, modo) => (modo === 'adivinar'
      ? `<div class="rep-pista">👶 ${taparTermino(g.nino, g)}</div><p class="rep-preg">¿Qué término es? <span class="badge tag">${esc(g.area)}</span></p>`
      : `<div class="rep-term">${esc(g.termino)}</div><p class="rep-preg"><span class="badge tag">${esc(g.area)}</span> Explícalo con tus palabras: qué es, para qué sirve y un ejemplo.</p>`),
    dorso: (g, modo) => (modo === 'adivinar'
      ? `<div class="rep-term">${esc(g.termino)}</div><div class="rep-def">${g.que}</div>`
      : `<div class="rep-def"><h4>👶 Como a un niño</h4>${g.nino}<h4>📘 Con precisión</h4>${g.que}<h4>🎯 Para qué sirve</h4>${g.para}</div>`)
      + `<p class="small"><a href="#/glosario?q=${encodeURIComponent(g.termino)}" target="_blank" rel="noopener">Ver la ficha completa en el glosario ↗</a></p>`
  };

  function sesionRepaso(mazo, modo, cfg = CFG_GLOSARIO) {
    const total = mazo.length, res = { 1: 0, 2: 0, 3: 0 };
    let actual = null, volteada = false, hechas = 0;
    main.innerHTML = `<div class="container">
      <div class="crumbs"><a href="${cfg.volver.href}">${esc(cfg.volver.texto)}</a><span>/</span><span>Sesión</span></div>
      <div class="bar" style="margin:6px 0 4px"><i id="rbar" style="width:0%;background:var(--brand)"></i></div>
      <p class="small muted" id="rcont"></p>
      <div id="rcarta"></div>
      <p class="small muted rep-ayuda"><kbd>Espacio</kbd> dar vuelta · <kbd>1</kbd> no lo sabía · <kbd>2</kbd> más o menos · <kbd>3</kbd> lo sabía</p>
    </div>`;
    const siguiente = () => {
      if (!mazo.length) return final();
      actual = mazo.shift(); volteada = false;
      $('#rbar').style.width = Math.round((hechas / total) * 100) + '%';
      $('#rcont').textContent = `Tarjeta ${Math.min(hechas + 1, total)} de ${total}${mazo.length + 1 > total - hechas ? ' · repitiendo las que te costaron' : ''}`;
      pintar();
    };
    const pintar = () => {
      const g = actual;
      const frente = cfg.frente(g, modo), dorso = cfg.dorso(g, modo);
      $('#rcarta').innerHTML = `<div class="card rep-carta ${volteada ? 'volteada' : ''}">
        <div class="rep-frente">${frente}</div>
        ${volteada ? `<div class="rep-dorso">${dorso}</div>
          <div class="rep-botones"><button class="btn rep-mal" data-r="1">✗ No lo sabía</button><button class="btn rep-medio" data-r="2">~ Más o menos</button><button class="btn rep-bien" data-r="3">✓ Lo sabía</button></div>`
        : '<div class="rep-botones"><button class="btn btn-primary" data-flip>Dar vuelta</button></div>'}
      </div>`;
      $$('#rcarta pre').forEach((pre) => { try { highlight(pre); } catch (e) { /* sin resaltado */ } });
    };
    const calificar = (r) => {
      const c = tarjetas(), t = cfg.clave(actual), ahora = Date.now();
      const prev = c[t] || { b: 0 };
      Store.data.ultimoRepaso = ahora;
      if (r === 1) { c[t] = { b: 1, due: ahora }; mazo.push(actual); }
      else if (r === 2) { const b = Math.max(1, prev.b); c[t] = { b, due: ahora + DIA }; hechas++; }
      else { const b = Math.min(5, prev.b + 1); c[t] = { b, due: ahora + INTERVALO_CAJA[b] * DIA }; hechas++; }
      res[r]++;
      Store.save();
      siguiente();
    };
    const final = () => {
      setTeclas(null);
      $('#rbar').style.width = '100%';
      $('#rcont').textContent = '';
      $('.rep-ayuda').remove();
      $('#rcarta').innerHTML = `<div class="card rep-carta"><h2 style="margin-top:0">🎉 ¡Sesión terminada!</h2>
        <p>Repasaste <b>${total}</b> tarjetas: <b>${res[3]}</b> las sabías, <b>${res[2]}</b> más o menos y <b>${res[1]}</b> veces tuviste que repetir alguna.</p>
        <p class="muted">Las que sabías vuelven en unos días; las que te costaron, mañana. Volver un poco cada día funciona mucho mejor que repasar todo de una vez.</p>
        <div class="row"><a class="btn btn-primary" href="${cfg.volver.href}">Volver a las tarjetas</a><a class="btn" href="${cfg.examen || '#/examenes'}">📝 Ir a ${cfg.examen ? 'la práctica' : 'los exámenes'}</a></div></div>`;
    };
    $('#rcarta').addEventListener('click', (e) => {
      if (e.target.closest('[data-flip]')) { volteada = true; pintar(); return; }
      const b = e.target.closest('[data-r]'); if (b) calificar(Number(b.dataset.r));
    });
    setTeclas((e) => {
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === ' ' && !volteada) { e.preventDefault(); volteada = true; pintar(); }
      else if (volteada && ['1', '2', '3'].includes(e.key)) calificar(Number(e.key));
    });
    siguiente();
  }

  // ---------------------------------------------------------------- exámenes
  const EXAMENES = new Map((C.examenes || []).map((x) => [x.id, x]));
  const EXAMENES_MODULO = (C.examenes || []).filter((x) => x.id === x.modulo); // el examen propio de cada módulo
  const EXAMENES_PRACTICA = (C.examenes || []).filter((x) => x.id !== x.modulo); // los de práctica de certificaciones
  const NOTA_MODULO = 70, NOTA_FINAL = 75, PREGUNTAS_FINAL = 40;
  const notas = () => (Store.data.exams = Store.data.exams || {});
  const certificado = () => { const f = notas().final; return f && f.best >= NOTA_FINAL ? f : null; };

  function preguntasFinal() {
    // al menos 2 preguntas de cada módulo y el resto al azar, para cubrir todo el curso
    const porModulo = EXAMENES_MODULO.map((x) => barajar(x.preguntas).map((p) => ({ ...p, modulo: x.modulo })));
    const elegidas = porModulo.flatMap((ps) => ps.slice(0, 2));
    const resto = barajar(porModulo.flatMap((ps) => ps.slice(2)));
    return barajar([...elegidas, ...resto.slice(0, Math.max(0, PREGUNTAS_FINAL - elegidas.length))]);
  }

  function viewExamenes() {
    const N = notas(), cert = certificado();
    const aprobados = EXAMENES_MODULO.filter((x) => N[x.id] && N[x.id].best >= NOTA_MODULO).length;
    const estado = (n) => (!n ? '<span class="badge">Sin rendir</span>' : n.best >= NOTA_MODULO ? `<span class="badge b-basico">✓ Aprobado · ${n.best}%</span>` : `<span class="badge b-experto">Mejor nota ${n.best}%</span>`);
    const filaPractica = (x) => { const m = MODULE_BY_ID.get(x.modulo), n = N[x.id]; return `<a class="card lesson-row ${n && n.best >= NOTA_MODULO ? 'done' : ''}" href="#/examen/${x.id}"><span class="num">${m.icono}</span><span class="t"><b>${esc(x.titulo)}</b><small>${x.preguntas.length} preguntas · se aprueba con ${NOTA_MODULO}%</small></span>${estado(n)}</a>`; };
    const fila = (m) => {
      const x = EXAMENES.get(m.id); if (!x) return '';
      const n = N[m.id];
      const est = !n ? '<span class="badge">Sin rendir</span>' : n.best >= NOTA_MODULO ? `<span class="badge b-basico">✓ Aprobado · ${n.best}%</span>` : `<span class="badge b-experto">Mejor nota ${n.best}%</span>`;
      return `<a class="card lesson-row ${n && n.best >= NOTA_MODULO ? 'done' : ''}" href="#/examen/${m.id}"><span class="num">${m.icono}</span><span class="t"><b>${esc(m.titulo)}</b><small>${x.preguntas.length} preguntas · se aprueba con ${NOTA_MODULO}%</small></span>${est}</a>`;
    };
    const f = N.final;
    main.innerHTML = `<div class="container">
      <h1 style="margin-bottom:4px">📝 Exámenes y certificado</h1>
      <p class="muted" style="margin-top:0">Cada módulo tiene un examen para comprobar que entendiste, no que memorizaste: muchas preguntas traen código o una situación real. Al terminar ves qué fallaste, por qué, y qué lección repasar. Puedes rendir cada examen todas las veces que quieras: se guarda tu mejor nota.</p>
      <div class="stats"><div class="stat"><b>${aprobados}/${EXAMENES_MODULO.length}</b><span>exámenes de módulo aprobados</span></div><div class="stat"><b>${f ? f.best + '%' : '—'}</b><span>mejor nota del examen final</span></div></div>
      <div class="card examen-final">
        <div><h2 style="margin:0 0 6px">🎓 Examen final</h2>
        <p style="margin:0">${PREGUNTAS_FINAL} preguntas al azar de todo el curso (al menos dos de cada módulo). Se aprueba con <b>${NOTA_FINAL}%</b> y te da el <b>certificado de aprobación</b>. Conviene rendirlo después de aprobar los exámenes de los módulos.</p></div>
        <a class="btn btn-primary btn-lg" href="#/examen/final">${f ? 'Volver a rendir' : 'Rendir el examen final'} →</a>
      </div>
      <div class="card" id="certBox" style="padding:18px 20px;margin-top:14px"></div>
      <h2 class="section-title">Exámenes por módulo</h2>
      <div class="lesson-list">${C.modulos.map(fila).join('')}</div>
      ${EXAMENES_PRACTICA.length ? `<h2 class="section-title">🏅 Exámenes de práctica de certificaciones</h2>
      <p class="muted">Simulan los exámenes oficiales de Databricks, Azure, AWS y Google Cloud, con preguntas de escenario como las reales. No cuentan para el examen final del curso. Para ver el temario de cada certificación, qué lecciones lo cubren y cómo prepararte, entra a <a href="#/certificaciones">Certificaciones</a>.</p>
      <div class="lesson-list">${EXAMENES_PRACTICA.map(filaPractica).join('')}</div>` : ''}
    </div>`;
    const box = $('#certBox');
    if (!cert) {
      box.innerHTML = `<h3 style="margin-top:0">📜 Certificado</h3><p class="muted" style="margin:0">Se desbloquea cuando apruebas el examen final con ${NOTA_FINAL}% o más.${f ? ` Tu mejor nota hasta ahora es ${f.best}%.` : ''}</p>`;
      return;
    }
    box.innerHTML = `<h3 style="margin-top:0">📜 Tu certificado</h3>
      <p>Aprobaste el examen final con <b>${cert.best}%</b>. Escribe tu nombre como quieres que aparezca y descarga el certificado.</p>
      <div class="row"><input id="certNombre" class="gloss-search" style="max-width:360px;margin:0" maxlength="60" placeholder="Nombre y apellido" value="${esc(Store.data.nombre || '')}"><button class="btn btn-primary" id="certBtn">⬇ Descargar certificado (PNG)</button></div>
      <canvas id="certCanvas" width="1600" height="1130" class="cert-canvas"></canvas>`;
    const dibujar = () => dibujarCertificado($('#certCanvas'), $('#certNombre').value.trim() || 'Tu nombre', cert, aprobados);
    $('#certNombre').addEventListener('input', () => { Store.data.nombre = $('#certNombre').value.trim(); Store.saveSoon(); dibujar(); });
    $('#certBtn').addEventListener('click', () => {
      if (!$('#certNombre').value.trim()) { toast('Escribe tu nombre primero'); $('#certNombre').focus(); return; }
      dibujar();
      const a = document.createElement('a');
      a.href = $('#certCanvas').toDataURL('image/png');
      a.download = 'certificado-academia-de-datos.png'; a.click();
    });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(dibujar);
  }

  function codigoCertificado(nombre, cert) {
    // identificador corto del certificado (FNV-1a sobre nombre, fecha y nota)
    let h = 0x811c9dc5;
    for (const ch of `${nombre}|${cert.at}|${cert.best}`) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return 'AD-' + h.toString(16).toUpperCase().padStart(8, '0');
  }

  function dibujarCertificado(cv, nombre, cert, aprobados) {
    const x = cv.getContext('2d'), W = cv.width, H = cv.height;
    const fuente = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif';
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#4f46e5'; x.lineWidth = 14; x.strokeRect(40, 40, W - 80, H - 80);
    x.strokeStyle = '#c7c9f5'; x.lineWidth = 3; x.strokeRect(70, 70, W - 140, H - 140);
    x.textAlign = 'center'; x.fillStyle = '#4f46e5';
    x.font = `700 34px ${fuente}`; x.fillText('ACADEMIA DE DATOS', W / 2, 190);
    x.fillStyle = '#171a26'; x.font = `800 70px ${fuente}`; x.fillText('Certificado de aprobación', W / 2, 300);
    x.fillStyle = '#4a4f63'; x.font = `400 32px ${fuente}`; x.fillText('Se certifica que', W / 2, 400);
    let tam = 84; x.font = `800 ${tam}px ${fuente}`;
    while (x.measureText(nombre).width > W - 300 && tam > 40) { tam -= 4; x.font = `800 ${tam}px ${fuente}`; }
    x.fillStyle = '#171a26'; x.fillText(nombre, W / 2, 510);
    x.strokeStyle = '#e1e3ec'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 420, 545); x.lineTo(W / 2 + 420, 545); x.stroke();
    x.fillStyle = '#4a4f63'; x.font = `400 32px ${fuente}`;
    x.fillText('aprobó el examen final del curso Ingeniería de Datos: de cero a experto', W / 2, 620);
    x.fillText(`con una nota de ${cert.best}%`, W / 2, 670);
    x.fillStyle = '#767b90';
    const lineaAjustada = (txt, y) => { let t = 26; x.font = `400 ${t}px ${fuente}`; while (x.measureText(txt).width > W - 280 && t > 16) { t -= 1; x.font = `400 ${t}px ${fuente}`; } x.fillText(txt, W / 2, y); };
    lineaAjustada('SQL · Python · Spark · PySpark · dbt · Airflow · Modelado · Arquitectura · Terraform · Azure · AWS · Google Cloud · Databricks', 750);
    lineaAjustada(`Examen final de ${C.modulos.length} módulos · ${aprobados} ${aprobados === 1 ? 'examen de módulo aprobado' : 'exámenes de módulo aprobados'}`, 795);
    const fecha = new Date(cert.at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
    x.textAlign = 'left'; x.fillStyle = '#4a4f63'; x.font = `400 26px ${fuente}`;
    x.fillText(`Fecha: ${fecha}`, 150, H - 170);
    x.textAlign = 'right'; x.fillText(`Código: ${codigoCertificado(nombre, cert)}`, W - 150, H - 170);
    x.textAlign = 'center'; x.font = `56px ${fuente}`; x.fillText('🎓', W / 2, H - 160);
  }

  // ---- piezas comunes a exámenes y simulacros
  const CERT_BY_ID = new Map((C.certificaciones || []).map((c) => [c.id, c]));
  const colorearCodigo = (root) => $$('pre[data-lang]', root).forEach((pre) => { try { highlight(pre); } catch (e) { /* sin resaltado */ } });

  // agrupa las preguntas de un mismo caso de estudio para que queden seguidas
  function agruparCasos(preguntas) {
    const grupos = [], porCaso = new Map();
    for (const p of preguntas) {
      if (!p.caso) { grupos.push([p]); continue; }
      if (!porCaso.has(p.caso)) { const g = []; porCaso.set(p.caso, g); grupos.push(g); }
      porCaso.get(p.caso).push(p);
    }
    return grupos.flat();
  }

  function htmlPregunta(p, i, base, opts = {}) {
    const tipo = p.multiple ? 'checkbox' : 'radio';
    const caso = p.caso && base.casos ? base.casos[p.caso] : null;
    const casoHtml = !caso ? '' : opts.casoAbierto
      ? `<div class="exam-caso"><div class="exam-caso-tit">📋 Caso de estudio: ${esc(caso.titulo)}</div><div class="prose">${caso.html}</div></div>`
      : `<details class="exam-caso exam-caso-mini"><summary>📋 Caso de estudio: ${esc(caso.titulo)} (releer)</summary><div class="prose">${caso.html}</div></details>`;
    return `<div class="card exam-q" data-i="${i}" data-id="${esc(p.id)}">
      ${casoHtml}
      <div class="exam-q-head"><span class="badge b-type">Pregunta ${i + 1}</span>${opts.badges || ''}${p.multiple ? `<span class="badge b-experto">Elige ${p.multiple}</span>` : ''}<span class="badge tag">${esc(p.tema)}</span></div>
      <div class="prose exam-enunciado">${p.enunciado}</div>
      <div class="quiz-opts">${p.opciones.map((o, j) => `<label class="quiz-opt"><input type="${tipo}" name="q${i}" value="${j}"><span>${o.text}</span></label>`).join('')}</div>
      <div class="exam-fb" hidden></div>
    </div>`;
  }

  // respuesta múltiple: todo o nada, como en los exámenes oficiales
  const esCorrecta = (p, elegidas) => elegidas.length > 0 && p.opciones.every((o, j) => o.ok === elegidas.includes(j));

  function corregirTarjeta(card, p, elegidas) {
    const ok = esCorrecta(p, elegidas);
    $$('.quiz-opt', card).forEach((l, j) => { l.classList.toggle('right', p.opciones[j].ok); l.classList.toggle('wrong', elegidas.includes(j) && !p.opciones[j].ok); $('input', l).checked = elegidas.includes(j); $('input', l).disabled = true; });
    card.classList.add(ok ? 'ok' : 'mal');
    const fb = $('.exam-fb', card); fb.hidden = false;
    const parcial = p.multiple && !ok && elegidas.some((j) => p.opciones[j].ok) ? ` (elegiste ${elegidas.filter((j) => p.opciones[j].ok).length} de ${p.multiple} correctas)` : '';
    fb.innerHTML = `<div class="exam-fb-tit ${ok ? 'ok' : 'mal'}">${ok ? '✓ Correcto' : !elegidas.length ? '— Sin responder' : '✗ Incorrecto' + parcial}</div>${p.porque}<p class="small" style="margin-bottom:0">📚 Repasar: <a href="#/l/${p.leccion.id}">${esc(p.leccion.titulo)}</a></p>`;
    colorearCodigo(fb);
    return ok;
  }

  // resultado por dominio de una certificación: [{nombre, peso, bien, total, pct, lecciones}]
  function porDominio(cert, preguntas, oks) {
    return cert.dominios.map((d, j) => {
      const idx = preguntas.map((p, i) => (p.dominio === j ? i : -1)).filter((i) => i >= 0);
      const bien = idx.filter((i) => oks[i]).length;
      return { nombre: d.nombre, rango: d.rango || d.peso + '%', bien, total: idx.length, pct: idx.length ? Math.round((bien / idx.length) * 100) : null, lecciones: d.lecciones };
    });
  }

  function htmlDominios(doms, minimo) {
    return `<div class="sim-doms">${doms.filter((d) => d.total).map((d) => `<div class="sim-dom ${d.pct >= minimo ? 'ok' : 'mal'}">
      <div class="sim-dom-head"><b>${esc(d.nombre)}</b><span class="small muted">peso ${esc(d.rango)}</span><span class="sim-dom-pct">${d.pct}% <small>(${d.bien}/${d.total})</small></span></div>
      <div class="bar"><i style="width:${d.pct}%"></i><span class="bar-meta" style="left:${minimo}%"></span></div>
      ${d.pct < minimo && d.lecciones.length ? `<div class="small">📚 Repasa: ${d.lecciones.map((l) => `<a href="#/l/${l.id}">${esc(l.titulo)}</a>`).join(' · ')}</div>` : ''}
    </div>`).join('')}</div>`;
  }

  function viewExamen(id, dom = null) {
    const esFinal = id === 'final';
    const base = esFinal ? null : EXAMENES.get(id);
    if (!esFinal && !base) { main.innerHTML = '<div class="container prose"><h1>Examen no encontrado</h1><p><a href="#/examenes">Ver los exámenes</a></p></div>'; return; }
    const m = esFinal ? null : MODULE_BY_ID.get(base.modulo);
    const cert = base && base.cert ? CERT_BY_ID.get(base.cert) : null;
    if (!cert || !cert.dominios[dom]) dom = null; // práctica de un solo dominio: #/examen/<id>?d=<n>
    const clave = dom === null ? id : `${id}@${dom}`;
    const titulo = esFinal ? '🎓 Examen final' : base.titulo ? `🏅 ${base.titulo}${dom === null ? '' : ' · ' + cert.dominios[dom].nombre}` : `${m.icono} Examen: ${m.titulo}`;
    const minimo = esFinal ? NOTA_FINAL : NOTA_MODULO;
    const preguntas = agruparCasos(esFinal ? preguntasFinal() : barajar(base.preguntas.filter((p) => dom === null || p.dominio === dom))).map((p) => ({ ...p, opciones: barajar(p.opciones) }));
    const modDe = (p) => MODULE_BY_ID.get(p.modulo);
    const vistos = new Set();
    main.innerHTML = `<div class="container">
      <div class="crumbs"><a href="#/examenes">Exámenes</a><span>/</span><span>${esc(esFinal ? 'Examen final' : base.titulo || m.titulo)}</span></div>
      <h1 style="margin-bottom:4px">${esc(titulo)}</h1>
      <p class="muted" style="margin-top:0">${preguntas.length} preguntas · se aprueba con ${minimo}% · las preguntas y las opciones cambian de orden en cada intento. En las de respuesta múltiple hay que marcar todas las correctas. Responde todas y corrige al final.</p>
      ${cert && cert.simulacro ? `<div class="callout callout-tip"><div class="callout-title">⏱ ¿Quieres practicar como en el examen real?</div><p>El <a href="#/simulacro/${cert.id}">simulacro de ${esc(cert.codigo)}</a> tiene la cantidad de preguntas y el tiempo del examen oficial, y te muestra el resultado por dominio.</p></div>` : ''}
      <form id="exForm">${preguntas.map((p, i) => { const abierto = p.caso && !vistos.has(p.caso); if (p.caso) vistos.add(p.caso); return htmlPregunta(p, i, base || {}, { casoAbierto: abierto, badges: esFinal ? `<span class="badge">${modDe(p).icono} ${esc(modDe(p).titulo)}</span>` : '' }); }).join('')}
      <div class="exam-barra"><span id="exCont" class="small"></span><button type="submit" class="btn btn-ok btn-lg">Corregir examen</button></div>
      </form>
      <div id="exRes"></div>
    </div>`;
    colorearCodigo(main);
    const elegidasDe = (i) => $$(`input[name="q${i}"]:checked`).map((x) => Number(x.value));
    const cont = () => { const n = preguntas.filter((_, i) => elegidasDe(i).length).length; $('#exCont').textContent = `Respondidas: ${n} de ${preguntas.length}`; return n; };
    $('#exForm').addEventListener('change', cont); cont();
    $('#exForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const n = cont();
      if (n < preguntas.length && !confirm(`Te faltan ${preguntas.length - n} preguntas. Las que no respondas cuentan como incorrectas. ¿Corregir igual?`)) return;
      const repasar = new Map();
      const oks = preguntas.map((p, i) => { const ok = corregirTarjeta($(`.exam-q[data-i="${i}"]`), p, elegidasDe(i)); if (!ok) repasar.set(p.leccion.id, p.leccion.titulo); return ok; });
      const bien = oks.filter(Boolean).length;
      const pct = Math.round((bien / preguntas.length) * 100), aprobo = pct >= minimo;
      const N = notas(), prev = N[clave] || { best: 0, intentos: 0 };
      N[clave] = { best: Math.max(prev.best, pct), last: pct, intentos: prev.intentos + 1, at: pct > prev.best ? Date.now() : prev.at || Date.now() };
      Store.save();
      $('.exam-barra').remove();
      const otraVez = `<button class="btn" id="exOtra">↻ Rendir de nuevo</button>`;
      $('#exRes').innerHTML = `<div class="card exam-res ${aprobo ? 'ok' : 'mal'}">
        <div class="exam-nota">${pct}%</div>
        <div><h2 style="margin:0 0 4px">${aprobo ? (esFinal ? '🎓 ¡Aprobaste el examen final!' : '✓ ¡Aprobaste!') : 'Todavía no: necesitas ' + minimo + '%'}</h2>
        <p style="margin:0">Respondiste bien <b>${bien} de ${preguntas.length}</b>. ${prev.best ? `Tu mejor nota anterior era ${prev.best}%.` : ''}</p>
        ${cert ? `<p style="margin:10px 0 4px"><b>Resultado por dominio:</b></p>${htmlDominios(porDominio(cert, preguntas, oks), minimo)}` : repasar.size ? `<p style="margin:10px 0 4px"><b>Para repasar:</b></p><ul class="exam-repasar">${[...repasar].map(([lid, t]) => `<li><a href="#/l/${lid}">${esc(t)}</a></li>`).join('')}</ul>` : '<p>¡Sin errores! 🎉</p>'}
        <div class="row" style="margin-top:10px">${aprobo && esFinal ? '<a class="btn btn-primary" href="#/examenes">📜 Descargar el certificado</a>' : ''}${otraVez}<a class="btn btn-ghost" href="#/examenes">Volver a los exámenes</a></div>
        <p class="small muted" style="margin:10px 0 0">Abajo tienes cada pregunta corregida con su explicación.</p></div></div>`;
      $('#exOtra').addEventListener('click', () => viewExamen(id, dom));
      $('#exRes').scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateProgressPill();
    });
  }

  // ---------------------------------------------------------------- simulacro
  // Examen con la cantidad de preguntas y el tiempo del oficial, preguntas repartidas según el peso de
  // cada dominio, una por pantalla, con marcas para revisar. El intento en curso se guarda: si sales,
  // al volver sigue donde estaba (el reloj no se detiene).
  let relojVista = null;
  const sims = () => (Store.data.simulacros = Store.data.simulacros || {});

  function elegirSimulacro(cert, base) {
    const total = Math.min(cert.simulacro.preguntas, base.preguntas.length);
    const pesos = cert.dominios.map((d) => d.peso);
    const disp = cert.dominios.map((_, j) => barajar(base.preguntas.filter((p) => p.dominio === j)));
    // cuota por dominio con el método del mayor resto, sin pasarse de lo que hay en el banco
    const suma = pesos.reduce((a, b) => a + b, 0);
    const exacto = pesos.map((w) => (w / suma) * total);
    const cuota = exacto.map((x, j) => Math.min(Math.floor(x), disp[j].length));
    let falta = total - cuota.reduce((a, b) => a + b, 0);
    const orden = exacto.map((x, j) => [x - Math.floor(x), j]).sort((a, b) => b[0] - a[0]).map(([, j]) => j);
    while (falta > 0) {
      const j = orden.find((k) => cuota[k] < disp[k].length);
      if (j === undefined) break;
      cuota[j]++; falta--; orden.push(orden.splice(orden.indexOf(j), 1)[0]);
    }
    return agruparCasos(barajar(disp.flatMap((ps, j) => ps.slice(0, cuota[j]))));
  }

  function viewSimulacro(certId) {
    const cert = CERT_BY_ID.get(certId), base = cert && cert.examen ? EXAMENES.get(cert.examen) : null;
    if (!cert || !base || !cert.simulacro) { main.innerHTML = '<div class="container prose"><h1>Simulacro no encontrado</h1><p><a href="#/certificaciones">Ver las certificaciones</a></p></div>'; return; }
    const activo = Store.data.simActivo && Store.data.simActivo.cert === certId ? Store.data.simActivo : null;
    if (activo) return correrSimulacro(cert, base, activo);
    const n = Math.min(cert.simulacro.preguntas, base.preguntas.length);
    const minutos = Math.round((cert.simulacro.minutos * n) / cert.simulacro.preguntas);
    const hist = (sims()[certId] || []).slice().reverse();
    const otro = Store.data.simActivo ? CERT_BY_ID.get(Store.data.simActivo.cert) : null;
    main.innerHTML = `<div class="container">
      <div class="crumbs"><a href="#/certificaciones?c=${esc(cert.id)}">Certificaciones</a><span>/</span><span>Simulacro ${esc(cert.codigo)}</span></div>
      <h1 style="margin-bottom:4px">⏱ Simulacro: ${esc(cert.nombre)}</h1>
      <p class="muted" style="margin-top:0">${esc(cert.proveedor)} · ${esc(cert.codigo)}</p>
      <div class="cert-datos"><div><b>${n}</b><span>preguntas</span></div><div><b>${minutos} min</b><span>tiempo</span></div><div><b>${cert.simulacro.aprobar}%</b><span>para aprobar</span></div><div><b>${base.preguntas.length}</b><span>preguntas en el banco</span></div></div>
      <div class="card prose" style="padding:16px 20px">
        <h3 style="margin-top:0">Cómo funciona</h3>
        <ul>
          <li>Las preguntas salen del banco al azar, repartidas según el <b>peso de cada dominio</b> del examen oficial. Cada intento es distinto.</li>
          <li>Ves <b>una pregunta por pantalla</b>. Puedes ir y volver, y <b>marcar para revisar</b> las dudosas; el mapa de preguntas muestra cuáles faltan.</li>
          <li>Las de <b>respuesta múltiple</b> dicen "Elige N" y solo suman si marcas todas las correctas, como en el examen real.</li>
          <li>El reloj no se detiene: al llegar a cero se corrige solo. Si cierras la página, al volver sigues donde estabas.</li>
          <li>Al final ves tu nota, el <b>resultado por dominio</b> con las lecciones para repasar y cada pregunta explicada.</li>
        </ul>
        ${n < cert.simulacro.preguntas ? `<p class="small muted">El examen oficial tiene ${cert.simulacro.preguntas} preguntas en ${cert.simulacro.minutos} minutos; el banco tiene ${base.preguntas.length}, así que el tiempo se ajusta en proporción.</p>` : ''}
        <p class="small muted">Atajos de teclado: <kbd>1</kbd>–<kbd>6</kbd> eligen opción · <kbd>→</kbd> siguiente · <kbd>←</kbd> anterior · <kbd>M</kbd> marcar para revisar.</p>
        ${otro ? `<div class="callout callout-cuidado"><p>Tienes un simulacro de ${esc(otro.codigo)} en curso. Si empiezas este, aquel se descarta. <a href="#/simulacro/${otro.id}">Volver a ese simulacro</a></p></div>` : ''}
        <button class="btn btn-primary btn-lg" id="simEmpezar">Comenzar el simulacro →</button>
      </div>
      ${hist.length ? `<h2 class="section-title">Tus intentos</h2>
      <div class="card" style="padding:8px 16px"><table class="sim-hist"><thead><tr><th>Fecha</th><th>Nota</th><th>Tiempo</th>${cert.dominios.map((d, j) => `<th title="${esc(d.nombre)}">D${j + 1}</th>`).join('')}</tr></thead><tbody>
      ${hist.map((h) => `<tr><td>${new Date(h.at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</td><td class="${h.pct >= cert.simulacro.aprobar ? 'ok' : 'mal'}"><b>${h.pct}%</b></td><td>${Math.round(h.seg / 60)} min</td>${cert.dominios.map((_, j) => `<td>${h.dom[j] == null ? '—' : h.dom[j] + '%'}</td>`).join('')}</tr>`).join('')}
      </tbody></table><p class="small muted">${cert.dominios.map((d, j) => `D${j + 1}: ${esc(d.nombre)}`).join(' · ')}</p></div>` : ''}
    </div>`;
    $('#simEmpezar').addEventListener('click', () => {
      const ps = elegirSimulacro(cert, base);
      const st = { cert: certId, ids: ps.map((p) => p.id), orden: Object.fromEntries(ps.map((p) => [p.id, barajar(p.opciones.map((_, j) => j))])), resp: {}, marcas: [], actual: 0, inicio: Date.now(), fin: Date.now() + minutos * 60000 };
      Store.data.simActivo = st; Store.save();
      correrSimulacro(cert, base, st);
    });
  }

  function correrSimulacro(cert, base, st) {
    const porId = new Map(base.preguntas.map((p) => [p.id, p]));
    const preguntas = st.ids.map((id) => porId.get(id)).filter(Boolean).map((p) => ({ ...p, opciones: (st.orden[p.id] || p.opciones.map((_, j) => j)).map((j) => p.opciones[j]) }));
    if (preguntas.length !== st.ids.length) { delete Store.data.simActivo; Store.save(); return viewSimulacro(cert.id); } // el banco cambió
    const guardar = () => Store.saveSoon();
    main.innerHTML = `<div class="container sim">
      <div class="sim-barra">
        <b>⏱ ${esc(cert.codigo)}</b>
        <span id="simReloj" class="sim-reloj"></span>
        <span id="simCont" class="small muted"></span>
        <button class="btn btn-ok" id="simTerminar">Terminar y corregir</button>
      </div>
      <div class="sim-mapa" id="simMapa"></div>
      <div id="simPregunta"></div>
      <div class="row sim-nav">
        <button class="btn" id="simAnt">← Anterior</button>
        <button class="btn" id="simMarcar"></button>
        <button class="btn btn-primary" id="simSig">Siguiente →</button>
      </div>
    </div>`;
    const respondida = (i) => (st.resp[preguntas[i].id] || []).length > 0;
    const pintarMapa = () => {
      $('#simMapa').innerHTML = preguntas.map((p, i) => `<button class="sim-n ${respondida(i) ? 'resp' : ''} ${st.marcas.includes(p.id) ? 'marca' : ''} ${i === st.actual ? 'act' : ''}" data-n="${i}" title="Pregunta ${i + 1}${st.marcas.includes(p.id) ? ' (marcada)' : ''}">${i + 1}</button>`).join('');
      const r = preguntas.filter((_, i) => respondida(i)).length;
      $('#simCont').textContent = `${r}/${preguntas.length} respondidas · ${st.marcas.length} marcadas`;
    };
    const pintar = () => {
      const i = st.actual, p = preguntas[i];
      const anterior = i > 0 && preguntas[i - 1].caso === p.caso;
      $('#simPregunta').innerHTML = htmlPregunta(p, i, base, { casoAbierto: !anterior });
      (st.resp[p.id] || []).forEach((j) => { const inp = $(`#simPregunta input[value="${j}"]`); if (inp) inp.checked = true; });
      colorearCodigo($('#simPregunta'));
      $('#simAnt').disabled = i === 0;
      $('#simSig').textContent = i === preguntas.length - 1 ? 'Revisar y terminar' : 'Siguiente →';
      $('#simMarcar').textContent = st.marcas.includes(p.id) ? '🚩 Quitar marca' : '🚩 Marcar para revisar';
      pintarMapa();
    };
    const ir = (i) => { st.actual = Math.max(0, Math.min(preguntas.length - 1, i)); guardar(); pintar(); window.scrollTo(0, 0); };
    $('#simPregunta').addEventListener('change', () => {
      const p = preguntas[st.actual];
      st.resp[p.id] = $$('#simPregunta input:checked').map((x) => Number(x.value));
      guardar(); pintarMapa();
    });
    const marcar = () => { const id = preguntas[st.actual].id; st.marcas = st.marcas.includes(id) ? st.marcas.filter((x) => x !== id) : [...st.marcas, id]; guardar(); pintar(); };
    $('#simMapa').addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (b) ir(Number(b.dataset.n)); });
    $('#simAnt').addEventListener('click', () => ir(st.actual - 1));
    $('#simSig').addEventListener('click', () => (st.actual === preguntas.length - 1 ? terminar(false) : ir(st.actual + 1)));
    $('#simMarcar').addEventListener('click', marcar);
    $('#simTerminar').addEventListener('click', () => terminar(false));
    function terminar(porTiempo) {
      if (!porTiempo) {
        const sin = preguntas.filter((_, i) => !respondida(i)).length;
        const msg = [sin ? `${sin} sin responder` : '', st.marcas.length ? `${st.marcas.length} marcadas para revisar` : ''].filter(Boolean).join(' y ');
        if (!confirm(msg ? `Tienes ${msg}. ¿Terminar y corregir igual?` : '¿Terminar y corregir el simulacro?')) return;
      }
      clearInterval(relojVista); relojVista = null; setTeclas(null);
      resultadoSimulacro(cert, base, st, preguntas, porTiempo);
    }
    const tic = () => {
      const quedan = Math.max(0, Math.round((st.fin - Date.now()) / 1000));
      const el = $('#simReloj'); if (!el) return;
      el.textContent = `${Math.floor(quedan / 60)}:${String(quedan % 60).padStart(2, '0')}`;
      el.classList.toggle('poco', quedan <= 300);
      if (quedan === 0) terminar(true);
    };
    clearInterval(relojVista); relojVista = setInterval(tic, 1000); tic();
    setTeclas((e) => {
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== 'radio' && document.activeElement.type !== 'checkbox') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); if (st.actual < preguntas.length - 1) ir(st.actual + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(st.actual - 1); }
      else if (e.key === 'm' || e.key === 'M') marcar();
      else if (/^[1-6]$/.test(e.key)) { const inp = $$('#simPregunta input')[Number(e.key) - 1]; if (inp) { inp.checked = inp.type === 'checkbox' ? !inp.checked : true; inp.dispatchEvent(new Event('change', { bubbles: true })); } }
    });
    pintar();
  }

  function resultadoSimulacro(cert, base, st, preguntas, porTiempo) {
    const seg = Math.round((Math.min(Date.now(), st.fin) - st.inicio) / 1000);
    const minimo = cert.simulacro.aprobar;
    main.innerHTML = `<div class="container">
      <div class="crumbs"><a href="#/certificaciones?c=${esc(cert.id)}">Certificaciones</a><span>/</span><a href="#/simulacro/${esc(cert.id)}">Simulacro ${esc(cert.codigo)}</a><span>/</span><span>Resultado</span></div>
      <div id="simRes"></div>
      <div class="gloss-filter" id="simFiltro"><button class="chip active" data-f="">Todas</button><button class="chip" data-f="mal">Solo incorrectas</button><button class="chip" data-f="marca">Solo marcadas</button></div>
      <div id="simLista">${preguntas.map((p, i) => htmlPregunta(p, i, base, { casoAbierto: false, badges: st.marcas.includes(p.id) ? '<span class="badge">🚩 marcada</span>' : '' })).join('')}</div>
    </div>`;
    const oks = preguntas.map((p, i) => corregirTarjeta($(`#simLista .exam-q[data-i="${i}"]`), p, st.resp[p.id] || []));
    colorearCodigo($('#simLista'));
    const bien = oks.filter(Boolean).length, pct = Math.round((bien / preguntas.length) * 100), aprobo = pct >= minimo;
    const doms = porDominio(cert, preguntas, oks);
    const H = sims(); H[cert.id] = [...(H[cert.id] || []), { at: Date.now(), pct, n: preguntas.length, seg, dom: doms.map((d) => d.pct) }].slice(-20);
    delete Store.data.simActivo; Store.save();
    const flojos = doms.filter((d) => d.total && d.pct < minimo).sort((a, b) => a.pct - b.pct);
    $('#simRes').innerHTML = `<div class="card exam-res ${aprobo ? 'ok' : 'mal'}">
      <div class="exam-nota">${pct}%</div>
      <div><h2 style="margin:0 0 4px">${aprobo ? '✓ Aprobarías con este resultado' : `Todavía no: el corte es ${minimo}%`}</h2>
      <p style="margin:0">Respondiste bien <b>${bien} de ${preguntas.length}</b> en ${Math.floor(seg / 60)} min ${seg % 60} s${porTiempo ? ' (se terminó el tiempo)' : ''}. ${flojos.length ? `Lo más flojo: <b>${esc(flojos[0].nombre)}</b>.` : 'Todos los dominios están por encima del corte.'}</p>
      <p style="margin:10px 0 4px"><b>Resultado por dominio</b> (la línea marca el ${minimo}%):</p>
      ${htmlDominios(doms, minimo)}
      <div class="row" style="margin-top:10px"><a class="btn btn-primary" href="#/simulacro/${esc(cert.id)}">↻ Otro simulacro</a><a class="btn" href="#/certificaciones?c=${esc(cert.id)}">Ver el temario</a></div>
      <p class="small muted" style="margin:10px 0 0">El corte real no siempre se publica y la nota oficial es escalada: tómalo como referencia. Apunta a superar el ${Math.min(90, minimo + 10)}% de forma estable antes de rendir.</p></div></div>`;
    $('#simFiltro').addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      $$('#simFiltro .chip').forEach((x) => x.classList.toggle('active', x === b));
      $$('#simLista .exam-q').forEach((c, i) => { c.hidden = (b.dataset.f === 'mal' && oks[i]) || (b.dataset.f === 'marca' && !st.marcas.includes(preguntas[i].id)); });
    });
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- certificaciones
  function viewCertificaciones(abrir = '') {
    const CERTS = C.certificaciones || [];
    const provs = [...new Set(CERTS.map((c) => c.proveedor))];
    const N = notas();
    let prov = '';
    main.innerHTML = `<div class="container">
      <h1 style="margin-bottom:4px">🏅 Certificaciones</h1>
      <p class="muted" style="margin-top:0">Las certificaciones de datos e IA de Databricks, Azure, AWS y Google Cloud, con su temario completo: cada dominio del examen, cuánto pesa y qué lecciones del curso lo cubren. Para cada una tienes un <b>plan de estudio</b> que se arma con la fecha de tu examen, <b>tarjetas</b> de las situaciones típicas, <b>práctica por dominio</b> y un <b>simulacro</b> con la cantidad de preguntas y el tiempo del examen real.</p>
      <div class="callout callout-cuidado"><div class="callout-title">⚠️ Los temarios cambian seguido</div><p>Los dominios y porcentajes vienen de las guías oficiales vigentes en la fecha que indica cada certificación. Los proveedores los actualizan varias veces al año y cambian nombres de productos: <b>antes de rendir, confirma el temario en la guía oficial</b> (el enlace está en cada tarjeta).</p></div>
      <div class="gloss-filter" id="cprov"><button class="chip active" data-p="">Todas</button>${provs.map((p) => `<button class="chip" data-p="${esc(p)}">${esc(p)} <span class="muted">${CERTS.filter((c) => c.proveedor === p).length}</span></button>`).join('')}</div>
      <div id="clist"></div>
    </div>`;
    const ultimo = (id) => { const h = sims()[id]; return h && h.length ? h[h.length - 1] : null; };
    const tarjeta = (c) => {
      const ex = c.examen ? EXAMENES.get(c.examen) : null, n = c.examen ? N[c.examen] : null;
      const lecs = c.dominios.flatMap((d) => d.lecciones);
      const hechas = new Set(lecs.filter((l) => Store.lessonDone(LESSON_BY_ID.get(l.id))).map((l) => l.id));
      const unicas = new Set(lecs.map((l) => l.id));
      const pct = unicas.size ? Math.round((hechas.size / unicas.size) * 100) : 0;
      const f = c.formato;
      const dato = (k, v) => (v ? `<div><b>${esc(v)}</b><span>${k}</span></div>` : '');
      return `<details class="card cert-card" id="cert-${esc(c.id)}" ${abrir === c.id ? 'open' : ''}>
        <summary>
          <span class="cert-tit"><b>${esc(c.nombre)}</b><span class="badge b-type">${esc(c.codigo)}</span><span class="badge ${levelClass(c.nivel)}">${esc(c.nivel)}</span></span>
          <span class="cert-sub small muted">${esc(c.proveedor)} · ${esc(c.rol || '')}</span>
          <span class="cert-prog small"><span class="bar"><i style="width:${pct}%;background:var(--brand)"></i></span> ${hechas.size}/${unicas.size} lecciones${n ? ` · práctica: ${n.best}%` : ''}</span>
        </summary>
        <div class="cert-body">
          <div class="cert-datos">${dato('preguntas', f.preguntas)}${dato('minutos', f.minutos)}${dato('costo', f.costo)}${dato('para aprobar', f.aprobacion)}${dato('vigencia', f.vigencia)}</div>
          ${c.notas ? `<div class="prose cert-notas">${c.notas}</div>` : ''}
          <h4>Dominios del examen</h4>
          ${c.dominios.map((d, j) => `<div class="cert-dom">
            <div class="cert-dom-head"><b>${esc(d.nombre)}</b><span>${esc(d.rango || d.peso + '%')}</span></div>
            <div class="bar"><i style="width:${d.peso * 2.5}%;max-width:100%;background:var(--brand)"></i></div>
            ${d.temas ? `<ul class="cert-temas">${d.temas.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
            ${d.lecciones.length ? `<div class="cert-lecs small">📚 ${d.lecciones.map((l) => `<a href="#/l/${l.id}">${hechas.has(l.id) ? '✓ ' : ''}${esc(l.titulo)}</a>`).join(' · ')}</div>` : ''}
            ${ex ? `<div class="cert-lecs small">🎯 <a href="#/examen/${ex.id}?d=${j}">Practicar este dominio (${ex.preguntas.filter((p) => p.dominio === j).length} preguntas)</a>${N[`${ex.id}@${j}`] ? ` · mejor nota ${N[`${ex.id}@${j}`].best}%` : ''}${c.claves.some((k) => k.dominio === j) ? ` · <a href="#/claves/${c.id}?d=${j}">🃏 tarjetas</a>` : ''}</div>` : ''}
          </div>`).join('')}
          <div class="row" style="margin-top:14px">
            ${ex ? `<a class="btn" href="#/examen/${ex.id}">🏅 Examen de práctica (${ex.preguntas.length} preguntas)${n ? ` · mejor nota ${n.best}%` : ''}</a>` : ''}
            ${ex && c.simulacro ? `<a class="btn btn-primary" href="#/simulacro/${c.id}">⏱ Simulacro (${Math.min(c.simulacro.preguntas, ex.preguntas.length)} preguntas)${ultimo(c.id) ? ` · último ${ultimo(c.id).pct}%` : ''}</a>` : ''}
            ${c.claves.length ? `<a class="btn" href="#/claves/${c.id}">🃏 Tarjetas (${c.claves.length})</a>` : ''}
            <a class="btn" href="#/plan/${c.id}">📅 Plan de estudio${planDe(c.id).fecha ? ' · ' + diasHasta(planDe(c.id).fecha) + ' días' : ''}</a>
            <a class="btn" href="${esc(c.fuente)}" target="_blank" rel="noopener">Guía oficial ↗</a>
            <span class="small muted">Temario según la guía vigente en ${esc(c.actualizado)}</span>
          </div>
        </div>
      </details>`;
    };
    const paint = () => {
      const lista = CERTS.filter((c) => !prov || c.proveedor === prov);
      $('#clist').innerHTML = provs.filter((p) => !prov || p === prov).map((p) => `<h2 class="section-title">${esc(p)}</h2>${lista.filter((c) => c.proveedor === p).map(tarjeta).join('')}`).join('');
    };
    $('#cprov').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; prov = b.dataset.p; $$('#cprov .chip').forEach((x) => x.classList.toggle('active', x === b)); paint(); });
    paint();
    if (abrir) setTimeout(() => document.getElementById('cert-' + abrir)?.scrollIntoView({ block: 'start' }), 50);
  }


  // ---------------------------------------------------------------- tarjetas de una certificación
  function viewClaves(certId, dom = null) {
    const cert = CERT_BY_ID.get(certId);
    if (!cert || !cert.claves.length) { main.innerHTML = '<div class="container prose"><h1>Tarjetas no encontradas</h1><p><a href="#/certificaciones">Ver las certificaciones</a></p></div>'; return; }
    if (!cert.dominios[dom]) dom = null;
    const clave = (k) => 'cert:' + k.id;
    const cfg = {
      clave,
      volver: { href: `#/claves/${cert.id}`, texto: `Tarjetas ${cert.codigo}` },
      examen: cert.examen ? `#/examen/${cert.examen}${dom === null ? '' : '?d=' + dom}` : null,
      frente: (k) => `<div class="rep-term rep-situacion">${k.frente}</div><p class="rep-preg">${k.dominio === null ? '' : `<span class="badge tag">${esc(cert.dominios[k.dominio].nombre)}</span> `}¿Qué servicio, opción o concepto es la respuesta? Dilo antes de dar vuelta.</p>`,
      dorso: (k) => `<div class="rep-def">${k.dorso}</div>`
    };
    main.innerHTML = `<div class="container">
      <div class="crumbs"><a href="#/certificaciones?c=${esc(cert.id)}">Certificaciones</a><span>/</span><span>Tarjetas ${esc(cert.codigo)}</span></div>
      <h1 style="margin-bottom:4px">🃏 Tarjetas: ${esc(cert.nombre)}</h1>
      <p class="muted" style="margin-top:0">Las situaciones que más se repiten en el examen y su respuesta: "si la pregunta dice esto, la respuesta suele ser aquello". Usan el mismo repaso espaciado que las tarjetas del glosario.</p>
      <div class="stats" id="kstats"></div>
      <div class="gloss-filter" id="kdoms"><button class="chip ${dom === null ? 'active' : ''}" data-d="">Todos los dominios</button>${cert.dominios.map((d, j) => cert.claves.some((k) => k.dominio === j) ? `<button class="chip ${dom === j ? 'active' : ''}" data-d="${j}">${esc(d.nombre)}</button>` : '').join('')}</div>
      <div class="row"><button class="btn btn-primary btn-lg" id="kstart"></button><a class="btn" href="#/plan/${esc(cert.id)}">📅 Plan de estudio</a></div>
      <h2 class="section-title">Todas las tarjetas</h2>
      <div id="klista" class="clave-lista"></div>
    </div>`;
    const lista = () => cert.claves.filter((k) => dom === null || k.dominio === dom);
    const pintar = () => {
      const c = tarjetas(), ahora = Date.now(), L = lista();
      const vistas = L.filter((k) => c[clave(k)]), dominadas = vistas.filter((k) => c[clave(k)].b >= 4).length;
      const pend = vistas.filter((k) => c[clave(k)].due <= ahora).length, nuevas = L.length - vistas.length;
      $('#kstats').innerHTML = `<div class="stat"><b>${pend}</b><span>para repasar hoy</span></div><div class="stat"><b>${nuevas}</b><span>sin ver</span></div><div class="stat"><b>${vistas.length - dominadas}</b><span>aprendiendo</span></div><div class="stat"><b>${dominadas}</b><span>dominadas</span></div>`;
      const n = Math.min(POR_SESION, pend + Math.min(nuevas, NUEVAS_POR_SESION));
      $('#kstart').textContent = n ? `Empezar: ${n} tarjetas →` : 'Practicar igual →';
      $('#klista').innerHTML = L.map((k) => `<details class="card clave"><summary>${c[clave(k)] && c[clave(k)].b >= 4 ? '✓ ' : ''}${k.frente}</summary><div class="prose">${k.dorso}</div></details>`).join('');
    };
    $('#kdoms').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (!b) return; location.hash = `#/claves/${cert.id}${b.dataset.d === '' ? '' : '?d=' + b.dataset.d}`; });
    $('#kstart').addEventListener('click', () => {
      const c = tarjetas(), ahora = Date.now(), L = lista();
      const pend = L.filter((k) => c[clave(k)] && c[clave(k)].due <= ahora).sort((a, b) => c[clave(a)].due - c[clave(b)].due);
      const nuevas = barajar(L.filter((k) => !c[clave(k)])).slice(0, NUEVAS_POR_SESION);
      let mazo = [...pend, ...nuevas].slice(0, POR_SESION);
      if (!mazo.length) mazo = barajar(L).slice(0, POR_SESION);
      sesionRepaso(barajar(mazo), 'explicar', cfg);
    });
    pintar();
  }

  // ---------------------------------------------------------------- plan de estudio
  // Se arma solo a partir de la fecha del examen: cada dominio recibe semanas según su peso, con sus
  // lecciones, tarjetas y práctica; la última semana es de simulacros. Las tareas que el sitio puede
  // comprobar (lecciones, prácticas, simulacros) se marcan solas; el resto se marca a mano.
  const planes = () => (Store.data.planes = Store.data.planes || {});
  const planDe = (id) => planes()[id] || {};
  const hoyISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const diasHasta = (iso) => Math.ceil((new Date(iso + 'T12:00:00') - new Date(hoyISO() + 'T12:00:00')) / DIA);

  function armarPlan(cert, fecha) {
    const ex = cert.examen ? EXAMENES.get(cert.examen) : null;
    const dias = fecha ? Math.max(7, diasHasta(fecha)) : 42;
    const semanas = Math.min(16, Math.max(2, Math.ceil(dias / 7)));
    const W = semanas - 1, total = cert.dominios.reduce((a, d) => a + d.peso, 0);
    const S = Array.from({ length: semanas }, () => []);
    const vistas = new Set();
    let acum = 0;
    if (cert.simulacro && ex) S[0].push({ id: 'diag', tipo: 'simulacro', texto: 'Simulacro diagnóstico: mide tu punto de partida (no importa la nota)', href: `#/simulacro/${cert.id}`, auto: 'sim1' });
    cert.dominios.forEach((d, j) => {
      const ini = Math.min(W - 1, Math.floor((acum / total) * W)); acum += d.peso;
      const fin = Math.min(W - 1, Math.max(ini, Math.ceil((acum / total) * W) - 1));
      for (const l of d.lecciones) if (!vistas.has(l.id)) { vistas.add(l.id); S[ini].push({ id: 'l:' + l.id, tipo: 'leccion', texto: `Estudiar «${l.titulo}» y hacer sus ejercicios`, href: `#/l/${l.id}`, auto: 'leccion', leccion: l.id, dom: j }); }
      if (cert.claves.some((k) => k.dominio === j)) S[fin].push({ id: 'k:' + j, tipo: 'tarjetas', texto: `Tarjetas del dominio «${d.nombre}»`, href: `#/claves/${cert.id}?d=${j}`, auto: 'claves', dom: j });
      if (ex && ex.preguntas.some((p) => p.dominio === j)) S[fin].push({ id: 'p:' + j, tipo: 'practica', texto: `Práctica del dominio «${d.nombre}» (${ex.preguntas.filter((p) => p.dominio === j).length} preguntas, objetivo ${cert.simulacro ? cert.simulacro.aprobar + 10 : 80}%)`, href: `#/examen/${ex.id}?d=${j}`, auto: 'practica', dom: j });
    });
    const F = S[semanas - 1];
    if (cert.simulacro && ex) {
      F.push({ id: 'sim-a', tipo: 'simulacro', texto: 'Simulacro completo con reloj', href: `#/simulacro/${cert.id}`, auto: 'sim2' });
      F.push({ id: 'errores', tipo: 'manual', texto: 'Revisar cada pregunta fallada del simulacro y releer la lección indicada' });
      F.push({ id: 'flojos', tipo: 'manual', texto: 'Repetir la práctica de los dominios por debajo del corte' });
      F.push({ id: 'sim-b', tipo: 'simulacro', texto: `Segundo simulacro: apunta a ${Math.min(90, cert.simulacro.aprobar + 10)}% o más`, href: `#/simulacro/${cert.id}`, auto: 'sim3' });
    }
    if (cert.claves.length) F.push({ id: 'k-todas', tipo: 'tarjetas', texto: 'Repasar todas las tarjetas pendientes', href: `#/claves/${cert.id}`, auto: 'claves-todas' });
    F.push({ id: 'guia', tipo: 'manual', texto: 'Confirmar el temario en la guía oficial y leer las reglas del examen (identificación, entorno, pausas)', href: cert.fuente, externo: true });
    return { semanas: S, dias, fecha };
  }

  function tareaHecha(cert, t, manual) {
    if (manual[t.id]) return true;
    const ex = cert.examen ? EXAMENES.get(cert.examen) : null, N = notas(), H = sims()[cert.id] || [], c = tarjetas();
    const meta = cert.simulacro ? cert.simulacro.aprobar : 70;
    if (t.auto === 'leccion') return Store.lessonDone(LESSON_BY_ID.get(t.leccion));
    if (t.auto === 'practica') { const n = N[`${ex.id}@${t.dom}`]; return !!n && n.best >= meta; }
    if (t.auto === 'sim1') return H.length >= 1;
    if (t.auto === 'sim2') return H.length >= 2;
    if (t.auto === 'sim3') return H.some((h) => h.pct >= Math.min(90, meta + 10));
    if (t.auto === 'claves') return cert.claves.filter((k) => k.dominio === t.dom).every((k) => c['cert:' + k.id]);
    if (t.auto === 'claves-todas') return cert.claves.every((k) => c['cert:' + k.id] && c['cert:' + k.id].due > Date.now());
    return false;
  }

  function viewPlan(certId) {
    const cert = CERT_BY_ID.get(certId);
    if (!cert) { main.innerHTML = '<div class="container prose"><h1>Certificación no encontrada</h1><p><a href="#/certificaciones">Ver las certificaciones</a></p></div>'; return; }
    const guardado = planDe(certId);
    const dibujar = () => {
      const st = planDe(certId), manual = st.hechos || {};
      const plan = armarPlan(cert, st.fecha);
      const todas = plan.semanas.flat(), hechas = todas.filter((t) => tareaHecha(cert, t, manual)).length;
      const pct = todas.length ? Math.round((hechas / todas.length) * 100) : 0;
      const semanaActual = st.fecha ? Math.max(0, Math.min(plan.semanas.length - 1, plan.semanas.length - Math.ceil(Math.max(1, diasHasta(st.fecha)) / 7))) : 0;
      const esperado = plan.semanas.slice(0, semanaActual).flat().filter((t) => !tareaHecha(cert, t, manual)).length;
      const H = (sims()[certId] || []).slice(-3), prom = H.length ? Math.round(H.reduce((a, h) => a + h.pct, 0) / H.length) : null;
      const meta = cert.simulacro ? cert.simulacro.aprobar : 70;
      const inicio = st.fecha ? new Date(new Date(st.fecha + 'T12:00:00') - plan.semanas.length * 7 * DIA) : null;
      const rango = (i) => { if (!inicio) return ''; const a = new Date(+inicio + i * 7 * DIA), b = new Date(+a + 6 * DIA); const f = (d) => d.toLocaleDateString('es', { day: 'numeric', month: 'short' }); return ` · ${f(a)} – ${f(b)}`; };
      const ico = { leccion: '📚', tarjetas: '🃏', practica: '🎯', simulacro: '⏱', manual: '✍️' };
      $('#planCuerpo').innerHTML = `
        <div class="stats">
          <div class="stat"><b>${st.fecha ? Math.max(0, diasHasta(st.fecha)) : '—'}</b><span>días hasta el examen</span></div>
          <div class="stat"><b>${pct}%</b><span>del plan completado</span></div>
          <div class="stat"><b>${prom === null ? '—' : prom + '%'}</b><span>promedio de tus últimos simulacros</span></div>
          <div class="stat"><b>${meta}%</b><span>corte de referencia</span></div>
        </div>
        ${st.fecha && esperado ? `<div class="callout callout-cuidado"><p>Vas con <b>${esperado}</b> tareas atrasadas de semanas anteriores. Prioriza las de práctica de los dominios con más peso.</p></div>` : ''}
        ${prom !== null ? `<div class="callout ${prom >= meta + 10 ? 'callout-tip' : 'callout-nota'}"><p>${prom >= meta + 10 ? '✓ Tus simulacros están por encima del corte con margen: buena señal para rendir.' : prom >= meta ? 'Tus simulacros están apenas por encima del corte: apunta a un margen de 10 puntos antes de rendir.' : 'Tus simulacros todavía están por debajo del corte: sigue el plan y repite la práctica de los dominios flojos.'}</p></div>` : ''}
        <div class="bar" style="margin:10px 0 18px"><i style="width:${pct}%"></i></div>
        ${plan.semanas.map((tareas, i) => `<div class="card plan-semana ${st.fecha && i === semanaActual ? 'actual' : ''}">
          <h3>${i === plan.semanas.length - 1 ? '🏁 Semana final: simulacros y repaso' : `Semana ${i + 1}`}<span class="small muted">${rango(i)}</span>${st.fecha && i === semanaActual ? '<span class="badge b-type">esta semana</span>' : ''}</h3>
          ${tareas.length ? tareas.map((t) => { const ok = tareaHecha(cert, t, manual); return `<label class="plan-tarea ${ok ? 'hecha' : ''}"><input type="checkbox" data-t="${esc(t.id)}" ${ok ? 'checked' : ''} ${t.auto && !manual[t.id] && ok ? 'disabled title="Se marcó solo"' : ''}><span>${ico[t.tipo] || '•'} ${t.href ? `<a href="${esc(t.href)}" ${t.externo ? 'target="_blank" rel="noopener"' : ''}>${esc(t.texto)}${t.externo ? ' ↗' : ''}</a>` : esc(t.texto)}${t.auto ? ' <span class="small muted">(se marca solo)</span>' : ''}</span></label>`; }).join('') : '<p class="small muted">Semana de margen: repasa tarjetas pendientes y rehace las prácticas con nota más baja.</p>'}
        </div>`).join('')}`;
    };
    main.innerHTML = `<div class="container">
      <div class="crumbs"><a href="#/certificaciones?c=${esc(cert.id)}">Certificaciones</a><span>/</span><span>Plan ${esc(cert.codigo)}</span></div>
      <h1 style="margin-bottom:4px">📅 Plan de estudio: ${esc(cert.nombre)}</h1>
      <p class="muted" style="margin-top:0">Indica la fecha del examen y el plan reparte los dominios en semanas según su peso: primero las lecciones, después las tarjetas y la práctica de cada dominio, y una semana final de simulacros. Lo que el sitio puede comprobar se marca solo.</p>
      <div class="card row" style="padding:14px 18px;align-items:center;gap:12px">
        <label for="planFecha"><b>Fecha del examen</b></label>
        <input type="date" id="planFecha" class="gloss-search" style="max-width:200px;margin:0" min="${hoyISO()}" value="${esc(guardado.fecha || '')}">
        <span class="small muted">${guardado.fecha ? '' : 'Sin fecha, el plan se arma para 6 semanas.'}</span>
        ${guardado.fecha ? '<button class="btn btn-ghost" id="planBorrar">Quitar la fecha</button>' : ''}
      </div>
      <div id="planCuerpo"></div>
    </div>`;
    $('#planFecha').addEventListener('change', () => { const v = $('#planFecha').value; planes()[certId] = { ...planDe(certId), fecha: v || undefined }; Store.save(); viewPlan(certId); });
    $('#planBorrar')?.addEventListener('click', () => { const p = planDe(certId); delete p.fecha; planes()[certId] = p; Store.save(); viewPlan(certId); });
    $('#planCuerpo').addEventListener('change', (e) => {
      const cb = e.target.closest('[data-t]'); if (!cb) return;
      const p = planDe(certId); p.hechos = p.hechos || {};
      if (cb.checked) p.hechos[cb.dataset.t] = Date.now(); else delete p.hechos[cb.dataset.t];
      planes()[certId] = p; Store.save(); dibujar();
    });
    dibujar();
  }

  // ---------------------------------------------------------------- búsqueda
  // el texto completo de las lecciones para buscar se descarga la primera vez que se usa el buscador
  let buscarPedido = false;
  window.__glosarioListo = () => { const porT = new Map(C.glosario.map((g) => [g.termino, g])); for (const x of searchIndex) if (x.glos) { const g = porT.get(x.glos); if (g) x.body = ((g.alias || []).join(' ') + ' ' + (g.texto || '')).toLowerCase(); } };
  window.__buscar = (textos) => { for (const x of searchIndex) if (x.lid && textos[x.lid]) x.body = (x.resumen + ' ' + textos[x.lid]).toLowerCase(); if (sIn.value.trim().length >= 2) sIn.dispatchEvent(new Event('input')); };
  const searchIndex = [
    ...LESSONS.map((l) => ({ t: l.titulo, s: `${l.modulo.icono} ${l.modulo.titulo} · ${l.nivel}`, href: '#/l/' + l.id, lid: l.id, resumen: l.resumen || '', body: (l.resumen || '').toLowerCase() })),
    ...C.glosario.map((g) => ({ t: g.termino, s: '📖 Glosario · ' + g.area, href: '#/glosario?q=' + encodeURIComponent(g.termino), body: ((g.alias || []).join(' ') + ' ' + (g.texto || '')).toLowerCase(), glos: g.termino }))
  ];
  const sIn = $('#search'), sOut = $('#searchResults');
  let sSel = 0;
  sIn.addEventListener('focus', () => { if (!buscarPedido) { buscarPedido = true; cargarExtra('glosario').catch(() => {}); cargarScript(`assets/content/_buscar.js?v=${C.vBuscar || C.generado}`).catch(() => { buscarPedido = false; }); } });
  sIn.addEventListener('input', () => {
    const q = sIn.value.trim().toLowerCase();
    if (q.length < 2) { sOut.hidden = true; return; }
    // Orden: primero lo que coincide en el título (mejor si empieza con la búsqueda o es una palabra entera), después
    // el resumen y, por último, cuántas veces aparece en el texto. Sin tildes y con todas las palabras de la búsqueda.
    const sinTildes = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const qn = sinTildes(q); const palabras = qn.split(/\s+/).filter(Boolean);
    const veces = (texto, p) => { let n = 0, i = -1; while (n < 8 && (i = texto.indexOf(p, i + 1)) !== -1) n++; return n; };
    const res = searchIndex.map((x) => {
      if (x._b !== x.body) { x._b = x.body; x._bn = sinTildes(x.body); x._tn = sinTildes(x.t); x._rn = sinTildes(x.resumen || ''); }
      if (!palabras.every((p) => x._tn.includes(p) || x._bn.includes(p))) return { x, score: 0 };
      let score = 0;
      if (x._tn.startsWith(qn)) score += 40; else if (new RegExp('(^|[^a-z0-9])' + qn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)').test(x._tn)) score += 30; else if (x._tn.includes(qn)) score += 20;
      for (const p of palabras) { if (x._tn.includes(p)) score += 8; if (x._rn.includes(p)) score += 4; score += veces(x._bn, p); }
      return { x, score };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
    sSel = 0;
    sOut.innerHTML = res.map((r, i) => `<a href="${r.x.href}" class="${i === 0 ? 'active' : ''}">${esc(r.x.t)}<small>${esc(r.x.s)}</small></a>`).join('') || '<div class="muted small" style="padding:8px">Sin resultados</div>';
    sOut.hidden = false;
  });
  sIn.addEventListener('keydown', (e) => {
    const items = $$('a', sOut);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sSel = (sSel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((a, i) => a.classList.toggle('active', i === sSel)); }
    if (e.key === 'Enter' && items[sSel]) { location.hash = items[sSel].getAttribute('href'); sOut.hidden = true; sIn.blur(); }
    if (e.key === 'Escape') { sOut.hidden = true; sIn.blur(); }
  });
  sIn.addEventListener('blur', () => setTimeout(() => { sOut.hidden = true; }, 150));
  sOut.addEventListener('click', () => { sOut.hidden = true; sIn.value = ''; });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !document.activeElement.closest('.CodeMirror')) { e.preventDefault(); sIn.focus(); } });

  // ---------------------------------------------------------------- router
  function parse() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [pathPart, query] = hash.split('?');
    const parts = pathPart.split('/').filter(Boolean);
    const params = new URLSearchParams(query || '');
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'l' && LESSON_BY_ID.has(parts[1])) return { name: 'lesson', lesson: LESSON_BY_ID.get(parts[1]) };
    if (parts[0] === 'm' && MODULE_BY_ID.has(parts[1])) return { name: 'module', module: MODULE_BY_ID.get(parts[1]) };
    if (parts[0] === 'lab' && ['sql', 'python', 'pyspark', 'terminal', 'dbt', 'airflow'].includes(parts[1])) return { name: 'lab-' + parts[1], libre: params.get('modo') === 'libre' };
    if (parts[0] === 'examen' && (parts[1] === 'final' || EXAMENES.has(parts[1]))) return { name: 'examen', examen: parts[1], dom: params.has('d') ? Number(params.get('d')) : null };
    if (parts[0] === 'claves' && parts[1]) return { name: 'claves', cert: parts[1], dom: params.has('d') ? Number(params.get('d')) : null };
    if (parts[0] === 'plan' && parts[1]) return { name: 'plan', cert: parts[1] };
    if (parts[0] === 'simulacro' && parts[1]) return { name: 'simulacro', cert: parts[1] };
    if (parts[0] === 'datos' && parts[1]) return { name: 'datos', id: parts[1] };
    if (parts[0] === 'modelado') return { name: 'modelado' };
    if (parts[0] === 'diagnostico') return { name: 'diagnostico' };
    if (parts[0] === 'notas') return { name: 'notas', params };
    if (parts[0] === 'generador') return { name: 'generador', params };
    if (parts[0] === 'revisar-repo') return { name: 'revisar-repo' };
    if (parts[0] === 'trabajo') return { name: 'trabajo', params };
    if (parts[0] === 'powerbi') return { name: 'powerbi', sub: parts.slice(1) };
    if (parts[0] === 'herramientas') return { name: 'herramientas' };
    if (parts[0] === 'vscode') return { name: 'vscode' };
    if (parts[0] === 'databricks') return { name: 'databricks', sub: parts.slice(1) };
    if (parts[0] === 'azure') return { name: 'azure', sub: parts.slice(1) };
    if (parts[0] === 'github') return { name: 'github', sub: parts.slice(1) };
    if (parts[0] === 'fabric') return { name: 'fabric', sub: parts.slice(1) };
    if (parts[0] === 'airflow') return { name: 'airflow', sub: parts.slice(1) };
    if (parts[0] === 'snowflake') return { name: 'snowflake', sub: parts.slice(1) };
    if (parts[0] === 'bigquery') return { name: 'bigquery', sub: parts.slice(1) };
    if (parts[0] === 'jupyter') return { name: 'jupyter', sub: parts.slice(1) };
    if (['ruta', 'datos', 'glosario', 'progreso', 'repaso', 'examenes', 'certificaciones', 'mis-datos', 'cuenta', 'privacidad', 'terminos'].includes(parts[0])) return { name: parts[0], q: params.get('q') || params.get('c') || '' };
    return { name: 'notfound' };
  }
  // ---------------------------------------------------------------- barra de las herramientas de práctica
  // Las réplicas (Power BI, Databricks, Azure, GitHub…) ocupan toda la pantalla, como las aplicaciones reales.
  // Esta barra fina queda siempre arriba para volver al curso, abrir la lección de la herramienta o ir al lanzador.
  const HERR_BARRA = {
    powerbi: { ico: '📊', nombre: 'Power BI Desktop', leccion: 'interfaces-power-bi-por-dentro' },
    pbiservicio: { ico: '☁️', nombre: 'Servicio de Power BI', leccion: 'interfaces-power-bi-por-dentro' },
    databricks: { ico: '🧱', nombre: 'Databricks', leccion: 'interfaces-databricks-por-dentro' },
    azure: { ico: '☁️', nombre: 'Portal de Azure', leccion: 'interfaces-portal-azure-por-dentro' },
    adf: { ico: '🏭', nombre: 'Azure Data Factory', leccion: 'interfaces-data-factory-por-dentro' },
    github: { ico: '🐙', nombre: 'GitHub', leccion: 'interfaces-github-por-dentro' },
    fabric: { ico: '🟩', nombre: 'Microsoft Fabric', leccion: 'interfaces-fabric-por-dentro' },
    airflow: { ico: '🌀', nombre: 'Airflow', leccion: 'interfaces-airflow-por-dentro' },
    snowflake: { ico: '❄️', nombre: 'Snowflake', leccion: 'interfaces-snowflake-por-dentro' },
    bigquery: { ico: '🔎', nombre: 'BigQuery', leccion: 'interfaces-bigquery-por-dentro' },
    jupyter: { ico: '📓', nombre: 'JupyterLab', leccion: 'interfaces-jupyterlab-por-dentro' },
  };
  let rutaCurso = null;   // la última página del curso (no de una herramienta) para el botón Volver
  function claveHerramienta(r) { if (r.name === 'azure' && r.sub && r.sub[0] === 'studio') return 'adf'; if (r.name === 'powerbi' && r.sub && r.sub[0] === 'servicio') return 'pbiservicio'; return HERR_BARRA[r.name] ? r.name : null; }
  function barraHerramienta(r) {
    const k = claveHerramienta(r);
    let bar = document.getElementById('herrBar');
    if (!k) { if (bar) bar.hidden = true; document.body.classList.remove('herr-on'); rutaCurso = location.hash || '#/'; return; }
    const H = HERR_BARRA[k];
    if (!bar) { bar = document.createElement('div'); bar.id = 'herrBar'; bar.className = 'herr-bar'; bar.setAttribute('role', 'navigation'); bar.setAttribute('aria-label', 'Barra de la herramienta de práctica'); document.body.appendChild(bar); }
    const destino = rutaCurso && rutaCurso !== '#/herramientas' ? rutaCurso : null;
    const lec = H.leccion && LESSON_BY_ID.has(H.leccion) ? '#/l/' + H.leccion : null;
    const donde = destino ? (destino.startsWith('#/l/') ? 'a la lección' : 'al curso') : 'a Herramientas';
    bar.innerHTML = `<a class="hb-volver" href="${esc(destino || '#/herramientas')}" title="Volver ${donde} (Alt+←)"><span aria-hidden="true">←</span> Volver <span class="hb-donde">${donde}</span></a>
      <span class="hb-tit"><span aria-hidden="true">${H.ico}</span> <b>${esc(H.nombre)}</b> <span class="hb-tag">práctica</span></span>
      <span class="hb-sp"></span>
      ${lec && lec !== destino ? `<a class="hb-l" href="${lec}" title="La lección que explica esta herramienta pantalla por pantalla"><span aria-hidden="true">📘</span><span class="hb-txt">Cómo se usa</span></a>` : ''}
      <a class="hb-l" href="#/herramientas" title="Todas las herramientas de práctica"><span aria-hidden="true">🧰</span><span class="hb-txt">Herramientas</span></a>
      <a class="hb-l" href="#/" title="Inicio del curso"><span aria-hidden="true">🏠</span><span class="hb-txt">Inicio</span></a>`;
    bar.hidden = false;
    document.body.classList.add('herr-on');
  }
  // Alt+← vuelve al curso desde una herramienta (además del botón atrás del navegador)
  document.addEventListener('keydown', (e) => { if (e.altKey && e.key === 'ArrowLeft' && document.body.classList.contains('herr-on')) { const a = document.querySelector('#herrBar .hb-volver'); if (a) { e.preventDefault(); location.hash = a.getAttribute('href'); } } });

  // un único bloque de publicidad al final de la portada y de las lecciones (nunca en ejercicios, exámenes ni herramientas);
  // solo existe si el sitio tiene AdSense configurado y la persona aceptó
  function ponerAnuncio(tipo) {
    const X = window.Sitio; if (!X || !X.hayAnuncios()) return;
    const html = X.bloqueAnuncio(tipo); if (!html) return;
    const donde = main.querySelector('.leccion-col') || main.querySelector('.page') || main; donde.insertAdjacentHTML('beforeend', html); X.activarAnuncios(main);
  }
  function route() {
    const r = parse();
    if (GRUPOS[r.name] && !(grupoCargas[r.name] && grupoCargas[r.name].listo)) {
      const donde = location.hash;
      if (!main.querySelector('.cargando-contenido')) main.innerHTML = '<div class="cargando-contenido"><span class="spinner"></span> Abriendo la herramienta…</div>';
      cargarGrupo(r.name).then(() => { if (location.hash === donde) route(); }, () => { if (location.hash === donde) { main.innerHTML = '<div class="card" style="margin:24px"><h2>No se pudo abrir la herramienta</h2><p>Revisa tu conexión a internet y vuelve a intentar.</p><button class="btn" id="reintentarH">Reintentar</button></div>'; main.querySelector('#reintentarH').onclick = () => route(); } });
      return;
    }
    const faltan = extrasDe(r).filter((n) => !(extraCargas[n] && extraCargas[n].listo));
    if (faltan.length) {
      const donde = location.hash;
      if (!main.querySelector('.cargando-contenido')) main.innerHTML = '<div class="cargando-contenido"><span class="spinner"></span> Cargando…</div>';
      Promise.all(faltan.map(cargarExtra)).then(() => { if (location.hash === donde) route(); }, () => { if (location.hash === donde) { main.innerHTML = '<div class="card" style="margin:24px"><h2>No se pudo cargar el contenido</h2><p>Revisa tu conexión a internet y vuelve a intentar.</p><button class="btn" id="reintentarX">Reintentar</button></div>'; main.querySelector('#reintentarX').onclick = () => route(); } });
      return;
    }
    document.body.classList.remove('nav-open');
    setTeclas(null);
    clearInterval(relojVista); relojVista = null;
    renderSidebar(r);
    const titles = { home: 'Academia de Datos', ruta: 'Ruta de aprendizaje', diagnostico: '¿Por dónde empiezo?', datos: 'Los datos', glosario: 'Glosario', progreso: 'Mi progreso', 'mis-datos': 'Mis datos', cuenta: 'Mi cuenta', privacidad: 'Privacidad', terminos: 'Términos de uso', repaso: 'Tarjetas de repaso', examenes: 'Exámenes y certificado', examen: 'Examen', simulacro: 'Simulacro', claves: 'Tarjetas de certificación', plan: 'Plan de estudio', certificaciones: 'Certificaciones', 'lab-sql': 'Laboratorio SQL', 'lab-python': 'Laboratorio Python', 'lab-pyspark': 'Laboratorio PySpark', 'lab-terminal': 'Laboratorio de terminal', 'lab-dbt': 'Laboratorio dbt', 'lab-airflow': 'Laboratorio Airflow', modelado: 'Laboratorio de modelado', notas: 'Mis notas', generador: 'Generador de datos', powerbi: 'Power BI (práctica)', databricks: 'Databricks (práctica)', azure: 'Portal de Azure (práctica)', github: 'GitHub (práctica)', fabric: 'Microsoft Fabric (práctica)', airflow: 'Airflow (práctica)', snowflake: 'Snowflake (práctica)', bigquery: 'BigQuery (práctica)', jupyter: 'JupyterLab (práctica)', herramientas: 'Herramientas de práctica', vscode: 'VS Code (práctica)' };
    if (r.name === 'home') { viewHome(); ponerAnuncio('portada'); }
    else if (r.name === 'ruta') viewRuta();
    else if (r.name === 'diagnostico') viewDiagnostico();
    else if (r.name === 'module') viewModule(r.module);
    else if (r.name === 'lesson') conContenido([r.lesson.modulo.id], () => { viewLesson(r.lesson); ponerAnuncio('leccion'); });
    else if (r.name.startsWith('lab-') && !r.libre && window.Misiones) {
      const lab = r.name.slice(4);
      window.Misiones.vista(main, { h, Store, toast, createEditor, Engines: window.Engines, renderSqlOutput, renderConsole, ensureSql, loadingInto, pyLoadingMsg, compiledBlock, libre: () => { location.hash = `#/lab/${lab}?modo=libre`; } }, lab);
    }
    else if (r.name === 'lab-sql') { viewLabSql(); tabsLabLibre('sql'); }
    else if (r.name === 'lab-python') { viewLabPython('python'); tabsLabLibre('python'); }
    else if (r.name === 'lab-pyspark') { viewLabPython('pyspark'); tabsLabLibre('pyspark'); }
    else if (r.name === 'lab-terminal') { viewLabTerminal(); tabsLabLibre('terminal'); }
    else if (r.name === 'lab-dbt') { viewLabDbtLibre(); tabsLabLibre('dbt'); }
    else if (r.name === 'lab-airflow') { viewLabPython('airflow'); tabsLabLibre('airflow'); }
    else if (r.name === 'datos') viewDatos(r.id);
    else if (r.name === 'modelado') window.Modelado.vista(main, { h, esc, createEditor, Store, toast, abrirEnLab, $, $$ });
    else if (r.name === 'notas') window.Notas.vista(main, { toast, LESSONS, params: r.params });
    else if (r.name === 'generador') window.Generador.vista(main, { toast, params: r.params });
    else if (r.name === 'revisar-repo' && window.RevisarRepo) window.RevisarRepo.vista(main, { toast });
    else if (r.name === 'herramientas') viewHerramientas();
    else if (r.name === 'vscode') viewVSCode();
    else if (r.name === 'powerbi' && r.sub && r.sub[0] === 'servicio' && window.PBIServicio) window.PBIServicio.vista(main, { Store, toast, ensureSql, cargarMonaco: () => Monaco.load() }, r.sub.slice(1));
    else if (r.name === 'powerbi' && window.PowerBI) window.PowerBI.vista(main, { Store, toast, ensureSql, cargarMonaco: () => Monaco.load() });
    else if (r.name === 'databricks' && window.Databricks) window.Databricks.vista(main, { Store, toast, ensureSql }, r.sub);
    else if (r.name === 'azure' && window.AzurePortal) window.AzurePortal.vista(main, { Store, toast, ensureSql }, r.sub);
    else if (r.name === 'github' && window.GitHubPractica) window.GitHubPractica.vista(main, { Store, toast });
    else if (r.name === 'fabric' && window.FabricPractica) window.FabricPractica.vista(main, { Store, toast });
    else if (r.name === 'airflow' && window.AirflowUI) window.AirflowUI.vista(main, { Store, toast }, r.sub);
    else if (r.name === 'snowflake' && window.SnowflakePractica) window.SnowflakePractica.vista(main, { Store, toast }, r.sub);
    else if (r.name === 'bigquery' && window.BigQueryPractica) window.BigQueryPractica.vista(main, { Store, toast }, r.sub);
    else if (r.name === 'jupyter' && window.JupyterPractica) window.JupyterPractica.vista(main, { Store, toast }, r.sub);
    else if (r.name === 'trabajo' && window.Trabajo) window.Trabajo.vista(main, { toast, h, esc, Store, createEditor, renderSqlOutput, ensureSql, params: r.params, $, $$ });
    else if (r.name === 'glosario') viewGlosario(r.q);
    else if (r.name === 'progreso') viewProgreso();
    else if (r.name === 'mis-datos' && window.MisDatos) window.MisDatos.vista(main, { Store, toast });
    else if (r.name === 'cuenta' && window.Sitio) window.Sitio.vistaCuenta(main);
    else if ((r.name === 'privacidad' || r.name === 'terminos') && window.Sitio) window.Sitio.vistaLegal(main, r.name);
    else if (r.name === 'repaso') conContenido(Object.keys(Store.data.visited || {}).map((id) => (LESSON_BY_ID.get(id) || { modulo: {} }).modulo.id).filter(Boolean), () => viewRepaso());
    else if (r.name === 'examenes') viewExamenes();
    else if (r.name === 'examen') viewExamen(r.examen, r.dom);
    else if (r.name === 'claves') viewClaves(r.cert, r.dom);
    else if (r.name === 'plan') viewPlan(r.cert);
    else if (r.name === 'simulacro') viewSimulacro(r.cert);
    else if (r.name === 'certificaciones') viewCertificaciones(r.q);
    else main.innerHTML = `<div class="container prose"><h1>Página no encontrada</h1><p>La dirección <code>${esc(location.hash)}</code> no existe o cambió de lugar.</p><p><a class="btn btn-primary" href="#/">Ir al inicio</a> <a class="btn" href="#/ruta">Ver la ruta de aprendizaje</a> <a class="btn" href="#/herramientas">Herramientas de práctica</a></p><p class="muted">También puedes usar el buscador de arriba.${enlaceReporte('Página no encontrada', `**Dirección:** ${location.href}`).replace('class="badge badge-link"', 'style="margin-left:6px"')}</p></div>`;
    barraHerramienta(r);
    if (window.RetosHerramientas) { if (r.name === 'azure') window.RetosHerramientas.montar(r.sub && r.sub[0] === 'studio' ? 'adf' : 'azure', Store); else if (r.name === 'databricks') window.RetosHerramientas.montar('databricks', Store); else if (r.name === 'github') window.RetosHerramientas.montar('github', Store); else if (r.name === 'snowflake') window.RetosHerramientas.montar('snowflake', Store); else if (r.name === 'bigquery') window.RetosHerramientas.montar('bigquery', Store); else if (r.name === 'airflow') window.RetosHerramientas.montar('airflow', Store); else if (r.name === 'fabric') window.RetosHerramientas.montar('fabric', Store); else if (r.name === 'jupyter') window.RetosHerramientas.montar('jupyter', Store); else window.RetosHerramientas.desmontar(); }
    document.title = r.lesson ? `${r.lesson.titulo} · Academia de Datos` : r.module ? `${r.module.titulo} · Academia de Datos` : (titles[r.name] || 'Academia de Datos');
    const anchor = location.hash.split('#')[2];
    if (anchor && document.getElementById(anchor)) document.getElementById(anchor).scrollIntoView();
    else window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
    // los paneles laterales de los laboratorios también se pliegan
    for (const lab of $$('.lab', main)) {
      const side = $('.lab-side', lab); if (!side || (lab.previousElementSibling && lab.previousElementSibling.classList.contains('panel-toggle'))) continue;
      const btn = h('<button class="panel-toggle" title="Mostrar u ocultar el panel lateral">⇤ Ocultar panel</button>');
      const aplicar = (oculto) => { lab.classList.toggle('panel-oculto', oculto); btn.textContent = oculto ? '⇥ Mostrar panel' : '⇤ Ocultar panel'; };
      let oculto = false; try { oculto = localStorage.getItem('panel-lab-oculto') === '1'; } catch (e) { /* sin almacenamiento */ }
      aplicar(oculto);
      btn.addEventListener('click', () => { oculto = !oculto; aplicar(oculto); try { localStorage.setItem('panel-lab-oculto', oculto ? '1' : '0'); } catch (e) { /* sin almacenamiento */ } });
      lab.before(btn);
    }
  }
  window.addEventListener('hashchange', route);
  // lo pendiente de guardar (respuestas recién marcadas, código) no se pierde al cerrar o recargar
  window.addEventListener('pagehide', () => { clearTimeout(Store._t); Store.save(); });
  // un enlace a la página en la que ya estás no dispara hashchange: igual se vuelve a dibujar
  // (por ejemplo, "Volver a las tarjetas" al terminar una sesión de repaso)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (a && !a.target && !e.ctrlKey && !e.metaKey && a.getAttribute('href') === location.hash) { e.preventDefault(); route(); }
  });
  // en escritorio el botón pliega la barra lateral (y se recuerda); en pantallas chicas la abre como panel
  const esMovil = () => window.matchMedia('(max-width: 900px)').matches;
  try { if (localStorage.getItem('barra-plegada') === '1') document.body.classList.add('side-collapsed'); } catch (e) { /* sin almacenamiento */ }
  $('#menuBtn').addEventListener('click', () => {
    if (esMovil()) { document.body.classList.toggle('nav-open'); return; }
    const plegada = document.body.classList.toggle('side-collapsed');
    try { localStorage.setItem('barra-plegada', plegada ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'b' && (e.ctrlKey || e.metaKey) && !e.target.closest('input, textarea, .CodeMirror, .monaco-editor')) { e.preventDefault(); $('#menuBtn').click(); } });
  $('#scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
  updateProgressPill();
  $('#termBtn').addEventListener('click', () => Dock.toggle());
  document.addEventListener('keydown', (e) => { if (e.key === '`' && e.ctrlKey) { e.preventDefault(); Dock.toggle(); } });
  if (Store.data.editor !== 'simple') Monaco.load().catch(() => {});
  if (window.Sitio) { window.Sitio.iniciar({ Store, toast }); window.Sitio.avisoConsentimiento(); window.Sitio.iniciarMedicion(); }
  route();
})();
