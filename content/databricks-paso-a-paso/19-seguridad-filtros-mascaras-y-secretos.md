---
titulo: Seguridad - filtros de fila, máscaras de columna, grupos, secretos y tokens
nivel: 5 · Avanzado
duracion: 50
resumen: Dar acceso a una tabla no siempre alcanza - a veces cada persona debe ver solo sus filas, o el correo tiene que salir tapado para casi todos. Filtros de fila y máscaras de columna con funciones SQL y grupos, probarlos entrando y saliendo de un grupo, etiquetas para datos personales, secret scopes para contraseñas que el código nunca muestra, y tokens de acceso para programas - con sus reglas de higiene.
objetivos: Proteger filas con un filtro de fila basado en grupos | Ocultar una columna con una máscara | Probar la seguridad cambiando de grupo | Guardar y leer secretos sin exponerlos | Manejar tokens de acceso con criterio
prerrequisitos: databricks-paso-a-paso-genie-agents
autoevaluacion: ¿Sabes qué devuelve una función de filtro de fila? | ¿Sabes qué recibe y devuelve una función de máscara? | ¿Sabes cómo probar que el filtro funciona? | ¿Sabes por qué un secreto se ve como [REDACTED]?
---

:::analogia En palabras simples
Un permiso de lectura es la llave de la sala; el filtro de fila es el biombo que deja ver solo tu parte; la máscara es el papel que tapa el número de documento en una fotocopia. Y el secreto es la caja fuerte: tu programa puede usar la llave, pero nadie la lee en voz alta.
:::

## Paso 1 — Filtros de fila

Un filtro de fila es una **función SQL que devuelve verdadero o falso** para cada fila, según quién consulta:

```sql norun
CREATE OR REPLACE FUNCTION main.default.solo_mi_pais(pais STRING)
RETURNS BOOLEAN
RETURN is_account_group_member('admins') OR pais = 'Argentina';

ALTER TABLE main.default.clientes_demo SET ROW FILTER main.default.solo_mi_pais ON (pais);
```

- `is_account_group_member('admins')` es verdadero si quien consulta pertenece al grupo.
- Desde ese momento, un `SELECT *` devuelve solo las filas que pasan la función. La persona no ve el filtro: para ella, la tabla "es así".

## Paso 2 — Máscaras de columna

Una máscara es una **función que recibe el valor y devuelve lo que se muestra**:

```sql norun
CREATE OR REPLACE FUNCTION main.default.ocultar_email(email STRING)
RETURNS STRING
RETURN CASE WHEN is_account_group_member('soporte') THEN email ELSE '***' END;

ALTER TABLE main.default.clientes_demo ALTER COLUMN email SET MASK main.default.ocultar_email;
```

```captura
archivo: databricks/d19-mascara-sql.webp
texto: Consultando la tabla - el email aparece como *** porque no perteneces al grupo soporte
```

```captura
archivo: databricks/d19-mascara.webp
texto: El Catalog Explorer muestra el filtro de fila y la máscara activos sobre la tabla
```

Variantes útiles: mostrar solo el dominio (`regexp_replace(email, '^[^@]+', '***')`), los últimos cuatro dígitos de una tarjeta, redondear un salario a miles.

## Paso 3 — Probar con grupos

Menú de usuario → **Settings → Identity and access**:

```captura
archivo: databricks/d19-grupos.webp
texto: Los grupos (1) - entra y sal de uno para ver cómo cambian el filtro y la máscara; crear un grupo (2)
```

Entra al grupo `soporte`, vuelve a consultar: el email aparece. Entra a `admins`: ves todos los países. Es la prueba que hay que hacer **antes** de decir que una tabla está protegida.

:::nota En Databricks real
Los grupos se crean en la consola de la cuenta (o se sincronizan desde Microsoft Entra ID con SCIM) y no puedes meterte a ti mismo en un grupo para probar: se prueba con un usuario de prueba o pidiéndole a alguien del grupo que consulte. Las funciones y los `ALTER TABLE` son idénticos.
:::

