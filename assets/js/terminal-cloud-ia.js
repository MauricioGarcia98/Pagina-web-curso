/*
 * Más servicios para las nubes simuladas, pensados para los laboratorios guiados:
 *  - AWS: Bedrock (modelos, Converse, Guardrails, Knowledge Bases con RAG real sobre los archivos de S3,
 *    inferencia por lotes), SageMaker (entrenamiento con Spot, endpoints), DynamoDB, Secrets Manager,
 *    KMS, SQS, SNS, Glue Data Quality (evalúa reglas DQDL sobre los CSV del lago), S3 Tables,
 *    workgroups de Athena y alarmas de CloudWatch.
 *  - Google Cloud: suscripciones de Pub/Sub a BigQuery (los mensajes llegan a la tabla), BigQuery ML
 *    (CREATE MODEL, ML.EVALUATE, ML.PREDICT, ML.FORECAST), AI.GENERATE, gcloud ai, scheduler, workflows,
 *    datastream y kms.
 *  - Azure: Microsoft Foundry (az cognitiveservices) y Azure Machine Learning (az ml).
 *  - Databricks: pipelines declarativos, grants de Unity Catalog y serving endpoints.
 * Cada comando extiende al original: lo que no se maneja aquí sigue en terminal-cloud.js.
 * Los modelos de lenguaje están simulados: las respuestas salen de reglas y de los documentos cargados,
 * para practicar la mecánica (parámetros, tokens, guardrails, citas), no la calidad de un modelo real.
 */
