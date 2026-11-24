# 0012. Prisma 7 con driver adapter `pg`, `prisma.config.ts` y TLS verificado

- **Estado:** Aceptada
- **Fecha:** 24/11/2026
- **Relacionado:** SPEC §6.2, §7, §9, §14, NFR-ESC-01, NFR-SEC-03, NFR-SEC-08, ADR-0002, ADR-0006, ADR-0008, tarea F3-01

## Contexto

El SPEC §7 muestra un borrador de `schema.prisma` con `url` y `directUrl` en el `datasource`, que es la forma de Prisma 6. Al implementar F3-01, la versión estable es Prisma **7.10.1** (en npm, `latest` apunta a una versión de prueba, 8.0.0-rc). Prisma 7 cambia la configuración:

- Las URLs salen del schema y van a `prisma.config.ts`, y `directUrl` ya no existe.
- La app se conecta con un _driver adapter_ (`@prisma/adapter-pg` sobre `pg`).
- El generador `prisma-client` exige `output` y ya no genera en `node_modules`.
- No carga los `.env` por su cuenta, y `migrate dev` ya no corre `generate`.

Además, `prisma` 7.10.1 depende de `effect` 3.20.0, con una falla ReDoS de severidad alta (GHSA-7589-6fvf-x4pw). Como `prisma` es _peer_ de `@prisma/client`, npm lo cuenta como dependencia de producción y el audit bloqueante de la CI (ADR-0008) fallaría.

Por último, el cifrado de la conexión (probado contra Supabase dev el 24/11/2026):

- `pg` sin parámetros conecta **en texto plano**.
- Con `sslmode=require`, `pg` 8 verifica el certificado completo y falla, porque Supabase firma con su propia CA ("Supabase Root 2021 CA"), que Node no trae.
- El motor de la CLI de Prisma usa `sslmode=prefer` por defecto: cifra, pero sin verificar el certificado.

## Decisión

- **Prisma 7.10.1 fijo** (`@prisma/client`, `@prisma/adapter-pg`, `prisma`) y `pg` 8.23.1. Nada de versiones de prueba.
- **Dos URLs, dos usos:**
  - `prisma.config.ts` usa `DIRECT_URL` (conexión directa o pooler en modo sesión), porque solo la lee la CLI para migrar.
  - `src/lib/db.ts` usa `DATABASE_URL` (pooler en modo transacción) con `PrismaPg`.
- **`prisma.config.ts` carga las variables con `@next/env`** (mismas reglas y mismo orden de archivos que Next; las del shell ganan) y las valida con `parseServerEnv`, el mismo schema de la app (ADR-0006). La URL es opcional ahí, así `prisma generate` funciona en la CI y en Vercel sin credenciales.
- **Cliente generado en `src/generated/prisma/`**, fuera de git, ESLint, Prettier y cobertura. Se regenera en `postinstall` y antes de `typecheck`.
- **`getDb()` lazy**, con el cliente cacheado en `globalThis`: ni el build ni los tests se conectan, y la recarga en desarrollo no abre conexiones nuevas. Pool de 5 conexiones por instancia.
- **Override de `effect` a 3.22.5** (misma versión mayor, corrige la falla), solo para `@prisma/config`, en `package.json`.
- **TLS verificado contra la CA de Supabase en las dos conexiones.** El certificado público de la CA está en `prisma/certs/supabase-ca.crt`. `src/lib/db-tls.ts`, un módulo puro, concentra la configuración:
  - **App:** `db.ts` pasa `ssl: { ca, rejectUnauthorized: true }` al pool de `pg`. `next.config.ts` incluye el `.crt` en el bundle del servidor (`outputFileTracingIncludes`).
  - **CLI:** `prisma.config.ts` agrega `sslmode=require&sslaccept=strict&sslcert=<ruta absoluta>` a `DIRECT_URL`.
  - **Las URLs de `.env*` no pueden traer parámetros `ssl*`:** el código las rechaza, así nadie debilita el cifrado por accidente.
  - **"Enforce SSL on incoming connections" activado en Supabase** (dev y prod): una conexión sin cifrar es rechazada (`ESSLREQUIRED`).

## Alternativas consideradas

- Prisma 8 RC: versión de prueba, no apta para una base que se revende.
- `dotenv` en `prisma.config.ts`: por defecto lee `.env` y no `.env.local`, y con reglas distintas a las de Next.
- Commitear el cliente generado: diffs enormes y riesgo de que quede desactualizado.
- Ignorar el advisory de `effect` en la CI: deja la falla presente y cambia la política de ADR-0008.
- Cifrar sin verificar (`uselibpqcompat=true&sslmode=require`, o `rejectUnauthorized: false`): protege de que alguien escuche la conexión, pero no de que alguien se haga pasar por el servidor.
- Parámetros SSL en las URLs de `.env.local`: dependen de que cada persona y cada entorno los copie bien.

## Consecuencias

- El borrador de §7 vale para los modelos, pero el `datasource` no lleva URLs (SPEC v1.16).
- `npm ci` necesita correr el `postinstall` (`prisma generate`); sin el cliente generado, `typecheck` y `build` fallan.
- **Quitar el override de `effect`** cuando una versión estable de Prisma traiga `effect` ≥ 3.22.1. Dependabot no lo hace solo: revisarlo en cada actualización de Prisma.
- Con npm 12, los scripts de instalación de `prisma` y `@prisma/engines` quedan bloqueados por `allowScripts`. No hace falta habilitarlos: la CLI descarga el motor de migraciones la primera vez que lo necesita.
- Las migraciones de producción se corren con `DIRECT_URL=... npm run db:deploy` desde la terminal (SPEC §14). `DIRECT_URL` no se carga en Vercel.
- **La CA vence el 26/04/2031**, o antes si Supabase la rota. Cuando cambie, las conexiones fallan con un error de certificado: hay que bajar la nueva (Supabase → Database → SSL Configuration) y reemplazar el archivo. Para otro proveedor de Postgres, también se reemplaza ese archivo.
- `migrate dev` reconstruye las migraciones en una base temporal (_shadow database_) que no tiene `_prisma_migrations`. Por eso la migración de RLS solo la activa ahí si la tabla existe.
