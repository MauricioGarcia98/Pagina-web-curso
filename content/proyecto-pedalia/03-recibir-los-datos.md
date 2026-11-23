---
titulo: Recibir los datos - la primera entrega y el contrato de datos
nivel: Intermedio
duracion: 40
resumen: El equipo de la app te manda la exportación del primer día. Antes de cargarla, la miras con ojos de detective desde la terminal, encuentras los problemas que trae (algunos avisados y otros no) y escribes el contrato de datos que va a decidir qué es un viaje válido. Tus datos son solo tuyos - salen de una semilla propia.
objetivos: Exportar y explorar archivos desde la terminal | Encontrar duplicados, nulos y valores imposibles antes de cargar | Distinguir problemas avisados de problemas descubiertos | Escribir un contrato de datos y subirlo con un pull request
prerrequisitos: proyecto-pedalia-el-repositorio
autoevaluacion: ¿Sabes contar filas repetidas desde la terminal? | ¿Sabes qué hacer con un viaje que termina antes de empezar? | ¿Sabes por qué el contrato va al repositorio y no a un chat? | ¿Sabes qué pasa si cambias una regla del contrato después de publicar números?
---

:::escenario Lunes, 15:30
Llega un mensaje del equipo de la app: "Les dejamos la exportación del lunes. Ojo que hay cosas raras, en el LEEME están las que conocemos". La palabra clave es **las que conocemos**.
:::

## 1. Tu entrega

Los datos de Pedalia se generan para ti: otra persona que haga el proyecto recibe otros números. Puedes descargarlos acá, pero lo realista es exportarlos desde "el sistema de la app" en la terminal.

<div data-pedalia="entrega"></div>

```bash
pedalia exportar --dia 1
pedalia estado
ls -R ~/pedalia/entrega
cat ~/pedalia/entrega/LEEME.md
```

## 2. Mirar antes de cargar

:::analogia El control de llegada en un almacén
Cuando llega un camión, alguien cuenta las cajas y mira si alguna viene rota **antes** de firmar el remito. Si firmas sin mirar, el problema ya es tuyo. Explorar los archivos antes de cargarlos es ese control: lo que encuentras ahora es una conversación con el equipo de la app; lo que encuentras en producción es un incidente.
:::

Antes de escribir una sola línea de limpieza, contesta estas cinco preguntas sobre el archivo del día 1 **con la terminal**. A este volumen (unos 4.800 viajes por día) no se puede mirar fila por fila: cada respuesta es un comando.

1. ¿Qué columnas tiene, en qué formato vienen las fechas y cuántas filas hay?
2. El LEEME avisa que el sistema reintenta: ¿cuántos `viaje_id` aparecen más de una vez?
3. ¿Cuántos viajes no tienen fin (la bici no se devolvió antes de exportar)?
4. ¿Cuántos viajes terminaron fuera de una estación (destino `99`)?
5. Lo que nadie avisó con precisión: "la estación 13 tuvo problemas de reloj". ¿Qué significa eso **en los datos**? ¿De qué estaciones salen los viajes raros?

<details><summary>Pista 1 · las herramientas</summary>

`head` para ver las primeras líneas, `wc -l` para contar (ojo: cuenta también el encabezado), `cut -d, -f1` para quedarte con una columna, `sort | uniq -d` para ver los valores repetidos y `awk -F,` para filtrar filas por una condición sobre una columna (`$4` es la cuarta).
</details>

<details><summary>Pista 2 · repetidos, sin fin y fuera de estación</summary>

```bash
cd ~/pedalia/entrega/2026-11-09
cut -d, -f1 viajes_2026-11-09.csv | sort | uniq -d | wc -l      # viaje_id que aparecen más de una vez
awk -F, 'NR > 1 && $6 == ""' viajes_2026-11-09.csv | wc -l      # sin fin (columna 6 vacía)
awk -F, 'NR > 1 && $4 == 99' viajes_2026-11-09.csv | wc -l      # destino 99
```
</details>

<details><summary>Pista 3 · el reloj de la estación 13</summary>

Un reloj que atrasa produce viajes que **terminan antes de empezar**. Como las fechas vienen como `AAAA-MM-DD HH:MM:SS`, se pueden comparar como texto: busca filas con fin no vacío y fin menor que inicio, y cuenta de qué estación de origen salen (`{print $3}` y después `sort | uniq -c`).
</details>

:::tip Anota los números
Guarda lo que encontraste: filas totales, repetidas, sin fin, con fin antes del inicio y fuera de estación. Al final de la limpieza, **la cuenta tiene que cerrar**: filas del archivo − repetidas − sin fin − error de reloj = viajes válidos. Si no cierra, algo se perdió en el camino.
:::

## 3. El contrato de datos

El contrato es el documento que dice **qué se espera de la fuente y qué se hace con cada problema**. Lo firman (en sentido figurado) quien produce los datos y quien los usa. Va al repositorio, con historial, porque las reglas cambian y hay que saber desde cuándo.

Escríbelo tú en `docs/contrato.md`, en una rama `docs/contrato`, y súbelo con un pull request. Tiene que decir, como mínimo:

- **De dónde viene** y cuándo llega la fuente.
- **Las columnas**, con su tipo y su regla (qué valores son posibles, qué significa un vacío, qué es el `99`).
- **Qué es un viaje válido** para silver: qué pasa con las filas repetidas, con los viajes sin fin, con los que terminan antes de empezar y con los que quedaron fuera de estación; y de qué día es un viaje que empieza a las 23:50 y termina a las 00:20.
- **El control**: la cuenta que tiene que cerrar al final de la limpieza, y qué hace el pipeline si un archivo no llega o cambia de columnas.

<details><summary>Pista</summary>

