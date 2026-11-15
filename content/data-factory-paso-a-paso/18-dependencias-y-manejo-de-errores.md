---
titulo: Dependencias y manejo de errores - qué hacer cuando algo falla
nivel: 5 · Avanzado
duracion: 50
resumen: Un pipeline de producción tiene un camino para cuando todo sale bien y otro para cuando algo falla. Agregas a pl_ingesta_diaria una ruta Upon Failure que avisa a la guardia y marca el pipeline como fallido, y una ruta Upon Success que registra el éxito; lo ejecutas con un día sin archivo y con un día con archivo, y entiendes la regla que decide si el pipeline termina en verde o en rojo.
objetivos: Usar Upon Failure para avisar o compensar | Combinar rutas de éxito y de error en un mismo pipeline | Entender cuándo un pipeline termina Succeeded o Failed | Mantener el estado Failed cuando hace falta | Leer Skipped en la salida
prerrequisitos: data-factory-paso-a-paso-lookup-if-condition-y-fail
autoevaluacion: ¿Sabes qué pasa con una actividad Upon Success si la anterior falla? | ¿Sabes por qué un pipeline puede terminar verde aunque una actividad falló? | ¿Sabes cómo forzar que termine en rojo? | ¿Sabes qué significa Skipped?
---

## Paso 1 — Las rutas

En `pl_ingesta_diaria`, selecciona la copia y agrega una **Wait** `Avisar a la guardia`. En **Depends on**, cambia la condición a **Upon Failure**:

```captura
archivo: adf/b18-condicion.webp
texto: Avisar a la guardia depende de la copia con Upon Failure
```

En un pipeline real, "avisar" es una actividad **Web** que llama a Teams o a un servicio de correo (Logic App); en la práctica usamos Wait para ver el camino. Después de ella, agrega un **Fail** `Marcar como fallido` con el mensaje `@concat('La ingesta de ventas falló para ', pipeline().parameters.fecha)`.

Vuelve a seleccionar la copia y agrega otra Wait, `Registrar exito` (queda con Upon Success):

```captura
archivo: adf/b18-lienzo.webp
texto: La copia con dos caminos - rojo hacia la guardia y verde hacia el registro de éxito
```

## Paso 2 — Un día sin archivo

Cambia el parámetro `fecha` a `2026-11-16` y haz **Debug**:

```captura
archivo: adf/b18-debug-falla.webp
texto: La copia falla, la guardia se avisa, el pipeline se marca como fallido y Registrar exito queda Skipped
```

| Actividad | Estado | Por qué |
|---|---|---|
| Armar nombre | Succeeded | — |
| Copiar ventas del dia | **Failed** | No hay archivo del 16 |
| Avisar a la guardia | Succeeded | Su condición era Upon Failure |
| Marcar como fallido | **Failed** | Fail falla a propósito |
| Registrar exito | **Skipped** | Su condición (Upon Success) no se cumplió |

## Paso 3 — Un día con archivo

Vuelve `fecha` a `2026-11-15` y repite:

```captura
archivo: adf/b18-debug-ok.webp
texto: La copia sale bien - el camino de error queda Skipped y Registrar exito corre
```

## Paso 4 — La regla del estado del pipeline

Data Factory decide el estado final así:

- Si una actividad falla y **ninguna** ruta Upon Failure o Upon Completion **la maneja**, el pipeline termina **Failed**.
- Si la falla **sí está manejada** (una actividad conectada con Upon Failure corrió bien), el pipeline puede terminar **Succeeded**: se considera que el error se "atrapó", como un *try-catch*.

:::cuidado El pipeline verde que escondió un error
Sin el `Marcar como fallido`, el día sin archivo el pipeline terminaría **verde**: la guardia recibió un aviso, pero Monitor, las alertas por métricas y quien mire el estado verían "todo bien". Si la falla importa, termina el camino de error con un **Fail** para que el pipeline quede en rojo.
:::

| Patrón | Cómo | Estado final si falla la copia |
|---|---|---|
| **Avisar y fallar** | Upon Failure → aviso → Fail | Failed (recomendado) |
| **Atrapar y seguir** | Upon Failure → actividad alternativa | Succeeded |
| **Siempre limpiar** | Upon Completion → limpieza | Depende de la limpieza y del resto |

## ✅ Lo que lograste

- Armaste rutas de éxito y de error.
- Entiendes Skipped y la regla del estado final.
- Sabes mantener el pipeline en rojo cuando la falla importa.

:::ejercicio quiz
La copia falla. ¿Qué pasa con la actividad conectada con Upon Success?
- [ ] Corre igual
- [x] Queda Skipped
- [ ] Falla también
- [ ] Se reintenta
:::

:::ejercicio quiz
La copia falla y una actividad Upon Failure corre bien. Sin nada más, ¿cómo termina el pipeline?
- [ ] Failed siempre
- [x] Puede terminar Succeeded, porque la falla quedó manejada
- [ ] Skipped
- [ ] Cancelled
:::

:::ejercicio quiz
Quieres que la guardia reciba el aviso y que el pipeline quede en rojo. ¿Qué agregas?
- [ ] Un reintento
- [x] Una actividad Fail al final del camino de error
- [ ] Un trigger
- [ ] Nada
:::

:::ejercicio quiz
Una limpieza de archivos temporales tiene que correr pase lo que pase. ¿Qué condición usas?
- [ ] Upon Success
- [ ] Upon Failure
- [x] Upon Completion
- [ ] Upon Skip
:::
