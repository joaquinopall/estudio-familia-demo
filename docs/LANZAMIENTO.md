# Lanzamiento a producción

El paso a paso para poner el sitio en producción (tarea F5-08), en orden y con cómo verificar cada paso. Sirve para la demo y, con las diferencias de la última sección, para el sitio de cada estudio cliente.

Los comandos son para **cmd** (el símbolo del sistema de Windows). Estos pasos los hace el dueño del proyecto: tocan cuentas y la base de producción, que la IA no opera (CLAUDE.md §5).

> **Cuidado con las variables en la terminal.** En cmd, `set DATABASE_URL=...` queda activo **en esa ventana** hasta cerrarla, y gana sobre `.env.local`: cualquier comando que corras después apunta a producción. Usá una ventana solo para producción y cerrala al terminar.

## 0. Antes de empezar

- **Dominio.** Elegí el dominio o subdominio, por ejemplo `demo-familia.<dominio-de-la-sas>`. En este documento figura como `<dominio>`.
- **Plan de Vercel.** El plan gratuito (Hobby) es para uso personal y no comercial. Revisá sus términos para la demo; el sitio de un estudio cliente va en un plan Pro o en la cuenta del propio estudio.
- **Accesos:** Vercel, Supabase (proyecto **prod**), Resend, Cloudflare (Turnstile), Upstash, Sentry, el DNS del dominio y tu gestor de contraseñas.
- **`main` en verde,** con los checks "CI / verify" y "CI / e2e".

## 1. Base de datos (Supabase prod)

1. En el proyecto **prod**, configurá lo mismo que en dev y verificalo con MT-29:
   - Database → Settings: **Enforce SSL** activado;
   - Authentication → Sign In / Providers: **registro deshabilitado**;
   - contraseña mínima de **12** o más.
2. Aplicá las migraciones. La base de prod está vacía, así que esta primera vez no hace falta el export previo de SPEC §14 (las siguientes sí):

   ```cmd
   set DIRECT_URL=<url de conexión directa o del pooler en modo sesión, de prod>
   npm run db:deploy
   npx prisma migrate status
   ```

   Tiene que decir "Database schema is up to date!".
3. Corré **MT-23** (RLS con la clave pública de prod) y **MT-24** contra prod.

## 2. Dominio (Vercel)

1. Vercel → el proyecto → Settings → **Domains** → Add `<dominio>`.
2. Cargá en tu DNS el registro que te indica Vercel (CNAME o A). El certificado HTTPS lo emite Vercel solo.
3. Verificá que `https://<dominio>` cargue el sitio.

## 3. Mails (Resend)

1. Resend → **Domains** → Add domain. Puede ser `<dominio>` o un subdominio de mails.
2. Cargá en el DNS los registros que indica Resend (SPF y DKIM; DMARC recomendado) y esperá a que diga **Verified**.
3. Creá una API key con permiso **Sending access** para producción.
4. Definí el remitente con un **nombre y una dirección neutros**, sin la especialidad del estudio (US-03 CA5). Por ejemplo `Estudio Alameda <avisos@<dominio>>`; nunca "Familia" ni "Sucesiones".

## 4. Anti-bots (Cloudflare Turnstile)

1. Cloudflare → Turnstile → **Add widget**: tipo **Managed**, con hostname `<dominio>`.
2. Copiá la site key y la secret key. **Van solo en Production**: en Preview siguen las de prueba (ADR-0013).

## 5. Rate limit (Upstash)

Creá una base de Redis **aparte para producción**, en una región cercana a Vercel (us-east). Copiá la REST URL y el token de escritura (no el read-only).

## 6. Variables de Production (Vercel)

Vercel → Settings → Environment Variables, entorno **Production**:

