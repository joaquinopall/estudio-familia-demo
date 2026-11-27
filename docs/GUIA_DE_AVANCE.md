# Guía de avance — Demo 1 (estudio de familia y sucesiones)

Esta guía es **tuya**: la usás para dirigir a la IA, revisar lo que hace y marcar el avance. La IA la lee para saber en qué tarea estamos, pero **solo vos marcás las tareas como completadas**, después de verificarlas.

## Cómo trabajar cada tarea

1. Abrí Claude Code en **modo plan** y pegá:
   > Leé CLAUDE.md, docs/SPEC.md y docs/GUIA_DE_AVANCE.md. Vamos con la tarea **F1-03**. Armá el plan según CLAUDE.md §1 y esperá mi aprobación.
2. **Revisá el plan** contra la sección "Terminada cuando" de la tarea y los IDs del SPEC. Pedí cambios si hace falta. Aprobalo.
3. Dejá que implemente. Cuando termine, **verificá vos:**
   - leé el diff (¿respeta las capas? ¿hay algo que no pediste?);
   - corré `npm run lint && npm run typecheck && npm run test && npm run build`;
   - hacé la verificación manual que indica la tarea.
4. Si todo está bien: commit o PR, merge con CI en verde, y **marcá la tarea** `[x]`.
5. Si no: pedile la corrección referenciando el criterio que falla.

**Regla de oro:** una tarea = una rama = un PR. Nunca dos tareas mezcladas.

## Tablero

| Fase | Peso | Avance | Estado |
|---|---|---|---|
| F1 — Fundaciones | 0–20% | 9 / 9 | ✅ |
| F2 — Sitio público y contenido | 20–40% | 0 / 8 | ⬜ |
| F3 — Formulario y backend de consultas | 40–60% | 0 / 9 | ⬜ |
| F4 — Panel admin | 60–80% | 3 / 8 | 🟨 |
| F5 — Calidad, seguridad y lanzamiento | 80–100% | 4 / 9 | 🟨 |

Estados: ⬜ sin empezar · 🟨 en curso · ✅ cerrada.

---

## FASE 1 — Fundaciones (0% → 20%) · objetivo de hoy

Al cerrar esta fase el proyecto tiene la estructura, las herramientas, la CI, la seguridad base y la documentación listas. Todavía no hay contenido real, pero todo lo que venga después se apoya acá.

- [X] **F1-01 · Proyecto base desplegado** (Vos)
  Terminada cuando:
  - [X] Proyecto Next.js con TypeScript, Tailwind, App Router, ESLint y carpeta `src/`.
  - [X] Repo en GitHub y primer deploy en Vercel funcionando (abrís la URL y carga).

- [X] **F1-02 · Documentos de trabajo en el repo** (Vos)
  Terminada cuando:
  - [X] `CLAUDE.md` en la raíz; `docs/SPEC.md` y `docs/GUIA_DE_AVANCE.md` en `docs/`.
  - [X] Completaste tu nombre en el SPEC (encabezado y §17).
  - [X] Commit `docs: add CLAUDE.md, spec and progress guide` en `main`.

- [X] **F1-03 · Tooling y scripts** (IA)
  Terminada cuando:
  - [X] TypeScript estricto (incluye `noUncheckedIndexedAccess`), ESLint y Prettier configurados y consistentes entre sí.
  - [X] Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `format:check`, `test`, `test:watch`, `test:coverage`, `test:e2e`.
  - [X] Vitest + Testing Library con **1 test de ejemplo** que pasa.
  - [X] Playwright con **1 smoke test** (el inicio carga y tiene `<h1>`) que pasa en local.
  - [X] `.gitignore` cubre `.env*` (excepto `.env.example`), `coverage/` y los reportes de Playwright.
  - Verificás: corrés todos los scripts y ninguno falla.

- [X] **F1-04 · Estructura y configuración de entorno** (IA) · SPEC §6.2, §9
  Terminada cuando:
  - [X] Carpetas de §6.2 creadas (con un `README` o `index.ts` mínimo donde haga falta, sin código muerto).
  - [X] `src/lib/env.ts` valida con Zod, separando variables públicas y privadas. El build falla si falta una obligatoria (solo las que se usan en esta fase; el resto opcionales hasta su fase).
  - [X] `.env.example` completo con todas las variables del SPEC §9, comentadas y sin valores reales.
  - [X] Paquete `server-only` instalado y usado en `env.ts` privado.
  - [X] `src/lib/action-result.ts` con el tipo `ActionResult` y sus helpers, con tests.
  - [X] `src/lib/logger.ts` (JSON, sin PII) con tests.
  - Verificás: borrás una variable obligatoria de `.env.local` y el build falla con un mensaje claro.

