/**
 * Routes of the admin panel (FR-10). Shared by the proxy, the auth actions and requireStaff(),
 * so a redirect never points to a path that does not exist.
 */
export const adminPaths = {
  home: "/admin",
  login: "/admin/login",
  /** A valid session that is not active staff (SPEC §6.4). The login page explains it (F4-03). */
  loginForbidden: "/admin/login?error=forbidden",
  /** Detail of one inquiry (FR-10): linked from the list and from the email to the firm. */
  inquiry: (id: string) => `/admin/consultas/${encodeURIComponent(id)}`,
} as const;

/** True for /admin and anything below it, never for paths like /administracion. */
export function isAdminPath(pathname: string): boolean {
  return pathname === adminPaths.home || pathname.startsWith(`${adminPaths.home}/`);
}

/** Query parameter of the login with the page to go back to after signing in (F4-06). */
export const NEXT_PARAM = "next";
export const NEXT_MAX_LENGTH = 512;

/** A fake origin to resolve `next` against: only same-origin results are accepted. */
const CHECK_ORIGIN = "https://panel.invalid";

/**
 * The page to go back to after the login, or null (SPEC §10.2: no open redirect). Only panel
 * paths are accepted, after the URL is parsed and normalized, so `//evil.com`, `/\evil.com`,
 * `https://…`, encoded variants and `..` tricks are all rejected. The login itself is rejected
 * too (it would loop). The result keeps the query (e.g. list filters) and drops any fragment.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value === "" || value.length > NEXT_MAX_LENGTH) return null;
  // A relative path only: browsers treat "//host" and "/\host" as another site.
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;

  let url: URL;
  try {
    url = new URL(value, CHECK_ORIGIN);
  } catch {
    return null;
  }
  // Catches what the parser turns into another host (e.g. tabs or newlines inside "//").
  if (url.origin !== CHECK_ORIGIN) return null;
  if (!isAdminPath(url.pathname)) return null;
  if (url.pathname === adminPaths.login || url.pathname.startsWith(`${adminPaths.login}/`)) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

/**
 * The login URL that comes back to `from` after signing in. The panel's home is the default
 * destination, so it does not need a `next`.
 */
export function loginPathFor(from: string): string {
  const next = safeNextPath(from);
  if (!next || next === adminPaths.home) return adminPaths.login;
  return `${adminPaths.login}?${new URLSearchParams({ [NEXT_PARAM]: next })}`;
}
