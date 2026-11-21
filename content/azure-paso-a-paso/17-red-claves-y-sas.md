---
titulo: Red, claves de acceso y SAS - quién llega al lago y cómo
nivel: 5 · Avanzado
duracion: 45
resumen: Además de quién es (identidad y rol), Azure decide desde dónde se llega (red) y con qué credencial (clave, SAS o Entra). Configuras el acceso de red de la cuenta, entiendes por qué las claves de acceso son la llave maestra y cómo se rotan sin cortar el servicio, y generas una firma de acceso compartido (SAS) de solo lectura por ocho horas para un proveedor externo.
objetivos: Elegir entre acceso público, redes seleccionadas o deshabilitado | Explicar qué es un private endpoint | Entender los riesgos de las claves de acceso y cómo rotarlas | Generar una SAS con permisos, servicios y vencimiento mínimos | Comparar clave, SAS y Microsoft Entra
prerrequisitos: azure-paso-a-paso-proyecto-plataforma-dev-completa
autoevaluacion: ¿Sabes qué hace un private endpoint? | ¿Sabes por qué hay dos claves? | ¿Sabes qué permisos darle a una SAS para que alguien solo descargue? | ¿Sabes cómo se revoca una SAS antes de que venza?
---

:::escenario El pedido
Lucía: *"Un proveedor de logística necesita descargar hoy los archivos de pedidos para una auditoría. No tiene cuenta en nuestro Entra. Dale acceso de solo lectura que se venza solo, y aprovechemos para revisar cómo está expuesta la cuenta."*
:::

:::analogia Quién eres, desde dónde vienes y qué llave traes
Para leer un dato, Azure pregunta tres cosas: quién eres (identidad y rol), desde dónde vienes (la red) y con qué llave (Entra, clave de la cuenta o una SAS). Si cualquiera de las tres falla, no entras.
:::

## Paso 1 — Las tres preguntas del acceso

```diagrama
titulo: Las tres preguntas que Azure se hace antes de dejar pasar un pedido
nodo ped: Un pedido llega | icono=internet | col=0 | fila=0 | color=gris
nodo red: ¿Desde dónde llega? | icono=red | col=1 | fila=0 | color=azul | sub=red: firewall, redes virtuales, private endpoint
nodo quien: ¿Quién es? | icono=usuario | col=2 | fila=0 | color=violeta | sub=identidad de Entra o credencial (clave, SAS)
nodo que: ¿Qué puede hacer? | icono=candado | col=3 | fila=0 | color=verde | sub=rol (RBAC) o permisos de la SAS
nodo ok: Acceso | icono=check | col=4 | fila=0 | color=verde
flecha ped -> red
flecha red -> quien: pasa
flecha quien -> que: pasa
flecha que -> ok: pasa
```

Si cualquiera de las tres respuestas es "no", el pedido se rechaza.

Las tres se cumplen a la vez: un usuario con el rol correcto que llega desde una red bloqueada **no entra**.

## Paso 2 — El acceso de red

En `sttiendaandinadev`, menú **Networking**:

```captura
archivo: azure/b17-red.webp
texto: Firewalls and virtual networks - las tres opciones de acceso público
```

| Opción | Quién llega | Cuándo |
|---|---|---|
| **Enabled from all networks** | Cualquiera en internet (con credencial válida) | Para aprender |
| **Enabled from selected virtual networks and IP addresses** | Solo las redes virtuales y las IP que agregues | Paso intermedio común |
| **Disabled** | Nadie desde internet; solo por **private endpoint** | Producción en empresas |

Un **private endpoint** le da a la cuenta una dirección IP **privada** dentro de tu red virtual. El tráfico no pasa por internet. Es el estándar en bancos, salud y cualquier empresa con datos sensibles, y se combina con DNS privado para que la dirección `*.blob.core.windows.net` resuelva a esa IP interna.

Para seguir practicando, deja **Enabled from all networks**.

:::nota Los servicios de Azure y la red
Si cierras la red, Data Factory y Databricks también tienen que llegar por una red permitida: Databricks con VNet injection o private endpoint, y Data Factory con un *managed virtual network* o un integration runtime propio. Por eso la red se diseña al principio, no al final.
:::

## Paso 3 — Las claves de acceso

Menú **Access keys → Show keys**:

```captura
archivo: azure/b17-claves.webp
texto: Show keys (1) y Rotate key (2) - las dos claves de la cuenta y sus cadenas de conexión
```

Cada cuenta tiene **dos claves**, y cualquiera de ellas da **control total** de los datos: leer, escribir y borrar todo, sin quedar registrado quién fue.

¿Por qué dos? Para **rotar sin cortar el servicio**:

