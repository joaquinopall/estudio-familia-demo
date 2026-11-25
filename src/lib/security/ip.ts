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
 * IP of the visitor; its first x-forwarded-for entry. Returns null only if no header has it,
 * and then the caller skips the per-IP rule.
 *
 * - On Vercel the platform overwrites x-forwarded-for with the client IP: it cannot be spoofed.
 * - Locally (`next dev` / `next start`), Next fills it with the socket address (::1) only when
 *   the request has none, so every local submission shares one rate limit bucket, and a client
 *   can set it. The e2e use that to get their own bucket.
 * - Self-hosted without Vercel (ADR-0003 assumes Vercel): put a proxy that overwrites the
 *   header, or the per-IP limit can be bypassed by sending a fake one.
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
