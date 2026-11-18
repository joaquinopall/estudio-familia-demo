# `src/lib/ports`

Interfaces (puertos) de los servicios externos que usan los services (SPEC §6.1, NFR-ESC-02). Los services dependen de estas interfaces, nunca de un SDK concreto, así se pueden cambiar de proveedor o simular en tests.

| Puerto            | Para qué                               | Adapter real (`src/lib/adapters`) |
| ----------------- | -------------------------------------- | --------------------------------- |
| `EmailSender`     | Enviar mails                           | `ResendEmailSender`               |
| `CaptchaVerifier` | Verificar el token anti-bots           | `TurnstileVerifier`               |
| `RateLimiter`     | Limitar intentos por clave (IP, email) | `UpstashRateLimiter`              |
| `Clock`           | Obtener la hora actual (testeable)     | reloj del sistema                 |

Se crean en la tarea **F3-03**, junto con fakes para los tests.
