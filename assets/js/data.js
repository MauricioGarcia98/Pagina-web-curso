/*
 * Generador determinista del dataset "Tienda Andina".
 * Siempre produce exactamente los mismos datos (semilla fija), así los
 * ejercicios se pueden corregir comparando resultados.
 * Funciona en el navegador (window.DataGen) y en Node (module.exports).
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

  const NOMBRES = ['Sofía', 'Mateo', 'Valentina', 'Santiago', 'Isabella', 'Sebastián', 'Camila', 'Matías', 'Lucía', 'Nicolás',
    'Martina', 'Alejandro', 'Daniela', 'Diego', 'Gabriela', 'Samuel', 'Mariana', 'Benjamín', 'Victoria', 'Tomás',
    'Valeria', 'Lucas', 'Paula', 'Joaquín', 'Ana', 'Emiliano', 'Sara', 'Gabriel', 'Natalia', 'David',
    'Florencia', 'Andrés', 'Carolina', 'Felipe', 'Laura', 'Juan', 'María', 'Carlos', 'Elena', 'Javier',
    'Renata', 'Pablo', 'Antonella', 'Miguel', 'Julieta', 'Agustín', 'Ximena', 'Ricardo', 'Fernanda', 'Emilio'];
  const APELLIDOS = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín',
    'Díaz', 'Hernández', 'Álvarez', 'Torres', 'Ramírez', 'Flores', 'Romero', 'Vargas', 'Castro', 'Rojas',
    'Morales', 'Ortiz', 'Silva', 'Núñez', 'Mendoza', 'Herrera', 'Medina', 'Aguilar', 'Vega', 'Reyes',
    'Cruz', 'Ruiz', 'Navarro', 'Ramos', 'Guerrero', 'Molina', 'Suárez', 'Cabrera', 'Ríos', 'Peña'];
  const CIUDADES = [
    ['Buenos Aires', 'Argentina', 9], ['Córdoba', 'Argentina', 3], ['Rosario', 'Argentina', 2], ['Mendoza', 'Argentina', 2],
    ['Ciudad de México', 'México', 9], ['Guadalajara', 'México', 4], ['Monterrey', 'México', 4], ['Puebla', 'México', 2],
    ['Bogotá', 'Colombia', 7], ['Medellín', 'Colombia', 4], ['Cali', 'Colombia', 3],
    ['Santiago', 'Chile', 6], ['Valparaíso', 'Chile', 2],
    ['Lima', 'Perú', 6], ['Arequipa', 'Perú', 2],
    ['Madrid', 'España', 6], ['Barcelona', 'España', 5], ['Valencia', 'España', 2],
    ['Montevideo', 'Uruguay', 3], ['Quito', 'Ecuador', 3], ['Guayaquil', 'Ecuador', 2],
    ['Asunción', 'Paraguay', 2], ['La Paz', 'Bolivia', 2], ['San José', 'Costa Rica', 2]];
  const DOMINIOS = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'correo.com'];

  // [id, nombre, padre]
  const CATEGORIAS = [
    [1, 'Tecnología', null], [2, 'Hogar', null], [3, 'Deportes', null], [4, 'Moda', null],
    [5, 'Computadoras', 1], [6, 'Celulares', 1], [7, 'Audio', 1], [8, 'Laptops', 5], [9, 'Accesorios PC', 5],
    [10, 'Cocina', 2], [11, 'Muebles', 2], [12, 'Decoración', 2],
    [13, 'Fitness', 3], [14, 'Ciclismo', 3], [15, 'Ropa', 4], [16, 'Calzado', 4]];
  // categoria hoja -> [prefijos de nombre, marcas, precio min, precio max]
  const CAT_PRODUCTOS = {
    6: [['Smartphone', 'Celular', 'Teléfono'], ['Samsung', 'Motorola', 'Xiaomi', 'Apple'], 150, 1400],
    7: [['Auriculares', 'Parlante', 'Barra de sonido', 'Micrófono'], ['Sony', 'JBL', 'Bose', 'Xiaomi'], 20, 450],
    8: [['Laptop', 'Notebook', 'Ultrabook'], ['Lenovo', 'HP', 'Dell', 'Asus', 'Apple'], 450, 2600],
    9: [['Mouse', 'Teclado', 'Monitor', 'Webcam', 'Disco SSD'], ['Logitech', 'Kingston', 'Samsung', 'HP'], 10, 520],
    10: [['Licuadora', 'Sartén', 'Cafetera', 'Juego de ollas', 'Tostadora'], ['Oster', 'Tramontina', 'Philips', 'Moulinex'], 15, 320],
    11: [['Silla', 'Escritorio', 'Estantería', 'Sofá', 'Mesa'], ['Ikea', 'Muebles Sur', 'Madera Viva'], 40, 1200],
    12: [['Lámpara', 'Cuadro', 'Alfombra', 'Espejo', 'Florero'], ['Casa Bella', 'Deco Andina', 'Ikea'], 8, 260],
    13: [['Mancuernas', 'Colchoneta', 'Banda elástica', 'Bicicleta fija', 'Pesa rusa'], ['Everlast', 'Adidas', 'Reebok'], 8, 900],
    14: [['Bicicleta', 'Casco', 'Luz LED bici', 'Inflador', 'Candado'], ['Trek', 'Specialized', 'Shimano', 'Venzo'], 10, 2100],
    15: [['Remera', 'Campera', 'Pantalón', 'Buzo', 'Camisa'], ['Nike', 'Adidas', 'Zara', 'Levis', 'Puma'], 12, 220],
    16: [['Zapatillas', 'Botas', 'Sandalias', 'Zapatos'], ['Nike', 'Adidas', 'Puma', 'Topper'], 25, 260]};
  const ADJ = ['Pro', 'Max', 'Lite', 'Plus', 'Ultra', 'Classic', 'Eco', 'Sport', 'Mini', 'X', 'Air', 'Neo'];

  const DEPARTAMENTOS = [
    [1, 'Dirección', 'Buenos Aires', 900000], [2, 'Ventas', 'Ciudad de México', 2500000], [3, 'Marketing', 'Bogotá', 1200000],
    [4, 'Tecnología', 'Buenos Aires', 3000000], [5, 'Datos', 'Santiago', 1800000], [6, 'Logística', 'Lima', 1500000],
    [7, 'Finanzas', 'Madrid', 1100000], [8, 'Recursos Humanos', 'Montevideo', 700000], [9, 'Legal', 'Madrid', 400000]];

  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const fmtTs = (d) => `${fmtDate(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  const DAY = 86400000;
  const round2 = (x) => Math.round(x * 100) / 100;
  const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

  function build() {
    const rnd = mulberry32(20240607);
    const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const weighted = (arr, wIdx) => {
      const total = arr.reduce((s, x) => s + x[wIdx], 0);
      let r = rnd() * total;
      for (const x of arr) { r -= x[wIdx]; if (r <= 0) return x; }
      return arr[arr.length - 1];
    };
    const pickW = (pairs) => weighted(pairs, 1)[0];
    const T = {};

    // ---------- categorias ----------
    T.categorias = { columns: ['categoria_id', 'nombre', 'categoria_padre_id'], rows: CATEGORIAS.map((c) => c.slice()) };

    // ---------- departamentos ----------
    T.departamentos = { columns: ['departamento_id', 'nombre', 'ciudad', 'presupuesto'], rows: DEPARTAMENTOS.map((d) => d.slice()) };

    // ---------- empleados (jerarquía) ----------
    const emp = [];
    const usedEmails = new Set();
    const mkEmail = (n, a, dom) => {
      let base = `${sinAcentos(n)}.${sinAcentos(a)}`, e = `${base}@${dom}`, k = 1;
      while (usedEmails.has(e)) { k++; e = `${base}${k}@${dom}`; }
      usedEmails.add(e); return e;
    };
    const addEmp = (cargo, dep, jefe, salMin, salMax, desde) => {
      const id = emp.length + 1, n = pick(NOMBRES), a = pick(APELLIDOS);
      const contr = new Date(Date.UTC(desde, 0, 1) + int(0, (2024 - desde) * 360) * DAY);
      emp.push([id, n, a, mkEmail(n, a, 'tiendaandina.com'), cargo, dep, jefe, int(salMin, salMax) * 10, fmtDate(contr), null]);
      return id;
    };
    const ceo = addEmp('CEO', 1, null, 1400, 1600, 2015);
    const directores = {};
    for (const [depId, depNombre] of DEPARTAMENTOS.slice(1)) directores[depId] = addEmp(`Director de ${depNombre}`, depId, ceo, 800, 1100, 2015);
    const gerentes = {};
    for (const depId of Object.keys(directores).map(Number)) {
      const nG = depId === 2 ? 4 : depId === 4 ? 3 : depId === 9 ? 1 : 2;
      gerentes[depId] = [];
      for (let i = 0; i < nG; i++) gerentes[depId].push(addEmp('Gerente', depId, directores[depId], 500, 750, 2016));
    }
    const vendedores = [];
    const puestos = { 2: 'Vendedor', 3: 'Analista de Marketing', 4: 'Ingeniero de Software', 5: 'Ingeniero de Datos', 6: 'Operador Logístico', 7: 'Contador', 8: 'Analista de RRHH', 9: 'Abogado' };
    for (const depId of Object.keys(gerentes).map(Number)) {
      const nE = depId === 2 ? 40 : depId === 4 ? 18 : depId === 5 ? 12 : depId === 9 ? 2 : 6;
      for (let i = 0; i < nE; i++) {
        let cargo = puestos[depId];
        if (depId === 5 && i % 3 === 1) cargo = 'Analista de Datos';
        if (depId === 5 && i % 6 === 2) cargo = 'Científico de Datos';
        const id = addEmp(cargo, depId, pick(gerentes[depId]), depId === 2 ? 180 : 250, depId === 2 ? 380 : 520, 2017);
        if (depId === 2) vendedores.push(id);
      }
    }
    // algunos ya no trabajan
    for (const e of emp) if (e[0] > 20 && rnd() < 0.08) {
      const c = Date.parse(e[8] + 'T00:00:00Z');
      e[9] = fmtDate(new Date(Math.min(c + int(200, 1500) * DAY, Date.UTC(2024, 11, 20))));
    }
    T.empleados = { columns: ['empleado_id', 'nombre', 'apellido', 'email', 'cargo', 'departamento_id', 'jefe_id', 'salario', 'fecha_contratacion', 'fecha_salida'], rows: emp };

    // ---------- clientes ----------
    const clientes = [];
    const N_CLI = 2000;
    for (let id = 1; id <= N_CLI; id++) {
      const n = pick(NOMBRES), a = pick(APELLIDOS);
      const [ciudad, pais] = weighted(CIUDADES, 2);
      const reg = new Date(Date.UTC(2021, 0, 1) + int(0, 1400) * DAY);
      const nac = new Date(Date.UTC(1955, 0, 1) + int(0, 17500) * DAY);
      const email = rnd() < 0.04 ? null : mkEmail(n, a, pick(DOMINIOS));
      const tel = rnd() < 0.15 ? null : `+${int(10, 99)} ${int(100, 999)} ${int(1000, 9999)}`;
      const seg = pickW([['Consumidor', 70], ['Pyme', 20], ['Corporativo', 10]]);
      clientes.push([id, n, a, email, tel, ciudad, pais, seg, fmtDate(nac), fmtDate(reg)]);
    }
    T.clientes = { columns: ['cliente_id', 'nombre', 'apellido', 'email', 'telefono', 'ciudad', 'pais', 'segmento', 'fecha_nacimiento', 'fecha_registro'], rows: clientes };

    // ---------- productos ----------
    const productos = [];
    const hojas = Object.keys(CAT_PRODUCTOS).map(Number);
    const usados = new Set();
    for (let id = 1; id <= 300; id++) {
      const cat = hojas[(id - 1) % hojas.length];
      const [pref, marcas, pmin, pmax] = CAT_PRODUCTOS[cat];
      let nombre, marca;
      do { marca = pick(marcas); nombre = `${pick(pref)} ${marca} ${pick(ADJ)}${rnd() < 0.5 ? ' ' + int(2, 9) * 100 : ''}`; } while (usados.has(nombre));
      usados.add(nombre);
      const p = Math.floor(pmin + Math.pow(rnd(), 1.6) * (pmax - pmin)) + 0.99;
      const costo = round2(p * (0.45 + rnd() * 0.3));
      const lanz = new Date(Date.UTC(2019, 0, 1) + int(0, 2000) * DAY);
      productos.push([id, nombre, cat, marca, round2(p), costo, rnd() < 0.06 ? 0 : int(0, 500), rnd() < 0.08 ? 0 : 1, fmtDate(lanz)]);
    }
    T.productos = { columns: ['producto_id', 'nombre', 'categoria_id', 'marca', 'precio', 'costo', 'stock', 'activo', 'fecha_lanzamiento'], rows: productos };

    // popularidad de productos (algunos venden mucho más)
    const popularidad = productos.map(() => Math.pow(rnd(), 3) * 10 + 0.2);
    const popTotal = popularidad.reduce((a, b) => a + b, 0);
    const pickProducto = () => {
      let r = rnd() * popTotal;
      for (let i = 0; i < productos.length; i++) { r -= popularidad[i]; if (r <= 0) return productos[i]; }
      return productos[productos.length - 1];
    };
    // actividad de clientes (algunos compran mucho, ~12% nunca compra)
    const actividad = clientes.map(() => (rnd() < 0.12 ? 0 : Math.pow(rnd(), 2) * 10 + 0.3));
    const actTotal = actividad.reduce((a, b) => a + b, 0);
    const pickCliente = () => {
      let r = rnd() * actTotal;
      for (let i = 0; i < clientes.length; i++) { r -= actividad[i]; if (r <= 0) return clientes[i]; }
      return clientes[clientes.length - 1];
    };
    // clientes ordenados por fecha de registro con actividad acumulada: permite elegir
    // un cliente ya registrado en una fecha dada
    const porRegistro = clientes.map((c, i) => [Date.parse(c[9] + 'T00:00:00Z'), i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const acum = [];
    porRegistro.reduce((s, [, i]) => { s += actividad[i]; acum.push(s); return s; }, 0);
    const pickClienteHasta = (ms) => {
      let lo = 0, hi = porRegistro.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (porRegistro[mid][0] <= ms) lo = mid + 1; else hi = mid; }
      const r = rnd() * acum[lo - 1];
      let a = 0, b = lo - 1;
      while (a < b) { const mid = (a + b) >> 1; if (acum[mid] < r) a = mid + 1; else b = mid; }
      return clientes[porRegistro[a][1]];
    };

    // ---------- pedidos, detalle_pedidos, pagos ----------
    const pedidos = [], detalle = [], pagos = [];
    const N_PED = 12000;
    const ini = Date.UTC(2022, 0, 1), fin = Date.UTC(2024, 11, 31);
    let detId = 1, pagoId = 1;
    const fechasPedidos = [];
    for (let id = 1; id <= N_PED; id++) {
      // estacionalidad: más pedidos en noviembre/diciembre y julio, y crecimiento anual
      for (;;) {
        const f = new Date(ini + Math.floor(rnd() * ((fin - ini) / DAY + 1)) * DAY);
        const m = f.getUTCMonth(), y = f.getUTCFullYear();
        const w = (m === 10 || m === 11 ? 1.6 : m === 6 ? 1.25 : 1) * (y === 2022 ? 0.72 : y === 2023 ? 0.86 : 1);
        if (rnd() < w / 1.6) { fechasPedidos.push(f); break; }
      }
    }
    fechasPedidos.sort((a, b) => a - b);
    for (let id = 1; id <= N_PED; id++) {
      const fecha = fechasPedidos[id - 1];
      const cli = pickClienteHasta(fecha.getTime());
      const canal = pickW([['web', 45], ['app', 25], ['tienda', 22], ['telefono', 8]]);
      const vendedor = canal === 'tienda' || canal === 'telefono' ? pick(vendedores) : null;
      const estado = pickW([['entregado', 78], ['enviado', 6], ['pendiente', 4], ['cancelado', 8], ['devuelto', 4]]);
      const metodo = pickW([['tarjeta_credito', 45], ['tarjeta_debito', 25], ['transferencia', 15], ['efectivo', 10], ['billetera_virtual', 5]]);
      const fStr = fmtDate(fecha);
      pedidos.push([id, cli[0], vendedor, fStr, estado, canal, metodo]);
      const nItems = pickW([[1, 40], [2, 28], [3, 16], [4, 10], [5, 6]]);
      const usadosP = new Set();
      let total = 0;
      for (let k = 0; k < nItems; k++) {
        const p = pickProducto();
        if (usadosP.has(p[0])) continue;
        usadosP.add(p[0]);
        const cant = pickW([[1, 60], [2, 22], [3, 10], [4, 5], [5, 3]]);
        const desc = pickW([[0, 70], [0.05, 12], [0.1, 10], [0.15, 5], [0.2, 3]]);
        // el precio cambia levemente con los años
        const factor = fecha.getUTCFullYear() === 2022 ? 0.9 : fecha.getUTCFullYear() === 2023 ? 0.95 : 1;
        const pu = round2(p[4] * factor);
        detalle.push([detId++, id, p[0], cant, pu, desc]);
        total += cant * pu * (1 - desc);
      }
      if (estado !== 'cancelado') {
        if (rnd() < 0.03) {
          const f1 = new Date(fecha.getTime() + int(0, 1) * DAY);
          pagos.push([pagoId++, id, fmtDate(f1), round2(total), 'rechazado']);
        }
        const f2 = new Date(fecha.getTime() + int(0, 3) * DAY);
        if (!(estado === 'pendiente' && rnd() < 0.6)) pagos.push([pagoId++, id, fmtDate(f2), round2(total), 'aprobado']);
      }
    }
    T.pedidos = { columns: ['pedido_id', 'cliente_id', 'empleado_id', 'fecha_pedido', 'estado', 'canal', 'metodo_pago'], rows: pedidos };
    T.detalle_pedidos = { columns: ['detalle_id', 'pedido_id', 'producto_id', 'cantidad', 'precio_unitario', 'descuento'], rows: detalle };
    T.pagos = { columns: ['pago_id', 'pedido_id', 'fecha_pago', 'monto', 'estado'], rows: pagos };

    // ---------- eventos_web (sesiones de navegación) ----------
    const eventos = [];
    const paginas = ['inicio', 'categoria', 'producto', 'busqueda', 'carrito', 'checkout', 'confirmacion'];
    let evId = 1;
    for (let s = 0; s < 4200; s++) {
      const cli = rnd() < 0.15 ? null : pickCliente()[0];
      let t = Date.UTC(2024, 0, 1) + int(0, 365) * DAY + int(7 * 3600, 23 * 3600) * 1000;
      const disp = pickW([['movil', 60], ['escritorio', 33], ['tablet', 7]]);
      const n = int(1, 9);
      let etapa = 0;
      for (let k = 0; k < n; k++) {
        let pagina;
        if (k === 0) pagina = pick(['inicio', 'inicio', 'busqueda', 'categoria', 'producto']);
        else if (etapa >= 4 && rnd() < 0.55) pagina = paginas[Math.min(etapa + 1, 6)];
        else pagina = pick(['categoria', 'producto', 'producto', 'busqueda', 'carrito']);
        etapa = Math.max(etapa, paginas.indexOf(pagina));
        const tipo = pagina === 'carrito' ? 'agregar_carrito' : pagina === 'confirmacion' ? 'compra' : pagina === 'busqueda' ? 'busqueda' : 'vista';
        eventos.push([evId++, cli, fmtTs(new Date(t)), tipo, pagina, disp]);
        t += int(5, 600) * 1000;
        if (pagina === 'confirmacion') break;
      }
    }
    eventos.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[0] - b[0]));
    eventos.forEach((e, i) => { e[0] = i + 1; });
    T.eventos_web = { columns: ['evento_id', 'cliente_id', 'fecha_hora', 'tipo_evento', 'pagina', 'dispositivo'], rows: eventos };

    // ---------- logins (rachas de días: gaps & islands) ----------
    const logins = [];
    for (let c = 1; c <= 250; c++) {
      let d = Date.UTC(2024, 0, 1) + int(0, 40) * DAY;
      const limite = Date.UTC(2024, 5, 30);
      while (d <= limite) {
        const racha = pickW([[1, 30], [2, 20], [3, 15], [5, 12], [8, 8], [14, 4], [21, 2]]);
        for (let k = 0; k < racha && d <= limite; k++) { logins.push([c, fmtDate(new Date(d))]); d += DAY; }
        d += int(2, 12) * DAY;
      }
    }
    T.logins = { columns: ['cliente_id', 'fecha'], rows: logins };

    // ---------- clientes_crudo (datos sucios con duplicados) ----------
    const crudo = [];
    let rawId = 1;
    for (let i = 0; i < 260; i++) {
      const c = clientes[int(0, N_CLI - 1)];
      const copias = pickW([[1, 60], [2, 28], [3, 12]]);
      for (let k = 0; k < copias; k++) {
        let nombre = c[1], email = c[3], ciudad = c[5];
        if (k > 0 && rnd() < 0.5) nombre = nombre.toUpperCase();
        if (k > 0 && rnd() < 0.4) nombre = '  ' + nombre + ' ';
        if (k > 0 && email && rnd() < 0.4) email = email.toUpperCase();
        if (k > 0 && rnd() < 0.3) ciudad = ciudad.toLowerCase();
        const carga = new Date(Date.UTC(2024, 0, 1) + int(0, 300) * DAY + int(0, 86399) * 1000);
        crudo.push([rawId++, c[0], nombre, c[2], email, ciudad, fmtTs(carga)]);
      }
    }
    T.clientes_crudo = { columns: ['registro_id', 'cliente_id', 'nombre', 'apellido', 'email', 'ciudad', 'fecha_carga'], rows: crudo };

    // ---------- tipos de cambio diarios (para joins por fecha) ----------
    const tc = [];
    const monedas = [['ARS', 180, 1.0021], ['MXN', 20.5, 0.99995], ['COP', 4700, 0.9997], ['CLP', 850, 1.0001], ['EUR', 0.95, 0.99995]];
    for (const [mon, base, deriva] of monedas) {
      let v = base;
      for (let d = Date.UTC(2022, 0, 1); d <= Date.UTC(2024, 11, 31); d += DAY) {
        v = v * deriva * (1 + (rnd() - 0.5) * 0.01);
        const dow = new Date(d).getUTCDay();
        if (dow === 0 || dow === 6) continue; // no cotiza fines de semana
        tc.push([fmtDate(new Date(d)), mon, Math.round(v * 10000) / 10000]);
      }
    }
    T.tipos_cambio = { columns: ['fecha', 'moneda', 'valor_usd'], rows: tc };

    // ---------- experimento A/B del checkout (septiembre de 2024) ----------
    // Generador propio para no alterar el resto del dataset. El checkout nuevo mejora 2 puntos la
    // conversión en cada dispositivo, pero por un error de asignación recibió más tráfico móvil
    // (que convierte menos): en el total parece peor (paradoja de Simpson).
    const rab = mulberry32(20240901);
    const ab = [];
    for (const c of T.clientes.rows) {
      const grupo = rab() < 0.5 ? 'control' : 'nuevo_checkout';
      const movil = rab() < (grupo === 'control' ? 0.4 : 0.7);
      const base = movil ? 0.08 : 0.16;
      const p = base + (grupo === 'nuevo_checkout' ? 0.02 : 0);
      const conv = rab() < p ? 1 : 0;
      const dia = 1 + Math.floor(rab() * 30);
      const ingreso = conv ? Math.round((40 + rab() * 360) * 100) / 100 : 0;
      ab.push([c[0], grupo, `2024-09-${String(dia).padStart(2, '0')}`, movil ? 'movil' : 'escritorio', conv, ingreso]);
    }
    T.experimento_checkout = { columns: ['cliente_id', 'grupo', 'fecha_asignacion', 'dispositivo', 'convirtio', 'ingreso'], rows: ab };

    // ---------- capa bronze: así llegan los datos de verdad ----------
    // Generador propio (no altera el resto). Los pedidos del 2.º semestre de 2024 tal como los manda la
    // app en archivos: duplicados por reenvíos (con el estado actualizado), tres formatos de fecha,
    // montos como texto con coma decimal o símbolo, estados en dos idiomas y con mayúsculas, emails sucios,
    // pedidos de prueba de QA, clientes desconocidos y un cambio de esquema en julio (aparece "cupon")
    // y otro en octubre (aparece el estado "en_disputa").
    const rb = mulberry32(20241101);
    const pickB = (arr) => arr[Math.floor(rb() * arr.length)];
    const pad = (n) => String(n).padStart(2, '0');
    const emailDe = new Map(T.clientes.rows.map((c) => [c[0], c[3]]));
    const importe = new Map();
    for (const d of T.detalle_pedidos.rows) importe.set(d[1], (importe.get(d[1]) || 0) + d[3] * d[4] * (1 - d[5]));
    const ESTADO_VAR = { entregado: ['entregado', 'Entregado', 'ENTREGADO', 'delivered'], enviado: ['enviado', 'Enviado', 'shipped'], pendiente: ['pendiente', 'PENDIENTE', 'pending'], cancelado: ['cancelado', 'Cancelado', 'canceled'], devuelto: ['devuelto', 'DEVUELTO', 'returned'] };
    const bronze = [];
    let rid = 1;
    const sem2 = T.pedidos.rows.filter((r) => r[3] >= '2024-07-01' && r[3] < '2025-01-01');
    for (const r of sem2) {
      const [pid, cid, , fecha, estado, canal] = r;
      const d = new Date(fecha.replace(' ', 'T') + 'Z');
      const u = rb();
      const fTxt = u < 0.7 ? fecha : u < 0.85 ? `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : d.toISOString().replace(/\.\d+Z$/, 'Z');
      const m = Math.round((importe.get(pid) || 0) * 100) / 100;
      const v = rb();
      const mTxt = v < 0.03 ? null : v < 0.7 ? m.toFixed(2) : v < 0.85 ? m.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '$' + m.toFixed(2);
      let email = emailDe.get(cid) || null;
      if (email && rb() < 0.15) email = (rb() < 0.5 ? '  ' : '') + email.toUpperCase() + (rb() < 0.5 ? ' ' : '');
      if (rb() < 0.01) email = `desconocido${Math.floor(rb() * 900) + 100}@correo.com`;
      let est = pickB(ESTADO_VAR[estado] || [estado]);
      if (fecha >= '2024-10-01' && estado === 'entregado' && rb() < 0.04) est = 'en_disputa';
      const cupon = fecha >= '2024-07-15' && rb() < 0.25 ? pickB(['VERANO10', 'BLACK24', 'CYBER15', 'BIENVENIDA']) : null;
      const archivo = `pedidos_${fecha.slice(0, 10).replace(/-/g, '')}.json`;
      const carga = new Date(d.getTime() + 86400000 + Math.floor(rb() * 7200) * 1000).toISOString().slice(0, 19).replace('T', ' ');
      bronze.push([rid++, archivo, carga, pid, email, fTxt, mTxt, rb() < 0.9 ? 'USD' : pickB(['usd', ' USD']), est, canal, cupon]);
      // reenvío: el mismo pedido llega otra vez días después, a veces con el estado ya actualizado
      if (rb() < 0.04) {
        const carga2 = new Date(d.getTime() + (2 + Math.floor(rb() * 5)) * 86400000).toISOString().slice(0, 19).replace('T', ' ');
        const est2 = estado === 'enviado' ? 'entregado' : est;
        bronze.push([rid++, `pedidos_${carga2.slice(0, 10).replace(/-/g, '')}_reenvio.json`, carga2, pid, email, fTxt, mTxt, 'USD', est2, canal, cupon]);
      }
    }
    // pedidos de prueba del equipo de QA (nunca deberían llegar a producción, pero llegan)
    for (let k = 1; k <= 12; k++) bronze.push([rid++, 'pedidos_qa.json', `2024-${pad(7 + (k % 6))}-${pad(1 + k)} 10:00:00`, 900000 + k, `qa+${k}@tiendaandina.com`, `2024-${pad(7 + (k % 6))}-${pad(1 + k)} 09:30:00`, k % 2 ? '0.01' : '1.00', 'USD', 'entregado', 'web', null]);
    bronze.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[0] - b[0]));
    bronze.forEach((f, i) => { f[0] = i + 1; });
    T.bronze_pedidos = { columns: ['registro_id', 'archivo', 'cargado_en', 'pedido_id', 'cliente_email', 'fecha', 'monto', 'moneda', 'estado', 'canal', 'cupon'], rows: bronze };

    // eventos de la app como JSON crudo: en septiembre la app cambió el formato (v1 → v2) y algunos llegan cortados
    const ev = [];
    const prods = T.productos.rows;
    for (let i = 1; i <= 2500; i++) {
      const dia = Math.floor((i / 2500) * 184);
      const t = new Date(Date.UTC(2024, 6, 1) + dia * 86400000 + Math.floor(rb() * 86400) * 1000);
      const iso = t.toISOString().replace(/\.\d+Z$/, 'Z');
      const cli = T.clientes.rows[Math.floor(rb() * T.clientes.rows.length)][0];
      const pr = prods[Math.floor(rb() * prods.length)];
      const tipo = pickB(['vista', 'vista', 'vista', 'carrito', 'compra']);
      let payload = t < new Date(Date.UTC(2024, 8, 1))
        ? JSON.stringify({ v: 1, tipo, cliente: cli, producto: pr[0], ts: iso })
        : JSON.stringify({ v: 2, evento: { tipo, ts: iso }, usuario: { id: cli, logueado: rb() < 0.7 }, producto: { id: pr[0], precio: pr[4] } });
      if (rb() < 0.006) payload = payload.slice(0, Math.floor(payload.length / 2));
      ev.push([i, iso.replace('T', ' ').replace('Z', ''), payload]);
    }
    T.bronze_eventos_app = { columns: ['evento_id', 'recibido_en', 'payload'], rows: ev };

    return T;
  }

  const SCHEMA = `
CREATE TABLE categorias (categoria_id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, categoria_padre_id INTEGER REFERENCES categorias(categoria_id));
CREATE TABLE departamentos (departamento_id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, ciudad TEXT, presupuesto REAL);
CREATE TABLE empleados (empleado_id INTEGER PRIMARY KEY, nombre TEXT, apellido TEXT, email TEXT UNIQUE, cargo TEXT, departamento_id INTEGER REFERENCES departamentos(departamento_id), jefe_id INTEGER REFERENCES empleados(empleado_id), salario REAL, fecha_contratacion TEXT, fecha_salida TEXT);
CREATE TABLE clientes (cliente_id INTEGER PRIMARY KEY, nombre TEXT, apellido TEXT, email TEXT, telefono TEXT, ciudad TEXT, pais TEXT, segmento TEXT, fecha_nacimiento TEXT, fecha_registro TEXT);
CREATE TABLE productos (producto_id INTEGER PRIMARY KEY, nombre TEXT, categoria_id INTEGER REFERENCES categorias(categoria_id), marca TEXT, precio REAL, costo REAL, stock INTEGER, activo INTEGER, fecha_lanzamiento TEXT);
CREATE TABLE pedidos (pedido_id INTEGER PRIMARY KEY, cliente_id INTEGER REFERENCES clientes(cliente_id), empleado_id INTEGER REFERENCES empleados(empleado_id), fecha_pedido TEXT, estado TEXT, canal TEXT, metodo_pago TEXT);
CREATE TABLE detalle_pedidos (detalle_id INTEGER PRIMARY KEY, pedido_id INTEGER REFERENCES pedidos(pedido_id), producto_id INTEGER REFERENCES productos(producto_id), cantidad INTEGER, precio_unitario REAL, descuento REAL);
CREATE TABLE pagos (pago_id INTEGER PRIMARY KEY, pedido_id INTEGER REFERENCES pedidos(pedido_id), fecha_pago TEXT, monto REAL, estado TEXT);
CREATE TABLE eventos_web (evento_id INTEGER PRIMARY KEY, cliente_id INTEGER, fecha_hora TEXT, tipo_evento TEXT, pagina TEXT, dispositivo TEXT);
CREATE TABLE logins (cliente_id INTEGER, fecha TEXT);
CREATE TABLE clientes_crudo (registro_id INTEGER PRIMARY KEY, cliente_id INTEGER, nombre TEXT, apellido TEXT, email TEXT, ciudad TEXT, fecha_carga TEXT);
CREATE TABLE tipos_cambio (fecha TEXT, moneda TEXT, valor_usd REAL);
CREATE TABLE experimento_checkout (cliente_id INTEGER PRIMARY KEY REFERENCES clientes(cliente_id), grupo TEXT, fecha_asignacion TEXT, dispositivo TEXT, convirtio INTEGER, ingreso REAL);
CREATE TABLE bronze_pedidos (registro_id INTEGER PRIMARY KEY, archivo TEXT, cargado_en TEXT, pedido_id INTEGER, cliente_email TEXT, fecha TEXT, monto TEXT, moneda TEXT, estado TEXT, canal TEXT, cupon TEXT);
CREATE TABLE bronze_eventos_app (evento_id INTEGER PRIMARY KEY, recibido_en TEXT, payload TEXT);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_detalle_pedido ON detalle_pedidos(pedido_id);
CREATE INDEX idx_detalle_producto ON detalle_pedidos(producto_id);
CREATE INDEX idx_pagos_pedido ON pagos(pedido_id);
`;

  // Modelos "staging" estilo dbt, disponibles como vistas para el módulo de dbt.
  const VIEWS = `
CREATE VIEW stg_clientes AS SELECT cliente_id, nombre || ' ' || apellido AS nombre_completo, lower(email) AS email, ciudad, pais, segmento, date(fecha_registro) AS fecha_registro FROM clientes;
CREATE VIEW stg_productos AS SELECT producto_id, nombre AS producto, categoria_id, marca, precio, costo, activo = 1 AS esta_activo FROM productos;
CREATE VIEW stg_pedidos AS SELECT pedido_id, cliente_id, empleado_id, date(fecha_pedido) AS fecha_pedido, estado, canal, metodo_pago FROM pedidos;
CREATE VIEW stg_detalle_pedidos AS SELECT detalle_id, pedido_id, producto_id, cantidad, precio_unitario, descuento, round(cantidad * precio_unitario * (1 - descuento), 2) AS importe FROM detalle_pedidos;
CREATE VIEW stg_pagos AS SELECT pago_id, pedido_id, date(fecha_pago) AS fecha_pago, monto, estado FROM pagos;
`;

  const TABLE_INFO = {
    clientes: 'Clientes de la tienda (2.000). Algunos sin email o teléfono (NULL).',
    productos: 'Catálogo de 300 productos con precio, costo y stock.',
    categorias: 'Categorías con jerarquía (categoria_padre_id).',
    pedidos: '12.000 pedidos entre 2022 y 2024.',
    detalle_pedidos: 'Líneas de cada pedido: producto, cantidad, precio y descuento.',
    pagos: 'Pagos de los pedidos (aprobados y rechazados).',
    empleados: 'Empleados con su jefe (jefe_id) y departamento.',
    departamentos: 'Departamentos de la empresa.',
    eventos_web: 'Clics de navegación en la web durante 2024.',
    logins: 'Días en que los clientes iniciaron sesión (rachas).',
    clientes_crudo: 'Carga “sucia” de clientes con duplicados y formatos mezclados.',
    tipos_cambio: 'Cotización diaria de monedas vs USD (sin fines de semana).',
    experimento_checkout: 'Prueba A/B del checkout nuevo en septiembre de 2024: grupo, dispositivo y si compró.',
    bronze_pedidos: 'Capa bronze: los pedidos del 2.º semestre de 2024 tal como llegaron de la app (duplicados, fechas y montos como texto, estados mezclados, pruebas de QA).',
    bronze_eventos_app: 'Capa bronze: eventos de la app como JSON crudo; en septiembre cambió el formato (v1 → v2) y algunos llegaron cortados.'
  };

  // casos de negocio adicionales (data-casos.js)
  const casos = (typeof module !== 'undefined' && module.exports) ? require('./data-casos.js') : root.DataCasos;
  // tablas adicionales de las 13 empresas (data-extra.js): se generan al final y no alteran las anteriores
  const extra = (typeof module !== 'undefined' && module.exports) ? require('./data-extra.js') : root.DataExtra;
  const buildAll = () => {
    const T = build();
    if (casos) Object.assign(T, casos.build());
    if (extra) Object.assign(T, extra.build(T));
    return T;
  };
  const api = {
    build: buildAll,
    SCHEMA: SCHEMA + (casos ? casos.SCHEMA : '') + (extra ? extra.SCHEMA : ''),
    VIEWS,
    TABLE_INFO: Object.assign({}, TABLE_INFO, casos ? casos.TABLE_INFO : {}, extra ? extra.TABLE_INFO : {}),
    CASOS: casos ? casos.CASOS : [],
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DataGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
