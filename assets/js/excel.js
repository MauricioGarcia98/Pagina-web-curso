/* Réplica de Excel (práctica). Dibujada desde cero siguiendo la documentación pública de Excel: no usa el logo,
 * íconos ni código de Microsoft. Las fórmulas las calcula ExcelMotor (assets/js/excel-motor.js), con nombres de
 * funciones en inglés y coma como separador, como Excel en inglés. Los datos del curso se cargan con
 * Data → Get Data y no ocupan espacio guardado: solo se guardan tus cambios. */
(function () {
  'use strict';
  const X = () => window.ExcelMotor;
  let main = null, Store = null, toast = (m) => console.log(m);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ALTO = 22, ANCHO = 96, ANCHO_FILAS = 46;
  const TABLAS = ['clientes', 'productos', 'pedidos', 'detalle_pedidos', 'empleados', 'categorias', 'clientes_crudo', 'pagos'];
  const INFO = {
    SUM: ['SUM(número1, [número2], …)', 'Suma los números de las celdas o rangos.'], AVERAGE: ['AVERAGE(número1, …)', 'Promedio de los números (ignora texto y vacíos).'],
    COUNT: ['COUNT(valor1, …)', 'Cuenta las celdas que tienen números.'], COUNTA: ['COUNTA(valor1, …)', 'Cuenta las celdas que no están vacías.'], COUNTBLANK: ['COUNTBLANK(rango)', 'Cuenta las celdas vacías.'],
    MAX: ['MAX(número1, …)', 'El número más grande.'], MIN: ['MIN(número1, …)', 'El número más chico.'], MEDIAN: ['MEDIAN(número1, …)', 'El valor del medio de los números ordenados.'],
    ROUND: ['ROUND(número, decimales)', 'Redondea a la cantidad de decimales indicada.'], ROUNDUP: ['ROUNDUP(número, decimales)', 'Redondea hacia arriba.'], ROUNDDOWN: ['ROUNDDOWN(número, decimales)', 'Redondea hacia abajo.'],
    IF: ['IF(prueba, valor_si_verdadero, [valor_si_falso])', 'Devuelve un valor u otro según una condición.'], IFS: ['IFS(prueba1, valor1, [prueba2, valor2], …)', 'Devuelve el valor de la primera condición verdadera.'],
    IFERROR: ['IFERROR(valor, valor_si_error)', 'Si el valor es un error (#N/A, #DIV/0!…), devuelve otro.'], AND: ['AND(lógico1, …)', 'VERDADERO si todas las condiciones lo son.'], OR: ['OR(lógico1, …)', 'VERDADERO si alguna condición lo es.'], NOT: ['NOT(lógico)', 'Invierte VERDADERO y FALSO.'],
    COUNTIF: ['COUNTIF(rango, criterio)', 'Cuenta las celdas que cumplen un criterio: "Chile", ">100", "A*".'], COUNTIFS: ['COUNTIFS(rango1, criterio1, rango2, criterio2, …)', 'Cuenta las filas que cumplen todos los criterios.'],
    SUMIF: ['SUMIF(rango, criterio, [rango_suma])', 'Suma las celdas que cumplen un criterio.'], SUMIFS: ['SUMIFS(rango_suma, rango1, criterio1, …)', 'Suma con varios criterios.'],
    AVERAGEIF: ['AVERAGEIF(rango, criterio, [rango_promedio])', 'Promedio de las celdas que cumplen un criterio.'], AVERAGEIFS: ['AVERAGEIFS(rango_promedio, rango1, criterio1, …)', 'Promedio con varios criterios.'],
    MAXIFS: ['MAXIFS(rango_max, rango1, criterio1, …)', 'Máximo con criterios.'], MINIFS: ['MINIFS(rango_min, rango1, criterio1, …)', 'Mínimo con criterios.'],
    VLOOKUP: ['VLOOKUP(valor, tabla, columna, [aproximado])', 'Busca en la primera columna de la tabla y devuelve la columna indicada. Usa FALSE para coincidencia exacta.'],
    XLOOKUP: ['XLOOKUP(valor, rango_búsqueda, rango_resultado, [si_no_encuentra])', 'Busca un valor y devuelve el de la misma posición en otro rango.'],
    HLOOKUP: ['HLOOKUP(valor, tabla, fila, [aproximado])', 'Como VLOOKUP pero buscando en la primera fila.'], MATCH: ['MATCH(valor, rango, [tipo])', 'La posición de un valor en un rango (0 = exacta).'], INDEX: ['INDEX(rango, fila, [columna])', 'El valor en una posición del rango.'],
    SUMPRODUCT: ['SUMPRODUCT(rango1, rango2, …)', 'Multiplica los rangos posición por posición y suma.'], UNIQUE: ['UNIQUE(rango)', 'Los valores distintos (devuelve el primero en esta réplica).'],
    CONCAT: ['CONCAT(texto1, …)', 'Une textos.'], TEXTJOIN: ['TEXTJOIN(separador, ignorar_vacíos, texto1, …)', 'Une textos con un separador.'], LEFT: ['LEFT(texto, [n])', 'Los primeros n caracteres.'], RIGHT: ['RIGHT(texto, [n])', 'Los últimos n caracteres.'], MID: ['MID(texto, inicio, n)', 'n caracteres desde una posición.'],
    LEN: ['LEN(texto)', 'Cantidad de caracteres.'], UPPER: ['UPPER(texto)', 'A mayúsculas.'], LOWER: ['LOWER(texto)', 'A minúsculas.'], PROPER: ['PROPER(texto)', 'Primera letra de cada palabra en mayúscula.'], TRIM: ['TRIM(texto)', 'Quita espacios sobrantes.'],
    SUBSTITUTE: ['SUBSTITUTE(texto, viejo, nuevo)', 'Reemplaza un texto por otro.'], FIND: ['FIND(buscado, texto)', 'Posición de un texto (distingue mayúsculas).'], SEARCH: ['SEARCH(buscado, texto)', 'Posición de un texto (sin distinguir mayúsculas).'], TEXT: ['TEXT(valor, formato)', 'Un número como texto con formato: "0.00", "0%", "yyyy-mm-dd".'], VALUE: ['VALUE(texto)', 'Convierte texto a número.'],
    DATE: ['DATE(año, mes, día)', 'Arma una fecha.'], YEAR: ['YEAR(fecha)', 'El año de una fecha.'], MONTH: ['MONTH(fecha)', 'El mes (1 a 12).'], DAY: ['DAY(fecha)', 'El día del mes.'], WEEKDAY: ['WEEKDAY(fecha, [tipo])', 'Día de la semana.'], TODAY: ['TODAY()', 'La fecha de hoy.'], EOMONTH: ['EOMONTH(fecha, meses)', 'Último día del mes.'], DATEDIF: ['DATEDIF(inicio, fin, "d"|"m"|"y")', 'Diferencia entre fechas.'],
    ISBLANK: ['ISBLANK(valor)', 'VERDADERO si está vacía.'], ISNUMBER: ['ISNUMBER(valor)', 'VERDADERO si es número.'], ISERROR: ['ISERROR(valor)', 'VERDADERO si es un error.'], ABS: ['ABS(número)', 'Valor absoluto.'], INT: ['INT(número)', 'Parte entera hacia abajo.'], MOD: ['MOD(número, divisor)', 'Resto de la división.'],
  };

  // ---------------------------------------------------------------- estado
  function S() {
    const d = Store.data;
    if (!d.excel) d.excel = { hojas: [{ nombre: 'Sheet1', celdas: {} }], activa: 0, eventos: {}, hist: [] };
    if (!d.excel.inicial) { d.excel.inicial = true; d.excel.hojas = [hojaBienvenida()]; d.excel.activa = 0; guardar(); }
    return d.excel;
  }
  function hojaBienvenida() {
    const c = {};
    const filas = [['Producto', 'Unidades', 'Precio', 'Total'], ['Teclado', 12, 25, '=B2*C2'], ['Mouse', 30, 12.5, '=B3*C3'], ['Monitor', 4, 180, '=B4*C4'], ['Auriculares', 15, 40, '=B5*C5'], ['Total', '=SUM(B2:B5)', '', '=SUM(D2:D5)']];
    filas.forEach((r, f) => r.forEach((v, k) => { if (v !== '') c[X().dir(k, f)] = { v: typeof v === 'number' ? String(v) : v }; }));
    ['A1', 'B1', 'C1', 'D1', 'A6', 'B6', 'D6'].forEach((d) => (c[d].b = true));
    ['C2', 'C3', 'C4', 'C5', 'D2', 'D3', 'D4', 'D5', 'D6'].forEach((d) => (c[d].fmt = 'moneda'));
    c.F1 = { v: 'Prueba:', b: true }; c.F2 = { v: 'Escribe =AVERAGE(C2:C5) en G2 y Enter' }; c.F3 = { v: 'Data → Get Data carga las tablas del curso' };
    return { nombre: 'Sheet1', celdas: c, anchos: { F: 280 } };
  }
  function guardar() { Store.saveSoon ? Store.saveSoon() : Store.save(); }
  function evento(n) { const e = S().eventos; e[n] = (e[n] || 0) + 1; guardar(); }
  const hoja = () => S().hojas[S().activa];

  let BASES = null;
  function base(nombre) {
    if (!BASES) BASES = {};
    if (!BASES[nombre]) { try { const T = (window.Engines && window.Engines.SQL && window.Engines.SQL.tables) || window.DataGen.build(); const t = T[nombre]; BASES[nombre] = t ? { cols: t.columns, filas: t.rows } : { cols: [], filas: [] }; } catch (e) { BASES[nombre] = { cols: [], filas: [] }; } }
    return BASES[nombre];
  }
  // valor crudo de una celda (lo que escribiste o el dato del curso)
  function crudo(h, c, f) {
    const H = S().hojas[h]; if (!H) return undefined;
    const cel = H.celdas[X().dir(c, f)]; if (cel) return cel.v;
    if (H.base) { const B = base(H.base); if (f === 0) return B.cols[c]; const r = B.filas[f - 1]; if (r) { const v = r[c]; return v == null ? undefined : v; } }
    return undefined;
  }
  function ultimaFila(h) { const H = S().hojas[h]; let m = 0; for (const d of Object.keys(H.celdas)) { const p = X().parseDir(d); if (p && p.f > m) m = p.f; } if (H.base) m = Math.max(m, base(H.base).filas.length); return m; }
  function ultimaCol(h) { const H = S().hojas[h]; let m = 0; for (const d of Object.keys(H.celdas)) { const p = X().parseDir(d); if (p && p.c > m) m = p.c; } if (H.base) m = Math.max(m, base(H.base).cols.length - 1); return m; }
  let EV = null;
  function evaluador() { if (!EV) { EV = X().crearEvaluador((h, c, f) => crudo(h, c, f), () => S().hojas.map((x) => x.nombre)); EV.ultimaFila = (h) => ultimaFila(h); } return EV; }
  const valor = (h, c, f) => evaluador().valor(h, c, f);
  const recalcular = () => evaluador().limpiar();

  // ---------------------------------------------------------------- cambios con deshacer
  const deshacer = [], rehacer = [];
  function escribirCeldas(cambios, sinHist) {
    // cambios: [{ h, d, cel }] (cel null borra)
    const H = S().hojas; const previo = cambios.map(({ h, d }) => ({ h, d, cel: H[h].celdas[d] ? JSON.parse(JSON.stringify(H[h].celdas[d])) : null }));
    for (const { h, d, cel } of cambios) { if (cel && (cel.v !== '' || cel.b || cel.fmt || cel.al)) H[h].celdas[d] = cel; else if (H[h].base && cel && cel.v === '') H[h].celdas[d] = { v: '' }; else delete H[h].celdas[d]; }
    if (!sinHist) { deshacer.push(previo); if (deshacer.length > 100) deshacer.shift(); rehacer.length = 0; }
    recalcular(); guardar();
  }
  function registrarFormula(v) {
    if (typeof v !== 'string' || v[0] !== '=') return;
    setTimeout(() => { const r = valor(S().activa, sel.c, sel.f); const j = S(); j.hist.push({ f: v.slice(0, 300), ok: !X().esErr(r) }); if (j.hist.length > 120) j.hist.splice(0, j.hist.length - 120); guardar(); }, 0);
  }

  // ---------------------------------------------------------------- vista
  let sel = { c: 0, f: 0 }, ancla = null, editando = null, verFormulas = false, pestaña = 'Home', arrastrando = false, rellenando = null;
  let filasVis = null; // filas visibles con filtro (null = todas)
  function vista(m, ctx) {
    main = m; Store = ctx.Store; toast = ctx.toast || toast;
    document.body.classList.add('xl-abierto');
    S(); EV = null; sel = { c: 0, f: 0 }; ancla = null; editando = null; filasVis = null;
    main.innerHTML = `<div class="xlp" id="xlp">
      <header class="xl-titulo"><span class="xl-marca">X</span><b>Libro de práctica</b><span class="xl-dim">— Excel (práctica)</span><span class="xl-sp"></span><a class="xl-volver" href="#/herramientas">← Curso</a></header>
      <nav class="xl-tabs" id="xlTabs"></nav><div class="xl-cinta" id="xlCinta"></div>
      <div class="xl-fbar"><input class="xl-nombre" id="xlNombre" spellcheck="false" title="Name Box"><span class="xl-fx">fx</span><input class="xl-formula" id="xlFormula" spellcheck="false" autocomplete="off"></div>
      <div class="xl-hoja" id="xlHoja" tabindex="0"><div class="xl-esp" id="xlEsp"></div><div class="xl-capa" id="xlCapa"></div><div class="xl-graficos" id="xlGraficos"></div></div>
      <footer class="xl-pie"><div class="xl-hojas" id="xlHojas"></div><div class="xl-estado" id="xlEstado"></div></footer>
      <div class="xl-pop" id="xlPop" hidden></div><div class="xl-modal" id="xlModal" hidden></div><input type="file" id="xlCsv" accept=".csv,.txt" hidden>
    </div>`;
    aplicarTema(); pintarTabs(); pintarCinta(); pintarHojas(); calcularFiltro(); pintarGrilla(); pintarGraficos(); actualizarBarra(); estado();
    const hj = $('#xlHoja');
    hj.addEventListener('scroll', () => pintarGrilla());
    hj.addEventListener('mousedown', mouseDown); document.addEventListener('mousemove', mouseMove); document.addEventListener('mouseup', mouseUp);
    hj.addEventListener('dblclick', (e) => { const td = e.target.closest('td[data-c]'); if (td) empezarEdicion(null); });
    document.removeEventListener('keydown', teclas); document.addEventListener('keydown', teclas);
    main.querySelector('#xlp').addEventListener('click', clic);
    const fx = $('#xlFormula');
    fx.addEventListener('focus', () => { if (!editando) { editando = { desde: 'barra', orig: textoCelda(sel.c, sel.f) }; } });
    fx.addEventListener('input', () => { if (editando && editando.input) editando.input.value = fx.value; });
    fx.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar(fx.value, 1, 0); hj.focus(); } else if (e.key === 'Escape') { cancelar(); hj.focus(); } e.stopPropagation(); });
    const nb = $('#xlNombre');
    nb.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const p = X().parseDir(nb.value.trim().split(':')[0]); if (p) { sel = p; ancla = null; visible(); pintarGrilla(); actualizarBarra(); } hj.focus(); } e.stopPropagation(); });
    $('#xlCsv').onchange = (e) => importarCsv(e.target.files[0]);
    hj.focus();
  }
  const $ = (s) => main.querySelector(s);
  function aplicarTema() { const r = main && main.querySelector('#xlp'); if (!r) return; const t = S().tema || 'system'; r.classList.toggle('xl-oscuro', t === 'dark'); r.classList.toggle('xl-claro', t === 'light'); }

  function pintarTabs() { $('#xlTabs').innerHTML = ['File', 'Home', 'Insert', 'Formulas', 'Data', 'View'].map((t) => `<button class="xl-tab${t === pestaña ? ' on' : ''}" data-tab="${t}">${t}</button>`).join(''); }
  const icx = (a, alt) => (window.IconosOficiales && window.IconosOficiales.excel(a) ? window.IconosOficiales.excel(a, 22) : alt);
  const boton = (a, ico, t, tip) => `<button class="xl-b" data-a="${a}" title="${esc(tip || t)}"><span class="xl-bi">${icx(a, ico)}</span><span>${t}</span></button>`;
  const grupo = (titulo, cont) => `<div class="xl-g"><div class="xl-gc">${cont}</div><div class="xl-gt">${titulo}</div></div>`;
  function pintarCinta() {
    const c = $('#xlCinta'); const H = hoja(); const cel = H.celdas[X().dir(sel.c, sel.f)] || {};
    const cintas = {
      File: grupo('Office Theme', `<select class="xl-sel" id="xlTema" title="Office Theme">${[['system', 'Use system setting'], ['light', 'White'], ['dark', 'Black']].map(([v, t]) => `<option value="${v}"${(S().tema || 'system') === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`) + grupo('Archivo', boton('csv-exportar', '⭳', 'Export CSV', 'Descarga la hoja activa como CSV') + boton('csv-importar', '⭱', 'Open CSV', 'Abre un archivo CSV en una hoja nueva') + boton('reiniciar', '↺', 'New workbook', 'Empieza un libro nuevo (borra el actual)')) + grupo('Curso', boton('salir', '←', 'Volver al curso')),
      Home: grupo('Clipboard', boton('copiar', '⧉', 'Copy', 'Ctrl+C') + boton('cortar', '✂', 'Cut', 'Ctrl+X') + boton('pegar', '📋', 'Paste', 'Ctrl+V')) +
        grupo('Font', `<button class="xl-b sq${cel.b ? ' on' : ''}" data-a="negrita" title="Bold (Ctrl+B)">${icx('negrita', '<b>B</b>')}</button>`) +
        grupo('Alignment', ['left', 'center', 'right'].map((al) => `<button class="xl-b sq${cel.al === al ? ' on' : ''}" data-a="al-${al}" title="Align ${al}">${icx('al-' + al, { left: '⯇≡', center: '≡', right: '≡⯈' }[al])}</button>`).join('')) +
        grupo('Number', `<select class="xl-sel" id="xlFmt" title="Number Format">${[['', 'General'], ['numero', 'Number'], ['moneda', 'Currency'], ['porcentaje', 'Percentage'], ['entero', 'Integer'], ['fecha', 'Date']].map(([v, t]) => `<option value="${v}"${(cel.fmt || '') === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`) +
        grupo('Editing', boton('autosuma', 'Σ', 'AutoSum', 'Suma el rango de arriba (Alt+=)') + boton('orden-asc', 'A↓', 'Sort A→Z') + boton('filtro', '⏷', 'Filter', 'Activa el filtro en la fila de encabezados (Ctrl+Shift+L)') + boton('borrar', '⌫', 'Clear', 'Borra el contenido (Supr)')),
      Insert: grupo('Tables', boton('pivot', '▦', 'PivotTable', 'Resume una tabla agrupando por un campo')) + grupo('Charts', boton('graf-col', '▮▮', 'Column') + boton('graf-bar', '▬', 'Bar') + boton('graf-linea', '⟋', 'Line') + boton('graf-torta', '◔', 'Pie')),
      Formulas: grupo('Function Library', boton('insertar-fn', 'fx', 'Insert Function', 'Busca una función y mira cómo se usa') + boton('autosuma', 'Σ', 'AutoSum')) + grupo('Formula Auditing', `<button class="xl-b${verFormulas ? ' on' : ''}" data-a="ver-formulas" title="Ctrl+\`"><span class="xl-bi">${icx('ver-formulas', 'ƒ')}</span><span>Show Formulas</span></button>`),
      Data: grupo('Get & Transform Data', boton('obtener', '⛁', 'Get Data', 'Carga una tabla del curso en una hoja nueva') + boton('csv-importar', '⭱', 'From Text/CSV')) + grupo('Sort & Filter', boton('orden-asc', 'A↓', 'Sort A→Z') + boton('orden-desc', 'Z↓', 'Sort Z→A') + boton('filtro', '⏷', 'Filter')) + grupo('Data Tools', boton('duplicados', '⧉', 'Remove Duplicates', 'Quita las filas repetidas de la tabla')),
      View: grupo('Show', `<button class="xl-b${verFormulas ? ' on' : ''}" data-a="ver-formulas"><span class="xl-bi">${icx('ver-formulas', 'ƒ')}</span><span>Formulas</span></button>`) + grupo('Ayuda', boton('leccion', '📘', 'Lección', 'Excel por dentro') + boton('atajos', '⌨', 'Shortcuts')),
    };
    c.innerHTML = cintas[pestaña] || '';
    const tm = c.querySelector('#xlTema'); if (tm) tm.onchange = () => { S().tema = tm.value; guardar(); aplicarTema(); };
    const f = c.querySelector('#xlFmt'); if (f) f.onchange = () => { aplicarARango((cel0) => ({ ...cel0, fmt: f.value || undefined })); evento('formato'); };
  }
  function pintarHojas() {
    const j = S();
    $('#xlHojas').innerHTML = j.hojas.map((h, i) => `<button class="xl-hj${i === j.activa ? ' on' : ''}" data-hoja="${i}" title="Doble clic para renombrar">${esc(h.nombre)}</button>`).join('') + '<button class="xl-hj-mas" data-a="hoja-nueva" title="New sheet">+</button>';
  }

  // ---------------------------------------------------------------- grilla virtualizada
  const anchoCol = (c) => { const a = (hoja().anchos || {})[X().colTxt(c)]; return a || ANCHO; };
  function columnasTotales() { return Math.max(26, ultimaCol(S().activa) + 6); }
  function filasTotales() { return Math.max(100, ultimaFila(S().activa) + 30); }
  function calcularFiltro() {
    const H = hoja(); filasVis = null;
    if (!H.filtro || !Object.keys(H.filtro.ocultos || {}).length) return;
    const fin = ultimaFila(S().activa); const vis = [];
    for (let f = 0; f <= fin + 20; f++) {
      if (f <= H.filtro.fila || f > fin) { vis.push(f); continue; }
      let ok = true;
      for (const [c, ocultos] of Object.entries(H.filtro.ocultos)) { const v = X().mostrar(valor(S().activa, Number(c), f)); if (ocultos.includes(v)) { ok = false; break; } }
      if (ok) vis.push(f);
    }
    filasVis = vis;
  }
  const filaReal = (i) => (filasVis ? filasVis[i] : i);
  const indiceDe = (f) => (filasVis ? filasVis.indexOf(f) : f);
  function nFilas() { return filasVis ? filasVis.length : filasTotales(); }
  function rangoSel() { const a = ancla || sel; return { c0: Math.min(a.c, sel.c), c1: Math.max(a.c, sel.c), f0: Math.min(a.f, sel.f), f1: Math.max(a.f, sel.f) }; }
  function pintarGrilla() {
    const hj = $('#xlHoja'); if (!hj) return;
    const nc = columnasTotales(); const nf = nFilas(); const h = S().activa; const H = hoja();
    const anchos = []; let tot = ANCHO_FILAS; for (let c = 0; c < nc; c++) { anchos.push(anchoCol(c)); tot += anchos[c]; }
    const esp = $('#xlEsp'); esp.style.height = (nf + 1) * ALTO + 'px'; esp.style.width = tot + 'px';
    const top = hj.scrollTop, alto = hj.clientHeight;
    const i0 = Math.max(0, Math.floor(top / ALTO) - 2), i1 = Math.min(nf - 1, Math.ceil((top + alto) / ALTO) + 2);
    const r = rangoSel(); const fil = H.filtro;
    let html = `<table class="xl-t" style="top:${i0 * ALTO + ALTO}px;width:${tot}px"><colgroup><col style="width:${ANCHO_FILAS}px">${anchos.map((a) => `<col style="width:${a}px">`).join('')}</colgroup><tbody>`;
    for (let i = i0; i <= i1; i++) {
      const f = filaReal(i); if (f === undefined) break;
      html += `<tr style="height:${ALTO}px"><th class="xl-rh${f >= r.f0 && f <= r.f1 ? ' on' : ''}" data-fila="${f}">${f + 1}</th>`;
      for (let c = 0; c < nc; c++) {
        const d = X().dir(c, f); const cel = H.celdas[d] || {};
        const raw = crudo(h, c, f);
        let v = null, texto = '';
        if (verFormulas && typeof raw === 'string' && raw[0] === '=') texto = raw;
        else if (raw !== undefined && raw !== null && raw !== '') { v = valor(h, c, f); texto = X().mostrar(v, cel.fmt); }
        const enSel = c >= r.c0 && c <= r.c1 && f >= r.f0 && f <= r.f1;
        const cls = [typeof v === 'number' && !verFormulas ? 'num' : '', X().esErr(v) ? 'err' : '', cel.b ? 'b' : '', cel.al ? 'al-' + cel.al : '', enSel ? 'sel' : '', c === sel.c && f === sel.f ? 'act' : ''].filter(Boolean).join(' ');
        const flecha = fil && f === fil.fila && c >= fil.c0 && c <= fil.c1 ? `<button class="xl-ff${(fil.ocultos || {})[c] ? ' on' : ''}" data-filtro="${c}" title="Filtrar">▾</button>` : '';
        html += `<td data-c="${c}" data-f="${f}"${cls ? ` class="${cls}"` : ''}>${esc(texto)}${flecha}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    // encabezados de columnas fijos arriba
    html += `<div class="xl-ch" style="top:${top}px;width:${tot}px"><div class="xl-esq" style="width:${ANCHO_FILAS}px" title="Seleccionar todo"></div>${anchos.map((a, c) => `<div class="xl-chc${c >= r.c0 && c <= r.c1 ? ' on' : ''}" style="width:${a}px" data-col="${c}">${X().colTxt(c)}<span class="xl-res" data-res="${c}"></span></div>`).join('')}</div>`;
    $('#xlCapa').innerHTML = html;
    // controlador de relleno
    const act = $('#xlCapa').querySelector(`td[data-c="${r.c1}"][data-f="${r.f1}"]`);
    if (act && !editando) { const tr = act.getBoundingClientRect(), hr = hj.getBoundingClientRect(); const h0 = document.createElement('div'); h0.className = 'xl-relleno'; h0.title = 'Arrastra para rellenar'; h0.style.left = tr.right - hr.left + hj.scrollLeft - 4 + 'px'; h0.style.top = tr.bottom - hr.top + hj.scrollTop - 4 + 'px'; $('#xlCapa').append(h0); }
    if (editando && editando.input && !editando.input.isConnected) colocarEditor();
  }
  function visible() {
    const hj = $('#xlHoja'); const i = indiceDe(sel.f); if (i < 0) return;
    const y = (i + 1) * ALTO; if (y < hj.scrollTop + ALTO) hj.scrollTop = y - ALTO; else if (y + ALTO > hj.scrollTop + hj.clientHeight) hj.scrollTop = y + ALTO - hj.clientHeight;
    let x = ANCHO_FILAS; for (let c = 0; c < sel.c; c++) x += anchoCol(c); const w = anchoCol(sel.c);
    if (x < hj.scrollLeft + ANCHO_FILAS) hj.scrollLeft = x - ANCHO_FILAS; else if (x + w > hj.scrollLeft + hj.clientWidth) hj.scrollLeft = x + w - hj.clientWidth;
  }
  function textoCelda(c, f) { const v = crudo(S().activa, c, f); return v == null ? '' : String(v); }
  function actualizarBarra() {
    const r = rangoSel(); const nb = $('#xlNombre'); const fx = $('#xlFormula'); if (!nb) return;
    nb.value = r.c0 === r.c1 && r.f0 === r.f1 ? X().dir(sel.c, sel.f) : X().dir(r.c0, r.f0) + ':' + X().dir(r.c1, r.f1);
    if (!editando) fx.value = textoCelda(sel.c, sel.f);
    pintarCinta(); estado();
  }
  function estado() {
    const el = $('#xlEstado'); if (!el) return; const r = rangoSel(); const h = S().activa;
    let suma = 0, n = 0, cuenta = 0;
    if ((r.c1 - r.c0 + 1) * (r.f1 - r.f0 + 1) <= 200000 && (r.c1 > r.c0 || r.f1 > r.f0)) for (let f = r.f0; f <= Math.min(r.f1, ultimaFila(h)); f++) for (let c = r.c0; c <= r.c1; c++) { const raw = crudo(h, c, f); if (raw === undefined || raw === null || raw === '') continue; const v = valor(h, c, f); cuenta++; if (typeof v === 'number') { suma += v; n++; } }
    const fmt = (x) => X().mostrar(Math.round(x * 100) / 100);
    el.innerHTML = `<span>${editando ? 'Edit' : 'Ready'}</span>${filasVis ? `<span>Filter Mode: ${filasVis.filter((f) => f > hoja().filtro.fila && f <= ultimaFila(h)).length} visibles</span>` : ''}<span class="xl-sp"></span>${cuenta > 1 ? `${n ? `<span>Average: ${fmt(suma / n)}</span>` : ''}<span>Count: ${cuenta}</span>${n ? `<span>Sum: ${fmt(suma)}</span>` : ''}` : ''}`;
  }

  // ---------------------------------------------------------------- edición
  function colocarEditor() {
    const hj = $('#xlHoja'); const td = $('#xlCapa').querySelector(`td[data-c="${editando.c}"][data-f="${editando.f}"]`); if (!td) return;
    const tr = td.getBoundingClientRect(), hr = hj.getBoundingClientRect();
    const inp = editando.input || document.createElement('input');
    inp.className = 'xl-editor'; inp.spellcheck = false;
    inp.style.left = tr.left - hr.left + hj.scrollLeft + 'px'; inp.style.top = tr.top - hr.top + hj.scrollTop + 'px'; inp.style.minWidth = tr.width + 'px'; inp.style.height = tr.height + 'px';
    if (!editando.input) {
      editando.input = inp;
      inp.addEventListener('input', () => { $('#xlFormula').value = inp.value; sugerir(inp); });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmar(inp.value, e.shiftKey ? -1 : 1, 0); }
        else if (e.key === 'Tab') { e.preventDefault(); confirmar(inp.value, 0, e.shiftKey ? -1 : 1); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelar(); }
        else if (e.key === 'F4') { e.preventDefault(); alternarDolar(inp); }
        e.stopPropagation();
      });
    }
    $('#xlCapa').append(inp);
  }
  function empezarEdicion(inicial) {
    if (editando) return;
    editando = { c: sel.c, f: sel.f, orig: textoCelda(sel.c, sel.f) };
    colocarEditor(); const inp = editando.input; inp.value = inicial != null ? inicial : editando.orig; $('#xlFormula').value = inp.value;
    inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); estado();
  }
  function cerrarEditor() { if (editando && editando.input) editando.input.remove(); editando = null; cerrarSugerencias(); }
  function cancelar() { cerrarEditor(); actualizarBarra(); pintarGrilla(); $('#xlHoja').focus(); }
  function confirmar(texto, df, dc) {
    const c = editando && editando.c != null ? editando.c : sel.c, f = editando && editando.f != null ? editando.f : sel.f;
    cerrarEditor();
    let v = texto;
    if (typeof v === 'string' && v[0] === '=') v = v.replace(/(^=|[(,])\s*([a-z_][\w.]*)\s*\(/gi, (m, a, n) => a + n.toUpperCase() + '(');
    const d = X().dir(c, f); const prev = hoja().celdas[d] || {};
    if (v !== textoCelda(c, f)) { escribirCeldas([{ h: S().activa, d, cel: { ...prev, v } }]); sel = { c, f }; registrarFormula(v); if (filasVis) calcularFiltro(); }
    sel = { c: Math.max(0, c + dc), f: Math.max(0, f + df) }; ancla = null; visible(); pintarGrilla(); pintarGraficos(); actualizarBarra(); $('#xlHoja').focus();
  }
  function alternarDolar(inp) {
    // F4 alterna A1 → $A$1 → A$1 → $A1 en la referencia junto al cursor
    const t = inp.value, p = inp.selectionStart; const re = /\$?[A-Z]{1,3}\$?\d+/gi; let m;
    while ((m = re.exec(t))) { if (p >= m.index && p <= m.index + m[0].length) { const r = m[0].replace(/\$/g, ''); const col = r.match(/[A-Z]+/i)[0], fila = r.match(/\d+/)[0]; const ciclo = [col + fila, '$' + col + '$' + fila, col + '$' + fila, '$' + col + fila]; const k = ciclo.indexOf(m[0]); const n = ciclo[(k + 1) % 4]; inp.value = t.slice(0, m.index) + n + t.slice(m.index + m[0].length); inp.setSelectionRange(m.index + n.length, m.index + n.length); $('#xlFormula').value = inp.value; return; } }
  }
  function sugerir(inp) {
    const m = /(?:^=|[(,+\-*/&=<>]\s*)([A-Za-z]{2,})$/.exec(inp.value.slice(0, inp.selectionStart));
    if (!m || inp.value[0] !== '=') return cerrarSugerencias();
    const pref = m[1].toUpperCase(); const ls = X().LISTA.filter((n) => n.startsWith(pref)).slice(0, 8); if (!ls.length) return cerrarSugerencias();
    const p = $('#xlPop'); p.hidden = false; p.className = 'xl-pop xl-sug';
    const r = inp.getBoundingClientRect(), rr = $('#xlp').getBoundingClientRect();
    p.style.left = r.left - rr.left + 'px'; p.style.top = r.bottom - rr.top + 'px';
    p.innerHTML = ls.map((n) => `<button data-sug="${n}"><b>${n}</b><span>${esc((INFO[n] || ['', ''])[1])}</span></button>`).join('');
    p._pref = pref;
  }
  function cerrarSugerencias() { const p = $('#xlPop'); if (p && p.classList.contains('xl-sug')) { p.hidden = true; p.className = 'xl-pop'; } }

  // ---------------------------------------------------------------- ratón
  function celdaDe(e) { const td = e.target.closest && e.target.closest('td[data-c]'); return td ? { c: Number(td.dataset.c), f: Number(td.dataset.f) } : null; }
  function mouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.xl-editor') || e.target.closest('.xl-graf')) return;
    if (e.target.dataset.filtro != null) { e.preventDefault(); return menuFiltro(Number(e.target.dataset.filtro), e); }
    if (e.target.classList.contains('xl-relleno')) { e.preventDefault(); rellenando = { r: rangoSel(), hasta: rangoSel().f1 }; return; }
    if (e.target.dataset.res != null) { e.preventDefault(); const c = Number(e.target.dataset.res); redimensionando = { c, x: e.clientX, w: anchoCol(c) }; return; }
    const col = e.target.closest('[data-col]'); if (col) { const c = Number(col.dataset.col); if (editando) cerrarEditor(); ancla = { c, f: 0 }; sel = { c, f: Math.max(ultimaFila(S().activa), 0) }; if (e.shiftKey) ancla.c = sel.c; pintarGrilla(); actualizarBarra(); return; }
    const fil = e.target.closest('[data-fila]'); if (fil) { const f = Number(fil.dataset.fila); if (editando) cerrarEditor(); ancla = { c: 0, f }; sel = { c: Math.max(ultimaCol(S().activa), 0), f }; pintarGrilla(); actualizarBarra(); return; }
    const p = celdaDe(e); if (!p) return;
    // mientras se escribe una fórmula, el clic agrega la referencia de la celda
    if (editando && editando.input && /[=(,+\-*/&<>:]$/.test(editando.input.value.slice(0, editando.input.selectionStart))) {
      e.preventDefault(); const inp = editando.input; const pos = inp.selectionStart; const ref = X().dir(p.c, p.f);
      inp.value = inp.value.slice(0, pos) + ref + inp.value.slice(pos); inp.setSelectionRange(pos + ref.length, pos + ref.length); $('#xlFormula').value = inp.value; editando.refDesde = { pos, c: p.c, f: p.f }; arrastrando = 'ref'; setTimeout(() => inp.focus(), 0); return;
    }
    if (editando) confirmar(editando.input ? editando.input.value : $('#xlFormula').value, 0, 0);
    e.preventDefault();
    if (e.shiftKey) { ancla = ancla || { ...sel }; sel = p; } else { sel = p; ancla = { ...p }; }
    arrastrando = true; pintarGrilla(); actualizarBarra(); $('#xlHoja').focus();
  }
  let redimensionando = null;
  function mouseMove(e) {
    if (!main || !$('#xlp')) return;
    if (redimensionando) { const H = hoja(); H.anchos = H.anchos || {}; H.anchos[X().colTxt(redimensionando.c)] = Math.max(30, redimensionando.w + e.clientX - redimensionando.x); pintarGrilla(); return; }
    if (rellenando) { const p = celdaDe(e); if (p) { rellenando.hasta = Math.max(rellenando.r.f1, p.f); const r = rellenando.r; ancla = { c: r.c0, f: r.f0 }; sel = { c: r.c1, f: rellenando.hasta }; pintarGrilla(); } return; }
    if (arrastrando === 'ref' && editando && editando.refDesde) { const p = celdaDe(e); if (!p) return; const d = editando.refDesde; const inp = editando.input; const a = X().dir(Math.min(d.c, p.c), Math.min(d.f, p.f)), b = X().dir(Math.max(d.c, p.c), Math.max(d.f, p.f)); const txt = a === b ? a : a + ':' + b; const resto = inp.value.slice(d.pos).replace(/^[A-Z]{1,3}\d+(:[A-Z]{1,3}\d+)?/, ''); inp.value = inp.value.slice(0, d.pos) + txt + resto; inp.setSelectionRange(d.pos + txt.length, d.pos + txt.length); $('#xlFormula').value = inp.value; return; }
    if (arrastrando === true) { const p = celdaDe(e); if (p && (p.c !== sel.c || p.f !== sel.f)) { sel = p; pintarGrilla(); actualizarBarra(); } }
  }
  function mouseUp() {
    if (redimensionando) { redimensionando = null; guardar(); }
    if (rellenando) { const { r, hasta } = rellenando; rellenando = null; if (hasta > r.f1) rellenar(r, hasta); }
    if (arrastrando === 'ref' && editando && editando.input) editando.input.focus();
    arrastrando = false;
  }
  function rellenar(r, hasta) {
    const h = S().activa; const H = hoja(); const cambios = [];
    for (let c = r.c0; c <= r.c1; c++) {
      const alto = r.f1 - r.f0 + 1;
      const nums = []; for (let f = r.f0; f <= r.f1; f++) { const t = textoCelda(c, f); nums.push(/^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null); }
      const serie = alto >= 2 && nums.every((n) => n !== null) ? nums[1] - nums[0] : null;
      for (let f = r.f1 + 1; f <= hasta; f++) {
        const k = (f - r.f0) % alto; const fo = r.f0 + k; const d0 = X().dir(c, fo); const prev = H.celdas[d0] || {};
        let v = textoCelda(c, fo);
        if (serie !== null) v = String(Math.round((nums[nums.length - 1] + serie * (f - r.f1)) * 1e10) / 1e10);
        else v = X().moverFormula(v, 0, f - fo);
        cambios.push({ h, d: X().dir(c, f), cel: { ...prev, v } });
      }
    }
    escribirCeldas(cambios); evento('relleno'); sel = { c: r.c1, f: hasta }; ancla = { c: r.c0, f: r.f0 }; pintarGrilla(); pintarGraficos(); actualizarBarra();
  }

  // ---------------------------------------------------------------- teclado
  let porta = null;
  function teclas(e) {
    if (!document.getElementById('xlp')) { document.removeEventListener('keydown', teclas); return; }
    if (!$('#xlModal').hidden) { if (e.key === 'Escape') cerrarModal(); return; }
    if (editando || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const mod = e.ctrlKey || e.metaKey; const k = e.key;
    const mover = (dc, df) => {
      e.preventDefault();
      const base0 = e.shiftKey ? { ...sel } : sel; if (e.shiftKey && !ancla) ancla = { ...sel }; if (!e.shiftKey) ancla = null;
      if (mod) { // Ctrl+flecha: salta al borde de los datos
        let { c, f } = base0; const lleno = (cc, ff) => { const v = crudo(S().activa, cc, ff); return v !== undefined && v !== null && v !== ''; };
        const lim = { c: columnasTotales() - 1, f: Math.max(ultimaFila(S().activa), 0) };
        if (lleno(c + dc, f + df) && lleno(c, f)) { while (c + dc >= 0 && f + df >= 0 && c + dc <= lim.c && f + df <= lim.f && lleno(c + dc, f + df)) { c += dc; f += df; } }
        else { c += dc; f += df; while (c >= 0 && f >= 0 && c <= lim.c && f <= lim.f && !lleno(c, f)) { c += dc; f += df; } c = Math.min(Math.max(c, 0), lim.c); f = Math.min(Math.max(f, 0), lim.f); }
        sel = { c, f };
      } else {
        let f = sel.f; if (df && filasVis) { const i = indiceDe(sel.f) + df; f = filaReal(Math.max(0, i)) ?? sel.f; } else f = Math.max(0, sel.f + df);
        sel = { c: Math.max(0, sel.c + dc), f };
      }
      visible(); pintarGrilla(); actualizarBarra();
    };
    if (k === 'ArrowDown') return mover(0, 1); if (k === 'ArrowUp') return mover(0, -1); if (k === 'ArrowLeft') return mover(-1, 0); if (k === 'ArrowRight') return mover(1, 0);
    if (k === 'Enter') { e.preventDefault(); ancla = null; return mover(0, e.shiftKey ? -1 : 1); }
    if (k === 'Tab') { e.preventDefault(); ancla = null; return mover(e.shiftKey ? -1 : 1, 0); }
    if (k === 'F2') { e.preventDefault(); return empezarEdicion(null); }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); return accion('borrar'); }
    if (mod && k.toLowerCase() === 'c') { e.preventDefault(); return accion('copiar'); }
    if (mod && k.toLowerCase() === 'x') { e.preventDefault(); return accion('cortar'); }
    if (mod && k.toLowerCase() === 'v') { e.preventDefault(); return accion('pegar'); }
    if (mod && k.toLowerCase() === 'z') { e.preventDefault(); return accion('deshacer'); }
    if (mod && k.toLowerCase() === 'y') { e.preventDefault(); return accion('rehacer'); }
    if (mod && k.toLowerCase() === 'b') { e.preventDefault(); return accion('negrita'); }
    if (mod && k.toLowerCase() === 'd') { e.preventDefault(); const r = rangoSel(); if (r.f1 > r.f0) rellenar({ ...r, f1: r.f0 }, r.f1); return; }
    if (mod && e.shiftKey && k.toLowerCase() === 'l') { e.preventDefault(); return accion('filtro'); }
    if (mod && k.toLowerCase() === 'a') { e.preventDefault(); ancla = { c: 0, f: 0 }; sel = { c: ultimaCol(S().activa), f: ultimaFila(S().activa) }; pintarGrilla(); actualizarBarra(); return; }
    if (mod && k === '`') { e.preventDefault(); return accion('ver-formulas'); }
    if (e.altKey && k === '=') { e.preventDefault(); return accion('autosuma'); }
    if (!mod && !e.altKey && k.length === 1) { e.preventDefault(); ancla = null; empezarEdicion(k); }
  }

  // ---------------------------------------------------------------- acciones
  function aplicarARango(fn) {
    const r = rangoSel(); const h = S().activa; const H = hoja(); const cambios = [];
    for (let f = r.f0; f <= Math.min(r.f1, r.f0 + 5000); f++) for (let c = r.c0; c <= r.c1; c++) { const d = X().dir(c, f); const prev = H.celdas[d] || (crudo(h, c, f) !== undefined ? { v: crudo(h, c, f) == null ? '' : String(crudo(h, c, f)) } : { v: '' }); cambios.push({ h, d, cel: fn({ ...prev }) }); }
    escribirCeldas(cambios); pintarGrilla(); actualizarBarra();
  }
  function region() {
    // la tabla contigua alrededor de la celda activa (como Ctrl+A dentro de una tabla)
    const h = S().activa; const lleno = (c, f) => { const v = crudo(h, c, f); return v !== undefined && v !== null && v !== ''; };
    let { c, f } = sel; if (!lleno(c, f)) return null;
    let c0 = c, c1 = c, f0 = f, f1 = f; let cambio = true;
    while (cambio) { cambio = false;
      if (c0 > 0 && [...Array(f1 - f0 + 1)].some((_, i) => lleno(c0 - 1, f0 + i))) { c0--; cambio = true; }
      if ([...Array(f1 - f0 + 1)].some((_, i) => lleno(c1 + 1, f0 + i))) { c1++; cambio = true; }
      if (f0 > 0 && [...Array(c1 - c0 + 1)].some((_, i) => lleno(c0 + i, f0 - 1))) { f0--; cambio = true; }
      if (f1 - f0 < 200000 && [...Array(c1 - c0 + 1)].some((_, i) => lleno(c0 + i, f1 + 1))) { f1++; cambio = true; }
    }
    return { c0, c1, f0, f1 };
  }
  // convierte la hoja a celdas propias (para ordenar o quitar duplicados en una tabla del curso)
  function materializar(r) {
    const h = S().activa; const H = hoja(); if (!H.base) return;
    for (let f = 0; f <= ultimaFila(h); f++) for (let c = 0; c <= ultimaCol(h); c++) { const d = X().dir(c, f); if (!H.celdas[d]) { const v = crudo(h, c, f); if (v !== undefined && v !== null) H.celdas[d] = { v: String(v) }; } }
    delete H.base; recalcular();
  }
  function ordenar(desc) {
    const r = region(); if (!r) return toast('Selecciona una celda dentro de una tabla');
    const h = S().activa; const tieneEnc = typeof valor(h, sel.c, r.f0) === 'string' && r.f1 > r.f0;
    const f0 = tieneEnc ? r.f0 + 1 : r.f0;
    if (r.f1 - f0 > 30000) return toast('La tabla es muy grande para ordenarla en esta réplica');
    materializar(); const H = hoja();
    const filas = []; for (let f = f0; f <= r.f1; f++) { const fila = []; for (let c = r.c0; c <= r.c1; c++) fila.push(H.celdas[X().dir(c, f)] || null); filas.push({ fila, clave: valor(h, sel.c, f) }); }
    filas.sort((a, b) => { const k = X().cmp(a.clave ?? '', b.clave ?? ''); return desc ? -k : k; });
    const cambios = [];
    filas.forEach((x, i) => x.fila.forEach((cel, k) => cambios.push({ h, d: X().dir(r.c0 + k, f0 + i), cel: cel ? { ...cel, v: X().moverFormula(cel.v, 0, 0) } : null })));
    escribirCeldas(cambios); evento('ordenar'); calcularFiltro(); pintarGrilla(); pintarGraficos(); actualizarBarra();
    toast(`Ordenado por ${X().colTxt(sel.c)} ${desc ? 'Z→A' : 'A→Z'}${tieneEnc ? ' (la primera fila quedó como encabezado)' : ''}`);
  }
  function quitarDuplicados() {
    const r = region(); if (!r) return toast('Selecciona una celda dentro de una tabla');
    const h = S().activa; const f0 = r.f0 + 1; if (r.f1 - f0 > 30000) return toast('La tabla es muy grande para esta réplica');
    materializar(); const H = hoja();
    const vistos = new Set(); const quedan = []; let quitadas = 0;
    for (let f = f0; f <= r.f1; f++) { const fila = []; const clave = []; for (let c = r.c0; c <= r.c1; c++) { fila.push(H.celdas[X().dir(c, f)] || null); clave.push(String(X().mostrar(valor(h, c, f))).toLowerCase()); } const k = clave.join('\u0001'); if (vistos.has(k)) { quitadas++; continue; } vistos.add(k); quedan.push(fila); }
    const cambios = [];
    for (let i = 0; i <= r.f1 - f0; i++) for (let k = 0; k <= r.c1 - r.c0; k++) cambios.push({ h, d: X().dir(r.c0 + k, f0 + i), cel: quedan[i] ? quedan[i][k] : null });
    escribirCeldas(cambios); evento('duplicados'); pintarGrilla(); actualizarBarra();
    abrirModal('Remove Duplicates', `<p>Se encontraron y quitaron <b>${quitadas}</b> filas duplicadas; quedan <b>${quedan.length}</b> valores únicos.</p><p class="xl-dim">Se comparan las filas completas, sin distinguir mayúsculas.</p>`, [['OK', cerrarModal]]);
  }
  function autoSuma() {
    const h = S().activa; let f = sel.f - 1; if (f < 0) return;
    while (f >= 0 && typeof valor(h, sel.c, f) === 'number') f--;
    const f0 = f + 1; if (f0 > sel.f - 1) { empezarEdicion('=SUM()'); return; }
    const formula = `=SUM(${X().dir(sel.c, f0)}:${X().dir(sel.c, sel.f - 1)})`;
    empezarEdicion(formula);
  }
  function exportarCsv() {
    const h = S().activa; const fin = ultimaFila(h), finC = ultimaCol(h);
    const campo = (v) => { const s = X().mostrar(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const ls = []; for (let f = 0; f <= fin; f++) { const r = []; for (let c = 0; c <= finC; c++) r.push(campo(valor(h, c, f))); ls.push(r.join(',')); }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ls.join('\n') + '\n'], { type: 'text/csv' })); a.download = hoja().nombre + '.csv'; document.body.append(a); a.click(); a.remove(); evento('exportar');
  }
  async function importarCsv(file) {
    if (!file) return; if (file.size > 2000000) return toast('El archivo es muy grande para esta réplica (máx. 2 MB)');
    const t = await file.text(); const filas = parseCsv(t); const c = {};
    filas.slice(0, 20000).forEach((r, f) => r.forEach((v, k) => { if (v !== '') c[X().dir(k, f)] = { v }; }));
    nuevaHoja(file.name.replace(/\.\w+$/, '').slice(0, 28), { celdas: c }); evento('csv');
  }
  function parseCsv(t) { const out = []; let fila = [], campo = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += ch; continue; } if (ch === '"') q = true; else if (ch === ',') { fila.push(campo); campo = ''; } else if (ch === '\n') { fila.push(campo); out.push(fila); fila = []; campo = ''; } else if (ch !== '\r') campo += ch; } if (campo || fila.length) { fila.push(campo); out.push(fila); } return out; }
  function nuevaHoja(nombre, extra = {}) {
    const j = S(); let n = nombre || 'Sheet'; let i = 1; const existe = (x) => j.hojas.some((h) => h.nombre.toLowerCase() === x.toLowerCase());
    if (!nombre) { while (existe('Sheet' + i)) i++; n = 'Sheet' + i; } else { let k = 2; const b0 = n; while (existe(n)) n = b0 + ' (' + k++ + ')'; }
    j.hojas.push({ nombre: n, celdas: {}, ...extra }); j.activa = j.hojas.length - 1; guardar(); cambiarHoja(j.activa);
  }
  function cambiarHoja(i) { const j = S(); j.activa = i; guardar(); sel = { c: 0, f: 0 }; ancla = null; cerrarEditor(); recalcular(); calcularFiltro(); const hj = $('#xlHoja'); hj.scrollTop = 0; hj.scrollLeft = 0; pintarHojas(); pintarGrilla(); pintarGraficos(); actualizarBarra(); }

  function accion(a) {
    const h = S().activa; const H = hoja();
    switch (a) {
      case 'copiar': case 'cortar': { const r = rangoSel(); porta = { r, h, cortar: a === 'cortar', celdas: [] }; for (let f = r.f0; f <= r.f1; f++) { const fila = []; for (let c = r.c0; c <= r.c1; c++) fila.push(H.celdas[X().dir(c, f)] ? JSON.parse(JSON.stringify(H.celdas[X().dir(c, f)])) : (crudo(h, c, f) != null ? { v: String(crudo(h, c, f)) } : null)); porta.celdas.push(fila); } try { navigator.clipboard.writeText(porta.celdas.map((fl, i) => fl.map((cel, k) => X().mostrar(valor(h, r.c0 + k, r.f0 + i))).join('\t')).join('\n')); } catch (e) { /* sin portapapeles */ } toast(a === 'copiar' ? 'Copiado' : 'Cortado: pega con Ctrl+V'); return; }
      case 'pegar': { if (!porta) return toast('Primero copia algo (Ctrl+C)'); const cambios = []; const df = sel.f - porta.r.f0, dc = sel.c - porta.r.c0; porta.celdas.forEach((fl, i) => fl.forEach((cel, k) => cambios.push({ h, d: X().dir(sel.c + k, sel.f + i), cel: cel ? { ...cel, v: porta.cortar ? cel.v : X().moverFormula(cel.v, dc, df) } : null }))); if (porta.cortar) { porta.celdas.forEach((fl, i) => fl.forEach((_, k) => { const d = X().dir(porta.r.c0 + k, porta.r.f0 + i); if (!cambios.some((x) => x.d === d && x.h === h)) cambios.unshift({ h: porta.h, d, cel: null }); })); porta = null; } escribirCeldas(cambios); evento('pegar'); pintarGrilla(); pintarGraficos(); actualizarBarra(); return; }
      case 'deshacer': { const p = deshacer.pop(); if (!p) return; const actual = p.map(({ h: hh, d }) => ({ h: hh, d, cel: S().hojas[hh].celdas[d] ? JSON.parse(JSON.stringify(S().hojas[hh].celdas[d])) : null })); rehacer.push(actual); escribirCeldas(p, true); pintarGrilla(); pintarGraficos(); actualizarBarra(); return; }
      case 'rehacer': { const p = rehacer.pop(); if (!p) return; escribirCeldas(p, true); deshacer.push(p); pintarGrilla(); pintarGraficos(); actualizarBarra(); return; }
      case 'negrita': { const on = !(H.celdas[X().dir(sel.c, sel.f)] || {}).b; aplicarARango((c) => ({ ...c, b: on || undefined })); return; }
      case 'al-left': case 'al-center': case 'al-right': { const al = a.slice(3); aplicarARango((c) => ({ ...c, al: c.al === al ? undefined : al })); return; }
      case 'borrar': { const r = rangoSel(); const cambios = []; for (let f = r.f0; f <= Math.min(r.f1, r.f0 + 20000); f++) for (let c = r.c0; c <= r.c1; c++) { const d = X().dir(c, f); if (H.celdas[d] || (H.base && crudo(h, c, f) != null)) cambios.push({ h, d, cel: H.base ? { v: '' } : null }); } escribirCeldas(cambios); pintarGrilla(); pintarGraficos(); actualizarBarra(); return; }
      case 'autosuma': return autoSuma();
      case 'orden-asc': return ordenar(false);
      case 'orden-desc': return ordenar(true);
      case 'duplicados': return quitarDuplicados();
      case 'filtro': { if (H.filtro) { delete H.filtro; filasVis = null; guardar(); pintarGrilla(); estado(); return; } const r = region(); if (!r) return toast('Selecciona una celda dentro de una tabla con encabezados'); H.filtro = { fila: r.f0, c0: r.c0, c1: r.c1, ocultos: {} }; guardar(); evento('filtro'); pintarGrilla(); return; }
      case 'ver-formulas': verFormulas = !verFormulas; pintarGrilla(); pintarCinta(); return;
      case 'insertar-fn': return dialogoFunciones();
      case 'obtener': return dialogoObtener();
      case 'pivot': return dialogoPivot();
      case 'graf-col': return crearGrafico('col'); case 'graf-bar': return crearGrafico('bar'); case 'graf-linea': return crearGrafico('linea'); case 'graf-torta': return crearGrafico('torta');
      case 'csv-exportar': return exportarCsv();
      case 'csv-importar': return $('#xlCsv').click();
      case 'hoja-nueva': return nuevaHoja();
      case 'reiniciar': return abrirModal('New workbook', '<p>¿Empezar un libro nuevo? Se borran todas las hojas de este libro de práctica.</p>', [['Cancel', cerrarModal], ['Start over', () => { delete Store.data.excel; guardar(); cerrarModal(); vista(main, { Store, toast }); }]]);
      case 'salir': location.hash = '#/herramientas'; return;
      case 'leccion': location.hash = '#/l/interfaces-excel-por-dentro'; return;
      case 'atajos': return abrirModal('Keyboard shortcuts', `<table class="xl-at">${[['Enter / Tab', 'Confirma y baja / va a la derecha'], ['F2', 'Edita la celda'], ['F4 (editando)', 'Alterna A1 → $A$1 → A$1 → $A1'], ['Ctrl+flecha', 'Salta al borde de los datos'], ['Shift+flecha', 'Extiende la selección'], ['Ctrl+C / X / V', 'Copiar / cortar / pegar (las fórmulas se ajustan)'], ['Ctrl+D', 'Rellena hacia abajo'], ['Ctrl+Z / Y', 'Deshacer / rehacer'], ['Ctrl+B', 'Negrita'], ['Alt+=', 'AutoSum'], ['Ctrl+Shift+L', 'Filtro'], ['Ctrl+`', 'Mostrar fórmulas'], ['Supr', 'Borra el contenido']].map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')}</table>`, [['Close', cerrarModal]]);
    }
  }

  // ---------------------------------------------------------------- diálogos
  function abrirModal(titulo, html, botones) {
    const m = $('#xlModal'); m.hidden = false;
    m.innerHTML = `<div class="xl-dlg"><div class="xl-dlg-t">${esc(titulo)}<button class="xl-x" data-cerrar-modal>×</button></div><div class="xl-dlg-c">${html}</div><div class="xl-dlg-b">${botones.map(([t], i) => `<button class="xl-btn${i === botones.length - 1 ? ' pri' : ''}" data-mb="${i}">${esc(t)}</button>`).join('')}</div></div>`;
    m.querySelectorAll('[data-mb]').forEach((b) => (b.onclick = () => botones[Number(b.dataset.mb)][1]()));
    m.querySelector('[data-cerrar-modal]').onclick = cerrarModal;
    return m;
  }
  function cerrarModal() { const m = $('#xlModal'); if (m) { m.hidden = true; m.innerHTML = ''; } $('#xlHoja').focus(); }
  function dialogoObtener() {
    const m = abrirModal('Get Data', `<p>Elige una tabla de Tienda Andina (la empresa del curso). Se abre en una hoja nueva; solo se guardan los cambios que hagas.</p><div class="xl-lista">${TABLAS.map((t) => `<label><input type="radio" name="xlT" value="${t}"${t === 'pedidos' ? ' checked' : ''}> <b>${t}</b> <span class="xl-dim">${(window.DataGen && window.DataGen.TABLE_INFO && window.DataGen.TABLE_INFO[t]) || ''}</span></label>`).join('')}</div>`, [['Cancel', cerrarModal], ['Load', () => { const t = m.querySelector('input[name=xlT]:checked').value; cerrarModal(); nuevaHoja(t, { base: t, celdas: {} }); evento('obtener'); toast(`Cargada la tabla ${t}: ${base(t).filas.length.toLocaleString('es')} filas`); }]]);
  }
  function dialogoFunciones() {
    const m = abrirModal('Insert Function', `<input class="xl-in" id="xlFnBus" placeholder="Busca una función (por ejemplo: sumar, buscar, contar)"><div class="xl-fn-lista" id="xlFnLista"></div><div class="xl-fn-det" id="xlFnDet"></div>`, [['Cancel', cerrarModal], ['Insert', () => { const n = m._fn; cerrarModal(); if (n) empezarEdicion(`=${n}(`); }]]);
    const pintar = (q) => { const t = q.toLowerCase(); const ls = Object.keys(INFO).filter((n) => !t || n.toLowerCase().includes(t) || INFO[n][1].toLowerCase().includes(t)); m.querySelector('#xlFnLista').innerHTML = ls.map((n) => `<button data-fn="${n}">${n}</button>`).join(''); m.querySelectorAll('[data-fn]').forEach((b) => (b.onclick = () => { m._fn = b.dataset.fn; m.querySelectorAll('[data-fn]').forEach((x) => x.classList.toggle('on', x === b)); m.querySelector('#xlFnDet').innerHTML = `<code>${esc(INFO[b.dataset.fn][0])}</code><p>${esc(INFO[b.dataset.fn][1])}</p>`; })); };
    pintar(''); const bus = m.querySelector('#xlFnBus'); bus.oninput = () => pintar(bus.value); bus.focus();
  }
  function menuFiltro(c, e) {
    const H = hoja(); const h = S().activa; const fil = H.filtro; const fin = ultimaFila(h);
    const conteo = new Map(); for (let f = fil.fila + 1; f <= fin; f++) { const v = X().mostrar(valor(h, c, f)); conteo.set(v, (conteo.get(v) || 0) + 1); }
    const vals = [...conteo.keys()].sort((a, b) => X().cmp(isNaN(Number(a)) || a === '' ? a : Number(a), isNaN(Number(b)) || b === '' ? b : Number(b))).slice(0, 300);
    const ocultos = new Set(fil.ocultos[c] || []);
    const p = $('#xlPop'); p.hidden = false; p.className = 'xl-pop xl-fmenu';
    const rr = $('#xlp').getBoundingClientRect(); p.style.left = Math.min(e.clientX - rr.left, rr.width - 250) + 'px'; p.style.top = e.clientY - rr.top + 8 + 'px';
    p.innerHTML = `<button data-fo="asc">A↓ Sort A to Z</button><button data-fo="desc">Z↓ Sort Z to A</button><hr><label class="xl-fall"><input type="checkbox" id="xlFAll" ${ocultos.size ? '' : 'checked'}> (Select All)</label><div class="xl-fvals">${vals.map((v) => `<label><input type="checkbox" data-fv="${esc(v)}" ${ocultos.has(v) ? '' : 'checked'}> ${esc(v === '' ? '(Blanks)' : v)} <span class="xl-dim">${conteo.get(v)}</span></label>`).join('')}</div>${conteo.size > 300 ? '<p class="xl-dim">Se muestran los primeros 300 valores.</p>' : ''}<div class="xl-fb"><button class="xl-btn" data-fo="cancel">Cancel</button><button class="xl-btn pri" data-fo="ok">OK</button></div>`;
    p.querySelector('#xlFAll').onchange = (ev) => p.querySelectorAll('[data-fv]').forEach((x) => (x.checked = ev.target.checked));
    p.onclick = (ev) => {
      const b = ev.target.closest('[data-fo]'); if (!b) return; ev.stopPropagation();
      if (b.dataset.fo === 'asc' || b.dataset.fo === 'desc') { p.hidden = true; sel = { c, f: fil.fila + 1 }; return ordenar(b.dataset.fo === 'desc'); }
      if (b.dataset.fo === 'ok') { const nuevos = [...p.querySelectorAll('[data-fv]')].filter((x) => !x.checked).map((x) => x.dataset.fv); if (nuevos.length) fil.ocultos[c] = nuevos; else delete fil.ocultos[c]; guardar(); evento('filtrar'); calcularFiltro(); pintarGrilla(); estado(); }
      p.hidden = true;
    };
  }
  function dialogoPivot() {
    const r = region(); if (!r) return toast('Selecciona una celda dentro de una tabla con encabezados (por ejemplo, después de Data → Get Data)');
    const h = S().activa; const campos = []; for (let c = r.c0; c <= r.c1; c++) campos.push(X().mostrar(valor(h, c, r.f0)) || X().colTxt(c));
    const op = (n) => campos.map((x, i) => `<option value="${i}">${esc(x)}</option>`).join('');
    const m = abrirModal('Create PivotTable', `<p class="xl-dim">Tabla: ${esc(hoja().nombre)}!${X().dir(r.c0, r.f0)}:${X().dir(r.c1, r.f1)} (${r.f1 - r.f0} filas)</p>
      <div class="xl-pv"><label>Rows<select id="pvF">${op()}</select></label><label>Columns (opcional)<select id="pvC"><option value="">(ninguna)</option>${op()}</select></label><label>Values<select id="pvV">${op()}</select></label><label>Summarize by<select id="pvA"><option value="sum">Sum</option><option value="count">Count</option><option value="avg">Average</option><option value="max">Max</option><option value="min">Min</option></select></label></div>
      <p class="xl-dim">El resultado se escribe en una hoja nueva. Es como un GROUP BY de SQL: una fila por cada valor de Rows.</p>`, [['Cancel', cerrarModal], ['OK', () => { const cfg = { hoja: S().activa, nombre: hoja().nombre, r, fila: Number(m.querySelector('#pvF').value), col: m.querySelector('#pvC').value === '' ? null : Number(m.querySelector('#pvC').value), val: Number(m.querySelector('#pvV').value), agg: m.querySelector('#pvA').value, campos }; cerrarModal(); crearPivot(cfg); }]]);
    const pick = (id, k) => { const s = m.querySelector(id); if (s.options[k]) s.value = String(k); };
    pick('#pvF', campos.findIndex((x) => /estado|pais|canal|segmento|categoria|marca|cargo/i.test(x)) >= 0 ? campos.findIndex((x) => /estado|pais|canal|segmento|categoria|marca|cargo/i.test(x)) : 0);
    pick('#pvV', Math.max(0, campos.findIndex((x) => /monto|precio|salario|cantidad|stock|total/i.test(x))));
  }
  function crearPivot(cfg) {
    const h = cfg.hoja; const { r } = cfg; const agr = new Map(); const colsVals = new Set();
    for (let f = r.f0 + 1; f <= r.f1; f++) {
      const kf = X().mostrar(valor(h, r.c0 + cfg.fila, f)); const kc = cfg.col == null ? '' : X().mostrar(valor(h, r.c0 + cfg.col, f)); const v = valor(h, r.c0 + cfg.val, f);
      colsVals.add(kc); const k = kf + '\u0001' + kc; const a = agr.get(k) || { s: 0, n: 0, cn: 0, max: -Infinity, min: Infinity }; a.cn++;
      if (typeof v === 'number') { a.s += v; a.n++; a.max = Math.max(a.max, v); a.min = Math.min(a.min, v); } agr.set(k, a);
    }
    const res = (a) => { if (!a) return ''; switch (cfg.agg) { case 'count': return a.cn; case 'avg': return a.n ? a.s / a.n : ''; case 'max': return a.n ? a.max : ''; case 'min': return a.n ? a.min : ''; default: return a.s; } };
    const filasK = [...new Set([...agr.keys()].map((k) => k.split('\u0001')[0]))].sort((a, b) => X().cmp(a, b)); const colsK = [...colsVals].sort((a, b) => X().cmp(a, b));
    const nomAgg = { sum: 'Sum', count: 'Count', avg: 'Average', max: 'Max', min: 'Min' }[cfg.agg];
    const c = {}; const put = (col, fila, v, extra) => { c[X().dir(col, fila)] = { v: typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v), ...extra }; };
    put(0, 0, `${nomAgg} of ${cfg.campos[cfg.val]}`, { b: true }); if (cfg.col != null) put(1, 0, `${cfg.campos[cfg.col]} ▾`, { b: true });
    put(0, 1, `${cfg.campos[cfg.fila]} ▾`, { b: true });
    const encs = cfg.col == null ? [''] : colsK;
    encs.forEach((k, i) => put(1 + i, 1, cfg.col == null ? `${nomAgg} of ${cfg.campos[cfg.val]}` : (k === '' ? '(blank)' : k), { b: true }));
    if (encs.length > 1 || cfg.col != null) put(1 + encs.length, 1, 'Grand Total', { b: true });
    filasK.forEach((kf, i) => { put(0, 2 + i, kf === '' ? '(blank)' : kf); let tot = { s: 0, n: 0, cn: 0, max: -Infinity, min: Infinity }; encs.forEach((kc, j) => { const a = agr.get(kf + '\u0001' + kc); const v = res(a); if (v !== '') put(1 + j, 2 + i, v); if (a) { tot.s += a.s; tot.n += a.n; tot.cn += a.cn; tot.max = Math.max(tot.max, a.max); tot.min = Math.min(tot.min, a.min); } }); if (encs.length > 1 || cfg.col != null) put(1 + encs.length, 2 + i, res(tot), { b: true }); });
    const ft = 2 + filasK.length; put(0, ft, 'Grand Total', { b: true });
    encs.forEach((kc, j) => { const tot = { s: 0, n: 0, cn: 0, max: -Infinity, min: Infinity }; for (const kf of filasK) { const a = agr.get(kf + '\u0001' + kc); if (a) { tot.s += a.s; tot.n += a.n; tot.cn += a.cn; tot.max = Math.max(tot.max, a.max); tot.min = Math.min(tot.min, a.min); } } put(1 + j, ft, res(tot), { b: true }); });
    nuevaHoja('PivotTable', { celdas: c, pivot: cfg, anchos: { A: 160, B: 130 } }); evento('pivot');
    toast('Tabla dinámica creada. Es un resumen fijo: si cambian los datos, vuelve a crearla (en Excel real: Refresh).');
  }
  function crearGrafico(tipo) {
    const r0 = rangoSel(); let r = r0.c0 === r0.c1 && r0.f0 === r0.f1 ? region() : r0;
    // en una tabla dinámica se grafica el cuerpo: sin la fila del título ni los totales generales
    if (r && hoja().pivot && r0.c0 === r0.c1 && r0.f0 === r0.f1) { const h = S().activa; let f1 = r.f1; while (f1 > 1 && /^Grand Total$/.test(String(valor(h, 0, f1)))) f1--; let c1 = r.c1; while (c1 > 1 && /^Grand Total$/.test(String(valor(h, c1, 1)))) c1--; r = { c0: 0, c1, f0: 1, f1 }; }
    if (!r) return toast('Selecciona un rango con categorías y números (por ejemplo, el resultado de una tabla dinámica)');
    if (r.f1 - r.f0 > 60) r = { ...r, f1: r.f0 + 60 };
    const H = hoja(); H.graficos = H.graficos || []; let x0 = ANCHO_FILAS + 24; for (let c = 0; c <= r.c1; c++) x0 += anchoCol(c);
    H.graficos.push({ id: Date.now().toString(36), tipo, r, x: x0 + H.graficos.length * 24, y: (indiceDe(r.f0) + 1) * ALTO + H.graficos.length * 24 }); guardar(); evento('grafico'); pintarGraficos();
    toast('Gráfico insertado. Arrástralo por el título; se actualiza solo cuando cambian las celdas.');
  }
  function pintarGraficos() {
    const box = $('#xlGraficos'); if (!box) return; const H = hoja(); const h = S().activa;
    box.innerHTML = (H.graficos || []).map((g) => {
      const { r } = g; const enc = typeof valor(h, r.c0 + 1, r.f0) === 'string' || (r.c1 === r.c0 && typeof valor(h, r.c0, r.f0) === 'string');
      const f0 = enc ? r.f0 + 1 : r.f0; const cats = []; const series = [];
      const cs = r.c1 > r.c0 ? r.c0 + 1 : r.c0;
      for (let c = cs; c <= r.c1; c++) { const s = { nombre: enc ? X().mostrar(valor(h, c, r.f0)) : X().colTxt(c), v: [] }; for (let f = f0; f <= r.f1; f++) { const v = valor(h, c, f); s.v.push(typeof v === 'number' ? v : 0); } series.push(s); }
      for (let f = f0; f <= r.f1; f++) cats.push(r.c1 > r.c0 ? X().mostrar(valor(h, r.c0, f)) : String(f + 1));
      const titulo = series.length === 1 ? series[0].nombre : 'Gráfico';
      return `<div class="xl-graf" style="left:${g.x}px;top:${g.y}px" data-graf="${g.id}"><div class="xl-graf-t" data-mover="${g.id}">${esc(titulo)}<button class="xl-x" data-quitar="${g.id}" title="Delete chart">×</button></div>${svgGrafico(g.tipo, cats, series)}</div>`;
    }).join('');
  }
  const COLORES = ['#2f6fd0', '#e07b39', '#3a9d5d', '#c4453e', '#8a5cc2', '#3cb0b5', '#d4a52b'];
  function svgGrafico(tipo, cats, series) {
    const W = 420, Hh = 250, m = { l: 52, r: 12, t: 12, b: 48 }; const iw = W - m.l - m.r, ih = Hh - m.t - m.b;
    if (!cats.length) return '<p class="xl-dim" style="padding:10px">Sin datos</p>';
    if (tipo === 'torta') {
      const vals = series[0].v.map((v) => Math.max(v, 0)); const tot = vals.reduce((a, b) => a + b, 0) || 1; let ang = -Math.PI / 2; const cx = 120, cy = Hh / 2, R = 95;
      const sec = vals.map((v, i) => { const a = (v / tot) * Math.PI * 2; const x1 = cx + R * Math.cos(ang), y1 = cy + R * Math.sin(ang); ang += a; const x2 = cx + R * Math.cos(ang), y2 = cy + R * Math.sin(ang); return vals.length === 1 ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${COLORES[0]}"/>` : `<path d="M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${a > Math.PI ? 1 : 0} 1 ${x2},${y2} Z" fill="${COLORES[i % COLORES.length]}" stroke="#fff"><title>${esc(cats[i])}: ${X().mostrar(v)} (${Math.round((v / tot) * 100)}%)</title></path>`; }).join('');
      const ley = cats.slice(0, 10).map((c, i) => `<g transform="translate(240,${20 + i * 20})"><rect width="11" height="11" fill="${COLORES[i % COLORES.length]}"/><text x="16" y="10">${esc(String(c).slice(0, 22))}</text></g>`).join('');
      return `<svg viewBox="0 0 ${W} ${Hh}" class="xl-svg">${sec}${ley}</svg>`;
    }
    const todos = series.flatMap((s) => s.v); let max = Math.max(0, ...todos), min = Math.min(0, ...todos); if (max === min) max = min + 1;
    const paso = Math.pow(10, Math.floor(Math.log10((max - min) / 4))); const tick = [1, 2, 5, 10].map((k) => k * paso).find((t) => (max - min) / t <= 6) || paso * 10;
    max = Math.ceil(max / tick) * tick; min = Math.floor(min / tick) * tick;
    const horiz = tipo === 'bar';
    const escala = (v) => ((v - min) / (max - min)) * (horiz ? iw : ih);
    let ejes = ''; for (let t = min; t <= max + 1e-9; t += tick) { const p = escala(t); ejes += horiz ? `<line x1="${m.l + p}" x2="${m.l + p}" y1="${m.t}" y2="${m.t + ih}" class="xl-gl"/><text x="${m.l + p}" y="${m.t + ih + 14}" text-anchor="middle">${X().mostrar(Math.round(t * 100) / 100)}</text>` : `<line x1="${m.l}" x2="${m.l + iw}" y1="${m.t + ih - p}" y2="${m.t + ih - p}" class="xl-gl"/><text x="${m.l - 6}" y="${m.t + ih - p + 4}" text-anchor="end">${X().mostrar(Math.round(t * 100) / 100)}</text>`; }
    const n = cats.length, banda = (horiz ? ih : iw) / n; let marcas = '';
    if (tipo === 'linea') {
      series.forEach((s, k) => { const pts = s.v.map((v, i) => `${m.l + banda * (i + 0.5)},${m.t + ih - escala(v)}`).join(' '); marcas += `<polyline points="${pts}" fill="none" stroke="${COLORES[k % COLORES.length]}" stroke-width="2"/>` + s.v.map((v, i) => `<circle cx="${m.l + banda * (i + 0.5)}" cy="${m.t + ih - escala(v)}" r="2.5" fill="${COLORES[k % COLORES.length]}"><title>${esc(cats[i])}: ${X().mostrar(v)}</title></circle>`).join(''); });
    } else {
      const bw = (banda * 0.75) / series.length;
      series.forEach((s, k) => s.v.forEach((v, i) => { const a = escala(Math.min(v, 0) < 0 ? v : 0), b = escala(Math.max(v, 0)); const cero = escala(0); const pos = banda * i + banda * 0.125 + bw * k; marcas += horiz ? `<rect x="${m.l + Math.min(cero, escala(v))}" y="${m.t + pos}" width="${Math.abs(escala(v) - cero)}" height="${bw}" fill="${COLORES[k % COLORES.length]}"><title>${esc(cats[i])}: ${X().mostrar(v)}</title></rect>` : `<rect x="${m.l + pos}" y="${m.t + ih - Math.max(cero, escala(v))}" width="${bw}" height="${Math.abs(escala(v) - cero)}" fill="${COLORES[k % COLORES.length]}"><title>${esc(cats[i])}: ${X().mostrar(v)}</title></rect>`; void a; void b; }));
    }
    const etiquetas = cats.map((c, i) => { const t = esc(String(c).slice(0, 12)); return horiz ? `<text x="${m.l - 6}" y="${m.t + banda * (i + 0.5) + 4}" text-anchor="end">${t}</text>` : (n <= 16 || i % Math.ceil(n / 16) === 0 ? `<text x="${m.l + banda * (i + 0.5)}" y="${m.t + ih + 14}" text-anchor="middle">${t}</text>` : ''); }).join('');
    const ley = series.length > 1 ? series.map((s, k) => `<g transform="translate(${m.l + k * 110},${Hh - 14})"><rect width="10" height="10" fill="${COLORES[k % COLORES.length]}"/><text x="14" y="9">${esc(s.nombre.slice(0, 14))}</text></g>`).join('') : '';
    return `<svg viewBox="0 0 ${W} ${Hh}" class="xl-svg">${ejes}${marcas}${etiquetas}${ley}</svg>`;
  }

  // ---------------------------------------------------------------- clics generales
  let moviendo = null;
  function clic(e) {
    const t = e.target;
    const sug = t.closest('[data-sug]'); if (sug && editando && editando.input) { const inp = editando.input; const p = $('#xlPop'); const pos = inp.selectionStart; const ini = pos - p._pref.length; inp.value = inp.value.slice(0, ini) + sug.dataset.sug + '(' + inp.value.slice(pos); inp.setSelectionRange(ini + sug.dataset.sug.length + 1, ini + sug.dataset.sug.length + 1); $('#xlFormula').value = inp.value; cerrarSugerencias(); inp.focus(); return; }
    const pop = $('#xlPop'); if (pop && !pop.hidden && !t.closest('#xlPop') && !t.closest('[data-filtro]')) { pop.hidden = true; pop.className = 'xl-pop'; }
    const tab = t.closest('[data-tab]'); if (tab) { pestaña = tab.dataset.tab; pintarTabs(); pintarCinta(); return; }
    const a = t.closest('[data-a]'); if (a) { accion(a.dataset.a); return; }
    const hj = t.closest('[data-hoja]'); if (hj) { const i = Number(hj.dataset.hoja); if (e.detail === 2) { renombrarHoja(i); return; } if (i !== S().activa) cambiarHoja(i); return; }
    const q = t.closest('[data-quitar]'); if (q) { const H = hoja(); H.graficos = (H.graficos || []).filter((g) => g.id !== q.dataset.quitar); guardar(); pintarGraficos(); return; }
  }
  document.addEventListener('mousedown', (e) => { const mv = e.target.closest && e.target.closest('[data-mover]'); if (!mv || !document.getElementById('xlp')) return; const g = (hoja().graficos || []).find((x) => x.id === mv.dataset.mover); if (!g) return; e.preventDefault(); moviendo = { g, x: e.clientX, y: e.clientY, gx: g.x, gy: g.y }; });
  document.addEventListener('mousemove', (e) => { if (!moviendo) return; moviendo.g.x = Math.max(0, moviendo.gx + e.clientX - moviendo.x); moviendo.g.y = Math.max(0, moviendo.gy + e.clientY - moviendo.y); const el = document.querySelector(`[data-graf="${moviendo.g.id}"]`); if (el) { el.style.left = moviendo.g.x + 'px'; el.style.top = moviendo.g.y + 'px'; } });
  document.addEventListener('mouseup', () => { if (moviendo) { moviendo = null; guardar(); } });
  function renombrarHoja(i) {
    const H = S().hojas[i];
    const m = abrirModal('Rename sheet', `<input class="xl-in" id="xlRen" value="${esc(H.nombre)}" maxlength="31">${S().hojas.length > 1 ? '<p><button class="xl-btn" id="xlBorrarHoja">Delete sheet</button></p>' : ''}`, [['Cancel', cerrarModal], ['OK', () => { const n = m.querySelector('#xlRen').value.trim(); if (n && !/[\\/?*[\]:]/.test(n) && !S().hojas.some((x, k) => k !== i && x.nombre.toLowerCase() === n.toLowerCase())) { H.nombre = n; guardar(); recalcular(); } else if (n !== H.nombre) toast('Nombre no válido o repetido'); cerrarModal(); pintarHojas(); pintarGrilla(); }]]);
    const inp = m.querySelector('#xlRen'); inp.focus(); inp.select();
    const b = m.querySelector('#xlBorrarHoja'); if (b) b.onclick = () => { S().hojas.splice(i, 1); S().activa = 0; guardar(); cerrarModal(); cambiarHoja(0); };
  }

  window.addEventListener('hashchange', () => { if (!/^#\/excel/.test(location.hash)) document.body.classList.remove('xl-abierto'); });
  window.ExcelPractica = { vista, _S: () => S(), _valor: (h, d) => { const p = X().parseDir(d); return valor(h, p.c, p.f); } };
})();
