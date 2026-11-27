# Tests

Cómo correr los tests automáticos, qué cubre cada nivel y la guía de **tests manuales** (casos MT-xx). Estrategia completa en [`SPEC.md`](SPEC.md) §13.

## Cómo correrlos

| Comando                 | Qué corre                                                                  |
| ----------------------- | -------------------------------------------------------------------------- |
| `npm run test`          | Unitarios y de componentes (Vitest), una corrida                           |
| `npm run test:watch`    | Vitest en modo watch, mientras desarrollás                                 |
| `npm run test:coverage` | Vitest con cobertura; reporte HTML en `coverage/index.html`                |
| `npm run test:e2e`      | E2E con Playwright (Chromium) contra el **build de producción**            |
| `npm run test:db`       | Integración contra la base de **dev** (Vitest, proyecto `db`)              |

Vitest tiene dos proyectos en `vitest.config.mts`:

- **`unit`** (`npm run test`, la CI): todo `*.test.ts(x)` salvo `*.db.test.ts`. Sin red ni base.
- **`db`** (`npm run test:db`): solo `*.db.test.ts`. Carga `.env.local` (`tests/setup/load-db-env.ts`), crea filas con el nombre empezando por `E2E-` y las borra al final. Cifra con una clave aleatoria propia de la corrida (`test-field-cipher.ts`), no con la de `.env.local`: solo lee lo que escribe. **Nunca corre el recifrado completo**: cifraría tus filas de dev con una clave descartable.
  - **Antes de correrlo, confirmá que `DATABASE_URL` de `.env.local` sea la de Supabase dev.** Se niega a correr con `VERCEL_ENV=production`, pero no puede saber a qué proyecto apunta la URL.
  - No corre en la CI todavía (F5-06). Corrélo antes de abrir un PR que toque un repository.
  - `npx vitest run` sin `--project` corre los dos: preferí los scripts de npm.

Antes del primer e2e: `npx playwright install chromium`.

Detalles de los e2e:

- Playwright hace `npm run build && npm run start` y espera a `http://localhost:3000`. **Nunca reusa un servidor abierto:** si el puerto 3000 está ocupado (por ejemplo, por tu `npm run dev`), la corrida falla enseguida con "http://localhost:3000 is already used". Cerralo y volvé a correr. Así siempre se aplican las variables que fija la config: el modo demo prendido y el aviso al estudio dirigido a la dirección de prueba de Resend.
- Necesita las variables de `.env.local`, las mismas que `npm run dev`.
- **El log del servidor** de los e2e queda en `e2e-server.log` (fuera de git). Si un e2e falla del lado del servidor, buscá ahí el error.
- **`admin-panel.spec.ts`, el panel con sesión** (F4-07):
  - **Preparación, una sola vez:**
    1. En Supabase **dev**, creá un usuario: Authentication → Users → Add user, con "Auto Confirm User" y una contraseña de 12 caracteres o más.
    2. Cargá `E2E_STAFF_EMAIL` y `E2E_STAFF_PASSWORD` en `.env.local` (ver `.env.example`). No van a Vercel ni a `env.schema.ts`.

    No hace falta `staff:add`: el spec da de alta a ese usuario como staff activo, con el nombre `E2E-Staff`, y lo reactiva si una corrida anterior se cortó. Sin las variables, el spec se saltea con su motivo.
  - **Qué cubre**, en serie, porque comparten el usuario:
    - login, nombre en la barra y logout;
    - listado de la más nueva a la más vieja, filtros en la URL, recarga y "No iniciar contacto";
    - detalle con cambio de estado, notas guardadas después de recargar e historial con el actor y sin el texto de las notas;
    - del link del mail al detalle, pasando por el login (F4-06);
    - al abrir una consulta, "Cargando la consulta…" aparece enseguida y después el detalle (demora a propósito la respuesta del servidor);
    - acceso denegado, con el staff desactivado un momento y reactivado siempre;
    - axe en el listado y en el detalle;
    - ninguna violación de la CSP en el login, el listado, el detalle y sus acciones (F5-01).
  - **Datos:** inserta 3 consultas `E2E-<corrida>-…` por SQL (no gasta Turnstile, mails ni rate limit), con el mensaje cifrado con `FIELD_ENCRYPTION_KEYS` de `.env.local`, igual que la app; el detalle verifica que se muestre legible y las borra al terminar. También borra las `E2E-` de más de un día. Cada escenario manda su propia IP de documentación en `x-forwarded-for`.
  - **Log limpio:** el último test revisa que `e2e-server.log` no tenga "while prerendering" ni `auth.user_check_unavailable`. Es la regresión del 26/11/2026: si alguien saca el `connection()` del DAL, la pantalla sigue andando y solo este test se entera (lo comprobé quitándolo: falla con 25 líneas).
- **`security-headers.spec.ts`, la CSP aplicada** (F5-01): verifica que el header sea `Content-Security-Policy` (no el report-only) y recorre todas las páginas públicas, una 404 y `/admin/login` sin una sola violación. Las violaciones se juntan con `tests/e2e/support/csp.ts` (el evento `securitypolicyviolation` y la consola); el envío con Turnstile y el panel con sesión usan el mismo helper.
- **`csrf.spec.ts`** (F5-02, SPEC §10.2): captura el POST real de la action de login y lo repite desde `https://otro-sitio.example` (Next lo rechaza: "Invalid Server Actions request" en `e2e-server.log`) y desde el origen propio (control: la action corre y responde el error genérico). Consulta a Supabase dev con una cuenta que no existe y cuenta un intento del rate limit, con una IP de documentación propia.
- **`inquiry-submit.spec.ts` envía consultas reales** (F3-08):
  - **Base:** usa la de `.env.local`, que tiene que ser **Supabase dev**. Escribe filas con `e2e-<corrida>-` en el email (`delivered+e2e-…@resend.dev`; el mensaje va cifrado y no se puede buscar) y las borra al final, aunque el test falle. También borra las filas `E2E-` de más de un día, que quedan si una corrida se corta.
  - **Mails:** van a las direcciones de prueba de Resend (`delivered+…@resend.dev`), que simulan una entrega sin llegar a ninguna casilla. Cuentan para la cuota de Resend.
  - **Turnstile:** necesita la clave de prueba que aprueba sola (`1x00000000000000000000AA`). Con otra clave, o sin `DATABASE_URL`, los dos escenarios se saltean con su motivo: nunca resuelven un desafío real.
  - Cubre: llegar desde un área con el área preseleccionada, los dos pasos, Turnstile, la confirmación con y sin medio seguro, lo guardado en la base (con su evento `CREATED`) y que no haya violaciones de la CSP.
- **`admin-login.spec.ts`** (F4-03, F4-06): `next` en el formulario (y conservado después de un error) e ignorado si es externo; la página de login con `noindex`, sin violaciones de axe ni de la CSP, el orden de teclado, el aviso de `?error=forbidden` y credenciales incorrectas (mensaje genérico con foco, email conservado). Ese último escenario **consulta a Supabase dev** con una cuenta que no existe, y cuenta un intento del rate limit con una IP de documentación propia de la corrida. El login exitoso lo cubre `admin-panel.spec.ts`.
- **`admin-redirect.spec.ts`** (F4-01, F4-02, F4-06): sin sesión o con una cookie de sesión falsificada, `/admin` y `/admin/consultas/…` responden 307 a `/admin/login`, con `?next=` para volver a la página pedida; el login no se redirige, y `/contacto` no recibe cookies de sesión. No inicia sesión ni toca Supabase Auth: alcanza con que las dos variables de Supabase estén definidas.
- Reporte HTML de la última corrida: `npx playwright show-report`.
- Correr un archivo o un test: `npx playwright test tests/e2e/layout.spec.ts` o `-g "nombre del test"`.

## Niveles y qué cubren

| Nivel       | Herramienta                  | Dónde                                        | Qué cubre hoy                                                                                     |
| ----------- | ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Unit        | Vitest                       | `src/**/__tests__/*.test.ts`, `prisma/__tests__/` | Schemas de env, `.env.example`, `ActionResult`, logger sin PII, headers y CSP, WhatsApp, `site.config`, contraste de tokens, contenido y reglas éticas, SEO (JSON-LD, metadata, sitemap, robots), cliente Prisma (`db.ts`) y RLS en las migraciones, schemas de consultas, regla de medio seguro, referencia y service con un repository falso (`src/features/inquiries`), adapters de Resend, Turnstile y Upstash (sin red), fakes y contrato del rate limiter, reglas de seguridad de ESLint y autorización estructural del panel (F5-02) |
| Componentes | Vitest + Testing Library     | `src/**/__tests__/*.test.tsx`                | Páginas públicas y bloques de marketing, header y menú mobile (teclado, `aria-expanded`), footer, banner, skip link, WhatsApp      |
| Action      | Vitest + fakes               | `src/features/inquiries/__tests__/submit-inquiry.test.ts` | `submitInquiry`: OK, VALIDATION, RATE_LIMITED, CAPTCHA_FAILED, honeypot, base y mail caídos, orden de FR-06 y logs sin datos personales |
| Auth        | Vitest + fakes               | `src/features/auth/__tests__/`, `src/lib/supabase/__tests__/` | `signIn`: OK, VALIDATION, mismo UNAUTHORIZED para email inexistente y contraseña incorrecta, rate limit propio (5 en 15 min) y de Supabase, Upstash caído, Supabase caído, logs sin email ni contraseña. `signOut` aunque Supabase falle. Traducción de errores de Supabase. Proxy: redirect sin sesión, sin loop en el login, cookies y headers de no-caché, cookies httpOnly/Secure/Lax |
| Detalle y actions del panel | Vitest + fakes + Testing Library | `src/features/inquiries/__tests__/inquiry-detail-service.test.ts`, `update-inquiry.test.ts`, `panel-actions.test.ts`, `components/__tests__/inquiry-detail.test.tsx` | `getInquiry` (sin `ipHash`, plan de contacto, actores), `changeStatus` y `updateNotes` (evento con actor, nada si no cambia, notas fuera del evento). Actions: UNAUTHORIZED, **FORBIDDEN**, INTERNAL antes de validar, VALIDATION, NOT_FOUND, OK, actor de la sesión, `refresh()` solo si cambió, logs sin notas. Detalle: "Cómo contactar" y "No iniciar contacto", sin links `tel:`/`mailto:`/WhatsApp, mensaje con saltos de línea, historial, formularios accesibles y notas conservadas si se rechazan |
| Listado del panel | Vitest + fakes + Testing Library | `src/features/inquiries/__tests__/list-inquiries.test.ts`, `list-href.test.ts`, `escape-like.test.ts`, `components/__tests__/inquiry-list.test.tsx` | Paginación (20, página fuera de rango), filtros y búsqueda hacia el repository, filtros inválidos ignorados, referencia, `doNotContact` con `planContact`, URLs con filtros, tabla (encabezados, hora del estudio, badges, "No iniciar contacto", sin mensaje ni teléfono), filtros (`GET`, labels, valores actuales) y paginación |
| Login (UI)  | Vitest + Testing Library     | `src/features/auth/components/__tests__/`    | `LoginForm`: labels y `autocomplete`, funciona sin JavaScript, error general en `role="alert"` con foco, errores de campo con `aria-describedby`, email conservado y contraseña no, botón pendiente. `LoginSessionCheck`: redirect del staff a `/admin`, aviso de `?error=forbidden` sin detalles |
| Autorización | Vitest + fakes              | `src/features/auth/__tests__/access.test.ts`, `dal.test.ts`, `staff-service.test.ts`, `staff-add-args.test.ts` | `requireStaff()`: sin sesión, sesión sin staff, staff inactivo, staff OK, Supabase y base caídos (falla cerrado), redirects de páginas y `ActionResult` de actions, logs sin datos personales. `staff:add`: usuario inexistente, alta, reactivación idempotente y argumentos |
| Integración | Vitest (proyecto `db`)       | `src/**/__tests__/*.db.test.ts`              | Repositories contra Supabase dev: consulta + evento `CREATED`, nulls y error de la base; detalle (`detail.db.test.ts`: estado y notas con su evento en una transacción, `fromStatus` real, nada si no cambia, actor que ya no existe); listado (`list.db.test.ts`: orden, cada filtro, búsqueda sin distinguir mayúsculas en nombre y email, `%` como texto, paginación y campos del `select`); staff (alta, búsqueda, reactivación, error de unicidad) y lectura de `auth.users` |
| E2E         | Playwright + axe             | `tests/e2e/*.spec.ts`                        | Letra del navegador al 125 %, 150 % y 200 % (F5-03), axe con cualquier impacto en las páginas, en los estados del formulario y en el panel, Turnstile cargado recién en el paso 2, smoke del inicio, headers de seguridad, CSP sin violaciones, layout, teclado, menú mobile, accesibilidad (axe), navegación de las páginas públicas, 404, SEO, calidad (contraste del foco, primera pantalla, áreas táctiles), envío completo de una consulta contra los servicios de dev, y el panel con sesión: login, filtros, estado, notas, historial, link del mail y acceso denegado (F4-07) |
| Manual      | Esta guía                    | Sección "Guía de tests manuales"             | Lo que conviene mirar con ojos humanos o en dispositivos reales                                   |

