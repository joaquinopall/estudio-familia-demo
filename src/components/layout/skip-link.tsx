export const MAIN_CONTENT_ID = "contenido";

/** First focusable element: lets keyboard users jump past the header (NFR-A11Y-01). */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
    >
      Saltar al contenido
    </a>
  );
}
