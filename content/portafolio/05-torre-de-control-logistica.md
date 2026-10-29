---
titulo: "Proyecto 4: Torre de control logística en Azure"
nivel: Avanzado
duracion: 110
resumen: Envíos y su seguimiento evento por evento, con transportistas de desempeño distinto, entregas tarde y paquetes perdidos. Ingesta orquestada a Azure Data Lake Storage con Data Factory (o Airflow en tu computadora), transformación en capas, KPIs operativos (entregas a tiempo, tiempo entre estados, envíos sin novedad) y alertas. Valor - que operaciones vea los problemas el mismo día y negocie con datos con los transportistas.
objetivos: Calcular entregas a tiempo (OTD) y tiempos entre estados con SQL | Detectar envíos estancados sin eventos recientes | Organizar un data lake en ADLS Gen2 con contenedores por capa | Orquestar la ingesta con Data Factory o Airflow con parámetros de fecha | Asegurar el acceso con identidades administradas y RBAC en lugar de claves
prerrequisitos: portafolio-como-armar-tu-portafolio | azure-storage
autoevaluacion: ¿Sabes calcular el porcentaje de entregas a tiempo por transportista? | ¿Sabes medir el tiempo entre dos eventos de un mismo envío? | ¿Sabes cómo organizar contenedores y carpetas en ADLS? | ¿Sabes por qué usar una identidad administrada en lugar de una clave de cuenta? | ¿Sabes parametrizar un pipeline por fecha?
---

:::escenario
La gerente de operaciones de un operador logístico se entera de los envíos atrasados cuando el cliente llama enojado. Tiene cuatro transportistas y la sensación de que "Correo Nacional es el peor", pero no puede probarlo en la negociación del contrato. Quiere una torre de control: qué está atrasado hoy, qué transportista cumple y dónde se traban los paquetes.
:::

## Valor

- **OTD por transportista** (entregas a tiempo) para negociar contratos con datos.
- **Envíos estancados** detectados el mismo día, no cuando reclama el cliente.
- **Dónde se pierde el tiempo**: entre "retirado" y "en camino", o en el último tramo.

## Los datos

