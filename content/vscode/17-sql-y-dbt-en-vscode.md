---
titulo: SQL y dbt en VS Code - editar modelos, ejecutarlos y leer los errores de dependencias
nivel: 5 · Avanzado
duracion: 45
resumen: Buena parte del trabajo de un analytics engineer es SQL dentro de un proyecto dbt, y se hace en VS Code. Cómo se organiza un proyecto dbt en el explorador, editar un modelo con ref(), ejecutarlo con ▷ o dbt run --select, entender por qué un modelo falla si su dependencia no existe, construir el proyecto completo y dónde mirar los tests del schema.yml.
objetivos: Reconocer la estructura de un proyecto dbt en el explorador | Editar modelos SQL que usan ref() | Ejecutar un modelo y el proyecto completo desde VS Code | Diagnosticar un error de dependencia (tabla que no existe) | Relacionar modelos, schema.yml y tests
prerrequisitos: vscode-proyecto-pull-request
autoevaluacion: ¿Sabes qué hace ref() en un modelo? | ¿Sabes por qué falla dbt run --select de un modelo que depende de otro no construido? | ¿Sabes construir un modelo con todo lo que necesita antes? | ¿Sabes dónde están los tests de un modelo?
---

:::analogia En palabras simples
Un proyecto dbt es una receta de varias capas: los modelos de *staging* limpian las tablas crudas y los *marts* arman los resúmenes encima de ellos. `ref('stg_ventas')` dice "usá lo que produce ese otro modelo". Si pides el resumen sin haber preparado la capa de abajo, la receta no puede salir.
:::

## Paso 1 — El proyecto en el explorador

En la terminal integrada: `code ~/tienda_dbt`. El explorador muestra:

| Carpeta / archivo | Contiene |
|---|---|
| `dbt_project.yml` | La configuración del proyecto |
| `models/staging/` | Modelos que limpian y renombran las tablas de origen (`stg_ventas.sql`) |
| `models/marts/` | Modelos de negocio (`ventas_por_canal.sql`, `top_clientes.sql`) |
| `models/schema.yml` | Descripciones y **tests** de los modelos |

## Paso 2 — Un modelo

Abre **models/marts/ventas_por_canal.sql**:

```captura
archivo: vscode/v17-modelo-dbt.webp
texto: Un modelo dbt: un SELECT que usa ref('stg_ventas'); el ▷ (1) lo ejecuta con dbt run --select
```

```sql norun
select
    canal,
    count(distinct pedido_id) as pedidos,
    round(sum(importe), 2)    as ventas
from {{ ref('stg_ventas') }}
group by canal
```

Un modelo es solo un `SELECT`. dbt lo convierte en una tabla o vista, y `{{ ref('stg_ventas') }}` se reemplaza por el nombre real de la tabla de ese modelo. Gracias a `ref`, dbt sabe el **orden** en que hay que construir todo.

## Paso 3 — Ejecuta un modelo… y lee el error

Presiona **▷** (con la extensión dbt Power User, VS Code ejecuta `dbt run --select` del modelo abierto). Si es la primera vez:

```captura
archivo: vscode/v17-dbt-error.webp
texto: ERROR no such table main.stg_ventas: el modelo depende de otro que todavía no se construyó
```

`no such table: main.stg_ventas`: pediste construir solo `ventas_por_canal`, pero la tabla de `stg_ventas` todavía no existe. No es un error en tu SQL: falta la capa de abajo.

| Comando | Construye |
|---|---|
| `dbt run --select ventas_por_canal` | Solo ese modelo |
| `dbt run --select +ventas_por_canal` | Ese modelo **y todo lo que necesita antes** |
| `dbt run --select ventas_por_canal+` | Ese modelo y todo lo que depende de él |
| `dbt run` | Todo el proyecto, en orden |

## Paso 4 — Construye el proyecto

En la terminal:

```bash
dbt run
```

```captura
archivo: vscode/v17-dbt-run.webp
texto: dbt run construye los 3 modelos en orden: primero stg_ventas, después los marts
```

Ahora sí, `▷` sobre `ventas_por_canal.sql` funciona.

## Paso 5 — Los tests del schema.yml

Abre **models/schema.yml**:

```yaml
models:
  - name: ventas_por_canal
    columns:
      - name: canal
        data_tests: [unique, not_null]
```

Dice que en `ventas_por_canal` la columna `canal` no puede repetirse ni estar vacía. `dbt test` lo comprueba; `dbt build` construye y prueba todo junto. Si un test falla, el modelo tiene datos que no cumplen lo que el equipo espera.

:::tip Buscar en todo el proyecto
¿Qué modelos usan `stg_ventas`? **Ctrl + Shift + F** → `ref('stg_ventas')`. Antes de cambiar un modelo, mira quién depende de él.
:::

Para profundizar en dbt (materializaciones, incrementales, fuentes, macros), está el módulo [dbt](#/m/dbt) y el [laboratorio de dbt](#/lab/dbt).

## ✅ Lo que lograste

- Reconoces la estructura de un proyecto dbt y editas modelos con ref().
- Ejecutas modelos y el proyecto completo.
- Diagnosticas errores de dependencias y sabes dónde están los tests.

:::ejercicio quiz
¿Qué hace `{{ ref('stg_ventas') }}` en un modelo?
- [ ] Importa un archivo de Python
- [x] Se reemplaza por la tabla del modelo stg_ventas y le dice a dbt que ese modelo va antes
- [ ] Crea la tabla stg_ventas
- [ ] Ejecuta un test
:::

:::ejercicio quiz
`dbt run --select ventas_por_canal` da "no such table: stg_ventas". ¿Qué haces?
- [ ] Reescribo el SQL
- [x] Construyo antes la dependencia: `dbt run --select +ventas_por_canal` o `dbt run`
- [ ] Borro el modelo
- [ ] Reinstalo dbt
:::

:::ejercicio quiz
¿Dónde se definen los tests unique y not_null de un modelo?
- [ ] En el propio .sql
- [x] En un archivo .yml como schema.yml
- [ ] En dbt_project.yml obligatoriamente
- [ ] En la terminal
:::
