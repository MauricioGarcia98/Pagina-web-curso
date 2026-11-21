/* Ilustraciones propias para los diagramas, dibujadas en código con rough.js (el trazo de Excalidraw).
 * Cada dibujo vive en una caja de 48×48 y se describe con operaciones simples:
 *   ['rect', x, y, w, h, relleno, r?]  ['circ', cx, cy, diámetro, relleno]  ['elip', cx, cy, w, h, relleno]
 *   ['path', d, relleno]  ['poli', [[x,y],…], relleno]  ['linea', x1, y1, x2, y2]  ['texto', x, y, str, tamaño]
 * Rellenos: 'c' claro (blanco; oscuro en tema oscuro), 'm' tono medio del color del nodo, 't' color del trazo,
 * 'n' sin relleno, o un color fijo (#rrggbb). Un último objeto opcional { g: grosor, color } ajusta el trazo.
 * Son dibujos originales: no copian logos ni bibliotecas de terceros. */
(function () {
  const AM = '#ffd43b', VE = '#8ce99a', RO = '#ffa8a8', OS = '#343a40', AZ = '#74c0fc';

  // engranaje: polígono con dientes calculado
  const engranaje = (() => {
    const pts = [], n = 8, R = 19, r = 14.5;
    for (let i = 0; i < n * 2; i++) {
      const a0 = (i / (n * 2)) * Math.PI * 2, a1 = ((i + 1) / (n * 2)) * Math.PI * 2, rad = i % 2 ? r : R;
      pts.push([24 + rad * Math.cos(a0 + 0.06), 24 + rad * Math.sin(a0 + 0.06)], [24 + rad * Math.cos(a1 - 0.06), 24 + rad * Math.sin(a1 - 0.06)]);
    }
    return pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  })();

  const pagina = (dx = 0, dy = 0, relleno = 'c') => [
    ['path', `M${12 + dx} ${6 + dy} H${30 + dx} L${38 + dx} ${14 + dy} V${42 + dy} H${12 + dx} Z`, relleno],
    ['path', `M${30 + dx} ${6 + dy} V${14 + dy} H${38 + dx}`, 'n']
  ];
  const ventana = (relleno = 'c') => [['rect', 5, 9, 38, 30, relleno, 4], ['rect', 5, 9, 38, 8, 'm', 4]];

  const D = {
    base: [
      ['path', 'M9 12 V36 A15 5 0 0 0 39 36 V12', 'm'],
      ['path', 'M9 20 A15 5 0 0 0 39 20', 'n'], ['path', 'M9 28 A15 5 0 0 0 39 28', 'n'],
      ['elip', 24, 12, 30, 10, 'c']
    ],
    servidor: [
      ['rect', 7, 7, 34, 15, 'c', 3], ['rect', 7, 26, 34, 15, 'c', 3],
      ['circ', 13, 14.5, 4, VE], ['circ', 13, 33.5, 4, VE],
      ['linea', 21, 14.5, 35, 14.5], ['linea', 21, 33.5, 35, 33.5]
    ],
    usuario: [['path', 'M9 43 C9 30 39 30 39 43 Z', 'm'], ['circ', 24, 16, 15, 'c']],
    equipo: [
      ['path', 'M22 40 C22 30 44 30 44 40 Z', 'm'], ['circ', 33, 18, 11, 'm'],
      ['path', 'M4 43 C4 31 30 31 30 43 Z', 'c'], ['circ', 17, 19, 13, 'c']
    ],
    nube: [['path', 'M13 36 H36 A9 9 0 0 0 36 18 A12 12 0 0 0 14 19 A8.5 8.5 0 0 0 13 36 Z', 'c']],
    archivo: [...pagina(), ['linea', 17, 22, 33, 22], ['linea', 17, 28, 33, 28], ['linea', 17, 34, 27, 34]],
    documento: [...pagina(), ['rect', 17, 19, 16, 8, 'm', 2], ['linea', 17, 32, 33, 32], ['linea', 17, 37, 28, 37]],
    archivos: [...pagina(4, -2, 'm'), ...pagina(-4, 2), ['linea', 13, 26, 29, 26], ['linea', 13, 32, 29, 32]],
    csv: [...pagina(), ['rect', 16, 20, 18, 16, 'm'], ['linea', 22, 20, 22, 36], ['linea', 28, 20, 28, 36], ['linea', 16, 26, 34, 26], ['linea', 16, 31, 34, 31]],
    tabla: [
      ['rect', 5, 10, 38, 28, 'c', 3], ['rect', 5, 10, 38, 8, 'm', 3],
      ['linea', 18, 10, 18, 38], ['linea', 31, 10, 31, 38], ['linea', 5, 25, 43, 25], ['linea', 5, 31.5, 43, 31.5]
    ],
    carpeta: [['path', 'M5 13 V39 H43 V17 H23 L19 11 H7 Z', AM], ['path', 'M5 20 H43', 'n']],
    bucket: [['path', 'M9 13 L14 41 H34 L39 13', 'm'], ['elip', 24, 13, 30, 9, 'c'], ['path', 'M12 26 Q24 30 36 26', 'n']],
    almacen: [['poli', [[5, 21], [24, 8], [43, 21]], 'm'], ['rect', 9, 21, 30, 20, 'c'], ['rect', 19, 29, 10, 12, 'm'], ['linea', 13, 26, 17, 26], ['linea', 31, 26, 35, 26]],
    capas: [
      ['poli', [[24, 30], [43, 37], [24, 44], [5, 37]], 'm'],
      ['poli', [[24, 19], [43, 26], [24, 33], [5, 26]], 'm'],
      ['poli', [[24, 8], [43, 15], [24, 22], [5, 15]], 'c']
    ],
    lupa: [['linea', 29, 29, 41, 41, { g: 2.4 }], ['circ', 21, 21, 23, 'c'], ['path', 'M14 18 A8 8 0 0 1 20 13', 'n']],
    codigo: [...ventana(), ['path', 'M18 22 L12 28 L18 34', 'n'], ['path', 'M30 22 L36 28 L30 34', 'n'], ['linea', 26, 21, 22, 35]],
    terminal: [['rect', 5, 9, 38, 30, OS, 4], ['path', 'M11 19 L17 24 L11 29', 'n', { color: '#e9ecef' }], ['linea', 20, 30, 29, 30, { color: '#e9ecef' }]],
    notebook: [['rect', 11, 5, 30, 38, 'c', 3], ['circ', 11, 12, 5, 'm'], ['circ', 11, 24, 5, 'm'], ['circ', 11, 36, 5, 'm'], ['rect', 18, 12, 17, 8, 'm', 2], ['linea', 18, 27, 35, 27], ['linea', 18, 33, 30, 33]],
    reloj: [['circ', 24, 24, 36, 'c'], ['linea', 24, 24, 24, 13, { g: 1.3 }], ['linea', 24, 24, 31, 28, { g: 1.3 }], ['circ', 24, 24, 3.5, 't'], ['linea', 24, 7, 24, 9.5], ['linea', 41, 24, 38.5, 24], ['linea', 24, 41, 24, 38.5], ['linea', 7, 24, 9.5, 24]],
    calendario: [['rect', 7, 10, 34, 31, 'c', 3], ['rect', 7, 10, 34, 9, RO, 3], ['linea', 16, 6, 16, 13], ['linea', 32, 6, 32, 13], ['rect', 13, 24, 6, 5, 'm'], ['rect', 21, 24, 6, 5, 'n'], ['rect', 29, 24, 6, 5, 'n'], ['rect', 13, 32, 6, 5, 'n'], ['rect', 21, 32, 6, 5, 'n']],
    engranaje: [['poli', engranaje, 'm'], ['circ', 24, 24, 12, 'c']],
    alerta: [['poli', [[24, 6], [44, 41], [4, 41]], AM, { color: '#e67700' }], ['linea', 24, 17, 24, 29, { g: 1.5, color: '#e67700' }], ['circ', 24, 35, 3.5, '#e67700', { color: '#e67700' }]],
    check: [['circ', 24, 24, 36, VE, { color: '#2b8a3e' }], ['path', 'M15 25 L21.5 31.5 L33.5 17.5', 'n', { g: 1.6, color: '#2b8a3e' }]],
    x: [['circ', 24, 24, 36, RO, { color: '#c92a2a' }], ['linea', 17, 17, 31, 31, { g: 1.6, color: '#c92a2a' }], ['linea', 31, 17, 17, 31, { g: 1.6, color: '#c92a2a' }]],
    escudo: [['path', 'M24 5 L39 11 V23 C39 33 32 40 24 43 C16 40 9 33 9 23 V11 Z', 'm'], ['path', 'M17 24 L22 29 L31 19', 'n', { g: 1.5 }]],
    candado: [['path', 'M16 23 V16 A8 8 0 0 1 32 16 V23', 'n', { g: 1.3 }], ['rect', 10, 22, 28, 20, AM, 3], ['circ', 24, 30, 5, 't'], ['linea', 24, 31, 24, 36]],
    llave: [['linea', 23, 24, 43, 24, { g: 1.3 }], ['linea', 36, 24, 36, 31], ['linea', 41, 24, 41, 30], ['circ', 15, 24, 17, AM], ['circ', 13, 24, 4, 'c']],
    dashboard: [['rect', 4, 7, 40, 28, 'c', 3], ['rect', 9, 22, 5, 8, 'm'], ['rect', 17, 16, 5, 14, 'm'], ['rect', 25, 19, 5, 11, 'm'], ['circ', 37, 18, 8, AZ], ['linea', 24, 35, 24, 41], ['linea', 16, 42, 32, 42]],
    monitor: [['rect', 4, 7, 40, 28, 'c', 3], ['path', 'M9 28 L17 20 L24 25 L33 14 L39 18', 'n'], ['linea', 24, 35, 24, 41], ['linea', 16, 42, 32, 42]],
    grafico: [['path', 'M7 7 V41 H43', 'n'], ['rect', 12, 27, 7, 14, 'm'], ['rect', 22, 19, 7, 22, 'm'], ['rect', 32, 11, 7, 30, 'c']],
    movil: [['rect', 13, 4, 22, 40, 'c', 5], ['rect', 16.5, 9, 15, 26, 'm', 2], ['circ', 24, 39.5, 3, 't']],
    web: [...ventana(), ['circ', 10, 13, 2.5, 't'], ['circ', 15, 13, 2.5, 't'], ['rect', 10, 22, 13, 11, 'm', 2], ['linea', 27, 24, 38, 24], ['linea', 27, 29, 38, 29], ['linea', 27, 34, 34, 34]],
    correo: [['rect', 5, 11, 38, 27, 'c', 3], ['path', 'M5 12 L24 27 L43 12', 'n']],
    mensaje: [['path', 'M6 9 H42 V33 H20 L11 41 V33 H6 Z', 'c'], ['linea', 12, 17, 36, 17], ['linea', 12, 24, 29, 24]],
    cola: [['rect', 4, 15, 9, 18, 'm', 2], ['rect', 16, 15, 9, 18, 'm', 2], ['rect', 28, 15, 9, 18, 'c', 2], ['path', 'M39 24 H46 M42 20 L46 24 L42 28', 'n']],
    stream: [['path', 'M4 15 Q12 9 20 15 T36 15', 'n'], ['path', 'M4 24 Q12 18 20 24 T36 24', 'n'], ['path', 'M4 33 Q12 27 20 33 T36 33', 'n'], ['path', 'M38 18 L44 24 L38 30', 'n', { g: 1.4 }]],
    transformar: [['rect', 3, 16, 15, 15, 'c', 2], ['path', 'M21 23.5 H30 M26 19.5 L30 23.5 L26 27.5', 'n'], ['circ', 38, 23.5, 15, 'm']],
    flujo: [['rect', 3, 18, 12, 12, 'c', 2], ['rect', 33, 6, 12, 12, 'm', 2], ['rect', 33, 30, 12, 12, 'm', 2], ['path', 'M15 24 H24 V12 H33', 'n'], ['path', 'M24 24 V36 H33', 'n']],
    orquestador: [['circ', 9, 24, 10, 'c'], ['circ', 25, 11, 10, 'm'], ['circ', 25, 37, 10, 'm'], ['circ', 41, 24, 10, 'c'], ['linea', 13, 21, 21, 14], ['linea', 13, 27, 21, 34], ['linea', 29, 14, 37, 21], ['linea', 29, 34, 37, 27]],
    reglas: [['rect', 9, 8, 30, 35, 'c', 3], ['rect', 18, 5, 12, 7, 'm', 2], ['path', 'M14 20 L16.5 22.5 L20.5 17.5', 'n'], ['linea', 24, 20, 34, 20], ['path', 'M14 30 L16.5 32.5 L20.5 27.5', 'n'], ['linea', 24, 30, 34, 30]],
    prueba: [['path', 'M19 6 V18 L9 37 C7.5 40.5 9.5 42 12.5 42 H35.5 C38.5 42 40.5 40.5 39 37 L29 18 V6', 'c'], ['path', 'M13.5 31 H34.5 L38.5 38.5 C39 40.5 37.5 41 35.5 41 H12.5 C10.5 41 9 40.5 9.5 38.5 Z', 'm'], ['linea', 16, 6, 32, 6]],
    etiqueta: [['path', 'M6 7 H24 L42 25 L25 42 L6 24 Z', 'm'], ['circ', 15, 16, 6, 'c']],
    cubo: [['poli', [[24, 6], [41, 15], [24, 24], [7, 15]], 'c'], ['poli', [[7, 15], [24, 24], [24, 43], [7, 34]], 'm'], ['poli', [[41, 15], [24, 24], [24, 43], [41, 34]], 'm']],
    dinero: [['rect', 3, 13, 42, 23, VE, 3], ['circ', 24, 24.5, 11, 'c'], ['circ', 9.5, 19, 2.5, 't'], ['circ', 38.5, 30, 2.5, 't']],
    carrito: [['path', 'M3 9 H9 L14 32 H38', 'n'], ['poli', [[11, 15], [43, 15], [39, 28], [13.5, 28]], 'm'], ['circ', 17, 38, 6, 'c'], ['circ', 35, 38, 6, 'c']],
    ml: [['linea', 24, 6, 24, 12], ['circ', 24, 6, 4, AM], ['rect', 9, 12, 30, 25, 'c', 6], ['circ', 18, 23, 6, 't'], ['circ', 30, 23, 6, 't'], ['linea', 18, 31, 30, 31], ['rect', 4, 20, 5, 9, 'm', 2], ['rect', 39, 20, 5, 9, 'm', 2]],
    libro: [['path', 'M24 12 C18 8 10 8 5 10 V39 C10 37 18 37 24 41 Z', 'c'], ['path', 'M24 12 C30 8 38 8 43 10 V39 C38 37 30 37 24 41 Z', 'm'], ['linea', 9, 17, 19, 17], ['linea', 9, 23, 19, 23]],
    api: [['rect', 4, 12, 40, 24, 'm', 7], ['texto', 24, 29.5, 'API', 14]],
    chispa: [['path', 'M22 6 C23 17 27 21 38 22 C27 23 23 27 22 40 C21 27 17 23 6 22 C17 21 21 17 22 6 Z', AM], ['path', 'M38 5 C38.5 9 40 10.5 44 11 C40 11.5 38.5 13 38 17 C37.5 13 36 11.5 32 11 C36 10.5 37.5 9 38 5 Z', 'c']],
    git: [['linea', 13, 12, 13, 36], ['path', 'M13 30 C13 22 34 26 34 18', 'n'], ['circ', 13, 10, 8, 'c'], ['circ', 13, 38, 8, 'm'], ['circ', 34, 16, 8, 'm']],
    red: [['path', 'M24 15 V24 M10 32 V24 H38 V32', 'n'], ['rect', 16, 4, 16, 11, 'c', 2], ['rect', 2, 32, 16, 11, 'm', 2], ['rect', 30, 32, 16, 11, 'm', 2]],
    internet: [['circ', 24, 24, 36, 'c'], ['elip', 24, 24, 15, 36, 'n'], ['linea', 6, 24, 42, 24], ['path', 'M9 15 Q24 19 39 15', 'n'], ['path', 'M9 33 Q24 29 39 33', 'n']]
  };
  // sinónimos en español que ya usan las lecciones
  const SIN = { mundo: 'internet', cerebro: 'ml', robot: 'ml', ia: 'ml', datos: 'base', baseDatos: 'base', persona: 'usuario', cliente: 'usuario', equipo: 'equipo', archivo2: 'archivos', hoja: 'csv', tablero: 'dashboard', informe: 'dashboard', pantalla: 'monitor', telefono: 'movil', navegador: 'web', sobre: 'correo', chat: 'mensaje', webhook: 'api', seguridad: 'escudo', pipeline: 'flujo', cuaderno: 'notebook', lago: 'almacen', costo: 'dinero', banco2: 'dinero' };

  const NS = 'http://www.w3.org/2000/svg';
  const nombreDe = (n) => (D[n] ? n : SIN[n] && D[SIN[n]] ? SIN[n] : null);

  // g: grupo SVG destino; rc: rough.svg; x,y: esquina; lado: tamaño en px; tinta: color del trazo; medio: tono del relleno
  function dibujar(g, rc, nombre, x, y, lado, { tinta = 'currentColor', medio = '#ced4da', semilla = 1 } = {}) {
    const ops = D[nombreDe(nombre)];
    if (!ops) return false;
    const k = lado / 48;
    const cont = document.createElementNS(NS, 'g');
    cont.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
    cont.setAttribute('class', 'dg-dibujo');
    g.appendChild(cont);
    let s = semilla;
    const color = (f) => (f === 'c' ? '#fffffe' : f === 'm' ? medio : f === 't' ? tinta : f === 'n' ? undefined : f);
    for (const op of ops) {
      const extra = typeof op[op.length - 1] === 'object' && !Array.isArray(op[op.length - 1]) ? op[op.length - 1] : {};
      const base = { seed: s++, roughness: 0.55, bowing: 0.6, stroke: extra.color || tinta, strokeWidth: (extra.g || 1) * 1.75 / k };
      const conRelleno = (f) => (color(f) ? { ...base, fill: color(f), fillStyle: 'solid' } : base);
      let nodo = null;
      switch (op[0]) {
        case 'rect': {
          const [, rx, ry, w, h, f, r = 0] = op;
          nodo = r ? rc.path(`M${rx + r} ${ry} H${rx + w - r} Q${rx + w} ${ry} ${rx + w} ${ry + r} V${ry + h - r} Q${rx + w} ${ry + h} ${rx + w - r} ${ry + h} H${rx + r} Q${rx} ${ry + h} ${rx} ${ry + h - r} V${ry + r} Q${rx} ${ry} ${rx + r} ${ry} Z`, conRelleno(f))
            : rc.rectangle(rx, ry, w, h, conRelleno(f));
          break;
        }
        case 'circ': nodo = rc.circle(op[1], op[2], op[3], { ...conRelleno(op[4]), roughness: op[3] < 8 ? 0.2 : 0.5 }); break;
        case 'elip': nodo = rc.ellipse(op[1], op[2], op[3], op[4], conRelleno(op[5])); break;
        case 'path': nodo = rc.path(op[1], conRelleno(op[2])); break;
        case 'poli': nodo = rc.polygon(op[1], conRelleno(op[2])); break;
        case 'linea': nodo = rc.line(op[1], op[2], op[3], op[4], base); break;
        case 'texto': {
          nodo = document.createElementNS(NS, 'text');
          Object.entries({ x: op[1], y: op[2], 'text-anchor': 'middle', 'font-family': 'Inter, system-ui, sans-serif', 'font-weight': 800, 'font-size': op[4], fill: tinta, class: 'dg-sigla' }).forEach(([a, v]) => nodo.setAttribute(a, v));
          nodo.textContent = op[3];
          break;
        }
      }
      if (nodo) cont.appendChild(nodo);
    }
    return true;
  }

  window.Dibujos = { tiene: (n) => !!nombreDe(n), dibujar, nombres: () => Object.keys(D) };
})();
