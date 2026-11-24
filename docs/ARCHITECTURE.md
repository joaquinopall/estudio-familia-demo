# Arquitectura

Resumen de la arquitectura vigente. La fuente de verdad es [`SPEC.md`](SPEC.md) §6; este documento explica cómo está armado **hoy** el código y hacia dónde va. Se actualiza en cada tarea que cambie estructura o flujos.

Última actualización: F2-08 (22/11/2026). El sitio público de la Fase 2 está implementado; el formulario, la base y los mails llegan en F3.

## Principios

1. **Server-first.** Las páginas públicas se renderizan de forma estática (SSG). Solo el formulario y el panel admin son dinámicos. El JavaScript de cliente se limita a lo interactivo (hoy: el menú mobile y la marca de página actual).
2. **Capas con dependencias hacia adentro.** UI → Server Actions → Services → Repositories / Ports. Los services no conocen Next, Prisma ni SDKs ([ADR 0001](adr/0001-arquitectura-en-capas-por-feature.md)).
3. **Ports & adapters** para servicios externos (mail, captcha, rate limit, reloj): se cambian o se simulan en tests sin tocar la lógica.
4. **Un tenant por instalación:** cada estudio cliente tiene su deploy, su base y su configuración ([ADR 0003](adr/0003-un-tenant-por-instalacion.md)).
5. **Configuración y contenido separados del código:** los datos del estudio viven en `src/config` y `src/content`.
6. **Seguro por defecto:** validación con Zod en el servidor, secretos solo del lado del servidor, headers de seguridad en todas las rutas y logs sin datos personales.

## Capas

```mermaid
flowchart LR
  UI["UI<br/>app/, components/"] --> ACT["Server Actions<br/>features/*/actions.ts"]
  ACT --> SVC["Services<br/>features/*/service.ts"]
  SVC --> REPO["Repositories<br/>features/*/repository.ts"]
  REPO --> DB[("Prisma → Postgres<br/>(Supabase)")]
  SVC --> PORTS["Ports<br/>lib/ports"]
  ADP["Adapters<br/>lib/adapters<br/>Resend · Turnstile · Upstash"] -. implementan .-> PORTS
  ACT -. usa .-> LIB["Transversales<br/>lib/env · lib/action-result · lib/logger"]
```

| Capa           | Responsabilidad                                                                                   | Regla clave                                      |
| -------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| UI             | Páginas, layouts y componentes. Server Components por defecto.                                    | `"use client"` solo si hay interactividad.       |
| Server Actions | Parsean el input con Zod, chequean auth, llaman al service y devuelven `ActionResult<T>`.         | Sin lógica de negocio.                           |
| Services       | Reglas de negocio puras. Reciben repos y ports por parámetro.                                     | Nunca importan Prisma ni SDKs.                   |
| Repositories   | Acceso a datos.                                                                                   | Único lugar que toca Prisma.                     |
| Ports/Adapters | Interfaces de servicios externos y sus implementaciones.                                          | Los SDKs solo se importan en los adapters.       |
| Auth (F4)      | `requireStaff()` en `features/auth/dal.ts`, en **cada** página y action del admin.                | El `proxy` es solo una primera barrera.          |

## Estructura: qué existe hoy y qué viene

