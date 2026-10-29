/*
 * Laboratorio de modelado de datos: el requerimiento de un negocio, un editor de texto para
 * escribir el modelo (tablas, columnas, claves y relaciones), el diagrama en vivo, una revisión
 * automática (reglas de diseño + lo que pide el requerimiento) y el DDL para cada motor.
 *
 * Sintaxis del modelo:
 *   Table pedidos {
 *     pedido_id int pk
 *     cliente_id int > clientes.cliente_id
 *     fecha date
 *     total decimal null
 *   }
 */
(function () {
  'use strict';

  const TIPOS = ['int', 'bigint', 'text', 'varchar', 'date', 'timestamp', 'decimal', 'float', 'bool'];

  // ============================================================== ejercicios

  const EJERCICIOS = [
    {
      id: 'biblioteca', titulo: 'Biblioteca del barrio', nivel: 'Básico',
      contexto: 'Una biblioteca anota los préstamos en un cuaderno y quiere pasarlos a una base de datos.',
      requisitos: ['Se registran los <b>libros</b> (título, autor, año) y los <b>socios</b> (nombre, email, fecha de alta).', 'Un socio se lleva un libro en un <b>préstamo</b>: hay que saber qué socio, qué libro, cuándo se lo llevó y cuándo lo devolvió.', 'Un libro se presta muchas veces a lo largo del tiempo y un socio puede tener varios préstamos.', 'Mientras no se devuelve, la fecha de devolución queda vacía.'],
      inicial: 'Table libros {\n  libro_id int pk\n  titulo text\n}\n',
      solucion: 'Table libros {\n  libro_id int pk\n  titulo text\n  autor text\n  anio int\n}\n\nTable socios {\n  socio_id int pk\n  nombre text\n  email text unique\n  fecha_alta date\n}\n\nTable prestamos {\n  prestamo_id int pk\n  socio_id int > socios.socio_id\n  libro_id int > libros.libro_id\n  fecha_prestamo date\n  fecha_devolucion date null\n}\n',
      checks: [
        { tipo: 'tabla', nombres: ['libros', 'libro'], msg: 'Hay una tabla de libros' },
        { tipo: 'tabla', nombres: ['socios', 'socio', 'miembros', 'usuarios'], msg: 'Hay una tabla de socios' },
        { tipo: 'puente', entre: [['socios', 'socio', 'miembros', 'usuarios'], ['libros', 'libro']], msg: 'Los préstamos son una tabla que une socio y libro (un libro tiene muchos préstamos)' },
        { tipo: 'col', tablaCon: [['socios', 'socio', 'miembros', 'usuarios'], ['libros', 'libro']], cols: [/devol/], msg: 'El préstamo guarda la fecha de devolución' },
      ],
      explicacion: 'El préstamo es un <b>hecho</b> que ocurre entre un socio y un libro, así que es su propia tabla con dos claves foráneas. Si pusieras <code>socio_id</code> dentro de <code>libros</code>, un libro solo podría tener un préstamo en toda su vida. La devolución nula marca los préstamos abiertos.',
    },
    {
      id: 'cursos', titulo: 'Plataforma de cursos online', nivel: 'Básico',
      contexto: 'Una academia online necesita saber quién está inscripto en qué curso.',
      requisitos: ['Hay <b>alumnos</b>, <b>cursos</b> y <b>profesores</b>.', 'Cada curso lo dicta <b>un</b> profesor; un profesor dicta varios cursos.', 'Un alumno se inscribe en <b>muchos</b> cursos y un curso tiene <b>muchos</b> alumnos.', 'De cada inscripción interesa la fecha y la nota final (que se carga al terminar).'],
      inicial: '',
      solucion: 'Table profesores {\n  profesor_id int pk\n  nombre text\n}\n\nTable cursos {\n  curso_id int pk\n  titulo text\n  profesor_id int > profesores.profesor_id\n}\n\nTable alumnos {\n  alumno_id int pk\n  nombre text\n  email text unique\n}\n\nTable inscripciones {\n  alumno_id int pk > alumnos.alumno_id\n  curso_id int pk > cursos.curso_id\n  fecha date\n  nota decimal null\n}\n',
      checks: [
        { tipo: 'rel', de: ['cursos', 'curso'], a: ['profesores', 'profesor', 'docentes'], msg: 'Cada curso apunta a su profesor (relación 1 a N)' },
        { tipo: 'puente', entre: [['alumnos', 'alumno', 'estudiantes'], ['cursos', 'curso']], msg: 'Una tabla puente resuelve el muchos a muchos entre alumnos y cursos' },
        { tipo: 'col', tablaCon: [['alumnos', 'alumno', 'estudiantes'], ['cursos', 'curso']], cols: [/nota|calif/], msg: 'La nota está en la inscripción, no en el alumno ni en el curso' },
      ],
      explicacion: 'Una relación <b>muchos a muchos</b> no se puede guardar con una columna: necesita una <b>tabla puente</b> (<code>inscripciones</code>) con una fila por alumno y curso. La nota pertenece a esa combinación: el mismo alumno tiene notas distintas en cada curso. La clave primaria compuesta (alumno + curso) impide inscribir dos veces al mismo alumno.',
    },
    {
      id: 'restaurante', titulo: 'Pedidos de un restaurante', nivel: 'Intermedio',
      contexto: 'Un restaurante toma pedidos por teléfono y quiere analizar qué platos vende.',
      requisitos: ['Hay <b>clientes</b> (nombre, teléfono, dirección) y un menú de <b>platos</b> con su precio actual.', 'Un <b>pedido</b> es de un cliente, en una fecha, y tiene <b>varios platos</b> con su cantidad.', 'Los precios del menú cambian, pero las ventas pasadas tienen que conservar el precio que se cobró.', 'Interesa saber si el pedido fue para retirar o con envío.'],
      inicial: '',
      solucion: 'Table clientes {\n  cliente_id int pk\n  nombre text\n  telefono text\n  direccion text\n}\n\nTable platos {\n  plato_id int pk\n  nombre text\n  precio_actual decimal\n}\n\nTable pedidos {\n  pedido_id int pk\n  cliente_id int > clientes.cliente_id\n  fecha timestamp\n  modalidad text\n}\n\nTable detalle_pedido {\n  pedido_id int pk > pedidos.pedido_id\n  plato_id int pk > platos.plato_id\n  cantidad int\n  precio_unitario decimal\n}\n',
      checks: [
        { tipo: 'rel', de: ['pedidos', 'pedido', 'ordenes'], a: ['clientes', 'cliente'], msg: 'El pedido apunta al cliente' },
        { tipo: 'puente', entre: [['pedidos', 'pedido', 'ordenes'], ['platos', 'plato', 'productos', 'menu']], msg: 'Un detalle de pedido (cabecera / detalle) une pedidos y platos' },
        { tipo: 'col', tablaCon: [['pedidos', 'pedido', 'ordenes'], ['platos', 'plato', 'productos', 'menu']], cols: [/precio/], msg: 'El detalle guarda el precio cobrado (dato histórico)' },
        { tipo: 'col', tablaCon: [['pedidos', 'pedido', 'ordenes'], ['platos', 'plato', 'productos', 'menu']], cols: [/cantidad/], msg: 'El detalle guarda la cantidad' },
      ],
      explicacion: 'Es el patrón <b>cabecera / detalle</b>: lo que es del pedido (cliente, fecha, modalidad) va una vez en <code>pedidos</code>, y cada plato pedido es una fila del detalle. El precio se copia al detalle porque es un dato distinto del precio actual: sin él, subir un precio cambiaría la facturación del pasado.',
    },
    {
      id: 'gimnasio', titulo: 'Gimnasio con planes que cambian', nivel: 'Intermedio',
      contexto: 'Un gimnasio quiere medir cuántos socios tiene cada plan, mes a mes, y cuánto vienen a entrenar.',
      requisitos: ['Hay <b>socios</b> y <b>planes</b> (mensual, trimestral, anual, con su precio).', 'Un socio cambia de plan con el tiempo: hay que poder saber <b>qué plan tenía en cualquier fecha</b>.', 'Cada vez que un socio entra al gimnasio se registra una <b>asistencia</b> con fecha y hora.', 'El precio pagado puede ser distinto del precio de lista (promociones).'],
      inicial: '',
      solucion: 'Table socios {\n  socio_id int pk\n  nombre text\n  fecha_alta date\n}\n\nTable planes {\n  plan_id int pk\n  nombre text\n  precio_lista decimal\n}\n\nTable membresias {\n  membresia_id int pk\n  socio_id int > socios.socio_id\n  plan_id int > planes.plan_id\n  fecha_inicio date\n  fecha_fin date null\n  precio_pagado decimal\n}\n\nTable asistencias {\n  asistencia_id int pk\n  socio_id int > socios.socio_id\n  fecha_hora timestamp\n}\n',
      checks: [
        { tipo: 'puente', entre: [['socios', 'socio', 'clientes'], ['planes', 'plan']], msg: 'Una tabla de membresías guarda el historial socio-plan' },
        { tipo: 'col', tablaCon: [['socios', 'socio', 'clientes'], ['planes', 'plan']], cols: [/inicio|desde/, /fin|hasta/], msg: 'Cada membresía tiene fecha de inicio y de fin (vigencia)' },
        { tipo: 'rel', de: ['asistencias', 'asistencia', 'ingresos', 'visitas'], a: ['socios', 'socio', 'clientes'], msg: 'Las asistencias apuntan al socio' },
        { tipo: 'sinCol', tabla: ['socios', 'socio', 'clientes'], cols: [/^plan_id$/], msg: 'El plan no está como columna del socio (perderías el historial)' },
      ],
      explicacion: 'Si el plan fuera una columna de <code>socios</code>, al cambiarlo perderías el anterior. Una tabla con <b>vigencia</b> (<code>fecha_inicio</code>, <code>fecha_fin</code>) conserva el historial: el plan de un día cualquiera es la fila cuya vigencia lo contiene. Es la misma idea que una dimensión SCD tipo 2.',
    },
    {
      id: 'red_social', titulo: 'Red social: seguidores y me gusta', nivel: 'Intermedio',
      contexto: 'Una red social pequeña necesita su base para el lanzamiento.',
      requisitos: ['Hay <b>usuarios</b> que escriben <b>publicaciones</b>.', 'Un usuario <b>sigue</b> a otros usuarios (y lo siguen muchos).', 'Un usuario da <b>me gusta</b> a muchas publicaciones, una sola vez por publicación.', 'Interesa saber desde cuándo un usuario sigue a otro.'],
      inicial: '',
      solucion: 'Table usuarios {\n  usuario_id int pk\n  nombre_usuario text unique\n  fecha_registro date\n}\n\nTable publicaciones {\n  publicacion_id int pk\n  usuario_id int > usuarios.usuario_id\n  texto text\n  fecha timestamp\n}\n\nTable seguidores {\n  seguidor_id int pk > usuarios.usuario_id\n  seguido_id int pk > usuarios.usuario_id\n  desde timestamp\n}\n\nTable me_gusta {\n  usuario_id int pk > usuarios.usuario_id\n  publicacion_id int pk > publicaciones.publicacion_id\n  fecha timestamp\n}\n',
      checks: [
        { tipo: 'rel', de: ['publicaciones', 'publicacion', 'posts'], a: ['usuarios', 'usuario'], msg: 'Cada publicación apunta a su autor' },
        { tipo: 'dosRel', de: null, a: ['usuarios', 'usuario'], msg: 'Una tabla de seguidores con dos claves foráneas a usuarios (relación de usuarios consigo mismos)' },
        { tipo: 'puente', entre: [['usuarios', 'usuario'], ['publicaciones', 'publicacion', 'posts']], msg: 'Los me gusta son una tabla puente entre usuarios y publicaciones' },
        { tipo: 'pkCompuesta', tablaCon: [['usuarios', 'usuario'], ['publicaciones', 'publicacion', 'posts']], msg: 'La clave de los me gusta es usuario + publicación (impide dar dos veces me gusta)' },
      ],
      explicacion: 'Seguir es un muchos a muchos de <b>usuarios consigo mismos</b>: una tabla con dos claves foráneas a la misma tabla (<code>seguidor_id</code> y <code>seguido_id</code>). Para “una sola vez por publicación”, la clave primaria compuesta (usuario + publicación) lo garantiza la base, no la aplicación.',
    },
    {
      id: 'autos', titulo: 'Alquiler de autos con varias sucursales', nivel: 'Avanzado',
      contexto: 'Una empresa alquila autos en cinco ciudades: se puede retirar en una sucursal y devolver en otra.',
      requisitos: ['Hay <b>sucursales</b>, <b>autos</b> (patente, modelo, sucursal donde está hoy) y <b>clientes</b>.', 'Un <b>alquiler</b> registra cliente, auto, sucursal de retiro, sucursal de devolución, fechas y kilómetros.', 'Un alquiler puede tener <b>varios pagos</b> (seña, saldo, multas).', 'La patente identifica al auto y nunca cambia.'],
      inicial: '',
      solucion: 'Table sucursales {\n  sucursal_id int pk\n  ciudad text\n}\n\nTable autos {\n  patente varchar pk\n  modelo text\n  sucursal_id int > sucursales.sucursal_id\n}\n\nTable clientes {\n  cliente_id int pk\n  nombre text\n  licencia text unique\n}\n\nTable alquileres {\n  alquiler_id int pk\n  cliente_id int > clientes.cliente_id\n  patente varchar > autos.patente\n  sucursal_retiro_id int > sucursales.sucursal_id\n  sucursal_devolucion_id int null > sucursales.sucursal_id\n  fecha_retiro timestamp\n  fecha_devolucion timestamp null\n  km_retiro int\n  km_devolucion int null\n}\n\nTable pagos {\n  pago_id int pk\n  alquiler_id int > alquileres.alquiler_id\n  concepto text\n  monto decimal\n  fecha date\n}\n',
      checks: [
        { tipo: 'dosRel', de: ['alquileres', 'alquiler', 'reservas'], a: ['sucursales', 'sucursal'], msg: 'El alquiler tiene dos claves foráneas a sucursales (retiro y devolución)' },
        { tipo: 'rel', de: ['alquileres', 'alquiler', 'reservas'], a: ['autos', 'auto', 'vehiculos'], msg: 'El alquiler apunta al auto' },
        { tipo: 'rel', de: ['pagos', 'pago'], a: ['alquileres', 'alquiler', 'reservas'], msg: 'Los pagos son una tabla aparte que apunta al alquiler (1 a N)' },
        { tipo: 'pkCol', tabla: ['autos', 'auto', 'vehiculos'], cols: [/patente/], msg: 'La patente es la clave del auto (clave natural estable)' },
      ],
      explicacion: 'La misma tabla (<code>sucursales</code>) cumple <b>dos roles</b> en el alquiler: dos claves foráneas con nombres que dicen el rol. Los pagos van aparte porque son varios por alquiler. La patente es una buena <b>clave natural</b> porque es única y no cambia; si pudiera cambiar, convendría un id artificial.',
    },
    {
      id: 'proyectos', titulo: 'Organigrama y proyectos', nivel: 'Avanzado',
      contexto: 'Recursos humanos quiere saber quién trabaja en qué proyecto, cuántas horas y quién reporta a quién.',
      requisitos: ['Cada <b>empleado</b> pertenece a un <b>departamento</b> y tiene un <b>jefe</b>, que también es empleado (salvo el director).', 'Hay <b>proyectos</b> con fecha de inicio y presupuesto.', 'Un empleado participa en varios proyectos con un <b>rol</b> y una cantidad de horas semanales; un proyecto tiene varios empleados.'],
      inicial: '',
      solucion: 'Table departamentos {\n  departamento_id int pk\n  nombre text\n}\n\nTable empleados {\n  empleado_id int pk\n  nombre text\n  departamento_id int > departamentos.departamento_id\n  jefe_id int null > empleados.empleado_id\n}\n\nTable proyectos {\n  proyecto_id int pk\n  nombre text\n  fecha_inicio date\n  presupuesto decimal\n}\n\nTable asignaciones {\n  empleado_id int pk > empleados.empleado_id\n  proyecto_id int pk > proyectos.proyecto_id\n  rol text\n  horas_semana int\n}\n',
      checks: [
        { tipo: 'autoRel', tabla: ['empleados', 'empleado'], msg: 'El jefe es una clave foránea de empleados a empleados (auto-relación)' },
        { tipo: 'rel', de: ['empleados', 'empleado'], a: ['departamentos', 'departamento', 'areas'], msg: 'El empleado apunta a su departamento' },
        { tipo: 'puente', entre: [['empleados', 'empleado'], ['proyectos', 'proyecto']], msg: 'Una tabla de asignaciones resuelve el muchos a muchos' },
        { tipo: 'col', tablaCon: [['empleados', 'empleado'], ['proyectos', 'proyecto']], cols: [/rol/, /hora/], msg: 'El rol y las horas están en la asignación' },
      ],
      explicacion: 'El organigrama es una <b>auto-relación</b>: <code>jefe_id</code> apunta a la misma tabla y es nulo para el director. Se recorre con una CTE recursiva. El rol y las horas no son del empleado ni del proyecto sino de la combinación, por eso viven en la tabla puente.',
    },
    {
      id: 'estrella', titulo: 'Modelo estrella para ventas', nivel: 'Avanzado',
      contexto: 'El área comercial quiere un tablero de ventas por día, producto, cliente y tienda. Te piden el modelo dimensional.',
      requisitos: ['El tablero suma <b>unidades</b> e <b>importe</b> vendido.', 'Filtra y agrupa por <b>fecha</b> (día, mes, año, día de la semana), <b>producto</b> (marca, categoría), <b>cliente</b> (segmento, país) y <b>tienda</b> (ciudad, región).', 'El grano es <b>una línea de ticket</b>: un producto dentro de una venta.', 'Usa el prefijo <code>fact_</code> para la tabla de hechos y <code>dim_</code> para las dimensiones.'],
      inicial: 'Table fact_ventas {\n  venta_linea_id int pk\n}\n',
      solucion: 'Table dim_fecha {\n  fecha_key int pk\n  fecha date\n  dia_semana text\n  mes int\n  anio int\n}\n\nTable dim_producto {\n  producto_key int pk\n  producto_id int\n  nombre text\n  marca text\n  categoria text\n}\n\nTable dim_cliente {\n  cliente_key int pk\n  cliente_id int\n  segmento text\n  pais text\n}\n\nTable dim_tienda {\n  tienda_key int pk\n  ciudad text\n  region text\n}\n\nTable fact_ventas {\n  venta_linea_id int pk\n  fecha_key int > dim_fecha.fecha_key\n  producto_key int > dim_producto.producto_key\n  cliente_key int > dim_cliente.cliente_key\n  tienda_key int > dim_tienda.tienda_key\n  ticket_id int\n  unidades int\n  importe decimal\n}\n',
      checks: [
        { tipo: 'rel', de: ['fact_ventas'], a: ['dim_fecha'], msg: 'La tabla de hechos apunta a dim_fecha' },
        { tipo: 'rel', de: ['fact_ventas'], a: ['dim_producto'], msg: 'La tabla de hechos apunta a dim_producto' },
        { tipo: 'rel', de: ['fact_ventas'], a: ['dim_cliente'], msg: 'La tabla de hechos apunta a dim_cliente' },
        { tipo: 'rel', de: ['fact_ventas'], a: ['dim_tienda'], msg: 'La tabla de hechos apunta a dim_tienda' },
        { tipo: 'col', tablaCon: null, tabla: ['fact_ventas'], cols: [/unidad|cantidad/, /importe|monto|total/], msg: 'Las medidas (unidades e importe) están en la tabla de hechos' },
        { tipo: 'sinRelEntre', prefijo: 'dim_', msg: 'Las dimensiones no se apuntan entre sí (estrella, no copo de nieve)' },
      ],
      explicacion: 'En una estrella, la tabla de hechos tiene las <b>medidas</b> numéricas y una clave por cada dimensión; las dimensiones tienen los <b>atributos</b> descriptivos ya aplanados (la categoría va dentro de <code>dim_producto</code>, sin otra tabla). Así cualquier tablero es un JOIN de un solo salto y un GROUP BY.',
    },
  ];

  // ============================================================== parser

  function parsear(texto) {
    const tablas = [], errores = [];
    let actual = null;
    texto.split('\n').forEach((linea, i) => {
      const l = linea.replace(/\/\/.*$|--.*$/, '').trim();
      const n = i + 1;
      if (!l) return;
      let m;
      if ((m = l.match(/^table\s+(\w+)\s*\{?$/i))) { if (actual) errores.push({ n, msg: `Falta cerrar con } la tabla ${actual.nombre} antes de abrir otra.` }); actual = { nombre: m[1], cols: [], n }; tablas.push(actual); return; }
      if (l === '{') return;
      if (l === '}') { if (!actual) errores.push({ n, msg: 'Hay un } de más.' }); actual = null; return; }
      if ((m = l.match(/^ref\s*:?\s*(\w+)\.(\w+)\s*>\s*(\w+)\.(\w+)$/i))) {
        const t = tablas.find((x) => x.nombre === m[1]); const c = t && t.cols.find((x) => x.n === m[2]);
        if (c) c.ref = { tabla: m[3], col: m[4] }; else errores.push({ n, msg: `Ref: no encuentro la columna ${m[1]}.${m[2]}.` });
        return;
      }
      if (!actual) { errores.push({ n, msg: 'Esta línea está fuera de una tabla. Empieza con: Table nombre {' }); return; }
      const ref = l.match(/>\s*(\w+)\.(\w+)\s*$/);
      const partes = l.replace(/>\s*\w+\.\w+\s*$/, '').trim().split(/\s+/);
      const [nombre, tipoRaw, ...mods] = partes;
      if (!/^\w+$/.test(nombre || '')) { errores.push({ n, msg: `No entiendo la columna “${l}”. Formato: nombre tipo [pk] [unique] [null] [> tabla.columna]` }); return; }
      const tipo = (tipoRaw || '').toLowerCase().replace(/\(.*\)$/, '');
      if (!tipo) errores.push({ n, msg: `A la columna ${nombre} le falta el tipo (${TIPOS.join(', ')}).` });
      else if (!TIPOS.includes(tipo)) errores.push({ n, msg: `Tipo “${tipoRaw}” desconocido en ${nombre}. Usa: ${TIPOS.join(', ')}.`, aviso: true });
      const ml = mods.map((x) => x.toLowerCase());
      const desconocidos = ml.filter((x) => !['pk', 'unique', 'null', 'not', 'notnull'].includes(x));
      if (desconocidos.length) errores.push({ n, msg: `No entiendo “${desconocidos.join(' ')}” en ${nombre}. Modificadores: pk, unique, null, > tabla.columna.` });
      actual.cols.push({ n: nombre, t: tipo, pk: ml.includes('pk'), unique: ml.includes('unique'), nulo: ml.includes('null') && !ml.includes('not'), ref: ref ? { tabla: ref[1], col: ref[2] } : null, linea: n });
    });
    if (actual) errores.push({ n: actual.n, msg: `Falta cerrar con } la tabla ${actual.nombre}.` });
    return { tablas, errores };
  }

  // ============================================================== revisión

  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const singular = (s) => norm(s).replace(/(es|s)$/, '');
  const coincide = (nombre, alias) => alias.some((a) => norm(nombre) === norm(a) || singular(nombre) === singular(a));
  const buscar = (modelo, alias) => modelo.tablas.filter((t) => coincide(t.nombre, alias));
  const fksDe = (t) => t.cols.filter((c) => c.ref);

  function revisarReglas(modelo) {
    const out = [];
    const porNombre = Object.fromEntries(modelo.tablas.map((t) => [t.nombre, t]));
    const vistos = new Set();
    for (const t of modelo.tablas) {
      if (vistos.has(t.nombre)) out.push({ nivel: 'error', msg: `La tabla <code>${t.nombre}</code> está definida dos veces.` });
      vistos.add(t.nombre);
      if (!t.cols.some((c) => c.pk)) out.push({ nivel: 'error', msg: `<code>${t.nombre}</code> no tiene clave primaria (marca una o más columnas con <code>pk</code>). Sin ella no se puede identificar cada fila ni evitar duplicados.` });
      const nombres = t.cols.map((c) => c.n);
      nombres.filter((x, i) => nombres.indexOf(x) !== i).forEach((x) => out.push({ nivel: 'error', msg: `La columna <code>${x}</code> está repetida en <code>${t.nombre}</code>.` }));
      // grupos repetidos: telefono1, telefono2…
      const grupos = {};
      for (const c of t.cols) { const m = c.n.match(/^(.*?)_?(\d+)$/); if (m) (grupos[m[1]] = grupos[m[1]] || []).push(c.n); }
      for (const [base, cs] of Object.entries(grupos)) if (cs.length > 1) out.push({ nivel: 'aviso', msg: `<code>${cs.join(', ')}</code> en <code>${t.nombre}</code> es un <b>grupo repetido</b> (viola la primera forma normal). Pasa <code>${base}</code> a una tabla aparte con una fila por valor.` });
      for (const c of t.cols) {
        if (/^(lista_|ids_|tags$|etiquetas$)|_ids$/.test(c.n)) out.push({ nivel: 'aviso', msg: `<code>${t.nombre}.${c.n}</code> parece guardar <b>varios valores en una columna</b>. Cada valor debería ser una fila de otra tabla.` });
        if (!c.ref) continue;
        const destino = porNombre[c.ref.tabla];
        if (!destino) { out.push({ nivel: 'error', msg: `<code>${t.nombre}.${c.n}</code> apunta a la tabla <code>${c.ref.tabla}</code>, que no existe.` }); continue; }
        const cd = destino.cols.find((x) => x.n === c.ref.col);
        if (!cd) { out.push({ nivel: 'error', msg: `<code>${t.nombre}.${c.n}</code> apunta a <code>${c.ref.tabla}.${c.ref.col}</code>, que no existe.` }); continue; }
        if (!cd.pk && !cd.unique) out.push({ nivel: 'aviso', msg: `<code>${t.nombre}.${c.n}</code> apunta a <code>${c.ref.tabla}.${c.ref.col}</code>, que no es clave primaria ni única. Una clave foránea debe apuntar a algo que identifique una sola fila.` });
        if (cd.t && c.t && cd.t !== c.t && !(['int', 'bigint'].includes(cd.t) && ['int', 'bigint'].includes(c.t)) && !(['text', 'varchar'].includes(cd.t) && ['text', 'varchar'].includes(c.t))) out.push({ nivel: 'aviso', msg: `<code>${t.nombre}.${c.n}</code> es <code>${c.t}</code> pero apunta a una columna <code>${cd.t}</code>: los tipos deberían coincidir.` });
      }
      // redundancia: columnas que copian atributos de una tabla a la que ya apunta
      for (const fk of fksDe(t)) {
        const destino = porNombre[fk.ref.tabla]; if (!destino || destino === t) continue;
        const sing = singular(destino.nombre);
        for (const c of t.cols) {
          if (c.ref || c.pk) continue;
          const m = norm(c.n).match(new RegExp(`^(.+)_${sing}e?s?$|^${sing}e?s?_(.+)$`));
          const attr = m && (m[1] || m[2]);
          if (attr && destino.cols.some((x) => norm(x.n) === attr)) out.push({ nivel: 'aviso', msg: `<code>${t.nombre}.${c.n}</code> repite <code>${destino.nombre}.${attr}</code>, que ya se obtiene con un JOIN por <code>${fk.n}</code> (redundancia: viola la tercera forma normal). Si es un dato histórico a propósito, como un precio al momento de la venta, está bien.` });
        }
      }
    }
    if (!modelo.tablas.length) out.push({ nivel: 'info', msg: 'Todavía no hay tablas. Empieza con <code>Table nombre {</code>.' });
    return out;
  }

  function revisarRequisitos(modelo, ej) {
    return ej.checks.map((ch) => {
      let ok = false;
      const ts = (alias) => buscar(modelo, alias);
      const apunta = (t, destinos) => fksDe(t).some((c) => destinos.some((d) => d.nombre === c.ref.tabla));
      const puentes = (A, B) => modelo.tablas.filter((t) => apunta(t, ts(A)) && apunta(t, ts(B)) && !coincide(t.nombre, A) && !coincide(t.nombre, B));
      switch (ch.tipo) {
        case 'tabla': ok = ts(ch.nombres).length > 0; break;
        case 'rel': ok = ts(ch.de).some((t) => apunta(t, ts(ch.a))); break;
        case 'puente': ok = puentes(ch.entre[0], ch.entre[1]).length > 0; break;
        case 'col': {
          const cand = ch.tablaCon ? puentes(ch.tablaCon[0], ch.tablaCon[1]) : ts(ch.tabla);
          ok = cand.some((t) => ch.cols.every((re) => t.cols.some((c) => re.test(norm(c.n)))));
          break;
        }
        case 'sinCol': ok = ts(ch.tabla).length > 0 && ts(ch.tabla).every((t) => !t.cols.some((c) => ch.cols.some((re) => re.test(norm(c.n))))); break;
        case 'dosRel': {
          const destinos = ts(ch.a);
          const cand = ch.de ? ts(ch.de) : modelo.tablas;
          ok = cand.some((t) => fksDe(t).filter((c) => destinos.some((d) => d.nombre === c.ref.tabla)).length >= 2);
          break;
        }
        case 'autoRel': ok = ts(ch.tabla).some((t) => fksDe(t).some((c) => c.ref.tabla === t.nombre)); break;
        case 'pkCompuesta': ok = puentes(ch.tablaCon[0], ch.tablaCon[1]).some((t) => t.cols.filter((c) => c.pk).length >= 2 || t.cols.some((c) => c.unique)); break;
        case 'pkCol': ok = ts(ch.tabla).some((t) => t.cols.some((c) => c.pk && ch.cols.some((re) => re.test(norm(c.n))))); break;
        case 'sinRelEntre': ok = modelo.tablas.some((t) => t.nombre.startsWith(ch.prefijo)) && modelo.tablas.filter((t) => t.nombre.startsWith(ch.prefijo)).every((t) => !fksDe(t).some((c) => c.ref.tabla.startsWith(ch.prefijo))); break;
        default: ok = false;
      }
      return { ok, msg: ch.msg };
    });
  }

  // ============================================================== DDL por motor

  const MAPA = {
    sqlite: { int: 'INTEGER', bigint: 'INTEGER', text: 'TEXT', varchar: 'TEXT', date: 'TEXT', timestamp: 'TEXT', decimal: 'NUMERIC', float: 'REAL', bool: 'INTEGER' },
    postgres: { int: 'INTEGER', bigint: 'BIGINT', text: 'TEXT', varchar: 'VARCHAR(100)', date: 'DATE', timestamp: 'TIMESTAMP', decimal: 'NUMERIC(12,2)', float: 'DOUBLE PRECISION', bool: 'BOOLEAN' },
    mysql: { int: 'INT', bigint: 'BIGINT', text: 'VARCHAR(255)', varchar: 'VARCHAR(100)', date: 'DATE', timestamp: 'DATETIME', decimal: 'DECIMAL(12,2)', float: 'DOUBLE', bool: 'TINYINT(1)' },
    sqlserver: { int: 'INT', bigint: 'BIGINT', text: 'NVARCHAR(255)', varchar: 'NVARCHAR(100)', date: 'DATE', timestamp: 'DATETIME2', decimal: 'DECIMAL(12,2)', float: 'FLOAT', bool: 'BIT' },
  };
  function ddl(modelo, motor) {
    const M = MAPA[motor];
    const q = (x) => (motor === 'mysql' ? '`' + x + '`' : motor === 'sqlserver' ? '[' + x + ']' : x);
    // orden: primero las tablas referenciadas
    const orden = [], hecho = new Set();
    const visitar = (t, pila = new Set()) => { if (hecho.has(t.nombre) || pila.has(t.nombre)) return; pila.add(t.nombre); for (const c of fksDe(t)) { const d = modelo.tablas.find((x) => x.nombre === c.ref.tabla); if (d && d !== t) visitar(d, pila); } hecho.add(t.nombre); orden.push(t); };
    modelo.tablas.forEach((t) => visitar(t));
    const sentencias = orden.map((t) => {
      const pks = t.cols.filter((c) => c.pk);
      const lineas = t.cols.map((c) => `  ${q(c.n)} ${M[c.t] || (c.t || 'TEXT').toUpperCase()}${c.pk || !c.nulo ? ' NOT NULL' : ''}${c.unique && !c.pk ? ' UNIQUE' : ''}`);
      if (pks.length) lineas.push(`  CONSTRAINT ${q('pk_' + t.nombre)} PRIMARY KEY (${pks.map((c) => q(c.n)).join(', ')})`);
      for (const c of fksDe(t)) lineas.push(`  CONSTRAINT ${q(`fk_${t.nombre}_${c.n}`)} FOREIGN KEY (${q(c.n)}) REFERENCES ${q(c.ref.tabla)} (${q(c.ref.col)})`);
      return `CREATE TABLE ${q(t.nombre)} (\n${lineas.join(',\n')}\n)${motor === 'mysql' ? ' ENGINE=InnoDB' : ''};`;
    });
    // índices para las claves foráneas (PostgreSQL, SQL Server y SQLite no los crean solos)
    const idx = motor === 'mysql' ? [] : modelo.tablas.flatMap((t) => fksDe(t).filter((c) => !c.pk).map((c) => `CREATE INDEX ${q(`ix_${t.nombre}_${c.n}`)} ON ${q(t.nombre)} (${q(c.n)});`));
    return [`-- ${{ sqlite: 'SQLite', postgres: 'PostgreSQL', mysql: 'MySQL 8', sqlserver: 'SQL Server' }[motor]}: generado desde tu modelo`, ...sentencias, ...(idx.length ? ['-- índices para acelerar los JOIN por clave foránea', ...idx] : [])].join('\n\n');
  }

  // ============================================================== vista

  function vista(main, ctx) {
    const { h, esc, createEditor, Store, toast, abrirEnLab, $, $$ } = ctx;
    let ej = EJERCICIOS.find((e) => e.id === (Store.data.code['modelado-actual'] || '')) || EJERCICIOS[0];
    const libre = { id: 'libre', titulo: 'Modelo libre', nivel: '—', contexto: 'Modela lo que quieras: el sitio revisa las reglas de diseño y genera el SQL.', requisitos: [], inicial: 'Table ejemplo {\n  ejemplo_id int pk\n  nombre text\n}\n', checks: [] };
    const hechos = () => Store.data.code['modelado-hechos'] ? JSON.parse(Store.data.code['modelado-hechos']) : {};
    main.innerHTML = `<div class="container wide modelado">
      <h1 style="margin:0 0 4px">📐 Laboratorio de modelado</h1>
      <p class="muted" style="margin:0 0 14px;max-width:900px">Lee el requerimiento, escribe el modelo y mira el diagrama mientras escribes. El sitio revisa las <b>reglas de diseño</b> (claves, formas normales, relaciones) y lo que pide el <b>requerimiento</b>, y genera el SQL para crear las tablas en el motor que elijas.</p>
      <div class="mod-ejs" id="ejs"></div>
      <div class="mod-grid">
        <div class="card mod-req" id="req"></div>
        <div class="card mod-editor">
          <div class="ex-tools" style="border-top:0"><b class="small">Tu modelo</b><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="ayuda">❔ Sintaxis</button><button class="btn btn-ghost btn-sm" id="reiniciar">↺ Empezar de nuevo</button></div>
          <div id="ed"></div>
          <div class="ex-tools"><button class="btn btn-primary" id="revisar">✓ Revisar</button><button class="btn btn-sm" id="verSol">👁 Ver una solución</button><span class="spacer"></span><select id="motor"><option value="sqlite">SQLite</option><option value="postgres">PostgreSQL</option><option value="mysql">MySQL</option><option value="sqlserver">SQL Server</option></select><button class="btn btn-sm" id="verDdl">🧾 SQL de creación</button></div>
          <div id="errores"></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px;padding:12px"><div class="er-wrap" id="er" style="margin:0"></div></div>
      <div id="resultado"></div>
    </div>`;
    const clave = () => 'modelado-' + ej.id;
    const ed = createEditor($('#ed'), { lang: 'text', value: Store.data.code[clave()] ?? ej.inicial, tall: true, onRun: () => revisar(), onChange: (v) => { Store.setCode(clave(), v); programar(); } });
    let t0 = null;
    const programar = () => { clearTimeout(t0); t0 = setTimeout(dibujar, 350); };
    const pintarEjercicios = () => {
      const H = hechos();
      $('#ejs').innerHTML = [...EJERCICIOS, libre].map((e) => `<button class="chip ${e.id === ej.id ? 'active' : ''}" data-ej="${e.id}">${H[e.id] ? '✅ ' : ''}${esc(e.titulo)} <span class="muted small">${esc(e.nivel)}</span></button>`).join('');
      $('#req').innerHTML = `<h2 style="margin:0 0 6px;font-size:19px">${esc(ej.titulo)}</h2><p class="muted" style="margin:0 0 10px">${esc(ej.contexto)}</p>${ej.requisitos.length ? `<b class="small">Requerimiento</b><ul>${ej.requisitos.map((r) => `<li>${r}</li>`).join('')}</ul>` : ''}<div class="small muted">Antes de escribir, piensa: ¿qué <b>cosas</b> hay (entidades)? ¿qué <b>pasa</b> entre ellas (hechos)? ¿qué representa <b>una fila</b> de cada tabla?</div>`;
    };
    const dibujar = () => {
      const modelo = parsear(ed.getValue());
      const errs = modelo.errores;
      $('#errores').innerHTML = errs.length ? `<div class="mod-errores">${errs.map((e) => `<div class="${e.aviso ? 'aviso' : 'error'}">Línea ${e.n}: ${esc(e.msg)}</div>`).join('')}</div>` : '';
      const tablas = modelo.tablas.map((t) => ({ nombre: t.nombre, sub: `${t.cols.length} columnas`, clase: t.nombre.startsWith('fact_') ? 'er-hecho' : t.nombre.startsWith('dim_') ? 'er-dim' : '', cols: t.cols.map((c) => ({ n: c.n, t: c.t + (c.nulo ? '?' : ''), pk: c.pk, fk: c.ref ? c.ref.tabla : null })) }));
      const rels = modelo.tablas.flatMap((t) => fksDe(t).filter((c) => modelo.tablas.some((x) => x.nombre === c.ref.tabla)).map((c) => [t.nombre, c.n, c.ref.tabla, c.ref.col, c.nulo ? 'opcional' : '']));
      if (tablas.length) window.Bases.dibujarER($('#er'), tablas, rels, { titulo: 'Tu modelo' });
      else $('#er').innerHTML = '<p class="muted small" style="padding:12px">El diagrama aparece acá a medida que escribes.</p>';
      return modelo;
    };
    const revisar = () => {
      const modelo = dibujar();
      const reglas = revisarReglas(modelo);
      const req = ej.checks.length ? revisarRequisitos(modelo, ej) : [];
      const errores = reglas.filter((r) => r.nivel === 'error').length + modelo.errores.filter((e) => !e.aviso).length;
      const okReq = req.filter((r) => r.ok).length;
      const completo = !errores && req.length && okReq === req.length;
      if (completo) { const H = hechos(); H[ej.id] = true; Store.setCode('modelado-hechos', JSON.stringify(H)); pintarEjercicios(); toast('¡Modelo correcto!'); }
      $('#resultado').innerHTML = `<div class="card mod-res">
        ${req.length ? `<h3>Lo que pide el requerimiento <span class="muted small">${okReq} de ${req.length}</span></h3><ul class="mod-checks">${req.map((r) => `<li class="${r.ok ? 'ok' : 'falta'}">${r.ok ? '✓' : '✗'} ${r.msg}</li>`).join('')}</ul>` : ''}
        <h3>Reglas de diseño</h3>${reglas.length ? `<ul class="mod-reglas">${reglas.map((r) => `<li class="${r.nivel}">${r.nivel === 'error' ? '⛔' : r.nivel === 'aviso' ? '⚠️' : 'ℹ️'} ${r.msg}</li>`).join('')}</ul>` : '<p class="ok-txt">✓ Sin problemas de diseño: todas las tablas tienen clave primaria y las relaciones apuntan a columnas que existen.</p>'}
        ${completo ? `<div class="mod-bien"><b>🎉 ¡Bien modelado!</b><p>${ej.explicacion}</p></div>` : ''}
      </div>`;
      $('#resultado').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    $('#revisar').addEventListener('click', revisar);
    $('#verSol').addEventListener('click', () => {
      if (!ej.solucion) { toast('El modelo libre no tiene solución'); return; }
      const sol = parsear(ej.solucion);
      $('#resultado').innerHTML = `<div class="card mod-res"><h3>Una solución posible</h3><p>${ej.explicacion}</p><div class="er-wrap" id="erSol"></div><pre data-lang="text"><code>${esc(ej.solucion)}</code></pre><button class="btn btn-sm" id="usarSol">Copiarla al editor</button> <span class="small muted">Hay más de una forma correcta: lo importante es que cumpla el requerimiento y las reglas.</span></div>`;
      window.Bases.dibujarER($('#erSol'), sol.tablas.map((t) => ({ nombre: t.nombre, clase: t.nombre.startsWith('fact_') ? 'er-hecho' : t.nombre.startsWith('dim_') ? 'er-dim' : '', cols: t.cols.map((c) => ({ n: c.n, t: c.t, pk: c.pk, fk: c.ref ? c.ref.tabla : null })) })), sol.tablas.flatMap((t) => fksDe(t).map((c) => [t.nombre, c.n, c.ref.tabla, c.ref.col, c.nulo ? 'opcional' : ''])));
      $('#usarSol').addEventListener('click', () => { ed.setValue(ej.solucion); dibujar(); });
    });
    $('#verDdl').addEventListener('click', () => {
      const modelo = dibujar(); const motor = $('#motor').value; const sql = ddl(modelo, motor);
      $('#resultado').innerHTML = `<div class="card mod-res"><h3>SQL de creación</h3><pre data-lang="sql"><code>${esc(sql)}</code></pre>${motor === 'sqlite' ? '<button class="btn btn-sm" id="aLab">🧪 Crear las tablas en el laboratorio SQL</button>' : '<span class="small muted">Elige SQLite para crearlas en el laboratorio del curso, o copia este SQL a tu motor.</span>'} <button class="btn btn-sm" id="copiarDdl">📋 Copiar</button></div>`;
      const al = $('#aLab'); if (al) al.addEventListener('click', () => abrirEnLab(sql + '\n\n-- tus tablas ya existen: pruébalas con INSERT y SELECT\nSELECT name FROM sqlite_master WHERE type = \'table\' AND sql LIKE \'%CONSTRAINT pk_%\';'));
      $('#copiarDdl').addEventListener('click', () => { try { navigator.clipboard.writeText(sql); toast('Copiado'); } catch (e) { toast('No se pudo copiar'); } });
    });
    $('#reiniciar').addEventListener('click', () => { ed.setValue(ej.inicial || ''); dibujar(); $('#resultado').innerHTML = ''; });
    $('#ayuda').addEventListener('click', () => {
      $('#resultado').innerHTML = `<div class="card mod-res"><h3>Cómo se escribe un modelo</h3><pre data-lang="text"><code>Table pedidos {
  pedido_id int pk                          // clave primaria
  cliente_id int > clientes.cliente_id      // clave foránea
  fecha date
  cupon text null                           // admite nulos
  email text unique                         // no se repite
}

Table detalle {
  pedido_id int pk > pedidos.pedido_id      // pk compuesta: dos columnas con pk
  producto_id int pk > productos.producto_id
  cantidad int
}</code></pre><p class="small">Tipos: ${TIPOS.map((x) => `<code>${x}</code>`).join(', ')}. Una línea que empieza con <code>//</code> es un comentario. Las tablas que empiezan con <code>fact_</code> y <code>dim_</code> se dibujan como hechos y dimensiones.</p></div>`;
    });
    $('#ejs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ej]'); if (!b) return;
      ej = b.dataset.ej === 'libre' ? libre : EJERCICIOS.find((x) => x.id === b.dataset.ej);
      Store.setCode('modelado-actual', ej.id);
      ed.setValue(Store.data.code[clave()] ?? ej.inicial ?? '');
      $('#resultado').innerHTML = '';
      pintarEjercicios(); dibujar();
    });
    pintarEjercicios(); dibujar();
  }

  window.Modelado = { EJERCICIOS, parsear, revisarReglas, revisarRequisitos, ddl, vista };
})();
