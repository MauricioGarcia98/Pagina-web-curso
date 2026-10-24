/* Diagramas con estilo dibujado a mano (rough.js, la librería de trazo de Excalidraw).
 * El build convierte cada bloque ```diagrama en <figure class="diagrama" data-spec="{…}">.
 * Este archivo los dibuja como SVG: nodos con ícono, grupos y flechas con etiqueta.
 * El trazo usa currentColor, así funciona en tema claro y oscuro. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  // Paleta de Excalidraw: [trazo, relleno]
  const COLORES = {
    azul: ['#1971c2', '#a5d8ff'], verde: ['#2f9e44', '#b2f2bb'], naranja: ['#e8590c', '#ffd8a8'],
    rojo: ['#e03131', '#ffc9c9'], violeta: ['#6741d9', '#d0bfff'], amarillo: ['#f08c00', '#ffec99'],
    gris: ['#868e96', '#dee2e6'], cian: ['#0c8599', '#99e9f2'], rosa: ['#c2255c', '#fcc2d7']
  };

  // Biblioteca de íconos: trazos en una grilla de 24×24 (stroke, sin relleno)
  const ICONOS = {
    base: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    bucket: 'M3 6h18l-2.2 14.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8z M3 6c0-1.4 4-2.5 9-2.5S21 4.6 21 6 M7 11h10',
    archivo: 'M6 2h8l4 4v16H6z M14 2v4h4 M9 12h6 M9 16h6',
    archivos: 'M8 5h7l3 3v13H8z M15 5v3h3 M5 3h7 M5 3v15 M11 13h4 M11 16h4',
    csv: 'M6 2h8l4 4v16H6z M14 2v4h4 M8 11h8 M8 14h8 M8 17h8 M11 11v6 M14 11v6',
    json: 'M9 4c-2 0-3 1-3 3v2c0 1.5-1 2.5-2 3 1 .5 2 1.5 2 3v2c0 2 1 3 3 3 M15 4c2 0 3 1 3 3v2c0 1.5 1 2.5 2 3-1 .5-2 1.5-2 3v2c0 2-1 3-3 3',
    nube: 'M7 19h10.5a4.5 4.5 0 0 0 .6-9 6.5 6.5 0 0 0-12.6 1.6A3.7 3.7 0 0 0 7 19z',
    servidor: 'M4 3h16v7H4z M4 14h16v7H4z M8 6.5h.01 M8 17.5h.01 M12 6.5h5 M12 17.5h5',
    usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5',
    equipo: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5 M16 4.3a3.5 3.5 0 0 1 0 6.4 M18 14.8c2.4.6 4 2.3 4 5.2',
    movil: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M11 18h2',
    web: 'M3 4h18v16H3z M3 8h18 M6 6h.01 M8.5 6h.01 M7 12h6 M7 15h10',
    api: 'M9 4c-2 0-3 1-3 3v2c0 1.5-1 2.5-2 3 1 .5 2 1.5 2 3v2c0 2 1 3 3 3 M15 4c2 0 3 1 3 3v2c0 1.5 1 2.5 2 3-1 .5-2 1.5-2 3v2c0 2-1 3-3 3 M10 12h.01 M14 12h.01',
    engranaje: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1',
    spark: 'M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z M19 3v4 M17 5h4',
    reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
    orquestador: 'M12 12c0-4 1.5-8 5-9-0.5 4-2 7-5 9z M12 12c4 0 8 1.5 9 5-4-.5-7-2-9-5z M12 12c0 4-1.5 8-5 9 .5-4 2-7 5-9z M12 12c-4 0-8-1.5-9-5 4 .5 7 2 9 5z',
    transformar: 'M3 4h18l-7 8.5V19l-4 2v-8.5z',
    grafico: 'M3 3v18h18 M7 16v-4 M11 16V8 M15 16v-6 M19 16V6',
    dashboard: 'M3 4h18v16H3z M7 16v-3 M10 16v-6 M13 16v-4 M15.5 9l2-2 2 2',
    stream: 'M2 7c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0 M2 12c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0 M2 17c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0',
    lambda: 'M5 21l6.5-11 M7 3h3l9 18',
    candado: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2',
    llave: 'M7.5 15.5a4 4 0 1 0 0-.1 M10.4 12.6L21 2 M17 6l3 3 M15 8l2 2',
    tabla: 'M3 4h18v16H3z M3 9h18 M3 14h18 M9 9v11 M15 9v11',
    notebook: 'M6 3h13v18H6z M6 3v18 M3 7h5 M3 12h5 M3 17h5 M10 8h6 M10 12h6',
    codigo: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',
    git: 'M6 3v12 M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9c0 6-6 6-12 9',
    cubo: 'M12 2l9 5v10l-9 5-9-5V7z M12 12l9-5 M12 12v10 M12 12L3 7',
    capas: 'M12 3l10 5-10 5L2 8z M2 13l10 5 10-5 M2 17.5l10 5 10-5',
    almacen: 'M3 21V8l9-5 9 5v13 M7 21v-8h10v8 M7 16h10',
    alerta: 'M6 9a6 6 0 1 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9z M10 21h4',
    correo: 'M3 5h18v14H3z M3 6l9 7 9-7',
    lupa: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.5 15.5L21 21',
    ml: 'M7 7h10v10H7z M10 2v5 M14 2v5 M10 17v5 M14 17v5 M2 10h5 M2 14h5 M17 10h5 M17 14h5',
    dinero: 'M12 2v20 M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    carrito: 'M2 3h3l2.5 12h11L21 7H6.2 M9 20a1 1 0 1 0 0-.1 M18 20a1 1 0 1 0 0-.1',
    camion: 'M2 6h12v10H2z M14 10h4l3 3v3h-7 M6 18.5a1.5 1.5 0 1 0 0-.1 M17 18.5a1.5 1.5 0 1 0 0-.1',
    avion: 'M10 21l2-7-6-2 1.5-1.5L13 11l4-6c1-1.5 3-1 3 0l-5 6 2.5 5.5L16 18l-3-4-2 7z',
    hospital: 'M3 21V7h18v14 M9 21v-5h6v5 M12 9v6 M9 12h6',
    banco: 'M3 9l9-6 9 6 M5 9v9 M10 9v9 M14 9v9 M19 9v9 M3 21h18 M3 18h18',
    musica: 'M9 18V5l11-2v13 M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M17 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    auto: 'M5 16H3v-4l2-5h14l2 5v4h-2 M3 12h18 M7.5 18a2 2 0 1 0 0-.1 M16.5 18a2 2 0 1 0 0-.1',
    telefono: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z',
    energia: 'M13 2L4 14h7l-1 8 9-12h-7z',
    hotel: 'M3 21V4h12v17 M15 9h6v12 M6 8h2 M10 8h2 M6 12h2 M10 12h2 M6 16h2 M10 16h2 M2 21h20',
    escudo: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z M9 12l2 2 4-4',
    comida: 'M6 2v8a2 2 0 0 0 4 0V2 M8 10v12 M17 2c-2 2-3 5-3 8h4V2 M17 10v12',
    check: 'M4 12l5 5L20 6',
    x: 'M5 5l14 14 M19 5L5 19',
    docker: 'M3 12h17c1 0 2-1 2-2-1 0-2-.5-2.5-1.5C18 11 17 12 3 12z M3 12c0 5 4 8 9 8 6 0 9-3.5 10-8 M5 10h3V7H5z M9 10h3V7H9z M13 10h3V7h-3z M9 6h3V3H9z',
    terraform: 'M3 3l6 3.5v7L3 10z M10 7l6 3.5v7L10 14z M17 10.5l4-2.3v7l-4 2.3z M10 15.5l6 3.5v3l-6-3.5z',
    kafka: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 2.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M12 17.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M19 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M19 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M12 6.5V9 M12 15v2.5 M14.6 10.5l2.6-1.5 M14.6 13.5l2.6 1.5'
  };

  const CELDA_W = 250, CELDA_H = 195, NODO_W = 176, NODO_H = 112, MARGEN = 30;
  const FUENTE = "'Kalam', 'Segoe Print', 'Comic Sans MS', cursive";

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
      const c = vertical ? n.fila : n.col, f = vertical ? n.col : n.fila;
      const w = n.ancho ? Number(n.ancho) : NODO_W;
      n.w = w; n.h = NODO_H;
      n.x = MARGEN + c * CELDA_W + (CELDA_W - w) / 2;
      n.y = MARGEN + 24 + f * CELDA_H + (CELDA_H - NODO_H) / 2;
    }
    return porId;
  }

  // Punto donde la recta centro→destino corta el borde del rectángulo del nodo
  function borde(n, hacia) {
    const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
    const dx = hacia.x - cx, dy = hacia.y - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const sx = (n.w / 2 + 6) / Math.abs(dx || 1e-9), sy = (n.h / 2 + 6) / Math.abs(dy || 1e-9);
    const t = Math.min(sx, sy);
    return { x: cx + dx * t, y: cy + dy * t };
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  }

  function texto(g, str, x, y, { size = 15, bold = false, anchor = 'middle', color = 'currentColor', lh = 1.15 } = {}) {
    const lineas = String(str).split('\n');
    const t = el('text', { x, y, 'text-anchor': anchor, 'font-family': FUENTE, 'font-size': size, 'font-weight': bold ? 700 : 400, fill: color }, g);
    lineas.forEach((l, i) => { const ts = el('tspan', { x, dy: i ? size * lh : 0 }, t); ts.textContent = l; });
    return t;
  }

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
    const W = Math.max(...spec.nodos.map((n) => n.x + n.w), ...grupos.map((g) => g.x + g.w)) + MARGEN;
    const H = Math.max(...spec.nodos.map((n) => n.y + n.h), ...grupos.map((g) => g.y + g.h)) + MARGEN + 10;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, role: 'img', 'aria-label': spec.titulo || 'Diagrama', class: 'dg-svg' });
    svg.style.maxWidth = W + 'px';
    svg.style.minWidth = Math.round(Math.min(W, Math.max(520, W * 0.72))) + 'px';   // muy ancho: se desplaza en vez de achicarse de más
    const rc = rough.svg(svg);
    let semilla = 7;
    const base = () => ({ seed: semilla++, roughness: 1.1, bowing: 0.9, strokeWidth: 1.6 });

    for (const g of grupos) {
      const [st, fi] = COLORES[g.color] || COLORES.gris;
      svg.appendChild(rc.rectangle(g.x, g.y, g.w, g.h, { ...base(), stroke: st, strokeLineDash: [8, 6], fill: fi, fillStyle: 'solid', roughness: 0.8 }));
      svg.lastChild.setAttribute('class', 'dg-grupo');
      texto(svg, g.label, g.x + 12, g.y + 23, { size: 18, bold: true, anchor: 'start', color: st });
    }

    // flechas debajo de los nodos
    for (const f of spec.flechas) {
      const a = porId[f.de], b = porId[f.a];
      const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const p1 = borde(a, cb), p2 = borde(b, ca);
      const st = f.color ? COLORES[f.color][0] : 'currentColor';
      const op = { ...base(), stroke: st, strokeWidth: 1.7 };
      if (f.estilo === 'punteada') op.strokeLineDash = [6, 6];
      svg.appendChild(rc.line(p1.x, p1.y, p2.x, p2.y, op));
      const punta = (from, to) => {
        const ang = Math.atan2(to.y - from.y, to.x - from.x), L = 13, A = 0.45;
        svg.appendChild(rc.line(to.x, to.y, to.x - L * Math.cos(ang - A), to.y - L * Math.sin(ang - A), { ...op, strokeLineDash: undefined }));
        svg.appendChild(rc.line(to.x, to.y, to.x - L * Math.cos(ang + A), to.y - L * Math.sin(ang + A), { ...op, strokeLineDash: undefined }));
      };
      if (!f.sinpunta) punta(p1, p2);
      if (f.doble) punta(p2, p1);
      if (f.label) {
        const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        const lineas = f.label.split('\n');
        const ancho = Math.max(...lineas.map((l) => l.length)) * 8.4 + 14, alto = lineas.length * 18 + 6;
        const horizontal = Math.abs(p2.x - p1.x) >= Math.abs(p2.y - p1.y);
        // horizontal: la etiqueta va arriba de la línea; vertical: a la derecha
        const cx = horizontal ? mx : mx + ancho / 2 + 8, cy = horizontal ? my - alto / 2 - 6 : my;
        el('rect', { x: cx - ancho / 2, y: cy - alto / 2, width: ancho, height: alto, rx: 6, class: 'dg-fondo-etiqueta' }, svg);
        texto(svg, f.label, cx, cy - alto / 2 + 16, { size: 16, color: st, lh: 1.1 });
      }
    }

    for (const n of spec.nodos) {
      const [st, fi] = COLORES[n.color] || ['currentColor', null];
      const op = { ...base(), stroke: st };
      if (fi) Object.assign(op, { fill: fi, fillStyle: 'hachure', hachureGap: 7, fillWeight: 1.2, hachureAngle: -41 });
      const forma = n.forma || 'caja';
      if (forma === 'cilindro') {
        const rx = n.w / 2, ry = 10;
        svg.appendChild(rc.path(`M${n.x} ${n.y + ry} L${n.x} ${n.y + n.h - ry} A${rx} ${ry} 0 0 0 ${n.x + n.w} ${n.y + n.h - ry} L${n.x + n.w} ${n.y + ry}`, op));
        svg.appendChild(rc.ellipse(n.x + rx, n.y + ry, n.w, ry * 2, { ...op, seed: semilla++ }));
      } else if (forma === 'nube') {
        svg.appendChild(rc.ellipse(n.x + n.w / 2, n.y + n.h / 2, n.w + 14, n.h + 8, op));
      } else if (forma === 'nota') {
        svg.appendChild(rc.rectangle(n.x, n.y, n.w, n.h, { ...op, fill: '#ffec99', fillStyle: 'solid', stroke: '#f08c00' }));
      } else {
        const r = 14, x = n.x, y = n.y, w = n.w, h = n.h;
        svg.appendChild(rc.path(`M${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} L${x + r} ${y + h} Q${x} ${y + h} ${x} ${y + h - r} L${x} ${y + r} Q${x} ${y} ${x + r} ${y}`, op));
      }
      // el primer trazo de una figura con relleno es el rayado: se marca para atenuarlo en tema oscuro
      if (fi && forma !== 'nota') svg.querySelectorAll(':scope > g:last-of-type > path:first-child').forEach((p) => p.classList.add('dg-relleno'));
      if (forma === 'cilindro') svg.querySelectorAll(':scope > g:nth-last-of-type(2) > path:first-child').forEach((p) => fi && p.classList.add('dg-relleno'));
      const tieneIcono = n.icono && ICONOS[n.icono];
      if (tieneIcono) {
        const g = el('g', { transform: `translate(${n.x + n.w / 2 - 17} ${n.y + 10}) scale(1.4)`, fill: 'none', stroke: fi ? st : 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
        el('path', { d: ICONOS[n.icono] }, g);
      }
      const lineas = n.label.split('\n').length + (n.sub ? 1 : 0);
      const y0 = tieneIcono ? n.y + 66 : n.y + n.h / 2 - (lineas - 1) * 11 + 6;
      texto(svg, n.label, n.x + n.w / 2, y0, { size: 19, bold: true, color: 'currentColor' });
      if (n.sub) texto(svg, n.sub, n.x + n.w / 2, y0 + n.label.split('\n').length * 21, { size: 15, color: 'currentColor' }).setAttribute('class', 'dg-sub');
    }

    const marco = document.createElement('div');
    marco.className = 'dg-marco';
    marco.appendChild(svg);
    const zoom = document.createElement('button');
    zoom.type = 'button'; zoom.className = 'dg-zoom'; zoom.title = 'Ampliar'; zoom.textContent = '⤢';
    zoom.addEventListener('click', () => ampliar(svg, spec.titulo));
    marco.appendChild(zoom);
    fig.insertBefore(marco, fig.firstChild);
  }

  function ampliar(svg, titulo) {
    const capa = document.createElement('div');
    capa.className = 'dg-capa';
    capa.innerHTML = `<div class="dg-capa-in"><button type="button" class="dg-cerrar" title="Cerrar">✕</button>${titulo ? `<div class="dg-capa-tit"></div>` : ''}</div>`;
    if (titulo) capa.querySelector('.dg-capa-tit').textContent = titulo;
    const copia = svg.cloneNode(true);
    copia.removeAttribute('width'); copia.style.maxWidth = 'none';
    capa.firstChild.appendChild(copia);
    const cerrar = () => { capa.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') cerrar(); };
    capa.addEventListener('click', (e) => { if (e.target === capa || e.target.classList.contains('dg-cerrar')) cerrar(); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(capa);
  }

  window.Diagramas = { dibujar: (root) => (root || document).querySelectorAll('figure.diagrama').forEach(dibujar), ICONOS, COLORES };
})();
