/* Portal de Azure de práctica — piezas que completan el portal base (azure-portal.js):
 *   Storage: File shares, Queues y Tables · Key Vault: Keys y Certificates
 *   Microsoft Entra ID: usuarios, grupos y registros de aplicaciones (service principals con secretos)
 *   Monitor: métricas, reglas de alerta y grupos de acciones
 * Todo se guarda en el mismo estado que usa la CLI `az` simulada. Las claves, secretos y certificados que se
 * "generan" son texto de práctica: no son credenciales reales ni sirven fuera del sitio.
 */
(function () {
  'use strict';
  const P = window.AzurePortal; if (!P || !P._i) return;
  const { az, guardarAz, esc, ic, uid, ahora, hora, panel, migas, svg, actividad, notificar, ir, tieneRol, ROLES, TENANT, USUARIO, recursos, idRecurso, TIPOS, toast, render } = P._i;
  const guardar = () => guardarAz();
  const campo = (id, etiqueta, html) => `<label class="az-campo"><span>${esc(etiqueta)}</span>${html || `<input id="${id}" autocomplete="off">`}</label>`;
  const tabla = (cab, filas, vacio) => (filas.length ? `<table class="az-tabla"><thead><tr>${cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table>` : `<div class="az-vacio">${esc(vacio)}</div>`);
  const nombreOk = (n, re, msg) => { if (!re.test(n)) throw new Error(msg); };

  // roles de datos que faltaban en la lista del portal
  for (const r of [['Key Vault Crypto Officer', 'Job function', 'Cualquier acción sobre las claves, salvo administrar permisos.'], ['Key Vault Certificates Officer', 'Job function', 'Cualquier acción sobre los certificados, salvo administrar permisos.'], ['Storage Queue Data Contributor', 'Job function', 'Lee, escribe y borra colas y mensajes.'], ['Storage Table Data Contributor', 'Job function', 'Lee, escribe y borra tablas y entidades.'], ['Storage File Data SMB Share Contributor', 'Job function', 'Lee, escribe y borra archivos de un recurso compartido.'], ['Monitoring Contributor', 'Job function', 'Lee los datos de monitoreo y edita su configuración (alertas, grupos de acciones).'], ['Monitoring Reader', 'Job function', 'Lee todos los datos de monitoreo.']]) if (!ROLES.some((x) => x[0] === r[0])) ROLES.push(r);

  // ================================================================ Storage: File shares, Queues, Tables
  function bladeStorage(box, { R, n, blade, again }) {
    if (blade === 'archivos') {
      R.shares = R.shares || {};
      box.innerHTML = `<div class="az-cmd"><button id="xAdd">${ic('add')} File share</button><button id="xRef">${ic('refresh')} Refresh</button></div>
        <p class="az-dim">Azure Files ofrece carpetas compartidas en la nube que se montan como un disco de red (SMB o NFS) desde Windows, Linux o macOS. Sirve para mover a la nube aplicaciones que esperan una carpeta compartida. Para un data lake se usa Blob/ADLS Gen2, no Files.</p>
        ${tabla(['Name', 'Access tier', 'Quota', 'Protocol', 'Modified', ''], Object.entries(R.shares).map(([k, s]) => `<tr><td>${ic('file-submodule')} ${esc(k)}</td><td>${esc(s.tier)}</td><td>${esc(s.cuota)} GiB</td><td>SMB</td><td>${hora(s.creado)}</td><td><button class="az-tb2" data-del="${esc(k)}" title="Delete share">${ic('trash')}</button></td></tr>`), 'No file shares found.')}
        ${Object.keys(R.shares).length ? `<div class="az-banner info">${ic('info')} <span>Para conectarte desde Linux: <code>sudo mount -t cifs //${esc(n)}.file.core.windows.net/${esc(Object.keys(R.shares)[0])} /mnt/datos -o credentials=/etc/smbcredentials/${esc(n)}.cred</code> (el botón <b>Connect</b> del portal real genera este comando).</span></div>` : ''}`;
      box.querySelector('#xRef').onclick = again;
      box.querySelector('#xAdd').onclick = () => panel({ titulo: 'New file share', ok: 'Create', cuerpo: campo('fN', 'Name *') + campo('fT', 'Access tier', '<select id="fT"><option>Transaction optimized</option><option>Hot</option><option>Cool</option></select>') + campo('fQ', 'Provisioned capacity (GiB)', '<input id="fQ" type="number" value="100" min="1" max="102400">') + '<p class="az-dim">Nombre: 3 a 63 caracteres, minúsculas, números y guiones.</p>', alOk: (p) => { const k = p.querySelector('#fN').value.trim(); nombreOk(k, /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,62}$/, 'Share names must be 3-63 characters: lowercase letters, numbers and hyphens (not consecutive).'); if (R.shares[k]) throw new Error('The specified share already exists.'); R.shares[k] = { tier: p.querySelector('#fT').value, cuota: Number(p.querySelector('#fQ').value) || 100, creado: ahora() }; actividad('Create File Share', n, 'Succeeded', { rg: R.rg }); guardar(); again(); } });
      box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { if (!confirm(`¿Borrar el recurso compartido ${b.dataset.del}?`)) return; delete R.shares[b.dataset.del]; guardar(); again(); }));
      return true;
    }
    if (blade === 'colas') {
      R.queues = R.queues || {};
      const abierta = box.dataset.cola && R.queues[box.dataset.cola] ? box.dataset.cola : null;
      if (abierta) {
        const Q = R.queues[abierta];
        box.innerHTML = `<div class="az-cmd"><button id="qVolver">${ic('arrow-left')} Queues</button><button id="qMsg">${ic('add')} Add message</button><button id="qDeq" ${Q.mensajes.length ? '' : 'disabled'}>${ic('arrow-down')} Dequeue message</button><button id="qClr" ${Q.mensajes.length ? '' : 'disabled'}>${ic('clear-all')} Clear queue</button></div>
          <h3>${esc(abierta)}</h3><p class="az-dim">Una cola guarda mensajes en orden de llegada: una aplicación los deja y otra los retira cuando puede. "Dequeue" saca el más antiguo (el primero que entró es el primero que sale).</p>
          ${tabla(['Id', 'Message text', 'Insertion time', 'Expiration time', 'Dequeue count'], Q.mensajes.map((m) => `<tr><td><code>${esc(m.id)}</code></td><td>${esc(m.texto)}</td><td>${hora(m.t)}</td><td>${hora(m.exp)}</td><td>${m.n}</td></tr>`), 'No results. La cola está vacía.')}`;
        box.querySelector('#qVolver').onclick = () => { delete box.dataset.cola; bladeStorage(box, { R, n, blade, again }); };
        const redibujar = () => bladeStorage(box, { R, n, blade, again });
        box.querySelector('#qMsg').onclick = () => panel({ titulo: 'Add message to queue', cuerpo: campo('qT', 'Message text *', '<textarea id="qT" rows="4"></textarea>') + campo('qE', 'Expires in (days)', '<input id="qE" type="number" value="7" min="1">'), alOk: (p) => { const t = p.querySelector('#qT').value; if (!t.trim()) throw new Error('The message text must not be empty.'); if (t.length > 65536) throw new Error('The message exceeds the maximum size of 64 KB.'); Q.mensajes.push({ id: `${uid(8)}-${uid(4)}-${uid(4)}`, texto: t, t: ahora(), exp: new Date(Date.now() + (Number(p.querySelector('#qE').value) || 7) * 864e5).toISOString(), n: 0 }); guardar(); redibujar(); } });
        box.querySelector('#qDeq').onclick = () => { const m = Q.mensajes.shift(); guardar(); toast(`Mensaje retirado: ${m.texto.slice(0, 40)}`); redibujar(); };
        box.querySelector('#qClr').onclick = () => { if (!confirm('¿Borrar todos los mensajes de la cola?')) return; Q.mensajes = []; guardar(); redibujar(); };
        return true;
      }
      box.innerHTML = `<div class="az-cmd"><button id="xAdd">${ic('add')} Queue</button><button id="xRef">${ic('refresh')} Refresh</button></div>
        <p class="az-dim">Queue storage guarda mensajes cortos (hasta 64 KB) para que dos partes de un sistema se comuniquen sin esperarse: por ejemplo, "llegó el archivo ventas.csv, procésalo".</p>
        ${tabla(['Queue', 'Url', 'Messages', ''], Object.entries(R.queues).map(([k, q]) => `<tr><td><a class="az-link" data-abrir="${esc(k)}">${ic('list-ordered')} ${esc(k)}</a></td><td><code>https://${esc(n)}.queue.core.windows.net/${esc(k)}</code></td><td>${q.mensajes.length}</td><td><button class="az-tb2" data-del="${esc(k)}" title="Delete queue">${ic('trash')}</button></td></tr>`), 'No queues found.')}`;
      box.querySelector('#xRef').onclick = again;
      box.querySelector('#xAdd').onclick = () => panel({ titulo: 'Add queue', cuerpo: campo('qN', 'Queue name *') + '<p class="az-dim">3 a 63 caracteres: minúsculas, números y guiones.</p>', alOk: (p) => { const k = p.querySelector('#qN').value.trim(); nombreOk(k, /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,62}$/, 'The queue name may only contain lowercase alphanumeric characters and hyphens, and must be 3-63 characters long.'); if (R.queues[k]) throw new Error('The specified queue already exists.'); R.queues[k] = { mensajes: [], creado: ahora() }; actividad('Create Queue', n, 'Succeeded', { rg: R.rg }); guardar(); again(); } });
      box.querySelectorAll('[data-abrir]').forEach((a) => (a.onclick = () => { box.dataset.cola = a.dataset.abrir; bladeStorage(box, { R, n, blade, again }); }));
      box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { if (!confirm(`¿Borrar la cola ${b.dataset.del} y sus mensajes?`)) return; delete R.queues[b.dataset.del]; guardar(); again(); }));
      return true;
    }
    if (blade === 'tablas') {
      R.tables = R.tables || {};
      const abierta = box.dataset.tabla && R.tables[box.dataset.tabla] ? box.dataset.tabla : null;
      const redibujar = () => bladeStorage(box, { R, n, blade, again });
      if (abierta) {
        const T = R.tables[abierta]; const cols = [...new Set(T.entidades.flatMap((e) => Object.keys(e.props)))];
        box.innerHTML = `<div class="az-cmd"><button id="tVolver">${ic('arrow-left')} Tables</button><button id="tAdd">${ic('add')} Add entity</button></div>
          <h3>${esc(abierta)}</h3><p class="az-dim">Cada fila (entidad) se identifica con dos claves: <b>PartitionKey</b> agrupa entidades relacionadas (se guardan juntas y se consultan rápido) y <b>RowKey</b> la distingue dentro de su partición. No hay esquema fijo: cada entidad puede tener propiedades distintas.</p>
          ${tabla(['PartitionKey', 'RowKey', 'Timestamp', ...cols, ''], T.entidades.map((e, i) => `<tr><td>${esc(e.pk)}</td><td>${esc(e.rk)}</td><td>${hora(e.t)}</td>${cols.map((c) => `<td>${esc(e.props[c] ?? '')}</td>`).join('')}<td><button class="az-tb2" data-dele="${i}" title="Delete entity">${ic('trash')}</button></td></tr>`), 'No results. La tabla no tiene entidades.')}`;
        box.querySelector('#tVolver').onclick = () => { delete box.dataset.tabla; redibujar(); };
        box.querySelector('#tAdd').onclick = () => panel({ titulo: 'Add entity', ancho: 520, cuerpo: campo('eP', 'PartitionKey *') + campo('eR', 'RowKey *') + campo('eJ', 'Properties (JSON)', '<textarea id="eJ" rows="5">{ "nombre": "Ana", "ciudad": "Lima" }</textarea>'), alOk: (p) => { const pk = p.querySelector('#eP').value.trim(), rk = p.querySelector('#eR').value.trim(); if (!pk || !rk) throw new Error('PartitionKey and RowKey are required.'); if (T.entidades.some((e) => e.pk === pk && e.rk === rk)) throw new Error('The specified entity already exists (misma PartitionKey y RowKey).'); let props; try { props = JSON.parse(p.querySelector('#eJ').value || '{}'); } catch (e) { throw new Error('Las propiedades no son un JSON válido.'); } if (!props || typeof props !== 'object' || Array.isArray(props)) throw new Error('Las propiedades deben ser un objeto JSON: { "clave": valor }.'); T.entidades.push({ pk, rk, t: ahora(), props }); guardar(); redibujar(); } });
        box.querySelectorAll('[data-dele]').forEach((b) => (b.onclick = () => { T.entidades.splice(Number(b.dataset.dele), 1); guardar(); redibujar(); }));
        return true;
      }
      box.innerHTML = `<div class="az-cmd"><button id="xAdd">${ic('add')} Table</button><button id="xRef">${ic('refresh')} Refresh</button></div>
        <p class="az-dim">Table storage es una base NoSQL simple de clave-valor: barata y rápida para buscar por clave, sin joins ni SQL. Para análisis se usan tablas Delta o un warehouse.</p>
        ${tabla(['Table', 'Url', 'Entities', ''], Object.entries(R.tables).map(([k, t]) => `<tr><td><a class="az-link" data-abrir="${esc(k)}">${ic('table')} ${esc(k)}</a></td><td><code>https://${esc(n)}.table.core.windows.net/${esc(k)}</code></td><td>${t.entidades.length}</td><td><button class="az-tb2" data-del="${esc(k)}" title="Delete table">${ic('trash')}</button></td></tr>`), 'No tables found.')}`;
      box.querySelector('#xRef').onclick = again;
      box.querySelector('#xAdd').onclick = () => panel({ titulo: 'Add table', cuerpo: campo('tN', 'Table name *') + '<p class="az-dim">3 a 63 letras y números; empieza con una letra.</p>', alOk: (p) => { const k = p.querySelector('#tN').value.trim(); nombreOk(k, /^[A-Za-z][A-Za-z0-9]{2,62}$/, 'Table names must be 3-63 alphanumeric characters and cannot begin with a number.'); if (Object.keys(R.tables).some((x) => x.toLowerCase() === k.toLowerCase())) throw new Error('The table specified already exists.'); R.tables[k] = { entidades: [], creado: ahora() }; actividad('Create Table', n, 'Succeeded', { rg: R.rg }); guardar(); again(); } });
      box.querySelectorAll('[data-abrir]').forEach((a) => (a.onclick = () => { box.dataset.tabla = a.dataset.abrir; redibujar(); }));
      box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { if (!confirm(`¿Borrar la tabla ${b.dataset.del}?`)) return; delete R.tables[b.dataset.del]; guardar(); again(); }));
      return true;
    }
    return false;
  }

  // ================================================================ Key Vault: Keys y Certificates
  function bladeKv(box, { R, n, id, blade, again, rbac }) {
    const esClaves = blade === 'claves';
    const rolEscribir = esClaves ? 'Key Vault Crypto Officer' : 'Key Vault Certificates Officer';
    const puede = !rbac || tieneRol(id, ['Key Vault Administrator', rolEscribir]);
    const puedeListar = !rbac || tieneRol(id, ['Key Vault Administrator', rolEscribir, 'Key Vault Reader']);
    const lista = esClaves ? (R.keys = R.keys || {}) : (R.certs = R.certs || {});
    if (!puedeListar) { box.innerHTML = `<div class="az-cmd"><button disabled>${ic('add')} Generate/Import</button></div><div class="az-banner error">${ic('error')} <span>The operation is not allowed by RBAC.<br><small>Ser Owner de la suscripción no da acceso a ${esClaves ? 'las claves' : 'los certificados'}. Asígnate <b>${rolEscribir}</b> (o Key Vault Administrator) en <a href="#/azure/recurso/kv/${encodeURIComponent(n)}/iam">Access control (IAM)</a>.</small></span></div>`; return true; }
    const intro = esClaves
      ? 'Una <b>clave</b> criptográfica sirve para cifrar o firmar. A diferencia de un secreto, <b>su valor privado nunca sale del vault</b>: las aplicaciones le piden a Key Vault que cifre o descifre por ellas. Se usa, por ejemplo, como clave administrada por el cliente (CMK) para cifrar una cuenta de almacenamiento.'
      : 'Un <b>certificado</b> TLS prueba la identidad de un sitio o de una aplicación. Key Vault lo guarda, avisa antes de que venza y puede renovarlo solo.';
    box.innerHTML = `<div class="az-cmd"><button id="kAdd" ${puede ? '' : 'disabled'}>${ic('add')} Generate/Import</button><button id="kRef">${ic('refresh')} Refresh</button></div><p class="az-dim">${intro}</p>
      ${tabla(esClaves ? ['Name', 'Key type', 'Status', 'Versions', 'Activation date', ''] : ['Name', 'Subject', 'Status', 'Expiration date', 'Thumbprint', ''], Object.entries(lista).map(([k, x]) => esClaves
        ? `<tr><td>${ic('key')} ${esc(k)}</td><td>${esc(x.tipo)}</td><td>${x.activa ? '<span class="az-ok">✓ Enabled</span>' : 'Disabled'}</td><td>${x.versiones.length}</td><td>${hora(x.versiones[0].t)}</td><td><button class="az-tb2" data-rot="${esc(k)}" title="Rotate Now: crea una versión nueva" ${puede ? '' : 'disabled'}>${ic('sync')}</button><button class="az-tb2" data-act="${esc(k)}" title="Enable / disable" ${puede ? '' : 'disabled'}>${ic(x.activa ? 'circle-slash' : 'pass')}</button><button class="az-tb2" data-del="${esc(k)}" title="Delete" ${puede ? '' : 'disabled'}>${ic('trash')}</button></td></tr>`
        : `<tr><td>${ic('workspace-trusted')} ${esc(k)}</td><td>${esc(x.sujeto)}</td><td>${new Date(x.vence) > new Date() ? '<span class="az-ok">✓ Enabled</span>' : '<span class="az-mal">Expired</span>'}</td><td>${hora(x.vence)}</td><td><code>${esc(x.huella)}</code></td><td><button class="az-tb2" data-del="${esc(k)}" title="Delete" ${puede ? '' : 'disabled'}>${ic('trash')}</button></td></tr>`), esClaves ? 'There are no keys available.' : 'There are no certificates available.')}`;
    box.querySelector('#kRef').onclick = again;
    box.querySelector('#kAdd').onclick = () => panel(esClaves
      ? { titulo: 'Create a key', ok: 'Create', cuerpo: campo('kN', 'Name *') + campo('kT', 'Key type', '<select id="kT"><option>RSA</option><option>EC</option></select>') + campo('kS', 'RSA key size / curve', '<select id="kS"><option>2048</option><option>3072</option><option>4096</option><option>P-256</option></select>') + '<p class="az-dim">Nombre: letras, números y guiones (1 a 127 caracteres).</p>', alOk: (p) => { const k = p.querySelector('#kN').value.trim(); nombreOk(k, /^[A-Za-z0-9-]{1,127}$/, 'The name must be a 1-127 character string, containing only 0-9, a-z, A-Z, and -.'); if (lista[k]) throw new Error('A key with this name already exists.'); const tipo = p.querySelector('#kT').value; const tam = p.querySelector('#kS').value; lista[k] = { tipo: tipo === 'EC' ? 'EC P-256' : `RSA ${tam === 'P-256' ? 2048 : tam}`, activa: true, versiones: [{ id: uid(32), t: ahora() }] }; actividad('Create Key', n, 'Succeeded', { rg: R.rg }); guardar(); again(); } }
      : { titulo: 'Create a certificate', ok: 'Create', cuerpo: campo('cN', 'Certificate Name *') + campo('cC', 'Type of Certificate Authority (CA)', '<select id="cC"><option>Self-signed certificate</option></select>') + campo('cS', 'Subject *', '<input id="cS" value="CN=midominio.com">') + campo('cM', 'Validity Period (in months)', '<input id="cM" type="number" value="12" min="1" max="24">') + '<p class="az-dim">Un certificado autofirmado sirve para pruebas; en producción lo emite una autoridad certificadora (CA) reconocida.</p>', alOk: (p) => { const k = p.querySelector('#cN').value.trim(); nombreOk(k, /^[A-Za-z0-9-]{1,127}$/, 'The name must be a 1-127 character string, containing only 0-9, a-z, A-Z, and -.'); if (lista[k]) throw new Error('A certificate with this name already exists.'); const suj = p.querySelector('#cS').value.trim(); if (!/^CN=.+/i.test(suj)) throw new Error('The subject must be in X.500 format, for example CN=midominio.com.'); const meses = Math.max(1, Math.min(24, Number(p.querySelector('#cM').value) || 12)); lista[k] = { sujeto: suj, vence: new Date(Date.now() + meses * 30.44 * 864e5).toISOString(), huella: uid(40).toUpperCase(), creado: ahora() }; actividad('Create Certificate', n, 'Succeeded', { rg: R.rg }); guardar(); again(); } });
    box.querySelectorAll('[data-rot]').forEach((b) => (b.onclick = () => { lista[b.dataset.rot].versiones.unshift({ id: uid(32), t: ahora() }); guardar(); toast('Clave rotada: hay una versión nueva. Las anteriores siguen sirviendo para descifrar lo que ya se cifró.'); again(); }));
    box.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => { lista[b.dataset.act].activa = !lista[b.dataset.act].activa; guardar(); again(); }));
    box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { if (!confirm(`¿Borrar ${b.dataset.del}? Queda en borrado temporal (soft delete) durante el período de retención.`)) return; delete lista[b.dataset.del]; guardar(); again(); }));
    return true;
  }

  // ================================================================ Microsoft Entra ID
  const entra = () => { const s = az(); return (s.entra = s.entra || { users: [], groups: [], apps: [] }); };
  const BASE_USR = [[USUARIO, 'Alumno Academia (tú)', 'Member'], ['ana.datos@academia.dev', 'Ana Datos', 'Member']];
  function vistaEntra(cont, r) {
    const E = entra(); const tab = r[0] || 'overview'; const base = 'entra';
    const tabs = [['overview', 'Overview'], ['usuarios', 'Users'], ['grupos', 'Groups'], ['apps', 'App registrations']];
    const cab = `<div class="az-pag">${migas([['Home', ''], ['Microsoft Entra ID', tab === 'overview' ? null : base], ...(tab === 'overview' ? [] : [[tabs.find((t) => t[0] === tab)[1], null]])])}<div class="az-cab">${svg('entra', 28)}<h1>Microsoft Entra ID</h1></div><div class="az-pest">${tabs.map(([k, t]) => `<a class="${k === tab ? 'on' : ''}" href="#/azure/${base}${k === 'overview' ? '' : '/' + k}">${t}</a>`).join('')}</div>`;
    const again = () => vistaEntra(cont, r);
    if (tab === 'overview') {
      cont.innerHTML = `${cab}<p>Microsoft Entra ID (antes Azure Active Directory) es el <b>directorio de identidades</b>: la lista de quién existe para Azure. Todo permiso (rol) se le da a una de estas identidades.</p>
        <table class="az-kv"><tr><th>Tenant ID</th><td><code>${TENANT}</code></td></tr><tr><th>Primary domain</th><td>academia.dev</td></tr><tr><th>Users</th><td>${BASE_USR.length + E.users.length}</td></tr><tr><th>Groups</th><td>${1 + E.groups.length}</td></tr><tr><th>Applications</th><td>${1 + E.apps.length}</td></tr></table>
        <h3>Los cuatro tipos de identidad</h3><table class="az-tabla"><thead><tr><th>Tipo</th><th>Qué es</th><th>Cuándo se usa</th></tr></thead><tbody>
        <tr><td><b>Usuario</b></td><td>Una persona, con correo y contraseña</td><td>Para entrar al portal y trabajar a mano</td></tr>
        <tr><td><b>Grupo</b></td><td>Un conjunto de usuarios</td><td>Para dar permisos a un equipo de una sola vez</td></tr>
        <tr><td><b>Service principal</b> (registro de aplicación)</td><td>La identidad de un programa, con un secreto o certificado</td><td>Para que un pipeline o una app externa (GitHub Actions, un script) entre a Azure</td></tr>
        <tr><td><b>Identidad administrada</b></td><td>Una identidad que Azure crea y cuida para un recurso</td><td>Para que un recurso de Azure (Data Factory, Databricks) acceda a otro sin guardar ninguna clave</td></tr></tbody></table>
        <div class="az-banner info">${ic('info')} <span>Regla práctica: si el que necesita acceso es un recurso de Azure, usa su <b>identidad administrada</b> (no hay secreto que se pueda filtrar ni que venza). Deja el service principal con secreto para lo que corre fuera de Azure.</span></div></div>`;
      return;
    }
    if (tab === 'usuarios') {
      cont.innerHTML = `${cab}<div class="az-cmd"><button id="eAdd">${ic('add')} New user</button></div>${tabla(['Display name', 'User principal name', 'User type', 'Object ID', ''], [...BASE_USR.map(([u, nom, t]) => `<tr><td>${ic('person')} ${esc(nom)}</td><td>${esc(u)}</td><td>${t}</td><td><code>—</code></td><td></td></tr>`), ...E.users.map((u, i) => `<tr><td>${ic('person')} ${esc(u.nombre)}</td><td>${esc(u.upn)}</td><td>Member</td><td><code>${esc(u.id)}</code></td><td><button class="az-tb2" data-del="${i}" title="Delete user">${ic('trash')}</button></td></tr>`)], '')}</div>`;
      cont.querySelector('#eAdd').onclick = () => panel({ titulo: 'Create new user', ok: 'Create', cuerpo: campo('uU', 'User principal name *', '<div class="az-fila-in"><input id="uU" placeholder="maria.lopez"><span>@academia.dev</span></div>') + campo('uN', 'Display name *') + '<p class="az-dim">En el portal real se genera una contraseña temporal que el usuario cambia en su primer ingreso.</p>', alOk: (p) => { const u = p.querySelector('#uU').value.trim().toLowerCase(), nom = p.querySelector('#uN').value.trim(); nombreOk(u, /^[a-z0-9][a-z0-9._-]{1,62}$/, 'User principal name can only contain letters, numbers, periods, underscores and hyphens.'); if (!nom) throw new Error('Display name is required.'); const upn = `${u}@academia.dev`; if ([...BASE_USR.map((x) => x[0]), ...E.users.map((x) => x.upn)].includes(upn)) throw new Error('Another object with the same value for property userPrincipalName already exists.'); E.users.push({ upn, nombre: nom, id: `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}`, creado: ahora() }); guardar(); again(); } });
      cont.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { const u = E.users[Number(b.dataset.del)]; if (!confirm(`¿Borrar a ${u.nombre}? También sale de sus grupos.`)) return; E.users.splice(Number(b.dataset.del), 1); E.groups.forEach((g) => (g.miembros = g.miembros.filter((m) => m !== u.upn))); guardar(); again(); }));
      return;
    }
    if (tab === 'grupos') {
      const todos = [...BASE_USR.map((x) => x[0]), ...E.users.map((x) => x.upn)];
      cont.innerHTML = `${cab}<div class="az-cmd"><button id="eAdd">${ic('add')} New group</button></div><p class="az-dim">Los permisos se asignan a grupos, no a personas: cuando alguien entra o sale del equipo, solo cambias la membresía. Los grupos que crees aparecen en <b>Access control (IAM)</b> para asignarles roles.</p>
        ${tabla(['Name', 'Group type', 'Members', 'Object ID', ''], [`<tr><td>${ic('organization')} ingenieros-datos</td><td>Security</td><td class="az-dim">(grupo de ejemplo)</td><td><code>—</code></td><td></td></tr>`, ...E.groups.map((g, i) => `<tr><td>${ic('organization')} ${esc(g.nombre)}</td><td>Security</td><td>${g.miembros.length ? g.miembros.map(esc).join(', ') : '<span class="az-dim">sin miembros</span>'}</td><td><code>${esc(g.id)}</code></td><td><button class="az-tb2" data-mie="${i}" title="Members">${ic('person-add')}</button><button class="az-tb2" data-del="${i}" title="Delete group">${ic('trash')}</button></td></tr>`)], '')}</div>`;
      cont.querySelector('#eAdd').onclick = () => panel({ titulo: 'New Group', ok: 'Create', cuerpo: campo('gT', 'Group type', '<select id="gT"><option>Security</option></select>') + campo('gN', 'Group name *') + campo('gD', 'Group description'), alOk: (p) => { const nom = p.querySelector('#gN').value.trim(); if (!nom) throw new Error('Group name is required.'); if (nom === 'ingenieros-datos' || E.groups.some((g) => g.nombre.toLowerCase() === nom.toLowerCase())) throw new Error('A group with this name already exists.'); E.groups.push({ nombre: nom, desc: p.querySelector('#gD').value.trim(), miembros: [], id: `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}`, creado: ahora() }); guardar(); again(); } });
      cont.querySelectorAll('[data-mie]').forEach((b) => (b.onclick = () => { const g = E.groups[Number(b.dataset.mie)]; panel({ titulo: `Members · ${g.nombre}`, ok: 'Save', cuerpo: `<p class="az-dim">Marca quién pertenece al grupo.</p>${todos.map((u) => `<label class="az-check"><input type="checkbox" value="${esc(u)}" ${g.miembros.includes(u) ? 'checked' : ''}> ${esc(u)}</label>`).join('')}`, alOk: (p) => { g.miembros = [...p.querySelectorAll('input:checked')].map((x) => x.value); guardar(); again(); } }); }));
      cont.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { const g = E.groups[Number(b.dataset.del)]; if (!confirm(`¿Borrar el grupo ${g.nombre}? Sus asignaciones de roles dejan de tener efecto.`)) return; E.groups.splice(Number(b.dataset.del), 1); guardar(); again(); }));
      return;
    }
    // registros de aplicaciones
    const app = r[1] ? E.apps.find((a) => a.appId === r[1]) : null;
    if (app) {
      cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], ['Microsoft Entra ID', base], ['App registrations', base + '/apps'], [app.nombre, null]])}<div class="az-cab">${svg('entra', 28)}<h1>${esc(app.nombre)}</h1></div>
        <table class="az-kv"><tr><th>Display name</th><td>${esc(app.nombre)}</td></tr><tr><th>Application (client) ID</th><td><code>${esc(app.appId)}</code></td></tr><tr><th>Object ID</th><td><code>${esc(app.objId)}</code></td></tr><tr><th>Directory (tenant) ID</th><td><code>${TENANT}</code></td></tr><tr><th>Supported account types</th><td>My organization only</td></tr></table>
        <div class="az-banner info">${ic('info')} <span>Para que un programa entre a Azure con esta aplicación necesita tres datos: el <b>tenant ID</b>, el <b>client ID</b> y un <b>secreto</b>. Y además hay que darle un <b>rol</b> en Access control (IAM) del recurso: sin rol, entra pero no puede hacer nada.</span></div>
        <h3>Certificates &amp; secrets</h3><div class="az-cmd"><button id="sAdd">${ic('add')} New client secret</button></div>
        ${app.secretoNuevo ? `<div class="az-banner aviso">${ic('warning')} <span><b>Copia el valor ahora.</b> No se vuelve a mostrar al salir de esta página: <code>${esc(app.secretoNuevo)}</code><br><small>Es un valor de práctica generado al azar; no es una credencial real. En tu trabajo, guárdalo en Key Vault, nunca en el código ni en un repositorio.</small></span></div>` : ''}
        ${tabla(['Description', 'Expires', 'Value', 'Secret ID', ''], app.secretos.map((x, i) => `<tr><td>${esc(x.desc)}</td><td>${new Date(x.vence) < new Date() ? `<span class="az-mal">${hora(x.vence)} (vencido)</span>` : hora(x.vence)}</td><td><code>${esc(x.pista)}******************</code></td><td><code>${esc(x.id)}</code></td><td><button class="az-tb2" data-dels="${i}" title="Delete">${ic('trash')}</button></td></tr>`), 'No client secrets have been created for this application.')}
        <p class="az-dim">Los secretos vencen (máximo 24 meses): hay que rotarlos antes de la fecha o lo que dependa de ellos deja de funcionar. Es una causa frecuente de pipelines que "de repente" fallan.</p></div>`;
      delete app.secretoNuevo; guardar();
      cont.querySelector('#sAdd').onclick = () => panel({ titulo: 'Add a client secret', ok: 'Add', cuerpo: campo('sD', 'Description', '<input id="sD" value="secreto-pipeline">') + campo('sE', 'Expires', '<select id="sE"><option value="6">180 days (6 months) — Recommended</option><option value="12">365 days (12 months)</option><option value="24">730 days (24 months)</option></select>'), alOk: (p) => { const valor = `${uid(3)}8Q~${uid(34)}`; app.secretos.push({ desc: p.querySelector('#sD').value.trim() || 'secreto', vence: new Date(Date.now() + Number(p.querySelector('#sE').value) * 30.44 * 864e5).toISOString(), pista: valor.slice(0, 3), id: `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}` }); app.secretoNuevo = valor; guardar(); vistaEntra(cont, r); } });
      cont.querySelectorAll('[data-dels]').forEach((b) => (b.onclick = () => { if (!confirm('¿Borrar el secreto? Lo que lo use dejará de poder entrar.')) return; app.secretos.splice(Number(b.dataset.dels), 1); guardar(); vistaEntra(cont, r); }));
      return;
    }
    cont.innerHTML = `${cab}<div class="az-cmd"><button id="eAdd">${ic('add')} New registration</button></div><p class="az-dim">Registrar una aplicación crea su <b>service principal</b>: la identidad con la que un programa (un pipeline de GitHub Actions, un script, Power BI) entra a Azure. Después se le da un rol en <b>Access control (IAM)</b>.</p>
      ${tabla(['Display name', 'Application (client) ID', 'Created on', 'Certificates & secrets', ''], [`<tr><td>${ic('symbol-misc')} sp-pipeline-adf</td><td><code>—</code></td><td class="az-dim">(aplicación de ejemplo)</td><td></td><td></td></tr>`, ...E.apps.map((a, i) => { const venc = a.secretos.filter((x) => new Date(x.vence) < new Date()).length; return `<tr><td><a href="#/azure/${base}/apps/${a.appId}">${ic('symbol-misc')} ${esc(a.nombre)}</a></td><td><code>${esc(a.appId)}</code></td><td>${hora(a.creado)}</td><td>${a.secretos.length ? `${a.secretos.length} secreto(s)${venc ? ` · <span class="az-mal">${venc} vencido(s)</span>` : ''}` : '<span class="az-dim">ninguno</span>'}</td><td><button class="az-tb2" data-del="${i}" title="Delete">${ic('trash')}</button></td></tr>`; })], '')}</div>`;
    cont.querySelector('#eAdd').onclick = () => panel({ titulo: 'Register an application', ok: 'Register', cuerpo: campo('aN', 'Name *', '<input id="aN" placeholder="sp-github-deploy">') + campo('aT', 'Supported account types', '<select id="aT"><option>Accounts in this organizational directory only (Single tenant)</option></select>'), alOk: (p) => { const nom = p.querySelector('#aN').value.trim(); if (!nom) throw new Error('Name is required.'); if (nom === 'sp-pipeline-adf' || E.apps.some((a) => a.nombre.toLowerCase() === nom.toLowerCase())) throw new Error('An application with this display name already exists.'); const a = { nombre: nom, appId: `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}`, objId: `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}`, secretos: [], creado: ahora() }; E.apps.push(a); guardar(); ir(`${base}/apps/${a.appId}`); } });
    cont.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { const a = E.apps[Number(b.dataset.del)]; if (!confirm(`¿Borrar la aplicación ${a.nombre}? Su service principal y sus secretos dejan de existir.`)) return; E.apps.splice(Number(b.dataset.del), 1); guardar(); again(); }));
  }
  // las identidades creadas aparecen en el selector de Access control (IAM)
  const principalesExtra = () => { const E = entra(); return [...E.users.map((u) => [u.upn, 'User', u.nombre]), ...E.groups.map((g) => [g.nombre, 'Group', g.desc || `Grupo ${g.nombre}`]), ...E.apps.map((a) => [a.nombre, 'ServicePrincipal', `Aplicación ${a.nombre}`])]; };

  // ================================================================ Monitor: métricas, alertas y grupos de acciones
  const monitor = () => { const s = az(); return (s.monitor = s.monitor || { reglas: [], grupos: [], disparadas: [] }); };
  const METRICAS = {
    storage: [['UsedCapacity', 'Used capacity', 'bytes'], ['Transactions', 'Transactions', 'count'], ['Availability', 'Availability', '%'], ['Egress', 'Egress', 'bytes']],
    adf: [['PipelineFailedRuns', 'Failed pipeline runs', 'count'], ['PipelineSucceededRuns', 'Succeeded pipeline runs', 'count'], ['ActivityFailedRuns', 'Failed activity runs', 'count']],
    kv: [['ServiceApiHit', 'Total Service Api Hits', 'count'], ['Availability', 'Overall Vault Availability', '%']],
    dbw: [['Jobs', 'Job runs (simulado)', 'count']], eh: [['IncomingMessages', 'Incoming Messages', 'count'], ['ThrottledRequests', 'Throttled Requests', 'count']],
  };
  // serie de 24 puntos (una por hora): parte se calcula del estado real del recurso y el resto es una curva estable por recurso
  function serie(k, n, R, met) {
    let h = 0; for (const c of `${k}/${n}/${met}`) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
    const azar = (i) => { let x = (h + i * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967295; };
    const horas = [...Array(24)].map((_, i) => new Date(Date.now() - (23 - i) * 36e5));
    let vals;
    if (k === 'storage' && met === 'UsedCapacity') { const usados = Object.values(R.containers || {}).reduce((s, c) => s + Object.values(c.blobs || {}).reduce((t, b) => t + String(typeof b === 'string' ? b : (b && b.content) || '').length, 0), 0); vals = horas.map((_, i) => Math.round(usados * (0.7 + 0.3 * (i / 23)))); }
    else if (k === 'adf' && /Pipeline(Failed|Succeeded)Runs/.test(met)) { const runs = ((R.studio || {}).runs || []).filter((r) => !r.debug); const quiero = /Failed/.test(met) ? 'Failed' : 'Succeeded'; vals = horas.map((d) => runs.filter((r) => r.estado === quiero && Math.abs(new Date(r.inicio || r.t || 0) - d) < 18e5).length); }
    else if (/Availability/.test(met)) vals = horas.map((_, i) => (azar(i) > 0.93 ? Number((99 + azar(i + 50)).toFixed(2)) : 100));
    else if (/Failed|Throttled/.test(met)) vals = horas.map((_, i) => (azar(i) > 0.85 ? Math.ceil(azar(i + 9) * 3) : 0));
    else vals = horas.map((_, i) => Math.round(20 + azar(i) * 180));
    return { horas, vals };
  }
  const agregado = (vals, ag) => (ag === 'Maximum' ? Math.max(...vals) : ag === 'Minimum' ? Math.min(...vals) : ag === 'Average' ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0));
  function grafico({ horas, vals }, umbral) {
    const W = 760, H = 240, izq = 56, an = W - izq - 16, al = H - 46; const mx = Math.max(...vals, umbral || 0, 1) * 1.1, mn = Math.min(0, ...vals);
    const X = (i) => izq + (i / (vals.length - 1)) * an, Y = (v) => 10 + al - ((v - mn) / (mx - mn || 1)) * al;
    const fmt = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1) + ' M' : v >= 1e3 ? (v / 1e3).toFixed(1) + ' k' : Number.isInteger(v) ? String(v) : v.toFixed(2));
    return `<svg viewBox="0 0 ${W} ${H}" class="az-grafico" role="img" aria-label="Gráfico de la métrica en las últimas 24 horas">${[0, 0.5, 1].map((f) => `<line x1="${izq}" x2="${izq + an}" y1="${10 + al - f * al}" y2="${10 + al - f * al}" stroke="#edebe9"/><text x="${izq - 6}" y="${14 + al - f * al}" text-anchor="end" font-size="11" fill="#605e5c">${fmt(mn + (mx - mn) * f)}</text>`).join('')}
      ${horas.map((d, i) => (i % 4 === 0 ? `<text x="${X(i)}" y="${H - 14}" text-anchor="middle" font-size="11" fill="#605e5c">${String(d.getHours()).padStart(2, '0')}:00</text>` : '')).join('')}
      <polyline points="${vals.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="#0078d4" stroke-width="2"/>${vals.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="2.6" fill="#0078d4"><title>${String(horas[i].getHours()).padStart(2, '0')}:00 → ${fmt(v)}</title></circle>`).join('')}
      ${umbral != null ? `<line x1="${izq}" x2="${izq + an}" y1="${Y(umbral)}" y2="${Y(umbral)}" stroke="#d13438" stroke-dasharray="5 4"/><text x="${izq + an}" y="${Y(umbral) - 4}" text-anchor="end" font-size="11" fill="#d13438">umbral ${fmt(umbral)}</text>` : ''}</svg>`;
  }
  const OPS = { GreaterThan: ['Greater than', (a, b) => a > b], GreaterThanOrEqual: ['Greater than or equal to', (a, b) => a >= b], LessThan: ['Less than', (a, b) => a < b], LessThanOrEqual: ['Less than or equal to', (a, b) => a <= b] };
  function evaluarReglas() {
    const M = monitor();
    for (const g of M.reglas) {
      const [k, n] = g.recurso.split('/'); const R = az()[k] && az()[k][n]; if (!R || !g.activa) { g.estado = R ? 'Disabled' : 'Resource not found'; continue; }
      const valor = agregado(serie(k, n, R, g.metrica).vals, g.agregacion); g.valor = valor;
      const dispara = OPS[g.op][1](valor, g.umbral); const antes = g.estado; g.estado = dispara ? 'Fired' : 'OK';
      if (dispara && antes !== 'Fired') { M.disparadas.unshift({ t: ahora(), regla: g.nombre, sev: g.sev, recurso: n, valor, grupo: g.grupo }); M.disparadas = M.disparadas.slice(0, 50); const ag = M.grupos.find((x) => x.nombre === g.grupo); notificar(`Alert fired: ${g.nombre}`, `Sev ${g.sev} · ${n}: ${g.metrica} = ${Number(valor.toFixed(2))}.${ag ? ` Se avisaría a ${ag.correo} (simulado).` : ' La regla no tiene grupo de acciones: nadie recibe el aviso.'}`, 'error', ['Monitor · Alerts', 'monitor/alertas']); }
    }
    guardar();
  }
  function vistaMonitor(cont, r) {
    const M = monitor(); const tab = r[0] || 'overview';
    const tabs = [['overview', 'Overview'], ['metricas', 'Metrics'], ['alertas', 'Alerts'], ['grupos', 'Action groups']];
    const cab = `<div class="az-pag">${migas([['Home', ''], ['Monitor', tab === 'overview' ? null : 'monitor'], ...(tab === 'overview' ? [] : [[tabs.find((t) => t[0] === tab)[1], null]])])}<div class="az-cab">${svg('monitor', 28)}<h1>Monitor</h1></div><div class="az-pest">${tabs.map(([k, t]) => `<a class="${k === tab ? 'on' : ''}" href="#/azure/monitor${k === 'overview' ? '' : '/' + k}">${t}</a>`).join('')}</div>`;
    const rs = recursos().filter((x) => METRICAS[x.k]); const again = () => vistaMonitor(cont, r);
    if (tab === 'overview') {
      evaluarReglas();
      cont.innerHTML = `${cab}<p>Azure Monitor junta en un solo lugar lo que pasa con tus recursos. Tiene tres piezas que se usan juntas:</p>
        <table class="az-tabla"><thead><tr><th>Pieza</th><th>Qué es</th><th>Ejemplo</th></tr></thead><tbody>
        <tr><td><a href="#/azure/monitor/metricas"><b>Metrics</b></a></td><td>Números que se miden cada minuto</td><td>Cuántas ejecuciones de un pipeline fallaron en la última hora</td></tr>
        <tr><td><a href="#/azure/monitor/alertas"><b>Alerts</b></a></td><td>Una regla: "si esta métrica pasa este umbral, avisa"</td><td>Si hay más de 0 pipelines fallidos, avisar</td></tr>
        <tr><td><a href="#/azure/monitor/grupos"><b>Action groups</b></a></td><td>A quién y cómo se avisa</td><td>Un correo al equipo de guardia</td></tr>
        <tr><td><a href="#/azure/actividad"><b>Activity log</b></a></td><td>Quién creó, cambió o borró cada recurso</td><td>"Ana borró la cuenta de almacenamiento a las 14:02"</td></tr></tbody></table>
        <div class="az-ess-nums"><div><b>${M.reglas.length}</b><span>Alert rules</span></div><div><b class="${M.reglas.some((g) => g.estado === 'Fired') ? 'az-mal' : ''}">${M.reglas.filter((g) => g.estado === 'Fired').length}</b><span>Fired now</span></div><div><b>${M.grupos.length}</b><span>Action groups</span></div></div>
        <p class="az-dim">Los logs detallados (Log Analytics y consultas KQL) no están en esta práctica. Para investigar incidentes paso a paso, usa el módulo <a href="#/m/incidentes">Guardia: incidentes</a>.</p></div>`;
      return;
    }
    if (tab === 'metricas') {
      if (!rs.length) { cont.innerHTML = `${cab}<div class="az-vacio">Todavía no hay recursos con métricas. Crea una cuenta de almacenamiento o un data factory y vuelve.</div></div>`; return; }
      const sel = M.verRecurso && rs.some((x) => `${x.k}/${x.n}` === M.verRecurso) ? M.verRecurso : `${rs[0].k}/${rs[0].n}`; const [k, n] = sel.split('/'); const mets = METRICAS[k];
      const met = mets.some((m) => m[0] === M.verMetrica) ? M.verMetrica : mets[0][0]; const ag = M.verAg || 'Sum'; const s = serie(k, n, az()[k][n], met);
      cont.innerHTML = `${cab}<div class="az-fila-sel"><label>Scope<select id="mR">${rs.map((x) => `<option value="${x.k}/${esc(x.n)}" ${`${x.k}/${x.n}` === sel ? 'selected' : ''}>${esc(x.n)} (${esc(TIPOS[x.k].nombre)})</option>`).join('')}</select></label><label>Metric<select id="mM">${mets.map((m) => `<option value="${m[0]}" ${m[0] === met ? 'selected' : ''}>${esc(m[1])}</option>`).join('')}</select></label><label>Aggregation<select id="mA">${['Sum', 'Average', 'Maximum', 'Minimum'].map((a) => `<option ${a === ag ? 'selected' : ''}>${a}</option>`).join('')}</select></label></div>
        <h3>${esc(ag)} ${esc(mets.find((m) => m[0] === met)[1])} · ${esc(n)} <span class="az-dim">· últimas 24 horas</span></h3>${grafico(s)}
        <p><b>${esc(ag)}:</b> ${Number(agregado(s.vals, ag).toFixed(2)).toLocaleString('es')} ${esc(mets.find((m) => m[0] === met)[2])} <button class="az-btn" id="mAlerta" style="margin-left:12px">${ic('bell')} New alert rule</button></p>
        <p class="az-dim">La <b>agregación</b> dice cómo se resume cada tramo: <i>Sum</i> suma (útil para contar fallos), <i>Average</i> promedia (útil para porcentajes), <i>Maximum</i> y <i>Minimum</i> muestran los extremos. ${k === 'adf' && /Pipeline/.test(met) ? 'Esta métrica sale de las ejecuciones reales de tu Data Factory de práctica (Monitor del Studio).' : k === 'storage' && met === 'UsedCapacity' ? 'Esta métrica se calcula con los blobs que subiste.' : 'Los valores de esta métrica son simulados y estables para cada recurso.'}</p></div>`;
      const cambia = () => { M.verRecurso = cont.querySelector('#mR').value; M.verMetrica = cont.querySelector('#mM').value; M.verAg = cont.querySelector('#mA').value; guardar(); again(); };
      ['#mR', '#mM', '#mA'].forEach((q) => (cont.querySelector(q).onchange = cambia));
      cont.querySelector('#mAlerta').onclick = () => nuevaRegla(again, sel, met, ag);
      return;
    }
    if (tab === 'grupos') {
      cont.innerHTML = `${cab}<div class="az-cmd"><button id="gAdd">${ic('add')} Create</button></div><p class="az-dim">Un grupo de acciones es la lista de "a quién avisar y cómo". Se crea una vez y lo reutilizan muchas reglas de alerta.</p>
        ${tabla(['Name', 'Short name', 'Notification', 'Used by', ''], M.grupos.map((g, i) => `<tr><td>${ic('bell')} ${esc(g.nombre)}</td><td>${esc(g.corto)}</td><td>Email → ${esc(g.correo)}</td><td>${M.reglas.filter((x) => x.grupo === g.nombre).length} rule(s)</td><td><button class="az-tb2" data-del="${i}" title="Delete">${ic('trash')}</button></td></tr>`), 'No action groups. Crea uno para que las alertas le lleguen a alguien.')}</div>`;
      cont.querySelector('#gAdd').onclick = () => panel({ titulo: 'Create action group', ok: 'Create', cuerpo: campo('gN', 'Action group name *', '<input id="gN" placeholder="ag-guardia-datos">') + campo('gC', 'Display name (short, max 12) *', '<input id="gC" maxlength="12" placeholder="guardia">') + campo('gE', 'Email *', '<input id="gE" type="email" placeholder="guardia@empresa.com">') + '<p class="az-dim">No se envía ningún correo real: el aviso aparece en las notificaciones del portal.</p>', alOk: (p) => { const nom = p.querySelector('#gN').value.trim(), corto = p.querySelector('#gC').value.trim(), correo = p.querySelector('#gE').value.trim(); if (!nom || !corto) throw new Error('Name and display name are required.'); if (!/^\S+@\S+\.\S+$/.test(correo)) throw new Error('Enter a valid email address.'); if (M.grupos.some((g) => g.nombre.toLowerCase() === nom.toLowerCase())) throw new Error('An action group with this name already exists.'); M.grupos.push({ nombre: nom, corto, correo, creado: ahora() }); guardar(); again(); } });
      cont.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { const g = M.grupos[Number(b.dataset.del)]; if (!confirm(`¿Borrar ${g.nombre}? Las reglas que lo usan dejarán de avisar.`)) return; M.grupos.splice(Number(b.dataset.del), 1); M.reglas.forEach((x) => { if (x.grupo === g.nombre) x.grupo = ''; }); guardar(); again(); }));
      return;
    }
    evaluarReglas();
    const sev = (s) => `<span class="az-sev az-sev${s}">Sev ${s}</span>`;
    cont.innerHTML = `${cab}<div class="az-cmd"><button id="rAdd">${ic('add')} Create alert rule</button><button id="rEval">${ic('refresh')} Refresh</button></div>
      <h3>Alert rules</h3>${tabla(['Name', 'Condition', 'Severity', 'Target', 'Action group', 'Status', ''], M.reglas.map((g, i) => `<tr><td>${esc(g.nombre)}</td><td>${esc(g.agregacion)} ${esc(g.metrica)} ${esc(OPS[g.op][0].toLowerCase())} ${g.umbral}</td><td>${sev(g.sev)}</td><td>${esc(g.recurso.split('/')[1])}</td><td>${g.grupo ? esc(g.grupo) : '<span class="az-mal">ninguno</span>'}</td><td>${g.estado === 'Fired' ? `<span class="az-mal">${ic('warning')} Fired</span> <span class="az-dim">(${Number((g.valor || 0).toFixed(2))})</span>` : g.estado === 'OK' ? `<span class="az-ok">✓ OK</span> <span class="az-dim">(${Number((g.valor || 0).toFixed(2))})</span>` : `<span class="az-dim">${esc(g.estado || '')}</span>`}</td><td><button class="az-tb2" data-act="${i}" title="Enable / disable">${ic(g.activa ? 'circle-slash' : 'pass')}</button><button class="az-tb2" data-del="${i}" title="Delete">${ic('trash')}</button></td></tr>`), 'No alert rules. Crea una desde aquí o desde Metrics.')}
      <h3>Fired alerts</h3>${tabla(['Fired time', 'Alert rule', 'Severity', 'Affected resource', 'Value', 'Notified'], M.disparadas.map((d) => `<tr><td>${hora(d.t)}</td><td>${esc(d.regla)}</td><td>${sev(d.sev)}</td><td>${esc(d.recurso)}</td><td>${Number(d.valor.toFixed(2))}</td><td>${d.grupo ? esc(d.grupo) : '<span class="az-dim">nadie</span>'}</td></tr>`), 'No alerts fired.')}</div>`;
    cont.querySelector('#rAdd').onclick = () => nuevaRegla(again);
    cont.querySelector('#rEval').onclick = again;
    cont.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => { const g = M.reglas[Number(b.dataset.act)]; g.activa = !g.activa; g.estado = ''; guardar(); again(); }));
    cont.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { if (!confirm('¿Borrar la regla de alerta?')) return; M.reglas.splice(Number(b.dataset.del), 1); guardar(); again(); }));
  }
  function nuevaRegla(despues, recurso0, metrica0, ag0) {
    const M = monitor(); const rs = recursos().filter((x) => METRICAS[x.k]);
    if (!rs.length) { toast('Primero crea un recurso (por ejemplo, un data factory o una cuenta de almacenamiento).'); return; }
    const opMet = (k) => METRICAS[k].map((m) => `<option value="${m[0]}" ${m[0] === metrica0 ? 'selected' : ''}>${esc(m[1])}</option>`).join('');
    panel({ titulo: 'Create an alert rule', ok: 'Create', ancho: 560, cuerpo: campo('rR', 'Scope (resource) *', `<select id="rR">${rs.map((x) => `<option value="${x.k}/${esc(x.n)}" ${`${x.k}/${x.n}` === recurso0 ? 'selected' : ''}>${esc(x.n)} (${esc(TIPOS[x.k].nombre)})</option>`).join('')}</select>`) + campo('rM', 'Signal (metric) *', `<select id="rM">${opMet((recurso0 || `${rs[0].k}/`).split('/')[0])}</select>`) + `<div class="az-fila-sel"><label>Aggregation<select id="rA">${['Sum', 'Average', 'Maximum', 'Minimum'].map((a) => `<option ${a === (ag0 || 'Sum') ? 'selected' : ''}>${a}</option>`).join('')}</select></label><label>Operator<select id="rO">${Object.entries(OPS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></label><label>Threshold *<input id="rU" type="number" value="0" step="any"></label></div>` + campo('rS', 'Severity', '<select id="rS"><option value="0">0 - Critical</option><option value="1">1 - Error</option><option value="2" selected>2 - Warning</option><option value="3">3 - Informational</option><option value="4">4 - Verbose</option></select>') + campo('rG', 'Action group', `<select id="rG"><option value="">(ninguno: la alerta se registra pero nadie recibe aviso)</option>${M.grupos.map((g) => `<option>${esc(g.nombre)}</option>`).join('')}</select>`) + campo('rN', 'Alert rule name *', '<input id="rN" placeholder="alerta-pipelines-fallidos">') + '<p class="az-dim">La regla mira las últimas 24 horas de la métrica con la agregación elegida y la compara contra el umbral.</p>',
      alAbrir: (p) => { p.querySelector('#rR').onchange = () => { p.querySelector('#rM').innerHTML = opMet(p.querySelector('#rR').value.split('/')[0]); }; },
      alOk: (p) => { const nom = p.querySelector('#rN').value.trim(); if (!nom) throw new Error('Alert rule name is required.'); if (M.reglas.some((g) => g.nombre.toLowerCase() === nom.toLowerCase())) throw new Error('An alert rule with this name already exists.'); const u = p.querySelector('#rU').value; if (u === '' || isNaN(Number(u))) throw new Error('Threshold must be a number.'); M.reglas.push({ nombre: nom, recurso: p.querySelector('#rR').value, metrica: p.querySelector('#rM').value, agregacion: p.querySelector('#rA').value, op: p.querySelector('#rO').value, umbral: Number(u), sev: Number(p.querySelector('#rS').value), grupo: p.querySelector('#rG').value, activa: true, estado: '', creado: ahora() }); actividad('Create or Update Alert Rule', nom); guardar(); if (location.hash.startsWith('#/azure/monitor/alertas')) despues(); else ir('monitor/alertas'); } });
  }

  // ================================================================ Azure SQL Database
  // Un servidor lógico (nombre único en Azure, cortafuegos, administrador) contiene una o más bases. El editor de
  // consultas ejecuta T-SQL de verdad en el navegador: la base vive en memoria y lo que cambias (CREATE, INSERT…)
  // se vuelve a aplicar al abrirla, así que persiste entre visitas. Solo autenticación de Microsoft Entra: sin contraseñas.
  const sqlSt = () => { const s = az(); return (s.sql = s.sql || { servers: {} }); };
  const MI_IP = '181.45.12.34';
  if (P._i.SERVICIOS && !P._i.SERVICIOS.some((x) => x[1] === 'sql')) { P._i.SVG.sql = '<svg viewBox="0 0 18 18"><ellipse cx="9" cy="4" rx="6.5" ry="2.5" fill="#0078d4"/><path d="M2.5 4v10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V4" fill="#0078d4" opacity=".75"/><text x="9" y="13" font-size="5.5" text-anchor="middle" fill="#fff" font-family="Segoe UI,sans-serif" font-weight="700">SQL</text></svg>'; P._i.SERVICIOS.splice(6, 0, ['SQL databases', 'sql', 'sql']); }
  const basesAbiertas = new Map();
  async function abrirBase(servidor, nombre, B) {
    const k = `${servidor}/${nombre}`; if (basesAbiertas.has(k)) return basesAbiertas.get(k);
    const SQL = window.Engines.SQL; await SQL.init();
    const db = B.muestra ? SQL.fresh() : new SQL._SQL.Database();
    for (const stmt of B.cambios || []) { try { window.SqlMotores.ejecutarEn('sqlserver', stmt, db); } catch (e) { /* una sentencia vieja que ya no aplica */ } }
    basesAbiertas.set(k, db); return db;
  }
  const esCambio = (sql) => /^\s*(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|MERGE|TRUNCATE)\b/i.test(sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));
  function vistaSql(cont, r) {
    const S = sqlSt(); const [srv, dbn, tab = 'overview'] = r; const again = () => vistaSql(cont, r);
    if (!srv) {
      const filas = Object.entries(S.servers).flatMap(([sn, V]) => Object.entries(V.dbs).map(([dn, B]) => `<tr><td><a href="#/azure/sql/${encodeURIComponent(sn)}/${encodeURIComponent(dn)}">${svg('sql')} ${esc(dn)}</a></td><td>${esc(sn)}</td><td><span class="az-ok">Online</span></td><td>${esc(B.sku)}</td><td>${esc(V.rg)}</td><td>${esc(P._i.regionNombre(V.location))}</td><td><button class="az-tb2" data-del="${esc(sn)}/${esc(dn)}" title="Delete">${ic('trash')}</button></td></tr>`));
      cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], ['SQL databases', null]])}<div class="az-cab">${svg('sql', 28)}<h1>SQL databases</h1></div><div class="az-cmd"><button id="qAdd">${ic('add')} Create</button></div>
        <p class="az-dim">Azure SQL Database es SQL Server ofrecido como servicio: Microsoft se ocupa del servidor, los parches y las copias de seguridad; tú solo creas la base y la consultas. Es el tipo de base <b>operativa</b> (la que usa una aplicación) de la que después se copian datos al data lake con Data Factory.</p>
        ${tabla(['Name', 'Server', 'Status', 'Pricing tier', 'Resource group', 'Location', ''], filas, 'No SQL databases to display. Crea una para practicar T-SQL, el cortafuegos y las cadenas de conexión.')}</div>`;
      cont.querySelector('#qAdd').onclick = () => { const G = Object.keys(az().groups || {}).filter((g) => !az().groups[g].administradoPor); if (!G.length) { toast('Primero crea un grupo de recursos (Resource groups → Create).'); return; }
        panel({ titulo: 'Create SQL Database', ok: 'Review + create', ancho: 560, cuerpo: campo('qG', 'Resource group *', `<select id="qG">${G.map((g) => `<option>${esc(g)}</option>`).join('')}</select>`) + campo('qD', 'Database name *', '<input id="qD" placeholder="ventas">') + campo('qS', 'Server name * (nuevo o existente)', `<div class="az-fila-in"><input id="qS" placeholder="sql-datos-dev" list="qSL"><span>.database.windows.net</span></div><datalist id="qSL">${Object.keys(S.servers).map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`) + campo('qL', 'Location', `<select id="qL">${P._i.REGIONES.map(([a, b]) => `<option value="${a}">${esc(b)}</option>`).join('')}</select>`) + campo('qA', 'Authentication method', '<select id="qA"><option>Use Microsoft Entra-only authentication (recommended)</option></select>') + campo('qC', 'Compute + storage', '<select id="qC"><option>General Purpose - Serverless (free offer: 100,000 vCore s/month)</option><option>Basic (5 DTU, 2 GB)</option><option>Standard S0 (10 DTU, 250 GB)</option></select>') + campo('qM', 'Use existing data', '<select id="qM"><option value="">None (base vacía)</option><option value="1">Sample (tienda del curso)</option></select>') + `<p class="az-dim">El administrador será <b>${esc(USUARIO)}</b> (Microsoft Entra). Sin usuario y contraseña de SQL: es lo que Microsoft recomienda y evita guardar contraseñas.</p>`,
          alOk: (p) => { const sn = p.querySelector('#qS').value.trim(), dn = p.querySelector('#qD').value.trim(); nombreOk(sn, /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, 'The server name can contain only lowercase letters, numbers and hyphens, cannot start or end with a hyphen, and must be 1-63 characters.'); nombreOk(dn, /^[^<>*%&:\\/?]{1,128}$/, 'The database name is not valid.'); const V = S.servers[sn] || (S.servers[sn] = { rg: p.querySelector('#qG').value, location: p.querySelector('#qL').value, admin: USUARIO, firewall: [], azure: false, dbs: {}, creado: ahora() }); if (V.dbs[dn]) throw new Error(`Database '${dn}' already exists on server '${sn}'.`); V.dbs[dn] = { sku: p.querySelector('#qC').value.split(' (')[0], muestra: !!p.querySelector('#qM').value, cambios: [], creado: ahora() }; actividad('Create or Update SQL Database', `${sn}/${dn}`, 'Succeeded', { rg: V.rg }); notificar('Deployment succeeded', `SQL database '${dn}' on server '${sn}' was created.`, 'ok', ['Go to resource', `sql/${encodeURIComponent(sn)}/${encodeURIComponent(dn)}`]); guardar(); ir(`sql/${encodeURIComponent(sn)}/${encodeURIComponent(dn)}`); } }); };
      cont.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { const [sn, dn] = b.dataset.del.split('/'); if (!confirm(`¿Borrar la base ${dn}? Se pierden sus tablas y datos.`)) return; delete S.servers[sn].dbs[dn]; basesAbiertas.delete(`${sn}/${dn}`); if (!Object.keys(S.servers[sn].dbs).length) delete S.servers[sn]; guardar(); again(); }));
      return;
    }
    const V = S.servers[srv], B = V && V.dbs[dbn];
    if (!B) { cont.innerHTML = `<div class="az-pag"><div class="az-banner error">${ic('error')} The database could not be found. Puede que se haya borrado.</div><a href="#/azure/sql">SQL databases</a></div>`; return; }
    const base = `sql/${encodeURIComponent(srv)}/${encodeURIComponent(dbn)}`; const host = `${srv}.database.windows.net`;
    const tabs = [['overview', 'Overview'], ['consulta', 'Query editor'], ['red', 'Networking'], ['conexion', 'Connection strings']];
    const cab = `<div class="az-pag">${migas([['Home', ''], ['SQL databases', 'sql'], [`${dbn} (${srv})`, null]])}<div class="az-cab">${svg('sql', 28)}<h1>${esc(dbn)} <small class="az-dim">(${esc(srv)}/${esc(dbn)})</small></h1></div><div class="az-pest">${tabs.map(([k, t]) => `<a class="${k === tab ? 'on' : ''}" href="#/azure/${base}${k === 'overview' ? '' : '/' + k}">${t}</a>`).join('')}</div>`;
    const permitido = V.firewall.some((f) => f.ini === MI_IP || (f.ini === '0.0.0.0' && f.fin === '255.255.255.255'));
    if (tab === 'overview') {
      cont.innerHTML = `${cab}<table class="az-kv"><tr><th>Server name</th><td><code>${esc(host)}</code></td></tr><tr><th>Status</th><td><span class="az-ok">Online</span></td></tr><tr><th>Resource group</th><td>${esc(V.rg)}</td></tr><tr><th>Location</th><td>${esc(P._i.regionNombre(V.location))}</td></tr><tr><th>Pricing tier</th><td>${esc(B.sku)}</td></tr><tr><th>Microsoft Entra admin</th><td>${esc(V.admin)}</td></tr><tr><th>Sample data</th><td>${B.muestra ? 'Tienda del curso (clientes, pedidos, productos…)' : 'None'}</td></tr><tr><th>Earliest restore point</th><td>${hora(B.creado)}</td></tr></table>
        <div class="az-banner ${permitido ? 'ok' : 'aviso'}">${ic(permitido ? 'pass-filled' : 'warning')} <span>${permitido ? 'Tu dirección IP tiene acceso por el cortafuegos del servidor.' : `Todavía no puedes conectarte: el cortafuegos del servidor bloquea todo por defecto. Agrega tu IP en <a href="#/azure/${base}/red">Networking</a>.`}</span></div>
        <h3>Servidor y base: quién es quién</h3><p class="az-dim">El <b>servidor lógico</b> (<code>${esc(srv)}</code>) no es una máquina: es un nombre que agrupa bases y guarda lo que comparten, como el cortafuegos y el administrador. La <b>base de datos</b> (<code>${esc(dbn)}</code>) es donde están las tablas, y es lo que se paga según su nivel de precio.</p></div>`;
      return;
    }
    if (tab === 'red') {
      cont.innerHTML = `${cab}<p class="az-dim">Por defecto <b>nadie</b> puede conectarse desde internet. Cada regla abre un rango de direcciones IP. Abrir <code>0.0.0.0 – 255.255.255.255</code> deja pasar a todo el mundo: no lo hagas en un servidor real.</p>
        <div class="az-cmd"><button id="fIp" ${V.firewall.some((f) => f.ini === MI_IP) ? 'disabled' : ''}>${ic('add')} Add your client IPv4 address (${MI_IP})</button><button id="fAdd">${ic('add')} Add a firewall rule</button></div>
        ${tabla(['Rule name', 'Start IPv4 address', 'End IPv4 address', ''], V.firewall.map((f, i) => `<tr><td>${esc(f.nombre)}</td><td>${esc(f.ini)}</td><td>${esc(f.fin)}</td><td><button class="az-tb2" data-del="${i}" title="Delete rule">${ic('trash')}</button></td></tr>`), 'No firewall rules configured.')}
        <h3>Exceptions</h3><label class="az-check"><input type="checkbox" id="fAz" ${V.azure ? 'checked' : ''}> Allow Azure services and resources to access this server</label><p class="az-dim">Esta casilla deja entrar a servicios de Azure como Data Factory (con su runtime de Azure). Es cómoda para practicar; en producción se prefieren los <i>private endpoints</i>, que no exponen el servidor a internet.</p></div>`;
      cont.querySelector('#fIp').onclick = () => { V.firewall.push({ nombre: `ClientIPAddress_${new Date().toISOString().slice(0, 10)}`, ini: MI_IP, fin: MI_IP }); guardar(); again(); };
      cont.querySelector('#fAdd').onclick = () => panel({ titulo: 'Add a firewall rule', ok: 'OK', cuerpo: campo('fN', 'Rule name *') + campo('fI', 'Start IP *', '<input id="fI" placeholder="181.45.12.0">') + campo('fF', 'End IP *', '<input id="fF" placeholder="181.45.12.255">'), alOk: (p) => { const ip = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/; const nom = p.querySelector('#fN').value.trim(), a = p.querySelector('#fI').value.trim(), b = p.querySelector('#fF').value.trim(); if (!nom) throw new Error('Rule name is required.'); if (!ip.test(a) || !ip.test(b)) throw new Error('Enter valid IPv4 addresses (por ejemplo 181.45.12.34).'); const num = (x) => x.split('.').reduce((s0, n) => s0 * 256 + Number(n), 0); if (num(b) < num(a)) throw new Error('The end IP must be greater than or equal to the start IP.'); V.firewall.push({ nombre: nom, ini: a, fin: b }); guardar(); again(); } });
      cont.querySelector('#fAz').onchange = (e) => { V.azure = e.target.checked; guardar(); };
      cont.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { V.firewall.splice(Number(b.dataset.del), 1); guardar(); again(); }));
      return;
    }
    if (tab === 'conexion') {
      cont.innerHTML = `${cab}<p class="az-dim">Una cadena de conexión le dice a un programa dónde está la base y cómo identificarse. Estas usan Microsoft Entra, así que <b>no llevan contraseña</b>. Si alguna vez usas una con contraseña, no la escribas en el código: guárdala en Key Vault.</p>
        <h3>ADO.NET (Microsoft Entra passwordless)</h3><pre class="az-code">Server=tcp:${esc(host)},1433;Initial Catalog=${esc(dbn)};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Authentication="Active Directory Default";</pre>
        <h3>JDBC (para Databricks o Spark)</h3><pre class="az-code">jdbc:sqlserver://${esc(host)}:1433;database=${esc(dbn)};encrypt=true;trustServerCertificate=false;hostNameInCertificate=*.database.windows.net;loginTimeout=30;authentication=ActiveDirectoryDefault;</pre>
        <h3>ODBC / Python (pyodbc)</h3><pre class="az-code">Driver={ODBC Driver 18 for SQL Server};Server=tcp:${esc(host)},1433;Database=${esc(dbn)};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;Authentication=ActiveDirectoryDefault</pre>
        <h3>sqlcmd</h3><pre class="az-code">sqlcmd -S ${esc(host)} -d ${esc(dbn)} -G</pre></div>`;
      return;
    }
    // editor de consultas
    if (!permitido) {
      cont.innerHTML = `${cab}<div class="az-banner error">${ic('error')} <span>Cannot open server '${esc(srv)}' requested by the login. Client with IP address '${MI_IP}' is not allowed to access the server. To enable access, use the Azure Management Portal or run sp_set_firewall_rule on the master database to create a firewall rule for this IP address or address range.<br><small>Es el primer error que ve casi todo el mundo: el cortafuegos del servidor bloquea tu IP.</small></span></div><button class="az-btn primario" id="qIp">Allowlist IP ${MI_IP} on server ${esc(srv)}</button></div>`;
      cont.querySelector('#qIp').onclick = () => { V.firewall.push({ nombre: `ClientIPAddress_${new Date().toISOString().slice(0, 10)}`, ini: MI_IP, fin: MI_IP }); guardar(); again(); };
      return;
    }
    cont.innerHTML = `${cab}<div class="az-sql"><div class="az-sql-obj"><b>Tables</b><div id="qObj" class="az-dim">Cargando…</div></div><div class="az-sql-ed"><div class="az-cmd"><button id="qRun">${ic('play')} Run</button><span class="az-dim">Conectado como ${esc(V.admin)} · T-SQL</span></div><textarea id="qSql" spellcheck="false" rows="9">${esc(B.borrador || (B.muestra ? 'SELECT TOP 10 pedido_id, cliente_id, fecha_pedido, estado\nFROM pedidos\nORDER BY fecha_pedido DESC;' : "CREATE TABLE clientes (\n  cliente_id INT PRIMARY KEY,\n  nombre NVARCHAR(100) NOT NULL,\n  pais NVARCHAR(50)\n);\n\nINSERT INTO clientes VALUES (1, N'Ana', N'Perú'), (2, N'Luis', N'Chile');\n\nSELECT * FROM clientes;"))}</textarea><div id="qRes" class="az-sql-res"><p class="az-dim">Escribe T-SQL y presiona Run (o Ctrl+Enter).</p></div></div></div>
      <p class="az-dim">Se ejecuta T-SQL de verdad en tu navegador (TOP, GETDATE, ISNULL, corchetes, DECLARE…). Lo que crees o modifiques queda guardado en esta base.</p></div>`;
    const ta = cont.querySelector('#qSql'), res = cont.querySelector('#qRes');
    const pintarObjetos = (db) => { let t = []; try { const x = db.exec("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name"); t = x[0] ? x[0].values.map((v) => v[0]) : []; } catch (e) { t = []; } cont.querySelector('#qObj').innerHTML = t.length ? t.map((n) => `<a class="az-link" data-t="${esc(n)}">${ic('table')} dbo.${esc(n)}</a>`).join('') : 'Sin tablas todavía.'; cont.querySelectorAll('[data-t]').forEach((a) => (a.onclick = () => { ta.value = `SELECT TOP 100 * FROM ${a.dataset.t};`; correr(); })); };
    const correr = async () => {
      const sql = ta.value.trim(); if (!sql) return; B.borrador = ta.value; res.innerHTML = '<p class="az-dim">Ejecutando…</p>';
      const db = await abrirBase(srv, dbn, B); const t0 = performance.now(); let r;
      try { r = window.SqlMotores.ejecutarEn('sqlserver', sql, db); } catch (e) { r = { ok: false, error: e.message }; }
      if (!r.ok) { res.innerHTML = `<div class="az-banner error">${ic('error')} <span style="white-space:pre-wrap">${esc(String(r.error).replace(/\s*\(SQLite:[^)]*\)/g, '').replace(/\(mira el panel "Tablas"\)/, '(mira la lista Tables de la izquierda)'))}</span></div>`; guardar(); return; }
      if (esCambio(sql)) { B.cambios.push(sql); let total = B.cambios.reduce((n, x) => n + x.length, 0); while (B.cambios.length > 300 || total > 150000) total -= B.cambios.shift().length; }
      const ult = (r.results || []).slice(-1)[0];
      res.innerHTML = `<p class="az-ok">Query succeeded | ${Math.max(1, Math.round(performance.now() - t0))} ms${ult ? ` | ${ult.values.length} row(s)` : r.changes ? ` | ${r.changes} row(s) affected` : ''}</p>${ult ? `<div class="az-sql-tabla"><table class="az-tabla"><thead><tr>${ult.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${ult.values.slice(0, 500).map((f) => `<tr>${f.map((x) => `<td>${x == null ? '<span class="az-dim">NULL</span>' : esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}`;
      guardar(); pintarObjetos(db);
    };
    cont.querySelector('#qRun').onclick = correr; ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); correr(); } });
    abrirBase(srv, dbn, B).then(pintarObjetos).catch((e) => { cont.querySelector('#qObj').textContent = 'No se pudo abrir la base: ' + e.message; });
  }

  P.ext = { rutas: { entra: vistaEntra, monitor: vistaMonitor, sql: vistaSql }, blade: (box, o) => (o.k === 'storage' ? bladeStorage(box, o) : o.k === 'kv' ? bladeKv(box, o) : false), principales: principalesExtra };
  void idRecurso; void render;
})();
