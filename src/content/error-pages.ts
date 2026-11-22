/**
 * Copy for the 404 and error pages (FR-16). Imported by a Client Component (the error boundary),
 * so this file must stay free of other imports to keep the client bundle small.
 */

export const errorPagesLinks = {
  home: { label: "Volver al inicio", href: "/" },
  contact: { label: "Ir a contacto", href: "/contacto" },
} as const;

export const notFoundContent = {
  metaTitle: "Página no encontrada",
  eyebrow: "Error 404",
  title: "No encontramos esta página",
  lead: "Puede que la dirección esté mal escrita o que la página ya no exista. Podés volver al inicio o escribirnos y te orientamos.",
} as const;

export const errorContent = {
  title: "Algo salió mal",
  lead: "Tuvimos un problema al mostrar esta página. Podés probar de nuevo, volver al inicio o contactarnos por otro medio.",
  retryLabel: "Probar de nuevo",
} as const;
