/**
 * Copy of the admin panel (FR-10). Imported by a Client Component (the login form), so this
 * file must stay free of other imports to keep the client bundle small.
 */

export const adminPanelContent = {
  /** Next to the firm's short name in the panel header. */
  panelLabel: "Panel",
  metaTitle: "Panel de consultas",
  checkingSession: "Verificando tu sesión…",
  signedInAs: "Sesión de",
  signOut: "Cerrar sesión",
  home: {
    title: "Panel de consultas",
    placeholder: "Acá vas a ver las consultas que lleguen desde el sitio.",
  },
  login: {
    metaTitle: "Ingresar al panel",
    title: "Ingresar al panel",
    lead: "Acceso exclusivo para el equipo del estudio.",
    email: "Email",
    password: "Contraseña",
    submit: "Ingresar",
    submitting: "Ingresando…",
  },
  /** /admin/login?error=forbidden (SPEC §6.4): never says whether the account is inactive or was never staff. */
  forbidden: {
    title: "Esta cuenta no tiene acceso al panel",
    body: "Si creés que es un error, hablá con quien administra el sitio. También podés ingresar con otra cuenta.",
    switchAccount: "Usar otra cuenta",
  },
} as const;
