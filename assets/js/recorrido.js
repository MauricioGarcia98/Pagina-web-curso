/* Recorridos animados: una historia por pasos en la que un "paquete" de datos viaja por una línea
 * de estaciones (app, API, base, lago, warehouse, tablero…) y en cada paso se ve el dato real en ese
 * momento (un JSON, una fila, un archivo, una consulta). El build convierte cada bloque ```recorrido
 * en <div class="recorrido" data-spec="{…}">; este archivo lo dibuja y lo anima.
 * Controles: anterior / reproducir / siguiente, clic en una estación o en la barra de progreso,
 * y las flechas del teclado cuando el recorrido tiene el foco. Respeta prefers-reduced-motion. */
(function () {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MS_PASO = 7000;
  const sinMovimiento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ETIQUETA = { json: 'JSON', sql: 'SQL', csv: 'CSV', tabla: 'Tabla', texto: 'Texto', python: 'Python', bash: 'Terminal', yaml: 'YAML', log: 'Log' };

  // CSV simple (con comillas) -> filas
  function filasCsv(txt) {
    return txt.split('\n').filter((l) => l.trim()).map((l) => {
      const out = []; let cur = '', q = false;
      for (const ch of l) {
        if (ch === '"') { q = !q; continue; }
        if (ch === ',' && !q) { out.push(cur); cur = ''; continue; }
        cur += ch;
      }
      out.push(cur);
      return out;
    });
  }

  function htmlDato(paso) {
    if (!paso.lang || !paso.dato) return '';
    if (paso.lang === 'tabla') {
      const [cab, ...filas] = filasCsv(paso.dato);
      const num = (v) => /^-?\d+([.,]\d+)?$/.test(v.trim());
      return `<div class="rc-tabla-wrap"><table class="result rc-tabla"><thead><tr>${cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((f, i) => `<tr style="--i:${i}">${f.map((v) => `<td class="${num(v) ? 'num' : ''}">${v === '' ? '<span class="rc-null">NULL</span>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    const lang = { texto: 'plaintext', log: 'plaintext', csv: 'plaintext' }[paso.lang] || paso.lang;
    let code = esc(paso.dato);
    if (window.hljs && window.hljs.getLanguage(lang)) { try { code = window.hljs.highlight(paso.dato, { language: lang, ignoreIllegals: true }).value; } catch (e) { /* sin resaltado */ } }
    return `<pre class="rc-code"><code class="hljs">${code}</code></pre>`;
  }

  function montar(div) {
    if (div.dataset.listo) return;
    let spec;
    try { spec = JSON.parse(div.dataset.spec); } catch (e) { return; }
    div.dataset.listo = '1';
    const D = window.Diagramas;
    const icono = (n) => (n && D && D.iconoSVG ? D.iconoSVG(n) : '');
    const idx = Object.fromEntries(spec.estaciones.map((e, i) => [e.id, i]));
    div.tabIndex = 0;
    div.setAttribute('role', 'region');
    div.setAttribute('aria-label', 'Recorrido animado: ' + (spec.titulo || 'paso a paso'));
    div.innerHTML = `
      <div class="rc-head">
        <div class="rc-titulo">🎬 ${esc(spec.titulo || 'Recorrido')}</div>
        <div class="rc-cont" aria-live="polite"></div>
      </div>
      <div class="rc-via">
        <div class="rc-linea"><div class="rc-linea-ok"></div></div>
        ${spec.estaciones.map((e, i) => `<button class="rc-est" data-e="${i}" title="${esc(e.label)}"><span class="rc-ic">${icono(e.icono) || '●'}</span><span class="rc-lbl">${esc(e.label)}</span></button>`).join('')}
        <div class="rc-paquete" aria-hidden="true"></div>
      </div>
      <div class="rc-cuerpo">
        <div class="rc-texto"></div>
        <div class="rc-dato"></div>
      </div>
      <div class="rc-ctrl">
        <button class="btn btn-sm" data-a="prev" title="Paso anterior (←)">◀ Anterior</button>
        <button class="btn btn-sm btn-primary" data-a="play" title="Reproducir">▶ Reproducir</button>
        <button class="btn btn-sm" data-a="next" title="Paso siguiente (→)">Siguiente ▶</button>
        <div class="rc-barra">${spec.pasos.map((_, i) => `<button class="rc-seg" data-p="${i}" aria-label="Ir al paso ${i + 1}"><i></i></button>`).join('')}</div>
      </div>`;
    const $ = (s) => div.querySelector(s);
    const via = $('.rc-via'), paquete = $('.rc-paquete'), lineaOk = $('.rc-linea-ok');
    const ests = [...div.querySelectorAll('.rc-est')], segs = [...div.querySelectorAll('.rc-seg')];
    let actual = -1, timer = null;

    function centro(i) {
      const b = ests[i].querySelector('.rc-ic').getBoundingClientRect(), v = via.getBoundingClientRect();
      return { x: b.left - v.left + b.width / 2 + via.scrollLeft, y: b.top - v.top + b.height / 2 };
    }
    function moverPaquete(i, animar) {
      const c = centro(i);
      paquete.style.transition = animar && !sinMovimiento() ? '' : 'none';
      paquete.style.transform = `translate(${c.x}px, ${c.y}px)`;
      const c0 = centro(0);
      lineaOk.style.width = Math.max(0, c.x - c0.x) + 'px';
      // que la estación activa quede a la vista en pantallas chicas
      const e = ests[i];
      if (e.offsetLeft < via.scrollLeft || e.offsetLeft + e.offsetWidth > via.scrollLeft + via.clientWidth) via.scrollTo({ left: e.offsetLeft - via.clientWidth / 2 + e.offsetWidth / 2, behavior: sinMovimiento() ? 'auto' : 'smooth' });
    }
    function ir(n, animar = true) {
      n = Math.max(0, Math.min(spec.pasos.length - 1, n));
      const p = spec.pasos[n], e = idx[p.estacion];
      const anterior = actual;
      actual = n;
      $('.rc-cont').textContent = `Paso ${n + 1} de ${spec.pasos.length}`;
      ests.forEach((b, i) => { b.classList.toggle('activa', i === e); b.classList.toggle('pasada', i < e); });
      segs.forEach((s, i) => { s.classList.toggle('hecho', i < n); s.classList.toggle('actual', i === n); s.style.setProperty('--dur', MS_PASO + 'ms'); });
      const est = spec.estaciones[e];
      const texto = $('.rc-texto'), dato = $('.rc-dato');
      texto.innerHTML = `<div class="rc-donde"><span class="rc-ic-chico">${icono(est.icono)}</span>${esc(est.label)}</div><h4>${esc(p.titulo)}</h4>${p.texto}`;
      dato.innerHTML = p.lang ? `<div class="rc-dato-cab"><span class="rc-badge">${ETIQUETA[p.lang]}</span><span class="muted small">el dato en este momento</span></div>${htmlDato(p)}` : '';
      dato.classList.toggle('vacio', !p.lang);
      // reiniciar la animación de entrada
      for (const el of [texto, dato]) { el.classList.remove('entra'); void el.offsetWidth; if (animar && !sinMovimiento() && anterior !== -1) el.classList.add('entra'); }
      moverPaquete(e, animar && anterior !== -1);
      $('[data-a="prev"]').disabled = n === 0;
      $('[data-a="next"]').disabled = n === spec.pasos.length - 1;
    }
    function play() {
      if (actual >= spec.pasos.length - 1) ir(0, false);
      div.classList.add('reproduciendo');
      $('[data-a="play"]').textContent = '⏸ Pausa';
      clearInterval(timer);
      timer = setInterval(() => {
        if (!document.body.contains(div)) return clearInterval(timer);
        if (actual >= spec.pasos.length - 1) return pausa();
        ir(actual + 1);
      }, MS_PASO);
    }
    function pausa() {
      clearInterval(timer); timer = null;
      div.classList.remove('reproduciendo');
      $('[data-a="play"]').textContent = actual >= spec.pasos.length - 1 ? '↺ Ver de nuevo' : '▶ Reproducir';
    }
    div.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-a]')?.dataset.a;
      const seg = ev.target.closest('[data-p]'), est = ev.target.closest('[data-e]');
      if (a === 'play') return timer ? pausa() : play();
      if (a === 'prev') { pausa(); ir(actual - 1); }
      if (a === 'next') { pausa(); ir(actual + 1); }
      if (seg) { pausa(); ir(Number(seg.dataset.p)); }
      if (est) { pausa(); const i = spec.pasos.findIndex((p) => idx[p.estacion] === Number(est.dataset.e)); if (i >= 0) ir(i); }
    });
    div.addEventListener('keydown', (ev) => {
      if (ev.target.closest('input, textarea')) return;
      if (ev.key === 'ArrowRight') { ev.preventDefault(); pausa(); ir(actual + 1); }
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); pausa(); ir(actual - 1); }
      if (ev.key === ' ' && ev.target === div) { ev.preventDefault(); timer ? pausa() : play(); }
    });
    let tRes = null;
    window.addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(() => { if (document.body.contains(div)) moverPaquete(idx[spec.pasos[actual].estacion], false); }, 120); });
    requestAnimationFrame(() => ir(0, false));
  }

  window.Recorrido = { montar: (root) => (root || document).querySelectorAll('div.recorrido').forEach(montar) };
})();
