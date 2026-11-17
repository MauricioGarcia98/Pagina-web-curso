---
titulo: Herramientas avanzadas - grupos de cálculo, parámetros, TMDL y proyectos .pbip
nivel: 6 · Avanzado completo
duracion: 50
resumen: Las herramientas que usan los equipos de BI con modelos grandes y trabajo en equipo - grupos de cálculo para no escribir la misma medida diez veces, parámetros de campo y de hipótesis para que el usuario elija, la vista TMDL para ver y editar el modelo como texto, y los proyectos .pbip para versionar en Git y desplegar con canalizaciones.
objetivos: Crear un grupo de cálculo con SELECTEDMEASURE | Usar parámetros para que el usuario elija medida o valor | Leer y editar el modelo en TMDL | Explicar qué es un proyecto .pbip y por qué se usa con Git | Conocer las canalizaciones de implementación
prerrequisitos: powerbi-paso-a-paso-rendimiento
autoevaluacion: ¿Sabes qué problema resuelve un grupo de cálculo? | ¿Sabes qué hace SELECTEDMEASURE()? | ¿Sabes qué contiene un archivo .tmdl? | ¿Sabes por qué un .pbix no conviene en Git?
---

:::analogia En palabras simples
Si tienes diez medidas y quieres para cada una "año anterior", "acumulado" y "variación", son treinta medidas más. Un grupo de cálculo es un molde: escribes "año anterior de *lo que sea*" una vez y se aplica a todas. Y TMDL es la receta del modelo escrita en texto: se puede leer, comparar y guardar en Git.
:::

## Paso 1 — Grupos de cálculo

**Modelado → Grupo de cálculo**:

```captura
archivo: powerbi/b22-grupo-calculo.webp
texto: Nombre del grupo y de la columna, plantillas y los elementos de cálculo con SELECTEDMEASURE()
```

```text
Actual          = SELECTEDMEASURE()
Año anterior    = CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR(Calendario[Date]))
Acumulado       = TOTALYTD(SELECTEDMEASURE(), Calendario[Date])
Variación %     = VAR a = CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR(Calendario[Date]))
                  RETURN DIVIDE(SELECTEDMEASURE() - a, a)
```

`SELECTEDMEASURE()` es "la medida que esté en el visual". Pon la columna **Cálculo** en las columnas de una matriz con Ventas y Pedidos en los valores: aparecen Actual, Año anterior, Acumulado y Variación % para las dos medidas, sin haber escrito ninguna medida nueva.

## Paso 2 — Parámetros

**Modelado → Nuevo parámetro**:

```captura
archivo: powerbi/b22-parametro.webp
texto: Parámetro de campos o de rango numérico (hipótesis)
```

| Tipo | Para qué |
|---|---|
| **Campos** | Una segmentación con la que el usuario elige qué medida o qué dimensión muestra el gráfico (Ventas o Pedidos; por canal o por categoría) |
| **Rango numérico** (hipótesis) | Una segmentación de número para simular: "¿y si el descuento fuera 15 %?"; crea una medida con el valor elegido |

## Paso 3 — La vista TMDL

**Modelado → Vista TMDL → Script del modelo completo**:

```captura
archivo: powerbi/b22-tmdl.webp
texto: El modelo como texto (1) - tablas, medidas, relaciones y roles; Aplicar (2) ejecuta los cambios con createOrReplace
```

```text
table _Medidas
    measure Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario])
        formatString: #,##0.00
    measure 'Ticket promedio' = DIVIDE([Ventas], [Pedidos])
```

TMDL (*Tabular Model Definition Language*) sirve para cambios en lote (renombrar diez medidas, poner formato a todas), revisar el modelo y copiarlo entre archivos.

## Paso 4 — Proyectos .pbip y Git

| Formato | Qué es | En Git |
|---|---|---|
| **.pbix** | Un archivo binario con datos, modelo e informe | Imposible ver qué cambió |
| **.pbip** (proyecto) | Una carpeta: `Modelo.SemanticModel/definition/*.tmdl` y `Informe.Report/` en JSON | Cada cambio es una diferencia de texto legible; se revisa en pull requests |

**Archivo → Guardar como → Proyecto de Power BI (.pbip)** en Desktop. En la práctica, **Archivo → Exportar el modelo (TMDL)** descarga la carpeta `definition` lista para un proyecto real.

## Paso 5 — Canalizaciones de implementación

```captura
archivo: powerbi/b20-canalizaciones.webp
texto: Canalizaciones - Desarrollo → Prueba → Producción
```

Una canalización copia el contenido de un área de trabajo de **Desarrollo** a una de **Prueba** y luego a **Producción**, cambiando la conexión a la base de cada entorno. Así nadie edita directamente lo que usa toda la empresa. Con Git integrado al área de trabajo (en Fabric), el flujo queda: rama → pull request → área de desarrollo → canalización → producción.

:::errores
- **Escribir la misma variante para cada medida.** Un grupo de cálculo con `SELECTEDMEASURE()` lo hace una vez.
- **Versionar .pbix en Git.** Es binario y no se puede revisar; .pbip guarda el modelo en texto.
- **Editar producción directo.** La canalización de implementación pasa contenido entre etapas.
:::

## ✅ Lo que lograste

- Creaste un grupo de cálculo y conoces los parámetros.
- Lees y editas el modelo en TMDL.
- Sabes por qué los equipos usan .pbip, Git y canalizaciones.

:::ejercicio quiz
Tienes 12 medidas y necesitas "año anterior" de cada una. ¿Qué conviene?
- [ ] Escribir 12 medidas nuevas
- [x] Un grupo de cálculo con un elemento que use SELECTEDMEASURE()
- [ ] Un parámetro de rango
- [ ] Una tabla calculada
:::

:::ejercicio quiz
¿Por qué un .pbip es mejor que un .pbix para trabajar con Git?
- [ ] Porque pesa menos
- [x] Porque es texto: los cambios se ven como diferencias legibles y se revisan en pull requests
- [ ] Porque abre más rápido
- [ ] Porque no necesita Power BI Desktop
:::

:::ejercicio quiz
¿Para qué sirve una canalización de implementación?
- [ ] Para actualizar los datos
- [x] Para pasar contenido de Desarrollo a Prueba y a Producción sin editar producción directamente
- [ ] Para crear medidas
- [ ] Para programar la actualización de los datos
:::
