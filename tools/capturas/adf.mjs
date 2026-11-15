// Guion de capturas del curso de Data Factory (assets/img/guias/adf/)
// Historia: el equipo de datos de Tienda Andina automatiza la ingesta de las ventas de las tiendas con Azure Data Factory.
export default async function (c) {
  const p = c.page;
  const w = (ms) => c.espera(ms);
  const log = (...a) => console.log('   [adf]', ...a);
  const HASTA = Number(process.env.ADF_HASTA || 99);
  const RG = 'rg-tiendaandina-dev', ST = 'sttiendaandinadev', ADF = 'adf-tiendaandina-dev', KV = 'kv-tiendaandina-dev', DBW = 'dbw-tiendaandina-dev';
  const ira = async (r, ms = 700) => { await p.evaluate((h) => { location.hash = h; }, '#/azure/' + r); await w(ms); };
  const studio = async (r = 'home', ms = 800) => ira(`studio/${ADF}/${r}`, ms);
  const dlg = '.adf-modal .adf-dlg';
  const ok = async (ms = 600) => { await p.click(`${dlg} [data-ok]`); await w(ms); };
  const cerrar = async () => { await p.evaluate(() => document.querySelectorAll('.adf-modal, .adf-menu').forEach((x) => x.remove())); await w(150); };
  const errDlg = () => p.evaluate(() => { const e = document.querySelector('.adf-modal .adf-dlg-err'); return e && !e.hidden ? e.textContent : ''; });
  const menuItem = async (t) => { await p.evaluate((t) => { const b = [...document.querySelectorAll('.adf-menu button')].find((x) => x.textContent.trim() === t); if (b) b.click(); }, t); await w(500); };
  const act = async (n) => { await p.click(`.adf-act[data-act="${n}"]`); await w(400); };
  const pest = async (k) => { await p.click(`#adfProps [data-p="${k}"]`); await w(300); };
  const campo = async (f, v) => { const el = p.locator(`#adfProps [data-f="${f}"]`).first(); const tag = await el.evaluate((e) => e.tagName + ':' + e.type); if (tag.startsWith('SELECT')) await el.selectOption(v); else if (tag.endsWith('checkbox')) { if ((await el.isChecked()) !== v) await el.click(); } else { await el.fill(String(v)); await el.dispatchEvent('change'); } await w(450); };
  const agregar = async (tipo) => { await p.click(`.adf-acts [data-add="${tipo}"]`); await w(500); };
  const tb = async (a, ms = 500) => { await p.click(`.adf-tb [data-a="${a}"]`); await w(ms); };
  const debug = async (ms = 4000) => { await tb('debug', ms); };
  const S = () => p.evaluate((f) => window.CloudSim.az().adf[f].studio, ADF);

  // ---- el entorno de partida: lo que el alumno armó en el curso del portal de Azure, más la zona de aterrizaje "raw"
  const filas = (fecha, base) => ['venta_id,fecha,tienda,producto_id,cantidad,precio_unitario', ...[0, 1, 2, 3, 4].map((i) => `${base + i},${fecha},${['Lima Centro', 'Bogotá Norte', 'CDMX Roma', 'Santiago Providencia', 'Buenos Aires Palermo'][i]},${101 + ((base + i * 7) % 40)},${1 + ((base + i) % 4)},${(9.9 + ((base * 3 + i * 11) % 50)).toFixed(2)}`)].join('\n') + '\n';
  await c.ir('#/azure', '#azp'); await w(800);
  await p.evaluate(({ RG, ST, ADF, KV, DBW, ventas }) => {
    const s = window.CloudSim.az(); const t = new Date(Date.now() - 3 * 864e5).toISOString();
    s.groups = s.groups || {}; s.groups[RG] = { location: 'eastus2', tags: { proyecto: 'tienda-andina', entorno: 'dev', owner: 'equipo-datos' } };
    s.storage[ST] = { rg: RG, location: 'eastus2', sku: 'Standard_LRS', kind: 'StorageV2', hns: true, tags: { proyecto: 'tienda-andina', entorno: 'dev' }, creado: t, props: { tier: 'Hot', tls: 'TLS1_2', secure: true, anonimo: false, red: 'all', softBlob: true, softDias: 7 },
      containers: { raw: { creado: t, acceso: 'Private', blobs: { ...ventas, 'devoluciones/devoluciones_2026-11-15.json': '{"devolucion_id": 1, "venta_id": 1003, "motivo": "producto dañado"}\n{"devolucion_id": 2, "venta_id": 1017, "motivo": "talle incorrecto"}\n' } }, bronze: { creado: t, acceso: 'Private', blobs: {} }, silver: { creado: t, acceso: 'Private', blobs: {} }, gold: { creado: t, acceso: 'Private', blobs: {} },
        config: { creado: t, acceso: 'Private', blobs: { 'tablas_a_copiar.csv': 'fuente,patron,activo\nventas,*.csv,1\ndevoluciones,*.json,1\ninventario,*.csv,0\n' } } } };
    s.kv[KV] = { rg: RG, location: 'eastus2', secrets: {}, tags: {}, creado: t, props: { sku: 'standard', retencion: 90, purga: false, permiso: 'rbac', red: 'all' } };
    const mrg = 'databricks-rg-' + DBW + '-practica'; s.dbw[DBW] = { rg: RG, location: 'eastus2', sku: 'premium', url: 'adb-1234567890123456.7.azuredatabricks.net', tags: {}, creado: t, rgAdministrado: mrg, props: { npip: true } }; s.groups[mrg] = { location: 'eastus2', tags: {}, administradoPor: DBW };
    s.adf[ADF] = { rg: RG, location: 'eastus2', tags: {}, creado: t, props: { version: 'V2', red: 'public' } };
    s.roles = (s.roles || []).filter((r) => r.principalName !== ADF);
    window.CloudSim.save();
  }, { RG, ST, ADF, KV, DBW, ventas: Object.fromEntries(['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'].map((f, i) => [`ventas/ventas_${f}.csv`, filas(f, 1000 + i * 5)])) });

  // ================================================================ Nivel 1 · lección 1: qué es Data Factory y el Studio
  await ira(`recurso/adf/${ADF}`, 900);
  await c.foto('b01-portal', { marcas: [['.az-ess', '1'], ['#adfStudio', '2']] });
  await p.click('#adfStudio'); await w(1500);
  await c.foto('b01-home', { marcas: [['.adf-rail', '1'], ['.adf-barra', '2'], ['.adf-tiles', '3'], ['.adf-pasos', '4']] });
  await studio('author');
  await c.foto('b01-author', { marcas: [['.adf-recursos', '1'], ['.adf-rail a.on', '2']] });
  await studio('monitor');
  await c.foto('b01-monitor', { marcas: [['.adf-pest', '1']] });
  await studio('manage');
  await c.foto('b01-manage', { marcas: [['.adf-man-nav', null]] });
  if (HASTA <= 1) return;

  // ================================================================ lección 2: linked services (conexiones)
  await c.foto('b02-linked-vacio', { marcas: [['#manC [data-a="nuevo"]', '1']] });
  await p.click('#manC [data-a="nuevo"]'); await w(500);
  await p.selectOption('#lT', 'AzureBlobFS'); await w(300); await p.fill('#lN', 'ls_adls_tiendaandina');
  await p.selectOption('#lAu', 'msi'); await p.selectOption('#lA', ST); await w(200);
  await c.foto('b02-nuevo-linked', { marcas: [['#lT', '1'], ['#lN', '2'], ['#lAu', '3'], ['#lA', '4']] });
  await p.click(`${dlg} [data-a="test"]`); await w(500);
  await c.foto('b02-test-falla', { marcas: [['#lR', null]] });
  await cerrar();
  // el rol en el portal
  await ira(`recurso/storage/${ST}/iam`, 800);
  await p.click('#iAdd'); await w(500); await p.fill('#rQ', 'Storage Blob Data'); await w(300);
  await p.check('#rL input[value="Storage Blob Data Contributor"]'); await p.selectOption('#rM', { index: 1 }).catch(() => {}); await p.selectOption('#rP', ADF); await w(200);
  await c.foto('b02-rol-portal', { marcas: [['#rL label.az-rol:has(input[value="Storage Blob Data Contributor"])', '1'], ['#rM', '2'], ['#rP', '3']] });
  await p.click('#azCapa .az-panel [data-ok]'); await w(700);
  await studio('manage');
  await p.click('#manC [data-a="nuevo"]'); await w(500);
  await p.selectOption('#lT', 'AzureBlobFS'); await w(300); await p.fill('#lN', 'ls_adls_tiendaandina'); await p.selectOption('#lAu', 'msi'); await p.selectOption('#lA', ST);
  await p.click(`${dlg} [data-a="test"]`); await w(500);
  await c.foto('b02-test-ok', { marcas: [['#lR', null]] });
  await ok(700);
  await p.click('#manC [data-a="nuevo"]'); await w(500);
  await p.selectOption('#lT', 'AzureKeyVault'); await w(300); await p.fill('#lN', 'ls_keyvault'); await p.selectOption('#lV', KV).catch(() => {});
  await c.foto('b02-linked-kv', { marcas: [['#lT', '1'], ['#lV', '2']] });
  await ok(700);
  await c.foto('b02-linked-lista', { marcas: [['#manC .adf-tabla', null]] });
  await p.click('#manC [data-ver="ls_adls_tiendaandina"]'); await w(500);
  await c.foto('b02-linked-json', { marcas: [[dlg, null]] });
  await cerrar();
  if (HASTA <= 2) return;

  // ================================================================ lección 3: datasets
  await studio('author');
  await p.click('[data-a="mas"]'); await w(300);
  await c.foto('b03-menu-nuevo', { marcas: [['.adf-menu', null]] });
  await menuItem('Dataset');
  await p.selectOption('#dF', 'DelimitedText'); await p.fill('#dN', 'ds_raw_ventas'); await p.selectOption('#dL', 'ls_adls_tiendaandina');
  await p.fill('#dC', 'raw'); await p.fill('#dD', 'ventas'); await p.fill('#dA', '');
  await c.foto('b03-nuevo-dataset', { marcas: [['#dF', '1'], ['#dN', '2'], ['#dL', '3'], ['#dC', '4'], ['#dD', '5'], ['#dH', '6']] });
  await ok(800);
  await c.foto('b03-dataset', { marcas: [['.adf-recursos', '1'], ['.adf-form', '2'], ['.adf-tb', '3']] });
  await tb('prev', 700);
  await c.foto('b03-preview', { marcas: [['#dsOut', null]] });
  await tb('json', 500);
  await c.foto('b03-json', { marcas: [[dlg, null]] });
  await cerrar();
  // un error a propósito: el contenedor con mayúscula
  await p.click('[data-a="mas"]'); await w(300); await menuItem('Dataset');
  await p.fill('#dN', 'ds_prueba'); await p.selectOption('#dL', 'ls_adls_tiendaandina'); await p.fill('#dC', 'Raw'); await p.fill('#dD', 'ventas'); await ok(800);
  await tb('prev', 700);
  await c.foto('b03-preview-error', { marcas: [['.adf-form [data-k="container"]', '1'], ['#dsOut', '2']] });
  await tb('del', 600);
  // destino y JSON
  await p.click('[data-a="mas"]'); await w(300); await menuItem('Dataset');
  await p.fill('#dN', 'ds_bronze_ventas'); await p.selectOption('#dL', 'ls_adls_tiendaandina'); await p.fill('#dC', 'bronze'); await p.fill('#dD', 'ventas'); await ok(800);
  await p.click('[data-a="mas"]'); await w(300); await menuItem('Dataset');
  await p.selectOption('#dF', 'Json'); await w(200); await p.fill('#dN', 'ds_raw_devoluciones'); await p.selectOption('#dL', 'ls_adls_tiendaandina'); await p.fill('#dC', 'raw'); await p.fill('#dD', 'devoluciones'); await ok(800);
  await tb('prev', 700);
  await c.foto('b03-preview-json', { marcas: [['.adf-recursos', '1'], ['#dsOut', '2']] });
  if (HASTA <= 3) return;

  // ================================================================ lección 4 (proyecto): la primera copia
  await studio('home');
  await p.click('[data-h="ingest"]'); await w(900);
  await c.foto('b04-pipeline-nuevo', { marcas: [['.adf-acts', '1'], ['.adf-lienzo', '2'], ['#adfProps', '3']] });
  await tb('renombrar', 400); await p.fill('#rn', 'pl_copiar_ventas'); await ok(800);
  await act('Copy data1'); await campo('name', 'Copiar ventas a bronze');
  await pest('source'); await campo('source', 'ds_raw_ventas');
  await c.foto('b04-source', { marcas: [['#adfProps [data-f="source"]', '1'], ['#adfProps [data-f="wildcard"]', '2']] });
  await pest('sink'); await campo('sink', 'ds_bronze_ventas');
  await c.foto('b04-sink', { marcas: [['#adfProps [data-f="sink"]', '1'], ['#adfProps [data-f="merge"]', '2']] });
  await tb('validar', 500);
  await c.foto('b04-validar', { marcas: [['.adf-tb [data-a="validar"]', '1'], ['#adfProps', '2']] });
  await debug(4500);
  await c.foto('b04-debug', { marcas: [['.adf-tb [data-a="debug"]', '1'], ['#adfProps', '2']] });
  await p.click('#adfProps [data-io="out:0"]'); await w(500);
  await c.foto('b04-output', { marcas: [[dlg, null]] });
  await cerrar();
  await ira(`recurso/storage/${ST}/contenedores/bronze`, 900);
  await c.foto('b04-bronze', { marcas: [['#azRC .az-tabla', null]] });
  if (HASTA <= 4) return;

  // ================================================================ Nivel 2 · lección 5: el lienzo y las actividades
  await studio('author/pipeline:pl_copiar_ventas', 900);
  await p.fill('#aQ', 'wa'); await w(300);
  await c.foto('b05-buscar-actividad', { marcas: [['#aQ', '1'], ['.adf-acts', '2']] });
  await p.fill('#aQ', ''); await p.dispatchEvent('#aQ', 'input'); await w(200);
  await act('Copiar ventas a bronze'); await agregar('Wait');
  await c.foto('b05-wait', { marcas: [['.adf-lienzo', '1'], ['#adfProps', '2']] });
  await pest('settings'); await campo('segundos', 5);
  await c.foto('b05-wait-settings', { marcas: [['#adfProps [data-f="segundos"]', null]] });
  await pest('general');
  await c.foto('b05-depends-on', { marcas: [['#adfProps .adf-dep', null]] });
  await tb('json', 500);
  await c.foto('b05-code', { marcas: [[dlg, null]] });
  await cerrar();
  await p.click('#adfProps [data-borrar]'); await w(500);
  await p.click('.adf-lienzo', { position: { x: 500, y: 200 } }); await w(400);
  await c.foto('b05-parametros', { marcas: [['#adfProps', null]] });
  if (HASTA <= 5) return;

  // ================================================================ lección 6: Copy data a fondo
  await act('Copiar ventas a bronze'); await pest('source'); await campo('wildcard', '*-11-15.csv');
  await c.foto('b06-wildcard', { marcas: [['#adfProps [data-f="wildcard"]', null]] });
  await debug(4000);
  await p.click('#adfProps [data-io="out:0"]'); await w(500);
  await c.foto('b06-un-archivo', { marcas: [[dlg, null]] });
  await cerrar();
  await act('Copiar ventas a bronze'); await pest('source'); await campo('wildcard', '');
  await pest('sink'); await campo('merge', true); await campo('sinkFile', 'ventas_historico.csv');
  await c.foto('b06-merge', { marcas: [['#adfProps [data-f="merge"]', '1'], ['#adfProps [data-f="sinkFile"]', '2']] });
  await debug(4000);
  await p.click('#adfProps [data-io="out:0"]'); await w(500);
  await c.foto('b06-merge-output', { marcas: [[dlg, null]] });
  await cerrar();
  await ira(`recurso/storage/${ST}/contenedores/bronze`, 800);
  await c.foto('b06-bronze', { marcas: [['#azRC .az-tabla', null]] });
  await studio('author/pipeline:pl_copiar_ventas', 900);
  await act('Copiar ventas a bronze'); await pest('sink'); await campo('merge', false); await campo('sinkFile', '');
  if (HASTA <= 6) return;

  // ================================================================ lección 7: Validate, Debug y los errores
  await pest('sink'); await campo('sink', '');
  await tb('validar', 500);
  await c.foto('b07-validacion-error', { marcas: [['#adfProps', null]] });
  await act('Copiar ventas a bronze'); await pest('sink'); await campo('sink', 'ds_bronze_ventas');
  await pest('source'); await campo('wildcard', '*-11-16.csv');
  await debug(4000);
  await c.foto('b07-debug-falla', { marcas: [['.adf-lienzo .adf-act', '1'], ['#adfProps', '2']] });
  await p.click('#adfProps [data-io="err:0"]'); await w(500);
  await c.foto('b07-error-detalle', { marcas: [[dlg, null]] });
  await cerrar();
  await act('Copiar ventas a bronze'); await pest('general'); await campo('retry', 2);
  await c.foto('b07-retry', { marcas: [['#adfProps [data-f="retry"]', null]] });
  await campo('retry', 0); await pest('source'); await campo('wildcard', '');
  await studio('monitor'); await p.click('[data-m="debug"]'); await w(500);
  await c.foto('b07-monitor-debug', { marcas: [['.adf-pest', '1'], ['.adf-runs', '2']] });
  if (HASTA <= 7) return;

  // ================================================================ lección 8 (proyecto): la ingesta diaria con nombre de archivo dinámico
  await studio('author');
  await p.click('[data-a="mas"]'); await w(300); await menuItem('Pipeline');
  await tb('renombrar', 400); await p.fill('#rn', 'pl_ingesta_diaria'); await ok(800);
  await agregar('Copy'); await campo('name', 'Copiar ventas del dia');
  await pest('source'); await campo('source', 'ds_raw_ventas'); await campo('wildcard', '*.csv');
  await pest('sink'); await campo('sink', 'ds_bronze_ventas'); await campo('merge', true);
  await campo('sinkFile', "ventas_@{formatDateTime(utcNow(), 'yyyyMMdd')}.csv");
  await c.foto('b08-sink-dinamico', { marcas: [['#adfProps [data-f="sinkFile"]', '1'], ['#adfProps .adf-din', '2']] });
  await debug(4000);
  await c.foto('b08-debug', { marcas: [['#adfProps', null]] });
  await ira(`recurso/storage/${ST}/contenedores/bronze`, 800);
  await c.foto('b08-bronze', { marcas: [['#azRC .az-tabla', null]] });
  if (HASTA <= 8) return;

  // ================================================================ Nivel 3 · lección 9: publicar y Trigger now
  await studio('author/pipeline:pl_ingesta_diaria', 900);
  await c.foto('b09-live-mode', { marcas: [['.adf-pub', '1'], ['.adf-live', '2']] });
  await tb('trigger', 300); await menuItem('Trigger now');
  await c.foto('b09-trigger-sin-publicar', { marcas: [[dlg, null]] });
  await cerrar();
  await p.click('.adf-pub'); await w(500);
  await c.foto('b09-publicar', { marcas: [[dlg, null]] });
  await ok(900);
  await c.foto('b09-publicado', { marcas: [['.adf-barra', null]] });
  await tb('trigger', 300); await menuItem('Trigger now');
  await c.foto('b09-trigger-now', { marcas: [[dlg, null]] });
  await ok(4500);
  await studio('monitor'); await p.click('[data-m="triggered"]'); await w(500);
  await c.foto('b09-monitor', { marcas: [['.adf-runs', null]] });
  if (HASTA <= 9) return;

  // ================================================================ lección 10: triggers programados y de eventos
  await studio('author/pipeline:pl_ingesta_diaria', 900);
  await tb('trigger', 300); await menuItem('New/Edit');
  await p.fill('#tN', 'tr_diario_0600'); await p.selectOption('#tT', 'ScheduleTrigger'); await p.selectOption('#tF', { index: 2 }).catch(() => {});
  const frecs = await p.$$eval('#tF option', (o) => o.map((x) => x.value)); log('frecuencias', frecs.join(','));
  await p.selectOption('#tF', frecs.find((x) => /day/i.test(x)) || frecs[0]); await p.fill('#tI', '1');
  await c.foto('b10-nuevo-trigger', { marcas: [['#tN', '1'], ['#tT', '2'], ['#tF', '3'], ['#tI', '4'], ['#tA', '5']] });
  await ok(700);
  await studio('manage'); await p.click('[data-g="triggers"]'); await w(500);
  await c.foto('b10-triggers', { marcas: [['#manC .adf-tabla', null]] });
  await studio('monitor'); await w(300);
  await p.click('[data-fire="tr_diario_0600"]'); await w(600);
  await c.foto('b10-sin-publicar', { marcas: [[dlg, null]] });
  await cerrar();
  await p.click('.adf-pub'); await w(500); await ok(900);
  await studio('monitor'); await p.click('[data-fire="tr_diario_0600"]'); await w(4500);
  await studio('monitor', 700);
  await c.foto('b10-disparado', { marcas: [['.adf-runs', '1'], ['.adf-mon h2 + .adf-tabla, .adf-mon .adf-tabla:last-of-type', '2']] });
  if (HASTA <= 10) return;

  // ================================================================ lección 11: Monitor
  await p.click('.adf-runs [data-run]'); await w(600);
  await c.foto('b11-run', { marcas: [['.adf-mon-cab', '1'], ['.adf-mon .adf-tabla', '2'], ['[data-a="rerun"]', '3']] });
  await p.click('[data-io="in:0"]'); await w(500);
  await c.foto('b11-input', { marcas: [[dlg, null]] });
  await cerrar();
  await p.click('[data-a="rerun"]'); await w(4500);
  await studio('monitor', 700);
  await c.foto('b11-rerun', { marcas: [['.adf-runs', null]] });
  if (HASTA <= 11) return;

  // ================================================================ lección 12 (proyecto): en producción con horario
  await ira('actividad', 800);
  await c.foto('b12-actividad', { marcas: [['.az-pag .az-tabla', null]] });
  await ira(`recurso/adf/${ADF}`, 800);
  await studio('manage'); await p.click('[data-g="triggers"]'); await w(500);
  await p.click('[data-tog="tr_diario_0600"]'); await w(500);
  await c.foto('b12-trigger-parado', { marcas: [['#manC .adf-tabla', '1'], ['.adf-pub', '2']] });
  await p.click('[data-tog="tr_diario_0600"]'); await w(400);
  if (HASTA <= 12) return;

  // ================================================================ Nivel 4 · lección 13: parámetros y contenido dinámico
  const vacio = async () => { await p.click('.adf-lienzo', { position: { x: 700, y: 230 } }); await w(400); for (let i = 0; i < 2; i++) { if (await p.$('#adfProps [data-padd], #adfProps [data-vadd]')) break; const x = await p.$('#adfProps [data-x]'); if (x) { await x.click(); await w(400); } } };
  await studio('author/pipeline:pl_ingesta_diaria', 900); await vacio();
  await p.click('#adfProps [data-padd]'); await w(300);
  await p.fill('#adfProps [data-pk="param1"]', 'fecha'); await p.dispatchEvent('#adfProps [data-pk="param1"]', 'change'); await w(300);
  await p.fill('#adfProps [data-pv="fecha"]', '2026-11-15'); await p.dispatchEvent('#adfProps [data-pv="fecha"]', 'change'); await w(300);
  await c.foto('b13-parametro', { marcas: [['#adfProps .adf-params', null]] });
  await act('Copiar ventas del dia'); await pest('source'); await campo('wildcard', 'ventas_@{pipeline().parameters.fecha}.csv');
  await c.foto('b13-source', { marcas: [['#adfProps [data-f="wildcard"]', null]] });
  await pest('sink'); await campo('sinkFile', "ventas_@{replace(pipeline().parameters.fecha, '-', '')}.csv");
  await c.foto('b13-sink', { marcas: [['#adfProps [data-f="sinkFile"]', null]] });
  await debug(4000);
  await p.click('#adfProps [data-io="out:0"]'); await w(500);
  await c.foto('b13-debug-output', { marcas: [[dlg, null]] });
  await cerrar();
  await p.click('.adf-pub'); await w(500); await ok(900);
  await tb('trigger', 300); await menuItem('Trigger now');
  await p.fill('[data-tp="fecha"]', '2026-11-14');
  await c.foto('b13-trigger-param', { marcas: [['[data-tp="fecha"]', null]] });
  await ok(4500);
  await ira(`recurso/storage/${ST}/contenedores/bronze`, 800);
  await c.foto('b13-bronze', { marcas: [['#azRC .az-tabla', null]] });
  if (HASTA <= 13) return;

  // ================================================================ lección 14: variables y Set variable
  await studio('author/pipeline:pl_ingesta_diaria', 900); await vacio();
  await p.click('#adfProps [data-pp="variables"]'); await w(300);
  await p.click('#adfProps [data-vadd]'); await w(300);
  await p.fill('#adfProps [data-vk="variable1"]', 'archivo'); await p.dispatchEvent('#adfProps [data-vk="variable1"]', 'change'); await w(300);
  await c.foto('b14-variables', { marcas: [['#adfProps .adf-params', null]] });
  await agregar('SetVariable'); await campo('name', 'Armar nombre');
  await pest('settings'); await campo('variable', 'archivo'); await campo('valor', "@concat('ventas_', pipeline().parameters.fecha, '.csv')");
  await c.foto('b14-set-variable', { marcas: [['#adfProps [data-f="variable"]', '1'], ['#adfProps [data-f="valor"]', '2']] });
  await act('Copiar ventas del dia'); await pest('general');
  await p.check('#adfProps [data-dep="Armar nombre"]'); await w(500);
  await pest('source'); await campo('wildcard', "@variables('archivo')");
  await c.foto('b14-lienzo', { marcas: [['.adf-lienzo', '1'], ['#adfProps [data-f="wildcard"]', '2']] });
  await debug(4500);
  await p.click('#adfProps [data-io="out:0"]'); await w(500);
  await c.foto('b14-output-variable', { marcas: [[dlg, null]] });
  await cerrar();
  if (HASTA <= 14) return;

  // ================================================================ lección 15: Get Metadata y ForEach
  await studio('author'); await p.click('[data-a="mas"]'); await w(300); await menuItem('Pipeline');
  await tb('renombrar', 400); await p.fill('#rn', 'pl_copiar_carpeta'); await ok(800);
  await agregar('GetMetadata'); await campo('name', 'Listar archivos');
  await pest('settings'); await campo('dataset', 'ds_raw_ventas');
  await c.foto('b15-get-metadata', { marcas: [['#adfProps [data-f="dataset"]', '1'], ['#adfProps [data-campo="childItems"]', '2']] });
  await agregar('ForEach'); await campo('name', 'Por cada archivo');
  await pest('settings'); await campo('items', "@activity('Listar archivos').output.childItems");
  await c.foto('b15-foreach', { marcas: [['#adfProps [data-f="secuencial"]', '1'], ['#adfProps [data-f="items"]', '2']] });
  await p.click('[data-entrar="Por cada archivo|activities"]').catch(async () => { await p.click('#adfProps [data-entrar-props]'); }); await w(600);
  await agregar('Copy'); await campo('name', 'Copiar archivo');
  await pest('source'); await campo('source', 'ds_raw_ventas'); await campo('wildcard', '@item().name');
  await pest('sink'); await campo('sink', 'ds_bronze_ventas');
  await c.foto('b15-dentro-foreach', { marcas: [['.adf-migas-cont', '1'], ['.adf-lienzo', '2']] });
  await pest('source');
  await c.foto('b15-copy-item', { marcas: [['#adfProps [data-f="wildcard"]', null]] });
  await p.click('.adf-migas-cont [data-subir="0"]'); await w(600);
  await debug(9000);
  await c.foto('b15-debug', { marcas: [['#adfProps', null]] });
  await p.click('#adfProps [data-io="out:0"]'); await w(500);
  await c.foto('b15-child-items', { marcas: [[dlg, null]] });
  await cerrar();
  if (HASTA <= 15) return;

  // ================================================================ lección 16 (proyecto): todas las devoluciones, en paralelo
  await studio('author'); await p.click('[data-a="mas"]'); await w(300); await menuItem('Dataset');
  await p.selectOption('#dF', 'Json'); await w(200); await p.fill('#dN', 'ds_bronze_devoluciones'); await p.selectOption('#dL', 'ls_adls_tiendaandina'); await p.fill('#dC', 'bronze'); await p.fill('#dD', 'devoluciones'); await ok(800);
  await p.click('[data-a="mas"]'); await w(300); await menuItem('Pipeline');
  await tb('renombrar', 400); await p.fill('#rn', 'pl_copiar_devoluciones'); await ok(800);
  await agregar('GetMetadata'); await campo('name', 'Listar devoluciones'); await pest('settings'); await campo('dataset', 'ds_raw_devoluciones');
  await agregar('ForEach'); await campo('name', 'Por cada devolucion'); await pest('settings'); await campo('secuencial', false); await campo('lote', 10); await campo('items', "@activity('Listar devoluciones').output.childItems");
  await c.foto('b16-paralelo', { marcas: [['#adfProps [data-f="secuencial"]', '1'], ['#adfProps [data-f="lote"]', '2']] });
  await p.click('[data-entrar="Por cada devolucion|activities"]').catch(async () => { await p.click('#adfProps [data-entrar-props]'); }); await w(600);
  await agregar('Copy'); await campo('name', 'Copiar devolucion'); await pest('source'); await campo('source', 'ds_raw_devoluciones'); await campo('wildcard', '@item().name'); await pest('sink'); await campo('sink', 'ds_bronze_devoluciones');
  await p.click('.adf-migas-cont [data-subir="0"]'); await w(600);
  await debug(5000);
  await c.foto('b16-debug', { marcas: [['.adf-lienzo', '1'], ['#adfProps', '2']] });
  await ira(`recurso/storage/${ST}/contenedores/bronze`, 800);
  await c.foto('b16-bronze', { marcas: [['#azRC .az-tabla', null]] });
  if (HASTA <= 16) return;

  // ================================================================ Nivel 5 · lección 17: Lookup, If Condition y Fail
  const nuevoDs = async (n, cont, carpeta, archivo = '', fmt = 'DelimitedText') => { await studio('author'); await p.click('[data-a="mas"]'); await w(300); await menuItem('Dataset'); await p.selectOption('#dF', fmt); await w(200); await p.fill('#dN', n); await p.selectOption('#dL', 'ls_adls_tiendaandina'); await p.fill('#dC', cont); await p.fill('#dD', carpeta); await p.fill('#dA', archivo); await ok(800); };
  const nuevoPipe = async (n) => { await studio('author'); await p.click('[data-a="mas"]'); await w(300); await menuItem('Pipeline'); await tb('renombrar', 400); await p.fill('#rn', n); await ok(800); };
  const param = async (k, v) => { await vacio(); if (await p.$('#adfProps [data-pp="parametros"]:not(.on)')) { await p.click('#adfProps [data-pp="parametros"]'); await w(300); } if (!(await p.$(`#adfProps [data-pv="${k}"]`))) { await p.click('#adfProps [data-padd]'); await w(300); const nk = await p.$eval('#adfProps [data-pk]:last-of-type', (e) => e.dataset.pk).catch(() => 'param1'); const ult = await p.$$eval('#adfProps [data-pk]', (es) => es[es.length - 1].dataset.pk); await p.fill(`#adfProps [data-pk="${ult}"]`, k); await p.dispatchEvent(`#adfProps [data-pk="${ult}"]`, 'change'); await w(300); void nk; } await p.fill(`#adfProps [data-pv="${k}"]`, v); await p.dispatchEvent(`#adfProps [data-pv="${k}"]`, 'change'); await w(300); };
  await nuevoDs('ds_config_tablas', 'config', '', 'tablas_a_copiar.csv');
  await tb('prev', 700);
  await c.foto('b17-config', { marcas: [['#dsOut', null]] });
  await nuevoPipe('pl_leer_config');
  await agregar('Lookup'); await campo('name', 'Leer config'); await pest('settings'); await campo('dataset', 'ds_config_tablas'); await campo('firstRowOnly', false);
  await c.foto('b17-lookup', { marcas: [['#adfProps [data-f="dataset"]', '1'], ['#adfProps [data-f="firstRowOnly"]', '2']] });
  await debug(4000);
  await p.click('#adfProps [data-io="out:0"]'); await w(500);
  await c.foto('b17-lookup-output', { marcas: [[dlg, null]] });
  await cerrar();
  await nuevoPipe('pl_validar_llegada');
  await param('fecha', '2026-11-16');
  await agregar('GetMetadata'); await campo('name', 'Listar ventas'); await pest('settings'); await campo('dataset', 'ds_raw_ventas');
  await agregar('IfCondition'); await campo('name', 'Llego el archivo'); await pest('settings');
  await campo('expresion', "@contains(string(activity('Listar ventas').output.childItems), pipeline().parameters.fecha)");
  await c.foto('b17-if', { marcas: [['#adfProps [data-f="expresion"]', '1'], ['#adfProps .adf-ramas', '2']] });
  await p.click('#adfProps [data-entrar-props="Llego el archivo|ifTrueActivities"]'); await w(600);
  await agregar('Copy'); await campo('name', 'Copiar ventas'); await pest('source'); await campo('source', 'ds_raw_ventas'); await campo('wildcard', 'ventas_@{pipeline().parameters.fecha}.csv'); await pest('sink'); await campo('sink', 'ds_bronze_ventas');
  await p.click('.adf-migas-cont [data-subir="0"]'); await w(500); await act('Llego el archivo'); await pest('settings');
  await p.click('#adfProps [data-entrar-props="Llego el archivo|ifFalseActivities"]'); await w(600);
  await agregar('Fail'); await campo('name', 'Falta el archivo'); await pest('settings');
  await campo('mensaje', "@concat('No llegó el archivo de ventas del ', pipeline().parameters.fecha)"); await campo('codigo', 'ARCHIVO_FALTANTE');
  await c.foto('b17-fail', { marcas: [['.adf-migas-cont', '1'], ['#adfProps [data-f="mensaje"]', '2'], ['#adfProps [data-f="codigo"]', '3']] });
  await p.click('.adf-migas-cont [data-subir="0"]'); await w(500);
  await debug(5000);
  await c.foto('b17-debug-falla', { marcas: [['#adfProps', null]] });
  const iErr = await p.$$eval('#adfProps [data-io^="err:"]', (bs) => bs.map((b) => b.dataset.io)); log('errores', iErr.join(','));
  if (iErr.length) { await p.click(`#adfProps [data-io="${iErr[iErr.length - 1]}"]`); await w(500); await c.foto('b17-fail-error', { marcas: [[dlg, null]] }); await cerrar(); }
  await param('fecha', '2026-11-15');
  await debug(5000);
  await c.foto('b17-debug-ok', { marcas: [['#adfProps', null]] });
  if (HASTA <= 17) return;

  // ================================================================ lección 18: dependencias y manejo de errores
  await studio('author/pipeline:pl_ingesta_diaria', 900);
  await act('Copiar ventas del dia'); await agregar('Wait'); await campo('name', 'Avisar a la guardia');
  await p.selectOption('#adfProps [data-depc="Copiar ventas del dia"]', 'Failed'); await w(500);
  await c.foto('b18-condicion', { marcas: [['#adfProps .adf-dep', null]] });
  await agregar('Fail'); await campo('name', 'Marcar como fallido'); await pest('settings'); await campo('mensaje', "@concat('La ingesta de ventas falló para ', pipeline().parameters.fecha)"); await campo('codigo', 'INGESTA_FALLIDA');
  await act('Copiar ventas del dia'); await agregar('Wait'); await campo('name', 'Registrar exito');
  await c.foto('b18-lienzo', { marcas: [['.adf-lienzo', null]] });
  await param('fecha', '2026-11-16');
  await debug(6000);
  await c.foto('b18-debug-falla', { marcas: [['.adf-lienzo', '1'], ['#adfProps', '2']] });
  await param('fecha', '2026-11-15');
  await debug(6000);
  await c.foto('b18-debug-ok', { marcas: [['.adf-lienzo', '1'], ['#adfProps', '2']] });
  if (HASTA <= 18) return;

  // ================================================================ lección 19: el notebook de Databricks desde Data Factory
  await c.ir('#/databricks', '.dbx'); await w(1500);
  await p.evaluate(() => { const D = window.DBX; const W = D.ws(); const t = new Date().toISOString(); W.items[D.HOME + '/limpiar_ventas'] = { tipo: 'notebook', lang: 'python', creado: t, modificado: t, compute: 'serverless', celdas: [
    { id: 'c1', src: '%md\n## Limpiar las ventas de un día\nLo llama el pipeline `pl_ingesta_diaria` de Data Factory con el parámetro `fecha`.' },
    { id: 'c2', src: 'dbutils.widgets.text("fecha", "2026-11-15")\nfecha = dbutils.widgets.get("fecha")\nprint(f"Limpiando las ventas del {fecha}")' },
    { id: 'c3', src: 'filas_limpias = 5  # en el proyecto real: leer bronze, quitar duplicados y escribir silver\ndbutils.notebook.exit(f"{filas_limpias} filas limpias del {fecha}")' } ] }; D.guardar(); });
  await p.evaluate((h) => { location.hash = h; }, '#/databricks/notebook/' + encodeURIComponent('/Workspace/Users/alumno@academia.dev/limpiar_ventas')); await w(1500);
  await c.foto('b19-notebook');
  await c.ir('#/azure', '#azp'); await w(500);
  await studio('manage'); await p.click('[data-g="linked"]'); await w(400); await p.click('#manC [data-a="nuevo"]'); await w(500);
  await p.selectOption('#lT', 'AzureDatabricks'); await w(300); await p.fill('#lN', 'ls_databricks'); await p.selectOption('#lW', DBW).catch(() => {}); await p.selectOption('#lCl', 'job');
  await c.foto('b19-linked', { marcas: [['#lT', '1'], ['#lW', '2'], ['#lCl', '3']] });
  await ok(700);
  await studio('author/pipeline:pl_ingesta_diaria', 900);
  await act('Copiar ventas del dia'); await agregar('DatabricksNotebook'); await campo('name', 'Limpiar ventas');
  await pest('dbw'); await campo('linked', 'ls_databricks');
  await pest('settings'); await campo('notebookPath', '/Users/alumno@academia.dev/limpiar_ventas');
  await p.click('#adfProps [data-badd]'); await w(300);
  await p.fill('#adfProps [data-bk="param1"]', 'fecha'); await p.dispatchEvent('#adfProps [data-bk="param1"]', 'change'); await w(300);
  await p.fill('#adfProps [data-bv="fecha"]', '@pipeline().parameters.fecha'); await p.dispatchEvent('#adfProps [data-bv="fecha"]', 'change'); await w(300);
  await c.foto('b19-settings', { marcas: [['#adfProps [data-f="notebookPath"]', '1'], ['#adfProps [data-bv="fecha"]', '2']] });
  await debug(45000);
  await c.foto('b19-debug', { marcas: [['.adf-lienzo', '1'], ['#adfProps', '2']] });
  const iNb = await p.$$eval('#adfProps tbody tr', (trs) => trs.findIndex((tr) => tr.textContent.includes('Limpiar ventas')));
  if (iNb >= 0) { await p.click(`#adfProps [data-io="out:${iNb}"]`); await w(500); await c.foto('b19-output', { marcas: [[dlg, null]] }); await cerrar(); } else log('no está la fila del notebook');
  if (HASTA <= 19) return;

  // ================================================================ lección 20 (proyecto): un pipeline guiado por metadatos
  await nuevoDs('ds_raw_raiz', 'raw', '');
  await nuevoDs('ds_bronze_por_fuente', 'bronze', 'por_fuente');
  await nuevoPipe('pl_ingesta_por_config');
  await agregar('Lookup'); await campo('name', 'Leer config'); await pest('settings'); await campo('dataset', 'ds_config_tablas'); await campo('firstRowOnly', false);
  await agregar('ForEach'); await campo('name', 'Por cada fuente'); await pest('settings'); await campo('items', "@activity('Leer config').output.value");
  await p.click('#adfProps [data-entrar-props="Por cada fuente|activities"]').catch(() => p.click('[data-entrar="Por cada fuente|activities"]')); await w(600);
  await agregar('IfCondition'); await campo('name', 'Esta activa'); await pest('settings'); await campo('expresion', "@equals(item().activo, '1')");
  await c.foto('b20-if', { marcas: [['.adf-migas-cont', '1'], ['#adfProps [data-f="expresion"]', '2']] });
  await p.click('#adfProps [data-entrar-props="Esta activa|ifTrueActivities"]'); await w(600);
  await agregar('Copy'); await campo('name', 'Copiar fuente'); await pest('source'); await campo('source', 'ds_raw_raiz'); await campo('wildcard', '@{item().fuente}/@{item().patron}');
  await pest('sink'); await campo('sink', 'ds_bronze_por_fuente');
  await pest('source');
  await c.foto('b20-copy', { marcas: [['.adf-migas-cont', '1'], ['#adfProps [data-f="wildcard"]', '2']] });
  await p.click('.adf-migas-cont [data-subir="0"]'); await w(600);
  await c.foto('b20-lienzo', { marcas: [['.adf-lienzo', null]] });
  await debug(9000);
  await c.foto('b20-debug', { marcas: [['#adfProps', null]] });
  await ira(`recurso/storage/${ST}/contenedores/bronze`, 800);
  await c.foto('b20-bronze', { marcas: [['#azRC .az-tabla', null]] });
  if (HASTA <= 20) return;

  // ================================================================ Nivel 6 · lección 21: Git, CI/CD y plantillas ARM
  await studio('manage'); await p.click('[data-g="git"]'); await w(400);
  await c.foto('b21-git', { marcas: [['#manC', null]] });
  await p.click('[data-g="arm"]'); await w(400);
  await c.foto('b21-arm', { marcas: [['#manC .adf-tb', null]] });
  await p.click('#manC [data-a="importar"]'); await w(1500);
  await c.foto('b21-importar', { marcas: [['.az-pag .az-dim', '1'], ['[data-editar]', '2']] });
  if (HASTA <= 21) return;

  // ================================================================ lección 22: integration runtimes, seguridad y costos
  await studio('manage'); await p.click('[data-g="ir"]'); await w(400);
  await c.foto('b22-ir', { marcas: [['#manC .adf-tabla', null]] });
  await ira('costos', 900);
  await c.foto('b22-costos', { marcas: [['.az-barras', null]] });
  if (HASTA <= 22) return;

  // ================================================================ lección 23: de la práctica al Data Factory real
  await studio('home', 900);
  await c.foto('b23-home', { marcas: [['.adf-pasos', null]] });
  if (HASTA <= 23) return;

  // ================================================================ lección 24 (proyecto final): el pipeline de ventas en producción
  await studio('author/pipeline:pl_ingesta_diaria', 900); await vacio();
  await c.foto('b24-lienzo', { marcas: [['.adf-lienzo', null]] });
  await p.click('.adf-pub'); await w(500);
  await c.foto('b24-publicar', { marcas: [[dlg, null]] });
  await ok(900);
  await studio('monitor'); await p.click('[data-fire="tr_diario_0600"]'); await w(45000);
  await studio('monitor', 700);
  await c.foto('b24-monitor', { marcas: [['.adf-runs', null]] });
  await p.click('.adf-runs [data-run]'); await w(600);
  await c.foto('b24-run', { marcas: [['.adf-mon-cab', '1'], ['.adf-mon .adf-tabla', '2']] });
}
