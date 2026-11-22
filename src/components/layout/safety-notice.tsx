import { safetyContent, type Helpline } from "@/content/urgent-help";
import { cn } from "@/lib/utils";

type SafetyNoticeProps = {
  /** On phones shows only the numbers (labels stay for screen readers). */
  compact?: boolean;
};

/** Sober band with the helplines for someone at risk (SPEC §11.5). */
export function SafetyNotice({ compact = false }: SafetyNoticeProps) {
  const { title, reporting } = safetyContent;
  const helplines: readonly Helpline[] = safetyContent.helplines;

  return (
    <div className="border-b border-border bg-card text-card-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 px-4 py-1.5 text-sm">
        <p className="py-1 font-semibold text-primary">{title}</p>
        <ul className="flex flex-wrap items-center gap-x-4">
          {helplines.map(({ label, number, detail }) => (
            <li key={number} className="flex items-center gap-1">
              <a
                href={`tel:${number}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5"
              >
                <span className={cn(compact && "sr-only sm:not-sr-only")}>{label}</span>{" "}
                <strong className="font-semibold underline underline-offset-4">{number}</strong>
              </a>
              {detail ? <span>({detail})</span> : null}
            </li>
          ))}
        </ul>
        <p className={cn("py-1 text-muted-foreground", compact && "hidden sm:block")}>
          {reporting}
        </p>
      </div>
    </div>
  );
}
