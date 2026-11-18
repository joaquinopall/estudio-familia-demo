# `src/features`

Código organizado **por feature**, no por tipo de archivo (SPEC §6, ADR-0001). Cada feature sigue las mismas capas, de afuera hacia adentro:

```
actions.ts  →  service.ts  →  repository.ts  →  Prisma
                    ↘  ports (src/lib/ports) ← adapters (src/lib/adapters)
```

| Archivo         | Responsabilidad                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `schema.ts`     | Schemas Zod compartidos entre cliente y servidor.                                                       |
| `types.ts`      | Tipos de dominio de la feature.                                                                         |
| `actions.ts`    | Server Actions **finas**: parsean con Zod, chequean auth, llaman al service y devuelven `ActionResult`. |
| `service.ts`    | Reglas de negocio. Reciben repos y ports por parámetro; nunca importan Prisma ni SDKs.                  |
| `repository.ts` | Único lugar que toca Prisma.                                                                            |
| `components/`   | Componentes propios de la feature.                                                                      |
| `__tests__/`    | Tests de la feature (services con fakes, schemas, actions). Objetivo: 80% de cobertura.                 |

Features previstas: [`inquiries/`](inquiries/README.md) y [`auth/`](auth/README.md).
