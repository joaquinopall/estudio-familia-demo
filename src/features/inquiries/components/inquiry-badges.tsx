/**
 * Badges of the panel list (US-06 CA2, FR-11, US-03 CA7). Always with text: the color only
 * reinforces it (NFR-A11Y-01). Only design tokens (SPEC §11.1).
 */
import { Badge } from "@/components/ui/badge";
import { adminPanelContent } from "@/content/admin-panel";

import { INQUIRY_STATUS_LABELS, URGENCY_SHORT_LABELS } from "../labels";
import type { InquiryStatus, Urgency } from "../types";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

/** New ones stand out; finished ones step back. */
const STATUS_VARIANT = {
  NEW: "default",
  IN_REVIEW: "secondary",
  CONTACTED: "outline",
  CLOSED: "outline",
  DISCARDED: "outline",
} as const satisfies Record<InquiryStatus, BadgeVariant>;

const URGENCY_VARIANT = {
  LOW: "outline",
  NORMAL: "secondary",
  HIGH: "destructive",
} as const satisfies Record<Urgency, BadgeVariant>;

const FINISHED: readonly InquiryStatus[] = ["CLOSED", "DISCARDED"];

export function StatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className={FINISHED.includes(status) ? "text-muted-foreground" : undefined}
    >
      {INQUIRY_STATUS_LABELS[status]}
    </Badge>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return <Badge variant={URGENCY_VARIANT[urgency]}>{URGENCY_SHORT_LABELS[urgency]}</Badge>;
}

/** US-03 CA7: without a safe channel the firm must not start contact. Highlighted. */
export function DoNotContactBadge() {
  return (
    <Badge variant="destructive" className="font-semibold">
      {adminPanelContent.list.table.doNotContact}
    </Badge>
  );
}
