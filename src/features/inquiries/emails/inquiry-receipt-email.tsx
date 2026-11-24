/**
 * Receipt to the person who wrote (US-03 CA5, CA7, §10.2, §11.5). Sent ONLY to a private
 * email, and NEUTRAL anyway: only their name, the reference and the firm's short name. No
 * area, urgency, specialty, message or link that could reveal the reason for the inquiry.
 */
import { Body, Container, Head, Html, Preview, Text } from "react-email";

import { receiptEmail as copy } from "@/content/emails";

import { emailStyles as s } from "./styles";

export type InquiryReceiptEmailProps = {
  fullName: string;
  reference: string;
  /** siteConfig.shortName: without the specialty (tested in site-config.test.ts). */
  signature: string;
};

export const receiptSubject = copy.subject;

export default function InquiryReceiptEmail({
  fullName,
  reference,
  signature,
}: InquiryReceiptEmailProps) {
  return (
    <Html lang="es-AR">
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Text style={s.text}>{copy.greeting(fullName)}</Text>
          <Text style={s.text}>{copy.body}</Text>
          <Text style={{ ...s.text, margin: "0 0 4px" }}>{copy.referenceLabel}</Text>
          <Text style={s.reference}>{reference}</Text>
          <Text style={s.muted}>{copy.referenceHint}</Text>
          <Text style={{ ...s.text, margin: 0 }}>{copy.closing}</Text>
          <Text style={{ ...s.text, margin: 0 }}>{signature}</Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Sample data for `npm run email:dev` (fictitious). */
InquiryReceiptEmail.PreviewProps = {
  fullName: "Ana Pérez",
  reference: "C-7F3A9B21",
  signature: "Estudio Alameda",
} satisfies InquiryReceiptEmailProps;
