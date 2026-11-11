---
titulo: Cómo aprender esto - método de estudio, pedir ayuda y la IA como tutor
nivel: Básico
duracion: 30
resumen: Aprender a programar no depende de talento: depende de un método. Cómo estudiar, qué hacer cuando te trabas, cómo preguntar y cómo usar una IA sin que te quite el aprendizaje.
objetivos: Armar una rutina de estudio realista y sostenible | Aplicar la regla de los 15 minutos cuando te trabas | Hacer una buena pregunta (a una persona o a una IA) | Usar la IA como tutor y no como copia | Repasar para no olvidar
prerrequisitos: cero-leer-errores
autoevaluacion: ¿Tienes un horario fijo de estudio, aunque sea corto? | ¿Sabes qué hacer en los primeros 15 minutos de estar trabado? | ¿Tu última pregunta incluía qué intentaste y el error exacto? | ¿Le pides a la IA que te explique, en vez de que te lo resuelva? | ¿Repasas lo de la semana anterior?
---

:::escenario "No soy bueno para esto"
Esto le pasa a casi todo el que empieza, también a quienes después consiguen trabajo en datos. Tres semanas después de arrancar, Lucía le escribe a una amiga que ya trabaja en el tema: *"Creo que no soy bueno para esto. Me trabo en todo y me olvido de lo que vi la semana pasada."*

La amiga le responde: *"A mí me pasó lo mismo. No es falta de talento: estás estudiando sin método. Nadie aprende a programar leyendo; se aprende practicando un poquito todos los días, equivocándose y repasando."* Es exactamente el método que acabas de ver.
:::

:::analogia En palabras simples
Aprender a programar se parece más a aprender a andar en bicicleta que a estudiar historia: no alcanza con leer cómo se hace, hay que subirse, caerse y volver a intentar. Un poco todos los días rinde mucho más que muchas horas de golpe una vez por semana.
:::

## 1. Poco y seguido le gana a mucho y de vez en cuando

Una hora por día, cinco días por semana, rinde mucho más que diez horas un sábado. El cerebro consolida lo aprendido **entre** sesiones, mientras descansas y duermes. Elige un horario fijo (aunque sea 30 minutos) y cuídalo como una cita.

Una sesión que funciona:

1. **5 minutos**: repasa lo de la vez anterior (las tarjetas de repaso del sitio sirven para esto).
2. **20 minutos**: lee una sección de la lección y prueba cada ejemplo con ▶ **Probar**.
3. **30 minutos**: haz los ejercicios. Escríbelos tú, aunque sea más lento.
4. **5 minutos**: anota en "Mis notas" una cosa que aprendiste y una duda.

## 2. Escribe el código, no lo copies

Leer código y entenderlo **no es lo mismo** que saber escribirlo. Es como ver a alguien andar en bicicleta: parece fácil hasta que te subes. Cuando copias y pegas, tu cabeza no registra los detalles (los dos puntos, las comillas, el orden). Cuando lo escribes, sí.

## 3. La regla de los 15 minutos

Cuando te trabas:

- **Antes de los 15 minutos**: insiste tú. Lee el error, revisa la línea, cambia una cosa por vez, mira la pista.
- **A los 15 minutos**: pide ayuda o mira la solución. Seguir más tiempo solo frustra.
- **Si miras la solución**: entiéndela, ciérrala y **escríbela de nuevo sin mirar**. Mañana vuelve a hacer ese ejercicio.

## 4. Cómo hacer una buena pregunta

Una buena pregunta tiene cuatro partes. Sirve igual para un compañero, un foro o una IA:

1. **Qué quieres lograr**: "Quiero contar los pedidos por país".
2. **Qué hiciste**: el código, completo (no una foto).
3. **Qué pasó**: el error exacto, copiado, o el resultado que obtienes.
4. **Qué esperabas** y qué ya probaste.

| Mala pregunta | Buena pregunta |
|---|---|
| "No me anda el SQL, ayuda" | "Quiero contar pedidos por país. Escribí `SELECT pais, COUNT(*) FROM pedidos`. Me da una sola fila. Esperaba una fila por país. Probé con `ORDER BY` y sigue igual." |

Muchas veces, al escribir la pregunta bien, **encuentras la respuesta solo**. (En el ejemplo: falta el `GROUP BY pais`).

## 5. La IA como tutor, no como copia

Una IA como Claude o ChatGPT puede ser el mejor profesor particular que tuviste… o la forma más rápida de no aprender nada. La diferencia está en **qué le pides**.

| Le pides que… | Resultado |
|---|---|
| "Resuélveme este ejercicio" | Tienes la respuesta y no aprendiste. En la entrevista, sin IA, te trabas. |
| "Explícame este error en español simple, sin darme la solución" | Entiendes qué pasó y lo arreglas tú. |
| "Dame una pista, no la respuesta" | Avanzas sin que te lo hagan. |
| "Revisa mi solución: ¿qué haría distinto alguien con experiencia?" | Aprendes buenas prácticas. |
| "Hazme 3 ejercicios parecidos a este, sin soluciones" | Practicas más. |
| "Explícame `GROUP BY` como si tuviera 12 años, con un ejemplo de una tienda" | Una explicación a tu medida. |

:::cuidado La IA también se equivoca
Las IA a veces inventan funciones que no existen o dan respuestas desactualizadas con total seguridad. Por eso **siempre ejecuta y prueba** lo que te sugieren, y desconfía si algo no coincide con la documentación oficial. Y nunca pegues contraseñas, claves ni datos de clientes en una IA pública.
:::

