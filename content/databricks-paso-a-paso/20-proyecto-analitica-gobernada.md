---
titulo: Proyecto 5 (requisitos y rúbrica) - analítica gobernada para el área comercial
nivel: 5 · Avanzado
duracion: 120
resumen: El área comercial quiere ver sus ventas sin pedirle nada al equipo de datos - un tablero publicado, un agente de Genie que responda sus preguntas y alertas que avisen cuando algo se sale de lo normal. Pero los datos de clientes tienen correos y países, y cada gerente regional solo puede ver su región. Dashboards, Genie, alertas, filtros de fila, máscaras y permisos, con requisitos y rúbrica.
objetivos: Diseñar una capa gold y un dashboard para un área | Configurar un Genie Agent evaluado con preguntas de prueba | Definir alertas con umbrales justificados | Proteger datos personales y regionales con máscaras y filtros | Entregar con evidencia de que la seguridad funciona
prerrequisitos: databricks-paso-a-paso-seguridad-filtros-mascaras-y-secretos
autoevaluacion: ¿Sabes qué tablas gold necesita un tablero de ventas? | ¿Sabes evaluar un Genie Agent? | ¿Sabes demostrar que un gerente solo ve su región? | ¿Sabes justificar un umbral de alerta?
---

:::escenario El pedido
Rodrigo, gerente comercial: *"Quiero un tablero de ventas por categoría, canal y país, que mi equipo pueda consultar solo. Los gerentes regionales (México, Argentina, Colombia) solo pueden ver su país. Nadie fuera de datos debe ver los correos de los clientes. Quiero poder preguntarle cosas en lenguaje natural, y que me avisen si las ventas de un día caen por debajo de lo normal o si los pagos rechazados suben."*
:::

## Requisitos

1. **Capa gold** en `main.comercial`: `ventas_detalle` (una fila por línea de pedido entregado, con `fecha`, `categoria`, `canal`, `pais`, `cliente_id`, `monto = cantidad × precio_unitario`), `ventas_por_dia` (por fecha, canal y país) y `clientes` (copia de `samples.tienda.clientes` con `pais`, `segmento`, `email`, `telefono`).
2. **Seguridad**: grupos `comercial`, `region_mx`, `region_ar`, `region_co`, `datos`. Filtro de fila sobre `ventas_detalle`, `ventas_por_dia` y `clientes` por país según el grupo regional (`datos` y `comercial` ven todo). Máscara sobre `email` y `telefono` (solo `datos` los ve). Etiquetas `pii` en esas columnas. Permisos: `comercial` y los grupos regionales solo `SELECT` en `main.comercial`.
3. **Dashboard** `Ventas comerciales`, publicado, con: tres contadores (ventas totales, pedidos, ticket promedio), ventas por categoría, ventas por mes y canal, ventas por país, y filtros de país y categoría. Datasets sobre la gold, no sobre `samples`.
4. **Genie Agent** `Ventas comerciales` con las tres tablas gold, instrucciones con el vocabulario del área (al menos cinco reglas) y al menos cinco consultas de ejemplo. Evaluado con **diez preguntas** cuya respuesta calculaste tú; deja la lista con el resultado de cada una.
5. **Alertas**: (a) ventas del último día de datos por debajo de un umbral que justifiques con el promedio histórico; (b) pagos rechazados del último mes de datos por encima de un umbral justificado. Ambas evaluadas al menos una vez.
6. **Evidencia**: una consulta de control guardada que muestre, para tu usuario, cuántas filas ve de `ventas_detalle` **dentro** del grupo `region_ar` y **fuera** de todo grupo regional, y qué ve en `email` dentro y fuera de `datos`.

## ✔ Control

| Control | Esperado |
|---|---|
| `ventas_detalle` | Solo pedidos entregados; total de `monto` **11 518 639.19** (= web 5 352 449.11 + app 2 833 377.12 + tienda 2 436 056.90 + telefono 896 756.06) |
| Ventas por categoría (sobre todos los pedidos, para comparar con Genie) | Laptops 4 039 091.97 · Ciclismo 3 103 504.61 · Celulares 2 273 958.70 · … · Calzado 244 892.04; total 14 878 014.07 |
| `clientes` | 2000 filas; 89 sin email; México 387, Argentina 363, Colombia 312 |
| Dentro de `region_ar` | `clientes` muestra 363 filas; `ventas_detalle` solo las de Argentina |
| Fuera de `datos` | `email` y `telefono` aparecen enmascarados |
| Pagos rechazados (histórico) | 337 pagos por 373 571.98: tu umbral mensual debe salir de ahí |
| Dashboard | Publicado; los filtros cambian todos los widgets |
| Genie | 10/10 en tu lista de preguntas (o la explicación de cada fallo que no pudiste corregir) |

## Rúbrica

| Criterio | Peso | Insuficiente | Competente | Sobresaliente |
|---|---|---|---|---|
| Capa gold | 20 % | Dashboard sobre `samples` | Tres tablas gold con comentarios | Linaje completo visible y una consulta de control que cuadra con la fuente |
| Seguridad | 30 % | Permisos sin filtros ni máscaras | Filtros, máscaras, etiquetas y permisos mínimos | Evidencia reproducible (la consulta de control) y funciones reutilizables para otras tablas |
| Dashboard | 15 % | Gráficos sueltos | Contadores, gráficos y filtros que funcionan | Responde las tres preguntas del gerente sin tocar nada |
| Genie | 20 % | Sin instrucciones ni ejemplos | Instrucciones, ejemplos y evaluación de 10 preguntas | Documenta qué no sabe responder y por qué |
| Alertas | 15 % | Umbrales arbitrarios | Umbrales justificados con datos | Ambas con horario acorde a la carga de datos |

**Aprobado**: competente o más en todos los criterios.

## Entrega

Mensaje a Rodrigo: *"Tablero `Ventas comerciales` publicado para el grupo `comercial`; los gerentes regionales ven solo su país y nadie fuera de datos ve correos ni teléfonos (lo probé entrando y saliendo de los grupos). Podés preguntarle al agente `Ventas comerciales`; respondió bien las 10 preguntas de prueba, que te adjunto. Las alertas avisan si un día vende menos de X o si los rechazos del mes superan Y, con esos umbrales porque…"*

## 🖥️ Hazlo también en Databricks real

Los grupos los crea un administrador de la cuenta; pídelos con sus miembros. Al publicar el dashboard, elige **credenciales del lector** para que los filtros de fila se apliquen a cada gerente. Genie respeta los mismos filtros: un gerente que pregunta "ventas por país" ve solo el suyo.

:::errores
- **Publicar el dashboard con tus credenciales.** Todos ven lo que ves tú; el filtro de fila se aplica a quien ejecuta.
- **Datasets sobre samples.** La seguridad y la lógica están en gold.
- **Probar como administrador.** Prueba como un gerente regional real.
:::

:::ejercicio quiz
El dashboard se publica con credenciales del editor (las tuyas). Un gerente regional lo abre. ¿Qué ve?
- [ ] Solo su país
- [x] Todo lo que ves tú: el filtro de fila se aplica a quien ejecuta la consulta, y con tus credenciales eres tú
- [ ] Nada
- [ ] Solo su país, porque el filtro se aplica a quien abre el tablero
:::

:::ejercicio quiz
¿Por qué los datasets del dashboard van sobre la gold y no sobre samples?
- [ ] Porque samples no tiene datos
- [x] Porque la gold tiene la seguridad (filtros, máscaras, permisos) y la lógica de negocio; samples es la fuente cruda y de solo lectura
- [ ] Porque es más rápido escribir
- [ ] Porque samples no admite filtros
:::
