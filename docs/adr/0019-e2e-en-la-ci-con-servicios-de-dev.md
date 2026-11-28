# 0019. E2E en la CI con los servicios de dev, y sin secrets para Dependabot

- **Estado:** Aceptada
- **Fecha:** 28/11/2026
- **Relacionado:** SPEC §13, NFR-MANT-02, NFR-SEC-08, NFR-SEC-09; tarea F5-06; ADR [0013](0013-ports-sin-excepciones-y-caidas-de-servicios.md) y [0017](0017-cifrado-de-campos-a-nivel-de-aplicacion.md).

## Contexto

Hasta F5-06 los e2e (318) y los tests de base (`npm run test:db`) corrían solo en la máquina del dueño. Una parte de los e2e usa servicios reales de dev: la base (el envío, el panel) y Supabase Auth (el login, CSRF). La CI no tenía ningún secret: el build usa valores ficticios.

## Decisión

- **Job `e2e` en la CI**, en paralelo con `verify`: `npm run test:db` y `npm run test:e2e` contra un build local de producción, como en una máquina de desarrollo. No contra el preview de Vercel: habría que esperar el deploy y saltear su protección con otro token, y los tests que escriben en la base igual necesitarían su URL.
- **Secrets de GitHub, solo de dev:**

| Secret | Valor |
| --- | --- |
| `E2E_DATABASE_URL` | La `DATABASE_URL` de Supabase **dev** (pooler). Nunca la de producción. |
| `E2E_SUPABASE_URL` | La URL del proyecto **dev** (`https://<project-ref>.supabase.co`). |
| `E2E_SUPABASE_PUBLISHABLE_KEY` | La publishable key de **dev**. |
| `E2E_STAFF_EMAIL` | El email de un usuario de prueba **solo para la CI**, creado en Supabase dev (Authentication → Users → Add user, con Auto Confirm). No es tu usuario ni el de tus e2e locales. |
| `E2E_STAFF_PASSWORD` | Su contraseña (12 caracteres o más). |

- **Resend y Upstash quedan ficticios** aun con secrets: la CI no manda mails ni gasta cuota, y un rate limiter que no responde deja pasar (ADR-0013). La clave de cifrado es la ficticia de la CI: las filas `E2E-` se cifran y leen con ella y después se borran.
- **Sin secrets (PRs de Dependabot), la suite corre igual** salteando los specs que necesitan la base o Supabase. Las URLs ficticias usan el dominio reservado `.invalid` (RFC 2606), y `tests/e2e/support/services.ts` lo detecta. **A propósito no se cargan los secrets en Dependabot:** un PR de Dependabot ejecuta código de una dependencia nueva, que no tiene que poder leer la URL de la base.
- **Un usuario de prueba aparte para la CI:** el e2e de "acceso denegado" desactiva un momento a su usuario; con uno compartido, una corrida local y una de la CI se romperían entre sí.
- **Una sola corrida de e2e a la vez** en el repositorio (`concurrency: e2e-dev-database`, sin cancelar): todas comparten la base de dev. Cada corrida igual usa sus propios marcadores `E2E-<corrida>`.
- **Artifacts solo si falla:** el reporte de Playwright, las trazas y `e2e-server.log`, por 7 días. No tienen datos personales: el log pasa por la lista blanca del logger y las pantallas solo muestran filas `E2E-`.

## Alternativas consideradas

- **E2E contra el preview de Vercel:** ver Decisión. Además, el preview ya se verifica a mano (MT-28, MT-31).
- **Cargar los secrets también para Dependabot:** cobertura completa en sus PRs, pero cualquier paquete comprometido podría leerlos. El riesgo no lo vale para una base de dev; esos PRs se revisan igual antes de mergear.
- **Una base o un proyecto de Supabase solo para la CI:** más aislamiento, pero otro proyecto que mantener (migraciones, RLS, Auth). Los marcadores por corrida y el usuario aparte alcanzan para este tamaño.

## Consecuencias

- La URL de la base de dev queda guardada en GitHub. GitHub la enmascara en los logs; nunca se imprime.
- La CI tarda unos 6 minutos (los dos jobs en paralelo) en vez de 3.
- "CI / e2e" pasa a ser un check obligatorio para mergear a `main`. En los PRs de Dependabot pasa con los specs de servicios salteados (se ve como un aviso en el resumen del job).
- Un spec nuevo que use la base o Supabase tiene que saltearse con `hasDevServices()`, o fallará en los PRs de Dependabot.
