# 0013. Ports sin excepciones y qué hacer si un servicio externo se cae

- **Estado:** Aceptada
- **Fecha:** 24/11/2026
- **Relacionado:** SPEC §6.1, §8.2, FR-06, FR-08, NFR-ESC-02, NFR-SEC-06, ADR-0001, ADR-0004, ADR-0005, tareas F3-03 y F3-05

## Contexto

El envío de una consulta depende de tres servicios externos: Upstash (rate limit), Cloudflare Turnstile (anti-bots) y Resend (mails). Cualquiera puede tardar o caerse. Quien consulta puede estar en una situación urgente o de riesgo, así que un servicio caído no debería impedirle escribir. Pero tampoco puede dejar el formulario abierto a bots.

Dos datos de los proveedores (documentación revisada el 24/11/2026):

- Si Redis no responde a tiempo, Upstash Ratelimit **deja pasar** la consulta (`success: true` con `reason: "timeout"`). Visto desde afuera, es igual a una consulta permitida.
- Las claves de prueba de Turnstile responden siempre con hostname `example.com`.

## Decisión

**Contrato de los ports** (`src/lib/ports`): ningún adapter tira excepciones por fallas del proveedor. Devuelven resultados tipados:

- `RateLimiter.limit(rule, key)` → `allowed`, `limited` (con `retryAfterSeconds`) o `unavailable`. El timeout de Upstash se informa como `unavailable`, no como `allowed`.
- `CaptchaVerifier.verify({ token, remoteIp })` → `ok`, `invalid` o `unavailable`. Los errores de configuración propia o de Cloudflare (`invalid-input-secret`, `internal-error`, timeout de 5 segundos) son `unavailable`; los del token, `invalid`.
- `EmailSender.send(message)` → `{ ok: true, id }` o `{ ok: false, errorCode }`.
- La única excepción es un error de programación: una clave de rate limit que no es un hash (`InvalidRateLimitKeyError`). Upstash nunca recibe un email ni una IP.

**Qué hace la action si un servicio no está disponible** (F3-05; en el login, F4-01):

| Servicio caído | Qué pasa | Por qué |
| --- | --- | --- |
| Rate limit (Upstash) | **Se deja pasar** y se loguea `rate_limit.unavailable` | No bloquear a alguien en una urgencia. El honeypot y Turnstile siguen protegiendo. En el login, Supabase Auth tiene su propio límite. |
| Turnstile | **Se rechaza** (`CAPTCHA_FAILED`), con un mensaje que ofrece WhatsApp | Sin verificación, durante la caída el formulario queda abierto a bots que disparan mails. |
| Mail (Resend) | La consulta **ya está guardada**. Se loguea el error con el ID (FR-08, ADR-0005) | El estudio la ve igual en el panel. |

**Turnstile por entorno:** claves de prueba en local, test, CI **y Preview de Vercel**; claves reales solo en Production. Con las claves de prueba, el adapter espera el hostname `example.com`; con las reales, el de `NEXT_PUBLIC_SITE_URL`.

**Composición:** `src/lib/adapters/index.ts` crea cada adapter recién cuando se usa, con un error claro si falta una variable. Los services reciben los ports por parámetro y nunca importan adapters.

## Alternativas consideradas

- Ports que tiran excepciones: cada caller tiene que acordarse del `try/catch`, y un caso olvidado termina en un error 500.
- Rechazar si el rate limit no está disponible: bloquea a todos durante una caída de Upstash, justo a quien necesita escribir.
- Dejar pasar si Turnstile no está disponible: durante la caída solo quedan el honeypot y el rate limit (si funciona).
- Claves reales de Turnstile en Preview: las URLs de preview cambian en cada PR y el widget real las rechaza.

## Consecuencias

- Los tests de services y actions cubren cada rama con los fakes de `src/lib/ports/fakes`, sin `try/catch`.
- Un mismo test de contrato corre contra el fake y contra el adapter real del rate limiter.
- **El anti-bot real se prueba recién en producción** (MT-02 en F5). En Preview, Turnstile siempre aprueba.
- Hay que vigilar los logs `rate_limit.unavailable` y `captcha.unavailable`: si aparecen seguido, un servicio está fallando.