Próxima fase (F5): e2e en la CI (F5-06), Lighthouse y accesibilidad (F5-03) y la guía de tests manuales completa (F5-07).

### Convenciones

- Los tests viven junto al código, en una carpeta `__tests__/` (unit y componentes) o en `tests/e2e/` (e2e).
- Nombres de tests en inglés; textos esperados de interfaz en español, tal como los ve el usuario.
- Preferí consultas por rol y nombre accesible (`getByRole("button", { name: "Menú" })`): si un test no encuentra un elemento así, probablemente un lector de pantalla tampoco.
- Un bug arreglado = un test que lo reproduce.
- Cobertura objetivo: 80% en `src/features/**` (services, schemas y actions), a medida que existan.
- Vitest no carga `.env.local`: `vitest.config.mts` fija valores públicos de prueba (`NEXT_PUBLIC_SITE_URL` y modo demo prendido) y, **solo en el proyecto `unit`**, valores ficticios para las variables obligatorias desde F3-05 y F4-01 (nada se conecta a ellos). Nunca pongas secretos ahí; para otro valor, usá `vi.stubEnv`.
- En tests, `server-only` se reemplaza por un módulo vacío (`tests/stubs/server-only.ts`).
- **Servicios externos:** los tests nunca llaman a Resend, Turnstile, Upstash ni Supabase Auth. Los services y las actions usan los fakes de `src/lib/ports/fakes` (`FakeEmailSender`, `FakeCaptchaVerifier`, `FakeRateLimiter`, `FakeAuthGateway`, `FixedClock`); los adapters se testean con clientes y `fetch` simulados. Las claves del rate limit en los tests tienen que ser hashes de 64 caracteres (por ejemplo `"a".repeat(64)`).

### Cuando falla un test "especial"

- **`design-tokens.test.ts`:** un par de colores de `globals.css` no llega al contraste WCAG AA (texto 4.5:1; foco y bordes de campos 3:1). Ajustá el color, no el umbral.
- **"without CSP violations"** (`security-headers.spec.ts`, y el chequeo de CSP de `inquiry-submit`, `admin-login` y `admin-panel`): la CSP **aplicada** bloqueó algo, así que en producción eso tampoco anda. El mensaje dice la directiva y la URL bloqueada (`event: script-src blocked https://…`). Decidí si el origen se agrega a la política en `src/lib/security/headers.ts`, con su test en `security-headers.test.ts` y una línea en la [ADR 0016](adr/0016-csp-aplicada-con-unsafe-inline.md), o se quita el recurso. Nunca saques la página del recorrido para que pase.
- **`layout.spec.ts` → axe:** el mensaje lista la regla (por ejemplo `color-contrast`, `label`); la ayuda de cada regla está en <https://dequeuniversity.com/rules/axe/>.
- **`quality.spec.ts`:** cubre lo que axe no ve. Si falla el foco, el anillo no llega a 3:1 sobre su fondo (típico: fondo primario, redefiní `--ring`). Si falla "uncovered", algo tapa el texto o el botón (típico: el botón de WhatsApp) o ya no entra en la primera pantalla. Al agregar una página, sumala a `PAGES`. Si falla "sticky index", un índice fijo quedó más alto que la ventana y no scrollea. Si falla "125%", "150%" o "200%", algo no achica ni parte línea con la letra del navegador agrandada (típicos: un botón o un link con `whitespace-nowrap`, un `<fieldset>` o una columna de grilla que no baja de su palabra más larga). El 200 % se prueba desde 768 px: en un celular, WCAG 1.4.4 se cumple con el zoom del navegador. Si falla "305px", algo no entra en un celular chico o con scrollbar clásico. Si falla "does not move the page", alguien puso `scroll-padding` en `html`: usá `scroll-margin`.
- **`env.example.test.ts`:** agregaste o sacaste una variable del schema y no actualizaste `.env.example` (o al revés).
- **`eslint-security.test.ts`:** una regla de seguridad de `eslint.config.mjs` dejó de disparar o bloquea algo permitido. Si `npm run lint` te marca `no-restricted-syntax` o `no-restricted-properties`, no la desactives con un comentario: usá `$queryRaw` con template, `<JsonLd>` o `env` de `src/lib/env.ts`. Ver [`SECURITY_REVIEW.md`](SECURITY_REVIEW.md).
- **`panel-authorization.test.ts`:** agregaste una página en `app/admin/(protected)` sin `await requireStaff()`, una página de `/admin` fuera de `(protected)`, o una Server Action nueva. Si es una action, clasificala en `PUBLIC_ACTIONS` o `PANEL_ACTIONS`; las del panel empiezan con `requireStaffForAction()` (ADR-0015).
- **`csrf.spec.ts`:** si el pedido desde otro origen **no** se rechaza, Next cambió su chequeo de origen o alguien agregó `serverActions.allowedOrigins`: es un problema de seguridad, no un test frágil. Si falla el control (el pedido propio), mirá `e2e-server.log` y el rate limit de login.
- **`prisma/__tests__/rls.test.ts`:** agregaste un modelo o una tabla sin activarle RLS. Sumá `ALTER TABLE "<tabla>" ENABLE ROW LEVEL SECURITY;` en su migración (README → Base de datos). Nunca lo desactives.
- **`schema.test.ts` → "still reports the channel rules when … is invalid":** un campo del schema quedó "abortado" (`pipe`, `abort: true` o `z.stringbool`) y Zod dejó de correr las reglas que dependen del canal. Validá ese campo con una sola regla (`refine`) en lugar de encadenar varias.
- **`contact-safety.test.ts`:** la tabla es la definición de US-03 CA6 y CA7. Si falla, la que está mal es la regla, no la tabla, salvo que cambie el SPEC.
- **`port-contracts.test.ts`:** el fake y el adapter real del rate limiter se comportan distinto. Corregí el que no cumpla el contrato del port; no relajes el test.
- **`turnstile-verifier.test.ts` → hostname:** si cambiaste a claves reales de Turnstile, el hostname esperado sale de `NEXT_PUBLIC_SITE_URL`; con las de prueba es `example.com`.
- **`emails.test.tsx` → "never reveals the reason":** alguien agregó al acuse un dato que delata el motivo de la consulta (el área, la urgencia, la especialidad, un link o el nombre completo del estudio). Sacalo: el acuse tiene que ser neutro (US-03 CA5). No relajes el test.
- **`site-config.test.ts` → "keeps shortName neutral":** el nombre corto del estudio incluye la especialidad, y ese nombre firma el acuse. Elegí un nombre corto sin la especialidad.
- **`inquiry-submit.spec.ts`:** si se saltea, mirá el motivo (falta `DATABASE_URL` o la clave de Turnstile no es la de prueba). Si falla esperando el token de Turnstile, revisá la conexión a `challenges.cloudflare.com`. Si falla en la confirmación, mirá el snapshot del error (`test-results/…/error-context.md`): el resumen de errores dice qué respondió la action. Cada escenario manda su propia IP de documentación (`2001:db8:…`) en `x-forwarded-for`, así no comparte el rate limit con otras corridas ni con tus pruebas a mano; si ves "Hiciste demasiados intentos seguidos", revisá que eso siga así. Si queda alguna fila `E2E-`, la próxima corrida la borra cuando tenga más de un día, o borrala desde el Table Editor de Supabase dev.
- **`features/auth/__tests__/repository.db.test.ts` → "can read auth.users":** si da "permission denied", Supabase le quitó a `postgres` la lectura de `auth.users` y `staff:add` no puede buscar usuarios. Mirá el plan B en ADR-0015 (`--auth-user-id`). Si queda alguna fila `E2E-` en `staff_members`, borrala desde el Table Editor de dev.
- **`admin-panel.spec.ts`:**
  - **Si se saltea,** faltan `E2E_STAFF_EMAIL` o `E2E_STAFF_PASSWORD` en `.env.local`.
  - **Si falla en `beforeAll` con "no existe en Supabase Auth",** el usuario de prueba se borró en dev: crealo de nuevo.
  - **Si falla el login,** revisá la contraseña, o si el rate limit te frenó: cada escenario usa su IP, pero 5 corridas seguidas en 15 minutos con la misma IP lo agotan.
  - **Si falla "no prerender errors",** buscá en `e2e-server.log` la ruta y el error. Casi seguro es código del panel que lee la sesión o la hora antes de `connection()`.
  - **Si una corrida se corta,** el usuario puede quedar inactivo: la próxima lo reactiva al empezar. Las consultas `E2E-` se borran cuando tienen más de un día.
- **`safe-next-path.test.ts`:** si un caso de la tabla de ataques empieza a pasar, el login quedó como redirect abierto: corregí `safeNextPath`, nunca la tabla (SPEC §10.2).
- **`access.test.ts` o `dal.test.ts`:** si un caso que debería ser `forbidden` o `unauthenticated` pasa como `ok`, es un agujero de seguridad: corregí el código, nunca el test (NFR-SEC-02).
- **`repository.db.test.ts`:** si falla al conectar, revisá `DATABASE_URL` (y que las migraciones estén aplicadas: `npx prisma migrate status`). Si queda alguna fila `E2E-` en `inquiries`, borrala desde el Table Editor de Supabase dev.
- **`sign-in.test.ts` → "same answer" o "never writes":** el login empezó a distinguir un email inexistente de una contraseña incorrecta, o a loguear el email o la contraseña. Las dos cosas están prohibidas (SPEC §6.5, NFR-SEC-06): corregí el código, no el test.
- **`session.test.ts` o `admin-redirect.spec.ts`:** si `/admin` deja de redirigir, revisá que `src/proxy.ts` siga en `src/` (en la raíz Next no lo ejecuta) y que su `matcher` incluya `/admin/:path*`. Si `/contacto` recibe cookies `sb-`, el matcher se amplió de más (ADR-0014).
- **`enums.test.ts`:** cambiaste un enum en `prisma/schema.prisma` y no en `src/features/inquiries/types.ts` (o al revés), o un área de `practice-areas.ts` no existe en el enum.
- **`db.test.ts` y `db-tls.test.ts`:** corren en entorno `node` (Prisma no funciona en jsdom) y no se conectan a nada. Si fallan al importar `@/generated/prisma/client`, corré `npm run db:generate`. Si falla "is a PEM certificate", falta `prisma/certs/supabase-ca.crt` o alguien puso ahí otra cosa (nunca una clave privada).

## En la CI

La CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) corre en cada PR y push a `main`: lint → typecheck → format:check → **test** → build → audit. Los **e2e no corren en la CI todavía** (tarea F5-06): corrélos en local antes de abrir un PR que toque la interfaz.

## Guía de tests manuales

