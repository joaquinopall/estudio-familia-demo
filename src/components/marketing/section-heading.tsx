import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  /** Referenced by the section's aria-labelledby. */
  id: string;
  title: string;
  lead?: string;
  className?: string;
};

/** Level-2 heading with an optional lead paragraph, shared by the home sections. */
export function SectionHeading({ id, title, lead, className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2 id={id} className="text-3xl font-semibold text-primary sm:text-4xl">
        {title}
      </h2>
      {lead ? <p className="mt-3 text-lg text-muted-foreground">{lead}</p> : null}
    </div>
  );
}
