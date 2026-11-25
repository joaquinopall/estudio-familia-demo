# Feature `auth` (acceso al panel)

Login del staff con Supabase Auth y autorización del panel `/admin` (SPEC §6.4, [ADR 0014](../../../docs/adr/0014-auth-supabase-ssr-solo-servidor.md)).

| Archivo         | Contenido                                                                                                    | Tarea |
| --------------- | ------------------------------------------------------------------------------------------------------------ | ----- |
| `schema.ts`     | `signInSchema`: email normalizado y contraseña no vacía (sin el mínimo de 12: lo aplica Supabase)            | F4-01 |
| `sign-in.ts`    | Lógica de `signIn` (rate limit por IP → Zod → `AuthGateway`) y `signOutWith`, con dependencias por parámetro | F4-01 |
| `actions.ts`    | Server Actions `signIn` (redirect a `/admin`) y `signOut` (redirect a `/admin/login`)                        | F4-01 |
| `dal.ts`        | Data Access Layer: `requireStaff()` y `getCurrentStaff()`                                                    | F4-02 |
| `repository.ts` | Acceso a `StaffMember` vía Prisma                                                                            | F4-02 |
| `__tests__/`    | Schema, handler con fakes y actions (F4-01); sin sesión, sin staff, staff inactivo y OK (F4-02)              | F4-01 |

Piezas fuera de la feature: `src/proxy.ts` y `src/lib/supabase/` (cliente de servidor, sesión del proxy, cookies y adapter), y el port `src/lib/ports/auth-gateway.ts`.

Reglas:

- **Toda** página y action del admin llama a `requireStaff()` (NFR-SEC-02). El `proxy` es solo una primera barrera.
- El login nunca revela si una cuenta existe: cualquier rechazo da "El email o la contraseña no son correctos.".
- Nunca se loguean el email ni la contraseña; solo códigos de error.
