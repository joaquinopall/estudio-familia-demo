# Feature `inquiries` (consultas)

Todo lo relacionado con una consulta (`Inquiry`): el formulario público, el guardado, los mails y la gestión desde el panel.

| Archivo / carpeta | Contenido                                                                     | Tarea        |
| ----------------- | ----------------------------------------------------------------------------- | ------------ |
| `schema.ts`       | `inquirySchema`, `updateStatusSchema`, `listFiltersSchema` (SPEC §8)          | F3-02        |
| `types.ts`        | Tipos de dominio                                                              | F3-02        |
| `repository.ts`   | Acceso a Prisma (consulta + evento `CREATED` en transacción)                  | F3-04        |
| `service.ts`      | `createInquiry`, `listInquiries`, `getInquiry`, `changeStatus`, `updateNotes` | F3-04, F4    |
| `actions.ts`      | `submitInquiry`, `updateInquiryStatus`, `updateInquiryNotes`                  | F3-05, F4-05 |
| `emails/`         | Plantillas React Email: aviso al estudio y acuse al consultante               | F3-06        |
| `components/`     | `InquiryForm` (cliente), `InquiryTable`, `StatusBadge`, …                     | F3-07, F4-04 |
| `__tests__/`      | Tests unitarios y de integración de la feature                                | F3, F4       |
