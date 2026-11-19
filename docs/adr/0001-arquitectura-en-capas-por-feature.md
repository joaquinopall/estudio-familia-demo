# 0001. Arquitectura en capas con ports & adapters, organizada por feature

- **Estado:** Aceptada
- **Fecha:** 18/11/2026
- **Relacionado:** SPEC §6.1, §6.2, NFR-MANT-01, NFR-ESC-02

## Contexto

La demo tiene que poder revenderse y adaptarse a estudios reales sin reescribirse. Eso exige que la lógica de negocio (qué pasa cuando llega una consulta, quién puede cambiar su estado) sea fácil de testear y no dependa de Next.js, de Prisma ni de los proveedores externos (Resend, Turnstile, Upstash), que pueden cambiar.

## Decisión

El código se organiza **por feature** (`src/features/inquiries`, `src/features/auth`) y dentro de cada una en capas con dependencias hacia adentro:

- **Server Actions** (`actions.ts`): finas. Parsean con Zod, chequean auth, llaman al service y devuelven `ActionResult<T>`.
- **Services** (`service.ts`): reglas de negocio puras. Reciben repositorios y ports por parámetro o factory.
- **Repositories** (`repository.ts`): único lugar que toca Prisma.
- **Ports** (`src/lib/ports`): interfaces de servicios externos (`EmailSender`, `CaptchaVerifier`, `RateLimiter`, `Clock`), implementadas por **adapters** (`src/lib/adapters`).

## Alternativas consideradas

- Organizar por tipo de archivo (`actions/`, `services/`…): dispersa cada feature en muchas carpetas.
- Lógica directamente en las Server Actions: más rápido al principio, pero imposible de testear sin Next y acoplado a los SDKs.

## Consecuencias

- Los services se testean con fakes de repos y ports, sin base de datos ni red.
- Cambiar de proveedor (por ejemplo, de Resend a otro servicio de mail) es escribir un adapter nuevo.
- Más archivos por feature; se compensa con READMEs en cada carpeta y con esta convención fija.
