---
titulo: Llevar Genie a los usuarios - Genie One, tableros y la API
nivel: Avanzado
duracion: 55
resumen: Cómo llega Genie a la gente - compartir un agente con los permisos correctos, Genie One como puerta de entrada para el negocio, los tableros de AI/BI con su agente asociado, y la Genie Agents API para usar Genie desde una aplicación, un chatbot o un notebook, con las buenas prácticas de sondeo (polling) de la documentación. Cierra con versionar el agente con Declarative Automation Bundles.
objetivos: Compartir un agente con el nivel de permiso adecuado | Explicar qué es Genie One y cómo se accede | Relacionar un tablero de AI/BI con su Genie Agent | Llamar a Genie desde Python con el SDK y entender el flujo de la API | Programar un sondeo con espera exponencial
prerrequisitos: genie-evaluar-y-monitorear
autoevaluacion: ¿Sabes qué permisos necesita un usuario para usar un agente compartido? | ¿Sabes cada cuánto conviene consultar el estado de un mensaje en la API? | ¿Sabes qué pasa con los filtros de un tablero en el chat de su agente?
---

:::escenario
El agente de ventas funciona y tiene 95 % de exactitud en los benchmarks. Ahora hay tres pedidos: que lo usen los 40 vendedores (cada uno viendo solo su región), que aparezca junto al tablero de ventas que ya miran cada mañana, y que el equipo de producto lo integre en la aplicación interna de la empresa. Cada pedido usa una pieza distinta.
:::

## Compartir un agente

Con el botón **Share** eliges usuarios o grupos (o **All account users**) y un nivel de permiso:

| Nivel | Qué puede hacer |
|---|---|
| `CAN VIEW` / `CAN RUN` | Usar el agente: hacer preguntas |
| `CAN EDIT` | Además, cambiar instrucciones, ejemplos y benchmarks |
| `CAN MANAGE` | Además, ver el monitoreo, compartir y borrar conversaciones |

Para que un usuario pueda usarlo necesita, según la documentación: el *entitlement* de **Consumer access** o de Databricks SQL, permiso de uso sobre el agente y **`SELECT` sobre las tablas** del agente. **No** necesita permiso sobre el SQL warehouse: el agente usa las credenciales de cómputo de quien lo configuró. Y como los datos se leen con los permisos de cada usuario, para que cada vendedor vea solo su región se aplica un **filtro de filas** en Unity Catalog sobre la tabla: el mismo agente, compartido con todos, muestra a cada uno lo suyo.

Los agentes nuevos se guardan en tu carpeta de usuario y heredan los permisos de la carpeta, como cualquier objeto del workspace. Los usuarios también pueden compartir conversaciones individuales.

## Genie One: la puerta de entrada para el negocio

**Genie One** (antes *Databricks One*) es la interfaz simplificada para personas de negocio: muestra tableros, permite hacer preguntas en lenguaje natural y usar aplicaciones, **sin** clústeres, notebooks ni consultas a la vista.

- Un usuario cuyo único permiso es **Consumer access** entra directamente a Genie One.
- Los demás cambian entre la interfaz completa y Genie One con el selector de aplicaciones, o agregando `/one` a la URL del workspace.
- Existe además un Genie One **a nivel de cuenta**, que reúne lo compartido en todos los workspaces (en `accounts.cloud.databricks.com/one` en AWS).
- Hay aplicaciones para **iOS y Android**.

Para el equipo de datos, el trabajo es el de siempre: publicar tableros y agentes bien hechos y compartirlos con los grupos correctos.

## Tableros de AI/BI y su agente

Los tableros de AI/BI (*dashboards*) de Databricks se integran con Genie: al **publicar un tablero**, Databricks crea automáticamente un Genie Agent asociado, para que quien mira el tablero pueda hacer preguntas sobre los mismos datos. En ese agente creado automáticamente, los **filtros del tablero** se respetan en el chat. Si en cambio vinculas un agente que ya existía, la documentación aclara que los filtros del tablero **no** pasan al contexto del chat.

## La Genie Agents API

Para usar Genie desde una aplicación propia (un chatbot de Slack, una app interna, otro agente de IA), Databricks ofrece una API con tres grupos de funciones:

- **API de chat**: iniciar una conversación, hacer preguntas de seguimiento y obtener el SQL, los resultados y los gráficos.
- **API del modo agente**: enviar preguntas en modo agente y recibir el informe con citas.
- **API de administración**: crear, configurar y desplegar agentes por código (para CI/CD).

Para preguntar necesitas al menos `CAN VIEW` sobre el agente y `SELECT` sobre sus tablas: las respuestas incluyen **solo los datos que tú puedes ver**. La autenticación recomendada es OAuth (U2M si hay una persona con navegador; un *service principal* con M2M si no). En la URL de un agente aparece su identificador (`space_id`; la API mantiene el nombre de la época de los *Genie Spaces*).

