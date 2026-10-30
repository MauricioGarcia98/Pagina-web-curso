/* Laboratorios con misiones: el alumno recibe un pedido del negocio con criterios de aceptación, escribe
 * su solución y la entrega. El sitio la compara con una solución de referencia oculta y explica qué no
 * coincide (columnas, filas, orden, valores). Las pistas se abren de a una y la solución solo se puede
 * ver después de intentarlo dos veces. El progreso queda guardado en el navegador.
 * Lo usan los laboratorios de SQL, dbt, Python, PySpark y terminal (los datos están en misiones-datos.js). */
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const NIVELES = ['Básico', 'Intermedio', 'Avanzado', 'Experto'];
  const LABS = {
    sql: { titulo: '🧪 Laboratorio SQL', lang: 'sql', intro: 'Pedidos reales de las 13 empresas del curso. Escribe la consulta, ejecútala para mirar tu resultado y <b>entrégala</b>: el sitio la compara con la respuesta esperada y te dice qué no coincide.' },
    dbt: { titulo: '🔧 Laboratorio dbt', lang: 'sql', intro: 'Escribe modelos de dbt de verdad: <code>{{ source() }}</code>, <code>{{ ref() }}</code>, CTEs y Jinja. Se compilan y se ejecutan sobre los datos de la tienda, y el resultado se compara con el modelo esperado.' },
    python: { titulo: '🐍 Laboratorio Python', lang: 'python', intro: 'Problemas de ingeniería de datos con Python real (Pyodide): limpiar, validar, deduplicar, procesar archivos y APIs. Guarda tu respuesta en la variable <code>resultado</code> y entrégala.' },
    pyspark: { titulo: '⚡ Laboratorio PySpark', lang: 'python', intro: 'Transformaciones con la API de PySpark sobre las tablas del curso (<code>spark.table("pedidos")</code>). Guarda el DataFrame final en <code>resultado</code> y entrégalo.' },
    airflow: { titulo: '🌬️ Laboratorio Airflow', lang: 'python', intro: 'Escribe DAGs de Airflow con la misma API de Airflow 2 (operadores, dependencias, TaskFlow, trigger rules). El sitio inspecciona el DAG que creaste y lo ejecuta con <code>dag.test()</code> para comprobar que cumple el pedido.' },
    terminal: { titulo: '⌨️ Laboratorio de terminal', lang: null, intro: 'Tareas de trabajo real en una máquina Linux simulada que recuerda todo: archivos, Git, Docker, nubes y Databricks. Cuando creas que terminaste, <b>verifica</b>: el sitio revisa el estado de la máquina, no los comandos que escribiste.' },
  };

  function vista(main, ctx, lab) {
    const { h, Store, toast, createEditor, Engines, renderSqlOutput, renderConsole, ensureSql, loadingInto, pyLoadingMsg, libre } = ctx;
    const L = LABS[lab];
    const lista = (window.MISIONES && window.MISIONES[lab]) || [];
    const prog = () => (Store.data.misiones = Store.data.misiones || {});
    const est = (id) => (prog()[id] = prog()[id] || { intentos: 0, pistas: 0, hecha: false, vioSolucion: false });
    const guardar = () => Store.save();
    let actual = lista.find((m) => m.id === Store.data.code['mision-' + lab]) || lista.find((m) => !est(m.id).hecha) || lista[0];

    const hechas = () => lista.filter((m) => est(m.id).hecha).length;
    main.innerHTML = `<div class="container wide mis-lab">
      <div class="mis-top"><h1 style="margin:0">${L.titulo}</h1>
        <div class="mis-modos" role="tablist"><button class="on" role="tab" aria-selected="true">🎯 Misiones</button><button role="tab" data-libre>🧪 Práctica libre</button></div></div>
      <p class="muted" style="margin:4px 0 14px;max-width:960px">${L.intro}</p>
      <div class="mis-grid">
        <aside class="card mis-side" id="misSide"></aside>
        <section class="mis-main" id="misMain"></section>
      </div>
    </div>`;
    const $ = (s) => main.querySelector(s);
    $('[data-libre]').addEventListener('click', () => libre());

    function pintarSide() {
      const camps = [...new Set(lista.map((m) => m.campana))];
      $('#misSide').innerHTML = `<div class="mis-prog"><b>${hechas()}/${lista.length}</b> misiones<div class="bar"><i style="width:${(100 * hechas()) / Math.max(1, lista.length)}%"></i></div></div>` +
        camps.map((c) => {
          const ms = lista.filter((m) => m.campana === c);
          const k = ms.filter((m) => est(m.id).hecha).length;
          return `<details class="mis-camp" ${ms.includes(actual) ? 'open' : ''}><summary><span>${esc(c)}</span><small>${k}/${ms.length}</small></summary>${ms.map((m) => {
            const e = est(m.id);
            return `<button class="mis-item ${m === actual ? 'on' : ''} ${e.hecha ? 'hecha' : e.intentos ? 'intentada' : ''}" data-m="${m.id}"><span class="mis-dot">${e.hecha ? '✓' : e.intentos ? '●' : '○'}</span><span>${esc(m.titulo)}<small>${esc(m.nivel)}</small></span></button>`;
          }).join('')}</details>`;
        }).join('');
    }
    $('#misSide').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) abrir(lista.find((m) => m.id === b.dataset.m)); });

    let ed = null, term = null;
    function abrir(m) {
      actual = m; Store.setCode('mision-' + lab, m.id);
      const e = est(m.id);
      pintarSide();
      const practica = (m.practica || []).map((id) => { const l = (window.COURSE.modulos.flatMap((x) => x.lecciones)).find((x) => x.id === id); return l ? `<a href="#/l/${id}">${esc(l.titulo)}</a>` : ''; }).filter(Boolean);
      const tablas = (m.tablas || []).map((t) => `<code>${esc(t)}</code>`).join(' ');
      $('#misMain').innerHTML = `
        <article class="card mis-ticket">
          <div class="mis-ticket-cab"><span class="badge">${esc(m.nivel)}</span><span class="small muted">📨 Pedido de <b>${esc(m.de || 'tu líder')}</b></span><span class="spacer"></span>${e.hecha ? '<span class="badge mis-ok">✓ Resuelta</span>' : ''}</div>
          <h2>${esc(m.titulo)}</h2>
          <div class="mis-pedido">${m.pedido}</div>
          ${m.criterios ? `<div class="mis-crit"><b>Criterios de aceptación</b><ul>${(lab === 'terminal' ? m.criterios.map((c) => c.t) : m.criterios).map((c, i) => `<li data-c="${i}">${c}</li>`).join('')}</ul></div>` : ''}
          <div class="small muted mis-meta">${tablas ? `🗃️ Datos: ${tablas} · <a href="#/datos">ver las bases</a>` : ''}${practica.length ? ` · 📚 Repasa: ${practica.join(', ')}` : ''}</div>
          ${m.previo && lab !== 'terminal' ? `<details class="mis-previo"><summary>📦 Datos que recibes (ya están cargados)</summary><pre><code>${esc(m.previo)}</code></pre></details>` : ''}
        </article>
        <div class="card mis-work" id="misWork"></div>`;
      const w = $('#misWork');
      if (lab === 'terminal') {
        w.innerHTML = '<div id="misTerm"></div>';
        if (window.Shell) {
          const Sh = window.Shell; if (!Sh.Machine.ready) Sh.Machine.load();
          term = Sh.createTerminal($('#misTerm'), { welcome: `Misión: ${m.titulo}. Cuando termines, presiona ✓ Verificar.` });
          term.el.classList.add('term-big');
          if (m.setup && !e.preparada) { (async () => { for (const l of m.setup) await Sh.runLine(l, { autoLogin: true }); e.preparada = true; guardar(); })(); }
        }
      } else {
        w.innerHTML = '<div id="misEd"></div>';
        const inicial = e.codigo ?? m.inicial ?? (L.lang === 'sql' ? (lab === 'dbt' ? '-- escribe tu modelo de dbt\nselect\n' : '-- escribe tu consulta\n') : '# escribe tu código; guarda el resultado en la variable resultado\n');
        ed = createEditor($('#misEd'), { lang: L.lang, value: inicial, tall: true, onRun: () => ejecutar(), onChange: (v) => { e.codigo = v; guardar(); } });
      }
      w.insertAdjacentHTML('beforeend', `
        <div class="ex-tools mis-tools">
          ${lab === 'terminal' ? '' : '<button class="btn" data-a="run">▶ Ejecutar <span class="kbd">Ctrl+↵</span></button>'}
          <button class="btn btn-primary" data-a="check">${lab === 'terminal' ? '✓ Verificar' : '✓ Entregar'}</button>
          <button class="btn btn-ghost" data-a="pista">💡 Pista <span class="muted">${Math.min(e.pistas, (m.pistas || []).length)}/${(m.pistas || []).length}</span></button>
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-sm" data-a="sol" ${e.intentos >= 2 || e.hecha ? '' : 'disabled title="Disponible después de dos entregas"'}>🏳 Ver solución</button>
        </div>
        <div class="mis-fb" id="misFb" aria-live="polite"></div>
        <div class="mis-pistas" id="misPistas"></div>
        ${lab === 'terminal' ? '' : '<div class="output" id="misOut"></div>'}
        <div id="misExtra"></div>`);
      pintarPistas();
      if (e.hecha && m.explicacion) $('#misExtra').innerHTML = `<div class="callout callout-trabajo"><div class="callout-title">🧑‍💻 Para pensar</div><p>${m.explicacion}</p></div>`;
      w.querySelector('.mis-tools').addEventListener('click', (ev) => {
        const a = ev.target.closest('[data-a]')?.dataset.a;
        if (a === 'run') ejecutar();
        if (a === 'check') entregar();
        if (a === 'pista') { if (e.pistas < (m.pistas || []).length) { e.pistas++; guardar(); pintarPistas(); ev.target.closest('[data-a]').querySelector('.muted').textContent = `${e.pistas}/${m.pistas.length}`; } else toast('Ya viste todas las pistas.'); }
        if (a === 'sol') verSolucion();
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function pintarPistas() {
      const e = est(actual.id);
      $('#misPistas').innerHTML = (actual.pistas || []).slice(0, e.pistas).map((p, i) => `<div class="mis-pista"><b>Pista ${i + 1}.</b> ${p}</div>`).join('');
    }
    function fb(tipo, html) { $('#misFb').innerHTML = `<div class="ex-feedback ${tipo}">${html}</div>`; }

    // para dbt, `setup` son las macros del proyecto; para SQL no se usa
    const exDe = (m) => ({ id: 'mision-' + m.id, solucion: (m.previo ? m.previo + '\n' : '') + m.solucion, ordenado: !!m.ordenado, variable: m.test ? '' : 'resultado', test: m.test || '', previo: m.previoSql || '', setup: lab === 'dbt' ? (m.setupMacros || '') : undefined });
    async function ejecutar() {
      const out = $('#misOut'); const code = ed.getValue();
      if (lab === 'sql') { if (!(await ensureSql(out))) return; renderSqlOutput(out, Engines.SQL.exec(code, Engines.SQL.playground())); }
      else if (lab === 'dbt') { if (!(await ensureSql(out))) return; loadingInto(out, pyLoadingMsg()); const r = await Engines.DBT.run(exDe(actual), code); renderSqlOutput(out, r); }
      else { loadingInto(out, pyLoadingMsg()); renderConsole(out, await Engines.PY.run(lab === 'pyspark' ? 'pyspark' : lab === 'airflow' ? 'airflow' : 'python', (actual.previo ? actual.previo + '\n' : '') + code)); }
    }
    async function entregar() {
      const m = actual, e = est(m.id);
      let pass = false, msg = '';
      try {
        if (lab === 'terminal') {
          const M = window.Shell.Machine;
          const res = m.criterios.map((c) => { try { return !!c.check(M); } catch (err) { return false; } });
          main.querySelectorAll('.mis-crit li').forEach((li, i) => { li.classList.toggle('ok', res[i]); li.classList.toggle('no', !res[i]); });
          pass = res.every(Boolean);
          msg = pass ? '¡Misión cumplida! Todos los criterios se verifican en la máquina.' : `Faltan ${res.filter((x) => !x).length} de ${res.length} criterios (marcados en rojo arriba). La verificación mira el estado de la máquina: archivos, repos y recursos.`;
        } else {
          const out = $('#misOut'); const code = ed.getValue();
          if (!code.trim() || /^(--|#)[^\n]*\n?\s*(select\s*)?$/i.test(code.trim())) { fb('info', 'Escribe tu solución antes de entregar.'); return; }
          let r;
          if (lab === 'sql') { if (!(await ensureSql(out))) return; r = Engines.SQL.grade(exDe(m), code); if (r.ok) renderSqlOutput(out, { ok: true, results: [r.result], ms: 0 }); }
          else if (lab === 'dbt') { if (!(await ensureSql(out))) return; loadingInto(out, pyLoadingMsg()); r = await Engines.DBT.grade(exDe(m), code); if (r.ok) renderSqlOutput(out, { ok: true, results: [r.result], ms: 0 }); }
          else { loadingInto(out, pyLoadingMsg()); r = await Engines.PY.grade(lab === 'pyspark' ? 'pyspark' : lab === 'airflow' ? 'airflow' : 'python', exDe(m), (m.previo ? m.previo + '\n' : '') + code); renderConsole(out, r); }
          if (!r.ok) { fb('bad', `✗ Tu código dio un error: <code>${esc(String(r.error || '').split('\n').slice(-1)[0])}</code>`); if (lab === 'sql' || lab === 'dbt') $('#misOut').innerHTML = `<pre class="console"><span class="err">${esc(r.error)}</span></pre>`; e.intentos++; guardar(); habilitarSol(); pintarSide(); return; }
          pass = !!r.pass; msg = r.msg || '';
        }
      } catch (err) { fb('bad', '✗ ' + esc(err.message)); return; }
      e.intentos++;
      if (pass) {
        const primera = !e.hecha; e.hecha = true; guardar();
        fb('ok', `✓ ${esc(msg)}${primera ? ` <span class="muted">(${e.intentos} entrega${e.intentos === 1 ? '' : 's'}${e.pistas ? `, ${e.pistas} pista${e.pistas === 1 ? '' : 's'}` : ', sin pistas'})</span>` : ''}`);
        const sig = lista[lista.indexOf(m) + 1];
        $('#misExtra').innerHTML = `${m.explicacion ? `<div class="callout callout-trabajo"><div class="callout-title">🧑‍💻 Para pensar</div><p>${m.explicacion}</p></div>` : ''}${sig ? `<button class="btn btn-primary" data-sig>Siguiente misión: ${esc(sig.titulo)} →</button>` : '<p><b>🎉 Terminaste todas las misiones de este laboratorio.</b></p>'}`;
        const bs = $('#misExtra [data-sig]'); if (bs) bs.addEventListener('click', () => abrir(sig));
        if (primera) toast('🎯 ¡Misión cumplida!');
      } else {
        guardar();
        fb('bad', `✗ ${esc(msg)}${e.intentos >= 2 && e.pistas < (m.pistas || []).length ? ' <span class="muted">¿Probaste con una pista?</span>' : ''}`);
      }
      habilitarSol(); pintarSide();
    }
    function habilitarSol() { const b = main.querySelector('[data-a="sol"]'); if (b && est(actual.id).intentos >= 2) { b.disabled = false; b.removeAttribute('title'); } }
    function verSolucion() {
      const m = actual, e = est(m.id);
      if (!e.hecha && !confirm('¿Ver la solución? Intenta antes con las pistas: se aprende mucho más resolviéndolo.')) return;
      e.vioSolucion = true; guardar();
      const cod = lab === 'terminal' ? m.solucion.join('\n') : m.solucion;
      $('#misExtra').innerHTML = `<div class="callout callout-nota"><div class="callout-title">🏳 Una solución posible</div><pre><code>${esc(cod)}</code></pre>${m.explicacion ? `<p>${m.explicacion}</p>` : ''}<p class="small muted">Hay otras formas válidas: lo que se corrige es el resultado.</p></div>`;
      if (lab !== 'terminal') { const b = h('<button class="btn btn-sm">Copiar al editor</button>'); b.addEventListener('click', () => ed.setValue(m.solucion)); $('#misExtra .callout').append(b); }
    }

    pintarSide();
    if (actual) abrir(actual);
  }

  window.Misiones = { vista, LABS };
})();
