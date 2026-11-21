# `src/content`

Contenido del sitio como datos tipados, separado de los componentes (SPEC §6.1, §11.3).

| Archivo             | Contenido                                                             | Tarea |
| ------------------- | --------------------------------------------------------------------- | ----- |
| `practice-areas.ts` | Las 5 áreas (FR-02): slug, título, resumen, secciones, FAQ y metadata | F2-01 |
| `faqs.ts`           | Preguntas frecuentes generales, agrupadas, con 3 destacadas           | F2-01 |
| `home.ts`           | Textos del inicio: hero, "Cómo trabajamos" y títulos de sección       | F2-02 |
| `legal/privacy.ts`  | Texto de la política de privacidad (Ley 25.326) y su versión          | F2-04 |

## Forma de los datos

- **Área** (`PracticeAreaContent`): `slug` (URL `/areas/[slug]` y `/contacto?area=[slug]`), `inquiryArea` (valor del enum `PracticeArea` de SPEC §7), `title`, `shortTitle` (tarjetas), `summary`, `intro` (un string por párrafo), `whenToConsult`, `documents`, `faqs` y `metadata` (`title` ≤ 60 caracteres, `description` de 70 a 160).
- **Pregunta general** (`GeneralFaq`): `question`, `answer` (un string por párrafo), `group` (uno de `faqGroups`) y `featured` (exactamente 3, para el inicio).
- Helpers: `getPracticeAreaBySlug(slug)` y `getFeaturedFaqs()`.

## Cómo editarlo

- Los textos son **borradores**: los revisa el estudio antes de publicarlos.
- No pongas datos del estudio (nombre, teléfono, email, dirección, horarios) dentro de los textos: los componentes los toman de `src/config/site.config.ts` (FR-03).
- Cambiar un `slug` cambia la URL pública: pensalo antes de publicar.
- Reglas del contenido (SPEC §11.4): lenguaje simple, sin promesas de resultado, sin autoelogios ni comparaciones y sin testimonios ni reseñas inventadas.
- Los tests de `__tests__/` validan la estructura (slugs únicos, campos obligatorios, largos de metadata, cantidad de preguntas) y las reglas éticas: si un texto dice, por ejemplo, "te garantizamos", `npm run test` falla e indica en qué campo está.
