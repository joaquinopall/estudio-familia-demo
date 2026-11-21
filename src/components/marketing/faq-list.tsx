import type { Faq } from "@/content/faqs";
import { cn } from "@/lib/utils";

type FaqListProps = { faqs: readonly Faq[]; className?: string };

/**
 * Questions as native <details>/<summary>: keyboard accessible and without client JS
 * (NFR-PERF-01). Reused by the home, the area pages and /preguntas-frecuentes.
 */
export function FaqList({ faqs, className }: FaqListProps) {
  return (
    <div
      className={cn("divide-y divide-border rounded-xl border border-border bg-card", className)}
    >
      {faqs.map((faq) => (
        <details key={faq.question} className="group px-5">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span>{faq.question}</span>
            <span
              aria-hidden="true"
              className="text-xl leading-none text-primary transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="space-y-3 pb-5 text-muted-foreground">
            {faq.answer.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
