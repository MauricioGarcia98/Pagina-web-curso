// Guion de capturas del curso del portal de Azure (assets/img/guias/azure/)
// Historia: el equipo de datos de Tienda Andina arma su plataforma en Azure, primero en dev y al final en prod.
export default async function (c) {
  const p = c.page;
  const w = (ms) => c.espera(ms);
  const log = (...a) => console.log('   [azure]', ...a);
  const HASTA = Number(process.env.AZ_HASTA || 99); // para probar el guion por partes
  const ir = async (r, ms = 700) => { await p.evaluate((h) => { location.hash = h; }, '#/azure/' + r); await w(ms); };
  const capa = '#azCapa .az-panel';
  const panelOk = async (ms = 600) => { await p.click(`${capa} [data-ok]`); await w(ms); };
  const panelX = async () => { await p.evaluate(() => { const c = document.querySelector('#azCapa'); if (c) { c.hidden = true; c.innerHTML = ''; } }); await w(150); };
  const err = async () => p.evaluate(() => { const e = document.querySelector('#azCapa .az-err'); return e && !e.hidden ? e.textContent : ''; });
  const cerrarFly = async () => { await p.evaluate(() => { const f = document.querySelector('#azNot'); if (f) f.hidden = true; const m = document.querySelector('#azMenu'); if (m) m.hidden = true; const pop = document.getElementById('azMenuPop'); if (pop) pop.remove(); }); await w(150); };
  // asistente de creación: valores por id de campo (#w_xxx) y pestañas por nombre interno
  const wTab = async (t) => { await p.click(`.az-wtabs [data-t="${t}"]`); await w(350); };
  const wTxt = async (k, v) => { await p.fill(`#w_${k}`, v); await w(120); };
  const wSel = async (k, v) => { await p.selectOption(`#w_${k}`, v); await w(250); };
  const wRadio = async (k, v) => { await p.check(`input[name="w_${k}"][value="${v}"]`); await w(250); };
  const wChk = async (k, on) => { const el = p.locator(`.az-wcuerpo input[type=checkbox][data-k="${k}"]`); if ((await el.isChecked()) !== on) await el.click(); await w(250); };
  const wTags = async (pares) => { for (const [a, b] of pares) { const i = await p.locator('.az-tags tbody tr').count() - 1; await p.fill(`[data-tag="${i}"][data-p="0"]`, a); await p.dispatchEvent(`[data-tag="${i}"][data-p="0"]`, 'change'); await w(200); await p.fill(`[data-tag="${i}"][data-p="1"]`, b); await p.dispatchEvent(`[data-tag="${i}"][data-p="1"]`, 'change'); await w(200); } };
  const wRevisar = async () => { await p.click('#wRev'); await w(1100); };
  const wCrear = async (ms = 3000) => { await p.click('#wCrear'); await w(ms); };
  const estado = () => p.evaluate(() => window.CloudSim.az());
  const marcaTexto = async (sel, texto) => p.evaluate(([s, t]) => { document.querySelectorAll('[data-cap]').forEach((e) => e.removeAttribute('data-cap')); const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim().startsWith(t)); if (el) el.setAttribute('data-cap', '1'); return !!el; }, [sel, texto]);
  const marcaTexto2 = async (sel, texto, k) => p.evaluate(([s, t, k]) => { const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim().startsWith(t)); if (el) el.setAttribute('data-cap' + k, '1'); return !!el; }, [sel, texto, k]);
  const archivo = (nombre, texto) => ({ name: nombre, mimeType: 'text/csv', buffer: Buffer.from(texto) });
  const RG = 'rg-tiendaandina-dev', ST = 'sttiendaandinadev', KV = 'kv-tiendaandina-dev', DBW = 'dbw-tiendaandina-dev', ADF = 'adf-tiendaandina-dev';

  await c.ir('#/azure', '#azp'); await w(1200);

  // ================================================================ Nivel 1 · lección 1: la pantalla del portal
  await c.foto('b01-inicio', { marcas: [['.az-top', '1'], ['.az-servicios', '2'], ['.az-nav', '3'], ['.az-tools', '4']] });
  await p.click('#azMenuB'); await w(400);
  await c.foto('b01-menu', { marcas: [['#azMenu .az-menu-in', null]] });
  await cerrarFly();
  await p.click('#azQ'); await p.fill('#azQ', 'stor'); await w(500);
  await c.foto('b01-buscar', { marcas: [['#azQR', null]] });
  await p.fill('#azQ', ''); await p.evaluate(() => document.activeElement.blur()); await w(300);
  await p.click('#azCuenta'); await w(350);
  await c.foto('b01-cuenta', { marcas: [['#azMenuPop', null]] });
  await cerrarFly();
  await p.click('#azCfgB'); await w(400);
  await c.foto('b01-ajustes', { marcas: [['#azNot', null]] });
  await cerrarFly();
  await ir('servicios');
  await c.foto('b01-todos-servicios');

  // ================================================================ lección 2: suscripciones y grupos de recursos
  await ir('suscripciones');
  await c.foto('b02-suscripciones', { marcas: [['.az-tabla', null]] });
  await p.click('.az-tabla tbody tr:first-child a'); await w(600);
  await c.foto('b02-suscripcion', { marcas: [['.az-ess', null], ['.az-rmenu', null]] });
  await ir('grupos');
  await c.foto('b02-grupos-vacio', { marcas: [['.az-cmd button[data-c="crear"]', '1']] });
  await ir('crear/grupo', 900);
  await wTxt('name', 'rg tienda andina.');
  await c.foto('b02-grupo-error', { marcas: [['#w_name', null]] });
  await wTxt('name', RG); await wSel('location', 'eastus2');
  await c.foto('b02-grupo-basics', { marcas: [['#w_sub', '1'], ['#w_name', '2'], ['#w_location', '3']] });
  await wTab('tags');
  await wTags([['proyecto', 'tienda-andina'], ['entorno', 'dev'], ['owner', 'equipo-datos']]);
  await c.foto('b02-grupo-tags', { marcas: [['.az-tags', null]] });
  await wRevisar();
  await c.foto('b02-grupo-revisar', { marcas: [['.az-banner', '1'], ['#wCrear', '2']] });
  await wCrear(2800);
  await p.click('#azNotB'); await w(400);
  await c.foto('b02-notificaciones', { marcas: [['#azNot', null]] });
  await cerrarFly();
  await ir('grupo/' + RG, 800);
  await c.foto('b02-grupo-overview', { marcas: [['.az-ess', '1'], ['.az-rmenu', '2']] });
  if (HASTA <= 2) return;

  // ================================================================ lección 3: la primera cuenta de almacenamiento
  await ir('crear', 800);
  await c.foto('b03-crear-recurso', { marcas: [['.az-market', null]] });
  await ir('crear/storage', 900);
  await wSel('rg', RG); await wTxt('name', 'datos');
  await c.foto('b03-storage-nombre-tomado', { marcas: [['#w_name', null]] });
  await wTxt('name', 'StTiendaAndina');
  await c.foto('b03-storage-nombre-mayus', { marcas: [['#w_name', null]] });
  await wTxt('name', ST); await wSel('location', 'eastus2');
  await wSel('redundancy', 'LRS').catch((e) => log('redundancy', e.message.slice(0, 60)));
  await c.foto('b03-storage-basics', { marcas: [['#w_rg', '1'], ['#w_name', '2'], ['#w_location', '3'], ['#w_performance', '4'], ['#w_redundancy', '5']] });
  await wTab('advanced');
  await wChk('hns', true);
  await c.foto('b03-storage-advanced', { marcas: [['.az-wcuerpo label.az-check:has(input[data-k="hns"])', '1'], ['.az-wcuerpo .az-fila:has(input[name="w_tier"])', '2']] });
  await wTab('networking');
  await c.foto('b03-storage-red');
  await wTab('dataprot');
  await c.foto('b03-storage-proteccion');
  await wTab('tags');
  await wTags([['proyecto', 'tienda-andina'], ['entorno', 'dev']]);
  await wRevisar();
  await c.foto('b03-storage-revisar', { marcas: [['.az-banner', '1'], ['#wPlantilla', '2']] });
  await p.click('#wPlantilla').catch((e) => log('plantilla', e.message.slice(0, 60))); await w(500);
  await c.foto('b03-plantilla', { marcas: [[capa, null]] });
  await panelX();
  await p.click('#wCrear'); await w(500);
  await c.foto('b03-despliegue-progreso', { marcas: [['.az-dep', null]] });
  await w(2600);
  await c.foto('b03-despliegue-ok', { marcas: [['.az-dep', '1'], ['.az-dep ~ a.az-btn, .az-pag a.az-btn.primario', '2']] });
  await ir(`recurso/storage/${ST}`, 800);
  await c.foto('b03-storage-overview', { marcas: [['.az-ess', '1'], ['.az-props', '2'], ['.az-rmenu', '3']] });
  if (HASTA <= 3) return;

  // ================================================================ lección 4 (proyecto): el entorno dev ordenado
  await ir('', 700);
  await c.foto('b04-recientes', { marcas: [['.az-pag .az-tabla', null]] });
  await ir('recursos', 700);
  await p.fill('#fN', 'tienda'); await w(400);
  await c.foto('b04-todos-recursos', { marcas: [['#fN', '1'], ['#fT', '2'], ['#fG', '3']] });
  await ir(`grupo/${RG}/diagnostico`, 700);
  await c.foto('b04-visualizador', { marcas: [['.az-viz', null]] });
  await ir(`recurso/storage/${ST}`, 700);
  await p.click('[data-json]'); await w(500);
  await c.foto('b04-json', { marcas: [[capa, null]] });
  await panelX();
  // la pista del proyecto 1: la cuenta también lleva owner
  await ir(`recurso/storage/${ST}/tags`, 700);
  await p.evaluate(() => { const tr = [...document.querySelectorAll('#azRC .az-tags tbody tr')].pop(); const [a, b] = tr.querySelectorAll('input'); a.value = 'owner'; b.value = 'equipo-datos'; });
  await p.click('#tGuardar'); await w(500);
  if (HASTA <= 4) return;

  // ================================================================ lección 5: contenedores y blobs
  await ir(`recurso/storage/${ST}/contenedores`, 700);
  await c.foto('b05-contenedores-vacio', { marcas: [['#cAdd', '1']] });
  await p.click('#cAdd'); await w(400); await p.fill('#cN', 'Bronze_Raw'); await panelOk(400);
  await c.foto('b05-contenedor-invalido', { marcas: [['#azCapa .az-err', null]] });
  await panelX(); await p.click('#cAdd'); await w(400); await p.fill('#cN', 'bronze');
  await c.foto('b05-nuevo-contenedor', { marcas: [['#cN', '1'], ['#cA', '2']] });
  await panelOk(600);
  for (const k of ['silver', 'gold']) { await p.click('#cAdd'); await w(300); await p.fill('#cN', k); await panelOk(500); }
  await c.foto('b05-contenedores', { marcas: [['#azRC .az-tabla', null]] });
  await ir(`recurso/storage/${ST}/contenedores/bronze`, 700);
  await c.foto('b05-contenedor-vacio', { marcas: [['#bUp', '1'], ['.az-auth', '2']] });
  await p.click('#bUp'); await w(400);
  await p.setInputFiles('#uF', [archivo('pedidos.csv', 'pedido_id,cliente_id,fecha_pedido,canal,estado\n1,101,2026-11-01,web,entregado\n2,205,2026-11-01,app,enviado\n3,318,2026-11-02,tienda,entregado\n')]);
  await p.fill('#uD', 'pedidos/2026/11');
  await c.foto('b05-subir', { marcas: [['#uF', '1'], ['#uD', '2']] });
  await panelOk(800);
  await p.click('#bUp'); await w(400);
  await p.setInputFiles('#uF', [archivo('clientes.csv', 'cliente_id,nombre,pais,segmento\n101,Ana,Perú,Consumidor\n205,Luis,Chile,Pyme\n318,Sofía,México,Corporativo\n')]);
  await p.fill('#uD', 'clientes'); await panelOk(800);
  await c.foto('b05-blobs', { marcas: [['#azRC .az-tabla', null]] });
  await p.click('#bAuth'); await w(600);
  await c.foto('b05-entra-sin-permiso', { marcas: [['.az-auth', '1'], ['#azRC .az-banner.error', '2']] });
  await p.click('#bAuth'); await w(500);
  if (HASTA <= 5) return;

  // ================================================================ lección 6: ADLS Gen2 y las capas del lago
  await ir(`recurso/storage/${ST}`, 700);
  await marcaTexto('#azRC h4', 'Endpoints');
  await c.foto('b06-endpoints', { marcas: [['#azRC h4[data-cap] + table', null], ['#azRC .az-ess', null]] });
  await ir(`recurso/storage/${ST}/navegador`, 700);
  await c.foto('b06-navegador', { marcas: [['.az-rmenu a.on', '1'], ['#azRC .az-tabla', '2']] });
  if (HASTA <= 6) return;

  // ================================================================ lección 7: etiquetas, actividad y costos
  await ir(`recurso/storage/${ST}/tags`, 700);
  await c.foto('b07-etiquetas', { marcas: [['#azRC .az-tags', null]] });
  await ir('actividad', 700);
  await c.foto('b07-actividad', { marcas: [['.az-pag .az-tabla', null]] });
  await ir('costos', 700);
  await c.foto('b07-costos', { marcas: [['.az-kpis', '1'], ['.az-barras', '2']] });
  await p.click('#bAdd'); await w(400);
  await p.fill('#pN', 'presupuesto-datos-dev'); await p.fill('#pM', '20');
  await c.foto('b07-presupuesto', { marcas: [['#pM', '1'], ['#pU', '2'], ['#pC', '3']] });
  await panelOk(600);
  await marcaTexto('.az-pag h3', 'Budgets');
  await c.foto('b07-presupuestos', { marcas: [['[data-cap]', '1'], ['.az-pag h3[data-cap] + table', '2']] });
  await ir(`grupo/${RG}/costos`, 700);
  await c.foto('b07-costos-grupo', { marcas: [['.az-rmenu a.on', '1'], ['#azRC .az-tabla', '2']] });
  if (HASTA <= 7) return;

  // ================================================================ lección 8 (proyecto): el lago con capas
  await ir(`recurso/storage/${ST}/contenedores/bronze`, 700);
  await p.click('#bUp'); await w(400);
  await p.setInputFiles('#uF', [archivo('productos.csv', 'producto_id,nombre,categoria,precio\n1,Café de altura 500 g,Almacén,12.5\n2,Yerba mate 1 kg,Almacén,6.9\n')]);
  await p.fill('#uD', 'productos'); await panelOk(800);
  await c.foto('b08-bronze', { marcas: [['#azRC .az-tabla', null]] });
  await ir(`grupo/${RG}/tags`, 700);
  await c.foto('b08-etiquetas-grupo', { marcas: [['#azRC .az-tags', null]] });
  if (HASTA <= 8) return;

  // ================================================================ Nivel 3 · lección 9: Cloud Shell y la CLI az
  const shell = async (cmd, ms = 900) => { await p.click('#shTerm .term-input'); await p.keyboard.type(cmd); await p.keyboard.press('Enter'); await w(ms); };
  await ir('grupos', 600);
  await p.click('#azShellB'); await w(1500);
  await c.foto('b09-shell', { marcas: [['#azShellB', '1'], ['#azShell', '2']] });
  await shell('az account show -o table');
  await shell('az group list -o table');
  await shell(`az storage account list -g ${RG} --query "[].{nombre:name, sku:sku.name, hns:isHnsEnabled}" -o table`);
  await p.click('#shMax'); await w(400);
  await c.foto('b09-shell-consultas', { marcas: [['#shMax', '1']] });
  await p.click('#shMax'); await w(300);
  await shell('clear', 300);
  await shell(`az storage blob list --account-name ${ST} -c bronze --auth-mode login --query "[].name" -o tsv`);
  await shell('az group create -n rg-tiendaandina-sandbox -l eastus2 --tags entorno=sandbox', 1200);
  await c.foto('b09-shell-crear', { marcas: [['#azShell', '1'], ['.az-pag .az-tabla', '2']] });
  await shell('az group delete -n rg-tiendaandina-sandbox --yes', 1500);
  await shell('az group list --query "[].name" -o tsv', 900);
  await c.foto('b09-shell-borrar', { marcas: [['#azShell', null]] });
  await p.click('#shX'); await w(400);
  if (HASTA <= 9) return;

  // ================================================================ lección 10: Entra ID y control de acceso (RBAC)
  await ir('entra', 700);
  await c.foto('b10-entra', { marcas: [['.az-pest', '1'], ['.az-pag .az-kv', '2']] });
  await ir('entra/usuarios', 600);
  await p.click('#eAdd'); await w(400); await p.fill('#uU', 'maria.lopez'); await p.fill('#uN', 'María López');
  await c.foto('b10-nuevo-usuario', { marcas: [['#uU', '1'], ['#uN', '2']] });
  await panelOk(600);
  await c.foto('b10-usuarios', { marcas: [['.az-pag .az-tabla', null]] });
  await ir('entra/grupos', 600);
  await p.click('#eAdd'); await w(400); await p.fill('#gN', 'analistas-datos'); await p.fill('#gD', 'Analistas que leen la capa gold'); await panelOk(600);
  await p.click('[data-mie]:last-of-type').catch(() => {}); await w(300);
  await p.evaluate(() => { const b = [...document.querySelectorAll('[data-mie]')].pop(); if (b && !document.querySelector('#azCapa .az-panel')) b.click(); }); await w(400);
  await p.evaluate(() => { const ch = [...document.querySelectorAll('#azCapa .az-panel input[type=checkbox]')].find((x) => x.value.startsWith('maria.lopez')); if (ch && !ch.checked) ch.click(); }); await w(200);
  await c.foto('b10-miembros', { marcas: [[capa, null]] });
  await panelOk(600);
  await c.foto('b10-grupos', { marcas: [['.az-pag .az-tabla', null]] });
  await ir(`recurso/storage/${ST}/iam`, 700);
  await c.foto('b10-iam', { marcas: [['#iAdd', '1'], ['#azRC .az-pest', '2'], ['#azRC .az-tabla', '3']] });
  const asignar = async (rol, quien, foto) => {
    await p.click('#iAdd'); await w(500);
    await p.fill('#rQ', rol.split(' ').slice(0, 3).join(' ')); await w(300);
    await p.check(`#rL input[value="${rol}"]`); await w(200);
    await p.selectOption('#rP', quien); await w(200);
    if (foto) await c.foto(foto, { marcas: [['#rQ', '1'], [`#rL label.az-rol:has(input[value="${rol}"])`, '2'], ['#rP', '3']] });
    await panelOk(700); const e = await err(); if (e) { log('rol', rol, e); await panelX(); }
  };
  await asignar('Storage Blob Data Reader', 'analistas-datos', 'b10-asignar-rol');
  await asignar('Storage Blob Data Contributor', 'alumno@academia.dev');
  await c.foto('b10-asignaciones', { marcas: [['#azRC .az-tabla', null]] });
  await p.click('#azRC .az-pest [data-p="check"]'); await w(400);
  await p.selectOption('#iChk', 'analistas-datos').catch((e) => log('chk', e.message.slice(0, 80))); await p.dispatchEvent('#iChk', 'change'); await w(400);
  await c.foto('b10-check-access', { marcas: [['#iChk', '1'], ['#iRes', '2']] });
  await ir(`recurso/storage/${ST}/contenedores/bronze`, 700);
  await p.click('#bAuth'); await w(600);
  await c.foto('b10-entra-con-rol', { marcas: [['.az-auth', '1'], ['#azRC .az-tabla', '2']] });
  await p.click('#bAuth'); await w(400);
  if (HASTA <= 10) return;

  // ================================================================ lección 11: Key Vault y secretos
  await ir('crear/kv', 900);
  await wSel('rg', RG); await wTxt('name', KV); await wSel('location', 'eastus2');
  await c.foto('b11-kv-basics', { marcas: [['#w_name', '1'], ['#w_sku', '2'], ['#w_retencion', '3']] });
  await wTab('access');
  await c.foto('b11-kv-acceso', { marcas: [['.az-wcuerpo .az-fila', null]] });
  await wRevisar(); await wCrear(2800);
  await ir(`recurso/kv/${KV}`, 700);
  await c.foto('b11-kv-overview', { marcas: [['.az-ess', '1'], ['.az-rmenu', '2']] });
  await ir(`recurso/kv/${KV}/secretos`, 700);
  await c.foto('b11-kv-sin-rol', { marcas: [['#azRC .az-banner.error', null]] });
  await ir(`recurso/kv/${KV}/iam`, 700);
  await asignar('Key Vault Secrets Officer', 'alumno@academia.dev', 'b11-kv-rol');
  await ir(`recurso/kv/${KV}/secretos`, 700);
  await p.click('#sAdd'); await w(400);
  await p.fill('#sN', 'sql-ventas-password'); await p.fill('#sV', 'Practica-NoEsReal-2026!'); await p.fill('#sT', 'password');
  await c.foto('b11-kv-crear-secreto', { marcas: [['#sN', '1'], ['#sV', '2'], ['#sE', '3']] });
  await panelOk(700);
  await c.foto('b11-kv-secretos', { marcas: [['#azRC .az-tabla', null]] });
  await p.click('[data-ver]'); await w(500);
  await c.foto('b11-kv-secreto', { marcas: [[capa, null]] });
  await panelX();
  if (HASTA <= 11) return;

  // ================================================================ lección 12 (proyecto): un programa que entra sin contraseñas en el código
  await ir('entra/apps', 600);
  await p.click('#eAdd'); await w(400); await p.fill('#aN', 'sp-ingesta-ventas');
  await c.foto('b12-registrar-app', { marcas: [['#aN', '1'], ['#aT', '2']] });
  await panelOk(900);
  if (!(await p.$('#sAdd'))) { await p.click('.az-pag .az-tabla a[href*="/apps/"]'); await w(600); }
  await p.click('#sAdd'); await w(400); await p.selectOption('#sE', '6'); await panelOk(700);
  const valorApp = await p.evaluate(() => { const b = document.querySelector('.az-banner.aviso code'); return b ? b.textContent : ''; });
  await c.foto('b12-secreto-app', { marcas: [['.az-pag .az-kv', '1'], ['.az-banner.aviso', '2'], ['.az-pag .az-tabla', '3']] });
  await ir(`recurso/kv/${KV}/secretos`, 700);
  await p.click('#sAdd'); await w(400);
  await p.fill('#sN', 'sp-ingesta-ventas-secret'); await p.fill('#sV', valorApp || 'valor-de-practica'); await panelOk(700);
  await c.foto('b12-kv-secretos', { marcas: [['#azRC .az-tabla', null]] });
  await ir(`recurso/storage/${ST}/iam`, 700);
  await asignar('Storage Blob Data Contributor', 'sp-ingesta-ventas');
  await c.foto('b12-iam-app', { marcas: [['#azRC .az-tabla', null]] });
  if (HASTA <= 12) return;

  // ================================================================ Nivel 4 · lección 13: el workspace de Azure Databricks
  await ir('crear/dbw', 900);
  await wSel('rg', RG); await wTxt('name', DBW); await wSel('location', 'eastus2');
  await c.foto('b13-dbw-basics', { marcas: [['#w_name', '1'], ['#w_sku', '2'], ['#w_mrg', '3']] });
  await wTab('networking');
  await c.foto('b13-dbw-red', { marcas: [['.az-wcuerpo', null]] });
  await wRevisar();
  await c.foto('b13-dbw-revisar', { marcas: [['.az-banner', '1'], ['.az-wcuerpo .az-kv', '2']] });
  await wCrear(5600);
  await ir(`recurso/dbw/${DBW}`, 800);
  await c.foto('b13-dbw-overview', { marcas: [['.az-ess', '1'], ['#dbLaunch', '2']] });
  const mrg = (await estado()).dbw[DBW].rgAdministrado;
  await ir(`grupo/${encodeURIComponent(mrg)}`, 800);
  await c.foto('b13-rg-administrado', { marcas: [['#azRC .az-banner.aviso', null]] });
  await p.click('.az-cmd [data-c="borrarRg"]'); await w(700);
  await p.click('#azNotB'); await w(400);
  await c.foto('b13-rg-administrado-error', { marcas: [['#azNot .az-not.error', null]] });
  await cerrarFly();
  if (HASTA <= 13) return;

  // ================================================================ lección 14: Data Factory desde el portal
  await ir('crear/adf', 900);
  await wSel('rg', RG); await wTxt('name', ADF); await wSel('location', 'eastus2');
  await c.foto('b14-adf-basics', { marcas: [['#w_name', '1'], ['#w_version', '2']] });
  await wTab('git');
  await c.foto('b14-adf-git', { marcas: [['.az-wcuerpo', null]] });
  await wRevisar(); await wCrear(2800);
  await ir(`recurso/adf/${ADF}`, 800);
  await c.foto('b14-adf-overview', { marcas: [['.az-ess', '1'], ['#adfStudio', '2']] });
  await ir(`recurso/adf/${ADF}/identidad`, 700);
  await c.foto('b14-adf-identidad', { marcas: [['#azRC', null]] });
  await ir(`recurso/storage/${ST}/iam`, 700);
  await p.click('#iAdd'); await w(500); await p.fill('#rQ', 'Storage Blob Data'); await w(300);
  await p.check('#rL input[value="Storage Blob Data Contributor"]'); await p.selectOption('#rM', { index: 1 }).catch(() => {}); await p.selectOption('#rP', ADF); await w(200);
  await c.foto('b14-adf-rol', { marcas: [['#rM', '1'], ['#rP', '2']] });
  await panelOk(700);
  await ir(`recurso/adf/${ADF}`, 700);
  await p.click('#adfStudio'); await w(2200);
  await c.foto('b14-adf-studio');
  if (HASTA <= 14) return;

  // ================================================================ lección 15: Azure SQL Database
  await ir('sql', 700);
  await c.foto('b15-sql-vacio', { marcas: [['#qAdd', '1']] });
  await p.click('#qAdd'); await w(500);
  await p.selectOption('#qG', RG); await p.fill('#qD', 'ventas'); await p.fill('#qS', 'sql-tiendaandina-dev'); await p.selectOption('#qL', 'eastus2'); await p.selectOption('#qM', '1');
  await c.foto('b15-sql-crear', { marcas: [['#qD', '1'], ['#qS', '2'], ['#qA', '3'], ['#qC', '4'], ['#qM', '5']] });
  await panelOk(3200);
  const e15 = await err(); if (e15) log('sql', e15);
  await ir('sql/sql-tiendaandina-dev/ventas', 900);
  await c.foto('b15-sql-overview', { marcas: [['.az-pest', '1'], ['.az-banner.aviso', '2']] });
  await ir('sql/sql-tiendaandina-dev/ventas/consulta', 900);
  await c.foto('b15-sql-firewall', { marcas: [['.az-banner.error', '1'], ['#qIp', '2']] });
  await ir('sql/sql-tiendaandina-dev/ventas/red', 800);
  await p.click('#fIp'); await w(600);
  await c.foto('b15-sql-red', { marcas: [['#azMain .az-tabla', '1'], ['#fAz', '2']] });
  await ir('sql/sql-tiendaandina-dev/ventas/consulta', 1500);
  await p.fill('#qSql', 'SELECT canal, COUNT(*) AS pedidos\nFROM pedidos\nGROUP BY canal\nORDER BY pedidos DESC;');
  await p.click('#qRun'); await w(2500);
  await c.foto('b15-sql-editor', { marcas: [['#qObj', '1'], ['#qSql', '2'], ['#qRes', '3']] });
  await ir('sql/sql-tiendaandina-dev/ventas/conexion', 800);
  await c.foto('b15-sql-conexion', { marcas: [['#azMain pre.az-code', null]] });
  if (HASTA <= 15) return;

  // ================================================================ lección 16 (proyecto): la plataforma dev completa
  await ir(`grupo/${RG}`, 800);
  await c.foto('b16-grupo', { marcas: [['#azRC .az-tabla', null]] });
  await ir(`grupo/${RG}/diagnostico`, 700);
  await c.foto('b16-visualizador', { marcas: [['.az-viz', null]] });
  await ir(`recurso/storage/${ST}/iam`, 700);
  await c.foto('b16-iam-storage', { marcas: [['#azRC .az-tabla', null]] });
  await ir(`grupo/${RG}/despliegues`, 700);
  await c.foto('b16-despliegues', { marcas: [['#azRC .az-tabla', null]] });
  if (HASTA <= 16) return;

  // ================================================================ Nivel 5 · lección 17: red y formas de acceso al storage
  await ir(`recurso/storage/${ST}/red`, 700);
  await p.check('input[name="rd"][value="selected"]'); await w(200);
  await c.foto('b17-red', { marcas: [['#azRC', null]] });
  await p.check('input[name="rd"][value="all"]'); await w(200);
  await ir(`recurso/storage/${ST}/claves`, 700);
  await p.click('#kShow'); await w(400);
  await c.foto('b17-claves', { marcas: [['#kShow', '1'], ['[data-rot]', '2']] });
  await ir(`recurso/storage/${ST}/sas`, 700);
  await c.foto('b17-sas', { marcas: [['.az-sas', '1'], ['#sE', '2'], ['#sP', '3']] });
  await p.click('#sGen'); await w(500);
  await c.foto('b17-sas-generada', { marcas: [['#sRes', null]] });
  if (HASTA <= 17) return;

  // ================================================================ lección 18: protección de datos y ciclo de vida
  await ir(`recurso/storage/${ST}/proteccion`, 700);
  await p.fill('#pD', '14'); await p.check('#pV'); await w(200);
  await c.foto('b18-proteccion', { marcas: [['#pD', '1'], ['#pV', '2'], ['#pG', '3']] });
  await p.click('#pG'); await w(600);
  await ir(`recurso/storage/${ST}/ciclo`, 700);
  await c.foto('b18-ciclo-vacio', { marcas: [['#lcAdd', '1']] });
  await p.click('#lcAdd'); await w(400);
  await p.fill('#lN', 'bronze-a-cool'); await p.fill('#lP', 'bronze/'); await p.fill('#lC', '30'); await p.fill('#lA', '180'); await p.fill('#lB', '730');
  await c.foto('b18-ciclo-regla', { marcas: [['#lP', '1'], ['#lC', '2'], ['#lA', '3'], ['#lB', '4']] });
  await panelOk(600);
  await c.foto('b18-ciclo', { marcas: [['#azRC .az-tabla', null]] });
  await ir(`recurso/storage/${ST}/contenedores/bronze`, 700);
  await p.click('tr[data-b] .az-sel'); await p.click('#bDel'); await w(500);
  await c.foto('b18-blob-borrado', { marcas: [['#azRC .az-tabla', null]] });
  await ir(`recurso/storage/${ST}/config`, 700);
  await c.foto('b18-config', { marcas: [['#azRC .az-kv', null]] });
  if (HASTA <= 18) return;

  // ================================================================ lección 19: bloqueos y Azure Monitor
  await ir(`grupo/${RG}/locks`, 700);
  await p.click('#lAdd'); await w(400); await p.fill('#lN', 'no-borrar-dev'); await p.selectOption('#lT', 'CanNotDelete'); await p.fill('#lO', 'Protege la plataforma dev de borrados accidentales');
  await c.foto('b19-lock-agregar', { marcas: [['#lN', '1'], ['#lT', '2'], ['#lO', '3']] });
  await panelOk(600);
  await c.foto('b19-locks', { marcas: [['#azRC .az-tabla', null]] });
  await ir(`recurso/kv/${KV}`, 700);
  await p.click('.az-cmd [data-c="borrar"]'); await w(400); await panelOk(800);
  await p.click('#azNotB'); await w(400);
  await c.foto('b19-borrar-bloqueado', { marcas: [['#azNot .az-not.error', null]] });
  await cerrarFly();
  await ir('monitor', 700);
  await c.foto('b19-monitor', { marcas: [['.az-pest', '1'], ['.az-pag .az-tabla', '2']] });
  await ir('monitor/metricas', 700);
  await p.selectOption('#mR', `storage/${ST}`); await w(500); await p.selectOption('#mM', 'UsedCapacity'); await w(500); await p.selectOption('#mA', 'Maximum'); await w(600);
  await c.foto('b19-metricas', { marcas: [['.az-fila-sel', '1'], ['#mAlerta', '2']] });
  await ir('monitor/grupos', 700);
  await p.click('#gAdd'); await w(400); await p.fill('#gN', 'ag-guardia-datos'); await p.fill('#gC', 'guardia'); await p.fill('#gE', 'guardia@tiendaandina.example');
  await c.foto('b19-grupo-acciones', { marcas: [['#gN', '1'], ['#gC', '2'], ['#gE', '3']] });
  await panelOk(600);
  await ir('monitor/alertas', 700);
  await p.click('#rAdd'); await w(500);
  await p.selectOption('#rR', `adf/${ADF}`); await w(300); await p.selectOption('#rM', 'PipelineFailedRuns'); await p.selectOption('#rA', 'Sum');
  await p.selectOption('#rO', { index: 0 }).catch(() => {});
  const ops = await p.$$eval('#rO option', (o) => o.map((x) => x.value + ':' + x.textContent)); log('ops', ops.join(' | '));
  await p.selectOption('#rO', { label: 'Greater than' }).catch(() => {});
  await p.fill('#rU', '0'); await p.selectOption('#rS', '1').catch(() => {}); await p.selectOption('#rG', 'ag-guardia-datos'); await p.fill('#rN', 'adf-pipeline-fallido');
  await c.foto('b19-alerta-crear', { marcas: [['#rR', '1'], ['#rM', '2'], ['#rU', '3'], ['#rG', '4']] });
  await panelOk(600);
  await p.click('#rAdd'); await w(500);
  await p.selectOption('#rR', `storage/${ST}`); await w(300); await p.selectOption('#rM', 'UsedCapacity'); await p.selectOption('#rA', 'Maximum');
  await p.selectOption('#rO', { label: 'Greater than' }).catch(() => {}); await p.fill('#rU', '100'); await p.selectOption('#rG', 'ag-guardia-datos'); await p.fill('#rN', 'lago-capacidad'); await panelOk(600);
  await p.click('#rEval'); await w(700);
  await c.foto('b19-alertas', { marcas: [['.az-pag .az-tabla', '1'], ['.az-pag h3 + .az-tabla ~ h3 + .az-tabla, .az-pag .az-tabla:last-of-type', '2']] });
  if (HASTA <= 19) return;

  // ================================================================ lección 20: Log Analytics (logs, KQL y alertas de logs)
  await ir('crear/law', 700);
  await p.fill('#lwN', 'log-tiendaandina-dev'); await p.click('#lwOk'); await w(900);
  const diag = async (k, n, cats) => { await ir(`recurso/${k}/${n}/diagnosticos`, 700); await p.click('#dAdd'); await w(400); for (const x of await p.$$('[data-cat]')) { const c2 = await x.getAttribute('data-cat'); if (cats.includes(c2) !== (await x.isChecked())) await x.click(); } await panelOk(600); };
  await diag('adf', ADF, ['PipelineRuns', 'ActivityRuns']); await diag('storage', ST, ['StorageWrite', 'StorageDelete']); await diag('kv', KV, ['AuditEvent']);
  await p.evaluate((f) => { window.ADFStudio.importarObjeto(f, 'pipelines', 'pl_prueba_logs', { activities: [{ name: 'Esperar', type: 'Wait', typeProperties: { waitTimeInSeconds: 1 } }, { name: 'Validar_archivo', type: 'Fail', dependsOn: [{ activity: 'Esperar', dependencyConditions: ['Succeeded'] }], typeProperties: { message: 'El archivo de pedidos llegó vacío', errorCode: '4001' } }] }); window.ADFStudio.importarObjeto(f, 'pipelines', 'pl_ingesta_pedidos', { activities: [{ name: 'Esperar', type: 'Wait', typeProperties: { waitTimeInSeconds: 1 } }] }); window.CloudSim.save(); }, ADF);
  await p.evaluate(async ([rg, f, st, kv]) => { if (!window.Shell.Machine.ready) window.Shell.Machine.load(); for (const l of [`az datafactory pipeline create-run -g ${rg} --factory-name ${f} -n pl_ingesta_pedidos`, `az datafactory pipeline create-run -g ${rg} --factory-name ${f} -n pl_prueba_logs`, 'echo "pedido_id,monto" > prueba.csv', `az storage blob upload --account-name ${st} -c bronze -n pruebas/a.csv -f prueba.csv --auth-mode login`, `az storage blob upload --account-name ${st} -c bronze -n pruebas/b.csv -f prueba.csv`, `az keyvault secret show --vault-name ${kv} -n no-existe`]) await window.Shell.runLine(l, { autoLogin: true }); }, [RG, ADF, ST, KV]);
  await w(3500);
  await ir('recurso/law/log-tiendaandina-dev/logs', 1200);
  await p.fill('#lgQ', 'ADFPipelineRun\n| where Status in ("Succeeded", "Failed", "Cancelled")\n| summarize arg_max(TimeGenerated, *) by PipelineName\n| project PipelineName, Status, TimeGenerated, RunId'); await p.click('#lgRun'); await w(1200);
  await c.foto('b19b-logs', { marcas: [['.az-logs-esq', '1'], ['#lgQ', '2'], ['#lgOut .az-logs-res', '3']] });
  await p.fill('#lgQ', 'ADFPipelineRun\n| where Status == "Failed"'); await p.click('#lgAlerta'); await w(500);
  await p.fill('#aN', 'adf-pipeline-fallido-logs'); await p.selectOption('#aG', 'ag-guardia-datos'); await panelOk(2500);
  await c.foto('b19b-alerta', { marcas: [['.az-pag .az-tabla', '1'], ['.az-pag .az-tabla:last-of-type', '2']] });
  if (HASTA <= 20) return;

  // ================================================================ lección 21 (proyecto): endurecer el lago antes de producción
  await ir(`recurso/storage/${ST}`, 800);
  await c.foto('b20-storage-props', { marcas: [['.az-props', null]] });
  await ir(`recurso/storage/${ST}/locks`, 700);
  await c.foto('b20-locks-heredados', { marcas: [['#azRC .az-tabla', null]] });
  await ir('actividad', 700);
  await c.foto('b20-actividad', { marcas: [['.az-pag .az-tabla', null]] });
  if (HASTA <= 21) return;

  // ================================================================ Nivel 6 · lección 22: plantillas ARM (infraestructura como código)
  const TPL = {
    $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
    contentVersion: '1.0.0.0',
    parameters: {
      entorno: { type: 'string', defaultValue: 'qa', allowedValues: ['dev', 'qa', 'prod'], metadata: { description: 'Entorno a desplegar' } },
      location: { type: 'string', defaultValue: '[resourceGroup().location]' },
    },
    variables: {
      sufijo: "[concat('tiendaandina', parameters('entorno'))]",
      storageName: "[concat('st', variables('sufijo'))]",
      vaultName: "[concat('kv-tiendaandina-', parameters('entorno'))]",
      factoryName: "[concat('adf-tiendaandina-', parameters('entorno'))]",
      tags: { proyecto: 'tienda-andina', entorno: "[parameters('entorno')]", owner: 'equipo-datos' },
    },
    resources: [
      { type: 'Microsoft.Storage/storageAccounts', apiVersion: '2023-05-01', name: "[variables('storageName')]", location: "[parameters('location')]", tags: "[variables('tags')]",
        sku: { name: "[if(equals(parameters('entorno'), 'prod'), 'Standard_ZRS', 'Standard_LRS')]" }, kind: 'StorageV2',
        properties: { isHnsEnabled: true, minimumTlsVersion: 'TLS1_2', allowBlobPublicAccess: false, accessTier: 'Hot' } },
      { type: 'Microsoft.Storage/storageAccounts/blobServices/containers', apiVersion: '2023-05-01', name: "[concat(variables('storageName'), '/default/bronze')]" },
      { type: 'Microsoft.Storage/storageAccounts/blobServices/containers', apiVersion: '2023-05-01', name: "[concat(variables('storageName'), '/default/silver')]" },
      { type: 'Microsoft.Storage/storageAccounts/blobServices/containers', apiVersion: '2023-05-01', name: "[concat(variables('storageName'), '/default/gold')]" },
      { type: 'Microsoft.KeyVault/vaults', apiVersion: '2023-07-01', name: "[variables('vaultName')]", location: "[parameters('location')]", tags: "[variables('tags')]",
        properties: { tenantId: '[subscription().tenantId]', sku: { family: 'A', name: 'standard' }, enableRbacAuthorization: true, softDeleteRetentionInDays: 90 } },
      { type: 'Microsoft.DataFactory/factories', apiVersion: '2018-06-01', name: "[variables('factoryName')]", location: "[parameters('location')]", tags: "[variables('tags')]", identity: { type: 'SystemAssigned' } },
    ],
  };
  const tplTexto = JSON.stringify(TPL, null, 2);
  const tplMal = tplTexto.replace("parameters('entorno'))]\",\n    \"storageName\"", "parameters('entornos'))]\",\n    \"storageName\"");
  if (tplMal === tplTexto) log('no se pudo armar la plantilla con error');
  await ir('crear', 700); await ir('crear/plantilla', 900);
  await c.foto('b21-opciones', { marcas: [['#tPropia', '1'], ['#tRapida', '2']] });
  await p.click('#tPropia'); await w(600);
  await p.fill('#tTxt', tplMal); await p.evaluate(() => { document.querySelector('#azMain').scrollTop = 9999; }); await w(200);
  await c.foto('b21-editor', { marcas: [['#tTxt', '1'], ['#tSave', '2']] });
  await p.click('#tSave'); await w(600);
  await p.fill('#tRgN', 'rg-tiendaandina-qa');
  await c.foto('b21-basics', { marcas: [['#tRgN', '1'], ['[data-tpar="entorno"]', '2'], ['[data-tpar="location"]', '3']] });
  await p.click('#tRev'); await w(700);
  await c.foto('b21-error', { marcas: [['.az-banner.error', null]] });
  await p.click('#tPrev'); await w(400); await p.click('[data-editar]'); await w(500);
  await p.fill('#tTxt', tplTexto); await p.click('#tSave'); await w(600);
  await p.fill('#tRgN', 'rg-tiendaandina-qa'); await p.click('#tRev'); await w(700);
  await c.foto('b21-revisar', { marcas: [['.az-banner.ok', '1'], ['.az-pag .az-kv', '2'], ['.az-pag .az-tabla', '3']] });
  await p.click('#tCrear'); await w(3800);
  await c.foto('b21-despliegue', { marcas: [['.az-dep', '1'], ['.az-pag .az-tabla', '2']] });
  await ir('grupo/rg-tiendaandina-qa', 800);
  await c.foto('b21-grupo-qa', { marcas: [['.az-ess', '1'], ['#azRC .az-tabla', '2']] });
  await p.click('.az-cmd [data-c="borrarRg"]'); await w(500); await p.fill('#dC', 'rg-tiendaandina-qa');
  await c.foto('b21-borrar-grupo', { marcas: [['#azCapa .az-banner', '1'], ['#dC', '2']] });
  await panelOk(2600);
  if (HASTA <= 22) return;

  // ================================================================ lección 23: costos, presupuestos y optimización
  await ir('costos', 800);
  await c.foto('b22-costos', { marcas: [['.az-barras', '1'], ['.az-pag h3 + .az-barras + h3 + .az-tabla, .az-pag .az-tabla', '2']] });
  await p.click('#bAdd'); await w(400); await p.fill('#pN', 'alerta-temprana'); await p.fill('#pM', '0.1'); await p.fill('#pU', '50, 100'); await panelOk(600);
  await ir('', 400); await ir('costos', 800);
  await p.click('#azNotB'); await w(400);
  await c.foto('b22-alerta-presupuesto', { marcas: [['#azNot .az-not', null]] });
  await cerrarFly();
  await marcaTexto('.az-pag h3', 'Budgets');
  await c.foto('b22-presupuestos', { marcas: [['.az-pag h3[data-cap] + table', null]] });
  await ir(`recurso/storage/${ST}/ciclo`, 600);
  await ir('recursos', 700);
  await c.foto('b22-todos-recursos', { marcas: [['.az-pag .az-tabla', null]] });
  if (HASTA <= 23) return;

  // ================================================================ lección 24: de la práctica al Azure real
  await ir('crear/storage', 900);
  await wSel('rg', RG); await wTxt('name', 'sttiendaandinaprueba'); await wSel('location', 'eastus2');
  await wRevisar();
  await p.click('#wPlantilla'); await w(500);
  await p.click(`${capa} [data-v="bicep"]`); await w(300);
  await c.foto('b23-bicep', { marcas: [[`${capa} .az-pest`, '1'], ['#tCode', '2']] });
  await p.click(`${capa} [data-v="cli"]`); await w(300);
  await c.foto('b23-cli', { marcas: [['#tCode', null]] });
  await panelX();
  await p.click('#azCfgB'); await w(300); await p.click('[data-tema="dark"]'); await w(400); await cerrarFly();
  await ir('', 700);
  await c.foto('b23-tema-oscuro');
  await p.click('#azCfgB'); await w(300); await p.click('[data-tema="azure"]'); await w(300); await cerrarFly();
  if (HASTA <= 24) return;

  // ================================================================ lección 25 (proyecto final): producción con plantilla, permisos, bloqueo y alertas
  await ir('crear/plantilla', 900);
  await p.click('#tPropia'); await w(500); await p.fill('#tTxt', tplTexto); await p.click('#tSave'); await w(600);
  await p.fill('#tRgN', 'rg-tiendaandina-prod'); await p.selectOption('[data-tpar="entorno"]', 'prod'); await w(200);
  await p.click('#tRev'); await w(700);
  await c.foto('b24-revisar', { marcas: [['.az-pag .az-kv', '1'], ['.az-pag .az-tabla', '2']] });
  await p.click('#tCrear'); await w(3800);
  await ir('grupo/rg-tiendaandina-prod/diagnostico', 800);
  await c.foto('b24-visualizador', { marcas: [['.az-viz', null]] });
  await ir('grupo/rg-tiendaandina-prod/locks', 700);
  await p.click('#lAdd'); await w(400); await p.fill('#lN', 'no-borrar-prod'); await p.selectOption('#lT', 'CanNotDelete'); await p.fill('#lO', 'Producción: cambios solo por plantilla'); await panelOk(600);
  await ir('grupo/rg-tiendaandina-prod/iam', 700);
  await asignar('Reader', 'analistas-datos');
  await asignar('Data Factory Contributor', 'ingenieros-datos');
  await c.foto('b24-iam-prod', { marcas: [['#azRC .az-tabla', null]] });
  await ir('recurso/storage/sttiendaandinaprod', 800);
  await c.foto('b24-storage-prod', { marcas: [['.az-ess', null]] });
  await ir('grupo/rg-tiendaandina-prod/costos', 700);
  await c.foto('b24-costos-prod', { marcas: [['#azRC .az-tabla', null]] });
  await ir('grupos', 700);
  await c.foto('b24-grupos', { marcas: [['.az-pag .az-tabla', null]] });
}
