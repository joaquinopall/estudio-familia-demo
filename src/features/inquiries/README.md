# Feature `inquiries` (consultas)

Todo lo relacionado con una consulta (`Inquiry`): el formulario público, el guardado, los mails y la gestión desde el panel.

| Archivo / carpeta   | Contenido                                                                                                                                     | Tarea        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `schema.ts`         | `inquirySchema`, `updateStatusSchema`, `updateNotesSchema`, `listFiltersSchema`, honeypot (SPEC §8)                                           | F3-02 ✅     |
| `types.ts`          | Enums y tipos de dominio (sincronizados con Prisma por test)                                                                                  | F3-02 ✅     |
| `contact-safety.ts` | `planContact`: medio seguro, "No iniciar contacto" y acuse (US-03 CA5–CA7)                                                                    | F3-02 ✅     |
| `reference.ts`      | `toReference(id)` → `C-7F3A9B21` (FR-09)                                                                                                      | F3-04 ✅     |
| `errors.ts`         | Errores de dominio: `InquiryStoreError`, `InvalidInquiryInputError`                                                                           | F3-04 ✅     |
| `repository.ts`     | Acceso a Prisma: consulta + evento `CREATED` en una escritura atómica                                                                         | F3-04 ✅     |
| `service.ts`        | `createInquiry` ✅ (F3-04); `listInquiries`, `getInquiry`, `changeStatus`, `updateNotes` (F4)                                                 | F3-04, F4    |
| `actions.ts`        | `submitInquiry` ✅ (F3-05); `updateInquiryStatus`, `updateInquiryNotes` (F4-05)                                                               | F3-05, F4-05 |
| `submit-inquiry.ts` | Lógica de `submitInquiry` con dependencias por parámetro (orden de FR-06)                                                                     | F3-05 ✅     |
| `notifications.ts`  | Aviso al estudio y acuse (texto provisorio con las reglas de privacidad) y su envío                                                           | F3-05 ✅     |
| `labels.ts`         | Nombres en español de áreas, urgencias, canales y estados                                                                                     | F3-05 ✅     |
| `emails/`           | Plantillas React Email: aviso al estudio (`new-inquiry-email.tsx`) y acuse (`inquiry-receipt-email.tsx`); `render.ts` las pasa a HTML y texto | F3-06 ✅     |
| `form-values.ts`    | Lo que escribió la persona, para devolverlo cuando hay error (US-03 CA4)                                                                      | F3-07 ✅     |
| `components/`       | `InquiryFormSection`, `InquiryForm` y sus partes ✅ (F3-07); `InquiryTable`, `StatusBadge`, … (F4-04)                                         | F3-07, F4-04 |
| `__tests__/`        | Tests unitarios y de integración de la feature                                                                                                | F3, F4       |

## Reglas de validación (`schema.ts`)

- `inquirySchema` recibe lo que manda el formulario (`Object.fromEntries(formData)`: textos, `"true"`/`"false"` en las preguntas sí/no, `"on"` en la casilla) y devuelve tipos de dominio. Descarta las claves desconocidas, como el token de Turnstile y el honeypot.
- **Todos los errores salen a la vez** (US-03 CA2), incluidas las reglas que dependen del canal. Para eso cada campo usa **una sola regla con un solo mensaje**, sin `pipe`, `abort` ni `z.stringbool`: un campo "abortado" hace que Zod saltee las reglas condicionales. `schema.test.ts` lo verifica campo por campo; si agregás un campo, sumalo a ese test.
- Los mensajes están en `INQUIRY_MESSAGES` y no repiten lo que escribió la persona.
- El honeypot (`website`) no pasa por el schema: la action lo revisa primero con `isHoneypotFilled` (FR-06).

## Guardar una consulta (`service.ts` + `repository.ts`)

```ts
// En la action (F3-05): el único lugar que conecta las piezas reales.
const service = createInquiryService({
  repository: createPrismaInquiryRepository(getDb()),
  clock: getClock(),
  privacyPolicyVersion: privacyPolicy.version,
});
const { id, reference } = await service.createInquiry(data, { ipHash, source });
```

- El service declara la interfaz `InquiryRepository` y el repository la cumple: el service nunca importa Prisma.
- La consulta y su evento `CREATED` se guardan juntos, en una escritura anidada de Prisma que es atómica (FR-07).
- `consentAt` sale del `Clock` y `privacyPolicyVersion` de la política vigente (US-07 CA2). La casilla de consentimiento no se guarda como tal.
- `ipHash` tiene que ser un hash de 64 caracteres (si no, `InvalidInquiryInputError`): una IP cruda nunca llega a la base. `source` se recorta a 100 caracteres.
- Si la base falla, sale `InquiryStoreError`, sin datos personales en el mensaje; la action lo traduce a `INTERNAL`.
- **Tests:** `service.test.ts` usa `FakeInquiryRepository` (`__tests__/fake-inquiry-repository.ts`). `repository.db.test.ts` prueba Prisma contra Supabase dev con `npm run test:db`.

## Enviar una consulta (`actions.ts` + `submit-inquiry.ts`)

`submitInquiry(prev, formData)` es la Server Action del formulario (`useActionState(submitInquiry, null)`). Devuelve `ActionResult<{ reference, doNotContact }>`: con `doNotContact` la confirmación sabe si puede prometer contacto, aun sin JavaScript (US-03 CA3).

Orden (FR-06, de lo más barato a lo más caro):