| Ruta                          | Estado      | Contenido                                                                                      |
| ----------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `src/app/layout.tsx`          | ✅ F1-07    | Layout raíz: `lang="es-AR"`, fuentes (`next/font`), metadata base.                             |
| `src/app/globals.css`         | ✅ F1-07    | Tokens de diseño (SPEC §11.1).                                                                 |
| `src/app/(public)/`           | ✅ F2-07    | Layout público y las páginas de FR-01. El formulario de Contacto llega en F3.                  |
| `src/app/admin/`              | ⏳ F4       | Login, listado y detalle de consultas.                                                         |
| `src/app/sitemap.ts`, `robots.ts`, `opengraph-image.tsx` | ✅ F2-06 | SEO técnico, generado en el build.                                  |
| `src/app/icon.tsx`, `apple-icon.tsx` | ✅ F2-07 | Íconos con el monograma de `site.config.ts`, generados en el build. `/favicon.ico` se reescribe a `/icon`. |
| `src/app/not-found.tsx`, `error.tsx` y los de `(public)/` | ✅ F2-07 | Páginas de error amigables (FR-16). |
| `src/components/ui/`          | ✅ F1-07    | shadcn/ui (generados).                                                                         |
| `src/components/layout/`      | ✅ F1-07    | Header, MobileMenu, NavLinks, SafetyNotice, Footer, SkipLink, DemoBanner, WhatsAppButton, CtaLink, PublicShell, NotFoundView, ErrorView.                     |
| `src/components/marketing/`   | ✅ F2-07    | Bloques del sitio público; los datos del estudio llegan por props (`UrgentNote` lee su texto fijo de `src/content`). |
| `src/config/site.config.ts`   | ✅ F1-07    | Datos del estudio (ficticios en la demo).                                                      |
| `src/content/`                | ✅ F2-07    | Áreas, preguntas, textos de cada página y de error, ayuda urgente y privacidad como datos.     |
| `src/lib/seo/`                | ✅ F2-07    | Metadata, rutas del sitemap, datos estructurados, `<JsonLd>` seguro e íconos.                  |
| `src/lib/format-date.ts`      | ✅ F2-04    | Fechas largas en es-AR.                                                                        |
| `src/features/inquiries/`     | ⏳ F3–F4    | Consultas: schema, service, repository, actions, mails y componentes.                          |
| `src/features/auth/`          | ⏳ F4       | DAL (`requireStaff`), actions de login y repositorio de staff.                                 |
| `src/lib/env*.ts`             | ✅ F1-04    | Variables de entorno validadas ([ADR 0006](adr/0006-validacion-de-variables-de-entorno.md)).   |
| `src/lib/action-result.ts`    | ✅ F1-04    | Contrato `ActionResult<T>` de las Server Actions (SPEC §6.5).                                  |
| `src/lib/logger.ts`           | ✅ F1-04    | Logger JSON sin datos personales.                                                              |
| `src/lib/security/headers.ts` | ✅ F1-06    | Headers de seguridad y CSP ([ADR 0007](adr/0007-csp-report-only-sin-nonces.md)).               |
| `src/lib/whatsapp.ts`, `utils.ts` | ✅ F1-07 | Link de WhatsApp (FR-13) y `cn()`.                                                           |
| `src/lib/ports/`, `adapters/` | ✅ F3-03    | Ports sin excepciones, adapters de Resend, Turnstile y Upstash, y fakes para tests ([ADR 0013](adr/0013-ports-sin-excepciones-y-caidas-de-servicios.md)). |
| `src/config/rate-limits.ts`   | ✅ F3-03    | Límites anti-abuso de SPEC §8.2.                                                               |
| `src/lib/db.ts`, `db-tls.ts`  | ✅ F3-01    | `getDb()`: cliente Prisma único y lazy, por el pooler, con TLS verificado ([ADR 0012](adr/0012-prisma-7-con-adapter-pg-y-prisma-config.md)). |
| `src/lib/supabase/`           | ⏳ F4       | Clientes de Supabase Auth.                                                                     |
| `src/generated/prisma/`       | ✅ F3-01    | Cliente generado por `prisma generate` (fuera de git).                                         |
| `proxy.ts`                    | ⏳ F4       | Refresh de sesión y redirect de `/admin`.                                                      |
| `prisma/`, `prisma.config.ts` | ✅ F3-01    | Schema de SPEC §7, migraciones (tablas + RLS) y config de la CLI.                              |

## Flujos vigentes

### Arranque y validación de entorno

Al cargar `next.config.ts` (en `next dev`, `next build` y `next start`) se validan todas las variables con los schemas de `src/lib/env.schema.ts`. Si falta una obligatoria o tiene formato inválido, el proceso termina con un mensaje que nombra la variable, nunca su valor. En runtime, el código lee las variables desde `env.ts` (servidor, con `server-only`) o `env.public.ts` (cliente). Ver [ADR 0006](adr/0006-validacion-de-variables-de-entorno.md).

### Servicios externos (F3-03)

