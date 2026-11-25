# Feature `auth` (acceso al panel)

Login del staff con Supabase Auth y autorización del panel `/admin` (SPEC §6.4, [ADR 0014](../../../docs/adr/0014-auth-supabase-ssr-solo-servidor.md) y [ADR 0015](../../../docs/adr/0015-autorizacion-del-panel-y-alta-de-staff.md)).

| Archivo                              | Contenido                                                                                                                                   | Tarea        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `schema.ts`                          | `signInSchema` (login) y `staffMemberInputSchema` (`staff:add`)                                                                             | F4-01, F4-02 |
| `sign-in.ts`                         | Lógica de `signIn` (rate limit por IP → Zod → `AuthGateway`) y `signOutWith`, con dependencias por parámetro                                | F4-01        |
| `actions.ts`                         | Server Actions `signIn` (redirect a `/admin`) y `signOut` (redirect a `/admin/login`)                                                       | F4-01        |
| `types.ts`                           | `StaffMember` y `AuthUser` del dominio, sin Prisma                                                                                          | F4-02        |
| `access.ts`                          | `checkStaffAccess` (pura): `ok`, `unauthenticated`, `forbidden` o `unavailable`; y cómo se traduce a redirect o `ActionResult`              | F4-02        |
| `dal.ts`                             | `requireStaff()` (páginas), `requireStaffForAction()` (actions) y `getCurrentStaff()`, con `cache()` por request                            | F4-02        |
| `staff-service.ts`                   | `addStaffMember` (idempotente) y la interfaz `StaffRepository`                                                                              | F4-02        |
| `repository.ts`                      | `StaffRepository` con Prisma; lee `auth.users` con `$queryRaw` parametrizado                                                                | F4-02        |
| `staff-add-args.ts`                  | Argumentos de `npm run staff:add` (el script está en `scripts/staff-add.ts`)                                                                | F4-02        |
| `components/login-form.tsx`          | Formulario de login (cliente, `useActionState(signIn)`), accesible y sin JavaScript obligatorio                                             | F4-03        |
| `components/login-session-check.tsx` | En `/admin/login`: redirige al staff a `/admin` y muestra el aviso de `?error=forbidden`                                                    | F4-03        |
| `components/sign-out-button.tsx`     | "Cerrar sesión" / "Usar otra cuenta": un `<form>` con la action `signOut`                                                                   | F4-03        |
| `errors.ts`                          | `StaffStoreError`                                                                                                                           | F4-02        |
| `__tests__/`                         | Login, actions, acceso (sin sesión, sin staff, inactivo, OK, servicios caídos), DAL, alta de staff y repository contra dev (`*.db.test.ts`) | F4-01, F4-02 |

Piezas fuera de la feature: `src/proxy.ts`, `src/lib/supabase/` (cliente de servidor, sesión del proxy, cookies y adapter), el port `src/lib/ports/auth-gateway.ts` y el layout `src/app/admin/(protected)/layout.tsx`.

Reglas:

- **Toda** página del admin llama a `await requireStaff()`, aunque su layout ya lo haga (NFR-SEC-02). El `proxy` es solo una primera barrera.
- **Toda** action del admin empieza con `const auth = await requireStaffForAction(); if (!auth.ok) return auth;`.
- El login nunca revela si una cuenta existe: cualquier rechazo da "El email o la contraseña no son correctos.".
- Nunca se loguean el email, el nombre ni la contraseña; solo IDs y códigos de error.
