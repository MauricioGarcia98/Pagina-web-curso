/*
 * Tablas adicionales para las 13 empresas: más contexto operativo para preguntas más ricas
 * (proveedores, devoluciones, envíos, reseñas y cupones de la tienda; tarjetas y alertas del banco;
 * playlists; pagos de viajes; diagnósticos; uso del SaaS; equipaje; seguimiento de envíos; recargas;
 * pagos de primas; habitaciones y tarifas; reclamos de energía; ítems de pedidos y turnos de repartidores).
 * Se generan DESPUÉS de las tablas originales, con su propio generador aleatorio: los datos existentes
 * (y por lo tanto todos los ejercicios del curso) no cambian.
 */
(function (root) {
  'use strict';
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pad = (n) => String(n).padStart(2, '0');
  const DAY = 86400000;
  const fd = (t) => { const d = new Date(t); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const ft = (t) => { const d = new Date(t); return `${fd(t)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`; };
  const ts = (s) => Date.parse(String(s).replace(' ', 'T') + (String(s).length <= 10 ? 'T00:00:00' : '') + 'Z');
  const r2 = (x) => Math.round(x * 100) / 100;
  const NOMBRES = ['Sofía', 'Mateo', 'Valentina', 'Santiago', 'Isabella', 'Sebastián', 'Camila', 'Matías', 'Lucía', 'Nicolás', 'Martina', 'Diego', 'Gabriela', 'Samuel', 'Mariana', 'Tomás', 'Valeria', 'Lucas', 'Paula', 'Joaquín'];
  const APELLIDOS = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz', 'Torres', 'Ramírez', 'Flores', 'Romero', 'Vargas', 'Castro', 'Rojas', 'Morales'];

  function build(T) {
    const rnd = mulberry32(20250501);
    const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const pickW = (pairs) => { const t = pairs.reduce((s, p) => s + p[1], 0); let r = rnd() * t; for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; } return pairs[pairs.length - 1][0]; };
    const col = (tabla, c) => T[tabla].columns.indexOf(c);
    const filas = (tabla) => T[tabla].rows;
    const N = {};

    // =============================================================== TIENDA ANDINA
    {
      const prov = [];
      const PAISES = ['Argentina', 'Chile', 'México', 'China', 'Brasil', 'Estados Unidos', 'Colombia'];
      for (let i = 1; i <= 25; i++) prov.push([i, `${pick(['Distribuidora', 'Importadora', 'Mayorista', 'Grupo'])} ${pick(APELLIDOS)} ${pick(['S.A.', 'SRL', 'Ltda.'])}`, pick(PAISES), int(3, 45), r2(2.5 + rnd() * 2.5)]);
      N.proveedores = { columns: ['proveedor_id', 'nombre', 'pais', 'plazo_entrega_dias', 'calificacion'], rows: prov };

      const productos = filas('productos'), iPid = col('productos', 'producto_id'), iCosto = col('productos', 'costo');
      const provDe = {}; for (const p of productos) provDe[p[iPid]] = int(1, 25);
      const compras = []; let k = 0;
      for (let t = Date.UTC(2022, 0, 3); t < Date.UTC(2025, 0, 1); t += 7 * DAY) {
        const n = int(15, 25);
        for (let j = 0; j < n; j++) {
          const p = pick(productos); const pv = prov[provDe[p[iPid]] - 1];
          const orden = t + int(0, 6) * DAY; const demora = Math.max(1, Math.round(pv[3] * (0.7 + rnd() * 0.8)));
          const recibido = orden + demora * DAY;
          const estado = recibido > Date.UTC(2024, 11, 31) ? 'en_transito' : rnd() < 0.03 ? 'cancelada' : 'recibida';
          compras.push([++k, pv[0], p[iPid], fd(orden), estado === 'recibida' ? fd(recibido) : null, int(10, 200), r2(p[iCosto] * (0.92 + rnd() * 0.16)), estado]);
        }
      }
      N.compras = { columns: ['compra_id', 'proveedor_id', 'producto_id', 'fecha_orden', 'fecha_recepcion', 'cantidad', 'costo_unitario', 'estado'], rows: compras };

      const pedidos = filas('pedidos'), iPed = col('pedidos', 'pedido_id'), iFec = col('pedidos', 'fecha_pedido'), iEst = col('pedidos', 'estado'), iCanal = col('pedidos', 'canal'), iCli = col('pedidos', 'cliente_id');
      const det = filas('detalle_pedidos'), dPed = col('detalle_pedidos', 'pedido_id'), dProd = col('detalle_pedidos', 'producto_id'), dCant = col('detalle_pedidos', 'cantidad'), dPre = col('detalle_pedidos', 'precio_unitario'), dDes = col('detalle_pedidos', 'descuento');
      const lineas = {}; for (const d of det) (lineas[d[dPed]] = lineas[d[dPed]] || []).push(d);

      const envios = [], devol = [], resenas = [], usos = []; let ke = 0, kd = 0, kr = 0;
      const TRANSP = [['Correo Andino', 1.4, 30], ['FlashEnvíos', 0.8, 35], ['Moto Express', 0.5, 20], ['TransCargo', 1.1, 15]];
      const MOTIVOS = [['no le gustó', 30], ['talle o modelo incorrecto', 25], ['llegó dañado', 15], ['no coincide con la descripción', 15], ['arrepentimiento', 15]];
      const COMENT = { 5: ['Excelente, llegó antes de lo esperado', 'Muy buena calidad', 'Lo recomiendo'], 4: ['Bueno, cumple', 'Buena relación precio-calidad'], 3: ['Normal', 'Esperaba un poco más'], 2: ['Llegó con demora', 'La calidad no es la de la foto'], 1: ['Llegó roto', 'No funciona, pedí devolución'] };
      const cupones = [];
      const CUP = [['BIENVENIDA10', 10, '2022-01-01', '2024-12-31', 'todos'], ['VERANO15', 15, '2023-01-05', '2023-02-28', 'web'], ['VERANO15', 15, '2024-01-05', '2024-02-29', 'web'], ['HOTSALE20', 20, '2023-05-08', '2023-05-12', 'todos'], ['HOTSALE20', 20, '2024-05-13', '2024-05-17', 'todos'], ['CYBER25', 25, '2023-11-06', '2023-11-08', 'todos'], ['CYBER25', 25, '2024-11-04', '2024-11-06', 'todos'], ['BLACK30', 30, '2023-11-24', '2023-11-27', 'web'], ['BLACK30', 30, '2024-11-29', '2024-12-02', 'web'], ['APP5', 5, '2022-06-01', '2024-12-31', 'app'], ['NAVIDAD10', 10, '2022-12-10', '2022-12-24', 'todos'], ['NAVIDAD10', 10, '2023-12-10', '2023-12-24', 'todos'], ['NAVIDAD10', 10, '2024-12-10', '2024-12-24', 'todos']];
      CUP.forEach((c, i) => cupones.push([i + 1, c[0], c[1], c[2], c[3], c[4]]));
      N.cupones = { columns: ['cupon_id', 'codigo', 'descuento_pct', 'fecha_inicio', 'fecha_fin', 'canal'], rows: cupones };
      for (const p of pedidos) {
        const id = p[iPed], est = p[iEst], f = ts(p[iFec]);
        if (['entregado', 'enviado', 'devuelto'].includes(est) && p[iCanal] !== 'tienda') {
          const tr = pickW(TRANSP.map((x) => [x, x[2]]));
          const desp = f + int(0, 2) * DAY + int(8, 18) * 3600000;
          const ent = est === 'enviado' ? null : desp + Math.max(0.3, (1.5 + rnd() * 4) * tr[1]) * DAY;
          envios.push([++ke, id, tr[0], ft(desp), ent ? ft(ent) : null, r2(3 + rnd() * 9), est === 'enviado' ? 'en_camino' : 'entregado']);
        }
        const ls = lineas[id] || [];
        if (est === 'devuelto' || (est === 'entregado' && rnd() < 0.02)) {
          const l = pick(ls) || null;
          if (l) { const c = est === 'devuelto' ? l[dCant] : 1; devol.push([++kd, id, l[dProd], fd(f + int(3, 25) * DAY), pickW(MOTIVOS), c, r2(c * l[dPre] * (1 - l[dDes]))]); }
        }
        if (est === 'entregado') for (const l of ls) if (rnd() < 0.14) { const pz = pickW([[5, 45], [4, 28], [3, 12], [2, 8], [1, 7]]); resenas.push([++kr, l[dProd], p[iCli], fd(f + int(4, 30) * DAY), pz, pick(COMENT[pz])]); }
        if (est !== 'cancelado' && rnd() < 0.18) {
          const vig = cupones.filter((c) => p[iFec] >= c[3] && p[iFec] <= c[4] && (c[5] === 'todos' || c[5] === p[iCanal]));
          if (vig.length) usos.push([id, pick(vig)[0]]);
        }
      }
      N.envios = { columns: ['envio_id', 'pedido_id', 'transportista', 'fecha_despacho', 'fecha_entrega', 'costo_envio', 'estado'], rows: envios };
      N.devoluciones = { columns: ['devolucion_id', 'pedido_id', 'producto_id', 'fecha', 'motivo', 'cantidad', 'monto_reembolso'], rows: devol };
      N.resenas = { columns: ['resena_id', 'producto_id', 'cliente_id', 'fecha', 'puntaje', 'comentario'], rows: resenas };
      N.uso_cupones = { columns: ['pedido_id', 'cupon_id'], rows: usos };
    }

    // =============================================================== BANCO AUSTRAL
    {
      const cuentas = filas('banco_cuentas'), cId = col('banco_cuentas', 'cuenta_id'), cTipo = col('banco_cuentas', 'tipo'), cFec = col('banco_cuentas', 'fecha_apertura'), cEst = col('banco_cuentas', 'estado');
      const tarj = []; let k = 0;
      for (const c of cuentas) {
        const n = c[cTipo] === 'inversion' ? 0 : pickW([[1, 70], [2, 25], [0, 5]]);
        for (let j = 0; j < n; j++) {
          const tipo = j === 0 ? 'debito' : 'credito'; const em = ts(c[cFec]) + int(0, 400) * DAY;
          tarj.push([++k, c[cId], tipo, pickW([['Visa', 55], ['Mastercard', 40], ['Amex', 5]]), fd(em), fd(em + 4 * 365 * DAY), tipo === 'credito' ? int(5, 60) * 10000 : null, c[cEst] === 'cerrada' ? 'cancelada' : rnd() < 0.04 ? 'bloqueada' : 'activa']);
        }
      }
      N.banco_tarjetas = { columns: ['tarjeta_id', 'cuenta_id', 'tipo', 'red', 'fecha_emision', 'fecha_vencimiento', 'limite', 'estado'], rows: tarj };
      const tx = filas('banco_transacciones'), tId = col('banco_transacciones', 'tx_id'), tF = col('banco_transacciones', 'fecha_hora'), tM = col('banco_transacciones', 'monto'), tFr = col('banco_transacciones', 'es_fraude'), tCan = col('banco_transacciones', 'canal');
      const alertas = []; let ka = 0;
      const REGLAS = ['monto atípico', 'país inusual', 'ráfaga de compras', 'horario nocturno', 'comercio de riesgo'];
      for (const t of tx) {
        const fraude = t[tFr] === 1;
        const alerta = fraude ? rnd() < 0.78 : rnd() < 0.012 * (t[tCan] === 'pos' ? 2 : 1);
        if (!alerta) continue;
        alertas.push([++ka, t[tId], ft(ts(t[tF]) + int(5, 300) * 1000), pick(REGLAS), Math.round(50 + rnd() * 50), fraude ? 'confirmado' : 'descartado']);
      }
      N.banco_alertas = { columns: ['alerta_id', 'tx_id', 'fecha_hora', 'regla', 'puntaje', 'resultado'], rows: alertas };
      const SUC = [['Buenos Aires', 'Argentina', 6], ['Córdoba', 'Argentina', 2], ['Santiago', 'Chile', 4], ['Ciudad de México', 'México', 6], ['Guadalajara', 'México', 2], ['Bogotá', 'Colombia', 4], ['Medellín', 'Colombia', 2], ['Lima', 'Perú', 3]];
      const suc = []; let ks = 0; for (const [c, p, n] of SUC) for (let i = 1; i <= n; i++) suc.push([++ks, `${c} ${['Centro', 'Norte', 'Sur', 'Este', 'Oeste', 'Aeropuerto'][i - 1]}`, c, p, int(4, 25)]);
      N.banco_sucursales = { columns: ['sucursal_id', 'nombre', 'ciudad', 'pais', 'empleados'], rows: suc };
    }

    // =============================================================== RITMO (streaming)
    {
      const cont = filas('streaming_contenidos'), sId = col('streaming_contenidos', 'contenido_id'), sArt = col('streaming_contenidos', 'artista'), sGen = col('streaming_contenidos', 'genero');
      const arts = {}; for (const c of cont) if (!arts[c[sArt]]) arts[c[sArt]] = c[sGen];
      N.streaming_artistas = { columns: ['artista', 'pais', 'genero_principal', 'oyentes_mensuales'], rows: Object.entries(arts).map(([a, g]) => [a, pick(['Argentina', 'México', 'Colombia', 'Puerto Rico', 'España', 'Chile', 'Estados Unidos']), g, int(20, 900) * 1000]) };
      const us = filas('streaming_usuarios'), uId = col('streaming_usuarios', 'usuario_id'), uF = col('streaming_usuarios', 'fecha_registro');
      const pl = [], items = []; let kp = 0;
      const NOM = ['Para correr', 'Mañana', 'Fiesta', 'Trabajo', 'Viaje', 'Favoritos', 'Relax', 'Domingo', 'Estudio', 'Clásicos'];
      for (const u of us) {
        const n = pickW([[0, 45], [1, 30], [2, 15], [3, 10]]);
        for (let j = 0; j < n; j++) {
          const cre = Math.max(ts(u[uF]), Date.UTC(2023, 0, 1)) + int(0, 500) * DAY;
          const id = ++kp; pl.push([id, u[uId], pick(NOM), fd(Math.min(cre, Date.UTC(2024, 11, 20))), rnd() < 0.3 ? 1 : 0]);
          const m = int(3, 25), usados = new Set();
          for (let q = 1; q <= m; q++) { const c = pick(cont)[sId]; if (usados.has(c)) continue; usados.add(c); items.push([id, c, q]); }
        }
      }
      N.streaming_playlists = { columns: ['playlist_id', 'usuario_id', 'nombre', 'fecha_creacion', 'publica'], rows: pl };
      N.streaming_playlist_items = { columns: ['playlist_id', 'contenido_id', 'posicion'], rows: items };
    }

    // =============================================================== RUTA (movilidad)
    {
      const v = filas('viajes_viajes'), vId = col('viajes_viajes', 'viaje_id'), vEst = col('viajes_viajes', 'estado'), vTar = col('viajes_viajes', 'tarifa'), vFin = col('viajes_viajes', 'fecha_hora_fin'), vSol = col('viajes_viajes', 'fecha_hora_solicitud'), vCal = col('viajes_viajes', 'calificacion');
      const pagos = [], inc = []; let ki = 0;
      for (const x of v) {
        if (x[vEst] === 'completado') {
          const met = pickW([['tarjeta', 55], ['efectivo', 30], ['billetera', 15]]);
          pagos.push([x[vId], met, x[vTar], met === 'efectivo' ? 0 : r2(rnd() < 0.35 ? x[vTar] * (0.05 + rnd() * 0.15) : 0), x[vFin]]);
          const cal = x[vCal];
          if ((cal !== null && cal <= 2 && rnd() < 0.6) || rnd() < 0.01) inc.push([++ki, x[vId], pickW([['conducción peligrosa', 20], ['ruta más larga', 30], ['vehículo sucio', 20], ['cobro incorrecto', 15], ['objeto olvidado', 15]]), x[vFin], pickW([['baja', 60], ['media', 30], ['alta', 10]])]);
        } else if (x[vEst] === 'cancelado_conductor' && rnd() < 0.05) inc.push([++ki, x[vId], 'cancelación sin aviso', x[vSol], 'baja']);
      }
      N.viajes_pagos = { columns: ['viaje_id', 'metodo', 'monto', 'propina', 'fecha_pago'], rows: pagos };
      N.viajes_incidentes = { columns: ['incidente_id', 'viaje_id', 'tipo', 'fecha', 'gravedad'], rows: inc };
    }

    // =============================================================== CLÍNICA DEL SUR
    {
      const t = filas('clinica_turnos'), tId = col('clinica_turnos', 'turno_id'), tEst = col('clinica_turnos', 'estado'), tMed = col('clinica_turnos', 'medico_id');
      const med = filas('clinica_medicos'), mId = col('clinica_medicos', 'medico_id'), mEsp = col('clinica_medicos', 'especialidad');
      const espDe = {}; for (const m of med) espDe[m[mId]] = m[mEsp];
      const CIE = { 'Clínica médica': [['J06.9', 'Infección respiratoria aguda'], ['I10', 'Hipertensión arterial'], ['E11.9', 'Diabetes tipo 2'], ['R51', 'Cefalea']], 'Pediatría': [['J06.9', 'Infección respiratoria aguda'], ['A09', 'Gastroenteritis'], ['Z00.1', 'Control de salud infantil']], 'Cardiología': [['I10', 'Hipertensión arterial'], ['I48', 'Fibrilación auricular'], ['I25.1', 'Cardiopatía isquémica']], 'Traumatología': [['M54.5', 'Lumbalgia'], ['S93.4', 'Esguince de tobillo'], ['M17', 'Artrosis de rodilla']], 'Dermatología': [['L70.0', 'Acné'], ['L20', 'Dermatitis atópica'], ['D22', 'Nevo']], 'Ginecología': [['Z01.4', 'Control ginecológico'], ['N92', 'Trastorno menstrual']], 'Oftalmología': [['H52.1', 'Miopía'], ['H40', 'Glaucoma']], 'Psicología': [['F41.1', 'Ansiedad generalizada'], ['F32', 'Episodio depresivo']] };
      const MED = { I10: 'Enalapril', 'E11.9': 'Metformina', 'J06.9': 'Paracetamol', A09: 'Sales de rehidratación', I48: 'Apixabán', 'M54.5': 'Ibuprofeno', 'L70.0': 'Adapaleno', L20: 'Crema hidratante', H40: 'Timolol', 'F41.1': 'Sertralina', F32: 'Sertralina', 'S93.4': 'Ibuprofeno', M17: 'Diclofenac' };
      const dx = [], rx = []; let kr = 0;
      for (const x of t) {
        if (x[tEst] !== 'atendido') continue;
        const d = pick(CIE[espDe[x[tMed]]] || CIE['Clínica médica']);
        dx.push([x[tId], d[0], d[1]]);
        if (MED[d[0]] && rnd() < 0.7) rx.push([++kr, x[tId], MED[d[0]], pick([5, 7, 10, 30, 90])]);
      }
      N.clinica_diagnosticos = { columns: ['turno_id', 'codigo_cie10', 'descripcion'], rows: dx };
      N.clinica_recetas = { columns: ['receta_id', 'turno_id', 'medicamento', 'dias_tratamiento'], rows: rx };
      N.clinica_sedes = { columns: ['sede', 'ciudad', 'consultorios', 'horario'], rows: [['Norte', 'Buenos Aires', 14, '08-20'], ['Centro', 'Buenos Aires', 22, '07-21'], ['Oeste', 'Morón', 9, '08-18']] };
    }

    // =============================================================== NUBE PYME (SaaS)
    {
      const emp = filas('saas_empresas'), eId = col('saas_empresas', 'empresa_id'), eN = col('saas_empresas', 'empleados'), eF = col('saas_empresas', 'fecha_alta');
      const usu = []; let ku = 0;
      for (const e of emp) {
        const n = Math.max(1, Math.min(40, Math.round(e[eN] / 12 + rnd() * 4)));
        for (let j = 0; j < n; j++) { const alta = ts(e[eF]) + int(0, 300) * DAY; usu.push([++ku, e[eId], j === 0 ? 'admin' : pickW([['editor', 40], ['lector', 55], ['admin', 5]]), fd(alta), rnd() < 0.15 ? null : fd(Math.min(Date.UTC(2024, 11, 31), alta + int(5, 900) * DAY))]); }
      }
      N.saas_usuarios = { columns: ['usuario_id', 'empresa_id', 'rol', 'fecha_alta', 'ultimo_acceso'], rows: usu };
      const fac = filas('saas_facturas'), fE = col('saas_facturas', 'empresa_id'), fM = col('saas_facturas', 'mes');
      const ultimo = {}; for (const f of fac) if (!ultimo[f[fE]] || f[fM] > ultimo[f[fE]]) ultimo[f[fE]] = f[fM];
      const uso = [];
      for (const f of fac) {
        if (f[fM] < '2024-01-01') continue;
        const usuariosEmp = Math.max(1, usu.filter((u) => u[1] === f[fE]).length);
        const meses = (ts(ultimo[f[fE]]) - ts(f[fM])) / (30 * DAY); const decae = ultimo[f[fE]] < '2024-12-01' && meses < 3 ? 0.35 + meses * 0.2 : 1;
        const act = Math.max(0, Math.round(usuariosEmp * (0.5 + rnd() * 0.5) * decae));
        uso.push([f[fE], f[fM], act, act * int(80, 400), act * int(0, 3000)]);
      }
      N.saas_uso_mensual = { columns: ['empresa_id', 'mes', 'usuarios_activos', 'eventos', 'llamadas_api'], rows: uso };
    }

    // =============================================================== CÓNDOR AIR
    {
      const v = filas('vuelos_vuelos'), vO = col('vuelos_vuelos', 'origen'), vD = col('vuelos_vuelos', 'destino'), vSp = col('vuelos_vuelos', 'salida_programada'), vLp = col('vuelos_vuelos', 'llegada_programada');
      const rutas = {};
      for (const x of v) { const k = x[vO] + '-' + x[vD]; if (!rutas[k]) rutas[k] = [x[vO], x[vD], Math.round((ts(x[vLp]) - ts(x[vSp])) / 60000)]; }
      N.vuelos_rutas = { columns: ['origen', 'destino', 'duracion_min', 'distancia_km'], rows: Object.values(rutas).map(([o, d, m]) => [o, d, m, Math.round(m * 7.4 + int(-40, 40))]) };
      const res = filas('vuelos_reservas'), rId = col('vuelos_reservas', 'reserva_id'), rC = col('vuelos_reservas', 'clase'), rE = col('vuelos_reservas', 'estado');
      const eq = [];
      for (const r of res) {
        if (r[rE] === 'cancelada') continue;
        const incl = r[rC] === 'economica' ? 0 : r[rC] === 'premium' ? 1 : 2;
        const piezas = pickW([[0, 30], [1, 50], [2, 17], [3, 3]]);
        if (!piezas) continue;
        eq.push([r[rId], piezas, r2(piezas * (14 + rnd() * 9)), Math.max(0, piezas - incl) * 45]);
      }
      N.vuelos_equipaje = { columns: ['reserva_id', 'piezas', 'peso_kg', 'cargo_extra'], rows: eq };
    }

    // =============================================================== MERCURIO LOGÍSTICA
    {
      const env = filas('logistica_envios'), eId = col('logistica_envios', 'envio_id'), eDes = col('logistica_envios', 'fecha_despacho'), eEnt = col('logistica_envios', 'fecha_entrega'), eEst = col('logistica_envios', 'estado'), eCiu = col('logistica_envios', 'ciudad_destino'), eTr = col('logistica_envios', 'transportista');
      const tr = [...new Set(env.map((x) => x[eTr]))];
      N.logistica_transportistas = { columns: ['transportista', 'tipo', 'tarifa_base', 'sla_dias'], rows: tr.map((t) => [t, /Moto/.test(t) ? 'última milla' : 'nacional', r2(2 + rnd() * 6), /Moto|Rápido/.test(t) ? 1 : int(2, 5)]) };
      const mov = filas('logistica_movimientos'), mS = col('logistica_movimientos', 'sku');
      const skus = [...new Set(mov.map((x) => x[mS]))].sort();
      const DESC = ['Notebook 14"', 'Monitor 24"', 'Auriculares inalámbricos', 'Teclado mecánico', 'Mouse óptico', 'Silla ergonómica', 'Escritorio', 'Impresora', 'Router WiFi', 'Disco SSD 1TB', 'Webcam HD', 'Parlante bluetooth'];
      N.logistica_skus = { columns: ['sku', 'descripcion', 'categoria', 'peso_kg', 'valor_unitario'], rows: skus.map((s, i) => [s, DESC[i % DESC.length], i < 5 ? 'tecnología' : i < 7 ? 'muebles' : 'accesorios', r2(0.2 + rnd() * 15), r2(15 + rnd() * 900)]) };
      const seg = [];
      for (const x of env) {
        const d = ts(x[eDes]); const fin = x[eEnt] ? ts(x[eEnt]) : null;
        seg.push([x[eId], ft(d), 'despachado']);
        const ult = fin || Math.min(Date.UTC(2024, 11, 31), d + int(2, 9) * DAY);
        seg.push([x[eId], ft(d + (ult - d) * 0.35), 'en centro de distribución']);
        if (x[eEst] !== 'perdido') seg.push([x[eId], ft(d + (ult - d) * 0.8), `en reparto en ${x[eCiu]}`]);
        if (x[eEst] === 'entregado' && fin) seg.push([x[eId], ft(fin), 'entregado']);
        if (x[eEst] === 'devuelto') seg.push([x[eId], ft(ult), 'devuelto al remitente']);
      }
      N.logistica_seguimiento = { columns: ['envio_id', 'fecha_hora', 'evento'], rows: seg };
    }

    // =============================================================== CONECTA (telco)
    {
      const lin = filas('telco_lineas'), lId = col('telco_lineas', 'linea_id'), lPlan = col('telco_lineas', 'plan_id'), lAlta = col('telco_lineas', 'fecha_alta'), lBaja = col('telco_lineas', 'fecha_baja'), lMot = col('telco_lineas', 'motivo_baja');
      const planes = filas('telco_planes'), pId = col('telco_planes', 'plan_id'), pTipo = col('telco_planes', 'tipo');
      const tipoDe = {}; for (const p of planes) tipoDe[p[pId]] = p[pTipo];
      const rec = [], port = []; let k = 0;
      for (const l of lin) {
        if (l[lMot] === 'portabilidad') port.push([l[lId], l[lBaja], pick(['Movicel', 'Claro Sur', 'Tuenti', 'Personal Plus'])]);
        if (tipoDe[l[lPlan]] !== 'prepago') continue;
        let t = Math.max(ts(l[lAlta]), Date.UTC(2024, 0, 1)); const fin = l[lBaja] ? ts(l[lBaja]) : Date.UTC(2024, 11, 31);
        while (t < fin) { rec.push([++k, l[lId], fd(t), pick([500, 1000, 1500, 2000, 3000]), pickW([['app', 45], ['kiosco', 35], ['web', 20]])]); t += int(6, 25) * DAY; }
      }
      N.telco_recargas = { columns: ['recarga_id', 'linea_id', 'fecha', 'monto', 'canal'], rows: rec };
      N.telco_portabilidad = { columns: ['linea_id', 'fecha', 'operador_destino'], rows: port };
      const ant = []; let ka = 0;
      for (const reg of ['Norte', 'Centro', 'Sur', 'Costa', 'Andina']) for (let i = 0; i < int(15, 40); i++) ant.push([++ka, reg, pickW([['4G', 60], ['5G', 25], ['3G', 15]]), fd(Date.UTC(2015, 0, 1) + int(0, 3500) * DAY), r2(85 + rnd() * 14.9)]);
      N.telco_antenas = { columns: ['antena_id', 'region', 'tecnologia', 'fecha_instalacion', 'disponibilidad_pct'], rows: ant };
    }

    // =============================================================== ESCUDO SEGUROS
    {
      const ag = []; for (let i = 1; i <= 40; i++) ag.push([i, `${pick(NOMBRES)} ${pick(APELLIDOS)}`, pickW([['broker', 50], ['banco', 30], ['web', 20]]), pick(['Norte', 'Centro', 'Sur'])]);
      N.seguros_agentes = { columns: ['agente_id', 'nombre', 'canal', 'region'], rows: ag };
      const pol = filas('seguros_polizas'), pId = col('seguros_polizas', 'poliza_id'), pIni = col('seguros_polizas', 'fecha_inicio'), pFin = col('seguros_polizas', 'fecha_fin'), pPrima = col('seguros_polizas', 'prima_mensual');
      const pagos = []; let k = 0;
      for (const p of pol) {
        const ini = Math.max(ts(p[pIni]), Date.UTC(2024, 0, 1)), fin = Math.min(p[pFin] ? ts(p[pFin]) : Date.UTC(2024, 11, 31), Date.UTC(2024, 11, 31));
        const moroso = rnd() < 0.08;
        for (let t = Date.UTC(new Date(ini).getUTCFullYear(), new Date(ini).getUTCMonth(), 1); t <= fin; t = Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() + 1, 1)) {
          const pagado = !(moroso && rnd() < 0.5) && rnd() > 0.02;
          pagos.push([++k, p[pId], fd(t).slice(0, 7), p[pPrima], pagado ? 1 : 0, pagado ? fd(t + int(1, 20) * DAY) : null]);
        }
      }
      N.seguros_pagos_prima = { columns: ['pago_id', 'poliza_id', 'mes', 'monto', 'pagado', 'fecha_pago'], rows: pagos };
    }

    // =============================================================== POSADA ANDINA (hotel)
    {
      const h = filas('hotel_hoteles'), hId = col('hotel_hoteles', 'hotel_id'), hHab = col('hotel_hoteles', 'habitaciones'), hEst = col('hotel_hoteles', 'estrellas');
      const habs = [], tar = []; let k = 0;
      for (const x of h) {
        for (let i = 1; i <= x[hHab]; i++) { const piso = Math.ceil(i / 20); habs.push([++k, x[hId], `${piso}${pad(((i - 1) % 20) + 1)}`, i % 10 === 0 ? 'suite' : i % 3 === 0 ? 'superior' : 'estandar', piso]); }
        const base = 40 + x[hEst] * 22;
        for (const tipo of ['estandar', 'superior', 'suite']) for (const [temp, f] of [['baja', 0.85], ['media', 1], ['alta', 1.35]]) tar.push([x[hId], tipo, temp, r2(base * f * (tipo === 'suite' ? 2.2 : tipo === 'superior' ? 1.35 : 1))]);
      }
      N.hotel_habitaciones = { columns: ['habitacion_id', 'hotel_id', 'numero', 'tipo', 'piso'], rows: habs };
      N.hotel_tarifas = { columns: ['hotel_id', 'tipo_habitacion', 'temporada', 'tarifa_noche'], rows: tar };
    }

    // =============================================================== LUZ DEL VALLE (energía)
    {
      N.energia_tarifas = { columns: ['tipo_cliente', 'tramo', 'desde_kwh', 'hasta_kwh', 'precio_kwh'], rows: [['residencial', 1, 0, 150, 0.08], ['residencial', 2, 151, 400, 0.11], ['residencial', 3, 401, null, 0.16], ['comercial', 1, 0, 1000, 0.12], ['comercial', 2, 1001, null, 0.14], ['industrial', 1, 0, null, 0.09]] };
      const cli = filas('energia_clientes'), cId = col('energia_clientes', 'cliente_id');
      const rec = []; let k = 0;
      for (const c of cli) {
        const n = pickW([[0, 70], [1, 20], [2, 7], [3, 3]]);
        for (let j = 0; j < n; j++) {
          const f = Date.UTC(2024, 0, 1) + int(0, 360) * DAY; const res = rnd() < 0.85;
          rec.push([++k, c[cId], fd(f), pickW([['facturación', 40], ['corte de servicio', 30], ['medidor', 15], ['tensión baja', 15]]), res ? 1 : 0, res ? int(1, 30) : null]);
        }
      }
      N.energia_reclamos = { columns: ['reclamo_id', 'cliente_id', 'fecha', 'tipo', 'resuelto', 'dias_resolucion'], rows: rec };
    }

    // =============================================================== RÁPIDO (delivery)
    {
      const rest = filas('delivery_restaurantes'), rId = col('delivery_restaurantes', 'restaurante_id'), rCat = col('delivery_restaurantes', 'categoria');
      const catDe = {}; for (const r of rest) catDe[r[rId]] = r[rCat];
      const PLATOS = { Hamburguesas: ['Hamburguesa clásica', 'Hamburguesa doble', 'Papas fritas', 'Gaseosa'], 'Comida casera': ['Milanesa con puré', 'Guiso de lentejas', 'Tarta de verdura', 'Flan'], Pizza: ['Pizza muzzarella', 'Pizza especial', 'Fainá', 'Cerveza'], Mexicana: ['Tacos al pastor', 'Burrito', 'Nachos', 'Agua de horchata'], Sushi: ['Roll California', 'Roll Philadelphia', 'Sashimi', 'Gyozas'], Saludable: ['Ensalada César', 'Bowl de quinoa', 'Wrap vegetariano', 'Jugo natural'], Pollo: ['Pollo a la brasa', 'Alitas', 'Papas rústicas', 'Ensalada'], Postres: ['Torta de chocolate', 'Helado 1/2 kg', 'Brownie', 'Cheesecake'] };
      const ped = filas('delivery_pedidos'), dId = col('delivery_pedidos', 'pedido_id'), dR = col('delivery_pedidos', 'restaurante_id'), dSub = col('delivery_pedidos', 'subtotal');
      const items = []; let k = 0;
      for (const p of ped) {
        const platos = PLATOS[catDe[p[dR]]] || PLATOS['Comida casera'];
        const n = Math.max(1, Math.min(4, Math.round(p[dSub] / 15)));
        let resto = p[dSub];
        for (let j = 0; j < n; j++) {
          const cant = j === n - 1 ? 1 : pickW([[1, 75], [2, 25]]);
          const precio = j === n - 1 ? r2(resto / cant) : r2(Math.min(resto * 0.6, (p[dSub] / n) * (0.7 + rnd() * 0.6)) / cant);
          resto = r2(resto - precio * cant);
          items.push([++k, p[dId], platos[j % platos.length], cant, precio]);
        }
      }
      N.delivery_items = { columns: ['item_id', 'pedido_id', 'plato', 'cantidad', 'precio_unitario'], rows: items };
      const rep = filas('delivery_repartidores'), pId = col('delivery_repartidores', 'repartidor_id'), pF = col('delivery_repartidores', 'fecha_alta');
      const ent = {}; const pRep = col('delivery_pedidos', 'repartidor_id'), pEst = col('delivery_pedidos', 'estado'), pCre = col('delivery_pedidos', 'creado');
      const semana = (t) => fd(t - ((new Date(t).getUTCDay() + 6) % 7) * DAY);
      for (const p of ped) if (p[pEst] === 'entregado' && p[pRep]) { const kk = p[pRep] + '|' + semana(ts(p[pCre])); ent[kk] = (ent[kk] || 0) + 1; }
      const turnos = [];
      for (const r of rep) for (let t = Math.max(Date.UTC(2024, 0, 1), ts(r[pF])); t < Date.UTC(2025, 0, 1); t += 7 * DAY) {
        const s = semana(t); const n = ent[r[pId] + '|' + s] || 0;
        if (!n && rnd() < 0.6) continue;
        turnos.push([r[pId], s, r2(Math.max(2, n * (0.7 + rnd() * 0.5) + rnd() * 6)), n]);
      }
      N.delivery_turnos = { columns: ['repartidor_id', 'semana', 'horas_conectado', 'pedidos_entregados'], rows: turnos };
    }
    return N;
  }

  const SCHEMA = `
CREATE TABLE proveedores (proveedor_id INTEGER PRIMARY KEY, nombre TEXT, pais TEXT, plazo_entrega_dias INTEGER, calificacion REAL);
CREATE TABLE compras (compra_id INTEGER PRIMARY KEY, proveedor_id INTEGER, producto_id INTEGER, fecha_orden TEXT, fecha_recepcion TEXT, cantidad INTEGER, costo_unitario REAL, estado TEXT);
CREATE TABLE envios (envio_id INTEGER PRIMARY KEY, pedido_id INTEGER, transportista TEXT, fecha_despacho TEXT, fecha_entrega TEXT, costo_envio REAL, estado TEXT);
CREATE TABLE devoluciones (devolucion_id INTEGER PRIMARY KEY, pedido_id INTEGER, producto_id INTEGER, fecha TEXT, motivo TEXT, cantidad INTEGER, monto_reembolso REAL);
CREATE TABLE resenas (resena_id INTEGER PRIMARY KEY, producto_id INTEGER, cliente_id INTEGER, fecha TEXT, puntaje INTEGER, comentario TEXT);
CREATE TABLE cupones (cupon_id INTEGER PRIMARY KEY, codigo TEXT, descuento_pct INTEGER, fecha_inicio TEXT, fecha_fin TEXT, canal TEXT);
CREATE TABLE uso_cupones (pedido_id INTEGER PRIMARY KEY, cupon_id INTEGER);
CREATE TABLE banco_tarjetas (tarjeta_id INTEGER PRIMARY KEY, cuenta_id INTEGER, tipo TEXT, red TEXT, fecha_emision TEXT, fecha_vencimiento TEXT, limite REAL, estado TEXT);
CREATE TABLE banco_alertas (alerta_id INTEGER PRIMARY KEY, tx_id INTEGER, fecha_hora TEXT, regla TEXT, puntaje INTEGER, resultado TEXT);
CREATE TABLE banco_sucursales (sucursal_id INTEGER PRIMARY KEY, nombre TEXT, ciudad TEXT, pais TEXT, empleados INTEGER);
CREATE TABLE streaming_artistas (artista TEXT PRIMARY KEY, pais TEXT, genero_principal TEXT, oyentes_mensuales INTEGER);
CREATE TABLE streaming_playlists (playlist_id INTEGER PRIMARY KEY, usuario_id INTEGER, nombre TEXT, fecha_creacion TEXT, publica INTEGER);
CREATE TABLE streaming_playlist_items (playlist_id INTEGER, contenido_id INTEGER, posicion INTEGER, PRIMARY KEY (playlist_id, contenido_id));
CREATE TABLE viajes_pagos (viaje_id INTEGER PRIMARY KEY, metodo TEXT, monto REAL, propina REAL, fecha_pago TEXT);
CREATE TABLE viajes_incidentes (incidente_id INTEGER PRIMARY KEY, viaje_id INTEGER, tipo TEXT, fecha TEXT, gravedad TEXT);
CREATE TABLE clinica_diagnosticos (turno_id INTEGER PRIMARY KEY, codigo_cie10 TEXT, descripcion TEXT);
CREATE TABLE clinica_recetas (receta_id INTEGER PRIMARY KEY, turno_id INTEGER, medicamento TEXT, dias_tratamiento INTEGER);
CREATE TABLE clinica_sedes (sede TEXT PRIMARY KEY, ciudad TEXT, consultorios INTEGER, horario TEXT);
CREATE TABLE saas_usuarios (usuario_id INTEGER PRIMARY KEY, empresa_id INTEGER, rol TEXT, fecha_alta TEXT, ultimo_acceso TEXT);
CREATE TABLE saas_uso_mensual (empresa_id INTEGER, mes TEXT, usuarios_activos INTEGER, eventos INTEGER, llamadas_api INTEGER, PRIMARY KEY (empresa_id, mes));
CREATE TABLE vuelos_rutas (origen TEXT, destino TEXT, duracion_min INTEGER, distancia_km INTEGER, PRIMARY KEY (origen, destino));
CREATE TABLE vuelos_equipaje (reserva_id INTEGER PRIMARY KEY, piezas INTEGER, peso_kg REAL, cargo_extra REAL);
CREATE TABLE logistica_transportistas (transportista TEXT PRIMARY KEY, tipo TEXT, tarifa_base REAL, sla_dias INTEGER);
CREATE TABLE logistica_skus (sku TEXT PRIMARY KEY, descripcion TEXT, categoria TEXT, peso_kg REAL, valor_unitario REAL);
CREATE TABLE logistica_seguimiento (envio_id INTEGER, fecha_hora TEXT, evento TEXT);
CREATE TABLE telco_recargas (recarga_id INTEGER PRIMARY KEY, linea_id INTEGER, fecha TEXT, monto REAL, canal TEXT);
CREATE TABLE telco_portabilidad (linea_id INTEGER PRIMARY KEY, fecha TEXT, operador_destino TEXT);
CREATE TABLE telco_antenas (antena_id INTEGER PRIMARY KEY, region TEXT, tecnologia TEXT, fecha_instalacion TEXT, disponibilidad_pct REAL);
CREATE TABLE seguros_agentes (agente_id INTEGER PRIMARY KEY, nombre TEXT, canal TEXT, region TEXT);
CREATE TABLE seguros_pagos_prima (pago_id INTEGER PRIMARY KEY, poliza_id INTEGER, mes TEXT, monto REAL, pagado INTEGER, fecha_pago TEXT);
CREATE TABLE hotel_habitaciones (habitacion_id INTEGER PRIMARY KEY, hotel_id INTEGER, numero TEXT, tipo TEXT, piso INTEGER);
CREATE TABLE hotel_tarifas (hotel_id INTEGER, tipo_habitacion TEXT, temporada TEXT, tarifa_noche REAL, PRIMARY KEY (hotel_id, tipo_habitacion, temporada));
CREATE TABLE energia_tarifas (tipo_cliente TEXT, tramo INTEGER, desde_kwh INTEGER, hasta_kwh INTEGER, precio_kwh REAL, PRIMARY KEY (tipo_cliente, tramo));
CREATE TABLE energia_reclamos (reclamo_id INTEGER PRIMARY KEY, cliente_id INTEGER, fecha TEXT, tipo TEXT, resuelto INTEGER, dias_resolucion INTEGER);
CREATE TABLE delivery_items (item_id INTEGER PRIMARY KEY, pedido_id INTEGER, plato TEXT, cantidad INTEGER, precio_unitario REAL);
CREATE TABLE delivery_turnos (repartidor_id INTEGER, semana TEXT, horas_conectado REAL, pedidos_entregados INTEGER, PRIMARY KEY (repartidor_id, semana));
CREATE INDEX idx_envios_pedido ON envios(pedido_id);
CREATE INDEX idx_balertas_tx ON banco_alertas(tx_id);
CREATE INDEX idx_lseg_envio ON logistica_seguimiento(envio_id);
CREATE INDEX idx_ditems_pedido ON delivery_items(pedido_id);
`;

  const TABLE_INFO = {
    proveedores: 'Proveedores de la tienda con su plazo de entrega habitual y calificación (1 a 5).',
    compras: 'Órdenes de compra a proveedores (2022-2024): fecha de orden y de recepción, cantidad y costo. fecha_recepcion NULL = no llegó.',
    envios: 'Envío de cada pedido online (no los de tienda física): transportista, despacho, entrega y costo.',
    devoluciones: 'Productos devueltos: motivo, cantidad y monto reembolsado.',
    resenas: 'Reseñas de productos (1 a 5 estrellas) que dejaron los clientes después de recibir su pedido.',
    cupones: 'Cupones de descuento con su vigencia y canal (todos, web o app).',
    uso_cupones: 'Qué cupón usó cada pedido (como máximo uno).',
    banco_tarjetas: 'Tarjetas de débito y crédito de cada cuenta, con límite (crédito) y estado.',
    banco_alertas: 'Alertas del motor de fraude: regla que disparó, puntaje y resultado de la revisión (confirmado o descartado).',
    banco_sucursales: 'Sucursales del banco por ciudad.',
    streaming_artistas: 'Artistas del catálogo con país y oyentes mensuales.',
    streaming_playlists: 'Listas creadas por los usuarios.',
    streaming_playlist_items: 'Contenidos de cada lista, en orden.',
    viajes_pagos: 'Pago de cada viaje completado: método, monto y propina.',
    viajes_incidentes: 'Incidentes reportados sobre viajes, con tipo y gravedad.',
    clinica_diagnosticos: 'Diagnóstico (código CIE-10) de cada turno atendido.',
    clinica_recetas: 'Medicamentos recetados en los turnos.',
    clinica_sedes: 'Sedes de la clínica con sus consultorios y horario.',
    saas_usuarios: 'Usuarios de cada empresa cliente, con rol y último acceso.',
    saas_uso_mensual: 'Uso del producto por empresa y mes de 2024: usuarios activos, eventos y llamadas a la API (cae antes de una baja).',
    vuelos_rutas: 'Rutas de la red con duración y distancia.',
    vuelos_equipaje: 'Equipaje despachado por reserva y cargo extra cobrado.',
    logistica_transportistas: 'Transportistas con tarifa base y SLA prometido en días.',
    logistica_skus: 'Catálogo de SKUs del depósito: descripción, peso y valor.',
    logistica_seguimiento: 'Eventos de seguimiento de cada envío (despacho, centro de distribución, reparto, entrega).',
    telco_recargas: 'Recargas de saldo de las líneas prepago en 2024.',
    telco_portabilidad: 'Líneas que se fueron a otra compañía (portabilidad) y a cuál.',
    telco_antenas: 'Antenas por región, tecnología y disponibilidad.',
    seguros_agentes: 'Agentes y brokers que venden pólizas.',
    seguros_pagos_prima: 'Pago mensual de la prima de cada póliza en 2024 (pagado = 0 es mora).',
    hotel_habitaciones: 'Habitaciones de cada hotel con número, tipo y piso.',
    hotel_tarifas: 'Tarifa de lista por hotel, tipo de habitación y temporada.',
    energia_tarifas: 'Cuadro tarifario por tipo de cliente y tramo de consumo (hasta_kwh NULL = sin tope).',
    energia_reclamos: 'Reclamos de clientes: tipo, si se resolvió y en cuántos días.',
    delivery_items: 'Platos de cada pedido (la suma de cantidad × precio da el subtotal del pedido).',
    delivery_turnos: 'Horas conectado y pedidos entregados por repartidor y semana de 2024.',
  };

  // metadatos para las páginas de cada base (se suman a bases.js): tablas nuevas, grano, clave y relaciones
  const BASES = {
    tienda: { tablas: { proveedores: { grano: 'un proveedor', pk: ['proveedor_id'] }, compras: { grano: 'una orden de compra de un producto', pk: ['compra_id'] }, envios: { grano: 'el envío de un pedido', pk: ['envio_id'] }, devoluciones: { grano: 'un producto devuelto de un pedido', pk: ['devolucion_id'] }, resenas: { grano: 'una reseña de un producto', pk: ['resena_id'] }, cupones: { grano: 'un cupón con su vigencia', pk: ['cupon_id'] }, uso_cupones: { grano: 'el cupón usado en un pedido', pk: ['pedido_id'] } },
      rels: [['compras', 'proveedor_id', 'proveedores', 'proveedor_id'], ['compras', 'producto_id', 'productos', 'producto_id'], ['envios', 'pedido_id', 'pedidos', 'pedido_id'], ['devoluciones', 'pedido_id', 'pedidos', 'pedido_id'], ['devoluciones', 'producto_id', 'productos', 'producto_id'], ['resenas', 'producto_id', 'productos', 'producto_id'], ['resenas', 'cliente_id', 'clientes', 'cliente_id'], ['uso_cupones', 'pedido_id', 'pedidos', 'pedido_id'], ['uso_cupones', 'cupon_id', 'cupones', 'cupon_id']],
      porQue: [['La cadena completa', 'Con proveedores, compras, envíos y devoluciones se puede seguir un producto desde que se compra al proveedor hasta que vuelve al depósito: margen real, plazos de abastecimiento, costo logístico y calidad.'], ['Un cupón por pedido', 'uso_cupones tiene como clave el pedido: una regla del negocio ("un cupón por compra") escrita en el modelo.']] },
    banco: { tablas: { banco_tarjetas: { grano: 'una tarjeta', pk: ['tarjeta_id'] }, banco_alertas: { grano: 'una alerta del motor de fraude', pk: ['alerta_id'] }, banco_sucursales: { grano: 'una sucursal', pk: ['sucursal_id'] } },
      rels: [['banco_tarjetas', 'cuenta_id', 'banco_cuentas', 'cuenta_id'], ['banco_alertas', 'tx_id', 'banco_transacciones', 'tx_id']],
      porQue: [['Alertas separadas del fraude confirmado', 'es_fraude es la verdad (lo que se confirmó); banco_alertas es lo que el sistema sospechó. Cruzarlas da la precisión y el recall del motor de fraude.']] },
    streaming: { tablas: { streaming_artistas: { grano: 'un artista', pk: ['artista'] }, streaming_playlists: { grano: 'una lista de un usuario', pk: ['playlist_id'] }, streaming_playlist_items: { grano: 'un contenido dentro de una lista', pk: ['playlist_id', 'contenido_id'] } },
      rels: [['streaming_playlists', 'usuario_id', 'streaming_usuarios', 'usuario_id'], ['streaming_playlist_items', 'playlist_id', 'streaming_playlists', 'playlist_id'], ['streaming_playlist_items', 'contenido_id', 'streaming_contenidos', 'contenido_id']],
      porQue: [['Muchos a muchos', 'Una lista tiene muchos contenidos y un contenido está en muchas listas: la tabla puente playlist_items resuelve la relación, con su clave compuesta.']] },
    viajes: { tablas: { viajes_pagos: { grano: 'el pago de un viaje', pk: ['viaje_id'] }, viajes_incidentes: { grano: 'un incidente reportado', pk: ['incidente_id'] } },
      rels: [['viajes_pagos', 'viaje_id', 'viajes_viajes', 'viaje_id'], ['viajes_incidentes', 'viaje_id', 'viajes_viajes', 'viaje_id']], porQue: [] },
    clinica: { tablas: { clinica_diagnosticos: { grano: 'el diagnóstico de un turno', pk: ['turno_id'] }, clinica_recetas: { grano: 'un medicamento recetado', pk: ['receta_id'] }, clinica_sedes: { grano: 'una sede', pk: ['sede'] } },
      rels: [['clinica_diagnosticos', 'turno_id', 'clinica_turnos', 'turno_id'], ['clinica_recetas', 'turno_id', 'clinica_turnos', 'turno_id']],
      porQue: [['Datos sensibles', 'Diagnósticos y recetas son datos de salud: en una empresa real tendrían acceso restringido y enmascaramiento. Ideal para practicar privacidad.']] },
    saas: { tablas: { saas_usuarios: { grano: 'un usuario de una empresa cliente', pk: ['usuario_id'] }, saas_uso_mensual: { grano: 'una empresa en un mes', pk: ['empresa_id', 'mes'] } },
      rels: [['saas_usuarios', 'empresa_id', 'saas_empresas', 'empresa_id'], ['saas_uso_mensual', 'empresa_id', 'saas_empresas', 'empresa_id']],
      porQue: [['El uso anticipa la baja', 'Las empresas que se van usan cada vez menos el producto en sus últimos meses: saas_uso_mensual permite construir una señal de riesgo de churn.']] },
    vuelos: { tablas: { vuelos_rutas: { grano: 'una ruta origen-destino', pk: ['origen', 'destino'] }, vuelos_equipaje: { grano: 'el equipaje de una reserva', pk: ['reserva_id'] } },
      rels: [['vuelos_equipaje', 'reserva_id', 'vuelos_reservas', 'reserva_id']], porQue: [] },
    logistica: { tablas: { logistica_transportistas: { grano: 'un transportista', pk: ['transportista'] }, logistica_skus: { grano: 'un SKU', pk: ['sku'] }, logistica_seguimiento: { grano: 'un evento de seguimiento de un envío', pk: ['envio_id', 'fecha_hora'] } },
      rels: [['logistica_seguimiento', 'envio_id', 'logistica_envios', 'envio_id'], ['logistica_envios', 'transportista', 'logistica_transportistas', 'transportista'], ['logistica_movimientos', 'sku', 'logistica_skus', 'sku']],
      porQue: [['El SKU ahora tiene tabla', 'logistica_skus completa el modelo: antes el SKU era solo un código. Muestra cómo un modelo evoluciona cuando se suma una fuente nueva.']] },
    telco: { tablas: { telco_recargas: { grano: 'una recarga', pk: ['recarga_id'] }, telco_portabilidad: { grano: 'una línea portada', pk: ['linea_id'] }, telco_antenas: { grano: 'una antena', pk: ['antena_id'] } },
      rels: [['telco_recargas', 'linea_id', 'telco_lineas', 'linea_id'], ['telco_portabilidad', 'linea_id', 'telco_lineas', 'linea_id']], porQue: [] },
    seguros: { tablas: { seguros_agentes: { grano: 'un agente', pk: ['agente_id'] }, seguros_pagos_prima: { grano: 'una póliza en un mes', pk: ['pago_id'] } },
      rels: [['seguros_pagos_prima', 'poliza_id', 'seguros_polizas', 'poliza_id']], porQue: [] },
    hotel: { tablas: { hotel_habitaciones: { grano: 'una habitación', pk: ['habitacion_id'] }, hotel_tarifas: { grano: 'un hotel, tipo y temporada', pk: ['hotel_id', 'tipo_habitacion', 'temporada'] } },
      rels: [['hotel_habitaciones', 'hotel_id', 'hotel_hoteles', 'hotel_id'], ['hotel_tarifas', 'hotel_id', 'hotel_hoteles', 'hotel_id']], porQue: [] },
    energia: { tablas: { energia_tarifas: { grano: 'un tramo de tarifa', pk: ['tipo_cliente', 'tramo'] }, energia_reclamos: { grano: 'un reclamo', pk: ['reclamo_id'] } },
      rels: [['energia_reclamos', 'cliente_id', 'energia_clientes', 'cliente_id']], porQue: [['Tarifa por tramos', 'El precio por kWh cambia según el consumo: calcular la factura exige un join por rango (desde_kwh, hasta_kwh), un patrón muy común.']] },
    delivery: { tablas: { delivery_items: { grano: 'un plato de un pedido', pk: ['item_id'] }, delivery_turnos: { grano: 'un repartidor en una semana', pk: ['repartidor_id', 'semana'] } },
      rels: [['delivery_items', 'pedido_id', 'delivery_pedidos', 'pedido_id'], ['delivery_turnos', 'repartidor_id', 'delivery_repartidores', 'repartidor_id']], porQue: [] },
  };

  const api = { build, SCHEMA, TABLE_INFO, BASES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DataExtra = api;
})(typeof window !== 'undefined' ? window : globalThis);
