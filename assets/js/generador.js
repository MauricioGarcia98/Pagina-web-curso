/* Generador de datasets para proyectos de datos (#/generador).
 * Ocho escenarios realistas (e-commerce, banco, sensores IoT, logística, SaaS, salud, streaming y
 * soporte con texto libre para IA generativa), con relaciones entre tablas, estacionalidad, clientes
 * que compran más que otros (Pareto) y datos de Latinoamérica y España.
 * Se le pueden "sembrar" problemas reales de calidad (duplicados, nulos, formatos inconsistentes,
 * valores fuera de rango, claves huérfanas, datos tardíos, mojibake) y queda registrado cuántos y dónde.
 * Salidas: CSV, JSON Lines o SQL (PostgreSQL/DuckDB, MySQL, SQL Server, SQLite), todo en un .zip con un
 * README (diccionario de datos, problemas sembrados, comandos de carga e ideas de preguntas).
 * Es determinista: la misma configuración y la misma semilla dan exactamente los mismos datos. */
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ---------------------------------------------------------------- azar con semilla
  function crearAzar(semilla) {
    let a = semilla >>> 0;
    const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const R = {
      r, int: (x, y) => x + Math.floor(r() * (y - x + 1)), pick: (arr) => arr[Math.floor(r() * arr.length)], chance: (p) => r() < p,
      pickW(arr, w) { const tot = w.reduce((s, x) => s + x, 0); let u = r() * tot; for (let i = 0; i < arr.length; i++) { u -= w[i]; if (u <= 0) return arr[i]; } return arr[arr.length - 1]; },
      normal(mu, sd) { const u = Math.max(1e-9, r()), v = r(); return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
      // índice con sesgo de Pareto: pocos elementos concentran muchas apariciones
      pareto(n, alfa = 1.16) { return Math.min(n - 1, Math.floor(n * Math.pow(r(), alfa * 2.2))); },
      dec: (x, y, d = 2) => Number((x + r() * (y - x)).toFixed(d)),
    };
    return R;
  }

  // ---------------------------------------------------------------- catálogos
  const NOMBRES = ['Lucía', 'Martina', 'Sofía', 'Valentina', 'Camila', 'Isabella', 'Paula', 'Daniela', 'Gabriela', 'Mariana', 'Ana', 'Carla', 'Julieta', 'Florencia', 'Renata', 'Victoria', 'Antonella', 'Elena', 'Laura', 'Natalia', 'Mateo', 'Santiago', 'Sebastián', 'Matías', 'Nicolás', 'Diego', 'Juan', 'Tomás', 'Benjamín', 'Lucas', 'Martín', 'Pablo', 'Andrés', 'Felipe', 'Joaquín', 'Gabriel', 'David', 'Alejandro', 'Javier', 'Emiliano'];
  const APELLIDOS = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz', 'Torres', 'Ramírez', 'Flores', 'Rojas', 'Vargas', 'Castro', 'Morales', 'Ortiz', 'Silva', 'Romero', 'Herrera', 'Medina', 'Aguilar', 'Vega', 'Muñoz', 'Navarro', 'Ríos', 'Mendoza', 'Suárez', 'Cabrera', 'Guerrero', 'Molina', 'Peña', 'Acosta', 'Sosa', 'Benítez', 'Ruiz', 'Cruz', 'Reyes', 'Paredes'];
  const PAISES = {
    Argentina: { cod: 'AR', tel: '+54', mon: 'ARS', ciudades: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata'], peso: 14 },
    Chile: { cod: 'CL', tel: '+56', mon: 'CLP', ciudades: ['Santiago', 'Valparaíso', 'Concepción', 'Antofagasta'], peso: 9 },
    Colombia: { cod: 'CO', tel: '+57', mon: 'COP', ciudades: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga'], peso: 15 },
    México: { cod: 'MX', tel: '+52', mon: 'MXN', ciudades: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Mérida'], peso: 22 },
    Perú: { cod: 'PE', tel: '+51', mon: 'PEN', ciudades: ['Lima', 'Arequipa', 'Trujillo', 'Cusco'], peso: 9 },
    Uruguay: { cod: 'UY', tel: '+598', mon: 'UYU', ciudades: ['Montevideo', 'Punta del Este', 'Salto'], peso: 3 },
    Ecuador: { cod: 'EC', tel: '+593', mon: 'USD', ciudades: ['Quito', 'Guayaquil', 'Cuenca'], peso: 5 },
    España: { cod: 'ES', tel: '+34', mon: 'EUR', ciudades: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao'], peso: 13 },
    Bolivia: { cod: 'BO', tel: '+591', mon: 'BOB', ciudades: ['La Paz', 'Santa Cruz', 'Cochabamba'], peso: 3 },
  };
  const DOMINIOS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'correo.com'];
  const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // ---------------------------------------------------------------- fechas
  const DIA = 86400000;
  const ymd = (t) => new Date(t).toISOString().slice(0, 10);
  const ts = (t) => new Date(t).toISOString().slice(0, 19).replace('T', ' ');
  // peso de un día: más ventas en noviembre-diciembre, picos en Black Friday y Navidad, menos los lunes
  function pesoDia(t) {
    const d = new Date(t), m = d.getUTCMonth(), dia = d.getUTCDate(), sem = d.getUTCDay();
    let w = [0.85, 0.8, 0.9, 0.92, 1, 0.95, 1, 0.97, 0.95, 1.02, 1.25, 1.45][m];
    if (m === 10 && dia >= 24 && dia <= 30) w *= 2.1;
    if (m === 11 && dia >= 15 && dia <= 24) w *= 1.4;
    if (sem === 1) w *= 0.85; if (sem === 6) w *= 1.08;
    return w;
  }
  function fechaPonderada(R, t0, t1) {
    for (let k = 0; k < 30; k++) { const t = t0 + R.r() * (t1 - t0); if (R.r() * 2.2 < pesoDia(t)) return t; }
    return t0 + R.r() * (t1 - t0);
  }
  const horaDelDia = (R) => R.pickW([0, 3, 6, 8, 10, 12, 14, 16, 18, 20, 21, 22, 23], [1, 0.3, 0.6, 2, 4, 5, 4, 4, 5, 6, 6, 4, 2]) * 3600000 + R.int(0, 3599) * 1000;

  // ---------------------------------------------------------------- utilidades de tablas
  // col: [nombre, tipo, opciones] tipo: int | dec | text | date | ts | bool
  const T = (nombre, desc, cols, pk, extra = {}) => ({ nombre, desc, cols: cols.map(([n, t, o = {}]) => ({ n, t, ...o })), pk, filas: [], ...extra });
  const persona = (R, paises) => {
    const pais = R.pickW(paises, paises.map((p) => PAISES[p].peso));
    const nombre = R.pick(NOMBRES), apellido = R.pick(APELLIDOS);
    const email = `${sinTildes(nombre).toLowerCase()}.${sinTildes(apellido).toLowerCase()}${R.chance(0.45) ? R.int(1, 99) : ''}@${R.pick(DOMINIOS)}`;
    return { pais, nombre, apellido, email, ciudad: R.pick(PAISES[pais].ciudades), tel: `${PAISES[pais].tel} ${R.int(200, 999)} ${R.int(1000, 9999)}` };
  };

  // ---------------------------------------------------------------- escenarios
  const ESCENARIOS = {
    ecommerce: {
      titulo: 'Tienda online', icono: '🛒', desc: 'Clientes, catálogo, pedidos con su detalle, pagos y navegación web. Estacionalidad de fin de año y clientes frecuentes.',
      unidad: 'clientes', base: 2000, preguntas: ['Ventas y ticket promedio por mes, país y canal', 'Embudo vista → carrito → compra con eventos_web', 'Cohortes de clientes por mes de registro y retención', 'Top 10 productos por margen (precio − costo)', 'Conciliación de pagos contra pedidos'],
      generar(R, c) {
        const clientes = T('clientes', 'Un cliente registrado', [['cliente_id', 'int'], ['nombre', 'text', { txt: 1 }], ['apellido', 'text', { txt: 1 }], ['email', 'text', { txt: 1, nul: 1 }], ['telefono', 'text', { nul: 1 }], ['pais', 'text', { txt: 1 }], ['ciudad', 'text', { txt: 1, nul: 1 }], ['segmento', 'text'], ['fecha_registro', 'date']], 'cliente_id');
        for (let i = 1; i <= c.n; i++) { const p = persona(R, c.paises); clientes.filas.push([i, p.nombre, p.apellido, p.email, p.tel, p.pais, p.ciudad, R.pickW(['Consumo', 'Pyme', 'Corporativo'], [70, 22, 8]), ymd(c.t0 - R.int(0, 700) * DIA * (R.chance(0.6) ? 1 : 0) + R.r() * (c.t1 - c.t0) * 0.6)]); }
        const CATS = { Celulares: [150, 1400, ['Samsung', 'Apple', 'Motorola', 'Xiaomi']], Computación: [300, 2500, ['Lenovo', 'HP', 'Dell', 'Apple']], Audio: [15, 400, ['Sony', 'JBL', 'Xiaomi', 'Philips']], Hogar: [20, 900, ['Philips', 'Oster', 'Samsung', 'LG']], Ropa: [10, 150, ['Nike', 'Adidas', 'Puma', 'Zara']], Deportes: [10, 600, ['Nike', 'Adidas', 'Wilson', 'Topper']], Libros: [8, 60, ['Planeta', 'Penguin', 'Anagrama']], Juguetes: [8, 200, ['Lego', 'Mattel', 'Hasbro']] };
        const TIPOS = { Celulares: ['Teléfono', 'Smartphone'], Computación: ['Notebook', 'Monitor', 'Teclado'], Audio: ['Auriculares', 'Parlante'], Hogar: ['Licuadora', 'Cafetera', 'Aspiradora'], Ropa: ['Remera', 'Campera', 'Pantalón'], Deportes: ['Pelota', 'Zapatillas', 'Mochila'], Libros: ['Novela', 'Ensayo', 'Manual'], Juguetes: ['Set de bloques', 'Muñeca', 'Juego de mesa'] };
        const productos = T('productos', 'Un producto del catálogo', [['producto_id', 'int'], ['nombre', 'text', { txt: 1 }], ['categoria', 'text', { txt: 1 }], ['marca', 'text', { txt: 1 }], ['precio', 'dec', { num: 1 }], ['costo', 'dec', { num: 1 }], ['activo', 'bool']], 'producto_id');
        const nProd = Math.max(40, Math.min(400, Math.round(c.n / 12)));
        for (let i = 1; i <= nProd; i++) { const cat = R.pick(Object.keys(CATS)); const [lo, hi, marcas] = CATS[cat]; const precio = R.dec(lo, hi); productos.filas.push([i, `${R.pick(TIPOS[cat])} ${R.pick(marcas)} ${R.pick(['Pro', 'Lite', 'Max', 'Mini', 'Plus', 'Sport', 'X', 'Ultra'])}`, cat, R.pick(marcas), precio, Number((precio * R.dec(0.45, 0.8)).toFixed(2)), R.chance(0.92)]); }
        const pedidos = T('pedidos', 'Una compra (cabecera)', [['pedido_id', 'int'], ['cliente_id', 'int', { fk: 'clientes.cliente_id' }], ['fecha_pedido', 'ts', { evento: 1 }], ['canal', 'text', { txt: 1 }], ['estado', 'text'], ['metodo_pago', 'text', { nul: 1 }]], 'pedido_id', { hechos: 1 });
        const detalle = T('detalle_pedidos', 'Una línea de un pedido', [['detalle_id', 'int'], ['pedido_id', 'int', { fk: 'pedidos.pedido_id' }], ['producto_id', 'int', { fk: 'productos.producto_id' }], ['cantidad', 'int', { num: 1 }], ['precio_unitario', 'dec', { num: 1 }], ['descuento', 'dec']], 'detalle_id', { hechos: 1 });
        const pagos = T('pagos', 'Un intento de pago de un pedido', [['pago_id', 'int'], ['pedido_id', 'int', { fk: 'pedidos.pedido_id' }], ['fecha_pago', 'ts', { evento: 1 }], ['monto', 'dec', { num: 1 }], ['estado', 'text']], 'pago_id', { hechos: 1 });
        const eventos = T('eventos_web', 'Un evento de navegación', [['evento_id', 'int'], ['cliente_id', 'int', { fk: 'clientes.cliente_id', nul: 1 }], ['sesion_id', 'text'], ['ts', 'ts', { evento: 1 }], ['tipo_evento', 'text'], ['pagina', 'text'], ['dispositivo', 'text', { txt: 1 }]], 'evento_id', { hechos: 1 });
        const nPed = c.n * 3; let det = 0, pag = 0, ev = 0;
        const maxEv = c.n * 10;
        for (let i = 1; i <= nPed; i++) {
          const cli = R.pareto(c.n) + 1; const t = fechaPonderada(R, c.t0, c.t1) - (fechaPonderada(R, c.t0, c.t1) % DIA) + horaDelDia(R);
          const canal = R.pickW(['web', 'app', 'tienda', 'telefono'], [45, 30, 18, 7]);
          const estado = R.pickW(['entregado', 'enviado', 'pendiente', 'cancelado', 'devuelto'], [78, 6, 4, 9, 3]);
          const metodo = R.pickW(['tarjeta_credito', 'tarjeta_debito', 'transferencia', 'efectivo', 'billetera'], [40, 22, 14, 10, 14]);
          pedidos.filas.push([i, cli, ts(t), canal, estado, metodo]);
          let total = 0; const lineas = R.pickW([1, 2, 3, 4, 5], [45, 28, 15, 8, 4]);
          for (let k = 0; k < lineas; k++) { const pr = productos.filas[R.pareto(nProd, 0.9)]; const cant = R.pickW([1, 2, 3, 4], [70, 18, 8, 4]); const dto = R.pickW([0, 0.05, 0.1, 0.15, 0.2], [60, 15, 12, 8, 5]); detalle.filas.push([++det, i, pr[0], cant, pr[4], dto]); total += cant * pr[4] * (1 - dto); }
          if (estado !== 'cancelado' || R.chance(0.4)) {
            if (R.chance(0.06)) pagos.filas.push([++pag, i, ts(t + R.int(1, 30) * 60000), Number(total.toFixed(2)), 'rechazado']);
            pagos.filas.push([++pag, i, ts(t + R.int(2, 90) * 60000 + (metodo === 'transferencia' ? R.int(1, 3) * DIA : 0)), Number(total.toFixed(2)), estado === 'cancelado' ? 'reembolsado' : 'aprobado']);
          }
          if (canal === 'web' || canal === 'app') {
            const ses = `s-${i.toString(36)}-${R.int(100, 999)}`; const disp = canal === 'app' ? R.pick(['android', 'ios']) : R.pickW(['movil', 'escritorio', 'tablet'], [58, 36, 6]);
            const pasos = [['vista', 'inicio'], ['vista', 'categoria'], ['busqueda', 'busqueda'], ['vista', 'producto'], ['agregar_carrito', 'carrito'], ['checkout', 'checkout'], ['compra', 'confirmacion']];
            let tt = t - R.int(5, 40) * 60000;
            for (const [tipo, pag2] of pasos) { if (ev >= maxEv) break; if (tipo === 'busqueda' && R.chance(0.5)) continue; tt += R.int(20, 300) * 1000; eventos.filas.push([++ev, cli, ses, ts(tt), tipo, pag2, disp]); }
          }
        }
        // sesiones que no compran (abandono de carrito, solo miran): el embudo real
        while (ev < maxEv) {
          const cli = R.chance(0.3) ? null : R.int(1, c.n); const t = fechaPonderada(R, c.t0, c.t1); const ses = `s-x${ev.toString(36)}`; const disp = R.pickW(['movil', 'escritorio', 'tablet'], [62, 32, 6]);
          const hasta = R.pickW([1, 2, 3, 4, 5], [35, 25, 18, 14, 8]); const pasos = [['vista', 'inicio'], ['vista', 'categoria'], ['vista', 'producto'], ['agregar_carrito', 'carrito'], ['checkout', 'checkout']];
          let tt = t; for (let k = 0; k < hasta && ev < maxEv; k++) { tt += R.int(10, 240) * 1000; eventos.filas.push([++ev, cli, ses, ts(tt), pasos[k][0], pasos[k][1], disp]); }
        }
        eventos.filas.sort((a, b) => (a[3] < b[3] ? -1 : 1)); eventos.filas.forEach((f, i) => { f[0] = i + 1; });
        return [clientes, productos, pedidos, detalle, pagos, eventos];
      },
      rels: [['pedidos.cliente_id', 'clientes.cliente_id'], ['detalle_pedidos.pedido_id', 'pedidos.pedido_id'], ['detalle_pedidos.producto_id', 'productos.producto_id'], ['pagos.pedido_id', 'pedidos.pedido_id'], ['eventos_web.cliente_id', 'clientes.cliente_id']],
    },

    banco: {
      titulo: 'Banco digital', icono: '🏦', desc: 'Clientes, cuentas, transacciones con fraude etiquetado (montos atípicos, países distintos, madrugada) y préstamos con mora.',
      unidad: 'clientes', base: 1500, preguntas: ['Tasa de fraude por canal, hora y país', 'Reglas de detección: monto 10x el habitual, dos países en una hora', 'Saldo diario por cuenta (suma acumulada)', 'Mora: préstamos con más de 30/60/90 días', 'Clientes con caída de actividad (riesgo de abandono)'],
      generar(R, c) {
        const clientes = T('clientes', 'Un cliente del banco', [['cliente_id', 'int'], ['nombre', 'text', { txt: 1 }], ['apellido', 'text', { txt: 1 }], ['email', 'text', { txt: 1, nul: 1 }], ['pais', 'text', { txt: 1 }], ['ciudad', 'text', { txt: 1, nul: 1 }], ['ingreso_mensual', 'dec', { num: 1, nul: 1 }], ['score_crediticio', 'int', { num: 1, nul: 1 }], ['fecha_alta', 'date']], 'cliente_id');
        for (let i = 1; i <= c.n; i++) { const p = persona(R, c.paises); clientes.filas.push([i, p.nombre, p.apellido, p.email, p.pais, p.ciudad, Math.max(300, Math.round(R.normal(1800, 900))), Math.max(300, Math.min(850, Math.round(R.normal(650, 80)))), ymd(c.t0 - R.int(0, 1500) * DIA)]); }
        const cuentas = T('cuentas', 'Una cuenta de un cliente', [['cuenta_id', 'int'], ['cliente_id', 'int', { fk: 'clientes.cliente_id' }], ['tipo', 'text'], ['moneda', 'text'], ['fecha_apertura', 'date'], ['estado', 'text']], 'cuenta_id');
        let nc = 0; const cuentasDe = {};
        for (let i = 1; i <= c.n; i++) { const k = R.pickW([1, 2, 3], [60, 30, 10]); cuentasDe[i] = []; for (let j = 0; j < k; j++) { cuentas.filas.push([++nc, i, j === 0 ? 'caja_ahorro' : R.pick(['cuenta_corriente', 'tarjeta_credito', 'inversion']), R.chance(0.8) ? PAISES[clientes.filas[i - 1][4]].mon : 'USD', ymd(c.t0 - R.int(0, 1200) * DIA), R.chance(0.95) ? 'activa' : 'cerrada']); cuentasDe[i].push(nc); } }
        const tx = T('transacciones', 'Un movimiento de una cuenta', [['tx_id', 'int'], ['cuenta_id', 'int', { fk: 'cuentas.cuenta_id' }], ['ts', 'ts', { evento: 1 }], ['tipo', 'text'], ['monto', 'dec', { num: 1 }], ['comercio', 'text', { txt: 1, nul: 1 }], ['categoria', 'text', { nul: 1 }], ['canal', 'text'], ['pais_tx', 'text'], ['es_fraude', 'bool']], 'tx_id', { hechos: 1 });
        const COM = { supermercado: ['Supermercado Día', 'Carrefour', 'Jumbo', 'Éxito', 'Walmart'], restaurantes: ['Rappi', 'PedidosYa', 'Starbucks', 'McDonalds'], transporte: ['Uber', 'Cabify', 'DiDi', 'YPF'], servicios: ['Movistar', 'Claro', 'Netflix', 'Spotify'], compras: ['Mercado Libre', 'Amazon', 'Falabella', 'Zara'], viajes: ['LATAM', 'Booking', 'Airbnb'] };
        const nTx = c.n * 25; const gastoHab = {};
        for (let i = 1; i <= nTx; i++) {
          const cli = R.pareto(c.n, 0.8) + 1; const cta = R.pick(cuentasDe[cli]); const paisCli = clientes.filas[cli - 1][4];
          gastoHab[cli] = gastoHab[cli] || R.dec(15, 120);
          const fraude = R.chance(0.006);
          let t = fechaPonderada(R, c.t0, c.t1); t = t - (t % DIA) + (fraude ? R.int(0, 5) * 3600000 + R.int(0, 3599) * 1000 : horaDelDia(R));
          const tipo = fraude ? 'compra' : R.pickW(['compra', 'transferencia_enviada', 'transferencia_recibida', 'retiro', 'pago_servicio'], [62, 12, 12, 8, 6]);
          const cat = tipo === 'compra' ? R.pick(Object.keys(COM)) : tipo === 'pago_servicio' ? 'servicios' : null;
          const monto = fraude ? R.dec(gastoHab[cli] * 8, gastoHab[cli] * 40) : tipo === 'transferencia_recibida' ? R.dec(50, 2500) : Math.max(1, Number(Math.abs(R.normal(gastoHab[cli], gastoHab[cli] * 0.7)).toFixed(2)));
          const paisTx = fraude && R.chance(0.7) ? R.pick(['US', 'BR', 'NG', 'RU', 'CN']) : PAISES[paisCli].cod;
          tx.filas.push([i, cta, ts(t), tipo, tipo.startsWith('transferencia_recibida') ? monto : -monto, cat ? R.pick(COM[cat]) : null, cat, R.pickW(['app', 'web', 'pos', 'cajero'], [45, 15, 32, 8]), paisTx, fraude]);
        }
        tx.filas.sort((a, b) => (a[2] < b[2] ? -1 : 1)); tx.filas.forEach((f, i) => { f[0] = i + 1; });
        const prest = T('prestamos', 'Un préstamo otorgado', [['prestamo_id', 'int'], ['cliente_id', 'int', { fk: 'clientes.cliente_id' }], ['fecha_otorgado', 'date', { evento: 1 }], ['monto', 'dec', { num: 1 }], ['tasa_anual', 'dec'], ['plazo_meses', 'int'], ['dias_mora', 'int', { num: 1 }], ['estado', 'text']], 'prestamo_id', { hechos: 1 });
        const nP = Math.round(c.n * 0.35);
        for (let i = 1; i <= nP; i++) { const cli = R.int(1, c.n); const score = clientes.filas[cli - 1][7]; const mora = R.chance(score < 600 ? 0.3 : 0.08) ? R.pickW([R.int(1, 30), R.int(31, 60), R.int(61, 90), R.int(91, 400)], [40, 25, 15, 20]) : 0; prest.filas.push([i, cli, ymd(c.t0 + R.r() * (c.t1 - c.t0)), R.pickW([R.dec(500, 3000), R.dec(3000, 15000), R.dec(15000, 60000)], [55, 35, 10]), R.dec(0.18, 0.75, 3), R.pick([6, 12, 18, 24, 36, 48]), mora, mora > 90 ? 'incobrable' : mora > 0 ? 'en_mora' : R.chance(0.3) ? 'cancelado' : 'al_dia']); }
        return [clientes, cuentas, tx, prest];
      },
      rels: [['cuentas.cliente_id', 'clientes.cliente_id'], ['transacciones.cuenta_id', 'cuentas.cuenta_id'], ['prestamos.cliente_id', 'clientes.cliente_id']],
    },

    iot: {
      titulo: 'Sensores industriales (IoT)', icono: '🏭', desc: 'Plantas, dispositivos y lecturas horarias de temperatura, vibración y presión, con ciclo diario, deriva, anomalías antes de una falla y huecos de conectividad.',
      unidad: 'dispositivos', base: 40, preguntas: ['Detectar anomalías con media móvil y desvío (z-score)', 'Encontrar huecos de conectividad (horas faltantes)', 'Predecir fallas: qué pasa en las 24 h previas a una falla', 'Disponibilidad (uptime) por planta y modelo', 'Agregaciones por ventana de 15 min, 1 h y 1 día'],
      generar(R, c) {
        const plantas = T('plantas', 'Una planta industrial', [['planta_id', 'int'], ['nombre', 'text', { txt: 1 }], ['pais', 'text', { txt: 1 }], ['ciudad', 'text', { txt: 1 }]], 'planta_id');
        const nPl = Math.max(2, Math.min(12, Math.round(c.n / 8)));
        for (let i = 1; i <= nPl; i++) { const pais = R.pickW(c.paises, c.paises.map((p) => PAISES[p].peso)); plantas.filas.push([i, `Planta ${R.pick(['Norte', 'Sur', 'Este', 'Oeste', 'Central', 'Río', 'Valle', 'Puerto'])} ${i}`, pais, R.pick(PAISES[pais].ciudades)]); }
        const disp = T('dispositivos', 'Un sensor instalado en una máquina', [['dispositivo_id', 'text'], ['planta_id', 'int', { fk: 'plantas.planta_id' }], ['tipo_maquina', 'text', { txt: 1 }], ['modelo', 'text'], ['fecha_instalacion', 'date']], 'dispositivo_id');
        for (let i = 1; i <= c.n; i++) disp.filas.push([`SN-${String(i).padStart(4, '0')}`, R.int(1, nPl), R.pick(['compresor', 'bomba', 'motor', 'caldera', 'cinta']), R.pick(['TX-100', 'TX-200', 'VX-9', 'Omega-3']), ymd(c.t0 - R.int(30, 900) * DIA)]);
        const lect = T('lecturas', 'Una lectura horaria de un sensor', [['lectura_id', 'int'], ['dispositivo_id', 'text', { fk: 'dispositivos.dispositivo_id' }], ['ts', 'ts', { evento: 1 }], ['temperatura_c', 'dec', { num: 1, nul: 1 }], ['vibracion_mm_s', 'dec', { num: 1, nul: 1 }], ['presion_bar', 'dec', { num: 1, nul: 1 }], ['estado', 'text']], 'lectura_id', { hechos: 1 });
        const fallas = T('fallas', 'Una falla registrada por mantenimiento', [['falla_id', 'int'], ['dispositivo_id', 'text', { fk: 'dispositivos.dispositivo_id' }], ['ts_falla', 'ts', { evento: 1 }], ['tipo_falla', 'text'], ['horas_fuera_servicio', 'dec', { num: 1 }]], 'falla_id', { hechos: 1 });
        const horas = Math.min(24 * 120, Math.floor((c.t1 - c.t0) / 3600000));
        const t0 = c.t1 - horas * 3600000;
        let id = 0, nf = 0;
        for (const d of disp.filas) {
          const base = R.dec(55, 85), vbase = R.dec(1.5, 4), pbase = R.dec(4, 9);
          const fallasD = []; let f = R.int(200, 900); while (f < horas) { fallasD.push(f); f += R.int(400, 1600); }
          let corte = -1;
          for (let h = 0; h < horas; h++) {
            if (corte > 0) { corte--; continue; }
            if (R.chance(0.004)) { corte = R.int(2, 18); continue; }   // hueco de conectividad
            const t = t0 + h * 3600000, hd = new Date(t).getUTCHours();
            const prox = fallasD.find((x) => x >= h); const antes = prox !== undefined ? prox - h : 999;
            const deriva = antes < 48 ? (48 - antes) / 48 : 0;
            const temp = base + 6 * Math.sin((hd - 8) / 24 * 2 * Math.PI) + R.normal(0, 1.2) + deriva * 18;
            const vib = vbase + R.normal(0, 0.3) + deriva * 7;
            const enFalla = fallasD.includes(h);
            lect.filas.push([++id, d[0], ts(t + R.int(0, 59) * 1000), Number(temp.toFixed(2)), Number(Math.max(0, vib).toFixed(3)), Number((pbase + R.normal(0, 0.25)).toFixed(3)), enFalla ? 'falla' : deriva > 0.6 ? 'alerta' : 'ok']);
            if (enFalla) fallas.filas.push([++nf, d[0], ts(t), R.pick(['rodamiento', 'sobrecalentamiento', 'fuga', 'eléctrica']), R.dec(1, 36, 1)]);
          }
        }
        lect.filas.sort((a, b) => (a[2] < b[2] ? -1 : 1)); lect.filas.forEach((f, i) => { f[0] = i + 1; });
        return [plantas, disp, lect, fallas];
      },
      rels: [['dispositivos.planta_id', 'plantas.planta_id'], ['lecturas.dispositivo_id', 'dispositivos.dispositivo_id'], ['fallas.dispositivo_id', 'dispositivos.dispositivo_id']],
    },

    logistica: {
      titulo: 'Logística y envíos', icono: '🚚', desc: 'Almacenes, envíos con fecha prometida y real, y el seguimiento evento por evento. Transportistas con distinto desempeño.',
      unidad: 'envíos', base: 5000, preguntas: ['Entregas a tiempo (OTD) por transportista y ruta', 'Tiempo entre estados (de "en camino" a "entregado")', 'Costo por kg y por envío por país', 'Envíos "perdidos": sin eventos hace más de 5 días', 'Estacionalidad de la demanda por almacén'],
      generar(R, c) {
        const alm = T('almacenes', 'Un centro de distribución', [['almacen_id', 'int'], ['nombre', 'text', { txt: 1 }], ['pais', 'text', { txt: 1 }], ['ciudad', 'text', { txt: 1 }], ['capacidad_diaria', 'int', { num: 1 }]], 'almacen_id');
        c.paises.forEach((p, i) => alm.filas.push([i + 1, `CD ${PAISES[p].ciudades[0]}`, p, PAISES[p].ciudades[0], R.int(400, 4000)]));
        const env = T('envios', 'Un envío de un paquete', [['envio_id', 'int'], ['almacen_id', 'int', { fk: 'almacenes.almacen_id' }], ['ciudad_destino', 'text', { txt: 1 }], ['transportista', 'text', { txt: 1 }], ['peso_kg', 'dec', { num: 1 }], ['costo', 'dec', { num: 1 }], ['fecha_creacion', 'ts', { evento: 1 }], ['fecha_promesa', 'date'], ['fecha_entrega', 'ts', { nul: 1 }], ['estado', 'text']], 'envio_id', { hechos: 1 });
        const evs = T('eventos_envio', 'Un evento de seguimiento', [['evento_id', 'int'], ['envio_id', 'int', { fk: 'envios.envio_id' }], ['ts', 'ts', { evento: 1 }], ['estado', 'text'], ['ubicacion', 'text', { txt: 1, nul: 1 }]], 'evento_id', { hechos: 1 });
        const TR = { 'Rápido Express': [1.0, 0.04], 'Andes Cargo': [1.3, 0.1], 'Correo Nacional': [1.9, 0.18], 'EcoEnvíos': [1.5, 0.08] };
        let ne = 0;
        for (let i = 1; i <= c.n; i++) {
          const a = alm.filas[R.int(0, alm.filas.length - 1)]; const tr = R.pickW(Object.keys(TR), [30, 25, 30, 15]); const [lento, pPerd] = TR[tr];
          const t = fechaPonderada(R, c.t0, c.t1); const prom = t + R.pick([1, 2, 3, 5]) * DIA; const peso = R.dec(0.2, 30, 2);
          const dias = Math.max(0.3, R.normal((prom - t) / DIA * lento, 0.8)); const perdido = R.chance(pPerd * 0.15);
          const entrega = perdido || t + dias * DIA > c.t1 ? null : t + dias * DIA;
          const estado = perdido ? 'extraviado' : entrega ? 'entregado' : 'en_camino';
          env.filas.push([i, a[0], R.pick(PAISES[a[2]].ciudades), tr, peso, Number((3 + peso * R.dec(0.6, 1.4)).toFixed(2)), ts(t), ymd(prom), entrega ? ts(entrega) : null, estado]);
          const pasos = [['creado', a[3], 0], ['retirado', a[3], 0.1], ['en_camino', null, 0.35], ['en_reparto', null, 0.85]];
          for (const [est, ub, fr] of pasos) { const tt = t + fr * dias * DIA; if (tt > c.t1 || (perdido && fr > 0.4)) break; evs.filas.push([++ne, i, ts(tt), est, ub || R.pick(PAISES[a[2]].ciudades)]); }
          if (entrega) evs.filas.push([++ne, i, ts(entrega), 'entregado', env.filas[i - 1][2]]);
        }
        evs.filas.sort((x, y) => (x[2] < y[2] ? -1 : 1)); evs.filas.forEach((f, i) => { f[0] = i + 1; });
        return [alm, env, evs];
      },
      rels: [['envios.almacen_id', 'almacenes.almacen_id'], ['eventos_envio.envio_id', 'envios.envio_id']],
    },

    saas: {
      titulo: 'Empresa SaaS (suscripciones)', icono: '☁️', desc: 'Empresas clientes, suscripciones por plan con altas, mejoras y bajas, uso diario del producto, facturas y tickets de soporte.',
      unidad: 'empresas', base: 400, preguntas: ['MRR, nuevo, expansión y churn por mes', 'NRR y retención de ingresos por cohorte', 'Uso del producto en los 30 días previos a una baja', 'Facturas vencidas y días de cobro (DSO)', 'Tiempo de resolución de tickets por prioridad'],
      generar(R, c) {
        const emp = T('empresas', 'Una empresa cliente', [['empresa_id', 'int'], ['nombre', 'text', { txt: 1 }], ['industria', 'text', { txt: 1 }], ['pais', 'text', { txt: 1 }], ['empleados', 'int', { num: 1, nul: 1 }], ['fecha_alta', 'date']], 'empresa_id');
        const PRE = ['Grupo', 'Soluciones', 'Distribuidora', 'Consultora', 'Industrias', 'Servicios', 'Tecno', 'Logística'];
        for (let i = 1; i <= c.n; i++) { const pais = R.pickW(c.paises, c.paises.map((p) => PAISES[p].peso)); emp.filas.push([i, `${R.pick(PRE)} ${R.pick(APELLIDOS)} ${R.pick(['S.A.', 'SRL', 'SpA', 'SAS', 'S.L.'])}`, R.pick(['retail', 'salud', 'educación', 'finanzas', 'manufactura', 'tecnología', 'logística']), pais, R.pickW([R.int(5, 50), R.int(51, 250), R.int(251, 2000)], [55, 35, 10]), ymd(c.t0 + R.r() * (c.t1 - c.t0) * 0.85)]); }
        const PLANES = { basico: 49, profesional: 199, empresa: 899 };
        const sus = T('suscripciones', 'Un período de una suscripción (cambia al mejorar o bajar de plan)', [['suscripcion_id', 'int'], ['empresa_id', 'int', { fk: 'empresas.empresa_id' }], ['plan', 'text'], ['mrr', 'dec', { num: 1 }], ['inicio', 'date', { evento: 1 }], ['fin', 'date', { nul: 1 }], ['motivo_fin', 'text', { nul: 1 }]], 'suscripcion_id', { hechos: 1 });
        const uso = T('uso_diario', 'Uso agregado por empresa y día', [['empresa_id', 'int', { fk: 'empresas.empresa_id' }], ['fecha', 'date', { evento: 1 }], ['usuarios_activos', 'int', { num: 1 }], ['eventos', 'int', { num: 1 }], ['llamadas_api', 'int', { num: 1 }]], null, { hechos: 1 });
        const fac = T('facturas', 'Una factura mensual', [['factura_id', 'int'], ['empresa_id', 'int', { fk: 'empresas.empresa_id' }], ['fecha_emision', 'date', { evento: 1 }], ['monto', 'dec', { num: 1 }], ['estado', 'text'], ['fecha_pago', 'date', { nul: 1 }]], 'factura_id', { hechos: 1 });
        const tic = T('tickets', 'Un ticket de soporte', [['ticket_id', 'int'], ['empresa_id', 'int', { fk: 'empresas.empresa_id' }], ['fecha', 'ts', { evento: 1 }], ['prioridad', 'text'], ['categoria', 'text', { txt: 1 }], ['horas_resolucion', 'dec', { num: 1, nul: 1 }], ['satisfaccion', 'int', { nul: 1 }]], 'ticket_id', { hechos: 1 });
        let ns = 0, nfa = 0, nt = 0; const maxUso = 60000;
        for (const e of emp.filas) {
          let t = Date.parse(e[5]); let plan = R.pickW(Object.keys(PLANES), [55, 35, 10]); let activa = true; const salud = R.r();
          while (activa && t < c.t1) {
            const dur = R.int(60, 420) * DIA; const fin = t + dur; let motivo = null, sig = plan;
            if (fin < c.t1) { if (R.chance(0.35 - salud * 0.25)) { motivo = 'baja'; activa = false; } else if (R.chance(0.25) && plan !== 'empresa') { motivo = 'mejora'; sig = plan === 'basico' ? 'profesional' : 'empresa'; } else if (R.chance(0.08) && plan !== 'basico') { motivo = 'reduccion'; sig = plan === 'empresa' ? 'profesional' : 'basico'; } else motivo = 'renovacion'; }
            const asientos = R.int(1, 8);
            sus.filas.push([++ns, e[0], plan, PLANES[plan] * asientos, ymd(t), fin < c.t1 ? ymd(fin) : null, fin < c.t1 ? motivo : null]);
            for (let m = t; m < Math.min(fin, c.t1); m += 30 * DIA) { const pagada = R.chance(0.9); fac.filas.push([++nfa, e[0], ymd(m), PLANES[plan] * asientos, pagada ? 'pagada' : m + 45 * DIA < c.t1 ? 'vencida' : 'pendiente', pagada ? ymd(m + R.int(0, 40) * DIA) : null]); }
            for (let d = Math.max(t, c.t1 - 180 * DIA); d < Math.min(fin, c.t1) && uso.filas.length < maxUso; d += DIA) { const decae = !activa && fin - d < 45 * DIA ? (fin - d) / (45 * DIA) : 1; const u = Math.max(0, Math.round(asientos * 3 * (0.4 + salud) * decae * (new Date(d).getUTCDay() % 6 === 0 ? 0.3 : 1) + R.normal(0, 1))); uso.filas.push([e[0], ymd(d), u, u * R.int(15, 60), u * R.int(0, 200)]); }
            const nTk = R.int(0, 4) + (salud < 0.3 ? 4 : 0);
            for (let k = 0; k < nTk; k++) { const prio = R.pickW(['baja', 'media', 'alta', 'critica'], [35, 40, 18, 7]); const tt = t + R.r() * Math.min(dur, c.t1 - t); tic.filas.push([++nt, e[0], ts(tt), prio, R.pick(['facturación', 'integración', 'error', 'acceso', 'consulta']), R.dec(...{ baja: [4, 96], media: [2, 48], alta: [1, 16], critica: [0.2, 6] }[prio], 1), R.chance(0.6) ? Math.max(1, Math.min(5, Math.round(R.normal(3.4 + salud, 1)))) : null]); }
            t = fin; plan = sig;
          }
        }
        return [emp, sus, uso, fac, tic];
      },
      rels: [['suscripciones.empresa_id', 'empresas.empresa_id'], ['uso_diario.empresa_id', 'empresas.empresa_id'], ['facturas.empresa_id', 'empresas.empresa_id'], ['tickets.empresa_id', 'empresas.empresa_id']],
    },

    salud: {
      titulo: 'Clínica (turnos médicos)', icono: '🏥', desc: 'Pacientes, médicos por especialidad y turnos con asistencias, ausencias (no-show) y cancelaciones. Datos sensibles para practicar privacidad.',
      unidad: 'pacientes', base: 2000, preguntas: ['Tasa de ausentismo (no-show) por día, hora y anticipación', 'Ocupación de agenda por médico y sede', 'Tiempo de espera entre la reserva y el turno', 'Pacientes frecuentes y re-consultas en 30 días', 'Enmascarar datos personales para un tablero'],
      generar(R, c) {
        const pac = T('pacientes', 'Un paciente (datos sensibles)', [['paciente_id', 'int'], ['nombre', 'text', { txt: 1 }], ['apellido', 'text', { txt: 1 }], ['documento', 'text'], ['email', 'text', { txt: 1, nul: 1 }], ['fecha_nacimiento', 'date'], ['sexo', 'text'], ['ciudad', 'text', { txt: 1, nul: 1 }], ['cobertura', 'text', { nul: 1 }]], 'paciente_id');
        for (let i = 1; i <= c.n; i++) { const p = persona(R, c.paises); pac.filas.push([i, p.nombre, p.apellido, String(R.int(10000000, 45000000)), p.email, ymd(Date.UTC(1940, 0, 1) + R.r() * (Date.UTC(2020, 0, 1) - Date.UTC(1940, 0, 1))), R.pick(['F', 'M']), p.ciudad, R.pickW(['prepaga', 'obra_social', 'particular'], [45, 40, 15])]); }
        const ESP = ['Clínica médica', 'Pediatría', 'Cardiología', 'Dermatología', 'Traumatología', 'Ginecología', 'Oftalmología', 'Psicología'];
        const med = T('medicos', 'Un profesional', [['medico_id', 'int'], ['nombre', 'text', { txt: 1 }], ['especialidad', 'text', { txt: 1 }], ['sede', 'text']], 'medico_id');
        const nM = Math.max(8, Math.round(c.n / 80));
        for (let i = 1; i <= nM; i++) med.filas.push([i, `Dr/a. ${R.pick(NOMBRES)} ${R.pick(APELLIDOS)}`, ESP[i % ESP.length], R.pick(['Centro', 'Norte', 'Sur'])]);
        const tur = T('turnos', 'Un turno reservado', [['turno_id', 'int'], ['paciente_id', 'int', { fk: 'pacientes.paciente_id' }], ['medico_id', 'int', { fk: 'medicos.medico_id' }], ['fecha_reserva', 'ts'], ['fecha_turno', 'ts', { evento: 1 }], ['estado', 'text'], ['duracion_min', 'int', { num: 1, nul: 1 }], ['costo', 'dec', { num: 1, nul: 1 }]], 'turno_id', { hechos: 1 });
        const nT = c.n * 4;
        for (let i = 1; i <= nT; i++) {
          let t = c.t0 + R.r() * (c.t1 - c.t0); t = t - (t % DIA) + (R.int(8, 19) * 60 + R.pick([0, 15, 30, 45])) * 60000; if ([0, 6].includes(new Date(t).getUTCDay())) t += 2 * DIA;
          const ant = R.pickW([R.int(0, 2), R.int(3, 10), R.int(11, 45)], [30, 45, 25]);
          const noShow = R.chance(0.06 + ant * 0.006 + (new Date(t).getUTCDay() === 1 ? 0.04 : 0));
          const estado = noShow ? 'ausente' : R.chance(0.09) ? 'cancelado' : 'atendido';
          tur.filas.push([i, R.pareto(c.n, 0.9) + 1, R.int(1, nM), ts(t - ant * DIA - R.int(1, 600) * 60000), ts(t), estado, estado === 'atendido' ? R.pick([15, 20, 30, 45]) : null, estado === 'atendido' ? R.dec(20, 120) : null]);
        }
        tur.filas.sort((a, b) => (a[4] < b[4] ? -1 : 1)); tur.filas.forEach((f, i) => { f[0] = i + 1; });
        return [pac, med, tur];
      },
      rels: [['turnos.paciente_id', 'pacientes.paciente_id'], ['turnos.medico_id', 'medicos.medico_id']],
    },

    streaming: {
      titulo: 'Plataforma de streaming', icono: '🎬', desc: 'Usuarios con altas y bajas, catálogo de películas y series, y reproducciones con minutos vistos y abandono.',
      unidad: 'usuarios', base: 2000, preguntas: ['Usuarios activos diarios y mensuales (DAU/MAU)', 'Churn mensual por plan y país', 'Tasa de finalización por género y duración', 'Contenido que más retiene a usuarios nuevos', 'Sesiones de visionado maratónico'],
      generar(R, c) {
        const us = T('usuarios', 'Un usuario', [['usuario_id', 'int'], ['email', 'text', { txt: 1, nul: 1 }], ['pais', 'text', { txt: 1 }], ['plan', 'text'], ['fecha_alta', 'date'], ['fecha_baja', 'date', { nul: 1 }]], 'usuario_id');
        for (let i = 1; i <= c.n; i++) { const p = persona(R, c.paises); const alta = c.t0 + R.r() * (c.t1 - c.t0) * 0.8; const baja = R.chance(0.3) ? alta + R.int(20, 400) * DIA : null; us.filas.push([i, p.email, p.pais, R.pickW(['basico', 'estandar', 'premium'], [40, 42, 18]), ymd(alta), baja && baja < c.t1 ? ymd(baja) : null]); }
        const GEN = ['drama', 'comedia', 'acción', 'documental', 'terror', 'ciencia ficción', 'infantil', 'romance'];
        const con = T('contenidos', 'Una película o episodio', [['contenido_id', 'int'], ['titulo', 'text', { txt: 1 }], ['tipo', 'text'], ['genero', 'text', { txt: 1 }], ['duracion_min', 'int', { num: 1 }], ['fecha_estreno', 'date']], 'contenido_id');
        const nC = Math.max(60, Math.round(c.n / 6));
        for (let i = 1; i <= nC; i++) { const tipo = R.chance(0.55) ? 'episodio' : 'pelicula'; con.filas.push([i, `${R.pick(['El', 'La', 'Los', 'Las'])} ${R.pick(['último', 'secreto', 'ciudad', 'noche', 'viaje', 'frontera', 'herencia', 'señal', 'isla', 'código'])} ${R.pick(['perdido', 'del sur', 'de cristal', 'infinito', 'rojo', 'final'])}${tipo === 'episodio' ? ` T${R.int(1, 4)}E${R.int(1, 10)}` : ''}`, tipo, R.pick(GEN), tipo === 'episodio' ? R.int(22, 58) : R.int(80, 160), ymd(c.t0 - R.int(0, 900) * DIA + R.r() * (c.t1 - c.t0))]); }
        const rep = T('reproducciones', 'Una reproducción', [['reproduccion_id', 'int'], ['usuario_id', 'int', { fk: 'usuarios.usuario_id' }], ['contenido_id', 'int', { fk: 'contenidos.contenido_id' }], ['inicio', 'ts', { evento: 1 }], ['minutos_vistos', 'int', { num: 1 }], ['dispositivo', 'text', { txt: 1 }], ['completado', 'bool']], 'reproduccion_id', { hechos: 1 });
        const nR = c.n * 18;
        for (let i = 1; i <= nR; i++) {
          const u = us.filas[R.pareto(c.n, 0.85)]; const alta = Date.parse(u[4]), baja = u[5] ? Date.parse(u[5]) : c.t1; if (baja <= alta) continue;
          let t = alta + R.r() * (baja - alta); t = t - (t % DIA) + R.pickW([12, 18, 20, 21, 22, 23, 1], [8, 12, 20, 22, 18, 12, 8]) * 3600000 + R.int(0, 3599) * 1000;
          const cn = con.filas[R.pareto(nC, 0.75)]; const fr = R.chance(0.55) ? 1 : R.r(); const mins = Math.max(1, Math.round(cn[4] * fr));
          rep.filas.push([i, u[0], cn[0], ts(t), mins, R.pickW(['tv', 'movil', 'computadora', 'tablet'], [45, 30, 18, 7]), mins >= cn[4] * 0.9]);
        }
        rep.filas.sort((a, b) => (a[3] < b[3] ? -1 : 1)); rep.filas.forEach((f, i) => { f[0] = i + 1; });
        return [us, con, rep];
      },
      rels: [['reproducciones.usuario_id', 'usuarios.usuario_id'], ['reproducciones.contenido_id', 'contenidos.contenido_id']],
    },

    soporte: {
      titulo: 'Soporte al cliente (texto para IA)', icono: '💬', desc: 'Tickets con mensajes en lenguaje natural, categoría, sentimiento y prioridad etiquetados, y una base de conocimiento para RAG. Ideal para proyectos de IA generativa: clasificar, resumir, responder con fuentes.',
      unidad: 'tickets', base: 1500, preguntas: ['Clasificar tickets con un LLM y comparar con la etiqueta (precisión por categoría)', 'Detectar sentimiento negativo y escalar', 'RAG: responder con la base de conocimiento y citar el artículo', 'Resumir los motivos de contacto de la semana', 'Extraer datos estructurados (número de pedido, monto) del texto'],
      generar(R, c) {
        const kb = T('base_conocimiento', 'Un artículo de ayuda (para RAG)', [['articulo_id', 'int'], ['titulo', 'text', { txt: 1 }], ['categoria', 'text'], ['contenido', 'text', { txt: 1 }], ['actualizado', 'date']], 'articulo_id');
        const ART = [
          ['Cómo devolver un producto', 'devoluciones', 'Puedes devolver un producto dentro de los 30 días corridos desde la entrega, sin uso y en su caja original. Los productos electrónicos tienen 10 días. Inicia la devolución desde Mis pedidos > Devolver. El reembolso se acredita en el mismo medio de pago dentro de los 10 días hábiles posteriores a la recepción.'],
          ['Plazos y costos de envío', 'envios', 'Los envíos demoran entre 3 y 5 días hábiles. El envío es gratis en compras mayores a 50 dólares o su equivalente. El envío express llega en 24 horas a las ciudades principales. Si el paquete se atrasa más de 2 días respecto de la fecha prometida, puedes pedir el reembolso del costo de envío.'],
          ['Cobros duplicados o no reconocidos', 'pagos', 'Si ves dos cobros por la misma compra, normalmente uno es una preautorización que se libera en 72 horas. Si después de ese plazo siguen los dos cobros, abre un reclamo con el número de pedido y los últimos 4 dígitos de la tarjeta. Nunca te pediremos la clave ni el código de seguridad.'],
          ['Garantía de productos', 'garantia', 'Todos los productos tienen 12 meses de garantía del fabricante. Para usarla necesitas la factura y el número de serie. La garantía no cubre golpes, humedad ni reparaciones de terceros.'],
          ['Cambiar los datos de la cuenta', 'cuenta', 'Puedes cambiar tu email, teléfono y dirección desde Mi cuenta > Datos personales. Por seguridad, el cambio de email requiere confirmar un código enviado al email anterior. Si perdiste el acceso al email anterior, contacta a soporte con tu documento.'],
          ['Paquete dañado o incompleto', 'envios', 'Si el paquete llegó dañado o le falta un producto, repórtalo dentro de las 48 horas con una foto del embalaje y de la etiqueta. Enviamos un reemplazo sin costo o reintegramos el importe.'],
          ['Facturación y comprobantes', 'pagos', 'La factura se envía por email al confirmarse el pago y también está disponible en Mis pedidos. Para facturar a una empresa, carga los datos fiscales antes de pagar: no se pueden modificar facturas ya emitidas.'],
        ];
        ART.forEach((a, i) => kb.filas.push([i + 1, a[0], a[1], a[2], ymd(c.t1 - R.int(5, 200) * DIA)]));
        const PLANT = {
          devoluciones: { pos: ['Quiero devolver {prod} que compré, ¿cómo hago?', 'Hola, el {prod} no me convenció. ¿Hasta cuándo puedo devolverlo?'], neg: ['Hace {d} días pedí la devolución de {prod} y todavía no me devolvieron la plata. Es una vergüenza.', 'Ya devolví {prod} y nadie me responde, quiero mi reembolso YA'] },
          envios: { pos: ['¿Cuándo llega mi pedido {ped}?', 'Hola! Quería saber si el envío express llega mañana a {ciudad}'], neg: ['Mi pedido {ped} tenía que llegar hace {d} días y sigue sin aparecer. Pésimo servicio.', 'Me llegó la caja rota y el {prod} rayado. Pedido {ped}.'] },
          pagos: { pos: ['¿Puedo pagar en cuotas el {prod}?', 'Necesito la factura del pedido {ped} a nombre de mi empresa'], neg: ['Me cobraron dos veces {monto} por el pedido {ped}!!! Devuélvanme el dinero', 'Tengo un cobro de {monto} que no reconozco, ¿qué es esto?'] },
          garantia: { pos: ['El {prod} dejó de funcionar, ¿lo cubre la garantía?', 'Hola, ¿cuánto dura la garantía del {prod}?'], neg: ['El {prod} se rompió a los {d} días y me dicen que no cubre la garantía. Inaceptable.'] },
          cuenta: { pos: ['¿Cómo cambio mi email de la cuenta?', 'Quiero actualizar mi dirección de entrega a {ciudad}'], neg: ['No puedo entrar a mi cuenta hace {d} días y nadie me ayuda', 'Me hackearon la cuenta, hay compras que no hice'] },
        };
        const PROD = ['celular', 'notebook', 'auricular', 'televisor', 'licuadora', 'campera', 'zapatillas', 'monitor'];
        const tk = T('tickets', 'Un mensaje de un cliente, etiquetado', [['ticket_id', 'int'], ['fecha', 'ts', { evento: 1 }], ['canal', 'text'], ['pais', 'text', { txt: 1 }], ['mensaje', 'text', { txt: 1 }], ['categoria', 'text'], ['sentimiento', 'text'], ['prioridad', 'text'], ['articulo_relacionado', 'int', { fk: 'base_conocimiento.articulo_id', nul: 1 }], ['resuelto_primer_contacto', 'bool']], 'ticket_id', { hechos: 1 });
        for (let i = 1; i <= c.n; i++) {
          const cat = R.pickW(Object.keys(PLANT), [22, 32, 22, 10, 14]); const neg = R.chance(0.38); const pais = R.pickW(c.paises, c.paises.map((p) => PAISES[p].peso));
          const msg = R.pick(PLANT[cat][neg ? 'neg' : 'pos']).replace('{prod}', R.pick(PROD)).replace('{ped}', `#${R.int(100000, 999999)}`).replace('{d}', R.int(3, 25)).replace('{ciudad}', R.pick(PAISES[pais].ciudades)).replace('{monto}', `$${R.int(20, 900)}`);
          const art = kb.filas.find((a) => a[2] === cat) || null;
          tk.filas.push([i, ts(fechaPonderada(R, c.t0, c.t1) + horaDelDia(R) % DIA), R.pickW(['chat', 'email', 'whatsapp', 'formulario'], [35, 25, 30, 10]), pais, msg, cat, neg ? 'negativo' : R.chance(0.7) ? 'neutro' : 'positivo', neg && /cobr|hacke|dos veces/.test(msg) ? 'urgente' : neg ? 'alta' : R.pick(['media', 'baja']), art ? art[0] : null, R.chance(neg ? 0.45 : 0.8)]);
        }
        tk.filas.sort((a, b) => (a[1] < b[1] ? -1 : 1)); tk.filas.forEach((f, i) => { f[0] = i + 1; });
        return [kb, tk];
      },
      rels: [['tickets.articulo_relacionado', 'base_conocimiento.articulo_id']],
    },
  };

  // ---------------------------------------------------------------- problemas de calidad
  const PROBLEMAS = {
    duplicados: ['Duplicados', 'Filas repetidas en las tablas de hechos, a veces con otra fecha de carga o en mayúsculas (como un reintento).'],
    nulos: ['Nulos', 'Valores vacíos en las columnas opcionales (email, ciudad, métricas…).'],
    formatos: ['Formatos inconsistentes', 'Textos en MAYÚSCULAS o con espacios de más, y fechas escritas como DD/MM/AAAA.'],
    atipicos: ['Valores atípicos', 'Números fuera de rango: negativos, ×100 (centavos en vez de unidades), cero.'],
    huerfanos: ['Claves huérfanas', 'Claves foráneas que apuntan a filas que no existen.'],
    tardios: ['Datos tardíos', 'Agrega la columna cargado_en; algunas filas llegan días después del evento.'],
    mojibake: ['Mojibake', 'Textos con tildes rotas por una mala codificación (BogotÃ¡).'],
  };
  const MOJI = { á: 'Ã¡', é: 'Ã©', í: 'Ã­', ó: 'Ã³', ú: 'Ãº', ñ: 'Ã±', Á: 'Ã\u0081', É: 'Ã‰', Ó: 'Ã“' };
  function sembrar(R, tablas, prob) {
    const log = [];
    const nota = (tabla, problema, n, detalle) => { if (n) log.push({ tabla, problema, n, detalle }); };
    for (const t of tablas) {
      const idx = (pred) => t.cols.map((c, i) => (pred(c) ? i : -1)).filter((i) => i >= 0);
      const n0 = t.filas.length;
      // datos tardíos: columna cargado_en en las tablas de hechos con fecha de evento
      const iev = t.cols.findIndex((c) => c.evento);
      if (prob.tardios > 0 && t.hechos && iev >= 0) {
        t.cols.push({ n: 'cargado_en', t: 'ts' }); let k = 0;
        for (const f of t.filas) { const base = Date.parse(String(f[iev]).replace(' ', 'T') + (String(f[iev]).length <= 10 ? 'T00:00:00' : '') + 'Z'); const tarde = R.chance(prob.tardios / 100); if (tarde) k++; f.push(ts(base + (tarde ? R.int(1, 6) * DIA + R.int(0, 86399) * 1000 : R.int(60, 7200) * 1000))); }
        nota(t.nombre, 'tardios', k, 'filas con cargado_en más de 1 día después del evento');
      }
      if (prob.nulos > 0) { let k = 0; const cols = idx((c) => c.nul); for (const f of t.filas) for (const i of cols) if (f[i] !== null && R.chance(prob.nulos / 100)) { f[i] = null; k++; } nota(t.nombre, 'nulos', k, `valores nulos en ${cols.map((i) => t.cols[i].n).join(', ')}`); }
      if (prob.formatos > 0) {
        let k = 0, kf = 0; const cols = idx((c) => c.txt); const fechas = idx((c) => c.t === 'date' && !c.evento);
        for (const f of t.filas) {
          for (const i of cols) if (typeof f[i] === 'string' && R.chance(prob.formatos / 100)) { f[i] = R.chance(0.5) ? f[i].toUpperCase() : (R.chance(0.5) ? '  ' : '') + f[i] + (R.chance(0.7) ? ' ' : ''); k++; }
          for (const i of fechas) if (typeof f[i] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f[i]) && R.chance(prob.formatos / 200)) { const [a, m, d] = f[i].split('-'); f[i] = `${d}/${m}/${a}`; kf++; }
        }
        nota(t.nombre, 'formatos', k, `textos con mayúsculas o espacios en ${cols.map((i) => t.cols[i].n).join(', ')}`);
        nota(t.nombre, 'formatos', kf, `fechas en formato DD/MM/AAAA en ${fechas.map((i) => t.cols[i].n).join(', ')}`);
      }
      if (prob.atipicos > 0) {
        let k = 0; const cols = idx((c) => c.num);
        for (const f of t.filas) for (const i of cols) if (typeof f[i] === 'number' && R.chance(prob.atipicos / 200)) { const m = R.pickW(['x100', 'neg', 'cero'], [45, 35, 20]); f[i] = m === 'x100' ? Number((f[i] * 100).toFixed(2)) : m === 'neg' ? -Math.abs(f[i]) : 0; k++; }
        nota(t.nombre, 'atipicos', k, `valores ×100, negativos o cero en ${cols.map((i) => t.cols[i].n).join(', ')}`);
      }
      if (prob.huerfanos > 0) {
        let k = 0; const cols = idx((c) => c.fk);
        for (const f of t.filas) for (const i of cols) if (f[i] !== null && R.chance(prob.huerfanos / 200)) { f[i] = typeof f[i] === 'number' ? 900000 + R.int(1, 99999) : `SN-9${R.int(100, 999)}`; k++; }
        nota(t.nombre, 'huerfanos', k, `claves que no existen en ${cols.map((i) => `${t.cols[i].n} → ${t.cols[i].fk}`).join(', ')}`);
      }
      if (prob.mojibake > 0) {
        let k = 0; const cols = idx((c) => c.txt);
        for (const f of t.filas) for (const i of cols) if (typeof f[i] === 'string' && /[áéíóúñÁÉÓ]/.test(f[i]) && R.chance(prob.mojibake / 100)) { f[i] = f[i].replace(/[áéíóúñÁÉÓ]/g, (x) => MOJI[x]); k++; }
        nota(t.nombre, 'mojibake', k, `textos con tildes rotas en ${cols.map((i) => t.cols[i].n).join(', ')}`);
      }
      if (prob.duplicados > 0 && t.hechos) {
        let k = 0; const extra = [];
        for (const f of t.filas) if (R.chance(prob.duplicados / 100)) { const g = f.slice(); const icl = t.cols.findIndex((c) => c.n === 'cargado_en'); if (icl >= 0 && R.chance(0.6)) g[icl] = ts(Date.parse(String(g[icl]).replace(' ', 'T') + 'Z') + R.int(5, 120) * 60000); extra.push([R.int(0, t.filas.length), g]); k++; }
        extra.sort((a, b) => b[0] - a[0]).forEach(([pos, g]) => t.filas.splice(pos, 0, g));
        nota(t.nombre, 'duplicados', k, `filas duplicadas (misma ${t.pk || 'clave'})`);
      }
      t.limpias = n0;
    }
    return log;
  }

  // ---------------------------------------------------------------- generar
  function generar(cfg) {
    const esq = ESCENARIOS[cfg.escenario];
    const R = crearAzar(cfg.semilla);
    const c = { n: cfg.n, paises: cfg.paises.length ? cfg.paises : Object.keys(PAISES), t0: Date.parse(cfg.desde + 'T00:00:00Z'), t1: Date.parse(cfg.hasta + 'T23:59:59Z') };
    const tablas = esq.generar(R, c);
    const log = sembrar(crearAzar(cfg.semilla + 1), tablas, cfg.problemas);
    return { cfg, esq, tablas, log };
  }

  // ---------------------------------------------------------------- formatos de salida
  const celdaCsv = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v); return /[",\n\r]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const aCsv = (t) => [t.cols.map((c) => c.n).join(','), ...t.filas.map((f) => f.map(celdaCsv).join(','))].join('\n') + '\n';
  const aJsonl = (t) => t.filas.map((f) => JSON.stringify(Object.fromEntries(t.cols.map((c, i) => [c.n, f[i] === undefined ? null : f[i]])))).join('\n') + '\n';
  const TIPOS_SQL = {
    postgres: { int: 'INTEGER', dec: 'NUMERIC(14,2)', text: 'TEXT', date: 'DATE', ts: 'TIMESTAMP', bool: 'BOOLEAN' },
    mysql: { int: 'INT', dec: 'DECIMAL(14,2)', text: 'VARCHAR(500)', date: 'DATE', ts: 'DATETIME', bool: 'BOOLEAN' },
    sqlserver: { int: 'INT', dec: 'DECIMAL(14,2)', text: 'NVARCHAR(500)', date: 'DATE', ts: 'DATETIME2', bool: 'BIT' },
    sqlite: { int: 'INTEGER', dec: 'REAL', text: 'TEXT', date: 'TEXT', ts: 'TEXT', bool: 'INTEGER' },
  };
  const DIALECTOS = { postgres: 'PostgreSQL / DuckDB', mysql: 'MySQL', sqlserver: 'SQL Server', sqlite: 'SQLite' };
  // con problemas de formato, una columna de fecha puede traer texto: se declara como texto (así se carga como en la vida real)
  const tipoCol = (c, d, sucio) => TIPOS_SQL[d][(sucio && (c.t === 'date' || c.t === 'ts') && !c.evento) ? 'text' : c.t];
  function ddl(t, d, sucio) {
    const q = (n) => (d === 'mysql' ? `\`${n}\`` : d === 'sqlserver' ? `[${n}]` : `"${n}"`);
    // sin PRIMARY KEY si hay duplicados sembrados: la tabla tiene que poder cargarlos
    const pk = t.pk && !(sucio && t.hechos) ? `,\n  PRIMARY KEY (${q(t.pk)})` : '';
    return `CREATE TABLE ${q(t.nombre)} (\n${t.cols.map((c) => `  ${q(c.n)} ${tipoCol(c, d, sucio)}`).join(',\n')}${pk}\n);`;
  }
  function inserts(t, d) {
    const q = (n) => (d === 'mysql' ? `\`${n}\`` : d === 'sqlserver' ? `[${n}]` : `"${n}"`);
    const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (d === 'sqlserver' || d === 'sqlite' ? (v ? '1' : '0') : v ? 'TRUE' : 'FALSE') : `${d === 'sqlserver' ? 'N' : ''}'${String(v).replace(/'/g, "''")}'`);
    const lote = d === 'sqlserver' ? 1000 : 500; const out = [];
    for (let i = 0; i < t.filas.length; i += lote) out.push(`INSERT INTO ${q(t.nombre)} (${t.cols.map((c) => q(c.n)).join(', ')}) VALUES\n${t.filas.slice(i, i + lote).map((f) => `(${f.map(lit).join(', ')})`).join(',\n')};`);
    return out.join('\n');
  }
  const sucioDe = (res) => Object.values(res.cfg.problemas).some((v) => v > 0);
  function aSql(res, d) {
    const s = sucioDe(res);
    const q = (n) => (d === 'mysql' ? `\`${n}\`` : d === 'sqlserver' ? `[${n}]` : `"${n}"`);
    const borrar = res.tablas.slice().reverse().map((t) => `DROP TABLE IF EXISTS ${q(t.nombre)};`).join('\n');
    return `-- Dataset "${res.esq.titulo}" generado por Academia de Datos (semilla ${res.cfg.semilla})\n-- Dialecto: ${DIALECTOS[d]}\n-- Se puede ejecutar varias veces: primero borra las tablas si existen.\n\n${borrar}\n\n` + res.tablas.map((t) => `${ddl(t, d, s)}\n\n${inserts(t, d)}\n`).join('\n');
  }

  function readme(res) {
    const { cfg, esq, tablas, log } = res;
    const enlace = location.origin + location.pathname + '#/generador?' + aParams(cfg);
    const porProb = {}; log.forEach((l) => { (porProb[l.problema] = porProb[l.problema] || []).push(l); });
    return `# Dataset: ${esq.titulo}

${esq.desc}

- Generado: ${new Date().toISOString().slice(0, 10)} con el generador de Academia de Datos
- Semilla: \`${cfg.semilla}\` · Escala: ${cfg.n} ${esq.unidad} · Fechas: ${cfg.desde} a ${cfg.hasta}
- Países: ${(cfg.paises.length ? cfg.paises : Object.keys(PAISES)).join(', ')}
- Para regenerar exactamente estos datos: ${enlace}

## Tablas

${tablas.map((t) => `### ${t.nombre} (${t.filas.length.toLocaleString('es')} filas)\n${t.desc}.${t.pk ? ` Clave: \`${t.pk}\`.` : ''}\n\n| Columna | Tipo | Notas |\n|---|---|---|\n${t.cols.map((c) => `| ${c.n} | ${c.t} | ${[c.fk ? `→ ${c.fk}` : '', c.nul ? 'puede ser nula' : '', c.evento ? 'fecha del evento' : '', c.n === 'cargado_en' ? 'cuándo llegó al lago' : ''].filter(Boolean).join(', ')} |`).join('\n')}`).join('\n\n')}

## Relaciones

${esq.rels.map(([a, b]) => `- \`${a}\` → \`${b}\``).join('\n')}

## Problemas de calidad sembrados

${log.length ? (cfg.soluciones ? Object.entries(porProb).map(([p, ls]) => `### ${PROBLEMAS[p][0]}\n${ls.map((l) => `- \`${l.tabla}\`: ${l.n.toLocaleString('es')} ${l.detalle}`).join('\n')}`).join('\n\n') : `Este dataset tiene problemas sembrados (${Object.keys(porProb).map((p) => PROBLEMAS[p][0].toLowerCase()).join(', ')}). La cantidad exacta no se incluye: encontrarlos es parte del ejercicio.`) : 'Ninguno: es un dataset limpio.'}

## Ideas de preguntas para tu proyecto

${esq.preguntas.map((p) => `- ${p}`).join('\n')}

## Cómo cargarlo

**DuckDB** (lo más rápido para explorar):
\`\`\`bash
duckdb proyecto.duckdb -c "CREATE TABLE ${tablas[0].nombre} AS SELECT * FROM read_csv_auto('${tablas[0].nombre}.csv');"
duckdb -c "COPY (SELECT * FROM '${tablas[tablas.length - 1].nombre}.csv') TO '${tablas[tablas.length - 1].nombre}.parquet' (FORMAT parquet);"
\`\`\`

**PostgreSQL**: ejecuta \`schema.sql\` y después, por tabla:
\`\`\`bash
psql -d proyecto -c "\\copy ${tablas[0].nombre} FROM '${tablas[0].nombre}.csv' WITH (FORMAT csv, HEADER true)"
\`\`\`

**Python (pandas / Polars)**:
\`\`\`python
import pandas as pd
${tablas[0].nombre} = pd.read_csv("${tablas[0].nombre}.csv")
\`\`\`

**Spark / Databricks** (sube los CSV a un volumen de Unity Catalog):
\`\`\`python
df = spark.read.option("header", True).option("inferSchema", True).csv("/Volumes/main/proyecto/crudo/${tablas[0].nombre}.csv")
df.write.mode("overwrite").saveAsTable("main.proyecto.bronze_${tablas[0].nombre}")
\`\`\`

**Azure (ADLS Gen2)**:
\`\`\`bash
az storage fs directory upload --account-name <cuenta> -f crudo -s "./*.csv" -d ${cfg.escenario}/ --auth-mode login
\`\`\`
`;
  }

  // ---------------------------------------------------------------- zip (sin compresión, método "store")
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(archivos) {
    const enc = new TextEncoder(); const partes = [], central = []; let off = 0;
    const d = new Date(); const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1); const fecha = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const [nombre, texto] of archivos) {
      const n = enc.encode(nombre), b = enc.encode(texto), crc = crc32(b);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, hora, true); h.setUint16(12, fecha, true); h.setUint32(14, crc, true); h.setUint32(18, b.length, true); h.setUint32(22, b.length, true); h.setUint16(26, n.length, true); h.setUint16(28, 0, true);
      partes.push(new Uint8Array(h.buffer), n, b);
      const cd = new DataView(new ArrayBuffer(46)); cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true); cd.setUint16(12, hora, true); cd.setUint16(14, fecha, true); cd.setUint32(16, crc, true); cd.setUint32(20, b.length, true); cd.setUint32(24, b.length, true); cd.setUint16(28, n.length, true); cd.setUint32(42, off, true);
      central.push(new Uint8Array(cd.buffer), n);
      off += 30 + n.length + b.length;
    }
    const tamCentral = central.reduce((s, x) => s + x.length, 0);
    const fin = new DataView(new ArrayBuffer(22)); fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true); fin.setUint32(12, tamCentral, true); fin.setUint32(16, off, true);
    return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: 'application/zip' });
  }
  function descargar(nombre, contenido, tipo) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo + ';charset=utf-8' }));
    a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function archivos(res, formato, dialecto) {
    const out = [['README.md', readme(res)]];
    if (formato === 'sql') out.push([`${res.cfg.escenario}_${dialecto}.sql`, aSql(res, dialecto)]);
    else { out.push(['schema.sql', res.tablas.map((t) => ddl(t, 'postgres', sucioDe(res))).join('\n\n') + '\n']); for (const t of res.tablas) out.push([`${t.nombre}.${formato === 'jsonl' ? 'jsonl' : 'csv'}`, formato === 'jsonl' ? aJsonl(t) : aCsv(t)]); }
    return out;
  }

  // ---------------------------------------------------------------- configuración <-> URL
  const DEF = { escenario: 'ecommerce', n: 2000, semilla: 42, desde: '2024-01-01', hasta: '2024-12-31', paises: [], problemas: { duplicados: 0, nulos: 0, formatos: 0, atipicos: 0, huerfanos: 0, tardios: 0, mojibake: 0 }, formato: 'csv', dialecto: 'postgres', soluciones: true };
  function aParams(c) {
    const p = new URLSearchParams({ esc: c.escenario, n: c.n, semilla: c.semilla, desde: c.desde, hasta: c.hasta });
    if (c.paises.length) p.set('paises', c.paises.map((x) => PAISES[x].cod).join(','));
    for (const [k, v] of Object.entries(c.problemas)) if (v) p.set(k, v);
    return p.toString();
  }
  function deParams(params) {
    const c = JSON.parse(JSON.stringify(DEF));
    if (!params) return c;
    if (ESCENARIOS[params.get('esc')]) { c.escenario = params.get('esc'); c.n = ESCENARIOS[c.escenario].base; }
    if (params.get('n')) c.n = Math.max(10, Math.min(200000, Number(params.get('n')) || c.n));
    if (params.get('semilla')) c.semilla = Number(params.get('semilla')) || 42;
    if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('desde') || '')) c.desde = params.get('desde');
    if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('hasta') || '')) c.hasta = params.get('hasta');
    if (params.get('paises')) { const cods = params.get('paises').split(','); c.paises = Object.keys(PAISES).filter((p) => cods.includes(PAISES[p].cod)); }
    for (const k of Object.keys(c.problemas)) if (params.get(k)) c.problemas[k] = Math.max(0, Math.min(30, Number(params.get(k)) || 0));
    return c;
  }

  // ---------------------------------------------------------------- vista
  function vista(main, ctx) {
    const { toast, params } = ctx;
    const cfg = deParams(params);
    let res = null, tablaAct = 0;
    main.innerHTML = `<div class="container wide generador">
      <h1 style="margin:0 0 4px">🏭 Generador de datos para proyectos</h1>
      <p class="muted" style="margin:0 0 14px;max-width:920px">Crea un dataset realista con relaciones entre tablas, estacionalidad y clientes que se comportan distinto. Siembra los <b>problemas de calidad</b> que vas a tener que limpiar y descárgalo en <b>CSV, JSON Lines o SQL</b>, o mándalo directo a la terminal para explorarlo con DuckDB. La misma semilla genera siempre los mismos datos.</p>
      <div class="gen-esc" id="genEsc">${Object.entries(ESCENARIOS).map(([k, e]) => `<button class="card gen-esc-b" data-esc="${k}"><span class="gen-ico">${e.icono}</span><b>${esc(e.titulo)}</b><small>${esc(e.desc)}</small></button>`).join('')}</div>
      <div class="gen-grid">
        <form class="card gen-cfg" id="genCfg" onsubmit="return false">
          <h3>⚙️ Configuración</h3>
          <label>Escala <span class="muted small" id="genUnidad"></span><input type="number" name="n" min="10" max="200000" step="10"></label>
          <div class="gen-tam">${[['XS', 0.1], ['S', 0.5], ['M', 1], ['L', 5], ['XL', 25]].map(([t, f]) => `<button type="button" data-f="${f}">${t}</button>`).join('')}</div>
          <div class="gen-2"><label>Desde<input type="date" name="desde"></label><label>Hasta<input type="date" name="hasta"></label></div>
          <label>Semilla<span class="gen-semilla"><input type="number" name="semilla" min="1" max="999999"><button type="button" id="genDado" title="Semilla al azar">🎲</button></span></label>
          <fieldset><legend>Países <small class="muted">(ninguno = todos)</small></legend><div class="gen-paises">${Object.keys(PAISES).map((p) => `<label class="gen-chk"><input type="checkbox" name="pais" value="${esc(p)}"> ${esc(p)}</label>`).join('')}</div></fieldset>
          <fieldset><legend>Problemas de calidad <small class="muted">(% de filas)</small></legend>
            ${Object.entries(PROBLEMAS).map(([k, [t, d]]) => `<label class="gen-prob" title="${esc(d)}"><span>${esc(t)}</span><input type="range" name="p_${k}" min="0" max="20" step="1"><output></output></label>`).join('')}
            <div class="gen-presets"><button type="button" data-pp="0">Limpio</button><button type="button" data-pp="1">Realista</button><button type="button" data-pp="2">Caótico</button></div>
          </fieldset>
          <fieldset><legend>Salida</legend>
            <div class="gen-2"><label>Formato<select name="formato"><option value="csv">CSV</option><option value="jsonl">JSON Lines</option><option value="sql">SQL (INSERT)</option></select></label>
            <label>Dialecto SQL<select name="dialecto">${Object.entries(DIALECTOS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label></div>
            <label class="gen-chk"><input type="checkbox" name="soluciones"> Incluir en el README cuántos problemas se sembraron y dónde</label>
          </fieldset>
          <button type="button" class="btn btn-primary btn-lg" id="genGo" style="width:100%">⚡ Generar datos</button>
        </form>
        <section class="card gen-res" id="genRes"><div class="gen-vacio">Elige un escenario, ajusta la configuración y presiona <b>Generar datos</b>.</div></section>
      </div>
    </div>`;
    const $ = (s) => main.querySelector(s); const F = $('#genCfg');

    function pintarCfg() {
      main.querySelectorAll('[data-esc]').forEach((b) => b.classList.toggle('on', b.dataset.esc === cfg.escenario));
      F.n.value = cfg.n; F.desde.value = cfg.desde; F.hasta.value = cfg.hasta; F.semilla.value = cfg.semilla;
      $('#genUnidad').textContent = `(${ESCENARIOS[cfg.escenario].unidad})`;
      main.querySelectorAll('input[name=pais]').forEach((x) => { x.checked = cfg.paises.includes(x.value); });
      for (const k of Object.keys(PROBLEMAS)) { const r = F['p_' + k]; r.value = cfg.problemas[k]; r.nextElementSibling.textContent = cfg.problemas[k] + '%'; }
      F.formato.value = cfg.formato; F.dialecto.value = cfg.dialecto; F.soluciones.checked = cfg.soluciones;
      F.dialecto.closest('label').style.opacity = cfg.formato === 'sql' ? 1 : 0.5;
    }
    function leerCfg() {
      cfg.n = Math.max(10, Math.min(200000, Number(F.n.value) || ESCENARIOS[cfg.escenario].base));
      cfg.desde = F.desde.value || DEF.desde; cfg.hasta = F.hasta.value || DEF.hasta;
      if (cfg.hasta < cfg.desde) [cfg.desde, cfg.hasta] = [cfg.hasta, cfg.desde];
      cfg.semilla = Number(F.semilla.value) || 42;
      cfg.paises = [...main.querySelectorAll('input[name=pais]:checked')].map((x) => x.value);
      for (const k of Object.keys(PROBLEMAS)) cfg.problemas[k] = Number(F['p_' + k].value);
      cfg.formato = F.formato.value; cfg.dialecto = F.dialecto.value; cfg.soluciones = F.soluciones.checked;
    }
    main.querySelector('#genEsc').addEventListener('click', (e) => { const b = e.target.closest('[data-esc]'); if (!b) return; leerCfg(); cfg.escenario = b.dataset.esc; cfg.n = ESCENARIOS[cfg.escenario].base; pintarCfg(); });
    F.addEventListener('input', (e) => { if (e.target.type === 'range') e.target.nextElementSibling.textContent = e.target.value + '%'; leerCfg(); F.dialecto.closest('label').style.opacity = cfg.formato === 'sql' ? 1 : 0.5; });
    main.querySelector('.gen-tam').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; F.n.value = Math.round(ESCENARIOS[cfg.escenario].base * Number(b.dataset.f)); leerCfg(); });
    $('#genDado').addEventListener('click', () => { F.semilla.value = Math.floor(Math.random() * 999998) + 1; leerCfg(); });
    main.querySelector('.gen-presets').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pp]'); if (!b) return;
      const P = [{}, { duplicados: 2, nulos: 4, formatos: 5, atipicos: 1, huerfanos: 1, tardios: 3, mojibake: 1 }, { duplicados: 8, nulos: 12, formatos: 15, atipicos: 5, huerfanos: 6, tardios: 10, mojibake: 5 }][Number(b.dataset.pp)];
      for (const k of Object.keys(PROBLEMAS)) cfg.problemas[k] = P[k] || 0; pintarCfg();
    });

    function pintarRes() {
      const t = res.tablas[tablaAct];
      const total = res.tablas.reduce((s, x) => s + x.filas.length, 0);
      const nulos = t.cols.map((c, i) => t.filas.reduce((s, f) => s + (f[i] === null || f[i] === undefined ? 1 : 0), 0));
      $('#genRes').innerHTML = `
        <div class="gen-res-cab"><div><h3 style="margin:0">${res.esq.icono} ${esc(res.esq.titulo)}</h3><span class="small muted">${res.tablas.length} tablas · ${total.toLocaleString('es')} filas · semilla ${res.cfg.semilla} · generado en ${res.ms} ms</span></div>
          <div class="gen-acc"><button class="btn btn-primary" id="genZip">⬇ Descargar .zip</button><button class="btn" id="genTerm" title="Copia los CSV a ~/datos/generados en la terminal del curso">⌨ Enviar a la terminal</button><button class="btn btn-ghost" id="genLink" title="Copiar un enlace que regenera exactamente estos datos">🔗 Enlace</button></div></div>
        ${res.log.length ? `<details class="gen-log"><summary>🐞 Problemas sembrados: ${res.log.reduce((s, l) => s + l.n, 0).toLocaleString('es')} en ${new Set(res.log.map((l) => l.tabla)).size} tablas</summary><ul>${res.log.map((l) => `<li><b>${esc(l.tabla)}</b> · ${esc(PROBLEMAS[l.problema][0])}: ${l.n.toLocaleString('es')} ${esc(l.detalle)}</li>`).join('')}</ul></details>` : '<p class="small muted">Dataset limpio: sin problemas sembrados.</p>'}
        <div class="gen-tabs">${res.tablas.map((x, i) => `<button class="${i === tablaAct ? 'on' : ''}" data-t="${i}">${esc(x.nombre)} <small>${x.filas.length.toLocaleString('es')}</small></button>`).join('')}</div>
        <p class="small muted" style="margin:6px 0">${esc(t.desc)}. ${t.pk ? `Clave: <code>${esc(t.pk)}</code>.` : ''} Columnas con nulos: ${t.cols.map((c, i) => (nulos[i] ? `<code>${esc(c.n)}</code> ${((100 * nulos[i]) / Math.max(1, t.filas.length)).toFixed(1)}%` : '')).filter(Boolean).join(', ') || 'ninguna'}.
          <button class="btn btn-ghost btn-sm" data-dl="${tablaAct}">⬇ Solo esta tabla</button></p>
        <div class="gen-prev"><table class="result"><thead><tr><th class="rn">#</th>${t.cols.map((c) => `<th>${esc(c.n)}<small>${c.t}</small></th>`).join('')}</tr></thead><tbody>${t.filas.slice(0, 25).map((f, i) => `<tr><td class="rn">${i + 1}</td>${f.map((v) => `<td class="${typeof v === 'number' ? 'num' : ''}">${v === null || v === undefined ? '<span class="null">NULL</span>' : esc(typeof v === 'boolean' ? String(v) : v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="small muted">Vista previa: primeras 25 filas de ${t.filas.length.toLocaleString('es')}.</p>
        <details class="gen-ddl"><summary>📜 SQL para crear las tablas (${DIALECTOS[res.cfg.dialecto]})</summary><pre><code>${esc(res.tablas.map((x) => ddl(x, res.cfg.dialecto, sucioDe(res))).join('\n\n'))}</code></pre></details>`;
    }
    $('#genRes').addEventListener('click', async (e) => {
      const tb = e.target.closest('[data-t]'); if (tb) { tablaAct = Number(tb.dataset.t); return pintarRes(); }
      const dl = e.target.closest('[data-dl]'); if (dl) { const t = res.tablas[Number(dl.dataset.dl)]; const f = res.cfg.formato; if (f === 'sql') descargar(`${t.nombre}.sql`, `${ddl(t, res.cfg.dialecto, sucioDe(res))}\n\n${inserts(t, res.cfg.dialecto)}\n`, 'text/plain'); else descargar(`${t.nombre}.${f === 'jsonl' ? 'jsonl' : 'csv'}`, f === 'jsonl' ? aJsonl(t) : aCsv(t), 'text/plain'); return; }
      if (e.target.closest('#genZip')) { const z = zip(archivos(res, res.cfg.formato, res.cfg.dialecto)); descargar(`dataset-${res.cfg.escenario}-${res.cfg.semilla}.zip`, z); toast(`Descargando ${(z.size / 1048576).toFixed(1)} MB`); return; }
      if (e.target.closest('#genLink')) { const url = location.origin + location.pathname + '#/generador?' + aParams(res.cfg); try { await navigator.clipboard.writeText(url); toast('Enlace copiado: regenera exactamente estos datos'); } catch (err) { prompt('Copia este enlace:', url); } return; }
      if (e.target.closest('#genTerm')) {
        const Sh = window.Shell; if (!Sh) return;
        const fs = archivos(res, 'csv'); const tam = fs.reduce((s, [, x]) => s + x.length, 0);
        if (tam > 2.5 * 1048576) { toast(`Son ${(tam / 1048576).toFixed(1)} MB: demasiado para la terminal del navegador (máximo 2,5 MB). Baja la escala o descarga el .zip.`, 4500); return; }
        if (!Sh.Machine.ready) Sh.Machine.load();   // si la terminal todavía no se abrió, cargar su disco antes de escribir
        const dir = `${Sh.HOME}/datos/generados/${res.cfg.escenario}`;
        for (const [n, x] of fs) Sh.writeFile(`${dir}/${n}`, x);
        Sh.Machine.save();
        toast(`Listo: ${fs.length} archivos en ~/datos/generados/${res.cfg.escenario}. Abre la terminal y prueba duckdb.`, 4200);
        const term = document.getElementById('termBtn'); if (term) term.click();
      }
    });
    $('#genGo').addEventListener('click', () => {
      leerCfg();
      history.replaceState(null, '', '#/generador?' + aParams(cfg));
      $('#genGo').disabled = true; $('#genGo').textContent = '⏳ Generando…';
      setTimeout(() => {
        const t0 = performance.now();
        try { res = generar(JSON.parse(JSON.stringify(cfg))); res.ms = Math.round(performance.now() - t0); tablaAct = Math.min(tablaAct, res.tablas.length - 1); if (tablaAct < 0) tablaAct = 0; pintarRes(); }
        catch (err) { $('#genRes').innerHTML = `<p class="t-err">Error al generar: ${esc(err.message)}</p>`; }
        $('#genGo').disabled = false; $('#genGo').textContent = '⚡ Generar de nuevo';
      }, 30);
    });
    pintarCfg();
    if (params && params.get('esc')) $('#genGo').click();
  }

  window.Generador = { vista, generar, ESCENARIOS, PROBLEMAS, aCsv, aSql, aJsonl, readme, zip, deParams, aParams };
})();
