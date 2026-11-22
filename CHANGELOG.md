# Changelog

Cambios del proyecto, una entrada por tarea de [`docs/GUIA_DE_AVANCE.md`](docs/GUIA_DE_AVANCE.md). Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). El proyecto todavía no publica versiones numeradas: las entradas se agrupan por tarea y fecha de merge a `main`.

## [Sin publicar]

### F2-08 · Cierre de fase

- **Documentado:** caso MT-01 (celular real); README con el checklist para pasar a un estudio real, probado en una copia limpia con otro estudio; arquitectura al cierre del sitio público.
- **Corregido en docs:** pasos de MT-11 (orden del foco después de "Saltar al contenido") y versión del encabezado del SPEC; MT-13 suma la revisión del deploy.
- **Especificado para F3 (SPEC v1.14):** el aviso al estudio dice si es seguro contactar; `emailIsPrivate`, acuse neutro solo a emails privados y, sin un medio seguro, el estudio no inicia el contacto. Ítems agregados a F3-02, F3-06 y F3-07 de la guía.

### F2-07 · Pulido visual y accesibilidad

- **Corregido:** anillo de foco invisible (1:1) en el CTA final; frase de confidencialidad tapada por WhatsApp en el hero (ahora va arriba del botón); CTA de las áreas fuera de la primera pantalla en celulares; áreas táctiles de los datos de contacto y del footer (44 px); headings y landmarks (axe sin violaciones de ningún nivel).
- **Agregado:** 404 y página de error en español, con salidas a inicio y contacto (FR-16).
- **Cambiado:** banner de demo corto en celulares; preguntas de Contacto debajo del formulario; sin rótulo repetido en las tarjetas de área; rótulo "Vigente desde el" en Privacidad (no cambia ninguna cláusula, sigue la versión 1.0).
- **Agregado:** `tests/e2e/quality.spec.ts` (contraste del foco, primera pantalla sin tapar, axe, áreas táctiles, reflow, 404), tests de las páginas de error y casos MT-12 y MT-21. SPEC v1.12.
- **Agregado (revisión de diseño, SPEC v1.13):** ayuda ante peligro (911, 137 opción 1, 144 y OVD) en footer, Contacto y áreas de familia; aviso para plazos con teléfono y horario; jurisdicción CABA en Inicio y áreas; botón en el encabezado de Nosotros; página actual marcada en el menú.
- **Cambiado:** el paso 2 ya no promete una llamada; la ficha del hero muestra profesionales y matrícula; la confianza va antes de "Cómo trabajamos"; Contacto muestra primero los canales que funcionan; índice de preguntas en dos columnas en celulares.
- **Corregido:** WhatsApp ya no tapa texto (header fijo hasta 1379 px, flotante desde 1380); el menú mobile se cierra al salir con Tab o tocar afuera; el botón principal entra a 320×568 con banner; sin scroll horizontal con 305 px útiles; migas e índices de 44 px; el test de contraste del foco espera el fin de las transiciones; el índice fijo de Privacidad scrollea en ventanas bajas, así su último link no queda inalcanzable.
- **Corregido (después de #18):** sin scroll horizontal con la letra del navegador al 125% desde 320 px: debajo de `lg` el nombre del estudio puede partir en dos líneas. Al 150–200% queda para F5-03.
- **Seguridad:** sin `NEXT_PUBLIC_DEMO_MODE` el modo demo queda encendido (ADR-0011). **Un estudio real necesita `false` explícito.**
- **Especificado para F3:** `safeToContact`, "¿es seguro que te contactemos por ese medio?".
- **Conocido:** el 404 de un área inexistente se dibuja con JavaScript; aceptado, se revisa en F4 (ADR-0009).

### F2-06 · SEO técnico

- **Agregado:** `/sitemap.xml` (11 URLs), `/robots.txt` (excluye `/admin`) e imagen Open Graph generada en el build.
- **Agregado:** canonical y Open Graph completo en cada página con `buildPageMetadata`; JSON-LD `LegalService`, `FAQPage`, `Service` y `BreadcrumbList` con serialización segura (`<JsonLd>`).
- **Agregado:** `noindex, nofollow` en modo demo (ADR-0010) y horarios estructurados en `siteConfig.openingHours`.
- **Cambiado:** Vitest fija variables públicas de prueba, porque las páginas ahora las leen al importarse.
- **Agregado:** tests de serialización, builders, metadata, sitemap, robots y colores; e2e de SEO y de `og:image` en cada tipo de página; caso manual MT-20. SPEC v1.10.
- **Decidido:** el SEO de Lighthouse se mide sobre un build local con el modo demo apagado. SPEC v1.11.
- **Documentado:** `ARCHITECTURE.md` y `TESTING.md` al día con la Fase 2.

### F2-05 · Contacto (sin formulario funcional todavía)

- **Agregado:** `/contacto` con el tiempo de respuesta en la apertura, el lugar reservado del formulario (`#formulario`, con un aviso y alternativas), datos de contacto (WhatsApp destacado, teléfono, email, dirección con link a Google Maps, horarios y confidencialidad) y preguntas destacadas. Los CTA "Contanos tu caso" del sitio dejan de dar 404.
- **Agregado:** componentes `ContactDetails` e `InquiryFormSlot`; textos en `src/content/contact-page.ts`.
- **Decidido:** mapa como link y no como embed (CSP, sin cookies de terceros y mejor rendimiento). La página es estática; en F3 el formulario lee `?area=` del lado del cliente.
- **Agregado:** tests de la página, de los componentes y del contenido; e2e de status (con y sin `?area=`), CTA del header y de un área, WhatsApp, axe, sin iframes y sin scroll horizontal; caso manual MT-19. SPEC v1.9.

### F2-04 · Nosotros, Preguntas frecuentes y Privacidad

- **Agregado:** `/nosotros` (enfoque, profesionales con matrícula y formación desde `siteConfig`, y valores), `/preguntas-frecuentes` (los 4 grupos con índice de anclas y links a las preguntas de cada área) y `/privacidad`.
- **Agregado:** política de privacidad **versión 1.0** (vigente desde el 21/11/2026) en `src/content/legal/privacy.ts`, conforme a la Ley 25.326: responsable, datos, finalidad, carácter obligatorio, proveedores con nombre y transferencia internacional, conservación de 24 meses, seguridad, derechos, cookies y avisos obligatorios de la AAIP. Borrador pendiente de revisión jurídica.
- **Agregado:** componentes `PageHeader`, `ProfessionalCard`, `TableOfContents` y `LegalDocument`; helpers `getFaqsByGroup` y `formatLongDate`.
- **Cambiado:** `/areas` y `/areas/[slug]` usan `PageHeader`; la miga "Inicio" se comparte desde `home.ts`.
- **Agregado:** tests de contenido (incluidos los avisos de la AAIP literales), de páginas y de componentes; e2e de status, axe, scroll horizontal, link del footer e índices; caso manual MT-18. SPEC v1.8.

### F2-03 · Áreas de práctica

- **Agregado:** `/areas` (índice con las 5 áreas y un CTA para temas fuera de la lista) y `/areas/[slug]` con migas de pan, introducción, "¿Cuándo consultar?", documentación orientativa, preguntas frecuentes del área, "Otras áreas" y CTA con el área preseleccionada (`/contacto?area=<slug>`). Metadata propia por página (US-02 CA2; JSON-LD en F2-06).
- **Agregado:** componentes `PracticeAreaGrid` (compartido con el inicio), `Breadcrumbs` y `ContentList`; textos en `src/content/area-pages.ts`; helper `getAreaContactHref`.
- **Agregado:** las 5 áreas se generan en el build; un slug desconocido responde **404 real** gracias a `ensureStatic = 'navigation'` (ADR-0009), porque `dynamicParams = false` no es compatible con Cache Components y sin esa opción la respuesta era 200 con `noindex`.
- **Agregado:** tests de las dos páginas, de los componentes y del contenido; e2e de navegación, status 200/404, CTA con área, axe y scroll horizontal; caso manual MT-17. SPEC v1.7.

### F2-02 · Inicio

- **Agregado:** página de inicio completa (US-01): hero con CTA visible sin scroll en mobile, 5 tarjetas de áreas, "Cómo trabajamos" en 3 pasos, señales de confianza (matrículas, dirección, horarios, confidencialidad y tiempo de respuesta), 3 preguntas destacadas y CTA final.
- **Agregado:** componentes `Hero`, `SectionHeading`, `PracticeAreaCard`, `ProcessSteps`, `TrustBar`, `FaqList` (con `<details>` nativo, sin JS) y `CtaSection` en `src/components/marketing`; textos en `src/content/home.ts`.
- **Agregado:** tests de componentes y de la página, y e2e del CTA sin scroll en 375×667, links de áreas y preguntas operables con teclado.
- **Cambiado:** la frase "La primera conversación es confidencial" pasa a `siteConfig.confidentialityNote` (la usan el inicio y el footer). SPEC v1.6.
- **Cambiado (diseño):** en desktop, el hero suma una ficha con dirección, horario y tiempo de respuesta (tomados de `siteConfig`); las 5 tarjetas de áreas quedan centradas en filas de 3 / 2; los pasos de "Cómo trabajamos" se unen con una línea; el bloque de confianza es una sola ficha con divisiones e íconos de trazo fino (`FactLabel`); las preguntas frecuentes van en dos columnas; el espaciado de las secciones es responsive.
- **Cambiado:** el menú de escritorio aparece desde `lg` (1024 px), porque a 768 px no entraba. El botón de WhatsApp es más chico en mobile.
- **Agregado:** e2e sin scroll horizontal en 360/768/1024/1440 px y de la grilla de áreas en desktop; caso manual MT-16; nota en el README sobre el CSS desactualizado en `next dev`.

### F2-01 · Contenido como datos

- **Agregado:** `src/content/practice-areas.ts` con las 5 áreas de FR-02 (slug, código del enum `PracticeArea`, resumen, qué es, cuándo consultar, documentación, preguntas frecuentes y metadata) y `src/content/faqs.ts` con 10 preguntas generales en 4 grupos, 3 destacadas para el inicio. Textos en borrador, pendientes de revisión del estudio.
- **Agregado:** tests de integridad del contenido (slugs únicos y aptos para URL, campos obligatorios, largos de metadata, cantidad de preguntas, sin preguntas repetidas) y de las reglas de SPEC §11.4 (sin promesas de resultado, autoelogios ni testimonios, y sin datos del estudio repetidos fuera de `site.config.ts`).
- **Cambiado:** la guía de avance marca la Fase 1 como completa.

## Fase 1 — Fundaciones

### F1-09 · Cierre de fase — 19/11/2026

- **Cambiado:** Dependabot ignora las versiones major de `@types/node` (debe coincidir con Node 24) y de `typescript` (typescript-eslint todavía no soporta TypeScript 7.0; se cerró el PR #7).
- **Cambiado:** dependencias actualizadas por Dependabot: React 19.3.1, Tailwind CSS 4.3.5 (#6) y ESLint 10 (#8), verificadas con lint, typecheck, tests, build y e2e.
- **Verificado:** producción responde con el layout de F1-07 y los headers de seguridad de F1-06. El banner de demo requiere `NEXT_PUBLIC_DEMO_MODE=true` en las variables de Vercel.

### F1-08 · Documentación inicial — 19/11/2026 (#12)

- **Agregado:** README completo (qué es, cómo correrlo, variables, scripts, estructura, seguridad, CI y deploy), `docs/ARCHITECTURE.md` con diagramas, `docs/adr/` con las ADR 0001–0008 y su índice, `docs/TESTING.md` con la guía de tests manuales (plantilla, índice MT-01–15 y MT-11, MT-13 y MT-14 detallados) y este changelog.
- **Agregado:** test que verifica que los links relativos de la documentación apunten a archivos existentes.

### F1-07 · Sistema de diseño base y layout — 19/11/2026 (#11)

- **Agregado:** shadcn/ui (base Radix) con button, input, textarea, label, select, radio-group, checkbox, card, badge y sonner (tema claro fijo, sin `next-themes`).
- **Agregado:** tokens de diseño (marfil, verde azulado y terracota; un solo tema claro) con test de contraste WCAG AA, y tipografías Lora + Plus Jakarta Sans con `next/font`.
- **Agregado:** `src/config/site.config.ts` con datos ficticios del estudio y helper de link de WhatsApp.
- **Agregado:** layout público con link para saltar al contenido, banner de demo, header con menú mobile accesible, footer con señales de confianza y disclaimer, y botón flotante de WhatsApp. `lang="es-AR"` y metadata base.
- **Agregado:** e2e de layout, teclado y accesibilidad con axe.
- **Cambiado:** el inicio pasa al grupo de rutas `(public)` como página provisoria. SPEC v1.5.
- **Quitado:** recursos de la plantilla de create-next-app.

### F1-06 · Headers de seguridad — 18/11/2026 (#10)

- **Agregado:** HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY` y CSP en modo report-only en todas las rutas; sin `X-Powered-By`.
- **Agregado:** tests unitarios y e2e de los headers, incluido uno que falla si el inicio genera violaciones de la CSP. SPEC v1.4.

### F1-05 · CI en GitHub Actions — 18/11/2026 (#5)

- **Agregado:** workflow de CI (install, lint, typecheck, format:check, test, build y audit) con acciones fijadas por SHA, Dependabot semanal para npm y GitHub Actions, y Node 24 fijado (`.nvmrc` y `engines`).
- **Cambiado:** el audit bloqueante cubre solo dependencias de producción y el completo es informativo, por GHSA-fc5q-39xc-vjpf (`picomatch`, sin corrección). Se deja sin efecto la rama `dev`. SPEC v1.3.

### F1-04 · Estructura y configuración de entorno — 18/11/2026 (#4)

- **Agregado:** variables de entorno validadas con Zod (públicas y privadas) que hacen fallar `dev`, `build` y `start` si falta una obligatoria; `.env.example` completo.
- **Agregado:** `ActionResult` con helpers, logger JSON sin datos personales y READMEs de la estructura de carpetas. SPEC v1.2.
- **Corregido:** el primer PR de la tarea (#2/#3) no llevaba el código; se volvió a integrar en #4.

### F1-03 · Tooling y scripts — 18/11/2026 (#1, llegó a `main` con #3)

- **Agregado:** TypeScript estricto (`noUncheckedIndexedAccess`), Prettier integrado con ESLint, Vitest + Testing Library, Playwright con smoke test y todos los scripts de la guía.
- **Agregado:** `.gitattributes` con finales de línea LF y `.gitignore` para reportes de tests.

### F1-02 · Documentos de trabajo en el repo — 18/11/2026

- **Agregado:** `CLAUDE.md`, `docs/SPEC.md` y `docs/GUIA_DE_AVANCE.md`.

### F1-01 · Proyecto base desplegado — 18/11/2026

- **Agregado:** proyecto Next.js con TypeScript, Tailwind, App Router, ESLint y carpeta `src/`, desplegado en Vercel.
