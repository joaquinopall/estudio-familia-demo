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
  /** Name of the session bar's region, so it is inside a landmark (F5-03, axe "region"). */
  sessionRegion: "Tu sesión",
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
    /** loading.tsx: shown at once on a navigation, while the list streams in. */
    loading: "Cargando consultas…",
    loadError: {
      title: "No pudimos cargar las consultas",
      body: "Puede ser un problema momentáneo. Probá de nuevo en unos segundos.",
      retry: "Probar de nuevo",
      /** Next's digest of the error (F5-04), to find it in the logs as `request.error`. */
      code: "Código del error:",
    },
  },
  detail: {
    /** loading.tsx: shown at once on a navigation, while the inquiry streams in. */
    loading: "Cargando la consulta…",
    backToList: "Volver al listado",
    receivedAt: "Recibida el",
    contact: {
      title: "Cómo contactar",
      contactBy: "Contactar por",
      /** The preferred channel was not safe, so the safe one is the private email. */
      fallbackNote: "Eligió otro canal, pero dijo que no es seguro. Su email es privado.",
      doNotContactTitle: "No iniciar contacto",
      doNotContactBody:
        "No hay un medio seguro: el canal que eligió no es seguro o su email no es privado. Esperá a que se comunique con el estudio, con la referencia de su consulta.",
    },
    person: {
      title: "Datos de la persona",
      fullName: "Nombre",
      email: "Email",
      emailPrivate: "privado",
      emailNotPrivate: "no es privado: puede leerlo otra persona",
      phone: "Teléfono",
      noPhone: "No dejó teléfono",
      preferredChannel: "Canal preferido",
      safeToContact: "¿Es seguro ese canal?",
      yes: "Sí",
      no: "No",
      notAsked: "No se pregunta para email",
    },
    inquiry: {
      title: "Consulta",
      area: "Área",
      urgency: "Urgencia",
      message: "Mensaje",
    },
    consent: {
      title: "Consentimiento",
      accepted: "Aceptó la política de privacidad, versión",
      on: "el",
      source: "Origen",
    },
    status: {
      title: "Estado",
      label: "Estado de la consulta",
      submit: "Cambiar estado",
      submitting: "Guardando…",
      changed: "Estado actualizado.",
      unchanged: "La consulta ya estaba en ese estado.",
    },
    notes: {
      title: "Notas internas",
      label: "Notas internas",
      hint: "Solo las ve el equipo del estudio. Hasta 5000 caracteres.",
      submit: "Guardar notas",
      submitting: "Guardando…",
      saved: "Notas guardadas.",
      unchanged: "No había cambios para guardar.",
      characters: "caracteres",
    },
    history: {
      title: "Historial",
      website: "Sitio web",
      unknownStaff: "Staff",
      created: "Consulta recibida",
      statusChanged: "Estado:",
      notesUpdated: "Notas actualizadas",
    },
    notFound: {
      title: "No encontramos esta consulta",
      body: "Puede que el link esté mal copiado o que la consulta ya no exista.",
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
