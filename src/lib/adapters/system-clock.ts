import type { Clock } from "@/lib/ports/clock";

/** Clock backed by the system time. */
export const systemClock: Clock = { now: () => new Date() };