### El flujo de una pregunta

Una respuesta de Genie puede tardar varios segundos (tiene que generar el SQL y ejecutarlo), así que la API es **asíncrona**: haces la pregunta, recibes un identificador y **consultas el estado** hasta que termina.

```recorrido
titulo: Una pregunta a Genie por la API
estacion app: Tu aplicación | icono=api
estacion genie: Genie Agent | icono=genie
estacion estado: Estado del mensaje | icono=reloj
estacion datos: Resultado | icono=tabla
paso app: Iniciar la conversación
La aplicación envía la pregunta al agente.
>>> texto
POST /api/2.0/genie/spaces/{space_id}/start-conversation
{"content": "¿Cuánto vendimos por canal en marzo de 2024?"}
paso genie: Genie devuelve los identificadores
La respuesta llega enseguida, pero todavía no trae el resultado: trae el id de la conversación y del mensaje.
>>> json
{"conversation_id": "01f0…", "message_id": "01f0…", "status": "SUBMITTED"}
paso estado: Consultar el estado
La aplicación pregunta cada pocos segundos, con espera creciente, hasta un estado final: COMPLETED, FAILED o CANCELLED.
>>> log
GET …/conversations/{conversation_id}/messages/{message_id}
SUBMITTED → EXECUTING_QUERY → COMPLETED
paso datos: Obtener el resultado
Con el mensaje completo, se piden los resultados de la consulta (y el SQL, si se quiere mostrar).
>>> tabla
canal,ventas
web,192098.47
app,106357.03
tienda,84047.87
telefono,30212.59
```

Las buenas prácticas de la documentación para el sondeo:

- Consultar el estado **cada 1 a 5 segundos**, hasta un estado final (`COMPLETED`, `FAILED` o `CANCELLED`).
- Usar **espera exponencial** (*exponential backoff*): aumentar el tiempo entre consultas hasta un máximo de **un minuto**.
- **Dejar de esperar a los 10 minutos** si no hay respuesta.
- Cada agente admite hasta 200.000 conversaciones: borrar las viejas por la API (`DELETE` sobre la conversación) para no llegar al límite.

### Con el SDK de Python

En la práctica casi nunca se escribe el sondeo a mano: el SDK de Databricks para Python lo hace por ti. Desde un notebook (donde la autenticación ya está resuelta):

```python norun
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()
space_id = "01f0..."   # el identificador de tu agente (está en su URL)

mensaje = w.genie.start_conversation_and_wait(space_id, "¿Cuánto vendimos por canal en marzo de 2024?")
print(mensaje.status)
for adjunto in mensaje.attachments or []:
    if adjunto.text:
        print(adjunto.text.content)            # el resumen en palabras
    if adjunto.query:
        print(adjunto.query.query)             # el SQL generado
```

`start_conversation_and_wait` envía la pregunta y espera a que termine. Para seguir la misma conversación se usa el `conversation_id` con `create_message_and_wait`.

## Versionar el agente como código

La configuración de un agente (tablas, instrucciones, ejemplos, SQL expressions) se puede definir y desplegar con **Declarative Automation Bundles**, igual que los jobs. Así el agente tiene historial de cambios en Git, revisión por pull request y se promueve de desarrollo a producción sin copiar a mano. La API de administración permite además exportarlo e importarlo entre workspaces.

:::errores
- **Compartir el agente pero no dar `SELECT` sobre las tablas**: el usuario lo ve, pero las respuestas no traen datos.
- **Hacer un agente por región** para separar datos: se resuelve con un filtro de filas en Unity Catalog y un solo agente.
- **Sondear la API cada 100 milisegundos**: carga innecesaria. De 1 a 5 segundos, con espera creciente.
- **Esperar para siempre**: corta a los 10 minutos y muestra un mensaje al usuario.
- **Usar el token personal de una persona en una aplicación**: las aplicaciones usan un service principal con OAuth M2M (y su uso de Genie se cobra).
:::

:::trabajo
- Integraciones típicas: un bot en Slack o Teams que responde preguntas de datos llamando a la API, y agentes de IA de varios pasos que usan un Genie Agent como "herramienta" para consultar datos con las definiciones correctas.
- Los agentes importantes se tratan como un producto: tienen versión en Git, benchmarks en el CI y un dueño que revisa el monitoreo.
:::

:::entrevista "¿Cómo integrarías Genie en una aplicación interna?"
Usaría la API de chat con un service principal autenticado por OAuth máquina a máquina, con CAN VIEW sobre el agente y SELECT sobre sus tablas, o el SDK de Python que resuelve el sondeo. La aplicación inicia la conversación, consulta el estado cada pocos segundos con espera exponencial hasta un estado final y corta a los 10 minutos, y luego muestra el resultado, el resumen y el SQL. Para que cada usuario vea solo sus datos, preferiría que la app actúe con la identidad del usuario, o aplicaría filtros de filas en Unity Catalog. Y borraría conversaciones viejas para respetar el límite.
:::