- **Ports** (`src/lib/ports`): `EmailSender`, `CaptchaVerifier`, `RateLimiter` y `Clock`. No tiran excepciones por fallas del proveedor: devuelven `unavailable`, `invalid` o `{ ok: false }`, y la action decide.
- **Adapters** (`src/lib/adapters`, `server-only`): Resend, Turnstile (`siteverify` en el servidor, con hostname verificado) y Upstash (ventana deslizante; su timeout cuenta como `unavailable`). `index.ts` es la raíz de composición: crea cada adapter cuando se usa, leyendo `env`.
- **Flujo:** Server Action → toma los ports de `lib/adapters` → se los pasa al service. Los services y sus tests solo conocen los ports, y en tests usan los fakes de `lib/ports/fakes`.
- **Si un servicio se cae** ([ADR 0013](adr/0013-ports-sin-excepciones-y-caidas-de-servicios.md)): el rate limit deja pasar y lo registra en el log, Turnstile rechaza, y el mail no afecta a la consulta ya guardada.
- **Privacidad:** Upstash solo recibe hashes (`RateLimiter` rechaza otras claves), sin analytics ni telemetría. A Turnstile se le manda la IP solo para verificar, y no se guarda.

### Acceso a datos (F3-01)

- **Runtime:** repository → `getDb()` (`src/lib/db.ts`, `server-only`) → `PrismaClient` con `@prisma/adapter-pg` → pooler de Supabase en modo transacción (`DATABASE_URL`, puerto 6543). Las consultas y las transacciones interactivas andan a través del pooler (probado contra dev en F3-01, con una transacción revertida). El cliente se crea en la primera llamada y se guarda en `globalThis`. Pool de 5 conexiones por instancia (NFR-ESC-01).
- **Migraciones:** `prisma migrate` → `prisma.config.ts`, que carga los `.env*` con `@next/env`, los valida con `env.schema.ts` y usa `DIRECT_URL` (modo sesión o conexión directa). Nunca corren en el build ni en Vercel.
- **Cifrado:** las dos conexiones verifican el certificado contra la CA de Supabase (`prisma/certs/supabase-ca.crt`). La configuración está en `src/lib/db-tls.ts`, que es puro para que `prisma.config.ts` también pueda usarlo. Las URLs no llevan parámetros `ssl*`, y Supabase rechaza conexiones sin cifrar.
- **Data API de Supabase:** RLS activado sin políticas en todas las tablas de `public`, así `anon` y `authenticated` no ven nada. Prisma entra como dueño de las tablas, al que RLS no restringe. La autorización está en el código (`requireStaff()`, F4).
- Nada fuera de los repositories importa `db.ts` ni el cliente generado (capas, [ADR 0001](adr/0001-arquitectura-en-capas-por-feature.md)).

### Request a una página pública

```mermaid
sequenceDiagram
  participant B as Navegador
  participant V as Vercel (CDN)
  participant N as Next.js
  B->>V: GET /
  V-->>B: HTML prerenderizado en el build (SSG)<br/>+ headers de seguridad (next.config headers())
  Note over B: Hidrata solo los componentes cliente<br/>(hoy: MobileMenu y NavLinks)
```

- Los headers (HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, CSP report-only) se aplican a **todas** las rutas desde `next.config.ts`.
- El layout público arma la página con datos de `site.config.ts`: banner de demo (salvo `NEXT_PUBLIC_DEMO_MODE=false`, [ADR 0011](adr/0011-modo-demo-por-defecto.md)), header, `<main id="contenido">`, footer con la ayuda ante peligro, botón de WhatsApp y JSON-LD `LegalService`.
- **Header y WhatsApp:** debajo del breakpoint `gutter` (86.25rem = 1380 px) el header es fijo y lleva WhatsApp; desde ahí WhatsApp flota en el margen. Debajo de `lg` el nombre del estudio puede partir en dos líneas (letra del navegador agrandada). El espacio para el header fijo se da con `scroll-margin-top` en el contenido, **no** con `scroll-padding` en `html` (haría saltar la página al enfocar el header).
- **Página actual:** `NavLinks` lee `usePathname` en un subcomponente que no dibuja nada, dentro de `Suspense`. No envuelvas la lista en ese `Suspense`: React reemplazaría los links al cargar y se perdería el foco.
- Las áreas se generan con `generateStaticParams`; un slug desconocido espera el render completo y responde 404 ([ADR 0009](adr/0009-rutas-dinamicas-estaticas-con-cache-components.md)).
- **404 y errores (FR-16):** `notFound()` dentro de una ruta pública usa `(public)/not-found.tsx`, dentro del layout. Una URL sin ruta usa `app/not-found.tsx`, que trae su propio `PublicShell` porque queda fuera de ese layout. Los errores usan `error.tsx` con `retry()` y nunca muestran detalles internos.
- Cada página arma su metadata con `buildPageMetadata`. En modo demo, todas llevan `noindex, nofollow` ([ADR 0010](adr/0010-seo-json-ld-seguro-y-noindex-en-demo.md)).

