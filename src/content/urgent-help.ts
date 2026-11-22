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

export const safetyContent = {
  title: "¿Estás en peligro?",
  helplines: [
    { label: "Emergencias", number: "911" },
    { label: "Violencia familiar", number: "137", detail: "opción 1" },
    { label: "Violencia de género", number: "144" },
  ],
  reporting: "Denuncias las 24 h: Oficina de Violencia Doméstica, Lavalle 1250, CABA.",
} as const satisfies { title: string; helplines: readonly Helpline[]; reporting: string };

export const deadlineContent = {
  title: "¿Tenés un plazo o una audiencia cercana?",
  callLabel: "Llamanos al",
  afterHours:
    "Si el plazo vence antes de que podamos responderte, no esperes: buscá asesoramiento legal de inmediato.",
} as const;
