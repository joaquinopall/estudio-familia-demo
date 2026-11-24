/**
 * Client IP and pseudonymous identifiers (NFR-SEC-06, SPEC §7, §8.2).
 *
 * The IP is never stored or logged: only an HMAC-SHA256 with IP_HASH_SALT, used for the rate
 * limit and saved as Inquiry.ipHash. The same HMAC (with another prefix) hides the email in
 * rate limit keys, so Upstash never sees either.
 */
import "server-only";

import { createHmac } from "node:crypto";

type HeaderReader = { get(name: string): string | null };

/**
 * IP of the visitor. On Vercel, x-forwarded-for holds the client IP and is overwritten by the
 * platform, so it cannot be spoofed; its first entry is the client. Returns null if unknown
 * (e.g. local development), and the caller skips the per-IP rule.
 */
export function getClientIp(headers: HeaderReader): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get("x-real-ip")?.trim();
  return real ? real : null;
}

/** What is being hashed: the prefix keeps an IP and an email from ever sharing a hash. */
export type IdentifierKind = "ip" | "email";

/** HMAC-SHA256 (hex, 64 characters) of `<kind>:<value>` with the secret salt. */
export function hashIdentifier(salt: string, kind: IdentifierKind, value: string): string {
  return createHmac("sha256", salt).update(`${kind}:${value}`).digest("hex");
}
