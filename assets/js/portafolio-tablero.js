/* Proyecto de Jira "PF · Portafolio": cada proyecto del módulo Portafolio es una historia con criterios de aceptación,
 * como se gestionaría en un equipo real. Aparece en Jira cuando abres la lección del proyecto, y el líder técnico la
 * revisa contra tu repositorio en el GitHub de práctica (github.com/alumno/<repo>) cuando la mueves a In Review o Done:
 * README con las secciones que pide un revisor, historia de commits, un pull request fusionado y, según el proyecto,
 * los archivos que prueban que existe (tests, CI, modelos de dbt, infraestructura como código…).
 * No mira código real de nadie ni se conecta a GitHub.com: todo es el GitHub simulado del curso.
 */
(function () {
  'use strict';
  const ST = () => (window.__almacen ? window.__almacen() : null);
  const datos = () => { const S = ST(); if (!S) return null; S.data.portafolioPF = S.data.portafolioPF || { tickets: {} }; return S.data.portafolioPF; };
  const guardar = () => { const S = ST(); try { if (S) (S.saveSoon ? S.saveSoon() : S.save()); } catch (e) { /* sin almacenamiento */ } };
  const visitada = (slug) => { const S = ST(); const v = S && S.data && S.data.visited && S.data.visited[`portafolio-${slug}`]; return v ? Number(v) || Date.now() : Infinity; };

  // repositorios de práctica del alumno
  const repo = (nombre) => { const G = window.Shell && window.Shell.github; if (!G) return null; return G.remoto(`https://github.com/alumno/${nombre}`) || null; };
  function snapMain(R) { const h = R && R.branches && R.branches.main; return h && R.commits[h] ? R.commits[h].snap || {} : {}; }
  function commitsMain(R) { let n = 0, h = R && R.branches && R.branches.main; const vistos = new Set(); while (h && R.commits[h] && !vistos.has(h)) { vistos.add(h); n++; h = R.commits[h].parent; } return n; }
  const leer = (snap, re) => Object.keys(snap).filter((k) => re.test(k));
  // la Definition of Done común a todos los proyectos de portafolio
  function revisar(nombre, extra) {
    return () => {
      const R = repo(nombre);
      if (!R) return `No encuentro el repositorio github.com/alumno/${nombre}. Créalo (New repository o gh repo create ${nombre} --public) y sube tu trabajo.`;
      const s = snapMain(R); const readme = s['README.md'] || s['readme.md'] || '';
      const faltan = [];
      if (readme.length < 400) faltan.push('un README.md de al menos unas líneas de verdad (ahora tiene ' + readme.length + ' caracteres)');
      for (const [sec, re] of [['el problema (una línea **Problema**: o una sección ## Problema / ## Contexto)', /(##\s*(problema|contexto)|\*\*problema\*\*)/i], ['la arquitectura (un diagrama ![Arquitectura](…) o una sección ## Arquitectura)', /(##\s*arquitectura|!\[arquitectura\])/i], ['una sección ## Cómo correrlo', /##\s*c[oó]mo (correrlo|ejecutarlo|usarlo)/i], ['el resultado o las decisiones (**Resultado**:, ## Decisiones o ## Resultados)', /(##\s*(resultados|decisiones|qu[eé] har[ií]a)|\*\*resultado)/i]]) if (!re.test(readme)) faltan.push(`en el README, ${sec}`);
      if (commitsMain(R) < 3) faltan.push(`al menos 3 commits en main (hay ${commitsMain(R)}): un solo commit gigante no muestra cómo trabajas`);
      if (!(R.prs || []).some((p) => p.estado === 'fusionado')) faltan.push('un pull request fusionado (trabaja en una rama, abre el PR y fusiónalo)');
      if (leer(s, /(^|\/)\.env$|credentials|secret/i).length) faltan.push(`sacar del repo ${leer(s, /(^|\/)\.env$|credentials|secret/i).join(', ')}: nunca se suben credenciales (y agrégalo al .gitignore)`);
      if (extra) for (const [txt, ok] of extra) { try { if (!ok(s, R)) faltan.push(txt); } catch (e) { faltan.push(txt); } }
      return faltan.length ? `Revisé github.com/alumno/${nombre} y falta: ${faltan.join('; ')}.` : true;
    };
  }
  const hay = (re) => (s) => leer(s, re).length > 0;
  const PROY = [
    ['lakehouse-de-ventas', 'Lakehouse de ventas con dbt', 'Ventas', 'Queremos un lakehouse de ventas con capas y tests, que alguien más pueda correr.', [['modelos de dbt (models/…/*.sql)', hay(/^models\/.+\.sql$/)], ['tests de dbt (un schema.yml con tests)', (s) => leer(s, /\.ya?ml$/).some((k) => /tests:/.test(s[k]))]]],
    ['fraude-tiempo-real', 'Detección de fraude en tiempo casi real', 'Riesgo', 'Necesitamos marcar transacciones sospechosas a los pocos segundos, con reglas explicables.', [['el código del consumidor o del job de streaming (.py)', hay(/\.py$/)], ['tests de las reglas (tests/…)', hay(/^tests\//)]]],
    ['mantenimiento-predictivo', 'Mantenimiento predictivo con IoT y MLflow', 'Operaciones', 'Queremos anticipar fallas de las máquinas a partir de los sensores, con el modelo versionado.', [['el notebook o el script de entrenamiento', hay(/\.(py|ipynb)$/)], ['dónde se registra el modelo (mlflow en el código)', (s) => Object.values(s).some((c) => /mlflow/.test(String(c)))]]],
    ['torre-de-control-logistica', 'Torre de control logística en Azure', 'Logística', 'Queremos ver en un solo lugar cómo va cada envío y qué rutas se atrasan.', [['la infraestructura o los pipelines como archivos (ARM, Bicep, Terraform o pipeline de ADF en JSON)', hay(/\.(bicep|tf|json)$/)]]],
    ['metricas-saas-churn', 'Métricas SaaS y riesgo de baja con dbt', 'Finanzas', 'Necesitamos MRR, churn y un puntaje de riesgo de baja por cliente que el equipo comercial entienda.', [['modelos de dbt (models/…/*.sql)', hay(/^models\/.+\.sql$/)]]],
    ['ausentismo-con-privacidad', 'Menos turnos perdidos, con privacidad', 'Clínica', 'Queremos reducir los turnos perdidos sin exponer datos de pacientes.', [['una sección de privacidad en el README (## Privacidad)', (s) => /##\s*privacidad/i.test(s['README.md'] || '')]]],
    ['recomendaciones-streaming', 'Recomendaciones y retención en streaming', 'Producto', 'Queremos recomendar contenido y medir si mejora la retención, con un experimento serio.', [['el código del modelo o de la evaluación (.py o .ipynb)', hay(/\.(py|ipynb)$/)]]],
    ['clasificador-tickets-llm', 'Clasificador de tickets con un modelo de lenguaje', 'Soporte', 'Queremos clasificar los tickets de soporte automáticamente y saber cuánto acierta.', [['un set de evaluación (eval/… o tests/…)', hay(/^(eval|evals|tests)\//)], ['las claves de la API fuera del código (sin "sk-" en los archivos)', (s) => !Object.values(s).some((c) => /\bsk-[A-Za-z0-9]{10,}/.test(String(c)))]]],
    ['asistente-rag-con-citas', 'Asistente de soporte con RAG que cita sus fuentes', 'Soporte', 'Queremos un asistente que responda con la documentación y diga de dónde sacó cada cosa.', [['la evaluación de respuestas y citas (eval/… o tests/…)', hay(/^(eval|evals|tests)\//)]]],
    ['agente-que-consulta-datos', 'Un agente que responde preguntas sobre los datos', 'Dirección', 'Queremos preguntar en lenguaje natural y que el agente consulte los datos con permisos de solo lectura.', [['las herramientas del agente en código (.py)', hay(/\.py$/)]]],
    ['plataforma-iac-cicd', 'La plataforma con Terraform, bundles y CI/CD', 'Plataforma', 'Queremos que la plataforma se cree y despliegue desde el repositorio, sin clics.', [['Terraform (*.tf)', hay(/\.tf$/)], ['un workflow de CI (.github/workflows/*.yml)', hay(/^\.github\/workflows\/.+\.ya?ml$/)]]],
    ['observabilidad-de-datos', 'Observabilidad de datos: salud, calidad y costos', 'Plataforma', 'Queremos enterarnos antes que el negocio cuando un dato llega tarde, mal o sale caro.', [['los chequeos de calidad o frescura en código', hay(/\.(py|sql|ya?ml)$/)]]],
  ];
  const TICKETS = [
    { id: 'PF-101', tipo: 'requerimiento', de: 'Martín Ríos · Líder técnico', cuando: () => visitada('como-armar-tu-portafolio'), titulo: 'Tu perfil de GitHub listo para que lo vea un reclutador', texto: 'Antes de mostrar proyectos, el perfil: un README de presentación (el repositorio con tu mismo nombre de usuario) que diga qué haces, con qué herramientas y dónde ver tus proyectos.', criterios: ['Repositorio github.com/alumno/alumno con README.md', 'README con secciones Problema/Contexto, Arquitectura (o stack), Cómo correrlo y Resultados (adaptadas a tu perfil)', 'Al menos 3 commits y un PR fusionado'], comentarios: ['Martín: piensa el README como la primera pantalla de una entrevista: 30 segundos para entender quién eres.'], check: revisar('alumno') },
    ...PROY.map(([slug, titulo, area, texto, extra], i) => ({
      id: `PF-${102 + i}`, tipo: 'requerimiento', de: `${area} · Cliente interno`, cuando: () => visitada(slug), titulo: `Proyecto ${i + 1}: ${titulo}`,
      texto: `${texto} Trabájalo como un proyecto de equipo: rama por tarea, pull request, README que explique las decisiones. Repositorio: github.com/alumno/${slug}.`,
      criterios: [`Repositorio github.com/alumno/${slug}`, 'README como el de la lección 1: Problema, Resultado con un número, Arquitectura, Cómo correrlo y Decisiones', 'Al menos 3 commits en main y un PR fusionado', 'Sin credenciales en el repo', ...extra.map((x) => x[0])],
      comentarios: [`Martín: cuando lo muevas a In Review lo reviso contra estos criterios. Si algo falta, te lo devuelvo con el detalle.`],
      check: revisar(slug, extra),
    })),
  ];

  const cfgTablero = () => ({ titulo: 'Portafolio: proyectos gestionados como en un equipo', tickets: TICKETS, contexto: () => { const S = ST(); const vs = Object.entries((S && S.data.visited) || {}).filter(([k]) => k.startsWith('portafolio-')).map(([, v]) => Number(v) || Date.now()); return { I: vs.length ? Math.min(...vs) : Date.now(), H: {}, t: Date.now() }; }, datos, guardar });
  (window.__tableros = window.__tableros || []).push({ clave: 'PF', nombre: 'Portafolio', modulo: 'portafolio', cfg: cfgTablero, chequeos: () => [] });
  window.PortafolioTablero = { TICKETS, revisar };
})();