| Variable | Valor en producción |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://<dominio>`, sin barra final |
| `NEXT_PUBLIC_DEMO_MODE` | `true` para la demo (banner, `noindex` y el aviso del formulario) |
| `NEXT_PUBLIC_SUPABASE_URL` | La URL del proyecto **prod** |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | La publishable key de **prod** |
| `DATABASE_URL` | El pooler de **prod** (puerto 6543) |
| `RESEND_API_KEY` | La key del paso 3 |
| `EMAIL_FROM` | El remitente neutro del paso 3 |
| `FIRM_NOTIFICATION_EMAIL` | La casilla que recibe los avisos de consultas nuevas |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Las claves reales del paso 4 |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | La base de prod del paso 5 |
| `IP_HASH_SALT` | **Nueva**, solo para prod: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FIELD_ENCRYPTION_KEYS` | La clave de **prod** (F5-02), guardada en tu gestor de contraseñas |
| `SENTRY_DSN` | El DSN del proyecto de Sentry (opcional, recomendado) |

`DIRECT_URL` **no** se carga en Vercel.

## 7. Deploy

1. Vercel → Deployments → el último de Production → **Redeploy**. Las variables se toman al armar el deploy.
2. Verificá:
   - `https://<dominio>` carga, con el banner de demostración;
   - en Vercel → Logs aparece `error_reporting.started` con `enabled: true`;
   - el header de la respuesta tiene `content-security-policy` **sin** `vercel.live` (MT-28, paso 6).

## 8. Staff de producción

1. Supabase **prod** → Authentication → Users → **Add user**, con Auto Confirm y una contraseña de 12 o más (guardala en tu gestor). **Ese usuario no se comparte:** si alguien escribe un caso real en la demo, lo vería.
2. En una ventana de cmd solo para producción:

   ```cmd
   set DATABASE_URL=<pooler de prod>
   npm run staff:add -- --email <tu email> --name "<Tu nombre>"
   ```

   Tiene que mostrar el project-ref de **prod** y "Staff dado de alta" (MT-25).

## 9. Datos de ejemplo (solo la demo)

En la misma ventana de producción:

```cmd
set FIELD_ENCRYPTION_KEYS=<clave de prod>
npm run demo:seed
npm run demo:seed -- --confirm
```

La primera corrida muestra el proyecto y "Cargaría 8 consultas"; la segunda las carga, cifradas con la clave de prod. Se reconocen porque empiezan con "[Ejemplo]". Para borrarlas: `npm run demo:seed -- --remove`. El script se niega a correr si `NEXT_PUBLIC_DEMO_MODE` está en `false`.

**Cerrá esa ventana al terminar.**

## 10. Pruebas en producción

Corré y pasá los resultados para registrarlos en [`TESTING.md`](TESTING.md):

- **MT-13 paso 5:** el banner y `noindex` en producción;
- **MT-23, MT-24, MT-25 y MT-29:** contra prod;
- **MT-28 paso 6:** la CSP sin `vercel.live`;
- **MT-30:** en el Table Editor de prod, el mensaje de una consulta de ejemplo se ve `enc:v1:…`;
- **MT-31:** un error de prueba llega a Sentry con `environment: production`;
- **MT-32 paso 1:** `npm run inquiries:purge` contra prod, solo contar.

Además, una prueba de humo del formulario real, con Turnstile de verdad: mandá una consulta con tu email privado. Te tienen que llegar el aviso y el acuse, la consulta tiene que verse en el panel, y después descartala.

## 11. Después del lanzamiento

- **Una vez por mes:** `npm run inquiries:purge` contra prod, primero sin `--confirm` (README, "Retención de datos").
- **Migraciones nuevas:** export de la base y `npm run db:deploy` contra prod **antes** de mergear (SPEC §14).
- **Alertas:** los mails de Sentry y los PRs de Dependabot.

## Para un estudio cliente

Lo mismo, con estas diferencias:

- `NEXT_PUBLIC_DEMO_MODE=false` y `isFictitious: false` en `site.config.ts` (README, "Pasar a un estudio real");
- sus propias cuentas y claves, incluida una `FIELD_ENCRYPTION_KEYS` generada para él;
- **sin** `demo:seed`;
- su abogado revisa la política de privacidad antes de publicar.
