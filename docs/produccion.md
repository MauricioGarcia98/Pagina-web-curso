# Llevar el sitio a producción

Guía paso a paso para publicar la Academia de Datos con dominio propio, cuentas opcionales y publicidad no invasiva. Está pensada para gastar lo mínimo: al empezar, lo único que se paga es el dominio.

El código ya está listo. Todo se activa completando `assets/js/config.js`; mientras ese archivo esté vacío, el sitio funciona como hoy (sin cuentas ni anuncios y sin llamar a ningún servicio externo).

## Cómo queda armado

| Pieza | Servicio | Costo al empezar | Para qué |
|---|---|---|---|
| Sitio | Cloudflare Pages | Gratis | Sirve los archivos desde una red mundial, con HTTPS y compresión |
| Dominio | Cloudflare Registrar (u otro) | 10–15 USD por año | Dirección propia; AdSense la exige |
| Cuentas y progreso | Supabase (plan Free) | Gratis | Ingreso por correo, Google o GitHub y copia del progreso en la nube |
| Publicidad | Google AdSense | Gratis (te paga a ti) | Un anuncio al final de la portada y de las lecciones |
| Código | GitHub (el repositorio actual) | Gratis | Cada cambio en `main` se publica solo |

El sitio es estático: no hay servidor propio que mantener. El curso funciona completo sin cuenta; la cuenta solo sincroniza el progreso entre dispositivos.

**Cuándo empezaría a costar.** Supabase Free alcanza para decenas de miles de alumnos registrados (el límite que primero se toca es el de usuarios activos por mes; revisa la cifra vigente en su página de precios). Además, un proyecto gratuito se pausa si pasa una semana sin actividad: con alumnos entrando a diario no ocurre. Cloudflare Pages no cobra por tráfico. Si el sitio crece, el primer gasto razonable es Supabase Pro (unos 25 USD al mes).

## Paso 1 · Dominio y Cloudflare Pages

1. Crea una cuenta en Cloudflare y compra o transfiere el dominio (Registrar). También puedes comprarlo en otro lado y apuntar sus DNS a Cloudflare.
2. En **Workers & Pages → Create → Pages → Connect to Git**, elige este repositorio y la rama `main`.
3. Configuración de compilación: *Framework preset* **None**, *Build command* vacío, *Build output directory* `/` (la raíz). Los archivos generados (`assets/js/content.js`, `assets/content/`) ya están en el repositorio.
4. En el proyecto de Pages, **Custom domains → Set up a domain** y agrega tu dominio.
5. Comprueba que el sitio abre en el dominio nuevo. GitHub Pages puede seguir activo como respaldo o apagarse.

Las cabeceras de caché están en el archivo `_headers` de la raíz: `index.html` se revalida siempre y el resto se guarda unas horas. Como cada archivo de código lleva `?v=<hash>` en su dirección, una publicación nueva se ve al instante.

## Paso 2 · Cuentas con Supabase

1. Crea un proyecto en Supabase (elige la región más cercana a tus alumnos, por ejemplo São Paulo).
2. En **SQL Editor**, ejecuta esto una sola vez. Crea la tabla del progreso y las reglas que hacen que cada persona vea solo su fila:

```sql
create table public.progreso (
  user_id uuid primary key references auth.users (id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  notas text,
  actualizado timestamptz not null default now()
);

alter table public.progreso enable row level security;

create policy "cada quien lee lo suyo" on public.progreso
  for select using (auth.uid() = user_id);
create policy "cada quien crea lo suyo" on public.progreso
  for insert with check (auth.uid() = user_id);
create policy "cada quien actualiza lo suyo" on public.progreso
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cada quien borra lo suyo" on public.progreso
  for delete using (auth.uid() = user_id);

-- tope de tamaño por alumno (1 MB), para que nadie llene la base
alter table public.progreso add constraint progreso_tamano
  check (octet_length(datos::text) + coalesce(octet_length(notas), 0) < 1048576);
```

