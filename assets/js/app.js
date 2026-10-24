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

  // ---------------------------------------------------------------- progreso
  const KEY = 'academia-datos-v1';
  const Store = {
    data: { ex: {}, lessons: {}, code: {}, theme: null, visited: {}, auto: {} },
    load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) this.data = Object.assign(this.data, d); } catch (e) { /* sin almacenamiento */ } },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* sin almacenamiento */ } },
    exDone(id) { return !!this.data.ex[id]; },
    setExDone(id) { if (!this.data.ex[id]) { this.data.ex[id] = Date.now(); this.save(); updateProgressPill(); } },
    lessonDone(l) {
      if (this.data.lessons[l.id]) return true;
      return l.ejercicios.length > 0 && l.ejercicios.every((e) => this.exDone(e.id));
    },
    setLessonDone(id, v = true) { if (v) this.data.lessons[id] = Date.now(); else delete this.data.lessons[id]; this.save(); updateProgressPill(); },
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
  function updateProgressPill() { $('#progressPct').textContent = totalProgress().pct + '%'; }

  // ---------------------------------------------------------------- tema
  function applyTheme() {
    const t = Store.data.theme;
    if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
  }
  $('#themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!Store.data.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    Store.data.theme = dark ? 'light' : 'dark'; Store.save(); applyTheme();
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
  const TYPE_LABEL = { sql: 'SQL', python: 'Python', pyspark: 'PySpark', airflow: 'Airflow', dbt: 'dbt', quiz: 'Test', cli: 'Terminal', abierto: 'Respuesta libre' };

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
            getWorkerUrl: () => `data:text/javascript;charset=utf-8,${encodeURIComponent(`self.MonacoEnvironment={baseUrl:'${MONACO_BASE.replace(/\/vs$/, '')}/'};importScripts('${MONACO_BASE}/base/worker/workerMain.js');`)}`,
          };
          req.config({ paths: { vs: MONACO_BASE } });
          req(['vs/editor/editor.main'], () => {
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
  function monacoLang(lang) { return { sql: 'sql', dbt: 'sql', jinja: 'sql', python: 'python', pyspark: 'python', airflow: 'python', bash: 'shell', shell: 'shell', yaml: 'yaml', json: 'json' }[lang] || 'plaintext'; }

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
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun && onRun());
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => onCheck && onCheck());
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
    loadingInto(out, 'Cargando la base de datos SQLite con más de 200.000 filas (solo la primera vez)…');
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
      if ((lang === 'bash' || lang === 'shell') && termRunnable(code)) {
        const b = h('<button type="button" title="Ejecutar en la terminal de práctica">⌨ En la terminal</button>');
        b.addEventListener('click', () => Dock.runScript(code));
        tools.append(b);
      }
      box.append(tools);
      $('[data-copy]', tools).addEventListener('click', () => { navigator.clipboard?.writeText(code); toast('Copiado al portapapeles'); });
      $('[data-run]', tools)?.addEventListener('click', () => turnIntoRunner(box, lang, code));
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
    const bar = h('<div class="bar"><button class="btn btn-primary btn-sm" data-run>▶ Ejecutar <span class="kbd">Ctrl+↵</span></button><button class="btn btn-ghost btn-sm" data-reset>↺ Original</button></div>');
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
    return out;
  }
  function termRunnable(code) {
    if (!window.Shell) return false;
    const ls = scriptLines(code);
    return ls.length > 0 && ls.length <= 12 && ls.every((l) => { const w = l.replace(/^\$\s*/, '').split(/\s+/)[0]; return /^[A-Z_]+=/.test(w) || !!window.Shell.Commands[w]; });
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

  function compiledBlock(sql) {
    const d = h('<details class="compiled"><summary>Ver SQL compilado (lo que dbt envía a la base)</summary><pre data-lang="sql"><code></code></pre></details>');
    $('code', d).textContent = sql; highlight($('pre', d));
    return d;
  }

  // ---------------------------------------------------------------- ejercicios
  function mountExercise(slot, ex, num) {
    const done = Store.exDone(ex.id);
    const card = h(`<section class="exercise ${done ? 'passed' : ''}" id="${esc(ex.id)}">
      <div class="ex-head"><span class="badge b-type">${TYPE_LABEL[ex.type] || ex.type}</span><h4>Ejercicio ${num}${ex.titulo ? ' · ' + esc(ex.titulo) : ''}</h4>${ex.dificultad ? `<span class="badge ${levelClass(ex.dificultad)}">${esc(ex.dificultad)}</span>` : ''}<span class="status">${done ? '✓ Resuelto' : 'Pendiente'}</span></div>
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

    const lang = ex.type === 'sql' ? 'sql' : ex.type === 'dbt' ? 'dbt' : 'python';
    const starter = ex.inicial ?? (ex.type === 'sql' ? '-- Escribe tu consulta aquí\n' : ex.type === 'dbt' ? '-- Escribe tu modelo dbt aquí\n' : '# Escribe tu código aquí\n');
    const edBox = h('<div class="ex-editor"></div>');
    card.append(edBox);
    const ed = createEditor(edBox, { lang, value: Store.code(ex.id) ?? starter, onRun: () => run(), onCheck: () => check(), onChange: (v) => Store.setCode(ex.id, v) });
    card.__editor = ed;
    const tools = h(`<div class="ex-tools">
      <button class="btn btn-primary btn-sm" data-act="run">▶ Ejecutar <span class="kbd">Ctrl+↵</span></button>
      <button class="btn btn-ok btn-sm" data-act="check">✓ Comprobar</button>
      ${ex.pista ? '<button class="btn btn-sm" data-act="hint">💡 Pista</button>' : ''}
      <button class="btn btn-sm" data-act="sol">👁 Solución</button>
      ${ex.type === 'sql' || ex.type === 'dbt' ? '<button class="btn btn-ghost btn-sm" data-act="schema">📋 Tablas</button>' : ''}
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
      if (a === 'hint') showExtra('Pista', ex.pista);
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
    const tools = h(`<div class="ex-tools">${ex.pista ? '<button class="btn btn-sm" data-act="hint">💡 Pista</button>' : ''}<button class="btn btn-sm" data-act="sol">👁 Solución</button><span class="spacer"></span><span class="small muted">Terminal compartida con el <a href="#/lab/terminal">laboratorio</a> · ↑ historial · Tab autocompleta</span></div>`);
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
          feedback('ok', '✓ ' + g.msg + (r.code ? ' (El comando es correcto; la terminal simulada no pudo ejecutarlo completo, mira la salida esperada abajo.)' : ''));
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
      if (a === 'hint') showExtra('Pista', ex.pista);
      if (a === 'sol') {
        const sol = ex.solucion || ex.respuesta[0].replace(/\\/g, '');
        showExtra('Solución', `<pre data-lang="bash"><code>${esc(sol)}</code></pre>${ex.explicacion || ''}<button class="btn btn-sm" data-type>⌨ Escribirla en la terminal</button>`);
        $('[data-type]', extra).addEventListener('click', () => { term.type(sol); });
      }
    });
  }

  function mountOpen(card, ex, markPassed, extra, showExtra) {
    const box = h('<div class="open-answer"><textarea spellcheck="false" placeholder="Escribe tu respuesta o tu código aquí…"></textarea></div>');
    const ta = $('textarea', box);
    ta.value = Store.code(ex.id) || ex.inicial || '';
    ta.addEventListener('input', () => Store.setCode(ex.id, ta.value));
    const tools = h(`<div class="ex-tools">${ex.pista ? '<button class="btn btn-sm" data-act="hint">💡 Pista</button>' : ''}<button class="btn btn-sm" data-act="sol">👁 Ver respuesta modelo</button><span class="spacer"></span><button class="btn btn-ok btn-sm" data-act="done">✓ Lo hice</button></div>`);
    card.append(box, tools, extra);
    tools.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'hint') showExtra('Pista', ex.pista);
      if (a === 'sol') showExtra('Respuesta modelo', (ex.solucion ? `<pre data-lang="${esc(ex.lang || 'text')}"><code>${esc(ex.solucion)}</code></pre>` : '') + (ex.explicacion || ''));
      if (a === 'done') { markPassed(); toast('¡Bien! Marcado como hecho.'); }
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

  // ---------------------------------------------------------------- sidebar
  function renderSidebar(route) {
    const sb = $('#sidebar');
    const cur = route.lesson ? route.lesson.modulo.id : route.module ? route.module.id : null;
    const link = (href, ico, text, active, meta = '') => `<a class="side-link ${active ? 'active' : ''}" href="${href}"><span class="ico">${ico}</span><span>${text}</span>${meta ? `<span class="meta">${meta}</span>` : ''}</a>`;
    let html = link('#/', '🏠', 'Inicio', route.name === 'home');
    html += link('#/ruta', '🧭', 'Ruta de aprendizaje', route.name === 'ruta');
    html += '<div class="side-section">Módulos</div>';
    for (const m of C.modulos) {
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
    html += '<div class="side-section">Practica libre</div>';
    html += link('#/lab/terminal', '⌨️', 'Laboratorio de terminal', route.name === 'lab-terminal');
    html += link('#/lab/sql', '🧪', 'Laboratorio SQL', route.name === 'lab-sql');
    html += link('#/lab/python', '🐍', 'Laboratorio Python', route.name === 'lab-python');
    html += link('#/lab/pyspark', '⚡', 'Laboratorio PySpark', route.name === 'lab-pyspark');
    html += '<div class="side-section">Recursos</div>';
    html += link('#/datos', '🗃️', 'Los datos (Tienda Andina)', route.name === 'datos');
    html += link('#/glosario', '📖', 'Glosario', route.name === 'glosario');
    html += link('#/progreso', '📈', 'Mi progreso', route.name === 'progreso');
    sb.innerHTML = html;
    $$('[data-toggle]', sb).forEach((b) => b.addEventListener('click', () => {
      const mod = b.closest('.side-module');
      if (!mod.classList.contains('open')) location.hash = '#/m/' + b.dataset.toggle;
      else mod.classList.remove('open');
    }));
    const act = $('.side-lessons a.active', sb);
    if (act) act.scrollIntoView({ block: 'center' });
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
  }

  // ---------------------------------------------------------------- vistas
  const main = $('#main');
  const totalEx = ALL_EX.length;

  function viewHome() {
    const tp = totalProgress();
    const nextLesson = LESSONS.find((l) => !Store.lessonDone(l)) || LESSONS[0];
    const started = tp.done > 0 || Object.keys(Store.data.ex).length > 0;
    main.innerHTML = `<div class="container wide">
      <section class="hero">
        <span class="badge b-type">Gratis · En español · Desde cero</span>
        <h1>De no saber nada a <span class="grad">ingeniero/a de datos</span>.</h1>
        <p class="lead">Un curso práctico y completo: SQL de básico a súper avanzado, Python, Spark, PySpark, Airflow, dbt, Databricks, Azure, AWS y Google Cloud, con <b>8 empresas</b> y sus casos de negocio. Todo se practica <b>aquí mismo, en tu navegador</b>: un editor profesional, una terminal Linux con las CLIs de la nube y una base de datos con más de 200.000 filas. Sin instalar nada.</p>
        <div class="row">
          <a class="btn btn-primary btn-lg" href="#/l/${nextLesson.id}">${started ? 'Continuar donde lo dejé →' : 'Empezar desde cero →'}</a>
          <a class="btn btn-lg" href="#/ruta">Ver la ruta completa</a>
          <a class="btn btn-lg btn-ghost" href="#/lab/sql">🧪 Ir al laboratorio SQL</a>
        </div>
        <div class="stats">
          <div class="stat"><b>${C.modulos.length}</b><span>módulos</span></div>
          <div class="stat"><b>${LESSONS.length}</b><span>lecciones</span></div>
          <div class="stat"><b>${totalEx}</b><span>ejercicios corregidos al instante</span></div>
          <div class="stat"><b>+200.000</b><span>filas de 8 empresas para practicar</span></div>
          <div class="stat"><b>${tp.pct}%</b><span>tu avance</span></div>
        </div>
      </section>
      <h2 class="section-title">Cómo funciona</h2>
      <div class="how">
        <div class="card"><h4>📚 1. Lee la lección</h4><p>Explicaciones en lenguaje simple, con analogías y ejemplos. Cada ejemplo tiene un botón <b>▶ Probar</b>.</p></div>
        <div class="card"><h4>⌨️ 2. Resuelve ejercicios</h4><p>Escribes código real (SQL, Python, PySpark, dbt, DAGs de Airflow, comandos CLI) y el sitio lo corrige al instante.</p></div>
        <div class="card"><h4>💡 3. Usa pistas</h4><p>Si te trabas, pide una pista o mira la solución explicada. Equivocarse es parte de aprender.</p></div>
        <div class="card"><h4>🖥️ Terminal real</h4><p>Una terminal Linux simulada con <code>bash</code>, <code>git</code>, Python, <code>uv</code>, <code>sqlite3</code>, <code>duckdb</code>, <code>docker</code>, <code>psql</code>, <code>dbt</code>, <code>airflow</code>, <code>terraform</code> y las CLIs <code>az</code>, <code>aws</code>, <code>gcloud</code>, <code>bq</code> y <code>databricks</code>. Botón <b>⌨ Terminal</b> arriba, o el <a href="#/lab/terminal">laboratorio con misiones</a>.</p></div>
        <div class="card"><h4>💼 Casos de negocio</h4><p>Un banco, una app de música, una de viajes, una clínica, un SaaS, una aerolínea, una empresa de logística y una tienda: preguntas reales para entrenar la lógica, en SQL, Python, PySpark, dbt y Airflow.</p></div>
        <div class="card"><h4>📈 4. Avanza de nivel</h4><p>Básico → Intermedio → Avanzado → Experto. Tu progreso se guarda en este navegador.</p></div>
      </div>
      <h2 class="section-title">Los módulos (en el orden recomendado)</h2>
      <div class="grid grid-3">${C.modulos.map((m, i) => {
        const p = moduleProgress(m);
        return `<a class="card module-card" href="#/m/${m.id}">
          <div class="mc-top"><span class="mc-ico" style="background:color-mix(in srgb, ${m.color} 16%, var(--surface))">${m.icono}</span><div><div class="mc-step">Paso ${i + 1}</div><h3>${esc(m.titulo)}</h3></div></div>
          <p>${esc(m.descripcion)}</p>
          <div class="row small muted"><span>${m.lecciones.length} lecciones</span><span>·</span><span>${m.lecciones.reduce((s, l) => s + l.ejercicios.length, 0)} ejercicios</span><span class="spacer"></span><span>${p.pct}%</span></div>
          <div class="bar"><i style="width:${p.pct}%;background:${m.color}"></i></div>
        </a>`;
      }).join('')}</div>
      <h2 class="section-title">¿Por qué estas herramientas?</h2>
      <div class="prose"><p>Un <b>ingeniero de datos</b> construye “tuberías” (pipelines) que llevan los datos desde donde nacen (apps, ventas, sensores) hasta donde se usan (reportes, modelos de IA). <b>SQL</b> es el idioma universal de los datos; <b>Python</b> automatiza todo; <b>Spark/PySpark</b> procesa volúmenes enormes repartiendo el trabajo entre muchas máquinas; <b>Databricks</b> es la plataforma donde corre Spark en la nube; <b>dbt</b> organiza las transformaciones SQL como un proyecto de software; <b>Airflow</b> programa y coordina cuándo se ejecuta cada paso; y las tres grandes nubes (<b>Azure</b>, <b>AWS</b> y <b>Google Cloud</b>) ponen el almacenamiento, el cómputo y los servicios de datos, que se controlan desde la terminal con sus CLIs (<code>az</code>, <code>aws</code>, <code>gcloud</code>, <code>bq</code>, <code>databricks</code>).</p><p>Los conceptos se repiten en todas las nubes con otros nombres: un lago de archivos (ADLS, S3, Cloud Storage), un catálogo de tablas, SQL sin servidores (Athena, BigQuery), Spark administrado (Databricks, Glue/EMR, Dataproc), streaming (Event Hubs, Kinesis, Pub/Sub) y Airflow administrado. Aprenderlos una vez te sirve para las tres.</p></div>
    </div>`;
  }

  function viewRuta() {
    main.innerHTML = `<div class="container prose">
      <h1>🧭 Ruta de aprendizaje</h1>
      <p>Este es el camino recomendado si empiezas de cero. Cada paso se apoya en el anterior. Dedicando <b>1 hora al día</b>, completarás el recorrido en unos 3–4 meses. No hay prisa: lo importante es <b>practicar</b>.</p>
      <div class="path not-prose">${C.modulos.map((m, i) => `${i ? '<span class="arr">→</span>' : ''}<a href="#/m/${m.id}">${m.icono} ${esc(m.titulo)}</a>`).join('')}</div>
      ${C.modulos.map((m, i) => {
        const p = moduleProgress(m);
        const levels = [...new Set(m.lecciones.map((l) => l.nivel))];
        return `<h2>Paso ${i + 1}: ${m.icono} ${esc(m.titulo)} <span class="badge">${p.done}/${p.total}</span></h2>
        <p>${esc(m.descripcion)}</p>
        ${m.objetivos ? `<p><b>Al terminar podrás:</b></p><ul>${m.objetivos.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
        <p class="muted small">Niveles: ${levels.map(esc).join(' → ')} · ${m.lecciones.reduce((s, l) => s + l.duracion, 0)} min aprox.</p>
        <p><a class="btn btn-sm" href="#/m/${m.id}">Ver lecciones →</a></p>`;
      }).join('')}
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
      <div class="bar" style="margin:10px 0 6px"><i style="width:${p.pct}%;background:${m.color}"></i></div>
      ${first ? `<p><a class="btn btn-primary" href="#/l/${first.id}">${p.done ? 'Continuar' : 'Empezar'}: ${esc(first.titulo)} →</a></p>` : '<p class="muted">Contenido en preparación.</p>'}
      <div class="lesson-list">${html}</div>
    </div>`;
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

  function viewLesson(l) {
    const m = l.modulo;
    const idx = LESSONS.indexOf(l);
    const prev = LESSONS[idx - 1], next = LESSONS[idx + 1];
    Store.data.visited[l.id] = Date.now(); Store.saveSoon();
    main.innerHTML = `<div class="container">
      <div class="crumbs"><a href="#/">Inicio</a><span>/</span><a href="#/m/${m.id}">${m.icono} ${esc(m.titulo)}</a><span>/</span><span>Lección ${m.lecciones.indexOf(l) + 1} de ${m.lecciones.length}</span></div>
      <article class="prose" id="lessonBody">
        <h1>${esc(l.titulo)}</h1>
        <div class="lesson-meta"><span class="badge ${levelClass(l.nivel)}">${esc(l.nivel)}</span><span class="badge">⏱ ${l.duracion} min</span>${l.ejercicios.length ? `<span class="badge">✍️ ${l.ejercicios.length} ejercicio${l.ejercicios.length > 1 ? 's' : ''}</span>` : ''}</div>
        ${lessonIntro(l)}
        ${l.html}
        ${l.autoevaluacion.length ? `<section class="autoeval" id="autoEval"><h2>✅ Autoevaluación</h2><p class="muted">Marca solo lo que puedas hacer <b>sin mirar la lección</b>. Si dudas en algo, vuelve a esa parte: esto es lo que se pregunta en una entrevista o se usa el primer día de trabajo.</p>${l.autoevaluacion.map((q, i) => `<label class="auto-item"><input type="checkbox" data-auto="${i}"><span>${q}</span></label>`).join('')}<div class="small muted" id="autoCount"></div></section>` : ''}
      </article>
      <div class="card lesson-done-bar" id="doneBar"></div>
      <nav class="lesson-nav">
        ${prev ? `<a href="#/l/${prev.id}"><small>← Anterior</small>${esc(prev.titulo)}</a>` : '<span></span>'}
        ${next ? `<a class="next" href="#/l/${next.id}"><small>Siguiente →</small>${esc(next.titulo)}</a>` : '<a class="next" href="#/progreso"><small>¡Fin!</small>Ver mi progreso</a>'}
      </nav>
    </div>`;
    const body = $('#lessonBody');
    enhanceCode(body);
    if (window.Diagramas) window.Diagramas.dibujar(body);
    $$('.exercise-slot', body).forEach((slot) => {
      const k = Number(slot.dataset.ex);
      mountExercise(slot, l.ejercicios[k], k + 1);
    });
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

  function viewLabSql() {
    main.innerHTML = `<div class="container wide">
      <h1 style="margin:0 0 4px">🧪 Laboratorio SQL</h1>
      <p class="muted" style="margin:0 0 16px">SQLite real en tu navegador con el dataset completo. Experimenta sin miedo: si rompes algo, presiona “Reiniciar base”. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> ejecuta · <kbd>Ctrl</kbd>+<kbd>Espacio</kbd> autocompleta.</p>
      <div class="lab">
        <aside class="card lab-side"><h4>Tablas</h4><div id="schema"><div class="muted small">Cargando…</div></div></aside>
        <div class="lab-main"><div class="card">
          <div class="ex-tools" style="border-top:0"><span class="samples"><select id="samples"><option value="">📂 Ejemplos…</option>${SQL_SAMPLES.map((s, i) => `<option value="${i}">${esc(s[0])}</option>`).join('')}</select></span><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="resetDb">↺ Reiniciar base</button></div>
          <div id="ed"></div>
          <div class="ex-tools"><button class="btn btn-primary" id="run">▶ Ejecutar <span class="kbd">Ctrl+↵</span></button><span class="small muted">Se ejecutan todas las sentencias; se muestran los resultados de las últimas 3.</span></div>
          <div class="output" id="out"></div>
        </div></div>
      </div>
    </div>`;
    const out = $('#out');
    const saved = Store.data.code['lab-sql'];
    const ed = createEditor($('#ed'), { lang: 'sql', value: saved ?? SQL_SAMPLES[0][1], tall: true, onRun: () => run(), onChange: (v) => Store.setCode('lab-sql', v) });
    const run = async () => { if (!(await ensureSql(out))) return; renderSqlOutput(out, SQL.exec(ed.getValue(), SQL.playground())); };
    $('#run').addEventListener('click', run);
    $('#samples').addEventListener('change', (e) => { if (e.target.value !== '') { ed.setValue(SQL_SAMPLES[e.target.value][1]); run(); } });
    $('#resetDb').addEventListener('click', () => { SQL.resetPlayground(); toast('Base de datos reiniciada a su estado original'); });
    ensureSql(out).then((ok) => {
      if (!ok) return;
      const sc = $('#schema'); sc.innerHTML = '';
      for (const [name, t] of Object.entries(SQL.tables)) {
        const el = h(`<div class="schema-table"><button><span>▸</span>${esc(name)}<span class="cnt">${t.rows.length.toLocaleString('es')}</span></button><div class="schema-cols">${t.columns.map((c) => `<div data-col="${esc(c)}">${esc(c)}</div>`).join('')}<div data-q="${esc(name)}" style="color:var(--brand)">▶ SELECT * … LIMIT 10</div></div></div>`);
        $('button', el).addEventListener('click', () => el.classList.toggle('open'));
        el.addEventListener('click', (e) => {
          const c = e.target.closest('[data-col]'); if (c) { if (ed.cm) ed.cm.replaceSelection(c.dataset.col); else if (ed.monaco) ed.monaco.trigger('kbd', 'type', { text: c.dataset.col }); ed.focus(); }
          const q = e.target.closest('[data-q]'); if (q) { ed.setValue(`SELECT *\nFROM ${q.dataset.q}\nLIMIT 10;`); run(); }
        });
        sc.append(el);
      }
      run();
    });
  }

  function viewLabPython(kind) {
    const isSpark = kind === 'pyspark';
    const samples = isSpark ? SPARK_SAMPLES : PY_SAMPLES;
    const key = 'lab-' + kind;
    main.innerHTML = `<div class="container wide">
      <h1 style="margin:0 0 4px">${isSpark ? '⚡ Laboratorio PySpark' : '🐍 Laboratorio Python'}</h1>
      <p class="muted" style="margin:0 0 16px">${isSpark
        ? 'Practica la API de PySpark con <b>mini-Spark</b>, un simulador que corre en tu navegador. La variable <code>spark</code> ya existe y las tablas del dataset están disponibles con <code>spark.table("pedidos")</code>. Para producción usarás Spark real (Databricks), pero la sintaxis es la misma.'
        : 'Python 3 real (Pyodide) ejecutándose en tu navegador. Usa <code>print()</code> para ver resultados.'}</p>
      <div class="lab">
        <aside class="card lab-side"><h4>Ejemplos</h4>${samples.map((s, i) => `<div class="schema-table"><button data-s="${i}">▸ ${esc(s[0])}</button></div>`).join('')}
        ${isSpark ? `<h4 style="margin-top:16px">Tablas</h4>${['clientes', 'productos', 'categorias', 'pedidos', 'detalle_pedidos', 'pagos', 'empleados', 'departamentos', 'eventos_web'].map((t) => `<div class="small" style="font-family:var(--mono);padding:2px 6px">${t}</div>`).join('')}` : ''}</aside>
        <div class="lab-main"><div class="card">
          <div id="ed"></div>
          <div class="ex-tools"><button class="btn btn-primary" id="run">▶ Ejecutar <span class="kbd">Ctrl+↵</span></button><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="clear">Limpiar salida</button></div>
          <div class="output" id="out"></div>
        </div></div>
      </div>
    </div>`;
    const out = $('#out');
    const ed = createEditor($('#ed'), { lang: 'python', value: Store.data.code[key] ?? samples[0][1], tall: true, onRun: () => run(), onChange: (v) => Store.setCode(key, v) });
    const run = async () => { loadingInto(out, pyLoadingMsg()); renderConsole(out, await PY.run(isSpark ? 'pyspark' : pyMode(ed.getValue()), ed.getValue())); };
    $('#run').addEventListener('click', run);
    $('#clear').addEventListener('click', () => { out.innerHTML = ''; });
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
  function viewLabTerminal() {
    main.innerHTML = `<div class="container wide">
      <h1 style="margin:0 0 4px">⌨️ Laboratorio de terminal</h1>
      <p class="muted" style="margin:0 0 16px">Una máquina Linux simulada que <b>recuerda todo lo que haces</b>. Ejecuta <b>Python</b>, <b>SQLite</b>, <b>DuckDB</b>, <b>dbt</b> y <b>Airflow</b> de verdad, y simula con estado <b>git</b>, <b>Docker</b> y <b>Docker Compose</b> (con <code>psql</code> sobre los contenedores de Postgres), <b>Terraform</b>, <b>uv</b>, <b>Azure</b> (az), <b>AWS</b> (aws), <b>Google Cloud</b> (gcloud, gsutil, bq) y <b>Databricks</b>. Usa <code>code archivo</code> para editar archivos con el editor.</p>
      <div class="lab lab-term">
        <div class="lab-main" id="termHost"></div>
        <aside class="card lab-side missions"><h4>Misiones</h4><div id="mis"></div>
          <h4 style="margin-top:16px">Atajos</h4><div class="small muted">↑/↓ historial · Tab autocompletar · Ctrl+L limpiar · Ctrl+C cancelar</div>
          <div style="margin-top:14px" class="row"><button class="btn btn-sm" id="resetM">↺ Reiniciar máquina</button></div>
        </aside>
      </div>
    </div>`;
    const term = window.Shell.createTerminal($('#termHost'), { onCommand: () => paint() });
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
  const RELS = [
    ['pedidos.cliente_id', 'clientes.cliente_id'], ['pedidos.empleado_id', 'empleados.empleado_id'],
    ['detalle_pedidos.pedido_id', 'pedidos.pedido_id'], ['detalle_pedidos.producto_id', 'productos.producto_id'],
    ['productos.categoria_id', 'categorias.categoria_id'], ['categorias.categoria_padre_id', 'categorias.categoria_id'],
    ['pagos.pedido_id', 'pedidos.pedido_id'], ['empleados.departamento_id', 'departamentos.departamento_id'],
    ['empleados.jefe_id', 'empleados.empleado_id'], ['eventos_web.cliente_id', 'clientes.cliente_id'],
    ['logins.cliente_id', 'clientes.cliente_id'], ['clientes_crudo.cliente_id', 'clientes.cliente_id']
  ];
  function erDiagram() {
    // diagrama simple: cajas en una grilla con líneas de relación
    const pos = {
      clientes: [20, 150], pedidos: [290, 150], detalle_pedidos: [560, 150], productos: [830, 150],
      categorias: [830, 20], pagos: [290, 20], empleados: [290, 290], departamentos: [560, 290],
      eventos_web: [20, 20], logins: [20, 290], clientes_crudo: [20, 380], tipos_cambio: [830, 290]
    };
    const W = 210, H = 44;
    let lines = '', boxes = '';
    for (const [a, b] of RELS) {
      const ta = a.split('.')[0], tb = b.split('.')[0];
      if (ta === tb) continue;
      const [x1, y1] = pos[ta], [x2, y2] = pos[tb];
      lines += `<line x1="${x1 + W / 2}" y1="${y1 + H / 2}" x2="${x2 + W / 2}" y2="${y2 + H / 2}" stroke="var(--line-2)" stroke-width="1.5"/>`;
    }
    for (const [t, [x, y]] of Object.entries(pos)) {
      boxes += `<g><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="9" fill="var(--surface)" stroke="var(--brand)" stroke-width="1.4"/><text x="${x + W / 2}" y="${y + 27}" text-anchor="middle" font-size="14" fill="var(--ink)">${t}</text></g>`;
    }
    return `<div class="er card" style="padding:12px"><svg viewBox="0 0 1060 440" width="100%" style="min-width:720px" role="img" aria-label="Diagrama de relaciones entre tablas">${lines}${boxes}</svg></div>`;
  }
  function viewDatos() {
    main.innerHTML = `<div class="container prose">
      <h1>🗃️ Los datos: 8 empresas</h1>
      <p>La empresa principal del curso es <b>Tienda Andina</b>, un comercio online que vende tecnología, hogar, deportes y moda en Latinoamérica y España entre 2022 y 2024. Además hay <b>siete empresas más</b>, cada una con sus tablas (separadas por un prefijo), para los casos de negocio. Los datos se generan siempre iguales (con una “semilla” fija), así que tus resultados son reproducibles.</p>
      <p>En total hay <b>más de 200.000 filas</b> en 38 tablas, más 5 vistas <code>stg_*</code> para el módulo de dbt. Todas están en la misma base: puedes consultarlas desde cualquier ejercicio de SQL, desde PySpark con <code>spark.table("…")</code>, desde dbt con <code>ref('…')</code> y desde la terminal con <code>sqlite3</code>.</p>
      <div class="table-wrap not-prose"><table><thead><tr><th>Empresa</th><th>Rubro</th><th>Prefijo de sus tablas</th><th>Qué contiene</th></tr></thead><tbody>${(window.DataGen.CASOS || []).map((c) => `<tr><td>${c.icono} <b>${esc(c.nombre)}</b></td><td>${esc(c.rubro)}</td><td><code>${esc(c.prefijo || '(sin prefijo)')}</code></td><td>${esc(c.resumen)}</td></tr>`).join('')}</tbody></table></div>
      <h2>Tienda Andina: el diagrama</h2>
      <p>Las líneas del diagrama muestran qué columnas conectan las tablas de la tienda (claves foráneas).</p>
      ${erDiagram()}
      <h2>Relaciones (para hacer JOIN)</h2>
      <div class="table-wrap"><table><thead><tr><th>Columna</th><th>Apunta a</th></tr></thead><tbody>${RELS.map(([a, b]) => `<tr><td><code>${a}</code></td><td><code>${b}</code></td></tr>`).join('')}</tbody></table></div>
      <h2>Tablas</h2><div id="tablesList"><div class="loading-block"><span class="spinner"></span> Cargando…</div></div>
      <h2>Datos curiosos para tus análisis</h2>
      <ul><li>Las ventas tienen <b>estacionalidad</b>: suben en noviembre-diciembre y en julio.</li><li>Más de 500 clientes (≈27%) <b>nunca compraron</b>: útiles para practicar LEFT JOIN y anti-joins.</li><li>Las ventas <b>crecen</b> año a año (2022 → 2024) y los pedidos se numeran en orden cronológico.</li><li>Algunos productos venden muchísimo más que otros (distribución de “cola larga”).</li><li><code>clientes_crudo</code> tiene duplicados con mayúsculas y espacios: perfecta para limpiar datos.</li><li><code>logins</code> tiene rachas de días consecutivos (el clásico problema “gaps &amp; islands”).</li><li><code>tipos_cambio</code> no tiene fines de semana: ideal para practicar “último valor conocido”.</li><li>Las fechas se guardan como texto ISO (<code>'2024-03-15'</code>), como es habitual en SQLite.</li></ul>
    </div>`;
    SQL.init().then(() => {
      const box = $('#tablesList'); if (!box) return; box.innerHTML = '';
      for (const [name, t] of Object.entries(SQL.tables)) {
        const fks = new Set(RELS.filter(([a]) => a.startsWith(name + '.')).map(([a]) => a.split('.')[1]));
        const el = h(`<div class="card dataset-table not-prose"><h3>${esc(name)}</h3><div class="muted small">${t.rows.length.toLocaleString('es')} filas · ${esc(window.DataGen.TABLE_INFO[name] || '')}</div>
          <div class="cols-list">${t.columns.map((c, i) => `<span class="${i === 0 && c.endsWith('_id') && name !== 'logins' && name !== 'tipos_cambio' ? 'pk' : fks.has(c) ? 'fk' : ''}">${esc(c)}</span>`).join('')}</div>
          <details><summary class="small" style="cursor:pointer">Ver 8 filas de ejemplo</summary>${tableHtml({ columns: t.columns, values: t.rows.slice(0, 8) })}</details></div>`);
        box.append(el);
      }
      box.append(h('<p class="small muted">Borde naranja = clave primaria (PK) · borde violeta = clave foránea (FK).</p>'));
    }).catch((e) => { const box = $('#tablesList'); if (box) box.innerHTML = `<p>${esc(e.message)}</p>`; });
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
    const tarjeta = (g) => {
      const resumen = g.nino.replace(/<[^>]+>/g, '').split(/(?<=[.!?])\s/)[0];
      const sec = (ico, tit, html, cls = '') => (html ? `<section class="gloss-sec ${cls}"><h4>${ico} ${tit}</h4>${html}</section>` : '');
      const ver = (g.ver || []).map((v) => `<a class="chip" href="#/glosario?q=${encodeURIComponent(v)}">${esc(v)}</a>`).join('');
      const lec = (g.lecciones || []).map((l) => `<a href="#/l/${l.id}">${esc(l.titulo)}</a>`).join('');
      return `<details class="gloss-card" id="g-${encodeURIComponent(g.termino)}" ${abiertos.has(g.termino) ? 'open' : ''}>
        <summary><span class="gloss-term">${esc(g.termino)}</span><span class="badge tag">${esc(g.area)}</span>${(g.alias || []).length ? `<span class="gloss-alias">también: ${g.alias.map(esc).join(', ')}</span>` : ''}<span class="gloss-res">${resumen}</span></summary>
        <div class="gloss-body">
          ${sec('👶', 'Explicado como a un niño', g.nino, 'nino')}
          ${sec('📘', 'Qué es, con precisión', g.que)}
          ${sec('🧪', 'Un ejemplo', g.ejemplo)}
          ${sec('🎯', 'Para qué sirve', g.para)}
          ${sec('⚠️', 'Cuidado con', g.cuidado, 'cuidado')}
          ${ver ? `<section class="gloss-sec"><h4>🔗 Términos relacionados</h4><div class="gloss-chips">${ver}</div></section>` : ''}
          ${lec ? `<section class="gloss-sec"><h4>📚 Lo ves en estas lecciones</h4><div class="gloss-lec">${lec}</div></section>` : ''}
        </div></details>`;
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
      const colorear = (d) => { if (d.open && !d.dataset.hl) { d.dataset.hl = '1'; $$('pre', d).forEach((pre) => { try { highlight(pre); } catch (e) { /* sin resaltado */ } }); } };
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

  function viewProgreso() {
    const tp = totalProgress();
    const exDone = ALL_EX.filter((e) => Store.exDone(e.id)).length;
    main.innerHTML = `<div class="container">
      <h1>📈 Mi progreso</h1>
      <div class="stats"><div class="stat"><b>${tp.pct}%</b><span>del curso</span></div><div class="stat"><b>${tp.done}/${tp.total}</b><span>lecciones</span></div><div class="stat"><b>${exDone}/${ALL_EX.length}</b><span>ejercicios</span></div></div>
      <div class="grid" style="margin-top:20px">${C.modulos.map((m) => {
        const p = moduleProgress(m);
        const e = m.lecciones.flatMap((l) => l.ejercicios);
        const ed = e.filter((x) => Store.exDone(x.id)).length;
        return `<a class="card module-card" href="#/m/${m.id}" style="flex-direction:row;align-items:center;gap:16px"><span class="mc-ico">${m.icono}</span><div style="flex:1"><h3>${esc(m.titulo)}</h3><div class="small muted">${p.done}/${p.total} lecciones · ${ed}/${e.length} ejercicios</div><div class="bar" style="margin-top:8px"><i style="width:${p.pct}%;background:${m.color}"></i></div></div><b>${p.pct}%</b></a>`;
      }).join('')}</div>
      <h2 class="section-title">Tus datos</h2>
      <p class="muted">El progreso se guarda solo en este navegador. Puedes exportarlo para llevarlo a otra computadora.</p>
      <div class="row"><button class="btn" id="exp">⬇ Exportar progreso</button><label class="btn">⬆ Importar<input type="file" id="imp" accept="application/json" hidden></label><span class="spacer"></span><button class="btn btn-ghost" id="rst" style="color:var(--bad)">Borrar todo mi progreso</button></div>
    </div>`;
    $('#exp').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(Store.data)], { type: 'application/json' }));
      a.download = 'academia-datos-progreso.json'; a.click();
    });
    $('#imp').addEventListener('change', async (e) => {
      try { const d = JSON.parse(await e.target.files[0].text()); Store.data = Object.assign(Store.data, d); Store.save(); toast('Progreso importado'); route(); }
      catch (err) { toast('Archivo inválido'); }
    });
    $('#rst').addEventListener('click', () => {
      if (confirm('¿Seguro? Se borrará todo tu progreso y tu código guardado.')) { Store.data = { ex: {}, lessons: {}, code: {}, theme: Store.data.theme, visited: {} }; Store.save(); route(); }
    });
  }

  // ---------------------------------------------------------------- búsqueda
  const searchIndex = [
    ...LESSONS.map((l) => ({ t: l.titulo, s: `${l.modulo.icono} ${l.modulo.titulo} · ${l.nivel}`, href: '#/l/' + l.id, body: (l.resumen + ' ' + l.html.replace(/<[^>]+>/g, ' ')).toLowerCase() })),
    ...C.glosario.map((g) => ({ t: g.termino, s: '📖 Glosario · ' + g.area, href: '#/glosario?q=' + encodeURIComponent(g.termino), body: ((g.alias || []).join(' ') + ' ' + g.texto).toLowerCase() }))
  ];
  const sIn = $('#search'), sOut = $('#searchResults');
  let sSel = 0;
  sIn.addEventListener('input', () => {
    const q = sIn.value.trim().toLowerCase();
    if (q.length < 2) { sOut.hidden = true; return; }
    const res = searchIndex.map((x) => ({ x, score: (x.t.toLowerCase().includes(q) ? 10 : 0) + (x.body.includes(q) ? 1 : 0) }))
      .filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
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
    if (parts[0] === 'lab' && ['sql', 'python', 'pyspark', 'terminal'].includes(parts[1])) return { name: 'lab-' + parts[1] };
    if (['ruta', 'datos', 'glosario', 'progreso'].includes(parts[0])) return { name: parts[0], q: params.get('q') || '' };
    return { name: 'notfound' };
  }
  function route() {
    const r = parse();
    document.body.classList.remove('nav-open');
    renderSidebar(r);
    const titles = { home: 'Academia de Datos', ruta: 'Ruta de aprendizaje', datos: 'Los datos', glosario: 'Glosario', progreso: 'Mi progreso', 'lab-sql': 'Laboratorio SQL', 'lab-python': 'Laboratorio Python', 'lab-pyspark': 'Laboratorio PySpark', 'lab-terminal': 'Laboratorio de terminal' };
    if (r.name === 'home') viewHome();
    else if (r.name === 'ruta') viewRuta();
    else if (r.name === 'module') viewModule(r.module);
    else if (r.name === 'lesson') viewLesson(r.lesson);
    else if (r.name === 'lab-sql') viewLabSql();
    else if (r.name === 'lab-python') viewLabPython('python');
    else if (r.name === 'lab-pyspark') viewLabPython('pyspark');
    else if (r.name === 'lab-terminal') viewLabTerminal();
    else if (r.name === 'datos') viewDatos();
    else if (r.name === 'glosario') viewGlosario(r.q);
    else if (r.name === 'progreso') viewProgreso();
    else main.innerHTML = '<div class="container prose"><h1>Página no encontrada</h1><p><a href="#/">Volver al inicio</a></p></div>';
    document.title = r.lesson ? `${r.lesson.titulo} · Academia de Datos` : r.module ? `${r.module.titulo} · Academia de Datos` : (titles[r.name] || 'Academia de Datos');
    const anchor = location.hash.split('#')[2];
    if (anchor && document.getElementById(anchor)) document.getElementById(anchor).scrollIntoView();
    else window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', route);
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  $('#scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
  updateProgressPill();
  $('#termBtn').addEventListener('click', () => Dock.toggle());
  document.addEventListener('keydown', (e) => { if (e.key === '`' && e.ctrlKey) { e.preventDefault(); Dock.toggle(); } });
  if (Store.data.editor !== 'simple') Monaco.load().catch(() => {});
  route();
})();