## Ejercicios

:::ejercicio python dificultad=Avanzado titulo="Sondear un mensaje con espera exponencial"
Escribe `esperar_respuesta(obtener_estado, dormir, espera_inicial=1, maximo=60, limite=600)` que consulte el estado de un mensaje hasta que termine, siguiendo las buenas prácticas de la documentación:

- `obtener_estado()` devuelve un texto: `"SUBMITTED"`, `"EXECUTING_QUERY"`, `"COMPLETED"`, `"FAILED"` o `"CANCELLED"`.
- Si el estado es final (`COMPLETED`, `FAILED` o `CANCELLED`), devuélvelo.
- Si no, llama a `dormir(segundos)` con la espera actual, y duplica la espera para la próxima vez sin pasar de `maximo`.
- Lleva la cuenta del tiempo dormido; si el total alcanza o supera `limite`, devuelve `"TIMEOUT"` sin volver a consultar.

Usar una función `dormir` como parámetro (en vez de `time.sleep`) permite probar el código sin esperar de verdad.
```python inicial
def esperar_respuesta(obtener_estado, dormir, espera_inicial=1, maximo=60, limite=600):
    pass
```
```python solucion
def esperar_respuesta(obtener_estado, dormir, espera_inicial=1, maximo=60, limite=600):
    finales = {"COMPLETED", "FAILED", "CANCELLED"}
    espera, total = espera_inicial, 0
    while True:
        estado = obtener_estado()
        if estado in finales:
            return estado
        if total >= limite:
            return "TIMEOUT"
        dormir(espera)
        total += espera
        if total >= limite:
            return "TIMEOUT"
        espera = min(espera * 2, maximo)
```
```pista
Un bucle `while True`: consulta, devuelve si es final, duerme la espera actual, suma al total, corta si llegaste al límite y duplica la espera con `min(espera * 2, maximo)`.
```
```python test
def fuente(estados):
    it = iter(estados)
    return lambda: next(it)

esperas = []
r = esperar_respuesta(fuente(["SUBMITTED", "EXECUTING_QUERY", "EXECUTING_QUERY", "COMPLETED"]), esperas.append)
assert r == "COMPLETED", f"Debe devolver COMPLETED; devolvió {r}"
assert esperas == [1, 2, 4], f"La espera debe duplicarse: 1, 2, 4; fue {esperas}"

esperas = []
r = esperar_respuesta(fuente(["SUBMITTED"] * 20 + ["COMPLETED"]), esperas.append, espera_inicial=1, maximo=8, limite=1000)
assert max(esperas) == 8 and esperas[:5] == [1, 2, 4, 8, 8], f"La espera no debe pasar del máximo; fue {esperas[:5]}"

esperas = []
r = esperar_respuesta(lambda: "EXECUTING_QUERY", esperas.append, espera_inicial=5, maximo=60, limite=600)
assert r == "TIMEOUT", "Si nunca termina, debe devolver TIMEOUT"
assert sum(esperas) >= 600 and sum(esperas) - esperas[-1] < 600, "Debe cortar al alcanzar el límite de 600 segundos"

esperas = []
assert esperar_respuesta(fuente(["FAILED"]), esperas.append) == "FAILED" and esperas == [], "Un estado final en la primera consulta no debe esperar"
```
:::

:::ejercicio quiz dificultad=Intermedio
Compartes el agente de ventas con el grupo de vendedores. ¿Qué necesita cada vendedor para obtener respuestas con datos?

- [ ] Permiso CAN USE sobre el SQL warehouse
- [x] Permiso de uso sobre el agente y SELECT sobre las tablas del agente (el warehouse lo pone el autor)
- [ ] Ser administrador del workspace
- [ ] Una copia propia del agente
:::

:::ejercicio quiz dificultad=Intermedio
Cada vendedor debe ver solo las ventas de su región en el mismo agente. ¿Cómo se resuelve?

- [ ] Un agente por región
- [x] Un filtro de filas en Unity Catalog sobre la tabla: Genie lee los datos con los permisos de cada usuario
- [ ] Una instrucción de texto que diga "muestra solo la región del usuario"
- [ ] No se puede
:::

:::ejercicio quiz dificultad=Básico
¿Qué es Genie One?

- [ ] El primer agente que creas
- [x] La interfaz simplificada para personas de negocio: tableros, preguntas en lenguaje natural y aplicaciones, sin notebooks ni clústeres
- [ ] El modelo de lenguaje de Databricks
- [ ] La API de Genie
:::
