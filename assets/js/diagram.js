/* Diagramas con estilo dibujado a mano (rough.js, la librería de trazo de Excalidraw).
 * El build convierte cada bloque ```diagrama en <figure class="diagrama" data-spec="{…}">.
 * Este archivo los dibuja como SVG: nodos con ícono (Lucide, logos de Simple Icons o siglas propias),
 * grupos, flechas con codos que esquivan los nodos, animación del flujo, modo paso a paso,
 * resaltado al pasar el mouse y descarga en PNG o SVG.
 * El trazo usa currentColor, así funciona en tema claro y oscuro. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const LIB = window.ICONOS_LIB || { lucide: {}, trazos: {}, alias: {}, marcas: {}, siglas: {} };

  // Paleta de Excalidraw (Open Color): [trazo, relleno, tono medio para los dibujos]
  const COLORES = {
    azul: ['#1971c2', '#d0ebff', '#74c0fc'], verde: ['#2f9e44', '#d3f9d8', '#69db7c'], naranja: ['#e8590c', '#ffe8cc', '#ffa94d'],
    rojo: ['#e03131', '#ffe3e3', '#ff8787'], violeta: ['#6741d9', '#e5dbff', '#b197fc'], amarillo: ['#f08c00', '#fff3bf', '#ffd43b'],
    gris: ['#868e96', '#f1f3f5', '#ced4da'], cian: ['#0c8599', '#c5f6fa', '#66d9e8'], rosa: ['#c2255c', '#ffdeeb', '#f783ac']
  };
  const DIB = window.Dibujos || { tiene: () => false };

  const CELDA_W = 250, CELDA_H = 195, NODO_W = 176, NODO_H = 112, MARGEN = 30, ICONO = 36;
  const FUENTE = "'Shantell Sans', 'Kalam', 'Segoe Print', 'Comic Sans MS', cursive";
  const SANS = "Inter, system-ui, sans-serif";

  const luminancia = (hex) => {
    const n = parseInt(hex.replace('#', ''), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };

  // ---------------------------------------------------------------- ubicación en la grilla
  // Si un nodo no tiene col/fila, se ubica por capas: col = largo del camino más largo desde una raíz
  function ubicar(spec) {
    const nodos = spec.nodos;
    const porId = Object.fromEntries(nodos.map((n) => [n.id, n]));
    const sinPos = nodos.filter((n) => n.col === undefined || n.fila === undefined);
    if (sinPos.length) {
      const nivel = {};
      const entrantes = (id) => spec.flechas.filter((f) => f.a === id && f.de !== id).map((f) => f.de);
      const calc = (id, visto = new Set()) => {
        if (nivel[id] !== undefined) return nivel[id];
        if (visto.has(id)) return 0;
        visto.add(id);
        const ps = entrantes(id);
        nivel[id] = ps.length ? Math.max(...ps.map((p) => calc(p, visto) + 1)) : 0;
        return nivel[id];
      };
      const ocupadas = {};
      nodos.forEach((n) => { if (n.col !== undefined && n.fila !== undefined) ocupadas[n.col + ',' + n.fila] = 1; });
      for (const n of sinPos) {
        const c = n.col !== undefined ? n.col : calc(n.id);
        let f = n.fila !== undefined ? n.fila : 0;
        while (ocupadas[c + ',' + f]) f++;
        ocupadas[c + ',' + f] = 1;
        n.col = c; n.fila = f;
      }
    }
    let vertical = spec.direccion === 'abajo';
    // En pantallas angostas (teléfonos), un diagrama más ancho que alto se dibuja traspuesto: el flujo va de
    // arriba hacia abajo y entra en el ancho de la pantalla, en lugar de quedar cortado y obligar a deslizar.
    // En pantallas anchas pasa lo mismo con las cuadrículas (2+ filas) que no entran en la columna de la lección
    // y que traspuestas sí entran; las tuberías de una sola fila se quedan horizontales.
    {
      const cols = Math.max(...nodos.map((n) => n.col)) + 1, filas = Math.max(...nodos.map((n) => n.fila)) + 1;
      const ancho = vertical ? filas : cols, alto = vertical ? cols : filas;
      const disponible = spec._ancho || 9999, estimado = (k) => k * CELDA_W + 2 * MARGEN;
      // en escritorio: si achicándolo hasta ~55% entra, se achica (ver más abajo); si no, se traspone
      const traspone = spec._estrecho
        ? ancho > 2 && ancho > alto
        : ancho > alto && estimado(ancho) * 0.72 > disponible && estimado(alto) * 0.72 <= disponible &&
          (alto >= 2 || estimado(ancho) * 0.55 > disponible);
      if (traspone) { vertical = !vertical; spec._traspuesto = true; }
    }
    for (const n of nodos) {
      const w = n.ancho ? Number(n.ancho) : NODO_W;
      const util = n.forma === 'rombo' || n.forma === 'hexagono' || n.forma === 'circulo' ? w * 0.68 : w;
      n.lineas = envolver(n.label, Math.floor(util / 11.2));
      n.sublineas = n.sub ? envolver(n.sub, Math.floor(util / 8.4)) : [];
      const conIcono = !!resolverIcono(n.icono) || DIB.tiene(n.icono);
      n._dibujo = DIB.tiene(n.icono);
      const extra = n.forma === 'cilindro' ? 14 : n.forma === 'rombo' ? 40 : n.forma === 'documento' ? 10 : n.forma === 'circulo' ? 26 : 0;
      n.w = w; n.h = Math.max(NODO_H, (conIcono ? (n._dibujo ? 70 : 54) : 18) + n.lineas.length * 21 + n.sublineas.length * 17 + 12 + extra);
      n._c = vertical ? n.fila : n.col; n._f = vertical ? n.col : n.fila;
    }
    // alto de cada fila: crece con el nodo más alto, y deja aire extra donde termina un grupo y empieza otro
    const filas = Math.max(...nodos.map((n) => n._f)) + 1;
    const grupoDe = {};
    for (const g of spec.grupos || []) for (const id of g.nodos) grupoDe[id] = g.id;
    const altoFila = Array.from({ length: filas }, (_, f) => Math.max(CELDA_H, ...nodos.filter((n) => n._f === f).map((n) => n.h + 80)));
    // una flecha vertical con etiqueta entre dos filas vecinas agranda ese hueco si la etiqueta no entra
    const extraFila = {};
    for (const fl of spec.flechas || []) {
      const a = porId[fl.de], b = porId[fl.a];
      if (!fl.label || !a || !b || a._c !== b._c || Math.abs(a._f - b._f) !== 1) continue;
      const lineas = envolver(String(fl.label), 16, false).length, f = Math.min(a._f, b._f);
      const hueco = Math.min(...[a, b].map((n) => (altoFila[n._f] - n.h) / 2)) * 2;
      extraFila[f] = Math.max(extraFila[f] || 0, lineas * 18 + 30 - hueco);
    }
    const y0 = [MARGEN + 24];
    for (let f = 1; f < filas; f++) {
      const arriba = new Set(nodos.filter((n) => n._f === f - 1).map((n) => grupoDe[n.id]).filter(Boolean));
      const abajo = new Set(nodos.filter((n) => n._f === f).map((n) => grupoDe[n.id]).filter(Boolean));
      const cambiaGrupo = [...abajo].some((g) => !arriba.has(g)) && arriba.size > 0;
      y0[f] = y0[f - 1] + altoFila[f - 1] + (cambiaGrupo ? 40 : 0) + Math.max(0, extraFila[f - 1] || 0);
    }
    // una flecha horizontal con etiqueta entre dos columnas vecinas ensancha ese hueco lo necesario
    // para que la etiqueta entre en dos líneas sin pisar los nodos
    const extra = {};
    for (const f of spec.flechas || []) {
      const a = porId[f.de], b = porId[f.a];
      if (!f.label || !a || !b || a._f !== b._f || Math.abs(a._c - b._c) !== 1) continue;
      const linea = Math.max(...String(f.label).split('\n').map(largo)) * 9;
      const palabra = Math.max(...String(f.label).split(/\s+/).map(largo)) * 9;   // una palabra no se parte
      const necesario = Math.min(Math.max(palabra, linea > 100 ? linea / 2 + 12 : linea), 200) + 24, c = Math.min(a._c, b._c);
      const hueco = CELDA_W - (a.w + b.w) / 2;
      extra[c] = Math.max(extra[c] || 0, necesario - hueco);
    }
    const corrX = (c) => { let t = 0; for (let k = 0; k < c; k++) t += Math.max(0, extra[k] || 0); return t; };
    for (const n of nodos) {
      n.x = MARGEN + n._c * CELDA_W + corrX(n._c) + (CELDA_W - n.w) / 2;
      n.y = y0[n._f] + (altoFila[n._f] - n.h) / 2;
      n.cx = n.x + n.w / 2; n.cy = n.y + n.h / 2;
    }
    return porId;
  }

  // parte un texto en líneas de hasta `max` caracteres, respetando los \n puestos a mano
  // largo aproximado de un texto en caracteres: las mayúsculas y la W/M ocupan más que una letra común
  const largo = (t) => t.length + 0.3 * (t.match(/[A-ZÁÉÍÓÚÑWM]/g) || []).length;
  function envolver(str, max, partirPalabras = true) {
    const out = [];
    // una palabra más larga que la línea (stg_tienda__pedidos, s3://lago/bronze/, df.groupBy(…)) se parte
    // después de _ / . , ? & = ( : - y, si aun así no entra, en trozos del largo de la línea
    const partir = (p) => {
      if (!partirPalabras || largo(p) <= max) return [p];
      const trozos = p.split(/(?<=[_/.,?&=(:-])/).flatMap((t) => (largo(t) > max ? t.match(new RegExp('.{1,' + Math.max(3, Math.floor(max / 1.3)) + '}', 'g')) : [t]));
      return trozos.reduce((acc, t) => { if (acc.length && largo(acc[acc.length - 1] + t) <= max) acc[acc.length - 1] += t; else acc.push(t); return acc; }, []);
    };
    for (const parrafo of String(str).split('\n')) {
      let linea = '';
      for (const palabra of parrafo.split(' ')) {
        partir(palabra).forEach((t, k) => {
          const sep = k > 0 ? '' : ' ';   // los trozos de una misma palabra van pegados
          if (linea && largo(linea + sep + t) > max) { out.push(linea); linea = t; } else linea = linea ? linea + sep + t : t;
        });
      }
      out.push(linea);
    }
    return out;
  }

  // ---------------------------------------------------------------- rutas de las flechas
  // Cada flecha prueba varias rutas ortogonales (recta, en L, en Z por el hueco entre filas o
  // columnas, o rodeando) y se queda con la que no atraviesa otros nodos, con menos codos y más corta.
  const HUECO_X = (CELDA_W - NODO_W) / 2, HUECO_Y = 34;
  const puerto = (n, lado) => ({ r: { x: n.x + n.w + 4, y: n.cy }, l: { x: n.x - 4, y: n.cy }, t: { x: n.cx, y: n.y - 4 }, b: { x: n.cx, y: n.y + n.h + 4 } }[lado]);

  function candidatas(a, b) {
    const rutas = [];
    const h = b.cx >= a.cx ? 'r' : 'l', hb = h === 'r' ? 'l' : 'r';
    const v = b.cy >= a.cy ? 'b' : 't', vb = v === 'b' ? 't' : 'b';
    const solapaY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y), solapaX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    if (solapaY > 24) { const y = (Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2; rutas.push([{ ...puerto(a, h), y }, { ...puerto(b, hb), y }]); }
    if (solapaX > 24) { const x = (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2; rutas.push([{ ...puerto(a, v), x }, { ...puerto(b, vb), x }]); }
    // en Z horizontal: sale por el costado, baja o sube por un hueco entre columnas y entra por el costado
    const pa = puerto(a, h), pb = puerto(b, hb);
    for (const xm of [h === 'r' ? a.x + a.w + HUECO_X : a.x - HUECO_X, h === 'r' ? b.x - HUECO_X : b.x + b.w + HUECO_X, (pa.x + pb.x) / 2]) {
      if ((xm - pa.x) * (pb.x - xm) >= 0) rutas.push([pa, { x: xm, y: pa.y }, { x: xm, y: pb.y }, pb]);
    }
    // en Z vertical: sale por arriba o abajo, cruza por un hueco entre filas y entra por arriba o abajo
    const qa = puerto(a, v), qb = puerto(b, vb);
    for (const ym of [v === 'b' ? a.y + a.h + HUECO_Y : a.y - HUECO_Y, v === 'b' ? b.y - HUECO_Y : b.y + b.h + HUECO_Y, (qa.y + qb.y) / 2]) {
      if ((ym - qa.y) * (qb.y - ym) >= 0) rutas.push([qa, { x: qa.x, y: ym }, { x: qb.x, y: ym }, qb]);
    }
    // en L
    if ((b.cx - pa.x) * (h === 'r' ? 1 : -1) > 20 && (b.cy < a.y || b.cy > a.y + a.h)) rutas.push([pa, { x: b.cx, y: pa.y }, puerto(b, v === 'b' ? 't' : 'b')]);
    if ((b.cy - qa.y) * (v === 'b' ? 1 : -1) > 20 && (b.cx < a.x || b.cx > a.x + a.w)) rutas.push([qa, { x: qa.x, y: b.cy }, puerto(b, h === 'r' ? 'l' : 'r')]);
    // rodeando por un costado, por arriba o por abajo
    const xr = Math.max(a.x + a.w, b.x + b.w) + HUECO_X, xl = Math.min(a.x, b.x) - HUECO_X;
    rutas.push([puerto(a, 'r'), { x: xr, y: a.cy }, { x: xr, y: b.cy }, puerto(b, 'r')]);
    rutas.push([puerto(a, 'l'), { x: xl, y: a.cy }, { x: xl, y: b.cy }, puerto(b, 'l')]);
    const yt = Math.min(a.y, b.y) - HUECO_Y, yb = Math.max(a.y + a.h, b.y + b.h) + HUECO_Y;
    rutas.push([puerto(a, 't'), { x: a.cx, y: yt }, { x: b.cx, y: yt }, puerto(b, 't')]);
    rutas.push([puerto(a, 'b'), { x: a.cx, y: yb }, { x: b.cx, y: yb }, puerto(b, 'b')]);
    return rutas;
  }

  const cortaRect = (p, q, r) => {
    const m = 8, x0 = r.x - m, x1 = r.x + r.w + m, y0 = r.y - m, y1 = r.y + r.h + m;
    if (Math.abs(p.y - q.y) < 0.5) return p.y > y0 && p.y < y1 && Math.max(p.x, q.x) > x0 && Math.min(p.x, q.x) < x1;
    return p.x > x0 && p.x < x1 && Math.max(p.y, q.y) > y0 && Math.min(p.y, q.y) < y1;
  };

  function elegirRuta(a, b, nodos, usados) {
    let mejor = null, puntaje = Infinity;
    for (const r of candidatas(a, b)) {
      let s = 0, largo = 0;
      for (let i = 0; i < r.length - 1; i++) {
        const p = r[i], q = r[i + 1];
        largo += Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
        for (const n of nodos) {
          const extremo = (n === a && i === 0) || (n === b && i === r.length - 2);
          if (!extremo && cortaRect(p, q, n)) s += 1000;
        }
        // tramos que se superponen con otras flechas ya dibujadas
        for (const [u, w] of usados) {
          const hz = Math.abs(p.y - q.y) < 0.5 && Math.abs(u.y - w.y) < 0.5 && Math.abs(p.y - u.y) < 6;
          const vt = Math.abs(p.x - q.x) < 0.5 && Math.abs(u.x - w.x) < 0.5 && Math.abs(p.x - u.x) < 6;
          if (hz && Math.min(Math.max(p.x, q.x), Math.max(u.x, w.x)) - Math.max(Math.min(p.x, q.x), Math.min(u.x, w.x)) > 10) s += 150;
          if (vt && Math.min(Math.max(p.y, q.y), Math.max(u.y, w.y)) - Math.max(Math.min(p.y, q.y), Math.min(u.y, w.y)) > 10) s += 150;
        }
      }
      s += (r.length - 2) * 14 + largo * 0.04;
      if (s < puntaje) { puntaje = s; mejor = r; }
    }
    return mejor;
  }

  // polilínea con esquinas redondeadas
  function trazo(pts, radio = 14) {
    let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i - 1], c = pts[i], n = pts[i + 1];
      const l1 = Math.hypot(c.x - p.x, c.y - p.y), l2 = Math.hypot(n.x - c.x, n.y - c.y);
      const r = Math.min(radio, l1 / 2, l2 / 2);
      const a = { x: c.x - ((c.x - p.x) / l1) * r, y: c.y - ((c.y - p.y) / l1) * r };
      const z = { x: c.x + ((n.x - c.x) / l2) * r, y: c.y + ((n.y - c.y) / l2) * r };
      d += ` L${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${z.x.toFixed(1)} ${z.y.toFixed(1)}`;
    }
    const u = pts[pts.length - 1];
    return d + ` L${u.x.toFixed(1)} ${u.y.toFixed(1)}`;
  }

  // ---------------------------------------------------------------- SVG
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== undefined) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  }

  function texto(g, str, x, y, { size = 15, bold = false, anchor = 'middle', color = 'currentColor', lh = 1.15, fuente = FUENTE } = {}) {
    const lineas = String(str).split('\n');
    const t = el('text', { x, y, 'text-anchor': anchor, 'font-family': fuente, 'font-size': size, 'font-weight': bold ? 700 : 400, fill: color }, g);
    lineas.forEach((l, i) => { const ts = el('tspan', { x, dy: i ? size * lh : 0 }, t); ts.textContent = l; });
    return t;
  }

  // ---------------------------------------------------------------- íconos
  // Orden: logo de marca → sigla propia → "sigla:TEXTO:color" → trazo propio → alias en español → Lucide
  function resolverIcono(nombre) {
    if (!nombre) return null;
    if (LIB.marcas[nombre]) return { tipo: 'marca', ...LIB.marcas[nombre] };
    if (LIB.siglas[nombre]) return { tipo: 'sigla', sigla: LIB.siglas[nombre][0], color: LIB.siglas[nombre][1] };
    const m = /^sigla:([^:]+)(?::(\w+))?$/.exec(nombre);
    if (m) return { tipo: 'sigla', sigla: m[1], color: (COLORES[m[2]] || COLORES.gris)[0] };
    if (LIB.trazos[nombre]) return { tipo: 'trazo', d: LIB.trazos[nombre] };
    const l = LIB.lucide[LIB.alias[nombre] || nombre];
    return l ? { tipo: 'lucide', svg: l } : null;
  }

  // Íconos de línea (Lucide o trazos propios) pasados por rough.js: mismo trazo a mano que el resto del diagrama
  function iconoAMano(g, rc, ic, x, y, s, color, semilla) {
    const k = s / 24, p = el('g', { transform: `translate(${x} ${y}) scale(${k})`, class: 'dg-dibujo' }, g);
    const op = () => ({ seed: semilla++, roughness: 0.45, bowing: 0.5, stroke: color, strokeWidth: 1.9 / k * (s / 30) });
    const at = (str, n) => { const m = new RegExp('\\b' + n + '="([^"]*)"').exec(str); return m ? m[1] : null; };
    const num = (str, n, def = 0) => { const v = at(str, n); return v == null ? def : Number(v); };
    const elementos = ic.tipo === 'trazo' ? [`<path d="${ic.d}"`] : ic.svg.match(/<\w+[^>]*>/g) || [];
    for (const e of elementos) {
      const tag = /<(\w+)/.exec(e)[1];
      let n = null;
      if (tag === 'path') {
        const d = at(e, 'd'), punto = /^M\s*([\d.]+)[ ,]([\d.]+)\s*h\.01$/i.exec(d || '');
        if (punto) n = el('circle', { cx: punto[1], cy: punto[2], r: 1.15, fill: color });
        else if (d) {
          // rough.js no entiende algunos arcos compactos (banderas pegadas): ese trazo va nítido
          try { n = rc.path(d, op()); } catch (err) { n = el('path', { d, fill: 'none', stroke: color, 'stroke-width': 1.9 * (s / 30) / k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); }
        }
      } else if (tag === 'circle') n = rc.circle(num(e, 'cx'), num(e, 'cy'), num(e, 'r') * 2, op());
      else if (tag === 'ellipse') n = rc.ellipse(num(e, 'cx'), num(e, 'cy'), num(e, 'rx') * 2, num(e, 'ry') * 2, op());
      else if (tag === 'line') n = rc.line(num(e, 'x1'), num(e, 'y1'), num(e, 'x2'), num(e, 'y2'), op());
      else if (tag === 'rect') {
        const rx = num(e, 'x'), ry = num(e, 'y'), w = num(e, 'width'), h = num(e, 'height'), r = Math.min(num(e, 'rx'), w / 2, h / 2);
        n = r ? rc.path(`M${rx + r} ${ry} H${rx + w - r} A${r} ${r} 0 0 1 ${rx + w} ${ry + r} V${ry + h - r} A${r} ${r} 0 0 1 ${rx + w - r} ${ry + h} H${rx + r} A${r} ${r} 0 0 1 ${rx} ${ry + h - r} V${ry + r} A${r} ${r} 0 0 1 ${rx + r} ${ry} Z`, op())
          : rc.rectangle(rx, ry, w, h, op());
      } else if (tag === 'polyline' || tag === 'polygon') {
        const nums = (at(e, 'points') || '').trim().split(/[\s,]+/).map(Number), pts = [];
        for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
        n = tag === 'polygon' ? rc.polygon(pts, op()) : rc.linearPath(pts, op());
      }
      if (n) p.appendChild(n);
    }
  }

  function dibujarIcono(g, nombre, x, y, color, rc, semilla = 1, s = ICONO) {
    const ic = resolverIcono(nombre);
    if (!ic) return;
    if (rc && (ic.tipo === 'lucide' || ic.tipo === 'trazo')) return iconoAMano(g, rc, ic, x, y, s, color, semilla);
    if (ic.tipo === 'marca') {
      // logo dentro de una placa: clara, u oscura si el color de la marca es muy claro
      const clara = luminancia(ic.hex) < 0.72;
      el('rect', { x, y, width: s, height: s, rx: 9, fill: clara ? '#ffffff' : '#1f2430', stroke: clara ? '#d5d9e3' : '#1f2430', class: 'dg-placa' }, g);
      const p = el('g', { transform: `translate(${x + s * 0.18} ${y + s * 0.18}) scale(${(s * 0.64) / 24})` }, g);
      el('path', { d: ic.path, fill: ic.hex }, p);
      el('title', {}, g).textContent = ic.titulo;
    } else if (ic.tipo === 'sigla') {
      const largo = ic.sigla.length, fs = largo <= 2 ? 17 : largo === 3 ? 14 : 11.5;
      el('rect', { x, y, width: s, height: s, rx: 9, fill: ic.color, class: 'dg-placa' }, g);
      const t = el('text', { x: x + s / 2, y: y + s / 2 + fs * 0.36, 'text-anchor': 'middle', 'font-family': SANS, 'font-weight': 800, 'font-size': fs, fill: luminancia(ic.color) > 0.62 ? '#1a1a1a' : '#ffffff', class: 'dg-sigla' }, g);
      t.textContent = ic.sigla;
    } else {
      const p = el('g', { transform: `translate(${x} ${y}) scale(${s / 24})`, fill: 'none', stroke: color, 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      if (ic.tipo === 'trazo') el('path', { d: ic.d }, p); else p.innerHTML = ic.svg;
    }
  }

  // ---------------------------------------------------------------- dibujo
  function dibujar(fig) {
    if (fig.dataset.listo || typeof rough === 'undefined') return;
    let spec;
    try { spec = JSON.parse(fig.dataset.spec); } catch (e) { return; }
    fig.dataset.listo = '1';
    spec._ancho = fig.clientWidth || window.innerWidth;
    spec._estrecho = spec._ancho < 640;
    const porId = ubicar(spec);
    // grupos: rectángulo que envuelve a sus nodos
    const grupos = spec.grupos.map((g) => {
      const ns = g.nodos.map((id) => porId[id]);
      const x0 = Math.min(...ns.map((n) => n.x)) - 18, y0 = Math.min(...ns.map((n) => n.y)) - 38;
      const x1 = Math.max(...ns.map((n) => n.x + n.w)) + 18, y1 = Math.max(...ns.map((n) => n.y + n.h)) + 18;
      return { ...g, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    });

    // rutas (antes de medir el lienzo, porque las que rodean pueden salirse de la grilla)
    const usados = [];
    const flechas = spec.flechas.map((f, i) => {
      const a = porId[f.de], b = porId[f.a];
      const pts = elegirRuta(a, b, spec.nodos, usados);
      for (let k = 0; k < pts.length - 1; k++) usados.push([pts[k], pts[k + 1]]);
      return { ...f, i, pts };
    });
    const xs = [...spec.nodos.flatMap((n) => [n.x, n.x + n.w]), ...grupos.flatMap((g) => [g.x, g.x + g.w]), ...flechas.flatMap((f) => f.pts.map((p) => p.x))];
    const ys = [...spec.nodos.flatMap((n) => [n.y, n.y + n.h]), ...grupos.flatMap((g) => [g.y, g.y + g.h]), ...flechas.flatMap((f) => f.pts.map((p) => p.y))];
    const minX = Math.min(0, Math.min(...xs) - MARGEN), minY = Math.min(0, Math.min(...ys) - MARGEN);
    const W = Math.max(...xs) + MARGEN - minX, H = Math.max(...ys) + MARGEN + 10 - minY;

    const svg = el('svg', { viewBox: `${minX} ${minY} ${W} ${H}`, width: W, role: 'img', 'aria-label': spec.titulo || 'Diagrama', class: 'dg-svg' });
    svg.style.maxWidth = W + 'px';
    svg.style.minWidth = Math.round(Math.min(W, Math.max(spec._estrecho ? 300 : 520, W * (spec._estrecho ? 0.47 : 0.72)))) + 'px';   // muy ancho: se desplaza en vez de achicarse de más
    const rc = rough.svg(svg);
    let semilla = 7;
    const base = () => ({ seed: semilla++, roughness: 1, bowing: 0.8, strokeWidth: 1.8 });
    const capa = (c) => el('g', { class: c }, svg);
    const capaGrupos = capa('dg-capa-grupos'), capaFlechas = capa('dg-capa-flechas'), capaNodos = capa('dg-capa-nodos'), capaEtiquetas = capa('dg-capa-etiquetas');

    for (const g of grupos) {
      const [st, fi] = COLORES[g.color] || COLORES.gris;
      const gg = el('g', { class: 'dg-g' }, capaGrupos);
      gg.appendChild(rc.rectangle(g.x, g.y, g.w, g.h, { ...base(), stroke: st, strokeLineDash: [8, 6], fill: fi, fillStyle: 'solid', roughness: 0.8 }));
      gg.lastChild.setAttribute('class', 'dg-grupo');
      texto(gg, g.label, g.x + 12, g.y + 23, { size: 18, bold: true, anchor: 'start', color: st });
    }

    // flechas, con su recorrido animable
    const ocupadas = [];   // cajas de etiquetas ya ubicadas, para que no se pisen entre sí
    const tramosDe = flechas.flatMap((fl) => fl.pts.slice(1).map((q, j) => ({ i: fl.i, x1: fl.pts[j].x, y1: fl.pts[j].y, x2: q.x, y2: q.y })));
    for (const f of flechas) {
      const st = f.color ? COLORES[f.color][0] : 'currentColor';
      const gf = el('g', { class: 'dg-f', 'data-i': f.i, 'data-de': f.de, 'data-a': f.a }, capaFlechas);
      const d = trazo(f.pts);
      const op = { ...base(), stroke: st, strokeWidth: 2, roughness: 0.9 };
      if (f.estilo === 'punteada') op.strokeLineDash = [6, 6];
      gf.appendChild(rc.path(d, op));
      el('path', { d, class: 'dg-flujo', stroke: f.color ? COLORES[f.color][0] : 'var(--brand, #4f46e5)' }, gf);
      if (f.doble) el('path', { d: trazo([...f.pts].reverse()), class: 'dg-flujo', stroke: f.color ? COLORES[f.color][0] : 'var(--brand, #4f46e5)' }, gf);
      const punta = (from, to) => {
        const ang = Math.atan2(to.y - from.y, to.x - from.x), L = 15, A = 0.42;
        gf.appendChild(rc.line(to.x, to.y, to.x - L * Math.cos(ang - A), to.y - L * Math.sin(ang - A), { ...op, strokeLineDash: undefined }));
        gf.appendChild(rc.line(to.x, to.y, to.x - L * Math.cos(ang + A), to.y - L * Math.sin(ang + A), { ...op, strokeLineDash: undefined }));
      };
      const n = f.pts.length;
      if (!f.sinpunta) punta(f.pts[n - 2], f.pts[n - 1]);
      if (f.doble) punta(f.pts[1], f.pts[0]);

      // etiqueta y número de paso, en el tramo más largo
      let k = 0, mayor = -1;
      for (let j = 0; j < n - 1; j++) { const l = Math.abs(f.pts[j].x - f.pts[j + 1].x) + Math.abs(f.pts[j].y - f.pts[j + 1].y); if (l > mayor) { mayor = l; k = j; } }
      const p1 = f.pts[k], p2 = f.pts[k + 1];
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2, horizontal = Math.abs(p2.y - p1.y) < 0.5;
      const ge = el('g', { class: 'dg-e', 'data-i': f.i }, capaEtiquetas);
      let corrimiento = 0;
      if (f.paso) {
        el('circle', { cx: mx, cy: my, r: 12, class: 'dg-paso', fill: f.color ? COLORES[f.color][0] : 'var(--brand, #4f46e5)' }, ge);
        texto(ge, String(f.paso), mx, my + 5, { size: 14, bold: true, color: '#fff', fuente: SANS }).setAttribute('class', 'dg-paso-num');
        corrimiento = 10;
      }
      if (f.label) {
        let etiqueta = f.label;
        const CH = 9;   // ancho medio de un carácter de la etiqueta (16px)
        const hueco = horizontal ? Math.abs(p2.x - p1.x) : 150;
        // las etiquetas nunca parten palabras: si el hueco es angosto, se envuelve en líneas de al menos 9 caracteres
        if (Math.max(...etiqueta.split('\n').map(largo)) * CH + 14 > hueco + 16) etiqueta = envolver(etiqueta, Math.max(9, Math.floor((hueco + 2) / CH)), false).join('\n');
        const lineas = etiqueta.split('\n');
        const ancho = Math.max(...lineas.map(largo)) * CH + 14, alto = lineas.length * 18 + 6;
        // Se prueban lugares a lo largo de cada tramo de la flecha (al medio, a 30% y a 70%), a ambos lados de la
        // línea, y se elige el que no pisa nodos ni otras etiquetas; a igualdad, el más cercano al medio del tramo
        // más largo
        const pisa = (cx, cy) => {
          const a = { x: cx - ancho / 2, y: cy - alto / 2, w: ancho, h: alto };
          const area = (lista) => lista.reduce((t, b) => {
            const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
            return t + (ix > 0 && iy > 0 ? ix * iy : 0);
          }, 0);
          // cruzar la línea de otra flecha también cuenta (la etiqueta la taparía)
          const cruces = tramosDe.filter((t) => t.i !== f.i && Math.max(t.x1, t.x2) > a.x && Math.min(t.x1, t.x2) < a.x + a.w && Math.max(t.y1, t.y2) > a.y && Math.min(t.y1, t.y2) < a.y + a.h).length;
          return area(spec.nodos) * 4 + area(ocupadas) * 3 + cruces * 600;
        };
        const lugares = [];
        for (let j = 0; j < n - 1; j++) {
          const q1 = f.pts[j], q2 = f.pts[j + 1], hor = Math.abs(q2.y - q1.y) < 0.5;
          if (Math.abs(q2.x - q1.x) + Math.abs(q2.y - q1.y) < 30) continue;
          for (const t of [0.5, 0.3, 0.7, 0.15, 0.85, 0.06, 0.94]) {
            const px = q1.x + (q2.x - q1.x) * t, py = q1.y + (q2.y - q1.y) * t;
            const lados = hor ? [[px, py - alto / 2 - 6 - corrimiento], [px, py + alto / 2 + 6 + corrimiento]]
              : [[px + ancho / 2 + 8 + corrimiento, py], [px - ancho / 2 - 8 - corrimiento, py]];
            for (const l of lados) lugares.push([l, pisa(...l) + Math.hypot(l[0] - mx, l[1] - my) * 0.08 + (j === k ? 0 : 12)]);
          }
        }
        if (!lugares.length) lugares.push([horizontal ? [mx, my - alto / 2 - 6] : [mx + ancho / 2 + 8, my], 0]);
        const [cx, cy] = lugares.reduce((m, x) => (x[1] < m[1] ? x : m))[0];
        ocupadas.push({ x: cx - ancho / 2, y: cy - alto / 2, w: ancho, h: alto });
        el('rect', { x: cx - ancho / 2, y: cy - alto / 2, width: ancho, height: alto, rx: 6, class: 'dg-fondo-etiqueta' }, ge);
        texto(ge, etiqueta, cx, cy - alto / 2 + 16, { size: 16, color: st, lh: 1.1 });
      }
    }

    for (const n of spec.nodos) {
      const [st, fi, medio] = COLORES[n.color] || ['currentColor', null, '#ced4da'];
      const gn = el('g', { class: 'dg-n', 'data-id': n.id }, capaNodos);
      const op = { ...base(), stroke: st, strokeWidth: 2 };
      if (fi) Object.assign(op, { fill: fi, fillStyle: 'solid' });
      const forma = n.forma || 'caja';
      const { x, y, w, h } = n;
      const formas = [];
      if (forma === 'cilindro') {
        const rx = w / 2, ry = 10;
        formas.push(rc.path(`M${x} ${y + ry} L${x} ${y + h - ry} A${rx} ${ry} 0 0 0 ${x + w} ${y + h - ry} L${x + w} ${y + ry}`, op));
        formas.push(rc.ellipse(x + rx, y + ry, w, ry * 2, { ...op, seed: semilla++ }));
      } else if (forma === 'nube') {
        formas.push(rc.ellipse(x + w / 2, y + h / 2, w + 14, h + 8, op));
      } else if (forma === 'nota') {
        formas.push(rc.rectangle(x, y, w, h, { ...op, fill: '#ffec99', fillStyle: 'solid', stroke: '#f08c00' }));
      } else if (forma === 'rombo') {
        formas.push(rc.polygon([[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]], op));
      } else if (forma === 'circulo') {
        formas.push(rc.ellipse(x + w / 2, y + h / 2, w, h, op));
      } else if (forma === 'hexagono') {
        const i = 22;
        formas.push(rc.polygon([[x + i, y], [x + w - i, y], [x + w, y + h / 2], [x + w - i, y + h], [x + i, y + h], [x, y + h / 2]], op));
      } else if (forma === 'documento') {
        const o = 10;
        formas.push(rc.path(`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h - o} Q${x + w * 0.75} ${y + h - 2 * o} ${x + w / 2} ${y + h - o} Q${x + w * 0.25} ${y + h} ${x} ${y + h - o} Z`, op));
      } else {
        const r = 14;
        formas.push(rc.path(`M${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} L${x + r} ${y + h} Q${x} ${y + h} ${x} ${y + h - r} L${x} ${y + r} Q${x} ${y} ${x + r} ${y}`, op));
      }
      for (const f of formas) {
        gn.appendChild(f);
        // el primer trazo de una figura con relleno es el rayado: se marca para atenuarlo en tema oscuro
        if (fi && forma !== 'nota') { const r = f.querySelector('path'); if (r) { r.classList.add('dg-relleno'); r.style.setProperty('--dg-osc', st); } }
      }
      const tieneIcono = n._dibujo || !!resolverIcono(n.icono);
      const dy = forma === 'cilindro' ? 16 : forma === 'rombo' ? 18 : forma === 'circulo' ? 12 : 0;
      const LADO = 56;
      if (n._dibujo) DIB.dibujar(gn, rc, n.icono, x + w / 2 - LADO / 2, y + 8 + dy, LADO, { tinta: fi ? st : 'currentColor', medio, semilla: semilla += 40 });
      else if (tieneIcono) {
        const ic = resolverIcono(n.icono), linea = ic.tipo === 'lucide' || ic.tipo === 'trazo', s2 = linea ? 42 : ICONO;
        dibujarIcono(gn, n.icono, x + w / 2 - s2 / 2, y + (linea ? 9 : 11) + dy, fi ? st : 'currentColor', rc, semilla += 30, s2);
      }
      const total = n.lineas.length * 21 + n.sublineas.length * 17;
      const ty = (tieneIcono ? y + (n._dibujo ? 86 : 68) + dy : y + (h - total) / 2 + 16) + (forma === 'cilindro' ? -2 : 0);
      texto(gn, n.lineas.join('\n'), x + w / 2, ty, { size: 18, bold: true, color: 'currentColor', lh: 1.15 });
      if (n.sublineas.length) texto(gn, n.sublineas.join('\n'), x + w / 2, ty + n.lineas.length * 21, { size: 14, color: 'currentColor', lh: 1.18 }).setAttribute('class', 'dg-sub');
    }

    // ---------------------------------------------------------------- interacción
    const marco = document.createElement('div');
    marco.className = 'dg-marco';
    marco.appendChild(svg);
    const zoom = document.createElement('button');
    zoom.type = 'button'; zoom.className = 'dg-zoom'; zoom.title = 'Ampliar'; zoom.textContent = '⤢';
    zoom.addEventListener('click', () => ampliar(svg, spec.titulo));
    marco.appendChild(zoom);

    // resaltar un nodo y sus flechas al pasar el mouse
    svg.addEventListener('mouseover', (e) => {
      const n = e.target.closest('.dg-n');
      if (!n || marco.classList.contains('dg-pasos')) return;
      const id = n.dataset.id;
      svg.classList.add('dg-foco');
      svg.querySelectorAll('.dg-on').forEach((x) => x.classList.remove('dg-on'));
      n.classList.add('dg-on');
      for (const f of flechas) {
        if (f.de !== id && f.a !== id) continue;
        svg.querySelectorAll(`[data-i="${f.i}"]`).forEach((x) => x.classList.add('dg-on'));
        svg.querySelector(`.dg-n[data-id="${f.de === id ? f.a : f.de}"]`)?.classList.add('dg-on');
      }
    });
    svg.addEventListener('mouseleave', () => { svg.classList.remove('dg-foco'); svg.querySelectorAll('.dg-on').forEach((x) => x.classList.remove('dg-on')); });

    // barra: flujo animado, paso a paso y descargas
    const barra = document.createElement('div');
    barra.className = 'dg-barra';
    const boton = (txt, titulo) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'dg-btn'; b.textContent = txt; b.title = titulo; barra.appendChild(b); return b; };
    const bFlujo = flechas.length ? boton('▶ Ver el flujo', 'Animar cómo viajan los datos por las flechas') : null;
    const bPasos = flechas.length > 1 ? boton('👣 Paso a paso', 'Recorrer el diagrama de a una flecha') : null;
    const espacio = document.createElement('span'); espacio.className = 'dg-espacio'; barra.appendChild(espacio);
    const bPng = boton('⬇ PNG', 'Descargar como imagen'), bSvg = boton('⬇ SVG', 'Descargar como SVG');
    marco.appendChild(barra);

    const panel = document.createElement('div');
    panel.className = 'dg-panel'; panel.hidden = true;
    panel.innerHTML = `<div class="dg-panel-ctl"><button type="button" class="dg-btn" data-p="-1" aria-label="Paso anterior" title="Paso anterior (←)">◀</button><button type="button" class="dg-btn dg-play" data-p="play" title="Reproducir solo">▶ Reproducir</button><button type="button" class="dg-btn" data-p="1" aria-label="Paso siguiente" title="Paso siguiente (→)">▶▶</button>
      <span class="dg-panel-num"></span><span class="dg-espacio"></span><button type="button" class="dg-btn" data-p="x" aria-label="Salir del paso a paso" title="Salir del paso a paso (Esc)">✕</button></div>
      <div class="dg-puntos" role="group" aria-label="Ir a un paso"></div><div class="dg-panel-txt" aria-live="polite"></div>`;

    bFlujo?.addEventListener('click', () => {
      const on = marco.classList.toggle('dg-anima');
      bFlujo.textContent = on ? '⏸ Detener' : '▶ Ver el flujo';
    });

    // orden de los pasos: el atributo paso= si existe; si no, orden topológico (un nodo se presenta
    // cuando ya llegaron todas sus entradas) y, entre los disponibles, se sigue la misma fila
    const orden = flechas.some((f) => f.paso) ? [...flechas].sort((f, g) => (Number(f.paso) || 1e9) - (Number(g.paso) || 1e9) || f.i - g.i) : (() => {
      const pendientes = Object.fromEntries(spec.nodos.map((n) => [n.id, flechas.filter((f) => f.a === n.id && f.de !== n.id).length]));
      const hechos = new Set(), res = [];
      const clave = (n) => n._f * 1000 + n._c;
      while (hechos.size < spec.nodos.length) {
        let libres = spec.nodos.filter((n) => !hechos.has(n.id) && pendientes[n.id] === 0);
        if (!libres.length) libres = spec.nodos.filter((n) => !hechos.has(n.id));   // hay un ciclo: se rompe por posición
        const n = libres.sort((a, b) => clave(a) - clave(b))[0];
        hechos.add(n.id);
        res.push(...flechas.filter((f) => f.a === n.id && !res.includes(f)).sort((f, g) => clave(porId[f.de]) - clave(porId[g.de])));
        for (const f of flechas) if (f.de === n.id) pendientes[f.a]--;
      }
      return res;
    })();
    let paso = 0, reproduciendo = null, animando = [];
    const etiquetaNodo = (id) => porId[id].label.replace(/\n/g, ' ');
    const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colorDe = (f) => (f.color ? COLORES[f.color][0] : 'var(--brand, #4f46e5)');
    const nodoDom = (id) => svg.querySelector(`.dg-n[data-id="${CSS.escape(id)}"]`);
    // el "paquete" que viaja por la flecha del paso actual
    const ficha = el('g', { class: 'dg-ficha', 'aria-hidden': 'true' }, svg);
    el('circle', { r: 15, class: 'dg-ficha-halo' }, ficha);
    el('circle', { r: 8.5, class: 'dg-ficha-punto' }, ficha);
    ficha.style.display = 'none';
    const detener = () => { animando.forEach((x) => { try { x.cancel(); } catch (e) { /* ya terminó */ } }); animando = []; if (ficha._raf) cancelAnimationFrame(ficha._raf); ficha.style.display = 'none'; };
    // dibuja la flecha como si se trazara a mano, hace viajar el paquete y, al llegar, hace "rebotar" el nodo destino
    const animarFlecha = (f, alTerminar) => {
      detener();
      const gf = svg.querySelector(`.dg-f[data-i="${f.i}"]`), destino = nodoDom(f.a), origen = nodoDom(f.de);
      svg.querySelectorAll('.dg-llega, .dg-sale').forEach((x) => x.classList.remove('dg-llega', 'dg-sale'));
      if (origen) origen.classList.add('dg-sale');
      if (!gf || sinMovimiento() || !gf.animate) { if (destino) destino.classList.add('dg-llega'); alTerminar && alTerminar(); return; }
      const trazos = [...gf.querySelectorAll('path:not(.dg-flujo)')];
      const DUR = 750;
      trazos.forEach((t, k) => {
        let L = 0; try { L = t.getTotalLength(); } catch (e) { /* sin largo */ }
        if (!L) return;
        const esPunta = k >= trazos.length - (f.sinpunta ? 0 : 2) - (f.doble ? 2 : 0) && trazos.length > 1;
        t.style.strokeDasharray = L;
        const an = t.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: esPunta ? 220 : DUR, delay: esPunta ? DUR - 60 : 0, easing: 'ease-in-out', fill: 'backwards' });
        an.onfinish = () => { t.style.strokeDasharray = ''; };
        an.oncancel = () => { t.style.strokeDasharray = ''; };
        animando.push(an);
      });
      const ruta = gf.querySelector('.dg-flujo');
      let largo = 0; try { largo = ruta.getTotalLength(); } catch (e) { /* sin ruta */ }
      if (!largo) { if (destino) destino.classList.add('dg-llega'); alTerminar && alTerminar(); return; }
      ficha.style.display = ''; ficha.style.color = colorDe(f);
      svg.appendChild(ficha);   // siempre encima de todo
      const t0 = performance.now() + 120, VIAJE = Math.min(1500, Math.max(700, largo * 2.2));
      const mover = (ahora) => {
        const u = Math.max(0, Math.min(1, (ahora - t0) / VIAJE)), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const pt = ruta.getPointAtLength(e * largo);
        ficha.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
        if (u < 1) ficha._raf = requestAnimationFrame(mover);
        else { ficha.style.display = 'none'; if (destino) { destino.classList.remove('dg-llega'); void destino.getBoundingClientRect(); destino.classList.add('dg-llega'); } alTerminar && alTerminar(); }
      };
      ficha._raf = requestAnimationFrame(mover);
    };
    const puntos = panel.querySelector('.dg-puntos');
    puntos.innerHTML = orden.map((f, k) => `<button type="button" data-ir="${k}" aria-label="Paso ${k + 1}: ${esc(etiquetaNodo(f.de))} a ${esc(etiquetaNodo(f.a))}" title="Paso ${k + 1}"></button>`).join('');
    const mostrarPaso = (animar = true) => {
      const vistos = new Set(), flechasVistas = new Set(orden.slice(0, paso + 1).map((f) => f.i));
      orden.slice(0, paso + 1).forEach((f) => { vistos.add(f.de); vistos.add(f.a); });
      const f = orden[paso];
      svg.querySelectorAll('.dg-n').forEach((x) => { x.classList.toggle('dg-visto', vistos.has(x.dataset.id)); x.classList.toggle('dg-actual', x.dataset.id === f.de || x.dataset.id === f.a); });
      svg.querySelectorAll('.dg-f, .dg-e').forEach((x) => { x.classList.toggle('dg-visto', flechasVistas.has(Number(x.dataset.i))); x.classList.toggle('dg-actual', Number(x.dataset.i) === f.i); });
      // la explicación del paso: la escrita en la lección (explica=); si no hay, se arma con lo que dice el diagrama:
      // qué hace la flecha (su etiqueta) y qué es cada nodo (su subtítulo)
      const sub = (id) => String(porId[id].sub || '').replace(/\n/g, ' ').trim();
      const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
      let desc = f.explica ? f.explica.replace(/\n/g, ' ') : '';
      if (!desc) {
        const partes = [];
        const punto = (t) => (/[.…!?:]$/.test(t) ? t : t + '.');
        if (f.label) partes.push(punto(mayus(f.label.replace(/\n/g, ' '))));
        if (sub(f.a)) partes.push(punto(`${etiquetaNodo(f.a)}: ${sub(f.a)}`));
        else if (paso === 0 && sub(f.de)) partes.push(punto(`${etiquetaNodo(f.de)}: ${sub(f.de)}`));
        desc = partes.join(' ');
      }
      panel.querySelector('.dg-panel-num').textContent = `Paso ${paso + 1} de ${orden.length}`;
      panel.querySelector('.dg-panel-txt').innerHTML = `<div class="dg-ruta"><span class="dg-chip">${esc(etiquetaNodo(f.de))}</span><span class="dg-chip-fl" style="color:${colorDe(f)}" aria-label="hacia">→</span><span class="dg-chip">${esc(etiquetaNodo(f.a))}</span></div>${desc ? `<p>${esc(desc)}</p>` : ''}`;
      panel.querySelector('[data-p="-1"]').disabled = paso === 0;
      panel.querySelector('[data-p="1"]').disabled = paso === orden.length - 1;
      puntos.querySelectorAll('button').forEach((b, k) => { b.classList.toggle('hecho', k < paso); b.classList.toggle('actual', k === paso); b.setAttribute('aria-current', k === paso ? 'step' : 'false'); });
      // en diagramas altos, la flecha del paso se trae a la vista (el panel queda fijo abajo)
      const gfa = svg.querySelector(`.dg-f[data-i="${f.i}"]`);
      if (gfa && animar) { const r = gfa.getBoundingClientRect(), alto = innerHeight - (panel.offsetHeight || 0) - 70; if (r.top < 70 || r.bottom > alto) window.scrollBy({ top: r.top - Math.max(80, (alto - r.height) / 2), behavior: sinMovimiento() ? 'auto' : 'smooth' }); }
      if (animar) animarFlecha(f, () => { if (reproduciendo) programar(desc); });
    };
    // reproducir solo: cada paso queda en pantalla el tiempo que lleva leer su explicación
    const programar = (desc) => {
      clearTimeout(reproduciendo);
      if (paso >= orden.length - 1) { pausar(); return; }
      reproduciendo = setTimeout(() => { paso++; mostrarPaso(); }, Math.min(7000, 1800 + (desc || '').length * 38));
    };
    const bPlay = panel.querySelector('[data-p="play"]');
    const pausar = () => { clearTimeout(reproduciendo); reproduciendo = null; bPlay.textContent = paso >= orden.length - 1 ? '↺ Repetir' : '▶ Reproducir'; bPlay.classList.remove('activo'); };
    const reproducir = () => { if (paso >= orden.length - 1) paso = 0; reproduciendo = -1; bPlay.textContent = '⏸ Pausa'; bPlay.classList.add('activo'); mostrarPaso(); };
    const salirPasos = () => { pausar(); detener(); marco.classList.remove('dg-pasos'); panel.hidden = true; bPasos.classList.remove('activo'); svg.querySelectorAll('.dg-llega, .dg-sale, .dg-n.dg-actual').forEach((x) => x.classList.remove('dg-llega', 'dg-sale', 'dg-actual')); };
    const ir = (k) => { pausar(); paso = Math.max(0, Math.min(orden.length - 1, k)); mostrarPaso(); };
    bPasos?.addEventListener('click', () => {
      if (marco.classList.contains('dg-pasos')) return salirPasos();
      paso = 0; marco.classList.add('dg-pasos'); panel.hidden = false; bPasos.classList.add('activo');
      if (marco.classList.contains('dg-anima')) bFlujo.click();
      svg.classList.remove('dg-foco'); pausar(); mostrarPaso();
      marco.focus({ preventScroll: true });
    });
    panel.addEventListener('click', (e) => {
      const d = e.target.closest('[data-ir]'); if (d) { ir(Number(d.dataset.ir)); return; }
      const p = e.target.closest('[data-p]')?.dataset.p;
      if (p === 'x') salirPasos();
      else if (p === 'play') { if (reproduciendo) pausar(); else reproducir(); }
      else if (p) ir(paso + Number(p));
    });
    marco.tabIndex = -1;
    const teclas = (e) => {
      if (!marco.classList.contains('dg-pasos')) return;
      if (e.key === 'ArrowRight' && paso < orden.length - 1) { ir(paso + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft' && paso > 0) { ir(paso - 1); e.preventDefault(); }
      if (e.key === ' ' && (e.target === marco)) { if (reproduciendo) pausar(); else reproducir(); e.preventDefault(); }
      if (e.key === 'Escape') salirPasos();
    };
    marco.addEventListener('keydown', teclas);
    panel.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Escape') teclas(e); });

    bPng.addEventListener('click', () => exportar(svg, marco, spec.titulo, 'png'));
    bSvg.addEventListener('click', () => exportar(svg, marco, spec.titulo, 'svg'));
    fig.insertBefore(marco, fig.firstChild);
    marco.after(panel);   // fuera del marco (que se desplaza de costado) para que quede fijo abajo de la pantalla
    // las etiquetas de las flechas se ubican después de calcular el tamaño: si alguna quedó afuera, se agranda el lienzo
    try {
      const bb = svg.getBBox(), [vx, vy, vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
      const x1 = Math.min(vx, bb.x - 8), y1 = Math.min(vy, bb.y - 8), x2 = Math.max(vx + vw, bb.x + bb.width + 8), y2 = Math.max(vy + vh, bb.y + bb.height + 8);
      if (x1 < vx - 0.5 || y1 < vy - 0.5 || x2 > vx + vw + 0.5 || y2 > vy + vh + 0.5) {
        svg.setAttribute('viewBox', `${x1} ${y1} ${x2 - x1} ${y2 - y1}`); svg.setAttribute('width', x2 - x1); svg.style.maxWidth = (x2 - x1) + 'px';
      }
    } catch (e) { /* sin medidas (oculto): se deja como está */ }
    // si se pasa del ancho por poco (en escritorio hasta ~30%), achicarlo en vez de dejar una barra de desplazamiento
    const cs = getComputedStyle(marco), minimo = parseFloat(svg.style.minWidth) || 0;
    const visible = marco.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    if (visible && minimo > visible && minimo < visible * (spec._estrecho ? 1.15 : 1.31)) svg.style.minWidth = visible + 'px';
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------------------------------------------------------------- descargar
  // Copia el SVG con los colores del tema resueltos y los estilos necesarios incluidos.
  function exportar(svg, marco, titulo, tipo) {
    const cs = getComputedStyle(marco), tinta = cs.color, fondo = cs.backgroundColor;
    const oscuro = luminancia('#' + (fondo.match(/\d+/g) || [255, 255, 255]).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')) < 0.5;
    const copia = svg.cloneNode(true);
    copia.removeAttribute('class'); copia.removeAttribute('style');
    copia.querySelectorAll('.dg-flujo, .dg-ficha').forEach((x) => x.remove());
    copia.querySelectorAll('[class]').forEach((x) => x.classList.remove('dg-on', 'dg-visto', 'dg-actual', 'dg-llega', 'dg-sale'));
    copia.querySelectorAll('[stroke="currentColor"]').forEach((x) => x.setAttribute('stroke', tinta));
    copia.querySelectorAll('[fill="currentColor"]').forEach((x) => x.setAttribute('fill', tinta));
    const [vx, vy, vw, vh] = copia.getAttribute('viewBox').split(' ').map(Number);
    copia.setAttribute('xmlns', NS); copia.setAttribute('width', vw); copia.setAttribute('height', vh);
    const estilo = el('style', {});
    estilo.textContent = `text{paint-order:stroke;stroke:${fondo};stroke-width:4px;stroke-linejoin:round}.dg-sigla{stroke:none}.dg-fondo-etiqueta{fill:${fondo};opacity:.92}.dg-sub{opacity:.8}.dg-relleno{${oscuro ? 'fill:var(--dg-osc);opacity:.2' : 'opacity:1'}}path[fill="#fffffe"]{fill:${oscuro ? '#3a4150' : '#ffffff'}}.dg-grupo path[fill]:not([fill="none"]){fill-opacity:.22}`;
    copia.insertBefore(estilo, copia.firstChild);
    copia.insertBefore(el('rect', { x: vx, y: vy, width: vw, height: vh, fill: fondo }), estilo.nextSibling);
    const generar = (fuente) => {
      if (fuente) estilo.textContent = fuente + estilo.textContent;
      return new XMLSerializer().serializeToString(copia);
    };
    fuenteIncrustada().then((f) => terminar(generar(f)), () => terminar(generar('')));
    const terminar = (xml) => {
    const nombre = (titulo || 'diagrama').toLowerCase().normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'diagrama';
    const bajar = (url, ext) => { const a = document.createElement('a'); a.href = url; a.download = `${nombre}.${ext}`; a.click(); };
    if (tipo === 'svg') { bajar(URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' })), 'svg'); return; }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'), k = 2;
      c.width = vw * k; c.height = vh * k;
      const ctx = c.getContext('2d');
      ctx.scale(k, k); ctx.drawImage(img, 0, 0, vw, vh);
      bajar(c.toDataURL('image/png'), 'png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    };
  }

  // La letra a mano (Shantell Sans, alojada en el sitio) se incrusta en el archivo exportado para que la imagen
  // se vea igual que en la página.
  let fuenteCache = null;
  function fuenteIncrustada() {
    if (fuenteCache) return fuenteCache;
    const aBase64 = (buf) => { let b = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) b += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(b); };
    fuenteCache = fetch('assets/fonts/shantell-sans-latin.woff2').then((r) => { if (!r.ok) throw new Error('sin fuente'); return r.arrayBuffer(); })
      .then((buf) => `@font-face{font-family:'Shantell Sans';font-weight:300 800;src:url(data:font/woff2;base64,${aBase64(buf)}) format('woff2')}`);
    fuenteCache.catch(() => { fuenteCache = null; });
    return fuenteCache;
  }

  function ampliar(svg, titulo) {
    const capa = document.createElement('div');
    capa.className = 'dg-capa';
    capa.innerHTML = `<div class="dg-capa-in"><button type="button" class="dg-cerrar" title="Cerrar">✕</button>${titulo ? `<div class="dg-capa-tit"></div>` : ''}</div>`;
    if (titulo) capa.querySelector('.dg-capa-tit').textContent = titulo;
    const copia = svg.cloneNode(true);
    copia.removeAttribute('width'); copia.style.maxWidth = 'none'; copia.style.minWidth = '0';
    capa.firstChild.appendChild(copia);
    const cerrar = () => { capa.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') cerrar(); };
    capa.addEventListener('click', (e) => { if (e.target === capa || e.target.classList.contains('dg-cerrar')) cerrar(); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(capa);
  }

  // un ícono suelto como SVG (lo usan otros componentes, como los recorridos animados)
  function iconoSVG(nombre, color = 'currentColor') {
    if (!resolverIcono(nombre)) return '';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${ICONO} ${ICONO}`);
    svg.setAttribute('aria-hidden', 'true');
    dibujarIcono(svg, nombre, 0, 0, color);
    return svg.outerHTML;
  }

  window.Diagramas = { dibujar: (root) => (root || document).querySelectorAll('figure.diagrama').forEach(dibujar), resolverIcono, iconoSVG, COLORES };
})();
