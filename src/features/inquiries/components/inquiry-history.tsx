/**
 * History of an inquiry (US-06 CA3: who, what and when; FR-12). Oldest first, as an ordered
 * list. Notes events say that the notes changed, never what they say.
 */
import { adminPanelContent } from "@/content/admin-panel";
import { formatDateTime } from "@/lib/format-date";

import { INQUIRY_STATUS_LABELS } from "../labels";
import type { InquiryActor, InquiryHistoryEntry } from "../types";

const copy = adminPanelContent.detail.history;

export function describeEvent(entry: InquiryHistoryEntry): string {
  switch (entry.type) {
    case "CREATED":
      return copy.created;
    case "NOTES_UPDATED":
      return copy.notesUpdated;
    case "STATUS_CHANGED": {
      const from = entry.fromStatus ? INQUIRY_STATUS_LABELS[entry.fromStatus] : "—";
      const to = entry.toStatus ? INQUIRY_STATUS_LABELS[entry.toStatus] : "—";
      return `${copy.statusChanged} ${from} → ${to}`;
    }
  }
}

export function actorName(actor: InquiryActor): string {
  if (actor.type === "website") return copy.website;
  return actor.name ?? copy.unknownStaff;
}

type Props = { history: readonly InquiryHistoryEntry[]; timeZone: string };

export function InquiryHistory({ history, timeZone }: Props) {
  return (
    <section aria-labelledby="history-title">
      <h2 id="history-title" className="text-xl">
        {copy.title}
      </h2>
      <ol className="mt-3 grid gap-3 border-l-2 border-border pl-4">
        {history.map((entry) => (
          <li key={entry.id}>
            <p className="font-medium text-foreground">{describeEvent(entry)}</p>
            <p className="text-sm text-muted-foreground">
              <time dateTime={entry.createdAt.toISOString()}>
                {formatDateTime(entry.createdAt, timeZone)}
              </time>{" "}
              · {actorName(entry.actor)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
