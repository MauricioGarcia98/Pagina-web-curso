---
titulo: Proyecto 3 (pistas cerradas) - tu primera contribución al repositorio del equipo
nivel: 3 · Intermedio
duracion: 75
resumen: Llegas al equipo de datos de Tienda Andina y te asignan el "good first issue" del repositorio pipelines - agregar tests al ETL. Haces todo el ciclo real - tomar el issue, rama, tests con pytest, PR que cierra el issue, revisión de Martín, correcciones si las pide y merge - mientras una compañera sigue subiendo cambios a main. Las pistas están cerradas: ábrelas solo si te trabas.
objetivos: Tomar un issue y comunicar que lo estás haciendo | Trabajar en una rama a partir del main actualizado | Escribir tests de la función que pide el issue | Abrir un PR completo que cierre el issue | Pasar la revisión y fusionar
prerrequisitos: github-fusionar-y-conflictos
autoevaluacion: ¿Sabes avisar en un issue que lo tomas? | ¿Sabes crear la rama desde un main actualizado? | ¿Sabes escribir un PR que un revisor entienda sin preguntarte? | ¿Sabes qué hacer si main cambia mientras trabajas?
---

:::escenario El pedido
Primer día. Martín, el líder técnico, te escribe: *"Bienvenida/o. Para arrancar, tomá el issue #2 de `tienda-andina/pipelines`, el de los tests del ETL: es chico y te hace recorrer todo el flujo. Cuando tengas el PR, asignámelo para revisión. Ojo que Camila está tocando el ETL esta semana."*
:::

Pistas cerradas: intenta cada tarea antes de abrirlas.

## Tarea 1 — Leer el issue y tomarlo

Abre [tienda-andina/pipelines](#/github/tienda-andina/pipelines) → **Issues** → **#2 Agregar tests al ETL**. Lee qué piden (dos casos con casillas). Comenta en el issue que lo tomas y asígnatelo.

<details><summary>💡 Pista</summary>

Comentario: "Lo tomo yo. Voy a agregar `tests/test_etl.py` con los dos casos." Asignar: barra lateral → **Assignees** → *assign yourself*.

</details>

## Tarea 2 — Rama desde el main actualizado

Clona el repositorio (o actualízalo si ya lo tenías) y crea una rama con un nombre que diga qué haces.

<details><summary>💡 Pista</summary>

```bash
cd ~ && git clone https://github.com/tienda-andina/pipelines.git && cd pipelines
# si ya lo tenías: cd ~/pipelines && git switch main && git pull
git switch -c test/etl-filtrar
```

</details>

## Tarea 3 — Los tests

Lee `pipelines/etl.py`: la función `filtrar(filas)` deja solo las filas de `PAISES` con `fecha >= FECHA_INICIO`. Escribe `tests/test_etl.py` con los dos casos del issue y comprueba que pasan con `pytest`.

<details><summary>💡 Pista</summary>

```python norun
import sys
sys.path.insert(0, "pipelines")
from etl import filtrar


def test_descarta_paises_fuera_de_la_lista():
    filas = [{"pais": "Chile", "fecha": "2024-03-01"}, {"pais": "Bolivia", "fecha": "2024-03-01"}]
    assert filtrar(filas) == [{"pais": "Chile", "fecha": "2024-03-01"}]


def test_descarta_fechas_anteriores_al_inicio():
    filas = [{"pais": "Perú", "fecha": "2023-12-31"}, {"pais": "Perú", "fecha": "2024-01-01"}]
    assert filtrar(filas) == [{"pais": "Perú", "fecha": "2024-01-01"}]
```

`mkdir -p tests`, guarda el archivo y corre `pytest` desde la raíz del repositorio: `2 passed`.

</details>

## Tarea 4 — Commit, push y PR

Haz commit con un mensaje claro, sube la rama y abre un PR hacia `main` que **cierre el issue #2**, con descripción (qué, por qué, cómo probar) y con **martin** como revisor.

<details><summary>💡 Pista</summary>

```bash
git add tests/test_etl.py
git commit -m "Agrega tests de filtrar() en el ETL"
git push -u origin test/etl-filtrar
gh pr create --title "Agrega tests de filtrar() en el ETL" --body "Closes #2. Dos tests con pytest: países fuera de PAISES y fechas anteriores a FECHA_INICIO. Cómo probar: pytest"
```

El revisor se agrega en la web: **Reviewers → martin**.

</details>

## Tarea 5 — Si main cambió mientras trabajabas

Camila sube su cambio de México a `main` en algún momento después de tu primer commit. Comprueba si tu rama quedó desactualizada y tráela al día sin perder tu trabajo.

<details><summary>💡 Pista</summary>

`git fetch` muestra que `main -> origin/main` avanzó: llegó el commit de Camila "Agrega México a los países del ETL". Para traerlo: `git pull origin main` en tu rama y `git push`. No hay conflicto porque tú agregaste un archivo nuevo. En la web, el botón **Update branch** del PR hace lo mismo. Fíjate: con México en `PAISES` tus tests siguen pasando, porque usaste Bolivia como país fuera de la lista.

</details>

## Tarea 6 — Revisión y merge

Atiende la revisión de Martín: si pide cambios, corrige en la misma rama. Cuando apruebe, fusiona con **Squash and merge**, borra la rama y actualiza tu `main` local.

<details><summary>💡 Pista</summary>

Si comentó algo, corrige, `git commit -am "..." && git push`, responde y vuelve a pedir revisión (🔄). Después del merge: `git switch main && git pull && git branch -d test/etl-filtrar`.

</details>

## ✔ Control

| Control | Esperado |
|---|---|
| Issue #2 | Cerrado, enlazado a tu PR, con tu comentario |
| Tu PR | Número **#4** (los #1–#3 son issues), estado Merged |
| `tests/test_etl.py` en main | Sí, con 2 tests |
| `pytest` en tu main local | `2 passed` |
| Historia de main | Incluye el commit de Camila (México) y el tuyo |
| Rama `test/etl-filtrar` | Borrada en GitHub y en local |

## Entrega

Comentario en el issue #3 (el de CI): *"Los tests de #2 ya están en main (PR #4). Este issue ya se puede trabajar."* Eso conecta el trabajo: el siguiente paso, CI, depende del tuyo.

:::ejercicio quiz
¿Por qué comentas en el issue que lo tomas?
- [ ] Porque GitHub lo exige
- [x] Para que nadie más trabaje en lo mismo sin saberlo
- [ ] Para cerrarlo
- [ ] Para que corran los tests
:::

:::ejercicio quiz
Tu PR es el #4 aunque es el primer PR del repositorio. ¿Por qué?
- [ ] Porque GitHub salta números
- [x] Porque issues y pull requests comparten la numeración y ya existían los issues #1 a #3
- [ ] Porque hubo PRs borrados
- [ ] Por error
:::

:::ejercicio quiz
Mientras trabajabas, entró un commit nuevo a main. ¿Qué haces?
- [ ] Borro mi rama y empiezo de nuevo
- [x] Traigo main a mi rama (git pull origin main o Update branch), compruebo que los tests pasan y subo
- [ ] Fusiono sin mirar
- [ ] Hago push --force a main
:::
