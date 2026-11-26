# 0017. Cifrado del mensaje y de las notas a nivel de aplicación

- **Estado:** Aceptada
- **Fecha:** 26/11/2026
- **Relacionado:** SPEC §7, §9, §10.2, §15; NFR-SEC-06, NFR-PRIV-01, NFR-ESC-02; hallazgo H1 de [`SECURITY_REVIEW.md`](../SECURITY_REVIEW.md); tarea F5-02; ADR [0002](0002-supabase-con-prisma-y-rls.md), [0013](0013-ports-sin-excepciones-y-caidas-de-servicios.md).

## Contexto

El mensaje de una consulta (`Inquiry.message`) y las notas internas del estudio (`internalNotes`) pueden contener lo más delicado del sitio: violencia, menores, salud, conflictos familiares. Ya había TLS en tránsito y cifrado de disco del proveedor en reposo, pero **quien ve la base los lee en claro**: el dashboard de Supabase (Table Editor), un backup, un export o una conexión con la contraseña de la base.

Producción todavía no tenía filas (las migraciones de prod son de F5-08), así que era el momento más barato para cambiarlo.

## Decisión

- **Qué se cifra:** `message` e `internalNotes`, con **AES-256-GCM** de `node:crypto`, sin dependencias nuevas. Nombre, email y teléfono quedan en claro: se usan para buscar en el panel y para el aviso al estudio.
- **Dónde:** en el repository (`features/inquiries/repository.ts`), con un port `FieldCipher` (`lib/ports/field-cipher.ts`) y su adapter (`lib/adapters/aes-gcm-field-cipher.ts`). Cifrar es un detalle de cómo se guarda: el service, las actions, los mails y la UI solo ven el texto. El listado no lee esos campos.
- **Formato guardado:** `enc:v1:<id de clave>:<iv>:<cifrado + tag>`, en base64url, con un IV aleatorio de 12 bytes por valor.
- **Contexto autenticado (AAD):** `inquiries.<columna>:<id de la fila>`. Un valor copiado a otra fila u otra columna no descifra. Por eso el id de la consulta se genera en la app (`randomUUID()`) antes del insert.
- **Claves:** `FIELD_ENCRYPTION_KEYS`, privada y obligatoria (§9), con una o más claves `id:base64` de 32 bytes separadas por comas. **La primera cifra; todas descifran.** Se valida al arrancar (`env.schema.ts`), igual que las demás. Una clave distinta para dev (local y Preview) y para prod (Production).
- **Rotación:** agregar la clave nueva **adelante** (`k2:…,k1:…`), desplegar, correr `npm run inquiries:encrypt -- --confirm` (recifra con `k2` lo que estaba en `k1`) y recién entonces sacar `k1`.
- **Filas existentes:** el mismo script cifra lo que está en claro. Es idempotente, conserva `updatedAt` y nunca imprime contenido. Sin `--confirm`, solo cuenta.
- **Descifrado estricto:** un valor que no descifra (clave que falta, dato alterado o fila sin migrar) **nunca** se muestra como texto. El repository tira `InquiryStoreError` con código `decrypt_failed`, el panel muestra su error genérico y el log registra el id y el código. A diferencia de los ports de red (ADR 0013), `decrypt` tira una excepción: no es una caída de un proveedor, es un dato que no se puede leer.
- **Columnas:** `message` e `internal_notes` pasan de `varchar` a `text`, porque el cifrado es más largo que el texto. Los límites de 2000 y 5000 caracteres se siguen validando con Zod sobre el texto (§8.1).

## Alternativas consideradas

- **No cifrar en v1** y aceptar el riesgo: la base de un estudio de familia es justo donde más daño hace una filtración.
- **Cifrado "extremo a extremo"** (solo el navegador del staff descifra): el servidor necesita leer el texto para el panel, y no hay manera razonable de manejar claves por persona en esta escala. No es lo que se hizo, **y no hay que presentarlo así**.
- **Cifrado de columnas de Postgres (`pgcrypto`) o Supabase Vault:** la clave viviría junto a la base, o haría falta en cada consulta SQL. Justamente quien accede a la base es de quien queremos protegernos.
- **Una extensión de Prisma (`$extends`)** que cifre sola: más magia y más difícil de testear que hacerlo explícito en el repository.
- **Aceptar texto en claro "por compatibilidad"** al leer: dejaría la puerta abierta para siempre. Las filas viejas se migran con el script.

## Consecuencias

- **Protege** contra quien accede a la base **sin** la clave: dashboard, backups, exports, la contraseña de la base filtrada.
- **No protege** de un servidor comprometido (tiene la clave), de una sesión de staff robada (el panel muestra el texto), ni de los nombres, emails y teléfonos, que siguen en claro.
- **Si se pierde la clave, los mensajes y las notas cifrados con ella son irrecuperables.** La clave de cada entorno se guarda en un gestor de contraseñas, además de en Vercel.
- Ya no se puede buscar por el texto del mensaje (el panel nunca lo hizo). Los e2e y los tests de base marcan sus filas `E2E-` por el nombre y el email, no por el mensaje.
- Una variable obligatoria más: sin ella, `dev`, `build` y `start` fallan nombrándola. La CI usa una clave ficticia.
- El costo de CPU es despreciable: un cifrado por consulta nueva o nota guardada, y dos descifrados por detalle abierto.
