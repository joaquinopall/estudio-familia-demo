-- F5-02 (ADR-0017): the message and the internal notes are stored encrypted (enc:v1:…), which
-- is longer than the text. The limits (2000 and 5000 characters) are still enforced by Zod on
-- the text itself. Changing varchar to text keeps every existing value.
ALTER TABLE "inquiries" ALTER COLUMN "message" SET DATA TYPE TEXT,
ALTER COLUMN "internal_notes" SET DATA TYPE TEXT;
