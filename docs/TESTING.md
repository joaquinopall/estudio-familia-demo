# Tests

Cómo correr los tests automáticos, qué cubre cada nivel y la guía de **tests manuales** (casos MT-xx). Estrategia completa en [`SPEC.md`](SPEC.md) §13.

## Cómo correrlos

| Comando                 | Qué corre                                                                  |
| ----------------------- | -------------------------------------------------------------------------- |
| `npm run test`          | Unitarios y de componentes (Vitest), una corrida                           |
| `npm run test:watch`    | Vitest en modo watch, mientras desarrollás                                 |
| `npm run test:coverage` | Vitest con cobertura; reporte HTML en `coverage/index.html`                |
| `npm run test:e2e`      | E2E con Playwright (Chromium) contra el **build de producción**            |

Antes del primer e2e: `npx playwright install chromium`.

Detalles de los e2e:

- Playwright hace `npm run build && npm run start` y espera a `http://localhost:3000`. Si ya tenés un servidor en el puerto 3000, lo **reusa** (en ese caso no aplica `NEXT_PUBLIC_DEMO_MODE=true` que fija la config): cerralo antes.
- Necesita las variables de `.env.local` (al menos `NEXT_PUBLIC_SITE_URL`).
- Reporte HTML de la última corrida: `npx playwright show-report`.
- Correr un archivo o un test: `npx playwright test tests/e2e/layout.spec.ts` o `-g "nombre del test"`.

## Niveles y qué cubren

| Nivel       | Herramienta                  | Dónde                                        | Qué cubre hoy                                                                                     |
| ----------- | ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Unit        | Vitest                       | `src/**/__tests__/*.test.ts`, `prisma/__tests__/` | Schemas de env, `.env.example`, `ActionResult`, logger sin PII, headers y CSP, WhatsApp, `site.config`, contraste de tokens, contenido y reglas éticas, SEO (JSON-LD, metadata, sitemap, robots), cliente Prisma (`db.ts`) y RLS en las migraciones |
| Componentes | Vitest + Testing Library     | `src/**/__tests__/*.test.tsx`                | Páginas públicas y bloques de marketing, header y menú mobile (teclado, `aria-expanded`), footer, banner, skip link, WhatsApp      |
| E2E         | Playwright + axe             | `tests/e2e/*.spec.ts`                        | Smoke del inicio, headers de seguridad, CSP sin violaciones, layout, teclado, menú mobile, accesibilidad (axe), navegación de las páginas públicas, 404, SEO, calidad (contraste del foco, primera pantalla, áreas táctiles) |
| Manual      | Esta guía                    | Sección "Guía de tests manuales"             | Lo que conviene mirar con ojos humanos o en dispositivos reales                                   |

Próximas fases: services con fakes de repos y ports, actions (validación, auth, rate limit, captcha), formulario y e2e de envío (F3), admin (F4).

### Convenciones

- Los tests viven junto al código, en una carpeta `__tests__/` (unit y componentes) o en `tests/e2e/` (e2e).
- Nombres de tests en inglés; textos esperados de interfaz en español, tal como los ve el usuario.
- Preferí consultas por rol y nombre accesible (`getByRole("button", { name: "Menú" })`): si un test no encuentra un elemento así, probablemente un lector de pantalla tampoco.
- Un bug arreglado = un test que lo reproduce.
- Cobertura objetivo: 80% en `src/features/**` (services, schemas y actions), a medida que existan.
- Vitest no carga `.env.local`: `vitest.config.mts` fija valores públicos de prueba (`NEXT_PUBLIC_SITE_URL` y modo demo prendido). Nunca pongas secretos ahí; para otro valor, usá `vi.stubEnv`.
- En tests, `server-only` se reemplaza por un módulo vacío (`tests/stubs/server-only.ts`).

### Cuando falla un test "especial"

