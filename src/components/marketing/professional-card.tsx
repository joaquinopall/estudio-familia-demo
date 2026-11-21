import { BadgeCheck } from "lucide-react";

import type { Professional } from "@/config/site.config";

import { FactLabel } from "./fact-label";

type ProfessionalCardProps = { professional: Professional };

/** Name, bar registration and education. No photo (SPEC §11.1: never real people as the team). */
export function ProfessionalCard({ professional }: ProfessionalCardProps) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h3 className="text-2xl font-semibold text-primary">{professional.name}</h3>
      <p className="text-card-foreground">{professional.education}</p>
      <div className="mt-auto border-t border-border pt-4">
        <FactLabel icon={BadgeCheck}>Matrícula</FactLabel>
        <p className="mt-1 text-sm text-muted-foreground">{professional.registration}</p>
      </div>
    </article>
  );
}
