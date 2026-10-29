/* Mis notas: un cuaderno estilo Notion/Obsidian que vive en el navegador (localStorage).
 *  - Markdown con vista previa (títulos, listas, tareas que se tildan en la vista, tablas, código
 *    resaltado, citas y avisos "> [!tip]"), [[enlaces entre notas]] con autocompletado, #etiquetas,
 *    enlaces entrantes (backlinks), índice de títulos y grafo de conexiones.
 *  - Carpetas, fijadas, búsqueda de texto completo, nota diaria, plantillas y menú "/" de bloques.
 *  - Notas por lección (#/notas?leccion=<id>) con enlace de vuelta a la lección.
 *  - Exportar una nota (.md) o todo (.json / .md), e importar .json o .md.
 * Nada sale del navegador: si se borran los datos del sitio, se borran las notas (por eso el respaldo). */
(function () {
  'use strict';
  const KEY = 'academia-notas-v1';
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const hoy = () => new Date().toISOString().slice(0, 10);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmtFecha = (t) => new Date(t).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // ---------------------------------------------------------------- almacenamiento
  const DB = {
    data: null,
    load() {
      if (this.data) return this.data;
      try { this.data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { this.data = null; }
      if (!this.data || !this.data.notas) this.data = { notas: {}, abierta: null, vista: 'dividido' };
      if (!Object.keys(this.data.notas).length) this.semilla();
      return this.data;
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; } },
    lista() { return Object.values(this.load().notas); },
    nueva(campos) {
      const n = Object.assign({ id: uid(), titulo: 'Sin título', cuerpo: '', carpeta: '', fijada: false, creada: Date.now(), editada: Date.now() }, campos);
      this.load().notas[n.id] = n; this.save(); return n;
    },
    porTitulo(t) { const k = String(t).trim().toLowerCase(); return this.lista().find((n) => n.titulo.trim().toLowerCase() === k); },
    semilla() {
      const a = this.nueva({ titulo: 'Bienvenida a tus notas', carpeta: 'Inicio', fijada: true, cuerpo: `# Bienvenida a tus notas

Este cuaderno vive **en tu navegador**: nadie más lo ve. Úsalo para tus apuntes del curso.

## Lo básico
- Escribe en **Markdown**: \`# título\`, \`**negrita**\`, \`- lista\`, \`- [ ] tarea\`.
- Escribe \`/\` al comienzo de una línea para insertar bloques (tabla, código SQL, aviso…).
- Enlaza otra nota con dobles corchetes: [[Chuleta de SQL]]. Si no existe, se crea al hacer clic.
- Agrega etiquetas como #sql o #entrevista y fíltralas en el panel izquierdo.

## Tareas de esta semana
- [x] Abrir mis notas
- [ ] Terminar la lección "El viaje de una compra"
- [ ] Hacer el laboratorio de guardia

> [!tip] Respaldo
> Las notas se guardan en este navegador. Usa **Exportar → Todo (.json)** de vez en cuando.
` });
      this.nueva({ titulo: 'Chuleta de SQL', carpeta: 'Chuletas', creada: a.creada + 1, cuerpo: `# Chuleta de SQL #sql

| Necesito | Uso |
|---|---|
| Filtrar filas | \`WHERE\` |
| Filtrar grupos | \`HAVING\` |
| Top N por grupo | \`ROW_NUMBER() OVER (PARTITION BY … ORDER BY …)\` |

\`\`\`sql
SELECT pais, COUNT(*) AS clientes
FROM clientes
GROUP BY pais
ORDER BY clientes DESC;
\`\`\`

Volver a [[Bienvenida a tus notas]].
` });
      this.data.abierta = a.id; this.save();
    },
  };

  const enlacesDe = (n) => [...n.cuerpo.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());
  const etiquetasDe = (n) => [...new Set([...n.cuerpo.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '').matchAll(/(^|[\s(])#([\wáéíóúñü-]+)/gi)].map((m) => m[2].toLowerCase()))];

  // ---------------------------------------------------------------- Markdown -> HTML
  function inline(t) {
    const codigos = [];
    t = t.replace(/`([^`]+)`/g, (_, c) => { codigos.push(c); return `\u0000${codigos.length - 1}\u0000`; });
    t = esc(t)
      .replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, dest, alias) => {
        const existe = !!DB.porTitulo(dest);
        return `<a href="#" class="nt-wiki ${existe ? '' : 'nt-wiki-nueva'}" data-wiki="${esc(dest.trim())}" title="${existe ? 'Abrir' : 'Crear'} «${esc(dest.trim())}»">${esc((alias || dest).trim())}</a>`;
      })
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|#)[^)\s]+)\)/g, (_, txt, url) => `<a href="${url}" ${url.startsWith('#') ? '' : 'target="_blank" rel="noopener"'}>${txt}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
      .replace(/~~([^~]+)~~/g, '<s>$1</s>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>')
      .replace(/(^|[\s(])#([\wáéíóúñü-]+)/gi, '$1<a href="#" class="nt-tag" data-tag="$2">#$2</a>');
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codigos[i])}</code>`);
  }
  function render(src) {
    const L = src.replace(/\r/g, '').split('\n');
    const out = [];
    let i = 0;
    const hl = (code, lang) => { if (window.hljs && lang && window.hljs.getLanguage(lang)) { try { return window.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value; } catch (e) { /* sin resaltado */ } } return esc(code); };
    while (i < L.length) {
      const l = L[i];
      let m;
      if ((m = l.match(/^```\s*(\w*)/))) {
        const lang = m[1]; const buf = []; i++;
        while (i < L.length && !/^```/.test(L[i])) buf.push(L[i++]);
        i++;
        out.push(`<pre class="nt-code" data-lang="${esc(lang)}"><code class="hljs">${hl(buf.join('\n'), lang)}</code></pre>`);
        continue;
      }
      if ((m = l.match(/^(#{1,6})\s+(.*)$/))) { const n = m[1].length; out.push(`<h${n} data-linea="${i}">${inline(m[2])}</h${n}>`); i++; continue; }
      if (/^(-{3,}|\*{3,})\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
      if (/^>\s?/.test(l)) {
        const buf = [];
        while (i < L.length && /^>\s?/.test(L[i])) buf.push(L[i++].replace(/^>\s?/, ''));
        const av = buf[0] && buf[0].match(/^\[!(\w+)\]\s*(.*)$/);
        if (av) {
          const tipo = av[1].toLowerCase(); const ico = { tip: '💡', nota: '📝', cuidado: '⚠️', importante: '❗', idea: '🧠' }[tipo] || '📌';
          out.push(`<div class="nt-aviso nt-aviso-${esc(tipo)}"><div class="nt-aviso-t">${ico} ${inline(av[2] || tipo)}</div>${render(buf.slice(1).join('\n'))}</div>`);
        } else out.push(`<blockquote>${render(buf.join('\n'))}</blockquote>`);
        continue;
      }
      if (/^\|.*\|\s*$/.test(l) && L[i + 1] && /^\|[\s:|-]+\|\s*$/.test(L[i + 1])) {
        const fila = (x) => x.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const cab = fila(l); i += 2; const filas = [];
        while (i < L.length && /^\|.*\|\s*$/.test(L[i])) filas.push(fila(L[i++]));
        out.push(`<div class="nt-tabla"><table><thead><tr>${cab.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      if (/^\s*([-*+]|\d+\.)\s+/.test(l)) {
        const ord = /^\s*\d+\./.test(l); const items = [];
        while (i < L.length && /^\s*([-*+]|\d+\.)\s+/.test(L[i])) {
          const t = L[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''); const ind = L[i].match(/^\s*/)[0].length;
          const tk = t.match(/^\[([ xX])\]\s+(.*)$/);
          items.push(tk ? `<li class="nt-tarea ${tk[1] !== ' ' ? 'hecha' : ''}" style="margin-left:${ind * 8}px"><input type="checkbox" data-linea="${i}" ${tk[1] !== ' ' ? 'checked' : ''}> <span>${inline(tk[2])}</span></li>` : `<li style="margin-left:${ind * 8}px">${inline(t)}</li>`);
          i++;
        }
        out.push(ord ? `<ol>${items.join('')}</ol>` : `<ul class="${items.some((x) => x.includes('nt-tarea')) ? 'nt-tareas' : ''}">${items.join('')}</ul>`);
        continue;
      }
      if (!l.trim()) { i++; continue; }
      const buf = [];
      while (i < L.length && L[i].trim() && !/^(#{1,6}\s|```|>|\s*([-*+]|\d+\.)\s|\|.*\|\s*$|-{3,}\s*$)/.test(L[i])) buf.push(L[i++]);
      if (!buf.length) buf.push(L[i++]);
      out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
    }
    return out.join('\n');
  }

  // ---------------------------------------------------------------- plantillas y bloques
  const PLANTILLAS = {
    'Apuntes de lección': () => `# Apuntes: \n\n## Lo más importante\n- \n\n## Comandos o consultas para recordar\n\`\`\`sql\n\n\`\`\`\n\n## Dudas\n- [ ] \n\n#apuntes`,
    'Diario de estudio': () => `# Diario ${hoy()}\n\n## Hoy estudié\n- \n\n## Me costó\n- \n\n## Mañana\n- [ ] \n\n#diario`,
    'Chuleta de comandos': () => `# Chuleta: \n\n| Comando | Para qué |\n|---|---|\n| \`\` | |\n\n#chuleta`,
    'Postmortem': () => `# Postmortem: \n\n> [!nota] Sin culpables\n> Buscamos la causa en el sistema, no en las personas.\n\n## Impacto\n- \n\n## Línea de tiempo\n| Hora | Qué pasó |\n|---|---|\n| | Detección |\n| | Mitigación |\n| | Resolución |\n\n## Causa raíz (5 porqués)\n1. \n\n## Acciones (dueño y fecha)\n- [ ] \n\n#postmortem`,
    'Preparar una entrevista': () => `# Entrevista: \n\n## La empresa y el rol\n- \n\n## Mis proyectos para contar (situación, acción, resultado)\n1. \n\n## Preguntas técnicas para repasar\n- [ ] SQL: ventanas, deduplicación\n- [ ] Modelado: estrella, SCD\n- [ ] Pipelines: idempotencia, incrementales\n\n#entrevista`,
    'Diseño de un pipeline': () => `# Pipeline: \n\n## Problema de negocio\n\n## Fuentes\n| Fuente | Formato | Frecuencia |\n|---|---|---|\n| | | |\n\n## Capas\n- **Bronze**: \n- **Silver**: \n- **Gold**: \n\n## Calidad y alertas\n- [ ] Frescura\n- [ ] Volumen\n- [ ] Unicidad\n\n#diseño`,
  };
  const BLOQUES = [
    ['Título', '## '], ['Lista de tareas', '- [ ] '], ['Tabla', '| Columna | Columna |\n|---|---|\n| | |'],
    ['Código SQL', '```sql\n\n```'], ['Código Python', '```python\n\n```'], ['Código bash', '```bash\n\n```'],
    ['Aviso (tip)', '> [!tip] Título\n> '], ['Aviso (cuidado)', '> [!cuidado] Título\n> '], ['Cita', '> '], ['Separador', '---'],
    ['Enlace a otra nota', '[[]]'], ['Fecha de hoy', hoy()],
  ];

  // ---------------------------------------------------------------- vista
  function vista(main, ctx) {
    const { toast, LESSONS = [], params } = ctx;
    const D = DB.load();
    let filtro = { q: '', tag: null, carpeta: null, solo: null };
    let modo = D.vista || 'dividido';

    // ¿llega desde una lección? abrir (o crear) su nota
    const lecId = params && params.get('leccion');
    if (lecId) {
      const lec = LESSONS.find((l) => l.id === lecId);
      if (lec) {
        let n = DB.lista().find((x) => x.leccion === lecId);
        if (!n) n = DB.nueva({ titulo: 'Lección: ' + lec.titulo, carpeta: lec.modulo ? lec.modulo.titulo : 'Lecciones', leccion: lecId, cuerpo: `# ${lec.titulo}\n\n[↩ Volver a la lección](#/l/${lecId})\n\n## Lo más importante\n- \n\n## Para repasar\n- [ ] \n\n#${(lec.modulo ? lec.modulo.id : 'apuntes')}` });
        D.abierta = n.id; DB.save();
      }
      history.replaceState(null, '', '#/notas');
    }
    if (!D.notas[D.abierta]) D.abierta = (DB.lista().sort((a, b) => b.editada - a.editada)[0] || {}).id;

    main.innerHTML = `<div class="notas" id="notas">
      <aside class="nt-side card">
        <div class="nt-side-top">
          <input type="search" id="ntBuscar" placeholder="Buscar en las notas…" autocomplete="off">
          <div class="nt-acciones">
            <button class="btn btn-primary btn-sm" id="ntNueva" title="Nueva nota (Alt+N)">＋ Nueva</button>
            <button class="btn btn-sm" id="ntDiaria" title="Nota del día">📅 Hoy</button>
            <select id="ntPlantilla" class="btn btn-sm" title="Nueva nota desde una plantilla"><option value="">📄 Plantilla…</option>${Object.keys(PLANTILLAS).map((p) => `<option>${esc(p)}</option>`).join('')}</select>
          </div>
          <div class="nt-filtros" id="ntFiltros"></div>
        </div>
        <div class="nt-lista" id="ntLista"></div>
        <div class="nt-side-pie">
          <button class="btn btn-ghost btn-sm" id="ntGrafo">🕸 Grafo</button>
          <button class="btn btn-ghost btn-sm" id="ntExportar">⬇ Exportar</button>
          <label class="btn btn-ghost btn-sm" title="Importar .json o .md">⬆ Importar<input type="file" id="ntImportar" accept=".json,.md,.txt" multiple hidden></label>
        </div>
      </aside>
      <section class="nt-main card" id="ntMain"></section>
      <aside class="nt-info card" id="ntInfo"></aside>
    </div>`;
    const $ = (s) => main.querySelector(s);

    function filtradas() {
      const q = filtro.q.trim().toLowerCase();
      return DB.lista().filter((n) => {
        if (filtro.tag && !etiquetasDe(n).includes(filtro.tag)) return false;
        if (filtro.carpeta !== null && (n.carpeta || '') !== filtro.carpeta) return false;
        if (filtro.solo === 'fijadas' && !n.fijada) return false;
        if (filtro.solo === 'lecciones' && !n.leccion) return false;
        if (q && !(n.titulo + '\n' + n.cuerpo).toLowerCase().includes(q)) return false;
        return true;
      }).sort((a, b) => (b.fijada - a.fijada) || (b.editada - a.editada));
    }
    function pintarFiltros() {
      const notas = DB.lista();
      const tags = {}; notas.forEach((n) => etiquetasDe(n).forEach((t) => { tags[t] = (tags[t] || 0) + 1; }));
      const carpetas = {}; notas.forEach((n) => { const c = n.carpeta || ''; carpetas[c] = (carpetas[c] || 0) + 1; });
      const chip = (attr, val, txt, on) => `<button class="nt-chip ${on ? 'on' : ''}" data-${attr}="${esc(val)}">${txt}</button>`;
      $('#ntFiltros').innerHTML =
        `<div class="nt-fila">${chip('solo', '', 'Todas', !filtro.solo && filtro.carpeta === null && !filtro.tag)}${chip('solo', 'fijadas', '📌 Fijadas', filtro.solo === 'fijadas')}${chip('solo', 'lecciones', '📚 De lecciones', filtro.solo === 'lecciones')}</div>` +
        `<details ${filtro.carpeta !== null ? 'open' : ''}><summary>📁 Carpetas</summary><div class="nt-fila">${Object.entries(carpetas).sort().map(([c, k]) => chip('carpeta', c, `${esc(c || 'Sin carpeta')} <small>${k}</small>`, filtro.carpeta === c)).join('')}</div></details>` +
        (Object.keys(tags).length ? `<details ${filtro.tag ? 'open' : ''}><summary># Etiquetas</summary><div class="nt-fila">${Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([t, k]) => chip('tag', t, `#${esc(t)} <small>${k}</small>`, filtro.tag === t)).join('')}</div></details>` : '');
    }
    function pintarLista() {
      const q = filtro.q.trim().toLowerCase();
      const ns = filtradas();
      $('#ntLista').innerHTML = ns.length ? ns.map((n) => {
        let extracto = n.cuerpo.replace(/[#*>`[\]|-]/g, ' ').replace(/\s+/g, ' ').trim();
        if (q) { const p = extracto.toLowerCase().indexOf(q); extracto = p >= 0 ? '…' + extracto.slice(Math.max(0, p - 30), p + 60) : extracto.slice(0, 90); } else extracto = extracto.slice(0, 90);
        const marcar = (s) => (q ? esc(s).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (x) => `<mark>${x}</mark>`) : esc(s));
        return `<button class="nt-item ${n.id === D.abierta ? 'activa' : ''}" data-id="${n.id}"><span class="nt-item-t">${n.fijada ? '📌 ' : ''}${n.leccion ? '📚 ' : ''}${marcar(n.titulo)}</span><span class="nt-item-x">${marcar(extracto)}</span><span class="nt-item-f">${esc(n.carpeta || 'Sin carpeta')} · ${fmtFecha(n.editada)}</span></button>`;
      }).join('') : '<p class="muted small" style="padding:10px">No hay notas con ese filtro.</p>';
    }

    let ta = null, guardarT = null;
    function abrir(id) {
      const n = D.notas[id];
      if (!n) return;
      D.abierta = id; DB.save();
      $('#ntMain').innerHTML = `
        <div class="nt-cab">
          <input class="nt-titulo" id="ntTitulo" value="${esc(n.titulo)}" aria-label="Título de la nota">
          <div class="nt-cab-acc">
            <input class="nt-carpeta" id="ntCarpeta" list="ntCarpetas" value="${esc(n.carpeta || '')}" placeholder="📁 Carpeta" aria-label="Carpeta">
            <datalist id="ntCarpetas">${[...new Set(DB.lista().map((x) => x.carpeta).filter(Boolean))].map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
            <div class="nt-modos" role="group" aria-label="Modo">${[['editar', '✏️ Editar'], ['dividido', '◫ Dividido'], ['ver', '👁 Ver']].map(([k, t]) => `<button class="${modo === k ? 'on' : ''}" data-modo="${k}">${t}</button>`).join('')}</div>
            <button class="btn btn-ghost btn-sm" id="ntFijar" title="Fijar arriba">${n.fijada ? '📌 Fijada' : '📌 Fijar'}</button>
            <button class="btn btn-ghost btn-sm" id="ntMd" title="Descargar esta nota en Markdown">⬇ .md</button>
            <button class="btn btn-ghost btn-sm" id="ntBorrar" title="Borrar nota">🗑</button>
          </div>
        </div>
        <div class="nt-barra" id="ntBarra">${[['**', '**', 'B', 'Negrita'], ['*', '*', 'I', 'Cursiva'], ['`', '`', '</>', 'Código'], ['==', '==', '🖍', 'Resaltar'], ['[[', ']]', '[[ ]]', 'Enlace a nota'], ['\n- [ ] ', '', '☑', 'Tarea'], ['\n## ', '', 'H2', 'Título']].map(([a, b, t, tt]) => `<button data-ins="${esc(a)}" data-fin="${esc(b)}" title="${tt}">${esc(t)}</button>`).join('')}<span class="spacer"></span><span class="small muted" id="ntEstado"></span></div>
        <div class="nt-cuerpo modo-${modo}">
          <div class="nt-editor-wrap"><textarea id="ntTexto" spellcheck="true" placeholder="Escribe… ( / para insertar bloques, [[ para enlazar otra nota )"></textarea><div class="nt-pop" id="ntPop" hidden></div></div>
          <div class="nt-vista prose" id="ntVista"></div>
        </div>`;
      ta = $('#ntTexto'); ta.value = n.cuerpo;
      pintarVista(); pintarInfo(); pintarLista(); pintarFiltros();
      $('#ntTitulo').addEventListener('input', (e) => { n.titulo = e.target.value || 'Sin título'; tocar(n); });
      $('#ntCarpeta').addEventListener('change', (e) => { n.carpeta = e.target.value.trim(); tocar(n); pintarFiltros(); });
      ta.addEventListener('input', () => { n.cuerpo = ta.value; tocar(n); pop(); });
      ta.addEventListener('keydown', teclasEditor);
      $('#ntBarra').addEventListener('click', (e) => { const b = e.target.closest('[data-ins]'); if (b) insertar(b.dataset.ins, b.dataset.fin); });
      $('.nt-modos').addEventListener('click', (e) => { const b = e.target.closest('[data-modo]'); if (!b) return; modo = b.dataset.modo; D.vista = modo; DB.save(); $('.nt-cuerpo').className = 'nt-cuerpo modo-' + modo; main.querySelectorAll('[data-modo]').forEach((x) => x.classList.toggle('on', x === b)); if (modo !== 'ver') ta.focus(); });
      $('#ntFijar').addEventListener('click', () => { n.fijada = !n.fijada; tocar(n, true); abrir(n.id); });
      $('#ntMd').addEventListener('click', () => descargar(`${nombreArchivo(n.titulo)}.md`, n.cuerpo, 'text/markdown'));
      $('#ntBorrar').addEventListener('click', () => {
        if (!confirm(`¿Borrar «${n.titulo}»? No se puede deshacer.`)) return;
        delete D.notas[n.id]; DB.save();
        const sig = filtradas()[0] || DB.lista()[0];
        if (sig) abrir(sig.id); else abrir(DB.nueva({ titulo: 'Nota nueva' }).id);
        toast('Nota borrada');
      });
    }
    function tocar(n, sinRepintar) {
      n.editada = Date.now();
      clearTimeout(guardarT);
      const est = $('#ntEstado'); if (est) est.textContent = 'Guardando…';
      guardarT = setTimeout(() => {
        const ok = DB.save();
        if (est) est.textContent = ok ? `Guardado ${fmtFecha(n.editada)}` : '⚠ No se pudo guardar (almacenamiento lleno o bloqueado)';
        if (!sinRepintar) { pintarVista(); pintarInfo(); pintarLista(); }
      }, 350);
    }
    function pintarVista() {
      const v = $('#ntVista'); if (!v) return;
      v.innerHTML = render(D.notas[D.abierta].cuerpo) || '<p class="muted">Nota vacía.</p>';
    }
    function pintarInfo() {
      const n = D.notas[D.abierta];
      const entrantes = DB.lista().filter((x) => x.id !== n.id && enlacesDe(x).some((t) => t.toLowerCase() === n.titulo.trim().toLowerCase()));
      const salientes = enlacesDe(n);
      const titulos = [...n.cuerpo.matchAll(/^(#{1,4})\s+(.*)$/gm)];
      const palabras = (n.cuerpo.match(/\S+/g) || []).length;
      const tareas = (n.cuerpo.match(/^\s*[-*+]\s+\[[ xX]\]/gm) || []).length, hechas = (n.cuerpo.match(/^\s*[-*+]\s+\[[xX]\]/gm) || []).length;
      $('#ntInfo').innerHTML = `
        ${n.leccion ? `<a class="btn btn-sm" href="#/l/${esc(n.leccion)}" style="margin-bottom:10px">📚 Ir a la lección</a>` : ''}
        <h4>Índice</h4>${titulos.length ? `<ul class="nt-indice">${titulos.map((t) => `<li style="padding-left:${(t[1].length - 1) * 10}px">${esc(t[2].replace(/[*`#]/g, ''))}</li>`).join('')}</ul>` : '<p class="muted small">Usa títulos (#) para armar un índice.</p>'}
        <h4>Enlaces entrantes <small class="muted">${entrantes.length}</small></h4>${entrantes.length ? entrantes.map((x) => `<button class="nt-link" data-id="${x.id}">↩ ${esc(x.titulo)}</button>`).join('') : '<p class="muted small">Ninguna nota enlaza a esta. Enlázala desde otra con [[' + esc(n.titulo) + ']].</p>'}
        <h4>Enlaces salientes <small class="muted">${salientes.length}</small></h4>${salientes.length ? [...new Set(salientes)].map((t) => { const d = DB.porTitulo(t); return d ? `<button class="nt-link" data-id="${d.id}">→ ${esc(d.titulo)}</button>` : `<button class="nt-link nueva" data-crear="${esc(t)}">＋ ${esc(t)}</button>`; }).join('') : '<p class="muted small">—</p>'}
        <h4>Datos</h4><p class="small muted">${palabras} palabras${tareas ? ` · ${hechas}/${tareas} tareas` : ''}<br>Creada ${fmtFecha(n.creada)}<br>Editada ${fmtFecha(n.editada)}</p>`;
    }
    function abrirPorTitulo(t) {
      const d = DB.porTitulo(t);
      if (d) return abrir(d.id);
      const n = DB.nueva({ titulo: t, carpeta: D.notas[D.abierta] ? D.notas[D.abierta].carpeta : '', cuerpo: `# ${t}\n\n` });
      toast(`Nota «${t}» creada`); abrir(n.id);
    }

    // --------------------------------------------------- edición: insertar, menú "/" y autocompletado [[
    function insertar(ini, fin = '', reemplazarDesde = null) {
      ta.focus();
      const s = reemplazarDesde !== null ? reemplazarDesde : ta.selectionStart, e = ta.selectionEnd;
      const sel = ta.value.slice(ta.selectionStart, e);
      ta.setRangeText(ini + sel + fin, s, e, 'end');
      if (!sel && fin) ta.selectionStart = ta.selectionEnd = s + ini.length;
      ta.dispatchEvent(new Event('input'));
    }
    let popItems = [], popSel = 0, popTipo = null, popDesde = 0;
    function pop() {
      const p = $('#ntPop'); const pos = ta.selectionStart; const antes = ta.value.slice(0, pos);
      const wiki = antes.match(/\[\[([^\]\n]*)$/), barra = antes.match(/(^|\n)\/([\wáéíóú ]*)$/);
      if (wiki) {
        popTipo = 'wiki'; popDesde = pos - wiki[1].length;
        const q = wiki[1].toLowerCase();
        popItems = DB.lista().filter((x) => x.id !== D.abierta && x.titulo.toLowerCase().includes(q)).slice(0, 7).map((x) => [x.titulo, x.titulo]);
        if (wiki[1].trim() && !DB.porTitulo(wiki[1])) popItems.push([`＋ Crear «${wiki[1]}»`, wiki[1]]);
      } else if (barra) {
        popTipo = 'bloque'; popDesde = pos - barra[2].length - 1;
        const q = barra[2].toLowerCase();
        popItems = BLOQUES.filter(([t]) => t.toLowerCase().includes(q)).map(([t, v]) => [t, v]);
      } else popItems = [];
      if (!popItems.length) { p.hidden = true; popTipo = null; return; }
      popSel = Math.min(popSel, popItems.length - 1);
      p.innerHTML = `<div class="small muted" style="padding:4px 8px">${popTipo === 'wiki' ? 'Enlazar nota' : 'Insertar bloque'} · ↑↓ Enter</div>` + popItems.map(([t], i) => `<button class="${i === popSel ? 'on' : ''}" data-i="${i}">${esc(t)}</button>`).join('');
      p.hidden = false;
    }
    function elegir(i) {
      const [, v] = popItems[i];
      if (popTipo === 'wiki') {
        const cierra = ta.value.slice(ta.selectionStart, ta.selectionStart + 2) === ']]';
        insertar(v + (cierra ? '' : ']]'), '', popDesde);
        if (cierra) ta.selectionStart = ta.selectionEnd = ta.selectionStart + 2;
      } else {
        insertar(v, '', popDesde);
        const k = v.indexOf('\n\n```'); if (v.startsWith('```')) ta.selectionStart = ta.selectionEnd = popDesde + v.indexOf('\n') + 1; else if (k >= 0) ta.selectionStart = ta.selectionEnd = popDesde + k + 1;
        if (v === '[[]]') ta.selectionStart = ta.selectionEnd = popDesde + 2;
      }
      $('#ntPop').hidden = true; popTipo = null;
    }
    function teclasEditor(e) {
      if (popTipo && !$('#ntPop').hidden) {
        if (e.key === 'ArrowDown') { e.preventDefault(); popSel = (popSel + 1) % popItems.length; pop(); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); popSel = (popSel - 1 + popItems.length) % popItems.length; pop(); return; }
        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); elegir(popSel); return; }
        if (e.key === 'Escape') { $('#ntPop').hidden = true; popTipo = null; return; }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); insertar('**', '**'); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); insertar('*', '*'); }
      if (e.key === 'Tab') { e.preventDefault(); insertar('  '); }
      // Enter en una lista continúa la lista
      if (e.key === 'Enter' && !e.shiftKey) {
        const ini = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
        const linea = ta.value.slice(ini, ta.selectionStart);
        const m = linea.match(/^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|(\d+)\.\s+)(.*)$/);
        if (m) {
          e.preventDefault();
          if (!m[4].trim()) { ta.setRangeText('', ini, ta.selectionStart, 'end'); ta.dispatchEvent(new Event('input')); return; }
          const sig = m[3] ? `${Number(m[3]) + 1}. ` : m[2].replace(/\[[xX]\]/, '[ ]');
          insertar('\n' + m[1] + sig);
        }
      }
    }
    $('#ntMain').addEventListener('mousedown', (e) => { const b = e.target.closest('#ntPop [data-i]'); if (b) { e.preventDefault(); elegir(Number(b.dataset.i)); } });

    // --------------------------------------------------- clics: lista, filtros, vista previa, info
    main.addEventListener('click', (e) => {
      const t = e.target;
      const it = t.closest('[data-id]'); if (it && (it.classList.contains('nt-item') || it.classList.contains('nt-link'))) return abrir(it.dataset.id);
      const cr = t.closest('[data-crear]'); if (cr) return abrirPorTitulo(cr.dataset.crear);
      const w = t.closest('[data-wiki]'); if (w) { e.preventDefault(); return abrirPorTitulo(w.dataset.wiki); }
      const tg = t.closest('[data-tag]'); if (tg) { e.preventDefault(); filtro = { q: '', tag: tg.dataset.tag.toLowerCase(), carpeta: null, solo: null }; $('#ntBuscar').value = ''; pintarFiltros(); return pintarLista(); }
      const ca = t.closest('[data-carpeta]'); if (ca) { filtro.carpeta = filtro.carpeta === ca.dataset.carpeta ? null : ca.dataset.carpeta; filtro.tag = null; pintarFiltros(); return pintarLista(); }
      const so = t.closest('[data-solo]'); if (so) { filtro = { q: filtro.q, tag: null, carpeta: null, solo: so.dataset.solo || null }; pintarFiltros(); return pintarLista(); }
      const cb = t.closest('#ntVista input[type=checkbox][data-linea]');
      if (cb) {
        const n = D.notas[D.abierta]; const L = n.cuerpo.split('\n'); const k = Number(cb.dataset.linea);
        L[k] = L[k].replace(/\[([ xX])\]/, (_, x) => (x === ' ' ? '[x]' : '[ ]'));
        n.cuerpo = L.join('\n'); ta.value = n.cuerpo; tocar(n);
      }
    });
    $('#ntBuscar').addEventListener('input', (e) => { filtro.q = e.target.value; pintarLista(); });
    $('#ntNueva').addEventListener('click', () => { const n = DB.nueva({ titulo: 'Nota nueva', carpeta: filtro.carpeta || '', cuerpo: '# Nota nueva\n\n' }); abrir(n.id); setTimeout(() => { const i = $('#ntTitulo'); i.focus(); i.select(); }, 0); });
    $('#ntDiaria').addEventListener('click', () => { const t = 'Diario ' + hoy(); const d = DB.porTitulo(t); abrir(d ? d.id : DB.nueva({ titulo: t, carpeta: 'Diario', cuerpo: PLANTILLAS['Diario de estudio']() }).id); });
    $('#ntPlantilla').addEventListener('change', (e) => {
      const p = e.target.value; if (!p) return; e.target.value = '';
      const cuerpo = PLANTILLAS[p](); const titulo = (cuerpo.match(/^#\s+(.*)$/m) || [])[1] || p;
      abrir(DB.nueva({ titulo: titulo.trim() || p, carpeta: filtro.carpeta || '', cuerpo }).id);
    });

    // --------------------------------------------------- exportar / importar
    const nombreArchivo = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'nota';
    function descargar(nombre, contenido, tipo) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([contenido], { type: tipo + ';charset=utf-8' }));
      a.download = nombre; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    $('#ntExportar').addEventListener('click', () => {
      const op = prompt('Exportar todas las notas:\n1 = respaldo completo (.json, para volver a importar)\n2 = un solo archivo Markdown (.md)', '1');
      if (op === '1') descargar(`mis-notas-${hoy()}.json`, JSON.stringify({ formato: 'academia-notas', version: 1, notas: DB.lista() }, null, 2), 'application/json');
      if (op === '2') descargar(`mis-notas-${hoy()}.md`, DB.lista().map((n) => `<!-- nota: ${n.titulo} | carpeta: ${n.carpeta || ''} -->\n${n.cuerpo.trim()}\n`).join('\n---\n\n'), 'text/markdown');
    });
    $('#ntImportar').addEventListener('change', async (e) => {
      let k = 0;
      for (const f of e.target.files) {
        const txt = await f.text();
        if (f.name.endsWith('.json')) {
          try {
            const j = JSON.parse(txt);
            for (const n of j.notas || []) { if (!n || typeof n.cuerpo !== 'string') continue; const id = D.notas[n.id] ? uid() : (n.id || uid()); D.notas[id] = Object.assign({ carpeta: '', fijada: false, creada: Date.now() }, n, { id, editada: n.editada || Date.now() }); k++; }
          } catch (err) { toast('⚠ ' + f.name + ' no es un respaldo válido'); }
        } else { DB.nueva({ titulo: (txt.match(/^#\s+(.*)$/m) || [])[1] || f.name.replace(/\.\w+$/, ''), carpeta: 'Importadas', cuerpo: txt }); k++; }
      }
      DB.save(); e.target.value = '';
      toast(`${k} nota${k === 1 ? '' : 's'} importada${k === 1 ? '' : 's'}`); pintarFiltros(); pintarLista();
    });

    // --------------------------------------------------- grafo de enlaces
    $('#ntGrafo').addEventListener('click', () => {
      const ns = DB.lista(); const idx = Object.fromEntries(ns.map((n, i) => [n.titulo.trim().toLowerCase(), i]));
      const aristas = []; ns.forEach((n, i) => enlacesDe(n).forEach((t) => { const j = idx[t.toLowerCase()]; if (j !== undefined && j !== i) aristas.push([i, j]); }));
      const W = 760, H = 480; const P = ns.map((_, i) => ({ x: W / 2 + Math.cos(i * 2.4) * 160 * Math.sqrt((i + 1) / ns.length), y: H / 2 + Math.sin(i * 2.4) * 140 * Math.sqrt((i + 1) / ns.length), vx: 0, vy: 0 }));
      for (let it = 0; it < 260; it++) {
        for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) { const dx = P[a].x - P[b].x, dy = P[a].y - P[b].y, d2 = dx * dx + dy * dy + 0.01, f = 2600 / d2; P[a].vx += dx * f / 60; P[a].vy += dy * f / 60; P[b].vx -= dx * f / 60; P[b].vy -= dy * f / 60; }
        for (const [a, b] of aristas) { const dx = P[b].x - P[a].x, dy = P[b].y - P[a].y; P[a].vx += dx * 0.012; P[a].vy += dy * 0.012; P[b].vx -= dx * 0.012; P[b].vy -= dy * 0.012; }
        for (const p of P) { p.vx += (W / 2 - p.x) * 0.004; p.vy += (H / 2 - p.y) * 0.004; p.x = Math.max(30, Math.min(W - 30, p.x + p.vx)); p.y = Math.max(24, Math.min(H - 24, p.y + p.vy)); p.vx *= 0.6; p.vy *= 0.6; }
      }
      const grado = ns.map((_, i) => aristas.filter(([a, b]) => a === i || b === i).length);
      $('#ntMain').innerHTML = `<div class="nt-cab"><b>🕸 Grafo de notas</b><span class="small muted">${ns.length} notas · ${aristas.length} enlaces · clic en un nodo para abrirlo</span><span class="spacer"></span><button class="btn btn-sm" id="ntVolver">← Volver a la nota</button></div>
        <svg class="nt-grafo" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafo de enlaces entre notas">
          ${aristas.map(([a, b]) => `<line x1="${P[a].x}" y1="${P[a].y}" x2="${P[b].x}" y2="${P[b].y}"/>`).join('')}
          ${ns.map((n, i) => `<g class="nt-nodo ${n.id === D.abierta ? 'act' : ''}" data-id="${n.id}" tabindex="0"><circle cx="${P[i].x}" cy="${P[i].y}" r="${6 + Math.min(10, grado[i] * 2)}"/><text x="${P[i].x}" y="${P[i].y - 12 - Math.min(10, grado[i] * 2)}" text-anchor="middle">${esc(n.titulo.length > 28 ? n.titulo.slice(0, 27) + '…' : n.titulo)}</text></g>`).join('')}
        </svg>`;
      $('#ntVolver').addEventListener('click', () => abrir(D.abierta));
      $('#ntMain').querySelectorAll('.nt-nodo').forEach((g) => { g.addEventListener('click', () => abrir(g.dataset.id)); g.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrir(g.dataset.id); }); });
    });

    const atajo = (e) => {
      if (!document.body.contains(main.querySelector('#notas'))) return document.removeEventListener('keydown', atajo);
      if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); $('#ntNueva').click(); }
    };
    document.addEventListener('keydown', atajo);
    pintarFiltros();
    if (D.abierta) abrir(D.abierta);
  }

  window.Notas = { vista, render, DB, contar: () => DB.lista().length };
})();
