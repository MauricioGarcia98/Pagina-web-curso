---
titulo: Proyecto 4 (con poca ayuda) - todas las devoluciones, archivo por archivo y en paralelo
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: Las devoluciones llegan en archivos JSON, uno o varios por día. Armas un pipeline que las copie todas a bronze, una por una pero en paralelo, con un dataset de destino nuevo, y lo verificas. Solo se dice qué lograr; la solución comentada está al final.
objetivos: Aplicar el patrón Get Metadata + ForEach sin guía | Crear el dataset de destino que falta | Configurar un ForEach en paralelo | Verificar el resultado de punta a punta
prerrequisitos: data-factory-paso-a-paso-get-metadata-y-foreach
autoevaluacion: ¿Tu pipeline copia todos los archivos sin nombrarlos uno por uno? | ¿El ForEach corre en paralelo? | ¿Usaste @item() y no variables dentro del bucle? | ¿Los archivos quedaron en bronze/devoluciones?
---

:::escenario El pedido
Lucía: *"Las devoluciones empiezan a llegar en `raw/devoluciones`, en JSON. Pueden ser varios archivos por día. Copialas todas a `bronze/devoluciones`, cada archivo por separado, y que no tarde una eternidad cuando sean cien."*
:::

## Lo que tienes que lograr

1. Un dataset JSON `ds_bronze_devoluciones` en `bronze/devoluciones`.
2. Un pipeline `pl_copiar_devoluciones` que liste `raw/devoluciones` y copie cada archivo.
3. El ForEach **en paralelo**, con un lote de 10.
4. Debug en Succeeded y los archivos en bronze.

## Cómo se ve terminado

```captura
archivo: adf/b16-paralelo.webp
texto: El ForEach sin Sequential (1) y con Batch count 10 (2)
```

```captura
archivo: adf/b16-debug.webp
texto: Listar, recorrer y copiar - todo en verde (1) y una copia por archivo en la salida (2)
```

```captura
archivo: adf/b16-bronze.webp
texto: El archivo de devoluciones en bronze, junto a las ventas
```

## ✅ Lista de verificación

- [ ] `ds_bronze_devoluciones` existe, en formato JSON.
- [ ] El pipeline tiene Get Metadata (childItems) → ForEach → Copy.
- [ ] El ForEach tiene **Sequential** desmarcado y **Batch count** 10.
- [ ] La copia usa `@item().name` en el comodín.
- [ ] En `bronze/devoluciones` está cada archivo de `raw/devoluciones`.

<details><summary>💡 Solución comentada</summary>

1. **Author → + → Dataset**: JSON, `ds_bronze_devoluciones`, contenedor `bronze`, carpeta `devoluciones`.
2. **+ → Pipeline**, `pl_copiar_devoluciones`. **Get Metadata** `Listar devoluciones` sobre `ds_raw_devoluciones` con **childItems**.
3. **ForEach** `Por cada devolucion`: Items `@activity('Listar devoluciones').output.childItems`, Sequential desmarcado, Batch count 10.
4. Adentro, **Copy** `Copiar devolucion`: origen `ds_raw_devoluciones` con comodín `@item().name`, destino `ds_bronze_devoluciones`.

**Por qué un lote de 10 y no 50.** Más paralelismo termina antes, pero cada copia abre conexiones al origen y al destino. Contra un almacenamiento de Azure, 10 o 20 está bien; contra una base de datos o una API de un tercero, demasiadas conexiones a la vez pueden saturarla o hacer que te bloquee. El número se ajusta según **lo que aguanta el sistema más débil**.
</details>

## Lo que aprendiste en el nivel 4

- Parámetros y expresiones para pipelines reutilizables.
- Variables y Set variable para calcular y depurar.
- Get Metadata y ForEach para recorrer carpetas, en secuencia o en paralelo.

En el nivel 5 el pipeline aprende a decidir y a recuperarse: Lookup, If Condition, rutas de error y Databricks.

:::ejercicio quiz
Llegan 100 archivos de devoluciones. ¿Qué cambia en tu pipeline?
- [ ] Hay que agregar 100 copias
- [x] Nada: Get Metadata los lista y el ForEach los recorre
- [ ] Hay que crear 100 datasets
- [ ] Hay que unirlos antes
:::

:::ejercicio quiz
Dentro de un ForEach paralelo, ¿cómo te refieres al archivo de cada vuelta?
- [ ] Con una variable que se asigna en cada vuelta
- [x] Con `@item().name`
- [ ] Con `@pipeline().parameters.archivo`
- [ ] Con el nombre fijo
:::

:::ejercicio quiz
¿Qué limita cuánto paralelismo conviene?
- [ ] Nada, siempre 50
- [x] Lo que aguanta el sistema más débil: el origen, el destino o una API
- [ ] La cantidad de datasets
- [ ] La zona horaria
:::

:::ejercicio quiz
¿Qué formato tiene el dataset de destino de las devoluciones?
- [ ] DelimitedText
- [x] JSON
- [ ] Parquet
- [ ] Da igual
:::
