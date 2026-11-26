# 0016. CSP aplicada, con `'unsafe-inline'` y la barra de Vercel solo en Preview

- **Estado:** Aceptada
- **Fecha:** 26/11/2026
- **Relacionado:** SPEC NFR-SEC-04, NFR-SEC-05, §10.2 (XSS, clickjacking), §6.1 (SSG), tarea F5-01. Reemplaza a la [ADR 0007](0007-csp-report-only-sin-nonces.md).

## Contexto

Desde F1-06 la CSP iba en modo `Content-Security-Policy-Report-Only` (ADR 0007): no bloqueaba nada. NFR-SEC-05 pide aplicarla en la Fase 5 sin romper Turnstile, Supabase ni Vercel.

- El sitio usa Cache Components y Partial Prerendering. Las páginas estáticas llevan scripts inline de Next: el arranque y el payload RSC (`self.__next_f.push(...)`).
- Con **nonces**, todas las páginas pasan a dinámicas. La guía de CSP de Next 16 dice que eso es incompatible con PPR.
- El **SRI experimental** de Next (`experimental.sri`) agrega `integrity` a los scripts externos, pero no hashea los inline. Lo probé el 26/11/2026 en un build local, con la política sin `'unsafe-inline'`. Resultado: 26 violaciones en el inicio, 25 en `/contacto` y 6 en `/admin/login`. En las tres páginas el navegador bloqueó los scripts inline y la página quedó sin hidratar.
- Supabase no necesita entrar en la política. Desde la ADR 0014 no hay cliente de Supabase en el navegador: todo Auth pasa por el servidor.
- La barra de Vercel (comentarios) aparece solo en los deploys de Preview, y Vercel documenta los orígenes que necesita.

## Decisión

- La CSP se envía como **`Content-Security-Policy`**, aplicada, en todas las rutas y en todos los entornos, también en `next dev`. Se arma en `src/lib/security/headers.ts`.
- `script-src` mantiene **`'unsafe-inline'`**. `'unsafe-eval'` sigue solo en desarrollo.
- Orígenes externos: solo **Turnstile** (`https://challenges.cloudflare.com`, en script y frame).
- **Barra de Vercel, solo en Preview.** `next.config.ts` lee `VERCEL_ENV`, la variable de sistema de Vercel, validada con `parseVercelEnv` en `env.schema.ts`. Si vale `preview`, se suman los orígenes de la [documentación de Vercel](https://vercel.com/docs/vercel-toolbar/managing-toolbar): `https://vercel.live` (script, style, img, font, connect y frame), `https://vercel.com` (img), `https://assets.vercel.com` (font) y `wss://ws-us3.pusher.com` (connect). En producción, local y CI no se suman.
- `frame-ancestors 'none'` ahora protege contra clickjacking. `X-Frame-Options: DENY` se queda para navegadores sin CSP nivel 2.
- Sin `upgrade-insecure-requests`: HSTS ya fuerza https y todos los recursos son propios o https.
- Sin endpoint de reportes, igual que antes. La garantía son los e2e: todas las páginas públicas, la 404, el login, el envío con Turnstile y el panel con sesión, sin violaciones (`tests/e2e/support/csp.ts`).

## Alternativas consideradas

- **Nonces vía `proxy`:** CSP más fuerte, pero todas las páginas pasan a dinámicas y se pierde PPR. Va contra §6.1 y NFR-PERF-01.
- **SRI experimental sin `'unsafe-inline'`:** rompe la hidratación (ver Contexto).
- **Hashes de los scripts inline:** cambian en cada build y con cada contenido; Next no los calcula. Mantenerlos a mano no es viable.
- **Apagar la barra de Vercel** en vez de habilitar sus orígenes: es configuración del proyecto en Vercel, que decide el dueño. Si la apaga, el código no necesita cambios.

## Consecuencias

- La política ahora bloquea: un recurso nuevo de un origen externo (un script, un iframe, una fuente, analytics) falla hasta que se agregue a `headers.ts`, con su test.
- `'unsafe-inline'` deja abierta la ejecución de scripts inline inyectados. La defensa contra XSS sigue siendo el escape de React y la prohibición de `dangerouslySetInnerHTML` (salvo JSON-LD con su helper). La CSP sí bloquea scripts, frames y conexiones a orígenes ajenos, `<object>`, `<base>` y formularios hacia otro sitio, y que el sitio se muestre dentro de un iframe.
- Revisar cuando Next permita CSP estricta con páginas estáticas (por ejemplo, hashes de los scripts inline en el build).
