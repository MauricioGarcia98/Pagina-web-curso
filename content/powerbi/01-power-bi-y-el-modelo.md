---
titulo: Power BI y el modelo semántico - de los datos al tablero
nivel: Básico
duracion: 40
resumen: Qué es Power BI, cómo es el camino completo (obtener datos, Power Query, modelo, DAX, informe y publicar), qué es un esquema estrella y cómo viajan los filtros por las relaciones. Tus primeras consultas DAX sobre las tablas de la tienda.
objetivos: Explicar el flujo completo de Power BI Desktop y Service | Distinguir tabla de hechos y tabla de dimensión | Leer una relación de varios a uno y saber hacia dónde filtra | Escribir consultas EVALUATE para mirar los datos del modelo
autoevaluacion: ¿Sabes qué parte del trabajo se hace en Power Query y qué parte en DAX? | ¿Sabes por qué un filtro de la tabla clientes afecta a pedidos y no al revés? | ¿Sabes ver las primeras filas de una tabla con una consulta DAX?
---

:::escenario
La gerencia quiere un tablero con las ventas por país y por canal, que se actualice solo cada mañana. Los datos ya están en la base de la tienda. Tu trabajo como persona de datos es dejar un **modelo** limpio (tablas, relaciones y medidas) para que cualquiera pueda armar gráficos sin escribir SQL.
:::

## El camino completo

Power BI es la herramienta de Microsoft para pasar de datos a tableros. Tiene dos partes:

