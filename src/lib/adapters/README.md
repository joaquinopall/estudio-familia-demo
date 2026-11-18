# `src/lib/adapters`

Implementaciones concretas de los puertos de [`src/lib/ports`](../ports/README.md): `ResendEmailSender`, `TurnstileVerifier` y `UpstashRateLimiter`.

Reglas:

- Son el **único** lugar donde se importan los SDKs de Resend, Turnstile y Upstash.
- Importan `server-only` y leen sus credenciales de `src/lib/env.ts`.
- No contienen reglas de negocio: solo traducen entre el puerto y el proveedor.

Se crean en la tarea **F3-03**.
