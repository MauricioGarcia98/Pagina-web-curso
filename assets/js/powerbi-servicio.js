/* Servicio de Power BI de práctica (app.powerbi.com) — #/powerbi/servicio
 * Lo que pasa después de "Publicar" en Power BI Desktop, según learn.microsoft.com/power-bi:
 *  áreas de trabajo y sus roles (Administrador, Miembro, Colaborador, Visor), el informe en el navegador,
 *  paneles con mosaicos anclados, el modelo semántico (actualización programada, puerta de enlace, credenciales,
 *  seguridad por filas con miembros de cada rol), compartir, apps, etiquetas de confidencialidad, aval
 *  (Promovido / Certificado), vista de linaje y canalizaciones de implementación (Desarrollo → Prueba → Producción).
 * Todo es simulado y queda en el navegador: no hay cuentas ni servidores reales. */
(function () {
  'use strict';
  const fl = (n) => window.PBIIconos(n);
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const id = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const ahora = () => new Date().toISOString();
  const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  const YO = 'alumno@academia.dev';
  const ROLES = ['Administrador', 'Miembro', 'Colaborador', 'Visor'];
  const ETIQUETAS = ['', 'Pública', 'General', 'Confidencial', 'Altamente confidencial'];
  let main, Store, toast, ctx;

  // ---------------------------------------------------------------- estado
  function D() {
    const s = Store.data;
    if (!s.pbiServicio || s.pbiServicio.v !== 1) s.pbiServicio = { v: 1, ws: [{ id: 'mi', nombre: 'Mi área de trabajo', personal: true, licencia: 'Pro', acceso: [{ email: YO, rol: 'Administrador' }], items: [] }], apps: [], puertas: [], pipelines: [], recientes: [] };
    return s.pbiServicio;
  }
  const guardar = () => Store.saveSoon();
  const ws = (wid) => D().ws.find((w) => w.id === wid);
  const item = (w, iid) => w && w.items.find((x) => x.id === iid);
  const ruta = (...p) => '#/powerbi/servicio' + (p.length ? '/' + p.map(encodeURIComponent).join('/') : '');
  const ICO_T = { informe: 'data_bar_vertical', modelo: 'database', panel: 'board', app: 'apps_add_in' };
  const NOM_T = { informe: 'Informe', modelo: 'Modelo semántico', panel: 'Panel', app: 'App' };
  function reciente(w, x) { const d = D(); d.recientes = [{ ws: w.id, item: x.id, cuando: ahora() }, ...d.recientes.filter((r) => r.item !== x.id)].slice(0, 12); guardar(); }

  // ---------------------------------------------------------------- publicar desde Desktop
  function publicar(foto, nombreSugerido, alTerminar) {
    const d = D(); const fondo = document.createElement('div'); fondo.className = 'pbs-capa';
    fondo.innerHTML = `<div class="pbs-dlg"><h3>${fl('cloud_arrow_up')} Publicar en Power BI</h3>
      <label>Nombre del informe<input data-n value="${esc(nombreSugerido || 'Mi informe')}"></label>
      <label>Seleccionar un destino</label><div class="pbs-dest">${d.ws.map((w, i) => `<label class="pbs-dest-i"><input type="radio" name="pbsws" value="${w.id}" ${i === 0 ? 'checked' : ''}> ${fl(w.personal ? 'person' : 'people')} ${esc(w.nombre)} <small>${esc(w.licencia)}</small></label>`).join('')}</div>
      <p class="pbs-ayuda">Al publicar se suben dos elementos al área de trabajo: el <b>modelo semántico</b> (tablas, relaciones, medidas) y el <b>informe</b> (páginas y objetos visuales) que lo usa.</p>
      <div class="pbs-dlg-pie"><button class="pbs-btn pbs-btn-p" data-ok>Seleccionar</button><button class="pbs-btn" data-x>Cancelar</button></div></div>`;
    document.body.appendChild(fondo);
    fondo.querySelector('[data-x]').onclick = () => fondo.remove();
    fondo.querySelector('[data-ok]').onclick = () => {
      const nombre = fondo.querySelector('[data-n]').value.trim(); if (!nombre) return;
      const w = ws(fondo.querySelector('[name=pbsws]:checked').value);
      const existe = w.items.find((x) => x.tipo === 'informe' && x.nombre === nombre);
      if (existe && !confirm(`"${nombre}" ya existe en ${w.nombre}. ¿Reemplazarlo? Se reemplazan el informe y su modelo semántico.`)) return;
      foto.nombreArchivo = nombre;
      let modelo = existe && item(w, existe.modeloId);
      if (!modelo) { modelo = { id: id('m'), tipo: 'modelo', nombre, propietario: YO, refresco: { activo: false, frecuencia: 'Diaria', horas: ['08:00'], zona: '(UTC-03:00) Buenos Aires' }, historial: [], credenciales: {}, puerta: '', seguridad: {}, etiqueta: '', aval: '' }; w.items.push(modelo); }
      modelo.foto = foto; modelo.actualizado = ahora(); modelo.origenes = origenesDe(foto);
      if (existe) { existe.foto = foto; existe.actualizado = ahora(); } else w.items.push({ id: id('r'), tipo: 'informe', nombre, modeloId: modelo.id, foto, propietario: YO, actualizado: ahora(), compartido: [], etiqueta: '', aval: '' });
      guardar(); fondo.remove(); if (alTerminar) alTerminar(nombre);
      const inf = w.items.find((x) => x.tipo === 'informe' && x.nombre === nombre);
      const aviso = document.createElement('div'); aviso.className = 'pbs-capa';
      aviso.innerHTML = `<div class="pbs-dlg"><h3>✓ Correcto</h3><p>Se publicó "${esc(nombre)}" en <b>${esc(w.nombre)}</b>.</p><p><a href="${ruta('ws', w.id, 'informe', inf.id)}" data-cerrar>Abrir "${esc(nombre)}" en Power BI</a></p><p class="pbs-ayuda">En el servicio puedes programar la actualización, compartirlo, anclarlo a un panel y armar una app.</p><div class="pbs-dlg-pie"><button class="pbs-btn" data-cerrar>Entendido</button></div></div>`;
      document.body.appendChild(aviso); aviso.addEventListener('click', (e) => { if (e.target.closest('[data-cerrar]')) aviso.remove(); });
    };
  }
  // de dónde vienen los datos del modelo: archivos locales o la base del curso necesitan puerta de enlace
  function origenesDe(foto) {
    const out = {};
    for (const [t, x] of Object.entries(foto.tablas || {})) {
      const f = x.fuente || {}; let k, tipo;
      if (f.tipo === 'curso') { k = 'SQL Server: servidor-local;curso'; tipo = 'local'; }
      else if (f.tipo === 'archivo') { k = `Archivo: C:\\Datos\\${f.archivo || t}`; tipo = 'local'; }
      else if (f.tipo === 'dax') continue;
      else { k = `Web: ${t}`; tipo = 'nube'; }
      (out[k] = out[k] || { tipo, tablas: [] }).tablas.push(t);
    }
    return out;
  }

  // ---------------------------------------------------------------- marco (barra superior + navegación)
  function marco(cuerpo, migas) {
    const d = D();
    main.innerHTML = `<div class="pbs"><header class="pbs-top"><span class="pbs-logo"><i></i><i></i><i></i></span><b>Power BI</b><span class="pbs-migas">${migas || ''}</span><span class="pbs-sp"></span>
      <div class="pbs-buscar">${fl('search')}<input placeholder="Buscar" data-buscar></div>
      <button class="pbs-ib" title="Notificaciones">${fl('globe')}</button><button class="pbs-ib" title="Configuración" data-cfg>${fl('settings')}</button><button class="pbs-ib" title="Ayuda" data-ayuda>${fl('question_circle')}</button><span class="pbs-av" title="${YO}">AL</span></header>
      <nav class="pbs-nav">${[['', 'Inicio', 'board'], ['examinar', 'Examinar', 'folder_open'], ['ws', 'Áreas de trabajo', 'people'], ['apps', 'Apps', 'apps_add_in'], ['pipelines', 'Canalizaciones', 'arrow_routing'], ['ws/mi', 'Mi área de trabajo', 'person']].map(([h, t, i]) => `<a href="${h ? '#/powerbi/servicio/' + h : '#/powerbi/servicio'}" title="${t}">${fl(i)}<span>${t}</span></a>`).join('')}<a href="#/powerbi" title="Volver a Power BI Desktop" class="pbs-nav-desk">${fl('arrow_previous')}<span>Desktop</span></a></nav>
      <main class="pbs-main" id="pbsMain">${cuerpo}</main></div>`;
    void d;
    const b = main.querySelector('[data-buscar]'); b.addEventListener('keydown', (e) => { if (e.key === 'Enter' && b.value.trim()) location.hash = ruta('examinar') + '?q=' + encodeURIComponent(b.value.trim()); });
    main.querySelector('[data-ayuda]').onclick = () => window.open('https://learn.microsoft.com/power-bi/fundamentals/service-get-started', '_blank', 'noopener');
    main.querySelector('[data-cfg]').onclick = () => location.hash = ruta('puertas');
    return main.querySelector('#pbsMain');
  }
  const migasWs = (w, x) => `<a href="${ruta('ws', w.id)}">${esc(w.nombre)}</a>${x ? ` › ${fl(ICO_T[x.tipo])} ${esc(x.nombre)}` : ''}`;
  const tablaItems = (w, items) => items.length ? `<table class="pbs-tabla"><thead><tr><th>Nombre</th><th>Tipo</th><th>Propietario</th><th>Actualizado</th><th>Aval</th><th>Confidencialidad</th><th></th></tr></thead><tbody>${items.map((x) => `<tr><td><a href="${ruta('ws', w.id, x.tipo, x.id)}">${fl(ICO_T[x.tipo])} ${esc(x.nombre)}</a></td><td>${NOM_T[x.tipo]}</td><td>${esc(x.propietario || YO)}</td><td>${fecha(x.actualizado)}</td><td>${x.aval ? `<span class="pbs-aval ${x.aval === 'Certificado' ? 'cert' : ''}">${esc(x.aval)}</span>` : ''}</td><td>${x.etiqueta ? `<span class="pbs-etq">${esc(x.etiqueta)}</span>` : ''}</td><td><button class="pbs-ib" data-mas="${x.id}" title="Más opciones">${fl('more_horizontal')}</button></td></tr>`).join('')}</tbody></table>` : '<div class="pbs-vacio">Esta área de trabajo está vacía. Publica un informe desde Power BI Desktop (Inicio → Publicar).</div>';

  // ---------------------------------------------------------------- páginas
  function inicio() {
    const d = D(); const rec = d.recientes.map((r) => ({ w: ws(r.ws), r })).filter((x) => x.w && item(x.w, x.r.item));
    const c = marco(`<h1>Te damos la bienvenida a Power BI</h1>
      <p class="pbs-dim">Este es el <b>servicio</b>: donde los informes publicados se comparten, se actualizan solos y se consumen en el navegador. Lo creas en <a href="#/powerbi">Power BI Desktop</a>; aquí lo distribuyes.</p>
      <div class="pbs-pasos">${[['1', 'Publica', 'En Desktop: Inicio → Publicar. Sube el modelo semántico y el informe a un área de trabajo.'], ['2', 'Programa la actualización', 'En el modelo semántico: puerta de enlace, credenciales y horarios.'], ['3', 'Comparte', 'Con un área de trabajo (roles), con Compartir o con una app.']].map(([n, t, x]) => `<div class="pbs-paso"><b>${n}</b><h3>${t}</h3><p>${x}</p></div>`).join('')}</div>
      <h2>Recientes</h2>${rec.length ? `<div class="pbs-tarjetas">${rec.map(({ w, r }) => { const x = item(w, r.item); return `<a class="pbs-tarjeta" href="${ruta('ws', w.id, x.tipo, x.id)}">${fl(ICO_T[x.tipo])}<b>${esc(x.nombre)}</b><small>${NOM_T[x.tipo]} · ${esc(w.nombre)}</small></a>`; }).join('')}</div>` : '<div class="pbs-vacio">Todavía no abriste nada.</div>'}
      <h2>Apps</h2>${d.apps.length ? `<div class="pbs-tarjetas">${d.apps.map((a) => `<a class="pbs-tarjeta" href="${ruta('apps', a.id)}">${fl('apps_add_in')}<b>${esc(a.nombre)}</b><small>App · ${esc((ws(a.ws) || {}).nombre || '')}</small></a>`).join('')}</div>` : '<div class="pbs-vacio">No hay apps. Una app empaqueta informes y paneles de un área de trabajo para muchas personas.</div>'}`, 'Inicio');
    void c;
  }
  function examinar() {
    const q = (location.hash.split('?q=')[1] || '').toLowerCase();
    const todos = D().ws.flatMap((w) => w.items.map((x) => ({ w, x }))).filter(({ x }) => !q || decodeURIComponent(q).split(' ').every((p) => x.nombre.toLowerCase().includes(p)));
    marco(`<h1>Examinar</h1><p class="pbs-dim">${q ? `Resultados para "${esc(decodeURIComponent(q))}"` : 'Todo el contenido al que tienes acceso.'}</p>${todos.length ? `<table class="pbs-tabla"><thead><tr><th>Nombre</th><th>Tipo</th><th>Área de trabajo</th><th>Actualizado</th></tr></thead><tbody>${todos.map(({ w, x }) => `<tr><td><a href="${ruta('ws', w.id, x.tipo, x.id)}">${fl(ICO_T[x.tipo])} ${esc(x.nombre)}</a></td><td>${NOM_T[x.tipo]}</td><td>${esc(w.nombre)}</td><td>${fecha(x.actualizado)}</td></tr>`).join('')}</tbody></table>` : '<div class="pbs-vacio">Sin resultados.</div>'}`, 'Examinar');
  }
  function listaWs() {
    const d = D();
    const c = marco(`<div class="pbs-tit"><h1>Áreas de trabajo</h1><button class="pbs-btn pbs-btn-p" data-nueva>${fl('document_add')} Nueva área de trabajo</button></div>
      <p class="pbs-dim">Un área de trabajo es una carpeta compartida: quienes tienen un rol en ella ven y editan su contenido. "Mi área de trabajo" es personal y no se puede compartir con roles.</p>
      <table class="pbs-tabla"><thead><tr><th>Nombre</th><th>Licencia</th><th>Elementos</th><th>Tu rol</th></tr></thead><tbody>${d.ws.map((w) => `<tr><td><a href="${ruta('ws', w.id)}">${fl(w.personal ? 'person' : 'people')} ${esc(w.nombre)}</a></td><td>${esc(w.licencia)}</td><td>${w.items.length}</td><td>${esc((w.acceso.find((a) => a.email === YO) || {}).rol || '')}</td></tr>`).join('')}</tbody></table>`, 'Áreas de trabajo');
    c.querySelector('[data-nueva]').onclick = () => dialogo('Crear un área de trabajo', `<label>Nombre<input data-f="nombre" placeholder="Ventas - Desarrollo"></label><label>Descripción<textarea data-f="desc" rows="2"></textarea></label><label>Modo de licencia<select data-f="licencia"><option>Pro</option><option>Premium por usuario</option><option>Capacidad de Fabric (F64)</option></select></label><p class="pbs-ayuda">Con <b>Pro</b>, cada persona que ve el contenido necesita licencia Pro. Con una <b>capacidad</b> (Premium/Fabric F64 o mayor), los visores pueden tener licencia gratuita y se habilitan las canalizaciones de implementación.</p>`, (f) => {
      if (!f.nombre.trim()) return 'Escribe un nombre.'; if (d.ws.some((w) => w.nombre.toLowerCase() === f.nombre.trim().toLowerCase())) return 'Ya existe un área de trabajo con ese nombre.';
      const w = { id: id('w'), nombre: f.nombre.trim(), desc: f.desc, licencia: f.licencia, acceso: [{ email: YO, rol: 'Administrador' }], items: [] }; d.ws.push(w); guardar(); location.hash = ruta('ws', w.id);
    });
  }
  function areaTrabajo(w, vista) {
    const c = marco(`<div class="pbs-tit"><h1>${fl(w.personal ? 'person' : 'people')} ${esc(w.nombre)}</h1>
        <span class="pbs-seg"><a class="${vista !== 'linaje' ? 'on' : ''}" href="${ruta('ws', w.id)}">${fl('table_simple')} Lista</a><a class="${vista === 'linaje' ? 'on' : ''}" href="${ruta('ws', w.id)}?vista=linaje">${fl('organization_horizontal')} Linaje</a></span></div>
      <div class="pbs-bar"><button class="pbs-btn" data-nuevo>${fl('document_add')} Nuevo elemento</button>${w.personal ? '' : `<button class="pbs-btn" data-acceso>${fl('people')} Administrar acceso</button>`}<button class="pbs-btn" data-app ${w.items.some((x) => x.tipo === 'informe' || x.tipo === 'panel') && !w.personal ? '' : 'disabled title="Las apps se crean en áreas de trabajo compartidas que tengan informes o paneles"'}>${fl('apps_add_in')} Crear app</button>${w.desc ? `<span class="pbs-dim">${esc(w.desc)}</span>` : ''}</div>
      ${vista === 'linaje' ? linaje(w) : tablaItems(w, w.items)}`, migasWs(w));
    c.querySelector('[data-nuevo]').onclick = (e) => menu(e.currentTarget, [['panel', 'Panel'], ['desktop', 'Informe (crear en Desktop)']], (k) => {
      if (k === 'desktop') { location.hash = '#/powerbi'; return; }
      dialogo('Crear un panel', '<label>Nombre<input data-f="nombre" value="Panel de ventas"></label><p class="pbs-ayuda">Un panel (dashboard) es una sola página con mosaicos anclados desde uno o varios informes. Para agregar mosaicos: abre un informe y usa el ícono de anclar de cada objeto visual.</p>', (f) => { if (!f.nombre.trim()) return 'Escribe un nombre.'; const p = { id: id('d'), tipo: 'panel', nombre: f.nombre.trim(), mosaicos: [], propietario: YO, actualizado: ahora() }; w.items.push(p); guardar(); location.hash = ruta('ws', w.id, 'panel', p.id); });
    });
    const ac = c.querySelector('[data-acceso]'); if (ac) ac.onclick = () => dialogoAcceso(w);
    const ap = c.querySelector('[data-app]'); if (ap) ap.onclick = () => dialogoApp(w);
    c.querySelectorAll('[data-mas]').forEach((b) => (b.onclick = () => menuItem(w, item(w, b.dataset.mas), b)));
  }
  function linaje(w) {
    const modelos = w.items.filter((x) => x.tipo === 'modelo');
    if (!modelos.length) return '<div class="pbs-vacio">Sin elementos para mostrar en el linaje.</div>';
    const col = (titulo, cajas) => `<div class="pbs-lin-col"><div class="pbs-lin-t">${titulo}</div>${cajas.join('')}</div>`;
    const caja = (ico, n, sub, extra = '') => `<div class="pbs-lin-c ${extra}">${fl(ico)}<b>${esc(n)}</b><small>${esc(sub)}</small></div>`;
    return `<p class="pbs-dim">El linaje muestra de dónde salen los datos y quién los usa: si cambias un modelo semántico, aquí ves qué informes, paneles y apps se afectan.</p><div class="pbs-lin">${modelos.map((m) => {
      const infs = w.items.filter((x) => x.tipo === 'informe' && x.modeloId === m.id), pan = w.items.filter((x) => x.tipo === 'panel' && x.mosaicos.some((t) => infs.some((i) => i.id === t.informe))), apps = D().apps.filter((a) => a.ws === w.id && a.contenido.some((cid) => infs.some((i) => i.id === cid) || pan.some((p) => p.id === cid)));
      return `<div class="pbs-lin-fila">${col('Orígenes de datos', Object.entries(m.origenes || {}).map(([k, o]) => caja(o.tipo === 'local' ? 'server' : 'globe', k.split(':')[0], k.split(':').slice(1).join(':').trim() + (o.tipo === 'local' ? ' · necesita puerta de enlace' : ''), o.tipo === 'local' && !m.puerta ? 'pbs-lin-warn' : '')))}<span class="pbs-lin-f">→</span>${col('Modelo semántico', [caja('database', m.nombre, m.historial[0] ? `Última actualización: ${m.historial[0].estado}` : 'Nunca actualizado')])}<span class="pbs-lin-f">→</span>${col('Informes', infs.map((i) => caja('data_bar_vertical', i.nombre, 'Informe')))}<span class="pbs-lin-f">→</span>${col('Paneles y apps', [...pan.map((p) => caja('board', p.nombre, 'Panel')), ...apps.map((a) => caja('apps_add_in', a.nombre, 'App'))])}</div>`;
    }).join('')}</div>`;
  }
  function menuItem(w, x, el) {
    const ops = [['abrir', 'Abrir'], ['renombrar', 'Cambiar nombre'], ['config', 'Configuración (aval y confidencialidad)'], ...(x.tipo === 'informe' ? [['compartir', 'Compartir'], ['modelo', 'Ir al modelo semántico']] : []), ...(x.tipo === 'modelo' ? [['actualizar', 'Actualizar ahora']] : []), ['eliminar', 'Eliminar']];
    menu(el, ops, (k) => {
      if (k === 'abrir') location.hash = ruta('ws', w.id, x.tipo, x.id);
      else if (k === 'renombrar') dialogo('Cambiar nombre', `<label>Nombre<input data-f="nombre" value="${esc(x.nombre)}"></label>`, (f) => { if (!f.nombre.trim()) return 'Escribe un nombre.'; x.nombre = f.nombre.trim(); guardar(); render(); });
      else if (k === 'config') dialogoConfig(x);
      else if (k === 'compartir') dialogoCompartir(x);
      else if (k === 'modelo') location.hash = ruta('ws', w.id, 'modelo', x.modeloId);
      else if (k === 'actualizar') { actualizarModelo(w, x, 'Manual'); render(); }
      else if (k === 'eliminar') {
        const dep = x.tipo === 'modelo' ? w.items.filter((y) => y.modeloId === x.id) : [];
        if (!confirm(`¿Eliminar ${NOM_T[x.tipo].toLowerCase()} "${x.nombre}"?${dep.length ? ` También se eliminan ${dep.length} informe(s) que lo usan.` : ''}`)) return;
        w.items = w.items.filter((y) => y !== x && !dep.includes(y)); guardar(); render();
      }
    });
  }

  // ---------------------------------------------------------------- informe en el navegador
  function informe(w, x) {
    reciente(w, x);
    const m = item(w, x.modeloId);
    const c = marco(`<div class="pbs-inf-bar"><button class="pbs-btn" data-compartir>${fl('share')} Compartir</button><button class="pbs-btn" data-modelo>${fl('database')} Modelo semántico</button><button class="pbs-btn" data-desktop>${fl('edit')} Editar en Desktop</button>${(m && Object.keys(m.foto.roles || {}).length) || (m && (m.foto.roles || []).length) ? `<select class="pbs-sel" data-vercomo><option value="">Ver como: yo (todos los datos)</option>${(m.foto.roles || []).map((r) => `<option ${S_vercomo === r.nombre ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('')}</select>` : ''}<span class="pbs-sp"></span><span class="pbs-dim">${x.etiqueta ? `<span class="pbs-etq">${esc(x.etiqueta)}</span> ` : ''}Actualizado ${fecha(m && m.historial[0] ? m.historial[0].fin : x.actualizado)}</span></div><div id="pbsInforme"></div>`, migasWs(w, x));
    c.querySelector('[data-compartir]').onclick = () => dialogoCompartir(x);
    c.querySelector('[data-modelo]').onclick = () => (location.hash = ruta('ws', w.id, 'modelo', x.modeloId));
    c.querySelector('[data-desktop]').onclick = () => { if (confirm('Esto abre una copia del informe publicado en Power BI Desktop y reemplaza lo que tengas abierto ahí. ¿Seguir?')) { Store.data.powerbi = JSON.parse(JSON.stringify(x.foto)); Store.save(); location.hash = '#/powerbi'; } };
    const vc = c.querySelector('[data-vercomo]'); if (vc) vc.onchange = () => { S_vercomo = vc.value; render(); };
    window.PowerBI.verPublicado(c.querySelector('#pbsInforme'), ctx, x.foto, { verComo: S_vercomo ? { rol: S_vercomo } : null, alAnclar: (v, el) => anclar(w, x, v, el) });
  }
  let S_vercomo = '';
  function anclar(w, x, v, el) {
    const paneles = D().ws.flatMap((ww) => ww.items.filter((y) => y.tipo === 'panel').map((p) => ({ w: ww, p })));
    const cuerpo = el.querySelector('.pb-v-cuerpo'); const tit = el.querySelector('.pb-v-tit');
    dialogo('Anclar en el panel', `<p>Un mosaico es una "foto" del objeto visual que lleva al informe al hacer clic. Se actualiza cuando se actualiza el modelo semántico.</p><label>Panel<select data-f="panel"><option value="__nuevo">+ Nuevo panel en ${esc(w.nombre)}</option>${paneles.map(({ w: ww, p }) => `<option value="${ww.id}|${p.id}">${esc(p.nombre)} (${esc(ww.nombre)})</option>`).join('')}</select></label><label>Nombre del panel nuevo<input data-f="nombre" value="Panel de ${esc(x.nombre)}"></label>`, (f) => {
      let ww = w, p;
      if (f.panel === '__nuevo') { p = { id: id('d'), tipo: 'panel', nombre: f.nombre.trim() || 'Panel', mosaicos: [], propietario: YO, actualizado: ahora() }; w.items.push(p); }
      else { const [a, b] = f.panel.split('|'); ww = ws(a); p = item(ww, b); }
      p.mosaicos.push({ id: id('t'), titulo: tit ? tit.textContent : (window.PBIVis.TIPOS[v.tipo] || {}).n || 'Mosaico', html: cuerpo ? cuerpo.innerHTML.slice(0, 60000) : '', ws: w.id, informe: x.id, ancho: v.w > 40 ? 2 : 1 });
      p.actualizado = ahora(); guardar(); toast(`Anclado en "${p.nombre}".`); void ww;
    });
  }

  // ---------------------------------------------------------------- panel (dashboard)
  function panel(w, p) {
    reciente(w, p);
    const c = marco(`<div class="pbs-tit"><h1>${fl('board')} ${esc(p.nombre)}</h1></div>${p.mosaicos.length ? `<div class="pbs-mos">${p.mosaicos.map((t, i) => `<div class="pbs-mosaico ${t.ancho === 2 ? 'ancho' : ''}"><div class="pbs-mos-t"><a href="${ruta('ws', t.ws, 'informe', t.informe)}">${esc(t.titulo)}</a><button class="pbs-ib" data-quitar="${i}" title="Quitar mosaico">${fl('dismiss')}</button></div><div class="pbs-mos-c">${t.html}</div></div>`).join('')}</div>` : '<div class="pbs-vacio">Este panel no tiene mosaicos. Abre un informe y usa el ícono de anclar de un objeto visual (aparece al pasar el mouse por él).</div>'}`, migasWs(w, p));
    c.querySelectorAll('[data-quitar]').forEach((b) => (b.onclick = () => { p.mosaicos.splice(Number(b.dataset.quitar), 1); guardar(); render(); }));
  }

  // ---------------------------------------------------------------- modelo semántico: actualización, puerta de enlace, credenciales, seguridad
  function actualizarModelo(w, m, tipo) {
    const inicio = ahora(); let estado = 'Completado', error = '';
    const locales = Object.entries(m.origenes || {}).filter(([, o]) => o.tipo === 'local');
    const pend = Object.keys(m.origenes || {}).filter((k) => !(m.credenciales[k] && m.credenciales[k].ok));
    if (locales.length && !m.puerta) { estado = 'Error'; error = `No se pudo conectar con el origen de datos local "${locales[0][0]}". Los orígenes que están en una computadora o en una red privada necesitan una puerta de enlace de datos local (on-premises data gateway). Configúrala en Configuración → Conexión de puerta de enlace.`; }
    else if (pend.length) { estado = 'Error'; error = `Las credenciales del origen de datos no son válidas o faltan: "${pend[0]}". Edítalas en Configuración → Credenciales del origen de datos.`; }
    m.historial.unshift({ tipo, inicio, fin: ahora(), estado, error }); m.historial = m.historial.slice(0, 20);
    if (estado === 'Completado') { m.actualizado = ahora(); w.items.filter((x) => x.modeloId === m.id).forEach((x) => { x.actualizado = m.actualizado; }); }
    guardar(); toast(estado === 'Completado' ? `Actualización de "${m.nombre}" completada.` : `La actualización de "${m.nombre}" falló: mira el historial.`, 5000);
    return estado;
  }
  function modelo(w, m, tab = 'actualizacion') {
    reciente(w, m);
    const f = m.foto; const roles = f.roles || [];
    const pest = [['actualizacion', 'Actualización programada'], ['puerta', 'Conexión de puerta de enlace'], ['credenciales', 'Credenciales del origen de datos'], ['seguridad', 'Seguridad (RLS)'], ['historial', 'Historial de actualizaciones'], ['info', 'Información']];
    let cuerpo = '';
    if (tab === 'actualizacion') { const r = m.refresco; cuerpo = `<p class="pbs-dim">El modelo se vuelve a cargar solo en los horarios que elijas: así el informe muestra los datos de hoy sin que nadie lo publique de nuevo. Con licencia Pro hay hasta 8 actualizaciones por día; con Premium o Fabric, hasta 48.</p>
      <label class="pbs-sw"><input type="checkbox" data-r="activo" ${r.activo ? 'checked' : ''}> Mantener los datos actualizados</label>
      <label>Frecuencia<select data-r="frecuencia">${['Diaria', 'Semanal'].map((x) => `<option ${r.frecuencia === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      ${r.frecuencia === 'Semanal' ? `<div class="pbs-dias">${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => `<label><input type="checkbox" data-dia="${d}" ${(r.dias || ['lun']).includes(d) ? 'checked' : ''}> ${d}</label>`).join('')}</div>` : ''}
      <label>Zona horaria<select data-r="zona">${['(UTC-03:00) Buenos Aires', '(UTC-05:00) Bogotá, Lima, Quito', '(UTC-06:00) Ciudad de México', '(UTC+01:00) Madrid', '(UTC) Hora universal coordinada'].map((x) => `<option ${r.zona === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Horas (separadas por coma, HH:MM)<input data-r="horas" value="${esc(r.horas.join(', '))}"></label>
      <div class="pbs-bar"><button class="pbs-btn pbs-btn-p" data-aplicar>Aplicar</button><button class="pbs-btn" data-ahora>${fl('arrow_sync')} Actualizar ahora</button></div>`; }
    else if (tab === 'puerta') {
      const locales = Object.entries(m.origenes || {}).filter(([, o]) => o.tipo === 'local'); const gws = D().puertas;
      cuerpo = `<p class="pbs-dim">Una <b>puerta de enlace de datos local</b> es un programa que se instala en una computadora de tu red: el servicio (en la nube) le pide los datos y ella los lee de los servidores o archivos internos. Los orígenes en la nube (por ejemplo, Azure SQL o SharePoint Online) no la necesitan.</p>
        ${locales.length ? `<p>Este modelo usa ${locales.length} origen(es) local(es): ${locales.map(([k]) => `<code>${esc(k)}</code>`).join(', ')}.</p>` : '<p>Este modelo no usa orígenes locales: no necesita puerta de enlace.</p>'}
        ${gws.length ? `<label>Puerta de enlace<select data-gw><option value="">(ninguna)</option>${gws.map((g) => `<option value="${g.id}" ${m.puerta === g.id ? 'selected' : ''}>${esc(g.nombre)} · ${g.estado}</option>`).join('')}</select></label><div class="pbs-bar"><button class="pbs-btn pbs-btn-p" data-gw-ok>Aplicar</button></div>` : `<div class="pbs-aviso">No tienes puertas de enlace. <a href="${ruta('puertas')}">Instala una (simulado)</a>.</div>`}`;
    } else if (tab === 'credenciales') {
      cuerpo = `<p class="pbs-dim">El servicio necesita saber con qué usuario conectarse a cada origen. En la práctica no se guardan contraseñas: no escribas datos reales.</p><table class="pbs-tabla"><thead><tr><th>Origen</th><th>Estado</th><th></th></tr></thead><tbody>${Object.keys(m.origenes || {}).map((k) => `<tr><td>${esc(k)}</td><td>${m.credenciales[k] && m.credenciales[k].ok ? `✓ ${esc(m.credenciales[k].metodo)} · privacidad ${esc(m.credenciales[k].privacidad)}` : '<span class="pbs-err">⚠ Faltan credenciales</span>'}</td><td><button class="pbs-btn" data-cred="${esc(k)}">Editar credenciales</button></td></tr>`).join('') || '<tr><td colspan="3">Sin orígenes externos.</td></tr>'}</tbody></table>`;
    } else if (tab === 'seguridad') {
      cuerpo = roles.length ? `<p class="pbs-dim">Los roles (y sus reglas DAX) se crean en Desktop (Modelado → Administrar roles). Aquí se asigna <b>quién</b> pertenece a cada rol. Ojo: la seguridad por filas solo se aplica a quienes tienen rol de <b>Visor</b> en el área de trabajo; Administradores, Miembros y Colaboradores ven todo.</p>${roles.map((r) => `<div class="pbs-rol"><h3>${esc(r.nombre)}</h3><small>Regla: ${(r.reglas || []).map((g) => `${esc(g.t)}[${esc(g.c)}] ${esc(g.op)} ${esc(g.val)}`).join(' y ') || 'sin reglas'}</small><div class="pbs-chips">${(m.seguridad[r.nombre] || []).map((e, i) => `<span class="pbs-chip">${esc(e)}<button data-quitar-miembro="${esc(r.nombre)}|${i}">✕</button></span>`).join('') || '<span class="pbs-dim">Sin miembros</span>'}</div><div class="pbs-bar"><input placeholder="correo@empresa.com" data-nuevo-miembro="${esc(r.nombre)}"><button class="pbs-btn" data-agregar-miembro="${esc(r.nombre)}">Agregar</button><a class="pbs-btn" href="${ruta('ws', w.id, 'informe', (w.items.find((x) => x.modeloId === m.id) || {}).id || '')}" data-probar="${esc(r.nombre)}">Probar como rol</a></div></div>`).join('')}` : '<div class="pbs-vacio">El modelo no tiene roles. Créalos en Desktop: Modelado → Administrar roles, y vuelve a publicar.</div>';
    } else if (tab === 'historial') {
      cuerpo = m.historial.length ? `<table class="pbs-tabla"><thead><tr><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>${m.historial.map((h) => `<tr><td>${esc(h.tipo)}</td><td>${fecha(h.inicio)}</td><td>${fecha(h.fin)}</td><td class="${h.estado === 'Error' ? 'pbs-err' : 'pbs-ok'}">${esc(h.estado)}</td><td>${esc(h.error || '')}</td></tr>`).join('')}</tbody></table>` : '<div class="pbs-vacio">Todavía no hubo actualizaciones.</div>';
    } else {
      cuerpo = `<table class="pbs-kv"><tr><th>Tablas</th><td>${Object.keys(f.tablas || {}).map(esc).join(', ')}</td></tr><tr><th>Medidas</th><td>${(f.medidas || []).map((x) => esc(x.nombre)).join(', ') || '—'}</td></tr><tr><th>Relaciones</th><td>${(f.rels || []).length}</td></tr><tr><th>Roles</th><td>${roles.map((r) => esc(r.nombre)).join(', ') || '—'}</td></tr><tr><th>Informes que lo usan</th><td>${w.items.filter((x) => x.modeloId === m.id).map((x) => esc(x.nombre)).join(', ')}</td></tr></table>`;
    }
    const c = marco(`<div class="pbs-tit"><h1>${fl('database')} ${esc(m.nombre)}</h1><button class="pbs-btn" data-ahora2>${fl('arrow_sync')} Actualizar ahora</button></div><div class="pbs-tabs">${pest.map(([k, n]) => `<a class="${tab === k ? 'on' : ''}" href="${ruta('ws', w.id, 'modelo', m.id)}?tab=${k}">${n}</a>`).join('')}</div><div class="pbs-form">${cuerpo}</div>`, migasWs(w, m));
    c.querySelector('[data-ahora2]').onclick = () => { actualizarModelo(w, m, 'Manual'); location.hash = ruta('ws', w.id, 'modelo', m.id) + '?tab=historial'; };
    const ap = c.querySelector('[data-aplicar]'); if (ap) ap.onclick = () => {
      const r = m.refresco; r.activo = c.querySelector('[data-r="activo"]').checked; r.frecuencia = c.querySelector('[data-r="frecuencia"]').value; r.zona = c.querySelector('[data-r="zona"]').value;
      const hs = c.querySelector('[data-r="horas"]').value.split(',').map((x) => x.trim()).filter(Boolean);
      if (hs.some((h) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(h))) { toast('Las horas van en formato HH:MM, por ejemplo 08:00, 14:30.'); return; }
      const max = /Premium|Fabric/.test(w.licencia) ? 48 : 8; if (hs.length > max) { toast(`Con licencia ${w.licencia} puedes programar hasta ${max} actualizaciones por día.`); return; }
      r.horas = hs; r.dias = [...c.querySelectorAll('[data-dia]:checked')].map((x) => x.dataset.dia);
      if (r.activo && Object.values(m.origenes || {}).some((o) => o.tipo === 'local') && !m.puerta) toast('Guardado, pero la próxima actualización va a fallar: el modelo usa orígenes locales y no tiene puerta de enlace.', 7000); else toast('Actualización programada guardada.');
      guardar(); render();
    };
    const fr = c.querySelector('[data-r="frecuencia"]'); if (fr) fr.onchange = () => { m.refresco.frecuencia = fr.value; render(); };
    const ah = c.querySelector('[data-ahora]'); if (ah) ah.onclick = () => { actualizarModelo(w, m, 'Manual'); location.hash = ruta('ws', w.id, 'modelo', m.id) + '?tab=historial'; };
    const gwok = c.querySelector('[data-gw-ok]'); if (gwok) gwok.onclick = () => { m.puerta = c.querySelector('[data-gw]').value; guardar(); toast(m.puerta ? 'Puerta de enlace asignada.' : 'Sin puerta de enlace.'); };
    c.querySelectorAll('[data-cred]').forEach((b) => (b.onclick = () => dialogo(`Configurar ${b.dataset.cred}`, `<label>Método de autenticación<select data-f="metodo"><option>Básica</option><option>Windows</option><option>OAuth2</option><option>Anónima</option></select></label><label>Usuario<input data-f="usuario" placeholder="usuario_practica"></label><label>Contraseña<input type="password" data-f="clave" placeholder="no uses una real"></label><label>Nivel de privacidad<select data-f="privacidad"><option>Organizativo</option><option>Privado</option><option>Público</option><option>Ninguno</option></select></label><p class="pbs-ayuda">El nivel de privacidad evita que Power Query mezcle datos privados con orígenes públicos.</p>`, (f) => { m.credenciales[b.dataset.cred] = { ok: true, metodo: f.metodo, privacidad: f.privacidad }; guardar(); render(); })));
    c.querySelectorAll('[data-agregar-miembro]').forEach((b) => (b.onclick = () => { const r = b.dataset.agregarMiembro, inp = c.querySelector(`[data-nuevo-miembro="${CSS.escape(r)}"]`), e = inp.value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { toast('Escribe un correo válido (ficticio).'); return; } (m.seguridad[r] = m.seguridad[r] || []).push(e); guardar(); render(); }));
    c.querySelectorAll('[data-quitar-miembro]').forEach((b) => (b.onclick = () => { const [r, i] = b.dataset.quitarMiembro.split('|'); m.seguridad[r].splice(Number(i), 1); guardar(); render(); }));
    c.querySelectorAll('[data-probar]').forEach((b) => b.addEventListener('click', () => { S_vercomo = b.dataset.probar; }));
  }
  function puertas() {
    const d = D();
    const c = marco(`<div class="pbs-tit"><h1>${fl('server')} Administrar conexiones y puertas de enlace</h1><button class="pbs-btn pbs-btn-p" data-instalar>${fl('arrow_download')} Instalar puerta de enlace (simulado)</button></div>
      <p class="pbs-dim">En la vida real se descarga el instalador de la puerta de enlace de datos local en una computadora que esté siempre encendida y tenga acceso a los datos. Modo <b>estándar</b>: la comparte un equipo y sirve para varios servicios. Modo <b>personal</b>: solo para una persona y solo para Power BI.</p>
      <table class="pbs-tabla"><thead><tr><th>Nombre</th><th>Modo</th><th>Estado</th><th>Instalada en</th><th></th></tr></thead><tbody>${d.puertas.map((g, i) => `<tr><td>${fl('server')} ${esc(g.nombre)}</td><td>${esc(g.modo)}</td><td class="pbs-ok">${esc(g.estado)}</td><td>${esc(g.equipo)}</td><td><button class="pbs-btn" data-borrar-gw="${i}">Quitar</button></td></tr>`).join('') || '<tr><td colspan="5">No hay puertas de enlace.</td></tr>'}</tbody></table>`, 'Configuración › Puertas de enlace');
    c.querySelector('[data-instalar]').onclick = () => dialogo('Instalar la puerta de enlace de datos local', `<label>Nombre<input data-f="nombre" value="Puerta de enlace de alumno"></label><label>Modo<select data-f="modo"><option>Estándar</option><option>Personal</option></select></label><label>Computadora<input data-f="equipo" value="PC-OFICINA-01"></label><p class="pbs-ayuda">Paso a paso real: descargar → instalar → iniciar sesión con la cuenta de trabajo → "Registrar una nueva puerta de enlace" → clave de recuperación (guárdala) → listo.</p>`, (f) => { d.puertas.push({ id: id('g'), nombre: f.nombre.trim() || 'Puerta de enlace', modo: f.modo, equipo: f.equipo, estado: 'En línea' }); guardar(); render(); toast('Puerta de enlace en línea. Asígnala al modelo semántico en Configuración → Conexión de puerta de enlace.', 6000); });
    c.querySelectorAll('[data-borrar-gw]').forEach((b) => (b.onclick = () => { d.puertas.splice(Number(b.dataset.borrarGw), 1); guardar(); render(); }));
  }

  // ---------------------------------------------------------------- compartir, acceso, configuración, apps
  function dialogoCompartir(x) {
    dialogo(`Enviar vínculo: ${x.nombre}`, `<label>Para<input data-f="emails" placeholder="ana@empresa.com, luis@empresa.com"></label><label>El vínculo funciona para<select data-f="alcance"><option>Personas de tu organización</option><option>Personas con acceso existente</option><option>Personas específicas</option></select></label><label class="pbs-sw"><input type="checkbox" data-f="recomp"> Permitir que los destinatarios compartan este informe</label><label class="pbs-sw"><input type="checkbox" data-f="compilar"> Permitir que creen contenido con los datos del modelo (permiso de compilación)</label>
      ${(x.compartido || []).length ? `<h4>Con acceso</h4><ul class="pbs-lista">${x.compartido.map((c) => `<li>${esc(c.email)} · ${esc(c.permisos)}</li>`).join('')}</ul>` : ''}<p class="pbs-ayuda">Compartir sirve para pocas personas. Para muchas, conviene una <b>app</b>; para trabajar en equipo, un rol en el <b>área de trabajo</b>.</p>`, (f) => {
      const emails = f.emails.split(/[,;\s]+/).filter(Boolean); if (!emails.length) return 'Escribe al menos un correo (ficticio).';
      if (emails.some((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) return 'Hay un correo inválido.';
      x.compartido = x.compartido || []; for (const e of emails) x.compartido.push({ email: e, permisos: ['Lectura', f.recomp ? 'volver a compartir' : '', f.compilar ? 'compilación' : ''].filter(Boolean).join(' + ') }); guardar(); toast(`Vínculo enviado a ${emails.length} persona(s) (simulado).`);
    }, 'Enviar');
  }
  function dialogoAcceso(w) {
    dialogo(`Administrar acceso: ${w.nombre}`, `<ul class="pbs-lista">${w.acceso.map((a, i) => `<li>${esc(a.email)} <select data-rol="${i}">${ROLES.map((r) => `<option ${a.rol === r ? 'selected' : ''}>${r}</option>`).join('')}</select>${a.email === YO ? '' : `<button class="pbs-ib" data-quitar-acc="${i}">✕</button>`}</li>`).join('')}</ul>
      <label>Agregar personas o grupos<input data-f="email" placeholder="persona@empresa.com"></label><label>Rol<select data-f="rol">${ROLES.map((r) => `<option ${r === 'Visor' ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <table class="pbs-kv pbs-roles"><tr><th>Administrador</th><td>Todo, incluido agregar o quitar personas y borrar el área de trabajo.</td></tr><tr><th>Miembro</th><td>Publicar y editar contenido, compartir, crear apps; puede agregar Colaboradores y Visores.</td></tr><tr><th>Colaborador</th><td>Publicar y editar contenido; no comparte ni administra.</td></tr><tr><th>Visor</th><td>Solo ver e interactuar. Es el único rol al que se le aplica la seguridad por filas (RLS).</td></tr></table>`, (f, dlg) => {
      dlg.querySelectorAll('[data-rol]').forEach((s) => { w.acceso[Number(s.dataset.rol)].rol = s.value; });
      if (f.email.trim()) { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return 'Correo inválido.'; w.acceso.push({ email: f.email.trim(), rol: f.rol }); }
      guardar(); toast('Acceso actualizado.');
    }, 'Guardar', (dlg) => dlg.querySelectorAll('[data-quitar-acc]').forEach((b) => (b.onclick = () => { w.acceso.splice(Number(b.dataset.quitarAcc), 1); guardar(); b.closest('li').remove(); })));
  }
  function dialogoConfig(x) {
    dialogo(`Configuración: ${x.nombre}`, `<label>Etiqueta de confidencialidad<select data-f="etiqueta">${ETIQUETAS.map((e) => `<option value="${e}" ${x.etiqueta === e ? 'selected' : ''}>${e || '(ninguna)'}</option>`).join('')}</select></label><label>Aval<select data-f="aval"><option value="" ${!x.aval ? 'selected' : ''}>Ninguno</option><option ${x.aval === 'Promovido' ? 'selected' : ''}>Promovido</option><option ${x.aval === 'Certificado' ? 'selected' : ''}>Certificado</option></select></label><p class="pbs-ayuda"><b>Promovido</b>: quien lo creó dice que está listo para que otros lo usen. <b>Certificado</b>: un revisor autorizado de la organización comprobó que cumple los estándares de calidad. La <b>etiqueta de confidencialidad</b> (Microsoft Purview) acompaña al dato aunque se exporte a Excel o PDF.</p>`, (f) => { x.etiqueta = f.etiqueta; x.aval = f.aval; guardar(); render(); });
  }
  function dialogoApp(w) {
    const cont = w.items.filter((x) => x.tipo === 'informe' || x.tipo === 'panel');
    const app = D().apps.find((a) => a.ws === w.id);
    dialogo(app ? `Actualizar app: ${app.nombre}` : 'Crear app', `<label>Nombre<input data-f="nombre" value="${esc(app ? app.nombre : w.nombre)}"></label><label>Descripción<textarea data-f="desc" rows="2">${esc(app ? app.desc : '')}</textarea></label><label>Contenido</label><div class="pbs-dest">${cont.map((x) => `<label class="pbs-dest-i"><input type="checkbox" data-cont value="${x.id}" ${!app || app.contenido.includes(x.id) ? 'checked' : ''}> ${fl(ICO_T[x.tipo])} ${esc(x.nombre)}</label>`).join('')}</div><label>Audiencia<input data-f="audiencia" value="${esc(app ? app.audiencia : 'Toda la organización')}"></label><p class="pbs-ayuda">Una app es la forma recomendada de distribuir contenido a muchas personas: ven una versión estable aunque el equipo siga editando el área de trabajo, hasta que se publica la actualización de la app.</p>`, (f, dlg) => {
      const sel = [...dlg.querySelectorAll('[data-cont]:checked')].map((x) => x.value); if (!sel.length) return 'Elige al menos un informe o panel.';
      if (app) Object.assign(app, { nombre: f.nombre, desc: f.desc, audiencia: f.audiencia, contenido: sel, actualizado: ahora() }); else D().apps.push({ id: id('a'), ws: w.id, nombre: f.nombre || w.nombre, desc: f.desc, audiencia: f.audiencia, contenido: sel, actualizado: ahora() });
      guardar(); toast(app ? 'App actualizada.' : 'App publicada.'); location.hash = ruta('apps');
    }, app ? 'Actualizar app' : 'Publicar app');
  }
  function apps(aid, cid) {
    const d = D();
    if (!aid) { marco(`<h1>Apps</h1><p class="pbs-dim">Las apps que publicaron tus áreas de trabajo.</p>${d.apps.length ? `<div class="pbs-tarjetas">${d.apps.map((a) => `<a class="pbs-tarjeta" href="${ruta('apps', a.id)}">${fl('apps_add_in')}<b>${esc(a.nombre)}</b><small>${esc(a.desc || '')} · ${a.contenido.length} elemento(s) · ${esc(a.audiencia)}</small></a>`).join('')}</div>` : '<div class="pbs-vacio">No hay apps. Créalas desde un área de trabajo compartida (botón Crear app).</div>'}`, 'Apps'); return; }
    const a = d.apps.find((x) => x.id === aid); if (!a) { marco('<div class="pbs-vacio">La app no existe.</div>'); return; }
    const w = ws(a.ws); const elems = a.contenido.map((c) => item(w, c)).filter(Boolean); const actual = elems.find((x) => x.id === cid) || elems[0];
    const c = marco(`<div class="pbs-app"><aside class="pbs-app-nav"><b>${esc(a.nombre)}</b>${elems.map((x) => `<a class="${x === actual ? 'on' : ''}" href="${ruta('apps', a.id, x.id)}">${fl(ICO_T[x.tipo])} ${esc(x.nombre)}</a>`).join('')}</aside><div class="pbs-app-c" id="pbsApp"></div></div>`, `Apps › ${esc(a.nombre)}`);
    if (!actual) return;
    if (actual.tipo === 'informe') window.PowerBI.verPublicado(c.querySelector('#pbsApp'), ctx, actual.foto, {});
    else c.querySelector('#pbsApp').innerHTML = `<div class="pbs-mos">${actual.mosaicos.map((t) => `<div class="pbs-mosaico ${t.ancho === 2 ? 'ancho' : ''}"><div class="pbs-mos-t">${esc(t.titulo)}</div><div class="pbs-mos-c">${t.html}</div></div>`).join('')}</div>`;
  }

  // ---------------------------------------------------------------- canalizaciones de implementación
  function pipelines() {
    const d = D(); const etapas = ['Desarrollo', 'Prueba', 'Producción'];
    const c = marco(`<div class="pbs-tit"><h1>${fl('arrow_routing')} Canalizaciones de implementación</h1><button class="pbs-btn pbs-btn-p" data-nueva>Crear una canalización</button></div>
      <p class="pbs-dim">Una canalización copia el contenido de un área de trabajo de <b>Desarrollo</b> a una de <b>Prueba</b> y después a <b>Producción</b>, para que nadie edite directamente lo que usa toda la empresa. Requiere áreas de trabajo en una capacidad (Premium o Fabric).</p>
      ${d.pipelines.map((p, i) => `<div class="pbs-pipe"><h3>${esc(p.nombre)}</h3><div class="pbs-pipe-e">${etapas.map((e, k) => { const w = ws(p.etapas[k]); return `<div class="pbs-etapa"><b>${e}</b>${w ? `<a href="${ruta('ws', w.id)}">${esc(w.nombre)}</a><small>${w.items.length} elemento(s)</small>` : `<select data-asignar="${i}|${k}"><option value="">Asignar un área de trabajo…</option>${d.ws.filter((x) => !x.personal && /Premium|Fabric/.test(x.licencia)).map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('')}</select>`}${k < 2 && w ? `<button class="pbs-btn" data-implementar="${i}|${k}">Implementar → ${etapas[k + 1]}</button>` : ''}</div>`; }).join('<span class="pbs-lin-f">→</span>')}</div></div>`).join('') || '<div class="pbs-vacio">No hay canalizaciones.</div>'}`, 'Canalizaciones');
    c.querySelector('[data-nueva]').onclick = () => dialogo('Crear una canalización', '<label>Nombre<input data-f="nombre" value="Ventas"></label>', (f) => { d.pipelines.push({ id: id('p'), nombre: f.nombre || 'Canalización', etapas: [null, null, null] }); guardar(); render(); });
    c.querySelectorAll('[data-asignar]').forEach((s) => (s.onchange = () => { if (!s.value) return; const [i, k] = s.dataset.asignar.split('|').map(Number); d.pipelines[i].etapas[k] = s.value; guardar(); render(); }));
    c.querySelectorAll('[data-implementar]').forEach((b) => (b.onclick = () => {
      const [i, k] = b.dataset.implementar.split('|').map(Number); const p = d.pipelines[i]; const de = ws(p.etapas[k]); let a = ws(p.etapas[k + 1]);
      if (!a) { toast(`Asigna primero un área de trabajo a ${etapas[k + 1]}.`); return; }
      const mapa = {}; for (const x of de.items) { const copia = JSON.parse(JSON.stringify(x)); const previo = a.items.find((y) => y.tipo === x.tipo && y.nombre === x.nombre); copia.id = previo ? previo.id : id(x.tipo[0]); mapa[x.id] = copia.id; if (previo) a.items[a.items.indexOf(previo)] = copia; else a.items.push(copia); }
      for (const x of a.items) if (x.modeloId && mapa[x.modeloId]) x.modeloId = mapa[x.modeloId];
      guardar(); render(); toast(`Implementado: ${de.items.length} elemento(s) de ${etapas[k]} a ${etapas[k + 1]}.`); void a; a = null;
    }));
  }

  // ---------------------------------------------------------------- utilidades de UI
  function dialogo(titulo, html, alAceptar, txtOk = 'Aceptar', alAbrir) {
    const f = document.createElement('div'); f.className = 'pbs-capa';
    f.innerHTML = `<div class="pbs-dlg"><h3>${esc(titulo)}</h3>${html}<div class="pbs-err" hidden></div><div class="pbs-dlg-pie"><button class="pbs-btn pbs-btn-p" data-ok>${esc(txtOk)}</button><button class="pbs-btn" data-x>Cancelar</button></div></div>`;
    document.body.appendChild(f);
    f.querySelector('[data-x]').onclick = () => f.remove(); f.addEventListener('click', (e) => { if (e.target === f) f.remove(); });
    if (alAbrir) alAbrir(f);
    f.querySelector('[data-ok]').onclick = () => {
      const v = {}; f.querySelectorAll('[data-f]').forEach((x) => { v[x.dataset.f] = x.type === 'checkbox' ? x.checked : x.value; });
      const err = alAceptar(v, f); if (err) { const e = f.querySelector('.pbs-err'); e.hidden = false; e.textContent = err; return; } f.remove();
    };
    const p = f.querySelector('input, select'); if (p) p.focus();
  }
  function menu(el, items, fn) {
    const prev = document.querySelector('.pbs-menu'); if (prev) prev.remove();
    const r = el.getBoundingClientRect(); const m = document.createElement('div'); m.className = 'pbs-menu';
    m.innerHTML = items.map(([k, t]) => `<div data-k="${k}">${esc(t)}</div>`).join(''); document.body.appendChild(m);
    m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 8) + 'px'; m.style.top = (r.bottom + 2) + 'px';
    setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', f); } }), 0);
    m.onclick = (e) => { const o = e.target.closest('[data-k]'); if (o) { m.remove(); fn(o.dataset.k); } };
  }

  // ---------------------------------------------------------------- enrutado
  let sub = [];
  function render() {
    document.body.classList.add('pb-abierto');
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
    const [a, b, c, d2] = sub;
    if (!a) return inicio();
    if (a === 'examinar') return examinar();
    if (a === 'apps') return apps(b, c);
    if (a === 'pipelines') return pipelines();
    if (a === 'puertas') return puertas();
    if (a === 'ws' && !b) return listaWs();
    if (a === 'ws') {
      const w = ws(b); if (!w) { marco('<div class="pbs-vacio">El área de trabajo no existe.</div>'); return; }
      if (!c) return areaTrabajo(w, q.get('vista'));
      const x = item(w, d2); if (!x) { marco('<div class="pbs-vacio">El elemento no existe.</div>', migasWs(w)); return; }
      if (c === 'informe') return informe(w, x);
      if (c === 'panel') return panel(w, x);
      if (c === 'modelo') return modelo(w, x, q.get('tab') || 'actualizacion');
    }
    marco('<div class="pbs-vacio">Página no encontrada.</div>');
  }
  function vista(m, c, s) {
    main = m; ctx = c; Store = c.Store; toast = c.toast; sub = (s || []).map((x) => decodeURIComponent(x.split('?')[0]));
    render();
  }
  window.PBIServicio = { vista, publicar, _: { D, actualizarModelo } };
})();