- **`design-tokens.test.ts`:** un par de colores de `globals.css` no llega al contraste WCAG AA (texto 4.5:1; foco y bordes de campos 3:1). Ajustá el color, no el umbral.
- **`security-headers.spec.ts` → "without report-only CSP violations":** algo del inicio carga un recurso que la CSP no permite. Mirá la consola del navegador (`[Report Only]`) y decidí si se agrega a la política en `src/lib/security/headers.ts` o se quita el recurso.
- **`layout.spec.ts` → axe:** el mensaje lista la regla (por ejemplo `color-contrast`, `label`); la ayuda de cada regla está en <https://dequeuniversity.com/rules/axe/>.
- **`quality.spec.ts`:** cubre lo que axe no ve. Si falla el foco, el anillo no llega a 3:1 sobre su fondo (típico: fondo primario, redefiní `--ring`). Si falla "uncovered", algo tapa el texto o el botón (típico: el botón de WhatsApp) o ya no entra en la primera pantalla. Al agregar una página, sumala a `PAGES`. Si falla "sticky index", un índice fijo quedó más alto que la ventana y no scrollea. Si falla "125%", algo no achica ni parte línea con la letra del navegador agrandada (típico: `whitespace-nowrap` en el header). Si falla "305px", algo no entra en un celular chico o con scrollbar clásico. Si falla "does not move the page", alguien puso `scroll-padding` en `html`: usá `scroll-margin`.
- **`env.example.test.ts`:** agregaste o sacaste una variable del schema y no actualizaste `.env.example` (o al revés).
- **`prisma/__tests__/rls.test.ts`:** agregaste un modelo o una tabla sin activarle RLS. Sumá `ALTER TABLE "<tabla>" ENABLE ROW LEVEL SECURITY;` en su migración (README → Base de datos). Nunca lo desactives.
- **`db.test.ts` y `db-tls.test.ts`:** corren en entorno `node` (Prisma no funciona en jsdom) y no se conectan a nada. Si fallan al importar `@/generated/prisma/client`, corré `npm run db:generate`. Si falla "is a PEM certificate", falta `prisma/certs/supabase-ca.crt` o alguien puso ahí otra cosa (nunca una clave privada).

## En la CI

La CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) corre en cada PR y push a `main`: lint → typecheck → format:check → **test** → build → audit. Los **e2e no corren en la CI todavía** (tarea F5-06): corrélos en local antes de abrir un PR que toque la interfaz.

## Guía de tests manuales

Los tests manuales cubren lo que la automatización no ve bien: cómo se siente el sitio en un celular real, si se entiende, si funciona con el teclado de punta a punta. Se ejecutan antes de cerrar cada fase y antes del lanzamiento.

### Cómo registrar una ejecución

Al final de cada caso hay una tabla. Agregá una fila por ejecución con la fecha, el entorno (local, preview con su URL o producción; navegador y dispositivo), el resultado (✅ pasa / ❌ falla) y notas. Si falla, abrí un issue o una tarea con el detalle y el link a la fila.

### Ejecuciones pendientes

Casos que no se pudieron correr al cerrar su tarea porque faltaba algo. Cuando se cumple la condición, se ejecutan, se registra el resultado en su tabla y se saca la fila de acá.

| Caso  | Qué falta correr                                     | Cuándo                                                                                                             | Por qué quedó pendiente                                         |
| ----- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| MT-23 | Pasos 1 a 5 y 7 en **dev**; el caso completo en **prod** | Dev: en **F4-01**, apenas `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estén en `.env.local`. Prod: en **F5-08**, después de `db:deploy`. | En F3-01 no estaban cargadas la URL de la API ni la clave pública (son de F4). |

### Plantilla

```markdown
### MT-XX — Título

- **Objetivo:** qué se quiere comprobar y por qué importa.
- **Requisitos:** IDs del SPEC (US-xx, FR-xx, NFR-xx).
- **Precondiciones:** entorno, datos, configuración.

**Pasos**

1. …
2. …

**Resultado esperado**

