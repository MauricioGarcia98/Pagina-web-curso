/* Consola de AWS de práctica — los servicios que completan el pipeline de datos, según la documentación pública de AWS:
 *   - AWS Glue Studio (visual ETL): fuente S3 o Data Catalog, transformaciones (ApplyMapping, Filter, DropDuplicates,
 *     Aggregate), destino S3 particionado, actualización del Data Catalog y job bookmarks. El job lee y escribe de verdad
 *     los archivos del bucket, cobra DPU-hora y deja sus logs en CloudWatch.
 *   - Lambda: código Python que corre de verdad (Pyodide), Deploy, eventos de prueba, disparador de S3, variables de
 *     entorno, memoria y timeout; boto3 de práctica para s3.get_object / put_object y glue.start_job_run.
 *   - Step Functions: máquinas de estados en ASL (Task de Glue .sync, Lambda, Athena y SNS; Choice, Wait, Pass, Fail,
 *     Succeed; Retry y Catch), con historial de eventos y grafo de la ejecución.
 *   - CloudWatch: log groups y streams, Logs Insights, métricas y alarmas con SNS.
 *   - Billing: costo por servicio con los precios públicos (aprox.) y presupuestos con alertas.
 * El estado es el mismo de la CLI `aws` (CloudSim.aws()), así que lo que haces en la terminal aparece aquí y al revés.
 * Nada de esto toca una cuenta real ni usa credenciales.
 */
