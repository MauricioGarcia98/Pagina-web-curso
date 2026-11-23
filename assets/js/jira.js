/* Jira de práctica — un proyecto Scrum en el navegador, sin cuenta real.
 *
 * Sigue la documentación pública de Atlassian (support.atlassian.com, Jira Cloud) y la referencia de JQL:
 *  - backlog con sprints (crear, iniciar con fechas y objetivo, completar moviendo lo abierto al backlog, a un
 *    sprint futuro o a uno nuevo), tablero con columnas por estado y límites de trabajo en curso (min/max),
 *    quick filters, swimlanes (historias, asignados, épicas, consultas), flag (Flagged = Impediment) y vínculos
 *    entre issues (blocks / is blocked by, relates to, duplicates, clones, causes);
 *  - issues con clave (TA-12), tipos Epic, Story, Task, Bug y Subtask, story points, fecha de vencimiento,
 *    resolución, registro de trabajo (1w 2d 4h 30m) e historial de cambios;
 *  - JQL: AND, OR, NOT, paréntesis, =, !=, >, >=, <, <=, ~, !~, IN, NOT IN, IS [NOT] EMPTY, WAS, WAS IN, WAS NOT,
 *    WAS NOT IN y CHANGED (FROM, TO, BY, AFTER, BEFORE, ON, DURING), fechas relativas (-7d) y funciones
 *    (currentUser, membersOf, openSprints, startOfDay, linkedIssues, updatedBy, issueHistory…), ORDER BY;
 *  - smart commits: los commits empujados desde la terminal que nombran una clave (TA-7 #comment …, #time 2h,
 *    #in-progress) comentan, registran tiempo y cambian el estado de la issue;
 *  - reportes: burndown, sprint report, velocity y cumulative flow diagram.
 * No usa logos ni íconos de Atlassian: los íconos son genéricos.
 */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ahora = () => new Date().toISOString();
  const DIA = 864e5;
  const href = (...p) => '#/jira' + (p.length ? '/' + p.map((x) => encodeURIComponent(x)).join('/') : '');
  const hp = (...p) => (cur === 'TA' ? href(...p) : href('projects', cur, ...p));   // páginas del proyecto actual
  let cur = 'TA';   // proyecto que se está mirando: TA y uno por cliente (PD, MV, RA, RS, CC, AS, CN)
  let main = null, Store = null, toast = () => {}, ruta = [], query = new URLSearchParams();
  const TIPOS = { Epic: ['#904ee2', 'M4 6l8-3 8 3v8l-8 7-8-7z'], Story: ['#63ba3c', 'M6 3h12v18l-6-4-6 4z'], Task: ['#4bade8', 'M5 5h14v14H5z M8 12l3 3 5-6'], Bug: ['#e5493a', 'M12 4a5 5 0 0 1 5 5v5a5 5 0 0 1-10 0V9a5 5 0 0 1 5-5z'], Subtask: ['#4bade8', 'M5 5h6v6H5z M13 13h6v6h-6z'] };
  const ESTADOS = ['To Do', 'In Progress', 'In Review', 'Done'];
  const CATEGORIA = { 'To Do': 'To Do', 'In Progress': 'In Progress', 'In Review': 'In Progress', Done: 'Done' };
  const PRIOR = { Highest: '#cd1317', High: '#e9494a', Medium: '#e97f33', Low: '#2d8738', Lowest: '#57a55a' };
  const GENTE = { alumno: 'Alumno', martin: 'Martín Rojas', camila: 'Camila Díaz', sofia: 'Sofía Pérez' };
  const persona = (u) => (u ? GENTE[u] || (((Store && Store.data.jira && Store.data.jira.gente) || {})[u] || {}).nombre : undefined);
  const GRUPOS = { 'equipo-datos': ['alumno', 'martin', 'camila', 'sofia'], analistas: ['alumno', 'camila'], 'jira-administrators': ['martin'] };
  // tipos de vínculo: [externo, interno] (A blocks B ⇔ B is blocked by A)
  const VINCULOS = [['blocks', 'is blocked by'], ['relates to', 'relates to'], ['duplicates', 'is duplicated by'], ['clones', 'is cloned by'], ['causes', 'is caused by']];
  const inverso = (t) => { for (const [a, b] of VINCULOS) { if (t === a) return b; if (t === b) return a; } return t; };
  const icTipo = (t, s = 16) => { const [c, d] = TIPOS[t] || TIPOS.Task; return `<span class="jr-tipo" style="background:${c};width:${s}px;height:${s}px" title="${esc(t)}" role="img" aria-label="${esc(t)}"><svg viewBox="0 0 24 24" width="${s - 4}" height="${s - 4}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg></span>`; };
  const icPrior = (p) => `<span class="jr-prior" style="color:${PRIOR[p] || '#999'}" title="${esc(p)}" role="img" aria-label="Priority ${esc(p)}">${/High/.test(p) ? '▲' : /Low/.test(p) ? '▼' : '='}</span>`;
  const icFlag = '<span class="jr-flag" title="Flagged" role="img" aria-label="Flagged">⚑</span>';
  const avatar = (u, t = 24) => { if (!u) return `<span class="jr-av jr-av-vacio" style="width:${t}px;height:${t}px" title="Unassigned">?</span>`; const n = persona(u) || u; const col = { alumno: '#0052cc', martin: '#6554c0', camila: '#00875a', sofia: '#ff5630' }[u] || '#5e6c84'; return `<span class="jr-av" style="width:${t}px;height:${t}px;background:${col};font-size:${Math.round(t * 0.42)}px" title="${esc(n)}">${esc(n.split(' ').map((x) => x[0]).join('').slice(0, 2))}</span>`; };

  // ------------------------------------------------------------------ estado
  function raiz() {
    const s = Store.data.jira;
    if (s && s.v === 3) return s;
    if (s && (s.v === 1 || s.v === 2)) return migrar(s);
    const d = (x) => new Date(Date.now() + x * DIA).toISOString();
    const I = (n, tipo, titulo, estado, asig, pts, sprint, epic, prior, desc = '', padre = null) => ({ n, tipo, titulo, estado, asig, pts, sprint, epic, prior, desc, padre, labels: [], creado: d(-12 + n * 0.3), act: [], com: [] });
    const issues = [
      I(1, 'Epic', 'Lago de datos de ventas', 'In Progress', 'martin', null, null, null, 'High', 'Llevar los pedidos de la tienda a un lago con capas bronze, silver y gold.'),
      I(2, 'Epic', 'Tablero de finanzas', 'To Do', 'sofia', null, null, null, 'Medium'),
      I(3, 'Story', 'Cargar los pedidos de ayer en silver antes de las 7:00', 'In Progress', 'camila', 5, 1, 1, 'High', 'Como analista, quiero los pedidos de ayer en silver antes de las 7:00 para preparar la reunión diaria.\n\nCriterios de aceptación:\n- El job corre a las 6:00.\n- La cuenta de control cierra.'),
      I(4, 'Subtask', 'Escribir la carga incremental', 'In Progress', 'camila', null, 1, 1, 'Medium', '', 3),
      I(5, 'Subtask', 'Tests de nulos y duplicados', 'To Do', 'alumno', null, 1, 1, 'Medium', '', 3),
      I(6, 'Bug', 'El ETL no incluye a México', 'To Do', 'alumno', 2, 1, 1, 'Highest', 'Desde octubre vendemos en México y el reporte no lo muestra. Hay que agregarlo a PAISES en pipelines/etl.py.'),
      I(7, 'Story', 'Total diario por canal para finanzas', 'To Do', 'alumno', 3, 1, 2, 'Medium', 'Como finanzas, quiero el total diario por canal para conciliar con la pasarela de pagos.'),
      I(8, 'Task', 'Documentar el contrato de datos de pedidos', 'Done', 'martin', 2, 1, 1, 'Low'),
      I(9, 'Story', 'Alertas si la carga diaria no llega', 'To Do', null, 5, null, 1, 'High'),
      I(10, 'Story', 'Dimensión de clientes con historia (SCD2)', 'To Do', null, 8, null, 1, 'Medium'),
      I(11, 'Task', 'Revisar costos del warehouse', 'To Do', null, 3, null, 2, 'Low'),
    ];
    issues.find((x) => x.n === 3).labels = ['datos', 'silver']; issues.find((x) => x.n === 6).labels = ['bug-prod'];
    const v1 = { v: 1, issues, sig: 12, sprints: [{ id: 1, nombre: 'TA Sprint 1', meta: 'Pedidos en silver todos los días', estado: 'active', inicio: d(-5), fin: d(9) }, { id: 2, nombre: 'TA Sprint 2', meta: '', estado: 'future', inicio: null, fin: null }], cerrados: [{ nombre: 'TA Sprint 0', comprometido: 13, hecho: 10 }], filtros: [], ev: {} };
    Store.data.jira = v1;
    const s2 = migrar(v1, true);
    // historia inicial coherente con el estado de cada issue (para WAS, CHANGED, el burndown y el cumulative flow)
    const h = (n, de, a, u, dias) => { const x = s2.issues.find((y) => y.n === n); x.hist.push({ c: 'status', de, a, u, f: d(dias) }); };
    h(1, 'To Do', 'In Progress', 'martin', -9); h(3, 'To Do', 'In Progress', 'camila', -4); h(4, 'To Do', 'In Progress', 'camila', -3);
    h(8, 'To Do', 'In Progress', 'martin', -6); h(8, 'In Progress', 'Done', 'martin', -3);
    const x8 = s2.issues.find((y) => y.n === 8); x8.hecho = d(-3); x8.res = 'Done'; x8.resF = d(-3);
    s2.issues.find((y) => y.n === 6).hist.push({ c: 'priority', de: 'High', a: 'Highest', u: 'martin', f: d(-2) });
    s2.issues.find((y) => y.n === 6).due = d(2).slice(0, 10); s2.issues.find((y) => y.n === 7).due = d(6).slice(0, 10);
    vincular(s2, 6, 'blocks', 7); vincular(s2, 9, 'relates to', 3);
    s2.issues.find((y) => y.n === 4).log.push({ seg: 3 * 3600, u: 'camila', f: d(-2), c: 'Primera versión de la carga' });
    s2.sprints[0].alInicio = { 3: 5, 6: 2, 7: 3, 8: 2 };
    for (const x of s2.issues) x.upd = x.hist.length ? x.hist[x.hist.length - 1].f : x.creado;
    return s2;
  }
  // de la versión 1 (sin historial, flags ni vínculos) a la 2, sin perder nada de lo que el alumno hizo
  function migrar(s, nuevo) {
    for (const x of s.issues) {
      x.rep = x.rep || (x.tipo === 'Subtask' ? 'camila' : 'martin');
      x.hist = x.hist || []; x.links = x.links || []; x.log = x.log || []; x.dev = x.dev || [];
      if (x.due === undefined) x.due = null;
      if (x.flag === undefined) x.flag = false;
      if (x.res === undefined) { x.res = x.estado === 'Done' ? 'Done' : null; x.resF = x.estado === 'Done' ? (x.hecho || x.creado) : null; }
      x.upd = x.upd || (x.act.length ? x.act[x.act.length - 1].f : x.creado);
    }
    for (const x of s.issues) x.p = x.p || 'TA';
    s.board = s.board || tableroInicial();
    s.proc = s.proc || {}; s.smart = s.smart || [];
    s.vistos = (s.vistos || []).map((k) => (typeof k === 'number' ? `TA-${k}` : k));
    s.proyectos = s.proyectos || {}; s.gente = s.gente || {};
    s.v = 3;
    if (!nuevo) guardar();
    return s;
  }
  const tableroInicial = () => ({ wip: { 'In Progress': { min: null, max: 3 } }, restr: 'sin-subtareas', swim: 'ninguno', swimQ: [{ nombre: 'Expedite', jql: 'priority = Highest' }], qf: [{ id: 1, nombre: 'Only My Issues', jql: 'assignee = currentUser()', desc: 'Las issues asignadas a ti' }, { id: 2, nombre: 'Recently Updated', jql: 'updatedDate >= -1d', desc: 'Lo que cambió en las últimas 24 horas' }], sigQf: 3 });
  // cada proyecto de cliente tiene su propio backlog, sprints y tablero; TA vive en la raíz (compatibilidad)
  function proyecto(k) {
    const r = raiz();
    return r.proyectos[k] || (r.proyectos[k] = { v: 3, clave: k, issues: [], sig: 1, sprints: [], cerrados: [], filtros: [], ev: {}, board: tableroInicial() });
  }
  function st() { const r = raiz(); return cur === 'TA' ? r : proyecto(cur); }
  const estadoDe = (k) => (k === 'TA' ? raiz() : raiz().proyectos[k]);
  const todas = () => { const r = raiz(); return [...r.issues, ...Object.values(r.proyectos).flatMap((p) => p.issues)]; };
  const todosSprints = () => { const r = raiz(); return [...r.sprints.map((sp) => ({ ...sp, p: 'TA' })), ...Object.entries(r.proyectos).flatMap(([k, p]) => p.sprints.map((sp) => ({ ...sp, p: k })))]; };
  const regs = () => window.__tableros || [];
  const regDe = (k) => regs().find((g) => g.clave === k);
  const nombreProyecto = (k) => (k === 'TA' ? 'Tienda Andina Datos' : (regDe(k) || {}).nombre || k);
  const guardar = () => { try { Store.saveSoon ? Store.saveSoon() : Store.save(); } catch (e) { /* nada */ } };
  const evento = (k) => { const s = raiz(); s.ev[k] = (s.ev[k] || 0) + 1; guardar(); };
  const issue = (n) => st().issues.find((x) => x.n === Number(n));
  const porClave = (k) => { const m = String(k || '').trim().match(/^([A-Z][A-Z0-9]+)-(\d+)$/i); if (!m) return null; const S = estadoDe(m[1].toUpperCase()); return (S && S.issues.find((x) => x.n === Number(m[2]))) || null; };
  const clave = (x) => `${x.p || 'TA'}-${x.n}`;
  const activo = () => st().sprints.find((x) => x.estado === 'active');
  const tocar = (x) => { x.upd = ahora(); };
  const registrar = (x, t, u = 'alumno') => { x.act.push({ u, t, f: ahora() }); tocar(x); };
  // cambia un campo con historial (status, assignee, priority) y deja constancia como en "History"
  function cambiarCampo(x, campo, valor, u = 'alumno') {
    const prop = { status: 'estado', assignee: 'asig', priority: 'prior' }[campo];
    const antes = x[prop]; if (antes === valor) return false;
    x.hist.push({ c: campo, de: antes, a: valor, u, f: ahora() });
    const nom = (v) => (campo === 'assignee' ? (persona(v) || 'Unassigned') : v);
    registrar(x, `changed the ${campo === 'status' ? 'Status' : campo === 'assignee' ? 'Assignee' : 'Priority'} from ${nom(antes)} to ${nom(valor)}`, u);
    x[prop] = valor;
    if (campo === 'status') {
      if (valor === 'Done') { x.hecho = ahora(); x.res = 'Done'; x.resF = ahora(); } else if (antes === 'Done') { x.res = null; x.resF = null; }
    }
    return true;
  }
  function vincular(s, a, tipo, b) {
    const A = s.issues.find((x) => x.n === a), B = s.issues.find((x) => x.n === b); if (!A || !B || a === b) return false;
    if (A.links.some((l) => l.n === b && l.t === tipo)) return false;
    A.links.push({ t: tipo, n: b }); B.links.push({ t: inverso(tipo), n: a }); return true;
  }
  function desvincular(a, tipo, b) {
    const A = issue(a), B = issue(b); if (!A || !B) return;
    A.links = A.links.filter((l) => !(l.n === b && l.t === tipo)); B.links = B.links.filter((l) => !(l.n === a && l.t === inverso(tipo)));
  }

  // ------------------------------------------------------------------ tiempo (1w 2d 4h 30m: 1w = 5d, 1d = 8h, como el time tracking por defecto)
  function parseDuracion(t) {
    let seg = 0, ok = false;
    const re = /(\d+(?:[.,]\d+)?)\s*([wdhm])\b/gi; let m;
    while ((m = re.exec(t))) { ok = true; seg += Number(m[1].replace(',', '.')) * { w: 5 * 8 * 3600, d: 8 * 3600, h: 3600, m: 60 }[m[2].toLowerCase()]; }
    return ok ? Math.round(seg) : null;
  }
  function fmtDuracion(seg) {
    if (!seg) return '0m';
    const p = []; let r = Math.round(seg / 60);
    for (const [u, min] of [['w', 2400], ['d', 480], ['h', 60], ['m', 1]]) { const k = Math.floor(r / min); if (k) { p.push(k + u); r -= k * min; } }
    return p.join(' ');
  }

  // ------------------------------------------------------------------ smart commits
  // Los commits empujados (los que están en un repositorio remoto) que nombran una clave quedan en "Development".
  // Si además los escribió el alumno y traen comandos (#comment, #time, #<transición>), se ejecutan una sola vez.
  const G = () => (window.Shell && window.Shell.github) || null;
  function transicionDe(cmd) {
    const c = cmd.toLowerCase();
    const llenos = ESTADOS.filter((e) => e.toLowerCase().replace(/\s+/g, '-') === c);
    if (llenos.length) return { estado: llenos[0] };
    // como en Jira: se usa la parte del nombre antes del primer espacio, si no hay ambigüedad
    const prim = ESTADOS.filter((e) => e.toLowerCase().split(' ')[0] === c);
    if (prim.length === 1) return { estado: prim[0] };
    if (prim.length > 1) return { error: `#${cmd} es ambiguo (${prim.join(', ')}): usa el nombre completo con guiones, por ejemplo #${prim[0].toLowerCase().replace(/\s+/g, '-')}` };
    return null;
  }
  function procesarCommits() {
    const A = G(); if (!A || !A.remotos) return 0;
    const s = raiz(); let n = 0;
    for (const [url, R] of Object.entries(A.remotos())) {
      const repo = String(url).replace(/\/+$/, '').split('/').pop();
      for (const [h, c] of Object.entries(R.commits || {})) {
        if (s.proc[h]) continue;
        s.proc[h] = 1;
        const lineas = String(c.msg || '').split('\n');
        for (const linea of lineas) {
          const claves = [...linea.matchAll(/\b([A-Z][A-Z0-9]+-\d+)\b/g)].map((m) => m[1]);
          if (!claves.length) continue;   // una línea sin clave no ejecuta comandos
          const xs = claves.map((k) => ({ k, x: porClave(k) }));
          for (const { x } of xs) if (x && !x.dev.some((d) => d.h === h)) { x.dev.push({ h, repo, msg: lineas[0], f: c.date || ahora(), autor: c.author }); tocar(x); }
          if (c.author !== 'alumno') continue;
          const cmds = [...linea.matchAll(/#([\w-]+)((?:(?!\s#[\w-]).)*)/g)].map((m) => [m[1], m[2].trim()]);
          for (const [cmd, arg] of cmds) {
            if (/^\d+$/.test(cmd)) continue;   // (#12) es la referencia a un pull request, no un comando
            for (const { k, x } of xs) {
              const reg = { h, repo, k, cmd: '#' + cmd + (arg ? ' ' + arg : ''), f: ahora() };
              if (!x) { s.smart.push({ ...reg, ok: false, msg: `La issue ${k} no existe en este proyecto` }); continue; }
              if (/^comment$/i.test(cmd)) { if (!arg) { s.smart.push({ ...reg, ok: false, msg: '#comment necesita un texto' }); continue; } x.com.push({ u: 'alumno', t: arg, f: ahora() }); tocar(x); s.smart.push({ ...reg, ok: true, msg: 'Comentario agregado' }); responderTicket(x, arg); }
              else if (/^time$/i.test(cmd)) {
                const seg = parseDuracion(arg); if (!seg) { s.smart.push({ ...reg, ok: false, msg: 'Formato de tiempo inválido: usa 1w 2d 4h 30m' }); continue; }
                const resto = arg.replace(/(\d+(?:[.,]\d+)?)\s*[wdhm]\b/gi, '').trim();
                x.log.push({ seg, u: 'alumno', f: ahora(), c: resto }); registrar(x, `logged ${fmtDuracion(seg)}`); s.smart.push({ ...reg, ok: true, msg: `Se registraron ${fmtDuracion(seg)}` });
              } else {
                const t = transicionDe(cmd);
                if (!t) { s.smart.push({ ...reg, ok: false, msg: `No hay una transición llamada "${cmd}" (las de este flujo: ${ESTADOS.map((e) => '#' + e.toLowerCase().replace(/\s+/g, '-')).join(', ')})` }); continue; }
                if (t.error) { s.smart.push({ ...reg, ok: false, msg: t.error }); continue; }
                cambiarCampo(x, 'status', t.estado); s.smart.push({ ...reg, ok: true, msg: `Pasó a ${t.estado}` }); revisarTicket(x, t.estado);
                if (arg && !/^#/.test(arg)) { x.com.push({ u: 'alumno', t: arg, f: ahora() }); }
              }
              n++;
            }
          }
        }
      }
    }
    if (n) { evento('smart-commit'); }
    guardar();
    return n;
  }


  // ------------------------------------------------------------------ proyectos de clientes (end to end)
  // Cada proyecto del curso (Pedalia, Mercado Vecino, …) registra su cola de tickets en window.__tableros. Acá esos
  // tickets se vuelven issues de su propio proyecto de Jira, como en una consultora de datos con un proyecto por
  // cliente: llegan cuando el negocio los pide (sin asignar, al sprint en curso), la persona que pidió es el
  // informante, y el líder técnico revisa cada entrega contra sus criterios de aceptación antes de pasarla a Done.
  const REVISOR = 'martin';
  const TIPO_TICKET = { requerimiento: 'Story', incidente: 'Bug', pregunta: 'Task' };
  const slug = (t) => norm(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function personaDe(de) {
    const [nombre, rol] = String(de || 'Equipo').split(' · '); const r = raiz();
    const id = slug(nombre) || 'equipo';
    if (!GENTE[id] && !r.gente[id]) r.gente[id] = { nombre: nombre.trim(), rol: (rol || '').trim() };
    return id;
  }
  // "Andrea: el MRR es…" en un hilo: el autor es la persona del proyecto cuyo nombre empieza así
  const autorDe = (nombre) => { const t = norm(nombre); const e = Object.entries(raiz().gente).find(([, g]) => norm(g.nombre).startsWith(t)); return e ? e[0] : personaDe(nombre); };
  function ticketDe(x) {
    if (!x || !x.tk) return null; const g = regDe(x.tk.c); if (!g) return null;
    try { const cfg = g.cfg(); const k = cfg.tickets.find((y) => y.id === x.tk.id); const D = cfg.datos(); if (!k || !D) return null; D.tickets = D.tickets || {}; return { g, cfg, k, D }; } catch (e) { return null; }
  }
  function sincronizarProyectos() {
    let cambios = 0;
    const visitadas = Object.keys((Store.data && Store.data.visited) || {});
    for (const g of regs()) {
      // el reloj del cliente arranca cuando abres la primera lección del proyecto: antes, no hay tickets
      if (!raiz().proyectos[g.clave] && !visitadas.some((id) => id.startsWith(g.modulo + '-'))) continue;
      let cfg, ctx, D;
      try { cfg = g.cfg(); ctx = cfg.contexto(); D = cfg.datos(); } catch (e) { continue; }
      if (!cfg || !ctx || !D) continue;
      const { I, H, t } = ctx; const P = proyecto(g.clave);
      P.nombre = g.nombre; P.modulo = g.modulo;
      const base = (n, tipo, titulo, desc) => ({ p: g.clave, n, tipo, titulo, estado: 'To Do', asig: null, rep: REVISOR, pts: null, sprint: null, epic: null, prior: 'High', desc, padre: null, labels: [], creado: new Date(I).toISOString(), upd: new Date(I).toISOString(), act: [{ u: REVISOR, t: 'created the issue', f: new Date(I).toISOString() }], com: [], hist: [], links: [], log: [], dev: [], due: null, flag: false, res: null, resF: null });
      if (!P.issues.some((x) => x.tipo === 'Epic')) {
        P.issues.push(base(1, 'Epic', `Entrega: plataforma de datos de ${g.nombre}`, `Todo lo que el cliente pidió para la primera entrega: ingesta, modelos, controles y tableros. Cada historia tiene sus criterios de aceptación; el líder técnico la revisa antes de cerrarla.`));
        P.issues.push(base(2, 'Epic', `Operación y soporte de ${g.nombre}`, 'Incidentes de producción y preguntas del negocio que llegan una vez que los datos están en uso.'));
        cambios++;
      }
      if (!P.sprints.length) { P.sprints.push({ id: 1, nombre: `${g.clave} Sprint 1`, meta: `Primera entrega para ${g.nombre}`, estado: 'active', inicio: new Date(I).toISOString(), fin: new Date(I + 14 * DIA).toISOString(), alInicio: {}, anadidas: [], comprometido: 0 }); cambios++; }
      for (const k of cfg.tickets) {
        let T; try { T = k.cuando(I, H); } catch (e) { continue; }
        if (!(T <= t)) continue;
        const n = Number(String(k.id).split('-')[1]);
        let x = P.issues.find((y) => y.n === n);
        if (!x) {
          let texto = ''; try { texto = typeof k.texto === 'function' ? k.texto(T, H) : k.texto || ''; } catch (e) { texto = ''; }
          const rep2 = personaDe(k.de), f = new Date(T).toISOString();
          const desc = [texto, k.criterios && k.criterios.length ? `\nCriterios de aceptación:\n${k.criterios.map((c) => '- ' + c).join('\n')}` : '', k.respuesta ? `\nRespuesta esperada: ${k.respuesta.tipo === 'numero' ? `un número${k.respuesta.unidad ? ' (' + k.respuesta.unidad + ')' : ''}` : 'texto'}. Responde con un comentario en este ticket.` : '', `\nPedido por: ${k.de}`].join('\n').trim();
          x = { ...base(n, TIPO_TICKET[k.tipo] || 'Story', k.titulo, desc), rep: rep2, prior: k.tipo === 'incidente' ? 'Highest' : k.tipo === 'pregunta' ? 'Medium' : 'High', pts: k.tipo === 'requerimiento' ? 5 : k.tipo === 'pregunta' ? 1 : null, epic: k.tipo === 'requerimiento' ? 1 : 2, labels: [k.tipo === 'incidente' ? 'incidente' : k.tipo === 'pregunta' ? 'consulta-negocio' : 'requerimiento'], creado: f, upd: f, act: [{ u: rep2, t: 'created the issue', f }], due: new Date(T + (k.tipo === 'incidente' ? 1 : k.tipo === 'pregunta' ? 2 : 14) * DIA).toISOString().slice(0, 10), tk: { c: g.clave, id: k.id } };
          for (const c of k.comentarios || []) { const m = String(c).match(/^([^:]{2,40}):\s*([\s\S]+)$/); x.com.push({ u: m ? autorDe(m[1]) : rep2, t: m ? m[2] : String(c), f }); }
          const sp = P.sprints.find((y) => y.estado === 'active');
          if (sp) { x.sprint = sp.id; sp.alInicio = sp.alInicio || {}; sp.anadidas = sp.anadidas || []; if (T <= new Date(sp.inicio).getTime() + 6e4) { sp.alInicio[n] = x.pts || 0; sp.comprometido = (sp.comprometido || 0) + (x.pts || 0); } else sp.anadidas.push(n); }
          P.issues.push(x); cambios++;
        }
        // lo resuelto desde el tablero de la lección también queda cerrado en Jira
        const e = D.tickets && D.tickets[k.id];
        if (e && e.hecho && x.estado !== 'Done') { cambiarCampo(x, 'status', 'Done', 'alumno'); x.com.push({ u: 'alumno', t: e.respuesta ? `Respuesta: ${e.respuesta}` : 'Resuelto y verificado desde el tablero del proyecto.', f: ahora() }); cambios++; }
      }
      P.sig = Math.max(P.sig || 1, ...P.issues.map((x) => x.n + 1));
    }
    if (cambios) guardar();
    return cambios;
  }
  // el líder técnico revisa la entrega contra los criterios de aceptación (la misma prueba que el tablero del proyecto)
  async function revisarTicket(x, destino) {
    const tk = ticketDe(x); if (!tk || !['In Review', 'Done'].includes(destino)) return;
    const { cfg, k, D } = tk; const e = (D.tickets[k.id] = D.tickets[k.id] || {});
    if (e.hecho) return;
    const fin = () => { tocar(x); guardar(); if (main && /^#\/jira/.test(location.hash)) { const mm = main.querySelector('#jrModal'); if (!mm || mm.hidden) dibujar(); } };
    if (k.respuesta) {
      if (destino === 'Done') { cambiarCampo(x, 'status', 'In Progress', x.rep); x.com.push({ u: x.rep, t: `Todavía no tengo la respuesta. Escríbela en un comentario de este ticket${k.respuesta.unidad ? ` (en ${k.respuesta.unidad})` : ''} y la reviso.`, f: ahora() }); fin(); }
      return;
    }
    if (!k.check) { e.hecho = Date.now(); cfg.guardar(); fin(); return; }
    aviso(`Revisando ${clave(x)} contra sus criterios de aceptación…`);
    let r; try { if (window.__discoListo) await window.__discoListo(); r = await k.check(); } catch (err) { r = String(err.message || err); }
    e.intentos = (e.intentos || 0) + 1;
    if (r === true) { e.hecho = Date.now(); e.nota = ''; cfg.guardar(); if (x.estado !== 'Done') cambiarCampo(x, 'status', 'Done', REVISOR); x.com.push({ u: REVISOR, t: '✅ Revisé la entrega contra los criterios de aceptación y cumple. La paso a Done.', f: ahora() }); evento('ticket-aceptado'); aviso(`${clave(x)} aprobado por ${persona(REVISOR)}`); }
    else { e.nota = r; cfg.guardar(); cambiarCampo(x, 'status', 'In Progress', REVISOR); x.com.push({ u: REVISOR, t: `🔁 La devuelvo a In Progress. ${r}`, f: ahora() }); aviso(`${clave(x)} volvió a In Progress: mira el comentario de ${persona(REVISOR)}`); }
    fin();
  }
  // una pregunta del negocio se responde con un comentario; quien preguntó lo verifica y cierra el ticket
  async function responderTicket(x, texto) {
    const tk = ticketDe(x); if (!tk || !tk.k.respuesta) return false;
    const { cfg, k, D } = tk; const e = (D.tickets[k.id] = D.tickets[k.id] || {});
    if (e.hecho) return false;
    let T, H; try { const c = cfg.contexto(); H = c.H; T = k.cuando(c.I, c.H); } catch (err) { return false; }
    const num = (window.TableroTickets && window.TableroTickets.numero) || Number;
    const cands = k.respuesta.tipo === 'numero' ? (String(texto).match(/-?\d[\d.,]*%?/g) || []).map((v) => num(v)).filter(Number.isFinite) : [String(texto)];
    if (!cands.length) return false;
    let r = null;
    for (const v of cands) { try { r = await k.respuesta.verificar(v, T, H); } catch (err) { r = String(err.message || err); } if (r === true) { e.respuesta = String(v); break; } }
    e.intentos = (e.intentos || 0) + 1;
    if (r === true) { e.hecho = Date.now(); e.nota = ''; cfg.guardar(); x.com.push({ u: x.rep, t: '¡Gracias! Coincide con lo que esperábamos. Cierro el ticket.', f: ahora() }); if (x.estado !== 'Done') cambiarCampo(x, 'status', 'Done', x.rep); evento('ticket-respondido'); }
    else { e.nota = r; cfg.guardar(); x.com.push({ u: x.rep, t: `Mmm, no me cierra. ${r}`, f: ahora() }); }
    tocar(x); guardar();
    return true;
  }
  function directorio() {
    sincronizarProyectos();
    const r = raiz();
    const filas = [{ k: 'TA', nombre: 'Tienda Andina Datos', tipo: 'Interno', lead: 'martin', modulo: 'proyecto-equipo' }, ...regs().map((g) => ({ k: g.clave, nombre: g.nombre, tipo: 'Cliente', lead: 'martin', modulo: g.modulo }))];
    const cuenta = (k) => { const S = estadoDe(k); if (!S) return [0, 0]; const xs = S.issues.filter((x) => x.tipo !== 'Epic'); return [xs.filter((x) => x.estado !== 'Done').length, xs.length]; };
    const cuerpo = `<h1 class="jr-h1">Projects</h1><p class="jr-dim">Un proyecto de Jira por cliente, como en una consultora de datos. Los tickets llegan cuando el negocio los pide (al sprint en curso, sin asignar); tú los tomas, los mueves por el tablero y el líder técnico revisa cada entrega contra sus criterios de aceptación antes de cerrarla. Las preguntas del negocio se responden con un comentario en el ticket.</p>
      <div class="jr-tabla-w"><table class="jr-tabla"><thead><tr><th>Name</th><th>Key</th><th>Type</th><th>Lead</th><th>Open issues</th><th>Lessons</th></tr></thead><tbody>${filas.map((f) => { const [ab, tot] = cuenta(f.k); const empezado = f.k === 'TA' || !!r.proyectos[f.k]; return `<tr><td><a href="${f.k === 'TA' ? href('board') : href('projects', f.k, 'board')}"><span class="jr-proy-ic jr-proy-ic-sm">${esc(f.k)}</span> ${esc(f.nombre)}</a></td><td>${esc(f.k)}</td><td>${f.tipo}</td><td>${avatar(f.lead, 20)} ${esc(persona(f.lead))}</td><td>${empezado ? `${ab} <span class="jr-dim">de ${tot}</span>` : '<span class="jr-dim">el proyecto todavía no empezó</span>'}</td><td><a href="#/m/${esc(f.modulo)}">Ver el módulo</a></td></tr>`; }).join('')}</tbody></table></div>
      <p class="jr-dim">Un proyecto aparece con issues cuando abres su primera lección: ese día empieza el reloj del cliente.</p>`;
    main.innerHTML = marco('projects', cuerpo, []); montar();
  }

  // ------------------------------------------------------------------ marco
  function marco(sel, cuerpo, migas = []) {
    const NAV = [['#PLANNING'], ['timeline', 'Timeline', hp('timeline')], ['backlog', 'Backlog', hp('backlog')], ['board', 'Board', hp('board')], ['reports', 'Reports', hp('reports')], ['#'], ['issues', 'Issues', hp('issues')], ['code', 'Code', hp('code')], ['pages', 'Project pages', hp('pages')], ['#'], ['board-settings', 'Board settings', hp('board-settings')]];
    return `<div class="jrp" id="jrp"><header class="jr-top"><a class="jr-marca" href="${href('projects')}"><span class="jr-logo" aria-hidden="true">◆</span><b>Jira</b><span class="jr-tag">práctica</span></a>
      <nav class="jr-topnav"><a href="${href('issues')}?jql=${encodeURIComponent('assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC')}">Your work</a><a href="${href('projects')}">Projects</a><a href="${href('issues')}">Filters</a></nav>
      <button class="jr-crear" id="jrCrear">Create</button><span class="jr-sp"></span><label class="jr-buscar"><span aria-hidden="true">⌕</span><input id="jrQ" placeholder="Search" aria-label="Search issues"></label>${avatar('alumno', 28)}</header>
      <div class="jr-cuerpo"><nav class="jr-nav" aria-label="Project"><div class="jr-proy"><span class="jr-proy-ic">${esc(cur)}</span><div><b>${esc(nombreProyecto(cur))}</b><small>Software project · ${cur === 'TA' ? 'interno' : 'cliente'}</small></div></div>${NAV.map(([id, t, h]) => (id[0] === '#' ? `<div class="jr-nav-sec">${esc(id.slice(1))}</div>` : `<a class="jr-nav-i${sel === id ? ' on' : ''}" href="${h}">${t}</a>`)).join('')}</nav>
      <main class="jr-main">${migas.length ? `<div class="jr-migas"><a href="${href('projects')}">Projects</a> / ${esc(nombreProyecto(cur))}${migas.map((m) => ` / ${esc(m)}`).join('')}</div>` : ''}${cuerpo}</main></div>
      <div class="jr-modal" id="jrModal" hidden></div><div class="jr-toast" id="jrToast" role="status" aria-live="polite"></div></div>`;
  }
  function montar() {
    main.querySelector('#jrCrear').onclick = () => crear();
    const q = main.querySelector('#jrQ');
    q.onkeydown = (e) => { if (e.key !== 'Enter') return; const t = q.value.trim(); const x = porClave(t); if (x) location.hash = href('browse', clave(x)); else location.hash = href('issues') + '?jql=' + encodeURIComponent(t ? `text ~ "${t.replace(/"/g, '')}"` : ''); };
    main.querySelectorAll('[data-issue]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); verIssue(Number(a.dataset.issue)); }; });
    // en las búsquedas aparecen issues de cualquier proyecto: si es de otro, se abre su página
    main.querySelectorAll('[data-clave]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const x = porClave(a.dataset.clave); if (!x) return; if ((x.p || 'TA') === cur) verIssue(x.n); else location.hash = href('browse', clave(x)); }; });
  }
  function aviso(t) { const x = main.querySelector('#jrToast'); if (!x) return; x.innerHTML = `<div>${t}</div>`; clearTimeout(aviso.t); aviso.t = setTimeout(() => { x.innerHTML = ''; }, 4000); }
  function modal(html, alMontar, ancho = 620) {
    const m = main.querySelector('#jrModal'); m.hidden = false; m.innerHTML = `<div class="jr-modal-c" role="dialog" aria-modal="true" style="width:min(${ancho}px,100%)">${html}</div>`;
    const cerrar = () => { m.hidden = true; m.innerHTML = ''; };
    m.querySelectorAll('[data-cerrar]').forEach((b) => { b.onclick = cerrar; }); m.onclick = (e) => { if (e.target === m) cerrar(); };
    if (alMontar) alMontar(m, cerrar); return cerrar;
  }
  const btn = (t, attr = '', tipo = '') => `<button type="button" class="jr-btn${tipo ? ' jr-btn-' + tipo : ''}" ${attr}>${t}</button>`;
  const lozenge = (e) => `<span class="jr-loz jr-loz-${e === 'Done' ? 'done' : e === 'To Do' ? 'todo' : 'prog'}">${esc(e)}</span>`;
  const filaIssue = (x) => `<div class="jr-fila${x.flag ? ' jr-flagged' : ''}"><span>${icTipo(x.tipo)}</span><a href="#" data-issue="${x.n}" class="jr-key${x.estado === 'Done' ? ' jr-hecho' : ''}">${clave(x)}</a><a href="#" data-issue="${x.n}" class="jr-fila-t">${esc(x.titulo)}</a>${x.flag ? icFlag : ''}${x.epic ? `<span class="jr-epic-tag">${esc((issue(x.epic) || {}).titulo || '')}</span>` : ''}${lozenge(x.estado)}<span class="jr-pts" title="Story points">${x.pts == null ? '-' : x.pts}</span>${icPrior(x.prior)}${avatar(x.asig, 22)}</div>`;
  const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
  const fechaLarga = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

  // ------------------------------------------------------------------ backlog
  function backlog() {
    const s = st(), padres = (xs) => xs.filter((x) => x.tipo !== 'Subtask' && x.tipo !== 'Epic');
    const sumaPts = (xs) => xs.reduce((a, x) => a + (x.pts || 0), 0);
    const bloque = (sp) => { const xs = padres(s.issues.filter((x) => x.sprint === sp.id)); return `<section class="jr-sprint" data-sprint="${sp.id}"><div class="jr-sprint-h"><b>${esc(sp.nombre)}</b> <span class="jr-dim">${sp.estado === 'active' ? `${fechaCorta(sp.inicio)} – ${fechaCorta(sp.fin)}` : 'Add dates'} · ${xs.length} issues</span>${sp.meta ? `<span class="jr-meta">${esc(sp.meta)}</span>` : ''}<span class="jr-sp"></span>
      <span class="jr-sum">${['To Do', 'In Progress', 'Done'].map((e) => `<i class="jr-sum-${e === 'Done' ? 'done' : e === 'To Do' ? 'todo' : 'prog'}" title="${e}">${sumaPts(xs.filter((x) => CATEGORIA[x.estado] === e))}</i>`).join('')}</span>
      ${sp.estado === 'active' ? btn('Complete sprint', `data-completar="${sp.id}"`) : btn('Start sprint', `data-iniciar="${sp.id}" ${activo() ? 'disabled title="Ya hay un sprint activo (para tener varios a la vez hay que activar los sprints paralelos)"' : ''}`)}</div>
      <div class="jr-lista" data-drop="${sp.id}">${xs.map(filaArr).join('') || '<p class="jr-dim jr-vacio">Plan a sprint by dragging issues here from the backlog.</p>'}</div></section>`; };
    const bl = padres(s.issues.filter((x) => !x.sprint && x.estado !== 'Done'));
    const cuerpo = `<div class="jr-barra"><h1 class="jr-h1">Backlog</h1><span class="jr-sp"></span><label class="jr-buscar jr-buscar-sm"><span aria-hidden="true">⌕</span><input id="jrBF" placeholder="Search backlog" aria-label="Search backlog"></label></div>
      ${s.sprints.filter((x) => x.estado !== 'closed').map(bloque).join('')}
      <section class="jr-sprint" data-sprint="0"><div class="jr-sprint-h"><b>Backlog</b> <span class="jr-dim">${bl.length} issues</span><span class="jr-sp"></span>${btn('Create sprint', 'data-nuevo-sprint')}</div><div class="jr-lista" data-drop="0">${bl.map(filaArr).join('') || '<p class="jr-dim jr-vacio">Your backlog is empty.</p>'}</div>
      <button class="jr-crear-rapido" data-crear-rapido>+ Create issue</button></section>
      <p class="jr-dim">Arrastra una issue entre el backlog y un sprint (o usa su menú “Move to”). Si agregas una issue a un sprint que ya empezó, el Sprint Report la marca con un asterisco: es trabajo que entró después del compromiso.</p>`;
    main.innerHTML = marco('backlog', cuerpo, ['Backlog']); montar();
    main.querySelectorAll('.jr-fila[draggable]').forEach((f) => { f.ondragstart = (e) => { e.dataTransfer.setData('text/plain', f.dataset.n); f.classList.add('arrastrando'); }; f.ondragend = () => f.classList.remove('arrastrando'); });
    main.querySelectorAll('[data-drop]').forEach((z) => { z.ondragover = (e) => { e.preventDefault(); z.classList.add('sobre'); }; z.ondragleave = () => z.classList.remove('sobre'); z.ondrop = (e) => { e.preventDefault(); mover(e.dataTransfer.getData('text/plain'), Number(z.dataset.drop)); }; });
    main.querySelectorAll('[data-mover]').forEach((sel) => { sel.onchange = () => mover(sel.dataset.mover, Number(sel.value)); });
    main.querySelectorAll('[data-iniciar]').forEach((b) => { b.onclick = () => iniciarSprint(Number(b.dataset.iniciar)); });
    main.querySelectorAll('[data-completar]').forEach((b) => { b.onclick = () => completarSprint(Number(b.dataset.completar)); });
    main.querySelector('[data-nuevo-sprint]').onclick = () => { nuevoSprint(); backlog(); };
    main.querySelector('[data-crear-rapido]').onclick = () => crear();
    const bf = main.querySelector('#jrBF'); bf.oninput = () => main.querySelectorAll('.jr-fila[data-n]').forEach((f) => { f.hidden = !f.textContent.toLowerCase().includes(bf.value.toLowerCase()); });
  }
  const nuevoSprint = () => { const s = st(); const n = s.sprints.reduce((m, x) => Math.max(m, x.id), 0) + 1; const sp = { id: n, nombre: `${cur} Sprint ${n}`, meta: '', estado: 'future', inicio: null, fin: null }; s.sprints.push(sp); guardar(); return sp; };
  const filaArr = (x) => `<div class="jr-fila${x.flag ? ' jr-flagged' : ''}" draggable="true" data-n="${x.n}"><span>${icTipo(x.tipo)}</span><a href="#" data-issue="${x.n}" class="jr-key">${clave(x)}</a><a href="#" data-issue="${x.n}" class="jr-fila-t">${esc(x.titulo)}</a>${x.flag ? icFlag : ''}${x.epic ? `<span class="jr-epic-tag">${esc((issue(x.epic) || {}).titulo || '')}</span>` : ''}${lozenge(x.estado)}<span class="jr-pts" title="Story points">${x.pts == null ? '-' : x.pts}</span>${icPrior(x.prior)}${avatar(x.asig, 22)}<label class="jr-sr" for="jrMv${x.n}">Move to</label><select class="jr-mover" id="jrMv${x.n}" data-mover="${x.n}"><option value="">Move to…</option>${st().sprints.filter((s) => s.estado !== 'closed').map((s) => `<option value="${s.id}">${esc(s.nombre)}</option>`).join('')}<option value="0">Backlog</option></select></div>`;
  function mover(n, sp) {
    const s = st(), x = issue(n); if (!x) return;
    const dest = s.sprints.find((y) => y.id === sp);
    x.sprint = sp || null; s.issues.filter((y) => y.padre === x.n).forEach((y) => { y.sprint = x.sprint; });
    if (dest && dest.estado === 'active') { dest.anadidas = dest.anadidas || []; if (!dest.anadidas.includes(x.n) && !(x.n in (dest.alInicio || {}))) dest.anadidas.push(x.n); }
    registrar(x, dest ? `moved to ${dest.nombre}` : 'moved to Backlog'); guardar(); evento('mover-sprint'); backlog();
  }
  function iniciarSprint(id) {
    const sp = st().sprints.find((x) => x.id === id), xs = st().issues.filter((x) => x.sprint === id);
    if (!xs.length) { aviso('Agrega al menos una issue al sprint antes de iniciarlo.'); return; }
    const hoy = new Date(); const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    modal(`<h2>Start sprint</h2><p class="jr-dim">${xs.filter((x) => x.tipo !== 'Subtask').length} issues will be included in this sprint.</p>
      <label class="jr-lbl" for="jrSN">Sprint name <span class="jr-req">*</span></label><input class="jr-in" id="jrSN" value="${esc(sp.nombre)}">
      <label class="jr-lbl" for="jrSD">Duration</label><select class="jr-in" id="jrSD"><option value="7">1 week</option><option value="14" selected>2 weeks</option><option value="21">3 weeks</option><option value="28">4 weeks</option><option value="">custom</option></select>
      <div class="jr-2col"><div><label class="jr-lbl" for="jrSI">Start date <span class="jr-req">*</span></label><input class="jr-in" id="jrSI" type="datetime-local" value="${iso(hoy)}"></div><div><label class="jr-lbl" for="jrSF">End date <span class="jr-req">*</span></label><input class="jr-in" id="jrSF" type="datetime-local" value="${iso(new Date(hoy.getTime() + 14 * DIA))}"></div></div>
      <label class="jr-lbl" for="jrSG">Sprint goal</label><textarea class="jr-in jr-ta" id="jrSG" rows="3" placeholder="Qué valor entrega el equipo al terminar (aparece en el Sprint Report y en el burndown)">${esc(sp.meta)}</textarea>
      <div class="jr-modal-b">${btn('Cancel', 'data-cerrar', 'sutil')}${btn('Start', 'id="jrSOk"', 'primario')}</div>`, (m, cerrar) => {
      const dur = m.querySelector('#jrSD'), ini = m.querySelector('#jrSI'), fin = m.querySelector('#jrSF');
      const recalcular = () => { if (dur.value) fin.value = iso(new Date(new Date(ini.value).getTime() + Number(dur.value) * DIA)); };
      dur.onchange = recalcular; ini.onchange = recalcular; fin.oninput = () => { dur.value = ''; };
      m.querySelector('#jrSOk').onclick = () => {
        const a = new Date(ini.value), b = new Date(fin.value);
        if (!(b > a)) { aviso('La fecha de fin tiene que ser posterior a la de inicio'); return; }
        sp.nombre = m.querySelector('#jrSN').value.trim() || sp.nombre; sp.meta = m.querySelector('#jrSG').value.trim(); sp.estado = 'active'; sp.inicio = a.toISOString(); sp.fin = b.toISOString();
        const padres = xs.filter((x) => x.tipo !== 'Subtask');
        sp.comprometido = padres.reduce((s2, x) => s2 + (x.pts || 0), 0); sp.alInicio = Object.fromEntries(padres.map((x) => [x.n, x.pts || 0])); sp.anadidas = [];
        guardar(); evento('sprint-iniciar'); cerrar(); location.hash = hp('board');
      };
    });
  }
  function completarSprint(id) {
    const s = st(), sp = s.sprints.find((x) => x.id === id), xs = s.issues.filter((x) => x.sprint === id && x.tipo !== 'Subtask');
    const hechos = xs.filter((x) => x.estado === 'Done'), abiertos = xs.filter((x) => x.estado !== 'Done');
    // una historia terminada con subtareas abiertas no deja cerrar el sprint
    const conSubAbiertas = hechos.filter((x) => s.issues.some((y) => y.padre === x.n && y.estado !== 'Done'));
    if (conSubAbiertas.length) { modal(`<h2>Can't complete ${esc(sp.nombre)}</h2><p>Estas issues están en <b>Done</b> pero tienen subtareas sin terminar: ${conSubAbiertas.map((x) => `<a href="#" data-issue="${x.n}">${clave(x)}</a>`).join(', ')}. Termina las subtareas o vuelve a abrir la historia.</p><div class="jr-modal-b">${btn('OK', 'data-cerrar', 'primario')}</div>`, (m, cerrar) => { m.querySelectorAll('[data-issue]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); cerrar(); verIssue(Number(a.dataset.issue)); }; }); }); return; }
    const futuros = s.sprints.filter((x) => x.estado === 'future');
    modal(`<h2>Complete ${esc(sp.nombre)}</h2><p>This sprint contains <b>${hechos.length} completed issues</b> and <b>${abiertos.length} open issues</b>.</p><p class="jr-dim">Solo cuenta como completo lo que está en la última columna (Done). Las issues terminadas quedan en el sprint; las abiertas pasan al lugar que elijas.</p>${abiertos.length ? `<label class="jr-lbl" for="jrCM">Move open issues to</label><select class="jr-in" id="jrCM">${futuros.map((f) => `<option value="${f.id}">${esc(f.nombre)}</option>`).join('')}<option value="nuevo">New sprint</option><option value="0">Backlog</option></select>` : ''}<div class="jr-modal-b">${btn('Cancel', 'data-cerrar', 'sutil')}${btn('Complete sprint', 'id="jrCOk"', 'primario')}</div>`, (m, cerrar) => {
      m.querySelector('#jrCOk').onclick = () => {
        const sel = m.querySelector('#jrCM'); let dest = sel ? sel.value : '0';
        if (dest === 'nuevo') dest = nuevoSprint().id;
        dest = Number(dest) || null;
        abiertos.forEach((x) => { x.sprint = dest; s.issues.filter((y) => y.padre === x.n).forEach((y) => { y.sprint = dest; }); registrar(x, `moved from ${sp.nombre} (not completed)`); });
        sp.estado = 'closed'; sp.cerrado = ahora();
        sp.reporte = { completadas: hechos.map((x) => x.n), noCompletadas: abiertos.map((x) => x.n), pts: Object.fromEntries(xs.map((x) => [x.n, x.pts || 0])) };
        s.cerrados.push({ id: sp.id, nombre: sp.nombre, comprometido: sp.comprometido || xs.reduce((a, x) => a + (x.pts || 0), 0), hecho: hechos.reduce((a, x) => a + (x.pts || 0), 0) });
        guardar(); evento('sprint-completar'); cerrar(); location.hash = hp('reports') + '?r=sprint&sp=' + sp.id;
      };
    });
  }

  // ------------------------------------------------------------------ tablero
  // límites por columna (column constraints): rojo si se pasa del máximo, amarillo si no llega al mínimo
  function cuentaColumna(xs, e) { const b = st().board; return xs.filter((x) => x.estado === e && x.tipo !== 'Epic' && (b.restr !== 'sin-subtareas' || x.tipo !== 'Subtask')).length; }
  function tablero() {
    const s = st(), sp = activo(), B = s.board;
    if (!sp) { main.innerHTML = marco('board', `<h1 class="jr-h1">Board</h1><div class="jr-card jr-vacio-g"><h2>Get started in the backlog</h2><p>Planifica un sprint en el backlog y presiona <b>Start sprint</b>: sus issues aparecen acá.</p>${btn('Go to Backlog', `onclick="location.hash='${hp('backlog')}'"`, 'primario')}</div>`, ['Board']); return montar(); }
    const quien = query.get('asig') || '';
    const qfOn = (query.get('qf') || '').split(',').filter(Boolean).map(Number);
    const todos = s.issues.filter((x) => x.sprint === sp.id && x.tipo !== 'Epic');
    // los quick filters activos se combinan con AND
    const preds = qfOn.map((id) => B.qf.find((q) => q.id === id)).filter(Boolean).map((q) => jql(q.jql)).filter((r) => r.ok).map((r) => new Set(r.xs.map((x) => x.n)));
    const xs = todos.filter((x) => (!quien || x.asig === quien) && preds.every((set) => set.has(x.n)));
    const dias = Math.max(0, Math.ceil((new Date(sp.fin) - Date.now()) / DIA));
    const swim = query.get('g') || B.swim;
    const carriles = carrilesDe(swim, xs);
    const linkQf = (id) => { const set = new Set(qfOn); if (set.has(id)) set.delete(id); else set.add(id); const p = new URLSearchParams(query); if (set.size) p.set('qf', [...set].join(',')); else p.delete('qf'); const t = p.toString(); return hp('board') + (t ? '?' + t : ''); };
    const linkG = (g) => { const p = new URLSearchParams(query); p.set('g', g); return hp('board') + '?' + p.toString(); };
    const cabeza = (e) => { const lim = B.restr === 'ninguna' ? {} : (B.wip[e] || {}); const n = cuentaColumna(todos, e); const sobre = lim.max != null && n > lim.max, bajo = lim.min != null && n < lim.min; return `<h2 class="jr-col-h${sobre ? ' jr-wip-max' : bajo ? ' jr-wip-min' : ''}" title="${sobre ? 'Maximum exceeded' : bajo ? 'Minimum not met' : ''}">${e.toUpperCase()} <span>${n}</span>${lim.min != null ? `<em>Min ${lim.min}</em>` : ''}${lim.max != null ? `<em>Max ${lim.max}</em>` : ''}</h2>`; };
    const tarjeta = (x, e) => `<article class="jr-tarjeta${x.flag ? ' jr-flagged' : ''}" draggable="true" data-n="${x.n}"><div class="jr-t-top"><a href="#" data-issue="${x.n}" class="jr-t-tit">${esc(x.titulo)}</a><button class="jr-t-mas" data-menu="${x.n}" aria-label="More actions for ${clave(x)}" title="More actions">•••</button></div>${x.padre && issue(x.padre) ? `<span class="jr-dim jr-t-padre">${clave(issue(x.padre))}</span>` : ''}${x.epic && x.tipo !== 'Subtask' ? `<span class="jr-epic-tag">${esc((issue(x.epic) || {}).titulo || '')}</span>` : ''}<div class="jr-t-pie">${icTipo(x.tipo)}<span class="jr-key${e === 'Done' ? ' jr-hecho' : ''}">${clave(x)}</span>${x.flag ? icFlag : ''}${x.links.length ? `<span class="jr-dim" title="${x.links.length} linked work items">🔗${x.links.length}</span>` : ''}${x.due ? `<span class="jr-due${x.due < ahora().slice(0, 10) && x.estado !== 'Done' ? ' jr-vencida' : ''}" title="Due date">${fechaCorta(x.due + 'T12:00')}</span>` : ''}<span class="jr-sp"></span>${x.pts != null ? `<span class="jr-pts">${x.pts}</span>` : ''}${icPrior(x.prior)}${avatar(x.asig, 22)}</div><label class="jr-sr" for="jrE${x.n}">Status</label><select class="jr-t-sel" id="jrE${x.n}" data-estado="${x.n}">${ESTADOS.map((y) => `<option ${y === e ? 'selected' : ''}>${y}</option>`).join('')}</select></article>`;
    const fila = (cs) => ESTADOS.map((e) => { const c = cs.filter((x) => x.estado === e); return `<section class="jr-col" data-col="${e}" aria-label="${e}"><div class="jr-col-b">${c.map((x) => tarjeta(x, e)).join('')}</div></section>`; }).join('');
    const cuerpo = `<div class="jr-barra"><h1 class="jr-h1">${esc(sp.nombre)}</h1><span class="jr-dim">${dias} days remaining</span><span class="jr-sp"></span>${btn('Complete sprint', `data-completar="${sp.id}"`)}<a class="jr-btn" href="${hp('board-settings')}" title="Configure board">⚙ Configure board</a></div>${sp.meta ? `<p class="jr-dim">Sprint goal: <b>${esc(sp.meta)}</b></p>` : ''}
      <div class="jr-filtros"><label class="jr-buscar jr-buscar-sm"><span aria-hidden="true">⌕</span><input id="jrTF" placeholder="Search board" aria-label="Search board"></label>${Object.keys(GENTE).map((u) => { const p = new URLSearchParams(query); if (quien === u) p.delete('asig'); else p.set('asig', u); const t = p.toString(); return `<a class="jr-filtro-av${quien === u ? ' on' : ''}" href="${hp('board')}${t ? '?' + t : ''}" title="${esc(persona(u))}">${avatar(u, 30)}</a>`; }).join('')}
        <span class="jr-qf" role="group" aria-label="Quick filters">${B.qf.map((q) => `<a class="jr-qf-b${qfOn.includes(q.id) ? ' on' : ''}" href="${linkQf(q.id)}" title="${esc(q.jql)}" aria-pressed="${qfOn.includes(q.id)}">${esc(q.nombre)}</a>`).join('')}</span>
        <label class="jr-group">Group by <select id="jrGB" aria-label="Group by">${[['ninguno', 'None'], ['asignados', 'Assignee'], ['epicas', 'Epic'], ['historias', 'Subtask (stories)'], ['consultas', 'Queries']].map(([v, t]) => `<option value="${v}" ${swim === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <div class="jr-board-w"><div class="jr-board jr-board-h">${ESTADOS.map((e) => `<div class="jr-col jr-col-cab">${cabeza(e)}</div>`).join('')}</div>
      ${carriles.map((c) => `${c.titulo ? `<div class="jr-carril-h">${c.titulo} <span class="jr-dim">${c.xs.length} issues</span></div>` : ''}<div class="jr-board${carriles.length === 1 && !c.titulo ? ' jr-board-uno' : ''}">${fila(c.xs)}</div>`).join('')}</div>
      ${qfOn.length || quien ? `<p class="jr-dim">Los límites de las columnas cuentan todas las issues del sprint, también las que ocultan los filtros.</p>` : ''}`;
    main.innerHTML = marco('board', cuerpo, ['Board']); montar();
    const cambiar = (n, e) => { const x = issue(n); if (!x || x.estado === e) return; cambiarCampo(x, 'status', e); revisarTicket(x, e); guardar(); evento('board-mover'); if (e === 'Done') evento('board-done'); const lim = (B.wip[e] || {}); tablero(); aviso(`${clave(x)} → <b>${e}</b>${B.restr !== 'ninguna' && lim.max != null && cuentaColumna(st().issues.filter((y) => y.sprint === sp.id), e) > lim.max ? ' · la columna superó su máximo' : ''}`); };
    main.querySelectorAll('[data-estado]').forEach((sel) => { sel.onchange = () => cambiar(sel.dataset.estado, sel.value); });
    main.querySelectorAll('.jr-tarjeta').forEach((t) => { t.ondragstart = (e) => { e.dataTransfer.setData('text/plain', t.dataset.n); t.classList.add('arrastrando'); }; t.ondragend = () => t.classList.remove('arrastrando'); });
    main.querySelectorAll('.jr-col[data-col]').forEach((c) => { c.ondragover = (e) => { e.preventDefault(); c.classList.add('sobre'); }; c.ondragleave = () => c.classList.remove('sobre'); c.ondrop = (e) => { e.preventDefault(); cambiar(e.dataTransfer.getData('text/plain'), c.dataset.col); }; });
    main.querySelector('[data-completar]').onclick = () => completarSprint(sp.id);
    main.querySelector('#jrGB').onchange = (e) => { location.hash = linkG(e.target.value); evento('swimlanes'); };
    main.querySelectorAll('[data-menu]').forEach((b) => { b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); menuTarjeta(Number(b.dataset.menu), b); }; });
    if (qfOn.length) evento('quickfilter');
    const tf = main.querySelector('#jrTF'); tf.oninput = () => main.querySelectorAll('.jr-tarjeta').forEach((t) => { t.hidden = !t.textContent.toLowerCase().includes(tf.value.toLowerCase()); });
  }
  function carrilesDe(swim, xs) {
    const s = st();
    if (swim === 'asignados') { const us = [...new Set(xs.map((x) => x.asig).filter(Boolean))]; const c = us.map((u) => ({ titulo: `${avatar(u, 20)} ${esc(persona(u) || u)}`, xs: xs.filter((x) => x.asig === u) })); const sin = xs.filter((x) => !x.asig); if (sin.length) c.push({ titulo: 'Unassigned', xs: sin }); return c.length ? c : [{ titulo: '', xs }]; }
    if (swim === 'epicas') { const eps = [...new Set(xs.map((x) => x.epic).filter(Boolean))]; const c = eps.map((n) => ({ titulo: `${icTipo('Epic', 14)} ${esc((issue(n) || {}).titulo || clave({ n }))}`, xs: xs.filter((x) => x.epic === n) })); const sin = xs.filter((x) => !x.epic); if (sin.length) c.push({ titulo: 'Issues without epic', xs: sin }); return c.length ? c : [{ titulo: '', xs }]; }
    if (swim === 'historias') { const padres = xs.filter((x) => xs.some((y) => y.padre === x.n)); const c = padres.map((p) => ({ titulo: `${icTipo(p.tipo, 14)} <a href="#" data-issue="${p.n}">${clave(p)}</a> ${esc(p.titulo)} ${lozenge(p.estado)}`, xs: xs.filter((y) => y.padre === p.n) })); const resto = xs.filter((x) => !padres.includes(x) && !padres.some((p) => p.n === x.padre)); c.push({ titulo: 'Other issues', xs: resto }); return c; }
    if (swim === 'consultas') {
      const usados = new Set(), c = [];
      for (const q of s.board.swimQ) { const r = jql(q.jql); const ids = r.ok ? new Set(r.xs.map((x) => x.n)) : new Set(); const mios = xs.filter((x) => ids.has(x.n) && !usados.has(x.n)); mios.forEach((x) => usados.add(x.n)); c.push({ titulo: `${esc(q.nombre)} <code>${esc(q.jql)}</code>`, xs: mios }); }
      c.push({ titulo: 'Everything Else', xs: xs.filter((x) => !usados.has(x.n)) }); return c;
    }
    return [{ titulo: '', xs }];
  }
  function menuTarjeta(n, ancla) {
    const x = issue(n); if (!x) return;
    document.querySelectorAll('.jr-menu').forEach((m) => m.remove());
    const m = document.createElement('div'); m.className = 'jr-menu'; m.setAttribute('role', 'menu');
    m.innerHTML = `<button role="menuitem" data-a="flag">${x.flag ? 'Remove flag' : 'Add flag'}</button><button role="menuitem" data-a="link">Link work item</button><button role="menuitem" data-a="open">Open issue</button>`;
    ancla.closest('.jr-tarjeta').append(m);
    const cerrar = () => { m.remove(); document.removeEventListener('click', fuera, true); };
    const fuera = (e) => { if (!m.contains(e.target)) cerrar(); };
    setTimeout(() => document.addEventListener('click', fuera, true), 0);
    m.querySelector('[data-a=flag]').onclick = () => { cerrar(); alternarFlag(x, () => tablero()); };
    m.querySelector('[data-a=link]').onclick = () => { cerrar(); dialogoVinculo(x, () => tablero()); };
    m.querySelector('[data-a=open]').onclick = () => { cerrar(); verIssue(x.n); };
    m.querySelector('button').focus();
  }
  function alternarFlag(x, despues) {
    const poner = !x.flag;
    modal(`<h2>${poner ? 'Add flag' : 'Remove flag'}</h2><p class="jr-dim">${poner ? 'Una issue con flag queda en amarillo en el tablero y el backlog: avisa a todo el equipo que está trabada (un impedimento).' : 'Quita la marca de impedimento.'}</p><label class="jr-lbl" for="jrFC">Comment (optional)</label><textarea class="jr-in jr-ta" id="jrFC" rows="3" placeholder="${poner ? 'Por qué está trabada y qué hace falta para destrabarla' : 'Qué se resolvió'}"></textarea><div class="jr-modal-b">${btn('Cancel', 'data-cerrar', 'sutil')}${btn(poner ? 'Add flag' : 'Remove flag', 'id="jrFOk"', 'primario')}</div>`, (m, cerrar) => {
      m.querySelector('#jrFOk').onclick = () => { x.flag = poner; registrar(x, poner ? 'added a flag (Impediment)' : 'removed the flag'); const c = m.querySelector('#jrFC').value.trim(); if (c) x.com.push({ u: 'alumno', t: `${poner ? '⚑ Flag added: ' : '⚑ Flag removed: '}${c}`, f: ahora() }); guardar(); evento('flag'); cerrar(); if (despues) despues(); aviso(`${clave(x)} ${poner ? 'flagged' : 'unflagged'}`); };
    }, 480);
  }
  function dialogoVinculo(x, despues) {
    const s = st();
    modal(`<h2>Link work item</h2><p class="jr-dim">${clave(x)} ${esc(x.titulo)}</p><label class="jr-lbl" for="jrLT">This work item</label><select class="jr-in" id="jrLT">${VINCULOS.flatMap(([a, b]) => (a === b ? [a] : [a, b])).map((t) => `<option>${t}</option>`).join('')}</select>
      <label class="jr-lbl" for="jrLK">Work item</label><select class="jr-in" id="jrLK">${s.issues.filter((y) => y.n !== x.n).map((y) => `<option value="${y.n}">${clave(y)} ${esc(y.titulo)}</option>`).join('')}</select>
      <div class="jr-modal-b">${btn('Cancel', 'data-cerrar', 'sutil')}${btn('Link', 'id="jrLOk"', 'primario')}</div>`, (m, cerrar) => {
      m.querySelector('#jrLOk').onclick = () => { const t = m.querySelector('#jrLT').value, b = Number(m.querySelector('#jrLK').value); if (vincular(s, x.n, t, b)) { registrar(x, `linked ${t} ${clave(issue(b))}`); tocar(issue(b)); guardar(); evento('link'); } cerrar(); if (despues) despues(); };
    }, 560);
  }

  // ------------------------------------------------------------------ configuración del tablero
  function ajustesTablero() {
    const s = st(), B = s.board, tab = query.get('tab') || 'columns';
    const tabs = [['columns', 'Columns'], ['quickfilters', 'Quick Filters'], ['swimlanes', 'Swimlanes']];
    let cuerpo = `<h1 class="jr-h1">Board settings</h1><div class="jr-tabs">${tabs.map(([t, n]) => `<a class="${tab === t ? 'on' : ''}" href="${hp('board-settings')}?tab=${t}">${n}</a>`).join('')}</div>`;
    if (tab === 'columns') {
      cuerpo += `<div class="jr-card"><h2>Column constraints</h2><p class="jr-dim">Un límite de trabajo en curso (WIP) evita empezar más de lo que el equipo puede terminar. La columna se pone <b class="jr-txt-rojo">roja</b> si se pasa del máximo y <b class="jr-txt-amar">amarilla</b> si no llega al mínimo. Para Scrum se recomienda no contar las subtareas.</p>
        <label class="jr-lbl" for="jrRS">Constraint</label><select class="jr-in" id="jrRS" style="max-width:360px"><option value="ninguna" ${B.restr === 'ninguna' ? 'selected' : ''}>None</option><option value="todas" ${B.restr === 'todas' ? 'selected' : ''}>Work item count</option><option value="sin-subtareas" ${B.restr === 'sin-subtareas' ? 'selected' : ''}>Work item count, excluding subtasks</option></select>
        <div class="jr-cols-cfg">${ESTADOS.map((e, i) => `<div class="jr-col-cfg"><div class="jr-col-bar" style="background:${i === 0 ? '#8590a2' : i === ESTADOS.length - 1 ? '#22a06b' : '#1d7afc'}"></div><b>${e}</b><span class="jr-dim">Status: ${e}</span><label>Min <input class="jr-in" type="number" min="0" data-min="${e}" value="${(B.wip[e] || {}).min ?? ''}" aria-label="Minimum for ${e}"></label><label>Max <input class="jr-in" type="number" min="0" data-max="${e}" value="${(B.wip[e] || {}).max ?? ''}" aria-label="Maximum for ${e}"></label></div>`).join('')}</div>
        ${btn('Save', 'id="jrWG"', 'primario')}</div><p class="jr-dim">En el Jira real, solo quien administra el tablero o el proyecto puede cambiar esto (Board settings → Columns). Las columnas grises son "por hacer", las azules "en curso" y la verde "terminado": solo lo que está en la última columna cuenta como completo.</p>`;
    } else if (tab === 'quickfilters') {
      cuerpo += `<div class="jr-card"><h2>Quick Filters</h2><p class="jr-dim">Botones arriba del tablero que filtran las tarjetas con una consulta JQL. Si activas varios, se combinan con AND.</p>
        <div class="jr-tabla-w"><table class="jr-tabla"><thead><tr><th>Name</th><th>JQL</th><th>Description</th><th></th></tr></thead><tbody>${B.qf.map((q) => `<tr><td>${esc(q.nombre)}</td><td><code>${esc(q.jql)}</code></td><td>${esc(q.desc || '')}</td><td>${btn('Delete', `data-borrar-qf="${q.id}"`, 'sutil')}</td></tr>`).join('')}</tbody></table></div>
        <h3>Add a Quick Filter</h3><div class="jr-2col"><div><label class="jr-lbl" for="jrQN">Name</label><input class="jr-in" id="jrQN" placeholder="Bugs urgentes"></div><div><label class="jr-lbl" for="jrQJ">JQL</label><input class="jr-in" id="jrQJ" placeholder="type = Bug AND priority in (Highest, High)"></div></div><label class="jr-lbl" for="jrQD">Description</label><input class="jr-in" id="jrQD"><div id="jrQE"></div><p>${btn('Add', 'id="jrQA"', 'primario')}</p></div>`;
    } else {
      cuerpo += `<div class="jr-card"><h2>Swimlanes</h2><p class="jr-dim">Filas horizontales del tablero. Base swimlanes on:</p>
        ${[['ninguno', 'No Swimlanes'], ['historias', 'Stories', 'una fila por historia con sus subtareas'], ['asignados', 'Assignees', 'una fila por persona'], ['epicas', 'Epics', 'una fila por épica'], ['consultas', 'Queries', 'una fila por consulta JQL; lo que no coincide va a "Everything Else"']].map(([v, t, d]) => `<label class="jr-radio"><input type="radio" name="jrSW" value="${v}" ${B.swim === v ? 'checked' : ''}> <b>${t}</b>${d ? ` <span class="jr-dim">— ${d}</span>` : ''}</label>`).join('')}
        <h3>Query swimlanes</h3><div class="jr-tabla-w"><table class="jr-tabla"><thead><tr><th>Name</th><th>JQL</th><th></th></tr></thead><tbody>${B.swimQ.map((q, i) => `<tr><td>${esc(q.nombre)}</td><td><code>${esc(q.jql)}</code></td><td>${btn('Delete', `data-borrar-sq="${i}"`, 'sutil')}</td></tr>`).join('')}<tr><td>Everything Else</td><td class="jr-dim">Todo lo que no coincide (no se puede borrar)</td><td></td></tr></tbody></table></div>
        <div class="jr-2col"><div><label class="jr-lbl" for="jrSQN">Name</label><input class="jr-in" id="jrSQN" placeholder="Trabadas"></div><div><label class="jr-lbl" for="jrSQJ">JQL</label><input class="jr-in" id="jrSQJ" placeholder="Flagged = Impediment"></div></div><div id="jrSQE"></div><p>${btn('Add', 'id="jrSQA"')} ${btn('Save', 'id="jrSWG"', 'primario')}</p></div>`;
    }
    main.innerHTML = marco('board-settings', cuerpo, ['Board settings']); montar();
    if (tab === 'columns') main.querySelector('#jrWG').onclick = () => {
      B.restr = main.querySelector('#jrRS').value;
      for (const e of ESTADOS) { const mn = main.querySelector(`[data-min="${e}"]`).value, mx = main.querySelector(`[data-max="${e}"]`).value; B.wip[e] = { min: mn === '' ? null : Number(mn), max: mx === '' ? null : Number(mx) }; if (B.wip[e].min != null && B.wip[e].max != null && B.wip[e].min > B.wip[e].max) { aviso(`En ${e}, el mínimo no puede ser mayor que el máximo`); return; } }
      guardar(); evento('wip'); aviso('Column constraints saved');
    };
    if (tab === 'quickfilters') {
      main.querySelector('#jrQA').onclick = () => { const nombre = main.querySelector('#jrQN').value.trim(), q = main.querySelector('#jrQJ').value.trim(); const r = jql(q); if (!nombre || !q) return aviso('Escribe un nombre y una consulta'); if (!r.ok) { main.querySelector('#jrQE').innerHTML = `<div class="jr-err">${esc(r.error)}</div>`; return; } B.qf.push({ id: B.sigQf++, nombre, jql: q, desc: main.querySelector('#jrQD').value.trim() }); guardar(); evento('quickfilter-crear'); ajustesTablero(); };
      main.querySelectorAll('[data-borrar-qf]').forEach((b) => { b.onclick = () => { B.qf = B.qf.filter((q) => q.id !== Number(b.dataset.borrarQf)); guardar(); ajustesTablero(); }; });
    }
    if (tab === 'swimlanes') {
      main.querySelector('#jrSQA').onclick = () => { const nombre = main.querySelector('#jrSQN').value.trim(), q = main.querySelector('#jrSQJ').value.trim(); const r = jql(q); if (!nombre || !q) return aviso('Escribe un nombre y una consulta'); if (!r.ok) { main.querySelector('#jrSQE').innerHTML = `<div class="jr-err">${esc(r.error)}</div>`; return; } B.swimQ.push({ nombre, jql: q }); guardar(); ajustesTablero(); };
      main.querySelectorAll('[data-borrar-sq]').forEach((b) => { b.onclick = () => { B.swimQ.splice(Number(b.dataset.borrarSq), 1); guardar(); ajustesTablero(); }; });
      main.querySelector('#jrSWG').onclick = () => { const v = main.querySelector('[name=jrSW]:checked'); if (v) B.swim = v.value; guardar(); evento('swimlanes'); aviso('Swimlanes saved'); };
    }
  }

  // ------------------------------------------------------------------ issue
  function verIssue(n, comoPagina) {
    const s = st(), x = issue(n); if (!x) return;
    { const r = raiz(), kk = clave(x); r.vistos = [kk, ...r.vistos.filter((k) => k !== kk)].slice(0, 60); } guardar();
    const hijos = s.issues.filter((y) => y.padre === x.n), padre = x.padre && issue(x.padre), epicas = s.issues.filter((y) => y.tipo === 'Epic');
    const pestana = 'all';
    const actividad = (tab) => {
      const items = tab === 'comments' ? x.com.map((c) => ({ ...c, com: true })) : tab === 'history' ? x.hist.map((h) => ({ u: h.u, t: `changed the ${h.c === 'status' ? 'Status' : h.c === 'assignee' ? 'Assignee' : 'Priority'}: ${h.c === 'assignee' ? (persona(h.de) || 'Unassigned') : h.de} → ${h.c === 'assignee' ? (persona(h.a) || 'Unassigned') : h.a}`, f: h.f })) : tab === 'worklog' ? x.log.map((l) => ({ u: l.u, t: `logged ${fmtDuracion(l.seg)}${l.c ? ' — ' + l.c : ''}`, f: l.f })) : [...x.com.map((c) => ({ ...c, com: true })), ...x.act];
      return items.sort((a, b) => b.f.localeCompare(a.f)).map((a) => `<div class="jr-act">${avatar(a.u, 26)}<div><b>${esc(persona(a.u) || a.u)}</b> ${a.com ? '' : esc(a.t)} <span class="jr-dim">${fechaLarga(a.f)}</span>${a.com ? `<p>${esc(a.t)}</p>` : ''}</div></div>`).join('') || '<p class="jr-dim">No activity yet.</p>';
    };
    const logueado = x.log.reduce((a, l) => a + l.seg, 0);
    const vinc = VINCULOS.flatMap(([a, b]) => (a === b ? [a] : [a, b])).map((t) => [t, x.links.filter((l) => l.t === t)]).filter(([, ls]) => ls.length);
    const html = `<div class="jr-issue"><div class="jr-issue-h"><span class="jr-migas">${padre ? `<a href="#" data-issue="${padre.n}">${clave(padre)}</a> / ` : ''}${icTipo(x.tipo)} ${clave(x)}</span>${x.flag ? `<span class="jr-flag-tag">${icFlag} Flagged</span>` : ''}<span class="jr-sp"></span>${btn(x.flag ? 'Remove flag' : 'Add flag', 'data-flag', 'sutil')}${btn('🔗 Link', 'data-vincular', 'sutil')}${comoPagina ? '' : `<a class="jr-btn jr-btn-sutil" href="${href('browse', clave(x))}">Open in page</a>${btn('✕', 'data-cerrar aria-label="Close"', 'sutil')}`}</div>
      <div class="jr-issue-g"><section><input class="jr-tit" id="jrIT" value="${esc(x.titulo)}" aria-label="Summary">
        <h3>Description</h3><textarea class="jr-in jr-ta" id="jrID" rows="6" aria-label="Description" placeholder="Add a description…">${esc(x.desc)}</textarea>
        ${x.tipo !== 'Subtask' && x.tipo !== 'Epic' ? `<h3>Subtasks</h3><div class="jr-sub">${hijos.map((h) => filaIssue(h)).join('') || '<p class="jr-dim">No subtasks.</p>'}<button class="jr-crear-rapido" data-sub>+ Add subtask</button></div>` : ''}
        ${x.tipo === 'Epic' ? `<h3>Issues in this epic</h3><div class="jr-sub">${s.issues.filter((y) => y.epic === x.n).map(filaIssue).join('') || '<p class="jr-dim">No issues.</p>'}</div>` : ''}
        <h3>Linked work items</h3><div class="jr-sub">${vinc.map(([t, ls]) => `<div class="jr-vinc-t">${esc(t)}</div>${ls.map((l) => { const y = issue(l.n); return y ? `<div class="jr-fila"><span>${icTipo(y.tipo)}</span><a href="#" data-issue="${y.n}" class="jr-key">${clave(y)}</a><a href="#" data-issue="${y.n}" class="jr-fila-t">${esc(y.titulo)}</a>${lozenge(y.estado)}<button class="jr-link" data-desvincular="${esc(t)}|${y.n}" aria-label="Unlink ${clave(y)}">Unlink</button></div>` : ''; }).join('')}`).join('') || '<p class="jr-dim">No linked work items.</p>'}</div>
        <h3>Activity</h3><div class="jr-tabs jr-tabs-sm" role="tablist">${[['all', 'All'], ['comments', 'Comments'], ['history', 'History'], ['worklog', 'Work log']].map(([t, nn]) => `<a href="#" role="tab" data-tab="${t}" class="${t === pestana ? 'on' : ''}">${nn}</a>`).join('')}</div><div class="jr-acts" id="jrActs">${actividad(pestana)}</div>
        <textarea class="jr-in jr-ta" id="jrIC" rows="2" placeholder="Add a comment…" aria-label="Add a comment"></textarea>${btn('Save comment', 'data-comentar', 'primario')}</section>
      <aside><select class="jr-in jr-estado-sel" id="jrIE" aria-label="Status">${ESTADOS.map((e) => `<option ${e === x.estado ? 'selected' : ''}>${e}</option>`).join('')}</select>
        <div class="jr-det"><h3>Details</h3>
          <label>Assignee <select class="jr-in" id="jrIA"><option value="">Unassigned</option>${Object.entries(GENTE).map(([u, nn]) => `<option value="${u}" ${u === x.asig ? 'selected' : ''}>${esc(nn)}</option>`).join('')}</select></label>
          ${x.asig !== 'alumno' ? `<button class="jr-link" data-asignarme>Assign to me</button>` : ''}
          <label>Priority <select class="jr-in" id="jrIP">${Object.keys(PRIOR).map((p) => `<option ${p === x.prior ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
          ${x.tipo !== 'Epic' && x.tipo !== 'Subtask' ? `<label>Story point estimate <input class="jr-in" id="jrIS" type="number" min="0" value="${x.pts == null ? '' : x.pts}"></label><label>Parent (epic) <select class="jr-in" id="jrIEp"><option value="">None</option>${epicas.map((ep) => `<option value="${ep.n}" ${ep.n === x.epic ? 'selected' : ''}>${clave(ep)} ${esc(ep.titulo)}</option>`).join('')}</select></label>` : ''}
          <label>Due date <input class="jr-in" id="jrIDu" type="date" value="${x.due || ''}"></label>
          <label>Sprint <span class="jr-ro">${esc((s.sprints.find((sp) => sp.id === x.sprint) || { nombre: 'None' }).nombre)}</span></label>
          <label>Labels <input class="jr-in" id="jrIL" value="${esc(x.labels.join(' '))}" placeholder="datos silver"></label>
          <label>Reporter <select class="jr-in" id="jrIR">${[...Object.entries(GENTE), ...Object.entries(raiz().gente).map(([u, g2]) => [u, g2.nombre + (g2.rol ? ' · ' + g2.rol : '')])].map(([u, nn]) => `<option value="${u}" ${u === x.rep ? 'selected' : ''}>${esc(nn)}</option>`).join('')}</select></label>
          <label>Resolution <span class="jr-ro">${x.res ? esc(x.res) : 'Unresolved'}</span></label>
          <div class="jr-time"><b>Time tracking</b><div class="jr-time-bar"><i style="width:${logueado ? 100 : 0}%"></i></div><span class="jr-dim">${logueado ? fmtDuracion(logueado) + ' logged' : 'No time logged'}</span>
            <div class="jr-time-f"><label class="jr-sr" for="jrIW">Time spent</label><input class="jr-in" id="jrIW" placeholder="2h 30m"><button class="jr-btn" data-log>Log work</button></div></div>
          <div class="jr-dev"><b>Development</b>${x.dev.length ? x.dev.map((d) => `<div class="jr-dev-c"><code>${esc(d.h.slice(0, 7))}</code> <span class="jr-dim">${esc(d.repo)}</span><br>${esc(d.msg)}</div>`).join('') : `<p class="jr-dim">Escribe <code>${clave(x)}</code> en el mensaje de un commit y empújalo (<code>git commit -m "${clave(x)} #comment …"</code> y <code>git push</code>): el commit aparece acá. Mira <a href="${href('code')}">Code</a> para los smart commits.</p>`}</div>
          <p class="jr-dim jr-fechas">Created ${fechaLarga(x.creado)}<br>Updated ${fechaLarga(x.upd)}${x.resF ? `<br>Resolved ${fechaLarga(x.resF)}` : ''}</p></div>
        ${btn('Save', 'data-guardar', 'primario')}</aside></div></div>`;
    const montarIssue = (root, cerrar) => {
      const g = () => {
        const cambios = [];
        const t = root.querySelector('#jrIT').value.trim(); if (t && t !== x.titulo) { x.titulo = t; cambios.push('Summary'); }
        const e = root.querySelector('#jrIE').value; if (cambiarCampo(x, 'status', e)) { if (e === 'Done') evento('board-done'); setTimeout(() => revisarTicket(x, e), 0); }
        cambiarCampo(x, 'assignee', root.querySelector('#jrIA').value || null);
        cambiarCampo(x, 'priority', root.querySelector('#jrIP').value);
        const d = root.querySelector('#jrID').value; if (d !== x.desc) { x.desc = d; cambios.push('Description'); }
        const sp = root.querySelector('#jrIS'); if (sp) { const v = sp.value === '' ? null : Number(sp.value); if (v !== x.pts) { x.pts = v; cambios.push('Story point estimate'); if (v != null) evento('estimar'); } }
        const ep = root.querySelector('#jrIEp'); if (ep) x.epic = Number(ep.value) || null;
        const du = root.querySelector('#jrIDu').value || null; if (du !== x.due) { x.due = du; cambios.push('Due date'); if (du) evento('due'); }
        x.rep = root.querySelector('#jrIR').value;
        const ls = root.querySelector('#jrIL').value.split(/[\s,]+/).filter(Boolean); if (ls.join(' ') !== x.labels.join(' ')) { x.labels = ls; cambios.push('Labels'); }
        if (cambios.length) registrar(x, 'updated the ' + cambios.join(', '));
        guardar();
      };
      const reabrir = () => { if (cerrar) cerrar(); verIssue(x.n, comoPagina); };
      root.querySelector('[data-guardar]').onclick = () => { g(); evento('issue-editar'); if (cerrar) cerrar(); dibujar(); aviso(`${clave(x)} saved`); };
      root.querySelector('[data-comentar]').onclick = () => { const t = root.querySelector('#jrIC').value.trim(); if (!t) return; g(); x.com.push({ u: 'alumno', t, f: ahora() }); tocar(x); guardar(); evento('comentar'); reabrir(); responderTicket(x, t).then((ok) => { if (ok && /^#\/jira/.test(location.hash)) { const mm = main.querySelector('#jrModal'); if (mm) { mm.hidden = true; mm.innerHTML = ''; } dibujar(); if (!comoPagina) verIssue(x.n); } }); };
      root.querySelector('[data-log]').onclick = () => { const seg = parseDuracion(root.querySelector('#jrIW').value); if (!seg) { aviso('Usa el formato 1w 2d 4h 30m (1w = 5d, 1d = 8h)'); return; } g(); x.log.push({ seg, u: 'alumno', f: ahora(), c: '' }); registrar(x, `logged ${fmtDuracion(seg)}`); guardar(); evento('log-work'); reabrir(); };
      root.querySelector('[data-flag]').onclick = () => { g(); if (cerrar) cerrar(); alternarFlag(x, () => { dibujar(); verIssue(x.n, comoPagina); }); };
      root.querySelector('[data-vincular]').onclick = () => { g(); if (cerrar) cerrar(); dialogoVinculo(x, () => { dibujar(); verIssue(x.n, comoPagina); }); };
      root.querySelectorAll('[data-desvincular]').forEach((b) => { b.onclick = () => { const [t, y] = b.dataset.desvincular.split('|'); desvincular(x.n, t, Number(y)); registrar(x, `removed the link ${t} ${cur}-${y}`); guardar(); reabrir(); }; });
      root.querySelectorAll('[data-tab]').forEach((a) => { a.onclick = (ev) => { ev.preventDefault(); root.querySelectorAll('[data-tab]').forEach((z) => z.classList.toggle('on', z === a)); root.querySelector('#jrActs').innerHTML = actividad(a.dataset.tab); }; });
      const am = root.querySelector('[data-asignarme]'); if (am) am.onclick = () => { root.querySelector('#jrIA').value = 'alumno'; };
      const sb = root.querySelector('[data-sub]'); if (sb) sb.onclick = () => { g(); if (cerrar) cerrar(); crear('Subtask', x.n); };
      root.querySelectorAll('[data-issue]').forEach((aa) => { aa.onclick = (ev) => { ev.preventDefault(); g(); if (cerrar) cerrar(); verIssue(Number(aa.dataset.issue), comoPagina); }; });
    };
    if (comoPagina) { main.innerHTML = marco('issues', html, ['Issues', clave(x)]); montar(); montarIssue(main.querySelector('.jr-issue'), null); }
    else modal(html, (m, cerrar) => montarIssue(m, cerrar), 1000);
  }
  function crear(tipo = 'Story', padre = null) {
    const s = st();
    modal(`<h2>Create issue</h2><label class="jr-lbl" for="jrCP">Project</label><select class="jr-in" id="jrCP" disabled><option>${esc(nombreProyecto(cur))} (${esc(cur)})</option></select>
      <label class="jr-lbl" for="jrCT">Issue type</label><select class="jr-in" id="jrCT">${Object.keys(TIPOS).map((t) => `<option ${t === tipo ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label class="jr-lbl" for="jrCS">Summary <span class="jr-req">*</span></label><input class="jr-in" id="jrCS" placeholder="Como analista, quiero…">
      <label class="jr-lbl" for="jrCD">Description</label><textarea class="jr-in jr-ta" id="jrCD" rows="4"></textarea>
      <label class="jr-lbl" for="jrCA">Assignee</label><select class="jr-in" id="jrCA"><option value="">Unassigned</option>${Object.entries(GENTE).map(([u, n]) => `<option value="${u}">${esc(n)}</option>`).join('')}</select>
      <label class="jr-lbl" for="jrCPr">Priority</label><select class="jr-in" id="jrCPr">${Object.keys(PRIOR).map((p) => `<option ${p === 'Medium' ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <label class="jr-lbl" for="jrCPa">Parent</label><select class="jr-in" id="jrCPa"><option value="">None</option>${s.issues.filter((y) => y.tipo === 'Epic' || (y.tipo !== 'Subtask' && y.n === padre)).map((y) => `<option value="${y.n}" ${y.n === padre ? 'selected' : ''}>${clave(y)} ${esc(y.titulo)}</option>`).join('')}</select>
      <div class="jr-modal-b">${btn('Cancel', 'data-cerrar', 'sutil')}${btn('Create', 'id="jrCOk"', 'primario')}</div>`, (m, cerrar) => {
      setTimeout(() => m.querySelector('#jrCS').focus(), 30);
      m.querySelector('#jrCOk').onclick = () => {
        const t = m.querySelector('#jrCS').value.trim(); if (!t) { m.querySelector('#jrCS').focus(); return; }
        const tp = m.querySelector('#jrCT').value, pa = Number(m.querySelector('#jrCPa').value) || null, pIssue = pa && issue(pa);
        const x = { p: cur, n: s.sig++, tipo: tp, titulo: t, estado: 'To Do', asig: m.querySelector('#jrCA').value || null, rep: 'alumno', pts: null, sprint: tp === 'Subtask' && pIssue ? pIssue.sprint : null, epic: pIssue && pIssue.tipo === 'Epic' ? pa : (pIssue ? pIssue.epic : null), prior: m.querySelector('#jrCPr').value, desc: m.querySelector('#jrCD').value, padre: tp === 'Subtask' ? pa : null, labels: [], creado: ahora(), upd: ahora(), act: [{ u: 'alumno', t: 'created the issue', f: ahora() }], com: [], hist: [], links: [], log: [], dev: [], due: null, flag: false, res: null, resF: null };
        s.issues.push(x); guardar(); evento('crear'); cerrar(); dibujar(); aviso(`You've created issue <a href="#" data-issue="${x.n}">${clave(x)}</a>`);
        main.querySelectorAll('#jrToast [data-issue]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); verIssue(x.n); }; });
      };
    });
  }

  // ------------------------------------------------------------------ JQL
  // Gramática (referencia de JQL de Atlassian): consulta := o [ORDER BY campo [ASC|DESC], …]
  //   o := y (OR y)* · y := no (AND no)* · no := NOT no | ( o ) | cláusula   — AND tiene más precedencia que OR
  const err = (m) => { throw new Error(m); };
  const norm = (v) => String(v == null ? '' : v).toLowerCase();
  const vacio = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
  const usuario = (v) => { const t = norm(v); if (!t) return t; if (GENTE[t]) return t; const pg = Object.entries(raiz().gente).find(([, g]) => norm(g.nombre) === t); if (pg) return pg[0]; const e = Object.entries(GENTE).find(([u, n]) => norm(n) === t || `${u}@tiendaandina.dev` === t); return e ? e[0] : t; };
  const rangoPrior = (p) => { const ks = Object.keys(PRIOR); const i = ks.map(norm).indexOf(norm(p)); return i < 0 ? null : ks.length - i; };
  const textoDe = (x) => [x.titulo, x.desc, ...x.com.map((c) => c.t)].join(' ');
  const CAMPOS = {
    project: { tipo: 'proyecto', get: (x) => x.p || 'TA' },
    key: { tipo: 'clave', get: (x) => clave(x) },
    summary: { tipo: 'texto', get: (x) => x.titulo }, description: { tipo: 'texto', get: (x) => x.desc }, comment: { tipo: 'texto', get: (x) => x.com.map((c) => c.t).join(' ') },
    text: { tipo: 'texto', soloContiene: true, get: textoDe },
    status: { tipo: 'opcion', hist: 'status', get: (x) => x.estado },
    statuscategory: { tipo: 'opcion', get: (x) => CATEGORIA[x.estado], valor: (v) => ({ new: 'to do', indeterminate: 'in progress', complete: 'done' }[norm(v)] || norm(v)) },
    assignee: { tipo: 'usuario', hist: 'assignee', get: (x) => x.asig }, reporter: { tipo: 'usuario', get: (x) => x.rep },
    priority: { tipo: 'prioridad', hist: 'priority', get: (x) => x.prior },
    type: { tipo: 'opcion', get: (x) => x.tipo, valor: (v) => ({ 'sub-task': 'subtask' }[norm(v)] || norm(v)) },
    labels: { tipo: 'lista', get: (x) => x.labels },
    sprint: { tipo: 'sprint', get: (x) => (x.sprint ? `${x.p || 'TA'}:${x.sprint}` : null) },
    'story points': { tipo: 'num', get: (x) => x.pts },
    parent: { tipo: 'clave', get: (x) => (x.padre ? `${x.p || 'TA'}-${x.padre}` : x.epic ? `${x.p || 'TA'}-${x.epic}` : null) },
    epic: { tipo: 'clave', get: (x) => (x.epic ? `${x.p || 'TA'}-${x.epic}` : null) },
    created: { tipo: 'fecha', get: (x) => x.creado }, updated: { tipo: 'fecha', get: (x) => x.upd }, resolved: { tipo: 'fecha', get: (x) => x.resF }, due: { tipo: 'fecha', soloDia: true, get: (x) => x.due },
    resolution: { tipo: 'opcion', get: (x) => x.res, valor: (v) => (norm(v) === 'unresolved' ? '' : norm(v)) },
    flagged: { tipo: 'opcion', get: (x) => (x.flag ? 'Impediment' : null) },
    issuelinktype: { tipo: 'lista', vinculo: true, get: (x) => [...new Set(x.links.map((l) => l.t))] },
  };
  const ALIAS = { issuekey: 'key', issue: 'key', id: 'key', issuetype: 'type', 'story point estimate': 'story points', storypoints: 'story points', createddate: 'created', updateddate: 'updated', resolutiondate: 'resolved', duedate: 'due', 'epic link': 'epic' };
  const campoDe = (nombre) => { const k = norm(nombre); const c = CAMPOS[ALIAS[k] || k]; return c ? { ...c, nombre: ALIAS[k] || k } : null; };
  // fechas: "2026-11-20", "2026/11/20 14:00", relativas "-7d", "-4w 2d", "-24h", "1d", y funciones
  function fecha(v, base = Date.now()) {
    if (v && v.ms != null) return v.ms;
    const t = String(v).trim();
    let m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)).getTime();
    m = t.match(/^([+-]?)((?:\s*\d+\s*[wdhm])+)$/i);
    if (m) { let ms = 0; for (const p of m[2].matchAll(/(\d+)\s*([wdhm])/gi)) ms += Number(p[1]) * { w: 7 * DIA, d: DIA, h: 36e5, m: 6e4 }[p[2].toLowerCase()]; return base + (m[1] === '-' ? -ms : ms); }
    err(`Date value '${t}' for field is invalid. Valid formats include: 'yyyy/MM/dd HH:mm', 'yyyy-MM-dd HH:mm', 'yyyy/MM/dd', 'yyyy-MM-dd', or a period format e.g. '-5d', '4w 2d'.`);
  }
  function funcionFecha(nombre, arg) {
    const d = new Date(); const fn = nombre.toLowerCase();
    if (fn === 'now') return d.getTime();
    const m = String(arg || '').trim().match(/^([+-]?)(\d+)([yMwdhm]?)$/);
    const nat = { day: 'd', week: 'w', month: 'M', year: 'y' }[fn.replace(/^(startof|endof)/, '')];
    if (arg && !m) err(`Unable to parse the increment '${arg}' for function '${nombre}()'. Use (+/-)nn(y|M|w|d|h|m).`);
    const aplicar = (fecha2, signo, n, u) => { const k = signo === '-' ? -n : n; if (u === 'y') fecha2.setFullYear(fecha2.getFullYear() + k); else if (u === 'M') fecha2.setMonth(fecha2.getMonth() + k); else if (u === 'w') fecha2.setDate(fecha2.getDate() + 7 * k); else if (u === 'd') fecha2.setDate(fecha2.getDate() + k); else if (u === 'h') fecha2.setHours(fecha2.getHours() + k); else fecha2.setMinutes(fecha2.getMinutes() + k); };
    if (m) aplicar(d, m[1], Number(m[2]), m[3] || nat);
    const ini = fn.startsWith('start');
    if (nat === 'd') d.setHours(ini ? 0 : 23, ini ? 0 : 59, ini ? 0 : 59, ini ? 0 : 999);
    if (nat === 'w') { const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow + (ini ? 0 : 6)); d.setHours(ini ? 0 : 23, ini ? 0 : 59, ini ? 0 : 59, ini ? 0 : 999); }
    if (nat === 'M') { if (ini) d.setDate(1); else d.setMonth(d.getMonth() + 1, 0); d.setHours(ini ? 0 : 23, ini ? 0 : 59, ini ? 0 : 59, ini ? 0 : 999); }
    if (nat === 'y') { if (ini) d.setMonth(0, 1); else d.setMonth(11, 31); d.setHours(ini ? 0 : 23, ini ? 0 : 59, ini ? 0 : 59, ini ? 0 : 999); }
    return d.getTime();
  }
  // valores con historial: [{v, desde, hasta, u}] (el primero, desde la creación)
  function linea(x, campo) {
    const hs = x.hist.filter((h) => h.c === campo).sort((a, b) => a.f.localeCompare(b.f));
    const get = CAMPOS[campo].get;
    const out = []; let desde = new Date(x.creado).getTime(), v = hs.length ? hs[0].de : get(x), u = x.rep;
    for (const h of hs) { const t = new Date(h.f).getTime(); out.push({ v, desde, hasta: t, u }); v = h.a; desde = t; u = h.u; }
    out.push({ v, desde, hasta: Infinity, u });
    return out;
  }
  function jql(texto) {
    const t = String(texto || '').trim(); if (!t) return { ok: true, xs: st().issues.slice() };
    const tokens = t.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\(|\)|!=|>=|<=|!~|[=~<>]|,|[^\s(),=!~<>"']+/g) || [];
    let i = 0; const ver = (k = 0) => tokens[i + k], sig = () => tokens[i++];
    const es = (tok, w) => tok != null && tok.toLowerCase() === w;
    const quitar = (v) => (/^(["']).*\1$/.test(v) ? v.slice(1, -1).replace(/\\(.)/g, '$1') : v);
    const usoHist = { v: false }, usoFecha = { v: false };
    // un valor: texto, número, EMPTY/NULL o una llamada a función
    const valor = () => {
      const v = sig(); if (v == null) err('Error in the JQL Query: Expecting a value but got the end of the query.');
      if (v === '(' || v === ')' || v === ',') err(`Error in the JQL Query: Expecting a value but got '${v}'.`);
      if (/^["']/.test(v)) return quitar(v);
      if (ver() === '(' && /^[a-z]\w*$/i.test(v)) {   // función
        sig(); const args = []; while (ver() !== ')') { if (ver() == null) err(`Error in the JQL Query: Expecting ')' but got the end of the query.`); if (ver() === ',') { sig(); continue; } args.push(quitar(sig())); } sig();
        return llamar(v, args);
      }
      if (/^(empty|null)$/i.test(v)) return { vacio: true };
      return v;
    };
    const lista = () => { if (sig() !== '(') err("Error in the JQL Query: Expecting '(' but got something else."); const vs = []; while (ver() !== ')') { if (ver() == null) err("Error in the JQL Query: Expecting ')' but got the end of the query."); if (ver() === ',') { sig(); continue; } vs.push(valor()); } sig(); return vs; };
    function llamar(nombre, args) {
      const fn = nombre.toLowerCase(), s = st();
      if (fn === 'currentuser') return 'alumno';
      if (fn === 'membersof') { const g = GRUPOS[norm(args[0])]; if (!g) err(`The group '${args[0]}' does not exist (grupos de práctica: ${Object.keys(GRUPOS).join(', ')}).`); return { lista: g }; }
      if (fn === 'opensprints') return { lista: todosSprints().filter((x) => x.estado === 'active').map((x) => `${x.p}:${x.id}`) };
      if (fn === 'closedsprints') return { lista: todosSprints().filter((x) => x.estado === 'closed').map((x) => `${x.p}:${x.id}`) };
      if (fn === 'futuresprints') return { lista: todosSprints().filter((x) => x.estado === 'future').map((x) => `${x.p}:${x.id}`) };
      if (/^(now|startofday|endofday|startofweek|endofweek|startofmonth|endofmonth|startofyear|endofyear)$/.test(fn)) { usoFecha.v = true; return { ms: funcionFecha(fn, args[0]) }; }
      if (fn === 'issuehistory') return { lista: raiz().vistos.slice() };
      if (fn === 'linkedissues') { const x = porClave(args[0]); if (!x) err(`Issue '${args[0]}' does not exist or you do not have permission to view it.`); return { lista: x.links.filter((l) => !args[1] || l.t === args[1]).map((l) => `${x.p || 'TA'}-${l.n}`) }; }
      if (fn === 'updatedby') { const u = usuario(args[0]); const desde = args[1] ? fecha(args[1]) : -Infinity, hasta = args[2] ? fecha(args[2]) : Infinity; return { lista: todas().filter((x) => [...x.act, ...x.hist, ...x.com].some((a) => a.u === u && new Date(a.f).getTime() >= desde && new Date(a.f).getTime() <= hasta)).map(clave) }; }
      if (fn === 'standardissuetypes') return { lista: ['Epic', 'Story', 'Task', 'Bug'] };
      if (fn === 'subtaskissuetypes') return { lista: ['Subtask'] };
      return err(`Unable to find JQL function '${nombre}(${args.join(', ')})'.`);
    }
    // compara un valor guardado con uno de la consulta según el tipo de campo
    const igual = (C, val, q) => {
      if (q && q.vacio) return vacio(val);
      if (q && q.lista) return q.lista.some((e) => igual(C, val, e));
      if (Array.isArray(val)) return val.some((e) => igual(C, e, q));
      if (C.tipo === 'usuario') return val != null && usuario(q) === val;
      if (C.tipo === 'sprint') { if (val == null) return false; const [pp, id] = String(val).split(':'); const S = estadoDe(pp); const sp = S && S.sprints.find((s) => String(s.id) === id); return String(val) === String(q) || id === String(q) || !!(sp && norm(sp.nombre) === norm(q)); }
      if (C.tipo === 'proyecto') return norm(val) === norm(q) || norm(nombreProyecto(val)) === norm(q);
      if (C.tipo === 'num') return val != null && Number(val) === Number(q);
      if (C.tipo === 'fecha') { if (val == null) return false; const a = new Date(C.soloDia ? val + 'T00:00' : val).getTime(); const b = fecha(q); return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(String(q)) || C.soloDia ? new Date(a).toDateString() === new Date(b).toDateString() : a === b; }
      if (C.tipo === 'opcion' && C.alias && C.alias.map(norm).includes(norm(q))) return true;
      const qv = C.valor ? C.valor(q) : norm(q);
      if (qv === '') return vacio(val);
      return norm(val) === qv;
    };
    const comparar = (C, val, op, q) => {
      if (val == null) return false;
      let a, b;
      if (C.tipo === 'fecha') { a = new Date(C.soloDia ? val + 'T00:00' : val).getTime(); b = fecha(q); usoFecha.v = true; }
      else if (C.tipo === 'prioridad') { a = rangoPrior(val); b = rangoPrior(q); if (b == null) err(`The value '${q}' does not exist for the field 'priority'.`); }
      else if (C.tipo === 'num') { a = Number(val); b = Number(q); }
      else if (C.tipo === 'clave') { a = Number(String(val).split('-')[1]); b = Number(String(q).split('-')[1]); }
      else err(`The operator '${op}' is not supported by the '${C.nombre}' field.`);
      return op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b;
    };
    const contiene = (texto2, q) => {
      const t2 = norm(texto2), frase = String(q).match(/^"(.*)"$/);
      if (frase) return t2.includes(norm(frase[1]));
      const palabras = t2.split(/[^\p{L}\p{N}_-]+/u).filter(Boolean);
      return norm(q).split(/\s+/).filter(Boolean).every((term) => { const pref = term.endsWith('*'), base = term.replace(/\*+$/, ''); return palabras.some((w) => (pref ? w.startsWith(base) : w === base || w.startsWith(base))); });
    };
    // predicados de historial: FROM, TO, BY, AFTER, BEFORE, ON, DURING
    const predicados = () => {
      const p = {};
      for (;;) {
        const k = norm(ver());
        if (k === 'from' || k === 'to') { sig(); p[k] = valor(); }
        else if (k === 'by') { sig(); p.by = valor(); }
        else if (k === 'after' || k === 'before' || k === 'on') { sig(); p[k] = fecha(valor()); }
        else if (k === 'during') { sig(); const vs = lista(); if (vs.length !== 2) err("Error in the JQL Query: DURING expects two dates: DURING (\"date1\", \"date2\")."); p.during = vs.map((v) => fecha(v)); }
        else break;
      }
      return p;
    };
    const ventana = (p) => { let a = -Infinity, b = Infinity; if (p.after != null) a = Math.max(a, p.after); if (p.before != null) b = Math.min(b, p.before); if (p.on != null) { const d = new Date(p.on); d.setHours(0, 0, 0, 0); a = Math.max(a, d.getTime()); b = Math.min(b, d.getTime() + DIA); } if (p.during) { a = Math.max(a, p.during[0]); b = Math.min(b, p.during[1] + DIA - 1); } return [a, b]; };
    const clausula = () => {
      let nombre = sig(); if (nombre == null) err('Error in the JQL Query: Expecting a field name but got the end of the query.');
      nombre = quitar(nombre);
      if (/^(story|epic)$/i.test(nombre) && /^(points|link)$/i.test(ver() || '')) nombre += ' ' + sig();
      if (/^story$/i.test(nombre.split(' ')[0]) && /^point$/i.test(ver() || '')) { sig(); if (/^estimate$/i.test(ver() || '')) sig(); nombre = 'story points'; }
      const C = campoDe(nombre); if (!C) err(`Field '${nombre}' does not exist or you do not have permission to view it.`);
      let op = sig(); if (op == null) err(`Error in the JQL Query: Expecting operator but got the end of the query.`);
      op = op.toLowerCase();
      if (op === 'not' && es(ver(), 'in')) { sig(); op = 'not in'; }
      else if (op === 'is' && es(ver(), 'not')) { sig(); op = 'is not'; }
      else if (op === 'was') { if (es(ver(), 'not') && es(ver(1), 'in')) { i += 2; op = 'was not in'; } else if (es(ver(), 'not')) { sig(); op = 'was not'; } else if (es(ver(), 'in')) { sig(); op = 'was in'; } }
      const get = (x) => C.get(x);
      if (['was', 'was in', 'was not', 'was not in', 'changed'].includes(op)) {
        if (!C.hist) err(`History searches are not supported for the '${C.nombre}' field. Usa WAS o CHANGED con status, assignee o priority.`);
        usoHist.v = true;
        const vs = op === 'changed' ? [] : op.endsWith('in') ? lista() : [valor()];
        const p = predicados(); const [a, b] = ventana(p);
        if (op === 'changed') return (x) => x.hist.some((h) => { const t = new Date(h.f).getTime(); return h.c === C.hist && t >= a && t <= b && (p.from == null || igual(C, h.de, p.from)) && (p.to == null || igual(C, h.a, p.to)) && (p.by == null || h.u === usuario(p.by)); });
        const tuvo = (x, q) => linea(x, C.hist).some((s) => s.desde <= b && s.hasta >= a && igual(C, s.v, q) && (p.by == null || s.u === usuario(p.by)));
        if (op === 'was' || op === 'was in') return (x) => vs.some((q) => tuvo(x, q));
        return (x) => !vs.some((q) => tuvo(x, q));
      }
      if (op === 'is' || op === 'is not') { const v = sig(); if (!/^(empty|null)$/i.test(v || '')) err(`Error in the JQL Query: Expecting 'EMPTY' or 'NULL' after '${op.toUpperCase()}' but got '${v || 'the end of the query'}'.`); return (x) => (op === 'is' ? vacio(get(x)) : !vacio(get(x))); }
      if (op === 'in' || op === 'not in') {
        const vs = ver() === '(' ? lista() : [valor()];
        if (C.tipo === 'texto') err(`The operator '${op.toUpperCase()}' is not supported by the '${C.nombre}' field.`);
        // NOT IN tampoco devuelve las issues con el campo vacío (como !=)
        return (x) => { const val = get(x); const ok = vs.some((q) => igual(C, val, q)); return op === 'in' ? ok : !ok && !vacio(val); };
      }
      if (op === '~' || op === '!~') {
        if (C.tipo !== 'texto') err(`The operator '${op}' is not supported by the '${C.nombre}' field.`);
        const q = valor();
        return (x) => (op === '~' ? contiene(get(x), q) : !contiene(get(x), q));
      }
      if (C.soloContiene) err(`The operator '${op}' is not supported by the '${C.nombre}' field. Use '~' (contains).`);
      if (op === '=' || op === '!=') {
        if (C.tipo === 'texto') err(`The operator '${op}' is not supported by the '${C.nombre}' field. Use '${op === '=' ? '~' : '!~'}' instead.`);
        const q = valor();
        if (op === '=') return (x) => igual(C, get(x), q);
        if (q && q.vacio) return (x) => !vacio(get(x));
        // != no devuelve las issues con el campo vacío (salvo issueLinkType, que también trae las que no tienen vínculos)
        return (x) => { const val = get(x); if (vacio(val)) return !!C.vinculo; return !igual(C, val, q); };
      }
      if (['>', '<', '>=', '<='].includes(op)) { const q = valor(); return (x) => comparar(C, get(x), op, q); }
      return err(`Error in the JQL Query: '${op}' is not a valid operator. Valid operators: =, !=, >, >=, <, <=, ~, !~, IN, NOT IN, IS, IS NOT, WAS, WAS IN, WAS NOT, WAS NOT IN, CHANGED.`);
    };
    const no = () => { if (es(ver(), 'not')) { sig(); const f = no(); return (x) => !f(x); } if (ver() === '(') { sig(); const r = o(); if (sig() !== ')') err("Error in the JQL Query: Expecting ')' but got the end of the query."); return r; } return clausula(); };
    const y = () => { let a = no(); while (es(ver(), 'and')) { sig(); const b = no(), a0 = a; a = (x) => a0(x) && b(x); } return a; };
    const o = () => { let a = y(); while (es(ver(), 'or')) { sig(); const b = y(), a0 = a; a = (x) => a0(x) || b(x); } return a; };
    try {
      let pred = () => true;
      if (tokens.length && !(es(ver(), 'order') && es(ver(1), 'by'))) pred = o();
      let orden = [];
      if (es(ver(), 'order') && es(ver(1), 'by')) {
        i += 2;
        for (;;) {
          let f = sig(); if (f == null) err('Error in the JQL Query: Expecting a field name after ORDER BY.');
          f = quitar(f); if (/^story$/i.test(f) && /^points?$/i.test(ver() || '')) f += ' ' + sig().replace(/^point$/i, 'points');
          const C = campoDe(f); if (!C) err(`Not able to sort using field '${f}'.`);
          let dir = null; if (/^(asc|desc)$/i.test(ver() || '')) dir = sig().toUpperCase();
          orden.push([C, dir]);
          if (ver() === ',') { sig(); continue; } break;
        }
      }
      if (i < tokens.length) err(`Error in the JQL Query: Expecting either 'OR' or 'AND' but got '${tokens[i]}'.`);
      let xs = todas().filter(pred);
      if (orden.length) {
        // cada campo tiene su orden natural: prioridad de mayor a menor, estado según el flujo, fechas y claves de más nuevo a más viejo
        const clv = (C, x) => (C.tipo === 'prioridad' ? rangoPrior(C.get(x)) : C.nombre === 'status' ? ESTADOS.indexOf(x.estado) : C.tipo === 'fecha' ? (C.get(x) ? new Date(C.get(x)).getTime() : null) : C.tipo === 'clave' ? (C.get(x) ? String(C.get(x)).split('-')[0] + '-' + String(C.get(x)).split('-')[1].padStart(8, '0') : null) : C.tipo === 'usuario' ? (C.get(x) ? GENTE[C.get(x)] : null) : C.get(x));
        const def = (C) => (C.tipo === 'prioridad' ? 'DESC' : 'ASC');
        xs = xs.sort((a, b) => { for (const [C, dir] of orden) { const A = clv(C, a), B2 = clv(C, b); if (A === B2) continue; const r = A == null ? 1 : B2 == null ? -1 : typeof A === 'number' && typeof B2 === 'number' ? A - B2 : String(A).localeCompare(String(B2)); return (dir || def(C)) === 'DESC' ? -r : r; } return 0; });
      }
      return { ok: true, xs, historia: usoHist.v, fechas: usoFecha.v };
    } catch (e) { return { ok: false, error: e.message }; }
  }
  function busqueda() {
    const s = raiz(), q = query.has('jql') ? query.get('jql') : `project = ${cur} AND statusCategory != Done ORDER BY priority DESC, updated DESC`;
    const r = jql(q);
    const EJ = [['Mi trabajo', 'assignee = currentUser() AND statusCategory != Done ORDER BY priority DESC, updated DESC'], ['Sprint actual', 'sprint in openSprints() ORDER BY status'], ['Bugs urgentes', 'type = Bug AND priority in (Highest, High)'], ['Sin asignar', 'assignee is EMPTY AND type = Story'], ['Trabadas', 'Flagged = Impediment'], ['Creadas esta semana', 'created >= startOfWeek()'], ['Cambiaron en 24 h', 'updated >= -24h'], ['Pasaron por In Progress', 'status WAS "In Progress"'], ['Cambios de prioridad', 'priority CHANGED BY martin'], ['Vencidas', 'due < now() AND resolution = Unresolved'], ['Bloquean a otras', 'issueLinkType = blocks'], ['Texto', 'text ~ "silver"']];
    const cuerpo = `<div class="jr-barra"><h1 class="jr-h1">Search issues</h1><span class="jr-sp"></span>${btn('Save filter', 'data-guardar-f')}</div>
      <form class="jr-jql" id="jrJF"><label class="jr-sr" for="jrJQ">JQL</label><textarea class="jr-in jr-jql-in" id="jrJQ" rows="2" spellcheck="false">${esc(q)}</textarea>${btn('Search', 'type="submit"', 'primario')}</form>
      ${r.ok ? '' : `<div class="jr-err">${esc(r.error)}</div>`}
      <details class="jr-ayuda"><summary>Ejemplos de JQL (clic para probar)</summary><div class="jr-ej-g">${EJ.map(([t, e]) => `<button class="jr-ej-b" data-jql="${esc(e)}"><b>${esc(t)}</b><code>${esc(e)}</code></button>`).join('')}</div>
        <p class="jr-dim">Operadores: <code>= != &gt; &gt;= &lt; &lt;= ~ !~ IN NOT IN IS EMPTY IS NOT EMPTY WAS WAS IN WAS NOT CHANGED</code> · Palabras clave: <code>AND OR NOT ORDER BY</code> (AND se evalúa antes que OR: usa paréntesis) · Fechas: <code>"2026-11-20"</code>, <code>-7d</code>, <code>-4w 2d</code>, <code>startOfDay(-1)</code>, <code>endOfMonth()</code>, <code>now()</code> · Funciones: <code>currentUser() membersOf("analistas") openSprints() closedSprints() futureSprints() linkedIssues(TA-6) updatedBy(martin) issueHistory()</code>. <code>!=</code> y <code>NOT IN</code> no traen las issues con el campo vacío: agrega <code>OR campo IS EMPTY</code> si las quieres.</p></details>
      ${s.filtros.length ? `<p>Your filters: ${s.filtros.map((f) => `<a href="${href('issues')}?jql=${encodeURIComponent(f.jql)}">${esc(f.nombre)}</a>`).join(' · ')}</p>` : ''}
      ${r.ok ? `<div class="jr-tabla-w"><table class="jr-tabla"><thead><tr><th>Type</th><th>Key</th><th>Summary</th><th>Assignee</th><th>Reporter</th><th>Priority</th><th>Status</th><th>Resolution</th><th>Updated</th><th>Due</th></tr></thead><tbody>${r.xs.map((x) => `<tr${x.flag ? ' class="jr-flagged"' : ''}><td>${icTipo(x.tipo)}</td><td><a href="#" data-clave="${clave(x)}">${clave(x)}</a></td><td><a href="#" data-clave="${clave(x)}">${esc(x.titulo)}</a>${x.flag ? ' ' + icFlag : ''}</td><td>${avatar(x.asig, 20)} ${esc(persona(x.asig) || 'Unassigned')}</td><td>${esc(persona(x.rep) || '')}</td><td>${icPrior(x.prior)} ${esc(x.prior)}</td><td>${lozenge(x.estado)}</td><td>${x.res ? esc(x.res) : '<span class="jr-dim">Unresolved</span>'}</td><td>${fechaCorta(x.upd)}</td><td>${x.due ? fechaCorta(x.due + 'T12:00') : ''}</td></tr>`).join('')}</tbody></table></div><p class="jr-dim">${r.xs.length} issues</p>` : ''}`;
    main.innerHTML = marco('issues', cuerpo, ['Issues']); montar();
    main.querySelector('#jrJF').onsubmit = (e) => {
      e.preventDefault(); const v = main.querySelector('#jrJQ').value; const rr = jql(v);
      if (rr.ok) { evento(/order\s+by/i.test(v) ? 'jql-orden' : 'jql'); if (/\b(and|or)\b/i.test(v)) evento('jql-compuesta'); if (rr.historia) evento('jql-historia'); if (rr.fechas) evento('jql-fecha'); }
      location.hash = href('issues') + '?jql=' + encodeURIComponent(v);
    };
    main.querySelector('#jrJQ').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); main.querySelector('#jrJF').requestSubmit(); } };
    main.querySelectorAll('[data-jql]').forEach((b) => { b.onclick = () => { main.querySelector('#jrJQ').value = b.dataset.jql; main.querySelector('#jrJF').requestSubmit(); }; });
    main.querySelector('[data-guardar-f]').onclick = () => { if (!r.ok) return aviso('Corrige la consulta antes de guardarla'); const nombre = prompt('Filter name', 'Mis issues abiertas'); if (!nombre) return; s.filtros.push({ nombre, jql: q }); guardar(); evento('filtro'); busqueda(); };
  }

  // ------------------------------------------------------------------ reportes
  function reportes() {
    const s = st(), r = query.get('r') || 'burndown';
    const tabs = [['burndown', 'Burndown chart'], ['sprint', 'Sprint report'], ['velocity', 'Velocity report'], ['cfd', 'Cumulative flow diagram']];
    let cuerpo = `<h1 class="jr-h1">Reports</h1><div class="jr-tabs">${tabs.map(([t, n]) => `<a class="${r === t ? 'on' : ''}" href="${hp('reports')}?r=${t}">${n}</a>`).join('')}</div>`;
    if (r === 'velocity') {
      const xs = s.cerrados, max = Math.max(1, ...xs.flatMap((x) => [x.comprometido, x.hecho]));
      cuerpo += `<div class="jr-card"><h2>Velocity</h2><p class="jr-dim">Puntos comprometidos (gris) y completados (verde) en cada sprint cerrado. El promedio de completados es la <b>velocidad</b>: sirve para no comprometer más de lo que el equipo suele terminar.</p>
        <svg class="jr-graf" viewBox="0 0 ${Math.max(320, xs.length * 120)} 220" role="img" aria-label="Velocity chart">${xs.map((x, k) => { const X = 40 + k * 110, h1 = (x.comprometido / max) * 160, h2 = (x.hecho / max) * 160; return `<rect x="${X}" y="${190 - h1}" width="34" height="${h1}" fill="#c1c7d0"/><rect x="${X + 38}" y="${190 - h2}" width="34" height="${h2}" fill="#36b37e"/><text x="${X + 36}" y="208" text-anchor="middle" font-size="11" fill="currentColor">${esc(x.nombre.replace(/^[A-Z]+ /, ''))}</text><text x="${X + 17}" y="${185 - h1}" text-anchor="middle" font-size="11" fill="currentColor">${x.comprometido}</text><text x="${X + 55}" y="${185 - h2}" text-anchor="middle" font-size="11" fill="currentColor">${x.hecho}</text>`; }).join('')}<line x1="30" y1="190" x2="${Math.max(320, xs.length * 120)}" y2="190" stroke="currentColor" opacity=".3"/></svg>
        <p>Velocidad promedio: <b>${xs.length ? Math.round(xs.reduce((a, x) => a + x.hecho, 0) / xs.length) : 0}</b> puntos por sprint.</p></div>`;
    } else if (r === 'sprint') {
      const candidatos = s.sprints.filter((x) => x.estado !== 'future' && x.inicio);
      const sp = candidatos.find((x) => String(x.id) === query.get('sp')) || activo() || candidatos[candidatos.length - 1];
      if (!sp) cuerpo += '<div class="jr-card"><p>Todavía no hay sprints iniciados.</p></div>';
      else {
        const rep = sp.reporte, alIni = sp.alInicio || {}, anad = sp.anadidas || [];
        const ids = rep ? [...rep.completadas, ...rep.noCompletadas] : s.issues.filter((x) => x.sprint === sp.id && x.tipo !== 'Subtask' && x.tipo !== 'Epic').map((x) => x.n);
        const xs = ids.map(issue).filter(Boolean);
        const hecha = (x) => (rep ? rep.completadas.includes(x.n) : x.estado === 'Done');
        const ptsTxt = (x) => { const fin = rep ? rep.pts[x.n] : (x.pts || 0); const ini = alIni[x.n]; return ini != null && ini !== fin ? `${ini} → ${fin}` : String(fin ?? '-'); };
        const tabla = (lista2) => lista2.length ? `<div class="jr-tabla-w"><table class="jr-tabla"><thead><tr><th>Key</th><th>Summary</th><th>Issue type</th><th>Priority</th><th>Status</th><th>Story Points</th></tr></thead><tbody>${lista2.map((x) => `<tr><td><a href="#" data-issue="${x.n}">${clave(x)}</a>${anad.includes(x.n) ? ' <b title="Issue added to sprint after start time">*</b>' : ''}</td><td>${esc(x.titulo)}</td><td>${icTipo(x.tipo)} ${esc(x.tipo)}</td><td>${icPrior(x.prior)} ${esc(x.prior)}</td><td>${lozenge(x.estado)}</td><td>${ptsTxt(x)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="jr-dim">None.</p>';
        cuerpo += `<div class="jr-barra"><label>Sprint <select class="jr-in" id="jrRS" style="width:auto">${candidatos.map((x) => `<option value="${x.id}" ${x.id === sp.id ? 'selected' : ''}>${esc(x.nombre)}${x.estado === 'active' ? ' (active)' : ''}</option>`).join('')}</select></label></div>
          <div class="jr-card"><h2>${esc(sp.nombre)}</h2><p class="jr-dim">${sp.estado === 'closed' ? 'Closed' : 'Active'} · ${fechaLarga(sp.inicio)} – ${fechaLarga(sp.cerrado || sp.fin)}${sp.meta ? ` · Sprint goal: <b>${esc(sp.meta)}</b>` : ''}</p>
          ${graficoBurndown(sp)}
          <h3>Completed work items</h3>${tabla(xs.filter(hecha))}
          <h3>Work items not completed</h3>${tabla(xs.filter((x) => !hecha(x)))}
          <p class="jr-dim">* Issue added to sprint after start time. "3 → 5" significa que la estimación cambió durante el sprint. Las estimaciones de subtareas no cuentan: solo las de su historia.</p></div>`;
        evento('reporte-sprint');
      }
    } else if (r === 'cfd') {
      cuerpo += `<div class="jr-card"><h2>Cumulative flow diagram</h2><p class="jr-dim">Cada banda es una columna del tablero y su alto es cuántas issues pasaron por ella hasta ese día. Una banda que se ensancha muestra un cuello de botella: entra más trabajo del que sale. Si una issue vuelve de Done a To Do, no se resta: el diagrama cuenta por dónde pasó cada issue.</p>${graficoCFD()}</div>`;
      evento('cfd');
    } else {
      const sp = activo() || s.sprints.filter((x) => x.estado === 'closed').pop();
      cuerpo += sp && sp.inicio ? `<div class="jr-card"><h2>Burndown · ${esc(sp.nombre)}</h2><p class="jr-dim">La línea gris es el ritmo ideal (del total a 0 el último día). La roja son los puntos que faltan: baja cuando una issue pasa a <b>Done</b> y sube si se agrega trabajo. Si va por encima de la gris, el sprint viene atrasado.</p>${graficoBurndown(sp)}</div>` : `<div class="jr-card"><p>Inicia un sprint para ver el burndown.</p></div>`;
    }
    main.innerHTML = marco('reports', cuerpo, ['Reports']); montar(); evento('reportes');
    const rs = main.querySelector('#jrRS'); if (rs) rs.onchange = () => { location.hash = hp('reports') + '?r=sprint&sp=' + rs.value; };
  }
  function graficoBurndown(sp) {
    const s = st();
    const items = s.issues.filter((x) => (sp.reporte ? [...sp.reporte.completadas, ...sp.reporte.noCompletadas].includes(x.n) : x.sprint === sp.id) && x.tipo !== 'Subtask' && x.tipo !== 'Epic');
    const total = items.reduce((a, x) => a + (x.pts || 0), 0) || 1;
    const ini = new Date(sp.inicio).getTime(), fin = new Date(sp.cerrado || sp.fin).getTime(), dias = Math.max(1, Math.round((fin - ini) / DIA));
    const hechoEn = (x) => { const h = [...x.hist].reverse().find((y) => y.c === 'status' && y.a === 'Done'); return h ? new Date(h.f).getTime() : x.hecho ? new Date(x.hecho).getTime() : null; };
    const pend = (t) => total - items.filter((x) => x.estado === 'Done' && hechoEn(x) != null && hechoEn(x) <= t).reduce((a, x) => a + (x.pts || 0), 0);
    const W = 560, H = 220, X = (d) => 40 + (d / dias) * (W - 60), Y = (p) => 190 - (Math.max(0, p) / total) * 160;
    const hoy = Math.min(dias, Math.max(0, Math.round((Math.min(Date.now(), fin) - ini) / DIA)));
    const puntos = Array.from({ length: hoy + 1 }, (_, d) => `${X(d)},${Y(pend(ini + d * DIA + DIA - 1))}`).join(' ');
    return `<svg class="jr-graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Burndown chart"><line x1="${X(0)}" y1="${Y(total)}" x2="${X(dias)}" y2="${Y(0)}" stroke="#97a0af" stroke-dasharray="5 4" stroke-width="2"/><polyline points="${puntos}" fill="none" stroke="#de350b" stroke-width="2.5"/><line x1="30" y1="190" x2="${W}" y2="190" stroke="currentColor" opacity=".3"/><text x="${X(0)}" y="208" font-size="11" fill="currentColor">Day 0</text><text x="${X(dias) - 30}" y="208" font-size="11" fill="currentColor">Day ${dias}</text><text x="8" y="${Y(total) + 4}" font-size="11" fill="currentColor">${total}</text></svg><p>Quedan <b>${pend(Math.min(Date.now(), fin))}</b> de ${total} puntos.</p>`;
  }
  function graficoCFD() {
    const s = st(), xs = s.issues.filter((x) => x.tipo !== 'Epic');
    if (!xs.length) return '<p>No hay issues.</p>';
    const ini = Math.min(...xs.map((x) => new Date(x.creado).getTime())), hoy = Date.now();
    const n = Math.max(1, Math.ceil((hoy - ini) / DIA));
    // columna más avanzada que alcanzó cada issue hasta el día t
    const alcanzo = (x, t) => { if (new Date(x.creado).getTime() > t) return -1; let k = 0; for (const h of x.hist) if (h.c === 'status' && new Date(h.f).getTime() <= t) k = Math.max(k, ESTADOS.indexOf(h.a)); if (!x.hist.some((h) => h.c === 'status') && x.estado !== 'To Do' && t >= hoy - DIA) k = Math.max(k, ESTADOS.indexOf(x.estado)); return k; };
    const serie = Array.from({ length: n + 1 }, (_, d) => { const t = ini + d * DIA; const al = xs.map((x) => alcanzo(x, t)); return ESTADOS.map((_, k) => al.filter((a) => a >= k).length); });
    const max = Math.max(1, ...serie.map((v) => v[0]));
    const W = 600, H = 240, X = (d) => 40 + (d / n) * (W - 70), Y = (v) => 200 - (v / max) * 170;
    const COL = ['#c1c7d0', '#579dff', '#9f8fef', '#4bce97'];
    const bandas = ESTADOS.map((e, k) => { const arriba = serie.map((v, d) => `${X(d)},${Y(v[k])}`), abajo = serie.map((v, d) => `${X(d)},${Y(k + 1 < ESTADOS.length ? v[k + 1] : 0)}`).reverse(); return `<polygon points="${[...arriba, ...abajo].join(' ')}" fill="${COL[k]}" opacity=".9"><title>${e}</title></polygon>`; }).join('');
    return `<svg class="jr-graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumulative flow diagram">${bandas}<line x1="30" y1="200" x2="${W}" y2="200" stroke="currentColor" opacity=".3"/><text x="8" y="${Y(max) + 4}" font-size="11" fill="currentColor">${max}</text><text x="${X(0)}" y="218" font-size="11" fill="currentColor">${fechaCorta(new Date(ini).toISOString())}</text><text x="${X(n) - 40}" y="218" font-size="11" fill="currentColor">Today</text></svg>
      <div class="jr-leyenda">${ESTADOS.map((e, k) => `<span><i style="background:${COL[k]}"></i>${e}</span>`).join('')}</div>`;
  }

  // ------------------------------------------------------------------ timeline, code y otras páginas
  function timeline() {
    const s = st(), eps = s.issues.filter((x) => x.tipo === 'Epic');
    const cuerpo = `<h1 class="jr-h1">Timeline</h1><div class="jr-card">${eps.map((ep) => { const hs = s.issues.filter((x) => x.epic === ep.n && x.tipo !== 'Subtask'); const hechos = hs.filter((x) => x.estado === 'Done').length; return `<div class="jr-tl"><div class="jr-tl-n">${icTipo('Epic')} <a href="#" data-issue="${ep.n}">${clave(ep)} ${esc(ep.titulo)}</a></div><div class="jr-tl-b"><i style="width:${hs.length ? Math.round((hechos / hs.length) * 100) : 0}%"></i></div><span class="jr-dim">${hechos}/${hs.length} done</span></div>`; }).join('')}</div><p class="jr-dim">Las épicas agrupan las historias de una iniciativa. En el Jira real, acá se arrastran las barras para planificar fechas.</p>`;
    main.innerHTML = marco('timeline', cuerpo, ['Timeline']); montar();
  }
  function codigo() {
    const s = raiz();
    const commits = todas().flatMap((x) => x.dev.map((d) => ({ ...d, x }))).sort((a, b) => String(b.f).localeCompare(String(a.f)));
    const cuerpo = `<h1 class="jr-h1">Code</h1>
      <div class="jr-card"><h2>Smart commits</h2><p>Un commit que nombra una clave aparece en la issue (panel <b>Development</b>). Si además trae comandos, Jira los ejecuta cuando el commit llega al repositorio remoto (<code>git push</code>):</p>
        <div class="jr-tabla-w"><table class="jr-tabla"><thead><tr><th>Comando</th><th>Qué hace</th><th>Ejemplo</th></tr></thead><tbody>
          <tr><td><code>#comment</code></td><td>Agrega un comentario a la issue</td><td><code>git commit -m "TA-7 #comment Total por canal listo para revisar"</code></td></tr>
          <tr><td><code>#time</code></td><td>Registra tiempo trabajado (w, d, h, m; 1w = 5d, 1d = 8h). Lo que sigue al tiempo queda como comentario del registro</td><td><code>git commit -m "TA-7 #time 1h 30m Consulta y tests"</code></td></tr>
          <tr><td><code>#&lt;transición&gt;</code></td><td>Cambia el estado. Se usa el nombre con guiones (<code>#in-progress</code>, <code>#in-review</code>, <code>#done</code>, <code>#to-do</code>) o su primera palabra si no es ambigua (<code>#done</code> sí; <code>#in</code> no, porque hay dos estados que empiezan con "In")</td><td><code>git commit -m "TA-7 #in-review #comment Abrí el PR"</code></td></tr>
        </tbody></table></div>
        <p class="jr-dim">Reglas, como en el Jira real: todo va en una sola línea (con varios comandos si quieres); el texto entre la clave y el primer comando se ignora; una línea sin clave no ejecuta nada; varias claves en la misma línea reciben el mismo comando. En una empresa, el email del commit (<code>git config user.email</code>) tiene que coincidir con tu usuario de Jira: es la causa más común de que un smart commit no haga nada. Y si reescribes la historia (rebase, squash, force push), los comandos pueden ejecutarse de nuevo.</p></div>
      <div class="jr-card"><h2>Resultados</h2>${s.smart.length ? `<div class="jr-tabla-w"><table class="jr-tabla"><thead><tr><th>Commit</th><th>Repositorio</th><th>Issue</th><th>Comando</th><th>Resultado</th></tr></thead><tbody>${[...s.smart].reverse().map((r) => `<tr><td><code>${esc(r.h.slice(0, 7))}</code></td><td>${esc(r.repo)}</td><td>${porClave(r.k) ? `<a href="#" data-clave="${esc(r.k)}">${esc(r.k)}</a>` : esc(r.k)}</td><td><code>${esc(r.cmd)}</code></td><td>${r.ok ? '<span class="jr-ok">✓</span> ' : '<span class="jr-mal">✗</span> '}${esc(r.msg)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="jr-dim">Todavía no se procesó ningún smart commit. Abre la terminal, haz un commit con una clave y un comando y empújalo a cualquier repositorio remoto (GitHub o Azure Repos de práctica).</p>'}</div>
      <div class="jr-card"><h2>Commits vinculados</h2>${commits.length ? commits.map((c) => `<div class="jr-dev-c"><code>${esc(c.h.slice(0, 7))}</code> <a href="#" data-clave="${clave(c.x)}">${clave(c.x)}</a> <span class="jr-dim">${esc(c.repo)} · ${esc(c.autor || '')}</span><br>${esc(c.msg)}</div>`).join('') : '<p class="jr-dim">Ningún commit nombra una issue todavía.</p>'}</div>`;
    main.innerHTML = marco('code', cuerpo, ['Code']); montar();
  }
  function otra(id, t, txt) { main.innerHTML = marco(id, `<h1 class="jr-h1">${esc(t)}</h1><div class="jr-card"><p>${txt}</p></div>`, [t]); montar(); }

  // ------------------------------------------------------------------ router
  function dibujar() {
    const r = ruta[0] || 'board';
    if (r === 'projects') return directorio();
    if (r === 'backlog') return backlog();
    if (r === 'board') return tablero();
    if (r === 'board-settings') return ajustesTablero();
    if (r === 'issues') return busqueda();
    if (r === 'reports') return reportes();
    if (r === 'timeline') return timeline();
    if (r === 'code') return codigo();
    if (r === 'browse' && ruta[1]) { const x = porClave(ruta[1]); if (x) return verIssue(x.n, true); }
    if (r === 'pages') return otra('pages', 'Project pages', 'Documentos del proyecto en Confluence: decisiones, contratos de datos, postmortems. En la práctica, esos documentos van en Markdown dentro del repositorio.');
    return tablero();
  }
  let escuchando = false;
  function vista(m, ctx, sub) {
    main = m; Store = ctx.Store; toast = ctx.toast || toast;
    ruta = (sub || []).map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } }).filter(Boolean);
    // #/jira/projects/CC/board → proyecto CC; #/jira/browse/CC-101 → el proyecto de esa clave; el resto es TA
    cur = 'TA';
    if (ruta[0] === 'projects' && ruta[1]) { cur = ruta[1].toUpperCase(); ruta = ruta.slice(2); if (!ruta.length) ruta = ['board']; }
    else if (ruta[0] === 'browse' && ruta[1]) { const m = ruta[1].match(/^([A-Z][A-Z0-9]+)-\d+$/i); if (m) cur = m[1].toUpperCase(); }
    query = new URLSearchParams(location.hash.split('?')[1] || '');
    document.body.classList.add('jr-abierto');
    raiz(); sincronizarProyectos();
    if (cur !== 'TA' && !regDe(cur) && !raiz().proyectos[cur]) cur = 'TA';
    const n = procesarCommits();
    if (!escuchando && G() && G().oyentesPush) { escuchando = true; G().oyentesPush.push(() => { if (Store && procesarCommits() && /^#\/jira/.test(location.hash)) dibujar(); }); }
    dibujar();
    if (n) aviso(`Se procesaron ${n} comando${n === 1 ? '' : 's'} de smart commits. Mira <a href="${href('code')}">Code</a>.`);
  }
  window.addEventListener('hashchange', () => { if (!/^#\/jira/.test(location.hash)) document.body.classList.remove('jr-abierto'); });
  window.JiraPractica = { vista, jql: (t) => (Store ? jql(t) : null), estado: () => (Store ? raiz() : null), proyecto: (k) => (Store ? estadoDe(k) : null), sincronizar: () => (Store ? sincronizarProyectos() : 0), procesarCommits: () => (Store ? procesarCommits() : 0), parseDuracion };
})();
