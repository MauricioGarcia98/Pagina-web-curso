// Repaso espaciado con FSRS (Free Spaced Repetition Scheduler), versión 4.5, con sus parámetros por defecto.
// Implementado a partir de la descripción pública del algoritmo (open-spaced-repetition, licencia MIT):
// https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
//
// Cada tarjeta guarda dos números:
//  - estabilidad (s): cuántos días pasan hasta que la probabilidad de recordarla baja al 90 %;
//  - dificultad (d): de 1 a 10, cuánto le cuesta a esta persona esa tarjeta.
// Con cada respuesta se recalculan, y la tarjeta vuelve justo cuando la probabilidad de recordarla baja al 90 %.
// A diferencia de las cajas fijas (1, 2, 4, 8, 16 días), los intervalos crecen más rápido en lo que ya sabes y
// más lento en lo que te cuesta, y un repaso hecho tarde (pero acertado) cuenta más que uno a tiempo.
//
// Notas del curso: 1 = no lo sabía, 2 = más o menos, 3 = lo sabía (en FSRS: Again, Hard, Good).
(function (raiz) {
  const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
  const DECAY = -0.5, FACTOR = 19 / 81, RETENCION = 0.9, MAX_DIAS = 365, DIA = 864e5;
  const INTERVALO_CAJA = [0, 1, 2, 4, 8, 16];   // el sistema anterior, para convertir las tarjetas guardadas
  const acotarD = (d) => Math.min(10, Math.max(1, d));
  const d0 = (g) => acotarD(W[4] - (g - 3) * W[5]);
  // probabilidad de recordar después de t días con estabilidad s
  const recuerdo = (t, s) => Math.pow(1 + FACTOR * t / s, DECAY);
  // días hasta que la probabilidad baja a la retención buscada (con 0,9 da exactamente s)
  const diasPara = (s) => Math.min(MAX_DIAS, Math.max(1, Math.round((s / FACTOR) * (Math.pow(RETENCION, 1 / DECAY) - 1))));
  // "caja" de 1 a 5 según la estabilidad, para las estadísticas (4 o más = dominada: aguanta una semana o más)
  const cajaDe = (s) => (s >= 21 ? 5 : s >= 7.5 ? 4 : s >= 3 ? 3 : s >= 1.5 ? 2 : 1);

  // convierte una tarjeta del sistema de cajas ({ b, due }) sin perder lo aprendido
  function normalizar(c, ahora) {
    if (!c) return null;
    if (typeof c.s === 'number' && typeof c.d === 'number') return c;
    const s = INTERVALO_CAJA[Math.min(5, Math.max(1, c.b || 1))];
    return { ...c, s, d: 5, last: Math.min(ahora, (c.due || ahora) - s * DIA), n: c.n || 1 };
  }

  // nuevo estado de la tarjeta después de responder con la nota g (1, 2 o 3) en el momento "ahora" (ms)
  function calificar(previa, g, ahora = Date.now()) {
    g = Math.min(3, Math.max(1, Math.round(g)));
    const c = normalizar(previa, ahora);
    let s, d;
    if (!c) { s = W[g - 1]; d = d0(g); }
    else {
      const t = Math.max(0, (ahora - (c.last || ahora)) / DIA), r = recuerdo(t, c.s);
      if (g === 1) s = Math.min(c.s, W[11] * Math.pow(c.d, -W[12]) * (Math.pow(c.s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)));
      else s = c.s * (1 + Math.exp(W[8]) * (11 - c.d) * Math.pow(c.s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * (g === 2 ? W[15] : 1));
      d = acotarD(W[7] * d0(4) + (1 - W[7]) * (c.d - W[6] * (g - 3)));
    }
    s = Math.max(0.1, s);
    // "no lo sabía": se repite en esta misma sesión (vence ahora); si no, vuelve en los días que calcula FSRS
    const dias = g === 1 ? 0 : diasPara(s);
    return { b: cajaDe(s), due: ahora + dias * DIA, s: +s.toFixed(4), d: +d.toFixed(4), last: ahora, n: ((c && c.n) || 0) + 1, fallos: ((c && c.fallos) || 0) + (g === 1 ? 1 : 0) };
  }

  // texto corto de cuándo vuelve la tarjeta con cada nota, para mostrarlo en los botones
  function textoDias(dias) {
    if (dias <= 0) return 'otra vez hoy';
    if (dias === 1) return 'mañana';
    if (dias < 30) return `en ${dias} días`;
    const m = Math.round(dias / 30);
    return m <= 1 ? 'en 1 mes' : m < 12 ? `en ${m} meses` : 'en 1 año';
  }
  function anticipo(previa, ahora = Date.now()) {
    const out = {};
    for (const g of [1, 2, 3]) out[g] = textoDias(Math.round((calificar(previa, g, ahora).due - ahora) / DIA));
    return out;
  }

  const FSRS = { calificar, anticipo, recuerdo, normalizar, textoDias, W, DIA };
  if (typeof module !== 'undefined' && module.exports) module.exports = FSRS;
  else raiz.FSRS = FSRS;
})(typeof window !== 'undefined' ? window : globalThis);
