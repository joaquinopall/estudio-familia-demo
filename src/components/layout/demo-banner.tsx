type DemoBannerProps = { enabled: boolean };

/** Demo-mode notice (FR-15), shown unless NEXT_PUBLIC_DEMO_MODE=false (ADR-0011). */
export function DemoBanner({ enabled }: DemoBannerProps) {
  if (!enabled) return null;

  return (
    // <aside>: content outside header, main and footer needs its own landmark.
    <aside aria-label="Modo demostración">
      <div
        role="note"
        aria-label="Aviso de demostración"
        className="border-b border-border bg-secondary px-4 py-1.5 text-center text-xs text-secondary-foreground sm:py-2 sm:text-sm"
      >
        <p>
          <strong className="font-semibold">Sitio de demostración — estudio ficticio.</strong>
          {/* Phones show only the FR-15 text, to keep the CTA in the first screen. */}
          <span className="hidden sm:inline">
            {" "}
            Los nombres, matrículas y datos de contacto no son reales.
          </span>
        </p>
      </div>
    </aside>
  );
}
