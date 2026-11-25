# Estudio de familia y sucesiones — Demo 1

Sitio web profesional con sistema de consultas para un estudio jurídico de **familia y sucesiones**. Es una **demo comercial reutilizable**: se convierte en el sitio de un estudio real cambiando configuración y contenido, no código.

> **El estudio es ficticio.** Nombre, profesionales, matrículas, teléfono y dirección son inventados (ver [`src/config/site.config.ts`](src/config/site.config.ts)). Salvo con `NEXT_PUBLIC_DEMO_MODE=false` explícito, el sitio muestra el banner "Sitio de demostración — estudio ficticio".

**Qué va a hacer cuando esté completo** (alcance en [`docs/SPEC.md`](docs/SPEC.md) §2):

- Sitio público: inicio, áreas de práctica, nosotros, preguntas frecuentes, contacto y política de privacidad.
- Formulario "Contanos tu caso" en dos pasos, con anti-spam y consentimiento de datos.
- Aviso por mail al estudio y acuse de recibo neutro a quien consulta, solo si su email es privado.
- Panel de administración para gestionar las consultas.

**Estado actual:** Fase 1 (fundaciones) completa; Fase 2 (sitio público y contenido) implementada, pendiente de los tests manuales de cierre. Próxima: Fase 3 (formulario y backend de consultas). Ver [`docs/GUIA_DE_AVANCE.md`](docs/GUIA_DE_AVANCE.md) y el [`CHANGELOG.md`](CHANGELOG.md).

## Stack

| Área         | Tecnología                                                                    |
| ------------ | ----------------------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router) + React 19 + TypeScript estricto                      |
| Estilos y UI | Tailwind CSS 4 + shadcn/ui (base Radix)                                       |
| Validación   | Zod 4                                                                         |
| Datos y auth | Supabase (Postgres) con Prisma 7 — _F3_; Supabase Auth — _F4_                 |
| Servicios    | Resend (mails), Cloudflare Turnstile (anti-bots), Upstash (rate limit) — _F3_ |
| Tests        | Vitest + Testing Library, Playwright + axe                                    |
| Deploy y CI  | Vercel + GitHub Actions                                                       |

## Requisitos

- **Node.js 24** (está en [`.nvmrc`](.nvmrc); con nvm: `nvm use`).
- **npm** (el que viene con Node 24).
- Git.

## Cómo correrlo

```bash
git clone https://github.com/joaquinopall/estudio-familia-demo.git
cd estudio-familia-demo
npm ci                              # instala lo del package-lock y genera el cliente de Prisma
cp .env.example .env.local          # en Windows: copy .env.example .env.local
npm run dev                         # http://localhost:3000
```

