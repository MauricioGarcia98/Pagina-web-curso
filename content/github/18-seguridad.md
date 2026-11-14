---
titulo: Seguridad en GitHub - claves filtradas, push protection, Dependabot y buenas prácticas
nivel: 5 · Avanzado
duracion: 50
resumen: El error de seguridad más común de un equipo de datos es subir una clave al repositorio. Qué hace GitHub cuando detecta una (secret scanning y push protection), qué tienes que hacer tú (rotar, no solo borrar), cómo te avisa de librerías vulnerables (Dependabot), cómo endurecer los workflows y tu cuenta, y un plan de respuesta para cuando pasa.
objetivos: Reconocer una alerta de secret scanning | Explicar push protection | Responder correctamente a una clave filtrada | Configurar Dependabot | Endurecer workflows y cuenta (permisos, 2FA)
prerrequisitos: github-secretos-y-variables
autoevaluacion: ¿Sabes por qué borrar la clave en un commit nuevo no alcanza? | ¿Sabes qué es push protection? | ¿Sabes qué hace Dependabot? | ¿Sabes limitar los permisos del token de un workflow?
---

:::analogia En palabras simples
Subir una clave a GitHub es como olvidar la llave de casa pegada en la puerta. Sacarla después no sirve si alguien ya pudo copiarla: hay que **cambiar la cerradura**. En un repositorio público, hay bots que buscan claves nuevas en minutos.
:::

## Paso 1 — Provocar una alerta (con una clave falsa)

En `ventas-app`, en una rama, crea `config.py` con la clave de ejemplo que AWS publica en su documentación (no es real y no funciona):

```python norun
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

```bash
git switch -c feature/config
git add config.py && git commit -m "Agrega configuración" && git push -u origin feature/config
```

```captura
archivo: github/g18-push-protection.webp
texto: En la práctica el push pasa, como en un repositorio sin push protection
```

Ahora mira la pestaña **Security**:

```captura
archivo: github/g18-security.webp
texto: Secret scanning detectó una Amazon AWS Access Key ID en config.py línea 1, rama feature/config
```

## Paso 2 — Secret scanning y push protection

| Función | Cuándo actúa | Qué hace |
|---|---|---|
| **Secret scanning** | Después del push | Busca patrones de claves de cientos de proveedores en todo el historial y abre una alerta (y en repos públicos avisa al proveedor, que muchas veces revoca la clave) |
| **Push protection** | Durante el push | **Rechaza** el push si contiene una clave conocida (`GH013: Repository rule violations found`) y te dice el archivo y la línea |

En GitHub real, push protection está activa por defecto en los repositorios públicos y se activa en **Settings → Advanced Security** en los privados. En la práctica la omitimos a propósito para que veas la alerta.

## Paso 3 — Qué hacer cuando se filtra una clave

1. **Rotar primero**: en el sistema de origen (AWS, Azure, la base de datos), revocar la clave y crear otra. Esto es lo único que realmente protege.
2. Guardar la nueva como **secreto** (lección 17) o en un gestor (Key Vault, Secrets Manager).
3. Cambiar el código para que lea de una variable de entorno: `os.environ["AWS_ACCESS_KEY_ID"]`.
4. Revisar los logs del proveedor: ¿alguien usó la clave mientras estuvo expuesta?
5. Cerrar la alerta como **Revoked**.

:::cuidado Borrarla en un commit nuevo no alcanza
El commit viejo sigue en el historial: cualquiera puede verlo con `git log -p`. Reescribir el historial (`git filter-repo`) tampoco basta si ya alguien clonó o si el repositorio es público. **La clave expuesta se considera comprometida: se rota siempre.**
:::

Limpia la práctica: `git switch main && git branch -D feature/config` y borra la rama en GitHub.

## Paso 4 — Dependabot

| Función | Qué hace |
|---|---|
| **Dependabot alerts** | Te avisa si una librería de tu `requirements.txt` tiene una vulnerabilidad conocida |
| **Dependabot security updates** | Abre un PR que sube la librería a la versión corregida |
| **Dependabot version updates** | Abre PRs periódicos para mantener las librerías al día |

Las *version updates* se configuran con `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

Cada PR de Dependabot pasa por tu CI: si los tests pasan, lo revisas y lo fusionas.

## Paso 5 — Endurecer los workflows

```yaml
permissions:
  contents: read          # el token del workflow solo puede leer
```

| Práctica | Por qué |
|---|---|
| `permissions` mínimos arriba del workflow | El `GITHUB_TOKEN` automático no puede hacer más de lo necesario |
| Acciones de terceros fijadas por SHA (`uses: org/accion@<sha-completo>`) | Una etiqueta `@v1` puede moverse a código malicioso |
| No usar `pull_request_target` con código del PR | Corre con permisos del repositorio sobre código de un desconocido |
| No interpolar `${{ github.event.issue.title }}` dentro de `run:` | Un título malicioso se ejecuta como comando; pásalo por `env:` |
| **Code scanning** (CodeQL) | Analiza tu código buscando vulnerabilidades en cada PR |

## Paso 6 — Tu cuenta

- **2FA obligatorio**: con una app autenticadora o una *passkey*. GitHub lo exige a quien contribuye código.
- **Tokens con fecha de vencimiento** y los permisos mínimos (*fine-grained tokens*).
- Revisa de vez en cuando **Settings → Applications** y **Sessions**.
- Un archivo **SECURITY.md** en el repositorio explica cómo reportar una vulnerabilidad de forma privada.

## ✅ Lo que lograste

- Viste una alerta de secret scanning y sabes qué es push protection.
- Sabes responder a una clave filtrada: rotar primero.
- Configuraste Dependabot y sabes endurecer workflows y tu cuenta.

:::ejercicio quiz
Subiste una clave a un repositorio y la borraste en el commit siguiente. ¿Estás a salvo?
- [ ] Sí, ya no está
- [x] No: sigue en el historial; hay que revocarla y crear otra
- [ ] Sí, si el repositorio es privado
- [ ] Sí, si nadie hizo clone
:::

:::ejercicio quiz
¿Qué diferencia hay entre secret scanning y push protection?
- [ ] Ninguna
- [x] Secret scanning avisa después del push; push protection rechaza el push antes de que la clave entre
- [ ] Push protection solo funciona con AWS
- [ ] Secret scanning bloquea el push
:::

:::ejercicio quiz
¿Para qué sirve `permissions: contents: read` en un workflow?
- [ ] Para que el workflow sea más rápido
- [x] Para que el token automático del workflow solo pueda leer el repositorio
- [ ] Para ocultar el código
- [ ] Para que nadie vea los logs
:::
