# Changelog

Cambios del proyecto, una entrada por tarea de [`docs/GUIA_DE_AVANCE.md`](docs/GUIA_DE_AVANCE.md). Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). El proyecto todavía no publica versiones numeradas: las entradas se agrupan por tarea y fecha de merge a `main`.

## [Sin publicar]

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
