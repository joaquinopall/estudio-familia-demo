# Feature `auth` (acceso al panel)

Login del staff con Supabase Auth y autorización del panel `/admin` (SPEC §6.4).

| Archivo         | Contenido                                                      | Tarea |
| --------------- | -------------------------------------------------------------- | ----- |
| `dal.ts`        | Data Access Layer: `requireStaff()` y `getCurrentStaff()`      | F4-02 |
| `actions.ts`    | `signIn` y `signOut` (con rate limit y mensajes genéricos)     | F4-01 |
| `repository.ts` | Acceso a `StaffMember` vía Prisma                              | F4-02 |
| `__tests__/`    | Tests: sin sesión, sesión sin staff, staff inactivo y staff OK | F4-02 |

Regla (NFR-SEC-02): **toda** página y action del admin llama a `requireStaff()`. El `proxy` es solo una primera barrera.
