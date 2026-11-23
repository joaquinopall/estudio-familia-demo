/**
 * Help for urgent situations (SPEC §11.5): danger and legal deadlines.
 *
 * These are public services, not firm data, so they live here and not in site.config.ts.
 * Checked on 22/11/2026 against the official pages. Check them again before each delivery:
 * - 137: https://www.argentina.gob.ar/justicia/violencia-familiar-sexual
 * - 144: https://www.argentina.gob.ar/generos/linea-144
 * - OVD: https://www.ovd.gov.ar/
 */

export type Helpline = { label: string; number: string; detail?: string };

// The only place with these numbers and this address: every text below is built from them.
const emergency = { label: "Emergencias", number: "911" } as const satisfies Helpline;
const familyViolence = {
  label: "Violencia familiar",
  number: "137",
  detail: "opción 1",
} as const satisfies Helpline;
const genderViolence = { label: "Violencia de género", number: "144" } as const satisfies Helpline;
const reportingOffice = { name: "Oficina de Violencia Doméstica", address: "Lavalle 1250, CABA" };

export const safetyContent = {
  title: "¿Estás en peligro?",
  helplines: [emergency, familyViolence, genderViolence],
  reporting: `Denuncias las 24 h: ${reportingOffice.name}, ${reportingOffice.address}.`,
} as const satisfies { title: string; helplines: readonly Helpline[]; reporting: string };

/** First paragraph of the "violence or risk" question in the family areas. */
export const violenceFaqAnswer = `Lo primero es tu seguridad y la de tus hijos. Si hay una emergencia, llamá al ${emergency.number}. Podés llamar en cualquier momento al ${familyViolence.number}, ${familyViolence.detail} (${familyViolence.label.toLowerCase()}), o al ${genderViolence.number} (${genderViolence.label.toLowerCase()}). También podés denunciar las 24 horas en la ${reportingOffice.name}, ${reportingOffice.address}.`;

export const deadlineContent = {
  title: "¿Tenés un plazo o una audiencia cercana?",
  callLabel: "Llamanos al",
  afterHours:
    "Si el plazo vence antes de que podamos responderte, no esperes: buscá asesoramiento legal de inmediato.",
} as const;
