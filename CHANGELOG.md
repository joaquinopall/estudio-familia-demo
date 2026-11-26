# Changelog

Cambios del proyecto, una entrada por tarea de [`docs/GUIA_DE_AVANCE.md`](docs/GUIA_DE_AVANCE.md). Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). El proyecto todavía no publica versiones numeradas: las entradas se agrupan por tarea y fecha de merge a `main`.

## [Sin publicar]

### F4-08 · Cierre de fase (documentación)

- **Actualizado:** README (estado del proyecto: Fase 4 implementada, pendiente de sus tests manuales de cierre) y TESTING (el login exitoso lo cubre `admin-panel.spec.ts`; MT-07, MT-09 y MT-26 describen el panel como quedó: listado en `/admin` y detalle en la referencia).
- **Pendiente para cerrar la fase:** ejecutar y registrar MT-07 a MT-10 (y los otros manuales de F4: MT-23 a MT-27).

### F4-07 · E2E del admin

- **Agregado:** `tests/e2e/admin-panel.spec.ts`, el panel con una sesión real contra Supabase dev:
  - login, nombre en la barra y logout;
  - listado y filtros en la URL, con "No iniciar contacto";
  - detalle con cambio de estado, notas e historial con el actor;
  - del link del mail al detalle, pasando por el login (F4-06);
  - acceso denegado.

  Corre axe en el listado y en el detalle.

- **Agregado:** `tests/e2e/support/admin.ts`. Da de alta como staff (`E2E-Staff`) al usuario de prueba, carga consultas `E2E-` por SQL y hace el login por la interfaz con una IP de documentación por escenario.
- **Agregado:** el log del servidor de los e2e va a `e2e-server.log`, y el spec del panel verifica que no tenga errores de prerender ni `auth.user_check_unavailable` falsos. Comprobado: sin el arreglo del DAL, falla con 25 líneas.
- **Agregado:** `E2E_STAFF_EMAIL` y `E2E_STAFF_PASSWORD`, solo para los e2e, comentadas en `.env.example`. Sin ellas, el spec se saltea.
- **Documentado:** TESTING (preparación, qué cubre y qué hacer si falla) y README.

### Corrección F4 · Errores falsos en los logs del panel

- **Corregido:** en el preview de Vercel, cada Server Action del panel (cambiar estado, guardar notas, cerrar sesión) dejaba en los logs, sin que el usuario viera nada:
  - "Next.js encountered the unstable value `Date.now()` while prerendering";
  - `auth.user_check_unavailable` (`AuthRetryableFetchError`), como si Supabase se hubiera caído.

  Venían de una pasada de prerender de Cache Components, en la que el chequeo de sesión de Supabase llama a `Date.now()`. Ahora `getStaffAccess` (DAL) espera a `connection()` antes de tocar Supabase.

- **Verificado** en local con el build de producción y el usuario de prueba: login, detalle, cambio de estado, notas y logout. Antes: 4 errores "while prerendering" y 6 `user_check_unavailable`. Después: 0.
- **Agregado:** un test que verifica que el DAL espera a `connection()` antes de crear el cliente de Supabase.
- **Por qué importa:** `auth.user_check_unavailable` es la señal de que Supabase no responde (ADR-0014). Con estos falsos positivos, una caída real se perdía entre el ruido.

### F4-06 · Link del mail al detalle

- **Agregado:** volver a la página pedida después del login. El link "Ver en el panel" del aviso al estudio lleva a la consulta, aunque haya que iniciar sesión.
  - El proxy redirige a `/admin/login?next=<página y query>` (salvo para `/admin`).
  - El login suma `next` como campo oculto del formulario. Funciona sin JavaScript, y se conserva después de un error.
  - `signIn` redirige a `next`. Si ya tenés sesión de staff, el login te lleva directo a `next`.
