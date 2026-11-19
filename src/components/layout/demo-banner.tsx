type DemoBannerProps = { enabled: boolean };

/** Demo-mode notice (FR-15), shown when NEXT_PUBLIC_DEMO_MODE=true. */
export function DemoBanner({ enabled }: DemoBannerProps) {
  if (!enabled) return null;

  return (
    <div
      role="note"
      aria-label="Aviso de demostración"
      className="border-b border-border bg-secondary px-4 py-2 text-center text-sm text-secondary-foreground"
    >
      <p>
        <strong className="font-semibold">Sitio de demostración — estudio ficticio.</strong> Los
        nombres, matrículas y datos de contacto no son reales.
      </p>
    </div>
  );
}
