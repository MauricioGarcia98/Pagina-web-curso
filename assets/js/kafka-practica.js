/* Kafka de práctica: un registro de clústeres (Event Hubs con protocolo Kafka) que usan los proyectos.
 *
 * KafkaPractica.registrar(cluster) con:
 *   { broker: 'host:9093', autenticar(X) → { ok } | { ok: false, msg, pista },
 *     temas(t) → [{ tema, particiones, rangos: [{ p, bajo, alto }] }],
 *     leer(tema, p, desde, hasta) → { mensajes: [{ offset, ts, clave, valor }], perdidos },
 *     offsetPorTiempo(tema, p, ms), grupos() → objeto donde guardar los offsets de los grupos, alPerder?(n), guardar() }
 *
 * Da: el comando kcat (con grupos, particiones y retención) y leerParaSql() para read_kafka en Databricks, con
 * checkpoint para las tablas de streaming (cada REFRESH lee solo lo nuevo).
 */
(function () {
  'use strict';
  const clusters = [];
  const host = (b) => String(b || '').split(',')[0].trim();
  const buscar = (b) => clusters.find((c) => host(c.broker).split(':')[0] === host(b).split(':')[0]);
  function registrar(c) { const i = clusters.findIndex((x) => x.broker === c.broker); if (i >= 0) clusters[i] = c; else clusters.push(c); }

  const Sh = window.Shell;
  if (Sh && Sh.def) {
    const col = Sh.col;
    const AYUDA = `kcat - cliente genérico de Kafka (productor y consumidor), versión 1.7.1 (simulado)

Uso: kcat <opciones> [tópico1 tópico2 ..]

  -C              modo consumidor        -L        lista metadatos (brokers, tópicos y particiones)
  -G <grupo>      consumidor de un grupo: guarda el offset de cada partición (los tópicos van al final)
  -b <brokers>    servidores (host:puerto)
  -t <tópico>     tópico a leer          -p <n>    solo esa partición (por defecto: todas)
  -o <offset>     beginning | end | stored | <n> | -<n> (desde el final) | s@<ms> (desde un tiempo)
  -c <n>          termina después de n mensajes
  -e              termina al llegar al final
  -f <formato>    %t tópico  %p partición  %o offset  %k clave  %s valor  %T timestamp (ms)  %S tamaño  \\n \\t
  -J              cada mensaje como JSON (con partición, offset, timestamp, clave y valor)
  -X <prop=valor> propiedad de librdkafka (security.protocol, sasl.mechanisms, sasl.username, sasl.password…)
  -F <archivo>    propiedades desde un archivo (prop=valor por línea). Por defecto: ~/.config/kcat.conf
  -q              silencioso            -Z        NULL para valores nulos`;
    Sh.def('kcat', 'cliente de Kafka: kcat -b broker -C -t tópico -o beginning -e', async (a) => {
      if (!a.length || a.includes('-h') || a.includes('--help')) return Sh.ok(AYUDA);
      if (a.includes('-V')) return Sh.ok('kcat - Apache Kafka producer and consumer tool\nhttps://github.com/edenhill/kcat\nVersion 1.7.1 (JSON, Avro, Transactions, IncrementalAssign, librdkafka 2.4.0 builtin.features=gzip,snappy,ssl,sasl,regex,lz4,sasl_plain,sasl_scram,plugins,zstd,sasl_oauthbearer,http,oidc)');
      const X = {}; let modo = null, broker = null, tema = null, grupo = null, off = null, cuenta = null, fmt = null, json = false, quiet = false, fin = false, nulos = false, archivoCfg = null, part = null; const pos = [];
      for (let i = 0; i < a.length; i++) {
        const x = a[i]; const val = () => a[++i];
        if (x === '-C' || x === '-L' || x === '-P' || x === '-Q') modo = x;
        else if (x === '-b') broker = val(); else if (x === '-t') tema = val(); else if (x === '-G') { grupo = val(); modo = modo || '-C'; }
        else if (x === '-o') off = val(); else if (x === '-c') cuenta = Number(val()); else if (x === '-f') fmt = val(); else if (x === '-F') archivoCfg = val(); else if (x === '-p') part = Number(val());
        else if (x === '-X') { const kv = String(val() || ''); const k = kv.indexOf('='); if (k > 0) X[kv.slice(0, k).trim()] = kv.slice(k + 1); }
        else if (x === '-J') json = true; else if (x === '-q') quiet = true; else if (x === '-e') fin = true; else if (x === '-Z') nulos = true;
        else if (/^-[a-zA-Z]$/.test(x)) { /* opción no usada */ } else pos.push(x);
      }
      const rutaCfg = archivoCfg ? Sh.norm(archivoCfg) : Sh.HOME + '/.config/kcat.conf';
      const txtCfg = Sh.readFile(rutaCfg);
      if (archivoCfg && txtCfg === null) return Sh.fail(`% ERROR: Failed to open ${archivoCfg}: No such file or directory`, 1);
      if (txtCfg) for (const l of txtCfg.split('\n')) { const s = l.trim(); if (!s || s.startsWith('#')) continue; const k = s.indexOf('='); if (k > 0 && X[s.slice(0, k).trim()] === undefined) X[s.slice(0, k).trim()] = s.slice(k + 1).trim(); }
      broker = broker || X['bootstrap.servers'] || X['metadata.broker.list'];
      if (!modo) return Sh.fail('% ERROR: Specify mode: -C (consumer), -P (producer) or -L (metadata list)\nUsa kcat -h para ver las opciones.', 1);
      if (!broker) return Sh.fail('% ERROR: No brokers configured. Usa -b host:puerto (o bootstrap.servers en el archivo de configuración).', 1);
      const C = buscar(broker);
      if (!C) return Sh.fail(`%3|FAIL|rdkafka#consumer-1| [thrd:${broker}/bootstrap]: ${broker}/bootstrap: Failed to resolve '${host(broker).split(':')[0]}': Name or service not known\n% ERROR: Failed to query metadata: Local: Broker transport failure`, 1);
      if (!/:9093$/.test(host(broker))) return Sh.fail(`%3|FAIL|rdkafka#consumer-1| [thrd:${broker}/bootstrap]: Connect to ${broker} failed: Connection refused\n% ERROR: Failed to query metadata: Local: Broker transport failure\n${col.dim('(Event Hubs atiende Kafka en el puerto 9093)')}`, 1);
      if (modo === '-P') return Sh.fail('% ERROR: Topic authorization failed: la clave del equipo de datos solo tiene permiso de lectura (Listen).', 1);
      const au = C.autenticar(X); if (!au.ok) return Sh.fail(au.msg + '\n' + col.dim('(' + au.pista + ')'), 1);
      const temas = C.temas();
      if (modo === '-L') {
        const lista = tema ? temas.filter((x) => x.tema === tema) : temas;
        if (tema && !lista.length) return Sh.fail(`% ERROR: Topic ${tema} error: Broker: Unknown topic or partition`, 1);
        return Sh.ok(`Metadata for ${tema || 'all topics'} (from broker 0: sasl_ssl://${host(C.broker)}/0):\n 1 brokers:\n  broker 0 at ${host(C.broker)} (controller)\n ${lista.length} topics:\n` + lista.map((x) => `  topic "${x.tema}" with ${x.particiones} partitions:\n` + x.rangos.map((r) => `    partition ${r.p}, leader 0, replicas: 0, isrs: 0`).join('\n')).join('\n'));
      }
      if (modo === '-Q') return Sh.fail('% ERROR: -Q no está disponible en esta práctica. Para empezar desde un momento, usa -o s@<milisegundos>.', 1);
      const lista = grupo ? pos : [tema];
      if (!lista.length || !lista[0]) return Sh.fail(grupo ? '% ERROR: Topic(s) required for balanced consumer (-G grupo tópico1 tópico2)' : '% ERROR: -t <topic> missing', 1);
      const salida = [], avisos = []; let restantes = Number.isFinite(cuenta) && cuenta > 0 ? cuenta : Infinity;
      const G = grupo ? ((C.grupos()[grupo] = C.grupos()[grupo] || {})) : null; let perdidosTot = 0;
      for (const tp of lista) {
        const info = temas.find((x) => x.tema === tp);
        if (!info) { avisos.push(`% ERROR: Topic ${tp} error: Broker: Unknown topic or partition`); continue; }
        for (const r of info.rangos) {
          if (part != null && r.p !== part) continue;
          const kp = info.particiones > 1 ? `${tp}:${r.p}` : tp;
          let desde; const o = off == null ? (grupo ? 'stored' : 'beginning') : off;
          if (grupo && (o === 'stored' || off == null) && G[kp] != null) desde = G[kp];
          else if (o === 'beginning' || o === 'earliest') desde = r.bajo;
          else if (o === 'end' || o === 'latest' || (grupo && o === 'stored')) desde = r.alto;
          else if (/^-\d+$/.test(o)) desde = Math.max(r.bajo, r.alto + Number(o));
          else if (/^s@\d+$/.test(o)) desde = C.offsetPorTiempo(tp, r.p, Number(o.slice(2)));
          else if (/^\d+$/.test(o)) desde = Number(o);
          else return Sh.fail(`% ERROR: Invalid offset: ${o}`, 1);
          if (desde > r.alto) desde = r.alto;
          const res = C.leer(tp, r.p, desde, null);
          if (res.perdidos) { perdidosTot += res.perdidos; avisos.push(`%4|OFFSET|rdkafka#consumer-1| [thrd:main]: ${tp} [${r.p}]: offset reset (at offset ${desde}, broker 0) to offset BEGINNING (leader epoch -1): fetch failed due to requested offset not available on the broker: Broker: Offset out of range\n${col.dim(`  (se perdieron ${res.perdidos} mensajes: venció la retención del tópico)`)}`); }
          let ultimo = Math.max(desde, r.bajo);
          for (const m of res.mensajes) {
            if (restantes <= 0) break; restantes--; ultimo = m.offset + 1;
            if (json) salida.push(JSON.stringify({ topic: tp, partition: r.p, offset: m.offset, tstype: 'create', ts: m.ts, broker: 0, headers: null, key: m.clave, payload: m.valor }));
            else if (fmt) salida.push(fmt.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/%([tpoksTSK])/g, (_, c) => ({ t: tp, p: String(r.p), o: String(m.offset), k: m.clave, s: m.valor == null ? (nulos ? 'NULL' : '') : m.valor, T: String(m.ts), S: String((m.valor || '').length), K: String((m.clave || '').length) }[c])).replace(/\n$/, ''));
            else salida.push(m.valor == null ? (nulos ? 'NULL' : '') : m.valor);
          }
          if (G) G[kp] = ultimo;
          if (!quiet && restantes > 0) avisos.push(`% Reached end of topic ${tp} [${r.p}] at offset ${ultimo}`);
        }
      }
      if (perdidosTot && G && C.alPerder) C.alPerder(perdidosTot);
      if (G && C.guardar) C.guardar();
      if (fin && !quiet && avisos.length) avisos[avisos.length - 1] += ': exiting';
      if (!fin && restantes > 0 && !quiet) avisos.push(col.dim('(un consumidor de verdad se queda esperando mensajes nuevos hasta Ctrl+C; en la práctica termina acá. Usa -e para terminar al llegar al final)'));
      return { out: salida.join('\n'), err: avisos.length ? avisos.join('\n') : null, code: avisos.some((x) => x.startsWith('% ERROR')) ? 1 : 0 };
    });
    Sh.Commands.kafkacat = Sh.Commands.kcat;
  }

  // ---------------------------------------------------------------- read_kafka (Databricks)
  function leerParaSql(op, ctx = {}) {
    const error = (msg, codigo) => { const e = new Error(msg); e.codigo = codigo; throw e; };
    const servidores = op.bootstrapServers || op['kafka.bootstrap.servers'];
    if (!servidores) error("read_kafka necesita bootstrapServers => 'host:9093'", 'MISSING_OPTION');
    const temaTxt = op.subscribe || op.assign; if (!temaTxt) error("read_kafka necesita subscribe => '<tópico>'", 'MISSING_OPTION');
    const C = buscar(servidores);
    if (!C || !/:9093$/.test(host(servidores))) error(`Timed out waiting for a node assignment. Call: describeTopics (no se pudo conectar a ${servidores})`, 'KAFKA_TIMEOUT');
    const jaas = op['kafka.sasl.jaas.config'] || '';
    const u = /username\s*=\s*"([^"]*)"/.exec(jaas), p = /password\s*=\s*"([^"]*)"/.exec(jaas);
    const au = C.autenticar({ 'security.protocol': op['kafka.security.protocol'], 'sasl.mechanisms': op['kafka.sasl.mechanism'], 'sasl.username': u ? u[1] : undefined, 'sasl.password': p ? p[1] : undefined });
    if (!au.ok) error(`org.apache.kafka.common.errors.SaslAuthenticationException: ${String(au.msg).split('\n')[0].replace(/^.*?: (?=SASL|Disconnected)/, '')}. ${au.pista}. Opciones: kafka.security.protocol => 'SASL_SSL', kafka.sasl.mechanism => 'PLAIN', kafka.sasl.jaas.config => 'kafkashaded.org.apache.kafka.common.security.plain.PlainLoginModule required username="$ConnectionString" password="<cadena de conexión>";'`, 'KAFKA_AUTH');
    const temas = C.temas(); const cols = ['key', 'value', 'topic', 'partition', 'offset', 'timestamp', 'timestampType']; const filas = [];
    let ini = {}, finO = {};
    try { if (op.startingOffsets && op.startingOffsets.trim().startsWith('{')) ini = JSON.parse(op.startingOffsets); if (op.endingOffsets && op.endingOffsets.trim().startsWith('{')) finO = JSON.parse(op.endingOffsets); } catch (e) { error(`startingOffsets/endingOffsets no es un JSON válido: ${e.message}`, 'INVALID_OPTION'); }
    for (const tp of String(temaTxt).split(',').map((x) => x.trim())) {
      const info = temas.find((x) => x.tema === tp); if (!info) error(`UnknownTopicOrPartitionException: This server does not host this topic-partition (${tp}).`, 'KAFKA_TOPIC');
      for (const r of info.rangos) {
        const kp = `${tp}:${r.p}`;
        let desde = String(op.startingOffsets || 'earliest') === 'latest' ? r.alto : r.bajo;
        if (ini[tp] && ini[tp][String(r.p)] != null) { const v = Number(ini[tp][String(r.p)]); desde = v === -2 ? r.bajo : v === -1 ? r.alto : v; }
        if (op.startingTimestamp) desde = C.offsetPorTiempo(tp, r.p, Number(op.startingTimestamp));
        if (ctx.checkpoint && ctx.checkpoint[kp] != null) desde = ctx.checkpoint[kp];
        let hasta = r.alto; if (finO[tp] && finO[tp][String(r.p)] != null && Number(finO[tp][String(r.p)]) >= 0) hasta = Math.min(r.alto, Number(finO[tp][String(r.p)]));
        if (desde < r.bajo && String(op.failOnDataLoss || 'true') !== 'false') error(`Some data may have been lost because they are not available in Kafka any more; either the data was aged out by Kafka or the topic may have been deleted before all the data in the topic was processed. Requested offset ${desde} for ${tp}-${r.p}, earliest available ${r.bajo}. If you want your query to continue, set failOnDataLoss => 'false'.`, 'KAFKA_DATA_LOSS');
        const res = C.leer(tp, r.p, Math.max(desde, r.bajo), hasta);
        for (const m of res.mensajes) filas.push([m.clave, m.valor, tp, r.p, m.offset, new Date(m.ts).toISOString().replace('T', ' ').replace('Z', ''), 0]);
        if (ctx.leidos) ctx.leidos[kp] = Math.max(ctx.leidos[kp] || 0, hasta);
      }
    }
    return { cols, filas };
  }

  window.KafkaPractica = { registrar, buscar, clusters, leerParaSql };
  window.MercadoVecinoKafka = { leerParaSql: (op) => leerParaSql(op) }; // compatibilidad
})();
