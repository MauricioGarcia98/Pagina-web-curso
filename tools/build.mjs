// Compila el contenido del curso (content/**/*.md) y los simuladores Python
// (assets/py/**) a archivos JS que el sitio carga sin necesidad de servidor.
//   npm run build
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

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

const CALLOUTS = { tip: '💡 Consejo', nota: '📝 Nota', cuidado: '⚠️ Cuidado', analogia: '🧠 Analogía', experto: '🚀 Nivel experto', entrevista: '🎯 Pregunta de entrevista' };

function md(text) {
  // bloques :::tip ... ::: (no confundir con :::ejercicio)
  text = text.replace(/^:::(tip|nota|cuidado|analogia|experto|entrevista)[ \t]*(.*)\n([\s\S]*?)^:::[ \t]*$/gm, (_, kind, title, body) =>
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

const ROLES = ['inicial', 'solucion', 'pista', 'test', 'check', 'respuesta', 'salida', 'explicacion', 'setup'];

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
    else if (role === 'respuesta') (ex.respuesta = ex.respuesta || []).push(...content.split('\n').map((s) => s.trim()).filter(Boolean));
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
    resumen: meta.resumen || '', html: md(content), ejercicios: exercises
  };
}

function build() {
  const modules = JSON.parse(fs.readFileSync(path.join(CONTENT, 'modules.json'), 'utf8'));
  let nLessons = 0, nEx = 0;
  for (const mod of modules) {
    const dir = path.join(CONTENT, mod.id);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
    mod.lecciones = files.map((f, i) => buildLesson(path.join(dir, f), mod.id, i));
    nLessons += mod.lecciones.length;
    nEx += mod.lecciones.reduce((s, l) => s + l.ejercicios.length, 0);
  }
  const glosarioFile = path.join(CONTENT, 'glosario.json');
  const glosario = fs.existsSync(glosarioFile) ? JSON.parse(fs.readFileSync(glosarioFile, 'utf8')) : [];
  const course = { generado: new Date().toISOString().slice(0, 10), modulos: modules, glosario };
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
  console.log(`✔ ${modules.length} módulos, ${nLessons} lecciones, ${nEx} ejercicios, ${Object.keys(sources).length} archivos Python`);
  return course;
}

export { build };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
