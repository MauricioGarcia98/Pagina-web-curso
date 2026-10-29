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

function md(text, file = '') {
  text = text.replace(/^```diagrama[ \t]*\n([\s\S]*?)^```[ \t]*$/gm, (_, body) => {
    const spec = parseDiagrama(body, file);
    return `<figure class="diagrama" data-spec="${escapeHtml(JSON.stringify(spec))}">${spec.titulo ? `<figcaption>${escapeHtml(spec.titulo)}</figcaption>` : ''}</figure>\n`;
  });
  text = text.replace(/^```motores[ \t]*\n([\s\S]*?)^```[ \t]*$/gm, (_, body) => {
    const spec = parseMotores(body, file);
    return `<div class="motores" data-spec="${escapeHtml(JSON.stringify(spec))}"></div>\n`;
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

const ROLES = ['inicial', 'solucion', 'pista', 'test', 'check', 'respuesta', 'salida', 'explicacion', 'setup', 'previo'];

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
    if (role === 'pista' || role === 'explicacion') ex[role] = (ex[role] ? ex[role] + '\n' : '') + content;
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
  if (ex.pista) ex.pista = md(ex.pista);
  if (ex.explicacion) ex.explicacion = md(ex.explicacion);
  if (['sql', 'python', 'pyspark', 'airflow', 'dbt'].includes(type) && ex.solucion === undefined) throw new Error(`Ejercicio sin solución en ${file} (#${idx + 1})`);
  if (type === 'cli' && !ex.respuesta) throw new Error(`Ejercicio cli sin respuesta en ${file} (#${idx + 1})`);
  return ex;
}

// listas del front matter en una sola línea, separadas por " | "
const lista = (v) => (v ? String(v).split(/\s+\|\s+/).map((x) => x.trim()).filter(Boolean) : []);
const mdInline = (t) => marked.parseInline(t);

function buildLesson(file, moduleId, order) {
  const src = fs.readFileSync(file, 'utf8');
  const { meta, body } = parseFrontMatter(src, file);
  const slug = path.basename(file, '.md').replace(/^\d+-/, '');
  const id = `${moduleId}-${slug}`;
  const exercises = [];
  const re = /^:::ejercicio[ \t]+([^\n]*)\n([\s\S]*?)^:::[ \t]*$/gm;
  let k = 0;
  const content = body.replace(re, (_, header, exBody) => {
    exercises.push(parseExercise(header, exBody, file, k, id));
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
  const course = { generado: new Date().toISOString().slice(0, 10), modulos: modules, glosario, examenes, certificaciones };
  fs.writeFileSync(path.join(ROOT, 'assets/js/content.js'),
    '// Archivo generado por tools/build.mjs — no editar a mano. Edita content/**/*.md\nwindow.COURSE = ' + JSON.stringify(course) + ';\n');

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
  console.log(`✔ ${glosario.length} términos de glosario · ${examenes.length} exámenes (${examenes.reduce((n, e) => n + e.preguntas.length, 0)} preguntas) · ${certificaciones.length} certificaciones (${certificaciones.reduce((n, c) => n + c.claves.length, 0)} tarjetas) · ${modules.length} módulos, ${nLessons} lecciones, ${nEx} ejercicios, ${Object.keys(sources).length} archivos Python`);
  return course;
}

export { build };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
