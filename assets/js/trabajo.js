/* Tu primer trabajo (#/trabajo): una semana simulada en el equipo de datos de Tienda Andina.
 *
 * Lo que los ejercicios sueltos no enseñan: los pedidos llegan ambiguos por chat y hay que preguntar
 * antes de escribir una línea; lo que entregas pasa por un pull request y un senior te pide cambios;
 * y a las 3 de la mañana algo se rompe y hay que investigar, arreglar y escribir el postmortem.
 *
 * Lunes DATA-101 (SQL) · Martes DATA-102 (SQL) · Miércoles incidente · Jueves DATA-103 (Python + API)
 * · Viernes: resumen con lo que hiciste bien y qué practicar. El progreso se guarda en el navegador.
 */
(function () {
  'use strict';
  const GENTE = {
    martin: { n: 'Martín', rol: 'líder técnico', av: '🧔' },
    valeria: { n: 'Valeria', rol: 'gerente comercial', av: '👩‍💼' },
    lucia: { n: 'Lucía', rol: 'marketing', av: '👩‍🎨' },
    camila: { n: 'Camila', rol: 'data engineer', av: '👩‍💻' },
    bot: { n: 'alertas-datos', rol: 'bot de monitoreo', av: '🚨' },
    tu: { n: 'Tú', rol: 'data engineer junior', av: '🙂' },
  };

  // ---------------------------------------------------------------- los tickets
  const TICKETS = [
    {
      id: 'DATA-101', dia: 'Lunes', tipo: 'sql', de: 'valeria', titulo: 'Ventas por país del mes pasado',
      pedido: '¡Hola! ¿Me pasás las ventas por país del mes pasado? Es para la reunión de directorio del jueves 🙏',
      preguntas: [
        ['¿"Mes pasado" es diciembre de 2024 completo, del 1 al 31?', true, 'Sí, diciembre completo.'],
        ['¿Cuento los pedidos cancelados y devueltos?', true, 'No, solo lo que realmente vendimos: entregados y enviados.'],
        ['¿El monto va con el descuento aplicado, o es el precio de lista?', true, 'Con descuento: lo que pagó el cliente.'],
        ['¿Lo querés en Excel o en PDF?', false, 'Me da igual, pásamelo por acá 😅'],
        ['¿Uso Python o SQL?', false, 'Ni idea, eso decidilo vos 🙃'],
      ],
      criterios: ['Pedidos de diciembre de 2024 (1 al 31)', 'Solo estados entregado y enviado', 'Monto con descuento: cantidad × precio_unitario × (1 − descuento)', 'Columnas: pais y ventas (redondeado a 2 decimales)'],
      tablas: 'pedidos, detalle_pedidos, clientes',
      inicial: '-- DATA-101: ventas por país, diciembre 2024\nSELECT c.pais\nFROM pedidos p\n',
      solucion: `SELECT c.pais, ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
JOIN clientes c ON c.cliente_id = p.cliente_id
WHERE p.fecha_pedido BETWEEN '2024-12-01' AND '2024-12-31'
  AND p.estado IN ('entregado', 'enviado')
GROUP BY c.pais`,
      // errores típicos: si el resultado coincide con alguna de estas variantes, se explica qué faltó
      variantes: [
        [`SELECT c.pais, ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id JOIN clientes c ON c.cliente_id = p.cliente_id WHERE p.fecha_pedido BETWEEN '2024-12-01' AND '2024-12-31' GROUP BY c.pais`, 'Los totales salen más altos: estás contando pedidos cancelados, devueltos o pendientes. Valeria pidió solo entregados y enviados.'],
        [`SELECT c.pais, ROUND(SUM(d.cantidad * d.precio_unitario), 2) AS ventas FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id JOIN clientes c ON c.cliente_id = p.cliente_id WHERE p.fecha_pedido BETWEEN '2024-12-01' AND '2024-12-31' AND p.estado IN ('entregado','enviado') GROUP BY c.pais`, 'Casi: te falta aplicar el descuento. Lo que pagó el cliente es cantidad × precio_unitario × (1 − descuento).'],
      ],
      revisor: [
        [/select\s+\*/i, 'Evitemos `SELECT *` en algo que va a directorio: si mañana agregan una columna, el reporte cambia sin aviso. Nombrá las columnas.'],
        [(s) => !/round\s*\(/i.test(s), 'Redondeá las ventas a 2 decimales: en la presentación no queremos 1234.5678912.'],
        [(s) => /sum\s*\([^)]*\)\s*(,|\n|from)/i.test(s) && !/sum\s*\(.*\)\s*\)?\s*as\s+\w+/i.test(s), 'Poné un alias a la columna calculada (`AS ventas`): si no, el archivo exportado tiene un encabezado ilegible.'],
      ],
    },
    {
      id: 'DATA-102', dia: 'Martes', tipo: 'sql', de: 'lucia', titulo: 'Clientes que dejaron de comprar',
      pedido: 'Buenas! Necesito la lista de clientes que dejaron de comprar, para mandarles un cupón de regreso 💌',
      preguntas: [
        ['¿Cuántos días sin comprar cuentan como "dejó de comprar"? ¿Desde qué fecha cuento?', true, '90 días o más sin comprar, contando hasta el 31/12/2024.'],
        ['¿Incluyo a los clientes que nunca compraron?', true, 'No, esos no "dejaron" de comprar: nunca empezaron. Esos van a otra campaña.'],
        ['¿Necesitás el email? ¿Qué hago con los que no tienen?', true, 'Sí, el email y la fecha de la última compra. Los que no tienen email no me sirven (no les llega el cupón).'],
        ['¿Cuento solo los pedidos entregados?', false, 'Mmm, no sé, cualquier pedido cuenta como compra para esto.'],
        ['¿A qué hora mando el email?', false, 'Eso lo vemos en marketing 😉'],
      ],
      criterios: ['Clientes con al menos un pedido (cualquier estado)', 'Última compra hace 90 días o más respecto del 2024-12-31 (última compra ≤ 2024-10-02)', 'Solo clientes con email', 'Columnas: cliente_id, email, ultima_compra'],
      tablas: 'clientes, pedidos',
      inicial: '-- DATA-102: clientes inactivos 90+ días al 2024-12-31\nSELECT c.cliente_id\nFROM clientes c\n',
      solucion: `SELECT c.cliente_id, c.email, MAX(p.fecha_pedido) AS ultima_compra
FROM clientes c
JOIN pedidos p ON p.cliente_id = c.cliente_id
WHERE c.email IS NOT NULL
GROUP BY c.cliente_id, c.email
HAVING MAX(p.fecha_pedido) <= date('2024-12-31', '-90 days')`,
      variantes: [
        [`SELECT c.cliente_id, c.email, MAX(p.fecha_pedido) AS ultima_compra FROM clientes c JOIN pedidos p ON p.cliente_id = c.cliente_id GROUP BY c.cliente_id, c.email HAVING MAX(p.fecha_pedido) <= date('2024-12-31', '-90 days')`, 'Te sobran filas: hay clientes sin email. Lucía pidió solo los que tienen (si no, el cupón no les llega).'],
        [`SELECT c.cliente_id, c.email, MAX(p.fecha_pedido) AS ultima_compra FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id WHERE c.email IS NOT NULL GROUP BY c.cliente_id, c.email HAVING MAX(p.fecha_pedido) <= date('2024-12-31', '-90 days') OR MAX(p.fecha_pedido) IS NULL`, 'Estás incluyendo a quienes nunca compraron. Lucía los quiere fuera: usa JOIN en vez de LEFT JOIN.'],
        [`SELECT c.cliente_id, c.email, MAX(p.fecha_pedido) AS ultima_compra FROM clientes c JOIN pedidos p ON p.cliente_id = c.cliente_id WHERE c.email IS NOT NULL AND p.estado = 'entregado' GROUP BY c.cliente_id, c.email HAVING MAX(p.fecha_pedido) <= date('2024-12-31', '-90 days')`, 'Filtraste por estado: para esta campaña cualquier pedido cuenta como compra (si no, alguien que compró la semana pasada y todavía no le llegó recibiría el cupón).'],
      ],
      revisor: [
        [/select\s+\*/i, 'Nada de `SELECT *` en una lista que va a una herramienta de email: le estaríamos mandando datos personales que no necesita (teléfono, fecha de nacimiento…).'],
        [(s) => !/^\s*--/m.test(s), 'Nit (opcional): un comentario arriba con la definición ("inactivo = 90+ días sin compras al 31/12") le ahorra la pregunta al próximo que lo lea.', true],
        [/'2024-10-0[1-3]'/, 'Calculá la fecha límite en vez de escribirla a mano (`date(\'2024-12-31\', \'-90 days\')`): si cambian los 90 días, se cambia en un solo lugar.'],
      ],
    },
    {
      id: 'DATA-103', dia: 'Jueves', tipo: 'python', de: 'martin', titulo: 'Resumen de pedidos de la API del marketplace',
      pedido: 'Necesito una función `resumen_por_estado()` que traiga los pedidos del marketplace por la API y devuelva cuántos hay en cada estado. Va a correr en Airflow todos los días.',
      preguntas: [
        ['¿Desde qué fecha traigo los pedidos?', true, 'Desde el 2024-10-15 (parámetro `desde` de la API).'],
        ['La API manda reenvíos: ¿cuento cada pedido una sola vez?', true, 'Sí, una vez por id. Ojo que el duplicado existe de verdad.'],
        ['¿Qué hago si la API responde 429 o se vence el token?', true, 'Lo de siempre: con 429 esperás lo que dice Retry-After; con 401 pedís token nuevo. Nada de reventar el DAG por eso.'],
        ['¿Lo escribo en Java?', false, 'Python, como todo el repo 😄'],
        ['¿Dónde guardo el secreto?', true, 'Nunca en el código. En este entorno ya está la variable de entorno `TIENDA_SECRETO` (en Airflow sería una Connection): leela con `os.environ["TIENDA_SECRETO"]`.'],
      ],
      criterios: ['Función resumen_por_estado() que devuelve un diccionario {estado: cantidad}', 'Pedidos desde 2024-10-15 (parámetro desde)', 'Cada id una sola vez (hay un reenvío duplicado)', 'Maneja 401 (token nuevo) y 429 (esperar Retry-After)', 'El secreto se lee de la variable de entorno TIENDA_SECRETO, no se escribe en el código'],
      tablas: 'API https://api.tiendaandina.dev/v1 (POST /token, GET /pedidos con cursor)',
      inicial: `import time, requests
BASE = "https://api.tiendaandina.dev/v1"
CRED = {"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"}

def resumen_por_estado():
    ...
`,
      solucion: `import time, requests
BASE = "https://api.tiendaandina.dev/v1"
CRED = {"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"}

def _pedir(metodo, url, **kw):
    while True:
        r = requests.request(metodo, url, **kw)
        if r.status_code == 429:
            time.sleep(int(r.headers.get("Retry-After", "1")))
            continue
        return r

def _token():
    r = _pedir("POST", f"{BASE}/token", json=CRED)
    r.raise_for_status()
    return r.json()["access_token"]

def resumen_por_estado():
    token, cursor, vistos, conteo = _token(), None, set(), {}
    while True:
        params = {"limit": 50, "desde": "2024-10-15"}
        if cursor:
            params["cursor"] = cursor
        r = _pedir("GET", f"{BASE}/pedidos", params=params, headers={"Authorization": f"Bearer {token}"})
        if r.status_code == 401:
            token = _token()
            continue
        r.raise_for_status()
        cuerpo = r.json()
        for p in cuerpo["datos"]:
            if p["id"] in vistos:
                continue
            vistos.add(p["id"])
            conteo[p["estado"]] = conteo.get(p["estado"], 0) + 1
        cursor = cuerpo["siguiente_cursor"]
        if cursor is None:
            return conteo
`,
      test: `from js import ApiTienda
_vistos, _esperado = set(), {}
for _p in ApiTienda.pedidos:
    if _p.creado[:10] >= "2024-10-15" and _p.id not in _vistos:
        _vistos.add(_p.id); _esperado[_p.estado] = _esperado.get(_p.estado, 0) + 1
assert "resumen_por_estado" in dir(), "Define la función resumen_por_estado()"
_r = resumen_por_estado()
assert isinstance(_r, dict), f"resumen_por_estado() debe devolver un diccionario y devolvió {type(_r).__name__}"
_total, _esp = sum(_r.values()), sum(_esperado.values())
assert _total != _esp + 1, "Contaste un pedido dos veces: la API manda un reenvío duplicado. Deduplica por id."
assert _total != len([p for p in ApiTienda.pedidos]) and _total != 137, "Estás trayendo pedidos de antes del 2024-10-15: usa el parámetro desde."
assert _r == _esperado, f"Esperaba {_esperado} y obtuve {_r}"
`,
      revisor: [
        [/s3cr3t0-de-practica/, 'El secreto quedó escrito en el código: en el repo real esto es una filtración. Leelo de `os.environ` (por ejemplo `os.environ.get("TIENDA_SECRETO")`) o de una Connection de Airflow.'],
        [(s) => !/raise_for_status|status_code\s*[!=]=\s*200/.test(s), 'Si la API devuelve 500, tu código sigue como si nada y guarda basura. Agregá `r.raise_for_status()` (o revisá el status) antes de usar la respuesta.'],
        [(s) => /while True:/.test(s) && !/sleep\(/.test(s), 'Hay un `while True` sin espera: si la API devuelve 429 seguido, lo martillamos. Esperá lo que dice `Retry-After`.'],
      ],
    },
  ];

  // ---------------------------------------------------------------- el incidente del miércoles
  const INCIDENTE = {
    alerta: '🔴 [ALERTA] fct_ventas_diarias: el 2024-12-30 tiene 31 % menos pedidos que el promedio de los últimos 7 días (umbral: 25 %). Dueño: equipo de datos.',
    pasos: [
      { tipo: 'opcion', titulo: 'Son las 3:12. ¿Qué haces primero?', ops: [
        ['Re-corro el pipeline completo, por las dudas', false, 'Re-correr sin entender qué pasó puede pisar datos buenos o repetir el error. Primero se mira.'],
        ['Aviso en #datos que estoy mirando la alerta y abro el log de la última corrida', true, '¡Bien! Avisar evita que dos personas investiguen lo mismo, y el log es la primera pista.'],
        ['Borro la tabla y la recreo', false, 'Nunca borres sin saber qué pasó: perderías la evidencia y el dato bueno.'],
        ['Lo dejo para mañana: total, nadie mira el tablero de madrugada', false, 'Directorio lo mira a las 8. Si no está, te lo preguntan a vos. Al menos avisá y evaluá el impacto.'],
      ] },
      { tipo: 'log', titulo: 'El log de la corrida', texto: `2024-12-31 03:00:02 INFO  carga_silver_pedidos: inicio (fecha=2024-12-30)
2024-12-31 03:00:04 INFO  leyendo bronze_pedidos WHERE fecha LIKE '2024-12-30%'
2024-12-31 03:00:05 INFO  filas leídas: 16
2024-12-31 03:00:05 WARN  filas descartadas por formato de fecha: 0 (no se validan otros formatos)
2024-12-31 03:00:06 INFO  escritas 16 filas en silver_pedidos (fecha=2024-12-30)
2024-12-31 03:00:06 INFO  carga_silver_pedidos: OK` },
      { tipo: 'sql', titulo: 'Confirma la hipótesis con datos', enunciado: 'El filtro `LIKE \'2024-12-30%\'` solo encuentra las fechas en formato ISO. En `bronze_pedidos` la app también manda `30/12/2024 …` y `2024-12-30T…Z`. Cuenta **todos** los registros del 30 de diciembre de 2024 en cualquier formato (columna `registros`).',
        inicial: "SELECT COUNT(*) AS registros\nFROM bronze_pedidos\nWHERE fecha LIKE '2024-12-30%';",
        solucion: "SELECT COUNT(*) AS registros FROM bronze_pedidos WHERE (CASE WHEN fecha LIKE '__/__/____%' THEN substr(fecha, 7, 4) || '-' || substr(fecha, 4, 2) || '-' || substr(fecha, 1, 2) ELSE substr(fecha, 1, 10) END) = '2024-12-30';" },
      { tipo: 'opcion', titulo: '¿Cómo lo arreglas?', ops: [
        ['Normalizo la fecha en la carga (los tres formatos) y vuelvo a correr el día 30 de forma idempotente (reemplazando la partición)', true, 'Exacto: arreglás la causa y re-procesás sin duplicar. Y agregás un test que falle si llega un formato desconocido.'],
        ['Le pido a la app que deje de mandar otros formatos y espero', false, 'Hay que pedírselo (es la solución de fondo), pero mientras tanto el dato de directorio sigue mal. Las dos cosas.'],
        ['Inserto a mano las filas que faltan en silver', false, 'Arreglo manual = nadie sabe que pasó, y mañana vuelve a pasar. El pipeline tiene que poder reproducir el dato solo.'],
        ['Bajo el umbral de la alerta a 40 % para que no suene', false, 'Eso es apagar el detector de humo porque hace ruido. El dato estaba mal: la alerta funcionó.'],
      ] },
      { tipo: 'postmortem', titulo: 'El postmortem', enunciado: 'Escribe el postmortem (sin culpas: describe el sistema, no a las personas). Martín lo va a leer en la reunión del viernes.',
        rubrica: ['Qué pasó y cuándo (línea de tiempo corta)', 'Impacto: qué dato estuvo mal, cuánto y para quién', 'Causa raíz: el filtro solo aceptaba un formato de fecha', 'Cómo se detectó (la alerta de volumen)', 'Qué se hizo para arreglarlo (normalizar y re-procesar el día)', 'Qué se cambia para que no vuelva (test de formatos, contrato con la app)'] },
    ],
  };

  // ---------------------------------------------------------------- estado
  const NUEVO = () => ({ paso: 0, fase: 'aclarar', chat: [], puntos: { aclarar: 0, aclarar_max: 0, intentos: [], review: 0, incidente: 0 }, codigo: {}, preg: {}, pr: {}, inc: { i: 0 } });
  function vista(main, ctx) {
    const { h, esc, Store, createEditor, renderSqlOutput, ensureSql, toast } = ctx;
    const E = window.Engines;
    Store.data.trabajo = Store.data.trabajo || NUEVO();
    let S = Store.data.trabajo;
    const save = () => Store.saveSoon();
    const hora = () => { const base = [9, 10, 11, 14, 15, 16][S.chat.length % 6]; return `${String(base).padStart(2, '0')}:${String((S.chat.length * 7) % 60).padStart(2, '0')}`; };
    const decir = (de, txt) => { S.chat.push({ de, txt, h: hora() }); save(); };
    const md = (t) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    const etapas = () => [...TICKETS.slice(0, 2).map((t) => `${t.dia} · ${t.id}`), 'Miércoles · 🚨 guardia', `${TICKETS[2].dia} · ${TICKETS[2].id}`, 'Viernes · resumen'];
    const idxEtapa = () => (S.paso <= 1 ? S.paso : S.paso === 2 ? 2 : S.paso === 3 ? 3 : 4);
    const ticket = () => (S.paso === 0 ? TICKETS[0] : S.paso === 1 ? TICKETS[1] : S.paso === 3 ? TICKETS[2] : null);

    if (!S.chat.length) {
      decir('martin', '¡Bienvenido/a al equipo! 🎉 Esta semana vas a trabajar como cualquiera de nosotros: los pedidos llegan por acá, se resuelven en un ticket, pasan por pull request y yo los reviso. Y el miércoles te toca la guardia 😬');
      decir('martin', 'Un consejo: **antes de escribir código, preguntá**. La mitad de los errores son por entender mal el pedido.');
      decir(TICKETS[0].de, TICKETS[0].pedido);
    }

    main.innerHTML = `<div class="container wide trabajo">
      <div class="tb-cab"><div><h1 style="margin:0">💼 Tu primer trabajo</h1><p class="muted" style="margin:2px 0 0">Una semana en el equipo de datos de Tienda Andina: pedidos ambiguos, pull requests con revisión y una guardia.</p></div><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="tbReset">↺ Empezar la semana de nuevo</button></div>
      <ol class="tb-semana">${etapas().map((e, i) => `<li class="${i < idxEtapa() ? 'hecho' : i === idxEtapa() ? 'actual' : ''}">${esc(e)}</li>`).join('')}</ol>
      <div class="tb-grid"><section class="card tb-chat"><div class="tb-chat-cab"># datos <span class="muted small">· 6 miembros</span></div><div class="tb-msgs" id="tbMsgs"></div></section><section class="tb-work" id="tbWork"></section></div>
    </div>`;
    const $ = (s) => main.querySelector(s);
    $('#tbReset').addEventListener('click', () => { if (!confirm('¿Empezar la semana de nuevo? Se borra el progreso de esta simulación.')) return; Store.data.trabajo = NUEVO(); save(); vista(main, ctx); });

    function pintarChat() {
      $('#tbMsgs').innerHTML = S.chat.map((m) => { const g = GENTE[m.de]; return `<div class="tb-msg ${m.de === 'tu' ? 'yo' : ''} ${m.de === 'bot' ? 'alerta' : ''}"><span class="tb-av">${g.av}</span><div><div class="tb-msg-cab"><b>${esc(g.n)}</b> <span class="muted small">${esc(g.rol)} · ${m.h}</span></div><div class="tb-msg-txt">${md(m.txt)}</div></div></div>`; }).join('');
      $('#tbMsgs').scrollTop = 1e9;
    }
    const tarjeta = (t, extra = '') => `<div class="card tb-ticket"><div class="tb-ticket-cab"><span class="badge b-type">${t.id}</span><b>${esc(t.titulo)}</b><span class="spacer"></span><span class="small muted">pedido por ${esc(GENTE[t.de].n)} (${esc(GENTE[t.de].rol)})</span></div>${extra}</div>`;
    const criteriosHtml = (t) => `<div class="tb-crit"><div class="small muted" style="margin-bottom:4px">Criterios de aceptación</div><ul>${t.criterios.map((c) => `<li>${md(c)}</li>`).join('')}</ul><div class="small muted">Datos: ${esc(t.tablas)}</div></div>`;

    function render() {
      pintarChat();
      const w = $('#tbWork');
      const t = ticket();
      if (S.paso === 2) return renderIncidente(w);
      if (S.paso >= 4) return renderResumen(w);
      if (S.fase === 'aclarar') {
        w.innerHTML = tarjeta(t, `<p class="tb-pedido">“${md(t.pedido)}”</p><div class="tb-paso"><h3>1. Antes de escribir código: ¿qué preguntas?</h3><p class="muted small">Elige hasta 3 preguntas. Las buenas cambian el resultado; las que no, gastan el tiempo de la otra persona.</p>${t.preguntas.map((p, i) => `<label class="auto-item"><input type="checkbox" data-q="${i}"><span>${md(p[0])}</span></label>`).join('')}<div class="row" style="margin-top:10px"><button class="btn btn-primary" id="tbPreg">Enviar preguntas</button><span class="small muted" id="tbPregN"></span></div></div>`);
        const cbs = [...w.querySelectorAll('[data-q]')];
        const n = () => cbs.filter((c) => c.checked).length;
        cbs.forEach((c) => c.addEventListener('change', () => { if (n() > 3) { c.checked = false; toast('Máximo 3: en un chat, preguntar de más también cansa.'); } $('#tbPregN').textContent = `${n()}/3`; }));
        $('#tbPreg').addEventListener('click', () => {
          const sel = cbs.filter((c) => c.checked).map((c) => Number(c.dataset.q));
          if (!sel.length) { toast('Elige al menos una pregunta. Arrancar sin preguntar es el error más común.'); return; }
          const buenas = t.preguntas.filter((p) => p[1]).length;
          let pts = 0;
          for (const i of sel) { const p = t.preguntas[i]; decir('tu', p[0]); decir(t.de, p[2]); pts += p[1] ? 1 : -0.5; }
          const faltan = t.preguntas.filter((p, i) => p[1] && !sel.includes(i));
          if (faltan.length) decir('martin', `Ojo, también hacía falta aclarar: ${faltan.map((p) => `“${p[0]}” (${p[2]})`).join(' ')}`);
          else decir('martin', '👌 Buenas preguntas. Así se arranca un ticket.');
          S.puntos.aclarar += Math.max(0, pts); S.puntos.aclarar_max += Math.min(3, buenas);
          S.fase = 'resolver'; save(); render();
        });
        return;
      }
      if (S.fase === 'resolver') {
        w.innerHTML = tarjeta(t, criteriosHtml(t) + `<div class="tb-paso"><h3>2. Resuélvelo</h3><div id="tbEd"></div><div class="ex-tools"><button class="btn" id="tbRun">▶ Ejecutar</button><button class="btn btn-ok" id="tbOk">✓ Entregar para el PR</button><span class="spacer"></span><span class="small muted" id="tbInt"></span></div><div class="output" id="tbOut"></div></div>`);
        const ed = createEditor($('#tbEd'), { lang: t.tipo === 'sql' ? 'sql' : 'python', value: S.codigo[t.id] ?? t.inicial, tall: true, onRun: () => correr(), onChange: (v) => { S.codigo[t.id] = v; save(); } });
        const out = $('#tbOut'); let intentos = S.puntos.intentos[S.paso] || 0;
        const pintarInt = () => { $('#tbInt').textContent = intentos ? `${intentos} entrega(s) sin aprobar` : ''; };
        pintarInt();
        async function correr() {
          if (t.tipo === 'sql') { if (!(await ensureSql(out))) return; renderSqlOutput(out, E.SQL.exec(ed.getValue())); }
          else { out.innerHTML = '<div class="out-meta">Ejecutando…</div>'; const r = await E.PY.run('python', ed.getValue() + '\nprint(resumen_por_estado())'); out.innerHTML = `<pre class="console">${esc((r.stdout || '') + (r.error ? '\n' + r.error : ''))}</pre>`; }
        }
        $('#tbRun').addEventListener('click', correr);
        $('#tbOk').addEventListener('click', async () => {
          const r = await calificar(t, ed.getValue(), out);
          if (r.ok) { S.codigo[t.id] = ed.getValue(); S.fase = 'pr'; save(); decir('tu', `Listo ${t.id}, abro el PR 🙌`); render(); return; }
          intentos++; S.puntos.intentos[S.paso] = intentos; save(); pintarInt();
          if (intentos >= 4) out.insertAdjacentHTML('beforeend', `<details class="tb-sol"><summary>Ver una solución posible</summary><pre><code>${esc(t.solucion)}</code></pre></details>`);
        });
        return;
      }
      if (S.fase === 'pr') {
        const pr = S.pr[t.id] || { titulo: '', desc: '' };
        w.innerHTML = tarjeta(t, `<div class="tb-paso"><h3>3. Abre el pull request</h3><p class="muted small">Un buen PR se revisa en minutos: título con el ticket, qué cambia, por qué y cómo lo probaste.</p><label class="tb-campo">Título<input id="tbPrT" value="${esc(pr.titulo)}" placeholder="${t.id}: …"></label><label class="tb-campo">Descripción<textarea id="tbPrD" rows="6" placeholder="Qué hace, decisiones tomadas y cómo lo probaste">${esc(pr.desc)}</textarea></label><div class="row"><button class="btn btn-primary" id="tbPrGo">Abrir pull request</button></div><div id="tbPrMsg"></div></div>`);
        $('#tbPrGo').addEventListener('click', () => {
          const titulo = $('#tbPrT').value.trim(), desc = $('#tbPrD').value.trim(), faltas = [];
          if (!titulo.includes(t.id)) faltas.push(`el título debería incluir el ticket (${t.id}) para que quede enlazado`);
          if (titulo.length < 15) faltas.push('el título es muy corto: que diga qué hace');
          if (desc.length < 60) faltas.push('la descripción es muy corta: explica qué cambia y por qué');
          if (!/prob[éeó]|valid[éeó]|test|verifiqu|compar[éeó]|chequ/i.test(desc)) faltas.push('falta decir cómo lo probaste (por ejemplo: "comparé el total con el tablero" o "corrí los tests")');
          S.pr[t.id] = { titulo, desc }; save();
          if (faltas.length) { $('#tbPrMsg').innerHTML = `<div class="ex-feedback bad" style="margin-top:10px">Antes de pedir revisión: ${faltas.map(esc).join('; ')}.</div>`; return; }
          decir('tu', `PR abierto: **${titulo}** · @Martín ¿lo podés revisar?`);
          S.fase = 'review'; S.ronda = 0; save(); render();
        });
        return;
      }
      if (S.fase === 'review') {
        const codigo = S.codigo[t.id] || '';
        const coms = t.revisor.map(([regla, txt, opcional]) => ({ txt, opcional: !!opcional, activo: typeof regla === 'function' ? regla(codigo) : regla.test(codigo) })).filter((c) => c.activo);
        const bloqueantes = coms.filter((c) => !c.opcional);
        if (S.ronda === 0 || S.ultimoReview !== codigo) {
          S.ultimoReview = codigo; S.ronda = (S.ronda || 0) + 1;
          if (bloqueantes.length) decir('martin', `Dejé ${coms.length} comentario${coms.length > 1 ? 's' : ''} en el PR (${bloqueantes.length} para cambiar). Nada grave, así es siempre 😉`);
          save();
        }
        if (!bloqueantes.length) {
          const nits = coms.filter((c) => c.opcional);
          decir('martin', `✅ Aprobado${nits.length ? ' (dejé un nit opcional, lo podés ver)' : ''}. Mergeado a main. ${S.ronda <= 1 ? '¡Al primer intento! 👏' : 'Bien resueltos los comentarios.'}`);
          S.puntos.review += S.ronda <= 1 ? 2 : S.ronda === 2 ? 1.5 : 1;
          avanzar(); return;
        }
        w.innerHTML = tarjeta(t, `<div class="tb-paso"><h3>4. Revisión de código</h3><div class="tb-pr"><div class="tb-pr-cab">🔀 <b>${esc((S.pr[t.id] || {}).titulo || '')}</b> <span class="badge">abierto</span></div>${coms.map((c) => `<div class="tb-com ${c.opcional ? 'nit' : ''}"><span class="tb-av">${GENTE.martin.av}</span><div><b>Martín</b> <span class="small muted">${c.opcional ? 'comentario opcional' : 'pidió cambios'}</span><div>${md(c.txt)}</div></div></div>`).join('')}</div><p class="small muted">Corrige el código y sube los cambios. El revisor vuelve a mirar todo (y el resultado tiene que seguir siendo correcto).</p><div id="tbEd"></div><div class="ex-tools"><button class="btn btn-primary" id="tbPush">⬆ Subir cambios al PR</button></div><div class="output" id="tbOut"></div></div>`);
        const ed = createEditor($('#tbEd'), { lang: t.tipo === 'sql' ? 'sql' : 'python', value: codigo, tall: true });
        $('#tbPush').addEventListener('click', async () => {
          const r = await calificar(t, ed.getValue(), $('#tbOut'));
          if (!r.ok) { toast('El cambio rompió el resultado: revisa antes de subir.'); return; }
          S.codigo[t.id] = ed.getValue(); save(); decir('tu', 'Subí los cambios 👍'); render();
        });
      }
    }
    async function calificar(t, codigo, out) {
      if (t.tipo === 'sql') {
        if (!(await ensureSql(out))) return { ok: false };
        const r = E.SQL.exec(codigo);
        renderSqlOutput(out, r);
        if (r.ok === false) return { ok: false };
        const res = E.SQL.runForGrade(codigo).result, espRes = E.SQL.runForGrade(t.solucion).result;
        const cmp = E.compareResults(res, espRes, false);
        if (cmp.pass) { out.insertAdjacentHTML('afterbegin', '<div class="ex-feedback ok">✓ El resultado coincide con lo que pidió el negocio.</div>'); return { ok: true }; }
        for (const [sqlVar, msg] of t.variantes || []) {
          const vr = E.SQL.runForGrade(sqlVar).result;
          if (vr && E.compareResults(res, vr, false).pass) { out.insertAdjacentHTML('afterbegin', `<div class="ex-feedback bad">${md(msg)}</div>`); return { ok: false }; }
        }
        out.insertAdjacentHTML('afterbegin', `<div class="ex-feedback bad">${esc(cmp.msg || 'El resultado no coincide.')} Revisa los criterios de aceptación del ticket, uno por uno.</div>`);
        return { ok: false };
      }
      out.innerHTML = '<div class="out-meta">Corriendo las pruebas (y la API)…</div>';
      const r = await E.PY.grade('python', { solucion: t.solucion, test: t.test }, codigo);
      out.innerHTML = r.pass ? '<div class="ex-feedback ok">✓ Las pruebas pasaron.</div>' : `<div class="ex-feedback bad">${esc(r.msg || r.error || 'Las pruebas no pasaron.')}</div>${r.stdout ? `<pre class="console">${esc(r.stdout)}</pre>` : ''}`;
      return { ok: !!r.pass };
    }
    function avanzar() {
      S.paso++; S.fase = 'aclarar'; S.ronda = 0; S.ultimoReview = null;
      if (S.paso === 1) { decir('martin', 'Mañana arrancás con otro ticket. ¡Buen primer día!'); decir(TICKETS[1].de, TICKETS[1].pedido); }
      if (S.paso === 2) { decir('martin', 'Esta noche estás de guardia. Cualquier cosa, el runbook está en la wiki. Buenas noches 🌙'); decir('bot', INCIDENTE.alerta); S.inc = { i: 0 }; }
      if (S.paso === 3) { decir('martin', 'Buen manejo de la guardia. Hoy algo distinto: Python y la API del marketplace.'); decir(TICKETS[2].de, TICKETS[2].pedido); }
      if (S.paso === 4) decir('martin', '¡Terminaste la semana! 🎉 Te dejo mi devolución en el resumen.');
      save(); vista(main, ctx);
    }
    function renderIncidente(w) {
      const paso = INCIDENTE.pasos[S.inc.i];
      const cab = `<div class="card tb-ticket tb-inc"><div class="tb-ticket-cab"><span class="badge b-experto">INC-0042</span><b>Volumen bajo en fct_ventas_diarias</b><span class="spacer"></span><span class="small muted">miércoles 03:12 · tu guardia</span></div>`;
      if (paso.tipo === 'opcion') {
        w.innerHTML = cab + `<div class="tb-paso"><h3>${esc(paso.titulo)}</h3>${paso.ops.map((o, i) => `<button class="tb-op" data-op="${i}">${esc(o[0])}</button>`).join('')}<div id="tbFb"></div></div></div>`;
        w.querySelectorAll('[data-op]').forEach((b) => b.addEventListener('click', () => {
          const o = paso.ops[Number(b.dataset.op)];
          $('#tbFb').innerHTML = `<div class="ex-feedback ${o[1] ? 'ok' : 'bad'}" style="margin-top:10px">${esc(o[2])}</div>`;
          if (!S.inc.fallos) S.inc.fallos = 0;
          if (!o[1]) { S.inc.fallos++; save(); return; }
          if (S.inc.i === 0) decir('tu', 'Estoy mirando la alerta de fct_ventas_diarias 👀');
          if (S.inc.i === 3) decir('tu', 'Corregido: normalicé las fechas en la carga y re-procesé el 30/12 (reemplazando la partición). Abro un ticket para que la app mande un solo formato.');
          S.inc.i++; save();
          setTimeout(render, 900);
        }));
        return;
      }
      if (paso.tipo === 'log') {
        w.innerHTML = cab + `<div class="tb-paso"><h3>${esc(paso.titulo)}</h3><pre class="console tb-log">${esc(paso.texto)}</pre><p>El job dice <b>OK</b>, pero leyó 16 filas. ¿Por qué tan pocas? Mira el filtro de la segunda línea.</p><button class="btn btn-primary" id="tbSig">Investigar en bronze →</button></div></div>`;
        $('#tbSig').addEventListener('click', () => { S.inc.i++; save(); render(); });
        return;
      }
      if (paso.tipo === 'sql') {
        w.innerHTML = cab + `<div class="tb-paso"><h3>${esc(paso.titulo)}</h3><p>${md(paso.enunciado)}</p><div id="tbEd"></div><div class="ex-tools"><button class="btn" id="tbRun">▶ Ejecutar</button><button class="btn btn-ok" id="tbOk">✓ Confirmar hipótesis</button></div><div class="output" id="tbOut"></div></div></div>`;
        const ed = createEditor($('#tbEd'), { lang: 'sql', value: S.codigo.inc || paso.inicial, tall: false, onChange: (v) => { S.codigo.inc = v; save(); } });
        $('#tbRun').addEventListener('click', async () => { if (await ensureSql($('#tbOut'))) renderSqlOutput($('#tbOut'), E.SQL.exec(ed.getValue())); });
        $('#tbOk').addEventListener('click', async () => {
          const out = $('#tbOut'); if (!(await ensureSql(out))) return;
          const r = E.SQL.exec(ed.getValue()); renderSqlOutput(out, r);
          if (r.ok !== false && E.compareResults(E.SQL.runForGrade(ed.getValue()).result, E.SQL.runForGrade(paso.solucion).result, false).pass) { decir('tu', 'Encontrado: el filtro solo leía fechas ISO. En bronze hay 23 registros del 30/12; cargamos 16.'); S.puntos.incidente += 2; S.inc.i++; save(); setTimeout(render, 600); }
          else { S.inc.fallos = (S.inc.fallos || 0) + 1; save(); out.insertAdjacentHTML('afterbegin', '<div class="ex-feedback bad">Ese no es el total del 30/12 en todos los formatos. Convierte la fecha a AAAA-MM-DD (con un CASE para el formato DD/MM/AAAA) y compara con \'2024-12-30\'.</div>'); }
        });
        return;
      }
      if (paso.tipo === 'postmortem') {
        w.innerHTML = cab + `<div class="tb-paso"><h3>${esc(paso.titulo)}</h3><p>${md(paso.enunciado)}</p><textarea id="tbPm" class="tb-pm" rows="10" placeholder="Resumen · Línea de tiempo · Impacto · Causa raíz · Detección · Arreglo · Acciones para que no vuelva">${esc(S.codigo.pm || '')}</textarea><div class="rubrica" style="margin-top:8px"><h5>Antes de publicarlo, ¿tiene…?</h5>${paso.rubrica.map((r, i) => `<label class="auto-item"><input type="checkbox" data-r="${i}"><span>${esc(r)}</span></label>`).join('')}</div><div class="row" style="margin-top:10px"><button class="btn btn-primary" id="tbPmGo">Publicar el postmortem</button></div></div></div>`;
        $('#tbPm').addEventListener('input', (e) => { S.codigo.pm = e.target.value; save(); });
        $('#tbPmGo').addEventListener('click', () => {
          const txt = $('#tbPm').value.trim(), marcados = [...w.querySelectorAll('[data-r]')].filter((c) => c.checked).length;
          if (txt.length < 250) { toast('Un postmortem útil tiene contenido: apunta a unas 10 líneas.'); return; }
          if (marcados < 5) { toast('Revisa la rúbrica: le faltan partes importantes.'); return; }
          if (/\b(culpa|culpable|error de (camila|martín|alguien))\b/i.test(txt)) toast('Ojo: un postmortem no busca culpables. Describe el sistema, no a las personas.');
          S.puntos.incidente += Math.max(0, 3 - (S.inc.fallos || 0) * 0.5);
          decir('tu', '📄 Postmortem INC-0042 publicado en la wiki.');
          decir('martin', 'Muy bien la guardia. Lo comentamos el viernes. Y gracias por abrir el ticket para la app: así se arregla de raíz.');
          avanzar();
        });
      }
    }
    function renderResumen(w) {
      const P = S.puntos;
      const pa = P.aclarar_max ? Math.round((P.aclarar / P.aclarar_max) * 100) : 0;
      const intentos = (P.intentos || []).reduce((s, x) => s + (x || 0), 0);
      const fila = (ico, t, val, txt) => `<div class="tb-res-fila"><span class="tb-res-ico">${ico}</span><div><b>${esc(t)}</b> <span class="badge">${esc(val)}</span><div class="small muted">${esc(txt)}</div></div></div>`;
      w.innerHTML = `<div class="card tb-ticket"><div class="tb-ticket-cab"><b>📋 Devolución de Martín — fin de la semana 1</b></div><div class="tb-paso">
        ${fila('❓', 'Aclarar antes de construir', pa + ' %', pa >= 80 ? 'Preguntaste lo que cambiaba el resultado. Eso te ahorra re-trabajo a vos y al negocio.' : 'Te faltó preguntar cosas que cambiaban el resultado. Antes de cada ticket: ¿qué período?, ¿qué se incluye y qué no?, ¿qué columnas?, ¿para qué se usa?')}
        ${fila('🧪', 'Resolver correctamente', intentos ? `${intentos} entregas fallidas` : 'a la primera', intentos <= 2 ? 'Llegaste al resultado correcto con pocas idas y vueltas.' : 'Varias entregas no cumplían los criterios: antes de entregar, revisalos uno por uno contra tu resultado (conteos, totales, filtros).')}
        ${fila('🔀', 'Pull requests y revisión', P.review.toFixed(1) + ' / 6', P.review >= 5 ? 'PRs claros y comentarios bien resueltos.' : 'Usá los comentarios de revisión como lista de chequeo para tu próximo PR: nombrar columnas, redondear, no dejar secretos en el código.')}
        ${fila('🚨', 'Guardia e incidente', P.incidente.toFixed(1) + ' / 5', P.incidente >= 4 ? 'Investigaste antes de tocar, confirmaste con datos y escribiste un postmortem útil.' : 'En una guardia: avisar, mirar el log, confirmar la hipótesis con datos y recién ahí arreglar (de forma reproducible).')}
        <h3 style="margin-top:18px">Para seguir practicando</h3><ul><li><a href="#/l/sql-capa-bronze">La capa bronze: limpiar datos como llegan de verdad</a></li><li><a href="#/l/python-extraer-de-apis">Extraer datos de una API</a></li><li><a href="#/l/fundamentos-git-en-equipo">Git en equipo: pull requests y conflictos</a></li><li><a href="#/m/incidentes">Módulo de incidentes</a> (14 guardias más)</li><li><a href="#/revisar-repo">Revisar tu proyecto en GitHub</a></li></ul>
        <button class="btn" id="tbOtra">↺ Hacer la semana de nuevo</button></div></div>`;
      $('#tbOtra').addEventListener('click', () => { Store.data.trabajo = NUEVO(); save(); vista(main, ctx); });
    }
    render();
  }
  window.Trabajo = { vista, TICKETS, INCIDENTE };
})();
