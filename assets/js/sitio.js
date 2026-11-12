/* Piezas del sitio en producción: cuentas (Supabase), anuncios no invasivos (AdSense) y páginas legales.
 * Todo depende de assets/js/config.js: con la configuración vacía, nada de esto se activa ni descarga código externo.
 *
 * Cuentas: son opcionales. El curso funciona completo sin iniciar sesión; la cuenta solo copia el progreso a la
 * nube para tenerlo en otros dispositivos. Se sincroniza el progreso, el código de los ejercicios y las notas
 * (no el estado de las herramientas de práctica, que pesa mucho: eso se lleva con la copia de "Mis datos").
 */
(function () {
  'use strict';
  const CFG = window.SITIO || {};
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const hayCuentas = () => !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const hayAnuncios = () => !!CFG.adsenseCliente;
  const hayMedicion = () => !!(CFG.medicion && CFG.medicion.proveedor && CFG.medicion.sitio);
  const cargarScript = (src, attrs = {}) => new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.async = true; Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v)); s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar ' + src)); document.head.append(s); });

  // ================================================================ cuentas y sincronización
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  const K_NOTAS = 'academia-notas-v1';
  // lo que viaja a la nube: progreso y preferencias (mapas chicos), más el código y las notas
  const CLAVES = ['ex', 'lessons', 'visited', 'auto', 'diagnostico', 'exams', 'simulacros', 'planes', 'cards', 'ultimoRepaso', 'repasoModo', 'misiones', 'retosHerr', 'trabajo', 'nombre', 'code'];
  const MAPAS_DE_FECHAS = ['ex', 'lessons', 'visited']; // id → momento en que se completó: al unir se conserva el más antiguo
  const LIMITE = 900 * 1024;
  let sb = null, usuario = null, Store = null, toast = () => {}, estado = 'sin sesión', ultimaSync = null, temporizador = null, cargando = null;

  // Une lo local con lo remoto sin perder avances de ningún lado
  function fusionar(local, remoto, remotoMasNuevo) {
    const out = { ...local };
    for (const k of CLAVES) {
      const a = local[k], b = remoto[k];
      if (b === undefined) continue;
      if (a === undefined) { out[k] = b; continue; }
      if (MAPAS_DE_FECHAS.includes(k)) { out[k] = { ...b, ...a }; for (const id of Object.keys(b)) if (a[id] && b[id]) out[k][id] = Math.min(a[id], b[id]); }
      else if (a && b && typeof a === 'object' && !Array.isArray(a) && typeof b === 'object' && !Array.isArray(b)) out[k] = remotoMasNuevo ? { ...a, ...b } : { ...b, ...a };
      else out[k] = remotoMasNuevo ? b : a;
    }
    return out;
  }
  function paquete() {
    const datos = {}; for (const k of CLAVES) if (Store.data[k] !== undefined) datos[k] = Store.data[k];
    let notas = null; try { notas = localStorage.getItem(K_NOTAS); } catch (e) { /* sin almacenamiento */ }
    let p = { datos, notas };
    if (JSON.stringify(p).length > LIMITE) { p = { datos: { ...datos, code: undefined }, notas }; } // primero se resigna el código guardado
    if (JSON.stringify(p).length > LIMITE) p.notas = null;
    return p;
  }
  async function cliente() {
    if (sb) return sb;
    if (!cargando) cargando = (window.supabase ? Promise.resolve() : cargarScript(SUPABASE_JS)).then(() => {
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      sb.auth.onAuthStateChange((evento, sesion) => { const antes = usuario && usuario.id; usuario = sesion ? sesion.user : null; if (usuario && usuario.id !== antes) sincronizar(true); if (!usuario) estado = 'sin sesión'; pintarBoton(); if (location.hash.startsWith('#/cuenta')) window.dispatchEvent(new HashChangeEvent('hashchange')); });
      return sb;
    });
    return cargando;
  }
  async function sincronizar(alIngresar = false) {
    if (!usuario || !sb) return;
    estado = 'sincronizando'; pintarBoton();
    try {
      const { data: fila, error } = await sb.from('progreso').select('datos, notas, actualizado').eq('user_id', usuario.id).maybeSingle();
      if (error) throw error;
      const local = Store.data.syncLocal || 0; // última vez que este navegador cambió algo
      if (fila) {
        const remotoMasNuevo = new Date(fila.actualizado).getTime() > local;
        Store.data = Object.assign(Store.data, fusionar(Store.data, fila.datos || {}, remotoMasNuevo));
        if (fila.notas && (remotoMasNuevo || !localStorage.getItem(K_NOTAS))) { try { localStorage.setItem(K_NOTAS, fila.notas); } catch (e) { /* lleno */ } }
        guardarSinMarcar();
      }
      const p = paquete(); const ahora = new Date().toISOString();
      const { error: e2 } = await sb.from('progreso').upsert({ user_id: usuario.id, datos: p.datos, notas: p.notas, actualizado: ahora }, { onConflict: 'user_id' });
      if (e2) throw e2;
      ultimaSync = ahora; estado = 'al día';
      if (alIngresar && fila) { toast('Tu progreso se sincronizó con tu cuenta'); if (!location.hash.startsWith('#/cuenta')) window.dispatchEvent(new HashChangeEvent('hashchange')); }
    } catch (e) { estado = 'error'; console.warn('sincronización:', e); }
    pintarBoton();
    if (location.hash.startsWith('#/cuenta')) window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  let guardarOriginal = null;
  const guardarSinMarcar = () => (guardarOriginal ? guardarOriginal.call(Store) : Store.save());
  function programar() { if (!usuario) return; clearTimeout(temporizador); temporizador = setTimeout(() => sincronizar(), 20000); }

  function pintarBoton() {
    const caja = document.querySelector('.topbar-right'); if (!caja || !hayCuentas()) return;
    let b = document.getElementById('cuentaBtn');
    if (!b) { b = document.createElement('a'); b.id = 'cuentaBtn'; b.className = 'btn btn-sm cuenta-btn'; b.href = '#/cuenta'; caja.insertBefore(b, document.getElementById('themeBtn')); }
    b.title = usuario ? `Sesión iniciada como ${usuario.email || ''} · ${estado}` : 'Inicia sesión para guardar tu progreso en la nube';
    b.innerHTML = usuario ? `<span aria-hidden="true">${estado === 'error' ? '⚠️' : estado === 'sincronizando' ? '🔄' : '☁️'}</span><span class="cuenta-lbl">Mi cuenta</span>` : '<span aria-hidden="true">👤</span><span class="cuenta-lbl">Ingresar</span>';
  }

  function iniciar(ctx) {
    Store = ctx.Store; toast = ctx.toast || toast;
    if (!hayCuentas()) return;
    // cada guardado local deja registro de cuándo fue y programa una subida
    guardarOriginal = Store.save; Store.save = function () { this.data.syncLocal = Date.now(); guardarOriginal.call(this); programar(); };
    pintarBoton();
    // la librería solo se descarga si hay una sesión guardada o si se vuelve de un ingreso
    let haySesion = false; try { haySesion = Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)); } catch (e) { /* sin almacenamiento */ }
    if (haySesion || /[?&]code=/.test(location.search)) cliente().then(() => { if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash); }).catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && usuario) sincronizar(); });
  }

  function vistaCuenta(main) {
    const marco = (cuerpo) => { main.innerHTML = `<div class="page cuenta"><div class="crumbs"><a href="#/">Inicio</a><span>/</span><span>Mi cuenta</span></div><h1>☁️ Mi cuenta</h1>${cuerpo}</div>`; };
    if (!hayCuentas()) return marco('<div class="callout"><b>Las cuentas todavía no están activadas en este sitio.</b><p style="margin-bottom:0">Tu progreso se guarda en este navegador. Para llevarlo a otra computadora, usa la copia de seguridad de <a href="#/mis-datos">Mis datos</a>.</p></div>');
    if (!usuario) {
      marco(`<p class="lead">La cuenta es <b>opcional</b>: el curso funciona completo sin ella. Sirve para que tu progreso, tu código y tus notas queden guardados en la nube y aparezcan en cualquier dispositivo.</p>
        <div class="card cuenta-caja"><label for="cuentaCorreo"><b>Ingresa con tu correo</b></label><p class="small muted" style="margin:4px 0 10px">Te enviamos un enlace para entrar. No hay contraseña que recordar.</p>
          <div class="row"><input id="cuentaCorreo" type="email" placeholder="tu@correo.com" autocomplete="email"><button class="btn" id="cuentaEnviar">Enviarme el enlace</button></div>
          ${(CFG.proveedores || []).length ? `<p class="small muted" style="margin:14px 0 8px">o entra con</p><div class="row">${CFG.proveedores.map((p) => `<button class="btn btn-ghost" data-prov="${esc(p)}">${{ google: 'Google', github: 'GitHub' }[p] || esc(p)}</button>`).join('')}</div>` : ''}
          <p class="small muted" id="cuentaMsg" style="margin:12px 0 0" role="status"></p></div>
        <p class="small muted">Al ingresar aceptas los <a href="#/terminos">términos de uso</a> y la <a href="#/privacidad">política de privacidad</a>. Guardamos solo tu correo y tu progreso.</p>`);
      const msg = main.querySelector('#cuentaMsg'), volver = location.origin + location.pathname;
      main.querySelector('#cuentaEnviar').onclick = async () => {
        const correo = main.querySelector('#cuentaCorreo').value.trim(); if (!/^\S+@\S+\.\S+$/.test(correo)) { msg.textContent = 'Escribe un correo válido.'; return; }
        msg.textContent = 'Enviando…';
        try { const c = await cliente(); const { error } = await c.auth.signInWithOtp({ email: correo, options: { emailRedirectTo: volver } }); msg.textContent = error ? 'No se pudo enviar: ' + error.message : 'Listo. Revisa tu correo y abre el enlace en este mismo navegador.'; } catch (e) { msg.textContent = 'No se pudo conectar. Revisa tu conexión.'; }
      };
      main.querySelectorAll('[data-prov]').forEach((b) => (b.onclick = async () => { msg.textContent = 'Abriendo…'; try { const c = await cliente(); const { error } = await c.auth.signInWithOAuth({ provider: b.dataset.prov, options: { redirectTo: volver } }); if (error) msg.textContent = 'No se pudo ingresar: ' + error.message; } catch (e) { msg.textContent = 'No se pudo conectar. Revisa tu conexión.'; } }));
      return;
    }
    marco(`<div class="card cuenta-caja"><p style="margin-top:0">Sesión iniciada como <b>${esc(usuario.email || 'tu cuenta')}</b>.</p>
        <p>Estado: <b>${{ 'al día': '✅ sincronizado', sincronizando: '🔄 sincronizando…', error: '⚠️ no se pudo sincronizar (se reintenta solo)', 'sin sesión': '—' }[estado] || esc(estado)}</b>${ultimaSync ? ` <span class="muted small">· última vez ${new Date(ultimaSync).toLocaleString('es')}</span>` : ''}</p>
        <div class="row"><button class="btn" id="cuentaSync">Sincronizar ahora</button><button class="btn btn-ghost" id="cuentaSalir">Cerrar sesión</button><span class="spacer"></span><button class="btn btn-ghost" id="cuentaBorrar" style="color:var(--bad)">Borrar mis datos de la nube</button></div></div>
      <p class="small muted">Se sincronizan el progreso, el código de los ejercicios y las notas. Lo que armas dentro de las herramientas de práctica (Power BI, Databricks, la terminal) queda en este navegador: para llevarlo, usa la copia de <a href="#/mis-datos">Mis datos</a>.</p>`);
    main.querySelector('#cuentaSync').onclick = () => sincronizar();
    main.querySelector('#cuentaSalir').onclick = async () => { await sincronizar(); await sb.auth.signOut(); toast('Sesión cerrada. Tu progreso sigue en este navegador.'); };
    main.querySelector('#cuentaBorrar').onclick = async () => {
      if (!confirm('¿Borrar tu progreso guardado en la nube?\n\nLo que hay en este navegador no se toca. Después se cierra la sesión.')) return;
      const { error } = await sb.from('progreso').delete().eq('user_id', usuario.id); if (error) { toast('No se pudo borrar: ' + error.message); return; }
      await sb.auth.signOut(); toast('Datos de la nube borrados');
    };
  }

  // ================================================================ anuncios no invasivos
  // Reglas: como mucho un bloque por página, siempre al final del contenido, nunca dentro de ejercicios, exámenes,
  // simulacros ni herramientas, y solo después de que la persona aceptó. Si los rechaza, no se carga nada de Google.
  const K_CONSENT = 'academia-consentimiento';
  const consentimiento = () => { try { return localStorage.getItem(K_CONSENT); } catch (e) { return null; } };
  let adsCargado = null;
  function bloqueAnuncio(tipo) {
    const slot = (CFG.adsenseBloques || {})[tipo];
    if (!hayAnuncios() || !slot || consentimiento() !== 'si') return '';
    return `<aside class="anuncio" aria-label="Publicidad"><span class="anuncio-rotulo">Publicidad · ayuda a mantener el sitio gratis</span><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(CFG.adsenseCliente)}" data-ad-slot="${esc(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins></aside>`;
  }
  function activarAnuncios(raiz) {
    const pend = (raiz || document).querySelectorAll('ins.adsbygoogle:not([data-listo])'); if (!pend.length) return;
    if (!adsCargado) adsCargado = cargarScript(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CFG.adsenseCliente)}`, { crossorigin: 'anonymous' }).catch(() => { adsCargado = null; });
    pend.forEach((el) => { el.dataset.listo = '1'; try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* bloqueador de anuncios */ } });
  }
  function avisoConsentimiento() {
    if (!hayAnuncios() || consentimiento() || document.getElementById('avisoCookies')) return;
    const d = document.createElement('div'); d.id = 'avisoCookies'; d.className = 'aviso-cookies'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Aviso de cookies');
    d.innerHTML = `<p><b>Este sitio es gratis gracias a la publicidad.</b> Si aceptas, Google puede usar cookies para mostrar un anuncio al final de las lecciones. Nunca hay anuncios dentro de los ejercicios ni de las herramientas. <a href="#/privacidad">Más información</a></p><div class="row"><button class="btn" data-c="si">Aceptar</button><button class="btn btn-ghost" data-c="no">Seguir sin anuncios</button></div>`;
    d.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; try { localStorage.setItem(K_CONSENT, b.dataset.c); } catch (err) { /* sin almacenamiento */ } d.remove(); });
    document.body.append(d);
  }

  // ================================================================ páginas legales
  function vistaLegal(main, cual) {
    const sitio = esc(CFG.nombreSitio || 'Academia de Datos'), resp = esc(CFG.responsable || 'el equipo del sitio'), contacto = CFG.contacto ? `<a href="mailto:${esc(CFG.contacto)}">${esc(CFG.contacto)}</a>` : 'el correo de contacto publicado en el sitio';
    const privacidad = `<h1>Política de privacidad</h1>
      <p class="lead">En pocas palabras: ${sitio} guarda tu progreso en tu propio navegador. No vendemos datos.</p>
      <h2>Qué se guarda en tu navegador</h2><p>Tu avance, el código que escribes, tus notas y lo que armas en las herramientas de práctica se guardan en el almacenamiento local de tu navegador. No salen de tu dispositivo. Puedes verlo, descargarlo o borrarlo cuando quieras en <a href="#/mis-datos">Mis datos</a>.</p>
      <h2>Si creas una cuenta</h2><p>${hayCuentas() ? 'La cuenta es opcional. Si inicias sesión, guardamos tu correo electrónico y una copia de tu progreso, tu código de los ejercicios y tus notas, para mostrártelos en otros dispositivos. Estos datos se alojan en Supabase, nuestro proveedor de base de datos. Puedes borrarlos desde <a href="#/cuenta">Mi cuenta</a> en cualquier momento.' : 'Hoy el sitio no tiene cuentas: no pedimos correo ni ningún dato personal.'}</p>
      <h2>Publicidad y cookies</h2><p>${hayAnuncios() ? 'Para mantener el sitio gratis mostramos un anuncio al final de algunas páginas, provisto por Google AdSense. Solo se carga si lo aceptas en el aviso de cookies. Google y sus socios pueden usar cookies para mostrar anuncios según tus visitas a este y otros sitios; puedes administrar esa personalización en <a href="https://adssettings.google.com" target="_blank" rel="noopener">adssettings.google.com</a>. Si eliges "Seguir sin anuncios", no se carga ningún código de publicidad.' : 'Hoy el sitio no muestra publicidad ni usa cookies de terceros.'} <button class="btn btn-sm btn-ghost" id="legalConsent" ${hayAnuncios() ? '' : 'hidden'}>Cambiar mi elección sobre los anuncios</button></p>
      <h2>Estadísticas de uso</h2><p>${hayMedicion() ? 'Contamos qué páginas se visitan para saber qué lecciones sirven y cuáles hay que mejorar. La medición <b>no usa cookies</b>, no guarda tu dirección IP ni te identifica, y no se activa si tu navegador pide no ser rastreado.' : 'El sitio no usa herramientas de estadísticas ni de seguimiento.'}</p>
      <h2>Servicios externos</h2><p>Algunas funciones descargan bibliotecas de código abierto desde redes de distribución públicas (por ejemplo, el editor de código o Python en el navegador). Esos servidores reciben tu dirección IP, como cualquier sitio que visitas.</p>
      <h2>Menores</h2><p>El sitio es educativo y apto para todo público. No recopilamos a sabiendas datos de menores de 13 años; si creas una cuenta siendo menor, hazlo con permiso de un adulto responsable.</p>
      <h2>Contacto</h2><p>Responsable: ${resp}. Para consultas o para pedir que borremos tus datos, escribe a ${contacto}.</p>`;
    const terminos = `<h1>Términos de uso</h1>
      <p class="lead">${sitio} es un sitio educativo gratuito para aprender a trabajar con datos.</p>
      <h2>Uso del contenido</h2><p>Puedes usar las lecciones y los ejercicios para aprender y enseñar. No está permitido copiar el contenido completo para republicarlo como propio ni revenderlo.</p>
      <h2>Herramientas de práctica</h2><p>Power BI, Databricks, Azure, GitHub, VS Code y las demás herramientas del sitio son <b>simulaciones educativas independientes</b>: no son los productos reales ni están afiliadas, patrocinadas o avaladas por Microsoft, Databricks, GitHub, Amazon, Google ni ninguna otra empresa. Los nombres y marcas pertenecen a sus dueños y se usan solo para describir qué se practica.</p>
      <h2>Certificaciones</h2><p>Las preguntas de práctica son originales, escritas a partir de las guías públicas de cada examen. No son preguntas reales de ningún examen y aprobarlas no garantiza aprobar la certificación oficial.</p>
      <h2>Sin garantías</h2><p>El contenido se ofrece tal como está. Hacemos lo posible por mantenerlo correcto y al día, pero la tecnología cambia: verifica siempre con la documentación oficial antes de aplicar algo en un sistema real. Tu progreso se guarda en tu navegador; haz copias desde <a href="#/mis-datos">Mis datos</a> si te importa conservarlo.</p>
      <h2>Contacto</h2><p>Responsable: ${resp}. Escribe a ${contacto}.</p>`;
    main.innerHTML = `<div class="page legal prose"><div class="crumbs"><a href="#/">Inicio</a><span>/</span><span>${cual === 'terminos' ? 'Términos de uso' : 'Privacidad'}</span></div>${cual === 'terminos' ? terminos : privacidad}<p class="small muted">Última actualización: noviembre de 2026.</p></div>`;
    const b = main.querySelector('#legalConsent'); if (b) b.onclick = () => { try { localStorage.removeItem(K_CONSENT); } catch (e) { /* sin almacenamiento */ } avisoConsentimiento(); };
  }

  // ================================================================ reportar un error
  // Abre un issue de GitHub ya escrito (o un correo, si no hay repositorio configurado). No envía nada solo.
  function urlReporte({ titulo, cuerpo }) {
    const t = `Error en: ${titulo}`; const b = `${cuerpo}\n\n**Qué está mal:**\n\n\n**Qué esperabas ver:**\n\n`;
    if (CFG.repoReportes && /^[\w.-]+\/[\w.-]+$/.test(CFG.repoReportes)) return `https://github.com/${CFG.repoReportes}/issues/new?title=${encodeURIComponent(t)}&body=${encodeURIComponent(b)}`;
    if (CFG.contacto) return `mailto:${CFG.contacto}?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(b.replace(/\*\*/g, ''))}`;
    return null;
  }

  // ================================================================ medición de visitas sin cookies
  // Solo cuenta qué página se abrió (sin los parámetros de búsqueda). No usa cookies ni identifica a la persona,
  // y no se activa en localhost ni si el navegador pide no ser rastreado.
  function iniciarMedicion() {
    if (!hayMedicion() || ['localhost', '127.0.0.1'].includes(location.hostname) || navigator.doNotTrack === '1') return;
    const { proveedor, sitio } = CFG.medicion;
    const pagina = () => location.pathname + (location.hash.split('?')[0] || '#/');
    if (proveedor === 'goatcounter') {
      window.goatcounter = { no_onload: true };
      cargarScript('https://gc.zgo.at/count.js', { 'data-goatcounter': `https://${sitio}.goatcounter.com/count` }).then(() => {
        const contar = () => { try { window.goatcounter.count({ path: pagina() }); } catch (e) { /* bloqueado */ } };
        contar(); window.addEventListener('hashchange', contar);
      }).catch(() => {});
    } else if (proveedor === 'plausible') {
      cargarScript('https://plausible.io/js/script.hash.js', { 'data-domain': sitio, defer: '' }).catch(() => {});
    }
  }

  window.Sitio = { hayCuentas, hayAnuncios, hayMedicion, urlReporte, iniciarMedicion, iniciar, vistaCuenta, vistaLegal, bloqueAnuncio, activarAnuncios, avisoConsentimiento, _: { fusionar, paquete: () => paquete(), sincronizar, setCliente: (c, u) => { sb = c; usuario = u; } } };
})();
