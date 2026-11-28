/**
 * Whether the e2e can reach the development services (F5-06, ADR-0019).
 *
 * Locally they always can (.env.local). In CI they can when the repository's secrets are
 * loaded; without them (Dependabot PRs, which never get secrets on purpose) the workflow uses
 * fictitious URLs on the reserved `.invalid` domain (RFC 2606). The specs that need Supabase
 * or the database skip themselves then, and the rest of the suite still runs.
 */
import { e2eEnv } from "./db";
import { isFictitiousUrl } from "./fictitious-url";

/** The database and Supabase Auth of dev are real. */
export const hasDevServices = (): boolean =>
  !isFictitiousUrl(e2eEnv.databaseUrl) && !isFictitiousUrl(e2eEnv.supabaseUrl);

export const DEV_SERVICES_SKIP_REASON =
  "Needs the dev database and Supabase Auth (in CI, the repository's E2E_* secrets).";
