/* Revisar mi proyecto en GitHub (#/revisar-repo).
 *
 * Lee un repositorio público con la API de GitHub (desde el navegador, sin token: 60 pedidos por hora)
 * y lo evalúa como lo haría alguien que revisa un portafolio para una entrevista: README, estructura,
 * dependencias, tests, CI, secretos expuestos e historia de commits. Cada criterio explica por qué importa
 * y cómo mejorarlo. Nada se envía a otro lado: los pedidos van directo a api.github.com.
 */
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const API = 'https://api.github.com';

  function aRepo(texto) {
    const t = String(texto || '').trim().replace(/\.git$/, '').replace(/\/+$/, '');
    const m = /github\.com[/:]([\w.-]+)\/([\w.-]+)/.exec(t) || /^([\w.-]+)\/([\w.-]+)$/.exec(t);
    return m ? `${m[1]}/${m[2]}` : null;
  }
  async function gh(ruta, crudo = false) {
    const r = await fetch(API + ruta, { headers: { Accept: crudo ? 'application/vnd.github.raw+json' : 'application/vnd.github+json' } });
    if (r.status === 404) return { status: 404 };
    if (r.status === 403 || r.status === 429) { const e = new Error('GitHub limitó los pedidos (60 por hora sin iniciar sesión). Espera unos minutos y vuelve a intentar.'); e.limite = true; throw e; }
    if (!r.ok) return { status: r.status };
    return { status: 200, data: crudo ? await r.text() : await r.json() };
  }

  const GENERICOS = /^(update|updates|fix|fixes|wip|cambios|changes|commit|subida|upload|initial commit|first commit|primer commit|test|asdf|\.|minor|arreglo|arreglos|readme)(\s+\S+)?$/i;

  function evaluar({ repo, arbol, readme, commits, runs }) {
    const rutas = (arbol || []).map((x) => x.path);
    const tiene = (re) => rutas.some((p) => re.test(p));
    const R = [];
    const add = (grupo, ok, peso, titulo, por, mejorar, detalle = '') => R.push({ grupo, ok, peso, titulo, por, mejorar, detalle });
    const md = readme || '';
    const titulos = (md.match(/^#{1,3}\s+.+$/gm) || []).join(' ').toLowerCase();

    add('README', md.length >= 1500, 2, `README completo (${md.length.toLocaleString('es')} caracteres)`, 'Es lo primero (y a veces lo único) que lee quien revisa tu portafolio. Si no explica el proyecto en dos minutos, no se abre el código.', 'Apunta a 1.500 caracteres o más: qué problema resuelve, con qué datos, cómo está armado, cómo se corre y qué encontraste.');
    const secciones = [['el problema u objetivo', /problema|objetivo|contexto|motivaci|about|overview|qué hace/], ['la arquitectura', /arquitectura|architecture|diseño|design|pipeline|flujo/], ['cómo correrlo', /c[oó]mo (correr|ejecutar|usar|empezar)|instalaci|setup|getting started|quickstart|uso|usage|run/], ['los resultados', /resultado|hallazgo|insight|conclusi|results|métricas|dashboard/]];
    const faltan = secciones.filter(([, re]) => !re.test(titulos)).map(([n]) => n);
    add('README', faltan.length <= 1, 2, 'README con las secciones que buscan los reclutadores', 'Un README ordenado demuestra que sabes comunicar, algo que se evalúa tanto como el código.', faltan.length ? `Agrega títulos (##) para: ${faltan.join(', ')}.` : '', faltan.length ? `Faltan: ${faltan.join(', ')}` : 'Problema, arquitectura, cómo correrlo y resultados');
    add('README', /!\[[^\]]*\]\([^)]+\)|```mermaid|<img\s/i.test(md), 1, 'Un diagrama o imagen de la arquitectura', 'Un diagrama vale más que tres párrafos: muestra de un vistazo de dónde vienen los datos y adónde van.', 'Agrega un diagrama (puede ser una imagen hecha en Excalidraw o un bloque ```mermaid) con las capas del pipeline.');

    add('Estructura', tiene(/(^|\/)\.gitignore$/), 1, '.gitignore', 'Evita subir por error entornos virtuales, cachés, datos pesados y claves.', 'Agrega un .gitignore con al menos: .venv/, __pycache__/, .env, *.parquet grandes y target/ (dbt).');
    const deps = rutas.filter((p) => /(^|\/)(requirements[\w-]*\.txt|pyproject\.toml|environment\.ya?ml|package\.json|dbt_project\.yml|Pipfile|uv\.lock|poetry\.lock)$/.test(p));
    add('Estructura', deps.length > 0, 1, 'Dependencias declaradas', 'Sin la lista de librerías y versiones, nadie más puede correr tu proyecto (y tú tampoco dentro de seis meses).', 'Agrega pyproject.toml (con uv) o requirements.txt con versiones, y dbt_project.yml si usas dbt.', deps.slice(0, 3).join(', '));
    const enRaiz = rutas.filter((p) => !p.includes('/') && /\.(py|sql|ipynb)$/.test(p)).length;
    const carpetas = tiene(/^(src|pipelines?|etl|models|dags|notebooks|sql|scripts|app|infra|terraform)\//) || rutas.some((p) => p.includes('/') && /\.(py|sql|js|ts|scala|ipynb)$/.test(p));
    add('Estructura', carpetas && enRaiz <= 3, 1, 'Código organizado en carpetas', 'Una estructura clara (src/, models/, dags/, tests/) muestra que pensaste el proyecto como software, no como un script suelto.', 'Mueve el código a carpetas por responsabilidad: src/ o pipelines/, models/ (dbt), dags/ (Airflow), tests/, infra/.', `${enRaiz} archivos de código sueltos en la raíz`);

    const secretos = rutas.filter((p) => /(^|\/)(\.env(\.\w+)?|credentials?\.json|.*\.pem|id_rsa|.*\.key|secrets?\.ya?ml|service[-_]account.*\.json)$/i.test(p) && !/\.example$|\.sample$|\.template$/.test(p));
    add('Seguridad', !secretos.length, 2, 'Sin archivos de secretos en el repositorio', 'Una clave subida a GitHub público se considera filtrada: hay bots que la encuentran en minutos. En una entrevista, es una señal roja.', `Borra ${secretos.join(', ')} del repositorio, rota (cambia) esas claves YA, agrégalos al .gitignore y deja un .env.example sin valores reales.`, secretos.join(', '));
    const pesados = (arbol || []).filter((x) => x.type === 'blob' && x.size > 20 * 1048576).map((x) => x.path);
    add('Seguridad', !pesados.length, 1, 'Sin archivos de datos enormes', 'Git no está hecho para datos pesados: el repo se vuelve lento de clonar. Los datos van a un lago (S3, ADLS, GCS) o se generan con un script.', `Quita ${pesados.slice(0, 3).join(', ')} y deja un script que los descargue o genere (o usa Git LFS).`, pesados.slice(0, 3).join(', '));

    const tests = rutas.filter((p) => /(^|\/)(tests?\/.+\.py|test_[\w-]+\.py|[\w-]+_test\.py)$/.test(p) || /(^|\/)models\/.+\.ya?ml$/.test(p) || /(^|\/)tests\/.+\.sql$/.test(p));
    add('Calidad', tests.length > 0, 2, `Tests (${tests.length} archivos)`, 'Los tests son la prueba de que tus transformaciones hacen lo que dicen. Es la diferencia más visible entre un proyecto de curso y uno profesional.', 'Agrega tests con pytest para tus funciones de limpieza y tests de dbt (unique, not_null, relationships) en models/*.yml.');
    const wf = rutas.filter((p) => /^\.github\/workflows\/.+\.ya?ml$/.test(p));
    add('Calidad', wf.length > 0, 1, 'Integración continua (GitHub Actions)', 'Que los tests corran solos en cada push es lo que hace un equipo real. Además, el ✓ verde se ve en la página del repo.', 'Agrega .github/workflows/ci.yml que instale dependencias y corra ruff y pytest (o dbt build) en cada push.', wf.join(', '));
    const ult = (runs || [])[0];
    add('Calidad', !!ult && ult.conclusion === 'success', 1, 'La última ejecución del CI pasó', 'Un CI en rojo dice "esto está roto" a quien entra al repo.', ult ? `La última corrida terminó en "${ult.conclusion || ult.status}": revísala en la pestaña Actions y corrígela.` : 'Cuando tengas el workflow, haz un push y verifica que termine en verde.', ult ? `${ult.name}: ${ult.conclusion || ult.status}` : 'sin ejecuciones');

    const n = (commits || []).length;
    const dias = new Set((commits || []).map((c) => (c.commit.author.date || '').slice(0, 10))).size;
    const genericos = (commits || []).filter((c) => { const m = (c.commit.message || '').split('\n')[0].trim(); return m.length < 12 || GENERICOS.test(m); }).length;
    add('Historia', n >= 10, 1, `Historia de commits (${n}${n === 100 ? '+' : ''})`, 'Muchos commits chicos muestran cómo trabajas. Un solo commit "subo el proyecto" no muestra nada.', 'Haz commits chicos y frecuentes, uno por cambio lógico.');
    add('Historia', dias >= 3, 1, `Trabajo repartido en el tiempo (${dias} días distintos)`, 'Un proyecto trabajado varios días se ve real; uno subido en una tarde parece copiado.', 'Sigue mejorando el proyecto en sesiones distintas: tests, documentación, una métrica nueva.');
    add('Historia', n > 0 && genericos / n <= 0.3, 1, 'Mensajes de commit descriptivos', 'Los mensajes cuentan la historia del proyecto. "update" o "fix" no le dicen nada a nadie.', 'Escribe mensajes en imperativo que digan qué y por qué: "Agrega test de duplicados en pedidos", "Particiona ventas por fecha".', n ? `${genericos} de ${n} mensajes genéricos o muy cortos` : '');

    add('Presentación', !!(repo.description && repo.description.length >= 20), 0.5, 'Descripción del repositorio', 'Aparece en tu perfil y en las búsquedas: es el título de tu proyecto.', 'En GitHub, botón ⚙ junto a "About": una línea con qué hace y con qué tecnologías.', repo.description || '');
    add('Presentación', (repo.topics || []).length >= 2, 0.5, 'Temas (topics)', 'Los topics (dbt, airflow, data-engineering…) hacen que el proyecto aparezca en búsquedas.', 'En "About", agrega topics como data-engineering, dbt, airflow, pyspark, duckdb.', (repo.topics || []).join(', '));
    return R;
  }

  function vista(main, { toast } = {}) {
    let guardado = '';
    try { guardado = localStorage.getItem('revisar-repo') || ''; } catch (e) { /* sin almacenamiento */ }
    main.innerHTML = `<div class="container revisar">
      <h1 style="margin:0 0 4px">🔎 Revisar mi proyecto en GitHub</h1>
      <p class="muted" style="margin:0 0 16px;max-width:760px">Escribe tu repositorio público y lo revisamos como lo haría quien evalúa tu portafolio: README, estructura, dependencias, tests, integración continua, secretos expuestos e historia de commits. Cada punto explica por qué importa y cómo mejorarlo. Los pedidos van directo de tu navegador a la API pública de GitHub.</p>
      <form class="card revisar-form" id="rvForm"><input id="rvRepo" placeholder="usuario/repositorio o https://github.com/usuario/repositorio" value="${esc(guardado)}" autocomplete="off" spellcheck="false"><button class="btn btn-primary">Revisar</button></form>
      <div id="rvRes"></div>
      <details class="card home-mas" style="margin-top:22px"><summary>¿Qué se revisa y por qué?</summary><div class="prose"><p>Son los mismos puntos que miran los equipos de datos en los primeros minutos: si el README explica el problema, la arquitectura, cómo correrlo y qué se encontró; si hay tests y un CI en verde; si el repositorio está ordenado y sin claves expuestas; y si la historia de commits muestra un trabajo real y sostenido. Un puntaje alto no garantiza un buen proyecto, pero uno bajo casi siempre hace que no lo miren.</p><p>Solo se leen repositorios <b>públicos</b>. GitHub permite 60 pedidos por hora sin iniciar sesión; cada revisión usa 5.</p></div></details>
    </div>`;
    const $ = (s) => main.querySelector(s);
    $('#rvForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const repo = aRepo($('#rvRepo').value);
      const res = $('#rvRes');
      if (!repo) { res.innerHTML = '<p class="t-err">Escribe el repositorio como <code>usuario/repositorio</code> o pega su URL de GitHub.</p>'; return; }
      try { localStorage.setItem('revisar-repo', repo); } catch (err) { /* sin almacenamiento */ }
      res.innerHTML = '<div class="loading-block"><span class="spinner"></span> Leyendo el repositorio en GitHub…</div>';
      try {
        const info = await gh(`/repos/${repo}`);
        if (info.status === 404) { res.innerHTML = `<p class="t-err">No encontré <code>${esc(repo)}</code>. Revisa el nombre y que el repositorio sea <b>público</b>.</p>`; return; }
        if (info.status !== 200) { res.innerHTML = `<p class="t-err">GitHub respondió ${info.status}. Intenta de nuevo en un rato.</p>`; return; }
        const rama = info.data.default_branch;
        const [arbol, readme, commits, runs] = await Promise.all([
          gh(`/repos/${repo}/git/trees/${encodeURIComponent(rama)}?recursive=1`),
          gh(`/repos/${repo}/readme`, true),
          gh(`/repos/${repo}/commits?per_page=100`),
          gh(`/repos/${repo}/actions/runs?per_page=5`),
        ]);
        const R = evaluar({ repo: info.data, arbol: arbol.data && arbol.data.tree, readme: readme.status === 200 ? readme.data : '', commits: commits.data || [], runs: runs.data && runs.data.workflow_runs });
        const total = R.reduce((s, x) => s + x.peso, 0), logrado = R.filter((x) => x.ok).reduce((s, x) => s + x.peso, 0);
        const pct = Math.round((logrado / total) * 100);
        const nivel = pct >= 85 ? ['🏆', 'Listo para mostrar en entrevistas'] : pct >= 65 ? ['👍', 'Buen proyecto: con unos ajustes queda profesional'] : pct >= 40 ? ['🛠️', 'Tiene base: falta lo que lo hace parecer de un equipo real'] : ['🌱', 'Recién empieza: sigue los puntos en rojo de arriba hacia abajo'];
        const grupos = [...new Set(R.map((x) => x.grupo))];
        res.innerHTML = `<div class="card revisar-res">
          <div class="rv-cab"><div class="rv-pct" style="--p:${pct}"><b>${pct}</b><small>de 100</small></div><div><div class="rv-nivel">${nivel[0]} ${esc(nivel[1])}</div><a href="${esc(info.data.html_url)}" target="_blank" rel="noopener">${esc(repo)}</a> <span class="muted small">· rama ${esc(rama)} · ${(arbol.data && arbol.data.tree || []).filter((x) => x.type === 'blob').length} archivos</span></div></div>
          ${grupos.map((g) => `<h3 class="rv-grupo">${esc(g)}</h3>${R.filter((x) => x.grupo === g).map((x) => `<details class="rv-item ${x.ok ? 'ok' : 'mal'}"><summary><span class="rv-ico">${x.ok ? '✓' : '✗'}</span><span>${esc(x.titulo)}</span>${x.detalle ? `<small class="muted">${esc(x.detalle)}</small>` : ''}</summary><p><b>Por qué importa:</b> ${esc(x.por)}</p>${x.ok ? '' : `<p><b>Cómo mejorarlo:</b> ${esc(x.mejorar)}</p>`}</details>`).join('')}`).join('')}
          <p class="small muted" style="margin-top:14px">¿Arreglaste algo? Haz push y vuelve a revisar. Para inspirarte, mira los proyectos del módulo <a href="#/m/portafolio">Portafolio</a>.</p></div>`;
      } catch (err) {
        res.innerHTML = `<p class="t-err">${esc(err.limite ? err.message : 'No pude conectarme con GitHub (' + err.message + '). Revisa tu conexión.')}</p>`;
      }
    });
    if (guardado) $('#rvRepo').select();
  }

  window.RevisarRepo = { vista, evaluar, aRepo };
})();
