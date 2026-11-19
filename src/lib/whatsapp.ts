/**
 * WhatsApp click-to-chat link (SPEC FR-13): https://wa.me/<number>?text=<encoded message>.
 * The message must be generic: never put personal data in it (US-04 CA1).
 */
export function buildWhatsAppUrl(number: string, message: string): string {
  if (!/^\d{8,15}$/.test(number)) {
    throw new Error("WhatsApp number must contain 8 to 15 digits, country code included");
  }
  const text = message.trim();
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${number}${query}`;
}
