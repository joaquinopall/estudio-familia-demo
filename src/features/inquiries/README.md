# Feature `inquiries` (consultas)

Todo lo relacionado con una consulta (`Inquiry`): el formulario público, el guardado, los mails y la gestión desde el panel.

| Archivo / carpeta   | Contenido                                                                                           | Tarea        |
| ------------------- | --------------------------------------------------------------------------------------------------- | ------------ |
| `schema.ts`         | `inquirySchema`, `updateStatusSchema`, `updateNotesSchema`, `listFiltersSchema`, honeypot (SPEC §8) | F3-02 ✅     |
| `types.ts`          | Enums y tipos de dominio (sincronizados con Prisma por test)                                        | F3-02 ✅     |
| `contact-safety.ts` | `planContact`: medio seguro, "No iniciar contacto" y acuse (US-03 CA5–CA7)                          | F3-02 ✅     |
| `repository.ts`     | Acceso a Prisma (consulta + evento `CREATED` en transacción)                                        | F3-04        |
| `service.ts`        | `createInquiry`, `listInquiries`, `getInquiry`, `changeStatus`, `updateNotes`                       | F3-04, F4    |
| `actions.ts`        | `submitInquiry`, `updateInquiryStatus`, `updateInquiryNotes`                                        | F3-05, F4-05 |
| `emails/`           | Plantillas React Email: aviso al estudio y acuse al consultante                                     | F3-06        |
| `components/`       | `InquiryForm` (cliente), `InquiryTable`, `StatusBadge`, …                                           | F3-07, F4-04 |
| `__tests__/`        | Tests unitarios y de integración de la feature                                                      | F3, F4       |

## Reglas de validación (`schema.ts`)

- `inquirySchema` recibe lo que manda el formulario (`Object.fromEntries(formData)`: textos, `"true"`/`"false"` en las preguntas sí/no, `"on"` en la casilla) y devuelve tipos de dominio. Descarta las claves desconocidas, como el token de Turnstile y el honeypot.
- **Todos los errores salen a la vez** (US-03 CA2), incluidas las reglas que dependen del canal. Para eso cada campo usa **una sola regla con un solo mensaje**, sin `pipe`, `abort` ni `z.stringbool`: un campo "abortado" hace que Zod saltee las reglas condicionales. `schema.test.ts` lo verifica campo por campo; si agregás un campo, sumalo a ese test.
- Los mensajes están en `INQUIRY_MESSAGES` y no repiten lo que escribió la persona.
- El honeypot (`website`) no pasa por el schema: la action lo revisa primero con `isHoneypotFilled` (FR-06).

## Medio seguro (`contact-safety.ts`)

`planContact({ preferredChannel, safeToContact, emailIsPrivate })` devuelve por dónde puede iniciar el contacto el estudio:

- el canal elegido, si es teléfono o WhatsApp y es seguro;
- si no, el email, solo si es privado;
- si no hay ninguno, `doNotContact: true` ("No iniciar contacto").

El acuse sale solo si el email es privado. Lo usan la confirmación, los mails y el panel: no repitas la regla en otro lado. La tabla completa de casos está en `__tests__/contact-safety.test.ts`.
