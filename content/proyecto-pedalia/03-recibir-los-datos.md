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

```bash
cd ~/pedalia/entrega/2026-11-09
head -5 viajes_2026-11-09.csv            # columnas y formato
wc -l viajes_2026-11-09.csv              # filas (incluye el encabezado)
```

**¿Hay viajes repetidos?** El LEEME avisa que el sistema reintenta y puede repetir filas:

```bash
cut -d, -f1 viajes_2026-11-09.csv | sort | uniq -d | wc -l      # cuántos viaje_id aparecen más de una vez
```

**¿Viajes sin cerrar?** Fin vacío (columna 6):

```bash
awk -F, 'NR > 1 && $6 == ""' viajes_2026-11-09.csv | wc -l
```

**¿Bicis fuera de estación?** Destino 99:

```bash
awk -F, 'NR > 1 && $4 == 99' viajes_2026-11-09.csv | wc -l
```

**Lo que nadie avisó con precisión:** "la estación 13 tuvo problemas de reloj". ¿Qué significa en los datos? Busca viajes que terminan antes de empezar. Como las fechas tienen formato `AAAA-MM-DD HH:MM:SS`, se pueden comparar como texto:

```bash
awk -F, 'NR > 1 && $6 != "" && $6 < $5 {print $3}' viajes_2026-11-09.csv | sort | uniq -c
```

Todos salen de la estación 13. Ahora ya sabes **qué** problema causa el reloj: viajes con duración negativa.

:::tip Anota los números
Guarda lo que encontraste: filas totales, repetidas, sin fin, con fin antes del inicio y fuera de estación. Al final de la limpieza, **la cuenta tiene que cerrar**: filas del archivo − repetidas − sin fin − error de reloj = viajes válidos. Si no cierra, algo se perdió en el camino.
:::

## 3. El contrato de datos

El contrato es el documento que dice **qué se espera de la fuente y qué se hace con cada problema**. Lo firman (en sentido figurado) quien produce los datos y quien los usa. Va al repositorio, con historial, porque las reglas cambian y hay que saber desde cuándo.

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
| bici_id | texto | B-0001 … B-0180 |
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
`cut -d, -f1 viajes.csv | sort | uniq -d | wc -l` devuelve 9. ¿Qué significa?
- [ ] Que el archivo tiene 9 filas
- [x] Que hay 9 valores de viaje_id que aparecen más de una vez
- [ ] Que hay 9 viajes sin fin
- [ ] Que la columna 1 tiene 9 valores vacíos
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
