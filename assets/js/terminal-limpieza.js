/* Comandos de limpieza y de consulta que faltaban en las CLIs de nube simuladas.
 * Al final de cada laboratorio se borra lo que se creó (para no pagar de más en una cuenta real):
 * estos comandos borran de verdad el estado simulado y responden igual que la CLI real.
 * Se agregan "por encima" de terminal-cloud.js y terminal-cloud-ia.js: lo que no se maneja acá sigue
 * al comando original. */
(function () {
  'use strict';
  const Sh = window.Shell, CS = window.CloudSim;
  if (!Sh || !CS) return;
  const { def, col, ok, Commands } = Sh;
  const { args, output, fail, now, save } = CS;
  const extender = (nombre, fn) => {
    const previo = Commands[nombre]; if (!previo) return;
    def(nombre, null, async (a, ctx) => { const r = await fn(a, ctx, previo); return r === undefined ? previo(a, ctx) : r; });
  };

  // ================================================================== AWS
  extender('aws', async (a, ctx) => {
    const s = CS.aws(); const A = args(a, ['--force', '--recursive-delete-option']); const p = A.pos;
    if (!p.length) return undefined;
    const out = (d) => output(d, A, s.output, 'aws');
    const err = (code, op, msg) => fail(`An error occurred (${code}) when calling the ${op} operation: ${msg}`, 254);
    const falta = (...ns) => { const f = ns.filter((n) => !A.get(n) || A.get(n) === true); return f.length ? fail(`aws: error: the following arguments are required: ${f.join(', ')}`, 252) : null; };
    const k = p[0] + ' ' + (p[1] || '');
    s.roles = s.roles || {}; s.rules = s.rules || {}; s.alarms = s.alarms || {}; s.kms = s.kms || { keys: {}, aliases: {} };
    s.glueDbs = s.glueDbs || {}; s.crawlers = s.crawlers || {}; s.dq = s.dq || { rulesets: {}, results: {} }; s.workgroups = s.workgroups || {};
    switch (k) {
      // ---- IAM
      case 'iam put-role-policy': { const e = falta('--role-name', '--policy-name', '--policy-document'); if (e) return e; const r = s.roles[A.get('--role-name')]; if (!r) return err('NoSuchEntity', 'PutRolePolicy', `The role with name ${A.get('--role-name')} cannot be found.`); r.inline = r.inline || {}; r.inline[A.get('--policy-name')] = A.get('--policy-document'); save(); return ok(''); }
      case 'iam delete-role-policy': { const r = s.roles[A.get('--role-name')]; if (!r || !(r.inline || {})[A.get('--policy-name')]) return err('NoSuchEntity', 'DeleteRolePolicy', `The role policy with name ${A.get('--policy-name')} cannot be found.`); delete r.inline[A.get('--policy-name')]; save(); return ok(''); }
      case 'iam list-role-policies': { const r = s.roles[A.get('--role-name')]; if (!r) return err('NoSuchEntity', 'ListRolePolicies', `The role with name ${A.get('--role-name')} cannot be found.`); return out({ PolicyNames: Object.keys(r.inline || {}) }); }
      case 'iam detach-role-policy': { const r = s.roles[A.get('--role-name')]; if (!r) return err('NoSuchEntity', 'DetachRolePolicy', `The role with name ${A.get('--role-name')} cannot be found.`); r.attached = (r.attached || []).filter((x) => x !== A.get('--policy-arn')); save(); return ok(''); }
      case 'iam delete-role': { const n = A.get('--role-name'); const r = s.roles[n]; if (!r) return err('NoSuchEntity', 'DeleteRole', `The role with name ${n} cannot be found.`); if (Object.keys(r.inline || {}).length) return err('DeleteConflict', 'DeleteRole', 'Cannot delete entity, must delete policies first.'); delete s.roles[n]; save(); return ok(''); }
      case 'iam get-role': { const n = A.get('--role-name'); if (!s.roles[n]) return err('NoSuchEntity', 'GetRole', `The role with name ${n} cannot be found.`); return out({ Role: { RoleName: n, Arn: `arn:aws:iam::${s.account}:role/${n}`, CreateDate: now() } }); }
      // ---- Glue
      case 'glue delete-crawler': { const n = A.get('--name'); if (!s.crawlers[n]) return err('EntityNotFoundException', 'DeleteCrawler', `Crawler entry with name ${n} does not exist`); delete s.crawlers[n]; save(); return ok(''); }
      case 'glue delete-database': { const n = A.get('--name'); if (!s.glueDbs[n]) return err('EntityNotFoundException', 'DeleteDatabase', `Database ${n} not found.`); delete s.glueDbs[n]; save(); return ok(''); }
      case 'glue delete-data-quality-ruleset': { const n = A.get('--name'); if (!s.dq.rulesets[n]) return err('EntityNotFoundException', 'DeleteDataQualityRuleset', `Ruleset ${n} not found.`); delete s.dq.rulesets[n]; save(); return ok(''); }
      case 'glue delete-job': { const n = A.get('--job-name'); if (s.glueJobs) delete s.glueJobs[n]; save(); return out({ JobName: n }); }
      // ---- Athena
      case 'athena delete-work-group': { const n = A.get('--work-group'); if (!s.workgroups[n]) return err('InvalidRequestException', 'DeleteWorkGroup', 'WorkGroup is not found.'); if (n === 'primary') return err('InvalidRequestException', 'DeleteWorkGroup', 'Cannot delete the primary workgroup.'); delete s.workgroups[n]; save(); return ok(''); }
      // ---- EventBridge
      case 'events remove-targets': { const r = s.rules[A.get('--rule')]; if (!r) return err('ResourceNotFoundException', 'RemoveTargets', `Rule ${A.get('--rule')} does not exist on EventBus default.`); const n = r.targets.length; r.targets = []; save(); return out({ FailedEntryCount: 0, FailedEntries: [], RemovedCount: n }); }
      case 'events delete-rule': { const n = A.get('--name'); const r = s.rules[n]; if (!r) return ok(''); if (r.targets && r.targets.length) return err('ValidationException', 'DeleteRule', 'Rule can\'t be deleted since it has targets.'); delete s.rules[n]; save(); return ok(''); }
      case 'events describe-rule': { const r = s.rules[A.get('--name')]; if (!r) return err('ResourceNotFoundException', 'DescribeRule', `Rule ${A.get('--name')} does not exist.`); return out({ Name: A.get('--name'), ScheduleExpression: r.schedule, EventPattern: r.pattern, State: 'ENABLED' }); }
      // ---- CloudWatch
      case 'cloudwatch delete-alarms': { const ns = [].concat(A.get('--alarm-names') || []).flatMap((x) => String(x).split(/\s+/)); ns.forEach((n) => delete s.alarms[n]); for (let i = p.length; i-- > 2;) delete s.alarms[p[i]]; save(); return ok(''); }
      // ---- KMS
      case 'kms delete-alias': { const n = A.get('--alias-name'); if (!s.kms.aliases[n]) return err('NotFoundException', 'DeleteAlias', `Alias arn:aws:kms:${s.region}:${s.account}:${n} is not found.`); delete s.kms.aliases[n]; save(); return ok(''); }
      case 'kms schedule-key-deletion': {
        const id = A.get('--key-id'); const dias = Number(A.get('--pending-window-in-days') || 30);
        if (!s.kms.keys[id]) return err('NotFoundException', 'ScheduleKeyDeletion', `Key 'arn:aws:kms:${s.region}:${s.account}:key/${id}' does not exist`);
        if (dias < 7 || dias > 30) return err('ValidationException', 'ScheduleKeyDeletion', 'PendingWindowInDays must be between 7 and 30.');
        s.kms.keys[id].estado = 'PendingDeletion'; save();
        return out({ KeyId: `arn:aws:kms:${s.region}:${s.account}:key/${id}`, DeletionDate: new Date(Date.now() + dias * 864e5).toISOString(), KeyState: 'PendingDeletion', PendingWindowInDays: dias });
      }
      case 'kms cancel-key-deletion': { const id = A.get('--key-id'); if (!s.kms.keys[id]) return err('NotFoundException', 'CancelKeyDeletion', 'Key does not exist'); s.kms.keys[id].estado = 'Disabled'; save(); return out({ KeyId: id }); }
      // ---- Bedrock (bases de conocimiento)
      case 'bedrock-agent delete-data-source': {
        const B = (s.bedrock || { kbs: {} }); const kb = B.kbs[A.get('--knowledge-base-id')];
        if (!kb) return err('ResourceNotFoundException', 'DeleteDataSource', `Knowledge base ${A.get('--knowledge-base-id')} not found.`);
        if (!kb.sources || !kb.sources[A.get('--data-source-id')]) return err('ResourceNotFoundException', 'DeleteDataSource', `Data source ${A.get('--data-source-id')} not found.`);
        delete kb.sources[A.get('--data-source-id')]; save();
        return out({ knowledgeBaseId: A.get('--knowledge-base-id'), dataSourceId: A.get('--data-source-id'), status: 'DELETING' });
      }
      // ---- etiquetas: qué recursos quedaron con una etiqueta (para no olvidar nada al limpiar)
      case 'resourcegroupstaggingapi get-resources': {
        const filtro = String(A.get('--tag-filters') || ''); const clave = (filtro.match(/Key=([^,\s]+)/) || [])[1]; const valores = ((filtro.match(/Values=([^\s]+)/) || [])[1] || '').split(',').filter(Boolean);
        const recursos = [];
        for (const [n, b] of Object.entries(s.buckets || {})) { const t = b.tags || {}; if (!clave || (t[clave] !== undefined && (!valores.length || valores.includes(t[clave])))) if (b.tags) recursos.push({ ResourceARN: `arn:aws:s3:::${n}`, Tags: Object.entries(t).map(([Key, Value]) => ({ Key, Value })) }); }
        return out({ ResourceTagMappingList: recursos });
      }
      case 's3api put-bucket-tagging': { const b = (s.buckets || {})[A.get('--bucket')]; if (!b) return err('NoSuchBucket', 'PutBucketTagging', 'The specified bucket does not exist'); const t = String(A.get('--tagging') || ''); b.tags = {}; for (const m of t.matchAll(/Key=([^,}\]]+),Value=([^,}\]]+)/g)) b.tags[m[1].replace(/["']/g, '')] = m[2].replace(/["']/g, ''); for (const m of t.matchAll(/"Key"\s*:\s*"([^"]+)"\s*,\s*"Value"\s*:\s*"([^"]+)"/g)) b.tags[m[1]] = m[2]; save(); return ok(''); }
      case 's3api get-bucket-tagging': { const b = (s.buckets || {})[A.get('--bucket')]; if (!b) return err('NoSuchBucket', 'GetBucketTagging', 'The specified bucket does not exist'); if (!b.tags) return err('NoSuchTagSet', 'GetBucketTagging', 'The TagSet does not exist'); return out({ TagSet: Object.entries(b.tags).map(([Key, Value]) => ({ Key, Value })) }); }
      default: return undefined;
    }
  });

  // ================================================================== Google Cloud
  extender('gcloud', async (a, ctx) => {
    const s = CS.gcp(); const A = args(a, ['--quiet', '-q']); const p = A.pos;
    if (!p.length) return undefined;
    const proj = A.get('--project') || s.project;
    const nf = (cmd, que) => fail(`ERROR: (gcloud.${cmd}) NOT_FOUND: ${que} not found.`);
    const k = p.slice(0, 3).join(' ');
    // un argumento posicional vacío (por ejemplo una variable $EP que no se definió) da el error real de gcloud, no "undefined"
    if (p[0] === 'ai' && (p[1] === 'endpoints' || p[1] === 'models') && p[2] && !['create', 'list', 'upload'].includes(p[2]) && !p[3]) return fail(`ERROR: (gcloud.ai.${p[1]}.${p[2]}) argument ${p[1] === 'endpoints' ? 'ENDPOINT' : 'MODEL'}: Must be specified.\n${col.dim('(¿la variable con el id quedó vacía? Revísala con: echo "$EP")')}`);
    if (p[0] === 'projects' && ['add-iam-policy-binding', 'remove-iam-policy-binding', 'get-iam-policy', 'describe', 'delete'].includes(p[1]) && !p[2]) return fail(`ERROR: (gcloud.projects.${p[1]}) argument PROJECT_ID: Must be specified.\n${col.dim('(¿la variable del proyecto quedó vacía? Prueba: PROYECTO=$(gcloud config get-value project))')}`);
    if (p[0] === 'projects' && p[1] === 'delete') {
      const id = p[2]; if (!s.projects.includes(id)) return fail(`ERROR: (gcloud.projects.delete) [${s.account || 'alumno@academia.dev'}] does not have permission to access projects instance [${id}] (or it may not exist)`);
      s.projects = s.projects.filter((x) => x !== id); if (s.project === id) s.project = null; save();
      return ok(`Deleted [https://cloudresourcemanager.googleapis.com/v1/projects/${id}].\n\nYou can undo this operation for a limited period by running the command below.\n    $ gcloud projects undelete ${id}\n\nSee https://cloud.google.com/resource-manager/docs/creating-managing-projects for information on shutting down projects.`);
    }
    if (p[0] === 'projects' && p[1] === 'undelete') { s.projects.push(p[2]); save(); return ok(`Restored project [https://cloudresourcemanager.googleapis.com/v1/projects/${p[2]}].`); }
    if (p[0] === 'pubsub' && (p[1] === 'topics' || p[1] === 'subscriptions') && p[2] === 'delete') {
      const col_ = p[1] === 'topics' ? (s.topics = s.topics || {}) : (s.subs = s.subs || {});
      const n = p[3]; if (!col_[n]) return nf(`pubsub.${p[1]}.delete`, `Resource (resource=${n})`);
      delete col_[n]; save(); return ok(`Deleted ${p[1] === 'topics' ? 'topic' : 'subscription'} [projects/${proj}/${p[1]}/${n}].`);
    }
    if (p[0] === 'workflows' && p[1] === 'delete') { s.wf = s.wf || {}; if (!s.wf[p[2]]) return nf('workflows.delete', `Workflow ${p[2]}`); delete s.wf[p[2]]; save(); return ok(`Delete request issued for: [${p[2]}]\nWaiting for operation [operation-${Date.now()}] to complete...done.\nDeleted workflow [${p[2]}].`); }
    if (p[0] === 'workflows' && p[1] === 'describe') { s.wf = s.wf || {}; const w = s.wf[p[2]]; if (!w) return nf('workflows.describe', `Workflow ${p[2]}`); return ok(`name: projects/${proj}/locations/${s.region}/workflows/${p[2]}\nstate: ACTIVE\nrevisionId: 000001-abc\nsourceContents: |\n${w.src.split('\n').map((l) => '  ' + l).join('\n')}`); }
    if (p[0] === 'ai' && (p[1] === 'models' || p[1] === 'endpoints')) {
      s.ai = s.ai || { models: {}, endpoints: {}, jobs: {} }; const X = s.ai;
      const colx = p[1] === 'models' ? X.models : X.endpoints;
      const id = colx[p[3]] ? p[3] : (Object.entries(colx).find(([, v]) => v.name === p[3]) || [])[0];
      if (p[2] === 'delete' && p[1] === 'models') { if (!id) return nf('ai.models.delete', `Model ${p[3]}`); if (Object.values(X.endpoints).some((e) => e.deployed.some((d) => d.model === id))) return fail(`ERROR: (gcloud.ai.models.delete) FAILED_PRECONDITION: The Model "${id}" is deployed or being deployed at the following Endpoint(s): ${Object.keys(X.endpoints).join(', ')}. (primero: gcloud ai endpoints undeploy-model)`); delete X.models[id]; save(); return ok(`Deleting model [${id}]...done.`); }
      if (p[2] === 'describe') {
        if (!id) return nf(`ai.${p[1]}.describe`, `${p[1] === 'models' ? 'Model' : 'Endpoint'} ${p[3]}`);
        const x = colx[id];
        const d = p[1] === 'models' ? { name: `projects/${proj}/locations/${s.region}/models/${id}`, displayName: x.name } : { name: `projects/${proj}/locations/${s.region}/endpoints/${id}`, displayName: x.name, deployedModels: x.deployed.map((m) => ({ id: m.id, displayName: m.name, model: `projects/${proj}/locations/${s.region}/models/${m.model || ''}` })), trafficSplit: Object.fromEntries(x.deployed.map((m) => [m.id, m.split])) };
        const fmt = String(A.get('--format') || '');
        const v = fmt.match(/^value\((.+)\)$/);
        if (v) { const ruta = v[1].replace(/\[(\d+)\]/g, '.$1').split('.'); let cur = d; for (const r of ruta) cur = cur == null ? undefined : cur[r]; return ok(cur === undefined ? '' : String(cur)); }
        return output(d, A, 'yaml');
      }
      return undefined;
    }
    if (k === 'services disable') return ok(`Operation "operations/acat.p2-${Date.now()}" finished successfully.`);
    return undefined;
  });

  // ================================================================== Azure
  extender('az', async (a) => {
    const s = CS.az(); const A = args(a, ['--wait']); const p = A.pos;
    if (p[0] !== 'provider') return undefined;
    s.providers = s.providers || { 'Microsoft.Storage': 'Registered', 'Microsoft.Compute': 'Registered', 'Microsoft.Network': 'Registered' };
    const ns = A.get('--namespace', '-n');
    if (p[1] === 'register') { if (!ns) return fail('the following arguments are required: --namespace/-n', 2); s.providers[ns] = 'Registered'; save(); return ok(A.get('--wait') ? '' : `Registering is still on-going. You can monitor using 'az provider show -n ${ns}'`); }
    if (p[1] === 'unregister') { s.providers[ns] = 'NotRegistered'; save(); return ok(''); }
    if (p[1] === 'show') return output({ namespace: ns, registrationState: s.providers[ns] || 'NotRegistered', registrationPolicy: 'RegistrationRequired' }, A, 'json');
    if (p[1] === 'list') return output(Object.entries(s.providers).map(([namespace, registrationState]) => ({ Namespace: namespace, RegistrationState: registrationState, RegistrationPolicy: 'RegistrationRequired' })), A, 'table');
    return undefined;
  });
})();