- [X] **F1-05 · CI en GitHub Actions** (IA + Vos)
  Terminada cuando:
  - [X] Workflow en PR y push a `main`: install (`npm ci`) → lint → typecheck → test → build → `npm audit --audit-level=high`.
  - [X] Dependabot configurado (npm y GitHub Actions, semanal).
  - [X] (Vos) Protección de `main` en GitHub: PR obligatorio y check de CI requerido.
  - Verificás: abrís un PR de prueba y aparece el check en verde.

- [X] **F1-06 · Headers de seguridad** (IA) · NFR-SEC-04, NFR-SEC-05
  Terminada cuando:
  - [X] Headers de NFR-SEC-04 configurados para todas las rutas.
  - [X] CSP en modo `Content-Security-Policy-Report-Only` con una política base documentada.
  - [X] Test (unit o e2e) que verifica que los headers están presentes.
  - Verificás: en el preview de Vercel, DevTools → Network → headers de la respuesta del documento.

- [X] **F1-07 · Sistema de diseño base y layout** (IA, después vos con `/claude-design`) · SPEC §11
  Terminada cuando:
  - [X] shadcn/ui inicializado; componentes base agregados: `button`, `input`, `textarea`, `label`, `select`, `radio-group`, `checkbox`, `card`, `badge`, `sonner` o `toast`.
  - [X] Tokens de color y tipografía en `globals.css` según §11.1 (versión inicial) y fuentes con `next/font`.
  - [X] `src/config/site.config.ts` tipado con datos **ficticios** del estudio.
  - [X] Layout público: `SkipLink`, `DemoBanner` (con `NEXT_PUBLIC_DEMO_MODE`), `Header` (con menú mobile accesible), `Footer` (datos del config y disclaimer) y `WhatsAppButton`.
  - [X] `lang="es-AR"` y metadata base del sitio.
  - [X] Página de inicio placeholder con un `<h1>` y un CTA (el contenido real va en F2).
  - Verificás: en mobile y desktop se ven el header, el footer, el banner y WhatsApp; con Tab llegás a todo; el contraste da AA (DevTools o axe).

- [X] **F1-08 · Documentación inicial** (IA) · CLAUDE.md §6
  Terminada cuando:
  - [X] `README.md`: descripción, stack, requisitos, cómo correrlo, variables, scripts, estructura y deploy.
  - [X] `docs/ARCHITECTURE.md` con capas y diagrama (resumen del SPEC §6).
  - [X] `docs/adr/` con las ADR 0001 a 0005 del SPEC §15.
  - [X] `docs/TESTING.md` con cómo correr los tests y la plantilla de casos manuales MT-xx (todavía sin todos los casos).
  - [X] `CHANGELOG.md` iniciado.
  - Verificás: le pasás el README a alguien (o a vos mismo en frío) y se entiende cómo levantar el proyecto.

- [X] **F1-09 · Cierre de fase** (Vos)
  - [X] Todas las tareas F1 mergeadas con CI en verde.
  - [X] Deploy de producción en Vercel actualizado y funcionando.
  - [X] Revisaste la estructura: ¿entendés dónde va cada cosa?
  - [X] Tablero actualizado: **F1 ✅ — 20%**.

---

## FASE 2 — Sitio público y contenido (20% → 40%)

- [ ] **F2-01 · Contenido como datos** (IA) · FR-02, FR-03
  - [ ] `practice-areas.ts` (5 áreas con slug, título, resumen, secciones, preguntas frecuentes y metadata) y `faqs.ts`, tipados.
  - [ ] Textos en borrador según §11.3 y §11.4 (sin promesas de resultado y en lenguaje simple).
  - [ ] Tests que validan la integridad del contenido (slugs únicos, campos obligatorios).
  - Verificás: leés los textos como si fueras un consultante. ¿Se entienden? ¿Generan confianza?

- [ ] **F2-02 · Inicio** (IA + `/claude-design`) · US-01
  - [ ] Hero, áreas, "Cómo trabajamos", señales de confianza, preguntas destacadas y CTA final.
  - [ ] Cumple US-01 CA1 a CA3.

- [ ] **F2-03 · Áreas de práctica** (IA) · US-02, FR-01
  - [ ] `/areas` y `/areas/[slug]` con `generateStaticParams`, CTA con el área preseleccionada y 404 si el slug no existe.

- [ ] **F2-04 · Nosotros, Preguntas frecuentes y Privacidad** (IA) · US-07 CA1
  - [ ] Política de privacidad (Ley 25.326) versionada en `content/legal/privacy.ts`. La revisás vos como estudiante de derecho.

- [ ] **F2-05 · Contacto (sin formulario funcional todavía)** (IA)
  - [ ] Datos, horarios, mapa (link o embed liviano) y WhatsApp. Lugar reservado para el formulario.