3. En **Authentication → URL Configuration**, pon tu dominio en *Site URL* y agrégalo también en *Redirect URLs* (por ejemplo `https://tudominio.com/**`).
4. En **Authentication → Providers**, deja activo *Email* (enlace mágico). Google y GitHub son opcionales: cada uno pide crear una aplicación OAuth en su consola y pegar el *client id* y el *secret* en Supabase (nunca en este repositorio).
5. En **Project Settings → API**, copia *Project URL* y la clave **anon public** y pégalas en `assets/js/config.js` (`supabaseUrl`, `supabaseAnonKey`). Si no configuraste Google o GitHub, deja `proveedores: []`.

> **Importante.** La clave *anon* es pública por diseño y puede estar en el repositorio. La clave **service_role** no: da acceso total a la base. No la pegues en ningún archivo del sitio.

6. Publica y prueba: aparece el botón **Ingresar** arriba a la derecha. Ingresa con tu correo, completa un ejercicio, abre el sitio en otro navegador, ingresa otra vez y comprueba que el progreso aparece.

El plan gratuito de Supabase envía pocos correos por hora con su servidor de prueba. Antes de difundir el sitio, configura un proveedor de correo propio en **Authentication → SMTP** (Resend, Brevo y otros tienen planes gratuitos).

### Qué se sincroniza

Progreso, exámenes, tarjetas, código de los ejercicios y notas. El estado de las herramientas de práctica (Power BI, Databricks, la terminal) no viaja a la nube porque pesa mucho; se lleva con la copia de **Mis datos**. Al ingresar, lo local y lo remoto se unen: nunca se pierde un ejercicio hecho en ninguno de los dos lados.

## Paso 3 · Publicidad con AdSense

1. Completa `responsable` y `contacto` en `config.js`: las páginas **Privacidad** y **Términos de uso** (ya incluidas, enlazadas al pie del menú) los muestran. AdSense revisa que existan.
2. Solicita el alta en AdSense con tu dominio. La revisión puede tardar días o semanas y exige contenido original y navegación clara.
3. Cuando te aprueben, crea dos bloques de anuncios adaptables ("Display") y copia en `config.js` tu identificador (`adsenseCliente`, empieza con `ca-pub-`) y el número de cada bloque (`adsenseBloques.leccion` y `adsenseBloques.portada`).
4. Agrega en la raíz el archivo `ads.txt` con la línea que te indica AdSense.

Reglas que el sitio ya cumple solo:

- Un único bloque por página, al final de la portada y de las lecciones.
- Nunca dentro de ejercicios, exámenes, simulacros ni herramientas de práctica.
- Solo se carga si la persona acepta en el aviso de cookies; si elige "Seguir sin anuncios", no se descarga nada de Google.

Si tienes visitantes de la Unión Europea, el Reino Unido o Suiza, Google exige una plataforma de consentimiento certificada: actívala desde AdSense (**Privacidad y mensajes**) antes de mostrar anuncios allí.

## Paso 4 · Antes de difundir

- [ ] El dominio abre con HTTPS y cada publicación en `main` se refleja en un par de minutos.
- [ ] Ingreso por correo probado en dos navegadores; "Borrar mis datos de la nube" funciona.
- [ ] Privacidad y Términos muestran tu nombre y tu correo de contacto.
- [ ] Probaste el sitio en un celular con datos móviles.
- [ ] Alta en Google Search Console: verifica el dominio y envía `sitemap.xml`. El build genera una página por lección en `leccion/` y el sitemap con tu dominio: cambia `homepage` en `package.json` por tu dominio y vuelve a ejecutar `node tools/build.mjs`.

## Lo que falta para crecer

Estas mejoras no bloquean el lanzamiento:

1. **Uso sin conexión** con un service worker.

## Pruebas automáticas

Cada push a `main` y cada pull request corre `.github/workflows/pruebas.yml` en GitHub Actions: revisa la sintaxis del JavaScript, comprueba que los archivos generados estén al día con `node tools/build.mjs`, ejecuta el validador de los ~2.500 ejercicios (`node tools/validate.mjs`) y abre las páginas principales en Chromium (`node tools/humo.mjs`). Si algo falla, el pull request lo muestra en rojo antes de hacer merge.

Para correr lo mismo en tu computadora: `npm ci`, `pip install -r requirements-ci.txt`, `node tools/validate.mjs`; y con el sitio servido (`npm run serve`), `node tools/humo.mjs`.