(function () {
  'use strict';
  const Sh = window.Shell, CS = window.CloudSim;
  if (!Sh || !CS) return;
  const { def, col, ok, Commands, Machine } = Sh;
  const { args, output, fail, uid, now, save, s3path, gsPath, parseCsvLine } = CS;

  // ---------------------------------------------------------------- utilidades
  const quitarTildes = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const VACIAS = new Set('de la el los las un una unos unas y o a en por para con sin del al que se es son su sus lo como mas pero si no le les me mi tu te ya hay cual cuales cuando donde quien esta este estos estas eso esa ese the of and to in is for on what how'.split(' '));
  const palabras = (s) => (quitarTildes(s).match(/[a-z0-9#._-]+/g) || []).filter((w) => w.length > 2 && !VACIAS.has(w));
  const tokens = (s) => Math.max(1, Math.ceil(String(s || '').length / 4));
  const json = (v, nombre) => {
    if (v === undefined || v === true) return null;
    try { return JSON.parse(String(v)); } catch (e) { throw new Error(`Error parsing parameter '${nombre}': Invalid JSON: ${String(v).slice(0, 60)}…`); }
  };
  // sintaxis abreviada de la CLI de AWS: "A=1,B=2" -> {A:'1',B:'2'}; con espacios, una lista de objetos
  const corto = (v) => { const o = {}; for (const kv of String(v || '').split(',')) { const i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i).trim()] = kv.slice(i + 1).trim(); } return o; };
  const cortoLista = (v) => String(v || '').split(/\s+/).filter(Boolean).map(corto);
  const hashNum = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const pseudo = (s, min, max, dec = 3) => Number((min + (hashNum(s) % 10000) / 10000 * (max - min)).toFixed(dec));
  // ids estables (derivados del nombre) para que los laboratorios puedan nombrarlos en las instrucciones
  const idDe = (s) => (hashNum(s).toString(36).toUpperCase() + 'KBXQ7Z2M4N').slice(0, 10);
  const sql = async () => { const E = window.Engines.SQL; if (!E._bytes) await E.init(); return E; };
  const extender = (nombre, ayuda, fn) => {
    const previo = Commands[nombre];
    def(nombre, ayuda, async (a, ctx) => { const r = await fn(a, ctx, previo); return r === undefined ? previo(a, ctx) : r; });
  };
  const nota = (t) => '\n' + col.dim(t);

  // ================================================================== AWS
  const MODELOS = [
    { id: 'amazon.nova-micro-v1:0', prov: 'Amazon', nombre: 'Nova Micro', in: ['TEXT'], out: ['TEXT'], perfil: true },
    { id: 'amazon.nova-lite-v1:0', prov: 'Amazon', nombre: 'Nova Lite', in: ['TEXT', 'IMAGE', 'VIDEO'], out: ['TEXT'], perfil: true },
    { id: 'amazon.nova-pro-v1:0', prov: 'Amazon', nombre: 'Nova Pro', in: ['TEXT', 'IMAGE', 'VIDEO'], out: ['TEXT'], perfil: true },
    { id: 'amazon.titan-embed-text-v2:0', prov: 'Amazon', nombre: 'Titan Text Embeddings V2', in: ['TEXT'], out: ['EMBEDDING'] },
    { id: 'anthropic.claude-sonnet', prov: 'Anthropic', nombre: 'Claude Sonnet', in: ['TEXT', 'IMAGE'], out: ['TEXT'], perfil: true },
    { id: 'anthropic.claude-haiku', prov: 'Anthropic', nombre: 'Claude Haiku', in: ['TEXT', 'IMAGE'], out: ['TEXT'], perfil: true },
    { id: 'meta.llama3-3-70b-instruct-v1:0', prov: 'Meta', nombre: 'Llama 3.3 70B Instruct', in: ['TEXT'], out: ['TEXT'], perfil: true },
    { id: 'mistral.mistral-large-2407-v1:0', prov: 'Mistral AI', nombre: 'Mistral Large', in: ['TEXT'], out: ['TEXT'] },
    { id: 'cohere.embed-multilingual-v3', prov: 'Cohere', nombre: 'Embed Multilingual', in: ['TEXT'], out: ['EMBEDDING'] },
    { id: 'cohere.rerank-v3-5:0', prov: 'Cohere', nombre: 'Rerank 3.5', in: ['TEXT'], out: ['TEXT'] },
  ];
  const modelo = (id) => {
    const limpio = String(id || '').replace(/^arn:aws:bedrock:[^:]*:[^:]*:(foundation-model|inference-profile)\//, '').replace(/^(us|eu|apac|global)\./, '');
    return MODELOS.find((m) => m.id === limpio);
  };

  function ia(s) {
    s.bedrock = s.bedrock || { guardrails: {}, kbs: {}, lotes: {} };
    s.sm = s.sm || { training: {}, models: {}, configs: {}, endpoints: {} };
    s.ddb = s.ddb || {};
    s.secrets = s.secrets || {};
    s.kms = s.kms || { keys: {}, aliases: {} };
    s.sqs = s.sqs || {};
    s.sns = s.sns || {};
    s.dq = s.dq || { rulesets: {}, results: {} };
    s.s3t = s.s3t || {};
    s.alarms = s.alarms || {};
    s.workgroups = s.workgroups || { primary: { cutoff: null } };
    return s;
  }

  // ---- guardrails: temas denegados, PII y ataques de prompt
  const PII = {
    EMAIL: /[\w.+-]+@[\w-]+\.[\w.]+/g,
    PHONE: /\+?\d[\d\s-]{8,}\d/g,
    CREDIT_DEBIT_CARD_NUMBER: /\b(?:\d[ -]?){13,16}\b/g,
    DNI: /\b\d{2}\.?\d{3}\.?\d{3}\b/g,
  };
  const ATAQUES = /(ignora|olvida|omite)\s+(tus|las|todas las)?\s*(instrucciones|reglas)|ignore (all |your )?(previous )?instructions|prompt de sistema|system prompt|jailbreak|modo desarrollador|act[uú]a como si no tuvieras/i;
  function aplicarGuardrail(g, texto, fuente = 'INPUT') {
    const evals = [];
    let salida = texto, bloqueado = false;
    for (const t of (g.topics || [])) {
      const claves = palabras([t.name, t.definition, ...(t.examples || [])].join(' ')).filter((w) => w.length > 4);
      const enTexto = new Set(palabras(texto));
      const coinciden = claves.filter((w) => enTexto.has(w));
      if (t.type !== 'ALLOW' && coinciden.length) { bloqueado = true; evals.push({ topicPolicy: { topics: [{ name: t.name, type: 'DENY', action: 'BLOCKED' }] } }); }
    }
    for (const f of (g.filters || [])) {
      const fuerza = fuente === 'INPUT' ? f.inputStrength : f.outputStrength;
      if (f.type === 'PROMPT_ATTACK' && fuerza && fuerza !== 'NONE' && ATAQUES.test(texto)) { bloqueado = true; evals.push({ contentPolicy: { filters: [{ type: 'PROMPT_ATTACK', confidence: 'HIGH', action: 'BLOCKED' }] } }); }
    }
    const piiHallados = [];
    for (const p of (g.pii || [])) {
      const re = PII[p.type]; if (!re) continue;
      const m = salida.match(re);
      if (m) {
        piiHallados.push({ type: p.type, match: m[0], action: p.action === 'BLOCK' ? 'BLOCKED' : 'ANONYMIZED' });
        if (p.action === 'BLOCK') bloqueado = true; else salida = salida.replace(re, `{${p.type}}`);
      }
    }
    if (piiHallados.length) evals.push({ sensitiveInformationPolicy: { piiEntities: piiHallados } });
    const intervino = bloqueado || piiHallados.length > 0;
    return { action: intervino ? 'GUARDRAIL_INTERVENED' : 'NONE', texto: bloqueado ? (fuente === 'INPUT' ? g.blockedInput : g.blockedOutput) : salida, evals, bloqueado };
  }

  // ---- respuesta "del modelo": reglas simples, sin datos propios
  function generar(pregunta, sistema) {
    const q = quitarTildes(pregunta);
    let r;
    if (/resum/.test(q)) { const t = pregunta.split(/[:\n]/).slice(1).join(' ').trim() || pregunta; r = 'Resumen: ' + t.split(/(?<=[.!?])\s+/).slice(0, 2).join(' '); }
    else if (/traduc/.test(q)) r = 'Traducción (simulada): ' + pregunta.replace(/^.*?:/, '').trim();
    else if (/clasific|categor/.test(q)) r = /reclamo|queja|demora|roto|mal/.test(q) ? 'Categoría: RECLAMO' : /factura|pago|cobro/.test(q) ? 'Categoría: FACTURACIÓN' : 'Categoría: CONSULTA';
    else if (/json/.test(q)) r = JSON.stringify({ intencion: /cancel/.test(q) ? 'cancelar' : 'consultar', confianza: 0.82 });
    else r = `No tengo acceso a los datos de tu empresa: respondo con conocimiento general. Para responder sobre "${pregunta.slice(0, 60)}" con información propia y citas, conviene usar RAG (por ejemplo, una Knowledge Base).`;
    if (sistema && /espa[nñ]ol formal|usted/i.test(sistema)) r = r.replace(/^/, 'Estimado usuario: ');
    return r;
  }
  function recortar(texto, maxTokens) {
    if (!maxTokens || tokens(texto) <= maxTokens) return { texto, stop: 'end_turn' };
    return { texto: texto.slice(0, Math.max(1, maxTokens * 4)).replace(/\s+\S*$/, '') + '…', stop: 'max_tokens' };
  }

  // ---- RAG: fragmentos de los documentos de S3 y búsqueda por palabras (semántica simulada)
  function trocear(texto, maxTok = 300, solapa = 20) {
    const ps = String(texto).split(/\s+/).filter(Boolean);
    const tam = Math.max(20, Math.round(maxTok * 0.75)), paso = Math.max(5, Math.round(tam * (1 - solapa / 100)));
    const out = [];
    for (let i = 0; i < ps.length; i += paso) { out.push(ps.slice(i, i + tam).join(' ')); if (i + tam >= ps.length) break; }
    return out;
  }
  function buscar(kb, consulta, cfg = {}) {
    const vs = cfg.vectorSearchConfiguration || {};
    const n = Number(vs.numberOfResults || 5), hibrida = vs.overrideSearchType === 'HYBRID';
    const qw = palabras(consulta);
    const exactos = (consulta.match(/\b[A-Z]{2,}[-\w]*\d[-\w]*\b/g) || []).map((x) => x.toLowerCase());
    const cumpleFiltro = (meta, f) => {
      if (!f) return true;
      if (f.equals) return String(meta[f.equals.key]) === String(f.equals.value);
      if (f.notEquals) return String(meta[f.notEquals.key]) !== String(f.notEquals.value);
      if (f.in) return (f.in.value || []).map(String).includes(String(meta[f.in.key]));
      if (f.andAll) return f.andAll.every((x) => cumpleFiltro(meta, x));
      if (f.orAll) return f.orAll.some((x) => cumpleFiltro(meta, x));
      return true;
    };
    return kb.chunks.filter((c) => cumpleFiltro(c.meta, vs.filter)).map((c) => {
      const cw = palabras(c.text), set = new Set(cw);
      let sc = qw.reduce((a, w) => a + (set.has(w) ? 1 : cw.some((x) => x.startsWith(w.slice(0, 5)) && w.length > 5) ? 0.5 : 0), 0) / Math.max(1, qw.length);
      // la búsqueda semántica sola "entiende" el tema pero no los códigos exactos; la híbrida suma coincidencias literales
      if (exactos.length) { const lit = exactos.filter((x) => quitarTildes(c.text).includes(x)).length; sc = hibrida ? sc + lit : sc * (lit ? 0.6 : 1); }
      return { c, sc: Number(Math.min(0.99, sc).toFixed(4)) };
    }).filter((x) => x.sc > 0.05).sort((a, b) => b.sc - a.sc).slice(0, n);
  }

  // ---- Glue Data Quality: evalúa reglas DQDL sobre las filas de una tabla del catálogo
  function filasTabla(s, db, tb) {
    const t = s.glueDbs[db] && s.glueDbs[db].tables[tb];
    if (!t || !t.location) return null;
    const L = s3path(t.location), b = s.buckets[L.b];
    if (!b) return null;
    let cols = null; const filas = [];
    for (const k of Object.keys(b.objects).filter((x) => x.startsWith(L.k) && /\.csv$/i.test(x))) {
      const ls = b.objects[k].c.replace(/\r/g, '').split('\n').filter((x) => x.trim());
      const h = parseCsvLine(ls.shift()).map((x) => x.trim());
      cols = cols || h;
      for (const l of ls) { const v = parseCsvLine(l); filas.push(Object.fromEntries(h.map((c, i) => [c, v[i] === undefined || v[i] === '' ? null : v[i]]))); }
    }
    return { cols: cols || [], filas };
  }
  function evaluarDQ(reglas, datos) {
    const res = [];
    for (const r of reglas) {
      let m, pasa = null, msg = '';
      const vals = (c) => datos.filas.map((f) => f[c]);
      const existe = (c) => datos.cols.includes(c);
      if ((m = r.match(/^RowCount\s*(>=|>|<=|<|=)\s*(\d+)$/i))) { const n = datos.filas.length; pasa = eval(`${n} ${m[1] === '=' ? '===' : m[1]} ${m[2]}`); msg = `RowCount = ${n}`; } // eslint-disable-line no-eval
      else if ((m = r.match(/^IsComplete\s+"(\w+)"$/i))) { if (!existe(m[1])) { pasa = false; msg = `La columna ${m[1]} no existe`; } else { const nul = vals(m[1]).filter((v) => v === null).length; pasa = nul === 0; msg = `${nul} valores nulos`; } }
      else if ((m = r.match(/^IsUnique\s+"(\w+)"$/i))) { if (!existe(m[1])) { pasa = false; msg = `La columna ${m[1]} no existe`; } else { const v = vals(m[1]); const dup = v.length - new Set(v).size; pasa = dup === 0; msg = `${dup} valores repetidos`; } }
      else if ((m = r.match(/^Completeness\s+"(\w+)"\s*(>=|>)\s*([\d.]+)$/i))) { const v = vals(m[1]); const c = v.length ? v.filter((x) => x !== null).length / v.length : 0; pasa = m[2] === '>' ? c > Number(m[3]) : c >= Number(m[3]); msg = `Completeness = ${c.toFixed(3)}`; }
      else if ((m = r.match(/^ColumnValues\s+"(\w+)"\s+in\s+\[(.*)\]$/i))) { const ok_ = m[2].split(',').map((x) => x.trim().replace(/^"|"$/g, '')); const malos = vals(m[1]).filter((v) => v !== null && !ok_.includes(v)); pasa = malos.length === 0; msg = malos.length ? `${malos.length} valores fuera del conjunto (ej. "${malos[0]}")` : 'Todos los valores en el conjunto'; }
      else if ((m = r.match(/^ColumnValues\s+"(\w+)"\s+between\s+(-?[\d.]+)\s+and\s+(-?[\d.]+)$/i))) { const malos = vals(m[1]).filter((v) => v !== null && !(Number(v) >= Number(m[2]) && Number(v) <= Number(m[3]))); pasa = malos.length === 0; msg = `${malos.length} valores fuera del rango`; }
      else if ((m = r.match(/^ColumnValues\s+"(\w+)"\s*(>=|>|<=|<)\s*(-?[\d.]+)$/i))) { const op = m[2]; const malos = vals(m[1]).filter((v) => v !== null && !eval(`${Number(v)} ${op} ${Number(m[3])}`)); pasa = malos.length === 0; msg = `${malos.length} valores no cumplen ${op} ${m[3]}`; } // eslint-disable-line no-eval
      else { pasa = null; msg = 'Regla no soportada por el simulador (en AWS real sí existe)'; }
      res.push({ Name: r, Description: r, Result: pasa === null ? 'ERROR' : pasa ? 'PASS' : 'FAIL', EvaluationMessage: msg });
    }
    return res;
  }

  extender('aws', 'AWS CLI simulada (s3, glue, athena, kinesis, bedrock, sagemaker, dynamodb, kms, secretsmanager…)', async (a, ctx, previo) => {
    const s = ia(CS.aws());
    const A = args(a, ['--enable-managed-spot-training', '--no-scan-index-forward', '--force-delete-without-recovery', '--enable-key-rotation']);
    const p = A.pos;
    if (!p.length || p[0] === 'help') {
      const r = await previo(a, ctx);
      return ok(r.out.replace(/Servicios simulados: ([^\n]*)/, (m0, l) => `Servicios simulados: ${l}, bedrock, bedrock-runtime, bedrock-agent, bedrock-agent-runtime, sagemaker, sagemaker-runtime, dynamodb, secretsmanager, kms, sqs, sns, s3tables, cloudwatch`));
    }
    const nuevos = ['bedrock', 'bedrock-runtime', 'bedrock-agent', 'bedrock-agent-runtime', 'sagemaker', 'sagemaker-runtime', 'dynamodb', 'secretsmanager', 'kms', 'sqs', 'sns', 's3tables', 'cloudwatch'];
    const glueDQ = p[0] === 'glue' && /data-quality/.test(p[1] || '');
    const athenaWg = p[0] === 'athena' && ['create-work-group', 'list-work-groups', 'get-work-group'].includes(p[1]);
    if (!nuevos.includes(p[0]) && !glueDQ && !athenaWg) return undefined;
    if (!s.configured && !(ctx.opts && ctx.opts.autoLogin)) return fail('Unable to locate credentials. You can configure credentials by running "aws configure".', 253);
    s.configured = true;
    const out = (d) => output(d, A, s.output, 'aws');
    const req = (...ns) => { const f = ns.filter((n) => !A.get(n) || A.get(n) === true); return f.length ? fail(`aws: error: the following arguments are required: ${f.join(', ')}`, 252) : null; };
    const arn = (svc, res) => `arn:aws:${svc}:${s.region}:${s.account}:${res}`;
    const err = (code, op, msg) => fail(`An error occurred (${code}) when calling the ${op} operation: ${msg}`, 254);
    try {
      // ---------------------------------------------------------- Bedrock
      if (p[0] === 'bedrock') {
        const B = s.bedrock;
        if (p[1] === 'list-foundation-models') {
          const prov = A.get('--by-provider'), salida = A.get('--by-output-modality');
          return out({ modelSummaries: MODELOS.filter((m) => (!prov || m.prov.toLowerCase().includes(String(prov).toLowerCase())) && (!salida || m.out.includes(String(salida).toUpperCase()))).map((m) => ({ modelArn: `arn:aws:bedrock:${s.region}::foundation-model/${m.id}`, modelId: m.id, modelName: m.nombre, providerName: m.prov, inputModalities: m.in, outputModalities: m.out, inferenceTypesSupported: m.perfil ? ['INFERENCE_PROFILE'] : ['ON_DEMAND'] })) });
        }
        if (p[1] === 'get-foundation-model') { const m = modelo(A.get('--model-identifier')); if (!m) return err('ValidationException', 'GetFoundationModel', 'The provided model identifier is invalid.'); return out({ modelDetails: { modelId: m.id, modelName: m.nombre, providerName: m.prov, inputModalities: m.in, outputModalities: m.out, modelLifecycle: { status: 'ACTIVE' } } }); }
        if (p[1] === 'list-inference-profiles') {
          const geo = s.region.startsWith('eu') ? 'eu' : s.region.startsWith('ap') ? 'apac' : 'us';
          return out({ inferenceProfileSummaries: MODELOS.filter((m) => m.perfil).map((m) => ({ inferenceProfileId: `${geo}.${m.id}`, inferenceProfileName: `${geo.toUpperCase()} ${m.nombre}`, type: 'SYSTEM_DEFINED', status: 'ACTIVE', description: `Distribuye las solicitudes entre regiones de la geografía ${geo.toUpperCase()}` })) });
        }
        if (p[1] === 'create-guardrail') {
          const e = req('--name', '--blocked-input-messaging', '--blocked-outputs-messaging'); if (e) return e;
          const topics = (json(A.get('--topic-policy-config'), 'topic-policy-config') || {}).topicsConfig || [];
          const pii = (json(A.get('--sensitive-information-policy-config'), 'sensitive-information-policy-config') || {}).piiEntitiesConfig || [];
          const filters = (json(A.get('--content-policy-config'), 'content-policy-config') || {}).filtersConfig || [];
          if (!topics.length && !pii.length && !filters.length) return err('ValidationException', 'CreateGuardrail', 'At least one policy (topic, content, word, sensitive information or contextual grounding) must be configured.');
          const id = (idDe('GR' + A.get('--name')) + idDe('G2' + A.get('--name'))).toLowerCase().slice(0, 12);
          if (B.guardrails[id]) return err('ConflictException', 'CreateGuardrail', `A guardrail with name ${A.get('--name')} already exists.`);
          B.guardrails[id] = { name: A.get('--name'), topics, pii, filters, blockedInput: A.get('--blocked-input-messaging'), blockedOutput: A.get('--blocked-outputs-messaging'), versions: ['DRAFT'] };
          save(); return out({ guardrailId: id, guardrailArn: arn('bedrock', 'guardrail/' + id), version: 'DRAFT', createdAt: now() });
        }
        if (p[1] === 'create-guardrail-version') { const g = B.guardrails[A.get('--guardrail-identifier')]; if (!g) return err('ResourceNotFoundException', 'CreateGuardrailVersion', 'Guardrail not found.'); const v = String(g.versions.length); g.versions.push(v); save(); return out({ guardrailId: A.get('--guardrail-identifier'), version: v }); }
        if (p[1] === 'delete-guardrail') { const id = A.get('--guardrail-identifier'); if (!B.guardrails[id]) return err('ResourceNotFoundException', 'DeleteGuardrail', 'The guardrail was not found.'); delete B.guardrails[id]; save(); return ok(''); }
        if (p[1] === 'list-guardrails') return out({ guardrails: Object.entries(B.guardrails).map(([id, g]) => ({ id, name: g.name, status: 'READY', version: g.versions[g.versions.length - 1], arn: arn('bedrock', 'guardrail/' + id) })) });
        if (p[1] === 'create-model-invocation-job') {
          const e = req('--job-name', '--model-id', '--role-arn', '--input-data-config', '--output-data-config'); if (e) return e;
          const m = modelo(A.get('--model-id')); if (!m) return err('ValidationException', 'CreateModelInvocationJob', 'The provided model identifier is invalid.');
          const inp = ((json(A.get('--input-data-config'), 'input-data-config') || {}).s3InputDataConfig || {}).s3Uri;
          const dst = ((json(A.get('--output-data-config'), 'output-data-config') || {}).s3OutputDataConfig || {}).s3Uri;
          const I = s3path(inp), O = s3path(dst);
          const b = I && s.buckets[I.b], o = b && b.objects[I.k];
          if (!o) return err('ValidationException', 'CreateModelInvocationJob', `The input S3 object ${inp} does not exist or is not accessible.`);
          if (!O || !s.buckets[O.b]) return err('ValidationException', 'CreateModelInvocationJob', `The output S3 location ${dst} is not accessible.`);
          const lineas = o.c.split('\n').filter((x) => x.trim());
          const salida = lineas.map((l, i) => { let r = {}; try { r = JSON.parse(l); } catch (e2) { r = { recordId: 'R' + i }; } const txt = (((r.modelInput || {}).messages || [])[0] || {}).content; const t = Array.isArray(txt) ? (txt[0] || {}).text : txt; return JSON.stringify({ recordId: r.recordId || 'R' + i, modelInput: r.modelInput, modelOutput: { output: { message: { role: 'assistant', content: [{ text: generar(String(t || '')) }] } }, stopReason: 'end_turn' } }); });
          const id = uid(12);
          s.buckets[O.b].objects[(O.k ? O.k.replace(/\/?$/, '/') : '') + id + '/' + I.k.split('/').pop() + '.out'] = { c: salida.join('\n') + '\n', m: now() };
          B.lotes[id] = { name: A.get('--job-name'), model: m.id, n: lineas.length, in: inp, out: dst };
          save(); return ok(out({ jobArn: arn('bedrock', 'model-invocation-job/' + id) }).out + nota(`(${lineas.length} registros; la inferencia por lotes cuesta alrededor de la mitad que bajo demanda y entrega en horas)`));
        }
        if (p[1] === 'get-model-invocation-job') { const id = String(A.get('--job-identifier') || '').split('/').pop(); const j = B.lotes[id]; if (!j) return err('ResourceNotFoundException', 'GetModelInvocationJob', 'Job not found.'); return out({ jobArn: arn('bedrock', 'model-invocation-job/' + id), jobName: j.name, modelId: j.model, status: 'Completed', inputDataConfig: { s3InputDataConfig: { s3Uri: j.in } }, outputDataConfig: { s3OutputDataConfig: { s3Uri: j.out } }, processedRecordCount: j.n, successRecordCount: j.n }); }
        if (p[1] === 'list-model-invocation-jobs') return out({ invocationJobSummaries: Object.entries(B.lotes).map(([id, j]) => ({ jobArn: arn('bedrock', 'model-invocation-job/' + id), jobName: j.name, status: 'Completed' })) });
      }
      if (p[0] === 'bedrock-runtime') {
        const B = s.bedrock;
        if (p[1] === 'converse') {
          const e = req('--model-id', '--messages'); if (e) return e;
          const m = modelo(A.get('--model-id'));
          if (!m) return err('ValidationException', 'Converse', 'The provided model identifier is invalid.');
          if (!m.out.includes('TEXT') || m.out.includes('EMBEDDING')) return err('ValidationException', 'Converse', `The model ${m.id} doesn't support the Converse operation (es un modelo de embeddings).`);
          if (m.perfil && !/^(us|eu|apac|global)\./.test(String(A.get('--model-id'))) && !/inference-profile/.test(String(A.get('--model-id')))) return err('ValidationException', 'Converse', `Invocation of model ID ${m.id} with on-demand throughput isn't supported. Retry your request with the ID or ARN of an inference profile that contains this model. (usa, por ejemplo, us.${m.id})`);
          const msgs = json(A.get('--messages'), 'messages');
          if (!Array.isArray(msgs) || !msgs.length) return err('ValidationException', 'Converse', 'messages must contain at least one message.');
          const ultimo = msgs[msgs.length - 1];
          if (ultimo.role !== 'user') return err('ValidationException', 'Converse', 'A conversation must end with a user message.');
          const texto = (ultimo.content || []).map((c) => c.text || '').join(' ');
          const sistema = (json(A.get('--system'), 'system') || []).map((x) => x.text || '').join(' ');
          const cfg = json(A.get('--inference-config'), 'inference-config') || {};
          if (cfg.temperature !== undefined && (cfg.temperature < 0 || cfg.temperature > 1)) return err('ValidationException', 'Converse', 'temperature must be between 0 and 1.');
          const gcfg = json(A.get('--guardrail-config'), 'guardrail-config');
          const tIn = tokens(sistema + JSON.stringify(msgs));
          const t0 = Date.now();
          if (gcfg) {
            const g = B.guardrails[gcfg.guardrailIdentifier]; if (!g) return err('ResourceNotFoundException', 'Converse', 'The guardrail identifier is invalid.');
            const r = aplicarGuardrail(g, texto, 'INPUT');
            if (r.bloqueado) return out({ output: { message: { role: 'assistant', content: [{ text: r.texto }] } }, stopReason: 'guardrail_intervened', usage: { inputTokens: tIn, outputTokens: 0, totalTokens: tIn }, metrics: { latencyMs: 180 } });
          }
          let resp = generar(texto, sistema);
          if (gcfg) { const r2 = aplicarGuardrail(B.guardrails[gcfg.guardrailIdentifier], resp, 'OUTPUT'); resp = r2.texto; }
          const rc = recortar(resp, cfg.maxTokens);
          const tOut = tokens(rc.texto);
          return out({ output: { message: { role: 'assistant', content: [{ text: rc.texto }] } }, stopReason: rc.stop, usage: { inputTokens: tIn, outputTokens: tOut, totalTokens: tIn + tOut }, metrics: { latencyMs: 300 + tOut * 12 + (Date.now() - t0) } });
        }
        if (p[1] === 'invoke-model') {
          const e = req('--model-id', '--body'); if (e) return e;
          const m = modelo(A.get('--model-id')); if (!m) return err('ValidationException', 'InvokeModel', 'The provided model identifier is invalid.');
          const destino = p[2]; if (!destino) return fail('aws: error: the following arguments are required: outfile', 252);
          if (!A.get('--cli-binary-format')) return err('ValidationException', 'InvokeModel', 'Invalid base64 body (en la CLI v2 agrega --cli-binary-format raw-in-base64-out para enviar JSON plano)');
          const body = json(A.get('--body'), 'body') || {};
          let res;
          if (m.out.includes('EMBEDDING')) { const txt = body.inputText || (body.texts || [''])[0]; const dims = Number(body.dimensions || 1024); res = { embedding: Array.from({ length: 8 }, (_, i) => pseudo(txt + i, -0.1, 0.1, 4)), embeddingDimensions: dims, inputTextTokenCount: tokens(txt), nota: `(se muestran 8 de ${dims} valores)` }; }
          else { const txt = ((body.messages || [])[0] || {}).content; const t = Array.isArray(txt) ? (txt[0] || {}).text : txt || body.prompt || ''; res = { output: { message: { role: 'assistant', content: [{ text: generar(String(t)) }] } }, stopReason: 'end_turn', usage: { inputTokens: tokens(JSON.stringify(body)), outputTokens: 40 } }; }
          Sh.writeFile(Sh.norm(destino), JSON.stringify(res, null, 2));
          return out({ contentType: 'application/json' });
        }
        if (p[1] === 'apply-guardrail') {
          const e = req('--guardrail-identifier', '--guardrail-version', '--source', '--content'); if (e) return e;
          const g = B.guardrails[A.get('--guardrail-identifier')]; if (!g) return err('ResourceNotFoundException', 'ApplyGuardrail', 'The guardrail identifier is invalid.');
          const cont = json(A.get('--content'), 'content') || [];
          const texto = cont.map((c) => (c.text || {}).text || '').join(' ');
          const r = aplicarGuardrail(g, texto, String(A.get('--source')).toUpperCase());
          return out({ usage: { topicPolicyUnits: 1, contentPolicyUnits: 1, sensitiveInformationPolicyUnits: 1 }, action: r.action, outputs: r.action === 'NONE' ? [] : [{ text: r.texto }], assessments: r.evals });
        }
      }
      if (p[0] === 'bedrock-agent') {
        const B = s.bedrock;
        if (p[1] === 'create-knowledge-base') {
          const e = req('--name', '--role-arn', '--knowledge-base-configuration', '--storage-configuration'); if (e) return e;
          const kc = json(A.get('--knowledge-base-configuration'), 'knowledge-base-configuration') || {};
          const emb = ((kc.vectorKnowledgeBaseConfiguration || {}).embeddingModelArn) || '';
          const me = modelo(emb);
          if (!me || !me.out.includes('EMBEDDING')) return err('ValidationException', 'CreateKnowledgeBase', `The embedding model ${emb || '(vacío)'} is not valid. Usa un modelo de embeddings, por ejemplo arn:aws:bedrock:${s.region}::foundation-model/amazon.titan-embed-text-v2:0`);
          const sc = json(A.get('--storage-configuration'), 'storage-configuration') || {};
          const id = idDe('KB' + A.get('--name'));
          if (B.kbs[id]) return err('ConflictException', 'CreateKnowledgeBase', `A knowledge base with name ${A.get('--name')} already exists.`);
          B.kbs[id] = { name: A.get('--name'), emb: me.id, store: sc.type || 'OPENSEARCH_SERVERLESS', sources: {}, chunks: [] };
          save(); return out({ knowledgeBase: { knowledgeBaseId: id, name: A.get('--name'), knowledgeBaseArn: arn('bedrock', 'knowledge-base/' + id), status: 'ACTIVE', storageConfiguration: { type: sc.type || 'OPENSEARCH_SERVERLESS' }, createdAt: now() } });
        }
        if (p[1] === 'delete-knowledge-base') { const id = A.get('--knowledge-base-id'); if (!B.kbs[id]) return err('ResourceNotFoundException', 'DeleteKnowledgeBase', `Knowledge base ${id} not found.`); delete B.kbs[id]; save(); return out({ knowledgeBaseId: id, status: 'DELETING' }); }
        if (p[1] === 'list-knowledge-bases') return out({ knowledgeBaseSummaries: Object.entries(B.kbs).map(([id, k]) => ({ knowledgeBaseId: id, name: k.name, status: 'ACTIVE', updatedAt: now() })) });
        if (p[1] === 'create-data-source') {
          const e = req('--knowledge-base-id', '--name', '--data-source-configuration'); if (e) return e;
          const kb = B.kbs[A.get('--knowledge-base-id')]; if (!kb) return err('ResourceNotFoundException', 'CreateDataSource', `Knowledge base ${A.get('--knowledge-base-id')} not found.`);
          const dc = json(A.get('--data-source-configuration'), 'data-source-configuration') || {};
          const s3c = dc.s3Configuration || {};
          const bucket = String(s3c.bucketArn || '').replace(/^arn:aws:s3:::/, '');
          if (!s.buckets[bucket]) return err('ValidationException', 'CreateDataSource', `The bucket ${bucket || '(vacío)'} does not exist. (bucketArn tiene la forma arn:aws:s3:::nombre-del-bucket)`);
          const vic = json(A.get('--vector-ingestion-configuration'), 'vector-ingestion-configuration') || {};
          const ch = vic.chunkingConfiguration || { chunkingStrategy: 'FIXED_SIZE' };
          const fx = ch.fixedSizeChunkingConfiguration || {};
          const id = idDe('DS' + A.get('--knowledge-base-id') + A.get('--name'));
          kb.sources[id] = { name: A.get('--name'), bucket, prefixes: s3c.inclusionPrefixes || [''], estrategia: ch.chunkingStrategy || 'FIXED_SIZE', maxTokens: Number(fx.maxTokens || 300), solapa: Number(fx.overlapPercentage || 20), jobs: {} };
          save(); return out({ dataSource: { dataSourceId: id, knowledgeBaseId: A.get('--knowledge-base-id'), name: A.get('--name'), status: 'AVAILABLE', vectorIngestionConfiguration: { chunkingConfiguration: ch } } });
        }
        if (p[1] === 'list-data-sources') { const kb = B.kbs[A.get('--knowledge-base-id')]; if (!kb) return err('ResourceNotFoundException', 'ListDataSources', 'Knowledge base not found.'); return out({ dataSourceSummaries: Object.entries(kb.sources).map(([id, d]) => ({ dataSourceId: id, name: d.name, status: 'AVAILABLE' })) }); }
        if (p[1] === 'start-ingestion-job') {
          const e = req('--knowledge-base-id', '--data-source-id'); if (e) return e;
          const kb = B.kbs[A.get('--knowledge-base-id')]; if (!kb) return err('ResourceNotFoundException', 'StartIngestionJob', 'Knowledge base not found.');
          const ds = kb.sources[A.get('--data-source-id')]; if (!ds) return err('ResourceNotFoundException', 'StartIngestionJob', 'Data source not found.');
          const b = s.buckets[ds.bucket];
          const docs = Object.keys(b.objects).filter((k) => ds.prefixes.some((pr) => k.startsWith(pr)) && /\.(txt|md|csv|html|json)$/i.test(k) && !/\.metadata\.json$/.test(k));
          kb.chunks = kb.chunks.filter((c) => c.ds !== A.get('--data-source-id'));
          for (const k of docs) {
            let meta = {};
            const mk = b.objects[k + '.metadata.json'];
            if (mk) { try { meta = JSON.parse(mk.c).metadataAttributes || {}; } catch (e2) { meta = {}; } }
            const texto = b.objects[k].c;
            const partes = ds.estrategia === 'NONE' ? [texto] : ds.estrategia === 'HIERARCHICAL' || ds.estrategia === 'SEMANTIC' ? texto.split(/\n\s*\n|\n(?=#)/).map((x) => x.trim()).filter(Boolean) : trocear(texto, ds.maxTokens, ds.solapa);
            partes.forEach((t) => kb.chunks.push({ ds: A.get('--data-source-id'), text: t.replace(/\s+/g, ' '), uri: `s3://${ds.bucket}/${k}`, meta }));
          }
          const jid = uid(10).toUpperCase();
          ds.jobs[jid] = { docs: docs.length, chunks: kb.chunks.length, at: now() };
          save();
          return ok(out({ ingestionJob: { ingestionJobId: jid, knowledgeBaseId: A.get('--knowledge-base-id'), dataSourceId: A.get('--data-source-id'), status: 'COMPLETE', statistics: { numberOfDocumentsScanned: docs.length, numberOfNewDocumentsIndexed: docs.length, numberOfDocumentsFailed: 0 }, startedAt: now() } }).out + nota(`(${kb.chunks.length} fragmentos con estrategia ${ds.estrategia}${ds.estrategia === 'FIXED_SIZE' ? `, ${ds.maxTokens} tokens y ${ds.solapa}% de solapamiento` : ''})`));
        }
        if (p[1] === 'get-ingestion-job') { const kb = B.kbs[A.get('--knowledge-base-id')]; const ds = kb && kb.sources[A.get('--data-source-id')]; const j = ds && ds.jobs[A.get('--ingestion-job-id')]; if (!j) return err('ResourceNotFoundException', 'GetIngestionJob', 'Ingestion job not found.'); return out({ ingestionJob: { ingestionJobId: A.get('--ingestion-job-id'), status: 'COMPLETE', statistics: { numberOfDocumentsScanned: j.docs, numberOfNewDocumentsIndexed: j.docs, numberOfDocumentsFailed: 0 } } }); }
      }
      if (p[0] === 'bedrock-agent-runtime') {
        const B = s.bedrock;
        if (p[1] === 'retrieve') {
          const e = req('--knowledge-base-id', '--retrieval-query'); if (e) return e;
          const kb = B.kbs[A.get('--knowledge-base-id')]; if (!kb) return err('ResourceNotFoundException', 'Retrieve', 'Knowledge base not found.');
          if (!kb.chunks.length) return err('ValidationException', 'Retrieve', 'The knowledge base has no indexed documents. Run start-ingestion-job first.');
          const q = (json(A.get('--retrieval-query'), 'retrieval-query') || {}).text || '';
          const cfg = json(A.get('--retrieval-configuration'), 'retrieval-configuration') || {};
          return out({ retrievalResults: buscar(kb, q, cfg).map(({ c, sc }) => ({ content: { text: c.text, type: 'TEXT' }, location: { type: 'S3', s3Location: { uri: c.uri } }, score: sc, metadata: { 'x-amz-bedrock-kb-source-uri': c.uri, ...c.meta } })) });
        }
        if (p[1] === 'retrieve-and-generate') {
          const e = req('--input', '--retrieve-and-generate-configuration'); if (e) return e;
          const q = (json(A.get('--input'), 'input') || {}).text || '';
          const cfg = json(A.get('--retrieve-and-generate-configuration'), 'retrieve-and-generate-configuration') || {};
          const kc = cfg.knowledgeBaseConfiguration || {};
          const kb = B.kbs[kc.knowledgeBaseId]; if (!kb) return err('ResourceNotFoundException', 'RetrieveAndGenerate', 'Knowledge base not found.');
          if (!modelo(kc.modelArn)) return err('ValidationException', 'RetrieveAndGenerate', 'The provided model identifier is invalid.');
          const res = buscar(kb, q, kc.retrievalConfiguration || {});
          if (!res.length) return out({ output: { text: 'Lo siento, no encontré información sobre eso en los documentos disponibles.' }, citations: [] });
          // respuesta extractiva: las oraciones del mejor fragmento que más se parecen a la pregunta
          const qw = new Set(palabras(q));
          const oraciones = res[0].c.text.split(/(?<=[.!?])\s+/);
          const mejor = oraciones.map((o) => ({ o, n: palabras(o).filter((w) => qw.has(w)).length })).sort((x, y) => y.n - x.n).slice(0, 2).map((x) => x.o);
          let texto = mejor.join(' ');
          const gcfg = (kc.generationConfiguration || {}).guardrailConfiguration;
          if (gcfg && B.guardrails[gcfg.guardrailId]) texto = aplicarGuardrail(B.guardrails[gcfg.guardrailId], texto, 'OUTPUT').texto;
          return out({ output: { text: texto }, citations: [{ generatedResponsePart: { textResponsePart: { text: texto } }, retrievedReferences: res.slice(0, 2).map(({ c }) => ({ content: { text: c.text.slice(0, 160) + '…' }, location: { type: 'S3', s3Location: { uri: c.uri } }, metadata: c.meta })) }], sessionId: uid(8) + '-' + uid(4) });
        }
      }
      // ---------------------------------------------------------- SageMaker
      if (p[0] === 'sagemaker') {
        const M = s.sm;
        if (p[1] === 'create-training-job') {
          const e = req('--training-job-name', '--algorithm-specification', '--role-arn', '--output-data-config', '--resource-config', '--stopping-condition'); if (e) return e;
          const n = A.get('--training-job-name');
          if (M.training[n]) return err('ResourceInUse', 'CreateTrainingJob', `Training job names must be unique within an AWS account and region, and a training job with this name already exists (${n}).`);
          const rc = corto(A.get('--resource-config')), sc = corto(A.get('--stopping-condition')), oc = corto(A.get('--output-data-config'));
          const spot = !!A.flags['--enable-managed-spot-training'];
          if (spot && !sc.MaxWaitTimeInSeconds) return err('ValidationException', 'CreateTrainingJob', 'MaxWaitTimeInSeconds must be specified when managed spot training is enabled (y debe ser mayor o igual que MaxRuntimeInSeconds).');
          if (spot && Number(sc.MaxWaitTimeInSeconds) < Number(sc.MaxRuntimeInSeconds || 0)) return err('ValidationException', 'CreateTrainingJob', 'MaxWaitTimeInSeconds must be greater than or equal to MaxRuntimeInSeconds.');
          const O = s3path(oc.S3OutputPath); if (!O || !s.buckets[O.b]) return err('ValidationException', 'CreateTrainingJob', `Output path ${oc.S3OutputPath || '(vacío)'} is not valid or the bucket doesn't exist.`);
          const cp = A.get('--checkpoint-config') ? corto(A.get('--checkpoint-config')).S3Uri : null;
          const seg = 1800, facturado = spot ? Math.round(seg * 0.32) : seg;
          M.training[n] = { status: 'Completed', instancia: rc.InstanceType || 'ml.m5.xlarge', cantidad: Number(rc.InstanceCount || 1), spot, cp, seg, facturado, modelo: `s3://${O.b}/${(O.k ? O.k.replace(/\/?$/, '/') : '')}${n}/output/model.tar.gz`, auc: pseudo(n, 0.81, 0.9) };
          s.buckets[O.b].objects[(O.k ? O.k.replace(/\/?$/, '/') : '') + n + '/output/model.tar.gz'] = { c: '(modelo entrenado simulado)', m: now() };
          save();
          const aviso = spot && !cp ? col.warn('\nAviso: activaste Spot sin --checkpoint-config: si la instancia se interrumpe, el entrenamiento empieza de cero.') : '';
          return ok(out({ TrainingJobArn: arn('sagemaker', 'training-job/' + n) }).out + aviso);
        }
        if (p[1] === 'describe-training-job') {
          const j = M.training[A.get('--training-job-name')]; if (!j) return err('ValidationException', 'DescribeTrainingJob', `Requested resource not found: ${A.get('--training-job-name')}`);
          return out({ TrainingJobName: A.get('--training-job-name'), TrainingJobStatus: j.status, SecondaryStatus: 'Completed', ModelArtifacts: { S3ModelArtifacts: j.modelo }, ResourceConfig: { InstanceType: j.instancia, InstanceCount: j.cantidad }, EnableManagedSpotTraining: j.spot, CheckpointConfig: j.cp ? { S3Uri: j.cp } : undefined, TrainingTimeInSeconds: j.seg, BillableTimeInSeconds: j.facturado, FinalMetricDataList: [{ MetricName: 'validation:auc', Value: j.auc }] });
        }
        if (p[1] === 'list-training-jobs') return out({ TrainingJobSummaries: Object.entries(M.training).map(([n, j]) => ({ TrainingJobName: n, TrainingJobStatus: j.status, CreationTime: now() })) });
        if (p[1] === 'create-model') {
          const e = req('--model-name', '--execution-role-arn'); if (e) return e;
          const pc = corto(A.get('--primary-container'));
          if (!pc.ModelDataUrl || !pc.Image) return fail('aws: error: --primary-container necesita Image=…,ModelDataUrl=s3://…', 252);
          const U = s3path(pc.ModelDataUrl); if (!U || !s.buckets[U.b] || !s.buckets[U.b].objects[U.k]) return err('ValidationException', 'CreateModel', `Could not find model data at ${pc.ModelDataUrl}.`);
          M.models[A.get('--model-name')] = { image: pc.Image, data: pc.ModelDataUrl }; save();
          return out({ ModelArn: arn('sagemaker', 'model/' + A.get('--model-name')) });
        }
        if (p[1] === 'create-endpoint-config') {
          const e = req('--endpoint-config-name', '--production-variants'); if (e) return e;
          const vs = cortoLista(A.get('--production-variants'));
          for (const v of vs) if (!M.models[v.ModelName]) return err('ValidationException', 'CreateEndpointConfig', `Could not find model "${v.ModelName}".`);
          M.configs[A.get('--endpoint-config-name')] = { variants: vs, captura: !!A.get('--data-capture-config') }; save();
          return out({ EndpointConfigArn: arn('sagemaker', 'endpoint-config/' + A.get('--endpoint-config-name')) });
        }
        if (p[1] === 'create-endpoint' || p[1] === 'update-endpoint') {
          const e = req('--endpoint-name', '--endpoint-config-name'); if (e) return e;
          const c = M.configs[A.get('--endpoint-config-name')]; if (!c) return err('ValidationException', p[1] === 'create-endpoint' ? 'CreateEndpoint' : 'UpdateEndpoint', `Could not find endpoint configuration "${A.get('--endpoint-config-name')}".`);
          if (p[1] === 'create-endpoint' && M.endpoints[A.get('--endpoint-name')]) return err('ValidationException', 'CreateEndpoint', `Cannot create already existing endpoint "${A.get('--endpoint-name')}".`);
          M.endpoints[A.get('--endpoint-name')] = { config: A.get('--endpoint-config-name'), status: 'InService' }; save();
          const caro = c.variants.some((v) => v.InstanceType) ? nota('(Un endpoint en tiempo real cobra por hora mientras exista, aunque no reciba solicitudes: bórralo al terminar.)') : '';
          return ok(out({ EndpointArn: arn('sagemaker', 'endpoint/' + A.get('--endpoint-name')) }).out + caro);
        }
        if (p[1] === 'describe-endpoint') { const x = M.endpoints[A.get('--endpoint-name')]; if (!x) return err('ValidationException', 'DescribeEndpoint', `Could not find endpoint "${A.get('--endpoint-name')}".`); const c = M.configs[x.config]; return out({ EndpointName: A.get('--endpoint-name'), EndpointConfigName: x.config, EndpointStatus: x.status, ProductionVariants: c.variants.map((v) => ({ VariantName: v.VariantName, CurrentWeight: Number(v.InitialVariantWeight || 1), CurrentInstanceCount: Number(v.InitialInstanceCount || 1) })), DataCaptureConfig: c.captura ? { EnableCapture: true } : undefined }); }
        if (p[1] === 'list-endpoints') return out({ Endpoints: Object.entries(M.endpoints).map(([n, x]) => ({ EndpointName: n, EndpointStatus: x.status, CreationTime: now() })) });
        if (p[1] === 'delete-endpoint') { if (!M.endpoints[A.get('--endpoint-name')]) return err('ValidationException', 'DeleteEndpoint', `Could not find endpoint "${A.get('--endpoint-name')}".`); delete M.endpoints[A.get('--endpoint-name')]; save(); return ok(''); }
        if (p[1] === 'delete-endpoint-config') { delete M.configs[A.get('--endpoint-config-name')]; save(); return ok(''); }
        if (p[1] === 'delete-model') { delete M.models[A.get('--model-name')]; save(); return ok(''); }
      }
      if (p[0] === 'sagemaker-runtime' && p[1] === 'invoke-endpoint') {
        const e = req('--endpoint-name', '--body'); if (e) return e;
        const x = s.sm.endpoints[A.get('--endpoint-name')]; if (!x) return err('ValidationError', 'InvokeEndpoint', `Endpoint ${A.get('--endpoint-name')} of account ${s.account} not found.`);
        const destino = p[2]; if (!destino) return fail('aws: error: the following arguments are required: outfile', 252);
        const filas = String(A.get('--body')).split(/\\n|\n/).filter(Boolean);
        Sh.writeFile(Sh.norm(destino), filas.map((f) => String(pseudo(f, 0.05, 0.95))).join('\n'));
        return out({ ContentType: 'text/csv; charset=utf-8', InvokedProductionVariant: 'AllTraffic' });
      }
      // ---------------------------------------------------------- DynamoDB
      if (p[0] === 'dynamodb') {
        const D = s.ddb;
        const valor = (v) => (v ? v.S ?? v.N ?? (v.BOOL !== undefined ? String(v.BOOL) : JSON.stringify(v)) : undefined);
        const tabla = () => { const t = D[A.get('--table-name')]; if (!t) throw Object.assign(new Error(), { r: err('ResourceNotFoundException', 'Operation', `Requested resource not found: Table: ${A.get('--table-name')} not found`) }); return t; };
        const claveDe = (t, item) => t.keys.map((k) => valor(item[k.AttributeName])).join('|');
        if (p[1] === 'create-table') {
          const e = req('--table-name', '--attribute-definitions', '--key-schema'); if (e) return e;
          if (D[A.get('--table-name')]) return err('ResourceInUseException', 'CreateTable', `Table already exists: ${A.get('--table-name')}`);
          const keys = cortoLista(A.get('--key-schema')), attrs = cortoLista(A.get('--attribute-definitions'));
          if (!keys.some((k) => k.KeyType === 'HASH')) return err('ValidationException', 'CreateTable', 'The key schema must contain a HASH (partition) key.');
          for (const k of keys) if (!attrs.some((x) => x.AttributeName === k.AttributeName)) return err('ValidationException', 'CreateTable', `One or more parameter values were invalid: Some index key attributes are not defined in AttributeDefinitions. Keys: [${k.AttributeName}]`);
          if (!A.get('--billing-mode') && !A.get('--provisioned-throughput')) return err('ValidationException', 'CreateTable', 'No provisioned throughput specified for the table (o usa --billing-mode PAY_PER_REQUEST).');
          D[A.get('--table-name')] = { keys: keys.sort((x) => (x.KeyType === 'HASH' ? -1 : 1)), attrs, items: {}, billing: A.get('--billing-mode') || 'PROVISIONED', ttl: null }; save();
          return out({ TableDescription: { TableName: A.get('--table-name'), TableStatus: 'CREATING', KeySchema: keys, BillingModeSummary: { BillingMode: A.get('--billing-mode') || 'PROVISIONED' }, TableArn: arn('dynamodb', 'table/' + A.get('--table-name')) } });
        }
        if (p[1] === 'list-tables') return out({ TableNames: Object.keys(D) });
        if (p[1] === 'describe-table') { const t = tabla(); return out({ Table: { TableName: A.get('--table-name'), TableStatus: 'ACTIVE', KeySchema: t.keys, ItemCount: Object.keys(t.items).length, BillingModeSummary: { BillingMode: t.billing } } }); }
        if (p[1] === 'delete-table') { tabla(); delete D[A.get('--table-name')]; save(); return out({ TableDescription: { TableName: A.get('--table-name'), TableStatus: 'DELETING' } }); }
        if (p[1] === 'put-item') {
          const t = tabla(); const item = json(A.get('--item'), 'item');
          for (const k of t.keys) if (!item || !item[k.AttributeName]) return err('ValidationException', 'PutItem', `One or more parameter values were invalid: Missing the key ${k.AttributeName} in the item`);
          t.items[claveDe(t, item)] = item; save(); return ok('');
        }
        if (p[1] === 'get-item') { const t = tabla(); const k = json(A.get('--key'), 'key'); const it = t.items[claveDe(t, k)]; return out(it ? { Item: it } : {}); }
        if (p[1] === 'update-time-to-live') { const t = tabla(); const c = corto(A.get('--time-to-live-specification')); t.ttl = c.Enabled === 'true' ? c.AttributeName : null; save(); return out({ TimeToLiveSpecification: { Enabled: c.Enabled === 'true', AttributeName: c.AttributeName } }); }
        if (p[1] === 'scan') { const t = tabla(); const items = Object.values(t.items); return ok(out({ Items: items, Count: items.length, ScannedCount: items.length }).out + nota('(Scan lee la tabla completa: en tablas grandes es caro. Para buscar por clave usa query o get-item.)')); }
        if (p[1] === 'query') {
          const t = tabla(); const expr = String(A.get('--key-condition-expression') || ''); const vals = json(A.get('--expression-attribute-values'), 'expression-attribute-values') || {};
          if (!expr) return err('ValidationException', 'Query', 'Either the KeyConditions or KeyConditionExpression parameter must be specified in the request.');
          const hash = t.keys[0].AttributeName, rango = t.keys[1] && t.keys[1].AttributeName;
          const mh = expr.match(new RegExp(hash + '\\s*=\\s*(:\\w+)'));
          if (!mh) return err('ValidationException', 'Query', `Query condition missed key schema element: ${hash}`);
          const vh = valor(vals[mh[1]]);
          let items = Object.values(t.items).filter((it) => valor(it[hash]) === vh);
          const bw = rango && expr.match(new RegExp('begins_with\\s*\\(\\s*' + rango + '\\s*,\\s*(:\\w+)\\s*\\)'));
          if (bw) items = items.filter((it) => String(valor(it[rango])).startsWith(valor(vals[bw[1]])));
          if (rango) items.sort((x, y) => String(valor(x[rango])).localeCompare(String(valor(y[rango]))));
          if (A.flags['--no-scan-index-forward'] || A.get('--scan-index-forward') === 'false') items.reverse();
          if (A.get('--limit')) items = items.slice(0, Number(A.get('--limit')));
          return out({ Items: items, Count: items.length, ScannedCount: items.length });
        }
      }
      // ---------------------------------------------------------- Secrets Manager / KMS
      if (p[0] === 'secretsmanager') {
        const S = s.secrets;
        if (p[1] === 'create-secret') { const e = req('--name'); if (e) return e; if (S[A.get('--name')]) return err('ResourceExistsException', 'CreateSecret', `The operation failed because the secret ${A.get('--name')} already exists.`); S[A.get('--name')] = { valor: A.get('--secret-string') || '', version: uid(8), rotacion: null, kms: A.get('--kms-key-id') || 'aws/secretsmanager' }; save(); return out({ ARN: arn('secretsmanager', 'secret:' + A.get('--name') + '-' + uid(6)), Name: A.get('--name'), VersionId: S[A.get('--name')].version }); }
        if (p[1] === 'get-secret-value') { const x = S[A.get('--secret-id')]; if (!x) return err('ResourceNotFoundException', 'GetSecretValue', 'Secrets Manager can\'t find the specified secret.'); return out({ Name: A.get('--secret-id'), SecretString: x.valor, VersionId: x.version, VersionStages: ['AWSCURRENT'] }); }
        if (p[1] === 'rotate-secret') { const x = S[A.get('--secret-id')]; if (!x) return err('ResourceNotFoundException', 'RotateSecret', 'Secrets Manager can\'t find the specified secret.'); const rr = corto(A.get('--rotation-rules')); x.rotacion = Number(rr.AutomaticallyAfterDays || 30); x.version = uid(8); save(); return out({ Name: A.get('--secret-id'), VersionId: x.version }); }
        if (p[1] === 'describe-secret') { const x = S[A.get('--secret-id')]; if (!x) return err('ResourceNotFoundException', 'DescribeSecret', 'Secrets Manager can\'t find the specified secret.'); return out({ Name: A.get('--secret-id'), KmsKeyId: x.kms, RotationEnabled: !!x.rotacion, RotationRules: x.rotacion ? { AutomaticallyAfterDays: x.rotacion } : undefined }); }
        if (p[1] === 'list-secrets') return out({ SecretList: Object.entries(S).map(([n, x]) => ({ Name: n, RotationEnabled: !!x.rotacion })) });
        if (p[1] === 'delete-secret') { delete S[A.get('--secret-id')]; save(); return out({ Name: A.get('--secret-id'), DeletionDate: now() }); }
      }
      if (p[0] === 'kms') {
        const K = s.kms;
        if (p[1] === 'create-key') { const id = `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}`; K.keys[id] = { desc: A.get('--description') || '', rotacion: false }; save(); return out({ KeyMetadata: { KeyId: id, Arn: arn('kms', 'key/' + id), Description: A.get('--description') || '', KeyManager: 'CUSTOMER', KeyState: 'Enabled', KeyUsage: 'ENCRYPT_DECRYPT', CreationDate: now() } }); }
        if (p[1] === 'create-alias') { const e = req('--alias-name', '--target-key-id'); if (e) return e; if (!/^alias\//.test(A.get('--alias-name'))) return err('ValidationException', 'CreateAlias', 'Alias must start with the prefix "alias/".'); if (!K.keys[A.get('--target-key-id')]) return err('NotFoundException', 'CreateAlias', 'Key not found.'); K.aliases[A.get('--alias-name')] = A.get('--target-key-id'); save(); return ok(''); }
        if (p[1] === 'list-aliases') return out({ Aliases: Object.entries(K.aliases).map(([n, k]) => ({ AliasName: n, TargetKeyId: k, AliasArn: arn('kms', n) })) });
        if (p[1] === 'list-keys') return out({ Keys: Object.keys(K.keys).map((k) => ({ KeyId: k, KeyArn: arn('kms', 'key/' + k) })) });
        const keyId = (v) => K.aliases[v] || v;
        if (p[1] === 'enable-key-rotation') { const k = K.keys[keyId(A.get('--key-id'))]; if (!k) return err('NotFoundException', 'EnableKeyRotation', 'Key not found.'); k.rotacion = true; save(); return ok(''); }
        if (p[1] === 'get-key-rotation-status') { const k = K.keys[keyId(A.get('--key-id'))]; if (!k) return err('NotFoundException', 'GetKeyRotationStatus', 'Key not found.'); return out({ KeyRotationEnabled: k.rotacion, RotationPeriodInDays: 365 }); }
      }
      // ---------------------------------------------------------- SQS / SNS / CloudWatch
      if (p[0] === 'sqs') {
        const Q = s.sqs; const url = (n) => `https://sqs.${s.region}.amazonaws.com/${s.account}/${n}`; const nombre = (u) => String(u || '').split('/').pop();
        if (p[1] === 'create-queue') { const e = req('--queue-name'); if (e) return e; Q[A.get('--queue-name')] = Q[A.get('--queue-name')] || { msgs: [], attrs: A.get('--attributes') || '' }; save(); return out({ QueueUrl: url(A.get('--queue-name')) }); }
        if (p[1] === 'list-queues') return out({ QueueUrls: Object.keys(Q).map(url) });
        if (p[1] === 'send-message') { const q = Q[nombre(A.get('--queue-url'))]; if (!q) return err('AWS.SimpleQueueService.NonExistentQueue', 'SendMessage', 'The specified queue does not exist.'); const id = `${uid(8)}-${uid(4)}-${uid(4)}`; q.msgs.push({ id, body: A.get('--message-body'), rh: uid(20) }); save(); return out({ MessageId: id, MD5OfMessageBody: uid(32) }); }
        if (p[1] === 'receive-message') { const q = Q[nombre(A.get('--queue-url'))]; if (!q) return err('AWS.SimpleQueueService.NonExistentQueue', 'ReceiveMessage', 'The specified queue does not exist.'); const ms = q.msgs.slice(0, Number(A.get('--max-number-of-messages') || 1)); return out(ms.length ? { Messages: ms.map((m) => ({ MessageId: m.id, ReceiptHandle: m.rh, Body: m.body })) } : {}); }
        if (p[1] === 'delete-message') { const q = Q[nombre(A.get('--queue-url'))]; if (q) q.msgs = q.msgs.filter((m) => m.rh !== A.get('--receipt-handle')); save(); return ok(''); }
      }
      if (p[0] === 'sns') {
        const T = s.sns;
        if (p[1] === 'create-topic') { const e = req('--name'); if (e) return e; T[A.get('--name')] = T[A.get('--name')] || { subs: [], msgs: 0 }; save(); return out({ TopicArn: arn('sns', A.get('--name')) }); }
        const topico = () => T[String(A.get('--topic-arn') || '').split(':').pop()];
        if (p[1] === 'subscribe') { const t = topico(); if (!t) return err('NotFound', 'Subscribe', 'Topic does not exist'); t.subs.push({ proto: A.get('--protocol'), ep: A.get('--notification-endpoint') }); save(); return out({ SubscriptionArn: A.get('--protocol') === 'email' ? 'pending confirmation' : A.get('--topic-arn') + ':' + uid(8) }); }
        if (p[1] === 'publish') { const t = topico(); if (!t) return err('NotFound', 'Publish', 'Topic does not exist'); t.msgs++; save(); return ok(out({ MessageId: `${uid(8)}-${uid(4)}-${uid(4)}` }).out + nota(`(entregado a ${t.subs.length} suscripción(es): ${t.subs.map((x) => x.proto + ' ' + x.ep).join(', ') || 'ninguna'})`)); }
        if (p[1] === 'list-topics') return out({ Topics: Object.keys(T).map((n) => ({ TopicArn: arn('sns', n) })) });
      }
      if (p[0] === 'cloudwatch') {
        if (p[1] === 'put-metric-alarm') { const e = req('--alarm-name', '--metric-name', '--namespace', '--threshold', '--comparison-operator', '--evaluation-periods'); if (e) return e; s.alarms[A.get('--alarm-name')] = { metric: A.get('--metric-name'), ns: A.get('--namespace'), umbral: Number(A.get('--threshold')), op: A.get('--comparison-operator'), acciones: A.get('--alarm-actions') || null }; save(); return ok(''); }
        if (p[1] === 'describe-alarms') return out({ MetricAlarms: Object.entries(s.alarms).map(([n, x]) => ({ AlarmName: n, MetricName: x.metric, Namespace: x.ns, Threshold: x.umbral, ComparisonOperator: x.op, StateValue: 'OK', AlarmActions: x.acciones ? [x.acciones] : [] })) });
      }
      // ---------------------------------------------------------- S3 Tables
      if (p[0] === 's3tables') {
        const T = s.s3t; const nb = (a_) => String(a_ || '').split('/').pop();
        if (p[1] === 'create-table-bucket') { const e = req('--name'); if (e) return e; T[A.get('--name')] = { ns: {} }; save(); return out({ arn: arn('s3tables', 'bucket/' + A.get('--name')) }); }
        if (p[1] === 'list-table-buckets') return out({ tableBuckets: Object.keys(T).map((n) => ({ arn: arn('s3tables', 'bucket/' + n), name: n, createdAt: now() })) });
        const tb = () => T[nb(A.get('--table-bucket-arn'))];
        if (p[1] === 'create-namespace') { const b = tb(); if (!b) return err('NotFoundException', 'CreateNamespace', 'The specified table bucket does not exist.'); const n = String(A.get('--namespace')); b.ns[n] = b.ns[n] || {}; save(); return out({ tableBucketARN: A.get('--table-bucket-arn'), namespace: [n] }); }
        if (p[1] === 'create-table') { const b = tb(); if (!b) return err('NotFoundException', 'CreateTable', 'The specified table bucket does not exist.'); const ns = b.ns[A.get('--namespace')]; if (!ns) return err('NotFoundException', 'CreateTable', 'The specified namespace does not exist.'); if (String(A.get('--format')).toUpperCase() !== 'ICEBERG') return err('ValidationException', 'CreateTable', 'Format must be ICEBERG.'); ns[A.get('--name')] = { at: now() }; save(); return out({ tableARN: A.get('--table-bucket-arn') + '/table/' + uid(12), versionToken: uid(10) }); }
        if (p[1] === 'list-tables') { const b = tb(); if (!b) return err('NotFoundException', 'ListTables', 'The specified table bucket does not exist.'); return out({ tables: Object.entries(b.ns).flatMap(([n, ts]) => Object.keys(ts).map((t) => ({ namespace: [n], name: t, type: 'customer', createdAt: now() }))) }); }
      }
      // ---------------------------------------------------------- Glue Data Quality
      if (glueDQ) {
        const Q = s.dq;
        if (p[1] === 'create-data-quality-ruleset') {
          const e = req('--name', '--ruleset'); if (e) return e;
          const txt = String(A.get('--ruleset'));
          const m = txt.match(/Rules\s*=\s*\[([\s\S]*)\]\s*$/);
          if (!m) return err('InvalidInputException', 'CreateDataQualityRuleset', 'Ruleset must have the form Rules = [ regla, regla, … ]');
          const reglas = m[1].split(/,(?![^[]*\])/).map((x) => x.trim()).filter(Boolean);
          const tt = A.get('--target-table') ? corto(A.get('--target-table')) : {};
          Q.rulesets[A.get('--name')] = { reglas, db: tt.DatabaseName, tb: tt.TableName }; save();
          return out({ Name: A.get('--name') });
        }
        if (p[1] === 'list-data-quality-rulesets') return out({ Rulesets: Object.entries(Q.rulesets).map(([n, r]) => ({ Name: n, RuleCount: r.reglas.length, TargetTable: r.db ? { DatabaseName: r.db, TableName: r.tb } : undefined })) });
        if (p[1] === 'start-data-quality-ruleset-evaluation-run') {
          const e = req('--data-source', '--role', '--ruleset-names'); if (e) return e;
          const ds = (json(A.get('--data-source'), 'data-source') || {}).GlueTable || {};
          const datos = filasTabla(s, ds.DatabaseName, ds.TableName);
          if (!datos) return err('EntityNotFoundException', 'StartDataQualityRulesetEvaluationRun', `Table ${ds.DatabaseName}.${ds.TableName} not found or has no CSV data in S3. (Crea la tabla con un crawler sobre archivos CSV.)`);
          const nombres = String(A.get('--ruleset-names')).split(/[\s,]+/).filter(Boolean);
          const resultados = [];
          for (const n of nombres) { const r = Q.rulesets[n]; if (!r) return err('EntityNotFoundException', 'StartDataQualityRulesetEvaluationRun', `Ruleset ${n} not found.`); const reglas = evaluarDQ(r.reglas, datos); const rid = 'dqresult-' + uid(32); const pas = reglas.filter((x) => x.Result === 'PASS').length; Q.results[rid] = { ruleset: n, reglas, score: reglas.length ? pas / reglas.length : 1, db: ds.DatabaseName, tb: ds.TableName, at: now() }; resultados.push(rid); }
          const runId = 'dqrun-' + uid(32); Q.results[runId] = { run: true, ids: resultados }; save();
          return out({ RunId: runId });
        }
        if (p[1] === 'get-data-quality-ruleset-evaluation-run') { const r = Q.results[A.get('--run-id')]; if (!r || !r.run) return err('EntityNotFoundException', 'GetDataQualityRulesetEvaluationRun', 'Run not found.'); return out({ RunId: A.get('--run-id'), Status: 'SUCCEEDED', ResultIds: r.ids }); }
        if (p[1] === 'get-data-quality-result') { const r = Q.results[A.get('--result-id')]; if (!r || r.run) return err('EntityNotFoundException', 'GetDataQualityResult', 'Result not found.'); return out({ ResultId: A.get('--result-id'), Score: Number(r.score.toFixed(2)), DataSource: { GlueTable: { DatabaseName: r.db, TableName: r.tb } }, RulesetName: r.ruleset, CompletedOn: r.at, RuleResults: r.reglas }); }
        if (p[1] === 'list-data-quality-results') return out({ Results: Object.entries(Q.results).filter(([, r]) => !r.run).map(([id, r]) => ({ ResultId: id, DataSource: { GlueTable: { DatabaseName: r.db, TableName: r.tb } }, StartedOn: r.at })) });
      }
      // ---------------------------------------------------------- Athena workgroups
      if (athenaWg) {
        const W = s.workgroups;
        if (p[1] === 'create-work-group') {
          const e = req('--name'); if (e) return e;
          const c = String(A.get('--configuration') || '');
          const corte = (c.match(/BytesScannedCutoffPerQuery\s*[=:]\s*(\d+)/) || [])[1];
          const salida = (c.match(/OutputLocation\s*[=:]\s*"?(s3:\/\/[^,"}\s]+)/) || [])[1];
          if (corte && Number(corte) < 10485760) return err('InvalidRequestException', 'CreateWorkGroup', 'BytesScannedCutoffPerQuery must be at least 10 MB (10485760 bytes).');
          W[A.get('--name')] = { cutoff: corte ? Number(corte) : null, salida: salida || null, forzar: /EnforceWorkGroupConfiguration\s*[=:]\s*true/i.test(c) }; save();
          return ok('');
        }
        if (p[1] === 'list-work-groups') return out({ WorkGroups: Object.keys(W).map((n) => ({ Name: n, State: 'ENABLED' })) });
        if (p[1] === 'get-work-group') { const w = W[A.get('--work-group')]; if (!w) return err('InvalidRequestException', 'GetWorkGroup', 'WorkGroup is not found.'); return out({ WorkGroup: { Name: A.get('--work-group'), State: 'ENABLED', Configuration: { ResultConfiguration: { OutputLocation: w.salida }, EnforceWorkGroupConfiguration: w.forzar, BytesScannedCutoffPerQuery: w.cutoff || undefined } } }); }
      }
    } catch (e) {
      if (e.r) return e.r;
      return fail(e.message, 252);
    }
    return fail(`aws: error: argument operation: '${p.slice(0, 2).join(' ')}' no está simulado en esta terminal (o está mal escrito). Prueba: aws help`, 252);
  });

  // ================================================================== GOOGLE CLOUD
  const filaDeMensaje = (msg) => { try { const o = JSON.parse(msg); if (o && typeof o === 'object' && !Array.isArray(o)) return o; } catch (e) { /* no es JSON */ } return { data: msg }; };
  async function insertarEnBq(s, destino, fila) {
    const [ds, tb] = String(destino).replace(/^.*[:.](?=[^.]+\.[^.]+$)/, '').split('.');
    const d = s.datasets[ds]; if (!d) return;
    const E = await sql();
    const local = (d.tables[tb] && d.tables[tb].local) || `${ds}__${tb}`;
    const cols = Object.keys(fila);
    E.exec(`CREATE TABLE IF NOT EXISTS ${local} (${cols.map((c) => `"${c}"`).join(', ')})`, E.playground());
    const info = E.exec(`PRAGMA table_info(${local})`, E.playground());
    const existentes = info.ok && info.results[0] ? info.results[0].values.map((v) => v[1]) : [];
    for (const c of cols) if (!existentes.includes(c)) E.exec(`ALTER TABLE ${local} ADD COLUMN "${c}"`, E.playground());
    const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(typeof v === 'object' ? JSON.stringify(v) : v).replace(/'/g, "''")}'`);
    E.exec(`INSERT INTO ${local} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map((c) => lit(fila[c])).join(', ')})`, E.playground());
    const n = E.exec(`SELECT COUNT(*) FROM ${local}`, E.playground()).results[0].values[0][0];
    d.tables[tb] = { ...(d.tables[tb] || {}), rows: n, local, schema: d.tables[tb] ? d.tables[tb].schema : 'desde Pub/Sub' };
    delete d.tables[tb].csv;
  }

  extender('gcloud', 'Google Cloud CLI simulada (auth, storage, pubsub, dataflow, dataproc, ai, scheduler, workflows, kms…)', async (a, ctx, previo) => {
    const s = CS.gcp(); const A = args(a, ['--write-metadata', '--use-topic-schema', '--drop-unknown-fields']); const p = A.pos;
    if (!p.length || A.flags['--help']) { const r = await previo(a, ctx); return ok(r.out.replace(/Grupos simulados: ([^\n]*)/, (m0, l) => `Grupos simulados: ${l}, ai, scheduler, workflows, datastream, kms`)); }
    const proj = A.get('--project') || s.project;
    const out = (d, def_ = 'yaml') => output(d, A, def_);
    // Pub/Sub con suscripción de BigQuery: el original crea la suscripción; acá guardamos el destino
    if (p[0] === 'pubsub' && p[1] === 'subscriptions' && p[2] === 'create' && A.get('--bigquery-table')) {
      const r = await previo(a.filter((x, i) => !String(x).startsWith('--bigquery-table') && !(a[i - 1] === '--bigquery-table') && !['--write-metadata', '--use-topic-schema', '--drop-unknown-fields'].includes(x)), ctx);
      if (r.code) return r;
      const dest = String(A.get('--bigquery-table'));
      const partes = dest.replace(':', '.').split('.'); const ds = partes[partes.length - 2];
      if (!s.datasets[ds]) { delete s.subs[p[3]]; save(); return fail(`ERROR: (gcloud.pubsub.subscriptions.create) INVALID_ARGUMENT: The BigQuery table does not exist: ${dest}. (crea antes el dataset y la tabla con bq mk)`); }
      s.subs[p[3]].bq = dest; s.subs[p[3]].meta = !!A.flags['--write-metadata']; save();
      return ok(r.out + nota(`(suscripción de BigQuery: cada mensaje se escribe como una fila en ${dest}, sin código)`));
    }
    if (p[0] === 'pubsub' && p[1] === 'topics' && p[2] === 'publish') {
      const r = await previo(a, ctx);
      if (r.code) return r;
      const msg = A.get('--message');
      for (const sub of Object.values(s.subs).filter((x) => x.topic === p[3] && x.bq)) {
        const fila = filaDeMensaje(msg);
        await insertarEnBq(s, sub.bq, sub.meta ? { ...fila, publish_time: now(), message_id: String(Date.now()) } : fila);
        sub.queue = sub.queue.filter((m) => m.data !== msg);
      }
      save(); return r;
    }
    if (!['ai', 'scheduler', 'workflows', 'datastream', 'kms'].includes(p[0])) return undefined;
    if (!s.account && !(ctx.opts && ctx.opts.autoLogin)) return fail('ERROR: (gcloud) You do not currently have an active account selected.\nPlease run:\n\n  $ gcloud auth login');
    if (!s.account) { s.account = 'alumno@academia.dev'; s.project = s.project || 'academia-datos-dev'; }
    const region = A.get('--region') || A.get('--location') || s.region;
    s.ai = s.ai || { models: {}, endpoints: {}, jobs: {} }; s.sched = s.sched || {}; s.wf = s.wf || {}; s.ds = s.ds || {}; s.kms = s.kms || {};
    if (p[0] === 'ai') {
      const X = s.ai;
      const porNombre = (col, k) => col[k] ? k : (Object.entries(col).find(([, v]) => v.name === k) || [k])[0];
      if (p[1] === 'endpoints' && p[3] && !p[3].startsWith('-')) p[3] = porNombre(X.endpoints, p[3]);
      if (A.get('--model')) A.flags['--model'] = porNombre(X.models, A.get('--model'));
      if (p[1] === 'models' && p[2] === 'upload') { const n = A.get('--display-name'); if (!n || !A.get('--container-image-uri')) return fail('ERROR: (gcloud.ai.models.upload) argument --container-image-uri --display-name: Must be specified.'); const id = String(1000000000 + hashNum('modelo:' + n) % 8999999999); X.models[id] = { name: n, uri: A.get('--artifact-uri') || '' }; save(); return ok(`Using endpoint [https://${region}-aiplatform.googleapis.com/]\nWaiting for operation [${uid(16)}]...done.\nModel ${id} uploaded (display name: ${n}).`); }
      if (p[1] === 'models' && p[2] === 'list') return out(Object.entries(X.models).map(([id, m]) => ({ MODEL_ID: id, DISPLAY_NAME: m.name })), 'table');
      if (p[1] === 'endpoints' && p[2] === 'create') { const n = A.get('--display-name'); if (!n) return fail('ERROR: (gcloud.ai.endpoints.create) argument --display-name: Must be specified.'); const id = String(100000000000 + hashNum('endpoint:' + n) % 899999999999); X.endpoints[id] = { name: n, deployed: [] }; save(); return ok(`Using endpoint [https://${region}-aiplatform.googleapis.com/]\nWaiting for operation [${uid(16)}]...done.\nCreated Vertex AI endpoint: projects/${proj}/locations/${region}/endpoints/${id}.`); }
      if (p[1] === 'endpoints' && p[2] === 'list') return out(Object.entries(X.endpoints).map(([id, e]) => ({ ENDPOINT_ID: id, DISPLAY_NAME: e.name, MODELOS: e.deployed.map((d) => `${d.name} (${d.split}%)`).join(', ') })), 'table');
      if (p[1] === 'endpoints' && p[2] === 'deploy-model') {
        const e = X.endpoints[p[3]]; if (!e) return fail(`ERROR: (gcloud.ai.endpoints.deploy-model) NOT_FOUND: Endpoint ${p[3]} not found.`);
        const m = X.models[A.get('--model')]; if (!m) return fail(`ERROR: (gcloud.ai.endpoints.deploy-model) NOT_FOUND: Model ${A.get('--model')} not found.`);
        const split = A.get('--traffic-split');
        const nombreDep = A.get('--display-name') || m.name; const nuevo = { id: String(10000000 + hashNum('desplegado:' + p[3] + nombreDep) % 89999999), name: nombreDep, machine: A.get('--machine-type') || 'n1-standard-4', min: Number(A.get('--min-replica-count') || 1), max: Number(A.get('--max-replica-count') || 1), split: 100 };
        if (split) { const partes = String(split).split(',').map((x) => x.split('=')); const total = partes.reduce((t, [, v]) => t + Number(v), 0); if (total !== 100) return fail(`ERROR: (gcloud.ai.endpoints.deploy-model) INVALID_ARGUMENT: The traffic split must sum to 100 (suma ${total}).`); for (const [k, v] of partes) { if (k === '0') nuevo.split = Number(v); else { const d = e.deployed.find((x) => x.id === k || x.name === k); if (d) d.split = Number(v); } } }
        else e.deployed.forEach((d) => { d.split = 0; });
        e.deployed.push(nuevo); save();
        return ok(`Using endpoint [https://${region}-aiplatform.googleapis.com/]\nWaiting for operation [${uid(16)}]...done.\nDeployed a model to the endpoint ${p[3]}. Id of the deployed model: ${nuevo.id}.` + nota(`(tráfico: ${e.deployed.map((d) => `${d.name} ${d.split}%`).join(' · ')}; con min-replica-count ${nuevo.min} el endpoint cobra aunque no tenga tráfico)`));
      }
      if (p[1] === 'endpoints' && p[2] === 'undeploy-model') { const e = X.endpoints[p[3]]; if (!e) return fail('ERROR: NOT_FOUND'); const dm = A.get('--deployed-model-id'); if (!e.deployed.some((d) => d.id === dm || d.name === dm)) return fail(`ERROR: (gcloud.ai.endpoints.undeploy-model) NOT_FOUND: Deployed model ${dm} not found.`); e.deployed = e.deployed.filter((d) => d.id !== dm && d.name !== dm); save(); return ok(`Undeployed a model from the endpoint ${p[3]}.`); }
      if (p[1] === 'endpoints' && p[2] === 'delete') { if (!X.endpoints[p[3]]) return fail('ERROR: NOT_FOUND'); if (X.endpoints[p[3]].deployed.length) return fail(`ERROR: (gcloud.ai.endpoints.delete) FAILED_PRECONDITION: Endpoint ${p[3]} has deployed models. Undeploy them first.`); delete X.endpoints[p[3]]; save(); return ok(`Deleted Vertex AI endpoint [${p[3]}].`); }
      if (p[1] === 'endpoints' && p[2] === 'predict') {
        const e = X.endpoints[p[3]]; if (!e || !e.deployed.length) return fail(`ERROR: (gcloud.ai.endpoints.predict) FAILED_PRECONDITION: Endpoint ${p[3]} has no deployed models.`);
        const f = A.get('--json-request'); const c = f && Sh.readFile(Sh.norm(f)); if (c === null || !f) return fail(`ERROR: (gcloud.ai.endpoints.predict) Unable to read file [${f}].`);
        let inst = []; try { inst = JSON.parse(c).instances || []; } catch (e2) { return fail('ERROR: (gcloud.ai.endpoints.predict) INVALID_ARGUMENT: el archivo debe ser JSON con {"instances": [...]}'); }
        const r = Math.random() * 100; let acum = 0; const d = e.deployed.find((x) => (acum += x.split) >= r) || e.deployed[0];
        return ok(`Using endpoint [https://${region}-prediction-aiplatform.googleapis.com/]\n[${inst.map((x) => pseudo(JSON.stringify(x), 0.05, 0.95)).join(', ')}]` + nota(`(respondió el modelo desplegado ${d.name})`));
      }
      if (p[1] === 'custom-jobs' && p[2] === 'create') { const spec = A.get('--worker-pool-spec'); if (!spec || !A.get('--display-name')) return fail('ERROR: (gcloud.ai.custom-jobs.create) argument --display-name --worker-pool-spec: Must be specified.'); const c = corto(spec); if (!c['machine-type'] || !(c['container-image-uri'] || c['executor-image-uri'])) return fail('ERROR: (gcloud.ai.custom-jobs.create) INVALID_ARGUMENT: worker-pool-spec necesita machine-type y container-image-uri (o executor-image-uri con local-package-path).'); const id = String(Date.now()).slice(-10); X.jobs[id] = { name: A.get('--display-name'), estado: 'JOB_STATE_SUCCEEDED', spec: c }; save(); return ok(`CustomJob [projects/${proj}/locations/${region}/customJobs/${id}] is submitted successfully.\n\nYour job is still active. You may view the status of your job with the command\n\n  $ gcloud ai custom-jobs describe ${id} --region=${region}`); }
      if (p[1] === 'custom-jobs' && p[2] === 'describe') { const j = X.jobs[p[3]]; if (!j) return fail('ERROR: NOT_FOUND'); return out({ displayName: j.name, state: j.estado, jobSpec: { workerPoolSpecs: [{ machineSpec: { machineType: j.spec['machine-type'], acceleratorType: j.spec['accelerator-type'] }, replicaCount: j.spec['replica-count'] || '1' }] } }); }
      if (p[1] === 'custom-jobs' && p[2] === 'list') return out(Object.entries(X.jobs).map(([id, j]) => ({ ID: id, DISPLAY_NAME: j.name, STATE: j.estado })), 'table');
    }
    if (p[0] === 'scheduler' && p[1] === 'jobs') {
      if (p[2] === 'create') { const n = p[4]; if (!['http', 'pubsub'].includes(p[3]) || !n) return fail('ERROR: (gcloud.scheduler.jobs.create) usa: gcloud scheduler jobs create http|pubsub NOMBRE --schedule=… --uri=…|--topic=…'); if (!A.get('--schedule')) return fail('ERROR: (gcloud.scheduler.jobs.create.' + p[3] + ') argument --schedule: Must be specified.'); if (String(A.get('--schedule')).trim().split(/\s+/).length !== 5) return fail(`ERROR: (gcloud.scheduler.jobs.create.${p[3]}) INVALID_ARGUMENT: Schedule has invalid format: ${A.get('--schedule')} (usa 5 campos de cron)`); s.sched[n] = { tipo: p[3], schedule: A.get('--schedule'), destino: A.get('--uri') || A.get('--topic'), tz: A.get('--time-zone') || 'Etc/UTC' }; save(); return out({ name: `projects/${proj}/locations/${region}/jobs/${n}`, schedule: A.get('--schedule'), timeZone: s.sched[n].tz, state: 'ENABLED' }); }
      if (p[2] === 'list') return out(Object.entries(s.sched).map(([n, j]) => ({ ID: n, LOCATION: region, SCHEDULE: `${j.schedule} (${j.tz})`, TARGET_TYPE: j.tipo.toUpperCase(), STATE: 'ENABLED' })), 'table');
      if (p[2] === 'run') { if (!s.sched[p[3]]) return fail('ERROR: NOT_FOUND'); return ok(''); }
      if (p[2] === 'delete') { delete s.sched[p[3]]; save(); return ok(`Deleted job [${p[3]}].`); }
    }
    if (p[0] === 'workflows') {
      if (p[1] === 'deploy') { const f = A.get('--source'); const c = f && Sh.readFile(Sh.norm(f)); if (!f || c === null) return fail(`ERROR: (gcloud.workflows.deploy) Unable to read file [${f}].`); if (!/^\s*(main:|- \w+:)/m.test(c)) return fail('ERROR: (gcloud.workflows.deploy) INVALID_ARGUMENT: workflow is invalid: el YAML debe tener pasos (- paso:) o un bloque main:'); s.wf[p[2]] = { src: c, runs: 0 }; save(); return ok(`Waiting for operation [${uid(16)}] to complete...done.\nname: projects/${proj}/locations/${region}/workflows/${p[2]}\nstate: ACTIVE`); }
      if (p[1] === 'run') { const w = s.wf[p[2]]; if (!w) return fail(`ERROR: (gcloud.workflows.run) NOT_FOUND: Workflow ${p[2]} not found.`); w.runs++; save(); const pasos = (w.src.match(/^\s*- (\w+):/gm) || []).map((x) => x.trim().slice(2, -1)); return ok(`Waiting for execution [${uid(16)}] to complete...done.\nresult: '"ok"'\nstate: SUCCEEDED` + nota(`(pasos ejecutados: ${pasos.join(' → ') || 'main'})`)); }
      if (p[1] === 'list') return out(Object.keys(s.wf).map((n) => ({ NAME: `projects/${proj}/locations/${region}/workflows/${n}`, STATE: 'ACTIVE' })), 'table');
    }
    if (p[0] === 'datastream') {
      if (p[1] === 'connection-profiles' && p[2] === 'create') { s.ds.perfiles = s.ds.perfiles || {}; s.ds.perfiles[p[3]] = { tipo: A.get('--type') }; save(); return ok(`Waiting for operation [${uid(16)}] to complete...done.\nCreated connection profile [${p[3]}] (${A.get('--type') || 'mysql'}).`); }
      if (p[1] === 'streams' && p[2] === 'create') { const src = A.get('--source'), dst = A.get('--destination'); const P = s.ds.perfiles || {}; if (!P[src] || !P[dst]) return fail(`ERROR: (gcloud.datastream.streams.create) NOT_FOUND: connection profile ${!P[src] ? src : dst} not found. (crea antes los perfiles de origen y destino)`); s.ds.streams = s.ds.streams || {}; s.ds.streams[p[3]] = { src, dst, estado: 'NOT_STARTED' }; save(); return ok(`Waiting for operation [${uid(16)}] to complete...done.\nCreated stream [${p[3]}]: ${src} → ${dst}`); }
      if (p[1] === 'streams' && p[2] === 'update' && A.get('--state')) { const x = (s.ds.streams || {})[p[3]]; if (!x) return fail('ERROR: NOT_FOUND'); x.estado = A.get('--state'); save(); return ok(`Updated stream [${p[3]}]: state ${x.estado}` + (x.estado === 'RUNNING' ? nota('(carga inicial + CDC continuo hacia el destino)') : '')); }
      if (p[1] === 'streams' && p[2] === 'list') return out(Object.entries(s.ds.streams || {}).map(([n, x]) => ({ ID: n, STATE: x.estado, SOURCE: x.src, DESTINATION: x.dst })), 'table');
    }
    if (p[0] === 'kms') {
      if (p[1] === 'keyrings' && p[2] === 'create') { if (!A.get('--location')) return fail('ERROR: (gcloud.kms.keyrings.create) argument --location: Must be specified.'); s.kms[p[3]] = s.kms[p[3]] || { location: A.get('--location'), keys: {} }; save(); return ok(''); }
      if (p[1] === 'keys' && p[2] === 'create') { const kr = s.kms[A.get('--keyring')]; if (!kr) return fail(`ERROR: (gcloud.kms.keys.create) NOT_FOUND: KeyRing ${A.get('--keyring')} not found.`); kr.keys[p[3]] = { purpose: A.get('--purpose') || 'encryption', rotacion: A.get('--rotation-period') || null }; save(); return ok(''); }
      if (p[1] === 'keys' && p[2] === 'list') { const kr = s.kms[A.get('--keyring')]; if (!kr) return fail('ERROR: NOT_FOUND'); return out(Object.entries(kr.keys).map(([n, k]) => ({ NAME: `projects/${proj}/locations/${kr.location}/keyRings/${A.get('--keyring')}/cryptoKeys/${n}`, PURPOSE: k.purpose.toUpperCase(), ROTATION: k.rotacion || '—' })), 'table'); }
    }
    return undefined;
  });

  // ---- BigQuery ML y funciones de IA
  extender('bq', 'BigQuery (simulado): mk, ls, show, load, query (SQL real sobre las tablas del curso) y BigQuery ML', async (a, ctx, previo) => {
    const s = CS.gcp(); const A = args(a, ['--nouse_legacy_sql', '--models', '-m']); const p = A.pos;
    s.bqml = s.bqml || {};
    if (p[0] === 'ls' && (A.flags['--models'] || A.flags['-m'])) { const ds = (p[1] || '').replace(/^.*:/, ''); const ms = Object.entries(s.bqml).filter(([k]) => k.startsWith(ds + '.')); return ok('     Id          Model Type     Labels\n ------------- -------------- --------\n' + ms.map(([k, m]) => `  ${k.split('.')[1].padEnd(13)} ${m.tipo.padEnd(14)}`).join('\n')); }
    if (p[0] !== 'query') return undefined;
    const q = p.slice(1).join(' ');
    const hayML = /\bCREATE\s+(OR\s+REPLACE\s+)?MODEL\b|\bML\.(EVALUATE|PREDICT|FORECAST|FEATURE_IMPORTANCE)\b|\bAI\.(GENERATE|FORECAST)\b|\bML\.GENERATE_TEXT\b/i.test(q);
    if (!hayML) return undefined;
    if (!s.account && !(ctx.opts && ctx.opts.autoLogin)) return fail('ERROR: You do not currently have an active account selected. Run gcloud auth login.');
    if (!A.flags['--nouse_legacy_sql'] && A.get('--use_legacy_sql') !== 'false') return fail('Error in query string: BigQuery ML requiere GoogleSQL: agrega --use_legacy_sql=false (o --nouse_legacy_sql).');
    const E = await sql();
    const mapear = (txt) => txt.replace(/`(?:[\w-]+\.)?([\w-]+)\.(\w+)`|\b(?:[\w-]+\.)?([A-Za-z_]\w*)\.([A-Za-z_]\w*)\b(?!\s*\()/g, (m0, a1, b1, a2, b2) => { const ds = a1 || a2, tb = b1 || b2; const t = s.datasets[ds] && s.datasets[ds].tables[tb]; if (t && t.local) return t.local; if (s.datasets[ds] || /^(tienda|curso|banco|ventas|analytics|datos)$/.test(ds)) return tb; return m0; });
    const nombreModelo = (txt) => { const m = txt.match(/MODEL\s+`?(?:[\w-]+\.)?(\w+)\.(\w+)`?/i); return m ? `${m[1]}.${m[2]}` : null; };
    let m;
    if ((m = q.match(/^\s*CREATE\s+(OR\s+REPLACE\s+)?MODEL\s+`?(?:[\w-]+\.)?(\w+)\.(\w+)`?\s*(?:OPTIONS\s*\(([\s\S]*?)\))?\s*AS\s*([\s\S]+)$/i))) {
      const [, , ds, nombre, opts = '', cuerpo] = m;
      if (!s.datasets[ds]) return fail(`BigQuery error in query operation: Not found: Dataset ${s.project}:${ds}`);
      if (s.bqml[`${ds}.${nombre}`] && !m[1]) return fail(`BigQuery error in query operation: Already Exists: Model ${s.project}:${ds}.${nombre}`);
      const tipo = ((opts.match(/model_type\s*=\s*'(\w+)'/i) || [])[1] || '').toUpperCase();
      const TIPOS = ['LINEAR_REG', 'LOGISTIC_REG', 'KMEANS', 'BOOSTED_TREE_CLASSIFIER', 'BOOSTED_TREE_REGRESSOR', 'RANDOM_FOREST_CLASSIFIER', 'ARIMA_PLUS', 'DNN_CLASSIFIER', 'MATRIX_FACTORIZATION', 'AUTOML_CLASSIFIER', 'AUTOML_REGRESSOR'];
      if (!tipo) return fail("BigQuery error in query operation: Missing model_type in OPTIONS (ej. OPTIONS(model_type='LOGISTIC_REG', input_label_cols=['etiqueta']))");
      if (!TIPOS.includes(tipo)) return fail(`BigQuery error in query operation: Unsupported model_type: ${tipo}`);
      const etiqueta = ((opts.match(/input_label_cols\s*=\s*\[\s*'(\w+)'/i) || [])[1]) || null;
      const r = E.exec(mapear(cuerpo).replace(/;\s*$/, ''), E.playground());
      if (!r.ok) return fail('BigQuery error in query operation: Error processing job: ' + r.error.split('\n')[0]);
      const res = r.results[r.results.length - 1] || { columns: [], values: [] };
      const supervisado = !['KMEANS', 'ARIMA_PLUS', 'MATRIX_FACTORIZATION'].includes(tipo);
      const lab = etiqueta || (res.columns.includes('label') ? 'label' : null);
      if (supervisado && (!lab || !res.columns.includes(lab))) return fail(`BigQuery error in query operation: Unable to identify the label column. Usa input_label_cols=['columna'] con una columna que exista en el SELECT (columnas: ${res.columns.join(', ')}).`);
      if (tipo === 'ARIMA_PLUS') { const tcol = (opts.match(/time_series_timestamp_col\s*=\s*'(\w+)'/i) || [])[1], dcol = (opts.match(/time_series_data_col\s*=\s*'(\w+)'/i) || [])[1]; if (!tcol || !dcol) return fail("BigQuery error in query operation: ARIMA_PLUS requiere time_series_timestamp_col y time_series_data_col en OPTIONS."); }
      const nums = res.columns.map((c, i) => res.values.map((v) => Number(v[i])).filter((x) => !Number.isNaN(x)));
      const ultimo = (() => { const dcol = (opts.match(/time_series_data_col\s*=\s*'(\w+)'/i) || [])[1]; const i = res.columns.indexOf(dcol); return i >= 0 && nums[i].length ? nums[i].slice(-7).reduce((x, y) => x + y, 0) / Math.min(7, nums[i].length) : 100; })();
      s.bqml[`${ds}.${nombre}`] = { tipo, label: lab, features: res.columns.filter((c) => c !== lab), filas: res.values.length, base: ultimo, clusters: Number((opts.match(/num_clusters\s*=\s*(\d+)/i) || [])[1] || 4) };
      save();
      return ok(`Waiting on bqjob_r${uid(16)} ... (6s) Current status: DONE\nCreated ${s.project}.${ds}.${nombre}` + nota(`(${tipo} entrenado con ${res.values.length} filas; features: ${s.bqml[`${ds}.${nombre}`].features.join(', ') || '—'})`));
    }
    const nm = nombreModelo(q);
    const mod = nm && s.bqml[nm];
    if (/ML\.|AI\.FORECAST/i.test(q) && !/AI\.GENERATE|ML\.GENERATE_TEXT/i.test(q) && !mod) return fail(`BigQuery error in query operation: Not found: Model ${s.project}:${nm || '(sin nombre)'}`);
    const tabla = (cols, filas) => ok(Sh.fmtTable(cols, filas.map((f) => f.map((v) => (v === null ? 'NULL' : String(v))))));
    if (/ML\.EVALUATE/i.test(q)) {
      const semilla = nm + mod.filas;
      if (['LOGISTIC_REG', 'BOOSTED_TREE_CLASSIFIER', 'RANDOM_FOREST_CLASSIFIER', 'DNN_CLASSIFIER', 'AUTOML_CLASSIFIER'].includes(mod.tipo)) { const pr = pseudo(semilla + 'p', 0.62, 0.88), rc = pseudo(semilla + 'r', 0.55, 0.85); return tabla(['precision', 'recall', 'accuracy', 'f1_score', 'log_loss', 'roc_auc'], [[pr, rc, pseudo(semilla + 'a', 0.8, 0.93), Number((2 * pr * rc / (pr + rc)).toFixed(3)), pseudo(semilla + 'l', 0.28, 0.48), pseudo(semilla + 'u', 0.78, 0.92)]]); }
      if (['LINEAR_REG', 'BOOSTED_TREE_REGRESSOR', 'AUTOML_REGRESSOR'].includes(mod.tipo)) return tabla(['mean_absolute_error', 'mean_squared_error', 'median_absolute_error', 'r2_score', 'explained_variance'], [[pseudo(semilla + 'm', 8, 25, 2), pseudo(semilla + 's', 120, 600, 2), pseudo(semilla + 'd', 5, 18, 2), pseudo(semilla + 'r', 0.55, 0.85), pseudo(semilla + 'e', 0.55, 0.86)]]);
      if (mod.tipo === 'KMEANS') return tabla(['davies_bouldin_index', 'mean_squared_distance'], [[pseudo(semilla, 0.8, 1.6), pseudo(semilla + 'd', 2, 6)]]);
      if (mod.tipo === 'ARIMA_PLUS') return tabla(['non_seasonal_p', 'non_seasonal_d', 'non_seasonal_q', 'has_drift', 'log_likelihood', 'AIC', 'variance', 'seasonal_periods'], [[2, 1, 1, 'false', pseudo(semilla, -900, -300, 1), pseudo(semilla + 'a', 600, 1800, 1), pseudo(semilla + 'v', 10, 90, 2), '[WEEKLY]']]);
      return tabla(['metric', 'value'], [['loss', pseudo(semilla, 0.2, 0.5)]]);
    }
    if (/ML\.FEATURE_IMPORTANCE/i.test(q)) return tabla(['feature', 'importance_weight', 'importance_gain'], mod.features.map((f) => [f, Math.round(pseudo(nm + f, 5, 80, 0)), pseudo(nm + f + 'g', 0.05, 0.6)]).sort((x, y) => y[2] - x[2]));
    if (/ML\.FORECAST|AI\.FORECAST/i.test(q)) {
      const h = Number((q.match(/(\d+)\s+AS\s+horizon/i) || [])[1] || 7);
      const hoy = new Date(); const filas = [];
      for (let i = 1; i <= h; i++) { const d = new Date(+hoy + i * 864e5).toISOString().slice(0, 10); const v = mod.base * (1 + Math.sin(i / 3) * 0.08); filas.push([d + ' 00:00:00 UTC', Number(v.toFixed(2)), 0.95, Number((v * 0.85).toFixed(2)), Number((v * 1.15).toFixed(2))]); }
      return tabla(['forecast_timestamp', 'forecast_value', 'confidence_level', 'prediction_interval_lower_bound', 'prediction_interval_upper_bound'], filas);
    }
    if (/ML\.PREDICT/i.test(q)) {
      const inner = q.match(/ML\.PREDICT\s*\(\s*MODEL\s+`?[\w.-]+`?\s*,\s*\(([\s\S]*)\)\s*\)/i) || q.match(/ML\.PREDICT\s*\(\s*MODEL\s+`?[\w.-]+`?\s*,\s*TABLE\s+`?([\w.-]+)`?\s*\)/i);
      if (!inner) return fail('BigQuery error in query operation: ML.PREDICT necesita MODEL y una consulta: ML.PREDICT(MODEL ds.modelo, (SELECT …))');
      const fuente = /^\s*SELECT|^\s*WITH/i.test(inner[1]) ? inner[1] : `SELECT * FROM ${inner[1]}`;
      const r = E.exec(mapear(fuente), E.playground()); if (!r.ok) return fail('BigQuery error in query operation: ' + r.error.split('\n')[0]);
      const res = r.results[r.results.length - 1] || { columns: [], values: [] };
      const faltan = mod.features.filter((f) => !res.columns.includes(f));
      if (faltan.length) return fail(`BigQuery error in query operation: Invalid table-valued function ML.PREDICT: Input data doesn't contain column: ${faltan[0]} (el SELECT debe traer las mismas features que el entrenamiento).`);
      const lim = Number((q.match(/LIMIT\s+(\d+)\s*$/i) || [])[1] || 20);
      const filas = res.values.slice(0, lim);
      if (mod.tipo === 'KMEANS') return tabla(['CENTROID_ID', ...res.columns], filas.map((f) => [1 + (hashNum(f.join('|')) % mod.clusters), ...f]));
      const clasif = /CLASSIFIER|LOGISTIC/.test(mod.tipo);
      return tabla([`predicted_${mod.label}`, ...(clasif ? [`predicted_${mod.label}_probs`] : []), ...res.columns], filas.map((f) => { const pr = pseudo(nm + f.join('|'), 0.02, 0.98); return clasif ? [pr >= 0.5 ? 1 : 0, `[{label:1, prob:${pr}}, {label:0, prob:${Number((1 - pr).toFixed(3))}}]`, ...f] : [Number((pseudo(nm + f.join('|'), 0.5, 1.5) * 100).toFixed(2)), ...f]; }));
    }
    if (/AI\.GENERATE|ML\.GENERATE_TEXT/i.test(q)) {
      const pm = q.match(/AI\.GENERATE\s*\(\s*(?:\(\s*)?'([^']*)'\s*,?\s*(\w+)?/i) || q.match(/ML\.GENERATE_TEXT\s*\([^,]+,\s*\(\s*SELECT\s+'([^']*)'\s*\|\|\s*(\w+)/i);
      const from = (q.match(/\bFROM\s+(`?[\w.-]+`?)/i) || [])[1];
      if (!pm || !from) return fail("BigQuery error in query operation: usa, por ejemplo: SELECT resena, AI.GENERATE(('Clasifica el sentimiento: ', resena), connection_id => 'us.gemini', endpoint => 'gemini-2.5-flash').result FROM ds.resenas LIMIT 5");
      const col_ = pm[2];
      const lim = Number((q.match(/LIMIT\s+(\d+)/i) || [])[1] || 5);
      const r = E.exec(`SELECT ${col_ ? '"' + col_ + '"' : "''"} FROM ${mapear(from.replace(/`/g, ''))} LIMIT ${lim}`, E.playground());
      if (!r.ok) return fail('BigQuery error in query operation: ' + r.error.split('\n')[0]);
      return ok(Sh.fmtTable([col_ || 'entrada', 'result'], r.results[0].values.map((v) => [String(v[0]).slice(0, 40), generar(pm[1] + ' ' + v[0])])) + nota('(respuestas simuladas: en BigQuery real las genera Gemini con una conexión a la plataforma de IA)'));
    }
    return undefined;
  });

  // ================================================================== AZURE
  extender('az', null, async (a, ctx, previo) => {
    const s = CS.az(); const A = args(a, ['--all-traffic']); const p = A.pos;
    if (!['cognitiveservices', 'ml', 'search'].includes(p[0])) return undefined;
    if (!s.logged && !(ctx.opts && ctx.opts.autoLogin)) return fail("Please run 'az login' to setup account.");
    s.logged = true;
    const out = (d) => output(d, A, 'json');
    const rg = A.get('--resource-group', '-g') || s.defaults.group;
    const needRg = () => (!rg ? fail('(MissingParameter) --resource-group/-g es obligatorio (o az config set defaults.group=…).', 2) : !s.groups[rg] ? fail(`(ResourceGroupNotFound) Resource group '${rg}' could not be found.`, 3) : null);
    s.cog = s.cog || {}; s.aml = s.aml || {}; s.search = s.search || {};
    const sub = (CS.az().sub);
    if (p[0] === 'cognitiveservices' && p[1] === 'account') {
      const n = A.get('--name', '-n');
      if (p[2] === 'create') {
        const e = needRg(); if (e) return e;
        if (!n || !A.get('--kind') || !A.get('--sku')) return fail('the following arguments are required: --name/-n, --kind, --sku', 2);
        if (s.cog[n]) return fail(`(CustomDomainInUse) The account name ${n} is already in use.`);
        s.cog[n] = { rg, kind: A.get('--kind'), sku: A.get('--sku'), location: A.get('--location', '-l') || s.groups[rg].location, dominio: A.get('--custom-domain') || null, deploys: {}, publico: true, identidad: !!A.flags['--assign-identity'] };
        save(); return out({ name: n, kind: A.get('--kind'), location: s.cog[n].location, sku: { name: A.get('--sku') }, properties: { endpoint: `https://${A.get('--custom-domain') || n}.cognitiveservices.azure.com/`, provisioningState: 'Succeeded', publicNetworkAccess: 'Enabled' }, id: `/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.CognitiveServices/accounts/${n}` });
      }
      if (p[2] === 'list') return out(Object.entries(s.cog).filter(([, c]) => !rg || c.rg === rg).map(([k, c]) => ({ name: k, kind: c.kind, location: c.location, resourceGroup: c.rg })));
      const c = s.cog[n];
      if (['show', 'update', 'keys', 'deployment', 'delete'].includes(p[2]) && !c) return fail(`(ResourceNotFound) The Resource 'Microsoft.CognitiveServices/accounts/${n}' under resource group '${rg}' was not found.`, 3);
      if (p[2] === 'show') return out({ name: n, kind: c.kind, location: c.location, properties: { endpoint: `https://${c.dominio || n}.cognitiveservices.azure.com/`, publicNetworkAccess: c.publico ? 'Enabled' : 'Disabled', disableLocalAuth: !!c.sinClaves } });
      if (p[2] === 'update') { if (A.get('--public-network-access')) c.publico = A.get('--public-network-access') === 'Enabled'; if (A.get('--disable-local-auth')) c.sinClaves = A.get('--disable-local-auth') === 'true'; save(); return out({ name: n, properties: { publicNetworkAccess: c.publico ? 'Enabled' : 'Disabled', disableLocalAuth: !!c.sinClaves } }); }
      if (p[2] === 'keys' && p[3] === 'list') { if (c.sinClaves) return fail('(BadRequest) Local authentication is disabled for this account. Use Microsoft Entra ID (identidad administrada) instead.'); return ok(out({ key1: uid(32), key2: uid(32) }).out + col.warn('\nAviso: con claves hay que guardarlas y rotarlas. Lo recomendado es Entra ID + identidad administrada y --disable-local-auth true.')); }
      if (p[2] === 'delete') { delete s.cog[n]; save(); return ok(''); }
      if (p[2] === 'deployment') {
        const dn = A.get('--deployment-name');
        if (p[3] === 'create') {
          if (!dn || !A.get('--model-name') || !A.get('--model-format')) return fail('the following arguments are required: --deployment-name, --model-name, --model-format, --model-version', 2);
          const sku = A.get('--sku-name') || 'Standard';
          const SKUS = ['Standard', 'GlobalStandard', 'DataZoneStandard', 'ProvisionedManaged', 'GlobalProvisionedManaged', 'DataZoneProvisionedManaged', 'GlobalBatch', 'DataZoneBatch', 'DeveloperTier'];
          if (!SKUS.includes(sku)) return fail(`(InvalidResourceProperties) The specified SKU '${sku}' for model '${A.get('--model-name')}' is not supported. Valores: ${SKUS.join(', ')}`);
          const cap = Number(A.get('--sku-capacity') || 1);
          c.deploys[dn] = { model: A.get('--model-name'), version: A.get('--model-version') || 'latest', sku, cap }; save();
          const unidad = /Provisioned/.test(sku) ? `${cap} PTU` : `${cap}K tokens por minuto`;
          return ok(out({ name: dn, properties: { model: { format: A.get('--model-format'), name: A.get('--model-name'), version: A.get('--model-version') || '' }, provisioningState: 'Succeeded' }, sku: { name: sku, capacity: cap } }).out + nota(`(${sku}: ${unidad}${/DataZone/.test(sku) ? '; el procesamiento queda dentro de la zona de datos' : /Global/.test(sku) ? '; puede procesarse en cualquier región' : ''})`));
        }
        if (p[3] === 'list') return out(Object.entries(c.deploys).map(([k, d]) => ({ name: k, properties: { model: { name: d.model, version: d.version } }, sku: { name: d.sku, capacity: d.cap } })));
        if (p[3] === 'show') { const d = c.deploys[dn]; if (!d) return fail(`(DeploymentNotFound) Deployment ${dn} not found.`); return out({ name: dn, properties: { model: { name: d.model, version: d.version }, rateLimits: [{ key: 'token', count: d.cap * 1000, renewalPeriod: 60 }] }, sku: { name: d.sku, capacity: d.cap } }); }
        if (p[3] === 'delete') { delete c.deploys[dn]; save(); return ok(''); }
      }
    }
    if (p[0] === 'ml') {
      const ws = A.get('--workspace-name', '-w');
      const W = s.aml;
      if (p[1] === 'workspace' && p[2] === 'create') { const e = needRg(); if (e) return e; const n = A.get('--name', '-n'); if (!n) return fail('the following arguments are required: --name/-n', 2); W[n] = { rg, computes: {}, jobs: {}, endpoints: {}, models: {} }; save(); return out({ name: n, location: s.groups[rg].location, resourceGroup: rg, mlflow_tracking_uri: `azureml://${s.groups[rg].location}.api.azureml.ms/mlflow/v1.0/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.MachineLearningServices/workspaces/${n}` }); }
      if (p[1] === 'workspace' && p[2] === 'list') return out(Object.entries(W).map(([n, w]) => ({ name: n, resourceGroup: w.rg })));
      // sin -w se usa el workspace por defecto (az configure --defaults workspace=…): aquí, el único o el último creado
      const w = W[ws || (s.defaults && s.defaults.workspace) || Object.keys(W).pop()];
      if (!w) return fail(`(ResourceNotFound) Workspace '${ws || '(falta --workspace-name/-w)'}' not found.`, 3);
      if (p[1] === 'compute' && p[2] === 'create') { const n = A.get('--name', '-n'); const min = Number(A.get('--min-instances') || 0); w.computes[n] = { tipo: A.get('--type') || 'amlcompute', size: A.get('--size') || 'Standard_DS3_v2', min, max: Number(A.get('--max-instances') || 4) }; save(); return ok(out({ name: n, type: A.get('--type') || 'amlcompute', size: w.computes[n].size, min_instances: min, max_instances: w.computes[n].max }).out + (min > 0 ? col.warn(`\nAviso: con --min-instances ${min} el clúster cobra aunque no haya jobs. Para entrenamiento, usa 0.`) : '')); }
      if (p[1] === 'compute' && p[2] === 'list') return out(Object.entries(w.computes).map(([n, c]) => ({ name: n, type: c.tipo, size: c.size, min_instances: c.min })));
      if (p[1] === 'job' && p[2] === 'create') {
        const f = A.get('--file', '-f'); const c = f && Sh.readFile(Sh.norm(f)); if (!f || c === null) return fail(`Error: el archivo ${f} no existe.`);
        const compute = (c.match(/^compute:\s*(?:azureml:)?(\S+)/m) || [])[1];
        if (compute && compute !== 'serverless' && !w.computes[compute]) return fail(`(UserError) Compute ${compute} not found in workspace ${ws}. Crea el cómputo con az ml compute create o usa compute: serverless.`);
        const nombre = 'job_' + uid(10);
        w.jobs[nombre] = { exp: (c.match(/^experiment_name:\s*(\S+)/m) || [])[1] || 'Default', tipo: (c.match(/^type:\s*(\S+)/m) || [])[1] || 'command', compute: compute || 'serverless', estado: 'Completed' }; save();
        return out({ name: nombre, experiment_name: w.jobs[nombre].exp, type: w.jobs[nombre].tipo, compute: w.jobs[nombre].compute, status: 'Completed', services: { Studio: { endpoint: `https://ml.azure.com/runs/${nombre}` } } });
      }
      if (p[1] === 'job' && p[2] === 'list') return out(Object.entries(w.jobs).map(([n, j]) => ({ name: n, experiment_name: j.exp, status: j.estado })));
      if (p[1] === 'model' && p[2] === 'create') { const n = A.get('--name', '-n'); const v = String(Object.keys(w.models).filter((k) => k.startsWith(n + ':')).length + 1); w.models[`${n}:${v}`] = { path: A.get('--path') }; save(); return out({ name: n, version: v, path: A.get('--path') }); }
      if (p[1] === 'model' && p[2] === 'list') return out(Object.keys(w.models).map((k) => ({ name: k.split(':')[0], version: k.split(':')[1] })));
      if (p[1] === 'online-endpoint' && p[2] === 'create') { const n = A.get('--name', '-n'); if (!n) return fail('the following arguments are required: --name/-n', 2); w.endpoints[n] = { deploys: {}, traffic: {}, mirror: {} }; save(); return out({ name: n, auth_mode: 'key', provisioning_state: 'Succeeded', scoring_uri: `https://${n}.${s.groups[w.rg].location}.inference.ml.azure.com/score` }); }
      if (p[1] === 'online-deployment' && p[2] === 'create') {
        const f = A.get('--file', '-f'); const c = f && Sh.readFile(Sh.norm(f)); if (!f || c === null) return fail(`Error: el archivo ${f} no existe.`);
        const ep = (c.match(/^endpoint_name:\s*(\S+)/m) || [])[1] || A.get('--endpoint-name'); const n = (c.match(/^name:\s*(\S+)/m) || [])[1];
        const e = w.endpoints[ep]; if (!e) return fail(`(UserError) Endpoint ${ep} not found. Crea el endpoint primero.`);
        e.deploys[n] = { instancia: (c.match(/^instance_type:\s*(\S+)/m) || [])[1] || 'Standard_DS3_v2' };
        if (A.flags['--all-traffic']) { for (const k of Object.keys(e.traffic)) e.traffic[k] = 0; e.traffic[n] = 100; } else e.traffic[n] = e.traffic[n] || 0;
        save(); return ok(out({ name: n, endpoint_name: ep, instance_type: e.deploys[n].instancia, provisioning_state: 'Succeeded' }).out + nota(`(tráfico: ${Object.entries(e.traffic).map(([k, v]) => `${k} ${v}%`).join(' · ')})`));
      }
      if (p[1] === 'online-endpoint' && p[2] === 'update') {
        const n = A.get('--name', '-n'); const e = w.endpoints[n]; if (!e) return fail(`(ResourceNotFound) Endpoint ${n} not found.`, 3);
        const antes = JSON.stringify([e.traffic, e.mirror]);
        const conv = (txt) => Object.fromEntries(String(txt).split(/\s+/).filter(Boolean).map((x) => x.split('=')).map(([k, v]) => [k, Number(v)]));
        if (A.get('--traffic')) { const t = conv(A.get('--traffic')); const tot = Object.values(t).reduce((x, y) => x + y, 0); if (tot !== 100) return fail(`(BadArgument) Traffic values must sum to 100 (suma ${tot}).`); for (const k of Object.keys(t)) if (!e.deploys[k]) return fail(`(BadArgument) Deployment ${k} does not exist in endpoint ${n}.`); e.traffic = t; }
        if (A.get('--mirror-traffic')) { const t = conv(A.get('--mirror-traffic')); for (const [k, v] of Object.entries(t)) { if (!e.deploys[k]) return fail(`(BadArgument) Deployment ${k} does not exist.`); if (v > 50) return fail('(BadArgument) Mirror traffic cannot exceed 50%.'); } e.mirror = t; }
        for (const [k, v] of Object.entries(e.mirror)) if (v > 0 && (e.traffic[k] || 0) > 0) { [e.traffic, e.mirror] = JSON.parse(antes); return fail(`(BadArgument) Deployment ${k} cannot receive both live traffic and mirror traffic. Quita el espejo con --mirror-traffic "${k}=0" antes de darle tráfico real.`); }
        save(); return out({ name: n, traffic: e.traffic, mirror_traffic: e.mirror });
      }
      if (p[1] === 'online-endpoint' && p[2] === 'invoke') {
        const n = A.get('--name', '-n'); const e = w.endpoints[n]; if (!e) return fail(`(ResourceNotFound) Endpoint ${n} not found.`, 3);
        if (!Object.values(e.traffic).some((v) => v > 0)) return fail('(BadRequest) No valid deployments to route to. Asigna tráfico con az ml online-endpoint update --traffic "blue=100".');
        const f = A.get('--request-file'); const c = f && Sh.readFile(Sh.norm(f)); if (!f || c === null) return fail(`Error: el archivo ${f} no existe.`);
        return ok(JSON.stringify([pseudo(c, 0.05, 0.95)]));
      }
      if (p[1] === 'online-endpoint' && p[2] === 'list') return out(Object.entries(w.endpoints).map(([n, e]) => ({ name: n, traffic: e.traffic })));
      if (p[1] === 'online-endpoint' && p[2] === 'delete') { delete w.endpoints[A.get('--name', '-n')]; save(); return ok(''); }
    }
    if (p[0] === 'search' && p[1] === 'service') {
      if (p[2] === 'create') { const e = needRg(); if (e) return e; const n = A.get('--name', '-n'); if (!n || !A.get('--sku')) return fail('the following arguments are required: --name/-n, --sku', 2); s.search[n] = { rg, sku: A.get('--sku'), semantico: A.get('--semantic-search') || 'disabled' }; save(); return out({ name: n, sku: { name: A.get('--sku') }, semanticSearch: s.search[n].semantico, replicaCount: 1, partitionCount: 1, status: 'running' }); }
      if (p[2] === 'list') return out(Object.entries(s.search).map(([n, x]) => ({ name: n, sku: { name: x.sku }, semanticSearch: x.semantico })));
    }
    return undefined;
  });

  // ================================================================== DATABRICKS
  extender('databricks', 'Databricks CLI simulada (auth, clusters, jobs, fs, secrets, workspace, bundle, pipelines, grants, serving-endpoints)', async (a, ctx, previo) => {
    const s = CS.dbx(); const A = args(a, ['--full-refresh']); const p = A.pos;
    if (!['pipelines', 'grants', 'serving-endpoints'].includes(p[0])) return undefined;
    if (!Object.keys(s.profiles).length && !(ctx.opts && ctx.opts.autoLogin)) return fail('Error: default auth: cannot configure default credentials. Run databricks auth login --host …');
    if (!Object.keys(s.profiles).length) s.profiles.DEFAULT = { host: 'https://adb-1234567890123456.7.azuredatabricks.net' };
    const out = (d) => output(d, A, 'json');
    s.pipelines = s.pipelines || {}; s.grants = s.grants || {}; s.serving = s.serving || { 'databricks-meta-llama-3-3-70b-instruct': { tipo: 'chat' }, 'databricks-gte-large-en': { tipo: 'embeddings' } };
    if (p[0] === 'pipelines') {
      if (p[1] === 'create') {
        const cfg = json(A.get('--json'), 'json'); if (!cfg || !cfg.name) return fail('Error: --json es obligatorio y debe incluir "name" (y "catalog", "schema", "libraries").');
        if (!cfg.catalog || !cfg.schema) return fail('Error: el pipeline necesita "catalog" y "schema" de destino en Unity Catalog.');
        const id = `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}`;
        s.pipelines[id] = { name: cfg.name, catalog: cfg.catalog, schema: cfg.schema, serverless: cfg.serverless !== false, continuous: !!cfg.continuous, libs: cfg.libraries || [], updates: [] }; save();
        return out({ pipeline_id: id });
      }
      if (p[1] === 'list-pipelines') return out(Object.entries(s.pipelines).map(([id, x]) => ({ pipeline_id: id, name: x.name, state: 'IDLE', latest_updates: x.updates.slice(-1) })));
      const x = s.pipelines[p[2]];
      if (['start-update', 'get', 'list-updates', 'delete'].includes(p[1]) && !x) return fail(`Error: Pipeline ${p[2] || '(falta PIPELINE_ID)'} does not exist.`);
      if (p[1] === 'start-update') { const u = { update_id: `${uid(8)}-${uid(4)}`, state: 'COMPLETED', full_refresh: !!A.flags['--full-refresh'], creation_time: now() }; x.updates.push(u); save(); return ok(out({ update_id: u.update_id }).out + nota(`(${u.full_refresh ? 'full refresh: recalcula todas las tablas desde cero' : 'actualización incremental: las streaming tables procesan solo lo nuevo'})`)); }
      if (p[1] === 'get') return out({ pipeline_id: p[2], name: x.name, state: 'IDLE', spec: { catalog: x.catalog, schema: x.schema, serverless: x.serverless, continuous: x.continuous, libraries: x.libs }, latest_updates: x.updates.slice(-3).reverse() });
      if (p[1] === 'list-updates') return out({ updates: x.updates.slice().reverse() });
      if (p[1] === 'delete') { delete s.pipelines[p[2]]; save(); return ok(''); }
    }
    if (p[0] === 'grants') {
      const [, accion, tipo, nombre] = p;
      if (!['get', 'update', 'get-effective'].includes(accion) || !tipo || !nombre) return fail('Usage: databricks grants get|update SECURABLE_TYPE FULL_NAME [--json …]  (SECURABLE_TYPE: catalog, schema, table, volume, function…)');
      const key = `${tipo.toLowerCase()}:${nombre}`;
      s.grants[key] = s.grants[key] || [];
      if (accion === 'update') {
        const cfg = json(A.get('--json'), 'json'); if (!cfg || !Array.isArray(cfg.changes)) return fail('Error: --json debe tener {"changes": [{"principal": "…", "add": ["SELECT"], "remove": []}]}');
        const VALIDOS = { catalog: ['USE CATALOG', 'USE_CATALOG', 'CREATE SCHEMA', 'CREATE_SCHEMA', 'ALL PRIVILEGES', 'ALL_PRIVILEGES', 'BROWSE', 'SELECT', 'MODIFY'], schema: ['USE SCHEMA', 'USE_SCHEMA', 'CREATE TABLE', 'CREATE_TABLE', 'SELECT', 'MODIFY', 'ALL PRIVILEGES', 'ALL_PRIVILEGES', 'EXECUTE'], table: ['SELECT', 'MODIFY', 'ALL PRIVILEGES', 'ALL_PRIVILEGES'] };
        for (const ch of cfg.changes) {
          for (const pr of ch.add || []) if (VALIDOS[tipo.toLowerCase()] && !VALIDOS[tipo.toLowerCase()].includes(String(pr).toUpperCase())) return fail(`Error: Privilege ${pr} is not applicable to this entity [${nombre}:${tipo.toUpperCase()}].`);
          let g = s.grants[key].find((x) => x.principal === ch.principal);
          if (!g) { g = { principal: ch.principal, privileges: [] }; s.grants[key].push(g); }
          g.privileges = [...new Set([...g.privileges, ...(ch.add || []).map((x) => String(x).toUpperCase().replace(/ /g, '_'))])].filter((x) => !(ch.remove || []).map((r) => String(r).toUpperCase().replace(/ /g, '_')).includes(x));
        }
        s.grants[key] = s.grants[key].filter((g) => g.privileges.length); save();
      }
      return out({ privilege_assignments: s.grants[key] });
    }
    if (p[0] === 'serving-endpoints') {
      if (p[1] === 'list') return out(Object.entries(s.serving).map(([n, x]) => ({ name: n, state: { ready: 'READY' }, task: x.tipo === 'chat' ? 'llm/v1/chat' : 'llm/v1/embeddings' })));
      if (p[1] === 'query') {
        const x = s.serving[p[2]]; if (!x) return fail(`Error: Endpoint with name '${p[2]}' does not exist.`);
        const body = json(A.get('--json'), 'json') || {};
        if (x.tipo === 'embeddings') return out({ data: [{ embedding: Array.from({ length: 6 }, (_, i) => pseudo(JSON.stringify(body) + i, -0.1, 0.1, 4)), index: 0 }], usage: { prompt_tokens: tokens(JSON.stringify(body)) } });
        const msgs = body.messages || []; if (!msgs.length) return fail('Error: el cuerpo debe tener "messages": [{"role": "user", "content": "…"}]');
        const txt = msgs[msgs.length - 1].content || '';
        const rc = recortar(generar(txt), body.max_tokens);
        return out({ choices: [{ index: 0, message: { role: 'assistant', content: rc.texto }, finish_reason: rc.stop === 'max_tokens' ? 'length' : 'stop' }], usage: { prompt_tokens: tokens(JSON.stringify(msgs)), completion_tokens: tokens(rc.texto) } });
      }
    }
    return undefined;
  });

  // ================================================================== archivos de los laboratorios guiados
  const LABS = {
    rag: {
      'labs/rag/politicas/devoluciones.md': '# Política de devoluciones\n\nEl cliente puede devolver un producto dentro de los 30 días corridos desde la entrega. El producto debe estar sin uso y en su caja original.\n\nLos productos electrónicos con el código SKU-ELEC-10 tienen 10 días de devolución, no 30.\n\nEl reembolso se acredita en el mismo medio de pago dentro de los 10 días hábiles posteriores a la recepción del producto.\n',
      'labs/rag/politicas/devoluciones.md.metadata.json': '{"metadataAttributes": {"pais": "AR", "area": "postventa"}}\n',
      'labs/rag/politicas/envios.md': '# Política de envíos\n\nLos envíos a todo el país demoran entre 3 y 5 días hábiles. El envío es gratis en compras mayores a 50.000 pesos.\n\nLos envíos express llegan en 24 horas a las ciudades principales y cuestan 4.500 pesos.\n\nSi el paquete llega dañado, el cliente debe reportarlo dentro de las 48 horas con una foto del embalaje.\n',
      'labs/rag/politicas/envios.md.metadata.json': '{"metadataAttributes": {"pais": "AR", "area": "logistica"}}\n',
      'labs/rag/politicas/garantias-mx.md': '# Garantías en México\n\nTodos los productos tienen 12 meses de garantía del fabricante. Para hacerla válida se necesita la factura y el número de serie.\n\nLa garantía no cubre golpes, humedad ni reparaciones hechas por terceros.\n',
      'labs/rag/politicas/garantias-mx.md.metadata.json': '{"metadataAttributes": {"pais": "MX", "area": "postventa"}}\n',
      'labs/rag/lote.jsonl': ['El paquete llegó roto y nadie responde', 'Quiero saber cuándo llega mi pedido', 'Me cobraron dos veces la misma compra', 'Excelente atención, gracias', 'El producto no es el que pedí'].map((t, i) => JSON.stringify({ recordId: 'R' + (i + 1), modelInput: { messages: [{ role: 'user', content: [{ text: 'Clasifica este mensaje de cliente: ' + t }] }], inferenceConfig: { maxTokens: 50 } } })).join('\n') + '\n',
    },
    azureml: {
      'labs/azureml/blue.yml': 'name: blue\nendpoint_name: riesgo-credito\nmodel: azureml:riesgo:1\ninstance_type: Standard_DS3_v2\ninstance_count: 1\n',
      'labs/azureml/green.yml': 'name: green\nendpoint_name: riesgo-credito\nmodel: azureml:riesgo:2\ninstance_type: Standard_DS3_v2\ninstance_count: 1\n',
      'labs/azureml/job.yml': '$schema: https://azuremlschemas.azureedge.net/latest/commandJob.schema.json\ntype: command\nexperiment_name: riesgo-credito\ncompute: azureml:cpu\nenvironment: azureml://registries/azureml/environments/sklearn-1.5/labels/latest\ncode: ./src\ncommand: python train.py --datos ${{inputs.datos}}\ninputs:\n  datos:\n    type: uri_folder\n    path: azureml:creditos:1\n',
      'labs/azureml/solicitud.json': '{"input_data": {"columns": ["ingreso", "deuda", "antiguedad"], "data": [[85000, 12000, 6]]}}\n',
    },
    gcp: {
      'labs/gcp/workflow.yaml': 'main:\n  steps:\n    - cargar:\n        call: http.post\n        args:\n          url: https://carga-ventas.run.app/cargar\n    - transformar:\n        call: googleapis.bigquery.v2.jobs.query\n        args:\n          projectId: academia-datos-dev\n          body:\n            query: CALL ventas.refrescar_resumen()\n    - fin:\n        return: "ok"\n',
      'labs/gcp/instancias.json': '{"instances": [{"pais": "Argentina", "segmento": "Corporativo"}, {"pais": "México", "segmento": "Pyme"}]}\n',
    },
  };
  def('lab-preparar', 'Crea los archivos de un laboratorio guiado (rag, azureml, gcp)', (a) => {
    const n = a[0];
    if (!LABS[n]) return fail(`Uso: lab-preparar ${Object.keys(LABS).join('|')}`);
    for (const [ruta, contenido] of Object.entries(LABS[n])) Sh.writeFile(Sh.HOME + '/' + ruta, contenido);
    save();
    return ok(`Archivos del laboratorio "${n}" listos:\n` + Object.keys(LABS[n]).map((r) => '  ~/' + r).join('\n'));
  });

  // ================================================================== autocompletado de subcomandos
  // Tab completa servicios y operaciones de las CLIs (aws bed<Tab> → bedrock…). Lo usa terminal.js.
  Sh.Subcomandos = {
    aws: {
      s3: ['ls', 'mb', 'rb', 'cp', 'mv', 'rm', 'sync', 'presign'], s3api: ['list-buckets', 'list-objects-v2', 'put-bucket-versioning', 'put-public-access-block', 'put-bucket-lifecycle-configuration'],
      sts: ['get-caller-identity'], iam: ['list-roles', 'create-role', 'attach-role-policy'], configure: ['list', 'set', 'sso'],
      glue: ['create-database', 'get-databases', 'create-crawler', 'start-crawler', 'get-crawler', 'get-tables', 'create-job', 'start-job-run', 'get-job', 'get-jobs', 'get-job-runs', 'list-jobs', 'create-data-quality-ruleset', 'list-data-quality-rulesets', 'start-data-quality-ruleset-evaluation-run', 'get-data-quality-ruleset-evaluation-run', 'get-data-quality-result', 'list-data-quality-results'],
      athena: ['start-query-execution', 'get-query-execution', 'get-query-results', 'create-work-group', 'list-work-groups', 'get-work-group'],
      emr: ['create-cluster', 'list-clusters', 'terminate-clusters', 'add-steps'], kinesis: ['create-stream', 'list-streams', 'put-record', 'describe-stream-summary'],
      firehose: ['create-delivery-stream', 'list-delivery-streams', 'put-record'], lambda: ['list-functions', 'invoke', 'create-function'],
      stepfunctions: ['list-state-machines', 'start-execution', 'create-state-machine'], events: ['put-rule', 'put-targets', 'list-rules'],
      'redshift-data': ['execute-statement', 'describe-statement', 'get-statement-result'], lakeformation: ['grant-permissions', 'list-permissions'], logs: ['tail'], cloudformation: ['deploy'], mwaa: ['list-environments'],
      bedrock: ['list-foundation-models', 'get-foundation-model', 'list-inference-profiles', 'create-guardrail', 'create-guardrail-version', 'list-guardrails', 'delete-guardrail', 'create-model-invocation-job', 'get-model-invocation-job', 'list-model-invocation-jobs'],
      'bedrock-runtime': ['converse', 'invoke-model', 'apply-guardrail'],
      'bedrock-agent': ['create-knowledge-base', 'list-knowledge-bases', 'create-data-source', 'list-data-sources', 'start-ingestion-job', 'get-ingestion-job', 'delete-knowledge-base'],
      'bedrock-agent-runtime': ['retrieve', 'retrieve-and-generate'],
      sagemaker: ['create-training-job', 'describe-training-job', 'list-training-jobs', 'create-model', 'create-endpoint-config', 'create-endpoint', 'update-endpoint', 'describe-endpoint', 'list-endpoints', 'delete-endpoint', 'delete-endpoint-config', 'delete-model'],
      'sagemaker-runtime': ['invoke-endpoint'],
      dynamodb: ['create-table', 'list-tables', 'describe-table', 'delete-table', 'put-item', 'get-item', 'query', 'scan', 'update-time-to-live'],
      secretsmanager: ['create-secret', 'get-secret-value', 'rotate-secret', 'describe-secret', 'list-secrets', 'delete-secret'],
      kms: ['create-key', 'create-alias', 'list-aliases', 'list-keys', 'enable-key-rotation', 'get-key-rotation-status'],
      sqs: ['create-queue', 'list-queues', 'send-message', 'receive-message', 'delete-message'], sns: ['create-topic', 'subscribe', 'publish', 'list-topics'],
      s3tables: ['create-table-bucket', 'list-table-buckets', 'create-namespace', 'create-table', 'list-tables'], cloudwatch: ['put-metric-alarm', 'describe-alarms'],
      help: [],
    },
    gcloud: {
      auth: ['login', 'list', 'revoke', 'application-default'], config: ['set', 'list', 'get-value'], projects: ['list', 'add-iam-policy-binding'], services: ['enable', 'list'],
      storage: ['buckets', 'ls', 'cp', 'mv', 'rm', 'cat', 'du', 'rsync'], pubsub: { topics: ['create', 'list', 'publish'], subscriptions: ['create', 'list', 'pull'] },
      dataproc: { clusters: ['create', 'list', 'delete'], jobs: ['submit'], batches: ['submit'] }, composer: { environments: ['list', 'run', 'storage'] }, dataflow: { jobs: ['list', 'run'], 'flex-template': ['run'] },
      iam: { 'service-accounts': ['create'] },
      ai: { models: ['upload', 'list'], endpoints: ['create', 'list', 'deploy-model', 'undeploy-model', 'predict', 'delete'], 'custom-jobs': ['create', 'describe', 'list'] },
      scheduler: { jobs: ['create', 'list', 'run', 'delete'] }, workflows: ['deploy', 'run', 'list'], datastream: { 'connection-profiles': ['create'], streams: ['create', 'update', 'list'] }, kms: { keyrings: ['create'], keys: ['create', 'list'] },
    },
    bq: ['mk', 'ls', 'show', 'load', 'query', 'rm'],
    az: {
      login: [], logout: [], account: ['show', 'list', 'set'], group: ['create', 'list', 'show', 'delete'], storage: ['account', 'container', 'blob', 'fs'], keyvault: ['create', 'secret', 'list'], role: ['assignment'], ad: ['sp', 'signed-in-user'],
      databricks: ['workspace'], datafactory: ['create', 'list', 'pipeline'], eventhubs: ['namespace', 'eventhub'], deployment: ['group'], extension: ['add', 'list'], config: ['set'],
      cognitiveservices: { account: ['create', 'list', 'show', 'update', 'delete', 'keys', 'deployment'] },
      ml: { workspace: ['create', 'list'], compute: ['create', 'list'], job: ['create', 'list'], model: ['create', 'list'], 'online-endpoint': ['create', 'update', 'invoke', 'list', 'delete'], 'online-deployment': ['create'] },
      search: { service: ['create', 'list'] },
    },
    databricks: {
      auth: ['login', 'profiles', 'env', 'token'], configure: [], 'current-user': ['me'], clusters: ['list', 'get', 'create', 'start', 'delete', 'permanent-delete', 'restart', 'spark-versions'],
      jobs: ['list', 'get', 'create', 'run-now', 'list-runs', 'get-run', 'cancel-run', 'repair-run', 'delete'], fs: ['ls', 'cp', 'cat', 'mkdir', 'rm'], secrets: ['create-scope', 'list-scopes', 'put-secret', 'list-secrets', 'get-secret', 'delete-secret', 'put-acl'],
      workspace: ['list', 'import', 'export', 'mkdirs', 'delete', 'import-dir'], bundle: ['init', 'validate', 'deploy', 'run', 'summary', 'destroy'],
      catalogs: ['list', 'get', 'create'], schemas: ['list', 'create'], tables: ['list', 'get'], warehouses: ['list'], repos: ['list', 'create'],
      pipelines: ['create', 'list-pipelines', 'get', 'start-update', 'list-updates', 'delete'], grants: ['get', 'update', 'get-effective'], 'serving-endpoints': ['list', 'query'],
    },
  };
})();