1. **Honeypot** (`website`) lleno → éxito falso, sin guardar ni mandar nada.
2. **Rate limit** por IP (5 cada 10 minutos) y por email (3 por hora), con claves HMAC (`lib/security/ip.ts`) → `RATE_LIMITED`. Si Upstash no responde, se deja pasar y se loguea `rate_limit.unavailable`. La IP sale de `x-forwarded-for`: en Vercel la pone la plataforma; en local, Next pone `::1`, así que **todos los envíos locales comparten el límite de 5 cada 10 minutos**. Si no hay IP, se saltea esa regla (`rate_limit.no_client_ip`).
3. **Validación** con `inquirySchema` → `VALIDATION` con los errores por campo.
4. **Turnstile** (token `cf-turnstile-response`) → `CAPTCHA_FAILED`. Si Cloudflare no responde, también, pero con un mensaje que ofrece WhatsApp (ADR-0013).
5. **`createInquiry`** con el hash de la IP → si la base falla, `INTERNAL`.
6. **Mails con `after()`**, después de responder: el aviso al estudio siempre, y el acuse solo si el email es privado (ver "Mails"). Un fallo se loguea con el `inquiryId` y la consulta ya está guardada (FR-08).

`actions.ts` solo lee la IP de los headers y arma las dependencias reales. Toda la lógica está en `submit-inquiry.ts`, y sus tests cubren cada rama con fakes, incluido que ningún log tenga datos personales.

## Formulario (`components/`)

`InquiryFormSection` (servidor) es la sección `#formulario` de `/contacto` y dibuja **un solo** `InquiryForm`. Cuando carga en el navegador, el formulario lee `?area=<slug>` y completa el área solo si sigue vacía (`area-from-query.ts`); la página sigue estática. No uses `useSearchParams` con `Suspense`: React reemplazaría el formulario al cargar y se perdería lo elegido.

- **Dos pasos en un solo `<form>`:** "Tu consulta" (área, urgencia y mensaje) y "Tus datos". Los pasos solo ocultan partes, así que volver no borra nada. **Sin JavaScript** se ven los dos juntos y la action valida igual; Turnstile necesita JavaScript, por eso hay un `<noscript>` con WhatsApp, teléfono y email.
- **Validación:** "Siguiente" y "Enviar" validan en el cliente con el mismo `inquirySchema` (`form-validation.ts`). Si hay errores no se envía nada, así no se gasta rate limit; el servidor valida igual.
- **Errores (US-03 CA2):** cada uno junto a su campo (`aria-invalid` y `aria-describedby`), y un resumen arriba con `role="alert"`, links a cada campo y foco. Si un error es del paso 1, el formulario vuelve a ese paso.
- **Nada se pierde (CA4):** cuando falla, la action devuelve `values` y el formulario los usa como valores por defecto. React 19 vacía el formulario después de enviar, y sin JavaScript la página se vuelve a dibujar desde cero.
- **Preguntas de seguridad (CA6, CA7):** sin respuesta marcada por defecto. "¿Es seguro…?" aparece solo con teléfono o WhatsApp.
- **Confirmación (CA3):** la referencia y, si `doNotContact`, el pedido de guardarla, sin prometer contacto. Recibe el foco.
- **Controles nativos** (`<select>`, radios, casilla): funcionan sin JavaScript. Usan el contorno de foco global del sitio: no les pongas `outline-none` (lo controla `tests/e2e/quality.spec.ts`).
- **Turnstile:** `turnstile-widget.tsx` carga el script de Cloudflare y se reinicia después de un error, porque el token sirve una sola vez.
- **Honeypot:** campo `website` fuera de la vista, fuera del orden del teclado y con `aria-hidden`.
- **Textos** en `src/content/inquiry-form.ts`. Tests en `components/__tests__/inquiry-form.test.tsx`.

## Mails (`emails/`)

- **Aviso al estudio** (`new-inquiry-email.tsx`):
  - Arriba, destacado: "Contactar por: …" (el medio seguro según `planContact`) o **"NO INICIAR CONTACTO"**.
  - Después: referencia, nombre, área, urgencia, canal preferido, si es seguro contactarla y si el email es privado, y el botón al panel.
  - **Nunca el mensaje.**
- **Acuse** (`inquiry-receipt-email.tsx`): solo el nombre, la referencia y la firma (`siteConfig.shortName`). Sin área, urgencia, especialidad, mensaje ni links. Sale solo si el email es privado.
- **Textos** en `src/content/emails.ts`; los estilos van en línea (`styles.ts`), con los colores de la marca y fuentes del sistema.
- **Preview:** `npm run email:dev` y abrí `http://localhost:3001`. Cada plantilla tiene datos de ejemplo ficticios en `PreviewProps`.
- **Tests:** `__tests__/emails.test.tsx` revisa el contenido en el HTML y en el texto plano. Si agregás un dato al acuse, el test de neutralidad tiene que seguir pasando para las 6 áreas.

## Medio seguro (`contact-safety.ts`)

`planContact({ preferredChannel, safeToContact, emailIsPrivate })` devuelve por dónde puede iniciar el contacto el estudio:

- el canal elegido, si es teléfono o WhatsApp y es seguro;
- si no, el email, solo si es privado;
- si no hay ninguno, `doNotContact: true` ("No iniciar contacto").

El acuse sale solo si el email es privado. Lo usan la confirmación, los mails y el panel: no repitas la regla en otro lado. La tabla completa de casos está en `__tests__/contact-safety.test.ts`.
