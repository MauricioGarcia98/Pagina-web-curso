---
titulo: Las notas del equipo - lo que se sabía de cada laboratorio
nivel: Avanzado
duracion: 15
resumen: Antes de que llegaras, una consultora armó una prueba de concepto con los archivos de una semana. Dejó un documento con conclusiones. Algunas son ciertas, otras eran ciertas esa semana y otras nunca lo fueron. Léelo como lo leería alguien con experiencia.
objetivos: Detectar suposiciones frágiles en documentación heredada | Convertir conocimiento informal en validaciones automáticas | Anticipar cambios de formato de fuentes externas
prerrequisitos: proyecto-red-analitica-fuentes-y-accesos
autoevaluacion: ¿Sabes qué validación avisaría que un laboratorio cambió el formato? | ¿Sabes por qué leer columnas por posición es frágil? | ¿Sabes qué hacer con un archivo reenviado?
---

## El documento de la consultora

> **Prueba de concepto: integración de resultados (semana 1)**
>
> - Los cinco archivos tienen siempre las mismas columnas en el mismo orden: leemos por posición, es más rápido.
> - Centro usa Latin-1. Ya lo resolvimos fijando la codificación en el lector.
> - Todos los archivos llegan antes de las 07:00, así que la carga corre a las 07:00.
> - El documento es un número: lo usamos directo como identificador del paciente.
> - Sur manda todo en las mismas unidades que los demás (lo vimos en dos archivos).
> - Si un archivo llega dos veces, lo cargamos de nuevo: total, son los mismos datos.
> - Costa: borramos a mano las primeras líneas antes de cargar.

## El hilo con los laboratorios

> **Cerro (sistemas):** nuestro servidor está en UTC, como todos los servidores, ¿no?
>
> **Costa (administración):** el reporte lo saca una persona cuando llega. Si llega tarde, el reporte sale tarde.
>
> **Sur (calidad):** cuando corregimos, subimos el archivo completo con _v2. El viejo no lo borramos: no tenemos permiso de borrar en el servidor.
>
> **Centro (sistemas):** estamos evaluando migrar a un sistema nuevo este mes. Les avisamos.

:::trabajo Cada suposición es una validación que falta
"Siempre las mismas columnas" se convierte en: *comparar el encabezado con el esperado y fallar si cambió*. "Todos llegan antes de las 07:00" se convierte en: *antes de cargar, verificar que llegaron los 5 archivos del día; si no, cargar los que hay y avisar*. Cuando un tercero promete "les avisamos", diseña como si no fuera a avisar.
:::

:::real En tu computadora y en la web real
Estas notas estarían en la wiki de la consultora y en hilos de correo con cada laboratorio. Ábrelas al lado de tus archivos y verifica cada afirmación con los datos (por ejemplo, con `head` y `file` para la codificación). Anota en `docs/hallazgos.md` qué se confirmó.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `03-hallazgos.png`: tus hallazgos por laboratorio, verificados con los datos.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
"Si un archivo llega dos veces, lo cargamos de nuevo". Sur sube un _v2 con 5 valores corregidos. ¿Qué pasa con esa estrategia si se hace con INSERT?
- [ ] Nada: los datos se corrigen solos
- [x] Quedan los resultados duplicados (v1 y v2) y en algunos casos con dos valores distintos: hay que reemplazar el día completo con la última versión
- [ ] Se pierde el archivo original
- [ ] Databricks rechaza el archivo
:::

:::ejercicio quiz
¿Qué validación te avisaría el mismo día que Centro migró de sistema?
- [x] Comparar el encabezado y la codificación del archivo con los esperados, y fallar (o alertar) si cambian
- [ ] Contar las filas
- [ ] Revisar que el archivo exista
- [ ] Ninguna: hay que esperar a que avisen
:::

## Resumen

- La documentación heredada tiene **suposiciones**: verifícalas contra los archivos.
- Lo que "siempre fue así" en una fuente externa **va a cambiar**: valida encabezado, codificación, llegada y versión.
- Un reenvío **reemplaza**; nunca se suma.