Los tests manuales cubren lo que la automatización no ve bien: cómo se siente el sitio en un celular real, si se entiende, si funciona con el teclado de punta a punta. Se ejecutan antes de cerrar cada fase y antes del lanzamiento.

### Cómo registrar una ejecución

Al final de cada caso hay una tabla. Agregá una fila por ejecución con la fecha, el entorno (local, preview con su URL o producción; navegador y dispositivo), el resultado (✅ pasa / ❌ falla) y notas. Si falla, abrí un issue o una tarea con el detalle y el link a la fila.

### Ejecuciones pendientes

Casos que no se pudieron correr al cerrar su tarea porque faltaba algo. Cuando se cumple la condición, se ejecutan, se registra el resultado en su tabla y se saca la fila de acá.

| Caso  | Qué falta correr                                     | Cuándo                                                                                                             | Por qué quedó pendiente                                         |
| ----- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| MT-23 | El caso completo en **prod** | En **F5-08**, después de `db:deploy`. | Dev se ejecutó el 27/11/2026 (pasos 2 a 6); prod se verifica en el lanzamiento. |
| MT-24 | El caso en **prod** | En **F5-08**. | En F4-01 se configura y verifica dev; prod se verifica antes del lanzamiento. |
| MT-25 | El caso en **prod** | En **F5-08**, después de `db:deploy`. | En F4-02 se da de alta el staff de dev; el de prod, antes del lanzamiento. |
| MT-07 y MT-09 | El caso completo en **dev** | En **F4-03** (y de nuevo en el cierre, F4-08). Antes, MT-25 con tu usuario. | Necesitaban la página de login, que llega en F4-03. |
| MT-30 | El caso en **prod** | En **F5-08**, después de `db:deploy` y con la clave de prod cargada. | En F5-02 se verifica dev; prod se verifica en el lanzamiento. |
| MT-29 | El caso en **prod** | En **F5-08**. | En F5-02 se revisa dev y el proyecto de Vercel; prod se revisa en el lanzamiento. |
| MT-28 | El paso 6 en **producción** (el header sin `vercel.live`) | En **F5-08**, con el dominio de la demo. | En F5-01 se probó el preview; producción se verifica en el lanzamiento. |

### Plantilla

```markdown
### MT-XX — Título

- **Objetivo:** qué se quiere comprobar y por qué importa.
- **Requisitos:** IDs del SPEC (US-xx, FR-xx, NFR-xx).
- **Precondiciones:** entorno, datos, configuración.

**Pasos**

1. …
2. …

**Resultado esperado**

- …

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |
```

### Índice de casos

| ID    | Caso                                                    | Se detalla en | Estado        |
| ----- | ------------------------------------------------------- | ------------- | ------------- |
| MT-01 | Navegar todas las páginas en un celular real            | F2-08         | **Detallado** |
| MT-02 | Enviar una consulta completa                            | F3-07         | **Detallado** · se ejecuta en F3-09 |
| MT-03 | Errores de validación de cada campo                     | F3-02         | **Detallado** · se ejecuta en F3-09 |
| MT-04 | Exceder el rate limit                                   | F3-05         | **Detallado** · se ejecuta en F3-09 |
| MT-05 | Honeypot completado (no guarda nada)                    | F3-05         | **Detallado** · se ejecuta en F3-09 |
| MT-06 | Mails recibidos: estudio y acuse                        | F3-06         | **Detallado** · se ejecuta en F3-09 |
| MT-07 | Login y logout del admin                                | F4-03         | **Detallado** · se ejecuta en F4-03 y F4-08 |
| MT-08 | Entrar a `/admin` sin sesión                            | F4-01         | **Detallado** · se ejecuta en F4-01 y F4-08 |
| MT-09 | Usuario autenticado que no es staff                     | F4-02         | **Detallado** · se ejecuta en F4-03 y F4-08 |
| MT-10 | Cambio de estado, notas e historial                     | F4-05         | **Detallado** · se ejecuta en F4-05 y F4-08 |
| MT-11 | Navegación completa solo con teclado                    | F1-08         | **Detallado** |
| MT-12 | Lighthouse mobile en todas las páginas públicas         | F2-07, F5-03  | **Detallado** · `npm run lighthouse` |
| MT-13 | Banner de modo demo                                     | F1-08         | **Detallado** |
| MT-14 | Botón de WhatsApp                                       | F1-08         | **Detallado** |
| MT-15 | Error de mail simulado (la consulta se guarda igual)    | F3-05         | **Detallado** · se ejecuta en F3-09 |
| MT-16 | Inicio responsive (360 a 1440 px)                       | F2-02         | **Detallado** |
| MT-17 | Áreas de práctica: navegación, CTA y 404                | F2-03         | **Detallado** |
| MT-18 | Nosotros, Preguntas frecuentes y Privacidad             | F2-04         | **Detallado** |
| MT-19 | Contacto: formulario, canales y mapa                    | F2-05, F3-07  | **Detallado** |
| MT-20 | SEO técnico y datos estructurados                       | F2-06         | **Detallado** |
| MT-21 | Páginas 404 y de error                                  | F2-07         | **Detallado** |
| MT-22 | Ayuda ante peligro y plazos                             | F2-07         | **Detallado** |
| MT-23 | Base de datos: tablas y RLS en Supabase                 | F3-01         | **Detallado** · dev ✅ 27/11/2026, prod en F5-08 |
| MT-24 | Configuración de Supabase Auth (registro y contraseñas) | F4-01         | **Detallado** · dev ✅ 27/11/2026, prod en F5-08 |
| MT-25 | Alta de staff con `npm run staff:add`                   | F4-02         | **Detallado** · dev en F4-02, prod en F5-08 |
| MT-26 | Listado de consultas: orden, filtros, búsqueda y páginas | F4-04        | **Detallado** · se ejecuta en F4-04 y F4-08 |
| MT-27 | Del mail al detalle, pasando por el login                | F4-06         | **Detallado** · se ejecuta en F4-06 y F4-08 |
| MT-28 | CSP aplicada en el preview                               | F5-01         | **Detallado** · se ejecuta en F5-01 (preview) y F5-08 (producción) |
| MT-29 | Configuración de seguridad de los servicios              | F5-02         | **Detallado** · dev ✅ 27/11/2026, prod en F5-08 |
| MT-30 | Mensaje y notas cifrados en la base                      | F5-02         | **Detallado** · dev ✅ 26/11/2026, prod en F5-08 |

### MT-01 — Navegar todas las páginas en un celular real

- **Objetivo:** que todo el sitio público se pueda leer y usar con el dedo, en el navegador y la pantalla que usa quien consulta. Los e2e solo corren en Chromium de escritorio.
- **Requisitos:** FR-01, US-01 CA1, US-04, NFR-A11Y-01, SPEC §11.5.
- **Precondiciones:** un celular real con iOS (Safari) o Android (Chrome); si podés, los dos. URL de producción, o del preview con la sesión de Vercel iniciada. **No completes ninguna llamada a los teléfonos de ayuda.**

**Pasos**

1. Abrí el inicio y, sin scrollear, mirá la primera pantalla.
2. Con el botón **Menú**, entrá a Áreas de práctica, Nosotros, Preguntas frecuentes, Contacto e Inicio. Recorré cada una hasta el footer.
3. Desde Áreas de práctica, entrá a las 5 áreas y recorrelas. En una, tocá "Contanos tu caso".
4. Desde el footer, entrá a Política de privacidad y usá su índice. Hacé lo mismo con el índice de Preguntas frecuentes y abrí una pregunta.
5. En Contacto, tocá el teléfono, el email y el mapa. Volvé atrás sin llamar ni enviar.
6. Abrí una dirección inventada, por ejemplo `/no-existe`.
7. Girá el celular y repetí el inicio, el menú y Contacto.
8. Agrandá el texto del navegador al 150 % (Chrome en Android: Configuración → Accesibilidad; Safari en iPhone: botón "aA") y repetí el inicio, un área y Contacto. Al terminar, volvelo a como estaba.

**Resultado esperado**

- Paso 1: se leen el banner de demo, qué hace el estudio, la frase de confidencialidad y el botón "Contanos tu caso".
- Pasos 2–4: las 11 páginas cargan sin scroll horizontal, texto cortado ni nada tapado. El header queda fijo con WhatsApp visible, y los títulos a los que llevan los índices no quedan debajo de él. El menú se cierra al elegir un link o tocar afuera. "Contanos tu caso" abre Contacto con `?area=<slug>`.
- Paso 5: se abren el marcador, el correo y el mapa, y al volver el sitio sigue igual.
- Paso 6: se ve la 404 en español, con salidas a inicio y contacto.
- Paso 7: nada se corta y el menú entero se alcanza, scrolleando si hace falta.
- Paso 8: no aparece scroll horizontal; el nombre del estudio puede partir en dos líneas, y en celulares chicos el botón "Menú" queda solo con el ícono.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-11 — Navegación completa solo con teclado

- **Objetivo:** que alguien que no usa mouse (o usa un lector de pantalla) pueda recorrer y usar todo el sitio.
- **Requisitos:** NFR-A11Y-01 (WCAG 2.2 AA: teclado, foco visible, link para saltar al contenido).
- **Precondiciones:** sitio abierto en desktop (local con `npm run dev` o el preview). No tocar el mouse durante la prueba.

**Pasos**

1. Recargá la página de inicio y apretá **Tab** una vez.
2. Apretá **Enter**.
3. Seguí apretando **Tab** hasta llegar al final de la página, y después **Shift+Tab** hasta volver al principio.
4. Sobre un link del menú, apretá **Enter**.
5. Achicá la ventana a ancho de celular (o DevTools → modo dispositivo, 375 px), recargá y llegá con **Tab** al botón **Menú**. Apretá **Enter**, recorré los links con **Tab** y apretá **Escape**.

**Resultado esperado**

- Paso 1: aparece arriba a la izquierda el link **"Saltar al contenido"**.
- Paso 2: el foco pasa al contenido principal (el siguiente Tab va al primer elemento del contenido, no al menú).
- Paso 3: el foco **siempre se ve** (contorno verde azulado; claro sobre la franja verde del cierre) y nunca queda debajo del header. Con Tab pasa por el contenido, el footer (teléfonos de ayuda, mapa, teléfono, email, política de privacidad) y, desde 1380 px, WhatsApp flotante. Con Shift+Tab vuelve por el mismo camino y termina en el header (hasta 1379 px WhatsApp, CTA, menú, nombre del estudio) y "Saltar al contenido". Ningún elemento queda inalcanzable ni atrapa el foco.
- Paso 4: navega a esa página y el menú la marca como actual.
- Paso 5: el menú se abre, sus links se recorren con Tab, y con Escape se cierra y el foco vuelve al botón **Menú**.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-13 — Banner de modo demo

- **Objetivo:** que quede claro que el estudio es ficticio cuando el sitio está en modo demo, y que el banner desaparezca para un estudio real.
- **Requisitos:** FR-15, SPEC §11.4.
- **Precondiciones:** acceso a `.env.local` (local) o a las variables del proyecto en Vercel.

**Pasos**

1. Con `NEXT_PUBLIC_DEMO_MODE=true`, corré `npm run build && npm run start` y abrí `http://localhost:3000`.
2. Revisá el banner en desktop y en ancho de celular (375 px).
3. Cambiá a `NEXT_PUBLIC_DEMO_MODE=false`, repetí el build y abrí el inicio. Después borrá la línea y repetí.
4. Poné un valor inválido (`NEXT_PUBLIC_DEMO_MODE=si`) y corré `npm run build`.
5. Abrí el preview y producción de la demo en Vercel y mirá el código fuente (Ctrl+U).

**Resultado esperado**

- Paso 1–2: arriba de todo se ve "**Sitio de demostración — estudio ficticio.**". Desde 640 px sigue con "Los nombres, matrículas y datos de contacto no son reales."; en celulares se muestra solo la primera oración, sin cortarse.
- Paso 3: con `false` el banner no aparece; sin la línea **sí** aparece, y la página lleva `noindex, nofollow` (ADR-0011).
- Paso 4: el build falla con `NEXT_PUBLIC_DEMO_MODE: debe ser "true" o "false"`.
- Paso 5: los dos muestran el banner y tienen `<meta name="robots" content="noindex, nofollow"/>`.
- Al terminar, volvé a dejar `NEXT_PUBLIC_DEMO_MODE=true`.

