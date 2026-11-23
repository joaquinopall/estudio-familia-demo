import { describe, expect, it } from "vitest";

import { getPracticeAreaBySlug } from "@/content/practice-areas";
import { safetyContent, violenceFaqAnswer } from "@/content/urgent-help";

/*
 * The helplines are checked by hand against the official sources listed in urgent-help.ts.
 * These literals pin that check: if a number changes, change it here on purpose, after
 * verifying it (SPEC §11.5).
 */
describe("helplines (SPEC §11.5)", () => {
  it("are the verified official numbers", () => {
    expect(safetyContent.helplines.map(({ number }) => number)).toEqual(["911", "137", "144"]);
    expect(safetyContent.helplines[1]?.detail).toBe("opción 1");
    expect(safetyContent.reporting).toBe(
      "Denuncias las 24 h: Oficina de Violencia Doméstica, Lavalle 1250, CABA.",
    );
  });

  it("feed the violence question of an area from the same source", () => {
    const parenting = getPracticeAreaBySlug("cuidado-personal");
    const faq = parenting?.faqs.find((item) => item.question.includes("violencia"));

    expect(faq?.answer[0]).toBe(violenceFaqAnswer);
    expect(violenceFaqAnswer).toBe(
      "Lo primero es tu seguridad y la de tus hijos. Si hay una emergencia, llamá al 911. Podés llamar en cualquier momento al 137, opción 1 (violencia familiar), o al 144 (violencia de género). También podés denunciar las 24 horas en la Oficina de Violencia Doméstica, Lavalle 1250, CABA.",
    );
  });
});