1. Las aplicaciones usan la **key1**.
2. Las cambias para que usen la **key2**.
3. Regeneras la **key1** (la vieja deja de funcionar).
4. La próxima vez, al revés.

:::cuidado Las claves son el último recurso
Si una clave se filtra (en un repositorio, en un correo, en una captura), cualquiera tiene acceso completo hasta que la rotes. Por eso: usa **Entra + roles** siempre que puedas, guarda las claves que no puedas evitar en **Key Vault**, y cuando todo use Entra, **desactiva el acceso con clave** en Configuration (*Allow storage account key access: Disabled*).
:::

## Paso 4 — Una SAS para el proveedor

Una **SAS** (*shared access signature*) es un token que se agrega a la dirección y da acceso **limitado**: a qué servicios, qué permisos, desde cuándo y hasta cuándo. Menú **Shared access signature**:

```captura
archivo: azure/b17-sas.webp
texto: Servicios, tipos de recurso y permisos (1), el vencimiento (2) y el protocolo (3)
```

Para el proveedor:

- **Allowed services**: solo **Blob**.
- **Allowed resource types**: **Container** y **Object** (listar y leer archivos).
- **Allowed permissions**: solo **Read** y **List**.
- **Expiry**: dentro de **8 horas**.
- **Allowed protocols**: **HTTPS only**.

Haz clic en **Generate SAS and connection string**:

```captura
archivo: azure/b17-sas-generada.webp
texto: El token SAS y la URL lista para usar, con su fecha de vencimiento
```

El token tiene partes legibles: `sp=rl` (permisos read y list), `se=…` (vencimiento), `spr=https` y `sig=…` (la firma).

:::cuidado Cómo se revoca una SAS
Una SAS de cuenta está **firmada con una clave**. No se puede "borrar": sirve hasta que vence o hasta que **rotas la clave** con la que se firmó (lo que también corta a todos los que usan esa clave). Por eso, vencimientos cortos. En Azure real existe una opción mejor: la **user delegation SAS**, firmada con credenciales de Entra en lugar de la clave, que se puede revocar sin tocar las claves de la cuenta.
:::

## Paso 5 — ¿Cuál uso?

| Credencial | Alcance | Se revoca | Auditoría | Uso |
|---|---|---|---|---|
| **Microsoft Entra + rol** | Por persona o aplicación | Quitando el rol | Completa | **Siempre que se pueda** |
| **User delegation SAS** | Limitado y con vencimiento | Revocando la delegación | Buena | Compartir con alguien sin cuenta |
| **SAS de cuenta** | Limitado y con vencimiento | Solo rotando la clave | Pobre | Casos puntuales, muy corta |
| **Clave de la cuenta** | Total | Rotándola | Ninguna por persona | Evitar |

:::errores
- **Pensar que el rol alcanza.** Si la red no permite tu conexión, el rol no sirve.
- **SAS con todos los permisos y sin vencimiento.** Da lo justo (Read y List) y por el tiempo necesario.
- **Rotar las dos claves a la vez.** Las aplicaciones se cortan; rota una, cambia las aplicaciones y después la otra.
:::

## ✅ Lo que lograste

- Sabes configurar el acceso de red y qué es un private endpoint.
- Entiendes el riesgo de las claves y cómo se rotan.
- Generaste una SAS de solo lectura por 8 horas y sabes cómo se revoca.

:::ejercicio quiz
Un usuario tiene Storage Blob Data Reader pero la cuenta tiene el acceso público deshabilitado y él está en su casa. ¿Puede leer?
- [ ] Sí, el rol alcanza
- [x] No, la red también tiene que permitir su conexión
- [ ] Sí, si usa la clave
- [ ] Sí, si entra por el portal
:::

:::ejercicio quiz
¿Por qué una cuenta tiene dos claves de acceso?
- [ ] Una para leer y otra para escribir
- [x] Para rotar una mientras las aplicaciones usan la otra, sin cortar el servicio
- [ ] Una para cada región
- [ ] Una para el portal y otra para la CLI
:::

:::ejercicio quiz
El proveedor solo tiene que descargar archivos. ¿Qué permisos le das a la SAS?
- [ ] Read, Write, Delete
- [x] Read y List
- [ ] Todos, por las dudas
- [ ] Create y Add
:::

:::ejercicio quiz
Compartiste una SAS de cuenta por error con alguien que no debía tenerla. ¿Cómo la cortas ya?
- [ ] Borrándola desde el portal
- [x] Rotando la clave con la que se firmó
- [ ] Cambiando la red a "all networks"
- [ ] Desactivando la cuenta de la persona en Entra ID
:::