- **Power BI Desktop**: la aplicación donde se construye todo (en Windows). En el curso tienes una práctica en el navegador: el [laboratorio de Power BI](#/powerbi).
- **Power BI Service** (app.powerbi.com): la web donde se **publica** el informe, se comparte, se programa la actualización y se arman paneles.

```diagrama
titulo: El recorrido de un informe en Power BI
nodo o: Obtener datos\n(Excel, CSV, SQL, web) | icono=base | col=0
nodo pq: Power Query\n(limpiar y dar forma) | icono=tabla | col=1
nodo m: Modelo semántico\n(tablas y relaciones) | icono=cubo | col=2
nodo dax: DAX\n(medidas) | icono=codigo | col=3
nodo i: Informe\n(objetos visuales) | icono=dashboard | col=4
nodo s: Power BI Service\n(publicar y compartir) | icono=nube | col=5
flecha o -> pq
flecha pq -> m: Cerrar y aplicar
flecha m -> dax
flecha dax -> i
flecha i -> s: Publicar
```

| Etapa | Herramienta | Lenguaje | Qué hace |
|---|---|---|---|
| Transformar | Power Query | **M** | Quita columnas, cambia tipos, filtra, combina consultas. Cada clic es un "paso aplicado". |
| Modelar | Vista de modelo | — | Relaciones entre tablas, cardinalidad y dirección del filtro. |
| Calcular | Medidas | **DAX** | Fórmulas como "ventas", "ticket promedio", "% del total". |
| Visualizar | Vista de informe | — | Gráficos, tarjetas, segmentaciones y filtros. |

:::tip Regla práctica
Limpia en **Power Query** (o mejor, antes: en el data warehouse con SQL o dbt). Calcula en **DAX**. Si una columna se puede calcular una vez al cargar, no la hagas medida.
:::

## Hechos y dimensiones: el esquema estrella

Un modelo de Power BI funciona mejor como **estrella**: una tabla de **hechos** en el centro (lo que pasó: cada pedido, cada línea vendida) y **dimensiones** alrededor (quién, qué, dónde, cuándo).

En la tienda del curso:

- **Hechos**: `pedidos` (un pedido por fila) y `detalle_pedidos` (una línea de producto por fila).
- **Dimensiones**: `clientes`, `productos`, `categorias`, `empleados`.

Cada relación es de **varios a uno** (`*:1`): muchos pedidos tienen el mismo cliente. Se escribe `pedidos[cliente_id] * → 1 clientes[cliente_id]`.

```diagrama
titulo: Parte del modelo de la tienda (las flechas muestran hacia dónde viaja el filtro)
nodo cli: clientes\n(dimensión) | icono=usuario | col=0 | fila=0
nodo ped: pedidos\n(hechos) | icono=tabla | col=1 | fila=0
nodo det: detalle_pedidos\n(hechos) | icono=tabla | col=2 | fila=0
nodo pro: productos\n(dimensión) | icono=cubo | col=2 | fila=1
nodo cat: categorias\n(dimensión) | icono=etiqueta | col=1 | fila=1
flecha cli -> ped: 1 → *
flecha ped -> det: 1 → *
flecha pro -> det: 1 → *
flecha cat -> pro: 1 → *
```

:::analogia
El filtro es como agua que baja: nace en el lado **1** (la dimensión) y cae hacia el lado **\*** (los hechos). Si en un gráfico eliges "Argentina" en `clientes[pais]`, el filtro baja a `pedidos` (solo pedidos de clientes argentinos) y de ahí a `detalle_pedidos`. Al revés no sube, salvo que configures la relación en **ambas direcciones**.
:::

## Modos de almacenamiento (en una frase cada uno)

- **Import**: copia los datos dentro del archivo. Es el más rápido y el más común. Se actualiza con una programación.
- **DirectQuery**: no copia nada; cada gráfico consulta la base en vivo. Sirve para datos enormes o que cambian a cada minuto, pero es más lento.
- **Direct Lake** (en Microsoft Fabric): lee tablas Delta del lakehouse sin copiarlas ni consultarlas por SQL.

## DAX también sirve para mirar datos

En Power BI Desktop hay una **vista de consultas DAX** (el ícono `</>` de la izquierda). Una consulta DAX siempre empieza con `EVALUATE` seguida de algo que devuelve una **tabla**:

```dax
EVALUATE categorias                                -- toda la tabla
EVALUATE TOPN(10, productos, productos[precio])    -- los 10 productos más caros
EVALUATE VALUES(pedidos[canal])                    -- los valores distintos de una columna
EVALUATE ROW("Pedidos", COUNTROWS(pedidos))        -- un solo número, como tabla de una fila
```

:::nota Cómo se escriben las columnas
En DAX, una columna se escribe **`Tabla[columna]`**: `pedidos[canal]`. Si el nombre de la tabla tiene espacios, va entre comillas simples: `'Detalle de pedidos'[cantidad]`. Los textos van entre comillas dobles: `"web"`.
:::

## Practica

Los ejercicios corren sobre el **modelo de la tienda**: las mismas tablas del laboratorio SQL, con sus relaciones. Escribe la consulta y pulsa **Ejecutar**. **Comprobar** la compara con la respuesta esperada.

:::ejercicio dax dificultad=Básico titulo="Ver una tabla completa"
Muestra la tabla `categorias` completa con una consulta DAX.
```dax solucion
EVALUATE categorias
```
```pista
Una consulta DAX empieza con `EVALUATE` y sigue con una tabla: `EVALUATE nombre_de_la_tabla`.
```
:::

:::ejercicio dax dificultad=Básico titulo="Valores distintos"
¿Por qué canales se venden los pedidos? Muestra los valores distintos de `pedidos[canal]`.
```dax inicial
EVALUATE
    VALUES(...)
```
```dax solucion
EVALUATE VALUES(pedidos[canal])
```
```pista
`VALUES(Tabla[columna])` devuelve una tabla con los valores distintos de esa columna.
```
:::

:::ejercicio dax dificultad=Básico titulo="Contar filas"
Devuelve una tabla de una fila con una columna `Pedidos` que tenga la cantidad de pedidos.
```dax inicial
EVALUATE
    ROW("Pedidos", ...)
```
```dax solucion
EVALUATE ROW("Pedidos", COUNTROWS(pedidos))
```
```pista
`COUNTROWS(pedidos)` cuenta las filas de la tabla. `ROW("Nombre", valor)` lo convierte en una tabla de una fila.
```
:::

:::ejercicio dax dificultad=Básico titulo="Filtrar filas"
Muestra los productos con precio mayor a 1000 (todas las columnas de `productos`).
```dax inicial
EVALUATE
    FILTER(productos, ...)
```
```dax solucion
EVALUATE FILTER(productos, productos[precio] > 1000)
```
```pista
`FILTER(tabla, condición)` deja las filas que cumplen la condición: `productos[precio] > 1000`.
```
:::

:::ejercicio dax dificultad=Básico titulo="Dos condiciones"
Muestra los clientes de `"Argentina"` del segmento `"Pyme"`.
```dax solucion
EVALUATE FILTER(clientes, clientes[pais] = "Argentina" && clientes[segmento] = "Pyme")
```
```pista
En DAX, "y" se escribe `&&` y "o" se escribe `||`. Los textos van entre comillas dobles.
```
:::

:::ejercicio quiz dificultad=Básico
En el modelo de la tienda, eliges "Chile" en una segmentación de `clientes[pais]`. ¿Qué pasa con un gráfico que suma `detalle_pedidos[cantidad]`?
- [ ] No cambia: el filtro solo afecta a la tabla clientes
- [x] Muestra solo las unidades de pedidos de clientes chilenos: el filtro baja de clientes a pedidos y de pedidos a detalle_pedidos
- [ ] Da error porque detalle_pedidos no tiene la columna pais
- [ ] Filtra los clientes que compraron más unidades
```explicacion
Las relaciones van de la dimensión (lado 1) a los hechos (lado *). El filtro de `clientes` llega a `pedidos` por `cliente_id` y de `pedidos` a `detalle_pedidos` por `pedido_id`.
```
:::

:::ejercicio quiz dificultad=Básico
¿Dónde conviene quitar las filas duplicadas y cambiar el tipo de una columna de texto a fecha?
- [x] En Power Query (o antes, en el data warehouse): son transformaciones de datos
- [ ] En una medida DAX
- [ ] En el panel Formato del objeto visual
- [ ] En Power BI Service, después de publicar
:::

:::ejercicio quiz dificultad=Intermedio
Tu tabla de ventas tiene 2.000 millones de filas y los datos cambian a cada minuto. ¿Qué modo de almacenamiento evalúas primero?
- [ ] Import, porque siempre es el más rápido
- [x] DirectQuery (o Direct Lake si los datos están en un lakehouse de Fabric): no copia los datos y consulta lo último
- [ ] Ninguno: Power BI no admite tablas tan grandes
- [ ] Pegar los datos con "Escribir datos"
:::

## En el trabajo

:::trabajo
- El modelo semántico se **publica una vez** y lo usan muchos informes. Por eso el data engineer cuida los nombres de tablas y columnas, oculta las claves técnicas y deja las medidas listas.
- Los equipos guardan el informe como **proyecto de Power BI (.pbip)**: carpetas de texto (el modelo en TMDL, el informe en JSON) que se versionan con Git y se revisan en pull requests.
:::

:::entrevista "¿Por qué un esquema estrella y no una sola tabla gigante con todo?"
Porque las relaciones de varios a uno hacen que los filtros sean predecibles, las dimensiones se reutilizan entre tablas de hechos y el motor comprime mejor columnas con pocos valores distintos. Una tabla plana repite datos (el nombre del cliente en cada línea), ocupa más y complica las medidas que necesitan el grano de pedido y el de línea al mismo tiempo.
:::