[🏭 Generar los datos del proyecto](#/generador?esc=logistica&n=5000&semilla=21&desde=2024-01-01&hasta=2024-12-31&duplicados=2&nulos=3&formatos=4&tardios=5) · Escenario **Logística**: `almacenes`, `envios` (fecha prometida y real) y `eventos_envio` (creado, retirado, en camino, en reparto, entregado).

```bash
generar-datos logistica --filas 1500 --semilla 21
duckdb -c "SELECT transportista, COUNT(*) FROM '~/datos/generados/logistica/envios.csv' GROUP BY 1"
```

## Arquitectura en Azure

```diagrama
titulo: Torre de control logística en Azure
nodo src: Sistema de envíos | icono=camion | col=0 | fila=0 | sub=exporta CSV diario
nodo adf: Data Factory | icono=adf | col=1 | fila=0 | sub=copia con parámetro\nde fecha
nodo raw: ADLS: raw | icono=adls | col=2 | fila=0 | color=naranja | sub=/envios/fecha=AAAA-MM-DD/
nodo cur: ADLS: curated | icono=adls | col=3 | fila=0 | color=gris | sub=Parquet limpio
nodo dbx: Transformación | icono=databricks | col=3 | fila=1 | sub=Databricks o\nSynapse serverless
nodo bi: Power BI | icono=powerbi | col=2 | fila=1 | color=verde | sub=torre de control
nodo kv: Key Vault + identidad | icono=keyvault | col=1 | fila=1 | sub=sin claves en el código
flecha src -> adf
flecha adf -> raw
flecha raw -> dbx
flecha dbx -> cur
flecha cur -> bi
flecha kv -> adf: secretos | estilo=punteada
```

## Fase 1: KPIs en tu computadora

Antes de la nube, los KPIs en SQL sobre los CSV (DuckDB) y, si quieres, un DAG de Airflow local que corre la carga por fecha (`{{ ds }}`), como en el módulo "Desde tu computadora". Las definiciones son lo más importante:

| KPI | Definición | Cuidado |
|---|---|---|
| OTD | Entregados con `fecha_entrega` ≤ fin del día de `fecha_promesa` ÷ entregados | Los "en camino" vencidos también son tarde: inclúyelos en otro indicador |
| Tiempo de tránsito | `fecha_entrega − fecha_creacion` en horas | Mediana, no promedio (pocos envíos perdidos lo distorsionan) |
| Estancado | Envío no entregado sin eventos en las últimas 72 h | Los eventos pueden llegar tarde: usa la hora del evento, no la de carga |

## Fase 2: Azure paso a paso

```bash
az group create -n rg-torre-lab -l eastus2 --tags proyecto=lab
az storage account create -n sttorrelab$RANDOM -g rg-torre-lab -l eastus2 --sku Standard_LRS --kind StorageV2 --hns true
az storage fs create -n raw --account-name <cuenta> --auth-mode login
az storage fs create -n curated --account-name <cuenta> --auth-mode login
```

- `--hns true` activa el **espacio de nombres jerárquico**: eso convierte una cuenta de almacenamiento en ADLS Gen2 (carpetas reales, permisos por carpeta).
- **Data Factory**: un pipeline con un parámetro `fecha` y una actividad de copia de la fuente a `raw/envios/fecha=@{pipeline().parameters.fecha}/`. Un trigger diario le pasa la fecha.
- **Identidad administrada**: Data Factory y Databricks acceden al lago con su identidad y el rol `Storage Blob Data Contributor`, no con la clave de la cuenta.
- **Transformación**: notebook de Databricks (o Synapse serverless) que lee raw, deduplica y escribe Parquet o Delta en curated.
- **Power BI**: conectado a curated, con los KPIs de la tabla de arriba y un filtro por transportista.

:::tip Limpieza
Todo vive en `rg-torre-lab`: al terminar, `az group delete -n rg-torre-lab --yes --no-wait` y verifica con `az group list -o table`.
:::

## Entregables

- [ ] Diccionario de KPIs con sus definiciones y decisiones (qué cuenta como "tarde").
- [ ] Ranking de transportistas por OTD y tiempo de tránsito, con la recomendación para la negociación.
- [ ] Pipeline de Data Factory (o DAG de Airflow) parametrizado por fecha, con una captura de una ejecución.
- [ ] Explicación de seguridad: identidades administradas y RBAC.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Los datos logísticos"
Genera los datos del escenario `logistica` con 1500 envíos y semilla 21.
```respuesta
todos: generar-datos logistica || --filas 1500 || --semilla 21
```
```solucion
generar-datos logistica --filas 1500 --semilla 21
```
:::

:::ejercicio cli dificultad=Intermedio titulo="El grupo de recursos"
Crea el grupo de recursos `rg-torre-lab` en la región `eastus2`.
```respuesta
todos: az group create || (-n|--name) rg-torre-lab || (-l|--location) eastus2
```
```solucion
az group create -n rg-torre-lab -l eastus2
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Entregas a tiempo por transportista"
`envios_tc(envio_id, transportista, fecha_promesa, fecha_entrega, estado)`. Para los envíos **entregados**, calcula por transportista `entregados`, `a_tiempo` (entrega en el día prometido o antes: `date(fecha_entrega) <= fecha_promesa`) y `otd_pct` (1 decimal). Ordena de mayor a menor OTD.
```sql setup
CREATE TABLE envios_tc (envio_id INTEGER, transportista TEXT, fecha_promesa TEXT, fecha_entrega TEXT, estado TEXT);
INSERT INTO envios_tc VALUES
(1, 'Rápido Express', '2024-05-03', '2024-05-02 16:10', 'entregado'), (2, 'Rápido Express', '2024-05-03', '2024-05-03 19:00', 'entregado'),
(3, 'Rápido Express', '2024-05-04', '2024-05-05 10:00', 'entregado'), (4, 'Correo Nacional', '2024-05-03', '2024-05-06 12:00', 'entregado'),
(5, 'Correo Nacional', '2024-05-05', '2024-05-05 09:00', 'entregado'), (6, 'Correo Nacional', '2024-05-05', NULL, 'en_camino'),
(7, 'Andes Cargo', '2024-05-02', '2024-05-02 11:00', 'entregado'), (8, 'Andes Cargo', '2024-05-02', '2024-05-02 18:00', 'entregado');
```
```sql solucion
SELECT transportista,
       COUNT(*) AS entregados,
       SUM(CASE WHEN date(fecha_entrega) <= fecha_promesa THEN 1 ELSE 0 END) AS a_tiempo,
       ROUND(100.0 * SUM(CASE WHEN date(fecha_entrega) <= fecha_promesa THEN 1 ELSE 0 END) / COUNT(*), 1) AS otd_pct
FROM envios_tc
WHERE estado = 'entregado'
GROUP BY transportista
ORDER BY otd_pct DESC;
```
```pista
Filtra `estado = 'entregado'` y cuenta los a tiempo con `SUM(CASE WHEN date(fecha_entrega) <= fecha_promesa THEN 1 ELSE 0 END)`.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Envíos estancados"
`eventos_tc(envio_id, ts, estado)`. Son las `2024-05-10 08:00`. Devuelve los envíos cuyo **último** evento no es `entregado` y ocurrió hace más de 72 horas: `envio_id`, `ultimo_estado` y `horas_sin_novedad` (entero), de más a menos horas.
```sql setup
CREATE TABLE eventos_tc (envio_id INTEGER, ts TEXT, estado TEXT);
INSERT INTO eventos_tc VALUES
(1, '2024-05-02 08:00', 'creado'), (1, '2024-05-02 14:00', 'retirado'), (1, '2024-05-03 09:00', 'entregado'),
(2, '2024-05-03 10:00', 'creado'), (2, '2024-05-04 07:00', 'retirado'), (2, '2024-05-05 12:00', 'en_camino'),
(3, '2024-05-08 09:00', 'creado'), (3, '2024-05-09 15:00', 'en_camino'),
(4, '2024-05-01 10:00', 'creado'), (4, '2024-05-02 18:00', 'en_reparto');
```
```sql solucion
WITH ult AS (
  SELECT envio_id, ts, estado, ROW_NUMBER() OVER (PARTITION BY envio_id ORDER BY ts DESC) AS rn FROM eventos_tc
)
SELECT envio_id, estado AS ultimo_estado,
       CAST((julianday('2024-05-10 08:00') - julianday(ts)) * 24 AS INTEGER) AS horas_sin_novedad
FROM ult
WHERE rn = 1 AND estado <> 'entregado' AND (julianday('2024-05-10 08:00') - julianday(ts)) * 24 > 72
ORDER BY horas_sin_novedad DESC;
```
```pista
Encuentra el último evento de cada envío con `ROW_NUMBER() … ORDER BY ts DESC` y filtra los que no son `entregado` y tienen más de 72 horas.
```
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué hace `--hns true` al crear la cuenta de almacenamiento?

- [ ] Activa el cifrado
- [x] Activa el espacio de nombres jerárquico: la cuenta pasa a ser ADLS Gen2, con carpetas reales y permisos por carpeta
- [ ] Hace la cuenta pública
- [ ] Replica los datos en otra región
:::

:::ejercicio quiz dificultad=Avanzado
¿Cómo debe acceder Data Factory al lago?

- [ ] Con la clave de la cuenta de almacenamiento pegada en el pipeline
- [x] Con su identidad administrada y el rol Storage Blob Data Contributor sobre la cuenta o el contenedor
- [ ] Con el usuario personal de quien creó el pipeline
- [ ] Con un token SAS sin vencimiento
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué conviene reportar la **mediana** del tiempo de tránsito y no el promedio?

- [ ] Porque es más fácil de calcular
- [x] Porque unos pocos envíos perdidos o muy demorados inflan el promedio y no representan el envío típico
- [ ] Porque Power BI no calcula promedios
- [ ] Porque el promedio siempre es menor
:::

## Para ir más lejos

- Alertas: un correo o mensaje de Teams cuando el OTD del día cae por debajo de 85 % (Logic Apps o una tarea del pipeline).
- Microsoft Fabric: la misma solución con OneLake, pipelines de Fabric y un modelo semántico de Power BI.
- Infraestructura con Terraform (proyecto 11).