Piensa cada regla como una decisión que alguien de finanzas tiene que poder leer y discutir: "los viajes sin fin no entran hoy" es una decisión de negocio, no técnica. Una tabla Markdown (`| columna | tipo | regla |`) para las columnas y una lista numerada para las reglas de silver se leen bien en GitHub.
</details>

:::solucion PD:Contrato | un contrato de datos posible
```bash
cd ~/pedalia-datos
git checkout -b docs/contrato
cat > docs/contrato.md << 'EOF'
# Contrato de datos · viajes de Pedalia (v1)

Fuente: exportación diaria de la app (viajes_AAAA-MM-DD.csv), equipo-app@pedalia.example
Llega: todos los días antes de las 03:00 en landing/pedalia/<fecha>/

## Columnas
| columna | tipo | regla |
|---|---|---|
| viaje_id | entero | identifica el viaje; puede venir repetido (reintentos) |
| bici_id | texto | B-0001 … B-1500 |
| estacion_origen | entero | 1 … 24 |
| estacion_destino | entero | 1 … 24, o 99 = fuera de estación; vacío si el viaje no terminó |
| inicio, fin | fecha y hora | formato AAAA-MM-DD HH:MM:SS, hora local |
| tipo_usuario | texto | abono o pase_dia |
| monto | decimal | pesos; vacío si el viaje no terminó |

## Qué es un viaje válido (silver)
1. Una fila por viaje_id (se descartan las repetidas).
2. Sin fin → en curso: no entra hoy.
3. fin < inicio → error de reloj: no entra (se cuenta aparte).
4. destino 99 → entra, con estacion_destino NULL y fuera_de_estacion = true.
5. fecha del viaje = día de inicio.

## Control
filas del archivo − repetidas − en curso − error de reloj = viajes válidos.
Si un archivo no llega a las 03:00 o cambia de columnas, el pipeline falla y avisa (no se publica nada a medias).
EOF
git add docs/contrato.md
git commit -m "Contrato de datos de viajes v1"
git push -u origin docs/contrato
```
:::

Abre el pull request y, en la descripción, pega los números que encontraste. En un equipo real, este PR lo revisan quien produce los datos (equipo de la app) y quien los usa (finanzas): es el momento de discutir las reglas, **antes** de que haya números publicados.

:::cuidado El contrato no es eterno
Si mañana finanzas decide que los viajes en curso sí cuentan, la regla cambia, **pero los números de los días anteriores también cambian**. Por eso el contrato tiene versión y el cambio se anuncia: "desde el 15/11, los ingresos incluyen viajes en curso; recalculamos los días anteriores".
:::

:::errores
- **Cargar sin mirar** y descubrir los duplicados cuando finanzas pregunta por qué los ingresos subieron 2 %.
- **Arreglar el archivo original a mano** (borrar las filas raras con un editor). El archivo de la fuente no se toca: se guarda tal cual en bronze y la limpieza se hace con reglas, para poder repetirla.
- **Creer que el LEEME dice todo**. Avisaba "problemas de reloj", pero no que eso produce duraciones negativas. Siempre verifica con los datos.
- **Dejar las reglas en un chat**: cuando alguien pregunte en tres meses por qué los viajes de la estación 13 no suman, la respuesta tiene que estar en el repositorio.
:::

:::real En tu computadora y en la web real
En la empresa, la exportación no la generas tú: el equipo de la app la deja en una carpeta compartida, un bucket o un SFTP, y te avisa por correo. Lo que sí es idéntico es **cómo la miras**:

1. Abre la **terminal** de tu computadora y entra a la carpeta donde quedó el archivo (`cd`).
2. Usa `head`, `wc -l`, `cut | sort | uniq -d` y `awk` exactamente como acá: funcionan igual en macOS, Linux y WSL. En Windows sin WSL, usa **Git Bash**.
3. El contrato se escribe en VS Code (`docs/contrato.md`) y se sube con un **pull request** en github.com: botón *Compare & pull request* después del `git push`.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `03-exploracion.png`: la terminal con los conteos (filas, repetidas, sin fin, error de reloj).
- `03-contrato-pr.png`: el pull request del contrato en github.com, con tus números en la descripción.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
`cut -d, -f1 viajes.csv | sort | uniq -d | wc -l` devuelve 96. ¿Qué significa?
- [ ] Que el archivo tiene 96 filas
- [x] Que hay 96 valores de viaje_id que aparecen más de una vez
- [ ] Que hay 96 viajes sin fin
- [ ] Que la columna 1 tiene 96 valores vacíos
:::

:::ejercicio quiz
Encuentras viajes de la estación 13 con fin anterior al inicio. Según el contrato, ¿qué se hace?
- [ ] Se dan vuelta inicio y fin para que la duración sea positiva
- [ ] Se borran del archivo que mandó la app
- [x] No entran en silver ni en los números, y se cuentan aparte para avisarle al equipo de la app
- [ ] Se cargan igual con duración cero
:::

:::ejercicio quiz
¿Por qué el contrato de datos va en el repositorio, con un pull request?
- [ ] Porque Markdown solo funciona en GitHub
- [ ] Porque así nadie lo puede leer sin permiso
- [x] Porque queda versionado y revisado: se sabe qué regla rige desde cuándo y quién la aprobó
- [ ] Porque Airflow lo lee para decidir el horario
:::

## Resumen

- Mira los archivos **antes** de cargarlos: cuenta filas, repetidos, nulos y valores imposibles.
- El LEEME de la fuente ayuda, pero los datos mandan: verifica cada aviso.
- El **contrato de datos** dice qué es válido y qué se hace con cada problema; va versionado en el repositorio.
- La cuenta de control (filas − descartes = válidos) es tu prueba de que la limpieza no perdió nada.
