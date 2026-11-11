/* Portal de Azure de práctica — en el navegador, sin cuenta real.
 *
 * Reproduce la forma de trabajar del portal según la documentación pública de Microsoft Learn:
 * inicio con servicios, menú del portal, búsqueda, asistentes "Create" con pestañas (Basics, …,
 * Review + create) y las reglas de nombres oficiales, despliegues con notificaciones, la plantilla
 * ARM de cada creación, hojas de recursos con Essentials, Access control (IAM), Tags, Locks y
 * Activity log, Storage (contenedores, blobs, claves, SAS, ciclo de vida), Key Vault (secretos con
 * RBAC), Azure Databricks (Launch Workspace abre el Databricks de práctica), Data Factory, costos y
 * presupuestos, y Cloud Shell con la terminal del curso.
 *
 * El estado es el mismo de la CLI simulada `az` (Machine.cloud.az): lo que creas con
 * `az group create` aparece en el portal y lo que creas en el portal aparece en `az resource list`.
 * Los íconos son genéricos (no son los de Microsoft) y los precios son de práctica.
 */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n) => `<i class="codicon codicon-${n}"></i>`;
  const uid = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  const ahora = () => new Date().toISOString();
  const hora = (iso) => { try { return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso; } };
  const USUARIO = 'alumno@academia.dev';
  const SUBS = [{ id: '1111aaaa-1111-4111-8111-111111111111', name: 'sub-datos-dev' }, { id: '2222bbbb-2222-4222-8222-222222222222', name: 'sub-datos-prod' }];
  const TENANT = '9999ffff-0000-4000-8000-000000000000';
  const REGIONES = [['eastus', 'East US'], ['eastus2', 'East US 2'], ['brazilsouth', 'Brazil South'], ['mexicocentral', 'Mexico Central'], ['chilecentral', 'Chile Central'], ['southcentralus', 'South Central US'], ['centralus', 'Central US'], ['westus2', 'West US 2'], ['canadacentral', 'Canada Central'], ['westeurope', 'West Europe'], ['northeurope', 'North Europe'], ['uksouth', 'UK South']];
  const regionNombre = (k) => (REGIONES.find((r) => r[0] === k) || [k, k])[1];

  let main = null, Store = null, toast = () => {};
  const az = () => window.CloudSim.az();
  const guardarAz = () => { try { window.CloudSim.save(); } catch (e) { /* sin terminal */ } };
  const portal = () => { const p = Store.data.azPortal; if (p && p.v === 1) return p; return (Store.data.azPortal = { v: 1, recientes: [], notif: [], presupuestos: [], favoritos: ['grupos', 'recursos', 'storage', 'dbw', 'kv', 'adf', 'costos', 'suscripciones'] }); };
  const guardarP = () => { try { Store.saveSoon ? Store.saveSoon() : Store.save(); } catch (e) { /* nada */ } };
  const ir = (r) => { location.hash = '#/azure/' + r; };
  const sub = () => SUBS.find((s) => s.id === az().sub) || SUBS[0];
  const rgId = (rg) => `/subscriptions/${sub().id}/resourceGroups/${rg}`;

  // ------------------------------------------------------------------ íconos de servicios (genéricos)
  const SVG = {
    grupo: '<svg viewBox="0 0 18 18"><rect x="1" y="1" width="16" height="16" rx="2" fill="#0078d4" opacity=".15" stroke="#0078d4"/><rect x="4" y="4" width="4" height="4" fill="#0078d4"/><rect x="10" y="4" width="4" height="4" fill="#5ea0ef"/><rect x="4" y="10" width="4" height="4" fill="#5ea0ef"/><rect x="10" y="10" width="4" height="4" fill="#0078d4"/></svg>',
    storage: '<svg viewBox="0 0 18 18"><rect x="1" y="3" width="16" height="12" rx="1.5" fill="#37c2b1"/><rect x="3" y="5" width="12" height="2" fill="#fff" opacity=".9"/><rect x="3" y="8" width="12" height="2" fill="#fff" opacity=".7"/><rect x="3" y="11" width="12" height="2" fill="#fff" opacity=".5"/></svg>',
    kv: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="#ffb900"/><circle cx="7" cy="8" r="2.4" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M8.8 9.2 L13 13.2 M11.4 11.6 L12.6 10.4" stroke="#fff" stroke-width="1.6" fill="none"/></svg>',
    dbw: '<svg viewBox="0 0 18 18"><path d="M9 1 L17 5.5 L9 10 L1 5.5 Z" fill="#ff3621"/><path d="M1 8.5 L9 13 L17 8.5 M1 11.5 L9 16 L17 11.5" stroke="#ff3621" stroke-width="1.6" fill="none"/></svg>',
    adf: '<svg viewBox="0 0 18 18"><path d="M1 16 V8 L5 10.5 V8 L9 10.5 V8 L13 10.5 V3 H17 V16 Z" fill="#0078d4"/><rect x="3" y="12" width="2" height="2" fill="#fff"/><rect x="7" y="12" width="2" height="2" fill="#fff"/><rect x="11" y="12" width="2" height="2" fill="#fff"/></svg>',
    eh: '<svg viewBox="0 0 18 18"><rect x="1" y="2" width="16" height="14" rx="2" fill="#8661c5"/><path d="M4 6 H14 M4 9 H14 M4 12 H14" stroke="#fff" stroke-width="1.4"/></svg>',
    sub: '<svg viewBox="0 0 18 18"><path d="M3 2 H15 V16 L9 12 L3 16 Z" fill="#ffb900"/><circle cx="9" cy="7" r="2" fill="#fff"/></svg>',
    costo: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="#107c10"/><text x="9" y="13" font-size="11" text-anchor="middle" fill="#fff" font-family="Segoe UI">$</text></svg>',
    crear: '<svg viewBox="0 0 18 18"><path d="M9 2 V16 M2 9 H16" stroke="#0078d4" stroke-width="2.2"/></svg>',
    todos: '<svg viewBox="0 0 18 18"><rect x="1" y="1" width="7" height="7" fill="#5ea0ef"/><rect x="10" y="1" width="7" height="7" fill="#0078d4"/><rect x="1" y="10" width="7" height="7" fill="#0078d4"/><rect x="10" y="10" width="7" height="7" fill="#5ea0ef"/></svg>',
    monitor: '<svg viewBox="0 0 18 18"><path d="M1 12 L5 8 L8 11 L12 5 L17 9" stroke="#0078d4" stroke-width="2" fill="none"/></svg>',
    entra: '<svg viewBox="0 0 18 18"><path d="M9 1 L16 5 V13 L9 17 L2 13 V5 Z" fill="#0078d4"/><circle cx="9" cy="8" r="2.5" fill="#fff"/><path d="M5 14 C6 11 12 11 13 14" fill="#fff"/></svg>',
    actividad: '<svg viewBox="0 0 18 18"><rect x="2" y="2" width="14" height="14" rx="2" fill="#0078d4"/><path d="M5 6 H13 M5 9 H13 M5 12 H10" stroke="#fff" stroke-width="1.4"/></svg>',
  };
  const svg = (k, t = 18) => `<span class="az-ico" style="width:${t}px;height:${t}px">${SVG[k] || SVG.todos}</span>`;

  // ------------------------------------------------------------------ tipos de recursos (comparten estado con az)
  const TIPOS = {
    storage: { tipo: 'Microsoft.Storage/storageAccounts', nombre: 'Storage account', plural: 'Storage accounts', costoDia: 0.06, crear: 'storage' },
    kv: { tipo: 'Microsoft.KeyVault/vaults', nombre: 'Key vault', plural: 'Key vaults', costoDia: 0.01, crear: 'kv' },
    dbw: { tipo: 'Microsoft.Databricks/workspaces', nombre: 'Azure Databricks Service', plural: 'Azure Databricks', costoDia: 0, crear: 'dbw' },
    adf: { tipo: 'Microsoft.DataFactory/factories', nombre: 'Data factory (V2)', plural: 'Data factories', costoDia: 0.03, crear: 'adf' },
    eh: { tipo: 'Microsoft.EventHub/namespaces', nombre: 'Event Hubs Namespace', plural: 'Event Hubs', costoDia: 0.74, crear: null },
  };
  const recursos = () => { const s = az(); const out = []; for (const k of Object.keys(TIPOS)) for (const [n, r] of Object.entries(s[k] || {})) out.push({ k, n, r, d: TIPOS[k] }); return out; };
  const idRecurso = (k, n, r) => `${rgId(r.rg)}/providers/${TIPOS[k].tipo}/${n}`;
  const actividad = (op, recurso, estado = 'Succeeded', extra = {}) => { const s = az(); s.actividad = s.actividad || []; s.actividad.unshift({ t: ahora(), op, recurso, estado, quien: USUARIO, ...extra }); s.actividad = s.actividad.slice(0, 300); };
  const notificar = (titulo, texto, tipo = 'info', enlace = null) => { const P = portal(); P.notif.unshift({ id: uid(6), t: ahora(), titulo, texto, tipo, enlace, nueva: true }); P.notif = P.notif.slice(0, 40); guardarP(); pintarCampana(); if (tipo !== 'progreso') toast(`${titulo}`); };
  const reciente = (nombre, tipo, ruta) => { const P = portal(); P.recientes = [{ nombre, tipo, ruta, t: ahora() }, ...P.recientes.filter((r) => r.ruta !== ruta)].slice(0, 20); guardarP(); };

  // ------------------------------------------------------------------ RBAC y bloqueos
  const ROLES = [
    ['Owner', 'Privileged', 'Acceso completo para administrar todos los recursos, incluida la asignación de roles.'],
    ['Contributor', 'Privileged', 'Administra todos los recursos, pero no puede asignar roles.'],
    ['Reader', 'Job function', 'Ve todos los recursos, pero no puede cambiar nada.'],
    ['User Access Administrator', 'Privileged', 'Administra el acceso de los usuarios a los recursos.'],
    ['Storage Account Contributor', 'Job function', 'Administra cuentas de almacenamiento (no da acceso a los datos).'],
    ['Storage Blob Data Owner', 'Job function', 'Acceso total a contenedores y blobs, incluido POSIX en ADLS Gen2.'],
    ['Storage Blob Data Contributor', 'Job function', 'Lee, escribe y borra contenedores y blobs.'],
    ['Storage Blob Data Reader', 'Job function', 'Lee contenedores y blobs.'],
    ['Key Vault Administrator', 'Job function', 'Todas las operaciones del plano de datos de un key vault.'],
    ['Key Vault Secrets Officer', 'Job function', 'Cualquier acción sobre los secretos, salvo administrar permisos.'],
    ['Key Vault Secrets User', 'Job function', 'Lee el contenido de los secretos.'],
    ['Key Vault Reader', 'Job function', 'Lee metadatos del vault y de sus objetos, no los valores.'],
    ['Data Factory Contributor', 'Job function', 'Crea y administra data factories y sus recursos hijos.'],
  ];
  const PRINCIPALES_BASE = [[USUARIO, 'User', 'Alumno Academia (tú)'], ['ana.datos@academia.dev', 'User', 'Ana Datos'], ['ingenieros-datos', 'Group', 'Grupo de ingeniería de datos'], ['sp-pipeline-adf', 'ServicePrincipal', 'Service principal de los pipelines'], ['adb-access-connector', 'ManagedIdentity', 'Identidad administrada de Databricks (Access Connector)']];
  // cada data factory tiene su identidad administrada (system-assigned): se le asignan roles como a cualquier principal
  const extBlade = (box, o) => { const f = (window.AzurePortal.ext || {}).blade; return !!(f && f(box, o)); };
  const principales = () => [...PRINCIPALES_BASE, ...(((window.AzurePortal || {}).ext || {}).principales ? window.AzurePortal.ext.principales() : []), ...Object.keys(az().adf || {}).map((n) => [n, 'ManagedIdentity', `Data factory ${n} (identidad administrada)`])];
  // el alumno es Owner de la suscripción (como quien crea una cuenta de prueba)
  const asignaciones = () => [{ principalName: USUARIO, roleDefinitionName: 'Owner', scope: `/subscriptions/${sub().id}`, id: 'propietario', implicita: true }, ...(az().roles || [])];
  const tieneRol = (scope, roles, quien = USUARIO) => asignaciones().some((a) => a.principalName === quien && roles.includes(a.roleDefinitionName) && (scope === a.scope || scope.startsWith(a.scope + '/')));
  const bloqueos = () => { const s = az(); s.locks = s.locks || []; return s.locks; };
  const bloqueado = (scope, nivel = null) => bloqueos().find((l) => (scope === l.scope || scope.startsWith(l.scope + '/')) && (!nivel || l.nivel === nivel));

  // ------------------------------------------------------------------ marco del portal
  const MENU = [['crear', 'crear', 'Create a resource'], ['', 'todos', 'Home'], ['servicios', 'todos', 'All services'], ['#FAVORITES'], ['recursos', 'todos', 'All resources'], ['grupos', 'grupo', 'Resource groups'], ['servicio/storage', 'storage', 'Storage accounts'], ['servicio/dbw', 'dbw', 'Azure Databricks'], ['servicio/kv', 'kv', 'Key vaults'], ['servicio/adf', 'adf', 'Data factories'], ['costos', 'costo', 'Cost Management'], ['suscripciones', 'sub', 'Subscriptions'], ['actividad', 'actividad', 'Activity log'], ['entra', 'entra', 'Microsoft Entra ID'], ['monitor', 'monitor', 'Monitor']];
  function marco() {
    document.body.classList.add('az-abierto');
    main.innerHTML = `<div class="azp" id="azp">
      <header class="az-top"><button class="az-tb" id="azMenuB" title="Show portal menu">${ic('menu')}</button><a class="az-marca" href="#/azure">Microsoft Azure <span>práctica</span></a>
        <div class="az-buscar"><span>${ic('search')}</span><input id="azQ" placeholder="Search resources, services, and docs (G+/)" autocomplete="off"><div class="az-buscar-res" id="azQR" hidden></div></div>
        <div class="az-top-der"><button class="az-tb" id="azShellB" title="Cloud Shell">${ic('terminal')}</button><button class="az-tb" id="azNotB" title="Notifications">${ic('bell')}<b class="az-badge" id="azBadge" hidden></b></button><button class="az-tb" title="Settings (simulado)">${ic('gear')}</button><a class="az-tb" href="https://learn.microsoft.com/azure/azure-portal/" target="_blank" rel="noopener" title="Help + support">${ic('question')}</a>
        <button class="az-cuenta" id="azCuenta"><span><b>${USUARIO}</b><small>ACADEMIA (DEFAULT DIRECTORY)</small></span><i>AA</i></button></div></header>
      <div class="az-cuerpo"><main class="az-main" id="azMain"></main></div>
      <aside class="az-menu" id="azMenu" hidden><div class="az-menu-in">${MENU.map((m) => (m[0][0] === '#' ? `<div class="az-menu-sec">${esc(m[0].slice(1))}</div>` : `<a href="#/azure/${m[0]}">${svg(m[1])}<span>${esc(m[2])}</span></a>`)).join('')}<a href="#/" class="az-menu-salir">${ic('arrow-left')}<span>Volver al curso</span></a></div></aside>
      <aside class="az-flyout" id="azNot" hidden></aside>
      <section class="az-shell" id="azShell" hidden></section>
      <div class="az-capa" id="azCapa" hidden></div>
    </div>`;
    const $ = (q) => main.querySelector(q);
    $('#azMenuB').onclick = () => { $('#azMenu').hidden = !$('#azMenu').hidden; };
    $('#azMenu').onclick = (e) => { if (e.target === $('#azMenu') || e.target.closest('a')) $('#azMenu').hidden = true; };
    $('#azNotB').onclick = () => { const f = $('#azNot'); f.hidden = !f.hidden; if (!f.hidden) pintarNotif(); };
    $('#azShellB').onclick = () => cloudShell();
    $('#azCuenta').onclick = (e) => menu(e.currentTarget, [{ ic: 'account', txt: `${USUARIO}`, des: true }, { ic: 'key', txt: `Subscription: ${sub().name}`, des: true }, '-', { ic: 'arrow-swap', txt: 'Cambiar de suscripción', fn: () => { const s = az(); s.sub = SUBS.find((x) => x.id !== s.sub).id; guardarAz(); toast('Suscripción: ' + sub().name); render(actual); } }, { ic: 'arrow-left', txt: 'Volver al curso', fn: () => { location.hash = '#/'; } }, '-', { ic: 'trash', txt: 'Borrar todo lo creado en Azure (práctica)…', fn: reiniciar }], 'der');
    buscar();
    pintarCampana();
  }
  function reiniciar() {
    if (!confirm('¿Borrar todos los grupos de recursos y recursos de Azure de la práctica? También se borran para la CLI az.')) return;
    const M = window.Shell && window.Shell.Machine; if (M && M.cloud) { delete M.cloud.az; guardarAz(); }
    Store.data.azPortal = null; guardarP(); toast('Azure de práctica reiniciado'); ir('');
  }
  function pintarCampana() { const b = main && main.querySelector('#azBadge'); if (!b) return; const n = portal().notif.filter((x) => x.nueva).length; b.hidden = !n; b.textContent = n; }
  function pintarNotif() {
    const P = portal(); P.notif.forEach((x) => { x.nueva = false; }); guardarP(); pintarCampana();
    const f = main.querySelector('#azNot');
    f.innerHTML = `<div class="az-fly-cab"><h3>Notifications</h3><button class="az-tb2" id="azNotX">${ic('close')}</button></div><div class="az-fly-acc"><button class="az-link" id="azNotB2">Dismiss all</button></div>${P.notif.length ? P.notif.map((n) => `<div class="az-not ${n.tipo}"><div class="az-not-ic">${n.tipo === 'ok' ? ic('pass-filled') : n.tipo === 'error' ? ic('error') : n.tipo === 'progreso' ? '<span class="az-gira"></span>' : ic('info')}</div><div><b>${esc(n.titulo)}</b><p>${esc(n.texto)}</p>${n.enlace ? `<a href="#/azure/${n.enlace[1]}">${esc(n.enlace[0])}</a>` : ''}<small>${hora(n.t)}</small></div></div>`).join('') : '<p class="az-dim" style="padding:16px">No new notifications</p>'}`;
    f.querySelector('#azNotX').onclick = () => { f.hidden = true; };
    f.querySelector('#azNotB2').onclick = () => { P.notif = []; guardarP(); pintarNotif(); };
    f.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { f.hidden = true; }));
  }
  function menu(ancla, items, lado = 'izq') {
    const prev = document.getElementById('azMenuPop'); if (prev) prev.remove();
    const r = ancla.getBoundingClientRect(); const m = document.createElement('div'); m.id = 'azMenuPop'; m.className = 'az-pop';
    m.innerHTML = items.map((x, i) => (x === '-' ? '<hr>' : `<button data-i="${i}" ${x.des ? 'disabled' : ''} class="${x.peligro ? 'peligro' : ''}">${x.ic ? ic(x.ic) : ''}<span>${esc(x.txt)}</span></button>`)).join('');
    document.body.appendChild(m);
    let x = lado === 'der' ? r.right - m.offsetWidth : r.left; if (x + m.offsetWidth > innerWidth - 8) x = innerWidth - m.offsetWidth - 8; if (x < 8) x = 8;
    let y = r.bottom + 2; if (y + m.offsetHeight > innerHeight - 8) y = Math.max(8, r.top - m.offsetHeight - 2);
    m.style.left = x + 'px'; m.style.top = y + 'px';
    m.onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; m.remove(); const it = items[Number(b.dataset.i)]; if (it.fn) it.fn(); };
    setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', f); } }), 0);
  }
  // panel lateral (como los "context panes" del portal) o diálogo de confirmación
  function panel({ titulo, cuerpo, ok = 'OK', cancelar = 'Cancel', alOk, alAbrir, ancho = 460, peligro = false }) {
    const capa = main.querySelector('#azCapa'); capa.hidden = false;
    capa.innerHTML = `<div class="az-panel" style="width:min(${ancho}px, 100vw)"><div class="az-panel-cab"><h2>${esc(titulo)}</h2><button class="az-tb2" data-x>${ic('close')}</button></div><div class="az-panel-cuerpo">${cuerpo}</div><div class="az-err" hidden></div><div class="az-panel-pie">${ok ? `<button class="az-btn ${peligro ? 'peligro' : 'primario'}" data-ok>${esc(ok)}</button>` : ''}<button class="az-btn" data-x>${esc(cancelar)}</button></div></div>`;
    const p = capa.firstElementChild; const cerrar = () => { capa.hidden = true; capa.innerHTML = ''; };
    capa.onclick = (e) => { if (e.target === capa || e.target.closest('[data-x]')) cerrar(); };
    const errEl = p.querySelector('.az-err'); const error = (m) => { errEl.hidden = !m; errEl.textContent = m || ''; };
    const b = p.querySelector('[data-ok]'); if (b) b.onclick = async () => { try { if ((await alOk(p, error)) !== false) cerrar(); } catch (e) { error(e.message); } };
    if (alAbrir) alAbrir(p);
    const f = p.querySelector('input:not([type=checkbox]):not([type=radio]), select, textarea'); if (f) setTimeout(() => f.focus(), 30);
    return p;
  }

  // ------------------------------------------------------------------ búsqueda
  const SERVICIOS = [['Resource groups', 'grupos', 'grupo'], ['All resources', 'recursos', 'todos'], ['Storage accounts', 'servicio/storage', 'storage'], ['Azure Databricks', 'servicio/dbw', 'dbw'], ['Key vaults', 'servicio/kv', 'kv'], ['Data factories', 'servicio/adf', 'adf'], ['Event Hubs', 'servicio/eh', 'eh'], ['Cost Management', 'costos', 'costo'], ['Subscriptions', 'suscripciones', 'sub'], ['Activity log', 'actividad', 'actividad'], ['Microsoft Entra ID', 'entra', 'entra'], ['Monitor', 'monitor', 'monitor'], ['Create a resource', 'crear', 'crear']];
  function buscar() {
    const inp = main.querySelector('#azQ'), res = main.querySelector('#azQR');
    const pintar = () => {
      const q = inp.value.trim().toLowerCase(); if (!q) { res.hidden = true; return; }
      const sv = SERVICIOS.filter((s) => s[0].toLowerCase().includes(q)).slice(0, 6);
      const rs = recursos().filter((x) => x.n.toLowerCase().includes(q)).slice(0, 8);
      const gs = Object.keys(az().groups || {}).filter((g) => g.toLowerCase().includes(q)).slice(0, 5);
      res.hidden = false;
      res.innerHTML = `${sv.length ? `<h4>Services</h4>${sv.map((s) => `<a href="#/azure/${s[1]}">${svg(s[2])} ${esc(s[0])}</a>`).join('')}` : ''}${rs.length ? `<h4>Resources</h4>${rs.map((x) => `<a href="#/azure/recurso/${x.k}/${encodeURIComponent(x.n)}">${svg(x.k)} ${esc(x.n)} <small>${esc(x.d.nombre)}</small></a>`).join('')}` : ''}${gs.length ? `<h4>Resource groups</h4>${gs.map((g) => `<a href="#/azure/grupo/${encodeURIComponent(g)}">${svg('grupo')} ${esc(g)}</a>`).join('')}` : ''}<h4>Documentation</h4><a href="https://learn.microsoft.com/search/?terms=${encodeURIComponent(q)}" target="_blank" rel="noopener">${ic('book')} Search Microsoft Learn for "${esc(q)}"</a>`;
    };
    inp.addEventListener('input', pintar); inp.addEventListener('focus', pintar);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = res.querySelector('a'); if (a) { a.click(); inp.blur(); } } if (e.key === 'Escape') inp.blur(); });
    inp.addEventListener('blur', () => setTimeout(() => { res.hidden = true; }, 160));
    res.addEventListener('mousedown', (e) => e.preventDefault());
    res.addEventListener('click', (e) => { if (e.target.closest('a')) { res.hidden = true; inp.value = ''; } });
  }

  // ------------------------------------------------------------------ rutas
  let actual = [];
  function render(subr) {
    actual = subr || [];
    if (!main.querySelector('#azp')) marco();
    const [v = '', ...r] = actual.map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } });
    const cont = main.querySelector('#azMain'); cont.scrollTop = 0;
    const V = { '': inicio, servicios: todosServicios, recursos: todosRecursos, grupos: listaGrupos, grupo: hojaGrupo, servicio: listaServicio, crear: crearRecurso, recurso: hojaRecurso, despliegue: hojaDespliegue, costos, suscripciones, suscripcion: hojaSuscripcion, actividad: registroActividad, entra: stubEntra, monitor: stubMonitor };
    const X = (window.AzurePortal.ext || {}).rutas || {}; // pantallas agregadas por azure-extra.js
    try { (X[v] || V[v] || noEncontrado)(cont, r); } catch (e) { console.error(e); cont.innerHTML = `<div class="az-pag"><div class="az-banner error">${esc(e.message)}</div></div>`; }
  }
  const noEncontrado = (cont) => { cont.innerHTML = `<div class="az-pag"><h1>Not found</h1><p>Esta página no existe en el portal de práctica. <a href="#/azure">Volver al inicio</a></p></div>`; };
  const migas = (items) => `<div class="az-migas">${items.map(([t, h], i) => (h && i < items.length - 1 ? `<a href="#/azure/${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join(`<i>${ic('chevron-right')}</i>`)}</div>`;

  // ------------------------------------------------------------------ inicio
  function inicio(cont) {
    const P = portal(); const rs = recursos();
    cont.innerHTML = `<div class="az-pag az-home"><h2>Azure services</h2>
      <div class="az-servicios">${[['crear', 'Create a resource', 'crear'], ['grupos', 'Resource groups', 'grupo'], ['servicio/storage', 'Storage accounts', 'storage'], ['servicio/dbw', 'Azure Databricks', 'dbw'], ['servicio/kv', 'Key vaults', 'kv'], ['servicio/adf', 'Data factories', 'adf'], ['costos', 'Cost Management', 'costo'], ['suscripciones', 'Subscriptions', 'sub'], ['servicios', 'More services', 'todos']].map(([h, t, k]) => `<a href="#/azure/${h}" class="az-serv">${svg(k, 32)}<span>${esc(t)}</span></a>`).join('')}</div>
      <h2>Resources</h2><div class="az-pest"><a class="on">Recent</a><a href="#/azure/recursos">All resources</a></div>
      ${P.recientes.length ? `<table class="az-tabla"><thead><tr><th>Name</th><th>Type</th><th>Last Viewed</th></tr></thead><tbody>${P.recientes.slice(0, 8).map((r) => `<tr><td><a href="#/azure/${r.ruta}">${svg(r.tipo)} ${esc(r.nombre)}</a></td><td>${esc((TIPOS[r.tipo] || {}).nombre || (r.tipo === 'grupo' ? 'Resource group' : r.tipo))}</td><td>${hora(r.t)}</td></tr>`).join('')}</tbody></table>` : `<div class="az-vacio">${svg('todos', 48)}<p>No resources have been viewed recently</p><a class="az-btn" href="#/azure/recursos">View all resources</a></div>`}
      <h2>Navigate</h2><div class="az-nav">${[['suscripciones', 'Subscriptions', 'sub'], ['grupos', 'Resource groups', 'grupo'], ['recursos', `All resources (${rs.length})`, 'todos'], ['actividad', 'Activity log', 'actividad']].map(([h, t, k]) => `<a href="#/azure/${h}">${svg(k, 22)} ${esc(t)}</a>`).join('')}</div>
      <h2>Tools</h2><div class="az-tools"><a href="https://learn.microsoft.com/training/azure/" target="_blank" rel="noopener">${svg('entra', 28)}<span><b>Microsoft Learn</b><small>Learn Azure with free online training</small></span></a><a href="#/azure/costos">${svg('costo', 28)}<span><b>Cost Management</b><small>Analyze and optimize your cloud spend</small></span></a><a href="#" id="azHomeShell">${svg('monitor', 28)}<span><b>Cloud Shell</b><small>Azure CLI en el navegador (la terminal del curso)</small></span></a></div>
      <div class="az-banner info">${ic('info')} <span>Portal de práctica: nada se crea en una suscripción real. Usa la <b>CLI az</b> desde Cloud Shell o la terminal del curso y verás los mismos recursos.</span></div></div>`;
    cont.querySelector('#azHomeShell').onclick = (e) => { e.preventDefault(); cloudShell(); };
  }
  function todosServicios(cont) {
    cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], ['All services', null]])}<h1>All services</h1><div class="az-servicios grande">${SERVICIOS.map((s) => `<a href="#/azure/${s[1]}" class="az-serv">${svg(s[2], 32)}<span>${esc(s[0])}</span></a>`).join('')}</div></div>`;
  }

  // ------------------------------------------------------------------ listas
  function filaRecurso(x) { return `<tr data-k="${x.k}" data-n="${esc(x.n)}"><td><input type="checkbox" class="az-sel"></td><td><a href="#/azure/recurso/${x.k}/${encodeURIComponent(x.n)}">${svg(x.k)} ${esc(x.n)}</a></td><td>${esc(x.d.nombre)}</td><td><a href="#/azure/grupo/${encodeURIComponent(x.r.rg)}">${esc(x.r.rg)}</a></td><td>${esc(regionNombre(x.r.location))}</td><td>${esc(sub().name)}</td></tr>`; }
  function todosRecursos(cont) {
    let filtro = '', tipo = '', rgF = '';
    const pintar = () => {
      const l = recursos().filter((x) => (!filtro || x.n.toLowerCase().includes(filtro)) && (!tipo || x.k === tipo) && (!rgF || x.r.rg === rgF));
      cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], ['All resources', null]])}<div class="az-cab"><h1>All resources</h1></div>
        <div class="az-cmd"><button data-c="crear">${ic('add')} Create</button><button data-c="ref">${ic('refresh')} Refresh</button><button data-c="borrar">${ic('trash')} Delete</button><a href="https://learn.microsoft.com/azure/azure-resource-manager/management/manage-resources-portal" target="_blank" rel="noopener">${ic('book')} Docs</a></div>
        <div class="az-filtros"><input id="fN" placeholder="Filter for any field..." value="${esc(filtro)}"><select id="fT"><option value="">Type equals all</option>${Object.entries(TIPOS).map(([k, d]) => `<option value="${k}" ${tipo === k ? 'selected' : ''}>${esc(d.nombre)}</option>`).join('')}</select><select id="fG"><option value="">Resource group equals all</option>${Object.keys(az().groups || {}).map((g) => `<option ${rgF === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></div>
        <p class="az-dim">Showing ${l.length} of ${recursos().length} records.</p>
        ${l.length ? `<table class="az-tabla"><thead><tr><th></th><th>Name</th><th>Type</th><th>Resource group</th><th>Location</th><th>Subscription</th></tr></thead><tbody>${l.map(filaRecurso).join('')}</tbody></table>` : `<div class="az-vacio">${svg('todos', 48)}<p>No resources to display</p><a class="az-btn primario" href="#/azure/crear">Create resources</a></div>`}</div>`;
      cont.querySelector('#fN').oninput = (e) => { filtro = e.target.value.toLowerCase(); const pos = e.target.selectionStart; pintar(); const n = cont.querySelector('#fN'); n.focus(); n.setSelectionRange(pos, pos); };
      cont.querySelector('#fT').onchange = (e) => { tipo = e.target.value; pintar(); };
      cont.querySelector('#fG').onchange = (e) => { rgF = e.target.value; pintar(); };
      cont.querySelector('.az-cmd').onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; if (b.dataset.c === 'crear') ir('crear'); if (b.dataset.c === 'ref') pintar(); if (b.dataset.c === 'borrar') borrarSeleccion(cont, pintar); };
    };
    pintar();
  }
  function borrarSeleccion(cont, despues) {
    const sel = [...cont.querySelectorAll('tr[data-k] .az-sel:checked')].map((c) => c.closest('tr')).map((tr) => ({ k: tr.dataset.k, n: tr.dataset.n }));
    if (!sel.length) return toast('Selecciona al menos un recurso');
    panel({ titulo: 'Delete Resources', ok: 'Delete', peligro: true, cuerpo: `<div class="az-banner aviso">${ic('warning')} Se borran ${sel.length} recurso(s). Esta acción no se puede deshacer.</div><ul>${sel.map((x) => `<li>${esc(x.n)} <small>(${esc(TIPOS[x.k].nombre)})</small></li>`).join('')}</ul><label class="az-campo"><span>Enter "delete" to confirm deletion</span><input id="dC"></label>`, alOk: (p) => { if (p.querySelector('#dC').value.trim() !== 'delete') throw new Error('Escribe "delete" para confirmar.'); for (const x of sel) borrarRecurso(x.k, x.n); despues(); } });
  }
  function borrarRecurso(k, n) {
    const s = az(); const r = s[k][n]; if (!r) return false;
    const id = idRecurso(k, n, r);
    const l = bloqueado(id, 'CanNotDelete') || bloqueado(id, 'ReadOnly');
    if (l) { notificar(`Failed to delete ${n}`, `The scope '${id}' cannot perform delete operation because following scope(s) are locked: '${l.scope}'. Please remove the lock and try again. (ScopeLocked)`, 'error'); actividad(`Delete ${TIPOS[k].nombre}`, n, 'Failed', { rg: r.rg }); return false; }
    if (k === 'dbw' && r.rgAdministrado) delete s.groups[r.rgAdministrado];
    delete s[k][n]; actividad(`Delete ${TIPOS[k].nombre}`, n, 'Succeeded', { rg: r.rg }); guardarAz();
    notificar(`Deleted ${n}`, `Se borró el recurso ${n}.`, 'ok'); return true;
  }
  function listaGrupos(cont) {
    const pintar = () => {
      const G = Object.entries(az().groups || {});
      cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], ['Resource groups', null]])}<div class="az-cab"><h1>Resource groups</h1><small>${esc(sub().name)}</small></div>
        <div class="az-cmd"><button data-c="crear">${ic('add')} Create</button><button data-c="ref">${ic('refresh')} Refresh</button></div>
        <p class="az-dim">Showing ${G.length} records.</p>
        ${G.length ? `<table class="az-tabla"><thead><tr><th>Name</th><th>Subscription</th><th>Location</th><th>Resources</th></tr></thead><tbody>${G.map(([n, g]) => `<tr><td><a href="#/azure/grupo/${encodeURIComponent(n)}">${svg('grupo')} ${esc(n)}</a>${g.administradoPor ? ' <span class="az-chip">managed</span>' : ''}</td><td>${esc(sub().name)}</td><td>${esc(regionNombre(g.location))}</td><td>${recursos().filter((x) => x.r.rg === n).length}</td></tr>`).join('')}</tbody></table>` : `<div class="az-vacio">${svg('grupo', 48)}<p>No resource groups to display</p><p class="az-dim">Un grupo de recursos es un contenedor lógico: todo recurso de Azure vive en uno. Se borran juntos.</p><button class="az-btn primario" data-c="crear">Create resource group</button></div>`}</div>`;
      cont.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { if (b.dataset.c === 'crear') ir('crear/grupo'); else pintar(); });
    };
    pintar();
  }
  function listaServicio(cont, r) {
    const k = r[0]; const d = TIPOS[k]; if (!d) return noEncontrado(cont);
    const l = recursos().filter((x) => x.k === k);
    cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], [d.plural, null]])}<div class="az-cab">${svg(k, 28)}<h1>${esc(d.plural)}</h1></div>
      <div class="az-cmd">${d.crear ? `<button data-c="crear">${ic('add')} Create</button>` : ''}<button data-c="ref">${ic('refresh')} Refresh</button><button data-c="borrar">${ic('trash')} Delete</button></div>
      ${l.length ? `<table class="az-tabla"><thead><tr><th></th><th>Name</th><th>Type</th><th>Resource group</th><th>Location</th><th>Subscription</th></tr></thead><tbody>${l.map(filaRecurso).join('')}</tbody></table>` : `<div class="az-vacio">${svg(k, 48)}<p>No ${esc(d.plural.toLowerCase())} to display</p>${d.crear ? `<button class="az-btn primario" data-c="crear">Create ${esc(d.nombre.toLowerCase())}</button>` : ''}</div>`}</div>`;
    cont.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { if (b.dataset.c === 'crear') ir('crear/' + d.crear); if (b.dataset.c === 'ref') listaServicio(cont, r); if (b.dataset.c === 'borrar') borrarSeleccion(cont, () => listaServicio(cont, r)); });
  }

  // ------------------------------------------------------------------ asistentes de creación
  const NOMBRES_TOMADOS = ['storage', 'test', 'datos', 'mystorageaccount', 'storageaccount', 'data', 'azure', 'prueba', 'kvprueba', 'keyvault', 'adf', 'datafactory'];
  const tomadoGlobal = (n) => NOMBRES_TOMADOS.includes(n.toLowerCase());
  const VALIDA = {
    grupo: (n) => (!n ? 'The value must not be empty.' : n.length > 90 ? 'Resource group names can be at most 90 characters.' : !/^[-\w._()\p{L}]+$/u.test(n) ? 'Resource group names only allow alphanumeric characters, periods, underscores, hyphens and parenthesis.' : /\.$/.test(n) ? 'Resource group names cannot end in a period.' : Object.keys(az().groups || {}).some((g) => g.toLowerCase() === n.toLowerCase()) ? `A resource group with the same name already exists in the selected subscription '${sub().name}'.` : null),
    storage: (n) => (!n ? 'The value must not be empty.' : !/^[a-z0-9]{3,24}$/.test(n) ? 'Storage account name must be between 3 and 24 characters in length and use numbers and lower-case letters only.' : az().storage[n] || tomadoGlobal(n) ? `The storage account named ${n} is already taken.` : null),
    kv: (n) => (!n ? 'The value must not be empty.' : !/^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$/.test(n) || /--/.test(n) ? 'Vault name must only contain alphanumeric characters and dashes and cannot start with a number. It must be 3-24 characters, start with a letter, end with a letter or digit, and not contain consecutive dashes.' : az().kv[n] || tomadoGlobal(n) ? `The vault name '${n}' is already in use. Vault names are globally unique.` : null),
    dbw: (n, v) => (!n ? 'The value must not be empty.' : !/^[a-zA-Z0-9_-]{3,64}$/.test(n) ? 'The workspace name must contain between 3 and 64 characters, and only letters, numbers, underscores and hyphens.' : Object.entries(az().dbw).some(([x, r]) => x === n && r.rg === v.rg) ? 'A workspace with this name already exists in the resource group.' : null),
    adf: (n) => (!n ? 'The value must not be empty.' : !/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){2,62}$/.test(n) ? 'The name must be 3-63 characters, start and end with a letter or number, and can contain only letters, numbers and dashes (every dash must be preceded and followed by a letter or number).' : Object.keys(az().adf).some((x) => x.toLowerCase() === n.toLowerCase()) || tomadoGlobal(n) ? `The data factory name '${n}' is not available. Data factory names are globally unique.` : null),
  };
  const ASISTENTES = {
    grupo: { titulo: 'Create a resource group', icono: 'grupo', tabs: ['basics', 'tags', 'review'], valores: { name: '', location: 'eastus' }, ayuda: 'Resource group - A container that holds related resources for an Azure solution. The resource group can include all the resources for the solution, or only those resources that you want to manage as a group.' },
    storage: { titulo: 'Create a storage account', icono: 'storage', tabs: ['basics', 'advanced', 'networking', 'dataprot', 'encryption', 'tags', 'review'], valores: { name: '', location: 'eastus', primario: 'blob', performance: 'Standard', redundancy: 'GRS', ra: true, hns: false, secure: true, anonimo: false, tls: 'TLS1_2', tier: 'Hot', red: 'all', softBlob: true, softDias: 7, softCont: true, versioning: false } },
    kv: { titulo: 'Create a key vault', icono: 'kv', tabs: ['basics', 'access', 'networking', 'tags', 'review'], valores: { name: '', location: 'eastus', sku: 'standard', retencion: 90, purga: false, permiso: 'rbac', red: 'all' } },
    dbw: { titulo: 'Create an Azure Databricks workspace', icono: 'dbw', tabs: ['basics', 'networking', 'encryption', 'tags', 'review'], valores: { name: '', location: 'eastus', sku: 'premium', mrg: '', npip: true, vnet: false, cmk: false } },
    adf: { titulo: 'Create Data Factory', icono: 'adf', tabs: ['basics', 'git', 'networking', 'tags', 'review'], valores: { name: '', location: 'eastus', version: 'V2', gitDespues: true, red: 'public' } },
  };
  const TAB_N = { basics: 'Basics', advanced: 'Advanced', networking: 'Networking', dataprot: 'Data protection', encryption: 'Encryption', tags: 'Tags', review: 'Review + create', access: 'Access configuration', git: 'Git configuration' };
  function crearRecurso(cont, r) {
    if (r[0] === 'plantilla') return plantillaPersonalizada(cont);
    if (!r[0]) { tplEstado = null;
      cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], ['Create a resource', null]])}<h1>Create a resource</h1><div class="az-market">${[['grupo', 'Resource group', 'Microsoft', 'Contenedor lógico de recursos'], ['storage', 'Storage account', 'Microsoft', 'Blob, ADLS Gen2, archivos, colas y tablas'], ['dbw', 'Azure Databricks', 'Microsoft', 'Plataforma de datos y IA con Apache Spark'], ['kv', 'Key Vault', 'Microsoft', 'Secretos, claves y certificados'], ['adf', 'Data Factory', 'Microsoft', 'Integración de datos y orquestación (ETL)'], ['plantilla', 'Template deployment (deploy using custom templates)', 'Microsoft', 'Implementa una plantilla ARM propia o exportada']].map(([k, t, p, d]) => `<div class="az-mk">${svg(k === 'grupo' ? 'grupo' : k === 'plantilla' ? 'actividad' : k, 40)}<div><b>${esc(t)}</b><small>${esc(p)}</small><p>${esc(d)}</p><a class="az-btn chico" href="#/azure/crear/${k}">Create</a></div></div>`).join('')}</div></div>`;
      return;
    }
    const tipo = r[0]; const A = ASISTENTES[tipo]; if (!A) return noEncontrado(cont);
    const G = Object.keys(az().groups || {});
    const v = { ...A.valores, sub: sub().id, rg: G.find((g) => !az().groups[g].administradoPor) || '', tags: [] };
    let tab = 'basics', validado = false, errores = {};
    const campo = (k, etiqueta, html, info = '', obl = false) => `<div class="az-fila"><label for="w_${k}">${esc(etiqueta)}${obl ? ' <b class="az-obl">*</b>' : ''}${info ? ` <i class="codicon codicon-info" title="${esc(info)}"></i>` : ''}</label><div>${html}${errores[k] ? `<div class="az-campo-err">${ic('error')} ${esc(errores[k])}</div>` : ''}</div></div>`;
    const sel = (k, opts) => `<select id="w_${k}" data-k="${k}">${opts.map(([val, t]) => `<option value="${esc(val)}" ${String(v[k]) === String(val) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    const txt = (k, ph = '') => `<input id="w_${k}" data-k="${k}" value="${esc(v[k])}" placeholder="${esc(ph)}" class="${errores[k] ? 'mal' : ''}" autocomplete="off">`;
    const radio = (k, opts) => opts.map(([val, t]) => `<label class="az-radio"><input type="radio" name="w_${k}" data-k="${k}" value="${esc(val)}" ${String(v[k]) === String(val) ? 'checked' : ''}> ${esc(t)}</label>`).join('');
    const chk = (k, t) => `<label class="az-check"><input type="checkbox" data-k="${k}" ${v[k] ? 'checked' : ''}> ${esc(t)}</label>`;
    const proyecto = () => `<h3>Project details</h3><p class="az-dim">Select the subscription to manage deployed resources and costs. Use resource groups like folders to organize and manage all your resources.</p>${campo('sub', 'Subscription', sel('sub', SUBS.map((s) => [s.id, s.name])), '', true)}${tipo !== 'grupo' ? campo('rg', 'Resource group', `${sel('rg', [['', 'Select a resource group'], ...Object.keys(az().groups || {}).filter((g) => !az().groups[g].administradoPor).map((g) => [g, g]), ...(v.rgNuevo ? [[v.rgNuevo, `(New) ${v.rgNuevo}`]] : [])])}<a class="az-link" href="#" id="wRgNuevo">Create new</a>`, '', true) : ''}`;
    const regiones = () => sel('location', REGIONES.map(([a, b]) => [a, `(${/europe|uk/.test(a) ? 'Europe' : /brazil|chile|mexico/.test(a) ? 'South America' : 'US'}) ${b}`]));
    const html = {
      basics: () => {
        if (tipo === 'grupo') return `${proyecto()}${campo('name', 'Resource group', txt('name', 'rg-datos-dev'), '', true)}<h3>Resource details</h3>${campo('location', 'Region', regiones(), 'La región guarda los metadatos del grupo. Los recursos del grupo pueden estar en otras regiones.', true)}`;
        if (tipo === 'storage') return `${proyecto()}<h3>Instance details</h3>${campo('name', 'Storage account name', txt('name', 'stdatosdev01'), 'Único en todo Azure: 3 a 24 letras minúsculas y números.', true)}${campo('location', 'Region', regiones(), '', true)}${campo('primario', 'Preferred storage type', sel('primario', [['blob', 'Azure Blob Storage or Azure Data Lake Storage Gen 2'], ['files', 'Azure Files'], ['otro', 'Other (tables and queues)']]), 'Solo orienta el asistente; no limita lo que puedes guardar.')}${campo('performance', 'Primary workload / Performance', radio('performance', [['Standard', 'Standard: Recommended for most scenarios (general-purpose v2 account)'], ['Premium', 'Premium: Recommended for scenarios that require low latency']]), '', true)}${campo('redundancy', 'Redundancy', sel('redundancy', (v.performance === 'Premium' ? [['LRS', 'Locally-redundant storage (LRS)'], ['ZRS', 'Zone-redundant storage (ZRS)']] : [['LRS', 'Locally-redundant storage (LRS)'], ['ZRS', 'Zone-redundant storage (ZRS)'], ['GRS', 'Geo-redundant storage (GRS)'], ['GZRS', 'Geo-zone-redundant storage (GZRS)']])) + (/G/.test(v.redundancy) && v.performance === 'Standard' ? chk('ra', 'Make read access to data available in the event of regional unavailability.') : ''), 'LRS: 3 copias en un datacenter. ZRS: en 3 zonas de la región. GRS/GZRS: además, copia en una región secundaria.', true)}`;
        if (tipo === 'kv') return `${proyecto()}<h3>Instance details</h3>${campo('name', 'Key vault name', txt('name', 'kv-datos-dev'), 'Único en todo Azure: 3-24 caracteres, letras, números y guiones; empieza con letra.', true)}${campo('location', 'Region', regiones(), '', true)}${campo('sku', 'Pricing tier', sel('sku', [['standard', 'Standard'], ['premium', 'Premium (claves protegidas por HSM)']]), '', true)}<h3>Recovery options</h3><p class="az-dim">Soft delete está siempre activo: un vault o secreto borrado se puede recuperar durante el período de retención.</p>${campo('retencion', 'Days to retain deleted vaults', `<input type="number" id="w_retencion" data-k="retencion" min="7" max="90" value="${v.retencion}">`, 'Entre 7 y 90 días.', true)}${campo('purga', 'Purge protection', radio('purga', [['false', 'Disable purge protection (allow key vault and objects to be purged during retention period)'], ['true', 'Enable purge protection (enforce a mandatory retention period for deleted vaults and vault objects)']]))}`;
        if (tipo === 'dbw') return `${proyecto()}<h3>Instance details</h3>${campo('name', 'Workspace name', txt('name', 'dbw-datos-dev'), '3 a 64 caracteres: letras, números, _ y -.', true)}${campo('location', 'Region', regiones(), '', true)}${campo('sku', 'Pricing Tier', sel('sku', [['premium', 'Premium (+ Role-based access controls)'], ['trial', 'Trial (Premium - 14-Days Free DBUs)']]), 'Premium incluye Unity Catalog, control de acceso y auditoría.', true)}${campo('mrg', 'Managed Resource Group name', txt('mrg', `databricks-rg-${v.name || 'workspace'}-…`), 'Azure Databricks crea y administra este grupo (VNet, NSG, storage del workspace y las VMs de los clusters). No se puede modificar.')}`;
        if (tipo === 'adf') return `${proyecto()}<h3>Instance details</h3>${campo('name', 'Name', txt('name', 'adf-datos-dev'), 'Único en todo Azure.', true)}${campo('location', 'Region', regiones(), '', true)}${campo('version', 'Version', sel('version', [['V2', 'V2']]), '', true)}`;
        return '';
      },
      advanced: () => `<h3>Security</h3>${chk('secure', 'Require secure transfer for REST API operations')}${chk('anonimo', 'Allow enabling anonymous access on individual containers')}${chk('keyAccess', 'Enable storage account key access')}${campo('tls', 'Minimum TLS version', sel('tls', [['TLS1_2', 'Version 1.2'], ['TLS1_3', 'Version 1.3']]))}<h3>Data Lake Storage Gen2</h3><p class="az-dim">The Data Lake Storage Gen2 hierarchical namespace accelerates big data analytics workloads and enables file-level access control lists (ACLs).</p>${chk('hns', 'Enable hierarchical namespace')}<h3>Blob storage</h3>${campo('tier', 'Access tier', radio('tier', [['Hot', 'Hot: Optimized for frequently accessed data and everyday usage scenarios'], ['Cool', 'Cool: Optimized for infrequently accessed data and backup scenarios'], ['Cold', 'Cold: Optimized for rarely accessed data and backup scenarios']]))}`,
      networking: () => (tipo === 'dbw' ? `<h3>Network connectivity</h3>${campo('npip', 'Deploy an Azure Databricks workspace with Secure Cluster Connectivity (No Public IP)', radio('npip', [['true', 'Yes'], ['false', 'No']]), 'Los nodos de los clusters no tienen IP pública: la conexión al plano de control sale desde tu red.')}${campo('vnet', 'Deploy Azure Databricks workspace in your own Virtual Network (VNet)', radio('vnet', [['false', 'No'], ['true', 'Yes']]), 'VNet injection: los clusters viven en una VNet tuya (con dos subnets delegadas).')}` : `<h3>Network connectivity</h3>${campo('red', tipo === 'adf' ? 'Connectivity method' : 'Public network access', radio('red', tipo === 'adf' ? [['public', 'Public endpoint'], ['private', 'Private endpoint']] : [['all', 'Enable public access from all networks'], ['selected', 'Enable public access from selected virtual networks and IP addresses'], ['disabled', 'Disable public access and use private access']]))}${tipo === 'storage' && v.red === 'all' ? `<div class="az-banner aviso">${ic('warning')} Enabling public access from all networks might make this resource available publicly. Unless public access is required, we recommend using a more restricted access type.</div>` : ''}`),
      dataprot: () => `<h3>Recovery</h3>${chk('softBlob', 'Enable soft delete for blobs')}${v.softBlob ? campo('softDias', 'Days to retain deleted blobs', `<input type="number" id="w_softDias" data-k="softDias" min="1" max="365" value="${v.softDias}">`) : ''}${chk('softCont', 'Enable soft delete for containers')}<h3>Tracking</h3>${chk('versioning', 'Enable versioning for blobs')}`,
      encryption: () => (tipo === 'dbw' ? `<h3>Encryption</h3>${chk('cmk', 'Use your own key (customer-managed keys) for managed services')}<p class="az-dim">Por defecto los datos se cifran con claves administradas por Microsoft.</p>` : `<h3>Encryption</h3>${campo('enc', 'Encryption type', radio('enc', [['mmk', 'Microsoft-managed keys (MMK)'], ['cmk', 'Customer-managed keys (CMK)']]))}<p class="az-dim">Los datos siempre se cifran en reposo (AES-256). Con CMK la clave vive en tu Key Vault.</p>`),
      access: () => `<h3>Permission model</h3><p class="az-dim">Grant data plane access by using an Azure RBAC or Key Vault access policy.</p>${campo('permiso', 'Permission model', radio('permiso', [['rbac', 'Azure role-based access control (recommended)'], ['policy', 'Vault access policy']]), '', true)}${v.permiso === 'rbac' ? `<div class="az-banner info">${ic('info')} Con Azure RBAC, ser Owner de la suscripción no da acceso a los secretos: hay que asignar un rol de datos, por ejemplo <b>Key Vault Secrets Officer</b>.</div>` : `<div class="az-banner info">${ic('info')} Se agrega una access policy para ti (${USUARIO}) con todos los permisos sobre secretos.</div>`}`,
      git: () => `<h3>Git configuration</h3><p class="az-dim">Azure Data Factory se puede conectar a un repositorio (Azure DevOps o GitHub) para versionar pipelines y publicar con CI/CD.</p>${chk('gitDespues', 'Configure Git later')}`,
      tags: () => `<p class="az-dim">Tags are name/value pairs that enable you to categorize resources and view consolidated billing by applying the same tag to multiple resources and resource groups.</p><table class="az-tabla az-tags"><thead><tr><th>Name</th><th>Value</th><th></th></tr></thead><tbody>${[...v.tags, ['', '']].map(([a, b], i) => `<tr><td><input data-tag="${i}" data-p="0" value="${esc(a)}" placeholder="environment"></td><td><input data-tag="${i}" data-p="1" value="${esc(b)}" placeholder="dev"></td><td>${i < v.tags.length ? `<button class="az-tb2" data-qtag="${i}">${ic('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table>`,
      review: () => {
        const filas = resumen();
        return `${validado ? (Object.keys(errores).length ? `<div class="az-banner error">${ic('error')} Validation failed. Required information is missing or not valid.</div>` : `<div class="az-banner ok">${ic('pass-filled')} Validation passed</div>`) : '<div class="az-banner info"><span class="az-gira"></span> Running final validation...</div>'}<h3>Basics</h3><table class="az-kv">${filas.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</table>${v.tags.length ? `<h3>Tags</h3><table class="az-kv">${v.tags.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</table>` : ''}<p><a class="az-link" href="#" id="wPlantilla">Download a template for automation</a></p>`;
      },
    };
    const resumen = () => {
      const base = [['Subscription', SUBS.find((s) => s.id === v.sub).name], ...(tipo !== 'grupo' ? [['Resource group', v.rgNuevo && v.rg === v.rgNuevo ? `(New) ${v.rg}` : v.rg]] : []), [tipo === 'grupo' ? 'Resource group' : 'Name', v.name], ['Region', regionNombre(v.location)]];
      if (tipo === 'storage') base.push(['Primary service', { blob: 'Azure Blob Storage or Azure Data Lake Storage Gen 2', files: 'Azure Files', otro: 'Other' }[v.primario]], ['Performance', v.performance], ['Replication', `${v.ra && /G/.test(v.redundancy) ? 'Read-access ' : ''}${{ LRS: 'Locally-redundant storage (LRS)', ZRS: 'Zone-redundant storage (ZRS)', GRS: 'Geo-redundant storage (GRS)', GZRS: 'Geo-zone-redundant storage (GZRS)' }[v.redundancy]}`], ['Hierarchical namespace', v.hns ? 'Enabled' : 'Disabled'], ['Access tier', v.tier], ['Public network access', v.red === 'all' ? 'Enabled from all networks' : v.red === 'selected' ? 'Enabled from selected networks' : 'Disabled']);
      if (tipo === 'kv') base.push(['Pricing tier', v.sku === 'premium' ? 'Premium' : 'Standard'], ['Soft-delete', `Enabled (${v.retencion} days)`], ['Purge protection', String(v.purga) === 'true' ? 'Enabled' : 'Disabled'], ['Permission model', v.permiso === 'rbac' ? 'Azure role-based access control' : 'Vault access policy']);
      if (tipo === 'dbw') base.push(['Pricing tier', v.sku === 'trial' ? 'Trial (Premium - 14-Days Free DBUs)' : 'Premium'], ['Managed resource group', v.mrg || `databricks-rg-${v.name}-<auto>`], ['No Public IP', String(v.npip) === 'true' ? 'Yes' : 'No'], ['VNet injection', String(v.vnet) === 'true' ? 'Yes' : 'No']);
      if (tipo === 'adf') base.push(['Version', v.version], ['Git', v.gitDespues ? 'Configure later' : 'Pending']);
      return base;
    };
    const validar = () => {
      errores = {};
      const e1 = VALIDA[tipo](v.name, v); if (e1) errores.name = e1;
      if (tipo !== 'grupo' && !v.rg) errores.rg = 'Select a resource group or create a new one.';
      if (tipo === 'kv' && (v.retencion < 7 || v.retencion > 90)) errores.retencion = 'The value must be between 7 and 90.';
      if (tipo === 'dbw' && v.mrg && VALIDA.grupo(v.mrg)) errores.mrg = VALIDA.grupo(v.mrg);
      if (tipo === 'storage' && v.performance === 'Premium' && /G/.test(v.redundancy)) errores.redundancy = 'Premium solo admite LRS o ZRS.';
      return Object.keys(errores);
    };
    const tabDe = (k) => (['sub', 'rg', 'name', 'location', 'performance', 'redundancy', 'sku', 'mrg', 'retencion', 'primario'].includes(k) ? 'basics' : 'otra');
    const pintar = () => {
      cont.innerHTML = `<div class="az-pag az-wiz">${migas([['Home', ''], ['Create a resource', 'crear'], [A.titulo, null]])}<div class="az-cab">${svg(A.icono, 28)}<h1>${esc(A.titulo)}</h1></div>
        <div class="az-wtabs">${A.tabs.map((t) => `<button class="${t === tab ? 'on' : ''}" data-t="${t}">${TAB_N[t]}${validado && t === 'basics' && Object.keys(errores).some((k) => tabDe(k) === 'basics') ? ' <b class="az-punto"></b>' : ''}</button>`).join('')}</div>
        <div class="az-wcuerpo">${tab === 'basics' && A.ayuda ? `<p class="az-dim">${esc(A.ayuda)}</p>` : ''}${html[tab]()}</div>
        <div class="az-wpie">${tab === 'review' ? `<button class="az-btn primario" id="wCrear" ${validado && !Object.keys(errores).length ? '' : 'disabled'}>Create</button>` : '<button class="az-btn primario" id="wRev">Review + create</button>'}<button class="az-btn" id="wPrev" ${tab === A.tabs[0] ? 'disabled' : ''}>&lt; Previous</button>${tab !== 'review' ? `<button class="az-btn" id="wNext">Next : ${TAB_N[A.tabs[A.tabs.indexOf(tab) + 1]]} &gt;</button>` : ''}</div></div>`;
      const $ = (q) => cont.querySelector(q);
      cont.querySelectorAll('[data-k]').forEach((el) => {
        const ev = el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(ev, () => {
          const k = el.dataset.k; v[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
          if (validado || errores[k]) { delete errores[k]; const ee = k === 'name' ? VALIDA[tipo](v.name, v) : null; if (ee) errores.name = ee; }
          if (['performance', 'redundancy', 'red', 'permiso', 'softBlob', 'sub'].includes(k)) { if (k === 'sub') { const s = az(); s.sub = v.sub; guardarAz(); } pintar(); }
          else if (el.type !== 'radio' && el.type !== 'checkbox' && el.tagName !== 'SELECT' && k === 'name') { const msg = VALIDA[tipo](v.name, v); el.classList.toggle('mal', !!msg); const box = el.parentElement; let d = box.querySelector('.az-campo-err'); if (msg && !d) { d = document.createElement('div'); d.className = 'az-campo-err'; box.appendChild(d); } if (d) { if (msg) d.innerHTML = `${ic('error')} ${esc(msg)}`; else d.remove(); } }
        });
      });
      cont.querySelectorAll('[data-tag]').forEach((el) => el.addEventListener('change', () => { const i = Number(el.dataset.tag); if (!v.tags[i]) v.tags[i] = ['', '']; v.tags[i][Number(el.dataset.p)] = el.value.trim(); v.tags = v.tags.filter((t) => t[0] || t[1]); pintar(); }));
      cont.querySelectorAll('[data-qtag]').forEach((b) => b.onclick = () => { v.tags.splice(Number(b.dataset.qtag), 1); pintar(); });
      const rgN = $('#wRgNuevo'); if (rgN) rgN.onclick = (e) => { e.preventDefault(); panel({ titulo: 'Create new resource group', ok: 'OK', cuerpo: '<p class="az-dim">A resource group is a container that holds related resources for an Azure solution.</p><label class="az-campo"><span>Name *</span><input id="rgN" value="rg-datos-dev"></label>', alOk: (p) => { const n = p.querySelector('#rgN').value.trim(); const er = VALIDA.grupo(n); if (er) throw new Error(er); v.rgNuevo = n; v.rg = n; delete errores.rg; pintar(); } }); };
      cont.querySelector('.az-wtabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; if (tab === 'review') revisar(); else pintar(); };
      const revisar = () => { tab = 'review'; validado = false; pintar(); setTimeout(() => { validar(); validado = true; if (Object.keys(errores).length) { tab = 'basics'; } pintar(); }, 700); };
      const rv = $('#wRev'); if (rv) rv.onclick = revisar;
      const nx = $('#wNext'); if (nx) nx.onclick = () => { const i = A.tabs.indexOf(tab) + 1; if (A.tabs[i] === 'review') revisar(); else { tab = A.tabs[i]; pintar(); } };
      const pv = $('#wPrev'); if (pv) pv.onclick = () => { tab = A.tabs[Math.max(0, A.tabs.indexOf(tab) - 1)]; pintar(); };
      const pl = $('#wPlantilla'); if (pl) pl.onclick = (e) => { e.preventDefault(); verPlantilla(tipo, v); };
      const cr = $('#wCrear'); if (cr) cr.onclick = () => desplegar(tipo, v);
    };
    pintar();
  }
  // plantilla ARM (y Bicep) de lo que se va a crear
  function plantilla(tipo, v) {
    const tags = Object.fromEntries(v.tags || []);
    const res = {
      grupo: { type: 'Microsoft.Resources/resourceGroups', apiVersion: '2024-03-01', name: v.name, location: v.location, tags },
      storage: { type: 'Microsoft.Storage/storageAccounts', apiVersion: '2023-05-01', name: v.name, location: v.location, tags, sku: { name: `${v.performance}_${v.ra && /G/.test(v.redundancy) ? 'RA' : ''}${v.redundancy}` }, kind: v.performance === 'Premium' ? 'BlockBlobStorage' : 'StorageV2', properties: { accessTier: v.tier, minimumTlsVersion: v.tls, supportsHttpsTrafficOnly: !!v.secure, allowBlobPublicAccess: !!v.anonimo, isHnsEnabled: !!v.hns, publicNetworkAccess: v.red === 'disabled' ? 'Disabled' : 'Enabled' } },
      kv: { type: 'Microsoft.KeyVault/vaults', apiVersion: '2023-07-01', name: v.name, location: v.location, tags, properties: { tenantId: TENANT, sku: { family: 'A', name: v.sku }, enableRbacAuthorization: v.permiso === 'rbac', enableSoftDelete: true, softDeleteRetentionInDays: Number(v.retencion), ...(String(v.purga) === 'true' ? { enablePurgeProtection: true } : {}), accessPolicies: v.permiso === 'rbac' ? [] : [{ tenantId: TENANT, objectId: '<tu-object-id>', permissions: { secrets: ['get', 'list', 'set', 'delete', 'recover', 'backup', 'restore'] } }] } },
      dbw: { type: 'Microsoft.Databricks/workspaces', apiVersion: '2024-05-01', name: v.name, location: v.location, tags, sku: { name: v.sku }, properties: { managedResourceGroupId: `[subscriptionResourceId('Microsoft.Resources/resourceGroups', '${v.mrg || 'databricks-rg-' + v.name + '-<auto>'}')]`, parameters: { enableNoPublicIp: { value: String(v.npip) === 'true' } } } },
      adf: { type: 'Microsoft.DataFactory/factories', apiVersion: '2018-06-01', name: v.name, location: v.location, tags, identity: { type: 'SystemAssigned' }, properties: { publicNetworkAccess: v.red === 'private' ? 'Disabled' : 'Enabled' } },
    }[tipo];
    return { $schema: tipo === 'grupo' ? 'https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#' : 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#', contentVersion: '1.0.0.0', parameters: {}, resources: [res] };
  }
  function bicep(tipo, v) {
    const t = plantilla(tipo, v).resources[0];
    const val = (x, n) => (typeof x === 'object' && x !== null ? `{\n${Object.entries(x).map(([k, y]) => `${' '.repeat(n + 2)}${k}: ${val(y, n + 2)}`).join('\n')}\n${' '.repeat(n)}}` : typeof x === 'string' ? `'${x}'` : String(x));
    const { type, apiVersion, ...resto } = t;
    return `${tipo === 'grupo' ? "targetScope = 'subscription'\n\n" : ''}resource ${tipo} '${type}@${apiVersion}' = ${val(resto, 0)}\n`;
  }
  function verPlantilla(tipo, v) {
    panel({ titulo: 'Template', ok: null, cancelar: 'Close', ancho: 760, cuerpo: `<div class="az-pest"><a class="on" data-v="arm">Template (ARM JSON)</a><a data-v="bicep">Bicep</a><a data-v="cli">Azure CLI</a></div><pre class="az-code" id="tCode"></pre><p class="az-dim">Con esto puedes repetir el despliegue sin el portal (Infraestructura como código). Terraform hace lo mismo con su propio lenguaje.</p>`, alAbrir: (p) => {
      const cli = { grupo: `az group create --name ${v.name} --location ${v.location}`, storage: `az storage account create --name ${v.name} --resource-group ${v.rg} --location ${v.location} --sku ${v.performance}_${v.ra && /G/.test(v.redundancy) ? 'RA' : ''}${v.redundancy} --kind StorageV2${v.hns ? ' --hns true' : ''} --min-tls-version ${v.tls}`, kv: `az keyvault create --name ${v.name} --resource-group ${v.rg} --location ${v.location} --sku ${v.sku} --retention-days ${v.retencion}${v.permiso === 'rbac' ? ' --enable-rbac-authorization true' : ''}`, dbw: `az databricks workspace create --name ${v.name} --resource-group ${v.rg} --location ${v.location} --sku ${v.sku}`, adf: `az datafactory create --name ${v.name} --resource-group ${v.rg} --location ${v.location}` }[tipo];
      const pint = (k) => { p.querySelector('#tCode').textContent = k === 'arm' ? JSON.stringify(plantilla(tipo, v), null, 2) : k === 'bicep' ? bicep(tipo, v) : cli; p.querySelectorAll('[data-v]').forEach((a) => a.classList.toggle('on', a.dataset.v === k)); };
      p.querySelectorAll('[data-v]').forEach((a) => { a.onclick = () => pint(a.dataset.v); }); pint('arm');
    } });
  }

  // ---- Implementación de plantilla personalizada (Template deployment): ARM JSON → recursos de la práctica
  const TPL_EJEMPLO = { $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#', contentVersion: '1.0.0.0', parameters: { storageAccountName: { type: 'string', defaultValue: "[concat('stdatos', uniqueString(resourceGroup().id))]", metadata: { description: 'Nombre de la cuenta (único en Azure)' } }, location: { type: 'string', defaultValue: '[resourceGroup().location]' }, skuName: { type: 'string', defaultValue: 'Standard_LRS', allowedValues: ['Standard_LRS', 'Standard_ZRS', 'Standard_GRS'] } }, variables: { contenedor: 'raw' }, resources: [{ type: 'Microsoft.Storage/storageAccounts', apiVersion: '2023-05-01', name: "[parameters('storageAccountName')]", location: "[parameters('location')]", sku: { name: "[parameters('skuName')]" }, kind: 'StorageV2', properties: { isHnsEnabled: true, minimumTlsVersion: 'TLS1_2' } }, { type: 'Microsoft.Storage/storageAccounts/blobServices/containers', apiVersion: '2023-05-01', name: "[format('{0}/default/{1}', parameters('storageAccountName'), variables('contenedor'))]", dependsOn: ["[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]"] }], outputs: { cuenta: { type: 'string', value: "[parameters('storageAccountName')]" } } };
  function hashArm(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; let x = ''; let n = h; for (let i = 0; i < 13; i++) { x += 'abcdefghijklmnopqrstuvwxyz234567'[n % 32]; n = Math.floor(n / 32) || (h = Math.imul(h ^ i, 16777619) >>> 0); } return x; }
  // expresiones de plantilla: "[función(...)]" con parameters, variables, concat, format, resourceGroup(), subscription(), uniqueString, resourceId…
  function evalArm(v, C) {
    if (Array.isArray(v)) return v.map((x) => evalArm(x, C));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, evalArm(x, C)]));
    if (typeof v !== 'string' || !/^\[.*\]$/s.test(v) || v.startsWith('[[')) return typeof v === 'string' && v.startsWith('[[') ? v.slice(1) : v;
    const src = v.slice(1, -1); let i = 0;
    const ws = () => { while (/\s/.test(src[i] || '')) i++; };
    function expr() {
      ws(); let val;
      if (src[i] === "'") { let j = i + 1, t = ''; for (;;) { if (j >= src.length) throw new Error(`The template language expression '${src}' is not valid.`); if (src[j] === "'" && src[j + 1] === "'") { t += "'"; j += 2; continue; } if (src[j] === "'") break; t += src[j++]; } i = j + 1; val = t; }
      else if (/[-\d]/.test(src[i])) { const m = /^-?\d+/.exec(src.slice(i)); i += m[0].length; val = Number(m[0]); }
      else {
        const m = /^[A-Za-z_]\w*/.exec(src.slice(i)); if (!m) throw new Error(`The template language expression '${src}' is not valid.`); i += m[0].length; ws();
        const n = m[0]; const args = [];
        if (src[i] === '(') { i++; ws(); if (src[i] !== ')') { args.push(expr()); ws(); while (src[i] === ',') { i++; args.push(expr()); ws(); } } if (src[i] !== ')') throw new Error(`The template language expression '${src}' is not valid: falta ')'.`); i++; }
        val = llamarArm(n, args, C);
      }
      ws();
      while (src[i] === '.' || src[i] === '[') { if (src[i] === '.') { i++; const m = /^\w+/.exec(src.slice(i)); i += m[0].length; if (val == null || !(m[0] in Object(val))) throw new Error(`The template language expression '${src}' is not valid: the property '${m[0]}' doesn't exist.`); val = val[m[0]]; } else { i++; const k = expr(); ws(); i++; val = val[k]; } ws(); }
      return val;
    }
    const r = expr(); return r;
  }
  function llamarArm(n, a, C) {
    const F = {
      parameters: () => { if (!(a[0] in C.params)) throw new Error(`The template parameter '${a[0]}' is not found.`); return C.params[a[0]]; },
      variables: () => { if (!(a[0] in C.vars)) throw new Error(`The template variable '${a[0]}' is not found.`); return C.vars[a[0]]; },
      concat: () => (a.every(Array.isArray) ? [].concat(...a) : a.map((x) => (x == null ? '' : String(x))).join('')),
      format: () => String(a[0]).replace(/\{(\d+)\}/g, (m, k) => String(a[Number(k) + 1] ?? '')),
      resourceGroup: () => ({ name: C.rg, location: C.location, id: `/subscriptions/${C.sub}/resourceGroups/${C.rg}` }),
      subscription: () => ({ subscriptionId: C.sub, id: `/subscriptions/${C.sub}` }),
      uniqueString: () => hashArm(a.join('|')), toLower: () => String(a[0]).toLowerCase(), toUpper: () => String(a[0]).toUpperCase(),
      string: () => (typeof a[0] === 'object' ? JSON.stringify(a[0]) : String(a[0])), int: () => parseInt(a[0], 10), bool: () => a[0] === true || String(a[0]).toLowerCase() === 'true',
      if: () => (a[0] ? a[1] : a[2]), equals: () => a[0] === a[1], not: () => !a[0], and: () => a.every(Boolean), or: () => a.some(Boolean),
      substring: () => String(a[0]).substr(a[1], a[2]), replace: () => String(a[0]).split(a[1]).join(a[2]), length: () => (a[0] || []).length, take: () => String(a[0]).slice(0, a[1]),
      resourceId: () => `/subscriptions/${C.sub}/resourceGroups/${C.rg}/providers/${a[0]}/${a.slice(1).join('/')}`,
    };
    if (!F[n]) throw new Error(`The template function '${n}' is not valid. En esta práctica se admiten: ${Object.keys(F).join(', ')}.`);
    return F[n]();
  }
  const TIPOS_TPL = ['Microsoft.Storage/storageAccounts', 'Microsoft.Storage/storageAccounts/blobServices/containers', 'Microsoft.KeyVault/vaults', 'Microsoft.KeyVault/vaults/secrets', 'Microsoft.Databricks/workspaces', 'Microsoft.DataFactory/factories', 'Microsoft.DataFactory/factories/linkedServices', 'Microsoft.DataFactory/factories/datasets', 'Microsoft.DataFactory/factories/pipelines', 'Microsoft.DataFactory/factories/triggers'];
  const ORDEN_TPL = (t) => ({ 'Microsoft.Storage/storageAccounts': 0, 'Microsoft.KeyVault/vaults': 0, 'Microsoft.Databricks/workspaces': 0, 'Microsoft.DataFactory/factories': 0, 'Microsoft.Storage/storageAccounts/blobServices/containers': 1, 'Microsoft.KeyVault/vaults/secrets': 1, 'Microsoft.DataFactory/factories/linkedServices': 1, 'Microsoft.DataFactory/factories/datasets': 2, 'Microsoft.DataFactory/factories/pipelines': 3, 'Microsoft.DataFactory/factories/triggers': 4 }[t] ?? 9);
  let tplEstado = null;
  function plantillaPersonalizada(cont) {
    if (!tplEstado) { let pre = null; try { pre = sessionStorage.getItem('az-plantilla'); sessionStorage.removeItem('az-plantilla'); } catch (e) { pre = null; } tplEstado = { paso: pre ? 'basics' : 'select', texto: pre || '', tpl: pre ? JSON.parse(pre) : null, valores: {}, rg: '', rgNuevo: '' }; }
    const E = tplEstado, s = az();
    const pest = [['select', 'Select a template'], ['basics', 'Basics'], ['review', 'Review + create']];
    const cab = `<div class="az-pag">${migas([['Home', ''], ['Create a resource', 'crear'], ['Custom deployment', null]])}<div class="az-cab">${svg('actividad', 28)}<h1>Custom deployment</h1><small>Deploy from a custom template</small></div><div class="az-pest">${pest.map(([k, t]) => `<a class="${E.paso === k ? 'on' : ''}" data-tp="${k}">${t}</a>`).join('')}</div>`;
    const params = () => Object.entries((E.tpl && E.tpl.parameters) || {});
    if (E.paso === 'select' || E.paso === 'editor') {
      if (E.paso === 'editor') {
        cont.innerHTML = `${cab}<h3>Edit template</h3><p class="az-dim">Pega o escribe una plantilla ARM (JSON). Recursos admitidos en la práctica: ${TIPOS_TPL.map((t) => `<code>${esc(t.replace('Microsoft.', ''))}</code>`).join(', ')}.</p><div class="az-cmd"><label class="az-btn chico" style="cursor:pointer">${ic('cloud-upload')} Load file<input type="file" id="tFile" accept=".json" hidden></label><button id="tEj">${ic('file-code')} Ejemplo: storage + contenedor</button></div><textarea id="tTxt" class="az-tpl-ed" spellcheck="false">${esc(E.texto || JSON.stringify(TPL_EJEMPLO, null, 2))}</textarea><div class="az-banner error" id="tErr" hidden></div><div class="az-pie"><button class="az-btn primario" id="tSave">Save</button><button class="az-btn" id="tDisc">Discard</button></div></div>`;
        cont.querySelector('#tEj').onclick = () => { cont.querySelector('#tTxt').value = JSON.stringify(TPL_EJEMPLO, null, 2); };
        cont.querySelector('#tFile').onchange = async (e) => { const f = e.target.files[0]; if (f) cont.querySelector('#tTxt').value = await f.text(); };
        cont.querySelector('#tDisc').onclick = () => { E.paso = 'select'; plantillaPersonalizada(cont); };
        cont.querySelector('#tSave').onclick = () => {
          const txt = cont.querySelector('#tTxt').value; let j;
          try { j = JSON.parse(txt); } catch (e) { const er = cont.querySelector('#tErr'); er.hidden = false; er.textContent = `The template is not valid JSON: ${e.message}`; return; }
          if (!Array.isArray(j.resources)) { const er = cont.querySelector('#tErr'); er.hidden = false; er.textContent = "The template must contain a 'resources' array."; return; }
          E.texto = txt; E.tpl = j; E.valores = {}; E.paso = 'basics'; plantillaPersonalizada(cont);
        };
        return;
      }
      cont.innerHTML = `${cab}<p>Automate deploying resources with Azure Resource Manager templates in a single, coordinated operation. Create or select a template below to get started.</p><div class="az-tpl-opc"><button class="az-tpl-card" id="tPropia">${ic('edit')}<b>Build your own template in the editor</b><small>Escribe o pega JSON, o carga un archivo (por ejemplo, el arm_template.json que exporta Data Factory)</small></button><button class="az-tpl-card" id="tRapida">${ic('rocket')}<b>Quickstart: Storage account + contenedor</b><small>Plantilla de ejemplo con parámetros, variables y uniqueString</small></button></div></div>`;
      cont.querySelector('#tPropia').onclick = () => { E.paso = 'editor'; plantillaPersonalizada(cont); };
      cont.querySelector('#tRapida').onclick = () => { E.texto = JSON.stringify(TPL_EJEMPLO, null, 2); E.tpl = TPL_EJEMPLO; E.paso = 'basics'; plantillaPersonalizada(cont); };
      cont.querySelectorAll('[data-tp]').forEach((a) => { a.onclick = () => { if (a.dataset.tp !== 'select' && !E.tpl) return toast('Primero elige o escribe una plantilla.'); E.paso = a.dataset.tp; plantillaPersonalizada(cont); }; });
      return;
    }
    const grupos = Object.keys(s.groups || {}).filter((g) => !/^databricks-rg-/.test(g));
    if (E.paso === 'basics') {
      cont.innerHTML = `${cab}<p class="az-dim">Template: ${E.tpl.resources.length} recursos · <a data-editar>Edit template</a></p><h3>Project details</h3>
        <label class="az-campo"><span>Subscription *</span><select disabled><option>${esc(sub().name)}</option></select></label>
        <label class="az-campo"><span>Resource group *</span><select id="tRg"><option value="">Select a resource group</option>${grupos.map((g) => `<option ${E.rg === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select> <input id="tRgN" placeholder="o crea uno nuevo" value="${esc(E.rgNuevo)}"></label>
        <h3>Instance details</h3>
        ${params().map(([k, P]) => `<label class="az-campo"><span>${esc(k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase()))}${P.defaultValue === undefined ? ' *' : ''}</span>${P.allowedValues ? `<select data-tpar="${esc(k)}">${P.allowedValues.map((x) => `<option ${String(E.valores[k] ?? P.defaultValue) === String(x) ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>` : `<input data-tpar="${esc(k)}" value="${esc(E.valores[k] ?? (typeof P.defaultValue === 'object' ? JSON.stringify(P.defaultValue) : P.defaultValue ?? ''))}">`}${P.metadata && P.metadata.description ? `<small class="az-dim">${esc(P.metadata.description)}</small>` : ''}</label>`).join('') || '<p class="az-dim">La plantilla no tiene parámetros.</p>'}
        <div class="az-pie"><button class="az-btn primario" id="tRev">Review + create</button><button class="az-btn" id="tPrev">&lt; Previous</button></div></div>`;
      const leer = () => { E.rg = cont.querySelector('#tRg').value; E.rgNuevo = cont.querySelector('#tRgN').value.trim(); cont.querySelectorAll('[data-tpar]').forEach((x) => { E.valores[x.dataset.tpar] = x.value; }); };
      cont.querySelector('[data-editar]').onclick = () => { leer(); E.paso = 'editor'; plantillaPersonalizada(cont); };
      cont.querySelector('#tPrev').onclick = () => { leer(); E.paso = 'select'; plantillaPersonalizada(cont); };
      cont.querySelector('#tRev').onclick = () => { leer(); E.paso = 'review'; plantillaPersonalizada(cont); };
      cont.querySelectorAll('[data-tp]').forEach((a) => { a.onclick = () => { leer(); E.paso = a.dataset.tp; plantillaPersonalizada(cont); }; });
      return;
    }
    // review: evaluar la plantilla y validar
    const rg = E.rgNuevo || E.rg; const errores = [];
    if (!rg) errores.push('Resource group: elige uno o escribe el nombre de uno nuevo.');
    const location = (s.groups[rg] || {}).location || 'eastus';
    const C = { params: {}, vars: {}, rg, location, sub: s.sub };
    let recursos = [];
    try {
      for (const [k, P] of params()) { let v = E.valores[k]; if (v === undefined || v === '') v = P.defaultValue; if (v === undefined) { errores.push(`The value for the template parameter '${k}' is not provided.`); continue; } v = evalArm(v, C); if (P.type === 'int') v = Number(v); if (P.type === 'bool') v = String(v) === 'true' || v === true; if ((P.type === 'object' || P.type === 'array') && typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { errores.push(`The parameter '${k}' must be valid JSON.`); } } C.params[k] = v; }
      for (const [k, v] of Object.entries(E.tpl.variables || {})) C.vars[k] = evalArm(v, C);
      recursos = E.tpl.resources.map((r0) => { const r = evalArm(r0, C); return { tipo: r.type, nombre: String(r.name), r }; });
    } catch (e) { errores.push(e.message); }
    for (const x of recursos) {
      if (!TIPOS_TPL.includes(x.tipo)) errores.push(`The resource type '${x.tipo}' (${x.nombre}) is not supported in this practice portal.`);
      if (x.tipo === 'Microsoft.Storage/storageAccounts' && VALIDA.storage) { const e = VALIDA.storage(x.nombre); if (e && !/already taken|ya existe|not available/i.test(e)) errores.push(`${x.nombre}: ${e}`); }
    }
    E.evaluado = { rg, location, recursos, C };
    cont.innerHTML = `${cab}${errores.length ? `<div class="az-banner error">${ic('error')} <div><b>Validation failed.</b> Click here for details.<ul>${errores.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div></div>` : `<div class="az-banner ok">${ic('pass-filled')} Validation Passed</div>`}
      <h3>Basics</h3><table class="az-kv"><tr><th>Subscription</th><td>${esc(sub().name)}</td></tr><tr><th>Resource group</th><td>${esc(rg)}${E.rgNuevo && !s.groups[E.rgNuevo] ? ' (new)' : ''}</td></tr><tr><th>Region</th><td>${esc(location)}</td></tr>${Object.entries(C.params).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</td></tr>`).join('')}</table>
      <h3>Resources (${recursos.length})</h3><table class="az-tabla"><thead><tr><th>Name</th><th>Type</th></tr></thead><tbody>${recursos.map((x) => `<tr><td>${esc(x.nombre)}</td><td>${esc(x.tipo)}</td></tr>`).join('')}</tbody></table>
      <div class="az-pie"><button class="az-btn primario" id="tCrear" ${errores.length ? 'disabled' : ''}>Create</button><button class="az-btn" id="tPrev">&lt; Previous</button></div></div>`;
    cont.querySelector('#tPrev').onclick = () => { E.paso = 'basics'; plantillaPersonalizada(cont); };
    cont.querySelectorAll('[data-tp]').forEach((a) => { a.onclick = () => { E.paso = a.dataset.tp; plantillaPersonalizada(cont); }; });
    const cr = cont.querySelector('#tCrear'); if (cr) cr.onclick = () => { const ev = E.evaluado; tplEstado = null; desplegarPlantilla(ev); };
  }
  function desplegarPlantilla({ rg, location: ubic, recursos, C }) {
    const s = az(); s.deployments = s.deployments || [];
    const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const dep = { id: uid(10), nombre: 'Microsoft.Template-' + ts, rg, tipo: 'plantilla', recurso: rg, estado: 'Running', inicio: ahora(), sub: s.sub, recursos: recursos.map((x) => ({ tipo: x.tipo, nombre: x.nombre, estado: 'Running' })), plantilla: { resources: recursos.map((x) => x.r) } };
    s.deployments.unshift(dep); s.deployments = s.deployments.slice(0, 100);
    if (!s.groups[rg]) { s.groups[rg] = { location: ubic, tags: {} }; actividad('Create or Update Resource Group', rg); }
    guardarAz(); notificar('Deployment in progress...', `Deployment to resource group '${rg}' is in progress.`, 'progreso', ['Go to deployment', 'despliegue/' + dep.id]);
    ir('despliegue/' + dep.id);
    setTimeout(() => {
      const orden = recursos.map((x, i) => ({ ...x, i })).sort((a, b) => ORDEN_TPL(a.tipo) - ORDEN_TPL(b.tipo));
      for (const x of orden) {
        const row = dep.recursos[x.i]; const r = x.r; const p = r.properties || {}; const partes = x.nombre.split('/');
        try {
          if (x.tipo === 'Microsoft.Storage/storageAccounts') { const sku = (r.sku || {}).name || 'Standard_LRS'; s.storage[x.nombre] = { ...(s.storage[x.nombre] || {}), rg, location: r.location || ubic, sku, kind: r.kind || 'StorageV2', hns: !!p.isHnsEnabled, containers: (s.storage[x.nombre] || {}).containers || {}, tags: r.tags || {}, creado: ahora(), props: { tier: p.accessTier || 'Hot', tls: p.minimumTlsVersion || 'TLS1_2', secure: true, anonimo: !!p.allowBlobPublicAccess, red: 'all' } }; actividad('Create or Update Storage Account', x.nombre, 'Succeeded', { rg }); }
          else if (x.tipo === 'Microsoft.Storage/storageAccounts/blobServices/containers') { const A = s.storage[partes[0]]; if (!A) throw new Error(`The Resource 'Microsoft.Storage/storageAccounts/${partes[0]}' under resource group '${rg}' was not found.`); A.containers[partes[2]] = A.containers[partes[2]] || { blobs: {} }; }
          else if (x.tipo === 'Microsoft.KeyVault/vaults') { s.kv[x.nombre] = { ...(s.kv[x.nombre] || {}), rg, location: r.location || ubic, secrets: (s.kv[x.nombre] || {}).secrets || {}, tags: r.tags || {}, creado: ahora(), props: { sku: ((p.sku || {}).name) || 'standard', retencion: p.softDeleteRetentionInDays || 90, purga: !!p.enablePurgeProtection, permiso: p.enableRbacAuthorization === false ? 'policy' : 'rbac', red: 'all' } }; actividad('Create or Update Key Vault', x.nombre, 'Succeeded', { rg }); }
          else if (x.tipo === 'Microsoft.KeyVault/vaults/secrets') { const V = s.kv[partes[0]]; if (!V) throw new Error(`The Resource 'Microsoft.KeyVault/vaults/${partes[0]}' was not found.`); V.secrets[partes[1]] = { value: String(p.value ?? ''), creado: ahora(), enabled: true }; }
          else if (x.tipo === 'Microsoft.Databricks/workspaces') { const mrg = `databricks-rg-${x.nombre}-${uid(13)}`; s.dbw[x.nombre] = { rg, location: r.location || ubic, sku: ((r.sku || {}).name) || 'premium', url: `adb-${Math.floor(1e15 + Math.random() * 9e15)}.${Math.floor(Math.random() * 15) + 1}.azuredatabricks.net`, tags: r.tags || {}, creado: ahora(), rgAdministrado: mrg, props: {} }; s.groups[mrg] = { location: r.location || ubic, tags: {}, administradoPor: x.nombre }; actividad('Create or Update Databricks Workspace', x.nombre, 'Succeeded', { rg }); }
          else if (x.tipo === 'Microsoft.DataFactory/factories') { s.adf[x.nombre] = { ...(s.adf[x.nombre] || {}), rg, location: r.location || ubic, tags: r.tags || {}, creado: ahora(), props: { version: 'V2', red: 'public' } }; actividad('Create or Update Data Factory', x.nombre, 'Succeeded', { rg }); }
          else if (x.tipo.startsWith('Microsoft.DataFactory/factories/')) { if (!window.ADFStudio || !window.ADFStudio.importarObjeto) throw new Error('El Studio de Data Factory no está cargado.'); window.ADFStudio.importarObjeto(partes[0], x.tipo.split('/').pop(), partes[1], p); }
          row.estado = 'OK';
        } catch (e) { row.estado = 'Failed'; row.error = e.message; }
      }
      const malos = dep.recursos.filter((x) => x.estado === 'Failed');
      dep.estado = malos.length ? 'Failed' : 'Succeeded'; dep.fin = ahora(); if (malos.length) dep.error = malos.map((x) => `${x.nombre}: ${x.error}`).join('\n');
      guardarAz();
      notificar(malos.length ? 'Deployment failed' : 'Deployment succeeded', malos.length ? `${malos.length} resource(s) failed.` : `Deployment '${dep.nombre}' to resource group '${rg}' was successful.`, malos.length ? 'error' : 'ok', ['Go to resource group', 'grupo/' + encodeURIComponent(rg)]);
      if (location.hash === '#/azure/despliegue/' + dep.id) render(['despliegue', dep.id]);
    }, 2600);
  }
  // despliegue: queda "en progreso" unos segundos y después crea el recurso
  function desplegar(tipo, v) {
    const s = az(); s.deployments = s.deployments || [];
    const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const nombreDep = { grupo: 'Microsoft.ResourceGroup', storage: 'Microsoft.StorageAccount', kv: 'Microsoft.KeyVault', dbw: 'Microsoft.Databricks', adf: 'Microsoft.DataFactory' }[tipo] + '-' + ts;
    const dep = { id: uid(10), nombre: nombreDep, rg: tipo === 'grupo' ? v.name : v.rg, tipo, recurso: v.name, estado: 'Running', inicio: ahora(), sub: v.sub, plantilla: plantilla(tipo, v) };
    s.deployments.unshift(dep); s.deployments = s.deployments.slice(0, 100);
    if (tipo !== 'grupo' && v.rgNuevo && v.rg === v.rgNuevo && !s.groups[v.rg]) { s.groups[v.rg] = { location: v.location, tags: {} }; actividad('Create or Update Resource Group', v.rg); }
    guardarAz();
    notificar('Deployment in progress...', `Deployment to resource group '${dep.rg}' is in progress.`, 'progreso', ['Go to deployment', 'despliegue/' + dep.id]);
    ir('despliegue/' + dep.id);
    setTimeout(() => {
      try {
        const tags = Object.fromEntries(v.tags || []);
        if (tipo === 'grupo') { s.groups[v.name] = { location: v.location, tags }; actividad('Create or Update Resource Group', v.name); }
        if (tipo === 'storage') { s.storage[v.name] = { rg: v.rg, location: v.location, sku: `${v.performance}_${v.ra && /G/.test(v.redundancy) ? 'RA' : ''}${v.redundancy}`, kind: v.performance === 'Premium' ? 'BlockBlobStorage' : 'StorageV2', hns: !!v.hns, containers: {}, tags, creado: ahora(), props: { tier: v.tier, tls: v.tls, secure: v.secure, anonimo: v.anonimo, red: v.red, softBlob: v.softBlob, softDias: v.softDias, softCont: v.softCont, versioning: v.versioning }, keys: [uid(64), uid(64)] }; actividad('Create/Update Storage Account', v.name, 'Succeeded', { rg: v.rg }); }
        if (tipo === 'kv') { s.kv[v.name] = { rg: v.rg, location: v.location, secrets: {}, tags, creado: ahora(), props: { sku: v.sku, retencion: v.retencion, purga: String(v.purga) === 'true', permiso: v.permiso, red: v.red } }; actividad('Create or Update Key Vault', v.name, 'Succeeded', { rg: v.rg }); }
        if (tipo === 'dbw') { const mrg = v.mrg || `databricks-rg-${v.name}-${uid(13)}`; s.dbw[v.name] = { rg: v.rg, location: v.location, sku: v.sku, url: `adb-${Math.floor(1e15 + Math.random() * 9e15)}.${Math.floor(Math.random() * 15) + 1}.azuredatabricks.net`, tags, creado: ahora(), rgAdministrado: mrg, props: { npip: String(v.npip) === 'true', vnet: String(v.vnet) === 'true' } }; s.groups[mrg] = { location: v.location, tags: { application: 'databricks', 'databricks-environment': 'true' }, administradoPor: v.name }; actividad('Create or Update Workspace', v.name, 'Succeeded', { rg: v.rg }); }
        if (tipo === 'adf') { s.adf[v.name] = { rg: v.rg, location: v.location, tags, creado: ahora(), props: { version: 'V2', red: v.red } }; actividad('Create or Update Data Factory', v.name, 'Succeeded', { rg: v.rg }); }
        dep.estado = 'Succeeded'; dep.fin = ahora();
        guardarAz();
        const destino = tipo === 'grupo' ? 'grupo/' + encodeURIComponent(v.name) : `recurso/${tipo}/${encodeURIComponent(v.name)}`;
        notificar('Deployment succeeded', `Deployment '${dep.nombre}' to resource group '${dep.rg}' was successful.`, 'ok', ['Go to resource', destino]);
      } catch (e) { dep.estado = 'Failed'; dep.error = e.message; guardarAz(); notificar('Deployment failed', e.message, 'error', ['Go to deployment', 'despliegue/' + dep.id]); }
      if (location.hash === '#/azure/despliegue/' + dep.id) render(['despliegue', dep.id]);
    }, tipo === 'dbw' ? 4500 : 2200);
  }
  function hojaDespliegue(cont, r) {
    const dep = (az().deployments || []).find((d) => d.id === r[0]);
    if (!dep) return noEncontrado(cont);
    const ok = dep.estado === 'Succeeded', fallo = dep.estado === 'Failed';
    const destino = dep.tipo === 'grupo' || dep.tipo === 'plantilla' ? 'grupo/' + encodeURIComponent(dep.recurso) : `recurso/${dep.tipo}/${encodeURIComponent(dep.recurso)}`;
    cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], [dep.nombre, null]])}<div class="az-cab">${svg('actividad', 28)}<h1>${esc(dep.nombre)} | Overview</h1><small>Deployment</small></div>
      <div class="az-cmd"><button>${ic('trash')} Delete</button><button>${ic('circle-slash')} Cancel</button><button>${ic('refresh')} Redeploy</button><button id="dTpl">${ic('json')} Template</button><button onclick="location.reload()">${ic('refresh')} Refresh</button></div>
      <div class="az-dep ${ok ? 'ok' : fallo ? 'mal' : ''}">${ok ? ic('pass-filled') : fallo ? ic('error') : '<span class="az-gira grande"></span>'}<div><h2>${ok ? 'Your deployment is complete' : fallo ? 'Your deployment failed' : 'Deployment is in progress'}</h2><table class="az-kv"><tr><th>Deployment name</th><td>${esc(dep.nombre)}</td></tr><tr><th>Subscription</th><td>${esc((SUBS.find((s) => s.id === dep.sub) || sub()).name)}</td></tr><tr><th>Resource group</th><td><a href="#/azure/grupo/${encodeURIComponent(dep.rg)}">${esc(dep.rg)}</a></td></tr><tr><th>Start time</th><td>${hora(dep.inicio)}</td></tr></table></div></div>
      ${ok ? `<a class="az-btn primario" href="#/azure/${destino}">${dep.tipo === 'plantilla' ? 'Go to resource group' : 'Go to resource'}</a>` : ''}${fallo ? `<div class="az-banner error">${esc(dep.error || '')}</div>` : ''}
      <h3>Deployment details</h3><table class="az-tabla"><thead><tr><th>Resource</th><th>Type</th><th>Status</th></tr></thead><tbody>${dep.recursos ? dep.recursos.map((x) => `<tr><td>${esc(x.nombre)}</td><td>${esc(x.tipo)}</td><td>${x.estado === 'OK' ? `<span class="az-ok">${ic('pass-filled')} OK</span>` : x.estado === 'Failed' ? `<span class="az-mal" title="${esc(x.error || '')}">${ic('error')} ${esc((x.error || 'Failed').slice(0, 90))}</span>` : 'Running'}</td></tr>`).join('') : `<tr><td>${esc(dep.recurso)}</td><td>${esc(dep.plantilla.resources[0].type)}</td><td>${ok ? `<span class="az-ok">${ic('pass-filled')} OK</span>` : fallo ? 'Failed' : 'Created'}</td></tr>`}</tbody></table>
      <div class="az-banner info">${ic('info')} <span>Un despliegue de Azure Resource Manager aplica una plantilla ARM. Si lo repites con la misma plantilla no duplica recursos: es idempotente.</span></div></div>`;
    cont.querySelector('#dTpl').onclick = () => panel({ titulo: 'Template', ok: null, cancelar: 'Close', ancho: 760, cuerpo: `<pre class="az-code">${esc(JSON.stringify(dep.plantilla, null, 2))}</pre>` });
  }

  // ------------------------------------------------------------------ hojas (blades)
  function hoja(cont, { migas: m, icono, nombre, tipoTxt, menuItems, activo, contenido, ruta }) {
    cont.innerHTML = `<div class="az-hoja">${migas(m)}<div class="az-cab">${svg(icono, 30)}<div><h1>${esc(nombre)} <span class="az-cab-sep">|</span> <span class="az-cab-act">${esc((menuItems.flat().find((x) => x && x[0] === activo) || [, 'Overview'])[1])}</span></h1><small>${esc(tipoTxt)}</small></div><button class="az-tb2" title="Add to favorites">${ic('star-empty')}</button></div>
      <div class="az-hoja-cuerpo"><nav class="az-rmenu"><input placeholder="Search" class="az-rmenu-q">${menuItems.map((g) => (typeof g === 'string' ? `<div class="az-rmenu-sec">${esc(g)}</div>` : `<a href="#/azure/${ruta}/${g[0]}" class="${g[0] === activo ? 'on' : ''}">${ic(g[2] || 'circle-small')}<span>${esc(g[1])}</span></a>`)).join('')}</nav><section class="az-rcont" id="azRC"></section></div></div>`;
    cont.querySelector('.az-rmenu-q').oninput = (e) => { const q = e.target.value.toLowerCase(); cont.querySelectorAll('.az-rmenu a').forEach((a) => { a.hidden = q && !a.textContent.toLowerCase().includes(q); }); };
    contenido(cont.querySelector('#azRC'));
  }
  const essentials = (filas, json) => `<div class="az-ess"><div class="az-ess-cab"><button class="az-link" data-ess>${ic('chevron-up')} Essentials</button>${json ? '<button class="az-link" data-json>JSON View</button>' : ''}</div><div class="az-ess-grid">${filas.map(([a, b]) => `<div><span>${esc(a)}</span><b>${b}</b></div>`).join('')}</div></div>`;
  const enlazarJson = (box, obj) => { const b = box.querySelector('[data-json]'); if (b) b.onclick = () => panel({ titulo: 'Resource JSON', ok: null, cancelar: 'Close', ancho: 760, cuerpo: `<pre class="az-code">${esc(JSON.stringify(obj, null, 2))}</pre>` }); };
  const tagsHtml = (tags) => (Object.keys(tags || {}).length ? Object.entries(tags).map(([k, x]) => `<span class="az-chip">${esc(k)} : ${esc(x)}</span>`).join(' ') : '<a class="az-link" data-tags>Add tags</a>');

  // ---- grupo de recursos
  const MENU_RG = [['overview', 'Overview', 'home'], ['actividad', 'Activity log', 'list-unordered'], ['iam', 'Access control (IAM)', 'person'], ['tags', 'Tags', 'tag'], ['diagnostico', 'Resource visualizer', 'type-hierarchy'], 'Settings', ['despliegues', 'Deployments', 'cloud-upload'], ['locks', 'Locks', 'lock'], ['propiedades', 'Properties', 'list-flat'], 'Cost Management', ['costos', 'Cost analysis', 'graph']];
  function hojaGrupo(cont, r) {
    const n = r[0]; const g = az().groups[n];
    if (!g) return cont.innerHTML = `<div class="az-pag"><div class="az-banner error">${ic('error')} Resource group '${esc(n)}' could not be found.</div><a href="#/azure/grupos">Resource groups</a></div>`;
    reciente(n, 'grupo', 'grupo/' + encodeURIComponent(n));
    const id = rgId(n); const blade = r[1] || 'overview';
    hoja(cont, { migas: [['Home', ''], ['Resource groups', 'grupos'], [n, null]], icono: 'grupo', nombre: n, tipoTxt: 'Resource group', menuItems: MENU_RG, activo: blade, ruta: 'grupo/' + encodeURIComponent(n), contenido: (box) => {
      const lista = recursos().filter((x) => x.r.rg === n);
      if (blade === 'overview') {
        box.innerHTML = `<div class="az-cmd"><button data-c="crear">${ic('add')} Create</button><button data-c="borrarRg">${ic('trash')} Delete resource group</button><button data-c="ref">${ic('refresh')} Refresh</button><button data-c="borrar">${ic('trash')} Delete</button><button data-c="shell">${ic('terminal')} Open in Cloud Shell</button></div>
          ${essentials([['Subscription', `<a href="#/azure/suscripciones">${esc(sub().name)}</a>`], ['Deployments', `<a href="#/azure/grupo/${encodeURIComponent(n)}/despliegues">${(az().deployments || []).filter((d) => d.rg === n && d.estado === 'Succeeded').length} Succeeded</a>`], ['Subscription ID', sub().id], ['Location', esc(regionNombre(g.location))], ['Tags (edit)', tagsHtml(g.tags)], ...(g.administradoPor ? [['Managed by', `<a href="#/azure/recurso/dbw/${encodeURIComponent(g.administradoPor)}">${esc(g.administradoPor)}</a>`]] : [])], true)}
          ${g.administradoPor ? `<div class="az-banner aviso">${ic('lock')} Este grupo lo administra Azure Databricks (workspace ${esc(g.administradoPor)}). Tiene una <i>deny assignment</i>: no puedes borrar ni cambiar sus recursos; se borra junto con el workspace.</div>` : ''}
          <div class="az-pest"><a class="on">Resources</a><a href="#/azure/grupo/${encodeURIComponent(n)}/actividad">Recommendations</a></div>
          ${lista.length ? `<table class="az-tabla"><thead><tr><th></th><th>Name</th><th>Type</th><th>Location</th></tr></thead><tbody>${lista.map((x) => `<tr data-k="${x.k}" data-n="${esc(x.n)}"><td><input type="checkbox" class="az-sel"></td><td><a href="#/azure/recurso/${x.k}/${encodeURIComponent(x.n)}">${svg(x.k)} ${esc(x.n)}</a></td><td>${esc(x.d.nombre)}</td><td>${esc(regionNombre(x.r.location))}</td></tr>`).join('')}</tbody></table>` : g.administradoPor ? `<table class="az-tabla"><thead><tr><th>Name</th><th>Type</th></tr></thead><tbody><tr><td>workers-vnet</td><td>Virtual network</td></tr><tr><td>workers-sg</td><td>Network security group</td></tr><tr><td>dbstorage${uid(13)}</td><td>Storage account (DBFS raíz del workspace)</td></tr><tr><td>unity-catalog-access-connector</td><td>Access Connector for Azure Databricks</td></tr></tbody></table>` : `<div class="az-vacio">${svg('todos', 48)}<p>No resources to display</p><a class="az-btn primario" href="#/azure/crear">Create resources</a></div>`}`;
        enlazarJson(box, { id, name: n, type: 'Microsoft.Resources/resourceGroups', location: g.location, tags: g.tags || {}, properties: { provisioningState: 'Succeeded' }, ...(g.administradoPor ? { managedBy: idRecurso('dbw', g.administradoPor, az().dbw[g.administradoPor] || { rg: '?' }) } : {}) });
        const t = box.querySelector('[data-tags]'); if (t) t.onclick = () => ir(`grupo/${encodeURIComponent(n)}/tags`);
        box.querySelector('.az-cmd').onclick = (e) => {
          const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c;
          if (c === 'crear') ir('crear'); if (c === 'ref') hojaGrupo(cont, r); if (c === 'shell') cloudShell(`az resource list -g ${n} -o table`);
          if (c === 'borrar') borrarSeleccion(box, () => hojaGrupo(cont, r));
          if (c === 'borrarRg') borrarGrupo(n);
        };
      }
      if (blade === 'actividad') registroActividad(box, [], (a) => a.rg === n || a.recurso === n);
      if (blade === 'iam') iam(box, id, n);
      if (blade === 'tags') editarTags(box, g.tags || (g.tags = {}), `Resource group ${n}`, () => hojaGrupo(cont, r));
      if (blade === 'locks') locksHtml(box, id, () => hojaGrupo(cont, r));
      if (blade === 'despliegues') { const ds = (az().deployments || []).filter((d) => d.rg === n); box.innerHTML = `<div class="az-cmd"><button onclick="location.reload()">${ic('refresh')} Refresh</button></div>${ds.length ? `<table class="az-tabla"><thead><tr><th>Deployment name</th><th>Status</th><th>Last modified</th><th>Duration</th></tr></thead><tbody>${ds.map((d) => `<tr><td><a href="#/azure/despliegue/${d.id}">${esc(d.nombre)}</a></td><td>${d.estado === 'Succeeded' ? `<span class="az-ok">${ic('pass-filled')} Succeeded</span>` : esc(d.estado)}</td><td>${hora(d.fin || d.inicio)}</td><td>${d.fin ? Math.round((new Date(d.fin) - new Date(d.inicio)) / 1000) + ' seconds' : '-'}</td></tr>`).join('')}</tbody></table>` : '<p class="az-dim">No deployments.</p>'}`; }
      if (blade === 'propiedades') box.innerHTML = `<table class="az-kv"><tr><th>Name</th><td>${esc(n)}</td></tr><tr><th>Location</th><td>${esc(regionNombre(g.location))}</td></tr><tr><th>Resource ID</th><td><code>${esc(id)}</code></td></tr><tr><th>Provisioning state</th><td>Succeeded</td></tr></table>`;
      if (blade === 'diagnostico') box.innerHTML = `<div class="az-viz">${svg('grupo', 40)}<b>${esc(n)}</b><div class="az-viz-h">${lista.map((x) => `<a href="#/azure/recurso/${x.k}/${encodeURIComponent(x.n)}">${svg(x.k, 28)}<span>${esc(x.n)}</span></a>`).join('') || '<span class="az-dim">Sin recursos</span>'}</div></div>`;
      if (blade === 'costos') costos(box, [], n);
    } });
  }
  function borrarGrupo(n) {
    const g = az().groups[n]; const id = rgId(n);
    if (g.administradoPor) return notificar(`Failed to delete resource group ${n}`, `The access is denied because of the deny assignment with name 'System deny assignment created by Azure Databricks ${idRecurso('dbw', g.administradoPor, az().dbw[g.administradoPor] || { rg: '?' })}' and Id '${uid(32)}' at scope '${id}'. Borra el workspace de Databricks para borrar este grupo.`, 'error');
    const lista = recursos().filter((x) => x.r.rg === n);
    panel({ titulo: 'Delete a resource group', ok: 'Delete', peligro: true, ancho: 520, cuerpo: `<div class="az-banner error">${ic('warning')} The following resource group and all its dependent resources will be permanently deleted.</div><p><b>Resource group to be deleted:</b> ${esc(n)}</p><p><b>Dependent resources to be deleted (${lista.length}):</b></p><ul>${lista.map((x) => `<li>${esc(x.n)} <small>(${esc(x.d.nombre)})</small></li>`).join('') || '<li class="az-dim">Ninguno</li>'}</ul><label class="az-campo"><span>Enter resource group name to confirm deletion *</span><input id="dC" autocomplete="off"></label>`, alOk: (p) => {
      if (p.querySelector('#dC').value !== n) throw new Error('The value must match the resource group name.');
      const l = bloqueado(id) || lista.map((x) => bloqueado(idRecurso(x.k, x.n, x.r))).find(Boolean);
      if (l) { notificar(`Failed to delete resource group ${n}`, `The scope '${id}' cannot perform delete operation because following scope(s) are locked: '${l.scope}'. Please remove the lock and try again. (ScopeLocked)`, 'error'); actividad('Delete Resource Group', n, 'Failed', { rg: n }); return; }
      notificar('Deleting resource group', `Deleting resource group ${n}...`, 'progreso');
      ir('grupos');
      setTimeout(() => { const s = az(); for (const x of lista) { if (x.k === 'dbw' && x.r.rgAdministrado) delete s.groups[x.r.rgAdministrado]; delete s[x.k][x.n]; } delete s.groups[n]; s.locks = bloqueos().filter((l2) => !l2.scope.startsWith(id)); actividad('Delete Resource Group', n, 'Succeeded', { rg: n }); guardarAz(); notificar('Deleted resource group', `Successfully deleted resource group ${n}.`, 'ok'); if (location.hash === '#/azure/grupos') render(['grupos']); }, 1800);
    } });
  }
  function editarTags(box, tags, nombre, despues) {
    const filas = Object.entries(tags);
    box.innerHTML = `<p class="az-dim">Tags are name/value pairs that enable you to categorize resources and view consolidated billing by applying the same tag to multiple resources and resource groups. Por ejemplo: <code>environment=dev</code>, <code>owner=equipo-datos</code>, <code>costcenter=1234</code>.</p><table class="az-tabla az-tags"><thead><tr><th>Name</th><th>Value</th><th></th></tr></thead><tbody>${[...filas, ['', '']].map(([a, b], i) => `<tr><td><input data-i="${i}" data-p="0" value="${esc(a)}"></td><td><input data-i="${i}" data-p="1" value="${esc(b)}"></td><td>${i < filas.length ? `<button class="az-tb2" data-q="${i}">${ic('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table><div class="az-pie-btn"><button class="az-btn primario" id="tGuardar">Apply</button></div>`;
    const leer = () => { const out = []; box.querySelectorAll('tbody tr').forEach((tr) => { const [a, b] = [...tr.querySelectorAll('input')].map((x) => x.value.trim()); if (a) out.push([a, b]); }); return out; };
    box.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { b.closest('tr').remove(); });
    box.querySelector('#tGuardar').onclick = () => { const nuevo = leer(); if (nuevo.some(([a]) => /[<>%&\\?/]/.test(a))) return toast('El nombre de la etiqueta no puede tener < > % & \\ ? /'); for (const k of Object.keys(tags)) delete tags[k]; for (const [a, b] of nuevo) tags[a] = b; actividad('Update tags', nombre); guardarAz(); notificar('Tags updated', `Se actualizaron las etiquetas de ${nombre}.`, 'ok'); despues(); };
  }
  function locksHtml(box, scope, despues) {
    const propios = bloqueos().filter((l) => l.scope === scope), heredados = bloqueos().filter((l) => l.scope !== scope && scope.startsWith(l.scope + '/'));
    box.innerHTML = `<div class="az-cmd"><button id="lAdd">${ic('add')} Add</button></div><p class="az-dim">Un bloqueo protege de borrados (<b>Delete</b> = CanNotDelete) o de cualquier cambio (<b>Read-only</b>) aunque tengas permisos de Owner. Se hereda hacia los recursos de adentro.</p><table class="az-tabla"><thead><tr><th>Lock name</th><th>Lock type</th><th>Scope</th><th>Notes</th><th></th></tr></thead><tbody>${[...propios, ...heredados].map((l, i) => `<tr><td>${esc(l.nombre)}</td><td>${l.nivel === 'CanNotDelete' ? 'Delete' : 'Read-only'}</td><td>${l.scope === scope ? 'This resource' : 'Inherited'}</td><td>${esc(l.notas || '')}</td><td>${i < propios.length ? `<button class="az-tb2" data-q="${esc(l.nombre)}">${ic('trash')}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="az-dim">This resource has no locks.</td></tr>'}</tbody></table>`;
    box.querySelector('#lAdd').onclick = () => panel({ titulo: 'Add lock', ok: 'OK', cuerpo: '<label class="az-campo"><span>Lock name *</span><input id="lN" value="no-borrar"></label><label class="az-campo"><span>Lock type *</span><select id="lT"><option value="CanNotDelete">Delete</option><option value="ReadOnly">Read-only</option></select></label><label class="az-campo"><span>Notes</span><input id="lO"></label>', alOk: (p) => { const n = p.querySelector('#lN').value.trim(); if (!n) throw new Error('Ponle un nombre.'); bloqueos().push({ scope, nombre: n, nivel: p.querySelector('#lT').value, notas: p.querySelector('#lO').value }); actividad('Create management lock', n); guardarAz(); despues(); } });
    box.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { const s = az(); s.locks = bloqueos().filter((l) => !(l.scope === scope && l.nombre === b.dataset.q)); actividad('Delete management lock', b.dataset.q); guardarAz(); despues(); });
  }
  // ---- Access control (IAM)
  function iam(box, scope, nombre) {
    let pest = 'asign';
    const pintar = () => {
      const asg = asignaciones().filter((a) => scope === a.scope || scope.startsWith(a.scope + '/'));
      box.innerHTML = `<div class="az-cmd"><button id="iAdd">${ic('add')} Add role assignment</button><button onclick="location.reload()">${ic('refresh')} Refresh</button></div>
        <div class="az-pest"><a class="${pest === 'check' ? 'on' : ''}" data-p="check">Check access</a><a class="${pest === 'asign' ? 'on' : ''}" data-p="asign">Role assignments</a><a class="${pest === 'roles' ? 'on' : ''}" data-p="roles">Roles</a></div>
        ${pest === 'asign' ? `<table class="az-tabla"><thead><tr><th>Name</th><th>Type</th><th>Role</th><th>Scope</th><th></th></tr></thead><tbody>${asg.map((a) => { const p0 = principales().find((x) => x[0] === a.principalName) || [a.principalName, 'User', a.principalName]; return `<tr><td>${ic(p0[1] === 'Group' ? 'organization' : p0[1] === 'User' ? 'person' : 'key')} ${esc(p0[2])}<br><small>${esc(a.principalName)}</small></td><td>${esc(p0[1])}</td><td>${esc(a.roleDefinitionName)}</td><td>${a.scope === scope ? 'This resource' : a.scope.split('/').length <= 3 ? 'Subscription (Inherited)' : 'Resource group (Inherited)'}</td><td>${!a.implicita && a.scope === scope ? `<button class="az-tb2" data-q="${esc(a.id)}">${ic('trash')}</button>` : ''}</td></tr>`; }).join('')}</tbody></table>`
        : pest === 'roles' ? `<table class="az-tabla"><thead><tr><th>Name</th><th>Description</th><th>Type</th></tr></thead><tbody>${ROLES.map((r) => `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[2])}</td><td>BuiltInRole · ${esc(r[1])}</td></tr>`).join('')}</tbody></table>`
        : `<p class="az-dim">Revisa qué roles tiene alguien sobre este recurso (incluidos los heredados).</p><select id="iChk">${principales().map((x) => `<option value="${esc(x[0])}">${esc(x[2])} (${esc(x[1])})</option>`).join('')}</select><div id="iRes" style="margin-top:10px"></div>`}`;
      box.querySelectorAll('[data-p]').forEach((a) => { a.onclick = () => { pest = a.dataset.p; pintar(); }; });
      box.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { const s = az(); s.roles = (s.roles || []).filter((x) => x.id !== b.dataset.q); actividad('Delete role assignment', nombre); guardarAz(); pintar(); });
      const chk = box.querySelector('#iChk'); if (chk) { const pinta = () => { const q = chk.value; const rs = asignaciones().filter((a) => a.principalName === q && (scope === a.scope || scope.startsWith(a.scope + '/'))); box.querySelector('#iRes').innerHTML = rs.length ? `<table class="az-tabla"><tbody>${rs.map((a) => `<tr><td>${esc(a.roleDefinitionName)}</td><td><code>${esc(a.scope)}</code></td></tr>`).join('')}</tbody></table>` : '<p>No role assignments for this principal at this scope.</p>'; }; chk.onchange = pinta; pinta(); }
      box.querySelector('#iAdd').onclick = () => {
        let rolSel = null;
        panel({ titulo: 'Add role assignment', ok: 'Review + assign', ancho: 640, cuerpo: `<p class="az-dim">Un rol es un conjunto de permisos. Los roles <b>de datos</b> (Storage Blob Data…, Key Vault Secrets…) dan acceso al contenido; Owner y Contributor administran el recurso pero no leen sus datos.</p><input id="rQ" placeholder="Search by role name or description" class="az-input"><div class="az-roles" id="rL"></div><label class="az-campo"><span>Assign access to</span><select id="rM"><option>User, group, or service principal</option><option>Managed identity</option></select></label><label class="az-campo"><span>Members *</span><select id="rP">${principales().map((x) => `<option value="${esc(x[0])}">${esc(x[2])} — ${esc(x[0])}</option>`).join('')}</select></label>`, alAbrir: (p) => {
          const lista = (q = '') => { p.querySelector('#rL').innerHTML = ROLES.filter((r) => !q || (r[0] + r[2]).toLowerCase().includes(q)).map((r) => `<label class="az-rol ${rolSel === r[0] ? 'on' : ''}"><input type="radio" name="rol" value="${esc(r[0])}" ${rolSel === r[0] ? 'checked' : ''}><span><b>${esc(r[0])}</b><small>${esc(r[2])}</small></span><em>${esc(r[1])}</em></label>`).join(''); p.querySelectorAll('[name=rol]').forEach((x) => { x.onchange = () => { rolSel = x.value; }; }); };
          p.querySelector('#rQ').oninput = (e) => lista(e.target.value.toLowerCase()); lista();
        }, alOk: (p) => {
          if (!rolSel) throw new Error('Elige un rol.');
          const quien = p.querySelector('#rP').value; const s = az(); s.roles = s.roles || [];
          if (asignaciones().some((a) => a.principalName === quien && a.roleDefinitionName === rolSel && a.scope === scope)) throw new Error('The role assignment already exists. (RoleAssignmentExists)');
          s.roles.push({ principalName: quien, roleDefinitionName: rolSel, scope, id: uid(32) }); actividad('Create role assignment', nombre); guardarAz(); notificar('Added Role assignment', `${quien} was added as ${rolSel} for ${nombre}.`, 'ok'); pintar();
        } });
      };
    };
    pintar();
  }

  // ---- recursos
  const MENU_BASE = [['overview', 'Overview', 'home'], ['actividad', 'Activity log', 'list-unordered'], ['tags', 'Tags', 'tag'], ['iam', 'Access control (IAM)', 'person']];
  const MENUS = {
    storage: [...MENU_BASE, ['navegador', 'Storage browser', 'folder'], 'Data storage', ['contenedores', 'Containers', 'package'], ['archivos', 'File shares', 'file-submodule'], ['colas', 'Queues', 'list-ordered'], ['tablas', 'Tables', 'table'], 'Security + networking', ['red', 'Networking', 'globe'], ['claves', 'Access keys', 'key'], ['sas', 'Shared access signature', 'link'], ['cifrado', 'Encryption', 'shield'], 'Data management', ['proteccion', 'Data protection', 'history'], ['ciclo', 'Lifecycle management', 'sync'], 'Settings', ['config', 'Configuration', 'gear'], ['locks', 'Locks', 'lock']],
    kv: [...MENU_BASE, 'Objects', ['claves', 'Keys', 'key'], ['secretos', 'Secrets', 'symbol-key'], ['certificados', 'Certificates', 'workspace-trusted'], 'Settings', ['acceso', 'Access configuration', 'shield'], ['red', 'Networking', 'globe'], ['propiedades', 'Properties', 'list-flat'], ['locks', 'Locks', 'lock']],
    dbw: [...MENU_BASE, 'Settings', ['red', 'Networking', 'globe'], ['cifrado', 'Encryption', 'shield'], ['propiedades', 'Properties', 'list-flat'], ['locks', 'Locks', 'lock']],
    adf: [...MENU_BASE, 'Settings', ['git', 'Git configuration', 'git-branch'], ['identidad', 'Identity', 'person'], ['red', 'Networking', 'globe'], ['propiedades', 'Properties', 'list-flat'], ['locks', 'Locks', 'lock']],
    eh: [...MENU_BASE, ['propiedades', 'Properties', 'list-flat'], ['locks', 'Locks', 'lock']],
  };
  function hojaRecurso(cont, r) {
    const [k, n, blade = 'overview', ...resto] = r; const R = az()[k] && az()[k][n]; const d = TIPOS[k];
    if (!R || !d) return cont.innerHTML = `<div class="az-pag"><div class="az-banner error">${ic('error')} The resource '${esc(n)}' could not be found. Puede que se haya borrado.</div><a href="#/azure/recursos">All resources</a></div>`;
    reciente(n, k, `recurso/${k}/${encodeURIComponent(n)}`);
    const id = idRecurso(k, n, R);
    R.tags = R.tags || {};
    hoja(cont, { migas: [['Home', ''], [d.plural, 'servicio/' + k], [n, null]], icono: k, nombre: n, tipoTxt: d.nombre, menuItems: MENUS[k], activo: blade, ruta: `recurso/${k}/${encodeURIComponent(n)}`, contenido: (box) => {
      const again = () => hojaRecurso(cont, r);
      if (blade === 'actividad') return registroActividad(box, [], (a) => a.recurso === n);
      if (blade === 'tags') return editarTags(box, R.tags, n, again);
      if (blade === 'iam') return iam(box, id, n);
      if (blade === 'locks') return locksHtml(box, id, again);
      if (blade === 'propiedades') { box.innerHTML = `<table class="az-kv"><tr><th>Name</th><td>${esc(n)}</td></tr><tr><th>Resource ID</th><td><code>${esc(id)}</code></td></tr><tr><th>Location</th><td>${esc(regionNombre(R.location))}</td></tr><tr><th>Subscription</th><td>${esc(sub().name)}</td></tr>${k === 'kv' ? `<tr><th>Vault URI</th><td><code>https://${esc(n)}.vault.azure.net/</code></td></tr>` : ''}</table>`; return; }
      const comun = [['Resource group (move)', `<a href="#/azure/grupo/${encodeURIComponent(R.rg)}">${esc(R.rg)}</a>`], ['Location', esc(regionNombre(R.location))], ['Subscription (move)', `<a href="#/azure/suscripciones">${esc(sub().name)}</a>`], ['Subscription ID', sub().id], ['Tags (edit)', tagsHtml(R.tags)]];
      const cmdBorrar = `<button data-c="borrar">${ic('trash')} Delete</button><button data-c="ref">${ic('refresh')} Refresh</button>`;
      const enlazarCmd = (extra = {}) => { const c = box.querySelector('.az-cmd'); if (c) c.onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; if (b.dataset.c === 'borrar') { panel({ titulo: `Delete ${d.nombre.toLowerCase()}`, ok: 'Delete', peligro: true, cuerpo: `<p>¿Borrar <b>${esc(n)}</b>?${k === 'dbw' ? ' También se borra el grupo de recursos administrado y todo lo que contiene.' : k === 'kv' ? ` Con soft delete, el vault se puede recuperar durante ${R.props ? R.props.retencion : 90} días.` : ''}</p>`, alOk: () => { if (borrarRecurso(k, n)) ir('servicio/' + k); } }); } else if (b.dataset.c === 'ref') again(); else if (extra[b.dataset.c]) extra[b.dataset.c](); }; const t = box.querySelector('[data-tags]'); if (t) t.onclick = () => ir(`recurso/${k}/${encodeURIComponent(n)}/tags`); };
      if (k === 'storage') return blStorage(box, { R, n, id, blade, resto, comun, cmdBorrar, enlazarCmd, again });
      if (k === 'kv') return blKv(box, { R, n, id, blade, comun, cmdBorrar, enlazarCmd, again });
      if (k === 'dbw') {
        if (blade === 'overview') { box.innerHTML = `<div class="az-cmd">${cmdBorrar}</div>${essentials([...comun.slice(0, 2), ['Status', '<span class="az-ok">Active</span>'], ['Managed Resource Group', R.rgAdministrado ? `<a href="#/azure/grupo/${encodeURIComponent(R.rgAdministrado)}">${esc(R.rgAdministrado)}</a>` : '-'], ['URL', `<code>https://${esc(R.url)}</code>`], ['Pricing Tier', R.sku === 'trial' ? 'trial' : 'premium'], ...comun.slice(2)], true)}<div class="az-launch"><div>${svg('dbw', 64)}</div><div><h2>Azure Databricks</h2><p>Abre el workspace para crear notebooks, clusters, jobs y explorar Unity Catalog.</p><a class="az-btn primario grande" href="#/databricks" id="dbLaunch">Launch Workspace</a></div></div><div class="az-banner info">${ic('info')} <span>El portal administra el <b>recurso</b> de Azure (red, cifrado, permisos, costo de las VMs). Lo de adentro (notebooks, clusters, tablas) se administra en el workspace o con la CLI <code>databricks</code>.</span></div>`; enlazarJson(box, { id, name: n, type: d.tipo, location: R.location, sku: { name: R.sku }, properties: { workspaceUrl: R.url, managedResourceGroupId: rgId(R.rgAdministrado || ''), provisioningState: 'Succeeded', parameters: { enableNoPublicIp: { value: !!(R.props || {}).npip } } } }); enlazarCmd(); return; }
        if (blade === 'red') { box.innerHTML = `<table class="az-kv"><tr><th>Secure Cluster Connectivity (No Public IP)</th><td>${(R.props || {}).npip ? 'Enabled' : 'Disabled'}</td></tr><tr><th>VNet injection</th><td>${(R.props || {}).vnet ? 'Yes' : 'No (managed VNet)'}</td></tr><tr><th>Public network access</th><td>Enabled</td></tr></table>`; return; }
        if (blade === 'cifrado') { box.innerHTML = '<p>Managed services encryption: Microsoft-managed keys.</p><p class="az-dim">Con claves administradas por el cliente, la clave vive en tu Key Vault.</p>'; return; }
      }
      if (k === 'adf') {
        if (blade === 'overview') { box.innerHTML = `<div class="az-cmd">${cmdBorrar}</div>${essentials([...comun.slice(0, 2), ['Status', '<span class="az-ok">Succeeded</span>'], ['Type', 'Data factory (V2)'], ...comun.slice(2)], true)}<div class="az-launch"><div>${svg('adf', 64)}</div><div><h2>Azure Data Factory Studio</h2><p>Studio es donde se diseñan pipelines (Copy data, Data flow, Databricks Notebook), linked services, datasets y triggers.</p><button class="az-btn primario grande" id="adfStudio">Launch studio</button></div></div>`; box.querySelector('#adfStudio').onclick = () => { location.hash = '#/azure/studio/' + encodeURIComponent(n); }; enlazarJson(box, { id, name: n, type: d.tipo, location: R.location, identity: { type: 'SystemAssigned', principalId: uid(8) + '-' + uid(4) + '-' + uid(4) + '-' + uid(4) + '-' + uid(12) }, properties: { provisioningState: 'Succeeded', createTime: R.creado, version: '2018-06-01' } }); enlazarCmd(); return; }
        if (blade === 'git') { box.innerHTML = '<p>No hay un repositorio Git configurado.</p><p class="az-dim">Con Git, el Studio guarda los cambios en una rama (collaboration branch) y publica a la rama <code>adf_publish</code> las plantillas ARM para CI/CD.</p>'; return; }
        if (blade === 'identidad') { box.innerHTML = '<p><b>System assigned</b>: Status On.</p><p class="az-dim">Esta identidad administrada es la que conviene usar para que el factory lea tu storage (con el rol Storage Blob Data Reader), sin claves.</p>'; return; }
        if (blade === 'red') { box.innerHTML = `<p>Connectivity: ${(R.props || {}).red === 'private' ? 'Private endpoint' : 'Public endpoint'}</p>`; return; }
      }
      if (blade === 'overview') { box.innerHTML = `<div class="az-cmd">${cmdBorrar}</div>${essentials([...comun], true)}`; enlazarJson(box, { id, name: n, type: d.tipo, location: R.location, tags: R.tags }); enlazarCmd(); return; }
      box.innerHTML = '<p class="az-dim">Esta sección no está simulada.</p>';
    } });
  }
  // ---- Storage
  function blStorage(box, { R, n, id, blade, resto, comun, cmdBorrar, enlazarCmd, again }) {
    const P = R.props || (R.props = {}); R.containers = R.containers || {}; R.keys = R.keys || [uid(64), uid(64)];
    const key = (i) => btoa(R.keys[i]).slice(0, 86) + '==';
    if (blade === 'overview') {
      box.innerHTML = `<div class="az-cmd"><button data-c="shell">${ic('terminal')} Open in Cloud Shell</button>${cmdBorrar}</div>${essentials([...comun.slice(0, 2), ['Performance', esc((R.sku || 'Standard_LRS').split('_')[0])], ['Replication', esc({ LRS: 'Locally-redundant storage (LRS)', ZRS: 'Zone-redundant storage (ZRS)', GRS: 'Geo-redundant storage (GRS)', RAGRS: 'Read-access geo-redundant storage (RA-GRS)', GZRS: 'Geo-zone-redundant storage (GZRS)', RAGZRS: 'Read-access geo-zone-redundant storage (RA-GZRS)' }[(R.sku || 'Standard_LRS').split('_')[1]] || R.sku)], ['Account kind', esc(R.kind || 'StorageV2')], ['Hierarchical namespace', R.hns ? 'Enabled' : 'Disabled'], ...comun.slice(2)], true)}
        <div class="az-pest"><a class="on">Properties</a></div><div class="az-props"><div><h4>${ic('package')} Blob service</h4><table class="az-kv"><tr><th>Hierarchical namespace</th><td>${R.hns ? 'Enabled' : 'Disabled'}</td></tr><tr><th>Default access tier</th><td>${esc(P.tier || 'Hot')}</td></tr><tr><th>Blob anonymous access</th><td>${P.anonimo ? 'Enabled' : 'Disabled'}</td></tr><tr><th>Blob soft delete</th><td>${P.softBlob !== false ? `Enabled (${P.softDias || 7} days)` : 'Disabled'}</td></tr><tr><th>Versioning</th><td>${P.versioning ? 'Enabled' : 'Disabled'}</td></tr></table></div><div><h4>${ic('shield')} Security</h4><table class="az-kv"><tr><th>Require secure transfer</th><td>${P.secure !== false ? 'Enabled' : 'Disabled'}</td></tr><tr><th>Minimum TLS version</th><td>${esc(P.tls === 'TLS1_3' ? 'Version 1.3' : 'Version 1.2')}</td></tr><tr><th>Public network access</th><td>${P.red === 'disabled' ? 'Disabled' : P.red === 'selected' ? 'Enabled from selected virtual networks' : 'Enabled from all networks'}</td></tr></table></div></div>
        <h4>Endpoints</h4><table class="az-kv"><tr><th>Blob service</th><td><code>https://${esc(n)}.blob.core.windows.net/</code></td></tr>${R.hns ? `<tr><th>Data Lake Storage</th><td><code>https://${esc(n)}.dfs.core.windows.net/</code></td></tr><tr><th>Desde Databricks (abfss)</th><td><code>abfss://&lt;contenedor&gt;@${esc(n)}.dfs.core.windows.net/&lt;ruta&gt;</code></td></tr>` : ''}</table>`;
      enlazarJson(box, { id, name: n, type: 'Microsoft.Storage/storageAccounts', location: R.location, sku: { name: R.sku, tier: (R.sku || '').split('_')[0] }, kind: R.kind, properties: { isHnsEnabled: !!R.hns, accessTier: P.tier || 'Hot', minimumTlsVersion: P.tls || 'TLS1_2', supportsHttpsTrafficOnly: P.secure !== false, allowBlobPublicAccess: !!P.anonimo, primaryEndpoints: { blob: `https://${n}.blob.core.windows.net/`, dfs: `https://${n}.dfs.core.windows.net/` } } });
      enlazarCmd({ shell: () => cloudShell(`az storage container list --account-name ${n} --auth-mode login -o table`) });
      return;
    }
    if (blade === 'contenedores' || blade === 'navegador') {
      const cn = resto[0];
      if (!cn) {
        box.innerHTML = `<div class="az-cmd"><button id="cAdd">${ic('add')} Container</button><button onclick="location.reload()">${ic('refresh')} Refresh</button></div>${Object.keys(R.containers).length ? `<table class="az-tabla"><thead><tr><th>Name</th><th>Last modified</th><th>Anonymous access level</th><th>Lease state</th><th></th></tr></thead><tbody>${Object.entries(R.containers).map(([c, x]) => `<tr><td><a href="#/azure/recurso/storage/${encodeURIComponent(n)}/contenedores/${encodeURIComponent(c)}">${ic('package')} ${esc(c)}</a></td><td>${hora(x.creado || ahora())}</td><td>${esc(x.acceso || 'Private')}</td><td>Available</td><td><button class="az-tb2" data-q="${esc(c)}">${ic('trash')}</button></td></tr>`).join('')}</tbody></table>` : `<div class="az-vacio">${ic('package')}<p>You don't have any containers yet. Un contenedor agrupa blobs, como una carpeta raíz. ${R.hns ? 'Con ADLS Gen2 se llaman también <i>file systems</i>.' : ''}</p></div>`}`;
        box.querySelector('#cAdd').onclick = () => panel({ titulo: 'New container', ok: 'Create', cuerpo: `<label class="az-campo"><span>Name *</span><input id="cN" placeholder="raw"></label><label class="az-campo"><span>Anonymous access level</span><select id="cA" ${P.anonimo ? '' : 'disabled'}><option>Private (no anonymous access)</option><option>Blob (anonymous read access for blobs only)</option><option>Container (anonymous read access for containers and blobs)</option></select></label>${P.anonimo ? '' : '<p class="az-dim">El acceso anónimo está deshabilitado en esta cuenta (es lo recomendado).</p>'}`, alOk: (p) => {
          const c = p.querySelector('#cN').value.trim();
          if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,62}$/.test(c)) throw new Error('This name may only contain lowercase letters, numbers, and hyphens, and must begin with a letter or a number. Each hyphen must be preceded and followed by a non-hyphen character. The name must also be between 3 and 63 characters long.');
          if (R.containers[c]) throw new Error('A container with this name already exists.');
          R.containers[c] = { blobs: {}, creado: ahora(), acceso: p.querySelector('#cA').value.split(' ')[0] }; actividad('Create container', `${n}/${c}`); guardarAz(); again();
        } });
        box.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { if (!confirm(`¿Borrar el contenedor ${b.dataset.q} y todos sus blobs?`)) return; delete R.containers[b.dataset.q]; actividad('Delete container', `${n}/${b.dataset.q}`); guardarAz(); again(); });
        return;
      }
      const C = R.containers[cn]; if (!C) { box.innerHTML = `<div class="az-banner error">The specified container does not exist. (ContainerNotFound)</div>`; return; }
      C.auth = C.auth || 'key';
      const tieneDatos = tieneRol(id, ['Storage Blob Data Owner', 'Storage Blob Data Contributor', 'Storage Blob Data Reader']);
      const puedeEscribir = C.auth === 'key' || tieneRol(id, ['Storage Blob Data Owner', 'Storage Blob Data Contributor']);
      box.innerHTML = `<div class="az-migas chico"><a href="#/azure/recurso/storage/${encodeURIComponent(n)}/contenedores">Containers</a><i>${ic('chevron-right')}</i><span>${esc(cn)}</span></div><div class="az-cmd"><button id="bUp" ${puedeEscribir ? '' : 'disabled'}>${ic('cloud-upload')} Upload</button><button onclick="location.reload()">${ic('refresh')} Refresh</button><button id="bDel">${ic('trash')} Delete</button></div>
        <div class="az-auth">Authentication method: <b>${C.auth === 'key' ? 'Access key' : 'Microsoft Entra user account'}</b> <a class="az-link" id="bAuth">(Switch to ${C.auth === 'key' ? 'Microsoft Entra user account' : 'Access key'})</a></div>
        ${C.auth === 'entra' && !tieneDatos ? `<div class="az-banner error">${ic('error')} <span>You do not have permissions to list the data using your user account with Microsoft Entra ID. Click to learn more about authenticating with Microsoft Entra ID.<br><small>Ser Owner no alcanza: asigna el rol <b>Storage Blob Data Reader</b> (o Contributor) en <a href="#/azure/recurso/storage/${encodeURIComponent(n)}/iam">Access control (IAM)</a>.</small></span></div>` : `${Object.keys(C.blobs).length ? `<table class="az-tabla"><thead><tr><th></th><th>Name</th><th>Modified</th><th>Access tier</th><th>Blob type</th><th>Size</th></tr></thead><tbody>${Object.entries(C.blobs).map(([b, v]) => `<tr data-b="${esc(b)}"><td><input type="checkbox" class="az-sel"></td><td>${ic('file')} ${esc(b)}</td><td>${hora(ahora())}</td><td>${esc(P.tier || 'Hot')} (Inferred)</td><td>Block blob</td><td>${String(v).length.toLocaleString('es')} B</td></tr>`).join('')}</tbody></table>` : '<p class="az-dim">No results. Sube un archivo con <b>Upload</b> o con <code>az storage blob upload</code>.</p>'}`}`;
      box.querySelector('#bAuth').onclick = () => { C.auth = C.auth === 'key' ? 'entra' : 'key'; guardarAz(); again(); };
      box.querySelector('#bUp').onclick = () => panel({ titulo: 'Upload blob', ok: 'Upload', cuerpo: `<label class="az-campo"><span>Files</span><input type="file" id="uF" multiple></label><label class="az-campo"><span>Upload to folder</span><input id="uD" placeholder="(opcional) 2026/11"></label><label class="az-check"><input type="checkbox" id="uO"> Overwrite if files already exist</label>`, alOk: async (p) => {
        const fs = [...p.querySelector('#uF').files]; if (!fs.length) throw new Error('Elige al menos un archivo.');
        const dir = p.querySelector('#uD').value.trim().replace(/^\/|\/$/g, '');
        for (const f of fs) { if (f.size > 3e6) throw new Error(`${f.name}: en la práctica el límite es 3 MB por archivo.`); const nb = (dir ? dir + '/' : '') + f.name; if (C.blobs[nb] !== undefined && !p.querySelector('#uO').checked) throw new Error(`The specified blob already exists: ${nb}`); C.blobs[nb] = await f.text(); }
        actividad('Upload blob', `${n}/${cn}`); guardarAz(); notificar('Upload completed', `Se subieron ${fs.length} archivo(s) a ${cn}.`, 'ok'); again();
      } });
      box.querySelector('#bDel').onclick = () => { const sel = [...box.querySelectorAll('tr[data-b] .az-sel:checked')].map((c) => c.closest('tr').dataset.b); if (!sel.length) return toast('Selecciona los blobs'); for (const b of sel) delete C.blobs[b]; actividad('Delete blob', `${n}/${cn}`); guardarAz(); toast(P.softBlob !== false ? `Blobs borrados (soft delete: recuperables ${P.softDias || 7} días)` : 'Blobs borrados'); again(); };
      return;
    }
    if (blade === 'claves') {
      box.innerHTML = `<p class="az-dim">Las claves de acceso dan control total de la cuenta: trátalas como contraseñas. Mejor práctica: usar Microsoft Entra ID (roles de datos) o SAS de corta duración, guardar las claves en Key Vault y rotarlas.</p><div class="az-cmd"><button id="kShow">${ic('eye')} Show keys</button></div>${[0, 1].map((i) => `<div class="az-clave"><h4>key${i + 1} <button class="az-btn chico" data-rot="${i}">${ic('refresh')} Rotate key</button></h4><label>Key</label><input readonly value="${'•'.repeat(40)}" data-k="${i}" class="az-input"><label>Connection string</label><input readonly value="${'•'.repeat(40)}" data-cs="${i}" class="az-input"></div>`).join('')}`;
      box.querySelector('#kShow').onclick = () => { box.querySelectorAll('[data-k]').forEach((x) => { x.value = key(Number(x.dataset.k)); }); box.querySelectorAll('[data-cs]').forEach((x) => { x.value = `DefaultEndpointsProtocol=https;AccountName=${n};AccountKey=${key(Number(x.dataset.cs))};EndpointSuffix=core.windows.net`; }); actividad('List Storage Account Keys', n); guardarAz(); };
      box.querySelectorAll('[data-rot]').forEach((b) => b.onclick = () => { if (!confirm(`¿Regenerar key${Number(b.dataset.rot) + 1}? Las aplicaciones que la usan dejarán de funcionar hasta que tengan la nueva.`)) return; R.keys[Number(b.dataset.rot)] = uid(64); actividad('Regenerate Storage Account Keys', n); guardarAz(); notificar('Key regenerated', `Se regeneró key${Number(b.dataset.rot) + 1} de ${n}.`, 'ok'); again(); });
      return;
    }
    if (blade === 'sas') {
      const hoy = new Date(); const fin = new Date(Date.now() + 8 * 3600e3);
      const f = (d) => d.toISOString().slice(0, 16);
      box.innerHTML = `<p class="az-dim">Una SAS (firma de acceso compartido) da acceso limitado: qué servicios, qué permisos y hasta cuándo, sin entregar la clave de la cuenta.</p><div class="az-sas"><div><b>Allowed services</b>${['Blob', 'File', 'Queue', 'Table'].map((x) => `<label class="az-check"><input type="checkbox" name="sv" value="${x[0].toLowerCase()}" ${x === 'Blob' ? 'checked' : ''}> ${x}</label>`).join('')}</div><div><b>Allowed resource types</b>${['Service', 'Container', 'Object'].map((x) => `<label class="az-check"><input type="checkbox" name="rt" value="${x[0].toLowerCase()}" ${x !== 'Service' ? 'checked' : ''}> ${x}</label>`).join('')}</div><div><b>Allowed permissions</b>${[['r', 'Read'], ['w', 'Write'], ['d', 'Delete'], ['l', 'List'], ['a', 'Add'], ['c', 'Create']].map(([c, x]) => `<label class="az-check"><input type="checkbox" name="pm" value="${c}" ${'rl'.includes(c) ? 'checked' : ''}> ${x}</label>`).join('')}</div></div>
        <div class="az-fila2"><label class="az-campo"><span>Start</span><input type="datetime-local" id="sS" value="${f(hoy)}"></label><label class="az-campo"><span>Expiry</span><input type="datetime-local" id="sE" value="${f(fin)}"></label><label class="az-campo"><span>Allowed protocols</span><select id="sP"><option value="https">HTTPS only</option><option value="https,http">HTTPS and HTTP</option></select></label><label class="az-campo"><span>Signing key</span><select id="sK"><option>key1</option><option>key2</option></select></label></div>
        <button class="az-btn primario" id="sGen">Generate SAS and connection string</button><div id="sRes"></div>`;
      box.querySelector('#sGen').onclick = () => {
        const vals = (nm) => [...box.querySelectorAll(`[name=${nm}]:checked`)].map((x) => x.value).join('');
        const ss = vals('sv'), srt = vals('rt'), sp = vals('pm');
        if (!ss || !srt || !sp) return toast('Elige al menos un servicio, un tipo de recurso y un permiso');
        const st = new Date(box.querySelector('#sS').value).toISOString().replace(/\.\d+Z/, 'Z'), se = new Date(box.querySelector('#sE').value).toISOString().replace(/\.\d+Z/, 'Z');
        if (se <= st) return toast('La expiración tiene que ser posterior al inicio');
        const sas = `sv=2022-11-02&ss=${ss}&srt=${srt}&sp=${sp}&se=${encodeURIComponent(se)}&st=${encodeURIComponent(st)}&spr=${box.querySelector('#sP').value}&sig=${encodeURIComponent(btoa(uid(32)).slice(0, 43) + '=')}`;
        box.querySelector('#sRes').innerHTML = `<label class="az-campo"><span>SAS token</span><input class="az-input" readonly value="?${esc(sas)}"></label><label class="az-campo"><span>Blob service SAS URL</span><input class="az-input" readonly value="https://${esc(n)}.blob.core.windows.net/?${esc(sas)}"></label><p class="az-dim">Vence ${hora(se)}. Si se filtra, solo sirve para lo que permite y hasta esa fecha; para revocarla antes hay que rotar la clave que la firmó.</p>`;
        actividad('Generate SAS token', n); guardarAz();
      };
      return;
    }
    if (blade === 'red') { box.innerHTML = `<div class="az-pest"><a class="on">Firewalls and virtual networks</a><a>Private endpoint connections</a></div><p><b>Public network access:</b></p>${[['all', 'Enabled from all networks'], ['selected', 'Enabled from selected virtual networks and IP addresses'], ['disabled', 'Disabled']].map(([k2, t]) => `<label class="az-radio"><input type="radio" name="rd" value="${k2}" ${(P.red || 'all') === k2 ? 'checked' : ''}> ${t}</label>`).join('')}<div class="az-pie-btn"><button class="az-btn primario" id="rG">Save</button></div>`; box.querySelector('#rG').onclick = () => { P.red = box.querySelector('[name=rd]:checked').value; actividad('Update Storage Account network rules', n); guardarAz(); notificar('Saved', 'Networking settings updated.', 'ok'); again(); }; return; }
    if (blade === 'cifrado') { box.innerHTML = '<p><b>Encryption type:</b> Microsoft-managed keys (MMK)</p><p class="az-dim">Toda la información se cifra en reposo con AES-256 y no se puede desactivar. Con claves administradas por el cliente (CMK) la clave queda en tu Key Vault y puedes revocarla.</p>'; return; }
    if (blade === 'proteccion') { box.innerHTML = `<h4>Recovery</h4><label class="az-check"><input type="checkbox" id="pB" ${P.softBlob !== false ? 'checked' : ''}> Enable soft delete for blobs</label><label class="az-campo chico"><span>Keep deleted blobs for (in days)</span><input type="number" id="pD" min="1" max="365" value="${P.softDias || 7}"></label><label class="az-check"><input type="checkbox" id="pC" ${P.softCont !== false ? 'checked' : ''}> Enable soft delete for containers</label><h4>Tracking</h4><label class="az-check"><input type="checkbox" id="pV" ${P.versioning ? 'checked' : ''}> Enable versioning for blobs</label><div class="az-pie-btn"><button class="az-btn primario" id="pG">Save</button></div>`; box.querySelector('#pG').onclick = () => { const dias = Number(box.querySelector('#pD').value); if (dias < 1 || dias > 365) return toast('Entre 1 y 365 días'); Object.assign(P, { softBlob: box.querySelector('#pB').checked, softDias: dias, softCont: box.querySelector('#pC').checked, versioning: box.querySelector('#pV').checked }); actividad('Update blob service properties', n); guardarAz(); notificar('Saved', 'Data protection settings updated.', 'ok'); }; return; }
    if (blade === 'ciclo') {
      R.reglas = R.reglas || [];
      box.innerHTML = `<p class="az-dim">Las reglas de ciclo de vida mueven los blobs a niveles más baratos (Cool, Cold, Archive) o los borran según su antigüedad. Es la forma más simple de bajar el costo de un data lake.</p><div class="az-cmd"><button id="lcAdd">${ic('add')} Add a rule</button></div><table class="az-tabla"><thead><tr><th>Rule name</th><th>Status</th><th>Actions</th><th>Filter</th><th></th></tr></thead><tbody>${R.reglas.map((x, i) => `<tr><td>${esc(x.nombre)}</td><td>Enabled</td><td>${x.cool ? `Move to cool after ${x.cool} days` : ''}${x.archive ? ` · Archive after ${x.archive} days` : ''}${x.borrar ? ` · Delete after ${x.borrar} days` : ''}</td><td>${esc(x.prefijo || 'All blobs')}</td><td><button class="az-tb2" data-q="${i}">${ic('trash')}</button></td></tr>`).join('') || '<tr><td colspan="5" class="az-dim">No rules</td></tr>'}</tbody></table>${R.reglas.length ? `<h4>JSON (policy)</h4><pre class="az-code">${esc(JSON.stringify({ rules: R.reglas.map((x) => ({ enabled: true, name: x.nombre, type: 'Lifecycle', definition: { actions: { baseBlob: { ...(x.cool ? { tierToCool: { daysAfterModificationGreaterThan: x.cool } } : {}), ...(x.archive ? { tierToArchive: { daysAfterModificationGreaterThan: x.archive } } : {}), ...(x.borrar ? { delete: { daysAfterModificationGreaterThan: x.borrar } } : {}) } }, filters: { blobTypes: ['blockBlob'], ...(x.prefijo ? { prefixMatch: [x.prefijo] } : {}) } } })) }, null, 2))}</pre>` : ''}`;
      box.querySelector('#lcAdd').onclick = () => panel({ titulo: 'Add a rule', ok: 'Add', cuerpo: '<label class="az-campo"><span>Rule name *</span><input id="lN" value="raw-a-cool"></label><label class="az-campo"><span>Limit blobs with filter (prefix)</span><input id="lP" placeholder="raw/"></label><label class="az-campo"><span>Move to cool storage after (days since last modified)</span><input type="number" id="lC" value="30"></label><label class="az-campo"><span>Move to archive storage after (days)</span><input type="number" id="lA" value="180"></label><label class="az-campo"><span>Delete the blob after (days)</span><input type="number" id="lB" value="365"></label>', alOk: (p) => { const nm = p.querySelector('#lN').value.trim(); if (!/^[A-Za-z0-9-]{1,256}$/.test(nm)) throw new Error('Rule name: letras, números y guiones.'); const num = (q) => Number(p.querySelector(q).value) || 0; const x = { nombre: nm, prefijo: p.querySelector('#lP').value.trim(), cool: num('#lC'), archive: num('#lA'), borrar: num('#lB') }; if (x.archive && x.cool && x.archive <= x.cool) throw new Error('Archive tiene que ser después de Cool.'); if (x.borrar && x.archive && x.borrar <= x.archive) throw new Error('Delete tiene que ser después de Archive.'); R.reglas.push(x); actividad('Put management policy', n); guardarAz(); again(); } });
      box.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { R.reglas.splice(Number(b.dataset.q), 1); guardarAz(); again(); });
      return;
    }
    if (blade === 'config') { box.innerHTML = `<table class="az-kv"><tr><th>Secure transfer required</th><td>${P.secure !== false ? 'Enabled' : 'Disabled'}</td></tr><tr><th>Allow Blob anonymous access</th><td>${P.anonimo ? 'Enabled' : 'Disabled'}</td></tr><tr><th>Minimum TLS version</th><td>${P.tls === 'TLS1_3' ? 'Version 1.3' : 'Version 1.2'}</td></tr><tr><th>Blob access tier (default)</th><td>${esc(P.tier || 'Hot')}</td></tr><tr><th>Replication</th><td>${esc(R.sku)}</td></tr><tr><th>Hierarchical namespace</th><td>${R.hns ? 'Enabled (no se puede desactivar)' : 'Disabled'}</td></tr></table>`; return; }
    if (extBlade(box, { k: 'storage', R, n, id, blade, again })) return;
    box.innerHTML = `<p class="az-dim">${blade === 'archivos' ? 'Azure Files: recursos compartidos SMB/NFS.' : blade === 'colas' ? 'Queue storage: mensajes entre aplicaciones.' : 'Table storage: datos NoSQL clave-valor.'} No está simulado en esta práctica.</p>`;
  }
  // ---- Key Vault
  function blKv(box, { R, n, id, blade, comun, cmdBorrar, enlazarCmd, again }) {
    const P = R.props || (R.props = { permiso: 'rbac', retencion: 90, sku: 'standard' });
    R.secrets = R.secrets || {}; R.meta = R.meta || {};
    const rbac = P.permiso !== 'policy';
    const puede = (accion) => !rbac || tieneRol(id, accion === 'leer' ? ['Key Vault Administrator', 'Key Vault Secrets Officer', 'Key Vault Secrets User'] : accion === 'listar' ? ['Key Vault Administrator', 'Key Vault Secrets Officer', 'Key Vault Secrets User', 'Key Vault Reader'] : ['Key Vault Administrator', 'Key Vault Secrets Officer']);
    const NO_RBAC = `<div class="az-banner error">${ic('error')} <span>The operation is not allowed by RBAC. If role assignments were recently changed, please wait several minutes for role assignments to become effective.<br><small>Ser Owner de la suscripción no da acceso a los secretos. Asígnate <b>Key Vault Secrets Officer</b> (o Key Vault Administrator) en <a href="#/azure/recurso/kv/${encodeURIComponent(n)}/iam">Access control (IAM)</a>.</small></span></div>`;
    if (blade === 'overview') { box.innerHTML = `<div class="az-cmd">${cmdBorrar}</div>${essentials([...comun.slice(0, 2), ['Vault URI', `<code>https://${esc(n)}.vault.azure.net/</code>`], ['Pricing tier', P.sku === 'premium' ? 'Premium' : 'Standard'], ['Directory ID', TENANT], ['Soft-delete', `Enabled (${P.retencion || 90} days)`], ['Purge protection', P.purga ? 'Enabled' : 'Disabled'], ['Permission model', rbac ? 'Azure role-based access control' : 'Vault access policy'], ...comun.slice(2)], true)}<div class="az-banner info">${ic('info')} <span>Desde Databricks se usan estos secretos con un <i>secret scope</i> respaldado por Key Vault: <code>dbutils.secrets.get("mi-scope", "nombre")</code>. En la salida del notebook el valor aparece como <code>[REDACTED]</code>.</span></div>`; enlazarJson(box, { id, name: n, type: 'Microsoft.KeyVault/vaults', location: R.location, properties: { vaultUri: `https://${n}.vault.azure.net/`, tenantId: TENANT, sku: { family: 'A', name: P.sku || 'standard' }, enableRbacAuthorization: rbac, enableSoftDelete: true, softDeleteRetentionInDays: P.retencion || 90 } }); enlazarCmd(); return; }
    if (blade === 'secretos') {
      if (!puede('listar')) { box.innerHTML = `<div class="az-cmd"><button disabled>${ic('add')} Generate/Import</button></div>${NO_RBAC}`; return; }
      box.innerHTML = `<div class="az-cmd"><button id="sAdd" ${puede('escribir') ? '' : 'disabled'}>${ic('add')} Generate/Import</button><button onclick="location.reload()">${ic('refresh')} Refresh</button></div>${!puede('escribir') ? `<div class="az-banner aviso">${ic('warning')} Puedes listar pero no crear secretos: hace falta Key Vault Secrets Officer.</div>` : ''}${Object.keys(R.secrets).length ? `<table class="az-tabla"><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Expiration date</th><th></th></tr></thead><tbody>${Object.keys(R.secrets).map((s) => `<tr><td><a class="az-link" data-ver="${esc(s)}">${esc(s)}</a></td><td>${esc((R.meta[s] || {}).tipo || '')}</td><td>${(R.meta[s] || {}).off ? 'Disabled' : `<span class="az-ok">${ic('pass-filled')} Enabled</span>`}</td><td>${esc((R.meta[s] || {}).expira || '')}</td><td>${puede('escribir') ? `<button class="az-tb2" data-q="${esc(s)}">${ic('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="az-dim">There are no secrets available.</p>'}`;
      const sa = box.querySelector('#sAdd'); if (sa) sa.onclick = () => panel({ titulo: 'Create a secret', ok: 'Create', cuerpo: '<label class="az-campo"><span>Upload options</span><select><option>Manual</option></select></label><label class="az-campo"><span>Name *</span><input id="sN" placeholder="storage-account-key"></label><label class="az-campo"><span>Secret value *</span><input id="sV" type="password" autocomplete="new-password"></label><label class="az-campo"><span>Content type (optional)</span><input id="sT"></label><label class="az-campo"><span>Set expiration date</span><input type="date" id="sE"></label><label class="az-check"><input type="checkbox" id="sOn" checked> Enabled</label><p class="az-dim">No pegues secretos reales: esto es una práctica en tu navegador.</p>', alOk: (p) => { const nm = p.querySelector('#sN').value.trim(); if (!/^[0-9a-zA-Z-]{1,127}$/.test(nm)) throw new Error('The name must be 1-127 characters: letters, numbers and dashes.'); if (!p.querySelector('#sV').value) throw new Error('Secret value is required.'); R.secrets[nm] = p.querySelector('#sV').value; R.meta[nm] = { tipo: p.querySelector('#sT').value, expira: p.querySelector('#sE').value, off: !p.querySelector('#sOn').checked, version: uid(32) }; actividad('Set Secret', `${n}/${nm}`); guardarAz(); notificar('Secret created', `The secret '${nm}' has been successfully created.`, 'ok'); again(); } });
      box.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { if (!confirm(`¿Borrar el secreto ${b.dataset.q}? Con soft delete se puede recuperar ${P.retencion || 90} días.`)) return; delete R.secrets[b.dataset.q]; actividad('Delete Secret', `${n}/${b.dataset.q}`); guardarAz(); again(); });
      box.querySelectorAll('[data-ver]').forEach((a) => a.onclick = () => { const s = a.dataset.ver; panel({ titulo: s, ok: null, cancelar: 'Close', cuerpo: `<table class="az-kv"><tr><th>Secret Identifier</th><td><code>https://${esc(n)}.vault.azure.net/secrets/${esc(s)}/${esc((R.meta[s] || {}).version || uid(32))}</code></td></tr></table><button class="az-btn" id="vS">Show Secret Value</button><div id="vV"></div>`, alAbrir: (p) => { p.querySelector('#vS').onclick = () => { p.querySelector('#vV').innerHTML = puede('leer') ? `<input class="az-input" readonly value="${esc(R.secrets[s])}">` : NO_RBAC; if (puede('leer')) { actividad('Get Secret', `${n}/${s}`); guardarAz(); } }; } }); });
      return;
    }
    if (blade === 'acceso') { box.innerHTML = `<p><b>Permission model</b></p><label class="az-radio"><input type="radio" name="pm" value="rbac" ${rbac ? 'checked' : ''}> Azure role-based access control (recommended)</label><label class="az-radio"><input type="radio" name="pm" value="policy" ${rbac ? '' : 'checked'}> Vault access policy</label><div class="az-banner aviso">${ic('warning')} Cambiar el modelo de permisos puede dejar sin acceso a quienes lo usan hoy.</div><div class="az-pie-btn"><button class="az-btn primario" id="aG">Apply</button></div>`; box.querySelector('#aG').onclick = () => { P.permiso = box.querySelector('[name=pm]:checked').value; actividad('Update Key Vault', n); guardarAz(); notificar('Saved', 'Access configuration updated.', 'ok'); again(); }; return; }
    if (blade === 'red') { box.innerHTML = `<p>Public network access: <b>${P.red === 'disabled' ? 'Disabled' : 'Allow public access from all networks'}</b></p><p class="az-dim">En producción se suele usar un private endpoint para que el vault solo sea accesible desde la red de la empresa.</p>`; return; }
    if ((blade === 'claves' || blade === 'certificados') && extBlade(box, { k: 'kv', R, n, id, blade, again, rbac })) return;
    if (blade === 'claves' || blade === 'certificados') { box.innerHTML = `<p class="az-dim">${blade === 'claves' ? 'Las claves criptográficas (RSA, EC) se usan para cifrar o firmar, por ejemplo como CMK de un storage.' : 'Los certificados TLS se pueden emitir y renovar desde Key Vault.'} No está simulado en esta práctica: usa <b>Secrets</b>.</p>`; return; }
  }

  // ------------------------------------------------------------------ suscripciones, actividad, costos
  function suscripciones(cont) {
    cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], ['Subscriptions', null]])}<div class="az-cab">${svg('sub', 28)}<h1>Subscriptions</h1></div><table class="az-tabla"><thead><tr><th>Subscription name</th><th>Subscription ID</th><th>My role</th><th>Current cost</th><th>Status</th></tr></thead><tbody>${SUBS.map((s) => `<tr><td><a href="#/azure/suscripcion/${s.id}">${esc(s.name)}</a>${s.id === sub().id ? ' <span class="az-chip">current</span>' : ''}</td><td>${s.id}</td><td>Owner</td><td>${s.id === sub().id ? '$' + costoTotal().toFixed(2) : '$0.00'}</td><td><span class="az-ok">${ic('pass-filled')} Active</span></td></tr>`).join('')}</tbody></table><div class="az-banner info">${ic('info')} <span>Una suscripción es la unidad de facturación y un límite de acceso. Los equipos suelen separar dev y prod en suscripciones distintas.</span></div></div>`;
  }
  function hojaSuscripcion(cont, r) {
    const s = SUBS.find((x) => x.id === r[0]) || sub(); const blade = r[1] || 'overview';
    hoja(cont, { migas: [['Home', ''], ['Subscriptions', 'suscripciones'], [s.name, null]], icono: 'sub', nombre: s.name, tipoTxt: 'Subscription', menuItems: [['overview', 'Overview', 'home'], ['actividad', 'Activity log', 'list-unordered'], ['iam', 'Access control (IAM)', 'person'], ['costos', 'Cost analysis', 'graph'], ['grupos', 'Resource groups', 'symbol-namespace']], activo: blade, ruta: 'suscripcion/' + s.id, contenido: (box) => {
      if (blade === 'iam') return iam(box, `/subscriptions/${s.id}`, s.name);
      if (blade === 'actividad') return registroActividad(box, []);
      if (blade === 'costos') return costos(box, []);
      if (blade === 'grupos') { box.innerHTML = `<table class="az-tabla"><tbody>${Object.keys(az().groups || {}).map((g) => `<tr><td><a href="#/azure/grupo/${encodeURIComponent(g)}">${svg('grupo')} ${esc(g)}</a></td></tr>`).join('')}</tbody></table>`; return; }
      box.innerHTML = essentials([['Subscription ID', s.id], ['Directory', 'ACADEMIA (Default Directory)'], ['My role', 'Owner'], ['Offer', 'Pay-As-You-Go (práctica)'], ['Status', 'Active'], ['Current cost', '$' + costoTotal().toFixed(2)]]);
    } });
  }
  function registroActividad(cont, _r, filtro = null) {
    const L = (az().actividad || []).filter((a) => !filtro || filtro(a));
    const html = `${filtro ? '' : `${migas([['Home', ''], ['Activity log', null]])}<div class="az-cab">${svg('actividad', 28)}<h1>Activity log</h1></div>`}<p class="az-dim">El registro de actividad guarda las operaciones de escritura (crear, cambiar, borrar) sobre los recursos: quién, qué y cuándo. Se conserva 90 días.</p>${L.length ? `<table class="az-tabla"><thead><tr><th>Operation name</th><th>Status</th><th>Time</th><th>Resource</th><th>Event initiated by</th></tr></thead><tbody>${L.map((a) => `<tr><td>${esc(a.op)}</td><td>${a.estado === 'Succeeded' ? `<span class="az-ok">${ic('pass-filled')} Succeeded</span>` : `<span class="az-mal">${ic('error')} ${esc(a.estado)}</span>`}</td><td>${hora(a.t)}</td><td>${esc(a.recurso)}</td><td>${esc(a.quien)}</td></tr>`).join('')}</tbody></table>` : '<p>No events to display.</p>'}`;
    cont.innerHTML = filtro ? html : `<div class="az-pag">${html}</div>`;
  }
  // costos de práctica: tarifa diaria por recurso + uso de Databricks (DBU)
  function lineasCosto(rg = null) {
    const lin = []; const hoy = Date.now();
    for (const x of recursos()) { if (rg && x.r.rg !== rg) continue; const dias = Math.max(1, Math.ceil((hoy - new Date(x.r.creado || hoy).getTime()) / 864e5)); lin.push({ nombre: x.n, servicio: x.d.plural, rg: x.r.rg, costo: dias * x.d.costoDia, tipo: x.k }); }
    const C = window.CloudSim.dbx(); const dbuUsd = (C.uso || []).reduce((a, u) => a + u.dbu * (u.sku.includes('ALL_PURPOSE') ? 0.55 : u.sku.includes('SERVERLESS') ? 0.7 : 0.3), 0);
    if (!rg && (C.uso || []).length) lin.push({ nombre: 'Databricks (DBU)', servicio: 'Azure Databricks', rg: Object.values(az().dbw || {})[0] ? Object.values(az().dbw)[0].rg : '-', costo: dbuUsd, tipo: 'dbw' });
    return lin;
  }
  const costoTotal = () => lineasCosto().reduce((a, l) => a + l.costo, 0);
  function costos(cont, _r, rg = null) {
    const P = portal(); const lin = lineasCosto(rg); const total = lin.reduce((a, l) => a + l.costo, 0);
    const porServ = {}; for (const l of lin) porServ[l.servicio] = (porServ[l.servicio] || 0) + l.costo;
    const max = Math.max(0.01, ...Object.values(porServ));
    const html = `${rg ? '' : `${migas([['Home', ''], ['Cost Management', null]])}<div class="az-cab">${svg('costo', 28)}<h1>Cost Management | Cost analysis</h1></div>`}
      <div class="az-banner aviso">${ic('warning')} <span>Precios de práctica (no son tarifas reales): sirven para ver cómo se reparte el costo y para practicar presupuestos.</span></div>
      <div class="az-kpis"><div><span>Actual cost (USD)</span><b>$${total.toFixed(2)}</b></div><div><span>Forecast (fin de mes)</span><b>$${(total * 30 / Math.max(1, new Date().getDate())).toFixed(2)}</b></div><div><span>Budget</span><b>${P.presupuestos.length ? '$' + P.presupuestos[0].monto : 'none'}</b></div></div>
      <h3>Cost by service</h3>${Object.keys(porServ).length ? `<div class="az-barras">${Object.entries(porServ).sort((a, b) => b[1] - a[1]).map(([s, c]) => `<div><span>${esc(s)}</span><i style="width:${Math.max(2, (c / max) * 100)}%"></i><b>$${c.toFixed(2)}</b></div>`).join('')}</div>` : '<p class="az-dim">Sin costos: no hay recursos.</p>'}
      <h3>Cost by resource</h3><table class="az-tabla"><thead><tr><th>Resource</th><th>Service</th><th>Resource group</th><th>Cost</th></tr></thead><tbody>${lin.sort((a, b) => b.costo - a.costo).map((l) => `<tr><td>${svg(l.tipo)} ${esc(l.nombre)}</td><td>${esc(l.servicio)}</td><td>${esc(l.rg)}</td><td>$${l.costo.toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="4" class="az-dim">-</td></tr>'}</tbody></table>
      ${rg ? '' : `<h3>Budgets <button class="az-btn chico" id="bAdd">${ic('add')} Add</button></h3>${P.presupuestos.length ? `<table class="az-tabla"><thead><tr><th>Name</th><th>Amount</th><th>Evaluated spend</th><th>Alerts</th><th></th></tr></thead><tbody>${P.presupuestos.map((b, i) => { const pct = (total / b.monto) * 100; return `<tr><td>${esc(b.nombre)}</td><td>$${b.monto}</td><td><div class="az-prog"><i style="width:${Math.min(100, pct)}%" class="${pct >= 100 ? 'mal' : pct >= 80 ? 'medio' : ''}"></i></div>${pct.toFixed(1)}%</td><td>${b.umbrales.map((u) => `${u}%${pct >= u ? ' 🔔' : ''}`).join(', ')} → ${esc(b.correo)}</td><td><button class="az-tb2" data-q="${i}">${ic('trash')}</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="az-dim">Un presupuesto avisa por correo cuando el gasto llega a los porcentajes que elijas. No frena el gasto: solo avisa.</p>'}`}`;
    cont.innerHTML = rg ? html : `<div class="az-pag">${html}</div>`;
    const ba = cont.querySelector('#bAdd'); if (ba) ba.onclick = () => panel({ titulo: 'Create budget', ok: 'Create', cuerpo: '<label class="az-campo"><span>Name *</span><input id="pN" value="presupuesto-mensual"></label><label class="az-campo"><span>Reset period</span><select><option>Monthly</option><option>Quarterly</option><option>Annually</option></select></label><label class="az-campo"><span>Amount (USD) *</span><input type="number" id="pM" value="50" min="1"></label><label class="az-campo"><span>Alert conditions (% of budget, actual)</span><input id="pU" value="50, 80, 100"></label><label class="az-campo"><span>Alert recipients (email)</span><input id="pC" value="equipo-datos@academia.dev"></label>', alOk: (p) => { const m = Number(p.querySelector('#pM').value); if (!(m > 0)) throw new Error('El monto tiene que ser mayor que 0.'); const u = p.querySelector('#pU').value.split(',').map((x) => Number(x.trim())).filter((x) => x > 0); P.presupuestos.push({ nombre: p.querySelector('#pN').value.trim() || 'budget', monto: m, umbrales: u.length ? u : [80, 100], correo: p.querySelector('#pC').value.trim() }); guardarP(); costos(cont, _r, rg); } });
    cont.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { P.presupuestos.splice(Number(b.dataset.q), 1); guardarP(); costos(cont, _r, rg); });
  }
  // avisos de presupuesto (como el correo de alerta)
  function revisarPresupuestos() {
    const P = portal(); const total = costoTotal();
    for (const b of P.presupuestos) { b.avisados = b.avisados || []; for (const u of b.umbrales) if ((total / b.monto) * 100 >= u && !b.avisados.includes(u)) { b.avisados.push(u); notificar(`Budget alert: ${b.nombre}`, `El gasto ($${total.toFixed(2)}) llegó al ${u}% del presupuesto de $${b.monto}. (Se enviaría un correo a ${b.correo}.)`, u >= 100 ? 'error' : 'info', ['Cost Management', 'costos']); } }
  }
  const stubEntra = (cont) => { cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], ['Microsoft Entra ID', null]])}<div class="az-cab">${svg('entra', 28)}<h1>Microsoft Entra ID</h1></div><p>Microsoft Entra ID (antes Azure Active Directory) es el directorio de identidades: usuarios, grupos, aplicaciones (service principals) e identidades administradas. Los roles de Azure (RBAC) se asignan a estas identidades.</p><table class="az-tabla"><thead><tr><th>Name</th><th>Type</th><th>Principal</th></tr></thead><tbody>${principales().map((p) => `<tr><td>${esc(p[2])}</td><td>${esc(p[1])}</td><td>${esc(p[0])}</td></tr>`).join('')}</tbody></table><p class="az-dim">La administración del directorio no está simulada.</p></div>`; };
  const stubMonitor = (cont) => { cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], ['Monitor', null]])}<div class="az-cab">${svg('monitor', 28)}<h1>Monitor</h1></div><p>Azure Monitor reúne métricas, logs (Log Analytics con KQL) y alertas de todos los recursos. Por ejemplo, una alerta cuando falla un pipeline de Data Factory o cuando un storage recibe muchas solicitudes rechazadas.</p><p class="az-dim">No está simulado. Para practicar la investigación de incidentes, usa el <a href="#/ruta">módulo de Incidentes</a> del curso.</p></div>`; };

  // ------------------------------------------------------------------ Cloud Shell
  let term = null;
  function cloudShell(comando) {
    const box = main.querySelector('#azShell');
    if (!box.hidden && !comando) { box.hidden = true; return; }
    box.hidden = false;
    if (!box.dataset.ok) {
      box.dataset.ok = 1;
      box.innerHTML = `<div class="az-sh-cab"><select id="shT"><option>Bash</option><option>PowerShell</option></select><button class="az-tb2" title="Restart">${ic('debug-restart')}</button><button class="az-tb2" title="Manage files">${ic('cloud-upload')}</button><span class="az-sh-t">Cloud Shell (práctica)</span><button class="az-tb2" id="shMax" title="Maximize">${ic('screen-full')}</button><button class="az-tb2" id="shX" title="Close">${ic('close')}</button></div><div class="az-sh-term" id="shTerm"></div>`;
      box.querySelector('#shX').onclick = () => { box.hidden = true; };
      box.querySelector('#shMax').onclick = () => box.classList.toggle('max');
      box.querySelector('#shT').onchange = (e) => { if (e.target.value === 'PowerShell') { toast('En la práctica solo está Bash (con az)'); e.target.value = 'Bash'; } };
      if (window.Shell) {
        term = window.Shell.createTerminal(box.querySelector('#shTerm'), { autoLogin: true, continuarSesion: true, title: 'Bash', welcome: 'Requesting a Cloud Shell.\u0001t-ok\u0002Succeeded.\u0003\nConnecting terminal...\n\nWelcome to Azure Cloud Shell\n\nType "\u0001t-info\u0002az\u0003" to use Azure CLI\nType "\u0001t-info\u0002help\u0003" to learn about Cloud Shell\n', onCommand: (line) => { if (/^\s*az\s/.test(line)) setTimeout(() => { if (location.hash.startsWith('#/azure')) render(actual); }, 60); } });
      } else box.querySelector('#shTerm').textContent = 'La terminal del curso no está disponible.';
    }
    if (comando && term) { term.type(comando); }
    if (term) setTimeout(() => term.focus(), 50);
  }

  // ------------------------------------------------------------------ entrada
  function vista(m, ctx, subr) {
    main = m; Store = ctx.Store; toast = ctx.toast || toast;
    if (window.Shell && window.Shell.Machine && !window.Shell.Machine.ready) window.Shell.Machine.load();
    if (!window.CloudSim) { main.innerHTML = '<div class="az-pag">El portal necesita la terminal del curso (CloudSim).</div>'; return; }
    const s = az(); s.logged = true;
    if (subr && subr[0] === 'studio' && window.ADFStudio) { document.body.classList.remove('az-abierto'); window.ADFStudio.vista(main, { Store, toast, guardarAz, actividad, sub: () => az().sub }, subr.slice(1)); return; }
    if (!main.querySelector('#azp')) main.innerHTML = '';
    render(subr);
    revisarPresupuestos();
  }
  window.addEventListener('hashchange', () => { if (!/^#\/azure/.test(location.hash)) document.body.classList.remove('az-abierto'); });
  document.addEventListener('keydown', (e) => { if (!document.getElementById('azp')) return; if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.closest('.term')) { e.preventDefault(); main.querySelector('#azQ').focus(); } });
  window.AzurePortal = { vista, ext: {}, _i: { az, guardarAz, esc, ic, uid, ahora, hora, panel, migas, svg, SVG, SERVICIOS, REGIONES, actividad, notificar, ir, tieneRol, ROLES, TENANT, USUARIO, sub, recursos, idRecurso, TIPOS, regionNombre, toast: (m) => toast(m), render: () => render(actual) } };
})();
