/*
 * Casos de negocio adicionales (además de Tienda Andina). Datos deterministas.
 *  banco_*      Banco Austral      (fintech: cuentas, transacciones, préstamos, fraude)
 *  streaming_*  Ritmo              (streaming de música: suscripciones, reproducciones, churn)
 *  viajes_*     Ruta               (movilidad: viajes, conductores, tarifas dinámicas)
 *  clinica_*    Clínica del Sur    (salud: turnos, ausentismo, facturación)
 *  saas_*       Nube Pyme          (software B2B: MRR, facturas, soporte)
 *  vuelos_*     Cóndor Air         (aerolínea: vuelos, demoras, ocupación, reservas)
 *  logistica_*  Mercurio Logística (almacenes, movimientos de stock, envíos)
 *  telco_*      Conecta            (telecomunicaciones: líneas, consumo, reclamos, bajas)
 *  seguros_*    Escudo Seguros     (pólizas, primas, siniestros, fraude)
 *  hotel_*      Posada Andina      (hotelería: reservas por canal, ocupación, consumos, reseñas)
 *  energia_*    Luz del Valle      (distribuidora eléctrica: lecturas, facturas, cortes)
 *  delivery_*   Rápido             (delivery de comida: pedidos por etapa, restaurantes, repartidores)
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
    // ======================================================================
    // Empresas nuevas: usan su propio generador para no cambiar los datos de arriba
    nuevasEmpresas(T);
    return T;
  }

  function nuevasEmpresas(T) {
    const rnd = mulberry32(424242);
    const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const pickW = (pairs) => { const t = pairs.reduce((s, p) => s + p[1], 0); let r = rnd() * t; for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; } return pairs[pairs.length - 1][0]; };
    const mes = (y, m) => `${y}-${pad(m)}`;
    const MESES_2024 = Array.from({ length: 12 }, (_, i) => [2024, i + 1]);

    // =============================================================== TELCO CONECTA
    {
      T.telco_planes = { columns: ['plan_id', 'nombre', 'tipo', 'datos_gb', 'minutos', 'precio_mensual'], rows: [
        [1, 'Prepago Recarga', 'prepago', 0, 0, 0], [2, 'Control 5', 'pospago', 5, 300, 12], [3, 'Libre 15', 'pospago', 15, 1000, 20],
        [4, 'Libre 40', 'pospago', 40, 3000, 30], [5, 'Ilimitado', 'pospago', 999, 9999, 45]] };
      const regiones = [['Norte', 3], ['Centro', 5], ['Sur', 3], ['Costa', 2], ['Andina', 2]];
      // la región Andina tiene mala cobertura: más reclamos y más bajas
      const malaCobertura = { Andina: 2.4, Sur: 1.3 };
      const clientes = [], lineas = [], consumos = [], reclamos = [];
      let lid = 1, rid = 1;
      for (let id = 1; id <= 1200; id++) {
        const region = pickW(regiones);
        const tipo = pickW([['persona', 88], ['empresa', 12]]);
        const alta = U(2020, 1, 1) + int(0, 1600) * DAY;
        clientes.push([id, tipo, region, fd(new Date(alta)), tipo === 'persona' ? int(18, 75) : null]);
        const n = tipo === 'empresa' ? int(2, 6) : pickW([[1, 80], [2, 15], [3, 5]]);
        for (let k = 0; k < n; k++) {
          let plan = tipo === 'empresa' ? pickW([[3, 40], [4, 40], [5, 20]]) : pickW([[1, 38], [2, 22], [3, 22], [4, 12], [5, 6]]);
          const altaL = Math.max(alta + int(0, 300) * DAY, U(2021, 1, 1));
          const riesgo = (malaCobertura[region] || 1) * (plan === 1 ? 1.4 : 1) * (tipo === 'empresa' ? 0.5 : 1);
          let baja = null, motivo = null;
          const numero = `9${int(10000000, 99999999)}`;
          const lineaId = lid++;
          let reclamosLinea = 0;
          for (const [y, m] of MESES_2024) {
            const ini = U(y, m, 1);
            if (ini < altaL) continue;
            if (baja) break;
            const p = T.telco_planes.rows[plan - 1];
            const datos = plan === 1 ? r2(Math.pow(rnd(), 1.5) * 4) : r2(Math.min(p[3] === 999 ? 120 : p[3] * 1.4, Math.pow(rnd(), 0.8) * (p[3] === 999 ? 60 : p[3] * 1.2)));
            const minutos = plan === 1 ? int(10, 200) : int(30, Math.min(p[4], 1500));
            const monto = plan === 1 ? r2(int(1, 6) * 3.5) : r2(p[5] + (datos > p[3] ? (datos - p[3]) * 1.5 : 0));
            consumos.push([lineaId, mes(y, m), datos, minutos, int(0, 40), monto]);
            const pRec = 0.05 * riesgo;
            if (rnd() < pRec) {
              const cat = pickW([['cobertura', malaCobertura[region] ? 50 : 15], ['facturacion', 25], ['velocidad', 20], ['atencion', 15]]);
              const f = ini + int(0, 27) * DAY + int(8, 21) * HOUR;
              const horas = cat === 'facturacion' ? int(2, 96) : int(4, 240);
              const resuelto = rnd() < (cat === 'cobertura' ? 0.55 : 0.85) ? 1 : 0;
              reclamos.push([rid++, lineaId, ft(new Date(f)), cat, resuelto ? horas : null, resuelto]);
              reclamosLinea++;
            }
            const pBaja = 0.006 * riesgo + reclamosLinea * 0.02;
            if (rnd() < pBaja) {
              baja = ini + int(5, 27) * DAY;
              motivo = pickW([['portabilidad', 45 * (malaCobertura[region] || 1)], ['precio', 30], ['cobertura', 20 * (malaCobertura[region] || 0.5)], ['mudanza', 8]]);
            }
            if (!baja && rnd() < 0.015 && plan > 1 && plan < 5) plan++;
          }
          lineas.push([lineaId, id, plan, numero, fd(new Date(altaL)), baja ? fd(new Date(baja)) : null, motivo]);
        }
      }
      T.telco_clientes = { columns: ['cliente_id', 'tipo', 'region', 'fecha_alta', 'edad'], rows: clientes };
      T.telco_lineas = { columns: ['linea_id', 'cliente_id', 'plan_id', 'numero', 'fecha_alta', 'fecha_baja', 'motivo_baja'], rows: lineas };
      T.telco_consumos = { columns: ['linea_id', 'mes', 'datos_gb', 'minutos', 'sms', 'monto_facturado'], rows: consumos };
      T.telco_reclamos = { columns: ['reclamo_id', 'linea_id', 'fecha_hora', 'categoria', 'horas_resolucion', 'resuelto'], rows: reclamos };
    }

    // =============================================================== SEGUROS ESCUDO
    {
      const clientes = [], polizas = [], siniestros = [];
      let pid = 1, sid = 1;
      const ciudades = ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Santiago', 'Lima', 'Bogotá', 'Ciudad de México'];
      for (let id = 1; id <= 1500; id++) {
        const edad = int(19, 78);
        clientes.push([id, edad, pick(ciudades), fd(new Date(U(2019, 1, 1) + int(0, 1800) * DAY))]);
        const n = pickW([[1, 65], [2, 25], [3, 10]]);
        const ramos = new Set();
        for (let k = 0; k < n; k++) {
          const ramo = pickW([['auto', 45], ['hogar', 30], ['vida', 15], ['salud', 10]]);
          if (ramos.has(ramo)) continue;
          ramos.add(ramo);
          const canal = pickW([['broker', 45], ['web', 30], ['banco', 25]]);
          const ini = U(2022, 1, 1) + int(0, 900) * DAY;
          const fin = ini + 365 * DAY;
          const suma = ramo === 'auto' ? int(8, 40) * 1000 : ramo === 'hogar' ? int(30, 200) * 1000 : ramo === 'vida' ? int(20, 150) * 1000 : int(5, 30) * 1000;
          const tasa = ramo === 'auto' ? 0.0045 * (edad < 25 ? 1.8 : edad > 65 ? 1.3 : 1) : ramo === 'hogar' ? 0.0009 : ramo === 'vida' ? 0.0004 * (1 + edad / 40) : 0.006;
          const prima = r2(suma * tasa * (canal === 'broker' ? 1.08 : 1));
          const estado = fin < U(2024, 12, 31) ? (rnd() < 0.7 ? 'renovada' : 'vencida') : 'vigente';
          const polId = pid++;
          polizas.push([polId, id, ramo, fd(new Date(ini)), fd(new Date(fin)), prima, suma, canal, estado]);
          // siniestros: frecuencia por ramo; jóvenes en auto chocan más
          const freq = ramo === 'auto' ? 0.32 * (edad < 25 ? 2 : 1) : ramo === 'hogar' ? 0.12 : ramo === 'salud' ? 0.9 : 0.01;
          let nS = 0; while (rnd() < freq / (nS + 1) && nS < 4) nS++;
          for (let j = 0; j < nS; j++) {
            const ocurr = ini + int(1, 364) * DAY;
            const denuncia = ocurr + int(0, rnd() < 0.85 ? 5 : 60) * DAY;
            const tipo = ramo === 'auto' ? pickW([['choque', 60], ['robo', 15], ['granizo', 10], ['cristales', 15]]) : ramo === 'hogar' ? pickW([['agua', 40], ['robo', 30], ['incendio', 5], ['electrico', 25]]) : ramo === 'salud' ? pickW([['consulta', 50], ['internacion', 15], ['estudios', 35]]) : 'fallecimiento';
            const reclamado = r2(Math.min(suma, (tipo === 'robo' && ramo === 'auto' ? suma * (0.7 + rnd() * 0.3) : tipo === 'incendio' || tipo === 'fallecimiento' ? suma * (0.4 + rnd() * 0.6) : Math.pow(rnd(), 2) * suma * (ramo === 'hogar' ? 0.07 : 0.15) + 50)));
            const estadoS = pickW([['pagado', 78], ['rechazado', 14], ['en_revision', 8]]);
            const pagado = estadoS === 'pagado' ? r2(reclamado * (0.75 + rnd() * 0.25)) : 0;
            siniestros.push([sid++, polId, fd(new Date(ocurr)), fd(new Date(denuncia)), tipo, reclamado, pagado, estadoS, 0]);
          }
        }
      }
      // fraude: siniestros grandes pocos días después de contratar, denunciados tarde
      for (let f = 0; f < 35; f++) {
        const p = pick(polizas.filter((x) => x[2] === 'auto' || x[2] === 'hogar'));
        const ini = Date.parse(p[3] + 'T00:00:00Z');
        const ocurr = ini + int(2, 25) * DAY;
        const reclamado = r2(p[6] * (0.5 + rnd() * 0.5));
        const estadoS = pickW([['rechazado', 45], ['pagado', 30], ['en_revision', 25]]);
        siniestros.push([sid++, p[0], fd(new Date(ocurr)), fd(new Date(ocurr + int(8, 40) * DAY)), p[2] === 'auto' ? 'robo' : 'robo', reclamado, estadoS === 'pagado' ? reclamado : 0, estadoS, 1]);
      }
      siniestros.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[0] - b[0]));
      T.seguros_clientes = { columns: ['cliente_id', 'edad', 'ciudad', 'fecha_alta'], rows: clientes };
      T.seguros_polizas = { columns: ['poliza_id', 'cliente_id', 'ramo', 'fecha_inicio', 'fecha_fin', 'prima_mensual', 'suma_asegurada', 'canal', 'estado'], rows: polizas };
      T.seguros_siniestros = { columns: ['siniestro_id', 'poliza_id', 'fecha_ocurrencia', 'fecha_denuncia', 'tipo', 'monto_reclamado', 'monto_pagado', 'estado', 'fraude_confirmado'], rows: siniestros.map((s, i) => [i + 1, ...s.slice(1)]) };
    }

    // =============================================================== HOTELES POSADA ANDINA
    {
      const hoteles = [[1, 'Posada Andina Cusco', 'Cusco', 4, 24], [2, 'Posada Andina Lima', 'Lima', 4, 36], [3, 'Posada Andina Mendoza', 'Mendoza', 3, 18],
        [4, 'Posada Andina Bariloche', 'Bariloche', 5, 28], [5, 'Posada Andina Cartagena', 'Cartagena', 4, 30], [6, 'Posada Andina Salta', 'Salta', 3, 16]];
      T.hotel_hoteles = { columns: ['hotel_id', 'nombre', 'ciudad', 'estrellas', 'habitaciones'], rows: hoteles };
      const tarifas = { estandar: 70, superior: 105, suite: 190 };
      const temporadaAlta = { Cusco: [6, 7, 8], Lima: [1, 2, 12], Mendoza: [2, 3, 4], Bariloche: [7, 8, 1], Cartagena: [12, 1, 6, 7], Salta: [7, 9, 10] };
      const huespedes = [];
      for (let id = 1; id <= 4000; id++) huespedes.push([id, pickW([['Argentina', 25], ['Perú', 15], ['Chile', 10], ['Colombia', 12], ['Estados Unidos', 12], ['Brasil', 10], ['España', 8], ['Alemania', 4], ['Francia', 4]]), rnd() < 0.3 ? 1 : 0]);
      T.hotel_huespedes = { columns: ['huesped_id', 'pais', 'programa_fidelidad'], rows: huespedes };
      const reservas = [], consumos = [], resenas = [];
      let rid = 1, cid = 1, eid = 1;
      for (const h of hoteles) {
        // habitaciones ocupadas por noche: una reserva confirmada no puede superar la capacidad (no hay sobreventa)
        const ocupadas = new Array(380).fill(0);
        for (let d = U(2024, 1, 1); d <= U(2024, 12, 31); d += DAY) {
          const m = new Date(d).getUTCMonth() + 1;
          const alta = (temporadaAlta[h[2]] || []).includes(m);
          const finde = [5, 6].includes(new Date(d).getUTCDay());
          const llegadas = Math.round(h[4] * (alta ? 0.3 : 0.17) * (finde ? 1.25 : 1) * (0.7 + rnd() * 0.6));
          for (let k = 0; k < llegadas; k++) {
            const noches = pickW([[1, 20], [2, 30], [3, 25], [4, 12], [5, 8], [7, 5]]);
            const ant = Math.round(Math.pow(rnd(), 1.3) * 150);
            const canal = pickW([['directo', 30], ['booking', 35], ['expedia', 20], ['agencia', 15]]);
            const tipoHab = pickW([['estandar', 60], ['superior', 30], ['suite', 10]]);
            const tarifa = r2(tarifas[tipoHab] * (1 + (h[3] - 4) * 0.25) * (alta ? 1.45 : 1) * (finde ? 1.1 : 1) * (canal === 'directo' ? 0.95 : 1) * (0.9 + rnd() * 0.2));
            const pCancel = (canal === 'booking' ? 0.22 : canal === 'expedia' ? 0.18 : 0.1) + (ant > 60 ? 0.08 : 0);
            let estado = rnd() < pCancel ? 'cancelada' : rnd() < 0.03 ? 'no_show' : 'completada';
            const dia0 = Math.round((d - U(2024, 1, 1)) / DAY);
            if (estado !== 'cancelada') {
              let hay = true;
              for (let n = 0; n < noches; n++) if (ocupadas[dia0 + n] >= h[4]) hay = false;
              if (!hay) continue;                       // sin lugar: el hotel la rechazó, no queda registrada
              for (let n = 0; n < noches; n++) ocupadas[dia0 + n]++;
            }
            const comision = canal === 'booking' ? 18 : canal === 'expedia' ? 20 : canal === 'agencia' ? 12 : 0;
            const hu = pick(huespedes);
            reservas.push([rid, h[0], hu[0], fd(new Date(d - ant * DAY)), fd(new Date(d)), fd(new Date(d + noches * DAY)), tipoHab, canal, tarifa, comision, estado]);
            if (estado === 'completada') {
              const nC = int(0, noches + 1);
              for (let c = 0; c < nC; c++) {
                const concepto = pickW([['restaurante', 45], ['bar', 25], ['spa', 10], ['minibar', 12], ['lavanderia', 8]]);
                const monto = r2(concepto === 'spa' ? int(40, 120) : concepto === 'restaurante' ? int(15, 80) : int(5, 35));
                consumos.push([cid++, rid, fd(new Date(d + int(0, noches - 1) * DAY)), concepto, monto]);
              }
              if (rnd() < 0.35) {
                const base = 8.6 - (canal === 'booking' ? 0.3 : 0) - (alta ? 0.4 : 0) + (tipoHab === 'suite' ? 0.6 : 0);
                resenas.push([eid++, rid, fd(new Date(d + (noches + int(0, 10)) * DAY)), Math.max(1, Math.min(10, Math.round(base + (rnd() - 0.5) * 4)))]);
              }
            }
            rid++;
          }
        }
      }
      T.hotel_reservas = { columns: ['reserva_id', 'hotel_id', 'huesped_id', 'fecha_reserva', 'check_in', 'check_out', 'tipo_habitacion', 'canal', 'tarifa_noche', 'comision_pct', 'estado'], rows: reservas };
      T.hotel_consumos = { columns: ['consumo_id', 'reserva_id', 'fecha', 'concepto', 'monto'], rows: consumos };
      T.hotel_resenas = { columns: ['resena_id', 'reserva_id', 'fecha', 'puntaje'], rows: resenas };
    }

    // =============================================================== ENERGÍA LUZ DEL VALLE
    {
      const zonas = [['Centro', 4], ['Norte', 3], ['Sur', 3], ['Industrial', 1], ['Rural', 2]];
      const clientes = [], medidores = [], lecturas = [], facturas = [], cortes = [];
      const precioKwh = { residencial: 0.11, comercial: 0.14, industrial: 0.09 };
      let mid = 1, lid = 1, fid = 1;
      for (let id = 1; id <= 1000; id++) {
        const zona = pickW(zonas);
        const tipo = zona === 'Industrial' ? pickW([['industrial', 60], ['comercial', 40]]) : pickW([['residencial', 85], ['comercial', 15]]);
        clientes.push([id, tipo, zona, fd(new Date(U(2015, 1, 1) + int(0, 3000) * DAY))]);
        const inteligente = rnd() < (zona === 'Rural' ? 0.2 : 0.6);
        const medId = mid++;
        medidores.push([medId, id, inteligente ? 'inteligente' : 'analogico', fd(new Date(U(2018, 1, 1) + int(0, 2000) * DAY))]);
        const base = tipo === 'industrial' ? int(8000, 30000) : tipo === 'comercial' ? int(600, 3000) : int(120, 450);
        const roba = tipo !== 'industrial' && rnd() < 0.025; // hurto: desde un mes, el consumo medido cae mucho
        const mesRobo = int(4, 10);
        const moroso = rnd() < 0.08;
        for (const [y, m] of MESES_2024) {
          const estacion = [12, 1, 2].includes(m) ? 1.25 : [6, 7, 8].includes(m) ? 1.15 : 1;
          let kwh = Math.round(base * estacion * (0.85 + rnd() * 0.3));
          if (roba && m >= mesRobo) kwh = Math.round(kwh * (0.15 + rnd() * 0.15));
          const estimada = !inteligente && rnd() < 0.12 ? 1 : 0;
          lecturas.push([lid++, medId, mes(y, m), kwh, estimada]);
          const monto = r2(kwh * precioKwh[tipo] + (tipo === 'residencial' ? 4 : 15));
          const venc = U(y, m, 1) + 45 * DAY;
          const pago = moroso && rnd() < 0.5 ? (rnd() < 0.4 ? null : venc + int(5, 60) * DAY) : venc - int(0, 15) * DAY + (rnd() < 0.1 ? int(1, 20) * DAY : 0);
          facturas.push([fid++, id, mes(y, m), kwh, monto, fd(new Date(venc)), pago && pago <= U(2025, 1, 31) ? fd(new Date(pago)) : null]);
        }
      }
      let corteId = 1;
      for (let d = U(2024, 1, 1); d <= U(2024, 12, 31); d += DAY) {
        const m = new Date(d).getUTCMonth() + 1;
        for (const [zona] of zonas) {
          const p = (zona === 'Rural' ? 0.05 : 0.018) * ([12, 1, 2].includes(m) ? 2 : 1);
          if (rnd() < p) {
            const ini = d + int(0, 23) * HOUR + int(0, 59) * MIN;
            const causa = pickW([['tormenta', [12, 1, 2].includes(m) ? 40 : 10], ['falla_equipo', 35], ['mantenimiento', 20], ['sobrecarga', 15]]);
            const dur = causa === 'mantenimiento' ? int(60, 240) : causa === 'tormenta' ? int(45, 900) : int(10, 300);
            const afectados = clientes.filter((c) => c[2] === zona).length;
            cortes.push([corteId++, zona, ft(new Date(ini)), ft(new Date(ini + dur * MIN)), causa, Math.round(afectados * (0.1 + rnd() * 0.9))]);
          }
        }
      }
      T.energia_clientes = { columns: ['cliente_id', 'tipo', 'zona', 'fecha_alta'], rows: clientes };
      T.energia_medidores = { columns: ['medidor_id', 'cliente_id', 'tipo', 'fecha_instalacion'], rows: medidores };
      T.energia_lecturas = { columns: ['lectura_id', 'medidor_id', 'mes', 'kwh', 'estimada'], rows: lecturas };
      T.energia_facturas = { columns: ['factura_id', 'cliente_id', 'mes', 'kwh', 'monto', 'fecha_vencimiento', 'fecha_pago'], rows: facturas };
      T.energia_cortes = { columns: ['corte_id', 'zona', 'inicio', 'fin', 'causa', 'clientes_afectados'], rows: cortes };
    }

    // =============================================================== DELIVERY RÁPIDO
    {
      const ciudades = [['Bogotá', 4], ['Medellín', 2], ['Lima', 3], ['Ciudad de México', 5], ['Buenos Aires', 3]];
      const categorias = [['Hamburguesas', 4], ['Pizza', 4], ['Sushi', 2], ['Pollo', 3], ['Saludable', 2], ['Postres', 1], ['Comida casera', 3], ['Mexicana', 2]];
      const restaurantes = [], repartidores = [], clientes = [], pedidos = [];
      for (let id = 1; id <= 220; id++) {
        const cat = pickW(categorias);
        restaurantes.push([id, `${pick(['La Esquina', 'El Fogón', 'El Sabor', 'El Rincón', 'La Parrilla', 'La Cocina', 'El Puerto', 'La Casona'])} de ${pick(APELLIDOS)}`, pickW(ciudades), cat, pickW([[15, 20], [20, 50], [25, 30]]), r2(3.6 + rnd() * 1.3)]);
      }
      for (let id = 1; id <= 400; id++) repartidores.push([id, pickW(ciudades), pickW([['moto', 60], ['bicicleta', 30], ['auto', 10]]), fd(new Date(U(2022, 1, 1) + int(0, 900) * DAY))]);
      for (let id = 1; id <= 5000; id++) clientes.push([id, pickW(ciudades), fd(new Date(U(2023, 1, 1) + int(0, 640) * DAY)), pickW([['android', 60], ['ios', 35], ['web', 5]])]);
      T.delivery_restaurantes = { columns: ['restaurante_id', 'nombre', 'ciudad', 'categoria', 'comision_pct', 'rating'], rows: restaurantes };
      T.delivery_repartidores = { columns: ['repartidor_id', 'ciudad', 'vehiculo', 'fecha_alta'], rows: repartidores };
      T.delivery_clientes = { columns: ['cliente_id', 'ciudad', 'fecha_registro', 'plataforma'], rows: clientes };
      const restPorCiudad = {}, repPorCiudad = {};
      restaurantes.forEach((r) => (restPorCiudad[r[2]] = restPorCiudad[r[2]] || []).push(r));
      repartidores.forEach((r) => (repPorCiudad[r[1]] = repPorCiudad[r[1]] || []).push(r));
      const lealtad = clientes.map(() => Math.pow(rnd(), 2.2) * 10 + 0.3);
      const totL = lealtad.reduce((a, b) => a + b, 0);
      const pickCli = () => { let r = rnd() * totL; for (let i = 0; i < clientes.length; i++) { r -= lealtad[i]; if (r <= 0) return clientes[i]; } return clientes[0]; };
      const raw = [];
      for (let i = 0; i < 16000; i++) {
        const c = pickCli();
        const reg = Date.parse(c[2] + 'T00:00:00Z');
        const desde = Math.max(reg, U(2024, 1, 1));
        if (desde > U(2024, 12, 31)) continue;
        let hora;
        for (;;) { hora = int(9, 23); const w = (hora >= 12 && hora <= 14) || (hora >= 19 && hora <= 22) ? 3 : 0.8; if (rnd() < w / 3) break; }
        const t = desde + Math.floor(rnd() * ((U(2024, 12, 31) - desde) / DAY + 1)) * DAY + hora * HOUR + int(0, 59) * MIN + int(0, 59) * 1000;
        const pico = (hora >= 12 && hora <= 14) || (hora >= 19 && hora <= 22);
        const lluvia = rnd() < 0.1;
        const rest = pick(restPorCiudad[c[1]]);
        const subtotal = r2(int(6, 45) + rnd());
        const cupon = rnd() < 0.18 ? r2(Math.min(subtotal * 0.3, int(2, 8))) : 0;
        const envio = r2((lluvia ? 2.9 : 1.9) + (pico ? 0.6 : 0));
        let estado = pickW([['entregado', 90], ['cancelado_cliente', 4], ['cancelado_restaurante', 3], ['sin_repartidor', (pico ? 3 : 1) * (lluvia ? 3 : 1)]]);
        const rep = estado === 'entregado' || estado === 'cancelado_cliente' ? pick(repPorCiudad[c[1]]) : null;
        const aceptado = estado === 'cancelado_restaurante' || estado === 'sin_repartidor' ? null : t + int(1, 6) * MIN;
        const prep = int(8, rest[3] === 'Pizza' || rest[3] === 'Comida casera' ? 30 : 22) + (pico ? int(0, 10) : 0);
        const retirado = estado === 'entregado' ? aceptado + prep * MIN : null;
        const viaje = rep ? int(8, 25) * (rep[2] === 'bicicleta' ? 1.3 : 1) * (lluvia ? 1.4 : 1) : 0;
        const entregado = estado === 'entregado' ? retirado + Math.round(viaje) * MIN : null;
        const total = entregado ? (entregado - t) / MIN : null;
        const calif = entregado && rnd() < 0.55 ? Math.max(1, Math.min(5, Math.round(5.2 - Math.max(0, total - 35) / 12 + (rnd() - 0.5) * 1.5))) : null;
        const propina = entregado && rnd() < 0.4 ? r2(int(1, 4) * 0.5) : 0;
        raw.push([t, c[0], rest[0], rep ? rep[0] : null, c[1], aceptado, retirado, entregado, subtotal, envio, cupon, propina, estado, calif]);
      }
      raw.sort((a, b) => a[0] - b[0]);
      const tf = (x) => (x ? ft(new Date(x)) : null);
      T.delivery_pedidos = { columns: ['pedido_id', 'cliente_id', 'restaurante_id', 'repartidor_id', 'ciudad', 'creado', 'aceptado', 'retirado', 'entregado', 'subtotal', 'costo_envio', 'descuento_cupon', 'propina', 'estado', 'calificacion'],
        rows: raw.map((r, i) => [i + 1, r[1], r[2], r[3], r[4], tf(r[0]), tf(r[5]), tf(r[6]), tf(r[7]), r[8], r[9], r[10], r[11], r[12], r[13]]) };
    }
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
CREATE TABLE telco_planes (plan_id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, datos_gb INTEGER, minutos INTEGER, precio_mensual REAL);
CREATE TABLE telco_clientes (cliente_id INTEGER PRIMARY KEY, tipo TEXT, region TEXT, fecha_alta TEXT, edad INTEGER);
CREATE TABLE telco_lineas (linea_id INTEGER PRIMARY KEY, cliente_id INTEGER, plan_id INTEGER, numero TEXT, fecha_alta TEXT, fecha_baja TEXT, motivo_baja TEXT);
CREATE TABLE telco_consumos (linea_id INTEGER, mes TEXT, datos_gb REAL, minutos INTEGER, sms INTEGER, monto_facturado REAL, PRIMARY KEY (linea_id, mes));
CREATE TABLE telco_reclamos (reclamo_id INTEGER PRIMARY KEY, linea_id INTEGER, fecha_hora TEXT, categoria TEXT, horas_resolucion INTEGER, resuelto INTEGER);
CREATE TABLE seguros_clientes (cliente_id INTEGER PRIMARY KEY, edad INTEGER, ciudad TEXT, fecha_alta TEXT);
CREATE TABLE seguros_polizas (poliza_id INTEGER PRIMARY KEY, cliente_id INTEGER, ramo TEXT, fecha_inicio TEXT, fecha_fin TEXT, prima_mensual REAL, suma_asegurada REAL, canal TEXT, estado TEXT);
CREATE TABLE seguros_siniestros (siniestro_id INTEGER PRIMARY KEY, poliza_id INTEGER, fecha_ocurrencia TEXT, fecha_denuncia TEXT, tipo TEXT, monto_reclamado REAL, monto_pagado REAL, estado TEXT, fraude_confirmado INTEGER);
CREATE TABLE hotel_hoteles (hotel_id INTEGER PRIMARY KEY, nombre TEXT, ciudad TEXT, estrellas INTEGER, habitaciones INTEGER);
CREATE TABLE hotel_huespedes (huesped_id INTEGER PRIMARY KEY, pais TEXT, programa_fidelidad INTEGER);
CREATE TABLE hotel_reservas (reserva_id INTEGER PRIMARY KEY, hotel_id INTEGER, huesped_id INTEGER, fecha_reserva TEXT, check_in TEXT, check_out TEXT, tipo_habitacion TEXT, canal TEXT, tarifa_noche REAL, comision_pct REAL, estado TEXT);
CREATE TABLE hotel_consumos (consumo_id INTEGER PRIMARY KEY, reserva_id INTEGER, fecha TEXT, concepto TEXT, monto REAL);
CREATE TABLE hotel_resenas (resena_id INTEGER PRIMARY KEY, reserva_id INTEGER, fecha TEXT, puntaje INTEGER);
CREATE TABLE energia_clientes (cliente_id INTEGER PRIMARY KEY, tipo TEXT, zona TEXT, fecha_alta TEXT);
CREATE TABLE energia_medidores (medidor_id INTEGER PRIMARY KEY, cliente_id INTEGER, tipo TEXT, fecha_instalacion TEXT);
CREATE TABLE energia_lecturas (lectura_id INTEGER PRIMARY KEY, medidor_id INTEGER, mes TEXT, kwh INTEGER, estimada INTEGER);
CREATE TABLE energia_facturas (factura_id INTEGER PRIMARY KEY, cliente_id INTEGER, mes TEXT, kwh INTEGER, monto REAL, fecha_vencimiento TEXT, fecha_pago TEXT);
CREATE TABLE energia_cortes (corte_id INTEGER PRIMARY KEY, zona TEXT, inicio TEXT, fin TEXT, causa TEXT, clientes_afectados INTEGER);
CREATE TABLE delivery_restaurantes (restaurante_id INTEGER PRIMARY KEY, nombre TEXT, ciudad TEXT, categoria TEXT, comision_pct REAL, rating REAL);
CREATE TABLE delivery_repartidores (repartidor_id INTEGER PRIMARY KEY, ciudad TEXT, vehiculo TEXT, fecha_alta TEXT);
CREATE TABLE delivery_clientes (cliente_id INTEGER PRIMARY KEY, ciudad TEXT, fecha_registro TEXT, plataforma TEXT);
CREATE TABLE delivery_pedidos (pedido_id INTEGER PRIMARY KEY, cliente_id INTEGER, restaurante_id INTEGER, repartidor_id INTEGER, ciudad TEXT, creado TEXT, aceptado TEXT, retirado TEXT, entregado TEXT, subtotal REAL, costo_envio REAL, descuento_cupon REAL, propina REAL, estado TEXT, calificacion INTEGER);
CREATE INDEX idx_tcons_linea ON telco_consumos(linea_id);
CREATE INDEX idx_hres_hotel ON hotel_reservas(hotel_id);
CREATE INDEX idx_elec_medidor ON energia_lecturas(medidor_id);
CREATE INDEX idx_dped_rest ON delivery_pedidos(restaurante_id);
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
    { id: 'telco', nombre: 'Conecta', icono: '📱', prefijo: 'telco_', rubro: 'Telecomunicaciones', resumen: 'Líneas, planes, consumo mensual, reclamos y bajas (churn, portabilidad).' },
    { id: 'seguros', nombre: 'Escudo Seguros', icono: '🛡️', prefijo: 'seguros_', rubro: 'Seguros', resumen: 'Pólizas, primas, siniestros, siniestralidad y fraude.' },
    { id: 'hotel', nombre: 'Posada Andina', icono: '🏨', prefijo: 'hotel_', rubro: 'Hotelería', resumen: 'Hoteles, reservas por canal, ocupación, ADR, RevPAR, consumos y reseñas.' },
    { id: 'energia', nombre: 'Luz del Valle', icono: '⚡', prefijo: 'energia_', rubro: 'Energía (distribuidora eléctrica)', resumen: 'Medidores, lecturas mensuales, facturación, cobranza, hurto y cortes.' },
    { id: 'delivery', nombre: 'Rápido', icono: '🛵', prefijo: 'delivery_', rubro: 'Delivery de comida', resumen: 'Pedidos con tiempos por etapa, restaurantes, repartidores, cupones y calificaciones.' },
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
    telco_planes: 'Planes de Conecta: prepago y pospago con GB, minutos y precio.',
    telco_clientes: 'Clientes (personas y empresas) por región.',
    telco_lineas: 'Líneas móviles: plan actual, alta y baja (fecha_baja NULL = activa) con motivo.',
    telco_consumos: 'Consumo mensual 2024 por línea: GB, minutos, SMS y monto facturado.',
    telco_reclamos: 'Reclamos por línea: categoría, horas hasta resolver y si se resolvió.',
    seguros_clientes: 'Asegurados de Escudo Seguros.',
    seguros_polizas: 'Pólizas por ramo (auto, hogar, vida, salud) con prima mensual, suma asegurada y canal de venta.',
    seguros_siniestros: 'Siniestros denunciados: montos reclamado y pagado, estado y fraude confirmado.',
    hotel_hoteles: 'Hoteles de la cadena Posada Andina con su cantidad de habitaciones.',
    hotel_huespedes: 'Huéspedes: país y si están en el programa de fidelidad.',
    hotel_reservas: 'Reservas 2024 (muestra): fechas, canal, tarifa por noche, comisión del canal y estado.',
    hotel_consumos: 'Consumos extra durante la estadía (restaurante, bar, spa…).',
    hotel_resenas: 'Reseñas de huéspedes con puntaje de 1 a 10.',
    energia_clientes: 'Clientes de la distribuidora por tipo y zona.',
    energia_medidores: 'Medidor de cada cliente (inteligente o analógico).',
    energia_lecturas: 'Lectura mensual 2024 por medidor en kWh; estimada = 1 si no se leyó.',
    energia_facturas: 'Facturas mensuales con vencimiento y fecha de pago (NULL = impaga).',
    energia_cortes: 'Cortes de servicio por zona: inicio, fin, causa y clientes afectados.',
    delivery_restaurantes: 'Restaurantes de Rápido con categoría, comisión y rating.',
    delivery_repartidores: 'Repartidores por ciudad y vehículo.',
    delivery_clientes: 'Clientes de la app.',
    delivery_pedidos: 'Pedidos 2024 con la hora de cada etapa (creado, aceptado, retirado, entregado), importes y estado.',
  };

  const api = { build, SCHEMA, TABLE_INFO, CASOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DataCasos = api;
})(typeof window !== 'undefined' ? window : globalThis);
