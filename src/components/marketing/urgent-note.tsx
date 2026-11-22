import type { OfficeHours, SiteConfig } from "@/config/site.config";
import { deadlineContent } from "@/content/urgent-help";
import { cn } from "@/lib/utils";

type UrgentNoteProps = {
  contact: Pick<SiteConfig["contact"], "phoneDisplay" | "phoneE164">;
  /** When the phone is answered. */
  hours?: OfficeHours;
  className?: string;
};

/** Way out for whoever cannot wait for the usual response time (SPEC §11.5). */
export function UrgentNote({ contact, hours, className }: UrgentNoteProps) {
  const { title, callLabel, afterHours } = deadlineContent;

  return (
    <div className={cn("max-w-xl border-l-2 border-primary pl-3 text-sm", className)}>
      <p className="font-semibold">{title}</p>
      <p className="flex flex-wrap items-center gap-x-1.5">
        {callLabel}{" "}
        <a
          href={`tel:+${contact.phoneE164}`}
          className="inline-flex min-h-11 items-center font-semibold whitespace-nowrap underline underline-offset-4"
        >
          {contact.phoneDisplay}
        </a>
        {hours ? (
          <span>
            ({hours.days}, {hours.hours})
          </span>
        ) : null}
      </p>
      <p className="text-muted-foreground">{afterHours}</p>
    </div>
  );
}
