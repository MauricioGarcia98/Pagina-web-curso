# examen: terraform

## Declarativo
leccion: terraform-que-es-iac
Ejecutas `terraform apply` dos veces seguidas con el mismo código y sin cambios externos. ¿Qué pasa la segunda vez?
- [ ] Crea los recursos de nuevo, duplicados con otro sufijo.
- [x] No hace nada: el plan no tiene cambios.
- [ ] Borra todos los recursos y los vuelve a crear.
- [ ] Da error, porque los recursos ya existen.
porque: Terraform es declarativo: compara lo deseado con el estado y solo aplica diferencias. Esa idempotencia es una de sus mayores ventajas frente a los scripts.

## Flujo
leccion: terraform-que-es-iac
¿Cuál es el flujo habitual de trabajo?
- [ ] `apply` → `init` → `plan`
- [x] `init` → `plan` → `apply`
- [ ] `plan` → `init` → `apply`
- [ ] `validate` → `apply` → `init`
porque: `init` descarga providers y configura el backend; `plan` muestra qué cambiaría; `apply` lo ejecuta. En equipo, el plan se revisa en el pull request.

## Variables
leccion: terraform-hcl-variables
¿Cómo se pasa un valor distinto de la variable `entorno` para producción sin cambiar el código?
- [ ] Editando `main.tf` antes de cada `apply` y revirtiendo el cambio después.
- [x] Con `-var-file=prod.tfvars` o `-var entorno=prod`.
- [ ] Agregando un comentario `# entorno = prod` al inicio del archivo.
- [ ] No se puede: cada entorno necesita su propia copia del código.
porque: Las variables separan el **qué** (el código) de los **valores** de cada entorno. El mismo código crea dev y prod.

## for_each vs. count
leccion: terraform-hcl-variables
Creaste tres buckets con `count` a partir de `["bronze", "silver", "gold"]` y quitas `"silver"` de la lista. ¿Qué riesgo hay?
- [ ] Ninguno: Terraform identifica cada bucket por su nombre en ambos casos.
- [x] Con `count`, "gold" cambia de índice y puede destruirse y recrearse.
- [ ] Terraform ignora el cambio porque los buckets ya existen.
- [ ] Se crean dos buckets "silver" porque el índice 1 queda duplicado.
porque: `count` identifica las instancias por posición; `for_each` por clave. Por eso `for_each` es más seguro para colecciones que cambian.

## Estado
leccion: terraform-estado-remoto
¿Por qué no se sube el archivo `terraform.tfstate` a Git?
- [ ] Porque suele superar el tamaño máximo de archivo que acepta GitHub.
- [x] Porque puede tener secretos y en equipo hace falta un único estado bloqueado.
- [ ] Porque Git no acepta archivos JSON con más de mil líneas.
- [ ] Porque Terraform lo regenera desde cero en cada ejecución.
porque: El backend remoto (S3, Azure Blob, GCS) centraliza un único estado, lo cifra y lo **bloquea** para que dos personas no apliquen a la vez.

## Bloqueo
leccion: terraform-estado-remoto
¿Qué evita el bloqueo del estado?
- [ ] Que otras personas lean el código del repositorio.
- [x] Que dos `apply` simultáneos modifiquen lo mismo.
- [ ] Que se creen recursos que superen el presupuesto.
- [ ] Que se hagan cambios desde la consola de la nube.
porque: Mientras alguien aplica, el estado queda tomado; el segundo `apply` espera o falla con un mensaje claro.

## Import
leccion: terraform-estado-remoto
Un bucket de producción se creó a mano hace un año. Quieres administrarlo con Terraform sin recrearlo. ¿Qué haces?
- [ ] Borrarlo y crearlo con Terraform, que es más rápido que importarlo.
- [x] Escribir el recurso y traerlo al estado con un bloque `import`.
- [ ] Renombrarlo en la consola para que Terraform lo detecte.
- [ ] Nada: Terraform detecta y administra solo los recursos existentes.
porque: `import` asocia un recurso existente con el código. Recrearlo significaría perder los datos.

## prevent_destroy
leccion: terraform-estado-remoto
¿Qué hace `lifecycle { prevent_destroy = true }` en el bucket del lago?
- [ ] Impide modificar las etiquetas y la configuración del bucket.
- [x] Hace fallar cualquier plan que intente destruirlo.
- [ ] Copia el bucket a otra región antes de cada cambio.
- [ ] Hace el bucket de solo lectura para todos los usuarios.
porque: Es una red de seguridad para recursos con datos. Para borrarlo de verdad hay que quitar la regla a propósito.

## Módulos
leccion: terraform-modulos
¿Qué ventaja tiene un módulo `lago` reutilizable en dev, staging y prod?
- [ ] Que el módulo funciona sin variables y se adapta solo a cada entorno.
- [x] Que los tres entornos tienen la misma estructura, cambiando solo las entradas.
- [ ] Que los tres entornos comparten el mismo archivo de estado.
- [ ] Que los recursos creados con módulos cuestan menos en la nube.
porque: Los módulos evitan copiar y pegar, y garantizan que las mejoras lleguen a todos los entornos. Cada uno conserva su propio estado.

## Plan en CI
leccion: terraform-cicd-buenas-practicas
En el pull request, el plan dice `-/+ destroy and then create replacement` sobre la base de datos de producción. ¿Qué haces?
- [ ] Aprobarlo: si Terraform lo propone, el cambio es seguro.
- [x] Frenar e investigar qué atributo fuerza el reemplazo.
- [ ] Ejecutar `apply` dos veces para que el reemplazo se complete.
- [ ] Borrar el estado para que Terraform deje de ver la base.
porque: Algunos cambios (como el nombre o la región) obligan a recrear el recurso. Leer el plan antes de aplicar es justamente para detectar esto.

## OIDC
leccion: terraform-cicd-buenas-practicas
¿Cómo debería autenticarse el pipeline de GitHub Actions que corre `terraform apply`?
- [ ] Con las claves personales del líder técnico, guardadas como secreto.
- [x] Con OIDC: credenciales temporales limitadas al repo y la rama.
- [ ] Con las claves de la cuenta root, guardadas como secreto cifrado.
- [ ] Sin autenticación, porque GitHub ya está conectado a la nube.
porque: OIDC elimina las claves de larga duración. Además, conviene separar los permisos del plan (solo lectura) de los del apply (en `main` y con aprobación).