- …

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |
```

### Índice de casos

| ID    | Caso                                                    | Se detalla en | Estado        |
| ----- | ------------------------------------------------------- | ------------- | ------------- |
| MT-01 | Navegar todas las páginas en un celular real            | F2-08         | **Detallado** |
| MT-02 | Enviar una consulta completa                            | F3-09         | Pendiente     |
| MT-03 | Errores de validación de cada campo                     | F3-09         | Pendiente     |
| MT-04 | Exceder el rate limit                                   | F3-09         | Pendiente     |
| MT-05 | Honeypot completado (no guarda nada)                    | F3-09         | Pendiente     |
| MT-06 | Mails recibidos: estudio y acuse                        | F3-09         | Pendiente     |
| MT-07 | Login y logout del admin                                | F4-08         | Pendiente     |
| MT-08 | Entrar a `/admin` sin sesión                            | F4-08         | Pendiente     |
| MT-09 | Usuario autenticado que no es staff                     | F4-08         | Pendiente     |
| MT-10 | Cambio de estado, notas e historial                     | F4-08         | Pendiente     |
| MT-11 | Navegación completa solo con teclado                    | F1-08         | **Detallado** |
| MT-12 | Lighthouse mobile en 3 páginas                          | F2-07         | **Detallado** |
| MT-13 | Banner de modo demo                                     | F1-08         | **Detallado** |
| MT-14 | Botón de WhatsApp                                       | F1-08         | **Detallado** |
| MT-15 | Error de mail simulado (la consulta se guarda igual)    | F3-09         | Pendiente     |
| MT-16 | Inicio responsive (360 a 1440 px)                       | F2-02         | **Detallado** |
| MT-17 | Áreas de práctica: navegación, CTA y 404                | F2-03         | **Detallado** |
| MT-18 | Nosotros, Preguntas frecuentes y Privacidad             | F2-04         | **Detallado** |
| MT-19 | Contacto: canales, mapa y lugar del formulario          | F2-05         | **Detallado** |
| MT-20 | SEO técnico y datos estructurados                       | F2-06         | **Detallado** |
| MT-21 | Páginas 404 y de error                                  | F2-07         | **Detallado** |
| MT-22 | Ayuda ante peligro y plazos                             | F2-07         | **Detallado** |
| MT-23 | Base de datos: tablas y RLS en Supabase                 | F3-01         | **Detallado** · sin ejecutar (pendiente: F4-01 y F5-08) |

### MT-01 — Navegar todas las páginas en un celular real

- **Objetivo:** que todo el sitio público se pueda leer y usar con el dedo, en el navegador y la pantalla que usa quien consulta. Los e2e solo corren en Chromium de escritorio.
- **Requisitos:** FR-01, US-01 CA1, US-04, NFR-A11Y-01, SPEC §11.5.
- **Precondiciones:** un celular real con iOS (Safari) o Android (Chrome); si podés, los dos. URL de producción, o del preview con la sesión de Vercel iniciada. **No completes ninguna llamada a los teléfonos de ayuda.**

**Pasos**

1. Abrí el inicio y, sin scrollear, mirá la primera pantalla.
2. Con el botón **Menú**, entrá a Áreas de práctica, Nosotros, Preguntas frecuentes, Contacto e Inicio. Recorré cada una hasta el footer.
3. Desde Áreas de práctica, entrá a las 5 áreas y recorrelas. En una, tocá "Contanos tu caso".
4. Desde el footer, entrá a Política de privacidad y usá su índice. Hacé lo mismo con el índice de Preguntas frecuentes y abrí una pregunta.
5. En Contacto, tocá el teléfono, el email y el mapa. Volvé atrás sin llamar ni enviar.
6. Abrí una dirección inventada, por ejemplo `/no-existe`.
7. Girá el celular y repetí el inicio, el menú y Contacto.
8. Agrandá el texto del navegador al 125% (Chrome en Android: Configuración → Accesibilidad; Safari en iPhone: botón "aA") y repetí el inicio. Al terminar, volvelo a como estaba.

**Resultado esperado**

- Paso 1: se leen el banner de demo, qué hace el estudio, la frase de confidencialidad y el botón "Contanos tu caso".
- Pasos 2–4: las 11 páginas cargan sin scroll horizontal, texto cortado ni nada tapado. El header queda fijo con WhatsApp visible, y los títulos a los que llevan los índices no quedan debajo de él. El menú se cierra al elegir un link o tocar afuera. "Contanos tu caso" abre Contacto con `?area=<slug>`.
- Paso 5: se abren el marcador, el correo y el mapa, y al volver el sitio sigue igual.
- Paso 6: se ve la 404 en español, con salidas a inicio y contacto.
- Paso 7: nada se corta y el menú entero se alcanza, scrolleando si hace falta.
- Paso 8: no aparece scroll horizontal; el nombre del estudio puede partir en dos líneas.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-11 — Navegación completa solo con teclado

- **Objetivo:** que alguien que no usa mouse (o usa un lector de pantalla) pueda recorrer y usar todo el sitio.
- **Requisitos:** NFR-A11Y-01 (WCAG 2.2 AA: teclado, foco visible, link para saltar al contenido).
- **Precondiciones:** sitio abierto en desktop (local con `npm run dev` o el preview). No tocar el mouse durante la prueba.

**Pasos**

1. Recargá la página de inicio y apretá **Tab** una vez.
2. Apretá **Enter**.
3. Seguí apretando **Tab** hasta llegar al final de la página, y después **Shift+Tab** hasta volver al principio.
4. Sobre un link del menú, apretá **Enter**.
5. Achicá la ventana a ancho de celular (o DevTools → modo dispositivo, 375 px), recargá y llegá con **Tab** al botón **Menú**. Apretá **Enter**, recorré los links con **Tab** y apretá **Escape**.

**Resultado esperado**

- Paso 1: aparece arriba a la izquierda el link **"Saltar al contenido"**.
- Paso 2: el foco pasa al contenido principal (el siguiente Tab va al primer elemento del contenido, no al menú).
- Paso 3: el foco **siempre se ve** (contorno verde azulado; claro sobre la franja verde del cierre) y nunca queda debajo del header. Con Tab pasa por el contenido, el footer (teléfonos de ayuda, mapa, teléfono, email, política de privacidad) y, desde 1380 px, WhatsApp flotante. Con Shift+Tab vuelve por el mismo camino y termina en el header (hasta 1379 px WhatsApp, CTA, menú, nombre del estudio) y "Saltar al contenido". Ningún elemento queda inalcanzable ni atrapa el foco.
- Paso 4: navega a esa página y el menú la marca como actual.
- Paso 5: el menú se abre, sus links se recorren con Tab, y con Escape se cierra y el foco vuelve al botón **Menú**.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-13 — Banner de modo demo

- **Objetivo:** que quede claro que el estudio es ficticio cuando el sitio está en modo demo, y que el banner desaparezca para un estudio real.
- **Requisitos:** FR-15, SPEC §11.4.
- **Precondiciones:** acceso a `.env.local` (local) o a las variables del proyecto en Vercel.

**Pasos**

1. Con `NEXT_PUBLIC_DEMO_MODE=true`, corré `npm run build && npm run start` y abrí `http://localhost:3000`.
2. Revisá el banner en desktop y en ancho de celular (375 px).
3. Cambiá a `NEXT_PUBLIC_DEMO_MODE=false`, repetí el build y abrí el inicio. Después borrá la línea y repetí.
4. Poné un valor inválido (`NEXT_PUBLIC_DEMO_MODE=si`) y corré `npm run build`.
5. Abrí el preview y producción de la demo en Vercel y mirá el código fuente (Ctrl+U).

