/**
 * Preselects the area from ?area=<slug> (SPEC §11.3) once the form runs in the browser.
 *
 * Done on the live <select>, not by rendering a different form: /contacto is static, and
 * swapping the server HTML for another tree on load would wipe whatever the person already
 * chose or typed (US-03 CA4; caught by the F3-08 e2e). So it only fills an EMPTY select:
 * a choice made before JavaScript loaded is never overwritten. Unknown slugs are ignored.
 */
import type { PracticeArea } from "../types";

export function applyAreaFromQuery(
  form: HTMLFormElement,
  search: string,
  areaBySlug: Readonly<Record<string, PracticeArea>>,
): void {
  const slug = new URLSearchParams(search).get("area");
  if (!slug || !Object.hasOwn(areaBySlug, slug)) return;

  const select = form.elements.namedItem("area");
  if (select instanceof HTMLSelectElement && select.value === "") {
    select.value = areaBySlug[slug] ?? "";
  }
}