- [ ] **F2-06 · SEO técnico** (IA) · FR-14, NFR-SEO-01
  - [ ] Metadata por página, OG image, `sitemap.ts`, `robots.ts` y JSON-LD con helper seguro (con tests).
  - Verificás: probás los datos estructurados en el Rich Results Test de Google con la URL de preview.

- [ ] **F2-07 · Pulido visual y accesibilidad** (Vos con `/claude-design` + IA)
  - [ ] Pasada de diseño completa en mobile y desktop.
  - [ ] axe sin errores críticos; Lighthouse mobile ≥ 90 en inicio y en un área.

- [ ] **F2-08 · Cierre de fase** (Vos)
  - [ ] Tests (unit y e2e de navegación) en verde. Docs actualizados (README, TESTING con MT-01, MT-11, MT-13 y MT-14).
  - [ ] **F2 ✅ — 40%**.

---

## FASE 3 — Formulario y backend de consultas (40% → 60%)

- [ ] **F3-01 · Supabase y Prisma** (Vos + IA) · ADR-0002, SPEC §7, §9
  - [ ] (Vos) Proyectos Supabase **dev** y **prod** creados; variables en `.env.local` y en Vercel (preview → dev, production → prod).
  - [ ] (IA) Prisma configurado (cliente singleton en `lib/db.ts`, pooler en runtime y conexión directa para migraciones).
  - [ ] Schema de §7 y primera migración aplicada en dev.
  - [ ] Migración SQL que habilita RLS en las 3 tablas.
  - Verificás: en Supabase, Table Editor → las tablas existen y el candado de RLS está activo. Con la anon key, una consulta a la tabla vía API devuelve vacío o error.

- [ ] **F3-02 · Schemas y tipos** (IA) · SPEC §8
  - [ ] `inquirySchema` y los demás schemas con tests de cada regla y mensaje.
  - [ ] `safeToContact` (SPEC US-03 CA6): regla condicional y tests. Como es un dato nuevo, subir la versión de la política de privacidad.
  - [ ] `emailIsPrivate` (SPEC US-03 CA7): obligatorio, sin valor por defecto, y regla de "medio seguro" con tests de cada combinación. Incluirlo en la misma versión nueva de la política, que además tiene que decir que el acuse es solo para emails privados.

- [ ] **F3-03 · Ports y adapters** (IA) · NFR-ESC-02
  - [ ] Interfaces `EmailSender`, `CaptchaVerifier`, `RateLimiter` y `Clock`, con sus adapters (Resend, Turnstile, Upstash) y fakes para tests.
  - [ ] (Vos) Cuentas de Resend, Cloudflare Turnstile y Upstash creadas; variables cargadas.

- [ ] **F3-04 · Repository y service de consultas** (IA)
  - [ ] `createInquiry` con transacción (consulta + evento `CREATED`) y referencia (FR-09). Tests con fakes.

- [ ] **F3-05 · Server Action `submitInquiry`** (IA) · FR-04, FR-06, FR-08
  - [ ] Orden anti-abuso de FR-06, `ActionResult` y mails con `after()`.
  - [ ] Tests de integración: OK, VALIDATION, RATE_LIMITED, CAPTCHA_FAILED, honeypot y fallo de mail.

- [ ] **F3-06 · Mails** (IA) · US-05, ADR-0005
  - [ ] Plantillas React Email: aviso al estudio (sin el mensaje completo) y acuse al consultante. Preview local.
  - [ ] Acuse solo si el email es privado, con remitente, asunto, texto y firma neutros (US-03 CA5). Aviso al estudio con `safeToContact`, `emailIsPrivate` y "No iniciar contacto" destacados (US-05 CA1). Tests de los dos.

- [ ] **F3-07 · Formulario de 2 pasos** (IA + `/claude-design`) · US-03
  - [ ] Componente cliente con `useActionState`, Turnstile, errores accesibles, sin pérdida de datos y confirmación con referencia.
  - [ ] Preselección de área por query param.
  - [ ] "¿Es seguro que te contactemos por ese medio?" al elegir teléfono o WhatsApp (US-03 CA6). Revisar el orden de `/contacto` ahora que el formulario funciona.
  - [ ] "¿Este email es privado (solo lo leés vos)?" (US-03 CA7). Sin medio seguro, la confirmación muestra la referencia y no promete contacto (US-03 CA3).
  - [ ] Tests de componente.

- [ ] **F3-08 · E2E del envío** (IA)
  - [ ] Playwright: envío completo con las claves de prueba de Turnstile, con limpieza de los datos `E2E-`.