(function () {
  'use strict';
  const CS = () => window.CloudSim;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ahora = () => new Date().toISOString();
  const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  const guid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
  const guardar = () => { try { CS().save(); } catch (e) { /* sin terminal */ } };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const s3path = (u) => { const m = String(u || '').match(/^s3:\/\/([^/]+)\/?(.*)$/); return m ? { b: m[1], k: m[2] } : null; };
  const avisar = []; const cambio = () => avisar.forEach((f) => { try { f(); } catch (e) { /* vista cerrada */ } });

  function S() {
    const s = CS().aws();
    s.logs = s.logs || {}; s.alarmas = s.alarmas || []; s.uso = s.uso || []; s.presupuestos = s.presupuestos || []; s.metricas = s.metricas || [];
    s.sns = s.sns || {}; if (!s.sns['alertas-datos']) s.sns['alertas-datos'] = { subs: [], mensajes: [] }; s.sfn = s.sfn || {}; s.lambdas = s.lambdas || {}; s.glueJobs = s.glueJobs || {};
    return s;
  }
  const region = () => S().region || 'us-east-1';
  const cuenta = () => S().account || '123456789012';
  const arn = (svc, res) => `arn:aws:${svc}:${region()}:${cuenta()}:${res}`;

  // ------------------------------------------------------------------ CloudWatch: logs, métricas, uso
  function log(grupo, stream, msg, t) {
    const s = S(); const g = (s.logs[grupo] = s.logs[grupo] || { creado: ahora(), retencion: null, streams: {} });
    const st = (g.streams[stream] = g.streams[stream] || []); st.push({ t: t || ahora(), m: String(msg) }); if (st.length > 400) st.splice(0, st.length - 400);
  }
  function metrica(ns, m, dims, v) { const s = S(); s.metricas.push({ ns, m, d: dims, t: ahora(), v }); if (s.metricas.length > 3000) s.metricas.splice(0, s.metricas.length - 3000); }
  function usar(servicio, tipo, cantidad, unidad, costo, detalle) { const s = S(); s.uso.push({ t: ahora(), servicio, tipo, cantidad, unidad, costo, detalle }); if (s.uso.length > 3000) s.uso.splice(0, s.uso.length - 3000); }
  function notificarSns(topico, asunto, mensaje) {
    const s = S(); const nombre = String(topico).split(':').pop(); const T = s.sns[nombre];
    if (!T) return false;
    T.mensajes = T.mensajes || []; T.mensajes.unshift({ t: ahora(), asunto, mensaje }); T.mensajes = T.mensajes.slice(0, 50);
    usar('Amazon SNS', 'Notifications', 1, 'Request', 0.0000005, nombre);
    T.msgs = (T.msgs || 0) + 1; const dest = (T.subs || []).map((x) => x.endpoint || x.ep).join(', ');
    try { const t = (window.AwsConsola && window.AwsConsola._i) ? window.AwsConsola._i.toast : null; if (t) t(`SNS ${nombre}: ${asunto}${dest ? ` → ${dest} (simulado)` : ' (el tópico no tiene suscripciones)'}`); } catch (e) { /* sin consola */ }
    return true;
  }

  // ------------------------------------------------------------------ CSV
  function partirLinea(l) { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; }
  function leerCsv(t) { const ls = String(t || '').replace(/\r/g, '').split('\n').filter((x) => x.trim() !== ''); if (!ls.length) return { cols: [], filas: [] }; const cols = partirLinea(ls[0]).map((c) => c.trim()); return { cols, filas: ls.slice(1).map((l) => { const v = partirLinea(l); return cols.map((_, i) => (v[i] === undefined || v[i] === '' ? null : v[i])); }) }; }
  const celda = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const aCsv = (cols, filas) => [cols.join(','), ...filas.map((f) => f.map(celda).join(','))].join('\n') + '\n';
  function archivosDe(ruta) { const p = s3path(ruta); if (!p) return { error: `Invalid S3 path: ${ruta}` }; const b = S().buckets[p.b]; if (!b) return { error: `NoSuchBucket: The specified bucket does not exist (${p.b})` }; const pref = p.k; return { archivos: Object.keys(b.objects).filter((k) => k.startsWith(pref) && /\.(csv|txt)$/i.test(k)).sort().map((k) => ({ key: k, c: (b.objects[k] || {}).c || '' })), p }; }
  function escribirObjeto(bucket, key, c) { const b = S().buckets[bucket]; if (!b) throw new Error(`NoSuchBucket: The specified bucket does not exist (${bucket})`); b.objects[key] = { c, m: ahora() }; }

  // ================================================================== AWS Glue: jobs visuales
  const PRECIO_DPU_H = 0.44;
  const TIPOS_GLUE = ['string', 'int', 'bigint', 'double', 'date', 'boolean'];
  function castear(v, t) {
    if (v == null) return null; const x = String(v).trim();
    if (t === 'int' || t === 'bigint') return /^-?\d+$/.test(x) ? Number(x) : (/^-?\d+\.\d+$/.test(x) ? Math.trunc(Number(x)) : null);
    if (t === 'double') return x !== '' && !isNaN(Number(x)) ? Number(x) : null;
    if (t === 'date') return /^\d{4}-\d{2}-\d{2}/.test(x) ? x.slice(0, 10) : null;
    if (t === 'boolean') return /^(true|1|yes)$/i.test(x) ? true : /^(false|0|no)$/i.test(x) ? false : null;
    return x;
  }
  const noResuelve = (c, cols) => new Error(`AnalysisException: cannot resolve '${c}' given input columns: [${cols.join(', ')}]`);
  function aplicarPaso(p, cols, filas) {
    const ix = (c) => { const i = cols.indexOf(c); if (i < 0) throw noResuelve(c, cols); return i; };
    if (p.tipo === 'mapping') { const m = p.campos.filter((x) => x[0]); const is = m.map(([src]) => ix(src)); return [m.map((x) => x[1] || x[0]), filas.map((f) => m.map((x, k) => castear(f[is[k]], x[2] || 'string')))]; }
    if (p.tipo === 'filtro') {
      const i = ix(p.col); const val = p.val; const num = val !== '' && !isNaN(Number(val));
      const ok = (v) => { if (p.op === 'is null') return v == null; if (p.op === 'is not null') return v != null; if (v == null) return false; const a = num && !isNaN(Number(v)) ? Number(v) : String(v); const b = num && !isNaN(Number(v)) ? Number(val) : String(val); return p.op === '==' ? a === b : p.op === '!=' ? a !== b : p.op === '>' ? a > b : p.op === '<' ? a < b : p.op === '>=' ? a >= b : p.op === '<=' ? a <= b : p.op === 'contains' ? String(v).includes(val) : true; };
      return [cols, filas.filter((f) => ok(f[i]))];
    }
    if (p.tipo === 'dedup') { const ks = (p.claves || []).filter(Boolean); const is = ks.length ? ks.map(ix) : cols.map((_, i) => i); const vistos = new Set(); return [cols, filas.filter((f) => { const k = JSON.stringify(is.map((i) => f[i])); if (vistos.has(k)) return false; vistos.add(k); return true; })]; }
    if (p.tipo === 'agregar') {
      const por = (p.por || []).filter(Boolean); const ip = por.map(ix); const ag = (p.aggs || []).filter((a) => a[0]); const ia = ag.map((a) => (a[0] === 'count' && (!a[1] || a[1] === '*') ? -1 : ix(a[1])));
      const g = new Map(); for (const f of filas) { const k = JSON.stringify(ip.map((i) => f[i])); if (!g.has(k)) g.set(k, { claves: ip.map((i) => f[i]), filas: [] }); g.get(k).filas.push(f); }
      const calc = (fn, i, fs) => { const vs = i < 0 ? fs.map(() => 1) : fs.map((f) => f[i]).filter((v) => v != null).map(Number).filter((v) => !isNaN(v)); if (fn === 'count') return i < 0 ? fs.length : fs.filter((f) => f[i] != null).length; if (!vs.length) return null; if (fn === 'sum') return Math.round(vs.reduce((a, b) => a + b, 0) * 100) / 100; if (fn === 'avg') return Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 100) / 100; if (fn === 'min') return Math.min(...vs); if (fn === 'max') return Math.max(...vs); return null; };
      return [[...por, ...ag.map((a) => a[2] || `${a[0]}_${a[1] || 'all'}`)], [...g.values()].map((x) => [...x.claves, ...ag.map((a, k) => calc(a[0], ia[k], x.filas))])];
    }
    return [cols, filas];
  }
  const NOMBRE_PASO = { mapping: 'Change Schema (ApplyMapping)', filtro: 'Filter', dedup: 'Drop Duplicates', agregar: 'Aggregate' };
  function scriptGlue(nombre, D) {
    if (!D) return `# Job de script: el código vive en S3 (ScriptLocation). Ábrelo en Glue Studio → Script.`;
    const L = ['import sys', 'from awsglue.transforms import *', 'from awsglue.utils import getResolvedOptions', 'from pyspark.context import SparkContext', 'from awsglue.context import GlueContext', 'from awsglue.job import Job', '', "args = getResolvedOptions(sys.argv, ['JOB_NAME'])", 'sc = SparkContext()', 'glueContext = GlueContext(sc)', 'spark = glueContext.spark_session', 'job = Job(glueContext)', "job.init(args['JOB_NAME'], args)", ''];
    L.push(D.fuente.tipo === 'catalogo' ? `fuente = glueContext.create_dynamic_frame.from_catalog(database="${D.fuente.db}", table_name="${D.fuente.tabla}", transformation_ctx="fuente")` : `fuente = glueContext.create_dynamic_frame.from_options(format_options={"withHeader": True, "separator": ","}, connection_type="s3", format="csv", connection_options={"paths": ["${D.fuente.ruta}"], "recurse": True}, transformation_ctx="fuente")`);
    let prev = 'fuente';
    D.pasos.forEach((p, i) => { const n = `paso${i + 1}`; if (p.tipo === 'mapping') L.push(`${n} = ApplyMapping.apply(frame=${prev}, mappings=[${p.campos.filter((x) => x[0]).map(([a, b, t]) => `("${a}", "string", "${b || a}", "${t || 'string'}")`).join(', ')}], transformation_ctx="${n}")`); else if (p.tipo === 'filtro') L.push(`${n} = Filter.apply(frame=${prev}, f=lambda row: ${p.op === 'is null' ? `row["${p.col}"] is None` : p.op === 'is not null' ? `row["${p.col}"] is not None` : p.op === 'contains' ? `"${p.val}" in str(row["${p.col}"])` : `row["${p.col}"] ${p.op} ${isNaN(Number(p.val)) || p.val === '' ? `"${p.val}"` : p.val}`}, transformation_ctx="${n}")`); else if (p.tipo === 'dedup') L.push(`${n} = DynamicFrame.fromDF(${prev}.toDF().dropDuplicates(${(p.claves || []).length ? JSON.stringify(p.claves) : ''}), glueContext, "${n}")`); else if (p.tipo === 'agregar') L.push(`${n} = DynamicFrame.fromDF(${prev}.toDF().groupBy(${(p.por || []).map((x) => `"${x}"`).join(', ')}).agg(${(p.aggs || []).map((a) => `F.${a[0]}("${a[1] || '*'}").alias("${a[2] || a[0]}")`).join(', ')}), glueContext, "${n}")`); prev = n; });
    const d = D.destino; L.push('');
    if (d.catalogo) L.push(`destino = glueContext.getSink(path="${d.ruta}", connection_type="s3", updateBehavior="UPDATE_IN_DATABASE", partitionKeys=${JSON.stringify(d.particiones || [])}, enableUpdateCatalog=True, transformation_ctx="destino")`, `destino.setCatalogInfo(catalogDatabase="${d.catalogo.db}", catalogTableName="${d.catalogo.tabla}")`, 'destino.setFormat("csv")', `destino.writeFrame(${prev})`);
    else L.push(`glueContext.write_dynamic_frame.from_options(frame=${prev}, connection_type="s3", format="csv", connection_options={"path": "${d.ruta}", "partitionKeys": ${JSON.stringify(d.particiones || [])}}, transformation_ctx="destino")`);
    L.push('job.commit()  # guarda el bookmark: la próxima corrida solo lee archivos nuevos');
    return L.join('\n');
  }
  async function correrGlue(nombre, { args = {}, origen = 'console' } = {}) {
    const s = S(); const j = s.glueJobs[nombre]; if (!j) throw new Error(`EntityNotFoundException: Failed to start job run due to missing metadata (job ${nombre} not found)`);
    j.runs = j.runs || [];
    if (j.runs.some((r) => r.estado === 'RUNNING') && (j.concurrencia || 1) <= 1) { const e = new Error(`ConcurrentRunsExceededException: Concurrent runs exceeded for ${nombre}`); e.code = 'ConcurrentRunsExceededException'; throw e; }
    const run = { id: 'jr_' + hex(64), estado: 'RUNNING', inicio: ahora(), args, origen, leidas: null, escritas: null };
    j.runs.push(run); if (j.runs.length > 60) j.runs.splice(0, j.runs.length - 60); guardar(); cambio();
    const lg = (m) => log('/aws-glue/jobs/output', run.id, m); const le = (m) => log('/aws-glue/jobs/error', run.id, m);
    const w = j.workers || 10, tw = j.tipoWorker || 'G.1X';
    lg(`INFO GlueContext: Glue ${j.version || '4.0'} (Spark 3.3) · ${w} x ${tw} workers · job run ${run.id}`);
    if (Object.keys(args || {}).length) lg(`INFO Arguments: ${JSON.stringify(args)}`);
    await espera(700);
    try {
      if (!j.def) {
        lg(`INFO Running script ${j.script || `s3://aws-glue-assets-${cuenta()}-${region()}/scripts/${nombre}.py`}`); lg('INFO Script finished'); run.seg = 87;
      } else {
        const D = j.def; let ruta = D.fuente.ruta;
        { const dp0 = s3path(D.destino.ruta); if (!dp0) throw new Error(`Invalid target path: ${D.destino.ruta}`); if (!s.buckets[dp0.b]) throw new Error(`NoSuchBucket: The specified bucket does not exist (${dp0.b})`); } // el destino se valida al preparar el sink
        if (D.fuente.tipo === 'catalogo') { const db = s.glueDbs[D.fuente.db]; if (!db) throw new Error(`EntityNotFoundException: Database ${D.fuente.db} not found.`); const t = db.tables[D.fuente.tabla]; if (!t) throw new Error(`EntityNotFoundException: Table ${D.fuente.tabla} not found.`); ruta = t.location; }
        const A = archivosDe(ruta); if (A.error) throw new Error(A.error);
        let archivos = A.archivos;
        if (D.bookmark) { const ya = new Set(j.procesados || []); const antes = archivos.length; archivos = archivos.filter((a) => !ya.has(a.key)); lg(`INFO Job bookmark: ${antes - archivos.length} file(s) already processed, ${archivos.length} new`); }
        else if (!archivos.length) throw new Error(`AnalysisException: Path does not exist or contains no files: ${ruta}`);
        let cols = null, filas = [];
        if (!archivos.length) { lg('INFO No new data to process (job bookmark): 0 records'); run.leidas = 0; run.escritas = 0; run.archivos = 0; run.seg = 32; run.estado = 'SUCCEEDED'; lg('INFO Job run succeeded'); throw { fin: true }; }
        for (const a of archivos) {
          const t = leerCsv(a.c); const resto = a.key.slice(A.p.k.length); const parts = resto.split('/').slice(0, -1).filter((x) => /=/.test(x)).map((x) => x.split('='));
          const cs = [...t.cols, ...parts.map((x) => x[0]).filter((c) => !t.cols.includes(c))];
          if (!cols) cols = cs; else if (cs.join() !== cols.join()) { const falt = cs.filter((c) => !cols.includes(c)); falt.forEach((c) => { cols.push(c); filas.forEach((f) => f.push(null)); }); }
          for (const f of t.filas) { const o = Object.fromEntries(t.cols.map((c, i) => [c, f[i]])); parts.forEach(([k, v]) => { if (!(k in o)) o[k] = v; }); filas.push(cols.map((c) => (c in o ? o[c] : null))); }
        }
        cols = cols || [];
        lg(`INFO Read ${filas.length} records from ${archivos.length} file(s) under ${ruta}`); run.leidas = filas.length;
        for (const p of D.pasos) { [cols, filas] = aplicarPaso(p, cols, filas); lg(`INFO ${NOMBRE_PASO[p.tipo]}: ${filas.length} records`); }
        const d = D.destino; const dp = s3path(d.ruta); if (!dp) throw new Error(`Invalid target path: ${d.ruta}`); if (!s.buckets[dp.b]) throw new Error(`NoSuchBucket: The specified bucket does not exist (${dp.b})`);
        const pk = (d.particiones || []).filter(Boolean); pk.forEach((c) => { if (!cols.includes(c)) throw noResuelve(c, cols); });
        const grupos = new Map(); const ip = pk.map((c) => cols.indexOf(c)); const resto = cols.filter((c) => !pk.includes(c)); const ir = resto.map((c) => cols.indexOf(c));
        for (const f of filas) { const k = pk.map((c, i) => `${c}=${f[ip[i]] == null ? '__HIVE_DEFAULT_PARTITION__' : f[ip[i]]}`).join('/'); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(ir.map((i) => f[i])); }
        const pref = dp.k.replace(/\/?$/, '/').replace(/^\//, ''); let n = 0;
        if (filas.length) for (const [k, fs] of grupos) { const key = `${pref === '/' ? '' : pref}${k ? k + '/' : ''}run-${Date.now()}-part-r-00000-${run.id.slice(3, 11)}.csv`; escribirObjeto(dp.b, key, aCsv(resto, fs)); n++; }
        lg(`INFO Wrote ${filas.length} records in ${n} file(s) to ${d.ruta}${pk.length ? ` partitioned by ${pk.join(', ')}` : ''}`);
        if (d.catalogo) {
          const db = s.glueDbs[d.catalogo.db]; if (!db) throw new Error(`EntityNotFoundException: Database ${d.catalogo.db} not found. (créala en Glue → Databases)`);
          const prev = db.tables[d.catalogo.tabla]; db.tables[d.catalogo.tabla] = { ...(prev || {}), location: `s3://${dp.b}/${pref}`, columns: resto.map((c) => ({ Name: c, Type: 'string' })), partitions: pk, format: 'csv', actualizada: ahora() };
          lg(`INFO Data Catalog: ${prev ? 'updated' : 'created'} table ${d.catalogo.db}.${d.catalogo.tabla}${pk.length ? ' and added partitions' : ''}`);
        }
        if (D.bookmark) j.procesados = [...new Set([...(j.procesados || []), ...archivos.map((a) => a.key)])];
        run.escritas = filas.length; run.archivos = n; run.seg = 40 + Math.ceil(filas.length / 1500) * 3;
      }
      run.estado = 'SUCCEEDED'; lg('INFO Job run succeeded');
    } catch (e) {
      if (e && e.fin) { /* terminó sin datos nuevos */ } else {
      run.estado = 'FAILED'; run.error = String(e.message || e); run.seg = run.seg || 34; le(`ERROR ${run.error}`); lg(`ERROR Job run failed: ${run.error.split('\n')[0]}`);
      }
    }
    run.fin = ahora(); run.dpuHoras = Math.round(((w * (tw === 'G.2X' ? 2 : 1) * Math.max(60, run.seg)) / 3600) * 10000) / 10000;
    usar('AWS Glue', 'ETL job (DPU-Hour)', run.dpuHoras, 'DPU-Hour', run.dpuHoras * PRECIO_DPU_H, nombre);
    metrica('Glue', 'glue.driver.aggregate.recordsRead', { JobName: nombre }, run.leidas || 0);
    metrica('Glue', 'glue.driver.aggregate.numFailedTasks', { JobName: nombre }, run.estado === 'FAILED' ? 1 : 0);
    guardar(); cambio(); evaluarAlarmas();
    return run;
  }

  // ================================================================== Lambda
  const CODIGO_LAMBDA = `import json
import logging
import urllib.parse
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)
s3 = boto3.client("s3")

def lambda_handler(event, context):
    # Un evento de S3 trae el bucket y la clave (key) del archivo que llegó
    registro = event["Records"][0]["s3"]
    bucket = registro["bucket"]["name"]
    clave = urllib.parse.unquote_plus(registro["object"]["key"])
    logger.info("Llegó s3://%s/%s", bucket, clave)

    cuerpo = s3.get_object(Bucket=bucket, Key=clave)["Body"].read().decode("utf-8")
    filas = [l for l in cuerpo.splitlines() if l.strip()]
    logger.info("%d filas de datos", len(filas) - 1)
    return {"statusCode": 200, "body": json.dumps({"archivo": clave, "filas": len(filas) - 1})}
`;
  function lam(n) { const f = S().lambdas[n]; if (!f) return null; if (f.codigo == null) f.codigo = CODIGO_LAMBDA; if (!f.handler || f.handler === 'app.handler' && f.codigo === CODIGO_LAMBDA) f.handler = 'lambda_function.lambda_handler'; f.runtime = f.runtime || 'python3.12'; f.memoria = f.memoria || 128; f.timeout = f.timeout || 3; f.triggers = f.triggers || []; f.env = f.env || {}; f.invocaciones = f.invocaciones || []; f.eventos = f.eventos || {}; f.modificada = f.modificada || ahora(); return f; }
  function eventoS3(bucket, key, size) { return { Records: [{ eventVersion: '2.1', eventSource: 'aws:s3', awsRegion: region(), eventTime: ahora(), eventName: 'ObjectCreated:Put', userIdentity: { principalId: 'AWS:AIDAEXAMPLE' }, s3: { s3SchemaVersion: '1.0', configurationId: 'disparador-s3', bucket: { name: bucket, arn: `arn:aws:s3:::${bucket}` }, object: { key: encodeURIComponent(key).replace(/%2F/g, '/').replace(/%20/g, '+'), size: size || 0, eTag: hex(32) } } }] }; }
  let calientes = false; // la primera invocación de la sesión es un "cold start" (Init Duration)
  async function invocarLambda(n, evento, { origen = 'console', profundidad = 0 } = {}) {
    const f = lam(n); if (!f) { const e = new Error(`ResourceNotFoundException: Function not found: ${arn('lambda', 'function:' + n)}`); e.code = 'ResourceNotFoundException'; throw e; }
    const req = guid(); const d = new Date(); const stream = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/[$LATEST]${hex(32)}`; const g = `/aws/lambda/${n}`;
    const L = (m) => log(g, stream, m);
    if (!calientes) L(`INIT_START Runtime Version: ${f.runtime}.v${18 + (f.runtime === 'python3.13' ? 4 : 0)}`); L(`START RequestId: ${req} Version: $LATEST`);
    const [mod, fn] = String(f.handler || '').split('.');
    const datos = {}; for (const [bn, b] of Object.entries(S().buckets)) { datos[bn] = {}; let tot = 0; for (const [k, o] of Object.entries(b.objects)) { const c = (o && o.c) || ''; if (tot + c.length > 300000) break; datos[bn][k] = c; tot += c.length; } }
    const py = `import json, sys, os, types, logging, time
_EVENTO = json.loads(${JSON.stringify(JSON.stringify(evento))})
_S3 = json.loads(${JSON.stringify(JSON.stringify(datos))})
_EFECTOS = []
os.environ.update(json.loads(${JSON.stringify(JSON.stringify({ AWS_REGION: region(), AWS_LAMBDA_FUNCTION_NAME: n, AWS_LAMBDA_FUNCTION_MEMORY_SIZE: String(f.memoria), ...f.env }))}))
class ClientError(Exception): pass
class _Body:
    def __init__(self, c): self._c = c
    def read(self): return self._c.encode("utf-8")
class _S3Client:
    def get_object(self, Bucket, Key, **kw):
        if Bucket not in _S3: raise ClientError("An error occurred (NoSuchBucket) when calling the GetObject operation: The specified bucket does not exist")
        if Key not in _S3[Bucket]: raise ClientError("An error occurred (NoSuchKey) when calling the GetObject operation: The specified key does not exist.")
        return {"Body": _Body(_S3[Bucket][Key]), "ContentLength": len(_S3[Bucket][Key])}
    def put_object(self, Bucket, Key, Body, **kw):
        if Bucket not in _S3: raise ClientError("An error occurred (NoSuchBucket) when calling the PutObject operation: The specified bucket does not exist")
        if isinstance(Body, bytes): Body = Body.decode("utf-8")
        _S3[Bucket][Key] = str(Body); _EFECTOS.append({"s3put": [Bucket, Key, str(Body)]}); return {"ETag": '"0"'}
    def list_objects_v2(self, Bucket, Prefix="", **kw):
        if Bucket not in _S3: raise ClientError("An error occurred (NoSuchBucket) when calling the ListObjectsV2 operation: The specified bucket does not exist")
        ks = [k for k in sorted(_S3[Bucket]) if k.startswith(Prefix)]
        return {"KeyCount": len(ks), "Contents": [{"Key": k, "Size": len(_S3[Bucket][k])} for k in ks]}
class _GlueClient:
    def start_job_run(self, JobName, Arguments=None, **kw):
        _EFECTOS.append({"glue": [JobName, Arguments or {}]}); return {"JobRunId": "jr_(se asigna al terminar la función)"}
def _client(nombre, **kw):
    if nombre == "s3": return _S3Client()
    if nombre == "glue": return _GlueClient()
    raise ClientError(f"En la práctica, boto3 solo simula los clientes 's3' y 'glue' (pediste '{nombre}').")
boto3 = types.ModuleType("boto3"); boto3.client = _client; sys.modules["boto3"] = boto3
_be = types.ModuleType("botocore"); _bex = types.ModuleType("botocore.exceptions"); _bex.ClientError = ClientError; sys.modules["botocore"] = _be; sys.modules["botocore.exceptions"] = _bex
for _h in list(logging.root.handlers): logging.root.removeHandler(_h)
_hd = logging.StreamHandler(sys.stdout); _hd.setFormatter(logging.Formatter("[%(levelname)s]\\t%(asctime)s\\t${req}\\t%(message)s")); logging.root.addHandler(_hd)
class _Ctx:
    function_name = ${JSON.stringify(n)}; memory_limit_in_mb = ${f.memoria}; aws_request_id = "${req}"; invoked_function_arn = "${arn('lambda', 'function:' + n)}"
    log_group_name = "${g}"; log_stream_name = "${stream}"
    def get_remaining_time_in_millis(self): return ${f.timeout * 1000}
_codigo = ${JSON.stringify(f.codigo)}
_m = types.ModuleType(${JSON.stringify(mod || 'lambda_function')})
try:
    exec(compile(_codigo, ${JSON.stringify((mod || 'lambda_function') + '.py')}, "exec"), _m.__dict__)
    sys.modules[${JSON.stringify(mod || 'lambda_function')}] = _m
    _f = getattr(_m, ${JSON.stringify(fn || 'lambda_handler')}, None)
    if _f is None: raise Exception("Runtime.HandlerNotFound: Handler '${String(fn || '').replace(/[^\w]/g, '')}' missing on module '${String(mod || '').replace(/[^\w]/g, '')}'")
    _r = _f(_EVENTO, _Ctx())
    print("\\n__LAMBDA_OK__" + json.dumps({"r": _r, "e": _EFECTOS}, default=str))
except Exception as _x:
    import traceback
    print("\\n__LAMBDA_ERR__" + json.dumps({"errorMessage": str(_x), "errorType": type(_x).__name__, "stackTrace": traceback.format_exc().splitlines()[-4:], "e": _EFECTOS}))
`;
    const frio = !calientes; const t0 = performance.now();
    const R = window.Engines && window.Engines.PY ? await window.Engines.PY.run('python', py) : { ok: false, error: 'El intérprete de Python no está disponible.' };
    const total = Math.round(performance.now() - t0); calientes = true;
    const salida = String(R.stdout || ''); const iOk = salida.lastIndexOf('__LAMBDA_OK__'), iErr = salida.lastIndexOf('__LAMBDA_ERR__');
    const prints = salida.slice(0, Math.max(iOk, iErr) >= 0 ? Math.max(iOk, iErr) : salida.length).split('\n').filter((x) => x.trim());
    prints.forEach(L);
    let res = null, err = null, efectos = [];
    if (iOk >= 0) { const o = JSON.parse(salida.slice(iOk + 13).trim().split('\n')[0]); res = o.r; efectos = o.e || []; }
    else if (iErr >= 0) { const o = JSON.parse(salida.slice(iErr + 14).trim().split('\n')[0]); err = { errorMessage: o.errorMessage, errorType: o.errorType, requestId: req, stackTrace: o.stackTrace }; efectos = o.e || []; L(`[ERROR] ${o.errorType}: ${o.errorMessage}\nTraceback (most recent call last):\n${(o.stackTrace || []).join('\n')}`); }
    else err = { errorMessage: String(R.error || 'Error desconocido').split('\n').slice(-1)[0], errorType: 'Runtime.Unknown', requestId: req };
    const dur = Math.max(1, Math.min(total, 1500) - (frio ? Math.min(total - 1, 1200) : 0)); const fac = Math.ceil(dur);
    const init = frio ? Math.max(180, Math.min(total, 1200)) : 0;
    if (dur > f.timeout * 1000) { err = { errorMessage: `${req} Task timed out after ${f.timeout.toFixed(2)} seconds`, errorType: 'Sandbox.Timedout', requestId: req }; }
    L(`END RequestId: ${req}`);
    L(`REPORT RequestId: ${req}\tDuration: ${dur.toFixed(2)} ms\tBilled Duration: ${fac} ms\tMemory Size: ${f.memoria} MB\tMax Memory Used: ${Math.min(f.memoria, 38 + Math.round(JSON.stringify(datos).length / 50000))} MB${init ? `\tInit Duration: ${init.toFixed(2)} ms` : ''}`);
    // efectos de boto3: se aplican al terminar (escrituras en S3 y jobs de Glue)
    if (!err) for (const e of efectos) {
      if (e.s3put) { try { escribirObjeto(e.s3put[0], e.s3put[1], e.s3put[2]); dispararS3(e.s3put[0], e.s3put[1], profundidad + 1, n); } catch (x) { L(`[ERROR] ${x.message}`); } }
      if (e.glue) correrGlue(e.glue[0], { args: e.glue[1], origen: `lambda:${n}` }).catch((x) => L(`[ERROR] glue.start_job_run: ${x.message}`));
    }
    f.invocaciones.unshift({ t: ahora(), req, ok: !err, ms: dur, origen, error: err ? `${err.errorType}: ${err.errorMessage}` : null }); f.invocaciones = f.invocaciones.slice(0, 30);
    usar('AWS Lambda', 'Requests', 1, 'Request', 0.0000002, n); usar('AWS Lambda', 'Duration (GB-second)', (f.memoria / 1024) * (fac / 1000), 'GB-Second', (f.memoria / 1024) * (fac / 1000) * 0.0000166667, n);
    metrica('AWS/Lambda', 'Invocations', { FunctionName: n }, 1); metrica('AWS/Lambda', 'Errors', { FunctionName: n }, err ? 1 : 0); metrica('AWS/Lambda', 'Duration', { FunctionName: n }, dur);
    guardar(); cambio(); evaluarAlarmas();
    return { ok: !err, resultado: res, error: err, req, ms: dur, init, stream, grupo: g };
  }
  // un objeto nuevo en S3 dispara las funciones suscriptas (lo llaman la CLI, la consola y las propias funciones)
  function dispararS3(bucket, key, profundidad = 0, desde = null) {
    const s = S(); let n = 0;
    for (const [nombre, f0] of Object.entries(s.lambdas)) {
      const f = lam(nombre);
      for (const t of f.triggers) {
        if (t.bucket !== bucket || !t.activo || !key.startsWith(t.prefijo || '') || !key.endsWith(t.sufijo || '')) continue;
        if (profundidad >= 4) { log(`/aws/lambda/${nombre}`, 'recursive-loop-detection', `Lambda detectó un bucle recursivo: ${desde || 'una función'} escribe en el mismo bucket y prefijo que la dispara (s3://${bucket}/${t.prefijo || ''}). Se detuvieron las invocaciones. Escribe la salida en otro prefijo o en otro bucket.`); continue; }
        n++; const size = ((s.buckets[bucket] || { objects: {} }).objects[key] || { c: '' }).c.length;
        invocarLambda(nombre, eventoS3(bucket, key, size), { origen: `s3://${bucket}/${key}`, profundidad }).catch(() => {});
        void f0;
      }
    }
    return n;
  }

  // ================================================================== Step Functions
  const DEF_PIPELINE = (job = 'etl-ventas-silver') => JSON.stringify({
    Comment: 'Pipeline diario: corre el ETL de Glue, avisa si falla y confirma al terminar',
    StartAt: 'Ejecutar ETL',
    States: {
      'Ejecutar ETL': { Type: 'Task', Resource: 'arn:aws:states:::glue:startJobRun.sync', Parameters: { JobName: job, Arguments: { '--fecha.$': '$.fecha' } }, ResultPath: '$.glue', Retry: [{ ErrorEquals: ['Glue.ConcurrentRunsExceededException'], IntervalSeconds: 2, MaxAttempts: 2, BackoffRate: 2 }], Catch: [{ ErrorEquals: ['States.ALL'], ResultPath: '$.error', Next: 'Avisar fallo' }], Next: 'Avisar exito' },
      'Avisar exito': { Type: 'Task', Resource: 'arn:aws:states:::sns:publish', Parameters: { TopicArn: `arn:aws:sns:us-east-1:123456789012:alertas-datos`, 'Message.$': "States.Format('ETL del {} terminado', $.fecha)" }, End: true },
      'Avisar fallo': { Type: 'Task', Resource: 'arn:aws:states:::sns:publish', Parameters: { TopicArn: `arn:aws:sns:us-east-1:123456789012:alertas-datos`, 'Message.$': '$.error.Cause' }, Next: 'Fallo' },
      Fallo: { Type: 'Fail', Error: 'PipelineFallido', Cause: 'El ETL de Glue falló: revisa el log del job en CloudWatch' },
    },
  }, null, 2);
  function sm(n) { const m = S().sfn[n]; if (!m) return null; m.definicion = m.definicion || DEF_PIPELINE(); m.rol = m.rol || `arn:aws:iam::${cuenta()}:role/StepFunctions-${n}-role`; m.ejecuciones = m.ejecuciones || []; m.tipo = m.tipo || 'STANDARD'; m.logs = m.logs || 'OFF'; m.creada = m.creada || ahora(); return m; }
  function ruta$(obj, p) { if (p === '$' || p == null) return obj; const partes = String(p).replace(/^\$\.?/, '').split(/\.|\[(\d+)\]/).filter((x) => x !== undefined && x !== ''); let o = obj; for (const k of partes) { if (o == null) return undefined; o = o[k]; } return o; }
  function fijar$(obj, p, v) { if (p === null) return obj; if (p === undefined || p === '$') return v; const partes = String(p).replace(/^\$\.?/, '').split('.'); const out = JSON.parse(JSON.stringify(obj || {})); let o = out; partes.slice(0, -1).forEach((k) => { o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {}; o = o[k]; }); o[partes[partes.length - 1]] = v; return out; }
  function intrinseca(expr, entrada, ctx) {
    if (String(expr).startsWith('$$.')) return ruta$(ctx || {}, '$.' + String(expr).slice(3)); // el objeto de contexto: $$.Map.Item.Value, $$.Map.Item.Index, $$.Execution.Id
    const m = /^States\.Format\('((?:[^']|\\')*)'\s*((?:,\s*[^,)]+)*)\)$/.exec(expr.trim());
    if (m) { const args = m[2].split(',').map((x) => x.trim()).filter(Boolean).map((a) => (a.startsWith('$') ? ruta$(entrada, a) : a.replace(/^'|'$/g, ''))); let i = 0; return m[1].replace(/\{\}/g, () => String(args[i++] ?? '')); }
    if (/^States\.JsonToString\((.+)\)$/.test(expr)) return JSON.stringify(ruta$(entrada, RegExp.$1));
    return ruta$(entrada, expr);
  }
  function parametros(P, entrada, ctx) { if (P == null) return entrada; if (Array.isArray(P)) return P.map((x) => parametros(x, entrada, ctx)); if (typeof P !== 'object') return P; const out = {}; for (const [k, v] of Object.entries(P)) { if (k.endsWith('.$')) out[k.slice(0, -2)] = intrinseca(String(v), entrada, ctx); else out[k] = parametros(v, entrada, ctx); } return out; }
  function cumple(c, e) {
    if (c.And) return c.And.every((x) => cumple(x, e)); if (c.Or) return c.Or.some((x) => cumple(x, e)); if (c.Not) return !cumple(c.Not, e);
    const v = ruta$(e, c.Variable);
    if ('IsPresent' in c) return (v !== undefined) === c.IsPresent; if ('IsNull' in c) return (v === null) === c.IsNull;
    if ('StringEquals' in c) return v === c.StringEquals; if ('StringMatches' in c) return new RegExp('^' + String(c.StringMatches).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(String(v));
    if ('NumericEquals' in c) return Number(v) === c.NumericEquals; if ('NumericGreaterThan' in c) return Number(v) > c.NumericGreaterThan; if ('NumericGreaterThanEquals' in c) return Number(v) >= c.NumericGreaterThanEquals; if ('NumericLessThan' in c) return Number(v) < c.NumericLessThan; if ('NumericLessThanEquals' in c) return Number(v) <= c.NumericLessThanEquals;
    if ('BooleanEquals' in c) return v === c.BooleanEquals;
    return false;
  }
  class ErrorEstado extends Error { constructor(error, cause) { super(cause); this.error = error; this.cause = cause; } }
  async function tarea(st, entrada, ev) {
    const P = parametros(st.Parameters, entrada); const R = String(st.Resource || '');
    if (/:::glue:startJobRun/.test(R)) {
      let run; try { run = await correrGlue(P.JobName, { args: P.Arguments || {}, origen: 'stepfunctions' }); } catch (e) { throw new ErrorEstado(e.code ? `Glue.${e.code}` : 'Glue.EntityNotFoundException', e.message); }
      if (!/\.sync$/.test(R)) return { JobRunId: run.id };
      while (run.estado === 'RUNNING') await espera(300);
      if (run.estado !== 'SUCCEEDED') throw new ErrorEstado('States.TaskFailed', JSON.stringify({ JobName: P.JobName, Id: run.id, JobRunState: run.estado, ErrorMessage: run.error }));
      return { JobName: P.JobName, Id: run.id, JobRunState: run.estado, ExecutionTime: run.seg, DPUSeconds: Math.round(run.dpuHoras * 3600) };
    }
    if (/:::lambda:invoke|:lambda:.*:function:/.test(R)) {
      const fn = String(P.FunctionName || R).split(':function:').pop().split(':')[0];
      let r; try { r = await invocarLambda(fn, P.Payload !== undefined ? P.Payload : entrada, { origen: 'stepfunctions' }); } catch (e) { throw new ErrorEstado('Lambda.ResourceNotFoundException', e.message); }
      if (!r.ok) throw new ErrorEstado(r.error.errorType || 'Lambda.Unknown', JSON.stringify(r.error));
      return /:::lambda:invoke/.test(R) ? { StatusCode: 200, Payload: r.resultado, ExecutedVersion: '$LATEST' } : r.resultado;
    }
    if (/:::athena:startQueryExecution/.test(R)) {
      const q = P.QueryString; if (!q) throw new ErrorEstado('States.Runtime', 'Athena: falta QueryString');
      const a = await window.Shell.Commands.aws(['athena', 'start-query-execution', '--query-string', q, '--work-group', P.WorkGroup || 'primary', '--output', 'json'], { opts: { autoLogin: true } });
      if (a.code) throw new ErrorEstado('Athena.InvalidRequestException', String(a.out).replace(/\u0001[^\u0002]*\u0002|\u0003/g, ''));
      const id = JSON.parse(String(a.out).replace(/\u0001[^\u0002]*\u0002|\u0003/g, '')).QueryExecutionId; const x = S().athena[id];
      if (x.state !== 'SUCCEEDED') throw new ErrorEstado('States.TaskFailed', JSON.stringify({ QueryExecutionId: id, Status: { State: 'FAILED', StateChangeReason: x.reason } }));
      return { QueryExecution: { QueryExecutionId: id, Status: { State: 'SUCCEEDED' } } };
    }
    if (/:::sns:publish/.test(R)) { if (!notificarSns(P.TopicArn || '', P.Subject || 'AWS Notification', P.Message)) throw new ErrorEstado('SNS.NotFoundException', `Topic does not exist: ${P.TopicArn}`); return { MessageId: guid() }; }
    throw new ErrorEstado('States.Runtime', `En la práctica, Step Functions integra Glue (startJobRun[.sync]), Lambda (invoke), Athena (startQueryExecution.sync) y SNS (publish). Recurso no soportado: ${R}`);
  }
  // corre una máquina de estados (la principal, el ItemProcessor de un Map o una rama de un Parallel) y devuelve su salida
  async function maquina(D, entrada, X) {
    const { ej, ev } = X; let actual = D.StartAt, dato = entrada;
    const coincide = (lista, E) => (lista || []).find((x) => (x.ErrorEquals || []).some((k) => k === E.error || (k === 'States.ALL' && E.error !== 'States.Runtime') || (k === 'States.TaskFailed' && E.error !== 'States.Timeout' && !/^States\.(Runtime|NoChoiceMatched)$/.test(E.error))));
    try {
      for (;;) {
        if (++X.cuenta.n > 400) throw new ErrorEstado('States.Runtime', 'Demasiadas transiciones (¿un bucle sin salida?)');
        const st = D.States && D.States[actual]; if (!st) throw new ErrorEstado('States.Runtime', `State '${actual}' not found`);
        ej.transiciones++; ej.estados[actual] = 'RUNNING'; ev(`${st.Type}StateEntered`, { estado: actual }); cambio();
        const entradaEf = st.InputPath === null ? {} : ruta$(dato, st.InputPath || '$');
        let siguiente = st.Next || null, salida = entradaEf;
        if (st.Type === 'Pass') salida = fijar$(dato, st.ResultPath, st.Result !== undefined ? st.Result : parametros(st.Parameters, entradaEf, X.ctx));
        else if (st.Type === 'Wait') { const seg = st.Seconds || (st.SecondsPath ? ruta$(dato, st.SecondsPath) : 1); ev('WaitStateStarted', { estado: actual, seconds: seg }); await espera(Math.min(1500, seg * 100)); }
        else if (st.Type === 'Choice') { const c = (st.Choices || []).find((x) => cumple(x, entradaEf)); siguiente = c ? c.Next : st.Default; if (!siguiente) throw new ErrorEstado('States.NoChoiceMatched', `No Choice matched and no Default specified in state '${actual}'`); }
        else if (st.Type === 'Succeed') siguiente = null;
        else if (st.Type === 'Fail') throw new ErrorEstado(st.Error || 'States.Fail', st.Cause || '');
        else if (st.Type === 'Task' || st.Type === 'Map' || st.Type === 'Parallel') {
          let intento = 0; let r; let capturado = false;
          for (;;) {
            try {
              if (st.Type === 'Task') { ev('TaskScheduled', { estado: actual, resource: st.Resource }); ev('TaskStarted', { estado: actual }); r = await tarea(st, entradaEf, ev); ev('TaskSucceeded', { estado: actual, output: JSON.stringify(r).slice(0, 2000) }); }
              else if (st.Type === 'Map') r = await mapa(st, actual, entradaEf, X);
              else r = await paralelo(st, actual, entradaEf, X);
              break;
            } catch (e) {
              const E = e instanceof ErrorEstado ? e : new ErrorEstado('States.TaskFailed', e.message);
              ev(st.Type === 'Task' ? 'TaskFailed' : `${st.Type}StateFailed`, { estado: actual, error: E.error, cause: String(E.cause).slice(0, 2000) });
              const re = coincide(st.Retry, E);
              if (re && intento < (re.MaxAttempts ?? 3)) { intento++; await espera(Math.min(1500, (re.IntervalSeconds || 1) * Math.pow(re.BackoffRate || 2, intento - 1) * 150)); continue; }
              const ca = coincide(st.Catch, E);
              if (ca) { ej.estados[actual] = 'CAUGHT'; ev(`${st.Type}StateExited`, { estado: actual }); dato = fijar$(dato, ca.ResultPath === undefined ? '$' : ca.ResultPath, { Error: E.error, Cause: E.cause }); actual = ca.Next; capturado = true; break; }
              throw E;
            }
          }
          if (capturado) continue;
          const sel = st.ResultSelector ? parametros(st.ResultSelector, r, X.ctx) : r;
          salida = fijar$(dato, st.ResultPath === undefined ? '$' : st.ResultPath, sel);
        } else throw new ErrorEstado('States.Runtime', `El estado '${actual}' tiene un Type que no existe: ${st.Type} (Task, Pass, Choice, Wait, Succeed, Fail, Map o Parallel).`);
        if (st.Type === 'Choice' || st.Type === 'Wait' || st.Type === 'Succeed') salida = entradaEf;
        dato = st.OutputPath ? ruta$(salida, st.OutputPath) : salida;
        ej.estados[actual] = 'SUCCEEDED'; ev(`${st.Type}StateExited`, { estado: actual, output: JSON.stringify(dato).slice(0, 2000) });
        if (st.End || st.Type === 'Succeed') return dato;
        if (!siguiente) throw new ErrorEstado('States.Runtime', `El estado '${actual}' no tiene Next ni End.`);
        actual = siguiente;
      }
    } catch (e) { if (actual && ej.estados[actual] === 'RUNNING') ej.estados[actual] = 'FAILED'; throw e; }
  }
  // Map: corre el ItemProcessor (o el Iterator de las definiciones viejas) una vez por elemento de ItemsPath
  async function mapa(st, nombre, entrada, X) {
    const sub = st.ItemProcessor || st.Iterator; if (!sub || !sub.StartAt) throw new ErrorEstado('States.Runtime', `El Map '${nombre}' necesita ItemProcessor con StartAt y States.`);
    const items = ruta$(entrada, st.ItemsPath || '$'); if (!Array.isArray(items)) throw new ErrorEstado('States.Runtime', `Map '${nombre}': ItemsPath (${st.ItemsPath || '$'}) no apunta a una lista.`);
    const sel = st.ItemSelector || st.Parameters; const tolerado = Number(st.ToleratedFailurePercentage || 0);
    X.ev('MapStateStarted', { estado: nombre, length: items.length }); const out = []; let fallas = 0;
    for (let i = 0; i < items.length; i++) {
      const ctx = { ...X.ctx, Map: { Item: { Value: items[i], Index: i } } };
      const ent = sel ? parametros(sel, entrada, ctx) : items[i];
      X.ev('MapIterationStarted', { estado: nombre, index: i });
      try { out.push(await maquina(sub, ent, { ...X, ctx })); X.ev('MapIterationSucceeded', { estado: nombre, index: i }); }
      catch (e) {
        fallas++; X.ev('MapIterationFailed', { estado: nombre, index: i, error: e.error || 'States.TaskFailed' });
        if (!tolerado || (fallas * 100) / items.length > tolerado) throw new ErrorEstado(e.error || 'States.TaskFailed', `Falló la iteración ${i} del Map '${nombre}': ${e.cause || e.message}`);
        out.push(null);
      }
    }
    X.ev('MapStateSucceeded', { estado: nombre }); return out;
  }
  // Parallel: cada rama de Branches recibe la misma entrada; la salida es la lista de salidas, en el orden de las ramas
  async function paralelo(st, nombre, entrada, X) {
    if (!Array.isArray(st.Branches) || !st.Branches.length) throw new ErrorEstado('States.Runtime', `El Parallel '${nombre}' necesita Branches: [{ StartAt, States }, …].`);
    X.ev('ParallelStateStarted', { estado: nombre, branches: st.Branches.length });
    const out = await Promise.all(st.Branches.map((b) => maquina(b, entrada, X)));
    X.ev('ParallelStateSucceeded', { estado: nombre }); return out;
  }
  async function ejecutarSfn(nombre, entrada = {}, { nombreEj = null } = {}) {
    const m = sm(nombre); if (!m) { const e = new Error(`StateMachineDoesNotExist: State Machine Does Not Exist: '${arn('states', 'stateMachine:' + nombre)}'`); e.code = 'StateMachineDoesNotExist'; throw e; }
    let D; try { D = JSON.parse(m.definicion); } catch (e) { throw new Error(`InvalidDefinition: ${e.message}`); }
    const ej = { id: nombreEj || guid(), estado: 'RUNNING', inicio: ahora(), fin: null, input: entrada, output: null, eventos: [], estados: {}, transiciones: 0 };
    m.ejecuciones.unshift(ej); m.ejecuciones = m.ejecuciones.slice(0, 40); guardar(); cambio();
    const ev = (tipo, detalle = {}) => { ej.eventos.push({ id: ej.eventos.length + 1, t: ahora(), tipo, ...detalle }); if (m.logs === 'ALL' || (m.logs === 'ERROR' && /Failed|Aborted/.test(tipo))) log(`/aws/vendedlogs/states/${nombre}-Logs`, `states/${nombre}/${ej.id.slice(0, 8)}`, JSON.stringify({ type: tipo, execution_arn: arn('states', `execution:${nombre}:${ej.id}`), ...detalle })); };
    ev('ExecutionStarted', { input: JSON.stringify(entrada) }); metrica('AWS/States', 'ExecutionsStarted', { StateMachineArn: nombre }, 1);
    const t0 = Date.now(); let dato;
    const ctxEj = { Execution: { Id: arn('states', `execution:${nombre}:${ej.id}`), Name: ej.id, StartTime: ej.inicio, Input: entrada }, StateMachine: { Name: nombre } };
    try {
      dato = await maquina(D, entrada, { ej, ev, ctx: ctxEj, cuenta: { n: 0 } });
      ej.estado = 'SUCCEEDED'; ej.output = dato; ev('ExecutionSucceeded', { output: JSON.stringify(dato).slice(0, 2000) }); metrica('AWS/States', 'ExecutionsSucceeded', { StateMachineArn: nombre }, 1);
    } catch (e) {
      const E = e instanceof ErrorEstado ? e : new ErrorEstado('States.Runtime', e.message);
      ej.estado = 'FAILED'; ej.error = E.error; ej.causa = E.cause; ev('ExecutionFailed', { error: E.error, cause: String(E.cause).slice(0, 2000) }); metrica('AWS/States', 'ExecutionsFailed', { StateMachineArn: nombre }, 1);
    }
    ej.fin = ahora(); metrica('AWS/States', 'ExecutionTime', { StateMachineArn: nombre }, Date.now() - t0);
    usar('AWS Step Functions', 'State transitions', ej.transiciones, 'Transition', ej.transiciones * 0.000025, nombre);
    guardar(); cambio(); evaluarAlarmas();
    return ej;
  }

  // ================================================================== CloudWatch: métricas, alarmas y Logs Insights
  const ESTADISTICA = { Sum: (v) => v.reduce((a, b) => a + b, 0), Average: (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0), Maximum: (v) => Math.max(...v), Minimum: (v) => Math.min(...v), SampleCount: (v) => v.length };
  const COMP = { GreaterThanThreshold: ['>', (a, b) => a > b], GreaterThanOrEqualToThreshold: ['>=', (a, b) => a >= b], LessThanThreshold: ['<', (a, b) => a < b], LessThanOrEqualToThreshold: ['<=', (a, b) => a <= b] };
  const puntos = (ns, m, dims, desde) => S().metricas.filter((p) => p.ns === ns && p.m === m && Object.entries(dims || {}).every(([k, v]) => p.d && p.d[k] === v) && new Date(p.t).getTime() >= desde);
  function evaluarAlarmas() {
    const s = S(); let hubo = false;
    for (const a of s.alarmas) {
      const ps = puntos(a.ns, a.metrica, a.dims, Date.now() - a.periodo * 60000).map((p) => p.v);
      let nuevo; if (!ps.length) nuevo = a.faltantes === 'breaching' ? 'ALARM' : a.faltantes === 'notBreaching' ? 'OK' : a.faltantes === 'ignore' ? a.estado || 'INSUFFICIENT_DATA' : 'INSUFFICIENT_DATA';
      else { a.valor = Math.round(ESTADISTICA[a.estadistica](ps) * 100) / 100; nuevo = COMP[a.comparacion][1](a.valor, a.umbral) ? 'ALARM' : 'OK'; }
      if (nuevo !== a.estado) {
        a.historial = a.historial || []; a.historial.unshift({ t: ahora(), de: a.estado || 'INSUFFICIENT_DATA', a: nuevo, valor: a.valor }); a.historial = a.historial.slice(0, 30);
        if (nuevo === 'ALARM' && a.sns) notificarSns(a.sns, `ALARM: "${a.nombre}" in ${region()}`, `Threshold Crossed: ${a.estadistica} ${a.metrica} = ${a.valor} ${COMP[a.comparacion][0]} ${a.umbral}`);
        a.estado = nuevo; hubo = true;
      }
    }
    if (hubo) guardar();
  }
  // Logs Insights: fields, filter, parse, stats … by, sort, limit (lo que más se usa)
  function insights(grupos, consulta, desde) {
    const s = S(); let filas = [];
    for (const g of grupos) for (const [st, evs] of Object.entries((s.logs[g] || { streams: {} }).streams)) for (const e of evs) if (new Date(e.t).getTime() >= desde) filas.push({ '@timestamp': e.t, '@message': e.m, '@logStream': st, '@log': `${cuenta()}:${g}` });
    filas.sort((a, b) => b['@timestamp'].localeCompare(a['@timestamp']));
    let campos = ['@timestamp', '@message'], limite = 1000;
    const val = (f, x) => { x = x.trim(); if (/^["']/.test(x)) return x.slice(1, -1); if (!isNaN(Number(x))) return Number(x); return f[x]; };
    for (const cmd of consulta.split('|').map((x) => x.trim()).filter(Boolean)) {
      const m = /^(\w+)\s*([\s\S]*)$/.exec(cmd); const op = m[1].toLowerCase(), r = m[2].trim();
      if (op === 'fields') campos = r.split(',').map((x) => x.trim());
      else if (op === 'filter') {
        const lr = /^(@?\w+)\s+(not\s+)?like\s+\/(.*)\/(i?)$/i.exec(r); const lt = lr ? null : /^(@?\w+)\s+(not\s+)?like\s+["'](.*)["']$/i.exec(r); const like = lr || lt;
        if (like) { const re = lr ? new RegExp(lr[3], lr[4] || '') : null; filas = filas.filter((f) => { const ok = re ? re.test(String(f[like[1]] ?? '')) : String(f[like[1]] ?? '').includes(like[3]); return like[2] ? !ok : ok; }); }
        else { const c = /^(@?\w+)\s*(=|!=|>=|<=|>|<)\s*(.+)$/.exec(r); if (!c) throw new Error(`filter: no entiendo "${r}". Ejemplos: filter @message like /ERROR/ · filter duracion > 100`); filas = filas.filter((f) => { const a = val(f, c[1]), b = val(f, c[3]); return c[2] === '=' ? a == b : c[2] === '!=' ? a != b : c[2] === '>' ? a > b : c[2] === '<' ? a < b : c[2] === '>=' ? a >= b : a <= b; }); } // eslint-disable-line eqeqeq
      } else if (op === 'parse') {
        const p = /^(@?\w+)\s+["'](.*)["']\s+as\s+(.+)$/i.exec(r); if (!p) throw new Error('parse: usa parse @message "Duration: * ms" as duracion');
        const nombres = p[3].split(',').map((x) => x.trim()); const re = new RegExp(p[2].split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('(.*?)') + (p[2].endsWith('*') ? '$' : ''));
        filas = filas.map((f) => { const mm = re.exec(String(f[p[1]] || '')); const o = { ...f }; nombres.forEach((n, i) => { o[n] = mm ? (isNaN(Number(mm[i + 1])) ? mm[i + 1] : Number(mm[i + 1])) : null; }); return o; });
      } else if (op === 'stats') {
        const [ags, por] = r.split(/\s+by\s+/i); const defs = ags.split(',').map((x) => x.trim()).map((x) => { const q = /^(\w+)\((.*?)\)(?:\s+as\s+(\w+))?$/i.exec(x); if (!q) throw new Error(`stats: no entiendo "${x}". Usa count(*), avg(x), sum(x), min(x) o max(x).`); return { fn: q[1].toLowerCase(), col: q[2].trim(), alias: q[3] || x }; });
        const claves = por ? por.split(',').map((x) => x.trim()) : [];
        const clave = (f, k) => { const b = /^bin\((\d+)([smh])\)$/.exec(k); if (b) { const ms = Number(b[1]) * { s: 1000, m: 60000, h: 3600000 }[b[2]]; return new Date(Math.floor(new Date(f['@timestamp']).getTime() / ms) * ms).toISOString().slice(0, 19).replace('T', ' '); } return f[k]; };
        const g = new Map(); for (const f of filas) { const k = JSON.stringify(claves.map((c) => clave(f, c))); if (!g.has(k)) g.set(k, []); g.get(k).push(f); }
        const calc = (d, fs) => { if (d.fn === 'count') return d.col === '*' || !d.col ? fs.length : fs.filter((f) => f[d.col] != null).length; const vs = fs.map((f) => Number(f[d.col])).filter((v) => !isNaN(v)); if (!vs.length) return null; return Math.round((d.fn === 'avg' ? vs.reduce((a, b) => a + b, 0) / vs.length : d.fn === 'sum' ? vs.reduce((a, b) => a + b, 0) : d.fn === 'max' ? Math.max(...vs) : d.fn === 'min' ? Math.min(...vs) : NaN) * 100) / 100; };
        filas = [...g.entries()].map(([k, fs]) => { const ks = JSON.parse(k); const o = {}; claves.forEach((c, i) => { o[c] = ks[i]; }); defs.forEach((d) => { o[d.alias] = calc(d, fs); }); return o; });
        campos = [...claves, ...defs.map((d) => d.alias)];
      } else if (op === 'sort') { const [c, dir] = r.split(/\s+/); filas.sort((a, b) => { const x = a[c], y = b[c]; const v = x > y ? 1 : x < y ? -1 : 0; return /asc/i.test(dir || '') ? v : -v; }); }
      else if (op === 'limit') limite = Number(r) || 20;
      else if (op === 'display') campos = r.split(',').map((x) => x.trim());
      else throw new Error(`El comando '${op}' no está en la práctica. Usa fields, filter, parse, stats, sort, limit o display.`);
    }
    return { campos, filas: filas.slice(0, limite) };
  }

  // ================================================================== costos
  const S3_GB_MES = 0.023;
  function costos() {
    const s = S(); const porServ = {};
    const sum = (srv, tipo, cant, unidad, costo) => { const k = srv; porServ[k] = porServ[k] || { total: 0, items: {} }; porServ[k].total += costo; const it = (porServ[k].items[tipo] = porServ[k].items[tipo] || { cant: 0, unidad, costo: 0 }); it.cant += cant; it.costo += costo; };
    for (const u of s.uso) sum(u.servicio, u.tipo, u.cantidad, u.unidad, u.costo);
    for (const h of s.athenaHist || []) { const tb = Math.max(h.bytes || 0, 10 * 1024 * 1024) / 1024 ** 4; sum('Amazon Athena', 'Data scanned (TB, mínimo 10 MB por consulta)', tb, 'TB', tb * 5); }
    const bytes = Object.values(s.buckets).reduce((a, b) => a + Object.values(b.objects).reduce((x, o) => x + ((o && o.c) || '').length, 0), 0);
    const diaDelMes = new Date().getUTCDate(); const gbMes = (bytes / 1024 ** 3) * (diaDelMes / 30);
    if (bytes) sum('Amazon S3', 'Storage (GB-Mo, prorrateado)', gbMes, 'GB-Mo', gbMes * S3_GB_MES);
    const total = Object.values(porServ).reduce((a, b) => a + b.total, 0);
    return { porServ, total, bytes };
  }
  function revisarPresupuestos() {
    const s = S(); const { total } = costos();
    for (const b of s.presupuestos) { b.avisados = b.avisados || []; for (const u of b.umbrales || [80, 100]) if ((total / b.monto) * 100 >= u && !b.avisados.includes(u)) { b.avisados.push(u); notificarSns(b.sns || 'alertas-datos', `AWS Budgets: ${b.nombre} has exceeded your alert threshold`, `You requested that we alert you when the ACTUAL Cost associated with your ${b.nombre} budget is greater than ${u}% ($${(b.monto * u / 100).toFixed(2)}). The ACTUAL Cost is $${total.toFixed(4)}.`); } }
    guardar();
  }

  // exponer el motor (la CLI de la terminal lo usa)
  window.AwsMotor = { S, correrGlue, invocarLambda, dispararS3, ejecutarSfn, evaluarAlarmas, insights, costos, scriptGlue, eventoS3, lam, sm, log, notificarSns, alCambiar: (f) => { avisar.length = 0; avisar.push(f); }, DEF_PIPELINE, CODIGO_LAMBDA };

  // ================================================================== pantallas de la consola
  const I = () => window.AwsConsola && window.AwsConsola._i;
  if (!window.AwsConsola || !I()) return; // sin consola, solo el motor (la terminal)
  const { fecha, href, ic, marco, navLinks, cont, btn, vacio, modal, flash, montarMarco, dibujar } = I();
  const ruta = () => I().ruta(); const main = () => I().main();
  const fh = (t) => (t ? fecha(t) : '-');
  const estadoHtml = (e) => `<span class="aws2-st aws2-${String(e).toLowerCase()}">${ic(/SUCCEEDED|OK|Active|Enabled/i.test(e) ? 'ok' : /FAILED|ALARM|TIMED_OUT/i.test(e) ? 'mal' : /RUNNING|IN_PROGRESS/i.test(e) ? 'refrescar' : 'info')} ${esc(e)}</span>`;
  const dur = (a, b) => { if (!a || !b) return '-'; const s = Math.round((new Date(b) - new Date(a)) / 1000); return s < 60 ? `${s} sec` : `${Math.floor(s / 60)} min ${s % 60} sec`; };
  const tabla = (cab, filas, vacioTxt) => (filas.length ? `<div class="aw-tabla-w"><table class="aw-tabla"><thead><tr>${cab.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table></div>` : `<p class="aw-dim">${vacioTxt}</p>`);
  const pintar = (servicio, nav, migas, cuerpo) => { main().innerHTML = marco(servicio, nav, migas, cuerpo); montarMarco(); };
  AwsMotor.alCambiar(() => { if (/^#\/aws\/(glue\/jobs\/[^/]+\/runs|stepfunctions\/sm\/[^/]+(\/ejecuciones|\/ej\/[^/]+)?$|lambda\/f\/[^/]+\/monitor|cloudwatch\/alarmas)/.test(location.hash) && !document.querySelector('.aw-main textarea:focus, .aw-main input:focus, .aw-modal:not([hidden]) *')) dibujar(); });

  // ---------------------------------------------------------------- Glue Studio
  const NAV_GLUE = () => navLinks([['inicio', 'Getting started', href('glue')], ['#Data Catalog'], ['bases', 'Databases', href('glue', 'databases')], ['tablas', 'Tables', href('glue', 'tables')], ['crawlers', 'Crawlers', href('glue', 'crawlers')], ['#ETL jobs'], ['jobs', 'Visual ETL', href('glue', 'jobs')]], 'jobs');
  function glueJobs() {
    const r = ruta(); const s = S();
    if (r[2] === 'crear') {
      pintar('AWS Glue', NAV_GLUE(), [['AWS Glue', href('glue')], ['ETL jobs', href('glue', 'jobs')], ['Create job', '']], `<h1 class="aw-h1">Create job · Visual ETL</h1>${cont('Job', `<label class="aw-lbl">Name</label><input class="aw-in" id="gjN" placeholder="pedidos-silver"><p class="aw-dim">Hasta 255 caracteres: letras, números, -, _ y punto. Un job por tabla o por paso del lago (bronze → silver) es más fácil de operar que uno gigante.</p>`, btn('Create', 'data-ok', 'primario'))}`);
      main().querySelector('[data-ok]').onclick = () => { const nom = main().querySelector('#gjN').value.trim(); if (!/^[\w.-]{1,255}$/.test(nom)) return flash('mal', 'Name: letras, números, -, _ y punto.'); if (s.glueJobs[nom]) return flash('mal', `IdempotentParameterMismatchException: a job named ${esc(nom)} already exists`); s.glueJobs[nom] = { runs: [], def: { fuente: { tipo: 's3', ruta: '' }, pasos: [{ tipo: 'mapping', campos: [['', '', 'string']] }], destino: { ruta: '', particiones: [], catalogo: null }, bookmark: true }, version: '4.0', workers: 2, tipoWorker: 'G.1X', role: Object.keys(s.roles || {})[0] || 'GlueServiceRole-datos', creado: ahora() }; guardar(); location.hash = href('glue', 'jobs', nom); };
      return;
    }
    if (r[2]) return glueJob(r[2], r[3] || 'visual');
    const js = Object.entries(s.glueJobs);
    pintar('AWS Glue', NAV_GLUE(), [['AWS Glue', href('glue')], ['ETL jobs', '']], `<h1 class="aw-h1">AWS Glue Studio</h1>
      ${cont('Create job', `<p>Un <b>job visual</b> se arma con nodos: una <b>fuente</b> (archivos de S3 o una tabla del Data Catalog), <b>transformaciones</b> y un <b>destino</b>. Glue Studio genera el script de PySpark y lo corre en workers que se cobran por <b>DPU-hora</b> (aprox. US$0,44).</p>${btn('Visual ETL', `onclick="location.hash='${href('glue', 'jobs', 'crear')}'"`, 'primario')}`)}
      ${cont(`Your jobs <span class="aw-cnt">(${js.length})</span>`, tabla(['Job name', 'Type', 'Glue version', 'Workers', 'Last run', 'Last run status'], js.map(([n, j]) => { const u = (j.runs || [])[j.runs.length - 1]; return `<tr><td><a href="${href('glue', 'jobs', n)}">${esc(n)}</a></td><td>${j.def ? 'Visual' : 'Script'}</td><td>${esc(j.version || '4.0')}</td><td>${j.workers || 10} × ${esc(j.tipoWorker || 'G.1X')}</td><td>${u ? fh(u.inicio) : '-'}</td><td>${u ? estadoHtml(u.estado) : '-'}</td></tr>`; }), 'No jobs.'))}`);
  }
  function glueJob(n, tab) {
    const s = S(); const j = s.glueJobs[n]; if (!j) { location.hash = href('glue', 'jobs'); return; }
    const D = j.def; const tabs = [['visual', 'Visual'], ['script', 'Script'], ['detalles', 'Job details'], ['runs', `Runs (${(j.runs || []).length})`]];
    const cab = `<h1 class="aw-h1">${esc(n)}</h1><div class="aws2-barra">${btn('Save', 'data-guardar')}${btn(`${ic('play', 12)} Run`, 'data-correr', 'primario')}</div><nav class="aw-tabs">${tabs.map(([k, t]) => `<a class="${k === tab ? 'on' : ''}" href="${href('glue', 'jobs', n, k)}">${t}</a>`).join('')}</nav>`;
    let cuerpo = '';
    if (tab === 'visual') {
      if (!D) cuerpo = cont('Job de script', `<p>Este job se creó con la CLI y su código vive en S3. Para armar uno visual, usa <a href="${href('glue', 'jobs', 'crear')}">Visual ETL</a>.</p>`);
      else {
        const bases = Object.keys(s.glueDbs); const tablas = (db) => Object.keys((s.glueDbs[db] || { tables: {} }).tables);
        const opsF = ['==', '!=', '>', '<', '>=', '<=', 'contains', 'is null', 'is not null'];
        const paso = (p, i) => {
          const q = (k, v, ph = '', w = '') => `<input class="aw-in" data-p="${i}" data-k="${k}" value="${esc(v ?? '')}" placeholder="${esc(ph)}" ${w ? `style="width:${w}"` : ''}>`;
          let cfg = '';
          if (p.tipo === 'mapping') cfg = `<table class="aw-tabla aws2-map"><thead><tr><th>Source key</th><th>Target key</th><th>Data type</th><th></th></tr></thead><tbody>${p.campos.map((c, k) => `<tr><td><input class="aw-in" data-p="${i}" data-c="${k}" data-x="0" value="${esc(c[0])}"></td><td><input class="aw-in" data-p="${i}" data-c="${k}" data-x="1" value="${esc(c[1])}"></td><td><select class="aw-in" data-p="${i}" data-c="${k}" data-x="2">${TIPOS_GLUE.map((t) => `<option ${t === c[2] ? 'selected' : ''}>${t}</option>`).join('')}</select></td><td>${btn(ic('basura', 12), `data-qc="${i}:${k}" aria-label="Drop"`, 'link')}</td></tr>`).join('')}</tbody></table>${btn('Add field', `data-ac="${i}"`)} <span class="aw-dim">Los campos que no listes se descartan. Si un valor no se puede convertir al tipo, queda null.</span>`;
          else if (p.tipo === 'filtro') cfg = `${q('col', p.col, 'columna', '160px')} <select class="aw-in" data-p="${i}" data-k="op" style="width:120px">${opsF.map((o) => `<option ${o === p.op ? 'selected' : ''}>${o}</option>`).join('')}</select> ${q('val', p.val, 'valor', '160px')}`;
          else if (p.tipo === 'dedup') cfg = `${q('claves', (p.claves || []).join(', '), 'columnas clave (vacío = todas)', '320px')}`;
          else if (p.tipo === 'agregar') cfg = `<label class="aw-lbl">Group by</label>${q('por', (p.por || []).join(', '), 'fecha, ciudad', '320px')}<label class="aw-lbl">Aggregations (función:columna:alias, separadas por coma)</label>${q('aggs', (p.aggs || []).map((a) => a.join(':')).join(', '), 'sum:monto:ventas, count:*:pedidos', '420px')}`;
          return `<div class="aws2-nodo aws2-tr"><div class="aws2-nodo-h"><b>${i + 2}. ${esc(NOMBRE_PASO[p.tipo])}</b><span>${btn('↑', `data-sube="${i}" aria-label="Move up"`, 'link')}${btn(ic('basura', 12), `data-quita="${i}" aria-label="Remove"`, 'link')}</span></div>${cfg}</div>`;
        };
        cuerpo = `<div class="aws2-lienzo">
          <div class="aws2-nodo aws2-src"><div class="aws2-nodo-h"><b>1. Source</b><select class="aw-in" id="gFt" style="width:auto"><option value="s3" ${D.fuente.tipo === 's3' ? 'selected' : ''}>Amazon S3</option><option value="catalogo" ${D.fuente.tipo === 'catalogo' ? 'selected' : ''}>AWS Glue Data Catalog</option></select></div>
            ${D.fuente.tipo === 's3' ? `<label class="aw-lbl">S3 URL (carpeta con archivos CSV con encabezado)</label><input class="aw-in" id="gFr" value="${esc(D.fuente.ruta)}" placeholder="s3://mi-lago/bronze/pedidos/">` : `<label class="aw-lbl">Database</label><select class="aw-in" id="gFd">${bases.map((b) => `<option ${b === D.fuente.db ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select><label class="aw-lbl">Table</label><select class="aw-in" id="gFtb">${tablas(D.fuente.db || bases[0]).map((t) => `<option ${t === D.fuente.tabla ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`}</div>
          ${D.pasos.map(paso).join('')}
          <div class="aws2-add">${btn(`${ic('mas', 12)} Change Schema`, 'data-add="mapping"')}${btn(`${ic('mas', 12)} Filter`, 'data-add="filtro"')}${btn(`${ic('mas', 12)} Drop Duplicates`, 'data-add="dedup"')}${btn(`${ic('mas', 12)} Aggregate`, 'data-add="agregar"')}${btn('Preview (primeras filas)', 'data-prev')}</div>
          <div class="aws2-nodo aws2-dst"><div class="aws2-nodo-h"><b>${D.pasos.length + 2}. Target · Amazon S3 (CSV)</b></div>
            <label class="aw-lbl">S3 Target Location</label><input class="aw-in" id="gDr" value="${esc(D.destino.ruta)}" placeholder="s3://mi-lago/silver/pedidos/">
            <label class="aw-lbl">Partition keys (opcional, separadas por coma)</label><input class="aw-in" id="gDp" value="${esc((D.destino.particiones || []).join(', '))}" placeholder="fecha">
            <label class="aw-lbl">Data Catalog update options</label><select class="aw-in" id="gDc"><option value="">Do not update the Data Catalog</option><option value="1" ${D.destino.catalogo ? 'selected' : ''}>Create a table in the Data Catalog and on subsequent runs, update the schema and add new partitions</option></select>
            ${D.destino.catalogo ? `<div class="aws2-fila"><div><label class="aw-lbl">Database</label><select class="aw-in" id="gDd">${bases.map((b) => `<option ${b === D.destino.catalogo.db ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div><div><label class="aw-lbl">Table name</label><input class="aw-in" id="gDt" value="${esc(D.destino.catalogo.tabla || '')}"></div></div>` : ''}</div>
          <div id="gPrev"></div></div>`;
      }
    } else if (tab === 'script') cuerpo = cont('Script (generado por Glue Studio)', `<pre class="aw-pre" style="max-height:none">${esc(scriptGlue(n, D))}</pre><p class="aw-dim">En una cuenta real puedes editar el script, pero desde ese momento el job deja de ser visual.</p>`);
    else if (tab === 'detalles') cuerpo = cont('Basic properties', `<label class="aw-lbl">IAM Role</label><select class="aw-in" id="gRol">${Object.keys(s.roles || {}).map((x) => `<option ${x === j.role ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select><p class="aw-dim">El rol necesita leer la fuente, escribir el destino y actualizar el Data Catalog (AWSGlueServiceRole + permisos sobre los buckets).</p>
      <div class="aws2-fila"><div><label class="aw-lbl">Glue version</label><select class="aw-in" id="gVer">${['5.0', '4.0', '3.0'].map((v) => `<option ${v === (j.version || '4.0') ? 'selected' : ''}>${v}</option>`).join('')}</select></div><div><label class="aw-lbl">Worker type</label><select class="aw-in" id="gTw">${['G.1X', 'G.2X'].map((v) => `<option ${v === (j.tipoWorker || 'G.1X') ? 'selected' : ''}>${v}</option>`).join('')}</select></div><div><label class="aw-lbl">Requested number of workers</label><input class="aw-in" id="gW" type="number" min="2" max="100" value="${j.workers || 10}"></div></div>
      ${D ? `<label class="aw-lbl">Job bookmark</label><select class="aw-in" id="gBm"><option value="1" ${D.bookmark ? 'selected' : ''}>Enable</option><option value="" ${D.bookmark ? '' : 'selected'}>Disable</option></select><p class="aw-dim">Con el bookmark activo, Glue recuerda qué archivos ya procesó y en la próxima corrida solo lee los nuevos. Sin bookmark, cada corrida vuelve a leer todo y <b>duplica</b> lo que escribe en el destino. ${(j.procesados || []).length ? `Archivos ya procesados: ${(j.procesados || []).length}. ${btn('Reset job bookmark', 'data-reset', 'link')}` : ''}</p>` : ''}
      <p class="aw-dim">Costo estimado por minuto: ${(j.workers || 10) * (j.tipoWorker === 'G.2X' ? 2 : 1)} DPU × US$0,44 / 60 = US$${(((j.workers || 10) * (j.tipoWorker === 'G.2X' ? 2 : 1) * 0.44) / 60).toFixed(4)} (Glue 4.0 cobra por segundo con un mínimo de 1 minuto).</p>`);
    else cuerpo = cont('Job runs', tabla(['Run ID', 'Run status', 'Started', 'Duration', 'Records read', 'Records written', 'DPU hours', 'Triggered by', 'Error', 'Logs'], (j.runs || []).slice().reverse().map((x) => `<tr><td><code>${esc(x.id.slice(0, 14))}…</code></td><td>${estadoHtml(x.estado)}</td><td>${fh(x.inicio)}</td><td>${x.seg ? `${x.seg} sec` : '-'}</td><td>${x.leidas ?? '-'}</td><td>${x.escritas ?? '-'}</td><td>${x.dpuHoras ?? '-'}</td><td>${esc(x.origen || '-')}</td><td class="aw-pre-err">${esc((x.error || '').slice(0, 160))}</td><td><a href="${href('cloudwatch', 'logs', '/aws-glue/jobs/output', x.id)}">Output</a>${x.error ? ` · <a href="${href('cloudwatch', 'logs', '/aws-glue/jobs/error', x.id)}">Error</a>` : ''}</td></tr>`), 'Este job todavía no corrió.'));
    pintar('AWS Glue', NAV_GLUE(), [['AWS Glue', href('glue')], ['ETL jobs', href('glue', 'jobs')], [n, '']], cab + cuerpo);
    const m = main();
    const leer = () => {
      if (!D) return;
      if (tab === 'visual') {
        const ft = m.querySelector('#gFt').value; if (ft !== D.fuente.tipo) D.fuente = ft === 's3' ? { tipo: 's3', ruta: '' } : { tipo: 'catalogo', db: Object.keys(s.glueDbs)[0] || '', tabla: '' };
        else if (ft === 's3') D.fuente.ruta = m.querySelector('#gFr').value.trim(); else { D.fuente.db = m.querySelector('#gFd') ? m.querySelector('#gFd').value : ''; D.fuente.tabla = m.querySelector('#gFtb') ? m.querySelector('#gFtb').value : ''; }
        m.querySelectorAll('[data-p][data-k]').forEach((el) => { const p = D.pasos[Number(el.dataset.p)]; const k = el.dataset.k; const v = el.value; if (k === 'claves' || k === 'por') p[k] = v.split(',').map((x) => x.trim()).filter(Boolean); else if (k === 'aggs') p.aggs = v.split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.split(':').map((y) => y.trim())); else p[k] = v; });
        m.querySelectorAll('[data-p][data-c]').forEach((el) => { D.pasos[Number(el.dataset.p)].campos[Number(el.dataset.c)][Number(el.dataset.x)] = el.value.trim(); });
        D.destino.ruta = m.querySelector('#gDr').value.trim(); D.destino.particiones = m.querySelector('#gDp').value.split(',').map((x) => x.trim()).filter(Boolean);
        const dc = m.querySelector('#gDc').value; D.destino.catalogo = dc ? { db: m.querySelector('#gDd') ? m.querySelector('#gDd').value : (Object.keys(s.glueDbs)[0] || ''), tabla: m.querySelector('#gDt') ? m.querySelector('#gDt').value.trim() : (D.destino.catalogo ? D.destino.catalogo.tabla : '') } : null;
      }
      if (tab === 'detalles') { j.role = m.querySelector('#gRol').value; j.version = m.querySelector('#gVer').value; j.tipoWorker = m.querySelector('#gTw').value; j.workers = Math.max(2, Math.min(100, Number(m.querySelector('#gW').value) || 2)); if (m.querySelector('#gBm')) D.bookmark = !!m.querySelector('#gBm').value; }
    };
    const validar = () => { if (!D) return null; if (D.fuente.tipo === 's3' && !s3path(D.fuente.ruta)) return 'Source: ingresa una ruta s3://bucket/carpeta/.'; if (D.fuente.tipo === 'catalogo' && (!D.fuente.db || !D.fuente.tabla)) return 'Source: elige una base y una tabla del Data Catalog.'; if (!s3path(D.destino.ruta)) return 'Target: ingresa una ruta s3://bucket/carpeta/.'; if (D.destino.catalogo && !/^[a-z_][a-z0-9_]*$/.test(D.destino.catalogo.tabla || '')) return 'Target: el nombre de la tabla del catálogo va en minúsculas, con letras, números y _.'; if (s3path(D.destino.ruta) && D.fuente.tipo === 's3' && D.destino.ruta.replace(/\/?$/, '/').startsWith(D.fuente.ruta.replace(/\/?$/, '/'))) return 'Target: el destino está dentro de la carpeta de la fuente; la próxima corrida leería su propia salida.'; return null; };
    const btnG = m.querySelector('[data-guardar]'); btnG.onclick = () => { leer(); const e = validar(); if (e) return flash('mal', esc(e)); guardar(); flash('ok', `Successfully saved job ${esc(n)}`); glueJob(n, tab); };
    m.querySelector('[data-correr]').onclick = () => { leer(); const e = validar(); if (e) return flash('mal', esc(e)); guardar(); correrGlue(n, { origen: 'console' }).then(() => { if (location.hash.startsWith(href('glue', 'jobs', n))) glueJob(n, 'runs'); }).catch((x) => flash('mal', esc(x.message))); location.hash = href('glue', 'jobs', n, 'runs'); };
    if (tab === 'visual' && D) {
      m.querySelector('#gFt').onchange = () => { leer(); glueJob(n, tab); };
      if (m.querySelector('#gFd')) m.querySelector('#gFd').onchange = () => { leer(); D.fuente.tabla = ''; glueJob(n, tab); };
      m.querySelector('#gDc').onchange = () => { leer(); if (D.destino.catalogo && !D.destino.catalogo.tabla) D.destino.catalogo.tabla = (D.destino.ruta.split('/').filter(Boolean).pop() || 'tabla').replace(/[^a-z0-9_]/gi, '_').toLowerCase(); glueJob(n, tab); };
      m.querySelectorAll('[data-add]').forEach((b) => (b.onclick = () => { leer(); const t = b.dataset.add; D.pasos.push(t === 'mapping' ? { tipo: t, campos: [['', '', 'string']] } : t === 'filtro' ? { tipo: t, col: '', op: '==', val: '' } : t === 'dedup' ? { tipo: t, claves: [] } : { tipo: t, por: [], aggs: [['count', '*', 'filas']] }); glueJob(n, tab); }));
      m.querySelectorAll('[data-quita]').forEach((b) => (b.onclick = () => { leer(); D.pasos.splice(Number(b.dataset.quita), 1); glueJob(n, tab); }));
      m.querySelectorAll('[data-sube]').forEach((b) => (b.onclick = () => { leer(); const i = Number(b.dataset.sube); if (i > 0) [D.pasos[i - 1], D.pasos[i]] = [D.pasos[i], D.pasos[i - 1]]; glueJob(n, tab); }));
      m.querySelectorAll('[data-ac]').forEach((b) => (b.onclick = () => { leer(); D.pasos[Number(b.dataset.ac)].campos.push(['', '', 'string']); glueJob(n, tab); }));
      m.querySelectorAll('[data-qc]').forEach((b) => (b.onclick = () => { leer(); const [i, k] = b.dataset.qc.split(':').map(Number); D.pasos[i].campos.splice(k, 1); glueJob(n, tab); }));
      m.querySelector('[data-prev]').onclick = () => {
        leer(); const box = m.querySelector('#gPrev');
        try {
          let ruta0 = D.fuente.ruta; if (D.fuente.tipo === 'catalogo') ruta0 = ((s.glueDbs[D.fuente.db] || { tables: {} }).tables[D.fuente.tabla] || {}).location;
          const A = archivosDe(ruta0); if (A.error) throw new Error(A.error); if (!A.archivos.length) throw new Error(`No hay archivos .csv en ${ruta0}`);
          let { cols, filas } = leerCsv(A.archivos[0].c); filas = filas.slice(0, 200);
          const parts0 = A.archivos[0].key.slice(A.p.k.length).split('/').slice(0, -1).filter((x) => /=/.test(x)).map((x) => x.split('=')).filter(([k]) => !cols.includes(k)); // columnas de partición (carpetas col=valor)
          if (parts0.length) { cols = [...cols, ...parts0.map((x) => x[0])]; filas = filas.map((f) => [...f, ...parts0.map((x) => x[1])]); }
          if (D.pasos.length === 1 && D.pasos[0].tipo === 'mapping' && D.pasos[0].campos.length === 1 && !D.pasos[0].campos[0][0]) { D.pasos[0].campos = cols.map((c) => [c, c, 'string']); guardar(); return glueJob(n, tab); }
          for (const p of D.pasos) [cols, filas] = aplicarPaso(p, cols, filas);
          box.innerHTML = cont(`Data preview <span class="aw-cnt">(${A.archivos[0].key}, primeras filas)</span>`, tabla(cols.map(esc), filas.slice(0, 10).map((f) => `<tr>${f.map((v) => `<td>${v == null ? '<i class="aw-dim">null</i>' : esc(v)}</td>`).join('')}</tr>`), 'Sin filas después de las transformaciones.'));
        } catch (e) { box.innerHTML = `<div class="aw-alerta aw-alerta-aviso">${ic('aviso')} <span>${esc(e.message)}</span></div>`; }
      };
    }
    if (m.querySelector('[data-reset]')) m.querySelector('[data-reset]').onclick = () => { j.procesados = []; guardar(); flash('ok', 'Job bookmark reset: la próxima corrida vuelve a leer todos los archivos.'); glueJob(n, tab); };
  }

  // ---------------------------------------------------------------- Lambda
  const NAV_LAMBDA = (sel) => navLinks([['dash', 'Dashboard', href('lambda', 'dashboard')], ['fns', 'Functions', href('lambda')]], sel);
  const PLANTILLAS_EV = { 's3-put': (f) => { const t = (lam(f) || { triggers: [] }).triggers[0]; const b = t ? t.bucket : Object.keys(S().buckets)[0] || 'mi-bucket'; const k = Object.keys((S().buckets[b] || { objects: {} }).objects).find((x) => !t || (x.startsWith(t.prefijo || '') && x.endsWith(t.sufijo || ''))) || 'landing/ejemplo.csv'; return eventoS3(b, k, 0); }, 'hello-world': () => ({ key1: 'value1', key2: 'value2', key3: 'value3' }) };
  function lambdaVista() {
    const r = ruta(); const s = S();
    if (r[1] === 'crear') return lambdaCrear();
    if (r[1] === 'f' && r[2]) return lambdaFn(r[2], r[3] || 'code');
    const fs = Object.keys(s.lambdas).map((n) => [n, lam(n)]);
    pintar('AWS Lambda', NAV_LAMBDA(r[1] === 'dashboard' ? 'dash' : 'fns'), [['Lambda', href('lambda')], ['Functions', '']], `<h1 class="aw-h1">Functions <span class="aw-cnt">(${fs.length})</span></h1>
      ${cont('Functions', tabla(['Function name', 'Package type', 'Runtime', 'Triggers', 'Last modified'], fs.map(([n, f]) => `<tr><td><a href="${href('lambda', 'f', n)}">${esc(n)}</a></td><td>Zip</td><td>${esc(f.runtime)}</td><td>${f.triggers.map((t) => `S3: ${esc(t.bucket)}`).join(', ') || '-'}</td><td>${fh(f.modificada)}</td></tr>`), 'No functions.'), btn('Create function', `onclick="location.hash='${href('lambda', 'crear')}'"`, 'primario'), 'Una función Lambda corre tu código cuando pasa algo (un archivo nuevo en S3, un mensaje, una llamada) sin servidores que administrar. Se cobra por invocación y por milisegundo.')}`);
  }
  function lambdaCrear() {
    pintar('AWS Lambda', NAV_LAMBDA('fns'), [['Lambda', href('lambda')], ['Functions', href('lambda')], ['Create function', '']], `<h1 class="aw-h1">Create function</h1>${cont('Basic information', `<label class="aw-lbl">Function name</label><input class="aw-in" id="lN" placeholder="validar-archivo-pedidos"><p class="aw-dim">Letras, números, guiones y guiones bajos; hasta 64 caracteres.</p>
      <label class="aw-lbl">Runtime</label><select class="aw-in" id="lR"><option>python3.13</option><option selected>python3.12</option><option>python3.11</option></select>
      <label class="aw-lbl">Architecture</label><select class="aw-in" id="lA"><option>x86_64</option><option>arm64</option></select>
      <label class="aw-lbl">Execution role</label><div class="aw-ro">Create a new role with basic Lambda permissions (escribir logs en CloudWatch)</div><p class="aw-dim">Para leer o escribir en S3, después agrega al rol una política sobre el bucket (en IAM).</p>`, btn('Create function', 'data-ok', 'primario'))}`);
    main().querySelector('[data-ok]').onclick = () => { const n = main().querySelector('#lN').value.trim(); if (!/^[A-Za-z0-9_-]{1,64}$/.test(n)) return flash('mal', 'Function name: 1 a 64 caracteres, letras, números, - y _.'); if (S().lambdas[n]) return flash('mal', `Function already exist: ${esc(n)}`); S().lambdas[n] = { runtime: main().querySelector('#lR').value, arquitectura: main().querySelector('#lA').value, handler: 'lambda_function.lambda_handler', codigo: CODIGO_LAMBDA, memoria: 128, timeout: 3, triggers: [], env: {}, modificada: ahora() }; (S().roles = S().roles || {})[`${n}-role-${hex(8)}`] = { lambda: n }; guardar(); location.hash = href('lambda', 'f', n); };
  }
  function lambdaFn(n, tab) {
    const f = lam(n); if (!f) { location.hash = href('lambda'); return; }
    const tabs = [['code', 'Code'], ['test', 'Test'], ['monitor', 'Monitor'], ['config', 'Configuration']];
    const pend = f.borrador != null && f.borrador !== f.codigo;
    const resumen = `<div class="aws2-fn"><div class="aws2-fn-c">${ic('job', 20)} <b>${esc(n)}</b></div>${f.triggers.length ? f.triggers.map((t) => `<div class="aws2-trig">${ic('bucket', 14)} S3 · ${esc(t.bucket)}${t.prefijo ? `/${esc(t.prefijo)}` : ''}${t.sufijo ? ` *${esc(t.sufijo)}` : ''}</div>`).join('') : `<span class="aw-dim">Sin disparadores. ${btn('+ Add trigger', 'data-trig', 'link')}</span>`}</div>`;
    let cuerpo = '';
    if (tab === 'code') cuerpo = `${pend ? `<div class="aw-alerta aw-alerta-aviso">${ic('aviso')} <span>Changes not deployed. Las invocaciones siguen corriendo el código anterior hasta que presiones <b>Deploy</b>.</span></div>` : ''}${cont('Code source', `<div class="aws2-ide"><div class="aws2-ide-f">${ic('carpeta', 14)} ${esc(n)}<br>&nbsp;&nbsp;${ic('archivo', 14)} ${esc((f.handler || 'lambda_function.x').split('.')[0])}.py</div><textarea class="aw-sql" id="lC" spellcheck="false" aria-label="Código">${esc(f.borrador != null ? f.borrador : f.codigo)}</textarea></div><p class="aw-dim">Handler: <code>${esc(f.handler)}</code> (archivo.función). El código corre con Python de verdad; <code>boto3</code> de la práctica simula <code>s3.get_object</code>, <code>s3.put_object</code>, <code>s3.list_objects_v2</code> y <code>glue.start_job_run</code> sobre tus buckets y jobs.</p>`, `${btn('Deploy', 'data-deploy', pend ? 'primario' : '')}${btn('Test', 'data-test')}`)}<div id="lOut"></div>`;
    else if (tab === 'test') { const evs = Object.keys(f.eventos); cuerpo = cont('Test event', `<label class="aw-lbl">Template</label><select class="aw-in" id="lT"><option value="">(evento guardado o vacío)</option><option value="s3-put">S3 Put (archivo nuevo en tu bucket)</option><option value="hello-world">hello-world</option></select>${evs.length ? `<label class="aw-lbl">Saved events</label><select class="aw-in" id="lG"><option value="">-</option>${evs.map((e) => `<option>${esc(e)}</option>`).join('')}</select>` : ''}<label class="aw-lbl">Event JSON</label><textarea class="aw-sql" id="lE" spellcheck="false" style="min-height:220px">${esc(JSON.stringify(f.ultimoEvento || PLANTILLAS_EV['s3-put'](n), null, 2))}</textarea><label class="aw-lbl">Event name (para guardarlo)</label><input class="aw-in" id="lEn" placeholder="archivo-pedidos">`, `${btn('Save', 'data-gev')}${btn('Test', 'data-test', 'primario')}`) + '<div id="lOut"></div>'; }
    else if (tab === 'monitor') { const iv = f.invocaciones; const err = iv.filter((x) => !x.ok).length; cuerpo = cont('Metrics (últimas invocaciones)', `<div class="aw-stats"><div><b>${iv.length}</b><span>Invocations</span></div><div><b class="${err ? 'aws2-mal' : ''}">${err}</b><span>Errors</span></div><div><b>${iv.length ? Math.round(iv.reduce((a, b) => a + b.ms, 0) / iv.length) : 0} ms</b><span>Duration (avg)</span></div><div><b>${iv.length ? Math.round(((iv.length - err) / iv.length) * 100) : 100}%</b><span>Success rate</span></div></div>`, btn('View CloudWatch logs', `onclick="location.hash='${href('cloudwatch', 'logs', `/aws/lambda/${n}`)}'"`)) + cont('Recent invocations', tabla(['Timestamp', 'RequestId', 'Status', 'Duration', 'Triggered by', 'Error'], iv.map((x) => `<tr><td>${fh(x.t)}</td><td><code>${esc(x.req.slice(0, 8))}…</code></td><td>${estadoHtml(x.ok ? 'Succeeded' : 'Failed')}</td><td>${x.ms} ms</td><td>${esc(x.origen)}</td><td class="aw-pre-err">${esc(x.error || '')}</td></tr>`), 'Todavía no hubo invocaciones.')); }
    else cuerpo = cont('General configuration', `<div class="aws2-fila"><div><label class="aw-lbl">Memory (MB)</label><input class="aw-in" id="lM" type="number" min="128" max="10240" step="64" value="${f.memoria}"></div><div><label class="aw-lbl">Timeout (sec)</label><input class="aw-in" id="lTo" type="number" min="1" max="900" value="${f.timeout}"></div><div><label class="aw-lbl">Handler</label><input class="aw-in" id="lH" value="${esc(f.handler)}"></div></div><p class="aw-dim">Más memoria también da más CPU (y cuesta más por milisegundo). El timeout máximo es 15 minutos: para procesos largos, Glue o Step Functions.</p>`, btn('Save', 'data-gcfg', 'primario'))
      + cont('Triggers', tabla(['Source', 'Bucket', 'Prefix', 'Suffix', 'State', ''], f.triggers.map((t, i) => `<tr><td>S3 (ObjectCreated)</td><td>${esc(t.bucket)}</td><td>${esc(t.prefijo || '-')}</td><td>${esc(t.sufijo || '-')}</td><td>${t.activo ? 'Enabled' : 'Disabled'}</td><td>${btn(t.activo ? 'Disable' : 'Enable', `data-tg="${i}"`, 'link')}${btn('Delete', `data-tq="${i}"`, 'link')}</td></tr>`), 'Sin disparadores.'), btn('Add trigger', 'data-trig'))
      + cont('Environment variables', `${tabla(['Key', 'Value', ''], Object.entries(f.env).map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${esc(v)}</td><td>${btn('Remove', `data-eq="${esc(k)}"`, 'link')}</td></tr>`), 'Sin variables.')}<div class="aws2-fila"><input class="aw-in" id="lEk" placeholder="DESTINO_BUCKET"><input class="aw-in" id="lEv" placeholder="mi-lago"></div><p class="aw-dim">No guardes secretos aquí: para contraseñas, Secrets Manager o Parameter Store.</p>`, btn('Add', 'data-eadd'));
    pintar('AWS Lambda', NAV_LAMBDA('fns'), [['Lambda', href('lambda')], ['Functions', href('lambda')], [n, '']], `<h1 class="aw-h1">${esc(n)}</h1>${resumen}<nav class="aw-tabs">${tabs.map(([k, t]) => `<a class="${k === tab ? 'on' : ''}" href="${href('lambda', 'f', n, k)}">${t}</a>`).join('')}</nav>${cuerpo}`);
    const m = main(); const out = m.querySelector('#lOut');
    const probar = async (evento) => {
      if (out) out.innerHTML = cont('Execution result', `<p>${ic('refrescar')} Executing function: ${esc(n)}… <span class="aw-dim">(la primera vez carga Python: unos segundos)</span></p>`);
      const r = await invocarLambda(n, evento, { origen: 'console test' });
      const lgs = (((S().logs[r.grupo] || { streams: {} }).streams[r.stream]) || []).map((x) => x.m).join('\n');
      if (out && document.body.contains(out)) out.innerHTML = cont(`Execution result: ${r.ok ? '<span class="aws2-ok">succeeded</span>' : '<span class="aws2-mal">failed</span>'}`, `<label class="aw-lbl">Response</label><pre class="aw-pre ${r.ok ? '' : 'aw-pre-err'}">${esc(JSON.stringify(r.ok ? r.resultado : r.error, null, 2))}</pre><label class="aw-lbl">Summary</label><div class="aw-ro">Request ID ${esc(r.req)} · Duration ${r.ms} ms${r.init ? ` · Init duration ${r.init} ms (cold start)` : ''} · Memory ${f.memoria} MB</div><label class="aw-lbl">Log output</label><pre class="aw-pre">${esc(lgs)}</pre>`);
    };
    const bTest = m.querySelector('[data-test]'); if (bTest) bTest.onclick = () => { let ev = f.ultimoEvento || PLANTILLAS_EV['s3-put'](n); if (tab === 'test') { try { ev = JSON.parse(m.querySelector('#lE').value); } catch (e) { return flash('mal', `Event JSON inválido: ${esc(e.message)}`); } f.ultimoEvento = ev; guardar(); } probar(ev); };
    const lc = m.querySelector('#lC'); if (lc) lc.oninput = () => { f.borrador = lc.value; guardar(); };
    const bDep = m.querySelector('[data-deploy]'); if (bDep) bDep.onclick = () => { f.codigo = lc.value; f.borrador = null; f.modificada = ahora(); f.version = (f.version || 1) + 1; guardar(); flash('ok', `Successfully updated the function ${esc(n)}.`); lambdaFn(n, tab); };
    if (m.querySelector('#lT')) m.querySelector('#lT').onchange = (e) => { if (PLANTILLAS_EV[e.target.value]) m.querySelector('#lE').value = JSON.stringify(PLANTILLAS_EV[e.target.value](n), null, 2); };
    if (m.querySelector('#lG')) m.querySelector('#lG').onchange = (e) => { if (f.eventos[e.target.value]) m.querySelector('#lE').value = JSON.stringify(f.eventos[e.target.value], null, 2); };
    if (m.querySelector('[data-gev]')) m.querySelector('[data-gev]').onclick = () => { const nom = m.querySelector('#lEn').value.trim(); if (!/^[\w-]{1,25}$/.test(nom)) return flash('mal', 'Event name: hasta 25 caracteres, letras, números, - y _.'); try { f.eventos[nom] = JSON.parse(m.querySelector('#lE').value); } catch (e) { return flash('mal', 'Event JSON inválido'); } guardar(); flash('ok', `Saved event ${esc(nom)}`); lambdaFn(n, tab); };
    if (m.querySelector('[data-gcfg]')) m.querySelector('[data-gcfg]').onclick = () => { f.memoria = Math.max(128, Math.min(10240, Number(m.querySelector('#lM').value) || 128)); f.timeout = Math.max(1, Math.min(900, Number(m.querySelector('#lTo').value) || 3)); f.handler = m.querySelector('#lH').value.trim() || f.handler; f.modificada = ahora(); guardar(); flash('ok', 'Configuration saved'); lambdaFn(n, tab); };
    m.querySelectorAll('[data-tg]').forEach((b) => (b.onclick = () => { const t = f.triggers[Number(b.dataset.tg)]; t.activo = !t.activo; guardar(); lambdaFn(n, tab); }));
    m.querySelectorAll('[data-tq]').forEach((b) => (b.onclick = () => { f.triggers.splice(Number(b.dataset.tq), 1); guardar(); lambdaFn(n, tab); }));
    m.querySelectorAll('[data-eq]').forEach((b) => (b.onclick = () => { delete f.env[b.dataset.eq]; guardar(); lambdaFn(n, tab); }));
    if (m.querySelector('[data-eadd]')) m.querySelector('[data-eadd]').onclick = () => { const k = m.querySelector('#lEk').value.trim(); if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(k)) return flash('mal', 'Key: empieza con letra; letras, números y _.'); f.env[k] = m.querySelector('#lEv').value; guardar(); lambdaFn(n, tab); };
    m.querySelectorAll('[data-trig]').forEach((b) => (b.onclick = () => {
      const bs = Object.keys(S().buckets); if (!bs.length) return flash('mal', 'Primero crea un bucket en S3.');
      modal(`<h2>Add trigger · S3</h2><label class="aw-lbl">Bucket</label><select class="aw-in" id="tB">${bs.map((x) => `<option>${esc(x)}</option>`).join('')}</select><label class="aw-lbl">Event types</label><div class="aw-ro">All object create events</div><label class="aw-lbl">Prefix - optional</label><input class="aw-in" id="tP" placeholder="landing/"><label class="aw-lbl">Suffix - optional</label><input class="aw-in" id="tS" placeholder=".csv"><div class="aw-alerta aw-alerta-aviso">${ic('aviso')} <span><b>Recursive invocation</b>: si la función escribe en el mismo bucket, usa un prefijo distinto para la salida; si no, cada archivo que escribe la vuelve a disparar.</span></div><div class="aw-modal-b">${btn('Cancel', 'data-cerrar', 'link')}${btn('Add', 'id="tOk"', 'primario')}</div>`, (mm, cerrar) => {
        mm.querySelector('#tOk').onclick = () => { f.triggers.push({ bucket: mm.querySelector('#tB').value, prefijo: mm.querySelector('#tP').value.trim(), sufijo: mm.querySelector('#tS').value.trim(), activo: true, creado: ahora() }); guardar(); cerrar(); flash('ok', 'The trigger was successfully added to the function. Ahora cada archivo nuevo que coincida la invoca.'); lambdaFn(n, 'config'); };
      });
    }));
  }

  // ---------------------------------------------------------------- Step Functions
  const NAV_SFN = () => navLinks([['sm', 'State machines', href('stepfunctions')]], 'sm');
  function grafoSfn(D, estados = {}) {
    const orden = []; const vistos = new Set(); const cola = [D.StartAt];
    while (cola.length) { const n = cola.shift(); if (!n || vistos.has(n) || !D.States[n]) continue; vistos.add(n); orden.push(n); const st = D.States[n]; [st.Next, st.Default, ...(st.Choices || []).map((c) => c.Next), ...(st.Catch || []).map((c) => c.Next)].forEach((x) => x && cola.push(x)); }
    Object.keys(D.States || {}).forEach((n) => { if (!vistos.has(n)) orden.push(n); });
    return `<div class="aws2-grafo"><div class="aws2-gn aws2-ini">Start</div>${orden.map((n) => { const st = D.States[n]; const e = estados[n]; const sal = [st.Next && `→ ${st.Next}`, st.Default && `default → ${st.Default}`, ...(st.Choices || []).map((c) => `si ${c.Variable || 'condición'} → ${c.Next}`), ...(st.Catch || []).map((c) => `catch ${c.ErrorEquals.join(',')} → ${c.Next}`), st.End && '→ End'].filter(Boolean); return `<div class="aws2-gflecha">↓</div><div class="aws2-gn aws2-g-${(e || 'none').toLowerCase()}"><b>${esc(n)}</b><small>${esc(st.Type)}${st.Resource ? ` · ${esc(String(st.Resource).replace('arn:aws:states:::', ''))}` : ''}${st.Type === 'Map' && (st.ItemProcessor || st.Iterator) ? ` · por cada elemento de ${esc(st.ItemsPath || '$')}: ${esc(Object.keys((st.ItemProcessor || st.Iterator).States || {}).join(' → '))}` : ''}${st.Type === 'Parallel' && Array.isArray(st.Branches) ? ` · ${st.Branches.length} ramas a la vez: ${esc(st.Branches.map((b) => Object.keys(b.States || {}).join(' → ')).join(' | '))}` : ''}</small>${sal.length ? `<small class="aw-dim">${esc(sal.join(' · '))}</small>` : ''}</div>`; }).join('')}<div class="aws2-gflecha">↓</div><div class="aws2-gn aws2-ini">End</div></div>`;
  }
  function sfnVista() {
    const r = ruta(); const s = S();
    if (r[1] === 'crear') return sfnCrear();
    if (r[1] === 'sm' && r[2]) { if (r[3] === 'ej' && r[4]) return sfnEjec(r[2], r[4]); return sfnSm(r[2], r[3] || 'ejecuciones'); }
    const ms = Object.keys(s.sfn).map((n) => [n, sm(n)]);
    pintar('Step Functions', NAV_SFN(), [['Step Functions', href('stepfunctions')], ['State machines', '']], `<h1 class="aw-h1">State machines <span class="aw-cnt">(${ms.length})</span></h1>${cont('State machines', tabla(['Name', 'Type', 'Creation date', 'Last execution', 'Status'], ms.map(([n, m]) => { const u = m.ejecuciones[0]; return `<tr><td><a href="${href('stepfunctions', 'sm', n)}">${esc(n)}</a></td><td>${esc(m.tipo)}</td><td>${fh(m.creada)}</td><td>${u ? fh(u.inicio) : '-'}</td><td>${u ? estadoHtml(u.estado) : '-'}</td></tr>`; }), 'No state machines.'), btn('Create state machine', `onclick="location.hash='${href('stepfunctions', 'crear')}'"`, 'primario'), 'Una máquina de estados orquesta pasos (Glue, Lambda, Athena, SNS) con reintentos, ramas y manejo de errores. Cumple el mismo rol que un DAG de Airflow, pero administrado por AWS. Se cobra por transición de estado.')}`);
  }
  function sfnCrear() {
    const jobs = Object.keys(S().glueJobs);
    pintar('Step Functions', NAV_SFN(), [['Step Functions', href('stepfunctions')], ['Create state machine', '']], `<h1 class="aw-h1">Create state machine</h1>${cont('Template', `<label class="aw-lbl">Choose a template</label><select class="aw-in" id="sT"><option value="pipe">Pipeline de datos: Glue (.sync) + aviso SNS si falla</option><option value="blank">Blank</option></select><label class="aw-lbl">Glue job</label><select class="aw-in" id="sJ">${jobs.map((j) => `<option>${esc(j)}</option>`).join('')}</select><label class="aw-lbl">State machine name</label><input class="aw-in" id="sN" placeholder="pipeline-pedidos"><label class="aw-lbl">Execution role</label><div class="aw-ro">Create a new role (con permisos para los servicios que use la definición)</div>`, btn('Create', 'data-ok', 'primario'))}`);
    main().querySelector('[data-ok]').onclick = () => { const n = main().querySelector('#sN').value.trim(); if (!/^[A-Za-z0-9_-]{1,80}$/.test(n)) return flash('mal', 'Name: 1 a 80 caracteres, letras, números, - y _.'); if (S().sfn[n]) return flash('mal', `State Machine Already Exists: ${esc(n)}`); S().sfn[n] = { definicion: main().querySelector('#sT').value === 'pipe' ? DEF_PIPELINE(main().querySelector('#sJ').value || 'etl-ventas-silver') : JSON.stringify({ Comment: 'Máquina vacía', StartAt: 'Inicio', States: { Inicio: { Type: 'Pass', End: true } } }, null, 2), creada: ahora() }; guardar(); location.hash = href('stepfunctions', 'sm', n); };
  }
  function sfnSm(n, tab) {
    const m = sm(n); if (!m) { location.hash = href('stepfunctions'); return; }
    let D = null, errD = null; try { D = JSON.parse(m.definicion); } catch (e) { errD = e.message; }
    const tabs = [['ejecuciones', `Executions (${m.ejecuciones.length})`], ['definicion', 'Definition'], ['config', 'Logging']];
    let cuerpo = '';
    if (tab === 'ejecuciones') cuerpo = cont('Executions', tabla(['Name', 'Status', 'Started', 'End time', 'Duration'], m.ejecuciones.map((e) => `<tr><td><a href="${href('stepfunctions', 'sm', n, 'ej', e.id)}">${esc(e.id)}</a></td><td>${estadoHtml(e.estado)}</td><td>${fh(e.inicio)}</td><td>${fh(e.fin)}</td><td>${dur(e.inicio, e.fin)}</td></tr>`), 'Todavía no hay ejecuciones.'));
    else if (tab === 'definicion') cuerpo = `<div class="aws2-fila aws2-sfn">${cont('Graph view', D ? grafoSfn(D) : `<pre class="aw-pre aw-pre-err">${esc(errD)}</pre>`)}${cont('Amazon States Language (JSON)', `<textarea class="aw-sql" id="sD" spellcheck="false" style="min-height:420px">${esc(m.definicion)}</textarea>`, btn('Save', 'data-gdef', 'primario'), 'Edita el JSON y guarda: el grafo se actualiza.')}</div>`;
    else cuerpo = cont('Logging', `<label class="aw-lbl">Log level</label><select class="aw-in" id="sL">${['OFF', 'ERROR', 'ALL'].map((x) => `<option ${x === m.logs ? 'selected' : ''}>${x}</option>`).join('')}</select><p class="aw-dim">Con ERROR o ALL, los eventos de cada ejecución se guardan en el log group <code>/aws/vendedlogs/states/${esc(n)}-Logs</code> de CloudWatch. ALL guarda todo (más costo de ingesta).</p>`, btn('Save', 'data-glog', 'primario'));
    pintar('Step Functions', NAV_SFN(), [['Step Functions', href('stepfunctions')], ['State machines', href('stepfunctions')], [n, '']], `<h1 class="aw-h1">${esc(n)}</h1><div class="aws2-barra">${btn('Start execution', 'data-start', 'primario')}</div><p class="aw-dim">ARN <code>${esc(arn('states', 'stateMachine:' + n))}</code> · Type ${esc(m.tipo)} · Role <code>${esc(m.rol.split('/').pop())}</code></p><nav class="aw-tabs">${tabs.map(([k, t]) => `<a class="${k === tab ? 'on' : ''}" href="${href('stepfunctions', 'sm', n, k)}">${t}</a>`).join('')}</nav>${cuerpo}`);
    const M = main();
    M.querySelector('[data-start]').onclick = () => modal(`<h2>Start execution</h2><label class="aw-lbl">Name - optional</label><input class="aw-in" id="eN" value="${guid()}"><label class="aw-lbl">Input - optional (JSON)</label><textarea class="aw-sql" id="eI" style="min-height:120px">${esc(JSON.stringify({ fecha: new Date().toISOString().slice(0, 10) }, null, 2))}</textarea><div class="aw-modal-b">${btn('Cancel', 'data-cerrar', 'link')}${btn('Start execution', 'id="eOk"', 'primario')}</div>`, (mm, cerrar) => {
      mm.querySelector('#eOk').onclick = () => { let inp; try { inp = JSON.parse(mm.querySelector('#eI').value || '{}'); } catch (e) { return flash('mal', `Input JSON inválido: ${esc(e.message)}`); } const nom = mm.querySelector('#eN').value.trim() || guid(); if (m.ejecuciones.some((x) => x.id === nom)) return flash('mal', `Execution Already Exists: ${esc(nom)}`); cerrar(); ejecutarSfn(n, inp, { nombreEj: nom }).catch((e) => flash('mal', esc(e.message))); location.hash = href('stepfunctions', 'sm', n, 'ej', nom); };
    });
    if (M.querySelector('[data-gdef]')) M.querySelector('[data-gdef]').onclick = () => { const v = M.querySelector('#sD').value; let d; try { d = JSON.parse(v); } catch (e) { return flash('mal', `InvalidDefinition: ${esc(e.message)}`); } if (!d.StartAt || !d.States || !d.States[d.StartAt]) return flash('mal', 'InvalidDefinition: falta StartAt o el estado inicial no existe en States.'); const malos = Object.entries(d.States).filter(([, st]) => st.Next && !d.States[st.Next]).map(([k, st]) => `${k} → ${st.Next}`); if (malos.length) return flash('mal', `InvalidDefinition: MISSING_TRANSITION_TARGET (${esc(malos.join(', '))})`); m.definicion = JSON.stringify(d, null, 2); guardar(); flash('ok', 'State machine updated'); sfnSm(n, tab); };
    if (M.querySelector('[data-glog]')) M.querySelector('[data-glog]').onclick = () => { m.logs = M.querySelector('#sL').value; guardar(); flash('ok', 'Logging updated'); };
  }
  function sfnEjec(n, id) {
    const m = sm(n); const e = m && m.ejecuciones.find((x) => x.id === id); if (!e) { pintar('Step Functions', NAV_SFN(), [['Step Functions', href('stepfunctions')]], `<p>${ic('refrescar')} Starting execution…</p>`); return; }
    let D = {}; try { D = JSON.parse(m.definicion); } catch (x) { /* definición inválida */ }
    pintar('Step Functions', NAV_SFN(), [['Step Functions', href('stepfunctions')], [n, href('stepfunctions', 'sm', n)], [id.slice(0, 12), '']], `<h1 class="aw-h1">${esc(id)}</h1>
      ${cont('Details', `<div class="aw-stats"><div><b>${estadoHtml(e.estado)}</b><span>Execution status</span></div><div><b>${fh(e.inicio)}</b><span>Start time</span></div><div><b>${dur(e.inicio, e.fin)}</b><span>Duration</span></div><div><b>${e.transiciones}</b><span>State transitions</span></div></div>${e.error ? `<div class="aw-alerta aw-alerta-aviso">${ic('mal')} <span><b>${esc(e.error)}</b><br>${esc(e.causa || '')}</span></div>` : ''}`, btn('New execution', `onclick="location.hash='${href('stepfunctions', 'sm', n)}'"`))}
      <div class="aws2-fila aws2-sfn">${cont('Graph view', D.States ? grafoSfn(D, e.estados) : '')}${cont('Input / Output', `<label class="aw-lbl">Input</label><pre class="aw-pre">${esc(JSON.stringify(e.input, null, 2))}</pre><label class="aw-lbl">Output</label><pre class="aw-pre">${esc(e.output != null ? JSON.stringify(e.output, null, 2) : '-')}</pre>`)}</div>
      ${cont(`Events <span class="aw-cnt">(${e.eventos.length})</span>`, tabla(['ID', 'Type', 'Step', 'Resource', 'Timestamp', 'Details'], e.eventos.map((x) => `<tr class="${/Failed/.test(x.tipo) ? 'aws2-fila-mal' : ''}"><td>${x.id}</td><td>${esc(x.tipo)}</td><td>${esc(x.estado || '-')}</td><td>${esc(x.resource ? x.resource.replace('arn:aws:states:::', '') : '-')}</td><td>${fh(x.t)}</td><td class="aws2-det">${esc(x.error ? `${x.error}: ${x.cause || ''}` : x.output || x.input || '')}</td></tr>`), ''))}`);
  }

  // ---------------------------------------------------------------- CloudWatch
  const NAV_CW = (sel) => navLinks([['#Alarms'], ['alarmas', 'All alarms', href('cloudwatch', 'alarmas')], ['#Logs'], ['logs', 'Log groups', href('cloudwatch', 'logs')], ['insights', 'Logs Insights', href('cloudwatch', 'insights')], ['#Metrics'], ['metricas', 'All metrics', href('cloudwatch', 'metricas')]], sel);
  function cwVista() {
    const r = ruta(); evaluarAlarmas();
    if (r[1] === 'logs') return r[2] ? (r[3] ? cwStream(r[2], r[3]) : cwGrupo(r[2])) : cwGrupos();
    if (r[1] === 'insights') return cwInsights();
    if (r[1] === 'metricas') return cwMetricas();
    return cwAlarmas();
  }
  function cwGrupos() {
    const s = S(); const gs = Object.entries(s.logs).sort((a, b) => a[0].localeCompare(b[0]));
    pintar('CloudWatch', NAV_CW('logs'), [['CloudWatch', href('cloudwatch')], ['Log groups', '']], `<h1 class="aw-h1">Log groups <span class="aw-cnt">(${gs.length})</span></h1>${cont('Log groups', tabla(['Log group', 'Retention', 'Streams', 'Stored bytes', 'Creation time'], gs.map(([n, g]) => `<tr><td><a href="${href('cloudwatch', 'logs', n)}">${esc(n)}</a></td><td>${g.retencion ? `${g.retencion} days` : 'Never expire'}</td><td>${Object.keys(g.streams).length}</td><td>${Object.values(g.streams).reduce((a, st) => a + st.reduce((x, e) => x + e.m.length, 0), 0).toLocaleString('en-US')}</td><td>${fh(g.creado)}</td></tr>`), 'Todavía no hay logs: invoca una Lambda, corre un job de Glue o activa los logs de una máquina de estados.'), '', 'Cada servicio escribe sus logs en un log group (uno por función o por tipo de job), dividido en streams. "Never expire" es el valor por defecto: en una empresa se define una retención para no pagar almacenamiento de más.')}`);
  }
  function cwGrupo(g) {
    const G = S().logs[g]; if (!G) return cwGrupos();
    const sts = Object.entries(G.streams).map(([n, evs]) => [n, evs[evs.length - 1] ? evs[evs.length - 1].t : null]).sort((a, b) => String(b[1]).localeCompare(String(a[1])));
    pintar('CloudWatch', NAV_CW('logs'), [['CloudWatch', href('cloudwatch')], ['Log groups', href('cloudwatch', 'logs')], [g, '']], `<h1 class="aw-h1">${esc(g)}</h1>${cont('Log group details', `<label class="aw-lbl">Retention</label><select class="aw-in" id="cR" style="width:200px"><option value="">Never expire</option>${[1, 3, 7, 14, 30, 90, 365].map((d) => `<option value="${d}" ${G.retencion === d ? 'selected' : ''}>${d} days</option>`).join('')}</select>`)}${cont(`Log streams <span class="aw-cnt">(${sts.length})</span>`, tabla(['Log stream', 'Last event time'], sts.map(([n, t]) => `<tr><td><a href="${href('cloudwatch', 'logs', g, n)}">${esc(n)}</a></td><td>${fh(t)}</td></tr>`), 'Sin streams.'), btn('Search in Logs Insights', `onclick="location.hash='${href('cloudwatch', 'insights')}?g=${encodeURIComponent(g)}'"`))}`);
    main().querySelector('#cR').onchange = (e) => { G.retencion = e.target.value ? Number(e.target.value) : null; guardar(); flash('ok', 'Retention updated'); };
  }
  function cwStream(g, st) {
    const evs = ((S().logs[g] || { streams: {} }).streams[st]) || [];
    pintar('CloudWatch', NAV_CW('logs'), [['CloudWatch', href('cloudwatch')], ['Log groups', href('cloudwatch', 'logs')], [g, href('cloudwatch', 'logs', g)], [st.slice(0, 24), '']], `<h1 class="aw-h1">Log events</h1>${cont(esc(st), `<input class="aw-in" id="cF" placeholder="Filter events (texto)"><div class="aw-tabla-w"><table class="aw-tabla aws2-logs"><thead><tr><th>Timestamp</th><th>Message</th></tr></thead><tbody>${evs.map((e) => `<tr><td>${esc(e.t.replace('T', ' ').slice(0, 23))}</td><td><pre class="aws2-msg ${/ERROR|Traceback|Task timed out/.test(e.m) ? 'aws2-mal' : ''}">${esc(e.m)}</pre></td></tr>`).join('')}</tbody></table></div>`)}`);
    main().querySelector('#cF').oninput = (e) => { const q = e.target.value.toLowerCase(); main().querySelectorAll('.aws2-logs tbody tr').forEach((tr) => { tr.hidden = q && !tr.textContent.toLowerCase().includes(q); }); };
  }
  const EJ_INSIGHTS = [['Errores recientes', 'fields @timestamp, @message, @logStream\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 20'], ['Duración de cada invocación de Lambda', 'filter @message like /REPORT/\n| parse @message "Duration: * ms" as duracion\n| stats avg(duracion) as promedio_ms, max(duracion) as max_ms, count(*) as invocaciones'], ['Cold starts de Lambda', 'filter @message like /Init Duration/\n| parse @message "Init Duration: * ms" as init\n| fields @timestamp, init'], ['Filas leídas por corrida de Glue', 'filter @message like /Read/\n| parse @message "Read * records from * file" as filas, archivos\n| fields @timestamp, @logStream, filas, archivos'], ['Eventos por cada 5 minutos', 'stats count(*) as eventos by bin(5m)']];
  function cwInsights() {
    const s = S(); const gs = Object.keys(s.logs); const q0 = I().query(); const pre = q0.get('g');
    const sel = pre ? [pre] : (s.insightsSel || gs.slice(0, 2));
    pintar('CloudWatch', NAV_CW('insights'), [['CloudWatch', href('cloudwatch')], ['Logs Insights', '']], `<h1 class="aw-h1">Logs Insights</h1>${cont('Query', `<label class="aw-lbl">Log groups</label><select class="aw-in" id="iG" multiple size="${Math.min(6, Math.max(2, gs.length))}">${gs.map((g) => `<option ${sel.includes(g) ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select><div class="aws2-fila"><div><label class="aw-lbl">Time range</label><select class="aw-in" id="iR"><option value="60">1h</option><option value="180">3h</option><option value="720">12h</option><option value="1440" selected>1d</option><option value="10080">1w</option></select></div><div><label class="aw-lbl">Sample queries</label><select class="aw-in" id="iE"><option value="">-</option>${EJ_INSIGHTS.map((x, i) => `<option value="${i}">${esc(x[0])}</option>`).join('')}</select></div></div><textarea class="aw-sql" id="iQ" spellcheck="false">${esc(s.insightsQ || EJ_INSIGHTS[0][1])}</textarea>`, btn('Run query', 'data-run', 'primario'), 'Logs Insights consulta varios log groups a la vez con comandos encadenados por |. Se cobra por GB escaneado.')}<div id="iOut"></div>`);
    const M = main();
    M.querySelector('#iE').onchange = (e) => { if (e.target.value !== '') M.querySelector('#iQ').value = EJ_INSIGHTS[Number(e.target.value)][1]; };
    M.querySelector('[data-run]').onclick = () => {
      const grupos = [...M.querySelector('#iG').selectedOptions].map((o) => o.value); const q = M.querySelector('#iQ').value; s.insightsSel = grupos; s.insightsQ = q; guardar();
      const out = M.querySelector('#iOut'); if (!grupos.length) { out.innerHTML = `<div class="aw-alerta aw-alerta-aviso">${ic('aviso')} Elige al menos un log group.</div>`; return; }
      try { const r = insights(grupos, q, Date.now() - Number(M.querySelector('#iR').value) * 60000); const bytes = grupos.reduce((a, g) => a + Object.values((s.logs[g] || { streams: {} }).streams).reduce((x, st) => x + st.reduce((y, e) => y + e.m.length, 0), 0), 0); usar('Amazon CloudWatch', 'Logs Insights (GB scanned)', bytes / 1024 ** 3, 'GB', (bytes / 1024 ** 3) * 0.005, 'insights');
        out.innerHTML = cont(`Logs <span class="aw-cnt">(${r.filas.length} records · ${bytes.toLocaleString('en-US')} bytes scanned)</span>`, tabla(r.campos.map(esc), r.filas.map((f) => `<tr>${r.campos.map((c) => `<td><pre class="aws2-msg">${esc(f[c] == null ? '' : f[c])}</pre></td>`).join('')}</tr>`), 'No records found.'));
      } catch (e) { out.innerHTML = `<div class="aw-alerta aw-alerta-aviso">${ic('mal')} <span>${esc(e.message)}</span></div>`; }
    };
  }
  const CATALOGO_MET = () => { const s = S(); const out = []; for (const n of Object.keys(s.lambdas)) for (const m of ['Invocations', 'Errors', 'Duration']) out.push(['AWS/Lambda', m, { FunctionName: n }]); for (const n of Object.keys(s.sfn)) for (const m of ['ExecutionsStarted', 'ExecutionsSucceeded', 'ExecutionsFailed', 'ExecutionTime']) out.push(['AWS/States', m, { StateMachineArn: n }]); for (const n of Object.keys(s.glueJobs)) for (const m of ['glue.driver.aggregate.recordsRead', 'glue.driver.aggregate.numFailedTasks']) out.push(['Glue', m, { JobName: n }]); return out; };
  const claveMet = (x) => `${x[0]}|${x[1]}|${JSON.stringify(x[2])}`;
  function grafMet(ps, estad) {
    const W = 640, H = 170, L = 44; const ahoraMs = Date.now(); const ini = ahoraMs - 3 * 3600000; const per = 5 * 60000; const n = 36;
    const vals = Array.from({ length: n }, (_, i) => { const a = ini + i * per; const v = ps.filter((p) => { const t = new Date(p.t).getTime(); return t >= a && t < a + per; }).map((p) => p.v); return v.length ? ESTADISTICA[estad](v) : null; });
    const mx = Math.max(1, ...vals.filter((v) => v != null)); const X = (i) => L + (i / (n - 1)) * (W - L - 10); const Y = (v) => H - 22 - (v / mx) * (H - 34);
    return `<svg viewBox="0 0 ${W} ${H}" class="aws2-graf"><line x1="${L}" y1="${H - 22}" x2="${W}" y2="${H - 22}" stroke="currentColor" opacity=".3"/><text x="${L - 6}" y="${Y(mx) + 4}" font-size="10" text-anchor="end" fill="currentColor">${Math.round(mx * 100) / 100}</text>${vals.map((v, i) => (v == null ? '' : `<circle cx="${X(i)}" cy="${Y(v)}" r="3" fill="#2a7de1"><title>${new Date(ini + i * per).toISOString().slice(11, 16)} UTC: ${Math.round(v * 100) / 100}</title></circle>`)).join('')}<polyline fill="none" stroke="#2a7de1" stroke-width="1.6" points="${vals.map((v, i) => (v == null ? null : `${X(i)},${Y(v)}`)).filter(Boolean).join(' ')}"/>${[0, 12, 24, 35].map((i) => `<text x="${X(i)}" y="${H - 6}" font-size="10" text-anchor="middle" fill="currentColor">${new Date(ini + i * per).toISOString().slice(11, 16)}</text>`).join('')}</svg>`;
  }
  function cwMetricas() {
    const cat = CATALOGO_MET(); const s = S(); const sel = cat.find((x) => claveMet(x) === s.cwMet) || cat[0];
    const est = s.cwEst || 'Sum';
    pintar('CloudWatch', NAV_CW('metricas'), [['CloudWatch', href('cloudwatch')], ['Metrics', '']], `<h1 class="aw-h1">Metrics</h1>${cat.length ? cont('Graphed metric', `<div class="aws2-fila"><div><label class="aw-lbl">Metric</label><select class="aw-in" id="mS">${cat.map((x) => `<option value="${esc(claveMet(x))}" ${x === sel ? 'selected' : ''}>${esc(x[0])} · ${esc(Object.values(x[2])[0])} · ${esc(x[1])}</option>`).join('')}</select></div><div><label class="aw-lbl">Statistic (period 5 min)</label><select class="aw-in" id="mE">${Object.keys(ESTADISTICA).map((x) => `<option ${x === est ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>${grafMet(puntos(sel[0], sel[1], sel[2], Date.now() - 3 * 3600000), est)}<p class="aw-dim">Últimas 3 horas, en UTC. Cada punto resume 5 minutos con la estadística elegida: para contar errores, <b>Sum</b>; para tiempos, <b>Average</b> o <b>Maximum</b>.</p>`, btn('Create alarm', 'data-alarma', 'primario')) : cont('Metrics', '<p class="aw-dim">Todavía no hay métricas: crea una función Lambda, una máquina de estados o un job de Glue.</p>')}`);
    const M = main(); if (!cat.length) return;
    M.querySelector('#mS').onchange = (e) => { s.cwMet = e.target.value; guardar(); cwMetricas(); };
    M.querySelector('#mE').onchange = (e) => { s.cwEst = e.target.value; guardar(); cwMetricas(); };
    M.querySelector('[data-alarma]').onclick = () => crearAlarma(sel, est);
  }
  function crearAlarma(met, est) {
    const s = S(); const cat = CATALOGO_MET(); const m0 = met || cat[0]; if (!m0) return flash('mal', 'No hay métricas todavía.');
    modal(`<h2>Create alarm</h2><label class="aw-lbl">Metric</label><select class="aw-in" id="aM">${cat.map((x) => `<option value="${esc(claveMet(x))}" ${claveMet(x) === claveMet(m0) ? 'selected' : ''}>${esc(x[0])} · ${esc(Object.values(x[2])[0])} · ${esc(x[1])}</option>`).join('')}</select>
      <div class="aws2-fila"><div><label class="aw-lbl">Statistic</label><select class="aw-in" id="aE">${Object.keys(ESTADISTICA).map((x) => `<option ${x === (est || 'Sum') ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div><label class="aw-lbl">Period</label><select class="aw-in" id="aP"><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="60" selected>1 hour</option></select></div></div>
      <div class="aws2-fila"><div><label class="aw-lbl">Whenever the metric is…</label><select class="aw-in" id="aC">${Object.entries(COMP).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></div><div><label class="aw-lbl">than (threshold)</label><input class="aw-in" id="aU" value="0"></div></div>
      <label class="aw-lbl">Missing data treatment</label><select class="aw-in" id="aF"><option value="missing">Treat missing data as missing</option><option value="notBreaching" selected>Treat missing data as good (not breaching threshold)</option><option value="breaching">Treat missing data as bad (breaching threshold)</option><option value="ignore">Ignore (maintain the alarm state)</option></select>
      <label class="aw-lbl">Notification · SNS topic (in ALARM)</label><select class="aw-in" id="aS"><option value="">(none)</option>${Object.keys(s.sns).map((t) => `<option>${esc(t)}</option>`).join('')}</select><label class="aw-lbl">Email endpoint for the topic - optional</label><input class="aw-in" id="aMail" placeholder="guardia@empresa.example">
      <label class="aw-lbl">Alarm name</label><input class="aw-in" id="aN" placeholder="lambda-errores">
      <div class="aw-modal-b">${btn('Cancel', 'data-cerrar', 'link')}${btn('Create alarm', 'id="aOk"', 'primario')}</div>`, (mm, cerrar) => {
      mm.querySelector('#aOk').onclick = () => {
        const nom = mm.querySelector('#aN').value.trim(); if (!/^[\w.-]{1,255}$/.test(nom)) return flash('mal', 'Alarm name: letras, números, ., - y _.'); if (s.alarmas.some((a) => a.nombre === nom)) return flash('mal', `An alarm named ${esc(nom)} already exists.`);
        const u = Number(mm.querySelector('#aU').value); if (Number.isNaN(u)) return flash('mal', 'Threshold must be a number.');
        const x = cat.find((c) => claveMet(c) === mm.querySelector('#aM').value); const top = mm.querySelector('#aS').value; const mail = mm.querySelector('#aMail').value.trim();
        if (top && mail) { s.sns[top].subs = s.sns[top].subs || []; if (!s.sns[top].subs.some((q) => (q.endpoint || q.ep) === mail)) s.sns[top].subs.push({ proto: 'email', ep: mail, protocolo: 'email', endpoint: mail, estado: 'Confirmed (simulado)' }); }
        s.alarmas.push({ nombre: nom, ns: x[0], metrica: x[1], dims: x[2], estadistica: mm.querySelector('#aE').value, periodo: Number(mm.querySelector('#aP').value), comparacion: mm.querySelector('#aC').value, umbral: u, faltantes: mm.querySelector('#aF').value, sns: top, estado: 'INSUFFICIENT_DATA', creada: ahora() });
        guardar(); cerrar(); evaluarAlarmas(); location.hash = href('cloudwatch', 'alarmas');
      };
    });
  }
  function cwAlarmas() {
    const s = S();
    pintar('CloudWatch', NAV_CW('alarmas'), [['CloudWatch', href('cloudwatch')], ['Alarms', '']], `<h1 class="aw-h1">Alarms <span class="aw-cnt">(${s.alarmas.length})</span></h1>
      ${cont('Alarms', tabla(['Name', 'State', 'Last state update', 'Conditions', 'Actions', ''], s.alarmas.map((a, i) => `<tr><td><b>${esc(a.nombre)}</b></td><td>${estadoHtml(a.estado)}</td><td>${fh((a.historial || [])[0] ? a.historial[0].t : a.creada)}</td><td>${esc(a.metrica)} (${esc(Object.values(a.dims)[0])}) ${esc(a.estadistica)} ${COMP[a.comparacion][0]} ${a.umbral} for 1 datapoint within ${a.periodo} min${a.valor != null ? ` <span class="aw-dim">· último ${a.valor}</span>` : ''}</td><td>${a.sns ? `SNS: ${esc(a.sns)}` : '<span class="aw-dim">No actions</span>'}</td><td>${btn('Delete', `data-del="${i}"`, 'link')}</td></tr>`), 'No alarms.'), `${btn(ic('refrescar'), 'data-ref aria-label="Refresh"')}${btn('Create alarm', 'data-crear', 'primario')}`, 'Una alarma vigila una métrica y cambia de estado: OK, ALARM o INSUFFICIENT_DATA (sin datos). Al pasar a ALARM, avisa por un tópico de SNS.')}
      ${cont('SNS topics', tabla(['Topic', 'Subscriptions', 'Last messages'], Object.entries(s.sns).map(([t, T]) => `<tr><td><code>${esc(t)}</code></td><td>${(T.subs || []).map((x) => esc(`${x.protocolo || x.proto}: ${x.endpoint || x.ep}`)).join('<br>') || '<span class="aw-dim">ninguna</span>'}</td><td>${(T.mensajes || []).slice(0, 3).map((x) => `<div><b>${esc(x.asunto)}</b> <span class="aw-dim">${fh(x.t)}</span><br><span class="aw-dim">${esc(String(x.mensaje || '').slice(0, 140))}</span></div>`).join('') || '-'}</td></tr>`), ''), btn('Create topic', 'data-top'), 'Amazon SNS reparte cada aviso a sus suscriptores (correo, SMS, otra cola o una Lambda). Nada se envía de verdad: los mensajes quedan aquí.')}`);
    const M = main();
    M.querySelector('[data-crear]').onclick = () => crearAlarma(null, null);
    M.querySelector('[data-ref]').onclick = () => cwAlarmas();
    M.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { s.alarmas.splice(Number(b.dataset.del), 1); guardar(); cwAlarmas(); }));
    M.querySelector('[data-top]').onclick = () => modal(`<h2>Create topic</h2><label class="aw-lbl">Name</label><input class="aw-in" id="tN" placeholder="guardia-datos"><label class="aw-lbl">Email subscription - optional</label><input class="aw-in" id="tM" placeholder="guardia@empresa.example"><div class="aw-modal-b">${btn('Cancel', 'data-cerrar', 'link')}${btn('Create topic', 'id="tOk"', 'primario')}</div>`, (mm, cerrar) => { mm.querySelector('#tOk').onclick = () => { const n = mm.querySelector('#tN').value.trim(); if (!/^[\w-]{1,256}$/.test(n)) return flash('mal', 'Topic name: letras, números, - y _.'); s.sns[n] = s.sns[n] || { subs: [], mensajes: [] }; const mail = mm.querySelector('#tM').value.trim(); if (mail) s.sns[n].subs.push({ proto: 'email', ep: mail, protocolo: 'email', endpoint: mail, estado: 'Confirmed (simulado)' }); guardar(); cerrar(); cwAlarmas(); }; });
  }

  // ---------------------------------------------------------------- Billing
  function billingVista() {
    const s = S(); revisarPresupuestos(); const c = costos(); const servs = Object.entries(c.porServ).sort((a, b) => b[1].total - a[1].total);
    const usd = (v) => `$${v < 0.01 && v > 0 ? v.toFixed(6) : v.toFixed(2)}`;
    const lam = s.uso.filter((u) => u.servicio === 'AWS Lambda'); const req = lam.filter((u) => u.tipo === 'Requests').length; const gbs = lam.filter((u) => /GB-second/.test(u.tipo)).reduce((a, b) => a + b.cantidad, 0); const tr = s.uso.filter((u) => u.servicio === 'AWS Step Functions').reduce((a, b) => a + b.cantidad, 0);
    pintar('Billing and Cost Management', navLinks([['home', 'Home', href('billing')], ['#Budgets'], ['budgets', 'Budgets', href('billing')]], 'home'), [['Billing and Cost Management', '']], `<h1 class="aw-h1">Billing and Cost Management</h1>
      ${cont('Cost summary (month-to-date)', `<div class="aw-stats"><div><b>${usd(c.total)}</b><span>Month-to-date cost (sin Free Tier)</span></div><div><b>${servs.length}</b><span>Services with usage</span></div><div><b>${(c.bytes / 1024).toFixed(1)} KB</b><span>Stored in S3</span></div></div><p class="aw-dim">Precios públicos aproximados de us-east-1: Glue US$0,44 por DPU-hora (mínimo 1 minuto), Athena US$5 por TB escaneado (mínimo 10 MB por consulta), Lambda US$0,20 por millón de invocaciones + US$0,0000166667 por GB-segundo, Step Functions US$0,025 por cada 1.000 transiciones, S3 Standard US$0,023 por GB-mes.</p>`)}
      ${cont('Cost by service', tabla(['Service', 'Usage type', 'Quantity', 'Cost'], servs.flatMap(([sv, x]) => Object.entries(x.items).map(([t, it], i) => `<tr><td>${i ? '' : `<b>${esc(sv)}</b> <span class="aw-dim">${usd(x.total)}</span>`}</td><td>${esc(t)}</td><td>${Math.round(it.cant * 10000) / 10000} ${esc(it.unidad)}</td><td>${usd(it.costo)}</td></tr>`)), 'Todavía no hay uso registrado.'))}
      ${cont('Free Tier', tabla(['Service', 'Free Tier usage limit', 'Month-to-date usage', '% used'], [['AWS Lambda', '1,000,000 requests', req.toLocaleString('en-US'), (req / 1e6) * 100], ['AWS Lambda', '400,000 GB-seconds', gbs.toFixed(3), (gbs / 4e5) * 100], ['AWS Step Functions', '4,000 state transitions', tr, (tr / 4000) * 100]].map((x) => `<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td>${x[3].toFixed(4)}%</td></tr>`), ''), '', 'El Free Tier de Lambda y Step Functions es permanente; Glue y Athena no tienen. Con estos volúmenes, la factura real sería US$0, pero en producción los mismos precios multiplicados por millones de filas sí importan.')}
      ${cont(`Budgets <span class="aw-cnt">(${s.presupuestos.length})</span>`, tabla(['Name', 'Budgeted amount', 'Actual', '% of budget', 'Alerts'], s.presupuestos.map((b, i) => `<tr><td>${esc(b.nombre)}</td><td>${usd(b.monto)}</td><td>${usd(c.total)}</td><td>${((c.total / b.monto) * 100).toFixed(2)}%</td><td>${(b.umbrales || []).map((u) => `${u}%${(b.avisados || []).includes(u) ? ' ✓' : ''}`).join(', ')} → SNS ${esc(b.sns || 'alertas-datos')} ${btn('Delete', `data-bq="${i}"`, 'link')}</td></tr>`), 'No budgets. En una cuenta nueva, lo primero que se crea es un presupuesto con alertas.'), btn('Create budget', 'data-bud', 'primario'))}`);
    const M = main();
    M.querySelectorAll('[data-bq]').forEach((b) => (b.onclick = () => { s.presupuestos.splice(Number(b.dataset.bq), 1); guardar(); billingVista(); }));
    M.querySelector('[data-bud]').onclick = () => modal(`<h2>Create budget · Cost budget</h2><label class="aw-lbl">Budget name</label><input class="aw-in" id="bN" placeholder="lago-datos-mensual"><label class="aw-lbl">Budgeted amount ($, monthly)</label><input class="aw-in" id="bM" value="0.01"><label class="aw-lbl">Alert thresholds (% of actual cost, separadas por coma)</label><input class="aw-in" id="bU" value="50, 80, 100"><label class="aw-lbl">SNS topic</label><select class="aw-in" id="bS">${Object.keys(s.sns).map((t) => `<option>${esc(t)}</option>`).join('')}</select><div class="aw-modal-b">${btn('Cancel', 'data-cerrar', 'link')}${btn('Create budget', 'id="bOk"', 'primario')}</div>`, (mm, cerrar) => { mm.querySelector('#bOk').onclick = () => { const n = mm.querySelector('#bN').value.trim(); const mo = Number(mm.querySelector('#bM').value); if (!n) return flash('mal', 'Budget name is required.'); if (!(mo > 0)) return flash('mal', 'Budgeted amount must be greater than 0.'); s.presupuestos.push({ nombre: n, monto: mo, umbrales: mm.querySelector('#bU').value.split(',').map((x) => Number(x.trim())).filter((x) => x > 0), sns: mm.querySelector('#bS').value, creado: ahora(), avisados: [] }); guardar(); cerrar(); billingVista(); }; });
  }

  // estilos propios (el resto viene de aws.css)
  if (!document.getElementById('aws2Css')) { const st = document.createElement('style'); st.id = 'aws2Css'; st.textContent = `.aws2-st{font-weight:700;display:inline-flex;gap:4px;align-items:center}.aws2-succeeded,.aws2-ok,.aws2-enabled,.aws2-active{color:var(--ok)}.aws2-failed,.aws2-alarm,.aws2-timed_out{color:var(--mal)}.aws2-running{color:var(--info)}.aws2-insufficient_data{color:var(--t2)}.aws2-mal{color:var(--mal)}.aws2-barra{display:flex;gap:8px;justify-content:flex-end;margin:-6px 0 8px}.aws2-lienzo{display:flex;flex-direction:column;gap:10px;max-width:900px}.aws2-nodo{border:1px solid var(--bd);border-left:4px solid var(--info);border-radius:10px;padding:10px 14px;background:var(--bg)}.aws2-src{border-left-color:#7aa116}.aws2-tr{border-left-color:#8c4fff}.aws2-dst{border-left-color:#ed7100}.aws2-nodo-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}.aws2-add{display:flex;gap:6px;flex-wrap:wrap}.aws2-fila{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.aws2-sfn{grid-template-columns:minmax(260px,1fr) minmax(280px,1.3fr)}.aws2-map td{padding:3px}.aws2-fn{display:flex;gap:16px;align-items:center;flex-wrap:wrap;border:1px solid var(--bd);border-radius:10px;padding:10px 14px;margin-bottom:10px}.aws2-fn-c{display:flex;gap:6px;align-items:center}.aws2-trig{border:1px solid var(--bd);border-radius:8px;padding:4px 10px;font-size:13px}.aws2-ide{display:grid;grid-template-columns:170px 1fr;border:1px solid var(--bd);border-radius:8px;overflow:hidden}.aws2-ide-f{padding:10px;font-size:12.5px;border-right:1px solid var(--bd);background:var(--bg2)}.aws2-ide .aw-sql{border-top:0;min-height:320px}.aws2-grafo{display:flex;flex-direction:column;align-items:center;gap:2px}.aws2-gn{border:2px solid var(--bd);border-radius:8px;padding:6px 12px;min-width:200px;text-align:center;display:flex;flex-direction:column;background:var(--bg)}.aws2-ini{min-width:80px;border-radius:20px;font-size:12px}.aws2-g-succeeded{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,var(--bg))}.aws2-g-failed{border-color:var(--mal);background:color-mix(in srgb,var(--mal) 12%,var(--bg))}.aws2-g-caught{border-color:var(--am);background:color-mix(in srgb,var(--am) 14%,var(--bg))}.aws2-g-running{border-color:var(--info);background:color-mix(in srgb,var(--info) 12%,var(--bg))}.aws2-gflecha{color:var(--t2)}.aws2-fila-mal td{color:var(--mal)}.aws2-det{max-width:460px;font-size:12px;word-break:break-word}.aws2-msg{margin:0;white-space:pre-wrap;word-break:break-word;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace}.aws2-graf{width:100%;max-width:760px;height:auto;color:var(--t2)}@media (max-width:720px){.aws2-ide{grid-template-columns:1fr}.aws2-ide-f{border-right:0;border-bottom:1px solid var(--bd)}}`; document.head.append(st); }

  window.AwsServicios = { rutas: { lambda: lambdaVista, stepfunctions: sfnVista, cloudwatch: cwVista, billing: billingVista }, glueJobs };
})();
