# `src/components`

Componentes de UI compartidos entre páginas. La lógica de negocio no va acá (va en `src/features`).

| Carpeta      | Qué va                                                                                                                                                                                     | Se llena en |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `ui/`        | Componentes generados por shadcn/ui. No editarlos salvo necesidad: extender por composición.                                                                                               | F1-07       |
| `layout/`    | `Header`, `Footer`, `SkipLink`, `DemoBanner`, `WhatsAppButton`.                                                                                                                            | F1-07       |
| `marketing/` | Bloques del sitio público: `Hero`, `SectionHeading`, `PracticeAreaCard`, `ProcessSteps`, `TrustBar`, `FaqList`, `CtaSection` y `FactLabel` (rótulo en versalitas con ícono de trazo fino). | F2-02       |

Los componentes propios de una feature (por ejemplo, el formulario de consulta) viven en `src/features/<feature>/components/`, no acá.

Los bloques de `marketing/` reciben los datos por props (no importan el contenido directo), así se testean aislados y se reutilizan entre páginas. `FaqList` usa `<details>`/`<summary>` nativos: accesibles con teclado y sin JS de cliente.

Reglas: Server Components por defecto; `"use client"` solo si hace falta interactividad. Nada de datos del estudio hardcodeados: salen de `src/config` y `src/content`.
