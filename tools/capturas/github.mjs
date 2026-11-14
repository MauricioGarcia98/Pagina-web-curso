// Guion de capturas del curso de GitHub (assets/img/guias/github/)
export default async function (c) {
  const p = c.page;
  const R = 'tienda-andina/pipelines';
  const ir = async (h, sel = '#ghPag') => { await c.ir('#/github' + h, sel); await c.espera(500); };
  const terminal = async (cmd, espera = 900) => {
    if (await p.$eval('#ghTerm', (x) => x.hidden).catch(() => true)) { await p.click('#ghTermB'); await c.espera(500); }
    await p.click('#ghTerm .term-input'); await p.keyboard.type(cmd); await p.keyboard.press('Enter'); await c.espera(espera);
  };
  const cerrarTerminal = async () => { if (!(await p.$eval('#ghTerm', (x) => x.hidden).catch(() => true))) { await p.click('#ghTermX'); await c.espera(300); } };

  // nivel 1: qué es GitHub y cómo se recorre un repositorio
  await ir('');
  await c.foto('g01-dashboard', { marcas: [['.gh-top', '1'], ['#ghTermB', '2']] });
  await ir('/' + R, '.gh-filelist');
  await c.foto('g02-repo', { marcas: [['.gh-tabs', '1'], ['.gh-code-bar', '2'], ['.gh-files', '3'], ['.gh-readme', '4'], ['.gh-about', '5']] });
  await p.click('[data-menu="code"]'); await c.espera(300);
  await c.foto('g02-boton-code', { marcas: [['.gh-menu-code', null]] });
  await p.keyboard.press('Escape'); await p.mouse.click(200, 650); await c.espera(200);
  await ir('/' + R + '/blob/main/pipelines/etl.py', '#ghPag');
  await c.foto('g02-archivo');
  await ir('/' + R + '/commits', '#ghPag');
  await c.foto('g02-commits');
  await ir('/' + R + '/issues', '#ghPag');
  await c.foto('g02-issues');

  // crear un repositorio propio
  await ir('/new', '#nrNombre');
  await p.fill('#nrNombre', 'ventas-app'); await p.fill('#nrDesc', 'Limpieza y resumen de las ventas de la tienda');
  await p.check('#nrReadme'); await p.selectOption('#nrIgnore', { index: 1 }).catch(() => {}); await c.espera(200);
  const ign = await p.$$eval('#nrIgnore option', (os) => os.map((o) => o.value)); const py = ign.find((v) => /python/i.test(v)); if (py) await p.selectOption('#nrIgnore', py);
  await p.selectOption('#nrLic', { label: 'MIT License' }).catch(async () => { const ls = await p.$$eval('#nrLic option', (os) => os.map((o) => o.value)); const mit = ls.find((v) => /mit/i.test(v)); if (mit) await p.selectOption('#nrLic', mit); });
  await c.espera(200);
  await c.foto('g03-nuevo-repo', { marcas: [['#nrNombre', '1'], ['#nrReadme', '2'], ['#nrIgnore', '3'], ['#nrLic', '4']] });
  await p.click('#nrCrear'); await c.espera(1200);
  await c.foto('g03-repo-creado');
  // editar el README en el navegador
  await ir('/alumno/ventas-app/edit/main/README.md', '#edTxt');
  await p.click('#edTxt'); await p.keyboard.press('Control+End'); await p.keyboard.type('\n\n## Cómo se usa\n\nPróximamente: el script de resumen de ventas.\n'); await c.espera(200);
  await c.foto('g03-editar', { marcas: [['#edTxt', null], ['#edCommit', '1']] });
  await p.click('#edCommit'); await c.espera(300); await p.fill('#edMsg', 'README: sección Cómo se usa');
  await c.foto('g03-commit-web', { marcas: [['#edMsg', '1'], ['#edOk', '2']] });
  await p.click('#edOk'); await c.espera(1000);
  await ir('/alumno/ventas-app', '.gh-filelist');
  await c.foto('g03-repo-actualizado', { marcas: [['.gh-lastc', null]] });
  // nivel 2: issues, clonar y subir
  const escribir = (ruta, texto) => p.evaluate(([r, t]) => { const S = window.Shell; S.mkdirp(r.slice(0, r.lastIndexOf('/'))); S.writeFile(r, t); S.Machine.save(); }, [ruta, texto]);
  const V = '/home/alumno/ventas-app';
  await ir('/alumno/ventas-app/issues/new', '#niT');
  await p.fill('#niT', 'Agregar el script de resumen de ventas');
  await p.fill('#niB', 'Necesitamos un script que resuma las ventas por canal.\n\n- [ ] Leer el CSV de ventas\n- [ ] Totales por canal\n- [ ] Tests');
  await p.click('[data-menu="lab"]'); await c.espera(200); await p.click('[data-etiqueta="enhancement"]').catch(() => {}); await c.espera(200); await p.keyboard.press('Escape').catch(() => {}); await p.mouse.click(640, 120); await c.espera(200);
  await p.click('[data-menu="asig"]').catch(() => {}); await c.espera(200); await p.click('[data-asignar="alumno"]').catch(() => {}); await c.espera(200); await p.mouse.click(640, 120); await c.espera(200);
  await c.foto('g06-issue-nuevo', { marcas: [['#niT', '1'], ['#niB', '2'], ['.gh-side', '3']] });
  await p.click('#niOk'); await c.espera(1200);
  await c.foto('g06-issue');
  await terminal('cd ~ && git clone https://github.com/alumno/ventas-app.git && cd ventas-app && git checkout -b feature/resumen', 1500);
  await escribir(V + '/resumen.py', 'import csv\nfrom collections import defaultdict\n\n\ndef totales_por_canal(filas):\n    """Suma el total de las filas no canceladas, por canal."""\n    totales = defaultdict(float)\n    for fila in filas:\n        if fila["estado"] != "cancelado":\n            totales[fila["canal"]] += float(fila["total"])\n    return dict(totales)\n');
  await escribir(V + '/test_resumen.py', 'from resumen import totales_por_canal\n\n\ndef test_ignora_cancelados():\n    filas = [{"canal": "web", "estado": "entregado", "total": "10"}, {"canal": "web", "estado": "cancelado", "total": "5"}]\n    assert totales_por_canal(filas) == {"web": 10.0}\n');
  await terminal('git add . && git commit -m "Agrega el resumen de ventas por canal (Closes #1)"', 1200);
  await terminal('git push -u origin feature/resumen', 1800);
  await c.foto('g05-push', { marcas: [['#ghTerm', null]] });
  await terminal('gh auth login', 1200);
  await terminal('gh pr create --title "Agrega el resumen de ventas por canal" --body "Closes #1. Agrega totales_por_canal con un test que comprueba que se ignoran los cancelados."', 1800);
  await cerrarTerminal();
  // nivel 3: el pull request
  await ir('/alumno/ventas-app/pulls', '#ghPag');
  const prN = await p.evaluate(() => { const a = [...document.querySelectorAll('a[href*="/pull/"]')].map((x) => x.getAttribute('href')).find((h) => /\/pull\/\d+$/.test(h)); return a ? a.split('/').pop() : '2'; });
  await ir('/alumno/ventas-app/pull/' + prN, '#ghPag');
  await c.foto('g09-pr', { marcas: [['.gh-tabs', null]] });
  await ir('/alumno/ventas-app/pull/' + prN + '/files', '#ghPag');
  await c.foto('g09-archivos');
  await ir('/alumno/ventas-app/pull/' + prN, '#ghPag');
  await p.click('[data-menu="rev"]'); await c.espera(250);
  await c.foto('g10-pedir-revision', { marcas: [['[data-menu-de="rev"]', null]] });
  await p.evaluate(() => { const a = [...document.querySelectorAll('[data-pedir-rev="camila"]')].find((x) => x.offsetParent) || document.querySelector('[data-pedir-rev="camila"]'); a.click(); }); await c.espera(400); await p.mouse.click(640, 120);
  await c.espera(7000); await ir('/alumno/ventas-app/pull/' + prN, '#ghPag');
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await c.espera(400);
  await c.foto('g10-revision', { marcas: [['#ghMergeBox', null]] });
  await p.click('#prMerge').catch(() => {}); await c.espera(400);
  await c.foto('g11-confirmar-merge', { marcas: [['#prConf', null]] });
  await p.click('#prConfOk').catch(() => {}); await c.espera(1200);
  await c.foto('g11-fusionado');
  await ir('/alumno/ventas-app/issues?q=is%3Aissue', '#ghPag');
  await c.foto('g06-issue-cerrado');

  // nivel 4: Actions y protección de la rama main
  await terminal('git checkout main && git pull', 1500);
  await escribir(V + '/.github/workflows/tests.yml', 'name: tests\non:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  tests:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-python@v5\n        with:\n          python-version: "3.12"\n      - run: pip install pytest ruff\n      - run: ruff check .\n      - run: pytest\n');
  await terminal('git add . && git commit -m "CI: ruff y pytest en cada push y pull request" && git push', 2500);
  await cerrarTerminal();
  await c.espera(4000);
  await ir('/alumno/ventas-app/actions', '#ghPag');
  await c.foto('g13-actions', { marcas: [['#ghRuns', null]] });
  await p.click('#ghRuns a').catch(() => {}); await c.espera(1500);
  await c.foto('g13-run');
  await p.click('#ghPag a:has-text("tests") >> nth=1').catch(() => {}); await c.espera(1200);
  await c.foto('g13-log');
  // el arreglo: quitar el import que ruff marcó y volver a subir
  await escribir(V + '/resumen.py', 'from collections import defaultdict\n\n\ndef totales_por_canal(filas):\n    """Suma el total de las filas no canceladas, por canal."""\n    totales = defaultdict(float)\n    for fila in filas:\n        if fila["estado"] != "cancelado":\n            totales[fila["canal"]] += float(fila["total"])\n    return dict(totales)\n');
  await terminal('git commit -am "Quita el import sin usar que marcó ruff (F401)" && git push', 2500);
  await cerrarTerminal(); await c.espera(4000);
  await ir('/alumno/ventas-app/actions', '#ghPag');
  await c.foto('g13-actions-verde', { marcas: [['#ghRuns', null]] });
  await ir('/alumno/ventas-app/settings/branch', '#rgPat');
  await p.check('#rgPR').catch(() => {}); await c.espera(200); await p.fill('#rgN', '1').catch(() => {});
  await p.check('#rgChecks').catch(() => {}); await c.espera(200); await p.fill('#rgCheckN', 'tests').catch(() => {}); await p.click('#rgCheckAdd').catch(() => {}); await c.espera(300);
  await c.foto('g14-regla', { marcas: [['#rgPat', '1'], ['#rgPR', '2'], ['#rgChecks', '3']] });
  await p.click('#rgOk').catch(() => {}); await c.espera(800);
  await c.foto('g14-reglas');
  // main protegida: un push directo se rechaza
  await escribir(V + '/README.md', '# ventas-app\n\nLimpieza y resumen de las ventas de la tienda.\n\nCambio directo a main (debería rechazarse).\n');
  await terminal('git commit -am "Cambio directo a main" && git push', 2500);
  await c.foto('g14-push-rechazado', { marcas: [['#ghTerm', null]] });
  await terminal('git reset --hard origin/main', 1200);
  await cerrarTerminal();

  // nivel 5: secretos, escaneo de secretos, Pages e Insights
  await ir('/alumno/ventas-app/settings/secret', '#ssN');
  await p.fill('#ssN', 'DB_PASSWORD'); await p.fill('#ssV', 'clave-de-practica-123'); await c.espera(200);
  await c.foto('g17-secreto-nuevo', { marcas: [['#ssN', '1'], ['#ssV', '2']] });
  await p.click('#ssOk').catch(() => {}); await c.espera(800);
  await c.foto('g17-secretos');
  await terminal('git checkout -b feature/config', 1000);
  await escribir(V + '/config.py', 'AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"\nAWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"\n');
  await terminal('git add config.py && git commit -m "Agrega configuración" && git push -u origin feature/config', 2500);
  await c.foto('g18-push-protection', { marcas: [['#ghTerm', null]] });
  await terminal('git checkout main && git branch -D feature/config', 1200);
  await cerrarTerminal();
  await ir('/alumno/ventas-app/security', '#ghPag');
  await c.foto('g18-security');
  await ir('/alumno/ventas-app/settings/pages', '#spFuente');
  await p.selectOption('#spFuente', 'rama').catch(() => {}); await c.espera(400);
  await c.foto('g19-pages', { marcas: [['#spFuente', '1'], ['#spRamaB', '2']] });
  await p.click('#spOk').catch(() => {}); await c.espera(800);
  await ir('/alumno/ventas-app/pulse', '#ghPag');
  await c.foto('g19-insights');
}
