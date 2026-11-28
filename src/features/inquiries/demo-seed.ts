/**
 * Example inquiries for the demo's panel (F5-08), used by `npm run demo:seed`.
 *
 * Eight fictitious inquiries covering every area, urgency, status and contact plan (including
 * "No iniciar contacto"), with notes and history, so the panel is not empty when the demo is
 * shown. Every one is marked as fictitious: the name starts with "[Ejemplo]" and the email is
 * on example.com. They go through the real InquiryRepository, so the message and the notes are
 * encrypted with the environment's key (ADR-0017), like any inquiry.
 *
 * Only in demo mode: it refuses to write into a real firm's database. Idempotent: if example
 * inquiries already exist, it adds nothing. Pure: the storage comes as a parameter.
 */
import type { InquiryRepository, NewInquiryRecord } from "./service";
import type { InquiryStatus } from "./types";

export const DEMO_NAME_PREFIX = "[Ejemplo] ";
export const DEMO_SOURCE = "demo-seed";

export interface DemoSeedStore {
  /** How many inquiries have a name starting with DEMO_NAME_PREFIX. */
  countDemo(): Promise<number>;
  /** The oldest active staff member, as the actor of the example history; null if none. */
  firstActiveStaffId(): Promise<string | null>;
  /** Deletes the example inquiries (and their history) and returns how many. */
  deleteDemo(): Promise<number>;
}

export type DemoInquiry = {
  record: NewInquiryRecord;
  status: InquiryStatus;
  notes?: string;
};

/** Status changes from NEW to reach `status`, as the panel would do them (FR-11, FR-12). */
export const STATUS_PATH: Record<InquiryStatus, readonly InquiryStatus[]> = {
  NEW: [],
  IN_REVIEW: ["IN_REVIEW"],
  CONTACTED: ["IN_REVIEW", "CONTACTED"],
  CLOSED: ["IN_REVIEW", "CONTACTED", "CLOSED"],
  DISCARDED: ["DISCARDED"],
};

type Example = Pick<
  NewInquiryRecord,
  "area" | "urgency" | "preferredChannel" | "safeToContact" | "emailIsPrivate"
> & { name: string; message: string; status: InquiryStatus; notes?: string; phone?: boolean };

const EXAMPLES: readonly Example[] = [
  {
    name: "Laura Benítez",
    area: "SUCCESSION",
    urgency: "HIGH",
    preferredChannel: "WHATSAPP",
    safeToContact: true,
    emailIsPrivate: true,
    phone: true,
    status: "NEW",
    message:
      "(Ejemplo) Falleció mi padre hace dos meses. Dejó un departamento y una cuenta en el banco. Somos tres hermanos y queremos empezar la sucesión.",
  },
  {
    name: "Martín Quiroga",
    area: "DIVORCE",
    urgency: "NORMAL",
    preferredChannel: "PHONE",
    safeToContact: false,
    emailIsPrivate: true,
    phone: true,
    status: "IN_REVIEW",
    notes:
      "(Ejemplo) Pidió que no lo llamemos: contactar por email. Preguntar si hay acuerdo sobre la vivienda.",
    message:
      "(Ejemplo) Con mi pareja decidimos separarnos. Tenemos dos hijos y una casa a nombre de los dos. Queremos saber cómo hacerlo de común acuerdo.",
  },
  {
    name: "Carolina Paz",
    area: "CHILD_SUPPORT",
    urgency: "HIGH",
    preferredChannel: "WHATSAPP",
    safeToContact: false,
    emailIsPrivate: false,
    phone: true,
    status: "NEW",
    message:
      "(Ejemplo) El padre de mi hija dejó de pasar la cuota alimentaria hace cuatro meses. No sé qué puedo hacer.",
  },
  {
    name: "Diego Ferreyra",
    area: "PARENTING",
    urgency: "NORMAL",
    preferredChannel: "EMAIL",
    safeToContact: null,
    emailIsPrivate: true,
    status: "CONTACTED",
    notes: "(Ejemplo) Respondido por email. Espera una propuesta de régimen de comunicación.",
    message:
      "(Ejemplo) Estoy separado y quiero organizar los días que mi hijo pasa conmigo. Hoy no tenemos nada por escrito.",
  },
  {
    name: "Silvia Romero",
    area: "AGREEMENTS",
    urgency: "LOW",
    preferredChannel: "EMAIL",
    safeToContact: null,
    emailIsPrivate: true,
    status: "CLOSED",
    notes: "(Ejemplo) Convenio firmado y presentado. Caso cerrado.",
    message:
      "(Ejemplo) Ya nos pusimos de acuerdo con mi expareja sobre la cuota y las visitas. Queremos dejarlo por escrito y que tenga validez.",
  },
  {
    name: "Andrés Molina",
    area: "OTHER",
    urgency: "LOW",
    preferredChannel: "PHONE",
    safeToContact: true,
    emailIsPrivate: true,
    phone: true,
    status: "DISCARDED",
    notes: "(Ejemplo) Es un tema laboral, no de familia. Se le sugirió consultar con otro estudio.",
    message:
      "(Ejemplo) Tengo un conflicto con mi empleador por una indemnización y quería saber si pueden ayudarme.",
  },
  {
    name: "Graciela Sosa",
    area: "SUCCESSION",
    urgency: "NORMAL",
    preferredChannel: "EMAIL",
    safeToContact: null,
    emailIsPrivate: true,
    status: "NEW",
    message:
      "(Ejemplo) Mi madre falleció y no sabemos si dejó testamento. Quisiera saber qué documentación hace falta para empezar.",
  },
  {
    name: "Pablo Herrera",
    area: "DIVORCE",
    urgency: "HIGH",
    preferredChannel: "WHATSAPP",
    safeToContact: true,
    emailIsPrivate: true,
    phone: true,
    status: "IN_REVIEW",
    message:
      "(Ejemplo) Recibí una cédula de notificación por el divorcio que inició mi esposa y tengo una audiencia la semana que viene.",
  },
];

