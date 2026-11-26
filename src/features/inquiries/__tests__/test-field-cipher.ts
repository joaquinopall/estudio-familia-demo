/**
 * A real AES-256-GCM FieldCipher with a random key per test run (ADR-0017). The database tests
 * use it instead of FIELD_ENCRYPTION_KEYS from .env.local: they create and delete their own
 * rows, so they never need to read anything encrypted with the developer's key.
 */
import { randomBytes } from "node:crypto";

import { createAesGcmFieldCipher } from "@/lib/adapters/aes-gcm-field-cipher";

export const createTestFieldCipher = (id = "test") =>
  createAesGcmFieldCipher([{ id, key: randomBytes(32) }]);