**Resultado esperado**

- Paso 1–2: arriba de todo se ve "**Sitio de demostración — estudio ficticio.**". Desde 640 px sigue con "Los nombres, matrículas y datos de contacto no son reales."; en celulares se muestra solo la primera oración, sin cortarse.
- Paso 3: con `false` el banner no aparece; sin la línea **sí** aparece, y la página lleva `noindex, nofollow` (ADR-0011).
- Paso 4: el build falla con `NEXT_PUBLIC_DEMO_MODE: debe ser "true" o "false"`.
- Paso 5: los dos muestran el banner y tienen `<meta name="robots" content="noindex, nofollow"/>`.
- Al terminar, volvé a dejar `NEXT_PUBLIC_DEMO_MODE=true`.

> Las `NEXT_PUBLIC_*` se fijan en el build: para ver un cambio hay que volver a hacer `build` (en `dev` alcanza con reiniciar el servidor).

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-14 — Botón de WhatsApp

- **Objetivo:** que quien prefiere WhatsApp pueda escribir al estudio en un toque, sin exponer datos personales.
- **Requisitos:** US-04, FR-13.
- **Precondiciones:** sitio abierto en un **celular real** con WhatsApp instalado y en una computadora.

**Pasos**

1. En el celular, recorré el inicio de arriba a abajo mirando el botón redondo del header. En la computadora, repetí con la ventana a 1280 px y a 1440 px.
2. Tocá el botón.
3. En la computadora, pasá el mouse por el botón y tocalo.
4. Revisá la URL que abre.

**Resultado esperado**

- Paso 1: el botón se ve en toda la página y no tapa ningún texto. Hasta 1379 px va en el header, que queda fijo; desde 1380 px flota abajo a la derecha, fuera de la columna de contenido.
- Paso 2: abre WhatsApp (app) con el mensaje "Hola, quisiera hacer una consulta." precargado. **En la demo el número es ficticio (`+54 9 11 0000-0000`)**: WhatsApp avisa que no existe; eso es lo esperado. No envíes el mensaje.
- Paso 3: abre una pestaña nueva con WhatsApp Web o la página de wa.me.
- Paso 4: la URL es `https://wa.me/5491100000000?text=Hola%2C%20quisiera%20hacer%20una%20consulta.` y **no** contiene datos personales.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-16 — Inicio responsive (360 a 1440 px)