- [ ] **F3-09 · Cierre de fase** (Vos)
  - [ ] Hiciste MT-02 a MT-06 y MT-15 a mano en el preview.
  - [ ] **F3 ✅ — 60%**.

---

## FASE 4 — Panel admin (60% → 80%)

- [X] **F4-01 · Auth con Supabase** (IA + Vos) · SPEC §6.4, NFR-SEC-07, NFR-SEC-10
  - [X] Clientes `@supabase/ssr`, `proxy` (refresh de sesión y redirect de `/admin`) y `signIn`/`signOut` con rate limit.
  - [X] (Vos) Registro público deshabilitado en Supabase y tu usuario creado.

- [X] **F4-02 · Staff y `requireStaff()`** (IA) · NFR-SEC-02
  - [X] DAL, repositorio de staff y script `staff:add`. Tests: sin sesión, sesión sin staff, staff inactivo y staff OK.

- [X] **F4-03 · Login** (IA + `/claude-design`)
  - [X] Página de login accesible, mensajes genéricos y `noindex`.

- [ ] **F4-04 · Listado** (IA) · US-06 CA2
  - [ ] Tabla paginada en el servidor, filtros (estado, área y urgencia), búsqueda y filtros en la URL (se pueden compartir). Badges de estado y urgencia.

- [ ] **F4-05 · Detalle y acciones** (IA) · US-06 CA3, FR-11, FR-12
  - [ ] Detalle, cambio de estado, notas e historial. Actions con `requireStaff()` y tests (incluido FORBIDDEN).

- [ ] **F4-06 · Link del mail al detalle** (IA)
  - [ ] El mail al estudio lleva a `/admin/consultas/[id]` (pasando por el login si hace falta y volviendo después).

- [ ] **F4-07 · E2E del admin** (IA)
  - [ ] Login, filtrar, cambiar estado, ver historial y acceso denegado.

- [ ] **F4-08 · Cierre de fase** (Vos)
  - [ ] Hiciste MT-07 a MT-10. Docs al día.
  - [ ] **F4 ✅ — 80%**.

---

## FASE 5 — Calidad, seguridad y lanzamiento (80% → 100%)

- [X] **F5-01 · CSP aplicada** (IA) · NFR-SEC-05
  - [X] Se pasa de report-only a aplicada, sin romper Turnstile, Supabase ni Vercel. Verificado en el preview.

- [X] **F5-02 · Auditoría de seguridad** (IA + Vos) · SPEC §10
  - [X] Revisión punto por punto de la tabla de amenazas, con evidencia (test, config o captura) para cada mitigación. Resultado en `docs/SECURITY_REVIEW.md`.

- [X] **F5-03 · Rendimiento y accesibilidad** (IA)
  - [X] Lighthouse mobile ≥ 90 en las 4 categorías y en todas las páginas públicas. axe sin errores.

- [X] **F5-04 · Observabilidad** (IA)
  - [X] Revisión de logs (sin PII). Sentry opcional según lo que decidas (SPEC §15).

- [ ] **F5-05 · Retención de datos** (IA)
  - [ ] Script de purga de consultas de más de 24 meses, con test y documentado.

- [ ] **F5-06 · E2E en CI** (IA)
  - [ ] Playwright corriendo en GitHub Actions contra el preview o con un servidor local y la DB de dev.

- [ ] **F5-07 · Guía de tests manuales completa** (IA + Vos)
  - [ ] `docs/TESTING.md` con MT-01 a MT-15 detallados. **Los ejecutás todos** y registrás el resultado y la fecha.

- [ ] **F5-08 · Lanzamiento de la demo** (Vos)
  - [ ] Dominio o subdominio configurado, dominio de mail verificado en Resend y migraciones en prod.
  - [ ] Staff de demo creado y datos de ejemplo cargados (marcados como ficticios).
  - [ ] README final revisado.

- [ ] **F5-09 · Cierre del proyecto** (Vos)
  - [ ] Guion de demo de 2 minutos para mostrar en el celular (inicio → área → consulta → mail → panel).
  - [ ] Capturas para el portfolio.
  - [ ] **F5 ✅ — 100%**.

---

## Checklist de revisión de cada PR (para vos)

- [ ] ¿Hace solo lo que pedía la tarea?
- [ ] ¿Respeta las capas (nada de Prisma en componentes ni lógica en actions)?
- [ ] ¿Valida en el servidor? ¿Chequea `requireStaff()` si es admin?
- [ ] ¿Hay tests nuevos y tienen sentido (no solo "renderiza")?
- [ ] ¿Hay datos personales en logs o mensajes de error?
- [ ] ¿Secretos o `process.env` sueltos?
- [ ] ¿Docs actualizados (README, TESTING, CHANGELOG, ADR si aplica)?
- [ ] ¿Lo probaste a mano en el preview?
