/* Tablero de tickets de los proyectos "como en un trabajo" (Pedalia, Mercado Vecino, …).
 *
 * TableroTickets.panel(el, cfg) dibuja la cola de trabajo de un equipo de datos: requerimientos, incidentes y
 * preguntas de negocio que aparecen con los días (según cuándo empezó el estudiante), con su hilo de aclaraciones,
 * criterios de aceptación y una revisión automática.
 *
 * cfg = { titulo, tickets, contexto() → { I, H, t }, datos() → objeto guardado (usa .tickets), guardar(), hora(T) }
 * ticket = { id, tipo: 'requerimiento'|'incidente'|'pregunta', de, cuando(I, H), titulo, texto | texto(T, H),
 *            comentarios?, criterios?, check?() → true | 'pista', respuesta?: { tipo: 'numero'|'texto', unidad?, ayuda?, verificar(v, T, H) } }
 */
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = { requerimiento: '📋', incidente: '🔥', pregunta: '❓' };
  const numero = (v) => Number(String(v).replace(/[%$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  function panel(el, cfg) {
    const pintar = () => {
      const D = cfg.datos(); if (!D) { el.textContent = 'El almacenamiento del navegador no está disponible.'; return; }
      D.tickets = D.tickets || {}; const { I, H, t } = cfg.contexto();
      const visibles = cfg.tickets.map((k) => ({ ...k, T: k.cuando(I, H) })).filter((k) => k.T <= t).sort((a, b) => a.T - b.T);
      const futuros = cfg.tickets.length - visibles.length; const hechos = visibles.filter((k) => D.tickets[k.id] && D.tickets[k.id].hecho).length;
      const txt = (k) => (typeof k.texto === 'function' ? k.texto(k.T, H) : k.texto);
      el.innerHTML = `<div class="card mv-panel"><h3 style="margin-top:0;font-size:1.05em">🗂️ ${esc(cfg.titulo || 'Tablero del equipo')}</h3>
        <p class="small muted">${visibles.length} tickets para ti · ${hechos} resueltos${futuros ? ` · <b>${futuros}</b> más van a llegar en los próximos días (como en un trabajo: no sabes cuáles ni cuándo)` : ''}.</p>
        ${visibles.slice().reverse().map((k) => { const e = D.tickets[k.id] || {}; return `<details class="mv-ticket ${e.hecho ? 'hecho' : ''}" ${e.hecho ? '' : 'open'}><summary>${ICON[k.tipo] || '📋'} <b>${esc(k.id)}</b> · ${esc(k.titulo)} <span class="small muted">· ${esc(k.de)} · ${esc(cfg.hora ? cfg.hora(k.T) : new Date(k.T).toISOString().slice(0, 16))}</span> ${e.hecho ? '<span class="mv-ok">✅ resuelto</span>' : ''}</summary>
          <p>${esc(txt(k))}</p>
          ${(k.comentarios || []).length ? `<div class="mv-hilo">${k.comentarios.map((c) => `<div class="small">💬 ${esc(c)}</div>`).join('')}</div>` : ''}
          ${k.criterios ? `<p class="small" style="margin-bottom:4px"><b>Criterios de aceptación</b></p><ul class="small">${k.criterios.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
          ${k.respuesta ? `<div class="mv-resp"><input class="input" data-r="${esc(k.id)}" placeholder="${esc(k.respuesta.ayuda || (k.respuesta.unidad ? 'Respuesta (' + k.respuesta.unidad + ')' : 'Respuesta'))}" value="${esc(e.respuesta || '')}"> <button class="btn btn-primary btn-sm" data-responder="${esc(k.id)}">Responder</button></div>` : `<button class="btn btn-sm" data-cerrar="${esc(k.id)}">Revisar y cerrar</button>`}
          <div class="small mv-res" data-res="${esc(k.id)}">${e.nota ? esc(e.nota) : ''}</div></details>`; }).join('')}
      </div>`;
      const marcar = (id, r, valor) => { const e = (D.tickets[id] = D.tickets[id] || {}); e.intentos = (e.intentos || 0) + 1; if (valor !== undefined) e.respuesta = valor; if (r === true) { e.hecho = Date.now(); e.nota = ''; } else e.nota = r; cfg.guardar(); pintar(); };
      el.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', async () => { const k = cfg.tickets.find((x) => x.id === b.dataset.cerrar); b.disabled = true; b.textContent = 'Revisando…'; let r; try { r = await k.check(); } catch (e) { r = String(e.message || e); } marcar(k.id, r); }));
      el.querySelectorAll('[data-responder]').forEach((b) => b.addEventListener('click', async () => {
        const k = cfg.tickets.find((x) => x.id === b.dataset.responder); const v = el.querySelector(`[data-r="${k.id}"]`).value.trim(); if (!v) return;
        const val = k.respuesta.tipo === 'numero' ? numero(v) : v; const { I, H } = cfg.contexto(); const T = k.cuando(I, H);
        let r; try { r = k.respuesta.tipo === 'numero' && !Number.isFinite(val) ? 'Escribe un número.' : await k.respuesta.verificar(val, T, H); } catch (e) { r = String(e.message || e); }
        marcar(k.id, r, v);
      }));
    };
    pintar();
    const iv = setInterval(() => { if (!document.body.contains(el)) return clearInterval(iv); if (!el.querySelector('input:focus')) pintar(); }, 60000);
  }
  window.TableroTickets = { panel, numero };
})();
