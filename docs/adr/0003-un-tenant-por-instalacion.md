# 0003. Un tenant por instalación

- **Estado:** Aceptada
- **Fecha:** 18/11/2026
- **Relacionado:** SPEC §2 (excluido: múltiples estudios en una instalación), §6.1

## Contexto

La demo se va a convertir en sitios para distintos estudios. Se podía construir una sola aplicación que sirva a varios estudios (multi-tenant) o desplegar una copia por estudio.

## Decisión

**Cada estudio cliente tiene su propio deploy, su propia base de datos y su propia configuración** (`site.config.ts`, contenido y variables de entorno). El código es el mismo; lo que cambia es la configuración.

## Alternativas consideradas

- Multi-tenant (una app, una base con `tenantId`): un error de filtrado expone consultas de un estudio a otro, y cada consulta y política se complica.

## Consecuencias

- Aislamiento total de datos entre estudios: más simple y más seguro para datos sensibles de familia.
- No hay que modelar tenants en la base ni en la autorización.
- Costo: cada estudio necesita su proyecto en Vercel y en Supabase, y las actualizaciones se despliegan por separado.
