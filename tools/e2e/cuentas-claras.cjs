// Cuentas Claras: el pipeline de Python de la guía contra las tres APIs (CRM con paginación y límite, Cobrable con
// el log de suscripciones, Medidor por tramos) hasta el reverse ETL en lotes al CRM, y el candado de ese paso.
const { leer, bloques, ir, chequeos, afirmar, afirmarChequeos, desbloquear, correr } = require('./comun.cjs');

correr(async ({ p }) => {
  await ir(p, '/l/proyecto-cuentas-claras-paso-a-paso', 4000);
  const py = bloques(leer('proyecto-cuentas-claras/05-paso-a-paso.md'), 'python norun');
  afirmar(py.length >= 5, `la guía trae los bloques de Python de referencia (${py.length})`);
  const r = await p.evaluate(async (bl) => {
    const H = window.CuentasClarasHost; H.sincronizar(); const M = window.CuentasClarasMundo; const C = M.claves(); const hoy = M.diaLocal(M.ahora());
    const pre = `import os\nos.environ.update({"CRM": "${C.crm}", "COB": "${C.cobrable}", "MED": "${C.medidor}", "HOY": "${hoy}"})\n`;
    const x = await window.Engines.PY.run('python', pre + bl.join('\n') + '\nprint("FILAS360", len(filas360), "MRR", len(filas), "rechazados", len(rechazados))');
    return { out: String(x.stdout || ''), err: String(x.error || '') };
  }, py);
  afirmar(!r.err, 'el pipeline de Python corre sin error' + (r.err ? ': ' + r.err.slice(0, 300) : ''));
  const m = /FILAS360 (\d+) MRR (\d+) rechazados (\d+)/.exec(r.out) || [];
  afirmar(Number(m[1]) > 1000 && Number(m[2]) > 5000, `volumen de empresa: ${m[1]} clientes que pagan y ${m[2]} filas de MRR`);
  afirmar(m[3] === '0', 'el CRM no rechazó ninguna escritura del reverse ETL');
  await p.waitForTimeout(2500);
  afirmarChequeos(await chequeos(p, 'CC'), ['Reverse ETL'], 'chequeo');
  const d = await desbloquear(p);
  afirmar(d.detalle.some(([k, ok]) => k === 'CC:Reverse ETL' && ok), 'se abre la solución del reverse ETL');
});
