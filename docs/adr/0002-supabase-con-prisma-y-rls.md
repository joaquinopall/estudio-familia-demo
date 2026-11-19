# 0002. Supabase (Postgres + Auth) con Prisma; RLS sin políticas; sin service role key

- **Estado:** Aceptada (se implementa en F3-01 y F4-01)
- **Fecha:** 18/11/2026
- **Relacionado:** SPEC §7, §9, NFR-SEC-03, NFR-SEC-07, NFR-SEC-10

## Contexto

Hace falta una base de datos administrada y un login para el panel del estudio, con costo bajo para un estudio chico. Supabase da Postgres y Auth en un solo servicio, pero también expone una API de datos pública (la "Data API") que, mal configurada, permite leer tablas con la clave pública.

## Decisión

- **Postgres de Supabase** como base y **Prisma** como ORM y para migraciones versionadas.
- **Supabase Auth** solo para el login del staff (sin registro público).
- **RLS habilitado en todas las tablas y sin políticas** para `anon` ni `authenticated`: la Data API no puede leer ni escribir nada. Prisma accede con su propia conexión de Postgres.
- **No se usa la service role key** (mínimo privilegio): la base va por Prisma y Auth por la clave pública.
- Dos proyectos: **dev** (local y previews) y **prod**.

## Alternativas consideradas

- Usar el cliente de Supabase para los datos con políticas RLS: más lógica de autorización en SQL y repartida entre la base y el código.
- Auth propia: más superficie de ataque y más mantenimiento.

## Consecuencias

- Una sola fuente de autorización: el código (`requireStaff()`), no políticas RLS.
- Las migraciones se aplican con `prisma migrate`; nunca `db push` contra producción.
- La habilitación de RLS se hace en una migración SQL y se verifica (consulta con la clave pública → vacío o error).
