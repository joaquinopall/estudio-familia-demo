/**
 * What the panel shows at once while a page streams in (loading.tsx of the list and the
 * detail). It never carries inquiry data: each page still runs requireStaff() before reading
 * anything (NFR-SEC-02). Without it, a client navigation between the list and the detail
 * waited for the database with nothing on screen (Next 16 instant navigation).
 */
export function PanelLoading({ label }: { label: string }) {
  return (
    <main id="contenido" className="mx-auto w-full max-w-6xl px-6 py-10">
      <p role="status" className="text-muted-foreground">
        {label}
      </p>
    </main>
  );
}
