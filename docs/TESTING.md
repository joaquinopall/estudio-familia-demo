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
| Unit        | Vitest                       | `src/**/__tests__/*.test.ts`                 | Schemas de env, `.env.example`, `ActionResult`, logger sin PII, headers y CSP, WhatsApp, `site.config`, contraste de tokens |
| Componentes | Vitest + Testing Library     | `src/**/__tests__/*.test.tsx`                | Inicio, header y menú mobile (teclado, `aria-expanded`), footer, banner, skip link, WhatsApp      |
| E2E         | Playwright + axe             | `tests/e2e/*.spec.ts`                        | Smoke del inicio, headers de seguridad, CSP sin violaciones, layout, teclado, menú mobile, accesibilidad (axe) |
| Manual      | Esta guía                    | Sección "Guía de tests manuales"             | Lo que conviene mirar con ojos humanos o en dispositivos reales                                   |

Próximas fases: services con fakes de repos y ports, actions (validación, auth, rate limit, captcha), formulario y e2e de envío (F3), admin (F4).

### Convenciones

- Los tests viven junto al código, en una carpeta `__tests__/` (unit y componentes) o en `tests/e2e/` (e2e).
- Nombres de tests en inglés; textos esperados de interfaz en español, tal como los ve el usuario.
- Preferí consultas por rol y nombre accesible (`getByRole("button", { name: "Menú" })`): si un test no encuentra un elemento así, probablemente un lector de pantalla tampoco.
- Un bug arreglado = un test que lo reproduce.
- Cobertura objetivo: 80% en `src/features/**` (services, schemas y actions), a medida que existan.
- En tests, `server-only` se reemplaza por un módulo vacío (`tests/stubs/server-only.ts`).

### Cuando falla un test "especial"

- **`design-tokens.test.ts`:** un par de colores de `globals.css` no llega al contraste WCAG AA (texto 4.5:1; foco y bordes de campos 3:1). Ajustá el color, no el umbral.
- **`security-headers.spec.ts` → "without report-only CSP violations":** algo del inicio carga un recurso que la CSP no permite. Mirá la consola del navegador (`[Report Only]`) y decidí si se agrega a la política en `src/lib/security/headers.ts` o se quita el recurso.
- **`layout.spec.ts` → axe:** el mensaje lista la regla (por ejemplo `color-contrast`, `label`); la ayuda de cada regla está en <https://dequeuniversity.com/rules/axe/>.
- **`env.example.test.ts`:** agregaste o sacaste una variable del schema y no actualizaste `.env.example` (o al revés).

## En la CI

La CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) corre en cada PR y push a `main`: lint → typecheck → format:check → **test** → build → audit. Los **e2e no corren en la CI todavía** (tarea F5-06): corrélos en local antes de abrir un PR que toque la interfaz.

## Guía de tests manuales

Los tests manuales cubren lo que la automatización no ve bien: cómo se siente el sitio en un celular real, si se entiende, si funciona con el teclado de punta a punta. Se ejecutan antes de cerrar cada fase y antes del lanzamiento.

### Cómo registrar una ejecución

Al final de cada caso hay una tabla. Agregá una fila por ejecución con la fecha, el entorno (local, preview con su URL o producción; navegador y dispositivo), el resultado (✅ pasa / ❌ falla) y notas. Si falla, abrí un issue o una tarea con el detalle y el link a la fila.

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
| MT-01 | Navegar todas las páginas en un celular real            | F2-08         | Pendiente     |
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
| MT-12 | Lighthouse mobile en 3 páginas                          | F2-07         | Pendiente     |
| MT-13 | Banner de modo demo                                     | F1-08         | **Detallado** |
| MT-14 | Botón de WhatsApp                                       | F1-08         | **Detallado** |
| MT-15 | Error de mail simulado (la consulta se guarda igual)    | F3-09         | Pendiente     |
| MT-16 | Inicio responsive (360 a 1440 px)                       | F2-02         | **Detallado** |
| MT-17 | Áreas de práctica: navegación, CTA y 404                | F2-03         | **Detallado** |
| MT-18 | Nosotros, Preguntas frecuentes y Privacidad             | F2-04         | **Detallado** |

### MT-11 — Navegación completa solo con teclado

