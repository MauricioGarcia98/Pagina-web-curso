---
titulo: Git, CI/CD y plantillas ARM - llevar el factory de dev a producción
nivel: 6 · Avanzado completo
duracion: 50
resumen: En un equipo, el factory de dev se conecta a Git y los de qa y prod se actualizan solo con un despliegue automático. Ves la configuración de Git y el flujo de ramas, exportas el factory como plantilla ARM, lo importas al despliegue personalizado del portal con sus parámetros por entorno, y conoces las dos formas de armar el CI/CD.
objetivos: Explicar el flujo de Git en Data Factory (rama de trabajo, collaboration branch, adf_publish) | Exportar el factory como plantilla ARM | Identificar qué valores cambian entre entornos | Importar la plantilla en un despliegue personalizado | Describir un pipeline de CI/CD para Data Factory
prerrequisitos: data-factory-paso-a-paso-proyecto-pipeline-por-metadatos
autoevaluacion: ¿Sabes en qué rama trabaja cada uno? | ¿Sabes qué se genera al publicar con Git? | ¿Sabes qué valores se vuelven parámetros de la plantilla? | ¿Sabes por qué prod no se edita a mano?
---

## Paso 1 — Por qué Git

Sin Git (live mode), todos editan el mismo factory y **Publish all** publica todo, terminado o no. Con Git:

```text
feature/nueva-fuente ──pull request──▶ main (collaboration branch) ──Publish──▶ adf_publish (plantillas ARM)
                                                                                     │
                                                                          CI/CD ─────┴──▶ factory de qa ──▶ factory de prod
```

| Pieza | Qué es |
|---|---|
| **Rama de trabajo** | Cada persona trabaja en la suya; sus cambios se guardan como JSON en el repositorio |
| **Collaboration branch** (`main`) | Lo revisado y aprobado por pull request |
| **Publish** | Desde `main`, publica al factory de dev y genera las plantillas ARM |
| **adf_publish** | La rama con las plantillas que usa el CI/CD |

En **Manage → Git configuration**:

```captura
archivo: adf/b21-git.webp
texto: Git configuration - la práctica trabaja en live mode, sin repositorio
```

En el Data Factory real se conecta **Azure DevOps** o **GitHub** con el repositorio, la collaboration branch y la carpeta raíz. Solo el factory de **dev** se conecta a Git: qa y prod nunca se editan a mano.

## Paso 2 — La plantilla ARM del factory

**Manage → ARM template**:

```captura
archivo: adf/b21-arm.webp
texto: Export ARM template, exportar como repositorio Git e Import ARM template
```

- **Export ARM template** descarga `arm_template.json` y `arm_template_parameters.json`: lo mismo que Publish genera en `adf_publish`.
- **Exportar como repositorio Git** descarga los JSON de cada objeto, como los guarda la integración con Git.

En la plantilla, los valores que **cambian entre entornos** (la dirección de la cuenta, el workspace, el vault) quedan como **parámetros**: `ls_adls_tiendaandina_properties_typeProperties_url`, y así.

## Paso 3 — Desplegarla en otro entorno

**Import ARM template** abre el despliegue personalizado del portal con la plantilla cargada:

```captura
archivo: adf/b21-importar.webp
texto: El despliegue personalizado con la plantilla del factory (1), que se puede revisar en Edit template (2), y sus parámetros por entorno
```

Para qa o prod se cambian **Factory Name** (por ejemplo `adf-tiendaandina-prod`) y las direcciones de las conexiones (la cuenta de prod, el vault de prod), y se despliega. El factory de destino queda con los mismos pipelines, datasets y triggers.

## Paso 4 — El pipeline de CI/CD

Hay dos formas habituales:

| Forma | Cómo funciona |
|---|---|
| **Clásica** | Alguien hace Publish en dev; el pipeline de CI/CD toma las plantillas de `adf_publish` y las despliega en qa y prod |
| **Automatizada** | El paquete npm `@microsoft/azure-data-factory-utilities` valida y genera las plantillas desde `main` en el propio pipeline de CI, sin Publish manual |

En los dos casos, el despliegue a prod:

1. **Detiene los triggers** del factory de destino.
2. Despliega la plantilla con los **parámetros de prod** (de un archivo o de variables del pipeline).
3. **Vuelve a iniciar los triggers**.
4. Pasa por una **aprobación** antes de prod.

:::tip Lo que no viaja en la plantilla
Los **secretos** (por eso las conexiones usan identidad administrada o Key Vault), los **permisos** (el rol del factory de prod sobre la cuenta de prod se asigna aparte, idealmente con su propia plantilla) y los **datos**. La plantilla del factory describe el factory, no la plataforma entera.
:::

## ✅ Lo que lograste

- Entiendes el flujo de ramas de Data Factory con Git.
- Exportaste el factory como plantilla ARM y viste sus parámetros por entorno.
- Sabes cómo se arma un CI/CD que despliega a qa y prod.

:::ejercicio quiz
¿Qué factory se conecta a Git?
- [x] Solo el de dev
- [ ] Todos
- [ ] Solo el de prod
- [ ] Ninguno
:::

:::ejercicio quiz
¿Qué contiene la rama adf_publish?
- [ ] Los datos copiados
- [x] Las plantillas ARM generadas al publicar
- [ ] Los secretos
- [ ] Los logs de Monitor
:::

:::ejercicio quiz
¿Qué valores quedan como parámetros en la plantilla del factory?
- [ ] Los nombres de los pipelines
- [x] Los que cambian entre entornos, como las direcciones de las conexiones
- [ ] Las expresiones
- [ ] Ninguno
:::

:::ejercicio quiz
¿Qué hace un buen pipeline de CI/CD antes de desplegar en prod?
- [ ] Borra el factory
- [x] Detiene los triggers, despliega con los parámetros de prod y los vuelve a iniciar, tras una aprobación
- [ ] Copia los datos de dev
- [ ] Publica desde la rama de cada persona
:::
