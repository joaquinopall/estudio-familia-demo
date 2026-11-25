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
  list: {
    title: "Consultas",
    filters: {
      legend: "Filtrar consultas",
      status: "Estado",
      allStatuses: "Todos los estados",
      area: "Área",
      allAreas: "Todas las áreas",
      urgency: "Urgencia",
      allUrgencies: "Todas las urgencias",
      search: "Buscar",
      searchHint: "Parte del nombre o del email",
      submit: "Filtrar",
      clear: "Limpiar filtros",
    },
    table: {
      caption: "Consultas, de la más nueva a la más vieja",
      region: "Tabla de consultas",
      date: "Fecha",
      reference: "Referencia",
      person: "Nombre y email",
      area: "Área",
      urgency: "Urgencia",
      status: "Estado",
      contact: "Contacto",
      doNotContact: "No iniciar contacto",
      preferredChannel: "Prefiere",
    },
    empty: {
      none: "Todavía no llegaron consultas.",
      noMatches: "Ninguna consulta coincide con los filtros.",
    },
    pagination: {
      label: "Paginación",
      previous: "Anterior",
      next: "Siguiente",
      page: "Página",
      of: "de",
      inquiry: "consulta",
      inquiries: "consultas",
    },
    loadError: {
      title: "No pudimos cargar las consultas",
      body: "Puede ser un problema momentáneo. Probá de nuevo en unos segundos.",
      retry: "Probar de nuevo",
    },
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
