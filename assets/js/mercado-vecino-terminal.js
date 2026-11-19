/* Mercado Vecino en la terminal y en el lago.
 *
 * - psql contra la réplica de lectura (mv-prod-replica.postgres.database.azure.com): un PostgreSQL real (PGlite)
 *   cargado con el estado de la base de hace unos segundos (la réplica va un poco atrás). Solo lectura.
 * - kcat contra el Event Hubs del CDC (mv-eventos.servicebus.windows.net:9093): consumidor Kafka con grupos,
 *   offsets guardados y retención de 24 horas.
 * - pagoya: la CLI de la pasarela para dar de alta el endpoint de webhooks del equipo de datos.
 * - La función receptora de webhooks: guarda cada entrega tal como llegó en el contenedor del lago que configuraste.
 * - read_kafka para el Databricks de práctica (MercadoVecinoKafka.leerParaSql).
 */
(function () {
  'use strict';
  const MV = window.MercadoVecinoMundo, Host = window.MercadoVecinoHost;
  if (!MV || !Host) return;
  const Sh = window.Shell;
  const col = (Sh && Sh.col) || { dim: (x) => x, err: (x) => x };
  const guardarTodo = () => { Host.guardar(); try { window.CloudSim && window.CloudSim.save(); } catch (e) { /* nada */ } };

  // ================================================================== función receptora de webhooks → lago
  const DIAS_VIDA_WEBHOOKS = 3; // regla de ciclo de vida del contenedor: borra las entregas de más de 3 días
  function sincronizarWebhooks() {
    const D = Host.datos(); const W = D && D.webhook; if (!W || W.pausado || !window.CloudSim) return 0;
    Host.sincronizar();
    const A = (window.CloudSim.az().storage || {})[W.cuenta]; const C = A && (A.containers || {})[W.contenedor];
    if (!C) { W.error = `La función no puede escribir: no existe ${W.contenedor} en la cuenta ${W.cuenta}. PagoYa reintenta hasta 3 días.`; return 0; }
    W.error = null; C.blobs = C.blobs || {};
    const t = MV.ahora(); const desde = W.hasta || W.alta;
    const L = MV.entregas(W.alta, desde, t, W.tipos);
    for (const e of L) {
      const iso = new Date(e.recibido).toISOString();
      C.blobs[`${W.prefijo}/fecha=${iso.slice(0, 10)}/hora=${iso.slice(11, 13)}/${e.entrega_id}.json`] = JSON.stringify({ entrega_id: e.entrega_id, recibido_en: iso, endpoint: e.endpoint, headers: e.headers, body: e.cuerpo }) + '\n';
    }
    const limite = new Date(t - DIAS_VIDA_WEBHOOKS * 86400000).toISOString().slice(0, 10);
    for (const b of Object.keys(C.blobs)) { const m = b.startsWith(W.prefijo + '/') && /\/fecha=(\d{4}-\d{2}-\d{2})\//.exec(b); if (m && m[1] < limite) delete C.blobs[b]; }
    W.hasta = t; W.recibidas = (W.recibidas || 0) + L.length;
    if (L.length) guardarTodo();
    return L.length;
  }
  setInterval(() => { try { sincronizarWebhooks(); } catch (e) { /* sin portal */ } }, 30000);
  // antes de leer el lago (Databricks, Snowflake, BigQuery), la función ya guardó lo que llegó
  if (window.LagoAzure && !window.LagoAzure.__mv) {
    const listar0 = window.LagoAzure.listar;
    window.LagoAzure.listar = function (uri) { try { sincronizarWebhooks(); } catch (e) { /* nada */ } return listar0.apply(this, arguments); };
    window.LagoAzure.__mv = true;
  }

  // ================================================================== Kafka (Event Hubs)
  const BROKER = () => MV.claves().eh.broker;
  function autenticar(X) {
    const C = MV.claves();
    const proto = String(X['security.protocol'] || '').toUpperCase();
    const mec = String(X['sasl.mechanisms'] || X['sasl.mechanism'] || '').toUpperCase();
    if (proto !== 'SASL_SSL') return { ok: false, msg: `%3|FAIL|rdkafka#consumer-1| [thrd:${BROKER()}/bootstrap]: ${BROKER()}/bootstrap: Disconnected while requesting ApiVersion: might be caused by incorrect security.protocol configuration (connecting to a SSL listener?) or broker version is < 0.10 (see api.version.request)\n% ERROR: Failed to query metadata: Local: Broker transport failure`, pista: 'Event Hubs solo acepta SASL_SSL: -X security.protocol=SASL_SSL -X sasl.mechanisms=PLAIN' };
    if (mec !== 'PLAIN' || X['sasl.username'] !== '$ConnectionString' || X['sasl.password'] !== C.eh.cs) {
      const pista = X['sasl.username'] === '' ? 'sasl.username llegó vacío: el shell reemplazó $ConnectionString por una variable que no existe. Escríbelo entre comillas simples: -X \'sasl.username=$ConnectionString\'' : X['sasl.username'] && X['sasl.username'] !== '$ConnectionString' ? 'En Event Hubs el usuario es literalmente $ConnectionString y la contraseña es la cadena de conexión completa.' : 'Revisa la cadena de conexión (sasl.password): tiene que ser la completa, con Endpoint=…;SharedAccessKeyName=…;SharedAccessKey=…';
      return { ok: false, msg: `%3|FAIL|rdkafka#consumer-1| [thrd:sasl_ssl://${BROKER()}/bootstrap]: sasl_ssl://${BROKER()}/bootstrap: SASL authentication error: Authentication failed during authentication due to invalid credentials with SASL mechanism PLAIN\n% ERROR: Failed to query metadata: Local: Broker transport failure`, pista };
    }
    return { ok: true };
  }
  function grupos() { const D = Host.datos(); return D ? D.grupos : {}; }

  if (Sh && Sh.def) {
    // ---------------------------------------------------------------- kcat
    const AYUDA_KCAT = `kcat - cliente genérico de Kafka (productor y consumidor), versión 1.7.1 (simulada para Mercado Vecino)

Uso: kcat <opciones> [archivo1 archivo2 .. | tópico1 tópico2 ..]

  -C              modo consumidor        -L        lista metadatos (brokers y tópicos)
  -G <grupo>      consumidor de un grupo: guarda el offset (se pasan los tópicos al final)
  -b <brokers>    servidores (host:puerto)
  -t <tópico>     tópico a leer
  -o <offset>     beginning | end | stored | <n> | -<n> (desde el final) | s@<ms> (desde un tiempo)
  -c <n>          termina después de n mensajes
  -e              termina al llegar al final del tópico
  -f <formato>    %t tópico  %p partición  %o offset  %k clave  %s valor  %T timestamp (ms)  %S tamaño  \\n \\t
  -J              cada mensaje como JSON (con offset, timestamp, clave y valor)
  -X <prop=valor> propiedad de librdkafka (security.protocol, sasl.mechanisms, sasl.username, sasl.password…)
  -F <archivo>    lee propiedades de un archivo (una prop=valor por línea). Por defecto: ~/.config/kcat.conf
  -q              silencioso (sin los mensajes "% Reached end…")
  -Z              muestra NULL para valores nulos`;
    Sh.def('kcat', 'cliente de Kafka: kcat -b broker -C -t tópico -o beginning -e (el CDC de Mercado Vecino)', async (a) => {
      if (!a.length || a.includes('-h') || a.includes('--help')) return Sh.ok(AYUDA_KCAT);
      if (a.includes('-V')) return Sh.ok('kcat - Apache Kafka producer and consumer tool\nhttps://github.com/edenhill/kcat\nVersion 1.7.1 (JSON, Avro, Transactions, IncrementalAssign, librdkafka 2.4.0 builtin.features=gzip,snappy,ssl,sasl,regex,lz4,sasl_plain,sasl_scram,plugins,zstd,sasl_oauthbearer,http,oidc)');
      Host.sincronizar();
      const X = {}; let modo = null, broker = null, tema = null, grupo = null, off = null, cuenta = null, fmt = null, json = false, quiet = false, fin = false, nulos = false, archivoCfg = null; const pos = [];
      for (let i = 0; i < a.length; i++) {
        const x = a[i]; const val = () => a[++i];
        if (x === '-C' || x === '-L' || x === '-P' || x === '-Q') modo = x;
        else if (x === '-b') broker = val(); else if (x === '-t') tema = val(); else if (x === '-G') { grupo = val(); modo = modo || '-C'; }
        else if (x === '-o') off = val(); else if (x === '-c') cuenta = Number(val()); else if (x === '-f') fmt = val(); else if (x === '-F') archivoCfg = val();
        else if (x === '-X') { const kv = String(val() || ''); const k = kv.indexOf('='); if (k > 0) X[kv.slice(0, k).trim()] = kv.slice(k + 1); }
        else if (x === '-J') json = true; else if (x === '-q') quiet = true; else if (x === '-e') fin = true; else if (x === '-Z') nulos = true;
        else if (/^-[a-zA-Z]$/.test(x)) { /* opción no usada en la práctica */ } else pos.push(x);
      }
      // archivo de configuración (como el real: -F o ~/.config/kcat.conf)
      const rutaCfg = archivoCfg ? Sh.norm(archivoCfg) : Sh.HOME + '/.config/kcat.conf';
      const txtCfg = Sh.readFile(rutaCfg);
      if (archivoCfg && txtCfg === null) return Sh.fail(`% ERROR: Failed to open ${archivoCfg}: No such file or directory`, 1);
      if (txtCfg) for (const l of txtCfg.split('\n')) { const s = l.trim(); if (!s || s.startsWith('#')) continue; const k = s.indexOf('='); if (k > 0 && X[s.slice(0, k).trim()] === undefined) X[s.slice(0, k).trim()] = s.slice(k + 1).trim(); }
      broker = broker || X['bootstrap.servers'] || X['metadata.broker.list'];
      if (!modo) return Sh.fail('% ERROR: Specify mode: -C (consumer), -P (producer) or -L (metadata list)\nUsa kcat -h para ver las opciones.', 1);
      if (modo === '-P') return Sh.fail('% ERROR: Topic authorization failed: la clave lector-lago solo tiene permiso de lectura (Listen).', 1);
      if (!broker) return Sh.fail('% ERROR: No brokers configured. Usa -b host:puerto (o bootstrap.servers en el archivo de configuración).', 1);
      if (!/mv-eventos\.servicebus\.windows\.net(:9093)?$/.test(broker.split(',')[0])) return Sh.fail(`%3|FAIL|rdkafka#consumer-1| [thrd:${broker}/bootstrap]: ${broker}/bootstrap: Failed to resolve '${broker.split(':')[0]}': Name or service not known\n% ERROR: Failed to query metadata: Local: Broker transport failure`, 1);
      if (!/:9093$/.test(broker)) return Sh.fail(`%3|FAIL|rdkafka#consumer-1| [thrd:${broker}/bootstrap]: Connect to ${broker} failed: Connection refused\n% ERROR: Failed to query metadata: Local: Broker transport failure\n${col.dim('(Event Hubs atiende Kafka en el puerto 9093)')}`, 1);
      const au = autenticar(X); if (!au.ok) return Sh.fail(au.msg + '\n' + col.dim('(' + au.pista + ')'), 1);
      const temas = MV.kafkaTemas();
      if (modo === '-L') {
        const lista = tema ? temas.filter((x) => x.tema === tema) : temas;
        if (tema && !lista.length) return Sh.fail(`% ERROR: Topic ${tema} error: Broker: Unknown topic or partition`, 1);
        return Sh.ok(`Metadata for ${tema ? tema : 'all topics'} (from broker 0: sasl_ssl://${BROKER()}/0):\n 1 brokers:\n  broker 0 at ${BROKER()} (controller)\n ${lista.length} topics:\n` + lista.map((x) => `  topic "${x.tema}" with 1 partitions:\n    partition 0, leader 0, replicas: 0, isrs: 0`).join('\n'));
      }
      if (modo === '-Q') return Sh.fail('% ERROR: -Q no está disponible en esta práctica. Para empezar desde un momento, usa -o s@<milisegundos>.', 1);
      const lista = grupo ? pos : [tema];
      if (!lista.length || !lista[0]) return Sh.fail(grupo ? '% ERROR: Topic(s) required for balanced consumer (-G grupo tópico1 tópico2)' : '% ERROR: -t <topic> missing', 1);
      const salida = [], avisos = [];
      let restantes = Number.isFinite(cuenta) && cuenta > 0 ? cuenta : Infinity;
      const G = grupo ? (grupos()[grupo] = grupos()[grupo] || {}) : null;
      for (const tp of lista) {
        const info = temas.find((x) => x.tema === tp);
        if (!info) { avisos.push(`% ERROR: Topic ${tp} error: Broker: Unknown topic or partition`); continue; }
        let desde;
        const o = off == null ? (grupo ? 'stored' : 'beginning') : off;
        if (grupo && (o === 'stored' || off == null) && G[tp] != null) desde = G[tp];
        else if (o === 'beginning' || o === 'earliest') desde = info.bajo;
        else if (o === 'end' || o === 'latest' || (grupo && o === 'stored')) desde = info.alto;
        else if (/^-\d+$/.test(o)) desde = Math.max(info.bajo, info.alto + Number(o));
        else if (/^s@\d+$/.test(o)) desde = MV.offsetPorTiempo(tp, Number(o.slice(2)));
        else if (/^\d+$/.test(o)) desde = Number(o);
        else return Sh.fail(`% ERROR: Invalid offset: ${o}`, 1);
        if (desde > info.alto) desde = info.alto;
        const r = MV.kafkaLeer(tp, desde, null);
        if (r.perdidos) avisos.push(`%4|OFFSET|rdkafka#consumer-1| [thrd:main]: ${tp} [0]: offset reset (at offset ${desde}, broker 0) to offset BEGINNING (leader epoch -1): fetch failed due to requested offset not available on the broker: Broker: Offset out of range\n${col.dim(`  (se perdieron ${r.perdidos} mensajes: la retención del tópico es de 24 horas)`)}`);
        let ultimo = Math.max(desde, info.bajo);
        for (const m of r.mensajes) {
          if (restantes <= 0) break; restantes--; ultimo = m.offset + 1;
          if (json) salida.push(JSON.stringify({ topic: m.tema, partition: 0, offset: m.offset, tstype: 'create', ts: m.ts, broker: 0, headers: null, key: m.clave, payload: m.valor }));
          else if (fmt) salida.push(fmt.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/%([tpoksTSK])/g, (_, c) => ({ t: m.tema, p: '0', o: String(m.offset), k: m.clave, s: m.valor == null ? (nulos ? 'NULL' : '') : m.valor, T: String(m.ts), S: String((m.valor || '').length), K: String(m.clave.length) }[c])).replace(/\n$/, ''));
          else salida.push(m.valor == null ? (nulos ? 'NULL' : '') : m.valor);
        }
        if (G) { G[tp] = ultimo; if (r.perdidos) { const D = Host.datos(); D.perdioCdc = (D.perdioCdc || 0) + r.perdidos; } }
        if (!quiet && restantes > 0) avisos.push(`% Reached end of topic ${tp} [0] at offset ${ultimo}${fin ? (lista.indexOf(tp) === lista.length - 1 ? ': exiting' : '') : ''}`);
      }
      if (G) { const D = Host.datos(); D.ultimoConsumo = Date.now(); guardarTodo(); }
      if (!fin && restantes > 0 && !quiet) avisos.push(col.dim('(un consumidor de verdad se queda esperando mensajes nuevos hasta Ctrl+C; en la práctica termina acá. Usa -e para terminar al llegar al final)'));
      return { out: salida.join('\n'), err: avisos.length ? avisos.join('\n') : null, code: avisos.some((x) => x.startsWith('% ERROR')) ? 1 : 0 };
    });
    Sh.Commands.kafkacat = Sh.Commands.kcat;

    // ---------------------------------------------------------------- pagoya (CLI de la pasarela)
    const TIPOS_DEF = ['pago.aprobado', 'reembolso.creado', 'disputa.abierta', 'disputa.cerrada'];
    Sh.def('pagoya', 'CLI de PagoYa (la pasarela de Mercado Vecino): pagoya webhooks configurar|estado|pausar|reanudar', (a) => {
      Host.sincronizar(); const D = Host.datos(); if (!D) return Sh.fail('pagoya: el almacenamiento del navegador no está disponible.');
      const [g1, g2] = a; const { flags } = Sh.parseArgs(a.slice(g1 === 'eventos' ? 1 : 2));
      if (!g1 || g1 === 'ayuda' || g1 === '--help' || g1 === '-h') return Sh.ok(`pagoya — CLI de la pasarela de pagos (modo prueba, cuenta de Mercado Vecino)

  pagoya webhooks configurar --cuenta <cuenta> [--contenedor landing] [--prefijo pagoya/webhooks] [--eventos ${TIPOS_DEF.join(',')}]
        da de alta el endpoint del equipo de datos: la función receptora mv-webhooks guarda cada entrega
        en abfss://<contenedor>@<cuenta>.dfs.core.windows.net/<prefijo>/fecha=AAAA-MM-DD/hora=HH/<entrega>.json
  pagoya webhooks estado        qué llegó, desde cuándo, errores de escritura
  pagoya webhooks pausar | reanudar
  pagoya eventos [--limite 5]   los últimos eventos (lo mismo que GET /v1/eventos)

La clave secreta de la API y el secreto de firma están en el correo de accesos: mercado accesos`);
      if (g1 === 'eventos') { const r = MV.API.request('GET', `https://api.pagoya.example/v1/eventos?limite=${Number(flags['--limite']) || 5}`, { Authorization: 'Bearer ' + MV.claves().pagoya }); return Sh.ok(JSON.parse(r.body).datos.map((e) => `${new Date(e.creado * 1000).toISOString()}  ${e.id}  ${e.tipo.padEnd(16)}  ${e.datos.objeto.id}`).join('\n')); }
      if (g1 !== 'webhooks') return Sh.fail(`pagoya: comando desconocido '${g1}'. Prueba: pagoya ayuda`, 2);
      if (g2 === 'configurar') {
        const cuenta = flags['--cuenta']; if (!cuenta || cuenta === true) return Sh.fail('pagoya: falta --cuenta <cuenta de almacenamiento del lago>', 2);
        const tipos = flags['--eventos'] && flags['--eventos'] !== true ? String(flags['--eventos']).split(',').map((x) => x.trim()).filter(Boolean) : TIPOS_DEF;
        const malos = tipos.filter((x) => !MV.TIPOS_WEBHOOK.includes(x)); if (malos.length) return Sh.fail(`pagoya: tipos de evento desconocidos: ${malos.join(', ')}. Válidos: ${MV.TIPOS_WEBHOOK.join(', ')}`, 2);
        const nuevo = !D.webhook;
        D.webhook = { ...(D.webhook || {}), cuenta: String(cuenta).toLowerCase(), contenedor: flags['--contenedor'] && flags['--contenedor'] !== true ? String(flags['--contenedor']) : 'landing', prefijo: String(flags['--prefijo'] && flags['--prefijo'] !== true ? flags['--prefijo'] : 'pagoya/webhooks').replace(/^\/+|\/+$/g, ''), tipos, pausado: false };
        if (nuevo) { D.webhook.alta = MV.ahora(); D.webhook.hasta = D.webhook.alta; D.webhook.recibidas = 0; }
        guardarTodo(); sincronizarWebhooks();
        return Sh.ok(`${nuevo ? 'Endpoint creado' : 'Endpoint actualizado'}: we_… → función mv-webhooks
  destino:  abfss://${D.webhook.contenedor}@${D.webhook.cuenta}.dfs.core.windows.net/${D.webhook.prefijo}/
  eventos:  ${tipos.join(', ')}
  firma:    cabecera PagoYa-Signature (t=<unix>,v1=<HMAC-SHA256 hex>) con el secreto whsec_… del correo de accesos
${col.dim('Un endpoint nuevo recibe solo los eventos que ocurren desde ahora: lo anterior se trae con la API (GET /v1/eventos).')}${D.webhook.error ? '\n' + col.err(D.webhook.error) : ''}`);
      }
      const W = D.webhook; if (!W) return Sh.fail('pagoya: todavía no configuraste el endpoint. Usa: pagoya webhooks configurar --cuenta <cuenta>', 1);
      if (g2 === 'pausar' || g2 === 'reanudar') { W.pausado = g2 === 'pausar'; guardarTodo(); return Sh.ok(`Endpoint ${W.pausado ? 'pausado: PagoYa deja de enviar (y no reenvía lo que pase mientras tanto)' : 'reanudado'}.`); }
      if (g2 === 'estado' || !g2) { sincronizarWebhooks(); return Sh.ok(`Endpoint del equipo de datos (función mv-webhooks)
  estado:    ${W.pausado ? 'pausado' : 'activo'}
  destino:   abfss://${W.contenedor}@${W.cuenta}.dfs.core.windows.net/${W.prefijo}/
  eventos:   ${W.tipos.join(', ')}
  alta:      ${new Date(W.alta).toISOString()}
  entregas:  ${W.recibidas || 0} guardadas en el lago (las de más de ${DIAS_VIDA_WEBHOOKS} días las borra la regla de ciclo de vida)${W.error ? '\n  error:     ' + W.error : ''}`); }
      return Sh.fail(`pagoya webhooks: subcomando desconocido '${g2}'`, 2);
    });

    // ---------------------------------------------------------------- mercado accesos (el correo con las credenciales)
    Sh.def('mercado', 'Mercado Vecino: mercado accesos (el correo con tus credenciales) · mercado reloj', (a) => {
      Host.sincronizar(); const C = MV.claves();
      if (a[0] === 'reloj') { const t = MV.ahora(); return Sh.ok(`Ahora en Ciudad del Río: ${MV.tsSql(t - 3 * 3600e3).slice(0, 19)} (UTC-3)\nUTC:                     ${MV.tsSql(t).slice(0, 19)}\nPagoYa empezó a usarse:  ${MV.diaLocal(MV.T0())} (antes se cobraba con CobroSur)`); }
      if (a[0] !== 'accesos') return Sh.ok('mercado accesos   muestra el correo de accesos (credenciales de prueba, solo tuyas)\nmercado reloj     la hora de la tienda (Ciudad del Río, UTC-3) y en UTC');
      return Sh.ok(`De: plataforma@mercadovecino.example
Asunto: Accesos para el equipo de datos (guárdalos en el Key Vault, no en el código)

Base operacional (réplica de solo lectura, PostgreSQL 16)
  host:     ${C.pg.host}
  puerto:   ${C.pg.puerto}    base: ${C.pg.base}    usuario: ${C.pg.usuario}
  clave:    ${C.pg.clave}
  psql "postgresql://${C.pg.usuario}@${C.pg.host}:${C.pg.puerto}/${C.pg.base}?sslmode=require"

CDC (Debezium → Event Hubs, protocolo Kafka)
  broker:   ${C.eh.broker}   (SASL_SSL, mecanismo PLAIN)
  usuario:  $ConnectionString   (literal, con el signo $)
  clave:    ${C.eh.cs}
  tópicos:  mv_prod.public.<tabla>

PagoYa (modo prueba)
  API:            https://api.pagoya.example/v1   (Authorization: Bearer <clave>)
  clave secreta:  ${C.pagoya}
  secreto firma:  ${C.webhook}   (webhooks: cabecera PagoYa-Signature)${C.webhookAnterior ? `
  secreto anterior (válido hasta ${new Date(MV.hitos().rotacion + 86400000).toISOString().slice(0, 16)} UTC): ${C.webhookAnterior}` : ''}`);
    });

    // ---------------------------------------------------------------- psql contra la réplica (PostgreSQL real)
    const psqlOriginal = Sh.Commands.psql;
    const esReplica = (a) => a.some((x) => /mv-prod-replica/.test(String(x)));
    Sh.def('psql', psqlOriginal ? null : 'cliente de PostgreSQL', async (a, ctx) => {
      if (!esReplica(a)) return psqlOriginal ? psqlOriginal(a, ctx) : Sh.fail('psql: no hay servidor', 2);
      return psqlReplica(a, ctx);
    });
  }

  // ================================================================== la réplica en PGlite
  const DDL = `CREATE TABLE vendedores (id integer PRIMARY KEY, nombre text NOT NULL, rubro text, barrio text, comision_pct numeric(4,1), creado_en timestamp);
CREATE TABLE productos (id integer PRIMARY KEY, vendedor_id integer NOT NULL, nombre text NOT NULL, precio numeric(12,2) NOT NULL, activo boolean NOT NULL DEFAULT true, actualizado_en timestamp);
CREATE TABLE clientes (id integer PRIMARY KEY, nombre text, email text, telefono text, barrio text, creado_en timestamp NOT NULL, actualizado_en timestamp NOT NULL);
CREATE TABLE pedidos (id integer PRIMARY KEY, cliente_id integer NOT NULL, estado text NOT NULL, subtotal numeric(12,2) NOT NULL, envio numeric(12,2) NOT NULL, total numeric(12,2) NOT NULL, proveedor_pago text NOT NULL, pago_ref text, creado_en timestamp NOT NULL, actualizado_en timestamp NOT NULL);
CREATE TABLE items_pedido (id integer PRIMARY KEY, pedido_id integer NOT NULL, producto_id integer NOT NULL, cantidad integer NOT NULL, precio_unitario numeric(12,2) NOT NULL);
CREATE INDEX pedidos_actualizado_en_idx ON pedidos (actualizado_en);
CREATE INDEX items_pedido_pedido_id_idx ON items_pedido (pedido_id);
COMMENT ON TABLE pedidos IS 'Pedidos de la tienda. estado: creado, pagado, enviado, entregado, cancelado';
COMMENT ON COLUMN pedidos.proveedor_pago IS 'cobrosur (hasta el cambio de pasarela) o pagoya';
COMMENT ON COLUMN pedidos.pago_ref IS 'Id del pago en la pasarela (py_… en PagoYa)';`;
  const ALTER_CUPONES = "ALTER TABLE pedidos ADD COLUMN descuento numeric(12,2) NOT NULL DEFAULT 0, ADD COLUMN cupon text; COMMENT ON COLUMN pedidos.descuento IS 'Descuento del cupón, en pesos. total = subtotal + envio - descuento';";
  const lit = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (v ? 'true' : 'false') : `'${String(v).replace(/'/g, "''")}'`);
  const PG = { db: null, cargando: null, t: 0, clave: null };
  const lag = () => 2000 + (Math.floor(Date.now() / 60000) % 7) * 1500; // la réplica va unos segundos atrás
  async function replica(progreso) {
    Host.sincronizar();
    const clave = MV.cfg.semilla + ':' + MV.T0();
    if (PG.cargando) await PG.cargando;
    if (!PG.db || PG.clave !== clave) {
      PG.cargando = (async () => {
        progreso && progreso('Conectando con la réplica (la primera vez descarga PostgreSQL, unos 6 MB)…');
        const url = (window.SqlMotores && window.SqlMotores.PGLITE_URL) || 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.4.6/dist/index.js';
        const mod = await import(/* webpackIgnore: true */ url);
        const id = (x) => x;
        const db = new mod.PGlite({ parsers: { [mod.types.DATE]: id, [mod.types.TIMESTAMP]: id, [mod.types.TIMESTAMPTZ]: id, [mod.types.NUMERIC]: id, [mod.types.INT8]: id } });
        await db.exec(DDL);
        const t = Date.now() - lag(); const tm = MV.ahora() - lag(); const { est } = MV.estadoEn(tm);
        if (tm >= MV.hitos().cupones) { await db.exec(ALTER_CUPONES); PG.cupones = true; } else PG.cupones = false;
        for (const tabla of ['vendedores', 'productos', 'clientes', 'pedidos', 'items_pedido']) {
          const cols = MV.columnasEn(tabla, tm); const filas = [...est[tabla].values()].sort((x, y) => x.id - y.id);
          for (let i = 0; i < filas.length; i += 400) {
            const vals = filas.slice(i, i + 400).map((r) => { const f = MV.filaSql(tabla, r, tm); return '(' + cols.map((c) => lit(f[c])).join(',') + ')'; });
            await db.exec(`INSERT INTO ${tabla} (${cols.join(',')}) VALUES ${vals.join(',')};`);
          }
        }
        await db.exec('ANALYZE;');
        PG.db = db; PG.t = MV.ahora() - (Date.now() - t); PG.clave = clave;
      })();
      try { await PG.cargando; } finally { PG.cargando = null; }
      return PG.db;
    }
    // ponerse al día con lo que pasó desde la última vez (como la réplica aplicando el WAL)
    const hasta = MV.ahora() - lag();
    if (hasta > PG.t) {
      const sql = [];
      if (!PG.cupones && hasta >= MV.hitos().cupones) { sql.push(ALTER_CUPONES); PG.cupones = true; }
      for (const c of MV.mundo().cambios) {
        if (c.ts <= PG.t) continue; if (c.ts > hasta) break; if (c.op === 'r') continue;
        if (c.op === 'd') sql.push(`DELETE FROM ${c.tabla} WHERE id = ${c.id};`);
        else { const cols = MV.columnasEn(c.tabla, c.ts); const f = MV.filaSql(c.tabla, c.despues, c.ts); sql.push(`INSERT INTO ${c.tabla} (${cols.join(',')}) VALUES (${cols.map((k) => lit(f[k])).join(',')}) ON CONFLICT (id) DO UPDATE SET ${cols.filter((k) => k !== 'id').map((k) => `${k} = EXCLUDED.${k}`).join(', ')};`); }
      }
      if (sql.length) await PG.db.exec(sql.join('\n'));
      PG.t = hasta;
    }
    return PG.db;
  }

  // formato de salida de psql
  const NUMERICOS = new Set([20, 21, 23, 700, 701, 1700]);
  function celda(v, tipo) { if (v == null) return ''; if (tipo === 16) return v === true || v === 't' ? 't' : 'f'; if (v instanceof Date) return v.toISOString().replace('T', ' ').replace('Z', ''); if (typeof v === 'object') return JSON.stringify(v); return String(v); }
  function tablaPsql(r, op) {
    const campos = r.fields || []; const filas = (r.rows || []).map((f) => campos.map((c, i) => celda(Array.isArray(f) ? f[i] : f[c.name], c.dataTypeID)));
    if (op.csv) return [campos.map((c) => c.name).join(','), ...filas.map((f) => f.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(','))].join('\n');
    if (op.sinAlinear) return [...(op.soloTuplas ? [] : [campos.map((c) => c.name).join(op.sep)]), ...filas.map((f) => f.join(op.sep)), ...(op.soloTuplas ? [] : [`(${filas.length} ${filas.length === 1 ? 'row' : 'rows'})`])].join('\n');
    const w = campos.map((c, i) => Math.max(op.soloTuplas ? 0 : c.name.length, ...filas.map((f) => f[i].length)));
    const der = campos.map((c) => NUMERICOS.has(c.dataTypeID));
    const cab = ' ' + campos.map((c, i) => { const p = w[i] - c.name.length; return ' '.repeat(Math.floor(p / 2)) + c.name + ' '.repeat(Math.ceil(p / 2)); }).join(' | ') + ' ';
    const sepL = campos.map((_, i) => '-'.repeat(w[i] + 2)).join('+');
    const cuerpo = filas.map((f) => ' ' + f.map((v, i) => (der[i] ? v.padStart(w[i]) : v.padEnd(w[i]))).join(' | ') + ' ');
    return [...(op.soloTuplas ? [] : [cab.replace(/\s+$/, ''), sepL]), ...cuerpo.map((x) => x.replace(/\s+$/, '')), ...(op.soloTuplas ? [] : [`(${filas.length} ${filas.length === 1 ? 'row' : 'rows'})`])].join('\n');
  }
  const ESCRITURA = /^\s*(insert|update|delete|create|drop|alter|truncate|grant|revoke|vacuum|reindex|cluster|comment|refresh|merge|call|do|lock|copy\s+[\s\S]+\s+from)\b/i;
  async function ejecutarPsql(db, sql, op) {
    const m = ESCRITURA.exec(sql);
    if (m) { const v = m[1].split(/\s+/)[0].toUpperCase(); const quePasa = /^create/i.test(sql) ? `CREATE ${(/create\s+(?:or\s+replace\s+|temp(?:orary)?\s+|unique\s+)*(\w+)/i.exec(sql) || [])[1] || ''}`.toUpperCase().trim() : v; return { err: `ERROR:  cannot execute ${quePasa} in a read-only transaction${/^create\s+temp/i.test(sql) ? '\n' + col.dim('(en una réplica en espera, hot standby, ni siquiera se pueden crear tablas temporales)') : ''}`, code: 1 }; }
    let rs; const t0 = performance.now();
    try { rs = await db.exec(sql, { rowMode: 'array' }); } catch (e) { return { err: `ERROR:  ${e.message}${e.hint ? '\nHINT:  ' + e.hint : ''}${e.position ? `\nLINE 1: ${sql.split('\n')[0].slice(0, 120)}` : ''}`, code: 1 }; }
    const partes = rs.filter((r) => r.fields && r.fields.length).map((r) => tablaPsql(r, op));
    if (op.timing) partes.push(`Time: ${(performance.now() - t0).toFixed(3)} ms`);
    if (!partes.length) { const v = sql.trim().split(/\s+/)[0].toUpperCase(); return { out: v === 'SET' ? 'SET' : v === 'BEGIN' ? 'BEGIN' : v === 'COMMIT' ? 'COMMIT' : v }; }
    return { out: partes.join('\n\n') };
  }
  async function metaPsql(db, linea, op) {
    const l = linea.trim(); const [cmd, ...resto] = l.split(/\s+/); const arg = resto.join(' ');
    const C = MV.claves();
    if (cmd === '\\q') return { out: '', exitMode: true };
    if (cmd === '\\?') return { out: 'General\n  \\q                     sale de psql\n  \\conninfo              datos de la conexión\nInformacional\n  \\dt                    lista tablas\n  \\d TABLA               columnas, índices y comentarios de una tabla\n  \\l                     lista bases\nEntrada/salida\n  \\copy (SELECT …) TO \'archivo.csv\' WITH (FORMAT csv, HEADER)\n  \\timing [on|off]       mide cada consulta\n  \\x                     (sin efecto en la práctica)' };
    if (cmd === '\\conninfo') return { out: `You are connected to database "${C.pg.base}" as user "${C.pg.usuario}" on host "${C.pg.host}" (address "10.4.2.7") at port "${C.pg.puerto}".\nSSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, compression: off, ALPN: postgresql)` };
    if (cmd === '\\timing') { op.timing = arg ? arg === 'on' : !op.timing; return { out: `Timing is ${op.timing ? 'on' : 'off'}.` }; }
    if (cmd === '\\x') return { out: 'Expanded display is used automatically.' };
    if (cmd === '\\l') return { out: '                                                 List of databases\n   Name    |   Owner    | Encoding | Locale Provider |  Collate   |   Ctype    \n-----------+------------+----------+-----------------+------------+------------\n mercado   | app_owner  | UTF8     | libc            | en_US.utf8 | en_US.utf8\n postgres  | azuresu    | UTF8     | libc            | en_US.utf8 | en_US.utf8\n(2 rows)' };
    if (cmd === '\\dt') return ejecutarPsql(db, "SELECT n.nspname AS \"Schema\", c.relname AS \"Name\", 'table' AS \"Type\", 'app_owner' AS \"Owner\" FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname = 'public' ORDER BY 2", op).then((r) => (r.out ? { out: '              List of relations\n' + r.out } : r));
    if (cmd === '\\d' || cmd === '\\d+') {
      if (!arg) return metaPsql(db, '\\dt', op);
      const t = arg.replace(/^public\./, '').replace(/[";]/g, '');
      const r = await ejecutarPsql(db, `SELECT a.attname AS "Column", format_type(a.atttypid, a.atttypmod) AS "Type", CASE WHEN a.attnotnull THEN 'not null' ELSE '' END AS "Nullable", coalesce(pg_get_expr(d.adbin, d.adrelid), '') AS "Default", coalesce(col_description(a.attrelid, a.attnum), '') AS "Description" FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum WHERE a.attrelid = '${t}'::regclass AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum`, op);
      if (r.err) return { err: `Did not find any relation named "${arg}".`, code: 1 };
      const idx = await db.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '${t}' ORDER BY 1`);
      const com = await db.query(`SELECT obj_description('${t}'::regclass) AS c`);
      return { out: `                Table "public.${t}"\n${r.out.replace(/\n\(\d+ rows?\)$/, '')}\nIndexes:\n${idx.rows.map((x) => `    "${x.indexname}" ${x.indexdef.replace(/^.*?USING /, '').replace(/^btree/, x.indexname.endsWith('_pkey') ? 'PRIMARY KEY, btree' : 'btree')}`).join('\n')}${com.rows[0] && com.rows[0].c ? `\nComment: ${com.rows[0].c}` : ''}\nReplica Identity: ${['clientes', 'pedidos'].includes(t) ? 'FULL' : 'DEFAULT'}\nPublications:\n    "dbz_publication"` };
    }
    if (cmd === '\\copy') {
      let cuerpo = l.replace(/^\\copy\s+/i, ''), origenTxt = null;
      if (cuerpo.startsWith('(')) { let d = 0, k = 0; for (; k < cuerpo.length; k++) { if (cuerpo[k] === '(') d++; else if (cuerpo[k] === ')') { d--; if (!d) break; } } origenTxt = cuerpo.slice(0, k + 1); cuerpo = cuerpo.slice(k + 1); }
      else { const mm = /^(\S+)/.exec(cuerpo); origenTxt = mm ? mm[1] : ''; cuerpo = cuerpo.slice(origenTxt.length); }
      const m0 = /^\s+(to|from)\s+(?:'([^']+)'|(\S+))\s*([\s\S]*)$/i.exec(cuerpo);
      const m = m0 ? [null, origenTxt, m0[1], m0[2], m0[3], m0[4]] : null;
      if (!m) return { err: "\\copy: sintaxis: \\copy (SELECT …) TO 'archivo.csv' WITH (FORMAT csv, HEADER)", code: 1 };
      if (m[2].toLowerCase() === 'from') return { err: 'ERROR:  cannot execute COPY FROM in a read-only transaction', code: 1 };
      const origen = m[1].trim(); const consulta = origen.startsWith('(') ? origen.replace(/^\(([\s\S]*)\)$/, '$1') : `SELECT * FROM ${origen}`;
      const opciones = m[5] || ''; const header = /header/i.test(opciones); const csv = /csv/i.test(opciones);
      let r; try { r = await db.query(consulta, [], { rowMode: 'array' }); } catch (e) { return { err: 'ERROR:  ' + e.message, code: 1 }; }
      const sep = csv ? ',' : '\t';
      const esc = (v) => (v == null ? (csv ? '' : '\\N') : csv && /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
      const lineas = r.rows.map((f) => r.fields.map((c, i) => esc(f[i] == null ? null : celda(f[i], c.dataTypeID))).join(sep));
      const texto = (header ? r.fields.map((c) => c.name).join(sep) + '\n' : '') + lineas.join('\n') + (lineas.length ? '\n' : '');
      const ruta = m[3] || m[4];
      if (ruta === 'STDOUT' || ruta === 'stdout') return { out: texto.replace(/\n$/, '') };
      Sh.writeFile(Sh.norm(ruta), texto); try { Sh.Machine.save(); } catch (e) { /* lleno */ }
      return { out: `COPY ${lineas.length}` };
    }
    return { err: `invalid command ${cmd}\nTry \\? for help.`, code: 1 };
  }
  function credenciales(a) {
    const C = MV.claves(); let usuario = null, clave = null, host = null, base = null, puerto = '5432';
    for (const x of a) { const m = /^postgres(?:ql)?:\/\/(?:([^:@/]+)(?::([^@/]*))?@)?([^:/?]+)(?::(\d+))?(?:\/([^?]+))?/.exec(x); if (m) { usuario = m[1] ? decodeURIComponent(m[1]) : null; clave = m[2] != null ? decodeURIComponent(m[2]) : null; host = m[3]; puerto = m[4] || '5432'; base = m[5] || null; } }
    const { flags } = Sh.parseArgs(a.filter((x) => !/^postgres(ql)?:\/\//.test(x)), { bool: ['-A', '-t', '-q', '--csv', '-w', '-W'] });
    usuario = flags['-U'] || flags['--username'] || usuario || (Sh.Machine.env && Sh.Machine.env.PGUSER) || 'alumno';
    host = flags['-h'] || flags['--host'] || host; base = flags['-d'] || flags['--dbname'] || base || usuario; puerto = String(flags['-p'] || puerto);
    if (clave == null) clave = (Sh.Machine.env && Sh.Machine.env.PGPASSWORD) || null;
    if (clave == null) { const pgpass = Sh.readFile(Sh.HOME + '/.pgpass'); if (pgpass) for (const l of pgpass.split('\n')) { const [h, p, d, u, ...pw] = l.trim().split(':'); if (pw.length && (h === '*' || h === host) && (p === '*' || p === puerto) && (d === '*' || d === base) && (u === '*' || u === usuario)) { clave = pw.join(':'); break; } } }
    return { C, usuario, clave, host, base, puerto, flags };
  }
  async function psqlReplica(a, ctx) {
    if (a.includes('--version') || a.includes('-V')) return Sh.ok('psql (PostgreSQL) 16.4');
    const { C, usuario, clave, host, base, puerto, flags } = credenciales(a);
    const pre = `psql: error: connection to server at "${host}" (10.4.2.7), port ${puerto} failed: `;
    if (puerto !== '5432') return Sh.fail(pre + 'Connection timed out\n\tIs the server running on that host and accepting TCP/IP connections?', 2);
    if (clave == null) return Sh.fail(pre + 'fe_sendauth: no password supplied\n' + col.dim('(la clave va en PGPASSWORD, en ~/.pgpass o en la URI; mira: mercado accesos)'), 2);
    if (usuario !== C.pg.usuario || clave !== C.pg.clave) return Sh.fail(pre + `FATAL:  password authentication failed for user "${usuario}"`, 2);
    if (base !== C.pg.base) return Sh.fail(pre + `FATAL:  database "${base}" does not exist`, 2);
    const op = { csv: !!flags['--csv'], sinAlinear: !!flags['-A'], soloTuplas: !!flags['-t'], sep: flags['-F'] && flags['-F'] !== true ? String(flags['-F']) : '|', timing: false };
    let db; try { db = await replica(); } catch (e) { return Sh.fail(pre + `could not load the server (${e.message}). Revisa tu conexión a internet: la réplica usa PostgreSQL real descargado de cdn.jsdelivr.net.`, 2); }
    const correr = async (sql) => { await replica(); return sql.trim().startsWith('\\') ? metaPsql(db, sql, op) : ejecutarPsql(db, sql, op); };
    const res = (r) => ({ out: r.out || '', err: r.err || null, code: r.code || 0 });
    if (flags['-c'] && flags['-c'] !== true) return res(await correr(String(flags['-c'])));
    if (flags['-f'] && flags['-f'] !== true) { const t = Sh.readFile(Sh.norm(flags['-f'])); if (t === null) return Sh.fail(`psql: error: ${flags['-f']}: No such file or directory`, 1); const salida = []; for (const s of t.split(/;\s*(?:\n|$)/).map((x) => x.trim()).filter(Boolean)) { const r = await correr(s.startsWith('\\') ? s : s + ';'); salida.push(r.out || r.err); if (r.code) return { out: salida.join('\n'), code: 3 }; } return Sh.ok(salida.join('\n')); }
    if (ctx && ctx.stdin && ctx.stdin.trim()) return res(await correr(ctx.stdin));
    if (ctx && ctx.opts && ctx.opts.noInteractivo) return Sh.fail('psql: usa -c "SQL" o -f archivo.sql', 1);
    return {
      out: `psql (16.4, server 16.6)\nSSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, compression: off, ALPN: postgresql)\nType "help" for help.\n${col.dim('(réplica de solo lectura de producción: va unos segundos atrás de la base principal)')}`, code: 0,
      repl: { prompt: 'mercado=> ', cont: 'mercado-> ', fin: /;\s*$/, esMeta: (l) => l.trim().startsWith('\\'), meta: async (l) => { const r = await correr(l); return r.exitMode ? r : { out: r.out || r.err || '', code: r.code || 0 }; }, ejecutar: async (s) => { const r = await correr(s); return { out: r.out || r.err || '', code: r.code || 0 }; } },
    };
  }

  // ================================================================== read_kafka para el Databricks de práctica
  window.MercadoVecinoKafka = {
    leerParaSql(op) {
      Host.sincronizar();
      const error = (msg, codigo) => { const e = new Error(msg); e.codigo = codigo; throw e; };
      const servidores = op.bootstrapServers || op['kafka.bootstrap.servers'];
      if (!servidores) error("read_kafka necesita bootstrapServers => 'mv-eventos.servicebus.windows.net:9093'", 'MISSING_OPTION');
      const temaTxt = op.subscribe || op.assign; if (!temaTxt) error("read_kafka necesita subscribe => 'mv_prod.public.<tabla>'", 'MISSING_OPTION');
      if (!/mv-eventos\.servicebus\.windows\.net:9093/.test(servidores)) error(`Timed out waiting for a node assignment. Call: describeTopics (no se pudo conectar a ${servidores})`, 'KAFKA_TIMEOUT');
      const jaas = op['kafka.sasl.jaas.config'] || '';
      const u = /username\s*=\s*"([^"]*)"/.exec(jaas), p = /password\s*=\s*"([^"]*)"/.exec(jaas);
      const X = { 'security.protocol': op['kafka.security.protocol'], 'sasl.mechanisms': op['kafka.sasl.mechanism'], 'sasl.username': u ? u[1] : undefined, 'sasl.password': p ? p[1] : undefined };
      const au = autenticar(X);
      if (!au.ok) error(`org.apache.kafka.common.errors.SaslAuthenticationException: ${String(au.msg).split('\n')[0].replace(/^.*?: (?=SASL|Disconnected)/, '')}. ${au.pista}. Opciones: kafka.security.protocol => 'SASL_SSL', kafka.sasl.mechanism => 'PLAIN', kafka.sasl.jaas.config => 'kafkashaded.org.apache.kafka.common.security.plain.PlainLoginModule required username="$ConnectionString" password="<cadena de conexión>";'`, 'KAFKA_AUTH');
      const temas = MV.kafkaTemas(); const cols = ['key', 'value', 'topic', 'partition', 'offset', 'timestamp', 'timestampType']; const filas = [];
      const pedidos = String(temaTxt).split(',').map((x) => x.trim());
      let ini = {}, finO = {};
      try { if (op.startingOffsets && op.startingOffsets.trim().startsWith('{')) ini = JSON.parse(op.startingOffsets); if (op.endingOffsets && op.endingOffsets.trim().startsWith('{')) finO = JSON.parse(op.endingOffsets); } catch (e) { error(`startingOffsets/endingOffsets no es un JSON válido: ${e.message}`, 'INVALID_OPTION'); }
      for (const tp of pedidos) {
        const info = temas.find((x) => x.tema === tp); if (!info) error(`UnknownTopicOrPartitionException: This server does not host this topic-partition (${tp}).`, 'KAFKA_TOPIC');
        let desde = String(op.startingOffsets || 'earliest') === 'latest' ? info.alto : info.bajo;
        if (ini[tp] && ini[tp]['0'] != null) { const v = Number(ini[tp]['0']); desde = v === -2 ? info.bajo : v === -1 ? info.alto : v; }
        if (op.startingTimestamp) desde = MV.offsetPorTiempo(tp, Number(op.startingTimestamp));
        let hasta = info.alto; if (finO[tp] && finO[tp]['0'] != null && Number(finO[tp]['0']) >= 0) hasta = Math.min(info.alto, Number(finO[tp]['0']));
        if (desde < info.bajo && String(op.failOnDataLoss || 'true') !== 'false') error(`Some data may have been lost because they are not available in Kafka any more; either the data was aged out by Kafka or the topic may have been deleted before all the data in the topic was processed. Requested offset ${desde} for ${tp}-0, earliest available ${info.bajo}. If you want your query to continue, set failOnDataLoss => 'false'.`, 'KAFKA_DATA_LOSS');
        const r = MV.kafkaLeer(tp, desde, hasta);
        for (const m of r.mensajes) filas.push([m.clave, m.valor, m.tema, 0, m.offset, new Date(m.ts).toISOString().replace('T', ' ').replace('Z', ''), 0]);
      }
      return { cols, filas };
    },
  };

  window.MercadoVecinoTerminal = { sincronizarWebhooks, replica };
})();
