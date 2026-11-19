/* Red Analítica en la terminal: el servidor SFTP de los laboratorios.
 *
 *   red accesos                      el correo de IT (host, puerto, usuario, huella del servidor)
 *   red alta-clave ~/.ssh/x.pub      le mandas tu clave pública a IT; la autorizan en unos minutos
 *   ssh-keyscan -p 2222 host         la clave pública del servidor (para known_hosts)
 *   sftp -i clave -P 2222 usuario@host        consola: ls, cd, get, mget, lcd, pwd, bye
 *   sftp -b lote.txt -i clave -P 2222 usuario@host   por lotes (lo que se usa en un script)
 *   scp -i clave -P 2222 usuario@host:/entrantes/norte/*.csv destino/
 */
(function () {
  'use strict';
  const RA = window.RedAnalitica, Host = window.RedAnaliticaHost, Sh = window.Shell;
  if (!RA || !Host || !Sh || !Sh.def) return;
  const col = Sh.col; const MIN = 60000;
  const MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ESPERA_ALTA = 5 * MIN;

  const RUTA_IP = '10.20.0.15';
  const lineaKnown = () => { const C = RA.claves(); return `[${C.host}]:${C.puerto} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${C.huella.slice(7, 40)}`; };

  Sh.def('red', 'Red Analítica (proyecto 3): red accesos · red alta-clave ~/.ssh/clave.pub · red estado', (a) => {
    Host.sincronizar(); const D = Host.datos(); const C = RA.claves();
    if (a[0] === 'accesos') return Sh.ok(`De: mesa-de-ayuda@redanalitica.example
Asunto: Acceso SFTP para el equipo de datos

Servidor:   ${C.host}   puerto ${C.puerto}   (SFTP, solo lectura)
Usuario:    ${C.usuario}
Huella del servidor (verifícala la primera vez que te conectes):
  ED25519 ${C.huella}

El acceso es solo con clave pública (no hay contraseña). Generen un par de claves y
mándennos la pública con:   red alta-clave ~/.ssh/<clave>.pub
La autorizamos en unos minutos. La privada no se comparte con nadie (va al Key Vault).

Carpetas: /entrantes/<laboratorio>/   (norte, centro, sur, costa, cerro)
Los archivos se borran del servidor a los 7 días.`);
    if (a[0] === 'alta-clave') {
      const f = a[1]; if (!f) return Sh.fail('Uso: red alta-clave ~/.ssh/<clave>.pub', 2);
      const txt = Sh.readFile(Sh.norm(f)); if (txt === null) return Sh.fail(`red: ${f}: No such file or directory`);
      if (/PRIVATE KEY/.test(txt)) return Sh.fail('¡Esa es la clave PRIVADA! Nunca se manda. Manda el archivo .pub (la pública).', 1);
      if (!/^ssh-(ed25519|rsa)\s+\S+/.test(txt.trim())) return Sh.fail('Eso no parece una clave pública SSH (tiene que empezar con ssh-ed25519 o ssh-rsa).', 1);
      D.claves = D.claves || []; D.claves.push({ pub: txt.trim().split(/\s+/).slice(0, 2).join(' '), alta: Date.now() }); Host.guardar();
      return Sh.ok(`Ticket MDA-${4000 + D.claves.length * 7} creado: "Alta de clave SSH para ${C.usuario}".\nMesa de ayuda: "Recibida. La autorizamos en unos 5 minutos."`);
    }
    if (a[0] === 'estado') { const ks = (D.claves || []).map((k) => `${k.pub.slice(0, 40)}…  ${Date.now() - k.alta >= ESPERA_ALTA ? 'autorizada' : 'pendiente (IT la está revisando)'}`); return Sh.ok(ks.length ? ks.join('\n') : 'No mandaste ninguna clave todavía (red alta-clave).'); }
    return Sh.ok('red accesos | red alta-clave ~/.ssh/<clave>.pub | red estado');
  });

  Sh.def('ssh-keyscan', 'muestra la clave pública de un servidor SSH: ssh-keyscan -p 2222 host', (a) => {
    const { flags, pos } = Sh.parseArgs(a); const C = RA.claves(); const host = pos[pos.length - 1];
    if (host !== C.host) return Sh.fail(`${host || '(host)'}: Name or service not known`, 1);
    if (String(flags['-p'] || 22) !== String(C.puerto)) return Sh.fail(`connect to ${host} port ${flags['-p'] || 22}: Connection refused`, 1);
    return { out: lineaKnown(), err: `# ${host}:${C.puerto} SSH-2.0-OpenSSH_9.6`, code: 0 };
  });

  // ---------------------------------------------------------------- conexión: host, clave y autorización
  function conectar(a) {
    Host.sincronizar(); const C = RA.claves(); const D = Host.datos();
    let clave = null, puerto = 22, lote = null, destino = null; const X = {};
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (x === '-i') clave = a[++i]; else if (x === '-P') puerto = Number(a[++i]); else if (x === '-b') lote = a[++i];
      else if (x === '-o') { const kv = String(a[++i] || ''); const k = kv.indexOf('='); if (k > 0) X[kv.slice(0, k)] = kv.slice(k + 1); }
      else if (/^-/.test(x)) { /* opción sin efecto */ } else destino = destino || x;
    }
    const m = /^(?:([^@]+)@)?([^:]+)(?::(.*))?$/.exec(destino || '');
    if (!m) return { error: 'usage: sftp [-b batchfile] [-i identity_file] [-o ssh_option] [-P port] destination' };
    const usuario = m[1] || 'alumno', host = m[2], rutaRemota = m[3] || null;
    if (host !== C.host) return { error: `ssh: Could not resolve hostname ${host}: Name or service not known\nConnection closed` };
    if (puerto !== C.puerto) return { error: `ssh: connect to host ${host} port ${puerto}: Connection refused\nConnection closed${puerto === 22 ? '\n' + col.dim('(el servidor atiende en el puerto ' + C.puerto + ': -P ' + C.puerto + ')') : ''}` };
    const avisos = [];
    const kh = Sh.HOME + '/.ssh/known_hosts'; const known = Sh.readFile(kh) || '';
    if (!known.includes(`[${C.host}]:${C.puerto}`)) {
      const acepta = X.StrictHostKeyChecking === 'accept-new' || X.StrictHostKeyChecking === 'no';
      if (!acepta) return { error: `The authenticity of host '[${C.host}]:${C.puerto} ([${RUTA_IP}]:${C.puerto})' can't be established.\nED25519 key fingerprint is ${C.huella}.\nThis key is not known by any other names.\nHost key verification failed.\nConnection closed\n${col.dim('(compara la huella con la del correo de IT; si coincide: -o StrictHostKeyChecking=accept-new, o agrega la línea de ssh-keyscan a ~/.ssh/known_hosts)')}` };
      Sh.writeFile(kh, known + lineaKnown() + '\n'); avisos.push(`Warning: Permanently added '[${C.host}]:${C.puerto}' (ED25519) to the list of known hosts.`);
    }
    const rutaClave = Sh.norm(clave || '~/.ssh/id_ed25519'); const priv = Sh.readFile(rutaClave); const pub = Sh.readFile(rutaClave + '.pub');
    const denegado = { error: `${usuario}@${host}: Permission denied (publickey).\nConnection closed` };
    if (usuario !== C.usuario) return denegado;
    if (priv === null) return { error: (clave ? `Warning: Identity file ${clave} not accessible: No such file or directory.\n` : '') + denegado.error };
    const pubTxt = (pub || '').trim().split(/\s+/).slice(0, 2).join(' ');
    const reg = (D.claves || []).find((k) => k.pub === pubTxt);
    if (!reg) return { error: denegado.error + '\n' + col.dim('(IT no tiene registrada esa clave: red alta-clave ' + (clave || '~/.ssh/id_ed25519') + '.pub)') };
    if (Date.now() - reg.alta < ESPERA_ALTA) return { error: denegado.error + '\n' + col.dim(`(IT todavía no autorizó la clave: falta ${Math.ceil((ESPERA_ALTA - (Date.now() - reg.alta)) / 60000)} min. Mientras tanto, lee la documentación de los formatos)`) };
    D.conexiones = (D.conexiones || 0) + 1; Host.guardar();
    return { ok: true, usuario, host, puerto, lote, rutaRemota, avisos };
  }

  // ---------------------------------------------------------------- el sistema de archivos remoto
  function arbol() {
    const F = RA.servidor(); const dirs = new Set(['/', '/entrantes', ...Object.keys(RA.LABS).map((l) => '/entrantes/' + l)]);
    return { F, dirs, archivo: (r) => F.find((x) => x.ruta === r) };
  }
  const normRemota = (cwd, p) => { const partes = (p.startsWith('/') ? p : cwd + '/' + p).split('/'); const out = []; for (const x of partes) { if (!x || x === '.') continue; if (x === '..') out.pop(); else out.push(x); } return '/' + out.join('/'); };
  const glob = (p) => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]') + '$');
  const fecha = (ms) => { const d = new Date(ms - 3 * 3600000); return `${MESES[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2)} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  function sesion(cx) {
    const S = { cwd: '/' };
    const T = () => arbol();
    const tam = (x) => RA.leer(x.e).length;
    const cmd = {
      pwd: () => `Remote working directory: ${S.cwd}`,
      lpwd: () => `Local working directory: ${Sh.Machine.cwd}`,
      cd: (p) => { const r = normRemota(S.cwd, p || '/'); if (!T().dirs.has(r)) throw new Error(`stat remote: No such file or directory`); S.cwd = r; return ''; },
      lcd: (p) => { const r = Sh.norm(p || '~'); if (!Sh.isDir(r)) throw new Error(`Couldn't change local directory to "${p}": No such file or directory`); Sh.Machine.cwd = r; return ''; },
      ls: (...args) => {
        const largo = args.some((x) => /^-\w*l/.test(x)); const p = args.find((x) => !x.startsWith('-')); const t = T();
        let base = normRemota(S.cwd, p || '.'); let filtro = null;
        if (/[*?]/.test(base)) { filtro = glob(base.split('/').pop()); base = base.replace(/\/[^/]*$/, '') || '/'; }
        if (t.archivo(base)) { const x = t.archivo(base); return largo ? `-rw-r--r--    1 sftp     sftp     ${String(tam(x)).padStart(8)} ${fecha(x.mtime)} ${x.ruta.split('/').pop()}` : x.ruta.split('/').pop(); }
        if (!t.dirs.has(base)) throw new Error(`Can't ls: "${base}" not found`);
        const hijosD = [...t.dirs].filter((d) => d !== base && d.replace(/\/[^/]+$/, '') === (base === '/' ? '' : base)).map((d) => ({ n: d.split('/').pop(), dir: true }));
        const hijosA = t.F.filter((x) => x.ruta.replace(/\/[^/]+$/, '') === base).sort((a, b) => a.ruta.localeCompare(b.ruta)).map((x) => ({ n: x.ruta.split('/').pop(), x }));
        const todo = [...hijosD, ...hijosA].filter((h) => !filtro || filtro.test(h.n));
        if (!largo) return todo.map((h) => h.n).join('\n');
        return todo.map((h) => (h.dir ? `drwxr-xr-x    2 sftp     sftp         4096 ${fecha(Date.now() - 86400000 * 30)} ${h.n}` : `-rw-r--r--    1 sftp     sftp     ${String(tam(h.x)).padStart(8)} ${fecha(h.x.mtime)} ${h.n}`)).join('\n');
      },
      get: (...args) => {
        const pos = args.filter((x) => !/^-[a-zA-Z]+$/.test(x)); const r = normRemota(S.cwd, pos[0] || ''); const t = T();
        let lista;
        if (/[*?]/.test(r)) { const re = glob(r); lista = t.F.filter((x) => re.test(x.ruta)); if (!lista.length) throw new Error(`File "${r}" not found.`); }
        else { const x = t.archivo(r); if (!x) throw new Error(`File "${r}" not found.`); lista = [x]; }
        const dest = pos[1] ? Sh.norm(pos[1]) : null; const out = [];
        for (const x of lista) {
          const nombre = x.ruta.split('/').pop(); const destino = dest ? (Sh.isDir(dest) || lista.length > 1 ? dest + '/' + nombre : dest) : Sh.Machine.cwd + '/' + nombre;
          if (lista.length > 1 && dest && !Sh.isDir(dest)) Sh.mkdirp(dest);
          Sh.writeFile(destino, RA.leer(x.e)); out.push(`Fetching ${x.ruta} to ${Sh.display(destino)}`);
        }
        try { Sh.Machine.save(); } catch (e) { /* lleno */ }
        const D = Host.datos(); D.descargas = (D.descargas || 0) + lista.length; Host.guardar();
        return out.join('\n');
      },
      put: () => { throw new Error('remote open: Permission denied (la cuenta del equipo de datos es de solo lectura)'); },
      rm: () => { throw new Error('Couldn\'t delete file: Permission denied'); },
      help: () => 'Available commands:\nbye                Quit sftp\ncd path            Change remote directory to \'path\'\nget remote [local] Download file (acepta * y ?)\nmget remote [local] Download multiple files\nlcd path           Change local directory\nlls [ls-options]   Display local directory listing\nlpwd               Print local working directory\nls [-l] [path]     Display remote directory listing\npwd                Display remote working directory',
    };
    cmd.mget = cmd.get; cmd.dir = cmd.ls; cmd['?'] = cmd.help;
    cmd.lls = (...args) => { const p = Sh.norm(args.find((x) => !x.startsWith('-')) || '.'); return (Sh.children ? Sh.children(p) : []).join('\n'); };
    const ejecutar = (linea) => {
      const toks = (linea.match(/"[^"]*"|'[^']*'|\S+/g) || []).map((x) => x.replace(/^["']|["']$/g, ''));
      if (!toks.length) return { out: '' };
      const [c, ...args] = toks;
      if (['bye', 'exit', 'quit'].includes(c)) return { out: '', salir: true };
      const f = cmd[c]; if (!f) return { err: `Invalid command.` };
      try { return { out: f(...args) }; } catch (e) { return { err: e.message } ; }
    };
    return { ejecutar };
  }

  Sh.def('sftp', 'cliente SFTP: sftp -i ~/.ssh/clave -P 2222 usuario@host (o -b lote.txt para un script)', async (a, ctx) => {
    if (!a.length) return Sh.fail('usage: sftp [-b batchfile] [-i identity_file] [-o ssh_option] [-P port] destination', 1);
    const cx = conectar(a); if (cx.error) return Sh.fail(cx.error, 255);
    const S = sesion(cx); const pre = cx.avisos.length ? cx.avisos.join('\n') + '\n' : '';
    if (cx.lote) {
      const txt = Sh.readFile(Sh.norm(cx.lote)); if (txt === null) return Sh.fail(`Couldn't open batch file: ${cx.lote}`, 1);
      const out = [`${pre}Connected to ${cx.host}.`];
      for (const l of txt.split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('#'))) {
        const tolera = l.startsWith('-'); const r = S.ejecutar(tolera ? l.slice(1) : l); out.push('sftp> ' + l); if (r.out) out.push(r.out);
        if (r.err) { out.push(r.err); if (!tolera) return { out: out.join('\n'), code: 1 }; }
        if (r.salir) break;
      }
      return Sh.ok(out.join('\n'));
    }
    if (ctx && ctx.opts && ctx.opts.noInteractivo) return Sh.fail('sftp: en un script usa -b lote.txt', 1);
    return {
      out: `${pre}Connected to ${cx.host}.`, code: 0,
      repl: { prompt: 'sftp> ', cont: '> ', fin: /[\s\S]/, esMeta: () => false, meta: async () => ({ out: '' }), ejecutar: async (l) => { const r = S.ejecutar(l.trim()); return r.salir ? { out: '', exitMode: true } : { out: r.out || r.err || '', code: r.err ? 1 : 0 }; } },
    };
  });

  Sh.def('scp', 'copia archivos por SSH: scp -i ~/.ssh/clave -P 2222 usuario@host:/entrantes/norte/*.csv destino/', (a) => {
    const args = a.map((x) => (x === '-P' ? '-P' : x)); const origen = a.find((x) => /@[^:]+:/.test(x)); const destino = a[a.length - 1];
    if (!origen || origen === destino) return Sh.fail('usage: scp [-i identity_file] [-P port] [-o ssh_option] usuario@host:/ruta destino', 1);
    const sinDestino = args.slice(0, -1); const cx = conectar(sinDestino.map((x) => (x === origen ? origen.replace(/:.*$/, '') : x)));
    if (cx.error) return Sh.fail(cx.error, 1);
    const r = sesion(cx).ejecutar(`get "${origen.replace(/^[^:]+:/, '')}" "${destino}"`);
    if (r.err) return Sh.fail(`scp: ${r.err.replace(/^File /, '')}`, 1);
    return Sh.ok((cx.avisos.length ? cx.avisos.join('\n') + '\n' : '') + r.out.split('\n').map((l) => l.replace(/^Fetching \S+\/([^/]+) to .*$/, '$1                                   100%')).join('\n'));
  });
})();
