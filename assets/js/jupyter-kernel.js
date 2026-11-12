/* Kernel de JupyterLab de práctica: Python real (Pyodide, en el worker de Engines.PY) con el comportamiento de
 * IPython que más se usa al aprender: la última expresión se muestra como Out[n], tablas de pandas en HTML,
 * gráficos de matplotlib como imagen, magics (%timeit, %%writefile, %run, %pwd, %cd, !ls…) y tracebacks con el
 * formato "Cell In[n], line x". Código propio, escrito desde la documentación pública de IPython y JupyterLab. */
(function () {
  'use strict';
  const PRELUDIO = String.raw`
import sys as _s, os as _os, io as _io, json as _jj, ast as _ast, traceback as _tbm, base64 as _b64, time as _tm, linecache as _lc, re as _re, warnings as _w, shlex as _shlex, shutil as _shutil, statistics as _st
_os.environ['MPLBACKEND'] = 'Agg'
_w.filterwarnings('ignore', message='.*non-interactive.*')
_w.filterwarnings('ignore', message='.*FigureCanvasAgg.*')
_JH = '/home/jovyan'
_os.makedirs(_JH, exist_ok=True)
_JS = {'n': 0, 'mt': {}}
_JNS = {}
class _UsageError(Exception):
    pass
def _jup_emit(tag, obj):
    print('\x01' + tag + _jj.dumps(obj, default=str) + '\x02', end='')
def _jup_png(fig):
    b = _io.BytesIO()
    with _w.catch_warnings():
        _w.simplefilter('ignore')
        fig.savefig(b, format='png', bbox_inches='tight', dpi=90)
    w, h = fig.get_size_inches() * fig.dpi
    return {'image/png': _b64.b64encode(b.getvalue()).decode(), 'text/plain': '<Figure size %dx%d with %d Axes>' % (w, h, len(fig.axes))}
def _jup_fmt(o):
    if hasattr(o, 'savefig') and hasattr(o, 'canvas') and hasattr(o, 'axes'):
        d = _jup_png(o)
        plt = _s.modules.get('matplotlib.pyplot')
        if plt:
            try: plt.close(o)
            except Exception: pass
        return d
    try:
        if hasattr(o, '_repr_html_') and not isinstance(o, type):
            h = o._repr_html_()
            if h: return {'text/html': h, 'text/plain': repr(o)}
    except Exception:
        pass
    return {'text/plain': repr(o)}
def _jup_display(*objs, **k):
    for o in objs:
        _jup_emit('DISP', _jup_fmt(o))
class _HTML:
    def __init__(self, data): self.data = data
    def _repr_html_(self): return self.data
    def __repr__(self): return '<IPython.core.display.HTML object>'
def _jup_ns_reset():
    _JNS.clear()
    _JNS.update({'__name__': '__main__', '__builtins__': __builtins__, 'display': _jup_display, 'HTML': _HTML, 'In': [''], 'Out': {}, '_jup_cell': _jup_cell, '_jup_magic': _jup_magic, '_jup_bang': _jup_bang, '_jup_ayuda': _jup_ayuda})
    if _JH not in _s.path: _s.path.insert(0, _JH)
    for m in [m for m, v in list(_s.modules.items()) if getattr(v, '__file__', None) and str(getattr(v, '__file__', '')).startswith(_JH)]:
        del _s.modules[m]
    try: _os.chdir(_JH)
    except Exception: pass
def _jup_sync(archivos, borrar, carpetas):
    for c in carpetas or []:
        _os.makedirs(_os.path.join(_JH, c), exist_ok=True)
    for rel, txt in (archivos or {}).items():
        p = _os.path.join(_JH, rel)
        _os.makedirs(_os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8', newline='') as f: f.write(txt)
        st = _os.stat(p); _JS['mt'][rel] = (st.st_size, st.st_mtime_ns)
    for rel in borrar or []:
        p = _os.path.join(_JH, rel)
        try:
            if _os.path.isdir(p): _shutil.rmtree(p)
            elif _os.path.exists(p): _os.remove(p)
        except Exception: pass
        _JS['mt'].pop(rel, None)
def _jup_scan():
    vistos = {}; cambios = {}; dirs = []
    for raiz, ds, fs in _os.walk(_JH):
        ds[:] = sorted(x for x in ds if not x.startswith('.') and x != '__pycache__')
        for x in ds: dirs.append(_os.path.relpath(_os.path.join(raiz, x), _JH))
        for a in fs:
            p = _os.path.join(raiz, a); rel = _os.path.relpath(p, _JH)
            try: st = _os.stat(p)
            except OSError: continue
            k = (st.st_size, st.st_mtime_ns); vistos[rel] = k
            if _JS['mt'].get(rel) != k:
                if st.st_size > 2500000: cambios[rel] = {'grande': st.st_size}
                else:
                    try:
                        with open(p, encoding='utf-8') as f: cambios[rel] = {'t': f.read()}
                    except (UnicodeDecodeError, OSError): cambios[rel] = {'bin': st.st_size}
    borrados = [r for r in _JS['mt'] if r not in vistos]
    _JS['mt'] = vistos
    return {'cambios': cambios, 'borrados': borrados, 'dirs': dirs}
def _jup_figs():
    plt = _s.modules.get('matplotlib.pyplot')
    if not plt: return
    for num in plt.get_fignums():
        fig = plt.figure(num)
        if fig.axes: _jup_emit('DISP', _jup_png(fig))
    plt.close('all')
def _jup_expr(src):
    try: return eval(compile(src, '<magic>', 'eval'), _JNS)
    except SyntaxError:
        exec(compile(src, '<magic>', 'exec'), _JNS)
def _jup_dur(seg):
    if seg >= 1: return '%.2f s' % seg
    if seg >= 1e-3: return '%.2f ms' % (seg * 1e3)
    if seg >= 1e-6: return '%.2f µs' % (seg * 1e6)
    return '%.0f ns' % (seg * 1e9)
def _jup_timeit(src):
    c = compile(src, '<timeit>', 'exec'); n = 1
    while True:
        t0 = _tm.perf_counter()
        for _ in range(n): exec(c, _JNS)
        dt = _tm.perf_counter() - t0
        if dt >= 0.2 or n >= 1000000: break
        n *= 10
    runs = [dt / n]
    for _ in range(6):
        t0 = _tm.perf_counter()
        for _ in range(n): exec(c, _JNS)
        runs.append((_tm.perf_counter() - t0) / n)
    print('%s ± %s per loop (mean ± std. dev. of 7 runs, %s loop%s each)' % (_jup_dur(_st.mean(runs)), _jup_dur(_st.pstdev(runs)), '{:,}'.format(n), '' if n == 1 else 's'))
def _jup_time(src, celda=False):
    t0 = _tm.perf_counter(); c0 = _tm.process_time()
    try:
        r = None
        if celda: exec(compile(src, '<timed exec>', 'exec'), _JNS)
        else: r = _jup_expr(src)
        return r
    finally:
        cpu = _tm.process_time() - c0; wall = _tm.perf_counter() - t0
        print('CPU times: user %s, sys: 0 ns, total: %s\nWall time: %s' % (_jup_dur(cpu), _jup_dur(cpu), _jup_dur(wall)))
_SIN_PAQUETES = 'Nota: este JupyterLab de práctica corre en tu navegador y no instala paquetes. Ya tienes pandas, numpy, matplotlib y toda la biblioteca estándar de Python. En un JupyterLab real, este comando instalaría el paquete en el entorno del kernel.'
def _jup_magic(linea):
    nombre, _, resto = linea.strip().partition(' '); resto = resto.strip()
    if nombre == 'pwd': return _os.getcwd()
    if nombre == 'cd':
        d = _os.path.expanduser(resto.strip('"\'')) if resto else _JH
        if d == '~': d = _JH
        _os.chdir(d); print(_os.getcwd()); return
    if nombre in ('ls', 'll'): return _jup_bang('ls ' + ('-l ' if nombre == 'll' else '') + resto)
    if nombre == 'time': return _jup_time(resto)
    if nombre == 'timeit': return _jup_timeit(resto)
    if nombre in ('who', 'whos'):
        vs = {k: v for k, v in _JNS.items() if not k.startswith('_') and k not in ('In', 'Out', 'display', 'HTML', 'exit', 'quit', 'get_ipython') and not type(v).__name__ == 'module'}
        if not vs: print('Interactive namespace is empty.'); return
        if nombre == 'who': print('\t'.join(sorted(vs))); return
        print('%-12s %-12s %s' % ('Variable', 'Type', 'Data/Info')); print('-' * 40)
        for k in sorted(vs):
            v = vs[k]; info = repr(v).replace('\n', ' ')
            if hasattr(v, 'shape'): info = 'shape: %s' % (v.shape,)
            print('%-12s %-12s %s' % (k, type(v).__name__, info[:60]))
        return
    if nombre in ('pip', 'conda', 'mamba'): print(_SIN_PAQUETES); return
    if nombre in ('matplotlib', 'load_ext', 'autoreload', 'config'): return
    if nombre == 'run':
        args = _shlex.split(resto); f = args[0] if args else ''
        if not _os.path.exists(f): raise _UsageError('File \x60%s\x60 not found.' % f)
        g = {'__name__': '__main__', '__file__': _os.path.abspath(f), '__builtins__': __builtins__}
        src = open(f, encoding='utf-8').read()
        exec(compile(src, _os.path.abspath(f), 'exec'), g)
        for k, v in g.items():
            if not k.startswith('__'): _JNS[k] = v
        return
    if nombre == 'env':
        if resto: return _os.environ.get(resto)
        return dict(_os.environ)
    if nombre == 'reset':
        _jup_ns_reset(); print('(se borraron todas las variables del kernel)'); return
    if nombre == 'lsmagic':
        print('Line magics que entiende este kernel de práctica:\n%cd  %env  %load_ext  %ls  %lsmagic  %matplotlib  %pip  %pwd  %reset  %run  %time  %timeit  %who  %whos\n\nCell magics:\n%%bash  %%capture  %%html  %%sh  %%time  %%timeit  %%writefile'); return
    raise _UsageError('Line magic function \x60%%%s\x60 not found.' % nombre)
def _jup_ruta(p):
    return _os.path.normpath(_os.path.join(_os.getcwd(), _os.path.expanduser(p.replace('~', _JH, 1) if p.startswith('~') else p)))
def _jup_bang(cmd, capturar=False):
    buf = _io.StringIO(); out = (lambda *a: print(*a, file=buf))
    try: partes = _shlex.split(cmd)
    except ValueError: partes = cmd.split()
    if not partes: return
    c, args = partes[0], partes[1:]
    flags = ''.join(a[1:] for a in args if a.startswith('-') and not a[1:].isdigit())
    pos = [a for a in args if not a.startswith('-')]
    try:
        if c == 'ls':
            objetivos = pos or ['.']
            for o in objetivos:
                p = _jup_ruta(o)
                if _os.path.isdir(p):
                    xs = sorted(x for x in _os.listdir(p) if 'a' in flags or not x.startswith('.'))
                    if 'l' in flags:
                        for x in xs:
                            q = _os.path.join(p, x); st = _os.stat(q)
                            out('%s 1 jovyan users %8d %s %s' % ('drwxr-xr-x' if _os.path.isdir(q) else '-rw-r--r--', st.st_size, _tm.strftime('%b %d %H:%M', _tm.localtime(st.st_mtime)), x))
                    elif xs: out('  '.join(xs))
                elif _os.path.exists(p): out(o)
                else: out("ls: cannot access '%s': No such file or directory" % o)
        elif c == 'pwd': out(_os.getcwd())
        elif c == 'echo': out(' '.join(args))
        elif c in ('cat', 'head', 'tail'):
            n = 10
            for a in args:
                if a.startswith('-') and a[1:].isdigit(): n = int(a[1:])
            if '-n' in args: n = int(args[args.index('-n') + 1]); pos = [x for x in pos if x != str(n)]
            for f in pos:
                p = _jup_ruta(f)
                if not _os.path.isfile(p): out('%s: %s: No such file or directory' % (c, f)); continue
                ls = open(p, encoding='utf-8', errors='replace').read().splitlines()
                for l in (ls if c == 'cat' else ls[:n] if c == 'head' else ls[-n:]): out(l)
        elif c == 'wc':
            for f in pos:
                p = _jup_ruta(f); t = open(p, encoding='utf-8', errors='replace').read()
                out('%d %s' % (t.count('\n'), f) if 'l' in flags else '%d %d %d %s' % (t.count('\n'), len(t.split()), len(t.encode()), f))
        elif c == 'mkdir':
            for d in pos: _os.makedirs(_jup_ruta(d), exist_ok=('p' in flags))
        elif c == 'touch':
            for f in pos: open(_jup_ruta(f), 'a').close()
        elif c == 'rm':
            for f in pos:
                p = _jup_ruta(f)
                if _os.path.isdir(p):
                    if 'r' in flags: _shutil.rmtree(p)
                    else: out("rm: cannot remove '%s': Is a directory" % f)
                elif _os.path.exists(p): _os.remove(p)
                elif 'f' not in flags: out("rm: cannot remove '%s': No such file or directory" % f)
        elif c in ('cp', 'mv') and len(pos) >= 2:
            (_shutil.copy if c == 'cp' else _shutil.move)(_jup_ruta(pos[0]), _jup_ruta(pos[1]))
        elif c in ('pip', 'pip3', 'conda', 'mamba'): out(_SIN_PAQUETES)
        elif c in ('python', 'python3') and pos:
            g = {'__name__': '__main__', '__builtins__': __builtins__}
            exec(compile(open(_jup_ruta(pos[0]), encoding='utf-8').read(), _jup_ruta(pos[0]), 'exec'), g)
        elif c == 'whoami': out('jovyan')
        elif c == 'date': out(_tm.strftime('%a %b %d %H:%M:%S UTC %Y', _tm.gmtime()))
        else: out('/bin/sh: 1: %s: not found' % c)
    except Exception as e:
        out('%s: %s' % (c, e))
    texto = buf.getvalue()
    if capturar: return texto.splitlines()
    print(texto, end='')
def _jup_cell(cab, cuerpo):
    nombre, _, resto = cab.partition(' '); resto = resto.strip()
    if nombre == 'time': return _jup_time(cuerpo, celda=True)
    if nombre == 'timeit': return _jup_timeit(cuerpo)
    if nombre == 'writefile':
        args = _shlex.split(resto); agregar = '-a' in args; f = [a for a in args if a != '-a'][0]
        p = _jup_ruta(f); existe = _os.path.exists(p)
        with open(p, 'a' if agregar else 'w', encoding='utf-8') as fh: fh.write(cuerpo + ('\n' if not cuerpo.endswith('\n') else ''))
        print(('Appending to %s' if agregar else 'Overwriting %s' if existe else 'Writing %s') % f); return
    if nombre in ('bash', 'sh', 'script'):
        for l in cuerpo.splitlines():
            if l.strip() and not l.strip().startswith('#'): _jup_bang(l)
        return
    if nombre == 'html': _jup_emit('DISP', {'text/html': cuerpo, 'text/plain': '<IPython.core.display.HTML object>'}); return
    if nombre == 'capture':
        old = _s.stdout; _s.stdout = _io.StringIO()
        try: exec(compile(cuerpo, '<capture>', 'exec'), _JNS)
        finally: _s.stdout = old
        return
    raise _UsageError('Cell magic \x60%%%%%s\x60 not found.' % nombre)
def _jup_transform(code):
    ls = code.split('\n')
    if ls and ls[0].startswith('%%'):
        return '_jup_cell(%r, %r)' % (ls[0][2:].strip(), '\n'.join(ls[1:]))
    out = []
    for l in ls:
        st = l.lstrip(); ind = l[:len(l) - len(st)]
        m = _re.match(r'^([A-Za-z_]\w*)\s*=\s*!(.*)$', st)
        h = _re.match(r'^([A-Za-z_][\w\.]*)(\?{1,2})$', st)
        if st.startswith('%'): out.append(ind + '_jup_magic(%r)' % st[1:])
        elif st.startswith('!'): out.append(ind + '_jup_bang(%r)' % st[1:])
        elif m: out.append(ind + '%s = _jup_bang(%r, capturar=True)' % (m.group(1), m.group(2)))
        elif h: out.append(ind + '_jup_ayuda(%r)' % h.group(1))
        else: out.append(l)
    return '\n'.join(out)
def _jup_ayuda(nombre):
    o = _jup_expr(nombre)
    print('Type:      %s\nString form: %s\nDocstring:\n%s' % (type(o).__name__, repr(o)[:200], (getattr(o, '__doc__', None) or '<no docstring>').strip()[:3000]))
def _jup_tb(e, n):
    ename = type(e).__name__; evalue = str(e)
    if isinstance(e, SyntaxError) and str(e.filename or '').startswith('<cell-'):
        k = int(e.filename[6:-1]); off = max((e.offset or 1) - 1, 0); txt = (e.text or '').rstrip('\n')
        return {'ename': ename, 'evalue': e.msg, 'traceback': ['  Cell In[%d], line %s' % (k, e.lineno), '    ' + txt.strip(), '    ' + ' ' * max(off - (len(txt) - len(txt.lstrip())), 0) + '^', '%s: %s' % (ename, e.msg)]}
    marcos = [f for f in _tbm.extract_tb(e.__traceback__) if f.filename not in ('<stdin>', '<magic>', '<timed exec>', '<timeit>', '<capture>') and not f.name.startswith('_jup')]
    lib = [i for i, f in enumerate(marcos) if not f.filename.startswith('<cell-')]
    if len(lib) > 3: marcos = [f for i, f in enumerate(marcos) if i not in lib[1:-2]]
    ls = ['-' * 75, '%-42s%s' % (ename, 'Traceback (most recent call last)')]
    for f in marcos:
        if f.filename.startswith('<cell-'):
            k = int(f.filename[6:-1]); src = _lc.getlines(f.filename)
            ls.append('Cell In[%d], line %d%s' % (k, f.lineno, '' if f.name == '<module>' else ', in %s()' % f.name))
            a, b = max(1, f.lineno - 2), min(len(src), f.lineno + 2)
            ancho = len(str(b))
            for i in range(a, b + 1):
                ls.append('%s %s %s' % ('---->' if i == f.lineno else '     ', str(i).rjust(ancho), src[i - 1].rstrip('\n')))
        else:
            ls.append('File %s:%d, in %s' % (f.filename, f.lineno, f.name))
            if f.line: ls.append('----> %d %s' % (f.lineno, f.line.strip()))
        ls.append('')
    ls.append('%s: %s' % (ename, evalue) if evalue else ename)
    return {'ename': ename, 'evalue': evalue, 'traceback': ls}
def _jup_run(payload):
    d = _jj.loads(payload)
    if d.get('reset') or not _JNS: _jup_ns_reset()
    _jup_sync(d.get('archivos'), d.get('borrar'), d.get('carpetas'))
    code = d.get('code')
    if code is None:
        _jup_emit('POST', {'error': None, 'fs': _jup_scan(), 'n': _JS['n']}); return
    __import__('importlib').invalidate_caches()
    _JS['n'] += 1; n = _JS['n']; fname = '<cell-%d>' % n
    _JNS['In'].append(code)
    _lc.cache[fname] = (len(code), None, [l + '\n' for l in code.split('\n')], fname)
    err = None
    try:
        arbol = _ast.parse(_jup_transform(code), fname, 'exec')
        ult = None
        if arbol.body and isinstance(arbol.body[-1], _ast.Expr) and not code.rstrip().endswith(';'):
            ult = _ast.Expression(arbol.body.pop().value)
        exec(compile(arbol, fname, 'exec'), _JNS)
        if ult is not None:
            v = eval(compile(ult, fname, 'eval'), _JNS)
            if v is not None:
                _JNS['_'] = v; _JNS['Out'][n] = v
                _jup_emit('OUT', _jup_fmt(v))
    except _UsageError as e:
        err = {'ename': 'UsageError', 'evalue': str(e), 'traceback': ['UsageError: ' + str(e)]}
    except SystemExit:
        pass
    except BaseException as e:
        err = _jup_tb(e, n)
    try: _jup_figs()
    except Exception: pass
    _jup_emit('POST', {'error': err, 'fs': _jup_scan(), 'n': n})
_jup_ns_reset()
`;

  // ---------------------------------------------------------------- lado del navegador
  const K = {
    listo: false, cargando: null, enviados: {}, carpetasEnviadas: new Set(), estado: 'idle', n: 0, libs: new Set(),
    alCambiar: null,
    _set(e) { this.estado = e; if (this.alCambiar) this.alCambiar(e); },
    reiniciarLocal() { this.listo = false; this.cargando = null; this.enviados = {}; this.carpetasEnviadas = new Set(); this.n = 0; },
    async preparar() {
      if (this.listo) return;
      if (!this.cargando) {
        this.cargando = (async () => {
          this._set('starting');
          const r = await window.Engines.PY.repl(PRELUDIO, 'python', { timeoutMs: 180000 });
          if (!r.ok) { this.cargando = null; this._set('dead'); throw new Error(r.error || 'No se pudo iniciar Python'); }
          this.listo = true; this.n = 0; this._set('idle');
        })();
      }
      return this.cargando;
    },
    // archivos: { ruta: texto } con lo que el kernel debe tener (solo se mandan los que cambiaron)
    async ejecutar(code, { archivos = {}, carpetas = [], borrar = [], reset = false } = {}, reintento = false) {
      await this.preparar();
      const enviar = {};
      for (const [r, t] of Object.entries(archivos)) if (this.enviados[r] !== t) enviar[r] = t;
      const nuevasCarpetas = carpetas.filter((c) => !this.carpetasEnviadas.has(c));
      const quitar = borrar.filter((r) => r in this.enviados);
      const libs = [];
      const usa = (re) => re.test(code || '') || Object.keys(enviar).some((r) => /\.py$/.test(r) && re.test(enviar[r]));
      if (!this.libs.has('pandas') && usa(/\b(pandas|numpy|pd\.|np\.)/)) libs.push('pandas');
      if (!this.libs.has('matplotlib') && usa(/\b(matplotlib|plt\.|\.plot\()/)) libs.push('pandas', 'matplotlib');
      this._set('busy');
      const payload = { code, archivos: enviar, carpetas: nuevasCarpetas, borrar: quitar, reset };
      const r = await window.Engines.PY.repl(`_jup_run(${JSON.stringify(JSON.stringify(payload))})`, 'python', { libs: [...new Set(libs)], timeoutMs: libs.length ? 240000 : 120000 });
      if (!r.ok && /_jup_run|_JNS|_jup_/.test(r.error || '') && !reintento) {
        // el worker se reinició (tiempo agotado u otra herramienta lo limpió): el kernel "murió" y vuelve a arrancar
        this.reiniciarLocal();
        const otra = await this.ejecutar(code, { archivos, carpetas, borrar, reset: true }, true);
        otra.murio = true; return otra;
      }
      if (!r.ok && /Tiempo agotado/.test(r.error || '')) { this.reiniciarLocal(); this._set('idle'); return { outputs: [{ output_type: 'error', ename: 'KernelDied', evalue: 'tiempo agotado', traceback: [r.error, '', 'El kernel se reinició: las variables se perdieron. Vuelve a ejecutar las celdas desde arriba (Run → Run All Cells).'] }], n: null, murio: true }; }
      libs.forEach((l) => this.libs.add(l));
      Object.assign(this.enviados, enviar); nuevasCarpetas.forEach((c) => this.carpetasEnviadas.add(c)); quitar.forEach((q) => delete this.enviados[q]);
      const outputs = []; let post = null;
      const out = String(r.stdout || '');
      const re = /\x01(DISP|OUT|POST)([\s\S]*?)\x02/g; let m, ult = 0;
      const texto = (t) => { if (!t) return; const prev = outputs[outputs.length - 1]; if (prev && prev.output_type === 'stream' && prev.name === 'stdout') prev.text += t; else outputs.push({ output_type: 'stream', name: 'stdout', text: t }); };
      while ((m = re.exec(out))) {
        texto(out.slice(ult, m.index)); ult = re.lastIndex;
        let j; try { j = JSON.parse(m[2]); } catch (e) { continue; }
        if (m[1] === 'POST') post = j;
        else if (m[1] === 'OUT') outputs.push({ output_type: 'execute_result', data: j, execution_count: null });
        else outputs.push({ output_type: 'display_data', data: j });
      }
      texto(out.slice(ult));
      if (!r.ok && r.error) outputs.push({ output_type: 'error', ename: 'Error', evalue: r.error, traceback: [r.error] });
      if (post && post.error) outputs.push({ output_type: 'error', ...post.error });
      const n = post ? post.n : null;
      if (n != null) { this.n = n; outputs.forEach((o) => { if (o.output_type === 'execute_result') o.execution_count = n; }); }
      // lo que el kernel escribió en disco vuelve al explorador de archivos
      if (post && post.fs) for (const [rel, v] of Object.entries(post.fs.cambios || {})) if (v.t != null) this.enviados[rel] = v.t; else delete this.enviados[rel];
      if (post && post.fs) for (const rel of post.fs.borrados || []) delete this.enviados[rel];
      this._set('idle');
      return { outputs, n, fs: post ? post.fs : null };
    },
    async reiniciar() {
      if (!this.listo) { this.n = 0; return; }
      this._set('restarting');
      await window.Engines.PY.repl('_jup_ns_reset(); _JS["n"] = 0', 'python');
      this.n = 0; this._set('idle');
    },
  };
  window.JupyterKernel = K;
})();
