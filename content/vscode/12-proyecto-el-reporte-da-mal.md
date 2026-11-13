---
titulo: Proyecto 3 (pedido con pistas) - "el reporte de comisiones da mal" - depurar, corregir y proteger con tests
nivel: 3 · Intermedio
duracion: 75
resumen: Recursos humanos reclama que las comisiones de los vendedores no cierran. Recibes el script que las calcula, con datos de ejemplo y el resultado que esperan. Reproduces el problema, encuentras los errores con el depurador, los corriges, dejas tests que los cubren y el código limpio según ruff. Entregables claros; las pistas están cerradas.
objetivos: Reproducir un error a partir de un reclamo | Encontrar errores lógicos con el depurador | Corregir sin romper lo que funcionaba | Escribir tests que capturen los errores encontrados | Dejar el código limpio con ruff
prerrequisitos: vscode-tests-con-pytest
autoevaluacion: ¿Sabes reproducir un reclamo con datos concretos? | ¿Sabes usar el depurador para encontrar dos errores distintos? | ¿Sabes escribir un test que habría detectado el error? | ¿Sabes comprobar que ruff no marca nada?
---

:::escenario El pedido
Mensaje de RR. HH.: *"Las comisiones de diciembre no cierran. La regla es: 5 % de las ventas hasta 10.000 y 8 % sobre lo que supera 10.000, más un bono fijo de 200 si vendió más de 20.000. Según nuestras cuentas, Ana tiene que cobrar 900, Bruno 400 y Carla 1.700, y el script dice otra cosa. ¿Podés revisarlo antes del cierre?"*
:::

Desde este proyecto **no hay pasos numerados**: hay entregables. Las pistas están cerradas.

## El script que recibes

Crea **comisiones/comisiones.py** en [VS Code de práctica](#/vscode) con este contenido, tal cual (tiene errores a propósito):

```python norun
import os

VENTAS = {"Ana": 15000, "Bruno": 8000, "Carla": 22500}


def comision(ventas):
    if ventas <= 10000:
        return ventas * 0.05
    base = 10000 * 0.05
    extra = ventas * 0.08
    bono = 200 if ventas >= 20000 else 0
    return base + extra + bono


for nombre, ventas in VENTAS.items():
    print(f"{nombre}: {comision(ventas):.2f}")
```

## Entregable 1 — Reproduce el problema

Ejecuta el script y anota qué da para cada persona contra lo que espera RR. HH. ¿A quién le da bien y a quién mal?

## Entregable 2 — Encuentra los errores con el depurador

Pon un punto de interrupción dentro de `comision` y mira los valores de `base`, `extra` y `bono` para Ana y para Carla. Hay **dos** errores de lógica (y un problema de estilo que marca ruff).

<details><summary>💡 Pista 1</summary>

Para Ana (15.000), el 8 % debería aplicarse solo a lo que supera 10.000, es decir a 5.000. ¿Sobre qué cantidad lo está calculando el script?

</details>

<details><summary>💡 Pista 2</summary>

La regla dice "más de 20.000". ¿Qué pasa con alguien que vende exactamente 20.000? Compara `>` con `>=`.

</details>

## Entregable 3 — Los tests

Un archivo `comisiones/test_comisiones.py` con, al menos:

- un test por cada persona del pedido (los valores de RR. HH.);
- un test del **límite** de 10.000 (exactamente 10.000 → 500);
- un test del **límite** del bono (exactamente 20.000 → sin bono).

Todos tienen que pasar con `pytest`.

<details><summary>💡 Pista</summary>

Para importar la función, el script no debería imprimir al importarse. Envuelve el `for` final en `if __name__ == "__main__":`; así `from comisiones import comision` no ejecuta el print.

</details>

## Entregable 4 — Código limpio

`ruff check comisiones/` sin problemas y `ruff format comisiones/` aplicado.

## ✔ Números de control

| Persona | Ventas | Comisión esperada |
|---|---|---|
| Ana | 15,000 | 900.00 (500 + 400, sin bono) |
| Bruno | 8,000 | 400.00 |
| Carla | 22,500 | 1,700.00 (500 + 1,000 + 200) |
| Límite | 10,000 | 500.00 |
| Límite del bono | 20,000 | 1,300.00 (500 + 800, sin bono) |

## Entrega

1. `pytest` en verde y `ruff check` sin problemas.
2. Un mensaje para RR. HH. que explique **qué estaba mal** en una o dos líneas, sin jerga: *"El 8 % se aplicaba sobre el total y no sobre el excedente de 10.000, y el bono se daba también a quien vendía exactamente 20.000. Ya está corregido y probado; las tres comisiones coinciden con sus cuentas."*

## Rúbrica

| Criterio | Bien | Muy bien |
|---|---|---|
| Diagnóstico | Encontró los dos errores | Explica cada uno con el valor que vio en el depurador |
| Corrección | Los tres valores coinciden | Los límites también funcionan |
| Tests | Hay tests de las tres personas | Incluye los dos límites, con nombres que explican qué prueban |
| Calidad | ruff sin problemas | Código formateado y con `if __name__ == "__main__":` |
| Comunicación | Avisa que está corregido | Explica la causa en lenguaje del negocio |

:::ejercicio quiz
¿Por qué conviene un test con ventas exactamente iguales a 10.000?
- [ ] Porque es un número redondo
- [x] Porque los límites son donde suelen fallar las condiciones (< contra <=)
- [ ] Porque pytest lo exige
- [ ] Para que el test sea más rápido
:::

:::ejercicio quiz
¿Para qué sirve `if __name__ == "__main__":`?
- [ ] Para que el script corra más rápido
- [x] Para que el código de abajo se ejecute solo al correr el archivo, no al importarlo desde un test
- [ ] Para definir la función principal obligatoria
- [ ] Para ocultar errores
:::

:::ejercicio quiz
¿Cuál es el mejor mensaje para RR. HH.?
- [ ] "Arreglé un bug en la línea 10"
- [ ] "Cambié >= por > y extra = (ventas - 10000) * 0.08"
- [x] "El 8 % se aplicaba sobre el total en lugar del excedente y el bono incluía a quien vendía exactamente 20.000; ya está corregido y probado"
- [ ] "Ahora funciona"
:::
