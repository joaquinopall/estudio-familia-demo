# Registro de decisiones de arquitectura (ADR)

Cada decisión de arquitectura relevante queda en un documento corto: qué problema había, qué se decidió y qué consecuencias tiene. Así, quien llega al proyecto entiende **por qué** el código es como es.

Reglas:

- Una ADR por decisión, numerada en orden (`NNNN-titulo-en-kebab-case.md`).
- Una ADR aceptada no se edita para cambiar la decisión: se escribe una nueva que la **reemplaza** y se marca la vieja como "Reemplazada por NNNN".
- Si la decisión cambia el SPEC, se registra también en SPEC §17.

## Índice

| ADR                                                          | Título                                                         | Estado                         |
| ------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------ |
| [0001](0001-arquitectura-en-capas-por-feature.md)            | Arquitectura en capas con ports & adapters, por feature        | Aceptada                       |
| [0002](0002-supabase-con-prisma-y-rls.md)                    | Supabase (Postgres + Auth) con Prisma, RLS sin políticas       | Aceptada (datos en F3-01; Auth en F4) |
| [0003](0003-un-tenant-por-instalacion.md)                    | Un tenant por instalación                                      | Aceptada                       |
| [0004](0004-anti-abuso-honeypot-rate-limit-turnstile.md)     | Anti-abuso: honeypot + rate limit + Turnstile                  | Aceptada (adapters en F3-03; orden en F3-05) |
| [0005](0005-mails-despues-de-responder.md)                   | Mails después de responder, sin el mensaje completo            | Aceptada (envío en F3-05; plantillas en F3-06) |
| [0006](0006-validacion-de-variables-de-entorno.md)           | Validación de variables de entorno al arrancar                 | Aceptada                       |
| [0007](0007-csp-report-only-sin-nonces.md)                   | CSP en report-only y sin nonces                                | Aceptada (se revisa en F5-01)  |
| [0008](0008-politica-de-npm-audit-en-ci.md)                  | Política de `npm audit` en la CI                               | Aceptada                       |
| [0009](0009-rutas-dinamicas-estaticas-con-cache-components.md) | Rutas dinámicas estáticas con Cache Components (404 real)    | Aceptada                       |
| [0010](0010-seo-json-ld-seguro-y-noindex-en-demo.md) | SEO: JSON-LD seguro y noindex en modo demo | Aceptada |
| [0011](0011-modo-demo-por-defecto.md) | Modo demo encendido por defecto | Aceptada |
| [0012](0012-prisma-7-con-adapter-pg-y-prisma-config.md) | Prisma 7 con driver adapter `pg`, `prisma.config.ts` y TLS verificado | Aceptada |
| [0013](0013-ports-sin-excepciones-y-caidas-de-servicios.md) | Ports sin excepciones y qué hacer si un servicio externo se cae | Aceptada |

## Plantilla

```markdown
# NNNN. Título de la decisión

- **Estado:** Propuesta | Aceptada | Reemplazada por NNNN
- **Fecha:** DD/MM/AAAA
- **Relacionado:** IDs del SPEC, tareas, otras ADR

## Contexto

Qué problema o fuerza obliga a decidir. Qué restricciones hay.

## Decisión

Qué se decidió, en una o dos frases claras. Detalles necesarios para aplicarla.

## Alternativas consideradas

- Alternativa: por qué no.

## Consecuencias

- Positivas.
- Negativas o costos aceptados.
- Qué hay que hacer o vigilar a partir de ahora.
```
