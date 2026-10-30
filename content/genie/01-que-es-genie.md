---
titulo: ¿Qué es Databricks Genie?
nivel: Básico
duracion: 40
resumen: Desde cero - qué problema resuelve preguntarle a los datos en lenguaje natural, la familia Genie (Genie One, Genie Agents y Genie Code), cómo convierte Genie una pregunta en SQL, qué preguntas responde bien y cuáles no, quién ve qué datos, cuánto cuesta y dónde probarlo gratis.
objetivos: Explicar qué es Genie y para qué sirve cada producto de la familia | Describir el recorrido de una pregunta hasta la respuesta | Distinguir preguntas que Genie responde bien de las que no | Explicar cómo se respetan los permisos de Unity Catalog | Saber dónde practicar sin costo
prerrequisitos: databricks-que-es-databricks | databricks-unity-catalog
autoevaluacion: ¿Sabes qué diferencia hay entre Genie One, un Genie Agent y Genie Code? | ¿Sabes por qué Genie no responde "por qué bajaron las ventas"? | ¿Sabes con qué permisos ve los datos cada usuario?
---

:::escenario
La gerente comercial de Tienda Andina le escribe al equipo de datos cinco veces por semana: "¿cuánto vendimos en Chile el mes pasado?", "¿qué canal creció más?", "¿cuántos clientes nuevos tuvimos en marzo?". Cada pregunta es una consulta SQL de dos minutos, pero entre que llega, alguien la ve, la escribe y la responde pasa un día. Y el tablero no tiene justo ese corte. ¿Y si ella pudiera preguntarle directamente a los datos, en español, y recibir la respuesta con la tabla y el gráfico, sabiendo que el número es el mismo que calcularía el equipo?
:::

## El problema que resuelve

En casi todas las empresas hay muchas más **preguntas** que personas que saben SQL. Los tableros responden las preguntas que alguien previó; las demás terminan en un correo al equipo de datos. Genie ataca ese cuello de botella: una persona de negocio escribe la pregunta en lenguaje natural ("¿cuál fue el ticket promedio por canal en marzo?") y Genie:

1. Entiende qué datos necesita.
2. **Escribe la consulta SQL**.
3. La ejecuta sobre las tablas de la empresa.
4. Devuelve la tabla, un resumen en palabras y, si sirve, un gráfico.

La clave, y lo que lo diferencia de pegar una pregunta en un chatbot genérico, es que la respuesta sale de **los datos reales de la empresa**, con **los permisos** de quien pregunta, y con las **definiciones** que el equipo de datos le enseñó (qué es "venta neta", qué es "cliente activo").

:::analogia Un analista nuevo en el equipo
La documentación de Databricks lo compara con un analista de datos que acaba de entrar a la empresa: sabe SQL muy bien, pero no conoce la jerga del negocio ni las particularidades de cada tabla. Si le das buena documentación, ejemplos de consultas y las definiciones de los indicadores, responde bien. Si le das 80 tablas sin descripción, se equivoca. Configurar Genie es, justamente, entrenar a ese analista nuevo.
:::

## La familia Genie

"Genie" es el nombre de varios productos de Databricks. Según la documentación oficial (octubre de 2026), son tres:

| Producto | Para quién | Qué hace | Nombre anterior |
|---|---|---|---|
| **Genie One** | Personas de negocio | Una interfaz simple para buscar tableros, hacer preguntas en lenguaje natural y usar aplicaciones, sin ver notebooks, clústeres ni consultas | Databricks One |
| **Genie Agents** | Los configura el equipo de datos; los usan las personas de negocio | Un espacio de conversación sobre **un tema** (ventas, inventario, soporte) con las tablas, las definiciones y los ejemplos que el equipo eligió | Genie Spaces |
| **Genie Code** | Personas técnicas (ingenieros, analistas, científicos de datos) | El asistente de programación dentro de Databricks: escribe, explica y corrige código en notebooks, en el editor de SQL, en pipelines y tableros | Databricks Assistant |

En el resto del módulo vas a ver los tres, pero el corazón es el **Genie Agent**: es lo que construye un data engineer o un analista para que las preguntas de negocio tengan buenas respuestas. Genie One es la "puerta de entrada" donde la persona de negocio encuentra y usa esos agentes.

:::nota Nombres viejos en internet
En tutoriales, videos y certificaciones de 2024 y 2025 vas a leer "Genie Space", "AI/BI Genie", "Databricks Assistant" y "Databricks One". Son los nombres anteriores de lo mismo: Genie Agent, Genie Agent, Genie Code y Genie One.
:::

## Cómo responde Genie una pregunta

La documentación explica que Genie no es un único modelo de lenguaje sino un **sistema compuesto** (*compound AI system*): varias piezas que trabajan juntas. El recorrido de una pregunta es este:

