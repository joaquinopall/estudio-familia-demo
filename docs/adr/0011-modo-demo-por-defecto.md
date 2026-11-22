# 0011. Modo demo encendido por defecto

- **Estado:** Aceptada
- **Fecha:** 22/11/2026
- **Relacionado:** SPEC FR-15, §9, §11.4, ADR-0006, ADR-0010, tarea F2-07

## Contexto

`NEXT_PUBLIC_DEMO_MODE` valía `false` si no estaba definida. Un deploy sin la variable publicaba el estudio ficticio sin banner e indexable, y nada fallaba ni avisaba: los e2e fuerzan la variable en `true`.

## Decisión

Si la variable falta o está vacía, el modo demo queda **encendido** (banner y `noindex, nofollow`). Solo se apaga con `NEXT_PUBLIC_DEMO_MODE=false` explícito.

## Alternativas consideradas

- Seguir con `false` y documentarlo: es como estaba, y un olvido no se nota.
- Hacer obligatoria la variable: rompe la CI y los previews que no la definen, sin ser más seguro.
- Derivarlo de `siteConfig.isFictitious`: impediría el build local sin modo demo con el que se mide el SEO (SPEC §1).

## Consecuencias

- Un olvido falla hacia el lado seguro y se ve: aparece el banner.
- Al pasar a un estudio real hay que definir la variable en `false` y volver a deployar. Si se olvida, el sitio real queda con banner y sin indexar.
- La CI, que no define la variable, buildea en modo demo.
