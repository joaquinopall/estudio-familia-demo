# 0014. Supabase Auth solo del lado del servidor, con el proxy limitado al panel

- **Estado:** Aceptada
- **Fecha:** 25/11/2026
- **Relacionado:** SPEC §6.4, §6.5, §8.2, §9, §10.2, NFR-SEC-02, NFR-SEC-07, NFR-SEC-10, NFR-PERF-01, ADR-0002, ADR-0013, tarea F4-01

## Contexto

El panel `/admin` necesita login con email y contraseña (US-06 CA1). ADR-0002 ya eligió Supabase Auth y descartó la service role key. Quedaban por decidir varias cosas:

- **Dónde corre el login:** en el navegador, con el SDK, o en el servidor.
- **Cookies:** cómo protegerlas. `@supabase/ssr` las crea con `httpOnly: false` para que un cliente de navegador pueda leerlas, y NFR-SEC-07 pide httpOnly.
- **El proxy de Next 16 (antes middleware):** dónde se ubica y qué rutas cubre. La guía de Supabase lo corre en todas las rutas.
- **Variables:** si las de Supabase siguen opcionales, como en las fases anteriores.

Datos de las versiones instaladas (revisados el 25/11/2026):

- Next 16.4 exige `proxy.ts` al lado de `app/`: con `src/`, en `src/proxy.ts`. En la raíz no se ejecuta.
- `@supabase/ssr` 0.12 le pasa a `setAll` los headers `Cache-Control`/`Expires`/`Pragma` para que ninguna CDN guarde una respuesta con la sesión de otra persona.
- `getClaims()` verifica el JWT (localmente si el proyecto usa claves asimétricas) y refresca la sesión si está por vencer. `getSession()` no es confiable en el servidor.
- `signOut({ scope: 'local' })` borra la sesión de este navegador antes de llamar al servidor de Supabase.

## Decisión

1. **Todo Supabase Auth corre en el servidor.** `signIn` y `signOut` son Server Actions (`features/auth/actions.ts`) y no hay cliente de navegador (`lib/supabase/client.ts` no existe). El navegador nunca habla con Supabase.
2. **Cookies httpOnly, SameSite=Lax y Secure** (`lib/supabase/cookie-options.ts`). Secure se activa si `NEXT_PUBLIC_SITE_URL` es https (siempre en Vercel); en `http://localhost` queda apagado para que la sesión funcione en desarrollo.
3. **El proxy está en `src/proxy.ts` y cubre solo `/admin/:path*`.**
   - `lib/supabase/session.ts` llama a `getClaims()` y, sin sesión, redirige a `/admin/login`. Ese redirect conserva las cookies y los headers de no-caché.
   - Si `getClaims()` falla, se trata como "sin sesión": falla cerrado.
   - Es solo la primera barrera. `requireStaff()` (F4-02) verifica con `getUser()` en cada página y action (NFR-SEC-02).
4. **Port `AuthGateway`** (`lib/ports/auth-gateway.ts`) con su adapter de Supabase (`lib/supabase/auth-gateway.ts`). Igual que los demás ports (ADR-0013), no tira excepciones: devuelve `ok`, `invalid_credentials`, `rate_limited` o `unavailable`. Se crea por request porque lee y escribe las cookies de esa request.
5. **Login:**
   - Va primero el rate limit por IP (5 cada 15 minutos, también los intentos mal formados), después Zod y después Supabase.
   - Un solo mensaje para cualquier rechazo: "El email o la contraseña no son correctos." No revela si la cuenta existe.
   - Si Upstash está caído, el intento pasa y se registra en el log (ADR-0013), porque Supabase tiene su propio límite.
   - El 429 de Supabase se traduce a `RATE_LIMITED`; un error de red o un 5xx, a `INTERNAL`.
6. **Logout con `scope: 'local'`:** cierra solo este navegador. Si Supabase falla, se loguea y la persona igual va al login, porque las cookies ya se borraron.
7. **`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` son obligatorias desde F4-01.** Un deploy sin ellas falla al arrancar, en vez de dejar el panel roto.
8. **Fuera del código (lo configura el dueño en cada proyecto de Supabase):** registro público deshabilitado y contraseña mínima de 12 caracteres (NFR-SEC-10). El schema del login no exige el mínimo: lo aplica Supabase al crear la contraseña.

## Alternativas consideradas

- **Login en el navegador con `createBrowserClient`:** obliga a cookies legibles por JavaScript (un script inyectado podría leer los tokens), agrega Supabase a la CSP `connect-src` y suma JavaScript al panel.
- **Matcher global del proxy (como la guía de Supabase):** corre el proxy y refresca cookies en las páginas públicas, que no usan sesión y tienen que seguir estáticas (NFR-PERF-01).
- **`getUser()` en el proxy:** es una llamada de red en cada request del panel. `getClaims()` alcanza para la primera barrera, y la verificación contra el servidor de Supabase queda en `requireStaff()`.
- **Rechazar el login si Upstash está caído:** dejaría al estudio afuera de su panel por una caída ajena.
- **`signOut()` global (el default):** cerraría también las sesiones del mismo usuario en otros dispositivos, y si no hay red no cierra ni la de este navegador.
- **Dejar las variables de Supabase opcionales:** un deploy sin ellas arrancaría y el panel fallaría recién al usarlo.

## Consecuencias

- La clave pública no aparece en el JavaScript del panel y la CSP no cambia.
- Si en algún momento hace falta un cliente de navegador (por ejemplo, para algo en tiempo real), hay que revisar esta ADR: con cookies httpOnly no funcionaría.
- **Hay que cargar las dos variables** en `.env.local` y en Vercel (Preview → dev, Production → prod) **antes de mergear**. La CI y los tests usan valores ficticios.
- **Vigilar en los logs:** `auth.sign_in_unavailable` y `auth.session_check_failed` (Supabase no responde), y que `rate_limit.unavailable` no aparezca seguido.
- **Hasta F4-03 no existe la página `/admin/login`:** el redirect muestra la 404.
