/* Piezas reales de Visual Studio Code para el editor del curso ("code .").
 *
 * VS Code es open source (github.com/microsoft/vscode, licencia MIT). En vez de imitar sus colores a ojo,
 * aquí se cargan los archivos ORIGINALES de su repositorio:
 *  - los temas de color que trae VS Code (Dark Modern, Dark+, Light Modern, Monokai, Solarized…), con sus
 *    "colors" del workbench y sus "tokenColors" de TextMate, que se traducen a temas de Monaco;
 *  - el tema de íconos Seti (la fuente seti.woff y su tabla de extensiones), el que VS Code usa por defecto.
 * También calcula los diagnósticos del panel Problemas y el Esquema (Outline) de un archivo.
 */
(function () {
  'use strict';
  const REPO = 'https://cdn.jsdelivr.net/gh/microsoft/vscode@1.95.0/extensions/';
  const TEMAS = {
    'Dark Modern': 'theme-defaults/themes/dark_modern.json',
    'Dark+': 'theme-defaults/themes/dark_plus.json',
    'Dark (Visual Studio)': 'theme-defaults/themes/dark_vs.json',
    'Light Modern': 'theme-defaults/themes/light_modern.json',
    'Light+': 'theme-defaults/themes/light_plus.json',
    'Light (Visual Studio)': 'theme-defaults/themes/light_vs.json',
    'Dark High Contrast': 'theme-defaults/themes/hc_black.json',
    Monokai: 'theme-monokai/themes/monokai-color-theme.json',
    'Solarized Dark': 'theme-solarized-dark/themes/solarized-dark-color-theme.json',
    'Solarized Light': 'theme-solarized-light/themes/solarized-light-color-theme.json',
    Abyss: 'theme-abyss/themes/abyss-color-theme.json',
    'Kimbie Dark': 'theme-kimbie-dark/themes/kimbie-dark-color-theme.json',
    'Quiet Light': 'theme-quietlight/themes/quietlight-color-theme.json',
    Red: 'theme-red/themes/Red-color-theme.json',
    'Tomorrow Night Blue': 'theme-tomorrow-night-blue/themes/tomorrow-night-blue-color-theme.json',
  };
  // JSON con comentarios y comas finales (JSONC), como los archivos de VS Code
  function jsonc(t) {
    let out = '', i = 0, str = false;
    while (i < t.length) {
      const c = t[i];
      if (str) { out += c; if (c === '\\') { out += t[i + 1]; i += 2; continue; } if (c === '"') str = false; i++; continue; }
      if (c === '"') { str = true; out += c; i++; continue; }
      if (c === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') i++; continue; }
      if (c === '/' && t[i + 1] === '*') { i = t.indexOf('*/', i + 2); i = i < 0 ? t.length : i + 2; continue; }
      out += c; i++;
    }
    return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
  }
  const cache = {};
  // el tipo (claro / oscuro / alto contraste) lo declara el package.json de cada extensión ("uiTheme")
  const UI_THEME = { 'Light Modern': 'light', 'Light+': 'light', 'Light (Visual Studio)': 'light', 'Solarized Light': 'light', 'Quiet Light': 'light', 'Dark High Contrast': 'hc' };
  async function bajarTema(ruta) {
    if (cache[ruta]) return cache[ruta];
    const r = await fetch(REPO + ruta); if (!r.ok) throw new Error('No se pudo descargar el tema');
    const t = jsonc(await r.text());
    let base = { colors: {}, tokenColors: [] };
    if (t.include) base = await bajarTema(ruta.slice(0, ruta.lastIndexOf('/') + 1) + t.include.replace(/^\.\//, ''));
    cache[ruta] = { tipo: t.type || base.tipo || 'dark', colors: { ...base.colors, ...(t.colors || {}) }, tokenColors: [...base.tokenColors, ...(Array.isArray(t.tokenColors) ? t.tokenColors : [])], semanticTokenColors: t.semanticTokenColors };
    return cache[ruta];
  }
  // colores por defecto del workbench cuando un tema no los define (los de VS Code para cada tipo)
  const POR_DEFECTO = {
    dark: { 'editor.background': '#1E1E1E', 'editor.foreground': '#D4D4D4', 'sideBar.background': '#252526', 'activityBar.background': '#333333', 'activityBar.foreground': '#FFFFFF', 'activityBar.inactiveForeground': '#FFFFFF66', 'titleBar.activeBackground': '#3C3C3C', 'editorGroupHeader.tabsBackground': '#252526', 'tab.inactiveBackground': '#2D2D2D', 'tab.activeBackground': '#1E1E1E', 'statusBar.background': '#007ACC', 'statusBar.foreground': '#FFFFFF', 'list.hoverBackground': '#2A2D2E', 'list.activeSelectionBackground': '#04395E', 'focusBorder': '#007FD4', 'input.background': '#3C3C3C', 'foreground': '#CCCCCC', 'descriptionForeground': '#CCCCCCB3', 'panel.background': '#1E1E1E', 'panel.border': '#80808059', 'terminal.background': '#1E1E1E', 'terminal.foreground': '#CCCCCC', 'button.background': '#0E639C', 'badge.background': '#4D4D4D' },
    light: { 'editor.background': '#FFFFFF', 'editor.foreground': '#000000', 'sideBar.background': '#F3F3F3', 'activityBar.background': '#2C2C2C', 'activityBar.foreground': '#FFFFFF', 'activityBar.inactiveForeground': '#FFFFFF66', 'titleBar.activeBackground': '#DDDDDD', 'editorGroupHeader.tabsBackground': '#F3F3F3', 'tab.inactiveBackground': '#ECECEC', 'tab.activeBackground': '#FFFFFF', 'statusBar.background': '#007ACC', 'statusBar.foreground': '#FFFFFF', 'list.hoverBackground': '#E8E8E8', 'list.activeSelectionBackground': '#0060C0', 'focusBorder': '#0090F1', 'input.background': '#FFFFFF', 'foreground': '#616161', 'descriptionForeground': '#717171', 'panel.background': '#FFFFFF', 'panel.border': '#80808059', 'terminal.background': '#FFFFFF', 'terminal.foreground': '#333333', 'button.background': '#007ACC', 'badge.background': '#C4C4C4' },
    hc: { 'editor.background': '#000000', 'editor.foreground': '#FFFFFF', 'sideBar.background': '#000000', 'activityBar.background': '#000000', 'activityBar.foreground': '#FFFFFF', 'titleBar.activeBackground': '#000000', 'editorGroupHeader.tabsBackground': '#000000', 'tab.inactiveBackground': '#000000', 'tab.activeBackground': '#000000', 'statusBar.background': '#000000', 'statusBar.foreground': '#FFFFFF', 'list.hoverBackground': '#000000', 'list.activeSelectionBackground': '#000000', 'focusBorder': '#F38518', 'contrastBorder': '#6FC3DF', 'input.background': '#000000', 'foreground': '#FFFFFF', 'descriptionForeground': '#FFFFFF', 'panel.background': '#000000', 'terminal.background': '#000000', 'terminal.foreground': '#FFFFFF', 'button.background': '#000000' },
  };
  const hex = (c) => (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c) ? c : null);
  const sinHash = (c) => (hex(c) ? c.slice(1, 7) : null);
  // de los scopes de TextMate a los tokens de Monaco (que son más gruesos)
  const SCOPES = [
    ['comment', 'comment'], ['punctuation.definition.comment', 'comment'],
    ['string.regexp', 'regexp'], ['constant.character.escape', 'string.escape'], ['string', 'string'],
    ['constant.numeric', 'number'], ['constant.language', 'keyword'], ['constant', 'constant'],
    ['keyword.operator', 'operator'], ['keyword.control', 'keyword'], ['keyword', 'keyword'], ['storage.type', 'keyword'], ['storage.modifier', 'keyword'], ['storage', 'keyword'],
    ['entity.name.tag', 'tag'], ['entity.other.attribute-name', 'attribute.name'], ['support.type.property-name', 'string.key.json'],
    ['entity.name.function', 'function'], ['support.function', 'predefined'], ['entity.name.type', 'type'], ['entity.name.class', 'type'], ['support.class', 'type'], ['support.type', 'type'], ['entity.other.inherited-class', 'type'],
    ['variable.parameter', 'variable.parameter'], ['variable.language', 'keyword'], ['variable', 'variable'],
    ['markup.heading', 'keyword'], ['markup.bold', 'strong'], ['markup.italic', 'emphasis'], ['meta.embedded', 'identifier'],
  ];
  function aMonaco(nombre, t) {
    const tipo = UI_THEME[nombre] || (/hc/.test(t.tipo) ? 'hc' : t.tipo === 'light' ? 'light' : 'dark');
    const C = { ...POR_DEFECTO[tipo], ...t.colors };
    const reglas = [], vistos = new Set();
    // de lo general a lo específico: Monaco usa la última regla que coincide
    for (const tc of t.tokenColors) {
      const sc = tc.scope ? (Array.isArray(tc.scope) ? tc.scope : String(tc.scope).split(',')) : [];
      const st = tc.settings || {};
      if (!sc.length && st.foreground) { C['editor.foreground'] = C['editor.foreground'] || st.foreground; continue; }
      for (const s of sc.map((x) => x.trim())) {
        const par = SCOPES.find(([pre]) => s === pre || s.startsWith(pre + '.') || s.startsWith(pre + ' '));
        if (!par) continue;
        const regla = { token: par[1] }; if (sinHash(st.foreground)) regla.foreground = sinHash(st.foreground); if (st.fontStyle) regla.fontStyle = st.fontStyle;
        if (!regla.foreground && !regla.fontStyle) continue;
        const k = par[1] + (s === par[0] ? '' : ':' + s);
        if (s === par[0] || !vistos.has(par[1])) { reglas.push(regla); vistos.add(par[1]); } void k;
      }
    }
    const colores = {};
    for (const k of ['editor.background', 'editor.foreground', 'editorLineNumber.foreground', 'editorLineNumber.activeForeground', 'editor.selectionBackground', 'editor.inactiveSelectionBackground', 'editor.lineHighlightBackground', 'editor.lineHighlightBorder', 'editorCursor.foreground', 'editorWhitespace.foreground', 'editorIndentGuide.background', 'editorIndentGuide.activeBackground', 'editor.findMatchBackground', 'editor.findMatchHighlightBackground', 'editorBracketMatch.background', 'editorBracketMatch.border', 'editorGutter.background', 'minimap.background', 'scrollbarSlider.background', 'scrollbarSlider.hoverBackground', 'editorWidget.background', 'editorSuggestWidget.background', 'editorSuggestWidget.selectedBackground', 'editorHoverWidget.background', 'editorError.foreground', 'editorWarning.foreground', 'editorOverviewRuler.border']) if (hex(C[k])) colores[k] = C[k];
    if (hex(C['editorIndentGuide.background1'])) colores['editorIndentGuide.background'] = C['editorIndentGuide.background1'];
    if (!colores['editorGutter.background'] && colores['editor.background']) colores['editorGutter.background'] = colores['editor.background'];
    const monaco = { base: tipo === 'light' ? 'vs' : tipo === 'hc' ? 'hc-black' : 'vs-dark', inherit: true, rules: reglas, colors: colores };
    // variables del workbench que usa el editor del curso (--vs-*)
    const g = (...ks) => ks.map((k) => C[k]).find(hex);
    const w = {
      bg: g('editor.background'), side: g('sideBar.background', 'editor.background'), act: g('activityBar.background'), title: g('titleBar.activeBackground', 'sideBar.background'),
      tabbar: g('editorGroupHeader.tabsBackground', 'sideBar.background'), tab: g('tab.inactiveBackground', 'editorGroupHeader.tabsBackground'), tabon: g('tab.activeBackground', 'editor.background'),
      text: g('foreground', 'editor.foreground'), dim: g('descriptionForeground', 'tab.inactiveForeground', 'foreground'), status: g('statusBar.background'), stext: g('statusBar.foreground', 'foreground'),
      border: g('sideBar.border', 'editorGroup.border', 'panel.border', 'contrastBorder') || (tipo === 'light' ? '#E5E5E5' : '#2B2B2B'), hover: g('list.hoverBackground'), sel: g('list.inactiveSelectionBackground', 'list.activeSelectionBackground'),
      accent: g('focusBorder', 'activityBarBadge.background', 'button.background'), input: g('input.background'),
      actfg: g('activityBar.foreground'), actdim: g('activityBar.inactiveForeground'), actborde: g('activityBar.activeBorder', 'activityBar.foreground'), tabfg: g('tab.activeForeground', 'foreground'), tabdim: g('tab.inactiveForeground', 'descriptionForeground'),
      tabtop: g('tab.activeBorderTop', 'focusBorder'), titlefg: g('titleBar.activeForeground', 'foreground'), sidefg: g('sideBar.foreground', 'foreground'), panel: g('panel.background', 'editor.background'),
      term: g('terminal.background', 'panel.background', 'editor.background'), termfg: g('terminal.foreground', 'foreground'), boton: g('button.background'), botonfg: g('button.foreground') || '#FFFFFF', badge: g('activityBarBadge.background', 'badge.background'),
      gitM: g('gitDecoration.modifiedResourceForeground') || (tipo === 'light' ? '#895503' : '#E2C08D'), gitU: g('gitDecoration.untrackedResourceForeground') || (tipo === 'light' ? '#007100' : '#73C991'),
      gitD: g('gitDecoration.deletedResourceForeground') || (tipo === 'light' ? '#AD0707' : '#C74E39'), gitC: g('gitDecoration.conflictingResourceForeground') || (tipo === 'light' ? '#AD0707' : '#E4676B'),
    };
    for (const k of Object.keys(w)) if (!w[k]) delete w[k];
    return { nombre, tipo, base: monaco.base, monaco, w };
  }
  async function cargarTema(nombre) { const ruta = TEMAS[nombre]; if (!ruta) return null; const t = await bajarTema(ruta); return aMonaco(nombre, t); }

  // ------------------------------------------------------------------ íconos Seti (el tema por defecto de VS Code)
  let seti = null, setiPromesa = null;
  function cargarSeti() {
    if (setiPromesa) return setiPromesa;
    setiPromesa = (async () => {
      if (!document.getElementById('vs-seti-font')) { const st = document.createElement('style'); st.id = 'vs-seti-font'; st.textContent = `@font-face { font-family: 'seti'; src: url('${REPO}theme-seti/icons/seti.woff') format('woff'); font-display: block; } .vs-seti { font-family: 'seti'; font-size: 150%; line-height: 1; display: inline-block; width: 20px; text-align: center; -webkit-font-smoothing: antialiased; vertical-align: -3px; }`; document.head.appendChild(st); }
      const r = await fetch(REPO + 'theme-seti/icons/vs-seti-icon-theme.json'); seti = jsonc(await r.text());
      try { await document.fonts.load("16px seti"); } catch (e) { /* nada */ }
      return seti;
    })();
    setiPromesa.catch(() => { setiPromesa = null; });
    return setiPromesa;
  }
  const LANG_EXT = { py: 'python', sql: 'sql', js: 'javascript', ts: 'typescript', json: 'json', md: 'markdown', yml: 'yaml', yaml: 'yaml', sh: 'shellscript', html: 'html', css: 'css', toml: 'toml', tf: 'terraform', ipynb: 'jupyter', csv: 'csv', txt: 'plaintext', log: 'log', dockerfile: 'dockerfile', r: 'r', java: 'java', go: 'go', rs: 'rust' };
  function iconoSeti(nombre, claro) {
    if (!seti) return null;
    const n = nombre.toLowerCase(), set = claro && seti.light ? seti.light : seti;
    let id = (set.fileNames || {})[n] || (seti.fileNames || {})[n];
    if (!id) { const partes = n.split('.'); for (let i = 1; i < partes.length && !id; i++) { const e = partes.slice(i).join('.'); id = (set.fileExtensions || {})[e] || (seti.fileExtensions || {})[e]; } }
    if (!id) { const e = n.includes('.') ? n.split('.').pop() : n; const lang = LANG_EXT[e] || (n === 'dockerfile' ? 'dockerfile' : n === 'makefile' ? 'makefile' : null); if (lang) id = (set.languageIds || {})[lang] || (seti.languageIds || {})[lang]; }
    if (!id) id = claro && seti.light ? seti.light.file || seti.file : seti.file;
    const d = seti.iconDefinitions[id] || seti.iconDefinitions[seti.file];
    if (!d) return null;
    const ch = String(d.fontCharacter || '').replace(/^\\/, '');
    return `<span class="vs-seti" style="color:${d.fontColor || 'inherit'}">${ch ? `&#x${ch};` : ''}</span>`;
  }

  // ------------------------------------------------------------------ diagnósticos (panel Problemas)
  function diagnosticos(texto, lang) {
    const out = [];
    const L = texto.split('\n');
    if (lang === 'json') {
      try { JSON.parse(texto.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1')); } catch (e) { const m = /position (\d+)/.exec(e.message); let lin = 1, col = 1; if (m) { const pre = texto.slice(0, Number(m[1])); lin = pre.split('\n').length; col = pre.length - pre.lastIndexOf('\n'); } out.push({ linea: lin, col, msg: e.message.replace(/^JSON\.parse: /, ''), sev: 'error', fuente: 'json' }); }
      return out;
    }
    if (lang === 'python') {
      const pila = []; const pares = { ')': '(', ']': '[', '}': '{' };
      let enStr = null;
      L.forEach((l, i) => {
        const lin = i + 1; let j = 0; const sinCom = l;
        if (/^\s*\t/.test(l) && /^ +\S/.test(L.find((x) => /^ +\S/.test(x)) || '')) out.push({ linea: lin, col: 1, msg: 'Mezcla de tabulaciones y espacios en la sangría (TabError)', sev: 'error', fuente: 'Pylance' });
        while (j < sinCom.length) {
          const c = sinCom[j];
          if (enStr) { if (sinCom.startsWith(enStr, j)) { j += enStr.length; enStr = null; continue; } if (c === '\\') { j += 2; continue; } j++; continue; }
          if (c === '#') break;
          if (sinCom.startsWith('"""', j) || sinCom.startsWith("'''", j)) { enStr = sinCom.slice(j, j + 3); j += 3; continue; }
          if (c === '"' || c === "'") { const k = sinCom.indexOf(c, j + 1); let kk = k; while (kk > 0 && sinCom[kk - 1] === '\\') kk = sinCom.indexOf(c, kk + 1); if (kk < 0) { out.push({ linea: lin, col: j + 1, msg: 'Falta cerrar la cadena de texto (unterminated string literal)', sev: 'error', fuente: 'Pylance' }); break; } j = kk + 1; continue; }
          if ('([{'.includes(c)) pila.push([c, lin, j + 1]);
          else if (')]}'.includes(c)) { const top = pila.pop(); if (!top || top[0] !== pares[c]) out.push({ linea: lin, col: j + 1, msg: `"${c}" no tiene su "${pares[c]}" de apertura`, sev: 'error', fuente: 'Pylance' }); }
          j++;
        }
        if (enStr && !(enStr.length === 3)) enStr = null;
        const t = l.replace(/#.*$/, '').trimEnd();
        if (/^\s*(def|class|if|elif|else|for|while|try|except|finally|with|async def)\b/.test(t) && !pila.length && !/:\s*$/.test(t) && !/:\s*\S/.test(t.replace(/^\s*(lambda).*$/, '')) && !enStr) out.push({ linea: lin, col: t.length + 1, msg: `Falta ":" al final de la línea ("${t.trim().split(/\s/)[0]}" abre un bloque)`, sev: 'error', fuente: 'Pylance' });
        const ind = /^( *)\S/.exec(l); if (ind && ind[1].length % 4 && !pila.length) out.push({ linea: lin, col: 1, msg: `Sangría de ${ind[1].length} espacios: en Python se usan múltiplos de 4 (PEP 8)`, sev: 'warning', fuente: 'Pylance' });
        if (l.length > 120) out.push({ linea: lin, col: 121, msg: `Línea de ${l.length} caracteres: es difícil de leer (PEP 8 recomienda 79-120)`, sev: 'warning', fuente: 'Pylance' });
        if (/^\s*print\s+["'\w]/.test(t)) out.push({ linea: lin, col: 1, msg: 'En Python 3, print es una función: print("…")', sev: 'error', fuente: 'Pylance' });
        if (/^\s*import \*|from \S+ import \*/.test(t)) out.push({ linea: lin, col: 1, msg: '"import *" importa nombres sin control: mejor importa lo que usas', sev: 'warning', fuente: 'Pylance' });
        if (/except\s*:/.test(t)) out.push({ linea: lin, col: t.indexOf('except') + 1, msg: '"except:" sin tipo atrapa todo, hasta Ctrl+C. Usa except Exception: o un error concreto', sev: 'warning', fuente: 'Pylance' });
      });
      for (const [c, lin, col] of pila) out.push({ linea: lin, col, msg: `"${c}" no se cerró`, sev: 'error', fuente: 'Pylance' });
      // variables importadas y no usadas
      for (const [i, l] of L.entries()) { const m = /^\s*import\s+([\w.]+)(\s+as\s+(\w+))?\s*$/.exec(l); if (m) { const n = m[3] || m[1].split('.')[0]; const usos = texto.split('\n').filter((x, k) => k !== i).join('\n'); if (!new RegExp(`\\b${n}\\b`).test(usos)) out.push({ linea: i + 1, col: 1, msg: `"${n}" se importa pero no se usa`, sev: 'warning', fuente: 'Pylance' }); } }
      return out;
    }
    if (lang === 'yaml') {
      L.forEach((l, i) => { if (/^\t/.test(l)) out.push({ linea: i + 1, col: 1, msg: 'YAML no admite tabulaciones para la sangría: usa espacios', sev: 'error', fuente: 'YAML' }); const m = /^( *)\S/.exec(l); if (m && m[1].length % 2) out.push({ linea: i + 1, col: 1, msg: 'Sangría impar: en YAML se suelen usar 2 espacios por nivel', sev: 'warning', fuente: 'YAML' }); if (/^\s*[\w-]+:\S/.test(l) && !/https?:/.test(l)) out.push({ linea: i + 1, col: l.indexOf(':') + 2, msg: 'Después de ":" va un espacio', sev: 'error', fuente: 'YAML' }); });
      return out;
    }
    if (lang === 'sql') {
      let p = 0; L.forEach((l, i) => { const s = l.replace(/--.*$/, '').replace(/'[^']*'/g, ''); for (const c of s) { if (c === '(') p++; if (c === ')') p--; } if (p < 0) { out.push({ linea: i + 1, col: 1, msg: 'Paréntesis de cierre sin apertura', sev: 'error', fuente: 'SQL' }); p = 0; } if (/\bselect\s+\*/i.test(s)) out.push({ linea: i + 1, col: s.toLowerCase().indexOf('select') + 1, msg: 'SELECT * lee todas las columnas: en producción elige las que necesitas', sev: 'warning', fuente: 'SQL' }); });
      if (p > 0) out.push({ linea: L.length, col: 1, msg: 'Falta cerrar un paréntesis', sev: 'error', fuente: 'SQL' });
      return out;
    }
    return out;
  }

  // ------------------------------------------------------------------ Esquema (Outline)
  function esquema(texto, lang) {
    const out = [];
    texto.split('\n').forEach((l, i) => {
      let m;
      if (lang === 'python') { if ((m = /^(\s*)(async\s+)?def\s+(\w+)/.exec(l))) out.push({ nombre: m[3] + '()', tipo: 'symbol-method', linea: i + 1, nivel: m[1].length / 4 }); else if ((m = /^(\s*)class\s+(\w+)/.exec(l))) out.push({ nombre: m[2], tipo: 'symbol-class', linea: i + 1, nivel: m[1].length / 4 }); else if ((m = /^([A-Z_][A-Z0-9_]*)\s*=/.exec(l))) out.push({ nombre: m[1], tipo: 'symbol-constant', linea: i + 1, nivel: 0 }); }
      else if (lang === 'markdown') { if ((m = /^(#{1,6})\s+(.+)/.exec(l))) out.push({ nombre: m[2], tipo: 'symbol-string', linea: i + 1, nivel: m[1].length - 1 }); }
      else if (lang === 'sql') { if ((m = /^\s*(?:with\s+)?(\w+)\s+as\s*\(/i.exec(l)) || (m = /^\s*,\s*(\w+)\s+as\s*\(/i.exec(l))) out.push({ nombre: m[1], tipo: 'symbol-field', linea: i + 1, nivel: 0 }); else if ((m = /^\s*create\s+(?:or\s+replace\s+)?(table|view)\s+([\w.]+)/i.exec(l))) out.push({ nombre: m[2], tipo: 'symbol-class', linea: i + 1, nivel: 0 }); }
      else if (lang === 'yaml') { if ((m = /^( *)([\w.-]+):/.exec(l)) && m[1].length <= 4) out.push({ nombre: m[2], tipo: 'symbol-key', linea: i + 1, nivel: m[1].length / 2 }); }
      else if (lang === 'shell') { if ((m = /^\s*(?:function\s+)?(\w+)\s*\(\)\s*\{/.exec(l))) out.push({ nombre: m[1] + '()', tipo: 'symbol-method', linea: i + 1, nivel: 0 }); }
      else if (lang === 'json') { if ((m = /^(\s*)"([^"]+)"\s*:/.exec(l)) && m[1].length <= 8) out.push({ nombre: m[2], tipo: 'symbol-key', linea: i + 1, nivel: Math.max(0, m[1].length / 4 - 1) }); }
    });
    return out;
  }

  window.VSReal = { TEMAS, cargarTema, cargarSeti, iconoSeti, setiListo: () => !!seti, diagnosticos, esquema, jsonc };
})();
