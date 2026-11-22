// Pruebas del repaso espaciado (assets/js/fsrs.js): que los intervalos tengan sentido y que las tarjetas
// guardadas con el sistema anterior de cajas se conviertan sin perder lo aprendido.
// Uso: node tools/fsrs.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const F = require('../assets/js/fsrs.js');
const DIA = F.DIA, T0 = Date.parse('2026-01-01T10:00:00Z');
const dias = (c, t) => Math.round((c.due - t) / DIA);
const fallas = [];
const ok = (cond, msg) => { if (!cond) fallas.push(msg); };

// 1. tarjeta nueva: no lo sabía → hoy; más o menos → mañana; lo sabía → unos días
ok(dias(F.calificar(null, 1, T0), T0) === 0, 'nueva + "no lo sabía" debe repetirse hoy');
ok(dias(F.calificar(null, 2, T0), T0) === 1, 'nueva + "más o menos" debe volver mañana');
const d3 = dias(F.calificar(null, 3, T0), T0);
ok(d3 >= 2 && d3 <= 6, `nueva + "lo sabía" debe volver en 2 a 6 días (dio ${d3})`);

// 2. acertar siempre, a tiempo: los intervalos crecen y nunca pasan de un año
let c = null, t = T0, prev = 0;
for (let i = 0; i < 8; i++) { c = F.calificar(c, 3, t); const n = dias(c, t); ok(n >= prev, `intervalo ${i + 1} no debe achicarse (${prev} → ${n})`); ok(n <= 365, 'ningún intervalo pasa de 365 días'); prev = n; t = c.due; }
ok(c.b === 5, 'después de 8 aciertos la tarjeta está en la caja 5 (dominada)');

// 3. olvidar baja la estabilidad y sube la dificultad; acertar en la misma sesión no la infla
c = F.calificar(F.calificar(null, 3, T0), 3, T0 + 4 * DIA);
const antes = { s: c.s, d: c.d }, tf = c.due;
const olvido = F.calificar(c, 1, tf);
ok(olvido.s < antes.s && olvido.d > antes.d, 'olvidar baja la estabilidad y sube la dificultad');
const mismaSesion = F.calificar(olvido, 3, tf + 60000);
ok(Math.abs(mismaSesion.s - olvido.s) < 0.01, 'acertar un minuto después no debe aumentar la estabilidad');
ok(olvido.fallos === 1, 'se cuentan los olvidos');

// 4. "más o menos" da menos tiempo que "lo sabía", y un acierto tardío cuenta más que uno a tiempo
c = F.calificar(null, 3, T0);
ok(dias(F.calificar(c, 2, c.due), c.due) < dias(F.calificar(c, 3, c.due), c.due), '"más o menos" vuelve antes que "lo sabía"');
ok(F.calificar(c, 3, c.due + 10 * DIA).s > F.calificar(c, 3, c.due).s, 'acertar tarde aumenta más la estabilidad');

// 5. conversión del sistema de cajas: una tarjeta en la caja 4 conserva su nivel
const vieja = { b: 4, due: T0 };
const conv = F.normalizar(vieja, T0);
ok(conv.s === 8 && conv.d === 5 && conv.last === T0 - 8 * DIA, 'caja 4 → estabilidad de 8 días');
const tras = F.calificar(vieja, 3, T0);
ok(dias(tras, T0) > 8 && tras.b >= 4, `caja 4 + "lo sabía" vuelve en más de 8 días y sigue dominada (dio ${dias(tras, T0)} días, caja ${tras.b})`);
ok(F.calificar({ b: 5, due: T0 }, 1, T0).b < 5, 'una tarjeta dominada que se olvida baja de nivel');

// 6. textos de los botones
ok(JSON.stringify(F.anticipo(null, T0)) === JSON.stringify({ 1: 'otra vez hoy', 2: 'mañana', 3: `en ${d3} días` }), 'textos de anticipo de una tarjeta nueva');
ok(F.textoDias(45) === 'en 2 meses' && F.textoDias(400) === 'en 1 año', 'textos de meses y años');

fallas.forEach((f) => console.log('  ✗ ' + f));
console.log(fallas.length ? `${fallas.length} pruebas de FSRS fallan` : 'FSRS: todas las pruebas pasan');
process.exit(fallas.length ? 1 : 0);
