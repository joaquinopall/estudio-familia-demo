# `src/components`

Componentes de UI compartidos entre páginas. La lógica de negocio no va acá (va en `src/features`).

| Carpeta      | Qué va                                                                                               | Se llena en |
| ------------ | ---------------------------------------------------------------------------------------------------- | ----------- |
| `ui/`        | Componentes generados por shadcn/ui. No editarlos salvo necesidad: extender por composición.         | F1-07       |
| `layout/`    | `Header`, `Footer`, `SkipLink`, `DemoBanner`, `WhatsAppButton`.                                      | F1-07       |
| `marketing/` | Bloques del sitio público: `Hero`, `PracticeAreaCard`, `ProcessSteps`, `TrustBar`, `FaqList`, `CTA`. | F2          |

Los componentes propios de una feature (por ejemplo, el formulario de consulta) viven en `src/features/<feature>/components/`, no acá.

Reglas: Server Components por defecto; `"use client"` solo si hace falta interactividad. Nada de datos del estudio hardcodeados: salen de `src/config` y `src/content`.
