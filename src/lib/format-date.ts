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