- **Seguridad:** `safeNextPath` acepta solo rutas del panel, después de parsear y normalizar la URL, y rechaza `//host`, `\`, esquemas, codificaciones, `..` y el propio login. Amenaza nueva en SPEC §10.2.
- **Cambiado:** `signIn` devuelve `{ redirectTo }`, que la action usa para redirigir.
- **Agregado:** la tabla de ataques de `safeNextPath`, tests del proxy, de `signIn`, de la action y de `LoginSessionCheck`, y e2e del `next` en el redirect y en el login (también uno externo).
- **Documentado:** ARCHITECTURE, README, TESTING (MT-27 nuevo) y SPEC v1.31.

### F4-05 · Detalle y acciones

- **Agregado:** el detalle de una consulta en `/admin/consultas/<id>` (US-06 CA3).
  - **"Cómo contactar"** destacado: el medio seguro y su dato, o "No iniciar contacto" con la explicación (US-03 CA6 y CA7).
  - Datos de la persona, la consulta (el mensaje con sus saltos de línea) y el consentimiento.
  - Teléfono y email **sin links**, para no iniciar el contacto con un toque.
  - Un id inválido o inexistente muestra una 404 dentro del panel.
- **Agregado:** cambio de estado (cualquier estado distinto, FR-11) y notas internas, con `useActionState`. Funcionan sin JavaScript, anuncian el resultado y conservan las notas si el guardado falla.
- **Agregado:** historial con quién, qué y cuándo (FR-12). El evento de notas no guarda el texto.
- **Agregado:** `updateInquiryStatus` y `updateInquiryNotes`.
  - `requireStaffForAction()` primero, después Zod, después el service. El actor siempre es el de la sesión.
  - Cada cambio y su evento van en una transacción interactiva; el mismo valor no escribe nada.
  - `refresh()` actualiza la página.
- **Cambiado:** las actions del panel reciben `(prev, formData)` en lugar de un objeto (SPEC §6.5), como `submitInquiry` y `signIn`.
- **Agregado:** tests del service, de las actions (UNAUTHORIZED, FORBIDDEN, VALIDATION, NOT_FOUND, INTERNAL y OK), de su cableado, de los componentes y `detail.db.test.ts` contra dev. `enums.test.ts` también controla `InquiryEventType`.
- **Documentado:** ARCHITECTURE, README, TESTING (MT-10 detallado) y SPEC v1.29.

### F4-04 · Listado

- **Agregado:** el listado de consultas en `/admin` (US-06 CA2).
  - 20 por página, paginadas en el servidor, de la más nueva a la más vieja.
  - Columnas: fecha y hora del estudio, referencia (link al detalle), nombre y email, área, urgencia, estado y contacto.
  - Badges de estado y urgencia, siempre con texto. **"No iniciar contacto"** destacado cuando no hay un medio seguro (US-03 CA7).
  - Filtros por estado, área y urgencia y búsqueda por nombre o email en un formulario `GET`: quedan en la URL y se pueden compartir. Sin JavaScript.
  - Estados vacíos, paginación que conserva los filtros y un mensaje de error propio del panel si la base no responde.
- **Agregado:** `listInquiries` en el service y `list()` en el repository (`count` + `findMany` en una transacción, sin traer el mensaje, el teléfono ni las notas). `getInquiryService()` en `features/inquiries/server.ts` arma el service con Prisma; también lo usa `submitInquiry`.
- **Agregado:** `siteConfig.timeZone` y `formatDateTime`: el panel muestra la hora del estudio, no la del servidor.
- **Agregado:** `adminPaths.inquiry(id)`, la ruta del detalle, que ahora usa también el mail al estudio.
- **Corregido (lo encontró el test contra dev):** la búsqueda trataba `%` y `_` como comodines, porque Prisma no escapa `contains`. Ahora se escapan (`escapeLike`).
- **Agregado:** tests del service, de las URLs, de `escapeLike`, de los componentes y de `formatDateTime`, y `list.db.test.ts` contra dev.
- **Documentado:** ARCHITECTURE, README, TESTING (MT-26 nuevo) y SPEC v1.28.

### Corrección F4-02 · `staff:add` con un usuario de Auth recreado

- **Corregido:** si un usuario se borraba y se volvía a crear en Supabase Auth (mismo email, id nuevo), `staff:add` fallaba con "StaffStoreError: PrismaClientKnownRequestError": la fila vieja de `staff_members` conservaba el email, que es único. Ahora el script vincula esa fila al usuario nuevo y la reactiva (`relinked`), sin perder su `id`. Si el usuario viejo sigue existiendo, no toca nada y avisa (`email_in_use`).
- **Corregido:** los errores del script muestran el código de Prisma y las columnas (por ejemplo `P2002 (email)`), nunca valores. Antes solo mostraban el nombre del error.
- **Agregado:** tests que reproducen el caso (con el repository falso, que ahora respeta la unicidad como la base), el caso del usuario vigente, la descripción del error y, contra dev, el revinculado y el `P2002` real.
- **Documentado:** README, MT-25 (paso 7), ADR-0015 y SPEC v1.27.

### F4-03 · Login

- **Agregado:** la página `/admin/login`.
  - Email y contraseña con `autocomplete`, sin registro. Funciona sin JavaScript.
  - El mensaje de error es siempre "El email o la contraseña no son correctos.", va en `role="alert"` y recibe el foco.
  - Los errores de formato aparecen junto a cada campo.
  - Si ya tenés sesión de staff, te lleva a `/admin`.
- **Agregado:** aviso para `?error=forbidden` ("Esta cuenta no tiene acceso al panel"), con "Usar otra cuenta", sin decir si la cuenta está inactiva o nunca fue staff.
- **Agregado:** layout común del panel con `noindex, nofollow` y un encabezado propio, sin el shell público. Barra con el nombre del staff y "Cerrar sesión" en las páginas protegidas.
- **Cambiado:** si falla, `signIn` devuelve también el email escrito (`values.email`, nunca la contraseña), para que no se borre al reintentar. SPEC §6.5.
- **Cambiado:** `controlClass` y `focusOutlineClass` pasan a `src/components/forms/field-styles.ts`, compartidos por el formulario de consultas y el login.
- **Agregado:** tests de componente de `LoginForm` y `LoginSessionCheck`, tests de `values` en `signIn`, y el e2e `admin-login.spec.ts` (axe, CSP, teclado, credenciales incorrectas contra Supabase dev y aviso de acceso).
- **Documentado:** ARCHITECTURE, README, TESTING (MT-07 detallado; MT-07 y MT-09 ya se pueden ejecutar). SPEC v1.26.
- **Pendiente:** el refinamiento visual con `/claude-design`.

### F4-02 · Staff y `requireStaff()`

- **Agregado:** autorización del panel ([ADR 0015](docs/adr/0015-autorizacion-del-panel-y-alta-de-staff.md)).
  - **`checkStaffAccess`** verifica el usuario con el servidor de Supabase (`getUser()`) y exige un `StaffMember` activo. Si Supabase o la base no responden, falla cerrado.
  - **`requireStaff()`** (páginas: redirige a `/admin/login` o a `?error=forbidden`), **`requireStaffForAction()`** (actions: `UNAUTHORIZED`, `FORBIDDEN` o `INTERNAL`) y `getCurrentStaff()`. Hacen una sola verificación por request.
  - **Layout protegido** `app/admin/(protected)/layout.tsx`, con la verificación dentro de `<Suspense>` como pide Cache Components, y un `/admin` mínimo que también llama a `requireStaff()`.
- **Agregado:** `npm run staff:add -- --email x --name y`.
  - Busca al usuario en `auth.users` con la conexión de Prisma, sin service role key, y lo da de alta como staff activo.
  - Si ya existía, lo reactiva y le actualiza el nombre.
  - Muestra en qué proyecto de Supabase escribe.
- **Agregado:** `AuthGateway.getVerifiedUser()` en el port, el adapter de Supabase y `FakeAuthGateway`.
- **Agregado:** dependencia de desarrollo `tsx` 4.23.15, para correr el script.
- **Agregado:** tests de acceso (sin sesión, sesión sin staff, staff inactivo, staff OK y servicios caídos), del DAL, del alta de staff y de sus argumentos. Test de integración del repository de staff contra dev, que confirma la lectura de `auth.users`. E2E con una cookie de sesión falsificada.
- **Documentado:** ADR-0015, ARCHITECTURE, README (alta y baja de staff), TESTING (MT-09 detallado, MT-25 nuevo). SPEC v1.25.

### F4-01 · Auth con Supabase

- **Agregado:** sesión y login del staff con Supabase Auth, todo del lado del servidor ([ADR 0014](docs/adr/0014-auth-supabase-ssr-solo-servidor.md)).
  - **`src/proxy.ts`**, solo en `/admin/*`: refresca la sesión con `getClaims()` y, sin sesión, redirige a `/admin/login` (307), conservando las cookies y los headers de no-caché. El sitio público sigue estático y sin cookies.
  - **`signIn` y `signOut`** (`features/auth/actions.ts`):
    - El login aplica primero el rate limit (5 intentos por IP cada 15 minutos), después Zod y después Supabase. Responde siempre "El email o la contraseña no son correctos." ante cualquier rechazo.
    - El logout cierra solo este navegador.
  - **Cookies de sesión** httpOnly, SameSite=Lax y Secure en https (NFR-SEC-07). No hay cliente de Supabase en el navegador.
  - **Port `AuthGateway`** con su adapter de Supabase y `FakeAuthGateway` para tests.
- **Agregado:** dependencias `@supabase/ssr` 0.12.7 y `@supabase/supabase-js` 2.119.2.
- **Cambiado:** `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` pasan a ser **obligatorias**. Hay que cargarlas en `.env.local` y en Vercel (Preview → dev, Production → prod) antes de mergear. La CI y los tests usan valores ficticios.
- **Agregado:** tests del schema, del login con fakes (incluye la misma respuesta para un email inexistente y una contraseña incorrecta, y logs sin datos personales), de las actions, del adapter, del proxy y de las cookies. E2E `admin-redirect.spec.ts`.
- **Documentado:** ADR-0014, ARCHITECTURE, README (sección "Panel admin"), TESTING (MT-08 detallado y MT-24 nuevo, configuración de Supabase Auth). SPEC v1.24: `proxy.ts` va en `src/`.

### F3-08 · E2E del envío

- **Agregado:** `tests/e2e/inquiry-submit.spec.ts`, el envío completo en un navegador real con Turnstile de prueba y los servicios de dev.
  - **Con medio seguro:** desde la página de un área (área preseleccionada) hasta la confirmación con la referencia; verifica en la base la consulta, su evento `CREATED` y la versión de la política, y que no haya violaciones de la CSP.
  - **Sin medio seguro:** la confirmación no promete contacto.
- **Agregado:** `tests/e2e/support/db.ts`, con `pg` y el mismo TLS verificado que la app, para verificar y limpiar. Cada corrida borra sus filas `E2E-` y las de más de un día.
- **Cambiado:** en los e2e, el aviso al estudio va a una dirección de prueba de Resend (sin casilla real), y Playwright **nunca reusa** un servidor abierto: con `npm run dev` corriendo, falla enseguida en lugar de mandar mails a tu casilla.
- **Corregido (lo encontró el e2e):**
  - Al cargar `/contacto`, el formulario estático se reemplazaba por otro (`useSearchParams` + `Suspense`) y se perdía el área elegida antes de que cargara JavaScript (US-03 CA4).
  - Ahora hay un solo formulario, que completa el área de `?area=` solo si sigue vacía (`area-from-query.ts`, con tests).
- **Corregido:** Zod corre en modo `jitless`. Su prueba de `new Function` generaba una violación de la CSP (`'unsafe-eval'`) en el navegador desde la validación del cliente, y con la CSP aplicada (F5-01) estaría prohibida.
- **Aclarado:** en local, Next pone `::1` en `x-forwarded-for`, así que el límite por IP también se cuenta y todos los envíos locales lo comparten. MT-04, `ip.ts` y el README de la feature decían lo contrario. Los e2e usan una IP de documentación propia por escenario. Fuera de Vercel, ese header se puede falsificar si no hay un proxy que lo pise.
- **Documentado:** TESTING (cómo correrlos y qué hacer si fallan) y README. SPEC v1.23.

### F3-07 · Formulario de 2 pasos

- **Agregado:** el formulario "Contanos tu caso" en `/contacto`.
  - **Pasos:** "Tu consulta" (área, urgencia y mensaje) y "Tus datos" (nombre, email, "¿Este email es privado?", teléfono, canal, "¿Es seguro…?" solo con teléfono o WhatsApp, consentimiento y Turnstile).
  - **Sin JavaScript** se ven los dos pasos juntos y aparece un aviso con WhatsApp, teléfono y email.
  - **Errores:** cada uno junto a su campo, más un resumen con links y foco. Se valida en el cliente con el mismo schema antes de enviar.
  - **No se pierde lo escrito:** la action devuelve los valores cuando falla.
  - **Confirmación:** con la referencia; sin un medio seguro, no promete contacto.
  - **Área preseleccionada** con `?area=<slug>`; la página sigue estática.
- **Cambiado:** en `/contacto` el formulario va primero; los datos de contacto después (a la derecha en escritorio). WhatsApp sigue en el header. Se quita el lugar reservado (`InquiryFormSlot`).
- **Corregido durante la tarea:** los controles y botones del formulario usan el contorno de foco global (3:1); `outline-none` de shadcn lo anulaba.
- **Agregado:** tests de componente del formulario (pasos, errores accesibles, preguntas de seguridad, envío, confirmaciones, valores restaurados, área, honeypot, sin JavaScript) y de los `values` de la action. El e2e de la primera pantalla de `/contacto` refleja el orden nuevo. MT-02 detallado y MT-19 actualizado. SPEC v1.22.

### F3-06 · Mails

- **Agregado:** plantillas de React Email.
  - **Aviso al estudio:** destaca "Contactar por: …" o "NO INICIAR CONTACTO", lleva todos los datos de US-05 CA1 y un botón al panel, sin el mensaje.
  - **Acuse neutro:** el nombre, la referencia y la firma con `shortName`, sin área, especialidad ni links.
  - Las dos llevan HTML y texto plano, con `lang="es-AR"`.
- **Agregado:** textos en `content/emails.ts`, preview con `npm run email:dev` y un test de que `shortName` no incluya la especialidad.
- **Cambiado:** `notifications.ts` usa las plantillas en lugar del texto provisorio; la lógica de envío no cambia.
- **Dependencias:** `react-email` 6.11.16 (componentes; `@react-email/components` está deprecado), `@react-email/render` 2.3.1 y `@react-email/ui` 6.11.16 (desarrollo, para el preview).
- **Agregado:** tests del contenido de los dos mails (campos, "No iniciar contacto", sin el mensaje, acuse neutro para las 6 áreas). MT-06 detallado. SPEC v1.21.

### F3-05 · Server Action `submitInquiry`

- **Agregado:** `submitInquiry` con el orden de FR-06 (honeypot → rate limit por IP y por email → validación → Turnstile) y `ActionResult<{ reference, doNotContact }>`. Rate limit caído deja pasar; Turnstile caído rechaza ofreciendo WhatsApp (ADR-0013).
- **Agregado:** mails con `after()`: aviso al estudio siempre (sin el mensaje; con "No iniciar contacto" cuando corresponde) y acuse solo a emails privados. Texto provisorio hasta F3-06. Un fallo se loguea con el ID y no pierde la consulta (FR-08).
- **Agregado:** `lib/security/ip.ts` (IP de `x-forwarded-for` y HMAC con `IP_HASH_SALT`, separado para IP y email) y `labels.ts`.
- **Cambiado:** las variables de la Fase 3 (salvo `DIRECT_URL`) son **obligatorias**: `dev`, `build` y `start` fallan si falta una. La CI usa valores ficticios. `prisma.config.ts` lee solo `DIRECT_URL`.
- **Agregado:** tests de cada rama de la action (OK, VALIDATION, RATE_LIMITED, CAPTCHA_FAILED, honeypot, base y mail caídos, orden de FR-06 y logs sin datos personales), de los mails y de la IP. MT-04, MT-05 y MT-15 detallados. SPEC v1.20.

### F3-04 · Repository y service de consultas

- **Agregado:** `createInquiryService` con `createInquiry`: guarda la consulta con la fecha del consentimiento y la versión de la política (US-07 CA2), solo el hash de la IP y `source` limpio, y devuelve el id y la referencia `C-XXXXXXXX` (FR-09).
- **Agregado:** `createPrismaInquiryRepository`: la consulta y su evento `CREATED` en una escritura atómica (FR-07). Un fallo de la base sale como `InquiryStoreError`, sin datos personales.
- **Agregado:** tests del service con `FakeInquiryRepository`, de la referencia, y `repository.db.test.ts` contra Supabase dev (filas `E2E-`, borradas al final).
- **Cambiado:** Vitest tiene dos proyectos. `unit` (`npm run test`, la CI) y `db` (`npm run test:db`, integración con la base de dev). SPEC v1.19.

### F3-03 · Ports y adapters

- **Agregado:** ports `EmailSender`, `CaptchaVerifier`, `RateLimiter` y `Clock`, que no tiran excepciones por fallas del proveedor (ADR-0013).
- **Agregado:** adapters de Resend (con idempotencia), Turnstile (`siteverify` en el servidor, hostname verificado, 5 s máximo) y Upstash (ventana deslizante; su timeout cuenta como `unavailable`; solo recibe hashes, sin analytics ni telemetría). `lib/adapters/index.ts` los crea recién cuando se usan.
- **Agregado:** fakes para tests (`lib/ports/fakes`), contrato compartido entre el fake y el adapter del rate limiter, y `config/rate-limits.ts` con los límites de SPEC §8.2.
- **Dependencias:** `resend` 6.39.0, `@upstash/ratelimit` 2.2.2, `@upstash/redis` 1.41.1.
- **Decidido (ADR-0013):** con el rate limit caído se deja pasar y se registra en el log; con Turnstile caído se rechaza. Claves de prueba de Turnstile también en Preview. SPEC v1.18.

### F3-02 · Schemas y tipos

- **Agregado:** `inquirySchema` (SPEC §8.1), que recibe lo que manda el formulario y devuelve tipos de dominio. Muestra todos los errores a la vez, incluidas las reglas que dependen del canal. Acepta el apóstrofo `’` del celular.
- **Agregado:** `safeToContact` (obligatorio con teléfono o WhatsApp, `null` con email) y `emailIsPrivate` (obligatorio siempre), los dos sin valor por defecto (US-03 CA6 y CA7).
- **Agregado:** `planContact` en `contact-safety.ts`: medio seguro, "No iniciar contacto" y acuse solo a emails privados, con la tabla completa de casos en sus tests.
- **Agregado:** `updateStatusSchema`, `updateNotesSchema` y `listFiltersSchema` (tolera filtros inválidos en la URL) para el panel; `isHoneypotFilled`; enums de dominio sincronizados con Prisma por test.
- **Cambiado:** política de privacidad **1.1**: contacto solo por un medio seguro, las dos preguntas nuevas y acuse solo a emails privados, sin el motivo de la consulta.
- **Documentado:** MT-03 detallado (se ejecuta en F3-09); MT-18 espera la versión vigente. SPEC v1.17.

### F3-01 · MT-23 pendiente (después de #23)

- **Documentado:** MT-23 queda sin ejecutar hasta tener la URL de la API y la clave pública de Supabase en `.env.local`: pasos 1 a 5 y 7 en dev en F4-01, y el caso completo en prod en F5-08. Nueva sección "Ejecuciones pendientes" en `docs/TESTING.md`, con lo que ya se verificó en F3-01 sin la API pública.

### F3-01 · Supabase y Prisma

- **Agregado:** Prisma 7.10.1 con `@prisma/adapter-pg` (ADR-0012). `prisma/schema.prisma` con el modelo de SPEC §7, `prisma.config.ts` (carga `.env*` como Next y usa `DIRECT_URL` para migrar) y `src/lib/db.ts` (`getDb()`: cliente único y lazy, por el pooler con `DATABASE_URL`).
- **Agregado:** migraciones `init` (enums, tablas, índices) y `enable_rls`: RLS sin políticas en `inquiries`, `inquiry_events`, `staff_members` y `_prisma_migrations` (NFR-SEC-03).
- **Agregado:** scripts `db:generate`, `db:migrate` y `db:deploy`; `postinstall` y `typecheck` generan el cliente en `src/generated/prisma` (fuera de git).
- **Agregado:** tests de `db.ts`, `db-tls.ts` y `prisma/__tests__/rls.test.ts` (toda tabla nueva necesita RLS); caso manual MT-23.
- **Seguridad:** override de `effect` a 3.22.5 para `@prisma/config` (GHSA-7589-6fvf-x4pw, alta); quitarlo cuando Prisma lo actualice.
- **Seguridad:** las conexiones a la base usan TLS verificado contra la CA de Supabase (`prisma/certs/supabase-ca.crt`, `src/lib/db-tls.ts`). Sin esto, `pg` conectaba en texto plano. Las URLs con parámetros `ssl*` se rechazan, y "Enforce SSL" queda activado en Supabase.
- **Aplicado en Supabase dev:** las dos migraciones. RLS activado sin políticas en las 4 tablas de `public`. Consultas y transacciones probadas a través del pooler.
- **Documentado:** formato de las URLs de Supabase en `.env.example`, sección "Base de datos" del README y flujo de datos en la arquitectura. SPEC v1.16.

### F2-07 · Ícono y datos en un solo lugar (después de #20)

- **Corregido:** la pestaña mostraba el logo de Next.js. Ahora el ícono y el de inicio del celular se generan con el monograma del estudio (`monogram` en `site.config.ts`), y `/favicon.ico` lleva al mismo ícono.
- **Cambiado:** los teléfonos de ayuda y la dirección de la OVD están en un solo lugar (`urgent-help.ts`); la pregunta sobre violencia de "Cuidado personal" se arma desde ahí, con el mismo texto que antes.
- **Corregido:** `tests/e2e/home.spec.ts` lee la jurisdicción de la configuración: pasar a otro estudio ya no rompe los e2e. SPEC v1.15.

### F2-08 · Cierre de fase

- **Documentado:** caso MT-01 (celular real); README con el checklist para pasar a un estudio real, probado en una copia limpia con otro estudio; arquitectura al cierre del sitio público.
- **Corregido en docs:** pasos de MT-11 (orden del foco después de "Saltar al contenido") y versión del encabezado del SPEC; MT-13 suma la revisión del deploy.
- **Especificado para F3 (SPEC v1.14):** el aviso al estudio dice si es seguro contactar; `emailIsPrivate`, acuse neutro solo a emails privados y, sin un medio seguro, el estudio no inicia el contacto. Ítems agregados a F3-02, F3-06 y F3-07 de la guía.

### F2-07 · Pulido visual y accesibilidad

- **Corregido:** anillo de foco invisible (1:1) en el CTA final; frase de confidencialidad tapada por WhatsApp en el hero (ahora va arriba del botón); CTA de las áreas fuera de la primera pantalla en celulares; áreas táctiles de los datos de contacto y del footer (44 px); headings y landmarks (axe sin violaciones de ningún nivel).
- **Agregado:** 404 y página de error en español, con salidas a inicio y contacto (FR-16).
- **Cambiado:** banner de demo corto en celulares; preguntas de Contacto debajo del formulario; sin rótulo repetido en las tarjetas de área; rótulo "Vigente desde el" en Privacidad (no cambia ninguna cláusula, sigue la versión 1.0).
- **Agregado:** `tests/e2e/quality.spec.ts` (contraste del foco, primera pantalla sin tapar, axe, áreas táctiles, reflow, 404), tests de las páginas de error y casos MT-12 y MT-21. SPEC v1.12.
- **Agregado (revisión de diseño, SPEC v1.13):** ayuda ante peligro (911, 137 opción 1, 144 y OVD) en footer, Contacto y áreas de familia; aviso para plazos con teléfono y horario; jurisdicción CABA en Inicio y áreas; botón en el encabezado de Nosotros; página actual marcada en el menú.
- **Cambiado:** el paso 2 ya no promete una llamada; la ficha del hero muestra profesionales y matrícula; la confianza va antes de "Cómo trabajamos"; Contacto muestra primero los canales que funcionan; índice de preguntas en dos columnas en celulares.
- **Corregido:** WhatsApp ya no tapa texto (header fijo hasta 1379 px, flotante desde 1380); el menú mobile se cierra al salir con Tab o tocar afuera; el botón principal entra a 320×568 con banner; sin scroll horizontal con 305 px útiles; migas e índices de 44 px; el test de contraste del foco espera el fin de las transiciones; el índice fijo de Privacidad scrollea en ventanas bajas, así su último link no queda inalcanzable.
- **Corregido (después de #18):** sin scroll horizontal con la letra del navegador al 125% desde 320 px: debajo de `lg` el nombre del estudio puede partir en dos líneas. Al 150–200% queda para F5-03.
- **Seguridad:** sin `NEXT_PUBLIC_DEMO_MODE` el modo demo queda encendido (ADR-0011). **Un estudio real necesita `false` explícito.**
- **Especificado para F3:** `safeToContact`, "¿es seguro que te contactemos por ese medio?".
- **Conocido:** el 404 de un área inexistente se dibuja con JavaScript; aceptado, se revisa en F4 (ADR-0009).

### F2-06 · SEO técnico

- **Agregado:** `/sitemap.xml` (11 URLs), `/robots.txt` (excluye `/admin`) e imagen Open Graph generada en el build.
- **Agregado:** canonical y Open Graph completo en cada página con `buildPageMetadata`; JSON-LD `LegalService`, `FAQPage`, `Service` y `BreadcrumbList` con serialización segura (`<JsonLd>`).
- **Agregado:** `noindex, nofollow` en modo demo (ADR-0010) y horarios estructurados en `siteConfig.openingHours`.
- **Cambiado:** Vitest fija variables públicas de prueba, porque las páginas ahora las leen al importarse.
- **Agregado:** tests de serialización, builders, metadata, sitemap, robots y colores; e2e de SEO y de `og:image` en cada tipo de página; caso manual MT-20. SPEC v1.10.
- **Decidido:** el SEO de Lighthouse se mide sobre un build local con el modo demo apagado. SPEC v1.11.
- **Documentado:** `ARCHITECTURE.md` y `TESTING.md` al día con la Fase 2.

### F2-05 · Contacto (sin formulario funcional todavía)

- **Agregado:** `/contacto` con el tiempo de respuesta en la apertura, el lugar reservado del formulario (`#formulario`, con un aviso y alternativas), datos de contacto (WhatsApp destacado, teléfono, email, dirección con link a Google Maps, horarios y confidencialidad) y preguntas destacadas. Los CTA "Contanos tu caso" del sitio dejan de dar 404.
- **Agregado:** componentes `ContactDetails` e `InquiryFormSlot`; textos en `src/content/contact-page.ts`.
- **Decidido:** mapa como link y no como embed (CSP, sin cookies de terceros y mejor rendimiento). La página es estática; en F3 el formulario lee `?area=` del lado del cliente.
- **Agregado:** tests de la página, de los componentes y del contenido; e2e de status (con y sin `?area=`), CTA del header y de un área, WhatsApp, axe, sin iframes y sin scroll horizontal; caso manual MT-19. SPEC v1.9.

### F2-04 · Nosotros, Preguntas frecuentes y Privacidad

- **Agregado:** `/nosotros` (enfoque, profesionales con matrícula y formación desde `siteConfig`, y valores), `/preguntas-frecuentes` (los 4 grupos con índice de anclas y links a las preguntas de cada área) y `/privacidad`.
- **Agregado:** política de privacidad **versión 1.0** (vigente desde el 21/11/2026) en `src/content/legal/privacy.ts`, conforme a la Ley 25.326: responsable, datos, finalidad, carácter obligatorio, proveedores con nombre y transferencia internacional, conservación de 24 meses, seguridad, derechos, cookies y avisos obligatorios de la AAIP. Borrador pendiente de revisión jurídica.
- **Agregado:** componentes `PageHeader`, `ProfessionalCard`, `TableOfContents` y `LegalDocument`; helpers `getFaqsByGroup` y `formatLongDate`.
- **Cambiado:** `/areas` y `/areas/[slug]` usan `PageHeader`; la miga "Inicio" se comparte desde `home.ts`.
- **Agregado:** tests de contenido (incluidos los avisos de la AAIP literales), de páginas y de componentes; e2e de status, axe, scroll horizontal, link del footer e índices; caso manual MT-18. SPEC v1.8.

### F2-03 · Áreas de práctica

- **Agregado:** `/areas` (índice con las 5 áreas y un CTA para temas fuera de la lista) y `/areas/[slug]` con migas de pan, introducción, "¿Cuándo consultar?", documentación orientativa, preguntas frecuentes del área, "Otras áreas" y CTA con el área preseleccionada (`/contacto?area=<slug>`). Metadata propia por página (US-02 CA2; JSON-LD en F2-06).
- **Agregado:** componentes `PracticeAreaGrid` (compartido con el inicio), `Breadcrumbs` y `ContentList`; textos en `src/content/area-pages.ts`; helper `getAreaContactHref`.
- **Agregado:** las 5 áreas se generan en el build; un slug desconocido responde **404 real** gracias a `ensureStatic = 'navigation'` (ADR-0009), porque `dynamicParams = false` no es compatible con Cache Components y sin esa opción la respuesta era 200 con `noindex`.
- **Agregado:** tests de las dos páginas, de los componentes y del contenido; e2e de navegación, status 200/404, CTA con área, axe y scroll horizontal; caso manual MT-17. SPEC v1.7.

### F2-02 · Inicio

- **Agregado:** página de inicio completa (US-01): hero con CTA visible sin scroll en mobile, 5 tarjetas de áreas, "Cómo trabajamos" en 3 pasos, señales de confianza (matrículas, dirección, horarios, confidencialidad y tiempo de respuesta), 3 preguntas destacadas y CTA final.
- **Agregado:** componentes `Hero`, `SectionHeading`, `PracticeAreaCard`, `ProcessSteps`, `TrustBar`, `FaqList` (con `<details>` nativo, sin JS) y `CtaSection` en `src/components/marketing`; textos en `src/content/home.ts`.
- **Agregado:** tests de componentes y de la página, y e2e del CTA sin scroll en 375×667, links de áreas y preguntas operables con teclado.
- **Cambiado:** la frase "La primera conversación es confidencial" pasa a `siteConfig.confidentialityNote` (la usan el inicio y el footer). SPEC v1.6.
- **Cambiado (diseño):** en desktop, el hero suma una ficha con dirección, horario y tiempo de respuesta (tomados de `siteConfig`); las 5 tarjetas de áreas quedan centradas en filas de 3 / 2; los pasos de "Cómo trabajamos" se unen con una línea; el bloque de confianza es una sola ficha con divisiones e íconos de trazo fino (`FactLabel`); las preguntas frecuentes van en dos columnas; el espaciado de las secciones es responsive.
- **Cambiado:** el menú de escritorio aparece desde `lg` (1024 px), porque a 768 px no entraba. El botón de WhatsApp es más chico en mobile.
- **Agregado:** e2e sin scroll horizontal en 360/768/1024/1440 px y de la grilla de áreas en desktop; caso manual MT-16; nota en el README sobre el CSS desactualizado en `next dev`.

### F2-01 · Contenido como datos

- **Agregado:** `src/content/practice-areas.ts` con las 5 áreas de FR-02 (slug, código del enum `PracticeArea`, resumen, qué es, cuándo consultar, documentación, preguntas frecuentes y metadata) y `src/content/faqs.ts` con 10 preguntas generales en 4 grupos, 3 destacadas para el inicio. Textos en borrador, pendientes de revisión del estudio.
- **Agregado:** tests de integridad del contenido (slugs únicos y aptos para URL, campos obligatorios, largos de metadata, cantidad de preguntas, sin preguntas repetidas) y de las reglas de SPEC §11.4 (sin promesas de resultado, autoelogios ni testimonios, y sin datos del estudio repetidos fuera de `site.config.ts`).
- **Cambiado:** la guía de avance marca la Fase 1 como completa.

## Fase 1 — Fundaciones

### F1-09 · Cierre de fase — 19/11/2026

- **Cambiado:** Dependabot ignora las versiones major de `@types/node` (debe coincidir con Node 24) y de `typescript` (typescript-eslint todavía no soporta TypeScript 7.0; se cerró el PR #7).
- **Cambiado:** dependencias actualizadas por Dependabot: React 19.3.1, Tailwind CSS 4.3.5 (#6) y ESLint 10 (#8), verificadas con lint, typecheck, tests, build y e2e.
- **Verificado:** producción responde con el layout de F1-07 y los headers de seguridad de F1-06. El banner de demo requiere `NEXT_PUBLIC_DEMO_MODE=true` en las variables de Vercel.

### F1-08 · Documentación inicial — 19/11/2026 (#12)

- **Agregado:** README completo (qué es, cómo correrlo, variables, scripts, estructura, seguridad, CI y deploy), `docs/ARCHITECTURE.md` con diagramas, `docs/adr/` con las ADR 0001–0008 y su índice, `docs/TESTING.md` con la guía de tests manuales (plantilla, índice MT-01–15 y MT-11, MT-13 y MT-14 detallados) y este changelog.
- **Agregado:** test que verifica que los links relativos de la documentación apunten a archivos existentes.

### F1-07 · Sistema de diseño base y layout — 19/11/2026 (#11)

- **Agregado:** shadcn/ui (base Radix) con button, input, textarea, label, select, radio-group, checkbox, card, badge y sonner (tema claro fijo, sin `next-themes`).
- **Agregado:** tokens de diseño (marfil, verde azulado y terracota; un solo tema claro) con test de contraste WCAG AA, y tipografías Lora + Plus Jakarta Sans con `next/font`.
- **Agregado:** `src/config/site.config.ts` con datos ficticios del estudio y helper de link de WhatsApp.
- **Agregado:** layout público con link para saltar al contenido, banner de demo, header con menú mobile accesible, footer con señales de confianza y disclaimer, y botón flotante de WhatsApp. `lang="es-AR"` y metadata base.
- **Agregado:** e2e de layout, teclado y accesibilidad con axe.
- **Cambiado:** el inicio pasa al grupo de rutas `(public)` como página provisoria. SPEC v1.5.
- **Quitado:** recursos de la plantilla de create-next-app.

### F1-06 · Headers de seguridad — 18/11/2026 (#10)

- **Agregado:** HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY` y CSP en modo report-only en todas las rutas; sin `X-Powered-By`.
- **Agregado:** tests unitarios y e2e de los headers, incluido uno que falla si el inicio genera violaciones de la CSP. SPEC v1.4.

### F1-05 · CI en GitHub Actions — 18/11/2026 (#5)

- **Agregado:** workflow de CI (install, lint, typecheck, format:check, test, build y audit) con acciones fijadas por SHA, Dependabot semanal para npm y GitHub Actions, y Node 24 fijado (`.nvmrc` y `engines`).
- **Cambiado:** el audit bloqueante cubre solo dependencias de producción y el completo es informativo, por GHSA-fc5q-39xc-vjpf (`picomatch`, sin corrección). Se deja sin efecto la rama `dev`. SPEC v1.3.

### F1-04 · Estructura y configuración de entorno — 18/11/2026 (#4)

- **Agregado:** variables de entorno validadas con Zod (públicas y privadas) que hacen fallar `dev`, `build` y `start` si falta una obligatoria; `.env.example` completo.
- **Agregado:** `ActionResult` con helpers, logger JSON sin datos personales y READMEs de la estructura de carpetas. SPEC v1.2.
- **Corregido:** el primer PR de la tarea (#2/#3) no llevaba el código; se volvió a integrar en #4.

### F1-03 · Tooling y scripts — 18/11/2026 (#1, llegó a `main` con #3)

- **Agregado:** TypeScript estricto (`noUncheckedIndexedAccess`), Prettier integrado con ESLint, Vitest + Testing Library, Playwright con smoke test y todos los scripts de la guía.
- **Agregado:** `.gitattributes` con finales de línea LF y `.gitignore` para reportes de tests.

### F1-02 · Documentos de trabajo en el repo — 18/11/2026

- **Agregado:** `CLAUDE.md`, `docs/SPEC.md` y `docs/GUIA_DE_AVANCE.md`.

### F1-01 · Proyecto base desplegado — 18/11/2026

- **Agregado:** proyecto Next.js con TypeScript, Tailwind, App Router, ESLint y carpeta `src/`, desplegado en Vercel.
