---
titulo: XComs y plantillas - cómo viajan los datos entre tareas
nivel: 3 · Intermedio
duracion: 40
resumen: Cuando una tarea devuelve un valor, Airflow lo guarda como XCom y la siguiente lo recibe. Ves el XCom de leer_ventas, la página Browse → XComs, cuándo NO usar XCom, y las plantillas Jinja más útiles (ds, ds_nodash, params, var, macros) para construir comandos y rutas con la fecha de la corrida.
objetivos: Ver los XComs de una tarea y de todo Airflow | Leer un XCom con TaskFlow o con xcom_pull | Saber qué no debe viajar por XCom | Usar las plantillas Jinja principales
prerrequisitos: airflow-paso-a-paso-taskflow-y-operadores
autoevaluacion: ¿Sabes dónde se guarda un XCom? | ¿Sabes qué tamaño de datos conviene pasar? | ¿Sabes qué devuelve {{ ds_nodash }}? | ¿Sabes en qué campos funcionan las plantillas?
---

:::analogia Notitas pegadas entre tareas
Un XCom es una notita que una tarea le deja a la siguiente: un número, una ruta, un nombre de tabla. No es un camión para mudar datos: lo grande se escribe en una tabla o un archivo, y en la notita va solo dónde quedó.
:::

## Paso 1 — El XCom de una tarea

En la corrida de `resumen_tiendas`, `leer_ventas` → **XCom**:

```captura
archivo: airflow/a10-xcom.webp
texto: El XCom return_value de leer_ventas - la lista de ventas por tienda
```

**XCom** (*cross-communication*) es un valor chico que una tarea deja para otra. Lo que devuelve una tarea se guarda con la clave `return_value` en la base de metadatos.

## Paso 2 — Todos los XComs

**Browse → XComs**:

```captura
archivo: airflow/a10-xcoms.webp
texto: XComs - clave, Dag, corrida, tarea y valor de todos los XComs
```

Con TaskFlow no hace falta leerlos a mano. Con operadores clásicos se leen así:

```python norun
def usar_total(**context):
    total = context["ti"].xcom_pull(task_ids="total_unidades")
    print(f"Total recibido: {total}")
```

:::cuidado XCom no es para datos grandes
Los XComs viven en la base de metadatos. Pasa **referencias** (una ruta, un nombre de tabla, un conteo), no el DataFrame de un millón de filas. Lo correcto: la tarea escribe en una tabla o un archivo y devuelve la ruta.
:::

## Paso 3 — Plantillas Jinja

En los campos que admiten plantillas (`bash_command`, consultas SQL, rutas), Airflow reemplaza `{{ ... }}` justo antes de ejecutar:

| Plantilla | Ejemplo con fecha lógica 2026-11-14 |
|---|---|
| `{{ ds }}` | `2026-11-14` |
| `{{ ds_nodash }}` | `20261114` |
| `{{ ts }}` | `2026-11-14T06:00:00+00:00` |
| `{{ macros.ds_add(ds, -1) }}` | `2026-11-13` |
| `{{ params.pais }}` | El parámetro `pais` de la corrida |
| `{{ var.value.entorno }}` | La variable `entorno` |
| `{{ run_id }}` | El nombre de la corrida |

```python norun
BashOperator(
    task_id="copiar",
    bash_command="cp /datos/ventas_{{ ds_nodash }}.csv /lake/raw/fecha={{ ds }}/",
)
```

La pestaña **Rendered Templates** de cada instancia muestra el comando ya resuelto. Es lo primero que se mira cuando una ruta "no existe".

:::errores
- **Pasar DataFrames grandes por XCom.** Se guardan en la base de metadatos y la saturan; pasa la ruta o la tabla.
- **Plantillas en campos que no se renderizan.** Jinja solo se resuelve en los campos plantillados del operador; revisa Rendered Templates.
- **Confundir `ds` con `ds_nodash`.** `ds` es `2026-11-14`; `ds_nodash` es `20261114`.
:::

## ✅ Lo que lograste

- Ves los XComs de una tarea y de todo Airflow.
- Sabes qué no debe viajar por XCom.
- Usas las plantillas principales.

:::ejercicio quiz
¿Dónde guarda Airflow los XComs (por defecto)?
- [ ] En un archivo CSV
- [x] En la base de metadatos
- [ ] En la memoria del navegador
- [ ] En los logs de la tarea
:::

:::ejercicio quiz
Una tarea genera un DataFrame de 5 millones de filas. ¿Qué devuelves?
- [ ] El DataFrame entero por XCom
- [x] La ruta o la tabla donde lo escribiste
- [ ] Nada y que la siguiente lo adivine
- [ ] Las primeras mil filas por XCom
:::

:::ejercicio quiz
Con fecha lógica 2026-11-14, ¿qué devuelve `{{ ds_nodash }}`?
- [ ] 2026-11-14
- [x] 20261114
- [ ] 14/11/2026
- [ ] 2026-11-14T00:00:00
:::

:::ejercicio quiz
¿Dónde ves el comando con las plantillas ya resueltas?
- [ ] En Code
- [x] En la pestaña Rendered Templates de la instancia
- [ ] En Admin → Config
- [ ] En el log del dag processor
:::
