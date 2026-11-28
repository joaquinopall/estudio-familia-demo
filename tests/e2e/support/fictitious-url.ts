/**
 * The CI without secrets points every service to the reserved `.invalid` domain (RFC 2606):
 * those URLs never resolve (F5-06, ADR-0019). Pure, so a unit test covers it without loading
 * any environment.
 */
export function isFictitiousUrl(url: string | undefined): boolean {
  if (!url) return true;
  try {
    const host = new URL(url).hostname;
    return host === "invalid" || host.endsWith(".invalid");
  } catch {
    return true;
  }
}