/** The eight example inquiries, ready for the repository. */
export function buildDemoInquiries(now: Date, privacyPolicyVersion: string): DemoInquiry[] {
  return EXAMPLES.map((example, index) => ({
    status: example.status,
    notes: example.notes,
    record: {
      area: example.area,
      urgency: example.urgency,
      message: example.message,
      fullName: `${DEMO_NAME_PREFIX}${example.name}`,
      email: `ejemplo${index + 1}@example.com`,
      phone: example.phone ? `+54 9 11 0000-00${String(index + 1).padStart(2, "0")}` : null,
      preferredChannel: example.preferredChannel,
      safeToContact: example.safeToContact,
      emailIsPrivate: example.emailIsPrivate,
      consentAt: now,
      privacyPolicyVersion,
      ipHash: null,
      source: DEMO_SOURCE,
    },
  }));
}

export type DemoSeedResult =
  | { status: "refused_not_demo" }
  | { status: "no_staff" }
  | { status: "already_seeded"; existing: number }
  | { status: "planned"; count: number }
  | { status: "seeded"; count: number }
  | { status: "removed"; count: number };

export type DemoSeedMode = "dry" | "apply" | "remove";

export async function runDemoSeed(
  deps: {
    repository: InquiryRepository;
    store: DemoSeedStore;
    now: Date;
    privacyPolicyVersion: string;
    demoMode: boolean;
  },
  mode: DemoSeedMode,
): Promise<DemoSeedResult> {
  if (!deps.demoMode) return { status: "refused_not_demo" };
  if (mode === "remove") return { status: "removed", count: await deps.store.deleteDemo() };

  const existing = await deps.store.countDemo();
  if (existing > 0) return { status: "already_seeded", existing };

  const examples = buildDemoInquiries(deps.now, deps.privacyPolicyVersion);
  if (mode === "dry") return { status: "planned", count: examples.length };

  const actorId = await deps.store.firstActiveStaffId();
  if (!actorId) return { status: "no_staff" };

  for (const example of examples) {
    const { id } = await deps.repository.createWithCreatedEvent(example.record);
    for (const status of STATUS_PATH[example.status]) {
      await deps.repository.updateStatus(id, status, actorId);
    }
    if (example.notes) await deps.repository.updateNotes(id, example.notes, actorId);
  }
  return { status: "seeded", count: examples.length };
}

export const DEMO_SEED_USAGE = [
  "Uso: npm run demo:seed [-- --confirm | -- --remove]",
  "",
  "  sin argumentos  muestra qué haría, sin escribir nada",
  "  --confirm       carga las 8 consultas de ejemplo (si no estaban)",
  "  --remove        borra las consultas de ejemplo",
].join("\n");

export function parseDemoSeedArgs(
  argv: readonly string[],
): { status: "ok"; mode: DemoSeedMode } | { status: "error"; message: string } {
  const unknown = argv.filter((arg) => arg !== "--confirm" && arg !== "--remove");
  if (unknown.length > 0) {
    return { status: "error", message: `Argumento desconocido: ${unknown.join(" ")}` };
  }
  if (argv.includes("--confirm") && argv.includes("--remove")) {
    return { status: "error", message: "Usá --confirm o --remove, no los dos." };
  }
  if (argv.includes("--remove")) return { status: "ok", mode: "remove" };
  return { status: "ok", mode: argv.includes("--confirm") ? "apply" : "dry" };
}