- **Objetivo:** que el inicio se lea cómodo y prolijo en cualquier ancho, de un celular chico a un monitor.
- **Requisitos:** US-01, NFR-A11Y-01, SPEC §11.1.
- **Precondiciones:** `npm run dev` recién levantado (si venías trabajando, frenalo y borrá `.next`). DevTools → modo dispositivo.

**Pasos**

1. Abrí `/` a 360 px y recorrela de arriba a abajo. Repetí la primera pantalla a 320×568, con el banner de demo.
2. Repetí a 768 px (tablet), 1024 px y 1440 px.
3. A 1440 px, pasá el mouse por una tarjeta de área.
4. En cualquier ancho, recorré la página con **Tab**.

**Resultado esperado**

- En ningún ancho aparece scroll horizontal ni texto pegado a los bordes de una tarjeta.
- 360 px: el título, el botón "Contanos tu caso" y la frase de confidencialidad (arriba del botón) entran sin hacer scroll (también a 320×568); arriba se lee "Familia y sucesiones · CABA"; el bloque de confianza va antes de "Cómo trabajamos"; las áreas van de a una; los 3 pasos van en columna, unidos por una línea vertical; el bloque de confianza es una sola ficha con divisiones.
- 768 px: el header muestra el botón **Menú** (no los links); las áreas van de a 2 y la quinta queda centrada; los pasos siguen en columna.
- 1024 px o más: el header muestra los links y el botón; a la derecha del hero aparece la ficha con los profesionales, su matrícula y la jurisdicción; la página actual se ve subrayada en el menú ("Inicio" recién desde 1152 px); las áreas van de a 3 y las 2 últimas quedan centradas; los 3 pasos van en fila, unidos por una línea; las preguntas frecuentes van a la derecha del título.
- Paso 3: el borde de la tarjeta se marca y la flecha de "Leer más" se mueve apenas (no se mueve con "reducir movimiento" activado).
- Paso 4: el foco se ve siempre; en las tarjetas de área se marca la tarjeta entera.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-17 — Áreas de práctica: navegación, CTA y 404

- **Objetivo:** que cada área se pueda leer y recorrer cómodo, y que lleve al formulario con el área elegida.
- **Requisitos:** FR-01, US-02 CA1, SPEC §11.3.
- **Precondiciones:** sitio levantado (`npm run dev` o la URL de preview). DevTools a 360 px y a 1440 px.

**Pasos**

1. Desde el inicio, hacé clic en la tarjeta "Sucesiones".
2. Recorré la página de arriba a abajo y abrí una pregunta frecuente.
3. Mirá a dónde apuntan los dos botones "Contanos tu caso" (pasando el mouse o con clic derecho → copiar link).
4. En "Otras áreas", entrá a otra área. Después usá las migas de pan para ir a "Áreas de práctica".
5. Escribí a mano `/areas/no-existe` en la barra de direcciones.
6. Repetí los pasos 1 a 4 solo con el teclado.

**Resultado esperado**

- Paso 1: la URL es `/areas/sucesiones` y el título de la pestaña es "Sucesiones · Estudio Alameda".
- Paso 2: en orden se ven migas de pan, título, primer párrafo, botón, resto de la introducción, "¿Cuándo consultar?", "¿Qué documentación suele hacer falta?" (con la aclaración de que es orientativa), preguntas frecuentes, "Otras áreas" y el cierre. A 1440 px, "Cuándo consultar" y "Documentación" van lado a lado; a 360 px, una debajo de la otra.
- Paso 3: los dos apuntan a `/contacto?area=sucesiones` (se abre Contacto).
- Paso 4: "Otras áreas" muestra las otras 4, no la actual; `/areas` muestra las 5 tarjetas y el bloque "¿Tu situación no está en la lista?".
- Paso 5: se ve la 404 en español, con header, footer y links. En DevTools → Network, el documento tiene status **404**.
- Paso 6: el foco se ve siempre; las preguntas se abren con Enter o Espacio.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-18 — Nosotros, Preguntas frecuentes y Privacidad

- **Objetivo:** que las páginas institucionales se lean claras, generen confianza y que la política de privacidad sea completa y fácil de recorrer.
- **Requisitos:** FR-01, US-07 CA1, SPEC §11.2, §11.3 y §11.4, NFR-PRIV-01.
- **Precondiciones:** sitio levantado (`npm run dev` o la URL de preview). DevTools a 360 px y a 1440 px.

