/*
 * GitHub de práctica (2/2): Issues, Pull requests (revisión, conflictos, merge/squash/rebase),
 * Actions (corre los workflows con github-actions.js), Settings (protección de ramas, secretos,
 * Pages, métodos de merge), Security (escaneo de secretos), Insights y el sitio de Pages.
 * Camila y Martín, del equipo de datos, revisan tus pull requests si se lo pides.
 */
(function () {
  'use strict';
  const GP = window.GitHubPractica;
  if (!GP) return;
  const _ = GP._;
  const { oc, esc, YO, GENTE, ETIQUETAS, url, repoUrl, ramaDefecto, snapDe, corto, titulo, ancestros, historia, cambiosEntre, archivoDiff, enlazarDiffs,
    hace, avatar, usuario, etiqueta, md, md0, pista, caja, btn, contador, editorMd, enlazarMded, enlazarCabecera, enlazarSelectorRama, marco, guardar, toast, ahora, commitear, vivo, siguienteNumero, estadoChecks, API, Sh } = _;
  const ir = GP.ir, render = GP.render;
  const q = () => _.query();
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const main = () => document.getElementById('ghPag');
  const PERSONAS = ['alumno', 'camila', 'martin'];
  const esAdmin = (x) => x.owner === YO;

  // ------------------------------------------------------------------ protección de ramas
  const patron = (p) => new RegExp('^' + String(p).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
  function reglaDe(r, rama) { const P = (r.config && r.config.proteccion) || {}; if (P[rama]) return P[rama]; const k = Object.keys(P).find((p) => patron(p).test(rama)); return k ? P[k] : null; }

  // ------------------------------------------------------------------ Actions: disparar workflows
  function disparar(x, ev) {
    if (!window.GHActions) return [];
    const r = x.r, snap = snapDe(r, ev.sha);
    const cambiados = ev.antes ? cambiosEntre(snapDe(r, ev.antes), snap).map((c) => c.ruta) : Object.keys(snap);
    const wfs = window.GHActions.disparados(window.GHActions.workflows(snap), { tipo: ev.tipo, rama: ev.rama, base: ev.base, cambiados });
    return wfs.map((wf) => window.GHActions.ejecutar(wf, {
      Sh: Sh(), repo: { owner: x.owner, repo: x.repo }, url: x.url, R: r, sha: ev.sha, rama: ev.rama, base: ev.base, evento: ev.tipo, actor: ev.actor || YO,
      msg: ev.msg || titulo((r.commits[ev.sha] || {}).msg), pr: ev.pr || null, prTitulo: ev.prTitulo,
      alCambiar: () => _.refrescarVivo(), alTerminar: (run) => alTerminarRun(x, run),
    }));
  }
  function alTerminarRun(x, run) {
    _.refrescarVivo();
    if (document.getElementById('ghp')) {
      const ok = run.conclusion === 'success';
      toast(`${ok ? '✓' : run.conclusion === 'skipped' ? '○' : '✗'} ${run.workflow} #${run.n} ${ok ? 'succeeded' : run.conclusion === 'skipped' ? 'skipped' : 'failed'} · ${x.repo}`);
    }
  }
  function desplegarPagesRama(x) {
    const pg = x.r.config.pages; if (!pg || pg.fuente !== 'rama' || !x.r.branches[pg.rama]) return;
    const carpeta = pg.carpeta === 'docs' ? 'docs' : '.';
    const wf = { nombre: 'pages build and deployment', archivo: 'dynamic/pages/pages-build-deployment', on: {}, def: { jobs: {
      build: { name: 'build', 'runs-on': 'ubuntu-latest', steps: [{ name: 'Checkout', uses: 'actions/checkout@v4' }, { name: 'Build with Jekyll', run: `echo "Building the site from /${carpeta === '.' ? '' : 'docs'} (${pg.rama})"\nls ${carpeta}` }, { name: 'Upload artifact', uses: 'actions/upload-pages-artifact@v3', with: { path: carpeta } }] },
      deploy: { name: 'deploy', needs: 'build', 'runs-on': 'ubuntu-latest', steps: [{ name: 'Deploy to GitHub Pages', uses: 'actions/deploy-pages@v4' }] },
    } } };
    const sha = x.r.branches[pg.rama];
    window.GHActions.ejecutar(wf, { Sh: Sh(), repo: { owner: x.owner, repo: x.repo }, url: x.url, R: x.r, sha, rama: pg.rama, evento: 'dynamic', actor: 'github-actions', msg: 'pages build and deployment', alCambiar: () => _.refrescarVivo(), alTerminar: (run) => alTerminarRun(x, run) });
  }
  // cada push (terminal o web): Actions, pull requests abiertos de esa rama y Pages
  _.alPushOyentes.push((x, rama, antes, despues, origen) => {
    const r = x.r;
    if (!despues) return;
    const autor = (r.commits[despues] || {}).author || YO;
    disparar(x, { tipo: 'push', rama, sha: despues, antes, actor: autor });
    for (const pr of r.prs.filter((p) => p.estado === 'abierto' && p.rama === rama)) {
      const nuevos = antes ? [...ancestros(r, despues)].filter((h) => !ancestros(r, antes).has(h)) : [];
      pr.eventos.push({ tipo: 'commits', por: autor, fecha: ahora(), n: nuevos.length, shas: nuevos.slice(0, 20) });
      disparar(x, { tipo: 'pull_request', rama, base: pr.base, sha: despues, antes: r.branches[pr.base], pr: pr.n, prTitulo: pr.titulo, msg: pr.titulo });
    }
    if (r.config.pages && r.config.pages.fuente === 'rama' && r.config.pages.rama === rama) desplegarPagesRama(x);
    guardar();
    if (origen === 'merge') return;
  });
  // un PR creado desde la terminal (gh pr create) también dispara los workflows de pull_request
  function alCrearPR(x, pr) {
    preparar(x, pr);
    const head = x.r.branches[pr.rama];
    if (head) disparar(x, { tipo: 'pull_request', rama: pr.rama, base: pr.base, sha: head, antes: x.r.branches[pr.base], pr: pr.n, prTitulo: pr.titulo, msg: pr.titulo });
    if (pr.revisores && pr.revisores.length) pr.revisores.forEach((u) => programarRevision(x, pr, u));
  }
  function preparar(x, pr) { pr.comentarios = pr.comentarios || []; pr.revisiones = pr.revisiones || []; pr.lineas = pr.lineas || []; pr.revisores = pr.revisores || []; pr.eventos = pr.eventos || []; pr.etiquetas = pr.etiquetas || []; pr.asignados = pr.asignados || []; return pr; }

  // ------------------------------------------------------------------ estado de un pull request
  function commitsPR(r, pr) {
    const head = r.branches[pr.rama] || (pr.fusion && pr.fusion.headSha), base = pr.fusion ? pr.fusion.baseSha : r.branches[pr.base];
    if (!head) return [];
    const B = base ? ancestros(r, base) : new Set();
    return historia(r, head).filter((c) => !B.has(c.sha)).reverse();
  }
  function checksDe(r, sha) {
    const out = [], vistos = new Set();
    for (const run of r.runs.filter((k) => k.sha === sha)) {
      if (!run.jobs.length) { const k = run.archivo + '|' + run.evento; if (!vistos.has(k)) { vistos.add(k); out.push({ nombre: run.workflow, wf: run.workflow, evento: run.evento, estado: run.estado, conclusion: run.conclusion, run }); } continue; }
      for (const j of run.jobs) { const k = run.archivo + '|' + j.nombre + '|' + run.evento; if (vistos.has(k)) continue; vistos.add(k); out.push({ nombre: j.nombre, wf: run.workflow, evento: run.evento, estado: j.estado, conclusion: j.conclusion, run, job: j }); }
    }
    return out;
  }
  function estadoPR(x, pr) {
    const r = x.r, A = API();
    const head = r.branches[pr.rama], base = r.branches[pr.base];
    const e = { head, base, ff: false, conflictos: [], marcas: [], desactualizada: false, checks: [], requeridos: [], aprobaciones: 0, cambios: [], P: reglaDe(r, pr.base), bloqueos: [], fusion: null };
    if (!head || !base) return e;
    e.ff = ancestros(r, head).has(base);
    e.desactualizada = !e.ff;
    if (!e.ff) { const b = A.baseComun(r.commits, head, base); e.fusion = A.fusionarSnaps(b ? snapDe(r, b) : {}, snapDe(r, base), snapDe(r, head), pr.rama); e.conflictos = e.fusion.conflictos; }
    e.marcas = Object.entries(snapDe(r, head)).filter(([, v]) => A.tieneMarcas(v)).map(([k]) => k);
    e.checks = checksDe(r, head);
    if (e.P && e.P.checks && e.P.checks.length) e.requeridos = e.P.checks.map((n) => ({ nombre: n, c: e.checks.find((k) => k.nombre === n) || null }));
    const ult = {};
    for (const rv of pr.revisiones) if (rv.estado !== 'COMMENTED') ult[rv.autor] = rv;
    for (const rv of Object.values(ult)) {
      const vigente = !(e.P && e.P.descartar) || rv.sha === head;
      if (rv.estado === 'APPROVED' && vigente) e.aprobaciones++;
      if (rv.estado === 'CHANGES_REQUESTED') e.cambios.push(rv.autor);
    }
    if (e.conflictos.length) e.bloqueos.push('conflictos');
    if (e.P) {
      if (e.P.requierePR && e.P.aprobaciones && e.aprobaciones < e.P.aprobaciones) e.bloqueos.push('revision');
      if (e.P.requierePR && e.cambios.length) e.bloqueos.push('cambios');
      if (e.requeridos.some((k) => !k.c || k.c.conclusion !== 'success')) e.bloqueos.push('checks');
      if (e.P.estricta && e.desactualizada && e.requeridos.length) e.bloqueos.push('desactualizada');
      if (e.P.conversaciones && pr.lineas.some((l) => !l.padre && !l.resuelto)) e.bloqueos.push('conversaciones');
    }
    if (pr.borrador) e.bloqueos.push('borrador');
    return e;
  }
  const RE_CIERRA = /\b(close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  function issuesQueCierra(x, pr) {
    const textos = [pr.titulo, pr.cuerpo, ...commitsPR(x.r, pr).map((c) => c.msg)].join('\n');
    const ns = new Set(); let m; RE_CIERRA.lastIndex = 0;
    while ((m = RE_CIERRA.exec(textos))) ns.add(Number(m[2]));
    return [...ns].map((n) => x.r.issues.find((i) => i.n === n)).filter(Boolean);
  }
  // fusiona un PR; metodo: merge | squash | rebase. Devuelve { ok, error, sha }
  function fusionar(x, pr, metodo = 'merge', o = {}) {
    const r = x.r, A = API();
    const e = estadoPR(x, pr);
    if (pr.estado !== 'abierto') return { error: `Pull request #${pr.n} is already ${pr.estado === 'fusionado' ? 'merged' : 'closed'}` };
    if (!e.head) return { error: `La rama ${pr.rama} ya no existe en el remoto` };
    if (e.conflictos.length) return { error: `This branch has conflicts that must be resolved (${e.conflictos.join(', ')})` };
    const bloqueos = e.bloqueos.filter((b) => b !== 'conflictos');
    if (bloqueos.length && !(o.bypass && esAdmin(x) && !(e.P && e.P.incluirAdmins))) return { error: motivos(bloqueos, e).join(' · '), bloqueos };
    if (!r.config.metodos[metodo]) return { error: `El método ${metodo} está deshabilitado en Settings → General` };
    const snapFinal = e.ff ? snapDe(r, e.head) : e.fusion.snap;
    const cs = commitsPR(r, pr);
    let nuevo;
    if (metodo === 'merge') {
      nuevo = A.nuevoHash();
      r.commits[nuevo] = { msg: (o.msg || `Merge pull request #${pr.n} from ${x.owner}/${pr.rama}`) + '\n\n' + (o.desc !== undefined ? o.desc : pr.titulo), parent: e.base, parent2: e.head, snap: snapFinal, author: YO, date: ahora() };
    } else if (metodo === 'squash') {
      nuevo = A.nuevoHash();
      r.commits[nuevo] = { msg: (o.msg || `${pr.titulo} (#${pr.n})`) + '\n\n' + (o.desc !== undefined ? o.desc : cs.map((c) => '* ' + titulo(c.msg)).join('\n')), parent: e.base, snap: snapFinal, author: pr.autor || YO, date: ahora() };
    } else {
      let prev = e.base;
      for (const c of cs.filter((k) => !k.parent2)) {
        const f = A.fusionarSnaps(c.parent ? snapDe(r, c.parent) : {}, snapDe(r, prev), c.snap, c.sha);
        if (f.conflictos.length) return { error: 'This branch cannot be rebased due to conflicts' };
        const h = A.nuevoHash();
        r.commits[h] = { msg: c.msg, parent: prev, snap: f.snap, author: c.author, date: ahora() };
        prev = h;
      }
      nuevo = prev;
    }
    const antes = e.base;
    r.branches[pr.base] = nuevo;
    pr.estado = 'fusionado';
    pr.fusion = { por: YO, fecha: ahora(), sha: nuevo, metodo, headSha: e.head, baseSha: antes };
    pr.eventos.push({ tipo: 'fusionado', por: YO, fecha: ahora(), sha: nuevo, metodo });
    for (const is of issuesQueCierra(x, pr)) if (is.estado === 'abierto') { is.estado = 'cerrado'; is.razon = 'completed'; is.eventos.push({ tipo: 'cerrado', por: YO, fecha: ahora(), pr: pr.n }); }
    if (r.config.borrarRamas && !reglaDe(r, pr.rama)) { delete r.branches[pr.rama]; pr.ramaBorrada = true; }
    guardar();
    for (const f of _.alPushOyentes) { try { f(x, pr.base, antes, nuevo, 'merge'); } catch (err) { console.error(err); } }
    return { ok: true, sha: nuevo };
  }
  function motivos(bl, e) {
    const M = {
      revision: `At least ${e.P && e.P.aprobaciones} approving review${e.P && e.P.aprobaciones > 1 ? 's are' : ' is'} required by reviewers with write access.`,
      cambios: 'Changes were requested by a reviewer.',
      checks: `Required status check${e.requeridos.length > 1 ? 's' : ''} ${e.requeridos.filter((k) => !k.c || k.c.conclusion !== 'success').map((k) => `"${k.nombre}"`).join(', ')} ${e.requeridos.some((k) => !k.c) ? 'expected' : 'not successful'}.`,
      desactualizada: 'This branch is out-of-date with the base branch.',
      conversaciones: 'All conversations must be resolved.',
      borrador: 'This pull request is still a work in progress (draft).',
      conflictos: 'This branch has conflicts that must be resolved.',
    };
    return bl.map((b) => M[b] || b);
  }

  // ------------------------------------------------------------------ revisores simulados
  const pendientes = new Set();
  function programarRevision(x, pr, u) {
    const k = `${x.url}#${pr.n}#${u}`; if (pendientes.has(k)) return; pendientes.add(k);
    let intentos = 0;
    const paso = () => {
      const e = estadoPR(x, pr);
      // espera a que terminen los checks (como haría una persona)
      if (e.checks.some((c) => c.estado !== 'completed') && intentos++ < 60) { setTimeout(paso, 1500); return; }
      pendientes.delete(k);
      if (pr.estado !== 'abierto') return;
      revisar(x, pr, u, e);
      guardar(); _.refrescarVivo();
      if (document.getElementById('ghp')) { toast(`${u} reviewed #${pr.n}`); if (location.hash.includes(`/pull/${pr.n}`)) render(); }
    };
    setTimeout(paso, 2500 + Math.random() * 1500);
  }
  function revisar(x, pr, u, e) {
    const r = x.r, sha = e.head;
    const falla = e.checks.filter((c) => c.conclusion === 'failure');
    const cs = cambiosEntre(snapDe(r, e.base), snapDe(r, e.head));
    pr.revisores = pr.revisores.filter((y) => y !== u);
    const firma = u === 'camila' ? '' : '';
    if (!cs.length) { pr.revisiones.push({ autor: u, estado: 'COMMENTED', texto: 'Este PR no tiene cambios respecto a ' + pr.base + '. ¿Faltó hacer push?' + firma, fecha: ahora(), sha }); return; }
    if (e.conflictos.length) { pr.revisiones.push({ autor: u, estado: 'CHANGES_REQUESTED', texto: `Hay conflictos con \`${pr.base}\` en ${e.conflictos.map((c) => '`' + c + '`').join(', ')}. Trae ${pr.base} a tu rama (\`git pull origin ${pr.base}\`), resuelve las marcas y vuelve a hacer push.`, fecha: ahora(), sha }); return; }
    if (falla.length) { pr.revisiones.push({ autor: u, estado: 'CHANGES_REQUESTED', texto: `El check **${falla[0].nombre}** está fallando. Mira el log en Actions, corrígelo y vuelve a hacer push: cuando quede en verde lo reviso de nuevo.`, fecha: ahora(), sha }); return; }
    if (e.marcas.length) { pr.revisiones.push({ autor: u, estado: 'CHANGES_REQUESTED', texto: `\`${e.marcas[0]}\` todavía tiene marcas de conflicto (\`<<<<<<<\`, \`=======\`, \`>>>>>>>\`). Ese código no va a correr.`, fecha: ahora(), sha }); return; }
    const notas = [];
    // comentarios de línea con cosas típicas de una revisión
    for (const c of cs) {
      if (!c.despues) continue;
      c.ops.forEach((o) => {
        if (o.t !== '+') return;
        const t = o.x;
        let nota = null;
        if (/^\s*print\(/.test(t) && /\.py$/.test(c.ruta)) nota = '¿Este `print` es para depurar? En un pipeline conviene `logging` (así se puede filtrar por nivel).';
        else if (/(password|passwd|secret|token|api_key)\s*=\s*["'][^"']{4,}/i.test(t)) nota = '⚠️ Esto parece una credencial en el código. Muévela a una variable de entorno o a un secreto (Settings → Secrets) y rota la clave: ya quedó en la historia de git.';
        else if (/SELECT \*/i.test(t)) nota = '`SELECT *` trae columnas que no usamos y se rompe si cambia la tabla. Mejor listar las columnas.';
        else if (/except\s*:/.test(t)) nota = 'Un `except:` sin tipo también atrapa errores que no esperabas (hasta Ctrl+C). ¿Podemos atrapar una excepción concreta?';
        if (nota && notas.length < 3) notas.push({ ruta: c.ruta, linea: o.b + 1, lado: 'R', texto: nota });
      });
    }
    for (const n of notas) pr.lineas.push({ id: Date.now() + Math.random(), ...n, autor: u, fecha: ahora(), sha, resuelto: false });
    const sinDesc = !String(pr.cuerpo || '').trim();
    const grave = notas.some((n) => /credencial/.test(n.texto));
    const texto = grave ? 'Dejé un comentario importante sobre una credencial: hay que sacarla antes de fusionar.' : notas.length ? `Se ve bien 👍 Dejé ${notas.length === 1 ? 'un comentario menor' : notas.length + ' comentarios menores'}.${sinDesc ? ' La próxima vez agrega una descripción: qué cambia y cómo probarlo.' : ''}` : `LGTM 🚀${sinDesc ? ' (la próxima vez agrega una descripción: qué cambia y cómo probarlo)' : ''}`;
    pr.revisiones.push({ autor: u, estado: grave ? 'CHANGES_REQUESTED' : 'APPROVED', texto, fecha: ahora(), sha });
  }

  // ------------------------------------------------------------------ piezas comunes
  function iconoIssue(is) { return is.estado === 'abierto' ? `<span class="gh-verde">${oc('issue-opened')}</span>` : is.razon === 'not_planned' ? `<span class="gh-dim">${oc('circle-slash')}</span>` : `<span class="gh-morado">${oc('issue-closed')}</span>`; }
  function iconoPR(pr) { return pr.estado === 'fusionado' ? `<span class="gh-morado">${oc('git-merge')}</span>` : pr.estado === 'cerrado' ? `<span class="gh-rojo">${oc('git-pull-request-closed')}</span>` : pr.borrador ? `<span class="gh-dim">${oc('git-pull-request-draft')}</span>` : `<span class="gh-verde">${oc('git-pull-request')}</span>`; }
  function estadoBadge(tipo, o) {
    if (tipo === 'pr') return o.estado === 'fusionado' ? `<span class="gh-state gh-state-merged">${oc('git-merge')} Merged</span>` : o.estado === 'cerrado' ? `<span class="gh-state gh-state-closed">${oc('git-pull-request-closed')} Closed</span>` : o.borrador ? `<span class="gh-state gh-state-draft">${oc('git-pull-request-draft')} Draft</span>` : `<span class="gh-state gh-state-open">${oc('git-pull-request')} Open</span>`;
    return o.estado === 'abierto' ? `<span class="gh-state gh-state-open">${oc('issue-opened')} Open</span>` : o.razon === 'not_planned' ? `<span class="gh-state gh-state-np">${oc('circle-slash')} Closed</span>` : `<span class="gh-state gh-state-merged">${oc('issue-closed')} Closed</span>`;
  }
  function comentarioHtml(x, c, o = {}) {
    return `<div class="gh-tl-item gh-tl-com">${avatar(c.autor, 40)}<div class="gh-com${c.autor === YO && o.autorEs === YO ? ' gh-com-yo' : ''}"><div class="gh-com-h"><b>${usuario(c.autor)}</b> <span class="gh-dim">commented ${hace(c.fecha)}</span>${o.autorEs === c.autor ? '<span class="gh-label-vis">Author</span>' : ''}${GENTE[c.autor] && c.autor !== YO ? '<span class="gh-label-vis">Member</span>' : ''}</div><div class="gh-com-b">${c.texto && c.texto.trim() ? md(c.texto, x) : '<p class="gh-dim"><i>No description provided.</i></p>'}</div></div></div>`;
  }
  const eventoHtml = (ico, html, f) => `<div class="gh-tl-item gh-tl-ev"><span class="gh-tl-ico">${ico}</span><div>${html} <span class="gh-dim">${hace(f)}</span></div></div>`;
  function barraLateral(x, obj, o = {}) {
    const rv = o.pr ? `<div class="gh-side-sec"><div class="gh-side-t">Reviewers<button class="gh-ib" data-menu="rev" title="Request reviewers">${oc('gear')}</button></div>
      <div class="gh-menu gh-menu-der" data-menu-de="rev" hidden><div class="gh-menu-t">Request up to 15 reviewers</div>${PERSONAS.filter((u) => u !== obj.autor).map((u) => `<a href="#" data-pedir-rev="${u}">${avatar(u, 20)} <b>${u}</b> <span class="gh-dim">${GENTE[u].nombre}</span></a>`).join('')}${obj.autor === YO ? '<div class="gh-dim gh-sm gh-menu-nota">You can’t request yourself: authors can’t approve their own pull request.</div>' : ''}</div>
      ${revisoresHtml(x, obj) || '<div class="gh-dim gh-sm">No reviews</div>'}</div>` : '';
    return `<aside class="gh-side">${rv}
      <div class="gh-side-sec"><div class="gh-side-t">Assignees<button class="gh-ib" data-menu="asig">${oc('gear')}</button></div><div class="gh-menu gh-menu-der" data-menu-de="asig" hidden>${PERSONAS.map((u) => `<a href="#" data-asignar="${u}">${obj.asignados.includes(u) ? oc('check') : '<i class="gh-ico-vacio"></i>'} ${avatar(u, 20)} ${u}</a>`).join('')}</div>
        ${obj.asignados.length ? obj.asignados.map((u) => `<div>${avatar(u, 20)} <b>${u}</b></div>`).join('') : `<div class="gh-dim gh-sm">No one — <a href="#" data-asignar="${YO}">Assign yourself</a></div>`}</div>
      <div class="gh-side-sec"><div class="gh-side-t">Labels<button class="gh-ib" data-menu="lab">${oc('gear')}</button></div><div class="gh-menu gh-menu-der" data-menu-de="lab" hidden><div class="gh-menu-t">Apply labels</div>${Object.keys(ETIQUETAS).map((l) => `<a href="#" data-etiqueta="${esc(l)}">${obj.etiquetas.includes(l) ? oc('check') : '<i class="gh-ico-vacio"></i>'} <i class="gh-lang-dot" style="background:${ETIQUETAS[l][0]}"></i> <b>${esc(l)}</b><div class="gh-dim gh-sm">${esc(ETIQUETAS[l][1])}</div></a>`).join('')}</div>
        ${obj.etiquetas.length ? `<div class="gh-labels">${obj.etiquetas.map(etiqueta).join('')}</div>` : '<div class="gh-dim gh-sm">None yet</div>'}</div>
      <div class="gh-side-sec"><div class="gh-side-t">Development</div>${o.desarrollo || '<div class="gh-dim gh-sm">No branches or pull requests</div>'}</div>
      <div class="gh-side-sec"><div class="gh-side-t">Notifications</div>${btn('Unsubscribe', { sm: true, ico: 'bell', attr: 'data-noop3 style="width:100%"' })}<div class="gh-dim gh-sm">You’re receiving notifications because you’re ${obj.autor === YO ? 'the author' : 'watching this repository'}.</div></div></aside>`;
  }
  function revisoresHtml(x, pr) {
    const ult = {};
    for (const rv of pr.revisiones) ult[rv.autor] = rv;
    const filas = Object.values(ult).map((rv) => `<div class="gh-rev-fila">${avatar(rv.autor, 20)} <b>${rv.autor}</b><span class="gh-sp"></span>${rv.estado === 'APPROVED' ? `<span class="gh-verde" title="Approved these changes">${oc('check')}</span>` : rv.estado === 'CHANGES_REQUESTED' ? `<span class="gh-rojo" title="Requested changes">${oc('file-diff')}</span>` : `<span class="gh-dim" title="Left review comments">${oc('comment')}</span>`}<button class="gh-ib" data-pedir-rev="${rv.autor}" title="Re-request review">${oc('sync')}</button></div>`);
    for (const u of pr.revisores.filter((y) => !ult[y] || pendientes.has(`${x.url}#${pr.n}#${y}`))) filas.push(`<div class="gh-rev-fila">${avatar(u, 20)} <b>${u}</b><span class="gh-sp"></span><span class="gh-ambar" title="Awaiting requested review from ${u}">${oc('dot-fill')}</span></div>`);
    return filas.join('');
  }
  function enlazarLateral(x, obj, tipo) {
    const m = main();
    $$('[data-asignar]', m).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const u = a.dataset.asignar; const i = obj.asignados.indexOf(u); if (i >= 0) obj.asignados.splice(i, 1); else { obj.asignados.push(u); obj.eventos.push({ tipo: 'asignado', por: YO, a: u, fecha: ahora() }); } guardar(); render(); }));
    $$('[data-etiqueta]', m).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const l = a.dataset.etiqueta; const i = obj.etiquetas.indexOf(l); if (i >= 0) obj.etiquetas.splice(i, 1); else { obj.etiquetas.push(l); obj.eventos.push({ tipo: 'etiqueta', por: YO, l, fecha: ahora() }); } guardar(); render(); }));
    $$('[data-pedir-rev]', m).forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault(); const u = a.dataset.pedirRev;
      if (u === obj.autor) { toast('Pull request authors can’t request themselves'); return; }
      if (u === YO) { toast('(práctica) tú eres el autor del PR: pide la revisión a camila o martin'); return; }
      if (!obj.revisores.includes(u)) obj.revisores.push(u);
      obj.eventos.push({ tipo: 'revision-pedida', por: YO, a: u, fecha: ahora() });
      guardar(); programarRevision(x, obj, u); render();
    }));
    $$('[data-noop3]', m).forEach((b) => b.addEventListener('click', () => toast('(práctica) las notificaciones no se envían')));
  }

  // ------------------------------------------------------------------ Issues
  function filtrar(lista, qs, tipo) {
    const t = qs.toLowerCase();
    const est = /is:closed|state:closed/.test(t) ? 'cerrado' : /is:merged/.test(t) ? 'fusionado' : /is:open|state:open/.test(t) ? 'abierto' : null;
    const lab = [...t.matchAll(/label:("([^"]+)"|\S+)/g)].map((m) => m[2] || m[1]);
    const autor = (/author:(\S+)/.exec(t) || [])[1], asig = (/assignee:(\S+)/.exec(t) || [])[1];
    const texto = t.replace(/(is|state|label|author|assignee):("([^"]+)"|\S+)/g, '').trim();
    return lista.filter((o) => (!est || (est === 'cerrado' && tipo === 'pr' ? o.estado !== 'abierto' : o.estado === est)) && lab.every((l) => o.etiquetas.includes(l)) && (!autor || o.autor === autor.replace('@me', YO)) && (!asig || o.asignados.includes(asig.replace('@me', YO))) && (!texto || (o.titulo + ' ' + (o.cuerpo || '')).toLowerCase().includes(texto)));
  }
  function vistaIssues(x, resto) {
    if (resto[0] === 'new') { vistaNuevaIssue(x); return; }
    if (resto[0]) { vistaIssue(x, Number(resto[0])); return; }
    const r = x.r;
    const qs = q().get('q') || 'is:issue state:open';
    const lista = filtrar(r.issues, qs, 'issue').sort((a, b) => b.n - a.n);
    const base = filtrar(r.issues, qs.replace(/(is|state):(open|closed)/g, ''), 'issue');
    const ab = base.filter((i) => i.estado === 'abierto').length, ce = base.length - ab;
    const cerradas = /closed/.test(qs);
    const cuerpo = `<div class="gh-issues"><div class="gh-code-bar"><label class="gh-buscar gh-buscar-lista">${oc('search')}<input id="isQ" value="${esc(qs)}"></label>${btn('Labels', { ico: 'tag', attr: 'data-noop4' })}${btn('Milestones', { ico: 'milestone', attr: 'data-noop4' })}${btn('New issue', { tipo: 'primary', href: repoUrl(x, 'issues', 'new') })}</div>
      <div class="gh-box"><div class="gh-box-h gh-lista-h"><a href="${repoUrl(x, 'issues')}?q=${encodeURIComponent('is:issue state:open')}" class="${cerradas ? '' : 'sel'}">${oc('issue-opened')} Open ${contador(ab)}</a><a href="${repoUrl(x, 'issues')}?q=${encodeURIComponent('is:issue state:closed')}" class="${cerradas ? 'sel' : ''}">${oc('check')} Closed ${contador(ce)}</a><span class="gh-sp"></span><span class="gh-dim gh-sm">Author ▾ Labels ▾ Assignees ▾</span></div>
      ${lista.map((i) => `<div class="gh-li">${iconoIssue(i)}<div class="gh-grow"><a class="gh-li-t" href="${repoUrl(x, 'issues', i.n)}">${esc(i.titulo)}</a> ${i.etiquetas.map(etiqueta).join(' ')}<div class="gh-dim gh-sm">#${i.n} · ${esc(i.autor)} ${i.estado === 'abierto' ? 'opened' : 'closed'} ${hace(i.estado === 'abierto' ? i.fecha : (i.eventos.filter((e) => e.tipo === 'cerrado').pop() || i).fecha)}</div></div><div class="gh-li-d">${i.asignados.map((u) => avatar(u, 20)).join('')}${i.comentarios.length ? `<span class="gh-dim">${oc('comment')} ${i.comentarios.length}</span>` : ''}</div></div>`).join('') || `<div class="gh-blank">${oc('issue-opened', '', 24)}<h3>No results</h3><p class="gh-dim">Try adjusting your search filters.</p></div>`}</div>
      ${pista('Busca como en GitHub: <code>is:open label:bug</code>, <code>author:camila</code>, <code>assignee:@me</code>. Un issue se cierra solo si el PR que lo arregla dice <code>Closes #N</code>.')}</div>`;
    marco(x, 'issues', cuerpo); enlazarCabecera(x);
    const iq = $('#isQ', main()); iq.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(repoUrl(x, 'issues') + '?q=' + encodeURIComponent(iq.value)); });
    $$('[data-noop4]', main()).forEach((b) => b.addEventListener('click', () => toast('(práctica) las etiquetas se ponen dentro de cada issue')));
  }
  function vistaNuevaIssue(x) {
    const tmp = { asignados: [], etiquetas: [], autor: YO, eventos: [] };
    const cuerpo = `<div class="gh-nueva"><h1 class="gh-h2">Create new issue</h1><div class="gh-con-side"><div class="gh-grow"><div class="gh-com-nueva">${avatar(YO, 40)}<div class="gh-grow"><label class="gh-lbl">Add a title <span class="gh-rojo">*</span></label><input class="gh-input" id="niT" placeholder="Title"><label class="gh-lbl">Add a description</label>${editorMd('niB', '', 'Type your description here…')}
      <div class="gh-der">${btn('Cancel', { href: repoUrl(x, 'issues') })}${btn('Create', { tipo: 'primary', attr: 'id="niOk"' })}</div></div></div></div>${barraLateral(x, tmp)}</div></div>`;
    marco(x, 'issues', cuerpo); enlazarCabecera(x); enlazarMded(main(), x);
    const repintar = () => { const s = $('.gh-side', main()); s.outerHTML = barraLateral(x, tmp); enlazarLocal(); _.enlazarMenus(main()); };
    const enlazarLocal = () => {
      $$('[data-asignar]', main()).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const u = a.dataset.asignar; const i = tmp.asignados.indexOf(u); if (i >= 0) tmp.asignados.splice(i, 1); else tmp.asignados.push(u); repintar(); }));
      $$('[data-etiqueta]', main()).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const l = a.dataset.etiqueta; const i = tmp.etiquetas.indexOf(l); if (i >= 0) tmp.etiquetas.splice(i, 1); else tmp.etiquetas.push(l); repintar(); }));
    };
    enlazarLocal();
    setTimeout(() => $('#niT', main()).focus(), 30);
    $('#niOk', main()).addEventListener('click', () => {
      const t = $('#niT', main()).value.trim(); if (!t) { toast('A title is required'); return; }
      const n = siguienteNumero(x.r);
      x.r.issues.push({ n, titulo: t, cuerpo: $('#niB', main()).value, estado: 'abierto', autor: YO, fecha: ahora(), etiquetas: tmp.etiquetas, asignados: tmp.asignados, comentarios: [], eventos: [] });
      guardar(); ir(repoUrl(x, 'issues', n));
    });
  }
  function vistaIssue(x, n) {
    const r = x.r, is = r.issues.find((i) => i.n === n);
    if (!is) { const pr = r.prs.find((p) => p.n === n); if (pr) { ir(repoUrl(x, 'pull', n)); return; } marco(x, 'issues', `<div class="gh-404"><h2>404</h2><p>No existe el issue #${n}.</p></div>`); enlazarCabecera(x); return; }
    const items = [];
    for (const c of is.comentarios) items.push({ f: c.fecha, h: comentarioHtml(x, c, { autorEs: is.autor }) });
    for (const e of is.eventos) {
      if (e.tipo === 'cerrado') items.push({ f: e.fecha, h: eventoHtml(`<span class="gh-tl-ico-b gh-bg-morado">${oc('issue-closed')}</span>`, `${avatar(e.por, 20)} <b>${e.por}</b> closed this as ${e.razon === 'not_planned' ? 'not planned' : 'completed'}${e.pr ? ` in <a href="${repoUrl(x, 'pull', e.pr)}">#${e.pr}</a>` : ''}`, e.fecha) });
      if (e.tipo === 'reabierto') items.push({ f: e.fecha, h: eventoHtml(`<span class="gh-tl-ico-b gh-bg-verde">${oc('issue-reopened')}</span>`, `${avatar(e.por, 20)} <b>${e.por}</b> reopened this`, e.fecha) });
      if (e.tipo === 'etiqueta') items.push({ f: e.fecha, h: eventoHtml(oc('tag'), `${avatar(e.por, 20)} <b>${e.por}</b> added the ${etiqueta(e.l)} label`, e.fecha) });
      if (e.tipo === 'asignado') items.push({ f: e.fecha, h: eventoHtml(oc('person'), `${avatar(e.por, 20)} <b>${e.por}</b> ${e.a === e.por ? 'self-assigned this' : `assigned <b>${e.a}</b>`}`, e.fecha) });
    }
    // referencias desde commits y PRs
    for (const c of Object.entries(r.commits).map(([sha, k]) => ({ sha, ...k })).filter((k) => new RegExp(`#${n}\\b`).test(k.msg || ''))) if (Object.values(r.branches).some((b) => ancestros(r, b).has(c.sha))) items.push({ f: c.date, h: eventoHtml(oc('git-commit'), `${avatar(c.author, 20)} <b>${c.author}</b> added a commit that references this issue <a class="gh-mono" href="${repoUrl(x, 'commit', c.sha)}">${corto(c.sha)}</a> ${md0(titulo(c.msg), x)}`, c.date) });
    for (const pr of r.prs.filter((p) => new RegExp(`#${n}\\b`).test(p.titulo + ' ' + (p.cuerpo || '')))) items.push({ f: pr.fecha, h: eventoHtml(oc('cross-reference') || oc('link'), `${avatar(pr.autor, 20)} <b>${pr.autor}</b> mentioned this issue in ${iconoPR(pr)} <a href="${repoUrl(x, 'pull', pr.n)}">${esc(pr.titulo)} #${pr.n}</a>`, pr.fecha) });
    items.sort((a, b) => String(a.f).localeCompare(String(b.f)));
    const prsLig = r.prs.filter((p) => RE_TEST(p, n));
    const desarrollo = prsLig.length ? prsLig.map((p) => `<div>${iconoPR(p)} <a href="${repoUrl(x, 'pull', p.n)}">${esc(p.titulo)}</a></div>`).join('') : `<a href="#" id="isRama" class="gh-sm">Create a branch</a> <span class="gh-dim gh-sm">for this issue or link a pull request.</span>`;
    const cuerpo = `<div class="gh-issue"><div class="gh-issue-h"><h1 class="gh-h1">${esc(is.titulo)} <span class="gh-dim">#${is.n}</span></h1><div class="gh-issue-hb">${btn('Edit', { sm: true, attr: 'id="isEdit"' })}${btn('New issue', { sm: true, tipo: 'primary', href: repoUrl(x, 'issues', 'new') })}</div></div>
      <div class="gh-issue-meta">${estadoBadge('issue', is)} <span class="gh-dim"><b>${usuario(is.autor)}</b> opened this issue ${hace(is.fecha)} · ${is.comentarios.length} comment${is.comentarios.length === 1 ? '' : 's'}</span></div>
      <div class="gh-con-side"><div class="gh-grow gh-tl">${comentarioHtml(x, { autor: is.autor, texto: is.cuerpo, fecha: is.fecha }, { autorEs: is.autor })}${items.map((i) => i.h).join('')}
        <div class="gh-tl-item gh-tl-nuevo">${avatar(YO, 40)}<div class="gh-grow"><h3 class="gh-h4">Add a comment</h3>${editorMd('isC')}<div class="gh-der">${is.estado === 'abierto' ? `<span class="gh-btn-grupo">${btn('Close issue', { ico: 'issue-closed', attr: 'id="isClose"' })}${btn('', { caret: true, attr: 'data-menu="cierre"' })}</span><div class="gh-menu gh-menu-der gh-menu-arriba" data-menu-de="cierre" hidden><a href="#" data-cerrar-como="completed">${oc('issue-closed')} <b>Close as completed</b><div class="gh-dim gh-sm">Done, closed, fixed, resolved</div></a><a href="#" data-cerrar-como="not_planned">${oc('circle-slash')} <b>Close as not planned</b><div class="gh-dim gh-sm">Won’t fix, can’t repro, duplicate, stale</div></a></div>` : btn('Reopen issue', { ico: 'issue-reopened', attr: 'id="isReopen"' })}${btn('Comment', { tipo: 'primary', attr: 'id="isCom"' })}</div></div></div></div>
      ${barraLateral(x, is, { desarrollo })}</div></div>`;
    marco(x, 'issues', cuerpo); enlazarCabecera(x); enlazarMded(main(), x); enlazarLateral(x, is, 'issue');
    const comentar = () => { const t = $('#isC', main()).value.trim(); if (t) { is.comentarios.push({ autor: YO, texto: t, fecha: ahora() }); responderMencion(x, is, t, 'issue'); } return !!t; };
    $('#isCom', main()).addEventListener('click', () => { if (comentar()) { guardar(); render(); } });
    const cerrar = (razon) => { comentar(); is.estado = 'cerrado'; is.razon = razon; is.eventos.push({ tipo: 'cerrado', por: YO, fecha: ahora(), razon }); guardar(); render(); };
    const bc = $('#isClose', main()); if (bc) bc.addEventListener('click', () => cerrar('completed'));
    $$('[data-cerrar-como]', main()).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); cerrar(a.dataset.cerrarComo); }));
    const br = $('#isReopen', main()); if (br) br.addEventListener('click', () => { comentar(); is.estado = 'abierto'; is.razon = null; is.eventos.push({ tipo: 'reabierto', por: YO, fecha: ahora() }); guardar(); render(); });
    $('#isEdit', main()).addEventListener('click', () => { const t = prompt('Title', is.titulo); if (t && t.trim()) { is.titulo = t.trim(); guardar(); render(); } });
    const cr = $('#isRama', main());
    if (cr) cr.addEventListener('click', (e) => {
      e.preventDefault();
      const nombre = `${n}-${is.titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}`;
      if (!x.r.branches[nombre]) { x.r.branches[nombre] = x.r.branches[ramaDefecto(x.r)]; guardar(); }
      toast(`Branch ${nombre} created`);
      $('.gh-side', main()).insertAdjacentHTML('afterbegin', `<div class="gh-flash">${oc('git-branch')} Rama <b>${esc(nombre)}</b> creada. En la terminal:<pre class="gh-mono">git fetch origin\ngit checkout ${esc(nombre)}</pre></div>`);
    });
  }
  const RE_TEST = (p, n) => new RegExp(`#${n}\\b`).test(p.titulo + ' ' + (p.cuerpo || ''));
  // si mencionas a camila o martin, contestan (una vez por comentario)
  function responderMencion(x, obj, texto, tipo) {
    const m = /@(camila|martin)\b/i.exec(texto); if (!m) return;
    const u = m[1].toLowerCase();
    setTimeout(() => {
      obj.comentarios.push({ autor: u, texto: tipo === 'pr' ? '¡Gracias por avisar! Si ya está listo, pídeme la revisión en **Reviewers** y lo miro.' : 'Gracias, lo miro. Si quieres tomarlo tú, asígnatelo y abre un PR que diga `Closes #' + obj.n + '`.', fecha: ahora() });
      guardar(); if (document.getElementById('ghp') && location.hash.includes(`/${obj.n}`)) render();
    }, 2500);
  }

  // ------------------------------------------------------------------ Pull requests: lista y compare
  function vistaPulls(x) {
    const r = x.r;
    const qs = q().get('q') || 'is:pr is:open';
    const lista = filtrar(r.prs, qs, 'pr').sort((a, b) => b.n - a.n);
    const base = filtrar(r.prs, qs.replace(/(is|state):(open|closed|merged)/g, ''), 'pr');
    const ab = base.filter((p) => p.estado === 'abierto').length, ce = base.length - ab;
    const cerradas = /closed|merged/.test(qs);
    const ramasRecientes = Object.keys(r.branches).filter((b) => b !== ramaDefecto(r) && !r.prs.some((p) => p.rama === b && (p.estado === 'abierto' || (p.fusion && p.fusion.headSha === r.branches[b]))) && Date.now() - new Date((r.commits[r.branches[b]] || {}).date) < 3600e3);
    const cuerpo = `<div class="gh-issues">${ramasRecientes.slice(0, 2).map((b) => `<div class="gh-flash gh-flash-warn">${oc('git-branch')} <b>${esc(b)}</b> had recent pushes ${hace(r.commits[r.branches[b]].date)}<span class="gh-sp"></span>${btn('Compare & pull request', { tipo: 'primary', href: repoUrl(x, 'compare', `${ramaDefecto(r)}...${b}`) + '?expand=1' })}</div>`).join('')}
      <div class="gh-code-bar"><label class="gh-buscar gh-buscar-lista">${oc('search')}<input id="prQ" value="${esc(qs)}"></label>${btn('New pull request', { tipo: 'primary', href: repoUrl(x, 'compare') })}</div>
      <div class="gh-box"><div class="gh-box-h gh-lista-h"><a href="${repoUrl(x, 'pulls')}" class="${cerradas ? '' : 'sel'}">${oc('git-pull-request')} ${ab} Open</a><a href="${repoUrl(x, 'pulls')}?q=${encodeURIComponent('is:pr is:closed')}" class="${cerradas ? 'sel' : ''}">${oc('check')} ${ce} Closed</a><span class="gh-sp"></span><span class="gh-dim gh-sm">Author ▾ Label ▾ Reviews ▾</span></div>
      ${lista.map((p) => { const e = p.estado === 'abierto' ? estadoPR(x, p) : null; const rev = e ? (e.cambios.length ? '<span class="gh-rojo">Changes requested</span>' : e.aprobaciones ? '<span class="gh-verde">Approved</span>' : e.P && e.P.aprobaciones ? '<span class="gh-ambar">Review required</span>' : '') : ''; return `<div class="gh-li">${iconoPR(p)}<div class="gh-grow"><a class="gh-li-t" href="${repoUrl(x, 'pull', p.n)}">${esc(p.titulo)}</a> ${p.head ? '' : estadoChecks(x, x.r.branches[p.rama])} ${p.etiquetas.map(etiqueta).join(' ')}<div class="gh-dim gh-sm">#${p.n} ${p.estado === 'fusionado' ? `by ${esc(p.autor)} was merged ${hace(p.fusion && p.fusion.fecha)}` : p.estado === 'cerrado' ? `by ${esc(p.autor)} was closed` : `opened ${hace(p.fecha)} by ${esc(p.autor)}`}${p.borrador ? ' · Draft' : ''} ${rev ? '· ' + rev : ''}</div></div><div class="gh-li-d">${p.revisores.map((u) => avatar(u, 20)).join('')}${p.comentarios.length ? `<span class="gh-dim">${oc('comment')} ${p.comentarios.length}</span>` : ''}</div></div>`; }).join('') || `<div class="gh-blank">${oc('git-pull-request', '', 24)}<h3>${cerradas ? 'No closed pull requests' : 'Welcome to pull requests!'}</h3><p class="gh-dim">Pull requests help you collaborate on code with other people. Crea una rama, haz push y ábrelo aquí o con <code>gh pr create</code>.</p></div>`}</div></div>`;
    marco(x, 'pulls', cuerpo); enlazarCabecera(x);
    const iq = $('#prQ', main()); iq.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(repoUrl(x, 'pulls') + '?q=' + encodeURIComponent(iq.value)); });
  }
  function vistaCompare(x, resto) {
    const r = x.r, def = ramaDefecto(r);
    const spec = resto.join('/');
    let [base, head] = spec.includes('...') ? spec.split('...') : [def, spec || ''];
    if (!head) head = '';
    const sel = (lado, val) => `<span class="gh-rel">${btn(`${lado}: <b>${esc(val || 'choose')}</b>`, { sm: true, caret: true, attr: `data-menu="cmp${lado}"` })}<div class="gh-menu" data-menu-de="cmp${lado}" hidden>${Object.keys(r.branches).map((b) => `<a href="${repoUrl(x, 'compare', lado === 'base' ? `${b}...${head || b}` : `${base}...${b}`)}">${b === val ? oc('check') : '<i class="gh-ico-vacio"></i>'} ${esc(b)}</a>`).join('')}</div></span>`;
    const barra = `<div class="gh-cmp-bar">${oc('git-compare')} ${sel('base', base)} ${oc('arrow-left')} ${sel('compare', head)}`;
    let detalle = '';
    if (!head || !r.branches[head] || !r.branches[base]) detalle = `${barra}</div><div class="gh-blank">${oc('git-compare', '', 32)}<h3>Compare changes</h3><p class="gh-dim">Choose two branches to see what’s changed or to start a new pull request.</p></div>`;
    else {
      const tmp = { rama: head, base, n: 0, revisiones: [], lineas: [] };
      const e = estadoPR(x, tmp);
      const cs = commitsPR(r, tmp);
      const dif = cambiosEntre(snapDe(r, r.branches[base]), e.fusion ? e.fusion.snap : snapDe(r, r.branches[head]));
      const existe = r.prs.find((p) => p.rama === head && p.base === base && p.estado === 'abierto');
      const estado = !cs.length ? '' : e.conflictos.length ? `<span class="gh-rojo">${oc('x')} <b>Can’t automatically merge.</b></span> <span class="gh-dim">Don’t worry, you can still create the pull request.</span>` : `<span class="gh-verde">${oc('check')} <b>Able to merge.</b></span> <span class="gh-dim">These branches can be automatically merged.</span>`;
      const tituloDef = cs.length === 1 ? titulo(cs[0].msg) : head.replace(/[-_/]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
      const cuerpoDef = cs.length === 1 ? String(cs[0].msg).split('\n').slice(1).join('\n').trim() : '';
      detalle = `${barra}<span class="gh-cmp-estado">${estado}</span></div>
        ${!cs.length ? `<div class="gh-blank"><h3>There isn’t anything to compare.</h3><p class="gh-dim"><b>${esc(base)}</b> is up to date with all commits from <b>${esc(head)}</b>.</p></div>` : existe ? `<div class="gh-flash">${iconoPR(existe)} <a href="${repoUrl(x, 'pull', existe.n)}"><b>${esc(existe.titulo)} #${existe.n}</b></a> — ya hay un pull request abierto para esta rama. ${btn('View pull request', { sm: true, href: repoUrl(x, 'pull', existe.n) })}</div>` : q().get('expand') ? `
        <div class="gh-con-side"><div class="gh-grow"><div class="gh-com-nueva">${avatar(YO, 40)}<div class="gh-grow gh-box gh-box-p"><label class="gh-lbl">Add a title <span class="gh-rojo">*</span></label><input class="gh-input" id="cpT" value="${esc(tituloDef)}"><label class="gh-lbl">Add a description</label>${editorMd('cpB', cuerpoDef, 'Qué cambia, por qué y cómo probarlo. Usa "Closes #N" para cerrar un issue al fusionar.')}
          <div class="gh-der"><span class="gh-btn-grupo">${btn('Create pull request', { tipo: 'primary', attr: 'id="cpOk"' })}${btn('', { tipo: 'primary', caret: true, attr: 'data-menu="cpDraft"' })}</span><div class="gh-menu gh-menu-der" data-menu-de="cpDraft" hidden><a href="#" id="cpDraft">${oc('git-pull-request-draft')} <b>Create draft pull request</b><div class="gh-dim gh-sm">Cannot be merged until marked ready for review</div></a></div></div></div></div></div>
          ${barraLateral(x, { autor: YO, asignados: [], etiquetas: [], revisores: [], revisiones: [] }, { pr: true })}</div>`
        : `<div class="gh-flash gh-flash-azul">${oc('info')} Discuss and review the changes in this comparison with others. ${btn('Create pull request', { tipo: 'primary', href: repoUrl(x, 'compare', `${base}...${head}`) + '?expand=1' })}</div>`}
        ${cs.length ? `<div class="gh-cmp-res"><div class="gh-cmp-stats"><span>${oc('git-commit')} <b>${cs.length}</b> commit${cs.length > 1 ? 's' : ''}</span><span>${oc('file-diff')} <b>${dif.length}</b> file${dif.length === 1 ? '' : 's'} changed</span><span>${oc('people')} <b>${new Set(cs.map((c) => c.author)).size}</b> contributor${new Set(cs.map((c) => c.author)).size > 1 ? 's' : ''}</span></div>
          <div class="gh-box">${cs.map((c) => `<div class="gh-crow">${avatar(c.author, 20)}<div class="gh-grow"><a href="${repoUrl(x, 'commit', c.sha)}">${esc(titulo(c.msg))}</a></div><a class="gh-mono gh-dim" href="${repoUrl(x, 'commit', c.sha)}">${corto(c.sha)}</a></div>`).join('')}</div>
          ${dif.map((k) => archivoDiff(k, { ver: (k2) => repoUrl(x, 'blob', head, k2.ruta) })).join('')}</div>` : ''}`;
      setTimeout(() => {
        const m = main(); if (!m) return;
        enlazarDiffs(m, dif);
        enlazarMded(m, x);
        const elegidos = { revisores: [], etiquetas: [], asignados: [] };
        $$('[data-pedir-rev]', m).forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); const u = a.dataset.pedirRev; if (u === YO) return; if (!elegidos.revisores.includes(u)) elegidos.revisores.push(u); a.innerHTML = oc('check') + ' ' + a.innerHTML; toast(`${u} will be requested to review`); }));
        $$('[data-etiqueta]', m).forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); const l = a.dataset.etiqueta; if (!elegidos.etiquetas.includes(l)) elegidos.etiquetas.push(l); a.innerHTML = oc('check') + ' ' + a.innerHTML; }));
        $$('[data-asignar]', m).forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); const u = a.dataset.asignar; if (!elegidos.asignados.includes(u)) elegidos.asignados.push(u); a.innerHTML = oc('check') + ' ' + a.innerHTML; }));
        const crear = (borrador) => {
          const t = $('#cpT', m).value.trim(); if (!t) { toast('A title is required'); return; }
          const n = siguienteNumero(r);
          const pr = preparar(x, { n, titulo: t, cuerpo: $('#cpB', m).value, rama: head, base, estado: 'abierto', autor: YO, fecha: ahora(), borrador });
          Object.assign(pr, { revisores: elegidos.revisores.slice(), etiquetas: elegidos.etiquetas, asignados: elegidos.asignados });
          for (const u of pr.revisores) pr.eventos.push({ tipo: 'revision-pedida', por: YO, a: u, fecha: ahora() });
          r.prs.push(pr); guardar();
          alCrearPR(x, pr);
          ir(repoUrl(x, 'pull', n));
        };
        const ok = $('#cpOk', m); if (ok) ok.addEventListener('click', () => crear(false));
        const dr = $('#cpDraft', m); if (dr) dr.addEventListener('click', (ev) => { ev.preventDefault(); crear(true); });
      }, 0);
    }
    const cuerpo = `<div class="gh-compare"><h1 class="gh-h2">${q().get('expand') && head ? 'Open a pull request' : 'Comparing changes'}</h1><p class="gh-dim">${q().get('expand') ? 'Create a new pull request by comparing changes across two branches.' : 'Choose two branches to see what’s changed or to start a new pull request.'}</p>${detalle}</div>`;
    marco(x, 'pulls', cuerpo, { ancho: true }); enlazarCabecera(x);
  }

  // ------------------------------------------------------------------ Pull request
  function vistaPR(x, resto) {
    const r = x.r, n = Number(resto[0]), tab = resto[1] || 'conversation';
    const pr = r.prs.find((p) => p.n === n);
    if (!pr) { if (r.issues.find((i) => i.n === n)) { ir(repoUrl(x, 'issues', n)); return; } marco(x, 'pulls', `<div class="gh-404"><h2>404</h2><p>No existe el pull request #${n}.</p></div>`); enlazarCabecera(x); return; }
    preparar(x, pr);
    if (tab === 'conflicts') { vistaConflictos(x, pr); return; }
    const cs = commitsPR(r, pr);
    const headSha = r.branches[pr.rama] || (pr.fusion && pr.fusion.headSha);
    const baseSnap = pr.fusion ? snapDe(r, pr.fusion.baseSha) : snapDe(r, r.branches[pr.base]);
    const e = pr.estado === 'abierto' ? estadoPR(x, pr) : null;
    const dif = cambiosEntre(baseSnap, e && e.fusion ? e.fusion.snap : snapDe(r, headSha));
    const checks = headSha ? checksDe(r, headSha) : [];
    const T = [['conversation', 'comment-discussion', 'Conversation', pr.comentarios.length + pr.revisiones.length], ['commits', 'git-commit', 'Commits', cs.length], ['checks', 'checklist', 'Checks', checks.length], ['files', 'file-diff', 'Files changed', dif.length]];
    const mas = dif.reduce((a, b) => a + b.mas, 0), menos = dif.reduce((a, b) => a + b.menos, 0);
    const cab = `<div class="gh-pr-h"><div class="gh-issue-h"><h1 class="gh-h1">${esc(pr.titulo)} <span class="gh-dim">#${pr.n}</span></h1><div class="gh-issue-hb">${btn('Edit', { sm: true, attr: 'id="prEdit"' })}${btn('', { ico: 'code', sm: true, caret: true, attr: 'data-menu="prCode" title="Code"' })}<div class="gh-menu gh-menu-der" data-menu-de="prCode" hidden><div class="gh-menu-sec"><div class="gh-b">${oc('terminal')} Checkout with GitHub CLI</div><div class="gh-copia"><input class="gh-input gh-input-sm gh-mono" readonly value="gh pr checkout ${pr.n}">${btn('', { ico: 'copy', sm: true, attr: `data-copiar="gh pr checkout ${pr.n}"` })}</div></div></div></div></div>
      <div class="gh-issue-meta">${estadoBadge('pr', pr)} <span class="gh-dim"><b>${usuario(pr.autor)}</b> ${pr.estado === 'fusionado' ? `merged ${cs.length} commit${cs.length === 1 ? '' : 's'} into` : `wants to merge ${cs.length} commit${cs.length === 1 ? '' : 's'} into`} <a class="gh-label-rama" href="${repoUrl(x, 'tree', pr.base)}">${esc(pr.base)}</a> from <a class="gh-label-rama" href="${r.branches[pr.rama] ? repoUrl(x, 'tree', pr.rama) : '#'}">${esc(pr.rama)}</a>${btn('', { ico: 'copy', sm: true, attr: `data-copiar="${esc(pr.rama)}" class="gh-btn gh-btn-sm gh-btn-inv"` })}</span></div>
      <nav class="gh-subtabs gh-pr-tabs">${T.map(([id, ico, txt, c]) => `<a href="${id === 'conversation' ? repoUrl(x, 'pull', pr.n) : repoUrl(x, 'pull', pr.n, id)}" class="${tab === id ? 'sel' : ''}">${oc(ico)} ${txt} ${contador(c)}</a>`).join('')}<span class="gh-sp"></span><span class="gh-sm"><span class="gh-verde">+${mas}</span> <span class="gh-rojo">−${menos}</span> ${_.contador ? '' : ''}</span></nav></div>`;
    let cuerpoTab = '';
    if (tab === 'commits') cuerpoTab = `<div class="gh-box">${cs.map((c) => `<div class="gh-crow">${avatar(c.author, 20)}<div class="gh-grow"><a href="${repoUrl(x, 'commit', c.sha)}">${esc(titulo(c.msg))}</a><div class="gh-dim gh-sm"><b>${esc(c.author)}</b> committed ${hace(c.date)} ${estadoChecks(x, c.sha)}</div></div><a class="gh-btn gh-btn-sm gh-mono" href="${repoUrl(x, 'commit', c.sha)}">${corto(c.sha)}</a></div>`).join('') || '<div class="gh-box-b gh-dim">No commits</div>'}</div>`;
    else if (tab === 'checks') cuerpoTab = checksTab(x, headSha);
    else if (tab === 'files') cuerpoTab = filesTab(x, pr, dif);
    else cuerpoTab = conversacion(x, pr, cs, e, checks);
    marco(x, 'pulls', cab + cuerpoTab, { ancho: tab === 'files' }); enlazarCabecera(x);
    const m = main();
    $$('[data-copiar]', m).forEach((b) => b.addEventListener('click', () => _.copiar(b.dataset.copiar)));
    $('#prEdit', m).addEventListener('click', () => { const t = prompt('Title', pr.titulo); if (t && t.trim()) { pr.eventos.push({ tipo: 'renombrado', por: YO, de: pr.titulo, a: t.trim(), fecha: ahora() }); pr.titulo = t.trim(); guardar(); render(); } });
    if (tab === 'conversation') enlazarConversacion(x, pr);
    if (tab === 'files') enlazarFiles(x, pr, dif);
    if (tab === 'checks') vivo(() => { const b = $('#ghChecksTab', main()); if (b) b.outerHTML = checksTab(x, headSha); });
  }
  function checkFila(x, c) {
    const ico = c.estado !== 'completed' ? `<span class="gh-ambar gh-girando">${oc('dot-fill')}</span>` : c.conclusion === 'success' ? `<span class="gh-verde">${oc('check-circle-fill')}</span>` : c.conclusion === 'skipped' ? `<span class="gh-dim">${oc('skip')}</span>` : `<span class="gh-rojo">${oc('x-circle-fill')}</span>`;
    const txt = c.estado !== 'completed' ? (c.estado === 'queued' ? 'Queued — Waiting to run this check...' : 'In progress — This check has started...') : c.conclusion === 'success' ? `Successful in ${dur(c.job || c.run)}` : c.conclusion === 'skipped' ? 'Skipped' : `Failing after ${dur(c.job || c.run)}`;
    return `<div class="gh-check">${ico}<b>${esc(c.wf)} / ${esc(c.nombre)} (${esc(c.evento)})</b><span class="gh-dim">${txt}</span><span class="gh-sp"></span>${c.requerido ? '<span class="gh-label-vis">Required</span>' : ''}<a href="${repoUrl(x, 'actions', 'runs', c.run.id) + (c.job ? '/job/' + c.run.jobs.indexOf(c.job) : '')}">Details</a></div>`;
  }
  const dur = (o) => { if (!o || !o.inicio) return '0s'; const s = Math.max(1, Math.round((new Date(o.fin || Date.now()) - new Date(o.inicio)) / 1000)); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; };
  function checksTab(x, sha) {
    const cs = sha ? checksDe(x.r, sha) : [];
    return `<div id="ghChecksTab">${cs.length ? caja(`<b>${cs.length} check${cs.length > 1 ? 's' : ''}</b>`, cs.map((c) => checkFila(x, c)).join('')) : `<div class="gh-blank">${oc('checklist', '', 24)}<h3>No checks have been run</h3><p class="gh-dim">Agrega un workflow en <code>.github/workflows/</code> con <code>on: pull_request</code> para que cada push a este PR corra tus tests. <a href="${repoUrl(x, 'actions', 'new')}">Set up a workflow</a></p></div>`}</div>`;
  }
  function conversacion(x, pr, cs, e, checks) {
    const items = [];
    items.push({ f: pr.fecha, h: comentarioHtml(x, { autor: pr.autor, texto: pr.cuerpo, fecha: pr.fecha }, { autorEs: pr.autor }), primero: true });
    if (cs.length) items.push({ f: cs[0].date > pr.fecha ? pr.fecha : cs[0].date, h: eventoHtml(oc('git-commit'), `${avatar(pr.autor, 20)} <b>${pr.autor}</b> added ${cs.length} commit${cs.length > 1 ? 's' : ''}<div class="gh-tl-commits">${cs.slice(0, 50).map((c) => `<div>${oc('git-commit')} <a href="${repoUrl(x, 'commit', c.sha)}">${esc(titulo(c.msg))}</a> ${estadoChecks(x, c.sha)}<span class="gh-sp"></span><a class="gh-mono gh-dim" href="${repoUrl(x, 'commit', c.sha)}">${corto(c.sha)}</a></div>`).join('')}</div>`, pr.fecha), orden: 0 });
    for (const c of pr.comentarios) items.push({ f: c.fecha, h: comentarioHtml(x, c, { autorEs: pr.autor }) });
    for (const rv of pr.revisiones) {
      const ico = rv.estado === 'APPROVED' ? `<span class="gh-tl-ico-b gh-bg-verde">${oc('check')}</span>` : rv.estado === 'CHANGES_REQUESTED' ? `<span class="gh-tl-ico-b gh-bg-rojo">${oc('file-diff')}</span>` : `<span class="gh-tl-ico">${oc('eye')}</span>`;
      const txt = rv.estado === 'APPROVED' ? 'approved these changes' : rv.estado === 'CHANGES_REQUESTED' ? 'requested changes' : 'reviewed';
      const lineas = pr.lineas.filter((l) => l.autor === rv.autor && Math.abs(new Date(l.fecha) - new Date(rv.fecha)) < 5000 && !l.padre);
      items.push({ f: rv.fecha, h: `<div class="gh-tl-item gh-tl-ev">${ico}<div class="gh-grow">${avatar(rv.autor, 20)} <b>${usuario(rv.autor)}</b> ${txt} ${hace(rv.fecha)}${rv.sha && e && rv.sha !== e.head ? ' <span class="gh-label-vis" title="Hubo commits después de esta revisión">Outdated</span>' : ''}${rv.texto ? `<div class="gh-com gh-com-rev"><div class="gh-com-b">${md(rv.texto, x)}</div>${lineas.map((l) => hiloHtml(x, pr, l)).join('')}</div>` : ''}</div></div>` });
    }
    for (const l of pr.lineas.filter((k) => !k.padre && !pr.revisiones.some((rv) => rv.autor === k.autor && Math.abs(new Date(k.fecha) - new Date(rv.fecha)) < 5000))) items.push({ f: l.fecha, h: `<div class="gh-tl-item gh-tl-ev"><span class="gh-tl-ico">${oc('comment')}</span><div class="gh-grow">${avatar(l.autor, 20)} <b>${l.autor}</b> commented on <code>${esc(l.ruta)}</code> ${hace(l.fecha)}${hiloHtml(x, pr, l)}</div></div>` });
    for (const ev of pr.eventos) {
      if (ev.tipo === 'commits' && ev.n) items.push({ f: ev.fecha, h: eventoHtml(oc('repo-push'), `${avatar(ev.por, 20)} <b>${ev.por}</b> added ${ev.n} commit${ev.n > 1 ? 's' : ''}<div class="gh-tl-commits">${(ev.shas || []).slice().reverse().map((h) => x.r.commits[h] ? `<div>${oc('git-commit')} <a href="${repoUrl(x, 'commit', h)}">${esc(titulo(x.r.commits[h].msg))}</a> ${estadoChecks(x, h)}<span class="gh-sp"></span><span class="gh-mono gh-dim">${corto(h)}</span></div>` : '').join('')}</div>`, ev.fecha) });
      if (ev.tipo === 'revision-pedida') items.push({ f: ev.fecha, h: eventoHtml(oc('eye'), `${avatar(ev.por, 20)} <b>${ev.por}</b> requested a review from <b>${ev.a}</b>`, ev.fecha) });
      if (ev.tipo === 'fusionado') items.push({ f: ev.fecha, h: eventoHtml(`<span class="gh-tl-ico-b gh-bg-morado">${oc('git-merge')}</span>`, `${avatar(ev.por, 20)} <b>${ev.por}</b> merged commit <a class="gh-mono" href="${repoUrl(x, 'commit', ev.sha)}">${corto(ev.sha)}</a> into <span class="gh-label-rama">${esc(pr.base)}</span>${ev.metodo === 'squash' ? ' (squash)' : ev.metodo === 'rebase' ? ' (rebase)' : ''}`, ev.fecha) });
      if (ev.tipo === 'cerrado') items.push({ f: ev.fecha, h: eventoHtml(`<span class="gh-tl-ico-b gh-bg-rojo">${oc('git-pull-request-closed')}</span>`, `${avatar(ev.por, 20)} <b>${ev.por}</b> closed this`, ev.fecha) });
      if (ev.tipo === 'reabierto') items.push({ f: ev.fecha, h: eventoHtml(`<span class="gh-tl-ico-b gh-bg-verde">${oc('git-pull-request')}</span>`, `${avatar(ev.por, 20)} <b>${ev.por}</b> reopened this`, ev.fecha) });
      if (ev.tipo === 'listo') items.push({ f: ev.fecha, h: eventoHtml(oc('eye'), `${avatar(ev.por, 20)} <b>${ev.por}</b> marked this pull request as ready for review`, ev.fecha) });
      if (ev.tipo === 'rama-borrada') items.push({ f: ev.fecha, h: eventoHtml(oc('git-branch'), `${avatar(ev.por, 20)} <b>${ev.por}</b> deleted the <span class="gh-label-rama">${esc(pr.rama)}</span> branch`, ev.fecha) });
      if (ev.tipo === 'renombrado') items.push({ f: ev.fecha, h: eventoHtml(oc('pencil'), `${avatar(ev.por, 20)} <b>${ev.por}</b> changed the title <s>${esc(ev.de)}</s> ${esc(ev.a)}`, ev.fecha) });
      if (ev.tipo === 'actualizada') items.push({ f: ev.fecha, h: eventoHtml(oc('git-merge'), `${avatar(ev.por, 20)} <b>${ev.por}</b> merged <span class="gh-label-rama">${esc(pr.base)}</span> into this branch`, ev.fecha) });
    }
    const [primero, ...otros] = items;
    otros.sort((a, b) => String(a.f).localeCompare(String(b.f)) || (a.orden === 0 ? -1 : 0));
    const cierra = issuesQueCierra(x, pr);
    const desarrollo = cierra.length ? `<div class="gh-dim gh-sm">Successfully merging this pull request may close these issues.</div>${cierra.map((i) => `<div>${iconoIssue(i)} <a href="${repoUrl(x, 'issues', i.n)}">${esc(i.titulo)}</a></div>`).join('')}` : '<div class="gh-dim gh-sm">Escribe <code>Closes #N</code> en la descripción para cerrar un issue al fusionar.</div>';
    return `<div class="gh-con-side"><div class="gh-grow gh-tl">${primero.h}${otros.map((i) => i.h).join('')}
      <div id="ghMergeBox">${cajaMerge(x, pr, e, checks)}</div>
      <div class="gh-tl-item gh-tl-nuevo">${avatar(YO, 40)}<div class="gh-grow"><h3 class="gh-h4">Add a comment</h3>${editorMd('prC')}<div class="gh-der">${pr.estado === 'abierto' ? btn('Close pull request', { ico: 'git-pull-request-closed', attr: 'id="prClose"' }) : pr.estado === 'cerrado' && x.r.branches[pr.rama] ? btn('Reopen pull request', { attr: 'id="prReopen"' }) : ''}${btn('Comment', { tipo: 'primary', attr: 'id="prCom"' })}</div></div></div></div>
      ${barraLateral(x, pr, { pr: true, desarrollo })}</div>`;
  }
  function hiloHtml(x, pr, l) {
    const resp = pr.lineas.filter((k) => k.padre === l.id);
    const snap = snapDe(x.r, x.r.branches[pr.rama] || (pr.fusion && pr.fusion.headSha));
    const ls = String(snap[l.ruta] || '').split('\n');
    const ctx = ls.slice(Math.max(0, l.linea - 3), l.linea).map((t, i, arr) => `<tr class="${i === arr.length - 1 ? 'ad' : ''}"><td class="gh-num">${l.linea - arr.length + i + 1}</td><td class="gh-cod">${esc(t) || ' '}</td></tr>`).join('');
    return `<div class="gh-hilo${l.resuelto ? ' gh-hilo-res' : ''}" data-hilo="${l.id}"><div class="gh-hilo-h">${oc('file')} <code>${esc(l.ruta)}</code>${l.resuelto ? `<span class="gh-dim gh-sm">· ${oc('check')} resolved</span>` : ''}</div>${l.resuelto ? '' : `<table class="gh-diff gh-diff-mini">${ctx}</table>`}
      ${[l, ...resp].map((c) => `<div class="gh-hilo-c">${avatar(c.autor, 24)}<div class="gh-grow"><b>${c.autor}</b> <span class="gh-dim">${hace(c.fecha)}</span>${md(c.texto, x)}</div></div>`).join('')}
      <div class="gh-hilo-p"><input class="gh-input gh-input-sm" placeholder="Reply..." data-responder="${l.id}">${btn(l.resuelto ? 'Unresolve conversation' : 'Resolve conversation', { sm: true, attr: `data-resolver="${l.id}"` })}</div></div>`;
  }
  function cajaMerge(x, pr, e, checks) {
    const r = x.r;
    if (pr.estado === 'fusionado') return `<div class="gh-merge gh-merge-hecho"><span class="gh-merge-ico gh-bg-morado">${oc('git-merge')}</span><div class="gh-box gh-grow"><div class="gh-box-b"><b>Pull request successfully merged and closed</b><p class="gh-dim">You’re all set — the <span class="gh-label-rama">${esc(pr.rama)}</span> branch ${r.branches[pr.rama] ? 'can be safely deleted.' : 'has been deleted.'}</p>
      ${pista(`Para tener el resultado en tu computadora: <code>git switch ${esc(pr.base)}</code> y <code>git pull</code>. Después puedes borrar la rama local con <code>git branch -d ${esc(pr.rama)}</code>.`)}</div>${r.branches[pr.rama] ? `<div class="gh-box-pie gh-der">${btn('Delete branch', { attr: 'id="prDelRama"' })}</div>` : `<div class="gh-box-pie gh-der">${btn('Restore branch', { attr: 'id="prRestRama"' })}</div>`}</div></div>`;
    if (pr.estado === 'cerrado') return `<div class="gh-merge"><span class="gh-merge-ico gh-bg-rojo">${oc('git-pull-request-closed')}</span><div class="gh-box gh-grow"><div class="gh-box-b"><b>Closed with unmerged commits</b><p class="gh-dim">This pull request is closed.</p></div></div></div>`;
    if (!e.head) return `<div class="gh-merge"><span class="gh-merge-ico gh-bg-gris">${oc('git-pull-request')}</span><div class="gh-box gh-grow"><div class="gh-box-b"><b>La rama ${esc(pr.rama)} ya no existe</b><p class="gh-dim">Vuelve a subirla (<code>git push -u origin ${esc(pr.rama)}</code>) o cierra el PR.</p></div></div></div>`;
    const secciones = [];
    // revisiones
    const P = e.P;
    if (e.cambios.length) secciones.push(['rojo', 'file-diff', 'Changes requested', `${e.cambios.length} review${e.cambios.length > 1 ? 's' : ''} requesting changes by reviewers with write access.`]);
    else if (e.aprobaciones) secciones.push(['verde', 'check', 'Changes approved', `${e.aprobaciones} approving review${e.aprobaciones > 1 ? 's' : ''} by reviewers with write access.`]);
    else if (P && P.requierePR && P.aprobaciones) secciones.push(['ambar', 'dot-fill', 'Review required', `At least ${P.aprobaciones} approving review${P.aprobaciones > 1 ? 's are' : ' is'} required by reviewers with write access. ${pr.revisores.length ? 'Waiting on ' + pr.revisores.join(', ') + '.' : '<b>Pide la revisión en Reviewers →</b>'}`]);
    // checks
    if (checks.length || e.requeridos.length) {
      const corriendo = checks.filter((c) => c.estado !== 'completed'), fallan = checks.filter((c) => c.estado === 'completed' && c.conclusion === 'failure'), okk = checks.filter((c) => c.conclusion === 'success');
      const faltan = e.requeridos.filter((k) => !k.c);
      const t = fallan.length ? ['rojo', 'x', 'Some checks were not successful', `${okk.length} successful and ${fallan.length} failing checks`] : corriendo.length ? ['ambar', 'dot-fill', 'Some checks haven’t completed yet', `${corriendo.length} in progress check${corriendo.length > 1 ? 's' : ''}`] : faltan.length ? ['ambar', 'dot-fill', 'Some checks haven’t completed yet', `${faltan.length} expected check${faltan.length > 1 ? 's' : ''}`] : ['verde', 'check', 'All checks have passed', `${okk.length} successful check${okk.length > 1 ? 's' : ''}`];
      const req = new Set((P && P.checks) || []);
      const filas = checks.map((c) => checkFila(x, { ...c, requerido: req.has(c.nombre) })).join('') + faltan.map((k) => `<div class="gh-check"><span class="gh-ambar">${oc('dot-fill')}</span><b>${esc(k.nombre)}</b><span class="gh-dim">Expected — Waiting for status to be reported</span><span class="gh-sp"></span><span class="gh-label-vis">Required</span></div>`).join('');
      secciones.push([...t, `<details class="gh-checks-det"${fallan.length || corriendo.length ? ' open' : ''}><summary>${checks.length + faltan.length} checks</summary>${filas}</details>`]);
    }
    // conflictos
    if (e.conflictos.length) secciones.push(['rojo', 'alert', 'This branch has conflicts that must be resolved', `Use the web editor or the command line to resolve conflicts before continuing.<div class="gh-dim gh-sm">Conflicting files: ${e.conflictos.map((c) => `<code>${esc(c)}</code>`).join(' ')}</div><div class="gh-der">${btn('Resolve conflicts', { attr: 'id="prResolver"' })}</div>`]);
    else if (e.desactualizada) secciones.push([P && P.estricta ? 'ambar' : 'verde', P && P.estricta ? 'alert' : 'check', P && P.estricta ? 'This branch is out-of-date with the base branch' : 'This branch has no conflicts with the base branch', `${P && P.estricta ? 'Merge the latest changes from <b>' + esc(pr.base) + '</b> into this branch. ' : 'Merging can be performed automatically. '}<div class="gh-der">${btn('Update branch', { sm: true, attr: 'id="prUpdate"' })}</div>`]);
    else secciones.push(['verde', 'check', 'This branch has no conflicts with the base branch', 'Merging can be performed automatically.']);
    if (P && P.conversaciones && pr.lineas.some((l) => !l.padre && !l.resuelto)) secciones.push(['ambar', 'comment-discussion', 'Unresolved conversations', 'All conversations on code must be resolved before the pull request can be merged.']);
    if (e.marcas.length) secciones.push(['ambar', 'alert', 'Conflict markers in the code', `${e.marcas.map((m) => `<code>${esc(m)}</code>`).join(' ')} todavía tiene <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> / <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>: git deja fusionarlo, pero el código no va a correr.`]);
    const bloq = e.bloqueos.filter((b) => b !== 'conflictos');
    const puede = !e.conflictos.length && !bloq.length;
    const bypass = !puede && !e.conflictos.length && esAdmin(x) && !(P && P.incluirAdmins) && !pr.borrador;
    const metodos = Object.entries({ merge: 'Create a merge commit', squash: 'Squash and merge', rebase: 'Rebase and merge' }).filter(([k]) => r.config.metodos[k]);
    const met = pr._metodo && r.config.metodos[pr._metodo] ? pr._metodo : metodos[0] ? metodos[0][0] : 'merge';
    const textoBtn = { merge: 'Merge pull request', squash: 'Squash and merge', rebase: 'Rebase and merge' }[met];
    const DESC = { merge: 'All commits from this branch will be added to the base branch via a merge commit.', squash: `The ${commitsPR(r, pr).length} commits from this branch will be combined into one commit in the base branch.`, rebase: `The ${commitsPR(r, pr).length} commits from this branch will be rebased and added to the base branch.` };
    const pie = pr.borrador ? `<div class="gh-merge-pie"><b>This pull request is still a work in progress</b><div class="gh-dim">Draft pull requests cannot be merged.</div><div>${btn('Ready for review', { attr: 'id="prListo"' })}</div></div>`
      : `<div class="gh-merge-pie">${!puede ? `<div class="gh-rojo gh-b">${oc('alert')} Merging is blocked</div><div class="gh-dim gh-sm">${motivos(e.bloqueos, e).join('<br>')}</div>` : ''}
        ${bypass ? `<label class="gh-check gh-sm"><input type="checkbox" id="prBypass"><span>Merge without waiting for requirements to be met (bypass rules)</span></label>` : ''}
        <div class="gh-merge-acc"><span class="gh-btn-grupo">${btn(textoBtn, { tipo: puede ? 'primary' : 'danger', attr: `id="prMerge"${puede ? '' : ' disabled'}` })}${btn('', { tipo: puede ? 'primary' : 'danger', caret: true, attr: 'data-menu="metodo"' })}</span>
        <div class="gh-menu gh-menu-arriba" data-menu-de="metodo" hidden>${metodos.map(([k, t]) => `<a href="#" data-metodo="${k}">${k === met ? oc('check') : '<i class="gh-ico-vacio"></i>'} <b>${t}</b><div class="gh-dim gh-sm">${DESC[k]}</div></a>`).join('')}</div>
        <span class="gh-dim gh-sm">You can also merge this with the command line: <code>gh pr merge ${pr.n} --${met}</code></span></div>
        <div class="gh-merge-conf" id="prConf" hidden><label class="gh-lbl">Commit message</label><input class="gh-input" id="prMsg" value="${esc(met === 'squash' ? `${pr.titulo} (#${pr.n})` : `Merge pull request #${pr.n} from ${x.owner}/${pr.rama}`)}"${met === 'rebase' ? ' disabled' : ''}><textarea class="gh-input" id="prDesc" rows="3"${met === 'rebase' ? ' disabled' : ''}>${esc(met === 'squash' ? commitsPR(r, pr).map((c) => '* ' + titulo(c.msg)).join('\n') : pr.titulo)}</textarea><div>${btn(met === 'rebase' ? 'Confirm rebase and merge' : met === 'squash' ? 'Confirm squash and merge' : 'Confirm merge', { tipo: 'primary', attr: 'id="prConfOk"' })}${btn('Cancel', { attr: 'id="prConfX"' })}</div></div></div>`;
    const icoGrande = puede ? 'gh-bg-verde' : e.conflictos.length || e.cambios.length ? 'gh-bg-gris' : 'gh-bg-gris';
    return `<div class="gh-merge"><span class="gh-merge-ico ${icoGrande}">${oc('git-merge')}</span><div class="gh-box gh-grow">${secciones.map(([c, i, t, d]) => `<div class="gh-merge-sec"><span class="gh-merge-sico gh-bg-${c}">${oc(i)}</span><div class="gh-grow"><b>${t}</b><div class="gh-dim gh-sm">${d}</div></div></div>`).join('')}${pie}</div></div>`;
  }
  function enlazarConversacion(x, pr) {
    const m = main(), r = x.r;
    enlazarMded(m, x); enlazarLateral(x, pr, 'pr');
    const comentar = () => { const t = $('#prC', m).value.trim(); if (t) { pr.comentarios.push({ autor: YO, texto: t, fecha: ahora() }); responderMencion(x, pr, t, 'pr'); } return !!t; };
    $('#prCom', m).addEventListener('click', () => { if (comentar()) { guardar(); render(); } });
    const cl = $('#prClose', m); if (cl) cl.addEventListener('click', () => { comentar(); pr.estado = 'cerrado'; pr.eventos.push({ tipo: 'cerrado', por: YO, fecha: ahora() }); guardar(); render(); });
    const ro = $('#prReopen', m); if (ro) ro.addEventListener('click', () => { pr.estado = 'abierto'; pr.eventos.push({ tipo: 'reabierto', por: YO, fecha: ahora() }); guardar(); render(); });
    enlazarMerge(x, pr);
    enlazarHilos(x, pr, m);
    // la caja de merge y los checks se actualizan solos mientras corre Actions
    vivo(() => { const b = $('#ghMergeBox', main()); if (!b || b.contains(document.activeElement)) return; const e = pr.estado === 'abierto' ? estadoPR(x, pr) : null; b.innerHTML = cajaMerge(x, pr, e, checksDe(r, r.branches[pr.rama])); _.enlazarMenus(b); enlazarMerge(x, pr); const s = $('.gh-side .gh-side-sec', main()); if (s && s.querySelector('.gh-rev-fila, .gh-dim')) { /* revisores */ } });
  }
  function enlazarMerge(x, pr) {
    const m = main(), r = x.r;
    const mg = $('#prMerge', m), conf = $('#prConf', m);
    $$('[data-metodo]', m).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); pr._metodo = a.dataset.metodo; render(); }));
    const bp = $('#prBypass', m);
    if (bp) bp.addEventListener('change', () => { mg.disabled = !bp.checked; mg.classList.toggle('gh-btn-danger', true); });
    if (mg) mg.addEventListener('click', () => { if (mg.disabled) return; conf.hidden = false; mg.closest('.gh-merge-acc').hidden = true; });
    const cx = $('#prConfX', m); if (cx) cx.addEventListener('click', () => { conf.hidden = true; mg.closest('.gh-merge-acc').hidden = false; });
    const ok = $('#prConfOk', m);
    if (ok) ok.addEventListener('click', () => {
      const met = pr._metodo && r.config.metodos[pr._metodo] ? pr._metodo : Object.keys(r.config.metodos).find((k) => r.config.metodos[k]);
      const res = fusionar(x, pr, met, { msg: $('#prMsg', m).value.trim(), desc: $('#prDesc', m).value, bypass: bp && bp.checked });
      if (res.error) { toast(res.error); return; }
      toast(`Pull request #${pr.n} merged`); render();
    });
    const del = $('#prDelRama', m); if (del) del.addEventListener('click', () => { if (reglaDe(r, pr.rama)) { toast('Cannot delete a protected branch'); return; } delete r.branches[pr.rama]; pr.eventos.push({ tipo: 'rama-borrada', por: YO, fecha: ahora() }); guardar(); render(); });
    const rest = $('#prRestRama', m); if (rest) rest.addEventListener('click', () => { r.branches[pr.rama] = pr.fusion.headSha; guardar(); render(); });
    const up = $('#prUpdate', m);
    if (up) up.addEventListener('click', () => {
      const e = estadoPR(x, pr); if (e.conflictos.length) { toast('Hay conflictos: resuélvelos primero'); return; }
      const h = API().nuevoHash();
      r.commits[h] = { msg: `Merge branch '${pr.base}' into ${pr.rama}`, parent: e.head, parent2: e.base, snap: e.fusion.snap, author: YO, date: ahora() };
      const antes = r.branches[pr.rama]; r.branches[pr.rama] = h;
      pr.eventos.push({ tipo: 'actualizada', por: YO, fecha: ahora() });
      guardar(); for (const f of _.alPushOyentes) f(x, pr.rama, antes, h, 'web');
      toast(`Merged ${pr.base} into ${pr.rama}. Haz git pull en tu rama local antes de seguir.`); render();
    });
    const rs = $('#prResolver', m); if (rs) rs.addEventListener('click', () => ir(repoUrl(x, 'pull', pr.n, 'conflicts')));
    const li = $('#prListo', m); if (li) li.addEventListener('click', () => { pr.borrador = false; pr.eventos.push({ tipo: 'listo', por: YO, fecha: ahora() }); guardar(); render(); });
    _.enlazarMenus(m);
  }
  function enlazarHilos(x, pr, m) {
    $$('[data-responder]', m).forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter' && i.value.trim()) { const p = pr.lineas.find((l) => String(l.id) === i.dataset.responder); pr.lineas.push({ id: Date.now() + Math.random(), padre: p.id, ruta: p.ruta, linea: p.linea, lado: p.lado, texto: i.value.trim(), autor: YO, fecha: ahora() }); guardar(); render(); } }));
    $$('[data-resolver]', m).forEach((b) => b.addEventListener('click', () => { const p = pr.lineas.find((l) => String(l.id) === b.dataset.resolver); p.resuelto = !p.resuelto; guardar(); render(); }));
  }
  function filesTab(x, pr, dif) {
    const pintar = (cs) => cs.map((c) => hiloHtml(x, pr, c)).join('');
    const vistos = pr._vistos || (pr._vistos = {});
    const pend = pr._pendiente || [];
    return `<div class="gh-files-tab"><div class="gh-files-bar"><span class="gh-dim gh-sm">${Object.keys(vistos).filter((k) => vistos[k]).length} / ${dif.length} files viewed</span><span class="gh-sp"></span>${pr.estado === 'abierto' ? `<span class="gh-rel">${btn(`Review changes${pend.length ? ` <span class="gh-counter">${pend.length}</span>` : ''}`, { tipo: 'primary', sm: true, caret: true, attr: 'data-menu="review"' })}
      <div class="gh-menu gh-menu-der gh-menu-review" data-menu-de="review" hidden><div class="gh-menu-t">Finish your review</div><div class="gh-menu-sec">${editorMd('rvT', '', 'Leave a comment')}
        <label class="gh-radio"><input type="radio" name="rvE" value="COMMENTED" checked><div><b>Comment</b><div class="gh-dim gh-sm">Submit general feedback without explicit approval.</div></div></label>
        <label class="gh-radio${pr.autor === YO ? ' gh-dis' : ''}"><input type="radio" name="rvE" value="APPROVED"${pr.autor === YO ? ' disabled' : ''}><div><b>Approve</b><div class="gh-dim gh-sm">${pr.autor === YO ? 'Pull request authors can’t approve their own pull request.' : 'Give your approval to merge these changes.'}</div></div></label>
        <label class="gh-radio${pr.autor === YO ? ' gh-dis' : ''}"><input type="radio" name="rvE" value="CHANGES_REQUESTED"${pr.autor === YO ? ' disabled' : ''}><div><b>Request changes</b><div class="gh-dim gh-sm">${pr.autor === YO ? 'Pull request authors can’t request changes on their own pull request.' : 'Submit feedback that must be addressed before merging.'}</div></div></label>
        <div class="gh-der">${btn('Submit review', { tipo: 'primary', attr: 'id="rvOk"' })}</div></div></div></span>` : ''}</div>
      ${dif.map((c) => archivoDiff(c, { comentable: pr.estado === 'abierto', comentarios: pr.lineas.filter((l) => !l.padre).concat(pend), pintarComentarios: pintar, visto: (k) => vistos[k], ver: (k2) => repoUrl(x, 'blob', pr.rama, k2.ruta) })).join('') || '<div class="gh-blank"><h3>No files changed</h3></div>'}
      ${pista('Pasa el mouse sobre una línea y usa <b>+</b> para comentarla. Como autor no puedes aprobar tu propio PR: pide la revisión a camila o martin en la pestaña Conversation.')}</div>`;
  }
  function enlazarFiles(x, pr, dif) {
    const m = main();
    enlazarDiffs(m, dif, { comentable: true }); enlazarMded(m, x); enlazarHilos(x, pr, m);
    $$('[data-visto]', m).forEach((c) => c.addEventListener('change', () => { (pr._vistos = pr._vistos || {})[c.dataset.visto] = c.checked; c.closest('.gh-fdiff').classList.toggle('plegado', c.checked); }));
    $$('[data-comentar]', m).forEach((b) => b.addEventListener('click', () => {
      const tr = b.closest('tr');
      if (tr.nextElementSibling && tr.nextElementSibling.classList.contains('gh-form-linea')) return;
      tr.insertAdjacentHTML('afterend', `<tr class="gh-form-linea"><td colspan="3"><div class="gh-box gh-box-p">${editorMd('lnT', '', 'Leave a comment')}<div class="gh-der">${btn('Cancel', { attr: 'data-ln-x' })}${btn('Add single comment', { attr: 'data-ln-uno' })}${btn('Start a review', { tipo: 'primary', attr: 'data-ln-rev' })}</div></div></td></tr>`);
      const f = tr.nextElementSibling; enlazarMded(f, x); f.querySelector('textarea').focus();
      const datos = () => ({ id: Date.now() + Math.random(), ruta: b.dataset.comentar, linea: Number(b.dataset.linea), lado: b.dataset.lado, texto: f.querySelector('textarea').value.trim(), autor: YO, fecha: ahora(), sha: x.r.branches[pr.rama], resuelto: false });
      f.querySelector('[data-ln-x]').addEventListener('click', () => f.remove());
      f.querySelector('[data-ln-uno]').addEventListener('click', () => { const d = datos(); if (!d.texto) return; pr.lineas.push(d); guardar(); render(); });
      f.querySelector('[data-ln-rev]').addEventListener('click', () => { const d = datos(); if (!d.texto) return; (pr._pendiente = pr._pendiente || []).push({ ...d, pendiente: true }); render(); });
    }));
    const ok = $('#rvOk', m);
    if (ok) ok.addEventListener('click', () => {
      const est = ($('[name=rvE]:checked', m) || {}).value || 'COMMENTED', t = $('#rvT', m).value.trim();
      const pend = pr._pendiente || [];
      if (!t && !pend.length && est === 'COMMENTED') { toast('Escribe un comentario o agrega comentarios de línea'); return; }
      const f = ahora();
      for (const l of pend) { delete l.pendiente; l.fecha = f; pr.lineas.push(l); }
      pr._pendiente = [];
      pr.revisiones.push({ autor: YO, estado: est, texto: t, fecha: f, sha: x.r.branches[pr.rama] });
      guardar(); toast('Review submitted'); ir(repoUrl(x, 'pull', pr.n));
    });
  }
  // editor de conflictos en la web (como "Resolve conflicts")
  function vistaConflictos(x, pr) {
    const r = x.r, e = estadoPR(x, pr);
    if (!e.conflictos.length) { ir(repoUrl(x, 'pull', pr.n)); return; }
    const archivos = { ...e.fusion.snap };
    let sel = e.conflictos[0];
    const resueltos = new Set();
    const cuerpo = `<div class="gh-conflictos"><div class="gh-code-bar"><h2 class="gh-h3">Resolving conflicts between <span class="gh-label-rama">${esc(pr.rama)}</span> and <span class="gh-label-rama">${esc(pr.base)}</span> and committing changes → <span class="gh-label-rama">${esc(pr.rama)}</span></h2><span class="gh-sp"></span>${btn('Commit merge', { tipo: 'primary', attr: 'id="cfOk" disabled' })}</div>
      <div class="gh-cf"><aside class="gh-cf-l"><div class="gh-dim gh-sm">${e.conflictos.length} conflicting file${e.conflictos.length > 1 ? 's' : ''}</div><div id="cfLista"></div></aside>
      <section class="gh-cf-ed"><div class="gh-box-h"><b id="cfNombre"></b><span class="gh-sp"></span><span class="gh-dim gh-sm" id="cfCuenta"></span>${btn('Mark as resolved', { sm: true, attr: 'id="cfRes" disabled' })}</div><textarea class="gh-editor gh-mono" id="cfTxt" spellcheck="false"></textarea></section></div>
      ${pista('Borra las líneas <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code>, <code>=======</code> y <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> y deja el código como debe quedar (a veces, una mezcla de los dos lados). <b>HEAD</b> es lo que hay en ' + esc(pr.base) + '; lo de abajo viene de tu rama.')}</div>`;
    marco(x, 'pulls', cuerpo, { ancho: true }); enlazarCabecera(x);
    const m = main(), ta = $('#cfTxt', m);
    const lista = () => { $('#cfLista', m).innerHTML = e.conflictos.map((k) => `<a href="#" data-cf="${esc(k)}" class="${k === sel ? 'sel' : ''}">${resueltos.has(k) ? `<span class="gh-verde">${oc('check')}</span>` : oc('file')} ${esc(k)}</a>`).join(''); $$('[data-cf]', m).forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); archivos[sel] = ta.value; sel = a.dataset.cf; abrir(); })); $('#cfOk', m).disabled = resueltos.size < e.conflictos.length; };
    const contar = () => { const n = (ta.value.match(/^<<<<<<< /gm) || []).length; $('#cfCuenta', m).textContent = n ? `${n} conflict${n > 1 ? 's' : ''}` : 'No conflicts'; $('#cfRes', m).disabled = API().tieneMarcas(ta.value); };
    const abrir = () => { $('#cfNombre', m).textContent = sel; ta.value = archivos[sel] || ''; contar(); lista(); };
    ta.addEventListener('input', () => { resueltos.delete(sel); contar(); lista(); });
    $('#cfRes', m).addEventListener('click', () => { archivos[sel] = ta.value; resueltos.add(sel); const sig = e.conflictos.find((k) => !resueltos.has(k)); if (sig) { sel = sig; abrir(); } else lista(); });
    $('#cfOk', m).addEventListener('click', () => {
      archivos[sel] = ta.value;
      const h = API().nuevoHash();
      r.commits[h] = { msg: `Merge branch '${pr.base}' into ${pr.rama}`, parent: e.head, parent2: e.base, snap: archivos, author: YO, date: ahora() };
      const antes = r.branches[pr.rama]; r.branches[pr.rama] = h;
      pr.eventos.push({ tipo: 'actualizada', por: YO, fecha: ahora() });
      guardar(); for (const f of _.alPushOyentes) f(x, pr.rama, antes, h, 'web');
      toast('Conflicts resolved. Antes de seguir en la terminal: git pull'); ir(repoUrl(x, 'pull', pr.n));
    });
    abrir();
  }

  // ------------------------------------------------------------------ Actions
  const PLANTILLAS = {
    python: { nombre: 'Python application', desc: 'Create and test a Python application.', archivo: 'python-app.yml', yml: `# This workflow will install Python dependencies, run tests and lint with a single version of Python
name: Python application

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

permissions:
  contents: read

jobs:
  build:

    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4
    - name: Set up Python 3.12
      uses: actions/setup-python@v5
      with:
        python-version: "3.12"
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install pytest
        if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
    - name: Test with pytest
      run: |
        pytest
` },
    simple: { nombre: 'Simple workflow', desc: 'Start with a file with the minimum necessary structure.', archivo: 'blank.yml', yml: `# This is a basic workflow to help you get started with Actions
name: CI

# Controls when the workflow will run
on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run a one-line script
        run: echo Hello, world!

      - name: Run a multi-line script
        run: |
          echo Add other actions to build,
          echo test, and deploy your project.
` },
    pages: { nombre: 'Static HTML', desc: 'Deploy static files in a repository without a build.', archivo: 'static.yml', yml: `# Simple workflow for deploying static content to GitHub Pages
name: Deploy static content to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
` },
    datos: { nombre: 'Data pipeline checks', desc: 'Lint, tests y una corrida de prueba del ETL en cada PR (plantilla del curso).', archivo: 'datos.yml', yml: `name: Data pipeline

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Ruff
        run: ruff check .

  test:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Tests
        run: pytest
      - name: Resumen
        if: always()
        run: echo "Rama \${{ github.ref_name }} · commit \${{ github.sha }}"
` },
  };
  function iconoRun(run) {
    if (run.estado !== 'completed') return `<span class="gh-ambar gh-girando">${oc(run.estado === 'queued' ? 'clock' : 'dot-fill')}</span>`;
    return run.conclusion === 'success' ? `<span class="gh-verde">${oc('check-circle-fill')}</span>` : run.conclusion === 'skipped' ? `<span class="gh-dim">${oc('skip')}</span>` : `<span class="gh-rojo">${oc('x-circle-fill')}</span>`;
  }
  function vistaActions(x, resto) {
    if (resto[0] === 'new') { vistaNuevoWorkflow(x); return; }
    if (resto[0] === 'runs' && resto[1]) { vistaRun(x, Number(resto[1]), resto[2] === 'job' ? Number(resto[3]) : null, resto[2] === 'workflow'); return; }
    const r = x.r;
    const snap = snapDe(r, r.branches[ramaDefecto(r)]);
    const wfs = window.GHActions ? window.GHActions.workflows(snap) : [];
    const nombres = [...new Map([...wfs.map((w) => [w.archivo, w.nombre]), ...r.runs.map((k) => [k.archivo, k.workflow])]).entries()];
    const filtro = q().get('wf');
    const runs = r.runs.filter((k) => !filtro || k.archivo === filtro);
    const wfSel = filtro ? wfs.find((w) => w.archivo === filtro) : null;
    const lista = () => runs.length ? runs.map((k) => `<div class="gh-run-fila">${iconoRun(k)}<div class="gh-grow"><a class="gh-b" href="${repoUrl(x, 'actions', 'runs', k.id)}">${esc(k.msg || k.workflow)}</a><div class="gh-dim gh-sm"><b>${esc(k.workflow)}</b> #${k.n}: ${k.evento === 'pull_request' ? `Pull request <a href="${repoUrl(x, 'pull', k.pr)}">#${k.pr}</a> synchronize by ${esc(k.actor)}` : k.evento === 'workflow_dispatch' ? `Manually run by ${esc(k.actor)}` : k.evento === 'dynamic' ? 'Deployment' : `Commit <a class="gh-mono" href="${repoUrl(x, 'commit', k.sha)}">${corto(k.sha)}</a> pushed by ${esc(k.actor)}`}</div></div><span class="gh-label-rama">${esc(k.rama)}</span><div class="gh-run-t gh-dim gh-sm">${oc('calendar') || oc('clock')} ${hace(k.creado)}<br>${oc('stopwatch') || oc('clock')} ${dur(k)}</div></div>`).join('')
      : `<div class="gh-blank">${oc('play', '', 24)}<h3>${wfs.length ? 'This workflow has no runs yet.' : 'Get started with GitHub Actions'}</h3><p class="gh-dim">${wfs.length ? 'Haz un push o ábrelo manualmente.' : 'Build, test, and deploy your code. Make code reviews, branch management, and issue triaging work the way you want.'}</p>${wfs.length ? '' : btn('Set up a workflow yourself', { href: repoUrl(x, 'actions', 'new') })}</div>`;
    const cuerpo = `<div class="gh-actions"><aside class="gh-act-l"><div class="gh-act-lt"><h2 class="gh-h3">Actions</h2>${btn('New workflow', { sm: true, href: repoUrl(x, 'actions', 'new') })}</div>
        <a href="${repoUrl(x, 'actions')}" class="${filtro ? '' : 'sel'}">All workflows</a>${nombres.map(([a, n]) => `<a href="${repoUrl(x, 'actions')}?wf=${encodeURIComponent(a)}" class="${filtro === a ? 'sel' : ''}">${esc(n)}</a>`).join('')}
        <div class="gh-act-sec">Management</div><a class="gh-dim">${oc('server')} Runners</a><a class="gh-dim">${oc('package')} Caches</a></aside>
      <section class="gh-act-m"><div class="gh-code-bar"><h2 class="gh-h2">${esc(wfSel ? wfSel.nombre : filtro ? (nombres.find(([a]) => a === filtro) || [])[1] || filtro : 'All workflows')}</h2><span class="gh-sp"></span>${wfSel && wfSel.on && wfSel.on.workflow_dispatch ? `<span class="gh-rel">${btn('Run workflow', { caret: true, attr: 'data-menu="dispatch"' })}<div class="gh-menu gh-menu-der" data-menu-de="dispatch" hidden><div class="gh-menu-sec"><label class="gh-lbl">Use workflow from</label><select class="gh-input gh-input-sm" id="dpRama">${Object.keys(r.branches).map((b) => `<option>${esc(b)}</option>`).join('')}</select>${btn('Run workflow', { tipo: 'primary', sm: true, attr: 'id="dpOk"' })}</div></div></span>` : ''}${wfSel ? btn('', { ico: 'kebab-horizontal', href: repoUrl(x, 'blob', ramaDefecto(r), wfSel.archivo) }) : ''}</div>
        ${wfSel ? `<p class="gh-dim gh-sm"><a href="${repoUrl(x, 'blob', ramaDefecto(r), wfSel.archivo)}">${esc(wfSel.archivo)}</a></p>` : ''}
        ${wfs.filter((w) => w.error).map((w) => `<div class="gh-flash gh-flash-error">${oc('alert')} <span><b>Invalid workflow file:</b> <code>${esc(w.error)}</code></span></div>`).join('')}
        <div class="gh-box"><div class="gh-box-h"><b>${runs.length} workflow run${runs.length === 1 ? '' : 's'}</b><span class="gh-sp"></span><span class="gh-dim gh-sm">Event ▾ Status ▾ Branch ▾ Actor ▾</span></div><div id="ghRuns">${lista()}</div></div>
        ${pista('Cada archivo de <code>.github/workflows/</code> es un workflow. Corre en un runner Linux con la misma bash de la terminal: <code>pytest</code>, <code>python</code> y <code>ruff</code> son de verdad. Un job que falla pone el PR en rojo; con una regla de protección (Settings → Branches) eso bloquea el merge.')}</section></div>`;
    marco(x, 'actions', cuerpo, { ancho: true }); enlazarCabecera(x);
    vivo(() => { const b = $('#ghRuns', main()); if (b) b.innerHTML = lista(); });
    const dp = $('#dpOk', main());
    if (dp) dp.addEventListener('click', () => {
      const rama = $('#dpRama', main()).value, sha = r.branches[rama];
      const wf = window.GHActions.workflows(snapDe(r, sha)).find((w) => w.archivo === wfSel.archivo);
      if (!wf || !wf.on.workflow_dispatch) { toast(`Workflow does not have 'workflow_dispatch' trigger on branch ${rama}`); return; }
      const run = window.GHActions.ejecutar(wf, { Sh: Sh(), repo: { owner: x.owner, repo: x.repo }, url: x.url, R: r, sha, rama, evento: 'workflow_dispatch', actor: YO, msg: wf.nombre, alCambiar: () => _.refrescarVivo(), alTerminar: (k) => alTerminarRun(x, k) });
      toast('Workflow run was successfully requested.'); ir(repoUrl(x, 'actions', 'runs', run.id));
    });
  }
  function vistaNuevoWorkflow(x) {
    const r = x.r, rama = ramaDefecto(r);
    const tarjeta = (k) => { const p = PLANTILLAS[k]; return `<div class="gh-box gh-plantilla"><div class="gh-box-b"><b>${esc(p.nombre)}</b><p class="gh-dim gh-sm">${esc(p.desc)}</p>${btn('Configure', { sm: true, href: repoUrl(x, 'new', rama, '.github/workflows') + `?archivo=${encodeURIComponent(p.archivo)}&contenido=${encodeURIComponent(p.yml)}` })}</div></div>`; };
    const cuerpo = `<div class="gh-nuevo-wf"><h1 class="gh-h2">Choose a workflow</h1><p class="gh-dim">Build, test, and deploy your code. Make code reviews, branch management, and issue triaging work the way you want. Select a workflow to get started. <a href="${repoUrl(x, 'new', rama, '.github/workflows')}?archivo=main.yml">Skip this and set up a workflow yourself →</a></p>
      <h3 class="gh-h4">Suggested for this repository</h3><div class="gh-plantillas">${tarjeta('python')}${tarjeta('datos')}${tarjeta('simple')}</div><h3 class="gh-h4">Pages</h3><div class="gh-plantillas">${tarjeta('pages')}</div>
      ${pista('<b>Configure</b> abre el editor con el YAML listo. Al hacer commit en main corre por primera vez. Prueba también romper un test y abrir un PR: verás el check en rojo.')}</div>`;
    marco(x, 'actions', cuerpo); enlazarCabecera(x);
  }
  function vistaRun(x, id, jobI, verArchivo) {
    const r = x.r, run = r.runs.find((k) => k.id === id);
    if (!run) { marco(x, 'actions', `<div class="gh-404"><h2>404</h2><p>No existe esa ejecución (se guardan las últimas 60).</p></div>`); enlazarCabecera(x); return; }
    const pintar = () => {
      const job = jobI !== null ? run.jobs[jobI] : null;
      const izq = `<aside class="gh-act-l"><a href="${repoUrl(x, 'actions', 'runs', run.id)}" class="${job || verArchivo ? '' : 'sel'}">${oc('home')} Summary</a><div class="gh-act-sec">Jobs</div>${run.jobs.map((j, i) => `<a href="${repoUrl(x, 'actions', 'runs', run.id, 'job', i)}" class="${jobI === i ? 'sel' : ''}">${iconoRun(j)} ${esc(j.nombre)}</a>`).join('') || '<span class="gh-dim gh-sm">—</span>'}
        <div class="gh-act-sec">Run details</div><a class="gh-dim">${oc('stopwatch') || oc('clock')} Usage</a><a href="${repoUrl(x, 'actions', 'runs', run.id, 'workflow')}" class="${verArchivo ? 'sel' : ''}">${oc('file')} Workflow file</a></aside>`;
      let der;
      if (verArchivo) { const t = snapDe(r, run.sha)[run.archivo] || '(workflow dinámico de GitHub)'; der = caja(`<b>${esc(run.archivo)}</b>`, `<table class="gh-blob">${t.replace(/\n$/, '').split('\n').map((l, i) => `<tr><td class="gh-num">${i + 1}</td><td class="gh-cod">${_.esc(l) || ' '}</td></tr>`).join('')}</table>`); }
      else if (job) der = `<div class="gh-job"><div class="gh-job-h"><div><h2 class="gh-h3">${esc(job.nombre)}</h2><div class="gh-dim gh-sm">${job.estado !== 'completed' ? 'started ' + hace(job.inicio) : `${job.conclusion === 'success' ? 'succeeded' : job.conclusion === 'skipped' ? 'skipped' : 'failed'} ${hace(job.fin)} in ${dur(job)}`}</div></div><span class="gh-sp"></span><input class="gh-input gh-input-sm gh-job-buscar" placeholder="Search logs"></div>
        ${job.pasos.map((p, i) => `<details class="gh-paso"${p.conclusion === 'failure' || (p.estado !== 'completed' && i === job.pasos.length - 1) ? ' open' : ''}><summary>${oc('chevron-right')}${p.estado !== 'completed' ? `<span class="gh-ambar gh-girando">${oc('dot-fill')}</span>` : p.conclusion === 'success' ? `<span class="gh-verde">${oc('check-circle-fill')}</span>` : p.conclusion === 'skipped' ? `<span class="gh-dim">${oc('skip')}</span>` : `<span class="gh-rojo">${oc('x-circle-fill')}</span>`}<span class="gh-grow">${esc(p.nombre)}</span><span class="gh-dim gh-sm">${p.ms < 1000 ? (p.estado === 'completed' ? '0s' : '') : Math.round(p.ms / 1000) + 's'}</span></summary>
          <div class="gh-log">${p.log.map((l, k) => { const t = String(l); const dim = /^\u0001t-dim\u0002/.test(t); const plano = t.replace(/\u0001[^\u0002]*\u0002|\u0003/g, ''); return `<div class="${/^Error/.test(plano) ? 'gh-log-err' : /^Warning/.test(plano) ? 'gh-log-warn' : dim ? 'gh-log-dim' : /^Run /.test(plano) ? 'gh-log-run' : ''}"><span class="gh-log-n">${k + 1}</span>${esc(plano)}</div>`; }).join('')}</div></details>`).join('')}</div>`;
      else {
        const anot = run.anotaciones || [];
        const grafo = `<div class="gh-grafo">${run.jobs.map((j, i) => `<a class="gh-grafo-j" href="${repoUrl(x, 'actions', 'runs', run.id, 'job', i)}">${iconoRun(j)} <span>${esc(j.nombre)}</span><span class="gh-dim gh-sm">${j.estado === 'completed' ? dur(j) : ''}</span></a>`).join(`<span class="gh-grafo-f">${oc('arrow-right')}</span>`)}</div>`;
        der = `<div class="gh-run-res"><div class="gh-box gh-run-meta"><div><div class="gh-dim gh-sm">Triggered via ${esc(run.evento === 'pull_request' ? 'pull request' : run.evento === 'dynamic' ? 'dynamic' : run.evento === 'workflow_dispatch' ? 'workflow_dispatch' : 'push')} ${hace(run.creado)}</div>${avatar(run.actor, 20)} <b>${esc(run.actor)}</b> ${run.evento === 'pull_request' ? `synchronize <a href="${repoUrl(x, 'pull', run.pr)}">#${run.pr}</a>` : 'pushed'} <a class="gh-mono" href="${repoUrl(x, 'commit', run.sha)}">${corto(run.sha)}</a> <span class="gh-label-rama">${esc(run.rama)}</span></div>
          <div><div class="gh-dim gh-sm">Status</div><b>${run.estado !== 'completed' ? (run.estado === 'queued' ? 'Queued' : 'In progress') : run.conclusion === 'success' ? 'Success' : run.conclusion === 'skipped' ? 'Skipped' : 'Failure'}</b></div><div><div class="gh-dim gh-sm">Total duration</div><b>${dur(run)}</b></div><div><div class="gh-dim gh-sm">Artifacts</div><b>${run.artefactos.length || '–'}</b></div></div>
          <div class="gh-box"><div class="gh-box-h"><b>${esc(run.archivo.replace(/^\.github\/workflows\//, ''))}</b><span class="gh-dim gh-sm gh-ml">on: ${esc(run.evento)}</span></div><div class="gh-box-b">${grafo || '<span class="gh-dim">Sin jobs</span>'}</div></div>
          ${anot.length ? caja(`<b>Annotations</b> <span class="gh-dim">${anot.length} error${anot.length > 1 ? 's' : ''}</span>`, anot.map((a) => `<div class="gh-anot">${oc('x-circle-fill', 'gh-rojo')}<div><b>${esc(a.job || run.workflow)}</b><div class="gh-mono gh-sm">${esc(String(a.texto).replace(/\u0001[^\u0002]*\u0002|\u0003/g, ''))}</div></div></div>`).join('')) : ''}
          ${run.artefactos.length ? caja('<b>Artifacts</b> <span class="gh-dim gh-sm">Produced during runtime</span>', `<table class="gh-tabla">${run.artefactos.map((a, i) => `<tr><td>${oc('package')} <a href="#" data-art="${i}">${esc(a.nombre)}</a></td><td class="gh-dim">${Object.keys(a.archivos).length} files</td></tr>`).join('')}</table>`) : ''}</div>`;
      }
      return `<div class="gh-run-cab"><a href="${repoUrl(x, 'actions')}" class="gh-dim">${oc('arrow-left')} ${esc(run.workflow)}</a><h1 class="gh-h2">${iconoRun(run)} ${esc(run.msg || run.workflow)} <span class="gh-dim">#${run.n}</span></h1><span class="gh-sp"></span>${run.estado === 'completed' ? btn('Re-run all jobs', { sm: true, attr: 'id="rrOk"' }) : ''}</div><div class="gh-actions">${izq}<section class="gh-act-m">${der}</section></div>`;
    };
    marco(x, 'actions', `<div id="ghRunV">${pintar()}</div>`, { ancho: true }); enlazarCabecera(x);
    const enlazar = () => {
      const m = main();
      const rr = $('#rrOk', m);
      if (rr) rr.addEventListener('click', () => {
        const wf = run.archivo.startsWith('dynamic/') ? null : window.GHActions.workflows(snapDe(r, run.sha)).find((w) => w.archivo === run.archivo);
        if (!wf) { if (run.archivo.startsWith('dynamic/')) { desplegarPagesRama(x); ir(repoUrl(x, 'actions')); } return; }
        const nuevo = window.GHActions.ejecutar(wf, { Sh: Sh(), repo: { owner: x.owner, repo: x.repo }, url: x.url, R: r, sha: run.sha, rama: run.rama, evento: run.evento, actor: YO, msg: run.msg, pr: run.pr, alCambiar: () => _.refrescarVivo(), alTerminar: (k) => alTerminarRun(x, k) });
        ir(repoUrl(x, 'actions', 'runs', nuevo.id));
      });
      $$('[data-art]', m).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const art = run.artefactos[Number(a.dataset.art)]; const blob = window.Generador.zip(Object.entries(art.archivos)); const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = art.nombre + '.zip'; l.click(); }));
      const bs = $('.gh-job-buscar', m);
      if (bs) bs.addEventListener('input', () => { const t = bs.value.toLowerCase(); $$('.gh-log > div', m).forEach((d) => d.classList.toggle('gh-log-hit', !!t && d.textContent.toLowerCase().includes(t))); if (t) $$('.gh-paso', m).forEach((d) => { if (d.textContent.toLowerCase().includes(t)) d.open = true; }); });
    };
    enlazar();
    vivo(() => {
      const b = $('#ghRunV', main()); if (!b) return;
      const abiertos = $$('.gh-paso', b).map((d) => d.open);
      b.innerHTML = pintar(); enlazar();
      $$('.gh-paso', b).forEach((d, i) => { if (abiertos[i] !== undefined && run.jobs[jobI] && run.jobs[jobI].pasos[i] && run.jobs[jobI].pasos[i].conclusion !== 'failure') d.open = abiertos[i]; });
    });
  }

  // ------------------------------------------------------------------ Settings
  function vistaSettings(x, resto) {
    const r = x.r, sec = resto[0] || 'general';
    const M = [['general', 'gear', 'General'], ['#Access'], ['access', 'people', 'Collaborators'], ['#Code and automation'], ['branches', 'git-branch', 'Branches'], ['actions', 'play', 'Actions'], ['pages', 'browser', 'Pages'], ['#Security'], ['secrets', 'key', 'Secrets and variables']];
    const menu = `<aside class="gh-set-l">${M.map(([id, ico, t]) => id.startsWith('#') ? `<div class="gh-act-sec">${id.slice(1)}</div>` : `<a href="${repoUrl(x, 'settings', id === 'general' ? '' : id)}" class="${sec === id || (sec === 'branch' && id === 'branches') || (sec === 'secret' && id === 'secrets') ? 'sel' : ''}">${oc(ico)} ${t}</a>`).join('')}</aside>`;
    let der = '';
    if (!esAdmin(x) && sec !== 'access') der = `<div class="gh-flash gh-flash-warn">${oc('lock')} En <b>${esc(x.owner)}</b> tienes permiso de escritura, no de administración. En una empresa, la configuración la maneja quien administra el repositorio. ${btn('Ver de todas formas', { sm: true, attr: 'id="setVer"' })}</div>`;
    const ver = !der || sessionStorage.getItem('gh-set-ver') === '1';
    if (ver) der = '';
    if (!ver) { /* solo el aviso */ }
    else if (sec === 'general') {
      der = `<h2 class="gh-h2">General</h2><div class="gh-set-b"><label class="gh-lbl">Repository name</label><div class="gh-copia"><input class="gh-input" value="${esc(x.repo)}" disabled>${btn('Rename', { dis: true })}</div><p class="gh-dim gh-sm">(práctica) renombrar cambiaría la URL del remoto de tus clones.</p>
        <label class="gh-lbl">Description</label><input class="gh-input" id="sgDesc" value="${esc(r.meta.desc || '')}"><label class="gh-lbl">Topics <span class="gh-dim">(separados por coma)</span></label><input class="gh-input" id="sgTemas" value="${esc((r.meta.temas || []).join(', '))}">${btn('Save', { sm: true, attr: 'id="sgGuardar"' })}
        <h3 class="gh-h3 gh-sep">Default branch</h3><p class="gh-dim gh-sm">The default branch is considered the “base” branch in your repository, against which all pull requests and code commits are automatically made.</p><select class="gh-input gh-input-auto" id="sgRama">${Object.keys(r.branches).map((b) => `<option${b === ramaDefecto(r) ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>
        <h3 class="gh-h3 gh-sep">Pull Requests</h3><p class="gh-dim gh-sm">When merging pull requests, you can allow any combination of merge commits, squashing, or rebasing. At least one option must be enabled.</p>
        ${[['merge', 'Allow merge commits', 'Add all commits from the head branch to the base branch with a merge commit.'], ['squash', 'Allow squash merging', 'Combine all commits from the head branch into a single commit in the base branch.'], ['rebase', 'Allow rebase merging', 'Add all commits from the head branch onto the base branch individually.']].map(([k, t, d]) => `<label class="gh-check"><input type="checkbox" data-metodo-set="${k}"${r.config.metodos[k] ? ' checked' : ''}><div><b>${t}</b><div class="gh-dim gh-sm">${d}</div></div></label>`).join('')}
        <label class="gh-check"><input type="checkbox" id="sgBorrar"${r.config.borrarRamas ? ' checked' : ''}><div><b>Automatically delete head branches</b><div class="gh-dim gh-sm">Deleted branches will still be able to be restored.</div></div></label>
        <h3 class="gh-h3 gh-sep gh-rojo">Danger Zone</h3><div class="gh-box gh-peligro"><div class="gh-peligro-f"><div><b>Change repository visibility</b><div class="gh-dim gh-sm">This repository is currently ${r.meta.privado ? 'private' : 'public'}.</div></div>${btn('Change visibility', { tipo: 'danger-o', sm: true, attr: 'id="sgVis"' })}</div><div class="gh-peligro-f"><div><b>Delete this repository</b><div class="gh-dim gh-sm">Once you delete a repository, there is no going back. Please be certain.</div></div>${btn('Delete this repository', { tipo: 'danger-o', sm: true, attr: 'id="sgDel"' })}</div></div></div>`;
    } else if (sec === 'access') {
      der = `<h2 class="gh-h2">Collaborators and teams</h2><div class="gh-box"><div class="gh-box-h"><b>Manage access</b><span class="gh-sp"></span>${btn('Add people', { tipo: 'primary', sm: true, attr: 'id="saAdd"' })}</div>${[x.owner === YO ? YO : null, ...(x.owner === YO ? r.config.colaboradores : ['alumno', 'camila', 'martin'])].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((u) => `<div class="gh-li">${avatar(u, 32)}<div class="gh-grow"><b>${u}</b><div class="gh-dim gh-sm">${GENTE[u] ? GENTE[u].nombre : ''}</div></div><span class="gh-dim">${u === x.owner || (x.owner !== YO && u === 'martin') ? 'Admin' : 'Write'}</span></div>`).join('')}</div>${pista('Para que camila o martin revisen tus PRs en un repositorio tuyo, agrégalos aquí.')}`;
    } else if (sec === 'branches' || sec === 'branch') {
      if (sec === 'branch') der = formRegla(x, resto[1] || '');
      else {
        const P = r.config.proteccion;
        der = `<h2 class="gh-h2">Branch protection rules</h2><div class="gh-box"><div class="gh-box-h"><b>Branch protection rules</b><span class="gh-sp"></span>${btn('Add classic branch protection rule', { sm: true, href: repoUrl(x, 'settings', 'branch') })}</div>${Object.keys(P).length ? Object.entries(P).map(([pat, p]) => `<div class="gh-li">${oc('shield-check')}<div class="gh-grow"><span class="gh-label-rama">${esc(pat)}</span><div class="gh-dim gh-sm">${[p.requierePR && `Require ${p.aprobaciones || 0} approval${p.aprobaciones === 1 ? '' : 's'}`, p.checks && p.checks.length && `${p.checks.length} required check${p.checks.length > 1 ? 's' : ''}`, p.estricta && 'up to date', p.incluirAdmins && 'no bypass'].filter(Boolean).join(' · ') || 'Sin reglas'}</div></div>${btn('Edit', { sm: true, href: repoUrl(x, 'settings', 'branch', pat) })}${btn('Delete', { sm: true, tipo: 'danger-o', attr: `data-borrar-regla="${esc(pat)}"` })}</div>`).join('') : `<div class="gh-box-b gh-dim">No branch protection rules defined yet. Define branch protection rules to disable force pushing, prevent branches from being deleted, and optionally require status checks before merging.</div>`}</div>
          ${pista('En los equipos de datos, <b>main</b> casi siempre está protegida: nadie hace push directo, todo entra por PR con una aprobación y los tests en verde. Pruébalo: protege main y haz <code>git push origin main</code> desde la terminal.')}`;
      }
    } else if (sec === 'actions') {
      der = `<h2 class="gh-h2">Actions permissions</h2><div class="gh-set-b"><label class="gh-radio"><input type="radio" checked><div><b>Allow all actions and reusable workflows</b><div class="gh-dim gh-sm">Any action or reusable workflow can be used.</div></div></label><label class="gh-radio"><input type="radio" disabled><div><b>Disable actions</b></div></label><h3 class="gh-h3 gh-sep">Workflow permissions</h3><p class="gh-dim gh-sm">Choose the default permissions granted to the GITHUB_TOKEN when running workflows in this repository.</p><label class="gh-radio"><input type="radio" checked><div><b>Read repository contents and packages permissions</b></div></label></div>`;
    } else if (sec === 'pages') {
      const pg = r.config.pages || {};
      der = `<h2 class="gh-h2">GitHub Pages</h2><p class="gh-dim">GitHub Pages is designed to host your personal, organization, or project pages from a GitHub repository.</p>
        ${pg.sitio ? `<div class="gh-flash gh-flash-ok">${oc('check-circle-fill')} <span>Your site is live at <a href="${repoUrl(x, 'sitio')}">https://${esc(x.owner)}.github.io/${esc(x.repo)}/</a><div class="gh-dim gh-sm">Last deployed ${hace(pg.desplegado)}</div></span><span class="gh-sp"></span>${btn('Visit site', { sm: true, ico: 'link', href: repoUrl(x, 'sitio') })}</div>` : ''}
        <div class="gh-set-b"><h3 class="gh-h3">Build and deployment</h3><label class="gh-lbl">Source</label><select class="gh-input gh-input-auto" id="spFuente"><option value="">None</option><option value="rama"${pg.fuente === 'rama' ? ' selected' : ''}>Deploy from a branch</option><option value="actions"${pg.fuente === 'actions' ? ' selected' : ''}>GitHub Actions</option></select>
        <div id="spRamaB"${pg.fuente === 'rama' ? '' : ' hidden'}><label class="gh-lbl">Branch</label><p class="gh-dim gh-sm">Your GitHub Pages site is currently being built from the ${esc(pg.carpeta === 'docs' ? '/docs' : '/ (root)')} folder in the ${esc(pg.rama || ramaDefecto(r))} branch.</p><div class="gh-copia"><select class="gh-input gh-input-auto" id="spRama">${Object.keys(r.branches).map((b) => `<option${b === (pg.rama || ramaDefecto(r)) ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select><select class="gh-input gh-input-auto" id="spCarpeta"><option value="root">/ (root)</option><option value="docs"${pg.carpeta === 'docs' ? ' selected' : ''}>/docs</option></select>${btn('Save', { attr: 'id="spOk"' })}</div></div>
        <div id="spActB"${pg.fuente === 'actions' ? '' : ' hidden'}><p class="gh-dim gh-sm">Use a suggested workflow, or <a href="${repoUrl(x, 'actions', 'new')}">browse all workflows</a>. El workflow tiene que usar <code>actions/upload-pages-artifact</code> y <code>actions/deploy-pages</code>.</p>${btn('Guardar fuente: GitHub Actions', { sm: true, attr: 'id="spActOk"' })}</div></div>
        ${pista('Pages publica archivos estáticos: un <code>index.html</code> (o un README.md que GitHub convierte en página). Ideal para la documentación del pipeline o un portafolio.')}`;
    } else if (sec === 'secrets' || sec === 'secret') {
      if (sec === 'secret') der = `<h2 class="gh-h2">Actions secrets / New secret</h2><div class="gh-set-b"><label class="gh-lbl">Name <span class="gh-rojo">*</span></label><input class="gh-input gh-mono" id="ssN" placeholder="YOUR_SECRET_NAME"><div class="gh-nota" id="ssNota"></div><label class="gh-lbl">Secret <span class="gh-rojo">*</span></label><textarea class="gh-input gh-mono" id="ssV" rows="4"></textarea>${btn('Add secret', { tipo: 'primary', attr: 'id="ssOk"' })}
        ${pista('Un secreto se usa en el workflow como <code>${{ secrets.NOMBRE }}</code> y en los logs aparece como <code>***</code>. <b>Nunca</b> pongas una clave real en esta práctica: inventa una.')}</div>`;
      else {
        const S = r.config.secretos, V = r.config.variables;
        der = `<h2 class="gh-h2">Actions secrets and variables</h2><p class="gh-dim">Secrets and variables allow you to manage reusable configuration data. Secrets are <b>encrypted</b> and are used for sensitive data. Variables are shown as plain text and are used for <b>non-sensitive</b> data.</p>
          <nav class="gh-subtabs"><a class="sel">Secrets</a><a href="#" id="svVarTab">Variables</a></nav>
          <div class="gh-box"><div class="gh-box-h"><b>Repository secrets</b><span class="gh-sp"></span>${btn('New repository secret', { tipo: 'primary', sm: true, href: repoUrl(x, 'settings', 'secret') })}</div>${Object.keys(S).length ? `<table class="gh-tabla">${Object.entries(S).map(([k, v]) => `<tr><td>${oc('lock')} <span class="gh-mono">${esc(k)}</span></td><td class="gh-dim gh-sm">Updated ${hace(v.fecha)}</td><td>${btn('', { ico: 'trash', sm: true, attr: `data-borrar-secreto="${esc(k)}"` })}</td></tr>`).join('')}</table>` : '<div class="gh-blank"><b>This repository has no secrets.</b></div>'}</div>
          <div class="gh-box"><div class="gh-box-h"><b>Repository variables</b><span class="gh-sp"></span>${btn('New repository variable', { sm: true, attr: 'id="svNueva"' })}</div>${Object.keys(V).length ? `<table class="gh-tabla">${Object.entries(V).map(([k, v]) => `<tr><td class="gh-mono">${esc(k)}</td><td class="gh-mono">${esc(v.valor)}</td><td>${btn('', { ico: 'trash', sm: true, attr: `data-borrar-var="${esc(k)}"` })}</td></tr>`).join('')}</table>` : '<div class="gh-blank"><b>This repository has no variables.</b> <span class="gh-dim">Se leen con <code>${{ vars.NOMBRE }}</code>.</span></div>'}</div>`;
      }
    }
    marco(x, 'settings', `<div class="gh-settings">${menu}<section class="gh-set-m">${der}</section></div>`, { ancho: true }); enlazarCabecera(x);
    const m = main();
    const sv = $('#setVer', m); if (sv) sv.addEventListener('click', () => { sessionStorage.setItem('gh-set-ver', '1'); render(); });
    const on = (id, ev, f) => { const el = $(id, m); if (el) el.addEventListener(ev, f); };
    on('#sgGuardar', 'click', () => { r.meta.desc = $('#sgDesc', m).value.trim(); r.meta.temas = $('#sgTemas', m).value.split(',').map((t) => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean); guardar(); toast('Repository settings saved'); });
    on('#sgRama', 'change', (e) => { r.meta.rama = e.target.value; guardar(); toast(`Default branch changed to ${e.target.value}`); });
    $$('[data-metodo-set]', m).forEach((c) => c.addEventListener('change', () => { r.config.metodos[c.dataset.metodoSet] = c.checked; if (!Object.values(r.config.metodos).some(Boolean)) { r.config.metodos[c.dataset.metodoSet] = true; c.checked = true; toast('At least one option must be enabled'); } guardar(); }));
    on('#sgBorrar', 'change', (e) => { r.config.borrarRamas = e.target.checked; guardar(); });
    on('#sgVis', 'click', () => { r.meta.privado = !r.meta.privado; guardar(); render(); });
    on('#sgDel', 'click', () => { const t = prompt(`To confirm, type "${x.owner}/${x.repo}" in the box below`); if (t !== `${x.owner}/${x.repo}`) { if (t !== null) toast('El nombre no coincide'); return; } delete API().remotos()[x.url]; guardar(); toast(`Your repository "${x.owner}/${x.repo}" was successfully deleted.`); ir(url()); });
    on('#saAdd', 'click', () => { const u = prompt('Search by username: camila o martin'); if (u && GENTE[u.trim()] && !r.config.colaboradores.includes(u.trim()) && u.trim() !== YO) { r.config.colaboradores.push(u.trim()); guardar(); render(); } else if (u) toast('(práctica) solo existen camila y martin'); });
    $$('[data-borrar-regla]', m).forEach((b) => b.addEventListener('click', () => { if (confirm('Delete this rule?')) { delete r.config.proteccion[b.dataset.borrarRegla]; guardar(); render(); } }));
    on('#spFuente', 'change', (e) => { $('#spRamaB', m).hidden = e.target.value !== 'rama'; $('#spActB', m).hidden = e.target.value !== 'actions'; if (!e.target.value) { r.config.pages = null; guardar(); render(); } });
    on('#spOk', 'click', () => { r.config.pages = { ...(r.config.pages || {}), fuente: 'rama', rama: $('#spRama', m).value, carpeta: $('#spCarpeta', m).value }; guardar(); desplegarPagesRama(x); toast('GitHub Pages source saved. Mira el despliegue en Actions.'); render(); });
    on('#spActOk', 'click', () => { r.config.pages = { ...(r.config.pages || {}), fuente: 'actions' }; guardar(); toast('Source: GitHub Actions'); render(); });
    on('#ssN', 'input', (e) => { const v = e.target.value; e.target.value = v.toUpperCase().replace(/\s/g, '_'); });
    on('#ssOk', 'click', () => {
      const n = $('#ssN', m).value.trim(), v = $('#ssV', m).value;
      const err = !n ? 'Name is required' : !/^[A-Z_][A-Z0-9_]*$/.test(n) ? 'Secret names can only contain alphanumeric characters ([a-z], [A-Z], [0-9]) or underscores (_). Spaces are not allowed. Must start with a letter ([a-z], [A-Z]) or underscores (_).' : /^GITHUB_/.test(n) ? 'Secret names must not start with GITHUB_.' : !v ? 'Secret value is required' : null;
      if (err) { $('#ssNota', m).innerHTML = `<span class="gh-rojo">${esc(err)}</span>`; return; }
      r.config.secretos[n] = { valor: v, fecha: ahora() }; guardar(); toast('Repository secret added.'); ir(repoUrl(x, 'settings', 'secrets'));
    });
    $$('[data-borrar-secreto]', m).forEach((b) => b.addEventListener('click', () => { if (confirm(`Remove secret ${b.dataset.borrarSecreto}?`)) { delete r.config.secretos[b.dataset.borrarSecreto]; guardar(); render(); } }));
    on('#svNueva', 'click', () => { const n = prompt('Name (MAYÚSCULAS_Y_GUIONES)'); if (!n) return; const v = prompt('Value'); if (v === null) return; r.config.variables[n.toUpperCase().replace(/\W/g, '_')] = { valor: v, fecha: ahora() }; guardar(); render(); });
    $$('[data-borrar-var]', m).forEach((b) => b.addEventListener('click', () => { delete r.config.variables[b.dataset.borrarVar]; guardar(); render(); }));
    on('#svVarTab', 'click', (e) => { e.preventDefault(); const v = $('#svNueva', m); if (v) v.scrollIntoView(); });
    enlazarRegla(x);
  }
  function formRegla(x, pat0) {
    const r = x.r, p = r.config.proteccion[pat0] || { requierePR: true, aprobaciones: 1, checks: [] };
    const nombresChecks = [...new Set(r.runs.flatMap((k) => k.jobs.map((j) => j.nombre)))];
    const chk = (id, on, t, d, extra = '') => `<label class="gh-check"><input type="checkbox" id="${id}"${on ? ' checked' : ''}><div><b>${t}</b><div class="gh-dim gh-sm">${d}</div>${extra}</div></label>`;
    return `<h2 class="gh-h2">Branch protection rule</h2><div class="gh-set-b" id="rgForm"><label class="gh-lbl">Branch name pattern <span class="gh-rojo">*</span></label><input class="gh-input" id="rgPat" value="${esc(pat0 || 'main')}"><input type="hidden" id="rgOrig" value="${esc(pat0)}">
      <h3 class="gh-h4 gh-sep">Protect matching branches</h3>
      ${chk('rgPR', p.requierePR, 'Require a pull request before merging', 'When enabled, all commits must be made to a non-protected branch and submitted via a pull request before they can be merged into a branch that matches this rule.',
        `<div class="gh-sub-op"><label class="gh-lbl gh-sm">Required number of approvals before merging:</label><select class="gh-input gh-input-auto gh-input-sm" id="rgN">${[0, 1, 2, 3].map((n) => `<option${n === (p.aprobaciones || 0) ? ' selected' : ''}>${n}</option>`).join('')}</select>
        ${chk('rgDesc', p.descartar, 'Dismiss stale pull request approvals when new commits are pushed', 'New reviewable commits pushed to a matching branch will dismiss pull request review approvals.')}</div>`)}
      ${chk('rgChecks', p.checks && p.checks.length, 'Require status checks to pass before merging', 'Choose which status checks must pass before branches can be merged into a branch that matches this rule.',
        `<div class="gh-sub-op">${chk('rgEstricta', p.estricta, 'Require branches to be up to date before merging', 'This ensures pull requests targeting a matching branch have been tested with the latest code.')}
        <label class="gh-lbl gh-sm">Status checks that are required</label><div class="gh-copia"><input class="gh-input gh-input-sm" id="rgCheckN" placeholder="Search for status checks in the last week for this repository" list="rgCheckL"><datalist id="rgCheckL">${nombresChecks.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>${btn('Add', { sm: true, attr: 'id="rgCheckAdd"' })}</div>
        <div id="rgCheckLista">${(p.checks || []).map((n) => `<div class="gh-chip">${oc('check-circle')} ${esc(n)} <button class="gh-ib" data-quitar-check="${esc(n)}">${oc('x')}</button></div>`).join('')}</div>${nombresChecks.length ? '' : '<div class="gh-dim gh-sm">Todavía no corrió ningún workflow: el nombre del check es el nombre del job (por ejemplo <code>test</code> o <code>build</code>).</div>'}</div>`)}
      ${chk('rgConv', p.conversaciones, 'Require conversation resolution before merging', 'When enabled, all conversations on code must be resolved before a pull request can be merged into a branch that matches this rule.')}
      ${chk('rgAdmins', p.incluirAdmins, 'Do not allow bypassing the above settings', 'The above settings will apply to administrators and custom roles with the "bypass branch protections" permission.')}
      <h3 class="gh-h4 gh-sep">Rules applied to everyone including administrators</h3>
      ${chk('rgForce', p.force, 'Allow force pushes', 'Permit force pushes for all users with push access.')}
      ${chk('rgBorrar', p.borrar, 'Allow deletions', 'Allow users with push access to delete matching branches.')}
      <div>${btn(pat0 ? 'Save changes' : 'Create', { tipo: 'primary', attr: 'id="rgOk"' })}</div></div>`;
  }
  function enlazarRegla(x) {
    const m = main(), f = $('#rgForm', m); if (!f) return;
    const r = x.r;
    let checks = [...((r.config.proteccion[$('#rgOrig', m).value] || {}).checks || [])];
    const pintar = () => { $('#rgCheckLista', m).innerHTML = checks.map((n) => `<div class="gh-chip">${oc('check-circle')} ${esc(n)} <button class="gh-ib" data-quitar-check="${esc(n)}">${oc('x')}</button></div>`).join(''); $$('[data-quitar-check]', m).forEach((b) => b.addEventListener('click', () => { checks = checks.filter((c) => c !== b.dataset.quitarCheck); pintar(); })); };
    pintar();
    $('#rgCheckAdd', m).addEventListener('click', () => { const n = $('#rgCheckN', m).value.trim(); if (n && !checks.includes(n)) { checks.push(n); $('#rgChecks', m).checked = true; } $('#rgCheckN', m).value = ''; pintar(); });
    $('#rgOk', m).addEventListener('click', () => {
      const pat = $('#rgPat', m).value.trim(); if (!pat) { toast('Branch name pattern is required'); return; }
      const orig = $('#rgOrig', m).value; if (orig && orig !== pat) delete r.config.proteccion[orig];
      r.config.proteccion[pat] = { requierePR: $('#rgPR', m).checked, aprobaciones: Number($('#rgN', m).value), descartar: $('#rgDesc', m).checked, checks: $('#rgChecks', m).checked ? checks : [], estricta: $('#rgEstricta', m).checked, conversaciones: $('#rgConv', m).checked, incluirAdmins: $('#rgAdmins', m).checked, force: $('#rgForce', m).checked, borrar: $('#rgBorrar', m).checked };
      guardar(); toast('Branch protection rule saved'); ir(repoUrl(x, 'settings', 'branches'));
    });
  }

  // ------------------------------------------------------------------ Security, Insights y Pages
  const PATRONES_SECRETOS = [
    [/AKIA[0-9A-Z]{16}/, 'Amazon AWS Access Key ID'], [/ghp_[A-Za-z0-9]{36}/, 'GitHub Personal Access Token'], [/github_pat_[A-Za-z0-9_]{40,}/, 'GitHub Fine-grained Token'],
    [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack Token'], [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'Private Key'], [/AccountKey=[A-Za-z0-9+/=]{40,}/, 'Azure Storage Account Access Key'],
    [/dapi[0-9a-f]{32}/, 'Databricks Personal Access Token'], [/sk-[A-Za-z0-9]{32,}/, 'API key (OpenAI-style)'], [/(password|passwd|pwd)\s*[:=]\s*["'][^"'\s]{6,}["']/i, 'Generic password (posible)'],
  ];
  function vistaSecurity(x) {
    const r = x.r, alertas = [];
    for (const b of Object.keys(r.branches)) for (const [k, v] of Object.entries(snapDe(r, r.branches[b]))) v.split('\n').forEach((l, i) => { for (const [re, t] of PATRONES_SECRETOS) if (re.test(l)) alertas.push({ rama: b, ruta: k, linea: i + 1, tipo: t, texto: l.trim().slice(0, 120) }); });
    const unicas = alertas.filter((a, i) => alertas.findIndex((y) => y.ruta === a.ruta && y.linea === a.linea && y.tipo === a.tipo) === i);
    const cuerpo = `<div class="gh-settings"><aside class="gh-set-l"><a class="sel">${oc('shield')} Overview</a><div class="gh-act-sec">Vulnerability alerts</div><a class="gh-dim">${oc('codescan') || oc('shield')} Code scanning</a><a class="sel2">${oc('key')} Secret scanning ${unicas.length ? contador(unicas.length) : ''}</a></aside>
      <section class="gh-set-m"><h2 class="gh-h2">Secret scanning alerts</h2>${unicas.length ? caja(`<b>${unicas.length} open</b>`, unicas.map((a) => `<div class="gh-li">${oc('key', 'gh-rojo')}<div class="gh-grow"><b>${esc(a.tipo)}</b><div class="gh-dim gh-sm"><a href="${repoUrl(x, 'blob', a.rama, a.ruta)}#L${a.linea}">${esc(a.ruta)}:${a.linea}</a> en <span class="gh-label-rama">${esc(a.rama)}</span></div><code class="gh-sm">${esc(a.texto.replace(/(["'=:]\s*["']?)([^"'\s]{4})[^"'\s]+/, '$1$2••••••'))}</code></div></div>`).join('')) : `<div class="gh-blank">${oc('shield-check', '', 32)}<h3>No secrets found</h3><p class="gh-dim">GitHub revisa los commits buscando claves conocidas (AWS, Azure, GitHub, Databricks…).</p></div>`}
      ${pista('Si una clave llegó a un commit, <b>borrarla en un commit nuevo no alcanza</b>: sigue en la historia. Lo correcto es <b>rotarla</b> (crear otra e invalidar la vieja) y usar secretos o variables de entorno. Activa también <b>push protection</b> en tu cuenta real.')}</section></div>`;
    marco(x, 'security', cuerpo, { ancho: true }); enlazarCabecera(x);
  }
  function vistaInsights(x) {
    const r = x.r, tip = r.branches[ramaDefecto(r)];
    const hs = tip ? historia(r, tip) : [];
    const porAutor = {};
    for (const c of hs) porAutor[c.author] = (porAutor[c.author] || 0) + 1;
    const max = Math.max(1, ...Object.values(porAutor));
    const semana = Date.now() - 7 * 864e5;
    const prsF = r.prs.filter((p) => p.fusion && new Date(p.fusion.fecha) > semana).length, prsA = r.prs.filter((p) => p.estado === 'abierto').length;
    const isC = r.issues.filter((i) => i.estado === 'cerrado').length, isA = r.issues.filter((i) => i.estado === 'abierto').length;
    const cuerpo = `<div class="gh-settings"><aside class="gh-set-l"><a class="sel">${oc('pulse')} Pulse</a><a class="gh-dim">${oc('people')} Contributors</a></aside><section class="gh-set-m"><h2 class="gh-h2">Pulse</h2>
      <div class="gh-pulso"><div><b class="gh-morado">${prsF}</b> Merged pull requests</div><div><b class="gh-verde">${prsA}</b> Open pull requests</div><div><b class="gh-morado">${isC}</b> Closed issues</div><div><b class="gh-verde">${isA}</b> Open issues</div></div>
      <h3 class="gh-h3 gh-sep">Contributors</h3>${caja('', Object.entries(porAutor).sort((a, b) => b[1] - a[1]).map(([u, n]) => `<div class="gh-li">${avatar(u, 32)}<div class="gh-grow"><b>${u}</b><div class="gh-barra-h"><i style="width:${(n / max) * 100}%"></i></div></div><span class="gh-dim">${n} commit${n > 1 ? 's' : ''}</span></div>`).join('') || '<div class="gh-box-b gh-dim">Sin commits todavía</div>')}</section></div>`;
    marco(x, 'pulse', cuerpo, { ancho: true }); enlazarCabecera(x);
  }
  function vistaSitio(x, resto) {
    const pg = x.r.config.pages;
    if (!pg || !pg.sitio) { marco(x, 'settings', `<div class="gh-404"><h2>404</h2><p><b>There isn’t a GitHub Pages site here.</b></p><p>Actívalo en <a href="${repoUrl(x, 'settings', 'pages')}">Settings → Pages</a>.</p></div>`); enlazarCabecera(x); return; }
    const S = pg.sitio, p = resto.join('/') || 'index.html';
    let html = S[p] !== undefined ? S[p] : S[p + '/index.html'];
    if (html === undefined && p === 'index.html') { const mdK = S['index.md'] !== undefined ? 'index.md' : S['README.md'] !== undefined ? 'README.md' : null; if (mdK) html = `<!doctype html><meta charset="utf-8"><title>${esc(x.repo)}</title><style>body{font:16px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:860px;margin:40px auto;padding:0 20px;color:#24292f}pre{background:#f6f8fa;padding:12px;overflow:auto}code{background:#f6f8fa;padding:2px 4px}</style>${md(S[mdK]).replace(/^<div class="gh-md">|<\/div>$/g, '')}`; }
    if (html === undefined) html = `<!doctype html><h1>404</h1><p>File not found</p>`;
    if (/\.md$/.test(p) && S[p] !== undefined) html = `<!doctype html><meta charset="utf-8">${md(S[p])}`;
    // los .css y .js del sitio van incrustados (el iframe no puede pedirlos a un servidor)
    html = html.replace(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi, (m, h) => (S[h.replace(/^\.?\//, '')] !== undefined ? `<style>${S[h.replace(/^\.?\//, '')]}</style>` : m))
      .replace(/<script([^>]*)src=["']([^"']+\.js)["']([^>]*)><\/script>/gi, (m, a, h, b) => (S[h.replace(/^\.?\//, '')] !== undefined ? `<script${a}${b}>${S[h.replace(/^\.?\//, '')].replace(/<\/script/gi, '<\\/script')}</script>` : m));
    const cuerpo = `<div class="gh-sitio"><div class="gh-sitio-bar"><span class="gh-sitio-dots"><i></i><i></i><i></i></span><span class="gh-sitio-url">${oc('lock')} https://${esc(x.owner)}.github.io/${esc(x.repo)}/${esc(resto.join('/'))}</span>${btn('Volver al repositorio', { sm: true, href: repoUrl(x, 'settings', 'pages') })}</div><iframe class="gh-sitio-f" sandbox="allow-scripts" id="ghSitioF"></iframe></div>`;
    marco(x, 'settings', cuerpo, { ancho: true }); enlazarCabecera(x);
    $('#ghSitioF', main()).srcdoc = html;
  }
  // issues y PRs de todos los repositorios (los botones de la barra superior)
  function vistaMias(tipo) {
    const rs = _.listaRepos();
    const filas = [];
    for (const x of rs) {
      const lista = tipo === 'pulls' ? x.r.prs : tipo === 'issues' ? x.r.issues : [];
      for (const o of lista) if (o.autor === YO || (o.asignados || []).includes(YO) || (o.revisores || []).includes(YO)) filas.push({ x, o });
    }
    const notifs = [];
    if (tipo === 'notifications') for (const x of rs) for (const pr of x.r.prs) for (const rv of pr.revisiones || []) if (rv.autor !== YO) notifs.push({ f: rv.fecha, html: `${iconoPR(pr)} <a href="${repoUrl(x, 'pull', pr.n)}"><b>${esc(pr.titulo)}</b></a> <span class="gh-dim">${esc(x.owner)}/${esc(x.repo)} #${pr.n} · ${rv.autor} ${rv.estado === 'APPROVED' ? 'approved' : rv.estado === 'CHANGES_REQUESTED' ? 'requested changes' : 'commented'}</span>` });
    notifs.sort((a, b) => String(b.f).localeCompare(String(a.f)));
    const cuerpo = tipo === 'notifications' ? `<h1 class="gh-h2">Inbox</h1>${caja('', notifs.map((n) => `<div class="gh-li">${n.html}<span class="gh-sp"></span><span class="gh-dim gh-sm">${hace(n.f)}</span></div>`).join('') || `<div class="gh-blank">${oc('inbox', '', 32)}<h3>All caught up!</h3><p class="gh-dim">Take a break, write some code, do what you do best.</p></div>`)}`
      : `<h1 class="gh-h2">${tipo === 'pulls' ? 'Pull requests' : 'Issues'}</h1>${caja('', filas.sort((a, b) => String(b.o.fecha).localeCompare(String(a.o.fecha))).map(({ x, o }) => `<div class="gh-li">${tipo === 'pulls' ? iconoPR(o) : iconoIssue(o)}<div class="gh-grow"><span class="gh-dim">${esc(x.owner)}/${esc(x.repo)}</span> <a class="gh-li-t" href="${repoUrl(x, tipo === 'pulls' ? 'pull' : 'issues', o.n)}">${esc(o.titulo)}</a><div class="gh-dim gh-sm">#${o.n} opened ${hace(o.fecha)} by ${esc(o.autor)}</div></div></div>`).join('') || '<div class="gh-blank"><h3>No results matched your search.</h3></div>')}`;
    marco(null, '', `<div class="gh-mias">${cuerpo}</div>`);
  }

  window.GitHubColab = {
    vistaMias, fusionar, estadoPR, reglaDe, alCrearPR, disparar,
    rutas: {
      issues: vistaIssues, pulls: (x) => vistaPulls(x), pull: vistaPR, compare: vistaCompare, actions: vistaActions,
      settings: vistaSettings, security: vistaSecurity, pulse: vistaInsights, sitio: vistaSitio,
    },
  };
  // la terminal (gh pr create / gh pr merge / git push) usa estas funciones si la réplica está cargada
  function conectar() {
    const A = API(); if (!A) return;
    A.reglaDe = reglaDe;
    A.alCrearPR = (u, pr) => { const p = _.partesUrl(u); const x = p && _.buscarRepo(p.owner, p.repo); if (x) { alCrearPR(x, pr); guardar(); } };
    A.fusionarPR = (u, pr, metodo) => { const p = _.partesUrl(u); const x = p && _.buscarRepo(p.owner, p.repo); if (!x) return null; preparar(x, pr); return fusionar(x, pr, metodo); };
    A.estadoPR = (u, pr) => { const p = _.partesUrl(u); const x = p && _.buscarRepo(p.owner, p.repo); if (!x) return null; preparar(x, pr); return estadoPR(x, pr); };
  }
  conectar();
  if (!API()) document.addEventListener('DOMContentLoaded', conectar);
})();
