---
titulo: Git y GitHub: guarda tu trabajo como un profesional
nivel: Básico
duracion: 25
resumen: Control de versiones, commits, ramas, pull requests y el flujo de trabajo en equipo.
---

## ¿Para qué sirve Git?

Imagina que trabajas en un documento y guardas `final.sql`, `final2.sql`, `final_AHORA_SI.sql`… **Git** resuelve eso: guarda un historial de cada cambio, quién lo hizo y por qué, y permite volver atrás o trabajar en paralelo con otras personas sin pisarse.

- **Git** es el programa que lleva el historial en tu computadora.
- **GitHub** (o GitLab, Azure DevOps) es un sitio web donde se guardan los repositorios en la nube para compartirlos y colaborar.

## Conceptos clave

| Concepto | Qué es |
|---|---|
| **Repositorio** (repo) | Una carpeta cuyo historial controla Git |
| **Commit** | Una “foto” de tus cambios con un mensaje que explica qué hiciste |
| **Rama** (*branch*) | Una línea de trabajo paralela. La principal suele llamarse `main` |
| **Merge** | Unir los cambios de una rama en otra |
| **Remote** | La copia del repo en la nube (normalmente se llama `origin`) |
| **Pull request** (PR) | Pedido para que revisen y unan tu rama a `main` |

## El ciclo diario

```bash norun
git clone https://github.com/empresa/pipelines.git   # 1. descargar el repo (una sola vez)
cd pipelines
git switch -c feature/nuevo-modelo                   # 2. crear una rama para tu cambio
# ... editas archivos ...
git status                                           # 3. ver qué cambió
git add modelos/ventas.sql                           # 4. elegir qué cambios guardar
git commit -m "Agrega modelo de ventas diarias"      # 5. guardar la foto
git push -u origin feature/nuevo-modelo              # 6. subir la rama a GitHub
# 7. en GitHub abres un Pull Request, alguien lo revisa y se hace merge
git switch main && git pull                          # 8. actualizar tu main
```

:::analogia Las tres zonas de Git
1. **Directorio de trabajo**: tu escritorio, donde editas.
2. **Staging** (`git add`): la caja donde pones lo que vas a enviar.
3. **Repositorio** (`git commit`): el archivo histórico, con la caja sellada y etiquetada.
:::

## Buenas prácticas

- Commits **pequeños y frecuentes**, con mensajes claros en imperativo: “Agrega test de unicidad”.
- **Nunca** subas contraseñas ni llaves. Usa un archivo `.gitignore` para excluir archivos como `.env`.
- Trabaja siempre en una rama; `main` debe estar siempre funcionando.
- En equipos de datos, los PR se revisan y además corren **CI** (pruebas automáticas, por ejemplo `dbt build`).

:::ejercicio cli
Descarga (clona) el repositorio `https://github.com/empresa/pipelines.git`.
```respuesta
git clone https://github\.com/empresa/pipelines(\.git)?
```
```solucion
git clone https://github.com/empresa/pipelines.git
```
:::

:::ejercicio cli
Mira qué archivos cambiaron y cuáles están preparados para el commit.
```respuesta
git status
git status -s
```
:::

:::ejercicio cli
Agrega **todos** los cambios de la carpeta actual al área de staging.
```respuesta
git add \.
git add -A
git add --all
```
```solucion
git add .
```
:::

:::ejercicio cli
Haz un commit con el mensaje `Agrega limpieza de clientes`.
```respuesta
git commit -m ["']Agrega limpieza de clientes["']
```
```solucion
git commit -m "Agrega limpieza de clientes"
```
:::

:::ejercicio cli
Crea una rama nueva llamada `feature/airflow-dag` y cámbiate a ella en un solo comando.
```respuesta
git switch -c feature/airflow-dag
git checkout -b feature/airflow-dag
```
:::

:::ejercicio quiz
¿Qué archivo usas para que Git **ignore** tu archivo `.env` con contraseñas?

- [ ] README.md
- [x] .gitignore
- [ ] .env.example
- [ ] git.config
:::