## Paso 4 — Etiquetas y datos personales

```sql norun
ALTER TABLE main.default.clientes_demo ALTER COLUMN email SET TAGS ('pii' = 'email');
ALTER TABLE main.default.clientes_demo ALTER COLUMN telefono SET TAGS ('pii' = 'telefono');
SELECT * FROM system.information_schema.column_tags WHERE tag_name = 'pii';
```

Con las columnas etiquetadas, un auditor (o tú, antes de una auditoría) encuentra todos los datos personales del workspace con una consulta, y puedes aplicar la misma máscara a todas.

## Paso 5 — Secretos

Las contraseñas de bases de datos, claves de API y cadenas de conexión no van en el código ni en los widgets. Van en un **secret scope**:

```captura
archivo: databricks/d19-secretos.webp
texto: Secret scopes - crear uno respaldado por Databricks o por un Azure Key Vault
```

```python norun
clave = dbutils.secrets.get(scope="kv-datos", key="db-password")
print(clave)   # imprime [REDACTED]: Databricks tapa los secretos en la salida
```

Desde la terminal del curso: `databricks secrets create-scope kv-datos` y `databricks secrets put-secret kv-datos db-password`. Con un scope respaldado por **Azure Key Vault**, el secreto vive en el Key Vault y Databricks solo lo lee: una sola caja fuerte para toda la empresa.

:::cuidado [REDACTED] no es magia
Databricks tapa el valor exacto del secreto en la salida de las celdas. Si lo transformas (lo partes en letras, lo codificas) ya no lo reconoce. La regla sigue siendo: nunca imprimas un secreto.
:::

## Paso 6 — Tokens de acceso

```captura
archivo: databricks/d19-tokens.webp
texto: Settings → Developer - tokens de acceso personal para programas que entran en tu nombre
```

Un **token de acceso personal** es una contraseña larga para que la CLI, un script o Power BI entren a Databricks como tú. Reglas:

- Siempre con **vencimiento** (días, no años).
- Uno por uso, con nombre que lo diga (`cli-laptop`, `powerbi-ventas`), para poder revocar uno sin romper el resto.
- Para procesos automáticos, mejor un **service principal** (una identidad de aplicación) que un token tuyo: si te vas de la empresa, el pipeline sigue.
- Nunca en el código ni en un repositorio: en un secreto o en la configuración del entorno.

:::errores
- **Probar la máscara solo con tu usuario.** Consulta dentro y fuera del grupo autorizado.
- **Contraseñas en widgets o celdas.** Van en un secret scope y se leen con `dbutils.secrets.get`.
- **Tokens personales en producción.** Si te vas, se rompe; usa un service principal.
:::

## ✅ Lo que lograste

- Protegiste una tabla con filtro de fila y máscara, y lo probaste con grupos.
- Etiquetaste datos personales.
- Sabes usar secretos y tokens sin exponerlos.

:::ejercicio quiz
¿Qué devuelve la función de un filtro de fila?
- [ ] El valor enmascarado
- [x] Verdadero o falso para cada fila, según quién consulta
- [ ] Una tabla
- [ ] La lista de usuarios autorizados
:::

:::ejercicio quiz
Aplicaste una máscara al email. ¿Cómo compruebas que funciona?
- [ ] Mirando el código de la función
- [x] Consultando la tabla dentro y fuera del grupo que puede ver el valor
- [ ] Con DESCRIBE HISTORY
- [ ] No hace falta
:::

:::ejercicio quiz
¿Dónde guardas la contraseña de la base de datos que lee un notebook?
- [ ] En un widget
- [ ] En una celda de texto
- [x] En un secret scope, y la lees con dbutils.secrets.get
- [ ] En el nombre del notebook
:::

:::ejercicio quiz
Un pipeline de producción usa un token personal tuyo. ¿Cuál es el problema?
- [ ] Ninguno
- [x] Si te vas o revocas el token, el pipeline deja de funcionar; conviene un service principal
- [ ] Que los tokens personales no funcionan fuera del navegador
- [ ] Que no funciona con jobs
:::
