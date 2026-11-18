# CLAUDE.md — Instrucciones para la IA

Proyecto: **Demo 1 — Sitio web + sistema de consultas para un estudio jurídico de familia y sucesiones.**
Es una demo comercial reutilizable: tiene que poder convertirse en el sitio de un estudio real cambiando configuración y contenido, no código.

## 0. Antes de cualquier cosa

1. Leé **`docs/SPEC.md`**. Es la fuente de verdad del proyecto (requisitos, arquitectura, modelo de datos, contratos, seguridad, diseño). Si algo de este archivo contradice el SPEC, gana el SPEC y avisás la contradicción.
2. Leé **`docs/GUIA_DE_AVANCE.md`** para saber en qué fase y tarea estamos. Trabajás **una tarea por vez** (ej. `F1-03`).
3. Revisá `package.json` para ver las **versiones instaladas**. Antes de usar una API de Next.js, Prisma, Supabase, shadcn/ui, Tailwind, Zod, Resend o Upstash, verificá la documentación oficial de **esa versión** (las APIs cambian entre versiones mayores; no asumas de memoria).

## 1. Flujo de trabajo obligatorio (spec-driven)

Nada se implementa sin plan aprobado por el usuario.

1. **Entender:** leé las secciones del SPEC que aplican a la tarea y el código relacionado. Si falta información o el SPEC es ambiguo, **preguntá antes de planificar**.
2. **Plan (en modo plan, sin escribir código):** presentá:
   - Tarea (ID de la guía) y requisitos del SPEC que cubre (ej. `FR-04`, `NFR-SEC-02`).
   - Archivos a crear o modificar.
   - Decisiones de diseño y alternativas descartadas (una línea cada una).
   - Tests que vas a escribir.
   - Riesgos o dudas.
   - Cómo lo va a verificar el usuario.
3. **Esperá la aprobación explícita.** "Ok", "dale", "aprobado" = aprobado. Cualquier otra cosa = ajustar el plan.
4. **Implementar** solo lo aprobado. Si en el camino aparece algo que cambia el plan, **pará y consultá**; no improvises alcance.
5. **Verificar vos primero:** `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` tienen que pasar. Si la tarea toca flujos de usuario, también `npm run test:e2e`.
6. **Entregar un resumen** con: qué se hizo, archivos tocados, tests agregados, cómo verificarlo a mano (pasos concretos) y qué quedó pendiente.
7. **Documentar** (ver sección 6). El usuario revisa, verifica y recién ahí marca la tarea como completada en la guía. **Vos no marcás tareas como completadas.**

## 2. Stack

- **Next.js (App Router) + TypeScript estricto.** Server Components por defecto; `"use client"` solo cuando haga falta interactividad.
- **Tailwind CSS + shadcn/ui** (componentes en `src/components/ui`, no editarlos salvo necesidad; extender por composición).
- **Server Actions** para mutaciones. Sin API routes salvo webhooks o health check.
- **Supabase**: Postgres (datos) + Auth (solo para el panel admin).
- **Prisma** como ORM y para migraciones.
- **Zod** para toda validación (formularios, env, inputs de server actions).
- **Resend** (+ React Email) para mails. **Cloudflare Turnstile** anti-bots. **Upstash Redis** para rate limiting.
- **Vitest + Testing Library** (unit/integración) y **Playwright** (e2e).
- Deploy en **Vercel**. CI en **GitHub Actions**.

No agregues dependencias nuevas sin incluirlas en el plan con su justificación.

## 3. Arquitectura (resumen; detalle en SPEC §6)

Capas, de afuera hacia adentro. Cada capa solo conoce a la de abajo:

```
UI (app/, components/)  →  Server Actions (features/*/actions.ts)  →  Services (features/*/service.ts)  →  Repositories (features/*/repository.ts)  →  Prisma
                                                                   ↘  Ports (lib/ports) ← Adapters (lib/adapters: Resend, Turnstile, Upstash)
```

- **Server Actions = finas:** parsean input con Zod, chequean auth, llaman al service y devuelven `ActionResult<T>`. Sin lógica de negocio.
- **Services = reglas de negocio**, puros y testeables. Reciben dependencias (repos, ports) por parámetro o factory, nunca importan Prisma ni SDKs directo.
- **Repositories = único lugar que toca Prisma.**
- **Auth/autorización:** toda página y action del admin llama a `requireStaff()` (Data Access Layer, `features/auth/dal.ts`). El `proxy`/middleware es solo una primera barrera; **nunca es la única**.
- **Contenido del estudio** (nombre, matrículas, dirección, WhatsApp, áreas, FAQ) vive en `src/content/` y `src/config/site.config.ts`. Nunca hardcodear datos del estudio en componentes.
- Organización **por feature** (`src/features/inquiries`, `src/features/auth`, ...), no por tipo de archivo.

