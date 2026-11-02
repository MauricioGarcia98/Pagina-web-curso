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
    const id = /^#\/azure\/studio\//.test(h) ? 'adf' : /^#\/azure/.test(h) ? 'azure' : /^#\/databricks/.test(h) ? 'databricks' : /^#\/github/.test(h) ? 'github' : null;
    if (!id) desmontar(); else if (id !== actual && Store) montar(id);
  });
  window.RetosHerramientas = { montar, desmontar, RETOS, resumen: () => Object.keys(RETOS).map((id) => ({ id, titulo: RETOS[id].titulo, hechos: hechosDe(id), total: total(id) })), _revisar: revisar };
})();
