# Revisión de seguridad

Revisión punto por punto de SPEC §10 (requisitos NFR-SEC y tabla de amenazas), con la evidencia de cada mitigación (tarea F5-02). La evidencia se linkea, no se copia: si un test cambia de nombre, se actualiza el link.

| | |
| --- | --- |
| Fecha | 26/11/2026 |
| Versión revisada | `main` después de F5-01 (CSP aplicada, #44) |
| Alcance | Código, configuración del repo y de los servicios (Supabase, Vercel, GitHub, Cloudflare, Upstash, Resend) |
| Fuera de alcance | Pentest externo, revisión de la infraestructura de los proveedores |

**Estados:** ✅ comprobado con la evidencia linkeada · ⏳ falta una prueba manual (no se da por comprobado hasta registrarla) · ⚠️ riesgo residual aceptado o con plan.

## Resumen

- **Código:** todas las mitigaciones de §10.2 tienen al menos un test automático. F5-02 agrega guardas que impiden que se rompan sin aviso: reglas de ESLint, un test estructural de autorización del panel y un e2e de CSRF.
- **Configuración de servicios:** depende de pruebas manuales que todavía no se registraron (MT-23, MT-24 y MT-29 en dev). Hasta entonces, esas filas quedan en ⏳ y la revisión no está cerrada.
- **Hallazgo principal (H1), resuelto:** el mensaje de la consulta y las notas internas se guardaban en claro, y quien accediera a la base (dashboard, backup, export) los leía. Desde el segundo PR de F5-02 van cifrados con AES-256-GCM a nivel de aplicación ([ADR 0017](adr/0017-cifrado-de-campos-a-nivel-de-aplicacion.md)).

## Guardas automáticas agregadas en F5-02

| Guarda | Dónde | Qué impide |
| --- | --- | --- |
| ESLint: `$queryRawUnsafe`, `$executeRawUnsafe` y `Prisma.raw` | [`eslint.config.mjs`](../eslint.config.mjs) | SQL armado con texto, en todo el repo (incluidos los scripts) |
| ESLint: `dangerouslySetInnerHTML` | ídem | HTML crudo fuera de `src/lib/seo/json-ld.tsx` |
| ESLint: `process.env` | ídem | Leer variables sin validar fuera de `src/lib/env*.ts` y los tests |
| Test de las reglas | [`eslint-security.test.ts`](../src/lib/__tests__/eslint-security.test.ts) | Que una regla deje de disparar o bloquee lo permitido |
| Autorización estructural del panel | [`panel-authorization.test.ts`](../src/features/auth/__tests__/panel-authorization.test.ts) | Una página del panel sin `requireStaff()`, una página de `/admin` fuera de `(protected)`, o una Server Action nueva sin clasificar como pública o del panel |
| E2E de CSRF | [`csrf.spec.ts`](../tests/e2e/csrf.spec.ts) | Que una Server Action se ejecute desde otro origen |

## Requisitos (SPEC §10.1)

| ID | Requisito | Evidencia | Estado |
| --- | --- | --- | --- |
| NFR-SEC-01 | Validación de todo input en el servidor | Cada action parsea con Zod antes del service: [`submit-inquiry.test.ts`](../src/features/inquiries/__tests__/submit-inquiry.test.ts) ("returns the errors per field and does not call Turnstile"), [`update-inquiry.test.ts`](../src/features/inquiries/__tests__/update-inquiry.test.ts) (notas > 5000), [`sign-in.test.ts`](../src/features/auth/__tests__/sign-in.test.ts) ("returns VALIDATION … never calls Supabase"). Schemas: [`schema.test.ts`](../src/features/inquiries/__tests__/schema.test.ts), [`admin-schema.test.ts`](../src/features/inquiries/__tests__/admin-schema.test.ts). El `[id]` del detalle se valida como UUID antes de consultar (`src/app/admin/(protected)/consultas/[id]/page.tsx`). | ✅ |
| NFR-SEC-02 | `requireStaff()` en cada página y action del admin | [`panel-authorization.test.ts`](../src/features/auth/__tests__/panel-authorization.test.ts) (estructura), [`dal.test.ts`](../src/features/auth/__tests__/dal.test.ts) (sin sesión, sin staff, inactivo, Supabase caído: falla cerrado), [`update-inquiry.test.ts`](../src/features/inquiries/__tests__/update-inquiry.test.ts) ("does not even validate the input without access"), e2e "access denied" en [`admin-panel.spec.ts`](../tests/e2e/admin-panel.spec.ts). Manual: MT-09. | ✅ (MT-09 ⏳) |
| NFR-SEC-03 | RLS en todas las tablas, sin acceso por la Data API | [`rls.test.ts`](../prisma/__tests__/rls.test.ts) (toda tabla de una migración tiene RLS, incluida `_prisma_migrations`; nunca se desactiva). Catálogo de Postgres revisado en F3-01 (TESTING, MT-23). Con la clave pública contra la API: MT-23 en dev, 27/11/2026 (lecturas `[]`, insert rechazado con `42501`). Prod en F5-08. | ✅ (prod ⏳) |
| NFR-SEC-04 | Headers de seguridad | [`security-headers.test.ts`](../src/lib/__tests__/security-headers.test.ts), e2e en [`security-headers.spec.ts`](../tests/e2e/security-headers.spec.ts). Preview verificado en MT-28 (26/11/2026). | ✅ |
| NFR-SEC-05 | CSP aplicada | F5-01, [ADR 0016](adr/0016-csp-aplicada-con-unsafe-inline.md). E2E sin violaciones en todas las páginas, el envío y el panel. MT-28 en el preview ✅; producción en F5-08. | ✅ (prod ⏳) |
| NFR-SEC-06 | Sin PII en logs; IP solo como HMAC | [`logger.test.ts`](../src/lib/__tests__/logger.test.ts) (allowlist de claves, solo el nombre del error), [`ip.test.ts`](../src/lib/__tests__/ip.test.ts) (HMAC con sal), "never logs personal data in any branch" en [`submit-inquiry.test.ts`](../src/features/inquiries/__tests__/submit-inquiry.test.ts), "never writes the email, the password or the IP to the logs" en [`sign-in.test.ts`](../src/features/auth/__tests__/sign-in.test.ts), notas en [`update-inquiry.test.ts`](../src/features/inquiries/__tests__/update-inquiry.test.ts). Las claves del rate limit también son hashes (§8.2). | ✅ |
| NFR-SEC-07 | Cookies httpOnly, Secure y SameSite=Lax | [`cookie-options.test.ts`](../src/lib/supabase/__tests__/cookie-options.test.ts), [`session.test.ts`](../src/lib/supabase/__tests__/session.test.ts). Sin cliente de Supabase en el navegador ([ADR 0014](adr/0014-auth-supabase-ssr-solo-servidor.md)). | ✅ |
| NFR-SEC-08 | Dependabot y `npm audit` en CI | [`dependabot.yml`](../.github/dependabot.yml) (npm y Actions, semanal), CI con `npm audit --omit=dev --audit-level=high` bloqueante ([ADR 0008](adr/0008-politica-de-npm-audit-en-ci.md)). Al 26/11/2026: `npm audit --omit=dev` da 0; la alerta moderada de `minimatch` (vía la CLI de `shadcn`, solo desarrollo) se corrige en este PR subiendo `shadcn` a 4.23.1, y `npm audit` completo da 0. | ✅ |
| NFR-SEC-09 | Secretos solo en Vercel y `.env.local` | `.gitignore` excluye `.env*` salvo `.env.example`; [`env.example.test.ts`](../src/lib/__tests__/env.example.test.ts); `server-only` en `env.ts` y en todo módulo con secretos o DB (12 módulos); regla de ESLint contra `process.env` suelto. Que ningún secreto tenga `NEXT_PUBLIC_` en Vercel: MT-29. | ✅ (MT-29 ⏳) |
| NFR-SEC-10 | Registro público deshabilitado; contraseña ≥ 12 | Configuración de Supabase Auth: MT-24 (dev ⏳, prod en F5-08). | ⏳ |

## Amenazas y mitigaciones (SPEC §10.2)

| Amenaza | Mitigación | Evidencia | Estado |
| --- | --- | --- | --- |
| Bots y spam en el formulario | Honeypot → rate limit (IP y email) → validación → Turnstile (FR-06) | [`submit-inquiry.test.ts`](../src/features/inquiries/__tests__/submit-inquiry.test.ts): honeypot ("answers a fake success and stores, checks and sends nothing"), sexta consulta por IP, cuarta por email, orden rate limit antes de validación, Turnstile inválido o caído. [`turnstile-verifier.test.ts`](../src/lib/adapters/__tests__/turnstile-verifier.test.ts): token de otro hostname rechazado, token largo, timeout. E2E con Turnstile en [`inquiry-submit.spec.ts`](../tests/e2e/inquiry-submit.spec.ts). Manual: MT-04, MT-05. | ✅ (MT-04/05 ⏳) |
| Uso del acuse para mandar mails a terceros | Turnstile + rate limit por email; el acuse solo lleva el nombre | [`emails.test.tsx`](../src/features/inquiries/__tests__/emails.test.tsx) (acuse con nombre, referencia y firma neutra; ningún área), [`notifications.test.ts`](../src/features/inquiries/__tests__/notifications.test.ts) ("sends no receipt when the email is not private"), rate limit por email en `submit-inquiry.test.ts`. | ✅ |
| Inyección SQL | Prisma parametrizado | Las dos consultas crudas son `$queryRaw` con template ([`auth/repository.ts`](../src/features/auth/repository.ts)); la búsqueda escapa `%` y `_` ([`escape-like.test.ts`](../src/features/inquiries/__tests__/escape-like.test.ts)). Regla de ESLint nueva + su test. | ✅ |
| XSS | Escape de React; sin HTML crudo salvo JSON-LD seguro; CSP | [`json-ld.test.tsx`](../src/lib/seo/__tests__/json-ld.test.tsx) (no puede cerrar el `<script>`, escapa U+2028/2029), "escapes the name in the HTML" en `emails.test.tsx`, regla de ESLint nueva, CSP aplicada (F5-01). | ✅ (ver residual R1) |
| CSRF en actions | Chequeo de origen de Next + cookies SameSite=Lax | E2E nuevo [`csrf.spec.ts`](../tests/e2e/csrf.spec.ts): la action de login repetida desde `https://otro-sitio.example` se rechaza ("Invalid Server Actions request", sin ejecutarse) y la misma desde el origen propio se ejecuta (control). Cookies: `cookie-options.test.ts`. | ✅ (ver residual R2) |
| Acceso al panel sin permiso | Proxy + `requireStaff()` en layout, páginas y actions + allowlist `StaffMember` | Ver NFR-SEC-02. Proxy: [`session.test.ts`](../src/lib/supabase/__tests__/session.test.ts), [`admin-redirect.spec.ts`](../tests/e2e/admin-redirect.spec.ts) ("a forged session cookie does not open the panel"). Manual: MT-08, MT-09. | ✅ (MT-08/09 ⏳) |
| Redirect abierto con `?next=` | `safeNextPath` en proxy, login y `signIn` | [`safe-next-path.test.ts`](../src/lib/__tests__/safe-next-path.test.ts), "does not let next skip any check" en `sign-in.test.ts`, e2e "ignores a next outside the panel" en [`admin-login.spec.ts`](../tests/e2e/admin-login.spec.ts). Manual: MT-27 paso 5. | ✅ (MT-27 ⏳) |
| Lectura directa de la DB vía Supabase API | RLS sin políticas; ninguna función `SECURITY DEFINER` ejecutable por los roles de la API (H4) | Ver NFR-SEC-03. MT-23 en dev, 27/11/2026. | ✅ (prod ⏳) |
| Fuerza bruta en el login | Rate limit + mensajes genéricos + protección de Supabase | `sign-in.test.ts`: 5 intentos por IP cada 15 min, también los malformados; email desconocido igual que contraseña incorrecta; rate limit propio de Supabase mapeado. Contraseña ≥ 12: MT-24. | ✅ (ver residual R4) |
| Fuga de datos por mail | Aviso al estudio sin el mensaje; link al panel | "never includes the message" en `emails.test.tsx` ([ADR 0005](adr/0005-mails-despues-de-responder.md)). Manual: MT-06. | ✅ |
| Acuse leído por otra persona | Sin acuse si el email no es privado; textos neutros | `notifications.test.ts`, `emails.test.tsx` (sin área ni especialidad en ninguna de las áreas). Riesgo residual del nombre y el dominio del estudio, ya aceptado en SPEC §10.2. | ✅ ⚠️ |
| Acceso directo a la base (dashboard, backup, export, credencial filtrada) | Mensaje y notas cifrados con una clave que no está en la base ([ADR 0017](adr/0017-cifrado-de-campos-a-nivel-de-aplicacion.md)) | [`aes-gcm-field-cipher.test.ts`](../src/lib/adapters/__tests__/aes-gcm-field-cipher.test.ts) (ida y vuelta, IV aleatorio, otra fila o columna, alteración, rotación), [`repository.db.test.ts`](../src/features/inquiries/__tests__/repository.db.test.ts) (en la base queda `enc:v1:…`; un valor en claro, de otra fila o de otra clave da `decrypt_failed`), [`detail.db.test.ts`](../src/features/inquiries/__tests__/detail.db.test.ts) (notas), e2e `inquiry-submit.spec.ts` (`messageIsEncrypted`) y `admin-panel.spec.ts` (el detalle muestra el texto). Manual: MT-30. | ✅ (MT-30 ⏳) ⚠️ R8 |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` | Ahora aplicado (F5-01): `security-headers.test.ts` y `security-headers.spec.ts`. | ✅ |
| Secretos filtrados | `server-only`, env público/privado, revisión en PR | Ver NFR-SEC-09. | ✅ |

## Lista de auditoría de Next.js 16

La guía de seguridad de datos de Next ("Auditing") pide revisar estos puntos:

| Punto | Resultado |
| --- | --- |
| Capa de acceso a datos aislada | Prisma solo en `repository.ts` y `lib/db.ts`; `env` y DB con `server-only`; regla de ESLint contra `process.env` suelto. ✅ |
| Archivos `"use client"` | 18 archivos: páginas de error (no muestran el mensaje del error, `error-pages.test.tsx`), menú y navegación, 5 componentes de shadcn, el login y los formularios. Ninguno recibe datos de la base salvo los del panel, que reciben lo mínimo: `StatusForm` (`id`, `status`) y `NotesForm` (`id`, `notes`). ✅ |
| Archivos `"use server"` | 2 archivos, 5 actions, todas clasificadas en `panel-authorization.test.ts`. Validan con Zod, re-autorizan (las del panel) y devuelven solo lo necesario: nunca el token de Turnstile ni el honeypot ("never gives back the Turnstile token nor the honeypot"), nunca la contraseña. ✅ |
| Parámetros de ruta (`[slug]`, `[id]`) | `[slug]` sale de `generateStaticParams` (desconocido = 404, [ADR 0009](adr/0009-rutas-dinamicas-estaticas-con-cache-components.md)); `[id]` se valida como UUID. ✅ |
| `proxy.ts` y rutas de API | `proxy.ts` solo en `/admin/:path*`, como primera barrera; nunca es la única (ADR-0014/0015). No hay `route.ts` propias. ✅ |

## Hallazgos

| # | Hallazgo | Severidad | Acción |
| --- | --- | --- | --- |
| H1 | El mensaje de la consulta (`Inquiry.message`) y las notas internas (`internalNotes`) estaban en claro en la base. Pueden contener datos de violencia, menores o salud. Quien accede al dashboard de Supabase, a un backup o a un export los leía. | Media | **Resuelto** en el PR 2 de F5-02: AES-256-GCM a nivel de aplicación ([ADR 0017](adr/0017-cifrado-de-campos-a-nivel-de-aplicacion.md)), migración a `text` y `npm run inquiries:encrypt` para las filas existentes. No es extremo a extremo: protege de quien accede a la base sin la clave, no de un servidor comprometido ni de una sesión de staff robada. |
| H2 | Alerta moderada de Dependabot en `minimatch` (dependencia de la CLI de `shadcn`, solo desarrollo). | Baja | Corregido en este PR: `shadcn` 4.23.1. |
| H3 | Las convenciones de seguridad (sin SQL crudo inseguro, sin HTML crudo, sin `process.env` suelto, `requireStaff()` en cada página) dependían de la revisión manual del PR. | Baja | Corregido en este PR: reglas de ESLint y test estructural. |
| H4 | La función `public.rls_auto_enable()` que crea Supabase (opción "Automatically enable RLS for new tables") es `SECURITY DEFINER`, está en `public` y `anon` y `authenticated` la podían ejecutar por `/rest/v1/rpc/rls_auto_enable` (Security Advisor, lints 0028 y 0029, 27/11/2026). Es un trigger de eventos que solo activa RLS: una llamada directa no debería poder hacer daño, pero no tiene por qué estar expuesta. | Baja | **Corregido:** la migración `20261127120000_revoke_rls_auto_enable` le quita el `EXECUTE` a `PUBLIC`, `anon` y `authenticated`. El trigger `ensure_rls` sigue activo. Verificado en dev con `has_function_privilege` (anon y authenticated: `false`). Test: [`rls.test.ts`](../prisma/__tests__/rls.test.ts). |
| H5 | Supabase Auth no rechaza contraseñas que aparecen en filtraciones conocidas ("Leaked password protection", HaveIBeenPwned; Security Advisor, 27/11/2026). | Baja | **Aceptado (R9):** la opción solo existe en el plan Pro de Supabase y el proyecto usa el gratuito. |

## Riesgos residuales

| # | Riesgo | Por qué se acepta | Revisar |
| --- | --- | --- | --- |
| R1 | `'unsafe-inline'` en `script-src`: la CSP no frena un script inline inyectado. | Los nonces harían dinámicas todas las páginas y el SRI de Next no hashea los inline (probado, [ADR 0016](adr/0016-csp-aplicada-con-unsafe-inline.md)). La defensa contra XSS es el escape de React y la regla contra HTML crudo. | Cuando Next soporte CSP estricta con páginas estáticas. |
| R2 | Next deja pasar una Server Action **sin** header `Origin` (con una advertencia en el log). | Los navegadores siempre mandan `Origin` en un POST, y una petición de otro sitio no lleva las cookies de sesión (SameSite=Lax). Un cliente que no es un navegador no tiene la sesión de nadie. | — |
| R3 | Fuera de Vercel, `x-forwarded-for` se puede falsificar y el límite por IP se esquiva (§8.2). | El deploy es Vercel, que pisa el header. Documentado para quien despliegue en otro lado. | Si cambia el hosting. |
| R4 | Sin segundo factor (MFA) para el staff. Un ataque distribuido desde muchas IPs esquiva el límite por IP. | Contraseña ≥ 12, mensajes genéricos y la protección propia de Supabase. El panel tiene pocos usuarios. | Candidato para clientes reales: Supabase Auth soporta TOTP. |
| R5 | El listado del panel muestra el email de cada consulta. | Pedido del dueño (SPEC v1.28); el panel exige staff activo. | — |
| R6 | Las consultas se guardan sin límite de tiempo hasta F5-05. | La purga de más de 24 meses (NFR-PRIV-01) es la tarea F5-05; la política de privacidad ya la anuncia. | F5-05. |
| R7 | Los backups y exports de Supabase contienen datos personales. | Los maneja el proveedor; el export manual antes de una migración en prod (§14) queda en la máquina de quien lo hace. El mensaje y las notas van cifrados (H1); nombre, email y teléfono no. | F5-08: guardar los exports cifrados y borrarlos después. |
| R8 | Si se pierde `FIELD_ENCRYPTION_KEYS`, los mensajes y las notas cifrados con ella no se pueden recuperar. Y quien tenga la clave **y** la base lee todo. | Es el precio del cifrado (ADR 0017). La clave de cada entorno se guarda en un gestor de contraseñas y en Vercel, nunca en la base ni en el repo. | Al rotar: agregar la nueva adelante, correr el script y recién después sacar la vieja. |
| R9 | Sin chequeo de contraseñas filtradas en Supabase Auth (H5). Un staff podría elegir una contraseña de 12+ caracteres que ya circula en filtraciones. | La opción requiere el plan Pro. Lo mitigan la contraseña ≥ 12, el rate limit del login, los mensajes genéricos y que el panel tiene pocos usuarios, dados de alta a mano. | Al pasar a un cliente real con plan Pro: activarla en Authentication → Providers → Email. |

## Pendiente para cerrar la revisión

1. ~~**MT-23** en dev~~: hecho el 27/11/2026.
2. **MT-24** en dev: registro deshabilitado y contraseña mínima en Supabase Auth.
3. **MT-29** (nuevo): configuración de Supabase, Vercel y GitHub.
4. MT-04, MT-05, MT-08, MT-09 y MT-27 (cierre de F3 y F4), que también son evidencia de esta revisión.
5. **MT-30** en dev: el mensaje y las notas cifrados en la base (segundo PR de F5-02).

En producción, MT-23, MT-24, MT-25, MT-28 (paso 6) y MT-29 se repiten en F5-08.
