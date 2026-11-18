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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
