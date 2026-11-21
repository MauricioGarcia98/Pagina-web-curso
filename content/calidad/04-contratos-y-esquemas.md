---
titulo: Contratos de datos y cambios de esquema que no rompen a nadie
nivel: Avanzado
duracion: 60
resumen: Un contrato de datos es la promesa escrita entre quien produce una tabla y quien la usa - columnas, tipos, qué puede ser nulo, valores permitidos, frescura y a quién avisar. Validas registros contra un contrato, detectas qué cambió entre dos versiones de un esquema y decides si el cambio es compatible o rompe a los consumidores, como hace un registro de esquemas.
objetivos: Escribir un contrato con esquema, reglas, frescura y responsables | Validar registros contra un contrato y reportar cada violación con su motivo | Comparar dos versiones de un esquema y listar columnas agregadas, eliminadas y con tipo cambiado | Clasificar un cambio de esquema como compatible o incompatible para los consumidores | Explicar qué hacen Delta Lake y un registro de esquemas cuando el esquema cambia
prerrequisitos: calidad-tests-que-atrapan-errores | dbt-tests-docs
autoevaluacion: ¿Qué secciones tiene un contrato de datos? | ¿Agregar una columna rompe a los consumidores? ¿Y eliminarla? | ¿Por qué pasar de entero a decimal suele ser seguro y al revés no? | ¿Qué pasa en Delta Lake si escribes una columna que la tabla no tiene?
---

:::analogia En palabras simples
Un contrato de alquiler dice qué entrega el dueño, qué paga el inquilino y qué pasa si alguien no cumple. Un contrato de datos dice qué columnas entrega el equipo que produce la tabla, con qué tipos y frescura, y qué pasa si cambia algo: avisar **antes**, no cuando el tablero del otro equipo ya se rompió.
:::

## Qué tiene un contrato

```yaml norun
tabla: silver.pedidos
responsable: equipo-datos-ventas
consumidores: [finanzas, tablero-comercial]
esquema:
  pedido_id:  {tipo: int,    nulos: false, unico: true}
  fecha:      {tipo: date,   nulos: false}
  estado:     {tipo: string, nulos: false, valores: [entregado, enviado, pendiente, cancelado, devuelto]}
  monto:      {tipo: double, nulos: false, minimo: 0}
  cupon:      {tipo: string, nulos: true}
frescura: "datos de ayer disponibles a las 06:00"
cambios: "agregar columnas opcionales: aviso de 1 semana; eliminar o cambiar tipos: versión nueva de la tabla"
```

| Sección | Para qué sirve |
|---|---|
| Esquema y tipos | Que los consumidores sepan qué leer |
| Nulos, únicos, valores, rangos | Reglas que se convierten en pruebas (lección 2) |
| Frescura | El acuerdo de servicio (SLA) |
| Responsable y consumidores | A quién avisar cuando algo cambia o falla |
| Política de cambios | Qué cambios se pueden hacer sin romper |

Herramientas como los contratos de dbt (`contract: enforced: true`) o las expectativas de Lakeflow aplican partes de esto automáticamente; el resto es acuerdo entre equipos.

## Cambios compatibles e incompatibles

La pregunta clave ante un cambio de esquema: **¿los consumidores que leen con el esquema viejo siguen funcionando?**

```diagrama
titulo: ¿El cambio de esquema rompe a los consumidores?
nodo c: Cambio en el esquema | icono=documento | col=0 | fila=1 | color=gris
nodo ag: Agregar una columna nula | icono=check | col=1 | fila=0 | color=verde | sub=compatible
nodo en: Ensanchar un tipo | icono=check | col=1 | fila=1 | color=verde | sub=int → long, int → double
nodo el: Eliminar o renombrar | icono=x | col=1 | fila=2 | color=rojo | sub=incompatible
nodo pub: Publicar con aviso | icono=correo | col=2 | fila=0 | color=verde
nodo ver: Versión nueva | icono=git | col=2 | fila=2 | color=naranja | sub=pedidos_v2 + vista de transición
flecha c -> ag
flecha c -> en
flecha c -> el
flecha ag -> pub
flecha en -> pub
flecha el -> ver
```

| Cambio | ¿Rompe? | Por qué |
|---|---|---|
| Agregar una columna que puede ser nula | No | Quien no la conoce, la ignora |
| Eliminar una columna | **Sí** | Las consultas que la usan fallan |
| Renombrar una columna | **Sí** | Es eliminar una y agregar otra |
| Ensanchar un tipo (`int` → `long`, `int` → `double`) | En general no | Todo valor viejo entra en el tipo nuevo |
| Achicar un tipo (`double` → `int`) o cambiar a otro (`int` → `string`) | **Sí** | Se pierden datos o fallan los cálculos |
| Agregar un valor nuevo a una lista cerrada (`en_disputa`) | Depende | Las pruebas de valores aceptados fallan; los `CASE` sin `ELSE` dan nulos |

