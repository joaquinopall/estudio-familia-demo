/**
 * Email to the firm for each new inquiry (US-05 CA1, US-03 CA6–CA7, ADR-0005).
 * Highlights first how to contact (or "NO INICIAR CONTACTO"), then the data, then the panel
 * link. NEVER the message: it is read in the panel, behind the login.
 */
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "react-email";

import { firmNotificationEmail as copy } from "@/content/emails";

import { planContact } from "../contact-safety";
import { CONTACT_CHANNEL_LABELS, PRACTICE_AREA_LABELS, URGENCY_LABELS } from "../labels";
import type { NewInquiryForEmail } from "../notifications";
import { emailStyles as s } from "./styles";

export type NewInquiryEmailProps = {
  inquiry: NewInquiryForEmail;
  panelUrl: string;
};

const answer = (value: boolean | null, notApplicable: string) =>
  value === null ? notApplicable : value ? copy.yes : copy.no;

export function newInquirySubject(inquiry: NewInquiryForEmail): string {
  return copy.subject(
    inquiry.reference,
    PRACTICE_AREA_LABELS[inquiry.area],
    planContact(inquiry).doNotContact,
  );
}

export default function NewInquiryEmail({ inquiry, panelUrl }: NewInquiryEmailProps) {
  const plan = planContact(inquiry);
  const rows: [string, string][] = [
    [copy.fields.reference, inquiry.reference],
    [copy.fields.fullName, inquiry.fullName],
    [copy.fields.area, PRACTICE_AREA_LABELS[inquiry.area]],
    [copy.fields.urgency, URGENCY_LABELS[inquiry.urgency]],
    [copy.fields.preferredChannel, CONTACT_CHANNEL_LABELS[inquiry.preferredChannel]],
    [copy.fields.safeToContact, answer(inquiry.safeToContact, copy.notApplicable)],
    [copy.fields.emailIsPrivate, answer(inquiry.emailIsPrivate, copy.notApplicable)],
  ];

  return (
    <Html lang="es-AR">
      <Head />
      <Preview>{copy.preview(inquiry.reference)}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Heading as="h1" style={s.heading}>
            {copy.heading}
          </Heading>

          {plan.doNotContact ? (
            <Section style={s.alert}>
              <Text style={s.alertTitle}>{copy.doNotContactTitle}</Text>
              <Text style={{ ...s.text, margin: 0 }}>{copy.doNotContactBody}</Text>
            </Section>
          ) : (
            <Section style={s.safe}>
              <Text style={s.alertTitle}>
                {copy.contactViaTitle(CONTACT_CHANNEL_LABELS[plan.channel])}
              </Text>
              <Text style={{ ...s.text, margin: 0 }}>{copy.contactViaBody}</Text>
            </Section>
          )}

          <table role="presentation" width="100%" style={{ marginBottom: "24px" }}>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <td style={s.label}>{label}</td>
                  <td style={s.value}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Section style={{ marginBottom: "16px" }}>
            <Button href={panelUrl} style={s.button}>
              {copy.panelButton}
            </Button>
          </Section>
          <Text style={s.muted}>{copy.messageNote}</Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Sample data for `npm run email:dev` (fictitious). */
NewInquiryEmail.PreviewProps = {
  inquiry: {
    id: "7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b",
    reference: "C-7F3A9B21",
    fullName: "Ana Pérez",
    email: "ana@example.com",
    area: "SUCCESSION",
    urgency: "HIGH",
    preferredChannel: "WHATSAPP",
    safeToContact: false,
    emailIsPrivate: false,
  },
  panelUrl: "http://localhost:3000/admin/consultas/7f3a9b21-4c5d-4e6f-8a7b-9c0d1e2f3a4b",
} satisfies NewInquiryEmailProps;