**Pasos**

1. Abrí `/nosotros` y recorrela de arriba a abajo.
2. Abrí `/preguntas-frecuentes`, usá el índice "Temas" para ir a "Honorarios y costos" y abrí una pregunta.
3. Al final de esa página, entrá a un área desde "Preguntas sobre cada tema".
4. Desde el footer de cualquier página, hacé clic en "Política de privacidad".
5. En `/privacidad`, usá el índice "Contenido" para ir a "Tus derechos". Leé la política completa.
6. Repetí los pasos 1 a 5 solo con el teclado.

**Resultado esperado**

- Paso 1: se ven el enfoque, las tarjetas de profesionales (nombre, formación y matrícula marcada como ficticia, sin fotos) y los 4 valores. No hay promesas de resultado ni comparaciones con otros estudios.
- Paso 2: el índice baja hasta el grupo elegido; hay 4 grupos con sus preguntas.
- Paso 3: el link lleva a `/areas/<slug>`.
- Paso 4: lleva a `/privacidad`, con versión **1.0** y fecha de vigencia bajo el título y el aviso de que el estudio es ficticio.
- Paso 5: el índice baja a la sección. La sección "Quién es responsable" muestra el nombre, el domicilio y el email del estudio; "Con quién los compartimos" nombra a Vercel, Supabase, Resend, Cloudflare y Upstash; están los avisos de la AAIP. A 1440 px, el índice queda fijo al costado mientras leés.
- Paso 6: el foco se ve siempre y los índices funcionan con Enter.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-19 — Contacto: canales, mapa y lugar del formulario

- **Objetivo:** que alguien pueda contactar al estudio por el canal que prefiera, sin fricción, mientras el formulario no está disponible.
- **Requisitos:** FR-01, FR-13, US-04, SPEC §11.2 y §11.3.
- **Precondiciones:** sitio levantado (`npm run dev` o la URL de preview). DevTools a 360 px y a 1440 px. Para el paso 3, un celular con WhatsApp (opcional).

**Pasos**

1. Llegá a `/contacto` desde el botón "Contanos tu caso" del header, desde el CTA final del inicio y desde el botón de una página de área.
2. Recorré la página de arriba a abajo.
3. Tocá "Escribinos por WhatsApp".
4. Tocá el teléfono, el email y "Ver en Google Maps".
5. Repetí los pasos 2 a 4 solo con el teclado.

**Resultado esperado**

- Paso 1: siempre se abre Contacto; desde un área, la URL termina en `?area=<slug>` y la página se ve igual.
- Paso 2: arriba está la franja de ayuda. A 360 px primero aparecen los datos de contacto (WhatsApp sin hacer scroll, aviso de plazos, tiempo de respuesta) y después la tarjeta "Contanos tu caso" (con el aviso de que el formulario llega pronto); a 1440 px van lado a lado, con los datos a la izquierda. "Antes de escribirnos" va al final en 360 px y debajo de la tarjeta del formulario en 1440 px, con 3 preguntas y el link a todas. No hay ningún mapa embebido.
- Paso 3: se abre WhatsApp (o `wa.me`) en otra pestaña, con el mensaje "Hola, quisiera hacer una consulta." y sin datos personales.
- Paso 4: el teléfono abre el marcador, el email abre el cliente de correo y el mapa se abre en otra pestaña.
- Paso 5: el foco se ve siempre y todos los links funcionan con Enter.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-20 — SEO técnico y datos estructurados

- **Objetivo:** que buscadores y redes lean bien el sitio, y que la demo no se indexe.
- **Requisitos:** FR-14, NFR-SEO-01, US-02 CA2, ADR-0010.
- **Precondiciones:** URL de preview o de producción, con `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_DEMO_MODE=true` configuradas. Si el preview está protegido con login, las herramientas externas no lo pueden leer: usá producción o pegá el código fuente de la página en la pestaña "Código".

**Pasos**

