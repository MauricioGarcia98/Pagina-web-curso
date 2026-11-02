/* Power BI de práctica: objetos visuales de IA (learn.microsoft.com/power-bi/visuals):
 *  - Preguntas y respuestas (Q&A): escribes "ventas por categoría" y arma el gráfico; se puede convertir en visual estándar.
 *  - Árbol de descomposición: abre una medida por los campos que elijas, nivel por nivel (o por "valor alto/bajo").
 *  - Influenciadores clave: qué valores de cada campo hacen que la medida suba más que el promedio.
 *  - Narración inteligente: un resumen en texto de lo que muestran los objetos visuales de la página.
 * Es una versión simplificada (sin aprendizaje automático): las reglas se explican en la ayuda de cada uno. */
(function () {
  'use strict';
  const I = () => window.PowerBI._i;
  const V = () => window.PBIVis;
  const S = () => I().S();
  const fl = (n) => I().fl(n);
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const TIPOS_IA = new Set(['qa', 'arbol', 'influencias', 'narrativa']);
  const sinTilde = (x) => String(x ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const fmt = (n, f) => V().fmtNum(n, { formato: f });
  const valorDe = (f) => (f.medida ? { medida: f.medida } : { t: f.t, c: f.c, agg: f.agg && f.agg !== 'none' ? f.agg : 'sum' });

  // ---------------------------------------------------------------- cinta Insertar
  const BOTON = (acc, ico, txt) => `<button class="pb-cb grande" data-acc="${acc}"><span class="pb-cb-ic">${fl(ico)}</span><span>${txt}</span></button>`;
  const cintaInsertar = () => `<div class="pb-grupo">${BOTON('ia-qa', 'chat_help', 'Preguntas y<br>respuestas') + BOTON('ia-narrativa', 'slide_text', 'Narración<br>inteligente') + BOTON('ia-arbol', 'branch_fork', 'Árbol de<br>descomposición') + BOTON('ia-influencias', 'sparkle', 'Influenciadores<br>clave')}<div class="pb-grupo-n">Objetos visuales de IA</div></div>`;
  function accion(a) {
    if (!a.startsWith('ia-')) return false;
    if (!I().tablas().length) { I().toast('Primero obtén datos.'); return true; }
    const tipo = a.slice(3); I().agregarVisual(tipo, { w: tipo === 'narrativa' ? 30 : 45, h: tipo === 'narrativa' ? 25 : 45 }); return true;
  }

  // ---------------------------------------------------------------- dibujo
  function dibujar(v, cuerpo, el) {
    try {
      if (v.tipo === 'qa') return dibujarQa(v, cuerpo, el);
      if (v.tipo === 'arbol') return dibujarArbol(v, cuerpo, el);
      if (v.tipo === 'influencias') return dibujarInfluencias(v, cuerpo);
      if (v.tipo === 'narrativa') return dibujarNarrativa(v, cuerpo);
    } catch (e) { cuerpo.innerHTML = `<div class="pb-v-error"><b>No se puede mostrar este objeto visual.</b><br>${esc(e.message)}</div>`; }
  }

  // ---- Q&A
  function camposModelo() {
    const out = []; const clave = (c) => /(key|_id|^id)$/i.test(c);
    for (const t of I().tablas()) for (const c of I().meta(t)) if (!(I().propsDe(I().propKey(t, c.n)).oculto) && !clave(c.n)) out.push({ t, c: c.n, num: I().esNum(t, c.n), n: sinTilde(c.n).replace(/[_-]/g, ' ') });
    for (const m of S().medidas) out.push({ medida: m.nombre, num: true, n: sinTilde(m.nombre).replace(/[_-]/g, ' ') });
    return out;
  }
  // busca en la pregunta un número (medida o columna numérica) y una categoría, en cualquier orden
  function interpretar(pregunta) {
    const q = ' ' + sinTilde(pregunta).replace(/[¿?¡!.,]/g, ' ').replace(/[_-]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const pos = (x) => { for (const v of [x.n, x.n + 's', x.n.replace(/s$/, ''), x.n.replace(/es$/, '')]) { const i = q.indexOf(' ' + v + ' '); if (i >= 0) return i; } return x.n.length > 4 ? q.indexOf(x.n) : -1; };
    const hallados = camposModelo().map((x) => ({ x, i: pos(x) })).filter((h) => h.i >= 0).sort((a, b) => b.x.n.length - a.x.n.length);
    const usados = []; const sin = hallados.filter((h) => { if (usados.some((u) => h.i >= u[0] && h.i < u[1])) return false; usados.push([h.i, h.i + h.x.n.length + 1]); return true; });
    const valor = (sin.find((h) => h.x.medida) || sin.find((h) => h.x.num) || {}).x;
    const cat = (sin.filter((h) => !h.x.num && !h.x.medida).sort((a, b) => a.i - b.i)[0] || {}).x;
    const agg = /promedio|media|average/.test(q) ? 'avg' : /cuant|numero de|cantidad de|count/.test(q) ? 'count' : /maximo|max /.test(q) ? 'max' : /minimo|min /.test(q) ? 'min' : 'sum';
    const top = (q.match(/(?:top|mejores|primeros|principales)\s+(\d+)/) || [])[1];
    const tipo = /linea|evolucion|tendencia|por mes|por ano|por fecha/.test(q) ? 'linea' : /torta|circular|porcentaje|participacion/.test(q) ? 'anillo' : /mapa/.test(q) ? 'mapa' : /tabla|lista/.test(q) ? 'tabla' : cat ? 'barAgrupada' : 'tarjeta';
    return { valor, cat, agg, top: top ? Number(top) : null, tipo };
  }
  function visualDesde(r) {
    const val = r.valor.medida ? { medida: r.valor.medida } : { t: r.valor.t, c: r.valor.c, agg: r.agg };
    if (!r.cat || r.tipo === 'tarjeta') return { tipo: 'tarjeta', pozos: { valores: [val] } };
    const cat = { t: r.cat.t, c: r.cat.c };
    if (r.tipo === 'tabla') return { tipo: 'tabla', pozos: { cols: [{ ...cat, agg: 'none' }, val] } };
    return { tipo: r.tipo, pozos: { x: [cat], y: [val] } };
  }
  function dibujarQa(v, cuerpo, el) {
    const sug = (() => { const c = camposModelo(); const num = c.find((x) => x.num && !x.medida) || c.find((x) => x.medida), cat = c.find((x) => !x.num && !x.medida); return num && cat ? [`${num.medida || num.c} por ${cat.c}`, `top 5 ${cat.c} por ${num.medida || num.c}`, `promedio de ${num.medida || num.c}`] : []; })();
    cuerpo.innerHTML = `<div class="pb-qa"><div class="pb-qa-in">${fl('chat_help')}<input data-qa placeholder="Haz una pregunta sobre tus datos" value="${esc(v.pregunta || '')}"></div>${v.pregunta ? '' : `<div class="pb-qa-sug">Prueba con: ${sug.map((x) => `<button data-qa-sug="${esc(x)}">${esc(x)}</button>`).join('')}</div>`}<div class="pb-qa-res"></div></div>`;
    const inp = cuerpo.querySelector('[data-qa]');
    const responder = (texto) => { v.pregunta = texto; I().guardar(); I().render(); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') responder(inp.value.trim()); e.stopPropagation(); });
    inp.addEventListener('pointerdown', (e) => e.stopPropagation());
    cuerpo.querySelectorAll('[data-qa-sug]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.stopPropagation(); responder(b.dataset.qaSug); }));
    if (!v.pregunta) return;
    const r = interpretar(v.pregunta), res = cuerpo.querySelector('.pb-qa-res');
    if (!r.valor) { res.innerHTML = `<p class="pb-qa-nada">No encontré un número o una medida en la pregunta. Usa el nombre de una columna numérica o de una medida, por ejemplo: <i>${esc(sug[0] || 'ventas por país')}</i>.</p>`; return; }
    const pv = { id: v.id + '_qa', ...visualDesde(r), filtros: [], formato: { titulo: { mostrar: false } } };
    if (r.top && pv.pozos.x) pv.filtros.push({ campo: pv.pozos.x[0], tipo: 'topn', topn: { n: r.top, por: pv.pozos.y[0], dir: 'Superior' } });
    const d = I().datosVisual(pv);
    res.innerHTML = `<div class="pb-qa-int">${fl('sparkle')} Mostrando <b>${esc(I().nomCampo(pv.pozos.valores ? pv.pozos.valores[0] : pv.pozos.y ? pv.pozos.y[0] : pv.pozos.cols[1]))}</b>${pv.pozos.x ? ` por <b>${esc(I().nomCampo(pv.pozos.x[0]))}</b>` : ''}${r.top ? ` (${r.top} superiores)` : ''} · <button data-qa-conv>Convertir en objeto visual estándar</button></div><div class="pb-qa-g"></div>`;
    const g = res.querySelector('.pb-qa-g');
    requestAnimationFrame(() => { if (!d) { g.textContent = 'Sin datos'; return; } V().dibujar(pv, g, d, { paleta: I().paleta(), ancho: el.clientWidth - 20, alto: Math.max(80, el.clientHeight - 110), sel: () => false, aten: () => false, nom: I().nomCampo }); });
    res.querySelector('[data-qa-conv]').addEventListener('pointerdown', (e) => { e.stopPropagation(); v.tipo = pv.tipo; v.pozos = pv.pozos; v.filtros = pv.filtros; delete v.pregunta; I().guardar(); I().render(); I().toast('Ahora es un objeto visual normal: cambia sus campos en el panel Visualizaciones.'); });
  }

  // ---- Árbol de descomposición
  function dibujarArbol(v, cuerpo) {
    const y = v.pozos.y && v.pozos.y[0], xs = v.pozos.x || [];
    if (!y) { cuerpo.innerHTML = '<div class="pb-v-vacio">Árbol de descomposición<br><small>Pon una medida en <b>Analizar</b> y uno o más campos en <b>Explicar por</b>.</small></div>'; return; }
    const base = I().filtrosDe(v); const val = valorDe(y), formato = null;
    const total = (I().consultar([], [val], base).filas[0] || [])[0];
    v.arbolNiv = (v.arbolNiv || []).filter((n) => xs.some((x) => x.t === n.campo.t && x.c === n.campo.c));
    const cols = [`<div class="pb-ar-col"><div class="pb-ar-t">${esc(I().nomCampo(y))}</div><div class="pb-ar-n sel"><span>Total</span><b>${esc(fmt(total, formato))}</b><i style="width:100%"></i></div>${v.arbolNiv.length < xs.length ? `<button class="pb-ar-mas" data-ar-mas="0" title="Expandir por…">+</button>` : ''}</div>`];
    let filtros = base.slice();
    v.arbolNiv.forEach((n, k) => {
      const r = I().consultar([n.campo], [val], filtros); const filas = r.filas.filter((f) => f[1] != null).sort((a, b) => b[1] - a[1]).slice(0, 12); const mx = Math.max(...filas.map((f) => Math.abs(f[1])), 1);
      cols.push(`<div class="pb-ar-col"><div class="pb-ar-t">${esc(I().nomCampo(n.campo))}${n.ia ? ` <small>(${n.ia})</small>` : ''}<button data-ar-quitar="${k}" title="Quitar este nivel">✕</button></div>${filas.map((f) => `<div class="pb-ar-n ${String(n.sel) === String(f[0]) ? 'sel' : ''}" data-ar-sel="${k}" data-val="${esc(f[0])}"><span>${esc(f[0] ?? '(En blanco)')}</span><b>${esc(fmt(f[1], formato))}</b><i style="width:${(Math.abs(f[1]) / mx) * 100}%"></i></div>`).join('')}${n.sel != null && k === v.arbolNiv.length - 1 && v.arbolNiv.length < xs.length ? `<button class="pb-ar-mas" data-ar-mas="${k + 1}" title="Expandir por…">+</button>` : ''}</div>`);
      if (n.sel != null) filtros = filtros.concat({ campo: n.campo, valores: [n.sel] });
    });
    cuerpo.innerHTML = `<div class="pb-dtree">${cols.join('')}</div>`;
    cuerpo.querySelectorAll('[data-ar-mas]').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); const usados = v.arbolNiv.map((n) => n.campo.c + '|' + n.campo.t); const libres = xs.filter((x) => !usados.includes(x.c + '|' + x.t));
      const r = b.getBoundingClientRect(); const m = document.createElement('div'); m.className = 'pq-menu pb-menu-x'; m.style.left = r.right + 'px'; m.style.top = r.top + 'px';
      m.innerHTML = `<div class="pq-menu-sub">Divisiones de IA</div><div data-x="alto">${fl('sparkle')} Valor alto</div><div data-x="bajo">${fl('sparkle')} Valor bajo</div><hr>${libres.map((x, i) => `<div data-x="c${i}">${esc(I().nomCampo(x))}</div>`).join('')}`;
      document.body.appendChild(m); setTimeout(() => document.addEventListener('mousedown', function f(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('mousedown', f); } }), 0);
      m.addEventListener('click', (ev) => {
        const o = ev.target.closest('[data-x]'); if (!o) return; m.remove(); const k = o.dataset.x; let campo, ia = '';
        if (k === 'alto' || k === 'bajo') { let mejor = null; const fl0 = filtrosHasta(v, base, val); for (const x of libres) { const fs = I().consultar([x], [val], fl0).filas.map((f) => f[1]).filter((z) => z != null); if (!fs.length) continue; const s = k === 'alto' ? Math.max(...fs) : Math.min(...fs); if (!mejor || (k === 'alto' ? s > mejor.s : s < mejor.s)) mejor = { x, s }; } if (!mejor) return; campo = mejor.x; ia = k === 'alto' ? 'valor alto' : 'valor bajo'; }
        else campo = libres[Number(k.slice(1))];
        v.arbolNiv.push({ campo: { t: campo.t, c: campo.c }, sel: null, ia }); I().guardar(); I().render();
      });
    }));
    cuerpo.querySelectorAll('[data-ar-sel]').forEach((x) => x.addEventListener('pointerdown', (e) => { e.stopPropagation(); const k = Number(x.dataset.arSel); const n = v.arbolNiv[k]; const raw = x.dataset.val; const val0 = !isNaN(Number(raw)) && raw !== '' && I().esNum(n.campo.t, n.campo.c) ? Number(raw) : raw; n.sel = String(n.sel) === String(val0) ? null : val0; v.arbolNiv = v.arbolNiv.slice(0, k + 1); I().guardar(); I().render(); }));
    cuerpo.querySelectorAll('[data-ar-quitar]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.stopPropagation(); v.arbolNiv = v.arbolNiv.slice(0, Number(b.dataset.arQuitar)); I().guardar(); I().render(); }));
  }
  function filtrosHasta(v, base) { let f = base.slice(); for (const n of v.arbolNiv) if (n.sel != null) f = f.concat({ campo: n.campo, valores: [n.sel] }); return f; }

  // ---- Influenciadores clave (simplificado: promedio por fila de cada valor contra el promedio del resto)
  function dibujarInfluencias(v, cuerpo) {
    const y = v.pozos.y && v.pozos.y[0], xs = v.pozos.x || [];
    if (!y || !xs.length) { cuerpo.innerHTML = '<div class="pb-v-vacio">Influenciadores clave<br><small>Pon una columna numérica en <b>Analizar</b> y campos en <b>Explicar por</b>.</small></div>'; return; }
    if (y.medida) { cuerpo.innerHTML = '<div class="pb-v-vacio">En esta práctica, "Analizar" necesita una columna numérica (no una medida): se compara su promedio por fila.</div>'; return; }
    const filtros = I().filtrosDe(v), suma = { t: y.t, c: y.c, agg: 'sum' }, cuenta = { t: y.t, c: y.c, agg: 'count' };
    const tot = I().consultar([], [suma, cuenta], filtros).filas[0] || [0, 0]; const promTot = tot[1] ? tot[0] / tot[1] : 0;
    const res = [];
    for (const x of xs) {
      const filas = I().consultar([x], [suma, cuenta], filtros).filas.filter((f) => f[2] >= 3);
      for (const f of filas) { const restoN = tot[1] - f[2]; if (restoN < 3) continue; const prom = f[1] / f[2], promResto = (tot[0] - f[1]) / restoN; if (promResto > 0 && prom > promResto) res.push({ campo: x, valor: f[0], prom, promResto, factor: prom / promResto, n: f[2] }); }
    }
    res.sort((a, b) => b.factor - a.factor); const top = res.slice(0, 6); const sel = top[Math.min(v.inflSel || 0, Math.max(0, top.length - 1))];
    const nom = I().nomCampo({ t: y.t, c: y.c });
    cuerpo.innerHTML = `<div class="pb-infl"><div class="pb-infl-l"><div class="pb-ar-t">¿Qué hace que ${esc(nom)} sea más alto?</div>${top.map((r, i) => `<div class="pb-infl-i ${r === sel ? 'sel' : ''}" data-infl="${i}"><span>Cuando <b>${esc(I().nomCampo(r.campo))}</b> es <b>${esc(r.valor ?? '(En blanco)')}</b></span><b class="pb-infl-x">${r.factor.toFixed(2)}x</b></div>`).join('') || '<p class="pb-dim">No hay valores que suban el promedio de forma clara.</p>'}</div>
      ${sel ? `<div class="pb-infl-r"><p>El promedio de ${esc(nom)} es <b>${esc(fmt(sel.prom))}</b> cuando ${esc(I().nomCampo(sel.campo))} es ${esc(sel.valor)}, y <b>${esc(fmt(sel.promResto))}</b> en el resto: <b>${sel.factor.toFixed(2)} veces</b> más.</p><div class="pb-infl-b"><div><i style="height:${(sel.prom / Math.max(sel.prom, sel.promResto)) * 100}%"></i><span>${esc(sel.valor)}</span></div><div><i class="resto" style="height:${(sel.promResto / Math.max(sel.prom, sel.promResto)) * 100}%"></i><span>Resto</span></div></div><p class="pb-dim small">${sel.n} filas · Promedio general: ${esc(fmt(promTot))}. Power BI usa regresión logística o lineal; aquí se compara el promedio, que es la misma idea.</p></div>` : ''}</div>`;
    cuerpo.querySelectorAll('[data-infl]').forEach((x) => x.addEventListener('pointerdown', (e) => { e.stopPropagation(); v.inflSel = Number(x.dataset.infl); I().guardar(); I().render(); }));
  }

  // ---- Narración inteligente
  function dibujarNarrativa(v, cuerpo) {
    const frases = [];
    for (const o of I().pag().visuales) {
      if (o === v || TIPOS_IA.has(o.tipo) || ['texto', 'forma', 'boton', 'navPaginas', 'segmentacion'].includes(o.tipo)) continue;
      let d; try { d = I().datosVisual(o); } catch (e) { continue; } if (!d) continue;
      if (d.valor != null && d.nombre) frases.push(`<b>${esc(d.nombre)}</b> suma <b>${esc(fmt(d.valor, d.formato))}</b>.`);
      if (d.cats && d.series && d.series[0] && d.cats.length > 1) {
        const s = d.series[0]; const pares = d.cats.map((c) => [c, s.vals[c]]).filter((p) => typeof p[1] === 'number'); if (!pares.length) continue;
        const tot = pares.reduce((a, p) => a + p[1], 0); const mx = pares.reduce((a, p) => (p[1] > a[1] ? p : a)), mn = pares.reduce((a, p) => (p[1] < a[1] ? p : a));
        const tiempo = /fecha|date|mes|month|año|anio|year|trimestre|quarter|dia|day/i.test(d.nx);
        if (tiempo) { const [p0, p1] = [pares[0], pares[pares.length - 1]]; const cambio = p0[1] ? (p1[1] - p0[1]) / Math.abs(p0[1]) : null; frases.push(`<b>${esc(s.nombre)}</b> ${cambio == null ? 'cambió' : cambio >= 0 ? `subió un <b>${(cambio * 100).toFixed(1)} %</b>` : `bajó un <b>${(-cambio * 100).toFixed(1)} %</b>`} entre <b>${esc(p0[0])}</b> y <b>${esc(p1[0])}</b>; el pico fue <b>${esc(mx[0])}</b> (${esc(fmt(mx[1], s.formato))}).`); }
        else frases.push(`<b>${esc(mx[0])}</b> tiene el valor más alto de <b>${esc(s.nombre)}</b> (${esc(fmt(mx[1], s.formato))}, el ${tot ? ((mx[1] / tot) * 100).toFixed(1) : '0'} % del total), y <b>${esc(mn[0])}</b> el más bajo (${esc(fmt(mn[1], s.formato))}). En total hay ${pares.length} valores de ${esc(d.nx)}.`);
      }
    }
    cuerpo.innerHTML = `<div class="pb-narr">${frases.length ? frases.map((f) => `<p>${f}</p>`).join('') : '<p class="pb-dim">Agrega gráficos o tarjetas a la página: la narración resume lo que muestran y se actualiza cuando filtras.</p>'}<small>${fl('sparkle')} Narración inteligente · se recalcula con cada filtro</small></div>`;
  }

  window.PBIIa = { dibuja: (v) => TIPOS_IA.has(v.tipo), dibujar, cintaInsertar, accion, _: { interpretar } };
})();
