/*
 * Bases de datos de práctica agrupadas por negocio: relaciones, grano de cada tabla,
 * por qué está modelada así y su versión dimensional (estrella). Incluye el dibujo del
 * diagrama entidad-relación (window.ER) que usan la página de datos y el laboratorio SQL.
 */
(function () {
  'use strict';

  // rel: [tabla_hija, columna, tabla_padre, columna_padre, nota opcional]
  const BASES = [
    {
      id: 'tienda', orden: ['clientes', 'productos', 'categorias', 'empleados', 'departamentos', 'pedidos', 'detalle_pedidos', 'pagos', 'eventos_web', 'logins', 'clientes_crudo', 'tipos_cambio'],
      tablas: {
        clientes: { grano: 'un cliente', pk: ['cliente_id'] },
        productos: { grano: 'un producto del catálogo, con su precio vigente', pk: ['producto_id'] },
        categorias: { grano: 'una categoría; las subcategorías apuntan a su categoría padre', pk: ['categoria_id'] },
        empleados: { grano: 'un empleado; jefe_id apunta a otro empleado', pk: ['empleado_id'] },
        departamentos: { grano: 'un departamento', pk: ['departamento_id'] },
        pedidos: { grano: 'un pedido (la cabecera: quién, cuándo, por qué canal)', pk: ['pedido_id'] },
        detalle_pedidos: { grano: 'una línea de pedido: un producto dentro de un pedido', pk: ['detalle_id'] },
        pagos: { grano: 'un intento de pago de un pedido', pk: ['pago_id'] },
        eventos_web: { grano: 'un clic o evento de navegación', pk: ['evento_id'] },
        logins: { grano: 'un cliente en un día en que inició sesión', pk: ['cliente_id', 'fecha'] },
        clientes_crudo: { grano: 'un registro tal como llegó en la carga (puede repetir clientes)', pk: ['registro_id'] },
        tipos_cambio: { grano: 'una moneda en un día hábil', pk: ['fecha', 'moneda'] },
      },
      rels: [
        ['pedidos', 'cliente_id', 'clientes', 'cliente_id'], ['pedidos', 'empleado_id', 'empleados', 'empleado_id'],
        ['detalle_pedidos', 'pedido_id', 'pedidos', 'pedido_id'], ['detalle_pedidos', 'producto_id', 'productos', 'producto_id'],
        ['pagos', 'pedido_id', 'pedidos', 'pedido_id'], ['productos', 'categoria_id', 'categorias', 'categoria_id'],
        ['categorias', 'categoria_padre_id', 'categorias', 'categoria_id'], ['empleados', 'departamento_id', 'departamentos', 'departamento_id'],
        ['empleados', 'jefe_id', 'empleados', 'empleado_id'], ['eventos_web', 'cliente_id', 'clientes', 'cliente_id', 'opcional: los visitantes anónimos no tienen cliente'],
        ['logins', 'cliente_id', 'clientes', 'cliente_id'], ['clientes_crudo', 'cliente_id', 'clientes', 'cliente_id', 'lógica: es una tabla de aterrizaje sin restricciones'],
      ],
      porQue: [
        ['Cabecera y detalle separados', 'Un pedido tiene varios productos. Si cada fila de <code>pedidos</code> llevara un producto, repetiríamos cliente, fecha y canal en cada línea, y cambiar uno obligaría a tocar muchas filas. Por eso <code>pedidos</code> guarda lo que es del pedido y <code>detalle_pedidos</code> lo que es de cada línea (tercera forma normal).'],
        ['El precio se copia en la línea', '<code>productos.precio</code> es el precio de hoy; <code>detalle_pedidos.precio_unitario</code> es el precio al que se vendió. No es una duplicación: es un dato histórico distinto. Sin él, un cambio de precio reescribiría las ventas del pasado.'],
        ['Los pagos van aparte', 'Un pedido puede tener un pago rechazado y después uno aprobado. Es una relación 1 a N con su propio estado y fecha, así que no cabe en una columna del pedido.'],
        ['Jerarquías con auto-referencia', 'Las categorías y el organigrama tienen profundidad variable. Una columna que apunta a la misma tabla (<code>categoria_padre_id</code>, <code>jefe_id</code>) permite cualquier cantidad de niveles; se recorren con CTE recursivas.'],
        ['Comportamiento separado de las transacciones', '<code>eventos_web</code> y <code>logins</code> son de alto volumen y solo se agregan filas (append-only). El <code>cliente_id</code> es opcional porque hay visitantes sin cuenta: por eso no conviene una restricción de clave foránea estricta.'],
        ['Una tabla de aterrizaje', '<code>clientes_crudo</code> es la capa bronze: guarda lo que llegó, con duplicados y formatos mezclados, para limpiarlo después sin perder el original.'],
        ['Claves compuestas cuando el grano lo pide', 'En <code>logins</code> lo que identifica una fila es cliente + día, y en <code>tipos_cambio</code>, fecha + moneda. Agregar un id artificial no aporta nada y permitiría duplicados.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_ventas', grano: 'una línea de pedido', cols: ['fecha_key', 'cliente_key', 'producto_key', 'canal_key', 'pedido_id (degenerada)', 'cantidad', 'precio_unitario', 'descuento', 'importe'] },
          { nombre: 'fact_pagos', grano: 'un intento de pago', cols: ['fecha_key', 'cliente_key', 'metodo_pago_key', 'pedido_id (degenerada)', 'monto', 'aprobado (0/1)'] }],
        dims: [{ nombre: 'dim_fecha', cols: ['fecha_key', 'fecha', 'mes', 'trimestre', 'anio', 'dia_semana', 'es_feriado'] },
          { nombre: 'dim_cliente', cols: ['cliente_key', 'cliente_id', 'nombre', 'ciudad', 'pais', 'segmento', 'vigente_desde', 'vigente_hasta'] },
          { nombre: 'dim_producto', cols: ['producto_key', 'producto_id', 'nombre', 'marca', 'categoria', 'categoria_padre'] },
          { nombre: 'dim_canal', cols: ['canal_key', 'canal'] }, { nombre: 'dim_metodo_pago', cols: ['metodo_pago_key', 'metodo_pago'] }],
        notas: 'La categoría y su padre se aplanan en <code>dim_producto</code> (sin jerarquía que recorrer). <code>dim_cliente</code> es SCD tipo 2: si un cliente cambia de segmento se agrega una versión, así las ventas viejas quedan con el segmento que tenía entonces.',
      },
      preguntas: [['Ventas por mes', "SELECT strftime('%Y-%m', p.fecha_pedido) AS mes, ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas\nFROM pedidos p\nJOIN detalle_pedidos d ON d.pedido_id = p.pedido_id\nWHERE p.estado <> 'cancelado'\nGROUP BY mes\nORDER BY mes;"],
        ['Clientes que nunca compraron', 'SELECT c.cliente_id, c.nombre, c.apellido\nFROM clientes c\nLEFT JOIN pedidos p ON p.cliente_id = c.cliente_id\nWHERE p.pedido_id IS NULL;'],
        ['Organigrama (CTE recursiva)', "WITH RECURSIVE jerarquia AS (\n  SELECT empleado_id, nombre, cargo, jefe_id, 0 AS nivel FROM empleados WHERE jefe_id IS NULL\n  UNION ALL\n  SELECT e.empleado_id, e.nombre, e.cargo, e.jefe_id, j.nivel + 1\n  FROM empleados e JOIN jerarquia j ON e.jefe_id = j.empleado_id\n)\nSELECT nivel, COUNT(*) AS empleados FROM jerarquia GROUP BY nivel;"]],
    },
    {
      id: 'banco', orden: ['banco_clientes', 'banco_cuentas', 'banco_transacciones', 'banco_prestamos', 'banco_cuotas'],
      tablas: {
        banco_clientes: { grano: 'un cliente del banco', pk: ['cliente_id'] },
        banco_cuentas: { grano: 'una cuenta (ahorro, corriente o inversión); un cliente puede tener varias', pk: ['cuenta_id'] },
        banco_transacciones: { grano: 'un movimiento de una cuenta', pk: ['tx_id'] },
        banco_prestamos: { grano: 'un préstamo otorgado', pk: ['prestamo_id'] },
        banco_cuotas: { grano: 'una cuota del plan de pagos de un préstamo', pk: ['cuota_id'] },
      },
      rels: [['banco_cuentas', 'cliente_id', 'banco_clientes', 'cliente_id'], ['banco_transacciones', 'cuenta_id', 'banco_cuentas', 'cuenta_id'],
        ['banco_prestamos', 'cliente_id', 'banco_clientes', 'cliente_id'], ['banco_cuotas', 'prestamo_id', 'banco_prestamos', 'prestamo_id']],
      porQue: [
        ['El saldo no se guarda: se calcula', 'La fuente de verdad son los movimientos (como un libro mayor). Un saldo guardado en <code>banco_cuentas</code> podría desincronizarse; el saldo de cualquier fecha sale de sumar las transacciones hasta ese día. En producción se agrega una foto diaria del saldo para no recalcular siempre.'],
        ['Cliente y cuenta son cosas distintas', 'Una persona tiene varias cuentas, y cada una tiene su tipo, estado y fecha de apertura. Separarlas permite medir productos por cliente (venta cruzada).'],
        ['Las cuotas son filas, no columnas', 'Un préstamo a 12 meses y otro a 60 entran en la misma tabla, una fila por cuota. Con columnas <code>cuota1…cuota60</code> no se podría ni consultar la mora. La mora es <code>fecha_pago</code> nula o posterior al vencimiento.'],
        ['Préstamos colgados del cliente', 'El préstamo es un producto del cliente, no de una cuenta: puede desembolsarse en cualquier cuenta o pagarse desde otra.'],
        ['Etiqueta de fraude en la transacción', '<code>es_fraude</code> es la etiqueta que usa un modelo de detección. Vive en la misma fila porque se conoce por cada movimiento.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_transacciones', grano: 'un movimiento', cols: ['fecha_key', 'cliente_key', 'cuenta_key', 'canal_key', 'tipo', 'comercio', 'monto', 'es_fraude'] },
          { nombre: 'fact_saldo_diario', grano: 'una cuenta en un día (foto periódica)', cols: ['fecha_key', 'cuenta_key', 'cliente_key', 'saldo'] },
          { nombre: 'fact_cuotas', grano: 'una cuota', cols: ['fecha_venc_key', 'fecha_pago_key', 'prestamo_key', 'cliente_key', 'monto', 'dias_atraso'] }],
        dims: [{ nombre: 'dim_cliente', cols: ['cliente_key', 'cliente_id', 'pais', 'segmento', 'rango_score'] }, { nombre: 'dim_cuenta', cols: ['cuenta_key', 'cuenta_id', 'tipo', 'estado'] },
          { nombre: 'dim_fecha', cols: ['fecha_key', 'fecha', 'mes', 'anio'] }, { nombre: 'dim_canal', cols: ['canal_key', 'canal'] }, { nombre: 'dim_prestamo', cols: ['prestamo_key', 'prestamo_id', 'plazo_meses', 'tasa_anual'] }],
        notas: 'Tres tipos de tabla de hechos: de transacción (cada movimiento), de foto periódica (el saldo de cada día) y de cuotas. La foto diaria es la que hace rápidos los tableros de saldos.',
      },
      preguntas: [['Saldo por cuenta', "SELECT cuenta_id, ROUND(SUM(CASE WHEN tipo IN ('deposito') THEN monto ELSE -monto END), 2) AS saldo\nFROM banco_transacciones\nGROUP BY cuenta_id\nORDER BY saldo DESC\nLIMIT 10;"],
        ['Cuotas en mora', "SELECT COUNT(*) AS cuotas_en_mora\nFROM banco_cuotas\nWHERE fecha_pago IS NULL AND fecha_vencimiento < '2024-12-31'\n   OR fecha_pago > fecha_vencimiento;"]],
    },
    {
      id: 'streaming', orden: ['streaming_usuarios', 'streaming_suscripciones', 'streaming_contenidos', 'streaming_reproducciones'],
      tablas: {
        streaming_usuarios: { grano: 'un usuario', pk: ['usuario_id'] },
        streaming_suscripciones: { grano: 'un período de suscripción: cada cambio de plan o baja cierra una fila y abre otra', pk: ['suscripcion_id'] },
        streaming_contenidos: { grano: 'una canción o pódcast del catálogo', pk: ['contenido_id'] },
        streaming_reproducciones: { grano: 'una reproducción', pk: ['repro_id'] },
      },
      rels: [['streaming_suscripciones', 'usuario_id', 'streaming_usuarios', 'usuario_id'], ['streaming_reproducciones', 'usuario_id', 'streaming_usuarios', 'usuario_id'],
        ['streaming_reproducciones', 'contenido_id', 'streaming_contenidos', 'contenido_id']],
      porQue: [
        ['Historial de planes con inicio y fin', 'Cada fila de suscripciones dice qué plan tenía el usuario entre <code>fecha_inicio</code> y <code>fecha_fin</code>. Con eso se sabe el plan de cualquier mes (para el MRR) y se miden upgrades y bajas. Es el mismo patrón que una dimensión SCD tipo 2.'],
        ['El precio se guarda en la suscripción', 'El precio pactado puede ser distinto del actual (promociones, aumentos). Para facturación vale el de la suscripción.'],
        ['Segundos escuchados en lugar de “reproducida sí/no”', 'Guardar el dato crudo permite definir después qué cuenta como reproducción válida (por ejemplo, 30 segundos o más) sin perder información.'],
        ['El dispositivo está en dos lugares', 'El dispositivo principal es un atributo del usuario; el de la reproducción es lo que realmente usó en ese momento. Son preguntas distintas.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_reproducciones', grano: 'una reproducción', cols: ['fecha_key', 'usuario_key', 'contenido_key', 'dispositivo_key', 'segundos', 'es_valida'] },
          { nombre: 'fact_mrr_mensual', grano: 'un usuario en un mes (foto periódica)', cols: ['mes_key', 'usuario_key', 'plan', 'mrr', 'es_alta', 'es_baja'] }],
        dims: [{ nombre: 'dim_usuario', cols: ['usuario_key', 'usuario_id', 'pais', 'rango_edad'] }, { nombre: 'dim_contenido', cols: ['contenido_key', 'titulo', 'tipo', 'genero', 'artista'] },
          { nombre: 'dim_fecha', cols: ['fecha_key', 'fecha', 'mes', 'anio'] }, { nombre: 'dim_dispositivo', cols: ['dispositivo_key', 'dispositivo'] }],
        notas: 'El MRR se calcula mucho más fácil con una foto mensual por usuario que recorriendo los rangos de fechas en cada consulta.',
      },
      preguntas: [['Planes activos a fin de 2024', "SELECT plan, COUNT(*) AS usuarios\nFROM streaming_suscripciones\nWHERE fecha_inicio <= '2024-12-31' AND (fecha_fin IS NULL OR fecha_fin > '2024-12-31')\nGROUP BY plan;"]],
    },
    {
      id: 'viajes', orden: ['viajes_pasajeros', 'viajes_conductores', 'viajes_viajes'],
      tablas: {
        viajes_pasajeros: { grano: 'un pasajero', pk: ['pasajero_id'] },
        viajes_conductores: { grano: 'un conductor', pk: ['conductor_id'] },
        viajes_viajes: { grano: 'una solicitud de viaje, se complete o no', pk: ['viaje_id'] },
      },
      rels: [['viajes_viajes', 'pasajero_id', 'viajes_pasajeros', 'pasajero_id'], ['viajes_viajes', 'conductor_id', 'viajes_conductores', 'conductor_id', 'opcional: sin conductor si nadie aceptó']],
      porQue: [
        ['Una fila que se completa con el tiempo', 'Solicitud, inicio y fin del viaje están en la misma fila. Se llama <i>accumulating snapshot</i>: la fila se va completando a medida que avanza el proceso, y los tiempos de espera salen de restar columnas.'],
        ['Las cancelaciones también son filas', 'Un viaje cancelado tiene inicio y fin nulos. Si solo guardáramos los completados no se podría medir la tasa de cancelación ni la demanda no atendida.'],
        ['La tarifa y el multiplicador se guardan', 'La tarifa dinámica cambia minuto a minuto: hay que guardar la que se aplicó en ese viaje.'],
        ['La ciudad está en el viaje', 'El conductor tiene una ciudad base, pero puede trabajar en otra. Para analizar la operación importa dónde ocurrió el viaje.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_viajes', grano: 'una solicitud de viaje', cols: ['fecha_hora_key', 'pasajero_key', 'conductor_key', 'ciudad_key', 'estado', 'min_espera', 'min_viaje', 'distancia_km', 'tarifa', 'multiplicador', 'calificacion'] }],
        dims: [{ nombre: 'dim_pasajero', cols: ['pasajero_key', 'pasajero_id', 'ciudad'] }, { nombre: 'dim_conductor', cols: ['conductor_key', 'conductor_id', 'vehiculo'] },
          { nombre: 'dim_ciudad', cols: ['ciudad_key', 'ciudad'] }, { nombre: 'dim_fecha_hora', cols: ['fecha_hora_key', 'fecha', 'hora', 'franja', 'dia_semana'] }],
        notas: 'Los minutos de espera y de viaje se calculan una vez al cargar la tabla de hechos, así no se repite la resta de fechas en cada consulta.',
      },
      preguntas: [['Tasa de cancelación por ciudad', "SELECT ciudad,\n       ROUND(100.0 * SUM(estado LIKE 'cancelado%') / COUNT(*), 1) AS pct_cancelados\nFROM viajes_viajes\nGROUP BY ciudad\nORDER BY pct_cancelados DESC;"]],
    },
    {
      id: 'clinica', orden: ['clinica_pacientes', 'clinica_medicos', 'clinica_turnos', 'clinica_facturas'],
      tablas: {
        clinica_pacientes: { grano: 'un paciente (sin nombre: solo lo necesario para analizar)', pk: ['paciente_id'] },
        clinica_medicos: { grano: 'un médico', pk: ['medico_id'] },
        clinica_turnos: { grano: 'un turno reservado (atendido, ausente o cancelado)', pk: ['turno_id'] },
        clinica_facturas: { grano: 'la factura de un turno atendido', pk: ['factura_id'] },
      },
      rels: [['clinica_turnos', 'paciente_id', 'clinica_pacientes', 'paciente_id'], ['clinica_turnos', 'medico_id', 'clinica_medicos', 'medico_id'], ['clinica_facturas', 'turno_id', 'clinica_turnos', 'turno_id', 'de 1 a 0..1: no todos los turnos se facturan']],
      porQue: [
        ['Dos fechas en el turno', '<code>fecha_reserva</code> y <code>fecha_hora</code> permiten calcular la anticipación con la que se pidió el turno, que es una de las mejores variables para predecir el ausentismo.'],
        ['La factura es otra entidad', 'No todos los turnos se facturan (ausentes, cancelados) y la factura tiene su propio ciclo (pagada o no). Por eso es una relación de 1 a 0..1 y no columnas del turno.'],
        ['Cobertura y copago', '<code>monto</code> y <code>monto_cubierto</code> separan lo que paga la obra social de lo que paga el paciente.'],
        ['Minimizar datos personales', 'La tabla de pacientes no tiene nombre ni documento: para analizar alcanzan sexo, edad, cobertura y ciudad. Guardar menos datos sensibles reduce el riesgo.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_turnos', grano: 'un turno', cols: ['fecha_key', 'paciente_key', 'medico_key', 'estado', 'dias_anticipacion', 'atendido', 'ausente'] },
          { nombre: 'fact_facturacion', grano: 'una factura', cols: ['fecha_key', 'paciente_key', 'medico_key', 'monto', 'monto_cubierto', 'copago', 'pagada'] }],
        dims: [{ nombre: 'dim_paciente', cols: ['paciente_key', 'sexo', 'rango_edad', 'cobertura', 'ciudad'] }, { nombre: 'dim_medico', cols: ['medico_key', 'nombre', 'especialidad', 'sede'] },
          { nombre: 'dim_fecha', cols: ['fecha_key', 'fecha', 'mes', 'dia_semana', 'hora'] }],
        notas: 'La edad se guarda como rango en la dimensión: alcanza para analizar y protege la identidad del paciente.',
      },
      preguntas: [['Ausentismo por especialidad', "SELECT m.especialidad,\n       ROUND(100.0 * AVG(t.estado = 'ausente'), 1) AS pct_ausentes\nFROM clinica_turnos t\nJOIN clinica_medicos m ON m.medico_id = t.medico_id\nWHERE t.estado <> 'cancelado'\nGROUP BY m.especialidad\nORDER BY pct_ausentes DESC;"]],
    },
    {
      id: 'saas', orden: ['saas_planes', 'saas_empresas', 'saas_facturas', 'saas_tickets'],
      tablas: {
        saas_planes: { grano: 'un plan comercial', pk: ['plan_id'] },
        saas_empresas: { grano: 'una empresa cliente', pk: ['empresa_id'] },
        saas_facturas: { grano: 'una empresa en un mes (su factura mensual)', pk: ['factura_id'] },
        saas_tickets: { grano: 'un pedido de soporte', pk: ['ticket_id'] },
      },
      rels: [['saas_facturas', 'empresa_id', 'saas_empresas', 'empresa_id'], ['saas_facturas', 'plan_id', 'saas_planes', 'plan_id'], ['saas_tickets', 'empresa_id', 'saas_empresas', 'empresa_id']],
      porQue: [
        ['Una factura por mes y empresa', 'Comparar el plan y el monto de un mes con el anterior muestra altas, bajas, upgrades (expansión) y downgrades (contracción): todo lo que se necesita para el MRR y la retención neta.'],
        ['El monto vive en la factura', 'Los descuentos y precios negociados hacen que el monto real no sea el precio de lista del plan.'],
        ['Tickets abiertos con fecha de cierre nula', 'Un ticket sin <code>fecha_cierre</code> sigue abierto; el tiempo de resolución se calcula solo para los cerrados.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_mrr_mensual', grano: 'una empresa en un mes', cols: ['mes_key', 'empresa_key', 'plan_key', 'mrr', 'movimiento (nuevo, expansión, contracción, baja)'] },
          { nombre: 'fact_tickets', grano: 'un ticket', cols: ['fecha_key', 'empresa_key', 'prioridad', 'categoria', 'horas_resolucion', 'satisfaccion'] }],
        dims: [{ nombre: 'dim_empresa', cols: ['empresa_key', 'nombre', 'industria', 'pais', 'tamano'] }, { nombre: 'dim_plan', cols: ['plan_key', 'nombre', 'precio_lista'] }, { nombre: 'dim_mes', cols: ['mes_key', 'mes', 'trimestre', 'anio'] }],
        notas: 'Clasificar el movimiento de MRR al cargar la tabla de hechos hace trivial el gráfico de “cascada” del MRR.',
      },
      preguntas: [['MRR por mes', "SELECT mes, ROUND(SUM(monto), 2) AS mrr\nFROM saas_facturas\nWHERE estado <> 'anulada'\nGROUP BY mes\nORDER BY mes;"]],
    },
    {
      id: 'vuelos', orden: ['vuelos_aeropuertos', 'vuelos_vuelos', 'vuelos_reservas'],
      tablas: {
        vuelos_aeropuertos: { grano: 'un aeropuerto (clave: el código IATA)', pk: ['codigo'] },
        vuelos_vuelos: { grano: 'un vuelo programado en una fecha', pk: ['vuelo_id'] },
        vuelos_reservas: { grano: 'un asiento reservado', pk: ['reserva_id'] },
      },
      rels: [['vuelos_vuelos', 'origen', 'vuelos_aeropuertos', 'codigo'], ['vuelos_vuelos', 'destino', 'vuelos_aeropuertos', 'codigo'], ['vuelos_reservas', 'vuelo_id', 'vuelos_vuelos', 'vuelo_id']],
      porQue: [
        ['Una clave natural estable', 'El código IATA (EZE, SCL, LIM) es único, no cambia y se entiende al leerlo. Por eso es razonable usarlo como clave en lugar de un número artificial.'],
        ['Dos relaciones con la misma tabla', 'Origen y destino apuntan a aeropuertos. En el modelo dimensional es una <i>role-playing dimension</i>: la misma dimensión usada en dos roles.'],
        ['Programado contra real', 'Guardar los horarios programados y los reales permite medir la puntualidad (por ejemplo, salir con menos de 15 minutos de demora).'],
        ['La capacidad está en el vuelo', 'El avión asignado puede cambiar entre vuelos, así que la capacidad se guarda en cada vuelo para calcular la ocupación.'],
        ['Pasajeros sin tabla', 'El análisis no necesita datos personales del pasajero; <code>pasajero_id</code> alcanza para contar pasajeros únicos.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_vuelos', grano: 'un vuelo', cols: ['fecha_key', 'origen_key', 'destino_key', 'min_demora_salida', 'min_demora_llegada', 'capacidad', 'pasajeros', 'ocupacion'] },
          { nombre: 'fact_reservas', grano: 'una reserva', cols: ['fecha_reserva_key', 'fecha_vuelo_key', 'origen_key', 'destino_key', 'clase', 'precio', 'dias_anticipacion'] }],
        dims: [{ nombre: 'dim_aeropuerto', cols: ['aeropuerto_key', 'codigo', 'ciudad', 'pais'] }, { nombre: 'dim_fecha', cols: ['fecha_key', 'fecha', 'mes', 'temporada'] }],
        notas: '<code>dim_aeropuerto</code> se une dos veces con alias distintos (origen y destino).',
      },
      preguntas: [['Ruta con más demora promedio', "SELECT origen || '→' || destino AS ruta,\n       ROUND(AVG((julianday(salida_real) - julianday(salida_programada)) * 1440), 1) AS min_demora\nFROM vuelos_vuelos\nWHERE salida_real IS NOT NULL\nGROUP BY ruta\nORDER BY min_demora DESC\nLIMIT 5;"]],
    },
    {
      id: 'logistica', orden: ['logistica_almacenes', 'logistica_movimientos', 'logistica_envios'],
      tablas: {
        logistica_almacenes: { grano: 'un almacén', pk: ['almacen_id'] },
        logistica_movimientos: { grano: 'un movimiento de stock (entrada, salida o ajuste) de un SKU', pk: ['movimiento_id'] },
        logistica_envios: { grano: 'un envío despachado', pk: ['envio_id'] },
      },
      rels: [['logistica_movimientos', 'almacen_id', 'logistica_almacenes', 'almacen_id'], ['logistica_envios', 'almacen_id', 'logistica_almacenes', 'almacen_id']],
      porQue: [
        ['El stock se calcula con los movimientos', 'Igual que el saldo de un banco: el stock de un SKU en una fecha es la suma acumulada de entradas menos salidas. Guardar los movimientos deja reconstruir el stock de cualquier día y auditar diferencias.'],
        ['El SKU no tiene tabla', 'El catálogo de productos vive en otro sistema; aquí alcanza con el código. Es habitual en datos operativos: no todo está en la misma base.'],
        ['Fecha prometida y fecha de entrega', 'Con las dos se mide la entrega a tiempo (OTIF) y la demora por transportista.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_movimientos', grano: 'un movimiento', cols: ['fecha_key', 'almacen_key', 'sku_key', 'tipo', 'cantidad'] },
          { nombre: 'fact_stock_diario', grano: 'un SKU en un almacén en un día (foto periódica)', cols: ['fecha_key', 'almacen_key', 'sku_key', 'stock'] },
          { nombre: 'fact_envios', grano: 'un envío', cols: ['fecha_key', 'almacen_key', 'transportista_key', 'dias_entrega', 'a_tiempo', 'costo'] }],
        dims: [{ nombre: 'dim_almacen', cols: ['almacen_key', 'ciudad', 'capacidad'] }, { nombre: 'dim_sku', cols: ['sku_key', 'sku'] }, { nombre: 'dim_transportista', cols: ['transportista_key', 'nombre'] }, { nombre: 'dim_fecha', cols: ['fecha_key', 'fecha', 'mes'] }],
        notas: 'El stock es un hecho <b>semi-aditivo</b>: se puede sumar entre almacenes, pero no entre días (el stock de enero no es la suma del stock de cada día).',
      },
      preguntas: [['Entregas a tiempo por transportista', "SELECT transportista,\n       ROUND(100.0 * AVG(fecha_entrega <= fecha_prometida), 1) AS pct_a_tiempo\nFROM logistica_envios\nWHERE fecha_entrega IS NOT NULL\nGROUP BY transportista\nORDER BY pct_a_tiempo;"]],
    },
    {
      id: 'telco', orden: ['telco_clientes', 'telco_planes', 'telco_lineas', 'telco_consumos', 'telco_reclamos'],
      tablas: {
        telco_clientes: { grano: 'un cliente (persona o empresa)', pk: ['cliente_id'] },
        telco_planes: { grano: 'un plan', pk: ['plan_id'] },
        telco_lineas: { grano: 'una línea telefónica', pk: ['linea_id'] },
        telco_consumos: { grano: 'una línea en un mes', pk: ['linea_id', 'mes'] },
        telco_reclamos: { grano: 'un reclamo', pk: ['reclamo_id'] },
      },
      rels: [['telco_lineas', 'cliente_id', 'telco_clientes', 'cliente_id'], ['telco_lineas', 'plan_id', 'telco_planes', 'plan_id'], ['telco_consumos', 'linea_id', 'telco_lineas', 'linea_id'], ['telco_reclamos', 'linea_id', 'telco_lineas', 'linea_id']],
      porQue: [
        ['Cliente y línea separados', 'Una empresa puede tener 20 líneas. La baja (churn) se mide por línea y también por cliente, y son números distintos.'],
        ['Consumo mensual, no llamada por llamada', 'Guardar cada llamada (CDR) son miles de millones de filas. Para facturación y churn alcanza una fila por línea y mes: es una foto periódica, con clave compuesta línea + mes.'],
        ['Una limitación a propósito', 'La línea guarda solo su plan actual: no hay historial de cambios de plan. Es un buen ejemplo para discutir: si negocio pregunta por migraciones de plan, el modelo no alcanza y habría que agregar una tabla de historial.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_consumo_mensual', grano: 'una línea en un mes', cols: ['mes_key', 'linea_key', 'cliente_key', 'plan_key', 'datos_gb', 'minutos', 'sms', 'monto'] },
          { nombre: 'fact_reclamos', grano: 'un reclamo', cols: ['fecha_key', 'linea_key', 'categoria', 'horas_resolucion', 'resuelto'] }],
        dims: [{ nombre: 'dim_cliente', cols: ['cliente_key', 'tipo', 'region', 'rango_edad'] }, { nombre: 'dim_linea', cols: ['linea_key', 'numero', 'fecha_alta', 'fecha_baja', 'motivo_baja'] },
          { nombre: 'dim_plan', cols: ['plan_key', 'nombre', 'tipo', 'precio'] }, { nombre: 'dim_mes', cols: ['mes_key', 'mes', 'anio'] }],
        notas: 'ARPU = ingreso total / líneas activas del mes; la tabla de hechos mensual lo resuelve con un solo GROUP BY.',
      },
      preguntas: [['ARPU por mes', 'SELECT mes, ROUND(SUM(monto_facturado) / COUNT(DISTINCT linea_id), 2) AS arpu\nFROM telco_consumos\nGROUP BY mes\nORDER BY mes;']],
    },
    {
      id: 'seguros', orden: ['seguros_clientes', 'seguros_polizas', 'seguros_siniestros'],
      tablas: {
        seguros_clientes: { grano: 'un asegurado', pk: ['cliente_id'] },
        seguros_polizas: { grano: 'una póliza (ramo, vigencia y prima)', pk: ['poliza_id'] },
        seguros_siniestros: { grano: 'un siniestro denunciado', pk: ['siniestro_id'] },
      },
      rels: [['seguros_polizas', 'cliente_id', 'seguros_clientes', 'cliente_id'], ['seguros_siniestros', 'poliza_id', 'seguros_polizas', 'poliza_id']],
      porQue: [
        ['Ocurrencia y denuncia son fechas distintas', 'El siniestro ocurre un día y se denuncia otro. La diferencia importa para el fraude y para estimar siniestros ocurridos que todavía no se denunciaron.'],
        ['Reclamado contra pagado', 'Se guardan los dos montos: la diferencia mide cuánto se rechaza o se negocia.'],
        ['La prima y la vigencia están en la póliza', 'La siniestralidad es lo pagado dividido por las primas ganadas, y para calcular las primas de un período hacen falta la prima mensual y las fechas de vigencia.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_siniestros', grano: 'un siniestro', cols: ['fecha_ocurrencia_key', 'poliza_key', 'cliente_key', 'tipo', 'dias_denuncia', 'monto_reclamado', 'monto_pagado', 'fraude'] },
          { nombre: 'fact_primas_mensuales', grano: 'una póliza vigente en un mes', cols: ['mes_key', 'poliza_key', 'cliente_key', 'prima_ganada'] }],
        dims: [{ nombre: 'dim_poliza', cols: ['poliza_key', 'ramo', 'canal', 'suma_asegurada'] }, { nombre: 'dim_cliente', cols: ['cliente_key', 'rango_edad', 'ciudad'] }, { nombre: 'dim_fecha', cols: ['fecha_key', 'fecha', 'mes', 'anio'] }],
        notas: 'Con las primas ganadas por mes en su propia tabla, la siniestralidad por ramo y mes es una división de dos sumas.',
      },
      preguntas: [['Siniestralidad por ramo', "SELECT p.ramo,\n       ROUND(SUM(s.monto_pagado), 0) AS pagado,\n       COUNT(s.siniestro_id) AS siniestros\nFROM seguros_polizas p\nLEFT JOIN seguros_siniestros s ON s.poliza_id = p.poliza_id\nGROUP BY p.ramo;"]],
    },
    {
      id: 'hotel', orden: ['hotel_hoteles', 'hotel_huespedes', 'hotel_reservas', 'hotel_consumos', 'hotel_resenas'],
      tablas: {
        hotel_hoteles: { grano: 'un hotel', pk: ['hotel_id'] },
        hotel_huespedes: { grano: 'un huésped', pk: ['huesped_id'] },
        hotel_reservas: { grano: 'una reserva (de check-in a check-out)', pk: ['reserva_id'] },
        hotel_consumos: { grano: 'un consumo extra durante una estadía', pk: ['consumo_id'] },
        hotel_resenas: { grano: 'la reseña de una estadía', pk: ['resena_id'] },
      },
      rels: [['hotel_reservas', 'hotel_id', 'hotel_hoteles', 'hotel_id'], ['hotel_reservas', 'huesped_id', 'hotel_huespedes', 'huesped_id'], ['hotel_consumos', 'reserva_id', 'hotel_reservas', 'reserva_id'], ['hotel_resenas', 'reserva_id', 'hotel_reservas', 'reserva_id', 'de 1 a 0..1']],
      porQue: [
        ['La reserva es un rango de noches', 'Para medir la ocupación de cada noche hay que “expandir” cada reserva a una fila por noche, cruzándola con un calendario. Es justamente lo que hace el modelo analítico.'],
        ['La comisión está en la reserva', 'Cada canal cobra distinto y la comisión cambia con el tiempo: se guarda la que se aplicó.'],
        ['La reseña se liga a la reserva', 'Así se sabe qué estadía, qué hotel y qué canal se están evaluando, no solo quién opinó.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_noches', grano: 'una habitación ocupada en una noche', cols: ['fecha_key', 'hotel_key', 'huesped_key', 'canal_key', 'tarifa_noche', 'comision'] },
          { nombre: 'fact_consumos', grano: 'un consumo', cols: ['fecha_key', 'hotel_key', 'concepto', 'monto'] }],
        dims: [{ nombre: 'dim_hotel', cols: ['hotel_key', 'nombre', 'ciudad', 'estrellas', 'habitaciones'] }, { nombre: 'dim_huesped', cols: ['huesped_key', 'pais', 'programa_fidelidad'] },
          { nombre: 'dim_canal', cols: ['canal_key', 'canal', 'es_directo'] }, { nombre: 'dim_fecha', cols: ['fecha_key', 'fecha', 'mes', 'temporada', 'fin_de_semana'] }],
        notas: 'Con <code>fact_noches</code>, la ocupación es noches vendidas / habitaciones disponibles, y RevPAR es ingreso por habitación disponible.',
      },
      preguntas: [['Reservas e ingreso por canal', "SELECT canal, COUNT(*) AS reservas,\n       ROUND(SUM(tarifa_noche * (julianday(check_out) - julianday(check_in))), 0) AS ingreso\nFROM hotel_reservas\nWHERE estado <> 'cancelada'\nGROUP BY canal\nORDER BY ingreso DESC;"]],
    },
    {
      id: 'energia', orden: ['energia_clientes', 'energia_medidores', 'energia_lecturas', 'energia_facturas', 'energia_cortes'],
      tablas: {
        energia_clientes: { grano: 'un cliente (hogar, comercio o industria)', pk: ['cliente_id'] },
        energia_medidores: { grano: 'un medidor instalado', pk: ['medidor_id'] },
        energia_lecturas: { grano: 'un medidor en un mes', pk: ['lectura_id'] },
        energia_facturas: { grano: 'un cliente en un mes', pk: ['factura_id'] },
        energia_cortes: { grano: 'un corte de servicio en una zona', pk: ['corte_id'] },
      },
      rels: [['energia_medidores', 'cliente_id', 'energia_clientes', 'cliente_id'], ['energia_lecturas', 'medidor_id', 'energia_medidores', 'medidor_id'], ['energia_facturas', 'cliente_id', 'energia_clientes', 'cliente_id']],
      porQue: [
        ['El medidor es una entidad aparte', 'Los medidores se reemplazan. Separarlos del cliente conserva el historial de qué medidor midió qué y cuándo.'],
        ['Una marca de lectura estimada', 'Cuando no se puede leer el medidor se estima. Marcarlo permite medir la calidad del dato y no confundir una estimación con un consumo real (clave para detectar hurto).'],
        ['Los cortes se relacionan por zona', 'Un corte afecta a una zona, no a un cliente puntual. Se cruza con los clientes por la columna <code>zona</code>: es una relación lógica, sin clave foránea.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_lecturas', grano: 'un medidor en un mes', cols: ['mes_key', 'medidor_key', 'cliente_key', 'kwh', 'estimada'] }, { nombre: 'fact_facturas', grano: 'una factura', cols: ['mes_key', 'cliente_key', 'monto', 'dias_atraso', 'pagada'] },
          { nombre: 'fact_cortes', grano: 'un corte', cols: ['fecha_key', 'zona_key', 'horas', 'clientes_afectados', 'causa'] }],
        dims: [{ nombre: 'dim_cliente', cols: ['cliente_key', 'tipo', 'zona'] }, { nombre: 'dim_medidor', cols: ['medidor_key', 'tipo', 'fecha_instalacion'] }, { nombre: 'dim_zona', cols: ['zona_key', 'zona'] }, { nombre: 'dim_mes', cols: ['mes_key', 'mes', 'anio'] }],
        notas: '<code>dim_zona</code> es compartida por clientes y cortes: es una <b>dimensión conformada</b>, la que permite cruzar dos tablas de hechos distintas.',
      },
      preguntas: [['Lecturas estimadas por zona', "SELECT c.zona, ROUND(100.0 * AVG(l.estimada), 1) AS pct_estimadas\nFROM energia_lecturas l\nJOIN energia_medidores m ON m.medidor_id = l.medidor_id\nJOIN energia_clientes c ON c.cliente_id = m.cliente_id\nGROUP BY c.zona\nORDER BY pct_estimadas DESC;"]],
    },
    {
      id: 'delivery', orden: ['delivery_clientes', 'delivery_restaurantes', 'delivery_repartidores', 'delivery_pedidos'],
      tablas: {
        delivery_clientes: { grano: 'un cliente de la app', pk: ['cliente_id'] },
        delivery_restaurantes: { grano: 'un restaurante', pk: ['restaurante_id'] },
        delivery_repartidores: { grano: 'un repartidor', pk: ['repartidor_id'] },
        delivery_pedidos: { grano: 'un pedido, desde que se crea hasta que se entrega o cancela', pk: ['pedido_id'] },
      },
      rels: [['delivery_pedidos', 'cliente_id', 'delivery_clientes', 'cliente_id'], ['delivery_pedidos', 'restaurante_id', 'delivery_restaurantes', 'restaurante_id'], ['delivery_pedidos', 'repartidor_id', 'delivery_repartidores', 'repartidor_id', 'opcional: sin repartidor si se canceló antes']],
      porQue: [
        ['Una columna de tiempo por etapa', 'Creado, aceptado, retirado y entregado en la misma fila (<i>accumulating snapshot</i>) muestran dónde se pierde tiempo: en la cocina o en la calle.'],
        ['Importes desglosados', 'Subtotal, envío, cupón y propina por separado permiten calcular la comisión que se queda la plataforma (take rate) y el costo de las promociones.'],
        ['Repartidor opcional', 'Si el pedido se cancela antes de asignarlo, no hay repartidor. Por eso la clave foránea admite nulos.'],
      ],
      estrella: {
        hechos: [{ nombre: 'fact_pedidos', grano: 'un pedido', cols: ['fecha_hora_key', 'cliente_key', 'restaurante_key', 'repartidor_key', 'estado', 'min_aceptacion', 'min_cocina', 'min_entrega', 'subtotal', 'costo_envio', 'cupon', 'propina'] }],
        dims: [{ nombre: 'dim_cliente', cols: ['cliente_key', 'ciudad', 'plataforma', 'cohorte'] }, { nombre: 'dim_restaurante', cols: ['restaurante_key', 'nombre', 'categoria', 'comision_pct'] },
          { nombre: 'dim_repartidor', cols: ['repartidor_key', 'vehiculo'] }, { nombre: 'dim_fecha_hora', cols: ['fecha_hora_key', 'fecha', 'hora', 'franja'] }],
        notas: 'Guardar la <code>cohorte</code> (mes de registro) en <code>dim_cliente</code> simplifica los análisis de retención.',
      },
      preguntas: [['Minutos por etapa', "SELECT ROUND(AVG((julianday(aceptado) - julianday(creado)) * 1440), 1) AS min_aceptar,\n       ROUND(AVG((julianday(retirado) - julianday(aceptado)) * 1440), 1) AS min_cocina,\n       ROUND(AVG((julianday(entregado) - julianday(retirado)) * 1440), 1) AS min_calle\nFROM delivery_pedidos\nWHERE estado = 'entregado';"]],
    },
  ];

  // ---------------------------------------------------------------- utilidades

  const tablasDatos = () => (window.Engines && window.Engines.SQL.tables) || {};
  const fecha = /^\d{4}-\d{2}-\d{2}$/, fechaHora = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/, mes = /^\d{4}-\d{2}$/;
  const cacheTipos = {};
  function tipoColumna(tabla, col) {
    const k = tabla + '.' + col;
    if (k in cacheTipos) return cacheTipos[k];
    const t = tablasDatos()[tabla]; if (!t) return '';
    const j = t.columns.indexOf(col);
    const vals = t.rows.slice(0, 400).map((r) => r[j]).filter((v) => v !== null && v !== undefined && v !== '');
    let tipo = 'texto';
    if (!vals.length) tipo = '';
    else if (vals.every((v) => typeof v === 'number')) tipo = vals.every(Number.isInteger) ? (vals.every((v) => v === 0 || v === 1) && /^(es_|activo|estimada|pagada|resuelto|fraude)/.test(col) ? 'bool' : 'entero') : 'decimal';
    else if (vals.every((v) => fecha.test(v))) tipo = 'fecha';
    else if (vals.every((v) => fechaHora.test(v))) tipo = 'fecha_hora';
    else if (vals.every((v) => mes.test(v))) tipo = 'mes';
    cacheTipos[k] = tipo;
    return tipo;
  }
  function baseDeTabla(tabla) { return BASES.find((b) => tabla in b.tablas); }
  function infoBase(id) {
    const b = BASES.find((x) => x.id === id); if (!b) return null;
    const c = ((window.DataGen && window.DataGen.CASOS) || []).find((x) => x.id === id) || {};
    return { ...c, ...b };
  }
  // columnas de una tabla real, con PK y FK
  function columnasTabla(b, tabla) {
    const t = tablasDatos()[tabla]; const meta = b.tablas[tabla] || {};
    const fks = new Map(b.rels.filter((r) => r[0] === tabla).map((r) => [r[1], r[2]]));
    return (t ? t.columns : []).map((c) => ({ n: c, t: tipoColumna(tabla, c), pk: (meta.pk || []).includes(c), fk: fks.get(c) || null }));
  }

  // ---------------------------------------------------------------- diagrama entidad-relación (SVG)

  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, txt) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (txt != null) e.textContent = txt; return e; };

  /**
   * Dibuja un diagrama ER.
   * tablas: [{ nombre, sub, cols: [{ n, t, pk, fk }], clase }]; rels: [hija, col, padre, colPadre, nota]
   */
  function dibujarER(contenedor, tablas, rels, opts = {}) {
    const W = opts.ancho || 232, FILA = 19, CAB = 34, GAPX = opts.gapx || 84, GAPY = 26;
    const porNombre = Object.fromEntries(tablas.map((t) => [t.nombre, t]));
    // nivel: los padres a la izquierda, las tablas que dependen de ellas a la derecha
    const nivel = {};
    const calc = (n, vis = new Set()) => {
      if (n in nivel) return nivel[n];
      if (vis.has(n)) return 0; vis.add(n);
      const padres = rels.filter((r) => r[0] === n && r[2] !== n && porNombre[r[2]]).map((r) => r[2]);
      nivel[n] = padres.length ? 1 + Math.max(...padres.map((p) => calc(p, vis))) : 0;
      return nivel[n];
    };
    tablas.forEach((t) => calc(t.nombre));
    if (opts.niveles) Object.assign(nivel, opts.niveles);
    const cols = [];
    tablas.forEach((t) => { (cols[nivel[t.nombre]] = cols[nivel[t.nombre]] || []).push(t); });
    const pos = {};
    cols.forEach((lista, i) => {
      if (i > 0) { // ordenar por la posición promedio de sus padres
        const peso = (t) => { const ps = rels.filter((r) => r[0] === t.nombre && pos[r[2]]).map((r) => pos[r[2]].y); return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 1e6; };
        lista.sort((a, b) => peso(a) - peso(b));
      }
      let y = 10;
      for (const t of lista) {
        const h = CAB + t.cols.length * FILA + 6;
        pos[t.nombre] = { x: 10 + i * (W + GAPX), y, w: W, h };
        y += h + GAPY;
      }
    });
    const anchoTotal = 20 + cols.length * W + (cols.length - 1) * GAPX + 40;
    const altoTotal = Math.max(...Object.values(pos).map((p) => p.y + p.h)) + 20;
    const svg = el('svg', { viewBox: `0 0 ${anchoTotal} ${altoTotal}`, width: anchoTotal, class: 'er-svg', role: 'img', 'aria-label': opts.titulo || 'Diagrama entidad-relación' });
    const capaL = el('g', { class: 'er-lineas' }), capaT = el('g', { class: 'er-tablas' });
    svg.append(capaL, capaT);
    const filaY = (tabla, col) => { const t = porNombre[tabla]; const i = t.cols.findIndex((c) => c.n === col); return pos[tabla].y + CAB + (i < 0 ? 0 : i) * FILA + FILA / 2 + 2; };
    const contador = {};
    rels.forEach((r, k) => {
      const [hija, col, padre, colP, nota] = r;
      if (!pos[hija] || !pos[padre]) return;
      const a = pos[hija], b = pos[padre];
      const y1 = filaY(hija, col), y2 = filaY(padre, colP);
      const g = el('g', { class: 'er-rel' + (nota && /opcional|lógica|0\.\.1/.test(nota) ? ' er-opcional' : ''), 'data-a': hija, 'data-b': padre });
      let d;
      let xMuchos, dirMuchos, xUno, dirUno;
      if (hija === padre) { // auto-referencia: lazo por la derecha
        const x = a.x + a.w, off = 26;
        d = `M${x},${y1} H${x + off} V${y2} H${x}`;
        xMuchos = x; dirMuchos = 1; xUno = x; dirUno = 1;
      } else if (b.x + b.w < a.x) { // el padre está a la izquierda
        const n = (contador[a.x] = (contador[a.x] || 0) + 1);
        const mx = b.x + b.w + GAPX / 2 + ((n % 5) - 2) * 7;
        d = `M${a.x},${y1} H${mx} V${y2} H${b.x + b.w}`;
        xMuchos = a.x; dirMuchos = -1; xUno = b.x + b.w; dirUno = 1;
      } else { // misma columna: por la izquierda
        const mx = Math.min(a.x, b.x) - 22 - (k % 3) * 6;
        d = `M${a.x},${y1} H${mx} V${y2} H${b.x}`;
        xMuchos = a.x; dirMuchos = -1; xUno = b.x; dirUno = -1;
      }
      g.append(el('path', { d, class: 'er-linea' }));
      // pata de gallo (muchos) del lado de la hija, barra (uno) del lado del padre
      const pie = (x, y, dir) => { const p = x + dir * 12; return `M${p},${y} L${x},${y - 6} M${p},${y} L${x},${y} M${p},${y} L${x},${y + 6}`; };
      const barra = (x, y, dir) => `M${x + dir * 8},${y - 6} V${y + 6} M${x + dir * 12},${y - 6} V${y + 6}`;
      g.append(el('path', { d: pie(xMuchos, y1, dirMuchos), class: 'er-marca' }), el('path', { d: barra(xUno, y2, dirUno), class: 'er-marca' }));
      if (nota) g.append(el('title', {}, `${hija}.${col} → ${padre}.${colP}: ${nota}`)); else g.append(el('title', {}, `${hija}.${col} → ${padre}.${colP} (muchos a uno)`));
      capaL.append(g);
    });
    for (const t of tablas) {
      const p = pos[t.nombre];
      const g = el('g', { class: 'er-tabla ' + (t.clase || ''), 'data-t': t.nombre, transform: `translate(${p.x},${p.y})` });
      g.append(el('rect', { width: p.w, height: p.h, rx: 8, class: 'er-caja' }), el('path', { d: `M0,8 a8,8 0 0 1 8,-8 H${p.w - 8} a8,8 0 0 1 8,8 V${CAB - 4} H0 Z`, class: 'er-cab' }));
      g.append(el('text', { x: 10, y: 15, class: 'er-nombre' }, t.nombre));
      if (t.sub) { const max = Math.floor((p.w - 20) / 5.3); g.append(el('text', { x: 10, y: 28, class: 'er-sub' }, t.sub.length > max ? t.sub.slice(0, max - 1) + '…' : t.sub)); }
      t.cols.forEach((c, i) => {
        const y = CAB + i * FILA + 14;
        if (i % 2) g.append(el('rect', { x: 1, y: CAB + i * FILA - 1, width: p.w - 2, height: FILA, class: 'er-par' }));
        g.append(el('text', { x: 10, y, class: 'er-ico' }, c.pk ? '🔑' : c.fk ? '🔗' : '·'));
        g.append(el('text', { x: 28, y, class: 'er-col' + (c.pk ? ' er-pk' : '') + (c.fk ? ' er-fk' : '') }, c.n.length > 24 ? c.n.slice(0, 23) + '…' : c.n));
        if (c.t) g.append(el('text', { x: p.w - 10, y, class: 'er-tipo', 'text-anchor': 'end' }, c.t));
      });
      g.append(el('title', {}, `${t.nombre}${t.grano ? ' — una fila = ' + t.grano : ''}`));
      capaT.append(g);
    }
    // resaltar relaciones al pasar el mouse por una tabla
    svg.addEventListener('mouseover', (e) => {
      const g = e.target.closest('.er-tabla'); if (!g) return;
      const n = g.dataset.t;
      svg.classList.add('er-foco');
      svg.querySelectorAll('.er-rel').forEach((r) => r.classList.toggle('activa', r.dataset.a === n || r.dataset.b === n));
      svg.querySelectorAll('.er-tabla').forEach((t) => t.classList.toggle('activa', t.dataset.t === n || rels.some((r) => (r[0] === n && r[2] === t.dataset.t) || (r[2] === n && r[0] === t.dataset.t))));
    });
    svg.addEventListener('mouseleave', () => { svg.classList.remove('er-foco'); });
    if (opts.onTabla) svg.addEventListener('click', (e) => { const g = e.target.closest('.er-tabla'); if (g) opts.onTabla(g.dataset.t); });
    contenedor.innerHTML = '';
    contenedor.append(svg);
    return svg;
  }

  function dibujarBase(contenedor, id, opts = {}) {
    const b = infoBase(id); if (!b) return;
    const tablas = b.orden.filter((n) => tablasDatos()[n]).map((n) => ({ nombre: n, sub: `${tablasDatos()[n].rows.length.toLocaleString('es')} filas · 1 fila = ${b.tablas[n].grano.split(/[,(;:]/)[0].trim()}`, grano: b.tablas[n].grano, cols: columnasTabla(b, n) }));
    return dibujarER(contenedor, tablas, b.rels, { titulo: `Modelo de ${b.nombre}`, ...opts });
  }
  function dibujarEstrella(contenedor, id) {
    const b = infoBase(id); if (!b || !b.estrella) return;
    const keyDe = (c) => (c.match(/^(\w+_key)\b/) || [])[1];
    const dims = b.estrella.dims.map((d) => ({ nombre: d.nombre, clase: 'er-dim', sub: 'dimensión', cols: d.cols.map((c, i) => ({ n: c, pk: i === 0 })) }));
    const hechos = b.estrella.hechos.map((f) => ({ nombre: f.nombre, clase: 'er-hecho', sub: 'hechos · 1 fila = ' + f.grano.split(/[,(]/)[0].trim(), grano: f.grano, cols: f.cols.map((c) => ({ n: c, fk: !!keyDe(c) })) }));
    const rels = [];
    for (const f of hechos) {
      for (const c of f.cols) {
        const k = keyDe(c.n); if (!k) continue;
        // fecha_venc_key, origen_key… se resuelven contra la dimensión que tiene esa clave o una parecida
        const dim = dims.find((d) => d.cols[0].n === k) || dims.find((d) => /fecha|mes/.test(k) && /fecha|mes/.test(d.cols[0].n)) || dims.find((d) => /origen|destino/.test(k) && /aeropuerto/.test(d.nombre));
        if (dim) rels.push([f.nombre, c.n, dim.nombre, dim.cols[0].n]);
      }
    }
    // dimensiones a la izquierda y hechos a la derecha
    const niveles = Object.fromEntries([...dims.map((d) => [d.nombre, 0]), ...hechos.map((h) => [h.nombre, 1])]);
    return dibujarER(contenedor, [...dims, ...hechos], rels, { titulo: `Modelo estrella de ${b.nombre}`, niveles, gapx: 120 });
  }

  window.Bases = { BASES, infoBase, baseDeTabla, columnasTabla, tipoColumna, dibujarER, dibujarBase, dibujarEstrella };
})();
