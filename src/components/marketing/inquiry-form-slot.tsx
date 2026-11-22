import { MessageSquareText } from "lucide-react";

type InquiryFormSlotProps = { title: string; notice: string };

/**
 * Reserved place for the inquiry form (F3 replaces this component with InquiryForm).
 * The id lets other pages link straight to the form (/contacto#formulario).
 */
export function InquiryFormSlot({ title, notice }: InquiryFormSlotProps) {
  return (
    <section
      id="formulario"
      aria-labelledby="inquiry-form-title"
      className="scroll-mt-6 rounded-2xl border border-dashed border-input bg-background p-6 sm:p-8"
    >
      <h2 id="inquiry-form-title" className="text-2xl font-semibold text-primary sm:text-3xl">
        {title}
      </h2>
      <p className="mt-4 flex gap-3 text-muted-foreground">
        <MessageSquareText
          aria-hidden="true"
          className="mt-1 size-5 shrink-0 text-primary"
          strokeWidth={1.5}
        />
        {notice}
      </p>
    </section>
  );
}
