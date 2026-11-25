# 0015. Autorización del panel con `requireStaff()` y alta de staff por script

- **Estado:** Aceptada
- **Fecha:** 25/11/2026
- **Relacionado:** SPEC §6.2, §6.4, §6.5, §7, §9, NFR-SEC-02, US-06 CA4, ADR-0002, ADR-0013, ADR-0014, tarea F4-02

## Contexto

F4-01 dejó la sesión y el proxy, que es una barrera optimista: solo mira que el JWT sea válido. Falta decidir quién puede usar el panel y cómo se da de alta a alguien:

- **Usuarios y staff:** cualquier usuario de Supabase Auth tiene una sesión válida, pero solo un `StaffMember` activo puede ver el panel (US-06 CA4). El registro público está deshabilitado (NFR-SEC-10), pero un usuario puede existir sin ser staff, o dejar de serlo.
- **Vincular al usuario:** el alta (`staff:add`, SPEC §7) necesita el `id` del usuario en `auth.users`. La Admin API de Supabase exige la service role key, que §9 prohíbe.
- **Cache Components:** leer cookies en un layout exige un `<Suspense>`, o el build falla con *blocking route*.
- **Renderizado parcial de Next:** un layout no se vuelve a ejecutar en cada navegación del lado del cliente, así que no alcanza con chequear ahí.

## Decisión

1. **`checkStaffAccess`** (`features/auth/access.ts`, pura) decide el acceso:
   - `AuthGateway.getVerifiedUser()` usa `getUser()`, que consulta al servidor de Auth: así detecta una sesión revocada aunque el JWT siga vigente.
   - Después busca el `StaffMember` por `authUserId`.
   - El resultado es `ok`, `unauthenticated`, `forbidden` (sin staff o inactivo, con la misma respuesta hacia afuera) o `unavailable` (Supabase o la base no responden).
2. **`dal.ts`** (`server-only`) la conecta con las piezas reales, con `cache()` de React para hacer una sola verificación por request:
   - `requireStaff()` para páginas y layouts: sin sesión o con un servicio caído redirige a `/admin/login`; sin acceso, a `/admin/login?error=forbidden`.
   - `requireStaffForAction()` para actions: devuelve `UNAUTHORIZED`, `FORBIDDEN` o `INTERNAL`.
   - `getCurrentStaff()` devuelve `null` en vez de redirigir.
3. **Falla cerrado:** si Supabase o la base no responden, nadie entra. Queda en el log `auth.user_check_unavailable` o `auth.staff_lookup_failed`.
4. **Layout protegido** (`app/admin/(protected)/layout.tsx`): un `StaffGate` dentro de `<Suspense>` espera a `requireStaff()` antes de dibujar nada. **Cada página llama también a `requireStaff()`**; gracias a `cache()` no cuesta otra verificación.
5. **`staff:add`** (`scripts/staff-add.ts`) corre con `tsx --conditions=react-server`:
   - Reutiliza el repository y `db.ts`, con el mismo TLS verificado. La condición `react-server` deja cargar los módulos `server-only`.
   - Busca al usuario en `auth.users` por email con un `$queryRaw` parametrizado, usando la conexión de Prisma, que es dueña de la base y puede leer esa tabla. Nunca escribe en `auth`.
   - Es idempotente: si el staff ya existe, lo reactiva y actualiza el nombre.
   - El email que se guarda es el de Auth.
   - Muestra el `project-ref` de `DATABASE_URL`, para saber en qué proyecto escribe.
6. **Desactivar staff** queda fuera del script: en el Table Editor, `active = false`. A partir de la próxima request, esa persona recibe `forbidden`.

## Alternativas consideradas

- **`getClaims()` en el DAL:** no detecta una sesión revocada hasta que vence el JWT. Alcanza para el proxy, no para autorizar.
- **Chequear solo en el layout:** Next puede dibujar una página sin volver a ejecutar su layout.
- **Admin API de Supabase para buscar el usuario:** necesita la service role key (prohibida por §9).
- **Pedir el UUID a mano (`--auth-user-id`):** es fácil equivocarse al copiarlo y vincular a otra persona. Queda como plan B si algún día `postgres` pierde la lectura de `auth.users`.
- **Correr el script con el soporte nativo de TypeScript de Node 24:** no resuelve los alias `@/` ni las importaciones del cliente generado de Prisma.
- **Usar `jiti`:** está en `node_modules`, pero solo como dependencia de otro paquete.
- **Un script con `pg` directo:** saltearía el repository, el único lugar que toca la base.
- **Distinguir hacia afuera "sin staff" de "inactivo":** no le sirve a quien entra y revela el estado de una cuenta. El log sí los distingue.

## Consecuencias

- Nueva dependencia de desarrollo: `tsx`.
- Cada request al panel hace una llamada a Supabase Auth (`getUser()`) y una consulta a la base. Para un estudio chico es despreciable.
- Si Supabase actualiza `auth.users` y quita el permiso de lectura a `postgres`, `staff:add` falla. El test `repository.db.test.ts` lo detecta.
- El redirect por `forbidden` ocurre durante el streaming (dentro del `Suspense`), no como un 307. El 307 sin sesión lo sigue haciendo el proxy.
- **Usuario de Auth recreado** (corrección del 25/11/2026): sin clave foránea, borrar un usuario en Auth deja su `StaffMember` con el mismo email, que es único. `staff:add` ahora lo revincula al usuario nuevo si el viejo ya no existe, y conserva su `id` y su historial. Si el usuario viejo sigue existiendo, no toca nada (`email_in_use`). Descarté una FK a `auth.users` con borrado en cascada: Prisma no maneja bien una FK a otro esquema, y la cascada borraría el rastro del staff en el historial.
- **Toda acción admin nueva** (F4-05 en adelante) empieza con `const auth = await requireStaffForAction(); if (!auth.ok) return auth;`, y **toda página nueva** con `await requireStaff()`.