> Las `NEXT_PUBLIC_*` se fijan en el build: para ver un cambio hay que volver a hacer `build` (en `dev` alcanza con reiniciar el servidor).

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-14 — Botón de WhatsApp

- **Objetivo:** que quien prefiere WhatsApp pueda escribir al estudio en un toque, sin exponer datos personales.
- **Requisitos:** US-04, FR-13.
- **Precondiciones:** sitio abierto en un **celular real** con WhatsApp instalado y en una computadora.

**Pasos**

1. En el celular, recorré el inicio de arriba a abajo mirando el botón redondo del header. En la computadora, repetí con la ventana a 1280 px y a 1440 px.
2. Tocá el botón.
3. En la computadora, pasá el mouse por el botón y tocalo.
4. Revisá la URL que abre.

**Resultado esperado**

- Paso 1: el botón se ve en toda la página y no tapa ningún texto. Hasta 1379 px va en el header, que queda fijo; desde 1380 px flota abajo a la derecha, fuera de la columna de contenido.
- Paso 2: abre WhatsApp (app) con el mensaje "Hola, quisiera hacer una consulta." precargado. **En la demo el número es ficticio (`+54 9 11 0000-0000`)**: WhatsApp avisa que no existe; eso es lo esperado. No envíes el mensaje.
- Paso 3: abre una pestaña nueva con WhatsApp Web o la página de wa.me.
- Paso 4: la URL es `https://wa.me/5491100000000?text=Hola%2C%20quisiera%20hacer%20una%20consulta.` y **no** contiene datos personales.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-16 — Inicio responsive (360 a 1440 px)

- **Objetivo:** que el inicio se lea cómodo y prolijo en cualquier ancho, de un celular chico a un monitor.
- **Requisitos:** US-01, NFR-A11Y-01, SPEC §11.1.
- **Precondiciones:** `npm run dev` recién levantado (si venías trabajando, frenalo y borrá `.next`). DevTools → modo dispositivo.

**Pasos**

1. Abrí `/` a 360 px y recorrela de arriba a abajo. Repetí la primera pantalla a 320×568, con el banner de demo.
2. Repetí a 768 px (tablet), 1024 px y 1440 px.
3. A 1440 px, pasá el mouse por una tarjeta de área.
4. En cualquier ancho, recorré la página con **Tab**.

**Resultado esperado**

- En ningún ancho aparece scroll horizontal ni texto pegado a los bordes de una tarjeta.
- 360 px: el título, el botón "Contanos tu caso" y la frase de confidencialidad (arriba del botón) entran sin hacer scroll (también a 320×568); arriba se lee "Familia y sucesiones · CABA"; el bloque de confianza va antes de "Cómo trabajamos"; las áreas van de a una; los 3 pasos van en columna, unidos por una línea vertical; el bloque de confianza es una sola ficha con divisiones.
- 768 px: el header muestra el botón **Menú** (no los links); las áreas van de a 2 y la quinta queda centrada; los pasos siguen en columna.
- 1024 px o más: el header muestra los links y el botón; a la derecha del hero aparece la ficha con los profesionales, su matrícula y la jurisdicción; la página actual se ve subrayada en el menú ("Inicio" recién desde 1152 px); las áreas van de a 3 y las 2 últimas quedan centradas; los 3 pasos van en fila, unidos por una línea; las preguntas frecuentes van a la derecha del título.
- Paso 3: el borde de la tarjeta se marca y la flecha de "Leer más" se mueve apenas (no se mueve con "reducir movimiento" activado).
- Paso 4: el foco se ve siempre; en las tarjetas de área se marca la tarjeta entera.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-17 — Áreas de práctica: navegación, CTA y 404

- **Objetivo:** que cada área se pueda leer y recorrer cómodo, y que lleve al formulario con el área elegida.
- **Requisitos:** FR-01, US-02 CA1, SPEC §11.3.
- **Precondiciones:** sitio levantado (`npm run dev` o la URL de preview). DevTools a 360 px y a 1440 px.

**Pasos**

1. Desde el inicio, hacé clic en la tarjeta "Sucesiones".
2. Recorré la página de arriba a abajo y abrí una pregunta frecuente.
3. Mirá a dónde apuntan los dos botones "Contanos tu caso" (pasando el mouse o con clic derecho → copiar link).
4. En "Otras áreas", entrá a otra área. Después usá las migas de pan para ir a "Áreas de práctica".
5. Escribí a mano `/areas/no-existe` en la barra de direcciones.
6. Repetí los pasos 1 a 4 solo con el teclado.

**Resultado esperado**

- Paso 1: la URL es `/areas/sucesiones` y el título de la pestaña es "Sucesiones · Estudio Alameda".
- Paso 2: en orden se ven migas de pan, título, primer párrafo, botón, resto de la introducción, "¿Cuándo consultar?", "¿Qué documentación suele hacer falta?" (con la aclaración de que es orientativa), preguntas frecuentes, "Otras áreas" y el cierre. A 1440 px, "Cuándo consultar" y "Documentación" van lado a lado; a 360 px, una debajo de la otra.
- Paso 3: los dos apuntan a `/contacto?area=sucesiones` (se abre Contacto).
- Paso 4: "Otras áreas" muestra las otras 4, no la actual; `/areas` muestra las 5 tarjetas y el bloque "¿Tu situación no está en la lista?".
- Paso 5: se ve la 404 en español, con header, footer y links. En DevTools → Network, el documento tiene status **404**.
- Paso 6: el foco se ve siempre; las preguntas se abren con Enter o Espacio.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-18 — Nosotros, Preguntas frecuentes y Privacidad

- **Objetivo:** que las páginas institucionales se lean claras, generen confianza y que la política de privacidad sea completa y fácil de recorrer.
- **Requisitos:** FR-01, US-07 CA1, SPEC §11.2, §11.3 y §11.4, NFR-PRIV-01.
- **Precondiciones:** sitio levantado (`npm run dev` o la URL de preview). DevTools a 360 px y a 1440 px.

**Pasos**

1. Abrí `/nosotros` y recorrela de arriba a abajo.
2. Abrí `/preguntas-frecuentes`, usá el índice "Temas" para ir a "Honorarios y costos" y abrí una pregunta.
3. Al final de esa página, entrá a un área desde "Preguntas sobre cada tema".
4. Desde el footer de cualquier página, hacé clic en "Política de privacidad".
5. En `/privacidad`, usá el índice "Contenido" para ir a "Tus derechos". Leé la política completa.
6. Repetí los pasos 1 a 5 solo con el teclado.

**Resultado esperado**

- Paso 1: se ven el enfoque, las tarjetas de profesionales (nombre, formación y matrícula marcada como ficticia, sin fotos) y los 4 valores. No hay promesas de resultado ni comparaciones con otros estudios.
- Paso 2: el índice baja hasta el grupo elegido; hay 4 grupos con sus preguntas.
- Paso 3: el link lleva a `/areas/<slug>`.
- Paso 4: lleva a `/privacidad`, con la versión vigente (**1.1** desde F3-02) y su fecha de vigencia bajo el título y el aviso de que el estudio es ficticio.
- Paso 5: el índice baja a la sección. La sección "Quién es responsable" muestra el nombre, el domicilio y el email del estudio; "Con quién los compartimos" nombra a Vercel, Supabase, Resend, Cloudflare y Upstash; están los avisos de la AAIP. A 1440 px, el índice queda fijo al costado mientras leés.
- Paso 6: el foco se ve siempre y los índices funcionan con Enter.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-19 — Contacto: formulario, canales y mapa

- **Objetivo:** que alguien pueda contactar al estudio por el canal que prefiera, sin fricción: el formulario o WhatsApp, teléfono y email.
- **Requisitos:** FR-01, FR-13, US-04, SPEC §11.2 y §11.3.
- **Precondiciones:** sitio levantado (`npm run dev` o la URL de preview). DevTools a 360 px y a 1440 px. Para el paso 3, un celular con WhatsApp (opcional).

**Pasos**

1. Llegá a `/contacto` desde el botón "Contanos tu caso" del header, desde el CTA final del inicio y desde el botón de una página de área.
2. Recorré la página de arriba a abajo.
3. Tocá "Escribinos por WhatsApp".
4. Tocá el teléfono, el email y "Ver en Google Maps".
5. Repetí los pasos 2 a 4 solo con el teclado.

**Resultado esperado**

- Paso 1: siempre se abre Contacto; desde un área, la URL termina en `?area=<slug>` y el formulario trae esa área elegida.
- Paso 2: arriba está la franja de ayuda. A 360 px, sin hacer scroll se ven el título "Contanos tu caso" y WhatsApp en el header; después vienen el formulario, los datos de contacto (aviso de plazos y tiempo de respuesta) y "Antes de escribirnos". A 1440 px, el formulario va a la izquierda y los datos a la derecha, con "Antes de escribirnos" debajo del formulario (3 preguntas y el link a todas). No hay ningún mapa embebido. El envío del formulario se prueba en MT-02.
- Paso 3: se abre WhatsApp (o `wa.me`) en otra pestaña, con el mensaje "Hola, quisiera hacer una consulta." y sin datos personales.
- Paso 4: el teléfono abre el marcador, el email abre el cliente de correo y el mapa se abre en otra pestaña.
- Paso 5: el foco se ve siempre y todos los links funcionan con Enter.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-20 — SEO técnico y datos estructurados

- **Objetivo:** que buscadores y redes lean bien el sitio, y que la demo no se indexe.
- **Requisitos:** FR-14, NFR-SEO-01, US-02 CA2, ADR-0010.
- **Precondiciones:** URL de preview o de producción, con `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_DEMO_MODE=true` configuradas. Si el preview está protegido con login, las herramientas externas no lo pueden leer: usá producción o pegá el código fuente de la página en la pestaña "Código".

**Pasos**

