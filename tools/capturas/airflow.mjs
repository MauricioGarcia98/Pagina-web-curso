// Guion de capturas del curso de Apache Airflow (assets/img/guias/airflow/)
// Historia: el equipo de datos de Tienda Andina orquesta sus cargas con Airflow 3: primeros DAGs, programación,
// operadores, XComs, variables, assets, ramas, backfills, operación y despliegue.
export default async function (c) {
  const p = c.page;
  const w = (ms) => c.espera(ms);
  const log = (...a) => console.log('   [airflow]', ...a);
  const HASTA = Number(process.env.AF_HASTA || 99);
  const ir = async (h, ms = 900) => { await p.evaluate((x) => { location.hash = x; }, h); await w(ms); };
  const listo = () => p.waitForFunction(() => window.AirflowMotor && window.AirflowMotor.bolsa().en, null, { timeout: 120000 });
  // escribe un archivo de DAG en ~/airflow/dags y vuelve a analizar la carpeta
  const escribir = async (nombre, codigo) => {
    await p.evaluate(async ([n, cod]) => { const M = window.AirflowMotor; window.Shell.writeFile(M.DAGS + '/' + n, cod); await M.parsear(true); window.AirflowUI.render(); }, [nombre, codigo]);
    await w(600);
  };
  const esperarRun = (id) => p.waitForFunction((x) => { const r = window.AirflowMotor.runs(x)[0]; return r && ['success', 'failed'].includes(r.state); }, id, { timeout: 120000 });
  const runId = (id) => p.evaluate((x) => window.AirflowMotor.runs(x)[0].run_id, id);
  const rutaRun = async (id) => `#/airflow/dags/${id}/runs/${encodeURIComponent(await runId(id))}`;
  const disparar = async (id, { foto, conf, fecha } = {}) => {
    const antes = await p.evaluate((x) => window.AirflowMotor.runs(x).length, id);
    await ir(`#/airflow/dags/${id}`);
    await p.click('.af-dh [data-trig]'); await w(500);
    if (conf) for (const [k, v] of Object.entries(conf)) await p.fill(`[data-p="${k}"]`, String(v));
    if (fecha) { await p.evaluate(() => { const d = document.querySelector('.af-adv'); if (d) d.open = true; }); await p.fill('#afTLd', fecha); }
    await w(200);
    if (foto) await foto();
    await p.click('#afTOk'); await w(300);
    const err = await p.evaluate(() => { const e = document.getElementById('afTErr'); return e && !e.hidden ? e.textContent : ''; });
    if (err) { log('trigger', id, err); await cerrarModal(); return; }
    await p.waitForFunction(([x, n]) => { const rs = window.AirflowMotor.runs(x); return rs.length > n && ['success', 'failed'].includes(rs[0].state); }, [id, antes], { timeout: 120000 });
    await w(500);
  };
  const terminal = async (abrir = true) => { const vis = await p.evaluate(() => !document.getElementById('afTerm').hidden); if (vis !== abrir) { await p.click('#afTermB'); await w(500); } };
  const cmd = async (texto, ms = 1200) => { await p.click('#afTerm .term-input'); await p.keyboard.type(texto); await p.keyboard.press('Enter'); await w(ms); };
  // los grafos se capturan con la ventana más ancha para que el panel izquierdo muestre el Dag entero
  const fotoGrafo = async (hash, nombre, zoom = 0.8) => {
    await p.setViewportSize({ width: 1600, height: 760 });
    await ir(`${hash}${hash.includes('?') ? '&' : '?'}vista=graph&zoom=${zoom}`, 1000);
    await c.foto(nombre, { recorte: '.af-izq', marcas: [['.af-graph-c', null]] });
    await p.setViewportSize({ width: 1280, height: 760 });
  };
  const cerrarModal = async () => { await p.evaluate(() => { const m = document.getElementById('afModal'); if (m) m.remove(); }); await w(150); };

  await c.ir('#/airflow', '.afp'); await listo(); await w(800);
  await p.evaluate(() => { window.AirflowMotor.aceleracion.ms = 15; });

  // ================================================================ Nivel 1 · lección 1: qué es Airflow y la pantalla
  await ir('#/airflow', 900);
  await c.foto('a01-home', { marcas: [['.af-nav', '1'], ['.af-stats', '2'], ['.af-health', '3']] });
  await p.click('.af-nav [data-menu="browse"]'); await w(300);
  await c.foto('a01-browse', { marcas: [['#afPop', null]] });
  await p.click('.af-nav [data-menu="admin"]'); await w(300);
  await c.foto('a01-admin', { marcas: [['#afPop', null]] });
  await p.evaluate(() => { document.getElementById('afPop').hidden = true; });
  if (HASTA <= 1) return;

  // ================================================================ lección 2: la lista de Dags
  await ir('#/airflow/dags', 1000);
  await c.foto('a02-dags', { marcas: [['.af-buscar', '1'], ['.af-filtros', '2'], ['.af-tabla', '3']] });
  await ir('#/airflow/dags?tags=ventas', 800);
  await c.foto('a02-filtro', { marcas: [['#afTag', null]] });
  await ir('#/airflow/dags/ventas_diarias', 1000);
  await c.foto('a02-dag', { marcas: [['.af-dh-t', '1'], ['.af-dh-s', '2'], ['.af-izq', '3'], ['#afDer .af-tabs', '4']] });
  await p.click('.af-dh [data-pausa]'); await w(500);
  await c.foto('a02-activo', { recorte: '.af-dh', marcas: [['.af-dh .af-sw', null]] });
  await p.click('.af-dh [data-pausa]'); await w(400);
  if (HASTA <= 2) return;

  // ================================================================ lección 3: tu primer DAG
  const HOLA = `from datetime import datetime

from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.python import PythonOperator
from airflow.sdk import DAG


def saludar():
    print("Hola, Tienda Andina: el equipo de datos ya orquesta con Airflow")


with DAG(
    dag_id="hola_tienda",
    schedule=None,
    start_date=datetime(2026, 11, 1),
    tags=["curso"],
):
    inicio = BashOperator(task_id="inicio", bash_command="echo 'Arranca la carga'")
    saludo = PythonOperator(task_id="saludo", python_callable=saludar)

    inicio >> saludo
`;
  await escribir('hola_tienda.py', HOLA);
  await ir('#/airflow/dags', 900);
  await terminal(true);
  await cmd('cd ~/airflow/dags && ls', 900);
  await cmd('nano hola_tienda.py', 900);
  await c.foto('a03-nano', { marcas: [['#afTerm', null]] });
  await p.keyboard.press('Control+x'); await w(400);
  await cmd('airflow dags list', 2500);
  await c.foto('a03-cli', { marcas: [['#afTerm', null]] });
  await cmd('clear', 300);
  await terminal(false);
  await ir('#/airflow/dags?q=hola', 1200);
  await c.foto('a03-lista', { marcas: [['.af-tabla tbody tr', null]] });
  await ir('#/airflow/dags/hola_tienda?tab=code', 1000);
  await c.foto('a03-code', { marcas: [['#afDer .af-tab-b, #afDer .af-codebar', null]] });
  if (HASTA <= 3) return;

  // ================================================================ lección 4 (proyecto): el primer DAG corriendo
  await disparar('hola_tienda', { foto: async () => { await c.foto('a04-trigger', { marcas: [['#afModal .af-modal', null]] }); } });
  await ir(await rutaRun('hola_tienda'), 1000);
  await c.foto('a04-run', { marcas: [['.af-grid', '1'], ['#afDer .af-rh', '2'], ['#afDer .af-tabla', '3']] });
  await ir((await rutaRun('hola_tienda')) + '/tasks/saludo', 1000);
  await c.foto('a04-log', { marcas: [['#afLog', null]] });
  if (HASTA <= 4) return;

  // ================================================================ Nivel 2 · lección 5: Grid, Graph y estados
  for (let i = 3; i >= 1; i--) await disparar('ventas_diarias', { fecha: `2026-11-${String(15 - i).padStart(2, '0')}T06:00` });
  await ir('#/airflow/dags/ventas_diarias', 1000);
  await c.foto('a05-grid', { marcas: [['.af-grid', null]] });
  await fotoGrafo('#/airflow/dags/ventas_diarias', 'a05-graph');
  await ir('#/airflow/dags/ventas_diarias?tab=runs', 900);
  await c.foto('a05-runs', { marcas: [['#afDer .af-tabla', null]] });
  if (HASTA <= 5) return;

  // ================================================================ lección 6: logs, reintentos y Clear
  await disparar('conciliacion_pagos');
  await ir(await rutaRun('conciliacion_pagos'), 1000);
  await c.foto('a06-fallo', { marcas: [['.af-grid', '1'], ['#afDer .af-tabla', '2']] });
  await ir((await rutaRun('conciliacion_pagos')) + '/tasks/conciliar', 1000);
  await c.foto('a06-log', { marcas: [['.af-logbar', '1'], ['.af-ll-err', '2']] });
  // arreglo en la terminal: el campo se llama "monto", no "importe"
  await terminal(true);
  await cmd('cd ~/airflow/dags', 300);
  await cmd('grep -n "importe\\|monto" conciliacion_pagos.py', 900);
  await cmd("sed -i 's/importe/monto/' conciliacion_pagos.py", 900);
  await cmd('grep -n "monto" conciliacion_pagos.py', 1500);
  await c.foto('a06-arreglo', { marcas: [['#afTerm', null]] });
  await cmd('clear', 300);
  await terminal(false);
  await p.evaluate(async () => { await window.AirflowMotor.parsear(true); }); await w(500);
  await ir(await rutaRun('conciliacion_pagos'), 900);
  await p.click('#afClearRun'); await w(500);
  await p.check('#afCF').catch(() => {}); await w(200);
  await c.foto('a06-clear', { marcas: [['#afModal .af-modal', null]] });
  await p.click('#afCOk'); await esperarRun('conciliacion_pagos'); await w(1500);
  await p.waitForFunction(() => window.AirflowMotor.runs('conciliacion_pagos')[0].state === 'success', null, { timeout: 60000 }).catch(() => log('conciliacion no quedó en success'));
  await ir(await rutaRun('conciliacion_pagos'), 1000);
  await c.foto('a06-ok', { marcas: [['.af-grid', '1'], ['#afDer .af-tabla', '2']] });
  if (HASTA <= 6) return;

  // ================================================================ lección 7: programación
  await ir('#/airflow/dags', 900);
  await c.foto('a07-horarios', { marcas: [['.af-tabla', null]] });
  await ir('#/airflow/dags/ingesta_api?tab=details', 1000);
  await c.foto('a07-details', { marcas: [['#afDer .af-kv', null]] });
  await ir('#/airflow/dags/ventas_diarias?tab=calendar', 900);
  await c.foto('a07-calendar', { marcas: [['#afDer .af-card', null]] });
  if (HASTA <= 7) return;

  // ================================================================ lección 8 (proyecto): el DAG diario de ventas
  const CARGA = `"""
### Carga de ventas de Tienda Andina

Todos los días a las 6:00 UTC trae las ventas del día anterior, las valida y las publica.
Responsable: **equipo de datos**. Si falla, revisar primero el log de \`validar\`.
"""
from datetime import datetime, timedelta

from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.python import PythonOperator
from airflow.sdk import DAG


def validar_ventas(**context):
    filas = 1240
    print(f"Ventas del {context['ds']}: {filas} filas")
    if filas == 0:
        raise ValueError("No llegaron ventas")
    return filas


with DAG(
    dag_id="carga_ventas_tienda",
    schedule="0 6 * * *",
    start_date=datetime(2026, 11, 1),
    catchup=False,
    tags=["tienda", "ventas", "curso"],
    default_args={"owner": "equipo-datos", "retries": 2, "retry_delay": timedelta(minutes=5)},
    doc_md=__doc__,
):
    extraer = BashOperator(task_id="extraer", bash_command="echo 'Descargando ventas del {{ ds }}'")
    validar = PythonOperator(task_id="validar", python_callable=validar_ventas)
    publicar = BashOperator(task_id="publicar", bash_command="echo 'Publicando ventas validadas'")

    extraer >> validar >> publicar
`;
  await escribir('carga_ventas_tienda.py', CARGA);
  await disparar('carga_ventas_tienda');
  await ir('#/airflow/dags/carga_ventas_tienda', 1000);
  await c.foto('a08-dag', { marcas: [['.af-dh-s', '1'], ['.af-grid', '2'], ['#afDer .af-doc', '3']] });
  await ir((await rutaRun('carga_ventas_tienda')) + '/tasks/extraer?tab=rendered', 1000);
  await c.foto('a08-rendered', { marcas: [['#afDer .af-tab-b', null]] });
  if (HASTA <= 8) return;

  // ================================================================ Nivel 3 · lección 9: operadores y TaskFlow
  const RESUMEN = `"""Resume las ventas por tienda con TaskFlow: cada @task devuelve un valor que usa la siguiente."""
from datetime import datetime

from airflow.sdk import dag, task


@dag(schedule=None, start_date=datetime(2026, 11, 1), catchup=False, tags=["curso", "tienda"])
def resumen_tiendas():
    @task
    def leer_ventas():
        return [
            {"tienda": "Lima Centro", "unidades": 3},
            {"tienda": "Bogotá Norte", "unidades": 6},
            {"tienda": "CDMX Roma", "unidades": 9},
            {"tienda": "Santiago Providencia", "unidades": 12},
        ]

    @task
    def total_unidades(ventas):
        total = sum(v["unidades"] for v in ventas)
        print(f"Unidades vendidas: {total}")
        return total

    @task
    def mejor_tienda(ventas):
        mejor = max(ventas, key=lambda v: v["unidades"])
        print(f"La tienda que más vendió: {mejor['tienda']}")
        return mejor["tienda"]

    @task
    def informar(total, tienda):
        print(f"Resumen del día: {total} unidades, tienda destacada {tienda}")

    ventas = leer_ventas()
    informar(total_unidades(ventas), mejor_tienda(ventas))


resumen_tiendas()
`;
  await escribir('resumen_tiendas.py', RESUMEN);
  await disparar('resumen_tiendas');
  await fotoGrafo(await rutaRun('resumen_tiendas'), 'a09-graph');
  await ir((await rutaRun('resumen_tiendas')) + '/tasks/informar', 1000);
  await c.foto('a09-log', { marcas: [['#afLog', null]] });
  await fotoGrafo('#/airflow/dags/ingesta_api', 'a09-operadores');
  if (HASTA <= 9) return;

  // ================================================================ lección 10: XComs y plantillas
  await ir((await rutaRun('resumen_tiendas')) + '/tasks/leer_ventas?tab=xcom', 1000);
  await c.foto('a10-xcom', { marcas: [['#afDer .af-tab-b', null]] });
  await ir('#/airflow/xcoms', 900);
  await c.foto('a10-xcoms', { marcas: [['.af-tabla', null]] });
  if (HASTA <= 10) return;

  // ================================================================ lección 11: Variables y Connections
  await ir('#/airflow/variables', 800);
  await p.click('#afVAdd'); await w(400);
  await p.fill('#afVK', 'entorno'); await p.fill('#afVV', 'dev'); await p.fill('#afVD', 'Entorno donde corren los DAGs (dev, prod)').catch(() => {});
  await c.foto('a11-var-nueva', { marcas: [['#afModal .af-modal', null]] });
  await p.click('#afVOk'); await w(500);
  await p.click('#afVAdd'); await w(400);
  await p.fill('#afVK', 'umbral_alerta'); await p.fill('#afVV', '100'); await p.fill('#afVD', 'Total diario por debajo del cual se avisa a ventas').catch(() => {});
  await p.click('#afVOk'); await w(500);
  await c.foto('a11-vars', { marcas: [['.af-tabla', null]] });
  await ir('#/airflow/connections', 800);
  await p.click('#afCAdd'); await w(400);
  await p.fill('#afK', 'api_tienda'); await p.selectOption('#afT', 'http').catch(() => {});
  await p.fill('#afDs', 'API interna de la tienda (clientes y productos)'); await p.fill('#afH', 'api.tienda.local'); await p.fill('#afPo', '443');
  await p.fill('#afL', 'svc_airflow').catch(() => {});
  await c.foto('a11-conn-nueva', { marcas: [['#afModal .af-modal', null]] });
  await p.click('#afCOk2'); await w(500);
  await c.foto('a11-conns', { marcas: [['.af-tabla', null]] });
  if (HASTA <= 11) return;

  // ================================================================ lección 12 (proyecto): ingesta parametrizada
  const CLIENTES = `"""Descarga clientes de la API de la tienda. Se puede lanzar a mano para un solo país."""
from datetime import datetime

from airflow.providers.standard.operators.bash import BashOperator
from airflow.sdk import DAG, Param, Variable, task

with DAG(
    dag_id="ingesta_clientes",
    schedule="0 5 * * *",
    start_date=datetime(2026, 11, 1),
    catchup=False,
    tags=["tienda", "ingesta", "curso"],
    default_args={"owner": "equipo-datos"},
    params={
        "pais": Param("todos", enum=["todos", "PE", "CO", "MX", "CL"], description="País a descargar"),
        "limite": Param(500, type="integer", minimum=1, description="Máximo de clientes"),
    },
):

    @task
    def descargar(params=None):
        entorno = Variable.get("entorno", default="dev")
        print(f"[{entorno}] Descargando hasta {params['limite']} clientes de {params['pais']} desde api_tienda")
        return params["limite"]

    avisar = BashOperator(
        task_id="avisar",
        bash_command="echo 'Clientes de {{ params.pais }} cargados en {{ var.value.entorno }}'",
    )

    descargar() >> avisar
`;
  await escribir('ingesta_clientes.py', CLIENTES);
  await ir('#/airflow/dags/ingesta_clientes', 900);
  await p.click('.af-dh [data-trig]'); await w(500);
  await p.selectOption('[data-p="pais"]', 'PE').catch(() => log('sin param pais'));
  await p.dispatchEvent('[data-p="pais"]', 'input').catch(() => {});
  await p.fill('[data-p="limite"]', '200').catch(() => log('sin param limite'));
  await w(300);
  await c.foto('a12-params', { marcas: [['#afModal .af-form', null]] });
  const antes12 = await p.evaluate(() => window.AirflowMotor.runs('ingesta_clientes').length);
  await p.click('#afTOk');
  await p.waitForFunction((n) => { const rs = window.AirflowMotor.runs('ingesta_clientes'); return rs.length > n && ['success', 'failed'].includes(rs[0].state); }, antes12, { timeout: 120000 });
  await ir((await rutaRun('ingesta_clientes')) + '/tasks/descargar', 1000);
  await c.foto('a12-log', { marcas: [['#afLog', null]] });
  await ir((await rutaRun('ingesta_clientes')) + '/tasks/avisar?tab=rendered', 1000);
  await c.foto('a12-rendered', { marcas: [['#afDer .af-tab-b', null]] });
  if (HASTA <= 12) return;

  // ================================================================ Nivel 4 · lección 13: Assets
  await ir('#/airflow/assets', 900);
  await c.foto('a13-assets', { marcas: [['.af-tabla', null]] });
  await fotoGrafo('#/airflow/dags/ventas_diarias?deps=all', 'a13-graph', 0.6);
  await ir('#/airflow/dags/reporte_ventas', 900);
  await p.click('.af-dh [data-pausa]'); await w(500);
  await c.foto('a13-despausar', { recorte: '.af-dh', marcas: [['.af-dh-s', null]] });
  await disparar('ventas_diarias', { fecha: '2026-11-15T06:00' });
  await w(1500);
  await p.waitForFunction(() => { const r = window.AirflowMotor.runs('reporte_ventas')[0]; return r && ['success', 'failed'].includes(r.state); }, null, { timeout: 60000 }).catch(() => log('reporte_ventas no corrió por asset'));
  await ir(await rutaRun('reporte_ventas').catch(() => '#/airflow/dags/reporte_ventas'), 1000);
  await c.foto('a13-run-asset', { marcas: [['#afDer .af-rh', '1'], ['.af-grid', '2']] });
  await ir('#/airflow/assets/' + encodeURIComponent('tienda://gold/ventas_diarias'), 900);
  await c.foto('a13-asset', { marcas: [['.af-assetg', '1'], ['.af-tabla', '2']] });
  if (HASTA <= 13) return;

  // ================================================================ lección 14: ramas y trigger rules
  await fotoGrafo(await rutaRun('reporte_ventas'), 'a14-rama', 0.7);
  await ir('#/airflow/variables', 600);
  await p.evaluate(() => window.AirflowMotor.setVar('umbral_alerta', '300', 'Total diario por debajo del cual se avisa a ventas')); await w(300);
  await disparar('reporte_ventas');
  await ir((await rutaRun('reporte_ventas')) + '/tasks/decidir', 1000);
  await c.foto('a14-decidir', { marcas: [['#afLog', null]] });
  await ir('#/airflow/dags/reporte_ventas', 900);
  await c.foto('a14-grid', { marcas: [['.af-grid', null]] });
  await ir('#/airflow/dags/ingesta_api/tasks/fin', 900);
  await c.foto('a14-trigger-rule', { marcas: [['#afDer .af-dh-s', null]] });
  if (HASTA <= 14) return;

  // ================================================================ lección 15: backfill, clear y mark
  await ir('#/airflow/dags/carga_ventas_tienda?tab=backfills', 900);
  await p.click('#afBfN'); await w(500);
  await p.fill('#afBD', '2026-11-08T00:00'); await p.fill('#afBH', '2026-11-14T00:00');
  await p.dispatchEvent('#afBD', 'change'); await w(300);
  await c.foto('a15-backfill', { marcas: [['#afModal .af-modal', null]] });
  await p.click('#afTOk'); await w(800);
  await p.waitForFunction(() => window.AirflowMotor.runs('carga_ventas_tienda').filter((r) => r.backfill).every((r) => ['success', 'failed'].includes(r.state)), null, { timeout: 180000 }).catch(() => log('backfill sin terminar'));
  await ir('#/airflow/dags/carga_ventas_tienda?tab=backfills', 900);
  await c.foto('a15-backfills', { marcas: [['.af-grid', '1'], ['#afDer .af-tabla', '2']] });
  await ir('#/airflow/dags/carga_ventas_tienda?tab=runs&run_type=backfill', 900);
  await c.foto('a15-runs', { marcas: [['#afDer .af-filtros', '1'], ['#afDer .af-tabla', '2']] });
  if (HASTA <= 15) return;

  // ================================================================ lección 16 (proyecto): reproceso de un día
  const rid16 = await p.evaluate(() => { const r = window.AirflowMotor.runs('carga_ventas_tienda').find((x) => x.logical.startsWith('2026-11-12')); return r ? r.run_id : null; });
  if (rid16) {
    await ir(`#/airflow/dags/carga_ventas_tienda/runs/${encodeURIComponent(rid16)}/tasks/validar`, 1000);
    await p.click('#afClearTI'); await w(500);
    await c.foto('a16-clear', { marcas: [['#afModal .af-modal', null]] });
    await p.click('#afCOk'); await w(2500);
    await p.click('#afMarkRun').catch(() => {});
    await ir(`#/airflow/dags/carga_ventas_tienda/runs/${encodeURIComponent(rid16)}`, 1200);
    await p.click('#afMarkRun'); await w(300);
    await c.foto('a16-mark', { marcas: [['#afMarkRun', null]] });
    await p.keyboard.press('Escape'); await p.click('.af-h1, .af-dh h1').catch(() => {}); await w(200);
    await ir(`#/airflow/dags/carga_ventas_tienda/runs/${encodeURIComponent(rid16)}/tasks/validar`, 1000);
    await c.foto('a16-intentos', { marcas: [['.af-logbar', null]] });
  } else log('sin corrida del 12');
  if (HASTA <= 16) return;

  // ================================================================ Nivel 5 · lección 17: errores de importación y pruebas
  await ir('#/airflow', 900);
  await p.click('#afImpErr'); await w(500);
  await c.foto('a17-import', { marcas: [['#afModal .af-modal', null]] });
  await cerrarModal();
  await terminal(true);
  await cmd('airflow dags list-import-errors', 1500);
  await c.foto('a17-cli', { marcas: [['#afTerm', null]] });
  await cmd('clear', 300);
  await cmd('airflow tasks test carga_ventas_tienda validar 2026-11-14', 6000);
  await c.foto('a17-tasks-test', { marcas: [['#afTerm', null]] });
  await cmd('clear', 300);
  await cmd('airflow dags test resumen_tiendas 2026-11-14', 8000);
  await c.foto('a17-dags-test', { marcas: [['#afTerm', null]] });
  await cmd('clear', 300);
  await terminal(false);
  if (HASTA <= 17) return;

  // ================================================================ lección 18: pools y concurrencia
  await ir('#/airflow/pools', 800);
  await p.click('#afPAdd'); await w(400);
  await p.fill('#afPN', 'api_tienda'); await p.fill('#afPS', '2'); await p.fill('#afPD', 'La API de la tienda acepta 2 conexiones a la vez').catch(() => {});
  await c.foto('a18-pool-nuevo', { marcas: [['#afModal .af-modal', null]] });
  await p.click('#afPOk'); await w(500);
  await c.foto('a18-pools', { marcas: [['.af-tarjetas', null]] });
  const CATALOGO = `"""Descarga el catálogo por categoría sin saturar la API: el pool api_tienda deja 2 tareas a la vez."""
from datetime import datetime

from airflow.providers.standard.operators.bash import BashOperator
from airflow.sdk import DAG

with DAG(
    dag_id="catalogo_api",
    schedule="0 4 * * *",
    start_date=datetime(2026, 11, 1),
    catchup=False,
    max_active_runs=1,
    tags=["tienda", "ingesta", "curso"],
    default_args={"owner": "equipo-datos", "pool": "api_tienda"},
):
    for categoria in ["electronica", "hogar", "moda", "deportes"]:
        BashOperator(task_id=f"descargar_{categoria}", bash_command=f"echo 'Descargando {categoria}'")
`;
  await escribir('catalogo_api.py', CATALOGO);
  await disparar('catalogo_api');
  await ir((await rutaRun('catalogo_api')) + '/tasks/descargar_hogar?tab=details', 1000);
  await c.foto('a18-pool-tarea', { marcas: [['#afDer .af-kv', null]] });
  if (HASTA <= 18) return;

  // ================================================================ lección 19: Browse y auditoría
  await ir('#/airflow/dag_runs', 900);
  await c.foto('a19-dag-runs', { marcas: [['.af-tabla', null]] });
  await ir('#/airflow/task_instances', 900);
  await c.foto('a19-task-instances', { marcas: [['.af-tabla', null]] });
  await ir('#/airflow/events', 900);
  await c.foto('a19-audit', { marcas: [['.af-tabla', null]] });
  if (HASTA <= 19) return;

  // ================================================================ lección 20 (proyecto): alertas al fallar
  const ALERTA = `"""Carga de devoluciones con aviso cuando una tarea falla."""
from datetime import datetime

from airflow.sdk import DAG, task


def avisar_falla(context):
    tarea = context["task"].task_id
    print(f"ALERTA para el canal #datos: falló {tarea} en la corrida {context['run_id']}")


with DAG(
    dag_id="carga_devoluciones",
    schedule="30 6 * * *",
    start_date=datetime(2026, 11, 1),
    catchup=False,
    tags=["tienda", "curso"],
    default_args={"owner": "equipo-datos", "retries": 1, "on_failure_callback": avisar_falla},
):

    @task
    def leer_devoluciones():
        return []

    @task
    def validar(devoluciones):
        if not devoluciones:
            raise ValueError("El archivo de devoluciones llegó vacío")
        return len(devoluciones)

    validar(leer_devoluciones())
`;
  await escribir('carga_devoluciones.py', ALERTA);
  await disparar('carga_devoluciones');
  await ir((await rutaRun('carga_devoluciones')) + '/tasks/validar', 1000);
  await c.foto('a20-callback', { marcas: [['#afLog', null]] });
  await ir('#/airflow', 900);
  await c.foto('a20-home', { marcas: [['.af-stats', '1'], ['.af-home-g section:nth-child(3)', '2']] });
  if (HASTA <= 20) return;

  // ================================================================ Nivel 6 · lección 21: buenas prácticas
  await ir('#/airflow/config', 900);
  await c.foto('a21-config', { marcas: [['.af-aviso', null]] });
  await ir('#/airflow/dags/carga_ventas_tienda?tab=details', 900);
  await c.foto('a21-details', { marcas: [['#afDer .af-kv', null]] });
  if (HASTA <= 21) return;

  // ================================================================ lección 22: mapeo dinámico
  const MAPEO = `"""Procesa cada tienda en su propia instancia de tarea (dynamic task mapping)."""
from datetime import datetime

from airflow.sdk import dag, task


@dag(schedule=None, start_date=datetime(2026, 11, 1), catchup=False, tags=["curso", "tienda"])
def ventas_por_tienda():
    @task
    def tiendas():
        return ["Lima Centro", "Bogotá Norte", "CDMX Roma", "Santiago Providencia"]

    @task
    def procesar(tienda):
        print(f"Procesando las ventas de {tienda}")
        return len(tienda)

    @task
    def consolidar(resultados):
        print(f"Tiendas procesadas: {len(list(resultados))}")

    consolidar(procesar.expand(tienda=tiendas()))


ventas_por_tienda()
`;
  await escribir('ventas_por_tienda.py', MAPEO);
  await disparar('ventas_por_tienda');
  await ir(await rutaRun('ventas_por_tienda'), 1000);
  await c.foto('a22-mapeo', { marcas: [['.af-grid', '1'], ['#afDer .af-tabla', '2']] });
  await ir((await rutaRun('ventas_por_tienda')) + '/tasks/procesar', 1000);
  await c.foto('a22-log', { marcas: [['#afLog', null]] });
  if (HASTA <= 22) return;

  // ================================================================ lección 23: de la práctica a Airflow real
  await ir('#/airflow/providers', 800);
  await c.foto('a23-providers', { marcas: [['.af-tabla', null]] });
  await terminal(true);
  await cmd('airflow version', 800);
  await cmd('airflow info', 1500);
  await c.foto('a23-info', { marcas: [['#afTerm', null]] });
  await cmd('clear', 300);
  await terminal(false);
  if (HASTA <= 23) return;

  // ================================================================ lección 24 (proyecto final)
  await ir('#/airflow/dags?tags=tienda', 1000);
  await c.foto('a24-dags', { marcas: [['.af-tabla', null]] });
  await ir('#/airflow', 900);
  await c.foto('a24-home', { marcas: [['.af-home', null]] });
}
