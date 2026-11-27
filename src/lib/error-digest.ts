/**
 * Next's digest of a server error (F5-04): a hash Next attaches to the error the browser
 * receives, and that the server log also has (`request.error`, instrumentation.ts). The error
 * pages show it so a report can be matched with the log. It never carries the message.
 */
export function errorDigestOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    const digest = (error as { digest: unknown }).digest;
    return typeof digest === "string" && digest !== "" ? digest : undefined;
  }
  return undefined;
}
