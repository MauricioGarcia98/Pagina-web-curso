---
titulo: Secretos y variables - contraseñas fuera del código, también en GitHub Actions
nivel: 5 · Avanzado
duracion: 45
resumen: Un pipeline necesita contraseñas, tokens y cadenas de conexión, y ninguna puede estar en el código. Guardar un secreto en el repositorio, usarlo en un workflow con secrets, ver cómo GitHub lo enmascara con *** en los logs, la diferencia con las variables (vars), los niveles (repositorio, entorno, organización) y por qué lo mejor es no tener secretos - OIDC.
objetivos: Crear un secreto de repositorio | Usar secrets y vars en un workflow | Comprobar que el log enmascara el secreto | Distinguir secreto de variable y sus niveles | Explicar OIDC como alternativa a claves fijas
prerrequisitos: github-proyecto-ci-y-proteccion
autoevaluacion: ¿Sabes dónde se crea un secreto? | ¿Sabes pasarle un secreto a un paso? | ¿Sabes por qué un secreto no se puede volver a leer? | ¿Sabes cuándo usar una variable en lugar de un secreto?
---

:::analogia En palabras simples
Un secreto de GitHub es como una caja fuerte con ranura: puedes meter la llave, y el workflow la puede usar, pero nadie (ni tú) puede volver a sacarla para mirarla. Si alguien la imprime en el log, GitHub tapa lo impreso con `***`.
:::

## Paso 1 — Crear el secreto

En `ventas-app`: **Settings → Secrets and variables → Actions → New repository secret**.

```captura
archivo: github/g17-secreto-nuevo.webp
texto: El nombre DB_PASSWORD (1) y el valor (2), un dato de práctica
```

```captura
archivo: github/g17-secretos.webp
texto: El secreto creado - se ve el nombre y la fecha, nunca el valor
```

- Los nombres van en MAYÚSCULAS con guion bajo y no pueden empezar con `GITHUB_`.
- El valor no se puede volver a ver: solo **actualizar** o **borrar**. Si lo pierdes, lo rotas.

## Paso 2 — Usarlo en un workflow

Agrega un job a tu workflow (o crea `.github/workflows/carga.yml`):

```yaml
name: carga
on:
  workflow_dispatch:
jobs:
  cargar:
    runs-on: ubuntu-latest
    env:
      ENTORNO: ${{ vars.ENTORNO }}
    steps:
      - uses: actions/checkout@v4
      - name: Conectar a la base
        env:
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
        run: |
          echo "Entorno: $ENTORNO"
          python -c "import os; print('La clave tiene', len(os.environ['DB_PASSWORD']), 'caracteres')"
          echo "Intento imprimirla: $DB_PASSWORD"
```

- `secrets.DB_PASSWORD` se pasa al paso como **variable de entorno**; tu código la lee con `os.environ["DB_PASSWORD"]`.
- `workflow_dispatch` agrega el botón **Run workflow** en Actions para correrlo a mano.

Antes de correrlo crea la variable `ENTORNO` con el valor `dev` (paso 4). Como main está protegida desde la lección 14, el workflow entra por PR. Después, **Actions → carga → Run workflow**.

## Paso 3 — El enmascarado

En el log del paso (con el secreto `clave-de-practica-123` de la captura) vas a ver:

```text
Entorno: dev
La clave tiene 21 caracteres
Intento imprimirla: ***
```

GitHub reemplaza el valor del secreto por `***` en todo el log.

:::cuidado El enmascarado no es una protección completa
Si el workflow transforma el secreto (lo codifica en base64, lo imprime letra por letra, lo escribe en un archivo que se sube como artefacto), el resultado **no** se enmascara. La regla es simple: **nunca imprimas un secreto**, ni para depurar.
:::

## Paso 4 — Variables: configuración que no es secreta

Pestaña **Variables → New repository variable**: `ENTORNO` = `dev`. Se leen con `${{ vars.ENTORNO }}` y se ven en texto claro.

| Usa | Para |
|---|---|
| **Secreto** | Contraseñas, tokens, claves de API, cadenas de conexión con credenciales |
| **Variable** | Nombre del entorno, región, nombre de un bucket, versión de una herramienta |

## Paso 5 — Niveles

| Nivel | Dónde | Para qué |
|---|---|---|
| **Repositorio** | Settings del repositorio | Lo de un solo proyecto |
| **Entorno** (*environment*) | Settings → Environments (`dev`, `prod`) | Secretos distintos por entorno; `prod` puede exigir aprobación manual antes de correr |
| **Organización** | Settings de la organización | Compartido por varios repositorios |

En un job se elige el entorno con `environment: prod`; los secretos de ese entorno pisan a los del repositorio con el mismo nombre.

:::nota En la práctica
La réplica tiene secretos y variables de repositorio. Los *environments* con aprobación son de GitHub real (lección 22).
:::

## Paso 6 — Mejor que un secreto: OIDC

Una clave fija guardada como secreto puede filtrarse y dura hasta que alguien la rote. Con **OIDC** (OpenID Connect), el workflow pide a la nube (Azure, AWS, GCP, Databricks) una credencial **temporal** que dura minutos, y la nube confía en GitHub porque configuraste "este repositorio, esta rama, puede entrar". No hay ninguna clave guardada en GitHub.

```yaml
permissions:
  id-token: write   # permite pedir el token OIDC
  contents: read
```

Con `azure/login`, `aws-actions/configure-aws-credentials` o `google-github-actions/auth` se configura en pocas líneas. Es lo recomendado para desplegar a producción.

## ✅ Lo que lograste

- Guardaste un secreto y lo usaste en un workflow.
- Viste el enmascarado con `***` y sus límites.
- Sabes cuándo usar variable o secreto, y los niveles.
- Sabes qué es OIDC y por qué es mejor que una clave fija.

:::ejercicio quiz
¿Cómo pasas el secreto DB_PASSWORD a un paso del workflow?
- [ ] Escribiendo la contraseña en el YAML
- [x] Con env: DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
- [ ] Con vars.DB_PASSWORD
- [ ] Leyendo un archivo .env del repositorio
:::

:::ejercicio quiz
Olvidaste el valor de un secreto que guardaste en GitHub. ¿Qué haces?
- [ ] Lo veo en Settings
- [ ] Lo imprimo en un workflow
- [x] Genero uno nuevo en el sistema de origen y actualizo el secreto
- [ ] Le pido a GitHub que me lo mande
:::

:::ejercicio quiz
¿Qué ventaja tiene OIDC sobre guardar una clave de la nube como secreto?
- [ ] Ninguna
- [x] No hay una clave fija guardada: el workflow recibe credenciales temporales que duran minutos
- [ ] Es más rápido de escribir
- [ ] Funciona sin internet
:::
