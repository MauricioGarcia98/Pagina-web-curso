/*
 * GitHub de práctica: una réplica de github.com que lee y escribe los MISMOS repositorios remotos
 * que la terminal del curso (Machine.git.__remotos). Lo que subes con `git push` aparece acá, y lo que
 * fusionas acá lo bajas con `git pull`.
 *
 * Este archivo: marco (barra superior, cabecera del repositorio, terminal integrada), utilidades
 * (tiempos, diffs, markdown, avatares), el panel principal, crear repositorios, la pestaña Code
 * (árbol, archivos, blame, historial, editar en el navegador), commits y ramas.
 * github-colab.js agrega Issues, Pull requests, Actions, Settings, Insights y Pages.
 * Íconos: Octicons (MIT). No usa logos ni imágenes de GitHub: los avatares son iniciales.
 */
(function () {
  'use strict';
  const oc = (n, c, t) => (window.Octicon ? window.Octicon(n, c, t) : '');
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const YO = 'alumno';
  const GENTE = {
    alumno: { nombre: 'Alumno', color: '#0969da' },
    camila: { nombre: 'Camila Rojas', color: '#bf3989' },
    martin: { nombre: 'Martín Paz', color: '#1a7f37' },
    'tienda-andina': { nombre: 'Tienda Andina', color: '#9a6700', org: true },
    'github-actions': { nombre: 'github-actions', color: '#24292f', bot: true },
  };
  const ETIQUETAS = {
    bug: ['#d73a4a', "Something isn't working"], documentation: ['#0075ca', 'Improvements or additions to documentation'], duplicate: ['#cfd3d7', 'This issue or pull request already exists'],
    enhancement: ['#a2eeef', 'New feature or request'], 'good first issue': ['#7057ff', 'Good for newcomers'], 'help wanted': ['#008672', 'Extra attention is needed'],
    invalid: ['#e4e669', "This doesn't seem right"], question: ['#d876e3', 'Further information is requested'], wontfix: ['#ffffff', 'This will not be worked on'],
  };
  let main = null, ctxApp = {}, ruta = [], query = new URLSearchParams(), termAbierta = false, termObj = null, vivos = [], tVivo = null;
  const Sh = () => window.Shell;
  const API = () => (window.Shell && window.Shell.github) || null;
  const toast = (m) => (ctxApp.toast ? ctxApp.toast(m) : console.log(m));
  const guardar = () => { try { Sh().Machine.save(); } catch (e) { toast('No se pudo guardar: el almacenamiento del navegador está lleno'); } };
  const ahora = () => new Date().toISOString();

  // ------------------------------------------------------------------ rutas
  const seg = (x) => String(x).split('/').map(encodeURIComponent).join('/');
  const url = (...p) => '#/github' + (p.length ? '/' + p.filter((x) => x !== undefined && x !== null && x !== '').map(seg).join('/') : '');
  const repoUrl = (x, ...p) => url(x.owner, x.repo, ...p);
  function ir(h) { if (location.hash === h) render(); else location.hash = h; }

  // ------------------------------------------------------------------ datos
  const partesUrl = (u) => { const m = /github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(String(u)); return m ? { owner: m[1], repo: m[2] } : null; };
  function listaRepos() {
    const A = API(); if (!A) return [];
    return Object.entries(A.remotos()).map(([u, r]) => { const p = partesUrl(u); return p ? preparar({ url: u, r, ...p }) : null; }).filter(Boolean);
  }
  function buscarRepo(o, n) { return listaRepos().find((x) => x.owner.toLowerCase() === String(o).toLowerCase() && x.repo.toLowerCase() === String(n).toLowerCase()) || null; }
  function preparar(x) {
    const r = x.r;
    r.issues = r.issues || []; r.prs = r.prs || []; r.runs = r.runs || [];
    r.config = r.config || {};
    const c = r.config;
    c.proteccion = c.proteccion || {}; c.secretos = c.secretos || {}; c.variables = c.variables || {};
    c.colaboradores = c.colaboradores || (x.owner === YO ? [] : ['camila', 'martin']);
    c.metodos = c.metodos || { merge: true, squash: true, rebase: true };
    if (!r.meta) {
      const fechas = Object.values(r.commits || {}).map((k) => k.date).filter(Boolean).sort();
      r.meta = { desc: r.semilla ? 'Pipelines de datos de Tienda Andina: ingesta, limpieza y carga de ventas.' : '', privado: false, creado: fechas[0] || ahora(), estrellas: 0, temas: r.semilla ? ['data-engineering', 'etl', 'python'] : [] };
    }
    for (const pr of r.prs) { pr.comentarios = pr.comentarios || []; pr.revisiones = pr.revisiones || []; pr.lineas = pr.lineas || []; pr.revisores = pr.revisores || []; pr.eventos = pr.eventos || []; pr.etiquetas = pr.etiquetas || []; pr.asignados = pr.asignados || []; }
    for (const is of r.issues) { is.comentarios = is.comentarios || []; is.etiquetas = is.etiquetas || []; is.asignados = is.asignados || []; is.eventos = is.eventos || []; }
    return x;
  }
  const ramaDefecto = (r) => (r.meta && r.meta.rama && r.branches[r.meta.rama] ? r.meta.rama : r.branches.main ? 'main' : r.branches.master ? 'master' : Object.keys(r.branches)[0] || 'main');
  const snapDe = (r, sha) => ((r.commits[sha] || {}).snap) || {};
  const corto = (h) => String(h || '').slice(0, 7);
  const titulo = (msg) => String(msg || '').split('\n')[0];
  const cuerpoMsg = (msg) => String(msg || '').split('\n').slice(1).join('\n').trim();
  function padres(c) { return [c.parent, c.parent2].filter(Boolean); }
  function ancestros(r, tip) { const v = new Set(), pila = [tip]; while (pila.length) { const h = pila.pop(); if (!h || v.has(h) || !r.commits[h]) continue; v.add(h); pila.push(...padres(r.commits[h])); } return v; }
  function historia(r, tip, rutaF) {
    const hs = [...ancestros(r, tip)].map((sha) => ({ sha, ...r.commits[sha] }));
    hs.sort((a, b) => String(b.date).localeCompare(String(a.date)) || (ancestros(r, b.sha).has(a.sha) ? 1 : -1));
    return rutaF === undefined ? hs : hs.filter((c) => cambioEn(r, c, rutaF));
  }
  function contenido(snap, p) {
    if (!p) return Object.keys(snap).sort().map((k) => k + '\u0000' + snap[k]).join('\u0001');
    if (snap[p] !== undefined) return snap[p];
    const pre = p + '/'; const ks = Object.keys(snap).filter((k) => k.startsWith(pre)).sort();
    return ks.length ? ks.map((k) => k + '\u0000' + snap[k]).join('\u0001') : null;
  }
  // ¿este commit introdujo un cambio en la ruta? (en una fusión, solo si difiere de todos sus padres)
  function cambioEn(r, c, p) {
    const yo = contenido(c.snap || {}, p);
    const ps = padres(c).map((h) => contenido(snapDe(r, h), p));
    if (!ps.length) return yo !== null;
    return ps.every((x) => x !== yo);
  }
  function ultimoCambio(r, tip, p) { for (const c of historia(r, tip)) if (cambioEn(r, c, p)) return c; return null; }
  function entradas(snap, dir) {
    const pre = dir ? dir + '/' : '';
    const m = new Map();
    for (const k of Object.keys(snap)) {
      if (!k.startsWith(pre)) continue;
      const resto = k.slice(pre.length), i = resto.indexOf('/');
      if (i < 0) m.set(resto, { nombre: resto, tipo: 'file', ruta: k });
      else if (!m.has(resto.slice(0, i))) m.set(resto.slice(0, i), { nombre: resto.slice(0, i), tipo: 'dir', ruta: pre + resto.slice(0, i) });
    }
    return [...m.values()].sort((a, b) => (a.tipo === b.tipo ? a.nombre.localeCompare(b.nombre, 'en', { sensitivity: 'base' }) : a.tipo === 'dir' ? -1 : 1));
  }
  const esDir = (snap, p) => !p || Object.keys(snap).some((k) => k.startsWith(p + '/'));
  // separa "feature/x/src/a.py" en rama + ruta probando las ramas que existen (como GitHub)
  function ramaYRuta(r, partes) {
    const ramas = Object.keys(r.branches).sort((a, b) => b.length - a.length);
    const j = partes.join('/');
    for (const b of ramas) if (j === b || j.startsWith(b + '/')) return { rama: b, ruta: j.slice(b.length + 1) };
    if (/^[0-9a-f]{7,40}$/.test(partes[0] || '')) { const sha = Object.keys(r.commits).find((h) => h.startsWith(partes[0])); if (sha) return { rama: sha, ruta: partes.slice(1).join('/'), sha }; }
    return { rama: partes[0] || ramaDefecto(r), ruta: partes.slice(1).join('/'), noExiste: true };
  }
  const tipDe = (r, rama) => r.branches[rama] || (r.commits[rama] ? rama : null);
  function siguienteNumero(r) { return Math.max(0, ...r.prs.map((p) => p.n), ...r.issues.map((i) => i.n)) + 1; }

  // ------------------------------------------------------------------ diffs
  function diffLineas(a, b) {
    const A = a === null || a === undefined ? [] : String(a).replace(/\n$/, '').split('\n');
    const B = b === null || b === undefined ? [] : String(b).replace(/\n$/, '').split('\n');
    if (a === '' ) A.length = 0; if (b === '') B.length = 0;
    const n = A.length, m = B.length;
    // recorta lo igual al principio y al final (los archivos grandes casi siempre cambian poco)
    let ini = 0; while (ini < n && ini < m && A[ini] === B[ini]) ini++;
    let fa = n, fb = m; while (fa > ini && fb > ini && A[fa - 1] === B[fb - 1]) { fa--; fb--; }
    const ops = [];
    for (let k = 0; k < ini; k++) ops.push({ t: ' ', a: k, b: k, x: A[k] });
    const a2 = A.slice(ini, fa), b2 = B.slice(ini, fb);
    if (a2.length * b2.length > 4e6) { a2.forEach((x, k) => ops.push({ t: '-', a: ini + k, b: null, x })); b2.forEach((x, k) => ops.push({ t: '+', a: null, b: ini + k, x })); }
    else {
      const L = Array.from({ length: a2.length + 1 }, () => new Uint16Array(b2.length + 1));
      for (let i = a2.length - 1; i >= 0; i--) for (let j = b2.length - 1; j >= 0; j--) L[i][j] = a2[i] === b2[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
      let i = 0, j = 0;
      while (i < a2.length || j < b2.length) {
        if (i < a2.length && j < b2.length && a2[i] === b2[j]) { ops.push({ t: ' ', a: ini + i, b: ini + j, x: a2[i] }); i++; j++; }
        else if (j < b2.length && (i >= a2.length || L[i][j + 1] >= L[i + 1][j])) { ops.push({ t: '+', a: null, b: ini + j, x: b2[j] }); j++; }
        else { ops.push({ t: '-', a: ini + i, b: null, x: a2[i] }); i++; }
      }
    }
    for (let k = 0; k < n - fa; k++) ops.push({ t: ' ', a: fa + k, b: fb + k, x: A[fa + k] });
    return ops;
  }
  function trozos(ops, c = 3) {
    const out = []; let cur = null;
    ops.forEach((o, i) => {
      if (o.t === ' ') return;
      const desde = Math.max(0, i - c), hasta = Math.min(ops.length - 1, i + c);
      if (cur && desde <= cur.fin + 1) cur.fin = hasta; else { cur = { ini: desde, fin: hasta }; out.push(cur); }
    });
    return out.map((h) => {
      const ls = ops.slice(h.ini, h.fin + 1);
      const pa = ls.find((o) => o.a !== null), pb = ls.find((o) => o.b !== null);
      return { ls, aIni: pa ? pa.a + 1 : 0, bIni: pb ? pb.b + 1 : 0, aLen: ls.filter((o) => o.t !== '+').length, bLen: ls.filter((o) => o.t !== '-').length };
    });
  }
  // cambios entre dos snapshots: [{ ruta, tipo: 'added'|'removed'|'modified', antes, despues, mas, menos, ops }]
  function cambiosEntre(sa, sb) {
    const rutas = [...new Set([...Object.keys(sa || {}), ...Object.keys(sb || {})])].sort();
    const out = [];
    for (const p of rutas) {
      const a = sa ? sa[p] : undefined, b = sb ? sb[p] : undefined;
      if (a === b) continue;
      const ops = diffLineas(a === undefined ? null : a, b === undefined ? null : b);
      out.push({ ruta: p, tipo: a === undefined ? 'added' : b === undefined ? 'removed' : 'modified', antes: a, despues: b, ops, mas: ops.filter((o) => o.t === '+').length, menos: ops.filter((o) => o.t === '-').length });
    }
    return out;
  }
  const extension = (p) => (/\.([\w]+)$/.exec(p) || [])[1] || '';
  const LENG = { py: 'python', js: 'javascript', ts: 'typescript', json: 'json', yml: 'yaml', yaml: 'yaml', md: 'markdown', sql: 'sql', sh: 'bash', html: 'xml', css: 'css', toml: 'ini', cfg: 'ini', ini: 'ini', tf: 'ini', dockerfile: 'dockerfile', txt: '' };
  function resaltar(linea, ruta) {
    const l = LENG[extension(ruta).toLowerCase()] || (/Dockerfile$/.test(ruta) ? 'dockerfile' : '');
    if (window.hljs && l && window.hljs.getLanguage(l)) { try { return window.hljs.highlight(linea, { language: l, ignoreIllegals: true }).value; } catch (e) { /* texto plano */ } }
    return esc(linea);
  }
  function barritas(mas, menos) {
    const t = mas + menos; if (!t) return '';
    const v = Math.round((mas / t) * 5), rj = t ? Math.min(5 - v, Math.round((menos / t) * 5)) : 0;
    return `<span class="gh-barras">${'<i class="v"></i>'.repeat(v)}${'<i class="r"></i>'.repeat(rj)}${'<i></i>'.repeat(Math.max(0, 5 - v - rj))}</span>`;
  }
  // tabla de diff unificado; opciones: { comentarios: [{ruta, linea, lado, ...}], comentable: bool, ruta }
  function tablaDiff(cb, o = {}) {
    const hs = trozos(cb.ops);
    if (!hs.length) return `<div class="gh-vacio-diff">${cb.tipo === 'added' ? 'Empty file.' : 'File renamed without changes.'}</div>`;
    if (cb.ops.length > 1500 && !o.todo) return `<div class="gh-vacio-diff">Large diffs are not rendered by default. <a href="#" data-cargar-diff="${esc(cb.ruta)}">Load diff</a></div>`;
    const filas = [];
    const comentariosDe = (lado, n) => (o.comentarios || []).filter((c) => c.ruta === cb.ruta && c.lado === lado && c.linea === n);
    for (const h of hs) {
      filas.push(`<tr class="gh-hunk"><td class="gh-num" colspan="2">${oc('unfold')}</td><td class="gh-cod">@@ -${h.aIni},${h.aLen} +${h.bIni},${h.bLen} @@</td></tr>`);
      for (const op of h.ls) {
        const cls = op.t === '+' ? 'ad' : op.t === '-' ? 'de' : '';
        const lado = op.t === '-' ? 'L' : 'R', n = op.t === '-' ? op.a + 1 : op.b + 1;
        const boton = o.comentable ? `<button class="gh-addc" data-comentar="${esc(cb.ruta)}" data-lado="${lado}" data-linea="${n}" title="Add a comment to this line">${oc('plus')}</button>` : '';
        filas.push(`<tr class="${cls}"><td class="gh-num">${op.a !== null ? op.a + 1 : ''}</td><td class="gh-num">${op.b !== null ? op.b + 1 : ''}</td><td class="gh-cod">${boton}<span class="gh-mk">${op.t === ' ' ? ' ' : op.t}</span>${resaltar(op.x, cb.ruta) || ' '}</td></tr>`);
        const cs = comentariosDe(lado, n);
        if (cs.length && o.pintarComentarios) filas.push(`<tr class="gh-com-fila"><td colspan="3">${o.pintarComentarios(cs)}</td></tr>`);
      }
    }
    return `<table class="gh-diff">${filas.join('')}</table>`;
  }
  function archivoDiff(cb, o = {}) {
    const ico = cb.tipo === 'added' ? 'diff-added' : cb.tipo === 'removed' ? 'diff-removed' : 'diff-modified';
    return `<div class="gh-fdiff" data-archivo="${esc(cb.ruta)}"><div class="gh-fdiff-h"><button class="gh-ib" data-plegar title="Collapse file">${oc('chevron-down')}</button>
      <span class="gh-cnt"><span class="gh-verde">+${cb.mas}</span> <span class="gh-rojo">−${cb.menos}</span></span>${barritas(cb.mas, cb.menos)}
      <span class="gh-tipo-${cb.tipo}" title="${cb.tipo}">${oc(ico)}</span><a class="gh-mono gh-fruta" href="${o.ver ? esc(o.ver(cb)) : '#'}">${esc(cb.ruta)}</a>
      <button class="gh-ib" data-copiar="${esc(cb.ruta)}" title="Copy file name to clipboard">${oc('copy')}</button><span class="gh-sp"></span>
      ${o.visto ? `<label class="gh-visto"><input type="checkbox" data-visto="${esc(cb.ruta)}"${o.visto(cb.ruta) ? ' checked' : ''}> Viewed</label>` : ''}</div>
      <div class="gh-fdiff-b">${tablaDiff(cb, o)}</div></div>`;
  }

  // ------------------------------------------------------------------ presentación
  function hace(iso) {
    if (!iso) return '';
    const d = new Date(iso), s = (Date.now() - d) / 1000;
    const MES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let t;
    if (s < 45) t = 'now'; else if (s < 90) t = '1 minute ago'; else if (s < 3600) t = `${Math.round(s / 60)} minutes ago`;
    else if (s < 5400) t = '1 hour ago'; else if (s < 86400) t = `${Math.round(s / 3600)} hours ago`; else if (s < 172800) t = 'yesterday';
    else if (s < 30 * 86400) t = `${Math.round(s / 86400)} days ago`;
    else t = `on ${MES[d.getMonth()]} ${d.getDate()}${d.getFullYear() !== new Date().getFullYear() ? ', ' + d.getFullYear() : ''}`;
    return `<relative-time title="${esc(d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }))}">${t}</relative-time>`;
  }
  function avatar(u, t = 20) {
    const g = GENTE[u] || { color: '#6e7781' };
    const ini = g.bot ? oc('play', '', Math.round(t * 0.6)) : esc(String(u || '?')[0].toUpperCase());
    return `<span class="gh-av${g.bot || g.org ? ' gh-av-cuad' : ''}" style="--av:${g.color};width:${t}px;height:${t}px;font-size:${Math.round(t * 0.5)}px" title="${esc(u)}">${ini}</span>`;
  }
  const usuario = (u) => `<a class="gh-user" href="${url(u)}">${esc(u)}</a>`;
  function etiqueta(n) {
    const [c] = ETIQUETAS[n] || ['#ededed'];
    const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
    const claro = (r * 299 + g * 587 + b * 114) / 1000 > 150;
    return `<span class="gh-label" style="--lb:${c};--lt:${claro ? '#1f2328' : '#fff'};--lr:${r};--lg:${g};--lbb:${b}">${esc(n)}</span>`;
  }
  // markdown con referencias #n y @usuario como en GitHub
  function md(src, x) {
    let s = String(src || '');
    // bloques de código con sangría de 4 espacios (como en GitHub)
    s = s.replace(/(^|\n\n)((?: {4}[^\n]*(?:\n|$))+)/g, (m, a, blk) => (/^ {4}([-*+]|\d+\.)\s/.test(blk) ? m : `${a}\`\`\`\n${blk.replace(/^ {4}/gm, '').replace(/\n?$/, '\n')}\`\`\`\n`));
    if (x) s = s.replace(/(^|[\s(])#(\d+)\b/g, (m, a, n) => `${a}[#${n}](${repoUrl(x, 'issues', n)})`).replace(/(^|\s)@([a-z][\w-]*)/gi, (m, a, u) => `${a}[@${u}](${url(u)})`);
    const html = window.Notas && window.Notas.render ? window.Notas.render(s) : `<p>${esc(s).replace(/\n/g, '<br>')}</p>`;
    return `<div class="gh-md">${html}</div>`;
  }
  const pista = (t) => `<div class="gh-practica">${oc('light-bulb')} <span>${t}</span></div>`;
  function caja(titulo, cuerpo, extra = '') { return `<div class="gh-box">${titulo ? `<div class="gh-box-h">${titulo}${extra}</div>` : ''}${cuerpo}</div>`; }
  const btn = (txt, o = {}) => `<${o.href ? 'a' : 'button'} class="gh-btn${o.tipo ? ' gh-btn-' + o.tipo : ''}${o.sm ? ' gh-btn-sm' : ''}"${o.href ? ` href="${esc(o.href)}"` : ' type="button"'}${o.attr ? ' ' + o.attr : ''}${o.dis ? ' disabled aria-disabled="true"' : ''}>${o.ico ? oc(o.ico) : ''}${txt ? `<span>${txt}</span>` : ''}${o.caret ? oc('triangle-down') : ''}</${o.href ? 'a' : 'button'}>`;
  const contador = (n) => `<span class="gh-counter">${n}</span>`;
  function editorMd(id, valor = '', ph = 'Add your comment here...') {
    return `<div class="gh-mded" data-mded="${id}"><div class="gh-mded-tabs"><button type="button" class="sel" data-mdtab="write">Write</button><button type="button" data-mdtab="preview">Preview</button></div>
      <textarea id="${id}" placeholder="${esc(ph)}">${esc(valor)}</textarea><div class="gh-mded-prev" hidden></div><div class="gh-mded-pie">${oc('markdown') || ''}<span>Markdown is supported</span></div></div>`;
  }
  function enlazarMded(cont, x) {
    cont.querySelectorAll('[data-mded]').forEach((m) => {
      m.querySelectorAll('[data-mdtab]').forEach((b) => b.addEventListener('click', () => {
        m.querySelectorAll('[data-mdtab]').forEach((y) => y.classList.toggle('sel', y === b));
        const ta = m.querySelector('textarea'), pv = m.querySelector('.gh-mded-prev');
        const prev = b.dataset.mdtab === 'preview';
        ta.hidden = prev; pv.hidden = !prev;
        if (prev) pv.innerHTML = ta.value.trim() ? md(ta.value, x) : '<p class="gh-dim">Nothing to preview</p>';
      }));
    });
  }
  // un menú desplegable simple: boton[data-menu="id"] abre div[data-menu-de="id"]
  function enlazarMenus(cont) {
    cont.querySelectorAll('[data-menu]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const m = cont.querySelector(`[data-menu-de="${b.dataset.menu}"]`); if (!m) return;
      const abrir = m.hidden;
      cont.querySelectorAll('[data-menu-de]').forEach((y) => { y.hidden = true; });
      m.hidden = !abrir;
      if (abrir) { const i = m.querySelector('input'); if (i) setTimeout(() => i.focus(), 0); }
    }));
  }
  document.addEventListener('click', (e) => { const g = document.getElementById('ghp'); if (!g || e.target.closest('[data-menu-de]')) return; g.querySelectorAll('[data-menu-de]').forEach((m) => { m.hidden = true; }); });

  // ------------------------------------------------------------------ eventos de push (terminal y web)
  // la terminal avisa cada push; github-colab.js dispara Actions, actualiza PRs y Pages
  const alPushOyentes = [];
  function alPush(x, rama, antes, despues, origen) { for (const f of alPushOyentes) { try { f(x, rama, antes, despues, origen); } catch (e) { console.error(e); } } }
  function conectarTerminal() {
    const A = API(); if (!A || A.__conectadoWeb) return;
    A.__conectadoWeb = true;
    A.oyentesPush.push((u, rama, antes, despues) => { const p = partesUrl(u); if (!p) return; const x = buscarRepo(p.owner, p.repo); if (x) alPush(x, rama, antes, despues, 'terminal'); setTimeout(refrescarVivo, 50); });
  }
  // las vistas registran regiones que se actualizan solas (ejecuciones, checks)
  function vivo(f) { vivos.push(f); }
  function refrescarVivo() { clearTimeout(tVivo); tVivo = setTimeout(() => { if (!document.getElementById('ghp')) { vivos = []; return; } for (const f of vivos) { try { f(); } catch (e) { console.error(e); } } }, 120); }

  // ------------------------------------------------------------------ commits desde la web
  function commitear(x, rama, cambios, msg, autor = YO) {
    const r = x.r, padre = r.branches[rama] || null;
    const snap = { ...snapDe(r, padre) };
    for (const [k, v] of Object.entries(cambios)) { if (v === null) delete snap[k]; else snap[k] = v; }
    const h = API().nuevoHash();
    r.commits[h] = { msg, parent: padre, snap, author: autor, date: ahora() };
    r.branches[rama] = h;
    guardar();
    alPush(x, rama, padre, h, 'web');
    return h;
  }

  // ------------------------------------------------------------------ marco
  function marco(x, tab, cuerpo, opciones = {}) {
    const titulo = x ? `<a class="gh-crumb" href="${url(x.owner)}">${esc(x.owner)}</a><span class="gh-crumb-sep">/</span><a class="gh-crumb gh-b" href="${repoUrl(x)}">${esc(x.repo)}</a>` : `<a class="gh-crumb gh-b" href="${url()}">Dashboard</a>`;
    const tabs = x ? cabeceraTabs(x, tab) : '';
    let g = main.querySelector('#ghp');
    if (!g) {
      main.innerHTML = `<div class="ghp" id="ghp"><div class="gh-pag" id="ghPag"></div>
        <section class="gh-term" id="ghTerm" hidden><div class="gh-term-h"><b>${oc('terminal')} Terminal</b><span class="gh-dim">la misma máquina del curso: lo que subes con git push aparece arriba al instante</span><span class="gh-sp"></span><button class="gh-ib" id="ghTermX" title="Cerrar">${oc('x')}</button></div><div class="gh-term-b" id="ghTermBody"></div></section></div>`;
      g = main.querySelector('#ghp');
      g.querySelector('#ghTermX').addEventListener('click', () => alternarTerminal(false));
    }
    const pag = g.querySelector('#ghPag');
    const mismaRuta = pag.dataset.ruta === location.hash;
    pag.dataset.ruta = location.hash;
    pag.innerHTML = `
      <header class="gh-top">
        <button class="gh-ib gh-top-b" title="Open global navigation menu" data-menu="nav">${oc('three-bars')}</button>
        <a class="gh-logo" href="${url()}" title="GitHub de práctica">${oc('mark-github', '', 32)}</a>
        <div class="gh-crumbs">${titulo}</div>
        <span class="gh-sp"></span>
        <label class="gh-buscar">${oc('search')}<input id="ghQ" placeholder="Type / to search" autocomplete="off"></label>
        <span class="gh-practica-tag" title="Esto es una práctica del curso: nada sale de tu navegador">práctica</span>
        <button class="gh-ib gh-top-b" id="ghTermB" title="Terminal de práctica (la misma máquina del curso)">${oc('terminal')}</button>
        <button class="gh-ib gh-top-b" data-menu="crear" title="Create new…">${oc('plus')}${oc('triangle-down')}</button>
        <a class="gh-ib gh-top-b" href="${url('issues')}" title="Your issues">${oc('issue-opened')}</a>
        <a class="gh-ib gh-top-b" href="${url('pulls')}" title="Your pull requests">${oc('git-pull-request')}</a>
        <a class="gh-ib gh-top-b" href="${url('notifications')}" title="You have no unread notifications">${oc('inbox')}</a>
        <button class="gh-avb" data-menu="yo" title="Open user navigation menu">${avatar(YO, 32)}</button>
        <div class="gh-menu gh-menu-izq" data-menu-de="nav" hidden><a href="${url()}">${oc('home')} Home</a><a href="${url('issues')}">${oc('issue-opened')} Issues</a><a href="${url('pulls')}">${oc('git-pull-request')} Pull requests</a><hr><a href="#/herramientas">${oc('arrow-left')} Volver al curso</a></div>
        <div class="gh-menu gh-menu-der2" data-menu-de="crear" hidden><a href="${url('new')}">${oc('repo')} New repository</a>${x ? `<a href="${repoUrl(x, 'issues', 'new')}">${oc('issue-opened')} New issue</a>` : ''}</div>
        <div class="gh-menu gh-menu-der" data-menu-de="yo" hidden><div class="gh-menu-yo">${avatar(YO, 32)}<div><b>${YO}</b><div class="gh-dim">${GENTE[YO].nombre}</div></div></div><hr><a href="${url(YO)}">${oc('repo')} Your repositories</a><a href="${url(YO)}">${oc('person')} Your profile</a><hr><a href="#/herramientas">${oc('arrow-left')} Salir de la práctica</a></div>
      </header>
      ${tabs}
      <main class="gh-main${opciones.ancho ? ' gh-main-ancho' : ''}">${cuerpo}</main>`;
    if (!mismaRuta) pag.scrollTop = 0;
    g.classList.toggle('gh-con-term', termAbierta);
    g.querySelector('#ghTerm').hidden = !termAbierta;
    enlazarMenus(pag);
    const q = g.querySelector('#ghQ');
    q.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !q.value.trim()) return;
      const t = q.value.trim();
      const hit = listaRepos().find((r) => `${r.owner}/${r.repo}`.toLowerCase().includes(t.toLowerCase()) || r.repo.toLowerCase().includes(t.toLowerCase()));
      if (x && !hit) ir(repoUrl(x, 'issues') + '?q=' + encodeURIComponent(t)); else if (hit) ir(repoUrl(hit)); else toast(`No repositories matched "${t}"`);
    });
    g.querySelector('#ghTermB').addEventListener('click', () => alternarTerminal());
    if (termAbierta) montarTerminal(false);
    pag.querySelectorAll('[data-copiar]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); copiar(b.dataset.copiar); }));
  }
  function copiar(t) { try { navigator.clipboard.writeText(t); toast('Copied!'); } catch (e) { toast(t); } }
  function alternarTerminal(v) {
    termAbierta = v === undefined ? !termAbierta : v;
    const g = document.getElementById('ghp'); if (!g) return;
    g.classList.toggle('gh-con-term', termAbierta);
    g.querySelector('#ghTerm').hidden = !termAbierta;
    if (termAbierta) montarTerminal(true);
  }
  function montarTerminal(foco) {
    const b = document.getElementById('ghTermBody'); if (!b) return;
    if (!b.firstChild) {
      // después de cada git o gh la página se vuelve a dibujar: el push, el PR o el merge se ven al instante
      termObj = Sh().createTerminal(b, { compact: true, welcome: `${Sh().col.b('Terminal de práctica')} — la misma máquina del curso. Prueba: ${Sh().col.info('git clone https://github.com/tienda-andina/pipelines')}`, onCommand: (l) => { if (/^\s*(git|gh|reiniciar-remoto)\b/.test(l) && document.getElementById('ghp')) render(); } });
    }
    if (foco) setTimeout(() => termObj && termObj.focus && termObj.focus(), 30);
  }
  function cabeceraTabs(x, tab) {
    const r = x.r;
    const abiertosI = r.issues.filter((i) => i.estado === 'abierto').length, abiertosP = r.prs.filter((p) => p.estado === 'abierto').length;
    const enCurso = r.runs.some((k) => k.estado !== 'completed');
    const T = [['code', 'code', 'Code', ''], ['issues', 'issue-opened', 'Issues', abiertosI ? contador(abiertosI) : ''], ['pulls', 'git-pull-request', 'Pull requests', abiertosP ? contador(abiertosP) : ''],
      ['actions', 'play', 'Actions', enCurso ? '<span class="gh-punto-run"></span>' : ''], ['security', 'shield', 'Security', ''], ['pulse', 'graph', 'Insights', ''], ['settings', 'gear', 'Settings', '']];
    const est = r.meta.estrellado;
    return `<div class="gh-repohead">
      <div class="gh-repohead-t">${oc(r.meta.privado ? 'lock' : 'repo')}<a href="${url(x.owner)}">${esc(x.owner)}</a><span class="gh-crumb-sep">/</span><a class="gh-b" href="${repoUrl(x)}">${esc(x.repo)}</a><span class="gh-label-vis">${r.meta.privado ? 'Private' : 'Public'}</span>
        <span class="gh-sp"></span>${btn('Watch', { ico: 'eye', sm: true, caret: true, attr: 'data-noop' })}${btn('Fork', { ico: 'repo-forked', sm: true, attr: 'data-noop' })}<span class="gh-btn-grupo">${btn(est ? 'Starred' : 'Star', { ico: est ? 'star-fill' : 'star', sm: true, attr: 'id="ghStar"' })}<span class="gh-btn gh-btn-sm gh-btn-cnt">${(r.meta.estrellas || 0) + (est ? 1 : 0)}</span></span></div>
      <nav class="gh-tabs">${T.map(([id, ico, txt, extra]) => `<a href="${id === 'code' ? repoUrl(x) : repoUrl(x, id)}" class="${tab === id ? 'sel' : ''}">${oc(ico)}<span>${txt}</span>${extra}</a>`).join('')}</nav></div>`;
  }
  function enlazarCabecera(x) {
    const s = main.querySelector('#ghStar');
    if (s) s.addEventListener('click', () => { x.r.meta.estrellado = !x.r.meta.estrellado; guardar(); render(); });
    main.querySelectorAll('[data-noop]').forEach((b) => b.addEventListener('click', () => toast('(práctica) Watch y Fork no están en la réplica')));
  }

  // ------------------------------------------------------------------ dashboard y perfil
  function vistaDashboard() {
    const rs = listaRepos();
    const feed = [];
    for (const x of rs) {
      for (const pr of x.r.prs) { feed.push({ f: pr.fecha, html: `${avatar(pr.autor)} ${usuario(pr.autor)} opened pull request <a href="${repoUrl(x, 'pull', pr.n)}">#${pr.n} ${esc(pr.titulo)}</a> in <a href="${repoUrl(x)}">${esc(x.owner)}/${esc(x.repo)}</a>` }); if (pr.fusion) feed.push({ f: pr.fusion.fecha, html: `${avatar(pr.fusion.por)} ${usuario(pr.fusion.por)} merged <a href="${repoUrl(x, 'pull', pr.n)}">#${pr.n}</a> in <a href="${repoUrl(x)}">${esc(x.owner)}/${esc(x.repo)}</a>` }); }
      for (const is of x.r.issues) feed.push({ f: is.fecha, html: `${avatar(is.autor)} ${usuario(is.autor)} opened issue <a href="${repoUrl(x, 'issues', is.n)}">#${is.n} ${esc(is.titulo)}</a> in <a href="${repoUrl(x)}">${esc(x.owner)}/${esc(x.repo)}</a>` });
      const tip = x.r.branches[ramaDefecto(x.r)];
      if (tip) feed.push({ f: x.r.commits[tip].date, html: `${avatar(x.r.commits[tip].author)} ${usuario(x.r.commits[tip].author)} pushed to <a href="${repoUrl(x, 'tree', ramaDefecto(x.r))}">${esc(ramaDefecto(x.r))}</a> in <a href="${repoUrl(x)}">${esc(x.owner)}/${esc(x.repo)}</a> — <span class="gh-mono">${corto(tip)}</span> ${esc(titulo(x.r.commits[tip].msg))}` });
    }
    feed.sort((a, b) => String(b.f).localeCompare(String(a.f)));
    const cuerpo = `<div class="gh-dash">
      <aside class="gh-dash-izq"><div class="gh-dash-t"><b>Top repositories</b>${btn('New', { ico: 'repo', sm: true, tipo: 'primary', href: url('new') })}</div>
        <input class="gh-input gh-input-sm" id="ghFiltroR" placeholder="Find a repository…">
        <ul class="gh-dash-repos">${rs.map((x) => `<li data-n="${esc(x.owner + '/' + x.repo)}">${avatar(x.owner, 16)}<a href="${repoUrl(x)}">${esc(x.owner)}/${esc(x.repo)}</a></li>`).join('') || '<li class="gh-dim">Todavía no hay repositorios.</li>'}</ul></aside>
      <section class="gh-dash-centro"><h2 class="gh-h2">Home</h2>
        ${pista(`Esta es la réplica de GitHub del curso. Los repositorios son los mismos que usa la <b>terminal</b> (botón ${oc('terminal')} arriba): <code>git clone</code>, <code>git push</code> y <code>gh pr create</code> se ven acá al instante. Empieza por <a href="${url('tienda-andina', 'pipelines')}">tienda-andina/pipelines</a> o crea un repositorio con <b>New</b>.`)}
        ${rs.length ? '' : `<div class="gh-box gh-blank">${oc('repo', '', 24)}<h3>Crea tu primer repositorio</h3><p>O abre el repositorio de práctica del equipo de datos.</p>${btn('Abrir tienda-andina/pipelines', { tipo: 'primary', attr: 'id="ghSemilla"' })}</div>`}
        <h3 class="gh-h3">Recent activity</h3>
        <div class="gh-feed">${feed.slice(0, 25).map((e) => `<div class="gh-feed-i">${e.html}<span class="gh-dim"> · ${hace(e.f)}</span></div>`).join('') || '<p class="gh-dim">Cuando hagas push, abras issues o pull requests, aparecerán aquí.</p>'}</div></section>
    </div>`;
    marco(null, '', cuerpo, { ancho: true });
    const f = main.querySelector('#ghFiltroR');
    f.addEventListener('input', () => main.querySelectorAll('.gh-dash-repos li[data-n]').forEach((li) => { li.hidden = !li.dataset.n.toLowerCase().includes(f.value.toLowerCase()); }));
    const s = main.querySelector('#ghSemilla');
    if (s) s.addEventListener('click', () => { API().crearRemoto('https://github.com/tienda-andina/pipelines', true); guardar(); ir(url('tienda-andina', 'pipelines')); });
  }
  function vistaPerfil(owner) {
    const rs = listaRepos().filter((x) => x.owner.toLowerCase() === owner.toLowerCase());
    const g = GENTE[owner] || { nombre: owner, color: '#6e7781' };
    const cuerpo = `<div class="gh-perfil"><aside>${avatar(owner, 220)}<h1 class="gh-perfil-n">${esc(g.nombre)}</h1><div class="gh-perfil-l">${esc(owner)}</div>${g.org ? '<p class="gh-dim">Organización de práctica del curso.</p>' : ''}</aside>
      <section><nav class="gh-subtabs"><a class="sel">${oc('repo')} Repositories ${contador(rs.length)}</a></nav>
      <div class="gh-lista-repos">${rs.map((x) => `<div class="gh-lr"><div><a class="gh-lr-n" href="${repoUrl(x)}">${esc(x.repo)}</a> <span class="gh-label-vis">${x.r.meta.privado ? 'Private' : 'Public'}</span></div>${x.r.meta.desc ? `<p class="gh-dim">${esc(x.r.meta.desc)}</p>` : ''}<div class="gh-lr-meta">${lenguaje(x) ? `<span><i class="gh-lang-dot" style="background:${lenguaje(x).c}"></i> ${lenguaje(x).n}</span>` : ''}<span>Updated ${hace(ultimaFecha(x))}</span></div></div>`).join('') || `<p class="gh-dim">${esc(owner)} doesn’t have any public repositories yet.</p>`}</div></section></div>`;
    marco(null, '', cuerpo, { ancho: true });
  }
  function ultimaFecha(x) { return Object.values(x.r.branches).map((h) => (x.r.commits[h] || {}).date).filter(Boolean).sort().pop() || x.r.meta.creado; }
  const LANG_COL = { Python: '#3572A5', JavaScript: '#f1e05a', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', HCL: '#844FBA', SQL: '#e38c00', 'Jupyter Notebook': '#DA5B0B', Dockerfile: '#384d54', Markdown: '#083fa1' };
  const EXT_LANG = { py: 'Python', js: 'JavaScript', html: 'HTML', css: 'CSS', sh: 'Shell', tf: 'HCL', sql: 'SQL', ipynb: 'Jupyter Notebook' };
  function lenguajes(x) {
    const s = snapDe(x.r, x.r.branches[ramaDefecto(x.r)]); const t = {};
    for (const [k, v] of Object.entries(s)) { const l = EXT_LANG[extension(k).toLowerCase()] || (/Dockerfile$/.test(k) ? 'Dockerfile' : null); if (l) t[l] = (t[l] || 0) + v.length; }
    const tot = Object.values(t).reduce((a, b) => a + b, 0);
    return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([n, v]) => ({ n, p: tot ? (v / tot) * 100 : 0, c: LANG_COL[n] || '#8b949e' }));
  }
  const lenguaje = (x) => lenguajes(x)[0] || null;

  // ------------------------------------------------------------------ crear repositorio
  const GITIGNORE = { Python: '# Byte-compiled / optimized / DLL files\n__pycache__/\n*.py[cod]\n\n# Environments\n.env\n.venv\nenv/\nvenv/\n\n# Jupyter Notebook\n.ipynb_checkpoints\n\n# pytest\n.pytest_cache/\n', Node: 'node_modules/\nnpm-debug.log*\n.env\ndist/\n', Terraform: '.terraform/\n*.tfstate\n*.tfstate.*\ncrash.log\n*.tfvars\n' };
  const LICENCIA_MIT = (y, n) => `MIT License\n\nCopyright (c) ${y} ${n}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`;
  function crearRepo(owner, nombre, o = {}) {
    const u = `https://github.com/${owner}/${nombre}`;
    const R = API().crearRemoto(u, false);
    R.meta = { desc: o.desc || '', privado: !!o.privado, creado: ahora(), estrellas: 0, temas: [] };
    const snap = {};
    if (o.readme) snap['README.md'] = `# ${nombre}\n${o.desc ? '\n' + o.desc + '\n' : ''}`;
    if (o.gitignore && GITIGNORE[o.gitignore]) snap['.gitignore'] = GITIGNORE[o.gitignore];
    if (o.licencia === 'MIT') snap.LICENSE = LICENCIA_MIT(new Date().getFullYear(), owner);
    if (Object.keys(snap).length) { const h = API().nuevoHash(); R.commits[h] = { msg: 'Initial commit', parent: null, snap, author: owner === YO ? YO : YO, date: ahora() }; R.branches.main = h; }
    guardar();
    return buscarRepo(owner, nombre);
  }
  function vistaNuevo() {
    const cuerpo = `<div class="gh-nuevo"><h1 class="gh-h1">Create a new repository</h1><p class="gh-dim">A repository contains all project files, including the revision history.</p><hr>
      <div class="gh-form-fila"><div><label class="gh-lbl">Owner <span class="gh-rojo">*</span></label><select class="gh-input" id="nrOwner"><option>alumno</option><option>tienda-andina</option></select></div><span class="gh-slash">/</span>
      <div class="gh-grow"><label class="gh-lbl">Repository name <span class="gh-rojo">*</span></label><input class="gh-input" id="nrNombre" autocomplete="off"><div class="gh-nota" id="nrNota"></div></div></div>
      <p class="gh-dim">Great repository names are short and memorable. Need inspiration? How about <b class="gh-verde">ventas-pipeline</b>?</p>
      <label class="gh-lbl">Description <span class="gh-dim">(optional)</span></label><input class="gh-input" id="nrDesc">
      <hr><label class="gh-radio"><input type="radio" name="nrVis" value="pub" checked>${oc('repo')}<div><b>Public</b><div class="gh-dim">Anyone on the internet can see this repository. You choose who can commit.</div></div></label>
      <label class="gh-radio"><input type="radio" name="nrVis" value="priv">${oc('lock')}<div><b>Private</b><div class="gh-dim">You choose who can see and commit to this repository.</div></div></label><hr>
      <h3 class="gh-h4">Initialize this repository with:</h3>
      <label class="gh-check"><input type="checkbox" id="nrReadme"><div><b>Add a README file</b><div class="gh-dim">This is where you can write a long description for your project.</div></div></label>
      <label class="gh-lbl">Add .gitignore</label><select class="gh-input gh-input-auto" id="nrIgnore"><option value="">.gitignore template: None</option><option>Python</option><option>Node</option><option>Terraform</option></select>
      <label class="gh-lbl">Choose a license</label><select class="gh-input gh-input-auto" id="nrLic"><option value="">License: None</option><option>MIT</option></select>
      ${pista('Si vas a subir un proyecto que ya tienes en la terminal, <b>no</b> marques el README: crea el repositorio vacío y GitHub te muestra los comandos <code>git remote add origin …</code> y <code>git push -u origin main</code>.')}
      <hr><div class="gh-der">${btn('Create repository', { tipo: 'primary', attr: 'id="nrCrear" disabled' })}</div></div>`;
    marco(null, '', cuerpo);
    const n = main.querySelector('#nrNombre'), nota = main.querySelector('#nrNota'), b = main.querySelector('#nrCrear');
    const validar = () => {
      const v = n.value.trim(), o = main.querySelector('#nrOwner').value;
      const limpio = v.replace(/[^\w.-]+/g, '-');
      let msg = '', okv = !!v;
      if (v && buscarRepo(o, limpio)) { msg = `<span class="gh-rojo">${oc('alert')} The repository ${esc(limpio)} already exists on this account.</span>`; okv = false; }
      else if (v && limpio !== v) msg = `<span class="gh-ambar">Your new repository will be created as <b>${esc(limpio)}</b>.</span>`;
      else if (v) msg = `<span class="gh-verde">${oc('check')} ${esc(v)} is available.</span>`;
      nota.innerHTML = msg; b.disabled = !okv;
    };
    n.addEventListener('input', validar); main.querySelector('#nrOwner').addEventListener('change', validar);
    b.addEventListener('click', () => {
      const o = main.querySelector('#nrOwner').value, nombre = n.value.trim().replace(/[^\w.-]+/g, '-');
      const x = crearRepo(o, nombre, { desc: main.querySelector('#nrDesc').value.trim(), privado: main.querySelector('[name=nrVis]:checked').value === 'priv', readme: main.querySelector('#nrReadme').checked, gitignore: main.querySelector('#nrIgnore').value, licencia: main.querySelector('#nrLic').value });
      ir(repoUrl(x));
    });
  }

  // ------------------------------------------------------------------ Code
  function selectorRama(x, rama, destino) {
    const r = x.r, ramas = Object.keys(r.branches).sort((a, b) => (a === ramaDefecto(r) ? -1 : b === ramaDefecto(r) ? 1 : a.localeCompare(b)));
    return `<span class="gh-rel">${btn(esc(r.branches[rama] ? rama : corto(rama)), { ico: 'git-branch', caret: true, attr: 'data-menu="rama" class="gh-btn gh-btn-rama"' })}
      <div class="gh-menu gh-menu-sel" data-menu-de="rama" hidden><div class="gh-menu-t">Switch branches/tags</div><input class="gh-input gh-input-sm" placeholder="Find or create a branch…" data-filtro-rama>
      <div class="gh-menu-tabs"><b>Branches</b><span class="gh-dim">Tags</span></div>${ramas.map((b) => `<a href="${esc(destino(b))}" data-rama-op="${esc(b)}">${b === rama ? oc('check') : '<i class="gh-ico-vacio"></i>'} ${esc(b)}${b === ramaDefecto(r) ? ' <span class="gh-label-vis">default</span>' : ''}</a>`).join('')}
      <a href="${repoUrl(x, 'branches')}" class="gh-menu-pie">View all branches</a></div></span>`;
  }
  function enlazarSelectorRama(cont) {
    const f = cont.querySelector('[data-filtro-rama]'); if (!f) return;
    f.addEventListener('input', () => cont.querySelectorAll('[data-rama-op]').forEach((a) => { a.hidden = !a.dataset.ramaOp.toLowerCase().includes(f.value.toLowerCase()); }));
  }
  function botonCode(x) {
    const u = `https://github.com/${x.owner}/${x.repo}.git`;
    return `<span class="gh-rel">${btn('Code', { ico: 'code', tipo: 'primary', caret: true, attr: 'data-menu="code"' })}
      <div class="gh-menu gh-menu-code" data-menu-de="code" hidden><div class="gh-menu-tabs"><b>Local</b><span class="gh-dim">Codespaces</span></div>
      <div class="gh-menu-sec"><div class="gh-b">${oc('terminal')} Clone</div><div class="gh-subtabs gh-subtabs-sm"><a class="sel">HTTPS</a><a>SSH</a><a>GitHub CLI</a></div>
      <div class="gh-copia"><input class="gh-input gh-input-sm gh-mono" readonly value="${esc(u)}">${btn('', { ico: 'copy', sm: true, attr: `data-copiar="${esc(u)}" title="Copy url to clipboard"` })}</div>
      <div class="gh-dim gh-sm">Clone using the web URL.</div></div>
      <a href="#" id="ghClonarTerm">${oc('terminal')} Clonar en la terminal de práctica</a>
      <a href="#" id="ghZip">${oc('file-zip') || oc('download')} Download ZIP</a></div></span>`;
  }
  function enlazarCode(x, rama) {
    const c = main.querySelector('#ghClonarTerm');
    if (c) c.addEventListener('click', async (e) => {
      e.preventDefault();
      alternarTerminal(true);
      const dir = x.repo;
      if (termObj && termObj.run) await termObj.run(`cd ~ && git clone https://github.com/${x.owner}/${x.repo}.git ${Sh().exists(Sh().norm('~/' + dir)) ? dir + '-' + Math.floor(Math.random() * 90 + 10) : ''}`.trim());
    });
    const z = main.querySelector('#ghZip');
    if (z) z.addEventListener('click', (e) => {
      e.preventDefault();
      const snap = snapDe(x.r, tipDe(x.r, rama));
      if (!window.Generador || !window.Generador.zip) { toast('No se pudo crear el ZIP'); return; }
      const blob = window.Generador.zip(Object.entries(snap).map(([k, v]) => [`${x.repo}-${rama.replace(/\//g, '-')}/${k}`, v]));
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${x.repo}-${rama.replace(/\//g, '-')}.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }
  function repoVacio(x) {
    const u = `https://github.com/${x.owner}/${x.repo}.git`;
    const cmd1 = `echo "# ${x.repo}" >> README.md\ngit init\ngit add README.md\ngit commit -m "first commit"\ngit branch -M main\ngit remote add origin ${u}\ngit push -u origin main`;
    const cmd2 = `git remote add origin ${u}\ngit branch -M main\ngit push -u origin main`;
    const bloque = (t) => `<div class="gh-cmd"><pre>${esc(t)}</pre>${btn('', { ico: 'copy', sm: true, attr: `data-copiar="${esc(t)}"` })}</div>`;
    return `<div class="gh-vacio">${caja(`<b>Quick setup</b> — if you’ve done this kind of thing before`, `<div class="gh-box-b"><div class="gh-copia"><span class="gh-subtabs gh-subtabs-sm"><a class="sel">HTTPS</a><a>SSH</a></span><input class="gh-input gh-input-sm gh-mono" readonly value="${esc(u)}">${btn('', { ico: 'copy', sm: true, attr: `data-copiar="${esc(u)}"` })}</div>
      <p class="gh-dim gh-sm">Get started by <a href="${repoUrl(x, 'new', 'main')}">creating a new file</a> or uploading an existing file. We recommend every repository include a README, LICENSE, and .gitignore.</p></div>`)}
      <h3 class="gh-h4">…or create a new repository on the command line</h3>${bloque(cmd1)}
      <h3 class="gh-h4">…or push an existing repository from the command line</h3>${bloque(cmd2)}
      ${pista(`Abre la terminal (${oc('terminal')} arriba), copia los comandos y pégalos. Cuando termine el <code>git push</code>, esta página muestra tus archivos.`)}</div>`;
  }
  function filaUltimoCommit(x, tip, p, rama) {
    const r = x.r, c = p ? ultimoCambio(r, tip, p) : { sha: tip, ...r.commits[tip] };
    if (!c) return '';
    const total = historia(r, tip).length;
    const est = estadoChecks(x, c.sha);
    return `<div class="gh-lastc">${avatar(c.author)}<b>${esc(c.author)}</b><a class="gh-lastc-m" href="${repoUrl(x, 'commit', c.sha)}">${esc(titulo(c.msg))}</a>${est}<span class="gh-sp"></span><a class="gh-mono gh-dim" href="${repoUrl(x, 'commit', c.sha)}">${corto(c.sha)}</a><span class="gh-dim">· ${hace(c.date)}</span>
      <a class="gh-lastc-h" href="${repoUrl(x, 'commits', rama) + (p ? '?path=' + encodeURIComponent(p) : '')}">${oc('history')} <b>${total}</b> Commit${total === 1 ? '' : 's'}</a></div>`;
  }
  // ✓ / ✗ / ● junto a un commit según sus ejecuciones de Actions
  function estadoChecks(x, sha) {
    const runs = x.r.runs.filter((k) => k.sha === sha);
    if (!runs.length) return '';
    const corriendo = runs.some((k) => k.estado !== 'completed'), falla = runs.some((k) => k.conclusion === 'failure');
    const ico = corriendo ? '<span class="gh-ambar">' + oc('dot-fill') + '</span>' : falla ? '<span class="gh-rojo">' + oc('x') + '</span>' : '<span class="gh-verde">' + oc('check') + '</span>';
    return `<a class="gh-estado-c" href="${repoUrl(x, 'actions')}" title="${runs.length} check${runs.length > 1 ? 's' : ''}">${ico}</a>`;
  }
  function vistaCode(x, partes) {
    const r = x.r;
    if (!Object.keys(r.branches).length) { marco(x, 'code', repoVacio(x)); enlazarCabecera(x); return; }
    const modo = partes[0] || 'tree';
    const { rama, ruta: p, noExiste } = partes.length > 1 ? ramaYRuta(r, partes.slice(1)) : { rama: ramaDefecto(r), ruta: '' };
    const tip = tipDe(r, rama);
    if (noExiste || !tip) { marco(x, 'code', `<div class="gh-404"><h2>404</h2><p>La rama o el commit <b>${esc(rama)}</b> no existe.</p>${btn('Volver al repositorio', { href: repoUrl(x) })}</div>`); enlazarCabecera(x); return; }
    const snap = snapDe(r, tip);
    if (modo === 'blob' || modo === 'blame') { vistaArchivo(x, rama, tip, p, modo === 'blame'); return; }
    if (p && !esDir(snap, p)) { if (snap[p] !== undefined) { vistaArchivo(x, rama, tip, p, false); return; } }
    if (p && !esDir(snap, p)) { marco(x, 'code', `<div class="gh-404"><h2>404</h2><p>No existe <code>${esc(p)}</code> en ${esc(rama)}.</p></div>`); enlazarCabecera(x); return; }
    const ents = entradas(snap, p);
    const nRamas = Object.keys(r.branches).length;
    const destinoRama = (b) => (p ? repoUrl(x, 'tree', b, p) : b === ramaDefecto(r) ? repoUrl(x) : repoUrl(x, 'tree', b));
    const filas = ents.map((e) => { const c = ultimoCambio(r, tip, e.ruta); return `<tr><td class="gh-fl-n">${e.tipo === 'dir' ? `<span class="gh-dir">${oc('file-directory-fill')}</span>` : oc('file')}<a href="${repoUrl(x, e.tipo === 'dir' ? 'tree' : 'blob', rama, e.ruta)}">${esc(e.nombre)}</a></td><td class="gh-fl-m">${c ? `<a href="${repoUrl(x, 'commit', c.sha)}">${esc(titulo(c.msg))}</a>` : ''}</td><td class="gh-fl-t">${c ? hace(c.date) : ''}</td></tr>`; }).join('');
    const subir = p ? `<tr><td colspan="3"><a href="${p.includes('/') ? repoUrl(x, 'tree', rama, p.slice(0, p.lastIndexOf('/'))) : destinoRama(rama)}">${oc('file-directory-fill')} ..</a></td></tr>` : '';
    const readmeK = ents.find((e) => e.tipo === 'file' && /^readme(\.md|\.txt)?$/i.test(e.nombre));
    const readme = readmeK ? `<div class="gh-box gh-readme" id="readme"><div class="gh-box-h gh-readme-h">${oc('book')} <b>README</b>${r.meta && snap.LICENSE ? `<span class="gh-dim gh-ml">${oc('law')} MIT license</span>` : ''}<span class="gh-sp"></span><a class="gh-ib" href="${repoUrl(x, 'edit', rama, readmeK.ruta)}" title="Edit file">${oc('pencil')}</a></div><div class="gh-box-b gh-readme-b">${/\.md$/i.test(readmeK.nombre) ? md(snap[readmeK.ruta], x) : `<pre>${esc(snap[readmeK.ruta])}</pre>`}</div></div>` : !p ? `<div class="gh-box gh-readme"><div class="gh-box-b gh-centro"><p>Help people interested in this repository understand your project by adding a README.</p>${btn('Add a README', { href: repoUrl(x, 'new', rama) + '?archivo=README.md' })}</div></div>` : '';
    const migas = p ? `<div class="gh-migas"><a href="${repoUrl(x, 'tree', rama)}" class="gh-b">${esc(x.repo)}</a>${p.split('/').map((s, i, arr) => `<span class="gh-crumb-sep">/</span>${i === arr.length - 1 ? `<b>${esc(s)}</b>` : `<a href="${repoUrl(x, 'tree', rama, arr.slice(0, i + 1).join('/'))}">${esc(s)}</a>`}`).join('')}<span class="gh-crumb-sep">/</span></div>` : '';
    const prReciente = p ? '' : Object.keys(r.branches).filter((b) => b !== ramaDefecto(r) && !r.prs.some((pr) => pr.rama === b && (pr.estado === 'abierto' || (pr.fusion && pr.fusion.headSha === r.branches[b]))) && Date.now() - new Date((r.commits[r.branches[b]] || {}).date) < 3600e3).slice(0, 1).map((b) => `<div class="gh-flash gh-flash-warn">${oc('git-branch')} <b>${esc(b)}</b> had recent pushes ${hace(r.commits[r.branches[b]].date)}<span class="gh-sp"></span>${btn('Compare & pull request', { tipo: 'primary', href: repoUrl(x, 'compare', `${ramaDefecto(r)}...${b}`) })}</div>`).join('');
    const derecha = p ? '' : sobre(x);
    const cuerpo = `${prReciente}<div class="gh-code${p ? ' gh-code-sub' : ''}"><div class="gh-code-izq">
      <div class="gh-code-bar">${selectorRama(x, rama, destinoRama)}${!p ? `<a class="gh-link-dim" href="${repoUrl(x, 'branches')}">${oc('git-branch')} <b>${nRamas}</b> Branch${nRamas === 1 ? '' : 'es'}</a><a class="gh-link-dim">${oc('tag')} <b>0</b> Tags</a>` : migas}<span class="gh-sp"></span>
        <label class="gh-buscar gh-buscar-file">${oc('search')}<input id="ghGoFile" placeholder="Go to file" autocomplete="off"><kbd>t</kbd></label>
        <span class="gh-rel">${btn(p ? '' : 'Add file', { caret: true, ico: p ? 'kebab-horizontal' : '', attr: 'data-menu="add"' })}<div class="gh-menu gh-menu-der" data-menu-de="add" hidden><a href="${repoUrl(x, 'new', rama, p)}">${oc('plus')} Create new file</a><a href="${repoUrl(x, 'upload', rama, p)}">${oc('upload')} Upload files</a></div></span>
        ${p ? '' : botonCode(x)}</div>
      <div class="gh-gofile" id="ghGoRes" hidden></div>
      <div class="gh-box gh-files">${filaUltimoCommit(x, tip, p, rama)}<table class="gh-filelist">${subir}${filas}</table></div>
      ${readme}</div>${derecha}</div>`;
    marco(x, 'code', cuerpo, { ancho: true });
    enlazarCabecera(x); enlazarSelectorRama(main); enlazarCode(x, rama);
    const gf = main.querySelector('#ghGoFile'), gr = main.querySelector('#ghGoRes');
    gf.addEventListener('input', () => {
      const q = gf.value.trim().toLowerCase();
      if (!q) { gr.hidden = true; return; }
      const hits = Object.keys(snap).filter((k) => k.toLowerCase().includes(q)).slice(0, 12);
      gr.hidden = false;
      gr.innerHTML = hits.map((k) => `<a href="${repoUrl(x, 'blob', rama, k)}">${oc('file')} ${esc(k)}</a>`).join('') || '<div class="gh-dim">No matching files</div>';
    });
    gf.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = gr.querySelector('a'); if (a) location.hash = a.getAttribute('href'); } });
  }
  function sobre(x) {
    const r = x.r, ls = lenguajes(x);
    const snap = snapDe(r, r.branches[ramaDefecto(r)]);
    const pages = r.config.pages && r.config.pages.sitio;
    return `<aside class="gh-code-der"><div class="gh-about"><h2 class="gh-h4">About</h2>${r.meta.desc ? `<p>${esc(r.meta.desc)}</p>` : '<p class="gh-dim"><i>No description, website, or topics provided.</i></p>'}
      ${pages ? `<p><a href="${repoUrl(x, 'sitio')}">${oc('link')} ${esc(x.owner)}.github.io/${esc(x.repo)}/</a></p>` : ''}
      ${(r.meta.temas || []).length ? `<div class="gh-temas">${r.meta.temas.map((t) => `<span class="gh-tema">${esc(t)}</span>`).join('')}</div>` : ''}
      <ul class="gh-about-l">${snap['README.md'] ? `<li>${oc('book')} <a href="#readme">Readme</a></li>` : ''}${snap.LICENSE ? `<li>${oc('law')} MIT license</li>` : ''}<li>${oc('pulse')} Activity</li><li>${oc('star')} <b>${(r.meta.estrellas || 0) + (r.meta.estrellado ? 1 : 0)}</b> stars</li><li>${oc('eye')} <b>1</b> watching</li><li>${oc('repo-forked')} <b>0</b> forks</li></ul></div>
      <div class="gh-about"><h2 class="gh-h4">Releases</h2><p class="gh-dim gh-sm">No releases published</p></div>
      ${ls.length ? `<div class="gh-about"><h2 class="gh-h4">Languages</h2><div class="gh-langbar">${ls.map((l) => `<i style="width:${l.p}%;background:${l.c}"></i>`).join('')}</div><ul class="gh-langs">${ls.map((l) => `<li><i class="gh-lang-dot" style="background:${l.c}"></i><b>${esc(l.n)}</b> <span class="gh-dim">${l.p.toFixed(1)}%</span></li>`).join('')}</ul></div>` : ''}</aside>`;
  }
  // blame: a qué commit pertenece cada línea (recorre la historia del archivo de la más vieja a la más nueva)
  function blame(r, tip, p) {
    const hs = historia(r, tip, p).reverse();
    let lineas = [];
    for (const c of hs) {
      const txt = (c.snap || {})[p];
      if (txt === undefined) { lineas = []; continue; }
      const nuevo = txt.replace(/\n$/, '').split('\n');
      const ant = lineas.map((l) => l.x).join('\n');
      const ops = diffLineas(lineas.length ? ant : null, txt);
      const res = [];
      for (const o of ops) { if (o.t === ' ') res.push({ x: o.x, c: lineas[o.a].c }); else if (o.t === '+') res.push({ x: o.x, c }); }
      lineas = res.length ? res : nuevo.map((x) => ({ x, c }));
    }
    return lineas;
  }
  function vistaArchivo(x, rama, tip, p, conBlame) {
    const r = x.r, snap = snapDe(r, tip), txt = snap[p];
    if (txt === undefined) { marco(x, 'code', `<div class="gh-404"><h2>404</h2><p>No existe <code>${esc(p)}</code> en ${esc(rama)}.</p></div>`); enlazarCabecera(x); return; }
    const lineas = txt.replace(/\n$/, '').split('\n');
    const esMd = /\.md$/i.test(p);
    const vista = query.get('plain') === '1' || !esMd ? 'code' : 'preview';
    const migas = `<div class="gh-migas gh-migas-file"><a class="gh-b" href="${repoUrl(x, 'tree', rama)}">${esc(x.repo)}</a>${p.split('/').map((s, i, arr) => `<span class="gh-crumb-sep">/</span>${i === arr.length - 1 ? `<b>${esc(s)}</b>` : `<a href="${repoUrl(x, 'tree', rama, arr.slice(0, i + 1).join('/'))}">${esc(s)}</a>`}`).join('')}${btn('', { ico: 'copy', sm: true, attr: `data-copiar="${esc(p)}" title="Copy path" class="gh-btn gh-btn-sm gh-btn-inv"` })}</div>`;
    let cuerpoArchivo;
    if (conBlame) {
      const bl = blame(r, tip, p);
      let previo = null;
      cuerpoArchivo = `<table class="gh-blame">${bl.map((l, i) => { const nuevo = l.c.sha !== previo; previo = l.c.sha; return `<tr class="${nuevo ? 'gh-bl-ini' : ''}"><td class="gh-bl-c">${nuevo ? `<span class="gh-dim">${hace(l.c.date)}</span> ${avatar(l.c.author, 16)} <a href="${repoUrl(x, 'commit', l.c.sha)}">${esc(titulo(l.c.msg))}</a>` : ''}</td><td class="gh-num">${i + 1}</td><td class="gh-cod">${resaltar(l.x, p) || ' '}</td></tr>`; }).join('')}</table>`;
    } else if (vista === 'preview') cuerpoArchivo = `<div class="gh-box-b gh-readme-b">${md(txt, x)}</div>`;
    else cuerpoArchivo = `<table class="gh-blob">${lineas.map((l, i) => `<tr id="L${i + 1}"><td class="gh-num"><a href="#">${i + 1}</a></td><td class="gh-cod">${resaltar(l, p) || ' '}</td></tr>`).join('')}</table>`;
    const c = ultimoCambio(r, tip, p);
    const contribs = [...new Set(historia(r, tip, p).map((k) => k.author))];
    const protegida = !!(r.config.proteccion[rama] && r.config.proteccion[rama].requierePR);
    const cuerpo = `<div class="gh-fileview">
      <div class="gh-code-bar">${selectorRama(x, rama, (b) => repoUrl(x, 'blob', b, p))}${migas}<span class="gh-sp"></span>${btn('', { ico: 'kebab-horizontal', sm: true, attr: 'data-noop2' })}</div>
      ${c ? `<div class="gh-box gh-lastc-box"><div class="gh-lastc">${avatar(c.author)}<b>${esc(c.author)}</b><a class="gh-lastc-m" href="${repoUrl(x, 'commit', c.sha)}">${esc(titulo(c.msg))}</a><span class="gh-sp"></span><a class="gh-mono gh-dim" href="${repoUrl(x, 'commit', c.sha)}">${corto(c.sha)}</a><span class="gh-dim">· ${hace(c.date)}</span><a class="gh-lastc-h" href="${repoUrl(x, 'commits', rama) + '?path=' + encodeURIComponent(p)}">${oc('history')} History</a></div><div class="gh-contribs">${contribs.map((u) => avatar(u, 20)).join('')} <span class="gh-dim">${contribs.length} contributor${contribs.length > 1 ? 's' : ''}</span></div></div>` : ''}
      <div class="gh-box"><div class="gh-box-h gh-file-h"><span class="gh-seg">${esMd ? `<a class="${vista === 'preview' && !conBlame ? 'sel' : ''}" href="${repoUrl(x, 'blob', rama, p)}">Preview</a>` : ''}<a class="${vista === 'code' && !conBlame ? 'sel' : ''}" href="${repoUrl(x, 'blob', rama, p)}${esMd ? '?plain=1' : ''}">Code</a><a class="${conBlame ? 'sel' : ''}" href="${repoUrl(x, 'blame', rama, p)}">Blame</a></span>
        <span class="gh-dim gh-sm">${lineas.length} lines (${lineas.filter((l) => l.trim()).length} loc) · ${txt.length < 1024 ? txt.length + ' Bytes' : (txt.length / 1024).toFixed(1) + ' KB'}</span><span class="gh-sp"></span>
        ${btn('Raw', { sm: true, attr: 'id="ghRaw"' })}${btn('', { ico: 'copy', sm: true, attr: `data-copiar-txt title="Copy raw file"` })}${btn('', { ico: 'download', sm: true, attr: 'id="ghDescargar" title="Download raw file"' })}
        ${r.branches[rama] ? `<a class="gh-btn gh-btn-sm" href="${repoUrl(x, 'edit', rama, p)}" title="${protegida ? 'Edit this file (main está protegida: se propondrá en una rama nueva)' : 'Edit this file'}">${oc('pencil')}</a><button class="gh-btn gh-btn-sm" id="ghBorrar" title="Delete file">${oc('trash')}</button>` : ''}</div>
        ${cuerpoArchivo}</div></div>`;
    marco(x, 'code', cuerpo, { ancho: true });
    enlazarCabecera(x); enlazarSelectorRama(main);
    const cp = main.querySelector('[data-copiar-txt]'); if (cp) cp.addEventListener('click', () => copiar(txt));
    main.querySelector('#ghRaw').addEventListener('click', () => { const w = window.open('', '_blank'); if (w) { w.document.write(`<pre style="white-space:pre-wrap;font:12px ui-monospace,monospace">${esc(txt)}</pre>`); w.document.title = p; } });
    main.querySelector('#ghDescargar').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.download = p.split('/').pop(); a.click(); });
    const bo = main.querySelector('#ghBorrar'); if (bo) bo.addEventListener('click', () => ir(repoUrl(x, 'delete', rama, p)));
    main.querySelectorAll('.gh-blob .gh-num a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); main.querySelectorAll('.gh-blob tr.sel').forEach((t) => t.classList.remove('sel')); a.closest('tr').classList.add('sel'); }));
    const nd = main.querySelector('[data-noop2]'); if (nd) nd.addEventListener('click', () => toast('(práctica) usa Raw, Blame o History'));
  }
  // editar / crear / borrar / subir archivos desde el navegador
  function vistaEditar(x, partes, modo) {
    const r = x.r;
    const { rama, ruta: p } = ramaYRuta(r, partes);
    if (!r.branches[rama] && Object.keys(r.branches).length) { ir(repoUrl(x)); return; }
    const snap = snapDe(r, r.branches[rama]);
    const nuevo = modo === 'new', borrar = modo === 'delete', subir = modo === 'upload';
    const dir = nuevo || subir ? p : p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
    const nombreIni = nuevo ? query.get('archivo') || '' : p.split('/').pop();
    const txt = nuevo ? (query.get('contenido') || '') : snap[p];
    if (!nuevo && !subir && txt === undefined) { ir(repoUrl(x, 'tree', rama)); return; }
    const prot = r.config.proteccion[rama] && r.config.proteccion[rama].requierePR;
    const msgDef = borrar ? `Delete ${nombreIni}` : nuevo ? 'Create ' + (nombreIni || 'new file') : subir ? 'Add files via upload' : `Update ${nombreIni}`;
    const cuerpo = `<div class="gh-editar">
      <div class="gh-code-bar"><div class="gh-migas"><a class="gh-b" href="${repoUrl(x, 'tree', rama)}">${esc(x.repo)}</a>${dir ? dir.split('/').map((s) => `<span class="gh-crumb-sep">/</span><span>${esc(s)}</span>`).join('') : ''}<span class="gh-crumb-sep">/</span>${borrar ? `<b>${esc(nombreIni)}</b>` : subir ? '' : `<input class="gh-input gh-input-sm" id="edNombre" value="${esc(nombreIni)}" placeholder="Name your file…">`}<span class="gh-dim gh-ml">in</span> <span class="gh-label-rama">${esc(rama)}</span></div><span class="gh-sp"></span>
      ${btn('Cancel changes', { href: nuevo || subir ? repoUrl(x, 'tree', rama, dir) : repoUrl(x, 'blob', rama, p) })}${btn(borrar ? 'Commit changes...' : 'Commit changes...', { tipo: 'primary', attr: 'id="edCommit"' })}</div>
      ${prot ? `<div class="gh-flash gh-flash-warn">${oc('shield')} <span>You can’t commit to <b>${esc(rama)}</b> because it is a protected branch. Your changes will be committed to a new branch so you can open a pull request.</span></div>` : ''}
      ${borrar ? `<div class="gh-box"><div class="gh-box-b gh-centro"><p>${oc('trash', '', 24)}</p><p>Vas a borrar <code>${esc(p)}</code>. El archivo sigue en la historia de git: puedes recuperarlo desde un commit anterior.</p></div></div>`
        : subir ? `<div class="gh-box gh-drop" id="edDrop"><div class="gh-box-b gh-centro"><p>${oc('upload', '', 32)}</p><p><b>Drag files here to add them to your repository</b></p><p>Or <label class="gh-link">choose your files<input type="file" id="edFiles" multiple hidden></label></p><div id="edLista" class="gh-dim"></div></div></div>`
        : `<div class="gh-box"><div class="gh-box-h"><span class="gh-seg"><a class="sel" data-edtab="edit">Edit</a><a data-edtab="preview">Preview</a></span><span class="gh-sp"></span><span class="gh-dim gh-sm">Spaces · 4 · No wrap</span></div><textarea class="gh-editor gh-mono" id="edTxt" spellcheck="false">${esc(txt || '')}</textarea><div class="gh-box-b" id="edPrev" hidden></div></div>`}
      <div class="gh-modal-fondo" id="edModal" hidden><div class="gh-modal"><div class="gh-modal-h"><b>Commit changes</b><button class="gh-ib" data-cerrar>${oc('x')}</button></div><div class="gh-modal-b">
        <label class="gh-lbl">Commit message</label><input class="gh-input" id="edMsg" value="${esc(msgDef)}"><label class="gh-lbl">Extended description</label><textarea class="gh-input" id="edDesc" rows="3" placeholder="Add an optional extended description..."></textarea>
        <label class="gh-radio"><input type="radio" name="edDonde" value="directo"${prot ? ' disabled' : ' checked'}><div>${oc('git-commit')} Commit directly to the <span class="gh-label-rama">${esc(rama)}</span> branch${prot ? '<div class="gh-rojo gh-sm">Protected: changes must be made through a pull request.</div>' : ''}</div></label>
        <label class="gh-radio"><input type="radio" name="edDonde" value="rama"${prot ? ' checked' : ''}><div>${oc('git-pull-request')} Create a <b>new branch</b> for this commit and start a pull request<div><input class="gh-input gh-input-sm" id="edRama" value="${esc(YO)}-patch-${Object.keys(r.branches).filter((b) => b.startsWith(YO + '-patch')).length + 1}"></div></div></label>
      </div><div class="gh-modal-p">${btn('Cancel', { attr: 'data-cerrar' })}${btn(borrar ? 'Commit changes' : 'Commit changes', { tipo: 'primary', attr: 'id="edOk"' })}</div></div></div></div>`;
    marco(x, 'code', cuerpo, { ancho: true });
    enlazarCabecera(x);
    const ta = main.querySelector('#edTxt');
    if (ta) {
      ta.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 4; } });
      main.querySelectorAll('[data-edtab]').forEach((t) => t.addEventListener('click', () => {
        main.querySelectorAll('[data-edtab]').forEach((y) => y.classList.toggle('sel', y === t));
        const prev = t.dataset.edtab === 'preview', pv = main.querySelector('#edPrev');
        ta.hidden = prev; pv.hidden = !prev;
        if (prev) { const nom = (main.querySelector('#edNombre') || {}).value || p; pv.innerHTML = /\.md$/i.test(nom) ? md(ta.value, x) : tablaDiff({ ops: diffLineas(txt || null, ta.value), ruta: nom, tipo: 'modified' }, { todo: true }); }
      }));
      setTimeout(() => ta.focus(), 30);
    }
    let subidos = {};
    const fi = main.querySelector('#edFiles');
    const leer = async (files) => { for (const f of files) { if (f.size > 1e6) { toast(`${f.name}: más de 1 MB, no se sube en la práctica`); continue; } subidos[(dir ? dir + '/' : '') + f.name] = await f.text(); } main.querySelector('#edLista').innerHTML = Object.keys(subidos).map((k) => `${oc('file')} ${esc(k)}`).join('<br>'); };
    if (fi) fi.addEventListener('change', () => leer(fi.files));
    const dz = main.querySelector('#edDrop');
    if (dz) { dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('sobre'); }); dz.addEventListener('dragleave', () => dz.classList.remove('sobre')); dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('sobre'); leer(e.dataTransfer.files); }); }
    const modal = main.querySelector('#edModal');
    main.querySelector('#edCommit').addEventListener('click', () => {
      if (!borrar && !subir) { const nom = main.querySelector('#edNombre').value.trim(); if (!nom) { toast('Ponle nombre al archivo'); return; } const msg = main.querySelector('#edMsg'); if (msg.value === msgDef && nuevo) msg.value = `Create ${nom}`; }
      if (subir && !Object.keys(subidos).length) { toast('Elige al menos un archivo'); return; }
      modal.hidden = false; main.querySelector('#edMsg').focus();
    });
    modal.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => { modal.hidden = true; }));
    main.querySelector('#edOk').addEventListener('click', () => {
      const msg = main.querySelector('#edMsg').value.trim() || msgDef, desc = main.querySelector('#edDesc').value.trim();
      const cambios = {};
      if (borrar) cambios[p] = null;
      else if (subir) Object.assign(cambios, subidos);
      else {
        const nom = main.querySelector('#edNombre').value.trim().replace(/^\/+/, '');
        const destino = (dir ? dir + '/' : '') + nom;
        if (nuevo && snap[destino] !== undefined) { toast(`A file with the same name already exists: ${destino}`); return; }
        if (!nuevo && destino !== p) cambios[p] = null;
        let v = ta.value; if (v && !v.endsWith('\n')) v += '\n';
        cambios[destino] = v;
        if (!nuevo && destino === p && v === txt) { toast('No hay cambios para commitear'); return; }
      }
      const donde = (main.querySelector('[name=edDonde]:checked') || {}).value;
      const full = desc ? `${msg}\n\n${desc}` : msg;
      if (donde === 'rama') {
        const nr = main.querySelector('#edRama').value.trim().replace(/\s+/g, '-');
        if (!nr) { toast('Ponle nombre a la rama'); return; }
        if (r.branches[nr]) { toast(`La rama ${nr} ya existe`); return; }
        r.branches[nr] = r.branches[rama];
        commitear(x, nr, cambios, full);
        ir(repoUrl(x, 'compare', `${rama}...${nr}`) + '?expand=1');
      } else {
        if (!Object.keys(r.branches).length) { commitear(x, 'main', cambios, full); ir(repoUrl(x)); return; }
        commitear(x, rama, cambios, full);
        ir(borrar ? repoUrl(x, 'tree', rama, dir) : subir ? repoUrl(x, 'tree', rama, dir) : repoUrl(x, 'blob', rama, Object.keys(cambios).find((k) => cambios[k] !== null)));
      }
    });
  }

  // ------------------------------------------------------------------ commits
  function vistaCommits(x, partes) {
    const r = x.r;
    const { rama } = partes.length ? ramaYRuta(r, partes) : { rama: ramaDefecto(r) };
    const tip = tipDe(r, rama); if (!tip) { ir(repoUrl(x)); return; }
    const pf = query.get('path') || undefined;
    const hs = historia(r, tip, pf);
    const grupos = new Map();
    for (const c of hs) { const d = new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); if (!grupos.has(d)) grupos.set(d, []); grupos.get(d).push(c); }
    const cuerpo = `<div class="gh-commits"><h1 class="gh-h2">Commits${pf ? ` <span class="gh-dim gh-sm">· History for <code>${esc(pf)}</code></span>` : ''}</h1>
      <div class="gh-code-bar">${selectorRama(x, rama, (b) => repoUrl(x, 'commits', b))}<span class="gh-sp"></span>${pf ? btn('Clear path', { sm: true, href: repoUrl(x, 'commits', rama) }) : ''}</div>
      ${[...grupos].map(([d, cs]) => `<div class="gh-cgrupo"><div class="gh-cgrupo-t">${oc('git-commit')} Commits on ${esc(d)}</div><div class="gh-box">${cs.map((c) => `<div class="gh-crow"><div class="gh-grow"><a class="gh-crow-m" href="${repoUrl(x, 'commit', c.sha)}">${esc(titulo(c.msg))}</a>${cuerpoMsg(c.msg) ? `<button class="gh-btn gh-btn-xs" data-exp>…</button><pre class="gh-crow-b" hidden>${esc(cuerpoMsg(c.msg))}</pre>` : ''}<div class="gh-dim gh-sm">${avatar(c.author, 16)} <b>${esc(c.author)}</b> committed ${hace(c.date)} ${estadoChecks(x, c.sha)}</div></div>
        <div class="gh-crow-d"><a class="gh-btn gh-btn-sm gh-mono" href="${repoUrl(x, 'commit', c.sha)}">${corto(c.sha)}</a>${btn('', { ico: 'copy', sm: true, attr: `data-copiar="${c.sha}" title="Copy full SHA"` })}<a class="gh-btn gh-btn-sm" href="${repoUrl(x, 'tree', c.sha)}" title="Browse repository at this point in the history">${oc('code')}</a></div></div>`).join('')}</div></div>`).join('')}</div>`;
    marco(x, 'code', cuerpo);
    enlazarCabecera(x); enlazarSelectorRama(main);
    main.querySelectorAll('[data-exp]').forEach((b) => b.addEventListener('click', () => { const pre = b.nextElementSibling; pre.hidden = !pre.hidden; }));
    main.querySelectorAll('[data-copiar]').forEach((b) => b.addEventListener('click', () => copiar(b.dataset.copiar)));
  }
  // título de commit con #n enlazado
  function md0(t, x) { return esc(t).replace(/(^|\s|\()#(\d+)\b/g, (m, a, n) => `${a}<a href="${repoUrl(x, 'issues', n)}" class="gh-ref">#${n}</a>`); }
  function vistaCommit(x, sha0) {
    const r = x.r, sha = Object.keys(r.commits).find((h) => h.startsWith(sha0));
    if (!sha) { marco(x, 'code', `<div class="gh-404"><h2>404</h2><p>No existe el commit ${esc(sha0)}.</p></div>`); enlazarCabecera(x); return; }
    const c = r.commits[sha], cs = cambiosEntre(c.parent ? snapDe(r, c.parent) : {}, c.snap);
    const mas = cs.reduce((a, b) => a + b.mas, 0), menos = cs.reduce((a, b) => a + b.menos, 0);
    const ramas = Object.keys(r.branches).filter((b) => ancestros(r, r.branches[b]).has(sha));
    const cuerpo = `<div class="gh-commit"><div class="gh-box"><div class="gh-box-b"><h1 class="gh-h2">${md0(titulo(c.msg), x)}</h1>${cuerpoMsg(c.msg) ? `<pre class="gh-commit-desc">${esc(cuerpoMsg(c.msg))}</pre>` : ''}
      <div class="gh-dim gh-sm">${oc('git-branch')} ${ramas.map((b) => `<a class="gh-label-rama" href="${repoUrl(x, 'tree', b)}">${esc(b)}</a>`).join(' ')}</div></div>
      <div class="gh-box-pie">${avatar(c.author)} <b>${esc(c.author)}</b> committed ${hace(c.date)} ${estadoChecks(x, sha)}<span class="gh-sp"></span><span class="gh-dim">${c.parent2 ? '2 parents' : '1 parent'} ${padres(c).map((h) => `<a class="gh-mono" href="${repoUrl(x, 'commit', h)}">${corto(h)}</a>`).join(' + ') || 'none'}</span> <span class="gh-dim">commit</span> <span class="gh-mono">${sha}</span></div></div>
      <div class="gh-diffstat">${oc('file-diff')} Showing <b>${cs.length} changed file${cs.length === 1 ? '' : 's'}</b> with <b>${mas} addition${mas === 1 ? '' : 's'}</b> and <b>${menos} deletion${menos === 1 ? '' : 's'}</b>.<span class="gh-sp"></span>${btn('Browse files', { sm: true, href: repoUrl(x, 'tree', sha) })}</div>
      ${cs.map((k) => archivoDiff(k, { ver: (k2) => repoUrl(x, 'blob', sha, k2.ruta) })).join('')}</div>`;
    marco(x, 'code', cuerpo, { ancho: true });
    enlazarCabecera(x); enlazarDiffs(main, cs);
  }
  function enlazarDiffs(cont, cs, o = {}) {
    cont.querySelectorAll('[data-plegar]').forEach((b) => b.addEventListener('click', () => { const f = b.closest('.gh-fdiff'); f.classList.toggle('plegado'); b.innerHTML = oc(f.classList.contains('plegado') ? 'chevron-right' : 'chevron-down'); }));
    cont.querySelectorAll('[data-copiar]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); copiar(b.dataset.copiar); }));
    cont.querySelectorAll('[data-cargar-diff]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const k = cs.find((y) => y.ruta === a.dataset.cargarDiff); a.closest('.gh-fdiff-b').innerHTML = tablaDiff(k, { ...o, todo: true }); }));
  }

  // ------------------------------------------------------------------ ramas
  function vistaRamas(x) {
    const r = x.r, def = ramaDefecto(r), base = r.branches[def];
    const fila = (b) => {
      const tip = r.branches[b], c = r.commits[tip] || {};
      const A = ancestros(r, tip), B = ancestros(r, base);
      const delante = [...A].filter((h) => !B.has(h)).length, detras = [...B].filter((h) => !A.has(h)).length;
      const pr = r.prs.filter((p) => p.rama === b).pop();
      const prot = r.config.proteccion[b];
      return `<tr><td><a class="gh-label-rama" href="${repoUrl(x, 'tree', b)}">${esc(b)}</a>${btn('', { ico: 'copy', sm: true, attr: `data-copiar="${esc(b)}" class="gh-btn gh-btn-sm gh-btn-inv"` })}${prot ? `<span title="Branch protection rule" class="gh-dim">${oc('shield-check')}</span>` : ''}</td>
        <td class="gh-dim gh-sm">${hace(c.date)} by ${esc(c.author || '')}</td><td class="gh-sm">${estadoChecks(x, tip)}</td>
        <td>${b === def ? '<span class="gh-label-vis">Default</span>' : `<span class="gh-adelanto" title="${detras} commits behind, ${delante} ahead of ${esc(def)}"><span>${detras}</span><span>${delante}</span></span>`}</td>
        <td>${pr ? `<a href="${repoUrl(x, 'pull', pr.n)}" class="gh-pr-chip gh-pr-${pr.estado}">${oc(pr.estado === 'fusionado' ? 'git-merge' : pr.estado === 'cerrado' ? 'git-pull-request-closed' : 'git-pull-request')} #${pr.n}</a>` : b !== def ? `<a class="gh-btn gh-btn-sm" href="${repoUrl(x, 'compare', `${def}...${b}`)}">New pull request</a>` : ''}</td>
        <td>${b !== def ? `<button class="gh-ib gh-rojo" data-borrar-rama="${esc(b)}" title="Delete branch">${oc('trash')}</button>` : ''}</td></tr>`;
    };
    const otras = Object.keys(r.branches).filter((b) => b !== def).sort((a, b) => String((r.commits[r.branches[b]] || {}).date).localeCompare(String((r.commits[r.branches[a]] || {}).date)) * -1);
    const cuerpo = `<div class="gh-ramas"><div class="gh-code-bar"><h1 class="gh-h2">Branches</h1><span class="gh-sp"></span>${btn('New branch', { tipo: 'primary', attr: 'id="ghNuevaRama"' })}</div>
      <nav class="gh-subtabs"><a class="sel">Overview</a><a>Yours</a><a>Active</a><a>Stale</a><a>All</a></nav>
      ${caja('<b>Default</b>', `<table class="gh-tabla-ramas">${r.branches[def] ? fila(def) : ''}</table>`)}
      ${caja('<b>Your branches</b>', otras.length ? `<table class="gh-tabla-ramas">${otras.map(fila).join('')}</table>` : '<div class="gh-box-b gh-dim">No hay otras ramas. Crea una aquí o con <code>git switch -c mi-rama</code> + <code>git push -u origin mi-rama</code>.</div>')}
      <div class="gh-modal-fondo" id="nrModal" hidden><div class="gh-modal"><div class="gh-modal-h"><b>Create a branch</b><button class="gh-ib" data-cerrar>${oc('x')}</button></div><div class="gh-modal-b"><label class="gh-lbl">New branch name</label><input class="gh-input" id="nrN"><label class="gh-lbl">Source</label><select class="gh-input" id="nrS">${Object.keys(r.branches).map((b) => `<option${b === def ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select></div><div class="gh-modal-p">${btn('Cancel', { attr: 'data-cerrar' })}${btn('Create new branch', { tipo: 'primary', attr: 'id="nrOk"' })}</div></div></div></div>`;
    marco(x, 'code', cuerpo);
    enlazarCabecera(x);
    main.querySelectorAll('[data-copiar]').forEach((b) => b.addEventListener('click', () => copiar(b.dataset.copiar)));
    const m = main.querySelector('#nrModal');
    main.querySelector('#ghNuevaRama').addEventListener('click', () => { m.hidden = false; main.querySelector('#nrN').focus(); });
    m.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => { m.hidden = true; }));
    main.querySelector('#nrOk').addEventListener('click', () => {
      const n = main.querySelector('#nrN').value.trim().replace(/\s+/g, '-');
      if (!n || !/^[\w./-]+$/.test(n) || n.endsWith('/') || n.includes('..')) { toast('Nombre de rama inválido'); return; }
      if (r.branches[n]) { toast(`Branch ${n} already exists`); return; }
      r.branches[n] = r.branches[main.querySelector('#nrS').value]; guardar(); toast(`Branch ${n} created`); render();
    });
    main.querySelectorAll('[data-borrar-rama]').forEach((b) => b.addEventListener('click', () => {
      const n = b.dataset.borrarRama;
      if (r.config.proteccion[n]) { toast('Cannot delete a protected branch'); return; }
      const abiertos = r.prs.filter((p) => p.rama === n && p.estado === 'abierto');
      if (abiertos.length && !confirm(`La rama ${n} tiene el pull request #${abiertos[0].n} abierto: se cerrará. ¿Borrar igual?`)) return;
      for (const p of abiertos) { p.estado = 'cerrado'; p.eventos.push({ tipo: 'cerrado', por: YO, fecha: ahora() }); }
      delete r.branches[n]; guardar(); toast(`Deleted branch ${n}`); render();
    }));
  }

  // ------------------------------------------------------------------ enrutador
  function render() {
    if (!main) return;
    vivos = [];
    const h = location.hash.replace(/^#\/?/, ''), [camino, qs] = h.split('?');
    query = new URLSearchParams(qs || '');
    ruta = camino.split('/').filter(Boolean).slice(1).map((s) => { try { return decodeURIComponent(s); } catch (e) { return s; } });
    conectarTerminal();
    const [a, b, c, ...resto] = ruta;
    const C = window.GitHubColab;
    if (!a) { vistaDashboard(); return; }
    if (a === 'new') { vistaNuevo(); return; }
    if ((a === 'issues' || a === 'pulls' || a === 'notifications') && !b && C) { C.vistaMias(a); return; }
    if (!b) { vistaPerfil(a); return; }
    // el repositorio de práctica del equipo existe siempre (como si la organización ya lo tuviera)
    if (!buscarRepo(a, b) && a === 'tienda-andina' && b === 'pipelines') { API().crearRemoto('https://github.com/tienda-andina/pipelines', true); guardar(); }
    const x = buscarRepo(a, b);
    if (!x) { marco(null, '', `<div class="gh-404"><h2>404</h2><p>No existe el repositorio <b>${esc(a)}/${esc(b)}</b>.</p><p>Créalo con <a href="${url('new')}">New repository</a>, con <code>gh repo create</code> o con <code>git remote add origin https://github.com/${esc(a)}/${esc(b)}.git</code> + <code>git push</code>.</p></div>`); return; }
    if (!c || c === 'tree' || c === 'blob' || c === 'blame') { vistaCode(x, c ? [c, ...resto] : []); return; }
    if (c === 'edit' || c === 'new' || c === 'delete' || c === 'upload') { vistaEditar(x, resto, c); return; }
    if (c === 'commits') { vistaCommits(x, resto); return; }
    if (c === 'commit') { vistaCommit(x, resto[0] || ''); return; }
    if (c === 'branches') { vistaRamas(x); return; }
    if (C && C.rutas[c]) { C.rutas[c](x, resto); return; }
    marco(x, 'code', `<div class="gh-404"><h2>404</h2></div>`);
  }
  function vista(m, ctx) {
    main = m; ctxApp = ctx || {};
    if (window.Shell && window.Shell.Machine && !window.Shell.Machine.ready) window.Shell.Machine.load();
    if (!API()) { main.innerHTML = '<div class="container prose"><h1>GitHub de práctica</h1><p>Necesita la terminal del curso (terminal-git.js).</p></div>'; return; }
    document.body.classList.add('gh-abierto');
    render();
  }
  window.addEventListener('hashchange', () => { if (!/^#\/github/.test(location.hash)) document.body.classList.remove('gh-abierto'); });
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('ghp') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.closest('.term')) return;
    if (e.key === '/') { e.preventDefault(); const q = document.getElementById('ghQ'); if (q) q.focus(); }
    if (e.key === 't') { const g = document.getElementById('ghGoFile'); if (g) { e.preventDefault(); g.focus(); } }
  });

  // lo que comparte con github-colab.js
  window.GitHubPractica = {
    vista, render, ir,
    _: { oc, esc, YO, GENTE, ETIQUETAS, url, repoUrl, listaRepos, buscarRepo, preparar, ramaDefecto, snapDe, corto, titulo, cuerpoMsg, ancestros, historia, cambiosEntre, diffLineas, tablaDiff, archivoDiff, enlazarDiffs,
      hace, avatar, usuario, etiqueta, md, md0, pista, caja, btn, contador, editorMd, enlazarMded, enlazarMenus, enlazarCabecera, enlazarSelectorRama, selectorRama, marco, guardar, toast, ahora, commitear,
      alPushOyentes, vivo, refrescarVivo, siguienteNumero, estadoChecks, tipDe, copiar, API, Sh, query: () => query, ruta: () => ruta, crearRepo, alternarTerminal, partesUrl, padres },
  };
})();
