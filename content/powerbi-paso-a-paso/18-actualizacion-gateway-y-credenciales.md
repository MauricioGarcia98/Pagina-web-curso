---
titulo: Que los datos se actualicen solos - actualización programada, puerta de enlace y credenciales
nivel: 5 · Avanzado
duracion: 40
resumen: Un informe publicado muestra los datos del momento en que se publicó hasta que se actualiza el modelo semántico. Configurar la actualización programada, por qué los orígenes de tu red necesitan una puerta de enlace, las credenciales del origen, el historial de actualizaciones para saber si falló, y los límites de cada licencia.
objetivos: Programar la actualización del modelo semántico | Entender qué es una puerta de enlace y cuándo hace falta | Configurar las credenciales del origen | Leer el historial de actualizaciones | Diagnosticar una actualización fallida
prerrequisitos: powerbi-paso-a-paso-publicar-y-compartir
autoevaluacion: ¿Sabes cuántas actualizaciones por día permite Pro? | ¿Sabes cuándo hace falta una puerta de enlace? | ¿Sabes dónde ver si la actualización de anoche falló? | ¿Sabes qué pasa si caducan las credenciales?
---

:::analogia En palabras simples
El informe publicado es una foto. La actualización programada es pedirle al servicio que saque una foto nueva todos los días a las 8. Si los datos están en un servidor de tu oficina, la nube no puede entrar: la **puerta de enlace** es el empleado de adentro que le alcanza los datos.
:::

## Paso 1 — La actualización programada

En el área de trabajo, abre el **modelo semántico** (no el informe):

```captura
archivo: powerbi/b18-actualizacion.webp
texto: Actualización programada - activar, frecuencia, zona horaria y horas
```

| Opción | Qué elegir |
|---|---|
| **Mantener los datos actualizados** | Activado |
| **Frecuencia** | Diaria o semanal |
| **Zona horaria** | La del negocio (no la del servidor) |
| **Horas** | Después de que termina la carga de datos del origen; si el ETL termina a las 6, actualiza a las 7 |

Con licencia **Pro**: hasta **8** actualizaciones por día. Con **Premium o Fabric**: hasta **48**.

## Paso 2 — La puerta de enlace

```captura
archivo: powerbi/b18-gateway.webp
texto: Conexión de puerta de enlace - qué orígenes locales usa el modelo
```

| Origen | ¿Puerta de enlace? |
|---|---|
| SQL Server, archivos o carpetas **en tu red** | **Sí**: una *puerta de enlace de datos local* instalada en una computadora de la red |
| Azure SQL, Databricks, Snowflake, BigQuery, SharePoint Online | No: el servicio llega directo por internet |

La puerta de enlace la instala y mantiene el equipo de infraestructura; tú eliges a cuál se conecta el modelo.

## Paso 3 — Credenciales

```captura
archivo: powerbi/b18-credenciales.webp
texto: Credenciales del origen de datos - el servicio necesita saber con qué usuario conectarse
```

En Desktop las credenciales son las tuyas; en el servicio hay que configurarlas otra vez para el modelo publicado. Lo recomendable es una **cuenta de servicio** o una **entidad de servicio** (no tu usuario personal), para que la actualización no falle el día que cambies la contraseña o te vayas de la empresa.

## Paso 4 — El historial

```captura
archivo: powerbi/b18-historial.webp
texto: Historial de actualizaciones - cada intento con su inicio, fin y estado
```

| Si la actualización falla | Revisa |
|---|---|
| "Credenciales no válidas" | Paso 3: contraseña caducada o usuario sin permiso |
| "No se puede conectar a la puerta de enlace" | La computadora de la puerta de enlace apagada o sin red |
| Tiempo de espera agotado | El modelo es muy grande o el origen está lento: filtra en Power Query, usa actualización incremental |
| Error en una columna | Cambió el origen (renombraron o borraron una columna): ajusta Power Query en Desktop y vuelve a publicar |

En Power BI real, el servicio envía un correo al dueño cuando una actualización programada falla.

## ✅ Lo que lograste

- Programaste la actualización.
- Sabes cuándo hace falta una puerta de enlace y cómo configurar credenciales.
- Sabes leer el historial y diagnosticar fallas.

:::ejercicio quiz
El modelo lee un SQL Server de la oficina. ¿Qué necesita el servicio para actualizarlo?
- [ ] Nada
- [x] Una puerta de enlace de datos local instalada en la red
- [ ] Una app
- [ ] Una licencia Premium siempre
:::

:::ejercicio quiz
La actualización de anoche falló con "credenciales no válidas". ¿Qué revisas?
- [ ] El tema del informe
- [x] Las credenciales del origen en la configuración del modelo semántico
- [ ] Las medidas DAX
- [ ] Los marcadores
:::

:::ejercicio quiz
El ETL del lakehouse termina a las 6:00. ¿A qué hora programas la actualización?
- [ ] 5:00
- [x] Después de las 6:00, por ejemplo 7:00
- [ ] A medianoche
- [ ] No importa
:::