1. Abrí `/sitemap.xml`, `/robots.txt` y `/opengraph-image`.
2. En el código fuente del inicio, buscá `name="robots"`, `rel="canonical"` y `og:image`.
3. Pasá el inicio, un área y `/preguntas-frecuentes` por el [validador de schema.org](https://validator.schema.org/).
4. Pasá las mismas páginas por el [Rich Results Test](https://search.google.com/test/rich-results).
5. Probá la URL en un validador de Open Graph (por ejemplo, opengraph.xyz).

**Resultado esperado**

- Paso 1: el sitemap tiene 11 URLs con el dominio correcto y sin `/admin`; robots bloquea solo `/admin` y apunta al sitemap; la imagen muestra el nombre, el tagline y la marca de demostración.
- Paso 2: robots dice `noindex, nofollow`; el canonical y `og:image` usan el dominio de `NEXT_PUBLIC_SITE_URL`, no `localhost`.
- Paso 3: sin errores; se detectan `LegalService`, `Service` y `BreadcrumbList` (área) y `FAQPage` (preguntas).
- Paso 4: sin errores en los tipos que Google reconoce. `Service` no es un rich result y `FAQPage` está limitado, así que pueden no aparecer: para esos vale el paso 3. Puede avisar que la página no es indexable: en la demo es lo esperado.
- Paso 5: la tarjeta muestra título, descripción e imagen.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-12 — Lighthouse mobile en todas las páginas públicas

- **Objetivo:** sostener ≥ 90 en las 4 categorías en todas las páginas públicas (SPEC §1).
- **Requisitos:** SPEC §1, NFR-PERF-01, NFR-A11Y-01, NFR-SEO-01, ADR-0010.
- **Precondiciones:** **nada más corriendo** (frená `npm run dev`: comparte la CPU y Lighthouse da números peores) y el Chromium de Playwright instalado (`npx playwright install chromium`). Lighthouse no es dependencia del proyecto: `npm run lighthouse` lo corre con `npx` y versión fija (13.6.0).

**Pasos**

1. Con el modo demo prendido: `npm run build` y `npm run start`.
2. En otra terminal: `npm run lighthouse`. Corre las 11 páginas, 3 veces cada una, y muestra la mediana. Tarda unos 5 minutos.
3. Frená el servidor. Construí sin modo demo y medí SEO. En cmd: `set NEXT_PUBLIC_DEMO_MODE=false&& npm run build`, después `npm run start` y, en otra terminal, `npm run lighthouse -- --seo`. En PowerShell: `$env:NEXT_PUBLIC_DEMO_MODE = "false"; npm run build`.
4. Al terminar, cerrá esa terminal (o `Remove-Item Env:NEXT_PUBLIC_DEMO_MODE`) y volvé a hacer `npm run build`. **No deployes el build del paso 3:** sería el estudio ficticio indexable.

**Resultado esperado**

- Paso 2: Performance, Accessibility y Best Practices ≥ 90 en todas las filas y "Todas las páginas ≥ 90". SEO da 66, solo por "Page is blocked from indexing" (el script verifica que sea la única falla): es lo esperado en la demo.
- Paso 3: las 4 categorías ≥ 90, SEO incluido.
- Una página aislada entre 85 y 90 en Performance suele ser ruido: repetí con `npm run lighthouse -- --runs 5`.

| Fecha      | Entorno                                                  | Resultado | Notas                                                                                     |
| ---------- | -------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| 22/11/2026 | Local, Lighthouse 13.6.0, Chromium de Playwright (la IA) | ✅ pasa   | 11 páginas: 99 / 100 / 100 / 100 (SEO sin modo demo; 66 con demo). LCP ≤ 0,9 s, CLS 0. Una corrida por página, antes de la pasada visual. |
| 22/11/2026 | Local, Lighthouse 13.6.0, Chromium de Playwright (la IA) | ✅ pasa   | Después de la pasada visual, 11 páginas: 99–100 / 100 / 100 / 100 (SEO sin modo demo; 66 con demo). LCP ≤ 0,9 s, CLS 0. Una corrida por página. |
| 27/11/2026 | Local, `npm run lighthouse` (13.6.0, mediana de 3), Chromium de Playwright, nada más corriendo (la IA) | ✅ pasa | F5-03, con el modo demo: 11 páginas, Performance 99–100, Accessibility 100, Best Practices 100 (SEO 66 por `noindex`). `/contacto` pasó de 81–90 a 99 al cargar Turnstile recién en el paso 2 (TBT 420–820 ms → 140 ms). LCP ≤ 0,9 s, CLS 0. |
| 27/11/2026 | Ídem, build con `NEXT_PUBLIC_DEMO_MODE=false` y `--seo` (la IA) | ✅ pasa | 11 páginas: SEO 100, Accessibility 100, Best Practices 100, Performance 92–100. |

### MT-21 — Páginas 404 y de error

- **Objetivo:** que un link roto o un error no deje a la persona sin salida.
- **Requisitos:** FR-16, NFR-A11Y-01.
- **Precondiciones:** sitio levantado. Para el paso 4, `npm run dev` y una copia de trabajo sin cambios en el inicio.

**Pasos**

1. Abrí `/no-existe` y `/areas/no-existe`, con DevTools → Network abierto.
2. Usá "Ir a contacto" y "Volver al inicio".
3. Repetí el paso 2 solo con el teclado.
4. Agregá temporalmente `if (process.env.NODE_ENV) throw new Error("prueba interna");` al principio de `HomePage`, abrí `/`, cerrá el aviso de desarrollo de Next y después **revertí el cambio**.

**Resultado esperado**

- Paso 1: status 404, título "Página no encontrada", mensaje en español, header y footer. En `/areas/no-existe` puede verse un instante en blanco: es la limitación de ADR-0009.
- Pasos 2–3: los links funcionan y el foco se ve siempre.
- Paso 4: se ve "Algo salió mal" con header y footer, sin el texto "prueba interna". Después de revertir, "Probar de nuevo" recupera la página.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-22 — Ayuda ante peligro y plazos

- **Objetivo:** que alguien en riesgo o con un plazo encuentre qué hacer sin buscar, y que los números sean correctos.
- **Requisitos:** SPEC §11.5.
- **Precondiciones:** sitio levantado; un celular. **No llames al 911 para probar.**

**Pasos**

1. Abrí Contacto, cada página de área y el footer de cualquier página.
2. Tocá cada número sin completar la llamada.
3. Compará los números con las fuentes que figuran en `src/content/urgent-help.ts`.
4. Abrí el Inicio, un área y Contacto y buscá el aviso de plazos.
5. Leé "Cómo trabajamos".

**Resultado esperado**

- Paso 1: "¿Estás en peligro?" aparece en Contacto, en las 4 áreas de familia (no en Sucesiones) y en todos los footers. En Contacto, en celular, muestra solo los números.
- Paso 2: el marcador se abre con 911, 137 o 144. Junto al 137 dice "(opción 1)".
- Paso 3: los números, la opción del 137 y la dirección de la OVD coinciden.
- Paso 4: el aviso muestra el teléfono del estudio, el horario y qué hacer si el plazo vence antes.
- Paso 5: el paso 2 no promete una llamada.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-23 — Base de datos: tablas y RLS en Supabase

- **Objetivo:** que las migraciones estén aplicadas y que nadie pueda leer ni escribir las consultas con la clave pública de Supabase, que viaja en el navegador.
- **Requisitos:** NFR-SEC-03, ADR-0002, SPEC §7.
- **Precondiciones:** proyecto de Supabase (dev, o prod después de `db:deploy`) con las migraciones aplicadas. Su URL (`https://<project-ref>.supabase.co`) y su clave pública (publishable o anon), de Settings → API. **Nunca uses la service role key**: esa saltea RLS.

> **Dev ejecutado el 27/11/2026** (ver la tabla al final). **Prod:** el caso completo en **F5-08**, después de `db:deploy`.
>
> - **Ya verificado en F3-01 (24/11/2026, dev),** sin la API pública:
>   - el paso 6: migraciones aplicadas y en sync;
>   - en el catálogo de Postgres: RLS activado con 0 políticas en las 4 tablas;
>   - Enforce SSL: una conexión sin cifrar es rechazada (`ESSLREQUIRED`).
> - **En Windows:** usá `curl.exe`, no `curl`, porque en PowerShell `curl` es otro comando. En cmd, el cuerpo del paso 5 va entre comillas dobles (`-d "{}"`); en PowerShell, entre simples (`-d '{}'`).

**Pasos**

1. En Supabase → Table Editor, esquema `public`, mirá las tablas.
2. En Supabase → Advisors → Security Advisor, corré el análisis.
3. Desde una terminal, pedí las consultas con la clave pública (en Windows, `curl.exe`):

   ```bash
   curl "https://<project-ref>.supabase.co/rest/v1/inquiries?select=*" -H "apikey: <clave pública>"
   ```

4. Repetí el paso 3 con `inquiry_events`, `staff_members` y `_prisma_migrations`.
5. Intentá insertar con la clave pública:

   ```bash
   curl -X POST "https://<project-ref>.supabase.co/rest/v1/inquiries" -H "apikey: <clave pública>" -H "Content-Type: application/json" -d "{}"
   ```

6. En la terminal del proyecto, corré `npx prisma migrate status`.
7. En Supabase → Database → SSL Configuration, mirá "Enforce SSL on incoming connections".

**Resultado esperado**

- Paso 1: están `inquiries`, `inquiry_events`, `staff_members` y `_prisma_migrations`, y ninguna dice "RLS disabled" (o "Unrestricted").
- Paso 2: ningún aviso de "RLS Disabled in Public" para esas tablas. Puede aparecer "RLS Enabled No Policy" como información: es lo buscado (ADR-0002). Desde la migración `20261127120000_revoke_rls_auto_enable` tampoco aparecen "Public Can Execute SECURITY DEFINER Function" ni "Signed-In Users Can Execute SECURITY DEFINER Function" para `rls_auto_enable` (H4). "Leaked Password Protection Disabled" es esperable en el plan gratuito (R9).
- Pasos 3 y 4: la respuesta es `[]` o un error, **nunca filas**, aunque la tabla tenga datos.
- Paso 5: un error (por ejemplo `new row violates row-level security policy`). No se crea ninguna fila.
- Paso 6: "Database schema is up to date!".
- Paso 7: activado.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
| 27/11/2026 | Supabase **dev** (`spwsafgqwuqphydypeci`), `curl.exe` desde cmd en Windows 11, con la publishable key | ✅ pasa | Pasos 3 y 4: `[]` en `inquiries`, `inquiry_events`, `staff_members` y `_prisma_migrations`. Paso 5: `42501 new row violates row-level security policy for table "inquiries"`, sin fila creada. Paso 6: 4 migraciones, "Database schema is up to date". Paso 2: sin "RLS Disabled in Public"; marcó `rls_auto_enable` (`SECURITY DEFINER` ejecutable por `anon` y `authenticated`), corregido con la migración `20261127120000_revoke_rls_auto_enable` (H4), y "Leaked Password Protection Disabled", aceptado (R9). Paso 7: cubierto por la prueba de F3-01 (`ESSLREQUIRED`). Paso 1: no informado; lo cubre el paso 2. |

### MT-08 — Entrar a `/admin` sin sesión

- **Objetivo:** que nadie sin sesión llegue al panel, y que el sitio público no cambie: sin cookies de sesión y estático. El proxy es solo la primera barrera; la autorización real (`requireStaff()`) se prueba en MT-09 (F4-02).
- **Requisitos:** SPEC §6.4 paso 1, FR-10, NFR-SEC-02, NFR-SEC-07, ADR-0014.
- **Precondiciones:** `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local`. `npm run dev`, o el preview de Vercel. Una ventana privada (sin sesión).

**Pasos**

1. Con DevTools → Network abierto, entrá a `/admin`.
2. Entrá a `/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b?estado=NEW`.
3. Entrá a `/admin/login`.
4. Entrá a `/` y a `/contacto`. En Network, mirá los headers de respuesta del documento.
5. En DevTools → Application → Cookies, mirá las cookies del sitio.
6. Iniciá sesión y mirá otra vez las cookies `sb-…`.

**Resultado esperado**

- Pasos 1 y 2: la respuesta del documento es un **307** con `location: /admin/login`, sin la query. Terminás en `/admin/login`.
- Paso 3: no hay redirect (no hay loop): se ve el formulario de login.
- Paso 4: ningún `Set-Cookie` con `sb-` y ningún `Cache-Control: private, no-cache, no-store…`: el proxy no corre en el sitio público.
- Paso 5: no hay cookies `sb-…`.
- Paso 6: las cookies `sb-…` tienen **HttpOnly**, **SameSite=Lax** y, en el preview (https), **Secure**.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-24 — Configuración de Supabase Auth (registro y contraseñas)

- **Objetivo:** que nadie pueda crearse una cuenta en el proyecto de Supabase y que las contraseñas del staff sean largas. Esta configuración vive en Supabase, no en el código, así que solo se verifica a mano.
- **Requisitos:** NFR-SEC-10, US-06 CA1, SPEC §7 (alta de staff), ADR-0014.
- **Precondiciones:** acceso al dashboard del proyecto (dev en F4-01, prod en F5-08) y su URL y clave pública. **Nunca uses la secret ni la service role key.**

**Pasos**

1. Supabase → Authentication → Sign In / Providers → Email: mirá "Allow new users to sign up" (o, según la versión del dashboard, "Enable email signups" en la configuración general de Auth).
2. En la configuración de contraseñas de Auth, mirá "Minimum password length".
3. Authentication → Users: buscá tu usuario.
4. Intentá registrar una cuenta con la clave pública (en Windows, `curl.exe`):

   ```bash
   curl -X POST "https://<project-ref>.supabase.co/auth/v1/signup" -H "apikey: <clave pública>" -H "Content-Type: application/json" -d "{\"email\":\"intruso@example.com\",\"password\":\"una-clave-de-prueba-larga\"}"
   ```

5. Authentication → Users: buscá `intruso@example.com`.

**Resultado esperado**

- Paso 1: el registro está **deshabilitado**.
- Paso 2: **12** o más.
- Paso 3: tu usuario existe y está **confirmado** (creado con Add user → "Auto Confirm User").
- Paso 4: un error del tipo `signup_disabled` ("Signups not allowed for this instance"). Nunca un usuario creado.
- Paso 5: no existe.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
| 27/11/2026 | Supabase **dev** (dashboard) | ✅ pasa | Los 5 pasos, informados por el dueño: registro deshabilitado, contraseña mínima de 12 o más, su usuario confirmado, alta pública rechazada y ninguna cuenta nueva. |

### MT-07 — Login y logout del admin

- **Objetivo:** que el staff entre y salga del panel sin fricción, que un error no revele si la cuenta existe y que todo funcione con teclado y lector de pantalla.
- **Requisitos:** US-06 CA1, SPEC §6.4, §6.5, §8.2 (5 intentos por IP cada 15 minutos), NFR-A11Y-01, NFR-SEC-07, ADR-0014.
- **Precondiciones:** `npm run dev` (o el preview). Tu usuario dado de alta como staff en dev (MT-25). Una ventana privada.

**Pasos**

1. Entrá a `/admin`.
2. Con el teclado solamente: Tab hasta el email, escribí tu email, Tab a la contraseña, escribí una **incorrecta** y Enter.
3. Repetí el paso 2 con un email que no existe.
4. Enviá el formulario con el email vacío.
5. Escribí la contraseña correcta y enviá.
6. Volvé a abrir `/admin/login` en la misma pestaña.
7. Tocá "Cerrar sesión" en la barra superior y después abrí `/admin`.
8. Con un lector de pantalla (NVDA, VoiceOver o TalkBack), repetí los pasos 2 y 5.
9. (Opcional) Con JavaScript desactivado en DevTools, repetí los pasos 2 y 5.

**Resultado esperado**

- Paso 1: terminás en `/admin/login`, con el título "Ingresar al panel" y sin el banner de demo, WhatsApp ni el footer del sitio.
- Pasos 2 y 3: el **mismo** mensaje, "El email o la contraseña no son correctos.", recibe el foco. El email sigue escrito y la contraseña queda vacía.
- Paso 4: "Ingresá un email válido" junto al campo de email, que queda marcado en rojo.
- Paso 5: entrás a `/admin` y ves el listado ("Consultas") y tu nombre en la barra superior.
- Paso 6: te lleva directo a `/admin`.
- Paso 7: volvés a `/admin/login`, y `/admin` te devuelve al login.
- Paso 8: el lector anuncia los nombres de los campos y lee el mensaje de error apenas aparece.
- Paso 9: funciona igual (la página se recarga en cada envío).
- Si hacés más de 5 intentos en 15 minutos: "Hiciste demasiados intentos seguidos…".

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-27 — Del mail al detalle, pasando por el login

- **Objetivo:** que el aviso de una consulta nueva lleve al estudio directo a esa consulta, aunque tenga que iniciar sesión, y que el login no se pueda usar para mandar a alguien a otro sitio.
- **Requisitos:** US-05 CA1, FR-10, SPEC §6.4 paso 1, §6.5, §10.2.
- **Precondiciones:** una consulta nueva enviada desde `/contacto` y su mail de aviso en tu casilla (MT-06). Tu usuario es staff en dev (MT-25). Una ventana privada, sin sesión.

**Pasos**

1. En el mail de aviso, tocá "Ver en el panel" y abrí el link en la ventana privada.
2. Ingresá con una contraseña incorrecta y después con la correcta.
3. Con la sesión abierta, abrí de nuevo el link del mail.
4. Cerrá sesión. Abrí `/admin?status=NEW&area=DIVORCE`, ingresá y mirá la URL.
5. Cerrá sesión. Abrí `/admin/login?next=https://example.com`, ingresá y mirá adónde vas. Repetí con `?next=//example.com` y `?next=/contacto`.
6. Con la sesión abierta, abrí `/admin/login?next=/admin/consultas/<id de la consulta>`.

**Resultado esperado**

- Paso 1: terminás en `/admin/login?next=%2Fadmin%2Fconsultas%2F<id>`.
- Paso 2: con la contraseña incorrecta, el mensaje genérico, y la URL sigue con `next`. Con la correcta llegás **al detalle de esa consulta**, no al listado.
- Paso 3: el detalle se abre directo, sin pasar por el login.
- Paso 4: después de ingresar, el listado conserva el filtro (`?status=NEW&area=DIVORCE`).
- Paso 5: en los tres casos terminás en `/admin`. **Nunca** en otro sitio ni en una página pública.
- Paso 6: vas directo al detalle.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-28 — CSP aplicada en el preview

- **Objetivo:** que la Content Security Policy bloquee de verdad y que no rompa nada que el sitio usa: Turnstile, el panel ni la barra de Vercel en los previews. Los e2e corren en local; esto lo comprueba en Vercel.
- **Requisitos:** NFR-SEC-05, NFR-SEC-04, SPEC §10.2 (XSS, clickjacking), [ADR 0016](adr/0016-csp-aplicada-con-unsafe-inline.md).
- **Precondiciones:** el preview de Vercel del PR (o producción, en F5-08). Una **ventana privada sin extensiones**: las extensiones inyectan scripts y generan violaciones que no son del sitio. Tu usuario es staff en dev (MT-25).

**Pasos**

1. Abrí DevTools (F12) → **Network**, cargá el inicio y elegí el primer request (el documento). Mirá **Response Headers**.
2. Dejá abierta la pestaña **Console** y recorré: inicio, `/areas`, un área, `/nosotros`, `/preguntas-frecuentes`, `/privacidad` y `/no-existe`.
3. Andá a `/contacto`. Esperá el widget de Turnstile, completá el formulario y enviá una consulta (marcá el mensaje con `PRUEBA MT-28`).
4. Ingresá a `/admin`, abrí la consulta del paso 3, cambiale el estado, guardá una nota y cerrá sesión.
5. **Solo en el preview:** abrí la barra de Vercel (abajo) y dejá un comentario de prueba en alguna página. Después borralo.
6. **Solo en producción (F5-08):** repetí el paso 1.

**Resultado esperado**

- Paso 1: está `content-security-policy` con `default-src 'self'`, `frame-ancestors 'none'` y `https://challenges.cloudflare.com`. **No** está `content-security-policy-report-only`. En el preview el header incluye `https://vercel.live`.
- Pasos 2 a 4: la consola no muestra ningún mensaje "Refused to…" ni "violates the following Content Security Policy directive". Turnstile carga, la consulta se envía y el panel funciona.
- Paso 5: la barra se ve y el comentario se guarda.
- Paso 6: el header **no** incluye `vercel.live`, `vercel.com` ni `pusher`.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
| 26/11/2026 | Preview de Vercel (`estudio-familia-demo-git-feat-f5-01-cs-45bc87-joaquin-palladino.vercel.app`), Brave en escritorio | ✅ pasa | Pasos 1 a 5: `content-security-policy` aplicada con `vercel.live`, sin report-only; consola sin violaciones de CSP en todas las páginas, envío con Turnstile, panel y barra de Vercel. Único aviso: "Unrecognized feature: 'browsing-topics'" de `Permissions-Policy`, propio de Brave (no implementa la Topics API), no es de la CSP. El paso 6 (producción) queda para F5-08. |

### MT-30 — Mensaje y notas cifrados en la base

- **Objetivo:** que nadie que mire la base (dashboard, backup, export) pueda leer el mensaje de una consulta ni las notas internas, y que el panel los siga mostrando.
- **Requisitos:** SPEC §7, §9, §10.2, [ADR 0017](adr/0017-cifrado-de-campos-a-nivel-de-aplicacion.md).
- **Precondiciones:** `FIELD_ENCRYPTION_KEYS` de dev cargada en `.env.local` y en Vercel → Preview, y guardada en tu gestor de contraseñas. Migraciones aplicadas en dev (`npx prisma migrate status`). Tu usuario es staff en dev (MT-25).

**Pasos**

1. Corré `npm run inquiries:encrypt` (sin `--confirm`) y anotá cuántos campos en claro informa.
2. Corré `npm run inquiries:encrypt -- --confirm`, y después otra vez sin `--confirm`.
3. En el preview, enviá una consulta desde `/contacto` con el mensaje `PRUEBA MT-30 texto que no tiene que verse en la base`.
4. En Supabase dev → Table Editor → `inquiries`, buscá esa consulta (por el email) y mirá las columnas `message` e `internal_notes`.
5. En el panel del preview, abrí esa consulta. Guardá la nota `PRUEBA MT-30 nota privada`.
6. Volvé al Table Editor y mirá `internal_notes` de esa fila. Abrí también una consulta vieja (de antes del paso 2) en el panel.
7. En el Table Editor, copiá el `message` de una consulta y pegalo en el `message` de **otra**. Abrí esa otra en el panel. Después borrá las dos consultas de prueba.

**Resultado esperado**

- Paso 1: cuenta los campos en claro y dice que se cifran con `--confirm`. No escribe nada.
- Paso 2: la primera corrida actualiza esas consultas; la segunda informa 0 campos en claro. Ninguna imprime un mensaje ni una nota.
- Paso 3: la confirmación con la referencia, como siempre.
- Paso 4: `message` empieza con `enc:v1:k1:` y no contiene "PRUEBA" ni ningún texto legible. `internal_notes` está vacío (`NULL`).
- Paso 5: el detalle muestra el mensaje legible, y la nota se guarda.
- Paso 6: `internal_notes` también empieza con `enc:v1:k1:`. La consulta vieja se ve bien en el panel.
- Paso 7: el panel muestra su error genérico y no el texto: un valor cifrado solo se descifra en su propia fila. En los logs de Vercel aparece `inquiry.detail_failed` con `errorCode: decrypt_failed`, sin contenido.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
| 26/11/2026 | Supabase **dev**, `npm run dev` local en Windows 11, clave de dev en `.env.local` y en Vercel → Preview | ✅ pasa | Los 7 pasos. Script: antes había 6 consultas con 9 campos en claro (conteo sin `--confirm` del 26/11); después de la corrida con `--confirm`, 0 campos en claro (comprobado por la IA con la clave de `.env.local`). Base: `message` e `internal_notes` como `enc:v1:k1:…`; panel: mensaje y nota legibles. Paso 7: el `message` copiado a otra consulta dio el error genérico, sin mostrar el texto. |

### MT-29 — Configuración de seguridad de los servicios

- **Objetivo:** comprobar lo que el código no puede ver: la configuración de Supabase, Vercel y GitHub que sostiene la revisión de seguridad ([`SECURITY_REVIEW.md`](SECURITY_REVIEW.md)).
- **Requisitos:** NFR-SEC-03, NFR-SEC-08, NFR-SEC-09, NFR-SEC-10, NFR-MANT-02, SPEC §9.
- **Precondiciones:** acceso de dueño a Supabase (dev; prod en F5-08), al proyecto de Vercel y al repo de GitHub. Sacá una captura por paso y guardala **fuera del repo** (pueden mostrar datos de las cuentas). **No copies ningún valor de variable.**

**Pasos**

1. **Supabase → Authentication → Sign In / Providers:** mirá "Allow new users to sign up" y, en Email, el largo mínimo de contraseña.
2. **Supabase → Authentication → Rate Limits:** anotá los límites de inicio de sesión.
3. **Supabase → Database → SSL Configuration:** mirá "Enforce SSL on incoming connections".
4. **Supabase → Advisors → Security Advisor:** corré el análisis.
5. **Supabase → Project Settings → API Keys:** confirmá que la app no usa la service role key (no está en Vercel ni en `.env.local`; buscá solo el **nombre** de la variable).
6. **Vercel → Settings → Environment Variables:** revisá los nombres de cada variable y sus entornos (Production, Preview, Development).
7. **Vercel → Settings → Deployment Protection:** mirá qué protege los previews.
8. **GitHub → Settings → Branches (o Rules):** mirá la protección de `main`.
9. **GitHub → Settings → Code security:** mirá Dependabot alerts y Dependabot security updates. En la pestaña Security, mirá si hay alertas abiertas.

**Resultado esperado**

- Paso 1: registro deshabilitado; contraseña mínima de 12 o más (NFR-SEC-10).
- Paso 2: los límites por defecto o más estrictos; anotalos en la fila.
- Paso 3: Enforce SSL activado.
- Paso 4: sin "RLS Disabled in Public" ni avisos de `SECURITY DEFINER` sobre `rls_auto_enable`. "RLS Enabled No Policy" es lo buscado (ADR-0002). "Leaked Password Protection Disabled" solo se acepta en el plan gratuito ([`SECURITY_REVIEW.md`](SECURITY_REVIEW.md), R9).
- Paso 5: ninguna variable con la service role key en ningún lado.
- Paso 6: solo empiezan con `NEXT_PUBLIC_` las 5 públicas de SPEC §9 (`SITE_URL`, `DEMO_MODE`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `TURNSTILE_SITE_KEY`). Ningún secreto con ese prefijo. Production usa las claves reales de Turnstile y el Supabase de prod; Preview, las de prueba y dev (§8.2, §9). No hay `E2E_STAFF_*` en Vercel.
- Paso 7: los previews piden login de Vercel (Vercel Authentication) o una protección equivalente.
- Paso 8: PR obligatorio y el check de CI requerido para mergear a `main`.
- Paso 9: alertas y actualizaciones de seguridad de Dependabot activadas; ninguna alerta alta o crítica abierta.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
| 27/11/2026 | Supabase **dev**, proyecto de Vercel y repo de GitHub (dashboards) | ✅ pasa | Los 9 pasos, informados por el dueño; capturas guardadas fuera del repo. Security Advisor como en MT-23: sin "RLS Disabled" y sin avisos de `rls_auto_enable` después de H4; "Leaked Password Protection Disabled" aceptado (R9). Los límites de Auth (paso 2) no se anotaron. |

### MT-10 — Cambio de estado, notas e historial

- **Objetivo:** que el estudio vea todo lo que mandó la persona, sepa cómo (y si) contactarla, y que cada cambio quede registrado con quién y cuándo, sin exponer las notas.
- **Requisitos:** US-06 CA3, FR-11, FR-12, US-03 CA6 y CA7, SPEC §6.5, §11.5, NFR-SEC-02, NFR-SEC-06.
- **Precondiciones:** sesión de staff en dev (MT-07). Dos consultas nuevas desde `/contacto`:
  - A: WhatsApp y "sí, es seguro", con un mensaje de varias líneas;
  - B: teléfono y "no es seguro", con un email **no** privado.
  - Para el paso 8, un segundo usuario sin staff (MT-09) o el tuyo con `active = false`.

**Pasos**

1. Desde el listado, abrí A.
2. Abrí B.
3. En A, cambiá el estado a "En revisión" y tocá "Cambiar estado".
4. Elegí otra vez "En revisión" y volvé a tocar "Cambiar estado".
5. Escribí unas notas, guardalas y recargá la página. Después vacialas y guardá.
6. Volvé al listado.
7. Abrí `/admin/consultas/no-existe` y `/admin/consultas/00000000-0000-4000-8000-000000000000`.
8. Con la página de A abierta en otra pestaña, dejá de ser staff (`active = false` en el Table Editor) y probá cambiar el estado desde esa pestaña. Al final, volvé a `active = true`.
9. Repetí los pasos 3 y 5 solo con el teclado y, si podés, con un lector de pantalla.
10. (Opcional) Con JavaScript desactivado, cambiá el estado.

**Resultado esperado**

- Paso 1:
  - Arriba, "Cómo contactar: Contactar por WhatsApp: <teléfono>".
  - Se ven todos los datos, el mensaje con sus saltos de línea y el consentimiento con su versión.
  - El teléfono y el email no son links.
  - El historial dice "Consulta recibida · Sitio web".
- Paso 2: arriba, en rojo, **"No iniciar contacto"** con la explicación. El email dice "no es privado: puede leerlo otra persona".
- Paso 3: "Estado actualizado." El badge cambia sin recargar, y el historial suma "Estado: Nueva → En revisión", con tu nombre y la hora de Argentina.
- Paso 4: "La consulta ya estaba en ese estado." El historial no suma nada.
- Paso 5: "Notas guardadas." Después de recargar, las notas siguen ahí. El historial dice "Notas actualizadas" con tu nombre, **sin el texto**. Al vaciarlas también se registra.
- Paso 6: A figura "En revisión" en el listado.
- Paso 7: "No encontramos esta consulta", dentro del panel, con "Volver al listado".
- Paso 8: "No tenés permiso para realizar esta acción." El estado no cambia y el historial no suma nada.
- Paso 9: los mensajes se anuncian ("Estado actualizado", "Notas guardadas") y el foco se ve en cada control.
- Paso 10: funciona igual; la página se recarga.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-26 — Listado de consultas: orden, filtros, búsqueda y páginas

- **Objetivo:** que el estudio encuentre rápido una consulta, vea primero lo nuevo y lo urgente, y que nunca se le pase un "No iniciar contacto".
- **Requisitos:** US-06 CA2, US-03 CA7, FR-10, NFR-ESC-01, NFR-A11Y-01.
- **Precondiciones:** sesión de staff en dev (MT-07). Cuatro consultas nuevas enviadas desde `/contacto`, todas con tu email o con direcciones `@example.com`:
  - A: Sucesiones, urgencia alta, WhatsApp y "sí, es seguro";
  - B: Divorcio, sin apuro, email privado;
  - C: Alimentos, en las próximas semanas, teléfono y "no es seguro" con un email **no** privado;
  - D: Divorcio, urgencia alta, con "ñ" o una tilde en el nombre.
  - Para el paso 7 hacen falta más de 20 consultas: si no las tenés, pedímelo y creo filas `E2E-` en dev.

**Pasos**

1. Entrá a `/admin`.
2. Mirá la fila de C.
3. Filtrá por área "Divorcio" y después agregá la urgencia "Alta".
4. Copiá la URL, abrila en otra pestaña y después tocá "Limpiar filtros".
5. Buscá parte del nombre de B en minúsculas, después parte de su email y después un texto que no exista (por ejemplo `zzz%`).
6. Escribí `?status=CUALQUIERA&page=999` en la URL.
7. Con más de 20 consultas, andá a la página 2 con algún filtro puesto.
8. Hacé todo con el teclado, incluido el desplazamiento lateral de la tabla en un celular o con la ventana angosta.

**Resultado esperado**

- Paso 1: las consultas aparecen de la más nueva a la más vieja, con la fecha y la hora de Argentina (no 3 horas corridas). Cada fila muestra la referencia (link), nombre y email, área, urgencia (badge "Alta", "Normal" o "Baja"), estado ("Nueva") y el canal preferido.
- Paso 2: en Contacto dice **"No iniciar contacto"**, destacado, en lugar del canal.
- Paso 3: primero quedan B y D, después solo D. La URL cambia (`?area=DIVORCE&urgency=HIGH`).
- Paso 4: la otra pestaña muestra exactamente lo mismo. "Limpiar filtros" vuelve a todas.
- Paso 5: encuentra a B por el nombre y por el email. Con el texto inexistente, "Ninguna consulta coincide con los filtros." El `%` no funciona como comodín.
- Paso 6: no hay error: se ignora el estado inválido y se muestra la última página.
- Paso 7: "Página 2 de N · M consultas". "Anterior" y "Siguiente" conservan el filtro.
- Paso 8: se llega a todos los filtros, al botón, a los links y a la tabla con Tab, con el foco visible.
- El link de la referencia abre el detalle de esa consulta (`/admin/consultas/<id>`, MT-10).

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-25 — Alta de staff con `npm run staff:add`

- **Objetivo:** dar de alta como staff a un usuario de Supabase Auth, sin duplicarlo y sin poder vincular a alguien que no existe. Es el único camino para entrar al panel.
- **Requisitos:** SPEC §7, US-06 CA4, ADR-0015.
- **Precondiciones:** `.env.local` apuntando a Supabase **dev**. Tu usuario creado en Authentication → Users (MT-24).

**Pasos**

1. `npm run staff:add -- --help`.
2. `npm run staff:add -- --email no-existe@example.com --name "Nadie"`.
3. `npm run staff:add -- --email <tu email> --name "<Tu nombre>"`.
4. Supabase → Table Editor → `staff_members`.
5. Repetí el paso 3 con otro nombre (por ejemplo, agregando tu segundo nombre).
6. En el Table Editor, poné `active = false` en tu fila y repetí el paso 3.
7. (Opcional, usuario recreado) Creá un usuario de prueba en Auth, dalo de alta con `staff:add`, borralo en Authentication → Users, crealo de nuevo con el mismo email y repetí `staff:add`. Al final, borrá el usuario y su fila.

**Resultado esperado**

- Paso 1: muestra el uso y sale sin tocar la base.
- Paso 2: "No existe un usuario de Supabase Auth con el email…" y sale con error. No se crea ninguna fila.
- Paso 3: primero muestra "Proyecto de Supabase: `<project-ref de dev>`" y después "Staff dado de alta: …".
- Paso 4: hay **una** fila con tu email, tu nombre, `role = ADMIN`, `active = true` y `auth_user_id` igual al id de tu usuario en Authentication → Users.
- Paso 5: "Staff actualizado y activo: …". Sigue habiendo una sola fila, con el nombre nuevo.
- Paso 6: la fila vuelve a `active = true`.
- Paso 7: "El usuario de Auth se había vuelto a crear: se vinculó el staff existente…". Sigue habiendo una sola fila, con el mismo `id` y el `auth_user_id` nuevo. Antes de este arreglo, el script fallaba con "StaffStoreError: PrismaClientKnownRequestError".

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-09 — Usuario autenticado que no es staff

- **Objetivo:** que una sesión válida de Supabase no alcance para ver el panel: hace falta ser staff activo (US-06 CA4). Es la barrera real, más allá del proxy (MT-08).
- **Requisitos:** US-06 CA4, SPEC §6.4 paso 2, NFR-SEC-02, ADR-0015.
- **Precondiciones:** en Supabase **dev**, un segundo usuario de prueba creado con Add user y **sin** `staff:add`. Tu usuario dado de alta como staff (MT-25).

**Pasos**

1. Iniciá sesión con el usuario de prueba (sin staff).
2. Entrá a `/admin` y a `/admin/consultas/<id de una consulta>`.
3. En la terminal, corré `npm run staff:add -- --email <email del usuario de prueba> --name "Prueba"` y volvé a entrar a `/admin`.
4. En el Table Editor, poné `active = false` en su fila y recargá `/admin`.
5. Cerrá sesión e iniciá con tu usuario (staff activo). Entrá a `/admin`.
6. Al terminar, borrá el usuario de prueba de Authentication → Users y su fila de `staff_members`.

**Resultado esperado**

- Pasos 1 y 2: terminás en `/admin/login?error=forbidden`, con el aviso "Esta cuenta no tiene acceso al panel" y el botón "Usar otra cuenta". Nunca se ve ningún dato del panel, ni por un instante. "Usar otra cuenta" cierra la sesión y deja el login limpio.
- Paso 3: ahora sí ve el panel.
- Paso 4: vuelve a `/admin/login?error=forbidden` sin tener que cerrar sesión.
- Paso 5: ves el listado de consultas y tu nombre en la barra superior.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-03 — Errores de validación de cada campo

- **Objetivo:** que cada error se entienda, aparezca junto a su campo y lo anuncie un lector de pantalla, sin perder lo que la persona ya escribió. Las reglas están cubiertas por `src/features/inquiries/__tests__/schema.test.ts`; acá se mira cómo se viven en el formulario.
- **Requisitos:** SPEC §8.1, US-03 CA2, CA4, CA6 y CA7, NFR-A11Y-01.
- **Precondiciones:** formulario de Contacto funcionando (F3-07). Se ejecuta en el cierre de F3 (F3-09). Para el paso 9, un lector de pantalla (NVDA, VoiceOver o TalkBack).

**Pasos**

1. Paso 1 del formulario: tocá "Siguiente" sin completar nada.
2. Escribí un mensaje de 19 caracteres (con espacios al principio y al final) y seguí. Después, pegá uno de más de 2000.
3. Paso 2: dejá el nombre vacío, después probá `Ana2` y por último `O’Brien` (con el apóstrofo curvo del celular).
4. Probá el email `ana@example` y después `  Ana@Example.COM  `.
5. Elegí WhatsApp sin teléfono. Después cargá `(011) 4555-1234` y por último `+54 9 11 5555-1234`.
6. Con WhatsApp elegido, no respondas "¿Es seguro que te contactemos por ese medio?".
7. No respondas "¿Este email es privado (solo lo leés vos)?". Cambiá a email como canal y fijate si la pregunta de seguridad sigue apareciendo.
8. Enviá sin marcar el consentimiento.
9. Repetí los pasos 1, 6 y 8 con el lector de pantalla.

**Resultado esperado**

- Paso 1: "Elegí el tipo de consulta", "Indicá la urgencia" y "Contanos un poco más (mínimo 20 caracteres)", cada uno junto a su campo.
- Paso 2: con 19 caracteres útiles, el mismo error de mínimo; con más de 2000, "Máximo 2000 caracteres".
- Paso 3: "Ingresá tu nombre" para vacío y `Ana2`; `O’Brien` se acepta.
- Paso 4: "Ingresá un email válido" para `ana@example`; el segundo se acepta.
- Paso 5: "Para contactarte por ese medio necesitamos tu teléfono"; `(011) 4555-1234` da "Ingresá un teléfono válido" (los paréntesis no están permitidos, SPEC §8.1); el último se acepta.
- Paso 6: "Decinos si es seguro contactarte por ese medio". Ninguna opción viene marcada.
- Paso 7: "Decinos si este email es privado", sin opción marcada. Con email como canal, la pregunta de seguridad no aparece.
- Paso 8: "Necesitamos tu consentimiento para responderte"; la casilla nunca viene marcada.
- Todos los errores de un paso aparecen **a la vez**, no de a uno. Ningún error repite el mensaje ni muestra lo que escribiste. Lo ya escrito no se borra.
- Paso 9: el lector anuncia los errores y cada campo inválido se lee con su mensaje.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-04 — Exceder el rate limit

- **Objetivo:** que el formulario frene los envíos en ráfaga sin bloquear a otras personas, y que el mensaje se entienda.
- **Requisitos:** SPEC §8.2, FR-06, ADR-0004, ADR-0013.
- **Precondiciones:** formulario funcionando (F3-07), en el **preview de Vercel**, donde cada red tiene su IP. En local todos los envíos salen de `::1` y comparten el mismo límite, así que el paso 3 no se puede probar. Upstash configurado. Usá emails de prueba tuyos.

**Pasos**

1. Enviá 5 consultas válidas seguidas desde el mismo navegador, cada una con un email distinto.
2. Enviá una sexta, también con un email nuevo.
3. Desde otra red (por ejemplo, datos móviles), enviá una con un email nuevo.
4. Enviá 3 consultas con el **mismo** email, cada una desde una red distinta (o esperá 10 minutos entre la primera tanda y esta). Después, una cuarta con ese email.
5. En Supabase dev → Table Editor → `inquiries`, contá las consultas nuevas.
6. En los logs de Vercel, buscá `inquiry.rate_limited`.

**Resultado esperado**

- Paso 2: "Hiciste demasiados intentos seguidos. Esperá unos minutos y volvé a probar." No se guarda.
- Paso 3: se acepta (el límite es por IP).
- Paso 4: las 3 primeras se aceptan y la cuarta se rechaza con el mismo mensaje.
- Paso 5: están solo las aceptadas.
- Paso 6: aparece `inquiry.rate_limited`, sin IP, email ni nombre.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-05 — Honeypot completado (no guarda nada)

- **Objetivo:** que un bot que completa el campo oculto reciba una respuesta normal, pero sin que se guarde ni se mande nada.
- **Requisitos:** SPEC §8.1, FR-06, ADR-0004.
- **Precondiciones:** formulario funcionando (F3-07), en local o en el preview.

**Pasos**

1. Abrí el formulario y, con las DevTools (Elements), buscá el campo `website`. Escribí cualquier cosa en él (si está oculto, quitale el `hidden` o usá la consola: `document.querySelector('[name=website]').value = 'spam'`).
2. Completá el resto del formulario y envialo.
3. Revisá Supabase dev → `inquiries`, tu casilla y los logs (de la terminal en local, o de Vercel en el preview).
4. Probá con el teclado y un lector de pantalla que el campo `website` no se pueda alcanzar.

**Resultado esperado**

- Paso 2: se ve la confirmación con un número de referencia, como en un envío real.
- Paso 3: no hay ninguna consulta nueva, no llega ningún mail, y el log dice `inquiry.honeypot`.
- Paso 4: el campo no recibe foco y el lector no lo anuncia.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-15 — Error de mail simulado (la consulta se guarda igual)

- **Objetivo:** que un fallo de Resend no pierda la consulta ni le muestre un error a quien consulta (FR-08).
- **Requisitos:** FR-08, ADR-0005, NFR-OBS-01.
- **Precondiciones:** formulario funcionando (F3-07), en **local**.

**Pasos**

1. En `.env.local`, cambiá `RESEND_API_KEY` por un valor inválido (por ejemplo, `re_invalida`). Guardá el valor real para volver a ponerlo.
2. Reiniciá `npm run dev` y enviá una consulta válida, con el email marcado como privado.
3. Mirá la respuesta en pantalla, Supabase dev → `inquiries` y los logs de la terminal.
4. Volvé a poner la API key real y reiniciá.

**Resultado esperado**

- Paso 3: la confirmación aparece normal, con su referencia. La consulta está en `inquiries`, con su evento `CREATED` en `inquiry_events`. En la terminal aparecen `inquiry.firm_email_failed` e `inquiry.receipt_email_failed` con el `inquiryId` y el código de Resend, y sin nombre, email ni mensaje.
- No llega ningún mail.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-06 — Mails recibidos: estudio y acuse

- **Objetivo:** que el aviso al estudio tenga todo lo necesario para contactar de forma segura, y que el acuse no delate el motivo de la consulta a quien vea la casilla.
- **Requisitos:** US-05 CA1, US-03 CA5 a CA7, ADR-0005, SPEC §11.5.
- **Precondiciones:** formulario funcionando (F3-07) en el preview, con Resend configurado. Sin dominio verificado, Resend solo entrega a la casilla de la cuenta: usá esa casilla como email de la consulta y como `FIRM_NOTIFICATION_EMAIL`. Abrí los mails en Gmail desde el celular y desde la computadora.

**Pasos**

1. Enviá una consulta de Sucesiones, con WhatsApp, "es seguro" = **Sí** y "email privado" = **Sí**.
2. Enviá otra con WhatsApp, "es seguro" = **No** y "email privado" = **Sí**.
3. Enviá otra con WhatsApp, "es seguro" = **No** y "email privado" = **No**.
4. Enviá otra con canal **Email** y "email privado" = **Sí**.
5. Para cada consulta, abrí el aviso al estudio y, si llegó, el acuse. Mirá también cómo aparecen en la bandeja de entrada, sin abrirlos (asunto y vista previa).
6. Hacé clic en "Ver la consulta en el panel".

**Resultado esperado**

- Paso 1: aviso con "Contactar por: WhatsApp" arriba. Llega el acuse.
- Paso 2: aviso con "Contactar por: Email". Llega el acuse.
- Paso 3: aviso con el asunto empezando por "[No iniciar contacto]" y el recuadro "NO INICIAR CONTACTO" arriba. **No llega acuse.**
- Paso 4: aviso con "Contactar por: Email" y "No aplica (eligió email)" en la pregunta de seguridad. Llega el acuse.
- En todos los avisos: referencia, nombre, área, urgencia, canal, las dos respuestas de seguridad y el botón al panel. **Nunca el texto del mensaje.**
- En todos los acuses: asunto "Recibimos tu mensaje", el nombre, la referencia y la firma con el nombre corto del estudio. **Ni en la bandeja ni abierto** aparecen el área, la urgencia, "Familia", "Sucesiones", el nombre completo del estudio ni links.
- Los mails se leen bien en celular y en computadora, sin texto cortado ni colores sin contraste.
- Paso 6: lleva a `/admin/consultas/<id>`. Hasta F4 da 404; desde F4, pide el login y muestra la consulta.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-02 — Enviar una consulta completa

- **Objetivo:** que una persona angustiada, desde el celular, pueda contar su caso en menos de 2 minutos, entienda cada pregunta y sepa qué va a pasar después.
- **Requisitos:** US-03 CA1 a CA7, US-07 CA1 y CA2, FR-04, FR-06, SPEC §1 (menos de 2 minutos) y §11.5.
- **Precondiciones:** preview de Vercel (o `npm run dev`) con Turnstile de prueba y los servicios de dev. Un celular real y una computadora. Un lector de pantalla para el paso 8.
- **Ojo con el acuse:** sin dominio verificado en Resend (`EMAIL_FROM` con `onboarding@resend.dev`), el acuse **solo llega si el email de la consulta es la casilla de la cuenta de Resend**. Con otro email, Resend lo rechaza y el log muestra `inquiry.receipt_email_failed` con `validation_error`; la consulta se guarda igual. Usá esa casilla en el paso 3.

**Pasos**

1. Desde la página de Divorcio, tocá "Contanos tu caso".
2. Paso 1: elegí la urgencia, escribí un mensaje de unas líneas y tocá "Siguiente". Medí el tiempo desde acá.
3. Paso 2: completá nombre, email, "¿Este email es privado?" = Sí y el teléfono. Elegí WhatsApp y respondé "¿Es seguro…?" = Sí. Tocá "Volver" y revisá el paso 1; volvé al paso 2.
4. Abrí "política de privacidad", leé y volvé a la pestaña del formulario.
5. Marcá el consentimiento y enviá.
6. Enviá otra consulta eligiendo Email como canal y "¿Este email es privado?" = No.
7. Revisá Supabase dev → `inquiries` y tu casilla.
8. Repetí el envío completo solo con teclado y con el lector de pantalla.
9. Desactivá JavaScript en el navegador y volvé a abrir `/contacto`.

**Resultado esperado**

- Paso 1: el área ya viene elegida (Divorcio).
- Paso 2: con un mensaje corto, el error aparece junto al campo y en el resumen; con uno válido, pasa al paso 2 y el foco va a su título.
- Paso 3: la pregunta de seguridad aparece solo al elegir teléfono o WhatsApp. Ninguna respuesta viene marcada. "Volver" no borra nada.
- Paso 4: la política se abre en otra pestaña y el formulario sigue completo.
- Paso 5: "Enviando…" mientras espera; después, la confirmación con el número de referencia y "Te vamos a contactar por el medio que nos indicaste como seguro", con el tiempo de respuesta. Todo en menos de 2 minutos.
- Paso 6: la confirmación **no promete contacto**: pide guardar la referencia y comunicarse cuando sea seguro.
- Paso 7: las dos consultas están guardadas. Llegaron el aviso de cada una y el acuse solo de la primera (MT-06).
- Paso 8: el foco se ve siempre, el lector anuncia los errores, el título del paso 2 y la confirmación. El campo oculto anti-spam no se alcanza.
- Paso 9: se ven los dos pasos juntos y un aviso con WhatsApp, teléfono y email, porque la verificación anti-spam necesita JavaScript.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |