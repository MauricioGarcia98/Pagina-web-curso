/* Git en equipo para la terminal del curso.
 *
 * Envuelve el comando `git` de terminal.js y agrega lo que pasa cuando trabajas con otras personas:
 * - un repositorio remoto con historia propia (clone, fetch, pull, push que puede ser rechazado),
 * - una compañera (Camila) que sube un cambio mientras trabajas: tu push se rechaza y tienes que traerlo,
 * - fusiones de tres vías con conflictos marcados línea por línea (<<<<<<< ======= >>>>>>>),
 *   merge --abort, resolución con git add + git commit,
 * - stash, rebase (--continue / --abort), reset, show, branch -a y "adelantada/atrasada" en status,
 * - gh pr create/list/view/merge: pull requests en el remoto.
 * Todo vive en Machine.git (se guarda con el resto de la terminal).
 */
(function () {
  'use strict';
  const Sh = window.Shell;
  if (!Sh || !Sh.Commands || !Sh.Commands.git || !Sh.gitInt) return;
  const { Machine, ok, fail, col, writeFile, norm, readFile, exists, mkdirp, HOME } = Sh;
  const { root: gitRoot, snapshot, ignored, hash: nuevoHash } = Sh.gitInt;
  const gitViejo = Sh.Commands.git;

  // ---------------------------------------------------------------- remotos
  const remotos = () => (Machine.git.__remotos = Machine.git.__remotos || {});
  // https://github.com/o/r, https://github.com/o/r.git y git@github.com:o/r.git son el mismo repositorio
  const clave = (url) => { const u = String(url || '').trim().replace(/\/+$/, ''); const m = /^git@([^:]+):(.+?)(\.git)?$/.exec(u); return (m ? `https://${m[1]}/${m[2]}` : u.replace(/\.git$/, '')); };
  function remoto(url) {
    const R = remotos(), k = clave(url);
    if (!R[k] && R[url] && url !== k) { R[k] = R[url]; delete R[url]; }   // guardado con la URL vieja
    return R[k];
  }
  const ahora = () => new Date().toISOString();
  const nombreRepo = (url) => String(url || 'repo').replace(/\/+$/, '').split('/').pop().replace(/\.git$/, '') || 'repo';
  const ETL = `import csv

FECHA_INICIO = "2024-01-01"
PAISES = ["Chile", "Perú"]


def cargar(ruta):
    with open(ruta, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def filtrar(filas):
    return [f for f in filas if f["pais"] in PAISES and f["fecha"] >= FECHA_INICIO]


if __name__ == "__main__":
    filas = filtrar(cargar("datos/ventas.csv"))
    print(f"{len(filas)} filas")
`;
  function crearRemoto(url, semilla) {
    const R = remotos();
    const ya = remoto(url); if (ya) return ya;
    const r = R[clave(url)] = { branches: {}, commits: {}, pendientes: [], prs: [], issues: [], nombre: nombreRepo(url) };
    if (!semilla) return r;
    r.semilla = true;
    const snap0 = {
      'README.md': `# ${r.nombre}\n\nPipelines de datos de Tienda Andina.\n\n## Cómo correrlo\n\n    python pipelines/etl.py\n`,
      'pipelines/etl.py': ETL,
      '.gitignore': '.venv/\n__pycache__/\n.env\n',
    };
    const h1 = nuevoHash(), h2 = nuevoHash();
    r.commits[h1] = { msg: 'Primer commit: estructura del proyecto', parent: null, snap: { 'README.md': snap0['README.md'], '.gitignore': snap0['.gitignore'] }, author: 'martin', date: '2024-10-01T10:00:00Z' };
    r.commits[h2] = { msg: 'ETL de ventas: cargar y filtrar por país', parent: h1, snap: snap0, author: 'martin', date: '2024-10-02T15:30:00Z' };
    r.branches.main = h2;
    // lo que la compañera va a subir mientras trabajas (aterriza en el primer fetch/pull/push después de tu primer commit)
    r.pendientes.push({ autor: 'camila', msg: 'Agrega México a los países del ETL', cambios: {
      'pipelines/etl.py': (t) => t.replace('PAISES = ["Chile", "Perú"]', 'PAISES = ["Chile", "Perú", "México"]'),
      'README.md': (t) => t + '\nPaíses incluidos: Chile, Perú y México.\n',
    } });
    // issues del equipo (se ven en la réplica de GitHub y con gh issue list)
    r.issues = [
      { n: 1, titulo: 'El ETL no incluye a México', cuerpo: 'Desde octubre también vendemos en México y el reporte de ventas no lo muestra.\n\nHay que agregarlo a `PAISES` en `pipelines/etl.py`.', estado: 'abierto', autor: 'camila', fecha: '2024-10-03T09:12:00Z', etiquetas: ['enhancement'], asignados: ['camila'], comentarios: [], eventos: [] },
      { n: 2, titulo: 'Agregar tests al ETL', cuerpo: 'No tenemos ningún test. Propuesta: `tests/test_etl.py` con pytest que pruebe `filtrar()`:\n\n- [ ] filas de un país que no está en la lista se descartan\n- [ ] filas anteriores a `FECHA_INICIO` se descartan\n\nBuen primer issue para quien llega al equipo.', estado: 'abierto', autor: 'martin', fecha: '2024-10-04T14:30:00Z', etiquetas: ['good first issue'], asignados: [], comentarios: [{ autor: 'camila', texto: '+1, y que corran en cada PR 🙏', fecha: '2024-10-04T15:02:00Z' }], eventos: [] },
      { n: 3, titulo: 'CI: correr los tests en cada pull request', cuerpo: 'Cuando existan los tests (#2), agreguemos un workflow de GitHub Actions en `.github/workflows/ci.yml` que corra `pytest` en cada PR hacia `main`.\n\nDespués protegemos `main` para que no se pueda fusionar con el check en rojo.', estado: 'abierto', autor: 'martin', fecha: '2024-10-05T10:00:00Z', etiquetas: ['enhancement', 'help wanted'], asignados: [], comentarios: [], eventos: [] },
    ];
    return r;
  }
  // las funciones de los cambios pendientes no se pueden guardar en localStorage: se recrean al cargar
  function pendientesDe(url, r) {
    if (r.pendientes && r.pendientes.length && typeof Object.values(r.pendientes[0].cambios)[0] !== 'function') {
      r.pendientes = r.pendientes.map((p) => ({ ...p, cambios: {
        'pipelines/etl.py': (t) => t.replace('PAISES = ["Chile", "Perú"]', 'PAISES = ["Chile", "Perú", "México"]'),
        'README.md': (t) => t + '\nPaíses incluidos: Chile, Perú y México.\n',
      } }));
    }
    return r.pendientes || [];
  }
  function aterrizarCompas(url, g) {
    const r = remoto(url); if (!r) return;
    const pend = pendientesDe(url, r);
    if (!pend.length) return;
    // la compañera sube su cambio cuando ya hiciste algún commit propio (así hay algo que fusionar)
    const propios = Object.keys(g.commits).some((h) => !r.commits[h]);
    if (!propios || !r.branches.main) return;
    for (const p of pend) {
      const tip = r.branches.main, snap = { ...r.commits[tip].snap };
      for (const [k, f] of Object.entries(p.cambios)) if (snap[k] !== undefined) snap[k] = f(snap[k]);
      const h = nuevoHash();
      r.commits[h] = { msg: p.msg, parent: tip, snap, author: p.autor, date: ahora() };
      r.branches.main = h;
    }
    r.pendientes = [];
  }

  // la réplica de GitHub escucha los push (Actions, pull requests, Pages)
  const oyentesPush = [];
  function avisarPush(url, rama, antes, despues) { for (const f of oyentesPush) { try { f(clave(url), rama, antes, despues); } catch (e) { console.error(e); } } }

  // ---------------------------------------------------------------- historia
  function todos(g) { return Object.assign({}, ...Object.values(remotos()).map((r) => r.commits), g.commits); }
  function ancestros(C, h) {
    const vistos = new Set(), pila = [h];
    while (pila.length) { const x = pila.pop(); if (!x || vistos.has(x) || !C[x]) continue; vistos.add(x); pila.push(C[x].parent, C[x].parent2); }
    return vistos;
  }
  function baseComun(C, a, b) {
    const A = ancestros(C, a), cola = [b], vistos = new Set();
    while (cola.length) { const x = cola.shift(); if (!x || vistos.has(x) || !C[x]) continue; vistos.add(x); if (A.has(x)) return x; cola.push(C[x].parent, C[x].parent2); }
    return null;
  }
  function resolverRef(g, ref) {
    if (!ref || ref === 'HEAD') return g.branches[g.branch];
    let m = /^(.+?)~(\d+)$/.exec(ref);
    if (m) { let h = resolverRef(g, m[1]); const C = todos(g); for (let i = 0; i < Number(m[2]) && h; i++) h = C[h].parent; return h; }
    if (g.branches[ref] !== undefined) return g.branches[ref];
    if (g.tracking && g.tracking[ref] !== undefined) return g.tracking[ref];
    const C = todos(g);
    if (C[ref]) return ref;
    return Object.keys(C).find((h) => h.startsWith(ref) && ref.length >= 4);
  }

  // ---------------------------------------------------------------- diff y fusión de tres vías (por líneas)
  function hunks(a, b) {
    // LCS entre las líneas de a y b → tramos de a reemplazados por líneas de b
    const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0, cur = null;
    const cerrar = () => { if (cur) { out.push(cur); cur = null; } };
    while (i < n || j < m) {
      if (i < n && j < m && a[i] === b[j]) { cerrar(); i++; j++; continue; }
      if (!cur) cur = { s: i, e: i, lineas: [] };
      if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { cur.lineas.push(b[j]); j++; } else { i++; cur.e = i; }
    }
    cerrar();
    return out;
  }
  function fusion3(base, nuestro, suyo, etiqueta) {
    if (nuestro === suyo) return { texto: nuestro, conflicto: false };
    if (nuestro === base) return { texto: suyo, conflicto: false };
    if (suyo === base) return { texto: nuestro, conflicto: false };
    const B = base.split('\n'), O = nuestro.split('\n'), T = suyo.split('\n');
    const ho = hunks(B, O).map((h) => ({ ...h, de: 'o' })), ht = hunks(B, T).map((h) => ({ ...h, de: 't' }));
    const todosH = [...ho, ...ht].sort((x, y) => x.s - y.s || x.e - y.e);
    const res = []; let pos = 0, conflicto = false, k = 0;
    while (k < todosH.length) {
      // agrupar los tramos que se tocan o se superponen
      let grupo = [todosH[k]], s = todosH[k].s, e = todosH[k].e; k++;
      while (k < todosH.length && todosH[k].s <= e) { grupo.push(todosH[k]); e = Math.max(e, todosH[k].e); k++; }
      res.push(...B.slice(pos, s));
      const aplicar = (lado) => { const hs = grupo.filter((h) => h.de === lado); if (!hs.length) return B.slice(s, e); const r = []; let p = s; for (const h of hs) { r.push(...B.slice(p, h.s), ...h.lineas); p = h.e; } r.push(...B.slice(p, e)); return r; };
      const vo = aplicar('o'), vt = aplicar('t');
      const lados = new Set(grupo.map((h) => h.de));
      if (lados.size === 1) res.push(...(lados.has('o') ? vo : vt));
      else if (vo.join('\n') === vt.join('\n')) res.push(...vo);
      else { conflicto = true; res.push('<<<<<<< HEAD', ...vo, '=======', ...vt, `>>>>>>> ${etiqueta}`); }
      pos = e;
    }
    res.push(...B.slice(pos));
    return { texto: res.join('\n'), conflicto };
  }
  function fusionarSnaps(sb, so, st, etiqueta) {
    const snap = {}, conflictos = [];
    for (const k of new Set([...Object.keys(sb), ...Object.keys(so), ...Object.keys(st)])) {
      const b = sb[k], o = so[k], t = st[k];
      if (o === t) { if (o !== undefined) snap[k] = o; continue; }
      if (o === b) { if (t !== undefined) snap[k] = t; continue; }
      if (t === b) { if (o !== undefined) snap[k] = o; continue; }
      if (o === undefined || t === undefined) { snap[k] = o === undefined ? t : o; conflictos.push(k); continue; }
      const f = fusion3(b === undefined ? '' : b, o, t, etiqueta);
      snap[k] = f.texto; if (f.conflicto) conflictos.push(k);
    }
    return { snap, conflictos };
  }
  const tieneMarcas = (t) => /^(<<<<<<< |=======$|>>>>>>> )/m.test(t || '');

  // ---------------------------------------------------------------- utilidades del repo
  function escribirArbol(root, desde, hacia) {
    for (const k of Object.keys(desde)) if (hacia[k] === undefined) delete Machine.fs[root + '/' + k];
    for (const [k, v] of Object.entries(hacia)) if (readFile(root + '/' + k) !== v) writeFile(root + '/' + k, v);
  }
  function cambiosSinCommit(g, root) {
    const head = g.branches[g.branch], hs = head ? todos(g)[head].snap : {}, work = snapshot(root);
    if (Object.keys(g.staged || {}).length) return true;
    return Object.keys(hs).some((k) => work[k] !== hs[k] && !ignored(root, k));
  }
  function asegurarCommits(g, C, h) { for (const x of ancestros(C, h)) if (!g.commits[x]) g.commits[x] = C[x]; }
  const corto = (h) => (h || '').slice(0, 7);
  function adelantoAtraso(g, a, b) {
    const C = todos(g); if (!a || !b) return [0, 0];
    const A = ancestros(C, a), B = ancestros(C, b);
    return [[...A].filter((x) => !B.has(x)).length, [...B].filter((x) => !A.has(x)).length];
  }

  // ---------------------------------------------------------------- merge
  function fusionar(g, root, ref, etiqueta) {
    const C = todos(g), head = g.branches[g.branch], theirs = resolverRef(g, ref);
    if (!theirs) return fail(`merge: ${ref} - no es algo que podamos fusionar`);
    if (cambiosSinCommit(g, root)) return fail('error: Tus cambios locales serían sobrescritos por la fusión.\nPor favor, confirma tus cambios (commit) o guárdalos (stash) antes de fusionar.\nAbortando');
    if (!head) { g.branches[g.branch] = theirs; asegurarCommits(g, C, theirs); escribirArbol(root, {}, C[theirs].snap); Machine.save(); return ok(`Avance rápido a ${ref}`); }
    const A = ancestros(C, head);
    if (A.has(theirs)) return ok('Ya está actualizado.');
    asegurarCommits(g, C, theirs);
    if (ancestros(C, theirs).has(head)) {
      escribirArbol(root, C[head].snap, C[theirs].snap);
      g.branches[g.branch] = theirs; Machine.save();
      const cambiados = Object.keys({ ...C[head].snap, ...C[theirs].snap }).filter((k) => C[head].snap[k] !== C[theirs].snap[k]);
      return ok(`Actualizando ${corto(head)}..${corto(theirs)}\nFast-forward\n${cambiados.map((k) => ` ${k}`).join('\n')}\n ${cambiados.length} archivo(s) cambiado(s)`);
    }
    const base = baseComun(C, head, theirs);
    const r = fusionarSnaps(base ? C[base].snap : {}, C[head].snap, C[theirs].snap, etiqueta || ref);
    escribirArbol(root, C[head].snap, r.snap);
    if (r.conflictos.length) {
      g.merge = { theirs, etiqueta: etiqueta || ref, conflictos: r.conflictos.slice(), msg: `Merge ${ref.includes('/') ? `remote-tracking branch '${ref}'` : `branch '${ref}'`} into ${g.branch}` };
      g.staged = {};
      for (const k of Object.keys(r.snap)) if (!r.conflictos.includes(k) && r.snap[k] !== C[head].snap[k]) g.staged[k] = r.snap[k];
      for (const k of Object.keys(C[head].snap)) if (r.snap[k] === undefined) g.staged[k] = null;
      Machine.save();
      return { out: r.conflictos.map((k) => `Auto-fusionando ${k}\n${col.err('CONFLICTO (contenido)')}: Conflicto de fusión en ${k}`).join('\n') + `\nFusión automática falló; arregla los conflictos y luego haz commit del resultado.\n${col.dim('(abre el archivo, elige qué queda entre <<<<<<< y >>>>>>>, borra las marcas, y después: git add <archivo> y git commit)')}`, code: 1 };
    }
    const h = nuevoHash();
    g.commits[h] = { msg: `Merge ${ref.includes('/') ? `remote-tracking branch '${ref}'` : `branch '${ref}'`} into ${g.branch}`, parent: head, parent2: theirs, snap: r.snap, author: 'alumno', date: ahora() };
    g.branches[g.branch] = h; g.staged = {}; Machine.save();
    return ok(`Merge made by the 'ort' strategy.\n${Object.keys(r.snap).filter((k) => r.snap[k] !== C[head].snap[k]).map((k) => ` ${k}`).join('\n')}`);
  }

  // ---------------------------------------------------------------- rebase
  function rebasar(g, root, ref) {
    const C = todos(g), head = g.branches[g.branch], onto = resolverRef(g, ref);
    if (!onto) return fail(`fatal: upstream inválido '${ref}'`, 128);
    if (cambiosSinCommit(g, root)) return fail('error: no se puede hacer rebase: tienes cambios sin confirmar.\nerror: por favor, haz commit o stash de ellos.');
    asegurarCommits(g, C, onto);
    if (ancestros(C, head).has(onto)) return ok(`La rama actual ${g.branch} está actualizada.`);
    if (ancestros(C, onto).has(head)) { escribirArbol(root, C[head].snap, C[onto].snap); g.branches[g.branch] = onto; Machine.save(); return ok(`Avance rápido de ${g.branch} a ${ref}.`); }
    const base = baseComun(C, head, onto), lista = [];
    for (let x = head; x && x !== base; x = C[x].parent) lista.unshift(x);
    g.rebase = { original: head, onto: ref, actual: onto, restantes: lista, rama: g.branch, conflictos: [] };
    escribirArbol(root, C[head].snap, C[onto].snap);
    g.branches[g.branch] = onto;
    return seguirRebase(g, root);
  }
  function seguirRebase(g, root) {
    const C = todos(g), rb = g.rebase, salida = [];
    while (rb.restantes.length) {
      const h = rb.restantes[0], c = C[h];
      const parentSnap = c.parent ? C[c.parent].snap : {};
      const r = fusionarSnaps(parentSnap, C[rb.actual].snap, c.snap, `${corto(h)} (${c.msg})`);
      escribirArbol(root, snapshot(root), r.snap);
      if (r.conflictos.length) {
        rb.conflictos = r.conflictos.slice(); Machine.save();
        return { out: salida.concat(r.conflictos.map((k) => `Auto-fusionando ${k}\n${col.err('CONFLICTO (contenido)')}: Conflicto de fusión en ${k}`)).join('\n') + `\nerror: no se pudo aplicar ${corto(h)}... ${c.msg}\n${col.dim('Resuelve el conflicto, después "git add <archivo>" y "git rebase --continue". Para volver atrás: "git rebase --abort".')}`, code: 1 };
      }
      const nh = nuevoHash();
      g.commits[nh] = { msg: c.msg, parent: rb.actual, snap: r.snap, author: c.author, date: ahora() };
      rb.actual = nh; rb.restantes.shift(); g.branches[rb.rama] = nh;
    }
    g.branches[rb.rama] = rb.actual; const rama = rb.rama, onto = rb.onto;
    delete g.rebase; g.staged = {}; Machine.save();
    return ok(salida.concat([`Se aplicó un rebase exitosamente y se actualizó refs/heads/${rama} sobre ${onto}.`]).join('\n'));
  }

  // ---------------------------------------------------------------- el comando
  Sh.def('git', 'control de versiones con remoto, conflictos, stash, rebase y pull requests', (a, ctx) => {
    const sub = a[0];
    if (sub === 'clone') {
      const url = a.slice(1).find((x) => !x.startsWith('-')) || '';
      if (!url) return fail('fatal: Tienes que especificar un repositorio para clonar.', 128);
      const dir = a.slice(1).filter((x) => !x.startsWith('-'))[1] || nombreRepo(url);
      const r0 = norm(dir);
      if (exists(r0) && Object.keys(Machine.fs).some((k) => k.startsWith(r0 + '/'))) return fail(`fatal: la ruta de destino '${dir}' ya existe y no es un directorio vacío.`, 128);
      const rem = crearRemoto(url, true);
      const tip = rem.branches.main || Object.values(rem.branches)[0];
      if (!tip) {
        Machine.git[r0] = { branch: 'main', branches: {}, commits: {}, staged: {}, remotes: { origin: url }, tracking: {}, upstream: {} };
        mkdirp(r0 + '/.git'); Machine.save();
        return ok(`Clonando en '${dir}'...\nwarning: Pareces haber clonado un repositorio vacío.`);
      }
      const g = Machine.git[r0] = { branch: 'main', branches: { main: tip }, commits: {}, staged: {}, remotes: { origin: url }, tracking: { 'origin/main': tip }, upstream: { main: 'origin/main' } };
      asegurarCommits(g, rem.commits, tip);
      mkdirp(r0 + '/.git');
      escribirArbol(r0, {}, rem.commits[tip].snap);
      Machine.save();
      const n = ancestros(rem.commits, tip).size;
      return ok(`Clonando en '${dir}'...\nremote: Enumerating objects: ${n * 4}, done.\nremote: Total ${n * 4} (delta 1), reused ${n * 4} (delta 1)\nRecibiendo objetos: 100% (${n * 4}/${n * 4}), listo.`);
    }
    const root = gitRoot();
    if (!root || ['init', 'config', '--version', 'version', '--help', '-h', 'help', undefined].includes(sub)) return gitViejo(a, ctx);
    const g = Machine.git[root];
    g.tracking = g.tracking || {}; g.upstream = g.upstream || {};
    const C = () => todos(g);
    const head = g.branches[g.branch];

    if (g.rebase && !['rebase', 'status', 'add', 'diff', 'log', 'show', 'restore'].includes(sub)) return fail(`error: hay un rebase en curso en ${g.rebase.rama}. Termínalo con "git rebase --continue" o deshazlo con "git rebase --abort".`);

    switch (sub) {
      case 'remote': {
        if (a[1] === 'add' && a[2] && a[3]) { g.remotes[a[2]] = a[3]; crearRemoto(a[3], false); Machine.save(); return ok(''); }
        if (a[1] === 'remove' || a[1] === 'rm') { delete g.remotes[a[2]]; Machine.save(); return ok(''); }
        return gitViejo(a, ctx);
      }
      case 'fetch': case 'pull': {
        const rem = a.slice(1).find((x) => !x.startsWith('-')) || 'origin';
        const url = g.remotes[rem];
        if (!url) return fail(`fatal: '${rem}' no parece ser un repositorio git\nfatal: No se pudo leer del repositorio remoto.`, 128);
        aterrizarCompas(url, g);
        const R = remoto(url) || crearRemoto(url, false);
        const lineas = [];
        for (const [b, h] of Object.entries(R.branches)) {
          const antes = g.tracking[`${rem}/${b}`];
          if (antes !== h) { asegurarCommits(g, R.commits, h); lineas.push(antes ? `   ${corto(antes)}..${corto(h)}  ${b.padEnd(10)} -> ${rem}/${b}` : ` * [nueva rama]      ${b.padEnd(10)} -> ${rem}/${b}`); g.tracking[`${rem}/${b}`] = h; }
        }
        Machine.save();
        const cab = lineas.length ? `remote: Enumerating objects: ${lineas.length * 5}, done.\nDesde ${url}\n${lineas.join('\n')}` : '';
        if (sub === 'fetch') return ok(cab);
        const rama = a.slice(1).filter((x) => !x.startsWith('-'))[1] || g.branch;
        const ref = `${rem}/${rama}`;
        if (g.tracking[ref] === undefined) return fail(`${cab}\nfatal: no se encontró la referencia remota ${rama}`, 1);
        const r = a.includes('--rebase') ? rebasar(g, root, ref) : fusionar(g, root, ref, ref);
        return { ...r, out: [cab, r.out].filter(Boolean).join('\n') };
      }
      case 'push': {
        const pos = a.slice(1).filter((x) => !x.startsWith('-'));
        const rem = pos[0] || 'origin', rama = pos[1] || g.branch;
        const url = g.remotes[rem];
        if (!url) return fail(`fatal: '${rem}' no parece ser un repositorio git\nfatal: No se pudo leer del repositorio remoto. (agrega uno con: git remote add origin URL)`, 128);
        const local = g.branches[rama];
        if (!local) return fail(`error: src refspec ${rama} no concuerda con ninguno\nerror: falló el push de algunas referencias a '${url}'`, 1);
        aterrizarCompas(url, g);
        const R = remoto(url) || crearRemoto(url, false);
        const remotoTip = R.branches[rama];
        const Ct = C();
        const forzar = a.includes('-f') || a.includes('--force') || a.includes('--force-with-lease');
        const noFF = remotoTip && remotoTip !== local && !ancestros(Ct, local).has(remotoTip);
        // reglas de protección de la rama (Settings → Branches en la réplica de GitHub)
        const regla = Sh.github && Sh.github.reglaDe ? Sh.github.reglaDe(R, rama) : null;
        if (regla && remotoTip !== local) {
          const motivo = noFF && forzar && !regla.force ? 'Cannot force-push to this branch' : regla.requierePR ? 'Changes must be made through a pull request.' : regla.checks && regla.checks.length ? `${regla.checks.length} of ${regla.checks.length} required status check${regla.checks.length > 1 ? 's are' : ' is'} expected.` : null;
          if (motivo) return fail(`remote: error: GH006: Protected branch update failed for refs/heads/${rama}.\nremote: \nremote: - ${motivo}\nTo ${url}\n ${col.err('! [remote rejected]')} ${rama} -> ${rama} (protected branch hook declined)\nerror: falló el push de algunas referencias a '${url}'` + col.dim(`\n(la rama ${rama} está protegida: sube tu trabajo a otra rama y abre un pull request)`), 1);
        }
        if (noFF && forzar) {
          for (const x of ancestros(Ct, local)) if (!R.commits[x]) R.commits[x] = Ct[x];
          R.branches[rama] = local; g.tracking[`${rem}/${rama}`] = local; Machine.save();
          avisarPush(url, rama, remotoTip, local);
          return ok(`Enumerando objetos: 3, listo.\nTo ${url}\n + ${corto(remotoTip)}...${corto(local)} ${rama} -> ${rama} (forced update)` + col.dim('\n(ojo: reescribiste la historia del remoto; quien ya tenía los commits viejos va a tener problemas al hacer pull)'));
        }
        if (noFF) {
          return fail(`To ${url}\n ${col.err('! [rejected]')}        ${rama} -> ${rama} (fetch first)\nerror: falló el push de algunas referencias a '${url}'\nayuda: Las actualizaciones fueron rechazadas porque el remoto contiene trabajo que\nayuda: no tienes localmente. Esto suele pasar cuando otra persona subió cambios\nayuda: a la misma rama. Primero integra los cambios remotos (por ejemplo,\nayuda: 'git pull ...') antes de volver a hacer push.`, 1);
        }
        if (remotoTip === local) return ok('Everything up-to-date');
        for (const x of ancestros(Ct, local)) if (!R.commits[x]) R.commits[x] = Ct[x];
        R.branches[rama] = local; g.tracking[`${rem}/${rama}`] = local;
        if (a.includes('-u') || a.includes('--set-upstream') || !g.upstream[rama]) g.upstream[rama] = `${rem}/${rama}`;
        Machine.save();
        avisarPush(url, rama, remotoTip, local);
        const sugerencia = !remotoTip && rama !== 'main' && rama !== 'master' && /github\.com/.test(url) && !(R.prs || []).some((p) => p.rama === rama && p.estado === 'abierto')
          ? `\nremote: \nremote: Create a pull request for '${rama}' on GitHub by visiting:\nremote:      ${clave(url)}/pull/new/${rama}\nremote: ` : '';
        const n = [...ancestros(Ct, local)].filter((x) => !remotoTip || !ancestros(Ct, remotoTip).has(x)).length;
        return ok(`Enumerando objetos: ${n * 3}, listo.\nEscribiendo objetos: 100% (${n * 3}/${n * 3}), listo.${sugerencia}\nTo ${url}\n ${remotoTip ? `  ${corto(remotoTip)}..${corto(local)}  ${rama} -> ${rama}` : `* [new branch]      ${rama} -> ${rama}`}${a.includes('-u') ? `\nrama '${rama}' configurada para rastrear '${rem}/${rama}'.` : ''}`);
      }
      case 'merge': {
        if (a[1] === '--abort') {
          if (!g.merge) return fail('fatal: No hay una fusión en curso (MERGE_HEAD no existe).', 128);
          const hs = head ? C()[head].snap : {}; escribirArbol(root, snapshot(root), hs); delete g.merge; g.staged = {}; Machine.save(); return ok('');
        }
        if (g.merge) return fail('error: Fusión en curso: no has concluido la fusión anterior.\nayuda: Resuelve los conflictos, haz commit o ejecuta "git merge --abort".', 128);
        const ref = a.slice(1).find((x) => !x.startsWith('-'));
        if (!ref) return fail('fatal: No hay una rama para fusionar. Uso: git merge <rama>', 128);
        return fusionar(g, root, ref, ref);
      }
      case 'rebase': {
        if (a[1] === '--abort') { if (!g.rebase) return fail('fatal: No hay un rebase en curso.', 128); const C0 = C(); escribirArbol(root, snapshot(root), C0[g.rebase.original].snap); g.branches[g.rebase.rama] = g.rebase.original; delete g.rebase; g.staged = {}; Machine.save(); return ok(''); }
        if (a[1] === '--continue') {
          if (!g.rebase) return fail('fatal: No hay un rebase en curso.', 128);
          if (g.rebase.conflictos.length) return fail(`${g.rebase.conflictos.map((k) => `${k}: necesita fusión`).join('\n')}\nNo puedes continuar: resuelve los conflictos y usa "git add <archivo>" para marcarlos como resueltos.`);
          const C0 = C(), h = g.rebase.restantes.shift(), c = C0[h], nh = nuevoHash();
          g.commits[nh] = { msg: c.msg, parent: g.rebase.actual, snap: snapshot(root), author: c.author, date: ahora() };
          g.rebase.actual = nh; g.staged = {}; g.branches[g.rebase.rama] = nh;
          return seguirRebase(g, root);
        }
        const ref = a.slice(1).find((x) => !x.startsWith('-'));
        if (!ref) return fail('fatal: falta la rama sobre la que hacer rebase (por ejemplo: git rebase main)', 128);
        return rebasar(g, root, ref);
      }
      case 'add': {
        const r = gitViejo(a, ctx);
        const lista = g.merge ? g.merge.conflictos : g.rebase ? g.rebase.conflictos : null;
        if (lista && r.code === 0) {
          const work = snapshot(root), avisos = [];
          for (const k of lista.slice()) {
            const abs = root + '/' + k;
            const marcado = a.slice(1).some((t) => t === '.' || t === '-A' || norm(t) === abs || abs.startsWith(norm(t) + '/'));
            if (!marcado) continue;
            lista.splice(lista.indexOf(k), 1);
            if (work[k] !== undefined) g.staged[k] = work[k];
            if (tieneMarcas(work[k])) avisos.push(`${col.warn('ojo')}: ${k} todavía tiene marcas de conflicto (<<<<<<<, =======, >>>>>>>). Git te deja hacer commit igual, pero el código no va a funcionar.`);
          }
          Machine.save();
          return { ...r, out: [r.out, ...avisos].filter(Boolean).join('\n') };
        }
        return r;
      }
      case 'commit': {
        if (g.merge) {
          if (g.merge.conflictos.length) return fail(`error: No es posible hacer commit porque tienes archivos sin fusionar.\nayuda: Arréglalos en el árbol de trabajo y después usa 'git add <archivo>'\nayuda: para marcar la resolución y haz un commit.\nfatal: Saliendo porque existe un conflicto sin resolver.\n${g.merge.conflictos.map((k) => `\tambos modificados:   ${k}`).join('\n')}`, 128);
          const mi = a.indexOf('-m'), msg = mi >= 0 ? a[mi + 1] : g.merge.msg;
          const hs = head ? C()[head].snap : {}, snap = { ...hs, ...g.staged };
          for (const k of Object.keys(g.staged)) if (g.staged[k] === null) delete snap[k];
          const h = nuevoHash();
          g.commits[h] = { msg, parent: head, parent2: g.merge.theirs, snap, author: 'alumno', date: ahora() };
          g.branches[g.branch] = h; g.staged = {}; delete g.merge; Machine.save();
          return ok(`[${g.branch} ${h}] ${msg}`);
        }
        return gitViejo(a, ctx);
      }
      case 'status': {
        const r = gitViejo(a, ctx);
        const lin = (r.out || '').split('\n');
        const extra = [];
        const up = g.upstream[g.branch];
        if (up && g.tracking[up] !== undefined && head) {
          const [ad, at] = adelantoAtraso(g, head, g.tracking[up]);
          if (ad && at) extra.push(`Tu rama y '${up}' han divergido,\ny tienen ${ad} y ${at} commits diferentes cada una, respectivamente.\n  (usa "git pull" para fusionar la rama remota en la tuya)`);
          else if (ad) extra.push(`Tu rama está adelantada a '${up}' por ${ad} commit${ad > 1 ? 's' : ''}.\n  (usa "git push" para publicar tus commits locales)`);
          else if (at) extra.push(`Tu rama está detrás de '${up}' por ${at} commit${at > 1 ? 's' : ''}, y puede avanzar rápido.\n  (usa "git pull" para actualizar tu rama local)`);
          else extra.push(`Tu rama está actualizada con '${up}'.`);
        }
        if (g.merge) extra.push(`\nTienes rutas no fusionadas.\n  (arregla los conflictos y ejecuta "git commit")\n  (usa "git merge --abort" para abortar la fusión)${g.merge.conflictos.length ? `\n\nRutas no fusionadas:\n  (usa "git add <archivo>..." para marcar una resolución)\n${g.merge.conflictos.map((k) => '\t' + col.err('ambos modificados:   ' + k)).join('\n')}` : '\n\nTodos los conflictos están resueltos, pero sigues fusionando.\n  (usa "git commit" para terminar la fusión)'}`);
        if (g.rebase) extra.push(`\nrebase interactivo en curso sobre ${g.rebase.onto}.${g.rebase.conflictos.length ? `\n  (arregla los conflictos y ejecuta "git rebase --continue")\n  (usa "git rebase --abort" para volver a tu rama original)\n\nRutas no fusionadas:\n${g.rebase.conflictos.map((k) => '\t' + col.err('ambos modificados:   ' + k)).join('\n')}` : '\n  (todos los conflictos resueltos: ejecuta "git rebase --continue")'}`);
        const conf = new Set([...(g.merge ? g.merge.conflictos : []), ...(g.rebase ? g.rebase.conflictos : [])]);
        const cuerpo = lin.slice(1).filter((l) => ![...conf].some((k) => l.includes(k)));
        // sin las rutas en conflicto, un bloque de "Cambios…" puede quedar vacío: se quita
        const bloques = cuerpo.join('\n').split('\n\n').filter((b) => !/^\s*(Cambios|Archivos)/.test(b.trim()) || b.includes('\t'));
        return ok([lin[0], ...extra, ...bloques].join('\n').replace(/\n{3,}/g, '\n\n'));
      }
      case 'stash': {
        const acc = a[1] && !a[1].startsWith('-') ? a[1] : 'push';
        g.stash = g.stash || [];
        if (acc === 'list') return ok(g.stash.map((s, i) => `stash@{${i}}: ${s.msg}`).join('\n'));
        if (acc === 'push' || acc === 'save') {
          const hs = head ? C()[head].snap : {}, work = snapshot(root), cambios = {};
          for (const k of new Set([...Object.keys(hs), ...Object.keys(g.staged || {})])) { if (ignored(root, k)) continue; if (work[k] !== hs[k]) cambios[k] = work[k] === undefined ? null : work[k]; }
          if (!Object.keys(cambios).length) return ok('No hay cambios locales para guardar');
          const mi = a.indexOf('-m');
          const msg = mi >= 0 ? `On ${g.branch}: ${a[mi + 1]}` : `WIP on ${g.branch}: ${corto(head)} ${head ? C()[head].msg : ''}`;
          g.stash.unshift({ msg, cambios });
          for (const k of Object.keys(cambios)) { if (hs[k] === undefined) delete Machine.fs[root + '/' + k]; else writeFile(root + '/' + k, hs[k]); }
          g.staged = {}; Machine.save();
          return ok(`Directorio de trabajo y estado de índice guardados ${msg}`);
        }
        if (acc === 'pop' || acc === 'apply') {
          if (!g.stash.length) return fail('No se encontró ningún stash.');
          const s = g.stash[0];
          for (const [k, v] of Object.entries(s.cambios)) { if (v === null) delete Machine.fs[root + '/' + k]; else writeFile(root + '/' + k, v); }
          if (acc === 'pop') g.stash.shift();
          Machine.save();
          return ok(`En la rama ${g.branch}\nCambios no rastreados para el commit:\n${Object.keys(s.cambios).map((k) => '\t' + col.err('modificado:     ' + k)).join('\n')}${acc === 'pop' ? `\nDescartado refs/stash@{0}` : ''}`);
        }
        if (acc === 'drop') { if (!g.stash.length) return fail('No se encontró ningún stash.'); g.stash.shift(); Machine.save(); return ok('Descartado refs/stash@{0}'); }
        if (acc === 'clear') { g.stash = []; Machine.save(); return ok(''); }
        return fail(`uso: git stash [push [-m mensaje] | list | pop | apply | drop | clear]`);
      }
      case 'reset': {
        const hard = a.includes('--hard'), soft = a.includes('--soft');
        const ref = a.slice(1).find((x) => !x.startsWith('-'));
        if (!hard && !soft && ref && resolverRef(g, ref) === undefined) return gitViejo(['restore', '--staged', ...a.slice(1).filter((x) => !x.startsWith('-'))], ctx);
        const destino = resolverRef(g, ref || 'HEAD');
        if (!destino) return fail(`fatal: argumento ambiguo '${ref}': revisión desconocida`, 128);
        const C0 = C(), hs = head ? C0[head].snap : {};
        if (hard) { escribirArbol(root, snapshot(root), C0[destino].snap); g.staged = {}; delete g.merge; }
        else if (soft) { g.staged = {}; for (const k of new Set([...Object.keys(hs), ...Object.keys(C0[destino].snap)])) if (hs[k] !== C0[destino].snap[k]) g.staged[k] = hs[k] === undefined ? null : hs[k]; }
        else g.staged = {};
        g.branches[g.branch] = destino; Machine.save();
        return ok(hard ? `HEAD está ahora en ${corto(destino)} ${C0[destino].msg}` : '');
      }
      case 'show': {
        const h = resolverRef(g, a[1] || 'HEAD'), C0 = C();
        if (!h || !C0[h]) return fail(`fatal: argumento ambiguo '${a[1]}': revisión desconocida`, 128);
        const c = C0[h], ps = c.parent ? C0[c.parent].snap : {}, out = [col.warn(`commit ${h}`), c.parent2 ? `Merge: ${corto(c.parent)} ${corto(c.parent2)}` : '', `Author: ${c.author} <${c.author}@tiendaandina.dev>`, `Date:   ${new Date(c.date).toString()}`, '', `    ${c.msg}`, ''].filter((x, i) => x !== '' || i > 2);
        for (const k of new Set([...Object.keys(ps), ...Object.keys(c.snap)])) {
          if (ps[k] === c.snap[k]) continue;
          out.push(col.b(`diff --git a/${k} b/${k}`));
          const A = (ps[k] || '').split('\n'), B = (c.snap[k] || '').split('\n');
          for (const hk of hunks(A, B)) { out.push(col.info(`@@ -${hk.s + 1},${hk.e - hk.s} +${hk.s + 1},${hk.lineas.length} @@`)); A.slice(hk.s, hk.e).forEach((l) => out.push(col.err('-' + l))); hk.lineas.forEach((l) => out.push(col.ok('+' + l))); }
        }
        return ok(out.join('\n'));
      }
      case 'log': {
        if (!a.includes('--all') && !a.includes('--graph')) return gitViejo(a, ctx);
        const C0 = C(), tips = a.includes('--all') ? [...Object.values(g.branches), ...Object.values(g.tracking)].filter(Boolean) : [head].filter(Boolean);
        const vistos = new Set(); for (const t of tips) for (const x of ancestros(C0, t)) vistos.add(x);
        const etiquetas = {};
        for (const [b, h] of Object.entries(g.branches)) if (h) (etiquetas[h] = etiquetas[h] || []).push(b === g.branch ? `HEAD -> ${b}` : b);
        for (const [b, h] of Object.entries(g.tracking)) if (h) (etiquetas[h] = etiquetas[h] || []).push(b);
        const orden = [...vistos].sort((x, y) => (C0[y].date > C0[x].date ? 1 : C0[y].date < C0[x].date ? -1 : 0));
        return ok(orden.map((h) => `${C0[h].parent2 ? '*-.' : '*'} ${col.warn(corto(h))}${etiquetas[h] ? col.info(` (${etiquetas[h].join(', ')})`) : ''} ${C0[h].msg} ${col.dim('— ' + C0[h].author)}`).join('\n'));
      }
      case 'branch': {
        if (a.includes('-a') || a.includes('-r') || a.includes('-vv')) {
          const loc = Object.keys(g.branches).map((b) => (b === g.branch ? '* ' + col.ok(b) : '  ' + b) + (a.includes('-vv') && g.upstream[b] ? ` ${corto(g.branches[b])} [${g.upstream[b]}]` : ''));
          const rem = Object.keys(g.tracking).map((b) => '  ' + col.err('remotes/' + b));
          return ok((a.includes('-r') ? rem : a.includes('-a') ? [...loc, ...rem] : loc).join('\n'));
        }
        return gitViejo(a, ctx);
      }
      case 'switch': case 'checkout': {
        if (g.merge) return fail('error: no puedes cambiar de rama en medio de una fusión. Termínala (git commit) o abórtala (git merge --abort).');
        const nombre = a.slice(1).find((x) => !x.startsWith('-'));
        // switch a una rama que solo existe en el remoto: la crea siguiéndola (como git real)
        if (nombre && g.branches[nombre] === undefined && !a.includes('-c') && !a.includes('-b') && g.tracking[`origin/${nombre}`]) {
          g.branches[nombre] = g.tracking[`origin/${nombre}`]; g.upstream[nombre] = `origin/${nombre}`;
          const r = gitViejo([sub, nombre], ctx);
          return { ...r, out: `rama '${nombre}' configurada para rastrear 'origin/${nombre}'.\n${r.out}` };
        }
        return gitViejo(a, ctx);
      }
      default: return gitViejo(a, ctx);
    }
  });

  // ---------------------------------------------------------------- gh: pull requests, issues y Actions en el remoto
  const ghViejo = Sh.Commands.gh;
  const sigNumero = (R) => Math.max(0, ...(R.prs || []).map((p) => p.n), ...(R.issues || []).map((i) => i.n)) + 1;
  const AYUDA_GH = 'Uso: gh pr create | list | view N | checks N | merge N | checkout N · gh issue create | list | view N | close N · gh run list | view ID · gh repo create · gh browse';
  // lee --flag valor, --flag=valor y -f valor
  const flagDe = (a, ...ns) => { for (const n of ns) { const i = a.indexOf(n); if (i >= 0) return a[i + 1]; const c = a.find((x) => x.startsWith(n + '=')); if (c) return c.slice(n.length + 1); } return undefined; };
  Sh.def('gh', 'GitHub CLI (simulada): gh auth login · gh repo create · gh pr create|list|view|checks|merge · gh issue … · gh run list · gh browse', (a, ctx) => {
    if (!['pr', 'issue', 'run', 'browse', 'repo'].includes(a[0]) || (a[0] === 'repo' && a[1] !== 'create' && a[1] !== 'view')) return ghViejo ? ghViejo(a, ctx) : ok(AYUDA_GH);
    if (!(Machine.cloud && Machine.cloud.gh)) return fail('To get started with GitHub CLI, please run:  gh auth login');
    const flag = (...ns) => flagDe(a, ...ns);
    // gh repo create NOMBRE [--public|--private] [--source=. --push]
    if (a[0] === 'repo' && a[1] === 'create') {
      const nombre = (a[2] && !a[2].startsWith('-') ? a[2] : null) || (gitRoot() || '').split('/').pop();
      if (!nombre) return fail('X un nombre es obligatorio: gh repo create mi-repo --public');
      const [owner, rep] = nombre.includes('/') ? nombre.split('/') : ['alumno', nombre];
      const u = `https://github.com/${owner}/${rep}`;
      if (remoto(u)) return fail(`GraphQL: Name already exists on this account (createRepository)`);
      const R = crearRemoto(u, false);
      R.meta = { desc: flag('--description', '-d') || '', privado: a.includes('--private'), creado: new Date().toISOString(), estrellas: 0, temas: [] };
      let extra = '';
      if (a.some((x) => x === '--source' || x.startsWith('--source'))) {
        const root = gitRoot();
        if (!root) return fail('X la carpeta --source no es un repositorio git (git init primero)');
        Machine.git[root].remotes.origin = `${u}.git`;
        extra = `\n✓ Added remote ${u}.git`;
        if (a.includes('--push')) { const r = Sh.Commands.git(['push', '-u', 'origin', Machine.git[root].branch], ctx); extra += r.code ? '\n' + r.out : `\n✓ Pushed commits to ${u}.git`; }
      }
      Machine.save();
      return ok(`✓ Created repository ${owner}/${rep} on GitHub\n  ${u}${extra}`);
    }
    const root = gitRoot();
    const g = root ? Machine.git[root] : null;
    const urlRepo = flag('--repo', '-R') ? `https://github.com/${flag('--repo', '-R')}` : g && g.remotes.origin;
    if (!urlRepo) return fail(root ? 'no hay un remoto origin: agrega uno con git remote add origin URL' : 'fatal: no es un repositorio git (o usa --repo dueño/nombre)');
    const R = remoto(urlRepo) || crearRemoto(urlRepo, false);
    R.prs = R.prs || []; R.issues = R.issues || []; R.runs = R.runs || [];
    const repo = clave(urlRepo).replace(/^https?:\/\/github\.com\//, '');
    const web = (ruta) => `https://github.com/${repo}${ruta || ''}`;
    if (a[0] === 'browse' || (a[0] === 'repo' && a[1] === 'view' && a.includes('--web'))) {
      const n = a[1] && /^\d+$/.test(a[1]) ? a[1] : null;
      const destino = `#/github/${repo}${n ? (R.prs.some((p) => p.n === Number(n)) ? '/pull/' : '/issues/') + n : ''}`;
      setTimeout(() => { location.hash = destino; }, 300);
      return ok(`Opening ${web(n ? '/issues/' + n : '')} in your browser.` + col.dim('\n(práctica: se abre la réplica de GitHub del curso)'));
    }
    if (a[0] === 'repo' && a[1] === 'view') return ok(`${col.b(repo)}\n${(R.meta && R.meta.desc) || 'No description provided'}\n\n${(R.commits[R.branches.main] || {}).snap && R.commits[R.branches.main].snap['README.md'] || ''}`);
    // ---- issues
    if (a[0] === 'issue') {
      const sub = a[1];
      if (sub === 'create') {
        const t = flag('--title', '-t'); if (!t) return fail('must provide `--title` and `--body` when not running interactively');
        const n = sigNumero(R);
        R.issues.push({ n, titulo: t, cuerpo: flag('--body', '-b') || '', estado: 'abierto', autor: 'alumno', fecha: new Date().toISOString(), etiquetas: (flag('--label', '-l') || '').split(',').map((x) => x.trim()).filter(Boolean), asignados: flag('--assignee', '-a') ? [flag('--assignee', '-a').replace('@me', 'alumno')] : [], comentarios: [], eventos: [] });
        Machine.save();
        return ok(`\nCreating issue in ${repo}\n\n${web('/issues/' + n)}`);
      }
      if (sub === 'list' || !sub) {
        const est = flag('--state', '-s') || 'open';
        const ls = R.issues.filter((i) => est === 'all' || (est === 'closed' ? i.estado === 'cerrado' : i.estado === 'abierto')).sort((x, y) => y.n - x.n);
        if (!ls.length) return ok(`no ${est === 'all' ? '' : est + ' '}issues match your search in ${repo}`);
        return ok(`\nShowing ${ls.length} of ${ls.length} ${est === 'all' ? '' : est + ' '}issues in ${repo}\n\n` + ls.map((i) => `${col.ok('#' + i.n).padEnd(6)}  ${i.titulo.padEnd(44)}  ${col.dim((i.etiquetas || []).join(', '))}`).join('\n'));
      }
      const n = Number(a[2]); const is = R.issues.find((i) => i.n === n);
      if (!is) return fail(`GraphQL: Could not resolve to an issue or pull request with the number of ${a[2] || '?'}. (repository.issue)`);
      if (sub === 'view') return ok(`${col.b(is.titulo)} #${is.n}\n${is.estado === 'abierto' ? col.ok('Open') : col.info('Closed')} • ${is.autor} opened • ${(is.comentarios || []).length} comments\nLabels: ${(is.etiquetas || []).join(', ') || '—'}\n\n${is.cuerpo || col.dim('No description provided')}\n\n${col.dim('View this issue on GitHub: ' + web('/issues/' + n))}`);
      if (sub === 'close') { if (is.estado !== 'abierto') return fail(`! Issue ${repo}#${n} (${is.titulo}) is already closed`); is.estado = 'cerrado'; is.razon = a.includes('not planned') || flag('--reason', '-r') === 'not planned' ? 'not_planned' : 'completed'; (is.eventos = is.eventos || []).push({ tipo: 'cerrado', por: 'alumno', fecha: new Date().toISOString() }); Machine.save(); return ok(`${col.ok('✓')} Closed issue ${repo}#${n} (${is.titulo})`); }
      if (sub === 'reopen') { is.estado = 'abierto'; (is.eventos = is.eventos || []).push({ tipo: 'reabierto', por: 'alumno', fecha: new Date().toISOString() }); Machine.save(); return ok(`${col.ok('✓')} Reopened issue ${repo}#${n} (${is.titulo})`); }
      if (sub === 'comment') { const b = flag('--body', '-b'); if (!b) return fail('--body es obligatorio'); (is.comentarios = is.comentarios || []).push({ autor: 'alumno', texto: b, fecha: new Date().toISOString() }); Machine.save(); return ok(web(`/issues/${n}#issuecomment`)); }
      return ok(AYUDA_GH);
    }
    // ---- Actions
    if (a[0] === 'run') {
      const icono = (k) => (k.estado !== 'completed' ? col.warn('*') : k.conclusion === 'success' ? col.ok('✓') : k.conclusion === 'skipped' ? col.dim('-') : col.err('X'));
      if (a[1] === 'list' || !a[1]) {
        if (!R.runs.length) return ok('no runs found');
        return ok(`STATUS  TITLE                                     WORKFLOW         BRANCH          EVENT         ID\n` + R.runs.slice(0, 20).map((k) => `${icono(k)}       ${String(k.msg || k.workflow).slice(0, 40).padEnd(42)}${String(k.workflow).slice(0, 15).padEnd(17)}${String(k.rama).slice(0, 14).padEnd(16)}${String(k.evento).padEnd(14)}${k.id}`).join('\n'));
      }
      if (a[1] === 'view') {
        const id = a.slice(2).find((x) => !x.startsWith('-'));
        const k = id ? R.runs.find((x) => String(x.id) === id) : (a.includes('--log-failed') ? R.runs.find((x) => x.conclusion === 'failure') : null) || R.runs[0];
        if (!k) return fail(`could not find any workflow run with ID ${id}`);
        const log = a.includes('--log') || a.includes('--log-failed');
        const jobs = k.jobs.map((j) => `${icono(j)} ${j.nombre}` + (log && (a.includes('--log') || j.conclusion === 'failure') ? '\n' + j.pasos.filter((p) => a.includes('--log') || p.conclusion === 'failure').map((p) => p.log.map((l) => `${j.nombre}\t${p.nombre}\t${String(l).replace(/\u0001[^\u0002]*\u0002|\u0003/g, '')}`).join('\n')).join('\n') : '')).join('\n');
        return ok(`\n${icono(k)} ${k.rama} ${k.workflow} · ${k.id}\nTriggered via ${k.evento}\n\nJOBS\n${jobs || col.dim('(sin jobs)')}\n\n${col.dim('For more information about a job, try: gh run view --log-failed · View this run on GitHub: ' + web('/actions/runs/' + k.id))}`);
      }
      if (a[1] === 'watch') return ok(col.dim('(práctica) mira la ejecución en vivo en la réplica: gh browse'));
      return ok(AYUDA_GH);
    }
    // ---- pull requests
    if (!g) return fail('fatal: no es un repositorio git');
    if (a[1] === 'create') {
      const rama = flag('--head', '-H') || g.branch, base = flag('--base', '-B') || 'main';
      let titulo = flag('--title', '-t'), cuerpo = flag('--body', '-b') || '';
      if (a.includes('--fill') || a.includes('-f')) { const c = todos(g)[g.branches[rama]]; if (c) { titulo = titulo || c.msg.split('\n')[0]; cuerpo = cuerpo || c.msg.split('\n').slice(1).join('\n').trim(); } }
      if (!titulo) return fail('--title es obligatorio (o usa --fill)');
      if (rama === base) return fail(`no puedes abrir un pull request de ${rama} hacia sí misma: crea una rama (git switch -c mi-rama)`);
      if (!R.branches[rama]) return fail(`aborted: you must first push the current branch to a remote, or use the --head flag\n${col.dim(`(súbela con: git push -u origin ${rama})`)}`);
      if (!R.branches[base]) return fail(`la rama base '${base}' no existe en el remoto`);
      if (R.prs.some((p) => p.rama === rama && p.estado === 'abierto')) return fail(`a pull request for branch "${rama}" into branch "${base}" already exists:\n${web('/pull/' + R.prs.find((p) => p.rama === rama && p.estado === 'abierto').n)}`);
      const n = sigNumero(R);
      const revisores = (flag('--reviewer', '-r') || '').split(',').map((x) => x.trim()).filter((x) => x && x !== 'alumno');
      const pr = { n, titulo, cuerpo, rama, base, estado: 'abierto', autor: 'alumno', fecha: new Date().toISOString(), borrador: a.includes('--draft') || a.includes('-d'), revisores, etiquetas: (flag('--label', '-l') || '').split(',').map((x) => x.trim()).filter(Boolean), asignados: flag('--assignee', '-a') ? ['alumno'] : [], comentarios: [], revisiones: [], lineas: [], eventos: revisores.map((u) => ({ tipo: 'revision-pedida', por: 'alumno', a: u, fecha: new Date().toISOString() })) };
      R.prs.push(pr);
      Machine.save();
      if (Sh.github.alCrearPR) Sh.github.alCrearPR(clave(urlRepo), pr);
      return ok(`\nCreating ${pr.borrador ? 'draft ' : ''}pull request for ${rama} into ${base} in ${repo}\n\n${web('/pull/' + n)}` + col.dim('\n(ábrelo en la réplica con: gh browse ' + n + ')'));
    }
    if (a[1] === 'list') {
      const ab = R.prs.filter((p) => p.estado === 'abierto');
      return ok(ab.length ? `\nShowing ${ab.length} of ${ab.length} open pull request${ab.length > 1 ? 's' : ''} in ${repo}\n\n` + ab.map((p) => `${col.ok('#' + p.n).padEnd(6)}  ${p.titulo.padEnd(40)}  ${p.rama}${p.borrador ? col.dim('  DRAFT') : ''}`).join('\n') : `no open pull requests in ${repo}`);
    }
    const n = Number(a[2]) || (R.prs.find((p) => p.rama === g.branch && p.estado === 'abierto') || {}).n;
    const pr = R.prs.find((p) => p.n === n);
    if (!pr) return fail(a[2] ? `GraphQL: Could not resolve to a PullRequest with the number of ${a[2]}. (repository.pullRequest)` : `no pull requests found for branch "${g.branch}"`);
    const est = Sh.github.estadoPR ? Sh.github.estadoPR(clave(urlRepo), pr) : null;
    const C = todos(g), tip = R.branches[pr.rama], baseTip = R.branches[pr.base];
    if (a[1] === 'checkout') {
      if (!tip) return fail(`la rama ${pr.rama} ya no existe en el remoto`);
      const r = Sh.Commands.git(['fetch', 'origin'], ctx);
      const sw = Sh.Commands.git(['switch', pr.rama], ctx);
      return { out: [r.out, sw.out].filter(Boolean).join('\n'), code: sw.code };
    }
    if (a[1] === 'checks') {
      const cs = est ? est.checks : [];
      if (!cs.length) return fail(`no checks reported on the '${pr.rama}' branch`, 1);
      const ic = (c) => (c.estado !== 'completed' ? col.warn('*') : c.conclusion === 'success' ? col.ok('✓') : c.conclusion === 'skipped' ? col.dim('-') : col.err('X'));
      const malos = cs.filter((c) => c.conclusion === 'failure').length, pend = cs.filter((c) => c.estado !== 'completed').length;
      return { out: `${malos ? 'Some checks were not successful' : pend ? 'Some checks are still pending' : 'All checks were successful'}\n${malos} failing, ${cs.length - malos - pend} successful, ${pend} pending\n\n` + cs.map((c) => `${ic(c)}  ${c.wf}/${c.nombre} (${c.evento})`).join('\n'), code: malos ? 1 : pend ? 8 : 0 };
    }
    if (a[1] === 'view') {
      const commits = tip ? [...ancestros(C, tip)].filter((x) => !baseTip || !ancestros(C, baseTip).has(x)) : [];
      const rev = est ? (est.cambios.length ? col.err('Changes requested') : est.aprobaciones ? col.ok('Approved') : est.P && est.P.aprobaciones ? col.warn('Review required') : '') : '';
      const chk = est && est.checks.length ? `\nChecks: ${est.checks.filter((c) => c.conclusion === 'success').length}/${est.checks.length} ✓` : '';
      return ok(`${col.b(pr.titulo)} #${pr.n}\n${pr.estado === 'abierto' ? (pr.borrador ? col.dim('Draft') : col.ok('Open')) : pr.estado === 'fusionado' ? col.info('Merged') : col.err('Closed')} • alumno wants to merge ${commits.length} commit(s) into ${pr.base} from ${pr.rama}${rev ? ' • ' + rev : ''}${chk}\n\n${pr.cuerpo || col.dim('No description provided')}\n\n${col.dim('View this pull request on GitHub: ' + web('/pull/' + pr.n))}`);
    }
    if (a[1] === 'ready') { pr.borrador = false; Machine.save(); return ok(`${col.ok('✓')} Pull request ${repo}#${pr.n} is marked as "ready for review"`); }
    if (a[1] === 'close') { if (pr.estado !== 'abierto') return fail(`! Pull request ${repo}#${pr.n} is already closed`); pr.estado = 'cerrado'; Machine.save(); return ok(`${col.err('✓')} Closed pull request ${repo}#${pr.n} (${pr.titulo})`); }
    if (a[1] === 'merge') {
      if (pr.estado !== 'abierto') return fail(`X Pull request ${repo}#${pr.n} (${pr.titulo}) is not mergeable: it is ${pr.estado === 'fusionado' ? 'already merged' : 'closed'}`);
      const metodo = a.includes('--squash') || a.includes('-s') ? 'squash' : a.includes('--rebase') || a.includes('-r') ? 'rebase' : 'merge';
      const borrar = a.includes('--delete-branch') || a.includes('-d');
      if (Sh.github.fusionarPR) {
        const res = Sh.github.fusionarPR(clave(urlRepo), pr, metodo);
        if (res && res.error) return fail(`X Pull request ${repo}#${pr.n} is not mergeable: ${res.error}` + (res.bloqueos ? col.dim('\n(la rama base está protegida: revisa los checks y las aprobaciones con gh pr view ' + pr.n + ')') : ''));
        if (res && res.ok) {
          if (borrar && R.branches[pr.rama] && !(Sh.github.reglaDe && Sh.github.reglaDe(R, pr.rama))) delete R.branches[pr.rama];
          Machine.save();
          return ok(`${col.ok('✓')} ${metodo === 'squash' ? 'Squashed and merged' : metodo === 'rebase' ? 'Rebased and merged' : 'Merged'} pull request ${repo}#${pr.n} (${pr.titulo})${borrar ? `\n${col.ok('✓')} Deleted remote branch ${pr.rama}` : ''}\n${col.dim(`Para tener el resultado en tu computadora: git switch ${pr.base} && git pull`)}`);
        }
      }
      // sin la réplica cargada: fusión simple
      const marcas = Object.entries(C[tip].snap).filter(([, v]) => tieneMarcas(v)).map(([k]) => k);
      if (marcas.length) return fail(`X Los checks fallaron: ${marcas.join(', ')} tiene marcas de conflicto. Corrígelo y vuelve a hacer push.`);
      let nuevo;
      if (!baseTip || ancestros(C, tip).has(baseTip)) nuevo = tip;
      else {
        const b = baseComun(C, tip, baseTip), r = fusionarSnaps(b ? C[b].snap : {}, C[baseTip].snap, C[tip].snap, pr.rama);
        if (r.conflictos.length) return fail(`X El pull request #${pr.n} no se puede fusionar: tiene conflictos con ${pr.base} (${r.conflictos.join(', ')}).`);
        nuevo = nuevoHash();
        R.commits[nuevo] = metodo === 'squash' ? { msg: `${pr.titulo} (#${pr.n})`, parent: baseTip, snap: r.snap, author: 'alumno', date: ahora() } : { msg: `Merge pull request #${pr.n} from ${pr.rama}`, parent: baseTip, parent2: tip, snap: r.snap, author: 'alumno', date: ahora() };
      }
      R.branches[pr.base] = nuevo; pr.estado = 'fusionado'; Machine.save();
      return ok(`${col.ok('✓')} Pull request #${pr.n} fusionado (${pr.titulo})\n${col.dim(`Para tener el resultado en tu computadora: git switch ${pr.base} && git pull`)}`);
    }
    return ok(AYUDA_GH);
  });

  // lo que usa la réplica de GitHub (github.js): los mismos remotos que la terminal
  Sh.github = Object.assign(Sh.github || {}, { remotos, remoto, clave, crearRemoto, nuevoHash, ancestros, baseComun, fusionarSnaps, tieneMarcas, oyentesPush });

  // comando del curso (no existe en una computadora real): deja un remoto de práctica como recién creado,
  // para que cada ejercicio empiece igual
  Sh.def('reiniciar-remoto', 'comando del curso: deja como nuevo un repositorio remoto de práctica (reiniciar-remoto URL)', (a) => {
    const url = a[0] || 'https://github.com/tienda-andina/pipelines';
    delete remotos()[clave(url)]; delete remotos()[url]; crearRemoto(url, true); Machine.save();
    return ok(col.dim(`(curso) el remoto ${url} quedó como recién creado: dos commits de Martín y un cambio de Camila por llegar`));
  });
  Sh.gitInt.fusion3 = fusion3;
})();