## Flujos planificados

- **Enviar consulta (F3):** honeypot → rate limit → validación → Turnstile → `createInquiry` (consulta + evento `CREATED` en una transacción) → respuesta con número de referencia → mails con `after()` (aviso con los datos de contacto seguro; acuse neutro, solo si `emailIsPrivate`: SPEC US-03 y US-05). Diagrama en SPEC §6.3; decisiones en [ADR 0004](adr/0004-anti-abuso-honeypot-rate-limit-turnstile.md) y [ADR 0005](adr/0005-mails-despues-de-responder.md).
- **Panel admin (F4):** `proxy` refresca la sesión y redirige `/admin/*` sin sesión; el layout protegido y cada action llaman a `requireStaff()`, que verifica el usuario contra Supabase Auth y busca un `StaffMember` activo. Detalle en SPEC §6.4; datos en [ADR 0002](adr/0002-supabase-con-prisma-y-rls.md).

## Decisiones vigentes

| ADR                                                              | Decisión                                                       | Estado                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------- |
| [0001](adr/0001-arquitectura-en-capas-por-feature.md)            | Capas con ports & adapters, organizadas por feature            | Aceptada                   |
| [0002](adr/0002-supabase-con-prisma-y-rls.md)                    | Supabase + Prisma; RLS sin políticas; sin service role key     | Aceptada (datos en F3-01; Auth en F4) |
| [0003](adr/0003-un-tenant-por-instalacion.md)                    | Un tenant por instalación                                      | Aceptada                   |
| [0004](adr/0004-anti-abuso-honeypot-rate-limit-turnstile.md)     | Anti-abuso: honeypot + rate limit + Turnstile                  | Aceptada (se implementa en F3) |
| [0005](adr/0005-mails-despues-de-responder.md)                   | Mails con `after()`, sin el mensaje completo                   | Aceptada (se implementa en F3) |
| [0006](adr/0006-validacion-de-variables-de-entorno.md)           | Validación de env en `next.config.ts`, pública/privada         | Aceptada                   |
| [0007](adr/0007-csp-report-only-sin-nonces.md)                   | CSP report-only sin nonces para mantener SSG                   | Aceptada (se revisa en F5-01) |
| [0008](adr/0008-politica-de-npm-audit-en-ci.md)                  | `npm audit` bloqueante solo para producción                    | Aceptada                   |
| [0009](adr/0009-rutas-dinamicas-estaticas-con-cache-components.md) | Rutas dinámicas estáticas con 404 real                       | Aceptada                   |
| [0010](adr/0010-seo-json-ld-seguro-y-noindex-en-demo.md)         | JSON-LD seguro y noindex en modo demo                          | Aceptada                   |
| [0011](adr/0011-modo-demo-por-defecto.md) | Modo demo encendido por defecto | Aceptada |
| [0012](adr/0012-prisma-7-con-adapter-pg-y-prisma-config.md) | Prisma 7 con adapter `pg`, `prisma.config.ts`, TLS verificado y override de `effect` | Aceptada |
| [0013](adr/0013-ports-sin-excepciones-y-caidas-de-servicios.md) | Ports sin excepciones; rate limit caído deja pasar, Turnstile caído rechaza | Aceptada |

Otras decisiones de diseño (paleta, tipografías, tema único claro) están en SPEC §11.1 y su registro de cambios (§17).
