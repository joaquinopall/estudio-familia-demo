/**
 * Shared styles of native form controls (NFR-A11Y-01), used by the inquiry form and the admin
 * login. Native controls on purpose: they work without JavaScript and submit with the form.
 */

/**
 * The site's focus outline (globals.css :focus-visible, 3:1 contrast). shadcn's Button sets
 * outline-none and a translucent ring that does not reach 3:1, so buttons get this back.
 * outline-solid is needed: in Tailwind 4, outline-none sets --tw-outline-style: none, which
 * outline-2 would otherwise reuse.
 */
export const focusOutlineClass =
  "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** No outline-none here: the global :focus-visible outline must show (NFR-A11Y-01). */
export const controlClass =
  "block min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";
