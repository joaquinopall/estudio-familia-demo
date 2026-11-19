This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Variables de entorno

1. Copiá `.env.example` a `.env.local` (no se commitea). Con los valores del ejemplo ya alcanza para correr el proyecto en local durante la Fase 1.
2. Las variables se validan con Zod al arrancar (`dev`, `build`, `start`). Si falta una obligatoria o tiene un formato inválido, el comando falla y el mensaje dice cuál es.
3. En el código, las variables se leen **solo** desde `src/lib/env.ts` (servidor) o `src/lib/env.public.ts` (componentes cliente). Nunca `process.env.X` suelto.

Hoy la única obligatoria es `NEXT_PUBLIC_SITE_URL`; el resto se vuelve obligatoria en su fase (ver comentarios en `.env.example` y SPEC §9). En Vercel hay que cargarla en Preview y Production.

## Scripts

> El README completo (descripción, variables de entorno, estructura y deploy) se escribe en la tarea F1-08.

| Script                  | Qué hace                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo en `http://localhost:3000`                                 |
| `npm run build`         | Build de producción                                                               |
| `npm run start`         | Sirve el build de producción                                                      |
| `npm run lint`          | ESLint (reglas de Next + TypeScript, compatibles con Prettier)                    |
| `npm run typecheck`     | Genera los tipos de rutas (`next typegen`) y corre `tsc --noEmit`                 |
| `npm run format`        | Formatea el código con Prettier (incluye orden de clases de Tailwind)             |
| `npm run format:check`  | Verifica el formato sin modificar archivos                                        |
| `npm run test`          | Tests unitarios y de componentes con Vitest (una corrida)                         |
| `npm run test:watch`    | Vitest en modo watch                                                              |
| `npm run test:coverage` | Vitest con reporte de cobertura en `coverage/`                                    |
| `npm run test:e2e`      | Tests e2e con Playwright contra el build de producción (levanta el servidor solo) |

Antes del primer `test:e2e` hay que instalar el navegador: `npx playwright install chromium`.

## Diseño y datos del estudio

- **Tokens de diseño** (SPEC §11.1): colores, radios y fuentes en `src/app/globals.css`. Paleta cálida: base marfil, primario verde azulado y acento terracota (solo para llamados a la acción). Un solo tema claro.
  - Los colores están en hex: el test `src/app/__tests__/design-tokens.test.ts` verifica contraste AA (texto 4.5:1; foco y bordes de campos 3:1). Si cambiás un color y el test falla, el contraste no alcanza.
- **Tipografías** (`next/font`, en `src/app/layout.tsx`): Lora para títulos y Plus Jakarta Sans para texto.
- **Componentes UI:** shadcn/ui (base Radix) en `src/components/ui`, generados con `npx shadcn@4.23.0 add <componente>`. No se editan salvo necesidad (excepción: `sonner.tsx` usa tema claro fijo, sin `next-themes`) y no los formatea Prettier.
- **Layout público** (`src/app/(public)/layout.tsx`): link para saltar al contenido, banner de demo (`NEXT_PUBLIC_DEMO_MODE`), header con menú mobile, footer con datos y disclaimer, y botón de WhatsApp. Componentes en `src/components/layout`.
- **Datos del estudio:** todos en `src/config/site.config.ts` (nombre, profesionales y matrículas, dirección, horarios, contacto, WhatsApp, navegación, disclaimer). Para convertir la demo en el sitio de un estudio real se edita ese archivo, no los componentes. Hoy son **ficticios**; el test `site-config.test.ts` lo verifica mientras `isFictitious` sea `true`.

## Headers de seguridad

Todas las rutas responden con HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY` y una Content Security Policy en modo **report-only** (SPEC NFR-SEC-04 y NFR-SEC-05). Se definen en `src/lib/security/headers.ts` y se aplican desde `next.config.ts`.

- **Verlos:** `npm run build && npm run start`, DevTools → Network → documento → Response Headers (o `curl -I <url>`).
- **CSP report-only:** no bloquea nada; las violaciones aparecen en la consola del navegador como `[Report Only]`. En los previews de Vercel son esperables las de `vercel.live` (barra de comentarios); se resuelven al aplicar la CSP en F5-01.
- **Cambiar la política:** editar las directivas en `buildContentSecurityPolicy`. El e2e `tests/e2e/security-headers.spec.ts` falla si el inicio genera violaciones.

## CI y dependencias

- **CI (GitHub Actions, `.github/workflows/ci.yml`):** corre en cada PR hacia `main` y en cada push a `main`. Pasos: `npm ci` → lint → typecheck → format:check → test → build → `npm audit`. El check se llama `CI / verify` y es obligatorio para mergear.
- **Audit:** bloquea solo si hay vulnerabilidades altas en dependencias de producción (`npm audit --omit=dev`). El audit completo corre también pero es informativo (ver SPEC NFR-SEC-08).
- **Node:** versión 24 (`.nvmrc` y `engines` en `package.json`). Con nvm: `nvm use`.
- **Dependabot (`.github/dependabot.yml`):** los lunes revisa npm y GitHub Actions. Las actualizaciones minor/patch llegan agrupadas en un PR; las major, por separado.
- Los e2e (Playwright) todavía no corren en CI (tarea F5-06): correlos en local con `npm run test:e2e`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