:::cuidado El valor nuevo que nadie anunció
El estado `en_disputa` apareció en bronze en octubre sin aviso (lo encontraste en la lección 1). No cambió ninguna columna, así que ningún control de esquema lo detectó, pero rompe un `CASE` que solo conoce cinco estados y sesga cualquier métrica de "entregados". Los valores permitidos también son parte del contrato.
:::

## Qué hacen las plataformas

- **Delta Lake** aplica *schema enforcement*: si escribes una columna que la tabla no tiene, la escritura falla, salvo que habilites `mergeSchema` para que la agregue ([documentación](https://docs.delta.io/latest/delta-batch.html)).
- Un **registro de esquemas** (como el de Confluent para Kafka) guarda cada versión del esquema de un tópico y rechaza las versiones nuevas que no cumplen la regla de compatibilidad configurada ([documentación de evolución de esquemas](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)).

:::practica python Validar registros contra un contrato
1. Ejecuta: el contrato es un diccionario y la función revisa tipo, nulos y valores permitidos de cada registro.
2. Mira el reporte: cada violación dice en qué fila, qué columna y por qué.
3. Agrega al contrato la regla `"minimo": 0` para `monto` y haz que la función la verifique.

```python
contrato = {
    "pedido_id": {"tipo": int, "nulos": False},
    "estado":    {"tipo": str, "nulos": False, "valores": ["entregado", "enviado", "pendiente", "cancelado", "devuelto"]},
    "monto":     {"tipo": float, "nulos": False},
    "cupon":     {"tipo": str, "nulos": True},
}

filas = [
    {"pedido_id": 1, "estado": "entregado", "monto": 10.5, "cupon": None},
    {"pedido_id": "2", "estado": "enviado", "monto": 3.0, "cupon": "VERANO10"},
    {"pedido_id": 3, "estado": "en_disputa", "monto": 7.0, "cupon": None},
    {"pedido_id": 4, "estado": "pendiente", "monto": None, "cupon": None},
]

for i, fila in enumerate(filas):
    for col, regla in contrato.items():
        v = fila.get(col)
        if v is None:
            if not regla["nulos"]:
                print(f"fila {i}: {col} es nulo")
        elif not isinstance(v, regla["tipo"]):
            print(f"fila {i}: {col} debería ser {regla['tipo'].__name__} y es {type(v).__name__}")
        elif "valores" in regla and v not in regla["valores"]:
            print(f"fila {i}: {col}={v!r} no está entre los valores permitidos")
```

Reto: convierte el bucle en una función `validar(filas, contrato)` que devuelva la lista de violaciones en lugar de imprimirlas.

Documentación oficial: [Validación de esquema en Delta Lake](https://docs.delta.io/latest/delta-batch.html) · [Evolución de esquemas (Confluent)](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)
:::

:::errores
- **Contratos que nadie verifica.** Si no se convierten en pruebas automáticas, son documentación que envejece.
- **Renombrar "porque queda más lindo".** Para los consumidores es eliminar una columna.
- **Olvidar los valores permitidos.** Un estado nuevo rompe tanto como una columna nueva.
- **Cambiar sin versión.** Un cambio incompatible se publica como tabla o vista nueva (`pedidos_v2`) y la vieja convive un tiempo.
:::

:::entrevista
**Pregunta:** "El equipo de la app quiere cambiar `monto` de número a texto con el símbolo de moneda. ¿Qué haces?"

**Respuesta modelo:** "Es un cambio incompatible: todos los que suman `monto` se rompen. Propondría mantener `monto` numérico y agregar una columna nueva `moneda`, que es compatible. Si igual necesitan el cambio, se publica como versión nueva del contrato con fecha de retiro de la vieja, se avisa a los consumidores registrados y se deja una vista de compatibilidad durante la transición."
:::

## Ejercicios

:::ejercicio quiz
¿Cuál de estos cambios de esquema es compatible para quien ya consume la tabla?
- [ ] Renombrar `cliente_id` a `id_cliente`
- [x] Agregar una columna `cupon` que puede ser nula
- [ ] Cambiar `monto` de `double` a `string`
- [ ] Eliminar la columna `canal` porque casi nadie la usa
:::

:::ejercicio python dificultad=Avanzado titulo="Validar filas contra un contrato"
Escribe `validar(filas, contrato)`. `contrato` es un diccionario `{columna: {"tipo": tipo, "nulos": bool, "valores": [...] (opcional)}}`. Devuelve una lista de tuplas `(indice_fila, columna, motivo)` con `motivo` igual a `"nulo"`, `"tipo"` o `"valor"`, en el orden de las filas y, dentro de cada fila, en el orden de las columnas del contrato. Una columna que falta en la fila cuenta como nula.
```python inicial
def validar(filas, contrato):
    pass
```
```python solucion
def validar(filas, contrato):
    errores = []
    for i, fila in enumerate(filas):
        for col, regla in contrato.items():
            v = fila.get(col)
            if v is None:
                if not regla["nulos"]:
                    errores.append((i, col, "nulo"))
            elif not isinstance(v, regla["tipo"]):
                errores.append((i, col, "tipo"))
            elif "valores" in regla and v not in regla["valores"]:
                errores.append((i, col, "valor"))
    return errores
```
```pista
Para cada fila y cada columna del contrato: primero el nulo (con `fila.get(col)`), después el tipo con `isinstance`, y al final los valores permitidos si la regla los tiene.
```
```python test
contrato = {"id": {"tipo": int, "nulos": False}, "estado": {"tipo": str, "nulos": False, "valores": ["a", "b"]}, "nota": {"tipo": str, "nulos": True}}
filas = [{"id": 1, "estado": "a"}, {"id": "2", "estado": "c", "nota": 5}, {"estado": None}]
r = validar(filas, contrato)
assert r == [(1, "id", "tipo"), (1, "estado", "valor"), (1, "nota", "tipo"), (2, "id", "nulo"), (2, "estado", "nulo")], f"Obtuviste {r}"
assert validar([], contrato) == []
```
:::

:::ejercicio python dificultad=Avanzado titulo="¿Qué cambió entre dos esquemas?"
Escribe `cambios(viejo, nuevo)` donde cada esquema es un diccionario `{columna: tipo_como_texto}`. Devuelve un diccionario con tres listas **ordenadas**: `"agregadas"`, `"eliminadas"` y `"tipo_cambiado"` (columnas presentes en los dos con distinto tipo).
```python inicial
def cambios(viejo, nuevo):
    pass
```
```python solucion
def cambios(viejo, nuevo):
    return {
        "agregadas": sorted(c for c in nuevo if c not in viejo),
        "eliminadas": sorted(c for c in viejo if c not in nuevo),
        "tipo_cambiado": sorted(c for c in nuevo if c in viejo and nuevo[c] != viejo[c]),
    }
```
```pista
Es la misma idea que comparar dos fotos de una tabla: lo que está solo en el nuevo, solo en el viejo, y en los dos pero distinto.
```
```python test
v = {"pedido_id": "int", "monto": "int", "canal": "string"}
n = {"pedido_id": "int", "monto": "double", "cupon": "string"}
assert cambios(v, n) == {"agregadas": ["cupon"], "eliminadas": ["canal"], "tipo_cambiado": ["monto"]}, f"Obtuviste {cambios(v, n)}"
assert cambios(v, v) == {"agregadas": [], "eliminadas": [], "tipo_cambiado": []}
```
:::

:::ejercicio python dificultad=Experto titulo="¿El cambio es compatible?"
Escribe `es_compatible(viejo, nuevo)` que devuelva `True` si los consumidores del esquema viejo siguen funcionando con el nuevo. Reglas: **no** se puede eliminar ninguna columna; las columnas nuevas se aceptan; un cambio de tipo solo se acepta si es un ensanche de esta lista: `int`→`long`, `int`→`double`, `float`→`double`, `long`→`double`. Cualquier otro cambio de tipo es incompatible.
```python inicial
def es_compatible(viejo, nuevo):
    pass
```
```python solucion
ENSANCHES = {("int", "long"), ("int", "double"), ("float", "double"), ("long", "double")}

def es_compatible(viejo, nuevo):
    for col, tipo in viejo.items():
        if col not in nuevo:
            return False
        if nuevo[col] != tipo and (tipo, nuevo[col]) not in ENSANCHES:
            return False
    return True
```
```pista
Recorre el esquema **viejo**: cada columna tiene que seguir existiendo, con el mismo tipo o con un ensanche permitido.
```
```pista
Guarda los ensanches en un conjunto de tuplas `(tipo_viejo, tipo_nuevo)`: preguntar si un par está permitido es O(1).
```
```python test
v = {"id": "int", "monto": "float", "canal": "string"}
assert es_compatible(v, {"id": "int", "monto": "float", "canal": "string", "cupon": "string"}) is True
assert es_compatible(v, {"id": "long", "monto": "double", "canal": "string"}) is True
assert es_compatible(v, {"id": "int", "monto": "float"}) is False, "eliminar una columna rompe"
assert es_compatible(v, {"id": "string", "monto": "float", "canal": "string"}) is False
assert es_compatible(v, {"id": "int", "monto": "int", "canal": "string"}) is False, "achicar un tipo rompe"
```
:::
