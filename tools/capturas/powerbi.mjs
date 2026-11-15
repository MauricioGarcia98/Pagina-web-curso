// Guion de capturas del curso de Power BI (assets/img/guias/powerbi/)
export default async function (c) {
  const p = c.page;
  const w = (ms) => c.espera(ms);
  const log = (...a) => console.log('   [powerbi]', ...a);
  const S = () => p.evaluate(() => window.PowerBI._estado());
  const dlgTxt = async (n = 500) => p.evaluate((k) => { const ms = [...document.querySelectorAll('.pb-modal, .pbs-dlg')].filter((m) => !m.classList.contains('pq-modal')); const m = ms[ms.length - 1]; return m ? m.innerText.replace(/\n+/g, ' | ').slice(0, k) + ' :: ' + [...m.querySelectorAll('input,select,textarea,button')].map((e) => e.tagName + ':' + (e.id || JSON.stringify(e.dataset) || e.name || e.textContent.trim().slice(0, 14))).join(',').slice(0, 500) : 'no dlg'; }, n);
  const cerrarModales = async () => { await p.evaluate(() => { document.querySelectorAll('.pb-modal-fondo, .pbs-capa, .pb-menu, .pq-menu').forEach((e) => e.remove()); }); await w(200); };
  const cinta = async (k) => { await p.click(`[data-cinta="${k}"]`); await w(250); };
  const acc = async (k, ms = 400) => { await p.click(`[data-acc="${k}"]`); await w(ms); };
  const vista = async (v, ms = 700) => { await p.click(`[data-v="${v}"]`); await w(ms); };
  const deselect = async () => { const r = await p.$eval('#pbLienzo', (e) => { const b = e.getBoundingClientRect(); return { x: b.right - 12, y: b.bottom - 12 }; }); await p.mouse.click(r.x, r.y); await w(250); };
  const abrirTabla = async (t) => { await p.evaluate((t) => { const e = document.querySelector(`#pbPaneles .pb-tabla-n[data-tabla="${t}"]`); if (!e) return; const abierta = !!document.querySelector(`#pbPaneles .pb-campo[data-t="${t}"]`); if (!abierta) e.querySelector('.pb-nombre').click(); }, t); await w(300); };
  const campo = async (t, cc) => { await abrirTabla(t); const ok = await p.evaluate(([t, cc]) => { const el = document.querySelector(`#pbPaneles .pb-campo[data-t="${t}"][data-c="${cc}"]`) || [...document.querySelectorAll(`#pbPaneles .pb-campo[data-t="${t}"]`)].find((x) => x.textContent.trim() === cc) || [...document.querySelectorAll('#pbPaneles .pb-campo[draggable]')].find((x) => x.textContent.trim() === cc); if (!el) return false; el.click(); return true; }, [t, cc]); if (!ok) log('campo no encontrado', t, cc); await w(450); };
  const seleccionar = async (idx) => { const r = await p.evaluate((i) => { const v = document.querySelectorAll('#pbLienzo .pb-v')[i]; if (!v) return null; const b = v.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 8 }; }, idx); if (r) { await p.mouse.click(r.x, r.y); await w(300); } log('sel', idx, '->', await p.evaluate(() => window.PowerBI._estado().sel)); };
  const geom = async (g) => { await p.evaluate((g) => { const s = window.PowerBI._estado(); const v = s.paginas[s.pagina].visuales.find((x) => x.id === s.sel); if (v) Object.assign(v, g); }, g); await vista('tabla', 300); await vista('informe', 500); };
  // crea un visual con sus campos y lo acomoda en el lienzo (x, y, w, h en % del lienzo)
  const visual = async (tipo, campos, geom) => {
    await deselect(); await p.click(`#pbPaneles button[data-tipo="${tipo}"]`); await w(400);
    for (const [t, cc] of campos) await campo(t, cc);
    if (geom) { await p.evaluate((g) => { const s = window.PowerBI._estado(); const v = s.paginas[s.pagina].visuales.find((x) => x.id === s.sel); if (v) Object.assign(v, g); }, geom); await vista('tabla', 300); await vista('informe', 500); }
    return p.evaluate(() => window.PowerBI._estado().sel);
  };
  const dax = async (texto, ms = 900) => { await p.fill('#pbDax textarea', texto); await p.click('#pbDax .pb-dax-ok'); await w(ms); const err = await p.evaluate(() => { const e = document.querySelector('#pbDax .pb-dax-err'); return e && !document.querySelector('#pbDax').hidden ? e.textContent.trim() : ''; }); if (err) { log('DAX error:', texto.slice(0, 40), '->', err.slice(0, 160)); await p.click('#pbDax .pb-dax-x').catch(() => {}); } };
  const medida = async (expr) => { await cinta('inicio'); await acc('nueva-medida'); await dax(expr); };
  const cargar = async (tablas, transformar = false) => {
    await acc('obtener'); await p.click('[data-o="curso"]'); await w(700);
    for (const t of tablas) { await p.fill('[data-nb]', t); await w(150); await p.evaluate((name) => { const l = [...document.querySelectorAll('.pb-nav-lista label')].find((x) => x.textContent.trim().split(/\s+/)[0] === name); if (l) l.querySelector('input').click(); }, t); }
    await p.fill('[data-nb]', ''); await w(200);
    await p.click(transformar ? '.pb-modal [data-transf]' : '.pb-modal [data-cargar]'); await w(2500);
  };
  const pqTab = async (n) => { await p.evaluate((n) => { const t = [...document.querySelectorAll('.pq-modal .pq-tabs span')].find((e) => e.textContent.trim() === n); if (t) t.click(); }, n); await w(250); };
  const pqCol = async (cc) => { await p.evaluate((cc) => { const th = document.querySelector(`.pq-modal th[data-col="${cc}"]`); if (th) th.click(); }, cc); await w(200); };
  const pqConsulta = async (t) => { await p.evaluate((t) => { const q = [...document.querySelectorAll('.pq-modal .pq-consultas div, .pq-modal .pq-lista div, .pq-modal [data-q]')].find((e) => e.textContent.trim() === t); if (q) q.click(); }, t); await w(400); };
  const pqDlgOk = async () => { await p.click('.pb-modal:not(.pq-modal) [data-ok]'); await w(500); };
  const pqDlg = (sel) => `.pb-modal:not(.pq-modal) ${sel}`;

  await c.ir('#/powerbi/servicio', '#pbsMain'); await w(600);
  await c.ir('#/powerbi', '#pbi'); await w(1200);
  // si quedó algo de otra sesión, informe nuevo
  await p.evaluate(() => { const s = window.PowerBI._estado(); if (Object.keys(s.tablas).length) { window.PowerBI._reiniciar && window.PowerBI._reiniciar(); } });

  // ------------------------------------------------------------------ nivel 1
  await c.foto('b01-pantalla');
  await c.foto('b01-zonas', { marcas: [['.pb-cinta', '1'], ['.pb-vistas', '2'], ['#pbCentro', '3'], ['#pbPaneles', '4'], ['#pbPie', '5']] });
  await cinta('insertar'); await c.foto('b01-cinta-insertar', { marcas: [['.pb-cinta', null]] });
  await cinta('modelado'); await c.foto('b01-cinta-modelado', { marcas: [['.pb-cinta', null]] });
  await cinta('vista'); await c.foto('b01-cinta-vista', { marcas: [['.pb-cinta', null]] });
  await cinta('inicio');
  await acc('obtener'); await c.foto('b02-obtener', { marcas: [['.pb-obt-l', '1'], ['[data-o="curso"]', '2'], ['[data-o="excel"]', '3']] });
  await p.click('[data-o="curso"]'); await w(700);
  await p.fill('[data-nb]', 'pedidos'); await w(300);
  await p.evaluate(() => { const l = [...document.querySelectorAll('.pb-nav-lista label')].find((x) => x.textContent.trim().split(/\s+/)[0] === 'pedidos'); if (l) { l.click(); l.querySelector('input').click(); } }); await w(500);
  await c.foto('b02-navegador', { marcas: [['[data-nb]', '1'], ['.pb-nav-lista', '2'], ['.pb-prev', '3'], ['.pb-modal [data-cargar]', '4'], ['.pb-modal [data-transf]', '5']] });
  await cerrarModales();
  await cargar(['clientes', 'productos', 'categorias', 'pedidos', 'detalle_pedidos']);
  await acc('reto').catch(() => {});
  await abrirTabla('pedidos');
  await c.foto('b02-cargado', { marcas: [['#pbPaneles .pb-pan:last-child', '1'], ['#pbPie', '2']] });
  // primer gráfico
  await deselect(); await p.click('#pbPaneles button[data-tipo="columnaAgrupada"]'); await w(500);
  await c.foto('b03-visual-vacio', { marcas: [['#pbPaneles button[data-tipo="columnaAgrupada"]', '1'], ['#pbLienzo .pb-v', '2'], ['[data-pozo="x"]', '3'], ['[data-pozo="y"]', '4']] });
  await campo('pedidos', 'canal');
  try { await p.locator('#pbPaneles .pb-campo[data-t="pedidos"][data-c="pedido_id"]').dragTo(p.locator('[data-pozo="y"]')); await w(500); } catch (e) { log('drag y', e.message.slice(0, 80)); }
  await p.selectOption('[data-pozo="y"] select', 'count').catch((e) => log('agg', e.message.slice(0, 60))); await w(500);
  await geom({ x: 2, y: 3, w: 46, h: 45 }); await seleccionar(0);
  await c.foto('b03-pozos', { marcas: [['#pbPaneles .pb-campo[data-t="pedidos"][data-c="canal"]', '1'], ['[data-pozo="x"]', '2'], ['[data-pozo="y"]', '3'], ['#pbLienzo .pb-v', '4']] });
  await visual('tarjeta', [['pedidos', 'pedido_id']], { x: 50, y: 3, w: 22, h: 20 });
  await visual('segmentacion', [['pedidos', 'estado']], { x: 74, y: 3, w: 24, h: 45 });
  await deselect();
  await c.foto('b03-tres-visuales');
  // filtrado cruzado: clic en una barra
  await p.evaluate(() => { const r = document.querySelector('#pbLienzo .pb-v rect[data-i], #pbLienzo .pb-v rect.pb-barra, #pbLienzo .pb-v svg rect:not([width="100%"])'); if (r) r.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await w(600);
  await c.foto('b03-cruzado', { marcas: [['#pbLienzo', null]] });
  await p.evaluate(() => { const r = document.querySelector('#pbLienzo .pb-v rect[data-i], #pbLienzo .pb-v rect.pb-barra, #pbLienzo .pb-v svg rect:not([width="100%"])'); if (r) r.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await w(400);
  // guardar
  await acc('archivo'); await c.foto('b04-archivo', { marcas: [['.pb-modal', null]] }); await cerrarModales();

  // ------------------------------------------------------------------ nivel 2: Power Query
  await acc('transformar', 1200);
  await c.foto('b05-editor', { marcas: [['.pq-modal .pq-tabs', '1'], ['.pq-modal .pq-consultas', '2'], ['.pq-modal table', '3'], ['.pq-modal .pq-config, .pq-modal [data-paso]', '4'], ['.pq-modal .pq-formula', '5']] });
  await pqConsulta('clientes');
  await p.evaluate(() => { const f = document.querySelector('.pq-modal [data-menu-col="pais"]'); if (f) f.click(); }); await w(400);
  await c.foto('b05-menu-columna', { marcas: [['.pq-menu', null]] });
  await p.evaluate(() => document.querySelectorAll('.pq-menu').forEach((e) => e.remove()));
  await pqCol('telefono'); await pqTab('Inicio'); await p.click('.pq-modal [data-pq="quitarCols"]'); await w(500);
  await pqCol('segmento'); await pqTab('Transformar'); await p.click('.pq-modal [data-pq="may"]'); await w(500);
  await c.foto('b05-pasos', { marcas: [['.pq-modal .pq-config, .pq-modal [data-paso]', '1'], ['.pq-modal .pq-formula', '2']] });
  await pqTab('Vista'); await p.click('.pq-modal [data-pq="perfil"]'); await w(600);
  await c.foto('b05-perfil', { marcas: [['.pq-modal .pq-perfil, .pq-modal .pq-prof, .pq-modal .pq-estad', null]] });
  await p.click('.pq-modal [data-pq="avanzado"]'); await w(500);
  await c.foto('b05-editor-avanzado', { marcas: [['.pb-modal:not(.pq-modal)', null]] });
  await p.evaluate(() => { const ms = [...document.querySelectorAll('.pb-modal-fondo')]; const m = ms[ms.length - 1]; if (m && !m.querySelector('.pq-modal')) m.remove(); }); await w(300);
  if (!(await p.$('.pq-modal'))) { await acc('transformar', 1200); await pqConsulta('clientes'); }
  await pqTab('Vista'); await p.click('.pq-modal [data-pq="perfil"]').catch(() => {}); await w(300);
  // transformar: agrupar, columna personalizada, condicional
  await pqConsulta('detalle_pedidos'); await pqTab('Agregar columna'); await p.click('.pq-modal [data-pq="personalizada"]'); await w(500);
  await p.fill(pqDlg('[data-i="0"]'), 'importe'); await p.fill(pqDlg('[data-i="1"]'), '= [cantidad] * [precio_unitario]'); await w(200);
  await c.foto('b06-personalizada', { marcas: [[pqDlg('[data-i="0"]'), '1'], [pqDlg('[data-i="1"]'), '2']] });
  await pqDlgOk();
  log('tras personalizada, pq?', !!(await p.$('.pq-modal')));
  if (!(await p.$('.pq-modal'))) { await acc('transformar', 1200); }
  await pqConsulta('pedidos'); await pqTab('Agregar columna'); await p.click('.pq-modal [data-pq="condicional"]'); await w(500);
  await p.fill(pqDlg('[data-i="0"]'), 'tipo_canal'); await p.selectOption(pqDlg('[data-i="1"]'), 'canal').catch(() => {}); await p.fill(pqDlg('[data-i="3"]'), 'tienda'); await p.fill(pqDlg('[data-i="4"]'), 'Presencial'); await p.fill(pqDlg('[data-i="5"]'), 'Digital'); await w(200);
  await c.foto('b06-condicional', { marcas: [[pqDlg('[data-i="1"]'), '1'], [pqDlg('[data-i="2"]'), '2'], [pqDlg('[data-i="3"]'), '3'], [pqDlg('[data-i="4"]'), '4'], [pqDlg('[data-i="5"]'), '5']] });
  await pqDlgOk();
  if (!(await p.$('.pq-modal'))) { await acc('transformar', 1200); }
  await pqConsulta('pedidos'); await pqCol('canal'); await pqTab('Inicio'); await p.click('.pq-modal [data-pq="agrupar"]'); await w(500);
  await c.foto('b06-agrupar', { marcas: [[pqDlg('[data-i="0"]'), '1'], [pqDlg('[data-i="1"]'), '2'], [pqDlg('[data-i="2"]'), '3']] });
  await p.evaluate(() => { const ms = [...document.querySelectorAll('.pb-modal-fondo')]; const m = ms[ms.length - 1]; if (m && !m.querySelector('.pq-modal')) m.remove(); }); await w(300);
  if (!(await p.$('.pq-modal'))) { await acc('transformar', 1200); }
  await c.foto('b06-cerrar-aplicar', { marcas: [['.pq-modal [data-pq="aplicar"]', null]] });
  await p.click('.pq-modal [data-pq="aplicar"]'); await w(1500);
  // modelo
  await vista('modelo', 900);
  await c.foto('b07-modelo', { marcas: [['#pbModelo', '1'], ['#pbProps', '2'], ['#pbPaneles .pb-pan:last-child, #pbPaneles', '3']] });
  await cinta('modelado'); await acc('relaciones', 500);
  await c.foto('b07-relaciones', { marcas: [['.pb-modal', null]] });
  await p.click('.pb-modal [data-editar="1"]').catch(() => {}); await w(400); log('editar rel:', await dlgTxt(400));
  await c.foto('b07-editar-relacion', { marcas: [['.pb-modal:last-of-type', null]] });
  await cerrarModales();
  await p.click('[data-mt="pedidos"] [data-mcol="cliente_id"]'); await w(400);
  await c.foto('b07-propiedades-columna', { marcas: [['#pbProps', null]] });
  await p.click('[data-mt="productos"] [data-mcol="precio"]'); await w(400);
  await c.foto('b07-propiedades-precio', { marcas: [['#pbProps', null]] });
  await p.click('[data-mt="pedidos"] .pb-mt-t'); await w(400);
  await c.foto('b07-propiedades-tabla', { marcas: [['#pbProps', null]] });

  // ------------------------------------------------------------------ nivel 3: DAX
  await vista('informe', 600);
  await cinta('inicio'); await acc('nueva-medida');
  await p.fill('#pbDax textarea', 'Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario])'); await w(200);
  await c.foto('b09-barra-dax', { marcas: [['#pbDax .pb-dax-ed', '1'], ['#pbDax .pb-dax-ok', '2'], ['#pbDax .pb-dax-tabla', '3']] });
  await p.click('#pbDax .pb-dax-ok'); await w(900);
  await c.foto('b09-herramientas-medicion', { marcas: [['.pb-cinta', '1'], ['#pbPaneles .pb-campo[data-c="Ventas"]', '2']] });
  await medida('Pedidos = COUNTROWS(pedidos)');
  await medida('Ticket promedio = DIVIDE([Ventas], [Pedidos])');
  // cambiar la tarjeta a Ventas
  await seleccionar(1); await campo('pedidos', 'pedido_id'); await campo('detalle_pedidos', 'Ventas'); await deselect();
  await c.foto('b09-tarjeta-medida', { marcas: [['#pbLienzo .pb-v:nth-child(2)', null]] });
  await medida('Ventas web = CALCULATE([Ventas], pedidos[canal] = "web")');
  await medida('% del total = DIVIDE([Ventas], CALCULATE([Ventas], ALL(pedidos)))');
  await visual('tabla', [['pedidos', 'canal'], ['detalle_pedidos', 'Ventas'], ['detalle_pedidos', 'Ventas web'], ['detalle_pedidos', '% del total']], { x: 2, y: 50, w: 46, h: 47 });
  await c.foto('b10-calculate', { marcas: [['#pbLienzo .pb-v:nth-child(4)', null]] });
  await vista('dax', 800);
  await p.evaluate(() => { const ed = document.querySelector('#pbDaxEd'); const cm = ed && (ed.CodeMirror || (ed.querySelector && ed.querySelector('.CodeMirror') && ed.querySelector('.CodeMirror').CodeMirror)); const q = "EVALUATE\n    SUMMARIZECOLUMNS(\n        pedidos[canal],\n        \"Ventas\", [Ventas],\n        \"Pedidos\", [Pedidos]\n    )\nORDER BY [Ventas] DESC"; if (cm) cm.setValue(q); else if (ed) { const ta = ed.tagName === 'TEXTAREA' ? ed : ed.querySelector('textarea'); if (ta) { ta.value = q; ta.dispatchEvent(new Event('input', { bubbles: true })); } } });
  await p.click('#pbCentro button:has-text("Ejecutar")'); await w(1200);
  await c.foto('b10-consultas-dax', { marcas: [['#pbDaxEd', '1'], ['#pbDaxRes', '2']] });
  await vista('informe', 600);
  // tabla de fechas
  await cinta('modelado'); await acc('nueva-tabla');
  await dax('Calendario = ADDCOLUMNS(CALENDAR(DATE(2022,1,1), DATE(2024,12,31)), "Año", YEAR([Date]), "Mes", FORMAT([Date], "yyyy-MM"), "Nombre mes", FORMAT([Date], "MMM"))', 1500);
  await vista('modelo', 900);
  await cinta('modelado'); await acc('relaciones', 500); await p.click('.pb-modal [data-nueva]'); await w(500);
  await p.selectOption('.pb-modal [data-ta]', 'pedidos'); await w(600); await p.selectOption('.pb-modal [data-tb]', 'Calendario'); await w(600);
  for (let i = 0; i < 3; i++) { await p.selectOption('.pb-modal [data-ca]', 'fecha_pedido').catch(() => {}); await w(300); await p.selectOption('.pb-modal [data-cb]', 'Date').catch(() => {}); await w(300); const v = await p.evaluate(() => [document.querySelector('.pb-modal [data-ca]').value, document.querySelector('.pb-modal [data-cb]').value]); log('rel sel', v); if (v[0] === 'fecha_pedido' && v[1] === 'Date') break; }
  await c.foto('b11-nueva-relacion', { marcas: [['.pb-modal [data-ta]', '1'], ['.pb-modal [data-ca]', '2'], ['.pb-modal [data-tb]', '3'], ['.pb-modal [data-cb]', '4'], ['.pb-modal [data-card]', '5'], ['.pb-modal [data-dir]', '6']] });
  await p.click('.pb-modal [data-ok]'); await w(600); log('rels:', JSON.stringify(await p.evaluate(() => window.PowerBI._estado().rels.map((r) => r.de + '.' + r.cde + '->' + r.a + '.' + r.ca))));
  await cerrarModales();
  await vista('informe', 300); await vista('modelo', 800);
  await p.click('[data-mt="Calendario"] .pb-mt-t'); await w(400);
  await c.foto('b11-marcar-fechas', { marcas: [['#pbProps', null]] });
  await p.selectOption('#pbProps select', 'Date').catch(() => {}); await p.click('#pbProps button:has-text("Marcar")').catch(() => {}); await w(500);
  await vista('informe', 600);
  await medida('Ventas YTD = TOTALYTD([Ventas], Calendario[Date])');
  await medida('Ventas año anterior = CALCULATE([Ventas], SAMEPERIODLASTYEAR(Calendario[Date]))');
  await visual('linea', [['Calendario', 'Mes'], ['detalle_pedidos', 'Ventas'], ['detalle_pedidos', 'Ventas año anterior']], { x: 50, y: 25, w: 48, h: 72 });
  await c.foto('b11-inteligencia-tiempo', { marcas: [['#pbLienzo .pb-v:last-child', '1'], ['[data-pozo="y"]', '2']] });
  log('estado nivel 3:', JSON.stringify(await p.evaluate(() => { const s = window.PowerBI._estado(); return { tablas: Object.keys(s.tablas), medidas: s.medidas.map((m) => m.nombre), rels: s.rels.length, vis: s.paginas[0].visuales.map((v) => v.tipo) }; })));

  // ------------------------------------------------------------------ nivel 4: diseño e interactividad
  await seleccionar(0); await p.click('[data-panelvis="formato"]'); await w(400);
  await c.foto('b13-formato', { marcas: [['[data-panelvis="formato"]', '1'], ['#pbPaneles .pb-pan:nth-child(2)', '2']] });
  await p.click('[data-panelvis="crear"]'); await w(200);
  await cinta('vista'); await p.click('[data-tema="ejecutivo"]'); await w(600);
  await c.foto('b13-temas', { marcas: [['.pb-temas', '1'], ['#pbLienzo', '2']] });
  await cinta('insertar'); await acc('cuadro-texto', 500);
  await p.keyboard.type('Ventas de Tienda Andina'); await w(300); await deselect();
  await cinta('insertar'); await acc('nueva-pagina', 600);
  await c.foto('b13-paginas', { marcas: [['#pbPie', null]] });
  await visual('matriz', [['categorias', 'nombre'], ['pedidos', 'canal'], ['detalle_pedidos', 'Ventas']], { x: 2, y: 3, w: 60, h: 60 });
  await c.foto('b15-matriz', { marcas: [['#pbLienzo .pb-v', '1'], ['[data-pozo="filas"], [data-pozo="columnas"], [data-pozo="valores"]', '2']] });
  await visual('mapa', [['clientes', 'pais'], ['detalle_pedidos', 'Ventas']], { x: 64, y: 3, w: 34, h: 60 });
  await c.foto('b15-mapa', { marcas: [['#pbLienzo .pb-v:last-child', null]] });
  // filtros en la página
  await deselect();
  try { await p.locator('#pbPaneles .pb-campo[data-t="clientes"][data-c="segmento"]').dragTo(p.locator('[data-pozo="__filtro"]')); await w(600); } catch (e) { log('drag filtro', e.message.slice(0, 80)); }
  await c.foto('b14-filtros', { marcas: [['[data-pozo="__fvis"]', '1'], ['[data-pozo="__filtro"]', '2'], ['[data-pozo="__todas"]', '3']] });
  // obtener detalles: la página 2 como página de detalle por categoría
  try { await p.locator('#pbPaneles .pb-campo[data-t="categorias"][data-c="nombre"]').dragTo(p.locator('#pbPaneles [data-pozo-det]')); await w(600); } catch (e) { log('drag det', e.message.slice(0, 80)); }
  await c.foto('b14-obtener-detalles', { marcas: [['#pbPaneles [data-pozo-det]', null]] });
  await cerrarModales(); await deselect(); await cinta('vista'); log('vista accs:', await p.evaluate(() => [...document.querySelectorAll('.pb-cinta [data-acc]')].map((e) => e.dataset.acc).join(','))); await acc('x-p-marcadores', 500);
  await p.click('[data-mk="agregar"]').catch(() => {}); await w(400);
  await c.foto('b14-marcadores', { marcas: [['[data-mk="agregar"]', '1'], ['[data-mk="ver"]', '2']] });
  await cinta('vista'); await acc('x-p-marcadores', 400);
  await cinta('insertar'); await p.click('[data-acc="x-botones"]').catch(() => {}); await w(300);
  await c.foto('b14-botones', { marcas: [['.pb-menu', null]] }); await cerrarModales();
  // IA
  await cinta('insertar'); await acc('nueva-pagina', 600);
  await cinta('insertar'); await acc('ia-qa', 800); await geom({ x: 2, y: 3, w: 48, h: 60 });
  await p.click('#pbLienzo .pb-v.sel input').catch(() => {}); await p.keyboard.type('ventas por categoría'); await p.keyboard.press('Enter'); await w(1200);
  await c.foto('b15-qa', { marcas: [['#pbLienzo .pb-v.sel', null]] });
  await cinta('insertar'); await acc('ia-arbol', 800); await geom({ x: 52, y: 3, w: 46, h: 60 });
  await campo('detalle_pedidos', 'Ventas'); await campo('pedidos', 'canal'); await campo('categorias', 'nombre');
  await p.click('#pbLienzo .pb-v.sel .pb-arbol-mas, #pbLienzo .pb-v.sel button').catch(() => {}); await w(500);
  await c.foto('b15-arbol', { marcas: [['#pbLienzo .pb-v.sel', null]] });
  await cinta('optimizar'); await acc('analizador', 800);
  await c.foto('b21-analizador', { marcas: [['.pb-perf, .pb-analizador, #pbCentro > :last-child', null]] });
  await acc('analizador', 400);

  // ------------------------------------------------------------------ nivel 5: seguridad y servicio
  await cinta('modelado'); await acc('roles', 500); await p.click('.pb-modal [data-nuevo-rol]'); await w(400);
  await p.click('.pb-modal [data-nueva-regla]'); await w(500); log('rol regla attrs:', await p.evaluate(() => [...document.querySelectorAll('.pb-modal select, .pb-modal input')].map((e) => e.tagName + ':' + JSON.stringify(e.dataset)).join(',')));
  await p.evaluate(() => { const sel = [...document.querySelectorAll('.pb-modal select')]; const col = sel.find((x) => [...x.options].some((o) => o.value === 'pais')); if (col) { col.value = 'pais'; col.dispatchEvent(new Event('change', { bubbles: true })); } }); await w(300);
  await p.evaluate(() => { const i = [...document.querySelectorAll('.pb-modal input')].find((x) => x.dataset.val !== undefined || x.placeholder === 'Valor' || x.dataset.regla !== undefined); if (i) { i.value = 'Argentina'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } }); await w(300);
  await p.fill('.pb-modal [data-nom-rol]', 'Gerente Argentina').catch(() => {}); await p.dispatchEvent('.pb-modal [data-nom-rol]', 'change').catch(() => {}); await w(400); log('rol regla dlg:', await dlgTxt(600));
  await c.foto('b19-roles', { marcas: [['.pb-modal', null]] });
  await cerrarModales();
  await acc('ver-como', 500); log('ver como:', await dlgTxt(500));
  await c.foto('b19-ver-como', { marcas: [['.pb-modal', null]] }); await cerrarModales();
  await acc('grupo-calculo', 500); log('grupo calc:', await dlgTxt(500)); await c.foto('b22-grupo-calculo', { marcas: [['.pb-modal', null]] }); await cerrarModales();
  await p.click('[data-acc="x-parametro"]').catch(() => {}); await w(300); await c.foto('b22-parametro', { marcas: [['.pb-menu', null]] }); await cerrarModales();
  await vista('tmdl', 900); await p.click('#pbPaneles .pb-campo[data-c="Ventas"]').catch(() => {}); await w(600);
  await c.foto('b22-tmdl', { marcas: [['#pbTmdlEd', '1'], ['#pbCentro button', '2']] });
  await vista('informe', 600);
  await p.evaluate(() => { const s = window.PowerBI._estado(); s.pagina = 0; }); await vista('tabla', 300); await vista('informe', 500);
  await cinta('inicio'); await acc('publicar', 800);
  await c.foto('b17-publicar', { marcas: [['.pbs-dlg [data-n]', '1'], ['.pbs-dest', '2'], ['.pbs-dlg [data-ok]', '3']] });
  await p.fill('.pbs-dlg [data-n]', 'Ventas Tienda Andina'); await p.click('.pbs-dlg [data-ok]'); await w(1500);
  await c.foto('b17-publicado', { marcas: [['.pbs-capa', null]] });
  await p.click('.pbs-capa a').catch(() => {}); await w(1500);
  await c.foto('b17-informe-servicio', { marcas: [['#pbsMain', null]] });
  await p.click('#pbsMain button:has-text("Compartir")').catch(() => {}); await w(500); log('compartir:', await dlgTxt(500));
  await c.foto('b17-compartir', { marcas: [['.pbs-dlg, .pb-modal, .pbs-capa', null]] }); await cerrarModales();
  await c.ir('#/powerbi/servicio/ws/mi', '#pbsMain'); await w(600);
  await c.foto('b17-area-trabajo', { marcas: [['#pbsMain', null]] });
  const modUrl = await p.$$eval('#pbsMain a[href*="/modelo/"]', (as) => as[0] && as[0].getAttribute('href'));
  if (modUrl) {
    await c.ir(modUrl, '#pbsMain'); await w(600);
    await c.foto('b18-actualizacion', { marcas: [['#pbsMain', null]] });
    for (const [tabN, nombre] of [['Conexión de puerta de enlace', 'b18-gateway'], ['Credenciales del origen de datos', 'b18-credenciales'], ['Seguridad (RLS)', 'b19-rls-servicio'], ['Historial de actualizaciones', 'b18-historial']]) {
      await p.click(`#pbsMain :text("${tabN}")`).catch(() => {}); await w(500);
      await c.foto(nombre, { marcas: [['#pbsMain', null]] });
    }
  }
  await c.ir('#/powerbi/servicio/apps', '#pbsMain'); await w(500); await c.foto('b17-apps');
  await c.ir('#/powerbi/servicio/pipelines', '#pbsMain'); await w(500); await c.foto('b20-canalizaciones');
  await c.ir('#/powerbi/servicio/ws', '#pbsMain'); await w(500); await c.foto('b17-areas', { marcas: [['#pbsMain', null]] });
}