```recorrido
titulo: De una pregunta en español a una respuesta con datos (tienda del curso, marzo de 2024)
estacion pregunta: La pregunta | icono=usuario
estacion contexto: El contexto del agente | icono=libro
estacion sql: El SQL generado | icono=codigo
estacion warehouse: El SQL warehouse | icono=base
estacion respuesta: La respuesta | icono=dashboard
paso pregunta: La gerente pregunta
Escribe en el Genie Agent de ventas, en español y sin saber SQL.
>>> texto
¿Cuánto vendimos por canal en marzo de 2024?
paso contexto: Genie busca contexto
Lee las descripciones de tablas y columnas, los sinónimos, las definiciones de métricas y las consultas de ejemplo parecidas a la pregunta. Así sabe que "vendimos" es la medida **ventas netas** y que los cancelados no cuentan.
>>> yaml
medida: ventas_netas = SUM(cantidad * precio_unitario * (1 - descuento))
filtro: estado <> 'cancelado'
sinónimos: [ventas, facturación, vendimos]
paso sql: Genie escribe el SQL
Razona en pasos (qué tablas, qué columnas, qué filtros, cómo agrupar) y escribe una sola consulta. Si la pregunta fuera ambigua, podría preguntar antes.
>>> sql
SELECT p.canal,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado'
  AND p.fecha_pedido >= '2024-03-01' AND p.fecha_pedido < '2024-04-01'
GROUP BY p.canal
ORDER BY ventas DESC
paso warehouse: Se ejecuta con los permisos de quien pregunta
La consulta corre en un SQL warehouse, pero los datos se leen con los permisos de Unity Catalog de la gerente: si ella no puede ver una tabla, Genie tampoco.
>>> log
warehouse: serverless-starter · usuario: gerente.comercial · tablas: pedidos, detalle_pedidos ✓ SELECT
paso respuesta: La respuesta
Genie devuelve la tabla, un resumen en palabras y un gráfico. Con **Show code** se ve el SQL; con **Is this correct?** la gerente da su opinión.
>>> tabla
canal,ventas
web,192098.47
app,106357.03
tienda,84047.87
telefono,30212.59
```

Tres ideas que conviene retener desde ahora:

1. **Genie escribe SQL.** Todo lo que sabes de SQL sirve para revisar y mejorar sus respuestas. La opción **Show code** muestra la consulta exacta.
2. **La calidad depende del contexto**, no de la pregunta. Buenas descripciones, buenos ejemplos y buenas definiciones dan buenas respuestas. Eso es trabajo del equipo de datos.
3. **No es determinista**: como todo modelo de lenguaje, la misma pregunta puede dar respuestas distintas. Los ejemplos SQL verificados (lección 3) lo hacen mucho más predecible.

## Qué preguntas responde bien (y cuáles no)

Genie traduce preguntas a SQL. Por eso responde muy bien las preguntas que **tienen una respuesta en los datos**, y no puede responder las que piden una opinión o una explicación de causas. La documentación lo muestra con esta comparación:

| Responde bien | No puede responder bien |
|---|---|
| ¿Cuánto vendimos este trimestre? | ¿Por qué bajaron las ventas este trimestre? |
| ¿Qué clientes generaron más ingresos? | ¿Cómo le vendo más al cliente M? |
| ¿Qué vendedores vendieron más? | ¿Qué incentivos le doy al equipo de ventas? |
| ¿Qué campañas rindieron más en 2024? | ¿Cómo mejoro mi estrategia de marketing? |
| ¿Qué regiones dejaron más margen? | ¿Cuáles son las mejores regiones? (¿mejores según qué?) |

La regla práctica: **preguntas específicas y medibles**. "¿Cuáles son las mejores regiones?" mejora a "¿qué regiones tuvieron más ventas netas en 2024?". Para preguntas exploratorias más complejas ("investiga qué cambió en las ventas de marzo"), Genie Agents tiene el **modo agente** (*Agent mode*), que divide la pregunta en varios pasos, ejecuta varias consultas y arma un informe; lo vemos en la lección 4.

## Quién ve qué: los permisos

Un miedo habitual es: "si le doy Genie a toda la empresa, ¿cualquiera va a ver los sueldos?". La respuesta de la documentación es clara: un Genie Agent usa **dos credenciales distintas**:

- **El cómputo** (el SQL warehouse) se usa con las credenciales de quien configuró el agente. Así, los usuarios de negocio no necesitan permisos sobre el warehouse.
- **Los datos** se leen **siempre con los permisos de Unity Catalog de quien pregunta**. Si una persona no tiene `SELECT` sobre una tabla, Genie no le muestra esos datos. Los filtros de filas y las máscaras de columnas de Unity Catalog se aplican igual.

Por eso la seguridad de Genie no se configura en Genie: se configura en **Unity Catalog**, como cualquier otro acceso a datos.

## Cuánto cuesta y dónde practicar

Según la documentación de presupuestos de Genie (octubre de 2026):

