# 0004. Anti-abuso: honeypot + rate limit (Upstash) + Turnstile

- **Estado:** Aceptada (se implementa en F3-03 y F3-05)
- **Fecha:** 18/11/2026
- **Relacionado:** SPEC FR-06, §8.2, §10.2

## Contexto

El formulario de consulta es público y dispara mails (al estudio y un acuse a quien consulta). Sin protección, recibe spam y puede usarse para mandar mails a terceros.

## Decisión

Tres capas anti-abuso (honeypot, rate limit y Turnstile), aplicadas junto con la validación en este orden en `submitInquiry`:

1. **Honeypot** (campo oculto `website`): si viene lleno, se responde un éxito falso y no se guarda nada.
2. **Rate limit** con Upstash Redis: 5 consultas por IP cada 10 minutos y 3 por email por hora. La IP se guarda solo como HMAC.
3. **Validación** con Zod.
4. **Cloudflare Turnstile**, verificado del lado del servidor con la clave secreta, la IP y el hostname esperado.

El orden va de lo más barato a lo más caro. En dev, test y CI se usan las claves de prueba oficiales de Turnstile.

## Alternativas consideradas

- reCAPTCHA: más fricción para el usuario y más rastreo.
- Solo honeypot: no frena bots dirigidos.
- Rate limit en memoria: no funciona con varias instancias serverless (NFR-ESC-01).

## Consecuencias

- Dependencia de dos servicios externos (Upstash y Cloudflare), aislados detrás de ports.
- Hay que testear cada rama: honeypot, `RATE_LIMITED`, `VALIDATION` y `CAPTCHA_FAILED`.
- El login del admin también usa rate limit (5 intentos por IP cada 15 minutos).
