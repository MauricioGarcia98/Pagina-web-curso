/* Proyecto en equipo: del ticket al lago en AWS (Jira + Azure DevOps + AWS).
 *
 * <div data-equipo="revisar"></div> en una lección dibuja la revisión automática: lee el estado real de las
 * réplicas (Store.data.jira, Store.data.ado, los remotos de la terminal y Machine.cloud.aws) y dice qué está
 * hecho y qué falta, con una pista concreta para cada paso.
 */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const URL_REPO = 'https://dev.azure.com/academia/tienda-andina/_git/lago-pedidos';
  const Store = () => (window.__almacen ? window.__almacen() : null);
  const datos = () => { const S = Store(); return S ? S.data : {}; };
  const aws = () => { try { return window.CloudSim.aws(); } catch (e) { return { buckets: {}, glueDbs: {}, athenaHist: [] }; } };
  const remoto = () => { const G = window.Shell && window.Shell.github; return G ? G.remoto(URL_REPO) : null; };
  const commits = () => { const r = remoto(); return r ? Object.values(r.commits || {}) : []; };

  // la issue del alumno: la que nombra el primer commit con una clave TA-n, o la última story que creó
  function issueAlumno() {
    const J = datos().jira; if (!J) return null;
    for (const c of commits()) { const m = String(c.msg || '').match(/\bTA-(\d+)\b/); if (m) { const x = J.issues.find((i) => i.n === Number(m[1])); if (x) return x; } }
    return J.issues.filter((i) => i.n >= 12 && i.tipo === 'Story').pop() || null;
  }
  // archivos de la rama main del repositorio del proyecto
  const snapMain = () => { const r = remoto(); const h = r && r.branches && r.branches.main; return (h && r.commits[h] && r.commits[h].snap) || {}; };

  const CHEQUEOS = [
    ['Jira', 'La story del proyecto existe y es tuya', 'Jira → Create → Story "Lago de pedidos consultable con Athena", asignada a ti.', () => { const x = issueAlumno(); return !!(x && x.asig === 'alumno'); }],
    ['Jira', 'La story tiene al menos dos subtareas y está estimada', 'Abre la story → Add subtask (script de carga, catálogo y consulta) → Story point estimate.', () => { const x = issueAlumno(); const J = datos().jira; return !!(x && x.pts && J.issues.filter((i) => i.padre === x.n).length >= 2); }],
    ['Jira', 'La story está en un sprint activo (o ya terminó)', 'Backlog → arrástrala al sprint activo; si no hay, Start sprint.', () => { const x = issueAlumno(); const J = datos().jira; return !!(x && (x.estado === 'Done' || J.sprints.some((s) => s.id === x.sprint && s.estado === 'active'))); }],
    ['Azure Repos', 'El repositorio lago-pedidos tiene el script de carga', 'git init, cargar_pedidos.sh, git remote add origin ' + URL_REPO + ' y git push -u origin main.', () => !!snapMain()['cargar_pedidos.sh']],
    ['Azure Repos', 'Un commit nombra la clave de la story (TA-n)', 'git commit -m "TA-12 Script de carga a S3" (con tu número).', () => commits().some((c) => /\bTA-\d+\b/.test(c.msg || ''))],
    ['Azure Pipelines', 'El pipeline del repositorio está en verde', 'Pipelines → New pipeline → lago-pedidos → Python package. Sube requirements.txt y tests/test_*.py si falla.', () => ((datos().ado || {}).pipes || []).some((p) => p.repo === 'lago-pedidos' && p.runs.some((r) => r.estado === 'succeeded'))],
    ['Azure Repos', 'Un cambio entró a main por un pull request completado', 'Rama nueva → push → Repos → Pull requests → New → revisión → Complete.', () => ((datos().ado || {}).prs || []).some((p) => p.repo === 'lago-pedidos' && p.estado === 'completed')],
    ['AWS', 'El lago tiene pedidos de al menos dos días, particionados por fecha de carga', 'bash cargar_pedidos.sh 2026-11-20 y bash cargar_pedidos.sh 2026-11-21 (o dos fechas cualquiera).', () => Object.values(aws().buckets || {}).some((b) => new Set(Object.keys(b.objects || {}).map((k) => (k.match(/raw\/pedidos\/fecha_carga=([^/]+)\//) || [])[1]).filter(Boolean)).size >= 2)],
    ['AWS', 'Glue tiene la tabla de pedidos con la partición fecha_carga', 'Glue → Databases → lago_raw; Crawlers → crawler sobre s3://tu-bucket/raw/pedidos/ → Run.', () => Object.values(aws().glueDbs || {}).some((d) => Object.values(d.tables || {}).some((t) => (t.partitions || []).includes('fecha_carga')))],
    ['AWS', 'Athena respondió filtrando por la partición', "Athena → Settings (ubicación de resultados) → SELECT … WHERE fecha_carga = '2026-11-21'.", () => (aws().athenaHist || []).some((h) => h.estado === 'SUCCEEDED' && /fecha_carga\s*=/.test(h.q))],
    ['Jira', 'La respuesta está en un comentario de la story y la story está en Done', 'Comenta el número, su definición y la consulta; después pásala a Done.', () => { const x = issueAlumno(); return !!(x && x.estado === 'Done' && x.com.some((c) => /\d/.test(c.t))); }],
  ];

  function panel(el) {
    const pintar = () => {
      const res = CHEQUEOS.map(([area, t, pista, f]) => { let ok = false; try { ok = !!f(); } catch (e) { ok = false; } return { area, t, pista, ok }; });
      const hechos = res.filter((r) => r.ok).length, x = issueAlumno();
      el.innerHTML = `<div class="card mv-panel eq-panel"><h3 style="margin-top:0;font-size:1.05em">🔎 Revisar mi proyecto</h3>
        <p class="small muted">Lee lo que hiciste en <a href="#/jira/backlog">Jira</a>, <a href="#/azure-devops/tienda-andina/repos?repo=lago-pedidos">Azure DevOps</a> y la <a href="#/aws">consola de AWS</a> (y la terminal). No hay que entregar nada: se revisa el estado real.${x ? ` Tu story: <b>TA-${x.n}</b> · ${esc(x.titulo)}.` : ''}</p>
        <div class="bar" style="margin:8px 0"><i style="width:${Math.round((hechos / res.length) * 100)}%"></i></div><p class="small"><b>${hechos} de ${res.length}</b> pasos completos.</p>
        <ol class="eq-lista">${res.map((r) => `<li class="${r.ok ? 'ok' : ''}"><span class="eq-marca" aria-hidden="true">${r.ok ? '✓' : '○'}</span><div><span class="badge">${esc(r.area)}</span> <b>${esc(r.t)}</b>${r.ok ? '' : `<div class="small muted">${esc(r.pista)}</div>`}</div><span class="sr-only">${r.ok ? 'hecho' : 'pendiente'}</span></li>`).join('')}</ol>
        <button class="btn btn-ghost btn-sm" type="button" data-eq-otra>Volver a revisar</button>${hechos === res.length ? '<p class="eq-fin">🎉 Proyecto completo: del ticket al lago, con el código revisado y el pipeline en verde. Saca las capturas para tu portafolio.</p>' : ''}</div>`;
      el.querySelector('[data-eq-otra]').onclick = pintar;
    };
    pintar();
  }
  function montar(root) {
    (root || document).querySelectorAll('[data-equipo]').forEach((el) => {
      if (el.dataset.montado) return; el.dataset.montado = '1';
      if (el.dataset.equipo === 'revisar') panel(el);
    });
  }
  window.ProyectoEquipo = { montar, CHEQUEOS, issueAlumno };
})();
