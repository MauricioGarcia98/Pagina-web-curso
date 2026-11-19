/* Portal de desarrolladores de Pedalia (#/pedalia-dev): como el de cualquier proveedor de APIs.
 * Apps y credenciales (el secreto se muestra una sola vez; se rota con período de gracia), uso y cuota,
 * registro de pedidos, documentación de referencia, página de estado e historial de cambios.
 * La API vive en api-pedalia.js; acá solo se administra y se mira lo que pasa. */
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = () => window.ApiPedalia, Hst = () => window.ApiPedaliaHost;
  const azarTxt = (n) => Array.from({ length: n }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 32)]).join('');
  const horaLocal = (ms) => new Date(ms).toLocaleString('es', { dateStyle: 'short', timeStyle: 'medium' });
  const SECCIONES = [['inicio', 'Inicio'], ['apps', 'Apps y credenciales'], ['uso', 'Uso'], ['registro', 'Registro de pedidos'], ['docs', 'Documentación'], ['estado', 'Estado'], ['changelog', 'Changelog']];
  const ESTILO = `<style>
    .pdv{max-width:1100px;margin:0 auto;padding:18px 16px 60px;font-size:15px}
    .pdv-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:16px}
    .pdv-marca{font-weight:800;font-size:18px}.pdv-marca span{color:#15803d}
    .pdv-nav{display:flex;gap:4px;flex-wrap:wrap}.pdv-nav a{padding:6px 10px;border-radius:8px;text-decoration:none;color:inherit;font-size:14px}
    .pdv-nav a.on{background:#dcfce7;color:#14532d;font-weight:600}
    .pdv-card{border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0;background:var(--card,transparent)}
    .pdv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
    .pdv-kpi b{display:block;font-size:26px}.pdv-kpi span{font-size:13px;opacity:.75}
    .pdv table{width:100%;border-collapse:collapse;font-size:13px}.pdv th,.pdv td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
    .pdv code,.pdv pre{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}.pdv pre{background:rgba(127,127,127,.1);padding:10px;border-radius:8px;overflow:auto;white-space:pre}
    .pdv-st{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:600}
    .pdv-s2{background:#dcfce7;color:#166534}.pdv-s3{background:#e0e7ff;color:#3730a3}.pdv-s4{background:#fef3c7;color:#92400e}.pdv-s5{background:#fee2e2;color:#991b1b}
    .pdv-ok{color:#15803d;font-weight:700}.pdv-deg{color:#b45309;font-weight:700}.pdv-man{color:#1d4ed8;font-weight:700}
    .pdv-barras{display:flex;align-items:flex-end;gap:2px;height:90px;border-bottom:1px solid var(--line)}.pdv-barras i{flex:1;background:#86efac;min-height:1px;position:relative}.pdv-barras i.err{background:#fca5a5}
    .pdv-secreto{background:#fef9c3;border:1px solid #facc15;color:#713f12;padding:10px;border-radius:8px;margin:10px 0}
    .pdv-cl{border-left:3px solid var(--line);padding:4px 0 4px 12px;margin:10px 0}.pdv-cl.futuro{opacity:.65;border-left-style:dashed}
    .pdv-btn{padding:6px 12px;border-radius:8px;border:1px solid var(--line);background:transparent;color:inherit;cursor:pointer;font-size:14px}.pdv-btn.pri{background:#15803d;color:#fff;border-color:#15803d}
    .pdv-dim{opacity:.72;font-size:13px}
    @media (max-width:640px){.pdv table{font-size:12px}.pdv th:nth-child(n+6),.pdv td:nth-child(n+6){display:none}}
  </style>`;
  let main = null, ctx = null, secc = 'inicio', secretoVisible = null, filtro = 'todos';

  function vista(m, c, sub) {
    main = m; ctx = c; secc = (sub && sub[0]) || 'inicio';
    Hst().sincronizar();
    render();
    Hst().oyentes.add(refrescar);
  }
  function refrescar() { if (main && document.body.contains(main) && /^#\/pedalia-dev/.test(location.hash) && ['uso', 'registro', 'estado'].includes(secc)) render(); }
  const guardar = () => { Hst().sincronizar(); try { window.__almacen().save(); } catch (e) { /* lleno */ } };

  function render() {
    const D = Hst().datos();
    const cuerpo = { inicio, apps, uso, registro, docs, estado, changelog }[secc] || inicio;
    main.innerHTML = `${ESTILO}<div class="pdv"><div class="pdv-top"><div class="pdv-marca">🚲 Pedalia <span>Developers</span></div><nav class="pdv-nav">${SECCIONES.map(([k, n]) => `<a href="#/pedalia-dev/${k}" class="${k === secc ? 'on' : ''}">${n}</a>`).join('')}</nav></div>${cuerpo(D)}</div>`;
    const enl = { apps: enlazarApps, estado: enlazarEstado, registro: enlazarRegistro }[secc]; if (enl) enl(D);
  }

  // ---------------------------------------------------------------- inicio
  function inicio(D) {
    const st = estadoAhora();
    return `<h1 style="margin:0 0 6px">La API de Pedalia</h1>
      <p>Viajes y estaciones de la red de bicicletas de Pedalia, en tiempo real. Es una API <b>inventada pero viva</b>: los viajes ocurren mientras la usas, el token vence, hay límites, mantenimientos y cambios de versión con fecha. Todo lo que hagas desde la terminal (curl), Python (requests), Data Factory o Airflow queda registrado acá.</p>
      <div class="pdv-grid">
        <div class="pdv-card pdv-kpi"><b class="${st.clase}">${st.texto}</b><span>Estado ahora · <a href="#/pedalia-dev/estado">ver detalle</a></span></div>
        <div class="pdv-card pdv-kpi"><b>${D.apps.filter((a) => !a.borrada).length}</b><span>apps registradas · <a href="#/pedalia-dev/apps">administrar</a></span></div>
        <div class="pdv-card pdv-kpi"><b>${usadosHoy(D)}</b><span>pedidos hoy de ${A().CUOTA_DIA} (cuota por app)</span></div>
        <div class="pdv-card pdv-kpi"><b>${A().diaLocal(A().hitos().bajaV1)}</b><span>se apaga la v1 · <a href="#/pedalia-dev/changelog">changelog</a></span></div>
      </div>
      <div class="pdv-card"><h3 style="margin-top:0">Empezar en 3 pasos</h3>
        <ol><li>Crea una app en <a href="#/pedalia-dev/apps">Apps y credenciales</a> y guarda el <code>client_secret</code> (se muestra una sola vez).</li>
        <li>Pide un token:<pre>curl -s -X POST https://api.pedalia.example/oauth/token \\
  -u "$PEDALIA_CLIENT_ID:$PEDALIA_CLIENT_SECRET" \\
  -d grant_type=client_credentials</pre></li>
        <li>Úsalo:<pre>curl -s "https://api.pedalia.example/v2/trips?updated_since=$(date -u +%Y-%m-%dT00:00:00Z)&limit=5" \\
  -H "Authorization: Bearer $TOKEN"</pre></li></ol>
        <p class="pdv-dim">En el curso la API corre dentro del navegador: no sale a internet y no necesitas tarjeta. Base URL: <code>https://api.pedalia.example</code></p></div>`;
  }
  const usadosHoy = (D) => { const hoy = A().diaLocal(A().ahora()); return Object.entries(D.cuota).filter(([k]) => k.endsWith('|' + hoy)).reduce((s, [, v]) => s + v, 0); };
  function estadoAhora() { const t = A().ahora(); if (A().mantenimiento(t)) return { texto: 'Mantenimiento', clase: 'pdv-man' }; if (A().incidenteDe(t)) return { texto: 'Degradado', clase: 'pdv-deg' }; return { texto: 'Operativo', clase: 'pdv-ok' }; }

  // ---------------------------------------------------------------- apps
  function apps(D) {
    const vivas = D.apps.filter((a) => !a.borrada);
    return `<h2 style="margin-top:0">Apps y credenciales</h2>
      <p class="pdv-dim">Cada sistema que consume la API (tu pipeline de Data Factory, tu DAG de Airflow, un script) debería tener <b>su propia app</b>: así puedes ver quién consume qué y revocar una credencial sin romper las demás.</p>
      ${secretoVisible ? `<div class="pdv-secreto"><b>Copia el client_secret ahora: no se vuelve a mostrar.</b><pre>client_id:     ${esc(secretoVisible.id)}\nclient_secret: ${esc(secretoVisible.secreto)}</pre>Guárdalo en un gestor de secretos (Key Vault, una conexión de Airflow), nunca en el código ni en el repositorio.</div>` : ''}
      <div class="pdv-card"><h3 style="margin-top:0">Nueva app</h3>
        <label>Nombre <input id="pdNombre" placeholder="adf-ingesta-viajes" style="width:260px"></label>
        <p style="margin:8px 0">Permisos (scopes): <label><input type="checkbox" id="pdT" checked> trips:read</label> <label><input type="checkbox" id="pdS" checked> stations:read</label></p>
        <button class="pdv-btn pri" id="pdCrear">Crear app</button></div>
      ${vivas.length ? vivas.map((a) => `<div class="pdv-card"><h3 style="margin:0 0 4px">${esc(a.nombre)}</h3><div class="pdv-dim">Creada ${horaLocal(a.creada)} · scopes: <code>${esc((a.scopes || []).join(' '))}</code></div>
        <table style="margin-top:10px"><tr><th>client_id</th><td><code>${esc(a.client_id)}</code></td></tr>
        ${(a.secretos || []).map((s, i) => `<tr><th>secreto ${i + 1}</th><td><code>${esc(s.valor.slice(0, 7))}••••••••${esc(s.valor.slice(-4))}</code> · creado ${horaLocal(s.creado)} ${s.revocado ? (s.revocado > Date.now() ? `<span class="pdv-st pdv-s4">se revoca ${horaLocal(s.revocado)}</span>` : '<span class="pdv-st pdv-s5">revocado</span>') : '<span class="pdv-st pdv-s2">activo</span>'} ${!s.revocado ? `<button class="pdv-btn" data-rev="${esc(a.client_id)}|${i}|0">Revocar ya</button> <button class="pdv-btn" data-rev="${esc(a.client_id)}|${i}|24">Revocar en 24 h</button>` : ''}</td></tr>`).join('')}</table>
        <p style="margin:10px 0 0"><button class="pdv-btn" data-nuevo="${esc(a.client_id)}">Generar un secreto nuevo</button> <button class="pdv-btn" data-borrar="${esc(a.client_id)}">Borrar la app</button></p>
        <p class="pdv-dim" style="margin-bottom:0">Para rotar sin cortar el servicio: genera un secreto nuevo, actualízalo donde se usa (Key Vault, conexión de Airflow), comprueba que funciona y recién después revoca el viejo.</p></div>`).join('') : '<p class="pdv-dim">Todavía no tienes apps.</p>'}`;
  }
  function enlazarApps(D) {
    const $ = (s) => main.querySelector(s);
    $('#pdCrear').onclick = () => {
      const nombre = ($('#pdNombre').value || '').trim() || 'mi-app';
      const scopes = [$('#pdT').checked && 'trips:read', $('#pdS').checked && 'stations:read'].filter(Boolean);
      const app = { client_id: 'pdl_' + azarTxt(16), nombre, scopes, creada: Date.now(), secretos: [] };
      const secreto = 'sk_live_' + azarTxt(32); app.secretos.push({ valor: secreto, creado: Date.now() });
      D.apps.push(app); secretoVisible = { id: app.client_id, secreto }; guardar(); render();
    };
    main.querySelectorAll('[data-nuevo]').forEach((b) => b.onclick = () => { const app = D.apps.find((a) => a.client_id === b.dataset.nuevo); if (app.secretos.filter((s) => !s.revocado || s.revocado > Date.now()).length >= 2) { ctx.toast('Ya hay dos secretos activos: revoca uno antes de crear otro.'); return; } const secreto = 'sk_live_' + azarTxt(32); app.secretos.push({ valor: secreto, creado: Date.now() }); secretoVisible = { id: app.client_id, secreto }; guardar(); render(); });
    main.querySelectorAll('[data-rev]').forEach((b) => b.onclick = () => { const [id, i, h] = b.dataset.rev.split('|'); const app = D.apps.find((a) => a.client_id === id); app.secretos[Number(i)].revocado = Date.now() + Number(h) * 3600e3; secretoVisible = null; guardar(); render(); });
    main.querySelectorAll('[data-borrar]').forEach((b) => b.onclick = () => { if (!confirm('¿Borrar la app? Sus tokens dejan de funcionar al instante.')) return; const app = D.apps.find((a) => a.client_id === b.dataset.borrar); app.borrada = true; secretoVisible = null; guardar(); render(); });
  }

  // ---------------------------------------------------------------- uso
  function uso(D) {
    const t = Date.now(); const ult = D.log.filter((l) => l.t > t - 60 * 60000);
    const porMin = Array.from({ length: 60 }, (_, i) => { const desde = t - (60 - i) * 60000; const x = ult.filter((l) => l.t >= desde && l.t < desde + 60000); return [x.length, x.filter((l) => l.status >= 400).length]; });
    const maxv = Math.max(1, ...porMin.map((x) => x[0]));
    const cuenta = (f) => ult.filter(f).length;
    const hoy = A().diaLocal(A().ahora());
    return `<h2 style="margin-top:0">Uso</h2>
      <div class="pdv-grid">
        <div class="pdv-card pdv-kpi"><b>${ult.length}</b><span>pedidos en la última hora</span></div>
        <div class="pdv-card pdv-kpi"><b>${cuenta((l) => l.status === 429)}</b><span>rechazados por límite (429)</span></div>
        <div class="pdv-card pdv-kpi"><b>${cuenta((l) => l.status >= 500)}</b><span>errores del servidor (5xx)</span></div>
        <div class="pdv-card pdv-kpi"><b>${cuenta((l) => l.status === 401)}</b><span>no autorizados (401)</span></div>
      </div>
      <div class="pdv-card"><h3 style="margin-top:0">Pedidos por minuto (última hora)</h3><div class="pdv-barras">${porMin.map(([n, e]) => `<i class="${e ? 'err' : ''}" style="height:${(n / maxv) * 100}%" title="${n} pedidos, ${e} con error"></i>`).join('')}</div><p class="pdv-dim">Rojo: minutos con algún error. El límite es ${A().LIMITE_MIN} por minuto por app.</p></div>
      <div class="pdv-card"><h3 style="margin-top:0">Cuota de hoy (${hoy})</h3><table><tr><th>App</th><th>Pedidos</th><th>Restantes</th></tr>${D.apps.filter((a) => !a.borrada).map((a) => { const n = D.cuota[a.client_id + '|' + hoy] || 0; return `<tr><td>${esc(a.nombre)} <span class="pdv-dim">${esc(a.client_id)}</span></td><td>${n}</td><td>${Math.max(0, A().CUOTA_DIA - n)}</td></tr>`; }).join('') || '<tr><td colspan="3" class="pdv-dim">Sin apps</td></tr>'}</table><p class="pdv-dim">Cada pedido cuenta, aunque falle. Un pipeline que reintenta sin espera puede gastar la cuota del día en minutos.</p></div>`;
  }

  // ---------------------------------------------------------------- registro
  function registro(D) {
    const clase = (s) => `pdv-s${String(s)[0]}`;
    const lista = D.log.slice().reverse().filter((l) => filtro === 'todos' || (filtro === 'errores' ? l.status >= 400 : String(l.status)[0] === filtro)).slice(0, 150);
    return `<h2 style="margin-top:0">Registro de pedidos</h2><p class="pdv-dim">Los últimos 300 pedidos que recibió la API desde este navegador (terminal, Python, Data Factory, Airflow). Cuando algo falla, el <code>x-request-id</code> es lo que le pasas al soporte del proveedor.</p>
      <p>Filtrar: ${[['todos', 'Todos'], ['errores', 'Solo errores'], ['2', '2xx'], ['4', '4xx'], ['5', '5xx']].map(([k, n]) => `<button class="pdv-btn ${filtro === k ? 'pri' : ''}" data-f="${k}">${n}</button>`).join(' ')}</p>
      <div class="pdv-card" style="overflow:auto"><table><tr><th>Hora</th><th>Método</th><th>Ruta</th><th>Estado</th><th>ms</th><th>App</th><th>Error</th><th>x-request-id</th></tr>
      ${lista.map((l) => `<tr><td>${horaLocal(l.t)}</td><td>${esc(l.metodo)}</td><td><code>${esc(l.ruta.length > 70 ? l.ruta.slice(0, 70) + '…' : l.ruta)}</code></td><td><span class="pdv-st ${clase(l.status)}">${l.status}</span></td><td>${l.ms}</td><td>${esc(l.cliente)}</td><td>${esc(l.error || '')}</td><td><code>${esc(l.rid || '')}</code></td></tr>`).join('') || '<tr><td colspan="8" class="pdv-dim">Todavía no hay pedidos.</td></tr>'}</table></div>`;
  }
  function enlazarRegistro() { main.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filtro = b.dataset.f; render(); }); }

  // ---------------------------------------------------------------- estado
  function estado(D) {
    const t = A().ahora(); const st = estadoAhora(); const inc = A().incidenteDe(t); const lista = A().incidentesRecientes(t);
    const forzado = (D.forzados || []).find((f) => f.hasta > t);
    return `<h2 style="margin-top:0">Estado del servicio</h2>
      <div class="pdv-card"><div style="font-size:22px" class="${st.clase}">${st.texto === 'Operativo' ? '● Todos los sistemas operativos' : st.texto === 'Mantenimiento' ? '● Mantenimiento programado en curso' : '● Servicio degradado'}</div>
      ${inc ? `<p><b>${esc(inc.titulo)}</b> · desde ${horaLocal(inc.desde)} · se espera normalidad ${horaLocal(inc.hasta)}</p>` : ''}
      <table><tr><th>Componente</th><th>Estado</th></tr><tr><td>Autenticación (/oauth/token)</td><td>${A().mantenimiento(t) ? 'Mantenimiento' : 'Operativo'}</td></tr><tr><td>Viajes (/v2/trips)</td><td>${A().mantenimiento(t) ? 'Mantenimiento' : inc ? 'Degradado' : 'Operativo'}</td></tr><tr><td>Estaciones (/v2/stations)</td><td>${A().mantenimiento(t) ? 'Mantenimiento' : 'Operativo'}</td></tr><tr><td>API v1</td><td>${t >= A().hitos().bajaV1 ? 'Dada de baja' : 'Deprecada'}</td></tr></table>
      <p class="pdv-dim">Mantenimiento programado: todos los días de 03:00 a 03:15 (hora de Ciudad del Río, UTC-3). Durante ese rato la API responde 503 con Retry-After. Endpoint público: <code>GET /status</code>.</p></div>
      <div class="pdv-card"><h3 style="margin-top:0">Modo práctica</h3><p class="pdv-dim">Para probar tus reintentos sin esperar un incidente real: provoca una degradación (35 % de respuestas 503) durante 10 minutos.</p>${forzado ? `<p>Degradación provocada hasta ${horaLocal(forzado.hasta)}. <button class="pdv-btn" id="pdFin">Terminarla ahora</button></p>` : '<button class="pdv-btn pri" id="pdProvocar">Provocar una degradación de 10 minutos</button>'}</div>
      <div class="pdv-card"><h3 style="margin-top:0">Incidentes de los últimos 10 días</h3>${lista.length ? lista.map((x) => `<div class="pdv-cl"><b>${esc(x.titulo)}</b> ${x.activo ? '<span class="pdv-st pdv-s4">en curso</span>' : '<span class="pdv-st pdv-s2">resuelto</span>'}<div class="pdv-dim">${horaLocal(Date.parse(x.desde))} → ${horaLocal(Date.parse(x.hasta))} · ${esc(x.id)}</div></div>`).join('') : '<p class="pdv-dim">Sin incidentes.</p>'}</div>`;
  }
  function enlazarEstado(D) {
    const p = main.querySelector('#pdProvocar'); if (p) p.onclick = () => { const t = A().ahora(); D.forzados = (D.forzados || []).filter((f) => f.hasta > t); D.forzados.push({ id: 'inc_practica_' + azarTxt(5), desde: t, hasta: t + 10 * 60000, tasa: 0.35 }); guardar(); render(); };
    const f = main.querySelector('#pdFin'); if (f) f.onclick = () => { const t = A().ahora(); D.forzados.forEach((x) => { if (x.hasta > t) x.hasta = t; }); guardar(); render(); };
  }

  // ---------------------------------------------------------------- changelog
  function changelog() {
    const hoy = A().diaLocal(A().ahora());
    const tipo = { nuevo: ['Nuevo', 'pdv-s2'], deprecacion: ['Deprecación', 'pdv-s4'], aviso: ['Aviso', 'pdv-s3'], cambio: ['Cambio', 'pdv-s4'], datos: ['Datos', 'pdv-s3'], baja: ['Baja', 'pdv-s5'] };
    return `<h2 style="margin-top:0">Changelog</h2><p class="pdv-dim">Lo que cambia en la API, con fecha. Las entradas con borde punteado todavía no ocurrieron: son anuncios. Suscríbete (mentalmente) y revisa esta página antes de cada cambio: un proveedor serio avisa, pero no espera a que actualices.</p>
      ${A().changelog().slice().reverse().map((c) => `<div class="pdv-cl ${c.fecha > hoy ? 'futuro' : ''}"><span class="pdv-st ${tipo[c.tipo][1]}">${tipo[c.tipo][0]}</span> <b>${esc(c.titulo)}</b> <span class="pdv-dim">· ${c.fecha} · ${esc(c.version)}${c.fecha > hoy ? ' · próximamente' : ''}</span><div>${esc(c.detalle)}</div></div>`).join('')}`;
  }

  // ---------------------------------------------------------------- documentación
  function docs() {
    return `<h2 style="margin-top:0">Documentación de referencia</h2>
      <div class="pdv-card"><h3 style="margin-top:0">Autenticación · OAuth 2.0 client credentials</h3>
      <pre>POST /oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)     (o client_id y client_secret en el cuerpo)

grant_type=client_credentials

200 → {"access_token": "eyJ…", "token_type": "Bearer", "expires_in": 900, "scope": "trips:read stations:read"}</pre>
      <p>El token vence a los <b>15 minutos</b>. Después, cualquier pedido devuelve <code>401 invalid_token</code> con <code>The access token expired</code>: pide uno nuevo. Revocar un secreto no invalida los tokens ya emitidos (vencen solos).</p></div>
      <div class="pdv-card"><h3 style="margin-top:0">GET /v2/trips · viajes (incremental)</h3>
      <table><tr><th>Parámetro</th><th>Descripción</th></tr><tr><td><code>updated_since</code></td><td>Obligatorio en la primera página. ISO 8601 con zona (<code>2026-11-18T00:00:00Z</code>). Devuelve los viajes cuyo <code>updated_at</code> es mayor o igual.</td></tr><tr><td><code>limit</code></td><td>1 a 500 (por defecto 100).</td></tr><tr><td><code>cursor</code></td><td>El <code>next_cursor</code> de la respuesta anterior. Con cursor no se repite <code>updated_since</code>.</td></tr></table>
      <pre>{"data": [{"id": 299171520, "bike_id": "B-0093", "origin_station_id": 8, "destination_station_id": 9,
           "started_at": "2026-11-18T19:12:31Z", "ended_at": "2026-11-18T19:27:45Z",
           "status": "completed", "user_type": "day_pass", "amount_cents": 45000, "currency": "PES",
           "ended_outside_station": false, "updated_at": "2026-11-18T19:27:45Z"}],
 "has_more": true, "next_cursor": "eyJzIjo…"}</pre>
      <ul><li><b>Orden</b>: por <code>updated_at</code> y <code>id</code>. El cursor es estable: los viajes que se actualizan mientras paginas aparecen al final, no se saltan.</li>
      <li><b>Estados</b>: <code>in_progress</code> (sin <code>ended_at</code>, destino ni monto), <code>completed</code>, <code>refunded</code> (un viaje puede reembolsarse hasta 30 horas después: cambia su <code>updated_at</code> y <code>amount_cents</code> pasa a 0).</li>
      <li><b>Entrega al menos una vez</b>: en casos raros un viaje puede repetirse entre páginas. Deduplica por <code>id</code> quedándote con el <code>updated_at</code> más reciente.</li>
      <li><b>Fechas en UTC</b>. Ciudad del Río es UTC-3: un viaje de las 22:30 del lunes local tiene <code>started_at</code> del martes a la 01:30Z.</li>
      <li><b>Montos en centavos</b> (entero). <code>user_type</code> puede sumar valores: no lo valides con una lista cerrada sin plan para lo nuevo (ver changelog).</li></ul></div>
      <div class="pdv-card"><h3 style="margin-top:0">Estaciones</h3><p><code>GET /v2/stations</code> devuelve el maestro con <code>ETag</code>. Envía <code>If-None-Match: &lt;etag&gt;</code>: si no cambió, la respuesta es <code>304 Not Modified</code> (sin cuerpo, y consume menos).</p><p><code>GET /v2/stations/{id}/status</code>: bicis y anclajes libres ahora, con <code>last_reported</code>. Si <code>last_reported</code> es viejo, el dato no es confiable (la estación puede estar sin conexión).</p></div>
      <div class="pdv-card"><h3 style="margin-top:0">Límites</h3><ul><li><b>${A().LIMITE_MIN} pedidos por minuto</b> por app. Cabeceras: <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code> (epoch). Si te pasas: <code>429 rate_limited</code> con <code>Retry-After</code> (segundos).</li><li><b>${A().CUOTA_DIA} pedidos por día</b> por app (se renueva a medianoche de Ciudad del Río): <code>429 quota_exceeded</code>. Cuentan también los pedidos que fallan.</li></ul></div>
      <div class="pdv-card"><h3 style="margin-top:0">Errores</h3><table><tr><th>Código</th><th>error</th><th>Qué hacer</th></tr>
      <tr><td>400</td><td>invalid_parameter, invalid_cursor</td><td>Corrige el pedido; reintentar no sirve.</td></tr><tr><td>401</td><td>invalid_token, invalid_client</td><td>Pide un token nuevo o revisa las credenciales.</td></tr><tr><td>403</td><td>insufficient_scope</td><td>Agrega el permiso a la app y pide un token nuevo.</td></tr><tr><td>410</td><td>gone</td><td>La versión fue dada de baja: migra.</td></tr><tr><td>429</td><td>rate_limited, quota_exceeded</td><td>Espera lo que dice <code>Retry-After</code>.</td></tr><tr><td>500, 502</td><td>internal_error, bad_gateway</td><td>Reintenta con espera exponencial (los GET son seguros de repetir).</td></tr><tr><td>503</td><td>maintenance, service_unavailable</td><td>Reintenta después de <code>Retry-After</code>. Mira /status.</td></tr></table>
      <p>Todas las respuestas traen <code>x-request-id</code>.</p></div>
      <div class="pdv-card"><h3 style="margin-top:0">v1 (deprecada)</h3><p><code>GET /v1/viajes?fecha=AAAA-MM-DD&amp;page=N&amp;per_page=M</code>: viajes que empezaron ese día (hora local), <b>los más nuevos primero</b>, con paginación por número de página. Si el día está en curso, entre una página y la siguiente llegan viajes nuevos y los resultados se corren. Hora local sin zona, montos como texto y <code>tipo_usuario</code> solo distingue <code>abono</code> y <code>pase_dia</code>. Sus respuestas traen <code>Deprecation</code> y <code>Sunset</code>; a veces devuelve 200 con <code>"ok": false</code> en el cuerpo.</p></div>
      <div class="pdv-card"><h3 style="margin-top:0">Política de versiones</h3><p>Los cambios compatibles (campos nuevos, valores nuevos de un enum) se anuncian en el changelog con al menos 2 días de anticipación y se publican sin cambiar de versión. Los cambios incompatibles van en una versión nueva; la anterior queda deprecada y se apaga con fecha anunciada.</p></div>`;
  }

  window.PedaliaPortal = { vista };
})();