1. Abrí `/sitemap.xml`, `/robots.txt` y `/opengraph-image`.
2. En el código fuente del inicio, buscá `name="robots"`, `rel="canonical"` y `og:image`.
3. Pasá el inicio, un área y `/preguntas-frecuentes` por el [validador de schema.org](https://validator.schema.org/).
4. Pasá las mismas páginas por el [Rich Results Test](https://search.google.com/test/rich-results).
5. Probá la URL en un validador de Open Graph (por ejemplo, opengraph.xyz).

**Resultado esperado**

- Paso 1: el sitemap tiene 11 URLs con el dominio correcto y sin `/admin`; robots bloquea solo `/admin` y apunta al sitemap; la imagen muestra el nombre, el tagline y la marca de demostración.
- Paso 2: robots dice `noindex, nofollow`; el canonical y `og:image` usan el dominio de `NEXT_PUBLIC_SITE_URL`, no `localhost`.
- Paso 3: sin errores; se detectan `LegalService`, `Service` y `BreadcrumbList` (área) y `FAQPage` (preguntas).
- Paso 4: sin errores en los tipos que Google reconoce. `Service` no es un rich result y `FAQPage` está limitado, así que pueden no aparecer: para esos vale el paso 3. Puede avisar que la página no es indexable: en la demo es lo esperado.
- Paso 5: la tarjeta muestra título, descripción e imagen.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-12 — Lighthouse mobile en 3 páginas

- **Objetivo:** sostener ≥ 90 en las 4 categorías (SPEC §1).
- **Requisitos:** SPEC §1, NFR-PERF-01, NFR-A11Y-01, NFR-SEO-01, ADR-0010.
- **Precondiciones:** build de producción local, nada más corriendo en el puerto y Chrome instalado, o `CHROME_PATH` apuntando al Chromium de Playwright. Lighthouse no es dependencia del proyecto: se corre con `npx` y versión fija.

**Pasos**

1. Con el modo demo prendido, corré en PowerShell `npm run build` y después `npm run start`.
2. En otra terminal: `$env:CHROME_PATH = node -p "require('@playwright/test').chromium.executablePath()"`.
3. Corré `npx lighthouse@13.6.0 http://localhost:3000/ --view --no-enable-error-reporting` y repetí con `/areas/sucesiones` y `/contacto`.
4. Frená el servidor. Corré `$env:NEXT_PUBLIC_DEMO_MODE = "false"`, volvé a hacer build y start, y repetí el paso 3 para leer SEO.
5. Al terminar, corré `Remove-Item Env:NEXT_PUBLIC_DEMO_MODE` y volvé a hacer build. **No deployes el build del paso 4:** sería el estudio ficticio indexable.

**Resultado esperado**

- Paso 3: Performance, Accessibility y Best Practices ≥ 90. SEO da menos, solo por "Page is blocked from indexing": es lo esperado en la demo.
- Paso 4: SEO ≥ 90.

| Fecha      | Entorno                                                  | Resultado | Notas                                                                                     |
| ---------- | -------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| 22/11/2026 | Local, Lighthouse 13.6.0, Chromium de Playwright (la IA) | ✅ pasa   | 11 páginas: 99 / 100 / 100 / 100 (SEO sin modo demo; 66 con demo). LCP ≤ 0,9 s, CLS 0. Una corrida por página, antes de la pasada visual. |
| 22/11/2026 | Local, Lighthouse 13.6.0, Chromium de Playwright (la IA) | ✅ pasa   | Después de la pasada visual, 11 páginas: 99–100 / 100 / 100 / 100 (SEO sin modo demo; 66 con demo). LCP ≤ 0,9 s, CLS 0. Una corrida por página. |

### MT-21 — Páginas 404 y de error

- **Objetivo:** que un link roto o un error no deje a la persona sin salida.
- **Requisitos:** FR-16, NFR-A11Y-01.
- **Precondiciones:** sitio levantado. Para el paso 4, `npm run dev` y una copia de trabajo sin cambios en el inicio.

**Pasos**

1. Abrí `/no-existe` y `/areas/no-existe`, con DevTools → Network abierto.
2. Usá "Ir a contacto" y "Volver al inicio".
3. Repetí el paso 2 solo con el teclado.
4. Agregá temporalmente `if (process.env.NODE_ENV) throw new Error("prueba interna");` al principio de `HomePage`, abrí `/`, cerrá el aviso de desarrollo de Next y después **revertí el cambio**.

**Resultado esperado**

- Paso 1: status 404, título "Página no encontrada", mensaje en español, header y footer. En `/areas/no-existe` puede verse un instante en blanco: es la limitación de ADR-0009.
- Pasos 2–3: los links funcionan y el foco se ve siempre.
- Paso 4: se ve "Algo salió mal" con header y footer, sin el texto "prueba interna". Después de revertir, "Probar de nuevo" recupera la página.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-22 — Ayuda ante peligro y plazos

- **Objetivo:** que alguien en riesgo o con un plazo encuentre qué hacer sin buscar, y que los números sean correctos.
- **Requisitos:** SPEC §11.5.
- **Precondiciones:** sitio levantado; un celular. **No llames al 911 para probar.**

**Pasos**

1. Abrí Contacto, cada página de área y el footer de cualquier página.
2. Tocá cada número sin completar la llamada.
3. Compará los números con las fuentes que figuran en `src/content/urgent-help.ts`.
4. Abrí el Inicio, un área y Contacto y buscá el aviso de plazos.
5. Leé "Cómo trabajamos".

**Resultado esperado**

- Paso 1: "¿Estás en peligro?" aparece en Contacto, en las 4 áreas de familia (no en Sucesiones) y en todos los footers. En Contacto, en celular, muestra solo los números.
- Paso 2: el marcador se abre con 911, 137 o 144. Junto al 137 dice "(opción 1)".
- Paso 3: los números, la opción del 137 y la dirección de la OVD coinciden.
- Paso 4: el aviso muestra el teléfono del estudio, el horario y qué hacer si el plazo vence antes.
- Paso 5: el paso 2 no promete una llamada.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |

### MT-23 — Base de datos: tablas y RLS en Supabase

- **Objetivo:** que las migraciones estén aplicadas y que nadie pueda leer ni escribir las consultas con la clave pública de Supabase, que viaja en el navegador.
- **Requisitos:** NFR-SEC-03, ADR-0002, SPEC §7.
- **Precondiciones:** proyecto de Supabase (dev, o prod después de `db:deploy`) con las migraciones aplicadas. Su URL (`https://<project-ref>.supabase.co`) y su clave pública (publishable o anon), de Settings → API. **Nunca uses la service role key**: esa saltea RLS.

> **Pendiente de ejecutar** (ver [Ejecuciones pendientes](#ejecuciones-pendientes)).
>
> - **Dev:** correr los pasos 1 a 5 y 7 en **F4-01**, apenas `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estén en `.env.local`. Es la única prueba de que la API pública de Supabase, la que usa el navegador, no puede leer ni escribir las consultas. Conviene hacerla antes de que el panel use Supabase Auth.
> - **Prod:** el caso completo en **F5-08**, después de `db:deploy`.
> - **Ya verificado en F3-01 (24/11/2026, dev),** sin la API pública, por eso no cuenta como ejecución del caso:
>   - el paso 6: migraciones aplicadas y en sync;
>   - en el catálogo de Postgres: RLS activado con 0 políticas en las 4 tablas;
>   - Enforce SSL: una conexión sin cifrar es rechazada (`ESSLREQUIRED`).

**Pasos**

1. En Supabase → Table Editor, esquema `public`, mirá las tablas.
2. En Supabase → Advisors → Security Advisor, corré el análisis.
3. Desde una terminal, pedí las consultas con la clave pública (en Windows, `curl.exe`):

   ```bash
   curl "https://<project-ref>.supabase.co/rest/v1/inquiries?select=*" -H "apikey: <clave pública>"
   ```

4. Repetí el paso 3 con `inquiry_events`, `staff_members` y `_prisma_migrations`.
5. Intentá insertar con la clave pública:

   ```bash
   curl -X POST "https://<project-ref>.supabase.co/rest/v1/inquiries" -H "apikey: <clave pública>" -H "Content-Type: application/json" -d "{}"
   ```

6. En la terminal del proyecto, corré `npx prisma migrate status`.
7. En Supabase → Database → SSL Configuration, mirá "Enforce SSL on incoming connections".

**Resultado esperado**

- Paso 1: están `inquiries`, `inquiry_events`, `staff_members` y `_prisma_migrations`, y ninguna dice "RLS disabled" (o "Unrestricted").
- Paso 2: ningún aviso de "RLS Disabled in Public" para esas tablas. Puede aparecer "RLS Enabled No Policy" como información: es lo buscado (ADR-0002).
- Pasos 3 y 4: la respuesta es `[]` o un error, **nunca filas**, aunque la tabla tenga datos.
- Paso 5: un error (por ejemplo `new row violates row-level security policy`). No se crea ninguna fila.
- Paso 6: "Database schema is up to date!".
- Paso 7: activado.

| Fecha | Entorno | Resultado | Notas |
| ----- | ------- | --------- | ----- |
|       |         |           |       |
