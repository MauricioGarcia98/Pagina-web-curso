/*
 * Comandos de Linux del día a día que faltaban en la terminal de práctica:
 * tee, xargs, seq, basename, dirname, realpath, nl, rev, paste, column, du, df, ps, kill, man,
 * tar, gzip/gunzip, zip/unzip, stat, chown, nano y vim (abren el editor).
 * Los archivos comprimidos se guardan como texto en la máquina simulada (no son binarios reales).
 */
(function () {
  'use strict';
  const Sh = window.Shell;
  const { def, col, ok, Machine, norm, readFile, writeFile, isDir, exists, mkdirp, display, Commands, Help, HOME } = Sh;
  const fail = (m, code = 1) => ({ out: col.err(m), code });
  const save = () => Machine.save();
  const lineas = (s) => { const l = String(s || '').split('\n'); if (l.length && l[l.length - 1] === '') l.pop(); return l; };
  const conFin = (arr) => (arr.length ? arr.join('\n') + '\n' : '');
  const entrada = (pos, ctx, cmd) => {
    if (!pos.length || pos[0] === '-') return { texto: ctx.stdin || '' };
    let texto = '';
    for (const f of pos) { const c = readFile(norm(f)); if (c === null) return { error: fail(`${cmd}: ${f}: No existe el archivo o el directorio`) }; texto += c; }
    return { texto };
  };
  // todo lo que hay debajo de una ruta (para du, tar y zip)
  const debajo = (p) => Object.keys(Machine.fs).filter((k) => k === p || k.startsWith(p + '/'));
  const legible = (n) => { const u = ['', 'K', 'M', 'G']; let i = 0, v = n; while (v >= 1024 && i < 3) { v /= 1024; i++; } return (i ? v.toFixed(v < 10 ? 1 : 0) : String(v)) + u[i]; };

  def('tee', 'muestra lo que recibe y además lo guarda en un archivo (-a agrega)', (a, ctx) => {
    const agregar = a.includes('-a'); const archivos = a.filter((x) => x !== '-a');
    for (const f of archivos) writeFile(norm(f), ctx.stdin || '', agregar);
    save(); return ok((ctx.stdin || '').replace(/\n$/, ''));
  });
  def('xargs', 'ejecuta un comando con lo que recibe como argumentos: ls *.csv | xargs wc -l', async (a, ctx) => {
    let n = null, rep = null; const resto = [...a];
    for (;;) {
      if (resto[0] === '-n') { n = Number(resto[1]); resto.splice(0, 2); continue; }
      if (resto[0] === '-I') { rep = resto[1]; resto.splice(0, 2); continue; }
      if (/^-I./.test(resto[0] || '')) { rep = resto[0].slice(2); resto.shift(); continue; }
      if (resto[0] === '-0' || resto[0] === '-r' || resto[0] === '-t' || /^-P\d*$/.test(resto[0] || '')) { if (resto[0] === '-P') resto.shift(); resto.shift(); continue; }
      break;
    }
    // -I {}: una ejecución por línea, reemplazando {} por la línea
    if (rep) {
      const outs = []; let code = 0;
      for (const l of String(ctx.stdin || '').split('\n').filter((x) => x.trim())) {
        const linea = resto.map((x) => x.split(rep).join(l)).map((x) => (/\s/.test(x) ? `"${x}"` : x)).join(' ');
        const r = await window.Shell.runLine(linea, ctx.opts || {}); if (r.out) outs.push(r.out); if (r.code) code = r.code;
      }
      return { out: outs.join('\n'), code };
    }
    const cmd = resto.shift() || 'echo';
    if (!Commands[cmd]) return fail(`xargs: ${cmd}: comando no encontrado`, 127);
    const items = String(ctx.stdin || '').split(/\s+/).filter(Boolean);
    const grupos = n ? Array.from({ length: Math.ceil(items.length / n) }, (_, i) => items.slice(i * n, i * n + n)) : [items];
    const outs = []; let code = 0;
    for (const g of grupos) { const r = await Commands[cmd]([...resto, ...g], { stdin: '' }); if (r.out) outs.push(r.out); if (r.code) code = r.code; }
    return { out: outs.join('\n'), code };
  });
  def('ln', 'crea un enlace: ln -s destino nombre (un acceso directo a otro archivo o carpeta)', (a) => {
    const pos = a.filter((x) => !x.startsWith('-'));
    if (pos.length < 2) return fail('ln: falta el operando del archivo de destino\nUso: ln -s DESTINO NOMBRE_DEL_ENLACE');
    const [dest, nombre] = pos, pd = norm(dest), pn = norm(nombre);
    if (!exists(pd) && !a.some((x) => /s/.test(x) && x.startsWith('-'))) return fail(`ln: no se pudo acceder a '${dest}': No existe el archivo o el directorio`);
    if (exists(pn) && !a.some((x) => /f/.test(x) && x.startsWith('-'))) return fail(`ln: no se pudo crear el enlace simbólico '${nombre}': El archivo ya existe`);
    // el simulador copia el contenido y recuerda a dónde apunta (ls -l lo muestra como enlace)
    if (isDir(pd)) { mkdirp(pn); Machine.fs[pn].enlace = dest; } else { writeFile(pn, readFile(pd) || ''); Machine.fs[pn].enlace = dest; }
    save(); return ok('');
  });
  // ---------------------------------------------------------------- PySpark interactivo, ruff y macOS
  def('pyspark', 'abre la consola interactiva de PySpark (la variable spark ya existe; exit() para salir)', async () => {
    if (window.Engines && window.Engines.PY) {
      const r = await window.Engines.PY.repl('from __main__ import _env as _e0\n_e1 = _e0("pyspark")\nspark = _e1["spark"]; sc = _e1["sc"]\nfrom pyspark.sql import functions as F', 'pyspark');
      if (!r.ok) return fail('No se pudo iniciar PySpark: ' + (r.error || ''));
    }
    return ok(`Python 3.13.2 (main) [GCC 13.2.0] on linux\nWelcome to\n      ____              __\n     / __/__  ___ _____/ /__\n    _\\ \\/ _ \\/ _ \`/ __/  '_/\n   /__ / .__/\\_,_/_/ /_/\\_\\   version 4.0.1 (mini-Spark del curso)\n      /_/\n\nUsing Python version 3.13.2\nSpark context Web UI available at http://localhost:4040\nSpark context available as 'sc' (master = local[*]).\nSparkSession available as 'spark'.\n${col.dim('Prueba: spark.table("clientes").groupBy("pais").count().show()   ·   exit() para salir')}`);
  });
  // ruff: el linter y formateador de Python más usado hoy. Revisa reglas básicas de verdad sobre tus archivos.
  function archivosPy(rutas) {
    const out = [];
    for (const r of rutas.length ? rutas : ['.']) {
      const p = norm(r);
      if (isDir(p)) out.push(...Object.keys(Machine.fs).filter((k) => Machine.fs[k].t === 'f' && k.endsWith('.py') && k.startsWith(p === '/' ? '/' : p + '/') && !/\/\.venv\/|\/node_modules\//.test(k)));
      else if (Machine.fs[p]) out.push(p);
    }
    return [...new Set(out)].sort();
  }
  function revisarPy(src) {
    const L = src.split('\n'), errs = [];
    const usado = (nombre, i) => L.some((l, j) => j !== i && new RegExp(`\\b${nombre.replace('.', '\\.')}\\b`).test(l.replace(/#.*$/, '')));
    L.forEach((l, i) => {
      let m;
      if ((m = l.match(/^import\s+([\w.]+)(?:\s+as\s+(\w+))?\s*$/))) { const n = m[2] || m[1].split('.')[0]; if (!usado(n, i)) errs.push({ i, c: 1, cod: 'F401', fix: true, msg: `\`${m[1]}\` imported but unused` }); }
      if ((m = l.match(/^from\s+([\w.]+)\s+import\s+(\w+)(?:\s+as\s+(\w+))?\s*$/))) { const n = m[3] || m[2]; if (!usado(n, i)) errs.push({ i, c: 1, cod: 'F401', fix: true, msg: `\`${m[1]}.${m[2]}\` imported but unused` }); }
      if ((m = l.match(/[=!]=\s*None\b/))) errs.push({ i, c: m.index + 1, cod: 'E711', fix: true, msg: `Comparison to \`None\` should be \`cond is ${m[0][0] === '!' ? 'not ' : ''}None\`` });
      if ((m = l.match(/==\s*(True|False)\b/))) errs.push({ i, c: m.index + 1, cod: 'E712', fix: true, msg: `Avoid equality comparisons to \`${m[1]}\`; use \`if cond:\` for truth checks` });
      if ((m = l.match(/^\s*except\s*:/))) errs.push({ i, c: m[0].indexOf('except') + 1, cod: 'E722', fix: false, msg: 'Do not use bare `except`' });
      if ((m = l.match(/\bf(["'])[^{}"']*\1/))) errs.push({ i, c: m.index + 1, cod: 'F541', fix: true, msg: 'f-string without any placeholders' });
      if ((m = l.match(/^\s*(\w+)\s*=\s*lambda\b/))) errs.push({ i, c: 1, cod: 'E731', fix: false, msg: `Do not assign a \`lambda\` expression, use a \`def\`` });
    });
    return errs;
  }
  def('ruff', 'linter y formateador de Python: ruff check . · ruff check --fix . · ruff format .', (a) => {
    const sub = a[0];
    if (!sub || sub === '--help' || sub === 'help') return ok('Ruff: An extremely fast Python linter and code formatter.\n\nUsage: ruff [OPTIONS] <COMMAND>\n\nCommands:\n  check   Run Ruff on the given files or directories\n  format  Run the Ruff formatter on the given files or directories\n  rule    Explain a rule (or all rules)\n  version Display Ruff\'s version');
    if (sub === '--version' || sub === 'version') return ok('ruff 0.14.1');
    const pos = a.slice(1).filter((x) => !x.startsWith('-'));
    const fs = archivosPy(pos);
    if (sub === 'check') {
      const arreglar = a.includes('--fix');
      let total = 0, arreglables = 0, arregladas = 0; const lineas = [];
      for (const f of fs) {
        let src = readFile(f); const errs = revisarPy(src);
        if (arreglar && errs.some((e) => e.fix)) {
          const L = src.split('\n');
          for (const e of errs.filter((x) => x.fix).sort((x, y) => y.i - x.i)) {
            if (e.cod === 'F401') L.splice(e.i, 1);
            else if (e.cod === 'E711') L[e.i] = L[e.i].replace(/==\s*None/, 'is None').replace(/!=\s*None/, 'is not None');
            else if (e.cod === 'E712') L[e.i] = L[e.i].replace(/\s*==\s*True\b/, '').replace(/(\S+)\s*==\s*False\b/, 'not $1');
            else if (e.cod === 'F541') L[e.i] = L[e.i].replace(/\bf(["'])/, '$1');
            arregladas++;
          }
          writeFile(f, L.join('\n')); src = L.join('\n');
        }
        const quedan = arreglar ? revisarPy(src) : errs;
        for (const e of quedan) { total++; if (e.fix) arreglables++; lineas.push(`${display(f).replace(/^~\//, '')}:${e.i + 1}:${e.c}: ${col.err(e.cod)} ${e.fix ? '[*] ' : ''}${e.msg}`); }
      }
      save();
      if (!fs.length) return ok(col.warn('warning: No Python files found under the given path(s)'));
      if (!total) return ok(arregladas ? `Found ${arregladas} error${arregladas === 1 ? '' : 's'} (${arregladas} fixed, 0 remaining).` : col.ok('All checks passed!'));
      return { out: lineas.join('\n') + `\nFound ${total + arregladas} error${total + arregladas === 1 ? '' : 's'}${arregladas ? ` (${arregladas} fixed, ${total} remaining)` : ''}.` + (arreglables ? `\n[*] ${arreglables} fixable with the \`--fix\` option.` : ''), code: 1 };
    }
    if (sub === 'format') {
      let cambiados = 0;
      for (const f of fs) {
        const src = readFile(f);
        const nuevo = src.split('\n').map((l) => l.replace(/\s+$/, '').replace(/'([^'"\\]*)'/g, '"$1"').replace(/\t/g, '    ')).join('\n').replace(/\n*$/, '\n');
        if (nuevo !== src) { if (!a.includes('--check')) writeFile(f, nuevo); cambiados++; }
      }
      save();
      if (a.includes('--check')) return { out: fs.filter(() => false).join('') + `${cambiados} file${cambiados === 1 ? '' : 's'} would be reformatted, ${fs.length - cambiados} file${fs.length - cambiados === 1 ? '' : 's'} already formatted`, code: cambiados ? 1 : 0 };
      return ok(`${cambiados ? cambiados + ` file${cambiados === 1 ? '' : 's'} reformatted, ` : ''}${fs.length - cambiados} file${fs.length - cambiados === 1 ? '' : 's'} left unchanged`);
    }
    if (sub === 'rule') { const R = { F401: 'unused-import: un import que nunca se usa. Ocupa memoria y confunde.', E711: 'none-comparison: se compara con None usando is / is not.', E712: 'true-false-comparison: no compares con True/False; usa la condición directa.', E722: 'bare-except: un except sin tipo atrapa todo, incluso errores que no esperabas.', F541: 'f-string-missing-placeholders: un f-string sin {}: sobra la f.', E731: 'lambda-assignment: si le das nombre, escríbela con def.' }; return ok(R[a[1]] ? `# ${a[1]}\n\n${R[a[1]]}` : 'Reglas simuladas: ' + Object.keys(R).join(', ')); }
    return fail(`error: unrecognized subcommand '${sub}'\n\nUsage: ruff [OPTIONS] <COMMAND>`, 2);
  });
  def('xcode-select', 'macOS: instala las herramientas de línea de comandos de Apple (xcode-select --install)', (a) => {
    if (a.includes('--install')) return ok('xcode-select: note: install requested for command line developer tools\n' + col.dim('(en una Mac se abre una ventana: acepta y espera unos minutos; trae git, make y el compilador)'));
    if (a.includes('-p') || a.includes('--print-path')) return ok('/Library/Developer/CommandLineTools');
    if (a.includes('--version') || a.includes('-v')) return ok('xcode-select version 2409.');
    return fail('xcode-select: error: uso: xcode-select --install | -p | --version');
  });
  def('seq', 'secuencia de números: seq 5 · seq 2 10 · seq 0 5 100', (a) => {
    const n = a.map(Number); if (!n.length || n.some(isNaN)) return fail('seq: falta un operando numérico');
    const [ini, paso, fin] = n.length === 1 ? [1, 1, n[0]] : n.length === 2 ? [n[0], 1, n[1]] : n;
    const out = []; for (let i = ini; paso > 0 ? i <= fin : i >= fin; i += paso) { out.push(String(i)); if (out.length > 10000) break; }
    return ok(out.join('\n'));
  });
  def('basename', 'el nombre del archivo, sin la carpeta: basename datos/ventas.csv .csv', (a) => {
    if (!a[0]) return fail('basename: falta un operando');
    let b = a[0].replace(/\/+$/, '').split('/').pop(); if (a[1] && b.endsWith(a[1])) b = b.slice(0, -a[1].length); return ok(b);
  });
  def('dirname', 'la carpeta de una ruta: dirname datos/ventas.csv', (a) => {
    if (!a[0]) return fail('dirname: falta un operando');
    const p = a[0].replace(/\/+$/, ''); return ok(p.includes('/') ? p.slice(0, p.lastIndexOf('/')) || '/' : '.');
  });
  def('realpath', 'la ruta completa (absoluta) de un archivo', (a) => ok((a.length ? a : ['.']).map((x) => norm(x)).join('\n')));
  def('nl', 'numera las líneas de un archivo', (a, ctx) => {
    const e = entrada(a, ctx, 'nl'); if (e.error) return e.error;
    let n = 0; return ok(lineas(e.texto).map((l) => (l.trim() ? `${String(++n).padStart(6)}\t${l}` : l)).join('\n'));
  });
  def('rev', 'invierte cada línea, carácter por carácter', (a, ctx) => {
    const e = entrada(a, ctx, 'rev'); if (e.error) return e.error;
    return ok(lineas(e.texto).map((l) => [...l].reverse().join('')).join('\n'));
  });
  def('paste', 'une archivos lado a lado, línea por línea (-d separador)', (a) => {
    let sep = '\t'; const fs = [];
    for (let i = 0; i < a.length; i++) { if (a[i] === '-d') sep = a[++i]; else if (a[i].startsWith('-d')) sep = a[i].slice(2); else fs.push(a[i]); }
    const cols = []; for (const f of fs) { const c = readFile(norm(f)); if (c === null) return fail(`paste: ${f}: No existe el archivo o el directorio`); cols.push(lineas(c)); }
    const n = Math.max(0, ...cols.map((c) => c.length));
    return ok(Array.from({ length: n }, (_, i) => cols.map((c) => c[i] ?? '').join(sep)).join('\n'));
  });
  def('column', 'alinea columnas para leerlas mejor: column -s, -t datos.csv', (a, ctx) => {
    let sep = null, tabla = false; const fs = [];
    for (let i = 0; i < a.length; i++) { const x = a[i]; if (x === '-t') tabla = true; else if (x === '-s') sep = a[++i]; else if (/^-s./.test(x)) sep = x.slice(2); else if (x === '-ts' || x === '-st') { tabla = true; sep = a[++i]; } else fs.push(x); }
    const e = entrada(fs, ctx, 'column'); if (e.error) return e.error;
    if (!tabla) return ok(e.texto.replace(/\n$/, ''));
    const filas = lineas(e.texto).map((l) => (sep ? l.split(sep) : l.trim().split(/\s+/)));
    const anchos = []; filas.forEach((f) => f.forEach((c, i) => { anchos[i] = Math.max(anchos[i] || 0, c.length); }));
    return ok(filas.map((f) => f.map((c, i) => (i < f.length - 1 ? c.padEnd(anchos[i]) : c)).join('  ')).join('\n'));
  });
  def('du', 'cuánto ocupan archivos y carpetas (-s total, -h legible)', (a) => {
    const letras = new Set(a.filter((x) => /^-\w+$/.test(x)).join('').replace(/-/g, '').split(''));
    const rutas = a.filter((x) => !/^-\w+$/.test(x)); if (!rutas.length) rutas.push('.');
    const out = [];
    for (const r of rutas) {
      const p = norm(r); if (!exists(p)) return fail(`du: no se puede acceder a '${r}': No existe el archivo o el directorio`);
      const total = debajo(p).reduce((s, k) => s + (Machine.fs[k].t === 'f' ? Machine.fs[k].c.length : 4096), 0);
      if (!letras.has('s') && isDir(p)) {
        for (const k of debajo(p).filter((k) => k !== p && Machine.fs[k].t === 'd').sort()) {
          const t = debajo(k).reduce((s, x) => s + (Machine.fs[x].t === 'f' ? Machine.fs[x].c.length : 4096), 0);
          out.push(`${letras.has('h') ? legible(t) : Math.ceil(t / 1024)}\t${r.replace(/\/$/, '')}${k.slice(p.length)}`);
        }
      }
      out.push(`${letras.has('h') ? legible(total) : Math.ceil(total / 1024)}\t${r}`);
    }
    return ok(out.join('\n'));
  });
  def('df', 'espacio libre en los discos (-h legible)', (a) => {
    const usado = Object.values(Machine.fs).reduce((s, f) => s + (f.t === 'f' ? f.c.length : 4096), 0), total = 64 * 1024 ** 3;
    const h = a.some((x) => /h/.test(x));
    const f = (n) => (h ? legible(n) : String(Math.round(n / 1024)));
    return ok(`S.ficheros      ${h ? 'Tamaño' : 'bloques de 1K'}  Usados  Disp  Uso% Montado en\n/dev/sda1       ${f(total).padStart(6)} ${f(usado).padStart(7)} ${f(total - usado).padStart(5)} ${String(Math.max(1, Math.round((usado / total) * 100))).padStart(3)}% /`);
  });
  def('ps', 'procesos en ejecución (ps aux: todos)', (a) => {
    const todos = a.some((x) => /a/.test(x));
    const procs = [['1', 'init'], ['812', 'bash'], ['1203', 'ps' + (a.length ? ' ' + a.join(' ') : '')]];
    const dk = (Machine.cloud.docker || {}).containers || {};
    Object.values(dk).filter((c) => c.estado === 'running' || c.status === 'running').forEach((c, i) => procs.splice(2, 0, [String(2000 + i), `containerd-shim (${c.nombre || c.name || 'contenedor'})`]));
    if (todos) return ok('USER       PID %CPU %MEM COMMAND\n' + procs.map(([p, c]) => `alumno ${p.padStart(8)}  0.0  0.1 ${c}`).join('\n'));
    return ok('    PID TTY          TIME CMD\n' + procs.filter(([, c]) => /bash|ps/.test(c)).map(([p, c]) => `${p.padStart(7)} pts/0    00:00:00 ${c.split(' ')[0]}`).join('\n'));
  });
  def('kill', 'termina un proceso por su número (PID)', (a) => {
    const pid = a.filter((x) => !x.startsWith('-'))[0];
    if (!pid) return fail('kill: uso: kill [-9] PID');
    if (pid === '812' || pid === '1') return fail(`kill: (${pid}) - Operación no permitida en la máquina de práctica`);
    return fail(`kill: (${pid}) - No existe el proceso`);
  });
  const quitarHtmlG = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  def('man', 'el manual de un comando: man grep (q para salir en Linux real)', (a) => {
    const c = a[0]; if (!c) return fail('¿Qué página del manual quieres? Por ejemplo: man grep');
    const D = (window.ExplicaCmd && window.ExplicaCmd.DICCIONARIO[c]) || null;
    if (!Commands[c] && !D) return fail(`No hay entrada de manual para ${c}`, 16);
    // for, while, if y case son palabras del lenguaje de bash: en Linux real están en man bash (o help for)
    if (!Commands[c] && D) return ok(`${col.b(c.toUpperCase())} (palabra reservada de bash)\n\n    ${quitarHtmlG(D.que)}\n\n${col.b('FORMA')}\n    ${quitarHtmlG(D.arg || '')}\n\n${col.dim(`En Linux real: help ${c}  (o man bash y busca /${c})`)}`);
    const quitarHtml = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    let out = `${col.b(c.toUpperCase())}\n\n${col.b('NOMBRE')}\n    ${c} — ${quitarHtml(D ? D.que : Help[c] || '')}\n`;
    if (Help[c]) out += `\n${col.b('USO')}\n    ${Help[c]}\n`;
    if (D && D.sub) out += `\n${col.b('SUBCOMANDOS')}\n` + Object.entries(D.sub).map(([k, v]) => `    ${col.info(k.padEnd(14))}${quitarHtml(v)}`).join('\n') + '\n';
    if (D && D.op) out += `\n${col.b('OPCIONES')}\n` + Object.entries(D.op).map(([k, v]) => `    ${col.info(k.padEnd(14))}${quitarHtml(v)}`).join('\n') + '\n';
    return ok(out + `\n${col.dim(`En una computadora real, el manual completo está en: man ${c}`)}`);
  });
  def('stat', 'información de un archivo: tamaño, permisos y fecha', (a) => {
    const f = a[0]; if (!f) return fail('stat: falta un operando');
    const p = norm(f), x = Machine.fs[p]; if (!x) return fail(`stat: no se puede efectuar 'stat' sobre '${f}': No existe el archivo o el directorio`);
    return ok(`  Fichero: ${f}\n  Tamaño: ${x.t === 'f' ? x.c.length : 4096}\tTipo: ${x.t === 'd' ? 'directorio' : 'fichero regular'}\nAcceso: (${x.t === 'd' ? '0755/drwxr-xr-x' : x.x ? '0755/-rwxr-xr-x' : '0644/-rw-r--r--'})  Uid: (1000/alumno)\nModificación: ${new Date(x.m || Date.now()).toISOString().replace('T', ' ').slice(0, 19)}`);
  });
  def('chown', 'cambia el dueño de un archivo (en la máquina de práctica todo es de alumno)', (a) => {
    const f = a[a.length - 1]; if (!f || !exists(norm(f))) return fail(`chown: no se puede acceder a '${f || ''}': No existe el archivo o el directorio`);
    return ok('');
  });
  for (const ed of ['nano', 'vim', 'vi']) {
    def(ed, `editor de texto en la terminal (aquí abre el editor del curso, igual que code)`, (a, ctx) => (Commands.code ? Commands.code(a, ctx) : fail(`${ed}: no disponible`)));
  }

  // ---------------------------------------------------------------- archivos comprimidos
  const MARCA = '#archivo-simulado ';
  const empaquetar = (rutas) => {
    const items = {};
    for (const r of rutas) { const p = norm(r); if (!exists(p)) return { error: r }; for (const k of debajo(p)) { const rel = r.replace(/\/+$/, '') + k.slice(p.length); items[rel] = Machine.fs[k].t === 'd' ? null : Machine.fs[k].c; } }
    return { items };
  };
  const desempaquetar = (texto) => { if (!String(texto).startsWith(MARCA)) return null; try { return JSON.parse(texto.slice(texto.indexOf('\n') + 1)); } catch (e) { return null; } };
  def('tar', 'empaqueta y comprime: tar -czf a.tar.gz carpeta · tar -tzf (lista) · tar -xzf (extrae)', (a) => {
    const modo = (a[0] || '').replace(/^-/, '');
    if (!/[ctx]/.test(modo)) return fail("tar: debes indicar una de estas opciones: -c (crear), -t (listar), -x (extraer)\nEjemplo: tar -czf respaldo.tar.gz datos/", 2);
    let rest = a.slice(1); let destino = null;
    const iC = rest.indexOf('-C'); if (iC >= 0) { destino = rest[iC + 1]; rest.splice(iC, 2); }
    const archivo = /f/.test(modo) ? rest.shift() : null;
    if (!archivo) return fail('tar: falta el nombre del archivo (opción f)', 2);
    const verbose = /v/.test(modo);
    if (/c/.test(modo)) {
      if (!rest.length) return fail('tar: no se especificaron archivos para empaquetar', 2);
      const e = empaquetar(rest); if (e.error) return fail(`tar: ${e.error}: No existe el archivo o el directorio`, 2);
      writeFile(norm(archivo), MARCA + 'tar\n' + JSON.stringify(e.items)); save();
      return ok(verbose ? Object.keys(e.items).join('\n') : '');
    }
    const c = readFile(norm(archivo)); if (c === null) return fail(`tar: ${archivo}: No existe el archivo o el directorio`, 2);
    const items = desempaquetar(c); if (!items) return fail('tar: Esto no parece un archivo tar', 2);
    if (/t/.test(modo)) return ok(Object.keys(items).join('\n'));
    const base = destino ? norm(destino) : Machine.cwd;
    for (const [rel, cont] of Object.entries(items)) { const p = norm(base + '/' + rel); if (cont === null) mkdirp(p); else writeFile(p, cont); }
    save(); return ok(verbose ? Object.keys(items).join('\n') : '');
  });
  def('gzip', 'comprime un archivo (queda archivo.gz)', (a) => {
    const fs = a.filter((x) => !x.startsWith('-')); if (!fs.length) return fail('gzip: falta el archivo');
    for (const f of fs) { const p = norm(f), c = readFile(p); if (c === null) return fail(`gzip: ${f}: No existe el archivo o el directorio`); writeFile(p + '.gz', MARCA + 'gzip\n' + JSON.stringify({ c })); delete Machine.fs[p]; }
    save(); return ok('');
  });
  def('gunzip', 'descomprime un archivo .gz', (a) => {
    const fs = a.filter((x) => !x.startsWith('-')); if (!fs.length) return fail('gunzip: falta el archivo');
    for (const f of fs) { const p = norm(f), c = readFile(p), d = c && desempaquetar(c); if (!d || !('c' in d)) return fail(`gunzip: ${f}: no tiene formato gzip`); writeFile(p.replace(/\.gz$/, ''), d.c); delete Machine.fs[p]; }
    save(); return ok('');
  });
  def('zip', 'comprime en un .zip: zip -r archivo.zip carpeta', (a) => {
    const rest = a.filter((x) => !x.startsWith('-')); const archivo = rest.shift();
    if (!archivo || !rest.length) return fail('zip: uso: zip -r archivo.zip carpeta_o_archivos');
    const e = empaquetar(rest); if (e.error) return fail(`zip: ${e.error}: No existe el archivo o el directorio`, 12);
    writeFile(norm(archivo.endsWith('.zip') ? archivo : archivo + '.zip'), MARCA + 'zip\n' + JSON.stringify(e.items)); save();
    return ok(Object.keys(e.items).map((k) => `  adding: ${k}`).join('\n'));
  });
  def('unzip', 'descomprime un .zip (-l lista, -d carpeta destino)', (a) => {
    const lista = a.includes('-l'); let destino = null; const rest = [];
    for (let i = 0; i < a.length; i++) { if (a[i] === '-d') destino = a[++i]; else if (!a[i].startsWith('-')) rest.push(a[i]); }
    const c = rest[0] && readFile(norm(rest[0])); if (!c) return fail(`unzip: no se encuentra ${rest[0] || 'el archivo'}`, 9);
    const items = desempaquetar(c); if (!items) return fail(`unzip: ${rest[0]} no es un archivo zip`, 9);
    if (lista) return ok(Object.keys(items).join('\n'));
    const base = destino ? norm(destino) : Machine.cwd;
    for (const [rel, cont] of Object.entries(items)) { const p = norm(base + '/' + rel); if (cont === null) mkdirp(p); else writeFile(p, cont); }
    save(); return ok(Object.keys(items).map((k) => `  inflating: ${k}`).join('\n'));
  });
})();
