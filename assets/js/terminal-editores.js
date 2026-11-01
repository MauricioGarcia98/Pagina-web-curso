/* Editores de pantalla completa dentro de la terminal: vim (y vi), nano y vimtutor.
 *
 * vim: modos normal, inserción, visual de líneas y línea de comandos, con lo que se usa de verdad en un
 * servidor: h j k l, w b e, 0 ^ $, gg G, números (5j, 3dd), x dd yy p P o O i a I A, D C J r ~, cw dw,
 * u y Ctrl+R, . (repetir), / ? n N, V con d y >, Ctrl+D/U, y :w :q :q! :wq :x ZZ :N :set nu
 * :%s/a/b/g :e! :help. Mensajes y errores como los de vim (E37, E492…).
 * nano: siempre escribiendo, con ^O guardar, ^X salir, ^K cortar, ^U pegar, F6 buscar, ^C posición.
 */
(function () {
  'use strict';
  const Sh = window.Shell;
  if (!Sh || !Sh.def || !Sh.pantallas) return;
  const { Machine, readFile, writeFile, norm, exists, isDir, display, ok, fail } = Sh;
  const escH = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------------------------------------------------------------- montaje común
  function montar(termEl, clase) {
    const body = termEl.querySelector('.term-body');
    const box = document.createElement('div');
    box.className = 'ed-pantalla ' + clase;
    box.innerHTML = '<div class="ed-texto"></div><div class="ed-estado"></div><textarea class="ed-captura" autocapitalize="off" autocomplete="off" spellcheck="false" aria-label="Editor"></textarea>';
    termEl.classList.add('con-pantalla');
    body.appendChild(box);
    const ta = box.querySelector('.ed-captura');
    const enfocar = () => ta.focus({ preventScroll: true });
    box.addEventListener('mousedown', (e) => { e.preventDefault(); enfocar(); });
    setTimeout(enfocar, 0);
    const filasVisibles = () => {
      const lh = parseFloat(getComputedStyle(box.querySelector('.ed-texto')).lineHeight) || 20;
      return Math.max(6, Math.floor((box.querySelector('.ed-texto').clientHeight || 360) / lh));
    };
    const cerrar = () => { box.remove(); termEl.classList.remove('con-pantalla'); };
    return { box, ta, texto: box.querySelector('.ed-texto'), estado: box.querySelector('.ed-estado'), filasVisibles, cerrar };
  }
  function abrirArchivo(ruta) {
    const p = norm(ruta || '');
    if (ruta && isDir(p)) return { p, error: `"${display(p)}" es un directorio` };
    const contenido = ruta ? readFile(p) : null;
    const lines = contenido === null ? [''] : contenido.replace(/\n$/, '').split('\n');
    return { p, nuevo: contenido === null, lines };
  }
  const guardar = (p, lines) => { writeFile(p, lines.join('\n') + '\n'); Machine.save(); };

  // resaltado de sintaxis simple por línea (como el vim de Ubuntu, que viene con "syntax on")
  const KW = {
    py: /\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|try|except|finally|raise|lambda|yield|pass|break|continue|None|True|False|is|global|async|await)\b/y,
    sql: /\b(select|from|where|group|by|order|having|join|left|right|inner|outer|on|as|and|or|not|in|is|null|case|when|then|else|end|with|limit|union|all|distinct|insert|into|values|update|set|delete|create|table|view|count|sum|avg|min|max|over|partition|desc|asc)\b/iy,
    sh: /\b(if|then|else|elif|fi|for|in|do|done|while|until|case|esac|function|return|export|local|echo|cd)\b/y,
    yml: /\b(true|false|null)\b/y,
  };
  const COM = { py: '#', sh: '#', yml: '#', sql: '--' };
  function colorear(linea, lang) {
    if (!lang) return [[linea, '']];
    const out = []; let i = 0, txt = '';
    const empujar = (t, c) => { if (txt) { out.push([txt, '']); txt = ''; } out.push([t, c]); };
    if (lang === 'md') return [[linea, /^#{1,6}\s/.test(linea) ? 'sx-kw' : /^\s*[-*]\s/.test(linea) ? 'sx-num' : '']];
    while (i < linea.length) {
      const c = linea[i], resto = linea.slice(i);
      if (COM[lang] && resto.startsWith(COM[lang])) { empujar(resto, 'sx-com'); i = linea.length; break; }
      if (c === '"' || c === "'") { let j = i + 1; while (j < linea.length && linea[j] !== c) { if (linea[j] === '\\') j++; j++; } empujar(linea.slice(i, j + 1), 'sx-str'); i = j + 1; continue; }
      if (/\d/.test(c) && !/[\w]/.test(linea[i - 1] || '')) { const m = /^\d[\d_.]*/.exec(resto); empujar(m[0], 'sx-num'); i += m[0].length; continue; }
      if (lang === 'yml' && /^\s*[\w.-]+:/.test(linea) && i === 0) { const m = /^\s*[\w.-]+:/.exec(linea); empujar(m[0], 'sx-kw'); i += m[0].length; continue; }
      if (lang === 'sh' && c === '$') { const m = /^\$\{?[\w]+\}?/.exec(resto); if (m) { empujar(m[0], 'sx-var'); i += m[0].length; continue; } }
      const re = KW[lang]; if (re && !/[\w]/.test(linea[i - 1] || '')) { re.lastIndex = i; const m = re.exec(linea); if (m) { empujar(m[0], 'sx-kw'); i += m[0].length; continue; } }
      if (lang === 'py' && c === '@') { const m = /^@[\w.]+/.exec(resto); if (m) { empujar(m[0], 'sx-var'); i += m[0].length; continue; } }
      txt += c; i++;
    }
    if (txt) out.push([txt, '']);
    return out;
  }
  // pinta una línea con colores y, si hace falta, el cursor en la columna cx
  function lineaHtml(linea, lang, cx, claseCur) {
    const toks = colorear(linea, lang);
    if (cx === null) return toks.map(([t, c]) => (c ? `<span class="${c}">${escH(t)}</span>` : escH(t))).join('');
    let pos = 0, html = '';
    for (const [t, c] of toks) {
      if (cx >= pos && cx < pos + t.length) {
        const k = cx - pos, a = escH(t.slice(0, k)), b = escH(t[k]), d = escH(t.slice(k + 1));
        html += (c ? `<span class="${c}">${a}</span>` : a) + `<span class="ed-cur ${claseCur}">${b}</span>` + (c ? `<span class="${c}">${d}</span>` : d);
      } else html += c ? `<span class="${c}">${escH(t)}</span>` : escH(t);
      pos += t.length;
    }
    if (cx >= linea.length) html += `<span class="ed-cur ${claseCur}"> </span>`;
    return html;
  }
  const langDe = (p) => ({ py: 'py', sql: 'sql', sh: 'sh', bash: 'sh', yml: 'yml', yaml: 'yml', md: 'md', toml: 'yml', cfg: 'yml' }[String(p || '').split('.').pop()] || null);
  const bytes = (lines) => new TextEncoder().encode(lines.join('\n') + '\n').length;

  // ---------------------------------------------------------------- vim
  Sh.pantallas.vim = (termEl, { path: ruta }) => new Promise((resolver) => {
    const a = abrirArchivo(ruta);
    if (a.error) { resolver(`vim: ${a.error}`); return; }
    const ui = montar(termEl, 'ed-vim');
    const st = {
      lines: a.lines, y: 0, x: 0, top: 0, modo: 'normal', cmd: '', pend: '', cuenta: '', reg: null, msg: '', err: false,
      mod: false, undo: [], redo: [], nu: false, busq: null, vy: 0, grab: null, ultimo: null, xDeseada: 0, sintaxis: true, salida: null,
    };
    const lang = () => (st.sintaxis ? langDe(a.p) : null);
    st.msg = a.nuevo ? `"${display(a.p)}" [Nuevo]` : `"${display(a.p)}" ${a.lines.length}L, ${bytes(a.lines)}B`;
    const L = () => st.lines[st.y];
    const clampX = (ins) => { const max = Math.max(0, L().length - (ins ? 0 : 1)); if (st.x > max) st.x = max; if (st.x < 0) st.x = 0; };
    const clampY = () => { st.y = Math.max(0, Math.min(st.lines.length - 1, st.y)); };
    const snap = () => { st.undo.push({ lines: st.lines.slice(), y: st.y, x: st.x }); if (st.undo.length > 200) st.undo.shift(); st.redo = []; st.mod = true; };
    const aviso = (m, err) => { st.msg = m; st.err = !!err; };
    const primerNoBlanco = (s) => { const m = /\S/.exec(s); return m ? m.index : 0; };
    const esPal = (c) => /[\wáéíóúñÁÉÍÓÚÑ]/.test(c || '');
    function palabraSig() {
      let { y, x } = st; const s = st.lines[y];
      const cls = (c) => (c === undefined ? -1 : /\s/.test(c) ? 0 : esPal(c) ? 1 : 2);
      const c0 = cls(s[x]);
      while (x < s.length && cls(s[x]) === c0 && c0 !== 0) x++;
      while (true) { if (x >= st.lines[y].length) { if (y >= st.lines.length - 1) { x = Math.max(0, st.lines[y].length - 1); break; } y++; x = 0; if (st.lines[y].length && !/\s/.test(st.lines[y][0])) break; continue; } if (!/\s/.test(st.lines[y][x])) break; x++; }
      return { y, x };
    }
    function palabraAnt() {
      let { y, x } = st; x--;
      while (true) { if (x < 0) { if (y === 0) return { y: 0, x: 0 }; y--; x = st.lines[y].length - 1; continue; } if (!/\s/.test(st.lines[y][x])) break; x--; }
      const c = esPal(st.lines[y][x]);
      while (x > 0 && !/\s/.test(st.lines[y][x - 1]) && esPal(st.lines[y][x - 1]) === c) x--;
      return { y, x };
    }
    function finPalabra() {
      let { y } = st, x = st.x + 1; const s = () => st.lines[y];
      while (x < s().length && /\s/.test(s()[x])) x++;
      if (x >= s().length) return { y, x: Math.max(0, s().length - 1) };
      const c = esPal(s()[x]);
      while (x + 1 < s().length && !/\s/.test(s()[x + 1]) && esPal(s()[x + 1]) === c) x++;
      return { y, x };
    }
    function buscar(dir) {
      if (!st.busq) { aviso('E35: No hay un patrón de búsqueda anterior', true); return; }
      let re; try { re = new RegExp(st.busq.q); } catch (e) { re = new RegExp(st.busq.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); }
      const d = dir * st.busq.dir, n = st.lines.length;
      for (let k = 0; k <= n; k++) {
        const yy = ((st.y + d * k) % n + n) % n, s = st.lines[yy];
        if (d > 0) { const desde = k === 0 ? st.x + 1 : 0; const m = re.exec(s.slice(desde)); if (m) { st.y = yy; st.x = desde + m.index; if (k && yy <= st.y && yy < (st.y)) aviso('la búsqueda llegó al FINAL, sigue desde el PRINCIPIO'); else aviso('/' + st.busq.q); return; } }
        else { const hasta = k === 0 ? st.x : s.length; let ult = -1, m; const g = new RegExp(re.source, 'g'); while ((m = g.exec(s)) && m.index < hasta) { ult = m.index; if (!m[0].length) g.lastIndex++; } if (ult >= 0) { st.y = yy; st.x = ult; aviso('?' + st.busq.q); return; } }
      }
      aviso('E486: Patrón no encontrado: ' + st.busq.q, true);
    }
    function ejecutarComando(c) {
      c = c.trim();
      if (!c) return;
      let m;
      if (/^\d+$/.test(c)) { st.y = Number(c) - 1; clampY(); st.x = primerNoBlanco(L()); return; }
      if (c === '$') { st.y = st.lines.length - 1; return; }
      if ((m = /^(w|write|wq|x|xit|wq!|w!|x!)(?:\s+(\S+))?$/.exec(c))) {
        const destino = m[2] ? norm(m[2]) : a.p;
        if (!destino) { aviso('E32: Sin nombre de archivo', true); return; }
        guardar(destino, st.lines); if (!m[2] || destino === a.p) st.mod = false;
        const salir = /^(wq|x)/.test(m[1]);
        aviso(`"${display(destino)}" ${a.nuevo && destino === a.p ? '[Nuevo] ' : ''}${st.lines.length}L, ${bytes(st.lines)}B escritos`);
        a.nuevo = false;
        if (salir) return terminar();
        return;
      }
      if (c === 'q' || c === 'quit') { if (st.mod) { aviso('E37: No se escribió desde el último cambio (añade ! para forzar)', true); return; } return terminar(); }
      if (c === 'q!' || c === 'quit!' || c === 'qa!' || c === 'cq') return terminar();
      if (c === 'e!') { const b = abrirArchivo(ruta); st.lines = b.lines; st.mod = false; st.y = Math.min(st.y, st.lines.length - 1); clampX(); aviso(`"${display(a.p)}" ${st.lines.length}L, ${bytes(st.lines)}B`); return; }
      if (/^(syntax|syn)\s+on$/.test(c)) { st.sintaxis = true; return; }
      if (/^(syntax|syn)\s+off$/.test(c)) { st.sintaxis = false; return; }
      if (c.startsWith('!')) {
        // :!comando  ejecuta en la terminal (con % = este archivo) y muestra la salida, como vim real
        const cmd = c.slice(1).trim().replace(/(^|\s)%(?=\s|$)/g, `$1${display(a.p)}`);
        if (!cmd) return;
        if (st.mod && /%/.test(c)) aviso('(ojo: el archivo tiene cambios sin guardar; :w antes de ejecutarlo)');
        st.salida = { cmd, texto: 'ejecutando…' };
        Promise.resolve(Sh.runLine(cmd, { autoLogin: true })).then((r) => { st.salida.texto = (r.out || '').replace(/\u0001[^\u0002]*\u0002|\u0003/g, '').replace(/\x1b\[[0-9;]*m/g, ''); st.salida.code = r.code; pintar(); });
        return;
      }
      if (/^set\s+(nu|number)$/.test(c)) { st.nu = true; return; }
      if (/^set\s+(nonu|nonumber)$/.test(c)) { st.nu = false; return; }
      if (/^(noh|nohlsearch)$/.test(c)) return;
      if (/^(h|help)\b/.test(c)) { aviso('Ayuda: i escribir · Esc volver · :w guardar · :q salir · :wq guardar y salir · :q! salir sin guardar · u deshacer · dd borrar línea · / buscar · :!python % ejecuta el archivo · escribe vimtutor para practicar'); return; }
      if ((m = /^(%|\d+(?:,\d+)?)?s\/((?:\\\/|[^/])*)\/((?:\\\/|[^/])*)\/?([gi]*)$/.exec(c))) {
        let ini = st.y, fin = st.y;
        if (m[1] === '%') { ini = 0; fin = st.lines.length - 1; } else if (m[1]) { const [x1, x2] = m[1].split(',').map(Number); ini = x1 - 1; fin = (x2 || x1) - 1; }
        let re; try { re = new RegExp(m[2].replace(/\\\//g, '/'), (m[4].includes('g') ? 'g' : '') + (m[4].includes('i') ? 'i' : '')); } catch (e) { aviso('E486: Patrón no encontrado: ' + m[2], true); return; }
        let n = 0, ultimaY = st.y; const antes = st.lines.slice();
        for (let i = ini; i <= fin && i < st.lines.length; i++) { const nueva = st.lines[i].replace(re, () => { n++; return m[3].replace(/\\\//g, '/'); }); if (nueva !== st.lines[i]) { st.lines[i] = nueva; ultimaY = i; } }
        if (!n) { aviso('E486: Patrón no encontrado: ' + m[2], true); return; }
        st.undo.push({ lines: antes, y: st.y, x: st.x }); st.redo = []; st.mod = true; st.y = ultimaY; st.x = primerNoBlanco(L());
        aviso(n === 1 ? '1 sustitución' : `${n} sustituciones`);
        return;
      }
      aviso(`E492: No es una orden del editor: ${c}`, true);
    }
    function terminar() { ui.ta.removeEventListener('keydown', tecla); ui.cerrar(); resolver(''); return 'fin'; }
    function borrarLineas(n, guardarReg = true) {
      snap(); const quitadas = st.lines.splice(st.y, n);
      if (guardarReg) st.reg = { lineal: true, txt: quitadas };
      if (!st.lines.length) st.lines.push('');
      clampY(); st.x = primerNoBlanco(L());
      if (n >= 3) aviso(`${n} líneas menos`);
    }
    function moverCursor(k, n) {
      if (k === 'h' || k === 'ArrowLeft') st.x -= n;
      else if (k === 'l' || k === 'ArrowRight') st.x += n;
      else if (k === 'j' || k === 'ArrowDown') { st.y += n; st.x = st.xDeseada; }
      else if (k === 'k' || k === 'ArrowUp') { st.y -= n; st.x = st.xDeseada; }
      else return false;
      clampY(); clampX(st.modo === 'insert');
      if (k === 'h' || k === 'l' || k === 'ArrowLeft' || k === 'ArrowRight') st.xDeseada = st.x;
      return true;
    }
    function normal(e) {
      const k = e.key;
      // operador pendiente: r<c>, g, d, y, c, Z
      if (st.pend) {
        const p = st.pend; st.pend = '';
        const n = Number(st.cuenta || 1); st.cuenta = '';
        if (k === 'Escape') return;
        if (p === 'r' && k.length === 1) { snap(); const s = L(); st.lines[st.y] = s.slice(0, st.x) + k + s.slice(st.x + 1); st.ultimo = ['r', k]; return; }
        if (p === 'g' && k === 'g') { st.y = (st.cuentaG || 1) - 1; st.cuentaG = 0; clampY(); st.x = primerNoBlanco(L()); return; }
        if (p === 'Z' && k === 'Z') { if (st.mod) { guardar(a.p, st.lines); } return terminar(); }
        if (p === 'Z' && k === 'Q') return terminar();
        if (p === 'd' && k === 'd') { borrarLineas(Math.min(n, st.lines.length - st.y)); st.ultimo = ['d', 'd']; return; }
        if (p === 'y' && k === 'y') { st.reg = { lineal: true, txt: st.lines.slice(st.y, st.y + n) }; if (n > 2) aviso(`${n} líneas copiadas`); return; }
        if (p === 'c' && k === 'c') { snap(); st.lines.splice(st.y, n, ''); st.x = 0; st.modo = 'insert'; return; }
        if ((p === 'd' || p === 'c' || p === 'y') && /^[web$0]$/.test(k)) {
          const s = L(); let ini = st.x, fin;
          if (k === '$') fin = s.length; else if (k === '0') { ini = 0; fin = st.x; } else if (k === 'b') { const q = palabraAnt(); ini = q.y === st.y ? q.x : 0; fin = st.x; }
          else { let x = st.x; for (let i = 0; i < n; i++) { if (k === 'e' || p === 'c') { while (x < s.length && /\s/.test(s[x])) x++; const c0 = esPal(s[x]); while (x < s.length && !/\s/.test(s[x]) && esPal(s[x]) === c0) x++; } else { const c0 = esPal(s[x]); while (x < s.length && !/\s/.test(s[x]) && esPal(s[x]) === c0) x++; while (x < s.length && /\s/.test(s[x])) x++; } } fin = x; }
          if (p === 'y') { st.reg = { lineal: false, txt: s.slice(ini, fin) }; return; }
          snap(); st.reg = { lineal: false, txt: s.slice(ini, fin) }; st.lines[st.y] = s.slice(0, ini) + s.slice(fin); st.x = ini;
          if (p === 'c') st.modo = 'insert'; else clampX();
          return;
        }
        return;
      }
      if (/^[1-9]$/.test(k) || (k === '0' && st.cuenta)) { st.cuenta += k; return; }
      const n = Number(st.cuenta || 1), conCuenta = !!st.cuenta; st.cuenta = '';
      if (e.ctrlKey && k === 'r') { e.preventDefault(); const r = st.redo.pop(); if (!r) { aviso('Ya estás en el cambio más nuevo'); return; } st.undo.push({ lines: st.lines.slice(), y: st.y, x: st.x }); Object.assign(st, { lines: r.lines, y: r.y, x: r.x }); st.mod = true; return; }
      if (e.ctrlKey && (k === 'd' || k === 'u')) { e.preventDefault(); const mitad = Math.floor(ui.filasVisibles() / 2); st.y += k === 'd' ? mitad : -mitad; clampY(); clampX(); return; }
      if (e.ctrlKey && k === 'g') { e.preventDefault(); aviso(`"${display(a.p)}"${st.mod ? ' [Modificado]' : ''} ${st.lines.length} líneas --${Math.round(((st.y + 1) / st.lines.length) * 100)}%--`); return; }
      if (moverCursor(k, n)) return;
      switch (k) {
        case 'w': for (let i = 0; i < n; i++) Object.assign(st, palabraSig()); st.xDeseada = st.x; return;
        case 'b': for (let i = 0; i < n; i++) Object.assign(st, palabraAnt()); st.xDeseada = st.x; return;
        case 'e': for (let i = 0; i < n; i++) Object.assign(st, finPalabra()); st.xDeseada = st.x; return;
        case '0': case 'Home': st.x = 0; st.xDeseada = 0; return;
        case '^': st.x = primerNoBlanco(L()); st.xDeseada = st.x; return;
        case '$': case 'End': st.x = Math.max(0, L().length - 1); st.xDeseada = 1e9; return;
        case 'G': st.y = conCuenta ? n - 1 : st.lines.length - 1; clampY(); st.x = primerNoBlanco(L()); return;
        case 'g': st.pend = 'g'; st.cuentaG = conCuenta ? n : 0; return;
        case 'x': case 'Delete': { if (!L().length) return; snap(); const s = L(); st.reg = { lineal: false, txt: s.slice(st.x, st.x + n) }; st.lines[st.y] = s.slice(0, st.x) + s.slice(st.x + n); clampX(); st.ultimo = ['x']; return; }
        case 'X': { if (!st.x) return; snap(); const s = L(), d = Math.min(n, st.x); st.lines[st.y] = s.slice(0, st.x - d) + s.slice(st.x); st.x -= d; return; }
        case 'D': { snap(); const s = L(); st.reg = { lineal: false, txt: s.slice(st.x) }; st.lines[st.y] = s.slice(0, st.x); clampX(); return; }
        case 'C': { snap(); st.lines[st.y] = L().slice(0, st.x); st.modo = 'insert'; return; }
        case 'J': { if (st.y >= st.lines.length - 1) return; snap(); const izq = L().replace(/\s+$/, ''); st.x = izq.length; st.lines.splice(st.y, 2, izq + ' ' + st.lines[st.y + 1].replace(/^\s+/, '')); return; }
        case '~': { snap(); const s = L(), c = s[st.x] || ''; st.lines[st.y] = s.slice(0, st.x) + (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()) + s.slice(st.x + 1); st.x = Math.min(st.x + 1, Math.max(0, L().length - 1)); return; }
        case 'r': case 'd': case 'y': case 'c': case 'Z': st.pend = k; st.cuenta = conCuenta ? String(n) : ''; return;
        case 'p': case 'P': {
          if (!st.reg) { aviso('E353: No hay nada en el registro "', true); return; }
          snap();
          if (st.reg.lineal) { const pos = k === 'p' ? st.y + 1 : st.y; const rep = []; for (let i = 0; i < n; i++) rep.push(...st.reg.txt); st.lines.splice(pos, 0, ...rep); st.y = pos; st.x = primerNoBlanco(L()); }
          else { const s = L(), pos = k === 'p' && s.length ? st.x + 1 : st.x; const t = st.reg.txt.repeat(n); st.lines[st.y] = s.slice(0, pos) + t + s.slice(pos); st.x = pos + t.length - 1; }
          st.ultimo = [k]; return;
        }
        case 'u': { const u = st.undo.pop(); if (!u) { aviso('Ya estás en el cambio más antiguo'); return; } st.redo.push({ lines: st.lines.slice(), y: st.y, x: st.x }); Object.assign(st, { lines: u.lines, y: u.y, x: u.x }); clampY(); clampX(); st.mod = st.undo.length > 0; aviso('1 cambio; antes'); return; }
        case 'i': snap(); st.modo = 'insert'; st.grab = { tipo: 'i', txt: '' }; return;
        case 'a': snap(); st.modo = 'insert'; if (L().length) st.x++; st.grab = { tipo: 'a', txt: '' }; return;
        case 'I': snap(); st.modo = 'insert'; st.x = primerNoBlanco(L()); st.grab = { tipo: 'I', txt: '' }; return;
        case 'A': snap(); st.modo = 'insert'; st.x = L().length; st.grab = { tipo: 'A', txt: '' }; return;
        case 'o': snap(); st.lines.splice(st.y + 1, 0, ''); st.y++; st.x = 0; st.modo = 'insert'; st.grab = { tipo: 'o', txt: '' }; return;
        case 'O': snap(); st.lines.splice(st.y, 0, ''); st.x = 0; st.modo = 'insert'; st.grab = { tipo: 'O', txt: '' }; return;
        case 'V': st.modo = 'visual'; st.vy = st.y; return;
        case ':': st.modo = 'command'; st.cmd = ':'; return;
        case '/': case '?': st.modo = 'command'; st.cmd = k; return;
        case 'n': buscar(1); return;
        case 'N': buscar(-1); return;
        case '.': {
          const u = st.ultimo; if (!u) return;
          for (let i = 0; i < n; i++) {
            if (u[0] === 'x') normal({ key: 'x' }); else if (u[0] === 'd') { st.pend = 'd'; normal({ key: 'd' }); } else if (u[0] === 'r') { st.pend = 'r'; normal({ key: u[1] }); }
            else if (u[0] === 'p' || u[0] === 'P') normal({ key: u[0] });
            else if (u[0] === 'ins') { normal({ key: u[1] }); for (const ch of u[2]) insertar(ch === '\n' ? { key: 'Enter' } : { key: ch }); st.modo = 'normal'; st.x = Math.max(0, st.x - 1); }
          }
          return;
        }
        case 'Escape': return;
        default:
          if (k.length === 1 && !e.ctrlKey && !e.metaKey) { /* tecla sin función en modo normal: vim no hace nada */ }
      }
    }
    function insertar(e) {
      const k = e.key, s = L();
      if (k === 'Escape' || (e.ctrlKey && k === '[')) {
        st.modo = 'normal'; st.x = Math.max(0, st.x - 1); clampX();
        if (st.grab) { st.ultimo = ['ins', st.grab.tipo, st.grab.txt]; st.grab = null; }
        return;
      }
      if (k.startsWith('Arrow') && moverCursor(k, 1)) return;   // en inserción, h j k l se escriben: solo mueven las flechas
      if (k === 'Enter') { st.lines.splice(st.y, 1, s.slice(0, st.x), s.slice(st.x)); st.y++; st.x = 0; if (st.grab) st.grab.txt += '\n'; return; }
      if (k === 'Backspace') {
        if (st.x > 0) { st.lines[st.y] = s.slice(0, st.x - 1) + s.slice(st.x); st.x--; }
        else if (st.y > 0) { const prev = st.lines[st.y - 1]; st.lines.splice(st.y - 1, 2, prev + s); st.y--; st.x = prev.length; }
        if (st.grab) st.grab.txt = st.grab.txt.slice(0, -1);
        return;
      }
      if (k === 'Delete') { if (st.x < s.length) st.lines[st.y] = s.slice(0, st.x) + s.slice(st.x + 1); else if (st.y < st.lines.length - 1) st.lines.splice(st.y, 2, s + st.lines[st.y + 1]); return; }
      if (k === 'Tab') { st.lines[st.y] = s.slice(0, st.x) + '    ' + s.slice(st.x); st.x += 4; if (st.grab) st.grab.txt += '    '; return; }
      if (k === 'Home') { st.x = 0; return; }
      if (k === 'End') { st.x = s.length; return; }
      if (k.length === 1 && !e.ctrlKey && !e.metaKey) { st.lines[st.y] = s.slice(0, st.x) + k + s.slice(st.x); st.x++; if (st.grab) st.grab.txt += k; }
    }
    function visual(e) {
      const k = e.key;
      if (k === 'Escape' || k === 'V') { st.modo = 'normal'; return; }
      if (moverCursor(k, 1) || k === 'G' || k === 'g') { if (k === 'G') st.y = st.lines.length - 1; if (k === 'g') st.y = 0; return; }
      const ini = Math.min(st.vy, st.y), fin = Math.max(st.vy, st.y);
      if (k === 'd' || k === 'x') { st.y = ini; borrarLineas(fin - ini + 1); st.modo = 'normal'; return; }
      if (k === 'y') { st.reg = { lineal: true, txt: st.lines.slice(ini, fin + 1) }; st.y = ini; st.modo = 'normal'; aviso(`${fin - ini + 1} líneas copiadas`); return; }
      if (k === '>' || k === '<') { snap(); for (let i = ini; i <= fin; i++) st.lines[i] = k === '>' ? '    ' + st.lines[i] : st.lines[i].replace(/^ {1,4}/, ''); st.modo = 'normal'; return; }
    }
    function comando(e) {
      const k = e.key;
      if (k === 'Escape') { st.modo = 'normal'; st.cmd = ''; return; }
      if (k === 'Backspace') { st.cmd = st.cmd.slice(0, -1); if (!st.cmd) st.modo = 'normal'; return; }
      if (k === 'Enter') {
        const c = st.cmd; st.cmd = ''; st.modo = 'normal'; aviso('');
        if (c[0] === '/' || c[0] === '?') { if (c.length > 1) st.busq = { q: c.slice(1), dir: c[0] === '/' ? 1 : -1 }; buscar(1); return; }
        return ejecutarComando(c.slice(1));
      }
      if (k.length === 1 && !e.ctrlKey) st.cmd += k;
    }
    function pintar() {
      if (st.salida) {
        const lineas = String(st.salida.texto).split('\n');
        ui.texto.innerHTML = `<div class="ed-l ed-tilde">:!${escH(st.salida.cmd)}</div>` + lineas.slice(-ui.filasVisibles() + 3).map((l) => `<div class="ed-l">${escH(l) || '&nbsp;'}</div>`).join('') + (st.salida.code !== undefined ? `<div class="ed-l">&nbsp;</div><div class="ed-l ${st.salida.code ? 'ed-err' : ''}">${st.salida.code ? `shell returned ${st.salida.code}` : ''}</div>` : '');
        ui.estado.innerHTML = '<span class="ed-izq"><b>Presiona ENTER o escribe una orden para continuar</b></span>';
        return;
      }
      const filas = ui.filasVisibles();
      if (st.y < st.top) st.top = st.y;
      if (st.y >= st.top + filas) st.top = st.y - filas + 1;
      const ancho = String(st.lines.length).length + 1;
      const vi = Math.min(st.vy, st.y), vf = Math.max(st.vy, st.y);
      const html = [];
      for (let i = st.top; i < st.top + filas; i++) {
        if (i >= st.lines.length) { html.push('<div class="ed-l ed-tilde">~</div>'); continue; }
        const s = st.lines[i];
        const cuerpo = i === st.y && st.modo !== 'command' ? lineaHtml(s, lang(), Math.min(st.x, s.length), st.modo === 'insert' ? 'ed-cur-ins' : '') : lineaHtml(s, lang(), null);
        const sel = st.modo === 'visual' && i >= vi && i <= vf ? ' ed-sel' : '';
        html.push(`<div class="ed-l${sel}">${st.nu ? `<span class="ed-nu">${String(i + 1).padStart(ancho - 1)} </span>` : ''}${cuerpo || (i === st.y ? '' : '&nbsp;')}</div>`);
      }
      ui.texto.innerHTML = html.join('');
      const pos = `${st.y + 1},${Math.min(st.x, L().length) + 1}`;
      const pct = st.lines.length <= filas ? 'Todo' : st.top === 0 ? 'Arriba' : st.top + filas >= st.lines.length ? 'Abajo' : Math.round((st.top / (st.lines.length - filas)) * 100) + '%';
      const izq = st.modo === 'command' ? escH(st.cmd) + '<span class="ed-cur">&nbsp;</span>' : st.modo === 'insert' ? '<b>-- INSERTAR --</b>' : st.modo === 'visual' ? '<b>-- VISUAL LÍNEA --</b>' : `<span class="${st.err ? 'ed-err' : ''}">${escH(st.msg)}</span>`;
      ui.estado.innerHTML = `<span class="ed-izq">${izq}</span><span class="ed-der">${escH(st.pend || st.cuenta)}&nbsp;&nbsp;${pos}&nbsp;&nbsp;&nbsp;${pct}</span>`;
    }
    function tecla(e) {
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      if (st.salida) { if (st.salida.code === undefined) return; st.salida = null; if (e.key === ':') { st.modo = 'command'; st.cmd = ':'; } pintar(); return; }
      if (st.modo === 'normal' && e.key !== ':' && e.key !== '/' && e.key !== '?') { st.msg = ''; st.err = false; }
      const r = st.modo === 'insert' ? insertar(e) : st.modo === 'visual' ? visual(e) : st.modo === 'command' ? comando(e) : normal(e);
      if (r === 'fin') return;
      pintar();
    }
    ui.ta.addEventListener('keydown', tecla);
    new ResizeObserver(() => { if (ui.box.isConnected) pintar(); }).observe(ui.box);
    pintar();
  });

  // ---------------------------------------------------------------- nano
  Sh.pantallas.nano = (termEl, { path: ruta }) => new Promise((resolver) => {
    const a = abrirArchivo(ruta);
    if (a.error) { resolver(`nano: ${a.error}`); return; }
    const ui = montar(termEl, 'ed-nano');
    const st = { lines: a.lines, y: 0, x: 0, top: 0, mod: false, corte: [], prompt: null, msg: a.nuevo ? '[ Archivo nuevo ]' : `[ ${a.lines.length} líneas leídas ]` };
    const L = () => st.lines[st.y];
    const clamp = () => { st.y = Math.max(0, Math.min(st.lines.length - 1, st.y)); st.x = Math.max(0, Math.min(L().length, st.x)); };
    function terminar(msg) { ui.ta.removeEventListener('keydown', tecla); ui.cerrar(); resolver(msg || ''); return 'fin'; }
    function escribir(destino) { guardar(destino, st.lines); st.mod = false; a.p = destino; st.msg = `[ ${st.lines.length} líneas escritas ]`; }
    function tecla(e) {
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      const k = e.key, ctrl = e.ctrlKey || e.metaKey;
      if (st.prompt) {
        const p = st.prompt;
        if (p.tipo === 'salir') {
          if (/^[sSyY]$/.test(k)) { st.prompt = { tipo: 'nombre', txt: display(a.p), luego: 'salir' }; }
          else if (/^[nN]$/.test(k)) return terminar();
          else if (ctrl && k === 'c') { st.prompt = null; st.msg = '[ Cancelado ]'; }
          return pintar();
        }
        if (k === 'Escape' || (ctrl && k === 'c')) { st.prompt = null; st.msg = '[ Cancelado ]'; return pintar(); }
        if (k === 'Backspace') { p.txt = p.txt.slice(0, -1); return pintar(); }
        if (k === 'Enter') {
          st.prompt = null;
          if (p.tipo === 'nombre') { if (!p.txt.trim()) { st.msg = '[ Cancelado ]'; return pintar(); } escribir(norm(p.txt.trim())); if (p.luego === 'salir') return terminar(); }
          if (p.tipo === 'buscar') { st.ultBusq = p.txt || st.ultBusq; const q = st.ultBusq || ''; for (let k2 = 1; k2 <= st.lines.length; k2++) { const yy = (st.y + k2) % st.lines.length, i = st.lines[yy].indexOf(q); if (q && i >= 0) { st.y = yy; st.x = i; st.msg = ''; return pintar(); } } st.msg = `[ "${q}" no se encontró ]`; }
          return pintar();
        }
        if (k.length === 1 && !ctrl) p.txt += k;
        return pintar();
      }
      st.msg = '';
      if (ctrl && k === 'x') { if (!st.mod) return terminar(); st.prompt = { tipo: 'salir' }; return pintar(); }
      if (ctrl && (k === 'o' || k === 's')) { st.prompt = { tipo: 'nombre', txt: display(a.p) }; return pintar(); }
      if (ctrl && k === 'k') { st.corte = [L()]; st.lines.splice(st.y, 1); if (!st.lines.length) st.lines.push(''); st.mod = true; clamp(); return pintar(); }
      if (ctrl && k === 'u') { if (st.corte.length) { st.lines.splice(st.y, 0, ...st.corte); st.y += st.corte.length; st.mod = true; clamp(); } return pintar(); }
      if ((ctrl && k === 'w') || k === 'F6') { st.prompt = { tipo: 'buscar', txt: '' }; return pintar(); }
      if (ctrl && k === 'c') { st.msg = `[ línea ${st.y + 1}/${st.lines.length} (${Math.round(((st.y + 1) / st.lines.length) * 100)}%), col ${st.x + 1}/${L().length + 1} ]`; return pintar(); }
      if (ctrl && k === 'g') { st.msg = '^O guarda · ^X sale · ^K corta la línea · ^U la pega · F6 busca · flechas para moverte'; return pintar(); }
      if (k === 'ArrowLeft') { if (st.x > 0) st.x--; else if (st.y > 0) { st.y--; st.x = L().length; } }
      else if (k === 'ArrowRight') { if (st.x < L().length) st.x++; else if (st.y < st.lines.length - 1) { st.y++; st.x = 0; } }
      else if (k === 'ArrowUp') { st.y--; clamp(); }
      else if (k === 'ArrowDown') { st.y++; clamp(); }
      else if (k === 'Home') st.x = 0;
      else if (k === 'End') st.x = L().length;
      else if (k === 'Enter') { const s = L(); st.lines.splice(st.y, 1, s.slice(0, st.x), s.slice(st.x)); st.y++; st.x = 0; st.mod = true; }
      else if (k === 'Backspace') { const s = L(); if (st.x > 0) { st.lines[st.y] = s.slice(0, st.x - 1) + s.slice(st.x); st.x--; } else if (st.y > 0) { const prev = st.lines[st.y - 1]; st.lines.splice(st.y - 1, 2, prev + s); st.y--; st.x = prev.length; } st.mod = true; }
      else if (k === 'Delete') { const s = L(); if (st.x < s.length) st.lines[st.y] = s.slice(0, st.x) + s.slice(st.x + 1); else if (st.y < st.lines.length - 1) st.lines.splice(st.y, 2, s + st.lines[st.y + 1]); st.mod = true; }
      else if (k === 'Tab') { const s = L(); st.lines[st.y] = s.slice(0, st.x) + '    ' + s.slice(st.x); st.x += 4; st.mod = true; }
      else if (k.length === 1 && !ctrl) { const s = L(); st.lines[st.y] = s.slice(0, st.x) + k + s.slice(st.x); st.x++; st.mod = true; }
      clamp(); pintar();
    }
    function pintar() {
      const filas = ui.filasVisibles() - 1;
      if (st.y < st.top) st.top = st.y;
      if (st.y >= st.top + filas) st.top = st.y - filas + 1;
      const html = [`<div class="ed-l ed-nano-cab"><span>GNU nano 7.2</span><span>${escH(a.p ? display(a.p) : 'Búfer nuevo')}${st.mod ? ' *' : ''}</span><span></span></div>`];
      for (let i = st.top; i < st.top + filas; i++) {
        if (i >= st.lines.length) { html.push('<div class="ed-l">&nbsp;</div>'); continue; }
        const s = st.lines[i];
        html.push(`<div class="ed-l">${i === st.y && !st.prompt ? lineaHtml(s, langDe(a.p), st.x, '') : lineaHtml(s, langDe(a.p), null) || '&nbsp;'}</div>`);
      }
      ui.texto.innerHTML = html.join('');
      const p = st.prompt;
      const linea = p ? (p.tipo === 'salir' ? '<span class="ed-inv">¿Guardar el búfer modificado?</span>' : `<span class="ed-inv">${p.tipo === 'nombre' ? 'Nombre del archivo a escribir' : 'Buscar'}: ${escH(p.txt)}<span class="ed-cur">&nbsp;</span></span>`) : (st.msg ? `<span class="ed-centro ed-inv">${escH(st.msg)}</span>` : '&nbsp;');
      const ayuda = p && p.tipo === 'salir' ? '<span><b>S</b> Sí</span><span><b>N</b> No</span><span><b>^C</b> Cancelar</span>' : '<span><b>^G</b> Ayuda</span><span><b>^O</b> Guardar</span><span><b>F6</b> Buscar</span><span><b>^K</b> Cortar</span><span><b>^U</b> Pegar</span><span><b>^C</b> Posición</span><span><b>^X</b> Salir</span>';
      ui.estado.innerHTML = `<div class="ed-nano-msg">${linea}</div><div class="ed-nano-ayuda">${ayuda}</div>`;
    }
    ui.ta.addEventListener('keydown', tecla);
    new ResizeObserver(() => { if (ui.box.isConnected) pintar(); }).observe(ui.box);
    pintar();
  });

  // ---------------------------------------------------------------- comandos
  const usarPantalla = (tipo) => (a) => {
    const archivo = a.find((x) => !x.startsWith('-') && !x.startsWith('+'));
    if (archivo && isDir(norm(archivo))) return fail(`${tipo}: "${archivo}" es un directorio`);
    return { out: '', code: 0, pantalla: { tipo, path: archivo || '' } };
  };
  Sh.def('vim', 'editor de texto vim: i escribe, Esc vuelve, :wq guarda y sale, :q! sale sin guardar', usarPantalla('vim'));
  Sh.Commands.vi = Sh.Commands.vim; Sh.Commands.nvim = Sh.Commands.vim;
  Sh.def('nano', 'editor de texto simple: escribe directo, Ctrl+O guarda, Ctrl+X sale', usarPantalla('nano'));
  const TUTOR = `===============================================================================
=     B i e n v e n i d o   a l   t u t o r   d e   V I M  (versión del curso)  =
===============================================================================

Vim tiene MODOS. Cuando lo abres estás en modo NORMAL: las teclas son órdenes,
no texto. Para escribir, entra al modo INSERTAR con la tecla  i .
Para volver al modo NORMAL, presiona  Esc . Ante la duda: Esc.

Lección 1: moverse
   h ← izquierda    j ↓ abajo    k ↑ arriba    l → derecha
   Las flechas también sirven. Muévete hasta la línea de abajo con  j .

   >>> Mueve el cursor hasta aquí y sigue leyendo.

Lección 2: salir (lo más buscado en internet sobre vim)
   :q   sale (si no hay cambios)
   :q!  sale SIN guardar los cambios
   :wq  guarda y sale  (también  ZZ )

Lección 3: borrar
   x    borra el carácter bajo el cursor
   dd   borra la línea entera (y la guarda para pegarla)
   u    deshace el último cambio;  Ctrl+R  lo rehace

   --> Esta línea tiene unnn errrror que se corrige con x.
   --> Borra esta línea entera con dd.

Lección 4: escribir
   i  escribe antes del cursor     a  después del cursor
   A  al final de la línea         o  en una línea nueva debajo

   --> Agrega al final de esta línea la palabra: listo

Lección 5: copiar y pegar
   yy copia la línea · p pega debajo · P pega arriba
   Con un número delante se repite:  3dd  borra tres líneas,  5j  baja cinco.

Lección 6: buscar y reemplazar
   /texto  busca hacia adelante ·  n  siguiente ·  N  anterior
   :%s/viejo/nuevo/g   reemplaza en todo el archivo

   --> Reemplaza "gato" por "perro" en todo el archivo: el gato duerme, gato.

Lección 7: guardar
   :w            guarda
   :w otro.txt   guarda con otro nombre
   :set nu       muestra los números de línea

Lección 8: ejecutar sin salir
   :!python %      ejecuta el archivo actual (% = este archivo); Enter vuelve
   :!ls            cualquier comando de la terminal
   :syntax off     apaga los colores (:syntax on los prende)

Listo. En un servidor sin interfaz gráfica, esto es todo lo que necesitas para
editar un archivo de configuración, un DAG o un script. Sal con  :q!
`;
  Sh.def('vimtutor', 'tutorial interactivo de vim (en español)', () => {
    const p = norm('~/.vimtutor.txt');
    writeFile(p, TUTOR); Machine.save();
    return { out: '', code: 0, pantalla: { tipo: 'vim', path: p } };
  });
})();

// "code" abre el editor tipo VS Code de la página (app.js); sin él, cae al editor simple anterior
(function () {
  const Sh = window.Shell; if (!Sh || !Sh.def) return;
  Sh.def('code', 'abre una carpeta o un archivo en el editor (como VS Code): code . | code archivo.py', (a) => {
    const arg = a.find((x) => !x.startsWith('-')) || '.';
    const p = Sh.norm(arg);
    if (!window.Shell.abrirCode) {
      if (Sh.isDir(p)) return Sh.fail('code: abre un archivo, por ejemplo: code script.py');
      if (!Sh.exists(p)) Sh.writeFile(p, '');
      if (Sh.openEditor) Sh.openEditor(p, Sh.readFile(p), (txt) => { Sh.writeFile(p, txt); Sh.Machine.save(); });
      return Sh.ok(Sh.col.dim(`Abriendo ${Sh.display(p)} en el editor…`));
    }
    if (Sh.isDir(p)) { window.Shell.abrirCode(p, null); return Sh.ok(Sh.col.dim(`Abriendo la carpeta ${Sh.display(p)} en el editor (Ctrl+S guarda, ✕ vuelve aquí)…`)); }
    const dir = p.slice(0, p.lastIndexOf('/')) || '/';
    if (!Sh.exists(p)) { Sh.mkdirp(dir); Sh.writeFile(p, ''); Sh.Machine.save(); }
    const carpeta = Sh.isDir(Sh.Machine.cwd) && p.startsWith(Sh.Machine.cwd + '/') ? Sh.Machine.cwd : dir;
    window.Shell.abrirCode(carpeta, p);
    return Sh.ok(Sh.col.dim(`Abriendo ${Sh.display(p)} en el editor…`));
  });
})();
