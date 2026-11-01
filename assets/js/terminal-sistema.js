/*
 * Comandos de sistema y de archivos que un estudiante escribe por su cuenta y faltaban:
 * uname, hostname, uptime, free, top/htop, cal, time, yes, nohup, jobs, watch,
 * md5sum, sha256sum, base64, split, comm, shuf, iconv, wget y crontab.
 * Responden como en Ubuntu, sobre la máquina simulada del curso.
 */
(function () {
  'use strict';
  const Sh = window.Shell;
  const { def, col, ok, Machine, norm, readFile, writeFile, exists, Commands, HOME } = Sh;
  const fail = (m, code = 1) => ({ out: col.err(m), code });
  const save = () => Machine.save();
  const lineas = (s) => { const l = String(s || '').split('\n'); if (l.length && l[l.length - 1] === '') l.pop(); return l; };
  const entrada = (pos, ctx, cmd) => {
    if (!pos.length || pos[0] === '-') return { texto: ctx.stdin || '', nombre: '-' };
    const c = readFile(norm(pos[0]));
    if (c === null) return { error: fail(`${cmd}: ${pos[0]}: No existe el archivo o el directorio`) };
    return { texto: c, nombre: pos[0] };
  };
  const HOST = 'academia', USUARIO = 'alumno';
  const inicio = Date.now() - (2 * 3600 + 13 * 60) * 1000;
  const reloj = () => new Date().toTimeString().slice(0, 8);
  const encendido = () => { const m = Math.floor((Date.now() - inicio) / 60000); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };

  // ---------------------------------------------------------------- información del sistema
  def('uname', 'datos del sistema operativo: uname -a (todo), -r (versión del kernel), -m (arquitectura)', (a) => {
    const f = a.join('');
    if (f.includes('a')) return ok(`Linux ${HOST} 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 x86_64 x86_64 GNU/Linux`);
    const p = [];
    if (!f || f.includes('s')) p.push('Linux');
    if (f.includes('n')) p.push(HOST);
    if (f.includes('r')) p.push('6.8.0-45-generic');
    if (f.includes('m')) p.push('x86_64');
    if (f.includes('o')) p.push('GNU/Linux');
    return ok(p.join(' '));
  });
  def('hostname', 'el nombre de esta computadora en la red', (a) => ok(a.includes('-I') ? '10.0.2.15' : HOST));
  def('uptime', 'hace cuánto está encendida la máquina y cuánta carga tiene', (a) => (a.includes('-p') ? ok(`up ${encendido().replace(':', ' hours, ')} minutes`) : ok(` ${reloj()} up  ${encendido()},  1 user,  load average: 0.08, 0.12, 0.10`)));
  def('free', 'memoria RAM usada y libre (-h legible)', (a) => {
    const h = a.some((x) => /h/.test(x));
    const v = (gb) => (h ? (gb >= 1 ? gb.toFixed(1) + 'Gi' : Math.round(gb * 1024) + 'Mi') : String(Math.round(gb * 1024 * 1024)));
    return ok(`               total        used        free      shared  buff/cache   available\nMem:   ${v(7.8).padStart(13)} ${v(2.1).padStart(11)} ${v(3.9).padStart(11)} ${v(0.2).padStart(11)} ${v(1.8).padStart(11)} ${v(5.4).padStart(11)}\nSwap:  ${v(2).padStart(13)} ${v(0).padStart(11)} ${v(2).padStart(11)}`);
  });
  const top = () => ok(`top - ${reloj()} up  ${encendido()},  1 user,  load average: 0.08, 0.12, 0.10
Tasks:   4 total,   1 running,   3 sleeping,   0 stopped,   0 zombie
%Cpu(s):  1.3 us,  0.4 sy,  0.0 ni, 98.1 id,  0.2 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :   7987.2 total,   3993.6 free,   2150.4 used,   1843.2 buff/cache
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   5529.6 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   1203 ${USUARIO}    20   0   10512   3840   3328 R   0.7   0.0   0:00.02 top
    812 ${USUARIO}    20   0    8740   5376   3584 S   0.0   0.1   0:00.21 bash
      1 root      20   0   22072  13056   9472 S   0.0   0.2   0:01.47 systemd
${col.dim('(En una terminal real, top se actualiza cada 3 segundos: sales con q. Ordena por memoria con M y por CPU con P.)')}`);
  def('top', 'procesos que más CPU y memoria usan, en vivo (se sale con q)', top);
  def('htop', 'como top pero con colores y barras (hay que instalarlo: sudo apt install htop)', top);
  def('cal', 'muestra el calendario del mes', () => {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth();
    const nombre = d.toLocaleString('es', { month: 'long' });
    const tit = `${nombre} ${y}`, dias = new Date(y, m + 1, 0).getDate(), ini = new Date(y, m, 1).getDay();
    let s = ' '.repeat(Math.max(0, Math.floor((20 - tit.length) / 2))) + tit + '\ndo lu ma mi ju vi sá\n' + '   '.repeat(ini);
    for (let i = 1; i <= dias; i++) { const t = String(i).padStart(2); s += i === d.getDate() ? col.b(t) : t; s += (ini + i) % 7 === 0 ? '\n' : ' '; }
    return ok(s.replace(/\s+$/, ''));
  });

  // ---------------------------------------------------------------- correr comandos
  const cita = (x) => (/[\s|;&<>$"]/.test(x) ? `'${x.replace(/'/g, "'\\''")}'` : x);
  def('time', 'mide cuánto tarda un comando: time python etl.py', async (a, ctx) => {
    if (!a.length) return ok('\nreal\t0m0.000s\nuser\t0m0.000s\nsys\t0m0.000s');
    const t0 = performance.now();
    const r = await Sh.runLine(a.map(cita).join(' '), ctx.opts || {});
    const s = (performance.now() - t0) / 1000, f = (x) => `0m${x.toFixed(3)}s`;
    return { out: `${r.out ? r.out + '\n' : ''}\nreal\t${f(s)}\nuser\t${f(s * 0.62)}\nsys\t${f(s * 0.08)}`, code: r.code };
  });
  def('yes', 'repite "y" (o un texto) sin parar; se usa para responder que sí a todo: yes | apt install …', (a) => ok(Array(200).fill(a.length ? a.join(' ') : 'y').join('\n')));
  def('nohup', 'corre un comando que sigue vivo aunque cierres la terminal; la salida va a nohup.out', async (a, ctx) => {
    if (!a.length) return fail('nohup: falta un operando');
    const r = await Sh.runLine(a.map(cita).join(' '), ctx.opts || {});
    writeFile(norm('nohup.out'), (r.out || '').replace(/\u0001[^\u0002]*\u0002|\u0003/g, '') + '\n', true); save();
    return { out: col.dim("nohup: se ignora la entrada y se agrega la salida a 'nohup.out'"), code: r.code };
  });
  def('jobs', 'trabajos en segundo plano de esta terminal (los que lanzaste con &)', () => ok(''));
  def('watch', 'repite un comando cada 2 segundos (-n segundos); en la terminal real se sale con Ctrl+C', async (a, ctx) => {
    const resto = [...a]; let n = 2; if (resto[0] === '-n') { n = Number(resto[1]) || 2; resto.splice(0, 2); }
    if (!resto.length) return fail('Uso: watch [-n SEGUNDOS] COMANDO');
    const r = await Sh.runLine(resto.map(cita).join(' '), ctx.opts || {});
    return { out: `${col.dim(`Cada ${n.toFixed(1)}s: ${resto.join(' ')}`)}\n\n${r.out || ''}\n\n${col.dim('(Aquí se muestra una sola vez. En la terminal real se repite hasta que pulsas Ctrl+C.)')}`, code: r.code };
  });

  // ---------------------------------------------------------------- integridad y codificación
  const bytesDe = (s) => new TextEncoder().encode(s);
  async function sha256(s) { const h = await crypto.subtle.digest('SHA-256', bytesDe(s)); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
  function md5(str) {
    const b = bytesDe(str), n = (((b.length + 8) >>> 6) + 1) * 16, w = new Array(n).fill(0);
    for (let i = 0; i < b.length; i++) w[i >> 2] |= b[i] << ((i % 4) * 8);
    w[b.length >> 2] |= 0x80 << ((b.length % 4) * 8); w[n - 2] = b.length * 8;
    const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) | 0);
    const R = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
    for (let j = 0; j < n; j += 16) {
      let [A, B, C, D] = [a0, b0, c0, d0];
      for (let i = 0; i < 64; i++) {
        let F, g; const q = i >> 4;
        if (q === 0) { F = (B & C) | (~B & D); g = i; } else if (q === 1) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; } else if (q === 2) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        const tmp = D; D = C; C = B;
        const x = (A + F + K[i] + w[j + g]) | 0, s = R[q * 4 + (i % 4)];
        B = (B + ((x << s) | (x >>> (32 - s)))) | 0; A = tmp;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    return [a0, b0, c0, d0].map((v) => [0, 8, 16, 24].map((s) => ((v >>> s) & 255).toString(16).padStart(2, '0')).join('')).join('');
  }
  const suma = (nombre, fn) => async (a, ctx) => {
    const check = a.includes('-c'), pos = a.filter((x) => !x.startsWith('-'));
    if (check) {
      const e = entrada(pos, ctx, nombre); if (e.error) return e.error;
      const out = []; let mal = 0;
      for (const l of lineas(e.texto)) { const m = /^([0-9a-f]+)\s+\*?(.+)$/.exec(l.trim()); if (!m) continue; const c = readFile(norm(m[2])); const okk = c !== null && (await fn(c)) === m[1]; if (!okk) mal++; out.push(`${m[2]}: ${okk ? 'La suma coincide' : 'FALLÓ'}`); }
      if (mal) out.push(col.err(`${nombre}: ATENCIÓN: ${mal} suma(s) de comprobación NO coinciden`));
      return { out: out.join('\n'), code: mal ? 1 : 0 };
    }
    if (!pos.length) return ok(`${await fn(ctx.stdin || '')}  -`);
    const out = [];
    for (const f of pos) { const c = readFile(norm(f)); if (c === null) return fail(`${nombre}: ${f}: No existe el archivo o el directorio`); out.push(`${await fn(c)}  ${f}`); }
    return ok(out.join('\n'));
  };
  def('md5sum', 'huella MD5 de un archivo: si cambia un solo byte, cambia la huella (-c verifica una lista)', suma('md5sum', md5));
  def('sha256sum', 'huella SHA-256 de un archivo, para comprobar que una descarga o un archivo copiado llegó entero (-c verifica)', suma('sha256sum', sha256));
  def('base64', 'codifica en base64 (-d decodifica): así viajan archivos y claves dentro de JSON o variables', (a, ctx) => {
    const dec = a.includes('-d') || a.includes('--decode'), pos = a.filter((x) => !x.startsWith('-'));
    const e = entrada(pos, ctx, 'base64'); if (e.error) return e.error;
    try {
      if (dec) return ok(new TextDecoder().decode(Uint8Array.from(atob(e.texto.replace(/\s/g, '')), (c) => c.charCodeAt(0))).replace(/\n$/, ''));
      const b = bytesDe(e.texto); let s = ''; b.forEach((x) => { s += String.fromCharCode(x); });
      return ok(btoa(s).replace(/(.{76})/g, '$1\n'));
    } catch (err) { return fail('base64: entrada no válida'); }
  });
  const ENC = ['UTF-8', 'ISO-8859-1', 'LATIN1', 'WINDOWS-1252', 'CP1252', 'ASCII', 'UTF-16'];
  def('iconv', 'cambia la codificación de un texto: iconv -f LATIN1 -t UTF-8 datos.csv -o datos_utf8.csv', (a, ctx) => {
    if (a.includes('-l') || a.includes('--list')) return ok(ENC.join(', '));
    let de = null, a2 = null, salida = null; const pos = [];
    for (let i = 0; i < a.length; i++) { if (a[i] === '-f') de = a[++i]; else if (a[i] === '-t') a2 = a[++i]; else if (a[i] === '-o') salida = a[++i]; else if (/^--from-code=/.test(a[i])) de = a[i].split('=')[1]; else if (/^--to-code=/.test(a[i])) a2 = a[i].split('=')[1]; else pos.push(a[i]); }
    if (!de || !a2) return fail('iconv: indica la codificación de origen y de destino: iconv -f LATIN1 -t UTF-8 archivo');
    const desc = [de, a2].find((x) => !ENC.includes(x.toUpperCase().replace(/\/\/.*$/, '')));
    if (desc) return fail(`iconv: no se admite la conversión desde "${de}" hacia "${a2}"`);
    const e = entrada(pos, ctx, 'iconv'); if (e.error) return e.error;
    let t = e.texto;
    // texto "mojibake" (UTF-8 leído como Latin-1: "JosÃ©"): se repara reinterpretando los bytes
    if (/^(ISO-8859-1|LATIN1|WINDOWS-1252|CP1252)$/i.test(de) && /^UTF-8/i.test(a2) && /[ÃÂ][\u0080-ÿ]/.test(t)) {
      try { t = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from([...t].map((c) => c.charCodeAt(0) & 255))); } catch (err) { /* ya estaba bien */ }
    }
    if (/^ASCII/i.test(a2)) t = a2.toUpperCase().includes('TRANSLIT') ? t.normalize('NFD').replace(/[̀-ͯ]/g, '') : t;
    if (salida) { writeFile(norm(salida), t); save(); return ok(''); }
    return ok(t.replace(/\n$/, ''));
  });

  // ---------------------------------------------------------------- dividir, comparar y mezclar líneas
  def('split', 'parte un archivo grande en pedazos: split -l 1000 ventas.csv parte_ (-d sufijos numéricos)', (a, ctx) => {
    let n = 1000, num = false, ext = ''; const pos = [];
    for (let i = 0; i < a.length; i++) { if (a[i] === '-l') n = Number(a[++i]); else if (/^-l\d+$/.test(a[i])) n = Number(a[i].slice(2)); else if (a[i] === '-d') num = true; else if (/^--additional-suffix=/.test(a[i])) ext = a[i].split('=')[1]; else pos.push(a[i]); }
    if (!(n > 0)) return fail('split: número de líneas no válido');
    const e = entrada(pos.slice(0, 1), ctx, 'split'); if (e.error) return e.error;
    const pref = pos[1] || 'x', ls = lineas(e.texto), sufijo = (k) => (num ? String(k).padStart(2, '0') : String.fromCharCode(97 + Math.floor(k / 26)) + String.fromCharCode(97 + (k % 26)));
    let k = 0; for (let i = 0; i < ls.length; i += n) writeFile(norm(pref + sufijo(k++) + ext), ls.slice(i, i + n).join('\n') + '\n');
    save(); return ok('');
  });
  def('comm', 'compara dos archivos ORDENADOS: columna 1 solo en el primero, 2 solo en el segundo, 3 en ambos (-1 -2 -3 ocultan)', (a) => {
    const ocultar = new Set(a.filter((x) => /^-[123]+$/.test(x)).join('').replace(/-/g, '').split(''));
    const pos = a.filter((x) => !/^-[123]+$/.test(x));
    if (pos.length < 2) return fail('comm: falta un operando\nUso: comm [-123] ARCHIVO1 ARCHIVO2');
    const A = readFile(norm(pos[0])), B = readFile(norm(pos[1]));
    if (A === null || B === null) return fail(`comm: ${A === null ? pos[0] : pos[1]}: No existe el archivo o el directorio`);
    const x = lineas(A), y = lineas(B), out = []; let i = 0, j = 0;
    const tab = (c) => '\t'.repeat([1, 2].filter((k) => k < c && !ocultar.has(String(k))).length);
    while (i < x.length || j < y.length) {
      if (j >= y.length || (i < x.length && x[i] < y[j])) { if (!ocultar.has('1')) out.push(x[i]); i++; }
      else if (i >= x.length || y[j] < x[i]) { if (!ocultar.has('2')) out.push(tab(2) + y[j]); j++; }
      else { if (!ocultar.has('3')) out.push(tab(3) + x[i]); i++; j++; }
    }
    return ok(out.join('\n'));
  });
  def('shuf', 'mezcla las líneas al azar (-n N toma N; -i 1-10 números): sirve para sacar una muestra', (a, ctx) => {
    let n = null, rango = null; const pos = [];
    for (let i = 0; i < a.length; i++) { if (a[i] === '-n') n = Number(a[++i]); else if (/^-n\d+$/.test(a[i])) n = Number(a[i].slice(2)); else if (a[i] === '-i') rango = a[++i]; else pos.push(a[i]); }
    let ls;
    if (rango) { const [d, h] = rango.split('-').map(Number); ls = Array.from({ length: Math.max(0, h - d + 1) }, (_, k) => String(d + k)); }
    else { const e = entrada(pos, ctx, 'shuf'); if (e.error) return e.error; ls = lineas(e.texto); }
    for (let i = ls.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ls[i], ls[j]] = [ls[j], ls[i]]; }
    return ok((n === null ? ls : ls.slice(0, n)).join('\n'));
  });

  // ---------------------------------------------------------------- descargas y tareas programadas
  def('wget', 'descarga un archivo de una URL y lo guarda con su nombre (-O otro nombre, -q en silencio)', async (a, ctx) => {
    let salida = null, quiet = false; const pos = [];
    for (let i = 0; i < a.length; i++) { if (a[i] === '-O') salida = a[++i]; else if (a[i] === '-q') quiet = true; else if (!a[i].startsWith('-')) pos.push(a[i]); }
    const url = pos.find((x) => /^https?:\/\//.test(x));
    if (!url) return fail('wget: falta la URL\nUso: wget [-O ARCHIVO] URL');
    const nombre = salida || (url.replace(/[?#].*$/, '').split('/').pop() || 'index.html');
    const r = await Commands.curl(['-s', '-f', '-o', nombre, url], ctx);
    const http = /error: (\d{3})/.exec(String(r.out || ''));
    if (http) return fail(`--${new Date().toISOString().slice(0, 19).replace('T', ' ')}--  ${url}\nPetición HTTP enviada, esperando respuesta... ${http[1]}\n${new Date().toISOString().slice(0, 19).replace('T', ' ')} ERROR ${http[1]}.`, 8);
    if (r.code || !exists(norm(nombre))) {
      const texto = String(r.out || '').replace(/\u0001[^\u0002]*\u0002|\u0003/g, '');
      if (!r.code && texto) { writeFile(norm(nombre), texto + '\n'); save(); }
      else return { out: col.err(`wget: no se pudo descargar ${url}`) + (texto ? '\n' + texto : ''), code: 4 };
    }
    const tam = (readFile(norm(nombre)) || '').length;
    return ok(quiet ? '' : `--${new Date().toISOString().slice(0, 19).replace('T', ' ')}--  ${url}\nConectando con ${url.split('/')[2]}... conectado.\nPetición HTTP enviada, esperando respuesta... 200 OK\nLongitud: ${tam}\nGrabando a: «${nombre}»\n\n${nombre}            100%[===================>] ${tam}  --.-KB/s    en 0s\n\n«${nombre}» guardado [${tam}/${tam}]`);
  });
  const CRON = HOME + '/.crontab';
  const validarCron = (texto) => {
    for (const [i, l] of lineas(texto).entries()) {
      const t = l.trim(); if (!t || t.startsWith('#') || /^\w+=/.test(t)) continue;
      if (/^@(reboot|hourly|daily|weekly|monthly|yearly|annually)\s+\S/.test(t)) continue;
      const p = t.split(/\s+/);
      if (p.length < 6) return `"-":${i + 1}: faltan campos: minuto hora día mes día_de_semana comando`;
      const lim = [[0, 59, 'minuto'], [0, 23, 'hora'], [1, 31, 'día del mes'], [1, 12, 'mes'], [0, 7, 'día de la semana']];
      for (let k = 0; k < 5; k++) {
        const ok2 = p[k].split(',').every((parte) => { const [base, paso] = parte.split('/'); if (paso !== undefined && !/^\d+$/.test(paso)) return false; if (base === '*') return true; return base.split('-').every((n) => /^\d+$/.test(n) && Number(n) >= lim[k][0] && Number(n) <= lim[k][1]); });
        if (!ok2) return `"-":${i + 1}: valor incorrecto en el ${lim[k][2]} (${p[k]}); va de ${lim[k][0]} a ${lim[k][1]}`;
      }
    }
    return null;
  };
  def('crontab', 'programa comandos a horario: crontab -l (ver), crontab -e (editar), crontab archivo (instalar), -r (borrar)', async (a, ctx) => {
    if (a.includes('-l')) { const c = readFile(CRON); return c === null || !c.trim() ? fail(`no crontab for ${USUARIO}`) : ok(c.replace(/\n$/, '')); }
    if (a.includes('-r')) { if (readFile(CRON) === null) return fail(`no crontab for ${USUARIO}`); delete Machine.fs[CRON]; save(); return ok(''); }
    if (a.includes('-e')) {
      if (readFile(CRON) === null) { writeFile(CRON, '# Una línea por tarea:  minuto hora día mes día_semana comando\n# Ejemplo: todos los días a las 2:30 corre el ETL y guarda el log\n# 30 2 * * * cd ~/proyecto && python etl.py >> logs/etl.log 2>&1\n'); save(); }
      if (Commands.nano) return Commands.nano([CRON], ctx);
      return ok(`Edita ${CRON} con nano y vuelve a cargarlo con: crontab ${CRON}`);
    }
    const f = a.find((x) => !x.startsWith('-'));
    if (!f) return fail('crontab: uso: crontab [-l | -e | -r | ARCHIVO]');
    const c = readFile(norm(f)); if (c === null) return fail(`crontab: ${f}: No existe el archivo o el directorio`);
    const err = validarCron(c); if (err) return fail(`${err}\nerrores en el archivo crontab, no se puede instalar.`);
    writeFile(CRON, c); save(); return ok('');
  });
})();