- **Genie One y Genie Agents** son gratis para los usuarios **hasta el 31 de enero de 2027** (no así para los *service principals*, cuyo uso se cobra). Lo que sí se paga es el SQL warehouse que ejecuta las consultas.
- **Genie Code** se cobra desde el 8 de julio de 2026 por uso, con una **cantidad gratuita mensual por usuario**.

Para practicar sin pagar, **Databricks Free Edition** incluye Genie (su documentación menciona Genie para tableros interactivos y Genie Code para ayuda con código). El proyecto final de este módulo está pensado para hacerse ahí; si todavía no tienes cuenta, sigue la guía de Free Edition del módulo de Laboratorios.

:::errores
- **Pensar que Genie "sabe" de tu negocio**: solo sabe lo que le das en el contexto. Sin definiciones, "venta" puede ser bruto, neto o con cancelados.
- **Darle todas las tablas de la empresa**: más tablas confunden. La documentación recomienda empezar con cinco o menos.
- **Confiar en una respuesta sin mirar el SQL**: "Show code" existe para verificar.
- **Configurar la seguridad en el agente**: el acceso a los datos lo decide Unity Catalog.
- **Pedirle opiniones** ("¿qué estrategia sigo?"): Genie responde con datos, no con recomendaciones de negocio.
:::

:::trabajo
- En las empresas, quien arma y mantiene los Genie Agents suele ser un analista o un analytics engineer que conoce el dominio; el data engineer prepara las tablas, las vistas y las vistas de métricas que el agente usa.
- Genie no reemplaza los tableros: los complementa. El tablero muestra los indicadores fijos; Genie responde las preguntas que el tablero no previó. De hecho, al publicar un tablero de AI/BI, Databricks crea un Genie Agent asociado.
- Los equipos que mejores resultados obtienen tratan al agente como un producto: tiene dueño, un conjunto de preguntas de prueba y una revisión periódica de lo que preguntan los usuarios.
:::

:::entrevista "¿Cómo garantizarías que un usuario de Genie no vea datos que no le corresponden?"
Genie lee los datos con los permisos de Unity Catalog de quien pregunta: el agente solo usa las credenciales del autor para el cómputo, no para los datos. Entonces la seguridad se resuelve en Unity Catalog: permisos SELECT por grupo, filtros de filas para que cada región vea solo lo suyo y máscaras de columnas para datos sensibles. Además, al agente le daría solo las tablas o vistas necesarias para su tema, ya filtradas y sin columnas sensibles.
:::

| Concepto | En una línea |
|---|---|
| Genie One | La interfaz simple para negocio: tableros, preguntas y apps |
| Genie Agent | Un espacio de preguntas sobre un tema, configurado por el equipo de datos (antes Genie Space) |
| Genie Code | El asistente de código para técnicos (antes Databricks Assistant) |
| Show code | Ver el SQL que generó Genie |
| Permisos | Los datos se leen con los permisos de Unity Catalog de quien pregunta |

## Ejercicios

:::ejercicio quiz dificultad=Básico
Una gerente quiere hacer preguntas sobre ventas en español sin saber SQL, sobre un conjunto de tablas que preparó el equipo de datos. ¿Qué producto usa?

- [ ] Genie Code
- [x] Un Genie Agent (al que puede entrar desde Genie One)
- [ ] Un notebook de PySpark
- [ ] El editor de SQL
:::

:::ejercicio quiz dificultad=Básico
¿Cuál de estas preguntas responde bien Genie?

- [ ] ¿Por qué bajaron las ventas en abril?
- [ ] ¿Qué estrategia de precios me conviene?
- [x] ¿Cuál fue el ticket promedio por canal en abril de 2024?
- [ ] ¿Cuáles son nuestros mejores clientes?
:::

:::ejercicio quiz dificultad=Intermedio
Un vendedor no tiene permiso `SELECT` sobre la tabla de márgenes. Le pregunta al Genie Agent de ventas "¿qué margen tuvo cada producto?". ¿Qué pasa?

- [ ] Genie le muestra los márgenes porque el agente usa las credenciales del autor
- [x] No ve esos datos: Genie lee los datos con los permisos de Unity Catalog de quien pregunta
- [ ] Genie inventa un margen aproximado
- [ ] El agente se desactiva
:::

:::ejercicio quiz dificultad=Básico
En un tutorial de 2025 leíste "crea un Genie Space". ¿Cómo se llama hoy?

- [ ] Genie One
- [ ] Genie Code
- [x] Genie Agent
- [ ] AI/BI Dashboard
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué la documentación compara configurar Genie con incorporar a un analista nuevo?

- [ ] Porque Genie cobra un sueldo
- [x] Porque sabe SQL pero no conoce el negocio: necesita descripciones, definiciones y ejemplos para responder bien
- [ ] Porque aprende solo mirando los tableros
- [ ] Porque reemplaza al equipo de datos
:::
