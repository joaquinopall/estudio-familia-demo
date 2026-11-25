/**
 * The panel list (US-06 CA2): a semantic table with a caption and column headers. Each
 * reference links to the detail (F4-05). Contact shows the preferred channel and highlights
 * "No iniciar contacto" (US-03 CA7). Dates are in the firm's time zone.
 *
 * On narrow screens the table scrolls sideways inside a focusable region, so keyboard users
 * can scroll it too.
 */
import Link from "next/link";

import { adminPanelContent } from "@/content/admin-panel";
import { adminPaths } from "@/lib/admin-paths";
import { formatDateTime } from "@/lib/format-date";

import { CONTACT_CHANNEL_LABELS, PRACTICE_AREA_LABELS } from "../labels";
import type { InquirySummary } from "../types";
import { DoNotContactBadge, StatusBadge, UrgencyBadge } from "./inquiry-badges";

const copy = adminPanelContent.list.table;

type InquiryTableProps = {
  items: readonly InquirySummary[];
  timeZone: string;
};

const th = "px-3 py-2 text-left text-sm font-semibold text-foreground whitespace-nowrap";
const td = "px-3 py-3 align-top";

export function InquiryTable({ items, timeZone }: InquiryTableProps) {
  return (
    <div
      role="region"
      aria-label={copy.region}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-border bg-card"
    >
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <caption className="sr-only">{copy.caption}</caption>
        <thead className="border-b border-border bg-secondary">
          <tr>
            <th scope="col" className={th}>
              {copy.date}
            </th>
            <th scope="col" className={th}>
              {copy.reference}
            </th>
            <th scope="col" className={th}>
              {copy.person}
            </th>
            <th scope="col" className={th}>
              {copy.area}
            </th>
            <th scope="col" className={th}>
              {copy.urgency}
            </th>
            <th scope="col" className={th}>
              {copy.status}
            </th>
            <th scope="col" className={th}>
              {copy.contact}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-b-0">
              <td className={`${td} whitespace-nowrap text-muted-foreground`}>
                <time dateTime={item.createdAt.toISOString()}>
                  {formatDateTime(item.createdAt, timeZone)}
                </time>
              </td>
              <td className={`${td} whitespace-nowrap`}>
                <Link
                  href={adminPaths.inquiry(item.id)}
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {item.reference}
                </Link>
              </td>
              <td className={td}>
                <span className="block font-medium text-foreground">{item.fullName}</span>
                <span className="block break-all text-muted-foreground">{item.email}</span>
              </td>
              <td className={td}>{PRACTICE_AREA_LABELS[item.area]}</td>
              <td className={td}>
                <UrgencyBadge urgency={item.urgency} />
              </td>
              <td className={td}>
                <StatusBadge status={item.status} />
              </td>
              <td className={td}>
                {item.doNotContact ? (
                  <DoNotContactBadge />
                ) : (
                  <span>
                    <span className="sr-only">{copy.preferredChannel} </span>
                    {CONTACT_CHANNEL_LABELS[item.preferredChannel]}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
