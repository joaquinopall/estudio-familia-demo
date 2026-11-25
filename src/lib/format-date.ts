const longDateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeZone: "UTC",
});

/**
 * "2026-11-21" → "21 de noviembre de 2026". Parsed and formatted in UTC so the result never
 * depends on the server's time zone. Throws on an invalid date to catch content typos early.
 */
export function formatLongDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  return longDateFormatter.format(date);
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * A moment as the firm sees it: "25/11/2026, 14:05" in its time zone (siteConfig.timeZone),
 * never the server's (UTC on Vercel). One cached formatter per time zone.
 */
export function formatDateTime(date: Date, timeZone: string): string {
  let formatter = dateTimeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
      hourCycle: "h23",
      timeZone,
    });
    dateTimeFormatters.set(timeZone, formatter);
  }
  return formatter.format(date);
}
