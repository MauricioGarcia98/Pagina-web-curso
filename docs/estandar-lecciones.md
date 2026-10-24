# Estándar de lecciones

Cada lección del curso se escribe y se revisa desde cuatro roles. Una lección se publica solo cuando cumple la checklist de los cuatro.

## Los cuatro roles

| Rol | Pregunta que se hace | Qué aporta |
|---|---|---|
| 🎓 **Diseñador instruccional** | ¿Qué va a poder **hacer** el alumno al terminar, y cómo lo sabe? | Objetivos medibles, prerrequisitos, secuencia, práctica graduada, autoevaluación |
| 🧑‍💻 **Ingeniero de datos senior** | ¿Así se hace en una empresa? ¿Qué se rompe en producción? | El caso de negocio, "En el trabajo real", errores frecuentes, preguntas de entrevista |
| 🐣 **Alumno principiante** | ¿Entiendo cada palabra? ¿Puedo seguir cada paso sin saltos? | Marca términos sin definir, pasos implícitos, ejemplos que no se entienden |
| 🔍 **QA técnico** | ¿Todo lo que dice la lección es cierto y funciona? | Ejecuta cada ejemplo y cada ejercicio, verifica números y salidas mostradas |

## Estructura de una lección

```markdown
---
titulo: …
nivel: Básico | Intermedio | Avanzado | Experto
duracion: 40
resumen: Una línea.
objetivos: Verbo + qué, medible | … | …            (3 a 5, empiezan con verbo: escribir, calcular, explicar, detectar…)
prerrequisitos: sql-select | sql-where             (ids de lecciones; aparecen como enlaces)
autoevaluacion: ¿Puedes …? | …                     (4 a 6 preguntas que el alumno marca)
---

:::escenario
El problema de negocio concreto que motiva la lección (quién pide qué y por qué importa).
:::

## La idea en una frase / Analogía
## El concepto, paso a paso         (cada término nuevo se define la primera vez que aparece)
## Ejemplo resuelto                  (se ejecuta; se explica línea por línea y se muestra el resultado)
## Variantes y casos borde           (NULL, vacíos, duplicados, empates, fechas…)
:::errores                           (los 3–5 errores reales más comunes, con el síntoma y la corrección)
:::trabajo                           (cómo se usa en una empresa: convenciones, rendimiento, revisión de código)
:::entrevista                        (una pregunta típica y cómo responderla)
## Resumen                           (tabla o lista corta)
## Ejercicios                        (de guiado a independiente: completar → escribir → caso de negocio)
```

## Checklist por rol

**🎓 Diseñador instruccional**
- [ ] Los objetivos empiezan con un verbo observable y cada uno tiene al menos un ejercicio que lo evalúa.
- [ ] Los prerrequisitos existen y están enlazados.
- [ ] Hay un ejemplo resuelto antes del primer ejercicio.
- [ ] Los ejercicios suben de dificultad: al menos uno guiado (con código inicial) y uno de caso de negocio.
- [ ] La autoevaluación cubre todos los objetivos.

**🧑‍💻 Ingeniero de datos senior**
- [ ] El caso inicial es un problema que de verdad pasa en una empresa, con un pedido concreto.
- [ ] "En el trabajo real" explica convenciones, rendimiento o cómo se revisa ese código.
- [ ] Los errores frecuentes son los que se ven en producción, con su síntoma.
- [ ] Lo que se enseña no es una mala práctica (nada de `SELECT *` en producción sin aclararlo, secretos en el código, etc.).

**🐣 Alumno principiante**
- [ ] Ningún término aparece sin definirse antes (o sin enlace a donde se definió).
- [ ] Cada bloque de código se explica: qué hace cada parte y qué resultado esperar.
- [ ] No hay saltos del tipo "es obvio que…".

**🔍 QA técnico**
- [ ] `node tools/validate.mjs <módulo>` pasa sin errores (ejemplos y ejercicios).
- [ ] Los números y salidas que muestra el texto coinciden con los datos reales.
- [ ] Los comandos de terminal se probaron en el simulador.

## Diagramas

Los diagramas se escriben dentro de la lección en un bloque `diagrama`. El sitio los dibuja con trazo a mano (rough.js, la librería de Excalidraw), con íconos, y se pueden ampliar a pantalla completa.

```text
```diagrama
titulo: Texto que va debajo del diagrama
nodo app: App y web | icono=movil | col=0 | fila=0 | sub=texto chico
nodo db: Base de datos | icono=base | col=1 | fila=0 | forma=cilindro | color=azul
grupo nube: AWS | nodos=db | color=naranja
flecha app -> db: guarda el pedido | estilo=punteada
```
```

- **Hasta 4 columnas** (`col` 0 a 3). Si el recorrido es más largo, sigue en la fila de abajo.
- `forma`: `caja` (por defecto), `cilindro`, `nube`, `nota`.
- `color`: azul, verde, naranja, rojo, violeta, amarillo, gris, cian, rosa.
- Flechas: `a -> b`, `a <-> b` (doble) o `a -- b` (sin punta); `estilo=punteada`.
- Saltos de línea en textos: `\n`.
- Íconos disponibles: `base`, `bucket`, `archivo`, `archivos`, `csv`, `json`, `nube`, `servidor`, `usuario`, `equipo`, `movil`, `web`, `api`, `engranaje`, `spark`, `reloj`, `orquestador`, `transformar`, `grafico`, `dashboard`, `stream`, `lambda`, `candado`, `llave`, `tabla`, `notebook`, `codigo`, `git`, `cubo`, `capas`, `almacen`, `alerta`, `correo`, `lupa`, `ml`, `dinero`, `carrito`, `camion`, `avion`, `hospital`, `banco`, `musica`, `auto`, `telefono`, `energia`, `hotel`, `escudo`, `comida`, `check`, `x`, `docker`, `terraform`, `kafka`.
- Si un nodo no tiene `col`/`fila`, se ubica solo según las flechas.
