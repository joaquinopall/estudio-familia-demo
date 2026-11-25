/**
 * Routes of the admin panel (FR-10). Shared by the proxy, the auth actions and, from F4-02,
 * requireStaff(), so a redirect never points to a path that does not exist.
 */
export const adminPaths = {
  home: "/admin",
  login: "/admin/login",
} as const;

/** True for /admin and anything below it, never for paths like /administracion. */
export function isAdminPath(pathname: string): boolean {
  return pathname === adminPaths.home || pathname.startsWith(`${adminPaths.home}/`);
}