:::trabajo
En los equipos de datos de hoy se usan asistentes de IA todos los días (Genie Code en Databricks, Copilot, Claude). Lo que se espera de un profesional es que **entienda y revise** lo que la IA propone: que detecte cuando inventa una columna, cuando el JOIN duplica filas o cuando el código funciona pero es lento. Eso solo lo puede hacer alguien que aprendió los fundamentos sin atajos.
:::

## 6. Repasar para no olvidar

Olvidar es normal: sin repaso, en una semana se va la mayor parte de lo que viste. Lo que lo evita es **recordar activamente** (intentar sacarlo de la memoria, no releer):

- Usa las **tarjetas de repaso** del sitio: te muestran cada concepto justo cuando estás por olvidarlo.
- Una vez por semana, vuelve a resolver **sin mirar** dos ejercicios de la semana anterior.
- Explícale a alguien (o a tu cuaderno) lo que aprendiste. Si no puedes explicarlo simple, todavía no lo entendiste del todo.

## 7. Compárate con tu versión de hace un mes

Todos los que empiezan sienten que los demás saben más. No mires a los demás: mira tu progreso. Hace un mes no sabías qué era una ruta; hoy lees errores en inglés. Eso es avanzar.

## Practica

:::ejercicio quiz
Llevas 40 minutos trabado en un ejercicio, cada vez más frustrado. ¿Qué haces?
- [ ] Sigues hasta resolverlo, cueste lo que cueste
- [ ] Lo saltas y no vuelves nunca
- [x] Pides ayuda o miras la solución, la entiendes, la cierras, la escribes sin mirar y mañana vuelves a ese ejercicio
- [ ] Copias la solución y sigues
```explicacion
Pasados los 15 minutos, insistir solo suma frustración. Lo que importa es entender la solución y practicarla de nuevo sin mirar.
```
:::

:::ejercicio quiz
¿Cuál de estos pedidos a una IA te ayuda más a **aprender**?
- [ ] "Escribe el código de este ejercicio"
- [x] "Este es mi código y este es el error. Explícame qué significa el error, sin darme la solución"
- [ ] "Hazme todos los ejercicios de la lección"
- [ ] "¿Cuál es la respuesta correcta del quiz?"
```explicacion
Pedir que te **explique** sin resolver te obliga a hacer el último paso tú. Así el conocimiento queda.
```
:::

:::ejercicio quiz
¿Qué le falta a esta pregunta en un foro: "Mi consulta no funciona, ¿alguien sabe por qué?"
- [ ] Nada, está bien
- [x] El código completo, el error exacto, qué esperabas y qué probaste
- [ ] Más signos de exclamación
- [ ] El nombre de tu empresa
```explicacion
Sin el código ni el error, nadie puede ayudarte. Con las cuatro partes, la mitad de las veces la respuesta aparece mientras escribes.
```
:::

:::ejercicio quiz
¿Cuál plan de estudio funciona mejor?
- [ ] 8 horas seguidas un sábado al mes
- [x] 45 minutos de lunes a viernes, empezando cada sesión con 5 minutos de repaso
- [ ] Leer todas las lecciones primero y practicar al final
- [ ] Estudiar solo cuando hay ganas
```explicacion
Sesiones cortas y frecuentes, con repaso al inicio, aprovechan cómo consolida la memoria. Y la práctica va junto con la lectura, no al final.
```
:::

:::ejercicio quiz
Una IA te sugiere usar la función `df.limpiar_duplicados()` de pandas, pero al ejecutar aparece `AttributeError: 'DataFrame' object has no attribute 'limpiar_duplicados'`. ¿Qué pasó?
- [ ] Tienes una versión vieja de pandas
- [x] La IA inventó una función que no existe; la real es `drop_duplicates()`. Por eso siempre hay que probar y contrastar con la documentación
- [ ] Hay que reiniciar Python
- [ ] Falta instalar la función
```explicacion
*has no attribute* = "no tiene eso". Las IA a veces inventan nombres con mucha seguridad. Probar y leer la documentación es tu red de seguridad.
```
:::

:::ejercicio abierto titulo="Tu plan de estudio"
Escribe tu plan de estudio para las próximas cuatro semanas: qué días y a qué hora estudias, cuánto tiempo, qué módulos cubres, cuándo repasas y qué haces si un día no puedes. Guárdalo también en "Mis notas" para volver a mirarlo.
```solucion
Lunes a viernes, 19:00 a 19:45, en el escritorio y con el teléfono en otra habitación.
Cada sesión: 5 min de tarjetas de repaso, 15 min de lectura probando los ejemplos, 25 min de ejercicios.
Semana 1: Antes de empezar (lecciones 1 a 6). Semana 2: Fundamentos 1 a 4. Semana 3: Fundamentos 5 a 8. Semana 4: SQL 1 a 4.
Sábado, 30 min: repaso semanal (rehacer sin mirar dos ejercicios de la semana).
Si un día no puedo: hago solo los 5 minutos de tarjetas, para no cortar la racha.
Si me trabo más de 15 minutos: pista, solución, la entiendo, la reescribo sin mirar y la anoto para repetir.
```
```rubrica
Tiene días y horario concretos (no "cuando pueda")
La duración de cada sesión es realista para tu vida
Incluye repaso (al inicio de cada sesión o semanal)
Dice qué módulos o lecciones cubre cada semana
Tiene un plan B para los días difíciles
Incluye qué hacer cuando te trabas
```
:::
