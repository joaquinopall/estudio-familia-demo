# 0007. Content Security Policy en report-only y sin nonces

- **Estado:** Aceptada (se revisa en F5-01)
- **Fecha:** 18/11/2026
- **Relacionado:** SPEC NFR-SEC-04, NFR-SEC-05, §6.1 (SSG), NFR-PERF-01, tarea F1-06

## Contexto

Una CSP estricta se arma normalmente con **nonces** por request. En Next.js eso obliga a renderizar **todas** las páginas en cada request: se pierde el render estático (SSG), la caché de CDN y parte del rendimiento, que son requisitos del proyecto. Además, aplicar una CSP antes de conocer todos los recursos (Turnstile, Supabase, la barra de Vercel en los previews) puede romper el sitio.

## Decisión

- Los headers de seguridad se definen en `src/lib/security/headers.ts` y se aplican a todas las rutas con `headers()` de `next.config.ts`.
- La CSP se envía como **`Content-Security-Policy-Report-Only`** durante las Fases 1 a 4: no bloquea, y las violaciones aparecen en la consola del navegador.
- **Sin nonces:** `script-src` incluye `'unsafe-inline'` para los scripts inline que Next genera en páginas estáticas. `'unsafe-eval'` solo en desarrollo.
- Como `frame-ancestors` no se aplica en modo report-only, **`X-Frame-Options: DENY`** es la protección efectiva contra clickjacking mientras tanto.
- Sin endpoint de reportes (requeriría una API route, que el proyecto limita a webhooks y health check).
- Un e2e verifica que el inicio carga sin violaciones de la política.

## Alternativas consideradas

- Nonces vía `proxy`: CSP más fuerte, pero todas las páginas pasan a dinámicas.
- Aplicar la CSP desde el principio: riesgo de romper recursos que todavía no existen.

## Consecuencias

- Se mantiene el SSG y la caché.
- `'unsafe-inline'` debilita la protección contra XSS por scripts inline; se mitiga con el escape de React y la prohibición de `dangerouslySetInnerHTML` (salvo JSON-LD con helper).
- **F5-01** decide cómo aplicar la CSP: evaluar el SRI experimental de Next (hashes en build) o aplicarla con `'unsafe-inline'`, sumando Supabase y `vercel.live` según haga falta.
