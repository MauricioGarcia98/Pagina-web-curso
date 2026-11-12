# examen: powerbi

## Modelo estrella
leccion: powerbi-power-bi-y-el-modelo
En un modelo estrella, ¿qué guarda la tabla de hechos?
- [ ] Las descripciones de clientes y productos, con una fila por cada uno de ellos.
- [x] Los eventos que se miden (ventas, pedidos) con sus claves y cantidades.
- [ ] Las medidas DAX del informe.
- [ ] Los colores y formatos de los gráficos.
porque: La tabla de hechos tiene una fila por evento y columnas numéricas para sumar; las dimensiones describen quién, qué, cuándo y dónde.

## Sentido de la relación
leccion: powerbi-power-bi-y-el-modelo
Una relación uno a varios entre `Clientes` y `Ventas` filtra, por defecto, ¿en qué sentido?
- [x] De `Clientes` (lado uno) hacia `Ventas` (lado varios).
- [ ] De `Ventas` hacia `Clientes`.
- [ ] En los dos sentidos siempre.
- [ ] En ninguno, hasta que se escribe una medida con DAX.
porque: Los filtros viajan de la dimensión al hecho: al elegir un cliente, se filtran sus ventas.

## Medida o columna
leccion: powerbi-primeras-medidas
¿Cuál es la diferencia principal entre una medida y una columna calculada?
- [ ] La medida ocupa más memoria que la columna.
- [ ] La columna solo acepta números enteros.
- [x] La medida se calcula al momento según los filtros; la columna se calcula fila por fila al cargar.
- [ ] No hay diferencia: son dos nombres para lo mismo y se guardan igual en el modelo de datos.
porque: Una columna calculada se guarda en el modelo; una medida se evalúa en cada celda del visual con su contexto de filtro.

## Sumar una división
leccion: powerbi-primeras-medidas
Quieres el ticket promedio (ventas / pedidos). ¿Cómo conviene hacerlo?
- [ ] Una columna calculada con la división en cada fila y después sumar esa columna.
- [x] Una medida: `DIVIDE(SUM(Ventas[Monto]), DISTINCTCOUNT(Ventas[PedidoID]))`.
- [ ] Promediar la columna de montos con `AVERAGE` siempre.
- [ ] Escribir el número a mano en una tarjeta.
porque: Los cocientes se calculan sobre los totales del contexto. `DIVIDE` además evita el error de dividir por cero.

## CALCULATE
leccion: powerbi-calculate-y-contexto
¿Qué hace `CALCULATE(SUM(Ventas[Monto]), Clientes[Pais] = "Chile")`?
- [ ] Suma las ventas y después borra las de Chile.
- [x] Evalúa la suma cambiando el contexto de filtro para que el país sea Chile.
- [ ] Crea una tabla nueva en el modelo que contiene solamente las ventas de Chile.
- [ ] Cambia el país de todos los clientes a Chile.
porque: `CALCULATE` modifica los filtros antes de evaluar la expresión. Es la función central de DAX.

## Porcentaje del total
leccion: powerbi-calculate-y-contexto
Para calcular el porcentaje de cada país sobre el total, ¿qué función quita el filtro de país en el denominador?
- [ ] `SUMX`
- [ ] `RELATED`
- [x] `ALL` (o `REMOVEFILTERS`)
- [ ] `FORMAT`
porque: `CALCULATE([Ventas], ALL(Clientes[Pais]))` devuelve el total ignorando el país de la fila del visual.

## Iteradores
leccion: powerbi-iteradores-y-related
¿Cuándo hace falta `SUMX` en lugar de `SUM`?
- [ ] Cuando la tabla tiene más de un millón de filas y `SUM` ya no alcanza para recorrerla.
- [x] Cuando hay que calcular algo fila por fila (precio × cantidad) y sumar el resultado.
- [ ] Cuando la columna es de texto.
- [ ] Nunca: `SUM` hace lo mismo y es más corto.
porque: `SUM` suma una columna que ya existe. `SUMX` recorre la tabla, evalúa una expresión en cada fila y suma.

## RELATED
leccion: powerbi-iteradores-y-related
Dentro de `SUMX(Ventas, ...)` necesitas el precio de lista que está en `Productos`. ¿Qué usas?
- [ ] `LOOKUP`, que busca por texto en cualquier tabla del modelo aunque no tenga relación.
- [x] `RELATED(Productos[Precio])`, que sigue la relación desde la fila de ventas.
- [ ] `ALL(Productos)`.
- [ ] `VALUES(Ventas)`.
porque: `RELATED` trae un valor de la tabla del lado "uno" de la relación para la fila actual.

## Tabla de fechas
leccion: powerbi-inteligencia-de-tiempo
¿Qué necesitan las funciones de inteligencia de tiempo, como `TOTALYTD` o `SAMEPERIODLASTYEAR`?
- [ ] Que la tabla de hechos esté ordenada por fecha de menor a mayor antes de cargarla.
- [x] Una tabla de fechas completa, sin huecos, relacionada con los hechos.
- [ ] Que todas las fechas estén guardadas como texto.
- [ ] Un visual de líneas en la página.
porque: Estas funciones desplazan períodos sobre una tabla de calendario continua. Con huecos o sin relación, dan resultados equivocados.

## Consultas DAX
leccion: powerbi-consultas-dax-y-proyecto
¿Con qué palabra empieza una consulta DAX que devuelve una tabla?
- [ ] `SELECT`
- [x] `EVALUATE`
- [ ] `RETURN`
- [ ] `QUERY`
porque: Una consulta DAX empieza con `EVALUATE` seguido de una expresión de tabla, por ejemplo `EVALUATE SUMMARIZECOLUMNS(...)`.
