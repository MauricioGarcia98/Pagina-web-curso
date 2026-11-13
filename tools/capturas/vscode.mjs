// Guion de capturas del curso de VS Code (assets/img/guias/vscode/)
export default async function (c) {
  const p = c.page;
  const H = '/home/alumno';
  const esc = async () => { await p.keyboard.press('Escape'); await c.espera(150); };
  const escribirArchivo = (ruta, texto) => p.evaluate(([r, t]) => { const S = window.Shell; S.mkdirp(r.slice(0, r.lastIndexOf('/'))); S.writeFile(r, t); S.Machine.save(); }, [ruta, texto]);
  const abrir = async (ruta) => {
    const partes = ruta.slice(0, ruta.lastIndexOf('/')).split('/');
    for (let i = 4; i <= partes.length; i++) { const d = partes.slice(0, i).join('/'); const el = await p.$(`[data-dir="${d}"]`); if (el && (await el.innerText()).includes('›')) { await el.click(); await c.espera(150); } }
    await p.click(`[data-f="${ruta}"]`); await c.espera(700);
  };
  const terminal = async (cmd, espera = 600) => { await p.click('.vs-panel .term-input'); await p.keyboard.type(cmd); await p.keyboard.press('Enter'); await c.espera(espera); };
  const paleta = async (texto) => { await p.keyboard.press('Control+Shift+P'); await c.espera(250); await p.keyboard.type(texto); await c.espera(250); };
  const vista = async (v) => { await p.click(`[data-vista="${v}"]`); await c.espera(400); };
  const panelVisible = async () => { if (await p.$eval('.vs-panel', (x) => x.hidden)) { await p.keyboard.press('Control+`'); await c.espera(500); } };

  await c.ir('#/vscode', '[data-abrir]');
  await p.click(`[data-abrir="${H}"]`); await p.waitForSelector('.vscode'); await c.espera(1200);
  await p.addStyleTag({ content: '#herrBar, #retosHerrBtn { display: none !important; } body.vscode-abierto .vscode { top: 0 !important; }' });

  // nivel 1: la pantalla
  await c.foto('v01-pantalla');
  await c.foto('v01-zonas', { marcas: [['.vs-actividad', '1'], ['.vs-lateral', '2'], ['.vs-editor', '3'], ['.vs-panel', '4'], ['.vs-estado', '5'], ['.vs-buscar-tit', '6']] });
  // archivos y carpetas
  await abrir(H + '/scripts/resumen_ventas.py');
  await c.foto('v02-archivo', { marcas: [['.vs-tabs', '1'], ['.vs-migas', '2'], ['.vs-esquema', '3']] });
  await p.keyboard.press('Control+p'); await c.espera(250); await p.keyboard.type('etl'); await c.espera(300);
  await c.foto('v02-abrir-rapido', { marcas: [['.vs-quick', null]] });
  await esc();
  await p.click('[data-nuevo]'); await c.espera(250); await p.keyboard.type('notas/ideas.md'); await c.espera(200);
  await c.foto('v02-nuevo-archivo', { marcas: [['[data-nuevo]', '1'], ['.vs-entrada', '2']] });
  await p.keyboard.press('Enter'); await c.espera(700);
  await p.keyboard.type('# Ideas\n\n- Revisar el pipeline de ventas\n'); await p.keyboard.press('Control+s'); await c.espera(300);
  await p.click(`[data-f="${H}/README.md"]`, { button: 'right' }); await c.espera(250);
  await c.foto('v02-menu-contextual', { marcas: [['.vs-ctx', null]] });
  await p.mouse.click(700, 300); await c.espera(200);
  // editar
  await abrir(H + '/scripts/resumen_ventas.py');
  await p.click('.vs-editor .view-lines'); await p.keyboard.press('Control+f'); await c.espera(250); await p.keyboard.type('ventas'); await c.espera(300);
  await c.foto('v03-buscar-en-archivo', { marcas: [['.find-widget', null]] });
  await esc();
  await paleta('tema');
  await c.foto('v03-paleta', { marcas: [['.vs-quick', null]] });
  await esc();

  // nivel 2: terminal y ejecutar
  await panelVisible();
  await terminal('ls datos'); await terminal('head -3 datos/ventas_2024_12.csv');
  await c.foto('v05-terminal', { marcas: [['.vs-panel', null]] });
  await p.click('[data-nuevo]'); await c.espera(250); await p.keyboard.type('scripts/hola.py'); await p.keyboard.press('Enter'); await c.espera(700);
  await p.keyboard.type('nombre = "Ana"\nprint(f"Hola, {nombre}")\n'); await p.keyboard.press('Control+s'); await c.espera(300);
  await p.click('[data-run]'); await c.espera(2500);
  await c.foto('v06-ejecutar', { marcas: [['[data-run]', '1'], ['.vs-panel', '2']] });
  await abrir(H + '/scripts/resumen_ventas.py');
  await p.click('[data-run]'); await c.espera(3000);
  await c.foto('v06-resumen');
  await p.keyboard.press('Control+Shift+F'); await c.espera(300); await p.fill('[data-q]', 'canal'); await c.espera(500);
  await c.foto('v07-buscar-archivos', { marcas: [['[data-q]', '1'], ['.vs-res', '2']] });
  await p.keyboard.press('Control+,'); await c.espera(600);
  await c.foto('v07-ajustes', { marcas: [['.vs-aj-buscar', '1'], ['[data-abrir-json]', '2']] });

  // nivel 3: depurar, problemas y tests
  await escribirArchivo(H + '/scripts/descuentos.py', 'precios = [100, 250, 80]\ndescuento = 0.1\ntotal = 0\nfor precio in precios:\n    total = precio * (1 - descuento)\nprint("Total:", total)\n');
  await vista('explorador'); await p.click('[data-refrescar]').catch(() => {}); await c.espera(300);
  await abrir(H + '/scripts/descuentos.py');
  await p.click('[data-run]'); await c.espera(2500);
  await c.foto('v09-bug', { marcas: [['.vs-panel', null]] });
  await p.click('.vs-editor .view-lines'); await p.keyboard.press('Control+g'); await c.espera(200); await p.keyboard.type('5'); await p.keyboard.press('Enter'); await c.espera(200);
  await p.keyboard.press('F9'); await c.espera(300);
  await vista('ejecutar');
  await c.foto('v09-punto', { marcas: [['.vs-editor .codicon-debug-breakpoint, .vs-editor .vs-bp-glifo, .vs-editor [class*="breakpoint"]', '1'], ['[data-dbg-ini]', '2']] });
  await p.click('[data-dbg-ini]'); await c.espera(3500);
  await c.foto('v09-depurando', { marcas: [['.vs-lateral', '1'], ['.vs-dbg-barra', '2']] });
  await p.keyboard.press('F5'); await c.espera(1500);
  await c.foto('v09-segunda-vuelta', { marcas: [['.vs-lateral .vs-var', null]] });
  await p.keyboard.press('Shift+F5'); await c.espera(800);
  await escribirArchivo(H + '/scripts/con_errores.py', 'import os\n\ndef total(precios)\n    return sum(precios)\n\nprint(totl([1, 2]))\n');
  await vista('explorador'); await p.click('[data-refrescar]').catch(() => {}); await c.espera(300);
  await abrir(H + '/scripts/con_errores.py');
  await panelVisible(); await p.click('[data-ptab="problemas"]'); await c.espera(500);
  await c.foto('v10-problemas', { marcas: [['.vs-panel', '1'], ['[data-errores]', '2']] });
  await p.click('[data-ptab="terminal"]').catch(() => {}); await c.espera(200);
  await paleta('ruff'); await p.keyboard.press('Enter'); await c.espera(2500);
  await c.foto('v10-ruff', { marcas: [['.vs-panel', null]] });
  await escribirArchivo(H + '/scripts/precios.py', 'def con_descuento(precio, descuento):\n    """Precio con descuento (descuento entre 0 y 1)."""\n    return round(precio * (1 - descuento), 2)\n');
  await escribirArchivo(H + '/scripts/test_precios.py', 'from precios import con_descuento\n\n\ndef test_descuento_normal():\n    assert con_descuento(100, 0.1) == 90\n\n\ndef test_sin_descuento():\n    assert con_descuento(80, 0) == 80\n');
  await terminal('cd ~/scripts'); await paleta('pytest'); await p.keyboard.press('Enter'); await c.espera(3000);
  await c.foto('v11-pytest', { marcas: [['.vs-panel', null]] });

  // nivel 4: Git en un proyecto nuevo
  await terminal('mkdir -p ~/ventas_app/src && cd ~/ventas_app && code .', 2500);
  await p.waitForSelector('.vscode'); await c.espera(800);
  await vista('git');
  await c.foto('v13-sin-repo', { marcas: [['[data-git-init]', null]] });
  await p.click('[data-git-init]'); await c.espera(800);
  await escribirArchivo(H + '/ventas_app/README.md', '# ventas_app\n\nLimpieza y resumen de las ventas de la tienda.\n');
  await escribirArchivo(H + '/ventas_app/src/limpieza.py', 'def limpiar_email(email):\n    return str(email).strip().lower()\n');
  await escribirArchivo(H + '/ventas_app/.gitignore', '.venv/\n__pycache__/\n*.csv\n');
  await vista('explorador'); await p.click('[data-refrescar]').catch(() => {}); await vista('git');
  await c.foto('v13-cambios', { marcas: [['.vs-git-box', '1'], ['.vs-lat-sub', '2']] });
  await p.fill('[data-msg]', 'Estructura inicial del proyecto'); await c.espera(150);
  await c.foto('v13-mensaje', { marcas: [['[data-msg]', '1'], ['[data-commit]', '2']] });
  await p.click('[data-commit]'); await c.espera(900);
  await escribirArchivo(H + '/ventas_app/README.md', '# ventas_app\n\nLimpieza y resumen de las ventas de la tienda.\n\n## Cómo se ejecuta\n\n```\npython src/limpieza.py\n```\n');
  await vista('explorador'); await p.click('[data-refrescar]').catch(() => {}); await vista('git');
  await p.click(`[data-diff="${H}/ventas_app/README.md"]`); await c.espera(1200);
  await c.foto('v13-diff');
  await p.fill('[data-msg]', 'README: cómo se ejecuta'); await p.click('[data-commit]'); await c.espera(900);
  await panelVisible(); await p.click('[data-ptab="terminal"]').catch(() => {});
  await terminal('git checkout -b feature/validaciones'); await terminal('git log --oneline');
  await c.foto('v14-rama', { marcas: [['[data-rama]', '1'], ['.vs-panel', '2']] });
  await vista('explorador'); await abrir(H + '/ventas_app/README.md');
  await c.foto('v14-timeline', { marcas: [['.vs-timeline', null]] });

  // nivel 5: dbt, extensiones, temas y productividad
  await terminal('code ~/tienda_dbt', 2500); await p.waitForSelector('.vscode'); await c.espera(800);
  await abrir(H + '/tienda_dbt/models/marts/ventas_por_canal.sql');
  await c.foto('v17-modelo-dbt', { marcas: [['[data-run]', '1']] });
  await p.click('[data-run]'); await c.espera(3500);
  await c.foto('v17-dbt-error', { marcas: [['.vs-panel', null]] });
  await terminal('dbt run', 5000);
  await c.foto('v17-dbt-run', { marcas: [['.vs-panel', null]] });
  await vista('ext');
  await c.foto('v18-extensiones', { marcas: [['.vs-lateral', null]] });
  await vista('explorador');
  await paleta('tema de color'); await p.keyboard.press('Enter'); await c.espera(400);
  await c.foto('v18-temas', { marcas: [['.vs-quick', null]] });
  await p.keyboard.type('light'); await c.espera(200); await p.keyboard.press('Enter'); await c.espera(700);
  await c.foto('v18-tema-claro');
  await paleta('tema de color'); await p.keyboard.press('Enter'); await c.espera(300); await p.keyboard.type('dark modern'); await c.espera(200); await p.keyboard.press('Enter'); await c.espera(500);
  await abrir(H + '/tienda_dbt/models/staging/stg_ventas.sql');
  await p.keyboard.press('Control+\\'); await c.espera(800);
  await c.foto('v19-dividir');
}
