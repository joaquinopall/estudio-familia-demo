# `src/lib/ports`

Interfaces (puertos) de los servicios externos que usan los services (SPEC §6.1, NFR-ESC-02). Los services dependen de estas interfaces, nunca de un SDK concreto, así se puede cambiar de proveedor o simularlo en tests.

| Puerto            | Archivo               | Para qué                                 | Adapter real (`src/lib/adapters`) |
| ----------------- | --------------------- | ---------------------------------------- | --------------------------------- |
| `EmailSender`     | `email-sender.ts`     | Enviar mails                             | `ResendEmailSender`               |
| `CaptchaVerifier` | `captcha-verifier.ts` | Verificar el token anti-bots (servidor)  | `TurnstileVerifier`               |
| `RateLimiter`     | `rate-limiter.ts`     | Limitar intentos por clave               | `UpstashRateLimiter`              |
| `Clock`           | `clock.ts`            | Obtener la hora actual (testeable)       | `systemClock`                     |
| `FieldCipher`     | `field-cipher.ts`     | Cifrar el mensaje y las notas en la base | `AesGcmFieldCipher` (ADR-0017)    |
| `ErrorReporter`   | `error-reporter.ts`   | Avisar errores del servidor (opcional)   | `SentryErrorReporter` (ADR-0018)  |

## Contrato ([ADR-0013](../../../docs/adr/0013-ports-sin-excepciones-y-caidas-de-servicios.md))

- **Ningún port tira excepciones por fallas del proveedor:** devuelven un resultado (`unavailable`, `invalid`, `{ ok: false }`) y el caller decide qué hacer.
- **Excepción: `FieldCipher.decrypt`** tira `FieldDecryptionError`. No es una caída de un proveedor sino un dato que no se puede leer (clave que falta o dato alterado), y nunca se puede mostrar como texto ([ADR-0017](../../../docs/adr/0017-cifrado-de-campos-a-nivel-de-aplicacion.md)).
- **Claves del rate limit:** siempre un hash hexadecimal de 64 caracteres, nunca un email ni una IP. Si no, `InvalidRateLimitKeyError`.
- Las reglas del rate limit están en [`src/config/rate-limits.ts`](../../config/rate-limits.ts).

## Fakes para tests (`fakes/`)

`FixedClock`, `FakeEmailSender` (guarda los mails y puede fallar), `FakeCaptchaVerifier` (respuesta configurable) y `FakeRateLimiter` (ventana deslizante en memoria y caída simulada). **Solo para tests:** nunca los importes desde el código de la app.

```ts
const clock = new FixedClock("2026-11-24T12:00:00Z");
const rateLimiter = new FakeRateLimiter(clock);
const emailSender = new FakeEmailSender();
emailSender.failWith("network_error"); // para el caso de mail caído (FR-08)
```