## 4. Reglas de código

- TypeScript `strict`, sin `any` (si es inevitable, `unknown` + narrowing). Sin `@ts-ignore`.
- Nombres de código en **inglés**; textos de interfaz en **español rioplatense** (es-AR). Glosario en SPEC §16.
- Funciones chicas, una responsabilidad. Archivos de más de ~250 líneas son una señal para dividir.
- Errores: los services devuelven resultados tipados o tiran errores de dominio conocidos; las actions los traducen a `ActionResult`. Nunca mostrar stack traces ni mensajes internos al usuario.
- Módulos con secretos o acceso a DB importan `server-only`.
- Variables de entorno **solo** a través de `src/lib/env.ts` (validado con Zod). Nunca `process.env.X` suelto.
- Accesibilidad: HTML semántico, labels en todos los campos, foco visible, contraste AA, navegable con teclado.
- Commits chicos con Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`).

## 5. Seguridad (no negociable; detalle en SPEC §10)

- Validar **todo** input del lado del servidor con Zod, aunque ya se valide en el cliente.
- Nunca loguear datos personales (nombre, email, teléfono, mensaje). Loguear IDs y códigos de error.
- Nunca usar `dangerouslySetInnerHTML`, salvo para JSON-LD serializado con el helper del proyecto.
- Nunca exponer secretos al cliente (solo `NEXT_PUBLIC_*` cuando corresponda según el SPEC).
- RLS habilitado en todas las tablas de Supabase; Prisma accede con su propia conexión.
- **No leer, mostrar ni modificar archivos `.env*` con valores reales.** Solo `.env.example`.
- **Comandos prohibidos sin aprobación explícita:** `prisma migrate reset`, `prisma db push` contra cualquier base que no sea local o dev, borrar datos, `git push --force`, push directo a `main`, cambiar configuración de Vercel o Supabase.

## 6. Documentación (siempre al día)

Toda tarea que cambie comportamiento, estructura o configuración actualiza la documentación **en el mismo PR**:

- `README.md`: qué es, cómo correrlo, variables de entorno, scripts, estructura y cómo deployar. Escrito para alguien que llega sin contexto.
- `docs/ARCHITECTURE.md`: capas, flujos y decisiones vigentes.
- `docs/adr/NNNN-titulo.md`: una ADR corta por cada decisión de arquitectura nueva (contexto, decisión, consecuencias).
- `docs/TESTING.md`: cómo correr los tests y **guía de tests manuales** (casos MT-xx con pasos y resultado esperado). Agregar casos cuando se agrega funcionalidad.
- `CHANGELOG.md`: entrada por tarea completada.
- Si una tarea obliga a cambiar el SPEC, proponé el cambio en el plan y registralo en SPEC §17 ("Registro de cambios") una vez aprobado.

## 7. Tests

- Cada service y cada schema Zod tiene tests unitarios. Los services se testean con fakes de repos y ports.
- Cada server action tiene tests de los casos de error (validación, auth, rate limit, captcha).
- Flujos críticos con Playwright: enviar consulta, login admin, cambiar estado de una consulta, acceso denegado.
- Objetivo de cobertura: 80% en `src/features/**` (services, schemas, actions).
- Un bug arreglado = un test que lo reproduce.

## 8. Diseño

- Dirección visual y de contenido en SPEC §11. El sitio tiene que transmitir **calma, cercanía y confianza** (familia y sucesiones), no frialdad corporativa.
- Para trabajo visual (layouts, componentes, refinamiento estético), el usuario usa `/claude-design`. Respetá los tokens de diseño definidos (`src/app/globals.css` y SPEC §11) y no introduzcas colores ni tipografías fuera del sistema.
- Textos: lenguaje claro y empático, sin promesas de resultado, sin testimonios ni reseñas inventadas (ver restricciones éticas en SPEC §11.4).

## 9. Comandos

```
npm run dev          # desarrollo
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest
npm run test:e2e     # Playwright
npm run build        # build de producción
npm run db:migrate   # prisma migrate dev (solo contra la base de desarrollo)
```

(Los scripts se crean en la tarea F1-03; si alguno no existe todavía, decilo.)
