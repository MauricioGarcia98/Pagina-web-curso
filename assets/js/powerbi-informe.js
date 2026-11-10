/* Power BI de práctica: herramientas de diseño de informes que faltaban (según learn.microsoft.com/power-bi).
 *  - Insertar: formas, botones (Atrás, Marcador, Navegación de páginas, Obtener detalles, URL) y navegadores.
 *  - Marcadores, panel Selección (capas y visibilidad), Sincronizar segmentaciones.
 *  - Formato (pestaña contextual): Editar interacciones, traer adelante / enviar atrás, alinear y distribuir.
 *  - Explorar en profundidad con jerarquías (subir, modo explorar, siguiente nivel, expandir un nivel).
 *  - Clic derecho en un dato: explorar, obtener detalles (drillthrough), incluir, excluir, copiar.
 *  - Páginas: tamaño del lienzo, fondo, ocultar, tipo (obtener detalles o información sobre herramientas).
 *  - Panel Análisis: líneas constante, promedio, mínimo, máximo, mediana, percentil y tendencia.
 *  - Copiar, pegar, mover con flechas y selección múltiple con Ctrl + clic.
 * Se engancha en powerbi.js a través de window.PowerBI._i. */
(function () {
  'use strict';
  const I = () => window.PowerBI._i;
  const S = () => I().S();
  const fl = (n) => I().fl(n);
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const toast = (m, t) => I().toast(m, t);
  const nuevoId = () => 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const copia = (x) => JSON.parse(JSON.stringify(x));
  const pagActual = () => S().paginas[S().pagina];
  const fmt = (v, sec, k) => I().V().fmtGet(v, sec, k);
  const DIBUJA = new Set(['forma', 'boton', 'navPaginas']);
  let portapapeles = null;

  // ---------------------------------------------------------------- menús flotantes
  function menu(x, y, items, alElegir) {
    const prev = document.querySelector('.pq-menu'); if (prev) prev.remove();
    const m = document.createElement('div'); m.className = 'pq-menu pb-menu-x';
    m.innerHTML = items.map((it) => (it === '-' ? '<hr>' : it.sub ? `<div class="pq-menu-sub">${esc(it.sub)}</div>` : `<div data-x="${esc(it.k)}" class="${it.off ? 'off' : ''}">${it.ico ? fl(it.ico) : '<span class="pb-mx-ic"></span>'} ${esc(it.t)}${it.check ? ' <b class="pb-mx-ok">✓</b>' : ''}</div>`)).join('');
    document.body.appendChild(m);
    m.style.left = Math.max(4, Math.min(x, innerWidth - m.offsetWidth - 6)) + 'px';
    m.style.top = Math.max(4, Math.min(y, innerHeight - m.offsetHeight - 6)) + 'px';
    setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', f); } }), 0);
    m.addEventListener('click', (e) => { const o = e.target.closest('[data-x]'); if (!o || o.classList.contains('off')) return; m.remove(); alElegir(o.dataset.x); });
    return m;
  }
  const menuBajo = (el, items, fn) => { const r = el.getBoundingClientRect(); return menu(r.left, r.bottom + 2, items, fn); };

  // ---------------------------------------------------------------- páginas
  const TAMANOS = { '16:9': [1280, 720], '4:3': [960, 720], Carta: [816, 1056], 'Información sobre herramientas': [320, 240], Personalizado: null };
  function estiloPagina(lienzo) {
    const p = I().pag(); const t = p.tamano || (p.tipo === 'tooltip' ? 'Información sobre herramientas' : '16:9');
    const [w, h] = t === 'Personalizado' ? [Number(p.ancho) || 1280, Number(p.alto) || 720] : TAMANOS[t] || TAMANOS['16:9'];
    if (t !== '16:9') { lienzo.style.aspectRatio = `${w} / ${h}`; lienzo.style.width = `min(100%, calc((100vh - 250px) * ${w} / ${h}))`; }
    if (p.fondo) { const a = 1 - (Number(p.transpFondo) || 0) / 100; lienzo.style.background = hexA(p.fondo, a); }
    const wrap = lienzo.closest('.pb-lienzo-wrap'); if (wrap) wrap.style.background = p.tapiz || '';
  }
  const hexA = (hex, a) => { const h = String(hex || '#FFFFFF').replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`; };
  function irPagina(i, opts = {}) {
    const s = S(); if (i < 0 || i >= s.paginas.length) return;
    if (i !== s.pagina && !opts.sinHistorial) { s.historialPag = (s.historialPag || []).concat(s.pagina).slice(-20); }
    s.pagina = i; s.sel = null; s.selMulti = []; s.cruz = null; s.enfoque = null; I().guardar(true); I().render();
  }
  function menuPagina(i, e) {
    const s = S(), p = s.paginas[i];
    menu(e.clientX, e.clientY - 150, [
      { k: 'duplicar', t: 'Duplicar página', ico: 'copy' }, { k: 'renombrar', t: 'Cambiar nombre a la página', ico: 'rename' }, { k: 'eliminar', t: 'Eliminar página', ico: 'delete', off: s.paginas.length < 2 },
      { k: 'ocultar', t: p.oculta ? 'Mostrar página' : 'Ocultar página', ico: p.oculta ? 'eye' : 'eye_off' }, '-',
      { k: 'izq', t: 'Mover a la izquierda', ico: 'arrow_previous', off: i === 0 }, { k: 'der', t: 'Mover a la derecha', ico: 'arrow_forward', off: i === s.paginas.length - 1 },
    ], async (k) => {
      if (k === 'duplicar') { const c = copia(p); c.nombre = `Duplicado de ${p.nombre}`; c.visuales.forEach((v) => { v.id = nuevoId(); }); s.paginas.splice(i + 1, 0, c); s.pagina = i + 1; }
      else if (k === 'renombrar') { const r = await I().pedir('Cambiar nombre a la página', [{ n: 'Nombre', v: p.nombre }]); if (r && r[0].trim()) p.nombre = r[0].trim(); }
      else if (k === 'eliminar') { if (!confirm(`¿Eliminar la página "${p.nombre}"? Se quitan sus objetos visuales.`)) return; s.paginas.splice(i, 1); s.pagina = Math.max(0, Math.min(s.pagina, s.paginas.length - 1)); }
      else if (k === 'ocultar') { p.oculta = !p.oculta; toast(p.oculta ? 'Página oculta: en el servicio y en modo lectura no aparece en las pestañas, pero se puede llegar con un botón, un marcador u Obtener detalles.' : 'La página vuelve a verse.', 6000); }
      else if (k === 'izq' || k === 'der') { const j = k === 'izq' ? i - 1 : i + 1; [s.paginas[i], s.paginas[j]] = [s.paginas[j], s.paginas[i]]; s.pagina = j; }
      I().guardar(); I().render();
    });
  }

  // ---------------------------------------------------------------- formas, botones y navegadores
  const ICO_BOTON = { 'Atrás': 'arrow_previous', Marcador: 'bookmark', 'Navegación de páginas': 'arrow_forward', 'Obtener detalles': 'arrow_step_in', 'Dirección URL': 'link', 'En blanco': '' };
  function dibujar(v, cuerpo, el) {
    el.style.padding = '0';
    if (v.tipo === 'forma') {
      const t = fmt(v, 'forma', 'tipo'), rel = hexA(fmt(v, 'forma', 'relleno'), 1 - (Number(fmt(v, 'forma', 'transp')) || 0) / 100);
      const bd = fmt(v, 'forma', 'borde') ? fmt(v, 'forma', 'colorBorde') : 'none', g = Number(fmt(v, 'forma', 'grosor')) || 1;
      const W = 100, H = 100, txt = fmt(v, 'forma', 'texto');
      let fig;
      if (t === 'Óvalo') fig = `<ellipse cx="50" cy="50" rx="49" ry="49" fill="${rel}" stroke="${bd}" stroke-width="${g}" vector-effect="non-scaling-stroke"/>`;
      else if (t === 'Triángulo') fig = `<polygon points="50,1 99,99 1,99" fill="${rel}" stroke="${bd}" stroke-width="${g}" vector-effect="non-scaling-stroke"/>`;
      else if (t === 'Línea') fig = `<line x1="0" y1="50" x2="100" y2="50" stroke="${fmt(v, 'forma', 'relleno')}" stroke-width="${Math.max(2, g)}" vector-effect="non-scaling-stroke"/>`;
      else if (t === 'Flecha') fig = `<polygon points="0,35 70,35 70,10 100,50 70,90 70,65 0,65" fill="${rel}" stroke="${bd}" stroke-width="${g}" vector-effect="non-scaling-stroke"/>`;
      else fig = `<rect x="0.5" y="0.5" width="99" height="99" rx="${t === 'Rectángulo redondeado' ? 10 : 0}" fill="${rel}" stroke="${bd}" stroke-width="${g}" vector-effect="non-scaling-stroke"/>`;
      cuerpo.innerHTML = `<div class="pb-forma" style="transform:rotate(${Number(fmt(v, 'forma', 'rotacion')) || 0}deg)"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${fig}</svg>${txt ? `<span style="color:${fmt(v, 'forma', 'colorTexto')};font-size:${fmt(v, 'forma', 'tamTexto')}px">${esc(txt)}</span>` : ''}</div>`;
      return;
    }
    if (v.tipo === 'boton') {
      const tipo = fmt(v, 'accion', 'tipo'), ico = fmt(v, 'boton', 'icono') === 'Ninguno' ? '' : ICO_BOTON[v.boton || tipo] || '';
      const texto = fmt(v, 'boton', 'texto');
      cuerpo.innerHTML = `<div class="pb-boton" role="button" title="Ctrl + clic para seguir el vínculo (en el servicio o en modo lectura alcanza con un clic)" style="color:${fmt(v, 'boton', 'colorTexto')};font-size:${fmt(v, 'boton', 'tam')}px;background:${fmt(v, 'boton', 'relleno')};border:${fmt(v, 'boton', 'borde') ? `1px solid ${fmt(v, 'boton', 'colorBorde')}` : '0'};border-radius:${Number(fmt(v, 'boton', 'radio')) || 0}px">${ico ? fl(ico) : ''}${texto ? `<span>${esc(texto)}</span>` : ''}</div>`;
      return;
    }
    if (v.tipo === 'navPaginas') {
      const s = S();
      const items = v.modo === 'marcadores' ? (s.marcadores || []).map((m) => ({ k: m.id, n: m.nombre, on: s.marcadorSel === m.id })) : s.paginas.map((p, i) => ({ k: String(i), n: p.nombre, on: i === s.pagina, p })).filter((x) => (fmt(v, 'navpag', 'ocultas') || !x.p.oculta) && x.p.tipo !== 'tooltip');
      cuerpo.innerHTML = `<div class="pb-navpag">${items.map((it) => `<div role="button" data-nav="${esc(it.k)}" class="${it.on ? 'on' : ''}" style="background:${it.on ? fmt(v, 'navpag', 'rellenoSel') : fmt(v, 'navpag', 'relleno')};color:${it.on ? '#fff' : fmt(v, 'navpag', 'colorTexto')}" title="Ctrl + clic para ir">${esc(it.n)}</div>`).join('') || `<span class="pb-dim">${v.modo === 'marcadores' ? 'Todavía no hay marcadores: Vista → Marcadores → Agregar' : 'Sin páginas'}</span>`}</div>`;
    }
  }
  function accionBoton(v, destinoNav) {
    const s = S();
    if (v.tipo === 'navPaginas') { if (destinoNav == null) return; if (v.modo === 'marcadores') aplicarMarcador(s.marcadores.find((m) => m.id === destinoNav)); else irPagina(Number(destinoNav)); return; }
    if (!fmt(v, 'accion', 'activa')) return;
    const tipo = fmt(v, 'accion', 'tipo'), dest = fmt(v, 'accion', 'destino');
    if (tipo === 'Atrás') { const h = s.historialPag || []; if (h.length) { const j = h.pop(); irPagina(j, { sinHistorial: true }); } else if (s.drill && s.drill.desde != null) irPagina(s.drill.desde, { sinHistorial: true }); else toast('No hay una página anterior a la que volver.'); return; }
    if (tipo === 'Marcador') { const m = (s.marcadores || []).find((x) => x.nombre === dest); if (!m) { toast('Elige el marcador en Formato → Acción → Destino.'); return; } aplicarMarcador(m); return; }
    if (tipo === 'Navegación de páginas') { const j = s.paginas.findIndex((p) => p.nombre === dest); if (j < 0) { toast('Elige la página en Formato → Acción → Destino.'); return; } irPagina(j); return; }
    if (tipo === 'Obtener detalles') { const j = s.paginas.findIndex((p) => p.nombre === dest); if (j < 0) { toast('Elige la página de detalles en Formato → Acción → Destino.'); return; } if (!s.cruz) { toast('Primero selecciona un dato en un objeto visual (por ejemplo, una barra) y después Ctrl + clic en el botón.', 6000); return; } obtenerDetalles(j, s.cruz.campo, s.cruz.valor); return; }
    if (tipo === 'Dirección URL') { const u = fmt(v, 'accion', 'url'); if (/^https?:\/\//.test(u)) window.open(u, '_blank', 'noopener'); else toast('Escribe una dirección que empiece con https://'); }
  }
  function destinos(v) {
    const s = S(); const tipo = fmt(v, 'accion', 'tipo');
    if (tipo === 'Marcador') return ['', ...(s.marcadores || []).map((m) => m.nombre)];
    if (tipo === 'Navegación de páginas') return ['', ...s.paginas.filter((p) => p.tipo !== 'tooltip').map((p) => p.nombre)];
    if (tipo === 'Obtener detalles') return ['', ...s.paginas.filter((p) => p.tipo === 'detalles').map((p) => p.nombre)];
    return [''];
  }
  const paginasTooltip = () => ['', ...S().paginas.filter((p) => p.tipo === 'tooltip').map((p) => p.nombre)];
  function insertarBoton(tipo) {
    const ext = { boton: tipo, w: tipo === 'En blanco' ? 14 : 6, h: tipo === 'En blanco' ? 8 : 9, formato: { accion: { tipo: tipo === 'En blanco' ? 'Atrás' : tipo, activa: tipo !== 'En blanco' }, boton: { texto: tipo === 'En blanco' ? 'Botón' : '' } } };
    I().agregarVisual('boton', ext);
    if (tipo === 'Marcador' && !(S().marcadores || []).length) toast('Este botón aplica un marcador. Crea uno en Vista → Marcadores y elígelo en Formato → Acción → Destino.', 7000);
  }

  // ---------------------------------------------------------------- marcadores
  function capturar() {
    const s = S(), p = pagActual();
    return {
      pagina: s.pagina, filtrosPag: copia(p.filtros || []), filtrosTodas: copia(s.filtrosTodas || []), cruz: s.cruz ? copia(s.cruz) : null, enfoque: s.enfoque || null,
      visuales: Object.fromEntries(p.visuales.map((v) => [v.id, { slicerSel: copia(v.slicerSel || []), filtros: copia(v.filtros || []), oculto: !!v.oculto, orden: v.orden ? copia(v.orden) : null, nivel: v.nivel || 0, drillPath: copia(v.drillPath || []), expandido: !!v.expandido }])),
    };
  }
  function aplicarMarcador(m) {
    if (!m) return; const s = S(), e = m.estado, o = m.op || { datos: true, visual: true, pagina: true };
    if (o.pagina && s.paginas[e.pagina]) { if (e.pagina !== s.pagina) s.historialPag = (s.historialPag || []).concat(s.pagina).slice(-20); s.pagina = e.pagina; }
    const p = s.paginas[e.pagina] || pagActual();
    if (o.datos) { p.filtros = copia(e.filtrosPag); s.filtrosTodas = copia(e.filtrosTodas); s.cruz = e.cruz ? copia(e.cruz) : null; }
    for (const v of p.visuales) { const st = e.visuales[v.id]; if (!st) continue; if (o.datos) Object.assign(v, { slicerSel: copia(st.slicerSel), filtros: copia(st.filtros), orden: st.orden ? copia(st.orden) : null, nivel: st.nivel, drillPath: copia(st.drillPath), expandido: st.expandido }); if (o.visual) v.oculto = st.oculto; }
    if (o.visual) s.enfoque = e.enfoque;
    s.marcadorSel = m.id; s.sel = null; s.selMulti = [];
    I().guardar(); I().render();
  }
  function panelMarcadores() {
    const s = S(); const ms = s.marcadores || [];
    return `<div class="pb-pan pb-pan-x"><div class="pb-pan-t">Marcadores <button data-cerrar-x="marcadores" title="Cerrar">✕</button></div>
      <div class="pb-x-bar"><button class="pb-btn" data-mk="agregar">${fl('bookmark')} Agregar</button><button class="pb-btn" data-mk="ver" ${ms.length ? '' : 'disabled'}>${fl('play')} Ver</button></div>
      ${ms.map((m) => `<div class="pb-mk ${s.marcadorSel === m.id ? 'on' : ''}" data-mk-ir="${m.id}"><span>${fl('bookmark')}</span><b>${esc(m.nombre)}</b><button data-mk-mas="${m.id}" title="Más opciones">⋯</button></div>`).join('') || '<p class="pb-ayuda">Un marcador guarda cómo se ve el informe ahora (página, filtros, segmentaciones, orden y qué objetos visuales están visibles) para volver a ese estado con un clic o con un botón.</p>'}
    </div>`;
  }
  function verMarcadores(i = 0) {
    const s = S(); const ms = s.marcadores || []; if (!ms.length) return;
    aplicarMarcador(ms[i]);
    let bar = document.getElementById('pbMkVer'); if (!bar) { bar = document.createElement('div'); bar.id = 'pbMkVer'; bar.className = 'pb-mk-ver'; document.querySelector('#pbi').appendChild(bar); }
    bar.innerHTML = `<button data-mkv="${i - 1}" ${i ? '' : 'disabled'}>‹</button><b>${esc(ms[i].nombre)}</b><span>${i + 1} de ${ms.length}</span><button data-mkv="${i + 1}" ${i < ms.length - 1 ? '' : 'disabled'}>›</button><button data-mkv="x" title="Salir">✕</button>`;
    bar.onclick = (e) => { const b = e.target.closest('[data-mkv]'); if (!b) return; if (b.dataset.mkv === 'x') { bar.remove(); return; } verMarcadores(Number(b.dataset.mkv)); };
  }

  // ---------------------------------------------------------------- panel Selección
  function panelSeleccion() {
    const s = S(); const vs = pagActual().visuales.slice().reverse();
    const nombre = (v) => I().tituloDe(v) || (v.tipo === 'texto' ? (v.imagen ? 'Imagen' : (v.texto || 'Cuadro de texto').slice(0, 30)) : v.tipo === 'forma' ? fmt(v, 'forma', 'tipo') : v.tipo === 'boton' ? `Botón ${v.boton || ''}`.trim() : I().V().TIPOS[v.tipo].n);
    return `<div class="pb-pan pb-pan-x"><div class="pb-pan-t">Selección <button data-cerrar-x="seleccion" title="Cerrar">✕</button></div>
      <div class="pb-x-bar"><button class="pb-btn" data-sel-capa="arriba" title="Traer adelante" ${s.sel ? '' : 'disabled'}>${fl('arrow_up')}</button><button class="pb-btn" data-sel-capa="abajo" title="Enviar atrás" ${s.sel ? '' : 'disabled'}>${fl('arrow_down')}</button><button class="pb-btn" data-sel-todo="1" title="Mostrar todo">${fl('eye')}</button><button class="pb-btn" data-sel-todo="0" title="Ocultar todo">${fl('eye_off')}</button></div>
      <div class="pb-dim small" style="padding:0 12px 4px">Orden de capas (arriba = adelante)</div>
      ${vs.map((v) => `<div class="pb-selv ${s.sel === v.id || (s.selMulti || []).includes(v.id) ? 'on' : ''} ${v.oculto ? 'oculto' : ''}" data-selv="${v.id}"><span class="pb-selv-n">${esc(nombre(v))}</span><button data-ojo="${v.id}" title="${v.oculto ? 'Mostrar' : 'Ocultar'}">${fl(v.oculto ? 'eye_off' : 'eye')}</button></div>`).join('') || '<p class="pb-ayuda">La página no tiene objetos visuales.</p>'}
      <p class="pb-ayuda">Ocultar un objeto visual y guardar un marcador con él oculto es la forma de armar "pestañas" o paneles que aparecen con un botón.</p></div>`;
  }
  function moverCapa(id, dir) {
    const vs = pagActual().visuales; const i = vs.findIndex((v) => v.id === id); if (i < 0) return;
    const [v] = vs.splice(i, 1);
    const j = dir === 'frente' ? vs.length : dir === 'fondo' ? 0 : dir === 'arriba' ? Math.min(vs.length, i + 1) : Math.max(0, i - 1);
    vs.splice(j, 0, v); I().guardar(); I().render();
  }

  // ---------------------------------------------------------------- sincronizar segmentaciones
  function panelSincro() {
    const s = S(); const v = s.sel && I().vis(s.sel);
    if (!v || v.tipo !== 'segmentacion') return `<div class="pb-pan pb-pan-x"><div class="pb-pan-t">Sincronizar segmentaciones <button data-cerrar-x="sincro" title="Cerrar">✕</button></div><p class="pb-ayuda">Selecciona una segmentación de datos en el lienzo. Desde aquí eliges en qué páginas filtra (Sincronizar) y en cuáles se ve (Visible): así un mismo filtro de año o de país acompaña a la persona por todo el informe.</p></div>`;
    const g = v.grupoSync && s.sincro && s.sincro[v.grupoSync];
    const sync = (i) => (g ? g.paginas.includes(i) : i === s.pagina), visible = (i) => s.paginas[i].visuales.some((x) => x.tipo === 'segmentacion' && (g ? x.grupoSync === v.grupoSync : x.id === v.id));
    return `<div class="pb-pan pb-pan-x"><div class="pb-pan-t">Sincronizar segmentaciones <button data-cerrar-x="sincro" title="Cerrar">✕</button></div>
      <div class="pb-dim small" style="padding:0 12px 6px">${esc(v.pozos.x && v.pozos.x[0] ? I().nomCampo(v.pozos.x[0]) : 'Segmentación')}</div>
      <table class="pb-sincro"><thead><tr><th>Nombre</th><th title="La selección filtra esta página">${fl('arrow_sync')}</th><th title="La segmentación se ve en esta página">${fl('eye')}</th></tr></thead><tbody>
      ${s.paginas.map((p, i) => `<tr><td>${esc(p.nombre)}</td><td><input type="checkbox" data-sync="${i}" ${sync(i) ? 'checked' : ''}></td><td><input type="checkbox" data-vis-sync="${i}" ${visible(i) ? 'checked' : ''}></td></tr>`).join('')}</tbody></table>
      <p class="pb-ayuda">Sincronizar sin Visible: la página queda filtrada aunque no muestre la segmentación.</p></div>`;
  }
  function grupoDe(v) {
    const s = S(); s.sincro = s.sincro || {};
    if (!v.grupoSync) { v.grupoSync = 'g' + v.id; s.sincro[v.grupoSync] = { campo: copia(v.pozos.x[0]), sel: copia(v.slicerSel || []), paginas: [s.pagina] }; }
    return s.sincro[v.grupoSync];
  }
  function slicerCambio(v) {
    const s = S(); if (!v.grupoSync || !s.sincro || !s.sincro[v.grupoSync]) return;
    const g = s.sincro[v.grupoSync]; g.sel = copia(v.slicerSel || []);
    for (const p of s.paginas) for (const x of p.visuales) if (x.grupoSync === v.grupoSync && x !== v) x.slicerSel = copia(g.sel);
  }

  // ---------------------------------------------------------------- interacciones
  const interaccion = (src, dst) => { const p = I().pag(); return (p.inter && p.inter[src] && p.inter[src][dst]) || 'filtro'; };
  function cambiarInteraccion(v, tipo) {
    const s = S(), p = I().pag(); if (!s.sel) return;
    p.inter = p.inter || {}; p.inter[s.sel] = p.inter[s.sel] || {}; p.inter[s.sel][v.id] = tipo; I().guardar(); I().render();
  }

  // ---------------------------------------------------------------- explorar en profundidad
  function conv(campo, raw) { if (raw === '' || raw == null) return null; if (campo.parte === 'anio') return Number(raw); return !campo.parte && ['num', 'int'].includes(I().tipoDe(campo.t, campo.c)) ? Number(raw) : raw; }
  function botonesDrill(v) {
    const n = v.pozos.x.length, i = Math.min(v.nivel || 0, n - 1);
    return `<button data-drill="subir" title="Explorar en profundidad: subir un nivel" ${i === 0 && !(v.drillPath || []).length ? 'disabled' : ''}>${fl('arrow_up')}</button><button data-drill="modo" class="${v.modoDrill ? 'on' : ''}" title="${v.modoDrill ? 'Desactivar' : 'Activar'} la exploración en profundidad: con esto activo, un clic en un dato baja un nivel">${fl('arrow_down')}</button><button data-drill="siguiente" title="Ir al siguiente nivel de la jerarquía" ${i >= n - 1 ? 'disabled' : ''}>${fl('arrow_down_right')}</button><button data-drill="expandir" title="Expandir todo un nivel de la jerarquía" ${i >= n - 1 ? 'disabled' : ''}>${fl('arrow_expand')}</button>`;
  }
  function drill(v, a) {
    const n = v.pozos.x.length; v.nivel = Math.min(v.nivel || 0, n - 1); v.drillPath = v.drillPath || [];
    if (a === 'subir') { if (v.drillPath.length && v.drillPath.length >= v.nivel) v.drillPath.pop(); v.nivel = Math.max(0, v.nivel - 1); if (!v.nivel) v.expandido = false; v.drillPath = v.drillPath.slice(0, v.nivel); }
    else if (a === 'modo') { v.modoDrill = !v.modoDrill; toast(v.modoDrill ? 'Exploración activada: haz clic en una barra para bajar un nivel dentro de ese valor.' : 'Exploración desactivada: un clic vuelve a filtrar los otros objetos visuales.'); }
    else if (a === 'siguiente') { if (v.nivel < n - 1) { v.nivel++; v.expandido = false; v.drillPath = []; } }
    else if (a === 'expandir') { if (v.nivel < n - 1) { v.nivel++; v.expandido = true; v.drillPath = []; } }
    v.orden = null; S().cruz = null; I().guardar(); I().render();
  }
  function drillValor(v, raw) {
    const n = v.pozos.x.length, i = Math.min(v.nivel || 0, n - 1); if (i >= n - 1 || v.expandido) return false;
    v.drillPath = (v.drillPath || []).slice(0, i).concat({ campo: copia(v.pozos.x[i]), valor: conv(v.pozos.x[i], raw) }); v.nivel = i + 1; v.orden = null;
    S().cruz = null; I().guardar(); I().render(); return true;
  }

  // ---------------------------------------------------------------- obtener detalles (drillthrough)
  function obtenerDetalles(j, campo, valor) {
    const s = S(), p = s.paginas[j];
    const filtros = [];
    const campoPag = (p.detalles || []).find((f) => f.t === campo.t && f.c === campo.c) || campo;
    filtros.push({ campo: copia(campoPag), valores: [valor], origen: 'detalles' });
    if (p.mantenerFiltros !== false) {
      const orig = pagActual();
      for (const f of orig.filtros || []) { const r = I().filtroEfectivo(f); if (r) filtros.push({ ...copia(r), origen: 'detalles' }); }
      for (const o of orig.visuales) if (o.tipo === 'segmentacion' && (o.slicerSel || []).length && o.pozos.x && o.pozos.x[0]) filtros.push({ campo: copia(o.pozos.x[0]), valores: copia(o.slicerSel), origen: 'detalles' });
    }
    s.drill = { pagina: j, filtros, desde: s.pagina, resumen: `${I().nomCampo(campo)} = ${valor ?? '(En blanco)'}` };
    irPagina(j);
  }
  function paginasDetallesPara(campo) { return S().paginas.map((p, j) => ({ p, j })).filter(({ p, j }) => p.tipo === 'detalles' && j !== S().pagina && (p.detalles || []).some((f) => f.t === campo.t && f.c === campo.c)); }

  // ---------------------------------------------------------------- filtros que agrega este módulo
  function filtrosExtra(v) {
    const s = S(), out = [], p = I().pag(), idx = s.paginas.indexOf(p);
    for (const f of v.drillPath || []) out.push({ campo: f.campo, valores: [f.valor], origen: 'visual' });
    if (s.sincro) for (const [g, x] of Object.entries(s.sincro)) if (x.paginas.includes(idx) && (x.sel || []).length && !p.visuales.some((o) => o.grupoSync === g)) out.push({ campo: x.campo, valores: x.sel, origen: 'pagina' });
    if (s.drill && s.drill.pagina === idx) out.push(...s.drill.filtros);
    if (ttFiltro) out.push(ttFiltro);
    return out;
  }

  // ---------------------------------------------------------------- páginas de información sobre herramientas
  let ttFiltro = null, ttEl = null, ttClave = '';
  function tooltipPagina(v, raw, e) {
    const s = S(); const nombre = fmt(v, 'infoHerr', 'pagina'); const p = s.paginas.find((x) => x.nombre === nombre && x.tipo === 'tooltip'); if (!p) return;
    const campo = v.pozos.x && v.pozos.x[Math.min(v.nivel || 0, v.pozos.x.length - 1)]; if (!campo) return;
    const clave = v.id + '|' + raw;
    if (!ttEl) { ttEl = document.createElement('div'); ttEl.className = 'pb-tt-pag'; document.body.appendChild(ttEl); }
    const [w, h] = p.tamano === 'Personalizado' ? [Number(p.ancho) || 320, Number(p.alto) || 240] : TAMANOS[p.tamano || 'Información sobre herramientas'] || [320, 240];
    ttEl.style.width = w + 'px'; ttEl.style.height = h + 'px'; ttEl.style.left = Math.min(e.clientX + 16, innerWidth - w - 8) + 'px'; ttEl.style.top = Math.min(e.clientY + 12, innerHeight - h - 8) + 'px'; ttEl.hidden = false;
    if (clave === ttClave) return; ttClave = clave;
    ttEl.style.background = p.fondo ? hexA(p.fondo, 1 - (Number(p.transpFondo) || 0) / 100) : '#fff';
    ttEl.innerHTML = p.visuales.filter((x) => !x.oculto).map((x) => `<div class="pb-v" data-tt="${x.id}" style="left:${x.x}%;top:${x.y}%;width:${x.w}%;height:${x.h}%">${I().tituloDe(x) ? `<div class="pb-v-tit">${esc(I().tituloDe(x))}</div>` : ''}<div class="pb-v-cuerpo"></div></div>`).join('') + `<div class="pb-tt-pie">${esc(I().nomCampo(campo))}: ${esc(raw)}</div>`;
    ttFiltro = { campo, valores: [conv(campo, raw)], origen: 'tooltip' };
    try { I().conPagina(p, () => { for (const x of p.visuales) { const el = ttEl.querySelector(`[data-tt="${x.id}"]`); if (el) I().dibujarVisual(x, el); } }); } finally { ttFiltro = null; }
  }
  function ocultarTooltip() { if (ttEl) ttEl.hidden = true; ttClave = ''; }

  // ---------------------------------------------------------------- lienzo: clics, menú contextual, tooltips
  function clicVisual(v, e) {
    const s = S();
    if (I().lectura() && (v.tipo === 'boton' || v.tipo === 'navPaginas')) { const b = e.target.closest('[data-nav]'); e.preventDefault(); accionBoton(v, b && b.dataset.nav); return true; }
    if (I().lectura()) return false;
    if (e.ctrlKey || e.metaKey) {
      if (v.tipo === 'boton') { e.preventDefault(); accionBoton(v); return true; }
      if (v.tipo === 'navPaginas') { const b = e.target.closest('[data-nav]'); e.preventDefault(); accionBoton(v, b && b.dataset.nav); return true; }
      const m = new Set(s.selMulti || []); if (s.sel) m.add(s.sel); m.has(v.id) ? m.delete(v.id) : m.add(v.id); s.selMulti = [...m]; s.sel = s.selMulti[s.selMulti.length - 1] || null;
      I().guardar(true); I().render(); I().refrescarCinta(); return true;
    }
    if ((s.selMulti || []).length) { s.selMulti = []; }
    return false;
  }
  function enlazarLienzo(lienzo) {
    if (lienzo.dataset.ext) return; lienzo.dataset.ext = '1';
    lienzo.addEventListener('contextmenu', (e) => {
      const el = e.target.closest('.pb-v'); if (!el) return; const v = I().vis(el.dataset.id); if (!v) return; e.preventDefault();
      const dato = e.target.closest('[data-cat]');
      if (dato && v.pozos.x && v.pozos.x.length) return menuDato(v, dato.dataset.cat, e);
      menuObjeto(v, e);
    });
    lienzo.addEventListener('mousemove', (e) => {
      const d = e.target.closest('[data-cat]'), el = e.target.closest('.pb-v');
      if (!d || !el) { if (ttEl && !ttEl.hidden) ocultarTooltip(); return; }
      const v = I().vis(el.dataset.id); if (v && fmt(v, 'infoHerr', 'tipo') === 'Página de informe' && fmt(v, 'infoHerr', 'pagina')) tooltipPagina(v, d.dataset.cat, e); else ocultarTooltip();
    });
    lienzo.addEventListener('mouseleave', ocultarTooltip);
  }
  function menuDato(v, raw, e) {
    const n = v.pozos.x.length, i = Math.min(v.nivel || 0, n - 1), campo = v.pozos.x[i], val = conv(campo, raw);
    const det = paginasDetallesPara(campo);
    const items = [{ k: 'explorar', t: 'Explorar en profundidad', ico: 'arrow_down', off: i >= n - 1 || v.expandido }, { k: 'mostrar', t: 'Mostrar como tabla', ico: 'table' }, '-'];
    if (det.length) { items.push({ sub: 'Obtener detalles' }); det.forEach(({ p, j }) => items.push({ k: 'det:' + j, t: p.nombre, ico: 'arrow_step_in' })); items.push('-'); }
    items.push({ k: 'incluir', t: 'Incluir', ico: 'checkmark' }, { k: 'excluir', t: 'Excluir', ico: 'dismiss' }, '-', { k: 'copiar', t: 'Copiar valor', ico: 'copy' });
    menu(e.clientX, e.clientY, items, (k) => {
      if (k === 'explorar') drillValor(v, raw);
      else if (k === 'mostrar') { v.verTabla = true; S().enfoque = v.id; I().render(); }
      else if (k.startsWith('det:')) obtenerDetalles(Number(k.slice(4)), campo, val);
      else if (k === 'incluir') { v.filtros.push({ campo: copia(campo), tipo: 'basico', valores: [val] }); I().guardar(); I().render(); toast(`Filtro del objeto visual: ${I().nomCampo(campo)} es ${raw}. Quítalo en el panel Filtros.`); }
      else if (k === 'excluir') { v.filtros.push({ campo: copia(campo), tipo: 'avanzado', cond: { op: '<>', val } }); I().guardar(); I().render(); toast(`Excluido ${raw}. El filtro quedó en "Filtros en este objeto visual".`); }
      else if (k === 'copiar') { try { navigator.clipboard.writeText(String(raw)); } catch (err) { /* sin portapapeles */ } toast('Valor copiado'); }
    });
  }
  function menuObjeto(v, e) {
    const s = S(); s.sel = v.id; I().guardar(true);
    menu(e.clientX, e.clientY, [
      { k: 'copiar', t: 'Copiar (Ctrl+C)', ico: 'copy' }, { k: 'pegar', t: 'Pegar (Ctrl+V)', ico: 'clipboard_paste', off: !portapapeles }, { k: 'duplicar', t: 'Duplicar', ico: 'copy' }, { k: 'eliminar', t: 'Eliminar (Supr)', ico: 'delete' }, '-',
      { k: 'frente', t: 'Traer al frente', ico: 'position_to_front' }, { k: 'arriba', t: 'Traer adelante', ico: 'position_forward' }, { k: 'abajo', t: 'Enviar atrás', ico: 'position_backward' }, { k: 'fondo', t: 'Enviar al fondo', ico: 'position_to_back' }, '-',
      { k: 'ocultar', t: 'Ocultar (panel Selección)', ico: 'eye_off' },
    ], (k) => {
      if (k === 'copiar') copiar(); else if (k === 'pegar') pegar(); else if (k === 'duplicar') { copiar(); pegar(); } else if (k === 'eliminar') I().quitarVisual(v.id);
      else if (k === 'ocultar') { v.oculto = true; s.panelesExtra = { ...(s.panelesExtra || {}), seleccion: true }; I().guardar(); I().render(); }
      else moverCapa(v.id, k);
    });
  }

  // ---------------------------------------------------------------- teclado, copiar y pegar
  const seleccionados = () => { const s = S(); const ids = new Set([...(s.selMulti || []), ...(s.sel ? [s.sel] : [])]); return pagActual().visuales.filter((v) => ids.has(v.id)); };
  function copiar() { const vs = seleccionados(); if (!vs.length) return false; portapapeles = copia(vs); toast(`${vs.length} objeto(s) visual(es) copiado(s). Pégalos con Ctrl+V (también en otra página).`); return true; }
  function pegar() {
    if (!portapapeles) return false; const s = S(); const nuevos = portapapeles.map((v) => ({ ...copia(v), id: nuevoId(), x: Math.min(100 - v.w, v.x + 2), y: Math.min(100 - v.h, v.y + 3) }));
    nuevos.forEach((v) => { delete v.grupoSync; }); pagActual().visuales.push(...nuevos); s.sel = nuevos[nuevos.length - 1].id; s.selMulti = nuevos.length > 1 ? nuevos.map((v) => v.id) : [];
    portapapeles = copia(nuevos); I().guardar(); I().render(); return true;
  }
  function tecla(e) {
    const s = S(), k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k === 'c') return copiar();
    if (ctrl && k === 'v') return pegar();
    if (k === 'escape' && s.editInter) { s.editInter = false; I().guardar(true); I().render(); I().refrescarCinta(); return true; }
    const vs = seleccionados(); if (!vs.length) return false;
    if (k === 'delete' && vs.length > 1) { const ids = new Set(vs.map((v) => v.id)); pagActual().visuales = pagActual().visuales.filter((v) => !ids.has(v.id)); s.sel = null; s.selMulti = []; I().guardar(); I().render(); return true; }
    const d = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
    if (d) { const paso = e.shiftKey ? 5 : 0.5; for (const v of vs) { v.x = Math.max(0, Math.min(100 - v.w, v.x + d[0] * paso)); v.y = Math.max(0, Math.min(100 - v.h, v.y + d[1] * paso)); } I().guardar(); I().render(); return true; }
    return false;
  }
  function alinear(modo) {
    const vs = seleccionados(); if (!vs.length) { toast('Selecciona uno o más objetos visuales (Ctrl + clic para elegir varios).'); return; }
    const caja = vs.length > 1 ? { x0: Math.min(...vs.map((v) => v.x)), y0: Math.min(...vs.map((v) => v.y)), x1: Math.max(...vs.map((v) => v.x + v.w)), y1: Math.max(...vs.map((v) => v.y + v.h)) } : { x0: 0, y0: 0, x1: 100, y1: 100 };
    if (modo === 'disth' || modo === 'distv') {
      if (vs.length < 3) { toast('Para distribuir hacen falta al menos tres objetos visuales seleccionados.'); return; }
      const h = modo === 'disth'; const ord = vs.slice().sort((a, b) => (h ? a.x - b.x : a.y - b.y)); const total = ord.reduce((t, v) => t + (h ? v.w : v.h), 0); const hueco = ((h ? caja.x1 - caja.x0 : caja.y1 - caja.y0) - total) / (ord.length - 1);
      let p = h ? caja.x0 : caja.y0; for (const v of ord) { if (h) { v.x = p; p += v.w + hueco; } else { v.y = p; p += v.h + hueco; } }
    } else for (const v of vs) {
      if (modo === 'izq') v.x = caja.x0; else if (modo === 'der') v.x = caja.x1 - v.w; else if (modo === 'centro') v.x = (caja.x0 + caja.x1) / 2 - v.w / 2;
      else if (modo === 'arriba') v.y = caja.y0; else if (modo === 'abajo') v.y = caja.y1 - v.h; else if (modo === 'medio') v.y = (caja.y0 + caja.y1) / 2 - v.h / 2;
    }
    I().guardar(); I().render();
  }

  // ---------------------------------------------------------------- cinta
  const BOTON = (acc, ico, txt, on) => `<button class="pb-cb grande ${on ? 'on' : ''}" data-acc="${acc}"><span class="pb-cb-ic">${fl(ico)}</span><span>${txt}</span></button>`;
  const CHICO = (acc, ico, txt) => `<button class="pb-cb chico" data-acc="${acc}"><span class="pb-cb-ic">${fl(ico)}</span><span>${txt}</span></button>`;
  const GRUPO = (nombre, html) => `<div class="pb-grupo">${html}<div class="pb-grupo-n">${nombre}</div></div>`;
  const cintaInsertar = () => GRUPO('Botones y formas', BOTON('x-botones', 'cursor_click', 'Botones ⌄') + BOTON('x-formas', 'shapes', 'Formas ⌄'))
    + GRUPO('Navegación', BOTON('x-navpag', 'navigation', 'Navegador<br>de páginas') + BOTON('x-navmarc', 'bookmark', 'Navegador de<br>marcadores'))
    + (window.PBIIa ? window.PBIIa.cintaInsertar() : '');
  const cintaVista = () => { const p = S().panelesExtra || {}; return GRUPO('Mostrar paneles (más)', BOTON('x-p-marcadores', 'bookmark', `Marcadores ${p.marcadores ? '✓' : ''}`) + BOTON('x-p-seleccion', 'layer', `Selección ${p.seleccion ? '✓' : ''}`) + BOTON('x-p-sincro', 'arrow_sync_circle', `Sincronizar<br>segmentaciones ${p.sincro ? '✓' : ''}`)); };
  const cintaFormato = () => GRUPO('Interacciones', BOTON('x-inter', 'arrow_routing', `Editar<br>interacciones ${S().editInter ? '✓' : ''}`))
    + GRUPO('Organizar', CHICO('x-adelante', 'position_forward', 'Traer adelante ⌄') + CHICO('x-atras', 'position_backward', 'Enviar atrás ⌄') + CHICO('x-alinear', 'align_left', 'Alinear ⌄') + CHICO('x-p-seleccion', 'layer', 'Panel Selección'))
    + GRUPO('Portapapeles', CHICO('x-copiar', 'copy', 'Copiar') + CHICO('x-pegar', 'clipboard_paste', 'Pegar'));
  function accion(a, el) {
    const s = S(); s.panelesExtra = s.panelesExtra || {};
    const conDatos = () => { if (!I().tablas().length) { toast('Primero obtén datos.'); return false; } return true; };
    if (a === 'x-botones') return menuBajo(el, ['Atrás', 'Marcador', 'Navegación de páginas', 'Obtener detalles', 'Dirección URL', 'En blanco'].map((t) => ({ k: t, t, ico: ICO_BOTON[t] || 'cursor_click' })), insertarBoton);
    if (a === 'x-formas') return menuBajo(el, ['Rectángulo', 'Rectángulo redondeado', 'Óvalo', 'Triángulo', 'Línea', 'Flecha'].map((t) => ({ k: t, t, ico: { Rectángulo: 'square', 'Rectángulo redondeado': 'square', Óvalo: 'circle', Triángulo: 'triangle', Línea: 'line_horizontal_1', Flecha: 'arrow_right' }[t] })), (t) => I().agregarVisual('forma', { w: t === 'Línea' ? 30 : 20, h: t === 'Línea' ? 4 : 20, formato: { forma: { tipo: t } } }));
    if (a === 'x-navpag') { I().agregarVisual('navPaginas', { w: Math.min(80, 14 * s.paginas.length), h: 8 }); return; }
    if (a === 'x-navmarc') { I().agregarVisual('navPaginas', { modo: 'marcadores', w: Math.min(80, 14 * Math.max(1, (s.marcadores || []).length)), h: 8 }); return; }
    if (a.startsWith('x-p-')) { const k = a.slice(4); s.panelesExtra[k] = !s.panelesExtra[k]; I().guardar(true); I().pintar(); return; }
    if (a === 'x-inter') { if (!conDatos()) return; s.editInter = !s.editInter; if (s.editInter && !s.sel) toast('Selecciona el objeto visual que filtra; en los demás aparecen los íconos Filtrar, Resaltar y Ninguno.', 6000); I().guardar(true); I().pintar(); return; }
    if (a === 'x-adelante') return menuBajo(el, [{ k: 'arriba', t: 'Traer adelante', ico: 'position_forward' }, { k: 'frente', t: 'Traer al frente', ico: 'position_to_front' }], (k) => s.sel && moverCapa(s.sel, k));
    if (a === 'x-atras') return menuBajo(el, [{ k: 'abajo', t: 'Enviar atrás', ico: 'position_backward' }, { k: 'fondo', t: 'Enviar al fondo', ico: 'position_to_back' }], (k) => s.sel && moverCapa(s.sel, k));
    if (a === 'x-alinear') return menuBajo(el, [{ k: 'izq', t: 'Alinear a la izquierda', ico: 'align_left' }, { k: 'centro', t: 'Alinear al centro', ico: 'align_center_horizontal' }, { k: 'der', t: 'Alinear a la derecha', ico: 'align_right' }, { k: 'arriba', t: 'Alinear arriba', ico: 'align_top' }, { k: 'medio', t: 'Alinear al medio', ico: 'align_center_vertical' }, { k: 'abajo', t: 'Alinear abajo', ico: 'align_bottom' }, '-', { k: 'disth', t: 'Distribuir horizontalmente', ico: 'arrow_routing' }, { k: 'distv', t: 'Distribuir verticalmente', ico: 'arrow_routing' }], alinear);
    if (a === 'x-parametro') return menuBajo(el, [{ k: 'num', t: 'Rango numérico', ico: 'number_symbol' }, { k: 'campos', t: 'Campos', ico: 'table_switch' }], (k) => (k === 'num' ? parametroNumerico() : parametroCampos()));
    if (a === 'x-copiar') return copiar();
    if (a === 'x-pegar') return pegar();
    if (window.PBIIa) return window.PBIIa.accion(a, el);
    return false;
  }

  // ---------------------------------------------------------------- paneles extra, Análisis y formato de página
  function panelesExtra() {
    const p = S().panelesExtra || {}; if (!p.marcadores && !p.seleccion && !p.sincro) return '';
    return `<div class="pb-pan-col pb-col-extra">${p.marcadores ? panelMarcadores() : ''}${p.seleccion ? panelSeleccion() : ''}${p.sincro ? panelSincro() : ''}</div>`;
  }
  const tieneAnalisis = (v) => { const T = I().V().TIPOS[v.tipo]; return T && T.g === 'cart' && v.tipo !== 'cascada'; };
  const TIPOS_AN = { constante: 'Línea constante', promedio: 'Línea de promedio', min: 'Línea mínima', max: 'Línea máxima', mediana: 'Línea de mediana', percentil: 'Línea de percentil', tendencia: 'Línea de tendencia' };
  function panelAnalisis(v) {
    const T = I().V().TIPOS[v.tipo]; const tipos = Object.entries(TIPOS_AN).filter(([k]) => !(k === 'tendencia' && T.horiz));
    return `<div class="pb-analisis-p"><p class="pb-ayuda">Líneas de referencia sobre la primera serie del gráfico: el promedio, un objetivo fijo (constante) o la tendencia ayudan a leer si un valor está bien o mal.</p>
      ${(v.analisis || []).map((a, i) => `<div class="pb-an-i"><div class="pb-an-t"><b>${esc(a.nombre || TIPOS_AN[a.tipo])}</b><input type="checkbox" class="pb-switch" data-an="${i}.activa" ${a.activa !== false ? 'checked' : ''}><button data-an-borrar="${i}" title="Quitar">✕</button></div>
        ${a.tipo === 'constante' || a.tipo === 'percentil' ? `<label class="pb-fmt"><span>${a.tipo === 'constante' ? 'Valor' : 'Percentil (0-100)'}</span><input type="number" data-an="${i}.valor" value="${esc(a.valor ?? '')}"></label>` : ''}
        <label class="pb-fmt"><span>Nombre</span><input data-an="${i}.nombre" value="${esc(a.nombre || '')}" placeholder="${esc(TIPOS_AN[a.tipo])}"></label>
        <label class="pb-fmt"><span>Color</span><input type="color" data-an="${i}.color" value="${esc(a.color || '#252423')}"></label>
        <label class="pb-fmt"><span>Estilo</span><select data-an="${i}.estilo">${['Discontinua', 'Continua', 'Punteada'].map((x) => `<option ${(a.estilo || 'Discontinua') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        ${a.tipo !== 'tendencia' ? `<label class="pb-fmt pb-fmt-chk"><span>Etiqueta de datos</span><input type="checkbox" class="pb-switch" data-an="${i}.etiqueta" ${a.etiqueta !== false ? 'checked' : ''}></label>` : ''}</div>`).join('')}
      <label class="pb-fmt"><span>Agregar línea</span><select data-an-nueva><option value="">Elegir…</option>${tipos.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label></div>`;
  }
  function panelPagina() {
    const p = pagActual(); const t = p.tamano || (p.tipo === 'tooltip' ? 'Información sobre herramientas' : '16:9');
    return `<div class="pb-fmt-sub"><span class="on">Formato de página</span></div>
      <div class="pb-fsec ab"><div class="pb-fsec-t"><span class="pb-chev">⌄</span>Información de la página</div><div class="pb-fsec-b">
        <label class="pb-fmt"><span>Nombre</span><input data-pg="nombre" value="${esc(p.nombre)}"></label>
        <label class="pb-fmt"><span>Tipo de página</span><select data-pg="tipo">${[['normal', 'Normal'], ['detalles', 'Obtener detalles (drillthrough)'], ['tooltip', 'Información sobre herramientas']].map(([k, n]) => `<option value="${k}" ${(p.tipo || 'normal') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="pb-fmt pb-fmt-chk"><span>Ocultar página</span><input type="checkbox" class="pb-switch" data-pg="oculta" ${p.oculta ? 'checked' : ''}></label></div></div>
      <div class="pb-fsec ab"><div class="pb-fsec-t"><span class="pb-chev">⌄</span>Configuración del lienzo</div><div class="pb-fsec-b">
        <label class="pb-fmt"><span>Tipo</span><select data-pg="tamano">${Object.keys(TAMANOS).map((k) => `<option ${t === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        ${t === 'Personalizado' ? `<label class="pb-fmt"><span>Ancho (px)</span><input type="number" data-pg="ancho" value="${esc(p.ancho || 1280)}"></label><label class="pb-fmt"><span>Alto (px)</span><input type="number" data-pg="alto" value="${esc(p.alto || 720)}"></label>` : ''}</div></div>
      <div class="pb-fsec ab"><div class="pb-fsec-t"><span class="pb-chev">⌄</span>Fondo del lienzo</div><div class="pb-fsec-b">
        <label class="pb-fmt"><span>Color</span><input type="color" data-pg="fondo" value="${esc(p.fondo || '#FFFFFF')}"></label>
        <label class="pb-fmt"><span>Transparencia (%)</span><input type="number" data-pg="transpFondo" value="${esc(p.transpFondo || 0)}"></label></div></div>
      <div class="pb-fsec ab"><div class="pb-fsec-t"><span class="pb-chev">⌄</span>Fondo de pantalla</div><div class="pb-fsec-b">
        <label class="pb-fmt"><span>Color</span><input type="color" data-pg="tapiz" value="${esc(p.tapiz || '#EAEAEA')}"></label></div></div>
      <p class="pb-ayuda">Sin un objeto visual seleccionado, Formato muestra la página. Una página de <b>información sobre herramientas</b> aparece al pasar el mouse por un dato de otro gráfico (actívala en el Formato de ese gráfico → General → Información sobre herramientas).</p>`;
  }
  function pozosPagina() {
    const p = pagActual();
    return `<div class="pb-pozo-t">Obtener detalles</div><div class="pb-pozo-x" data-pozo-det>${(p.detalles || []).map((f, i) => `<div class="pb-chip"><span>${esc(I().nomCampo(f))}</span><button data-det-quitar="${i}" title="Quitar">✕</button></div>`).join('') || '<span class="pb-pozo-vacio">Agregar campos de obtención de detalles aquí</span>'}</div>
      <label class="pb-fmt pb-fmt-chk"><span>Mantener todos los filtros</span><input type="checkbox" class="pb-switch" data-det-mantener ${p.mantenerFiltros !== false ? 'checked' : ''}></label>
      <p class="pb-ayuda">Arrastra un campo (por ejemplo, País) para que esta página sea de <b>Obtener detalles</b>: en otras páginas, clic derecho en un dato de ese campo → Obtener detalles te trae aquí filtrado por ese valor.</p>`;
  }
  function enlazarPaneles(pan, v) {
    const s = S();
    pan.querySelectorAll('[data-cerrar-x]').forEach((b) => b.addEventListener('click', () => { s.panelesExtra[b.dataset.cerrarX] = false; I().guardar(true); I().pintar(); }));
    // marcadores
    pan.querySelectorAll('[data-mk]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.mk === 'agregar') { s.marcadores = s.marcadores || []; const m = { id: 'm' + Date.now().toString(36), nombre: `Marcador ${s.marcadores.length + 1}`, estado: capturar(), op: { datos: true, visual: true, pagina: true } }; s.marcadores.push(m); s.marcadorSel = m.id; I().guardar(); I().renderPaneles(); toast('Marcador agregado: guarda la página, los filtros, las segmentaciones y qué está visible.'); }
      else verMarcadores(0);
    }));
    pan.querySelectorAll('[data-mk-ir]').forEach((x) => x.addEventListener('click', (e) => { if (e.target.closest('[data-mk-mas]')) return; aplicarMarcador(s.marcadores.find((m) => m.id === x.dataset.mkIr)); }));
    pan.querySelectorAll('[data-mk-mas]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation(); const m = s.marcadores.find((x) => x.id === b.dataset.mkMas); const o = m.op || (m.op = { datos: true, visual: true, pagina: true });
      menuBajo(b, [{ k: 'actualizar', t: 'Actualizar', ico: 'arrow_sync' }, { k: 'renombrar', t: 'Cambiar nombre', ico: 'rename' }, { k: 'borrar', t: 'Eliminar', ico: 'delete' }, '-', { k: 'datos', t: 'Datos', check: o.datos }, { k: 'visual', t: 'Mostrar', check: o.visual }, { k: 'pagina', t: 'Página actual', check: o.pagina }], async (k) => {
        if (k === 'actualizar') { m.estado = capturar(); toast(`"${m.nombre}" ahora guarda el estado actual.`); }
        else if (k === 'renombrar') { const r = await I().pedir('Cambiar nombre del marcador', [{ n: 'Nombre', v: m.nombre }]); if (r && r[0].trim()) m.nombre = r[0].trim(); }
        else if (k === 'borrar') s.marcadores = s.marcadores.filter((x) => x !== m);
        else o[k] = !o[k];
        I().guardar(); I().renderPaneles();
      });
    }));
    // selección
    pan.querySelectorAll('[data-selv]').forEach((x) => x.addEventListener('click', (e) => { if (e.target.closest('[data-ojo]')) return; s.sel = x.dataset.selv; s.selMulti = []; I().guardar(true); I().render(); I().refrescarCinta(); }));
    pan.querySelectorAll('[data-ojo]').forEach((b) => b.addEventListener('click', () => { const v2 = I().vis(b.dataset.ojo); v2.oculto = !v2.oculto; I().guardar(); I().render(); }));
    pan.querySelectorAll('[data-sel-capa]').forEach((b) => b.addEventListener('click', () => s.sel && moverCapa(s.sel, b.dataset.selCapa)));
    pan.querySelectorAll('[data-sel-todo]').forEach((b) => b.addEventListener('click', () => { pagActual().visuales.forEach((x) => { x.oculto = b.dataset.selTodo === '0'; }); I().guardar(); I().render(); }));
    // sincronizar segmentaciones
    pan.querySelectorAll('[data-sync]').forEach((c) => c.addEventListener('change', () => { const v2 = I().vis(s.sel); const g = grupoDe(v2); const i = Number(c.dataset.sync); if (c.checked) { if (!g.paginas.includes(i)) g.paginas.push(i); } else g.paginas = g.paginas.filter((x) => x !== i); I().guardar(); I().renderPaneles(); }));
    pan.querySelectorAll('[data-vis-sync]').forEach((c) => c.addEventListener('change', () => {
      const v2 = I().vis(s.sel); const g = grupoDe(v2); const i = Number(c.dataset.visSync); const p = s.paginas[i];
      if (c.checked) { if (!g.paginas.includes(i)) g.paginas.push(i); if (!p.visuales.some((x) => x.grupoSync === v2.grupoSync)) p.visuales.push({ ...copia(v2), id: nuevoId(), slicerSel: copia(g.sel) }); }
      else { const otros = s.paginas.flatMap((pp) => pp.visuales).filter((x) => x.grupoSync === v2.grupoSync); if (otros.length <= 1) { toast('La segmentación tiene que quedar visible en al menos una página.'); c.checked = true; return; } p.visuales = p.visuales.filter((x) => x.grupoSync !== v2.grupoSync); if (i === s.pagina) s.sel = null; }
      I().guardar(); I().render();
    }));
    if (v) enlazarCond(pan, v);
    // análisis
    pan.querySelectorAll('[data-an]').forEach((x) => x.addEventListener(x.type === 'color' ? 'input' : 'change', () => { const [i, k] = x.dataset.an.split('.'); v.analisis[Number(i)][k] = x.type === 'checkbox' ? x.checked : x.value; I().guardar(); I().render(); }));
    pan.querySelectorAll('[data-an-borrar]').forEach((b) => b.addEventListener('click', () => { v.analisis.splice(Number(b.dataset.anBorrar), 1); I().guardar(); I().render(); }));
    const an = pan.querySelector('[data-an-nueva]'); if (an) an.addEventListener('change', () => { if (!an.value) return; v.analisis = v.analisis || []; v.analisis.push({ tipo: an.value, valor: an.value === 'percentil' ? 75 : '', color: ['#D64554', '#118DFF', '#1AAB40', '#E66C37', '#744EC2'][v.analisis.length % 5], estilo: 'Discontinua' }); I().guardar(); I().render(); });
    // formato de página
    pan.querySelectorAll('[data-pg]').forEach((x) => x.addEventListener(x.type === 'color' ? 'input' : 'change', () => {
      const p = pagActual(), k = x.dataset.pg, val = x.type === 'checkbox' ? x.checked : x.value;
      if (k === 'nombre' && !String(val).trim()) return;
      p[k] = val; if (k === 'tipo' && val === 'tooltip' && !p.tamano) p.tamano = 'Información sobre herramientas';
      if (k === 'tipo' && val === 'detalles') toast('Ahora agrega el campo de detalles: en la pestaña Crear objeto visual (sin nada seleccionado), arrástralo a "Obtener detalles".', 7000);
      I().guardar(); if (x.type === 'color') I().render(); else { I().render(); }
    }));
    // pozo de obtener detalles
    const pd = pan.querySelector('[data-pozo-det]');
    if (pd) {
      pd.addEventListener('dragover', (e) => { e.preventDefault(); pd.classList.add('sobre'); });
      pd.addEventListener('dragleave', () => pd.classList.remove('sobre'));
      pd.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation(); pd.classList.remove('sobre'); let f; try { f = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
        if (f.medida || f.jer) { toast('Para obtener detalles usa una columna (por ejemplo, País o Producto), no una medida.'); return; }
        const p = pagActual(); delete f._de; p.detalles = (p.detalles || []).filter((x) => !(x.t === f.t && x.c === f.c)).concat({ t: f.t, c: f.c }); p.tipo = 'detalles';
        if (!p.visuales.some((x) => x.tipo === 'boton' && fmt(x, 'accion', 'tipo') === 'Atrás')) p.visuales.push({ id: nuevoId(), tipo: 'boton', boton: 'Atrás', pozos: {}, filtros: [], formato: { accion: { tipo: 'Atrás', activa: true } }, x: 1, y: 1, w: 4, h: 7 });
        I().guardar(); I().render(); toast('Página de Obtener detalles lista: Power BI agregó un botón Atrás arriba a la izquierda.', 6000);
      });
    }
    pan.querySelectorAll('[data-det-quitar]').forEach((b) => b.addEventListener('click', () => { const p = pagActual(); p.detalles.splice(Number(b.dataset.detQuitar), 1); if (!p.detalles.length && p.tipo === 'detalles') p.tipo = 'normal'; I().guardar(); I().render(); }));
    const dm = pan.querySelector('[data-det-mantener]'); if (dm) dm.addEventListener('change', () => { pagActual().mantenerFiltros = dm.checked; I().guardar(); });
  }


  // ---------------------------------------------------------------- formato condicional (botón fx)
  function columnasValor(v) { let d = null; try { d = I().datosVisual(v); } catch (e) { d = null; } if (!d || !d.cab) return []; return d.cab.slice(d.ncat || 0).filter((c) => !/^Total/.test(c) || d.cab.indexOf(c) >= (d.ncat || 0)); }
  function panelCond(v) {
    const T = I().V().TIPOS[v.tipo]; if (!T) return '';
    const FC = v.formatoCond || {};
    if (T.g === 'tabla') {
      const cols = columnasValor(v); if (!cols.length) return '';
      const col = cols.includes(S().fcCol) ? S().fcCol : cols[0], fc = FC[col] || {};
      const fila = (k, n) => `<div class="pb-fc-f"><span>${n}</span><input type="checkbox" class="pb-switch" data-fc-on="${k}" ${fc[k] ? 'checked' : ''}><button class="pb-fx" data-fc-fx="${k}" title="Formato condicional (fx)" ${fc[k] ? '' : 'disabled'}><i>fx</i></button></div>`;
      return `<div class="pb-fsec ab"><div class="pb-fsec-t"><span class="pb-chev">⌄</span>Elementos de celda (formato condicional)</div><div class="pb-fsec-b">
        <label class="pb-fmt"><span>Aplicar la configuración a</span><select data-fc-col>${cols.map((c) => `<option ${c === col ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
        ${fila('fondo', 'Color de fondo')}${fila('fuente', 'Color de fuente')}${fila('barras', 'Barras de datos')}<div class="pb-fc-f"><span>Iconos</span><input type="checkbox" class="pb-switch" data-fc-on="iconos" ${fc.iconos ? 'checked' : ''}></div>
        <p class="pb-ayuda">El formato condicional pinta cada celda según su valor: verde si va bien, rojo si va mal. Prende una opción y toca <b>fx</b> para elegir colores o reglas.</p></div></div>`;
    }
    if (T.g === 'cart' && v.tipo !== 'cascada' && !T.linea) {
      const fc = FC.__datos;
      return `<div class="pb-fsec ab"><div class="pb-fsec-t"><span class="pb-chev">⌄</span>Colores según el valor</div><div class="pb-fsec-b"><div class="pb-fc-f"><span>Color de las barras (fx)</span><input type="checkbox" class="pb-switch" data-fc-on="__datos" ${fc ? 'checked' : ''}><button class="pb-fx" data-fc-fx="__datos" ${fc ? '' : 'disabled'}><i>fx</i></button></div><p class="pb-ayuda">Con una sola serie, cada barra toma un color del degradado o de las reglas según su valor.</p></div></div>`;
    }
    return '';
  }
  function dialogoFx(v, clave, col) {
    const FC = v.formatoCond = v.formatoCond || {};
    const obj = col ? (FC[col] = FC[col] || {}) : FC;
    const k = col ? clave : '__datos';
    const cur = obj[k] && obj[k] !== true ? obj[k] : (k === 'barras' ? { pos: '#118DFF', neg: '#D64554' } : { modo: 'degradado', min: '#F8696B', max: '#63BE7B' });
    const titulo = { fondo: 'Color de fondo', fuente: 'Color de fuente', barras: 'Barras de datos', __datos: 'Colores' }[k];
    if (k === 'barras') {
      const m = I().modal(`<div class="pb-m-cab">${esc(titulo)} - ${esc(col)}<button data-cerrar-modal>✕</button></div><div class="pb-form"><label>Barra positiva<input type="color" data-b="pos" value="${esc(cur.pos)}"></label><label>Barra negativa<input type="color" data-b="neg" value="${esc(cur.neg)}"></label><label><input type="checkbox" data-b="solo" ${cur.solo ? 'checked' : ''}> Mostrar solo la barra</label></div><div class="pb-m-pie"><span class="spacer"></span><button class="pb-btn pb-btn-am" data-ok>Aceptar</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`);
      m.querySelector('[data-ok]').addEventListener('click', () => { obj.barras = { pos: m.querySelector('[data-b="pos"]').value, neg: m.querySelector('[data-b="neg"]').value, solo: m.querySelector('[data-b="solo"]').checked }; m.parentElement.remove(); I().guardar(); I().render(); });
      return;
    }
    const reglas = (cur.reglas && cur.reglas.length ? cur.reglas : [{ op: '>=', val: 0, color: '#63BE7B' }]);
    const filaR = (r, i) => `<div class="pb-fx-r" data-r="${i}">Si el valor <select data-ro>${['>', '>=', '<', '<=', '=', '<>'].map((o) => `<option ${o === r.op ? 'selected' : ''}>${o}</option>`).join('')}</select><input type="number" data-rv value="${esc(r.val)}"> entonces <input type="color" data-rc value="${esc(r.color)}"><button data-rq title="Quitar">✕</button></div>`;
    const m = I().modal(`<div class="pb-m-cab">${esc(titulo)}${col ? ` - ${esc(col)}` : ''}<button data-cerrar-modal>✕</button></div><div class="pb-form pb-fx-d">
      <label>Estilo de formato<select data-modo><option value="degradado" ${cur.modo !== 'reglas' ? 'selected' : ''}>Degradado</option><option value="reglas" ${cur.modo === 'reglas' ? 'selected' : ''}>Reglas</option></select></label>
      <div data-grad ${cur.modo === 'reglas' ? 'hidden' : ''}><div class="pb-fx-g"><label>Valor más bajo<input type="color" data-gmin value="${esc(cur.min || '#F8696B')}"></label><label><input type="checkbox" data-gmed-on ${cur.medio ? 'checked' : ''}> Centro<input type="color" data-gmed value="${esc(cur.medio || '#FFEB84')}"></label><label>Valor más alto<input type="color" data-gmax value="${esc(cur.max || '#63BE7B')}"></label></div>
        <div class="pb-fx-g"><label>Desde (vacío = mínimo)<input type="number" data-gdesde value="${esc(cur.desde ?? '')}"></label><label>Hasta (vacío = máximo)<input type="number" data-ghasta value="${esc(cur.hasta ?? '')}"></label></div></div>
      <div data-reglas ${cur.modo === 'reglas' ? '' : 'hidden'}>${reglas.map(filaR).join('')}<button class="pb-btn" data-rn>+ Nueva regla</button><p class="pb-ayuda">Se usa la primera regla que se cumple.</p></div></div>
      <div class="pb-m-pie"><span class="spacer"></span><button class="pb-btn pb-btn-am" data-ok>Aceptar</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`);
    const modo = m.querySelector('[data-modo]'); modo.addEventListener('change', () => { m.querySelector('[data-grad]').hidden = modo.value === 'reglas'; m.querySelector('[data-reglas]').hidden = modo.value !== 'reglas'; });
    const cont = m.querySelector('[data-reglas]');
    cont.addEventListener('click', (e) => { if (e.target.closest('[data-rq]')) e.target.closest('[data-r]').remove(); if (e.target.closest('[data-rn]')) e.target.closest('[data-rn]').insertAdjacentHTML('beforebegin', filaR({ op: '<', val: 0, color: '#F8696B' }, Date.now())); });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      let r;
      if (modo.value === 'reglas') r = { modo: 'reglas', reglas: [...cont.querySelectorAll('[data-r]')].map((x) => ({ op: x.querySelector('[data-ro]').value, val: Number(x.querySelector('[data-rv]').value), color: x.querySelector('[data-rc]').value })) };
      else r = { modo: 'degradado', min: m.querySelector('[data-gmin]').value, max: m.querySelector('[data-gmax]').value, medio: m.querySelector('[data-gmed-on]').checked ? m.querySelector('[data-gmed]').value : '', desde: m.querySelector('[data-gdesde]').value, hasta: m.querySelector('[data-ghasta]').value };
      obj[k] = r; m.parentElement.remove(); I().guardar(); I().render();
    });
  }
  function enlazarCond(pan, v) {
    const s = S();
    const sc = pan.querySelector('[data-fc-col]'); if (sc) sc.addEventListener('change', () => { s.fcCol = sc.value; I().renderPaneles(); });
    const colAct = () => (sc ? sc.value : null);
    pan.querySelectorAll('[data-fc-on]').forEach((c) => c.addEventListener('change', () => {
      const k = c.dataset.fcOn; v.formatoCond = v.formatoCond || {};
      if (k === '__datos') { if (c.checked) { v.formatoCond.__datos = { modo: 'degradado', min: '#F8696B', max: '#63BE7B' }; } else delete v.formatoCond.__datos; }
      else { const col = colAct(); const o = v.formatoCond[col] = v.formatoCond[col] || {}; if (c.checked) o[k] = k === 'iconos' ? true : k === 'barras' ? { pos: '#118DFF', neg: '#D64554' } : { modo: 'degradado', min: k === 'fuente' ? '#D64554' : '#F8696B', max: k === 'fuente' ? '#1AAB40' : '#63BE7B' }; else delete o[k]; }
      I().guardar(); I().render();
    }));
    pan.querySelectorAll('[data-fc-fx]').forEach((b) => b.addEventListener('click', () => dialogoFx(v, b.dataset.fcFx, b.dataset.fcFx === '__datos' ? null : colAct())));
  }



  // ---------------------------------------------------------------- parámetros (Modelado → Nuevo parámetro)
  const cintaModelado = () => GRUPO('Parámetros', BOTON('x-parametro', 'options', 'Nuevo<br>parámetro ⌄'));
  async function parametroNumerico() {
    const r = await I().pedir('Parámetros: rango numérico (¿y si…?)', [{ n: 'Nombre', v: 'Descuento' }, { n: 'Tipo de datos', opts: [['dec', 'Número decimal'], ['int', 'Número entero']] }, { n: 'Mínimo', v: '0' }, { n: 'Máximo', v: '0.5' }, { n: 'Incremento', v: '0.05' }, { n: 'Predeterminado', v: '0.1' }, { n: 'Agregar segmentación a esta página', opts: [['si', 'Sí'], ['no', 'No']] }]);
    if (!r) return; const [nombre, , mn, mx, inc, def, seg] = r; const n = nombre.trim();
    if (!n || S().tablas[n]) { toast('Elige un nombre que no exista en el modelo.'); return; }
    if ([mn, mx, inc].some((x) => x === '' || isNaN(Number(x))) || Number(inc) <= 0 || Number(mx) < Number(mn)) { toast('Mínimo, máximo e incremento tienen que ser números (incremento mayor que 0).'); return; }
    if ((Number(mx) - Number(mn)) / Number(inc) > 1000) { toast('Son más de 1000 valores: aumenta el incremento.'); return; }
    const ref = /^[A-Za-z_]\w*$/.test(n) ? n : `'${n}'`;
    const s = S();
    s.tablas[n] = { fuente: { tipo: 'dax', expr: `SELECTCOLUMNS(GENERATESERIES(${mn}, ${mx}, ${inc}), "${n}", [Value])` }, pasos: [], calc: [], resumen: {} };
    s.medidas.push({ nombre: `${n} Valor`, expr: `SELECTEDVALUE(${ref}[${n}], ${def === '' ? mn : def})`, tabla: n });
    I().cambioModelo(); I().construir();
    if (!I().meta(n).length) { delete s.tablas[n]; s.medidas = s.medidas.filter((m) => m.nombre !== `${n} Valor`); toast('No se pudo crear la tabla del parámetro.'); return; }
    if (seg === 'si') { s.vista = 'informe'; I().agregarVisual('segmentacion', { pozos: { x: [{ t: n, c: n }] }, formato: { segmentacion: { estilo: 'Lista desplegable', unica: true } }, w: 18, h: 12 }); }
    I().guardar(); I().render();
    toast(`Listo: la tabla ${n} (GENERATESERIES) y la medida [${n} Valor] (SELECTEDVALUE). Úsala en otra medida, por ejemplo: Ventas con descuento = SUM(...) * (1 - [${n} Valor]).`, 9000);
  }
  function parametroCampos() {
    const s = S(); const cols = I().tablas().flatMap((t) => I().meta(t).map((c) => ({ k: `c|${t}|${c.n}`, n: `${t}[${c.n}]`, campo: { t, c: c.n } }))), meds = s.medidas.map((m) => ({ k: `m|${m.nombre}`, n: `[${m.nombre}]`, campo: { medida: m.nombre } }));
    const m = I().modal(`<div class="pb-m-cab">Parámetros: campos<button data-cerrar-modal>✕</button></div><div class="pb-form"><label>Nombre<input data-pn value="Parámetro"></label>
      <p class="pb-ayuda">Elige los campos entre los que la persona va a poder cambiar (por ejemplo, ver las ventas por País, por Categoría o por Canal) con una segmentación. Todos tienen que ser columnas, o todos medidas.</p>
      <div class="pb-pc-lista">${[...cols, ...meds].map((x) => `<label><input type="checkbox" value="${esc(x.k)}"> ${esc(x.n)}</label>`).join('')}</div>
      <label><input type="checkbox" data-pseg checked> Agregar segmentación a esta página</label></div><div class="pb-m-pie"><span class="spacer"></span><button class="pb-btn pb-btn-am" data-ok>Crear</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`);
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const n = m.querySelector('[data-pn]').value.trim(); const elegidos = [...m.querySelectorAll('.pb-pc-lista input:checked')].map((x) => [...cols, ...meds].find((y) => y.k === x.value));
      if (!n || s.tablas[n]) { toast('Elige un nombre que no exista en el modelo.'); return; }
      if (elegidos.length < 2) { toast('Elige al menos dos campos.'); return; }
      if (new Set(elegidos.map((x) => !!x.campo.medida)).size > 1) { toast('Mezclaste columnas y medidas: elige solo columnas o solo medidas.'); return; }
      const clave = 'p' + Date.now().toString(36); I().DATOS()[clave] = { filas: [[n, `${n} Orden`], ...elegidos.map((x, i) => [x.campo.medida ? x.campo.medida : x.campo.c, String(i)])] }; I().guardarDatos();
      const t = I().registrarTabla(n, { tipo: 'archivo', clave, archivo: 'parámetro de campos' }, [{ tipo: 'origen', m: `= {("${elegidos.map((x) => x.n).join('", ...), ("')}", ...)}` }, { tipo: 'encabezados' }]);
      s.parametros = s.parametros || {}; s.parametros[t] = { col: n, items: elegidos.map((x) => ({ nombre: x.campo.medida ? x.campo.medida : x.campo.c, campo: x.campo })) };
      m.parentElement.remove();
      if (m.querySelector('[data-pseg]').checked) { s.vista = 'informe'; I().agregarVisual('segmentacion', { pozos: { x: [{ t, c: n }] }, formato: { segmentacion: { estilo: 'Mosaico', unica: true } }, w: 30, h: 9 }); }
      I().guardar(); I().render();
      toast(`Parámetro de campos "${t}" creado. Ponlo en el eje de un gráfico (desde el panel Datos) y cambia el campo con la segmentación.`, 8000);
    });
  }
  // cambia el campo del parámetro por el campo elegido en su segmentación (o el primero)
  function resolverPozos(v) {
    const s = S(); const PR = s.parametros; if (!PR || v.tipo === 'segmentacion') return v.pozos;
    let cambia = false; const out = {};
    for (const [k, lista] of Object.entries(v.pozos || {})) {
      out[k] = [];
      for (const f of lista) {
        const p = !f.medida && PR[f.t]; if (!p || f.c !== p.col) { out[k].push(f); continue; }
        cambia = true;
        let sel = [];
        for (const o of I().pag().visuales) if (o.tipo === 'segmentacion' && o.pozos.x && o.pozos.x[0] && o.pozos.x[0].t === f.t && (o.slicerSel || []).length) sel = o.slicerSel;
        if (!sel.length && s.sincro) for (const g of Object.values(s.sincro)) if (g.campo && g.campo.t === f.t && (g.sel || []).length) sel = g.sel;
        const items = (sel.length ? p.items.filter((it) => sel.map(String).includes(String(it.nombre))) : p.items.slice(0, 1));
        for (const it of items) { const c = { ...it.campo }; if (it.campo.medida) out[k].push(c); else { if (f.agg && f.agg !== 'none') c.agg = f.agg; out[k].push(c); } }
      }
    }
    return cambia ? out : v.pozos;
  }

  // ---------------------------------------------------------------- menú contextual de un campo (panel Datos y vista de modelo)
  function menuCampo(f, e) {
    const s = S(); s.jerarquias = s.jerarquias || {};
    if (f.jer) {
      const lista = s.jerarquias[f.jer.t] || [], h = lista.find((x) => x.nombre === f.jer.nombre); if (!h) return;
      return menu(e.clientX, e.clientY, [{ k: 'ren', t: 'Cambiar nombre', ico: 'rename' }, { k: 'borrar', t: 'Eliminar jerarquía', ico: 'delete' }, { k: 'props', t: 'Niveles y propiedades', ico: 'settings' }], async (k) => {
        if (k === 'ren') { const r = await I().pedir('Cambiar nombre de la jerarquía', [{ n: 'Nombre', v: h.nombre }]); if (r && r[0].trim()) h.nombre = r[0].trim(); }
        else if (k === 'borrar') lista.splice(lista.indexOf(h), 1);
        else { s.vista = 'modelo'; s.selModelo = { tipo: 'tabla', t: f.jer.t }; }
        I().cambioModelo(); I().guardar(); I().render();
      });
    }
    if (f.medida) {
      const m = s.medidas.find((x) => x.nombre === f.medida); if (!m) return; const k0 = 'm:' + m.nombre, oc = I().propsDe(k0).oculto;
      return menu(e.clientX, e.clientY, [{ k: 'ren', t: 'Cambiar nombre', ico: 'rename' }, { k: 'editar', t: 'Editar la fórmula', ico: 'edit' }, { k: 'borrar', t: 'Eliminar del modelo', ico: 'delete' }, { k: 'ocultar', t: oc ? 'Mostrar en la vista de informe' : 'Ocultar en la vista de informe', ico: oc ? 'eye' : 'eye_off' }, '-', { k: 'props', t: 'Propiedades', ico: 'settings' }, { k: 'herr', t: 'Herramientas de medición', ico: 'calculator' }], async (k) => {
        if (k === 'ren') { const r = await I().pedir('Cambiar nombre de la medida', [{ n: 'Nombre', v: m.nombre }]); if (r && r[0].trim() && !s.medidas.some((x) => x !== m && x.nombre.toLowerCase() === r[0].trim().toLowerCase())) I().renombrarMedida(m, r[0].trim()); return; }
        if (k === 'editar') return I().barraFormula({ tipo: 'medida', obj: m });
        if (k === 'borrar') { if (!confirm(`¿Eliminar la medida [${m.nombre}]?`)) return; s.medidas = s.medidas.filter((x) => x !== m); for (const v of I().todos()) for (const kk in v.pozos) v.pozos[kk] = v.pozos[kk].filter((x) => x.medida !== m.nombre); }
        else if (k === 'ocultar') I().setProp(k0, 'oculto', !oc);
        else if (k === 'props') { s.vista = 'modelo'; s.selModelo = { tipo: 'medida', n: m.nombre }; }
        else if (k === 'herr') return I().menuCampoViejo(f);
        I().cambioModelo(); I().guardar(); I().render();
      });
    }
    const t = f.t, c = f.c, lista = s.jerarquias[t] || [], k0 = I().propKey(t, c), oc = I().propsDe(k0).oculto;
    const items = [{ k: 'jer', t: 'Crear jerarquía', ico: 'text_bullet_list_tree' }];
    const destinos = lista.filter((h) => !h.niveles.includes(c));
    if (destinos.length) { items.push({ sub: 'Agregar a jerarquía' }); destinos.forEach((h) => items.push({ k: 'add:' + h.nombre, t: h.nombre, ico: 'text_bullet_list_tree' })); }
    items.push('-', { k: 'ren', t: 'Cambiar nombre', ico: 'rename' }, { k: 'ocultar', t: oc ? 'Mostrar en la vista de informe' : 'Ocultar en la vista de informe', ico: oc ? 'eye' : 'eye_off' }, '-', { k: 'medida', t: 'Nueva medida', ico: 'calculator' }, { k: 'columna', t: 'Nueva columna', ico: 'table_column_top_bottom' }, '-', { k: 'props', t: 'Propiedades', ico: 'settings' }, { k: 'herr', t: 'Herramientas de columnas', ico: 'table_edit' });
    menu(e.clientX, e.clientY, items, async (k) => {
      if (k === 'jer') { let n = `${c} Jerarquía`, i = 2; while (lista.some((h) => h.nombre === n)) n = `${c} Jerarquía ${i++}`; (s.jerarquias[t] = lista).push({ nombre: n, niveles: [c] }); s.tablasAbiertas = [...new Set([...(s.tablasAbiertas || []), t])]; toast(`Se creó "${n}". Agrega más niveles con clic derecho en otra columna → Agregar a jerarquía.`, 6000); }
      else if (k.startsWith('add:')) { const h = lista.find((x) => x.nombre === k.slice(4)); h.niveles.push(c); toast(`${c} es ahora el nivel ${h.niveles.length} de ${h.nombre}.`); }
      else if (k === 'ren') { const r = await I().pedir('Cambiar nombre de la columna', [{ n: 'Nombre', v: c }]); if (r && r[0].trim()) I().renombrarColumna(t, c, r[0].trim()); I().render(); return; }
      else if (k === 'ocultar') I().setProp(k0, 'oculto', !oc);
      else if (k === 'medida') return I().barraFormula({ tipo: 'medida', tabla: t });
      else if (k === 'columna') return I().barraFormula({ tipo: 'columna', tabla: t });
      else if (k === 'props') { s.vista = 'modelo'; s.selModelo = { tipo: 'col', t, c }; }
      else if (k === 'herr') return I().menuCampoViejo(f);
      I().cambioModelo(); I().guardar(); I().render();
    });
  }

  // ---------------------------------------------------------------- después de dibujar el lienzo
  function despuesRender(lienzo) {
    const s = S();
    if (s.editInter && s.sel) for (const el of lienzo.querySelectorAll('.pb-v')) {
      if (el.dataset.id === s.sel) continue; const v = I().vis(el.dataset.id); if (!v || DIBUJA.has(v.tipo) || v.tipo === 'texto') continue;
      const t = interaccion(s.sel, v.id);
      el.insertAdjacentHTML('beforeend', `<div class="pb-inter">${[['filtro', 'filter', 'Filtrar'], ['resaltar', 'data_bar_vertical', 'Resaltar'], ['ninguno', 'dismiss', 'Ninguno']].map(([k, ic, n]) => `<button data-inter="${k}" class="${t === k ? 'on' : ''}" title="${n}">${fl(ic)}</button>`).join('')}</div>`);
    }
    const p = I().pag(); const idx = s.paginas.indexOf(p);
    if (s.drill && s.drill.pagina === idx) lienzo.insertAdjacentHTML('beforeend', `<div class="pb-det-aviso">${fl('arrow_step_in')} Detalles de <b>${esc(s.drill.resumen)}</b></div>`);
  }

  window.PBIInforme = {
    interaccion, cambiarInteraccion, filtrosExtra, estiloPagina, botonesDrill, drill, drillValor, despuesRender,
    dibuja: (v) => DIBUJA.has(v.tipo) || !!(window.PBIIa && window.PBIIa.dibuja(v)), dibujar: (v, c, el) => (window.PBIIa && window.PBIIa.dibuja(v) ? window.PBIIa.dibujar(v, c, el) : dibujar(v, c, el)),
    clicVisual, enlazarLienzo, slicerCambio, tecla, cintaInsertar, cintaVista, cintaFormato, accion,
    tieneAnalisis, panelAnalisis, panelPagina, panelCond, menuCampo, cintaModelado, resolverPozos, pozosPagina, panelesExtra, enlazarPaneles, menuPagina, irPagina, destinos, paginasTooltip,
    _: { aplicarMarcador, capturar, obtenerDetalles, accionBoton, alinear, moverCapa, copiar, pegar },
  };
})();
