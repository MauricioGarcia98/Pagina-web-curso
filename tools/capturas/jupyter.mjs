// Guion de capturas del curso de JupyterLab (assets/img/guias/jupyter/)
export default async function (c) {
  const p = c.page;
  const libre = () => p.waitForFunction(() => window.JupyterPractica && !window.JupyterPractica._ocupado(), null, { timeout: 240000 });
  const celdaN = (i) => `.jl-celda:nth-of-type(${i})`;
  const escribirCelda = async (texto) => { for (const linea of texto.split('\n')) { await p.keyboard.type(linea.trimStart()); await p.keyboard.press('Enter'); } await p.keyboard.press('Backspace'); };
  await c.ir('#/jupyter', '.jlp'); await c.espera(800);

  // 1. la pantalla
  await c.foto('01-pantalla');
  await c.foto('01-zonas', { marcas: [['.jl-menu', '1'], ['.jl-side', '2'], ['#jlPanel', '3'], ['#jlTabs', '4'], ['.jl-nb-bar', '5'], ['#jlStatus', '6']] });
  await p.click('.jl-tab[data-tab="__launcher"]'); await c.espera(400);
  await c.foto('01-launcher', { marcas: [['[data-a="nuevo-nb"]', '1'], ['[data-a="nuevo-py"]', '2']] });
  await p.click('.jl-tab[data-tab="Bienvenida.ipynb"]'); await c.espera(500);

  // 2. celdas, kernel y modos
  await p.click('.jl-celda.code .jl-prompt'); await c.espera(200);
  await c.foto('02-modo-comando', { marcas: [['.jl-celda.code.sel .jl-col', '1'], ['#jlStatus', '2']] });
  await p.keyboard.press('Enter'); await c.espera(200);
  await c.foto('02-modo-edicion', { marcas: [['.jl-celda.edit .jl-ed', '1'], ['#jlStatus', '2']] });
  await p.keyboard.press('Escape');
  await p.keyboard.press('Shift+Enter'); await c.espera(600);
  await c.foto('02-corriendo', { marcas: [['.jl-celda.code .jl-in .jl-prompt', '[*]'], ['#jlKdot', '2']] });
  await libre(); await c.espera(500);
  await c.foto('02-tabla-pandas', { marcas: [['.jl-celda.code .jl-html', null]] });
  await p.keyboard.press('Shift+Enter'); await libre(); await c.espera(300);
  await p.keyboard.press('Shift+Enter'); await c.espera(200); await p.keyboard.press('Shift+Enter'); await libre(); await c.espera(800);
  await p.evaluate(() => { const i = document.querySelector('.jl-img'); if (i) i.scrollIntoView({ block: 'center' }); }); await c.espera(400);
  await c.foto('02-grafico', { marcas: [['.jl-img', null]] });
  await p.click('.jl-celda.markdown .jl-md'); await c.espera(150); await p.dblclick('.jl-celda.markdown .jl-md'); await c.espera(400);
  await c.foto('02-markdown-editando', { marcas: [['.jl-celda.markdown.edit .jl-ed', null], ['#jlTipo', '1']] });
  await p.keyboard.press('Shift+Enter'); await c.espera(300);

  // 3. archivos y carpetas
  await p.dblclick('.jl-fb-i[data-dir="datos"]'); await c.espera(400);
  await c.foto('03-carpeta-datos', { marcas: [['#jlPanel .jl-migas', '1'], ['.jl-fb-i[data-file="datos/pedidos.csv"]', '2']] });
  await p.dblclick('.jl-fb-i[data-file="datos/pedidos.csv"]'); await c.espera(700);
  await c.foto('03-visor-csv', { marcas: [['.jl-tab.on', null]] });
  await p.click('#jlPanel .jl-migas a[data-cd=""]'); await c.espera(300);
  await p.click('[data-menu="File"]'); await c.espera(200);
  await c.foto('03-menu-file', { marcas: [['[data-pop="nuevo-nb"]', '1']] });
  await p.click('[data-pop="nuevo-nb"]'); await c.espera(600);
  await c.foto('03-notebook-nuevo', { marcas: [['.jl-fb-i[data-file="Untitled.ipynb"]', '1'], ['.jl-tab.on', '2']] });
  await p.keyboard.press('Escape');
  await p.click('.jl-fb-i[data-file="Untitled.ipynb"]', { button: 'right' }); await c.espera(200);
  await c.foto('03-clic-derecho', { marcas: [['[data-pop="ctx-renombrar"]', '1']] });
  await p.click('[data-pop="ctx-renombrar"]'); await p.fill('#jlDlgIn', 'analisis_pedidos.ipynb'); await c.espera(150);
  await c.foto('03-renombrar', { marcas: [['#jlDlgIn', null]] });
  await p.click('#jlDlgOk'); await c.espera(500);

  // 4. analizar con pandas
  await p.click('.jl-celda .jl-prompt'); await p.keyboard.press('Enter'); await c.espera(150);
  await escribirCelda('import pandas as pd\npedidos = pd.read_csv("datos/pedidos.csv")\npedidos.shape');
  await p.keyboard.press('Shift+Enter'); await libre(); await c.espera(300);
  await escribirCelda('pedidos.info()'); await p.keyboard.press('Shift+Enter'); await libre(); await c.espera(300);
  await c.foto('04-info', { marcas: [['.jl-celda:nth-last-of-type(1) .jl-prompt', null]] });
  await escribirCelda('entregados = pedidos[pedidos["estado"] == "entregado"]\nentregados.groupby("canal").size().sort_values(ascending=False)');
  await p.keyboard.press('Shift+Enter'); await libre(); await c.espera(400);
  await c.foto('04-groupby');
  await escribirCelda('pedidos["fecha_pedido"] = pd.to_datetime(pedidos["fecha_pedido"])\npor_mes = pedidos.groupby(pedidos["fecha_pedido"].dt.to_period("M")).size()\npor_mes.plot(title="Pedidos por mes", figsize=(8, 3))');
  await p.keyboard.press('Shift+Enter'); await libre(); await c.espera(900);
  await p.evaluate(() => { const i = [...document.querySelectorAll('.jl-img')].pop(); if (i) i.scrollIntoView({ block: 'center' }); }); await c.espera(400);
  await c.foto('04-linea-por-mes');
  await escribirCelda('pedidos["columna_que_no_existe"]'); await p.keyboard.press('Shift+Enter'); await libre(); await c.espera(400);
  await p.evaluate(() => { const e = [...document.querySelectorAll('.jl-err-box')].pop(); if (e) e.scrollIntoView({ block: 'center' }); }); await c.espera(300);
  await c.foto('04-error', { marcas: [['.jl-err-ayuda', null]] });

  // 5. magics, archivos .py y reinicio
  await escribirCelda('%%writefile utilidades.py\ndef limpiar_email(email):\nreturn str(email).strip().lower()'); await p.keyboard.press('Shift+Enter'); await libre(); await c.espera(300);
  await escribirCelda('from utilidades import limpiar_email\nprint(limpiar_email("  ANA@Correo.COM "))\n%timeit limpiar_email(" X@Y.COM ")'); await p.keyboard.press('Shift+Enter'); await libre(); await c.espera(400);
  await c.foto('05-magics', { marcas: [['.jl-fb-i[data-file="utilidades.py"]', '1']] });
  await p.click('[data-menu="Kernel"]'); await c.espera(200);
  await c.foto('05-menu-kernel', { marcas: [['.jl-pop [data-pop="reiniciar-todo"]', '1']] });
  await p.click('.jl-pop [data-pop="reiniciar-todo"]'); await c.espera(300);
  await c.foto('05-confirmar-reinicio', { marcas: [['#jlDlgOk', null]] });
  await p.click('#jlDlgOk'); await c.espera(1500); await libre(); await c.espera(500);
  await p.evaluate(() => { document.querySelector('#jlCeldas').scrollTop = 0; }); await c.espera(300);
  await c.foto('05-tras-reinicio', { marcas: [['.jl-celda.code .jl-in .jl-prompt', '[1]']] });

  // 6. proyecto: descargar el .ipynb
  await p.click('[data-menu="File"]'); await c.espera(200);
  await c.foto('06-descargar', { marcas: [['[data-pop="descargar-activo"]', '1'], ['[data-pop="guardar"]', '2']] });
  await p.keyboard.press('Escape');
}