- **Objetivo:** que alguien que no usa mouse (o usa un lector de pantalla) pueda recorrer y usar todo el sitio.
- **Requisitos:** NFR-A11Y-01 (WCAG 2.2 AA: teclado, foco visible, link para saltar al contenido).
- **Precondiciones:** sitio abierto en desktop (local con `npm run dev` o el preview). No tocar el mouse durante la prueba.

**Pasos**

1. Recargá la página de inicio y apretá **Tab** una vez.
2. Apretá **Enter**.
3. Seguí apretando **Tab** hasta llegar al final de la página, y después **Shift+Tab** para volver.
4. Sobre un link del menú, apretá **Enter**.
5. Achicá la ventana a ancho de celular (o DevTools → modo dispositivo, 375 px), recargá y llegá con **Tab** al botón **Menú**. Apretá **Enter**, recorré los links con **Tab** y apretá **Escape**.

**Resultado esperado**

- Paso 1: aparece arriba a la izquierda el link **"Saltar al contenido"**.
- Paso 2: el foco pasa al contenido principal (el siguiente Tab va al primer elemento del contenido, no al menú).
- Paso 3: el foco **siempre se ve** (contorno verde azulado) y pasa en orden lógico por: header (nombre del estudio, menú, CTA), contenido, footer (mapa, teléfono, email, política de privacidad) y botón de WhatsApp. Ningún elemento queda inalcanzable ni atrapa el foco.
- Paso 4: navega a esa página (las de la Fase 2 todavía dan 404).
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
3. Cambiá a `NEXT_PUBLIC_DEMO_MODE=false` (o borrá la línea), repetí el build y abrí el inicio.
4. Poné un valor inválido (`NEXT_PUBLIC_DEMO_MODE=si`) y corré `npm run build`.

**Resultado esperado**

- Paso 1–2: arriba de todo se ve "**Sitio de demostración — estudio ficticio.** Los nombres, matrículas y datos de contacto no son reales.", legible y sin cortarse en mobile.
- Paso 3: el banner no aparece.
- Paso 4: el build falla con `NEXT_PUBLIC_DEMO_MODE: debe ser "true" o "false"`.
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

1. En el celular, recorré el inicio de arriba a abajo mirando el botón redondo abajo a la derecha.
2. Tocá el botón.
3. En la computadora, pasá el mouse por el botón y tocalo.
4. Revisá la URL que abre.

**Resultado esperado**

- Paso 1: el botón se ve en toda la página, no tapa contenido importante ni el footer de forma que no se pueda leer.
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

1. Abrí `/` a 360 px y recorrela de arriba a abajo.
2. Repetí a 768 px (tablet), 1024 px y 1440 px.
3. A 1440 px, pasá el mouse por una tarjeta de área.
4. En cualquier ancho, recorré la página con **Tab**.

**Resultado esperado**

- En ningún ancho aparece scroll horizontal ni texto pegado a los bordes de una tarjeta.
- 360 px: el título, el botón "Contanos tu caso" y la frase de confidencialidad entran sin hacer scroll; las áreas van de a una; los 3 pasos van en columna, unidos por una línea vertical; el bloque de confianza es una sola ficha con divisiones.
- 768 px: el header muestra el botón **Menú** (no los links); las áreas van de a 2 y la quinta queda centrada; los pasos siguen en columna.
- 1024 px o más: el header muestra los links y el botón; a la derecha del hero aparece la ficha con dirección, horario y tiempo de respuesta; las áreas van de a 3 y las 2 últimas quedan centradas; los 3 pasos van en fila, unidos por una línea; las preguntas frecuentes van a la derecha del título.
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
- Paso 2: en orden se ven migas de pan, título, introducción, botón, "¿Cuándo consultar?", "¿Qué documentación suele hacer falta?" (con la aclaración de que es orientativa), preguntas frecuentes, "Otras áreas" y el cierre. A 1440 px, "Cuándo consultar" y "Documentación" van lado a lado; a 360 px, una debajo de la otra.
- Paso 3: los dos apuntan a `/contacto?area=sucesiones` (la página de contacto todavía no existe: da 404 hasta F2-05).
- Paso 4: "Otras áreas" muestra las otras 4, no la actual; `/areas` muestra las 5 tarjetas y el bloque "¿Tu situación no está en la lista?".
- Paso 5: se ve la página 404 (la de Next por defecto hasta F2-07). En DevTools → Network, el documento tiene status **404**.
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
