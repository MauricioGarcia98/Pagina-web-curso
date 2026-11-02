/* Objetos visuales del Power BI de práctica: tipos, pozos de campos, panel Formato y dibujo en SVG.
 * Nombres, pozos y secciones de formato tomados de la documentación de Power BI (learn.microsoft.com/power-bi/visuals).
 */
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const SVG = (w, h, cuerpo) => `<svg viewBox="0 0 20 20" width="${w}" height="${h}">${cuerpo}</svg>`;
  const R = (x, y, w, h, o = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="currentColor" opacity="${o}"/>`;
  const ICO = {
    barApilada: SVG(20, 20, R(3, 3, 6, 3) + R(9, 3, 5, 3, 0.5) + R(3, 8.5, 9, 3) + R(12, 8.5, 5, 3, 0.5) + R(3, 14, 4, 3) + R(7, 14, 4, 3, 0.5)),
    columnaApilada: SVG(20, 20, R(3, 9, 3, 5) + R(3, 4, 3, 5, 0.5) + R(8.5, 6, 3, 8) + R(8.5, 2, 3, 4, 0.5) + R(14, 10, 3, 4) + R(14, 7, 3, 3, 0.5) + R(2, 15, 16, 1)),
    barAgrupada: SVG(20, 20, R(3, 3, 9, 2) + R(3, 5.5, 13, 2, 0.5) + R(3, 10, 12, 2) + R(3, 12.5, 6, 2, 0.5) + R(2, 2, 1, 15)),
    columnaAgrupada: SVG(20, 20, R(3, 7, 2, 8) + R(5.5, 4, 2, 11, 0.5) + R(10, 9, 2, 6) + R(12.5, 6, 2, 9, 0.5) + R(2, 15, 16, 1)),
    bar100: SVG(20, 20, R(3, 3, 8, 3) + R(11, 3, 6, 3, 0.5) + R(3, 8.5, 5, 3) + R(8, 8.5, 9, 3, 0.5) + R(3, 14, 11, 3) + R(14, 14, 3, 3, 0.5)),
    columna100: SVG(20, 20, R(3, 8, 3, 7) + R(3, 2, 3, 6, 0.5) + R(8.5, 5, 3, 10) + R(8.5, 2, 3, 3, 0.5) + R(14, 11, 3, 4) + R(14, 2, 3, 9, 0.5)),
    linea: SVG(20, 20, '<polyline points="2,15 7,9 11,12 18,4" fill="none" stroke="currentColor" stroke-width="1.6"/>'),
    area: SVG(20, 20, '<polygon points="2,17 2,13 7,8 11,11 18,4 18,17" fill="currentColor" opacity=".5"/><polyline points="2,13 7,8 11,11 18,4" fill="none" stroke="currentColor" stroke-width="1.3"/>'),
    areaApilada: SVG(20, 20, '<polygon points="2,17 2,11 7,7 11,9 18,3 18,17" fill="currentColor" opacity=".35"/><polygon points="2,17 2,14 7,12 11,13 18,10 18,17" fill="currentColor" opacity=".8"/>'),
    lineaColumna: SVG(20, 20, R(3, 9, 3, 6) + R(8.5, 6, 3, 9) + R(14, 11, 3, 4) + '<polyline points="3,6 9,3 16,7" fill="none" stroke="currentColor" stroke-width="1.5"/>'),
    cascada: SVG(20, 20, R(2, 8, 3, 7) + R(6, 5, 3, 3, 0.6) + R(10, 5, 3, 5, 0.4) + R(14, 6, 3, 9)),
    embudo: SVG(20, 20, R(2, 3, 16, 3) + R(4, 8, 12, 3, 0.75) + R(6.5, 13, 7, 3, 0.5)),
    dispersion: SVG(20, 20, '<circle cx="5" cy="13" r="1.6" fill="currentColor"/><circle cx="9" cy="8" r="2.4" fill="currentColor" opacity=".6"/><circle cx="14" cy="11" r="1.4" fill="currentColor"/><circle cx="15" cy="5" r="2" fill="currentColor" opacity=".6"/><path d="M2 2v16h16" fill="none" stroke="currentColor"/>'),
    mapa: SVG(20, 20, '<path d="M2 4l5-2 6 2 5-2v14l-5 2-6-2-5 2z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="9" r="2.2" fill="currentColor"/><circle cx="13" cy="12" r="1.4" fill="currentColor" opacity=".6"/>'),
    circular: SVG(20, 20, '<circle cx="10" cy="10" r="7.5" fill="currentColor" opacity=".45"/><path d="M10 10V2.5A7.5 7.5 0 0 1 17.2 12z" fill="currentColor"/>'),
    anillo: SVG(20, 20, '<circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="26 15"/>'),
    treemap: SVG(20, 20, R(2, 2, 9, 16) + R(12, 2, 6, 9, 0.6) + R(12, 12, 6, 6, 0.4)),
    medidor: SVG(20, 20, '<path d="M3 14a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="3" opacity=".35"/><path d="M3 14a7 7 0 0 1 10-6.3" fill="none" stroke="currentColor" stroke-width="3"/>'),
    tarjeta: SVG(20, 20, '<rect x="2" y="5" width="16" height="10" rx="1.5" fill="none" stroke="currentColor"/><text x="10" y="13" font-size="7" text-anchor="middle" fill="currentColor" font-weight="700">123</text>'),
    tarjetaFilas: SVG(20, 20, '<path d="M3 4h10M3 7h6M3 11h10M3 14h6" stroke="currentColor" stroke-width="1.6"/><path d="M2 3v13" stroke="currentColor" stroke-width="1" opacity=".5"/>'),
    kpi: SVG(20, 20, '<polyline points="2,15 6,12 10,13 14,8" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".6"/><path d="M14 4l4 5h-8z" fill="currentColor"/>'),
    segmentacion: SVG(20, 20, '<path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor"/><circle cx="7" cy="5" r="1.8" fill="currentColor"/><circle cx="13" cy="10" r="1.8" fill="currentColor"/><circle cx="9" cy="15" r="1.8" fill="currentColor"/>'),
    tabla: SVG(20, 20, '<rect x="2.5" y="3.5" width="15" height="13" fill="none" stroke="currentColor"/><path d="M2.5 7.5h15M2.5 11.5h15M8 3.5v13" stroke="currentColor"/>'),
    matriz: SVG(20, 20, '<rect x="2.5" y="3.5" width="15" height="13" fill="none" stroke="currentColor"/><path d="M2.5 7.5h15M7 3.5v13M12 7.5v9" stroke="currentColor"/>' + R(2.5, 3.5, 4.5, 13, 0.25)),
    texto: SVG(20, 20, '<rect x="2.5" y="4.5" width="15" height="11" fill="none" stroke="currentColor"/><path d="M6 8h8M10 8v5" stroke="currentColor" stroke-width="1.4"/>'),
  };
  const CART_COL = [['x', 'Eje X', 1, 'cat'], ['y', 'Eje Y', 5, 'valor'], ['leyenda', 'Leyenda', 1, 'cat'], ['info', 'Información sobre herramientas', 3, 'valor']];
  const CART_BAR = [['x', 'Eje Y', 1, 'cat'], ['y', 'Eje X', 5, 'valor'], ['leyenda', 'Leyenda', 1, 'cat'], ['info', 'Información sobre herramientas', 3, 'valor']];
  const TIPOS = {
    barApilada: { n: 'Gráfico de barras apiladas', pozos: CART_BAR, g: 'cart', horiz: true, apila: 1 },
    columnaApilada: { n: 'Gráfico de columnas apiladas', pozos: CART_COL, g: 'cart', apila: 1 },
    barAgrupada: { n: 'Gráfico de barras agrupadas', pozos: CART_BAR, g: 'cart', horiz: true },
    columnaAgrupada: { n: 'Gráfico de columnas agrupadas', pozos: CART_COL, g: 'cart' },
    bar100: { n: 'Gráfico de barras 100% apiladas', pozos: CART_BAR, g: 'cart', horiz: true, apila: 100 },
    columna100: { n: 'Gráfico de columnas 100% apiladas', pozos: CART_COL, g: 'cart', apila: 100 },
    linea: { n: 'Gráfico de líneas', pozos: [['x', 'Eje X', 1, 'cat'], ['y', 'Eje Y', 5, 'valor'], ['leyenda', 'Leyenda', 1, 'cat'], ['info', 'Información sobre herramientas', 3, 'valor']], g: 'cart', linea: true },
    area: { n: 'Gráfico de áreas', pozos: [['x', 'Eje X', 1, 'cat'], ['y', 'Eje Y', 5, 'valor'], ['leyenda', 'Leyenda', 1, 'cat']], g: 'cart', linea: true, area: true },
    areaApilada: { n: 'Gráfico de áreas apiladas', pozos: [['x', 'Eje X', 1, 'cat'], ['y', 'Eje Y', 5, 'valor'], ['leyenda', 'Leyenda', 1, 'cat']], g: 'cart', linea: true, area: true, apila: 1 },
    lineaColumna: { n: 'Gráfico de líneas y columnas agrupadas', pozos: [['x', 'Eje X', 1, 'cat'], ['y', 'Eje Y de columna', 3, 'valor'], ['linea', 'Eje Y de línea', 3, 'valor']], g: 'cart' },
    cascada: { n: 'Gráfico de cascada', pozos: [['x', 'Categoría', 1, 'cat'], ['y', 'Eje Y', 1, 'valor']], g: 'cart' },
    embudo: { n: 'Embudo', pozos: [['x', 'Categoría', 1, 'cat'], ['y', 'Valores', 1, 'valor']], g: 'parte' },
    dispersion: { n: 'Gráfico de dispersión', pozos: [['detalle', 'Valores', 1, 'cat'], ['ex', 'Eje X', 1, 'valor'], ['ey', 'Eje Y', 1, 'valor'], ['leyenda', 'Leyenda', 1, 'cat'], ['tam', 'Tamaño', 1, 'valor']], g: 'disp' },
    mapa: { n: 'Mapa', pozos: [['x', 'Ubicación', 1, 'cat'], ['y', 'Tamaño de burbuja', 1, 'valor']], g: 'parte', mapa: true },
    circular: { n: 'Gráfico circular', pozos: [['x', 'Leyenda', 1, 'cat'], ['y', 'Valores', 1, 'valor']], g: 'parte' },
    anillo: { n: 'Gráfico de anillos', pozos: [['x', 'Leyenda', 1, 'cat'], ['y', 'Valores', 1, 'valor']], g: 'parte' },
    treemap: { n: 'Gráfico de rectángulos', pozos: [['x', 'Categoría', 1, 'cat'], ['y', 'Valores', 1, 'valor']], g: 'parte' },
    medidor: { n: 'Medidor', pozos: [['y', 'Valor', 1, 'valor'], ['min', 'Valor mínimo', 1, 'valor'], ['max', 'Valor máximo', 1, 'valor'], ['meta', 'Valor de destino', 1, 'valor']], g: 'medidor' },
    tarjeta: { n: 'Tarjeta', pozos: [['valores', 'Campos', 1, 'valor']], g: 'tarjeta' },
    tarjetaFilas: { n: 'Tarjeta de varias filas', pozos: [['valores', 'Campos', 8, 'valor']], g: 'tarjeta' },
    kpi: { n: 'KPI', pozos: [['y', 'Valor', 1, 'valor'], ['x', 'Eje de tendencia', 1, 'cat'], ['meta', 'Destino', 1, 'valor']], g: 'kpi' },
    segmentacion: { n: 'Segmentación de datos', pozos: [['x', 'Campo', 1, 'cat']], g: 'seg' },
    tabla: { n: 'Tabla', pozos: [['cols', 'Columnas', 20, 'mixto']], g: 'tabla' },
    matriz: { n: 'Matriz', pozos: [['x', 'Filas', 3, 'cat'], ['leyenda', 'Columnas', 1, 'cat'], ['y', 'Valores', 5, 'valor']], g: 'tabla' },
    texto: { n: 'Cuadro de texto', pozos: [], g: 'texto', oculto: true },
  };
  // compatibilidad con informes guardados antes de esta versión
  const ALIAS = { card: 'tarjeta', column: 'columnaAgrupada', bar: 'barAgrupada', line: 'linea', donut: 'anillo', table: 'tabla', matrix: 'matriz', slicer: 'segmentacion' };

  // ------------------------------------------------------------------ panel Formato
  const P = (k, n, tipo, def, opts) => ({ k, n, tipo, def, opts });
  const SECC = {
    ejeX: { n: 'Eje X', p: [P('mostrar', 'Mostrar', 'bool', true), P('titulo', 'Título', 'bool', true), P('tam', 'Tamaño de fuente', 'num', 9), P('color', 'Color', 'color', '#605E5C')] },
    ejeY: { n: 'Eje Y', p: [P('mostrar', 'Mostrar', 'bool', true), P('titulo', 'Título', 'bool', true), P('cuadricula', 'Líneas de cuadrícula', 'bool', true), P('tam', 'Tamaño de fuente', 'num', 9), P('color', 'Color', 'color', '#605E5C'), P('inicio', 'Inicio del rango', 'texto', ''), P('fin', 'Fin del rango', 'texto', '')] },
    leyenda: { n: 'Leyenda', p: [P('mostrar', 'Mostrar', 'bool', true), P('pos', 'Posición', 'sel', 'Arriba', ['Arriba', 'Abajo', 'Derecha']), P('tam', 'Tamaño de fuente', 'num', 9)] },
    colores: { n: 'Colores', p: [P('color', 'Color predeterminado', 'color', ''), P('aumento', 'Aumento (cascada)', 'color', '#1AAB40'), P('disminucion', 'Disminución (cascada)', 'color', '#D64554'), P('total', 'Total (cascada)', 'color', '#118DFF')] },
    etiquetas: { n: 'Etiquetas de datos', p: [P('mostrar', 'Mostrar', 'bool', false), P('unidades', 'Unidades de visualización', 'sel', 'Automático', ['Automático', 'Ninguno', 'Miles', 'Millones', 'Miles de millones']), P('decimales', 'Posiciones decimales', 'num', ''), P('tam', 'Tamaño de fuente', 'num', 9), P('color', 'Color', 'color', '#252423')] },
    valorLlamada: { n: 'Valor de llamada', p: [P('tam', 'Tamaño de fuente (0 = automático)', 'num', 0), P('color', 'Color', 'color', '#252423'), P('unidades', 'Unidades de visualización', 'sel', 'Automático', ['Automático', 'Ninguno', 'Miles', 'Millones', 'Miles de millones']), P('decimales', 'Posiciones decimales', 'num', '')] },
    etiquetaCat: { n: 'Etiqueta de categoría', p: [P('mostrar', 'Mostrar', 'bool', true), P('tam', 'Tamaño de fuente', 'num', 12), P('color', 'Color', 'color', '#605E5C')] },
    segmentacion: { n: 'Configuración de segmentación', p: [P('estilo', 'Estilo', 'sel', 'Lista vertical', ['Lista vertical', 'Lista desplegable', 'Mosaico']), P('unica', 'Selección única', 'bool', false), P('todo', 'Mostrar la opción "Seleccionar todo"', 'bool', false), P('buscar', 'Buscar', 'bool', false)] },
    cuadricula: { n: 'Estilo de tabla', p: [P('estilo', 'Valor preestablecido', 'sel', 'Predeterminado', ['Predeterminado', 'Mínimo', 'Filas con bandas', 'Negrita', 'Alto contraste']), P('tam', 'Tamaño del texto', 'num', 11), P('totales', 'Totales', 'bool', true), P('barras', 'Barras de datos en los valores', 'bool', false)] },
    medidor: { n: 'Eje del medidor', p: [P('min', 'Mínimo (si no hay campo)', 'texto', ''), P('max', 'Máximo (si no hay campo)', 'texto', ''), P('relleno', 'Color de relleno', 'color', '#118DFF'), P('destino', 'Color del destino', 'color', '#252423')] },
    kpiColores: { n: 'Objetivo', p: [P('bien', 'Color si cumple', 'color', '#1AAB40'), P('mal', 'Color si no cumple', 'color', '#D64554'), P('alto', 'Alto es bueno', 'bool', true)] },
    lineas: { n: 'Líneas', p: [P('grosor', 'Ancho del trazo', 'num', 2), P('marcadores', 'Marcadores', 'bool', true), P('suave', 'Suavizado', 'bool', false)] },
    texto: { n: 'Texto', p: [P('tam', 'Tamaño de fuente', 'num', 14), P('color', 'Color', 'color', '#252423'), P('negrita', 'Negrita', 'bool', false), P('alineacion', 'Alineación', 'sel', 'Izquierda', ['Izquierda', 'Centro', 'Derecha'])] },
    // generales
    titulo: { n: 'Título', general: true, p: [P('mostrar', 'Mostrar', 'bool', true), P('texto', 'Texto (vacío = automático)', 'texto', ''), P('tam', 'Tamaño de fuente', 'num', 14), P('color', 'Color del texto', 'color', '#252423'), P('negrita', 'Negrita', 'bool', false), P('alineacion', 'Alineación horizontal', 'sel', 'Izquierda', ['Izquierda', 'Centro', 'Derecha'])] },
    efectos: { n: 'Efectos', general: true, p: [P('fondo', 'Fondo', 'bool', true), P('colorFondo', 'Color de fondo', 'color', '#FFFFFF'), P('transparencia', 'Transparencia del fondo (%)', 'num', 0), P('borde', 'Borde visual', 'bool', false), P('colorBorde', 'Color del borde', 'color', '#C8C6C4'), P('radio', 'Esquinas redondeadas (px)', 'num', 0), P('sombra', 'Sombra', 'bool', false)] },
    encabezado: { n: 'Encabezado del objeto visual', general: true, p: [P('mostrar', 'Mostrar', 'bool', true)] },
  };
  const SECC_GRUPO = {
    cart: ['ejeX', 'ejeY', 'leyenda', 'colores', 'etiquetas'], parte: ['leyenda', 'colores', 'etiquetas'], disp: ['ejeX', 'ejeY', 'leyenda', 'colores'],
    medidor: ['medidor', 'etiquetas'], tarjeta: ['valorLlamada', 'etiquetaCat'], kpi: ['valorLlamada', 'kpiColores'], seg: ['segmentacion'], tabla: ['cuadricula'], texto: ['texto'],
  };
  const seccionesDe = (tipo) => {
    const g = TIPOS[tipo].g; const s = [...SECC_GRUPO[g]];
    if (TIPOS[tipo].linea || tipo === 'lineaColumna') s.push('lineas');
    if (tipo === 'treemap' || tipo === 'embudo') s.splice(s.indexOf('leyenda'), 1);
    return [...s, 'titulo', 'efectos', 'encabezado'];
  };
  const fmtGet = (v, sec, k) => { const s = (v.formato || {})[sec] || {}; if (s[k] !== undefined && s[k] !== '') return s[k]; const d = SECC[sec].p.find((x) => x.k === k); return d ? d.def : undefined; };

  // ------------------------------------------------------------------ números
  function fmtNum(n, opc = {}) {
    if (n == null || n === '') return '(En blanco)';
    if (typeof n !== 'number') return String(n);
    const f = opc.formato || {}; let dec = opc.decimales !== '' && opc.decimales != null ? Number(opc.decimales) : null;
    if (f.tipo === 'porcentaje') return (n * 100).toLocaleString('es', { minimumFractionDigits: dec ?? f.dec ?? 1, maximumFractionDigits: dec ?? f.dec ?? 1 }) + ' %';
    let u = opc.unidades || 'Automático', div = 1, suf = '';
    if (u === 'Automático') { const a = Math.abs(n); if (a >= 1e9) u = 'Miles de millones'; else if (a >= 1e6) u = 'Millones'; else if (a >= 1e4 && !opc.exacto) u = 'Miles'; else u = 'Ninguno'; }
    if (u === 'Miles') { div = 1e3; suf = ' mil'; } else if (u === 'Millones') { div = 1e6; suf = ' M'; } else if (u === 'Miles de millones') { div = 1e9; suf = ' mil M'; }
    const x = n / div;
    if (dec === null) dec = f.dec != null ? f.dec : f.tipo === 'entero' ? 0 : div > 1 ? 2 : Number.isInteger(x) ? 0 : 2;
    const s = x.toLocaleString('es', { minimumFractionDigits: f.tipo === 'moneda' || f.tipo === 'decimal' ? dec : 0, maximumFractionDigits: dec });
    return (f.tipo === 'moneda' ? (f.simbolo || '$') + ' ' : '') + s + suf;
  }
  const fmtCel = (x, f) => (typeof x === 'number' ? fmtNum(x, { unidades: 'Ninguno', formato: f, exacto: true }) : x ?? '');

  // ------------------------------------------------------------------ dibujo
  // ctx: { paleta, nom(campo), formatoDe(campo), sel(cat), aten(cat), ancho, alto }

  // ------------------------------------------------------------------ mapa de burbujas
  // Power BI geocodifica con Bing; aquí, coordenadas fijas de los países y ciudades de las bases del curso
  // y un mapa base simplificado (contornos aproximados, proyección equirectangular).
  const GEO = {
    argentina: [-64, -34], chile: [-71, -33], peru: [-75, -10], colombia: [-74, 4.5], mexico: [-102, 23.5], espana: [-3.7, 40.2], bolivia: [-64.7, -16.5], uruguay: [-56, -32.8], 'costa rica': [-84, 10], ecuador: [-78.4, -1.5], paraguay: [-58, -23.4], brasil: [-51, -10], 'estados unidos': [-98, 39], alemania: [10.4, 51], francia: [2.3, 46.6], 'puerto rico': [-66.5, 18.2], china: [104, 35], venezuela: [-66, 7], italia: [12.5, 42.8], 'reino unido': [-2, 54], canada: [-100, 56], cuba: [-79, 21.7], guatemala: [-90.3, 15.6], panama: [-80.2, 8.5],
    'buenos aires': [-58.4, -34.6], cordoba: [-64.2, -31.4], rosario: [-60.6, -32.95], mendoza: [-68.8, -32.9], 'la plata': [-57.95, -34.9], salta: [-65.4, -24.8], bariloche: [-71.3, -41.1], moron: [-58.62, -34.65], 'mar del plata': [-57.55, -38],
    santiago: [-70.65, -33.45], valparaiso: [-71.6, -33.05], lima: [-77.03, -12.05], arequipa: [-71.54, -16.4], cusco: [-71.97, -13.53], bogota: [-74.08, 4.6], medellin: [-75.57, 6.25], cali: [-76.53, 3.45], cartagena: [-75.5, 10.4],
    'ciudad de mexico': [-99.13, 19.43], guadalajara: [-103.35, 20.67], monterrey: [-100.3, 25.67], puebla: [-98.2, 19.04], cancun: [-86.85, 21.16], montevideo: [-56.17, -34.9], 'sao paulo': [-46.63, -23.55], madrid: [-3.7, 40.42], barcelona: [2.17, 41.39], quito: [-78.5, -0.2], 'la paz': [-68.15, -16.5], asuncion: [-57.6, -25.3],
  };
  const TIERRA = [
    [[-77, 8.5], [-72, 12], [-63, 10.7], [-60, 8.5], [-52, 5], [-50, 0], [-44, -2.5], [-35, -5], [-35, -9], [-39, -15], [-41, -22], [-48, -26], [-53, -34], [-58, -38], [-62, -39], [-65, -42], [-67, -46], [-66, -50], [-69, -52], [-68.5, -55], [-73, -53], [-75, -47], [-73.5, -40], [-73.5, -33], [-71.5, -28], [-70.3, -18], [-75, -15], [-77, -12], [-81, -6], [-80, -2], [-80, 1], [-78, 3], [-77.5, 7]],
    [[-77.4, 8.7], [-81.5, 9], [-83.7, 11], [-83.4, 15], [-88, 16], [-88, 21.5], [-90.5, 21], [-91, 18.7], [-94.5, 18.3], [-96.5, 19.5], [-97.7, 22], [-97.2, 26], [-97.4, 27.8], [-93.5, 29.7], [-89.5, 29.5], [-85, 29.8], [-82.8, 27.5], [-81, 25.2], [-80, 27], [-81.4, 30.5], [-77, 34.5], [-76, 37], [-74, 40.5], [-70, 41.5], [-70.5, 43.5], [-66, 44.7], [-61, 45.5], [-60, 47], [-56, 52], [-61, 56], [-65, 60], [-70, 62], [-78, 62], [-82, 57], [-92, 57], [-95, 60], [-90, 65], [-100, 68], [-120, 69], [-141, 69.6], [-156, 71], [-166, 68], [-162, 60], [-152, 58.5], [-140, 59.8], [-135, 57], [-130, 54.5], [-124.5, 49], [-124, 46], [-124.4, 42], [-122.5, 37.5], [-120.6, 34.5], [-117.2, 32.6], [-115.7, 30], [-114, 27.5], [-110, 23], [-109.5, 23.2], [-105.5, 20.5], [-105, 19], [-101, 17.5], [-96, 15.7], [-92, 14.5], [-89.5, 13.4], [-87.5, 13], [-85.7, 11], [-85.6, 9.9], [-83.7, 8.4], [-80.5, 7.3], [-78, 7.5]],
    [[-9.3, 43.2], [-8.9, 42], [-8.9, 38.7], [-8.8, 37], [-6, 36.2], [-5.3, 36], [-2, 36.7], [0.2, 38.8], [-0.3, 39.5], [0.9, 41], [3.2, 41.9], [4.5, 43.4], [7.5, 43.8], [8.8, 44.4], [10.5, 42.9], [13, 41.2], [16, 38], [18.5, 40.2], [13.5, 45.6], [19.5, 42], [22, 37], [24, 40.5], [28, 45], [30, 50], [28, 56], [24, 57], [20, 54.5], [14, 54], [12, 55.4], [9.5, 57], [8.6, 53.9], [4.5, 51.7], [1.5, 50.9], [-1.6, 48.7], [-4.5, 48.5], [-1.3, 46], [-1.8, 43.4], [-8, 43.7]],
    [[-6, 35.8], [10, 37], [11, 33], [20, 31], [25, 31.5], [32, 31.3], [35, 28], [43, 12.5], [51, 11.8], [40, -2], [40, -16], [35, -24], [32, -29], [27, -33.8], [18.5, -34.3], [17, -29], [11.8, -17], [13, -8], [9, -1], [9.5, 4], [3, 6.3], [-4, 5.2], [-8, 4.4], [-13, 8.5], [-17, 14.6], [-16.5, 20], [-13, 27.5], [-9.7, 30]],
    [[-5.5, 50], [1.5, 51], [0, 53.5], [-3, 56], [-5, 58.5], [-6, 56], [-3, 54], [-4.5, 52]],
    [[-84.9, 21.9], [-82, 23.1], [-77, 21.5], [-74.2, 20.2], [-77.5, 19.9], [-80, 21.6]],
  ];
  const sinAcento = (x) => String(x ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  function dibujarMapa(v, cuerpo, d, ctx, colSerie, tip, fE) {
    const W = Math.max(80, ctx.ancho), H = Math.max(50, ctx.alto);
    const s = d.series[0] || { vals: {} };
    const pts = d.cats.map((c) => ({ c, g: GEO[sinAcento(c)], v: s.vals[c] })).filter((p) => p.v != null);
    const ok = pts.filter((p) => p.g), sinUbicar = pts.filter((p) => !p.g).map((p) => p.c);
    if (!ok.length) { cuerpo.innerHTML = `<div class="pb-v-vacio">No se pudo ubicar ninguna ubicación en el mapa.${sinUbicar.length ? `<br><small>Valores: ${esc(sinUbicar.slice(0, 5).join(', '))}…</small>` : ''}<br><small>Usa una columna de países o ciudades (categoría de datos: País o Ciudad).</small></div>`; return; }
    let lon0 = Math.min(...ok.map((p) => p.g[0])), lon1 = Math.max(...ok.map((p) => p.g[0])), lat0 = Math.min(...ok.map((p) => p.g[1])), lat1 = Math.max(...ok.map((p) => p.g[1]));
    const padLon = Math.max(6, (lon1 - lon0) * 0.18), padLat = Math.max(5, (lat1 - lat0) * 0.18);
    lon0 -= padLon; lon1 += padLon; lat0 -= padLat; lat1 += padLat;
    // misma escala en x e y (sin deformar)
    const esc0 = Math.min(W / (lon1 - lon0), H / (lat1 - lat0));
    const cx = (lon0 + lon1) / 2, cy = (lat0 + lat1) / 2;
    const X = (lon) => W / 2 + (lon - cx) * esc0, Y = (lat) => H / 2 - (lat - cy) * esc0;
    const tierra = TIERRA.map((poly) => `<path d="M${poly.map(([a, b]) => `${X(a).toFixed(1)} ${Y(b).toFixed(1)}`).join('L')}Z" class="pb-mapa-tierra"/>`).join('');
    const mx = Math.max(...ok.map((p) => Math.abs(p.v))) || 1, rmax = Math.max(10, Math.min(W, H) / 9);
    const col = colSerie(0, s.nombre);
    const burbujas = ok.sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).map((p) => `<circle cx="${X(p.g[0]).toFixed(1)}" cy="${Y(p.g[1]).toFixed(1)}" r="${(4 + (rmax - 4) * Math.sqrt(Math.abs(p.v) / mx)).toFixed(1)}" fill="${col}" fill-opacity=".72" stroke="#fff" stroke-width="1" data-cat="${esc(p.c)}" opacity="${ctx.aten(p.c) ? 0.25 : 1}">${tip(p.c, [[s.nombre, fE(p.v, s.formato)]])}</circle>`).join('');
    cuerpo.innerHTML = `<svg width="${W}" height="${H}" class="pb-mapa"><rect width="${W}" height="${H}" class="pb-mapa-agua"/>${tierra}${burbujas}<text x="${W - 6}" y="${H - 5}" text-anchor="end" class="pb-mapa-cred">Mapa base simplificado · Academia</text></svg>${sinUbicar.length ? `<div class="pb-mapa-aviso" title="${esc(sinUbicar.join(', '))}">⚠ ${sinUbicar.length} sin ubicar</div>` : ''}`;
  }
  function dibujar(v, cuerpo, d, ctx) {
    const W = Math.max(80, ctx.ancho), H = Math.max(50, ctx.alto);
    const T = TIPOS[v.tipo]; const pal = ctx.paleta;
    const colSerie = (i, nombre) => { const s = ((v.formato || {}).series || {})[nombre]; if (s) return s; if (i === 0 && fmtGet(v, 'colores', 'color')) return fmtGet(v, 'colores', 'color'); return pal[i % pal.length]; };
    const et = { mostrar: fmtGet(v, 'etiquetas', 'mostrar'), unidades: fmtGet(v, 'etiquetas', 'unidades'), decimales: fmtGet(v, 'etiquetas', 'decimales'), tam: fmtGet(v, 'etiquetas', 'tam'), color: fmtGet(v, 'etiquetas', 'color') };
    const fE = (n, f) => fmtNum(n, { unidades: et.unidades, decimales: et.decimales, formato: f });
    const tip = (titulo, filas) => `<title>${esc(titulo)}${filas.map(([a, b]) => `\n${esc(a)}: ${esc(b)}`).join('')}</title>`;
    if (T.g === 'texto') { const al = { Izquierda: 'left', Centro: 'center', Derecha: 'right' }[fmtGet(v, 'texto', 'alineacion')]; cuerpo.innerHTML = `<div class="pb-textbox" style="font-size:${fmtGet(v, 'texto', 'tam')}px;color:${fmtGet(v, 'texto', 'color')};font-weight:${fmtGet(v, 'texto', 'negrita') ? 600 : 400};text-align:${al}">${esc(v.texto || 'Escribe aquí (doble clic para editar)').replace(/\n/g, '<br>')}</div>`; return; }
    if (T.g === 'tarjeta' && v.tipo === 'tarjeta') {
      const tam = Number(fmtGet(v, 'valorLlamada', 'tam')) || Math.max(18, Math.min(H * 0.42, (W / Math.max(4, fmtNum(d.valor, { formato: d.formato }).length)) * 1.6));
      const val = fmtNum(d.valor, { unidades: fmtGet(v, 'valorLlamada', 'unidades'), decimales: fmtGet(v, 'valorLlamada', 'decimales'), formato: d.formato });
      cuerpo.innerHTML = `<div class="pb-card"><b style="font-size:${tam}px;color:${fmtGet(v, 'valorLlamada', 'color')}">${esc(val)}</b>${fmtGet(v, 'etiquetaCat', 'mostrar') ? `<span style="font-size:${fmtGet(v, 'etiquetaCat', 'tam')}px;color:${fmtGet(v, 'etiquetaCat', 'color')}">${esc(d.nombre)}</span>` : ''}</div>`; return;
    }
    if (v.tipo === 'tarjetaFilas') { cuerpo.innerHTML = `<div class="pb-multi">${d.items.map((it) => `<div class="pb-multi-i" style="border-left-color:${pal[0]}"><b style="color:${fmtGet(v, 'valorLlamada', 'color')}">${esc(fmtNum(it.valor, { unidades: fmtGet(v, 'valorLlamada', 'unidades'), decimales: fmtGet(v, 'valorLlamada', 'decimales'), formato: it.formato }))}</b>${fmtGet(v, 'etiquetaCat', 'mostrar') ? `<span>${esc(it.nombre)}</span>` : ''}</div>`).join('')}</div>`; return; }
    if (T.g === 'kpi') {
      const alto = fmtGet(v, 'kpiColores', 'alto'); const ok = d.meta == null || d.valor == null ? null : alto ? d.valor >= d.meta : d.valor <= d.meta;
      const color = ok === null ? fmtGet(v, 'valorLlamada', 'color') : ok ? fmtGet(v, 'kpiColores', 'bien') : fmtGet(v, 'kpiColores', 'mal');
      const dif = d.meta ? (d.valor - d.meta) / Math.abs(d.meta) : null;
      let spark = '';
      if (d.tendencia && d.tendencia.length > 1) { const vals = d.tendencia.map((x) => x[1] || 0), mx = Math.max(...vals), mn = Math.min(0, ...vals); const pts = vals.map((y, i) => `${(i / (vals.length - 1)) * W},${H - 4 - ((y - mn) / (mx - mn || 1)) * (H * 0.45)}`).join(' '); spark = `<svg class="pb-kpi-spark" width="${W}" height="${H}"><polygon points="0,${H} ${pts} ${W},${H}" fill="${color}" opacity=".18"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" opacity=".6"/></svg>`; }
      cuerpo.innerHTML = `<div class="pb-kpi">${spark}<b style="color:${color};font-size:${Number(fmtGet(v, 'valorLlamada', 'tam')) || Math.min(H * 0.32, 44)}px">${ok === null ? '' : ok ? '✓ ' : '! '}${esc(fmtNum(d.valor, { unidades: fmtGet(v, 'valorLlamada', 'unidades'), formato: d.formato }))}</b>${d.meta != null ? `<span>Objetivo: ${esc(fmtNum(d.meta, { formato: d.formato }))} (${dif >= 0 ? '+' : ''}${(dif * 100).toFixed(1)} %)</span>` : '<span>Agrega un destino para comparar</span>'}</div>`; return;
    }
    if (T.g === 'seg') {
      const sel = new Set((v.slicerSel || []).map(String)), estilo = fmtGet(v, 'segmentacion', 'estilo'), unica = fmtGet(v, 'segmentacion', 'unica');
      const vals = d.valores.slice(0, 500);
      if (estilo === 'Lista desplegable') { cuerpo.innerHTML = `<div class="pb-slicer"><select class="pb-sl-drop" data-sl-drop ${unica ? '' : 'multiple size="1"'}><option value="__todos">${sel.size ? `${sel.size} seleccionado(s)` : 'Todo'}</option>${vals.map((x) => `<option value="${esc(x ?? '')}" ${sel.has(String(x)) ? 'selected' : ''}>${esc(x ?? '(En blanco)')}</option>`).join('')}</select></div>`; return; }
      if (estilo === 'Mosaico') { cuerpo.innerHTML = `<div class="pb-slicer pb-sl-mosaico">${vals.map((x) => `<button data-sl-btn="${esc(x ?? '')}" class="${sel.has(String(x)) ? 'on' : ''}">${esc(x ?? '(En blanco)')}</button>`).join('')}</div>`; return; }
      cuerpo.innerHTML = `<div class="pb-slicer">${fmtGet(v, 'segmentacion', 'buscar') ? '<input class="pb-sl-buscar" placeholder="Buscar" data-sl-buscar>' : ''}${fmtGet(v, 'segmentacion', 'todo') && !unica ? `<label><input type="checkbox" data-sl-todo ${!sel.size ? 'checked' : ''}><span>Seleccionar todo</span></label>` : ''}${vals.map((x) => `<label data-sl-l="${esc(String(x ?? '').toLowerCase())}"><input type="${unica ? 'radio' : 'checkbox'}" name="sl${v.id}" data-sl="${esc(x ?? '')}" ${sel.has(String(x)) ? 'checked' : ''}><span>${esc(x ?? '(En blanco)')}</span></label>`).join('')}</div>`; return;
    }
    if (T.g === 'tabla') {
      const estilo = fmtGet(v, 'cuadricula', 'estilo'), tam = fmtGet(v, 'cuadricula', 'tam'), barras = fmtGet(v, 'cuadricula', 'barras');
      const maxCol = d.cab.map((_, j) => Math.max(0, ...d.filas.map((f) => (typeof f[j] === 'number' ? Math.abs(f[j]) : 0))));
      const celda = (x, j) => `<td class="${typeof x === 'number' ? 'num' : ''}">${barras && typeof x === 'number' && j >= d.ncat ? `<i class="pb-barra" style="width:${(Math.abs(x) / (maxCol[j] || 1)) * 100}%;background:${pal[0]}"></i>` : ''}${esc(fmtCel(x, (d.formatos || [])[j]))}</td>`;
      cuerpo.innerHTML = `<div class="pb-tabla pb-est-${estilo.replace(/\s+/g, '-').toLowerCase()}" style="font-size:${tam}px"><table><thead><tr>${d.cab.map((c, j) => `<th data-ord="${j}">${esc(c)}${v.orden && v.orden.col === j ? (v.orden.desc ? ' ▾' : ' ▴') : ''}</th>`).join('')}</tr></thead><tbody>${d.filas.map((f) => `<tr data-cat="${esc(f[0])}" class="${ctx.sel(f[0]) ? 'sel' : ''} ${f.subtotal ? 'pb-subtotal' : ''}">${f.map(celda).join('')}</tr>`).join('')}</tbody>${d.total && fmtGet(v, 'cuadricula', 'totales') ? `<tfoot><tr><td colspan="${Math.max(1, d.ncat)}">Total</td>${d.total.map((x, j) => `<td class="num">${esc(fmtCel(x, (d.formatos || [])[d.ncat + j]))}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`; return;
    }
    if (T.g === 'medidor') {
      const mn = d.min ?? (Number(fmtGet(v, 'medidor', 'min')) || 0), mx = d.max ?? (Number(fmtGet(v, 'medidor', 'max')) || Math.max(1, (d.valor || 0) * 2));
      const fr = Math.max(0, Math.min(1, ((d.valor || 0) - mn) / (mx - mn || 1)));
      const r = Math.max(20, Math.min(W / 2 - 14, H - 34)), cx = W / 2, cy = H - 22;
      const pt = (f, rr) => [cx - rr * Math.cos(Math.PI * f), cy - rr * Math.sin(Math.PI * f)];
      const arco = (f0, f1, rr) => { const [x0, y0] = pt(f0, rr), [x1, y1] = pt(f1, rr); return `M${x0},${y0} A${rr},${rr} 0 0 1 ${x1},${y1}`; };
      const g = r * 0.28;
      let meta = ''; if (d.meta != null) { const fm = Math.max(0, Math.min(1, (d.meta - mn) / (mx - mn || 1))); const [a1, b1] = pt(fm, r - g / 2 - 6), [a2, b2] = pt(fm, r + g / 2 + 6); meta = `<line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" stroke="${fmtGet(v, 'medidor', 'destino')}" stroke-width="2"><title>Destino: ${esc(fmtNum(d.meta))}</title></line>`; }
      cuerpo.innerHTML = `<svg width="${W}" height="${H}"><path d="${arco(0, 1, r)}" fill="none" stroke="#E6E6E6" stroke-width="${g}"/><path d="${arco(0, Math.max(0.001, fr), r)}" fill="none" stroke="${fmtGet(v, 'medidor', 'relleno')}" stroke-width="${g}">${tip(d.nombre, [['Valor', fmtNum(d.valor)]])}</path>${meta}<text x="${cx}" y="${cy - 4}" text-anchor="middle" class="pb-gauge-v" style="font-size:${Math.max(14, r * 0.38)}px">${esc(fmtNum(d.valor, { formato: d.formato }))}</text><text x="${cx - r}" y="${cy + 16}" text-anchor="middle" class="pb-eje">${esc(fmtNum(mn))}</text><text x="${cx + r}" y="${cy + 16}" text-anchor="middle" class="pb-eje">${esc(fmtNum(mx))}</text></svg>`;
      return;
    }
    // leyenda
    const verLey = fmtGet(v, 'leyenda', 'mostrar'), posLey = fmtGet(v, 'leyenda', 'pos');
    if (T.g === 'disp') {
      const pts = d.puntos; if (!pts.length) { cuerpo.innerHTML = '<div class="pb-v-vacio">Sin datos</div>'; return; }
      const grupos = [...new Set(pts.map((p) => p.ley ?? ''))];
      const ley = verLey && grupos.length > 1 ? `<div class="pb-ley">${grupos.map((g, i) => `<span><i style="background:${colSerie(i, g)}"></i>${esc(g)}</span>`).join('')}</div>` : '';
      const hl = ley ? 22 : 0, izq = 50, abajo = 30, an = W - izq - 12, al = H - abajo - hl - 10;
      const xs = pts.map((p) => p.x || 0), ys = pts.map((p) => p.y || 0), ts = pts.map((p) => p.tam || 0);
      const [x0, x1] = [Math.min(0, ...xs), Math.max(...xs) || 1], [y0, y1] = [Math.min(0, ...ys), Math.max(...ys) || 1], tmx = Math.max(...ts) || 1;
      const X = (x) => izq + ((x - x0) / (x1 - x0 || 1)) * an, Y = (y) => 8 + al - ((y - y0) / (y1 - y0 || 1)) * al;
      const grid = [0, 0.5, 1].map((f) => `<line x1="${izq}" x2="${izq + an}" y1="${8 + al - f * al}" y2="${8 + al - f * al}" class="pb-grid"/><text x="${izq - 6}" y="${12 + al - f * al}" text-anchor="end" class="pb-eje">${esc(fmtNum(y0 + (y1 - y0) * f))}</text><text x="${izq + f * an}" y="${8 + al + 16}" text-anchor="middle" class="pb-eje">${esc(fmtNum(x0 + (x1 - x0) * f))}</text>`).join('');
      cuerpo.innerHTML = ley + `<svg width="${W}" height="${H - hl}">${grid}${pts.map((p) => `<circle cx="${X(p.x || 0)}" cy="${Y(p.y || 0)}" r="${p.tam != null ? 4 + 14 * Math.sqrt(Math.max(0, p.tam) / tmx) : 5}" fill="${colSerie(grupos.indexOf(p.ley ?? ''), p.ley ?? '')}" fill-opacity=".75" stroke="#fff" data-cat="${esc(p.d)}" opacity="${ctx.aten(p.d) ? 0.25 : 1}">${tip(p.d, [[d.nx, fmtNum(p.x)], [d.ny, fmtNum(p.y)], ...(p.tam != null ? [[d.nt, fmtNum(p.tam)]] : [])])}</circle>`).join('')}${fmtGet(v, 'ejeX', 'titulo') ? `<text x="${izq + an / 2}" y="${H - hl - 2}" text-anchor="middle" class="pb-eje-t">${esc(d.nx)}</text>` : ''}</svg>`;
      return;
    }
    if (T.mapa) return dibujarMapa(v, cuerpo, d, ctx, colSerie, tip, fE);
    const series = d.series, cats = d.cats;
    if (T.g === 'parte') {
      const s = series[0]; const vals = cats.map((c) => Math.max(0, s.vals[c] || 0)); const tot = vals.reduce((a, b) => a + b, 0) || 1;
      const colC = (i) => colSerie(i, cats[i]);
      if (v.tipo === 'treemap') {
        const items = cats.map((c, i) => ({ c, v: vals[i], i })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 60);
        const rects = squarify(items, 0, 0, W, H);
        cuerpo.innerHTML = `<svg width="${W}" height="${H}">${rects.map((r) => `<g data-cat="${esc(r.c)}" opacity="${ctx.aten(r.c) ? 0.3 : 1}"><rect x="${r.x}" y="${r.y}" width="${Math.max(0, r.w - 1)}" height="${Math.max(0, r.h - 1)}" fill="${colC(r.i)}">${tip(r.c, [[s.nombre, fmtNum(r.v, { formato: s.formato })]])}</rect>${r.w > 40 && r.h > 18 ? `<text x="${r.x + 5}" y="${r.y + 14}" class="pb-tm-t">${esc(String(r.c).slice(0, Math.floor(r.w / 7)))}</text>${et.mostrar && r.h > 32 ? `<text x="${r.x + 5}" y="${r.y + 28}" class="pb-tm-t">${esc(fE(r.v, s.formato))}</text>` : ''}` : ''}</g>`).join('')}</svg>`;
        return;
      }
      if (v.tipo === 'embudo') {
        const mx = Math.max(...vals, 1), bh = Math.min(34, (H - 8) / Math.max(1, cats.length)) - 3;
        cuerpo.innerHTML = `<svg width="${W}" height="${H}">${cats.map((c, i) => { const w = (vals[i] / mx) * (W - 120), y = 4 + i * (bh + 3); return `<g data-cat="${esc(c)}" opacity="${ctx.aten(c) ? 0.3 : 1}"><text x="94" y="${y + bh / 2 + 4}" text-anchor="end" class="pb-eje">${esc(String(c).slice(0, 14))}</text><rect x="${100 + (W - 120 - w) / 2}" y="${y}" width="${Math.max(1, w)}" height="${bh}" fill="${colSerie(0, s.nombre)}">${tip(c, [[s.nombre, fmtNum(vals[i], { formato: s.formato })], ['% del primero', ((vals[i] / (vals[0] || 1)) * 100).toFixed(1) + ' %']])}</rect><text x="${100 + (W - 120) / 2}" y="${y + bh / 2 + 4}" text-anchor="middle" class="pb-et-in">${esc(fE(vals[i], s.formato))}</text></g>`; }).join('')}</svg>`;
        return;
      }
      const ley = verLey ? `<div class="pb-ley pb-ley-v">${cats.slice(0, 12).map((c, i) => `<span><i style="background:${colC(i)}"></i>${esc(c)}</span>`).join('')}</div>` : '';
      const r = Math.max(20, Math.min((verLey ? W * 0.6 : W) / 2 - 16, H / 2 - 10)), cx = r + 14, cy = H / 2, hueco = v.tipo === 'anillo' ? r * 0.58 : 0;
      let ang = -Math.PI / 2;
      const pt = (a, rr) => `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
      const arcos = cats.slice(0, 30).map((c, i) => {
        const f = vals[i] / tot, a2 = ang + f * Math.PI * 2, gr = f > 0.5 ? 1 : 0, a1 = ang; ang = a2;
        const path = hueco ? `M${pt(a1, r)} A${r},${r} 0 ${gr} 1 ${pt(a2 - 1e-4, r)} L${pt(a2 - 1e-4, hueco)} A${hueco},${hueco} 0 ${gr} 0 ${pt(a1, hueco)} Z` : `M${cx},${cy} L${pt(a1, r)} A${r},${r} 0 ${gr} 1 ${pt(a2 - 1e-4, r)} Z`;
        const mid = (a1 + a2) / 2, lbl = et.mostrar && f > 0.04 ? `<text x="${cx + (r + 4) * Math.cos(mid)}" y="${cy + (r + 4) * Math.sin(mid) + 3}" text-anchor="${Math.cos(mid) >= 0 ? 'start' : 'end'}" class="pb-et">${esc(fE(vals[i], s.formato))} (${(f * 100).toFixed(0)}%)</text>` : '';
        return `<path d="${path}" fill="${colC(i)}" stroke="#fff" data-cat="${esc(c)}" opacity="${ctx.aten(c) ? 0.3 : 1}">${tip(c, [[s.nombre, fmtNum(vals[i], { formato: s.formato })], ['Porcentaje', (f * 100).toFixed(1) + ' %']])}</path>${lbl}`;
      });
      cuerpo.innerHTML = `<div class="pb-donut"><svg width="${2 * r + 28 + (et.mostrar ? 70 : 0)}" height="${H}" style="overflow:visible">${arcos.join('')}</svg>${ley}</div>`;
      return;
    }
    // ---- cartesianos
    const horiz = !!T.horiz, apila = T.apila || 0, esLinea = !!T.linea;
    const colSeries = series.filter((s) => s.tipo !== 'linea'), linSeries = v.tipo === 'lineaColumna' ? series.filter((s) => s.tipo === 'linea') : [];
    const ley = verLey && (series.length > 1) ? `<div class="pb-ley">${series.map((s, i) => `<span><i style="background:${colSerie(i, s.nombre)}"></i>${esc(s.nombre)}</span>`).join('')}</div>` : '';
    const hl = ley ? 22 : 0;
    // valores (apilado y 100%)
    const val = (s, c) => s.vals[c] || 0;
    let base = {};
    const tot = (c) => colSeries.reduce((a, s) => a + Math.max(0, val(s, c)), 0) || 1;
    const valN = (s, c) => (apila === 100 ? val(s, c) / tot(c) : val(s, c));
    let maxV = 0, minV = 0;
    if (v.tipo === 'cascada') {
      let acum = 0; for (const c of cats) { acum += val(colSeries[0], c); maxV = Math.max(maxV, acum); minV = Math.min(minV, acum); } maxV = Math.max(maxV, acum);
    } else if (apila) { for (const c of cats) { let p = 0, n = 0; for (const s of colSeries) { const x = valN(s, c); if (x >= 0) p += x; else n += x; } maxV = Math.max(maxV, p); minV = Math.min(minV, n); } }
    else for (const s of colSeries) for (const c of cats) { maxV = Math.max(maxV, val(s, c)); minV = Math.min(minV, val(s, c)); }
    if (apila === 100) { maxV = 1; minV = Math.min(0, minV); }
    const ini = fmtGet(v, 'ejeY', 'inicio'), fin = fmtGet(v, 'ejeY', 'fin');
    if (ini !== '' && !isNaN(Number(ini))) minV = Number(ini); if (fin !== '' && !isNaN(Number(fin))) maxV = Number(fin);
    if (maxV === minV) maxV = minV + 1;
    let max2 = 0; for (const s of linSeries) for (const c of cats) max2 = Math.max(max2, val(s, c)); max2 = max2 || 1;
    const verX = fmtGet(v, 'ejeX', 'mostrar'), verY = fmtGet(v, 'ejeY', 'mostrar'), cuad = fmtGet(v, 'ejeY', 'cuadricula'), tamX = fmtGet(v, 'ejeX', 'tam'), tamY = fmtGet(v, 'ejeY', 'tam');
    const tituloX = fmtGet(v, 'ejeX', 'titulo') ? d.nx : '', tituloY = fmtGet(v, 'ejeY', 'titulo') ? d.ny : '';
    const fmtEje = (x) => (apila === 100 ? `${Math.round(x * 100)} %` : fmtNum(x, { formato: (colSeries[0] || {}).formato, unidades: 'Automático', decimales: 0 }));
    const pie = (verX ? 18 : 4) + (tituloX ? 14 : 0);
    if (horiz) {
      const izq = verX ? Math.min(150, Math.max(50, Math.max(...cats.map((c) => String(c).length), 3) * 6.2)) + (tituloX ? 14 : 0) : 6;
      const an = W - izq - (et.mostrar ? 44 : 14), al = H - hl - (verY ? 22 : 6) - (tituloY ? 14 : 0);
      const banda = al / Math.max(1, cats.length), n = apila ? 1 : colSeries.length, bw = Math.max(2, (banda * 0.7) / n);
      const X = (x) => izq + ((x - minV) / (maxV - minV)) * an;
      let g = '';
      if (verY || cuad) for (const f of [0, 0.25, 0.5, 0.75, 1]) { const x = izq + f * an; g += (cuad ? `<line x1="${x}" x2="${x}" y1="0" y2="${al}" class="pb-grid"/>` : '') + (verY ? `<text x="${x}" y="${al + 14}" text-anchor="middle" class="pb-eje" style="font-size:${tamY}px">${esc(fmtEje(minV + (maxV - minV) * f))}</text>` : ''); }
      cats.forEach((c, i) => {
        if (verX) g += `<text x="${izq - 6 - (tituloX ? 0 : 0)}" y="${i * banda + banda / 2 + 4}" text-anchor="end" class="pb-eje" style="font-size:${tamX}px">${esc(String(c).slice(0, 24))}</text>`;
        let acP = 0, acN = 0;
        colSeries.forEach((s, k) => {
          const x = valN(s, c); let x0, x1;
          if (apila) { if (x >= 0) { x0 = acP; acP += x; x1 = acP; } else { x0 = acN + x; acN += x; x1 = x0 - x; } } else { x0 = Math.min(0, x); x1 = Math.max(0, x); }
          const y0 = i * banda + banda * 0.15 + (apila ? 0 : k * bw), w = X(x1) - X(x0);
          g += `<rect x="${X(x0)}" y="${y0}" width="${Math.max(0, w)}" height="${(apila ? banda * 0.7 : bw) - 1}" fill="${colSerie(k, s.nombre)}" data-cat="${esc(c)}" opacity="${ctx.aten(c) ? 0.3 : 1}" ${ctx.sel(c) ? 'stroke="#252423"' : ''}>${tip(c, [[s.nombre, fmtNum(val(s, c), { formato: s.formato })]])}</rect>`;
          if (et.mostrar && w > 0) g += `<text x="${apila ? X(x0) + w / 2 : X(x1) + 4}" y="${y0 + (apila ? banda * 0.35 : bw / 2) + 3}" text-anchor="${apila ? 'middle' : 'start'}" class="pb-et" style="font-size:${et.tam}px;fill:${apila ? '#fff' : et.color}">${esc(apila === 100 ? Math.round(x * 100) + ' %' : fE(val(s, c), s.formato))}</text>`;
        });
      });
      cuerpo.innerHTML = (posLey !== 'Abajo' ? ley : '') + `<svg width="${W}" height="${H - hl}">${g}${tituloY ? `<text x="${izq + an / 2}" y="${H - hl - 2}" text-anchor="middle" class="pb-eje-t">${esc(tituloY)}</text>` : ''}${tituloX ? `<text transform="translate(10 ${al / 2}) rotate(-90)" text-anchor="middle" class="pb-eje-t">${esc(tituloX)}</text>` : ''}</svg>` + (posLey === 'Abajo' ? ley : '');
      return;
    }
    const izq = (verY ? 50 : 8) + (tituloY ? 14 : 0), der = linSeries.length ? 46 : 10, an = W - izq - der, al = H - hl - pie - 8;
    const Y = (y) => 8 + al - ((y - minV) / (maxV - minV)) * al, Y2 = (y) => 8 + al - (y / max2) * al;
    const paso = an / Math.max(1, cats.length), cada = Math.ceil(cats.length / Math.max(1, Math.floor(an / 52)));
    let g = '';
    for (const f of [0, 0.25, 0.5, 0.75, 1]) { const y = 8 + al - f * al; if (cuad) g += `<line x1="${izq}" x2="${izq + an}" y1="${y}" y2="${y}" class="pb-grid"/>`; if (verY) g += `<text x="${izq - 6}" y="${y + 4}" text-anchor="end" class="pb-eje" style="font-size:${tamY}px">${esc(fmtEje(minV + (maxV - minV) * f))}</text>`; if (linSeries.length) g += `<text x="${izq + an + 6}" y="${y + 4}" class="pb-eje" style="font-size:${tamY}px">${esc(fmtNum(max2 * f, { decimales: 0 }))}</text>`; }
    if (minV < 0) g += `<line x1="${izq}" x2="${izq + an}" y1="${Y(0)}" y2="${Y(0)}" class="pb-base"/>`;
    if (verX) cats.forEach((c, i) => { if (!(i % cada)) g += `<text x="${izq + i * paso + paso / 2}" y="${8 + al + 15}" text-anchor="middle" class="pb-eje" style="font-size:${tamX}px">${esc(String(c).slice(0, Math.max(6, Math.floor((paso * cada) / 6.5))))}</text>`; });
    g += `<line x1="${izq}" x2="${izq + an}" y1="${Y(Math.max(0, minV))}" y2="${Y(Math.max(0, minV))}" class="pb-base"/>`;
    if (v.tipo === 'cascada') {
      const s = colSeries[0]; let acum = 0; const bw = paso * 0.7;
      cats.forEach((c, i) => { const x = val(s, c), a0 = acum; acum += x; const y0 = Y(Math.max(a0, acum)), h = Math.abs(Y(a0) - Y(acum)); g += `<rect x="${izq + i * paso + paso * 0.15}" y="${y0}" width="${bw}" height="${Math.max(1, h)}" fill="${x >= 0 ? fmtGet(v, 'colores', 'aumento') : fmtGet(v, 'colores', 'disminucion')}" data-cat="${esc(c)}" opacity="${ctx.aten(c) ? 0.3 : 1}">${tip(c, [[s.nombre, fmtNum(x, { formato: s.formato })], ['Acumulado', fmtNum(acum, { formato: s.formato })]])}</rect>${et.mostrar ? `<text x="${izq + i * paso + paso / 2}" y="${y0 - 3}" text-anchor="middle" class="pb-et" style="font-size:${et.tam}px">${esc(fE(x, s.formato))}</text>` : ''}`; if (i < cats.length - 1) g += `<line x1="${izq + i * paso + paso * 0.85}" x2="${izq + (i + 1) * paso + paso * 0.15}" y1="${Y(acum)}" y2="${Y(acum)}" stroke="#A19F9D" stroke-dasharray="2 2"/>`; });
      void base;
    } else if (esLinea) {
      const grosor = fmtGet(v, 'lineas', 'grosor'), marc = fmtGet(v, 'lineas', 'marcadores');
      const acum = {};
      colSeries.forEach((s, k) => {
        const pts = cats.map((c, i) => { let y = valN(s, c); if (apila) { acum[c] = (acum[c] || 0) + y; y = acum[c]; } return [izq + i * paso + paso / 2, Y(y), c, val(s, c)]; });
        const lin = pts.map((p) => `${p[0]},${p[1]}`).join(' ');
        const prev = apila && k ? cats.map((c, i) => [izq + i * paso + paso / 2, Y(acum[c] - valN(s, c))]) : null;
        if (T.area) g += `<polygon points="${prev ? lin + ' ' + prev.slice().reverse().map((p) => p.join(',')).join(' ') : `${pts[0][0]},${Y(Math.max(0, minV))} ${lin} ${pts[pts.length - 1][0]},${Y(Math.max(0, minV))}`}" fill="${colSerie(k, s.nombre)}" opacity="${apila ? 0.75 : 0.28}"/>`;
        g += `<polyline points="${lin}" fill="none" stroke="${colSerie(k, s.nombre)}" stroke-width="${grosor}" stroke-linejoin="round"/>`;
        if (marc && cats.length <= 80) g += pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${cats.length <= 30 ? 3.5 : 2.2}" fill="${colSerie(k, s.nombre)}" data-cat="${esc(p[2])}" opacity="${ctx.aten(p[2]) ? 0.3 : 1}">${tip(p[2], [[s.nombre, fmtNum(p[3], { formato: s.formato })]])}</circle>`).join('');
        if (et.mostrar && cats.length <= 31) g += pts.map((p) => `<text x="${p[0]}" y="${p[1] - 7}" text-anchor="middle" class="pb-et" style="font-size:${et.tam}px">${esc(fE(p[3], s.formato))}</text>`).join('');
      });
    } else {
      const n = apila ? 1 : colSeries.length, bw = (paso * 0.72) / n;
      cats.forEach((c, i) => {
        let acP = 0, acN = 0;
        colSeries.forEach((s, k) => {
          const x = valN(s, c); let a, b;
          if (apila) { if (x >= 0) { a = acP; acP += x; b = acP; } else { b = acN; acN += x; a = acN; } } else { a = Math.min(0, x); b = Math.max(0, x); }
          const x0 = izq + i * paso + paso * 0.14 + (apila ? 0 : k * bw), h = Y(a) - Y(b), w = apila ? paso * 0.72 : bw;
          g += `<rect x="${x0}" y="${Y(b)}" width="${Math.max(1, w - 1)}" height="${Math.max(0, h)}" fill="${colSerie(k, s.nombre)}" data-cat="${esc(c)}" opacity="${ctx.aten(c) ? 0.3 : 1}" ${ctx.sel(c) ? 'stroke="#252423"' : ''}>${tip(c, [[s.nombre, fmtNum(val(s, c), { formato: s.formato })], ...((d.info || []).map((inf) => [inf.nombre, fmtNum((inf.vals || {})[c], { formato: inf.formato })]))])}</rect>`;
          if (et.mostrar && cats.length <= 24 && h > 0) g += `<text x="${x0 + w / 2}" y="${apila ? Y(b) + h / 2 + 3 : Y(b) - 4}" text-anchor="middle" class="pb-et" style="font-size:${et.tam}px;fill:${apila ? '#fff' : et.color}">${esc(apila === 100 ? Math.round(x * 100) + ' %' : fE(val(s, c), s.formato))}</text>`;
        });
      });
      linSeries.forEach((s, k) => {
        const kk = colSeries.length + k; const pts = cats.map((c, i) => [izq + i * paso + paso / 2, Y2(val(s, c)), c]);
        g += `<polyline points="${pts.map((p) => `${p[0]},${p[1]}`).join(' ')}" fill="none" stroke="${colSerie(kk, s.nombre)}" stroke-width="2.2"/>` + pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="${colSerie(kk, s.nombre)}" data-cat="${esc(p[2])}">${tip(p[2], [[s.nombre, fmtNum(val(s, p[2]), { formato: s.formato })]])}</circle>`).join('');
      });
    }
    cuerpo.innerHTML = (posLey !== 'Abajo' ? ley : '') + `<svg width="${W}" height="${H - hl}">${g}${tituloX ? `<text x="${izq + an / 2}" y="${H - hl - 3}" text-anchor="middle" class="pb-eje-t">${esc(tituloX)}</text>` : ''}${tituloY ? `<text transform="translate(11 ${8 + al / 2}) rotate(-90)" text-anchor="middle" class="pb-eje-t">${esc(tituloY)}</text>` : ''}</svg>` + (posLey === 'Abajo' ? ley : '');
  }
  // treemap "squarified" (Bruls, Huizing y van Wijk)
  function squarify(items, x, y, w, h) {
    const out = []; const total = items.reduce((s, it) => s + it.v, 0) || 1; const escala = (w * h) / total;
    let rest = items.map((it) => ({ ...it, a: it.v * escala }));
    while (rest.length) {
      const lado = Math.min(w, h); let fila = [rest[0]], peor = Infinity;
      for (let i = 1; i <= rest.length; i++) {
        const f = rest.slice(0, i), s = f.reduce((a, b) => a + b.a, 0), mx = Math.max(...f.map((z) => z.a)), mn = Math.min(...f.map((z) => z.a));
        const p = Math.max((lado * lado * mx) / (s * s), (s * s) / (lado * lado * mn));
        if (p <= peor) { peor = p; fila = f; } else break;
      }
      const s = fila.reduce((a, b) => a + b.a, 0);
      if (w >= h) { const fw = s / h; let yy = y; for (const it of fila) { const ih = it.a / fw; out.push({ ...it, x, y: yy, w: fw, h: ih }); yy += ih; } x += fw; w -= fw; }
      else { const fh = s / w; let xx = x; for (const it of fila) { const iw = it.a / fh; out.push({ ...it, x: xx, y, w: iw, h: fh }); xx += iw; } y += fh; h -= fh; }
      rest = rest.slice(fila.length);
    }
    return out;
  }

  window.PBIVis = { TIPOS, ICO, ALIAS, SECC, seccionesDe, fmtGet, fmtNum, fmtCel, dibujar };
})();
