import { homeBreadcrumb } from "@/content/home";

/**
 * Privacy policy (US-07, Ley 25.326, NFR-PRIV-01). Versioned: the inquiry form stores
 * `privacyPolicy.version` with each consent (US-07 CA2, F3), so any change to the text below
 * must bump the version and the effective date.
 *
 * The firm's identity (name, address, email) is not written here: the page renders it from
 * site.config.ts in the "responsable" section (FR-03).
 *
 * DRAFT: it must be reviewed by a lawyer and adapted to each real firm before going live.
 */

export type PrivacySection = {
  /** Anchor id: lowercase kebab-case. */
  id: string;
  title: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
  /** Paragraphs shown after the list. */
  closing?: readonly string[];
};

/** Mandatory notices of Disposición 10/2008 (now enforced by the AAIP). Keep them verbatim. */
export const AAIP_ACCESS_NOTICE =
  "El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326.";

export const AAIP_AUTHORITY_NOTICE =
  "La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.";

export const privacyPolicy = {
  // 1.1: safe contact (safeToContact, emailIsPrivate) and receipt only to a private email.
  version: "1.1",
  /** ISO date (YYYY-MM-DD). */
  effectiveDate: "2026-11-24",
  breadcrumbs: [homeBreadcrumb, { label: "Política de privacidad", href: "/privacidad" }],
  title: "Política de privacidad",
  lead: "Te contamos qué datos recolectamos cuando nos escribís, para qué los usamos, con quién los compartimos y cómo podés ejercer tus derechos, conforme a la Ley 25.326 de Protección de los Datos Personales.",
  demoNotice:
    "Este es un sitio de demostración: el estudio, sus profesionales y sus datos de contacto son ficticios. Esta política es un modelo y no se aplica a ningún estudio real.",
  tocLabel: "Contenido",
  versionLabel: "Versión",
  effectiveDateLabel: "Vigente desde el",
  controllerId: "responsable",
  sections: [
    {
      id: "responsable",
      title: "Quién es responsable de tus datos",
      paragraphs: [
        "El responsable de la base de datos es el estudio, con los datos de contacto que figuran a continuación. Ante cualquier duda sobre esta política o sobre tus datos, podés escribirnos a ese email.",
      ],
    },
    {
      id: "datos",
      title: "Qué datos recolectamos",
      paragraphs: ["Cuando completás el formulario de consulta, recolectamos:"],
      items: [
        "Tu nombre y apellido.",
        "Tu email y, si lo indicás, tu teléfono.",
        "El tipo de consulta, la urgencia y el mensaje que nos escribís.",
        "El medio por el que preferís que te contactemos y, si elegís teléfono o WhatsApp, si es seguro contactarte por ese medio.",
        "Si tu email es privado, es decir, si solo lo leés vos.",
        "La fecha en que aceptaste esta política y su versión.",
        "Un código derivado de tu dirección IP (no la IP en sí), que usamos solo para prevenir abusos.",
      ],
      closing: [
        "No te pedimos datos sensibles. Si en tu mensaje incluís información sobre tu salud, situaciones de violencia u otros datos sensibles, la tratamos con la máxima reserva y solo para analizar tu consulta.",
      ],
    },
    {
      id: "finalidad",
      title: "Para qué los usamos",
      paragraphs: [
        "Usamos tus datos únicamente para responder tu consulta, contactarte por el medio que elegiste y llevar el seguimiento interno de la consulta. No los usamos con fines publicitarios ni los vendemos.",
        "Solo iniciamos el contacto por un medio que nos indicaste como seguro: el teléfono o WhatsApp, si nos dijiste que es seguro, o tu email, si nos dijiste que es privado. Si no hay ningún medio seguro, no te contactamos nosotros: guardá el número de referencia y comunicate con el estudio cuando puedas hacerlo con tranquilidad.",
        "La base para tratarlos es tu consentimiento libre, expreso e informado, que das al marcar la casilla del formulario (art. 5, Ley 25.326).",
      ],
    },
    {
      id: "caracter",
      title: "Qué datos son obligatorios",
      paragraphs: [
        "El nombre, el email, el tipo de consulta, la urgencia, el mensaje, el consentimiento y la respuesta a si tu email es privado son obligatorios: sin ellos no podemos responderte. El teléfono es opcional, salvo que elijas que te contactemos por teléfono o por WhatsApp; en ese caso también te preguntamos si es seguro contactarte por ese medio. Darnos datos inexactos puede impedir que te respondamos (art. 6, Ley 25.326).",
      ],
    },
    {
      id: "terceros",
      title: "Con quién los compartimos",
      paragraphs: [
        "No cedemos tus datos a terceros. Para que el sitio funcione, algunos proveedores tecnológicos los procesan por cuenta del estudio, solo para prestar su servicio:",
      ],
      items: [
        "Vercel Inc. (Estados Unidos): alojamiento del sitio.",
        "Supabase Inc. (Estados Unidos): base de datos donde se guardan las consultas y acceso al panel interno del estudio.",
        "Resend (Estados Unidos): envío de los emails de aviso al estudio y del acuse de recibo a vos. El acuse se envía solo si nos indicaste que tu email es privado, y no menciona el motivo de tu consulta.",
        "Cloudflare Inc. (Estados Unidos), con su servicio Turnstile: verificación anti-spam del formulario, que analiza datos técnicos de tu navegador.",
        "Upstash Inc. (Estados Unidos): control de la cantidad de envíos, con identificadores técnicos temporales.",
      ],
      closing: [
        "Estos proveedores pueden almacenar o procesar los datos fuera de la Argentina, incluso en países que no tienen un nivel de protección equivalente al argentino. Al aceptar esta política, prestás tu consentimiento para esa transferencia internacional (art. 12, Ley 25.326).",
        "Si nos escribís por WhatsApp, esa conversación se rige además por las políticas de WhatsApp (Meta).",
      ],
    },
    {
      id: "conservacion",
      title: "Cuánto tiempo los guardamos",
      paragraphs: [
        "Guardamos tus datos mientras tu consulta esté en curso. Las consultas cerradas o descartadas se eliminan cuando tienen más de 24 meses.",
        "Si iniciamos una relación profesional, los datos vinculados a tu caso se conservan según las obligaciones legales y profesionales que correspondan.",
      ],
    },
    {
      id: "seguridad",
      title: "Cómo los protegemos",
      paragraphs: [
        "Aplicamos medidas técnicas y organizativas para proteger tus datos: conexión cifrada, acceso al panel solo para el personal autorizado del estudio, y registro de quién y cuándo modifica cada consulta (art. 9, Ley 25.326).",
        "Todas las personas que acceden a tus datos están obligadas a guardar secreto, además del secreto profesional que rige para la abogacía (art. 10, Ley 25.326).",
      ],
    },
    {
      id: "derechos",
      title: "Tus derechos",
      paragraphs: ["Sobre tus datos personales, tenés derecho a:"],
      items: [
        "Acceder a ellos: saber qué datos tenemos sobre vos. Respondemos dentro de los 10 días corridos (art. 14).",
        "Rectificarlos o actualizarlos si son inexactos o están incompletos (art. 16).",
        "Pedir que los eliminemos, cuando no exista una obligación legal de conservarlos (art. 16).",
        "Retirar tu consentimiento en cualquier momento, sin efecto retroactivo.",
      ],
      closing: [
        "Para ejercerlos, escribinos al email del estudio indicando tu nombre y qué necesitás. Las rectificaciones y supresiones se resuelven dentro de los 5 días hábiles (art. 16).",
        AAIP_ACCESS_NOTICE,
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      paragraphs: [
        "El sitio público no usa cookies de publicidad ni de seguimiento. El panel interno del estudio usa cookies técnicas, necesarias para mantener la sesión del personal autorizado.",
      ],
    },
    {
      id: "autoridad",
      title: "Autoridad de control",
      paragraphs: [AAIP_AUTHORITY_NOTICE],
    },
    {
      id: "cambios",
      title: "Cambios en esta política",
      paragraphs: [
        "Si modificamos esta política, publicamos la nueva versión en esta página con su fecha de vigencia. Cada consulta guarda la versión que aceptaste al enviarla.",
      ],
    },
  ],
  metadata: {
    title: "Política de privacidad",
    description:
      "Qué datos recolectamos cuando nos consultás, para qué los usamos, cuánto tiempo los guardamos y cómo ejercer tus derechos (Ley 25.326).",
  },
} as const satisfies {
  version: string;
  effectiveDate: string;
  breadcrumbs: readonly { label: string; href: string }[];
  title: string;
  lead: string;
  demoNotice: string;
  tocLabel: string;
  versionLabel: string;
  effectiveDateLabel: string;
  controllerId: string;
  sections: readonly PrivacySection[];
  metadata: { title: string; description: string };
};