Desde F3-05, `npm run dev` necesita **todas las credenciales del formulario** en `.env.local`: base de datos, Resend, Turnstile (las claves de prueba ya vienen en `.env.example`), Upstash e `IP_HASH_SALT`. Sin ellas, el comando falla y nombra la que falta. Cómo conseguirlas: [Base de datos](#base-de-datos-supabase--prisma) y [Servicios externos](#servicios-externos-mails-anti-bots-y-rate-limit).

Para los tests e2e, la primera vez instalá el navegador: `npx playwright install chromium`.

**Si los estilos no se actualizan** (por ejemplo, tarjetas sin padding o grillas en una sola columna después de agregar clases nuevas): frená `npm run dev`, borrá la carpeta `.next` y volvé a levantarlo. El CSS de Tailwind puede quedar desactualizado mientras el servidor de desarrollo corre.

## Variables de entorno

Se definen en `.env.local` (no se commitea) y se validan con Zod al arrancar `dev`, `build` y `start`: si falta una obligatoria o tiene formato inválido, el comando falla con un mensaje que nombra la variable (nunca su valor). Detalle en [`docs/adr/0006-validacion-de-variables-de-entorno.md`](docs/adr/0006-validacion-de-variables-de-entorno.md).

| Variable                                              | Pública | Obligatoria desde | Uso                                   |
| ----------------------------------------------------- | :-----: | ----------------- | ------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                |   sí    | **Fase 1**        | URLs absolutas, metadata, sitemap     |
| `NEXT_PUBLIC_DEMO_MODE`                               |   sí    | opcional (`true`) | Banner de demo y `noindex`            |
| `NEXT_PUBLIC_SUPABASE_URL`                            |   sí    | Fase 4            | Supabase Auth                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                |   sí    | Fase 4            | Supabase Auth                         |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                      |   sí    | **F3-05**         | Widget anti-bots                      |
| `DATABASE_URL`                                        |   no    | **F3-05**         | Prisma en runtime (pooler)            |
| `DIRECT_URL`                                          |   no    | opcional          | Prisma migraciones (solo la CLI)      |
| `RESEND_API_KEY`                                      |   no    | **F3-05**         | Envío de mails                        |
| `EMAIL_FROM`                                          |   no    | **F3-05**         | Remitente                             |
| `FIRM_NOTIFICATION_EMAIL`                             |   no    | **F3-05**         | Destinatario de consultas nuevas      |
| `TURNSTILE_SECRET_KEY`                                |   no    | **F3-05**         | Verificación anti-bots                |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` |   no    | **F3-05**         | Rate limit                            |
| `IP_HASH_SALT`                                        |   no    | **F3-05**         | HMAC de IPs y emails (32+ caracteres) |

Reglas:

- En el código, las variables se leen **solo** desde `src/lib/env.ts` (servidor) o `src/lib/env.public.ts` (componentes cliente). Nunca `process.env.X` suelto.
- Las `NEXT_PUBLIC_*` terminan en el JavaScript del navegador: nunca pongas secretos en ellas.
- `.env.example` documenta todas las variables y no tiene valores reales; un test verifica que esté sincronizado con los schemas.
- La CI usa valores ficticios para las obligatorias (`.github/workflows/ci.yml`): el build no se conecta a nada.
- `IP_HASH_SALT` es un secreto. Cambiarlo solo reinicia los contadores del rate limit y hace que las consultas nuevas tengan otro `ipHash`. Generalo con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Scripts

| Script                  | Qué hace                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo en `http://localhost:3000`                                                                                                          |
| `npm run build`         | Build de producción                                                                                                                                        |
| `npm run start`         | Sirve el build de producción                                                                                                                               |
| `npm run lint`          | ESLint (reglas de Next + TypeScript, compatibles con Prettier)                                                                                             |
| `npm run typecheck`     | Genera los tipos de rutas (`next typegen`) y corre `tsc --noEmit`                                                                                          |
| `npm run format`        | Formatea con Prettier (incluye el orden de clases de Tailwind)                                                                                             |
| `npm run format:check`  | Verifica el formato sin modificar archivos                                                                                                                 |
| `npm run test`          | Tests unitarios y de componentes con Vitest (una corrida, sin red ni base)                                                                                 |
| `npm run test:db`       | Tests de integración contra la base de **dev** (`.env.local`); no corren en la CI                                                                          |
| `npm run email:dev`     | Preview de los mails en `http://localhost:3001`, con datos de ejemplo ficticios                                                                            |
| `npm run test:watch`    | Vitest en modo watch                                                                                                                                       |
| `npm run test:coverage` | Vitest con reporte de cobertura en `coverage/`                                                                                                             |
| `npm run test:e2e`      | E2E con Playwright contra el build de producción. Cerrá `npm run dev` antes (usa el puerto 3000). Envía consultas reales a la base de **dev**: ver TESTING |
| `npm run db:generate`   | Genera el cliente de Prisma en `src/generated/prisma` (también corre en `npm ci`)                                                                          |
| `npm run db:migrate`    | `prisma migrate dev`: crea y aplica migraciones. **Solo contra Supabase dev**                                                                              |
| `npm run db:deploy`     | `prisma migrate deploy`: aplica migraciones pendientes. Producción, a mano                                                                                 |

Cómo correr y escribir tests, y la guía de tests manuales: [`docs/TESTING.md`](docs/TESTING.md).

> Si `npm run typecheck` falla con errores dentro de `.next/dev/types` sobre archivos que ya no existen, borrá la carpeta `.next/dev` (son tipos viejos que dejó `next dev`).

## Base de datos (Supabase + Prisma)

Postgres de Supabase con Prisma 7 ([ADR 0002](docs/adr/0002-supabase-con-prisma-y-rls.md) y [ADR 0012](docs/adr/0012-prisma-7-con-adapter-pg-y-prisma-config.md)). Hay dos proyectos de Supabase: **dev** (local y previews) y **prod**.

- **Dos URLs:** `DATABASE_URL` es el pooler en modo transacción (puerto 6543) y la usa la app (`src/lib/db.ts`). `DIRECT_URL` es el pooler en modo sesión (5432) o la conexión directa, y solo la usa la CLI para migrar (`prisma.config.ts`). El formato está en `.env.example`. Con el pooler, el usuario es `postgres.<project-ref>`.
- **Cifrado:** las dos conexiones usan TLS verificado contra la CA de Supabase (`prisma/certs/supabase-ca.crt`, pública). Las URLs van **sin** parámetros `ssl*`: el código los agrega y rechaza las URLs que los traen (`src/lib/db-tls.ts`). En Supabase, activá "Enforce SSL on incoming connections" (Database → SSL Configuration) en cada proyecto. Si un día falla con un error de certificado, Supabase rotó la CA: bajá la nueva desde esa misma pantalla y reemplazá el archivo.
- **Primera vez:** cargá las dos URLs de dev en `.env.local` y corré `npm run db:migrate`. Aplica las migraciones de `prisma/migrations`.
- **Cambiar el modelo:** editá `prisma/schema.prisma` y corré `npm run db:migrate -- --name <cambio>`. Commiteá la carpeta de la migración. Si agregás una tabla, activale RLS en la misma migración: `prisma/__tests__/rls.test.ts` falla si falta.
- **SQL a mano** (como RLS): `npm run db:migrate -- --create-only --name <cambio>`, editá el `migration.sql` y volvé a correr `npm run db:migrate`.
- **Nunca** `prisma db push` ni `prisma migrate reset` contra una base compartida (CLAUDE.md §5).
- **RLS:** todas las tablas de `public`, incluida `_prisma_migrations`, tienen RLS activado y sin políticas: la API de Supabase no las puede leer (NFR-SEC-03). Cómo verificarlo: MT-23 en [`docs/TESTING.md`](docs/TESTING.md). **Pendiente de ejecutar** con la clave pública: en F4-01 (dev) y en F5-08 (prod).
- **Código:** solo los repositories usan `getDb()` (`src/lib/db.ts`). El cliente no se conecta hasta la primera consulta, así que el build y los tests no tocan la base.
- **Cliente generado:** vive en `src/generated/prisma` (fuera de git). Si `typecheck` no encuentra `@/generated/prisma/client`, corré `npm run db:generate`.

## Servicios externos (mails, anti-bots y rate limit)

Cada uno está detrás de un port (`src/lib/ports`), con su adapter en `src/lib/adapters` ([ADR 0013](docs/adr/0013-ports-sin-excepciones-y-caidas-de-servicios.md)). Las variables y su formato están en `.env.example`.

| Servicio                 | Para qué                                        | Cuenta y variables                                                                                                                                              |
| ------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resend**               | Aviso al estudio y acuse a quien consulta       | API key con permiso solo de envío (`RESEND_API_KEY`), `EMAIL_FROM` y `FIRM_NOTIFICATION_EMAIL`. Sin dominio verificado, solo entrega a la casilla de la cuenta. |
| **Cloudflare Turnstile** | Anti-bots, verificado en el servidor            | Claves de prueba en local y Preview (ya están en `.env.example`). Las reales (widget "Managed" con el dominio) solo en Production.                              |
| **Upstash Redis**        | Rate limit (SPEC §8.2, `config/rate-limits.ts`) | Base Redis en `us-east`; URL y token REST de escritura (`UPSTASH_REDIS_REST_*`).                                                                                |

- **Mails:** plantillas de React Email en `src/features/inquiries/emails`, textos en `src/content/emails.ts`. Se previsualizan con `npm run email:dev`. El acuse es neutro y va firmado con `siteConfig.shortName`, que no puede incluir la especialidad del estudio (lo controla un test).
- **Si un servicio se cae:** el rate limit deja pasar y lo registra en el log, Turnstile rechaza, y un mail que falla no pierde la consulta (ADR-0013).
- Desde F3-05 sus variables son obligatorias: sin ellas, `dev`, `build` y `start` fallan nombrando la que falta. Cada adapter se crea recién cuando se usa (`getEmailSender()`, `getCaptchaVerifier()`, `getRateLimiter()`).

## Estructura

```
src/
  app/                 rutas (App Router), layout raíz y estilos globales (tokens)
    (public)/          páginas públicas y su layout: banner, header, footer, WhatsApp
  components/
    ui/                componentes de shadcn/ui (generados)
    layout/            Header, MobileMenu, NavLinks, SafetyNotice, Footer, SkipLink, DemoBanner, WhatsAppButton, CtaLink, PublicShell, 404 y error
  config/              site.config.ts: todos los datos del estudio; rate-limits.ts: límites anti-abuso
  content/             contenido del sitio como datos
  features/            código por feature: inquiries, auth (Fases 3 y 4)
  generated/prisma/    cliente de Prisma generado (no se commitea)
  lib/                 env, db (Prisma), ports y adapters, ActionResult, logger, headers de seguridad, SEO, utilidades
prisma/                schema.prisma, migraciones, test de RLS y CA de Supabase (certs/)
prisma.config.ts       configuración de la CLI de Prisma (URL de migraciones)
tests/e2e/             Playwright
docs/                  SPEC, guía de avance, arquitectura, ADR, testing
```

Arquitectura, capas y flujos: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Decisiones: [`docs/adr/`](docs/adr/README.md).

## Diseño y datos del estudio

- **Tokens de diseño** (SPEC §11.1) en `src/app/globals.css`: base marfil, primario verde azulado y acento terracota (solo para llamados a la acción). Un solo tema claro. Los colores están en hex y el test `src/app/__tests__/design-tokens.test.ts` verifica contraste AA (texto 4.5:1; foco y bordes de campos 3:1).
- **Tipografías** (`next/font`, en `src/app/layout.tsx`): Lora para títulos y Plus Jakarta Sans para texto.
- **Componentes UI:** shadcn/ui en `src/components/ui`, agregados con `npx shadcn@4.23.0 add <componente>`. No se editan salvo necesidad (hoy, solo `sonner.tsx`: tema claro fijo) y Prettier no los formatea.
- **Datos del estudio:** todos en [`src/config/site.config.ts`](src/config/site.config.ts). Para un estudio real se edita ese archivo, no los componentes (ver [`src/config/README.md`](src/config/README.md)).
- **Íconos:** `lucide-react`, siempre con trazo fino (`strokeWidth` 1.5) y sin círculos ni fondos de color detrás; se usan como apoyo de rótulos (`FactLabel`), nunca como decoración suelta. Sin clichés jurídicos (balanza, martillo).
- **Responsive:** mobile first. El menú de escritorio aparece desde `lg` (1024 px), sin "Inicio" hasta `nav` (1152 px). Hasta `gutter` (1380 px) el header es fijo y lleva WhatsApp; desde ahí WhatsApp flota en el margen. No agregues nada flotante sobre el contenido. Debajo de `lg` el nombre del estudio puede partir en dos líneas: no le pongas `whitespace-nowrap`.
- **Peligro y plazos (SPEC §11.5):** los teléfonos de ayuda están en `src/content/urgent-help.ts`, con sus fuentes oficiales. **Verificalos antes de cada entrega a un estudio.**
- **Foco:** el anillo usa el color primario. Sobre un fondo primario redefinilo con `[--ring:var(--primary-foreground)]` (como `CtaSection`): si no, es invisible y axe no lo detecta. Lo verifica `tests/e2e/quality.spec.ts`.
- El refinamiento visual se hace con `/claude-design`, respetando los tokens.

## SEO

- **Metadata:** cada página pública usa `buildPageMetadata` (`src/lib/seo/page-metadata.ts`): título, descripción, canonical y Open Graph completo con imagen. No armes `openGraph` a mano en una página: Next combina la metadata de forma superficial y se pierde la imagen.
- **Datos estructurados:** `LegalService` en el layout público, `FAQPage` en preguntas frecuentes, `Service` en cada área y `BreadcrumbList` en las páginas internas. Se renderizan solo con `<JsonLd>` (`src/lib/seo/json-ld.tsx`), el único uso permitido de `dangerouslySetInnerHTML`. Los horarios salen de `siteConfig.openingHours`: mantenelo igual a `hours`.
- **`/sitemap.xml`, `/robots.txt` (excluye `/admin`) y `/opengraph-image`** se generan en el build.
- **La demo no se indexa:** con el modo demo encendido (el valor por defecto, [ADR-0011](docs/adr/0011-modo-demo-por-defecto.md)) todas las páginas llevan `noindex, nofollow` ([ADR-0010](docs/adr/0010-seo-json-ld-seguro-y-noindex-en-demo.md)). Para un estudio real, poné la variable en `false` y `NEXT_PUBLIC_SITE_URL` con el dominio final, y volvé a deployar: son valores de build.

## Pasar a un estudio real

La demo tiene **dos interruptores** y hay que apagar los dos: `isFictitious` y `NEXT_PUBLIC_DEMO_MODE`.

1. **Datos:** reemplazá todo [`src/config/site.config.ts`](src/config/site.config.ts). Es fácil olvidar `description`, la formación de cada profesional, `geo`, `mapsUrl`, el código postal y `openingHours`.
2. **`isFictitious: false`:** saca el aviso de Privacidad y la etiqueta de la imagen para compartir.
3. **`NEXT_PUBLIC_DEMO_MODE=false`** en Production, con `NEXT_PUBLIC_SITE_URL` del dominio final, y redeploy: saca el banner y el `noindex`. Dejá el modo demo encendido en Preview.
4. **Jurisdicción y teléfonos de ayuda:** cambiar `jurisdiction` no alcanza. La OVD (Lavalle 1250) es de CABA y el 137 no cubre todo el país. Verificá en las fuentes oficiales y editalos en [`src/content/urgent-help.ts`](src/content/urgent-help.ts), el único lugar donde están: de ahí salen la franja de ayuda y la pregunta sobre violencia de "Cuidado personal". Si cambian, actualizá también SPEC §11.5 y `src/content/__tests__/urgent-help.test.ts`, que fija los números verificados.
5. **Contenido legal:** que el estudio revise áreas, preguntas frecuentes, aviso de plazos, política de privacidad (con su versión y fecha) y las normas de publicidad de su colegio (SPEC §11.4).
6. **Ícono:** poné la inicial del estudio en `monogram`. La pestaña y el ícono de inicio del celular se generan con ella y los colores de la marca.
7. **Verificá:** corré los tests y los e2e, y hacé MT-01, MT-13, MT-14 y MT-22. En el deploy, abrí también `/opengraph-image` y `/icon`.

## Seguridad

- **Headers** en todas las rutas: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY` y una CSP en modo **report-only** (no bloquea; las violaciones se ven en la consola del navegador como `[Report Only]`). Se definen en `src/lib/security/headers.ts`. Ver [ADR 0007](docs/adr/0007-csp-report-only-sin-nonces.md).
- **Variables de entorno** validadas al arrancar; secretos solo del lado del servidor (`server-only`).
- **Base de datos:** RLS sin políticas en todas las tablas y sin service role key ([ADR 0002](docs/adr/0002-supabase-con-prisma-y-rls.md)); conexiones con TLS verificado ([ADR 0012](docs/adr/0012-prisma-7-con-adapter-pg-y-prisma-config.md)).
- **Logs** estructurados en JSON, sin datos personales (`src/lib/logger.ts`).
- Detalle completo de requisitos y amenazas en SPEC §10.

## Calidad y CI

- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) en cada PR y push a `main`: `npm ci` → lint → typecheck → format:check → test → build → `npm audit`. El check `CI / verify` es obligatorio para mergear.
- **Audit:** bloquea vulnerabilidades altas en dependencias de producción; el audit completo es informativo. Ver [ADR 0008](docs/adr/0008-politica-de-npm-audit-en-ci.md).
- **Dependabot** ([`.github/dependabot.yml`](.github/dependabot.yml)): los lunes, npm y GitHub Actions; minor/patch agrupadas, major por separado. Las major se revisan antes de mergear.
- Los e2e todavía corren solo en local (en CI desde la tarea F5-06).

## Deploy (Vercel)

- **Producción** se despliega desde `main`; cada PR genera un **preview**.
- Cargá las variables en Vercel → Settings → Environment Variables, en **Production y Preview**. Si falta una obligatoria, el build falla con el mensaje de la validación (útil para diagnosticar un deploy rojo).
- Node 24 se toma de `engines` en `package.json`.
- **Base de datos:** `DATABASE_URL` va en Preview con la URL de Supabase **dev** y en Production con la de **prod**. `DIRECT_URL` no se carga en Vercel: las migraciones no corren en el deploy.
- **Desde F3-05, todas las variables obligatorias tienen que estar en Preview y Production** antes de mergear: si falta una, el build de Vercel falla y la nombra.
- **Turnstile:** en Preview, las claves de prueba de `.env.example`; en Production, las reales (ADR-0013). Resend y Upstash pueden compartir cuenta entre Preview y Production en la demo; para un estudio real, conviene separarlos.
- **Migraciones de producción:** se aplican a mano antes de mergear cambios de schema, con aprobación y un export previo de la base (SPEC §14): `DIRECT_URL="<url de prod>" npm run db:deploy`. La variable del shell gana sobre `.env.local`.

## Flujo de trabajo

El proyecto sigue **spec-driven development**: [`docs/SPEC.md`](docs/SPEC.md) es la fuente de verdad, y cada tarea de la guía se planifica, se aprueba, se implementa con tests y se verifica antes de cerrarse (detalle en [`CLAUDE.md`](CLAUDE.md)).

- Una tarea = una rama `feat/<tarea>-<descripcion>` creada desde `main` = un PR.
- PR con CI en verde y **squash merge**.
- Commits con Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`).
- Cada tarea actualiza la documentación en el mismo PR.

## Documentación

| Documento                                          | Para qué                                            |
| -------------------------------------------------- | --------------------------------------------------- |
| [`docs/SPEC.md`](docs/SPEC.md)                     | Requisitos, arquitectura, datos, seguridad y diseño |
| [`docs/GUIA_DE_AVANCE.md`](docs/GUIA_DE_AVANCE.md) | Fases, tareas y avance                              |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)     | Capas, flujos y decisiones vigentes                 |
| [`docs/adr/`](docs/adr/README.md)                  | Registro de decisiones de arquitectura              |
| [`docs/TESTING.md`](docs/TESTING.md)               | Cómo correr los tests y guía de tests manuales      |
| [`CHANGELOG.md`](CHANGELOG.md)                     | Cambios por tarea                                   |
| [`CLAUDE.md`](CLAUDE.md)                           | Instrucciones de trabajo para la IA                 |
