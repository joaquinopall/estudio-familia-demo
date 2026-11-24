/**
 * Safe contact rule (SPEC US-03 CA3, CA5, CA6 and CA7, §11.5).
 *
 * The firm only starts contact through a safe channel:
 * - phone or WhatsApp, if the person said it is safe (safeToContact = true);
 * - otherwise email, but only if it is private (emailIsPrivate = true).
 * Without a safe channel the firm does not start contact ("No iniciar contacto"), and the
 * confirmation must not promise it. The receipt email goes only to a private email.
 *
 * Used by the confirmation (F3-07), both emails (F3-06) and the admin panel (F4).
 * Unknown answers count as "not safe": when in doubt, do not contact.
 */
import { type ContactChannel, isPhoneChannel } from "./types";

export type ContactSafetyInput = {
  preferredChannel: ContactChannel;
  safeToContact: boolean | null;
  emailIsPrivate: boolean;
};

export type ContactPlan =
  | {
      /** Channel the firm may use to start contact: the preferred one or the fallback email. */
      channel: ContactChannel;
      doNotContact: false;
      sendReceipt: boolean;
    }
  /** No safe channel means the email is not private either, so there is never a receipt. */
  | { channel: null; doNotContact: true; sendReceipt: false };

export function planContact({
  preferredChannel,
  safeToContact,
  emailIsPrivate,
}: ContactSafetyInput): ContactPlan {
  const sendReceipt = emailIsPrivate;

  if (isPhoneChannel(preferredChannel) && safeToContact === true) {
    return { channel: preferredChannel, doNotContact: false, sendReceipt };
  }
  if (emailIsPrivate) {
    return { channel: "EMAIL", doNotContact: false, sendReceipt };
  }
  return { channel: null, doNotContact: true, sendReceipt: false };
}
