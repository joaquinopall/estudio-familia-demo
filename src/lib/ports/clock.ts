/**
 * Port for the current time (SPEC §6.1). Lets services set dates (e.g. consentAt) and tests
 * fix them. Adapter: lib/adapters/system-clock.ts; fake: ports/fakes/fixed-clock.ts.
 */
export interface Clock {
  now(): Date;
}
