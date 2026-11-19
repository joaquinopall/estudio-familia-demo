# 0006. Validación de variables de entorno al arrancar, separadas en públicas y privadas

- **Estado:** Aceptada
- **Fecha:** 18/11/2026
- **Relacionado:** SPEC §9, NFR-SEC-09, tarea F1-04

## Contexto

Una variable faltante o mal escrita suele descubrirse tarde: en producción, cuando un usuario dispara el código que la usa. Además, en Next.js las variables `NEXT_PUBLIC_*` se incrustan en el JavaScript del navegador, y un secreto importado por error desde un componente cliente se filtraría.

## Decisión

- Los schemas Zod viven en `src/lib/env.schema.ts`, un módulo puro (sin `server-only` ni alias `@/`).
- **`next.config.ts` valida todas las variables al cargar**, así fallan `next dev`, `next build` y `next start` antes de servir nada. El mensaje nombra la variable y la regla, **nunca el valor**.
- Acceso en runtime solo por dos puntos de entrada:
  - `src/lib/env.ts` (con `server-only`): públicas + privadas, para código de servidor.
  - `src/lib/env.public.ts`: solo `NEXT_PUBLIC_*`, leídas de forma explícita para que Next las incruste.
- Solo son obligatorias las variables que usa la fase actual; el resto es opcional (pero se valida su formato si viene) hasta su fase. Un string vacío cuenta como ausente.
- `.env.example` documenta todas las variables; un test lo mantiene sincronizado con los schemas.

## Alternativas consideradas

- Validar en el layout raíz: solo falla si alguna página se prerenderiza, y no cubre `next start`.
- `@t3-oss/env-nextjs`: resuelve lo mismo, pero es una dependencia extra para unas 40 líneas propias.
- Escape tipo `SKIP_ENV_VALIDATION`: invita a desactivar la protección; la CI usa valores ficticios.

## Consecuencias

- Un deploy con variables incompletas falla en el build, con un mensaje claro, en lugar de romperse en producción.
- Vercel (Preview y Production) y la CI necesitan `NEXT_PUBLIC_SITE_URL` definida.
- Cada fase que empiece a usar una variable la vuelve obligatoria en el schema y actualiza `.env.example`.
