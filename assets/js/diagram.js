/* Diagramas con estilo dibujado a mano (rough.js, la librería de trazo de Excalidraw).
 * El build convierte cada bloque ```diagrama en <figure class="diagrama" data-spec="{…}">.
 * Este archivo los dibuja como SVG: nodos con ícono (Lucide, logos de Simple Icons o siglas propias),
 * grupos, flechas con codos que esquivan los nodos, animación del flujo, modo paso a paso,
 * resaltado al pasar el mouse y descarga en PNG o SVG.
 * El trazo usa currentColor, así funciona en tema claro y oscuro. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const LIB = window.ICONOS_LIB || { lucide: {}, trazos: {}, alias: {}, marcas: {}, siglas: {} };

  // Paleta de Excalidraw: [trazo, relleno]
  const COLORES = {
    azul: ['#1971c2', '#a5d8ff'], verde: ['#2f9e44', '#b2f2bb'], naranja: ['#e8590c', '#ffd8a8'],
    rojo: ['#e03131', '#ffc9c9'], violeta: ['#6741d9', '#d0bfff'], amarillo: ['#f08c00', '#ffec99'],
    gris: ['#868e96', '#dee2e6'], cian: ['#0c8599', '#99e9f2'], rosa: ['#c2255c', '#fcc2d7']
  };

  const CELDA_W = 250, CELDA_H = 195, NODO_W = 176, NODO_H = 112, MARGEN = 30, ICONO = 36;
  const FUENTE = "'Kalam', 'Segoe Print', 'Comic Sans MS', cursive";
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
    const vertical = spec.direccion === 'abajo';
    for (const n of nodos) {
      const w = n.ancho ? Number(n.ancho) : NODO_W;
      const util = n.forma === 'rombo' || n.forma === 'hexagono' || n.forma === 'circulo' ? w * 0.68 : w;
      n.lineas = envolver(n.label, Math.floor(util / 11));
      n.sublineas = n.sub ? envolver(n.sub, Math.floor(util / 7.6)) : [];
      const conIcono = !!resolverIcono(n.icono);
      const extra = n.forma === 'cilindro' ? 14 : n.forma === 'rombo' ? 40 : n.forma === 'documento' ? 10 : n.forma === 'circulo' ? 26 : 0;
      n.w = w; n.h = Math.max(NODO_H, (conIcono ? 54 : 18) + n.lineas.length * 21 + n.sublineas.length * 17 + 12 + extra);
      n._c = vertical ? n.fila : n.col; n._f = vertical ? n.col : n.fila;
    }
    // alto de cada fila: crece con el nodo más alto, y deja aire extra donde termina un grupo y empieza otro
    const filas = Math.max(...nodos.map((n) => n._f)) + 1;
    const grupoDe = {};
    for (const g of spec.grupos || []) for (const id of g.nodos) grupoDe[id] = g.id;
    const altoFila = Array.from({ length: filas }, (_, f) => Math.max(CELDA_H, ...nodos.filter((n) => n._f === f).map((n) => n.h + 80)));
    const y0 = [MARGEN + 24];
    for (let f = 1; f < filas; f++) {
      const arriba = new Set(nodos.filter((n) => n._f === f - 1).map((n) => grupoDe[n.id]).filter(Boolean));
      const abajo = new Set(nodos.filter((n) => n._f === f).map((n) => grupoDe[n.id]).filter(Boolean));
      const cambiaGrupo = [...abajo].some((g) => !arriba.has(g)) && arriba.size > 0;
      y0[f] = y0[f - 1] + altoFila[f - 1] + (cambiaGrupo ? 40 : 0);
    }
    for (const n of nodos) {
      n.x = MARGEN + n._c * CELDA_W + (CELDA_W - n.w) / 2;
      n.y = y0[n._f] + (altoFila[n._f] - n.h) / 2;
      n.cx = n.x + n.w / 2; n.cy = n.y + n.h / 2;
    }
    return porId;
  }

  // parte un texto en líneas de hasta `max` caracteres, respetando los \n puestos a mano
  function envolver(str, max) {
    const out = [];
    for (const parrafo of String(str).split('\n')) {
      let linea = '';
      // una palabra más larga que la línea (stg_tienda__pedidos) se parte en sus guiones bajos
      const palabras = parrafo.split(' ').flatMap((p) => (p.length > max && p.includes('_') ? p.split(/(?<=_)/).reduce((acc, t) => { if (acc.length && (acc[acc.length - 1] + t).length <= max) acc[acc.length - 1] += t; else acc.push(t); return acc; }, []) : [p]));
      for (const palabra of palabras) {
        const sep = linea.endsWith('_') ? '' : ' ';
        if (linea && (linea + sep + palabra).length > max) { out.push(linea); linea = palabra; } else linea = linea ? linea + sep + palabra : palabra;
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

  function dibujarIcono(g, nombre, x, y, color) {
    const ic = resolverIcono(nombre);
    if (!ic) return;
    const s = ICONO;
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
    svg.style.minWidth = Math.round(Math.min(W, Math.max(520, W * 0.72))) + 'px';   // muy ancho: se desplaza en vez de achicarse de más
    const rc = rough.svg(svg);
    let semilla = 7;
    const base = () => ({ seed: semilla++, roughness: 1.1, bowing: 0.9, strokeWidth: 1.6 });
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
    for (const f of flechas) {
      const st = f.color ? COLORES[f.color][0] : 'currentColor';
      const gf = el('g', { class: 'dg-f', 'data-i': f.i, 'data-de': f.de, 'data-a': f.a }, capaFlechas);
      const d = trazo(f.pts);
      const op = { ...base(), stroke: st, strokeWidth: 1.7, roughness: 0.9 };
      if (f.estilo === 'punteada') op.strokeLineDash = [6, 6];
      gf.appendChild(rc.path(d, op));
      el('path', { d, class: 'dg-flujo', stroke: f.color ? COLORES[f.color][0] : 'var(--brand, #4f46e5)' }, gf);
      if (f.doble) el('path', { d: trazo([...f.pts].reverse()), class: 'dg-flujo', stroke: f.color ? COLORES[f.color][0] : 'var(--brand, #4f46e5)' }, gf);
      const punta = (from, to) => {
        const ang = Math.atan2(to.y - from.y, to.x - from.x), L = 13, A = 0.45;
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
        const hueco = horizontal ? Math.abs(p2.x - p1.x) : 150;
        if (Math.max(...etiqueta.split('\n').map((l) => l.length)) * 8.4 + 14 > hueco + 16) etiqueta = envolver(etiqueta, Math.max(5, Math.floor((hueco + 2) / 8.4))).join('\n');
        const lineas = etiqueta.split('\n');
        const ancho = Math.max(...lineas.map((l) => l.length)) * 8.4 + 14, alto = lineas.length * 18 + 6;
        // horizontal: la etiqueta va arriba de la línea; vertical: a la derecha
        const cx = horizontal ? mx : mx + ancho / 2 + 8 + corrimiento, cy = horizontal ? my - alto / 2 - 6 - corrimiento : my;
        el('rect', { x: cx - ancho / 2, y: cy - alto / 2, width: ancho, height: alto, rx: 6, class: 'dg-fondo-etiqueta' }, ge);
        texto(ge, etiqueta, cx, cy - alto / 2 + 16, { size: 16, color: st, lh: 1.1 });
      }
    }

    for (const n of spec.nodos) {
      const [st, fi] = COLORES[n.color] || ['currentColor', null];
      const gn = el('g', { class: 'dg-n', 'data-id': n.id }, capaNodos);
      const op = { ...base(), stroke: st };
      if (fi) Object.assign(op, { fill: fi, fillStyle: 'hachure', hachureGap: 7, fillWeight: 1.2, hachureAngle: -41 });
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
        if (fi && forma !== 'nota') f.querySelector('path')?.classList.add('dg-relleno');
      }
      const tieneIcono = !!resolverIcono(n.icono);
      const dy = forma === 'cilindro' ? 16 : forma === 'rombo' ? 18 : forma === 'circulo' ? 12 : 0;
      if (tieneIcono) dibujarIcono(gn, n.icono, x + w / 2 - ICONO / 2, y + 9 + dy, fi ? st : 'currentColor');
      const total = n.lineas.length * 21 + n.sublineas.length * 17;
      const ty = (tieneIcono ? y + 68 + dy : y + (h - total) / 2 + 16) + (forma === 'cilindro' ? -2 : 0);
      texto(gn, n.lineas.join('\n'), x + w / 2, ty, { size: 19, bold: true, color: 'currentColor', lh: 1.1 });
      if (n.sublineas.length) texto(gn, n.sublineas.join('\n'), x + w / 2, ty + n.lineas.length * 21, { size: 15, color: 'currentColor', lh: 1.12 }).setAttribute('class', 'dg-sub');
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
    panel.innerHTML = '<button type="button" class="dg-btn" data-p="-1">◀</button><div class="dg-panel-txt"></div><button type="button" class="dg-btn" data-p="1">▶</button><button type="button" class="dg-btn" data-p="x" title="Salir del paso a paso">✕</button>';
    marco.appendChild(panel);

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
    let paso = 0;
    const etiquetaNodo = (id) => porId[id].label.replace(/\n/g, ' ');
    const mostrarPaso = () => {
      const vistos = new Set(), flechasVistas = new Set(orden.slice(0, paso + 1).map((f) => f.i));
      orden.slice(0, paso + 1).forEach((f) => { vistos.add(f.de); vistos.add(f.a); });
      svg.querySelectorAll('.dg-n').forEach((x) => x.classList.toggle('dg-visto', vistos.has(x.dataset.id)));
      svg.querySelectorAll('.dg-f, .dg-e').forEach((x) => { x.classList.toggle('dg-visto', flechasVistas.has(Number(x.dataset.i))); x.classList.toggle('dg-actual', Number(x.dataset.i) === orden[paso].i); });
      const f = orden[paso];
      const desc = f.explica || f.label || '';
      panel.querySelector('.dg-panel-txt').innerHTML = `<b>Paso ${paso + 1} de ${orden.length}:</b> ${esc(etiquetaNodo(f.de))} → ${esc(etiquetaNodo(f.a))}${desc ? `<span>${esc(desc.replace(/\n/g, ' '))}</span>` : ''}`;
      panel.querySelector('[data-p="-1"]').disabled = paso === 0;
      panel.querySelector('[data-p="1"]').disabled = paso === orden.length - 1;
    };
    const salirPasos = () => { marco.classList.remove('dg-pasos'); panel.hidden = true; bPasos.classList.remove('activo'); };
    bPasos?.addEventListener('click', () => {
      if (marco.classList.contains('dg-pasos')) return salirPasos();
      paso = 0; marco.classList.add('dg-pasos'); panel.hidden = false; bPasos.classList.add('activo');
      svg.classList.remove('dg-foco'); mostrarPaso();
    });
    panel.addEventListener('click', (e) => {
      const p = e.target.closest('[data-p]')?.dataset.p;
      if (p === 'x') salirPasos();
      else if (p) { paso = Math.max(0, Math.min(orden.length - 1, paso + Number(p))); mostrarPaso(); }
    });
    marco.tabIndex = -1;
    marco.addEventListener('keydown', (e) => {
      if (!marco.classList.contains('dg-pasos')) return;
      if (e.key === 'ArrowRight' && paso < orden.length - 1) { paso++; mostrarPaso(); e.preventDefault(); }
      if (e.key === 'ArrowLeft' && paso > 0) { paso--; mostrarPaso(); e.preventDefault(); }
      if (e.key === 'Escape') salirPasos();
    });

    bPng.addEventListener('click', () => exportar(svg, marco, spec.titulo, 'png'));
    bSvg.addEventListener('click', () => exportar(svg, marco, spec.titulo, 'svg'));
    fig.insertBefore(marco, fig.firstChild);
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ---------------------------------------------------------------- descargar
  // Copia el SVG con los colores del tema resueltos y los estilos necesarios incluidos.
  function exportar(svg, marco, titulo, tipo) {
    const cs = getComputedStyle(marco), tinta = cs.color, fondo = cs.backgroundColor;
    const oscuro = luminancia('#' + (fondo.match(/\d+/g) || [255, 255, 255]).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')) < 0.5;
    const copia = svg.cloneNode(true);
    copia.removeAttribute('class'); copia.removeAttribute('style');
    copia.querySelectorAll('.dg-flujo').forEach((x) => x.remove());
    copia.querySelectorAll('[class]').forEach((x) => x.classList.remove('dg-on', 'dg-visto', 'dg-actual'));
    copia.querySelectorAll('[stroke="currentColor"]').forEach((x) => x.setAttribute('stroke', tinta));
    copia.querySelectorAll('[fill="currentColor"]').forEach((x) => x.setAttribute('fill', tinta));
    const [vx, vy, vw, vh] = copia.getAttribute('viewBox').split(' ').map(Number);
    copia.setAttribute('xmlns', NS); copia.setAttribute('width', vw); copia.setAttribute('height', vh);
    const estilo = el('style', {});
    estilo.textContent = `text{paint-order:stroke;stroke:${fondo};stroke-width:4px;stroke-linejoin:round}.dg-sigla{stroke:none}.dg-fondo-etiqueta{fill:${fondo};opacity:.92}.dg-sub{opacity:.8}.dg-relleno{opacity:${oscuro ? 0.3 : 0.75}}.dg-grupo path[fill]:not([fill="none"]){fill-opacity:.22}`;
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

  // La letra a mano (Kalam) se incrusta en el archivo exportado para que la imagen se vea igual que en la página.
  let fuenteCache = null;
  function fuenteIncrustada() {
    if (fuenteCache) return fuenteCache;
    const aBase64 = (buf) => { let b = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) b += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(b); };
    fuenteCache = fetch('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap').then((r) => r.text()).then(async (css) => {
      // de cada peso, el bloque del subconjunto latino (incluye tildes y ñ)
      const bloques = css.split('@font-face').filter((b) => /latin \*\//.test(b) || /U\+0000-00FF/.test(b));
      const caras = [];
      for (const b of bloques) {
        const url = (b.match(/url\(([^)]+)\)/) || [])[1], peso = (b.match(/font-weight:\s*(\d+)/) || [])[1];
        if (!url) continue;
        const datos = aBase64(await (await fetch(url)).arrayBuffer());
        caras.push(`@font-face{font-family:'Kalam';font-weight:${peso};src:url(data:font/woff2;base64,${datos}) format('woff2')}`);
      }
      if (!caras.length) throw new Error('sin fuente');
      return caras.join('');
    });
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
