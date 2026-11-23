/* Consola de AWS de práctica — S3, Glue, Athena e IAM en el navegador, sin cuenta real.
 *
 * Sigue la forma de trabajar de la consola descrita en la documentación pública de AWS: inicio con servicios
 * recientes, buscador de servicios, selector de región, tablas con selección, asistentes de creación y la
 * página de cada recurso. No usa logos, íconos ni código de AWS: los íconos son genéricos.
 *
 * El estado es el mismo de la CLI simulada `aws` de la terminal (Machine.cloud.aws, terminal-cloud.js): un
 * bucket creado con `aws s3 mb` aparece acá, y una tabla descubierta por un crawler desde la consola se puede
 * consultar con `aws athena start-query-execution`. Athena corre el SQL de verdad sobre los CSV del bucket.
 */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CS = () => window.CloudSim;
  const S = () => CS().aws();
  const guardar = () => { try { CS().save(); } catch (e) { /* sin terminal */ } };
  const ahora = () => new Date().toISOString();
  const fecha = (iso) => { try { return new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); } catch (e) { return iso; } };
  const tam = (n) => (n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB');
  const limpiar = (t) => String(t || '').replace(/\u0001[^\u0002]*\u0002|\u0003/g, '');
  const REGIONES = { 'us-east-1': 'US East (N. Virginia)', 'us-east-2': 'US East (Ohio)', 'us-west-2': 'US West (Oregon)', 'sa-east-1': 'South America (São Paulo)', 'mx-central-1': 'Mexico (Central)', 'eu-west-1': 'Europe (Ireland)', 'eu-central-1': 'Europe (Frankfurt)' };
  const href = (...p) => '#/aws' + (p.length ? '/' + p.map((x) => encodeURIComponent(x)).join('/') : '');
  let main = null, Store = null, toast = () => {}, ruta = [], query = new URLSearchParams();

  // íconos genéricos de línea (no son los de AWS)
  const P = {
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    lupa: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', shell: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>', campana: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14M12 17v.2"/>', engranaje: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    bucket: '<path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z"/><path d="M4 6l2 13c.2 1.2 2.8 2 6 2s5.8-.8 6-2l2-13"/>', carpeta: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    archivo: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>', tabla: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M3 15h18M9 4v16"/>', base: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    araña: '<circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.3 4.3M14.1 14.1l4.3 4.3M5.6 18.4l4.3-4.3M14.1 9.9l4.3-4.3"/>', job: '<path d="M4 7h16M4 12h10M4 17h7"/><path d="M17 14l4 3-4 3z"/>',
    consulta: '<path d="M4 5h16v14H4z"/><path d="M8 10l3 2-3 2M13 15h3"/>', usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', rol: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>', politica: '<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>', mal: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', aviso: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.2"/>',
    subir: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>', basura: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', mas: '<path d="M12 5v14M5 12h14"/>', copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>', refrescar: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', flecha: '<path d="M9 6l6 6-6 6"/>', estrella: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.4l-5.5 3 1-6.3L3 9.7l6.2-.9z"/>',
  };
  const ic = (n, t = 16) => `<svg class="aw-ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  // servicios del buscador y del menú (los no simulados explican qué son y cómo practicarlos)
  const SERV = [
    ['s3', 'S3', 'Scalable storage in the cloud', 'bucket', '#7aa116'], ['glue', 'AWS Glue', 'Data integration and ETL, Data Catalog', 'araña', '#8c4fff'], ['athena', 'Athena', 'Query data in S3 using SQL', 'consulta', '#8c4fff'],
    ['iam', 'IAM', 'Manage access to AWS resources', 'rol', '#dd344c'],
    ['ec2', 'EC2', 'Virtual servers in the cloud', 'grid', '#ed7100'], ['lambda', 'Lambda', 'Run code without thinking about servers', 'job', '#ed7100'], ['redshift', 'Amazon Redshift', 'Fast, simple, cost-effective data warehouse', 'base', '#8c4fff'],
    ['emr', 'Amazon EMR', 'Managed Spark and Hadoop clusters', 'grid', '#8c4fff'], ['kinesis', 'Kinesis', 'Work with real-time streaming data', 'job', '#8c4fff'], ['stepfunctions', 'Step Functions', 'Coordinate distributed applications', 'job', '#e7157b'],
    ['cloudwatch', 'CloudWatch', 'Monitor resources and applications', 'campana', '#e7157b'], ['billing', 'Billing and Cost Management', 'View your bill and costs', 'engranaje', '#7aa116'], ['lakeformation', 'AWS Lake Formation', 'Build a secure data lake', 'rol', '#8c4fff'],
  ];
  const NO_SIM = {
    ec2: ['Máquinas virtuales. Un equipo de datos rara vez las administra a mano: Glue, EMR y Athena las manejan por ti.', 'aws ec2 describe-instances'],
    lambda: ['Funciones que corren ante un evento (por ejemplo, cuando llega un archivo a S3). Se usan para procesos chicos y rápidos.', 'aws lambda list-functions'],
    redshift: ['El data warehouse de AWS. La práctica de SQL de almacén está en Snowflake, BigQuery y Databricks; el SQL es muy parecido.', 'aws redshift-data execute-statement'],
    emr: ['Clústeres de Spark administrados. En el curso, Spark se practica en Databricks y en el laboratorio de PySpark.', 'aws emr list-clusters'],
    kinesis: ['Streams de datos en tiempo real (como Kafka). Se practica en el módulo de streaming.', 'aws kinesis list-streams'],
    stepfunctions: ['Orquesta pasos (Glue, Lambda, Athena) con reintentos. Cumple el mismo rol que un DAG de Airflow.', 'aws stepfunctions list-state-machines'],
    cloudwatch: ['Métricas, logs y alarmas de todos los servicios: donde miras por qué falló un job de Glue.', 'aws logs describe-log-groups'],
    billing: ['La factura y los costos por servicio. En la práctica, Athena muestra el costo de cada consulta (5 USD por TB escaneado).', 'aws ce get-cost-and-usage'],
    lakeformation: ['Permisos finos sobre las tablas del Data Catalog (por columna y por fila). Es la capa de gobierno del lago en AWS.', 'aws lakeformation list-permissions'],
  };
  const POLITICAS = {
    AmazonS3ReadOnlyAccess: ['AWS managed', 'Provides read only access to all buckets via the AWS Management Console.', { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:Get*', 's3:List*', 's3:Describe*'], Resource: '*' }] }],
    AmazonS3FullAccess: ['AWS managed', 'Provides full access to all buckets via the AWS Management Console.', { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:*'], Resource: '*' }] }],
    AWSGlueServiceRole: ['AWS managed', 'Policy for AWS Glue service role which allows access to related services including EC2, S3, and CloudWatch Logs.', { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['glue:*', 's3:GetBucketLocation', 's3:ListBucket', 'logs:CreateLogGroup', 'logs:PutLogEvents'], Resource: '*' }] }],
    AmazonAthenaFullAccess: ['AWS managed', 'Provides full access to Amazon Athena and scoped access to the dependencies needed to enable querying, writing results, and data management.', { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['athena:*', 'glue:GetDatabase*', 'glue:GetTable*', 'glue:GetPartition*'], Resource: '*' }] }],
    AdministratorAccess: ['AWS managed - job function', 'Provides full access to AWS services and resources.', { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: '*', Resource: '*' }] }],
  };
  const TRUST = { glue: 'glue.amazonaws.com', lambda: 'lambda.amazonaws.com', ec2: 'ec2.amazonaws.com', athena: 'athena.amazonaws.com' };

  // la consola recuerda servicios recientes y eventos para los retos (el resto del estado es el de la CLI)
  const con = () => { const c = Store.data.awsConsola; if (c && c.v === 1) return c; return (Store.data.awsConsola = { v: 1, recientes: ['s3', 'glue', 'athena', 'iam'], ev: {} }); };
  const evento = (k) => { const c = con(); c.ev[k] = (c.ev[k] || 0) + 1; try { Store.saveSoon ? Store.saveSoon() : Store.save(); } catch (e) { /* nada */ } };
  const visitar = (id) => { const c = con(); c.recientes = [id, ...c.recientes.filter((x) => x !== id)].slice(0, 8); };

  // ------------------------------------------------------------------ marco: barra superior, menú de servicio y migas
  function marco(servicio, nav, migas, cuerpo) {
    const s = S(), reg = s.region || 'us-east-1';
    return `<div class="awp" id="awp"><header class="aw-top">
      <a class="aw-logo" href="${href()}" title="Console Home"><b>aws</b><span class="aw-tag">práctica</span></a>
      <button class="aw-top-b" id="awServ" aria-haspopup="true">${ic('grid', 16)}<span>Services</span></button>
      <label class="aw-buscar">${ic('lupa', 16)}<input id="awQ" placeholder="Search" aria-label="Search services" autocomplete="off"><kbd>[Alt+S]</kbd><div class="aw-sug" id="awSug" hidden></div></label>
      <span class="aw-sp"></span>
      <button class="aw-top-i" id="awShell" title="CloudShell (en la práctica: la terminal del curso)" aria-label="CloudShell">${ic('shell', 18)}</button>
      <button class="aw-top-i" title="Notifications" aria-label="Notifications" data-nada>${ic('campana', 18)}</button>
      <button class="aw-top-i" title="Help" aria-label="Help" data-nada>${ic('ayuda', 18)}</button>
      <label class="aw-region" title="Region">${esc(REGIONES[reg] ? REGIONES[reg].split(' (')[1].replace(')', '') : reg)} <select id="awReg" aria-label="Region">${Object.entries(REGIONES).map(([k, v]) => `<option value="${k}" ${k === reg ? 'selected' : ''}>${esc(v)} ${k}</option>`).join('')}</select></label>
      <span class="aw-cuenta" title="Account">alumno @ ${s.account.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')}</span>
    </header>
    <div class="aw-menu-serv" id="awMenuServ" hidden><div class="aw-ms-t">Recently visited</div><div class="aw-ms-g">${con().recientes.map((id) => { const x = SERV.find((v) => v[0] === id); return x ? `<a href="${href(id)}">${iconoServ(x)}<span>${esc(x[1])}</span></a>` : ''; }).join('')}</div>
      <div class="aw-ms-t">All services</div><div class="aw-ms-g">${SERV.map((x) => `<a href="${href(x[0])}">${iconoServ(x)}<span>${esc(x[1])}</span></a>`).join('')}</div></div>
    <div class="aw-cuerpo">${nav ? `<nav class="aw-nav" aria-label="${esc(servicio)}"><div class="aw-nav-t">${esc(servicio)}</div>${nav}</nav>` : ''}
      <main class="aw-main">${migas ? `<div class="aw-migas">${migas.map(([t, h], i) => (h && i < migas.length - 1 ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join(`<span class="aw-sep">${ic('flecha', 12)}</span>`)}</div>` : ''}${cuerpo}</main></div>
    <div class="aw-modal" id="awModal" hidden></div><div class="aw-flash" id="awFlash" role="status" aria-live="polite"></div></div>`;
  }
  const iconoServ = (x) => `<span class="aw-serv-ic" style="background:${x[4]}">${ic(x[3], 18)}</span>`;
  const navLinks = (items, sel) => items.map(([id, t, h]) => (id[0] === '#' ? `<div class="aw-nav-sec">${esc(id.slice(1))}</div>` : `<a class="aw-nav-i${sel === id ? ' on' : ''}" href="${h}">${esc(t)}</a>`)).join('');
  function flash(tipo, txt) { const f = main.querySelector('#awFlash'); if (!f) return; f.innerHTML = `<div class="aw-fl aw-fl-${tipo}">${ic(tipo === 'ok' ? 'ok' : tipo === 'mal' ? 'mal' : 'info', 18)}<div>${txt}</div><button aria-label="Dismiss" data-cerrar-fl>✕</button></div>`; f.querySelector('[data-cerrar-fl]').onclick = () => { f.innerHTML = ''; }; }
  function montarMarco() {
    const q = main.querySelector('#awQ'), sug = main.querySelector('#awSug');
    const pintar = () => { const t = q.value.trim().toLowerCase(); const r = t ? SERV.filter((x) => (x[1] + ' ' + x[2] + ' ' + x[0]).toLowerCase().includes(t)) : []; sug.hidden = !r.length; sug.innerHTML = '<div class="aw-sug-t">Services</div>' + r.map((x) => `<a href="${href(x[0])}">${iconoServ(x)}<span><b>${esc(x[1])}</b><small>${esc(x[2])}</small></span></a>`).join(''); };
    q.addEventListener('input', pintar); q.addEventListener('focus', pintar); q.addEventListener('blur', () => setTimeout(() => { sug.hidden = true; }, 180));
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = sug.querySelector('a'); if (a) location.hash = a.getAttribute('href'); } if (e.key === 'Escape') q.blur(); });
    const ms = main.querySelector('#awMenuServ');
    main.querySelector('#awServ').onclick = (e) => { e.stopPropagation(); ms.hidden = !ms.hidden; };
    main.addEventListener('click', (e) => { if (!ms.hidden && !e.target.closest('#awMenuServ, #awServ')) ms.hidden = true; });
    main.querySelector('#awShell').onclick = () => { location.hash = '#/lab/terminal'; };
    main.querySelector('#awReg').onchange = (e) => { S().region = e.target.value; guardar(); flash('info', `Region changed to <b>${esc(REGIONES[e.target.value])}</b>. S3 is global; the other services show the resources of this region.`); dibujar(); };
    main.querySelectorAll('[data-nada]').forEach((b) => { b.onclick = () => toast('(práctica) No hay notificaciones ni ayuda en la réplica'); });
  }
  function modal(html, alMontar) {
    const m = main.querySelector('#awModal'); m.hidden = false;
    m.innerHTML = `<div class="aw-modal-c" role="dialog" aria-modal="true">${html}</div>`;
    const cerrar = () => { m.hidden = true; m.innerHTML = ''; };
    m.querySelectorAll('[data-cerrar]').forEach((b) => { b.onclick = cerrar; });
    m.onclick = (e) => { if (e.target === m) cerrar(); };
    if (alMontar) alMontar(m, cerrar);
    const f = m.querySelector('input, textarea, select'); if (f) setTimeout(() => f.focus(), 30);
  }
  const cont = (titulo, cuerpo, acciones = '', desc = '') => `<section class="aw-cont"><div class="aw-cont-h"><div><h2>${titulo}</h2>${desc ? `<p class="aw-dim">${desc}</p>` : ''}</div><div class="aw-acc">${acciones}</div></div><div class="aw-cont-b">${cuerpo}</div></section>`;
  const btn = (t, attr = '', tipo = '') => `<button type="button" class="aw-btn${tipo ? ' aw-btn-' + tipo : ''}" ${attr}>${t}</button>`;
  const vacio = (t, d, b = '') => `<div class="aw-vacio"><b>${esc(t)}</b><p>${d}</p>${b}</div>`;

  // ------------------------------------------------------------------ inicio de la consola
  function inicio() {
    const s = S(), c = con();
    const nb = Object.keys(s.buckets).length, nd = Object.keys(s.glueDbs).length, nq = (s.athenaHist || []).length;
    const cuerpo = `<h1 class="aw-h1">Console Home <span class="aw-info-b">Info</span></h1>
      <div class="aw-widgets">
        ${cont('Recently visited', `<div class="aw-recientes">${c.recientes.map((id) => { const x = SERV.find((v) => v[0] === id); return x ? `<a href="${href(id)}">${iconoServ(x)}<span>${esc(x[1])}</span></a>` : ''; }).join('')}</div>`, '', '')}
        ${cont('Welcome to AWS', `<ul class="aw-lista"><li><a href="${href('s3')}">Getting started with S3</a><span class="aw-dim">Store the files of your data lake in buckets.</span></li><li><a href="${href('glue')}">Catalog your data with AWS Glue</a><span class="aw-dim">A crawler reads S3 and creates tables.</span></li><li><a href="${href('athena')}">Query with Athena</a><span class="aw-dim">SQL on the files, pay per data scanned.</span></li></ul>`)}
        ${cont('Your data lake (práctica)', `<div class="aw-stats"><div><b>${nb}</b><span>S3 buckets</span></div><div><b>${nd}</b><span>Glue databases</span></div><div><b>${nq}</b><span>Athena queries</span></div></div><p class="aw-dim">Es el mismo estado que el comando <code>aws</code> de la terminal del curso: lo que creas allá aparece acá.</p>`)}
        ${cont('AWS Health', `<p>${ic('ok')} No open issues.</p><p class="aw-dim">En una cuenta real, acá aparecen las caídas o mantenimientos de los servicios que usas.</p>`)}
      </div>`;
    main.innerHTML = marco('', '', null, cuerpo); montarMarco();
  }
  function noSimulado(id) {
    const x = SERV.find((v) => v[0] === id), [txt, cli] = NO_SIM[id];
    main.innerHTML = marco(x[1], '', [[x[1], '']], `<h1 class="aw-h1">${esc(x[1])}</h1>${cont('Esta consola no está simulada', `<p>${esc(txt)}</p><p>En la terminal del curso puedes probar la CLI: <code>${esc(cli)}</code></p><p>${btn('Abrir la terminal', 'data-term', 'primario')}</p>`)}`);
    montarMarco(); main.querySelector('[data-term]').onclick = () => { location.hash = '#/lab/terminal'; };
  }

  // ------------------------------------------------------------------ S3
  const NAV_S3 = () => navLinks([['buckets', 'General purpose buckets', href('s3')], ['#Storage Lens'], ['lens', 'Dashboards', href('s3', 'lens')], ['#Feature spotlight'], ['bpa', 'Block Public Access settings for this account', href('s3', 'bpa')]], ruta[1] === 'lens' ? 'lens' : ruta[1] === 'bpa' ? 'bpa' : 'buckets');
  function s3() {
    visitar('s3');
    if (ruta[1] === 'crear') return s3Crear();
    if (ruta[1] === 'b' && ruta[2]) return s3Bucket(ruta[2]);
    if (ruta[1] === 'lens' || ruta[1] === 'bpa') {
      main.innerHTML = marco('Amazon S3', NAV_S3(), [['Amazon S3', href('s3')], [ruta[1] === 'lens' ? 'Storage Lens' : 'Block Public Access', '']], cont(ruta[1] === 'lens' ? 'Storage Lens dashboards' : 'Block Public Access settings for this account', ruta[1] === 'lens' ? '<p>Muestra cuánto ocupa cada bucket y cómo crece. En la práctica, el tamaño está en la lista de buckets y en cada objeto.</p>' : `<p>${ic('ok')} <b>Block all public access: On</b></p><p class="aw-dim">Así viene por defecto desde 2023 y así debe quedar en un lago de datos: nada público.</p>`));
      return montarMarco();
    }
    const s = S(), bs = Object.entries(s.buckets);
    const filas = bs.map(([n, b]) => { const tot = Object.values(b.objects).reduce((x, o) => x + o.c.length, 0); return `<tr><td><input type="radio" name="awSelB" value="${esc(n)}" aria-label="Select ${esc(n)}"></td><td><a href="${href('s3', 'b', n)}">${esc(n)}</a></td><td>${esc(REGIONES[b.region] || b.region)} ${esc(b.region)}</td><td>${Object.keys(b.objects).length} objects · ${tam(tot)}</td><td>${esc(fecha(b.created))}</td></tr>`; }).join('');
    const cuerpo = `<h1 class="aw-h1">Amazon S3</h1>${cont(`General purpose buckets <span class="aw-cnt">(${bs.length})</span>`, bs.length ? `<div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th><span class="aw-sr">Select</span></th><th>Name</th><th>AWS Region</th><th>Size (práctica)</th><th>Creation date</th></tr></thead><tbody>${filas}</tbody></table></div>`
      : vacio('No buckets', 'You don’t have any buckets.', btn('Create bucket', `onclick="location.hash='${href('s3', 'crear')}'"`, 'primario')),
    `${btn(ic('refrescar'), 'data-refrescar aria-label="Refresh"')}${btn('Copy ARN', 'data-arn disabled')}${btn('Empty', 'data-vaciar disabled')}${btn('Delete', 'data-borrar disabled')}${btn('Create bucket', 'data-crear', 'primario')}`,
    'Buckets are containers for data stored in S3.')}`;
    main.innerHTML = marco('Amazon S3', NAV_S3(), [['Amazon S3', href('s3')], ['Buckets', '']], cuerpo); montarMarco();
    const sel = () => (main.querySelector('[name=awSelB]:checked') || {}).value;
    main.querySelectorAll('[name=awSelB]').forEach((r) => { r.onchange = () => main.querySelectorAll('[data-arn],[data-vaciar],[data-borrar]').forEach((b) => { b.disabled = false; }); });
    main.querySelector('[data-crear]').onclick = () => { location.hash = href('s3', 'crear'); };
    main.querySelector('[data-refrescar]').onclick = () => dibujar();
    main.querySelector('[data-arn]').onclick = () => { const n = sel(); try { navigator.clipboard.writeText('arn:aws:s3:::' + n); } catch (e) { /* nada */ } flash('ok', `ARN copied: <code>arn:aws:s3:::${esc(n)}</code>`); };
    main.querySelector('[data-vaciar]').onclick = () => confirmar(`Empty bucket`, `Para vaciar <b>${esc(sel())}</b> escribe <i>permanently delete</i>. Se borran todos sus objetos.`, 'permanently delete', () => { const n = sel(); S().buckets[n].objects = {}; guardar(); dibujar(); flash('ok', `Successfully emptied bucket "${esc(n)}".`); });
    main.querySelector('[data-borrar]').onclick = () => { const n = sel(); if (Object.keys(S().buckets[n].objects).length) { flash('mal', `This bucket is not empty. Buckets must be empty before they can be deleted. To delete all objects in the bucket, use the <b>Empty</b> bucket configuration.`); return; } confirmar('Delete bucket', `Para confirmar, escribe el nombre del bucket: <b>${esc(n)}</b>`, n, () => { delete S().buckets[n]; guardar(); dibujar(); flash('ok', `Successfully deleted bucket "${esc(n)}".`); }); };
  }
  function confirmar(titulo, txt, palabra, alOk) {
    modal(`<h2>${esc(titulo)}</h2><p>${txt}</p><input class="aw-in" id="awConf" placeholder="${esc(palabra)}" aria-label="Confirmation"><div class="aw-modal-b">${btn('Cancel', 'data-cerrar', 'link')}${btn(esc(titulo.split(' ')[0]), 'id="awConfOk" disabled', 'primario')}</div>`, (m, cerrar) => {
      const i = m.querySelector('#awConf'), b = m.querySelector('#awConfOk');
      i.oninput = () => { b.disabled = i.value !== palabra; };
      b.onclick = () => { cerrar(); alOk(); };
    });
  }
  function s3Crear() {
    const s = S();
    const cuerpo = `<h1 class="aw-h1">Create bucket <span class="aw-info-b">Info</span></h1><p class="aw-dim">Buckets are containers for data stored in S3.</p>
      ${cont('General configuration', `<label class="aw-lbl">AWS Region</label><div class="aw-ro">${esc(REGIONES[s.region] || s.region)} ${esc(s.region)}</div>
        <label class="aw-lbl" for="awBN">Bucket name <span class="aw-info-b">Info</span></label><input class="aw-in" id="awBN" placeholder="myawsbucket" autocomplete="off">
        <p class="aw-ayuda">Bucket name must be unique within the global namespace and follow the bucket naming rules. <span id="awBNerr" class="aw-err"></span></p>
        <ul class="aw-reglas"><li>3–63 caracteres: minúsculas, números, puntos y guiones.</li><li>Empieza y termina con letra o número.</li><li>Único en todo AWS: en una empresa se usa un prefijo propio, por ejemplo <code>tienda-andina-datos-dev</code>.</li></ul>`)}
      ${cont('Object Ownership', `<label class="aw-radio"><input type="radio" name="awOwn" checked><div><b>ACLs disabled (recommended)</b><div class="aw-dim">All objects in this bucket are owned by this account. Access is specified using only policies.</div></div></label><label class="aw-radio"><input type="radio" name="awOwn"><div><b>ACLs enabled</b><div class="aw-dim">Objects can be owned by other AWS accounts.</div></div></label>`)}
      ${cont('Block Public Access settings for this bucket', `<label class="aw-check"><input type="checkbox" id="awBPA" checked><div><b>Block all public access</b><div class="aw-dim">Turning this setting on is the same as turning on all four settings below.</div></div></label><div class="aw-alerta aw-alerta-aviso" id="awBPAav" hidden>${ic('aviso')} <div><b>Turning off block all public access might result in this bucket and the objects within becoming public.</b> En un lago de datos, nunca lo desactives.</div></div>`)}
      ${cont('Bucket Versioning', `<label class="aw-radio"><input type="radio" name="awVer" value="off" checked><div><b>Disable</b></div></label><label class="aw-radio"><input type="radio" name="awVer" value="on"><div><b>Enable</b><div class="aw-dim">Guarda versiones anteriores de cada objeto: si alguien pisa o borra un archivo, se puede recuperar.</div></div></label>`)}
      ${cont('Default encryption', `<label class="aw-radio"><input type="radio" name="awEnc" checked><div><b>Server-side encryption with Amazon S3 managed keys (SSE-S3)</b></div></label><label class="aw-radio"><input type="radio" name="awEnc"><div><b>Server-side encryption with AWS Key Management Service keys (SSE-KMS)</b></div></label>`)}
      <div class="aw-pie">${btn('Cancel', `onclick="location.hash='${href('s3')}'"`, 'link')}${btn('Create bucket', 'id="awBCrear"', 'primario')}</div>`;
    main.innerHTML = marco('Amazon S3', NAV_S3(), [['Amazon S3', href('s3')], ['Buckets', href('s3')], ['Create bucket', '']], cuerpo); montarMarco();
    main.querySelector('#awBPA').onchange = (e) => { main.querySelector('#awBPAav').hidden = e.target.checked; };
    main.querySelector('#awBCrear').onclick = () => {
      const n = main.querySelector('#awBN').value.trim(), err = main.querySelector('#awBNerr');
      if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(n) || /\.\.|^\d+\.\d+\.\d+\.\d+$/.test(n)) { err.textContent = 'Bucket name is not valid. Revisa las reglas de abajo.'; main.querySelector('#awBN').focus(); return; }
      if (S().buckets[n]) { err.textContent = 'A bucket with the same name already exists.'; return; }
      S().buckets[n] = { region: S().region, objects: {}, created: ahora(), versioning: main.querySelector('[name=awVer]:checked').value === 'on', publico: !main.querySelector('#awBPA').checked };
      guardar(); evento('s3-crear');
      location.hash = href('s3', 'b', n); setTimeout(() => flash('ok', `Successfully created bucket "<b>${esc(n)}</b>". To upload files and folders, or to configure additional bucket settings, choose <b>View details</b>.`), 60);
    };
  }
  // datos de ejemplo del curso: pocas filas, particionadas por mes (para no llenar el almacenamiento del navegador)
  function ejemplo(tabla) {
    const T = (window.DataGen && window.DataGen.build) ? window.DataGen.build() : null; if (!T || !T[tabla]) return [];
    const t = T[tabla], csv = (rows) => [t.columns.join(','), ...rows.map((r) => r.map((v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(','))].join('\n') + '\n';
    if (tabla !== 'pedidos') return [[`${tabla}/${tabla}.csv`, csv(t.rows.slice(0, 300))]];
    const iF = t.columns.indexOf('fecha_pedido'), grupos = {};
    for (const r of t.rows.slice(0, 900)) { const m = String(r[iF]).slice(0, 7); (grupos[m] = grupos[m] || []).push(r); }
    return Object.entries(grupos).slice(0, 4).map(([m, rows]) => [`pedidos/anio_mes=${m}/pedidos.csv`, csv(rows)]);
  }
  function s3Bucket(n) {
    const b = S().buckets[n];
    if (!b) { main.innerHTML = marco('Amazon S3', NAV_S3(), [['Amazon S3', href('s3')], [n, '']], cont('Bucket not found', `<p>El bucket <b>${esc(n)}</b> no existe (o se borró desde la terminal).</p>`)); return montarMarco(); }
    const tab = query.get('tab') || 'objects', pre = query.get('prefix') || '';
    const claves = Object.keys(b.objects).filter((k) => k.startsWith(pre)).sort();
    const dirs = new Set(), files = [];
    for (const k of claves) { const rest = k.slice(pre.length); if (rest.includes('/')) dirs.add(rest.split('/')[0] + '/'); else if (rest) files.push(k); }
    const migaPre = pre ? pre.split('/').filter(Boolean).map((p, i, a) => [p, href('s3', 'b', n) + '?prefix=' + encodeURIComponent(a.slice(0, i + 1).join('/') + '/')]) : [];
    const objs = `<div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th><span class="aw-sr">Select</span></th><th>Name</th><th>Type</th><th>Last modified</th><th>Size</th></tr></thead><tbody>
      ${[...dirs].sort().map((d) => `<tr><td><input type="checkbox" data-sel="${esc(pre + d)}" aria-label="Select ${esc(d)}"></td><td>${ic('carpeta')} <a href="${href('s3', 'b', n)}?prefix=${encodeURIComponent(pre + d)}">${esc(d)}</a></td><td>Folder</td><td>-</td><td>-</td></tr>`).join('')}
      ${files.map((k) => `<tr><td><input type="checkbox" data-sel="${esc(k)}" aria-label="Select ${esc(k.slice(pre.length))}"></td><td>${ic('archivo')} <a href="#" data-obj="${esc(k)}">${esc(k.slice(pre.length))}</a></td><td>${esc((k.split('.').pop() || '').toLowerCase())}</td><td>${esc(fecha(b.objects[k].m))}</td><td>${tam(b.objects[k].c.length)}</td></tr>`).join('')}
      </tbody></table></div>${!dirs.size && !files.length ? vacio('No objects', 'You don’t have any objects in this bucket.', btn(ic('subir') + ' Upload', 'data-subir', 'primario')) : ''}`;
    const TABS = [['objects', 'Objects'], ['properties', 'Properties'], ['permissions', 'Permissions'], ['management', 'Management']];
    let cuerpoTab = '';
    if (tab === 'objects') cuerpoTab = cont(`Objects <span class="aw-cnt">(${dirs.size + files.length})</span>`, `<p class="aw-dim">Objects are the fundamental entities stored in Amazon S3. Las "carpetas" son prefijos de la clave: <code>pedidos/anio_mes=2024-01/pedidos.csv</code> es un solo objeto.</p>${objs}`,
      `${btn(ic('refrescar'), 'data-refrescar aria-label="Refresh"')}${btn('Copy S3 URI', 'data-uri')}${btn('Delete', 'data-borrar disabled')}${btn('Create folder', 'data-carpeta')}${btn(ic('subir') + ' Upload', 'data-subir', 'primario')}`);
    else if (tab === 'properties') cuerpoTab = cont('Bucket overview', `<dl class="aw-dl"><dt>AWS Region</dt><dd>${esc(REGIONES[b.region] || b.region)} ${esc(b.region)}</dd><dt>Amazon Resource Name (ARN)</dt><dd><code>arn:aws:s3:::${esc(n)}</code></dd><dt>Creation date</dt><dd>${esc(fecha(b.created))}</dd></dl>`) + cont('Bucket Versioning', `<p>${b.versioning ? 'Enabled' : 'Disabled'}</p>`, btn('Edit', 'data-ver')) + cont('Default encryption', '<p>Server-side encryption with Amazon S3 managed keys (SSE-S3)</p>');
    else if (tab === 'permissions') cuerpoTab = cont('Block public access (bucket settings)', `<p>${b.publico ? ic('aviso') + ' <b>Off</b>: el bucket puede quedar público. En un lago de datos, actívalo.' : ic('ok') + ' <b>Block all public access: On</b>'}</p>`, btn('Edit', 'data-bpa')) + cont('Bucket policy', '<p class="aw-dim">No policy to display. Con <i>Block Public Access</i> encendido y sin política, solo acceden los usuarios y roles de tu cuenta con permisos de IAM.</p>');
    else cuerpoTab = cont('Lifecycle rules', '<p class="aw-dim">There are no lifecycle rules for this bucket. Una regla de ciclo de vida mueve los datos viejos a una clase más barata (por ejemplo, <i>Glacier</i> después de 90 días) o los borra: así baja el costo del lago.</p>');
    const cuerpo = `<h1 class="aw-h1">${esc(n)} <span class="aw-info-b">Info</span></h1><div class="aw-tabs" role="tablist">${TABS.map(([id, t]) => `<a role="tab" aria-selected="${tab === id}" class="${tab === id ? 'on' : ''}" href="${href('s3', 'b', n)}?tab=${id}">${t}</a>`).join('')}</div>${cuerpoTab}`;
    main.innerHTML = marco('Amazon S3', NAV_S3(), [['Amazon S3', href('s3')], ['Buckets', href('s3')], [n, pre ? href('s3', 'b', n) : ''], ...migaPre], cuerpo); montarMarco();
    const q = (s) => main.querySelector(s);
    if (q('[data-refrescar]')) q('[data-refrescar]').onclick = () => dibujar();
    if (q('[data-uri]')) q('[data-uri]').onclick = () => { const u = `s3://${n}/${pre}`; try { navigator.clipboard.writeText(u); } catch (e) { /* nada */ } flash('ok', `S3 URI copied: <code>${esc(u)}</code>`); };
    main.querySelectorAll('[data-subir]').forEach((x) => { x.onclick = () => subir(n, pre); });
    if (q('[data-carpeta]')) q('[data-carpeta]').onclick = () => modal(`<h2>Create folder</h2><p class="aw-dim">Una carpeta en S3 es un prefijo. Para que Athena y Glue reconozcan particiones, usa <code>columna=valor</code>, por ejemplo <code>anio_mes=2024-07</code>.</p><label class="aw-lbl" for="awCN">Folder name</label><input class="aw-in" id="awCN" placeholder="raw"><div class="aw-modal-b">${btn('Cancel', 'data-cerrar', 'link')}${btn('Create folder', 'id="awCNok"', 'primario')}</div>`, (m, cerrar) => {
      m.querySelector('#awCNok').onclick = () => { const v = m.querySelector('#awCN').value.trim().replace(/^\/+|\/+$/g, ''); if (!v || /\s/.test(v)) return; b.objects[pre + v + '/'] = { c: '', m: ahora() }; guardar(); evento('s3-carpeta'); if (/=/.test(v)) evento('s3-particion'); cerrar(); dibujar(); flash('ok', `Successfully created folder "${esc(v)}".`); };
    });
    const marcados = () => [...main.querySelectorAll('[data-sel]:checked')].map((x) => x.dataset.sel);
    main.querySelectorAll('[data-sel]').forEach((x) => { x.onchange = () => { if (q('[data-borrar]')) q('[data-borrar]').disabled = !marcados().length; }; });
    if (q('[data-borrar]')) q('[data-borrar]').onclick = () => confirmar('Delete objects', `Se borran ${marcados().length} elemento(s) y todo lo que haya dentro de las carpetas. Escribe <i>permanently delete</i>.`, 'permanently delete', () => { for (const k of marcados()) for (const x of Object.keys(b.objects)) if (x === k || (k.endsWith('/') && x.startsWith(k))) delete b.objects[x]; guardar(); dibujar(); flash('ok', 'Successfully deleted objects.'); });
    main.querySelectorAll('[data-obj]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); verObjeto(n, a.dataset.obj); }; });
    if (q('[data-ver]')) q('[data-ver]').onclick = () => { b.versioning = !b.versioning; guardar(); dibujar(); flash('ok', `Bucket Versioning ${b.versioning ? 'enabled' : 'suspended'}.`); };
    if (q('[data-bpa]')) q('[data-bpa]').onclick = () => { b.publico = !b.publico; guardar(); dibujar(); flash(b.publico ? 'mal' : 'ok', b.publico ? 'Block all public access: Off. El bucket podría quedar público.' : 'Block all public access: On.'); };
  }
  function subir(n, pre) {
    const b = S().buckets[n];
    modal(`<h2>Upload</h2><p class="aw-dim">Destino: <code>s3://${esc(n)}/${esc(pre)}</code></p>
      <div class="aw-drop"><label class="aw-btn" for="awFile">Add files</label><input type="file" id="awFile" multiple accept=".csv,.json,.txt,.tsv,.md" hidden><span class="aw-dim">CSV, JSON o texto (en la práctica, hasta 2 MB por archivo).</span></div>
      <p class="aw-lbl">o usa datos de ejemplo del curso</p><div class="aw-ej">${btn('pedidos (particionado por mes)', 'data-ej="pedidos"')}${btn('clientes', 'data-ej="clientes"')}${btn('productos', 'data-ej="productos"')}</div>
      <div id="awUpList" class="aw-dim"></div><div class="aw-modal-b">${btn('Cancel', 'data-cerrar', 'link')}${btn('Upload', 'id="awUpOk" disabled', 'primario')}</div>`, (m, cerrar) => {
      const lista = [];
      const pintar = () => { m.querySelector('#awUpList').innerHTML = lista.length ? `<ul class="aw-lista">${lista.map(([k, c]) => `<li><code>${esc(pre + k)}</code> · ${tam(c.length)}</li>`).join('')}</ul>` : ''; m.querySelector('#awUpOk').disabled = !lista.length; };
      m.querySelector('#awFile').onchange = async (e) => { for (const f of e.target.files) { if (f.size > 2 * 1048576) { toast(`${f.name}: más de 2 MB`); continue; } lista.push([f.name, await f.text()]); } pintar(); };
      m.querySelectorAll('[data-ej]').forEach((x) => { x.onclick = () => { for (const it of ejemplo(x.dataset.ej)) if (!lista.some((l) => l[0] === it[0])) lista.push(it); pintar(); }; });
      m.querySelector('#awUpOk').onclick = () => { for (const [k, c] of lista) b.objects[pre + k] = { c, m: ahora() }; guardar(); if (window.AwsMotor) for (const [k] of lista) window.AwsMotor.dispararS3(ruta[2], pre + k); /* disparadores de Lambda */ evento('s3-subir'); cerrar(); dibujar(); flash('ok', `Upload succeeded: ${lista.length} file(s), ${tam(lista.reduce((x, l) => x + l[1].length, 0))}.`); };
    });
  }
  function verObjeto(n, k) {
    const o = S().buckets[n].objects[k];
    modal(`<h2>${esc(k.split('/').pop())}</h2><dl class="aw-dl"><dt>S3 URI</dt><dd><code>s3://${esc(n)}/${esc(k)}</code></dd><dt>Size</dt><dd>${tam(o.c.length)}</dd><dt>Last modified</dt><dd>${esc(fecha(o.m))}</dd><dt>Storage class</dt><dd>Standard</dd><dt>Server-side encryption</dt><dd>SSE-S3</dd></dl>
      <p class="aw-lbl">Vista previa (primeras líneas)</p><pre class="aw-pre">${esc(o.c.split('\n').slice(0, 12).join('\n'))}</pre><div class="aw-modal-b">${btn('Close', 'data-cerrar', 'primario')}</div>`);
  }

  // ------------------------------------------------------------------ Glue
  const NAV_GLUE = (sel) => navLinks([['inicio', 'Getting started', href('glue')], ['#Data Catalog'], ['bases', 'Databases', href('glue', 'databases')], ['tablas', 'Tables', href('glue', 'tables')], ['crawlers', 'Crawlers', href('glue', 'crawlers')], ['#ETL jobs'], ['jobs', 'ETL jobs', href('glue', 'jobs')]], sel);
  function glue() {
    visitar('glue');
    const r = ruta[1] || '';
    if (r === 'databases') return glueBases();
    if (r === 'tables' && ruta[2] && ruta[3]) return glueTabla(ruta[2], ruta[3]);
    if (r === 'tables') return glueTablas();
    if (r === 'crawlers' && ruta[2] === 'crear') return glueCrawlerCrear();
    if (r === 'crawlers') return glueCrawlers();
    if (r === 'jobs') return window.AwsServicios && window.AwsServicios.glueJobs ? window.AwsServicios.glueJobs() : glueJobs();
    const cuerpo = `<h1 class="aw-h1">AWS Glue</h1>${cont('Prepare your data lake', `<ol class="aw-pasos"><li><b>Store</b> los archivos en S3 (una carpeta por tabla, particiones como <code>anio_mes=…</code>).</li><li><b>Catalog</b>: un <a href="${href('glue', 'crawlers')}">crawler</a> lee la carpeta y crea la tabla en una <a href="${href('glue', 'databases')}">database</a> del Data Catalog.</li><li><b>Query</b> la tabla con <a href="${href('athena')}">Athena</a>, o transfórmala con un <a href="${href('glue', 'jobs')}">ETL job</a>.</li></ol>`, btn('Add database', `onclick="location.hash='${href('glue', 'databases')}'"`) + btn('Create crawler', `onclick="location.hash='${href('glue', 'crawlers', 'crear')}'"`, 'primario'))}`;
    main.innerHTML = marco('AWS Glue', NAV_GLUE('inicio'), [['AWS Glue', '']], cuerpo); montarMarco();
  }
  function glueBases() {
    const s = S(), ds = Object.entries(s.glueDbs);
    const cuerpo = `<h1 class="aw-h1">Databases</h1>${cont(`Databases <span class="aw-cnt">(${ds.length})</span>`, ds.length ? `<div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th>Name</th><th>Tables</th><th>Location URI</th></tr></thead><tbody>${ds.map(([n, d]) => `<tr><td>${ic('base')} <a href="${href('glue', 'tables')}?db=${encodeURIComponent(n)}">${esc(n)}</a></td><td>${Object.keys(d.tables).length}</td><td>${esc(d.location || '-')}</td></tr>`).join('')}</tbody></table></div>` : vacio('No databases', 'A database is a set of associated table definitions, organized into a logical group.'),
      btn('Add database', 'data-nueva', 'primario'), 'Una database del Data Catalog agrupa tablas: es lo que Athena muestra como esquema (por ejemplo, <code>lago_bronze</code>).')}`;
    main.innerHTML = marco('AWS Glue', NAV_GLUE('bases'), [['AWS Glue', href('glue')], ['Databases', '']], cuerpo); montarMarco();
    main.querySelector('[data-nueva]').onclick = () => modal(`<h2>Create a database</h2><label class="aw-lbl" for="awDN">Name</label><input class="aw-in" id="awDN" placeholder="lago_bronze"><p class="aw-ayuda">Minúsculas, números y guion bajo. Athena prefiere nombres sin guiones.</p><label class="aw-lbl" for="awDL">Location - optional</label><input class="aw-in" id="awDL" placeholder="s3://mi-bucket/bronze/"><div class="aw-modal-b">${btn('Cancel', 'data-cerrar', 'link')}${btn('Create database', 'id="awDNok"', 'primario')}</div>`, (m, cerrar) => {
      m.querySelector('#awDNok').onclick = () => { const v = m.querySelector('#awDN').value.trim(); if (!/^[a-z0-9_]{1,255}$/.test(v)) { toast('Usa minúsculas, números y guion bajo'); return; } if (S().glueDbs[v]) { toast('Ya existe'); return; } S().glueDbs[v] = { tables: {}, location: m.querySelector('#awDL').value.trim() || undefined }; guardar(); evento('glue-db'); cerrar(); dibujar(); flash('ok', `Database "${esc(v)}" created.`); };
    });
  }
  function glueTablas() {
    const s = S(), db = query.get('db') || '';
    const filas = Object.entries(s.glueDbs).filter(([n]) => !db || n === db).flatMap(([dn, d]) => Object.entries(d.tables).map(([tn, t]) => `<tr><td>${ic('tabla')} <a href="${href('glue', 'tables', dn, tn)}">${esc(tn)}</a></td><td>${esc(dn)}</td><td>${esc(t.location || '-')}</td><td>${esc(t.format || 'csv')}</td><td>${(t.partitions || []).map(esc).join(', ') || '-'}</td></tr>`));
    const cuerpo = `<h1 class="aw-h1">Tables</h1>${cont(`Tables <span class="aw-cnt">(${filas.length})</span>${db ? ` <span class="aw-dim">en ${esc(db)}</span>` : ''}`, filas.length ? `<div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th>Name</th><th>Database</th><th>Location</th><th>Classification</th><th>Partition keys</th></tr></thead><tbody>${filas.join('')}</tbody></table></div>` : vacio('No tables', `Las tablas las crea un <a href="${href('glue', 'crawlers')}">crawler</a> al leer una carpeta de S3.`), btn('Add tables using crawler', `onclick="location.hash='${href('glue', 'crawlers', 'crear')}'"`, 'primario'))}`;
    main.innerHTML = marco('AWS Glue', NAV_GLUE('tablas'), [['AWS Glue', href('glue')], ['Tables', '']], cuerpo); montarMarco();
  }
  function glueTabla(dn, tn) {
    const t = (S().glueDbs[dn] || { tables: {} }).tables[tn];
    if (!t) { location.hash = href('glue', 'tables'); return; }
    const cols = (t.columns || []).map((c, i) => `<tr><td>${i + 1}</td><td>${esc(c.Name)}</td><td>${esc(c.Type)}</td><td>-</td></tr>`).join('') + (t.partitions || []).map((p, i) => `<tr><td>${(t.columns || []).length + i + 1}</td><td>${esc(p)}</td><td>string</td><td>Partition (${i})</td></tr>`).join('');
    const cuerpo = `<h1 class="aw-h1">${esc(tn)}</h1>${cont('Table details', `<dl class="aw-dl"><dt>Database</dt><dd>${esc(dn)}</dd><dt>Location</dt><dd><code>${esc(t.location || '-')}</code></dd><dt>Classification</dt><dd>${esc(t.format || 'csv')}</dd><dt>Input format</dt><dd>org.apache.hadoop.mapred.TextInputFormat</dd></dl>`, btn('Query with Athena', `data-athena`, 'primario'))}
      ${cont('Schema', `<p class="aw-dim">Un crawler sobre CSV detecta todas las columnas como <code>string</code>: en Athena conviene castear (<code>CAST(total AS double)</code>) o definir los tipos a mano.</p><div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th>#</th><th>Column name</th><th>Data type</th><th>Partition key</th></tr></thead><tbody>${cols}</tbody></table></div>`)}`;
    main.innerHTML = marco('AWS Glue', NAV_GLUE('tablas'), [['AWS Glue', href('glue')], ['Tables', href('glue', 'tables')], [tn, '']], cuerpo); montarMarco();
    main.querySelector('[data-athena]').onclick = () => { con().athenaSql = `SELECT *\nFROM "${dn}"."${tn}"\nLIMIT 10;`; con().athenaDb = dn; location.hash = href('athena'); };
  }
  function glueCrawlers() {
    const s = S(), cs = Object.entries(s.crawlers);
    const cuerpo = `<h1 class="aw-h1">Crawlers</h1>${cont(`Crawlers <span class="aw-cnt">(${cs.length})</span>`, cs.length ? `<div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th><span class="aw-sr">Select</span></th><th>Name</th><th>State</th><th>Data source</th><th>Database</th><th>Last run</th></tr></thead><tbody>${cs.map(([n, c]) => `<tr><td><input type="radio" name="awSelC" value="${esc(n)}" aria-label="Select ${esc(n)}"></td><td>${ic('araña')} ${esc(n)}</td><td><span class="aw-estado">${esc(c.state || 'READY')}</span></td><td><code>${esc(c.path)}</code></td><td>${esc(c.db)}</td><td>${c.last ? `${ic('ok')} Succeeded · ${esc(fecha(c.last))}` : '-'}</td></tr>`).join('')}</tbody></table></div>` : vacio('No crawlers', 'A crawler connects to a data store, extracts the schema of your data, and then populates the Glue Data Catalog.'),
      btn('Run', 'data-run disabled') + btn('Create crawler', `onclick="location.hash='${href('glue', 'crawlers', 'crear')}'"`, 'primario'))}`;
    main.innerHTML = marco('AWS Glue', NAV_GLUE('crawlers'), [['AWS Glue', href('glue')], ['Crawlers', '']], cuerpo); montarMarco();
    main.querySelectorAll('[name=awSelC]').forEach((r) => { r.onchange = () => { main.querySelector('[data-run]').disabled = false; }; });
    main.querySelector('[data-run]').onclick = async () => {
      const n = (main.querySelector('[name=awSelC]:checked') || {}).value; if (!n) return;
      flash('info', `Crawler "${esc(n)}" is running…`);
      const r = await window.Shell.Commands.aws(['glue', 'start-crawler', '--name', n], { opts: { autoLogin: true } });
      if (r.code) { flash('mal', esc(limpiar(r.out))); return; }
      evento('glue-crawler-run'); dibujar();
      const c = S().crawlers[n], d = S().glueDbs[c.db] || { tables: {} };
      flash('ok', `Crawler "${esc(n)}" completed: la database <b>${esc(c.db)}</b> tiene ${Object.keys(d.tables).length} tabla(s). <a href="${href('glue', 'tables')}?db=${encodeURIComponent(c.db)}">View tables</a>`);
    };
  }
  function glueCrawlerCrear() {
    const s = S();
    const rutas = Object.entries(s.buckets).flatMap(([n, b]) => { const tops = new Set(Object.keys(b.objects).map((k) => k.split('/')[0] + (k.includes('/') ? '/' : ''))); return [...tops].filter((x) => x.endsWith('/')).map((x) => `s3://${n}/${x}`); });
    const cuerpo = `<h1 class="aw-h1">Create crawler</h1>
      ${cont('Step 1 · Crawler properties', `<label class="aw-lbl" for="awCrN">Name</label><input class="aw-in" id="awCrN" placeholder="crawler-pedidos">`)}
      ${cont('Step 2 · Data source', `<label class="aw-lbl" for="awCrP">S3 path</label><input class="aw-in" id="awCrP" list="awCrPl" placeholder="s3://mi-bucket/pedidos/"><datalist id="awCrPl">${rutas.map((x) => `<option value="${esc(x)}">`).join('')}</datalist><p class="aw-ayuda">Apunta a la carpeta de <b>una</b> tabla. Si adentro hay carpetas <code>columna=valor</code>, el crawler las toma como particiones.</p>`)}
      ${cont('Step 3 · Security settings', `<label class="aw-lbl" for="awCrR">IAM role</label><select class="aw-in" id="awCrR">${Object.keys(s.roles).map((r) => `<option>${esc(r)}</option>`).join('')}</select><p class="aw-ayuda">El crawler necesita un rol con <code>AWSGlueServiceRole</code> y permiso de lectura sobre el bucket. Puedes crear uno en <a href="${href('iam', 'roles', 'crear')}">IAM</a>.</p>`)}
      ${cont('Step 4 · Output', `<label class="aw-lbl" for="awCrD">Target database</label><select class="aw-in" id="awCrD">${Object.keys(s.glueDbs).map((d) => `<option>${esc(d)}</option>`).join('') || '<option value="">(crea una database primero)</option>'}</select><label class="aw-lbl" for="awCrS">Crawler schedule</label><select class="aw-in" id="awCrS"><option>On demand</option><option>Daily</option><option>Hourly</option></select>`)}
      <div class="aw-pie">${btn('Cancel', `onclick="location.hash='${href('glue', 'crawlers')}'"`, 'link')}${btn('Create crawler', 'id="awCrOk"', 'primario')}</div>`;
    main.innerHTML = marco('AWS Glue', NAV_GLUE('crawlers'), [['AWS Glue', href('glue')], ['Crawlers', href('glue', 'crawlers')], ['Create crawler', '']], cuerpo); montarMarco();
    main.querySelector('#awCrOk').onclick = async () => {
      const n = main.querySelector('#awCrN').value.trim(), p = main.querySelector('#awCrP').value.trim(), r = main.querySelector('#awCrR').value, d = main.querySelector('#awCrD').value;
      if (!/^[\w-]{1,255}$/.test(n)) return flash('mal', 'Escribe un nombre (letras, números, guiones).');
      if (!CS().s3path(p) || !S().buckets[CS().s3path(p).b]) return flash('mal', 'El S3 path tiene que ser <code>s3://bucket/carpeta/</code> de un bucket que exista.');
      if (!d) return flash('mal', 'Elige una database de destino (créala en Databases).');
      const res = await window.Shell.Commands.aws(['glue', 'create-crawler', '--name', n, '--role', r, '--database-name', d, '--targets', JSON.stringify({ S3Targets: [{ Path: p }] })], { opts: { autoLogin: true } });
      if (res.code) return flash('mal', esc(limpiar(res.out)));
      evento('glue-crawler'); location.hash = href('glue', 'crawlers'); setTimeout(() => flash('ok', `Crawler "${esc(n)}" created. Selecciónalo y presiona <b>Run</b>.`), 60);
    };
  }
  function glueJobs() {
    const s = S(), js = Object.entries(s.glueJobs);
    const cuerpo = `<h1 class="aw-h1">ETL jobs</h1>${cont(`Your jobs <span class="aw-cnt">(${js.length})</span>`, `<div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th><span class="aw-sr">Select</span></th><th>Job name</th><th>Type</th><th>Glue version</th><th>Last run</th></tr></thead><tbody>${js.map(([n, j]) => `<tr><td><input type="radio" name="awSelJ" value="${esc(n)}" aria-label="Select ${esc(n)}"></td><td>${ic('job')} ${esc(n)}</td><td>Spark</td><td>Glue 4.0</td><td>${j.runs.length ? `${ic('ok')} Succeeded · ${esc(fecha(j.runs[j.runs.length - 1].at))}` : '-'}</td></tr>`).join('')}</tbody></table></div><p class="aw-dim">Un job de Glue corre un script de PySpark en un clúster que AWS prende y apaga solo; se paga por DPU-hora. El código se practica en el laboratorio de PySpark.</p>`,
      btn('Run job', 'data-run disabled', 'primario'))}`;
    main.innerHTML = marco('AWS Glue', NAV_GLUE('jobs'), [['AWS Glue', href('glue')], ['ETL jobs', '']], cuerpo); montarMarco();
    main.querySelectorAll('[name=awSelJ]').forEach((r) => { r.onchange = () => { main.querySelector('[data-run]').disabled = false; }; });
    main.querySelector('[data-run]').onclick = async () => { const n = (main.querySelector('[name=awSelJ]:checked') || {}).value; const r = await window.Shell.Commands.aws(['glue', 'start-job-run', '--job-name', n], { opts: { autoLogin: true } }); if (r.code) return flash('mal', esc(limpiar(r.out))); evento('glue-job'); dibujar(); flash('ok', `Successfully started job "${esc(n)}". En una cuenta real, el progreso y los logs se ven en <b>Runs</b> y en CloudWatch.`); };
  }

  // ------------------------------------------------------------------ Athena
  function athena() {
    visitar('athena');
    const s = S(), c = con();
    const dbs = Object.keys(s.glueDbs);
    const db = c.athenaDb && s.glueDbs[c.athenaDb] ? c.athenaDb : dbs[0] || '';
    const tablas = db ? Object.entries(s.glueDbs[db].tables) : [];
    const salida = s.athenaOut || '';
    const tab = ruta[1] === 'recent' ? 'recent' : ruta[1] === 'settings' ? 'settings' : 'editor';
    let cuerpo;
    if (tab === 'settings') {
      cuerpo = cont('Query result location and encryption', `<p class="aw-dim">Athena guarda el resultado de cada consulta como un CSV en S3. Sin una ubicación, no puede ejecutar nada.</p><label class="aw-lbl" for="awAO">Location of query result</label><input class="aw-in" id="awAO" value="${esc(salida)}" placeholder="s3://mi-bucket/athena-resultados/" list="awAOl"><datalist id="awAOl">${Object.keys(s.buckets).map((b) => `<option value="s3://${esc(b)}/athena-resultados/">`).join('')}</datalist>`, btn('Save', 'data-guardar', 'primario'));
    } else if (tab === 'recent') {
      const h = (s.athenaHist || []).slice().reverse();
      cuerpo = cont(`Recent queries <span class="aw-cnt">(${h.length})</span>`, h.length ? `<div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th>Execution ID</th><th>Query</th><th>Started</th><th>Status</th><th>Run time</th><th>Data scanned</th></tr></thead><tbody>${h.map((x) => `<tr><td><code>${esc(x.id.slice(0, 8))}…</code></td><td><code>${esc(x.q.replace(/\s+/g, ' ').slice(0, 70))}</code></td><td>${esc(fecha(x.at))}</td><td>${x.estado === 'SUCCEEDED' ? ic('ok') + ' Completed' : ic('mal') + ' Failed'}</td><td>${x.ms} ms</td><td>${tam(x.bytes || 0)}</td></tr>`).join('')}</tbody></table></div>` : vacio('No queries', 'Las consultas que ejecutes aparecen acá, con cuántos datos escanearon.'));
    } else {
      cuerpo = `<div class="aw-athena">
        <aside class="aw-ath-l"><label class="aw-lbl">Data source</label><div class="aw-ro">AwsDataCatalog</div><label class="aw-lbl" for="awADb">Database</label><select class="aw-in" id="awADb">${dbs.map((d) => `<option ${d === db ? 'selected' : ''}>${esc(d)}</option>`).join('') || '<option value="">(no databases)</option>'}</select>
          <div class="aw-lbl">Tables <span class="aw-cnt">(${tablas.length})</span></div><div class="aw-ath-tablas">${tablas.map(([tn, t]) => `<details><summary>${ic('tabla', 14)} ${esc(tn)}</summary><ul>${(t.columns || []).map((col) => `<li><button type="button" data-col="${esc(col.Name)}">${esc(col.Name)}</button> <small>${esc(col.Type)}</small></li>`).join('')}${(t.partitions || []).map((p) => `<li><button type="button" data-col="${esc(p)}">${esc(p)}</button> <small>partition</small></li>`).join('')}</ul><button type="button" class="aw-link" data-prev="${esc(tn)}">Preview table</button></details>`).join('') || `<p class="aw-dim">Sin tablas. Créalas con un <a href="${href('glue', 'crawlers')}">crawler de Glue</a>.</p>`}</div></aside>
        <section class="aw-ath-r">${salida ? '' : `<div class="aw-alerta aw-alerta-info">${ic('info')} <div><b>Before you run your first query, you need to set up a query result location in Amazon S3.</b> <a href="${href('athena', 'settings')}">Edit settings</a></div></div>`}
          <div class="aw-ath-ed"><div class="aw-ath-tab">Query 1</div><textarea id="awASql" class="aw-sql" spellcheck="false" aria-label="Query editor">${esc(c.athenaSql || (db && tablas[0] ? `SELECT *\nFROM "${db}"."${tablas[0][0]}"\nLIMIT 10;` : 'SELECT 1;'))}</textarea>
          <div class="aw-ath-bar">${btn(ic('play', 12) + ' Run', 'id="awARun"', 'primario')}${btn('Clear', 'id="awAClr"')}<span class="aw-dim">SQL · Ln 1, Col 1 · Ctrl+Enter ejecuta</span></div></div>
          <div id="awARes"></div></section></div>`;
    }
    const tabs = `<div class="aw-tabs" role="tablist">${[['editor', 'Editor', href('athena')], ['recent', 'Recent queries', href('athena', 'recent')], ['settings', 'Settings', href('athena', 'settings')]].map(([id, t, h]) => `<a role="tab" aria-selected="${tab === id}" class="${tab === id ? 'on' : ''}" href="${h}">${t}</a>`).join('')}</div>`;
    main.innerHTML = marco('Amazon Athena', navLinks([['editor', 'Query editor', href('athena')], ['#Administration'], ['wg', 'Workgroups', href('athena', 'settings')]], tab === 'editor' ? 'editor' : 'wg'), [['Amazon Athena', href('athena')], ['Query editor', '']], `<h1 class="aw-h1">Query editor</h1>${tabs}${cuerpo}`); montarMarco();
    const q = (x) => main.querySelector(x);
    if (q('[data-guardar]')) q('[data-guardar]').onclick = () => { const v = q('#awAO').value.trim(); const p = CS().s3path(v); if (!p || !S().buckets[p.b]) return flash('mal', 'La ubicación tiene que ser <code>s3://bucket/carpeta/</code> de un bucket que exista.'); S().athenaOut = v.replace(/\/?$/, '/'); guardar(); evento('athena-salida'); flash('ok', 'Settings saved.'); };
    if (!q('#awASql')) return;
    q('#awADb').onchange = (e) => { c.athenaDb = e.target.value; dibujar(); };
    const ed = q('#awASql');
    ed.oninput = () => { c.athenaSql = ed.value; };
    ed.onkeydown = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); correr(); } };
    main.querySelectorAll('[data-col]').forEach((b) => { b.onclick = () => { const i = ed.selectionStart; ed.value = ed.value.slice(0, i) + b.dataset.col + ed.value.slice(ed.selectionEnd); c.athenaSql = ed.value; ed.focus(); }; });
    main.querySelectorAll('[data-prev]').forEach((b) => { b.onclick = () => { ed.value = `SELECT * FROM "${db}"."${b.dataset.prev}" LIMIT 10;`; c.athenaSql = ed.value; correr(); }; });
    q('#awAClr').onclick = () => { ed.value = ''; c.athenaSql = ''; ed.focus(); };
    q('#awARun').onclick = () => correr();
    async function correr() {
      const res = q('#awARes'), sql = ed.value.trim();
      if (!sql) return;
      res.innerHTML = `<div class="aw-cont"><div class="aw-cont-b"><span class="aw-spin"></span> Running… <span class="aw-dim">Queued → Running</span></div></div>`;
      const t0 = performance.now();
      const args = ['athena', 'start-query-execution', '--query-string', sql, '--query-execution-context', `Database=${db}`];
      if (S().athenaOut) args.push('--result-configuration', `OutputLocation=${S().athenaOut}`);
      const r1 = await window.Shell.Commands.aws([...args, '--output', 'json'], { opts: { autoLogin: true } });
      const ms = Math.max(180, Math.round(performance.now() - t0));
      if (r1.code) { res.innerHTML = cont(`${ic('mal')} Failed`, `<pre class="aw-pre aw-pre-err">${esc(limpiar(r1.out))}</pre>`); return; }
      const id = JSON.parse(limpiar(r1.out)).QueryExecutionId, x = S().athena[id];
      // datos escaneados: lo que pesan los archivos de las tablas que nombra la consulta (las particiones filtradas no se leen)
      const bytes = escaneado(sql, db);
      (S().athenaHist = S().athenaHist || []).push({ id, q: sql, at: ahora(), estado: x.state, ms, bytes }); if (S().athenaHist.length > 50) S().athenaHist.shift();
      guardar();
      if (x.state !== 'SUCCEEDED') { evento('athena-error'); res.innerHTML = cont(`${ic('mal')} Failed`, `<pre class="aw-pre aw-pre-err">${esc(x.reason)}</pre><p class="aw-dim">Revisa el nombre de la tabla (<code>"database"."tabla"</code>) y las columnas: un crawler sobre CSV deja todo como texto.</p>`); return; }
      evento('athena-ok'); if (/where/i.test(sql) && bytes > 0 && bytes < totalTablas(sql, db)) evento('athena-particion');
      const cols = x.res.columns, filas = x.res.values.slice(0, 100);
      res.innerHTML = cont(`${ic('ok')} Completed`, `<div class="aw-ath-meta"><span>Time in queue: 41 ms</span><span>Run time: ${ms} ms</span><span>Data scanned: ${tam(bytes)}</span><span>Cost (5 USD/TB): ${(bytes / 1e12 * 5).toFixed(8)} USD</span></div>
        <div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th>#</th>${cols.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${filas.map((f, i) => `<tr><td>${i + 1}</td>${f.map((v) => `<td>${v == null ? '<i class="aw-dim">null</i>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="aw-dim">${x.res.values.length} filas. El resultado quedó en <code>${esc(S().athenaOut || '')}${esc(id)}.csv</code>.</p>`, btn('Copy', 'data-copiar-res') + btn('Download results', 'data-bajar'));
      const csv = [cols.join(','), ...x.res.values.map((f) => f.map((v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(','))].join('\n');
      res.querySelector('[data-copiar-res]').onclick = () => { try { navigator.clipboard.writeText(csv); flash('ok', 'Copied.'); } catch (e) { /* nada */ } };
      res.querySelector('[data-bajar]').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = id + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); };
    }
  }
  function archivosTabla(dn, tn) {
    const t = (S().glueDbs[dn] || { tables: {} }).tables[tn]; const L = t && CS().s3path(t.location || ''); const b = L && S().buckets[L.b];
    return b ? Object.keys(b.objects).filter((k) => k.startsWith(L.k)).map((k) => ({ k: k.slice(L.k.length), n: b.objects[k].c.length })) : [];
  }
  function tablasDe(sql, db) { const out = []; for (const m of sql.matchAll(/(?:from|join)\s+(?:"?(\w+)"?\.)?"?(\w+)"?/gi)) out.push([m[1] || db, m[2]]); return out; }
  function totalTablas(sql, db) { return tablasDe(sql, db).reduce((x, [d, t]) => x + archivosTabla(d, t).reduce((y, f) => y + f.n, 0), 0); }
  function escaneado(sql, db) {
    let tot = 0;
    for (const [d, t] of tablasDe(sql, db)) {
      let fs = archivosTabla(d, t);
      // poda de particiones: WHERE columna = 'valor' sobre una clave de partición lee solo esa carpeta
      for (const m of sql.matchAll(/(\w+)\s*=\s*'([^']*)'/g)) { const con = fs.filter((f) => f.k.includes(`${m[1]}=`)); if (con.length) fs = con.filter((f) => f.k.includes(`${m[1]}=${m[2]}/`)); }
      tot += fs.reduce((x, f) => x + f.n, 0);
    }
    return tot;
  }

  // ------------------------------------------------------------------ IAM
  const NAV_IAM = (sel) => navLinks([['dash', 'Dashboard', href('iam')], ['#Access management'], ['usuarios', 'Users', href('iam', 'users')], ['roles', 'Roles', href('iam', 'roles')], ['politicas', 'Policies', href('iam', 'policies')]], sel);
  function iam() {
    visitar('iam');
    const r = ruta[1] || '';
    if (r === 'roles' && ruta[2] === 'crear') return iamRolCrear();
    if (r === 'roles' && ruta[2]) return iamRol(ruta[2]);
    if (r === 'roles') return iamRoles();
    if (r === 'policies') return iamPoliticas();
    if (r === 'users') {
      main.innerHTML = marco('IAM', NAV_IAM('usuarios'), [['IAM', href('iam')], ['Users', '']], `<h1 class="aw-h1">Users</h1>${cont('Users (1)', `<div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th>User name</th><th>Groups</th><th>MFA</th><th>Console last sign-in</th></tr></thead><tbody><tr><td>${ic('usuario')} alumno</td><td>data-engineers</td><td>${ic('ok')} Virtual</td><td>Today</td></tr></tbody></table></div><p class="aw-dim">Las personas entran con su usuario (mejor aún, con IAM Identity Center y SSO). Los servicios, como Glue o Lambda, usan <b>roles</b>: nunca claves de un usuario.</p>`)}`);
      return montarMarco();
    }
    const s = S();
    const cuerpo = `<h1 class="aw-h1">IAM Dashboard</h1>${cont('Security recommendations', `<ul class="aw-lista"><li>${ic('ok')} <b>Root user has MFA</b><span class="aw-dim">El usuario raíz se protege con MFA y no se usa en el día a día.</span></li><li>${ic('ok')} <b>Root user has no active access keys</b></li><li>${ic('info')} <b>Use roles for AWS services</b><span class="aw-dim">Un crawler o un job de Glue asume un rol con lo mínimo que necesita.</span></li></ul>`)}
      ${cont('IAM resources', `<div class="aw-stats"><div><b>1</b><span>Users</span></div><div><b>${Object.keys(s.roles).length}</b><span>Roles</span></div><div><b>${Object.keys(POLITICAS).length}</b><span>Policies</span></div></div>`)}`;
    main.innerHTML = marco('IAM', NAV_IAM('dash'), [['IAM', '']], cuerpo); montarMarco();
  }
  function iamRoles() {
    const s = S(), rs = Object.entries(s.roles);
    const cuerpo = `<h1 class="aw-h1">Roles</h1>${cont(`Roles <span class="aw-cnt">(${rs.length})</span>`, `<div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th>Role name</th><th>Trusted entities</th><th>Permissions</th></tr></thead><tbody>${rs.map(([n, r]) => `<tr><td>${ic('rol')} <a href="${href('iam', 'roles', n)}">${esc(n)}</a></td><td>AWS Service: ${esc((r.servicio || 'glue'))}</td><td>${esc((r.politicas || ['AWSGlueServiceRole']).join(', '))}</td></tr>`).join('')}</tbody></table></div>`,
      btn('Create role', `onclick="location.hash='${href('iam', 'roles', 'crear')}'"`, 'primario'), 'An IAM role is an identity you can create that has specific permissions with credentials that are valid for short durations.')}`;
    main.innerHTML = marco('IAM', NAV_IAM('roles'), [['IAM', href('iam')], ['Roles', '']], cuerpo); montarMarco();
  }
  function iamRol(n) {
    const r = S().roles[n]; if (!r) { location.hash = href('iam', 'roles'); return; }
    const pols = r.politicas || ['AWSGlueServiceRole'];
    const confianza = { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: { Service: TRUST[r.servicio || 'glue'] }, Action: 'sts:AssumeRole' }] };
    const cuerpo = `<h1 class="aw-h1">${esc(n)}</h1>${cont('Summary', `<dl class="aw-dl"><dt>ARN</dt><dd><code>arn:aws:iam::${esc(S().account)}:role/${esc(n)}</code></dd><dt>Maximum session duration</dt><dd>1 hour</dd></dl>`)}
      ${cont('Permissions policies', `<ul class="aw-lista">${pols.map((p) => `<li>${ic('politica')} <b>${esc(p)}</b><span class="aw-dim">${esc((POLITICAS[p] || ['', ''])[1])}</span></li>`).join('')}</ul>`)}
      ${cont('Trust relationships', `<p class="aw-dim">Quién puede asumir este rol:</p><pre class="aw-pre">${esc(JSON.stringify(confianza, null, 2))}</pre>`)}`;
    main.innerHTML = marco('IAM', NAV_IAM('roles'), [['IAM', href('iam')], ['Roles', href('iam', 'roles')], [n, '']], cuerpo); montarMarco();
  }
  function iamRolCrear() {
    const cuerpo = `<h1 class="aw-h1">Create role</h1>
      ${cont('Step 1 · Select trusted entity', `<label class="aw-radio"><input type="radio" name="awTE" checked><div><b>AWS service</b><div class="aw-dim">Allow AWS services like EC2, Lambda, or Glue to perform actions in this account.</div></div></label><label class="aw-lbl" for="awTS">Service or use case</label><select class="aw-in" id="awTS"><option value="glue">Glue</option><option value="lambda">Lambda</option><option value="ec2">EC2</option></select>`)}
      ${cont('Step 2 · Add permissions', `<p class="aw-dim">Elige lo mínimo que el servicio necesita. <b>AdministratorAccess</b> para un crawler es un error frecuente (y peligroso).</p>${Object.entries(POLITICAS).map(([k, v]) => `<label class="aw-check"><input type="checkbox" data-pol="${esc(k)}" ${k === 'AWSGlueServiceRole' ? 'checked' : ''}><div><b>${esc(k)}</b> <span class="aw-dim">${esc(v[0])}</span><div class="aw-dim">${esc(v[1])}</div></div></label>`).join('')}`)}
      ${cont('Step 3 · Name, review, and create', `<label class="aw-lbl" for="awRN">Role name</label><input class="aw-in" id="awRN" placeholder="GlueCrawlerRole-pedidos"><p class="aw-ayuda">Hasta 64 caracteres: letras, números y <code>+=,.@-_</code>.</p>`)}
      <div class="aw-pie">${btn('Cancel', `onclick="location.hash='${href('iam', 'roles')}'"`, 'link')}${btn('Create role', 'id="awROk"', 'primario')}</div>`;
    main.innerHTML = marco('IAM', NAV_IAM('roles'), [['IAM', href('iam')], ['Roles', href('iam', 'roles')], ['Create role', '']], cuerpo); montarMarco();
    main.querySelector('#awROk').onclick = () => {
      const n = main.querySelector('#awRN').value.trim(), pols = [...main.querySelectorAll('[data-pol]:checked')].map((x) => x.dataset.pol);
      if (!/^[\w+=,.@-]{1,64}$/.test(n)) return flash('mal', 'Escribe un nombre de rol válido.');
      if (S().roles[n]) return flash('mal', `Role with name ${esc(n)} already exists.`);
      if (!pols.length) return flash('mal', 'Elige al menos una política.');
      S().roles[n] = { servicio: main.querySelector('#awTS').value, politicas: pols, creado: ahora() }; guardar();
      evento(pols.includes('AdministratorAccess') ? 'iam-rol-admin' : 'iam-rol');
      location.hash = href('iam', 'roles'); setTimeout(() => flash(pols.includes('AdministratorAccess') ? 'mal' : 'ok', pols.includes('AdministratorAccess') ? `Role ${esc(n)} created, pero con <b>AdministratorAccess</b>: cualquier error o credencial filtrada puede hacer cualquier cosa en la cuenta. Usa el mínimo privilegio.` : `Role ${esc(n)} created.`), 60);
    };
  }
  function iamPoliticas() {
    const cuerpo = `<h1 class="aw-h1">Policies</h1>${cont(`Policies <span class="aw-cnt">(${Object.keys(POLITICAS).length})</span>`, `<div class="aw-tabla-w"><table class="aw-tabla"><thead><tr><th>Policy name</th><th>Type</th><th>Description</th></tr></thead><tbody>${Object.entries(POLITICAS).map(([k, v]) => `<tr><td>${ic('politica')} <a href="#" data-pol="${esc(k)}">${esc(k)}</a></td><td>${esc(v[0])}</td><td>${esc(v[1])}</td></tr>`).join('')}</tbody></table></div>`, '', 'Una política es un documento JSON que dice qué acciones se permiten sobre qué recursos.')}`;
    main.innerHTML = marco('IAM', NAV_IAM('politicas'), [['IAM', href('iam')], ['Policies', '']], cuerpo); montarMarco();
    main.querySelectorAll('[data-pol]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const v = POLITICAS[a.dataset.pol]; modal(`<h2>${esc(a.dataset.pol)}</h2><p class="aw-dim">${esc(v[1])}</p><pre class="aw-pre">${esc(JSON.stringify(v[2], null, 2))}</pre><div class="aw-modal-b">${btn('Close', 'data-cerrar', 'primario')}</div>`); }; });
  }

  // ------------------------------------------------------------------ router
  function dibujar() {
    const r = ruta[0] || '';
    if (!r) return inicio();
    if (r === 's3') return s3();
    if (r === 'glue') return glue();
    if (r === 'athena') return athena();
    if (r === 'iam') return iam();
    const X = window.AwsServicios; if (X && X.rutas && X.rutas[r]) { visitar(r); return X.rutas[r](); } // aws-servicios.js: Lambda, Step Functions, CloudWatch, Billing
    if (NO_SIM[r]) return noSimulado(r);
    return inicio();
  }
  function vista(m, ctx, sub) {
    main = m; Store = ctx.Store; toast = ctx.toast || toast;
    const partes = (sub || []).map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } });
    const ultimo = partes.length ? partes[partes.length - 1] : '';
    const qi = ultimo.indexOf('?');
    if (qi >= 0) { partes[partes.length - 1] = ultimo.slice(0, qi); query = new URLSearchParams(ultimo.slice(qi + 1)); } else query = new URLSearchParams((location.hash.split('?')[1]) || '');
    ruta = partes.filter(Boolean);
    if (window.Shell && window.Shell.Machine && !window.Shell.Machine.ready && window.Shell.Machine.load) window.Shell.Machine.load();
    document.body.classList.add('aw-abierto');
    dibujar();
  }
  window.addEventListener('hashchange', () => { if (!/^#\/aws/.test(location.hash)) document.body.classList.remove('aw-abierto'); });
  window.AwsConsola = { vista, estado: () => ({ aws: S(), consola: Store ? con() : null }),
    // piezas para aws-servicios.js
    _i: { esc, S, guardar, ahora, fecha, tam, limpiar, href, ic, marco, navLinks, cont, btn, vacio, modal, flash, montarMarco, confirmar, evento, dibujar, REGIONES, ruta: () => ruta, query: () => query, main: () => main, toast: (m) => toast(m) } };
})();
