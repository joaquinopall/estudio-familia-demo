import type { ProcessStep } from "@/content/home";

type ProcessStepsProps = { steps: readonly ProcessStep[] };

/**
 * "Cómo trabajamos" (US-01 CA3): numbered steps as an ordered list. A fine line joins the
 * numbers (vertical up to tablet, horizontal from lg) so the sequence reads at a glance.
 */
export function ProcessSteps({ steps }: ProcessStepsProps) {
  return (
    <ol className="grid max-w-2xl gap-8 lg:max-w-none lg:grid-cols-3 lg:gap-10">
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-5 lg:flex-col">
          {index < steps.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute top-12 -bottom-8 left-[1.375rem] w-px bg-primary/25 lg:top-[1.375rem] lg:right-[-2.5rem] lg:bottom-auto lg:left-14 lg:h-px lg:w-auto"
            />
          ) : null}
          <span
            aria-hidden="true"
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-primary bg-background font-heading text-lg font-semibold text-primary"
          >
            {index + 1}
          </span>
          <div className="pt-1.5 lg:pt-0">
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="mt-2 text-muted-foreground">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
