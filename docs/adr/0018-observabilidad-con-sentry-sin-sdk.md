# 0018. Observabilidad: catálogo de eventos, errores no capturados y avisos con Sentry sin SDK

- **Estado:** Aceptada
- **Fecha:** 27/11/2026
- **Relacionado:** SPEC NFR-OBS-01, NFR-SEC-06, §15 ("¿Sentry o solo los logs de Vercel?"), FR-08; tarea F5-04; ADR [0013](0013-ports-sin-excepciones-y-caidas-de-servicios.md) y [0016](0016-csp-aplicada-con-unsafe-inline.md).

## Contexto

- El logger ya escribía JSON sin datos personales (lista blanca de campos), pero los nombres de eventos eran texto libre y no había un catálogo.
- Los errores que **nadie captura** los imprimía Next a su manera (mensaje y stack), sin pasar por nuestro formato.
- El plan gratuito de Vercel **guarda los logs de runtime 1 hora** (Pro: 1 día). Un `inquiry.firm_email_failed` (el estudio no recibió el aviso de una consulta nueva) desaparece si nadie mira a tiempo.
- La opción obvia, el SDK de Sentry (`@sentry/nextjs`), es una dependencia pesada, agrega JavaScript al navegador (Lighthouse), obliga a abrir la CSP a Sentry y por defecto manda datos de la request (headers, IP, cuerpo), que habría que filtrar.

## Decisión

- **Catálogo tipado** (`src/lib/log-events.ts`): el logger solo acepta esos eventos. Un test verifica que cada uno se use con su nivel y que la tabla de `docs/ARCHITECTURE.md` coincida.
- **`instrumentation.ts`**: `onRequestError` loguea todo error no capturado como `request.error`, por la lista blanca: nombre del error, `digest` de Next, ruta como **patrón** y tipo. Nunca el mensaje, la URL, los headers ni las cookies. Las páginas de error muestran el `digest`, para encontrar un reporte en el log.
- **Avisos con Sentry, sin SDK**: un port `ErrorReporter` y un adapter que hace un `fetch` al endpoint de *envelopes* de Sentry. Todo evento `error` del logger, ya filtrado, se reporta en segundo plano (`after()` dentro de una request; `onRequestError` espera el envío, como pide Next).
  - **Qué se manda:** el evento (como mensaje y agrupación), los códigos y nombres como tags, los ids como extra, el entorno (`VERCEL_ENV`) y la versión (`VERCEL_GIT_COMMIT_SHA`). Exactamente los campos que ya puede escribir el logger: **ningún dato personal**, ni mensajes ni stacks.
  - **Opcional:** solo con `SENTRY_DSN`. Sin ella, todo queda en los logs de Vercel.
  - **Nunca falla hacia afuera** (ADR 0013): con Sentry caído o lento (3 s como máximo), se sigue. Ante un 429 descarta eventos mientras dura el límite, sin reintentar, como pide Sentry.
  - **Solo errores del servidor.** Los del navegador no se reportan: necesitarían código cliente y abrir la CSP.
- **Política de privacidad, sin cambios:** Sentry no recibe datos personales de quienes consultan ni del staff (solo ids aleatorios y códigos). Si el estudio prefiere nombrarlo igual como proveedor, se agrega y se sube la versión de la política.

## Alternativas consideradas

- **Solo logs de Vercel:** simple, pero con 1 hora de retención y sin avisos, un error grave puede pasar inadvertido.
- **`@sentry/nextjs`:** ver Contexto. Más funciones (trazas, errores del navegador), con más peso, más superficie y más trabajo para no filtrar datos.
- **Log drains de Vercel:** requieren el plan Pro.
- **Avisar por mail con Resend:** justo el caso más importante (falla Resend) no podría avisarse.

## Consecuencias

- Un evento nuevo se agrega al catálogo y a la tabla de ARCHITECTURE, o el build o los tests fallan.
- `SENTRY_DSN` (opcional) se carga en Vercel: Production y, si se quiere, Preview (el entorno queda como tag).
- Next sigue imprimiendo su propia línea por cada error no capturado, con el mensaje. Es aceptable porque nuestro código solo tira errores genéricos (los de la base se envuelven antes); queda como riesgo residual en `SECURITY_REVIEW.md`.
- Si algún día se necesitan trazas o errores del navegador, reevaluar el SDK con su configuración de privacidad (`sendDefaultPii: false`, `beforeSend`).
