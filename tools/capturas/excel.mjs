// Guion de capturas del curso de Excel (assets/img/guias/excel/)
const celda = (d) => { const m = /^([A-Z]+)(\d+)$/.exec(d); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return `td[data-c="${c - 1}"][data-f="${Number(m[2]) - 1}"]`; };

export default async function (c) {
  const p = c.page;
  const escribir = async (d, texto) => { await p.click(celda(d)); await p.keyboard.type(texto); await p.keyboard.press('Enter'); await c.espera(250); };
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
  await p.click(celda('C3')); await p.click('#xlCinta [data-a="duplicados"]'); await c.espera(600);
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
}
