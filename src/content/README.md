# `src/content`

Contenido del sitio como datos tipados, separado de los componentes (SPEC §6.1, §11.3).

| Archivo             | Contenido                                                             | Tarea |
| ------------------- | --------------------------------------------------------------------- | ----- |
| `practice-areas.ts` | Las 5 áreas (FR-02): slug, título, resumen, secciones, FAQ y metadata | F2-01 |
| `faqs.ts`           | Preguntas frecuentes generales, agrupadas, con 3 destacadas           | F2-01 |
| `home.ts`           | Textos del inicio: hero, "Cómo trabajamos" y títulos de sección       | F2-02 |
| `area-pages.ts`     | Textos de `/areas`, migas de pan y rótulos de las páginas de área     | F2-03 |
| `about.ts`          | Textos de `/nosotros`: enfoque y valores                              | F2-04 |
| `faq-page.ts`       | Textos de `/preguntas-frecuentes`                                     | F2-04 |
| `legal/privacy.ts`  | Texto de la política de privacidad (Ley 25.326) y su versión          | F2-04 |

## Forma de los datos

- **Área** (`PracticeAreaContent`): `slug` (URL `/areas/[slug]` y `/contacto?area=[slug]`), `inquiryArea` (valor del enum `PracticeArea` de SPEC §7), `title`, `shortTitle` (tarjetas), `summary`, `intro` (un string por párrafo), `whenToConsult`, `documents`, `faqs` y `metadata` (`title` ≤ 60 caracteres, `description` de 70 a 160).
- **Pregunta general** (`GeneralFaq`): `question`, `answer` (un string por párrafo), `group` (uno de `faqGroups`) y `featured` (exactamente 3, para el inicio).
- Helpers: `getPracticeAreaBySlug(slug)`, `getAreaContactHref(slug)` (link a `/contacto?area=<slug>`), `getFeaturedFaqs()` y `getFaqsByGroup()`.
- Agregar un área: sumarla a `practiceAreas` alcanza. Su página `/areas/<slug>` se genera sola en el build y aparece en el inicio, en `/areas` y en "Otras áreas".

## Cómo editarlo

- Los textos son **borradores**: los revisa el estudio antes de publicarlos.
- No pongas datos del estudio (nombre, teléfono, email, dirección, horarios) dentro de los textos: los componentes los toman de `src/config/site.config.ts` (FR-03).
- Cambiar un `slug` cambia la URL pública: pensalo antes de publicar.
- Reglas del contenido (SPEC §11.4): lenguaje simple, sin promesas de resultado, sin autoelogios ni comparaciones y sin testimonios ni reseñas inventadas.

## Política de privacidad

- `privacyPolicy.version` (hoy `1.0`) se guarda con cada consulta junto con la fecha del consentimiento (US-07 CA2). **Cualquier cambio en el texto exige subir la versión y actualizar `effectiveDate`**, y registrarlo en el CHANGELOG.
- Los avisos de la AAIP (`AAIP_ACCESS_NOTICE`, `AAIP_AUTHORITY_NOTICE`) son textos obligatorios: no se editan; un test los verifica literal.
- Los datos del responsable (nombre, domicilio, email) salen de `site.config.ts`.
- Si cambia un proveedor (hosting, base de datos, mails, anti-spam o rate limit), hay que actualizar la sección "Con quién los compartimos" y subir la versión.
- **Antes de publicar para un estudio real:** revisión del texto por el estudio, inscripción de la base de datos en el Registro Nacional de Bases de Datos de la AAIP y evaluación de las transferencias internacionales (art. 12; por ejemplo, con los contratos modelo de la AAIP).

## Tests

- Los tests de `__tests__/` validan la estructura (slugs únicos, campos obligatorios, largos de metadata, cantidad de preguntas) y las reglas éticas: si un texto dice, por ejemplo, "te garantizamos", `npm run test` falla e indica en qué campo está.
