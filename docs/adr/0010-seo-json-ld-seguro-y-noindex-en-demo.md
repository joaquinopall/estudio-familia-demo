# 0010. SEO: JSON-LD seguro y noindex en modo demo

- **Estado:** Aceptada
- **Fecha:** 21/11/2026
- **Relacionado:** SPEC FR-14, FR-15, NFR-SEO-01, §11.4, CLAUDE.md §5, tarea F2-06

## Contexto

1. Los datos estructurados (JSON-LD) necesitan un `<script>` con contenido crudo. `JSON.stringify` solo no es seguro ahí: un texto con `</script>` cierra la etiqueta y lo que sigue se interpreta como HTML (XSS).
2. La demo muestra un estudio ficticio con matrículas ficticias. Si Google la indexa, alguien que busca abogado de verdad podría encontrarla y confundirse (§11.4).
3. Next combina la metadata de forma superficial: una página que define `openGraph` reemplaza el del layout, incluida la imagen de `opengraph-image.tsx`.

## Decisión

- **Un solo punto de `dangerouslySetInnerHTML`:** el componente `<JsonLd>` (`src/lib/seo/json-ld.tsx`), que serializa con `serializeJsonLd` (escapa `<`, `>`, `&`, U+2028 y U+2029 como secuencias Unicode, sin cambiar el valor JSON).
- **`noindex, nofollow` en modo demo** (`NEXT_PUBLIC_DEMO_MODE=true`), por meta robots en el layout raíz. `robots.txt` **no** bloquea el rastreo del sitio público (solo `/admin`).
- **Toda página pública arma su metadata con `buildPageMetadata`**, que siempre incluye canonical y Open Graph completo con la imagen.

## Alternativas consideradas

- Bloquear la demo en `robots.txt`: no evita que una URL enlazada aparezca en Google, y además impide que herramientas como el Rich Results Test lean las páginas.
- Indexar la demo con el banner visible: el banner no se ve en los resultados de búsqueda.
- `schema-dts` para tipar el JSON-LD: una dependencia más para cuatro tipos simples.

## Consecuencias

- La demo no trae tráfico orgánico (es lo buscado).
- Lighthouse penaliza el `noindex` ("Page is blocked from indexing"), así que el SEO ≥ 90 del SPEC §1 se mide sobre un **build local con el modo demo apagado** (decidido el 22/11/2026, SPEC v1.11). Ese build no se publica: sería el estudio ficticio indexable.
- La protección depende de la variable de entorno: si el deploy de la demo no tiene `NEXT_PUBLIC_DEMO_MODE=true`, se indexa aunque `siteConfig.isFictitious` sea `true`.
- Para un estudio real alcanza con apagar el modo demo y volver a deployar (la variable se resuelve en el build).
- Cada página nueva tiene que usar `buildPageMetadata` y sumarse a `src/lib/seo/routes.ts` para el sitemap.
