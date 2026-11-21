# 0009. Rutas dinámicas estáticas con Cache Components

- **Estado:** Aceptada
- **Fecha:** 21/11/2026
- **Relacionado:** SPEC FR-01, §6.1 (server-first), NFR-PERF-01, tarea F2-03

## Contexto

`/areas/[slug]` tiene que generarse en el build (una página por área) y devolver **404** para cualquier otro slug. El proyecto usa `cacheComponents: true` y `partialPrefetching: true` (`next.config.ts`). Con esa configuración:

- `export const dynamicParams = false` no está permitido: el build falla.
- Para un slug que no está en `generateStaticParams`, Next 16.4 manda primero el App Shell (con 200) y renderiza el resto en streaming. El `notFound()` de la página llega tarde: la respuesta queda en **200 con `noindex`** (un "soft 404"), no en 404.

## Decisión

Las rutas dinámicas del sitio público cuyo contenido es fijo exportan:

```ts
export const ensureStatic = "navigation";
export function generateStaticParams() { /* todos los valores conocidos */ }
```

y la página llama a `notFound()` si el parámetro no existe. Con `'navigation'`, un parámetro no listado espera el render completo antes de responder, así que `notFound()` devuelve un 404 real.

## Alternativas consideradas

- Aceptar el soft 404 (200 + `noindex`): Google no lo indexa, pero el SPEC pide 404 y confunde a monitoreo y tests.
- Validar el slug en `proxy.ts` y responder 404 ahí: duplica la lista de slugs fuera de la página y el proxy todavía no existe (llega con el admin, F4).
- Desactivar `cacheComponents`: cambia el modelo de render de todo el proyecto por una sola ruta.

## Consecuencias

- Las páginas listadas son 100% estáticas y **el build falla** si alguien les agrega trabajo por request (`cookies()`, `headers()`, `searchParams` del servidor, datos sin `use cache`). Refuerza NFR-PERF-01.
- Un slug desconocido se renderiza una vez en el servidor para responder 404 (costo mínimo: el contenido es local).
- Test que lo vigila: `src/app/__tests__/area-page.test.tsx` (exporta `ensureStatic = "navigation"`) y el e2e `tests/e2e/areas.spec.ts` (status 404).
- Aplicar el mismo patrón a futuras rutas dinámicas públicas con contenido fijo.
