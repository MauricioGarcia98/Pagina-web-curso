---
titulo: Ramas y trigger rules - decidir qué corre
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: No siempre corren todas las tareas. Con @task.branch, reporte_ventas decide si avisar o no según un umbral guardado en una variable. Cambias el umbral y ves cómo cambia la rama, entiendes el estado skipped y aprendes las trigger rules para que una tarea corra aunque algo anterior se haya saltado o haya fallado.
objetivos: Crear una rama con @task.branch | Leer el estado skipped | Cambiar el comportamiento con una variable sin tocar código | Elegir la trigger rule correcta
prerrequisitos: airflow-paso-a-paso-assets
autoevaluacion: ¿Sabes qué devuelve una tarea branch? | ¿Sabes qué pasa con las tareas no elegidas? | ¿Sabes qué hace all_done? | ¿Sabes por qué fin usa none_failed_min_one_success?
---

:::analogia Un desvío en el camino
Una tarea branch es un cartel de desvío: según lo que encuentra, manda la corrida por un camino y deja el otro vacío (skipped). Las trigger rules deciden si una tarea más adelante arranca aunque uno de los caminos no se haya recorrido.
:::

## Paso 1 — La rama

En `reporte_ventas`:

```python norun
@task.branch
def decidir(umbral):
    total_hoy = 246.4
    print(f"Total de hoy: {total_hoy}")
    return "enviar_alerta" if total_hoy < umbral else "sin_alerta"

decidir(leer_umbral()) >> [enviar_alerta(), sin_alerta()]
```

Una tarea **branch** devuelve el `task_id` (o una lista) de la rama que sigue. Las demás quedan en **skipped**.

## Paso 2 — Con umbral 100

```captura
archivo: airflow/a14-rama.webp
texto: El total (246,4) supera el umbral (100) - sin_alerta en verde y enviar_alerta en rosa (skipped)
```

## Paso 3 — Cambiar el umbral

En **Admin → Variables**, edita `umbral_alerta` a `300` y dispara `reporte_ventas`:

```captura
archivo: airflow/a14-decidir.webp
texto: El log de decidir - Total de hoy 246,4 y "Branch into 'enviar_alerta'"
```

```captura
archivo: airflow/a14-grid.webp
texto: La grilla - en las primeras corridas se saltó enviar_alerta; en la última, sin_alerta
```

Cambiaste el comportamiento **sin tocar el código**: el umbral es configuración.

## Paso 4 — Trigger rules

Por defecto una tarea corre si **todas** las anteriores terminaron bien (`all_success`). Eso no sirve siempre: una tarea `fin` después de una rama nunca correría, porque una de las ramas siempre queda en skipped.

| Trigger rule | Corre cuando… | Uso típico |
|---|---|---|
| `all_success` (defecto) | Todas las anteriores en success | El caso normal |
| `none_failed_min_one_success` | Ninguna falló y al menos una terminó bien | Unir ramas después de un branch |
| `all_done` | Todas terminaron, como sea | Limpiar archivos temporales siempre |
| `one_failed` | Al menos una falló | Avisar de una falla |
| `none_failed` | Ninguna falló (pueden estar skipped) | Seguir aunque haya ramas saltadas |

```captura
archivo: airflow/a14-trigger-rule.webp
texto: La tarea fin de ingesta_api - Trigger Rule none_failed_min_one_success
```

```python norun
fin = EmptyOperator(task_id="fin", trigger_rule="none_failed_min_one_success")
limpiar = BashOperator(task_id="limpiar_tmp", bash_command="rm -rf /tmp/ventas_{{ ds_nodash }}", trigger_rule="all_done")
```

:::errores
- **Devolver True o False desde un branch.** Debe devolver el task_id (o la lista) de la rama a seguir.
- **Dejar `all_success` en la tarea que une ramas.** La rama no elegida queda en skipped y la tarea de unión no corre; usa `none_failed_min_one_success`.
- **Limpieza con `all_success`.** Si algo falla, la limpieza no corre; va con `all_done`.
:::

## ✅ Lo que lograste

- Creaste y probaste una rama.
- Cambiaste la rama con una variable.
- Sabes elegir la trigger rule.

:::ejercicio quiz
¿Qué devuelve una tarea @task.branch?
- [ ] Un booleano
- [x] El task_id (o lista de task_ids) de la rama que debe seguir
- [ ] La lista de tareas que deben quedar en skipped
- [ ] Nada
:::

:::ejercicio quiz
¿En qué estado quedan las tareas de la rama no elegida?
- [ ] failed
- [ ] upstream_failed
- [x] skipped
- [ ] removed
:::

:::ejercicio quiz
Una tarea que borra archivos temporales debe correr siempre, falle o no lo anterior. ¿Qué trigger rule usas?
- [ ] all_success
- [x] all_done
- [ ] one_failed
- [ ] none_failed_min_one_success
:::

:::ejercicio quiz
¿Por qué una tarea que une dos ramas no puede quedarse con all_success?
- [x] Porque una de las ramas siempre queda en skipped y all_success exige que todas terminen bien
- [ ] Porque la rama elegida siempre queda en upstream_failed
- [ ] Porque corre dos veces
- [ ] Porque all_success solo sirve con assets
:::
