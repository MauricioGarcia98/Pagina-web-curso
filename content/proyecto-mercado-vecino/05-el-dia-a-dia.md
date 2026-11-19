---
titulo: El día a día - tickets, incidentes y preguntas de negocio
nivel: Avanzado
duracion: 40
resumen: La entrega inicial es solo el comienzo. Durante los días siguientes llegan pedidos nuevos de finanzas, marketing, operaciones, seguridad y plataforma; la app cambia sin avisar; PagoYa rota un secreto; el conector del CDC se reinicia. Todo aparece en el tablero del equipo, con su revisión automática, y te obliga a usar las otras herramientas - Data Factory, Airflow, Power BI, Snowflake y GitHub - como en una empresa.
objetivos: Priorizar un tablero con requerimientos, incidentes y preguntas | Pedir aclaraciones antes de calcular una métrica ambigua | Responder preguntas de negocio con números que se puedan defender | Absorber cambios de esquema y de credenciales sin perder datos | Conectar la solución con orquestación, BI, el almacén de finanzas y el repositorio | Escribir un postmortem útil
prerrequisitos: proyecto-mercado-vecino-la-entrega
autoevaluacion: ¿Sabes qué hacer primero cuando llegan a la vez un incidente y una pregunta de dirección? | ¿Sabes qué preguntar antes de calcular "pedidos que no se pagaron"? | ¿Sabes qué le pasa a tu pipeline cuando la base agrega una columna? | ¿Sabes qué va en un postmortem?
---

:::escenario Miércoles, 9:00
Entregaste la conciliación. Valentina está contenta y, como pasa siempre, eso trae más trabajo. En el tablero del equipo ya hay preguntas de dirección y de operaciones, y Carla, tu líder, te avisa que en los próximos días plataforma y seguridad van a pedir lo suyo.
:::

## El tablero

<div data-mercado="tablero"></div>

Los tickets **aparecen con los días**, a la hora en que alguien los escribiría, según cuándo empezaste el proyecto. No es un orden de lectura: es tu cola de trabajo. Cada uno se cierra solo cuando la revisión lee el estado real de tus herramientas (o tu respuesta) y da bien.

## Cómo trabaja un equipo de datos con esto

| Tipo | Qué es | Cómo se atiende |
|---|---|---|
| 🔥 **Incidente** | Algo dejó de funcionar o los números están mal *ahora* | Primero. Contienes (que no empeore), arreglas, verificas y escribes el postmortem |
| ❓ **Pregunta** | Alguien necesita un número para decidir | Aclaras la definición, calculas, y respondes con el número **y** cómo lo calculaste |
| 📋 **Requerimiento** | Algo nuevo que construir | Se planifica: criterios de aceptación, estimación, PR, revisión |

:::trabajo Las preguntas de negocio no son consultas
"¿Cuántos pedidos se nos caen sin pagar?" parece una línea de SQL, pero antes hay que decidir qué es "caerse", qué es "pagar" y qué día es "ayer" (¿en UTC o en hora de la tienda?). En los tickets vas a ver el hilo de aclaraciones: léelo antes de calcular. Cuando respondas en un trabajo de verdad, acompaña el número con la definición que usaste ("pedidos creados el 18, hora de Ciudad del Río; pagado = con pago aprobado en PagoYa"). Así nadie compara peras con manzanas.
:::

## Las herramientas que vas a necesitar

Ningún ticket te dice qué herramienta usar, pero cada área ya tiene las suyas:

- **Data Factory** es lo que plataforma usa para las ingestas programadas. Su conector REST se autentica con OAuth (como en Pedalia) o, para una API con clave como PagoYa, con *Anonymous* más una cabecera `Authorization` cuyo valor sale del Key Vault.
- **Airflow** orquesta todo lo que corre solo: un DAG puede disparar el pipeline de Data Factory y el job de Databricks que consume el CDC.
- **Power BI** es donde finanzas mira los números. Se conecta a Databricks.
- **Snowflake** es donde trabajan el contador y la auditoría. Se carga desde el lago con un stage externo, como en Pedalia.
- **GitHub**: el código del equipo, con PRs y un workflow. Sin secretos.
- **Jupyter, Excel o el SQL de Databricks** para las preguntas: lo que te resulte más rápido y más fácil de explicar.

## Cuando algo se rompe: el postmortem

Cada incidente se cierra con un postmortem corto en [Mis notas](#/notas). No busca culpables: busca que no vuelva a pasar.

```text
Incidente: <título>                      Fecha: <día>
Impacto:   qué números estuvieron mal, para quién y durante cuánto tiempo
Detección: cómo nos enteramos (¿una persona? ¿una alerta?) y cuánto tardamos
Causa:     qué pasó de verdad (no "error humano": qué permitió el error)
Arreglo:   qué hicimos para volver a la normalidad
Acciones:  qué cambiamos para enterarnos antes o para que no se repita (con responsable)
```

:::cuidado Lo que más se olvida
Que **nadie te avisa** de los cambios: la app agrega columnas, un proveedor rota un secreto, alguien reinicia un conector. Un buen pipeline no lo adivina, pero tampoco se queda callado: falla con un mensaje claro o genera una alerta. En cada postmortem pregúntate qué alerta te hubiera avisado antes que la persona que escribió el ticket.
:::

## Ejercicios

:::ejercicio quiz
A las 9:00 tienes en el tablero un incidente ("los totales no cuadran") y una pregunta de dirección para una reunión de las 11:00. ¿Qué haces primero?
- [ ] La pregunta, porque dirección es más importante
- [x] Mirar el incidente primero: si los datos están mal, la respuesta a dirección también lo estaría. Avisas a dirección que estás en un incidente y cuándo vas a tener el número
- [ ] Las dos a la vez, sin avisar a nadie
- [ ] El incidente, sin responder a dirección hasta terminarlo
:::

:::ejercicio quiz
La app agregó las columnas descuento y cupon a pedidos. Tu MERGE hace UPDATE SET con una lista fija de columnas. ¿Qué pasa?
- [ ] El MERGE falla y te enteras enseguida
- [x] El MERGE sigue funcionando y las columnas nuevas no llegan a silver: nadie se entera hasta que alguien nota que los números no cuadran
- [ ] Databricks agrega las columnas solo
- [ ] Se borran los pedidos con cupón
:::

:::ejercicio quiz
PagoYa rotó el secreto y durante 24 horas manda dos firmas v1 en la misma cabecera. Tu código arma un diccionario con los pares clave=valor de la cabecera. ¿Qué riesgo hay?
- [ ] Ninguno: con una firma alcanza
- [x] El diccionario se queda con un solo v1 (el último); si ese no es el que verificas, rechazas entregas válidas. Hay que probar cada v1 contra los secretos vigentes
- [ ] Que PagoYa deje de enviar webhooks
- [ ] Que se dupliquen los eventos
:::

## Resumen

- El trabajo no termina con la entrega: llegan **requerimientos**, **incidentes** y **preguntas**, y se atienden en ese orden de urgencia (incidentes primero).
- Una pregunta de negocio empieza por **la definición**: léela en el hilo o pregúntala.
- Los cambios llegan **sin aviso**: esquema, credenciales, conectores. Prepara el pipeline para fallar ruidosamente.
- Cada área usa su herramienta: la solución completa cruza Data Factory, Databricks, Airflow, Power BI, Snowflake y GitHub.
- Cada incidente termina en un **postmortem** con acciones concretas.
