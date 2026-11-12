// Compila el contenido del curso (content/**/*.md) y los simuladores Python
// (assets/py/**) a archivos JS que el sitio carga sin necesidad de servidor.
//   npm run build
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { generarIconos } from './iconos.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const marked = new Marked({
  gfm: true,
  renderer: {
    code(code, info) {
      const words = (info || '').trim().split(/\s+/).filter(Boolean);
      const lang = words[0] || 'text';
      const norun = words.includes('norun') ? ' data-norun' : '';
      return `<pre data-lang="${escapeHtml(lang)}"${norun}><code class="language-${escapeHtml(lang)}">${escapeHtml(code.replace(/\n$/, ''))}</code></pre>\n`;
    },
    table(header, body) {
      return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`;
    }
  }
});

const CALLOUTS = { tip: '💡 Consejo', nota: '📝 Nota', cuidado: '⚠️ Cuidado', analogia: '🧠 Analogía', experto: '🚀 Nivel experto', entrevista: '🎯 Pregunta de entrevista', escenario: '🏢 El caso', trabajo: '🧑‍💻 En el trabajo real', errores: '🐞 Errores frecuentes', examen: '🏅 En el examen' };

// ---------------------------------------------------------------- diagramas
// ```diagrama
// titulo: Pie del diagrama
// nodo id: Texto (\n = salto) | icono=base | col=0 | fila=1 | color=azul | sub=texto chico | forma=caja|cilindro|nube|nota
// grupo id: Etiqueta | nodos=a,b | color=naranja
// flecha a -> b: etiqueta | estilo=punteada | color=rojo | doble
// ```
const DG_COLORES = ['azul', 'verde', 'naranja', 'rojo', 'violeta', 'amarillo', 'gris', 'cian', 'rosa'];
const DG_FORMAS = ['caja', 'cilindro', 'nube', 'nota', 'rombo', 'documento', 'circulo', 'hexagono'];
let ICONOS_VALIDOS = null;   // lo llena build() con la biblioteca generada
function parseDiagrama(src, file) {
  const spec = { titulo: '', direccion: 'derecha', nodos: [], grupos: [], flechas: [] };
  const opts = (parts) => Object.fromEntries(parts.map((x) => x.trim()).filter(Boolean).map((x) => { const i = x.indexOf('='); return i < 0 ? [x, true] : [x.slice(0, i).trim(), x.slice(i + 1).trim()]; }));
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    let m;
    if ((m = line.match(/^(titulo|direccion|ancho):\s*(.*)$/))) { spec[m[1]] = m[2]; continue; }
    if ((m = line.match(/^nodo\s+([\w-]+)\s*:\s*(.*)$/))) {
      const [label, ...rest] = m[2].split('|'); const o = opts(rest);
      if (o.color && !DG_COLORES.includes(o.color)) throw new Error(`Diagrama en ${file}: color desconocido "${o.color}"`);
      if (o.forma && !DG_FORMAS.includes(o.forma)) throw new Error(`Diagrama en ${file}: forma desconocida "${o.forma}" (usa ${DG_FORMAS.join(', ')})`);
      if (o.icono && ICONOS_VALIDOS && !ICONOS_VALIDOS.has(o.icono) && !/^sigla:[^:]+(:\w+)?$/.test(o.icono)) throw new Error(`Diagrama en ${file}: ícono desconocido "${o.icono}" (alias en español, nombre de Lucide, marca o sigla:TEXTO:color)`);
      if (typeof o.sub === 'string') o.sub = o.sub.replace(/\\n/g, '\n');
      spec.nodos.push({ id: m[1], label: label.trim().replace(/\\n/g, '\n'), ...o, col: o.col !== undefined ? Number(o.col) : undefined, fila: o.fila !== undefined ? Number(o.fila) : undefined });
      continue;
    }
    if ((m = line.match(/^grupo\s+([\w-]+)\s*:\s*(.*)$/))) {
      const [label, ...rest] = m[2].split('|'); const o = opts(rest);
      spec.grupos.push({ id: m[1], label: label.trim(), ...o, nodos: String(o.nodos || '').split(',').map((x) => x.trim()).filter(Boolean) });
      continue;
    }
    // "flecha a -> b | opciones" (sin etiqueta) equivale a "flecha a -> b: | opciones"
    const lineaF = line.replace(/^(flecha\s+[\w-]+\s*(?:->|<->|--)\s*[\w-]+)\s*\|/, '$1: |');
    if ((m = lineaF.match(/^flecha\s+([\w-]+)\s*(->|<->|--)\s*([\w-]+)\s*(?::\s*(.*))?$/))) {
      const [label, ...rest] = (m[4] || '').split('|'); const o = opts(rest);
      spec.flechas.push({ de: m[1], a: m[3], label: (label || '').trim().replace(/\\n/g, '\n'), doble: m[2] === '<->' || !!o.doble, sinpunta: m[2] === '--', ...o });
      continue;
    }
    throw new Error(`Diagrama en ${file}: no entiendo la línea "${line}"`);
  }
  const ids = new Set(spec.nodos.map((n) => n.id));
  for (const f of spec.flechas) for (const k of [f.de, f.a]) if (!ids.has(k)) throw new Error(`Diagrama en ${file}: la flecha usa el nodo "${k}", que no existe`);
  for (const g of spec.grupos) for (const k of g.nodos) if (!ids.has(k)) throw new Error(`Diagrama en ${file}: el grupo "${g.id}" usa el nodo "${k}", que no existe`);
  return spec;
}

// ---------------------------------------------------------------- la misma consulta en varios motores
// ```motores
// titulo: Las 5 más caras
// [sqlite]
// SELECT ... LIMIT 5;
// [sqlserver]
// SELECT TOP (5) ...;
// [bigquery norun]      <- se muestra pero no se ejecuta en el navegador
// ```
const MOTORES_OK = ['sqlite', 'postgres', 'mysql', 'sqlserver', 'bigquery', 'databricks', 'snowflake', 'oracle'];
function parseMotores(body, file) {
  const spec = { titulo: '', variantes: [] };
  let actual = null;
  for (const linea of body.replace(/\n$/, '').split('\n')) {
    const m = linea.match(/^\[(\w+)((?:\s+\w+)*)\]\s*$/);
    if (m) {
      if (!MOTORES_OK.includes(m[1])) throw new Error(`Bloque motores en ${file}: motor desconocido "${m[1]}"`);
      actual = { m: m[1], norun: /\bnorun\b/.test(m[2]) || !['sqlite', 'postgres', 'mysql', 'sqlserver'].includes(m[1]), code: '' };
      spec.variantes.push(actual); continue;
    }
    if (!actual) { const t = linea.match(/^titulo:\s*(.*)$/); if (t) spec.titulo = t[1].trim(); continue; }
    actual.code += linea + '\n';
  }
  spec.variantes.forEach((v) => { v.code = v.code.replace(/\s+$/, ''); });
  if (spec.variantes.length < 2) throw new Error(`Bloque motores en ${file}: necesita al menos dos motores`);
  return spec;
}

// ---------------------------------------------------------------- recorridos animados
// ```recorrido
// titulo: El viaje de una compra
// estacion app: App | icono=movil
// estacion db: Base de datos | icono=postgres
// paso app: El cliente toca "Comprar"
// Texto del paso (Markdown, varias líneas).
// >>> json                <- el dato en ese momento: json, sql, csv, tabla (CSV que se dibuja como tabla), texto, python, bash
// {"evento": "checkout"}
// ```
const RC_LANGS = ['json', 'sql', 'csv', 'tabla', 'texto', 'python', 'bash', 'yaml', 'log'];
function parseRecorrido(body, file) {
  const spec = { titulo: '', estaciones: [], pasos: [] };
  let paso = null, enDato = false;
  for (const raw of body.replace(/\n$/, '').split('\n')) {
    let m;
    if (!paso && (m = raw.match(/^titulo:\s*(.*)$/))) { spec.titulo = m[1].trim(); continue; }
    if ((m = raw.match(/^estacion\s+([\w-]+)\s*:\s*(.*)$/))) {
      const [label, ...rest] = m[2].split('|');
      if (!label.trim() || rest.some((x) => x.trim() && !x.includes('='))) throw new Error(`Recorrido en ${file}: la etiqueta de la estación "${m[1]}" está vacía o contiene "|" (es el separador de opciones)`);
      const o = Object.fromEntries(rest.map((x) => x.trim()).filter(Boolean).map((x) => { const i = x.indexOf('='); return [x.slice(0, i).trim(), x.slice(i + 1).trim()]; }));
      if (o.icono && ICONOS_VALIDOS && !ICONOS_VALIDOS.has(o.icono)) throw new Error(`Recorrido en ${file}: ícono desconocido "${o.icono}"`);
      spec.estaciones.push({ id: m[1], label: label.trim(), icono: o.icono || null });
      continue;
    }
    if ((m = raw.match(/^paso\s+([\w-]+)\s*:\s*(.*)$/))) {
      if (!spec.estaciones.some((e) => e.id === m[1])) throw new Error(`Recorrido en ${file}: el paso usa la estación "${m[1]}", que no existe`);
      paso = { estacion: m[1], titulo: m[2].trim(), texto: '', lang: null, dato: '' };
      spec.pasos.push(paso); enDato = false; continue;
    }
    if (paso && (m = raw.match(/^>>>\s*(\w+)\s*$/))) {
      if (!RC_LANGS.includes(m[1])) throw new Error(`Recorrido en ${file}: tipo de dato desconocido "${m[1]}" (usa ${RC_LANGS.join(', ')})`);
      paso.lang = m[1]; enDato = true; continue;
    }
    if (!paso) { if (raw.trim()) throw new Error(`Recorrido en ${file}: no entiendo la línea "${raw}"`); continue; }
    if (enDato) paso.dato += raw + '\n'; else paso.texto += raw + '\n';
  }
  if (spec.pasos.length < 2) throw new Error(`Recorrido en ${file}: necesita al menos dos pasos`);
  for (const p of spec.pasos) { p.texto = marked.parse(p.texto.trim()); p.dato = p.dato.replace(/\s+$/, ''); }
  return spec;
}

function md(text, file = '') {
  text = text.replace(/^```diagrama[ \t]*\n([\s\S]*?)^```[ \t]*$/gm, (_, body) => {
    const spec = parseDiagrama(body, file);
    return `<figure class="diagrama" data-spec="${escapeHtml(JSON.stringify(spec))}">${spec.titulo ? `<figcaption>${escapeHtml(spec.titulo)}</figcaption>` : ''}</figure>\n`;
  });
  text = text.replace(/^```recorrido[ \t]*\n([\s\S]*?)^```[ \t]*$/gm, (_, body) => {
    const spec = parseRecorrido(body, file);
    return `<div class="recorrido" data-spec="${escapeHtml(JSON.stringify(spec))}"></div>\n`;
  });
  text = text.replace(/^```motores[ \t]*\n([\s\S]*?)^```[ \t]*$/gm, (_, body) => {
    const spec = parseMotores(body, file);
    return `<div class="motores" data-spec="${escapeHtml(JSON.stringify(spec))}"></div>\n`;
  });
  // capturas de pantalla de las guías reales: si la imagen está en assets/img/guias/ se muestra;
  // si no, un recuadro con lo que hay que capturar (para que el autor la suba después)
  text = text.replace(/^```captura[ \t]*\n([\s\S]*?)^```[ \t]*$/gm, (_, body) => {
    const get = (k) => ((body.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1] || '').trim();
    const archivo = get('archivo'), texto = get('texto');
    if (!/^[\w.-]+\.(png|jpe?g|webp)$/i.test(archivo)) throw new Error(`Captura en ${file}: "archivo:" debe ser un nombre como paso-01.png`);
    const ruta = `assets/img/guias/${archivo}`;
    if (fs.existsSync(path.join(ROOT, ruta))) {
      return `<figure class="captura"><img src="${ruta}" alt="${escapeHtml(texto)}" loading="lazy"><figcaption>${escapeHtml(texto)}</figcaption></figure>\n`;
    }
    return `<figure class="captura captura-pendiente"><div class="captura-marco">📷 <strong>Captura pendiente</strong><span>${escapeHtml(texto)}</span><code>${escapeHtml(ruta)}</code></div></figure>\n`;
  });
  // bloques :::tip ... ::: (no confundir con :::ejercicio)
  text = text.replace(/^:::(tip|nota|cuidado|analogia|experto|entrevista|escenario|trabajo|errores|examen)[ \t]*(.*)\n([\s\S]*?)^:::[ \t]*$/gm, (_, kind, title, body) =>
    `<div class="callout callout-${kind}"><div class="callout-title">${escapeHtml(title ? CALLOUTS[kind].split(' ')[0] + ' ' + title : CALLOUTS[kind])}</div>\n\n${body}\n</div>\n`);
  return marked.parse(text);
}

function parseFrontMatter(src, file) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) throw new Error(`Falta front matter en ${file}`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (mm) meta[mm[1]] = mm[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return { meta, body: src.slice(m[0].length) };
}

const ROLES = ['inicial', 'solucion', 'pista', 'test', 'check', 'respuesta', 'salida', 'explicacion', 'setup', 'previo', 'rubrica', 'prueba', 'medidas', 'archivos'];

// "todos: base || frag1 || frag2" => el comando debe empezar con base y contener todos los fragmentos, en cualquier orden
function cliPattern(line) {
  if (!line.startsWith('todos:')) return line;
  const [base, ...frags] = line.slice(6).trim().split(/\s+\|\|\s+/);
  return base + frags.map((f) => `(?=.* ${f}(?: |$))`).join('') + '( .*)?';
}

function parseExercise(header, body, file, idx, lessonId) {
  const titleMatch = header.match(/titulo="([^"]+)"/);
  const words = header.replace(/titulo="[^"]*"/, '').trim().split(/\s+/);
  const type = words[0];
  const ex = { type, id: `${lessonId}-ej${idx + 1}` };
  for (const w of words.slice(1)) {
    const [k, v] = w.split('=');
    ex[k] = v === undefined ? true : v.replace(/^"|"$/g, '');
  }
  if (titleMatch) ex.titulo = titleMatch[1];
  let prompt = body;
  const fences = [...body.matchAll(/^```([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm)];
  for (const f of fences) {
    const info = f[1].trim().split(/\s+/);
    const role = info.find((w) => ROLES.includes(w));
    if (!role) continue;
    if (info.includes('ordenado')) throw new Error(`"ordenado" debe ir en la línea :::ejercicio, no en el bloque de código (${file} #${idx + 1})`);
    const content = f[2].replace(/\n$/, '');
    if (role === 'pista') (ex.pistas = ex.pistas || []).push(content); // varias pistas: se abren de a una
    else if (role === 'explicacion') ex[role] = (ex[role] ? ex[role] + '\n' : '') + content;
    else if (role === 'respuesta') (ex.respuesta = ex.respuesta || []).push(...content.split('\n').map((s) => s.trim()).filter(Boolean).map(cliPattern));
    else ex[role] = content;
    if (role === 'solucion' || role === 'inicial') ex.lang = info.find((w) => !ROLES.includes(w)) || ex.lang;
    prompt = prompt.replace(f[0], '');
  }
  if (type === 'quiz') {
    const opts = [];
    prompt = prompt.replace(/^\s*- \[( |x)\] (.*)$/gm, (_, mark, text) => { opts.push({ text: marked.parseInline(text), ok: mark === 'x' }); return ''; });
    ex.opciones = opts;
    if (opts.filter((o) => o.ok).length !== 1) throw new Error(`Quiz sin exactamente una respuesta correcta en ${file} (#${idx + 1})`);
  }
  ex.enunciado = md(prompt.trim());
  if (ex.pistas) { ex.pistas = ex.pistas.map((x) => md(x)); ex.pista = ex.pistas[0]; }
  if (ex.explicacion) ex.explicacion = md(ex.explicacion);
  pistasAutomaticas(ex);
  if (['sql', 'python', 'pyspark', 'airflow', 'dbt', 'dax', 'dbsql'].includes(type) && ex.solucion === undefined) throw new Error(`Ejercicio sin solución en ${file} (#${idx + 1})`);
  if (type === 'cli' && !ex.respuesta) throw new Error(`Ejercicio cli sin respuesta en ${file} (#${idx + 1})`);
  return ex;
}

// Pistas automáticas para los ejercicios que no traen pistas: la 1 dice qué piezas hacen falta y la 2
// muestra el esqueleto de la solución con los detalles tapados. Así nadie queda trabado entre "nada" y
// "la solución completa".
const SQL_CLAUSULAS = ['WITH', 'SELECT', 'FROM', 'JOIN', 'LEFT JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'UNION', 'OVER', 'CASE', 'DISTINCT', 'PARTITION BY'];
const unicos = (a) => [...new Set(a)];
function pistasSql(sol) {
  const s = sol.replace(/--[^\n]*/g, '');
  const up = s.toUpperCase();
  const clausulas = SQL_CLAUSULAS.filter((c) => new RegExp(`\\b${c.replace(' ', '\\s+')}\\b`).test(up))
    .filter((c) => !(c === 'JOIN' && /\bLEFT\s+JOIN\b/.test(up) && !/(^|[^T]\s)JOIN\b/.test(up.replace(/LEFT\s+JOIN/g, ''))));
  const tablas = unicos([...s.matchAll(/\b(?:from|join)\s+(\{\{[^}]+\}\}|[\w.]+)/gi)].map((m) => m[1]).filter((x) => !/^\(/.test(x)));
  const ctes = new Set([...s.matchAll(/(?:with|,)\s*(\w+)\s+as\s*\(/gi)].map((m) => m[1].toLowerCase()));
  const funcs = unicos([...s.matchAll(/\b([A-Za-z_]+)\s*\(/g)].map((m) => m[1].toUpperCase())
    .filter((f) => !['AS', 'IN', 'OVER', 'EXISTS', 'VALUES', 'REF', 'SOURCE', 'AND', 'OR', 'NOT', 'ON', 'FROM', 'WHERE', 'SELECT', 'USING'].includes(f) && !ctes.has(f.toLowerCase())));
  const p1 = ['**Lo que vas a necesitar**', '',
    tablas.length ? `- Tablas: ${tablas.map((x) => '`' + x + '`').join(', ')}` : '',
    clausulas.length ? `- Cláusulas, en este orden: ${clausulas.map((x) => '`' + x + '`').join(' → ')}` : '',
    funcs.length ? `- Funciones: ${funcs.map((x) => '`' + x + '`').join(', ')}` : ''].filter(Boolean).join('\n');
  const KW = /^(WITH|SELECT|FROM|LEFT JOIN|INNER JOIN|JOIN|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|UNION ALL|UNION|AND|OR)\b/i;
  const esq = [];
  for (const linea of s.split('\n')) {
    const tr = linea.trim(), ind = linea.match(/^\s*/)[0];
    if (!tr) continue;
    const m = tr.match(KW);
    if (/^\w+\s+AS\s*\($/i.test(tr) || /^WITH\s+\w+\s+AS\s*\($/i.test(tr) || /^\),?\s*\w*\s*(AS\s*\()?$/i.test(tr) || /^\)\s*,?$/.test(tr)) { esq.push(ind + tr); continue; }
    if (!m) continue;
    const kw = m[1].toUpperCase();
    if (/^(FROM|JOIN|LEFT JOIN|INNER JOIN)$/.test(kw)) { esq.push(ind + tr.replace(/\bON\b.*$/i, 'ON …').replace(/;$/, '')); continue; }
    if (kw === 'LIMIT') { esq.push(ind + 'LIMIT …'); continue; }
    esq.push(ind + kw + ' …');
  }
  const p2 = esq.length >= 2 ? '**La estructura de la solución** (completa los `…`):\n\n```sql\n' + unicos(esq.map((x, i) => x + '\u0000' + i)).map((x) => x.split('\u0000')[0]).join('\n') + '\n```' : '';
  return [p1, p2].filter((x) => x && x.split('\n').length > 2);
}
function pistasPython(sol, tipo) {
  const s = sol.replace(/#[^\n]*/g, '');
  const imports = unicos([...s.matchAll(/^\s*(from\s+\S+\s+import\s+[^\n]+|import\s+[^\n]+)/gm)].map((m) => m[1].trim()));
  const defs = unicos([...s.matchAll(/^\s*def\s+(\w+)\s*\(([^)]*)\)/gm)].map((m) => `${m[1]}(${m[2]})`));
  const estructuras = ['for', 'while', 'if', 'try', 'with', 'return', 'lambda', 'yield'].filter((k) => new RegExp(`\\b${k}\\b`).test(s));
  const metodos = unicos([...s.matchAll(/\.(\w+)\s*\(/g)].map((m) => m[1])).filter((x) => !/^(append|format)$/.test(x) || tipo === 'python');
  const builtins = unicos([...s.matchAll(/(?<![.\w])(sum|len|round|sorted|max|min|range|enumerate|zip|int|float|str|list|dict|set|abs|any|all|isinstance|print)\s*\(/g)].map((m) => m[1]));
  const oper = unicos([...s.matchAll(/\b(\w*Operator|\w*Sensor|TaskGroup|Asset|DAG)\b/g)].map((m) => m[1]));
  const lineas = [
    imports.length ? `- Importaciones: ${imports.map((x) => '`' + x + '`').join(', ')}` : '',
    defs.length ? `- Definir: ${defs.map((x) => '`def ' + x + '`').join(', ')}` : '',
    oper.length && tipo === 'airflow' ? `- Piezas de Airflow: ${oper.map((x) => '`' + x + '`').join(', ')}` : '',
    estructuras.length ? `- Estructuras: ${estructuras.map((x) => '`' + x + '`').join(', ')}` : '',
    metodos.length ? `- ${tipo === 'pyspark' ? 'Métodos de DataFrame y funciones' : 'Métodos'}: ${metodos.slice(0, 10).map((x) => '`.' + x + '()`').join(', ')}` : '',
    builtins.length ? `- Funciones de Python: ${builtins.map((x) => '`' + x + '()`').join(', ')}` : ''].filter(Boolean);
  const p1 = lineas.length ? '**Lo que vas a necesitar**\n\n' + lineas.join('\n') : '';
  // esqueleto: se conservan las líneas de estructura (def, for, if, return…), el resto se tapa
  const esq = [];
  let ultimoTapado = null, abiertos = 0;
  for (const linea of s.split('\n')) {
    if (!linea.trim()) continue;
    const balance = (linea.match(/[([{]/g) || []).length - (linea.match(/[)\]}]/g) || []).length;
    if (abiertos > 0) { abiertos += balance; continue; }   // continuación de una expresión de varias líneas
    abiertos = Math.max(0, balance);
    const ind = linea.match(/^\s*/)[0], tr = linea.trim();
    if (/^(def|else|try|except|finally|class|@)\b|^(from|import)\s/.test(tr)) { esq.push(linea.replace(/\s+$/, '')); ultimoTapado = null; continue; }
    if (/^(if|elif|while)\b/.test(tr)) { esq.push(ind + tr.split(/\s/)[0] + ' …:'); ultimoTapado = null; continue; }
    if (/^for\b/.test(tr)) { esq.push(ind + tr.replace(/\bin\b.*$/, 'in …:')); ultimoTapado = null; continue; }
    if (/^with\b/.test(tr)) { esq.push(ind + tr.replace(/\((.*)\)/, '(…)')); ultimoTapado = null; continue; }
    if (/^return\b/.test(tr)) { esq.push(ind + 'return …'); ultimoTapado = null; continue; }
    if (ultimoTapado === ind) continue;
    const asign = tr.match(/^([\w.\[\]'", ]+?)\s*(=|\+=|-=)\s*[^=]/);
    esq.push(ind + (asign ? `${asign[1]} ${asign[2]} …` : '…'));
    ultimoTapado = asign ? null : ind;
  }
  const utiles = esq.filter((x) => x.trim() !== '…' && !/^(from|import)\s/.test(x.trim())).length;
  const p2 = esq.length >= 3 && utiles >= 2 ? '**La estructura de la solución** (completa los `…`):\n\n```python\n' + esq.join('\n') + '\n```' : '';
  return [p1, p2].filter(Boolean);
}
function pistasCli(sol) {
  const cmds = sol.split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('#'));
  if (!cmds.length) return [];
  const cabeza = (c) => c.split(/\s+/).filter((w) => !w.startsWith('-')).slice(0, c.startsWith('git') || /^(az|aws|gcloud|databricks|dbt|airflow|terraform|docker|kubectl|bq|gsutil|uv|pip)\b/.test(c) ? 3 : 1).join(' ');
  const flags = unicos(cmds.flatMap((c) => [...c.matchAll(/(?:^|\s)(--?[\w-]+)/g)].map((m) => m[1])));
  const p1 = `**Por dónde empezar:** ${cmds.length > 1 ? `son ${cmds.length} comandos; el primero empieza con` : 'el comando empieza con'} \`${cabeza(cmds[0])}\`.`;
  const p2 = flags.length ? `**Opciones que vas a usar:** ${flags.map((f) => '`' + f + '`').join(', ')}. Si no recuerdas cómo se escriben, prueba \`${cabeza(cmds[0]).split(' ')[0]} --help\` en la terminal.` : '';
  return [p1, p2].filter(Boolean);
}
// ejercicios de terminal sin bloque solucion: se parte de la primera respuesta aceptada que sea texto literal
const tapar = (w) => w[0] + '_'.repeat(Math.max(1, w.length - 1));
function pistasRespuestaCli(respuestas) {
  const r = (respuestas || []).find((x) => !/[()|?\\[\]*+^$]/.test(x));
  if (!r) return [];
  const w = r.split(/\s+/);
  if (w.length === 1) return [`**Por dónde empezar:** es un solo comando, sin opciones. Empieza con \`${w[0][0]}\` y tiene ${w[0].length} letras.`];
  const esqueleto = [w[0], ...w.slice(1).map((x) => (x.startsWith('-') ? x.replace(/=(.+)$/, (m, v) => '=' + tapar(v)) : tapar(x)))].join(' ');
  return [
    `**Por dónde empezar:** el comando empieza con \`${w[0]}\` y tiene ${w.length} palabras en total.${/^(az|aws|gcloud|databricks|dbt|airflow|terraform|docker|bq|git|uv|pip)$/.test(w[0]) ? ` Si no recuerdas el resto, \`${w[0]} --help\` lista lo que puede hacer.` : ''}`,
    `**El esqueleto** (cada \`_\` es una letra que falta): \`${esqueleto}\``,
  ];
}
// respuestas abiertas: cómo organizar la respuesta, sin dar el contenido
function pistasAbierto(sol) {
  const s = sol.trim();
  const lineas = s.split('\n').filter((l) => l.trim());
  const esClave = (l) => /^\s*-?\s*[\w.]+:(\s|$)/.test(l) && l.length < 80;   // "clave: valor" corto, como en YAML
  const pareceYaml = lineas.length && esClave(lineas[0]) && lineas.filter(esClave).length >= lineas.length * 0.6;
  if (pareceYaml || /^(CREATE|ALTER|SELECT|WITH|GRANT|INSERT|MERGE|UPDATE|DELETE|resource|terraform|module|variable|provider|from |import |\{|#|--|bundle:|targets:|\[)/i.test(s)) return pistasCodigo(s);
  const items = s.match(/^(?:\d+[.)]|-)\s+.+$/gm) || [];   // solo los puntos de primer nivel
  const etiqueta = (l) => { const e = (l.replace(/^(?:\d+[.)]|-)\s+/, '').match(/^\**([^:*\n]{2,45})\**:/) || [])[1]; return e && !/[._/→`"'=]/.test(e) ? e : null; };
  let etiquetas = (items.length >= 2 ? items : s.split('\n')).map(etiqueta);
  etiquetas = etiquetas.every(Boolean) ? etiquetas : [];
  const p1 = etiquetas.length >= 2 ? `**Cómo organizar tu respuesta:** la respuesta modelo tiene ${etiquetas.length} partes: ${etiquetas.map((e) => `*${e.trim()}*`).join(', ')}. Escribe una o dos frases para cada una.`
    : items.length >= 2 ? `**Cómo organizar tu respuesta:** la respuesta modelo tiene ${items.length} puntos. Escribe una idea concreta por punto.`
      : '**Cómo organizar tu respuesta:** en 3 o 4 frases, di **qué** harías, **con qué** herramienta o técnica y **por qué** esa y no otra.';
  return [p1, '**Antes de mirar la solución:** escribe tu respuesta completa (aunque no estés seguro) y después compárala punto por punto. Lo que te faltó es justo lo que conviene repasar en la lección.'];
}
// código sin corrector automático: qué bloques escribir y el esqueleto con nombres y valores tapados
const PALABRA_CLAVE = /^(CREATE|OR|REPLACE|TABLE|VIEW|FUNCTION|ALTER|COLUMN|SET|MASK|ROW|FILTER|ON|TO|GRANT|REVOKE|SELECT|FROM|WHERE|AND|OR|NOT|NULL|INSERT|INTO|VALUES|UPDATE|DELETE|MERGE|USING|WHEN|MATCHED|THEN|ELSE|END|CASE|RETURN|RETURNS|AS|PRIMARY|KEY|DEFAULT|WITH|GROUP|BY|ORDER|resource|module|variable|output|provider|terraform|source|for_each|count|bundle|targets|resources|jobs|tasks|import|from|def|return|[(){}[\],;=:.<>*'"]+)$/;
function pistasCodigo(sol) {
  const lineas = sol.split('\n').filter((l) => l.trim() && !/^\s*(--|#|\/\/)/.test(l));
  const bloques = unicos(lineas.map((l) => (l.match(/^(?:CREATE(?: OR REPLACE)? \w+|ALTER \w+|GRANT|REVOKE|INSERT INTO|UPDATE|DELETE FROM|MERGE INTO|SELECT|WITH|resource "[\w-]+"|module|variable|output|provider "[\w-]+"|[\w-]+:$)/i) || [])[0]).filter(Boolean));
  const taparValor = (v) => v.replace(/[^\s(),;={}[\]]+/g, (t) => (PALABRA_CLAVE.test(t) || t.length <= 1 ? t : '___'));
  // en YAML las claves son la estructura: se dejan a la vista y se tapan solo los valores
  const yaml = /^\s*-?\s*[\w.]+:(\s|$)/;
  const esq = lineas.slice(0, 12).map((l) => { const m = l.match(/^(\s*-?\s*[\w.]+:)(.*)$/); return yaml.test(l) && m ? m[1] + (m[2].trim() ? ' ___' : '') : taparValor(l); }).join('\n');
  const claves = lineas.filter((l) => yaml.test(l) && !/^\s{2,}/.test(l)).map((l) => l.match(/^\s*-?\s*([\w.]+):/)[1]);
  const esYaml = claves.length > 0 && bloques.every((b) => b.endsWith(':'));
  return [
    esYaml ? `**Qué vas a escribir:** un bloque de YAML (configuración por claves y sangría) que empieza con ${unicos(claves).map((c) => '`' + c + ':`').join(', ')}.` : bloques.length ? `**Qué vas a escribir:** ${bloques.map((b) => '`' + b + '`').join(', ')}${lineas.length > 12 ? ' (y algo más)' : ''}.` : `**Qué vas a escribir:** unas ${lineas.length} líneas de código.`,
    `**El esqueleto** (los nombres y valores van donde dice \`___\`):\n\n\`\`\`text\n${esq}${lineas.length > 12 ? '\n…' : ''}\n\`\`\``,
  ];
}
function pistasAutomaticas(ex) {
  if (ex.pistas) return;
  if (ex.type === 'cli' && !ex.solucion) { const ps = pistasRespuestaCli(ex.respuesta); if (ps.length) { ex.pistas = ps.map((x) => md(x)); ex.pista = ex.pistas[0]; ex.pistasAuto = true; } return; }
  if (!ex.solucion) return;
  let ps = [];
  try {
    if (ex.type === 'sql' || ex.type === 'dbt' || (ex.type === 'dbsql' && ex.modo !== 'pipeline')) ps = pistasSql(ex.solucion);
    else if (ex.type === 'dbsql') ps = pistasCodigo(ex.solucion);
    else if (['python', 'pyspark', 'airflow'].includes(ex.type)) ps = pistasPython(ex.solucion, ex.type);
    else if (ex.type === 'cli') ps = pistasCli(ex.solucion);
    else if (ex.type === 'abierto') ps = pistasAbierto(ex.solucion);
    if (!ps.length && ex.type === 'sql') ps = pistasCodigo(ex.solucion);
  } catch (e) { ps = []; }
  if (ps.length) { ex.pistas = ps.map((x) => md(x)); ex.pista = ex.pistas[0]; ex.pistasAuto = true; }
}

// listas del front matter en una sola línea, separadas por " | "
const lista = (v) => (v ? String(v).split(/\s+\|\s+/).map((x) => x.trim()).filter(Boolean) : []);
const mdInline = (t) => marked.parseInline(t);

// Una página HTML liviana por lección (leccion/<id>.html), un índice, sitemap.xml y robots.txt.
// Sirven para que los buscadores indexen cada lección (las direcciones #/l/… del sitio son una sola página para
// Google) y para compartir un enlace con vista previa. Cada página trae el texto completo y un botón que abre la
// lección interactiva, con sus ejercicios, en la Academia.
function paginasParaBuscadores(modules) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const base = String(pkg.homepage || '').replace(/\/?$/, '/');
  const dir = path.join(ROOT, 'leccion');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const esc = (x) => escapeHtml(String(x ?? ''));
  const icono = (fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<link rel="icon" href="[^"]*">/) || [''])[0];
  const css = `:root{--t:#0f172a;--m:#475569;--b:#e2e8f0;--a:#4f46e5;--f:#f8fafc}@media (prefers-color-scheme:dark){:root{--t:#e2e8f0;--m:#94a3b8;--b:#334155;--a:#a5b4fc;--f:#0b1220}}
*{box-sizing:border-box}body{margin:0;font:17px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--t);background:var(--f)}
header,main,footer{max-width:820px;margin:0 auto;padding:16px 20px}header{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;border-bottom:1px solid var(--b)}
header a.marca{font-weight:700;color:var(--t);text-decoration:none}a{color:var(--a)}.migas{font-size:14px;color:var(--m);margin-top:18px}h1{font-size:2rem;line-height:1.25;margin:.4em 0}
.resumen{font-size:1.1rem;color:var(--m)}.cta{display:inline-block;background:var(--a);color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;text-decoration:none;margin:12px 0}
@media (prefers-color-scheme:dark){.cta{color:#0b1220}}pre{overflow-x:auto;background:rgba(127,127,127,.12);padding:12px 14px;border-radius:8px;font-size:14px;line-height:1.5}
code{font-size:.92em}table{border-collapse:collapse;display:block;overflow-x:auto;margin:1em 0}th,td{border:1px solid var(--b);padding:6px 10px;text-align:left}
.callout{border-left:4px solid var(--a);background:rgba(127,127,127,.08);padding:4px 16px;border-radius:6px;margin:1em 0}.callout-title{font-weight:700;margin-top:8px}
img,svg{max-width:100%;height:auto}main{overflow-wrap:anywhere}main>*{max-width:100%}.nav{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid var(--b);margin-top:32px;padding-top:16px}
footer{color:var(--m);font-size:14px;border-top:1px solid var(--b);margin-top:24px}ul.lista{padding-left:1.2em}ul.lista li{margin:.2em 0}`;
  const pagina = ({ titulo, desc, canon, cuerpo }) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title><meta name="description" content="${esc(desc)}">${base ? `<link rel="canonical" href="${esc(base + canon)}">` : ''}
<meta property="og:type" content="article"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(desc)}">${base ? `<meta property="og:url" content="${esc(base + canon)}">` : ''}<meta property="og:site_name" content="Academia de Datos">${base ? `<meta property="og:image" content="${esc(base)}assets/img/compartir.png">` : ''}<meta name="twitter:card" content="summary_large_image">
${icono}<style>${css}</style></head><body>
<header><a class="marca" href="../index.html">🎓 Academia de Datos</a><a href="index.html">Todas las lecciones</a></header>
<main>${cuerpo}</main>
<footer>Academia de Datos · curso gratuito de datos en español, desde cero hasta certificaciones. <a href="../index.html#/privacidad">Privacidad</a> · <a href="../index.html#/terminos">Términos</a></footer>
</body></html>
`;
  // el HTML de la lección trae piezas interactivas que necesitan la app: se quitan para la versión de lectura
  const limpiar = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/ data-[\w-]+="[^"]*"/g, '');
  const todas = modules.flatMap((m) => m.lecciones.map((l) => ({ m, l })));
  todas.forEach(({ m, l }, i) => {
    const ant = todas[i - 1], sig = todas[i + 1];
    const app = `../index.html#/l/${l.id}`;
    const nEj = l.ejercicios.length;
    const cuerpo = `<div class="migas"><a href="index.html#${esc(m.id)}">${esc(m.icono || '')} ${esc(m.titulo)}</a> · ${esc(l.nivel || '')} · ${esc(l.duracion || '')} min</div>
<h1>${esc(l.titulo)}</h1><p class="resumen">${esc(l.resumen || '')}</p>
<a class="cta" href="${app}">▶ Abrir la lección interactiva${nEj ? ` (${nEj} ejercicios)` : ''}</a>
${(l.objetivos || []).length ? `<h2>Al terminar vas a poder</h2><ul class="lista">${l.objetivos.map((o) => `<li>${o}</li>`).join('')}</ul>` : ''}
${limpiar(l.html)}
${nEj ? `<h2>Practica</h2><p>Esta lección tiene <b>${nEj} ejercicios</b> que se corrigen solos en el navegador, sin instalar nada.</p><a class="cta" href="${app}">▶ Hacer los ejercicios</a>` : ''}
<nav class="nav">${ant ? `<a href="${esc(ant.l.id)}.html">← ${esc(ant.l.titulo)}</a>` : '<span></span>'}${sig ? `<a href="${esc(sig.l.id)}.html">${esc(sig.l.titulo)} →</a>` : ''}</nav>`;
    fs.writeFileSync(path.join(dir, l.id + '.html'), pagina({ titulo: `${l.titulo} · Academia de Datos`, desc: l.resumen || l.titulo, canon: `leccion/${l.id}.html`, cuerpo }));
  });
  const indice = `<h1>Todas las lecciones</h1><p class="resumen">${todas.length} lecciones gratuitas para aprender datos desde cero: SQL, Python, Spark, Power BI, Databricks, Azure, AWS, Google Cloud y certificaciones.</p><a class="cta" href="../index.html">▶ Abrir la Academia</a>
${modules.map((m) => `<h2 id="${esc(m.id)}">${esc(m.icono || '')} ${esc(m.titulo)}</h2>${m.descripcion ? `<p>${esc(m.descripcion)}</p>` : ''}<ul class="lista">${m.lecciones.map((l) => `<li><a href="${esc(l.id)}.html">${esc(l.titulo)}</a></li>`).join('')}</ul>`).join('\n')}`;
  fs.writeFileSync(path.join(dir, 'index.html'), pagina({ titulo: 'Todas las lecciones · Academia de Datos', desc: `${todas.length} lecciones gratuitas de datos en español, desde cero hasta certificaciones.`, canon: 'leccion/index.html', cuerpo: indice }));
  if (base) {
    const hoy = new Date().toISOString().slice(0, 10);
    const urls = ['', 'leccion/index.html', ...todas.map(({ l }) => `leccion/${l.id}.html`)];
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(base + u)}</loc><lastmod>${hoy}</lastmod></url>`).join('\n')}\n</urlset>\n`);
    fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}sitemap.xml\n`);
  }
}

// Módulos donde se aprende un tema desde cero: quien estudia todavía no trabaja en una empresa, así que la
// lección empieza por la explicación y el pedido laboral (:::escenario) se muestra al final, como caso real.
// En los módulos de "Trabajo real" (casos, pipelines, incidentes, laboratorios, portafolio…) el escenario sigue arriba.
const MODULOS_APRENDER = new Set(['cero', 'fundamentos', 'sql', 'analisis', 'modelado', 'powerbi', 'python', 'spark', 'pyspark', 'dbt', 'airflow', 'azure', 'aws', 'gcp', 'databricks', 'genie', 'interfaces', 'arquitectura', 'terraform', 'local']);
function casoAlFinal(body, moduleId) {
  if (!MODULOS_APRENDER.has(moduleId)) return body;
  const m = /^(?:<!--\s*estandar:escenario\s*-->\n)?:::escenario[ \t]*(.*)\n([\s\S]*?)^:::[ \t]*\n/m.exec(body);
  if (!m || /^## /m.test(body.slice(0, m.index))) return body; // solo el escenario que abre la lección
  const resto = body.slice(0, m.index) + body.slice(m.index + m[0].length);
  // el caso ahora se lee al terminar: se quitan las frases que anunciaban lo que la lección iba a enseñar
  m[2] = m[2].replace(/(?:En esta lección|Esta lección|Eso es exactamente lo que vas a aprender|Ahora vas a aprender|Con las palabras de esta lección)[^.\n]*\.[ \t]?/g, '');
  const caso = `## Caso real: así te lo piden en un trabajo\n\nYa viste el tema. Así es como suele aparecer cuando trabajas con datos en una empresa:\n\n:::escenario ${m[1]}\n${m[2]}:::\n\n`;
  const ancla = [/^<!--\s*estandar:trabajo\s*-->\n/m, /^:::trabajo/m, /^<!--\s*estandar:entrevista\s*-->\n/m, /^## Resumen\b/m, /^## (?:Ejercicios|Pr[aá]ctica)\b/m, /^:::ejercicio/m].map((r) => r.exec(resto)).find(Boolean);
  return ancla ? resto.slice(0, ancla.index) + caso + resto.slice(ancla.index) : resto.replace(/\s*$/, '\n\n') + caso;
}

function buildLesson(file, moduleId, order) {
  const src = fs.readFileSync(file, 'utf8');
  const { meta, body } = parseFrontMatter(src, file);
  const slug = path.basename(file, '.md').replace(/^\d+-/, '');
  const id = `${moduleId}-${slug}`;
  const exercises = [];
  const re = /^:::ejercicio[ \t]+([^\n]*)\n([\s\S]*?)^:::[ \t]*$/gm;
  let k = 0;
  const content = casoAlFinal(body, moduleId).replace(re, (_, header, exBody) => {
    const ex = parseExercise(header, exBody, file, k, id);
    // sin dificultad propia, el ejercicio toma el nivel de su lección (así todos muestran su etiqueta)
    if (!ex.dificultad) { ex.dificultad = meta.nivel || 'Básico'; ex.dificultadLeccion = true; }
    exercises.push(ex);
    return `\n<div class="exercise-slot" data-ex="${k++}"></div>\n`;
  });
  return {
    id, order, titulo: meta.titulo, nivel: meta.nivel || 'Básico', duracion: Number(meta.duracion || 15),
    resumen: meta.resumen || '', html: md(content, file), ejercicios: exercises,
    objetivos: lista(meta.objetivos).map((x) => mdInline(x)), prerrequisitos: lista(meta.prerrequisitos), autoevaluacion: lista(meta.autoevaluacion).map((x) => mdInline(x))
  };
}

// ---------------------------------------------------------------- glosario
// content/glosario/*.md: un bloque "## Término" por entrada, con campos
//   alias:   otros nombres (separados por coma) — también se usan para buscar y enlazar lecciones
//   nino:    explicado como a un niño (con una comparación de la vida diaria)
//   que:     la definición precisa
//   ejemplo: un ejemplo concreto (admite bloques de código)
//   para:    para qué sirve / cuándo se usa
//   cuidado: confusiones y errores típicos (opcional)
//   ver:     términos relacionados (separados por coma; deben existir)
const CAMPOS_GLOSARIO = ['alias', 'nino', 'que', 'ejemplo', 'para', 'cuidado', 'ver'];
function buildGlosario(modules) {
  const dir = path.join(CONTENT, 'glosario');
  if (!fs.existsSync(dir)) return [];
  const entradas = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const file = path.join(dir, f);
    const txt = fs.readFileSync(file, 'utf8');
    const area = (txt.match(/^# area:\s*(.+)$/m) || [])[1];
    if (!area) throw new Error(`${f}: falta la línea "# area: …"`);
    for (const bloque of txt.split(/^## /m).slice(1)) {
      const [cab, ...lineas] = bloque.split('\n');
      const e = { termino: cab.trim(), area: area.trim() };
      let campo = null; const crudo = {}; let enCodigo = false;
      for (const l of lineas) {
        if (l.startsWith('```')) enCodigo = !enCodigo;
        const m = !enCodigo && l.match(/^(alias|nino|que|ejemplo|para|cuidado|ver):\s?(.*)$/);
        if (m) { campo = m[1]; crudo[campo] = m[2]; continue; }
        if (campo) crudo[campo] += '\n' + l;
      }
      for (const c of ['nino', 'que', 'ejemplo', 'para']) if (!crudo[c] || !crudo[c].trim()) throw new Error(`Glosario ${f}: "${e.termino}" no tiene el campo ${c}`);
      e.alias = crudo.alias ? crudo.alias.split(',').map((x) => x.trim()).filter(Boolean) : [];
      e.ver = crudo.ver ? crudo.ver.split(',').map((x) => x.trim()).filter(Boolean) : [];
      for (const c of ['nino', 'que', 'ejemplo', 'para', 'cuidado']) if (crudo[c] && crudo[c].trim()) e[c] = md(crudo[c].trim(), file);
      e.texto = Object.values(crudo).join(' ').replace(/[`*_#>|]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
      entradas.push(e);
    }
  }
  const nombres = new Map(entradas.map((e) => [e.termino.toLowerCase(), e.termino]));
  const faltan = new Set();
  for (const e of entradas) for (const v of e.ver) if (!nombres.has(v.toLowerCase())) faltan.add(v);
  if (faltan.size) throw new Error(`Glosario: términos relacionados que no existen: ${[...faltan].join(", ")}`);
  for (const e of entradas) e.ver = e.ver.filter((v) => nombres.has(v.toLowerCase())).map((v) => nombres.get(v.toLowerCase()));
  const dup = entradas.map((e) => e.termino.toLowerCase()).filter((t, i, a) => a.indexOf(t) !== i);
  if (dup.length) throw new Error('Glosario: términos repetidos: ' + dup.join(', '));
  // lecciones donde aparece cada término: primero las que lo tienen en el título, después las que más lo mencionan
  const lecciones = [];
  for (const m of modules) {
    const ddir = path.join(CONTENT, m.id);
    const files = fs.existsSync(ddir) ? fs.readdirSync(ddir).filter((f) => f.endsWith('.md')).sort() : [];
    files.forEach((f, i) => { const l = m.lecciones[i]; if (l) lecciones.push({ id: l.id, titulo: l.titulo, texto: fs.readFileSync(path.join(ddir, f), 'utf8').toLowerCase() }); });
  }
  const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const e of entradas) {
    const formas = [e.termino, ...e.alias].map((x) => x.toLowerCase()).filter((x) => x.length >= 2);
    const res = [];
    for (const l of lecciones) {
      let n = 0, enTitulo = false;
      for (const fm of formas) {
        const re = new RegExp(`(^|[^\\wáéíóúñ])${escRe(fm)}(?![\\wáéíóúñ])`, 'g');
        n += (l.texto.match(re) || []).length;
        if (re.test(l.titulo.toLowerCase())) enTitulo = true;
      }
      if (n) res.push({ id: l.id, titulo: l.titulo, puntos: n + (enTitulo ? 1000 : 0) });
    }
    e.lecciones = res.sort((a, b) => b.puntos - a.puntos).slice(0, 5).map(({ id, titulo }) => ({ id, titulo }));
  }
  return entradas;
}

// ---------------------------------------------------------------- exámenes
// content/examenes/*.md: "# examen: <id del módulo>" y un bloque "## Tema" por pregunta.
// Un módulo puede tener varios exámenes (por ejemplo, uno por certificación): en ese caso cada
// archivo agrega "# id: <id único>" y "# titulo: <nombre>"; sin "# id", el examen es el del módulo.
//   leccion: <id de la lección donde se repasa>
//   el enunciado (Markdown, admite bloques de código)
//   - [ ] opción incorrecta
//   - [x] la opción correcta (exactamente una)
//   porque: la explicación de la respuesta (hasta el final del bloque)
const MIN_PREGUNTAS = 10;
const MAX_CORRECTA_MAS_LARGA = 0.4;
function buildExamenes(modules) {
  const dir = path.join(CONTENT, 'examenes');
  if (!fs.existsSync(dir)) return [];
  const lecciones = new Map(modules.flatMap((m) => m.lecciones.map((l) => [l.id, { id: l.id, titulo: l.titulo, modulo: m.id }])));
  const examenes = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const file = path.join(dir, f);
    const txt = fs.readFileSync(file, 'utf8');
    const modulo = (txt.match(/^# examen:\s*(\S+)\s*$/m) || [])[1];
    if (!modules.some((m) => m.id === modulo)) throw new Error(`${f}: la línea "# examen: …" debe nombrar un módulo existente`);
    const id = (txt.match(/^# id:\s*(\S+)\s*$/m) || [])[1] || modulo;
    const titulo = ((txt.match(/^# titulo:\s*(.+)$/m) || [])[1] || '').trim();
    if (id !== modulo && !titulo) throw new Error(`${f}: un examen con "# id" necesita "# titulo"`);
    if (examenes.some((e) => e.id === id)) throw new Error(`${f}: el id de examen "${id}" está repetido`);
    // "## @caso id: Título" abre un caso de estudio (un escenario que comparten varias preguntas);
    // cualquier otro "## Tema" es una pregunta
    const bloques = txt.split(/^## /m).slice(1);
    const casos = {};
    for (const b of bloques.filter((x) => x.startsWith('@caso '))) {
      const [cab, ...resto] = b.split('\n');
      const m = cab.match(/^@caso\s+([\w-]+):\s*(.+)$/);
      if (!m) throw new Error(`${f}: un caso se escribe "## @caso id: Título" (${cab})`);
      if (casos[m[1]]) throw new Error(`${f}: el caso "${m[1]}" está repetido`);
      casos[m[1]] = { titulo: m[2].trim(), html: md(resto.join('\n').trim(), file) };
    }
    const preguntas = bloques.filter((x) => !x.startsWith('@caso ')).map((bloque, i) => {
      const donde = `Examen ${f}, pregunta ${i + 1}`;
      const [cab, ...lineas] = bloque.split('\n');
      const p = { tema: cab.trim(), opciones: [] };
      const enunciado = [], porque = []; let enCodigo = false, enPorque = false;
      for (const l of lineas) {
        if (l.startsWith('```')) enCodigo = !enCodigo;
        let m;
        if (enPorque) { porque.push(l); continue; }
        if (!enCodigo && (m = l.match(/^leccion:\s*(\S+)\s*$/))) { p.leccion = m[1]; continue; }
        if (!enCodigo && (m = l.match(/^dominio:\s*(\d+)\s*$/))) { p.dominio = Number(m[1]); continue; }
        if (!enCodigo && (m = l.match(/^caso:\s*([\w-]+)\s*$/))) { p.caso = m[1]; continue; }
        if (!enCodigo && (m = l.match(/^- \[( |x)\] (.*)$/))) { p.opciones.push({ text: marked.parseInline(m[2]), ok: m[1] === 'x' }); continue; }
        if (!enCodigo && (m = l.match(/^porque:\s?(.*)$/))) { enPorque = true; porque.push(m[1]); continue; }
        enunciado.push(l);
      }
      if (!p.leccion || !lecciones.has(p.leccion)) throw new Error(`${donde}: "leccion:" falta o no existe (${p.leccion})`);
      if (p.caso && !casos[p.caso]) throw new Error(`${donde}: el caso "${p.caso}" no existe`);
      const correctas = p.opciones.filter((o) => o.ok).length;
      if (!correctas) throw new Error(`${donde}: no tiene ninguna opción correcta`);
      if (p.opciones.length < Math.max(3, correctas + 2)) throw new Error(`${donde}: necesita al menos ${Math.max(3, correctas + 2)} opciones`);
      if (correctas > 1) p.multiple = correctas; // respuesta múltiple: "Elige N", se puntúa todo o nada
      if (!porque.join('').trim()) throw new Error(`${donde}: falta "porque:"`);
      if (!enunciado.join('').trim()) throw new Error(`${donde}: falta el enunciado`);
      const lec = lecciones.get(p.leccion);
      return { id: `${id}-p${i + 1}`, ...p, leccion: { id: lec.id, titulo: lec.titulo }, enunciado: md(enunciado.join('\n').trim(), file), porque: md(porque.join('\n').trim(), file) };
    });
    for (const c of Object.keys(casos)) if (!preguntas.some((p) => p.caso === c)) throw new Error(`${f}: el caso "${c}" no tiene preguntas`);
    if (preguntas.length < MIN_PREGUNTAS) throw new Error(`${f}: tiene ${preguntas.length} preguntas; el mínimo es ${MIN_PREGUNTAS}`);
    // si la correcta suele ser la opción más larga, se puede aprobar sin saber: hay que emparejar los largos
    // (solo en las de respuesta única; en las múltiples se revisa que las correctas no sean justo las más largas)
    const largo = (o) => o.text.replace(/<[^>]+>/g, '').length;
    const delatoras = preguntas.filter((p) => {
      const ls = p.opciones.map(largo);
      if (p.multiple) { const minOk = Math.min(...ls.filter((_, j) => p.opciones[j].ok)); return ls.filter((x, j) => !p.opciones[j].ok && x >= minOk).length === 0; }
      const c = ls[p.opciones.findIndex((o) => o.ok)]; return ls.filter((x) => x >= c).length === 1;
    });
    if (delatoras.length > preguntas.length * MAX_CORRECTA_MAS_LARGA) throw new Error(`${f}: en ${delatoras.length} de ${preguntas.length} preguntas la correcta es la opción más larga (${delatoras.map((p) => p.tema).join(', ')}); empareja el largo de las opciones`);
    examenes.push({ id, modulo, titulo, casos, preguntas });
  }
  return examenes;
}

// ---------------------------------------------------------------- certificaciones
// content/certificaciones.json: cada certificación con su formato, sus dominios (con el peso del
// examen y las lecciones del curso que los cubren) y el examen de práctica asociado.
function buildCertificaciones(modules, examenes) {
  const file = path.join(CONTENT, 'certificaciones.json');
  if (!fs.existsSync(file)) return [];
  const certs = JSON.parse(fs.readFileSync(file, 'utf8'));
  const lecciones = new Map(modules.flatMap((m) => m.lecciones.map((l) => [l.id, l.titulo])));
  const ids = new Set();
  for (const c of certs) {
    const donde = `certificaciones.json (${c.id})`;
    for (const k of ['id', 'proveedor', 'nombre', 'codigo', 'nivel', 'formato', 'dominios', 'fuente', 'actualizado']) if (!c[k]) throw new Error(`${donde}: falta "${k}"`);
    if (ids.has(c.id)) throw new Error(`${donde}: id repetido`);
    ids.add(c.id);
    if (c.examen && !examenes.some((e) => e.id === c.examen)) throw new Error(`${donde}: el examen "${c.examen}" no existe`);
    // con rangos oficiales ("30–35 %"), "peso" es el punto medio aproximado y solo dibuja la barra
    const total = c.dominios.reduce((s, d) => s + d.peso, 0);
    const tolerancia = c.dominios.some((d) => d.rango) ? 12 : 2;
    if (Math.abs(total - 100) > tolerancia) throw new Error(`${donde}: los pesos de los dominios suman ${total}, no 100`);
    if (c.examen) {
      // cada pregunta de práctica pertenece a un dominio: explícito con "dominio: N" o deducido de la
      // lección cuando solo un dominio la cubre (para el puntaje por dominio y el simulacro)
      const ex = examenes.find((e) => e.id === c.examen);
      ex.cert = c.id;
      for (const p of ex.preguntas) {
        if (p.dominio) {
          if (p.dominio < 1 || p.dominio > c.dominios.length) throw new Error(`${donde}: la pregunta "${p.tema}" tiene dominio ${p.dominio} y solo hay ${c.dominios.length}`);
          p.dominio -= 1;
          continue;
        }
        const cand = c.dominios.map((d, j) => ((d.lecciones || []).includes(p.leccion.id) ? j : -1)).filter((j) => j >= 0);
        if (cand.length !== 1) throw new Error(`${donde}: la pregunta "${p.tema}" necesita "dominio: N" (su lección está en ${cand.length ? 'los dominios ' + cand.map((j) => j + 1).join(', ') : 'ningún dominio'})`);
        p.dominio = cand[0];
      }
    }
    // tarjetas de palabras clave: content/claves/<id>.md con "## situación" + respuesta (y "dominio: N" opcional)
    const fc = path.join(CONTENT, 'claves', c.id + '.md');
    c.claves = [];
    if (fs.existsSync(fc)) {
      for (const [i, b] of fs.readFileSync(fc, 'utf8').split(/^## /m).slice(1).entries()) {
        const [cab, ...resto] = b.split('\n');
        let dom = null;
        const cuerpo = resto.filter((l) => { const m = l.match(/^dominio:\s*(\d+)\s*$/); if (m) { dom = Number(m[1]); return false; } return true; }).join('\n').trim();
        if (!cuerpo) throw new Error(`claves/${c.id}.md: la tarjeta "${cab.trim()}" no tiene respuesta`);
        if (dom !== null && (dom < 1 || dom > c.dominios.length)) throw new Error(`claves/${c.id}.md: la tarjeta "${cab.trim()}" tiene dominio ${dom}`);
        c.claves.push({ id: `${c.id}-k${i + 1}`, frente: marked.parseInline(cab.trim()), dorso: md(cuerpo, fc), dominio: dom === null ? null : dom - 1 });
      }
    }
    if (c.simulacro) for (const k of ['preguntas', 'minutos', 'aprobar']) if (typeof c.simulacro[k] !== 'number') throw new Error(`${donde}: "simulacro.${k}" debe ser un número`);
    for (const d of c.dominios) {
      for (const l of d.lecciones || []) if (!lecciones.has(l)) throw new Error(`${donde}: la lección "${l}" del dominio "${d.nombre}" no existe`);
      d.lecciones = (d.lecciones || []).map((l) => ({ id: l, titulo: lecciones.get(l) }));
      if (d.temas) d.temas = d.temas.map((t) => marked.parseInline(t));
    }
    if (c.notas) c.notas = md(c.notas, file);
  }
  return certs;
}

function build() {
  // íconos de los diagramas: la selección de Lucide más todo lo que usan las lecciones
  const usados = new Set();
  const recorrer = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) recorrer(p); else if (f.endsWith('.md')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/icono=([\w:-]+)/g)) usados.add(m[1]); } };
  recorrer(CONTENT);
  ICONOS_VALIDOS = generarIconos(ROOT, [...usados]);
  const modules = JSON.parse(fs.readFileSync(path.join(CONTENT, 'modules.json'), 'utf8'));
  let nLessons = 0, nEx = 0;
  for (const mod of modules) {
    const dir = path.join(CONTENT, mod.id);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
    mod.lecciones = files.map((f, i) => buildLesson(path.join(dir, f), mod.id, i));
    nLessons += mod.lecciones.length;
    nEx += mod.lecciones.reduce((s, l) => s + l.ejercicios.length, 0);
  }
  const ids = new Set(modules.flatMap((m) => m.lecciones.map((l) => l.id)));
  for (const m of modules) for (const l of m.lecciones) for (const r of l.prerrequisitos) if (!ids.has(r)) throw new Error(`Prerrequisito desconocido "${r}" en la lección ${l.id}`);
  const glosario = buildGlosario(modules);
  const examenes = buildExamenes(modules);
  const certificaciones = buildCertificaciones(modules, examenes);
  // El contenido se reparte para que la portada cargue rápido:
  //  - assets/js/content.js: el índice (módulos, títulos, resúmenes, lista de ejercicios sin su contenido)
  //  - assets/content/<módulo>.js: el texto de las lecciones y los ejercicios completos; se descarga al abrir el módulo
  //  - assets/content/_buscar.js: texto plano de las lecciones, solo para el buscador
  const dirC = path.join(ROOT, 'assets/content');
  fs.rmSync(dirC, { recursive: true, force: true }); fs.mkdirSync(dirC, { recursive: true });
  const hash = (txt) => { let h = 2166136261; for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const buscar = {};
  const indice = modules.map((m) => {
    const datos = {};
    const lecciones = m.lecciones.map((l) => {
      datos[l.id] = { html: l.html, ejercicios: l.ejercicios };
      buscar[l.id] = l.html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').toLowerCase();
      const enlaces = [...new Set([...l.html.matchAll(/href="(#\/[^"]*)"/g)].map((x) => x[1]))];
      return { ...l, html: '', htmlLen: l.html.length, enlaces, ejercicios: l.ejercicios.map((e) => ({ id: e.id, type: e.type, ...(e.dificultad ? { dificultad: e.dificultad } : {}) })) };
    });
    const js = `window.__contenido(${JSON.stringify(m.id)}, ${JSON.stringify(datos)});\n`;
    fs.writeFileSync(path.join(dirC, m.id + '.js'), js);
    return { ...m, lecciones, v: hash(js) };
  });
  const jsBuscar = `window.__buscar(${JSON.stringify(buscar)});\n`;
  fs.writeFileSync(path.join(dirC, '_buscar.js'), jsBuscar);
  // simuladores Python -> window.PY_SOURCES
  const pyRoot = path.join(ROOT, 'assets/py');
  const sources = {};
  const walk = (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) { if (f !== '__pycache__') walk(p); }
      else if (f.endsWith('.py')) {
        // assets/py/minispark/pyspark/x.py -> pyspark/x.py
        const rel = path.relative(pyRoot, p).split(path.sep).slice(1).join('/');
        sources[rel] = fs.readFileSync(p, 'utf8');
      }
    }
  };
  walk(pyRoot);
  fs.writeFileSync(path.join(ROOT, 'assets/js/pysrc.js'),
    '// Archivo generado por tools/build.mjs — fuentes de los simuladores mini-Spark y mini-Airflow\nwindow.PY_SOURCES = ' + JSON.stringify(sources) + ';\n');
  // versión del código de las herramientas (se descargan a pedido): cambia cuando cambia algún archivo
  const dirJs = path.join(ROOT, 'assets/js');
  const vJs = hash(fs.readdirSync(dirJs).filter((n) => n.endsWith('.js') && n !== 'content.js').sort().map((n) => n + ':' + hash(fs.readFileSync(path.join(dirJs, n), 'utf8'))).join('|'));
  // El glosario completo y las preguntas de examen pesan cerca de 2 MB: van en archivos aparte que la app descarga
  // recién al entrar al glosario, al repaso o a un examen. En el índice queda lo justo para listar, buscar y mostrar
  // la explicación corta al pasar por un término.
  const glosarioIndice = glosario.map((g) => ({ termino: g.termino, area: g.area, alias: g.alias, ver: g.ver, ...(g.nino ? { nino: g.nino } : { que: g.que }) }));
  const jsGlosario = `window.__glosario(${JSON.stringify(glosario)});\n`;
  fs.writeFileSync(path.join(dirC, '_glosario.js'), jsGlosario);
  const liviana = (p) => ({ id: p.id, tema: p.tema, leccion: { id: p.leccion.id }, ...(p.dominio ? { dominio: p.dominio } : {}), ...(p.caso ? { caso: p.caso } : {}), ...(p.multiple ? { multiple: p.multiple } : {}) });
  const examenesIndice = examenes.map((x) => ({ ...x, preguntas: x.preguntas.map(liviana) }));
  const completas = (lista) => `window.__examenes(${JSON.stringify(lista.map((x) => ({ id: x.id, preguntas: x.preguntas })))});\n`;
  const jsExamenes = completas(examenes.filter((x) => x.id === x.modulo)), jsExamenesCert = completas(examenes.filter((x) => x.id !== x.modulo));
  fs.writeFileSync(path.join(dirC, '_examenes.js'), jsExamenes);
  fs.writeFileSync(path.join(dirC, '_examenes_cert.js'), jsExamenesCert);
  const course = { generado: new Date().toISOString().slice(0, 10), vJs, vBuscar: hash(jsBuscar), vExtras: { glosario: hash(jsGlosario), examenes: hash(jsExamenes), examenes_cert: hash(jsExamenesCert) }, modulos: indice, glosario: glosarioIndice, examenes: examenesIndice, certificaciones };
  fs.writeFileSync(path.join(ROOT, 'assets/js/content.js'),
    '// Archivo generado por tools/build.mjs — no editar a mano. Edita content/**/*.md\nwindow.COURSE = ' + JSON.stringify(course) + ';\n');

  // index.html: cada script y hoja de estilos local lleva ?v=<hash de su contenido>, así el navegador
  // puede guardarlos mucho tiempo y aun así recibe la versión nueva cuando un archivo cambia
  globalThis.__sellarIndex = () => {
    const pIndex = path.join(ROOT, 'index.html'); let html = fs.readFileSync(pIndex, 'utf8');
    html = html.replace(/(src|href)="(assets\/[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"/g, (m, attr, ruta) => { const p = path.join(ROOT, ruta); return fs.existsSync(p) ? `${attr}="${ruta}?v=${hash(fs.readFileSync(p, 'utf8'))}"` : m; });
    // la imagen para compartir necesita la dirección completa del sitio (sale de "homepage" en package.json)
    const sitio = (() => { try { return String(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).homepage || '').replace(/\/?$/, '/'); } catch (e) { return ''; } })();
    html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${sitio.length > 1 ? sitio : ''}assets/img/compartir.png">`);
    fs.writeFileSync(pIndex, html);
  };

  globalThis.__sellarIndex();
  paginasParaBuscadores(modules);
  console.log(`✔ ${glosario.length} términos de glosario · ${examenes.length} exámenes (${examenes.reduce((n, e) => n + e.preguntas.length, 0)} preguntas) · ${certificaciones.length} certificaciones (${certificaciones.reduce((n, c) => n + c.claves.length, 0)} tarjetas) · ${modules.length} módulos, ${nLessons} lecciones, ${nEx} ejercicios, ${Object.keys(sources).length} archivos Python`);
  return { ...course, modulos: modules, glosario, examenes } /* quien valida necesita todo completo, no el índice */;
}

export { build };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
