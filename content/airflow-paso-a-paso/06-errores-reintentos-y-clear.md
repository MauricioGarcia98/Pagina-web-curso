---
titulo: Cuando una tarea falla - logs, reintentos y Clear
nivel: 2 · Básico-intermedio
duracion: 45
resumen: Tarde o temprano una tarea falla. Corres conciliacion_pagos, que tiene un error a propósito, lees el traceback en el log de cada intento, entiendes retries y upstream_failed, corriges el archivo desde la terminal y vuelves a correr solo lo que falló con Clear.
objetivos: Encontrar la tarea que falló y leer su traceback | Entender retries, retry_delay y los intentos | Distinguir failed de upstream_failed | Corregir el Dag y reintentar con Clear
prerrequisitos: airflow-paso-a-paso-grid-graph-y-estados
autoevaluacion: ¿Sabes dónde está el traceback? | ¿Sabes cuántos intentos hace una tarea con retries=2? | ¿Sabes qué hace Clear? | ¿Sabes por qué una tarea queda en upstream_failed?
---

:::escenario El pedido
Finanzas: *"La conciliación de pagos de hoy no llegó. ¿Qué pasó?"*
:::

## Paso 1 — Encontrar qué falló

Dispara `conciliacion_pagos`:

```captura
archivo: airflow/a06-fallo.webp
texto: La corrida en rojo (1) - traer_pagos en success, conciliar en failed después de 3 intentos y avisar en upstream_failed (2)
```

| Tarea | Estado | Por qué |
|---|---|---|
| `traer_pagos` | success | Trajo los pagos |
| `conciliar` | **failed** | Falló en sus 3 intentos |
| `avisar` | **upstream_failed** | No corrió porque depende de `conciliar` |

## Paso 2 — Leer el log

Abre `conciliar`:

```captura
archivo: airflow/a06-log.webp
texto: Los intentos 1, 2 y 3 (1) y el traceback - KeyError 'importe' en la línea 26 (2)
```

El traceback se lee **de abajo hacia arriba**: la última línea dice qué pasó (`KeyError: 'importe'`) y las de arriba dicen dónde (archivo y número de línea). Los pagos traen el campo `monto`, pero el código busca `importe`.

## Paso 3 — Los reintentos

El Dag tiene `default_args={"retries": 2, "retry_delay": timedelta(minutes=1)}`:

| Parámetro | Qué hace |
|---|---|
| `retries` | Cuántas veces más intenta si falla. `retries=2` = **3 intentos** en total |
| `retry_delay` | Cuánto espera entre intentos |

Entre intentos la tarea queda en **up_for_retry**. Los reintentos sirven para fallas pasajeras (una API que no respondió, un corte de red). **Un error de código falla igual en todos los intentos**: hay que corregirlo.

## Paso 4 — Corregir

En la terminal:

```bash norun
cd ~/airflow/dags
grep -n "importe\|monto" conciliacion_pagos.py
sed -i 's/importe/monto/' conciliacion_pagos.py
grep -n "monto" conciliacion_pagos.py
```

```captura
archivo: airflow/a06-arreglo.webp
texto: grep encuentra la línea con importe, sed la reemplaza y grep confirma que ahora dice monto
```

También puedes hacerlo con `nano conciliacion_pagos.py`. Airflow vuelve a leer el archivo al guardarlo.

## Paso 5 — Reintentar con Clear

En la corrida fallida, **Clear Run** con **Only failed tasks**:

```captura
archivo: airflow/a06-clear.webp
texto: Clear Dag Run - solo las tareas fallidas: conciliar y avisar
```

**Clear** borra el estado de esas instancias y el scheduler las vuelve a correr con el código nuevo. `traer_pagos` no se repite.

```captura
archivo: airflow/a06-ok.webp
texto: La misma corrida, ahora en success - conciliar con Try Number 4
```

:::tip Clear o Trigger
**Clear** repite la **misma** corrida (misma fecha lógica, mismos datos). **Trigger** crea una corrida **nueva**. Para recuperar el día que falló, usa Clear.
:::

## ✅ Lo que lograste

- Encontraste la tarea que falló y su causa.
- Entiendes reintentos y upstream_failed.
- Corregiste y reintentaste solo lo necesario.

:::ejercicio quiz
Una tarea tiene retries=2. ¿Cuántos intentos hace como máximo?
- [ ] 1
- [ ] 2
- [x] 3
- [ ] Infinitos
:::

:::ejercicio quiz
¿Cómo se lee un traceback de Python?
- [x] De abajo hacia arriba: la última línea dice qué pasó y las de arriba dónde
- [ ] De arriba hacia abajo y solo la primera línea
- [ ] No se lee, se borra
- [ ] Solo el número de línea
:::

:::ejercicio quiz
¿Por qué `avisar` quedó en upstream_failed?
- [ ] Porque tiene un error propio
- [x] Porque depende de conciliar, que falló
- [ ] Porque se pausó el Dag
- [ ] Porque nadie la programó
:::

:::ejercicio quiz
Corregiste el código. ¿Qué haces para recuperar la corrida de hoy?
- [ ] Borrar el Dag
- [ ] Esperar a mañana
- [x] Clear de las tareas fallidas en esa corrida
- [ ] Cambiar el dag_id
:::
