/*
 * Casos de negocio adicionales (además de Tienda Andina). Datos deterministas.
 *  banco_*      Banco Austral      (fintech: cuentas, transacciones, préstamos, fraude)
 *  streaming_*  Ritmo              (streaming de música: suscripciones, reproducciones, churn)
 *  viajes_*     Ruta               (movilidad: viajes, conductores, tarifas dinámicas)
 *  clinica_*    Clínica del Sur    (salud: turnos, ausentismo, facturación)
 *  saas_*       Nube Pyme          (software B2B: MRR, facturas, soporte)
 *  vuelos_*     Cóndor Air         (aerolínea: vuelos, demoras, ocupación, reservas)
 *  logistica_*  Mercurio Logística (almacenes, movimientos de stock, envíos)
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
  const fd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const ft = (d) => `${fd(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  const DAY = 86400000, HOUR = 3600000, MIN = 60000;
  const r2 = (x) => Math.round(x * 100) / 100;
  const U = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);

  const NOMBRES = ['Sofía', 'Mateo', 'Valentina', 'Santiago', 'Isabella', 'Sebastián', 'Camila', 'Matías', 'Lucía', 'Nicolás', 'Martina', 'Diego', 'Gabriela', 'Samuel', 'Mariana', 'Tomás', 'Valeria', 'Lucas', 'Paula', 'Joaquín', 'Ana', 'Emiliano', 'Natalia', 'David', 'Florencia', 'Andrés', 'Carolina', 'Felipe', 'Laura', 'Juan', 'María', 'Carlos', 'Elena', 'Javier', 'Renata', 'Pablo'];
  const APELLIDOS = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz', 'Torres', 'Ramírez', 'Flores', 'Romero', 'Vargas', 'Castro', 'Rojas', 'Morales', 'Silva', 'Mendoza', 'Herrera', 'Medina', 'Vega', 'Reyes', 'Cruz', 'Ríos'];

  function build() {
    const rnd = mulberry32(777001);
    const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const pickW = (pairs) => { const t = pairs.reduce((s, p) => s + p[1], 0); let r = rnd() * t; for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; } return pairs[pairs.length - 1][0]; };
    const T = {};

    // =============================================================== BANCO AUSTRAL
    {
      const paises = [['Argentina', 'Buenos Aires', 4], ['Chile', 'Santiago', 3], ['México', 'Ciudad de México', 4], ['Colombia', 'Bogotá', 3], ['Perú', 'Lima', 2]];
      const clientes = [];
      for (let id = 1; id <= 800; id++) {
        const p = pickW(paises.map((x) => [x, x[2]]));
        const seg = pickW([['Joven', 30], ['Estándar', 55], ['Premium', 15]]);
        const score = Math.min(850, Math.max(300, Math.round(560 + (seg === 'Premium' ? 120 : seg === 'Joven' ? -40 : 30) + (rnd() - 0.5) * 260)));
        clientes.push([id, pick(NOMBRES), pick(APELLIDOS), p[0], fd(new Date(U(2019, 1, 1) + int(0, 1800) * DAY)), seg, score]);
      }
      T.banco_clientes = { columns: ['cliente_id', 'nombre', 'apellido', 'pais', 'fecha_alta', 'segmento', 'score_crediticio'], rows: clientes };

      const cuentas = [];
      let cid = 1;
      for (const c of clientes) {
        const n = pickW([[1, 60], [2, 30], [3, 10]]);
        for (let k = 0; k < n; k++) {
          const tipo = k === 0 ? 'ahorro' : pickW([['corriente', 60], ['inversion', 40]]);
          const alta = Math.max(Date.parse(c[4] + 'T00:00:00Z'), U(2019, 1, 1)) + int(0, 400) * DAY;
          const estado = pickW([['activa', 88], ['cerrada', 8], ['bloqueada', 4]]);
          cuentas.push([cid++, c[0], tipo, fd(new Date(Math.min(alta, U(2024, 6, 30)))), estado]);
        }
      }
      T.banco_cuentas = { columns: ['cuenta_id', 'cliente_id', 'tipo', 'fecha_apertura', 'estado'], rows: cuentas };

      const ciudades = { Argentina: ['Buenos Aires', 'Córdoba', 'Rosario'], Chile: ['Santiago', 'Valparaíso'], México: ['Ciudad de México', 'Monterrey', 'Guadalajara'], Colombia: ['Bogotá', 'Medellín', 'Cali'], Perú: ['Lima', 'Arequipa'] };
      const comercios = ['Supermercado Día', 'Farmacia Central', 'Netflix', 'Spotify', 'Uber', 'Rappi', 'Mercado Libre', 'Amazon', 'Shell', 'Cine Hoyts', 'Starbucks', 'Zara', 'Apple Store', 'Steam', 'Aerolíneas', 'Hotel Plaza'];
      const tx = [];
      const activas = cuentas.filter((c) => c[4] !== 'cerrada');
      const clientePorId = new Map(clientes.map((c) => [c[0], c]));
      let txId = 1;
      const raw = [];
      for (let i = 0; i < 12000; i++) {
        const cta = pick(activas);
        const cli = clientePorId.get(cta[1]);
        const t = U(2024, 1, 1) + int(0, 365) * DAY + int(6 * 60, 23 * 60 + 59) * MIN + int(0, 59) * 1000;
        const tipo = pickW([['compra', 45], ['deposito', 15], ['retiro', 12], ['transferencia', 18], ['pago_tarjeta', 10]]);
        const base = tipo === 'deposito' ? int(200, 3000) : tipo === 'compra' ? Math.pow(rnd(), 2.2) * 400 + 3 : tipo === 'retiro' ? int(2, 50) * 10 : tipo === 'transferencia' ? int(10, 1500) : int(50, 900);
        const monto = r2(tipo === 'deposito' ? base : -base);
        const canal = tipo === 'retiro' ? pickW([['cajero', 85], ['sucursal', 15]]) : tipo === 'compra' ? pickW([['app', 50], ['web', 35], ['pos', 15]]) : pickW([['app', 60], ['web', 30], ['sucursal', 10]]);
        raw.push([t, cta[0], tipo, monto, canal, tipo === 'compra' ? pick(comercios) : null, pick(ciudades[cli[3]]), 0]);
      }
      // fraude: ráfagas de compras en otra ciudad / montos atípicos en pocos minutos
      for (let f = 0; f < 60; f++) {
        const cta = pick(activas);
        const t0 = U(2024, 1, 1) + int(0, 360) * DAY + int(0, 23) * HOUR;
        const lejana = pick(['Miami', 'Madrid', 'São Paulo', 'Panamá']);
        const n = int(3, 6);
        for (let k = 0; k < n; k++) raw.push([t0 + k * int(1, 9) * MIN, cta[0], 'compra', -r2(int(300, 2500) + rnd()), pick(['web', 'pos']), pick(['Apple Store', 'Steam', 'Amazon', 'Hotel Plaza']), lejana, 1]);
      }
      // ráfagas legítimas (shopping, viajes): generan falsas alarmas en reglas simples
      for (let f = 0; f < 90; f++) {
        const cta = pick(activas);
        const cli = clientePorId.get(cta[1]);
        const t0 = U(2024, 1, 1) + int(0, 360) * DAY + int(10, 20) * HOUR;
        const n = int(3, 4);
        for (let k = 0; k < n; k++) raw.push([t0 + k * int(2, 12) * MIN, cta[0], 'compra', -r2(int(5, 120) + rnd()), 'pos', pick(['Zara', 'Starbucks', 'Farmacia Central', 'Supermercado Día', 'Cine Hoyts']), pick(ciudades[cli[3]]), 0]);
      }
      raw.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      for (const r of raw) tx.push([txId++, r[1], ft(new Date(r[0])), r[2], r[3], r[4], r[5], r[6], r[7]]);
      T.banco_transacciones = { columns: ['tx_id', 'cuenta_id', 'fecha_hora', 'tipo', 'monto', 'canal', 'comercio', 'ciudad', 'es_fraude'], rows: tx };

      const prestamos = [], cuotas = [];
      let cuotaId = 1;
      for (let id = 1; id <= 420; id++) {
        const c = pick(clientes);
        const score = c[6];
        const otorgado = U(2022, 1, 1) + int(0, 900) * DAY;
        const monto = int(10, 300) * 100;
        const plazo = pick([6, 12, 12, 18, 24]);
        const tasa = r2(0.18 + (850 - score) / 1000 * 0.4 + rnd() * 0.05);
        const riesgo = (750 - score) / 450; // mayor riesgo con score bajo
        const cuota = r2(monto * (tasa / 12) / (1 - Math.pow(1 + tasa / 12, -plazo)));
        let estado = 'al_dia', atrasos = 0;
        const hoy = U(2024, 12, 31);
        const impaga = rnd() < Math.max(0.03, riesgo * 0.35);
        for (let n = 1; n <= plazo; n++) {
          const venc = new Date(otorgado + n * 30 * DAY);
          let pago = null;
          if (venc.getTime() <= hoy) {
            if (impaga && n > plazo / 3) { pago = rnd() < 0.15 ? fd(new Date(venc.getTime() + int(20, 90) * DAY)) : null; }
            else pago = fd(new Date(venc.getTime() + (rnd() < 0.85 ? -int(0, 5) : int(1, 25)) * DAY));
            if (pago === null) atrasos++;
          }
          cuotas.push([cuotaId++, id, n, fd(venc), pago, cuota]);
        }
        const ultimaVenc = otorgado + plazo * 30 * DAY;
        if (atrasos >= 4) estado = 'incobrable'; else if (atrasos > 0) estado = 'atrasado'; else if (ultimaVenc <= hoy) estado = 'pagado';
        prestamos.push([id, c[0], fd(new Date(otorgado)), monto, tasa, plazo, estado]);
      }
      T.banco_prestamos = { columns: ['prestamo_id', 'cliente_id', 'fecha_otorgado', 'monto', 'tasa_anual', 'plazo_meses', 'estado'], rows: prestamos };
      T.banco_cuotas = { columns: ['cuota_id', 'prestamo_id', 'numero', 'fecha_vencimiento', 'fecha_pago', 'monto'], rows: cuotas };
    }

    // =============================================================== STREAMING RITMO
    {
      const paises = [['Argentina', 3], ['México', 4], ['Colombia', 3], ['Chile', 2], ['España', 3], ['Perú', 2]];
      const usuarios = [];
      for (let id = 1; id <= 2500; id++) {
        usuarios.push([id, pickW(paises), fd(new Date(U(2023, 1, 1) + int(0, 640) * DAY)), int(15, 68), pickW([['movil', 65], ['escritorio', 20], ['tv', 10], ['parlante', 5]])]);
      }
      T.streaming_usuarios = { columns: ['usuario_id', 'pais', 'fecha_registro', 'edad', 'dispositivo_principal'], rows: usuarios };
      const PRECIOS = { gratis: 0, individual: 5.99, duo: 7.99, familiar: 9.99 };
      const subs = [];
      let sid = 1;
      const fin = U(2024, 12, 31);
      for (const u of usuarios) {
        let t = Date.parse(u[2] + 'T00:00:00Z');
        let plan = pickW([['gratis', 55], ['individual', 30], ['duo', 7], ['familiar', 8]]);
        for (let k = 0; k < 4 && t < fin; k++) {
          const dur = int(20, 500) * DAY;
          const finSub = t + dur;
          const sigue = finSub >= fin;
          const motivo = sigue ? null : pickW([['precio', 35], ['falta_contenido', 20], ['cambio_plan', 30], ['problemas_tecnicos', 15]]);
          subs.push([sid++, u[0], plan, PRECIOS[plan], fd(new Date(t)), sigue ? null : fd(new Date(finSub)), motivo]);
          if (sigue || (motivo !== 'cambio_plan' && rnd() < 0.7)) break;
          t = finSub + DAY;
          plan = plan === 'gratis' ? pickW([['individual', 70], ['duo', 15], ['familiar', 15]]) : pickW([['gratis', 30], ['individual', 30], ['duo', 20], ['familiar', 20]]);
        }
      }
      T.streaming_suscripciones = { columns: ['suscripcion_id', 'usuario_id', 'plan', 'precio_mensual', 'fecha_inicio', 'fecha_fin', 'motivo_baja'], rows: subs };
      const generos = ['Reguetón', 'Pop', 'Rock', 'Cumbia', 'Salsa', 'Indie', 'Electrónica', 'Trap', 'Jazz', 'Podcast'];
      const artistas = ['Luna Roja', 'Los del Sur', 'DJ Cóndor', 'Marea Alta', 'Sofía Ríos', 'El Trío', 'Neón 80', 'Bahía', 'La Orquesta', 'Kali', 'Viento Norte', 'Ciudad Gris'];
      const palabras = ['Noche', 'Fuego', 'Mar', 'Ciudad', 'Amor', 'Viaje', 'Sol', 'Lluvia', 'Ritmo', 'Calle', 'Luna', 'Cielo', 'Baile', 'Recuerdo'];
      const contenidos = [];
      for (let id = 1; id <= 600; id++) {
        const g = pickW(generos.map((x) => [x, x === 'Podcast' ? 1.2 : x === 'Reguetón' || x === 'Pop' ? 2 : 1]));
        const esPod = g === 'Podcast';
        contenidos.push([id, `${pick(palabras)} ${pick(palabras).toLowerCase()}${rnd() < 0.3 ? ' (remix)' : ''}`, esPod ? 'podcast' : 'cancion', g, esPod ? pick(['Datos y Café', 'Charla Tech', 'Historias LATAM', 'Finanzas Fáciles']) : pick(artistas), esPod ? int(900, 3600) : int(120, 300), fd(new Date(U(2018, 1, 1) + int(0, 2500) * DAY))]);
      }
      T.streaming_contenidos = { columns: ['contenido_id', 'titulo', 'tipo', 'genero', 'artista', 'duracion_seg', 'fecha_lanzamiento'], rows: contenidos };
      const pop = contenidos.map(() => Math.pow(rnd(), 3) * 10 + 0.1);
      const popT = pop.reduce((a, b) => a + b, 0);
      const pickC = () => { let r = rnd() * popT; for (let i = 0; i < contenidos.length; i++) { r -= pop[i]; if (r <= 0) return contenidos[i]; } return contenidos[0]; };
      const actividad = usuarios.map(() => Math.pow(rnd(), 2) * 10 + 0.2);
      const actT = actividad.reduce((a, b) => a + b, 0);
      const pickU = () => { let r = rnd() * actT; for (let i = 0; i < usuarios.length; i++) { r -= actividad[i]; if (r <= 0) return usuarios[i]; } return usuarios[0]; };
      const rep = [];
      for (let i = 0; i < 18000; i++) {
        const u = pickU();
        const reg = Date.parse(u[2] + 'T00:00:00Z');
        const desde = Math.max(reg, U(2024, 1, 1));
        if (desde > fin) continue;
        const t = desde + Math.floor(rnd() * ((fin - desde) / DAY + 1)) * DAY + int(7 * 60, 24 * 60 - 1) * MIN;
        const c = pickC();
        const skipP = { Podcast: 0.34, 'Reguetón': 0.14, Pop: 0.17, Jazz: 0.31, Trap: 0.26, Rock: 0.2 }[c[3]] || 0.22;
        const escuchado = rnd() < skipP ? int(3, 29) : rnd() < 0.6 ? c[5] : int(30, c[5]);
        rep.push([t, u[0], c[0], escuchado, rnd() < 0.7 ? u[4] : pick(['movil', 'escritorio', 'tv', 'parlante'])]);
      }
      rep.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      T.streaming_reproducciones = { columns: ['repro_id', 'usuario_id', 'contenido_id', 'fecha_hora', 'segundos_escuchados', 'dispositivo'], rows: rep.map((r, i) => [i + 1, r[1], r[2], ft(new Date(r[0])), r[3], r[4]]) };
    }

    // =============================================================== VIAJES RUTA
    {
      const ciudades = [['Bogotá', 4], ['Lima', 3], ['Ciudad de México', 5], ['Santiago', 3], ['Buenos Aires', 4]];
      const conductores = [];
      for (let id = 1; id <= 300; id++) conductores.push([id, `${pick(NOMBRES)} ${pick(APELLIDOS)}`, pickW(ciudades), fd(new Date(U(2021, 1, 1) + int(0, 1200) * DAY)), pickW([['auto', 75], ['moto', 18], ['van', 7]])]);
      T.viajes_conductores = { columns: ['conductor_id', 'nombre', 'ciudad', 'fecha_alta', 'vehiculo'], rows: conductores };
      const pasajeros = [];
      for (let id = 1; id <= 3000; id++) pasajeros.push([id, pickW(ciudades), fd(new Date(U(2022, 1, 1) + int(0, 900) * DAY))]);
      T.viajes_pasajeros = { columns: ['pasajero_id', 'ciudad', 'fecha_registro'], rows: pasajeros };
      const porCiudad = {};
      for (const c of conductores) (porCiudad[c[2]] = porCiudad[c[2]] || []).push(c);
      const calidad = conductores.map(() => 3.6 + rnd() * 1.4);
      const viajes = [];
      for (let i = 0; i < 11000; i++) {
        const p = pick(pasajeros);
        let hora;
        for (;;) { hora = int(0, 23); const w = (hora >= 7 && hora <= 9) || (hora >= 17 && hora <= 20) ? 3 : hora >= 23 || hora <= 5 ? 0.6 : 1.4; if (rnd() < w / 3) break; }
        const t = U(2024, 7, 1) + int(0, 183) * DAY + hora * HOUR + int(0, 59) * MIN + int(0, 59) * 1000;
        const pico = (hora >= 7 && hora <= 9) || (hora >= 17 && hora <= 20);
        const lluvia = rnd() < 0.12;
        const mult = r2(pico ? 1 + rnd() * (lluvia ? 1.5 : 0.8) : lluvia ? 1 + rnd() * 0.6 : 1);
        const dist = r2(Math.max(0.8, Math.pow(rnd(), 1.5) * 25));
        let estado = pickW([['completado', 82], ['cancelado_pasajero', 8], ['cancelado_conductor', 5], ['sin_conductor', pico ? 9 : 3]]);
        const cond = estado === 'sin_conductor' ? null : pick(porCiudad[p[1]]);
        const espera = cond ? int(2, pico ? 18 : 9) : null;
        const inicio = estado === 'completado' ? t + espera * MIN : null;
        const finV = inicio ? inicio + Math.round(dist * (pico ? 4.2 : 2.6) + int(2, 8)) * MIN : null;
        const tarifa = estado === 'completado' ? r2((1.2 + dist * 0.9) * mult) : null;
        const calif = estado === 'completado' && rnd() < 0.75 ? Math.max(1, Math.min(5, Math.round(calidad[cond[0] - 1] + (rnd() - 0.5) * 1.6))) : null;
        viajes.push([t, p[0], cond ? cond[0] : null, p[1], inicio, finV, dist, tarifa, mult, estado, calif]);
      }
      viajes.sort((a, b) => a[0] - b[0]);
      T.viajes_viajes = { columns: ['viaje_id', 'pasajero_id', 'conductor_id', 'ciudad', 'fecha_hora_solicitud', 'fecha_hora_inicio', 'fecha_hora_fin', 'distancia_km', 'tarifa', 'multiplicador', 'estado', 'calificacion'], rows: viajes.map((v, i) => [i + 1, v[1], v[2], v[3], ft(new Date(v[0])), v[4] ? ft(new Date(v[4])) : null, v[5] ? ft(new Date(v[5])) : null, v[6], v[7], v[8], v[9], v[10]]) };
    }

    // =============================================================== CLÍNICA DEL SUR
    {
      const pacientes = [];
      for (let id = 1; id <= 2200; id++) pacientes.push([id, pick(['F', 'M']), fd(new Date(U(1940, 1, 1) + int(0, 30000) * DAY)), pickW([['OSDE', 25], ['Swiss Medical', 15], ['Particular', 20], ['PAMI', 15], ['Galeno', 25]]), pick(['Rosario', 'Córdoba', 'Mendoza', 'La Plata'])]);
      T.clinica_pacientes = { columns: ['paciente_id', 'sexo', 'fecha_nacimiento', 'cobertura', 'ciudad'], rows: pacientes };
      const esps = [['Clínica médica', 8], ['Pediatría', 5], ['Cardiología', 4], ['Traumatología', 4], ['Dermatología', 3], ['Ginecología', 4], ['Oftalmología', 3], ['Psicología', 4]];
      const medicos = [];
      let mid = 1;
      for (const [e, n] of esps) for (let k = 0; k < n; k++) medicos.push([mid++, `Dr/a. ${pick(APELLIDOS)}`, e, pick(['Centro', 'Norte', 'Oeste'])]);
      T.clinica_medicos = { columns: ['medico_id', 'nombre', 'especialidad', 'sede'], rows: medicos };
      const PRECIO = { 'Clínica médica': 30, Pediatría: 32, Cardiología: 55, Traumatología: 50, Dermatología: 45, Ginecología: 45, Oftalmología: 48, Psicología: 40 };
      const turnos = [], facturas = [];
      for (let i = 0; i < 9000; i++) {
        const p = pick(pacientes), m = pick(medicos);
        const dia = U(2024, 1, 2) + int(0, 360) * DAY;
        const dow = new Date(dia).getUTCDay();
        if (dow === 0) continue;
        const t = dia + int(16, 38) * 30 * MIN; // 8:00 a 19:00
        const anticipacion = pickW([[int(0, 2), 30], [int(3, 10), 40], [int(11, 45), 30]]);
        const pAus = 0.06 + Math.min(anticipacion, 45) / 45 * 0.22 + (dow === 1 ? 0.04 : 0);
        const estado = rnd() < 0.07 ? 'cancelado' : rnd() < pAus ? 'ausente' : 'atendido';
        turnos.push([t, p[0], m[0], estado, fd(new Date(dia - anticipacion * DAY)), m[2]]);
      }
      turnos.sort((a, b) => a[0] - b[0] || a[2] - b[2]);
      let fid = 1;
      turnos.forEach((tr, i) => {
        if (tr[3] !== 'atendido') return;
        const cob = pacientes[tr[1] - 1][3];
        const monto = PRECIO[tr[5]];
        const cubre = cob === 'Particular' ? 0 : cob === 'PAMI' ? 1 : 0.8;
        facturas.push([fid++, i + 1, monto, r2(monto * cubre), rnd() < 0.93 ? 1 : 0]);
      });
      T.clinica_turnos = { columns: ['turno_id', 'paciente_id', 'medico_id', 'fecha_hora', 'estado', 'fecha_reserva'], rows: turnos.map((t, i) => [i + 1, t[1], t[2], ft(new Date(t[0])), t[3], t[4]]) };
      T.clinica_facturas = { columns: ['factura_id', 'turno_id', 'monto', 'monto_cubierto', 'pagada'], rows: facturas };
    }

    // =============================================================== SAAS NUBE PYME
    {
      T.saas_planes = { columns: ['plan_id', 'nombre', 'precio_mensual'], rows: [[1, 'Básico', 49], [2, 'Profesional', 149], [3, 'Empresa', 499]] };
      const industrias = ['Retail', 'Salud', 'Educación', 'Finanzas', 'Logística', 'Turismo', 'Tecnología'];
      const empresas = [], facturas = [], tickets = [];
      let fid = 1, tid = 1;
      for (let id = 1; id <= 450; id++) {
        const emp = Math.round(Math.pow(rnd(), 2) * 900 + 5);
        const alta = U(2022, 1, 1) + int(0, 1000) * DAY;
        const feliz = rnd(); // qué tan conforme está la empresa con el producto
        empresas.push([id, `${pick(['Grupo', 'Comercial', 'Servicios', 'Distribuidora', 'Estudio', 'Clínica'])} ${pick(APELLIDOS)}${rnd() < 0.3 ? ' SA' : ' SRL'}`, pick(industrias), pick(['Argentina', 'México', 'Colombia', 'Chile', 'Perú', 'Uruguay']), emp, fd(new Date(alta))]);
        let plan = emp > 400 ? pickW([[2, 40], [3, 60]]) : emp > 60 ? pickW([[1, 30], [2, 60], [3, 10]]) : pickW([[1, 80], [2, 20]]);
        const d = new Date(alta);
        let y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
        let activa = true;
        while (activa && (y < 2024 || (y === 2024 && m <= 12))) {
          const precio = T.saas_planes.rows[plan - 1][2];
          const r = rnd();
          const estado = (y === 2024 && m === 12) ? (r < 0.75 ? 'pagada' : 'pendiente') : r < 0.94 ? 'pagada' : 'vencida';
          facturas.push([fid++, id, plan, `${y}-${pad(m)}-01`, precio, estado]);
          const ev = rnd();
          if (ev < 0.004 + (1 - feliz) * 0.022) activa = false;  // churn (más probable si está disconforme)
          else if (ev < 0.06 && plan < 3) plan++;                 // upgrade
          else if (ev < 0.072 && plan > 1) plan--;                // downgrade
          m++; if (m > 12) { m = 1; y++; }
        }
        const nt = Math.round(rnd() * 12 * (emp > 300 ? 1.6 : 1));
        for (let k = 0; k < nt; k++) {
          const creado = Math.max(alta, U(2023, 1, 1)) + int(0, 600) * DAY + int(8, 20) * HOUR;
          if (creado > U(2024, 12, 31)) continue;
          const prio = pickW([['baja', 40], ['media', 40], ['alta', 15], ['critica', 5]]);
          const horas = prio === 'critica' ? int(1, 30) : prio === 'alta' ? int(2, 60) : int(4, 160);
          const cerrado = rnd() < 0.92 ? creado + horas * HOUR : null;
          tickets.push([tid++, id, ft(new Date(creado)), cerrado ? ft(new Date(cerrado)) : null, prio, pick(['facturación', 'integraciones', 'errores', 'acceso', 'consulta']), cerrado && rnd() < 0.7 ? Math.max(1, Math.min(5, Math.round(2.5 + feliz * 2.6 - horas / 90 + (rnd() - 0.5) * 1.5))) : null]);
        }
      }
      T.saas_empresas = { columns: ['empresa_id', 'nombre', 'industria', 'pais', 'empleados', 'fecha_alta'], rows: empresas };
      T.saas_facturas = { columns: ['factura_id', 'empresa_id', 'plan_id', 'mes', 'monto', 'estado'], rows: facturas };
      T.saas_tickets = { columns: ['ticket_id', 'empresa_id', 'fecha_creacion', 'fecha_cierre', 'prioridad', 'categoria', 'satisfaccion'], rows: tickets };
    }

    // =============================================================== VUELOS CÓNDOR AIR
    {
      const aeropuertos = [['EZE', 'Buenos Aires', 'Argentina'], ['AEP', 'Buenos Aires', 'Argentina'], ['SCL', 'Santiago', 'Chile'], ['LIM', 'Lima', 'Perú'], ['BOG', 'Bogotá', 'Colombia'], ['MEX', 'Ciudad de México', 'México'], ['GRU', 'São Paulo', 'Brasil'], ['MVD', 'Montevideo', 'Uruguay'], ['MDE', 'Medellín', 'Colombia'], ['CUN', 'Cancún', 'México'], ['MAD', 'Madrid', 'España'], ['COR', 'Córdoba', 'Argentina']];
      T.vuelos_aeropuertos = { columns: ['codigo', 'ciudad', 'pais'], rows: aeropuertos };
      const rutas = [['EZE', 'SCL', 120, 160], ['SCL', 'EZE', 120, 160], ['EZE', 'LIM', 270, 180], ['LIM', 'EZE', 270, 180], ['LIM', 'BOG', 190, 180], ['BOG', 'LIM', 190, 180], ['BOG', 'MEX', 290, 180], ['MEX', 'BOG', 290, 180], ['MEX', 'CUN', 130, 180], ['CUN', 'MEX', 130, 180], ['EZE', 'GRU', 170, 180], ['GRU', 'EZE', 170, 180], ['AEP', 'MVD', 55, 120], ['MVD', 'AEP', 55, 120], ['BOG', 'MDE', 60, 150], ['MDE', 'BOG', 60, 150], ['EZE', 'MAD', 760, 280], ['MAD', 'EZE', 760, 280], ['AEP', 'COR', 80, 150], ['COR', 'AEP', 80, 150]];
      const vuelos = [], reservas = [];
      let vid = 1, rid = 1, pasajero = 1;
      for (let d = U(2024, 1, 1); d <= U(2024, 12, 31); d += DAY) {
        const demoraIda = {};
        rutas.forEach((r, k) => {
          if ((k + new Date(d).getUTCDate()) % 3 !== 0 && r[2] > 200) return; // rutas largas no diarias
          if (rnd() < 0.18) return;
          const salidaProg = d + (6 + (k * 3) % 16) * HOUR + (k % 2) * 30 * MIN;
          const temporada = [0, 1, 6, 11].includes(new Date(d).getUTCMonth());
          const cancel = rnd() < 0.025;
          let demora = cancel ? null : (rnd() < 0.2 ? Math.round(Math.pow(rnd(), 2) * 170) + 15 : int(-5, 8)) + (r[0] === 'BOG' || r[0] === 'MEX' ? int(0, 15) : 0);
          if (!cancel && k % 2 === 1 && demoraIda[k - 1] > 30) demora += Math.round(demoraIda[k - 1] * (0.5 + rnd() * 0.4)); // la demora se propaga a la vuelta
          const salidaReal = cancel ? null : salidaProg + demora * MIN;
          const llegProg = salidaProg + r[2] * MIN;
          const llegReal = cancel ? null : salidaReal + (r[2] + int(-15, 6)) * MIN;
          const estado = cancel ? 'cancelado' : demora > 15 ? 'demorado' : 'a_tiempo';
          demoraIda[k] = cancel ? 0 : demora;
          vuelos.push([vid, `CA${100 + k * 2 + (r[2] > 200 ? 500 : 0)}`, r[0], r[1], fd(new Date(d)), ft(new Date(salidaProg)), salidaReal ? ft(new Date(salidaReal)) : null, ft(new Date(llegProg)), llegReal ? ft(new Date(llegReal)) : null, estado, r[3]]);
          const ocup = Math.min(1, (temporada ? 0.78 : 0.62) + (rnd() - 0.4) * 0.3);
          const n = Math.round(r[3] * ocup * 0.025); // muestra (2,5%) de las reservas para mantener el tamaño
          for (let j = 0; j < n; j++) {
            const ant = Math.round(Math.pow(rnd(), 1.4) * 120);
            const clase = pickW([['economica', 82], ['premium', 12], ['ejecutiva', 6]]);
            const base = r[2] * (clase === 'economica' ? 0.9 : clase === 'premium' ? 1.5 : 3.2);
            const precio = r2(base * (1 + Math.max(0, 30 - ant) / 30 * 0.8) * (temporada ? 1.25 : 1));
            const est = cancel ? 'cancelada' : pickW([['confirmada', 90], ['cancelada', 6], ['no_show', 4]]);
            reservas.push([rid++, vid, pasajero++, fd(new Date(d - ant * DAY)), clase, precio, est]);
          }
          vid++;
        });
      }
      T.vuelos_vuelos = { columns: ['vuelo_id', 'numero', 'origen', 'destino', 'fecha', 'salida_programada', 'salida_real', 'llegada_programada', 'llegada_real', 'estado', 'capacidad'], rows: vuelos };
      T.vuelos_reservas = { columns: ['reserva_id', 'vuelo_id', 'pasajero_id', 'fecha_reserva', 'clase', 'precio', 'estado'], rows: reservas };
    }

    // =============================================================== LOGÍSTICA MERCURIO
    {
      const alm = [[1, 'Buenos Aires', 50000], [2, 'Córdoba', 20000], [3, 'Ciudad de México', 60000], [4, 'Monterrey', 25000], [5, 'Bogotá', 40000], [6, 'Lima', 30000]];
      T.logistica_almacenes = { columns: ['almacen_id', 'ciudad', 'capacidad_unidades'], rows: alm };
      const skus = [];
      for (let k = 1; k <= 40; k++) skus.push([`SKU-${String(k).padStart(3, '0')}`, Math.pow(rnd(), 1.5) * 30 + 2]);
      const movs = [];
      for (const a of alm) {
        for (const [sku, demanda] of skus) {
          if (rnd() < 0.25) continue;
          let stock = Math.round(demanda * 20);
          movs.push([U(2024, 1, 1), a[0], sku, 'entrada', stock]);
          for (let d = U(2024, 1, 1); d <= U(2024, 12, 31); d += DAY) {
            if (stock < demanda * 5 && rnd() < 0.25) { const q = Math.round(demanda * int(15, 35)); movs.push([d, a[0], sku, 'entrada', q]); stock += q; }
            const venta = Math.round(demanda * (0.3 + rnd() * 1.4) * (a[2] / 40000));
            if (venta > 0 && rnd() < 0.6) { const q = venta; movs.push([d, a[0], sku, 'salida', -q]); stock -= q; } // puede quedar negativo = quiebre registrado tarde
            if (rnd() < 0.004) { const q = -int(1, 10); movs.push([d, a[0], sku, 'ajuste', q]); stock += q; }
          }
        }
      }
      movs.sort((x, y) => x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0));
      // reducir tamaño: quedarse con los movimientos manteniendo todos los de algunos SKU
      const keep = new Set(skus.slice(0, 12).map((s) => s[0]));
      const movsK = movs.filter((m) => keep.has(m[2]));
      T.logistica_movimientos = { columns: ['movimiento_id', 'almacen_id', 'sku', 'fecha', 'tipo', 'cantidad'], rows: movsK.map((m, i) => [i + 1, m[1], m[2], fd(new Date(m[0])), m[3], m[4]]) };
      const envios = [];
      const transp = [['Rápido Express', 0.9], ['Correo Nacional', 0.7], ['MotoYa', 0.85], ['CargoSur', 0.78]];
      for (let id = 1; id <= 6000; id++) {
        const a = pick(alm);
        const [tr, puntual] = pick(transp);
        const desp = U(2024, 1, 2) + int(0, 355) * DAY + int(8, 18) * HOUR;
        const prometidos = tr === 'MotoYa' ? 1 : int(2, 5);
        const prom = desp + prometidos * DAY;
        const estado = pickW([['entregado', 92], ['en_transito', 3], ['devuelto', 3], ['perdido', 2]]);
        const real = estado === 'entregado' ? desp + (rnd() < puntual ? int(Math.max(0, prometidos - 2), prometidos) : prometidos + int(1, 6)) * DAY + int(0, 6) * HOUR : null;
        envios.push([id, a[0], pick(['Buenos Aires', 'Rosario', 'Córdoba', 'Ciudad de México', 'Puebla', 'Monterrey', 'Bogotá', 'Cali', 'Lima', 'Arequipa']), tr, ft(new Date(desp)), fd(new Date(prom)), real ? ft(new Date(real)) : null, r2(3 + rnd() * 12 + (tr === 'MotoYa' ? 2 : 0)), estado]);
      }
      T.logistica_envios = { columns: ['envio_id', 'almacen_id', 'ciudad_destino', 'transportista', 'fecha_despacho', 'fecha_prometida', 'fecha_entrega', 'costo', 'estado'], rows: envios };
    }
    return T;
  }

  const SCHEMA = `
CREATE TABLE banco_clientes (cliente_id INTEGER PRIMARY KEY, nombre TEXT, apellido TEXT, pais TEXT, fecha_alta TEXT, segmento TEXT, score_crediticio INTEGER);
CREATE TABLE banco_cuentas (cuenta_id INTEGER PRIMARY KEY, cliente_id INTEGER, tipo TEXT, fecha_apertura TEXT, estado TEXT);
CREATE TABLE banco_transacciones (tx_id INTEGER PRIMARY KEY, cuenta_id INTEGER, fecha_hora TEXT, tipo TEXT, monto REAL, canal TEXT, comercio TEXT, ciudad TEXT, es_fraude INTEGER);
CREATE TABLE banco_prestamos (prestamo_id INTEGER PRIMARY KEY, cliente_id INTEGER, fecha_otorgado TEXT, monto REAL, tasa_anual REAL, plazo_meses INTEGER, estado TEXT);
CREATE TABLE banco_cuotas (cuota_id INTEGER PRIMARY KEY, prestamo_id INTEGER, numero INTEGER, fecha_vencimiento TEXT, fecha_pago TEXT, monto REAL);
CREATE TABLE streaming_usuarios (usuario_id INTEGER PRIMARY KEY, pais TEXT, fecha_registro TEXT, edad INTEGER, dispositivo_principal TEXT);
CREATE TABLE streaming_suscripciones (suscripcion_id INTEGER PRIMARY KEY, usuario_id INTEGER, plan TEXT, precio_mensual REAL, fecha_inicio TEXT, fecha_fin TEXT, motivo_baja TEXT);
CREATE TABLE streaming_contenidos (contenido_id INTEGER PRIMARY KEY, titulo TEXT, tipo TEXT, genero TEXT, artista TEXT, duracion_seg INTEGER, fecha_lanzamiento TEXT);
CREATE TABLE streaming_reproducciones (repro_id INTEGER PRIMARY KEY, usuario_id INTEGER, contenido_id INTEGER, fecha_hora TEXT, segundos_escuchados INTEGER, dispositivo TEXT);
CREATE TABLE viajes_conductores (conductor_id INTEGER PRIMARY KEY, nombre TEXT, ciudad TEXT, fecha_alta TEXT, vehiculo TEXT);
CREATE TABLE viajes_pasajeros (pasajero_id INTEGER PRIMARY KEY, ciudad TEXT, fecha_registro TEXT);
CREATE TABLE viajes_viajes (viaje_id INTEGER PRIMARY KEY, pasajero_id INTEGER, conductor_id INTEGER, ciudad TEXT, fecha_hora_solicitud TEXT, fecha_hora_inicio TEXT, fecha_hora_fin TEXT, distancia_km REAL, tarifa REAL, multiplicador REAL, estado TEXT, calificacion INTEGER);
CREATE TABLE clinica_pacientes (paciente_id INTEGER PRIMARY KEY, sexo TEXT, fecha_nacimiento TEXT, cobertura TEXT, ciudad TEXT);
CREATE TABLE clinica_medicos (medico_id INTEGER PRIMARY KEY, nombre TEXT, especialidad TEXT, sede TEXT);
CREATE TABLE clinica_turnos (turno_id INTEGER PRIMARY KEY, paciente_id INTEGER, medico_id INTEGER, fecha_hora TEXT, estado TEXT, fecha_reserva TEXT);
CREATE TABLE clinica_facturas (factura_id INTEGER PRIMARY KEY, turno_id INTEGER, monto REAL, monto_cubierto REAL, pagada INTEGER);
CREATE TABLE saas_planes (plan_id INTEGER PRIMARY KEY, nombre TEXT, precio_mensual REAL);
CREATE TABLE saas_empresas (empresa_id INTEGER PRIMARY KEY, nombre TEXT, industria TEXT, pais TEXT, empleados INTEGER, fecha_alta TEXT);
CREATE TABLE saas_facturas (factura_id INTEGER PRIMARY KEY, empresa_id INTEGER, plan_id INTEGER, mes TEXT, monto REAL, estado TEXT);
CREATE TABLE saas_tickets (ticket_id INTEGER PRIMARY KEY, empresa_id INTEGER, fecha_creacion TEXT, fecha_cierre TEXT, prioridad TEXT, categoria TEXT, satisfaccion INTEGER);
CREATE TABLE vuelos_aeropuertos (codigo TEXT PRIMARY KEY, ciudad TEXT, pais TEXT);
CREATE TABLE vuelos_vuelos (vuelo_id INTEGER PRIMARY KEY, numero TEXT, origen TEXT, destino TEXT, fecha TEXT, salida_programada TEXT, salida_real TEXT, llegada_programada TEXT, llegada_real TEXT, estado TEXT, capacidad INTEGER);
CREATE TABLE vuelos_reservas (reserva_id INTEGER PRIMARY KEY, vuelo_id INTEGER, pasajero_id INTEGER, fecha_reserva TEXT, clase TEXT, precio REAL, estado TEXT);
CREATE TABLE logistica_almacenes (almacen_id INTEGER PRIMARY KEY, ciudad TEXT, capacidad_unidades INTEGER);
CREATE TABLE logistica_movimientos (movimiento_id INTEGER PRIMARY KEY, almacen_id INTEGER, sku TEXT, fecha TEXT, tipo TEXT, cantidad INTEGER);
CREATE TABLE logistica_envios (envio_id INTEGER PRIMARY KEY, almacen_id INTEGER, ciudad_destino TEXT, transportista TEXT, fecha_despacho TEXT, fecha_prometida TEXT, fecha_entrega TEXT, costo REAL, estado TEXT);
CREATE INDEX idx_btx_cuenta ON banco_transacciones(cuenta_id);
CREATE INDEX idx_srep_usuario ON streaming_reproducciones(usuario_id);
CREATE INDEX idx_vres_vuelo ON vuelos_reservas(vuelo_id);
`;

  const CASOS = [
    { id: 'tienda', nombre: 'Tienda Andina', icono: '🛒', prefijo: '', rubro: 'E-commerce', resumen: 'Pedidos, clientes, productos, pagos y navegación web.' },
    { id: 'banco', nombre: 'Banco Austral', icono: '🏦', prefijo: 'banco_', rubro: 'Banca / Fintech', resumen: 'Cuentas, transacciones, préstamos, cuotas y fraude.' },
    { id: 'streaming', nombre: 'Ritmo', icono: '🎧', prefijo: 'streaming_', rubro: 'Streaming de música', resumen: 'Usuarios, planes, suscripciones y reproducciones.' },
    { id: 'viajes', nombre: 'Ruta', icono: '🚕', prefijo: 'viajes_', rubro: 'Movilidad', resumen: 'Viajes, conductores, tarifas dinámicas y cancelaciones.' },
    { id: 'clinica', nombre: 'Clínica del Sur', icono: '🏥', prefijo: 'clinica_', rubro: 'Salud', resumen: 'Turnos, médicos, ausentismo y facturación.' },
    { id: 'saas', nombre: 'Nube Pyme', icono: '☁️', prefijo: 'saas_', rubro: 'Software B2B (SaaS)', resumen: 'Empresas clientes, facturas mensuales (MRR) y soporte.' },
    { id: 'vuelos', nombre: 'Cóndor Air', icono: '✈️', prefijo: 'vuelos_', rubro: 'Aerolínea', resumen: 'Vuelos, demoras, reservas y precios.' },
    { id: 'logistica', nombre: 'Mercurio Logística', icono: '📦', prefijo: 'logistica_', rubro: 'Logística', resumen: 'Almacenes, movimientos de stock y envíos.' },
  ];

  const TABLE_INFO = {
    banco_clientes: 'Clientes del banco con segmento y score crediticio (300-850).',
    banco_cuentas: 'Cuentas (ahorro, corriente, inversión) y su estado.',
    banco_transacciones: 'Movimientos 2024: montos positivos entran, negativos salen. es_fraude marca fraude confirmado.',
    banco_prestamos: 'Préstamos personales con tasa, plazo y estado.',
    banco_cuotas: 'Cuotas de cada préstamo. fecha_pago NULL = impaga.',
    streaming_usuarios: 'Usuarios registrados de la app de música.',
    streaming_suscripciones: 'Historial de planes de cada usuario. fecha_fin NULL = vigente.',
    streaming_contenidos: 'Canciones y podcasts del catálogo.',
    streaming_reproducciones: 'Reproducciones de 2024 (menos de 30 s = “skip”).',
    viajes_conductores: 'Conductores por ciudad y tipo de vehículo.',
    viajes_pasajeros: 'Pasajeros registrados.',
    viajes_viajes: 'Solicitudes de viaje (jul-dic 2024): estado, tarifa, multiplicador dinámico y calificación.',
    clinica_pacientes: 'Pacientes con cobertura médica.',
    clinica_medicos: 'Médicos, especialidad y sede.',
    clinica_turnos: 'Turnos 2024: atendido, ausente o cancelado, con fecha de reserva.',
    clinica_facturas: 'Facturación de turnos atendidos y cuánto cubre el seguro.',
    saas_planes: 'Planes de suscripción del software.',
    saas_empresas: 'Empresas clientes del SaaS.',
    saas_facturas: 'Una factura por empresa y mes (base para el MRR).',
    saas_tickets: 'Tickets de soporte con prioridad, tiempos y satisfacción.',
    vuelos_aeropuertos: 'Aeropuertos de la red.',
    vuelos_vuelos: 'Vuelos 2024 con horarios programados y reales.',
    vuelos_reservas: 'Muestra de reservas por vuelo con clase y precio.',
    logistica_almacenes: 'Almacenes y su capacidad.',
    logistica_movimientos: 'Entradas, salidas y ajustes de stock por día (el stock es la suma acumulada).',
    logistica_envios: 'Envíos con fecha prometida y real, transportista y costo.',
  };

  const api = { build, SCHEMA, TABLE_INFO, CASOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DataCasos = api;
})(typeof window !== 'undefined' ? window : globalThis);
