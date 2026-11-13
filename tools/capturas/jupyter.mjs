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
  // ---------------------------------------------------------------- capturas del curso de 24 lecciones
  const ult = '[data-ult]';
  const correr = async (codigo, espera = 400) => { await escribirCelda(codigo); await p.keyboard.press('Shift+Enter'); await libre(); await c.espera(espera); };
  // marca la última celda ejecutada (la que tiene salida) para poder recuadrar sus partes
  const verUltima = async () => { await p.evaluate(() => { document.querySelectorAll('[data-ult]').forEach((x) => x.removeAttribute('data-ult')); const cs = [...document.querySelectorAll('.jl-celda')].filter((x) => x.querySelector('.jl-outs')); const e = cs.pop(); if (e) { e.setAttribute('data-ult', '1'); e.scrollIntoView({ block: 'end' }); } }); await c.espera(300); };
  await p.click('[data-menu="File"]'); await c.espera(150); await p.click('[data-pop="nuevo-nb"]'); await c.espera(700);
  await p.click('.jl-tab.on'); await p.click('.jl-celda .jl-prompt'); await p.keyboard.press('Enter'); await c.espera(150);
  // nivel 2: Python en celdas
  await correr('import pandas as pd\npedidos = pd.read_csv("datos/pedidos.csv")\nprecio = 820\ndescuento = 0.1\nprecio * (1 - descuento)');
  await verUltima(); await c.foto('e05-out', { marcas: [[ult + ' .jl-out:last-child .jl-prompt.out', 'Out']] });
  await correr('print("Total con descuento:", precio * (1 - descuento))\nprecio');
  await verUltima(); await c.foto('e05-print', { marcas: [[ult + ' .jl-stream', '1'], [ult + ' .jl-out:last-child .jl-prompt.out', '2']] });
  await correr('pedidos.describe()', 600);
  await verUltima(); await c.foto('e06-describe', { marcas: [[ult + ' .jl-html', null]] });
  await correr('pedidos["canal"].value_counts()');
  await verUltima(); await c.foto('e06-value-counts', { marcas: [[ult + ' .jl-outs', null]] });
  await correr('cancel_web = pedidos[(pedidos["canal"] == "web") & (pedidos["estado"] == "cancelado")]\ncancel_web.shape');
  await verUltima(); await c.foto('e07-filtro', { marcas: [[ult + ' .jl-outs', null]] });
  await correr('pedidos.sort_values("fecha_pedido", ascending=False).head()', 600);
  await verUltima(); await c.foto('e07-orden', { marcas: [[ult + ' .jl-html', null]] });
  // nivel 3: agrupar, fechas y gráficos
  await correr('pd.pivot_table(pedidos, index="canal", columns="estado", values="pedido_id", aggfunc="count", margins=True)', 600);
  await verUltima(); await c.foto('e09-pivot', { marcas: [[ult + ' .jl-html', null]] });
  await correr('pedidos["fecha_pedido"] = pd.to_datetime(pedidos["fecha_pedido"])\npedidos["anio"] = pedidos["fecha_pedido"].dt.year\npedidos.groupby("anio").size()');
  await verUltima(); await c.foto('e10-fechas', { marcas: [[ult + ' .jl-outs', null]] });
  await correr('ax = pedidos["canal"].value_counts().plot(kind="bar", title="Pedidos por canal", figsize=(7, 3))\nax.set_ylabel("pedidos")', 1200);
  await verUltima(); await c.foto('e11-barras', { marcas: [[ult + ' .jl-img', null]] });
  // nivel 4: unir y limpiar
  await correr('clientes = pd.read_csv("datos/clientes.csv")\nunido = pedidos.merge(clientes[["cliente_id", "pais"]], on="cliente_id", how="left", indicator=True)\nunido["_merge"].value_counts()');
  await verUltima(); await c.foto('e13-merge', { marcas: [[ult + ' .jl-outs', null]] });
  await correr('crudo = pd.read_csv("datos/clientes_crudo.csv")\nprint("filas:", len(crudo), "| repetidos por cliente_id:", crudo["cliente_id"].duplicated().sum())\nlimpio = (crudo.sort_values("fecha_carga", ascending=False)\n.drop_duplicates("cliente_id")\n.assign(email=lambda d: d["email"].str.strip().str.lower()))\nlimpio.shape');
  await verUltima(); await c.foto('e14-limpieza', { marcas: [[ult + ' .jl-outs', null]] });
  // nivel 5: análisis y funciones
  await correr('detalle = pd.read_csv("datos/detalle_pedidos.csv")\ndetalle["importe"] = detalle["cantidad"] * detalle["precio_unitario"] * (1 - detalle["descuento"])\nticket = detalle.groupby("pedido_id")["importe"].sum()\nticket.describe()');
  await verUltima(); await c.foto('e17-describe', { marcas: [[ult + ' .jl-outs', null]] });
  await correr('ax = ticket.plot(kind="hist", bins=40, title="Importe por pedido", figsize=(7, 3))', 1200);
  await verUltima(); await c.foto('e17-hist', { marcas: [[ult + ' .jl-img', null]] });
  await correr('def tasa(parte, total):\nreturn round(parte / total * 100, 1)');
  await correr('assert tasa(1, 4) == 25.0\ntasa(371, 4633)');
  await verUltima(); await c.foto('e18-funcion', { marcas: [[ult + ' .jl-out:last-child .jl-prompt.out', 'Out']] });
  // proyecto 1: presupuesto de un viaje con variables
  await correr('pasajes = 420\nhotel = 3 * 85\ncomidas = 3 * 40\ntotal = pasajes + hotel + comidas\nprint(f"Total del viaje: {total} | por día: {total / 3:.2f}")\ntotal');
  await verUltima(); await c.foto('p1-viaje', { marcas: [[ult + ' .jl-stream', '1'], [ult + ' .jl-out:last-child .jl-prompt.out', '2']] });
  // nivel 6: notebook profesional (títulos y tabla de contenidos)
  await p.keyboard.press('Escape'); await p.keyboard.press('m'); await p.keyboard.press('Enter'); await c.espera(150);
  await escribirCelda('# Análisis de pedidos 2024\n## Conclusiones\n- Los pedidos crecen en noviembre y diciembre.'); await p.keyboard.press('Shift+Enter'); await c.espera(400);
  await p.click('.jl-side [data-panel="toc"]'); await c.espera(400);
  await c.foto('e21-toc', { marcas: [['#jlPanel', null]] });
  await p.click('.jl-side [data-panel="archivos"]'); await c.espera(300);
  await p.dblclick('.jl-fb-i[data-file="utilidades.py"]'); await c.espera(600);
  await c.foto('e18-editor-py', { marcas: [['.jl-tab.on', '1']] });
  await p.click('[data-menu="Settings"]'); await c.espera(150); await p.click('[data-pop="tema-dark"]'); await c.espera(500);
  await p.click('.jl-tab[data-tab="Untitled.ipynb"]'); await c.espera(400);
  await c.foto('e23-oscuro');
  await p.click('[data-menu="Settings"]'); await c.espera(150); await p.click('[data-pop="tema-light"]'); await c.espera(300);
}
