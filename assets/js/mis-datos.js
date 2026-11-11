/* Mis datos: qué guarda el sitio en este navegador, cuánto ocupa y cómo reiniciarlo por partes.
 *
 * Todo lo que el alumno hace queda en el almacenamiento del navegador (localStorage), repartido así:
 *   academia-datos-v1          progreso del curso, código de los ejercicios y el estado de Power BI, Databricks y Azure
 *   academia-datos-maquina-v1  la terminal: archivos, repositorios Git (y los de GitHub) y las nubes simuladas
 *   academia-pbi-datos         las tablas importadas en Power BI
 *   academia-notas-v1          las notas
 *   vs-*, revisar-repo, …      preferencias chicas
 * Esta página permite ver cada parte, borrarla sola (sin perder el resto), pedir que una herramienta
 * empiece limpia cada vez que se abre el sitio, y llevarse o traer una copia completa.
 */
(function () {
  'use strict';
  const K_STORE = 'academia-datos-v1', K_MAQ = 'academia-datos-maquina-v1', K_PBI = 'academia-pbi-datos', K_NOTAS = 'academia-notas-v1';
  const ES_DEL_SITIO = (k) => /^(academia-|vs-)/.test(k) || ['revisar-repo', 'panel-lab-oculto', 'barra-plegada'].includes(k);
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const json = (k) => { try { return JSON.parse(leer(k)) || null; } catch (e) { return null; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch (e) { return false; } };
  const quitar = (k) => { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } };
  const claves = () => { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ES_DEL_SITIO(k)) out.push(k); } } catch (e) { /* sin almacenamiento */ } return out; };
  const tam = (x) => (x == null ? 0 : (typeof x === 'string' ? x : JSON.stringify(x) || '').length);
  const legible = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);

  // Cada categoría dice qué partes toca: claves dentro del progreso (store), nubes de la terminal (nube),
  // partes de la terminal (maq) y claves enteras del navegador (ls)
  const CATEGORIAS = [
    { id: 'progreso', ico: '📈', nombre: 'Progreso del curso', desc: 'Lecciones y ejercicios hechos, exámenes, simulacros, tarjetas de repaso, diagnóstico, misiones y retos.', store: ['ex', 'lessons', 'visited', 'auto', 'diagnostico', 'exams', 'simulacros', 'planes', 'cards', 'ultimoRepaso', 'repasoModo', 'misiones', 'retosHerr', 'trabajo', 'simActivo'], aviso: 'Vas a perder todo tu avance: lecciones, ejercicios, exámenes y tarjetas.' },
    { id: 'codigo', ico: '✍️', nombre: 'Código que escribiste', desc: 'Lo que dejaste escrito en el editor de cada ejercicio.', store: ['code'] },
    { id: 'powerbi', ico: '📊', nombre: 'Power BI', desc: 'Tu informe, el modelo, las medidas, las tablas importadas y lo publicado en el servicio.', store: ['powerbi', 'pbiServicio'], ls: [K_PBI], auto: true },
    { id: 'databricks', ico: '🧱', nombre: 'Databricks', desc: 'Notebooks, tablas de Unity Catalog, jobs, pipelines, dashboards, Genie y experimentos.', store: ['dbxUC', 'dbxWs'], nube: ['dbx'], auto: true },
    { id: 'azure', ico: '☁️', nombre: 'Azure y Data Factory', desc: 'Grupos de recursos, cuentas de almacenamiento, Key Vault, data factories y sus pipelines.', store: ['azPortal'], nube: ['az'], auto: true },
    { id: 'nubes', ico: '🌩️', nombre: 'AWS y Google Cloud (CLI)', desc: 'Los recursos creados con aws y gcloud en la terminal.', nube: ['aws', 'gcp'], auto: true },
    { id: 'terminal', ico: '⌨️', nombre: 'Terminal: archivos, Git y GitHub', desc: 'Tus archivos y carpetas, el historial de comandos, los repositorios Git y los de GitHub de práctica.', maq: ['fs', 'cwd', 'env', 'history', 'git', 'alias', 'gen'], auto: true, aviso: 'Se borran tus archivos, repositorios y pull requests de práctica.' },
    { id: 'notas', ico: '📝', nombre: 'Notas', desc: 'Todas tus notas y carpetas.', ls: [K_NOTAS], aviso: 'Se borran todas tus notas.' },
    { id: 'prefs', ico: '⚙️', nombre: 'Preferencias', desc: 'Tema claro u oscuro, tu nombre, ajustes del editor y de VS Code.', store: ['theme', 'editor', 'nombre'], prefijo: 'vs-', ls: ['panel-lab-oculto', 'barra-plegada', 'revisar-repo'] },
  ];

  function medir(c) {
    const S = json(K_STORE) || {}, M = json(K_MAQ) || {}; let n = 0;
    for (const k of c.store || []) n += tam(S[k]);
    for (const k of c.nube || []) n += tam((M.cloud || {})[k]);
    for (const k of c.maq || []) n += tam(M[k]);
    for (const k of c.ls || []) n += tam(leer(k));
    if (c.prefijo) for (const k of claves()) if (k.startsWith(c.prefijo)) n += tam(leer(k));
    return n;
  }
  // borra una categoría directamente en el almacenamiento (la página se recarga después)
  function limpiar(id) {
    const c = CATEGORIAS.find((x) => x.id === id); if (!c) return;
    if (c.store) { const S = json(K_STORE); if (S) { for (const k of c.store) delete S[k]; escribir(K_STORE, S); } }
    if (c.nube || c.maq) {
      const M = json(K_MAQ);
      if (M) {
        for (const k of c.nube || []) if (M.cloud) delete M.cloud[k];
        // terminal nueva: se guarda solo lo de las nubes; al no haber disco, la terminal arma uno de fábrica
        escribir(K_MAQ, c.maq ? { v: 1, cloud: M.cloud || {} } : M);
      }
    }
    limpiarFin(c);
  }
  function limpiarFin(c) {
    for (const k of c.ls || []) quitar(k);
    if (c.prefijo) for (const k of claves()) if (k.startsWith(c.prefijo)) quitar(k);
  }

  // Al abrir el sitio: las herramientas marcadas como "empezar limpio" se reinician antes de que nada las lea
  (function alAbrir() {
    const S = json(K_STORE); const marcadas = S && S.limpiarAlAbrir ? Object.keys(S.limpiarAlAbrir).filter((k) => S.limpiarAlAbrir[k]) : [];
    for (const id of marcadas) limpiar(id);
  })();

  function exportar() {
    const datos = { app: 'academia-de-datos', v: 1, fecha: new Date().toISOString(), claves: {} };
    for (const k of claves()) datos.claves[k] = leer(k);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(datos)], { type: 'application/json' }));
    a.download = `academia-de-datos-copia-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  // acepta la copia completa y también el archivo viejo de "Exportar progreso" (solo el progreso)
  function importar(texto) {
    let d; try { d = JSON.parse(texto); } catch (e) { return 'El archivo no es una copia válida (no se pudo leer).'; }
    if (d && d.app === 'academia-de-datos' && d.claves && typeof d.claves === 'object') {
      const entradas = Object.entries(d.claves).filter(([k, v]) => ES_DEL_SITIO(k) && typeof v === 'string');
      if (!entradas.length) return 'La copia está vacía.';
      for (const k of claves()) quitar(k);
      for (const [k, v] of entradas) if (!escribir(k, v)) return 'No hay espacio suficiente en el navegador para restaurar la copia.';
      return null;
    }
    if (d && typeof d === 'object' && (d.ex || d.lessons)) { const S = json(K_STORE) || {}; escribir(K_STORE, Object.assign(S, d)); return null; }
    return 'Ese archivo no parece una copia de la Academia de Datos.';
  }

  function vista(main, ctx) {
    const { Store, toast } = ctx; try { Store.save(); } catch (e) { /* sin almacenamiento */ }
    const total = claves().reduce((s, k) => s + tam(leer(k)), 0), LIMITE = 5 * 1024 * 1024, pct = Math.min(100, Math.round((total / LIMITE) * 100));
    const auto = (Store.data.limpiarAlAbrir = Store.data.limpiarAlAbrir || {});
    const filas = CATEGORIAS.map((c) => { const n = medir(c); return `<tr><td class="md-ico">${c.ico}</td><td><b>${esc(c.nombre)}</b><div class="small muted">${esc(c.desc)}</div></td><td class="md-tam">${n ? legible(n) : '<span class="muted">vacío</span>'}</td><td class="md-auto">${c.auto ? `<label title="Si lo marcas, esta parte se borra sola cada vez que abres el sitio"><input type="checkbox" data-auto="${c.id}" ${auto[c.id] ? 'checked' : ''}> Empezar limpio siempre</label>` : ''}</td><td><button class="btn btn-sm" data-limpiar="${c.id}" ${n ? '' : 'disabled'}>Reiniciar</button></td></tr>`; }).join('');
    main.innerHTML = `<div class="page mis-datos">
      <div class="crumbs"><a href="#/">Inicio</a><span>/</span><span>Mis datos</span></div>
      <h1>🗂️ Mis datos</h1>
      <p class="lead">Todo lo que haces en el sitio se guarda <b>solo en este navegador</b>: nadie más lo ve y no viaja a ningún servidor. Por eso, si cambias de computadora o borras los datos del navegador, se pierde. Aquí ves qué hay guardado, puedes reiniciar una parte sin tocar el resto y llevarte una copia.</p>
      <div class="card md-espacio"><div class="row"><b>Espacio usado</b><span class="spacer"></span><span>${legible(total)} de unos 5 MB</span></div><div class="md-barra"><i style="width:${pct}%" class="${pct > 85 ? 'lleno' : pct > 60 ? 'medio' : ''}"></i></div>${pct > 85 ? '<p class="small" style="color:var(--bad);margin:8px 0 0">Casi no queda lugar: si se llena, el sitio deja de guardar. Reinicia lo que no uses (Power BI y la terminal suelen ser lo más pesado) o haz una copia y borra.</p>' : '<p class="small muted" style="margin:8px 0 0">Los navegadores dan unos 5 MB por sitio. Si se llena, el sitio deja de guardar cambios.</p>'}</div>
      <h2 class="section-title">Qué hay guardado</h2>
      <div class="md-tabla-caja"><table class="md-tabla"><tbody>${filas}</tbody></table></div>
      <div class="callout"><b>¿Cuándo conviene "Empezar limpio siempre"?</b> Cuando usas una herramienta solo para practicar y prefieres encontrarla vacía cada vez (por ejemplo, para repetir un laboratorio desde cero). Tu progreso del curso nunca se borra solo.</div>
      <h2 class="section-title">Copia de seguridad</h2>
      <p class="muted">La copia incluye <b>todo</b>: progreso, código, herramientas, terminal y notas. Sirve para pasar a otra computadora o para guardar un punto al que volver.</p>
      <div class="row"><button class="btn" id="mdExp">⬇ Descargar una copia completa</button><label class="btn">⬆ Restaurar una copia<input type="file" id="mdImp" accept="application/json,.json" hidden></label><span class="spacer"></span><button class="btn btn-ghost" id="mdTodo" style="color:var(--bad)">Borrar absolutamente todo</button></div>
      <p class="small muted" style="margin-top:14px">Próximamente: iniciar sesión para que tu progreso se sincronice solo entre dispositivos.</p>
    </div>`;
    // que nada vuelva a escribir en el almacenamiento antes de recargar (ni los guardados que estaban en espera)
    const congelar = () => { clearTimeout(Store._t); Store.save = () => {}; Store.saveSoon = () => {}; const M = window.Shell && window.Shell.Machine; if (M) { clearTimeout(M._t); M.save = () => {}; } };
    const recargar = (msg) => { toast(msg); setTimeout(() => location.reload(), 500); };
    main.querySelectorAll('[data-limpiar]').forEach((b) => b.addEventListener('click', () => {
      const c = CATEGORIAS.find((x) => x.id === b.dataset.limpiar);
      if (!confirm(`¿Reiniciar "${c.nombre}"?\n\n${c.aviso || 'Esa parte vuelve a estar como el primer día.'}\nEl resto de tus datos no se toca. No se puede deshacer.`)) return;
      Store.save(); congelar();
      limpiar(c.id); recargar(`"${c.nombre}" quedó como nuevo`);
    }));
    main.querySelectorAll('[data-auto]').forEach((x) => x.addEventListener('change', () => { auto[x.dataset.auto] = x.checked; if (!x.checked) delete auto[x.dataset.auto]; Store.save(); toast(x.checked ? 'Desde la próxima vez que abras el sitio, empieza limpio.' : 'Vuelve a conservarse entre visitas.'); }));
    main.querySelector('#mdExp').addEventListener('click', () => { Store.save(); exportar(); toast('Copia descargada'); });
    main.querySelector('#mdImp').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (!confirm('Restaurar la copia reemplaza lo que hay ahora en este navegador. ¿Continuar?')) { e.target.value = ''; return; }
      congelar();
      const err = importar(await f.text()); if (err) { toast(err); setTimeout(() => location.reload(), 1500); return; }
      recargar('Copia restaurada');
    });
    main.querySelector('#mdTodo').addEventListener('click', () => {
      if (!confirm('¿Borrar absolutamente todo?\n\nProgreso, código, herramientas, terminal y notas. El sitio queda como la primera vez que entraste. No se puede deshacer.')) return;
      if (!confirm('Última confirmación: ¿borrar todo?')) return;
      congelar();
      for (const k of claves()) quitar(k); recargar('Todo borrado');
    });
  }

  window.MisDatos = { vista, limpiar, exportar, importar, CATEGORIAS, medir };
})();
