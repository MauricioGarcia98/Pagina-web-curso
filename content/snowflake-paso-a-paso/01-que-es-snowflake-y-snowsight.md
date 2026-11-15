---
titulo: Qué es Snowflake y cómo es Snowsight
nivel: 1 · Básico
duracion: 30
resumen: Snowflake es un data warehouse en la nube que separa el almacenamiento del cómputo - guardas los datos una vez y los consultas con "warehouses virtuales" que se pagan por segundo. Qué problema resuelve, sus tres capas, los objetos principales (cuenta, base, esquema, tabla, stage, warehouse, rol) y cada zona de Snowsight, su interfaz web.
objetivos: Explicar qué es Snowflake y en qué se diferencia de una base tradicional | Nombrar sus tres capas | Ubicar los objetos principales y su jerarquía | Recorrer la navegación de Snowsight | Saber qué es real y qué es simulado en la práctica
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Sabes qué es un warehouse virtual? | ¿Sabes por qué separar almacenamiento y cómputo ahorra dinero? | ¿Sabes cuál es el nombre completo de una tabla? | ¿Sabes dónde se crea una hoja SQL?
---

:::analogia En palabras simples
Una base tradicional es como un auto: el motor y el baúl vienen juntos, y si necesitas más motor, cambias el auto entero. **Snowflake separa el baúl (los datos) del motor (el cómputo)**: los datos se guardan una sola vez y prendes los motores que necesites - uno chico para los analistas, uno grande para la carga de la noche - y los apagas cuando no se usan.
:::

## Paso 1 — Las tres capas

| Capa | Qué hace | Se paga |
|---|---|---|
| **Almacenamiento** | Guarda las tablas comprimidas en micro-particiones, en la nube que elijas (AWS, Azure o GCP) | Por TB al mes |
| **Cómputo (warehouses virtuales)** | Ejecuta las consultas. Se prende, se apaga y cambia de tamaño en segundos | Créditos por segundo mientras está encendido |
| **Servicios en la nube** | Seguridad, metadatos, optimizador, caché de resultados | Incluido hasta cierto uso |

## Paso 2 — Los objetos

```text
Cuenta
├── Warehouses (cómputo)
├── Roles y usuarios (seguridad)
└── Bases de datos
    └── Esquemas
        ├── Tablas y vistas
        └── Stages (archivos para cargar)
```

El nombre completo de una tabla es **`BASE.ESQUEMA.TABLA`**, por ejemplo `TIENDA_ANDINA.PUBLIC.PEDIDOS`.

## Paso 3 — Snowsight

Abre el [Snowflake de práctica](#/snowflake):

```captura
archivo: snowflake/s01-home.webp
texto: La navegación (1), la explicación de la práctica (2) y los accesos a una hoja SQL, los datos y los warehouses (3)
```

| Sección | Qué tiene |
|---|---|
| **Projects** | Worksheets (hojas SQL), Notebooks, Streamlit, Dashboards |
| **Data** | Databases (el explorador de objetos) y Marketplace |
| **Monitoring** | Query History, Copy History, Task History |
| **Admin** | Warehouses, Cost Management, Users & Roles |

El botón **Create** crea cualquier objeto:

```captura
archivo: snowflake/s01-crear.webp
texto: Create - SQL Worksheet, Database, Warehouse, Stage y Table
```

## Paso 4 — Qué es real en la práctica

| Real | Simulado |
|---|---|
| El SQL corre de verdad (sobre DuckDB en tu navegador) con la sintaxis de Snowflake | No hay cuenta ni nube: todo vive en tu navegador |
| Warehouses que se encienden, suspenden y gastan créditos estimados | Los créditos son una estimación, no una factura |
| Stages, COPY INTO, JSON, MERGE, Time Travel, clones, roles y permisos | Notebooks, Streamlit, Marketplace y Task History muestran qué son, sin simularlos |

Los datos son los de **Tienda Andina**, la misma tienda del resto del curso: 12.000 pedidos, clientes, productos y detalle.

## ✅ Lo que lograste

- Sabes qué es Snowflake y sus tres capas.
- Conoces la jerarquía de objetos.
- Ubicas cada sección de Snowsight.

:::ejercicio quiz
¿Qué es un warehouse virtual en Snowflake?
- [ ] Una base de datos
- [x] El cómputo que ejecuta las consultas, que se prende y apaga
- [ ] Un archivo CSV
- [ ] Un usuario
:::

:::ejercicio quiz
¿Por qué separar almacenamiento y cómputo ahorra dinero?
- [x] Porque el cómputo solo se paga mientras está encendido y se dimensiona por trabajo
- [ ] Porque los datos no ocupan espacio
- [ ] Porque Snowflake es gratis
- [ ] No ahorra nada
:::

:::ejercicio quiz
¿Cuál es el nombre completo de una tabla?
- [ ] TABLA.BASE
- [x] BASE.ESQUEMA.TABLA
- [ ] ESQUEMA.BASE.TABLA
- [ ] CUENTA.TABLA
:::

:::ejercicio quiz
¿En qué sección están Warehouses y Users & Roles?
- [ ] Projects
- [ ] Data
- [ ] Monitoring
- [x] Admin
:::
