---
titulo: Proyecto 3 (semiguiado) - la ingesta de clientes parametrizada
nivel: 3 · Intermedio
duracion: 50
resumen: El equipo necesita descargar clientes todos los días y, a veces, a mano para un solo país. Escribes ingesta_clientes con parámetros (Param con lista de valores y tipo), una variable de entorno y una plantilla, lo disparas para Perú con 200 clientes y compruebas en el log y en Rendered Templates que todo llegó. Pistas escondidas.
objetivos: Definir parámetros con Param, enum y type | Leer parámetros en TaskFlow y en plantillas | Combinar parámetros, variables y plantillas | Disparar con parámetros desde el formulario
prerrequisitos: airflow-paso-a-paso-variables-y-connections
autoevaluacion: ¿El formulario de Trigger muestra los parámetros? | ¿El log muestra el país y el límite elegidos? | ¿La plantilla usa el entorno de la variable? | ¿Sabes qué pasa si nadie lo dispara a mano?
---

:::escenario El pedido
Lucía: *"Todos los días a las 5 UTC descargamos todos los clientes. Pero comercial a veces pide recargar un solo país, con un tope. Que se pueda elegir desde la pantalla sin tocar código."*
:::

## Lo que tienes que lograr

1. `ingesta_clientes`, todos los días a las 05:00 UTC.
2. Parámetros `pais` (todos, PE, CO, MX, CL; por defecto todos) y `limite` (entero, mínimo 1, por defecto 500).
3. Una tarea `descargar` que lea la variable `entorno` e imprima país y límite.
4. Una tarea `avisar` con una plantilla que use el parámetro y la variable.
5. Una corrida manual para **PE** con **200**.

<details><summary>💡 Pista 1: los parámetros</summary>

```python norun
params={
    "pais": Param("todos", enum=["todos", "PE", "CO", "MX", "CL"], description="País a descargar"),
    "limite": Param(500, type="integer", minimum=1, description="Máximo de clientes"),
}
```
`Param` viene de `airflow.sdk`. Con `enum`, el formulario muestra una lista; con `type`, valida el tipo.
</details>

<details><summary>💡 Pista 2: leerlos</summary>

En TaskFlow, agrega `params=None` a la función y usa `params["pais"]`. En una plantilla, `{{ params.pais }}`.
</details>

## Cómo se ve terminado

```captura
archivo: airflow/a12-params.webp
texto: El formulario de Trigger con los parámetros - país PE y límite 200
```

```captura
archivo: airflow/a12-log.webp
texto: El log de descargar - [dev] Descargando hasta 200 clientes de PE
```

```captura
archivo: airflow/a12-rendered.webp
texto: Rendered Templates de avisar - "Clientes de PE cargados en dev"
```

:::errores
- **Poner el entorno como parámetro.** Quien dispara podría elegir prod por error; el entorno es configuración de la plataforma.
- **Param sin tipo ni lista.** Sin `enum` o `type`, cualquier valor pasa y falla tarde.
- **Escribir `$pais` en bash_command.** Los parámetros se usan con Jinja: `{{ params.pais }}`.
:::

## ✅ Lista de verificación

- [ ] El formulario muestra la lista de países y valida el límite.
- [ ] La corrida manual usó PE y 200.
- [ ] El log muestra el entorno de la variable.
- [ ] Las corridas programadas usan los valores por defecto (todos, 500).

<details><summary>💡 Solución comentada</summary>

```python norun
from datetime import datetime

from airflow.providers.standard.operators.bash import BashOperator
from airflow.sdk import DAG, Param, Variable, task

with DAG(
    dag_id="ingesta_clientes",
    schedule="0 5 * * *",
    start_date=datetime(2026, 11, 1),
    catchup=False,
    tags=["tienda", "ingesta", "curso"],
    default_args={"owner": "equipo-datos"},
    params={
        "pais": Param("todos", enum=["todos", "PE", "CO", "MX", "CL"], description="País a descargar"),
        "limite": Param(500, type="integer", minimum=1, description="Máximo de clientes"),
    },
):

    @task
    def descargar(params=None):
        entorno = Variable.get("entorno", default="dev")
        print(f"[{entorno}] Descargando hasta {params['limite']} clientes de {params['pais']} desde api_tienda")
        return params["limite"]

    avisar = BashOperator(
        task_id="avisar",
        bash_command="echo 'Clientes de {{ params.pais }} cargados en {{ var.value.entorno }}'",
    )

    descargar() >> avisar
```

**Decisión de diseño:** el valor por defecto (`todos`) es el caso diario. Los parámetros cubren la excepción sin crear otro Dag ni tocar código. Lo que cambia por entorno (dev o prod) es una **variable**, no un parámetro: no lo elige quien dispara, lo define la plataforma.
</details>

## Lo que aprendiste en el nivel 3

- TaskFlow y operadores.
- XComs y plantillas.
- Variables, conexiones y parámetros.

En el nivel 4: assets, ramas, trigger rules y backfills.

:::ejercicio quiz
¿Qué hace `enum` en un Param?
- [ ] Ordena los parámetros
- [x] Limita el valor a una lista y el formulario la muestra como selector
- [ ] Hace que el parámetro sea obligatorio
- [ ] Lo convierte en variable
:::

:::ejercicio quiz
¿Qué valores usa una corrida programada?
- [x] Los valores por defecto de los Param
- [ ] Los de la última corrida manual
- [ ] Ninguno, falla
- [ ] Los valores de la variable con el mismo nombre
:::

:::ejercicio quiz
¿Dónde conviene definir si el Dag corre en dev o en prod?
- [ ] En un parámetro que elige quien dispara
- [x] En una variable (o configuración) de la plataforma
- [ ] En el nombre del Dag
- [ ] En default_args
:::

:::ejercicio quiz
¿Cómo usas el parámetro pais en un bash_command?
- [ ] `$pais`
- [x] `{{ params.pais }}`
- [ ] `params["pais"]` directo en el texto
- [ ] `{{ var.value.pais }}`
:::
