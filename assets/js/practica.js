/* Practicar en la herramienta: conecta cada lección con la app donde se practica.
 *
 * En la lección, un bloque  :::practica <app> <título>  …  :::  muestra un botón que abre esa app.
 * Los laboratorios (SQL, Python, PySpark, dbt, Airflow) arrancan con el primer bloque de código del ejercicio ya
 * escrito. En cualquier app, un panel flotante muestra los pasos de la lección, el código para copiar (o escribir
 * directo en la terminal), un botón para volver a la lección y otro para marcarla como hecha.
 */
(function () {
  'use strict';
  const CLAVE = 'practica-activa';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // app → cómo abrirla, en qué rutas mostrar el panel y cómo precargarla
  const labCode = (clave) => (enc, Store) => { if (enc.codigo) Store.setCode(clave, enc.codigo); };
  const APPS = {
    sql: { nombre: 'el laboratorio SQL', ico: '🧪', ruta: '#/lab/sql?modo=libre', rutas: ['lab-sql'], precargar: (enc, Store) => { const m = enc.motor || 'duckdb'; Store.setCode('lab-sql-motor', m); if (enc.codigo) Store.setCode(m === 'sqlite' ? 'lab-sql' : 'lab-sql-' + m, enc.codigo); } },
    python: { nombre: 'el laboratorio de Python', ico: '🐍', ruta: '#/lab/python?modo=libre', rutas: ['lab-python'], precargar: labCode('lab-python') },
    pyspark: { nombre: 'el laboratorio de PySpark', ico: '⚡', ruta: '#/lab/pyspark?modo=libre', rutas: ['lab-pyspark'], precargar: labCode('lab-pyspark') },
    dbt: { nombre: 'el laboratorio de dbt', ico: '🔧', ruta: '#/lab/dbt?modo=libre', rutas: ['lab-dbt'], precargar: labCode('lab-dbt') },
    'airflow-lab': { nombre: 'el laboratorio de Airflow', ico: '🌬️', ruta: '#/lab/airflow?modo=libre', rutas: ['lab-airflow'], precargar: labCode('lab-airflow') },
    terminal: { nombre: 'la terminal', ico: '⌨️', ruta: '#/lab/terminal?modo=libre', rutas: ['lab-terminal'] },
    // databricks:sql y databricks:notebook abren el editor o un notebook nuevo con el código; databricks:<vista>, esa vista
    databricks: { nombre: 'Databricks', ico: '🧱', ruta: (enc) => (/^(sql|notebook)$/.test(enc.motor) && enc.codigo ? '#/databricks/practica' : '#/databricks/' + (enc.motor || '')), rutas: ['databricks'] },
    azure: { nombre: 'el portal de Azure', ico: '☁️', ruta: (enc) => '#/azure/' + (enc.motor || ''), rutas: ['azure'] },
    adf: { nombre: 'Data Factory Studio', ico: '🏭', ruta: '#/azure/studio', rutas: ['azure'] },
    powerbi: { nombre: 'Power BI', ico: '📊', ruta: '#/powerbi', rutas: ['powerbi'] },
    github: { nombre: 'GitHub', ico: '🐙', ruta: '#/github', rutas: ['github'] },
    vscode: { nombre: 'VS Code', ico: '🧩', ruta: '#/vscode', rutas: ['vscode'] },
    jupyter: { nombre: 'JupyterLab', ico: '📓', ruta: '#/jupyter', rutas: ['jupyter'] },
    excel: { nombre: 'Excel', ico: '📗', ruta: '#/excel', rutas: ['excel'] },
    snowflake: { nombre: 'Snowflake', ico: '❄️', ruta: '#/snowflake', rutas: ['snowflake'] },
    bigquery: { nombre: 'BigQuery', ico: '🔎', ruta: '#/bigquery', rutas: ['bigquery'] },
    fabric: { nombre: 'Microsoft Fabric', ico: '🧵', ruta: '#/fabric', rutas: ['fabric'] },
    airflow: { nombre: 'Airflow', ico: '🌬️', ruta: '#/airflow', rutas: ['airflow'] },
    modelado: { nombre: 'el laboratorio de modelado', ico: '📐', ruta: '#/modelado', rutas: ['modelado'] },
    generador: { nombre: 'el generador de datos', ico: '🎲', ruta: '#/generador', rutas: ['generador'] },
  };
  const leer = () => { try { return JSON.parse(sessionStorage.getItem(CLAVE) || 'null'); } catch (e) { return null; } };
  const guardar = (enc) => { try { if (enc) sessionStorage.setItem(CLAVE, JSON.stringify(enc)); else sessionStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ } };
  let Store = null, toast = null;
  const hechas = () => { const d = Store && Store.data; if (!d) return {}; d.practicas = d.practicas || {}; return d.practicas; };
  const estaHecha = (leccion, i) => (hechas()[leccion] || []).includes(i);

  // ------------------------------------------------------------------ en la lección
  function montarLeccion(root, store, leccion, opts = {}) {
    Store = store; toast = opts.toast || toast;
    const bloques = [...root.querySelectorAll('.callout-practica')];
    bloques.forEach((b, i) => {
      if (b.dataset.montado) return; b.dataset.montado = '1';
      const A = APPS[b.dataset.app]; if (!A) return;
      const pre = b.querySelector('pre code, pre');
      const barra = document.createElement('div'); barra.className = 'practica-barra';
      barra.innerHTML = `<button class="btn btn-primary btn-sm" type="button">${A.ico} Abrir ${esc(A.nombre)} con esta práctica</button>${estaHecha(leccion.id, i) ? '<span class="practica-hecha">✓ Hecha</span>' : ''}`;
      b.querySelector('.callout-title').after(barra);
      barra.querySelector('button').addEventListener('click', () => {
        const cuerpo = b.cloneNode(true); cuerpo.querySelectorAll('.callout-title, .practica-barra, button').forEach((x) => x.remove()); // los botones clonados no conservan sus acciones: el panel pone los suyos
        const enc = { app: b.dataset.app, titulo: b.dataset.titulo || '', html: cuerpo.innerHTML, codigo: pre ? pre.textContent : '', motor: b.dataset.motor || '', leccion: { id: leccion.id, titulo: leccion.titulo, hash: '#/l/' + leccion.id }, idx: i, abierto: true };
        guardar(enc);
        if (A.precargar) try { A.precargar(enc, Store); } catch (e) { /* la app abre igual */ }
        location.hash = typeof A.ruta === 'function' ? A.ruta(enc) : A.ruta;
      });
    });
  }

  // ------------------------------------------------------------------ dentro de la app
  let panelEl = null;
  function quitar() { if (panelEl) { panelEl.remove(); panelEl = null; } }
  function panel(r) {
    const enc = leer(); if (!enc) return quitar();
    const A = APPS[enc.app]; if (!A || !A.rutas.includes(r.name)) return quitar();
    if (!panelEl) { panelEl = document.createElement('aside'); panelEl.className = 'practica-panel'; panelEl.setAttribute('aria-label', 'Práctica de la lección'); document.body.append(panelEl); }
    const min = !enc.abierto;
    panelEl.classList.toggle('min', min);
    panelEl.innerHTML = `<div class="practica-cab"><b>🛠️ Práctica${enc.titulo ? ': ' + esc(enc.titulo) : ''}</b><button type="button" class="practica-min" title="${min ? 'Mostrar' : 'Minimizar'}">${min ? '▴' : '▾'}</button></div>
      <div class="practica-cuerpo">${enc.html}</div>
      <div class="practica-pie"><a class="btn btn-sm" href="${esc(enc.leccion.hash)}">↩ Volver a la lección</a><button type="button" class="btn btn-sm btn-primary" data-hecha>✓ La terminé</button><button type="button" class="btn btn-sm btn-ghost" data-cerrar title="Cerrar el panel sin marcarla">✕</button></div>`;
    panelEl.querySelector('.practica-min').addEventListener('click', () => { enc.abierto = !enc.abierto; guardar(enc); panel(r); });
    panelEl.querySelector('[data-cerrar]').addEventListener('click', () => { guardar(null); quitar(); });
    panelEl.querySelector('[data-hecha]').addEventListener('click', () => {
      const H = hechas(); H[enc.leccion.id] = [...new Set([...(H[enc.leccion.id] || []), enc.idx])]; if (Store) Store.saveSoon();
      guardar(null); quitar(); if (toast) toast('Práctica marcada como hecha. Puedes volver a la lección cuando quieras.');
    });
    // cada bloque de código: copiar, y en la terminal, escribirlo en la línea de comandos
    panelEl.querySelectorAll('.practica-cuerpo pre').forEach((pre) => {
      const caja = document.createElement('div'); caja.className = 'practica-code-tools';
      const texto = () => (pre.querySelector('code') || pre).textContent.replace(/\n$/, '');
      // comandos de terminal: en la terminal del curso o en Cloud Shell (portal de Azure)
      const esShell = enc.app === 'terminal' || (enc.app === 'azure' && /language-(bash|sh|shell)/.test((pre.querySelector('code') || pre).className));
      caja.innerHTML = `<button type="button" class="btn btn-ghost btn-sm" data-c>Copiar</button>${esShell ? '<button type="button" class="btn btn-ghost btn-sm" data-t>Escribir en la terminal</button>' : ''}`;
      pre.after(caja);
      caja.querySelector('[data-c]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(texto()); if (toast) toast('Copiado'); } catch (e) { if (toast) toast('No se pudo copiar: selecciónalo y usa Ctrl+C'); } });
      // en la terminal, un botón por comando: lo escribe en la línea de comandos (Enter lo ejecuta el estudiante)
      if (caja.querySelector('[data-t]')) {
        caja.querySelector('[data-t]').remove();
        const lineas = texto().split('\n').filter((x) => x.trim() && !x.trim().startsWith('#'));
        const lista = document.createElement('div'); lista.className = 'practica-cmds';
        lineas.forEach((l) => { const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'practica-cmd'; btn.title = 'Escribir este comando en la terminal'; btn.textContent = '⌨ ' + l; btn.addEventListener('click', () => { const term = window.__terminalActiva; if (!term || !term.type || !document.body.contains(term.el || document.body)) { if (toast) toast(enc.app === 'azure' ? 'Abre Cloud Shell primero (el ícono de terminal arriba a la derecha)' : 'Abre la terminal primero'); return; } term.type(l); }); lista.append(btn); });
        caja.after(lista);
      }
    });
  }
  window.Practica = { montarLeccion, panel, APPS, activa: leer, terminar: () => { guardar(null); quitar(); } };
})();
