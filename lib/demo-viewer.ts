/**
 * Role given to the public guest account. A demo viewer can read everything
 * its RLS scope allows (including the admin-only /report pages) but can never
 * write. Write protection is enforced in two places:
 *  1. RESTRICTIVE RLS policies (app/seed/route.ts) for anything that reaches
 *     Postgres with the user's own JWT.
 *  2. rejectIfDemoViewer() in every mutating API route, because several
 *     services write through the service-role key, which bypasses RLS.
 */
export const DEMO_VIEWER_ROLE = 'demo_viewer';

/** Roles that may open the /report pages and the report API. */
export function canViewReports(roles: string[]): boolean {
  return roles.includes('admin') || roles.includes(DEMO_VIEWER_ROLE);
}
