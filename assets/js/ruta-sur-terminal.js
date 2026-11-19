/* Ruta Sur en las herramientas: el correo de accesos (ruta accesos), el clúster Kafka de la telemetría (kcat y
 * read_kafka, 4 particiones) y la API del TMS en curl, Python y Data Factory. */
(function () {
  'use strict';
  const RS = window.RutaSurMundo, Host = window.RutaSurHost, Sh = window.Shell;
  if (!RS || !Host) return;
  const broker = () => RS.claves().eh.broker;
  function autenticar(X) {
    Host.sincronizar(); const C = RS.claves();
    if (String(X['security.protocol'] || '').toUpperCase() !== 'SASL_SSL') return { ok: false, msg: `%3|FAIL|rdkafka#consumer-1| [thrd:${broker()}/bootstrap]: Disconnected while requesting ApiVersion: might be caused by incorrect security.protocol configuration (connecting to a SSL listener?)\n% ERROR: Failed to query metadata: Local: Broker transport failure`, pista: 'Event Hubs solo acepta SASL_SSL con mecanismo PLAIN' };
    if (String(X['sasl.mechanisms'] || X['sasl.mechanism'] || '').toUpperCase() !== 'PLAIN' || X['sasl.username'] !== '$ConnectionString' || X['sasl.password'] !== C.eh.cs) return { ok: false, msg: `%3|FAIL|rdkafka#consumer-1| [thrd:sasl_ssl://${broker()}/bootstrap]: SASL authentication error: Authentication failed during authentication due to invalid credentials with SASL mechanism PLAIN\n% ERROR: Failed to query metadata: Local: Broker transport failure`, pista: X['sasl.username'] === '' ? 'sasl.username llegó vacío: escribe $ConnectionString entre comillas simples' : 'usuario literal $ConnectionString y, como clave, la cadena de conexión de Ruta Sur (ruta accesos)' };
    return { ok: true };
  }
  const registrar = () => {
    if (!window.KafkaPractica) return false;
    window.KafkaPractica.registrar({ broker: 'rutasur-telemetria.servicebus.windows.net:9093', autenticar, temas: () => { Host.sincronizar(); return RS.temas(); }, leer: (tm, p, d, h) => { Host.sincronizar(); return RS.leer(tm, p, d, h); }, offsetPorTiempo: (tm, p, ms) => RS.offsetPorTiempo(tm, p, ms), grupos: () => (Host.datos() || {}).grupos || {}, alPerder: (n) => { const D = Host.datos(); D.perdidos = (D.perdidos || 0) + n; }, guardar: () => Host.guardar() });
    return true;
  };
  if (!registrar()) { const iv = setInterval(() => { if (registrar()) clearInterval(iv); }, 200); }
  if (Sh && Sh.def) {
    Sh.def('ruta', 'Ruta Sur (proyecto 4): ruta accesos · ruta reloj', (a) => {
      Host.sincronizar(); const C = RS.claves();
      if (a[0] === 'reloj') { const t = RS.ahora(); return Sh.ok(`Ciudad del Río: ${new Date(t - 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')} (UTC-3)\nUTC:           ${new Date(t).toISOString().slice(0, 16).replace('T', ' ')}`); }
      if (a[0] !== 'accesos') return Sh.ok('ruta accesos   credenciales de la telemetría (Event Hubs) y de la API del TMS\nruta reloj     la hora en Ciudad del Río y en UTC');
      return Sh.ok(`De: plataforma@rutasur.example
Asunto: Accesos del equipo de datos

Telemetría de la flota (Event Hubs, protocolo Kafka)
  broker:   ${C.eh.broker}   (SASL_SSL, PLAIN)
  usuario:  $ConnectionString
  clave:    ${C.eh.cs}
  tópico:   ${RS.TEMA}   (${RS.PARTICIONES} particiones, clave = vehículo, retención 3 días)

TMS (sistema de despachos): https://api.rutasur.example/v1
  cabecera: X-Api-Key: ${C.api}
  GET /v1/rutas?fecha=AAAA-MM-DD     plan de rutas del día (se publica a las 18:00 del día anterior)
  GET /v1/pedidos/{pedido_id}`);
    });
  }
})();
