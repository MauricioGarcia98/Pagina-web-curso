// Guion de capturas del curso de Excel (assets/img/guias/excel/)
const celda = (d) => { const m = /^([A-Z]+)(\d+)$/.exec(d); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return `td[data-c="${c - 1}"][data-f="${Number(m[2]) - 1}"]`; };

export default async function (c) {
  const p = c.page;
  // ir a una celda por el cuadro de nombres (como haría un usuario; sirve aunque la celda esté fuera de la pantalla)
  const ir = async (d) => { await p.fill('#xlNombre', d); await p.press('#xlNombre', 'Enter'); await c.espera(150); };
  const escribir = async (d, texto) => { await ir(d); if (/^[^\x00-\x7f]/.test(texto)) await p.keyboard.press('F2'); await p.keyboard.type(texto); await p.keyboard.press('Enter'); await c.espera(250); };
  // seleccionar un rango A1:D5 con el teclado (Shift + flechas)
  const rango = async (a, b) => { const pos = (x) => { const m = /^([A-Z]+)(\d+)$/.exec(x); let k = 0; for (const ch of m[1]) k = k * 26 + ch.charCodeAt(0) - 64; return [k, Number(m[2])]; }; const [c1, f1] = pos(a), [c2, f2] = pos(b); await ir(a); await p.keyboard.down('Shift'); for (let i = 0; i < c2 - c1; i++) await p.keyboard.press('ArrowRight'); for (let i = 0; i < f2 - f1; i++) await p.keyboard.press('ArrowDown'); await p.keyboard.up('Shift'); await c.espera(150); };
  await c.ir('#/excel', '.xlp');

  // 1. la pantalla
  await c.foto('01-pantalla');
  await c.foto('01-zonas', { marcas: [['.xl-tabs', '1'], ['.xl-cinta', '2'], ['#xlNombre', '3'], ['#xlFormula', '4'], ['#xlHojas', '5'], ['#xlEstado', '6']] });
  await p.click(celda('C3')); await c.espera(200);
  await c.foto('01-celda-activa', { marcas: [[celda('C3'), 'C3'], ['#xlNombre', '1'], ['#xlFormula', '2']] });
  await p.click(celda('A1')); await p.keyboard.down('Shift'); await p.click(celda('D6')); await p.keyboard.up('Shift'); await c.espera(200);
  await c.foto('01-rango', { marcas: [['#xlNombre', '1'], ['#xlEstado', '2']] });

  // 2. escribir datos y fórmulas
  await p.click(celda('G2')); await p.keyboard.type('=AVERAGE(C2:C5)'); await c.espera(250);
  await c.foto('02-escribiendo', { marcas: [['.xl-editor', '1'], ['#xlFormula', '2']] });
  await p.keyboard.press('Enter'); await c.espera(300);
  await c.foto('02-resultado', { marcas: [[celda('G2'), null]] });
  await p.click(celda('G2')); await c.espera(150);
  await c.foto('02-formula-en-barra', { marcas: [['#xlFormula', '1'], [celda('G2'), '2']] });
  await p.click(celda('C6')); await p.keyboard.press('Alt+='); await c.espera(300);
  await c.foto('02-autosuma', { marcas: [['.xl-editor', null]] });
  await p.keyboard.press('Enter'); await c.espera(200);
  await escribir('H1', '1.21'); await escribir('E1', 'Con IVA');
  await p.click(celda('E2')); await p.keyboard.type('=D2*$H$1'); await c.espera(200);
  await c.foto('02-absoluta', { marcas: [['.xl-editor', '1'], [celda('H1'), '2']] });
  await p.keyboard.press('Enter'); await c.espera(200); await p.click(celda('E2')); await c.espera(200);
  await c.foto('02-controlador', { marcas: [['.xl-relleno', null]] });
  await p.keyboard.down('Shift'); await p.click(celda('E5')); await p.keyboard.up('Shift'); await p.keyboard.press('Control+d'); await c.espera(300);
  await c.foto('02-relleno-hecho', { marcas: [[celda('E5'), null]] });
  await p.click('[data-tab="Formulas"]'); await p.click('[data-a="ver-formulas"]'); await c.espera(300);
  await c.foto('02-ver-formulas', { marcas: [['[data-a="ver-formulas"]', '1']] });
  await p.click('[data-a="ver-formulas"]'); await c.espera(200);
  await p.click('[data-tab="Home"]'); await p.click(celda('D2')); await p.keyboard.down('Shift'); await p.click(celda('E6')); await p.keyboard.up('Shift');
  await c.foto('02-formato', { marcas: [['#xlFmt', '1']] });

  // 3. funciones para analizar
  await p.click('[data-tab="Data"]'); await p.click('[data-a="obtener"]'); await c.espera(300);
  await c.foto('03-get-data', { marcas: [['#xlModal [data-mb="1"]', '2']] });
  await p.click('#xlModal [data-mb="1"]'); await c.espera(900);
  await c.foto('03-pedidos', { marcas: [['#xlHojas .xl-hj.on', '1']] });
  await escribir('I1', 'Entregados'); await escribir('J1', '=COUNTIF(E:E,"entregado")');
  await p.click(celda('J1')); await c.espera(200);
  await c.foto('03-countif', { marcas: [['#xlFormula', '1'], [celda('J1'), '2']] });
  await escribir('I2', 'Entregados web'); await escribir('J2', '=COUNTIFS(E:E,"entregado",F:F,"web")');
  await escribir('I3', 'Canal del pedido 5'); await escribir('J3', '=XLOOKUP(5,A:A,F:F,"no está")');
  await escribir('I4', 'Pedido 999999'); await escribir('J4', '=VLOOKUP(999999,A:F,6,FALSE)');
  await p.click(celda('J3')); await c.espera(200);
  await c.foto('03-xlookup', { marcas: [['#xlFormula', '1'], [celda('J3'), '2']] });
  await p.click(celda('J4')); await c.espera(200);
  await c.foto('03-error-na', { marcas: [[celda('J4'), '#N/A']] });
  await p.click(celda('J5')); await p.keyboard.type('=COU'); await c.espera(300);
  await c.foto('03-sugerencias', { marcas: [['#xlPop', null]] });
  await p.keyboard.press('Escape'); await c.espera(150);
  await p.click('[data-tab="Formulas"]'); await p.click('[data-a="insertar-fn"]'); await p.fill('#xlFnBus', 'cuenta'); await c.espera(200); await p.click('#xlFnLista button'); await c.espera(200);
  await c.foto('03-insertar-funcion', { marcas: [['#xlFnBus', '1'], ['#xlFnDet', '2']] });
  await p.click('#xlModal [data-mb="0"]');

  // 4. ordenar, filtrar y limpiar
  await p.click(celda('E3')); await p.click('[data-tab="Data"]'); await c.espera(150);
  await c.foto('04-boton-filtro', { marcas: [['[data-a="filtro"]', '1']], recorte: '.xl-cinta' });
  await p.click('#xlCinta [data-a="filtro"]'); await c.espera(300);
  await p.evaluate(() => { document.querySelector('#xlHoja').scrollTop = 0; }); await c.espera(200);
  await c.foto('04-flechas', { marcas: [['button[data-filtro="4"]', '1']] });
  { const bb = await p.locator('button[data-filtro="4"]').boundingBox(); await p.mouse.click(bb.x + 5, bb.y + 5); } await c.espera(300);
  await p.click('#xlFAll'); await p.check('input[data-fv="cancelado"]'); await c.espera(150);
  await c.foto('04-menu-filtro', { marcas: [['#xlFAll', '1'], ['input[data-fv="cancelado"]', '2'], ['[data-fo="ok"]', '3']] });
  await p.click('[data-fo="ok"]'); await c.espera(500);
  await c.foto('04-filtrado', { marcas: [['#xlEstado', null]] });
  await p.click('#xlCinta [data-a="filtro"]'); await c.espera(300);
  await p.click(celda('D3')); await p.click('#xlCinta [data-a="orden-desc"]'); await c.espera(800);
  await c.foto('04-ordenado', { marcas: [['#xlCinta [data-a="orden-desc"]', '1'], [celda('D2'), '2']] });
  await p.click('#xlCinta [data-a="obtener"]'); await p.check('input[name=xlT][value="clientes_crudo"]'); await p.click('#xlModal [data-mb="1"]'); await c.espera(900);
  await c.foto('04-crudo');
  // detectar repetidos por clave antes de quitarlos
  await escribir('I1', 'veces'); await escribir('I2', '=COUNTIF(B:B,B2)'); await rango('I2', 'I14'); await p.keyboard.press('Control+d'); await c.espera(300); await ir('I3');
  await c.foto('e15-veces', { marcas: [['#xlFormula', '1'], [celda('I3'), '2']] });
  await rango('I1', 'I14'); await p.keyboard.press('Delete'); await c.espera(200);
  // quedarse con la carga más reciente de cada cliente: ordenar por fecha_carga (Z→A) y quitar duplicados por cliente_id
  await p.click(celda('G3')); await p.click('#xlCinta [data-a="orden-desc"]'); await c.espera(500);
  await p.click('#xlCinta [data-a="duplicados"]'); await c.espera(300);
  await p.click('#xlDupNada'); await p.check('[data-dupc="1"]'); await c.espera(150);
  await c.foto('04-duplicados-columnas', { marcas: [['#xlDupNada', '1'], ['[data-dupc="1"]', '2'], ['#xlModal [data-mb="1"]', '3']] });
  await p.click('#xlModal [data-mb="1"]'); await c.espera(600);
  await c.foto('04-duplicados', { marcas: [['#xlModal .xl-dlg', null]] });
  await p.click('#xlModal [data-mb="0"]');
  await escribir('H1', 'email_limpio'); await escribir('H2', '=LOWER(TRIM(E2))'); await p.click(celda('H2')); await c.espera(200);
  await c.foto('04-limpiar-texto', { marcas: [['#xlFormula', '1'], [celda('H2'), '2']] });

  // 5. tabla dinámica y gráficos
  await p.click('#xlHojas [data-hoja="1"]'); await c.espera(400); await p.click(celda('B3'));
  await p.click('[data-tab="Insert"]'); await p.click('#xlCinta [data-a="pivot"]'); await c.espera(300);
  await p.selectOption('#pvF', { label: 'canal' }); await p.selectOption('#pvC', { label: 'estado' }); await p.selectOption('#pvV', { label: 'pedido_id' }); await p.selectOption('#pvA', 'count'); await c.espera(150);
  await c.foto('05-pivot-dialogo', { marcas: [['#pvF', '1'], ['#pvC', '2'], ['#pvV', '3'], ['#pvA', '4']] });
  await p.click('#xlModal [data-mb="1"]'); await c.espera(700);
  await c.foto('05-pivot-resultado', { marcas: [['#xlHojas .xl-hj.on', null]] });
  await p.click(celda('A4')); await p.click('#xlCinta [data-a="graf-col"]'); await c.espera(600);
  await c.foto('05-grafico', { marcas: [['.xl-graf-t', null]] });
  await p.click('#xlHojas [data-hoja="1"]'); await c.espera(400); await p.click(celda('B3'));
  await p.click('#xlCinta [data-a="pivot"]'); await p.selectOption('#pvF', { label: 'metodo_pago' }); await p.selectOption('#pvV', { label: 'pedido_id' }); await p.selectOption('#pvA', 'count'); await p.click('#xlModal [data-mb="1"]'); await c.espera(700);
  await p.click(celda('A4')); await p.click('#xlCinta [data-a="graf-torta"]'); await c.espera(600);
  await c.foto('05-torta');

  // 6. proyecto: exportar
  await p.click('[data-tab="File"]'); await c.espera(200);
  await c.foto('06-exportar', { marcas: [['#xlCinta [data-a="csv-exportar"]', '1'], ['#xlTema', '2']], recorte: '.xl-cinta' });

  // ---------------------------------------------------------------- capturas de las lecciones nuevas (n2..n6)
  const hojaNueva = async (nombre) => {
    await p.click('[data-a="hoja-nueva"]'); await c.espera(300);
    const ult = p.locator('#xlHojas .xl-hj').last(); await ult.click({ clickCount: 2 }); await c.espera(200);
    await p.fill('#xlRen', nombre); await p.click('#xlModal [data-mb="1"]'); await c.espera(300);
  };
  const tabla = async (desde, filas) => { const m = /^([A-Z]+)(\d+)$/.exec(desde); const c0 = m[1].charCodeAt(0); const f0 = Number(m[2]); for (let i = 0; i < filas.length; i++) for (let k = 0; k < filas[i].length; k++) { const v = filas[i][k]; if (v === '' || v == null) continue; await escribir(String.fromCharCode(c0 + k) + (f0 + i), String(v)); } };
  await p.click('[data-tab="Home"]');
  // nivel 1: escribir, editar, hojas
  await hojaNueva('Datos');
  await tabla('A1', [['Texto', 'Número', 'Fecha', 'Lógico'], ['Mouse', '12.5', '2024-03-15', 'TRUE'], ['Teclado', '-3', '2024-12-01', 'FALSE']]);
  await ir('A2'); await c.espera(150);
  await c.foto('e02-tipos', { marcas: [[celda('A2'), 'texto'], [celda('B2'), 'número'], [celda('C2'), 'fecha']] });
  await ir('A3'); await p.keyboard.press('F2'); await c.espera(200);
  await c.foto('e02-editar-f2', { marcas: [['.xl-editor', null]] });
  await p.keyboard.press('Escape');
  await rango('A1', 'D3'); await p.keyboard.press('Control+c'); await ir('F1'); await p.keyboard.press('Control+v'); await c.espera(300);
  await c.foto('e02-copiar-pegar', { marcas: [[celda('F1'), '2'], ['[data-a="pegar"]', '1']] });
  await c.foto('e03-hoja-nueva', { marcas: [['[data-a="hoja-nueva"]', '1'], ['#xlHojas .xl-hj.on', '2']] });
  await p.locator('#xlHojas .xl-hj.on').click({ clickCount: 2 }); await c.espera(200);
  await c.foto('e03-renombrar', { marcas: [['#xlRen', null]] });
  await p.click('#xlModal [data-mb="0"]');
  await c.foto('e03-ancho-columna', { marcas: [['[data-res="0"]', null]], recorte: '.xl-hoja' });
  await rango('A1', 'D1');
  await c.foto('e03-formato-cinta', { marcas: [['[data-a="negrita"]', '1'], ['[data-a="al-center"]', '2'], ['#xlFmt', '3']], recorte: '.xl-cinta' });
  // proyecto 1: presupuesto
  await hojaNueva('Presupuesto');
  await tabla('A1', [['Ítem', 'Cantidad', 'Precio unitario', 'Subtotal'], ['Catering', '40', '18', '=B2*C2'], ['Alquiler del salón', '1', '450', '=B3*C3'], ['Sonido', '1', '220', '=B4*C4'], ['Remeras', '40', '9.5', '=B5*C5'], ['Total', '', '', '=SUM(D2:D5)']]);
  await rango('A1', 'D1'); await p.click('[data-a="negrita"]');
  await rango('C2', 'D6'); await p.selectOption('#xlFmt', 'moneda'); await ir('D6');
  await c.foto('e04-presupuesto', { marcas: [[celda('D6'), null]] });
  // nivel 2: funciones básicas y ventas diarias
  await hojaNueva('Ventas');
  await tabla('A1', [['Producto', 'Cantidad', 'Precio', 'Descuento', 'Neto', 'Con IVA', '', 'IVA'], ['Notebook', '2', '820', '0.1', '=B2*C2*(1-D2)', '=E2*$I$1'], ['Monitor', '5', '190', '0', '=B3*C3*(1-D3)', '=E3*$I$1'], ['Mouse', '12', '15', '0.05', '=B4*C4*(1-D4)', '=E4*$I$1'], ['Teclado', '7', '35', '0', '=B5*C5*(1-D5)', '=E5*$I$1']]);
  await escribir('I1', '1.21');
  await tabla('A7', [['Total', '', '', '', '=SUM(E2:E5)', '=SUM(F2:F5)'], ['Promedio', '', '', '', '=AVERAGE(E2:E5)'], ['Máximo', '', '', '', '=MAX(E2:E5)'], ['Mínimo', '', '', '', '=MIN(E2:E5)'], ['Productos', '', '', '', '=COUNT(E2:E5)'], ['Redondeado', '', '', '', '=ROUND(E8,0)']]);
  await ir('E8'); await c.espera(200);
  await c.foto('e07-funciones', { marcas: [['#xlFormula', '1'], [celda('E8'), '2']] });
  await rango('D2', 'D5'); await p.selectOption('#xlFmt', 'porcentaje');
  await rango('C2', 'C5'); await p.selectOption('#xlFmt', 'moneda');
  await rango('E2', 'F10'); await p.selectOption('#xlFmt', 'moneda'); await ir('F2');
  await c.foto('e08-ventas', { marcas: [['#xlFormula', '1']] });
  // proyecto 2: la semana de la sucursal
  await hojaNueva('Semana');
  await tabla('A1', [['Día', 'Tickets', 'Ventas brutas', 'Devoluciones', 'Ventas netas', 'Ticket promedio', '% de la meta'], ['Lunes', '142', '6390', '210'], ['Martes', '128', '5630', '0'], ['Miércoles', '135', '6075', '180'], ['Jueves', '160', '7520', '95'], ['Viernes', '210', '10290', '340'], ['Sábado', '265', '13780', '520'], ['Domingo', '190', '9310', '150']]);
  await tabla('I1', [['Meta diaria', '7500']]);
  await tabla('E2', [['=C2-D2', '=E2/B2', '=E2/$J$1']]);
  await rango('E2', 'G8'); await p.keyboard.press('Control+d'); await c.espera(300);
  await tabla('A10', [['Total', '=SUM(B2:B8)', '=SUM(C2:C8)', '=SUM(D2:D8)', '=SUM(E2:E8)', '=E10/B10', '=E10/(J1*7)'], ['Promedio diario', '', '', '', '=AVERAGE(E2:E8)'], ['Mejor día', '', '', '', '=MAX(E2:E8)'], ['Peor día', '', '', '', '=MIN(E2:E8)'], ['% devoluciones', '', '', '', '=D10/C10']]);
  await rango('C2', 'F13'); await p.selectOption('#xlFmt', 'moneda');
  await rango('G2', 'G10'); await p.selectOption('#xlFmt', 'porcentaje'); await ir('E14'); await p.selectOption('#xlFmt', 'porcentaje');
  await rango('A1', 'G1'); await p.click('[data-a="negrita"]'); await rango('A10', 'G10'); await p.click('[data-a="negrita"]');
  await ir('F10'); await c.espera(200);
  await c.foto('e08-semana', { marcas: [['#xlFormula', '1'], [celda('F10'), '2']] });
  // nivel 3: IF, texto y fechas (sobre pedidos)
  await p.click('#xlHojas [data-hoja="1"]'); await c.espera(400);
  await escribir('K1', 'anio'); await escribir('L1', 'mes'); await escribir('M1', 'periodo'); await escribir('N1', 'tipo');
  await escribir('K2', '=YEAR(D2)'); await escribir('L2', '=MONTH(D2)'); await escribir('M2', '=TEXT(D2,"yyyy-mm")'); await escribir('N2', '=IF(F2="web","online",IF(F2="app","online","presencial"))');
  await rango('K2', 'N6'); await p.keyboard.press('Control+d'); await c.espera(400);
  await ir('N2'); await c.espera(150);
  await c.foto('e09-if', { marcas: [['#xlFormula', '1'], [celda('N2'), '2']] });
  await ir('M2'); await c.espera(150);
  await c.foto('e11-fechas', { marcas: [['#xlFormula', '1'], [celda('K2'), 'año'], [celda('L2'), 'mes']] });
  await hojaNueva('Reporte');
  await tabla('A1', [['estado', '2023', '2024'], ['entregado', '=COUNTIFS(pedidos!E:E,A2,pedidos!D:D,">=2023-01-01",pedidos!D:D,"<2024-01-01")', '=COUNTIFS(pedidos!E:E,A2,pedidos!D:D,">=2024-01-01",pedidos!D:D,"<2025-01-01")'], ['cancelado'], ['devuelto'], ['enviado']]);
  await rango('B2', 'C5'); await p.keyboard.press('Control+d'); await c.espera(600); await ir('B2');
  await c.foto('e12-reporte', { marcas: [['#xlFormula', '1']] });
  // nivel 4: buscar entre hojas
  await p.click('[data-tab="Data"]'); await p.click('#xlCinta [data-a="obtener"]'); await p.check('input[name=xlT][value="clientes"]'); await p.click('#xlModal [data-mb="1"]'); await c.espera(900);
  await p.click('#xlHojas [data-hoja="1"]'); await c.espera(400);
  await escribir('O1', 'pais_cliente'); await escribir('O2', '=XLOOKUP(B2,clientes!A:A,clientes!G:G,"sin cliente")');
  await rango('O2', 'O8'); await p.keyboard.press('Control+d'); await c.espera(500); await ir('O2');
  await c.foto('e13-xlookup-hojas', { marcas: [['#xlFormula', '1'], [celda('O2'), '2']] });
  // nivel 5: fórmulas avanzadas
  await hojaNueva('KPIs');
  await tabla('A1', [['Indicador', 'Valor'], ['Pedidos', '=COUNTA(pedidos!A:A)-1'], ['Entregados', '=COUNTIF(pedidos!E:E,"entregado")'], ['% entregados', '=B3/B2'], ['Mayor id entregado', '=MAXIFS(pedidos!A:A,pedidos!E:E,"entregado")'], ['Stock valorizado', '=SUMPRODUCT(productos!E2:E301,productos!G2:G301)']]);
  await p.click('#xlCinta [data-a="obtener"]'); await p.check('input[name=xlT][value="productos"]'); await p.click('#xlModal [data-mb="1"]'); await c.espera(900);
  await p.click('#xlHojas .xl-hj:has-text("KPIs")'); await c.espera(500); await ir('B4'); await p.click('[data-tab="Home"]'); await p.selectOption('#xlFmt', 'porcentaje'); await ir('B6'); await c.espera(200);
  await c.foto('e19-sumproduct', { marcas: [['#xlFormula', '1'], [celda('B6'), '2']] });
  await p.click('[data-tab="Formulas"]'); await p.click('[data-a="ver-formulas"]'); await c.espera(300);
  await c.foto('e20-kpis-formulas', { marcas: [['[data-a="ver-formulas"]', '1']] });
  await p.click('[data-a="ver-formulas"]');
  // nivel 3: sumar con condiciones (pagos)
  await p.click('[data-tab="Data"]'); await p.click('#xlCinta [data-a="obtener"]'); await p.check('input[name=xlT][value="pagos"]'); await p.click('#xlModal [data-mb="1"]'); await c.espera(900);
  await p.click('[data-tab="Home"]');
  await hojaNueva('Cobros');
  await tabla('A1', [['estado', 'pagos', 'monto', 'promedio'], ['aprobado', '=COUNTIF(pagos!E:E,A2)', '=SUMIF(pagos!E:E,A2,pagos!D:D)', '=AVERAGEIF(pagos!E:E,A2,pagos!D:D)'], ['rechazado']]);
  await rango('B2', 'D3'); await p.keyboard.press('Control+d'); await c.espera(400);
  await rango('C2', 'D3'); await p.selectOption('#xlFmt', 'moneda');
  await tabla('A5', [['Aprobado 2024', '', '=SUMIFS(pagos!D:D,pagos!E:E,"aprobado",pagos!C:C,">=2024-01-01",pagos!C:C,"<2025-01-01")']]);
  await ir('C5'); await p.selectOption('#xlFmt', 'moneda'); await ir('C2'); await c.espera(200);
  await c.foto('e10-sumif', { marcas: [['#xlFormula', '1'], [celda('C2'), '2']] });
  await ir('C5'); await c.espera(200);
  await c.foto('e10-sumifs', { marcas: [['#xlFormula', '1'], [celda('C5'), '2']] });
  // nivel 5: gráfico de líneas por mes
  await hojaNueva('Mensual');
  await tabla('A1', [['mes', 'pedidos 2024'], ['1', '=COUNTIFS(pedidos!D:D,">="&DATE(2024,A2,1),pedidos!D:D,"<"&DATE(2024,A2+1,1))']]);
  for (let m = 2; m <= 12; m++) await escribir('A' + (m + 1), String(m));
  await rango('B2', 'B13'); await p.keyboard.press('Control+d'); await c.espera(600);
  await rango('A1', 'B13'); await p.click('[data-tab="Insert"]'); await p.click('#xlCinta [data-a="graf-linea"]'); await c.espera(700);
  await ir('B2'); await c.espera(200);
  await c.foto('e18-linea', { marcas: [['#xlFormula', '1'], ['.xl-graf-t', '2']] });
  // nivel 6: el libro terminado, con sus hojas
  await c.foto('e21-hojas', { marcas: [['#xlHojas', null]] });
}
