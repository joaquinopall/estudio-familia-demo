# `src/lib/adapters`

Implementaciones concretas de los puertos de [`src/lib/ports`](../ports/README.md).

| Archivo                   | Implementa        | Proveedor                                                                                        |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| `resend-email-sender.ts`  | `EmailSender`     | Resend (SDK `resend`)                                                                            |
| `turnstile-verifier.ts`   | `CaptchaVerifier` | Cloudflare Turnstile (`siteverify` por `fetch`, sin SDK)                                         |
| `upstash-rate-limiter.ts` | `RateLimiter`     | Upstash Redis (`@upstash/ratelimit`, ventana deslizante)                                         |
| `system-clock.ts`         | `Clock`           | Hora del sistema                                                                                 |
| `aes-gcm-field-cipher.ts` | `FieldCipher`     | AES-256-GCM de `node:crypto` (ADR-0017)                                                          |
| `index.ts`                | —                 | `getEmailSender()`, `getCaptchaVerifier()`, `getRateLimiter()`, `getClock()`, `getFieldCipher()` |

Reglas:

- Son el **único** lugar donde se importan los SDKs de Resend y Upstash, y donde se llama a Turnstile.
- Importan `server-only`, salvo `aes-gcm-field-cipher.ts`: no tiene secretos propios (recibe las claves) y los e2e lo usan para sembrar consultas cifradas. Solo `index.ts` lee `src/lib/env.ts`; cada adapter recibe su configuración por parámetro, así se testea sin red.
- No contienen reglas de negocio: solo traducen entre el puerto y el proveedor.
- Las Server Actions toman los ports de `index.ts` y se los pasan a los services. Los services nunca importan este directorio.

Detalles por proveedor:

- **Turnstile:** verifica en el servidor (`siteverify`) con la clave secreta y la IP. Acepta solo si Cloudflare responde `success` **y** el hostname es el del sitio (`example.com` con las claves de prueba). Espera como máximo 5 segundos, sin reintentos.
- **Upstash:** prefijo `rl:<regla>`, sin analytics ni telemetría, y 2 segundos como máximo. Su timeout se informa como `unavailable`.
- **Resend:** el remitente sale de `EMAIL_FROM`. Acepta una clave de idempotencia para no mandar dos veces el mismo mail.
