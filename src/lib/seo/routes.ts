import { practiceAreas } from "@/content/practice-areas";

/** Public routes of FR-01 that are not generated from content. The admin panel is never listed. */
export const STATIC_PUBLIC_PATHS = [
  "/",
  "/areas",
  "/nosotros",
  "/preguntas-frecuentes",
  "/contacto",
  "/privacidad",
] as const;

/** Every public, indexable path: static pages plus one per practice area. */
export function getPublicPaths(): string[] {
  return [...STATIC_PUBLIC_PATHS, ...practiceAreas.map((area) => `/areas/${area.slug}`)];
}
