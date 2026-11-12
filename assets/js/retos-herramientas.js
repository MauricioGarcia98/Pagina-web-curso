/* Retos autocorregidos dentro de las herramientas de práctica (portal de Azure, Data Factory Studio y
 * Databricks). Cada reto se corrige mirando el estado de la herramienta, no lo que escribiste: si el
 * recurso, la tabla o la ejecución existe como se pide, el reto queda aprobado (y queda aprobado aunque
 * después lo borres). Un botón flotante "🎯 Retos" abre el panel con los niveles.
 */
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const az = () => (window.CloudSim ? window.CloudSim.az() : {});
  const dbx = () => (window.CloudSim ? window.CloudSim.dbx() : {});
  const val = (o) => Object.values(o || {});
  const ent = (o) => Object.entries(o || {});
  const subId = () => az().sub;
  const idCuenta = (n) => { const R = (az().storage || {})[n]; return R ? `/subscriptions/${subId()}/resourceGroups/${R.rg}/providers/Microsoft.Storage/storageAccounts/${n}` : ''; };
  const cubre = (scope, id) => !!id && (scope === id || id.startsWith(scope + '/'));
  const studios = () => ent(az().adf).map(([n, f]) => [n, f.studio]).filter(([, s]) => s);
  const todasAct = (lista, out = []) => { for (const a of lista || []) { out.push(a); todasAct(a.activities, out); todasAct(a.ifTrueActivities, out); todasAct(a.ifFalseActivities, out); } return out; };
  const actsDe = (S) => val(S.pipelines).flatMap((P) => todasAct(P.activities));
  const uc = () => (window.DBSQL && window.DBSQL.uc ? window.DBSQL.uc() : { catalogs: {}, historial: [], grants: [] });
  const tablasUC = () => ent(uc().catalogs).flatMap(([c, C]) => ent(C.schemas).flatMap(([s, S]) => ent(S.tables).map(([t, T]) => ({ c, s, t, T }))));
  const hist = () => (uc().historial || []).filter((h) => h.estado === 'FINISHED').map((h) => h.texto || '');

  const RETOS = {
    azure: { titulo: 'Retos del portal de Azure', niveles: [
      ['Básico', [
        ['az-rg', 'Crea un grupo de recursos', 'Home → Resource groups → Create.', () => Object.keys(az().groups || {}).some((g) => !/^databricks-rg-/.test(g))],
        ['az-adls', 'Crea una cuenta de almacenamiento con espacio de nombres jerárquico (ADLS Gen2)', 'Create a resource → Storage account → pestaña Advanced → Enable hierarchical namespace.', () => val(az().storage).some((s) => s.hns)],
        ['az-cont', 'Crea un contenedor llamado raw en esa cuenta', 'En la cuenta: Data storage → Containers → + Container.', () => val(az().storage).some((s) => (s.containers || {}).raw)],
        ['az-blob', 'Sube un archivo a un contenedor', 'Abre el contenedor → Upload (o az storage blob upload en Cloud Shell).', () => val(az().storage).some((s) => val(s.containers).some((c) => Object.keys(c.blobs || {}).some((b) => !b.endsWith('/'))))],
        ['az-tag', 'Etiqueta un grupo de recursos con entorno', 'Grupo → Tags → entorno = dev.', () => val(az().groups).some((g) => Object.keys(g.tags || {}).some((k) => /^(entorno|environment|env)$/i.test(k)))],
      ]],
      ['Intermedio', [
        ['az-kv', 'Crea un Key Vault con permisos RBAC y guarda un secreto', 'Create a resource → Key Vault (Access configuration: Azure RBAC). Para crear el secreto necesitas el rol Key Vault Secrets Officer.', () => val(az().kv).some((k) => (k.props || {}).permiso !== 'policy' && Object.keys(k.secrets || {}).length > 0)],
        ['az-rol', 'Asigna un rol de datos de Storage (Storage Blob Data …) a alguien', 'Cuenta → Access control (IAM) → Add role assignment.', () => (az().roles || []).some((r) => /^Storage Blob Data/.test(r.roleDefinitionName))],
        ['az-lock', 'Protege un grupo de recursos con un bloqueo de borrado', 'Grupo → Locks → Add → Delete.', () => (az().locks || []).some((l) => /delete/i.test(l.nivel || ''))],
        ['az-ppto', 'Crea un presupuesto en Cost Management', 'Cost Management → Budgets → Add.', () => (((Store && Store.data.azPortal) || {}).presupuestos || []).length > 0],
      ]],
      ['Avanzado', [
        ['az-dbw', 'Crea un workspace de Azure Databricks', 'Create a resource → Azure Databricks (fíjate que crea un grupo administrado).', () => Object.keys(az().dbw || {}).length > 0],
        ['az-adf', 'Crea un data factory', 'Create a resource → Data Factory.', () => Object.keys(az().adf || {}).length > 0],
        ['az-mi', 'Dale a la identidad administrada del factory un rol de datos sobre tu cuenta', 'Cuenta → IAM → Add role assignment → Storage Blob Data Contributor → miembro: el data factory (identidad administrada).', () => Object.keys(az().adf || {}).some((f) => (az().roles || []).some((r) => r.principalName === f && /^Storage Blob Data/.test(r.roleDefinitionName) && Object.keys(az().storage || {}).some((n) => cubre(r.scope, idCuenta(n)))))],
      ]],
      ['Identidad, monitoreo y bases', [
        ['az-app', 'Registra una aplicación y créale un secreto', 'Microsoft Entra ID → App registrations → New registration; adentro, New client secret. Copia el valor: se muestra una sola vez.', () => (((az().entra || {}).apps) || []).some((a) => (a.secretos || []).length)],
        ['az-sp-rol', 'Dale un rol a un grupo o a una aplicación que hayas creado', 'Crea el grupo o la aplicación en Entra ID y asígnale un rol en Access control (IAM) de un recurso.', () => { const E = az().entra || {}; const propios = new Set([...(E.groups || []).map((g) => g.nombre), ...(E.apps || []).map((a) => a.nombre)]); return (az().roles || []).some((r) => propios.has(r.principalName)); }],
        ['az-alerta', 'Crea una regla de alerta que avise a un grupo de acciones', 'Monitor → Action groups → Create; después Alerts → Create alert rule y elige ese grupo.', () => (((az().monitor || {}).reglas) || []).some((g) => g.grupo)],
        ['az-sql', 'Crea una base de Azure SQL, abre el cortafuegos y crea una tabla', 'All services → SQL databases → Create. En Query editor te va a bloquear el cortafuegos: agrega tu IP y ejecuta un CREATE TABLE.', () => val((az().sql || {}).servers).some((V) => (V.firewall || []).length && val(V.dbs).some((B) => (B.cambios || []).some((c) => /CREATE\s+TABLE/i.test(c))))],
        ['az-cola', 'Envía un mensaje a una cola de Storage', 'Cuenta de almacenamiento → Queues → + Queue → Add message.', () => val(az().storage).some((s) => val(s.queues).some((q) => (q.mensajes || []).length))],
        ['az-key', 'Crea una clave en Key Vault y rótala', 'Key Vault → Keys → Generate/Import (necesitas el rol Key Vault Crypto Officer) y después Rotate Now.', () => val(az().kv).some((k) => val(k.keys).some((x) => (x.versiones || []).length > 1))],
      ]],
    ] },
    adf: { titulo: 'Retos de Data Factory', niveles: [
      ['Básico', [
        ['adf-ls', 'Crea un linked service a ADLS Gen2 con identidad administrada', 'Manage → Linked services → New. Antes dale el rol en IAM (si no, Test connection falla).', () => studios().some(([, S]) => val(S.linked).some((L) => L.type === 'AzureBlobFS'))],
        ['adf-ds', 'Crea un dataset de origen y uno de destino', 'Author → + → Dataset (dos datasets en contenedores distintos).', () => studios().some(([, S]) => new Set(val(S.datasets).map((d) => d.container + '/' + d.folder)).size >= 2)],
        ['adf-copy', 'Copia archivos con Copy data y pruébalo con Debug', 'Pipeline → Copy data → Source y Sink → Debug: tiene que terminar Succeeded.', () => studios().some(([, S]) => (S.runs || []).some((r) => r.debug && r.estado === 'Succeeded' && r.acts.some((a) => a.type === 'Copy' && a.estado === 'Succeeded')))],
        ['adf-pub', 'Publica los cambios', 'Publish all.', () => studios().some(([, S]) => !!S.publicado)],
      ]],
      ['Intermedio', [
        ['adf-nb', 'Encadena un Notebook de Databricks después de la copia', 'Agrega Notebook y en General → Depends on marca la copia (Upon Success).', () => studios().some(([, S]) => actsDe(S).some((a) => a.type === 'DatabricksNotebook' && (a.dependsOn || []).length))],
        ['adf-trig', 'Ejecuta el pipeline publicado (Trigger now o un trigger)', 'Add trigger → Trigger now, y míralo en Monitor (no cuenta Debug).', () => studios().some(([, S]) => (S.runs || []).some((r) => !r.debug && r.estado === 'Succeeded'))],
        ['adf-param', 'Usa un parámetro del pipeline en una expresión', "Por ejemplo, en el nombre del archivo de destino: ventas_@{pipeline().parameters.fecha}.csv", () => studios().some(([, S]) => JSON.stringify(S.pipelines).includes('pipeline().parameters.'))],
        ['adf-fail', 'Maneja un error con Upon Failure', 'Una actividad que dependa de otra con la condición Upon Failure (por ejemplo, para avisar).', () => studios().some(([, S]) => actsDe(S).some((a) => (a.dependsOn || []).some((d) => d.conditions.includes('Failed'))))],
      ]],
      ['Avanzado', [
        ['adf-foreach', 'Recorre los archivos de una carpeta con Get Metadata + ForEach', "Get Metadata (childItems) → ForEach con Items @activity('Get Metadata1').output.childItems → adentro un Copy con @item().name. Tiene que correr bien.", () => studios().some(([, S]) => (S.runs || []).some((r) => r.estado === 'Succeeded' && r.acts.some((a) => a.type === 'ForEach' && a.estado === 'Succeeded') && r.acts.some((a) => a.type === 'GetMetadata')))],
        ['adf-if', 'Valida con If Condition y corta con Fail si no hay datos', 'If Condition con una expresión booleana y una actividad Fail en una de sus ramas.', () => studios().some(([, S]) => actsDe(S).some((a) => a.type === 'IfCondition' && todasAct([...(a.ifTrueActivities || []), ...(a.ifFalseActivities || [])]).some((x) => x.type === 'Fail')))],
        ['adf-lookup', 'Lee una tabla de configuración con Lookup (todas las filas)', 'Lookup con First row only desmarcado: la salida trae count y value.', () => studios().some(([, S]) => (S.runs || []).some((r) => r.acts.some((a) => a.type === 'Lookup' && a.estado === 'Succeeded' && a.output && Array.isArray(a.output.value))))],
        ['adf-var', 'Guarda un resultado en una variable con Set variable', "Crea la variable en el pipeline (pestaña Variables) y asígnala con una expresión.", () => studios().some(([, S]) => (S.runs || []).some((r) => r.acts.some((a) => a.type === 'SetVariable' && a.estado === 'Succeeded')))],
      ]],
    ] },
    databricks: { titulo: 'Retos de Databricks', niveles: [
      ['Básico', [
        ['dbx-nb', 'Crea un notebook propio', 'Workspace → Create → Notebook.', () => { const W = window.DBX && window.DBX.ws ? window.DBX.ws() : { items: {} }; return ent(W.items).some(([k, it]) => it.tipo === 'notebook' && !/Introducción a Databricks$/.test(k)); }],
        ['dbx-sql', 'Consulta una tabla de samples en el editor SQL', 'SQL Editor → SELECT … FROM samples.tienda.pedidos.', () => hist().some((t) => /\bsamples\./i.test(t) && /^\s*SELECT/i.test(t))],
        ['dbx-tabla', 'Crea una tabla en main.default', 'CREATE TABLE main.default.mi_tabla AS SELECT …', () => tablasUC().some((x) => x.c === 'main' && x.s === 'default')],
      ]],
      ['Intermedio', [
        ['dbx-schema', 'Crea tu propio esquema y una tabla adentro', 'CREATE SCHEMA main.bronze; CREATE TABLE main.bronze.…', () => tablasUC().some((x) => x.s !== 'default' && x.c !== 'samples' && x.s !== 'information_schema')],
        ['dbx-merge', 'Haz un MERGE INTO', 'MERGE INTO destino USING origen ON … WHEN MATCHED … WHEN NOT MATCHED …', () => tablasUC().some((x) => (x.T.versiones || []).some((v) => v.operation === 'MERGE'))],
        ['dbx-tt', 'Consulta una versión anterior de una tabla (time travel)', 'SELECT * FROM tabla VERSION AS OF 1 (mira las versiones con DESCRIBE HISTORY).', () => hist().some((t) => /VERSION\s+AS\s+OF|TIMESTAMP\s+AS\s+OF|@v\d/i.test(t))],
        ['dbx-job', 'Crea un job con dos tareas encadenadas y ejecútalo con éxito', 'Jobs & Pipelines → Create job → dos tareas, la segunda depende de la primera → Run now.', () => val(dbx().jobs).some((j) => ((j.settings || {}).tasks || []).some((t) => (t.depends_on || []).length) && (j.runs || []).some((r) => r.result === 'SUCCESS'))],
      ]],
      ['Avanzado', [
        ['dbx-dlt', 'Ejecuta un pipeline declarativo con una expectativa', 'Jobs & Pipelines → ETL pipeline con CONSTRAINT … EXPECT … → Start: tiene que terminar COMPLETED.', () => { const W = window.DBX && window.DBX.ws ? window.DBX.ws() : {}; return val(W.pipelines).some((P) => /EXPECT\s*\(/i.test(P.fuente || '') && (P.updates || []).some((u) => u.estado === 'COMPLETED')); }],
        ['dbx-cdc', 'Aplica un feed de cambios con AUTO CDC', 'CREATE FLOW … AS AUTO CDC INTO … KEYS … SEQUENCE BY … en un pipeline que termine COMPLETED.', () => { const W = window.DBX && window.DBX.ws ? window.DBX.ws() : {}; return val(W.pipelines).some((P) => /AUTO\s+CDC|APPLY\s+CHANGES/i.test(P.fuente || '') && (P.updates || []).some((u) => u.estado === 'COMPLETED')); }],
        ['dbx-grant', 'Da un permiso con GRANT', 'GRANT SELECT ON TABLE main.default.… TO `analistas`', () => (uc().grants || []).length > 0],
        ['dbx-kv', 'Crea un secret scope respaldado por Azure Key Vault', 'Settings → Secret scopes (o databricks secrets create-scope --scope-backend-type AZURE_KEYVAULT).', () => val(dbx().scopes).some((s) => s.backend === 'AZURE_KEYVAULT')],
      ]],
      ['Gobierno y analítica', [
        ['dbx-udf', 'Crea una función SQL propia', "CREATE FUNCTION main.default.con_iva(precio DOUBLE) RETURNS DOUBLE RETURN precio * 1.21", () => ent(uc().catalogs).some(([, C]) => val(C.schemas).some((S) => Object.keys(S.functions || {}).length))],
        ['dbx-rf', 'Protege una tabla con un filtro de fila', 'Una función que devuelva true/false (por ejemplo con is_account_group_member) y ALTER TABLE … SET ROW FILTER función ON (columna). Mira el efecto en Settings → Groups.', () => tablasUC().some((x) => x.T.filtroFila)],
        ['dbx-mask', 'Oculta una columna sensible con una máscara', 'ALTER TABLE … ALTER COLUMN email SET MASK función (la función recibe el valor y devuelve lo que se muestra).', () => tablasUC().some((x) => Object.keys(x.T.mascaras || {}).length)],
        ['dbx-tags', 'Etiqueta una columna con datos personales', "ALTER TABLE … ALTER COLUMN email SET TAGS ('pii' = 'email'); después búscalo en information_schema.column_tags.", () => tablasUC().some((x) => (x.T.cols || []).some((c) => Object.keys(c.tags || {}).length))],
        ['dbx-st', 'Crea una tabla de streaming y procesa archivos nuevos con REFRESH', "Sube un CSV a un volumen, CREATE OR REFRESH STREAMING TABLE … AS SELECT * FROM STREAM read_files('/Volumes/…'), sube otro archivo y ejecuta REFRESH STREAMING TABLE.", () => tablasUC().some((x) => x.T.st && x.T.st.refrescos.some((r) => r.modo === 'incremental' && r.filas > 0))],
        ['dbx-dash', 'Publica un dashboard con un filtro', 'Dashboards → Create → agrega una visualización y un filtro → Publish.', () => { const W = window.DBX && window.DBX.ws ? window.DBX.ws() : {}; return (W.dashboards || []).some((d) => d.publicado && (d.filtros || []).length); }],
        ['dbx-alerta', 'Crea una alerta y evalúala', 'Alerts → Create alert → Evaluate now.', () => { const W = window.DBX && window.DBX.ws ? window.DBX.ws() : {}; return (W.alertas || []).some((a) => (a.historial || []).length); }],
        ['dbx-genie', 'Enseña a un Genie Agent con una consulta de ejemplo', 'Genie Agents → tu agente → Configure → SQL queries (o "Guardar como ejemplo" en una respuesta correcta).', () => { const W = window.DBX && window.DBX.ws ? window.DBX.ws() : {}; return (W.genie || []).some((g) => (g.ejemplos || []).length); }],
        ['dbx-mlflow', 'Registra un modelo en Unity Catalog y ponle el alias champion', 'Experiments → "Crear notebook de ejemplo", ejecútalo y en Models → Set alias.', () => { const W = window.DBX && window.DBX.ws ? window.DBX.ws() : {}; return val((W.mlflow || {}).modelos).some((m) => Object.keys(m.alias || {}).some((k) => /champion/i.test(k))); }],
      ]],
    ] },
  };

  // GitHub: mira los remotos de la terminal (los mismos que la réplica de github.com)
  const ghRepos = () => { const A = window.Shell && window.Shell.github; return A ? Object.entries(A.remotos()).filter(([u]) => /github\.com/.test(u)).map(([u, r]) => ({ u, r })) : []; };
  const ghPRs = () => ghRepos().flatMap(({ r }) => (r.prs || []).map((p) => ({ r, p })));
  const ghRuns = () => ghRepos().flatMap(({ r }) => r.runs || []);
  const ghSnap = (r) => ((r.commits || {})[(r.branches || {}).main] || {}).snap || {};
  RETOS.github = { titulo: 'Retos de GitHub', niveles: [
    ['Básico', [
      ['gh-repo', 'Crea un repositorio tuyo', 'New repository (o gh repo create en la terminal).', () => ghRepos().some(({ u }) => /github\.com\/alumno\//.test(u))],
      ['gh-push', 'Sube commits desde la terminal a un repositorio tuyo', 'git remote add origin … y git push -u origin main (la página del repo vacío te muestra los comandos).', () => ghRepos().some(({ u, r }) => /\/alumno\//.test(u) && Object.values(r.commits || {}).some((c) => c.author === 'alumno' && c.msg !== 'Initial commit'))],
      ['gh-issue', 'Abre un issue', 'Issues → New issue (o gh issue create --title …).', () => ghRepos().some(({ r }) => (r.issues || []).some((i) => i.autor === 'alumno'))],
      ['gh-web', 'Edita un archivo desde el navegador y haz commit', 'Abre un archivo → lápiz → Commit changes.', () => ghRepos().some(({ r }) => Object.values(r.commits || {}).some((c) => /^(Update|Create|Delete) /.test(c.msg || '')))],
    ]],
    ['Intermedio', [
      ['gh-pr', 'Abre un pull request desde una rama', 'git switch -c mi-rama, commit, git push -u origin mi-rama y Compare & pull request (o gh pr create).', () => ghPRs().some(({ p }) => p.autor === 'alumno')],
      ['gh-rev', 'Consigue una aprobación de Camila o Martín', 'En el PR: Reviewers → engranaje → camila. Revisa que los checks estén en verde.', () => ghPRs().some(({ p }) => (p.revisiones || []).some((v) => v.estado === 'APPROVED'))],
      ['gh-merge', 'Fusiona un pull request', 'Botón Merge pull request (o gh pr merge N).', () => ghPRs().some(({ p }) => p.estado === 'fusionado')],
      ['gh-closes', 'Cierra un issue automáticamente con un PR (Closes #N)', 'Escribe Closes #2 en la descripción del PR y fusiónalo.', () => ghRepos().some(({ r }) => (r.issues || []).some((i) => (i.eventos || []).some((e) => e.tipo === 'cerrado' && e.pr)))],
    ]],
    ['Avanzado', [
      ['gh-ci', 'Agrega un workflow de Actions que termine en verde', 'Actions → New workflow → Python application, o crea .github/workflows/ci.yml con pytest.', () => ghRuns().some((k) => k.conclusion === 'success' && !String(k.archivo).startsWith('dynamic/'))],
      ['gh-rojo', 'Rompe un test a propósito y mira el check en rojo en el PR', 'Cambia una función para que el test falle, haz push a la rama del PR y abre la pestaña Checks.', () => ghRuns().some((k) => k.evento === 'pull_request' && k.conclusion === 'failure')],
      ['gh-prot', 'Protege main: PR obligatorio con el check de tests requerido', 'Settings → Branches → Add rule: Require a pull request + Require status checks (el nombre del job).', () => ghRepos().some(({ r }) => { const P = (r.config || {}).proteccion || {}; return Object.values(P).some((x) => x.requierePR && (x.checks || []).length); })],
      ['gh-conf', 'Resuelve un conflicto de un PR', 'Haz que main y tu rama cambien la misma línea; luego Resolve conflicts en el PR (o git pull origin main en la terminal).', () => ghRepos().some(({ r }) => Object.values(r.commits || {}).some((c) => c.parent2 && /^Merge (branch|remote-tracking branch) /.test(c.msg || '')))],
      ['gh-secret', 'Usa un secreto en un workflow (aparece como *** en el log)', 'Settings → Secrets → New repository secret, y en el YAML: ${{ secrets.NOMBRE }}.', () => ghRuns().some((k) => (k.jobs || []).some((j) => (j.pasos || []).some((p) => (p.log || []).some((l) => String(l).includes('***')))))],
      ['gh-pages', 'Publica un sitio con GitHub Pages', 'Sube un index.html y en Settings → Pages elige Deploy from a branch.', () => ghRepos().some(({ r }) => r.config && r.config.pages && r.config.pages.sitio)],
    ]],
  ] };

  // Snowflake: mira el estado de la réplica (historial de consultas, warehouses, stages y permisos)
  const sfS = () => (Store && Store.data.snowflake) || { historial: [], warehouses: {}, stages: {}, grants: [], roles: {} };
  const sfOk = (re) => (sfS().historial || []).some((h) => h.estado === 'Succeeded' && re.test(h.sql));
  RETOS.snowflake = { titulo: 'Retos de Snowflake', niveles: [
    ['Básico', [
      ['sf-run', 'Ejecuta una consulta que devuelva filas', 'Abre una hoja (Worksheets → + SQL Worksheet) y ejecuta un SELECT con Ctrl+Enter.', () => (sfS().historial || []).some((h) => h.estado === 'Succeeded' && /^\s*SELECT/i.test(h.sql) && h.filas > 0)],
      ['sf-wh', 'Crea tu propio warehouse X-Small con AUTO_SUSPEND de 60 segundos', "CREATE WAREHOUSE mi_wh WAREHOUSE_SIZE = 'XSMALL' AUTO_SUSPEND = 60; (o Warehouses → + Warehouse).", () => Object.values(sfS().warehouses || {}).some((w) => w.nombre !== 'COMPUTE_WH' && w.autoSuspend && w.autoSuspend <= 60)],
      ['sf-susp', 'Suspende un warehouse a mano', 'ALTER WAREHOUSE mi_wh SUSPEND; (o el botón Suspend en Warehouses).', () => sfOk(/^\s*ALTER\s+WAREHOUSE\s+\S+\s+SUSPEND/i)],
      ['sf-ctx', 'Cambia el contexto de la hoja con USE SCHEMA', 'USE SCHEMA TIENDA_ANDINA.PUBLIC; (o el selector base.esquema de la hoja).', () => sfOk(/^\s*USE\s+SCHEMA/i)],
    ]],
    ['Intermedio', [
      ['sf-db', 'Crea una base y un esquema propios', 'CREATE DATABASE analitica; CREATE SCHEMA staging;', () => sfOk(/^\s*CREATE\s+(OR\s+REPLACE\s+)?DATABASE/i) && sfOk(/^\s*CREATE\s+(OR\s+REPLACE\s+)?SCHEMA/i)],
      ['sf-stage', 'Crea un stage y sube al menos un archivo', 'CREATE STAGE carga; luego Databases → el stage → + Files o Archivos de ejemplo.', () => Object.values(sfS().stages || {}).some((x) => Object.keys(x.archivos || {}).length)],
      ['sf-copy', 'Carga un archivo del stage a una tabla con COPY INTO', "COPY INTO tabla FROM @carga FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);", () => sfOk(/^\s*COPY\s+INTO/i)],
      ['sf-skip', 'Repite el mismo COPY INTO y comprueba que no duplica filas', 'Ejecútalo otra vez: los archivos ya cargados aparecen como LOAD_SKIPPED.', () => (sfS().historial || []).filter((h) => h.estado === 'Succeeded' && /^\s*COPY\s+INTO/i.test(h.sql)).length >= 2],
    ]],
    ['Avanzado', [
      ['sf-tt', 'Consulta una tabla como estaba antes de un cambio (Time Travel)', "SELECT * FROM t BEFORE(STATEMENT => '<Query ID>'); el ID está en Query History.", () => sfOk(/\b(BEFORE|AT)\s*\(\s*(STATEMENT|OFFSET|TIMESTAMP)\s*=>/i)],
      ['sf-undrop', 'Borra una tabla y recupérala con UNDROP', 'DROP TABLE t; UNDROP TABLE t;', () => sfOk(/^\s*UNDROP\s+TABLE/i)],
      ['sf-clone', 'Clona una tabla para tener una copia de pruebas', 'CREATE TABLE ventas_dev CLONE ventas;', () => sfOk(/\bCLONE\b/i)],
      ['sf-rol', 'Crea un rol con permiso de lectura sobre un esquema', 'USE ROLE SECURITYADMIN; CREATE ROLE analista; GRANT USAGE ON WAREHOUSE/DATABASE/SCHEMA … ; GRANT SELECT ON ALL TABLES IN SCHEMA … TO ROLE analista;', () => (sfS().grants || []).some((g) => g.priv === 'SELECT' && (sfS().roles || {})[g.a])],
      ['sf-usar-rol', 'Ejecuta una consulta con tu rol nuevo (no ACCOUNTADMIN ni SYSADMIN)', 'GRANT ROLE analista TO USER alumno; USE ROLE analista; y luego un SELECT sobre una tabla a la que le diste permiso.', () => (sfS().historial || []).some((h) => h.estado === 'Succeeded' && /^\s*SELECT/i.test(h.sql) && (sfS().roles || {})[h.rol])],
    ]],
  ] };

  // Retos que cruzan herramientas: cada réplica deja una marca cuando otra la usa de verdad
  const cruce = (k) => !!(Store && Store.data.cruces && Store.data.cruces[k]);
  const cruceAirflow = () => { const M = window.Shell && window.Shell.Machine; return !!(M && M.cloud && M.cloud.airflow && M.cloud.airflow.cruces && M.cloud.airflow.cruces.airflowDatabricks); };
  RETOS.databricks.niveles.push(['Con otras herramientas', [
    ['dbx-airflow', 'Dispara un job de Databricks desde un DAG de Airflow', 'En Airflow: conexión databricks_default y un DAG con DatabricksRunNowOperator(job_id=…). La corrida aparece en Jobs & Pipelines → Runs con trigger API.', cruceAirflow],
    ['dbx-pbi', 'Importa en Power BI una tabla de tu Unity Catalog', 'En Power BI: Obtener datos → Azure Databricks → marca la tabla → Cargar.', () => cruce('pbiDatabricks')],
  ]]);
  RETOS.snowflake.niveles.push(['Con otras herramientas', [
    ['sf-pbi', 'Importa en Power BI una tabla de Snowflake', 'En Power BI: Obtener datos → Snowflake → elige warehouse y base → Cargar. La consulta queda en Query History.', () => cruce('pbiSnowflake')],
  ]]);

  // BigQuery: mira el historial de jobs y los metadatos de las tablas de la réplica
  const bqS = () => (Store && Store.data.bigquery) || { jobs: [], meta: {} };
  const bqJ = (f) => (bqS().jobs || []).some((j) => j.estado === 'DONE' && f(j));
  RETOS.bigquery = { titulo: 'Retos de BigQuery', niveles: [
    ['Básico', [
      ['bq-run', 'Ejecuta una consulta que devuelva filas', 'Studio → escribe un SELECT sobre tienda.pedidos → Run (Ctrl+Enter).', () => bqJ((j) => j.tipo === 'QUERY' && /^\s*(SELECT|WITH)/i.test(j.sql) && j.filas > 0)],
      ['bq-cols', 'Procesa menos bytes nombrando solo las columnas que necesitas', 'Compara el validador con SELECT * y con SELECT canal, estado. Ejecuta la segunda.', () => bqJ((j) => j.tipo === 'QUERY' && !j.estrella && j.procesado > 0 && (j.tablas || []).some((t) => !t.todas && t.columnas > 0))],
      ['bq-count', 'Cuenta las filas de una tabla sin procesar ni un byte', 'SELECT COUNT(*) FROM tienda.pedidos: BigQuery lo responde con los metadatos.', () => bqJ((j) => /COUNT\(\s*\*\s*\)/i.test(j.sql) && j.procesado === 0 && !j.cache && (j.tablas || []).length > 0)],
      ['bq-cache', 'Ejecuta dos veces la misma consulta y mira la caché', 'La segunda vez dice "results cached" y procesa 0 B.', () => bqJ((j) => j.cache)],
    ]],
    ['Intermedio', [
      ['bq-part', 'Filtra por la columna de partición y lee solo una parte de la tabla', "WHERE fecha_pedido >= '2024-06-01' sobre tienda.pedidos. En Job information verás el porcentaje leído.", () => bqJ((j) => (j.tablas || []).some((t) => t.particion && t.fraccion < 1 && t.columnas > 0))],
      ['bq-ds', 'Crea un dataset', 'El + del Explorer, o CREATE SCHEMA analitica;', () => bqJ((j) => /^\s*CREATE\s+SCHEMA/i.test(j.sql))],
      ['bq-ctas', 'Crea una tabla particionada', 'CREATE TABLE analitica.ventas (…) PARTITION BY fecha; o CREATE TABLE … PARTITION BY … AS SELECT …', () => Object.values(bqS().meta || {}).some((m) => m.particion && !m.inicial)],
      ['bq-load', 'Carga un archivo a una tabla nueva', 'Abre un dataset → Create table → sube un CSV o usa el archivo de ejemplo.', () => bqJ((j) => j.tipo === 'LOAD')],
    ]],
    ['Avanzado', [
      ['bq-cluster', 'Crea una tabla con clustering', 'CREATE TABLE … PARTITION BY fecha CLUSTER BY pais …', () => Object.values(bqS().meta || {}).some((m) => (m.cluster || []).length && !m.inicial)],
      ['bq-req', 'Exige el filtro de partición y comprueba que la consulta sin filtro se rechaza', 'OPTIONS(require_partition_filter = TRUE) y después un SELECT sin WHERE sobre esa tabla.', () => (bqS().jobs || []).some((j) => j.estado === 'FAILED' && /partition elimination/i.test(j.error || ''))],
      ['bq-dml', 'Modifica filas con UPDATE o DELETE (con WHERE)', 'BigQuery rechaza un UPDATE o DELETE sin WHERE.', () => bqJ((j) => /^\s*(UPDATE|DELETE)\b/i.test(j.sql))],
      ['bq-pbi', 'Importa en Power BI una tabla de BigQuery', 'En Power BI: Obtener datos → Google BigQuery → marca la tabla → Cargar. Queda como un job en Job history.', () => cruce('pbiBigQuery')],
    ]],
  ] };

  // JupyterLab: mira el historial de celdas ejecutadas, los archivos y los eventos de la réplica
  const jpS = () => (Store && Store.data.jupyter) || { archivos: {}, hist: [], eventos: {} };
  const jpH = (f) => (jpS().hist || []).some((x) => f(x.code || '', x.tipos || []));
  const jpOk = (t) => !t.some((x) => x.startsWith('error'));
  const jpNb = (f) => Object.entries(jpS().archivos || {}).some(([r, a]) => /\.ipynb$/.test(r) && (() => { try { return f(JSON.parse(a.t), r); } catch (e) { return false; } })());
  const jpSrc = (c) => (Array.isArray(c.source) ? c.source.join('') : c.source || '');
  RETOS.jupyter = { titulo: 'Retos de JupyterLab', niveles: [
    ['Básico', [
      ['jp-nb', 'Crea un notebook nuevo', 'Launcher → Notebook → Python 3 (ipykernel), o File → New Notebook.', () => (jpS().eventos || {}).nuevoNb > 0],
      ['jp-print', 'Ejecuta una celda que imprima algo', 'Escribe print("hola") y presiona Shift+Enter.', () => jpH((c, t) => /print\s*\(/.test(c) && t.includes('stream') && jpOk(t))],
      ['jp-md', 'Escribe una celda Markdown con un título', 'Esc → M convierte la celda en Markdown. Escribe # Mi análisis y ejecútala con Shift+Enter.', () => jpNb((nb, r) => r !== 'Bienvenida.ipynb' && nb.cells.some((c) => c.cell_type === 'markdown' && /^#\s+\S/m.test(jpSrc(c))))],
      ['jp-csv', 'Lee un CSV con pandas y muestra la tabla', 'pd.read_csv("datos/clientes.csv") y deja el DataFrame como última línea de la celda (o usa .head()).', () => jpH((c, t) => /read_csv\(/.test(c) && t.includes('html') && jpOk(t))],
    ]],
    ['Intermedio', [
      ['jp-group', 'Agrupa con pandas', 'Por ejemplo pedidos.groupby("canal").size() o .agg(...).', () => jpH((c, t) => /\.groupby\(/.test(c) && jpOk(t) && t.length > 0)],
      ['jp-plot', 'Dibuja un gráfico', 'Con .plot(...) de pandas o con matplotlib.pyplot. Aparece como imagen debajo de la celda.', () => jpH((c, t) => t.includes('imagen'))],
      ['jp-save', 'Guarda un resultado en un archivo nuevo', 'df.to_csv("resultado.csv", index=False). Aparece en el explorador de archivos.', () => Object.keys(jpS().archivos || {}).some((r) => /\.(csv|json|txt)$/i.test(r))],
      ['jp-magic', 'Usa un comando mágico o de shell', '%timeit, %pwd, %ls o !head datos/clientes.csv', () => jpH((c, t) => /^\s*(%|!)\w/m.test(c) && jpOk(t))],
    ]],
    ['Avanzado', [
      ['jp-restart', 'Reinicia el kernel y ejecuta todo de nuevo', 'Kernel → Restart Kernel and Run All Cells… (el botón ⏩ de la barra). Así compruebas que el notebook corre de arriba abajo.', () => (jpS().eventos || {}).reiniciarTodo > 0],
      ['jp-modulo', 'Importa una función de un archivo .py tuyo', 'Crea utilidades.py (File → New Python File, o %%writefile utilidades.py) y después: from utilidades import ...', () => Object.keys(jpS().archivos || {}).some((r) => /\.py$/.test(r)) && jpH((c, t) => /^\s*(from\s+\w+\s+import|import\s+\w+)/m.test(c) && jpOk(t) && Object.keys(jpS().archivos || {}).some((r) => /\.py$/.test(r) && new RegExp('\\b' + r.replace(/\.py$/, '').split('/').pop() + '\\b').test(c)))],
      ['jp-limpiar', 'Limpia clientes_crudo.csv: sin duplicados y emails en minúscula', 'drop_duplicates(), str.strip().str.lower() y guarda el resultado con to_csv.', () => jpH((c, t) => /clientes_crudo/.test(c) && /drop_duplicates/.test(c) && /lower\(\)/.test(c) && jpOk(t))],
      ['jp-descarga', 'Descarga tu notebook en formato .ipynb', 'File → Download, o clic derecho en el archivo → Download. Se abre igual en un JupyterLab real.', () => (jpS().eventos || {}).descarga > 0],
    ]],
  ] };

  // Airflow: mira el estado de la réplica (corridas, eventos del registro de auditoría, variables y conexiones)
  const afS = () => { const M = window.Shell && window.Shell.Machine; return (M && M.cloud && M.cloud.airflow) || { runs: {}, eventos: [], vars: {}, conns: {}, assetEv: [] }; };
  const afEv = (t) => (afS().eventos || []).some((e) => e.evento === t);
  const afRuns = (f) => Object.entries(afS().runs || {}).some(([dag, rs]) => (Array.isArray(rs) ? rs : Object.values(rs || {})).some((r) => f(dag, r)));
  const AF_EJEMPLOS = ['ventas_diarias', 'reporte_ventas', 'ingesta_api', 'conciliacion_pagos'];
  RETOS.airflow = { titulo: 'Retos de Airflow', niveles: [
    ['Básico', [
      ['af-unpause', 'Despausa un DAG', 'En Dags, el interruptor de la izquierda. Los DAGs nuevos empiezan pausados.', () => afEv('unpaused')],
      ['af-trigger', 'Dispara un DAG a mano', 'El botón ▶ (Trigger) de la fila, o airflow dags trigger <dag_id> en la terminal.', () => afEv('trigger')],
      ['af-ok', 'Consigue una corrida completa en verde', 'Prueba con ventas_diarias: despáusalo y dispáralo. Mira la Grid.', () => afRuns((d, r) => r.state === 'success')],
      ['af-var', 'Crea una variable', 'Admin → Variables → +, o airflow variables set mi_variable 10.', () => Object.keys(afS().vars || {}).some((k) => !['umbral_alerta', 'entorno'].includes(k))],
    ]],
    ['Intermedio', [
      ['af-fix', 'Arregla conciliacion_pagos y consigue que termine bien', 'Dispáralo, lee el log de la tarea que falla y corrige el archivo en ~/airflow/dags con nano o vim.', () => afRuns((d, r) => d === 'conciliacion_pagos' && r.state === 'success')],
      ['af-clear', 'Vuelve a correr una tarea con Clear', 'Clic en el cuadro de la tarea en la Grid → Clear.', () => afEv('clear')],
      ['af-conn', 'Crea una conexión', 'Admin → Connections → +, o airflow connections add …', () => Object.keys(afS().conns || {}).some((k) => k !== 'postgres_tienda')],
      ['af-asset', 'Haz que un DAG dispare a otro por datos (assets)', 'Despausa reporte_ventas y corre ventas_diarias: al actualizar el asset, el segundo arranca solo.', () => afRuns((d, r) => d === 'reporte_ventas' && r.state === 'success' && r.tipo !== 'manual')],
    ]],
    ['Avanzado', [
      ['af-propio', 'Escribe tu propio DAG y consigue una corrida en verde', 'Crea un archivo .py en ~/airflow/dags con un dag_id nuevo. Aparece en la lista al analizarse.', () => afRuns((d, r) => !AF_EJEMPLOS.includes(d) && r.state === 'success')],
      ['af-backfill', 'Rellena fechas pasadas con un backfill', 'En el DAG: Trigger → Backfill, con un rango de fechas.', () => afEv('backfill') || afRuns((d, r) => r.tipo === 'backfill')],
      ['af-dbx', 'Dispara un job de Databricks desde un DAG', 'Conexión databricks_default y un DAG con DatabricksRunNowOperator(job_id=…). Sigue el proyecto integrador.', cruceAirflow],
    ]],
  ] };

  // Fabric: mira los workspaces y sus ítems
  const fbS = () => (Store && Store.data.fabric) || { ws: {}, runs: [] };
  const fbItems = () => Object.values(fbS().ws || {}).flatMap((w) => Object.values(w.items || {}));
  const fbHay = (tipo, f = () => true) => fbItems().some((i) => i.tipo === tipo && f(i));
  const fbRun = (tipo) => (fbS().runs || []).some((r) => r.tipo === tipo && r.estado === 'Succeeded');
  RETOS.fabric = { titulo: 'Retos de Microsoft Fabric', niveles: [
    ['Básico', [
      ['fb-ws', 'Crea un workspace', 'Workspaces → New workspace.', () => Object.values(fbS().ws || {}).some((w) => !w.personal)],
      ['fb-lh', 'Crea un lakehouse', 'En el workspace: + New item → Lakehouse.', () => fbHay('lakehouse')],
      ['fb-tabla', 'Deja una tabla Delta en el lakehouse', 'Sube un CSV a Files y usa Load to Tables, o carga los datos de ejemplo.', () => fbHay('lakehouse', (i) => Object.keys(i.tablas || {}).length > 0)],
      ['fb-sql', 'Guarda una consulta en el SQL analytics endpoint', 'En el lakehouse, cambia a SQL analytics endpoint y crea una New SQL query.', () => fbHay('lakehouse', (i) => (i.consultas || []).some((q) => (q.sql || '').trim().length > 10))],
    ]],
    ['Intermedio', [
      ['fb-wh', 'Crea un warehouse con al menos una tabla', '+ New item → Warehouse, y crea la tabla con T-SQL (CREATE TABLE … AS SELECT) o con los datos de ejemplo.', () => fbHay('warehouse', (i) => Object.keys(i.tablas || {}).length > 0)],
      ['fb-nb', 'Ejecuta una celda en un notebook', '+ New item → Notebook, elige el lakehouse y ejecuta una celda de PySpark.', () => fbRun('Notebook')],
      ['fb-pipe', 'Arma un pipeline con una actividad', '+ New item → Pipeline → Copy data o Notebook.', () => fbHay('pipeline', (i) => (i.acts || []).length > 0)],
      ['fb-run', 'Ejecuta el pipeline y míralo en Monitor', 'Run en el pipeline; después abre Monitor.', () => fbRun('Pipeline')],
    ]],
    ['Avanzado', [
      ['fb-atajo', 'Crea un shortcut a una tabla de otro lakehouse', 'En el lakehouse: New shortcut. El atajo no copia los datos.', () => fbHay('lakehouse', (i) => (i.atajos || []).length > 0)],
      ['fb-sm', 'Crea un modelo semántico', 'Desde el lakehouse o el warehouse: New semantic model.', () => fbHay('semanticmodel')],
      ['fb-git', 'Conecta el workspace a Git', 'Workspace settings → Git integration (necesitas un repositorio tuyo en el GitHub de práctica).', () => Object.values(fbS().ws || {}).some((w) => w.git)],
      ['fb-pbi', 'Importa en Power BI una tabla de Fabric', 'En Power BI: Obtener datos → Lakehouses y warehouses de Fabric.', () => cruce('pbiFabric')],
    ]],
  ] };

  let Store = null;
  const hechos = () => { if (!Store) return {}; Store.data.retosHerr = Store.data.retosHerr || {}; return Store.data.retosHerr; };
  function revisar(id) {
    const R = RETOS[id]; const H = hechos(); let nuevos = 0;
    for (const [, lista] of R.niveles) for (const [k, , , f] of lista) { if (H[k]) continue; let ok = false; try { ok = !!f(); } catch (e) { ok = false; } if (ok) { H[k] = Date.now(); nuevos++; } }
    if (nuevos && Store) { try { Store.saveSoon ? Store.saveSoon() : Store.save(); } catch (e) { /* sin almacenamiento */ } }
    return nuevos;
  }
  const total = (id) => RETOS[id].niveles.reduce((s, [, l]) => s + l.length, 0);
  const hechosDe = (id) => RETOS[id].niveles.reduce((s, [, l]) => s + l.filter(([k]) => hechos()[k]).length, 0);
  let timer = null, abierto = false, actual = null;
  function pintar() {
    const id = actual; if (!id) return;
    let b = document.getElementById('retosHerrBtn');
    if (!b) { b = document.createElement('button'); b.id = 'retosHerrBtn'; b.className = 'rh-btn'; document.body.append(b); b.onclick = () => { abierto = !abierto; pintar(); }; }
    const nuevos = revisar(id);
    b.innerHTML = `🎯 Retos <b>${hechosDe(id)}/${total(id)}</b>`;
    if (nuevos) { b.classList.remove('rh-pulso'); void b.offsetWidth; b.classList.add('rh-pulso'); }
    let p = document.getElementById('retosHerrPanel');
    if (!abierto) { if (p) p.remove(); return; }
    if (!p) { p = document.createElement('div'); p.id = 'retosHerrPanel'; p.className = 'rh-panel'; document.body.append(p); }
    const H = hechos(); const R = RETOS[id];
    p.innerHTML = `<div class="rh-cab"><b>${esc(R.titulo)}</b><button data-rh-x title="Cerrar">✕</button></div><p class="rh-dim">Se corrigen solos mirando cómo quedó la herramienta. Haz clic en un reto para ver una pista.</p>${R.niveles.map(([n, lista]) => `<div class="rh-nivel"><div class="rh-nivel-t">${esc(n)} <span>${lista.filter(([k]) => H[k]).length}/${lista.length}</span></div>${lista.map(([k, t, pista]) => `<details class="rh-reto ${H[k] ? 'ok' : ''}"><summary><span class="rh-check">${H[k] ? '✓' : '○'}</span>${esc(t)}</summary><p>${esc(pista)}</p></details>`).join('')}</div>`).join('')}`;
    p.querySelector('[data-rh-x]').onclick = () => { abierto = false; pintar(); };
  }
  function montar(id, store) {
    Store = store || Store; actual = id;
    pintar();
    clearInterval(timer); timer = setInterval(() => { if (!document.getElementById('retosHerrBtn')) return; const det = document.querySelectorAll('#retosHerrPanel details[open]').length; if (!det) pintar(); else { const b = document.getElementById('retosHerrBtn'); revisar(actual); b.innerHTML = `🎯 Retos <b>${hechosDe(actual)}/${total(actual)}</b>`; } }, 2000);
  }
  function desmontar() { clearInterval(timer); timer = null; actual = null; abierto = false; ['retosHerrBtn', 'retosHerrPanel'].forEach((x) => { const e = document.getElementById(x); if (e) e.remove(); }); }
  window.addEventListener('hashchange', () => {
    const h = location.hash;
    const id = /^#\/azure\/studio\//.test(h) ? 'adf' : /^#\/azure/.test(h) ? 'azure' : /^#\/databricks/.test(h) ? 'databricks' : /^#\/github/.test(h) ? 'github' : /^#\/jupyter/.test(h) ? 'jupyter' : null;
    if (!id) desmontar(); else if (id !== actual && Store) montar(id);
  });
  window.RetosHerramientas = { montar, desmontar, RETOS, resumen: () => Object.keys(RETOS).map((id) => ({ id, titulo: RETOS[id].titulo, hechos: hechosDe(id), total: total(id) })), _revisar: revisar };
})();
