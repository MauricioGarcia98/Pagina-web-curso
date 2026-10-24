/*
 * Nubes simuladas para la terminal: az (Azure), aws (AWS), gcloud/gsutil/bq (Google Cloud) y databricks.
 * Mantienen estado (lo que creas aparece al listar), validan parámetros obligatorios y devuelven
 * salidas con el mismo formato que las CLIs reales (json, table, tsv/text) y soportan --query (JMESPath básico).
 * Las consultas de Athena y BigQuery se ejecutan de verdad sobre la base SQLite del curso.
 */
(function () {
  'use strict';
  const Sh = window.Shell;
  const { def, col, ok, Machine } = Sh;
  const fail = (m, code = 1) => ({ out: col.err(m), code });
  const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const uid = (n = 8) => Array.from({ length: n }, () => 'abcdef0123456789'[Math.floor(Math.random() * 16)]).join('');
  const st = (k, init) => (Machine.cloud[k] = Machine.cloud[k] || init());
  const save = () => Machine.save();

  // ---------------------------------------------------------------- argumentos
  const BOOLS = ['--recursive', '--summarize', '--yes', '-y', '--no-wait', '--use-device-code', '--force', '--active', '--auto-ack', '--dry_run', '--autodetect', '--full-refresh', '--help', '-h', '--version', '-r', '--service-principal', '--versioning', '--no-versioning', '--clear-lifecycle', '--uniform-bucket-level-access', '--public-access-prevention', '--readable-sizes'];
  function args(a, extra = []) {
    const flags = {}, pos = [];
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (/^--?[A-Za-z]/.test(x)) {
        let k = x, v = true;
        if (x.includes('=')) { k = x.slice(0, x.indexOf('=')); v = x.slice(x.indexOf('=') + 1); }
        else if (!BOOLS.includes(x) && !extra.includes(x) && i + 1 < a.length && !/^--?[A-Za-z]/.test(a[i + 1])) {
          v = a[++i];
          // valores múltiples: --tags a=b c=d
          while (i + 1 < a.length && !/^--?[A-Za-z]/.test(a[i + 1]) && /=/.test(a[i + 1]) && /=/.test(v)) v += ' ' + a[++i];
        }
        flags[k] = v;
      } else pos.push(x);
    }
    const get = (...names) => { for (const n of names) if (flags[n] !== undefined) return flags[n]; return undefined; };
    return { flags, pos, get };
  }

  // ---------------------------------------------------------------- JMESPath básico
  function jmes(data, expr) {
    expr = expr.trim();
    if (!expr) return data;
    let m;
    if ((m = expr.match(/^length\((.*)\)$/))) { const v = m[1] === '@' ? data : jmes(data, m[1]); return v == null ? null : v.length ?? Object.keys(v).length; }
    if (expr.startsWith('[]')) {
      if (!Array.isArray(data)) return null;
      const rest = expr.slice(2).replace(/^\./, '');
      return data.map((x) => jmes(x, rest)).filter((x) => x !== null && x !== undefined);
    }
    if (expr.startsWith('[?')) {
      const end = matching(expr, 0);
      const cond = expr.slice(2, end);
      const rest = expr.slice(end + 1).replace(/^\./, '');
      if (!Array.isArray(data)) return null;
      return data.filter((x) => test(x, cond)).map((x) => jmes(x, rest)).filter((x) => x !== null && x !== undefined);
    }
    if ((m = expr.match(/^\[(-?\d+)\](.*)$/))) { if (!Array.isArray(data)) return null; const v = data[Number(m[1]) < 0 ? data.length + Number(m[1]) : Number(m[1])]; return v === undefined ? null : jmes(v, m[2].replace(/^\./, '')); }
    if (expr.startsWith('{')) {
      const end = matching(expr, 0, '{', '}');
      const body = expr.slice(1, end);
      const o = {};
      for (const part of splitComma(body)) { const [k, ...v] = part.split(':'); o[k.trim()] = jmes(data, v.join(':').trim()); }
      return o;
    }
    if (expr.startsWith('[') && !expr.startsWith('[?')) { // multiselect lista [a, b]
      const end = matching(expr, 0);
      return splitComma(expr.slice(1, end)).map((p) => jmes(data, p.trim()));
    }
    // identificador (posiblemente con . o [ a continuación)
    m = expr.match(/^([A-Za-z_][\w-]*|"[^"]+")(.*)$/);
    if (!m) throw new Error(`argument --query: invalid jmespath_type value: '${expr}'`);
    const key = m[1].replace(/^"|"$/g, '');
    const v = data == null ? null : data[key];
    let rest = m[2];
    if (rest.startsWith('.')) rest = rest.slice(1);
    if (rest.startsWith('[]') && Array.isArray(v)) return jmes(v, rest);
    return rest ? jmes(v, rest) : (v === undefined ? null : v);
  }
  function matching(s, i, o = '[', c = ']') { let d = 0; for (let j = i; j < s.length; j++) { if (s[j] === o) d++; else if (s[j] === c) { d--; if (!d) return j; } } return s.length; }
  function splitComma(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if ('[{('.includes(ch)) d++; if (']})'.includes(ch)) d--; if (ch === ',' && !d) { out.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur); return out; }
  function lit(s) { s = s.trim(); if (/^'.*'$/.test(s)) return s.slice(1, -1); if (/^`.*`$/.test(s)) { try { return JSON.parse(s.slice(1, -1)); } catch (e) { return s.slice(1, -1); } } if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s); return undefined; }
  function test(x, cond) {
    if (cond.includes('&&')) return cond.split('&&').every((c) => test(x, c));
    if (cond.includes('||')) return cond.split('||').some((c) => test(x, c));
    let m;
    if ((m = cond.match(/^\s*contains\(\s*([\w.]+)\s*,\s*(.+)\)\s*$/))) { const v = jmes(x, m[1]); return v != null && String(v).includes(lit(m[2])); }
    if ((m = cond.match(/^\s*starts_with\(\s*([\w.]+)\s*,\s*(.+)\)\s*$/))) { const v = jmes(x, m[1]); return v != null && String(v).startsWith(lit(m[2])); }
    m = cond.match(/^\s*([\w."-]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
    if (!m) { const v = jmes(x, cond.trim()); return !!v; }
    const a = jmes(x, m[1]), b = lit(m[3]) !== undefined ? lit(m[3]) : jmes(x, m[3]);
    switch (m[2]) { case '==': return a == b; case '!=': return a != b; case '>': return a > b; case '<': return a < b; case '>=': return a >= b; default: return a <= b; }
  }

  // ---------------------------------------------------------------- formatos de salida
  function scalarStr(v) { return v === null || v === undefined ? (v === null ? 'None' : '') : typeof v === 'object' ? JSON.stringify(v) : String(v); }
  function asTable(data, upper = true) {
    let rows = Array.isArray(data) ? data : [data];
    if (!rows.length) return '';
    if (rows.every((r) => r === null || typeof r !== 'object')) {
      const w = Math.max(6, ...rows.map((r) => scalarStr(r).length));
      return ['Result', '-'.repeat(w), ...rows.map(scalarStr)].join('\n');
    }
    rows = rows.map((r) => (r && typeof r === 'object' && !Array.isArray(r) ? r : { Result: r }));
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => r[k] === null || typeof r[k] !== 'object')))];
    const head = cols.map((c) => (upper ? c[0].toUpperCase() + c.slice(1) : c));
    const w = cols.map((c, i) => Math.max(head[i].length, ...rows.map((r) => scalarStr(r[c]).length)));
    return [head.map((h, i) => h.padEnd(w[i])).join('  '), w.map((x) => '-'.repeat(x)).join('  '), ...rows.map((r) => cols.map((c, i) => scalarStr(r[c]).padEnd(w[i])).join('  '))].join('\n');
  }
  function asTsv(data) {
    const rows = Array.isArray(data) ? data : [data];
    return rows.map((r) => (r !== null && typeof r === 'object' ? (Array.isArray(r) ? r : Object.values(r)).map(scalarStr).join('\t') : scalarStr(r))).join('\n');
  }
  function yaml(v, ind = '') {
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' && x ? `${ind}- ` + yaml(x, ind + '  ').trimStart() : `${ind}- ${scalarStr(x)}`)).join('\n');
    if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => (x && typeof x === 'object' ? `${ind}${k}:\n${yaml(x, ind + '  ')}` : `${ind}${k}: ${scalarStr(x)}`)).join('\n');
    return ind + scalarStr(v);
  }
  function output(data, A, def_ = 'json', style = 'az') {
    let q = A.get('--query');
    let d = data;
    if (q && q !== true) { try { d = jmes(data, q.replace(/^["']|["']$/g, '')); } catch (e) { return fail(e.message, 2); } }
    const fmt = A.get('--output', '-o') || (style === 'aws' ? (Machine.cloud.aws && Machine.cloud.aws.output) || def_ : def_);
    if (d === undefined) return ok('');
    if (fmt === 'none') return ok('');
    if (fmt === 'table') return ok(asTable(d));
    if (fmt === 'tsv' || fmt === 'text') return ok(asTsv(d));
    if (fmt === 'yaml') return ok(yaml(d));
    if (fmt === 'jsonc') return ok(JSON.stringify(d, null, 2));
    return ok(JSON.stringify(d, null, 2));
  }
  const need = (A, pairs) => {
    const miss = pairs.filter((p) => A.get(...p) === undefined || A.get(...p) === true);
    return miss.length ? `the following arguments are required: ${miss.map((p) => p.join('/')).join(', ')}` : null;
  };

  // ================================================================== AZURE
  const SUBS = [
    { id: '1111aaaa-1111-4111-8111-111111111111', name: 'sub-datos-dev', state: 'Enabled', tenantId: '9999ffff-0000-4000-8000-000000000000' },
    { id: '2222bbbb-2222-4222-8222-222222222222', name: 'sub-datos-prod', state: 'Enabled', tenantId: '9999ffff-0000-4000-8000-000000000000' },
  ];
  const AZ_LOCS = ['eastus', 'eastus2', 'westus2', 'brazilsouth', 'westeurope', 'northeurope', 'mexicocentral', 'southcentralus', 'centralus', 'canadacentral', 'uksouth', 'chilecentral'];
  function az() { return st('az', () => ({ logged: false, sub: SUBS[0].id, defaults: {}, groups: {}, storage: {}, kv: {}, dbw: {}, adf: {}, roles: [], ext: [], eh: {}, deployments: [] })); }
  function azSub(s) { return SUBS.find((x) => x.id === s.sub); }
  function azRgId(name) { return `/subscriptions/${azSub(az()).id}/resourceGroups/${name}`; }
  function azNeedRg(s, name) {
    if (!name || name === true) return 'the following arguments are required: --resource-group/-g';
    if (!s.groups[name]) return `(ResourceGroupNotFound) Resource group '${name}' could not be found.\nCode: ResourceGroupNotFound`;
    return null;
  }
  function azLoc(A, s, rg) { const l = A.get('--location', '-l') || s.defaults.location || (rg && s.groups[rg] && s.groups[rg].location); return l; }

  def('az', 'Azure CLI simulada con estado (login, group, storage, keyvault, databricks, datafactory…)', (a, ctx) => {
    const s = az();
    const A = args(a);
    const p = A.pos;
    const cmd = p.slice(0, 3).join(' ');
    const want = (...xs) => xs.some((x) => cmd.startsWith(x));
    if (!p.length || A.flags['--help'] || A.flags['-h']) return ok(`${col.b('Group')}\n    az\n\n${col.b('Subgroups:')}\n    account, group, storage, keyvault, role, ad, databricks, datafactory, eventhubs,\n    deployment, resource, extension, config\n\n${col.b('Commands:')}\n    login, logout, version, configure, find, upgrade\n\nEjemplo: az group create --name rg-datos-dev --location eastus2`);
    if (p[0] === 'version' || A.flags['--version']) return ok(JSON.stringify({ 'azure-cli': '2.67.0', 'azure-cli-core': '2.67.0', extensions: Object.fromEntries(s.ext.map((e) => [e, '1.0.0'])) }, null, 2));
    if (p[0] === 'login') {
      s.logged = true; save();
      const msg = A.flags['--use-device-code'] ? `To sign in, use a web browser to open the page https://microsoft.com/devicelogin and enter the code ${uid(9).toUpperCase()} to authenticate.\n` : (A.flags['--service-principal'] ? '' : col.dim('Se abrió una ventana del navegador para iniciar sesión (simulado)…\n'));
      return ok(msg + JSON.stringify(SUBS.map((x) => ({ cloudName: 'AzureCloud', id: x.id, isDefault: x.id === s.sub, name: x.name, state: x.state, tenantId: x.tenantId, user: { name: 'alumno@academia.dev', type: A.flags['--service-principal'] ? 'servicePrincipal' : 'user' } })), null, 2));
    }
    if (p[0] === 'logout') { s.logged = false; save(); return ok(''); }
    if (!s.logged && !(ctx.opts && ctx.opts.autoLogin)) return fail("Please run 'az login' to setup account.");
    s.logged = true;
    if (p[0] === 'find') return ok(col.dim('(simulado) Ejemplos de la documentación de Azure CLI:\n') + `az storage account create --name MyStorageAccount --resource-group MyResourceGroup --location eastus --sku Standard_LRS`);
    if (p[0] === 'upgrade') return ok('Your current Azure CLI version is up to date.');
    if (p[0] === 'configure') {
      const d = A.get('--defaults', '-d');
      if (d && d !== true) { for (const kv of String(d).split(/\s+/)) { const [k, v] = kv.split('='); s.defaults[k] = v; } save(); }
      return ok('');
    }
    if (p[0] === 'config') return ok('');
    if (p[0] === 'extension') {
      if (p[1] === 'add') { const n = A.get('--name', '-n'); if (!n || n === true) return fail(need(A, [['--name', '-n']])); if (!s.ext.includes(n)) s.ext.push(n); save(); return ok(''); }
      if (p[1] === 'list') return output(s.ext.map((n) => ({ name: n, version: '1.0.0', preview: false })), A);
      if (p[1] === 'remove') { s.ext = s.ext.filter((x) => x !== A.get('--name', '-n')); save(); return ok(''); }
    }
    // ---- account
    if (p[0] === 'account') {
      if (p[1] === 'show') { const x = azSub(s); return output({ environmentName: 'AzureCloud', id: x.id, isDefault: true, name: x.name, state: x.state, tenantId: x.tenantId, user: { name: 'alumno@academia.dev', type: 'user' } }, A); }
      if (p[1] === 'list') return output(SUBS.map((x) => ({ cloudName: 'AzureCloud', id: x.id, isDefault: x.id === s.sub, name: x.name, state: x.state, tenantId: x.tenantId })), A);
      if (p[1] === 'set') {
        const v = A.get('--subscription', '-s', '--name', '-n');
        const x = SUBS.find((y) => y.id === v || y.name === v);
        if (!x) return fail(`The subscription of '${v}' doesn't exist in cloud 'AzureCloud'.`);
        s.sub = x.id; save(); return ok('');
      }
      if (p[1] === 'list-locations') return output(AZ_LOCS.map((l) => ({ name: l, displayName: l })), A);
    }
    // ---- group
    if (p[0] === 'group') {
      const name = A.get('--name', '-n', '--resource-group', '-g');
      if (p[1] === 'create') {
        const e = need(A, [['--name', '-n', '--resource-group', '-g']]) || (!azLoc(A, s) ? 'the following arguments are required: --location/-l' : null);
        if (e) return fail(e, 2);
        const loc = azLoc(A, s);
        if (!AZ_LOCS.includes(loc)) return fail(`(LocationNotAvailableForResourceGroup) The provided location '${loc}' is not available for resource group. List of available regions is '${AZ_LOCS.join(',')}'.`);
        const tags = parseTags(A.get('--tags'));
        s.groups[name] = { location: loc, tags };
        save();
        return output({ id: azRgId(name), location: loc, managedBy: null, name, properties: { provisioningState: 'Succeeded' }, tags, type: 'Microsoft.Resources/resourceGroups' }, A);
      }
      if (p[1] === 'list') return output(Object.entries(s.groups).map(([n, g]) => ({ id: azRgId(n), location: g.location, name: n, properties: { provisioningState: 'Succeeded' }, tags: g.tags })), A);
      if (p[1] === 'show') { const e = azNeedRg(s, name); if (e) return fail(e, 3); const g = s.groups[name]; return output({ id: azRgId(name), location: g.location, name, properties: { provisioningState: 'Succeeded' }, tags: g.tags }, A); }
      if (p[1] === 'exists') return ok(String(!!s.groups[name]));
      if (p[1] === 'update') { const e = azNeedRg(s, name); if (e) return fail(e, 3); const set = A.get('--set'); if (set) for (const kv of String(set).split(/\s+/)) { const m = kv.match(/^tags\.(\w+)=(.*)$/); if (m) s.groups[name].tags[m[1]] = m[2]; } if (A.get('--tags')) s.groups[name].tags = parseTags(A.get('--tags')); save(); return output({ name, tags: s.groups[name].tags }, A); }
      if (p[1] === 'delete') {
        const e = azNeedRg(s, name); if (e) return fail(e, 3);
        if (!A.flags['--yes'] && !A.flags['-y']) return ok(`Are you sure you want to perform this operation? (y/n): ${col.dim('(en esta terminal no hay confirmación interactiva: agrega --yes)')}`);
        for (const k of ['storage', 'kv', 'dbw', 'adf', 'eh']) for (const [n, r] of Object.entries(s[k])) if (r.rg === name) delete s[k][n];
        delete s.groups[name]; save(); return ok('');
      }
    }
    // ---- resource
    if (p[0] === 'resource' && p[1] === 'list') {
      const rg = A.get('--resource-group', '-g');
      const tag = A.get('--tag');
      const all = [];
      const add = (type, n, r) => all.push({ name: n, resourceGroup: r.rg, location: r.location, type, tags: r.tags || {} });
      Object.entries(s.storage).forEach(([n, r]) => add('Microsoft.Storage/storageAccounts', n, r));
      Object.entries(s.kv).forEach(([n, r]) => add('Microsoft.KeyVault/vaults', n, r));
      Object.entries(s.dbw).forEach(([n, r]) => add('Microsoft.Databricks/workspaces', n, r));
      Object.entries(s.adf).forEach(([n, r]) => add('Microsoft.DataFactory/factories', n, r));
      Object.entries(s.eh).forEach(([n, r]) => add('Microsoft.EventHub/namespaces', n, r));
      let res = rg ? all.filter((r) => r.resourceGroup === rg) : all;
      if (tag && tag !== true) { const [k, v] = String(tag).split('='); res = res.filter((r) => (s.groups[r.resourceGroup] || {}).tags && s.groups[r.resourceGroup].tags[k] === v); }
      return output(res, A);
    }
    // ---- storage
    if (p[0] === 'storage') {
      if (p[1] === 'account') {
        const name = A.get('--name', '-n');
        const rg = A.get('--resource-group', '-g') || s.defaults.group;
        if (p[2] === 'create') {
          const miss = need(A, [['--name', '-n']]); if (miss) return fail(miss, 2);
          const e = azNeedRg(s, rg); if (e) return fail(e, 3);
          if (!/^[a-z0-9]{3,24}$/.test(name)) return fail(`(AccountNameInvalid) ${name} is not a valid storage account name. Storage account name must be between 3 and 24 characters in length and use numbers and lower-case letters only.`);
          if (s.storage[name]) return fail(`(StorageAccountAlreadyTaken) The storage account named ${name} is already taken.`);
          const hns = String(A.get('--hns', '--enable-hierarchical-namespace')) === 'true' || A.flags['--hns'] === true;
          s.storage[name] = { rg, location: azLoc(A, s, rg), sku: A.get('--sku') || 'Standard_RAGRS', kind: A.get('--kind') || 'StorageV2', hns, containers: {} };
          save();
          return output({ id: `${azRgId(rg)}/providers/Microsoft.Storage/storageAccounts/${name}`, name, location: s.storage[name].location, kind: s.storage[name].kind, sku: { name: s.storage[name].sku }, isHnsEnabled: hns, primaryEndpoints: { blob: `https://${name}.blob.core.windows.net/`, dfs: `https://${name}.dfs.core.windows.net/` }, provisioningState: 'Succeeded', resourceGroup: rg }, A);
        }
        if (p[2] === 'list') return output(Object.entries(s.storage).filter(([, x]) => !rg || x.rg === rg).map(([n, x]) => ({ name: n, resourceGroup: x.rg, location: x.location, kind: x.kind, sku: { name: x.sku }, isHnsEnabled: x.hns })), A);
        if (p[2] === 'show') { const x = s.storage[name]; if (!x) return fail(`(ResourceNotFound) The Resource 'Microsoft.Storage/storageAccounts/${name}' under resource group '${rg}' was not found.`, 3); return output({ id: `${azRgId(x.rg)}/providers/Microsoft.Storage/storageAccounts/${name}`, name, location: x.location, isHnsEnabled: x.hns, sku: { name: x.sku }, resourceGroup: x.rg }, A); }
        if (p[2] === 'delete') { delete s.storage[name]; save(); return ok(''); }
        if (p[2] === 'keys') return output([{ keyName: 'key1', permissions: 'FULL', value: uid(40) + '==' }, { keyName: 'key2', permissions: 'FULL', value: uid(40) + '==' }], A);
      }
      const accN = A.get('--account-name');
      const acct = () => {
        if (!accN || accN === true) return { e: 'the following arguments are required: --account-name' };
        const x = s.storage[accN];
        if (!x) return { e: `The specified account '${accN}' does not exist (créala con az storage account create).` };
        if (!A.flags['--auth-mode'] && !A.get('--account-key') && !A.get('--sas-token')) return { x, warn: col.warn('\nThere are no credentials provided in your command and environment, we will query for account key for your storage account.\nIt is recommended to provide --connection-string, --account-key or --sas-token in your command as credentials.\nYou also can add `--auth-mode login` in your command to use Azure Active Directory (Azure AD) for authorization if your login account is assigned required RBAC roles.') };
        return { x, warn: '' };
      };
      if ((p[1] === 'container' || p[1] === 'fs') && ['create', 'list', 'delete', 'exists'].includes(p[2])) {
        const r = acct(); if (r.e) return fail(r.e, 2);
        const name = A.get('--name', '-n', '--file-system', '-f');
        if (p[2] === 'create') { if (!name || name === true) return fail('the following arguments are required: --name/-n', 2); const was = !!r.x.containers[name]; r.x.containers[name] = r.x.containers[name] || { blobs: {} }; save(); return { out: (r.warn ? r.warn + '\n' : '') + JSON.stringify({ created: !was }, null, 2), code: 0 }; }
        if (p[2] === 'list') return output(Object.keys(r.x.containers).map((n) => ({ name: n, properties: { lastModified: now(), publicAccess: null } })), A);
        if (p[2] === 'exists') return output({ exists: !!r.x.containers[name] }, A);
        if (p[2] === 'delete') { delete r.x.containers[name]; save(); return output({ deleted: true }, A); }
      }
      if (p[1] === 'fs' && p[2] === 'directory' && p[3] === 'create') {
        const r = acct(); if (r.e) return fail(r.e, 2);
        const fsn = A.get('--file-system', '-f'); const c = r.x.containers[fsn];
        if (!c) return fail(`The specified filesystem does not exist. ErrorCode:FilesystemNotFound`);
        c.blobs[(A.get('--name', '-n') || '').replace(/\/$/, '') + '/'] = ''; save();
        return ok(JSON.stringify({ content_length: 0, last_modified: now() }, null, 2));
      }
      if (p[1] === 'blob') {
        const r = acct(); if (r.e) return fail(r.e, 2);
        const cn = A.get('--container-name', '-c', '--destination', '-d', '--source', '-s');
        if (p[2] === 'upload') {
          const c = r.x.containers[cn]; if (!c) return fail(`The specified container does not exist.\nErrorCode:ContainerNotFound`);
          const file = A.get('--file', '-f'); const name = A.get('--name', '-n') || (file && file.split('/').pop());
          if (!file || file === true) return fail('the following arguments are required: --file/-f', 2);
          const content = Sh.readFile(Sh.norm(file));
          if (content === null) return fail(`[Errno 2] No such file or directory: '${file}'`);
          if (c.blobs[name] !== undefined && !A.flags['--overwrite']) return fail(`The specified blob already exists. (usa --overwrite)\nErrorCode:BlobAlreadyExists`);
          c.blobs[name] = content; save();
          return { out: (r.warn ? r.warn + '\n' : '') + `Finished[#############################################################]  100.0000%\n` + JSON.stringify({ etag: '"0x8DC' + uid(10).toUpperCase() + '"', lastModified: now() }, null, 2), code: 0 };
        }
        if (p[2] === 'upload-batch') {
          const dest = A.get('--destination', '-d') || ''; const [cName, ...pref] = dest.split('/');
          const c = r.x.containers[cName]; if (!c) return fail('The specified container does not exist.');
          const src = Sh.norm(A.get('--source', '-s') || '.');
          const files = Object.keys(Machine.fs).filter((k) => Machine.fs[k].t === 'f' && k.startsWith(src + '/'));
          const res = files.map((f) => { const bn = [...pref, f.slice(src.length + 1)].filter(Boolean).join('/'); c.blobs[bn] = Machine.fs[f].c; return { Blob: `https://${accN}.blob.core.windows.net/${cName}/${bn}`, Type: 'text/plain', 'Last Modified': now() }; });
          save(); return output(res, A);
        }
        if (p[2] === 'list') {
          const c = r.x.containers[cn]; if (!c) return fail('The specified container does not exist.\nErrorCode:ContainerNotFound');
          const pre = A.get('--prefix') || '';
          return output(Object.entries(c.blobs).filter(([n]) => n.startsWith(pre === true ? '' : pre)).map(([n, v]) => ({ name: n, properties: { contentLength: v.length, lastModified: now(), blobTier: 'Hot' } })), A, 'json');
        }
        if (p[2] === 'download') {
          const c = r.x.containers[cn]; const name = A.get('--name', '-n'); const file = A.get('--file', '-f');
          if (!c || c.blobs[name] === undefined) return fail('The specified blob does not exist.\nErrorCode:BlobNotFound');
          Sh.writeFile(Sh.norm(file || name.split('/').pop()), c.blobs[name]); save();
          return ok(`Finished[#############################################################]  100.0000%`);
        }
        if (p[2] === 'delete') { const c = r.x.containers[cn]; if (c) delete c.blobs[A.get('--name', '-n')]; save(); return ok(''); }
      }
    }
    // ---- keyvault
    if (p[0] === 'keyvault') {
      const vn = A.get('--vault-name', '--name', '-n');
      if (p[1] === 'create') {
        const rg = A.get('--resource-group', '-g') || s.defaults.group;
        const e = need(A, [['--name', '-n']]) || azNeedRg(s, rg); if (e) return fail(e, 2);
        if (!/^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$/.test(vn)) return fail('(VaultNameNotValid) The vault name must be between 3-24 alphanumeric characters (y guiones), empezar con letra.');
        s.kv[vn] = { rg, location: azLoc(A, s, rg), secrets: {} }; save();
        return output({ id: `${azRgId(rg)}/providers/Microsoft.KeyVault/vaults/${vn}`, name: vn, location: s.kv[vn].location, properties: { vaultUri: `https://${vn}.vault.azure.net/`, enableRbacAuthorization: true, provisioningState: 'Succeeded' }, resourceGroup: rg }, A);
      }
      if (p[1] === 'list') return output(Object.entries(s.kv).map(([n, x]) => ({ name: n, resourceGroup: x.rg, location: x.location })), A);
      if (p[1] === 'secret') {
        const v = s.kv[A.get('--vault-name')];
        if (!v) return fail(`Failed to resolve key vault '${A.get('--vault-name')}'. (créalo con az keyvault create)`);
        const n = A.get('--name', '-n');
        if (p[2] === 'set') { const val = A.get('--value'); if (val === undefined) return fail('the following arguments are required: --value o --file', 2); v.secrets[n] = val; save(); return output({ id: `https://${A.get('--vault-name')}.vault.azure.net/secrets/${n}/${uid(32)}`, name: n, value: val, attributes: { enabled: true, created: now() } }, A); }
        if (p[2] === 'show') { if (v.secrets[n] === undefined) return fail(`(SecretNotFound) A secret with (name/id) ${n} was not found in this key vault.`, 3); return output({ id: `https://${A.get('--vault-name')}.vault.azure.net/secrets/${n}/${uid(32)}`, name: n, value: v.secrets[n], attributes: { enabled: true } }, A); }
        if (p[2] === 'list') return output(Object.keys(v.secrets).map((k) => ({ name: k, id: `https://${A.get('--vault-name')}.vault.azure.net/secrets/${k}`, attributes: { enabled: true } })), A);
        if (p[2] === 'delete') { delete v.secrets[n]; save(); return ok(''); }
      }
    }
    // ---- role / ad
    if (p[0] === 'role' && p[1] === 'assignment') {
      if (p[2] === 'create') { const e = need(A, [['--assignee'], ['--role'], ['--scope']]); if (e) return fail(e, 2); const r = { principalName: A.get('--assignee'), roleDefinitionName: A.get('--role'), scope: A.get('--scope'), id: uid(32) }; s.roles.push(r); save(); return output(r, A); }
      if (p[2] === 'list') { const sc = A.get('--scope'); return output(s.roles.filter((r) => !sc || sc === true || r.scope === sc), A); }
      if (p[2] === 'delete') { s.roles = s.roles.filter((r) => !(r.principalName === A.get('--assignee') && r.roleDefinitionName === A.get('--role'))); save(); return ok(''); }
    }
    if (p[0] === 'ad' && p[1] === 'sp' && p[2] === 'create-for-rbac') {
      const n = A.get('--name', '-n') || 'azure-cli-' + uid(6);
      return ok(col.warn('WARNING: The output includes credentials that you must protect. Be sure that you do not include these credentials in your code or check the credentials into your source control.\n') + JSON.stringify({ appId: uid(8) + '-' + uid(4) + '-4' + uid(3) + '-8' + uid(3) + '-' + uid(12), displayName: n, password: uid(34), tenant: '9999ffff-0000-4000-8000-000000000000' }, null, 2));
    }
    if (p[0] === 'ad' && p[1] === 'signed-in-user' && p[2] === 'show') return output({ displayName: 'Alumno Academia', userPrincipalName: 'alumno@academia.dev', id: '55555555-5555-4555-8555-555555555555' }, A);
    // ---- databricks / datafactory / eventhubs
    if (p[0] === 'databricks' || p[0] === 'datafactory' || p[0] === 'eventhubs') {
      const extName = p[0];
      if (p[0] !== 'eventhubs' && !s.ext.includes(extName) && !(ctx.opts && ctx.opts.autoLogin)) return fail(`'${extName}' is misspelled or not recognized by the system.\nPuede que necesites la extensión: az extension add --name ${extName}`, 2);
      const rg = A.get('--resource-group', '-g') || s.defaults.group;
      if (p[0] === 'databricks' && p[1] === 'workspace') {
        const n = A.get('--name', '-n');
        if (p[2] === 'create') {
          const e = need(A, [['--name', '-n']]) || azNeedRg(s, rg); if (e) return fail(e, 2);
          const sku = A.get('--sku'); if (!sku || sku === true) return fail('the following arguments are required: --sku', 2);
          s.dbw[n] = { rg, location: azLoc(A, s, rg), sku, url: `adb-${Math.floor(1e15 + Math.random() * 9e15)}.${Math.floor(Math.random() * 20)}.azuredatabricks.net` }; save();
          return output({ name: n, location: s.dbw[n].location, sku: { name: sku }, workspaceUrl: s.dbw[n].url, provisioningState: 'Succeeded', resourceGroup: rg }, A);
        }
        if (p[2] === 'show') { const x = s.dbw[n]; if (!x) return fail(`(ResourceNotFound) The Resource 'Microsoft.Databricks/workspaces/${n}' under resource group '${rg}' was not found.`, 3); return output({ name: n, location: x.location, sku: { name: x.sku }, workspaceUrl: x.url, provisioningState: 'Succeeded' }, A); }
        if (p[2] === 'list') return output(Object.entries(s.dbw).map(([k, x]) => ({ name: k, location: x.location, sku: { name: x.sku }, workspaceUrl: x.url, resourceGroup: x.rg })), A);
      }
      if (p[0] === 'datafactory') {
        const n = A.get('--factory-name', '--name', '-n');
        if (p[1] === 'create') { const e = azNeedRg(s, rg); if (e) return fail(e, 2); if (!n || n === true) return fail('the following arguments are required: --factory-name/--name/-n', 2); s.adf[n] = { rg, location: azLoc(A, s, rg) }; save(); return output({ name: n, location: s.adf[n].location, provisioningState: 'Succeeded', resourceGroup: rg }, A); }
        if (p[1] === 'list') return output(Object.entries(s.adf).map(([k, x]) => ({ name: k, location: x.location, resourceGroup: x.rg })), A);
        if (p[1] === 'pipeline' && p[2] === 'create-run') return output({ runId: uid(8) + '-' + uid(4) + '-' + uid(4) + '-' + uid(4) + '-' + uid(12) }, A);
      }
      if (p[0] === 'eventhubs') {
        if (p[1] === 'namespace' && p[2] === 'create') { const n = A.get('--name', '-n'); const e = azNeedRg(s, rg); if (e) return fail(e, 2); s.eh[n] = { rg, location: azLoc(A, s, rg), hubs: {} }; save(); return output({ name: n, sku: { name: A.get('--sku') || 'Standard' }, provisioningState: 'Succeeded' }, A); }
        if (p[1] === 'eventhub' && p[2] === 'create') { const ns = s.eh[A.get('--namespace-name')]; if (!ns) return fail('(NamespaceNotFound)'); ns.hubs[A.get('--name', '-n')] = { partitions: A.get('--partition-count') || 4 }; save(); return output({ name: A.get('--name', '-n'), partitionCount: Number(A.get('--partition-count') || 4), status: 'Active' }, A); }
      }
    }
    // ---- deployment
    if (p[0] === 'deployment' && p[1] === 'group') {
      const rg = A.get('--resource-group', '-g'); const e = azNeedRg(s, rg); if (e) return fail(e, 3);
      const f = A.get('--template-file', '-f');
      if (!f || f === true) return fail('the following arguments are required: --template-file/-f', 2);
      if (!Sh.exists(Sh.norm(f))) return fail(`unrecognized template file: no existe ${f} (crea uno con: code ${f})`);
      if (p[2] === 'what-if') return ok(`Note: The result may contain false positive predictions (noise).\n\nResource and property changes are indicated with this symbol:\n  ${col.ok('+')} Create\n\nThe deployment will update the following scope:\n\nScope: ${azRgId(rg)}\n\n  ${col.ok('+ Microsoft.Storage/storageAccounts/stdatos001')}\n\nResource changes: 1 to create.`);
      if (p[2] === 'create') { s.deployments.push({ rg, f, at: now() }); save(); return output({ name: f.split('/').pop().replace(/\.\w+$/, ''), properties: { provisioningState: 'Succeeded', timestamp: now() }, resourceGroup: rg }, A); }
    }
    if (p[0] === 'consumption') return output([{ instanceName: 'stdatosdev001', meterCategory: 'Storage', pretaxCost: '1.23', currency: 'USD' }, { instanceName: 'dbw-datos-dev', meterCategory: 'Azure Databricks', pretaxCost: '18.40', currency: 'USD' }], A);
    return fail(`'${p.join(' ')}' is misspelled or not recognized by the system (o no está simulado en esta terminal).\nPrueba: az --help`, 2);
  });
  function parseTags(t) { const o = {}; if (t && t !== true) for (const kv of String(t).split(/\s+/)) { const [k, v] = kv.split('='); if (k) o[k] = v ?? ''; } return o; }

  // ---- tablas del lago: CSV guardados en buckets simulados -> tabla real en la base del navegador
  function parseCsvLine(l) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur); return out;
  }
  // files: [{ text, parts: {col: valor} }]; header: true si la primera línea es el encabezado; cols: nombres si no hay encabezado
  async function materialize(name, files, { header = true, cols = null } = {}) {
    const E = window.Engines.SQL; if (!E._bytes) await E.init();
    const db = E.playground();
    let names = cols, rows = [];
    for (const f of files) {
      const lines = String(f.text).replace(/\r/g, '').split('\n').filter((x) => x.trim());
      if (!lines.length) continue;
      if (header) { const h = parseCsvLine(lines.shift()).map((x) => x.trim()); if (!names) names = h; }
      for (const l of lines) rows.push(parseCsvLine(l).concat(Object.values(f.parts || {})));
    }
    if (!names) return false;
    const partCols = Object.keys((files[0] && files[0].parts) || {}).filter((c) => !names.includes(c));
    const all = names.concat(partCols);
    const qi = (c) => '"' + c.replace(/"/g, '') + '"';
    const val = (v) => (v === undefined || v === '' ? 'NULL' : /^-?\d+(\.\d+)?$/.test(v) ? v : "'" + String(v).replace(/'/g, "''") + "'");
    let sql = `DROP TABLE IF EXISTS ${name}; CREATE TABLE ${name} (${all.map(qi).join(', ')});`;
    for (let i = 0; i < rows.length; i += 400) sql += `INSERT INTO ${name} VALUES ${rows.slice(i, i + 400).map((r) => '(' + all.map((_, j) => val(r[j])).join(', ') + ')').join(', ')};`;
    const r = E.exec(sql, db);
    return r.ok;
  }
  const partsOf = (key) => Object.fromEntries(key.split('/').slice(0, -1).filter((x) => /^\w+=/.test(x)).map((x) => x.split('=')));

  // ================================================================== AWS
  const AWS_REGIONS = ['us-east-1', 'us-east-2', 'us-west-2', 'sa-east-1', 'eu-west-1', 'eu-central-1', 'mx-central-1'];
  function aws() {
    return st('aws', () => ({
      configured: false, region: 'us-east-1', output: 'json', account: '123456789012',
      buckets: {}, glueDbs: {}, crawlers: {}, glueJobs: { 'etl-ventas-silver': { runs: [] } }, athena: {},
      emr: {}, streams: {}, lambdas: { 'procesar-archivo': { runtime: 'python3.12', handler: 'app.handler' } }, roles: { 'GlueServiceRole-datos': {} },
      sfn: { 'pipeline-diario': {} }, redshift: {},
    }));
  }
  const arn = (svc, res) => `arn:aws:${svc}:${aws().region}:${aws().account}:${res}`;
  function s3path(u) { const m = String(u || '').match(/^s3:\/\/([^/]+)\/?(.*)$/); return m ? { b: m[1], k: m[2] } : null; }

  def('aws', 'AWS CLI simulada con estado (configure, s3, glue, athena, emr, kinesis, lambda, iam…)', async (a, ctx) => {
    const s = aws();
    const A = args(a);
    const p = A.pos;
    if (!p.length || p[0] === 'help') return ok(`usage: aws [options] <command> <subcommand> [parameters]\n\nServicios simulados: s3, s3api, sts, iam, glue, athena, emr, kinesis, firehose, lambda, stepfunctions, events, redshift-data, lakeformation, logs, cloudformation, mwaa, configure\nEjemplo: aws s3 mb s3://mi-data-lake-2025`);
    if (A.flags['--version']) return ok('aws-cli/2.17.0 Python/3.11.9 Linux/x86_64');
    if (p[0] === 'configure') {
      if (p[1] === 'list') return ok(`      Name                    Value             Type    Location\n      ----                    -----             ----    --------\n   profile                <not set>             None    None\naccess_key     ****************${s.configured ? 'ABCD' : '<not set>'} shared-credentials-file\nsecret_key     ****************${s.configured ? 'wxyz' : '<not set>'} shared-credentials-file\n    region                ${s.region}      config-file    ~/.aws/config`);
      if (p[1] === 'set') { if (p[2] === 'region') s.region = p[3]; if (p[2] === 'output') s.output = p[3]; save(); return ok(''); }
      if (p[1] === 'sso') { s.configured = true; save(); return ok('SSO session name: academia\nSSO start URL: https://academia.awsapps.com/start\n' + col.ok('Successfully logged into Start URL')); }
      s.configured = true; save();
      return ok(`AWS Access Key ID [None]: ${col.dim('AKIA************ABCD (simulado)')}\nAWS Secret Access Key [None]: ${col.dim('****************************wxyz')}\nDefault region name [None]: ${s.region}\nDefault output format [None]: ${s.output}\n${col.dim('(En tu computadora real, aquí escribirías tus claves. Mejor aún: usa aws configure sso.)')}`);
    }
    if (!s.configured && !(ctx.opts && ctx.opts.autoLogin)) return fail('Unable to locate credentials. You can configure credentials by running "aws configure".', 253);
    s.configured = true;
    const region = A.get('--region') || s.region;
    if (A.get('--region') && !AWS_REGIONS.includes(A.get('--region'))) return fail(`Could not connect to the endpoint URL: "https://s3.${A.get('--region')}.amazonaws.com/" (región inexistente)`, 255);
    const out = (d) => output(d, A, s.output, 'aws');
    // ---- sts / iam
    if (p[0] === 'sts' && p[1] === 'get-caller-identity') return out({ UserId: 'AIDA' + uid(16).toUpperCase(), Account: s.account, Arn: `arn:aws:iam::${s.account}:user/alumno` });
    if (p[0] === 'iam') {
      if (p[1] === 'list-roles') return out({ Roles: Object.keys(s.roles).map((r) => ({ RoleName: r, Arn: `arn:aws:iam::${s.account}:role/${r}`, CreateDate: now() })) });
      if (p[1] === 'create-role') { const n = A.get('--role-name'); if (!n) return fail('aws: error: the following arguments are required: --role-name, --assume-role-policy-document', 252); s.roles[n] = {}; save(); return out({ Role: { RoleName: n, Arn: `arn:aws:iam::${s.account}:role/${n}`, CreateDate: now() } }); }
      if (p[1] === 'attach-role-policy') return ok('');
    }
    // ---- s3
    if (p[0] === 's3') {
      const sub = p[1];
      if (sub === 'mb') {
        const t = s3path(p[2]); if (!t) return fail('aws: error: the following arguments are required: path (s3://bucket)', 252);
        if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(t.b)) return fail(`make_bucket failed: s3://${t.b} An error occurred (InvalidBucketName) when calling the CreateBucket operation: The specified bucket is not valid. (3-63 caracteres, minúsculas, números, puntos y guiones)`);
        if (s.buckets[t.b]) return fail(`make_bucket failed: s3://${t.b} An error occurred (BucketAlreadyOwnedByYou) when calling the CreateBucket operation: Your previous request to create the named bucket succeeded and you already own it.`);
        s.buckets[t.b] = { region, objects: {}, created: now() }; save();
        return ok(`make_bucket: ${t.b}`);
      }
      if (sub === 'rb') { const t = s3path(p[2]); const b = s.buckets[t && t.b]; if (!b) return fail(`remove_bucket failed: An error occurred (NoSuchBucket) when calling the DeleteBucket operation: The specified bucket does not exist`); if (Object.keys(b.objects).length && !A.flags['--force']) return fail(`remove_bucket failed: s3://${t.b} An error occurred (BucketNotEmpty) when calling the DeleteBucket operation: The bucket you tried to delete is not empty (usa --force)`); delete s.buckets[t.b]; save(); return ok(`remove_bucket: ${t.b}`); }
      if (sub === 'ls') {
        const t = s3path(p[2]);
        if (!t) return ok(Object.entries(s.buckets).map(([n, b]) => `${b.created.replace('T', ' ').slice(0, 19)} ${n}`).join('\n'));
        const b = s.buckets[t.b]; if (!b) return fail('An error occurred (NoSuchBucket) when calling the ListObjectsV2 operation: The specified bucket does not exist', 254);
        const pre = t.k;
        const keys = Object.keys(b.objects).filter((k) => k.startsWith(pre)).sort();
        if (A.flags['--recursive']) return ok(keys.map((k) => `${b.objects[k].m.replace('T', ' ').slice(0, 19)} ${String(b.objects[k].c.length).padStart(10)} ${k}`).join('\n') + (A.flags['--summarize'] ? `\n\nTotal Objects: ${keys.length}\n   Total Size: ${keys.reduce((x, k) => x + b.objects[k].c.length, 0)}` : ''));
        const dirs = new Set(), files = [];
        for (const k of keys) { const rest = k.slice(pre.length); if (rest.includes('/')) dirs.add(rest.split('/')[0] + '/'); else files.push(k); }
        return ok([...[...dirs].map((d) => `                           PRE ${d}`), ...files.map((k) => `${b.objects[k].m.replace('T', ' ').slice(0, 19)} ${String(b.objects[k].c.length).padStart(10)} ${k.slice(pre.length)}`)].join('\n'));
      }
      if (sub === 'cp' || sub === 'mv' || sub === 'sync') {
        const [src, dst] = [p[2], p[3]];
        if (!src || !dst) return fail(`aws: error: the following arguments are required: paths`, 252);
        const S3 = s3path(src), D3 = s3path(dst);
        const lines = [];
        const put = (bucket, key, content) => { const b = s.buckets[bucket]; if (!b) throw new Error(`upload failed: An error occurred (NoSuchBucket) when calling the PutObject operation: The specified bucket does not exist`); b.objects[key] = { c: content, m: now() }; };
        try {
          if (!S3 && D3) {
            const lp = Sh.norm(src);
            if (Sh.isDir(lp)) {
              if (!A.flags['--recursive'] && sub !== 'sync') return fail(`upload failed: ${src} to ${dst} [Errno 21] Is a directory: '${src}' (usa --recursive)`);
              for (const k of Object.keys(Machine.fs).filter((x) => Machine.fs[x].t === 'f' && x.startsWith(lp + '/'))) { const key = (D3.k ? D3.k.replace(/\/?$/, '/') : '') + k.slice(lp.length + 1); put(D3.b, key, Machine.fs[k].c); lines.push(`upload: ${Sh.display(k)} to s3://${D3.b}/${key}`); }
            } else {
              const c = Sh.readFile(lp); if (c === null) return fail(`The user-provided path ${src} does not exist.`, 255);
              const key = !D3.k || D3.k.endsWith('/') ? D3.k + src.split('/').pop() : D3.k;
              put(D3.b, key, c); lines.push(`upload: ${src} to s3://${D3.b}/${key}`);
              if (sub === 'mv') { delete Machine.fs[lp]; }
            }
          } else if (S3 && !D3) {
            const b = s.buckets[S3.b]; if (!b) return fail('fatal error: An error occurred (NoSuchBucket) when calling the ListObjectsV2 operation');
            // "-" como destino: el contenido va a la salida estándar (para encadenar con head, jq…)
            if (dst === '-' && sub === 'cp') { const o = b.objects[S3.k]; if (!o) return fail(`fatal error: An error occurred (404) when calling the HeadObject operation: Key "${S3.k}" does not exist`); return ok(o.c.replace(/\n$/, '')); }
            const keys = A.flags['--recursive'] || sub === 'sync' ? Object.keys(b.objects).filter((k) => k.startsWith(S3.k)) : [S3.k];
            for (const k of keys) {
              if (!b.objects[k]) return fail(`fatal error: An error occurred (404) when calling the HeadObject operation: Key "${k}" does not exist`);
              const lp = A.flags['--recursive'] || sub === 'sync' ? Sh.norm(dst) + '/' + k.slice(S3.k.length).replace(/^\//, '') : (Sh.isDir(Sh.norm(dst)) ? Sh.norm(dst) + '/' + k.split('/').pop() : Sh.norm(dst));
              Sh.writeFile(lp, b.objects[k].c); lines.push(`download: s3://${S3.b}/${k} to ${Sh.display(lp)}`);
            }
          } else if (S3 && D3) {
            const b = s.buckets[S3.b];
            for (const k of Object.keys(b ? b.objects : {}).filter((x) => (A.flags['--recursive'] ? x.startsWith(S3.k) : x === S3.k))) { const nk = A.flags['--recursive'] ? D3.k.replace(/\/?$/, '/') + k.slice(S3.k.length).replace(/^\//, '') : (D3.k.endsWith('/') || !D3.k ? D3.k + k.split('/').pop() : D3.k); put(D3.b, nk, b.objects[k].c); lines.push(`copy: s3://${S3.b}/${k} to s3://${D3.b}/${nk}`); if (sub === 'mv') delete b.objects[k]; }
          } else return fail('Error: al menos uno de los caminos debe ser s3://…');
        } catch (e) { return fail(e.message); }
        save(); return ok(lines.join('\n'));
      }
      if (sub === 'rm') { const t = s3path(p[2]); const b = s.buckets[t && t.b]; if (!b) return fail('fatal error: NoSuchBucket'); const keys = A.flags['--recursive'] ? Object.keys(b.objects).filter((k) => k.startsWith(t.k)) : [t.k]; keys.forEach((k) => delete b.objects[k]); save(); return ok(keys.map((k) => `delete: s3://${t.b}/${k}`).join('\n')); }
      if (sub === 'presign') return ok(`https://${s3path(p[2]).b}.s3.amazonaws.com/${s3path(p[2]).k}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${A.get('--expires-in') || 3600}&X-Amz-Signature=${uid(64)}`);
    }
    if (p[0] === 's3api') {
      if (p[1] === 'list-buckets') return out({ Buckets: Object.entries(s.buckets).map(([n, b]) => ({ Name: n, CreationDate: b.created })), Owner: { DisplayName: 'alumno' } });
      if (p[1] === 'put-bucket-versioning' || p[1] === 'put-public-access-block' || p[1] === 'put-bucket-lifecycle-configuration') return ok('');
      if (p[1] === 'list-objects-v2') { const b = s.buckets[A.get('--bucket')]; if (!b) return fail('An error occurred (NoSuchBucket)'); return out({ Contents: Object.entries(b.objects).filter(([k]) => !A.get('--prefix') || k.startsWith(A.get('--prefix'))).map(([k, v]) => ({ Key: k, Size: v.c.length, LastModified: v.m, StorageClass: 'STANDARD' })) }); }
    }
    // ---- glue
    if (p[0] === 'glue') {
      if (p[1] === 'create-database') {
        const inp = A.get('--database-input'); const m = String(inp || '').match(/Name["']?\s*[:=]\s*["']?([\w-]+)/);
        if (!m) return fail('aws: error: the following arguments are required: --database-input (ej. \'{"Name": "lake_bronze"}\')', 252);
        if (s.glueDbs[m[1]]) return fail(`An error occurred (AlreadyExistsException) when calling the CreateDatabase operation: Database already exists.`, 254);
        s.glueDbs[m[1]] = { tables: {} }; save(); return ok('');
      }
      if (p[1] === 'get-databases') return out({ DatabaseList: Object.keys(s.glueDbs).map((n) => ({ Name: n, CatalogId: s.account, CreateTime: now() })) });
      if (p[1] === 'create-crawler') {
        const n = A.get('--name'); const db = A.get('--database-name'); const tg = A.get('--targets');
        const e = !n || !db || !A.get('--role') || !tg ? 'aws: error: the following arguments are required: --name, --role, --database-name, --targets' : null; if (e) return fail(e, 252);
        const path = (String(tg).match(/s3:\/\/[^"'}\]]+/) || [])[0];
        s.crawlers[n] = { db, path, state: 'READY' }; save(); return ok('');
      }
      if (p[1] === 'start-crawler') {
        const c = s.crawlers[A.get('--name')]; if (!c) return fail(`An error occurred (EntityNotFoundException) when calling the StartCrawler operation: Crawler with name ${A.get('--name')} does not exist`, 254);
        // descubre "tablas": una por carpeta de primer nivel bajo la ruta
        const t = s3path(c.path); const b = s.buckets[t.b];
        if (!s.glueDbs[c.db]) s.glueDbs[c.db] = { tables: {} };
        if (b) for (const k of Object.keys(b.objects).filter((x) => x.startsWith(t.k))) {
          const rest = k.slice(t.k.length).replace(/^\//, '');
          const tname = t.k.replace(/\/$/, '').split('/').pop() || (rest.includes('/') ? rest.split('/')[0] : rest.replace(/\.\w+$/, ''));
          const header = (b.objects[k].c.split('\n')[0] || '').split(',');
          const parts = rest.split('/').slice(0, -1).filter((x) => /=/.test(x)).map((x) => x.split('=')[0]);
          s.glueDbs[c.db].tables[tname] = { partitions: parts, location: `s3://${t.b}/${t.k.replace(/\/?$/, '/')}`, columns: header.map((h) => ({ Name: h.trim(), Type: 'string' })), format: k.split('.').pop() };
        }
        c.state = 'READY'; c.last = now(); save(); return ok('');
      }
      if (p[1] === 'get-crawler') { const c = s.crawlers[A.get('--name')]; if (!c) return fail('EntityNotFoundException', 254); return out({ Crawler: { Name: A.get('--name'), State: c.state, DatabaseName: c.db, Targets: { S3Targets: [{ Path: c.path }] }, LastCrawl: c.last ? { Status: 'SUCCEEDED', StartTime: c.last } : undefined } }); }
      if (p[1] === 'get-tables') { const d = s.glueDbs[A.get('--database-name')]; if (!d) return fail(`An error occurred (EntityNotFoundException) when calling the GetTables operation: Database ${A.get('--database-name')} not found.`, 254); return out({ TableList: Object.entries(d.tables).map(([n, t]) => ({ Name: n, DatabaseName: A.get('--database-name'), StorageDescriptor: { Location: t.location, Columns: t.columns }, Parameters: { classification: t.format } })) }); }
      if (p[1] === 'start-job-run') { const j = s.glueJobs[A.get('--job-name')]; if (!j) return fail(`An error occurred (EntityNotFoundException) when calling the StartJobRun operation: Failed to start job run due to missing metadata`, 254); const id = 'jr_' + uid(40); j.runs.push({ id, at: now(), args: A.get('--arguments') }); save(); return out({ JobRunId: id }); }
      if (p[1] === 'get-job') { const j = s.glueJobs[A.get('--job-name')]; if (!j) return fail(`An error occurred (EntityNotFoundException) when calling the GetJob operation: Job with name: ${A.get('--job-name')} not found`, 254); return out({ Job: { Name: A.get('--job-name'), Role: j.role || 'arn:aws:iam::123456789012:role/glue', GlueVersion: j.glue || '4.0', WorkerType: j.worker || 'G.1X', NumberOfWorkers: j.workers || 2, Command: { Name: 'glueetl', ScriptLocation: j.script || '' } } }); }
      if (p[1] === 'get-jobs') return out({ Jobs: Object.keys(s.glueJobs).map((n) => ({ Name: n })) });
      if (p[1] === 'get-job-runs') { const j = s.glueJobs[A.get('--job-name')]; return out({ JobRuns: (j ? j.runs : []).map((r) => ({ Id: r.id, JobRunState: 'SUCCEEDED', StartedOn: r.at, ExecutionTime: 87 })) }); }
      if (p[1] === 'list-jobs' || p[1] === 'get-jobs') return out(p[1] === 'list-jobs' ? { JobNames: Object.keys(s.glueJobs) } : { Jobs: Object.keys(s.glueJobs).map((n) => ({ Name: n, GlueVersion: '4.0', WorkerType: 'G.1X', NumberOfWorkers: 10 })) });
      if (p[1] === 'create-job') { const n = A.get('--name'); if (!n) return fail('aws: error: the following arguments are required: --name, --role, --command', 252); s.glueJobs[n] = { runs: [] }; save(); return out({ Name: n }); }
    }
    // ---- athena (consulta real sobre SQLite)
    if (p[0] === 'athena') {
      if (p[1] === 'start-query-execution') {
        const q = A.get('--query-string'); if (!q || q === true) return fail('aws: error: the following arguments are required: --query-string', 252);
        if (!A.get('--result-configuration') && !A.get('--work-group')) return fail('An error occurred (InvalidRequestException) when calling the StartQueryExecution operation: No output location provided. An output location is required either through the Workgroup result configuration setting or as an API input. (agrega --result-configuration OutputLocation=s3://…)', 254);
        const id = uid(8) + '-' + uid(4) + '-' + uid(4) + '-' + uid(4) + '-' + uid(12);
        let sql = String(q).replace(/\bAwsDataCatalog\./gi, '');
        // tablas del catálogo con archivos reales en el bucket: se cargan desde el CSV; si no, se usan las tablas del curso
        const refs = [...sql.matchAll(/"?(\w+)"?\."?(\w+)"?(?=\s|$|,|\)|;)/g)];
        for (const m of refs) {
          const t = s.glueDbs[m[1]] && s.glueDbs[m[1]].tables[m[2]];
          if (!t || !t.location) continue;
          const L = s3path(t.location); const bk = L && s.buckets[L.b];
          const files = bk ? Object.keys(bk.objects).filter((k) => k.startsWith(L.k) && /\.(csv|txt)$/i.test(k)).map((k) => ({ text: bk.objects[k].c, parts: partsOf(k.slice(L.k.length)) })) : [];
          if (files.length && await materialize(`${m[1]}__${m[2]}`, files)) t.local = `${m[1]}__${m[2]}`;
        }
        sql = sql.replace(/"?(\w+)"?\."?(\w+)"?(?=\s|$|,|\)|;)/g, (m0, a1, b1) => { const t = s.glueDbs[a1] && s.glueDbs[a1].tables[b1]; return t && t.local ? t.local : s.glueDbs[a1] ? b1 : m0; });
        const E = window.Engines.SQL; if (!E._bytes) await E.init();
        const r = E.exec(sql, E.playground());
        s.athena[id] = r.ok ? { state: 'SUCCEEDED', res: r.results[r.results.length - 1] || { columns: [], values: [] }, q } : { state: 'FAILED', reason: r.error.split('\n')[0], q };
        save(); return out({ QueryExecutionId: id });
      }
      if (p[1] === 'get-query-execution') { const x = s.athena[A.get('--query-execution-id')]; if (!x) return fail('An error occurred (InvalidRequestException): QueryExecution not found', 254); return out({ QueryExecution: { QueryExecutionId: A.get('--query-execution-id'), Query: x.q, Status: { State: x.state, StateChangeReason: x.reason }, Statistics: { DataScannedInBytes: Math.floor(Math.random() * 5e7), EngineExecutionTimeInMillis: 812 } } }); }
      if (p[1] === 'get-query-results') {
        const x = s.athena[A.get('--query-execution-id')]; if (!x) return fail('QueryExecution not found', 254);
        if (x.state !== 'SUCCEEDED') return fail(`An error occurred (InvalidRequestException) when calling the GetQueryResults operation: Query has not yet finished. Current state: FAILED (${x.reason})`, 254);
        if ((A.get('--output', '-o') || s.output) === 'table' && !A.get('--query')) return ok(Sh.fmtTable(x.res.columns, x.res.values.slice(0, 1000).map((r) => r.map((v) => (v === null ? '' : String(v))))));
        const rows = [{ Data: x.res.columns.map((c) => ({ VarCharValue: c })) }, ...x.res.values.slice(0, 1000).map((r) => ({ Data: r.map((v) => (v === null ? {} : { VarCharValue: String(v) })) }))];
        return out({ ResultSet: { Rows: rows, ResultSetMetadata: { ColumnInfo: x.res.columns.map((c) => ({ Name: c, Type: 'varchar' })) } } });
      }
      if (p[1] === 'list-work-groups') return out({ WorkGroups: [{ Name: 'primary', State: 'ENABLED' }] });
    }
    // ---- emr / kinesis / lambda / stepfunctions / redshift
    if (p[0] === 'emr') {
      if (p[1] === 'create-cluster') { const id = 'j-' + uid(13).toUpperCase(); s.emr[id] = { name: A.get('--name') || 'Mi cluster', state: 'STARTING', release: A.get('--release-label') || 'emr-7.2.0', apps: A.get('--applications') || 'Name=Spark' }; save(); return out({ ClusterId: id, ClusterArn: arn('elasticmapreduce', 'cluster/' + id) }); }
      if (p[1] === 'list-clusters') return out({ Clusters: Object.entries(s.emr).filter(([, c]) => !A.flags['--active'] || c.state !== 'TERMINATED').map(([id, c]) => ({ Id: id, Name: c.name, Status: { State: c.state === 'STARTING' ? 'WAITING' : c.state } })) });
      if (p[1] === 'terminate-clusters') { for (const id of String(A.get('--cluster-ids') || '').split(/\s+/)) if (s.emr[id]) s.emr[id].state = 'TERMINATED'; save(); return ok(''); }
      if (p[1] === 'add-steps') return out({ StepIds: ['s-' + uid(13).toUpperCase()] });
    }
    if (p[0] === 'kinesis') {
      if (p[1] === 'create-stream') { const n = A.get('--stream-name'); if (!n) return fail('aws: error: the following arguments are required: --stream-name', 252); s.streams[n] = { shards: Number(A.get('--shard-count') || 1), records: [] }; save(); return ok(''); }
      if (p[1] === 'list-streams') return out({ StreamNames: Object.keys(s.streams) });
      if (p[1] === 'put-record') { const x = s.streams[A.get('--stream-name')]; if (!x) return fail(`An error occurred (ResourceNotFoundException) when calling the PutRecord operation: Stream ${A.get('--stream-name')} under account ${s.account} not found.`, 254); x.records.push({ data: A.get('--data'), pk: A.get('--partition-key') }); save(); return out({ ShardId: 'shardId-000000000000', SequenceNumber: String(Date.now()) + uid(10).replace(/\D/g, '') }); }
      if (p[1] === 'describe-stream-summary') { const x = s.streams[A.get('--stream-name')]; if (!x) return fail('ResourceNotFoundException', 254); return out({ StreamDescriptionSummary: { StreamName: A.get('--stream-name'), StreamStatus: 'ACTIVE', OpenShardCount: x.shards, RetentionPeriodHours: 24 } }); }
    }
    if (p[0] === 'lambda') {
      if (p[1] === 'list-functions') return out({ Functions: Object.entries(s.lambdas).map(([n, f]) => ({ FunctionName: n, Runtime: f.runtime, Handler: f.handler, FunctionArn: arn('lambda', 'function:' + n) })) });
      if (p[1] === 'invoke') { const n = A.get('--function-name'); if (!s.lambdas[n]) return fail(`An error occurred (ResourceNotFoundException) when calling the Invoke operation: Function not found: ${arn('lambda', 'function:' + n)}`, 254); const f = p[2]; if (f) Sh.writeFile(Sh.norm(f), JSON.stringify({ statusCode: 200, body: 'archivo procesado' })); save(); return out({ StatusCode: 200, ExecutedVersion: '$LATEST' }); }
      if (p[1] === 'create-function') { const n = A.get('--function-name'); s.lambdas[n] = { runtime: A.get('--runtime') || 'python3.12', handler: A.get('--handler') || 'app.handler' }; save(); return out({ FunctionName: n, FunctionArn: arn('lambda', 'function:' + n), State: 'Pending' }); }
    }
    if (p[0] === 'stepfunctions') {
      if (p[1] === 'list-state-machines') return out({ stateMachines: Object.keys(s.sfn).map((n) => ({ name: n, stateMachineArn: arn('states', 'stateMachine:' + n), type: 'STANDARD' })) });
      if (p[1] === 'start-execution') return out({ executionArn: arn('states', 'execution:pipeline-diario:' + uid(8)), startDate: now() });
    }
    if (p[0] === 'redshift-data') {
      s.rsStmts = s.rsStmts || {};
      if (p[1] === 'execute-statement') {
        const q = A.get('--sql'); if (!q || q === true) return fail('aws: error: the following arguments are required: --sql', 252);
        if (!A.get('--workgroup-name') && !A.get('--cluster-identifier')) return fail('An error occurred (ValidationException) when calling the ExecuteStatement operation: Either a cluster identifier or a workgroup name must be provided.', 254);
        if (!A.get('--database')) return fail('aws: error: the following arguments are required: --database', 252);
        const id = uid(8) + '-' + uid(4) + '-' + uid(4) + '-' + uid(4) + '-' + uid(12);
        const E = window.Engines.SQL; if (!E._bytes) await E.init();
        const r = E.exec(String(q).replace(/\bpublic\./gi, ''), E.playground());
        s.rsStmts[id] = r.ok ? { state: 'FINISHED', res: r.results[r.results.length - 1] || { columns: [], values: [] } } : { state: 'FAILED', reason: r.error.split('\n')[0] };
        save(); return out({ Id: id, Database: A.get('--database'), WorkgroupName: A.get('--workgroup-name'), CreatedAt: now() });
      }
      if (p[1] === 'describe-statement') { const x = s.rsStmts[A.get('--id')]; if (!x) return fail('An error occurred (ResourceNotFoundException) when calling the DescribeStatement operation: Query does not exist.', 254); return out({ Id: A.get('--id'), Status: x.state, Error: x.reason, HasResultSet: x.state === 'FINISHED' && x.res.columns.length > 0, ResultRows: x.res ? x.res.values.length : 0 }); }
      if (p[1] === 'get-statement-result') {
        const x = s.rsStmts[A.get('--id')]; if (!x) return fail('ResourceNotFoundException: Query does not exist.', 254);
        if (x.state !== 'FINISHED') return fail(`An error occurred (ValidationException): Query failed: ${x.reason}`, 254);
        return out({ ColumnMetadata: x.res.columns.map((c) => ({ name: c })), Records: x.res.values.slice(0, 1000).map((r) => r.map((v) => (v === null ? { isNull: true } : typeof v === 'number' ? (Number.isInteger(v) ? { longValue: v } : { doubleValue: v }) : { stringValue: String(v) }))), TotalNumRows: x.res.values.length });
      }
    }
    if (p[0] === 'redshift-serverless' || p[0] === 'redshift') return out({ workgroups: [{ workgroupName: 'analitica', status: 'AVAILABLE', baseCapacity: 8 }] });
    if (p[0] === 'lakeformation') {
      s.lf = s.lf || [];
      if (p[1] === 'grant-permissions') { const pr = A.get('--principal'), rs = A.get('--resource'), pe = A.get('--permissions'); if (!pr || !rs || !pe) return fail('aws: error: the following arguments are required: --principal, --resource, --permissions', 252); s.lf.push({ Principal: { DataLakePrincipalIdentifier: String(pr).replace(/^.*DataLakePrincipalIdentifier=/, '') }, Resource: String(rs), Permissions: String(pe).split(/[\s,]+/) }); save(); return ok(''); }
      if (p[1] === 'list-permissions') return out({ PrincipalResourcePermissions: s.lf });
    }
    if (p[0] === 'firehose') {
      s.firehose = s.firehose || {};
      if (p[1] === 'create-delivery-stream') { const n = A.get('--delivery-stream-name'); if (!n) return fail('aws: error: the following arguments are required: --delivery-stream-name', 252); s.firehose[n] = { records: 0 }; save(); return out({ DeliveryStreamARN: arn('firehose', 'deliverystream/' + n) }); }
      if (p[1] === 'list-delivery-streams') return out({ DeliveryStreamNames: Object.keys(s.firehose), HasMoreDeliveryStreams: false });
      if (p[1] === 'put-record') { const x = s.firehose[A.get('--delivery-stream-name')]; if (!x) return fail(`An error occurred (ResourceNotFoundException) when calling the PutRecord operation: Firehose ${A.get('--delivery-stream-name')} under account ${s.account} not found.`, 254); x.records++; save(); return out({ RecordId: uid(56), Encrypted: false }); }
    }
    if (p[0] === 'events') {
      s.rules = s.rules || {};
      if (p[1] === 'put-rule') { const n = A.get('--name'); if (!n) return fail('aws: error: the following arguments are required: --name', 252); if (!A.get('--schedule-expression') && !A.get('--event-pattern')) return fail('An error occurred (ValidationException) when calling the PutRule operation: Parameter(s) ScheduleExpression or EventPattern must be specified.', 254); s.rules[n] = { schedule: A.get('--schedule-expression'), pattern: A.get('--event-pattern'), targets: [] }; save(); return out({ RuleArn: arn('events', 'rule/' + n) }); }
      if (p[1] === 'put-targets') { const r = s.rules[A.get('--rule')]; if (!r) return fail(`An error occurred (ResourceNotFoundException) when calling the PutTargets operation: Rule ${A.get('--rule')} does not exist on EventBus default.`, 254); r.targets.push(A.get('--targets')); save(); return out({ FailedEntryCount: 0, FailedEntries: [] }); }
      if (p[1] === 'list-rules') return out({ Rules: Object.entries(s.rules).map(([n, r]) => ({ Name: n, State: 'ENABLED', ScheduleExpression: r.schedule })) });
    }
    if (p[0] === 'logs' && p[1] === 'tail') return ok(`${now().slice(0, 19)} [INFO] START RequestId: ${uid(8)}\n${now().slice(0, 19)} [INFO] Procesando s3://datos/landing/ventas.csv\n${now().slice(0, 19)} [INFO] 1250 filas válidas, 3 descartadas\n${now().slice(0, 19)} [INFO] END RequestId (Duration: 812 ms, Max Memory Used: 96 MB)`);
    if (p[0] === 'cloudformation' && p[1] === 'deploy') { if (!A.get('--template-file') || !A.get('--stack-name')) return fail('aws: error: the following arguments are required: --template-file, --stack-name', 252); return ok(`\nWaiting for changeset to be created..\nWaiting for stack create/update to complete\nSuccessfully created/updated stack - ${A.get('--stack-name')}`); }
    if (p[0] === 'stepfunctions' && p[1] === 'create-state-machine') { const n = A.get('--name'); if (!n || !A.get('--definition') || !A.get('--role-arn')) return fail('aws: error: the following arguments are required: --name, --definition, --role-arn', 252); s.sfn[n] = {}; save(); return out({ stateMachineArn: arn('states', 'stateMachine:' + n), creationDate: now() }); }
    if (p[0] === 'mwaa' && p[1] === 'list-environments') return out({ Environments: ['airflow-datos'] });
    return fail(`aws: error: argument operation: '${p.slice(0, 2).join(' ')}' no está simulado en esta terminal (o está mal escrito). Prueba: aws help`, 252);
  });

  // ================================================================== GOOGLE CLOUD
  function gcp() {
    return st('gcp', () => ({ account: null, project: null, region: 'us-central1', projects: ['academia-datos-dev', 'academia-datos-prod'], buckets: {}, datasets: {}, topics: {}, subs: {}, dataproc: {}, composer: { 'airflow-datos': { state: 'RUNNING' } }, dataflow: [], apis: [] }));
  }
  const needGcp = (s, ctx) => {
    if (!s.account && !(ctx.opts && ctx.opts.autoLogin)) return fail('ERROR: (gcloud) You do not currently have an active account selected.\nPlease run:\n\n  $ gcloud auth login\n\nto obtain new credentials.');
    if (!s.account) { s.account = 'alumno@academia.dev'; s.project = s.project || 'academia-datos-dev'; }
    if (!s.project) return fail('ERROR: (gcloud) The required property [project] is not currently set.\nYou may set it for your current workspace by running:\n\n  $ gcloud config set project VALUE');
    return null;
  };
  function gsPath(u) { const m = String(u || '').match(/^gs:\/\/([^/]+)\/?(.*)$/); return m ? { b: m[1], k: m[2] } : null; }
  function gcsCopy(s, src, dst, recursive) {
    const S = gsPath(src), D = gsPath(dst), lines = [];
    if (!S && D) {
      const b = s.buckets[D.b]; if (!b) return fail(`ERROR: (gcloud.storage.cp) gs://${D.b} not found: 404.`);
      const lp = Sh.norm(src);
      if (Sh.isDir(lp)) {
        if (!recursive) return fail(`ERROR: (gcloud.storage.cp) Source URL ${src} is a directory: usa --recursive`);
        for (const k of Object.keys(Machine.fs).filter((x) => Machine.fs[x].t === 'f' && x.startsWith(lp + '/'))) { const key = (D.k ? D.k.replace(/\/?$/, '/') : '') + lp.split('/').pop() + '/' + k.slice(lp.length + 1); b.objects[key] = Machine.fs[k].c; lines.push(`Copying file://${Sh.display(k)} to gs://${D.b}/${key}`); }
      } else {
        const c = Sh.readFile(lp); if (c === null) return fail(`ERROR: (gcloud.storage.cp) The following URLs matched no objects or files:\n-${src}`);
        const key = !D.k || D.k.endsWith('/') ? D.k + src.split('/').pop() : D.k; b.objects[key] = c; lines.push(`Copying file://${src} to gs://${D.b}/${key}`);
      }
    } else if (S && !D) {
      const b = s.buckets[S.b]; if (!b || b.objects[S.k] === undefined) return fail(`ERROR: (gcloud.storage.cp) The following URLs matched no objects or files:\n-${src}`);
      const lp = Sh.isDir(Sh.norm(dst)) ? Sh.norm(dst) + '/' + S.k.split('/').pop() : Sh.norm(dst); Sh.writeFile(lp, b.objects[S.k]); lines.push(`Copying gs://${S.b}/${S.k} to file://${Sh.display(lp)}`);
    } else return fail('ERROR: al menos uno de los caminos debe ser gs://…');
    save(); return ok(lines.join('\n') + `\n  Completed files ${lines.length}/${lines.length}`);
  }
  def('gcloud', 'Google Cloud CLI simulada (auth, config, storage, pubsub, dataproc, composer, dataflow…)', (a, ctx) => {
    const s = gcp(); const A = args(a); const p = A.pos;
    if (!p.length || A.flags['--help']) return ok('Usage: gcloud GROUP | COMMAND [--project=PROJECT_ID] …\n\nGrupos simulados: auth, config, projects, services, storage, pubsub, dataproc, composer, dataflow, iam');
    if (p[0] === 'version' || A.flags['--version']) return ok('Google Cloud SDK 490.0.0\nbq 2.1.8\ncore 2024.09.06\ngcloud-crc32c 1.0.0\ngsutil 5.30');
    if (p[0] === 'auth') {
      if (p[1] === 'login') { s.account = 'alumno@academia.dev'; save(); return ok(`${col.dim('Your browser has been opened to visit: https://accounts.google.com/o/oauth2/auth?… (simulado)')}\n\nYou are now logged in as [alumno@academia.dev].\nYour current project is [${s.project || 'None'}].  You can change this setting by running:\n  $ gcloud config set project PROJECT_ID`); }
      if (p[1] === 'application-default' && p[2] === 'login') { s.account = s.account || 'alumno@academia.dev'; save(); return ok('Credentials saved to file: [~/.config/gcloud/application_default_credentials.json]'); }
      if (p[1] === 'list') return ok(`       Credentialed Accounts\nACTIVE  ACCOUNT\n${s.account ? '*       ' + s.account : ''}`);
      if (p[1] === 'revoke') { s.account = null; save(); return ok('Revoked credentials'); }
    }
    if (p[0] === 'config') {
      if (p[1] === 'set') {
        const [k, v] = [p[2], p[3]];
        let warn = '';
        if (k === 'project') { if (!s.projects.includes(v)) warn = col.warn(`WARNING: You do not appear to have access to project [${v}] or it does not exist.`) + '\n'; s.project = v; }
        else if (k === 'compute/region' || k === 'dataproc/region') s.region = v;
        save();
        return ok(`${warn}Updated property [${k.includes('/') ? k : 'core/' + k}].`);
      }
      if (p[1] === 'list') return ok(`[core]\naccount = ${s.account || '(unset)'}\nproject = ${s.project || '(unset)'}\n[compute]\nregion = ${s.region}`);
      if (p[1] === 'get-value' || p[1] === 'get') return ok(String({ project: s.project, account: s.account, 'compute/region': s.region }[p[2]] ?? ''));
    }
    const e = needGcp(s, ctx); if (e) return e;
    const proj = A.get('--project') || s.project;
    if (p[0] === 'projects' && p[1] === 'list') return output(s.projects.map((x, i) => ({ projectId: x, name: x, projectNumber: String(1000000000 + i) })), A, 'table');
    if (p[0] === 'services') {
      if (p[1] === 'enable') { for (const x of p.slice(2)) if (!s.apis.includes(x)) s.apis.push(x); save(); return ok(`Operation "operations/acf.p2-${uid(12)}" finished successfully.`); }
      if (p[1] === 'list') return output(s.apis.map((n) => ({ NAME: n, TITLE: n.split('.')[0] })), A, 'table');
    }
    if (p[0] === 'storage') {
      // en ls/du/rm/mv, -l -L -r -s -a son banderas sin valor (no se comen la ruta siguiente)
      if (['ls', 'du', 'rm', 'mv', 'rsync'].includes(a[1]) || (a[1] === 'cp')) {
        const B = args(a, ['-l', '-L', '--long', '-r', '-R', '-s', '-a', '--summarize', '--readable-sizes', '--delete-unmatched-destination-objects', '-c', '--checksums-only']);
        Object.assign(A.flags, B.flags); p.length = 0; p.push(...B.pos);
      }
      const rec = A.flags['--recursive'] || A.flags['-r'] || A.flags['-R'];
      const glob = (pat) => new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*').replace(/\?/g, '[^/]') + '$');
      const match = (t) => { const b = s.buckets[t.b]; if (!b) return null; if (!/[*?]/.test(t.k)) return null; const re = glob(t.k); return Object.keys(b.objects).filter((k) => re.test(k)).sort(); };
      const size = (c) => new TextEncoder().encode(c).length;
      const human = (n) => (n < 1024 ? n + 'B' : n < 1048576 ? (n / 1024).toFixed(2) + 'kiB' : (n / 1048576).toFixed(2) + 'MiB');
      if (p[1] === 'buckets' && p[2] === 'add-iam-policy-binding') {
        const t = gsPath(p[3]); const b = t && s.buckets[t.b];
        if (!b) return fail(`ERROR: (gcloud.storage.buckets.add-iam-policy-binding) gs://${t ? t.b : p[3]} not found: 404.`);
        if (!A.get('--member') || !A.get('--role')) return fail('ERROR: (gcloud.storage.buckets.add-iam-policy-binding) argument --member --role: Must be specified.');
        b.iam = (b.iam || []).concat({ member: A.get('--member'), role: A.get('--role') }); save();
        return ok(`bindings:\n${b.iam.map((x) => `- members:\n  - ${x.member}\n  role: ${x.role}`).join('\n')}\netag: CAE=`);
      }
      if (p[1] === 'buckets' && (p[2] === 'describe' || p[2] === 'update')) {
        const t = gsPath(p[3]); const b = t && s.buckets[t.b];
        if (!b) return fail(`ERROR: (gcloud.storage.buckets.${p[2]}) gs://${t ? t.b : p[3]} not found: 404.`);
        if (p[2] === 'update') {
          const lf = A.get('--lifecycle-file');
          if (lf) { const c = Sh.readFile(Sh.norm(lf)); if (c === null) return fail(`ERROR: (gcloud.storage.buckets.update) Could not read file ${lf}`); try { b.lifecycle = JSON.parse(c); } catch (err) { return fail(`ERROR: (gcloud.storage.buckets.update) Invalid JSON in ${lf}: ${err.message}`); } }
          if (A.flags['--clear-lifecycle']) delete b.lifecycle;
          if (A.flags['--versioning']) b.versioning = true;
          if (A.flags['--no-versioning']) b.versioning = false;
          if (A.get('--default-storage-class')) b.storageClass = String(A.get('--default-storage-class')).toUpperCase();
          if (A.flags['--public-access-prevention']) b.pap = true;
          if (A.get('--update-labels')) b.labels = Object.assign(b.labels || {}, Object.fromEntries(String(A.get('--update-labels')).split(',').map((x) => x.split('='))));
          save(); return ok(`Updating gs://${t.b}/...
  Completed 1`);
        }
        return output({ name: t.b, storage_url: `gs://${t.b}/`, location: b.location, location_type: /^(US|EU|ASIA)$/.test(b.location) ? 'multi-region' : 'region', default_storage_class: b.storageClass || 'STANDARD', uniform_bucket_level_access: true, public_access_prevention: b.pap ? 'enforced' : 'inherited', versioning_enabled: !!b.versioning, lifecycle_config: b.lifecycle || undefined, labels: b.labels || undefined, creation_time: b.created }, A, 'yaml');
      }
      if (p[1] === 'du') {
        const t = gsPath(p[2]); const b = t && s.buckets[t.b];
        if (!b) return fail(`ERROR: (gcloud.storage.du) The following URLs matched no objects or files:\n-${p[2]}`);
        const keys = Object.keys(b.objects).filter((k) => k.startsWith(t.k)).sort();
        const fmt = (n) => (A.flags['--readable-sizes'] ? human(n) : String(n)).padEnd(10);
        if (A.flags['-s'] || A.flags['--summarize']) return ok(`${fmt(keys.reduce((x, k) => x + size(b.objects[k]), 0))} gs://${t.b}${t.k ? '/' + t.k : ''}`);
        return ok(keys.map((k) => `${fmt(size(b.objects[k]))} gs://${t.b}/${k}`).join('\n'));
      }
      if (p[1] === 'mv') {
        const S = gsPath(p[2]), D = gsPath(p[3]);
        if (!S || !D) return fail('ERROR: (gcloud.storage.mv) en este simulador, origen y destino deben ser gs://…');
        const bs = s.buckets[S.b], bd = s.buckets[D.b];
        if (!bs || bs.objects[S.k] === undefined) return fail(`ERROR: (gcloud.storage.mv) The following URLs matched no objects or files:\n-${p[2]}`);
        if (!bd) return fail(`ERROR: (gcloud.storage.mv) gs://${D.b} not found: 404.`);
        const key = !D.k || D.k.endsWith('/') ? D.k + S.k.split('/').pop() : D.k;
        bd.objects[key] = bs.objects[S.k]; delete bs.objects[S.k]; save();
        return ok(`Copying gs://${S.b}/${S.k} to gs://${D.b}/${key}\nRemoving gs://${S.b}/${S.k}...\n  Completed files 1/1`);
      }
      if (p[1] === 'rsync') {
        const D = gsPath(p[3]); const lp = Sh.norm(p[2] || '');
        if (!D || gsPath(p[2])) return fail('ERROR: (gcloud.storage.rsync) en este simulador: rsync CARPETA_LOCAL gs://BUCKET/PREFIJO');
        const b = s.buckets[D.b]; if (!b) return fail(`ERROR: (gcloud.storage.rsync) gs://${D.b} not found: 404.`);
        if (!Sh.isDir(lp)) return fail(`ERROR: (gcloud.storage.rsync) ${p[2]} no es una carpeta`);
        const pre = D.k ? D.k.replace(/\/?$/, '/') : '';
        const files = Object.keys(Machine.fs).filter((x) => Machine.fs[x].t === 'f' && x.startsWith(lp + '/') && (rec || !x.slice(lp.length + 1).includes('/')));
        const lines = []; const want = new Set();
        for (const f of files) { const key = pre + f.slice(lp.length + 1); want.add(key); if (b.objects[key] !== Machine.fs[f].c) { b.objects[key] = Machine.fs[f].c; lines.push(`Copying file://${Sh.display(f)} to gs://${D.b}/${key}`); } }
        if (A.flags['--delete-unmatched-destination-objects']) for (const k of Object.keys(b.objects)) if (k.startsWith(pre) && !want.has(k)) { delete b.objects[k]; lines.push(`Removing gs://${D.b}/${k}...`); }
        save(); return ok(lines.length ? lines.join('\n') + `\n  Completed files ${lines.length}` : 'Nada que sincronizar: el destino ya está al día.');
      }
      if (p[1] === 'buckets' && p[2] === 'create') {
        const t = gsPath(p[3]); if (!t) return fail('ERROR: (gcloud.storage.buckets.create) argument URL: debe ser gs://NOMBRE');
        if (!/^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/.test(t.b)) return fail(`ERROR: (gcloud.storage.buckets.create) HTTPError 400: Invalid bucket name: '${t.b}'`);
        if (s.buckets[t.b]) return fail(`ERROR: (gcloud.storage.buckets.create) HTTPError 409: Your previous request to create the named bucket succeeded and you already own it.`);
        s.buckets[t.b] = { location: (A.get('--location', '-l') || 'US').toUpperCase(), objects: {}, created: now(), project: proj }; save();
        return ok(`Creating gs://${t.b}/...`);
      }
      if (p[1] === 'buckets' && p[2] === 'list') return output(Object.entries(s.buckets).map(([n, b]) => ({ name: n, location: b.location, storage_url: `gs://${n}/` })), A, 'yaml');
      if (p[1] === 'ls') {
        const t = gsPath(p[2]);
        if (!t) return ok(Object.keys(s.buckets).map((n) => `gs://${n}/`).join('\n'));
        const b = s.buckets[t.b]; if (!b) return fail(`ERROR: (gcloud.storage.ls) gs://${t.b} not found: 404.`);
        const long = A.flags['-l'] || A.flags['-L'] || A.flags['--long'];
        const linea = (k) => (long ? `${String(size(b.objects[k])).padStart(10)}  ${String(b.created || now()).slice(0, 19)}Z  ` : '') + `gs://${t.b}/${k}`;
        const m = match(t);
        if (m) return m.length ? ok(m.map(linea).join('\n')) : fail(`ERROR: (gcloud.storage.ls) One or more URLs matched no objects.`);
        const keys = Object.keys(b.objects).filter((k) => k.startsWith(t.k)).sort();
        if (!keys.length && t.k) return fail(`ERROR: (gcloud.storage.ls) One or more URLs matched no objects.`);
        if (rec) return ok(keys.map(linea).join('\n') + (long ? `\nTOTAL: ${keys.length} objects, ${keys.reduce((x, k) => x + size(b.objects[k]), 0)} bytes` : ''));
        if (long && keys.includes(t.k)) return ok(linea(t.k));
        const pre = t.k ? t.k.replace(/\/?$/, '/') : '';
        const set = new Set(keys.map((k) => { const r = k.slice(t.k.length).replace(/^\//, ''); return r.includes('/') ? `${' '.repeat(long ? 34 : 0)}gs://${t.b}/${pre}${r.split('/')[0]}/` : linea(pre + r); }));
        return ok([...set].join('\n'));
      }
      if (p[1] === 'cp') return gcsCopy(s, p[2], p[3], rec);
      if (p[1] === 'rm') { const t = gsPath(p[2]); const b = s.buckets[t && t.b]; if (!b) return fail('ERROR: not found: 404'); const keys = match(t) || (rec ? Object.keys(b.objects).filter((k) => k.startsWith(t.k)) : b.objects[t.k] !== undefined ? [t.k] : []); if (!keys.length) return fail(`ERROR: (gcloud.storage.rm) The following URLs matched no objects or files:\n-${p[2]}`); keys.forEach((k) => delete b.objects[k]); save(); return ok(keys.map((k) => `Removing gs://${t.b}/${k}...`).join('\n')); }
      if (p[1] === 'cat') { const t = gsPath(p[2]); const b = s.buckets[t && t.b]; if (!b || b.objects[t.k] === undefined) return fail('ERROR: (gcloud.storage.cat) The following URLs matched no objects or files'); return ok(b.objects[t.k].replace(/\n$/, '')); }
    }
    if (p[0] === 'pubsub') {
      if (p[1] === 'topics' && p[2] === 'create') { const n = p[3]; if (!n) return fail('ERROR: (gcloud.pubsub.topics.create) argument TOPIC: Must be specified.'); if (s.topics[n]) return fail(`ERROR: Failed to create topic [projects/${proj}/topics/${n}]: Resource already exists in the project (resource=${n}).`); s.topics[n] = { msgs: [] }; save(); return ok(`Created topic [projects/${proj}/topics/${n}].`); }
      if (p[1] === 'topics' && p[2] === 'list') return output(Object.keys(s.topics).map((n) => ({ name: `projects/${proj}/topics/${n}` })), A, 'yaml');
      if (p[1] === 'topics' && p[2] === 'publish') { const t = s.topics[p[3]]; if (!t) return fail(`ERROR: (gcloud.pubsub.topics.publish) NOT_FOUND: Resource not found (resource=${p[3]}).`); const msg = A.get('--message'); t.msgs.push(msg); for (const sub of Object.values(s.subs)) if (sub.topic === p[3]) sub.queue.push(msg); save(); return ok(`messageIds:\n- '${Date.now()}'`); }
      if (p[1] === 'subscriptions' && p[2] === 'create') { const t = A.get('--topic'); if (!t || !s.topics[t]) return fail(`ERROR: (gcloud.pubsub.subscriptions.create) NOT_FOUND: Requested entity was not found (topic ${t}).`); s.subs[p[3]] = { topic: t, queue: [] }; save(); return ok(`Created subscription [projects/${proj}/subscriptions/${p[3]}].`); }
      if (p[1] === 'subscriptions' && p[2] === 'list') return output(Object.entries(s.subs).map(([n, x]) => ({ name: `projects/${proj}/subscriptions/${n}`, topic: `projects/${proj}/topics/${x.topic}`, ackDeadlineSeconds: 10 })), A, 'yaml');
      if (p[1] === 'subscriptions' && p[2] === 'pull') { const sub = s.subs[p[3]]; if (!sub) return fail('ERROR: NOT_FOUND'); const msgs = A.flags['--auto-ack'] ? sub.queue.splice(0, Number(A.get('--limit') || 1)) : sub.queue.slice(0, Number(A.get('--limit') || 1)); save(); return msgs.length ? output(msgs.map((m) => ({ DATA: m, MESSAGE_ID: String(Date.now()) })), A, 'table') : ok('Listed 0 items.'); }
    }
    if (p[0] === 'dataproc') {
      if (p[1] === 'clusters' && p[2] === 'create') { const n = p[3]; s.dataproc[n] = { region: A.get('--region') || s.region, workers: Number(A.get('--num-workers') || 2), state: 'RUNNING' }; save(); return ok(`Waiting for cluster creation operation...done.\nCreated [https://dataproc.googleapis.com/v1/projects/${proj}/regions/${s.dataproc[n].region}/clusters/${n}] Cluster placed in zone [${s.dataproc[n].region}-a].`); }
      if (p[1] === 'clusters' && p[2] === 'list') return output(Object.entries(s.dataproc).map(([n, c]) => ({ NAME: n, PLATFORM: 'GCE', WORKER_COUNT: c.workers, STATUS: c.state, ZONE: c.region + '-a' })), A, 'table');
      if (p[1] === 'clusters' && p[2] === 'delete') { delete s.dataproc[p[3]]; save(); return ok(`Deleted [https://dataproc.googleapis.com/v1/projects/${proj}/regions/${s.region}/clusters/${p[3]}].`); }
      if (p[1] === 'jobs' && p[2] === 'submit') { if (!s.dataproc[A.get('--cluster')]) return fail(`ERROR: (gcloud.dataproc.jobs.submit.${p[3]}) NOT_FOUND: Not found: Cluster projects/${proj}/regions/${s.region}/clusters/${A.get('--cluster')}`); return ok(`Job [${uid(32)}] submitted.\nWaiting for job output...\n24/12/31 03:00:01 INFO SparkContext: Running Spark version 3.5.1\n${col.dim('…')}\nJob [${uid(8)}] finished successfully.\nstatus:\n  state: DONE`); }
      if (p[1] === 'batches' && p[2] === 'submit') return ok(`Batch [${uid(16)}] submitted.\n${col.dim('(Dataproc Serverless: sin clusters que administrar)')}\nBatch [${uid(8)}] finished.\nstate: SUCCEEDED`);
    }
    if (p[0] === 'composer' && p[1] === 'environments') {
      if (p[2] === 'list') return output(Object.entries(s.composer).map(([n, c]) => ({ NAME: n, LOCATION: s.region, STATE: c.state })), A, 'table');
      if (p[2] === 'run') return ok(`Executing within the following Kubernetes cluster namespace: composer-2-9-airflow-2-9\n${col.dim('(simulado)')} ${p.slice(5).join(' ')}: OK`);
      if (p[2] === 'storage' && p[3] === 'dags' && p[4] === 'import') { const src = A.get('--source'); if (!src || !Sh.exists(Sh.norm(src))) return fail(`ERROR: (gcloud.composer.environments.storage.dags.import) Source file not found: ${src}`); return ok(`Importing DAGs to gs://us-central1-airflow-datos-bucket/dags/ …\nCopying file://${src}\n  Completed files 1/1`); }
    }
    if (p[0] === 'dataflow') {
      if (p[1] === 'jobs' && p[2] === 'list') return output(s.dataflow.map((j) => ({ JOB_ID: j.id, NAME: j.name, TYPE: j.type, STATE: j.state })), A, 'table');
      if (p[1] === 'jobs' && p[2] === 'run' || p[1] === 'flex-template' && p[2] === 'run') { const j = { id: '2024-12-31_03_00_00-' + uid(10).replace(/\D/g, '1'), name: p[3], type: 'Streaming', state: 'Running' }; s.dataflow.push(j); save(); return ok(`job:\n  id: ${j.id}\n  name: ${j.name}\n  type: JOB_TYPE_STREAMING`); }
    }
    if (p[0] === 'iam' && p[1] === 'service-accounts' && p[2] === 'create') return ok(`Created service account [${p[3]}].`);
    if (p[0] === 'projects' && p[1] === 'add-iam-policy-binding') return ok(`Updated IAM policy for project [${p[2]}].\nbindings:\n- members:\n  - ${A.get('--member')}\n  role: ${A.get('--role')}`);
    return fail(`ERROR: (gcloud) Invalid choice: '${p.slice(0, 2).join(' ')}' (o no está simulado en esta terminal).`, 2);
  });
  def('gsutil', 'herramienta clásica de Cloud Storage (mb, ls, cp, rm)', (a, ctx) => {
    const s = gcp(); const e = needGcp(s, ctx); if (e) return e;
    const A = args(a); const p = A.pos;
    if (p[0] === 'mb') { const t = gsPath(p[1]); if (!t) return fail('CommandException: mb requiere gs://BUCKET'); if (s.buckets[t.b]) return fail(`ServiceException: 409 A Cloud Storage bucket named '${t.b}' already exists.`); s.buckets[t.b] = { location: A.get('-l') || 'US', objects: {}, created: now() }; save(); return ok(`Creating gs://${t.b}/...`); }
    if (['ls', 'du', 'mv', 'rsync'].includes(a[0])) return window.Shell.Commands.gcloud(['storage', ...a], ctx);
    if (p[0] === 'cp') return gcsCopy(s, p[1], p[2], A.flags['-r']);
    if (a[0] === 'rm') return window.Shell.Commands.gcloud(['storage', ...a], ctx);
    if (p[0] === 'cat') return window.Shell.Commands.gcloud(['storage', 'cat', p[1]], ctx);
    return ok('Usage: gsutil [mb|ls|cp|mv|rm|cat|du|rsync] …  (hoy se recomienda gcloud storage)');
  });

  // ---- bq: consultas reales sobre SQLite
  def('bq', 'BigQuery (simulado): mk, ls, show, load, query (se ejecuta de verdad sobre las tablas del curso)', async (a, ctx) => {
    const s = gcp(); const e = needGcp(s, ctx); if (e) return e;
    const A = args(a, ['--dataset', '-d', '--table', '-t', '--replace', '--append_table', '--dry_run', '--autodetect', '--nouse_legacy_sql', '--schema', '--force', '-f']); const p = A.pos;
    const proj = A.get('--project_id') || s.project;
    if (!p.length) return ok('Usage: bq [mk|ls|show|load|query|rm] …');
    if (p[0] === 'mk') {
      const name = p[1]; if (!name) return fail('BigQuery error in mk operation: falta el nombre del dataset');
      if (A.flags['--dataset'] || A.flags['-d'] || !name.includes('.') || name.split('.').length === 2 && !A.flags['--table'] && !A.flags['-t']) {
        const ds = name.includes(':') ? name.split(':')[1] : name;
        if (s.datasets[ds]) return fail(`BigQuery error in mk operation: Dataset '${proj}:${ds}' already exists.`);
        s.datasets[ds] = { location: A.get('--location') || 'US', tables: {} }; save(); return ok(`Dataset '${proj}:${ds}' successfully created.`);
      }
      if (A.flags['--table'] || A.flags['-t']) {
        const [ds, tb] = name.replace(/^.*:/, '').split('.');
        if (!s.datasets[ds]) return fail(`BigQuery error in mk operation: Not found: Dataset ${proj}:${ds}`);
        if (s.datasets[ds].tables[tb]) return fail(`BigQuery error in mk operation: Table '${proj}:${ds}.${tb}' already exists.`);
        const schema = p[2]; if (!schema) return fail('BigQuery error in mk operation: falta el esquema (ej. pedido_id:INTEGER,fecha:DATE,canal:STRING)');
        const cols = schema.split(',').map((x) => x.split(':'));
        const part = A.get('--time_partitioning_field'), clus = A.get('--clustering_fields');
        if (part && !cols.some(([c, t]) => c === part && /^(DATE|TIMESTAMP|DATETIME)$/i.test(t || ''))) return fail(`BigQuery error in mk operation: The field specified for time partitioning can only be of type TIMESTAMP, DATE or DATETIME. (revisa '${part}' en el esquema)`);
        const E = window.Engines.SQL; if (!E._bytes) await E.init();
        E.exec(`DROP TABLE IF EXISTS ${ds}__${tb}; CREATE TABLE ${ds}__${tb} (${cols.map(([c]) => '"' + c + '"').join(', ')});`, E.playground());
        s.datasets[ds].tables[tb] = { rows: 0, schema, local: `${ds}__${tb}`, partition: part || (A.get('--time_partitioning_type') ? '_PARTITIONTIME' : null), cluster: clus || null }; save();
        return ok(`Table '${proj}:${ds}.${tb}' successfully created.`);
      }
    }
    if (p[0] === 'ls') {
      const ds = p[1];
      if (!ds) return ok('  datasetId\n ' + '-'.repeat(12) + '\n' + Object.keys(s.datasets).map((d) => '  ' + d).join('\n'));
      const d = s.datasets[ds.replace(/^.*:/, '')]; if (!d) return fail(`BigQuery error in ls operation: Not found: Dataset ${proj}:${ds}`);
      return ok('     tableId      Type\n ---------------- -------\n' + Object.keys(d.tables).map((t) => `  ${t.padEnd(16)} TABLE`).join('\n'));
    }
    if (p[0] === 'load') {
      const [dest, src, schema] = [p[1], p[2], p[3]];
      if (!dest || !src) return fail('BigQuery error in load operation: Usage: bq load [--source_format=CSV] dataset.tabla gs://bucket/archivo.csv [esquema]');
      const [ds, tb] = dest.split('.'); if (!s.datasets[ds]) return fail(`BigQuery error in load operation: Not found: Dataset ${proj}:${ds}`);
      const t = gsPath(src); const b = t && s.buckets[t.b];
      if (!b || b.objects[t.k] === undefined) return fail(`BigQuery error in load operation: Error processing job: Not found: URI ${src}`);
      const lines = b.objects[t.k].replace(/\n$/, '').split('\n');
      const n = lines.length - (A.get('--skip_leading_rows') ? Number(A.get('--skip_leading_rows')) : 0);
      s.datasets[ds].tables[tb] = { rows: n, schema: schema || (A.flags['--autodetect'] ? 'autodetect' : lines[0]), csv: b.objects[t.k], skip: Number(A.get('--skip_leading_rows') || 0), cols: schema ? schema.split(',').map((x) => x.split(':')[0]) : null }; save();
      return ok(`Waiting on bqjob_r${uid(16)}_${uid(16)} ... (1s) Current status: DONE\n${col.dim(`(${n} filas cargadas en ${proj}:${ds}.${tb})`)}`);
    }
    if (p[0] === 'show') { const [ds, tb] = (p[1] || '').replace(/^.*:/, '').split('.'); const d = s.datasets[ds]; if (!d) return fail(`BigQuery error in show operation: Not found: Dataset ${proj}:${ds}`); if (tb) { const x = d.tables[tb]; if (!x) return fail(`BigQuery error in show operation: Not found: Table ${proj}:${ds}.${tb}`); if (A.flags['--schema']) return ok(JSON.stringify(String(x.schema === 'autodetect' ? '' : x.schema).split(',').filter(Boolean).map((c) => ({ name: c.split(':')[0], type: (c.split(':')[1] || 'STRING').toUpperCase(), mode: 'NULLABLE' })), null, A.get('--format') === 'prettyjson' ? 2 : 0)); return ok(`Table ${proj}:${ds}.${tb}\n\n   Last modified       Total Rows   Time Partitioning      Clustered Fields\n ----------------- ------------ --------------------- ------------------\n  ${now().slice(0, 16)}   ${String(x.rows).padEnd(12)} ${(x.partition ? 'DAY (field: ' + x.partition + ')' : '').padEnd(21)} ${x.cluster || ''}`); } return ok(`Dataset ${proj}:${ds}\n\n   Last modified    Location\n ----------------- ----------\n  ${now().slice(0, 16)}   ${d.location}`); }
    if (p[0] === 'rm') { const n = (p[1] || '').replace(/^.*:/, ''); if (n.includes('.')) { const [ds, tb] = n.split('.'); if (s.datasets[ds]) delete s.datasets[ds].tables[tb]; } else delete s.datasets[n]; save(); return ok(''); }
    if (p[0] === 'query') {
      let q = p.slice(1).join(' ');
      if (!q) return fail('BigQuery error in query operation: falta la consulta');
      const legacy = A.get('--use_legacy_sql');
      if (!A.flags['--nouse_legacy_sql'] && (legacy === undefined || legacy === 'true')) return fail(`Error in query string: Error processing job: ${col.warn('Legacy SQL')} es el valor por defecto de bq. Agrega --use_legacy_sql=false para usar GoogleSQL (estándar).`);
      // CREATE [OR REPLACE] TABLE ds.tb [PARTITION BY …] [CLUSTER BY …] [OPTIONS(…)] AS SELECT …
      let ddl = null;
      const cm = q.match(/^\s*CREATE\s+(OR\s+REPLACE\s+)?TABLE\s+(IF\s+NOT\s+EXISTS\s+)?`?(?:[\w-]+\.)?(\w+)\.(\w+)`?\s*([\s\S]*?)\bAS\s*(\(?\s*(?:SELECT|WITH)\b[\s\S]*)$/i);
      if (cm) {
        const [, orRep, , ds, tb, mid, body] = cm;
        if (!s.datasets[ds]) return fail(`BigQuery error in query operation: Error processing job: Not found: Dataset ${proj}:${ds}`);
        if (s.datasets[ds].tables[tb] && !orRep && !cm[2]) return fail(`BigQuery error in query operation: Error processing job: Already Exists: Table ${proj}:${ds}.${tb}`);
        const part = (mid.match(/PARTITION\s+BY\s+(?:DATE\s*\(\s*)?(?:DATE_TRUNC\s*\(\s*)?(\w+)/i) || [])[1] || null;
        const clus = (mid.match(/CLUSTER\s+BY\s+([\w\s,]+?)(?:\s+OPTIONS|\s*$)/i) || [])[1] || null;
        ddl = { ds, tb, part, clus: clus && clus.replace(/\s+/g, '') };
        q = body;
      }
      const dest = A.get('--destination_table');
      if (dest && !ddl) { const [ds, tb] = String(dest).replace(/^.*:/, '').split('.'); if (!s.datasets[ds]) return fail(`BigQuery error in query operation: Not found: Dataset ${proj}:${ds}`); if (s.datasets[ds].tables[tb] && !A.flags['--replace'] && !A.flags['--append_table']) return fail(`BigQuery error in query operation: Error processing job: Already Exists: Table ${proj}:${ds}.${tb} (usa --replace)`); ddl = { ds, tb }; }
      // `proyecto.dataset.tabla` -> tabla del curso
      // tablas cargadas con bq load: se materializan desde el CSV; el resto apunta a las tablas del curso
      const local = async (ds, tb) => {
        const t = s.datasets[ds] && s.datasets[ds].tables[tb];
        if (t && t.local && !t.csv) return t.local;
        if (!t || !t.csv) return tb;
        const header = t.cols ? t.skip > 0 : true;
        const text = t.cols && t.skip > 1 ? t.csv.split('\n').slice(t.skip - 1).join('\n') : t.csv;
        return (await materialize(`${ds}__${tb}`, [{ text }], { header, cols: t.cols })) ? `${ds}__${tb}` : tb;
      };
      const refs = [...q.matchAll(/`(?:[\w-]+\.)?([\w-]+)\.(\w+)`|\b(?:[\w-]+\.)?([A-Za-z_]\w*)\.([A-Za-z_]\w*)\b/g)];
      const map = {};
      for (const m of refs) { const ds = m[1] || m[3], tb = m[2] || m[4]; if (s.datasets[ds] || /^(tienda|curso|banco|ventas|analytics|datos)$/.test(ds)) map[m[0]] = await local(ds, tb); }
      q = q.replace(/`(?:[\w-]+\.)?([\w-]+)\.(\w+)`|\b(?:[\w-]+\.)?([A-Za-z_]\w*)\.([A-Za-z_]\w*)\b/g, (m0) => map[m0] || m0);
      if (A.flags['--dry_run']) {
        // estimación: filas × columnas leídas × 8 bytes (BigQuery cobra por columnas leídas, no por filas devueltas)
        const E = window.Engines.SQL; if (!E._bytes) await E.init();
        let bytes = 0;
        for (const tname of new Set(Object.values(map).concat([...q.matchAll(/\b(?:FROM|JOIN)\s+(\w+)/gi)].map((m) => m[1])))) {
          const r = E.exec(`SELECT COUNT(*) FROM ${tname}`, E.playground()); if (!r.ok) continue;
          let n = r.results[0].values[0][0];
          // poda de particiones: si se filtra la columna de partición con = o BETWEEN, solo se leen esas particiones
          const meta = Object.values(s.datasets).flatMap((d) => Object.values(d.tables)).find((t) => t.local === tname);
          if (meta && meta.partition) {
            const pc = meta.partition;
            const eq = q.match(new RegExp('\\b' + pc + "\\s*=\\s*(?:DATE\\s*)?'([^']+)'", 'i'));
            const bt = q.match(new RegExp('\\b' + pc + "\\s+BETWEEN\\s+(?:DATE\\s*)?'([^']+)'\\s+AND\\s+(?:DATE\\s*)?'([^']+)'", 'i'));
            const w = eq ? `"${pc}" = '${eq[1]}'` : bt ? `"${pc}" BETWEEN '${bt[1]}' AND '${bt[2]}'` : null;
            if (w) { const rr = E.exec(`SELECT COUNT(*) FROM ${tname} WHERE ${w}`, E.playground()); if (rr.ok) n = rr.results[0].values[0][0]; }
          }
          const info = E.exec(`PRAGMA table_info(${tname})`, E.playground());
          const cols = info.ok && info.results[0] ? info.results[0].values.map((v) => v[1]) : [];
          const used = /SELECT\s+\*/i.test(q) ? cols.length : cols.filter((c) => new RegExp('\\b' + c + '\\b', 'i').test(q)).length || 1;
          bytes += n * used * 8;
        }
        return ok(`Query successfully validated. Assuming the tables are not modified, running this query will process ${bytes} bytes of data.`);
      }
      if (ddl) {
        const E = window.Engines.SQL; if (!E._bytes) await E.init();
        const name = `${ddl.ds}__${ddl.tb}`;
        const r = E.exec((A.flags['--append_table'] && s.datasets[ddl.ds].tables[ddl.tb] ? `INSERT INTO ${name} ` : `DROP TABLE IF EXISTS ${name}; CREATE TABLE ${name} AS `) + q.replace(/;\s*$/, ''), E.playground());
        if (!r.ok) return fail('BigQuery error in query operation: Error processing job: ' + r.error.split('\n')[0]);
        const n = E.exec(`SELECT COUNT(*) FROM ${name}`, E.playground()).results[0].values[0][0];
        const prev = s.datasets[ddl.ds].tables[ddl.tb] || {};
        s.datasets[ddl.ds].tables[ddl.tb] = { rows: n, schema: prev.schema || 'autodetect', local: name, partition: ddl.part || prev.partition || null, cluster: ddl.clus || prev.cluster || null }; save();
        return ok(`Waiting on bqjob_r${uid(16)}_${uid(16)} ... (1s) Current status: DONE\n${cm ? `Created ${proj}.${ddl.ds}.${ddl.tb}` : `Replaced/created ${proj}:${ddl.ds}.${ddl.tb}`} ${col.dim(`(${n} filas)`)}`);
      }
      const r = await Sh.sqlExec(q);
      return r;
    }
    return fail(`Error: comando bq '${p[0]}' no simulado.`);
  });

  // ================================================================== DATABRICKS
  function dbx() {
    return st('dbx', () => ({
      profiles: {}, clusters: { '0123-456789-abcdef12': { name: 'dev-ana', state: 'TERMINATED', spark: '15.4.x-scala2.12', node: 'Standard_D4ds_v5', workers: 2 }, '0456-111111-zzzz9999': { name: 'compartido-analistas', state: 'RUNNING', spark: '15.4.x-scala2.12', node: 'Standard_D8ds_v5', workers: 4 } },
      jobs: { 123456: { name: 'etl_diario', runs: [] }, 777: { name: 'reporte_semanal', runs: [] } }, files: {}, scopes: {}, workspace: { '/Shared': 'DIRECTORY', '/Users/alumno@academia.dev': 'DIRECTORY' },
      bundle: null, catalogs: { main: { ventas: ['pedidos', 'clientes'], crudo: [] }, dev: { bronze: [], silver: [] }, system: { billing: ['usage'], access: ['audit'] } },
    }));
  }
  const dbxNeed = (s, A, ctx) => {
    const prof = A.get('--profile', '-p') || 'DEFAULT';
    if (s.profiles[prof] || process_env_token()) return null;
    if (ctx.opts && ctx.opts.autoLogin) { s.profiles[prof] = { host: 'https://adb-1234567890123456.7.azuredatabricks.net' }; return null; }
    return fail(`Error: default auth: cannot configure default credentials, please check https://docs.databricks.com/en/dev-tools/auth.html#databricks-client-unified-authentication to configure credentials for your preferred authentication method.\n${col.dim(prof === 'DEFAULT' ? 'Ejecuta: databricks auth login --host https://<tu-workspace>' : `El perfil '${prof}' no existe. Ejecuta: databricks auth login --host https://… --profile ${prof}`)}`);
  };
  function process_env_token() { return Machine.env.DATABRICKS_HOST && (Machine.env.DATABRICKS_TOKEN || Machine.env.DATABRICKS_CLIENT_SECRET); }
  def('databricks', 'Databricks CLI simulada (auth, clusters, jobs, fs, secrets, workspace, bundle, catalogs)', (a, ctx) => {
    const s = dbx(); const A = args(a); const p = A.pos;
    if (A.flags['-v'] || A.flags['--version'] || p[0] === 'version') return ok('Databricks CLI v0.230.0');
    if (!p.length || p[0] === 'help') return ok('Databricks CLI\n\nUsage:\n  databricks [command]\n\nComandos simulados: auth, configure, current-user, clusters, jobs, fs, secrets, workspace, bundle, catalogs, schemas, tables, warehouses, repos');
    if (p[0] === 'auth') {
      if (p[1] === 'login') {
        const host = A.get('--host');
        if (!host || host === true) return fail('Error: no se especificó --host (ej. --host https://adb-1234567890123456.7.azuredatabricks.net)');
        if (!/^https:\/\/[\w.-]+$/.test(String(host).replace(/\/$/, ''))) return fail(`Error: host inválido: ${host}`);
        const prof = A.get('--profile', '-p') || 'DEFAULT';
        s.profiles[prof] = { host: String(host).replace(/\/$/, '') }; save();
        return ok(`${col.dim('Opening https://…/oidc/v1/authorize in the browser (simulado)')}\nProfile ${prof} was successfully saved`);
      }
      if (p[1] === 'profiles') return ok('Name     Host                                                 Valid\n' + Object.entries(s.profiles).map(([n, x]) => `${n.padEnd(8)} ${x.host.padEnd(52)} YES`).join('\n'));
      if (p[1] === 'env') { const prof = A.get('--profile', '-p') || 'DEFAULT'; const x = s.profiles[prof]; if (!x) return fail(`Error: profile ${prof} not found`); return ok(JSON.stringify({ env: { DATABRICKS_HOST: x.host, DATABRICKS_AUTH_TYPE: 'databricks-cli' } }, null, 2)); }
      if (p[1] === 'token') return ok(JSON.stringify({ access_token: 'eyJ' + uid(40), token_type: 'Bearer', expiry: now() }, null, 2));
    }
    if (p[0] === 'configure') { const host = A.get('--host') || 'https://adb-1234567890123456.7.azuredatabricks.net'; s.profiles[A.get('--profile', '-p') || 'DEFAULT'] = { host, token: true }; save(); return ok(`Databricks host: ${host}\nPersonal access token: ${col.dim('************ (simulado)')}`); }
    const e = dbxNeed(s, A, ctx); if (e) return e;
    const out = (d) => output(d, A, 'json');
    const asText = (rows, cols) => (A.get('--output', '-o') === 'json' ? out(rows) : ok(Sh.fmtTable(cols, rows.map((r) => cols.map((c) => r[c])))));
    switch (p[0]) {
      case 'current-user': return out({ userName: 'alumno@academia.dev', displayName: 'Alumno Academia', active: true, groups: [{ display: 'users' }, { display: 'ingenieros-datos' }] });
      case 'clusters': {
        const id = p[2];
        const c = s.clusters[id];
        if (p[1] === 'list') return A.get('--output', '-o') === 'json' ? out(Object.entries(s.clusters).map(([k, x]) => ({ cluster_id: k, cluster_name: x.name, state: x.state, spark_version: x.spark }))) : asText(Object.entries(s.clusters).map(([k, x]) => ({ ID: k, Name: x.name, State: x.state })), ['ID', 'Name', 'State']);
        if (p[1] === 'spark-versions') return out({ versions: [{ key: '15.4.x-scala2.12', name: '15.4 LTS (includes Apache Spark 3.5.0, Scala 2.12)' }, { key: '16.1.x-scala2.12', name: '16.1 (includes Apache Spark 3.5.0, Scala 2.12)' }] });
        if (p[1] === 'create') { const nid = '0' + uid(3) + '-' + uid(6) + '-' + uid(8); s.clusters[nid] = { name: A.get('--cluster-name') || 'nuevo-cluster', state: 'PENDING', spark: '15.4.x-scala2.12', node: 'Standard_D4ds_v5', workers: 1 }; save(); return out({ cluster_id: nid }); }
        if (!id) return fail(`Error: accepts 1 arg(s), received 0 (falta CLUSTER_ID)`);
        if (!c) return fail(`Error: Cluster ${id} does not exist`);
        if (p[1] === 'get') return out({ cluster_id: id, cluster_name: c.name, state: c.state, spark_version: c.spark, node_type_id: c.node, num_workers: c.workers, autotermination_minutes: 30 });
        if (p[1] === 'start') { if (c.state === 'RUNNING') return fail(`Error: Cluster ${id} is in unexpected state Running.`); c.state = 'RUNNING'; save(); return ok(''); }
        if (p[1] === 'delete') { c.state = 'TERMINATED'; save(); return ok(''); }
        if (p[1] === 'restart') { c.state = 'RUNNING'; save(); return ok(''); }
        if (p[1] === 'permanent-delete') { delete s.clusters[id]; save(); return ok(''); }
        break;
      }
      case 'jobs': {
        if (p[1] === 'list') return A.get('--output', '-o') === 'json' ? out(Object.entries(s.jobs).map(([k, j]) => ({ job_id: Number(k), settings: { name: j.name } }))) : asText(Object.entries(s.jobs).map(([k, j]) => ({ ID: k, Name: j.name })), ['ID', 'Name']);
        if (p[1] === 'create') { const nid = Math.floor(100000 + Math.random() * 900000); const js = A.get('--json'); let name = 'nuevo_job'; let cfg = {}; if (js && js !== true) { const raw = String(js).startsWith('@') ? Sh.readFile(Sh.norm(String(js).slice(1))) : js; try { cfg = JSON.parse(raw); name = cfg.name || name; } catch (er) { return fail('Error: el --json no es válido: ' + er.message); }
            const keys = (cfg.tasks || []).map((t) => t.task_key);
            for (const t of cfg.tasks || []) { if (!t.task_key) return fail('Error: cada tarea necesita un task_key'); for (const d of t.depends_on || []) if (!keys.includes(d.task_key)) return fail(`Error: Invalid dependency: task '${t.task_key}' depends on '${d.task_key}', which does not exist in the job.`); }
          } s.jobs[nid] = { name, runs: [], settings: cfg }; save(); return out({ job_id: nid }); }
        const jid = p[2] || A.get('--job-id');
        if (p[1] === 'run-now') {
          const j = s.jobs[jid]; if (!jid) return fail('Error: accepts 1 arg(s), received 0 (falta JOB_ID)'); if (!j) return fail(`Error: Job ${jid} does not exist.`);
          let params = {};
          const js = A.get('--json'); if (js && js !== true) { try { params = JSON.parse(js).job_parameters || {}; } catch (er) { return fail(`Error: invalid character in --json: ${er.message}`); } }
          const defs = Object.fromEntries(((j.settings || {}).parameters || []).map((x) => [x.name, x.default]));
          params = Object.assign(defs, params);
          const run = { run_id: Math.floor(1e8 + Math.random() * 9e8), params, state: 'TERMINATED', result: 'SUCCESS', at: now() }; j.runs.unshift(run); save();
          const tareas = ((j.settings || {}).tasks || []).slice(); const orden = []; const hechas = new Set();
          while (tareas.length) { const i = tareas.findIndex((t) => (t.depends_on || []).every((d) => hechas.has(d.task_key))); if (i < 0) break; const [t] = tareas.splice(i, 1); hechas.add(t.task_key); orden.push(t); }
          const hh = () => new Date().toTimeString().slice(0, 8);
          const detalle = orden.length ? '\n' + orden.map((t) => `${hh()} tarea ${col.b(t.task_key)}${(t.depends_on || []).length ? col.dim(' (después de ' + t.depends_on.map((d) => d.task_key).join(', ') + ')') : ''}: ${col.ok('SUCCESS')}`).join('\n') : '';
          const pr = Object.keys(params).length ? '\n' + col.dim('parámetros: ' + JSON.stringify(params)) : '';
          if (A.flags['--no-wait']) return out({ run_id: run.run_id });
          return ok(`${col.dim(`Run URL: https://adb-1234567890123456.7.azuredatabricks.net/?o=1234567890123456#job/${jid}/run/${run.run_id}`)}\n${new Date().toTimeString().slice(0, 8)} "${j.name}" RUNNING${pr}${detalle}\n${new Date().toTimeString().slice(0, 8)} "${j.name}" TERMINATED ${col.ok('SUCCESS')}\n` + JSON.stringify({ job_id: Number(jid), run_id: run.run_id, state: { life_cycle_state: 'TERMINATED', result_state: 'SUCCESS' }, job_parameters: Object.entries(params).map(([k, v]) => ({ name: k, value: v })) }, null, 2));
        }
        if (p[1] === 'get') { const j = s.jobs[jid]; if (!j) return fail(`Error: Job ${jid} does not exist.`); return out({ job_id: Number(jid), settings: Object.assign({ name: j.name, max_concurrent_runs: 1, tasks: [{ task_key: 'main' }] }, j.settings || {}) }); }
        if (p[1] === 'list-runs') { const j = s.jobs[A.get('--job-id') || jid]; return out((j ? j.runs : Object.values(s.jobs).flatMap((x) => x.runs)).map((r) => ({ run_id: r.run_id, state: { life_cycle_state: r.state, result_state: r.result }, start_time: r.at }))); }
        if (p[1] === 'get-run' || p[1] === 'cancel-run') { const r = Object.values(s.jobs).flatMap((x) => x.runs).find((x) => String(x.run_id) === String(p[2])); if (!r) return fail(`Error: Run ${p[2]} does not exist.`); if (p[1] === 'cancel-run') return ok(''); return out({ run_id: r.run_id, state: { life_cycle_state: r.state, result_state: r.result } }); }
        if (p[1] === 'delete') { delete s.jobs[jid]; save(); return ok(''); }
        break;
      }
      case 'fs': {
        const norm = (x) => String(x || '').replace(/^dbfs:/, '');
        if (p[1] === 'ls') {
          const d = norm(p[2] || '/').replace(/\/$/, '');
          const keys = Object.keys(s.files).filter((k) => k.startsWith(d + '/'));
          if (!keys.length && !/^\/Volumes\/\w+\/\w+\/\w+$/.test(d)) return fail(`Error: no such directory: dbfs:${d}`);
          const names = [...new Set(keys.map((k) => k.slice(d.length + 1).split('/')[0] + (k.slice(d.length + 1).includes('/') ? '/' : '')))];
          return ok(names.join('\n'));
        }
        if (p[1] === 'cp') {
          const [src, dst] = [p[2], p[3]]; if (!src || !dst) return fail('Error: accepts 2 arg(s)');
          if (src.startsWith('dbfs:') && !dst.startsWith('dbfs:')) { const c = s.files[norm(src)]; if (c === undefined) return fail(`Error: no such file: ${src}`); Sh.writeFile(Sh.norm(dst), c); save(); return ok(`${src} -> ${dst}`); }
          if (!dst.startsWith('dbfs:')) return fail('Error: uno de los caminos debe empezar con dbfs:/');
          const lp = Sh.norm(src);
          if (Sh.isDir(lp)) { if (!A.flags['-r'] && !A.flags['--recursive']) return fail(`Error: source path ${src} is a directory. Please specify the --recursive flag`); const fs = Object.keys(Machine.fs).filter((k) => Machine.fs[k].t === 'f' && k.startsWith(lp + '/')); fs.forEach((k) => { s.files[norm(dst).replace(/\/$/, '') + '/' + k.slice(lp.length + 1)] = Machine.fs[k].c; }); save(); return ok(fs.map((k) => `${Sh.display(k)} -> ${dst.replace(/\/$/, '')}/${k.slice(lp.length + 1)}`).join('\n')); }
          const c = Sh.readFile(lp); if (c === null) return fail(`Error: no such file or directory: ${src}`);
          const target = norm(dst).endsWith('/') ? norm(dst) + src.split('/').pop() : norm(dst);
          if (s.files[target] !== undefined && !A.flags['--overwrite']) return fail(`Error: dbfs:${target} already exists. Use --overwrite to overwrite the file`);
          if (target.startsWith('/Volumes/') && !/^\/Volumes\/\w+\/\w+\/\w+\//.test(target)) return fail('Error: la ruta de un volumen debe ser /Volumes/<catalogo>/<esquema>/<volumen>/…');
          s.files[target] = c; save(); return ok(`${src} -> dbfs:${target}`);
        }
        if (p[1] === 'cat') { const c = s.files[norm(p[2])]; if (c === undefined) return fail(`Error: no such file: ${p[2]}`); return ok(c.replace(/\n$/, '')); }
        if (p[1] === 'rm') { const d = norm(p[2]); for (const k of Object.keys(s.files)) if (k === d || (A.flags['-r'] && k.startsWith(d + '/'))) delete s.files[k]; save(); return ok(''); }
        if (p[1] === 'mkdir' || p[1] === 'mkdirs') return ok('');
        break;
      }
      case 'secrets': {
        if (p[1] === 'create-scope') { if (!p[2]) return fail('Error: accepts 1 arg(s), received 0'); if (s.scopes[p[2]]) return fail(`Error: Scope ${p[2]} already exists!`); s.scopes[p[2]] = { secrets: {}, acls: {} }; save(); return ok(''); }
        if (p[1] === 'list-scopes') return asText(Object.keys(s.scopes).map((k) => ({ Scope: k, 'Backend Type': 'DATABRICKS' })), ['Scope', 'Backend Type']);
        const sc = s.scopes[p[2]];
        if (!sc) return fail(`Error: Scope ${p[2]} does not exist!`);
        if (p[1] === 'put-secret') { if (!p[3]) return fail('Error: accepts 2 arg(s)'); sc.secrets[p[3]] = A.get('--string-value') || '***'; save(); return ok(A.get('--string-value') ? '' : col.dim('Please enter your secret value: ******** (simulado)')); }
        if (p[1] === 'list-secrets') return asText(Object.keys(sc.secrets).map((k) => ({ Key: k, 'Last Updated Timestamp': Date.now() })), ['Key', 'Last Updated Timestamp']);
        if (p[1] === 'get-secret') return out({ key: p[3], value: btoa(unescape(encodeURIComponent(sc.secrets[p[3]] || ''))) });
        if (p[1] === 'put-acl') { sc.acls[p[3]] = p[4]; save(); return ok(''); }
        if (p[1] === 'delete-secret') { delete sc.secrets[p[3]]; save(); return ok(''); }
        break;
      }
      case 'workspace': {
        if (p[1] === 'list') { const d = (p[2] || '/').replace(/\/$/, ''); return asText(Object.entries(s.workspace).filter(([k]) => k.startsWith(d + '/') && !k.slice(d.length + 1).includes('/')).map(([k, t]) => ({ ID: Math.abs(hash(k)), Type: t, Language: t === 'NOTEBOOK' ? 'PYTHON' : '', Path: k })), ['ID', 'Type', 'Language', 'Path']); }
        if (p[1] === 'mkdirs') { s.workspace[p[2].replace(/\/$/, '')] = 'DIRECTORY'; save(); return ok(''); }
        if (p[1] === 'import') { const f = A.get('--file'); const target = p[2]; if (!target) return fail('Error: accepts 1 arg(s), received 0 (TARGET_PATH)'); if (f && !Sh.exists(Sh.norm(f))) return fail(`Error: open ${f}: no such file or directory`); if (s.workspace[target] && !A.flags['--overwrite']) return fail(`Error: ${target} already exists (usa --overwrite)`); s.workspace[target] = 'NOTEBOOK'; save(); return ok(''); }
        if (p[1] === 'import-dir') { const lp = Sh.norm(p[2]); const fs = Object.keys(Machine.fs).filter((k) => Machine.fs[k].t === 'f' && k.startsWith(lp + '/')); fs.forEach((k) => { s.workspace[p[3].replace(/\/$/, '') + '/' + k.slice(lp.length + 1).replace(/\.(py|sql|ipynb)$/, '')] = 'NOTEBOOK'; }); save(); return ok(fs.map((k) => `${Sh.display(k)} -> ${p[3]}/${k.slice(lp.length + 1)}`).join('\n')); }
        if (p[1] === 'export') { if (!s.workspace[p[2]]) return fail(`Error: Path (${p[2]}) doesn't exist.`); const f = A.get('--file'); const c = '# Databricks notebook source\nprint("exportado")\n'; if (f) { Sh.writeFile(Sh.norm(f), c); save(); return ok(''); } return ok(c); }
        if (p[1] === 'delete') { delete s.workspace[p[2]]; save(); return ok(''); }
        break;
      }
      case 'bundle': {
        const root = Sh.norm('.');
        const has = Sh.exists(root + '/databricks.yml');
        if (p[1] === 'init') {
          const tpl = p[2] || 'default-python';
          const name = 'mi_proyecto';
          const r = root + '/' + name;
          Sh.writeFile(r + '/databricks.yml', `bundle:\n  name: ${name}\n\ninclude:\n  - resources/*.yml\n\ntargets:\n  dev:\n    mode: development\n    default: true\n    workspace:\n      host: https://adb-1234567890123456.7.azuredatabricks.net\n  prod:\n    mode: production\n    workspace:\n      host: https://adb-1234567890123456.7.azuredatabricks.net\n`);
          Sh.writeFile(r + '/resources/' + name + '.job.yml', `resources:\n  jobs:\n    ${name}_job:\n      name: ${name}_job\n      tasks:\n        - task_key: notebook_task\n          notebook_task:\n            notebook_path: ../src/notebook.ipynb\n`);
          Sh.writeFile(r + '/src/notebook.ipynb', '{"cells": [], "metadata": {}}\n');
          Sh.writeFile(r + '/README.md', `# ${name}\n\nBundle creado con la plantilla ${tpl}.\n`);
          save();
          return ok(`Template to use: ${tpl}\nUnique name for this project [my_project]: ${name}\n\n✨ Your new project has been created in the '${name}' directory!\n\nPlease refer to the README.md file for "getting started" instructions.\nSiguiente paso: ${col.b(`cd ${name} && databricks bundle validate`)}`);
        }
        if (!has) return fail('Error: unable to locate bundle root: databricks.yml not found (entra a la carpeta del bundle, o créalo con databricks bundle init)');
        const yml = Sh.readFile(root + '/databricks.yml');
        const name = (yml.match(/name:\s*(\S+)/) || [])[1] || 'bundle';
        const targets = [...yml.matchAll(/^ {2}(\w+):\s*$/gm)].map((m) => m[1]).filter((t) => !['name', 'workspace'].includes(t));
        const t = A.get('--target', '-t') || (yml.match(/^ {2}(\w+):\s*\n(?: {4}.*\n)*? {4}default: true/m) || [])[1] || 'dev';
        if (A.get('--target', '-t') && !targets.includes(t)) return fail(`Error: ${t}: no such target. Available targets: ${targets.join(', ')}`);
        const jobsIn = [];
        for (const k of Object.keys(Machine.fs)) if (k.startsWith(root + '/resources/') && /\.ya?ml$/.test(k)) for (const m of Sh.readFile(k).matchAll(/jobs:\s*\n\s+(\w+):/g)) jobsIn.push(m[1]);
        if (p[1] === 'validate') return ok(`Name: ${name}\nTarget: ${t}\nWorkspace:\n  Host: https://adb-1234567890123456.7.azuredatabricks.net\n  User: alumno@academia.dev\n  Path: /Workspace/Users/alumno@academia.dev/.bundle/${name}/${t}\n\n${col.ok('Validation OK!')}`);
        if (p[1] === 'deploy') { s.bundle = s.bundle || {}; s.bundle[name + ':' + t] = jobsIn; for (const j of jobsIn) s.jobs[Math.abs(hash(name + t + j)) % 900000 + 100000] = { name: (t === 'dev' ? '[dev alumno] ' : '') + j, runs: [], bundleKey: j, target: t }; save(); return ok(`Uploading bundle files to /Workspace/Users/alumno@academia.dev/.bundle/${name}/${t}/files...\nDeploying resources...\nUpdating deployment state...\n${col.ok('Deployment complete!')}`); }
        if (p[1] === 'run') { const key = p.slice(2).find((x) => !x.startsWith('-')); if (!key) return fail('Error: falta el nombre del recurso (ej. databricks bundle run -t dev mi_job)'); const deployed = (s.bundle || {})[name + ':' + t] || []; if (!deployed.includes(key)) return fail(`Error: resource with key "${key}" not found. ¿Hiciste databricks bundle deploy -t ${t}?`); return ok(`Run URL: https://adb-1234567890123456.7.azuredatabricks.net/#job/${Math.abs(hash(name + t + key)) % 900000 + 100000}/run/${Math.floor(Math.random() * 1e9)}\n\n${new Date().toTimeString().slice(0, 8)} "${t === 'dev' ? '[dev alumno] ' : ''}${key}" RUNNING\n${new Date().toTimeString().slice(0, 8)} "${t === 'dev' ? '[dev alumno] ' : ''}${key}" TERMINATED ${col.ok('SUCCESS')}`); }
        if (p[1] === 'summary') return ok(`Name: ${name}\nTarget: ${t}\nResources:\n  Jobs:\n` + ((s.bundle || {})[name + ':' + t] || []).map((j) => `    ${j}:\n      Name: ${t === 'dev' ? '[dev alumno] ' : ''}${j}\n      URL:  https://adb-1234567890123456.7.azuredatabricks.net/#job/${Math.abs(hash(name + t + j)) % 900000 + 100000}`).join('\n'));
        if (p[1] === 'destroy') { if (s.bundle) delete s.bundle[name + ':' + t]; for (const [k, j] of Object.entries(s.jobs)) if (j.target === t && jobsIn.includes(j.bundleKey)) delete s.jobs[k]; save(); return ok(`The following resources will be deleted:\n${jobsIn.map((j) => '  delete job ' + j).join('\n')}\n\n${col.ok('Destroy complete!')}`); }
        break;
      }
      case 'catalogs': if (p[1] === 'list') return asText(Object.keys(s.catalogs).map((c) => ({ Name: c, Type: c === 'system' ? 'SYSTEM_CATALOG' : 'MANAGED_CATALOG' })), ['Name', 'Type']); break;
      case 'schemas': if (p[1] === 'list') { const c = s.catalogs[p[2]]; if (!c) return fail(`Error: Catalog '${p[2]}' does not exist.`); return asText(Object.keys(c).map((x) => ({ Name: x, 'Full Name': `${p[2]}.${x}` })), ['Name', 'Full Name']); } break;
      case 'tables': if (p[1] === 'list') { const c = s.catalogs[p[2]] || {}; const t = c[p[3]]; if (!t) return fail(`Error: Schema '${p[2]}.${p[3]}' does not exist.`); return asText(t.map((x) => ({ Name: x, 'Full Name': `${p[2]}.${p[3]}.${x}`, Type: 'MANAGED' })), ['Name', 'Full Name', 'Type']); } break;
      case 'warehouses': if (p[1] === 'list') return asText([{ ID: '1a2b3c4d5e6f7a8b', Name: 'Serverless Starter Warehouse', Size: 'Small', State: 'RUNNING' }], ['ID', 'Name', 'Size', 'State']); break;
      case 'repos': if (p[1] === 'create') return out({ id: Math.floor(Math.random() * 1e15), url: p[2], provider: p[3] || 'gitHub', path: `/Repos/alumno@academia.dev/${String(p[2] || '').split('/').pop().replace(/\.git$/, '')}`, branch: 'main' }); if (p[1] === 'list') return ok('ID  Path'); break;
      default: break;
    }
    return fail(`Error: unknown command "${p.slice(0, 2).join(' ')}" for "databricks" (o no está simulado en esta terminal)\nRun 'databricks --help' for usage.`);
  });
  function hash(s) { let h = 0; for (const ch of String(s)) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0; return h; }

  window.CloudSim = { jmes, asTable, aws, gcp, az, dbx };
})();
