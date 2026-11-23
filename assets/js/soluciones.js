/* Soluciones de referencia bloqueadas: en las guías de los proyectos, el código resuelto de cada paso no se ve hasta que
 * tu entrega de ese paso pasa la revisión (el mismo chequeo que usa el líder técnico en Jira y el panel "Revisar mi
 * entrega"). Así primero lo construyes tú y después comparas, como en un code review.
 *
 * En el Markdown:  :::solucion CC:MRR Título   →  CC es la clave del proyecto en Jira y MRR el grupo del chequeo.
 * Varios grupos se separan con +  (CC:MRR+Cliente 360 → se desbloquea cuando pasan los dos).
 * Si la historia correspondiente ya está Done en Jira (la aprobó el revisor), también se desbloquea.
 */
(function () {
  'use strict';
  const ST = () => (window.__almacen ? window.__almacen() : null);
  const hechos = () => { const S = ST(); if (!S) return {}; S.data.solucionesDesbloqueadas = S.data.solucionesDesbloqueadas || {}; return S.data.solucionesDesbloqueadas; };
  const guardar = () => { const S = ST(); try { if (S) (S.saveSoon ? S.saveSoon() : S.save()); } catch (e) { /* sin almacenamiento */ } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function chequeosDe(clave) { const g = (window.__tableros || []).find((x) => x.clave === clave); if (!g) return null; try { return g.chequeos() || []; } catch (e) { return []; } }
  async function revisar(clave, grupos) {
    if (window.__discoListo) await window.__discoListo(); // la terminal y las nubes guardadas, ya rehidratadas
    const C = chequeosDe(clave); if (!C) return { ok: false, notas: ['El proyecto todavía no cargó: recarga la página.'] };
    const notas = []; let ok = true;
    for (const grupo of grupos) {
      const del = C.filter((c) => c[0] === grupo); if (!del.length) { notas.push(`No encuentro el chequeo "${grupo}".`); ok = false; continue; }
      for (const [, txt, f] of del) { let r; try { r = await f(); } catch (e) { r = String(e.message || e); } if (r !== true) { ok = false; notas.push(`${txt}: ${r}`); } }
    }
    return { ok, notas };
  }
  function abrir(el, k) { el.classList.add('solucion-abierta'); el.classList.remove('solucion-cerrada'); const t = el.querySelector('.callout-title'); if (t) t.textContent = t.textContent.replace('🔒', '🔓'); const b = el.querySelector('.solucion-candado'); if (b) b.remove(); void k; }
  function montar(root) {
    (root || document).querySelectorAll('[data-solucion]').forEach((el) => {
      if (el.dataset.montada) return; el.dataset.montada = '1';
      const [clave, gs] = el.dataset.solucion.split(':'); const grupos = (gs || '').split('+').map((x) => x.trim()).filter(Boolean); const k = el.dataset.solucion;
      if (hechos()[k]) return abrir(el, k);
      el.classList.add('solucion-cerrada');
      const candado = document.createElement('div'); candado.className = 'solucion-candado';
      candado.innerHTML = `<p>🔒 <b>Primero constrúyelo tú.</b> La solución de referencia de este paso se desbloquea cuando tu entrega pasa la revisión de <b>${esc(grupos.join(' y '))}</b> (el mismo chequeo que hace el líder técnico en Jira).</p><button type="button" class="btn">Revisar mi entrega y desbloquear</button><ol class="solucion-notas small"></ol>`;
      el.querySelector('.callout-title').after(candado);
      candado.querySelector('button').onclick = async (ev) => {
        const b = ev.currentTarget; b.disabled = true; b.textContent = 'Revisando…'; const ol = candado.querySelector('ol'); ol.innerHTML = '';
        const r = await revisar(clave, grupos);
        if (r.ok) { hechos()[k] = Date.now(); guardar(); document.querySelectorAll('[data-solucion]').forEach((x) => { if (x.dataset.solucion === k) abrir(x, k); }); return; } // todos los bloques del mismo chequeo
        ol.innerHTML = r.notas.map((n) => `<li>${esc(n)}</li>`).join(''); b.disabled = false; b.textContent = 'Revisar otra vez';
      };
    });
  }
  if (!document.getElementById('solucionesCss')) { const s = document.createElement('style'); s.id = 'solucionesCss'; s.textContent = '.solucion-cerrada > :not(.callout-title):not(.solucion-candado){display:none!important}.solucion-candado{margin:6px 0 2px}.solucion-candado .btn{margin:4px 0}.solucion-notas li{color:var(--danger,#b42318);margin:2px 0}'; document.head.append(s); }
  window.Soluciones = { montar, revisar };
})();
