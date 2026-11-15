---
titulo: Pipelines y el lienzo - actividades, dependencias y el JSON
nivel: 2 · Básico-intermedio
duracion: 35
resumen: Cómo se trabaja en el editor de pipelines - buscar y agregar actividades, encadenarlas con dependencias, configurar cada una en sus pestañas, leer el pipeline completo como JSON y borrar lo que sobra. Agregas una espera después de la copia para ver cómo nace una dependencia y qué significa cada color de flecha.
objetivos: Buscar y agregar actividades al lienzo | Encadenar actividades con Depends on | Distinguir Upon Success, Failure, Completion y Skip | Leer el JSON de un pipeline | Borrar una actividad sin romper el pipeline
prerrequisitos: data-factory-paso-a-paso-proyecto-primera-copia
autoevaluacion: ¿Sabes cómo se crea una dependencia al agregar una actividad? | ¿Sabes qué significa una flecha verde? | ¿Sabes dónde ves el pipeline completo como JSON? | ¿Sabes qué pasa con las dependencias al borrar una actividad?
---

## Paso 1 — El panel de actividades

Abre `pl_copiar_ventas`. A la izquierda están las actividades, agrupadas. Escribe `wa` en **Search activities**:

```captura
archivo: adf/b05-buscar-actividad.webp
texto: La búsqueda (1) filtra el panel de actividades (2)
```

| Grupo | Actividades de la práctica | Para qué |
|---|---|---|
| **Move and transform** | Copy data | Mover datos |
| **Databricks** | Notebook | Llamar a un notebook (lección 19) |
| **General** | Get Metadata, Lookup, Set variable, Wait, Fail | Leer, decidir, esperar, fallar a propósito |
| **Iteration & conditionals** | ForEach, If Condition | Repetir y bifurcar (lecciones 15 a 17) |

## Paso 2 — Agregar una actividad encadenada

Selecciona la copia en el lienzo y haz clic en **Wait**:

```captura
archivo: adf/b05-wait.webp
texto: La espera aparece conectada después de la copia (1), con sus propiedades abajo (2)
```

Si hay una actividad seleccionada, la nueva se agrega **después** de ella, con una flecha verde. En **Settings** ponle 5 segundos:

```captura
archivo: adf/b05-wait-settings.webp
texto: Wait time in seconds
```

## Paso 3 — Depends on y los cuatro colores

Vuelve a la pestaña **General** de la espera:

```captura
archivo: adf/b05-depends-on.webp
texto: Depends on - de qué actividad depende y en qué condición
```

| Condición | Color | La actividad corre cuando la anterior… |
|---|---|---|
| **Upon Success** | Verde | Terminó bien (lo normal) |
| **Upon Failure** | Rojo | Falló (para avisar o compensar) |
| **Upon Completion** | Azul | Terminó, bien o mal |
| **Upon Skip** | Gris | No se ejecutó |

Las rutas de error se usan en la lección 18. En el portal real, la dependencia se crea arrastrando el pequeño botón del borde de una actividad hasta otra; en la práctica se marca en Depends on.

## Paso 4 — El pipeline como JSON

**Code** muestra el pipeline entero:

```captura
archivo: adf/b05-code.webp
texto: El JSON del pipeline - cada actividad con su tipo, dependencias, política (timeout, reintentos) y propiedades
```

Fíjate en la **policy** de la copia: `timeout` de 12 horas y `retry` 0 por defecto. Es lo que se guarda en Git y lo que viaja en las plantillas ARM.

## Paso 5 — Borrar

La espera no hace falta. Selecciónala y usa el ícono de **papelera** de sus propiedades:

```captura
archivo: adf/b05-parametros.webp
texto: El lienzo vuelve a tener solo la copia; abajo queda la salida del último Debug
```

Al borrar una actividad, las dependencias que apuntaban a ella también se borran.

## ✅ Lo que lograste

- Buscas, agregas y encadenas actividades.
- Conoces las cuatro condiciones de dependencia.
- Lees el pipeline como JSON.

:::ejercicio quiz
Tienes la copia seleccionada y agregas una actividad Wait. ¿Qué pasa?
- [ ] Wait queda suelta, sin conexión
- [x] Wait queda después de la copia, con una dependencia Upon Success
- [ ] Wait reemplaza a la copia
- [ ] Wait se agrega antes de la copia
:::

:::ejercicio quiz
¿Cuándo corre una actividad conectada con Upon Failure?
- [ ] Siempre
- [ ] Solo si la anterior terminó bien
- [x] Solo si la anterior falló
- [ ] Nunca
:::

:::ejercicio quiz
¿Qué condición usas para algo que tiene que correr pase lo que pase con la anterior?
- [ ] Upon Success
- [ ] Upon Skip
- [x] Upon Completion
- [ ] Upon Failure
:::

:::ejercicio quiz
¿Cuántos reintentos tiene una actividad por defecto?
- [x] 0
- [ ] 1
- [ ] 3
- [ ] Infinitos
:::
